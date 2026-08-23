/**
 * Supervised-driving practice requirements by US state, for learner's-permit
 * holders under 18 (the graduated-driver-licensing pathway).
 *
 * totalHours: state-required supervised practice hours before the road test.
 * nightHours: how many of those must be at night (0 = no night requirement,
 *             null on totalHours = state sets no numeric hour requirement).
 *
 * VERIFICATION STATUS: values below are drafted from research and MUST be
 * verified against each state's DMV/DOT publication before release; see
 * docs/state-sources.md, which records a source URL and check date per state.
 * The app always lets users override with a custom goal (Settings), so an
 * edge-case change in state law never blocks anyone.
 */

export interface StateReq {
  code: string;
  name: string;
  totalHours: number | null;
  nightHours: number;
  /** Short caveat shown under the state picker when it matters. */
  note?: string;
}

export const CUSTOM_CODE = 'XX';

export const STATE_REQS: StateReq[] = [
  { code: 'AL', name: 'Alabama', totalHours: 50, nightHours: 0 },
  { code: 'AK', name: 'Alaska', totalHours: 40, nightHours: 10 },
  { code: 'AZ', name: 'Arizona', totalHours: 30, nightHours: 10 },
  { code: 'AR', name: 'Arkansas', totalHours: null, nightHours: 0, note: 'No statewide hour minimum — set your own goal.' },
  { code: 'CA', name: 'California', totalHours: 50, nightHours: 10 },
  { code: 'CO', name: 'Colorado', totalHours: 50, nightHours: 10 },
  { code: 'CT', name: 'Connecticut', totalHours: 40, nightHours: 0 },
  { code: 'DE', name: 'Delaware', totalHours: 50, nightHours: 10 },
  { code: 'DC', name: 'District of Columbia', totalHours: 40, nightHours: 10 },
  { code: 'FL', name: 'Florida', totalHours: 50, nightHours: 10 },
  { code: 'GA', name: 'Georgia', totalHours: 40, nightHours: 6 },
  { code: 'HI', name: 'Hawaii', totalHours: 50, nightHours: 10 },
  { code: 'ID', name: 'Idaho', totalHours: 50, nightHours: 10 },
  { code: 'IL', name: 'Illinois', totalHours: 50, nightHours: 10 },
  { code: 'IN', name: 'Indiana', totalHours: 50, nightHours: 10 },
  { code: 'IA', name: 'Iowa', totalHours: 20, nightHours: 2 },
  { code: 'KS', name: 'Kansas', totalHours: 50, nightHours: 10 },
  { code: 'KY', name: 'Kentucky', totalHours: 60, nightHours: 10 },
  { code: 'LA', name: 'Louisiana', totalHours: 50, nightHours: 15 },
  { code: 'ME', name: 'Maine', totalHours: 70, nightHours: 10 },
  { code: 'MD', name: 'Maryland', totalHours: 60, nightHours: 10 },
  { code: 'MA', name: 'Massachusetts', totalHours: 40, nightHours: 0 },
  { code: 'MI', name: 'Michigan', totalHours: 50, nightHours: 10 },
  { code: 'MN', name: 'Minnesota', totalHours: 50, nightHours: 15 },
  { code: 'MS', name: 'Mississippi', totalHours: null, nightHours: 0, note: 'No statewide hour minimum — set your own goal.' },
  { code: 'MO', name: 'Missouri', totalHours: 40, nightHours: 10 },
  { code: 'MT', name: 'Montana', totalHours: 50, nightHours: 10 },
  { code: 'NE', name: 'Nebraska', totalHours: 50, nightHours: 10 },
  { code: 'NV', name: 'Nevada', totalHours: 50, nightHours: 10 },
  { code: 'NH', name: 'New Hampshire', totalHours: 40, nightHours: 10 },
  { code: 'NJ', name: 'New Jersey', totalHours: null, nightHours: 0, note: 'No statewide hour minimum — set your own goal.' },
  { code: 'NM', name: 'New Mexico', totalHours: 50, nightHours: 10 },
  { code: 'NY', name: 'New York', totalHours: 50, nightHours: 15 },
  { code: 'NC', name: 'North Carolina', totalHours: 60, nightHours: 10 },
  { code: 'ND', name: 'North Dakota', totalHours: 50, nightHours: 10 },
  { code: 'OH', name: 'Ohio', totalHours: 50, nightHours: 10 },
  { code: 'OK', name: 'Oklahoma', totalHours: 50, nightHours: 10 },
  { code: 'OR', name: 'Oregon', totalHours: 50, nightHours: 0, note: '100 hours if you skip an approved driver-ed course.' },
  { code: 'PA', name: 'Pennsylvania', totalHours: 65, nightHours: 10, note: 'Includes 5 bad-weather hours.' },
  { code: 'RI', name: 'Rhode Island', totalHours: 50, nightHours: 10 },
  { code: 'SC', name: 'South Carolina', totalHours: 40, nightHours: 10 },
  { code: 'SD', name: 'South Dakota', totalHours: 50, nightHours: 10 },
  { code: 'TN', name: 'Tennessee', totalHours: 50, nightHours: 10 },
  { code: 'TX', name: 'Texas', totalHours: 30, nightHours: 10 },
  { code: 'UT', name: 'Utah', totalHours: 40, nightHours: 10 },
  { code: 'VT', name: 'Vermont', totalHours: 40, nightHours: 10 },
  { code: 'VA', name: 'Virginia', totalHours: 45, nightHours: 15 },
  { code: 'WA', name: 'Washington', totalHours: 50, nightHours: 10 },
  { code: 'WV', name: 'West Virginia', totalHours: 50, nightHours: 10 },
  { code: 'WI', name: 'Wisconsin', totalHours: 50, nightHours: 10 },
  { code: 'WY', name: 'Wyoming', totalHours: 50, nightHours: 10 },
];

export function getStateReq(code: string): StateReq | null {
  return STATE_REQS.find((s) => s.code === code) ?? null;
}
