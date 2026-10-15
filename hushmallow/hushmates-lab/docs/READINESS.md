# Hushmates · Production readiness

Where the private beta stands, and what must happen before real people use it.
Production launch stays subject to the owner's explicit final approval.

Legend: ✅ done and tested locally · 🟡 built, not yet proven on Supabase ·
⬜ to do · ⚖️ needs Australian legal or privacy review · 🩺 needs clinical safety review.
💰 means it costs money and needs the owner's approval. ⛔ OUTSTANDING: an independent
review that hasn't happened yet (§6).

Companion documents:
- `LAUNCH_READINESS.md`: technical, safety and legal readiness, separately, and the pass/fail record;
- `STAGING_CLOUD.md`: staging from the developer's cloud session (nothing on your computer);
- `STAGING.md`: the step-by-step staging set-up from your computer;
- `REVIEWS.md`: which reviews the law requires, and the smallest safe safety review;
- `DECISIONS.md`: what needs the owner;
- `RISKS.md`: the remaining risks;
- `CRISIS_DETECTION.md`: the safety screen's plan;
- `COSTS.md`: monthly and one-off costs.

## 0. Staging readiness checklist

Ready in the code (Phase 3, checked on this machine):
- ✅ **The real Edge Function entry point runs under Deno.** `index.ts` passes `deno check`, and the full browser E2E (81 checks) passes through it under Deno. It reaches the database over HTTP through a local stand-in for Supabase's PostgREST, which follows PostgREST's documented rules, so Postgres's own grants decide who may call what.
- ✅ **Both kinds of Supabase key work.** The new `sb_secret_`/`sb_publishable_` keys go in `apikey` only; legacy JWT keys are sent as they always were. Tested both ways.
- ✅ **The staging kit:**
  - `staging:preflight`: an offline checklist;
  - `staging:secrets`: private secrets, never printed;
  - `staging:site`: one folder for the static host;
  - `staging:check`: the real project checked from outside, cleaning up after itself;
  - `staging:drill`: a backup restored, and every word opened with the keys.

  The check and the drill are tested against the local stack. The check's scheduler watch is shown to fail when no scheduler runs.
- ✅ **The privacy audit's findings are fixed.**
  - A share picture re-checks with the server just before drawing, so a writer who stops sharing is never drawn.
  - Pictures carry no clue to a writer's Mallow.
  - A reported Mallow line is listed as a Mallow's at the desk.
  - Writers are told a picture already made can't be recalled.

Needs the owner, in order (`STAGING.md`):

| Step | Who | Status |
|---|---|---|
| D1 (✅ approved): a separate Supabase account and project (Free, Sydney), a separate free Cloudflare account and its Pages project (`STAGING_CLOUD.md` steps 1–3) | 🛑 owner | ⬜ |
| The four secrets in the environment's settings, and the four allowed domains (`STAGING_CLOUD.md` steps 4–5), or the computer route below | 🛑 owner | ⬜ |
| D4 (✅ approved): `staging:deploy`, `staging:check` and `staging:e2e` on the real project (`STAGING_CLOUD.md` step 7) | the developer's session | ⬜ |
| **Or, from your computer (`STAGING.md`):** | | |
| Secrets made on the owner's computer (`staging:secrets`) and kept in a password manager (D11) | 🛑 owner | ⬜ |
| Extensions, `db push`, exposed schema, the scheduler's Vault settings | 🛑 owner (guided) | ⬜ |
| Sign-in by email code: templates, OTP settings, Site URL | 🛑 owner (guided) | ⬜ |
| D4: deploy the Edge Function; publish `dist/site` | 🛑 owner approval | ⬜ |
| `staging:check` passes (0 failed) and its report is shared | owner runs it | ⬜ |
| The manual smoke test (`STAGING.md` part 10): both email templates send a code; a later sign-in works | owner, with two team members | ⬜ |
| A backup made and the recovery drill passed | owner | ⬜ |
| Before testers outside the team: D6a–D6d (Tier 0, then the Tier A review), D3 (Pro), D5 (email), D7a (privacy basics), D12 (who answers the desk) | 🛑 owner | ⬜ |

## 1. Must be true before any real person signs in

### Backend and data
- ✅ Every rule lives in Postgres functions, in transactions with row locks. Constraints make these impossible, even under races:
  - more than five people;
  - duplicate writes;
  - two live holds per person;
  - two Mallow generations;
  - a release without consent.

  Tested: differential against the reference engine (8 seeds × 300 steps), eight race tests, and the database access test.
- ✅ RLS is on every table, with no grants. Browsers (anon, authenticated) can read, write and call nothing, and even the service role reaches only `hushmates_api`. Tested role by role.
- ✅ Words are encrypted by the Edge Function (AES-256-GCM) before they reach the database. The database never sees a feeling in the clear (tested).
- ✅ The Edge Function on Deno, and its way to the database through PostgREST (`postgrest-db.js`). The real `index.ts` runs under Deno 2 against the local PostgREST stand-in, with the full browser E2E passing through it (`docs/evidence/e2e-edge-under-deno.json`). 🟡 Real PostgREST and the Supabase Edge runtime are proven by `staging:check`.
- 🟡 Scheduled jobs on Supabase (pg_cron → pg_net → `/jobs/tick`). Locally, the dev stack runs the same job, and race tests prove overlapping runs are safe. `staging:check` checks:
  - the jobs and Vault secrets are present;
  - the last runs succeeded;
  - the function answered them;
  - the platform's scheduler ends an offer that ran out with nobody else calling.
- ✅ Backups can be restored and read: `staging:drill` restores a `pg_dump` into a new database and opens every word with the keys (tested; wrong keys open nothing). ⬜ Supabase Pro keeps daily backups for 7 days (D3); 💰 point-in-time recovery from about 10,000 people.
- ⬜ Key custody (D11). The data key (`HUSHMATES_DATA_KEYS`) and the MAC key:
  - decide who holds them (two people, in a password manager);
  - write the rotation steps down and test them on staging.

  Losing the data key loses every stored feeling. `staging:check` confirms the saved keys are the deployed ones.

### Sign-in and accounts
- ✅ Passwordless email code, invitation, 18+ confirmation. Invitations are hashed, use-limited, expiring and revocable. Wrong guesses are limited per person (10 an hour) and per network (30 an hour), counted one at a time so guesses sent together can't slip past (tested).
- ✅ Only an email-code sign-in opens Hushmates. The Edge Function checks how the person signed in (the token's `amr`), so a password sign-up for someone else's email gets nothing (tested). 🟡 Confirm on staging that both a first sign-in and a later one are accepted (`otp` or `magiclink`, `STAGING.md` step 10.7).
- 🟡 The network used for those limits is the last `x-forwarded-for` entry, which the platform's proxy appends; a caller can only write earlier ones. Confirm on staging which header Supabase sets, and name it in `HUSHMATES_CLIENT_IP_HEADER` if there's a better one.
- ✅ The same email on a new device reaches the same account and everything in it (tested). No usernames or passwords.
- ✅ Identities are `(issuer, subject)` linked to a member. The main Hushmallow login can later be added as a second issuer, without a second account. It is not connected now: production Hushmallow auth is untouched.
- 🟡 Supabase Auth itself (GoTrue). Locally, an emulator with the same endpoints is used (`server/auth-emulator.mjs`, local-only by design). Real Supabase Auth differs in details: rate limits, error codes, and email templates (the code must be in both the *Confirm signup* and *Magic Link* templates, `STAGING.md` step 5).
- ⬜ 💰 A custom SMTP provider for sign-in emails to people outside the team. Configure SPF, DKIM and DMARC on the sending domain.
- ⬜ Bot protection on code requests. The sign-in client can forward a captcha token, but there is no widget yet, and the CSP would have to allow it (`script-src`, `frame-src`). Supabase's captcha stays **off** until both are built: turned on today, it would refuse every sign-in. Cloudflare Turnstile is free (🛑 a site key from the owner). Until then, code requests are limited by Supabase's own rate limits.
- ⚠️ After someone deletes their data, an access token they already hold stays cryptographically valid until it expires (at most 1 hour). It leads to nothing that was theirs (tested). Shorten the JWT expiry in Supabase if that matters.

### Safety and moderation
- ✅ Words that suggest someone may not be safe are answered with support. They are never circulated, stored or sent to any AI. The screening is rules-based: a floor, not a guarantee, and the app says so (the welcome and *You & safety* say it can miss things).
- ✅ The crisis lines are Australian, and each one can be tapped to call. 000, Lifeline 13 11 14 (with its online chat), the Suicide Call Back Service 1300 659 467 and 13YARN 13 92 76 (plus findahelpline.com outside Australia) appear on the crisis support screen and under "Get support now"; 1800RESPECT 1800 737 732 is added for abuse and violence, Beyond Blue 1300 22 4636 for other care screens (tested end to end: the support screen and "Get support now"). 🩺 Check the wording and the numbers before launch.
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
- ✅ Share pictures and videos (Phase 3 privacy audit). They draw only perspectives their writers allow, re-checked with the server just before drawing. They never name anyone or show a writer's Mallow. A Mallow's words are never drawn without "A Mallow perspective · Automatically generated" (checked frame by frame, and in the E2E from what the picture and the video actually draw).
- ⬜ The library's ~110 new Mallow lines and 49 openers. 🩺 Review them for tone and safety. They were written to avoid diagnosis, certainty, forced positivity and claims about other people's minds, and each one is tested against the same screen as a person's perspective.

### Privacy and consent
- ✅ Consent is explicit before a feeling travels, and separately for the Mallow fallback. The app and the export say who can receive or process what.
- ✅ Download my data (a human summary plus a file) and delete my data. The account goes, with its words: feelings, the perspectives it gave, its Mallow's perspectives, its own report notes, and its words quoted in safety reports (the reports stay, wordless). Its sign-in goes too; if the sign-in provider can't be reached at that moment, the scheduler keeps trying. Nobody else's feelings or account are touched (tested). Perspectives other people wrote on the deleted feelings are erased with them, and leave those writers' lists and exports, as the privacy details tell catchers before they write.
- ✅ Words a moderator removes are erased; the report keeps its own copy as evidence until retention clears it (90 days after a decision, 180 days for a report nobody decided).
- ✅ Retention: unsaved feelings are cleared 30 days after they come home, resolved report evidence after 90 days, the audit log after 365 days, and rate-limit events after 48 hours. All of this is configurable.
- ✅ Hushmates never claims absolute anonymity. Pseudonymous is the word, because:
  - Supabase holds the email address;
  - moderators can read reported words;
  - whoever holds the data key could decrypt;
  - networks are kept only as keyed hashes, and only for rate limits.
- ⚖️ A privacy policy and a collection notice (APP 5) in plain English, before launch.
- ⚖️ AI stays off. Before turning it on, the consent wording must name the provider and that words go overseas (Another Angle → its model provider in the US): APP 8, cross-border disclosure.
  Today the app says "your words stay with Hushmates" in four places, which is true only while AI is off:
  `ui/relay/parts.js` (privacy notes), `ui/relay/release.js` and `ui/relay/returned.js` (two places).
  Before AI is switched on, change those words and ask people's consent again.

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
7. **Australian Consumer Law.** What the app says about privacy, anonymity and benefits must be accurate (no "safe" guarantees). Two lines come from the product brief and need a lawyer's view:
   - The release consent reads "Share anonymously with Hushmates participants". Other participants never see a name, but Hushmates holds the email address and moderators can read reported words, so the app otherwise calls itself pseudonymous (the welcome and the privacy sheet say "not perfectly anonymous"). An alternative: "Share with Hushmates participants, without my name". If the label changes, these change with it:
     - the hint under the release button (`ui/relay/release.js`);
     - the Your data summary, "You agreed to share your feeling anonymously" (`ui/relay/your-data.js`);
     - the consent-required message (`core/relay-messages.js`, pinned by `tests/audit-fixes.test.mjs`);
     - the export key `agreedToShareAnonymouslyAt` (`core/export-format.js`, `docs/ACCESS.md`): a format change, so its tests change too.
   - The welcome line "One feeling. Five perspectives. Back to you." Five is the most a feeling can gather, not a promise; the app shows the real count, including zero.
8. **Terms of use and community guidelines** that moderators can apply, and a way to appeal a restriction.
9. **Contracts with providers** (data processing terms, where data is stored):
   - Supabase (Sydney region);
   - the email provider;
   - Another Angle's provider, if AI is ever turned on.

## 3. 🩺 Independent safety review (Tier A before outside testers; `REVIEWS.md`)

- The support screen's wording, and which lines appear for which kind of concern (crisis, someone in danger, abuse and violence, harassment, other).
- The extra crisis rules Hushmates adds to the shared lexicon (`core/feeling-safety.js`): overdose, self-harm, "no point going on", "don't want to be here any more", and passive wishes not to be here ("I just want to disappear", "sleep and never wake up", "I wish I'd never been born", "everyone would be better off without me", "I'm a burden", "tired of being alive"). Methods said with intent ("I want to hang myself", "take all my pills tonight", "unalive myself") and someone else in danger ("my friend says she wants to die", "my daughter is cutting herself", shown the "Someone might be in danger" screen) were added after a fifth review. Crisis words win over abuse or bullying words in the same feeling. Every phrasing found so far, and the everyday sentences that must still be released, are in `tests/fixtures/mallow-probes.json`, with a `clinicianCandidates` list of about 55 phrasings that need a clinician's call ("I can't do this anymore", "I feel like dying", "part of me wants to die", "I just want to disappear for a while"…). Start the review from there.
- 🩺⚖️ **Keyword rules have a ceiling.** Five adversarial rounds kept finding new phrasings, in both directions (missed risk, false alarms). The rules are a floor that shows support more often than not; they can't be complete. **Phase 3 plan: `CRISIS_DETECTION.md`.**
  - The rules are frozen as the floor.
  - An "ask, don't guess" check-in covers the uncertain middle (D2).
  - A meaning-based check runs on Supabase itself, escalate-only and in shadow mode first.
  - Changes are made only against an independent reviewer's labels:
    - first one reviewer on the 108-phrasing sheet (Tier A);
    - two clinicians on all 379 phrasings only when a trigger calls for it (`docs/clinical/crisis-phrasings-for-review.csv`, scored by `tools/safety-eval.mjs`).
  - No paid AI.
- The Mallow library's rule that a death, harm at home, or health and mood never get "unfair load" lines (`NOT_CHORES` in `core/perspectives.js`), and whether it should be wider.
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
| The Supabase Edge runtime itself | Needs the owner's project | The real `index.ts` under Deno 2.9 (from npm), with the full E2E through it; `staging:check` on the real platform |
| Email delivery | No email provider may be switched on | Codes are printed by the local Auth emulator |
| A live Another Angle call | No billable AI calls | Local fake HTTP servers for success, errors, timeouts, mock mode and costs (in `backend-mallow`, `backend-review-fixes` and `review-mallow-fallback`), and the AI limits, budget and fallbacks with in-process fakes |
| Load at 10,000+ people | Needs staging | Race tests for correctness under concurrency |
| Screen readers, by hand | No assistive technology here | Labels, roles, live regions and focus order, checked in the browser tests |

Known limitations:
- Theme detection in the Mallow library uses keywords. It can misread wording no one tested, and it is English only.
- The AI cache and the in-flight generation guard are per Edge Function instance. The database still guarantees one Mallow perspective per feeling, and the budget hold is global.
- With the default limits, AI (if enabled) is capped at 200 calls a day overall.
- Moderators see an account only as a reference, never a name or an email. Lifting a restriction is an operator command (`server/admin.mjs member`), not a desk button.

## 6. ⛔ Independent reviews: OUTSTANDING

None of these has happened, and no money is authorised for any of them.
- Each is needed before a **public** launch.
- The ones marked "beta" are needed before anyone outside the team uses it.

Which are legally mandatory, which advisable and which optional is in `REVIEWS.md` §3.
Most start with a free self-run step. Decisions are in `DECISIONS.md`.

| Review | What it covers | Status | Needed before |
|---|---|---|---|
| 🩺 **Independent safety review, Tier A** (D6a–D6d) | One registered psychologist or AMHSW, about 5–6 hours:<br>• crisis categories and 108 phrasings;<br>• all 342 Mallow lines;<br>• the support wording and the check-in (D2);<br>• the escalation procedure;<br>• a go/no-go memo.<br>Tier 0 (free) first. Tier B/C only on a trigger (`REVIEWS.md` §5) | ⛔ OUTSTANDING | **beta** (outside the team) |
| ⚖️ **Privacy** (D7) | Privacy policy and collection notice (APP 5); a Privacy Impact Assessment; health information as sensitive information; retention; the automated decisions (the screen, pausing, Mallow lines) under APP 1.7 from 10 December 2026; overseas disclosure if AI is ever on (APP 8) | ⛔ OUTSTANDING | **beta** (collection notice); launch (the rest) |
| ⚖️ **Legal** (D7, D8, D9) | Terms and community guidelines; Online Safety Act duties; the social media minimum age law and age assurance; "Share anonymously"; how the app describes itself (Australian Consumer Law, TGA); notifiable data breaches plan | ⛔ OUTSTANDING | launch |
| ♿ **Accessibility** (D13) | WCAG 2.2 AA by an external auditor, with screen-reader and switch users; reduced motion; contrast; the share video's alternative | ⛔ OUTSTANDING | launch |
| 🔐 **Security** (D14) | An external penetration test of staging: the Edge Function, sign-in, the desk, the static site; key handling and rotation | ⛔ OUTSTANDING | launch |
| 👥 **Moderator wellbeing** (WHS: a legal duty once anyone else reads the desk) | A written risk assessment; rotation, debriefs, an opt-out and access to support for whoever reads the desk | ⛔ OUTSTANDING | **beta** (outside the team) |
