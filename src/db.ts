import * as SQLite from 'expo-sqlite';

export type Weather = 'Clear' | 'Rain' | 'Snow' | 'Fog' | '';

export const WEATHER_OPTIONS: Exclude<Weather, ''>[] = ['Clear', 'Rain', 'Snow', 'Fog'];

/** Road environments practiced on a drive (multi-select chips). */
export const ROAD_OPTIONS = [
  'Residential',
  'City',
  'Highway',
  'Rural',
  'Parking lot',
] as const;

export interface Drive {
  id: number;
  /** Calendar date of the drive, YYYY-MM-DD (local). */
  date: string;
  /** Minutes behind the wheel, total. */
  durationMin: number;
  /** Minutes of the drive that were at night (0..durationMin). */
  nightMin: number;
  weather: Weather;
  /** Comma-joined subset of ROAD_OPTIONS. */
  roads: string;
  supervisor: string;
  miles: number; // 0 = not recorded
  notes: string;
  createdAt: number;
  updatedAt: number;
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('odo.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS drives (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL,
          duration_min INTEGER NOT NULL,
          night_min INTEGER NOT NULL DEFAULT 0,
          weather TEXT NOT NULL DEFAULT '',
          roads TEXT NOT NULL DEFAULT '',
          supervisor TEXT NOT NULL DEFAULT '',
          miles REAL NOT NULL DEFAULT 0,
          notes TEXT NOT NULL DEFAULT '',
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_drives_date ON drives(date);
      `);
      return db;
    })();
  }
  return dbPromise;
}

function rowToDrive(row: any): Drive {
  return {
    id: row.id,
    date: row.date,
    durationMin: row.duration_min ?? 0,
    nightMin: row.night_min ?? 0,
    weather: (row.weather ?? '') as Weather,
    roads: row.roads ?? '',
    supervisor: row.supervisor ?? '',
    miles: row.miles ?? 0,
    notes: row.notes ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface DriveInput {
  date: string;
  durationMin: number;
  nightMin: number;
  weather: Weather;
  roads: string;
  supervisor: string;
  miles: number;
  notes: string;
}

function clean(input: DriveInput): DriveInput {
  const durationMin = Math.max(0, Math.round(input.durationMin));
  return {
    ...input,
    durationMin,
    nightMin: Math.min(durationMin, Math.max(0, Math.round(input.nightMin))),
    supervisor: input.supervisor.trim(),
    notes: input.notes.trim(),
    miles: Math.max(0, input.miles),
  };
}

export async function insertDrive(input: DriveInput): Promise<number> {
  const db = await getDb();
  const now = Date.now();
  const i = clean(input);
  const res = await db.runAsync(
    `INSERT INTO drives
       (date, duration_min, night_min, weather, roads, supervisor, miles, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [i.date, i.durationMin, i.nightMin, i.weather, i.roads, i.supervisor, i.miles, i.notes, now, now]
  );
  return res.lastInsertRowId;
}

export async function updateDrive(id: number, input: DriveInput): Promise<void> {
  const db = await getDb();
  const i = clean(input);
  await db.runAsync(
    `UPDATE drives SET
       date = ?, duration_min = ?, night_min = ?, weather = ?, roads = ?,
       supervisor = ?, miles = ?, notes = ?, updated_at = ?
     WHERE id = ?`,
    [i.date, i.durationMin, i.nightMin, i.weather, i.roads, i.supervisor, i.miles, i.notes, Date.now(), id]
  );
}

export async function deleteDrive(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM drives WHERE id = ?', [id]);
}

export async function getDrive(id: number): Promise<Drive | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>('SELECT * FROM drives WHERE id = ?', [id]);
  return row ? rowToDrive(row) : null;
}

/** All drives, newest first (by drive date, then recency of entry). */
export async function getDrives(): Promise<Drive[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM drives ORDER BY date DESC, id DESC LIMIT 5000'
  );
  return rows.map(rowToDrive);
}

export async function countDrives(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>('SELECT COUNT(*) AS n FROM drives');
  return row?.n ?? 0;
}

export interface Stats {
  driveCount: number;
  totalMin: number;
  nightMin: number;
  dayMin: number;
  totalMiles: number;
  longestMin: number;
  weatherKinds: number;
  firstDate: string | null;
  lastDate: string | null;
}

export async function getStats(): Promise<Stats> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(
    `SELECT
       COUNT(*) AS n,
       COALESCE(SUM(duration_min), 0) AS total_min,
       COALESCE(SUM(night_min), 0) AS night_min,
       COALESCE(SUM(miles), 0) AS total_miles,
       COALESCE(MAX(duration_min), 0) AS longest,
       COUNT(DISTINCT CASE WHEN weather <> '' THEN weather END) AS weather_kinds,
       MIN(date) AS first_date,
       MAX(date) AS last_date
     FROM drives`
  );
  const totalMin = row?.total_min ?? 0;
  const nightMin = row?.night_min ?? 0;
  return {
    driveCount: row?.n ?? 0,
    totalMin,
    nightMin,
    dayMin: totalMin - nightMin,
    totalMiles: row?.total_miles ?? 0,
    longestMin: row?.longest ?? 0,
    weatherKinds: row?.weather_kinds ?? 0,
    firstDate: row?.first_date ?? null,
    lastDate: row?.last_date ?? null,
  };
}

/** Drives grouped by month (YYYY-MM), newest month first, for list + report. */
export async function getDrivesGroupedByMonth(): Promise<
  { month: string; drives: Drive[] }[]
> {
  const drives = await getDrives();
  const groups = new Map<string, Drive[]>();
  for (const d of drives) {
    const key = d.date.slice(0, 7);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(d);
  }
  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, list]) => ({ month, drives: list }));
}

export async function deleteAllData(): Promise<void> {
  const db = await getDb();
  await db.execAsync('DELETE FROM drives;');
}

/** CSV export (RFC-4180), oldest first — matches paper-log order. */
export async function exportCsv(): Promise<string> {
  const drives = await getDrives();
  const q = (s: string) => '"' + s.replace(/"/g, '""') + '"';
  const lines = [
    'date,duration_minutes,night_minutes,day_minutes,weather,roads,supervisor,miles,notes',
  ];
  for (const d of [...drives].reverse()) {
    lines.push(
      [
        d.date,
        String(d.durationMin),
        String(d.nightMin),
        String(d.durationMin - d.nightMin),
        q(d.weather),
        q(d.roads),
        q(d.supervisor),
        d.miles > 0 ? d.miles.toFixed(1) : '',
        q(d.notes),
      ].join(',')
    );
  }
  return lines.join('\r\n');
}

/** "3h 45m" style formatting used across the app. */
export function fmtHours(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
