# worlds

## Summary
SCOPE AND METHOD. I read REDESIGN_BRIEF.md in full, plus src/world/ (realm.js, util.js, all seven realms, closely: static-storm, blue-drift and moonmilk-cove), src/v3/{host,fx,kit,finales,laws,words,photos}.js, ge-01, ge-13 and ge-43, the signature rituals and their library data, catalog.js (ENGINES/SKILLS) and docs/V3_SKILLS.md. I edited nothing in the repo. Scratch files and screenshots are in /tmp/claude-0/audit/worlds/ (measure.cjs, proto.cjs and *.png).

Measurements: headless Chromium with swiftshader, 4 cores, a shared machine, 390x844, quality 'low', dpr 1. Use them as relative numbers only.
- Realm mount (synchronous build): static-storm 48.8 ms, blue-drift 58.3 ms, moonmilk-cove 31.2 ms.
- Static-storm per frame: 23.5 ms when agitated, 11.0 ms when resolved (transform 1). Blue-drift 10.7–13.0 ms. Moonmilk 7.7–12.0 ms.
- 2-D height field, 98x211 cells: 0.128 ms per step, 0.37 ms to shade and blit.
- 1-D 128-column field with 4 substeps: 0.007 ms per frame.
- Prototype Gerstner-packet perspective ocean (56 rows x 40 columns x 16 packets): 3.65 ms per frame.
- Prototype noise-mask melt compositor (two full layers plus a 49x106 mask): 2.33 ms per frame.

WAVE CANDIDATES (which one the owner liked):
1. Drift and Dock, "Slow the wave" (Loomi, Blue Drift; src/rituals/drift-and-dock.js:228-380). You trace a glowing float along a long dotted sine wave: right on a ~4 s in-breath, back left on a ~6 s out-breath. Going faster than 1.7x the ideal pace builds `chop` (:300), which breaks the surface into short fast ripples. Each smooth pass lights a pip and stills the water toward a mirror sheen (:311). There is a "Run a guided wave for me" button. Feel: slow, breath-paced, the water mirrors your pace.
2. Spark to Lantern, "Ride the wave" (Pipzi; spark-to-lantern.js:386-500). Press and hold to carry a surfer spark up a Gaussian swell labelled rising/crest/falling (playful urge-surfing). It is exciting rather than relaxing, and holding to progress feels like a task.
3. GE-13 Moon Tide (V3 draft, not in BUILT). Pull a crescent lever down a rail; wave rows flatten far-to-shore with pauses at notches; photos are rippling reflections. Beautiful, but lever-driven.
4. GE-43 Weighted Raft (built and offered). Slide a stone to balance a raft on a live 64-column height field (ge-43.js:333). Slow sliding gives glassy water, rushing rocks and splashes. The wave is secondary.
5. GE-37 Current Weaver (draft). Straighten water ribbons with a reed; currents, not waves.
6. GE-39 Tide Pool (catalogue only, not built). Rings slow and spread into broader wavefronts.
7. Realm backdrops, which only respond to pulse() and are not interactive:
   - Blue Drift: mirror water copied in perspective wave slices (blue-drift.js:654-676); wind chop; a 'clear' breeze front leaves the water glass-smooth (:943).
   - Moonmilk Cove: lazy wavelets plus surf and lace foam running up a pearly shore (moonmilk-cove.js:916-1033).
8. ThinkStill bundle (framer/release): BIG SIGH (#111) and RIVER (#34). Neither is a wave interaction.

Verdict: most likely Drift and Dock's "Slow the wave".
- It is the only relaxing wave interaction actually shipped and offered (PAID_MODULES, src/rituals/index.js:4-15; added 17e6375 on 2026-10-11; tone 'quiet').
- The wave engines GE-13 and GE-37 are not in BUILT (src/v3/engines/index.js:5-7), so the owner could only have seen them through the localhost dev lab.
- Its rule ("slower = smoother water") is exactly the brief's intentional-slowing idea.
- No commit, doc or comment records the owner's preference, so this is an inference. Confirm with one question.

World 2 should keep its core feel: a pace→stillness contingency, long slow motion, mirror calm and the cyan Loomi light. It should also be distinctive: you make the swells instead of tracing a path, the Mallow floats on them, and the swells carry floating things.

REUSE. A lot carries straight over:
- fx.js: particles, trail, ripples, springs, rope, noise, text, orb, glow.
- kit.js: CurveTrace, AngleTracker, Wobble, waitRing.
- words.js: createWords, excerpt, drawWords.
- photos.js: photoApi, including the 'card' and 'bubble' shapes and the 'storm', 'glow' and 'dawn' tones.
- world/util.js: Pool, Rings, flashEnv, stageFade, sceneLayer/drawLayer, sprite caches.
- realm.js internals: mood easing, the photosafe pulse throttle, adaptive DPR, and pausing when hidden or off-screen.
- The static-storm realm already has the agitated→resolved arc World 1 needs: corrupt constellations snap, the cracked floor heals into a golden mandala, a dawn glow rises.
- finales.js F[1] ("indigo sparks become warm filaments") and F[2] ("water beads spread into a silver lagoon") fit the storm and the ocean respectively.

ARCHITECTURE CONCLUSION. For one world to melt into the next with no black frames or loading screens:
- Every Hushflow world renders into its OWN offscreen layers: a back layer below the Mallow and a front layer above it.
- One director owns the only rAF loop and composites the layers.
- During a melt, both worlds render and a low-resolution animated noise mask blends them (2.33 ms per frame measured).
- The next world's module is prefetched at enter(), and its heavy build runs in prepare() during idle time, because realm builds cost 30–58 ms synchronously.
- If prepare() hasn't finished, the melt waits and the current world keeps playing.
- Each world needs its own canvas because static-storm's drawGlitch copies its own canvas (static-storm.js:692); in a shared canvas it would smear the other world.
- The realm backdrop eases mood with τ=1.4 s (realm.js:123), too slow for a "the world responded" discovery. The world's gameplay layer must respond within one frame, and realm-core needs a tau override.

WORLD 1, STATIC STORM (intentional slowing):
- The storm starts pre-charged from the person's feeling and intensity.
- Fast strokes deposit crackling charge into a 16x32 charge grid.
- Slow strokes (about 0.12–0.65 U/s, where U = min(W,H)) drain charge into gold "ground lines" that flow into the floor. Holding still sends out ground pulses.
- Progress is the light that has been grounded, so slowing is always rewarded and fast movement is never punished.
- The Thought Mallow crackles until grounded; circling it slowly grounds it faster. Photos are charged postcards on ropes that ground back to their own colours.
- The discovery fires on observed contrast: about 1 s of fast movement with charge ≥0.5, then within 6 s about 1.8 s of slow grounding. Subtitles: "See what happened?" / "You changed your pace." / "The world responded." The skill saved is "The Power of Slowing Down" (SKILLS[0] Intentionally Slow).

WORLD 2, LUMINOUS OCEAN:
- Each stroke spawns a Gerstner wave packet whose physics makes slow, long strokes make long, long-lived rolling swells and quick flicks make short chop. Constants: g=59.5 px/s², σ=18400 px³/s², viscous damping ν=40.7 px²/s, β0=0.0233 s⁻¹. A 400 px swell then has a period of about 6.3 s and lives about 30 s; a 50 px wave has a period of about 1 s and lives about 1.5 s.
- Stokes drift u=Σ d ω k (A·E)² carries things that float. Swells the person sends away carry the Thought Mallow toward the horizon, still visible and never sunk. Swells toward the viewer bring it back.
- Photos float as bubbles. The Mallow floats in the foreground on a buoyancy spring and tilts with the water's slope.
- A 2-D height field gives an instant bioluminescent wake under the finger.

THE MELT (storm → ocean): the mask spreads outward from the shared horizon line (hy=0.655H). The grounded ground lines become the first swells, postcards morph into bubbles in place, and the Thought Mallow lands on the water. The ocean horizon then rises to 0.44H. The ambience crossfades over the existing 2.6 s (audio.js:27).

EVIDENCE AND HONEST WORDING:
- Storm: arousal-decreasing slowing and a response pause. Catalogue: "Intentionally Slow", Moderate – mechanism family, source pubmed 38518585, which I believe is the 2024 Kjærvik & Bushman anger/arousal meta-analysis; I haven't checked the link. "Reaction Gap" is Moderate – treatment-derived. Research on venting does not support relief through aggressive release, so scribbling is framed as noticing the charge, never as letting it out to feel better.
- Ocean: ACT defusion and decentring ("Cloud Witness", "Thought Is Not Order", "Room for This"; Moderate – treatment-derived; pubmed 38615492). Suggested wording: "A thought can be watched from a little further away. It doesn't make it untrue or make it vanish." Never destroy or suppress the thought.

ETA INPUT (sizing only, not a commitment): about 2,900 new lines in total.
- Realm-core extraction: ~120 lines.
- Director, compositor and input: ~600.
- Discovery and subtitle hooks: ~250.
- Storm world: ~700.
- Ocean world: ~900.
- Registry and save: ~150.
- Framer is untouched: the app stays iframe-hosted (framer/HushmallowEmbed.tsx, 94 lines). Worlds are loaded with import(), so nothing heavy is added to the Framer side.

## Keep
- /home/user/thinkstill-rituals/hushmallow/src/world/realms/static-storm.js: World 1's backdrop as-is. Its build/frame/pulse contract (create→{build,frame,pulse}, :46/:64/:428/:702) already moves from agitated to resolved: constellations snap on pulse('success') (:718-723), the floor heals into a golden mandala (:541-546), a dawn glow rises (warmK, :437), and pulse('clear') sends calm rings (:738-743).
- /home/user/thinkstill-rituals/hushmallow/src/world/realm.js: REALMS palettes (:24-60), EMOTION_MOODS/moodForEmotion (:83-120), mood and transform easing (step(), :215-239), the photosafe pulse throttle of at most 3 bright events per second (:328-333), adaptive DPR and downgrade on slow frames (:179-192, :266-274), pausing when hidden or off-screen (:277-295). Extract this into a DOM-free core rather than rewriting it.
- /home/user/thinkstill-rituals/hushmallow/src/world/util.js: Pool (typed-array sprite particles; faster than fx.Particles) (:235), Rings (:293), flashEnv (photosafe envelope with ≥0.28 s rise) (:328), stageFade (keeps effects off the Mallow stage) (:226), sceneLayer/drawLayer (parallax prerendered layers) (:341-353), glowSprite/glintSprite caches (:95/:124), rng/noise1/fbm1, billowCloud.
- /home/user/thinkstill-rituals/hushmallow/src/world/realms/blue-drift.js: the perspective wave-slice reflection technique (:654-676) and the calm 'clear' breeze front (:943). Use them for the ocean's mirror reflection of the sky and its dawn column.
- /home/user/thinkstill-rituals/hushmallow/src/world/realms/moonmilk-cove.js: moon-path glints (drawWater :916-970) and foam lace (drawSurf :972-1033). Reusable as ocean crest glitter and as a shoreline if one is added later.
- /home/user/thinkstill-rituals/hushmallow/src/v3/fx.js: the whole effects library (list in proposals).
- /home/user/thinkstill-rituals/hushmallow/src/v3/kit.js: CurveTrace (guided slow stroke / ghost hint), AngleTracker (detects slow circling of the Thought Mallow), Wobble (postcard flutter), waitRing (hold-to-ground ring), resample/polyLength (ground lines, stroke→packet).
- /home/user/thinkstill-rituals/hushmallow/src/v3/words.js: createWords (exact text preserved, ≤42-character token, setToken/onChange) and drawWords styles (plate/light/ember/frost). The Thought Mallow label moves from 'ember' to 'light' as it grounds.
- /home/user/thinkstill-rituals/hushmallow/src/v3/photos.js: photoApi.draw with shape 'card' (postcards) and 'bubble' (sheen), tones 'storm'/'glow'/'dawn' with toneMix, dust/edgeDust, assign(); the Mallow-card stand-in; the privacy model (memory only, release()).
- /home/user/thinkstill-rituals/hushmallow/src/v3/engines/ge-43.js:300-334: a stable 1-D height field with substeps (fieldAt, inject, vF += c2*lap − 1.5v − 3h). The template for the ocean's surface wake.
- /home/user/thinkstill-rituals/hushmallow/src/v3/engines/ge-01.js:71-79 and :220-243: the rushing→drag mapping (k = lerp(1,0.3,invLerp(2.6,8,speed))) and 'sparks gather into one amber line when slow'. This is the reference for how the storm should feel.
- /home/user/thinkstill-rituals/hushmallow/src/rituals/drift-and-dock.js:228-380: the slow-wave mechanic (IN=4, OUT=6, chop when ratio>1.7, guided-wave button). The feel benchmark for World 2, and its accessible guided alternative.
- /home/user/thinkstill-rituals/hushmallow/src/v3/finales.js: F[1] (:32) warm filaments and F[2] (:50) silver lagoon as completion beats; glowStroke/wash (:11/:18), which are worth exporting.
- /home/user/thinkstill-rituals/hushmallow/src/app/world.js: setRealm's dual-canvas crossfade (:30-55, old canvas kept for 950 ms, which is already free of black frames), place/fitBetween/mallowRect (:89-112).
- /home/user/thinkstill-rituals/hushmallow/src/engine/audio.js: HOLD_SOUNDS charge/ground/drain/hum (:36), crackle/settle/chime/glass/bubble FX, the per-realm ambience crossfade AMB_XFADE_S=2.6 s (:27).
- /home/user/thinkstill-rituals/hushmallow/src/mallows/rig.js: strip-warp soft body, tilt/lean springs (:535-544, :631-636). Floating should feed these rather than CSS.
- /home/user/thinkstill-rituals/hushmallow/src/v3/data/catalog.js SKILLS and docs/V3_SKILLS.md: the authored skill wording, precautions and evidence-scope labels with sources. Use them verbatim for Memory Garden text.
- /home/user/thinkstill-rituals/hushmallow/src/v3/host.js input pattern: getCoalescedEvents plus pointer capture (:230-269), sound/react throttles (:140/:144), ghost-finger idle hint (:489-513), placing the subtitle on the side away from the active object (:462).

## Integration points
- src/world/realm.js:133 mountRealm(container, realmId, opts) → split into export function createRealmCore(realmId, { W, H, dpr, emotion, intensity, reducedMotion, lowStimulation, groundY, quality }) → { st, canvas (own offscreen, alpha:false), tick(dtMs), draw(), setMood(m, {tau}), transform(p, {tau}), pulse(kind, {x,y}), resize(W,H,dpr), build(), destroy() }. It has no DOM, no rAF and no observers. mountRealm becomes a thin wrapper, so the realms gallery and current scenes keep working.
- src/world/realm.js:123-125 MOOD_TAU=1.4/TRANSFORM_TAU=1.7: add a per-call tau override used in step() (:221-226), so worlds can drive the backdrop at τ≈0.3 s during contingency moments.
- src/world/realms/static-storm.js:692 drawGlitch does g.drawImage(g.canvas, …) on its own canvas, so it must render into its own layer canvas, never a shared compositor.
- src/world/realms/static-storm.js:66 hy = round(H*0.655) is the storm horizon. Expose it through st (e.g. st.horizonY) so the melt and the ocean intro use the same line.
- src/app/world.js:30 setRealm(id, …) and index.html:19-21 (#world z0, #mallow-layer z1, #fx-layer z2): the Hushflow director owns one compositor canvas in #world (back layers) and one in #fx-layer (front layers, input). It no longer calls setRealm per world.
- src/ui/app.css:13-16 #mallow-layer transform has transition 720ms, so per-frame floating would lag. Add CSS vars --fy/--fr folded into the transform, plus a .floating class with transition:none for the bob. Or add MallowRig.setFloat({ lift, tilt }) feeding b.tilt and lift at rig.js:631-636.
- src/app/world.js:107 mallowRect(): worlds read Glitzi's body rect from it for stage avoidance, arcs to the Mallow and occlusion by the front water lip.
- src/v3/photos.js:24 MAX_PHOTOS = 6: the brief says 0–7. Raise to 7; photoApi already lays out 7 (Mallow-card stand-ins).
- src/v3/photos.js:444 photoApi({ particles, dpr, seed, fallback }): one instance per Hushflow session, shared across worlds so postcard→bubble identity carries through the melt (same index i).
- src/v3/words.js:27 createWords(input) → pass the same object to every world (ctx.words). Draw with words.js:54 drawWords(g, words.token, x, y, { style, size ≥ 15, maxWidth, lines }).
- src/v3/fx.js:313 FONT = '"Fredoka", …': replace with typography tokens (Nunito Sans for Mallow/Thought text, Fraunces for discoveries). Await document.fonts.load('600 16px "Nunito Sans"') before a world's first canvas text.
- src/engine/audio.js:37 REALMS ambience list: add 'luminous-ocean' (or reuse the 'blue-drift' bed). Call app.audio.ambience(id) at melt k=0. Use app.audio.hold('charge'|'ground'|'hum', {intensity}) → {update, stop}.
- src/v3/engines/index.js:9 loadEngine pattern: mirror it as registry.load(id) → import(`./worlds/${id}.js`). Prefetch with import() (no await) at the current world's enter().
- src/v3/data/catalog.js SKILLS: index 0 'Intentionally Slow', 12 'Reaction Gap' (storm); 15 'Cloud Witness', 13 'Thought Is Not Order', 16 'Room for This' (ocean). Store the skill name in world meta.evidence.skill and render does/insight/precaution/scope in the Memory Garden.
- src/engine/storage.js createStore and src/engine/played.js: persist world serialize() JSON (photo indices and states only, never image data) and the rotation history for deterministic next-world selection.
- framer/HushmallowEmbed.tsx: no change needed. Worlds load inside the iframe-hosted app (GitHub Pages workflow .github/workflows/hushmallow-pages.yml).

## Proposals
### 1. Reusable building blocks for worlds (function list)
fx.js:
- Maths: TAU, clamp, lerp, invLerp, smooth, ease.{outCubic, inOutSine, outBack, outElastic, outQuint} (:13), dist, angDiff, rng(seed) with .range (:25), noise2(seed)→(x,y)∈[−1,1] (:33).
- Colour: hex, rgba, mix.
- canvas(w,h): OffscreenCanvas when available.
- Light: glowSprite(colour,size,core) (:74), glow(g,x,y,r,colour,a) (:87, additive), glint(g,x,y,r,colour,a,rot) (:96).
- Particles(max) emit/burst/update/draw/clear (:110).
- Trail(max,life) add/update/draw (:164), a finger ribbon.
- Ripples(max) add/update/draw(squash) (:190).
- Spring(value,{stiffness,damping}) and Spring2 (:217/:223): tethers and buoyancy.
- Rope(n,x0,y0,x1,y1,{gravity,iterations,slack}) verlet with tension/path (:233): postcard hangers.
- spiral (:263), halo (:277), motes (:288).
- Text: wrap(g,text,maxW,maxLines) (:302), label() (:318), arcText() (:337).
- Shapes: roundRect, shadow(g,x,y,rx,ry,a) (:359), orb(g,x,y,r,colour) (:365).

kit.js:
- resample(pts,step) (:8), bezier, arcPts, polyLength.
- CurveTrace(pts,{tol,ahead}) feed/advance/pointAt/draw (:46): guided slow-stroke assist and ghost hint.
- AngleTracker(cx,cy) start/feed→dA, .speed (:114): detects slow circling ('massage') around the Thought Mallow.
- hit, inRect, nearest.
- Wobble kick/update (:138): postcard flutter and soft 'not yet'.
- waitRing(g,x,y,r,frac,colour) (:145): hold-to-ground progress.

words.js: excerpt(text,42) (:15), createWords(input)→{full, own, feelings, token, setToken, onChange} (:27), drawWords(g,text,x,y,{style plate|light|ember|frost|etched|ink, size, maxWidth, lines, alpha, rot, glowColour}) (:54).

finales.js:
- Only drawFinale(n,g,t,L,state) is exported (:341).
- F[1] warm filaments and F[2] silver lagoon suit storm completion and the ocean intro. Both need L={stage,view,pal,now}.
- Move glowStroke(g,colour,width,alpha,core) (:11) and wash(g,x,y,r,colour,a) (:18) into fx.js for the ground lines and the melt edge.

laws.js: reuse the patterns, not the code (it is coupled to engine.pointAt). halfSpeed guide light (:66), waitWake 'lift and watch the wake fade' (:191), slowLight (:665).

world/util.js: Pool (:235), Rings (:293), flashEnv (:328), stageFade (:226), sceneLayer/drawLayer (:341), glowSprite/glintSprite/blit, softBlob, billowCloud.

photos.js photoApi: draw/dust/edgeDust/pieces/drawPiece/drawClipped/size/assign/colour/sampleColour.

host.js patterns: coalesced input (:247), sound throttle 40 ms (:140), react throttle 700 ms (:144), ghost finger (:489).

### 2. Realm core extraction (prerequisite, ~120 lines)
Move realm.js:133-362 into createRealmCore(id, opts) with no DOM, rAF or observers.
- It returns { canvas, st, tick(dtMs), draw(), setEmotion, setMood(m,{tau}), getMood, transform(p,{tau}), pulse(kind,{x,y}|{nx,ny}), setFocus, setReducedMotion, setLowStimulation, resize(W,H,dpr), build(), destroy() }.
- Keep computeDpr, applyDensity, the pulse throttle and adaptive DPR inside it.
- mountRealm wraps the core: it creates the DOM canvas from core.canvas (or draws core.canvas into its own), plus rAF and observers, so realms.html, studio and existing scenes keep the same API.
- Add st.horizonY per realm: static-storm 0.655H, blue-drift L.hy, moonmilk L.hy.
- Make build() splittable later. For now it is called only from world.prepare() inside requestIdleCallback({timeout:1500}), with a setTimeout fallback, because measured builds take 30–58 ms.

### 3. Hushflow world module contract
File: src/hushflow/worlds/<id>.js.

export const meta = { id, title, mallow, realm, purpose, technique, evidence:{ skill:'Intentionally Slow', scope:'Moderate – mechanism family' }, touch:[…], next:[ids], memory:{ id, title, line, example }, accessibility:{ tapAlt, reduced }, photos:{ becomes, shape }, horizon:0.655, version:1 }

export function create(ctx) → World. ctx = {
- W, H, dpr, U:min(W,H)
- back:{canvas,g}, front:{canvas,g} (own layers; back is alpha:false)
- safe:{x,y,w,h} (gameplay rect excluding top controls, subtitle band, dock)
- realm: createRealmCore handle drawing into back, or null
- mallow:{ rect(), react(kind), setEmotion(mix,i), float({lift,tilt}), lookAt(nx,ny) }
- thought: ThoughtMallow handle|null: { token, full, emotion, state:{tension,charge,distance,calm}, draw(g,x,y,scale,{alpha}), react(kind) }
- words (createWords), photos (shared photoApi), fx, kit, particles, rings
- say(lineIdOrText,{hold, who}): non-blocking subtitles, DOM, aria-live
- discover(id, evidence): director runs the discovery sequence and Memory Garden offer
- sound, hold, haptic (throttled)
- reduced, lowStim, heavy, emotion, intention, rand, seed, now()
}

World = {
- prepare(): build layers and sprites; idempotent; may return a Promise.
- enter({from, handoff}): handoff comes from the previous world, or null for a cold start.
- frame(dt, t): simulate and draw into back/front only; never touch the DOM.
- pointer(s): s = { type:'down'|'move'|'up'|'cancel', id, x, y, t, vx, vy, speed, speedU:speed/U, pointerType, count }.
- get metrics(): { speedU, charge, calm, light, stillSec, … } feeding the discovery detector, audio and haptics.
- get progress(): 0..1, monotonic, moved only by input.
- get complete(): latches true at the natural completion point.
- outro(k), handoff() → { horizonY, palette, seeds:[polylines], thought:{x,y,scale,tension}, photos:[{i,x,y,w,h,rot,state}], energy }, intro(k, from).
- pause(), resume().
- serialize() → JSON ≤2 KB { v, seed, progress, light, discoveries, photoState:[{i,grounded}], thought:{distance}, elapsed }; restore(json).
- resize(W,H,dpr), setQuality({dpr,density}), destroy()
}

Director (src/hushflow/director.js): createHushflow({ worldEl, fxEl, app, world, prefs, store, registry }) → { start(id,{emotion,intention,input}), next(), stay(), pause(), resume(), finish(), setEmotion(id), setIntention(id), setAutoFlow(b), get state }.
- One rAF loop.
- Pointer input on the #fx-layer canvas with capture and getCoalescedEvents. Velocity is taken over a 60 ms window, then smoothed with an EMA of τ=0.12 s.
- Composites back layers into the #world canvas and front layers into the #fx-layer canvas.
- Pause holds the last composited frame under a 20% veil (never black).
- Prefetches meta.next[0] via import() at enter(). Calls next.prepare() in idle once progress ≥0.7.
- Picks the next world deterministically: registry filtered by intention/emotion fit, minus the last 3 played (played.js), tie-broken by hash(seed + sessionCount).

### 4. Melt transition compositor (storm → ocean), measured 2.33 ms per frame
Duration and timing:
- k runs 0→1 over 5 s with ease.inOutSine.
- The melt starts only when the outgoing world is complete, the person has been idle ≥2 s or tapped 'Drift on' (or Auto-flow is on), and incoming.prepare() has resolved. Otherwise the storm keeps playing; 'stay longer' is the default.
- Input goes to the outgoing world until k=0.4, then to the incoming one, so touching mid-melt makes the first ripples.

Mask:
- Low-res 49x106 ImageData alpha mask: M = clamp((1.6k − v)/0.12), where v(x,y) = 0.35·fbm(x/90, y/90) + 1.6·|y/H − hy/H|. The melt spreads outward from the shared horizon line, up into the sky and down to the floor.
- putImageData into the mask canvas.

Per frame:
1. g.drawImage(incoming.back).
2. tmp ('copy') ← outgoing.back.
3. tmp 'destination-out' drawImage(mask, 0, 0, W, H) with smoothing.
4. g.drawImage(tmp).
5. Edge pass: band b = 1 − |M − 0.5|·2, drawn 'lighter', tinted mix('#7cf5ff', '#ffd98a', k) at 0.5 alpha. This is the molten seam.
Repeat the same mask for the front layers.

Content handoff:
- The storm's grounded ground lines become seed packets: λ = 1.2·length, small A, travelling away from the viewer.
- Postcards crossfade from shape 'card' to 'bubble' at the same screen position over k 0.3–0.7, then become floaters.
- The Thought Mallow keeps its position and gains a buoyancy spring.
- Glitzi uses world.place to its float spot (720 ms calm-move); after that the float vars take over.
- After k>0.5 the ocean raises its horizon from 0.655H to 0.44H over 3 s.
- Audio: ambience('luminous-ocean') at k=0 (2.6 s crossfade); hold('charge') stops; hold('ground') fades into 'hum'.

Cost control: the outgoing storm is already resolved during the melt (11 ms vs 23.5 ms agitated in the measurement). Optionally render the outgoing world at half rate when k>0.6.

Reduced motion: replace the noise melt with a 1.6 s straight crossfade, plus the edge glow at 0.25 alpha.

### 5. World 1 'Glitzi's Static Storm': gameplay spec
Backdrop: static-storm realm core in back. Each frame: setMood({agitation:0.12+0.85Q, clarity:0.15+0.8p, heaviness:0.25(1−p), warmth:0.3+0.55p}, {tau:0.35}) and transform(0.9p, {tau:0.6}).

Speed bands (U=min(W,H); on a phone U=390):
- fast ≥ 1.8U/s (≈700 px/s)
- slow 0.12–0.65U/s (≈47–255 px/s); slowness s = smoothstep(0.65U, 0.12U, v)
- still < 0.06U/s held ≥0.6 s
- Calibrate per person after 3 s: fast = max(1.8U, 1.6×median). Use separate constants for mouse.

Charge field: 16x32 grid over safe.
- Start q0 = 0.35 + 0.5·intensity (anger higher), so slow players always have something to ground.
- Fast deposit: q += 0.9·clamp((v−fast)/fast, 0, 2)·dt with a Gaussian of r=1.6 cells along the path; cap 1.5.
- Diffusion D = 0.6 cells²/s; leak τ = 14 s.
- Slow grounding (finger down): drain = min(q, 1.1·s·dt) within r=2.2 cells; light += drain. Gold particles fall to the floor (gravity +40).
- Each slow segment is kept as a 'ground line' polyline: kit.resample, 6 px steps; glowStroke width 2+6s, gold→rose. It persists and slides down into the mandala over 4 s.
- Holding still for 0.6 s fires a ground pulse: a ring with radius 0→5 cells over 1.6 s, draining 0.6/s, drawn with waitRing and Rings. This is also the tap/hold alternative.

Totals: Q = mean of the top 25% of cells. p = clamp(light / 9), about 25–40 s of grounding.

Visuals at a glance:
- Cells with q>0.05 show flickering cyan/magenta glow sprites.
- At most 6 short digital arcs alive (life 0.18–0.35 s) between cells with q>0.5, or to the finger.
- A separate photosafe limiter allows ≤3 bright events per second, with flashEnv rise ≥0.28 s.
- On each slow segment end, realm.pulse('success', {x,y}) snaps the nearest constellation: a visible 'world responded' beat within about 300 ms.

Thought Mallow:
- Spring2 tether (k30, c8) to (0.27W, safe.y + 0.3·safe.h), away from Glitzi.
- tension = clamp(0.4 + 0.6·q_local); micro-arcs when q_local > 0.4.
- Slow circling (AngleTracker, 0.6–2.5 rad/s at 0.5–2.5 body radii) multiplies grounding near it ×1.8.
- Settles when q_local < 0.15 for 2 s: react('sigh'); its words go ember→light; subtitle 'Still your thought. Just not crackling now.'
- A fast drag on it gives a Wobble kick and charge (it fizzes, never explodes).

Photos as charged postcards:
- n = photos.n (7 Mallow cards when the person adds none). Shape 'card' at 0.2–0.26U (≥78 px), hung on fx.Rope(6) from the cloud deck in y 0.14–0.46H, avoided by stageFade.
- Charged look: tone 'storm' with toneMix 0.8·q_c, edge glint particles, skewY 0.02·q_c·sin.
- A slow stroke through its rect, or a ground pulse, drains it. Below 0.12 it is grounded: tone back to natural, glow gold 0.5, rope shortens, rotation springs to 0, checkpoint 'photo', Glitzi react('comfort'), sound 'glass' with note i.
- Arcs never end on a photo rect (safety rule from V3_ENGINE_CONTRACT).

Glitzi: setEmotion mixes agitated/excited→calm with p; react('gasp') on the first big charge; react('sigh') at discovery.

Audio/haptics: hold('charge') intensity Q and pitch 0.8 + 0.5·min(speedU/3, 1); hold('ground') intensity 3·drain-rate; 'crackle' on fast segments (40 ms throttle); haptic 'tick' ≤10/s when fast, 'soft' when grounding starts, 'success' at discovery.

Discovery 'slowing' (state machine):
1. Armed: fast for a cumulative ≥1.0 s in a 3 s window, with Q ≥ 0.5 (record Q_armed).
2. Fires: within 6 s, finger down with s ≥ 0.6 for ≥1.8 s continuously, and drained ≥ 0.25·Q_armed.
3. ctx.discover('slowing', {qBefore, qAfter, fastMs, slowMs}).
4. Subtitles: 'See what happened?' (2.2 s) · pause 0.8 s · 'You changed your pace.' (2.4 s) · pause 0.8 s · 'The world responded.' The last line holds until tapped or 8 s of play, then docks as a replayable chip.
5. Then the offer 'Keep this? The Power of Slowing Down'.
Fallback for players who are never fast: 'stillness': 'You held still. The storm let go a little.'

Natural completion: p ≥ 1, or (p ≥ 0.7, Q < 0.15 and ≥2 postcards grounded), plus finger lifted ≥1.5 s. Then pulse('clear') and transform(1). The storm stays playable (small crackles still work), and the subtitle 'The storm's gone quiet. Stay, or drift on?' offers Stay / Drift on chips; Auto-flow melts after 4 s of rest.

Reduced motion: arcs become soft shimmer; no glitch bands or bolts (the realm already scales them); postcards don't flutter.

### 6. World 2 'Luminous Ocean': physics and gameplay spec (prototype measured 3.65 ms per frame)
Projection:
- World plane (x, z) in near-plane px. s(z) = 1/(1 + z/Z0), with Z0 = 0.3U.
- y = hy + Hw·s(z) − h·s(z); x_screen = W/2 + x·s(z).
- Draw 56 perspective rows (y spaced by pow 1.35) × 40 columns, far to near.
- Each row is a luminous crest stroke with alpha 0.12 + 0.5s, brighter where h > 0.6A. Add bioluminescent glow sprites at crest maxima and a dawn reflection column (blue-drift slice technique).
- Palette: deep teal #062433→#0a3f55, crest light #7cf5ff / #a8fff0, warm dawn from the resolved storm.

Wave packets (pool K=16; replace the smallest A·E):
- Stroke to packet, on pointerup, or every 0.4 s / 120 px during long drags:
  - Ls = stroke length on screen; v̄ = mean speed; s = smoothstep(0.9U, 0.15U, v̄).
  - λ = lerp(0.12U, clamp(1.5Ls, 0.3U, 1.8U), s).
  - A = min(0.45/k, (0.04 + 0.06s)·λ), so kA ≤ 0.45 and nothing breaks.
  - d = normalised world-space stroke vector; a tap gives a radial ring.
  - Envelope E = exp(−along²/2σl² − across²/2σw²), σl = 0.6·Ls_world, σw = 1.2σl, centred at the stroke midpoint.
  - φ is set so the crest sits under the finger at release.
- Dispersion: k = 2π/λ, ω = sqrt(g·k + σ·k³), g = 59.5 px/s², σ = 18400 px³/s². Group velocity c_g = (g + 3σk²)/(2ω) moves the envelope.
- Viscous decay: A(t) = A0·e^(−βt), β = 0.0233 + 40.7·k².
- Results: λ=400 px → T≈6.3 s, lifetime ≈30 s, c_g≈32 px/s (a slow roll). λ=50 px → T≈0.95 s, lifetime ≈1.5 s (chop that fades). Physics itself rewards long slow strokes.
- Height h = Σ A·E·cos(k(d·p) − ωt + φ). For crest sharpening, use Gerstner horizontal displacement x' = x − Σ Q·A·E·d·sin(…) with Q = min(0.8, 0.6/(k·A·N)).

Instant response: a 2-D height field at 4 px cells over the water region only (c² = 0.24, damping 0.996 per step; ~0.13 ms per step plus 0.37 ms shading measured). The finger injects −0.6 depth with r = 2 cells; the gradient magnitude is shaded additively as cyan bioluminescence. Holding still on the water 'hushes' it locally: packet E ×(1 − 0.5·hushMask), with a soft calm circle.

Floaters (Glitzi, Thought Mallow, bubbles):
- Buoyancy: y'' = −40(y − h) − 7y'. Tilt = 0.6·atan(∂h/∂x), via rig tilt/float.
- Stokes drift u = 3·Σ d·ω·k·(A·E)²: about 14 px/s per 30 px, 400 px swell before the gain.
- Glitzi has a home spring (z ∈ [0.2U, 0.5U]) and stays in the foreground. A thin translucent luminous water lip in the front layer crosses its lowest 10% (floating, not masking the face).
- The Thought Mallow has no home spring. Swells sent away carry it toward the horizon; z is capped at 9·Z0 (s ≈ 0.1) and it stays visible. Its token tag keeps ≥13 px text even when the body is small. Strokes toward the viewer bring it back.
- Photos are bubbles (photos.draw shape 'bubble', sheen) scaled by s(z), at least 44 px until z > 6·Z0. Tapping one lifts it and makes it glow (sound 'bubble' with a note).

Discoveries:
- 'long-waves': ≥2 short flicks (λ < 0.2U), then a slow long stroke (s ≥ 0.7, Ls ≥ 0.45U). Subtitles 'Slow and long…' / '…and the whole sea rolls.'
- 'distance': the Thought Mallow passes 4·Z0 through the person's swells. Subtitles 'Look how far it drifted.' / 'Still there. Still yours.' / 'Just more sea in between.' Memory: 'A Little More Room'.
- If it drifts back: 'You can bring it closer too. Your choice.'

Natural completion: ≥4 long swells made (λ ≥ 0.6U), and either Thought distance ≥ 4·Z0 for 5 s or a dominant period ≥ 5 s held for 10 s, plus idle ≥2 s. Then packets damp ×3, the moon path brightens, and the next world is prefetched.

Glitzi: calm/sleepy mix rises with the dominant period; a tiny 'hop' on big crests.

Reduced motion: amplitude ×0.4, drift ×0.6, bob ×0.3, no twinkle. Low stim: 36 rows, half the glow.

### 7. Thought Mallow, words and photo integration rules shared by all worlds
- The world owns the Thought Mallow's position, physics and state (tension, charge, distance). The Thought Mallow system owns its look and face.
- Words: always words.token (exact text, ≤42 characters, never reworded), at ≥15 px on a plate or as light. The full text appears only in the reading overlay (host.js:194 openWords pattern). Canvas text is drawn with fillText, so it is never parsed as markup.
- Photos:
  - The photoApi instance is shared across worlds, so index i keeps its identity through the melt (postcard i becomes bubble i).
  - Allowed transformations only: ground, cool, float, drift away, soften. Never strike or sink.
  - Never persisted: serialize() stores indices and states only. On resume without photos, fall back to the Mallow cards.
- Subtitles are DOM, not canvas, for crisp, accessible aria-live text. The director places the band on the side away from the active touch (host.js:462 logic) and passes ctx.safe, so worlds keep touch targets out from under it.

### 8. Evidence-informed principles and honest wording
STORM: intentional slowing, arousal downshift and a response pause.
- Catalogue: SKILLS[0] 'Intentionally Slow'. does: 'Move each object at half your usual speed; follow the path without rushing.' insight: 'Deliberately slowing a response creates space before choosing an action.' scope: Moderate – mechanism family; V3_SKILLS.md source pubmed 38518585. I believe that is the 2024 Kjærvik & Bushman meta-analysis showing arousal-decreasing activities reduce anger while arousal-increasing ones don't reliably; worth checking.
- Also SKILLS[12] 'Reaction Gap' (Moderate – treatment-derived): 'Not acting immediately is an available choice.'
- Venting research doesn't support relief through aggressive release. So the charge phase is expression and noticing ('That's a lot of charge. Totally allowed.'); relief is tied only to slowing; nothing says 'get it out'.
- Memory Garden copy: 'The Power of Slowing Down. When everything's crackling, slowing one movement leaves a gap before you react. Try it: put the phone down for ten seconds before you reply.'
- Precaution, verbatim: 'Do not drive or interact while walking in traffic.'

OCEAN: ACT defusion and decentring, plus symbolic distancing.
- Catalogue: SKILLS 'Cloud Witness' ('A thought can recur without needing to be pushed away.'), 'Thought Is Not Order' ('Having a thought does not create an obligation to obey it.'), 'Room for This' ('Allowing a feeling is not agreeing with the situation.'). All Moderate – treatment-derived; pubmed 38615492.
- Wording: 'Watching a thought from a little further away can make it feel less like an order. It doesn't make it untrue, and it doesn't have to disappear.'
- Never sink, delete or 'wash away' the thought. Trying to suppress thoughts tends to make them come back, so returning is normal and welcome.
- Precautions: Cloud Witness 'Stop if imagery causes distress or dissociation'; Thought Is Not Order 'Do not invalidate realistic danger signs; show seek-help route'. Keep openSupport reachable.

GLOBAL:
- Discovery lines describe the game's own contingency, which is literally true.
- Transfer claims say 'can help' or 'many people find'. No 'calms', 'cures', 'reduces anxiety', 'rewires'. No breath holds.
- Long strokes are not breath instructions (the brief says not to turn everything into breathing).

### 9. Confirm the liked wave experience with the owner
Suggested question: 'Was the wave you liked Loomi's "Slow the wave" in Drift and Dock (trace the glow right as you breathe in, back left slower as you breathe out; rushing makes the water choppy)?' If yes, World 2 keeps its pace→mirror-calm contingency and cyan Loomi light, but changes the verb from tracing a fixed path to sculpting swells with physics and floating things on them. If the owner meant GE-13 Moon Tide (dev lab only) or the Blue Drift backdrop, the same ocean design still fits: layered crest rows plus a mirror-calm finish.

### 10. Build sizing (input for the ETA answer)
Estimated new or changed code, about 2,900 lines in total:
- Realm core extraction: ~120 (low risk; the API is already clean).
- Director, input velocity, compositor and melt: ~600.
- Registry and save/rotation: ~150.
- Discovery detector and subtitle hooks: ~250 (the subtitle DOM itself belongs to the MallowTouch/subtitle stream).
- Static Storm world: ~700 (heavy reuse of the realm and fx).
- Luminous Ocean world: ~900 (new renderer; the physics is prototyped and cheap).

Framer side: zero changes. The app stays iframe-hosted, and worlds are lazy import()s, so the TSX remains 94 lines and no ritual text or base64 is embedded. Compare GE-13 (1,054 lines) and GE-43 (943 lines): each ocean or storm world is roughly one large engine's worth of work plus integration and QA at 375/390/430 widths.


## Risks
- The backdrop is slow to respond: realm mood eases with τ=1.4 s and transform with τ=1.7 s (realm.js:123-124). Without a tau override, plus immediate feedback in the world's own gameplay layer, the 'You changed your pace. The world responded.' contingency will feel laggy and the discovery loses credibility.
- Frame cost: static-storm measured 23.5 ms per frame agitated and 11 ms resolved (swiftshader, dpr 1, quality 'low'). During a melt both worlds render. This needs profiling on a real iPhone. Adaptive DPR exists only inside each realm (realm.js:266-274); the director needs a global quality governor.
- Synchronous realm builds take 30–58 ms (mountRealm measured) and will drop frames at a transition unless prepare() runs in idle time before the melt. The melt must wait for prepare(); it must not mount on demand.
- static-storm drawGlitch copies its own canvas (static-storm.js:692). Rendering two worlds into one shared canvas would smear the other world into the glitch bands. Each world needs dedicated layer canvases.
- Multiple independent rAF loops (each mountRealm instance, the MallowRig shared loop, host) cause frame-pacing jitter. The director should drive realm cores manually.
- The #mallow-layer CSS transform transition of 720 ms (app.css:13-16) conflicts with per-frame floating. It needs a no-transition float channel (CSS var or rig.setFloat).
- Photo cap: MAX_PHOTOS = 6 (photos.js:24), but the brief says 0–7.
- Fonts: canvas FONT is Fredoka (fx.js:313), but the typography brief requires Nunito Sans / Manrope / Fraunces. Canvas text drawn before the font loads falls back silently; await document.fonts.load and bundle woff2 locally (no font service, per FRAMER.md privacy).
- The owner's 'wave experience I previously liked' is an inference (Drift and Dock 'Slow the wave'); nothing in git or the docs records it. Confirm before polishing.
- Evidence framing: rewarding fast 'charge' scribbling as release would contradict venting research. The Thought Mallow must never be sunk or deleted (suppression tends to backfire). Discovery and Memory Garden copy must avoid cure or relief claims.
- Photosensitivity: realm pulses are throttled (≤3 bright events per second, realm.js:328-333), but new world-level arcs and glitch effects bypass that limiter and need their own (flashEnv rise ≥0.28 s, no full-screen flicker).
- Speed thresholds vary by device, finger and mouse. Use pointerType-specific constants and calibrate per person from the first 3 s of play; otherwise some people can never reach the 'fast' or 'slow' bands.
- Audio: there is no 'luminous-ocean' ambience bed (audio.js:37 REALMS list). Haptics don't work in iOS Safari or the Framer iframe (FRAMER.md), so feedback must not rely on them.
- GE-13, GE-37 and GE-39 are not in BUILT (engines/index.js:5-7). Use them as visual references only, not as dependencies.
- Shared, slow test machine: the timings above are relative and swiftshader-based, not phone-representative.