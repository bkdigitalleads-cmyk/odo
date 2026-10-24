/**
 * Supervised-driving practice log PDF, generated fully on-device with
 * expo-print. Styled like the paper log a DMV or driving school hands out:
 * dated entries, day/night breakdown, totals against the state requirement,
 * and a certification block with signature lines.
 */
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDrives, getStats, fmtHours, Drive, PRIOR_HOURS_LABEL } from './db';
import { getStateReq, CUSTOM_CODE } from './states';
import { resolveGoal, parseSettings, priorMinutes, Goal, SETTINGS_KEY } from './state';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function prettyDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export interface ReportData {
  /** "October 20, 2026" */
  today: string;
  driverName: string;
  /** State name, "Custom goal", or '' when none was picked. */
  stateName: string;
  goal: Goal;
  /** False for the built-in 50/10 fallback, which is not anyone's real requirement. */
  showGoal: boolean;
  /** Appended to the goal line: Minnesota's parent-class reduction, '' otherwise. */
  goalNote: string;
  /** Hours from before Odo, entered by the parent. Zero when none. */
  prior: { dayMin: number; nightMin: number; totalMin: number };
  /** Dated drives, oldest first (paper-log order). */
  drives: Drive[];
  driveCount: number;
  /** Totals including the hours from before Odo. */
  totalMin: number;
  nightMin: number;
  dayMin: number;
  /** Percent of the goal, 0 to 100. */
  pct: number;
}

/** Everything the log shows, shared by the PDF and the in-app SAMPLE preview. */
export async function buildReportData(): Promise<ReportData> {
  const settings = parseSettings(await AsyncStorage.getItem(SETTINGS_KEY).catch(() => null));
  const goal = resolveGoal(settings);
  const drives = await getDrives();
  const stats = await getStats();
  const prior = priorMinutes(settings);
  const stateReq = getStateReq(settings.stateCode);
  const stateName =
    settings.stateCode === CUSTOM_CODE ? 'Custom goal' : stateReq ? stateReq.name : '';
  const totalMin = stats.totalMin + prior.totalMin;
  return {
    today: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    driverName: settings.driverName,
    stateName,
    goal,
    showGoal: goal.source !== 'default',
    // Only when the goal is Minnesota's own 50/15, not a custom goal (AUDIT 2 follow-up).
    goalNote: settings.stateCode === 'MN' && goal.source === 'state' ? '; 40 with the parent awareness class' : '',
    prior,
    drives: [...drives].reverse(),
    driveCount: stats.driveCount,
    totalMin,
    nightMin: stats.nightMin + prior.nightMin,
    dayMin: stats.dayMin + prior.dayMin,
    pct: goal.totalHours > 0 ? Math.min(100, Math.round((totalMin / (goal.totalHours * 60)) * 100)) : 0,
  };
}

export async function buildReportHtml(): Promise<string> {
  const r = await buildReportData();
  const { goal, prior } = r;

  const priorRow =
    prior.totalMin > 0
      ? `
    <tr class="prior">
      <td><b>${esc(PRIOR_HOURS_LABEL)}</b></td>
      <td class="num">${fmtHours(prior.dayMin)}</td>
      <td class="num">${prior.nightMin > 0 ? fmtHours(prior.nightMin) : ''}</td>
      <td class="num"><b>${fmtHours(prior.totalMin)}</b></td>
      <td colspan="3">Not individual drives. Total carried over from an earlier log.</td>
    </tr>`
      : '';

  const rows = r.drives
    .map(
      (d) => `
    <tr>
      <td>${prettyDate(d.date)}</td>
      <td class="num">${fmtHours(d.durationMin - d.nightMin)}</td>
      <td class="num">${d.nightMin > 0 ? fmtHours(d.nightMin) : ''}</td>
      <td class="num"><b>${fmtHours(d.durationMin)}</b></td>
      <td>${esc(d.weather || '')}</td>
      <td>${esc(d.roads ? d.roads.split(',').join(', ') : '')}</td>
      <td>${esc(d.supervisor || '')}</td>
    </tr>`
    )
    .join('');

  const pct = r.pct;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #20242a; margin: 32px; }
  h1 { font-size: 21px; margin: 0 0 2px; }
  .sub { color: #5c6470; font-size: 12px; margin-bottom: 4px; }
  .who { margin: 14px 0 0; font-size: 13px; }
  .who b { font-size: 14px; }
  .summary { display: flex; gap: 10px; margin: 14px 0 6px; }
  .box { flex: 1; background: #f6f3ea; border: 1px solid #e3d9bd; border-radius: 10px; padding: 10px 12px; }
  .box .v { font-size: 18px; font-weight: 700; }
  .box .l { font-size: 11px; color: #5c6470; margin-top: 1px; }
  .goalbar { height: 9px; background: #eeeae0; border-radius: 5px; margin: 8px 0 2px; overflow: hidden; }
  .goalbar i { display: block; height: 100%; width: ${pct}%; background: #b07100; border-radius: 5px; }
  .goalpct { font-size: 11px; color: #5c6470; margin-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #5c6470; border-bottom: 2px solid #b07100; padding: 5px 6px; }
  td { border-bottom: 1px solid #e7e3d8; padding: 6px; font-size: 11.5px; vertical-align: top; }
  td.num { white-space: nowrap; }
  .prior td { background: #f6f3ea; border-bottom: 2px solid #e3d9bd; }
  .totals td { border-top: 2px solid #b07100; border-bottom: none; font-weight: 700; font-size: 12px; }
  .cert { margin-top: 26px; border: 1px solid #d8d3c4; border-radius: 10px; padding: 14px 16px; font-size: 12px; line-height: 1.5; }
  .sig { display: flex; gap: 28px; margin-top: 26px; }
  .sig div { flex: 1; border-top: 1px solid #20242a; padding-top: 4px; font-size: 11px; color: #5c6470; }
  .footer { margin-top: 24px; color: #98a0ac; font-size: 10px; text-align: center; }
</style></head>
<body>
  <h1>Supervised Driving Practice Log</h1>
  <div class="sub">Generated ${r.today} · Odo for iPhone · All data recorded on-device</div>
  <div class="who">
    ${r.driverName ? `Driver: <b>${esc(r.driverName)}</b>` : 'Driver: ____________________'}
    ${r.stateName ? ` &nbsp;·&nbsp; ${esc(r.stateName)}` : ''}
    ${r.showGoal ? `&nbsp;·&nbsp; Goal: ${goal.totalHours} hours${goal.nightHours > 0 ? ` (incl. ${goal.nightHours} at night)` : ''}${esc(r.goalNote)}` : ''}
  </div>
  <div class="summary">
    <div class="box"><div class="v">${fmtHours(r.totalMin)}</div><div class="l">total supervised driving</div></div>
    <div class="box"><div class="v">${fmtHours(r.nightMin)}</div><div class="l">of it at night</div></div>
    <div class="box"><div class="v">${r.driveCount}</div><div class="l">practice drives logged in Odo</div></div>
  </div>
  ${prior.totalMin > 0 ? `<div class="goalpct">Totals include ${fmtHours(prior.totalMin)} logged before Odo, entered by a parent and shown as its own row below.</div>` : ''}
  ${r.showGoal ? `<div class="goalbar"><i></i></div>
  <div class="goalpct">${pct}% of the ${goal.totalHours}-hour goal</div>` : ''}
  <table>
    <tr>
      <th>Date</th><th>Day</th><th>Night</th><th>Total</th><th>Weather</th><th>Roads</th><th>Supervisor</th>
    </tr>
    ${priorRow}
    ${rows}
    <tr class="totals">
      <td>Totals</td>
      <td class="num">${fmtHours(r.dayMin)}</td>
      <td class="num">${fmtHours(r.nightMin)}</td>
      <td class="num">${fmtHours(r.totalMin)}</td>
      <td colspan="3"></td>
    </tr>
  </table>
  <div class="cert">
    I certify that the supervised driving practice recorded above was completed as
    stated, with a licensed adult in the front passenger seat.
    <div class="sig">
      <div>Parent / guardian signature</div>
      <div>Date</div>
    </div>
  </div>
  <div class="footer">Logged with Odo. Verify current requirements with your state's DMV before your road test.</div>
</body></html>`;
}

export async function generateAndSharePdf(): Promise<void> {
  const html = await buildReportHtml();
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Your driving practice log',
      UTI: 'com.adobe.pdf',
    });
  }
}
