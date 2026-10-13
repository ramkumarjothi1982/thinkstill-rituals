# Hushmates 2.0 · The Feeling Relay (lab prototype)

> **HUSHMATES — SEND A FEELING. SEE IT DIFFERENTLY.**
> One feeling. Five perspectives. Back to you.

**Status: a playable prototype, waiting for the owner's approval. Nothing is
integrated with or deployed to production.**

Everything runs in the page:
- seven simulated, clearly labelled test identities;
- an in-page demonstration service;
- no real backend, no real people, no production data.

`tools/build-site.sh` copies only `src/` and selected `assets/`, so this folder never
ships with the app.

Someone releases a feeling in their own words. Their Mallow catches it, squeezes it
into a glowing orb and lets it go. Up to five different people, who chose to "let
feelings find" them, catch it one at a time. Each offers a possibility, not a
verdict, and the orb gains a petal of light. After five perspectives, or within a
day, it comes home, unfolds, and the author keeps what helps.

If nobody catches it and the author allowed it, a Mallow can offer one labelled
perspective. It is never presented as a person.

## Run it

```bash
# from the repository root (the folder that contains hushmallow/)
python3 -m http.server 8000
# open http://localhost:8000/hushmallow/hushmates-lab/index.html
```

**The lab layout**
- **Phone A** is the author, MoonMallow.
- **Phone B** is a catcher. Pick any of six test identities: CloudMallow,
  StarMallow, FernMallow, DreamMallow, PebbleMallow, EmberMallow.
- SafetyTeam, a moderator test identity, works the **safety desk**.
- On a phone-sized screen, the bar switches between Author and Catcher, and
  **Control room** opens the panel.

**The control room**
- **1 · Five perspectives:**
  1. MoonMallow releases *"My friend hasn't replied. I think they're avoiding
     me."*
  2. Five catchers each catch it and type a perspective. "Type it for me" inserts
     words written for the lab; you still press the button.
  3. It comes home and MoonMallow keeps one.
  4. EmberMallow then finds nothing: no sixth person.
- **2 · Mallow fallback:**
  1. MoonMallow releases a second feeling with the Mallow allowed.
  2. You move the **dev clock** on 30 minutes and ask the Mallow.
  3. Then +24 hours: it comes home with that one labelled perspective.
- **The steps tick off from the service's real state.** "Play this scenario"
  drives the real interface; "Reset demo" starts over.
- **Dev clock:** +5 min, +30 min, +3 h, +24 h, back to now.
- **Mallow perspective source:**
  - **canned demo example** (default, labelled; no AI key is configured);
  - **Reframe library** (the existing rule-based engine, labelled "not AI");
  - **Another Angle server** (Account 1's service run locally, labelled AI only if
    it reports a real model).
- **Online / Offline** on each phone simulates losing the connection.
- Lab state is saved in this browser (`localStorage`); add `?fresh` to the URL to
  start clean once.

To try the Another Angle option, run that service's local harness from its own
folder (`npm run harness -- --serve 8790`). It accepts the lab served from
`http://localhost:8000`. Without a key it runs in mock mode, and the lab labels its
answers "demo example, not live AI" (checked in a browser: model `angle-v5:mock`, no
console errors). Never set its real provider key for the lab: that costs money and
needs approval.

## Test it

```bash
node --test hushmallow/hushmates-lab/tests/*.test.mjs                 # 83 relay tests
node --test hushmallow/hushmates-lab/v1-messaging/tests/*.test.mjs    # 32 (archived v1)
node hushmallow/hushmates-lab/tools/shots.cjs <out-dir> http://localhost:8000   # interface QA
```

The relay tests cover:
- the five-person cap and the atomic last slot;
- expiry, idempotency, fairness and screening;
- privacy both ways, the 24-hour return and choices;
- reports, blocking and data deletion;
- the Mallow fallback (opt-in, human-first, one generation, labels, budgets,
  failures);
- a hostile client through the network layer.

37 of them were written by independent adversarial reviewers to fail on the code
they reviewed. They all failed, the defects were fixed, and they stay as regression
tests.

The QA tool captures 20 scenes at 390 × 844, 375 × 812, 320 × 568, 1280 (two phones)
and 1280 (one phone). It plays both scenarios through the interface and fails on any
console error.

Screenshots from the final QA run (390 × 844 unless named otherwise) are in
`docs/screenshots/`, with the run's report in `docs/screenshots/qa-report.json`.

## What's real, what's simulated

| Real (enforced, tested) | Simulated / mocked |
|---|---|
| Every relay rule, in `core/relay.js`, through a network layer that only accepts JSON and an allow-list of methods | The service runs in the page and saves to `localStorage`; there is no server or database |
| Per-viewer views: nobody sees who wrote what; words are sealed until home | Sign-in: seven test identities, simulated tokens |
| Screening (shared Reframe safety lexicon plus Hushmates rules), support instead of release | Crisis resources are the app's existing copy, marked as a pilot placeholder |
| Holds, expiry, fairness, idempotency, rate limits, budgets | Time: a dev clock moves the service's clock |
| The Mallow fallback logic: opt-in, 30 minutes, one generation, caching, labels, budgets, safety handling | **No live AI.** Mallow perspectives are a labelled canned example, the Reframe library, or Another Angle in mock mode |
| Reports, the moderator queue and its actions, blocking, export, deletion | Moderators: one test identity; no staffing, no notifications |
| The interface: every scene, motion and sound in this folder | Push notifications ("tell me when it comes home" is only a saved preference) |

## Where things are

```
core/        relay.js (the rules), relay-config.js, feeling-safety.js, perspectives.js (providers), relay-seed.js, text-policy.js
net/         local-network.js: the simulated network (latency, offline, lost replies, allow-list)
client/      relay-client.js: one person's view of the relay
ui/          device.js, orb.js, sky.js, sound.js, mallow.js, atmosphere.js, motion.js, kit.js, dom.js
ui/relay/    the scenes: welcome, release, support, catch, journeys, returned (homecoming), share, you
styles/      world.css (landing-page tokens and kit), relay.css (orb, sky, dock, perspectives), relay-scenes.css, lab.css
lab/         lab.js: the two phones, control room, guide, autoplay, fixtures
tests/       relay, attacks, and the three adversarial reviews
tools/       shots.cjs (QA), preview.mjs (hosted preview packager)
docs/        RELAY.md (architecture, Supabase plan, costs), SAFETY_AND_PRIVACY.md, SCENES.md
v1-messaging/  the superseded private-messaging prototype (archived; its tests still pass)
```

## Boundaries kept

- Nothing in the existing Hushmallow app was changed:
  - the main app's Reframe engine (`src/ultra`) is imported read-only;
  - no production auth, Supabase tables or policies, Cloudflare settings or Framer
    publication were touched;
  - Account 1's branch and its Another Angle service were only read, and run
    locally.
- No secrets in the browser. The proposed pilot keeps the service-role key and any
  provider credentials inside one Edge Function.
- **Next step needs approval:** production integration (a new Supabase project,
  Edge Function, auth, and the Another Angle service agreement), as described in
  `docs/RELAY.md` §5.
