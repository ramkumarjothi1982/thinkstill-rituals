# Hushmates · Monthly cost forecast (AUD)

A forecast, not a quote. Nothing here has been bought or switched on. Every
paid item below needs the owner's approval first.

**Exchange rate.** A$1.45 per US$1, from AUD/USD ≈ 0.69 in early October 2026
([exchange-rates.org](https://www.exchange-rates.org/exchange-rate-history/aud-usd-2026-10-01)).
Card fees and GST on foreign services are not included; allow about 10–15% on top.

**Prices.** These are Supabase's published prices as reported by third-party
pricing guides in 2026 ([makerkit](https://makerkit.dev/blog/saas/supabase-pricing),
[jetadmin](https://www.jetadmin.io/blog/supabase-pricing-2026-guide-to-plans-limits-and-real-world-costs/),
[toolradar](https://toolradar.com/blog/supabase-pricing-2026)). From this container
I couldn't open supabase.com/pricing itself, so **check every figure there
before deciding**. The figures:

- Pro: US$25 a month, which includes a US$10 compute credit (enough for a Micro instance).
- Included each month: 100,000 MAU, 8 GB of database and 250 GB of egress.
- Edge Function invocations: 2 million included, then US$2 per million.
- Overage: MAU about US$0.00325 each, egress US$0.09 per GB, database US$0.125 per GB.
- Compute per month: Micro about US$10, Small about US$15, Medium about US$60, Large about US$110, XL about US$210, 2XL about US$410.

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

The web pages (the app and the desk) are static files. A free static host
(for example, a new Cloudflare Pages project) serves them for A$0. That is a
new project, not a change to the existing production Cloudflare setup, and it
still needs the owner's account.

## The forecast

|  | 100 people | 1,000 | 10,000 | 100,000 |
|---|---:|---:|---:|---:|
| **Fixed** |  |  |  |  |
| Supabase Pro plan (US$25) | 36 | 36 | 36 | 36 |
| Static web host, captcha (Cloudflare Turnstile), error tracking (free tiers) | 0 | 0 | 0 | 0 |
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
| Mallow perspectives from Another Angle | 160 calls → 10 | 1,000 → 60 | 6,000 → 360 | 40,000 → 2,400 |
| **With AI** | **≈ A$46** | **≈ A$104** | **≈ A$675** | **≈ A$3,325–3,720** |

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
  - Defaults (`hushmates.settings 'ai'`): cap A$0, 3 a day per person, 200 a day overall.
  - So with the defaults, AI spending is capped at about A$360 a month whatever the size.
  - The 100,000 column assumes the owner raises the daily ceiling.
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
4. Before turning AI on, confirm the per-call cost with the Another Angle service owner. If the cap must hold even in its worst case, set the estimate to A$0.48.
