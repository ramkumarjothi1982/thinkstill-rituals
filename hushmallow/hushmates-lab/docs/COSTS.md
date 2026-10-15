# Hushmates · Costs (AUD): staging, the beta, and 100 to 100,000 people

A forecast, not a quote, and **not a maximum**: the bill follows real use, and §2.4
shows how it can run higher. **Nothing has been bought, and no paid plan or service is
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

`tools/cost-model.mjs` makes every table here; `tests/cost-model.test.mjs` checks the
arithmetic and that these tables are the ones it prints.

### 2.1 Assumptions, and how they were checked

Per **monthly active person** (someone who signs in or refreshes a session in the month), per month:

| What | Typical use | High use | Checked against |
|---|---|---|---|
| Time with the app open and in use | 10 minutes a day, 20 days | 30 minutes a day, every day | An assumption: a reflective app used a few times a week. High use is a deliberately heavy case |
| Gateway calls (Edge Function invocations) | about 1,300 | about 5,700 | The code: while in use the app asks for changes twice every 20 seconds (`client/functions-link.js`), about 6 calls a minute; plus about 100 actions (releasing, catching, writing, sharing) |
| Calls Supabase doesn't count | — | — | Signing in and refreshing a session go to Supabase Auth, not the function. A browser's CORS preflight (OPTIONS) isn't billed as an invocation (Supabase's usage docs) |
| API egress | about 7 MB | about 30 MB | About 5 KB per call |
| Stored data | about 100 KB | about 300 KB | Encrypted words, events and indexes. Unsaved feelings are cleared after 30 days |
| Sign-in emails | about 1.5 | about 3 | A code only on a new device or after signing out |
| Share using it on a given day | 35% | — | An assumption |
| Share using it at the busiest moment | 5% | 10% | An assumption. This sets compute, and Realtime connections later |
| Compute | Micro up to 10 people at once; Small to 100; Medium to 600; Large to 2,500; 2XL to 6,000; 4XL beyond | same | An assumption to replace with a staging load test |
| Point-in-time recovery | From 10,000 people | same | A recommendation, not a requirement |

### 2.2 Monthly active people are not people at once

| Monthly active | On a given day | At the busiest moment (typical) | (high use) | Calls a second then (typical) |
|---:|---:|---:|---:|---:|
| 100 | 35 | 5 | 10 | 0.5 |
| 1,000 | 350 | 50 | 100 | 5 |
| 10,000 | 3,500 | 500 | 1,000 | 50 |
| 100,000 | 35,000 | 5,000 | 10,000 | 500 |

"Calls a second" assumes about 6 calls a minute for each person using the app at that moment.
A busy evening could be several times the average, which is what compute must handle.

### 2.3 Typical and high use

**Typical use, as built (polling every 20 seconds while in use):**

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
| Point-in-time recovery, 7 days | – | – | 100 | 100 |
| Sign-in emails | 0 (free tier) | 0 (free tier) | 20 (e.g. Resend Pro) | 15 (e.g. Amazon SES) |
| Static site, captcha (Cloudflare Pages, Turnstile) | 0 | 0 | 0 | 0 |

**Typical use, after switching to Realtime change notices:**

| Active people | US$/month | A$/month (before GST and card fees) | A$/month all-in | A$/year all-in |
|---|---:|---:|---:|---:|
| 100 (beta, Free plan) | 0 | 0 | 0 | 0 |
| 100 (beta, Pro plan) | 25 | 36 | 40 | 485 |
| 1,000 | 30 | 43 | 49 | 583 |
| 10,000 | 195 | 278 | 316 | 3,786 |
| 100,000 | 689 | 984 | 1,114 | 13,374 |

**High use, as built:**

| Active people | US$/month | A$/month (before GST and card fees) | A$/month all-in | A$/year all-in |
|---|---:|---:|---:|---:|
| 100 (beta, Pro plan) | 25 | 36 | 40 | 485 |
| 1,000 | 38 | 54 | 61 | 738 |
| 10,000 | 360 | 513 | 582 | 6,981 |
| 100,000 | 2,491 | 3,558 | 4,031 | 48,373 |

**High use, after switching to Realtime:**

| Active people | US$/month | A$/month (before GST and card fees) | A$/month all-in | A$/year all-in |
|---|---:|---:|---:|---:|
| 100 (beta, Pro plan) | 25 | 36 | 40 | 485 |
| 1,000 | 30 | 43 | 49 | 583 |
| 10,000 | 279 | 398 | 451 | 5,417 |
| 100,000 | 1,614 | 2,306 | 2,612 | 31,346 |

### 2.4 Worst cases: what the projections don't bound

These come from *how* the service is used, not *how many* people use it. On Free nothing is
billed, but passing a quota can get the whole organisation restricted (paused, read-only, or
refused with errors). On Pro, the Spend Cap blocks overage on function calls: that also stops
the app, which is safer than an unbounded bill.

| Case | Function calls a month | On Pro, beyond what's included | What limits it |
|---|---:|---:|---|
| A browser tab left visible all month, **before** the idle back-off | 259,200 per tab | about US$0.52 per tab | Nothing. Two such tabs would pass half of Free's 500,000 |
| The same tab **with** the idle back-off (added in Phase 3b+, `client/functions-link.js`) | about 2,500 per tab | about US$0.01 | The app slows to every 2 minutes after 5 quiet minutes, rests after an hour, and catches up when touched. It runs in the browser, so a modified client can ignore it |
| One account scripted to call as fast as allowed (120 requests a minute, enforced in the database) | about 5.2 million | about US$10 | The per-person limit; invitations; restricting the account at the desk. Refused calls still count as calls |
| A flood of calls with no sign-in (anyone on the internet) | no fixed limit | US$20 per 10 million | Each is refused at once, but still counted. The Spend Cap turns this into an outage, not a bill. Supabase has no budget alerts; a weekly look at Usage is the check |
| AI | 0 | A$0 | Switched off, with a A$0 cap held in the database |

**For the beta:**
- With typical use, 100 people fit Free's quotas comfortably: about 130,000 calls a month against 500,000.
- With **high use** they wouldn't: about 570,000. So watch the Usage page weekly.
- The free fixes come before any upgrade:
  - the idle back-off, done;
  - if needed, a slower poll, for example every 30 seconds instead of 20.

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

## 5. Spending safeguards: which ones are enforced

| Safeguard | Enforced by | Strength |
|---|---|---|
| Staying on the Free plan | Supabase | **Enforced:** a Free organisation is never charged. Overuse restricts instead |
| Pro's Spend Cap, on by default (keep it on) | Supabase | **Enforced** for the usage items it covers (function calls, egress, MAU, disk, Realtime, storage, logs). **Not** for compute, PITR, custom domains, IPv4, log drains, branching, replicas, phone MFA (§4) |
| AI off, a A$0 monthly cap, an atomic budget hold | The database (`ai_reserve`) | **Enforced:** no number of function instances can overspend it |
| Invitations only; sign-in codes limited per email; invitation guesses limited per person and network | The database and Supabase Auth | **Enforced** |
| Per-person limits: releases, finds, perspectives, reports, Mallow fallbacks, 120 requests a minute | The database | **Enforced**, though refused requests still count as function calls |
| The Mallow's daily allowance (500 overall, 5 per person) | The database | **Enforced** |
| Retention: unsaved feelings after 30 days, report evidence after 90 or 180 days, rate events after 48 hours | The scheduler | **Enforced** while the scheduler runs |
| Polling only while the page is visible; the idle back-off | The app in the browser | **Advisory:** it saves most calls, but a modified client can ignore it |
| No paid Cloudflare products; the site has no Functions | Your Cloudflare account settings | **Enforced** by not subscribing: Pages static hosting is free |
| Email free tiers (Resend 100 a day; Brevo 300 a day) | The provider | **Enforced:** sending stops at the cap |
| A card with a low limit, or a virtual card, for Supabase | Your bank | **Enforced** by the bank. The cheapest hard ceiling on any surprise |
| A weekly look at Supabase's *Usage* page and *Upcoming invoice*, and `node server/admin.mjs ops` | You | **Manual.** Supabase can't alert at a spending threshold |
| The staging tools refuse AI settings, and any token or account that isn't staging-only | The tools | **Enforced** before they change anything |

**When to upgrade:** only for a clear technical or operational reason.
- **Before people outside the team rely on it:** Free has no automatic backups, and a project can pause after a quiet week. Losing testers' words would be a real harm.
- **When usage approaches a Free quota:** the Usage page shows it.

Neither applies to staging today. Pro stays off until you approve it (D3).

## 6. What would change the forecast

1. **Realtime change notices instead of polling.** About 85% fewer calls; saves about A$240 a month at 100,000.
2. **A load test on staging,** to size compute for 10,000+ people.
3. **The beta's plan (D3) and the email provider (D5),** decided with the owner.
4. **Before turning AI on:** confirm the per-call cost with Another Angle's owner. For a cap that must hold even in the worst case, set the estimate to A$0.48: `node server/admin.mjs set ai '{"costPerCallAud": 0.48}'`.
