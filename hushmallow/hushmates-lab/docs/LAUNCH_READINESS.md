# Hushmates · Launch readiness (15 October 2026)

**Verdict: not ready for a public beta, and not yet ready for testers outside the team.**
- **Technical:** the code is ready for staging. It has been rehearsed end to end on this machine, but **nothing has run on real Supabase or Cloudflare yet**. That waits on the owner's staging accounts (`STAGING_CLOUD.md`).
- **Safety:** the protective floor is built and tested. The independent review that should come before outside testers (Tier A, `REVIEWS.md`) hasn't happened.
- **Legal:** the privacy documents the law probably requires aren't written, and the under-16 law's scope hasn't been assessed.

Local tests passing are not evidence of production readiness, and this page never treats them as such.

Every result below is labelled by where it was shown:

| Label | Meaning |
|---|---|
| **STAGING** | On the real Supabase project and Cloudflare site. **None yet** |
| **REHEARSAL** | The exact staging topology on one machine: the packed static site on one host; the real Edge Function under Deno, the local stand-ins for Supabase Auth and PostgREST, and real Postgres 16 on another; real Chromium at phone and desktop sizes |
| **LOCAL** | The automated suite and the many-account browser E2E on the local stack |
| **NOT RUN** | Not tested anywhere yet, with the reason |

## 1. The three readiness assessments

### Technical readiness: 🟡 ready for staging, not yet verified on it

| Area | Where it stands | Evidence |
|---|---|---|
| Database rules, constraints, races, RLS, permissions | LOCAL: passed | Suite: differential against the reference engine; eight race tests; RLS role by role |
| The Edge Function (the real `index.ts`) | REHEARSAL and LOCAL: passed under Deno 2.9 | `deno check`; the full browser E2E through it |
| Sign-up, sign-in, sessions | REHEARSAL: passed against the Auth stand-in | `docs/evidence/staging-rehearsal/` |
| The scheduler (pg_cron → pg_net → the function) | REHEARSAL: the local scheduler stands in. **pg_cron itself: NOT RUN** (only Supabase has it) | The staging check watches it on the real project |
| Encryption at rest | LOCAL and REHEARSAL: stored locked, opened only with the keys; the recovery drill restores a dump | Suite; rehearsal; `staging:drill` |
| Deletion (data, and sign-in in Auth) | REHEARSAL: passed | The rehearsal's deletion checks |
| The static site (headers, CSP, redirects, nothing private published) | REHEARSAL: passed. **HSTS: NOT RUN** (plain http locally) | The rehearsal's site checks |
| The deploy itself | LOCAL: tested against a stand-in that enforces the Management API's own published document. **NOT RUN on the real API** | `tests/staging-deploy.test.mjs` |
| Staging from a cloud session | LOCAL: the staging check passes end to end with keys derived from the root secret and SQL through the API stand-in | `tests/staging-check.test.mjs` |
| Desktop and mobile | REHEARSAL and LOCAL: Chromium at 360, 390, 1280 and 1440 wide, touch and reduced motion. **Safari/WebKit and real phones: NOT RUN** | Screens in the evidence folders |
| Load beyond a handful of people | **NOT RUN** | Needs staging; it sizes compute (`COSTS.md`) |

**To reach green:**
1. The owner does `STAGING_CLOUD.md` steps 1–6.
2. `staging:deploy`, `staging:check` and `staging:e2e` pass on the real project, and their reports go in `docs/evidence/staging/`.
3. A hand test on a real iPhone and Android phone.

### Safety readiness: 🔴 not ready for outside testers; adequate for a team-only beta once staging passes

| Safeguard | State |
|---|---|
| Crisis words held back with Australian support lines; words never stored | ✅ Built, and tested on 379 developer-written phrasings. **Not independently reviewed.** Developer tests are not clinical validation |
| *Get support now* on every screen; the app says the screen can miss things | ✅ Built |
| "Someone may be in danger" reports, first in the desk's queue | ✅ Built and tested (rehearsal) |
| Escalation procedure | 🟡 A developer's draft (`ESCALATION.md`). The desk readers and the safety lead aren't named yet |
| Retracted content never in a new share picture or video | ✅ Built (Phase 3b) and tested in the browser: a feeling let go, a deleted journey, a writer who stopped sharing, a Mallow perspective no longer on the journey |
| Mallow perspectives always labelled as automatic, never as a person's | ✅ Tested in the app, the share picture and the desk |
| No AI anywhere; no extra AI for crisis detection | ✅ AI off; cap A$0 |
| The check-in ("are you safe right now?") | ⏸ Not built until Tier A sets its wording |
| Independent review | ⛔ Tier 0 (free) and Tier A (about A$1,155–1,530) outstanding (`REVIEWS.md`) |
| Moderators' wellbeing (WHS) | ⛔ The risk assessment, shift limits and debriefs are outstanding |

**To reach green for outside testers:**
1. Tier 0.
2. Tier A, with its conditions met.
3. Named desk readers and a safety lead.
4. The WHS assessment.

### Legal readiness: 🔴 not ready for outside testers

| Item | State |
|---|---|
| Privacy policy, collection notice, consent wording for health information, breach-response plan | ⛔ Not written. The Privacy Act probably applies despite Hushmates' size (`REVIEWS.md` §3) |
| Online Safety Act: risk-tier records, terms, a monitored eSafety contact | ⛔ Not written |
| The under-16 social media law: in scope or not? | ⛔ Needs a lawyer's view before a public launch |
| Consumer-law and TGA wording ("pseudonymous", never "anonymous"; no clinical claims) | 🟡 The app's own copy follows it. "Share anonymously" remains (D8); a copy audit is outstanding |
| Automated-decision wording (APP 1.7, from 10 December 2026) | ⛔ Due in the privacy policy |

**To reach green for outside testers:** D7a (the privacy basics, drafted from the OAIC's free guides and approved by the owner), the terms, and an eSafety contact.

**For a public launch:** D7 (the lawyer: the under-16 law, the codes, the terms), D8 and D9.

## 2. The eight completion requirements

| # | Requirement | Status | Where |
|---|---|---|---|
| 1 | Verified results from real staging infrastructure | ⛔ **PENDING.** Blocked only on the owner's accounts and the environment settings. The tools are ready and tested | `STAGING_CLOUD.md` |
| 2 | A complete pass/fail report | ✅ for local and rehearsal (§3 below); the staging column is empty until 1 is done | §3; `docs/evidence/` |
| 3 | Evidence of end-to-end testing | ✅ REHEARSAL and LOCAL, with screens and JSON reports. STAGING pending | `docs/evidence/staging-rehearsal/`, `docs/screenshots/phase2/` |
| 4 | Monthly and annual costs | ✅ For 100 (Free or Pro), 1,000, 10,000 and 100,000 people, polling and Realtime | `COSTS.md` §2 |
| 5 | A revised safety review proposal with justified costs | ✅ Tier 0 → Tier A, with the arithmetic and the sources | `REVIEWS.md` §5 |
| 6 | Mandatory, recommended and optional reviews, separated | ✅ (from search extracts of official sources; medium confidence) | `REVIEWS.md` §3–4 |
| 7 | Remaining risks ranked by severity | ✅ | `RISKS.md` |
| 8 | A launch-readiness assessment by technical, safety and legal readiness | ✅ This page | §1 |

## 3. Pass/fail report

**Local and rehearsal results (latest run, 15 October 2026):**

| Run | Result | Label |
|---|---|---|
| Automated suite (`node --test tests/*.test.mjs`, with Deno) | _filled in by the final run_ | LOCAL |
| Many-account browser E2E (`tools/app-shots.mjs`), Edge Function under Node | _filled in by the final run_ | LOCAL |
| The same E2E with the Edge Function under Deno | _filled in by the final run_ | LOCAL |
| The staging E2E rehearsed (`npm run staging:rehearse`) | _filled in by the final run_ | REHEARSAL |
| The staging check on the local stack (by database connection, and as a cloud session) | _filled in by the final run_ | LOCAL |
| Lab QA (`tools/shots.cjs`) | _filled in by the final run_ | LOCAL |

**On staging:** nothing yet. When the real run happens, its report replaces this line.

### What the staging run will verify

Each of these is checked by `staging:check` and/or `staging:e2e`, and recorded pass or fail:

| Property | Successful case | Negative case |
|---|---|---|
| Supabase Auth | sign-up by email code with an invitation; sign-in; the session recorded as a code sign-in | a wrong code; a used invitation; a password sign-in refused by the function; a forged token |
| RLS and database permissions | — | the browser roles can't reach either Hushmates schema or execute any function; RLS on every table; the Data API door refused with the public key and with a person's token |
| Edge Function | every relay action through it | no token → 401; the public key as a token → 401; another website → no CORS; the scheduler's route without its secret → 404 |
| Scheduling | pg_cron's two jobs present; it ran in the last five minutes; the function answered it; an expired offer ended by the scheduler alone; the Mallow prepared with nobody calling | — |
| Encryption | words stored locked, opened by the deployed keys; perspectives too | the wrong keys don't open them |
| Concurrency | the same feeling sent five times at once stored once; two people catching at the same moment; two answers at once | — |
| The user journey | sign-up, release, catch, perspective, Mallow, homecoming, share picture, crisis support, a report the desk decides | a writer who stops sharing is never drawn; words that look like code are shown, never run |
| Deletion | each test person's data and sign-in gone from Supabase Auth | no deleted account's words left |
| Desktop and mobile | phones at 360 and 390 (touch, reduced motion) and desktops at 1280 and 1440 | — |

## 4. What happens next, in order

| Step | Who | Cost |
|---|---|---|
| `STAGING_CLOUD.md` steps 1–6 | 🛑 Owner | A$0 |
| Deploy and verify staging; publish the report here | Developer (cloud session) | A$0 |
| Tier 0 safety self-assessment; draft the privacy basics, terms and eSafety records | Developer, then 🛑 owner approves | A$0 |
| Team-only beta on staging (people the owner knows) | 🛑 Owner (D12) | A$0 |
| Tier A quotes, then the review | 🛑 Owner approves scope and cost (D6c, D6d) | about A$1,155–1,530 + GST |
| Before outside testers:<br>• the beta's plan (D3);<br>• email (D5);<br>• named desk readers;<br>• the WHS assessment | 🛑 Owner | about A$40 a month on Pro; email A$0 on a free tier |
| Before a public launch:<br>• the lawyer (D7, D9);<br>• accessibility and security testing (D13, D14);<br>• your final approval (D17) | 🛑 Owner | to be quoted |
