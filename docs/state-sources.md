# State requirement sources — verification record

Values in `src/states.ts` are supervised practice-hour requirements for
learner's-permit holders under 18 (GDL pathway). Verified Aug 23–24, 2026.

## Primary cross-state source
- IIHS Graduated Licensing Laws table: https://www.iihs.org/topics/teenagers/graduated-licensing-laws-table
  (fetched Aug 23, 2026 — covers AL through UT in our fetch; VT–WY truncated)
- Secondary aggregator (used only where IIHS truncated, flagged for DMV spot-check):
  https://uspermitprep.com/after-permit/supervised-driving-hours-by-state/

## Verification status per state
- **Confirmed vs IIHS (Aug 23, 2026):** AL 50/0(waiver), AK 40/10(or weather), AZ 30/10(waiver),
  AR none, CA 50/10, CO 50/10, CT 40/0, DE 50/10, DC 40/10(night in intermediate stage),
  FL 50/10, GA 40/6, HI 50/10, ID 50/10, IL 50/10, IN 50/10, IA 20/2, KS 50/10(25+25),
  KY 60/10, LA 50/15, ME 70/10, MD 60/10, MA 40/0, MI 50/10, MN 40/15, MS none, MO 40/10,
  MT 50/10, NE 50/10(waiver), NV 50/10(waiver), NH 40/10, NJ 50/10, NM 50/10, NY 50/15,
  NC 60/10, ND 50/0(under-16 only), OH 50/10, OK 50/10, OR 50/0(100 w/o driver-ed),
  PA 65/10(+5 weather), RI 50/10, SC 40/10, SD 50/10(+10 weather), TN 50/10, TX 30/10, UT 40/10.
- **Confirmed vs official state DMV document:** WI 50/10 — WisDOT form HS-303
  https://wisconsindot.gov/Documents/dmv/shared/hs303.pdf (NOTE: uspermitprep claimed 30/10;
  the official form says 50/10 — official source wins. Do not trust aggregators alone.)
- **Aggregator-sourced, DMV spot-check still to do (uspermitprep, matches prior research):**
  VT 40/10 · VA 45/15 · WA 50/10 · WV 50/10 · WY 50/10.

## Draft errors caught by verification (would have shipped wrong)
- Minnesota: draft 50/15 → corrected **40/15** (IIHS)
- New Jersey: draft "no minimum" → corrected **50/10** (IIHS; NJ added the requirement)
- North Dakota: draft 50/10 → corrected **50/0, under-16 only** (IIHS lists no night hours)

## Product safety nets (why an edge-case error can't strand a user)
- Custom-goal override in Settings and onboarding ("Somewhere else / custom").
- In-app disclaimer under the goal: "always confirm current rules with your state's DMV."
- PDF footer repeats the verify-with-DMV line.

## Still to check before submission
1. DMV spot-check VT, VA, WA, WV, WY against official state sites.
2. TX: parent-taught vs instructor-taught nuances; TX requires its own DPS forms for
   certification — confirm our PDF is a supplement, not a claimed replacement (copy
   already says "check your state's exact paperwork rules").
3. OH: confirm whether the state mandates its own certification affidavit (BMV 5791?) —
   same supplement framing.
