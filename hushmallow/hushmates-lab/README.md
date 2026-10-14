# Hushmates 2.0 · The Feeling Relay (lab prototype)

> **Hushmallow — A softer space for feelings.**
> **Hushmates — Send a feeling. See it differently.**
> ONE FEELING. FIVE HUMAN PERSPECTIVES. BACK TO YOU.

**Status: a playable prototype, waiting for the owner's approval. Nothing is
integrated with or deployed to production.**

There are two experiences, kept strictly apart (`docs/ACCESS.md`):
- **The customer app** (`app/`): invitation, welcome, Release, Catch, My
  journeys, Returned, You & safety, Your data. It is served by the Hushmates
  server (`server/`), which signs people in by invitation and keeps every rule
  on the server. Its production build (`tools/build-app.mjs`) contains nothing
  for developers, and is refused if it would.
- **The lab** (`index.html`, `lab/`): the Control room, scenarios A/B/C, two
  test phones, seven simulated test identities, a dev clock and an in-page
  demonstration service. It is for developers and authorised testers only. A
  development server shows it only with a tester key, and a production server
  has no lab at all.

Neither touches production: no production data, no real backend, nothing
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

**The customer app** (as customers get it):

```bash
# from the repository root (the folder that contains hushmallow/)
node hushmallow/hushmates-lab/tools/build-app.mjs           # → hushmallow/hushmates-lab/dist/app (scanned)
HUSHMATES_INVITES="CODE-ONE,CODE-TWO" node hushmallow/hushmates-lab/server/main.mjs --mode production --port 8080
# open http://127.0.0.1:8080/app/ and join with an invitation code
```

**The lab** (developers and testers):

```bash
# a development server: the app at /app/, and the lab at the /lab/?key=… address it prints
HUSHMATES_TESTER_KEY="<at least 16 characters>" node hushmallow/hushmates-lab/server/main.mjs --mode development --port 8090

# or, on your own machine only, the lab as a plain page
python3 -m http.server 8000
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

```bash
node --test hushmallow/hushmates-lab/tests/*.test.mjs                 # relay, access control, build, your data
node --test hushmallow/hushmates-lab/v1-messaging/tests/*.test.mjs    # 32 (archived v1)
node hushmallow/hushmates-lab/tools/app-shots.mjs <out-dir>           # the customer app: screens + content audit
node hushmallow/hushmates-lab/tools/shots.cjs <out-dir> http://localhost:8000   # the lab: interface QA
```

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

The QA tool captures 30 scenes at 390 × 844, 375 × 812, 320 × 568, 768 × 1024
and 1280 × 860 and audits each one inside the phone. It plays all three
demonstrations through the interface, releases a feeling with the keyboard
alone, checks reduced motion really reduces motion, repeats the demonstrations
with reduced motion, and fails on any console error. Results of the last run are below and in `docs/screenshots/qa-report.json`.

**Latest run (this commit's code):**

| Check | Result |
|---|---|
| Relay tests | 124 pass, 0 fail, 0 skipped (the optional live Another Angle checks ran against a local harness in mock mode) |
| Archived v1 tests | 32 pass |
| Scenes × sizes | 30 scenes at 390 × 844, 375 × 812, 320 × 568, 768 × 1024, 1280 × 860: no layout-audit findings (overflow, off-screen or clipped text, covered controls, small targets, tiny text, dock room) |
| Scenario A (five people) | every guide step ticked at all five sizes (10 of 10) |
| Scenario B (nobody, Mallow fallback) | every step ticked at all five sizes (6 of 6); the Mallow perspective shown as “A Mallow perspective · Automatically generated” with the lab tag “Reframe library (rule-based)” |
| Scenario C (two people, then expiry) | every step ticked at all five sizes (5 of 5); “2 Hushmates caught it before it came home.” |
| Keyboard | a feeling released with Tab, typing, Space and Enter; focus visible on every stop |
| Reduced motion | no long animations during the release, the welcome doesn't advance on its own, all three scenarios complete |
| Console | no errors or warnings in any run |

The audit itself was checked against planted defects (it flags overflow,
off-screen and clipped text, covered controls and small targets). Screenshots
from this run are in `docs/screenshots/` (390 × 844 unless named), with the
share picture export and video frames.

## What's real, what's simulated

| Real (enforced, tested) | Simulated / mocked |
|---|---|
| Every relay rule, in `core/relay.js`, behind the Hushmates server's API (an allow-list of methods, JSON only, origin checks) | The server keeps state in memory or one JSON file; production needs Postgres (`RELAY.md` §5). In the lab the service runs in the page |
| Sign-in by single-use invitation, adult confirmation recorded by the server, HttpOnly cookie sessions; the lab only for a tester key, on development servers | Invitation codes stand in for real accounts until Supabase Auth; the lab's seven test identities exist only in the lab (`testMode`) |
| Consent: recorded, enforced by the service, required for circulation and resends; contributors' share consent | |
| Per-viewer views: nobody sees who wrote what; words are sealed until home | |
| Screening (shared Reframe safety lexicon plus Hushmates rules), support instead of release, before consent | Crisis resources are the app's existing copy, to be reviewed per region |
| Holds, expiry, fairness, idempotency, rate limits, budgets, resend limits | Time: a dev clock moves the service's clock |
| The Mallow fallback logic: opt-in, 30 minutes, one generation, caching, labels, budgets, safety handling, the separate section | **No live AI.** Mallow perspectives are a labelled canned example, the Reframe library, or Another Angle in mock mode |
| Reports, the moderator queue and its actions, blocking, Your data (a summary and a privacy-safe file), deletion | Moderators join with a staff invitation; the safety desk interface exists only in the lab; no staffing, no notifications |
| The interface: every scene, motion and sound; the share picture and video, made on the device | Push notifications ("tell me when it comes home" is only a saved preference); posting a share story is left to the person |

## Where things are

```
app/         the customer app: index.html, app.js (one person, one device, the Hushmates server)
server/      server.mjs (production and development modes, invitations, sessions, API, lab gate), app-files.mjs (what the app may load), main.mjs
core/        relay.js (the rules, server-side), relay-rules.js (tuning, server-only), relay-config.js (labels and shown limits, shared),
             feeling-safety.js, text-policy.js, perspectives.js (providers, server-only), relay-seed.js (lab test identities)
net/         local-network.js: the lab's simulated network (latency, offline, lost replies, allow-list)
client/      relay-client.js: one person's view of the relay; http-link.js: the app's link to the server
ui/          device.js, orb.js, sky.js, sound.js, mallow.js, atmosphere.js, motion.js, kit.js, dom.js
ui/relay/    the scenes: invite, welcome, release, support, catch, journeys, returned (homecoming), share (+ share-render), you,
             your-data, away; parts.js (room, stage, thought cloud, speech, consent row, privacy details), common.js (dock, header, sheets)
styles/      world.css (landing-page tokens and kit), relay.css (orb, sky, dock), hushfold.css (the 2.0 rooms), relay-scenes.css, app.css, lab.css
lab/         lab.js: the two phones, control room, guide, autoplay, fixtures; lab-notes.js: notes for testers inside the phones
tests/       relay, attacks, 2.0 rules, the adversarial reviews, access control, build, your data, audit fixes
tools/       build-app.mjs (the customer build and its scan), app-shots.mjs (customer QA), shots.cjs (lab QA), preview.mjs
docs/        ACCESS.md (the two experiences), RELAY.md (architecture, Supabase plan, costs), SAFETY_AND_PRIVACY.md, SCENES.md, screenshots/
v1-messaging/  the superseded private-messaging prototype (archived; its tests still pass)
```

## Boundaries kept

- Nothing in the existing Hushmallow app was changed:
  - the main app's Reframe engine (`src/ultra`) is imported read-only;
  - no production auth, Supabase tables or policies, Cloudflare settings or Framer
    publication were touched;
  - Account 1's branch and its Another Angle service were only read, and run
    locally.
- No secrets in the browser, no paid AI calls, no live secrets configured. The
  proposed pilot keeps the service-role key and any provider credentials inside
  one Edge Function, and enforces ownership, concurrency and contribution rules
  in Postgres (`docs/RELAY.md` §5).
- **Next step needs approval:** production integration (a new Supabase project,
  Edge Function, auth, and the Another Angle service agreement).
