# Building a ThinkStill console game

You are adding one game to the **Reset** console (change your state) or the **Reframe** console (change the story, keep the
facts). Each console ships as one Framer code component with 100+ games. Your game is one module file. Read this whole
file, then read `games-reset/002-lighthouse-keeper.js` (the reference game) before you write anything.

## 1. The quality bar (binding, from the ThinkStill Creative Standards)
- **Interaction, never a questionnaire.** The core verb is physical and playful: drag, hold, sweep, trace, stack, steer,
  rotate, splice, weigh... Typing is never the main verb (the console already collected the player's words).
- **Characters are in-world participants** that react and transform (worried → calm → delighted) because of what the
  player does. Use the bubble cast through `K.character()` (never crop the art; speech always beside it, never on top).
- **A unique, spectacular finale** built from your own game's objects (e.g. the boats you moored light lanterns that rise
  into a cleared sky). `K.finale()` gives you effects; combine them with your objects and colours so the ending is yours.
- **An arrow on every step.** Call `K.guide({...})` at the start of every step: the gold glove hand demonstrates the exact
  gesture on the live target, with a 2-4 word UPPERCASE label (max 22 characters). It hides on touch and returns after
  4 s idle on its own. Never leave a step without a guide.
- **Real reasoning, honest.** Use `ctx.analysis` (the player's own words, already read by AI or the local reader). Never
  invent facts about their life, never mock a real concern, never promise they will feel better.
- **Readable.** All text ≥ 12px; the player's own words ≥ 15px (put them in an element with class `gk-user`). Nothing may
  overlap the character art, nothing clipped, nothing outside the frame. Touch targets ≥ 44px.
- **Mobile first** (390×844), and it must also look right at desktop 1280×860. **Dark and bright** themes both readable.
- **Three readiness levels:** functional (plays start to finish), visual (polished at both sizes and themes), premium
  (cinematic: depth, light, motion, sound design). Aim for premium.
- **Distinct.** Your core verb and structure must differ from every other game in the console. Look-alike games must play
  differently.

## 1b. Hypnotic, fun, and worth coming back to (the founder's bar: max quality, viral, addictive in a healthy way)
- **Juice on every touch.** Within 50 ms of any input: a sound, a visual response (squash and stretch, glow, particles, a tiny
  camera nudge). Nothing feels dead. Physics should feel satisfying (springs, easing, weight, follow-through).
- **Hypnotic flow.** One core gesture the player repeats with growing mastery, in rhythm with the music and the visuals
  (audio-visual sync, smooth continuous motion, colour that drifts from tense to calm). No dead air, no walls of text.
- **Surprise and escalation.** A twist about halfway; characters with comic timing that react to *what the player just did*;
  spectacle that builds; a finale that tops everything before it and leaves a frame worth screenshotting.
- **Reasons to come back** (use the kit): `K.daily()` / `K.dailyPick(arr)` for a world that changes each day (weather, time of
  day, props, palette); `K.best(key, value, 'higher'|'lower')` for personal bests in calm skill (longest exhale, smoothest sync);
  `K.tier(score)` for Bronze/Silver/Gold mastery; `K.collect(item)` for a per-game collection that fills over visits;
  `K.visits()` for content that evolves after repeat plays (a new variant, a new character cameo, a harder twist); and a natural
  "next time" hook where it fits. Report achievements with `ctx.finish({ ..., badges: ['New best: 7.4 s exhale', 'Gold', 'Collected: Moon Moth'] })`.
- **Viral moment.** A share-worthy final frame and a one-line share text with no private words.
- **Ethics, non-negotiable.** No streak shaming, no penalties for not returning, no countdowns that pressure, no endless loops,
  no loot-box randomness for rewards. Sessions end calmly. Rewards celebrate the shift and the skill, never time spent.

## 2. File format
One file: `games/games-<mode>/<NNN>-<id>.js` (NNN = the number you were given). Exactly this shape:

```js
/* NNN Name — Mode · FAMILY · Parent
 * Mechanism: what the player does and why it helps (one or two sentences, cite the technique).
 * Verb: ... Finale: ...
 */
(function (env) {
  'use strict';
  (env.games = env.games || []).push({
    id: 'my-game', mode: 'reset', name: 'My Game', verb: 'sweep', family: 'GROUND', minutes: 2,
    parents: ['Panic / Body Alarm'],            // 1-3 of the 22 parents below, best first (drives routing)
    cast: ['still'], poster: { char: 'still', mood: 'calm' },
    tagline: 'One short line, at most 70 characters.',
    why: 'Why the router picked it: who it is for, at most 100 characters.',
    css: `.g-my-game .mg-thing { ... }`,          // every selector starts with .g-<id>
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el, an = ctx.analysis;
      // build the world into el, then run the flow without awaiting it:
      (async () => { await K.intro({...}); /* steps... */ finale(); })();
      return { async autoplay() { /* play to the end through real inputs */ } };
    }
  });
})(window.TSG_ENV);
```

`mount` must **return within a moment** (build the scene, start the async flow, return `{ autoplay }`). When the game ends,
call `ctx.finish({ title, mood, lines: [up to 3 short facts], share: 'one line, no private words' })` exactly once. The
console then asks the after-rating, shows XP and offers the next game. Do not build your own before/after ratings, XP,
share sheet or "did it help" (the console owns them). `ctx.before` holds the player's before-rating if you want to use it.

The 22 parents: Attention / Grounding / Mental Quiet · Beliefs / Evidence · Communication / Boundaries · Creativity / Mind Play ·
Decision Pressure · Emotion · Getting Started · Identity / Self · Inner Speech / Mental Text · Memory / Replay / Rumination ·
Mental Imagery · Mental Overload / Working Memory · Overthinking / Thought Fusion · Panic / Body Alarm · Performance / Confidence ·
Positive State · Sleep / Winding Down · Social / Team / Perspective · Support First / Safety · Uncertainty / Future Worry / Reassurance ·
Urges / Habit Loops · Values / Meaning / Grief.
Families: GROUND INTERRUPT DISTANCE ORGANISE ACT CHOOSE FEEL CLARIFY CONNECT PLAY QUIET AMPLIFY REFRAME EXPLORE.

## 3. What you get: `ctx`
| field | what |
|---|---|
| `ctx.el` | your game's root element (absolute, fills the console). Build everything inside it. |
| `ctx.TS` | the engine, scoped to your game: `later(fn,ms)`, `sleep(ms)`, `listen(target,type,fn)`, `loop(fn)`, `on(evt,fn)`, `onDestroy(fn)`, `store.get/set`, `track`, `h`, `clamp`, `lerp`, `ease`, `rng(seed)`, `pick`, `words(s,n)`, `clean(s,n)`, `scene()` ('dark'/'bright'), `reduced()`, `settings.vibe` |
| `ctx.kit` (K) | the kit (below) |
| `ctx.A` | audio engine (prefer `K.sfx` / `K.music`; raw: `A.tone`, `A.noise`, `A.pluck`, `A.chime`, `A.drum`, `A.pad`, `A.loop`, `A.note('C4')`, `A.now()`) |
| `ctx.text` | what the player typed ('' if they came from the library) |
| `ctx.analysis` | the reading of their words (shapes below). Always present. |
| `ctx.analysisReady` | Promise of the final (AI) analysis if it is still arriving. Most games just use `ctx.analysis`. |
| `ctx.intensity` | 0 Gentle, 1 Standard, 2 Full: change pace, windows, counts and spectacle |
| `ctx.vibe`, `ctx.line({Jolly:[..], Cheeky:[..], Unfiltered:[..]})` | voice: write every character line in all three vibes |
| `ctx.ai(prompt, {tier:'quick', fallback})` | optional extra AI call returning parsed JSON or your fallback (guardrails are prepended). Always have a deterministic fallback. |
| `ctx.track(name, data)` | metrics (numbers and short codes only, never the player's words) |
| `ctx.finish(result)` | end the game |

### Reset analysis (`mode: 'reset'`)
`{ safety, parent, parents2[], patternName, intensity 1-10, feeling, strands:[{label, loop}], core:{label, loop}, body:[], urge, task, tinyStep, kind, host:{intro,outro}, source }`
- `strands`: 3-6 short UPPERCASE labels of their looping thoughts in their own terms (e.g. "WHAT IF I FAIL"); `core` is the heaviest.
- `loop` ∈ replay, whatif, shouldhave, mindread, todo, worstcase, body, urge, other. `urge`/`task` may be ''.

### Reframe analysis (`mode: 'reframe'`)
`{ safety, parent, patternName, intensity, feeling, case_title, situation, thought, conclusion, distortions:[{type,label,quote}], spans:[{quote, kind}], exhibits:[{id,kind,text,why}], witness_id, unknowns:[{id,text,about}], alternatives:[{id,name,theory,needs,plausibility,fear,line,fits}], fear_support, support_reason, balanced, friend, future, evidence_for[], evidence_against[], probability:{fear,basis}, leads:[{kind,text,for}], source }`
- `spans` are exact substrings of `ctx.text` labelled camera (could be recorded) or brain (meaning added).
- `alternatives`: 3-4 rival explanations; exactly one has `fear: true`. `fear_support` weak/some/strong: when strong, your game must
  take the concern seriously (plan, not pep talk).
- If `analysis.safety === 'care'` (health, money, housing, legal): no jokes about the concern; point toward proper help.

## 4. The kit (`K = ctx.kit`)
- **Canvas:** `const cv = K.canvas(el)` → `{ el, g, w, h, dpr, onResize(fn), clear() }` (DPR-aware, resizes itself). Draw in `K.loop((dt, t) => {...})`.
- **Particles:** `const P = K.particles(); P.emit('spark'|'ember'|'dust'|'confetti'|'bubble'|'petal'|'snow'|'mote'|'star'|'drop'|'smoke'|'leaf', x, y, n, {colors, angle, spread, speed})`; each frame `P.update(dt); P.draw(g)`.
- **Input:** `K.press(el, {down(p), move(p), up(p)})` (pointer capture, local coords), `K.drag(el, {start(p), move(p, d), end(p, d)})` (`d.dx, d.dy, d.vx, d.vy`), `K.hold(el, {ms, still, decay, start, progress(k, active), done, cancel})`, `K.tap(el, fn)`, `K.onKey(['Space','ArrowLeft'], fn)`, `K.local(e, el)`, `K.rectIn(el)`.
- **Rhythm:** `const R = K.rhythm({ bpm, onBeat(t, i, beatInBar) })` → `start(delay)`, `set(bpm)`, `window()`, `pos()`, `judge()` (audio-time accurate).
- **Characters:** `const c = K.character('loopie'|'glitch'|'patch'|'drop'|'rush'|'still'|'sync', { side:'right'|'left'|'above'|'below', mood, x, y, size })`
  → `c.say(text, {mood, ms})`, `c.face(mood, ms)`, `c.base(mood)`, `c.react('bounce'|'shake'|'glitch'|'spin')`, `c.place(x, y, ms)`, `c.hush()`.
  Moods: neutral happy laugh love wow surprised worried sad cry angry cool wink think calm sleepy celebrate shy determined silly confused idea (+ a few per character, see `TS.MOODS`).
  Who's who: Loopie (loops, rumination), Glitch (thinking errors, detective), Patch (relationships), Drop (meaning, feelings), Rush (urgency, action, urges), Still (calm, body, grounding), Sync (emotions, impulses).
- **UI:** `K.intro({title, sub, how, char, mood})` (title card, tap to skip; always start with it), `K.button(label, fn, {quiet, parent})`, `K.chips(parent, items, onPick, {multi})`,
  `K.slider(parent, {min,max,step,value,label,left,right,format,onInput})`, `K.panel(parent)`, `K.userText(text)`, `K.hint(text)` (bottom pill), `K.pop(text, {x, y, kind:'good'|'great'|'soft'})`, `K.progress(parent, n)`.
- **Guide:** `K.guide({ g:'tap'|'hold'|'drag'|'sweep'|'circle'|'choose'|'type'|'still', target: element | [elements] | () => ({x, y}), label, dir:'r'|'l', d, r, ms, place:'above'|'below', ox, oy, delay })`; `K.guide(null)` clears.
- **Sound:** `K.sfx.tap|ok|good|great|soft|no|whoosh|pop|thud|paper|chime(i)|rise|fall|lock|sparkle|win|glitch|heartbeat()`, `K.music('calm'|'lofi'|'noir'|'playful'|'space'|'ocean'|'musicbox'|'arcade')` → `{stop, level, tempo}`, `K.ambience('rain'|'prairie'|'room'|'dawn')`.
- **Finales:** `await K.finale('constellation'|'lanterns'|'bloom'|'fireworks'|'aurora'|'sunrise'|'confetti'|'ripple'|'bubbles'|'fireflies'|'petals'|'stars'|'rainbow', { from:[{x,y}], colors, count, text, chord:['C4','E4','G4'], ms })`.
- **Words:** `K.phrases(text, max, maxWords)` short phrases from the player's own words; `K.sentence(s)`; `K.words(s, n)`.
- **Autoplay helpers:** `K.sim.tap(el)`, `K.sim.hold(el, ms, x, y)`, `K.sim.drag(el, {x,y}, {x,y}, ms, steps)`, `K.sim.press(el, x, y)` → `{move, up}`, `K.wait(ms)`. Coordinates are local to `el`.

## 5. Rules that keep 200 games healthy
- Use `ctx.TS.later/sleep/listen/loop/on` and the kit for everything timed or event-driven. **Never** call `setTimeout`, `setInterval`,
  `requestAnimationFrame` loops, or `window.addEventListener` directly (they leak when the console unmounts your game).
- No network, no external images or fonts beyond: character art via `K.character` / `TS.faceUrl(char, mood)` and Google Fonts
  listed in `fonts: ['Caveat:wght@600']` on the game object (always give a fallback stack). Everything else is drawn (canvas, CSS, inline SVG).
- **No regex lookbehind** (`(?<=`, `(?<!`): older iOS Safari crashes on it.
- Storage only through `ctx.TS.store.get/set('<id>:key', value)` and never store the player's words.
- CSS: every selector starts with `.g-<id>`. Use the console tokens for UI chrome (`--ui-surface`, `--ui-fg`, `--ui-muted`, `--ui-accent`,
  `--ui-line`, `--font-ui`, `--font-display`); your world can have its own palette, but check it reads in bright too
  (`ctx.TS.scene()` tells you which, and `ctx.TS.on('theme', fn)` fires when it changes).
- The console's top bar sits at the top 56px (left: game name + leave button; right: sound + settings). Keep your HUD below
  `calc(env(safe-area-inset-top, 0px) + 60px)` and keep the bottom 16px clear for the home indicator.
- Reduced motion (`K.reduced()`): no shakes or flashes, shorter tweens; the game must still be completable.
- Keep sessions 60-150 seconds. Gentle = slower and more forgiving; Full = tighter, more objects, more spectacle.
- Sound: give every action an immediate sound (`K.sfx.*` already logs action→sound sync). Keep music under the action.

## 6. Autoplay (required)
`autoplay()` plays your game start to finish through your real input handlers (`K.sim.*` on your actual elements; for keyboard
games, dispatch keydown events), waits for each step to become ready, and resolves after `ctx.finish` has been called.
It must finish in under ~120 s. QA uses it on every build.

## 7. Test before you report
```
python3 games/tests/qa.py --mode <mode> --games <id>                                   # phone, dark
python3 games/tests/qa.py --mode <mode> --games <id> --configs 1280x860:bright        # desktop, bright
```
Then **look at the screenshots** in `games/tests/out/qa-<mode>/<id>/` with the Read tool (start, mid, finale, after) and fix what a
picky art director would flag: overlaps, clipping, empty space, low contrast, small text, flat visuals. Re-run until both
configs print PASS and the screenshots look premium. Don't edit anything outside your own game files; if the kit or console
has a bug, work around it in your file and mention it in your report.

## 8. Report
Reply with: files written, each game's one-line pitch, verb, the QA lines for both configs, seconds to complete, frame p95,
anything you couldn't solve, and any kit/console bug you hit.
