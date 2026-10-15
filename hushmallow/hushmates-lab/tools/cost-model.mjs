#!/usr/bin/env node
// The monthly and annual cost model behind docs/COSTS.md, so the arithmetic can be re-run when a
// price or an assumption changes. Prices are Supabase's, Cloudflare's and the email providers'
// published prices (sources in docs/COSTS.md); the exchange rate is the RBA's for 14 October 2026.
//
//   node tools/cost-model.mjs            prints the tables (markdown)

export const USD_PER_AUD = 0.7002;          // RBA 4 pm rate, 14 Oct 2026
export const aud = (usd) => usd / USD_PER_AUD;
export const ALL_IN = 1.10 * 1.03;          // 10% GST where charged, ~3% card foreign-transaction fee

// per active person, per month (docs/COSTS.md "Assumptions")
export const PER = { calls: 1300, egressGb: 0.007, storedGb: 0.0001, emails: 1.5, realtimeMessages: 300, peakShare: 0.05 };
const REALTIME_CALLS = 0.15;                // change notices instead of polling remove ~85% of calls

export const FREE = { calls: 500e3, egressGb: 5, dbGb: 0.5, mau: 50e3, realtimeMessages: 2e6, peak: 200 };
const PRO = { calls: 2e6, egressGb: 250, dbGb: 8, mau: 100e3, realtimeMessages: 5e6, peak: 500 };

const GB_PER_CALL = PER.egressGb / PER.calls;   // ~5 KB a call
const GB_PER_MESSAGE = 1e-6;                    // ~1 KB a change notice
const usage = (people, realtime) => ({
  calls: people * PER.calls * (realtime ? REALTIME_CALLS : 1),
  egressGb: people * (PER.calls * (realtime ? REALTIME_CALLS : 1) * GB_PER_CALL + (realtime ? PER.realtimeMessages * GB_PER_MESSAGE : 0)),
  dbGb: people * PER.storedGb,
  mau: people,
  realtimeMessages: realtime ? people * PER.realtimeMessages : 0,
  peak: realtime ? Math.ceil(people * PER.peakShare) : 0,
});

/** Which Free quotas a scale would pass (an empty list when it fits). Free never bills; it restricts. */
export function overFree(people, { realtime = false } = {}) {
  const u = usage(people, realtime);
  return Object.keys(FREE).filter((k) => u[k] > FREE[k]);
}

/** One scale → the monthly bill (USD), item by item. plan: 'free' | 'pro'. */
export function monthly(people, { realtime = false, plan = 'pro' } = {}) {
  const u = usage(people, realtime);
  const items = [];
  if (plan === 'free') {
    const over = overFree(people, { realtime });
    if (over.length) throw new Error(`${people} people pass the Free plan's ${over.join(', ')} quota`);
    items.push(['Supabase Free plan (no backups; pauses after a quiet week)', 0]);
  } else {
    items.push(['Supabase Pro plan (includes US$10 compute credit)', 25]);
    const size = people <= 100 ? ['Micro', 10] : people <= 1000 ? ['Small', 15] : people <= 10000 ? ['Medium', 60] : people <= 50000 ? ['Large', 110] : ['2XL', 410];
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
  const emails = people * PER.emails;
  items.push([`Sign-in emails (${Math.round(emails).toLocaleString('en-AU')}/month)`, emails <= 3000 ? 0 : emails <= 50000 ? 20 : (emails * 0.10) / 1000]);
  items.push(['Static site (Cloudflare Pages Free) and captcha (Turnstile, free)', 0]);
  return { people, plan, items, usd: items.reduce((s, [, v]) => s + v, 0) };
}

export const SCALES = [
  { people: 100, plan: 'free', label: '100 (beta, Free plan)' },
  { people: 100, plan: 'pro', label: '100 (beta, Pro plan)' },
  { people: 1000, plan: 'pro', label: '1,000' },
  { people: 10000, plan: 'pro', label: '10,000' },
  { people: 100000, plan: 'pro', label: '100,000' },
];

const fmt = (n) => (n < 1 && n > 0 ? n.toFixed(2) : Math.round(n).toLocaleString('en-AU'));
export function table({ realtime = false } = {}) {
  const scales = SCALES.map((s) => ({ ...monthly(s.people, { realtime, plan: s.plan }), label: s.label }));
  const head = '| Active people | US$/month | A$/month (before GST and card fees) | A$/month all-in | A$/year all-in |\n|---|---:|---:|---:|---:|';
  const rows = scales.map((s) => `| ${s.label} | ${fmt(s.usd)} | ${fmt(aud(s.usd))} | ${fmt(aud(s.usd) * ALL_IN)} | ${fmt(aud(s.usd) * ALL_IN * 12)} |`);
  const detail = scales.filter((s) => s.usd > 0).map((s) => `\n**${s.label}**\n\n| Item | US$/month | A$/month |\n|---|---:|---:|\n${s.items.filter(([, v]) => v > 0).map(([k, v]) => `| ${k} | ${fmt(v)} | ${fmt(aud(v))} |`).join('\n')}`).join('\n');
  return { head, rows, detail, scales };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  for (const realtime of [false, true]) {
    const t = table({ realtime });
    console.log(`\n### ${realtime ? 'After switching to Realtime (about 85% fewer calls, plus Realtime messages)' : 'As built (polling every 20 s)'}\n\n${t.head}\n${t.rows.join('\n')}`);
    console.log(t.detail);
  }
  console.log(`\nFree plan, as built: 100 people fit (${overFree(100).join(', ') || 'no quota passed'}); 1,000 people pass ${overFree(1000).join(', ')}.`);
  console.log(`Free plan, with Realtime: 1,000 people pass ${overFree(1000, { realtime: true }).join(', ') || 'no quota'}.`);
}
