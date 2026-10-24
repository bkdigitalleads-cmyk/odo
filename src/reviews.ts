import { useSyncExternalStore } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as StoreReview from 'expo-store-review';
import { getOffering } from './purchases';
import { todayIso } from './db';

/**
 * App Store rating asks, at moments of value (Attend 1.0.5 pattern).
 *   export     - first PDF export
 *   thirdDrive - a drive saves and the log then has 3 or more drives: a soft
 *                ask card on the Drives tab first ("Is Odo working for you?");
 *                Yes opens the system prompt, Not really opens a support email
 *   purchase   - right after a trial or purchase from the onboarding paywall
 *   laterDay   - first launch on a later calendar day than install
 * Rules for every trigger: at most once ever, at most one ask per launch,
 * never in Free mode (Lifetime price 0) or when the price is unknown, never
 * while the Face ID lock is showing, and never again after "Not really".
 * StoreKit's requestReview still decides whether the prompt is shown (Apple
 * caps it at 3 a year).
 */
export type ReviewTrigger = 'export' | 'thirdDrive' | 'purchase' | 'laterDay';

const triggerKey = (t: ReviewTrigger) => `odo.review.${t}.v1`;
const INSTALL_DAY_KEY = 'odo.installDay.v1';
/** Set by "Not really" on the soft ask: Odo never asks for a rating again. */
const DECLINED_KEY = 'odo.review.declined.v1';

const SUPPORT_EMAIL = 'brianwkershner@gmail.com';
const SOFT_ASK_DRIVES = 3;

let launchState: 'idle' | 'checking' | 'asked' = 'idle';
let launchChecked = false;
let lockShowing = false;

/** LockGate reports here, so no ask ever starts or lands behind the lock screen. */
export function setReviewLockShowing(showing: boolean): void {
  lockShowing = showing;
}

/** Free mode: the Lifetime price is 0 (launch offer). Unknown counts as Free, so we never risk a prompt then. */
async function isFreeMode(): Promise<boolean> {
  const off = await getOffering();
  return !off || (off.lifetime != null && off.lifetime.product.price === 0);
}

/** Every rule except the per-launch one, which the callers hold. */
async function canAsk(trigger: ReviewTrigger): Promise<boolean> {
  if (lockShowing) return false;
  if (await AsyncStorage.getItem(DECLINED_KEY)) return false;
  if (await AsyncStorage.getItem(triggerKey(trigger))) return false;
  if (await isFreeMode()) return false;
  if (!(await StoreReview.hasAction())) return false;
  return !lockShowing;
}

/** The system prompt, after a short pause so it doesn't land mid-animation. */
function showSystemPrompt(trigger: ReviewTrigger): void {
  launchState = 'asked';
  setTimeout(() => {
    // The app locked during the pause: skip, and let the trigger try another launch.
    if (lockShowing) {
      launchState = 'idle';
      return;
    }
    AsyncStorage.setItem(triggerKey(trigger), '1').catch(() => {});
    StoreReview.requestReview().catch(() => {});
  }, 1200);
}

export async function maybeRequestReview(trigger: Exclude<ReviewTrigger, 'thirdDrive'>): Promise<void> {
  if (launchState !== 'idle') return;
  launchState = 'checking';
  try {
    if (await canAsk(trigger)) showSystemPrompt(trigger);
  } catch {
    // never let review plumbing affect the log
  } finally {
    if (launchState === 'checking') launchState = 'idle';
  }
}

/** After a first PDF export, the moment the app just produced the thing they came for. */
export const maybeRequestReviewAfterExport = () => maybeRequestReview('export');

/** Once per cold launch, after any unlock: records the install day, and asks on the first later day. */
export async function maybeRequestReviewOnLaunch(): Promise<void> {
  if (launchChecked) return;
  launchChecked = true;
  try {
    const today = todayIso();
    const installDay = await AsyncStorage.getItem(INSTALL_DAY_KEY);
    if (!installDay) {
      await AsyncStorage.setItem(INSTALL_DAY_KEY, today);
      return;
    }
    if (installDay !== today) await maybeRequestReview('laterDay');
  } catch {
    // never let review plumbing affect the log
  }
}

// --- Soft ask card (third drive) ------------------------------------------

let softAskVisible = false;
const listeners = new Set<() => void>();

function setSoftAsk(visible: boolean): void {
  softAskVisible = visible;
  listeners.forEach((l) => l());
}

/** True while the "Is Odo working for you?" card should show on the Drives tab. */
export function useSoftAsk(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => softAskVisible
  );
}

/** After a new drive saves; driveCount includes it. Shows the soft ask card when every rule allows. */
export async function maybeSoftAskAfterDrive(driveCount: number): Promise<void> {
  if (driveCount < SOFT_ASK_DRIVES || softAskVisible || launchState !== 'idle') return;
  launchState = 'checking';
  try {
    if (await canAsk('thirdDrive')) {
      // Holds this launch's one ask while the card is up.
      launchState = 'asked';
      setSoftAsk(true);
    }
  } catch {
    // never let review plumbing affect the log
  } finally {
    if (launchState === 'checking') launchState = 'idle';
  }
}

/** "Yes" on the card: the system prompt. */
export function softAskYes(): void {
  setSoftAsk(false);
  showSystemPrompt('thirdDrive');
}

/** "Not really" on the card: a support email with version and device filled in, and no more asks, ever. */
export async function softAskNo(): Promise<void> {
  setSoftAsk(false);
  try {
    await AsyncStorage.multiSet([
      [DECLINED_KEY, '1'],
      [triggerKey('thirdDrive'), '1'],
    ]);
  } catch {
    // the card is gone either way
  }
  const version = Constants.expoConfig?.version ?? '';
  const build = Constants.expoConfig?.ios?.buildNumber ?? '';
  const os = Platform.OS === 'ios' ? `iOS ${Platform.Version}` : `${Platform.OS} ${Platform.Version}`;
  const body = [
    'What could work better?',
    '',
    '',
    '',
    `Odo ${version} (${build})`,
    // Model and device name need extra packages or permissions; the OS version is what helps.
    `iPhone, ${os}`,
  ].join('\n');
  const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Odo feedback')}&body=${encodeURIComponent(body)}`;
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Send us a note', `Mail isn't set up on this iPhone. You can write to ${SUPPORT_EMAIL}.`);
  }
}
