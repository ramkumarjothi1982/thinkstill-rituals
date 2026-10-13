# Hushmates 2.0 · The Feeling Relay (lab prototype)

> **Hushmallow — A softer space for feelings.**
> **Hushmates — Send a feeling. See it differently.**
> ONE FEELING. FIVE HUMAN PERSPECTIVES. BACK TO YOU.

**Status: a playable prototype, waiting for the owner's approval. Nothing is
integrated with or deployed to production.**

Everything runs in the page:
- seven simulated, clearly labelled test identities;
- an in-page demonstration service;
- no real backend, no real people, no production data.

`tools/build-site.sh` copies only `src/` and selected `assets/`, so this folder never
ships with the app.

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

```bash
# from the repository root (the folder that contains hushmallow/)
python3 -m http.server 8000
# open http://localhost:8000/hushmallow/hushmates-lab/index.html
```

**The lab layout** (everything outside the phones is lab chrome)
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
  | Canned development example (default; no AI key is configured) | "A Mallow perspective · Example for testing, not generated" | yellow "Lab · canned example" |
  | Reframe library (the main app's rule-based engine, no AI model) | "A Mallow perspective · Automatically generated" | yellow "Lab · Reframe library (rule-based)" |
  | Another Angle server (Account 1's service, run locally, unchanged) | "Automatically generated" only if it reports a real model with a server-side key; its mock mode is treated as a canned example | green "Lab · live AI response (test key)" or yellow "Lab · canned example" |

  The tags exist only because the lab sets `env.lab`; consumers never see them.
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
node --test hushmallow/hushmates-lab/tests/*.test.mjs                 # 118 relay tests
node --test hushmallow/hushmates-lab/v1-messaging/tests/*.test.mjs    # 32 (archived v1)
node hushmallow/hushmates-lab/tools/shots.cjs <out-dir> http://localhost:8000   # interface QA
```

The relay tests cover:
- the five-person cap, unique contributors, no self-reframe and the atomic last
  slot under simultaneous catches;
- catch expiry, journey expiry, early recall, idempotency, fairness, screening;
- consent enforcement, zero-human and partial returns, send it out again, real
  human counts;
- privacy both ways, deletion and export, reports and blocking, high-risk words;
- the Mallow fallback (opt-in, human-first, one generation and dedupe, labels,
  budgets, failures, the separate section, Explore another angle);
- contributors' share consent;
- a hostile client through the network layer (forged and replayed requests).

55 of them were written by independent adversarial reviewers (three in 1.x, two
for the 2.0 rules) to fail on the code they reviewed. They failed, the defects
were fixed, and they stay as regression tests.

The QA tool captures 30 scenes at 390 × 844, 375 × 812, 320 × 568, 768 × 1024
and 1280 × 860 and audits each one inside the phone. It plays all three
demonstrations through the interface, releases a feeling with the keyboard
alone, repeats the demonstrations with reduced motion, and fails on any console
error. Results of the last run are below and in `docs/screenshots/qa-report.json`.

_The latest run’s results are recorded at the end of the 2.0 work (see below)._

## What's real, what's simulated

| Real (enforced, tested) | Simulated / mocked |
|---|---|
| Every relay rule, in `core/relay.js`, through a network layer that only accepts JSON and an allow-list of methods | The service runs in the page and saves to `localStorage`; there is no server or database |
| Consent: recorded, enforced by the service, required for circulation and resends; contributors' share consent | Sign-in: seven test identities, simulated tokens; the adult/invitation check is a tick box |
| Per-viewer views: nobody sees who wrote what; words are sealed until home | |
| Screening (shared Reframe safety lexicon plus Hushmates rules), support instead of release, before consent | Crisis resources are the app's existing copy, to be reviewed per region |
| Holds, expiry, fairness, idempotency, rate limits, budgets, resend limits | Time: a dev clock moves the service's clock |
| The Mallow fallback logic: opt-in, 30 minutes, one generation, caching, labels, budgets, safety handling, the separate section | **No live AI.** Mallow perspectives are a labelled canned example, the Reframe library, or Another Angle in mock mode |
| Reports, the moderator queue and its actions, blocking, export, deletion | Moderators: one test identity; no staffing, no notifications |
| The interface: every scene, motion and sound; the share picture and video, made on the device | Push notifications ("tell me when it comes home" is only a saved preference); posting a share story is left to the person |

## Where things are

```
core/        relay.js (the rules), relay-config.js (limits, labels), feeling-safety.js, perspectives.js (providers), relay-seed.js, text-policy.js
net/         local-network.js: the simulated network (latency, offline, lost replies, allow-list)
client/      relay-client.js: one person's view of the relay
ui/          device.js, orb.js, sky.js, sound.js, mallow.js, atmosphere.js, motion.js, kit.js, dom.js
ui/relay/    the scenes: welcome, release, support, catch, journeys, returned (homecoming), share (+ share-render), you;
             parts.js (room, stage, thought cloud, speech, consent row, privacy details), common.js (dock, header, sheets)
styles/      world.css (landing-page tokens and kit), relay.css (orb, sky, dock), hushfold.css (the 2.0 rooms), relay-scenes.css, lab.css
lab/         lab.js: the two phones, control room, guide, autoplay, fixtures
tests/       relay, attacks, 2.0 rules, and the five adversarial reviews
tools/       shots.cjs (QA), preview.mjs (hosted preview packager)
docs/        RELAY.md (architecture, Supabase plan, costs), SAFETY_AND_PRIVACY.md, SCENES.md, screenshots/
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
