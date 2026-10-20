import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState as RNAppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initPurchases, getIsPro } from './purchases';
import { getStateReq } from './states';
import { countDrives } from './db';
import { syncTrialReminder } from './reminder';

export interface Settings {
  lockEnabled: boolean;
  /** Two-letter state code, '' until chosen, 'XX' = custom goal. */
  stateCode: string;
  /** Custom goal overrides (used when stateCode is 'XX', or user overrides). */
  customTotalHours: number | null;
  customNightHours: number | null;
  driverName: string;
  supervisorName: string;
  /**
   * Hours a parent says were driven before Odo (paper log, another app),
   * in minutes. Kept here rather than as drives so the drives table holds
   * only real, dated drives; the PDF and CSV show them as their own row.
   */
  priorDayMin: number;
  priorNightMin: number;
}

export const DEFAULT_SETTINGS: Settings = {
  lockEnabled: false,
  stateCode: '',
  customTotalHours: null,
  customNightHours: null,
  driverName: '',
  supervisorName: '',
  priorDayMin: 0,
  priorNightMin: 0,
};

export const SETTINGS_KEY = 'odo.settings.v1';
export const ONBOARDED_KEY = 'odo.onboarded.v1';

/** Settings from storage, with defaults for anything missing or corrupted. */
export function parseSettings(raw: string | null): Settings {
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    const s = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } as Settings;
    s.priorDayMin = Math.max(0, Math.round(Number(s.priorDayMin) || 0));
    s.priorNightMin = Math.max(0, Math.round(Number(s.priorNightMin) || 0));
    return s;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** Hours logged before Odo, in minutes. */
export function priorMinutes(settings: Settings): { dayMin: number; nightMin: number; totalMin: number } {
  return {
    dayMin: settings.priorDayMin,
    nightMin: settings.priorNightMin,
    totalMin: settings.priorDayMin + settings.priorNightMin,
  };
}

/**
 * Drives allowed on the free tier. New installs from 1.0.6 get 2; anyone who
 * installed an earlier version keeps the 10 they were promised. Decided once,
 * on the first launch of 1.0.6, and stored so it never changes after that.
 */
export const FREE_DRIVE_LIMIT_NEW = 2;
export const FREE_DRIVE_LIMIT_LEGACY = 10;
const FREE_LIMIT_KEY = 'odo.freeDriveLimit.v1';

async function loadFreeDriveLimit(): Promise<number> {
  const stored = Number(await AsyncStorage.getItem(FREE_LIMIT_KEY));
  if (stored === FREE_DRIVE_LIMIT_NEW || stored === FREE_DRIVE_LIMIT_LEGACY) return stored;
  // Any trace of an earlier version: finished onboarding, saved settings, or drives.
  const existing =
    (await AsyncStorage.getItem(ONBOARDED_KEY)) === '1' ||
    (await AsyncStorage.getItem(SETTINGS_KEY)) != null ||
    (await countDrives()) > 0;
  const limit = existing ? FREE_DRIVE_LIMIT_LEGACY : FREE_DRIVE_LIMIT_NEW;
  await AsyncStorage.setItem(FREE_LIMIT_KEY, String(limit));
  return limit;
}

export interface Goal {
  totalHours: number;
  nightHours: number;
  /** Where the numbers came from, for UI copy. */
  source: 'state' | 'custom' | 'default';
}

/** Resolve the active practice goal from settings (state preset or custom). */
export function resolveGoal(settings: Settings): Goal {
  if (settings.customTotalHours != null) {
    return {
      totalHours: settings.customTotalHours,
      nightHours: settings.customNightHours ?? 0,
      source: 'custom',
    };
  }
  const req = getStateReq(settings.stateCode);
  if (req && req.totalHours != null) {
    return { totalHours: req.totalHours, nightHours: req.nightHours, source: 'state' };
  }
  return { totalHours: 50, nightHours: 10, source: 'default' };
}

interface AppState {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  goal: Goal;
  isPro: boolean;
  setIsPro: (v: boolean) => void;
  refreshPro: () => Promise<void>;
  paywallVisible: boolean;
  showPaywall: () => void;
  hidePaywall: () => void;
  /** Free-tier drive limit for this install (2 or 10, see loadFreeDriveLimit). */
  freeDriveLimit: number;
  ready: boolean;
  /** Bumped whenever drive data changes, so screens refetch. */
  dataVersion: number;
  bumpData: () => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isPro, setIsPro] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const [freeDriveLimit, setFreeDriveLimit] = useState(FREE_DRIVE_LIMIT_LEGACY);

  useEffect(() => {
    (async () => {
      // Before settings load, so a brand-new install has nothing saved yet.
      try {
        setFreeDriveLimit(await loadFreeDriveLimit());
      } catch {
        // storage trouble: keep the generous limit rather than lock anyone out
      }
      try {
        setSettings(parseSettings(await AsyncStorage.getItem(SETTINGS_KEY)));
      } catch {
        // unreadable settings -> defaults
      }
      try {
        await initPurchases();
        setIsPro(await getIsPro());
      } catch {
        setIsPro(false);
      }
      setReady(true);
    })();
  }, []);

  // The trial-end reminder goes away once the trial is over or cancelled.
  useEffect(() => {
    if (!ready) return;
    syncTrialReminder();
    let wasBackground = false;
    const sub = RNAppState.addEventListener('change', (s) => {
      if (s === 'background') wasBackground = true;
      if (s !== 'active' || !wasBackground) return;
      wasBackground = false;
      syncTrialReminder();
    });
    return () => sub.remove();
  }, [ready]);

  const updateSettings = useCallback(
    async (patch: Partial<Settings>) => {
      const next = { ...settings, ...patch };
      setSettings(next);
      try {
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      } catch {
        // non-fatal
      }
    },
    [settings]
  );

  const refreshPro = useCallback(async () => {
    setIsPro(await getIsPro());
  }, []);

  const goal = useMemo(() => resolveGoal(settings), [settings]);

  const value = useMemo<AppState>(
    () => ({
      settings,
      updateSettings,
      goal,
      isPro,
      setIsPro,
      refreshPro,
      paywallVisible,
      showPaywall: () => setPaywallVisible(true),
      hidePaywall: () => setPaywallVisible(false),
      freeDriveLimit,
      ready,
      dataVersion,
      bumpData: () => setDataVersion((v) => v + 1),
    }),
    [settings, updateSettings, goal, isPro, refreshPro, paywallVisible, freeDriveLimit, ready, dataVersion]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
