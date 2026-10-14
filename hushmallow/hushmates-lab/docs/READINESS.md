# Hushmates · Production readiness

Where the private beta stands, and what must happen before real people use it.
Production launch stays subject to the owner's explicit final approval.

Legend: ✅ done and tested locally · 🟡 built, not yet proven on Supabase ·
⬜ to do · ⚖️ needs Australian legal or privacy review · 🩺 needs clinical safety review.
💰 means it costs money and needs the owner's approval.

## 1. Must be true before any real person signs in

### Backend and data
- ✅ Every rule lives in Postgres functions, in transactions with row locks. Constraints make these impossible, even under races:
  - more than five people;
  - duplicate writes;
  - two live holds per person;
  - two Mallow generations;
  - a release without consent.

  Tested: differential against the reference engine (8 seeds × 300 steps), seven race tests, and the database access test.
- ✅ RLS is on every table, with no grants. Browsers (anon, authenticated) can read, write and call nothing, and even the service role reaches only `hushmates_api`. Tested role by role.
- ✅ Words are encrypted by the Edge Function (AES-256-GCM) before they reach the database. The database never sees a feeling in the clear (tested).
- 🟡 The Edge Function on Deno, and its way to the database through PostgREST (`postgrest-db.js`). The same code runs under Node in every test. Deno and real PostgREST are only exercised on staging (`STAGING.md` step 6).
- 🟡 Scheduled jobs on Supabase (pg_cron → pg_net → `/jobs/tick`). Locally, the dev stack runs the same job every 15 s, and race tests prove overlapping runs are safe.
- ⬜ Backups: Supabase Pro keeps daily backups (7 days).
  - 💰 Point-in-time recovery from about 10,000 people.
  - ⬜ Test a restore on staging.
- ⬜ Key custody. The data key (`HUSHMATES_DATA_KEYS`) and the MAC key:
  - decide who holds them (two people, in a password manager);
  - write the rotation steps down and test them on staging.

  Losing the data key loses every stored feeling.

### Sign-in and accounts
- ✅ Passwordless email code, invitation, 18+ confirmation. Invitations are hashed, use-limited, expiring and revocable. Wrong guesses are limited per person (10 an hour) and per network (30 an hour), and the network can't be faked with a header (tested).
- ✅ The same email on a new device reaches the same account and everything in it (tested). No usernames or passwords.
- ✅ Identities are `(issuer, subject)` linked to a member. The main Hushmallow login can later be added as a second issuer, without a second account. It is not connected now: production Hushmallow auth is untouched.
- 🟡 Supabase Auth itself (GoTrue). Locally, an emulator with the same endpoints is used (`server/auth-emulator.mjs`, local-only by design). Real Supabase Auth differs in details: rate limits, error codes, and email templates (the code must be put in the template, step 5).
- ⬜ 💰 A custom SMTP provider for sign-in emails to people outside the team. Configure SPF, DKIM and DMARC on the sending domain.
- ⬜ Bot protection on code requests: Cloudflare Turnstile is free, and the client already accepts a captcha token (🛑 a site key from the owner).
- ⚠️ After someone deletes their data, an access token they already hold stays cryptographically valid until it expires (at most 1 hour). It leads to nothing that was theirs (tested). Shorten the JWT expiry in Supabase if that matters.

### Safety and moderation
- ✅ Words that suggest someone may not be safe are answered with support. They are never circulated, stored or sent to any AI. The screening is rules-based: a floor, not a guarantee, and the app says so.
- ✅ The crisis lines are Australian: 000, Lifeline 13 11 14, Suicide Call Back Service, 13YARN, 1800RESPECT, Beyond Blue. They appear on the support screen and under "Get support now". 🩺 Check the wording and the numbers before launch.
- ✅ Reporting, automatic pausing after reports, blocking (nobody learns of it), and withdrawal.
- ✅ The safety desk at `/staff/`:
  - It is for moderators only, enforced server-side.
  - It records every report opened and every decision in the activity log, and logs out after 30 minutes idle.
  - It shows earlier reports about the same person without naming them.
  - It offers urgent guidance for Australia. 🩺⚖️ Review that guidance.
- ⬜ 🩺 A written escalation procedure for "someone may be in danger":
  - Hushmates is pseudonymous and the desk can't contact anyone.
  - Decide what the team does, within which hours, and who is on call.
  - Decide whether the person who wrote a flagged feeling should be shown support on their next visit. That's a product decision, not built.
- ⬜ Moderator wellbeing (psychosocial hazards under WHS law ⚖️): rotation, debriefs and access to support.
- ⬜ The library's ~110 new Mallow lines and 49 openers. 🩺 Review them for tone and safety. They were written to avoid diagnosis, certainty, forced positivity and claims about other people's minds, and each one is tested against the same screen as a person's perspective.

### Privacy and consent
- ✅ Consent is explicit before a feeling travels, and separately for the Mallow fallback. The app and the export say who can receive or process what.
- ✅ Download my data (a human summary plus a file) and delete my data: the account, words and sign-in are gone, and nobody else's data is touched (tested).
- ✅ Retention: unsaved feelings are cleared 30 days after they come home, resolved report evidence after 90 days, the audit log after 365 days, and rate-limit events after 48 hours. All of this is configurable.
- ✅ Hushmates never claims absolute anonymity. Pseudonymous is the word, because:
  - Supabase holds the email address;
  - moderators can read reported words;
  - whoever holds the data key could decrypt;
  - networks are kept only as keyed hashes, and only for rate limits.
- ⚖️ A privacy policy and a collection notice (APP 5) in plain English, before launch.
- ⚖️ AI stays off. Before turning it on, the consent wording must name the provider and that words go overseas (Another Angle → its model provider in the US): APP 8, cross-border disclosure.

### Web
- ✅ The customer app and the desk are built from exactly what they import, with comments stripped. The build scans out developer content and refuses secret keys. A strict CSP connects to the Supabase project only, and every response carries protective headers.
- ✅ The lab exists only on a development host, for a tester key. In production it has no address (tested).
- ⬜ 💰/🛑 A static host for staging and production (a new project, not the production Cloudflare setup).

## 2. ⚖️ Australian legal and privacy review (before launch)

These are questions for a lawyer, not conclusions:

1. **Privacy Act 1988 and the APPs.**
   - Feelings can be *health information* (information about mental health), which is sensitive information.
   - Does the small-business exemption apply? It doesn't to anyone providing a health service.
   - Is Hushmates a health service?
   - What does that mean for consent (APP 3), notice (APP 5), use (APP 6), security (APP 11), and access and correction (APPs 12–13)?
2. **The Privacy and Other Legislation Amendment Act 2024.**
   - The statutory tort for serious invasions of privacy.
   - Disclosing automated decisions in the privacy policy (from December 2026). Automatic pausing after reports, and automated Mallow perspectives, may need describing.
3. **Online Safety Act 2021.**
   - Is Hushmates a *social media service* or a *relevant electronic service*?
   - Which industry codes or standards apply: reporting tools, response times, eSafety removal notices within 24 hours, Basic Online Safety Expectations?
4. **Social media minimum age (the Online Safety Amendment (Social Media Minimum Age) Act 2024).**
   - Hushmates enables social interaction between people. If it counts as an *age-restricted social media platform*, ticking "I'm 18 or over" may not be the "reasonable steps" the law expects.
   - Get advice before opening the beta.
5. **The Notifiable Data Breaches scheme.** A breach response plan: who assesses, who notifies the OAIC and the people affected.
6. **Therapeutic Goods (software as a medical device).** Keep Hushmates positioned as reflection and wellbeing, with no claims to diagnose, treat or prevent a condition. Have the wording checked.
7. **Australian Consumer Law.** What the app says about privacy, anonymity and benefits must be accurate (no "anonymous", no "safe" guarantees).
8. **Terms of use and community guidelines** that moderators can apply, and a way to appeal a restriction.
9. **Contracts with providers** (data processing terms, where data is stored):
   - Supabase (Sydney region);
   - the email provider;
   - Another Angle's provider, if AI is ever turned on.

## 3. 🩺 Clinical safety review (before launch)

- The support screen's wording, and which lines appear for which kind of concern (crisis, someone in danger, abuse and violence, harassment, other).
- The extra crisis rules Hushmates adds to the shared lexicon, and what they miss. Test with a clinician's list of phrasings.
- The escalation procedure (section 1) and the desk's urgent guidance.
- The Mallow library's lines.
- Whether to align with the National Safety and Quality Digital Mental Health Standards (ACSQHC).

## 4. Before scaling past the beta

- ⬜ Realtime change notices instead of polling, which cuts most of the cost at scale (`COSTS.md`).
- ⬜ A load test on staging, to size compute.
- ⬜ Monitoring and alerts. Use `node server/admin.mjs ops` today. Add error alerts on the Edge Function, a failing scheduler, AI spend near the cap, and open urgent reports.
- ⬜ An external penetration test.
- ⬜ Push or email notices when a feeling comes home. Today the app shows it on the next visit, because the server does all timed work while the app is closed. Adding notices would need a provider (💰, approval).

## 5. Limitations and what wasn't tested

Not tested, and why:

| Not tested | Why | What covers it instead |
|---|---|---|
| Real Supabase (Auth, PostgREST, pg_cron, pg_net, Vault, Edge runtime) | Needs the owner's account; nothing is deployed without approval | The same code against real Postgres 16, the local Auth emulator, and the gateway under Node; `STAGING.md` steps 6 and 10 check each piece |
| Deno | Not installed here | Web APIs only. The Mallow orchestration was also smoke-tested under Bun, a second runtime |
| Email delivery | No email provider may be switched on | Codes are printed by the local Auth emulator |
| A live Another Angle call | No billable AI calls | A local fake HTTP server for success, errors, timeouts and costs (33 tests) |
| Load at 10,000+ people | Needs staging | Race tests for correctness under concurrency |
| Screen readers, by hand | No assistive technology here | Labels, roles, live regions and focus order, checked in the browser tests |

Known limitations:
- Theme detection in the Mallow library uses keywords. It can misread wording no one tested, and it is English only.
- The AI cache and the in-flight generation guard are per Edge Function instance. The database still guarantees one Mallow perspective per feeling, and the budget hold is global.
- With the default limits, AI (if enabled) is capped at 200 calls a day overall.
- Moderators see an account only as a reference, never a name or an email. Lifting a restriction is an operator command (`server/admin.mjs member`), not a desk button.
