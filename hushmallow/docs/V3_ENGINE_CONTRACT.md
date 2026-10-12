# V3 touch engine contract

Every one of the 1,000 Hushmallow rituals is **one touch engine × one world
law**, led by one Mallow in its realm. There are 50 engines
(`src/v3/engines/ge-01.js` … `ge-50.js`) and 20 laws (`src/v3/laws.js`).
The host (`src/v3/host.js`) runs both, draws the shared effects, the Mallow,
the plot twist, the finale and the mind bend. `ge-01.js` (Molten Tempo) is the
reference implementation and the quality bar.

The catalogue row for each engine (`src/v3/data/catalog.js` → `ENGINES`) gives
its `prop`, the exact base user `motion`, the responsive `physics`, the `win`
state and the iPhone input `primitive`. The engine must implement exactly that
fantasy, physically.

## Module shape

```js
import { … } from '../fx.js';      // effects library (glow, particles, springs, text, shapes…)
import { … } from '../kit.js';     // CurveTrace, AngleTracker, hit, Wobble, waitRing…

export const meta = {
  id: 'GE-07',
  howTo: 'One sentence, ≤ 70 characters, imperative, British spelling.',
  steps: ['Three short steps…', '…', '…'],
  tapAlt: 'each press <does one gentle step>',      // completes "Prefer tapping? Press “Tap instead” — …"
  words: 'Where the person’s words appear and how they change.',
  photos: {                                          // shown in How to play when photos were added
    where: 'Where the photos appear.',
    becomes: 'what object they become',
    touch: 'How the person touches/moves them;',
    change: 'how they transform (gently — see the safety list).',
    payoff: 'The final payoff for them.',
  },
  finaleSec: 4,                                      // optional: how long the finale needs (host waits ≥ 3.8 s)
};

export function create(E) {
  // … build the scene inside E.stage …
  return {
    get progress() {},   // 0..1, ONLY ever moved by input (via the law gate)
    get done() {},       // true once the win state is reached (and resting — not mid-drag)
    frame(dt, t) {},     // update + draw everything (host clears the canvas first; dt = 0 while paused)
    down(p) {}, move(p) {}, up(p) {},   // p = {x, y, id, t}; multi-touch: track by id
    assist() {},         // "Tap instead": one meaningful, animated step through the same state path
    pointAt(p) {},       // {x, y} of the active object at progress p (laws draw guides / pulses / wakes here)
    hint() {},           // ghost demo of the next move: {path:[[x,y]…]} | {from:{x,y}, to:{x,y}} | {tap:{x,y}}
    twist() {},          // optional: the plot twist moment (a delightful, non-flashing surprise)
    finish() {},         // start the finale; keep drawing it in frame()
    destroy() {},
  };
}
```

## The engine context `E`

| Field | What it is |
|---|---|
| `g` | the 2D context, CSS-pixel units (DPR handled by the host) |
| `stage` | `{x, y, w, h, cx, cy, s}` — the free area between the title block and the dock; `s` ≈ min(w,h)/360 (0.72–1.45). Live object; use `E.onResize(fn)` to re-fit |
| `view` | `{w, h}` of the viewport |
| `fx` | the effects library module |
| `pal` | realm palette: `sky, deep, glow, accent, warm, ink, text` (+ realm extras) |
| `realm`, `mallow` | ids (`static-storm` …, `glitzi` …) |
| `heavy` | the feeling is heavy (sadness, hurt, shame…): finales must be gentle — no bursts or confetti |
| `reduced`, `lowStim` | reduced motion / low stimulation: no shake or jitter, fewer particles |
| `rand()` | deterministic random (seeded per ritual) |
| `seed` | per-round seed (ritual number + round) |
| `round` | 1 for the ritual itself; 2, 3… when the person taps **Keep playing** and the game loops. The host re-creates your engine for every round, so no reset logic is needed |
| `calm` | 0 on round 1, rising to 0.6 over loop rounds: let later rounds start a little calmer (less agitation, softer colours) so each loop feels more relieving |
| `words.token` | the short excerpt of the person's own words (≤ 42 chars). **Must be visible in the scene**, legible (≥ 12 px), part of an object. `words.draw(g, x, y, {style, size, maxWidth, lines, alpha, rot, glowColour})` with styles `plate · light · ember · frost · etched · ink`. `words.full` is the full sentence (shown by the host's reading overlay; don't render long text in the scene) |
| `photos` | the ritual's photo material: the person's own photos (1–6), or, when they add none, the seven Mallow cards (7, `photos.standIn` is true). 0 only if the Mallow art can't load — see below |
| `particles` | shared additive particle pool: `emit({x,y,vx,vy,life,size,colour,drag,gravity,kind})`, `burst(x,y,n,{speed,colour,life,size,kind,dir,spread})`; kinds `glow` (default), `glint`, `dot` |
| `ripples` | shared ripples: `add(x, y, {colour, speed, alpha, r})` |
| `gate(raw)` | **call every frame** with the progress your input asks for; use the returned value as the real state. World laws use it (guide light, pauses, beats, slow last third, wakes) |
| `allow(p)` | for discrete steps: may the state move to `p` now? If not, give a gentle "not yet" response (wobble) and call `checkpoint('wait')` |
| `locked` | the law is asking the person to wait right now |
| `checkpoint(name, i)` | `'photo'` when photo `i` visibly transforms (Mallow reacts), `'step'` on a discrete step, `'wait'` when a move was refused by the law |
| `react(kind)` | Mallow one-shot: `tap, nod, gasp, comfort, success, release, sigh, hop, shiver` (host throttles) |
| `sound(name, opts)` | `{intensity 0..1, pitch ratio, pan -1..1, note n}` — see sound list |
| `hold(name, opts)` | sustained sound → `{update({intensity, pitch}), stop()}`: `charge, ground, drain, hum` |
| `haptic(kind)` | `tick, light, soft, pop, success` |
| `hint(text)` | replace the prompt line under the title (sparingly, for stage changes) |
| `now()` | host clock in seconds (stops while paused) |
| `phase` | `'play'` → `'law'` (closing move: keep drawing your resting scene but **don't draw the words token** — the law shows it) → `'finale'` → `'end'` |
| `onResize(fn)` | re-fit geometry when the stage changes |

Sounds (`E.sound`): `pluck, glass, drip, bubble` (pentatonic — pass `note: 0…9` so a sequence of touches plays a small melody), `paper, wind, settle, swish, shimmer, thrum, click, unlock, rotate-tick, lens-focus, chime, star, bloom, snap, sort, drop-in, clear, portal, separate, crackle, charge, ground, breathe-in, breathe-out`.

## Photos (`E.photos`)

* `n`, `assign(k, {repeat})` (spread photos over k objects), `size(i, shape, size) → {w,h}`, `colour(i)`, `sampleColour(i, u, v)`.
* `draw(g, i, x, y, size, {shape, rot, alpha, scale, tone, toneMix, blur, glow, glowColour, dissolve, mode, edgeColour, shadow, sheen, flipX, skewY})`
  * shapes: `circle round card natural page hex drop petal pill arch shard cloud stone capsule blob bubble` — choose an intentional shape system per engine. Use `card`/`natural` when the photo is shown large (no cropping); medallions/charms can be `circle`/`round`/`hex`/`drop`/`petal`/`bubble`.
  * tones (crossfade with `toneMix`): `gray mist warm gold cool ember storm night rain dawn glow`; `blur` 0..1 crossfades to soft focus.
  * `dissolve` 0..1 with `mode` `edge | up | down | centre` turns the photo into light from that direction (glowing edge in `edgeColour`).
* `dust(i, x, y, size, n, opts)` motes coloured like the photo; `edgeDust(i, x, y, size, t, n, opts)` motes from the current dissolve edge.
* `pieces(i, size, n, {shape})` + `drawPiece(g, piece, x, y, {rot, alpha, scale})` soft pieces (for untangle / scatter / drift apart).
* `drawClipped(g, i, pathFn, x, y, w, h)` photo seen through any path (window, lens).

**Rules**
1. Photos are ritual *material*: they become the engine's objects (tiles, charms, capsules, stones, pages, cloud portraits, lanterns…) and the person physically moves or transforms them.
2. 0 photos must look complete and beautiful (default objects; test with `&mallows=0`). 1 photo may be reused or be the hero object. 2–7: distribute evenly; each appears at least once. With no photos of their own the person gets the seven Mallow cards (`src/v3/mallow-cards.js`: each Mallow in its realm's light, 4:5 portrait), so 7 is the common case.
3. **Safety** — never strike, burn, cut, pierce, shoot, smash, crush or explode a photo (especially of a person). Allowed transformations: dissolve, wash away, cool down, unhook, shrink, soften, fade, scatter into light, detach, melt softly, seal away, untangle, release, drift into the distance, transform into a harmless form.
4. Show them clearly: no black masks, no hard borders, recognisable, not tiny (≥ 44 px on a 390-wide phone unless deliberately in the distance).
5. Never store or send them. They only exist in this ritual.

## Loop rounds (Keep playing)

After the first win the person can keep playing: the same engine loops in
fresh light, round after round, until they tap Finish. Use `E.round` and
`E.rand()` (re-seeded per round) to make every round feel new — rearrange
objects, change which photo is the hero, vary colours within the palette,
alternate the twist surprise — and `E.calm` so later rounds start calmer.
Never add scores, streaks, timers or anything that punishes stopping.

## Behaviour rules (the build contract)

* **Real input only.** Every finger movement updates a real visual object; progress only moves from input (or `assist()` presses). No autoplay, no timers that complete anything, no fake wins.
* **First useful interaction immediately** — the main object is touchable from the first frame; the hint appears by itself after 2 s idle.
* **Micro-payoff under a second** for every touch: a visual response + a soft sound (pentatonic `note`) + a light haptic, throttled.
* **Win state = the catalogue's `win`**, reached through the catalogue's `motion`, behaving per `physics`.
* **Tap alternative**: `assist()` makes the same progress in ~6–10 presses, animated, through the same gated path (it must respect `E.gate` / `E.allow`). Hold and two-finger moves must be fully completable by presses.
* **Generous touch targets** (hit radius ≥ 26 px + margin) and forgiving geometry; everything inside `E.stage`, re-fitted on resize; must work at 390×844 and 320×568.
* **Premium, emotionally appropriate visuals**: layered light (additive glow), depth (shadows, gradients, highlights), smooth springs, hypnotic slow motion where it fits; calm colours as things settle; no strobe (≤ 3 bright pulses/s), no full-screen flashes; `E.heavy` → gentle finale.
* **Performance**: no per-frame allocation of large arrays or new canvases; cache static gradients/paths; target 60 fps on a phone.
* **Words**: the token is part of the object (etched, inked, glowing, on a tag…), not a floating caption, and stays legible.
* No other text in the scene except tiny labels the motion needs. Non-clinical, British spelling. No network, storage, AI or bots.

## Testing an engine

Serve the repo (`python3 -m http.server 8000` from the repo root) and run:

```
node hushmallow/tools/v3-lab.cjs "engine=GE-07&law=1&photos=3" /tmp/out/ge07-l1 tap
node hushmallow/tools/v3-lab.cjs "engine=GE-07&law=4&photos=0" /tmp/out/ge07-l4 drag
```

`tap` finishes with the Tap instead button; `drag` performs the gestures your
`hint()` describes. Both must reach `"phase":"end"` with no errors. Look at
the screenshots. Check `photos=0` (the seven Mallow cards), 1 and 6 photos, `photos=0&mallows=0` (none at all), a gate law (1, 2, 5, 6, 10), a phase
law, and `&motion=reduce`. In a browser: `index.html?engine=GE-07&law=3&photos=3`.
