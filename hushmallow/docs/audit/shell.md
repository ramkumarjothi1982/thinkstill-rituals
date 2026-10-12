# shell

## Summary
APP SHELL AUDIT (read-only; measured in Chromium at 390x844 with touch, DPR 2; scratch files in /tmp/claude-0/audit/shell/). Repo baseline: 69/69 tests pass (`node --test hushmallow/tests/*.test.mjs`). The shell is a small, well-factored vanilla ES-module app. main.js (178 lines) builds store/prefs/ent at import time (src/app/main.js:15-17), wraps audio in a pref-gated Proxy that never throws (:24-29), lazy-loads audio and haptics (:107-113), and runs a hash router with a real history stack. `app.go(name, params, {replace, fromPop})` (:56-76) awaits the scene module, calls the old view's leave(), does `sceneEl.replaceChildren()`, calls `mod.default(app, params)` and then `view.enter()`. popstate honours `current.blockBack` (:79-85). SCENES (:87-99) has 11 dynamic imports. 'home' is the only point where an update is applied (:52, :57, :73, plus the visibilitychange listener at :102). One persistent stage sits under the scenes: #world z0 is the realm canvas, cross-faded by world.setRealm (src/app/world.js:30-54). #mallow-layer z1 is one MallowRig, placed with CSS vars --mx/--my/--ms (world.js:90-105; app.css:13-17). #fx-layer z2 is pointer-events:none unless `.live` (app.css:18-19); the V3 host claims it full-screen (src/v3/host.js:87-90). #scene z3 is pointer-events:none, but `#scene > * { pointer-events:auto }` (app.css:20-22). #sheet-root z10 holds modal sheets with a backdrop. The bubble is z4 and the toast z20.

KEY MEASURED FINDINGS:
(a) You cannot touch the Mallow on the current home screen, even though it says "Psst — you can poke me". At its body centre (195,445), elementFromPoint returns `div.home.scene-enter`: the 100%-height home root gets pointer-events:auto from app.css:22. A tap, a double tap and a 0.9 s hold sent ZERO events to the rig. With `.home` set to pointer-events:none in the page only (no repo change), the same hold fired squeeze, then release. The ritual host already uses the right pattern, `.ritual-ui{pointer-events:none!important}` (app.css:146-148). The Hushfold root must copy it.
(b) Boot pulls 43 JS files (835 KB) and 5 images (871 KB) before home is ready, in 0.4-0.8 s locally. The JS includes src/v3/data/catalog.js (167 KB, via data/rituals.js:11 → v3/rituals.js:5), all 7 realm modules (~283 KB, eager imports at world/realm.js:16-22), emotions.js (59 KB) and audio.js (77 KB). The favicon/apple-touch-icon is the 325 KB pipzi.png (index.html:12-13). rAF ran at 51/s under swiftshader.
(c) The input form today is a giant panel: the express card is 637 px tall (75% of 844) and starts at y=244, so it runs past the screen bottom.
(d) The free safety detector, interpret() (engine/interpret.js:70-75, 117-118), misses three phrases that the Ultra-only checkSafety (ultra/reframe-engine.js:74-95) catches: "My friend said she wants to kill herself" (none vs crisis), "I want to disappear forever" (none vs crisis) and "my partner threatens me" (none vs care). Both detectors miss "nobody would miss me" and "thinking of ending it". The express crisis wiring itself works: "I want to kill myself" opened the urgent sheet "You're not alone in this", and no typed text reached localStorage.
(e) Haptics prefs leak. world.setMallow passes `haptics: prefs.get('haptics')` only at creation and returns early for the same id (world.js:57, 65). rig.buzz calls navigator.vibrate directly (rig.js:67-74), and prefs.onChange (main.js:114-118) ignores 'haptics' and 'lowStim'. So switching haptics off does not stop the squeeze buzz until the Mallow changes. Also `particles: !prefs.get('lowStim') || true` is always true.

JOURNEY TODAY:
- Boot replaces the URL with #home and sets intro = !seenIntro.
- HOME (scenes/home.js) owns the Mallow by time of day (:11-17) or app.state.homeMallow, the ‹ › switcher (cycle :65-76: setRealm + setMallow + hello line), the topbar (brand; journey/saved/library only when paid :39-41; Mallows; settings), the CTA and the Ultra card. The CTA reads "What's on your mind?" with a plan, or "Start Hushmallow" without one (start :53-58 → plans if no 'paid'). The Ultra card goes to angle, or to plans focus=ultra (:59-64).
- EXPRESS owns the 600-char textarea, interpret() debounced at 260 ms, urgent support once (:57), suggestion chips (auto-select ≥0.6, max 4), the A–Z explorer sheet, the intensity slider and the photo tray (0-6, memory only). It writes app.state.input = {text, emotions, intensity, contexts, desires, safety} (:116-121) and goes to encounter.
- ENCOUNTER owns the deal: planOptions + round (no repeats per round, fresh-round toast, :32-41), the lead Mallow and realm, the encounterLine, the reason chips, inline photo add, begin → rec.markDealt → ritual (:116-122), and the Ultra door for ultra members (:126-130).
- RITUAL owns entitlement enforcement (:45-53), the module load (PAID_MODULES / v3 host / loadUltra), round.mark on start (:65), run(ctx), and markPlayed + logFinish when completed and saveHistory is on (:70-76; ids and feeling families only). blockBack = confirmLeave (:82). leave() aborts and clears fx (:89). Then it replaces itself with landing.
- LANDING owns the optional check-in, rec.markCompleted and setFelt (:48-73, gated by saveHistory), support on 'heavier', Finish→home, Another→encounter, the Save favourite and a privacy-safe share PNG (:84-115).
- PLANS shows two plan cards and purchase() (always 'monthly', :21), restore, the support link and the test-note (:41-43).
- MALLOWS shows 7 tiles (→ homeMallow → home) and the favourites list.
- SETTINGS: sound/volume/haptics/motion/lowStim, saveHistory/saveWords, Delete everything (clearAll keeps the entitlement, :51-55), plan, Remove test plan, the about text, support lines, the BUILD/RUNNING version, and a studio link on localhost.
- ANGLE is a gate: no ultra → plans; otherwise it sets the another-angle ritual and goes to ritual.
- LIBRARY is paid-gated (:114): saved and all tabs, filters, paging of 80.
- JOURNEY summarises local entries.
- SUPPORT is a sheet, openSupport(app, {urgent}) (support.js:12-27), opened from express, landing, plans, settings, the V3 host help button (host.js:84) and Another Angle (another-angle.js:81-90).
- Dev labs (?lab=, ?v3=, ?engine=) work on localhost only and grant a test tier (main.js:131-175).

HOW THE HUSHFOLD SHOULD PLUG IN: Register the new scene under the existing name 'home'. Every `app.go('home')` (landing finish, ritual leave, settings delete, plans buy, mallows meet) and the update logic then land in the Hushfold with no other edits. Keep the old home as 'classic' for QA and rollback. The Hushfold owns #fx-layer (.live, one full-screen canvas, one multi-pointer input router) and keeps #world as the realm backdrop. It keeps or enlarges #mallow-layer, or renders the hero Mallow through a MallowTouch mesh that reads the rig's skin. Its #scene root is pointer-events:none!important, and only these take touches: the topbar, the side-panel handle and panel, the subtitle control pill and the compact input overlay. #sheet-root stays for support and confirm sheets only, because openSheet's backdrop would block play. Hushflow worlds run inside the home scene (no route change, no scene teardown). The Memory Garden is its own scene, 'garden'. Leaving the Hushfold must restore the layer size, showMallow, fx, live class, subtitles and photoSession, so the other 11 scenes keep working unchanged. The Hushfold must also tell the router when it is safe to reload for an update: otherwise visibilitychange → checkVersion → moveTo would reload mid-world or wipe typed text, because people now stay on home for long sessions.

Plans: keep ids 'paid' and 'ultra', RANK, flags(), the native bridge contract and every productId (hushmallow.paid.monthly/yearly, hushmallow.ultra.monthly/yearly). Only name, tagline, includes and badges change, plus an annual toggle. All new private data goes through app.store (prefix hm2:, entitlements.js and storage.js), so Delete everything keeps working.

The Framer iframe architecture already meets the brief's Framer constraints. The embed is 94 lines (~3 KB), imports only react and framer, and has no app code, assets or base64. It needs only lowercase brand text (lines 45, 46, 56, plus header comments) and doc updates. Rough sizing for the shell work only (MallowTouch physics, the two world engines and the garden animation are sized by other audits): brand and plans ~0.5 day, router and world seams plus fixes ~0.5 day, Hushfold scene shell (stage, router, subtitles, overlay, panel, safety) ~2-3 days, flow engine, registry, stores, garden scene and tests ~1.5-2 days, typography ~1-1.5 days, QA at 375/390/430/desktop and in the Framer embed ~1 day. That is about 6-8.5 focused engineering days of shell work.

## Keep
- src/app/main.js:56-85 router (app.go/app.back/popstate/blockBack) and :87-99 dynamic SCENES map. Real history, per-scene code-splitting, and the basis for adding 'garden'/'classic'.
- src/app/main.js:20-29 silent audio stub + Proxy that swallows audio errors and gates on prefs.sound (sound can never break a ritual); :35 app.haptic gate; :107-113 lazy audio/haptics import; :102 + :50-54 + update.js:11-33 + tools/site/forward.js + tools/build-site.sh:14-26 versioned deploys (v/<sha>/, version.json, cache-proof forwarder). Keep the update mechanism; add only a safe-point guard.
- src/app/main.js:131-175 devLab/v3Lab (localhost-only; ?v3=HM-0001&photos=3, ?engine=GE-07&law=3, &speed, &motion=reduce). Needed for QA sweeps; add a ?hushflow=<worldId> lab the same way.
- src/app/world.js:15-117 persistent stage API (setRealm crossfade, setMallow, setEmotion, setStage, react, place, fitBetween, showMallow, dim, mallowRect, setAudio, setReducedMotion). Every existing scene depends on it; extend it, don't replace it.
- src/app/ui.js:3-125 h/icon/iconBtn/openSheet/toast/say/clearBubble/wait/pick. openSheet stays for support/confirm; say() stays for ritual ctx.say and Another Angle.
- src/engine/storage.js:4-74 namespaced JSON store (prefix 'hm2:') with memory fallback and clearAll(). All new keys must use it so Settings → Delete everything (settings.js:51-55) wipes them.
- src/app/prefs.js:2-26 device-only prefs (sound, volume, haptics, motion system/reduced/full, lowStim, saveHistory, saveWords, seenIntro) + reducedMotion(). Extend DEFAULTS rather than adding a new settings store.
- src/app/entitlements.js:57-144: RANK, nativeBridge (window.HushNative.store / webkit.messageHandlers.hushStore, StoreKit 2), test provider (:105-117), restore, cancelTest, requireEntitlement, loadUltra (the only door to src/ultra/*). Product IDs at :30 and :43 must not change.
- src/app/config.js:7-21 TEST_PURCHASE_HOSTS + testPurchasesAllowed + BUILD. entitlements.js:82 resets a test plan off-host. Keep it all, including the 'Remove test plan' button (settings.js:42) and the plans test-note (plans.js:41-43).
- src/app/scenes/support.js:5-27 SUPPORT_LINES (emergency, findahelpline.com, Samaritans 116 123, 988) + openSupport(app,{urgent}). Free, one tap away, wording reviewed.
- src/engine/interpret.js rule-based feeling finder (CRISIS/CONCERN :70-75, interpret() :106, faceMix :208). This is the no-AI emotion suggestion used by express; reuse it in the Hushfold input overlay.
- src/engine/recommend.js:23-28 allowedFor + :30-166 deterministic shuffle-bag rotation (keyed pools, markDealt, favourites, feedback); next.js:10 planOptions; round.js:5-21 per-tier rounds. Reuse the same pattern for Hushflow world rotation.
- src/engine/journey.js:4-61 + played.js:3-14 local history (ids + families only, never words), shown on the Journey scene.
- src/engine/audio.js:1537-1618 synth-only engine (no files): play/ui/fx/hold/ambience/setAmbienceMood/stopAmbience, unlock on first gesture, rate limits, own pref key hm2:sound. Unknown realm ids fall back to the blue-drift bed (:1301). This is the app's 'music'.
- src/engine/haptics.js:16-89 bridge chain (HushNative.haptic → webkit.messageHandlers.haptic → navigator.vibrate) with per-kind rate limit.
- src/v3/photos.js:24-157 photoSession (memory only, MAX_PHOTOS=6, add/replace/remove/move/clear/release, pixel wipe), tray.js:7-42, mallow-cards.js:95-122 (seven-Mallow fallback). Privacy is enforced by test v3.test.mjs:217-221.
- src/ultra/another-angle.js (run(ctx,{frameworks,engine}), own checkSafety gate :81-90, sealed predictions stored only with prefs.saveWords under 'ultra.sealedPredictions' :31-41). This is Beyond's core capability.
- src/mallows/* (rig.js MallowRig API on/setEmotion/setStage/react/lookAt/destroy/loaded/skin, expressions, reactions, voices.js ENCOUNTER lines, registry.js MALLOWS) + assets/mallows/*.png + assets/rig/*.png: the approved seven-Mallow art and expression engine.
- src/world/realm.js:24-62 REALMS + :133 mountRealm handle (setEmotion/setMood/transform/pulse/setFocus/setReducedMotion/setLowStimulation/destroy), with photosensitivity pulse limits. Use it as the Hushflow backdrop layer.
- All existing scenes (express, encounter, ritual, landing, library, journey, mallows, settings, plans, angle) stay reachable, so the 1,000-ritual V3 library and the signature rituals still play from the side panel's Library.
- framer/HushmallowEmbed.tsx (94 lines, iframe only) + docs/FRAMER.md + .github/workflows/hushmallow-pages.yml (tests gate deploy at :30; build at :44).
- tests/core.test.mjs:71-84 (no fetch/remote URLs in src except version.json), :87-92 (Ultra gating), :118-120 (crisis); tests/v3.test.mjs:164-221 (photo limits/privacy, plan copy). Keep them passing; update the copy assertions together with the plan rename.

## Integration points
- src/app/main.js:87-99 SCENES: change `home: () => import('./scenes/home.js')` to `home: () => import('./scenes/hushfold.js')`; add `classic: () => import('./scenes/home.js')` and `garden: () => import('./scenes/garden.js')`.
- src/app/main.js:52 `if (newer && stack[stack.length - 1]?.name === 'home') moveTo(newer);` and :57 `if (newer && name === 'home') { moveTo(newer); return; }`: gate both with `(current?.safeForUpdate?.() ?? true)` and add `app.applyUpdateIfSafe = () => { if (newer && stack.at(-1)?.name === 'home' && (current?.safeForUpdate?.() ?? true)) moveTo(newer); }` for the Hushfold to call when it goes idle.
- src/app/main.js:79-85 popstate: reads `current?.blockBack` at event time, so the Hushfold can expose `get blockBack() { return overlayOpen || panelOpen ? closeTop : null; }`.
- src/app/main.js:114-118 prefs.onChange: add `if (k === 'haptics') app.world.setHaptics(v)` and `if (k === 'lowStim') app.world.setLowStim(v)`.
- src/app/main.js:31-40 app object: add `brand: BRAND` (from new src/app/brand.js). app.state.input must keep the express shape {text, emotions:[{id,confidence,intensity}], intensity, contexts, desires, safety:{level,reason}} (express.js:116-121) so angle/encounter/ritual/V3 host keep working.
- src/app/world.js:56-78 `setMallow(id, { entrance = true } = {})`: add an `interactive` option (passed to `new MallowRig(holder, {..., interactive})`), fix :65 `particles: !prefs.get('lowStim') || true` to `!prefs.get('lowStim')`, and add `setHaptics(b) { if (rig) rig.opts.haptics = b; }`.
- src/app/world.js:30-54 `setRealm(id, {emotion, intensity})`: add `crossfadeMs` (today fixed by app.css:12 900 ms and the :51 950 ms destroy) for Hushflow melts.
- src/app/world.js:108-113 mallowRect() uses a 22%/88% layer heuristic: add `bodyRect()` computed from rig.S, rig.BASE, mallow.bodyBox (the same maths as rig.js _hit ~:283-291) for subtitle avoidance and hit testing. Add `setLayerSize({w,h}|null)`, which sets the --mw/--mh CSS vars already read by app.css:13 but never written by JS.
- src/app/world.js `fx` (#fx-layer): the Hushfold mounts its canvas with `world.fx.replaceChildren(cvs); world.fx.classList.add('live')` (the same contract as v3/host.js:87-90) and must undo it in leave() (as ritual.js:89 does).
- src/ui/app.css:20-22 `#scene > * { pointer-events: auto; }`: the Hushfold root needs `.hushfold { pointer-events: none !important; }` with `.hushfold .hf-ui { pointer-events: auto; }` (the pattern of app.css:146-148). app.css:192-195 limits #scene to 520 px on desktop, so anchor the side panel to the viewport edge with position:fixed.
- src/mallows/rig.js:82-93 constructor opts / :277-356 single-pointer _bindPointer (one press.id) / :629-668 strip warp: the MallowTouch seam is a `headless` or `externalWarp` option, so _tick keeps updating expression params and rig.skin while the Hushfold draws the skin through a 2D mesh. Haptics must go through app.haptic, not rig.buzz (:67-74).
- src/engine/interpret.js:106 `interpret(text) → {emotions, suggestions, contexts, desires, intensity, safety:{level:'none'|'concern'|'crisis', reason}, acknowledgement}`: call it from the input overlay debounced at 260 ms (as express.js:51) and on submit.
- src/app/scenes/support.js:12 `openSupport(app, { urgent = false } = {})`: call with urgent:true once per overlay session on crisis (as express.js:57); also from the side panel and the world control strip (as host.js:84).
- src/ultra/reframe-engine.js:74-95 SAFETY + `checkSafety(text) → {reframeAppropriate, level:'none'|'care'|'crisis', category, message, ...}`; HARM_LEXICON/HARM_COPY live in src/ultra/frameworks.js (Ultra-gated), so they must be moved to a shared non-Ultra module before free code can use them.
- src/app/entitlements.js:27-53 PLANS: change `name`, `tagline`, `includes` only; keep `id` and `productIds`. :22-25 PAID_COUNT/LIBRARY_LINE can be dropped if the Flow copy no longer counts rituals (update tests/v3.test.mjs:209-215 together).
- src/app/entitlements.js:131 `requireEntitlement(ent, need)` and :136 `loadUltra(ent)`: the Hushflow engine's `startWorld()` must call `requireEntitlement(app.ent, world.tier || 'paid')`, and Beyond-only worlds and the Belief Mallow investigation must load through loadUltra or a sibling `loadBeyond(ent)`.
- src/app/scenes/plans.js:21 `ent.purchase(id, 'monthly')`: pass the selected period ('monthly'|'yearly'); productIds already contain yearly (entitlements.js:30, :43).
- src/app/scenes/settings.js:51-55 confirmClear → `app.store.clearAll()` keeps 'entitlement'. New hm2:* keys are wiped automatically; update the sheet copy to name the Memory Garden and saved worlds.
- src/v3/photos.js:141 `photoSession.release()` must run when a Hushflow world that used photos ends or the Hushfold leaves; nothing in src/hushfold/** may write photo data to storage (extend the test at v3.test.mjs:217-221 to the new folder).
- src/engine/audio.js:1588 `ambience(realmId, {mood})` + :1594 `setAmbienceMood(mood)`: Hushflow registry entries name an existing realm bed (REALMS list :37) plus a mood; unknown ids silently use blue-drift (:1301).
- src/world/realm.js:302-345 handle `setMood({agitation,heaviness,clarity,warmth})`, `transform(p)`, `pulse(kind,{x,y})`: world gameplay drives the backdrop through world.realm.
- tools/build-site.sh:17 `cp -r "$here/assets/mallows" "$here/assets/rig" "$here/assets/fonts" ...`: add assets/brand (and any new world art folder), or the new files 404 on Pages. The index.html sed at :18 rewrites new href="assets/…" / href="src/…" links automatically.
- index.html:5-25: add `<link rel="stylesheet" href="src/ui/hushfold.css">` and font preloads (rewritten by build-site.sh:18), lowercase title/description/noscript (:9, :10, :24), and small icons instead of the 325 KB pipzi.png (:12-13 and manifest.webmanifest icons).
- src/ui/tokens.css:3-8 @font-face (Fredoka only) and :41-48 font and size tokens: add self-hosted Nunito Sans / Manrope / Fraunces faces and the brief's size scale. External font URLs are not allowed (privacy promise docs/FRAMER.md:62-67; the core no-remote test scans src/**/*.js).
- framer/HushmallowEmbed.tsx:45-46 fallback text, :56 iframe title, :1 and :8-10 header comments (brand casing and '1,000 rituals' wording). Keep export name HushmallowEmbed and property `url`.

## Proposals
### 1. Make the Mallow touchable: scene-root pointer pattern (measured bug)
Today the home root div (home.js:36, height 100%) inherits pointer-events:auto from app.css:22 and swallows every touch over the Mallow. Measured: 0 rig events on tap, double tap and hold. The Hushfold root must be `h('div', {class:'hushfold'})` with CSS `.hushfold{position:absolute;inset:0;pointer-events:none!important}` and `.hushfold .hf-ui{pointer-events:auto}` on the topbar, panel, subtitle pill and input overlay only. Also apply it to classic home (`.home{pointer-events:none!important}` plus `.home>.topbar,.home .ask,.home .chips,.home .ultra-card,.home .mallow-switch button{pointer-events:auto}`) so the fallback screen tells the truth. Add a Playwright check to the QA sweep: elementFromPoint(world.mallowRect().cx, .cy) on home is the rig canvas or the Hushfold stage canvas.

### 2. Router: the Hushfold becomes 'home'; old home becomes 'classic'; add 'garden'
main.js:87-99: `home: () => import('./scenes/hushfold.js'), classic: () => import('./scenes/home.js'), garden: () => import('./scenes/garden.js')`. Boot (:121-123) is unchanged: `app.go('home', {intro: !prefs.get('seenIntro')}, {replace:true})`. Every existing `app.go('home')` now returns to the Hushfold (ritual.js:39/84/87, landing.js:81, plans.js:26, settings.js:42/54, mallows.js:31, encounter.js:77, angle via plans). The Hushfold view contract: `export default function hushfold(app, params) → { el, title:'', enter(), leave(), get blockBack(), safeForUpdate() }`. Keep `document.title` (main.js:74) as BRAND.brandName when title is empty. Hushflow worlds are internal states of this scene, so moving between worlds never calls app.go (no scene teardown, no fx wipe). The Memory Garden is a real route so Back works. Support stays a sheet.

### 3. Update-safe guard so a new deploy never reloads mid-play
The Hushfold is now where people stay. visibilitychange (main.js:102) → checkVersion → moveTo (update.js:28) would reload while a Thought Mallow, world or typed text is live. Change main.js:52 to `if (newer && stack.at(-1)?.name === 'home' && (current?.safeForUpdate?.() ?? true)) moveTo(newer);` and expose `app.applyUpdateIfSafe()`. The Hushfold's safeForUpdate() returns true only when no overlay text exists, no world is mid-progress (progress saved first), and no subtitle discovery is waiting for acknowledgement. When it returns to idle it calls app.applyUpdateIfSafe(). Keep :57 as is: navigating to home is a natural safe point. Effort ~1 h plus a test with a fake `current`.

### 4. World stage seams (src/app/world.js), all backward compatible
Add: `setLayerSize(size|null)`, which sets/clears --mw/--mh on #mallow-layer so the soft body has room to stretch (default min(86vw,430px)×min(56vh,470px) = 335×470 at 390×844). `bodyRect()`, the true body box from rig.S, rig.BASE and mallow.bodyBox, to replace the mallowRect 22–88% heuristic in new code. `setRealm(id,{emotion,intensity,crossfadeMs=900})` with matching destroy delay. `setMallow(id,{entrance,interactive=true})`. `setHaptics(b)` and `setLowStim(b)` (rig.opts plus realm.setLowStimulation), wired from main.js:114-118. Fix :65 `particles: !prefs.get('lowStim')`. The Hushfold leave() must call world.setLayerSize(null), world.showMallow(true), world.fx.replaceChildren(), world.fx.classList.remove('live') and world.dim(false), so the classic scenes find the stage as before.

### 5. New files for the Hushfold (lazy-loaded, small, data-driven)
ADD:
- src/app/brand.js: BRAND constants.
- src/app/scenes/hushfold.js: a thin composer, about 150 lines.
- src/hushfold/stage.js: owns the #fx-layer canvas, DPR capped at 2, ResizeObserver, a single rAF loop that pauses when hidden, and teardown.
- src/hushfold/input-router.js: multi-pointer via setPointerCapture. It tracks id, x, y, t, vx, vy for up to 2 pointers. It emits press/hold/drag/flick/stretch(distance, angle)/circle(massage)/stroke/release. Priority order: hero Mallow (bodyRect/hull), then Thought Mallows (radius hits), then world.onGesture. iOS: preventDefault on gesturestart. canvas touch-action:none.
- src/hushfold/mallow-touch.js: the soft-body seam over MallowRig (its own audit).
- src/hushfold/subtitles.js and src/hushfold/lines.js: authored lines as data, using voices.js/encounterLine where possible.
- src/hushfold/input-overlay.js
- src/hushfold/side-panel.js
- src/hushfold/thought-mallow.js
- src/hushfold/flow/engine.js
- src/hushfold/flow/registry.js: metadata only, the §16 fields.
- src/hushfold/flow/worlds/static-storm.js and src/hushfold/flow/worlds/luminous-ocean.js, each loaded with import(), never fetch (core.test.mjs:71-84 forbids fetch).
- src/engine/flow-store.js and src/engine/garden.js: pure and node-testable.
- src/engine/safety.js and src/data/safety-lexicon.js
- src/app/scenes/garden.js
- src/ui/hushfold.css
- assets/brand/ (light-on-transparent wordmark, small icons)
- assets/fonts/ (Nunito Sans / Manrope / Fraunces latin woff2 plus OFL)
- tests/hushfold.test.mjs

CHANGE: main.js, world.js, prefs.js (DEFAULTS add `autoFlow:false, subtitleSpeed:1`), entitlements.js, plans.js, settings.js, interpret.js (delegate to safety.js), index.html, manifest.webmanifest, tokens.css, tools/build-site.sh:17, framer/HushmallowEmbed.tsx, docs/FRAMER.md, tests/v3.test.mjs:209-215. Also create docs/HUSHFOLD.md (REDESIGN_BRIEF.md:3 references it; it doesn't exist yet).

World module contract: `export default { id, mount(ctx:{app, stage, world, audio, haptic, subtitles, input, signal, reducedMotion, lowStim}) → { frame(dt), gesture(g), progress():0..1, discoveries:[], transitionOut(nextId):Promise, destroy() } }`.

### 6. Cinematic subtitles: src/hushfold/subtitles.js
`createSubtitles({ root, prefs, avoid: () => DOMRect[] }) → { say(lines|string, {who, hold=false, id}), choice(prompt, [{label, value}]) → Promise, pause(), resume(), replay(), skip(), setSpeed(0.75|1|1.25|1.5), clear(), get busy }`. One line at a time, 1–2 lines max, Nunito Sans 19–22px. Duration `clamp(1400 + 55*chars, 2400, 7000) / speed` (today's say() uses 3000–4600 ms). `hold:true` keeps a discovery until tapped. Placement band: between the topbar bottom and bodyRect().top − 12. At 390×844 the classic layout leaves ~210 px above the Mallow body (body top y=290); if the band is under 84 px, use the band above the input or controls. Never over bodyRect or Thought Mallows. The root is pointer-events:none; only a small ⏸ ↺ ⏭ pill is touchable. role=status, aria-live=polite. Reduced motion means fade only. Don't use ui.js say() (the speech bubble) in the Hushfold: keep say() for rituals and Another Angle.

### 7. Compact input overlay with safety wiring (src/hushfold/input-overlay.js)
`openInput({ app, prompt, onSubmit(text, reading), onClose }) → { close() }`. It is NOT openSheet, because openSheet's backdrop blocks play. A single growing textarea (1–3 visible lines, maxlength 600, enterkeyhint='send'), placed in the upper band so the iOS keyboard (including inside the Framer iframe) doesn't cover it. Use visualViewport resize when available. The mic affordance is a hint to use keyboard dictation, not an in-app speech recogniser: Web Speech sends audio to a cloud service in Chrome, which breaks the no-remote promise. Debounce 260 ms → `interpret(text)` + `checkText(text)`. On crisis: `openSupport(app,{urgent:true})` once per session, world.setStage('comforting'), no Thought Mallow, no release/transform world, and a persistent 'Support' chip in subtitles. On care: support chip, and no Beyond reframing (mirror another-angle.js:81-90). On submit, keep the exact text and set `app.state.input = { text, emotions, intensity, contexts, desires, safety }` (express.js:116-121 shape). Emotions are panel selections first, then interpret matches with confidence ≥0.6. Close the overlay and spawn the Thought Mallow. Escape and Back close it (blockBack).

### 8. Shared safety detector used by free and Beyond paths
Measured gaps in the free path: 'My friend said she wants to kill herself' and 'I want to disappear forever' are none (Ultra: crisis); 'my partner threatens me' is none (Ultra: care). Both miss 'nobody would miss me' and 'thinking of ending it'. Fix: move HARM_LEXICON/HARM_COPY (and idiomGuards) from src/ultra/frameworks.js into a new src/data/safety-lexicon.js; frameworks.js re-exports them so the reframe tests stay green. Create src/engine/safety.js `checkText(text) → {level:'none'|'concern'|'care'|'crisis', category, matched}` as the union of interpret.js:70-75 and the lexicon, with idiom guards ('this deadline is killing me' stays none). interpret.js:117-118 delegates to it but keeps the `safety:{level,reason}` shape (care maps to concern for old callers). reframe-engine checkSafety uses the same lexicon. Add the missed phrases plus regression tests (core.test.mjs next to :118).

### 9. Side panel and Hushflow engine
src/hushfold/side-panel.js, non-modal, slides from the right, max 360 px, position:fixed so it is not boxed by #scene's 520 px desktop max-width. It contains:
- Feeling: Angry→'anger', Anxious→'anxiety', Sad→'sadness', Overwhelmed→'overwhelm', Frustrated→'frustration', Lonely→'loneliness', Restless→'restlessness' (all verified to exist in data/emotions.js), and Something else, which opens the A–Z explorer. Extract openExplorer from express.js:93-114 into src/app/emotion-picker.js.
- Intention: calm | let-go | distract | steady | just-play.
- Auto-flow toggle (prefs.autoFlow), Stay longer, Pause, Finish, and ★ favourite world.
- Memory Garden link (app.go('garden')), Library (app.go('library')) and Journey.
- Mallow switcher (reuse home.js cycle logic :65-76).
- Settings link, plan badge, and 'Need support now?' (openSupport).

src/hushfold/flow/engine.js: `createFlow({app, stage, registry, store}) → { start({emotion, intention, resume}), next(), stay(), pause(), resume(), finish(), switchEmotion(id), switchIntention(id), get current }`. Selection is deterministic: filter the registry by tier (allowedFor-style), status='playable' and purpose match. Order: favourites first, then a rotation bag per `${emotion}|${intention}` (copy recommend.js:310-349: Fisher–Yates with injected rng, never start with the last one). startWorld() calls requireEntitlement before import(). Transition: world.transitionOut(next), world.setRealm(next.realm,{crossfadeMs:2400}) and audio.ambience(next.ambience,{mood}) all at once, with no black frames.

### 10. Storage for saved progress, favourite worlds and Memory Garden (local, private)
All through app.store (prefix hm2:, so clearAll wipes them). Each has a version field and is validated on read (corrupt data returns the fallback, as journey.js:7 does).
- `hushfold.progress` {v:1, savedAt, worldId, idx, sequence:[worldIds], step:0..1, emotion, intention, mallow, seed}. No words, no photos. Written only when prefs.saveHistory is on, on pause, on pagehide/visibilitychange hidden, and between worlds. Cleared on Finish. Ignore it after 7 days.
- `hushfold.favourites` [worldId], written on an explicit tap.
- `hushfold.rotation` {bags:{key:{left,last}}}.
- `garden` {v:1, skills:{[skillId]:{savedAt, lastPractised, practised, fromWorld, mallow}}}, written only on the explicit 'Save to Memory Garden' tap. No user text or photos; the charm is drawn from skill id + Mallow.
- `beliefs` (Beyond): stored only when prefs.saveWords is on (relabel it 'Keep my words on this phone'); otherwise memory only for the session.
- Prefs: autoFlow, subtitleSpeed, plus a remembered last Mallow (today app.state.homeMallow is memory only).

APIs (src/engine/flow-store.js, src/engine/garden.js, following journey.js style): `saveProgress(store, p)`, `loadProgress(store, now)`, `clearProgress(store)`, `toggleFavouriteWorld(store, id) → bool`, `favouriteWorlds(store)`, `saveSkill(store, {id, fromWorld, mallow})`, `garden(store)`, `practised(store, id)`, `forgetSkill(store, id)`. Test them with memStore as core.test.mjs does.

### 11. Memory Garden scene (src/app/scenes/garden.js)
A route 'garden', gated on paid in enter() (like library.js:114 → plans on fail). World: dim(false), its own realm/backdrop (or moonmilk-cove) and the Mallow small. It lists saved skills from garden.js: charm visual (canvas from skill id + Mallow colours), short practical explanation, real-life example, links to related skills, and 'Practise again' → app.go('home', {flow:{worldId}}), which the Hushfold reads in enter() to start that world. The install animation (portal) runs inside the Hushfold on the fx canvas and then offers 'Visit the garden', so the reward never requires more play. The skill copy lives in a data module (src/hushfold/flow/skills.js), separate from code.

### 12. Entitlements → hushmallow Flow ('paid') / hushmallow Beyond ('ultra')
entitlements.js:27-53:
- `paid: { id:'paid', name: BRAND.flowPlanName, short:'Flow', tagline:'A little more room for your feelings.', productIds:{monthly:'hushmallow.paid.monthly', yearly:'hushmallow.paid.yearly'}, includes:[…brief §12, only what is built…] }`
- `ultra: { id:'ultra', name: BRAND.beyondPlanName, short:'Beyond', tagline:'There’s more than one way to see it.', productIds unchanged, includes:['Everything in hushmallow Flow', 'Another Angle…', …] }`

RANK, flags(), has(), the native bridge `{tier:'none'|'paid'|'ultra'}`, the test provider and loadUltra stay as they are, so receipts and stored `hm2:entitlement` {tier:'paid'|'ultra'} remain valid.

Customer-facing strings to change:
- plans.js:11 (hardcoded 'Hushmallow Ultra'/'Hushmallow') → p.name
- plans.js:33 ('Another Angle is part of Ultra' / 'Choose how you Hushmallow')
- 'ULTRA' badges at home.js:34, encounter.js:129, library.js:91 → 'BEYOND'
- home.js:32 aria-label
- settings.js:38 'Ultra only' → 'hushmallow Beyond only'
- another-angle.js:63 eyebrow → `${BRAND.beyondPlanName} · Another Angle`
- settings.js:24 and plans.js:23 already use PLANS[...].name

Add a monthly/yearly toggle (plans.js:21). Redesign the plans screen as an invitation, but keep Restore (:39), the support link (:40) and the test-note (:41-43).

Enforcement must live in code, not just hidden buttons:
- flow engine startWorld → requireEntitlement(ent, world.tier||'paid')
- Belief Mallow investigation and Beyond worlds → loadUltra/loadBeyond
- garden scene gate
- input-overlay submit → Thought Mallow only with paid

Decision for the orchestrator: free users can squeeze the hero Mallow and see the first invitation subtitle; 'Tell me' without a plan opens the plans invitation. Tests: freeze the productIds, add 'no plan: startWorld throws EntitlementError', and update v3.test.mjs:209-215 to the new copy.

### 13. Brand config + lowercase sweep + guard test
src/app/brand.js: `export const BRAND = Object.freeze({ brandName:'hushmallow', brandTagline:'Less noise. More magic.', brandLine:'hushmallow — Less noise. More magic.', flowPlanName:'hushmallow Flow', beyondPlanName:'hushmallow Beyond' })`. 30 customer-facing capitalised occurrences were found in strings (excluding comments).

App and site:
- index.html:9, :10, :24
- manifest.webmanifest name/short_name
- main.js:74
- home.js:29, :32, :38
- landing.js:32, :106 ('HUSHMALLOW' on the share card), :110
- plans.js:11, :33
- support.js:24
- settings.js:44
- journey.js:25
- entitlements.js:29, :42, :45
- another-angle.js:63
- v3/host.js:553
- framer embed :45, :46, :56

Dev-facing: ritual-schema.js:112 and studio.js.

Add a test that scans string literals in src/**/*.js, index.html, the manifest and the framer embed, case-sensitively, for /Hushmallow|HUSHMALLOW|HushMallow|Hush Mallow/ and fails on any match outside comments and identifiers (HushmallowEmbed, the hushmallow.paid.* ids and the hm2: keys are allowed). The logo (assets/source/brand/hushmallow-logo.webp, 1672×941) is already lowercase, but it is RGB black-on-white: make a light-on-transparent variant for the night UI, publish it from assets/brand/ and add assets/brand to build-site.sh:17. Don't replace the wordmark with live text.

### 14. Typography system (self-hosted, no layout shift)
tokens.css: add @font-face rules for 'Nunito Sans' (Mallow dialogue and subtitles), 'Manrope' (UI and settings) and 'Fraunces' (discoveries and chapter titles). Use latin woff2 subsets, a wght axis only where possible, and font-display:swap. Add fallback faces with size-adjust/ascent-override to stop layout shift. Files go in assets/fonts/ with OFL (already copied by build-site.sh:17; index.html:14 shows how to preload; the build sed rewrites the path). Size budget ≤ about 150 KB total, and preload only Nunito Sans. Tokens:
- --font-mallow, --font-ui, --font-cinema
- --fs-title-cinematic: clamp(28px, 8vw, 36px)
- --fs-world: clamp(24px, 7vw, 30px)
- --fs-dialogue: clamp(19px, 5.4vw, 23px)
- --fs-subtitle: clamp(19px, 5.2vw, 22px)
- body 16–18, buttons 15–17, labels 13–15 (today --fs-micro 12px and several 11–12px labels: bubble .who 11px, journey 11–12px, settings version 12px)

Keep Fredoka only if the logo or legacy screens need it. Never load from Google Fonts: it breaks the docs/FRAMER.md privacy promise, and a URL in JS fails core.test.mjs:81.

### 15. Keep the first squeeze fast (optional boot trims)
Measured: 835 KB of JS and 43 files before home is ready. For the Hushfold home, avoid pulling the 167 KB V3 catalog and the 7 realm modules on the first frame. Make realm.js import each realm factory lazily (world.setRealm is already async). Load data/rituals.js and createRecommender lazily behind an `app.rec` getter (or keep main.js:33 and move only entitlements.js:22-25, which no longer needs RITUALS once the Flow copy drops the count). Swap the 325 KB pipzi.png favicon (index.html:12-13, manifest icons) for 32/180/512 px icons. Pilot-safe order: icons now; lazy realms next; leave the rituals import for later.

### 16. Framer embed + docs + publish
The iframe keeps Framer light: 94 lines, no app code, no assets, no base64. Framer never parses the app; the app's own ES modules split per scene, engine and copy file. Edits:
- HushmallowEmbed.tsx:45 'Hushmallow' → 'hushmallow'
- :46 'hosted Hushmallow address' → 'hosted hushmallow address'
- :56 title='hushmallow'
- header comments :1 and :8-10 ('the 1,000 rituals' → Hushfold/Hushflow wording)
- optional: drop 'vibrate' from allow (:61); it isn't a Permissions-Policy feature and Chromium logs it as unrecognised. Do not add 'microphone' (no in-app speech recognition).
- keep `export default function HushmallowEmbed` and the `url` property name, so existing Framer instances keep their settings.

docs/FRAMER.md: lowercase title and text; the published file list (:19-25) gains assets/brand; privacy (:62-67) names the new bundled fonts. The workflow needs no change unless new top-level folders are added. The build copies src/ wholesale (build-site.sh:15) but only listed asset folders (:17).


## Risks
- Version update could reload mid-play: home is the only update point (main.js:52, :57, :73, :102). Without a safeForUpdate guard, a deploy would reload during a Hushflow world or wipe text in the input overlay whenever the tab becomes visible again.
- Touch blocked by the scene root: any full-height Hushfold root with pointer-events:auto (app.css:22) makes the Mallow untouchable, as on today's home (measured: 0 events). This is also a regression risk for every new overlay; add an elementFromPoint check to the QA sweep.
- The free safety detector misses crisis and care phrases that Beyond catches (measured: 'friend wants to kill herself', 'want to disappear forever', 'partner threatens me'). The new free-text overlay widens exposure, so extract the shared lexicon before shipping the overlay. HARM_LEXICON currently sits in Ultra-gated src/ultra/frameworks.js; importing it directly from free code would break the 'Ultra only via loadUltra' rule.
- Test purchases are live on the public Pages host: config.js:11 lists 'ramkumarjothi1982.github.io' (the URL the Framer embed points at), so anyone can unlock Flow or Beyond free. This is intended for testing only and must be removed before anything goes on sale. Client-side checks can be bypassed in any case (docs/FRAMER.md).
- Storage inside the Framer iframe: browsers partition third-party iframe storage by top-level site, and Safari may evict script-written storage. Saved progress and the Memory Garden in the embed are therefore separate from the github.io site and may not last. Mitigations: try navigator.storage.persist(); host the app on the same site as the Framer domain; never promise sync.
- iOS keyboard inside the iframe: index.html:5 `interactive-widget=resizes-content` only applies to the top-level page (Framer's), so the iframe may not resize when the keyboard opens. Keep the compact input in the upper band, use visualViewport when available, and test in the real embed on an iPhone.
- Multi-touch inside the iframe: two-finger stretch may trigger page pinch-zoom on iOS unless the stage canvas has touch-action:none and gesturestart is prevented. MallowRig handles one pointer only (rig.js:298 press.id), so two-finger input must come from the new router.
- Haptics settings leak (existing bug): rig.opts.haptics is set only when the rig is created (world.js:65), setMallow returns early for the same Mallow (world.js:57), rig.buzz bypasses app.haptic (rig.js:67-74), and prefs.onChange ignores 'haptics' and 'lowStim' (main.js:114-118). Turning haptics off doesn't stop the squeeze buzz. Also world.js:65 `|| true` means lowStim never reduces Mallow particles.
- Photo limit conflict: the brief allows 0–7 photos, but MAX_PHOTOS=6 (photos.js:24) is asserted by tests (v3.test.mjs:165, :214) and in copy (tray.js:34/41, encounter.js:56, entitlements.js:35). The orchestrator must decide; changing it touches five files plus tests.
- Plan rename breaks tests unless edited together: v3.test.mjs:209-215 asserts that PLANS.paid.includes has a 'touch rituals' count line and the text 'up to six of your own photos'. The brief also forbids listing unbuilt features as included.
- Boot weight: 835 KB of JS (43 files) plus 871 KB of images before home, including the 167 KB V3 catalog, 7 realms and a 325 KB favicon. 0.4–0.8 s locally, but likely slow over iPhone cellular for 'squeeze within the first second'. Lazy realms and small icons are low-risk wins.
- No external content loading: core.test.mjs:71-84 forbids fetch() and remote URLs anywhere in src/**/*.js, except version.json. World registry and copy must be JS modules loaded with import(), and fonts must be self-hosted.
- Logo asset is not production-ready for the dark UI: hushmallow-logo.webp is RGB black-on-white with no alpha, logo-mascot.webp has stray alpha speckles, and both sit untracked in assets/source/brand (not published). A light/transparent variant is needed, and build-site.sh:17 must copy assets/brand.
- Free vs Flow boundary is undecided: the brief lists MallowTouch under Flow but also wants a squeeze 'within the first second'. Enforce in code whatever is chosen (requireEntitlement in startWorld, Thought Mallow spawn and the garden), not only in the UI.
- Docs drift: docs/STATUS.md still describes quick tricks, and docs/HUSHFOLD.md (named by REDESIGN_BRIEF.md:3) does not exist yet.