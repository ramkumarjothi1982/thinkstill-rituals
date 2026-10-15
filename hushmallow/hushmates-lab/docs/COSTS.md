# Hushmates · Costs (AUD): staging, the beta, and 100 to 100,000 people

A forecast, not a quote. **Nothing has been bought, and no paid plan or service is
switched on.**
- Supabase Pro isn't activated.
- No AI, email provider or professional service is paid for.

Every paid item needs the owner's approval first (`DECISIONS.md`).

**Where the numbers come from:**
- **Supabase:** its own published plan data. That's `packages/shared-data/plans.ts` and `pricing.ts` in the supabase/supabase repository, which supabase.com/pricing is built from, plus its billing and cost-control docs, all read on 15 October 2026 (high confidence).
- **Cloudflare:** the Pages and Workers docs (high).
- **Email providers:** search extracts of their pricing pages (medium).
- **The arithmetic** is in `tools/cost-model.mjs`, pinned by `tests/cost-model.test.mjs`. Re-run it when a price or an assumption changes.

**Exchange rate and fees:**
- RBA 4 pm rate on 14 October 2026: **US$0.7002 per A$1**, so US$1 ≈ A$1.428.
- Supabase bills in US dollars, by card, and payments may show as coming from Singapore.
- "All-in" adds 10% GST and a typical 3% card foreign-transaction fee. Both may not apply:
  - It isn't confirmed that Supabase charges Australian GST. It began adding local taxes in May–June 2026, only where it is registered.
  - A GST-registered business that gives its ABN usually self-assesses instead.
  - Some cards charge no foreign fee.

## 1. Staging: A$0

| Piece | Plan | Cost | What happens at a limit |
|---|---|---|---|
| Supabase, in its **own organisation and account** (Sydney) | Free | **A$0**. Supabase says a Free organisation is never charged | It doesn't bill: it restricts. Over a quota, Supabase emails, gives a grace period, then may pause projects, make databases read-only or answer 402. The database goes read-only above 500 MB |
| The web app and the desk | Cloudflare Pages Free, in a separate account | **A$0**. Requests for static files are free and unlimited | 500 builds a month; we upload ready-made files instead of building. Hushmates' site has no Pages Functions, so the Workers request quota never applies |
| Sign-in emails for the team | Supabase's built-in sender | **A$0** | Team members only, about 2 an hour. Not for outside testers |
| AI | Off | **A$0** | The database refuses any AI call while it is off; the cap is A$0 |

Staging test runs use a few hundred calls and a few MB, against quotas of 500,000 calls,
5 GB of egress and 500 MB of database a month.

The separate account matters for cost as well as safety:
- Supabase allows 2 active Free projects per person, counted across every organisation they administer.
- Free-plan restrictions apply to a whole organisation.

## 2. The model: monthly and annual cost by scale

### Assumptions (per active person, per month)

| What | Assumption | Why |
|---|---|---|
| Feelings released | 4 | A reflective app, used a few times a week at most |
| Gateway calls (Edge Function invocations) | about 1,300 | Mostly polling: about 6 calls a minute while the app is visible, 10 minutes a day, 20 days. The other ~100 are actions |
| API egress | about 7 MB | About 5 KB per call |
| Stored data | about 100 KB at steady state | Encrypted words, events and indexes. Unsaved feelings are cleared after 30 days |
| Sign-in emails | about 1.5 | A code only on a new device or after signing out |
| With Realtime instead of polling | 15% of the calls, plus about 300 change notices; 5% of people connected at the busiest moment | Notices replace most polling |
| Compute | Micro at 100 (covered by the credit), Small at 1,000, Medium at 10,000, 2XL at 100,000 | The least certain line: a staging load test should size it |
| Point-in-time recovery | From 10,000 people | Daily backups are enough before that |

### As built (polling every 20 seconds)

| Active people | US$/month | A$/month (before GST and card fees) | A$/month all-in | A$/year all-in |
|---|---:|---:|---:|---:|
| 100 (beta, Free plan) | 0 | 0 | 0 | 0 |
| 100 (beta, Pro plan) | 25 | 36 | 40 | 485 |
| 1,000 | 30 | 43 | 49 | 583 |
| 10,000 | 217 | 310 | 351 | 4,214 |
| 100,000 | 837 | 1,195 | 1,354 | 16,247 |

| Item (US$/month) | 100 Pro | 1,000 | 10,000 | 100,000 |
|---|---:|---:|---:|---:|
| Supabase Pro plan (includes a US$10 compute credit) | 25 | 25 | 25 | 25 |
| Compute beyond the credit | 0 (Micro) | 5 (Small) | 50 (Medium) | 400 (2XL) |
| Edge Function calls beyond 2 million (US$2 per started million) | 0 | 0 | 22 | 256 |
| Egress beyond 250 GB (US$0.09/GB) | 0 | 0 | 0 | 41 |
| Database beyond 8 GB (US$0.125/GB) | 0 | 0 | 0 | 0.25 |
| Monthly active users beyond 100,000 | 0 | 0 | 0 | 0 |
| Point-in-time recovery, 7 days | – | – | 100 | 100 |
| Sign-in emails | 0 (free tier) | 0 (free tier) | 20 (e.g. Resend Pro) | 15 (e.g. Amazon SES) |
| Static site, captcha (Cloudflare Pages, Turnstile) | 0 | 0 | 0 | 0 |

### After switching to Realtime change notices

| Active people | US$/month | A$/month (before GST and card fees) | A$/month all-in | A$/year all-in |
|---|---:|---:|---:|---:|
| 100 (beta, Free plan) | 0 | 0 | 0 | 0 |
| 100 (beta, Pro plan) | 25 | 36 | 40 | 485 |
| 1,000 | 30 | 43 | 49 | 583 |
| 10,000 | 195 | 278 | 316 | 3,786 |
| 100,000 | 689 | 984 | 1,114 | 13,374 |

At 100,000 people, Realtime cuts calls from 130 million to 19.5 million a month, and adds:
- about 30 million messages (US$62.50 beyond the 5 million included);
- about 5,000 peak connections (US$50 beyond the 500 included).

### Reading it

- **The beta (about 100 people) fits the Free plan's quotas** (`overFree(100)` is empty). The choice between Free and Pro is about safety of data, not capacity (decision D3):
  - **Free: A$0.** No automatic backups: a weekly `pg_dump` and the recovery drill instead (`STAGING.md` part 11). It may pause after a week of low activity. Daily use by 100 people makes that unlikely, but a quiet week can still trigger it.
  - **Pro: A$35.70 a month, about A$40 all-in (A$485 a year).** Daily backups kept 7 days, and it never pauses.
  - Recommendation unchanged: Pro once people outside the team rely on it. **Not activated**: that is D3.
- **1,000 people pass the Free plan's call and egress quotas as built.** With Realtime they would fit, but Pro is still the right plan by then.
- **Polling is the biggest variable cost.** Realtime is worth doing before about 10,000 people. It saves about A$35 a month at 10,000 and about A$240 at 100,000 (all-in).
- **Compute at 100,000 is the least certain line.** A staging load test should size it before it matters.
- **Fixed costs:** only the Pro plan fee, and point-in-time recovery once chosen. Everything else grows with use.

### AI (off; only if the owner turns it on)

- **Defaults:** `hushmates.settings 'ai'` is off, with a monthly cap of A$0, 3 a day per person and 200 a day overall.
- **Cost per Mallow perspective:** about **A$0.06**. Another Angle's own figures are about US$0.04 for a regenerated call, × 1.428.
- **What the AI fallback would add, if switched on:**

  | People | Calls a month | A$ a month |
  |---:|---:|---:|
  | 100 | 160 | ≈ 10 |
  | 1,000 | 1,000 | ≈ 60 |
  | 10,000 | 6,000 | ≈ 360 |
  | 100,000 | 40,000 | ≈ 2,400 |

  That assumes the fallback rate falls with scale, from 40% to 10% of feelings. The upper bound, a Mallow perspective on every feeling, is about 10 times that.
- The 200-a-day ceiling allows about 6,000 calls a month (≈ A$370).
- **Who pays:** Another Angle's calls are billed to the account that runs Another Angle.
- **Turning it on needs, in order:** confirmation of the cost; Another Angle's owner; consent wording naming the provider (APP 8); then the switch (D10).

## 3. One-off reviews

Nothing is authorised. `REVIEWS.md` has the reasoning, the scope and the arithmetic.

| Review | Indicative cost | When |
|---|---|---|
| Tier 0: free self-assessments (eSafety, NSQDMH, guideline mapping, WHS assessment) | **A$0**. Optional moderator training is about A$40 + tax a person | Now |
| Tier A: one psychologist or AMHSW, about 5–6 hours | **A$1,650–2,040 excl. GST**; up to about A$3,109 incl. GST at an organisational rate. A leaner 4–5 hour version: A$1,320–1,700 | Before testers outside the team |
| Tier B: one clinician for 8–12 hours, plus a lived-experience reviewer | A$2,750–4,680 excl. GST | On a trigger (`REVIEWS.md` §5.4) |
| Tier C: the original two-clinician validation, plus a lived-experience panel | A$7,275–11,400 excl. GST | Before measured safety claims |
| Privacy, legal, accessibility, penetration test | **Not researched.** The old A$3,000–20,000 placeholders are withdrawn. Each starts with a free self-run step (`REVIEWS.md` §4) | Before a public launch |

## 4. Charges that could surprise you

**On Free:** none of these can be switched on, and nothing is ever billed.

**On Pro, the Spend Cap** is on by default. It blocks overage on:
- egress;
- Edge Function calls;
- monthly active users;
- disk;
- Realtime;
- storage;
- logs.

It does **not** cover the items below, which are billed hourly whenever they are switched on:

| Add-on | Price (US$) | All-in (A$/month) | Needed by Hushmates? | How it's prevented |
|---|---|---:|---|---|
| Compute above Micro | Small +5; Medium +50; Large +100; 2XL +400 a month | 8–647 | Only at scale | Changed only by hand, with D3-style approval. Changing size also causes downtime |
| An **extra project** in a Pro organisation | about +10 a month each | 16 | **No.** Staging stays in its own Free organisation | Never create projects in the paid organisation for testing |
| Point-in-time recovery | about 100 a month (7 days), and it needs Small compute | about 170 | From about 10,000 people | Off unless approved |
| Custom domain | about 10 a month | 16 | No (use `<ref>.supabase.co`) | Off |
| IPv4 add-on | about 4 a month | 6.47 | **No.** The tools and the app connect through the pooler or HTTPS, which work over IPv4 already | Off |
| Read replicas | at least 10 a month each, plus disk | 16+ | No | Off |
| Branching (preview branches) | about 0.01344 an hour per branch | 16 per always-on branch | No | Off; there's no GitHub integration |
| Log drains | about 60 a month per drain | 97 | No | Off |
| Phone MFA | about 75 a month | 121 | No (sign-in is by email code) | Off |
| Pipelines (replication) | per hour, plus per GB | varies | No | Off |

Other places a bill could start:

| Provider | How it could start billing | Prevention |
|---|---|---|
| Cloudflare | Subscribing to **Workers Paid** (US$5 a month minimum); adding **R2** (it needs a checkout) | Neither is used. Static Pages hosting is free. Don't press *Enable* on any paid plan |
| Email | Resend Pro (US$20 a month); turning on Resend's overage (off by default, capped at 5 × the quota); Amazon SES (billed per email; its free tier closed to new customers on 21 July 2026) | Free tiers stop sending at their cap rather than billing: Resend 100 a day, Brevo 300 a day. A provider is decision D5 |
| A Supabase invoice left unpaid | Projects pause and the organisation drops to Free | Use a card that is checked monthly |
| Card fees | About 3% foreign-transaction fee | A card without foreign fees |

## 5. Stopping runaway usage

**Built into Hushmates (works on any plan):**
- **Invitations only:** nobody can sign up without one. Codes are limited per email, and guesses per person and per network.
- **Per-person limits**, in `settings 'limits'`, on:
  - releases;
  - finds;
  - perspectives;
  - reports;
  - Mallow fallbacks;
  - requests a minute.
- The Mallow's own daily allowance: 500 a day overall, 5 per person.
- **AI off, with a cap of A$0.** The budget is held atomically in the database (`ai_reserve`, under a lock), so no number of Edge Function instances can overspend it. Every attempt is recorded with its cost, and an unsure outcome is charged, never assumed free.
- **Scheduled work runs once a minute, in one place:** homecoming, expiry and Mallow preparation, batched, and safe to overlap.
- **Data stays small:**
  - unsaved feelings are cleared after 30 days;
  - report evidence after 90 or 180 days;
  - old rate-limit events are deleted.
- **Polling pauses when the app is hidden:** it only polls while visible.

**On the platforms:**
- **Supabase Free:** cannot bill.
- **Supabase Pro:** keep the **Spend Cap on**. Supabase sends no budget alerts: it can't notify you at a spending threshold. So, once a week:
  - look at the organisation's *Usage* page and the *Upcoming invoice*;
  - run `node server/admin.mjs ops`: daily counts of the expensive operations, AI spend this month, members, travelling feelings and open reports.
- **Cloudflare:** no paid product is enabled. The site has no Functions, so no request can be billed.
- **Email:** free tiers stop rather than bill.
- **Staging tools:** they refuse to run if they see AI settings, or if the access token can reach any project that isn't staging (`tools/staging-deploy.mjs`).

## 6. What would change the forecast

1. **Realtime change notices instead of polling.** About 85% fewer calls; saves about A$240 a month at 100,000.
2. **A load test on staging,** to size compute for 10,000+ people.
3. **The beta's plan (D3) and the email provider (D5),** decided with the owner.
4. **Before turning AI on:** confirm the per-call cost with Another Angle's owner. For a cap that must hold even in the worst case, set the estimate to A$0.48: `node server/admin.mjs set ai '{"costPerCallAud": 0.48}'`.
