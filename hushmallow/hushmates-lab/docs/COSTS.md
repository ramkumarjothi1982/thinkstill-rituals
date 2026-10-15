# Hushmates · Monthly cost forecast (AUD)

A forecast, not a quote. Nothing here has been bought or switched on. Every
paid item below needs the owner's approval first.

**Exchange rate.** A$1.45 per US$1, from AUD/USD ≈ 0.69 in early October 2026
([exchange-rates.org](https://www.exchange-rates.org/exchange-rate-history/aud-usd-2026-10-01)).
Card fees and GST on foreign services are not included; allow about 10–15% on top.

**Prices.** Phase 3 confirmed these against Supabase's own published plan data:
`packages/shared-data/plans.ts` and `pricing.ts` in the supabase/supabase
repository, which supabase.com/pricing is built from, read on 15 October 2026.
Prices change; glance at supabase.com/pricing before deciding. The figures:

- Pro: US$25 a month, which includes a US$10 compute credit (enough for a Micro instance).
- Included each month: 100,000 MAU, 8 GB of database and 250 GB of egress.
- Edge Function invocations: 2 million included, then US$2 per million.
- Overage: MAU about US$0.00325 each, egress US$0.09 per GB, database US$0.125 per GB.
- Compute per month: Micro about US$10, Small about US$15, Medium about US$60, Large about US$110, XL about US$210, 2XL about US$410.

## Staging and the private beta: what it costs to start

| | Free plan | Pro plan |
|---|---|---|
| Price | **A$0** | **≈ A$36 a month** (US$25, including a US$10 compute credit that covers the smallest instance) |
| Limits that matter | 500 MB database; 50,000 monthly active users; 500,000 Edge Function calls a month; 5 GB egress; at most 2 active free projects | 8 GB database; 100,000 MAU; 2 million calls; 250 GB egress |
| **Pauses** | **After one week without use.** While paused nothing runs: feelings don't come home and the scheduler stops, until someone resumes the project | Never |
| **Backups** | **None.** You make your own: `pg_dump`, then the recovery drill (`STAGING.md` part 11) | Daily, kept 7 days, restorable from the dashboard |

Recommendations:
- **Staging: Free, A$0.** Use is occasional, pausing is harmless, and its data is test data.
- **A beta with real people: Pro, ≈ A$36 a month (🛑 decision D3).** People's words and the safety desk's evidence deserve backups. A feeling waiting to come home shouldn't depend on someone visiting that week.
- If Free must be used for the beta: a weekly `pg_dump` plus the recovery drill, and someone checks the project isn't paused.
- About 100 people use roughly 0.13 million function calls and a few MB a month: far inside either plan.

Emails for testers outside your team need a provider (decision D5). The free tiers below cover the beta: **A$0**.

Crisis detection adds **A$0** in services (`CRISIS_DETECTION.md`): rules, and later Supabase's built-in embedding model, which isn't charged separately.

### One-off costs before a public launch (indicative)

These are planning placeholders, not researched quotes: get quotes. They are listed because launch depends on them (`READINESS.md` §6).

| Review | Indicative range (A$) |
|---|---|
| Clinical safety review: two clinicians label the phrasing sheet, agree thresholds, review the support wording and the escalation procedure (20–30 hours) | 5,000–9,000 |
| Privacy and legal: privacy policy and collection notice, terms, Privacy Impact Assessment, Online Safety Act and age-assurance advice | 8,000–20,000 |
| Accessibility audit (WCAG 2.2 AA, with screen readers by hand) | 3,000–8,000 |
| Security penetration test | 8,000–20,000 |

## Assumptions (per active person, per month)

| What | Assumption | Why |
|---|---|---|
| Feelings released | 4 | A reflective app, used a few times a week at most |
| Perspectives written | 4–6 | Each feeling can receive up to five |
| Time with the app open | 10 minutes a day, 20 days | |
| Gateway calls (Edge Function invocations) | about 1,300 | Most come from polling: about 6 calls a minute while the app is visible (two refreshes every 20 s), about 1,200 a month. The other ~100 are actions |
| API egress | about 7 MB | About 5 KB per call |
| Stored data | about 100 KB at steady state | Encrypted words, events and indexes. Unsaved feelings are cleared after 30 days |
| Sign-in emails | about 1.5 | A code only on a new device or after signing out; refresh tokens keep people signed in |
| Mallow fallback (when nobody replies within 30 minutes) | 40% of feelings at 100 people, 25% at 1,000, 15% at 10,000, 10% at 100,000 | More people, more catchers |
| "Explore another angle" (asked for on a feeling that came home without a Mallow perspective) | 10% of those feelings | An extra the author chooses. At most one Mallow perspective per feeling, either way |

The web pages (the app and the desk) are static files. A free static host
(for example, a new Cloudflare Pages project) serves them for A$0. That is a
new project, not a change to the existing production Cloudflare setup, and it
still needs the owner's account.

## The forecast

|  | 100 people | 1,000 | 10,000 | 100,000 |
|---|---:|---:|---:|---:|
| **Fixed** |  |  |  |  |
| Supabase Pro plan (US$25) | 36 | 36 | 36 | 36 |
| Static web host, captcha (Cloudflare Turnstile, once built), error tracking (free tiers) | 0 | 0 | 0 | 0 |
| **Variable** |  |  |  |  |
| Compute beyond the credit | 0 (Micro) | 7 (Small) | 73 (Medium) | 290–580 (XL–2XL) |
| Edge Function calls | 0 (0.13 M) | 0 (1.3 M) | 32 (13 M) | 371 (130 M) |
| Database size beyond 8 GB | 0 | 0 | 0 | 1 |
| Egress beyond 250 GB | 0 | 0 | 0 | 59 |
| Monthly active users beyond 100,000 | 0 | 0 | 0 | 0 |
| Sign-in emails (custom SMTP; see below) | 0 (free tier) | 0 (free tier) | 29 | 22–130 |
| Point-in-time recovery (recommended from 10,000) | – | – | 145 | 145 |
| **Without AI** | **≈ A$36** | **≈ A$44** | **≈ A$315** | **≈ A$925–1,320** |
| **AI (only if the owner turns it on)** |  |  |  |  |
| Mallow perspectives from Another Angle: the fallback | 160 calls → 10 | 1,000 → 60 | 6,000 → 360 | 40,000 → 2,400 |
| …and "Explore another angle" | 24 → 1 | 300 → 18 | 3,400 → 204 | 36,000 → 2,160 |
| **With AI** | **≈ A$47** | **≈ A$122** | **≈ A$880** | **≈ A$5,485–5,880** |
| Upper bound for AI, if every feeling gets a Mallow perspective | 400 → 24 | 4,000 → 240 | 40,000 → 2,400 | 400,000 → 24,000 |

All amounts are A$ per month, rounded. Ranges show the realistic spread.

### Reading it

- **Fixed vs variable.** The only fixed cost is the Supabase Pro plan. A
  staging project can stay on Supabase's **free plan (A$0)**. Free projects
  pause after a week without use and have lower quotas, which is fine for
  testing. Everything else grows with use.
- **The biggest variable cost is polling.** The app asks for changes every
  20 seconds while it is open. At 100,000 people that is about 130 million
  calls a month (≈ A$371), plus the compute to answer them. Moving to Supabase
  Realtime for change notices would remove most of those calls, which is
  worth doing before 10,000 people.
- **Compute at 100,000** is the least certain line. It depends on how many
  people are active at the same moment (I assumed up to about 5%, roughly 500
  calls a second at peak). Load-test on staging before choosing.
- **AI is A$0 until the owner switches it on.** When it is on, each Mallow
  perspective is estimated at A$0.06. That is the "regenerated" figure: an
  Another Angle call is about US$0.02 typical and about US$0.04 regenerated
  (the service's own figures), × 1.45. The database refuses any AI call that
  would pass the monthly cap.
  - Defaults (`hushmates.settings 'ai'`): off, a monthly cap of A$0, 3 a day per person, 200 a day overall.
  - With the defaults AI costs A$0. Once it's on, `monthlyCapAud` is the only money cap, and it counts estimated costs (the actual bill comes from Another Angle's account).
  - The 200-a-day ceiling allows about 6,000 calls a month (≈ A$370 at the A$0.06 estimate). The 10,000 and 100,000 columns assume the owner raises it.
  - The Mallow's own daily allowance (`settings 'limits'`: `fallbackGlobalPerDay` 500, `fallbackPerPersonPerDay` 5) applies to the free library too. 500 a day is about 15,000 Mallow perspectives a month: raise it before about 15,000 people, or people who allowed a Mallow perspective are told the Mallows are resting for today.
- **Who pays for AI.** Another Angle's model calls are billed to the account
  that runs the Another Angle service, so Hushmates traffic adds to that bill.
- **Sign-in emails.** Supabase's built-in email sender is for testing only.
  Real people need a custom SMTP provider:
  - Free tiers (for example, Resend: 3,000 emails a month) cover up to roughly 1,000 people.
  - Above that it is a paid plan. Resend is about US$20 a month for 50,000 emails; Amazon SES is about US$0.10 per 1,000.
  - **Choosing and switching on a provider needs the owner's approval** (and their account).

## What keeps costs down (already built)

- **The Mallow library is free and deterministic.** It answers whenever AI is off, unavailable, rate-limited, over budget or unsafe.
- **The AI budget is held atomically** in the database (`hushmates_api.ai_reserve`, under a lock), so several Edge Function instances can never overspend a cap. Every attempt is recorded in `ai_usage` with its cost. Unsure outcomes are charged, never assumed free.
- **AI answers are cached** per person for an hour. Asking twice for one feeling makes one generation.
- **Per-person limits** (in `settings 'limits'`) on releases, finds, perspectives, reports, Mallow fallbacks and requests a minute. Sign-in codes are limited per email, and invitation guesses per person and per network.
- **Expensive work runs once a minute in one place**: homecoming, expiry and Mallow preparation, in batches, safe to overlap.
- **Monitoring.** `node server/admin.mjs ops` shows what the service did and spent: daily counts of expensive operations, AI spend this month, members, travelling feelings and open reports.
- **Data stays small.** Words are cleared after the retention period (30 days for unsaved feelings), and old rate-limit events are deleted.

## Next steps that change the forecast

1. Realtime change notices instead of polling (−80–90% of calls).
2. A load test on staging, to size compute for 10,000+ people.
3. A decision on the email provider, with the owner.
4. Before turning AI on, confirm the per-call cost with the Another Angle service owner. If the cap must hold even in its worst case, set the estimate to A$0.48: `node server/admin.mjs set ai '{"costPerCallAud": 0.48}'`. The hold uses the larger of this setting and the Edge Function's optional `ANOTHER_ANGLE_COST_PER_CALL_AUD` secret.
