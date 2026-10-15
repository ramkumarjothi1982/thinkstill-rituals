# Hushmates 2.0 · The Feeling Relay (lab prototype)

> **Hushmallow — A softer space for feelings.**
> **Hushmates — Send a feeling. See it differently.**
> ONE FEELING. FIVE PERSPECTIVES. BACK TO YOU.

**Status: Phase 3c. Not ready for anyone outside the team.** Staging is approved, prepared and
rehearsed; it is not yet verified on real infrastructure. Nothing is deployed, nothing touches
production, and nothing is public.
- Where everything stands: **`docs/LAUNCH_READINESS.md`**, in six parts (technical staging, technical production, privacy and legal, safety and moderation, accessibility, financial and operational) against four gates.
- The free safety self-assessment (Tier 0): **`docs/safety/TIER0_SELF_ASSESSMENT.md`**. The crisis screen is weak on new phrasings. The Mallow library was checked line by line and fixed. *Support* is now on every screen.
- Draft privacy and legal documents (not approved, not seen by a lawyer): `docs/legal/`.
- The deploy and the checks run from the developer's cloud session as soon as the owner makes the staging accounts (`docs/STAGING_CLOUD.md`).
- The other key documents:
  - what needs the owner: `docs/DECISIONS.md`;
  - the independent review, and the quote requests: `docs/REVIEWS.md`, `docs/REVIEW_QUOTES.md`;
  - costs from 100 to 100,000 people: `docs/COSTS.md`;
  - the risks, ranked by severity: `docs/RISKS.md`.

Launch needs the owner's final approval.

There are three experiences, kept strictly apart (`docs/ACCESS.md`):
- **The customer app** (`app/`): sign in with an email code, an invitation the
  first time (with a name and 18+), then Release, Catch, My journeys, Returned,
  You & safety, Your data. Everything goes through one Supabase Edge Function
  (`supabase/functions/hushmates`) to Postgres, where every rule lives
  (`supabase/migrations`). Its production build (`tools/build-app.mjs`) contains
  nothing for developers, and is refused if it would.
- **The safety desk** (`staff/`): for moderators only (enforced on the server).
  They read reports and decide, and everything they do is logged.
- **The lab** (`index.html`, `lab/`): the Control room, scenarios A/B/C, two
  test phones, seven simulated test identities, a dev clock and an in-page
  demonstration service. It is for developers and authorised testers only, on a
  development host with a tester key; production has no lab at all.

The backend is described in `docs/BACKEND.md`, its costs in `docs/COSTS.md`.

Neither touches production: no production data, no production backend, nothing
deployed. `tools/build-site.sh` copies only `src/` and selected `assets/`, so this
folder never ships with the main Hushmallow app.

Someone writes what's on their mind. Their Mallow gathers the words into a
glowing orb, squeezes it until it ripples and lets it float up into Hushfold.
Up to five different people, who chose to "let feelings find" them, catch it one
at a time. Each offers a possibility, not a verdict, and the orb gains a petal of
light. After five perspectives, or within a day, it comes home, opens, and the
author keeps what helps.

If nobody catches it and the author allowed it, their own Mallow can offer one
perspective, labelled "A Mallow perspective · Automatically generated". It is
never presented or counted as a person.

## Run it

**Everything, on this machine** (Postgres, a local copy of Supabase Auth, the Edge Function's
code, the app, the safety desk, the scheduler; no email is sent and nothing is deployed):

```bash
cd hushmallow/hushmates-lab && npm install                # dev-only: the Postgres driver
# a local Postgres 16 (HUSHMATES_PG, default postgres://postgres@127.0.0.1:54329)
node server/dev-stack.mjs                                 # prints invitations and, as they're asked for, sign-in codes
# open http://127.0.0.1:8090/app/  ·  the safety desk: http://127.0.0.1:8090/staff/
node server/admin.mjs invite --count 3                    # more invitations (also: settings, set, ops, revoke, member)
```

**The production files** (what a static host would serve):

```bash
node tools/build-app.mjs          # → dist/app and dist/staff (scanned); add --supabase-url/--anon-key for a project
node server/main.mjs --mode production --port 8080
```

**The lab** (developers and testers):

```bash
# the local stack with the lab at the /lab/?key=… address it prints
HUSHMATES_TESTER_KEY="<at least 16 characters>" node server/dev-stack.mjs

# or, on your own machine only, the lab as a plain page: serve the repository root
# (the lab imports ../../src/ultra), from here that's two folders up
python3 -m http.server 8000 --directory ../..
# open http://localhost:8000/hushmallow/hushmates-lab/index.html
```

Nothing above deploys anything. Both servers listen on 127.0.0.1 by default.

**The lab layout** (developers and testers only; everything outside the phones is lab chrome)
- **Phone A** is the author, MoonMallow.
- **Phone B** is a catcher. Pick any of six test identities: CloudMallow,
  StarMallow, FernMallow, DreamMallow, PebbleMallow, EmberMallow.
- SafetyTeam, a moderator test identity, works the **safety desk**.
- On a phone-sized screen, the bar switches between Author and Catcher, and
  **Control room** opens the panel.

**The control room: three demonstrations**
- **A · Five people** (six identities):
  1. MoonMallow releases *"My friend hasn't replied. I think they're avoiding
     me."* (ticking the sharing consent).
  2. Five catchers each catch it and type a perspective. "Type it for me" inserts
     words written for the lab; you still press the button.
  3. It comes home with "5 of 5 human perspectives" and MoonMallow keeps one.
  4. EmberMallow then finds nothing: no sixth person.
- **B · Nobody catches it**:
  1. MoonMallow releases a second feeling with "Let a Mallow offer another
     perspective if nobody responds." turned on.
  2. You move the **dev clock** on 30 minutes; MoonMallow asks Noomi, and the
     fallback magic plays.
  3. +24 hours: it comes home. "No one caught it this time. Want to give it
     another journey?", the Mallow's perspective shown on its own, and Send it
     out again / Keep it with me / Let it go.
- **C · Two people** (partial return): a third feeling; CloudMallow and
  StarMallow catch it; +24 hours; it comes home with exactly two human
  perspectives: "2 Hushmates caught it before it came home." Nothing is invented
  for the other three places.
- **The steps tick off from the service's real state.** "Play this scenario"
  drives the real interface; "Reset demo" starts over.
- **Dev clock:** +5 min, +30 min, +3 h, +24 h, back to now.
- **Mallow perspective source**, and how a tester tells them apart:

  | Source | What people see | Lab-only tag under it |
  |---|---|---|
  | Reframe library (default: the main app's rule-based engine, no AI model; real, free, on the device) | "A Mallow perspective · Automatically generated" | yellow "Lab · Reframe library (rule-based)" |
  | Canned development example (one line per Mallow personality) | "A Mallow perspective · Example for testing, not generated" | yellow "Lab · canned example" |
  | Another Angle server (Account 1's service, run locally, unchanged) | "Automatically generated" only if it reports a real model with a server-side key; its mock mode is treated as a canned example | green "Lab · live AI response (test key)" or yellow "Lab · canned example" |

  The tags come from `lab/lab-notes.js`, which only the lab loads: the customer
  app has no such code.
  Canned examples are refused outside the lab (`RelayService` `cannedExamples`),
  so testing copy can never reach a real person. No AI key is configured here,
  so this lab can't show a live AI response; with a test key on a local Another
  Angle server (which needs approval) the green tag would say so.
- **Online / Offline** on each phone simulates losing the connection.
- Lab state is saved in this browser (`localStorage`); add `?fresh` to the URL to
  start clean once.

To try the Another Angle option, run that service's local harness from its own
folder (`npm run harness -- --serve 8790`). It accepts the lab served from
`http://localhost:8000`. Without a key it runs in mock mode, and the lab shows its
answers as a canned example. Never set its real provider key for the lab: that
costs money and needs approval.

## Test it

The two browser tools need Playwright and Chromium:
`npm i --no-save playwright@1.56.1 && npx playwright install chromium` (or set
`HUSHMATES_CHROMIUM` to a Chromium you have).

```bash
cd hushmallow/hushmates-lab
node --test tests/*.test.mjs                 # everything: the reference engine, the real database (differential,
                                             # races, access), sign-in, the Mallow, access control, build, the app's link
node tools/app-shots.mjs <out-dir>           # end to end in Chromium on the whole local stack, many accounts at once
node tools/sync-edge.mjs --check             # the Edge Function's shared copies match their sources
node --test v1-messaging/tests/*.test.mjs   # 32 (archived v1)
node tools/shots.cjs <out-dir> http://localhost:8000   # the lab: interface QA (the repository root served on :8000, see The lab)
HUSHMATES_DENO=<deno> npm run staging:rehearse        # the staging E2E on this machine, across two hosts (npm run staging:rehearse:node without Deno)
node tools/safety-eval.mjs                   # what the safety screen does with every known phrasing (--export, --sample --display-ids, --library, --labels, --probe)
node tools/cost-model.mjs                    # the cost tables in docs/COSTS.md
```

Staging itself (`docs/STAGING_CLOUD.md`): `staging:deploy`, then `staging:check` and `staging:e2e`
on the real project, once the owner has made the staging accounts.

The access-control tests run real servers over HTTP in both modes. They try
direct URLs (with traversal tricks), no session, an ordinary member's session,
forged and leaked cookies, requests from other sites, and test-only methods
through the API. They also check that consent, privacy and safety rules hold
for anyone calling the API directly (`docs/ACCESS.md`).

The relay tests cover:
- the five-person cap, unique contributors, no self-reframe and the atomic last
  slot under simultaneous catches;
- catch expiry, journey expiry, early recall, idempotency, fairness, screening;
- consent enforcement, zero-human and partial returns, send it out again, real
  human counts;
- privacy both ways, deletion and export, reports and blocking, high-risk words
  (including a catcher in difficulty, who gets support while the feeling floats on);
- the Mallow fallback (opt-in, human-first, one generation and dedupe, labels,
  budgets, failures, the separate section, Explore another angle);
- contributors' share consent, and taking a perspective back;
- a hostile client through the network layer (forged and replayed requests).

55 of them were written by independent adversarial reviewers (three in 1.x, two
for the 2.0 rules) to fail on the code they reviewed. They failed, the defects
were fixed, and they stay as regression tests.

The end-to-end run (`tools/app-shots.mjs`) builds the app and the desk exactly
as they would ship and serves them from the local stack: Postgres, the local copy
of Supabase Auth and the Edge Function code. It drives real signed-in accounts at
once: Chromium phones and desktops for the author, a catcher, a moderator, a
keyboard-only person, a second device and a 320-pixel screen, plus six more
accounts through the API. It moves the clock for the 30-minute Mallow and the
24-hour homecoming; the scheduler does that work with the app closed.

The lab's QA tool (`tools/shots.cjs`) captures 30 scenes at five sizes, audits
each one inside the phone, plays the three demonstrations, releases a feeling
with the keyboard alone and checks reduced motion.

**Latest run (15 October 2026, on the code in this commit):**

| Check | Result |
|---|---|
| All tests (`node --test tests/*.test.mjs`, with `HUSHMATES_DENO` set) | 379: 377 pass, 0 fail, 2 skipped (the optional live Another Angle checks, which need that service's local harness and would be billable against the real one). Without a Deno installed, the Deno tests skip and the staging check runs the Edge Function code under Node |
| The real Edge Function under Deno (Phase 3) | `index.ts` passes `deno check`. It runs under Deno 2.9 with only its secrets and network access to this machine, reaching the database through the local PostgREST stand-in (grants decide: anon 401, a person 403, the private schema 406, an `sb_` key as a Bearer token refused). The **full browser E2E through it: 90 of 90** (`docs/evidence/e2e-edge-under-deno.json`) |
| The staging E2E, rehearsed (Phase 3b) | the packed site on one host, the real `index.ts` under Deno and the Supabase stand-ins on another, real Chromium at 360, 390, 1280 and 1440: **57 of 57** (`docs/evidence/staging-rehearsal/`). It is labelled a rehearsal, never staging |
| The staging tools (Phase 3b) | the deploy against a stand-in that enforces the Management API's own document: dry runs proven read-only, migrations applied and recorded, an edited migration refused, Vault by parameters only. Each command is run end to end, and refuses anything but the staging-only project and Cloudflare account before reading keys or data. Keys are derived from a root secret, with SQL through the API, for a cloud session. Reviewed adversarially, and every confirmed finding fixed (`docs/evidence/review-phase3b.md`) |
| The staging check, on the local stack (Phase 3) | every check it can make here passes; what only a real project has (pg_cron, pg_net, Vault, password sign-in) is reported as not checked, never as passed. Its scheduler watch fails when no scheduler runs, and the wrong keys fail the encryption check. It cleans up its test accounts and invitations |
| Recovery drill (Phase 3) | a `pg_dump` restored into a new database: every locked text opens with the keys, none with wrong keys |
| On the real database | differential against the reference engine (8 seeds × 300 steps); eight race tests (twelve people for five places, duplicate sends, two devices, Mallow requests, a single-use invitation, overlapping scheduled jobs, blocking mid-write, finds during a catch); the AI budget hold under concurrent calls; RLS and access role by role; tokens forged, replayed or from a password sign-in refused; retention at each of its limits |
| End to end, many accounts | 90 of 90 checks, 41 screens, 0 problems (`docs/screenshots/phase2/`, with `app-report.json`): |
| | five people at once, and a sixth isn't offered it; two people; nobody, said plainly |
| | the Mallow prepared by the scheduler at 30 minutes, from the free library, labelled automatic, never counted |
| | homecoming at 24 hours; Explore another angle (one labelled perspective, still 2 people) |
| | Send it out again: caught by a second account, home again with 1 |
| | the share story leaves out a perspective its writer kept private; a writer who stops sharing or takes their words back while the share screen is open is left out, and nothing is made until the author looks again; a video recording when a writer stops sharing is stopped and never handed over; the screen follows when they allow it again, and a refresh with nothing new leaves a keyboard user's focus where it was; a feeling let go or a journey deleted mid-share: nothing is made, and both buttons are switched off; what the picture and the video actually draw is read back: the allowed perspective, never the private one, nobody's name, and a Mallow's words always with "A Mallow perspective · Automatically generated" |
| | offline, and a retry that sends once; support, and “Get support now”, with tappable Australian crisis lines; words that need care never stored |
| | reporting and the safety desk (focus moves into an opened report; decisions logged and noted; its refresh keeps a moderator's place); blocking, never revealed |
| | keyboard only; the same account on a second device; download, and deletion (sign-in included; the other device is signed out) |
| Every screen | no developer content, raw data, programming values or testing words, no sideways scrolling; no internal ids on any customer screen (the safety desk shows a labelled account reference for a team lead, by design). Every refused session (401) is accounted for: it follows a clock move that aged the session, or the test asked for it; the app refreshes and carries on |
| Builds | app 71 files, desk 20; comments stripped, every module parses, scan clean, secret keys refused |
| Safety screen and Mallow phrasings (`tests/fixtures/mallow-probes.json`) | every phrasing found by five adversarial rounds holds: 169 ways of not wanting to be here, or a method, get crisis support (11 more still do beside abuse or bullying); 16 about someone else get the "Someone might be in danger" screen; 121 everyday sentences (getaways, alarms, sports injuries, "I don't want to go on the school camp", a death told plainly) are released. In the Mallow library: household load gets load lines and never "your partner seems distant"; a death, harm at home, health, mood or money never get chores lines; harm and control (of the writer or the children) never get distance lines; grief and pregnancy loss are recognised, fear of losing someone and passing a test are not. Each Mallow case is asked of all seven Mallows, three times. Phrasings still to decide are listed there for the clinician |
| Edge Function copies | `tools/sync-edge.mjs --check`: the shared files match their sources (also a test) |
| Archived v1 tests | 32 pass |
| Lab QA (`tools/shots.cjs`, `docs/screenshots/qa-report.json`) | 30 scenes at 390 × 844, 375 × 812, 320 × 568, 768 × 1024 and 1280 × 860: no layout-audit findings; scenarios A (10 of 10), B (6 of 6) and C (5 of 5) ticked at every size; a feeling released with the keyboard alone, focus visible on every stop; reduced motion holds, and all three scenarios complete with it; no console errors |

Earlier screenshots are kept for comparison: Phase 1's customer app in
`docs/screenshots/customer/` and the lab's scenes in `docs/screenshots/`
(390 × 844 unless named), with the share picture export and video frames.

## What's real, what's simulated

| Real (built, and tested locally against real Postgres) | Not yet real |
|---|---|
| Every rule in Postgres functions with row locks and constraints: at most five people, no self-catch, one live hold, no duplicates, the 30-minute Mallow and the 24-hour homecoming by the scheduler, accurate counts. Differential-tested against the reference engine `core/relay.js` | **Supabase and Cloudflare themselves.** The same code runs against a local Postgres 16 and a local copy of Supabase Auth's endpoints. The real Edge Function entry point also runs under Deno, through a local stand-in for PostgREST, with the full E2E passing through it. The staging topology is rehearsed across two hosts. The real platform needs the owner's accounts; `staging:deploy`, `staging:check` and `staging:e2e` then prove each piece there (`docs/STAGING_CLOUD.md`) |
| Sign-in by email code, invitation (hashed, expiring, use-limited, rate-limited) and 18+; the same account on any device; identities ready for a future Hushmallow login | **Email delivery.** The local copy prints codes; real people need a custom SMTP provider (owner's approval) |
| RLS on every table with no grants: browsers reach nothing directly. Words encrypted (AES-256-GCM) before they reach the database | |
| The Mallow from Hushmates' own library, fitted to the words, the label and the Mallow's voice; AI behind a server-side switch with monthly AUD caps, daily limits and an atomic budget hold | **AI is off** (no provider configured, A$0 cap), as the owner asked |
| Reports, automatic pausing, blocking, withdrawal, restricted accounts; the safety desk for moderators, with an activity log; a draft escalation procedure (`docs/ESCALATION.md`) | The independent safety review (Tier A, `docs/REVIEWS.md`) and named desk readers |
| Export and deletion (words, account and sign-in); retention by schedule | |
| Crisis support with Australian services, reviewed wording pending | |
| | Changes reach the app by polling every 20 s; Realtime and push notifications later |

## Where things are

```
app/         the customer app: index.html, app.js (sign-in, invitation, then the scenes), config.json (where the backend is)
staff/       the safety desk: index.html, desk.js, desk-guide.js (decisions and urgent guidance)
client/      supabase-auth.js (email-code sign-in), functions-link.js (the link to the Edge Function), relay-client.js (one person's view)
supabase/    migrations/ (schema, rules, the API), functions/hushmates (the Edge Function entry), functions/_shared (gateway, JWT,
             field encryption, the Mallow, Another Angle adapter, vendored shared code), config.toml, local/ (the Auth copy's tables)
server/      dev-stack.mjs (everything locally), auth-emulator.mjs (local copy of Supabase Auth), server.mjs (static host; dev routes),
             admin.mjs (invitations, settings, ops), migrate.mjs, pg-db.mjs, app-files.mjs (what each page may load), main.mjs
core/        relay.js (the reference engine), feeling-safety.js (screening, crisis support), perspectives.js (the Mallow library),
             relay-config.js, relay-messages.js, export-format.js, text-policy.js, relay-rules.js, relay-seed.js (lab identities)
ui/          device.js, orb.js, sky.js, sound.js, mallow.js, atmosphere.js, motion.js, kit.js, dom.js
ui/relay/    the scenes: sign-in, invite, welcome, release, support, catch, journeys, returned (homecoming), share, you, your-data, away
styles/      world.css, relay.css, hushfold.css, relay-scenes.css, app.css, staff.css, lab.css
lab/, net/   the lab (developers and testers only)
tests/       the reference engine, the real database (differential, races, access), sign-in, the Mallow, ops, access control,
             build, the app's link, and the regression tests from each independent review
tools/       build-app.mjs (app and desk builds, scan, deploy config), app-shots.mjs (end to end), sync-edge.mjs, shots.cjs (lab QA),
             pack-site.mjs (the static host's folder), staging-secrets.mjs, staging-preflight.mjs, staging-check.mjs (the real
             project, checked from outside), recovery-drill.mjs (a backup restored and read), safety-eval.mjs (the screen against
             a reviewer's labels; --sample --display-ids for the Tier A sheet, --probe for the Tier 0 probe), staging-deploy.mjs (the guarded deploy), staging-env.mjs
             (secrets from a root, SQL and keys through the Management API), staging-e2e.mjs (real browsers on staging;
             --rehearse locally), cost-model.mjs (costs by scale)
server/      … edge-local.ts (the real Edge Function under Deno), postgrest-emulator.mjs (a local stand-in for PostgREST)
docs/        LAUNCH_READINESS.md, STAGING_CLOUD.md, STAGING.md, DECISIONS.md, REVIEWS.md, RISKS.md, READINESS.md, COSTS.md,
             CRISIS_DETECTION.md, ESCALATION.md, BACKEND.md, ACCESS.md, RELAY.md, SAFETY_AND_PRIVACY.md, SCENES.md,
             clinical/ (the blind phrasing sheet and the Tier A sample), evidence/, screenshots/
v1-messaging/  the superseded private-messaging prototype (archived)
```

## Boundaries kept

- Nothing in the existing Hushmallow app was changed:
  - the main app's Reframe engine (`src/ultra`) is used read-only (and copied byte for byte next to the Edge Function);
  - no production Supabase project, auth, tables or policies were touched, and Hushmates' sign-in is a separate, isolated project;
  - no Cloudflare settings or Framer publication were touched;
  - Account 1's Another Angle service was only read. Its adapter is written but never called (AI off, nothing configured).
- No secrets in the browser (the build refuses them). The data keys live only in the Edge Function's secrets. No paid
  services, AI calls or email providers were used; nothing was deployed.
- **Next steps need the owner** (`docs/DECISIONS.md`, `docs/LAUNCH_READINESS.md` §4):
  - the staging accounts and the environment's secrets (`docs/STAGING_CLOUD.md`). The developer's session then deploys and verifies staging;
  - Tier 0 and then a Tier A quote for the independent safety review (`docs/REVIEWS.md`). No review spend is authorised yet;
  - the privacy basics, an email provider, and the beta's plan, before testers outside the team;
  - the legal, accessibility and security reviews, before a public launch;
  - the final approval for launch.
