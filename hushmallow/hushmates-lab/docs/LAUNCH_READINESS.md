# Hushmates · Launch readiness (15 October 2026)

**Hushmates is not ready for anyone outside the team.** It is ready to be deployed to staging and
checked there.

## 0. A correction to the Phase 3b version of this page

- **What the old page said:** legal and safety readiness were red, but its list of eight
  requirements had only one item pending: "verified results from real staging infrastructure".
  Read together, that suggested staging was the last step. **It isn't.**
- **What the eight items really were:** the deliverables the Phase 3b instructions asked for
  (tools, reports, estimates). Delivering them was never the same as being ready.
- **What changed:**
  - Readiness is now judged in six separate parts (§1), against four gates.
  - A successful staging run turns only **technical staging readiness** green.
- **What the Tier 0 self-assessment found:** the safety picture is worse than the old page said
  (`docs/safety/TIER0_SELF_ASSESSMENT.md`). The crisis screen showed support for 25 of 127
  new developer-written crisis or danger phrasings.

**The four gates:**

| Gate | Who uses it | Words in it |
|---|---|---|
| **G1 · Staging** | The developer's test accounts only | Test words only |
| **G2 · Team-only beta** | People the owner knows, by invitation, on staging | Real people's words, a handful of people |
| **G3 · Outside testers** | Up to about 30 invited adults the owner doesn't know personally | Real words from strangers |
| **G4 · Public launch** | Anyone 18+ | At scale |

## 1. The six readiness assessments at a glance

| # | Readiness | Today | G1 staging | G2 team beta | G3 outside testers | G4 public |
|---|---|---|---|---|---|---|
| 1 | **Technical: staging** | 🟡 Built and rehearsed; **not yet run on real Supabase or Cloudflare** | Waits on your two accounts | Needs G1 green | — | — |
| 2 | **Technical: production** | 🔴 Not started, by design | — | — | Backups and no pausing (D3); email (D5); real phones | Production project, load test, security test, monitoring |
| 3 | **Privacy and legal** | 🔴 **Drafts only**, none approved; lawyer questions open | — | You approve the collection notice, consent wording, terms and guidelines | All drafts approved; contact address; Online Safety records | A lawyer's view (D7, D9); final documents |
| 4 | **Safety and moderation** | 🔴 Screen weak on new phrasings; nobody named; no alerts | — | Four conditions (§5) | Tier A and its conditions; vocabulary batch or check-in; WHS | Measured screen; trained desk |
| 5 | **Accessibility** | 🟡 Keyboard, reduced motion and five screen sizes tested automatically; no hands-on screen-reader test | — | — | Hands-on VoiceOver and TalkBack test (A$0) | External audit (D13) |
| 6 | **Financial and operational** | 🟡 A$0 now, and modelled to 100,000 people; Free plan has no backups and can pause | A$0 | A$0 on Free, with a weekly backup someone owns | Pro (≈A$40 a month) or an owned backup and pause watch; safeguards set | Budget, alerts, an operating rota |

**So, today:**
- G1 is blocked only on the owner's accounts.
- G2 needs G1 plus the conditions in §3 and §5.
- G3 and G4 need far more.

## 2. Technical readiness: staging · 🟡

| Area | Where it stands | Evidence |
|---|---|---|
| Database rules, constraints, races, RLS, permissions | LOCAL: passed | Suite: differential against the reference engine; race tests; RLS role by role |
| The Edge Function (the real `index.ts`) | REHEARSAL and LOCAL: passed under Deno 2.9 | `deno check`; the full browser E2E through it |
| Sign-up, sign-in, sessions | REHEARSAL: passed against the Auth stand-in | `docs/evidence/staging-rehearsal/` |
| The scheduler (pg_cron → pg_net → the function) | REHEARSAL with the local scheduler. **pg_cron itself: NOT RUN** (only Supabase has it) | `staging:check` watches it on the real project |
| Encryption at rest, the recovery drill | LOCAL and REHEARSAL: passed | Suite; `staging:drill` |
| Deletion (data, and sign-in in Auth) | REHEARSAL: passed | The rehearsal's deletion checks |
| The static site (headers, CSP, nothing private published) | REHEARSAL: passed. **HSTS: NOT RUN** (plain http locally) | The rehearsal's site checks |
| The deploy and its guards | LOCAL against a stand-in of the Management API. **NOT RUN on the real APIs** | `tests/staging-deploy.test.mjs`, `tests/staging-cli.test.mjs` |
| Polling cost when a tab is left open | LOCAL: backs off after 5 quiet minutes, rests after an hour, catches up on use | `tests/client-auth.test.mjs` |

**To reach green:**
1. The owner's steps 1–6 in `STAGING_CLOUD.md` (about 45 minutes, A$0).
2. `staging:deploy`, `staging:check` and `staging:e2e` pass on the real project, with their reports in `docs/evidence/staging/`.

**What green means:** the code works on the real infrastructure. **It doesn't mean** anyone outside the team may use it.

## 3. Technical readiness: production · 🔴

Production hasn't been started, on purpose. It needs the owner's approval (D17).

| Needed | For | State |
|---|---|---|
| Backups and no automatic pausing | G3 | Free has neither. Pro (D3, ≈A$40 a month), or a weekly `pg_dump` that a named person owns and checks |
| Sign-in emails beyond the team | G3 | Supabase's built-in sender reaches team members only. A free provider tier, on a domain that isn't production's (D5) |
| Safari and real phones | G3 | **NOT RUN.** Chromium only so far |
| Load beyond a handful of people | G4 | **NOT RUN.** It sizes compute (`COSTS.md` §2) |
| A separate production project, merge to `main`, DNS | G4 | Not started (D17) |
| Security testing | G4 | Internal reviews only. Automated scanning (A$0), then a scoped penetration test (D14) |
| Monitoring and someone on call | G4 | None. The ops summary exists; nothing alerts anyone |

## 4. Privacy and legal readiness · 🔴

Drafts now exist in `docs/legal/`. They are drafts: **none is approved, and none has been seen by
a lawyer.** `docs/legal/LEGAL_REQUIREMENTS.md` sorts every requirement into four kinds:
- **verified** in the law's text;
- **depends on** how Hushmates works or is run;
- **needs a lawyer's advice**;
- **recommended practice only**.

| Item | State | Needed by |
|---|---|---|
| Privacy policy, collection notice, consent wording for health information | 🟡 Drafted | G2: the notice and consent. G3: all |
| Data retention and deletion policy | 🟡 Drafted, from the settings the code enforces | G3 |
| Data breach response plan | 🟡 Drafted (the Notifiable Data Breaches scheme, if Hushmates is an APP entity) | G3 |
| Terms of use, community and reporting guidelines | 🟡 Drafted | G2 |
| Safety disclaimers, moderation and escalation procedures | 🟡 Drafted and matched to the app as changed today | G2 |
| Age eligibility and safeguards | 🟡 Drafted. **The under-16 law's tests are not settled:** they need a lawyer (L1, D9) | G3; lawyer by G4 |
| Whether Hushmates is an APP entity (the Privacy Act's small-business exemption and its health exception) | ⛔ Needs a lawyer | G3 |
| Whether the TGA's software rules apply | ⛔ Depends on functionality and claims; needs a lawyer. **The public repository describes CBT, DBT and ACT foundations**, which could count against Hushmates | G3 |
| Online Safety Act: industry codes, risk-tier records, a monitored contact for eSafety notices | ⛔ Records not written; no contact address | G3 |
| Automated-decision wording (APP 1.7, from 10 December 2026) | 🟡 In the draft privacy policy | Before 10 December 2026, if Hushmates is an APP entity |
| "Pseudonymous", never "anonymous" | ✅ The app now says "without my name" (D8) | — |

**To reach G2:**
- The owner reads and approves the collection notice, consent wording, terms, community guidelines and safety disclaimers, for a team beta.
- **Or** the team beta waits for a lawyer.

**To reach G3:**
- every draft approved;
- the lawyer's answers on APP-entity status, the TGA and the under-16 law (`docs/legal/LEGAL_REQUIREMENTS.md` lists the questions);
- a contact address;
- the Online Safety records.

## 5. Safety and moderation readiness · 🔴

| Safeguard | State |
|---|---|
| Crisis words held back with Australian support lines; the words never stored | ✅ Built. 🟡 **Weak on new phrasings:** a Tier 0 probe showed crisis or danger support for 25 of 127 developer-written crisis or danger phrasings, before and after today's fixes. That is evidence of gaps, not a measured rate |
| Screen bugs (a fail-open, contractions, spacing, look-alike letters, length before safety) | ✅ Fixed today and pinned (`tests/tier0-screen.test.mjs`) |
| Perspectives that incite self-harm, give harmful advice or ask grooming questions | ✅ Blocked today |
| *Support* (crisis lines) on every screen | ✅ Since today. The E2E opens it from five scenes |
| Honest wording about the team: small, not around the clock, can't contact anyone | ✅ Since today |
| Reports, "Someone may be in danger" first in the queue, automatic pausing | ✅ Built and tested |
| Who reads the desk, and a safety lead | ⛔ **Nobody named** (D12) |
| An alert for a new priority report | ⛔ None. Free stop-gap: fixed check times and a twice-daily phone reminder. Real alert: needs email (D5) |
| When nobody can read the desk | 🟡 The desk-away setting tells reporters. The rule is in `ESCALATION.md` and `docs/legal/MODERATION.md` |
| The Mallow library | ✅ All 342 lines checked; 42 rewritten, 51 left out, 2 openers added (293 now), routing fixed. 🟡 Not independently reviewed |
| The check-in ("are you safe right now?") | ⏸ Waits on Tier A's wording (D2) |
| Independent review | ⛔ Tier A not engaged. Quote requests are ready (`REVIEW_QUOTES.md`) |
| Moderators' wellbeing (WHS) | ⛔ No assessment yet |

**Conditions for G2, the team-only beta** (Tier 0 §9):
1. The owner names the safety lead and desk readers, and sets check times and a phone reminder.
2. Team testers are told plainly that the screen misses many ways of saying things, and how to use *Support* and "Someone may be in danger".
3. The owner approves the G2 legal drafts (§4).
4. G1 is green.

**Conditions for G3, outside testers:**
- Tier A, with its go/no-go conditions met. That includes either a reviewed vocabulary batch, or the check-in for the uncertain middle.
- Routes for the missing categories: threats to others, a minor disclosing, eating disorders, an overdose already taken, someone else in danger.
- The WHS assessment.
- A contact address and an appeal route.

**Conditions for G4:**
- a locked, independently written test set, with the screen measured against thresholds a clinician set;
- a trained desk;
- the lawyer.

## 6. Accessibility readiness · 🟡

| Area | State | Evidence |
|---|---|---|
| Layout at 320, 375, 390, 768 and 1280 wide | ✅ No layout-audit findings (lab QA); E2E at 360, 390, 1280 and 1440 | `docs/screenshots/qa-report.json` |
| Keyboard alone; visible focus | ✅ A feeling released with the keyboard alone; focus visible on every stop | Lab QA |
| Reduced motion | ✅ Respected | Lab QA; E2E |
| Labels, roles, live regions | ✅ Checked in the browser. *Support* has a visible label and an accessible name. You & safety's sections are headings, with support first | E2E; `ui/relay/common.js` |
| Hands-on screen readers (VoiceOver on iPhone, TalkBack on Android) | ⛔ **NOT RUN.** A$0, before G3 | — |
| Radio groups (the Mallow picker, report reasons) | 🟡 Each choice is its own Tab stop; arrow keys aren't supported | Tier 0, PC-10 |
| External audit | ⛔ Before G4 (D13) | — |

**The law:** the Disability Discrimination Act 1992 (s 24, goods and services) applies. WCAG 2.2 AA is the practical benchmark, not a legal certificate (`docs/legal/LEGAL_REQUIREMENTS.md`).

## 7. Financial and operational readiness · 🟡

| Area | State | Evidence |
|---|---|---|
| Staging | ✅ A$0 on Free plans in separate accounts, with no card | `COSTS.md` §1 |
| The beta | Free A$0 (no backups; pauses after a quiet week), or Pro ≈A$40 a month | `COSTS.md` §2.3 |
| Scale | Typical use: about A$49 a month at 1,000 people, A$351 at 10,000 and A$1,354 at 100,000. High use runs higher. **These are forecasts, not maximums** | `COSTS.md` §2 |
| Worst cases | An always-open tab now backs off. An abusive account at the rate limit costs about US$10 a month. A flood of unauthenticated calls costs US$20 per 10 million | `COSTS.md` §2.4 |
| Costs outside Supabase's Spend Cap | Email, a domain and Cloudflare paid features. Point-in-time recovery and compute are also outside it on Pro | `COSTS.md` §4 |
| Enforced safeguards | AI is off, with a cap of A$0 enforced in the database. Free can't bill. Pro's Spend Cap stays on. Per-person rate limits | `COSTS.md` §5 |
| Operations | ⛔ Nobody is on call, nothing alerts anyone, and the weekly usage check isn't assigned | — |

## 8. Pass/fail report

Local and rehearsal results on the code as committed (15 October 2026, Phase 3c):

| Run | Result | Label |
|---|---|---|
| Automated suite (`node --test tests/*.test.mjs`, with Deno) | [[SUITE]] | LOCAL |
| Many-account browser E2E (`tools/app-shots.mjs`), Edge Function under Node | [[E2E_NODE]] | LOCAL |
| The same E2E with the Edge Function under Deno | [[E2E_DENO]] | LOCAL |
| Lab QA (`tools/shots.cjs`) at five sizes | [[LABQA]] | LOCAL |
| The Tier 0 probe through the screen (`node tools/safety-eval.mjs --probe …`) | Crisis or danger support for 25 of 127; care for 7 of 41; 20 of 54 everyday phrasings held back. Unchanged by today's fixes | LOCAL |
| The staging E2E rehearsal (`npm run staging:rehearse`, under Deno), Phase 3b | 57 of 57 | REHEARSAL |

**On staging:** nothing yet. When the real run happens, its report replaces this line.

### What the staging run will verify

Each of these is checked by `staging:check` and/or `staging:e2e`, and recorded as pass or fail:

| Property | Successful case | Negative case |
|---|---|---|
| Supabase Auth | sign-up by email code with an invitation; sign-in; the session recorded as a code sign-in | a wrong code; a used invitation; a password sign-in refused by the function; a forged token |
| RLS and database permissions | — | the browser roles can't reach either Hushmates schema or execute any function; RLS on every table; the Data API refused with the public key and with a person's token |
| Edge Function | every relay action through it | no token → 401; the public key as a token → 401; another website → no CORS; the scheduler's route without its secret → 404 |
| Scheduling | pg_cron's two jobs are present and ran in the last five minutes; the function answered; an expired offer ended by the scheduler alone; the Mallow prepared with nobody calling | — |
| Encryption | words stored locked, opened by the deployed keys; perspectives too | the wrong keys don't open them |
| Concurrency | the same feeling sent five times at once is stored once; two people catching at the same moment; two answers at once | — |
| The user journey | sign-up, release, catch, perspective, Mallow, homecoming, share picture, crisis support, a report the desk decides | a writer who stops sharing is never drawn; words that look like code are shown, never run |
| Deletion | each test person's data and sign-in gone from Supabase Auth | no deleted account's words left |
| Desktop and mobile | phones at 360 and 390 (touch, reduced motion); desktops at 1280 and 1440 | — |

## 9. What happens next, in order

| Step | Who | Cost |
|---|---|---|
| `STAGING_CLOUD.md` steps 1–6 | 🛑 Owner | A$0 |
| Deploy and verify staging; publish the report here (G1) | Developer, in a cloud session | A$0 |
| Read and approve the G2 drafts in `docs/legal/`; name the desk readers and safety lead; set check times | 🛑 Owner | A$0 |
| Run eSafety's start-up tool with the prepared answers (`SBD_SELF_ASSESSMENT.md`); write the one-page WHS assessment | 🛑 Owner | A$0 |
| Send the quote requests; compare the replies | 🛑 Owner (D6c) | A$0 |
| Team-only beta on staging (G2) | 🛑 Owner (D12) | A$0 |
| Tier A, after you approve a quote (D6d); then its single fix batch, and the check-in (D2) | 🛑 Owner; the reviewer; the developer | the quote |
| Before G3: Pro or an owned backup (D3), email (D5), the lawyer's G3 answers, hands-on screen-reader test, real phones | 🛑 Owner | ≈A$40 a month on Pro; email A$0 on a free tier; the lawyer is quoted |
| Before G4: the lawyer (D7, D9), accessibility and security testing (D13, D14), production (D17) | 🛑 Owner | to be quoted |
