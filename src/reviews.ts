import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { getOffering } from './purchases';
import { todayIso } from './db';

/**
 * App Store rating asks, at moments of value. Each trigger fires at most once
 * ever, at most one prompt per launch, and StoreKit still decides whether the
 * prompt is actually shown (it caps it at 3 a year).
 *   drive     - first saved drive
 *   export    - first PDF export
 *   purchase  - right after a trial or purchase from the onboarding paywall
 *   laterDay  - first launch on a later calendar day than install
 * Never while the Lifetime launch offer is free (Free mode).
 * The purchase and laterDay triggers were added in 1.0.6 (Brian, Oct 19).
 */
export type ReviewTrigger = 'drive' | 'export' | 'purchase' | 'laterDay';

const triggerKey = (t: ReviewTrigger) => `odo.review.${t}.v1`;
/**
 * Before 1.0.6 a single flag covered first drive and first export, whichever
 * came first. Export needs a drive, so it was always the first-drive ask.
 */
const LEGACY_ASKED_KEY = 'odo.reviewAsked.v1';
const INSTALL_DAY_KEY = 'odo.installDay.v1';

let launchState: 'idle' | 'checking' | 'asked' = 'idle';
let launchChecked = false;

/** Free mode: the Lifetime price is 0 (launch offer). Unknown counts as Free, so we never risk a prompt then. */
async function isFreeMode(): Promise<boolean> {
  const off = await getOffering();
  return !off || (off.lifetime != null && off.lifetime.product.price === 0);
}

export async function maybeRequestReview(trigger: ReviewTrigger): Promise<void> {
  if (launchState !== 'idle') return;
  launchState = 'checking';
  try {
    if (await AsyncStorage.getItem(triggerKey(trigger))) return;
    if (trigger === 'drive' && (await AsyncStorage.getItem(LEGACY_ASKED_KEY))) return;
    if (await isFreeMode()) return;
    if (!(await StoreReview.hasAction())) return;
    await AsyncStorage.setItem(triggerKey(trigger), '1');
    launchState = 'asked';
    setTimeout(() => {
      StoreReview.requestReview().catch(() => {});
    }, 1200);
  } catch {
    // never let review plumbing affect the log
  } finally {
    if (launchState === 'checking') launchState = 'idle';
  }
}

/** After a drive is saved; driveCount includes it. */
export async function maybeRequestReviewAfterDrive(driveCount: number): Promise<void> {
  if (driveCount < 1) return;
  await maybeRequestReview('drive');
}

/** After a successful PDF export, the moment the app just produced the thing they came for. */
export const maybeRequestReviewAfterExport = () => maybeRequestReview('export');

/** Once per cold launch, from the main screen: records the install day, and asks on the first later day. */
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
