# Hushmallow — status and roadmap

Snapshot of the whole project: what is built and verified, what is known to
be imperfect, what is left to build, and what needs you. Estimates are
working time for the build-and-test work, not calendar time.

---

## 1. Done

### Living Mallows (complete, verified, fixes applied)
| Item | Evidence |
|---|---|
| Seven approved transparent cut-outs (`assets/mallows/`) | Independent check: true alpha, 1 component each, nothing cut off (alpha re-assembles the source sheet), interior pixels identical to your art, no halos, no neighbour bleed at fused seams. |
| Face-cleaned bodies and sprites (`assets/rig/`) | Alpha byte-identical to the approved PNGs. Inpainting rebuilt to remove a repeating tile pattern; lag-20 autocorrelation went from 0.45–0.87 to about 0. |
| Facial rig (`src/mallows/rig.js`) | Eyes, eyelids, pupils/irises, brows, mouth, cheeks, blush, tears and sweat really change. The approved art shows untouched at rest. Soft-body squash, stretch, lean and jiggle. |
| Expressions (`src/mallows/expressions.js`) | 28 presets, including all 20 you listed plus disappointed and disgusted. Intensity curve, mixed emotions, per-Mallow personality, ten character states. |
| Touch | Tap, double tap, hold to squeeze, drag, flick, release, plus idle breathing, blinking, yawns and sighs. Reduced motion is supported. |
| Mallow Emotion Studio (`studio.html`) | Every Mallow × expression, intensity, blend, the 10 transition tests, touch, white/dark/realm/alpha backgrounds, small and large sizes. |

### Hushmallow V2 app (built; both flagship experiences play end to end)
| Item | Status |
|---|---|
| App shell | Home (living Hushfold, "What's on your mind?", Ultra entry), Express (type or tap, A–Z explorer, intensity), Meet a Mallow, ritual host, Notice/finish, Plans, Settings, Mallows, Support. Real back/forward history. |
| Two paid tiers (`src/app/entitlements.js`) | Enforced in code: the ritual host refuses without the right tier, the recommender filters by tier, and Ultra code loads only via `loadUltra()`. Test purchases in a browser; StoreKit bridge hook for the App Store build. |
| No AI | Rule-based feeling finder that only *suggests*; the person confirms. Every line and ritual is authored. |
| A–Z emotion taxonomy (`src/data/emotions.js`) | 334 terms in 16 atlas families. Every atlas term is present, with aliases, typo-tolerant search under 1 ms, and an A–Z index. |
| Recommender (`src/engine/recommend.js`) | Deterministic scoring with plain-English reasons; persistent shuffle-bag so nothing repeats until the pool is used; favourites; feedback. |
| **Experience A — Paid** | Glitzi's *Static to Signal*: scribble the static out, ground it with three slow breaths, flick away what isn't yours, name the need, choose a next move. The storm clears. |
| **Experience B — Ultra** | Zuzu's *Another Angle*: safety check, situation match, physically split fact from assumption, thought X-ray, evidence orbit, perspective portal, next move with conversation practice, star map. 22 authored frameworks plus a general one; 23 tests pass. |
| Hushfold realms (`src/world/`) | Seven procedural realms that respond to mood and transform at a ritual's finale. |
| Sound and haptics | Synthesised per-Mallow sound identities, ritual sounds and realm ambience; haptics with a native-bridge hook. |
| Support | Free, one tap away, crisis detection routes to real people. |

---

## 2. Known issues (found in verification, not yet fixed)

Mallow Emotion Studio (developer/review tool, not the app):
- On phones the stage scrolls out of view while you use the controls; the readout and hint pills overlap.
- Choosing an emotion chip with the keyboard loses focus.
- Size-test cells don't render at their labelled pixel sizes.
- Switching Mallow very fast while a realm loads can leave a second, hidden rig.
- The readout is replaced by "idle" names; character-state chips don't show as selected; the realm ignores the studio's reduced-motion toggle.
- An invalid `?mallow=` id gives a blank stage; the roster is cut off at some desktop widths.

App:
- The Paid library has only **one** ritual (anger). Other feelings honestly get "I don't have the right ritual for this one yet". This is the most important gap — see roadmap item 1.
- Swipes that start on the Mallow's stage don't scroll the page (intentional, so drags reach the Mallow).

---

## 3. Still to build

| # | Work | Estimate |
|---|---|---|
| 1 | **Paid ritual breadth**: 6–8 more genuinely different rituals so every feeling family has a fit. Planned: Blubi (sadness, grief, hurt, loneliness), Loomi (anxiety, worry, overwhelm), Noomi (exhaustion, burnout, can't sleep), Boppo (joy, gratitude, pride — savouring), Pipzi (restless or nervous energy), Zuzu paid (confusion, overwhelm — five-senses grounding), and a universal *Name It* ritual any Mallow can lead. | 4–6 h |
| 2 | Ultra quick-trick library: adapt your 1,000 ThinkStill rituals (Mallow mapping, emotion tags, a card-style interactive module). | 1–2 h |
| 3 | Tests for the feeling finder, recommender, entitlements, schema and library. | ~1 h |
| 4 | Full phone audit at 320, 375, 390 and 430 px wide: safe areas, scrolling, clipping, screen reader, keyboard, back/forward, backgrounding, sound-off, reduced motion. Fix what it finds, including the Studio issues above. | 1–2 h |
| 5 | Docs: Hushfold world bible, ritual authoring guide, test report. | ~1 h |

---

## 4. Needs you (can't be done from here)

1. **App Store and payments.** An Apple Developer account, the four
   subscription products in App Store Connect
   (`hushmallow.paid.monthly/yearly`, `hushmallow.ultra.monthly/yearly`,
   or your own IDs), and a native iOS wrapper (e.g. Capacitor or a
   WKWebView shell) that implements the `hushStore` bridge with StoreKit 2.
   It must verify receipts on device or on a server; web-only enforcement
   can always be bypassed by a determined user.
2. **Editorial review.** Rituals, Reframe frameworks and Mallow lines are
   marked `draft` until a person signs them off, ideally including someone
   with wellbeing or clinical-content experience for the safety copy and
   crisis lines in your launch countries.
3. **Hosting / Framer.** Decide where V2 lives (static hosting, or embed in
   Framer via an iframe/code component) and when to retire the old Framer
   console. The old app is untouched until you switch.
4. **Listening test.** All sounds are synthesised and were checked by
   measurement (levels, clicks, leaks), not by ear.
