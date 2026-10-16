# Odo audit (Oct 15 2026)
## Findings
1. [MED] Arkansas, Mississippi and onboarding "custom" users get a made-up 50h / 10 night requirement, and it prints on the DMV log
   - Where: src/state.tsx:54-58 (fallback to 50/10 when totalHours is null); src/screens/Onboarding.tsx:70, :94 (custom sets only stateCode 'XX'); src/screens/Settings.tsx:34, :150, :156; src/report.ts:127-128
   - What happens: A family picks Arkansas, which has no statewide hour minimum. resolveGoal falls through to the default. The PDF header reads "Arkansas · Goal: 50 hours (incl. 10 at night)" and Settings says "(common default — pick your state above)" even though a state is already picked. A user who picks "Somewhere else / custom" in onboarding gets the same 50/10. Settings labels it "Custom goal" but hides the Total/Night inputs (isCustom checks customTotalHours, which is still null), so they can't edit the goal without re-picking Custom.
   - Fix: in onboarding, apply the same patch Settings.pickState uses (for 'XX', or any state with totalHours null, set customTotalHours/customNightHours to 50/10 so the inputs appear). In report.ts, omit the "Goal:" text when goal.source === 'default'.
2. [MED] Minnesota is listed as 40 hours with no note. 40 applies only if a parent completes the supplemental parent class; otherwise it is 50
   - Where: src/states.ts:51
   - What happens: Minnesota requires 50 supervised hours (15 at night), reduced to 40 only when a parent or guardian completes the approved supplemental parent curriculum. A Minnesota family that skipped the class sees "Goal reached" at 40 hours, and so does their PDF, 10 hours short of what they need for the road test. Please confirm against MN DVS, since docs/state-sources.md records 40/15 from IIHS.
   - Fix: set it to `{ totalHours: 50, nightHours: 15, note: '40 hours if a parent completes the supplemental parent class.' }`. Massachusetts already uses the conservative higher number.
3. [MED] The custom Total hours field can't be cleared, so typing a new goal gives the wrong number
   - Where: src/screens/Settings.tsx:160-167
   - What happens: The input is controlled and each keystroke writes `Math.max(1, Number(v) || 0) || 1`. Backspacing "50" lands on "1", and typing 6 and 0 gives "160" (maxLength 3 lets it through). The goal ring and the PDF ("Goal: 160 hours") show 160.
   - Fix: keep a local text state and commit on blur/submit, reverting if the value is empty or ≤0. Do the same for Night hours (line 177) and clamp night to total.
4. [MED] The paywall promises a free trial and "No payment now" whether or not the user is eligible for one
   - Where: src/screens/Paywall.tsx:35-41, :171, :268
   - What happens: Trial copy comes from product.introPrice, which StoreKit returns even to ineligible users (for example after an earlier weekly trial in the same group). They are charged immediately despite "you are not charged until the trial ends". When lifetime is not free, the subtitle also hard-codes "Start with 3 days free" if there is no weekly trial or offerings failed to load.
   - Fix: gate trial copy on Purchases.checkTrialOrIntroductoryPriceEligibility(...) === ELIGIBLE, and remove the fallback.
5. [MED] Face ID lock: an unsaved drive is lost on app switch, and there is no way out if Face ID or the passcode is removed or Pro lapses
   - Where: src/LockGate.tsx:342-353, :367, :376; src/screens/Settings.tsx:53-57
   - What happens: (a) Backgrounding unmounts DriveFormModal (the lock screen replaces the children), so after unlock reset() clears the drive being entered. (b) After the device passcode is removed, authenticateAsync never succeeds and the user is stuck on the lock screen. Deleting the app is the only escape and it erases the log. (c) A lapsed-Pro user can't turn the lock off because the toggle opens the paywall.
   - Fix: render the lock as an overlay over mounted children. Disable the lock on not_enrolled / passcode_not_set / not_available. Only require Pro when turning the lock on.
6. [LOW] Miles typed with a comma decimal are silently saved as 0
   - Where: src/screens/DriveForm.tsx:186
   - What happens: The miles field uses decimal-pad (line 399), which shows "," in comma-decimal regions. Number("12,5") is NaN, the `|| 0` turns it into 0, and the miles are dropped with no warning. Merit and Given already replace "," with ".".
   - Fix: `Number(milesText.replace(',', '.')) || 0`.
7. [LOW] Save errors are silent, and a purchase that succeeds without granting 'pro' shows nothing
   - Where: src/screens/DriveForm.tsx:178-204 (try/finally, no catch); src/screens/Paywall.tsx:77-83
   - What happens: A DB write failure becomes an unhandled rejection with no alert. On the paywall, ok:true with isPro:false runs neither branch, so the user has paid and gets no feedback. Nothing calls refreshPro or registers a CustomerInfo listener.
   - Fix: add a catch with an Alert in save(). Add an `else if (res.ok)` "tap Restore" alert and Purchases.addCustomerInfoUpdateListener in state.tsx.
8. [LOW] The Face ID system prompt says "Unlock your journal"
   - Where: src/LockGate.tsx:24
   - What happens: Fork leftover: the iOS Face ID sheet in a driving-log app reads "Unlock your journal".
   - Fix: change it to 'Unlock your driving log'.

## Checked and fine
- db.ts schema is unchanged since the initial commit, so there are no migration gaps. Minutes are integers, and clean() clamps nightMin to between 0 and durationMin. The form also blocks night > total.
- PDF and CSV totals: the day/night/total columns and the totals row are all integer-minute sums via fmtHours, so the rows add up exactly to the totals. dayMin = totalMin - nightMin. pct has a guard for a zero goal.
- Every other state value looks plausible against known GDL rules (CA 50/10, NY 50/15, PA 65/10+5, VA 45/15, IA 20/2, GA 40/6, ME 70/10, MD 60/10, KY 60/10, LA 50/15, TX 30/10, OR 50 or 100, ND under-16, MA 40), and there are 51 entries including DC.
- Dates are local YYYY-MM-DD (no toISOString). The timer persists across restarts.
- Free limit (10 drives) is enforced at the only add entry point. PDF and CSV are Pro-gated.
- The Lifetime launch offer (price 0) is selected first and labeled Free, with a correct disclosure. Restore handles all three outcomes. Onboarding skips the paywall for users who are already Pro.
- Settings JSON.parse is guarded in state.tsx and report.ts.
- The review prompt fires once after the first drive or first export, with an AsyncStorage flag and hasAction guard.
