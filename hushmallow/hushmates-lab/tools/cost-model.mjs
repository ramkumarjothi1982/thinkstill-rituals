#!/usr/bin/env node
// The monthly and annual cost model behind docs/COSTS.md, so the arithmetic can be re-run when a
// price or an assumption changes. Prices are Supabase's, Cloudflare's and the email providers'
// published prices (sources in docs/COSTS.md); the exchange rate is the RBA's for 14 October 2026.
//
//   node tools/cost-model.mjs            prints the tables (markdown)

export const USD_PER_AUD = 0.7002;          // RBA 4 pm rate, 14 Oct 2026
export const aud = (usd) => usd / USD_PER_AUD;
export const ALL_IN = 1.10 * 1.03;          // 10% GST where charged, ~3% card foreign-transaction fee

// per monthly active person, per month (docs/COSTS.md "Assumptions"). These are projections, not limits:
// nothing here caps what anyone can use, and the bill follows real use (see worstCases()).
//   typical  10 minutes a day on 20 days; 4 feelings; ~6 calls a minute while the app is in use
//   high     30 minutes a day on 30 days; three times the feelings and sign-ins
// peakShare: the share of monthly active people using the app at the same moment, at the busiest time
export const SCENARIOS = {
  typical: { calls: 1300, egressGb: 0.007, storedGb: 0.0001, emails: 1.5, realtimeMessages: 300, peakShare: 0.05 },
  high: { calls: 5700, egressGb: 0.03, storedGb: 0.0003, emails: 3, realtimeMessages: 900, peakShare: 0.10 },
};
export const PER = SCENARIOS.typical;
const REALTIME_CALLS = 0.15;                // change notices instead of polling remove ~85% of calls
const DAILY_SHARE = 0.35;                   // of monthly active people, how many use it on a given day (assumption)

export const FREE = { calls: 500e3, egressGb: 5, dbGb: 0.5, mau: 50e3, realtimeMessages: 2e6, peak: 200 };
const PRO = { calls: 2e6, egressGb: 250, dbGb: 8, mau: 100e3, realtimeMessages: 5e6, peak: 500 };

const GB_PER_MESSAGE = 1e-6;                    // ~1 KB a change notice
const usage = (people, realtime, sc = PER) => ({
  calls: people * sc.calls * (realtime ? REALTIME_CALLS : 1),
  egressGb: people * (sc.calls * (realtime ? REALTIME_CALLS : 1) * (sc.egressGb / sc.calls) + (realtime ? sc.realtimeMessages * GB_PER_MESSAGE : 0)),
  dbGb: people * sc.storedGb,
  mau: people,
  realtimeMessages: realtime ? people * sc.realtimeMessages : 0,
  peak: realtime ? Math.ceil(people * sc.peakShare) : 0,
});

/** Monthly active people vs people using it at once, and the busiest moment's load. */
export function atOnce(people, scenario = 'typical') {
  const sc = SCENARIOS[scenario];
  const simultaneous = Math.ceil(people * sc.peakShare);
  return { people, daily: Math.round(people * DAILY_SHARE), simultaneous, callsPerSecond: Math.round(simultaneous * 0.1 * 10) / 10 };   // ~6 calls a minute each while in use
}

/** Compute size from the people using it at the busiest moment (an assumption until a staging load test). */
const computeFor = (simultaneous) => (simultaneous <= 10 ? ['Micro', 10] : simultaneous <= 100 ? ['Small', 15] : simultaneous <= 600 ? ['Medium', 60]
  : simultaneous <= 2500 ? ['Large', 110] : simultaneous <= 6000 ? ['2XL', 410] : ['4XL', 960]);

/** Which Free quotas a scale would pass (an empty list when it fits). Free never bills; it restricts. */
export function overFree(people, { realtime = false, scenario = 'typical' } = {}) {
  const u = usage(people, realtime, SCENARIOS[scenario]);
  return Object.keys(FREE).filter((k) => u[k] > FREE[k]);
}

/** One scale → the monthly bill (USD), item by item. plan: 'free' | 'pro'. */
export function monthly(people, { realtime = false, plan = 'pro', scenario = 'typical' } = {}) {
  const sc = SCENARIOS[scenario];
  const u = usage(people, realtime, sc);
  const items = [];
  if (plan === 'free') {
    const over = overFree(people, { realtime, scenario });
    if (over.length) throw new Error(`${people} people pass the Free plan's ${over.join(', ')} quota`);
    items.push(['Supabase Free plan (no backups; pauses after a quiet week)', 0]);
  } else {
    items.push(['Supabase Pro plan (includes US$10 compute credit)', 25]);
    const size = computeFor(Math.ceil(people * sc.peakShare));
    items.push([`Compute beyond the credit (${size[0]})`, size[1] - 10]);
    items.push(['Edge Function calls beyond 2 million (US$2 per million or part)', Math.ceil(Math.max(0, u.calls - PRO.calls) / 1e6) * 2]);
    items.push(['Egress beyond 250 GB (US$0.09/GB)', Math.max(0, u.egressGb - PRO.egressGb) * 0.09]);
    items.push(['Database beyond 8 GB (US$0.125/GB)', Math.max(0, u.dbGb - PRO.dbGb) * 0.125]);
    items.push(['Monthly active users beyond 100,000 (US$0.00325 each)', Math.max(0, u.mau - PRO.mau) * 0.00325]);
    if (realtime) {
      items.push(['Realtime messages beyond 5 million (US$2.50 per million or part)', Math.ceil(Math.max(0, u.realtimeMessages - PRO.realtimeMessages) / 1e6) * 2.5]);
      items.push(['Realtime peak connections beyond 500 (US$10 per 1,000 or part)', Math.ceil(Math.max(0, u.peak - PRO.peak) / 1000) * 10]);
    }
    if (people >= 10000) items.push(['Point-in-time recovery, 7 days (recommended from 10,000)', 100]);
  }
  const emails = people * sc.emails;
  items.push([`Sign-in emails (${Math.round(emails).toLocaleString('en-AU')}/month)`, emails <= 3000 ? 0 : emails <= 50000 ? 20 : (emails * 0.10) / 1000]);
  items.push(['Static site (Cloudflare Pages Free) and captcha (Turnstile, free)', 0]);
  return { people, plan, scenario, items, usd: items.reduce((s, [, v]) => s + v, 0) };
}

/**
 * What isn't bounded by the projections: a few cases where cost (or, on Free, an outage) comes
 * from how the service is used rather than how many people use it. US$ a month on Pro, beyond what
 * the plan includes. Nothing here is a ceiling.
 */
export function worstCases() {
  const MONTH = 30 * 24 * 60;                                                   // minutes
  const tabNoBackoff = 6 * MONTH;                                               // a visible tab polling 6 calls a minute, all month
  const tabWithBackoff = 30 * (2 * (14 + 28));                                   // the idle back-off: ~14 looks, then ~28 slower ones, a day; 2 calls each
  const abusiveAccount = 120 * MONTH;                                            // one account at the 120-requests-a-minute limit
  const perMillion = 2;                                                          // US$ per million function calls beyond the 2 million included
  return {
    alwaysOpenTab: { withoutBackoff: tabNoBackoff, withBackoff: tabWithBackoff },
    abusiveAccount: { calls: abusiveAccount, usd: (abusiveAccount / 1e6) * perMillion },
    floodPer10Million: { usd: 10 * perMillion },
    perMillion,
  };
}

export const SCALES = [
  { people: 100, plan: 'free', label: '100 (beta, Free plan)' },
  { people: 100, plan: 'pro', label: '100 (beta, Pro plan)' },
  { people: 1000, plan: 'pro', label: '1,000' },
  { people: 10000, plan: 'pro', label: '10,000' },
  { people: 100000, plan: 'pro', label: '100,000' },
];

const fmt = (n) => (n < 1 && n > 0 ? n.toFixed(2) : Math.round(n).toLocaleString('en-AU'));
export function table({ realtime = false, scenario = 'typical' } = {}) {
  const scales = SCALES.filter((s) => scenario === 'typical' || s.plan === 'pro').map((s) => ({ ...monthly(s.people, { realtime, plan: s.plan, scenario }), label: s.label }));
  const head = '| Active people | US$/month | A$/month (before GST and card fees) | A$/month all-in | A$/year all-in |\n|---|---:|---:|---:|---:|';
  const rows = scales.map((s) => `| ${s.label} | ${fmt(s.usd)} | ${fmt(aud(s.usd))} | ${fmt(aud(s.usd) * ALL_IN)} | ${fmt(aud(s.usd) * ALL_IN * 12)} |`);
  const detail = scales.filter((s) => s.usd > 0).map((s) => `\n**${s.label}**\n\n| Item | US$/month | A$/month |\n|---|---:|---:|\n${s.items.filter(([, v]) => v > 0).map(([k, v]) => `| ${k} | ${fmt(v)} | ${fmt(aud(v))} |`).join('\n')}`).join('\n');
  return { head, rows, detail, scales };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  console.log('\n### Monthly active people, and people using it at once\n\n| Monthly active | On a given day | At the busiest moment (typical) | (high use) | Calls a second then (typical) |\n|---:|---:|---:|---:|---:|');
  for (const n of [100, 1000, 10000, 100000]) {
    const t = atOnce(n); const h = atOnce(n, 'high');
    console.log(`| ${n.toLocaleString('en-AU')} | ${t.daily.toLocaleString('en-AU')} | ${t.simultaneous.toLocaleString('en-AU')} | ${h.simultaneous.toLocaleString('en-AU')} | ${t.callsPerSecond} |`);
  }
  for (const scenario of ['typical', 'high']) for (const realtime of [false, true]) {
    const t = table({ realtime, scenario });
    console.log(`\n### ${scenario === 'high' ? 'High use' : 'Typical use'}, ${realtime ? 'after switching to Realtime' : 'as built (polling every 20 s while in use)'}\n\n${t.head}\n${t.rows.join('\n')}`);
    if (scenario === 'typical' && !realtime) console.log(t.detail);
  }
  console.log(`\nFree plan, typical use: 100 people fit (${overFree(100).join(', ') || 'no quota passed'}); 1,000 people pass ${overFree(1000).join(', ')}.`);
  console.log(`Free plan, high use: 100 people ${overFree(100, { scenario: 'high' }).length ? `pass ${overFree(100, { scenario: 'high' }).join(', ')}` : 'fit'}.`);
  console.log('\nWorst cases (not ceilings):', JSON.stringify(worstCases()));
}
