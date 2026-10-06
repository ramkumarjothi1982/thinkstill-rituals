# DESIGN · ThinkStill EOS through a Pixar / Inside-Out lens

Author lens: Pixar story artist and art director. Goal: one cohesive emotional world that gives fast, real relief, that is simple to play, and that people come back to for good reasons.

Inputs: I read `map_main.md`, `map_engine_hud.md`, `catalog_A.md`, `catalog_B.md`, `audit_1/2/3.json` (110 live runs), the audit screenshots, `00_arcade.jsx`, `99_pixar.jsx` and `build.py`. I also took new screenshots of the idle, finish and reveal stages. Baseline source: `00_arcade.jsx` md5 `b9e220c3…` (22,786 lines). Every arcade anchor quoted in §I was checked by script and occurs exactly once.

Facts the design depends on (verified):
- Ids 1-99 run `GameEngineLegacy`; ids ≥100 run `GameEngine`. New games get ids ≥111, so they run in `GameEngine` and get the sparks HUD.
- No game shows an arrow in the LIVE GUIDE panel today. 45 of 110 games have no on-target cue at all. The gesture helper is wrong for 44 of 110 games.
- HUD text is 6.2-12px. The user's own words are 8-11px (3.9px in 99).
- The `InfinityField` dots are invisible (`--flow-hue` is undefined). The dots you can see are the 14 Pixar `.tsPxDust` motes, which drift upward, plus 14 `.cinemaDust` dots in each game.
- Emotion detection never influences which game is chosen, and "panicking" falls through to `general`.
- **The arcade already ships a 7-character emotion cast.** `emotionSrc(char, E##)` serves `glitch, drop, still, patch, loopie, rush, sync` with negative and positive faces (`RELEASE_PHASE_EMOTIONS`). This is our Inside-Out ensemble, and no new art is needed.

---------------------------------------------------------------------------------------------------
## 0. World bible (the one-page canon every module follows)

**HQ.** The console is Headquarters. The header title default could become `THINKSTILL HQ`. Change only the default; don't touch saved Framer instances.

**The Still Point.** A soft glowing core at the centre of `.releaseStage`, at the same spot as the idle `.ts-abyss` ring centre (50% / 52%).
- Every stray thought (background dot) spirals into it.
- It always breathes at 6 breaths/min: 4 s swell, 6 s settle. This is a subliminal resonance-breathing pacer that runs under every screen.
- When a game finishes, all the dust rushes in and the core blooms into a **memory orb**.

**Thought Dust.** Every background particle is a loose thought. Its speed and brightness stand for mental noise. Nothing ever floats away aimlessly any more; everything is gathered.

**The Cast.** Existing art; URL = `emotionSrc(char, mood)`. All ids below returned HTTP 200 when checked.

| Character | Existing look | Carries (check-in orbs) | Check-in / "loud" face | Calm face (reveal) | Unlockable happy faces (bonds) |
|---|---|---|---|---|---|
| **SYNC** | electric-blue, lightning on chest | PANIC, OVERWHELMED | E44 (screaming, lightning) / E48 (steam from head) | E90 (asleep on a crescent moon) | E11, E34, E61 |
| **RUSH** | red, expressive | ANGER | E29 (furious) | E44 (belly laugh) | E11, E34, E70 |
| **GLITCH** | dark, TV-static stripes | ANXIOUS (worry, fear, dread) | E15 (wary side-eye), E11 (overloaded) | E10 (cool, unbothered) | E07 |
| **LOOPIE** | purple, spiral eyes | OVERTHINKING | E58 (spiral eyes, mouth open) | E70 (happy wave) | E15, E32, E41 (chef with cupcake) |
| **DROP** | blue water droplet | SAD, EMPTY (lonely or numb) | E58 (crying) / E70 (alone, sleepy) | E03 (big smile) / E08 (hugging a heart) | E06, E09 |
| **PATCH** | warm orange | ASHAMED (guilt, embarrassment, jealousy) | E73 (sheepish, blushing) | E72 (holding a flower) | E11, E32, E75 |
| **STILL** | pale, serene | **The guide.** Lives in the Still Point and narrates | E41 (unsure) | E15 (holding a heart) | E34, E61, E90 |

**Memory orbs.** Each finished session leaves a glowing marble.
- It is tinted with the emotion hue and has the character's calm face inside.
- It gets a gold rim when the felt shift is 3 or more points ("core memory").
- Orbs live on the Orb Shelf (§G).

**Palette tokens** (put in `EOS_GLOBAL_CSS` `:root`-like on `.tsArcade`):
- Emotion hues (hsl hue): `--eos-panic:195; --eos-anger:355; --eos-anxiety:265; --eos-overthinking:285; --eos-overwhelm:210; --eos-sad:215; --eos-shame:28; --eos-empty:180`
- `--eos-gold-1:#FFE58A; --eos-gold-2:#FFB23E; --eos-gold-3:#FF8A2E` (action and reward; matches the Pixar title-card gradient)
- `--eos-still:#7DE3FF` (guide and info)
- `--eos-ink:#0E0C2E` (glass panels)

**Motion grammar** (Pixar 12 principles, condensed):
- Anticipation: 80-120 ms pre-squash, `scale:1.08 .9`.
- Pop: `cubic-bezier(.3,1.6,.4,1)`, the same curve as `tsPxSquash`.
- Springs: framer `{type:"spring", stiffness:420, damping:18}`.
- Follow-through: the label lags its object by 60 ms.
- Timing tiers: micro 120-200 ms, beat 450-700 ms, scene 900-1200 ms.
- Everything respects `reduced` (cross-fades of 200 ms or less, no travel).

**Sound and haptics grammar** (existing `sfx` kinds only):
- Touch: `tap` + `vibrate(8)`.
- Hit: `pop` + 12 ms.
- Heavy: `clack` + 20 ms + 6 px screen shake.
- Calm beat: `soft` (non-scoring; it doesn't trigger a step reward).
- Breath: `hum` on inhale; `rainSfx(5)` brown noise on exhale.
- Reward: `chime` then `win`.
- Heartbeat haptic `vibrate([10,90,10,600])`, stretched each round so it "slows down" under the finger.

---------------------------------------------------------------------------------------------------
## A. Universal guide arrows (every game, both wrappers, new games too)

### A1. What the player sees
A **cartoon glove hand** (classic mobile-tutorial glove, Pixar-chunky) plus a **gold 3D chevron**, a **label pill** and, for drags, a **dotted gold trail**. All of it is aimed at the *live* target. The arrow appears 0.7 s after the game mounts. It demonstrates the exact gesture, gets out of the way as soon as the finger lands, and comes back only when the player seems stuck. It also points at stage-2 targets ("now tap the eggs").

- `svg.eosHand`: 64 px (52 px under 700 px wide). White glove with a 3 px `#1b1650` outline, a soft drop shadow and a −15° tilt. Its hotspot is the fingertip at (18, 4) in its own box.
- `svg.eosChevron`: 44 px gold arrow. Gradient `--eos-gold-1→3`, 3 px white stroke, `drop-shadow(0 4px 0 rgba(90,30,0,.55))`, bobs 8 px toward the target.
- `.eosLabel`: Baloo 2 800, **15 px** (14 px on phone), uppercase, letter-spacing .06em, white on `rgba(16,14,48,.9)`, 2 px `#FFD36B` border, radius 999, padding 8×14, lip `0 4px 0 rgba(8,6,30,.7)`. Max 18 characters, imperative, playful.
- `.eosCount`: a gold 24 px disc showing "×3". It counts down on each pointerdown on the current target element.
- `.eosRing`: tap ripple, 2 rings, `scale .4→1.7`, opacity `.9→0`, 900 ms.
- `path.eosTrail`: SVG, 4 px gold, `stroke-dasharray:6 10`, animated `stroke-dashoffset`.

Placement:
- The hand hotspot sits on the target centre, offset (+6, +8).
- The label goes 18 px above the target if `target.top > 70`, otherwise below. It is clamped 12 px inside `.releaseStage`, and it never overlaps `.globalPlayGuide`, `.engineProgressHud` or the target itself (if it would, flip it to the other side).
- Only **one** arrow is visible at a time.

### A2. Per-gesture behaviour (verb vocabulary)
| verb | used for | demo animation (loop) | label pattern | completion of this stage |
|---|---|---|---|---|
| `tap` | single taps | hand dips 14 px, `scale .9`, ring ripple; period 1.2 s | "POP IT!" | pointerdown on target |
| `taps` (n) | rapid taps | 3 quick dips in 0.6 s + `.eosCount ×n`; period 1.4 s | "CRUSH ×4" | n pointerdowns on the same element (badge counts down) |
| `hold` (ms) | press-and-hold | hand presses and stays; a conic ring fills over `ms`; release flash; period `ms+900` | "HOLD THE FLAME" | progress rises during the press |
| `drag` (d, n, to) | move past a threshold or drop on a target | hand travels start → end along a slight arc in 1.0 s, rests .2 s, fades; the trail draws with it; the chevron sits at the end, rotated to the tangent; period 2.0 s | "SWIPE IT AWAY →" | pointerdown + pointermove more than n/2 on the target, or progress |
| `slow` (d, n, ms) | 36 CLOUD PASS, 44 VELCRO | same as drag, but travel takes 1.8 s with 🐢-paced trail dots (wider gaps) | "DRAG… SLOWLY" | as drag |
| `pull` (d, n) | slingshot / meteor | hand pulls *backward* along d, the rubber-band line stretches, a release flash, then a dashed flight arc forward; period 2.2 s | "PULL BACK & LET GO" | as drag |
| `scrub` | ERASE, SCRATCH | zig-zag of 3 passes over the target in 1.1 s | "RUB IT OUT" | pointermove more than 120 px while pressed |
| `pick` | choose 1 of N | gold halo hops across all matches every 0.8 s; hand rests on the current one | "PICK ONE" | pointerdown on any match |
| `seq` | fixed-order taps | like `tap`, but the selector always resolves to the live element (`.live`, `.hot`, `:not(:disabled)`, `:not(.dead)`) | "HIT THIS ONE" | re-resolves on every DOM change |
| `alt` | 67 TAP OUT | hand alternates between the two pads, starting with the side *not* tapped last | "LEFT · RIGHT · LEFT" | each tap |
| `wait` | 66, 80 | no hand: a cyan ✋ palm in the arena centre inside a breathing ring (4 s in / 6 s out), with a countdown arc | "HANDS OFF · BREATHE" | timer; reappears if the user touches |
| `type` | 50 | blinking caret + chevron pointing at the input | "TYPE WHAT'S NEXT" | input event |

Direction tokens: `r l u d ur dr ul dl` for fixed directions, `out` (away from the arena centre through the target), `in` (toward the arena centre), `lr` / `ud` (double-headed: the demo alternates).

### A3. Lifecycle (so it helps without nagging)
1. **Mount.** Wait 700 ms (games animate in), then resolve the target and pop in (spring, 260 ms).
2. **Finger down** anywhere in `.releaseGameHost` (capture listener): fade out in 160 ms.
   - If the pointerdown is inside the current stage target, advance the stage cursor (two-stage games) and decrement `×n`.
3. **Progress up** (`.engineProgressTrack[aria-valuenow]` increases): a small gold sparkle at the target. The arrow stays hidden. Re-resolve the next target silently.
4. **Stuck detection** reshows the arrow. Any of these triggers it:
   - 2.5 s with no touch at all;
   - 3.5 s after the last touch with no progress change;
   - **1.2 s after a pointerdown that missed the target** with no progress. This one reappears with a 3-shake wiggle and covers every "silent fail" game (BOSS, FLOAT, CRACK/STOMP before the tool is armed).
5. **Stop** for good when `.globalPlayGuide.isComplete` appears.
6. **Learned mode.** `localStorage eos_learned_v1[id]` counts completions. After 2, the first show lasts 2.5 s and the idle threshold is 6 s, so veterans get breadcrumbs, not lectures.
7. **Reduced motion.** A static hand on the target, a static chevron and the label. Drags show a static dotted path with an arrowhead. No bobbing.

### A4. Target resolution (robust order)
1. `[data-eos-target="1"]` inside `.releaseGameHost`. **New EOS engines mark their live target with this.**
2. `EOS_GESTURES[id][cursor]` (table below). Take the first match that is visible: rect at least 8×8, `opacity > .05`, not `[disabled]`, not inside `.globalPlayGuide` or `.engineProgressHud`, and with `elementFromPoint(center)` landing inside it or its descendant. If the centre is covered, use the largest uncovered sample point of a 5×5 grid.
3. Loop and stage rules:
   - `cursor` increments on a pointerdown inside the stage target.
   - If stage *k*'s selector resolves nothing for 600 ms while stage *k+1* resolves, advance.
   - If nothing resolves but stage 0 does, wrap (games marked `loop`).
4. Generic fallback, for unknown ids. Pick the first interactive element in `.cinematicContentShell > .arena`, ranked by:
   - contains user text,
   - computed cursor `grab` (verb drag) or `pointer` (verb tap),
   - largest area.

   Exclude `.globalPlayGuide *`. If nothing qualifies, show no arrow (never a wrong one).
5. Coordinates: `rect` relative to `.releaseStage`, divided by `stageRect.width / stage.offsetWidth` (Framer canvas scale). While visible, follow a moving target with one rAF read per frame (HOT POTATO and POP bubbles drift). While hidden, poll at 250 ms. No MutationObserver on `style` (framer-motion writes styles every frame).

### A5. `EOS_GESTURES`: the per-game table (all 110 + new). Paste into `src/eos/30_arrows.jsx`
Stage format: `[verb, selector, label, opts]`. `opts` keys:
- `n`: distance in px for drags, or count for `taps`
- `d`: direction
- `to`: drop-target selector
- `ms`: hold or slow duration
- `loop`: stages repeat per round
- `builtIn`: the game already shows its own arrow, so only show ours in stuck mode

Sources:
- Selectors and real gestures: `map_engine_hud` Appendix A, `catalog_A/B`.
- Fixes from the runtime audits: BIN drop-to-mouth, SEND TO SPACE down, MUTE down, BACK SEAT diagonal, DRAWER 3-step, PAPER PLANE fold×2, BLACK HOLE still-hold, UNPIN straight up, MIRROR order, MICROSCOPE ×4, CROP order, MELT hold-on-cube, PRESSURE window.

```js
const EOS_GESTURES = {
  1:[["tap","button.wordBubble.popBubbleV2","POP IT!"]],
  2:[["taps","button.uniqControl","CRUSH ×4",{n:4}]],
  3:[["tap","button.crackToolDock","GRAB THE TOOL"],["taps",".crackBubbleSlot","CRACK ×3",{n:3}]],
  4:[["tap","button.stompToolDock","GRAB THE BOOT"],["taps",".stompBubbleSlot","STOMP ×3",{n:3}]],
  5:[["tap","button.uniqControl","SWING!"]],
  6:[["taps","button.zapGroundButton","ZAP ×3",{n:3}]],
  7:[["drag",".pinTool","SLIDE THE PIN",{d:"r",n:110,to:".uniqWord.balloonWord"}]],
  8:[["pull",".meteorRock","PULL & LET GO",{d:"d",n:90}]],            // needs fix A7 (.orbitArc covers it)
  9:[["tap","button.laserToolDock","GRAB THE LASER"],["taps",".laserTargetBubble","ZAP ×3",{n:3}]],
  10:[["tap","button.uniqControl","TIP IT"]],
  11:[["hold","button.uniqControl","HOLD… LET GO IN GREEN",{ms:1500}]],
  12:[["taps","button.uniqControl","HIT ×3",{n:3}]],
  13:[["hold","button.uniqControl","PRESS & HOLD",{ms:1800}]],
  14:[["seq","button.paperCorner:not(:disabled)","FOLD THIS CORNER"]],
  15:[["taps","button.shredAction","FEED IT ×5",{n:5}]],
  16:[["tap","button.meltToolButton","LIGHT THE TORCH"],["hold",".cartoonIceCube","HOLD TO MELT",{ms:1200}]],
  17:[["seq","button.weakSpot:not(.dead)","HIT THE WEAK SPOT"]],          // first non-dead = live (L15285)
  18:[["hold","button.burnGroundButton","HOLD THE FLAME",{ms:3000}]],
  19:[["tap","button.eraseActivateBtn","GRAB THE ERASER"],["scrub",".eraseWordBubble","RUB IT OUT"]],
  20:[["seq",".glitchPanel button.live","TAP THE LIT ONE"]],
  21:[["drag",".binWordBubble","DROP IT IN",{to:".binMouthTarget"}]],
  22:[["tap","button.flushLever","FLUSH!"]],
  23:[["tap","button.vacuumBtn","SUCK IT UP"]],
  24:[["pull",".slingshotWord","PULL BACK & LET GO",{d:"dl",n:100}]],
  25:[["drag",".swipeCard.physical","SWIPE IT AWAY",{d:"r",n:160}]],
  26:[["drag",".launchLever","PULL THE LEVER",{d:"d",n:120}]],
  27:[["drag",".weightedBlock","PUT IT DOWN",{d:"d",n:110,to:".dropLedge"}]],
  28:[["tap","button.uniqControl","OPEN THE DRAWER"],["drag",".fileCard","FILE IT",{d:"d",n:80}],{loop:true}],
  29:[["drag",".verticalFader","SLIDE IT DOWN",{d:"d",n:150}]],
  30:[["taps","button.uniqControl","ZOOM OUT ×4",{n:4}]],
  31:[["drag",".passengerCard","INTO THE BACK SEAT",{d:"dr",to:".backSeat"}]],
  32:[["pick","button.parkBay","PARK IT HERE"]],
  33:[["seq","button.balloonWeight:not(.cut)","SNIP THIS ONE"]],
  34:[["drag",".leafWord","ONTO THE RIVER",{d:"d",n:70,to:".riverFlow"}]],
  35:[["tap","button.uniqControl","LET IT PASS"]],
  36:[["slow",".neonCloud","DRAG… SLOWLY",{d:"r",n:140,ms:1800}]],
  37:[["seq",".floorStack button:not(:disabled)","DOWN A FLOOR"]],
  38:[["tap","button.uniqControl","OPEN"],["drag",".drawerCard","DROP IT IN",{d:"d",n:70}],["tap","button.uniqControl","CLOSE"],{loop:true}],
  39:[["hold","button.uniqControl","HOLD — DON'T MOVE",{ms:1500}]],
  40:[["taps","button.uniqControl","FOLD ×2",{n:2}],["drag",".paperPlane","THROW IT",{d:"r",n:140}],{loop:true}],
  41:[["taps",".unhookWordBubble","UNHOOK ×3",{n:3}]],
  42:[["drag",".knot:not(.loose)","WIGGLE THIS KNOT",{d:"ur",n:60}]],
  43:[["tap","button.cutLoopScissorPicker","GRAB SCISSORS"],["taps",".cutLoopWordSlot","SNIP ×3",{n:3}]],
  44:[["slow",".velcroPatch","PEEL… SLOWLY",{d:"r",n:150,ms:1800}]],
  45:[["drag",".attentionOrb","PULL IT FREE",{d:"r",n:180}]],
  46:[["drag",".pushPin","PULL IT UP",{d:"u",n:90}]],
  47:[["drag",".plug","UNPLUG IT",{d:"r",n:140}]],
  48:[["drag",".glassPane","PEEL UP-RIGHT",{d:"ur",n:110}]],          // .stickerWord collapses to 3×10
  49:[["drag",".zipperPull","UNZIP →",{d:"r",n:160}]],
  50:[["type",".chainLink input","TYPE WHAT'S NEXT"],["tap","button.premiumBigAction","SHOW ME"]],
  51:[["seq",".orbitButtons button.live","TAP THIS VIEW"]],
  52:[["pick",".genreKeys button","PICK A GENRE"]],
  53:[["taps","button.uniqControl","PUMP IT ×4",{n:4}]],
  54:[["taps","button.fontDial","TURN IT ×4",{n:4}]],
  55:[["seq",".productionStrip button:not(:disabled)","TURN IT DOWN"]],
  56:[["pick",".courtTargets button","WHAT IS IT?"]],
  57:[["taps","button.uniqControl","ROTATE ×3",{n:3}]],
  58:[["taps","button.focusKnob","FOCUS ×4",{n:4}]],
  59:[["drag",".spotLamp","MOVE THE LIGHT",{d:"r",n:130}]],           // fix A7 (.uniqWord covers lamp)
  60:[["seq","button.cropHandle:not(:disabled)","WIDEN HERE"]],
  61:[["taps","button.freezeWordCube","FREEZE ×3",{n:3}]],
  62:[["tap","button.catchNet","CATCH IT"]],
  63:[["seq",".portalRing button.hot","TAP THE GLOW"]],
  64:[["tap","button.uniqControl","WAIT FOR RED…"]],
  65:[["hold","button.uniqControl","HOLD TO PAUSE",{ms:2400}]],
  66:[["wait",null,"HANDS OFF · BREATHE"]],
  67:[["alt",".tapOutPads button","LEFT · RIGHT · LEFT"]],
  68:[["taps",".drumKit button","DRUM!",{n:10}]],
  69:[["taps","button.uniqControl","SLOW TAPS",{n:6,ms:900}]],
  70:[["taps","button.uniqControl","EVERY OTHER BEAT",{n:4,ms:1240}]],
  71:[["seq",".defuseZone.active button","DO THIS STEP"]],
  72:[["tap","button.uniqControl","CATCH IT"],["pick",".labelButtons button","NAME IT"],{loop:true}],
  73:[["pick",".signalConsole button.light","PICK A LIGHT"]],
  74:[["seq",".bubbleWrapSheet button:not(.popped)","POP THIS ONE"]],    // strict order; first unpopped = live (L16479)
  75:[["drag",".inkDrop","DRAG THE INK →",{d:"r",n:170}]],
  76:[["taps","button.uniqControl","REWIND ×4",{n:4}]],
  77:[["drag",".brakeHandle","PULL THE BRAKE",{d:"d",n:140}]],
  78:[["pick",".oneWordField button","PICK ONE"]],
  79:[["tap",".missPads button:not(.target)","MISS ON PURPOSE"]],
  80:[["wait",null,"DON'T TOUCH · BREATHE"]],
  81:[["pick",".blockTray button","STACK IT"]],
  82:[["taps",".nudgeRow button","NUDGE",{n:5}]],
  83:[["pick",".chuteRow button","SEND IT"]],
  84:[["drag",".ownershipCard","← MINE · NOT MINE →",{d:"lr",n:130}]],
  85:[["pick",".controlPanelSwitches button","PICK A MOVE"]],
  86:[["pick",".rubberStamps button","STAMP IT"]],
  87:[["drag",".keepDropCard","↑ KEEP · ↓ DROP",{d:"ud",n:120,builtIn:true}]],
  88:[["tap","button.coinSlot","INSERT COIN"],["pick",".tradeOptions button","PICK A PRIZE"],{loop:true}],
  89:[["tap","button.doorABFrame.door-a","PEEK DOOR A"],["tap","button.doorABFrame.door-b","PEEK DOOR B"]],
  90:[["tap","button.coin.realFlipCoin","FLIP IT"]],
  91:[["drag",".priorityBubbleTray button","DRAG TO A SLOT",{d:"d",n:80}]],
  92:[["pick",".intensityRuler button","PICK A LOWER NUMBER"]],
  93:[["drag",".spaceTile","PUSH IT OUT",{d:"out",n:60,builtIn:true}]],
  94:[["pick",".juggleBall","KEEP ONE"],["taps",".juggleBall","TOSS ×3",{n:3}]],
  95:[["drag",".shelfThoughtBubble","LIFT TO SHELF",{d:"u",n:110,builtIn:true}]],
  96:[["tap","button.scratchToolButton","GRAB THE COIN"],["scrub",".scratchPlayArea","SCRATCH"]],
  97:[["drag","button.xrayScannerHandle","SCAN →",{d:"r",n:170,builtIn:true}],["tap","button.xrayBurnAllButton","BURN IT ALL"]],
  98:[["pick","button.magicTrapBubble","PICK ONE"],["drag","button.magicLeverHandle","PULL ↓",{d:"d",n:70}]],
  99:[["hold","button.echoHoldBubble","HOLD 5 SECONDS",{ms:5000}]],
  100:[["drag","button.thoughtPotato","FLING IT OUT",{d:"out",n:80,builtIn:true}]],
  101:[["drag","button.tugPullHandle","PULL ←",{d:"l",n:60}],["tap","button.tugLetGo","LET GO"],{loop:true}],
  102:[["drag",".ftRow","PUSH TO CENTRE",{d:"in",n:120,builtIn:true}]],
  103:[["tap","button.spDropButton","LOWER IT"]],
  104:[["drag",".knobHitZone","TURN IT DOWN",{d:"d",n:80}]],
  105:[["tap","button.dmDramaButton","MAKE IT DRAMATIC"],["tap","button.dmCutButton","CUT!"],{loop:true}],
  106:[["pick",".tsndVibes button","PICK A VIBE"],["taps","button.tsndKey","PLAY ×3",{n:3}]],
  107:[["pick","button.gwProp","PICK A PROP"],["tap",".gwCard","STICK IT ON"],{loop:true}],
  108:[["tap","button.uniqControl","SHAKE"],["tap",".saladBowl button","SWAP"]],
  109:[["hold","button.cleanseBubbleHoldButton","HOLD… THEN LET GO",{ms:1000}]],
  110:[["drag",".rainCloudUnit","PULL ↓ TO RAIN",{d:"d",n:90,builtIn:true}]],
  // 111-119 (new): no entries. Engines set data-eos-target="1" + data-eos-verb/dir/label on the live element.
}
```
A trailing `{loop:true}` element is a flags object, not a stage. New engines may also set `data-eos-verb="hold" data-eos-ms="2000" data-eos-label="HOLD TO BREATHE IN"` on the target; the overlay reads these before the table.

### A6. The LIVE GUIDE panel gets its arrow too (2 edits + CSS)
- Legacy card (§I edit **E9a**): insert `<i className="guideActionArrow" aria-hidden="true">{eosGlyph(p.game)}</i>` before `<small>`.
- New card (§I edit **E9b**): change the dead gate `{Number(p.game?.id || 0) < 100 ? (` to `{true ? (` and the glyph to `{eosGlyph(p.game)}`.
- `eosGlyph(game)` maps the first stage's verb and direction to a glyph:
  - drag: `→ ← ↑ ↓ ↗ ↘ ↙ ↖ ↔ ↕`, `out` = ⤢, `in` = ⤡
  - tap / taps / seq: `☝` (with `font-variant-emoji:text`)
  - hold: `◉`; pick: `◎`; wait: `✋`; scrub: `〰`; pull: `↶`
- CSS: the existing legacy arrow style is scoped to `.releaseGlobal99Upgrade`. Copy it into `EOS_GLOBAL_CSS` for both wrappers, recoloured gold, at 30 px (26 px on phone), with `eosGuidePulse` keyframes.
- **Fix the wrong how-to lines.** The 25 mismatches from the catalogs are fixed by assigning `SHORT_HINT` (a mutable top-level const object) from an eos module. These lines feed the guide panel for both wrappers through `shortHint()`:
```js
Object.assign(SHORT_HINT, {
  3:"Grab the tool, then tap each egg 3×", 4:"Grab the boot, then stomp each bubble 3×",
  6:"Tap the zapper 3×", 9:"Grab the laser, then tap each bubble 3×", 11:"Hold… let go in the green",
  14:"Tap the glowing corner", 16:"Light the torch, then hold each cube", 18:"Hold the flame on each word",
  19:"Grab the eraser, then rub each word", 21:"Drag each word into the bin", 30:"Tap ZOOM OUT 4×",
  36:"Drag the cloud slowly →", 53:"Pump it 4×", 55:"Tap each button in order", 61:"Tap each word 3× to freeze it",
  64:"Tap only when it's red", 66:"Hands off — just breathe", 67:"Tap left, right, left…", 69:"Tap slowly — one per pulse",
  85:"Pick one next move", 99:"Hold each echo for 5 seconds", 101:"Pull ←, then let go (×6)", 104:"Turn the knob down",
  105:"Make it dramatic, then CUT", 109:"Hold… then let go slowly",
})
```

### A7. Bugs that would make an arrow lie (fix in the same PR)
- CSS only (`EOS_GLOBAL_CSS`), to unblock covered targets. Verify each in the harness:
  - `.arena .orbitArc{pointer-events:none!important}` (8 METEOR)
  - `.arena:has(.weakSpot) .uniqWord,.arena:has(.spotLamp) .uniqWord,.arena:has(.knot) .uniqWord{pointer-events:none!important}` (17, 59, 42)
- Hold buttons 11, 13, 39 and 65 lose the release when the finger slides off. Phase P3: add `onPointerLeave`/`onPointerCancel` = the `onPointerUp` handler. 11 PRESSURE POP also gets a wider window (55-92) and a visible green band.

### A8. Implementation sketch (`src/eos/30_arrows.jsx`, ~320 lines)
```jsx
function EosGuideArrows({ game, hostRef, reduced }) {
  const [view, setView] = React.useState(null)        // {x,y,w,h, verb, label, opts, path}
  const st = React.useRef({ cursor:0, shown:false, lastTouch:0, lastProgress:0, lastProgressAt:Date.now(), missAt:0, taps:0 })
  React.useEffect(() => {
    const host = hostRef.current; if (!host) return
    const stage = host.closest(".releaseStage")
    let raf = 0, alive = true, born = Date.now()
    const onDown = (e) => {
      const s = st.current, tgt = s.el
      s.lastTouch = Date.now(); s.shown = false
      if (tgt && tgt.contains(e.target)) { s.taps++; if (eosStageDone(s)) { s.cursor++; s.taps = 0 } }
      else s.missAt = Date.now()
    }
    host.addEventListener("pointerdown", onDown, true)
    const tick = () => {
      if (!alive) return
      const s = st.current, now = Date.now()
      if (host.querySelector(".globalPlayGuide.isComplete")) { setView(null); return }
      const p = +(host.querySelector(".engineProgressTrack")?.getAttribute("aria-valuenow") || 0)
      if (p > s.lastProgress) { s.lastProgress = p; s.lastProgressAt = now; s.missAt = 0 }
      const r = eosResolveTarget(host, game, s)           // A4 order; returns {el, verb, label, opts} | null
      s.el = r?.el
      const stuck = now - born > 700 && (
        !s.lastTouch && now - born > 700 ||                 // first show
        s.missAt && now - s.missAt > 1200 ||                // missed tap, nothing happened
        now - Math.max(s.lastTouch, s.lastProgressAt) > eosIdleMs(game))   // 2.5s / 3.5s / 6s learned
      if (r && (s.shown || stuck)) { s.shown = true; setView(eosMeasure(stage, r)) }  // rect / scale, path for drags
      else if (!s.shown) setView(null)
      raf = setTimeout(() => requestAnimationFrame(tick), s.shown ? 16 : 250)
    }
    tick()
    return () => { alive = false; clearTimeout(raf); host.removeEventListener("pointerdown", onDown, true) }
  }, [game.id])
  if (!view) return null
  return <div className={`eosArrowLayer verb-${view.verb}${reduced ? " isReduced" : ""}`} aria-hidden="true">
    {view.path ? <svg className="eosTrailSvg"><path className="eosTrail" d={view.path} /></svg> : null}
    <EosHand view={view} /><EosChevron view={view} />
    <span className="eosLabel" style={view.labelPos}>{view.label}{view.count ? <b className="eosCount">×{view.count}</b> : null}</span>
  </div>
}
```
Avoid `setView` storms: compare against the previous view and skip identical updates (round coordinates to 1 px). Hand travel uses CSS custom properties `--sx --sy --ex --ey` with keyframes `eosHandTravel`, so React re-renders only when the target moves more than 2 px.

---------------------------------------------------------------------------------------------------
## B. Typography and readability (exact minimums)

Principles:
- **12 px is the absolute floor** for any text in `.releaseStage`, measured as rendered size (computed size × ancestor scale).
- **13 px** for chrome labels.
- **15-17 px** for instructions.
- **16 px** for the user's own words. Their words are the hero, the "memory" itself.
- Numbers that pay out dopamine (sparks, score, shift) are **big and chunky**: Baloo 2 800, `font-variant-numeric: tabular-nums`.
- The composer input is **16 px**, so iOS doesn't zoom on focus.

| element (selector) | now 1280 / 390 | **new min 1280 / 390** | extra |
|---|---|---|---|
| header level `.releaseScoreBar>span` "LVL 1" | 12 / 10 | **14 / 13** | |
| header score `.releaseScoreBar>strong` "⚡ 534" | 12 / 10 | **18 / 16**, weight 800 | bar `height:36px; min-width:200px` (phone: `min-width:0`, hide the track) |
| header title `.releaseTitleMain` | ~20 / clipped "MOTIONAL…" | **18 / 14** | ≤560 px: hide `.releaseTitleBy/.releaseTitleBrand`, `text-overflow:ellipsis`, header padding `0 132px 0 56px` so nothing overlaps |
| progress `.engineProgressText` | 10 / 9 | **13 / 12** | track `height:24px` |
| sparks/tokens/chain `.tsShiftRewardPill` | **8.3 / 6.5** | **13 / 12** | `height:28px / 26px`; on ≤760 px keep `.chain` visible |
| shift level `.tsShiftLevel>b` | **7 / 6.2** | **13 / 12** | |
| step payout `.tsRewardPayout` | ≈11 / 10 | **16 / 14** | |
| finish payout `.tsFinishRewardPayout` | ≈11.5 / 11 | **18 / 16** | |
| guide header `.guideHeaderRow b` | 12.5 / 10.2 | **14 / 13** | |
| guide label `.guideStepCard small` "How to play" | 10 / 8.7 | **12 / 12** | caps, `.12em` |
| guide instruction `.guideStepCard span` | 12.4 / 9.8 | **17 / 15**, weight 800 | this is the most important line in the panel |
| mind-bend label `.globalMindBend strong` | 9.8 / 8.5 | **12 / 12** | |
| mind-bend line `.globalMindBend em` | 11.8 / 9.3 | **14 / 13** | |
| **user words** `.tsExactUserText,.plainUserThoughtText,.tsExternalThoughtLabel,.potatoWord,.spaceTileWord,.coinReleaseWord,.echoBubbleWord,.rainCloudText` | 11 / 8.2; 9 in 100/101/109; **3.9 in 99** | **16 / 15** (inside objects ≤96 px: **14**) | `line-height:1.05; overflow-wrap:anywhere; max-width:88%`; 99 also needs edit E12 (inline `!important`) |
| in-game counters `.literalProgress,.uniqStatus :is(b,span),.literalStatus :is(b,span),.cleanseStatus` | 9-14 | **13 / 12** | |
| on-object counters `.toolHitCount,.miniCrackCount,.freezeWordCube>b,.cutLoopWord>em,.unhookWordBubble>small,.binWordBubble>b,.eraseWordBubble>b,.premiumCombo,.combo` | **5.6-9** | **12 / 12** | |
| buttons `.uniqControl,.bigAction,[class*=ToolDock],.meltToolButton,.burnGroundButton,.zapGroundButton,.eraseActivateBtn,.cutLoopScissorPicker,.orbitButtons button,.genreKeys button,.productionStrip button,.nudgeRow button,.parkBay,.gwProp,.dmDramaButton,.dmCutButton,.tsndVibes button,.cleanseBubbleHoldButton` | 7-10 | **14 / 13** | `min-height:44px` (touch target); strip the "THOUGHT MOVE · " prefix with `.uniqControl{font-size:…}` plus a text edit in P3 |
| scene labels `.shredderMouth>b,.defuseZone small,.windLane,.chainLink span,.ftArrow em,.ftRule,.ftCue,.tugPullHandle,.magicLeverBay *,.doorAB* :is(small,span),.xray* small,.tsnd* :is(small,em,b),.dm* :is(small,em),.gw* small,.keepDropCueLabel,.shelfGuideV2,.hotPotatoGuide,.rainPullHint,.tsDynamicActionText` | **5-9** | **12 / 12** | |
| composer `.releaseThoughtInput` | ~14 | **16 / 16** | |
| composer `.choiceCopy, .choiceArrow` | 8.5 / 9 | **14 / 13** | |
| reveal `.releaseCompleteCard small` | ~12 | **13 / 13** | |
| arrows `.eosLabel` (new) | – | **15 / 14** | |

CSS (one block inside `EOS_GLOBAL_CSS`; `EOS_B` raises specificity with ID selectors so it beats every `.tsArcade … !important`):
```js
const EOS_B = ":is(.tsPixarRoot,body):not(#eosA):not(#eosB) .tsArcade"
const EOS_TYPE_CSS = `
${EOS_B} .releaseScoreBar>span{font-size:14px!important}
${EOS_B} .releaseScoreBar>strong{font-size:18px!important;font-weight:800!important;font-variant-numeric:tabular-nums}
${EOS_B} .releaseScoreBar{height:36px!important;min-width:200px!important}
${EOS_B}.stage-play .engineProgressHud{flex-direction:column!important;height:auto!important;gap:6px!important;align-items:stretch!important}
${EOS_B}.stage-play .engineProgressTrack{height:24px!important;min-height:24px!important}
${EOS_B}.stage-play .engineProgressText{font-size:13px!important;letter-spacing:.06em!important}
${EOS_B}.stage-play :is(.tsShiftRewardPill,.tsShiftLevel>b){font-size:13px!important}
${EOS_B}.stage-play :is(.tsShiftRewardPill,.tsShiftLevel){height:28px!important}
${EOS_B} .tsRewardPayout{font-size:16px!important} ${EOS_B} .tsFinishRewardPayout{font-size:18px!important}
${EOS_B} .globalPlayGuide .guideHeaderRow b{font-size:14px!important}
${EOS_B} .globalPlayGuide :is(.guideStepCard small,.globalMindBend strong){font-size:12px!important;letter-spacing:.12em!important}
${EOS_B} .globalPlayGuide .guideStepCard span{font-size:17px!important;font-weight:800!important;line-height:1.2!important}
${EOS_B} .globalPlayGuide .globalMindBend em{font-size:14px!important}
${EOS_B} .releaseGameHost :is(.tsExactUserText,.plainUserThoughtText,.tsExternalThoughtLabel,.potatoWord,.spaceTileWord,.coinReleaseWord,.echoBubbleWord,.rainCloudText){font-size:16px!important;line-height:1.05!important;overflow-wrap:anywhere}
${EOS_B} .releaseGameHost :is(.toolHitCount,.miniCrackCount,.freezeWordCube>b,.cutLoopWord>em,.unhookWordBubble>small,.binWordBubble>b,.eraseWordBubble>b,.premiumCombo,.combo,.literalProgress,.uniqStatus b,.uniqStatus span,.literalStatus b,.literalStatus span,.cleanseStatus){font-size:max(12px,1em)!important}
${EOS_B} .releaseGameHost :is(.uniqControl,.bigAction,[class*=ToolDock],.orbitButtons button,.genreKeys button,.productionStrip button,.nudgeRow button,.parkBay,.gwProp,.dmDramaButton,.dmCutButton,.tsndVibes button,.cleanseBubbleHoldButton){font-size:14px!important;min-height:44px}
${EOS_B} .releaseThoughtInput{font-size:16px!important}
${EOS_B} :is(.choiceCopy,.choiceArrow){font-size:14px!important}
@media (max-width:700px){
  ${EOS_B} .releaseGameHost :is(.tsExactUserText,.plainUserThoughtText,.tsExternalThoughtLabel,.potatoWord){font-size:15px!important}
  ${EOS_B} .globalPlayGuide .guideStepCard span{font-size:15px!important}
  ${EOS_B}.stage-play .tsShiftRewardPill.chain{display:inline-flex!important}
  /* phone: collapse the guide to a one-line coach strip after the first hit */
  ${EOS_B} .globalPlayGuide.isActive .globalMindBend{display:none!important}
  ${EOS_B} .globalPlayGuide.isActive{padding:8px 12px!important}
}
@media (max-width:560px){
  ${EOS_B} :is(.releaseTitleBy,.releaseTitleBrand){display:none!important}
  ${EOS_B} .releaseTitleMain{font-size:14px!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
  ${EOS_B} .releaseConsoleHeader{padding:0 132px 0 56px!important}
  ${EOS_B} .releaseScoreBar{min-width:0!important} ${EOS_B} .releaseScoreBar>strong{font-size:16px!important}
}`
```
For the on-object counters, `max(12px,1em)` is safe on the curated list: `1em` = the parent size, so 6 px labels inside 14 px parents become 14 px. The generic `*` version is **not** used because it would collapse the intended size hierarchy.

**Do not "fix" `dynamicBubbleTextCss` (L21047).** Adding the missing space would suddenly apply `bubbleTextPx` (default 4) and *shrink* every word, including in saved Framer instances. The rule above replaces it.

**Harness guard (P0):** `dev/eos_check_text.mjs` launches every game at 1280 and 390. It walks the text nodes in `.releaseStage` (skipping `[aria-hidden=true]` decor) and fails if `fontSize × scale < 12` (14 for user words).

---------------------------------------------------------------------------------------------------
## C. Background dots → the Still Point (all dots converge into the centre)

### C1. Behaviour (story first)
"Stray thoughts are being gathered and calmed."

Every visible dot travels on a gentle **inward spiral** (about 25-40° of swirl) from the edges to the Still Point. It shrinks and fades as it arrives, and the core glows a little each time. New dots respawn at the rim, so the flow never ends but is always inward.

| stage | flow | core |
|---|---|---|
| input / check-in | slow: 14-22 s per dot, opacity .8 | breathes at 6/min (4 s in, 6 s out): the subliminal pacer |
| play | the same paths at opacity .45, behind the game (`z-index:1` under `.releaseGameHost`) | core size `.8 + .5 × progress` (CSS var `--eos-p` set by the play layer) |
| finish (`.isComplete`) | **GATHER**: all dots rush in within 0.9 s (`eosGatherNow`) | **BLOOM**: the core flashes 0.2 → 1.25 → 1 and becomes the memory orb that reappears in the reveal card |
| reveal | very slow (30 s) inward drift around the orb | steady glow, the orb's halo |
| reduced motion | static scattered dots at opacity .25, no movement | static soft glow, no breathing |

### C2. Implementation: one compositor-only technique ("lane scaling")
Each dot sits inside a full-size wrapper `i.eosLane` (`position:absolute; inset:0`) at `left:var(--x); top:var(--y)`. Animating the **wrapper's `scale` 1 → 0 around its own centre (50% 50%)** moves the dot in a straight line to the centre and shrinks it at the same time. Adding `rotate 0 → var(--sw)` turns the line into a spiral.

This is transform/opacity only (GPU), so there is no layout work, and it works at any container size.

`src/eos/20_flow.jsx`:
```jsx
function EosThoughtFlow({ stage, reduced }) {
  const small = typeof window !== "undefined" && window.innerWidth < 600
  const n = reduced ? 10 : small ? 18 : 30
  const dots = React.useMemo(() => Array.from({ length: n }, (_, i) => {
    const a = eosNoise(i, 1) * Math.PI * 2, r = 0.40 + eosNoise(i, 2) * 0.16
    return { x: 50 + Math.cos(a) * r * 100, y: 52 + Math.sin(a) * r * 92, s: 2 + eosNoise(i, 3) * 4,
             d: 14 + eosNoise(i, 4) * 8, dl: -eosNoise(i, 5) * 22, sw: (eosNoise(i, 6) > .5 ? 1 : -1) * (25 + eosNoise(i, 7) * 15),
             h: [195, 265, 42, 320][i % 4] }
  }), [n])
  return (
    <div className={`eosFlow eosFlow-${stage}`} aria-hidden="true">
      <i className="eosCore" />
      {dots.map((p, i) => <i key={i} className="eosLane" style={{ "--x": `${p.x}%`, "--y": `${p.y}%`, "--s": `${p.s}px`,
        "--d": `${p.d}s`, "--dl": `${p.dl}s`, "--sw": `${p.sw}deg`, "--h": p.h }} />)}
    </div>
  )
}
```
```css
.tsArcade .eosFlow{position:absolute;inset:0;pointer-events:none;z-index:1;overflow:hidden;contain:strict}
.tsArcade .eosLane{position:absolute;inset:0;transform-origin:50% 52%;animation:eosConverge var(--d) cubic-bezier(.45,0,.8,.6) var(--dl) infinite}
.tsArcade .eosLane::before{content:"";position:absolute;left:var(--x);top:var(--y);width:var(--s);height:var(--s);margin:calc(var(--s)/-2) 0 0 calc(var(--s)/-2);
  border-radius:50%;background:radial-gradient(circle,#fff 0 25%,hsla(var(--h),100%,74%,.95) 45%,transparent 72%);box-shadow:0 0 10px hsla(var(--h),100%,70%,.6)}
@keyframes eosConverge{0%{scale:1;rotate:0deg;opacity:0}14%{opacity:.85}80%{opacity:.7}100%{scale:0;rotate:var(--sw);opacity:0}}
.tsArcade .eosCore{position:absolute;left:50%;top:52%;width:min(36vmin,280px);aspect-ratio:1;translate:-50% -50%;border-radius:50%;
  background:radial-gradient(circle,rgba(255,236,190,.26),rgba(125,227,255,.12) 42%,transparent 70%);animation:eosBreathe 10s ease-in-out infinite}
@keyframes eosBreathe{0%,100%{scale:.82;opacity:.55}40%{scale:1.08;opacity:.95}}   /* 4s up, 6s down */
.tsArcade .eosFlow-play{opacity:.45}
.tsArcade .eosFlow-play .eosCore{width:calc(min(36vmin,280px)*(.8 + var(--eos-p,0)*.5))}
.tsArcade .eosFlow.eosGather .eosLane{animation:eosGatherNow .9s cubic-bezier(.6,0,.9,.4) forwards}
.tsArcade .eosFlow.eosGather .eosCore{animation:eosBloom 1.1s cubic-bezier(.3,1.6,.4,1) forwards}
@keyframes eosGatherNow{to{scale:0;rotate:var(--sw);opacity:0}}
@keyframes eosBloom{0%{scale:.2;opacity:1}60%{scale:1.25;opacity:1;filter:brightness(1.6)}100%{scale:1;opacity:.9}}
@media (prefers-reduced-motion:reduce){.tsArcade .eosLane{animation:none!important;opacity:.25}.tsArcade .eosCore{animation:none!important}}
```
- `eosGather` and `--eos-p` are set on `.eosFlow` by the play layer (§D3); it reads `aria-valuenow` and `.isComplete`.
- Mount: edit E6 adds `<EosThoughtFlow stage={stage} reduced={!!reduced} />` right after the EOS `<style>`. That is inside `.tsArcade`, before `.shell`, so it sits behind the whole UI.

### C3. Retarget the existing dot layers (so *all* dots merge)
- **Pixar motes `.tsPxDust` (99_pixar, our own file).** Two edits:
  1. Replace the keyframe `@keyframes tsPxDust{0%{opacity:0;translate:0 0}12%{opacity:.75}88%{opacity:.5}100%{opacity:0;translate:var(--bx,40px) -140px}}` with:
     `@keyframes tsPxDust{0%{opacity:0}12%{opacity:.75}82%{opacity:.6;left:50%;top:52%;scale:.6}100%{opacity:0;left:50%;top:52%;scale:.15}}`
  2. Change ``top: `${40 + pxNoise(i, 23) * 60}%`,`` to ``top: `${pxNoise(i, 23) * 100}%`,`` so motes spawn all around, not only at the bottom.

  `left`/`top` animate from the inline start values. 14 absolutely positioned nodes in a contained rig is cheap. Also change the timing to `cubic-bezier(.45,0,.8,.6)`.
- **In-game `.cinemaDust i`** (14 per game, CSS only):
  `${EOS_B} .cinemaDust i{animation:eosCinemaIn 7s cubic-bezier(.45,0,.8,.6) infinite!important}`
  `@keyframes eosCinemaIn{0%{opacity:0;transform:none}18%{opacity:.35}100%{left:50%;top:50%;opacity:0;transform:scale(.3)}}`
  The inline per-dot `animationDelay` is preserved.
- **`InfinityField`** is invisible today (undefined hue) and is superseded by `EosThoughtFlow`. Remove its 18 animated nodes from the cost with `${EOS_B} .infinityField{display:none!important}`.
- **Idle `.ts-abyss` particles** already converge. Keep them; they align with the Still Point.

---------------------------------------------------------------------------------------------------
## D. The emotion-first flow (check-in → matched relief → shift meter → rewards)

### D0. Storyboard (each beat in 2 taps or fewer, and under 3 s to the first relief action)
```
[HQ CHECK-IN]  "Who's at the controls?"  8 emotion orbs ring the Still Point (Still in the middle)
    tap RUSH/ANGER ─► orb flies to centre, Rush grows & shakes ─► "How loud is it?" dial (default 7) + optional words/mic
    tap "LET'S SHIFT IT ▶" ─► ORB DIVE (radial wipe in Rush-red, 600ms) ─► game starts (router picks hero for ANGER·HOT)
[PLAY]   companion Rush in the corner reacts to progress (furious → neutral → grinning); gold arrows guide; dust flows in
[FINISH] dust GATHERS into the core; core BLOOMS (wrapper's 3-4s finish hold)
[REVEAL] 1) STILL MOMENT: one guided sigh with the orb (6s, skippable)   2) "How loud is it now?" same dial
         3) 8 → 2 count-down, "−6" stamp, Rush flips to his laughing face, memory orb turns GOLD ("core memory")
         4) rewards line + [I'M GOOD ✓] [ANOTHER ROUND ▶] [SHARE MY SHIFT]
```

### D1. Check-in overlay `EosCheckIn` (inside `.releaseStage`, z 30; the composer stays live underneath)
- **Shown when** `stage==="input" && !selected && eos.phase==="checkin"`.
- `.releaseIdleStory` (the 4-step explainer) is hidden by CSS while the overlay is up. The `.ts-abyss` ring stays as the backdrop, and our ring is laid out on the same geometry.
- **Step 1 · "Who's at the controls?"** Subline: "Tap the feeling that's loudest right now."
  - Desktop: 8 orbs on an ellipse (radius 34% × 30%) around the centre.
  - Phone (390): a 3×3 grid with Still in the middle cell.
  - Orbs are 96 px (84 px on phone): the character's *loud* face inside a glossy bubble, plus a label (16 px, 800) and a subline (13 px).
  - The orbs bob out of phase. On hover or focus, the character squashes (`tsPxSquash`) and its colour rim brightens.

  | orb | label | sub | char/face | `EOS_EMOTIONS` id | maps to existing profile (copy/sparks) |
  |---|---|---|---|---|---|
  | 1 | PANIC | heart racing | sync E44 | `panic` | panic |
  | 2 | ANGER | boiling over | rush E29 | `anger` | anger |
  | 3 | ANXIOUS | what-ifs | glitch E15 | `anxiety` | fear |
  | 4 | OVERTHINKING | on a loop | loopie E58 | `overthinking` | rumination |
  | 5 | OVERWHELMED | too much | sync E48 | `overwhelm` | overwhelm |
  | 6 | SAD | heavy | drop E58 | `sad` | sadness |
  | 7 | ASHAMED | not enough | patch E73 | `shame` | general |
  | 8 | EMPTY | lonely · numb | drop E70 | `empty` | sadness |
  | centre | NOT SURE | let Still pick | still E41 | `auto` | from text |

- **Step 2 · "How loud is {CHAR} right now?"**
  - The orb animates to the centre (framer `layout` or FLIP) and grows to 180 px.
  - **Loudness dial:** 10 chunky pills in a row (34 px, 14 px digits; phone 30 px), plus drag-scrub along the row. The default is 7, highlighted.
  - The character scales `.85 + n×.05` and shakes `n≥7 ? 2px : 0`. The label word goes 1-3 "a whisper", 4-6 "loud", 7-8 "really loud", 9-10 "ROARING".
  - **Words (optional):** a line "What's it about? (optional)" with a gold chevron pointing at the composer input, and a 🎙 chip that calls the existing `toggleMic`.
    - If the composer is empty, it is prefilled with the emotion's **starter words** (editable, ≥6 tokens, containing a word the existing profile regex matches, so sparks and HUD wording follow):
      - panic: `panic racing heart what if cant breathe too much right now`
      - anger: `so angry unfair they never listen fed up`
      - anxiety: `scared what if it all goes wrong tomorrow`
      - overthinking: `overthinking same thought on repeat cant switch off`
      - overwhelm: `overwhelmed too much to do no time everything at once`
      - sad: `sad heavy heart miss it tired of hurting`
      - shame: `ashamed not good enough messed up again`
      - empty: `lonely numb nothing feels like anything`
  - **CTA** "LET'S SHIFT IT ▶": a gold toy button, 18 px. Secondary: "pick a game myself" (`setGameMenuOpen(true)`) and "← back".
- **Live text detection.** If the user types in the composer while the overlay is up, `eosDetect(raw)` (debounced 300 ms) lights the matching orb with a pulse ("sounds like ANGER?"). One tap confirms it.
- **Launch.** `eos.commit({emotion, before})` → `EOS_STORE`.
  - The ORB DIVE starts: a full-stage `motion.div` with `clipPath: circle(0 at orbX orbY) → circle(150% …)`, 600 ms, in the emotion hue.
  - At 300 ms it calls `onLaunch()`, which is `startThinkStillChoice` (patched to use `EosRouteGame`, see E3). Raw text is already set from step 2's render, so there is no stale-closure problem.
  - One-tap express path: a long-press on an orb skips step 2 (before = 7) and uses an effect `useEffect(() => { if (pending && raw) { onLaunch(); setPending(false) } }, [pending, raw])`.
- **Reduced motion.** No bobbing, no dive (200 ms fade).
- **Keyboard and a11y.** Orbs are `button`s with `aria-label="Panic — heart racing"`. Arrow keys move focus; Enter selects.

### D2. Emotion detection (`eosDetect`, fixes the inflection bug)
Count hits per emotion. If there is a tie, use this priority: safety → panic → anger → anxiety → shame → sad → overwhelm → overthinking → empty. Sub-tags pick the first game (see E).
```js
const EOS_LEX = {
  panic:/\b(panic\w*|freak(ing|ed)? out|can'?t breathe|heart (is )?(racing|pounding)|hyperventilat\w*|attack)\b/i,
  anger:/\b(ang(er|ry|rier)|mad|furious|rag(e|ing|ed)|pissed|irritat\w*|annoy\w*|frustrat\w*|hate|resent\w*|livid|fuming)\b/i,
  anxiety:/\b(anxi\w*|worr\w*|nervous|scar(ed|y)|afraid|fear\w*|dread\w*|terrif\w*|what if|uneasy|on edge|tense)\b/i,
  overthinking:/\b(overthink\w*|ruminat\w*|loop\w*|spiral\w*|replay\w*|obsess\w*|can'?t stop thinking|stuck in my head)\b/i,
  overwhelm:/\b(overwhelm\w*|too much|swamped|drowning|so much to do|burn(ed|t)? out|exhausted|stress\w*|overload\w*)\b/i,
  sad:/\b(sad\w*|cry\w*|tears?|griev\w*|grief|loss|heartbr\w*|miss (him|her|them|you)|depress\w*|down|hurt\w*|low)\b/i,
  shame:/\b(sham\w*|asham\w*|guilt\w*|embarrass\w*|stupid|idiot|failure|not good enough|worthless|hate myself|regret\w*|jealous\w*|envy|envious|compar\w*)\b/i,
  empty:/\b(lonel\w*|alone|isolat\w*|nobody|no one|numb\w*|empty|flat|nothing matters|bored|disconnect\w*)\b/i,
}
const EOS_SUBTAGS = { lonely:/\b(lonel\w*|alone|isolat\w*|nobody|no one)\b/i, numb:/\b(numb\w*|empty|flat|nothing)\b/i,
  jealous:/\b(jealous\w*|envy|envious|compar\w*)\b/i, fear:/\b(scar(ed|y)|afraid|fear\w*|terrif\w*)\b/i, choice:/\b(or|vs|versus|should i)\b/i }
```

### D3. During play: `EosPlayLayer` (one mount, edit E5)
- Children: `EosGuideArrows` (§A), `EosCompanion` and `EosSafetyCard` (§H, only if triggered). It also drives the flow state:
  - writes `--eos-p` on `.eosFlow`;
  - adds `.eosGather` to `.eosFlow` when `.globalPlayGuide.isComplete` appears.
- **`EosCompanion`.** A 72 px character orb, bottom-right of the stage (above the guide panel on phone), `pointer-events:none`.
  - Face by progress: 0-33 loud face, 34-66 the existing neutral or calmer negative, 67+ the calm face.
  - On each `.guideHit` it squashes and shows a speech bubble (14 px) at most once per 3 hits: "ooh, lighter", "keep going", "that one felt good".
  - It is the emotional mirror. The user *sees* their feeling relax.

### D4. Reveal: `EosShiftMeter` (edit E4; the old yes/no `.releaseShiftCheck` is hidden by CSS)
1. **STILL MOMENT** (one regulated "second act" for *every* game; 6 s, "skip ›" after 1.5 s). It adapts to the emotion:
   - panic, anger, anxiety, overwhelm, overthinking → **one physiological sigh**. The memory orb swells over 2 s ("breathe in…"), hiccups +8% in 0.6 s ("…a little more"), then deflates over 4 s ("looong out"). `hum`, then `rainSfx(4)`.
   - sad, shame → **hand-on-heart**: "hold the orb like a warm mug". Press-and-hold for 3 s; the orb warms orange, with a heartbeat haptic.
   - empty → **spark it**: "tap the orb 3 times to the beat". Mild up-regulation, `tone` notes.
   - This turns every smash game into a discharge-then-down-regulate arc without touching any engine.
2. **"How loud is it now?"** Same dial. The *before* value shows as a ghost marker.
   - If there was no check-in (game picked from the menu), the dial shows two rows: "before" (default 7, editable) and "now".
3. **The payoff.** Number counts down `before → after` (60 ms per step).
   - A big stamp "−5" in gold (Baloo 2 800, 56 px).
   - The character crossfades from the loud face to the calm face with squash.
   - Memory orb rim:
     - gold for Δ ≥ 3 ("CORE MEMORY ✦"),
     - silver for Δ 1-2,
     - cyan for Δ 0 ("Still here with you").
   - **No failure framing:** "Some feelings need a different door — want to try {next}?"
4. **Rewards line** (13 px): "+1 memory orb · RUSH bond 2/5 · 4 orbs this week".
   Buttons:
   - **[I'M GOOD ✓]**: primary, gold. Calls `clearForNext`. Copy: "back to your day".
   - **[ANOTHER ROUND ▶]**: `tryRecommendedRelease`, which now routes to the next game in the relief path.
   - **[SHARE MY SHIFT]**: §G.
   - Also sets `setReleaseCheck(Δ≥2?"yes":"no")` so the existing recommendation logic stays consistent.
5. **Safety tie-in.** If `after ≥ 9`, or `after ≥ before` for two sessions in a row, the soft variant of §H shows under the meter.

### D5. State and storage (`useEosSession`, edit E1; mirrored to the module-level `EOS_STORE` for callbacks)
- React state: `{ phase: "checkin"|"ready", emotion, sub, before, after, startedAt, gameId, path:[] }`.
- `reset()` on `clearForNext` (edit E2b).
- localStorage keys (all `try/catch`):
  - `eos_sessions_v1`: `[{t, emo, sub, before, after, gameId, ms}]`, capped at 200
  - `eos_bonds_v1`: `{rush:3, …}`
  - `eos_learned_v1`: `{gameId: completions}`
  - `eos_week_v1`: ISO-week to days array
- No text is ever stored (privacy).

---------------------------------------------------------------------------------------------------
## E. Emotion → game routing (complete) + hide/merge

### E1. Rule: "bottom-up when hot, top-down when warm"
- **Intensity bands:**
  - **HOT** (7-10): body-first (breath, motor discharge then cool-down, grounding, acceptance).
  - **WARM** (4-6): mixed (distancing, containment, defusion).
  - **MILD** (1-3): playful reframes (humour, perspective).
- This follows emotion-regulation-choice research: at high intensity, cognitive reappraisal is hard to deploy and attentional or physiological strategies work better (Sheppes et al., 2011/2014).
- **Algorithm `EosRouteGame(text, played, excludeId)`:**
  1. If `eosSafetyHit(text)`: pool = `EOS_SAFE_POOL = [111,116,110,115,113,109,102]` (calm, never destructive).
  2. `emo = EOS_STORE.emotion || eosDetect(text)`. If none, return `null`, which falls back to `chooseRelevantGame`.
  3. `pool = ROUTES[emo][band] ++ ROUTES[emo][other bands]`. Sub-tags pull a hero to the front:
     - `lonely` → 116
     - `numb` → 117
     - `jealous` → 118
     - `fear` → 114 (WARM/MILD only)
     - `choice` + anxiety → 89 eligible
  4. Filter:
     - the id exists,
     - it is not `excludeId`,
     - it is not in `EOS_VAULT`,
     - it was not played in this session's last 3,
     - prefer ids not in the last 6 of `played`.
  5. HOT: take the first candidate (reliability beats novelty in a crisis). Otherwise: first candidate, with a 25% chance of the second (novelty).
  6. `ANOTHER ROUND` → `EosRouteGame(text, played, selected.id)` gives the *next* door in the same path.

### E2. Routing table (ids, best first; **bold** = path hero; new games 111-119 in italics)
| emotion (char) | HOT 7-10 | WARM 4-6 | MILD 1-3 |
|---|---|---|---|
| PANIC (Sync) | ***111 BIG SIGH***, 102 FINGER TRAP, 109 CLEANSE, 36 CLOUD PASS, 77 SLOW MOTION, 65 PAUSE BUTTON, 69 PULSE | 102, 61 FREEZE, 71 DEFUSE, 11 PRESSURE POP (fixed), 67 TAP OUT, 66 BUFFERING | 105 DRAMA MACHINE, 55 HEADLINE, 104 VOLUME KNOB, 52 SUBTITLES |
| ANGER (Rush) | ***112 COOL THE VOLCANO***, 100 HOT POTATO, 4 STOMP, 15 SHRED, 68 DRUM IT, 2 CRUSH, 13 SQUASH | 18 BURN, 101 TUG OF WAR, 61 FREEZE, 64 RED LIGHT, 6 ZAP, 3 CRACK, 14 CRUMPLE | 107 GO WEIRD, 53 CARTOONIFY, 52 SUBTITLES, 37 ELEVATOR DOWN |
| ANXIOUS (Glitch) | ***113 LANTERN HUNT***, 102 FINGER TRAP, 67 TAP OUT, 24 SLINGSHOT, 109 CLEANSE | *114 SHADOW SHRINK* (fear), 95 SHELF IT, 32 PARK IT, 31 BACK SEAT, 34 RIVER, 25 SWIPE AWAY, 8 METEOR (fixed) | 85 CONTROL PANEL, 84 MINE / NOT MINE, 89 DOOR A / B (only with "or"/"vs"), 29 MUTE, 97 X-RAY |
| OVERTHINKING (Loopie) | ***119 SQUEAKY THOUGHT***, 1 POP, 43 CUT THE LOOP, 41 UNHOOK, 6 ZAP | 34 RIVER, 104 VOLUME KNOB, 99 ECHO CHAMBER (text fixed), 22 FLUSH, 75 INK BLEED, 44 VELCRO | 105 DRAMA MACHINE, 52 SUBTITLES, 59 SPOTLIGHT (fixed), 53 CARTOONIFY, 98 MAGIC TRAPDOOR |
| OVERWHELMED (Sync) | **93 SPACE MAKER**, 21 BIN, 1 POP, 39 BLACK HOLE, 27 DROP ZONE, *111 BIG SIGH* | 95 SHELF IT, 32 PARK IT, 87 KEEP / DROP, 30 ZOOM OUT, 22 FLUSH | 85 CONTROL PANEL, 88 TRADE MACHINE |
| SAD (Drop) | **110 RAIN OUT**, *116 SKY LANTERNS*, 75 INK BLEED, 33 FLOAT AWAY | 40 PAPER PLANE, 106 TINY SOUNDTRACK, 36 CLOUD PASS, *115 KIND ECHO* | 88 TRADE MACHINE, 106, *117 PAINT THE GREY* |
| ASHAMED (Patch) | ***115 KIND ECHO***, 19 ERASE, 14 CRUMPLE, 15 SHRED | 84 MINE / NOT MINE (over-responsibility), 79 MISS ON PURPOSE (perfectionism), 107 GO WEIRD, 18 BURN, *118 SPOTLIGHT SWAP* (jealous) | 107, 53 CARTOONIFY, 52 SUBTITLES |
| EMPTY (Drop) | ***117 PAINT THE GREY*** (numb), ***116 SKY LANTERNS*** (lonely), 68 DRUM IT, 106 TINY SOUNDTRACK | 1 POP, 88 TRADE MACHINE, 110 RAIN OUT, 47 UNFOLLOW | *115 KIND ECHO*, 45 MAGNETS |
| NOT SURE / text without a match | `chooseRelevantGame` (unchanged), restricted to non-vault ids | | |

- Routed set: **67 kept + 9 new**.
- Also add the strongest games to `chooseRelevantGame`'s `keywordBoost` implicitly: because E3 calls `EosRouteGame` first, "I'm so angry" now reaches 112/100 and "I'm grieving" reaches 110.

### E3. Hide (Vault) and merge: 43 games stay playable but are never routed
They are listed last in the menu under a `CLASSIC VAULT` label. They stay rendered as `button.releaseChoiceItem` so `drive.mjs` can still start them by name.

| vault ids | why | merged into |
|---|---|---|
| 5 HAMMER, 10 DOMINO DROP, 35 TRAIN PLATFORM | fake timing / tap-then-watch ×6 | – |
| 9 LASER SLICE, 16 MELT | arm-tool clones with wrong guides | 4 STOMP / 3 CRACK |
| 12 BOUNCE OUT, 54 FONT CHECK, 57 CAMERA ANGLE, 76 REVERSE IT | pill-tapping; the object is never touched | 2 CRUSH / 30 ZOOM OUT |
| 17 BOSS BATTLE | broken fear game (hidden order, invisible word) | *114 SHADOW SHRINK* |
| 20 GLITCH OUT, 63 PATTERN POP | abstract or fake prediction; silent resets | – |
| 23 VACUUM | passive duplicate | 22 FLUSH |
| 26 SEND TO SPACE, 46 UNPIN, 48 UNSTICK, 49 UNZIP | one drag with the payoff missing | 24 SLINGSHOT / 25 SWIPE AWAY |
| 28 ARCHIVE, 38 DRAWER | chores | 95 SHELF IT |
| 42 UNTANGLE, 60 CROP TOOL, 51 MIRROR FLIP | hidden-order chores | – |
| 50 UNFINISHED SENTENCE | typing in a crisis; can amplify catastrophising | 105 DRAMA MACHINE |
| 56 COURTROOM, 73 TRAFFIC LIGHT, 83 SORT STATION, 86 FACT / STORY, 72 CATCH & LABEL | one-tap "forms" ×6 | 84 MINE / NOT MINE (the swipe deck), 85 CONTROL PANEL |
| 58 MICROSCOPE | corner knob ×4 | 30 ZOOM OUT |
| 62 NET IT | fake catch | – |
| 70 METRONOME | invisible rule | 64 RED LIGHT |
| 74 BUBBLE WRAP | strict order kills the stim | 1 POP |
| 78 ONE WORD, 81 STACK IT, 91 PRIORITY BLOCKS, 94 JUGGLE | meaningless on auto-split chunks; 94 keeps the negative word | 93 SPACE MAKER |
| 80 DON'T TAP | duplicate | 66 BUFFERING (now with a breathing ring) |
| 82 SEESAW | 36-tap precision chore | – |
| 90 COIN FLIP REACTION | passive; the reaction step is missing | 89 DOOR A / B |
| 92 SCALE DOWN | its intensity rating is now the global shift meter | EosShiftMeter |
| 96 SCRATCH REVEAL | anti-relief (reveals your distress word 6×) | – |
| 103 SINKING PLATFORM | tap-then-watch | – |
| 108 WORD SALAD | the win state rebuilds the negative sentence | *119 SQUEAKY THOUGHT* |

`const EOS_VAULT = new Set([5,9,10,12,16,17,20,23,26,28,35,38,42,46,48,49,50,51,54,56,57,58,60,62,63,70,72,73,74,76,78,80,81,82,83,86,90,91,92,94,96,103,108])`

---------------------------------------------------------------------------------------------------
## F. New games (ids 111-119): scenes from the mind, each under 45 s

### Shared contract for all new engines
- **GAMES entry.** `GAMES.push({...})` from `src/eos/9x_game_*.jsx`.
  - Fields: `{id, name, family, engine:"EOS", prompt, object, action, mechanism, hook, surprise, mindBend, score, replay, sound, notes}`.
  - `family` must be an existing key (Destroy, Discard, Distance, Detach, Reframe, Interrupt, Rhythm, Balance, Sort, Choice, Reveal, Absurdity, Release).
  - `engine:"EOS"` gives a class `engine-eos` that no CSS targets.
- **Routing.** Edit E10: `{ const E = EosEngineFor(p.game); if (E) return <E {...p} /> }`. Ids ≥111 run `GameEngine`, so they get sparks, tokens, chain and the reward bursts.
- **Progress.** Edit E11 marks ids ≥111 explicit, so `sfx` never moves the bar. Call `onProgress(0..100, "N/3 CALMED")`, and `onDone(bonus 220-360)` exactly once.
- **Root and classes.**
  - Root is `<div className="arena eosArena eos-u{id}">`.
  - **Avoid** every class in the new wrapper's `bubblePhotoSelectors` and `externalHostSelectors` (`wordBubble`, `allCircularBubble`, `juggleBall`, …) and the `strongPropPattern` words (`button`, `tool`, `handle`, `panel`, …) on decor. Otherwise the wrapper re-skins or pushes your nodes.
  - Words go in `span.eosWord` (our own class, 16-22 px).
- **Arrow.** Put `data-eos-target="1"` plus `data-eos-verb/dir/n/ms/label` on the live element.
- **Copy.** `SHORT_HINT[id]` and `RELEASE_MIND_BEND[id]` are assigned in the module.
- **Words.** Use `entries` (6 chunks); `displayText(w, 24)`; dedupe repeats (`[...new Set(words)]`); image-only sentinels → use the emotion starter words.
- **Characters.** `eosCharSrc(char, face)` = `emotionSrc`. The companion character comes from `EOS_STORE.emotion`, else the game's default.
- **Motion.** framer-motion `motion`, plus `AnimatePresence, useMotionValue, useTransform` (edit E0 widens the import). Every looping animation is gated by `reduced`. Pointer capture (`setPointerCapture`) on every press or drag, plus `onPointerCancel`, so holds survive finger slides (fixes the known hold bug class).
- **Squash.** Add `.eosObj` to `PX_SQUASH_TARGETS` (99_pixar) so the Pixar squash plays on our objects.

---

### 111 · BIG SIGH: panic (also overwhelm)
- **Family:** Release. **Character:** SYNC (E44 → E90).
- **Fantasy:** "Be the wind that blows Sync's lightning storm out to sea."
- **Scene:** A tiny island under a purple storm. Sync sits on it, crackling. The user's words are 6 thunderclouds. A huge soft breath orb glows at bottom-centre.
- **Controls:** **Press and hold the orb, then let go.** That's the whole game.
  - Holding: the orb swells for 2.0 s ("breathe in…").
  - At the top it does an automatic little *hiccup-swell* of +8% over 0.5 s ("…and a sip more"), choreographing the second inhale.
  - **Let go:** a 5.5 s automatic exhale. The orb drains, a wind ribbon sweeps across, 2 clouds drift off and dissolve into light rain, then sunlight. Input is ignored during the exhale ("ride it out"), which enforces the long out-breath.
  - Early release (<1.2 s): a little "puff", no penalty, plus "bigger breath in, then let go".
- **Science:** Cyclic physiological sighing (double inhale, long exhale) improved mood and lowered respiratory rate more than mindfulness in a 5-min/day RCT (Balban et al., 2023, *Cell Reports Medicine*). Extended exhalation shifts autonomic balance toward the parasympathetic. The automatic exhale enforces a ≈2:1 exhale-to-inhale ratio without ever saying "breathing exercise".
- **Win:** 3 sighs, about 25 s. With `before ≥ 8`, 4 sighs (the last clears the remaining clouds plus sunrise), about 33 s.
- **Juice:**
  - Heartbeat haptic under the finger that slows each round (`[10,90,10,600]` → `[10,120,10,900]`).
  - `hum` rising on inhale; `rainSfx(5)` wind/rain on exhale; `chime` per cloud dissolved.
  - The sky gradient shifts from storm violet to dawn gold (`--eos-sky` by round). Lightning flickers decay.
  - Sync's face goes from E44 to neutral to **E90 (asleep on the moon)** at the finale.
  - The global dust flow speeds into the core on each exhale.
- **Implementation (`EosBigSighEngine`, ~260 lines):**
  - state `{phase:'idle'|'in'|'sip'|'out', round, gone:[]}`, refs `{t0, timers}`.
  - Orb: `motion.button.eosObj.eosBreathOrb` with `animate={{scale: phase==='in'?1.45: phase==='sip'?1.56: 1}}` and `transition={{duration: phase==='in'?2: phase==='sip'?.5: 5.5, ease: phase==='out'?[.2,.0,.2,1]:'easeOut'}}`. `onPointerDown` → setPointerCapture → `in`; timer 2 s → `sip`; `onPointerUp/Cancel` → `out` if held ≥1.2 s.
  - Clouds: 6 `motion.div.eosCloud` with `span.eosWord`, `animate={{x: gone ? '70vw':0, opacity: gone?0:1, filter: gone?'blur(6px)':'none'}}`.
  - Rain: 24 CSS `i` streaks; sky = layered radial gradients keyed by round.
  - Progress: `round/rounds*100` at each exhale end; during an inhale, set `+8` provisional (non-decreasing).
  - The target element sets `data-eos-verb="hold" data-eos-ms="2000" data-eos-label="HOLD… THEN LET GO"`.
  - Reduced motion: clouds fade instead of drift; the orb scales without the wobble.

### 112 · COOL THE VOLCANO: anger
- **Family:** Destroy. **Character:** RUSH (E29 → E44).
- **Fantasy:** "Let Rush's volcano blow its top, then make it rain and grow a garden on the cooled lava."
- **Controls, phase A · ERUPT (6 taps, ≤6 s):** Tap the crater. Each tap is a BOOM:
  - a rock carrying one of the user's words launches and shatters into sparks;
  - 6 px screen shake, `clack`, `vibrate(20)`.
  - Six taps empty the crater.
- **Controls, phase B · COOL (~15-20 s):** A rain cloud appears. **Drag it slowly back and forth over the lava.**
  - Rain amount ∝ dwell and slowness: pointer speed <350 px/s rains; fast swipes only make mist and show the hint "slower… 🐢".
  - Heat goes 100 → 0. The lava shifts red → orange → grey obsidian, with steam puffs.
  - The rain *pulses* on a 4 s in / 6 s out rhythm, and the cloud shows "in… out…". Moving with the pulse doubles the cooling.
- **Controls, phase C · BLOOM (2 s, automatic):** 8 flowers spring up on the cooled rock. Rush belly-laughs (E44).
- **Science:** Anger is a high-arousal approach state. A 2024 meta-analysis of 154 studies (Kjærvik & Bushman, *Clinical Psychology Review*) found that arousal-*decreasing* activities (slow breathing, relaxation) reduce anger, while arousal-increasing "venting" does not. So the eruption is only a 6-tap *hook* (fast motor engagement that honours the urge). The relief comes from the slowed, breath-paced cool-down. Also "cooling off" as an embodied temperature metaphor.
- **Win:** heat 0 within 35 s. If the user rushes, heat still drops slowly by itself (minimum rate), so it finishes by 45 s.
- **Juice:** shatter sparks (reuse `PremiumBurst` with tone "gold"), lava glow (`--heat` drives the gradient and `box-shadow`), steam particles, rain streaks, flower spring pop (`tsPxSquash`), `soft` per rain pulse, `win` on bloom.
- **Implementation (`EosVolcanoEngine`, ~340 lines):**
  - SVG volcano with a lava path filled by `linear-gradient` from `hsl(calc(10 + (1-var(--heat))*200) …)`.
  - Rocks: 6 `motion.div.eosObj` with `animate` arcs `{y:[0,-260], x:[0, ±120], rotate}`, then a burst.
  - Cloud: `motion.div drag dragMomentum={false}`; `onDrag(e, info)` reads `info.velocity` → heat decrement `dt × k × slowFactor × breathPhaseBonus`.
  - Progress: phase A maps to 0-30, phase B to 30-95, bloom to 100.
  - Targets: phase A crater (`verb tap, ×6`); phase B cloud (`verb slow, dir lr`).

### 113 · LANTERN HUNT: anxiety (worry, dread)
- **Family:** Balance. **Character:** GLITCH (E15 → E10).
- **Fantasy:** "Glitch's what-if static is fogging HQ. Light 5 lanterns by finding real things around you."
- **Scene:** A foggy night pier with 5 paper lanterns on a string. Glitch, crackling with static, is in the middle. The user's words drift as fog wisps.
- **Controls:**
  - Each lantern shows one big icon and one short mission. The mission is randomised from pools:
    - 👀 "Find something **BLUE** near you" (or round, shiny, red…)
    - ✋ "Touch something **SOFT**" (or cool, smooth)
    - 👂 "Find the **farthest** sound"
    - ☕ "Notice one **smell** or taste"
    - 🦶 "Press your **feet** into the floor"
  - Tap a lantern when you've done it. It fills over 1.2 s (gentle "keep looking…" pacing), lights gold, floats into the Still Point, and one fog wisp (word) burns off. Any order works.
- **Science:** 5-4-3-2-1 sensory grounding moves attention from future threat ("what if") to present external sensory input (attentional deployment). The game compresses it to 5 senses × 1 item to stay under 45 s.
- **Win:** 5 lanterns, about 30-40 s. Finale: the lanterns ring Glitch, the static clears, and Glitch shows E10 (cool).
- **Juice:** paper rustle (`soft`), candle flare + `chime`, Glitch's static stripe opacity drops 20% per lantern, fog thins (CSS `backdrop-filter` blur 8 → 0).
- **Implementation (`EosLanternHuntEngine`, ~220 lines):** state `lit[5]`, `prompts[5]`. Lanterns are `motion.button.eosObj.eosLantern` with a `layout` fly-to-centre on light. The target is the first unlit lantern (`verb tap`, label "FOUND IT? TAP").

### 114 · SHADOW SHRINK: fear (approach instead of avoid)
- **Family:** Reveal. **Character:** GLITCH (E15 → E10). Replaces broken 17 BOSS BATTLE.
- **Fantasy:** "The monster on the wall is just a shadow. Bring the light closer and see how small the real thing is."
- **Scene:** A bedroom wall with a giant shadow-puppet monster made of the fear words (huge, blurred silhouette text). A little flashlight sits at the bottom.
- **Controls:** **Drag the flashlight toward the shadow.**
  - As the distance shrinks, the shadow scales 3 → 0.4 and sharpens (blur 12 → 0 px).
  - Hold the light on it for 1.5 s ("look right at it"). It is revealed as a tiny sock puppet wearing the word, with googly eyes.
  - 3 rounds (the 3 longest chunks).
- **Science:** Approach and exposure reduce fear through new safety learning (inhibitory learning); avoidance maintains it. Naming the fear (affect labelling; Lieberman et al., 2007) lowers amygdala response. Humour lowers threat appraisal. The visual rule teaches "closer look = smaller".
- **Win:** about 30 s.
- **Juice:** a light cone (radial-gradient mask following the flashlight), a creaky `hum` that pitches *down* as the shadow shrinks, a giggle `plink` on reveal, the puppet squash.
- **Implementation (`EosShadowShrinkEngine`, ~250 lines):** flashlight `motion.div drag` with `useMotionValue(x,y)` → `useTransform(dist, [maxD, 60], [3, .4])` for the shadow scale and blur. Reveal swaps in an SVG sock puppet with `span.eosWord`. Reduced motion: three tap-steps "closer, closer, look".

### 115 · KIND ECHO: shame and guilt (also sad, empty)
- **Family:** Reframe. **Character:** PATCH (E73 → E72).
- **Fantasy:** "Patch is clutching a harsh label about you. Warm Patch up, then hand it the line you'd give your best friend."
- **Controls:**
  1. **Hand on heart.** Press and hold Patch for 3 s. A warm glow fills, with a heartbeat haptic. Patch softens (E73 → E75).
  2. **Pick the kind echo.** The harsh card (user's words, slightly cracked) floats up, and 3 kind orbs drift in. **Drag or tap one onto the card.** The harsh text melts letter by letter and the kind line writes itself in (stroke-dash "handwriting"). Patch holds a flower (E72).
  - Kind-line pool, tagged by self-compassion component:
    - kindness: "You did the best you could with what you knew."
    - common humanity: "Anyone would've struggled with this."
    - mindfulness: "One moment isn't the whole you."
    - growth: "You're learning, not failing."
    - "I'd forgive a friend for this."
  - 2 rounds (the 2 longest chunks).
- **Science:** Brief self-compassion inductions reduce shame and increase motivation to repair (Breines & Chen, 2012). Supportive self-touch (hand on heart) lowered cortisol responses to stress (Dreisoerner et al., 2021). "What would you tell a friend" is self-distancing.
- **Win:** about 30 s.
- **Juice:** the warm-orange bloom on hold, melting letters (`motion.span` each falls with gravity), pen-scratch `soft`, then `chime`.
- **Implementation (`EosKindEchoEngine`, ~280 lines).** Targets: stage 1 Patch (`hold 3000`), stage 2 kind orbs (`pick`, `to` = card).

### 116 · SKY LANTERNS: loneliness (also sad)
- **Family:** Release. **Character:** DROP (E70 → E08).
- **Fantasy:** "Drop is alone on a dark hill. Light a lantern for each heavy word and send it up. The sky holds every lantern you've ever lit here."
- **Controls:**
  - Tap a word: it folds into a paper lantern (0.6 s).
  - Hold it 1.2 s to light it.
  - Flick or drag it up (or just release after lighting) to let it float.
  - Each lantern joins a constellation drawn from **the user's own past memory orbs** (`eos_sessions_v1`), not fake strangers: "23 lanterns lit here."
  - Finale prompt: "Send one to someone?" calls `navigator.share({text:"Thought of you today ✨"})` with a copy fallback. **[Keep it for me]** has equal visual weight. No guilt.
- **Science:**
  - Loneliness eases with actual connection. People underestimate how much others appreciate being reached out to (Liu, Rim, Min & Min, 2023, *JPSP*), which makes a 5-second "reach out" nudge high-value.
  - Rituals reduce grief (Norton & Gino, 2014).
  - The constellation gives continuity and belonging over time.
- **Win:** 3 lanterns, about 30 s.
- **Juice:** paper fold squash, flame flicker, slow rise with sway, star-twinkle `plink` as each lantern docks, Drop looks up then hugs a heart (E08).
- **Implementation (`EosSkyLanternsEngine`, ~260 lines).**

### 117 · PAINT THE GREY: numbness, flatness (empty)
- **Family:** Rhythm. **Character:** SYNC unplugged (desaturated E34 → full-colour E34 dancing).
- **Fantasy:** "HQ has gone grey. Splash colour everywhere until Sync's lights flicker back on."
- **Controls:**
  - **Tap or scribble anywhere.** Every touch bursts a paint splat (random warm hue) and plays a pentatonic note (`tskey:clean:{0-5}`). Dragging leaves a glowing trail.
  - The user's words are grey stones. 3 splashes each turn them into candy-coloured gems.
  - The combo meter fills with varied, fast touches.
- **Science:** Behavioural activation (action before motivation), plus gentle *up*-regulation: novelty, movement, colour, rhythm and music engage reward circuitry and counter blunted affect. This is the opposite of the down-regulating games, which is the correct prescription for numbness.
- **Win:** a 6×8 coverage grid ≥80%, or 6 gems, about 20-30 s. Sync's lights flicker on and he dances, with confetti.
- **Juice:** splat squash, drips, rising pitch on the combo, the screen saturation var `--eos-sat` going 0 → 1 (CSS `filter: saturate()` on the scene).
- **Implementation (`EosPaintGreyEngine`, ~230 lines):** splats are pooled at 60 DOM nodes (recycled), no canvas; coverage is tracked by grid cells. Target: the arena centre (`verb scrub`, label "SPLASH EVERYWHERE").

### 118 · SPOTLIGHT SWAP: jealousy and comparison
- **Family:** Reframe. **Character:** PATCH (E73 → E11 heart eyes).
- **Fantasy:** "The spotlight's stuck on someone else's trophy. Drag it back to your own shelf and see what's been glowing there all along."
- **Controls:**
  1. Drag the spotlight lamp from the giant shiny "their" trophy (the user's comparison words) onto your shelf.
  2. Three dim jars appear. Tap each one and pick 1 of 3 chips. Pool: "a body that carried me today", "someone who'd pick up", "something I made", "a skill I learned", "a small win this week", "a cosy place". The jar fills gold.
  - The rival trophy shrinks to normal size: "just a thing".
- **Science:** Gratitude practice reduces envy and the sting of upward comparison. Attentional redeployment toward your own resources. It turns malicious envy into benign envy and your own goals.
- **Win:** about 25 s.
- **Implementation (`EosSpotlightSwapEngine`, ~220 lines).** Targets: lamp (`drag to .eosShelf`), then jars (`pick`).

### 119 · SQUEAKY THOUGHT: overthinking and harsh self-labels
- **Family:** Absurdity. **Character:** LOOPIE (E58 → E70).
- **Fantasy:** "Say the loop over and over until it's just a squeaky noise Loopie giggles at."
- **Controls:**
  - The stickiest chunk (the longest, or tap 1 of 3) becomes a giant jelly bubble. **Rapid-tap it about 20 times.**
  - Each tap "says" the word. With sound on, the first tap uses `speechSynthesis` (pitch 2, rate 1.4) and later taps use rising squeak tones.
  - The word wobbles. Every 5 taps the letters jitter, space out and flip. At 20 the letters pop off as bubbles and the bubble reads "blub blub".
  - Optional: "say it out loud with each tap".
- **Science:** Cognitive defusion by rapid word repetition. Saying a self-relevant negative word aloud repeatedly for about 20-30 s reduced its discomfort and believability (Masuda et al., 2004; 2009, Titchener's repetition technique). Humour adds distance.
- **Win:** 20 taps, about 15 s. A gentle 25 s timer auto-completes with no fail state.
- **Juice:** jelly squash on every tap, pitch rising per tap, Loopie's spiral eyes slow and stop, a giggle `plink`.
- **Implementation (`EosSqueakyEngine`, ~200 lines).** Target: the bubble (`taps`, n = 20, label "SAY IT ×20").

GAMES entry example:
```js
GAMES.push({ id:111, name:"BIG SIGH", family:"Release", engine:"EOS", prompt:"Blow the storm out to sea.",
  object:"storm clouds", action:"HOLD, THEN LET GO", mechanism:"double inhale, long automatic exhale", hook:"your breath is the wind",
  surprise:"sunrise", mindBend:"Your exhale is the off-switch. Long out wins.", score:96, replay:"daily", sound:"wind", notes:"EOS panic hero" })
SHORT_HINT[111] = "Hold the orb… then let go"; RELEASE_MIND_BEND[111] = "Your exhale is the off-switch. Long out wins."
```
Mind bends for 112-119:
- 112: "Let it blow. Then let it cool."
- 113: "Your room is real. The what-ifs aren't here yet."
- 114: "Shadows are biggest from far away."
- 115: "Talk to yourself like someone you love."
- 116: "Every lantern you've lit is still up there."
- 117: "Colour first. Feelings follow."
- 118: "Your spotlight. Your shelf."
- 119: "Say it enough and it's just sounds."

---------------------------------------------------------------------------------------------------
## G. Healthy-addiction and virality loop (no dark patterns)

**Loop:** feeling (internal trigger) → 2-tap check-in → a game under 45 s → **felt shift you can see** ("8 → 3") → memory orb and companion growth → back to life. The core currency is the **felt shift**, not taps. Rewards scale with real improvement, never with time spent.

1. **Shift Score.** The sum of positive Δ across sessions; negative Δ counts 0. It shows on the Orb Shelf ("47 points shifted").
2. **Memory Orbs and the Orb Shelf.**
   - A header button `◉ 12` (16 px) opens a drawer: the last 14 orbs as glowing marbles in emotion colours, with a gold rim when Δ ≥ 3.
   - Tap an orb to see the memory: "Tue 9:41 pm · ANGER 8→2 · COOL THE VOLCANO".
   - The cinematic tie: the reveal's orb flies up into the header icon (+1 bounce).
3. **Companion bonds.** Each character levels up at 1, 3, 6, 10 and 15 sessions.
   - Each level unlocks one existing happy face (§0 table) and a one-liner ("Rush learned to laugh it off").
   - The check-in orb shows the newest face *after* the shift, so your companions visibly grow with you.
   - The collection is finite (about 25 faces), not an infinite slot machine.
4. **Week Constellation.** A 7-star ring: each day with a check-in lights a star.
   - Copy is always additive: "3 stars this week ✨". There is **never** a "streak broken" message.
   - A lifetime "days you showed up" count never resets.
5. **Honest variable reward.** The existing `RewardSurgeBurst` rotation adds variety. A **core memory** (gold orb, special bloom) is earned only by real Δ ≥ 3, never by chance.
6. **Built-in exit ramp.**
   - "I'M GOOD ✓" is always the primary button on the reveal.
   - After 3 sessions in 20 min: "You've shifted 3 times. Still says: water and a stretch 🌿". Auto-routing pauses; manual play is still allowed.
   - No autoplay into the next game.
7. **Share My Shift card** (`EosShareCard`, canvas 1080×1350, or 1080×1920 story):
   - Contents: emotion-hue → gold gradient, the calm character (raw.githubusercontent images send `access-control-allow-origin: *`, so the canvas stays untainted), "ANGER 8 → 2", "shifted in 41 s", "with RUSH · ThinkStill", a dust spiral, and a `shareUrl` prop as footer.
   - **The user's words are never included** unless they toggle it on.
   - Sharing: `navigator.canShare({files})` → share; otherwise download; otherwise copy text.
8. **Social seeds without a backend:**
   - the SKY LANTERNS "send a spark to someone" share;
   - a weekly "My HQ week" recap card (orbs plus constellation);
   - a "Try BIG SIGH: I went 9→3" challenge text.
9. **Hypnotic, not compulsive.** The pull comes from ASMR micro-sounds, inward-flowing dust, the breathing core, squash and stretch, and slowing heartbeat haptics. These are calming hooks, not arousal hooks.

**Never:** guilt notifications, streak-loss copy, countdown pressure outside a game, fake "people online" counts, loot boxes, rewards for session length, or hiding the exit.

---------------------------------------------------------------------------------------------------
## H. Safety card (`EosSafetyCard`, `src/eos/80_safety.jsx`)

- **Trigger.** `eosSafetyHit(text)` runs on the composer text (debounced 600 ms) and on launch:
```js
const EOS_SAFETY = /\b(kill(ing)? myself|suicid\w*|end (it all|my life)|want(ed)? to die|wish i (was|were) dead|don'?t want to (live|be here)|self[- ]?harm\w*|cut(ting)? myself|hurt(ing)? myself|overdos\w*|no reason to live|better off without me|(he|she|they) (hits|hit|beats|hurts) me|abus(e|ed|ive|ing)|rap(e|ed)|not safe at home)\b/i
```
  The soft variant also triggers when the after-rating is ≥9, or after ≥ before, two sessions in a row.
- **Behaviour.**
  - **Never blocks play.** A card slides down at the top of `.releaseStage` (z 70, max-width 520, `role="alert"`, focus moves to it). It shows once per session per trigger.
  - While the flag is set, the router uses `EOS_SAFE_POOL` (no destruction games on "I want to kill myself").
  - The text is never stored or sent anywhere.
- **Look.** Still's heart face (still E15) in a warm glow, cream card, Baloo 2, 16 px body.
- **Copy:**
  - "That sounds really heavy. You deserve real support — not just a game."
  - "Talking to someone right now can help."
- **Buttons:**
  - **[Reach someone now]** opens `crisisUrl` (Framer prop; default `https://findahelpline.com`, an international directory).
  - **[Text someone I trust]**: `navigator.share({text:"Hey, can you talk? I'm having a hard time."})`, falling back to `sms:?&body=…`.
  - **[Keep playing]** dismisses.
- **Placeholders.** Framer props `crisisLabel`, `crisisUrl`, `crisisLines` (string list). Example defaults to **verify per region before shipping**: US 988 · UK & IE Samaritans 116 123 · Australia Lifeline 13 11 14 · India Tele-MANAS 14416.

---------------------------------------------------------------------------------------------------
## I. Build plan: independent modules + minimal surgical edits

### I1. Modules (`src/eos/`, concatenated in filename order; no imports; `Eos`/`EOS_` prefixes)
| file | exports (top-level) | contract / depends on | prio | est. lines |
|---|---|---|---|---|
| `00_core.jsx` | `EOS_B`, `EOS_EMOTIONS`, `EOS_STORE`, `EOS_LEX`, `EOS_SUBTAGS`, `EOS_SAFETY`, `eosDetect(text)→{id,sub}|null`, `eosSafetyHit(text)→bool`, `eosNoise(i,s)`, `eosCharSrc(char,face)`, `eosLsGet/Set(key,def)`, `useEosSession()→{phase,emotion,sub,before,after,startedAt,commit(o),setAfter(n),reset()}`, `EosMarkLaunch(game, entries)` | arcade helpers only (`emotionSrc`); **must not** touch `PX_B` at top level | P0 | 220 |
| `10_css.jsx` | `EOS_GLOBAL_CSS` (tokens + B typography + A arrows + C flow + D check-in, meter, companion + H card + A7 pointer fixes + `.guideActionArrow` for both wrappers) | `EOS_B` | P0 | 450 |
| `20_flow.jsx` | `EosThoughtFlow({stage, reduced})` | core | P0 | 60 |
| `30_arrows.jsx` | `EOS_GESTURES`, `eosGlyph(game)`, `eosResolveTarget(host, game, st)`, `EosGuideArrows({game, hostRef, reduced})`, SHORT_HINT fixes (`Object.assign`) | core; reads `.engineProgressTrack`, `.globalPlayGuide` | P0 | 420 |
| `40_play_layer.jsx` | `EosPlayLayer({game, entries, hostRef, reduced, raw, eos})` = arrows + `EosCompanion` + safety + flow vars (`--eos-p`, `.eosGather`) | 30, 80 | P0 (arrows) / P1 (companion) | 160 |
| `50_checkin.jsx` | `EosCheckIn({eos, raw, setRaw, onLaunch, onPickManually, toggleMic, listening, reduced, sfx})` | core | P1 | 380 |
| `55_router.jsx` | `EOS_ROUTES`, `EOS_VAULT`, `EOS_SAFE_POOL`, `EosRouteGame(text, played, excludeId)→game|null`, `EosMenuGroup({onPick, played})` (renders `button.releaseChoiceItem`) | core + `GAMES` | P1 | 180 |
| `60_shift.jsx` | `EosShiftMeter({eos, game, onDone, onNext, onAgain, setReleaseCheck, sfx, rainSfx, reduced})` (Still Moment + dial + payoff + rewards line), `eosRecordSession(o)` | core, 70 | P1 | 360 |
| `70_rewards.jsx` | `EosOrbShelf`, `EosHeaderOrbs`, `eosBondFor(char)`, `eosWeek()`, `EosShareCard({session})` (canvas → share) | core | P2 | 330 |
| `80_safety.jsx` | `EosSafetyCard({text, soft, onClose})`, `EOS_CRISIS` | core | P1 | 120 |
| `90_games_registry.jsx` | `EOS_NEW_GAMES` (`GAMES.push` ×9, `SHORT_HINT`/`RELEASE_MIND_BEND` assignments), `EosEngineFor(game)→Component|null` | all `9x` engines (hoisted function declarations) | P2 | 140 |
| `91_big_sigh.jsx` … `99_squeaky.jsx` | `EosBigSighEngine`, `EosVolcanoEngine`, `EosLanternHuntEngine`, `EosShadowShrinkEngine`, `EosKindEchoEngine`, `EosSkyLanternsEngine`, `EosPaintGreyEngine`, `EosSpotlightSwapEngine`, `EosSqueakyEngine` | engine contract §F; core | P2: 111, 112, 113, 115 first; P3: the rest | 200-340 each |

Each `9x` engine is independent and can be built in parallel. The only shared pieces are `00_core` and `10_css`. Keep game-specific CSS **inside each engine file** as a `<style>` string scoped to `.eos-u{id}`, so nobody edits `10_css` concurrently.

### I2. Surgical edits to `src/00_arcade.jsx` (all anchors verified unique; edit by string replacement)
| # | anchor (exact) | change | prio |
|---|---|---|---|
| E0 | `import { motion } from "framer-motion"` | → `import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion"` (no name collisions; the local `useReducedMotion` stays) | P2 |
| E1 | `    const [releaseCheck, setReleaseCheck] = React.useState(null)` | append the line `    const eos = useEosSession()` | P1 |
| E2 | `                    {stage === "input" && !selected ? (` | insert before it: `{stage === "input" && !selected && eos.phase === "checkin" ? (<EosCheckIn eos={eos} raw={raw} setRaw={setRaw} onLaunch={startThinkStillChoice} onPickManually={() => setGameMenuOpen(true)} toggleMic={toggleMic} listening={listening} reduced={!!reduced} sfx={sfx} />) : null}` | P1 |
| E2b | `    const clearForNext = React.useCallback(() => {` | add the next line `        eos.reset()` (`eos` is a stable object from the hook; React's exhaustive-deps lint rule doesn't run here) | P1 |
| E3a | `        const best = chooseRelevantGame(sourceThought)` | → `        const best = EosRouteGame(sourceThought, played) \|\| chooseRelevantGame(sourceThought)` | P1 |
| E3b | `        return chooseRelevantGame(sourceThought, selected.id, selected)` | → `        return EosRouteGame(sourceThought, played, selected.id) \|\| chooseRelevantGame(sourceThought, selected.id, selected)` | P1 |
| E3c | `                                <div className="releaseChoiceGroupLabel">\n                                    15 SIGNATURE RELEASES` | insert before: `<EosMenuGroup onPick={startChosenGame} played={played} />` (shown only when an emotion is set: "MADE FOR ANGER") | P2 |
| E4a | `            setVariationSeed((v) => v + 1)\n            setStage("play")` | insert `            EosMarkLaunch(g, e)` between the two lines (records game, entries count, startedAt) | P1 |
| E4b | `                                    <div className="releaseShiftCheck">` | insert before: `<EosShiftMeter eos={eos} game={selected} onDone={clearForNext} onNext={tryRecommendedRelease} onAgain={replay} setReleaseCheck={setReleaseCheck} sfx={sfx} rainSfx={rainSfx} reduced={!!reduced} />`; CSS hides `.releaseShiftCheck` and `.releaseCompleteActions` when `.eosShiftMeter` exists (`.releaseCompleteCard:has(.eosShiftMeter) …{display:none}`) | P1 |
| E5 | `                    {stage === "reveal" && selected ? (` | insert before: `{stage === "play" && selected ? (<EosPlayLayer key={\`${selected.id}-${variationSeed}-${materialRevision}\`} game={selected} entries={renderedEntries} hostRef={gameHostRef} reduced={!!reduced} raw={raw} eos={eos} />) : null}` | **P0** |
| E6 | `            </style>\n\n            <div className="ambient a1" />` | → `            </style>\n            <style>{EOS_GLOBAL_CSS}</style>\n            <EosThoughtFlow stage={stage} reduced={!!reduced} />\n\n            <div className="ambient a1" />` | **P0** |
| E9a | legacy guide card: ``                        key={`guide-${p.game.id}-${guideText}`}`` … `                        <small>{guideParts.label}</small>` (4 lines) | insert `<i className="guideActionArrow" aria-hidden="true">{eosGlyph(p.game)}</i>` before `<small>` | **P0** |
| E9b | `                        {Number(p.game?.id \|\| 0) < 100 ? (` | → `                        {true ? (`; in the next lines replace `{guideGesture.arrow \|\| "↑"}` with `{eosGlyph(p.game)}` | **P0** |
| E10 | `    if (!UNIQUE_HERO_IDS.has(p.game.id)) return <UniqueReleaseEngine {...p} />` | insert before: `    { const E = EosEngineFor(p.game); if (E) return <E {...p} /> }` | P2 |
| E11 | `            102, 103, 104, 106, 107, 109,\n        ].includes(game.id) \|\|` | → `…109,\n        ].includes(game.id) \|\| game.id >= 111 \|\|` | P2 |
| E12 | `` `${engineBubbleTextPx}px`, `` (99 ECHO inline `!important`) | → `` `${Math.max(15, engineBubbleTextPx)}px`, `` | P0 |
| E13 (P3) | the hold buttons in `case 11/13/39/65` (UniqueReleaseEngineLegacy) | add `onPointerLeave`/`onPointerCancel` = the existing `onPointerUp` handler; widen the 11 window to 55-92 | P3 |
| E14 (P3) | the "MORE RELEASES" map in the menu (L22641 area) | filter out `EOS_VAULT`, then render the vault group last under the label `CLASSIC VAULT` (all items still `button.releaseChoiceItem`, visible) | P3 |

`99_pixar.jsx` (our own file):
- **X1** (P0): the `tsPxDust` keyframe replacement and spawn `top` change (§C3).
- **X2** (P1): add `".eosObj", ".eosCheckOrb", ".eosCompanion",` before `    ".sortCard",\n].join(",")` in `PX_SQUASH_TARGETS`.
- **X3** (P2, optional): props `crisisUrl` and `shareUrl` pass through to the arcade.

**Total:** 15 arcade edits (6 at P0/P1 for the user's direct asks) plus 2-3 in our Pixar file. Everything else lives in new modules.

### I3. Sequencing (each step ships on its own)
1. **P0 · "Readable, guided, gathered"** (the user's explicit asks): `00_core`, `10_css` (typography, arrows, flow, A7), `20_flow`, `30_arrows`, `40_play_layer` (arrows only); edits E5, E6, E9a/b, E12, X1.
   **Accept when:**
   - every game shows an arrow on its live target within 1.5 s;
   - no text in `.releaseStage` is under 12 px at 1280 or 390;
   - all visible dots flow into the centre;
   - `drive.mjs` still works.
2. **P1 · "Emotion-first"**: `50_checkin`, `55_router`, `60_shift`, `80_safety`, companion; edits E1, E2, E2b, E3a/b, E4a/b, X2.
   **Accept when:**
   - PANIC → RELEASE launches a panic-path game;
   - "i am panicking" is detected;
   - the reveal shows the before→after count-down;
   - the safety text shows the card without blocking `.releaseChoiceButton`.
3. **P2 · "New scenes"**: registry + 111 BIG SIGH, 112 VOLCANO, 113 LANTERN HUNT, 115 KIND ECHO, then 116 and 119; E0, E10, E11, E3c; `70_rewards`.
4. **P3**: 114, 117 and 118; Orb Shelf polish; share card; vault menu (E14); hold-handler fixes (E13); dedupe repeated words for short inputs (fill with the emotion's starter words instead of cycling "I / am / … / I").

### I4. Test plan (Playwright, `dev/`; never run `playwright install`)
- `eos_arrows.mjs`: for each of 119 games, `startGame(name)`, wait 1.5 s, then assert:
  - `.eosArrowLayer` is visible;
  - the hand hotspot is within 24 px of a rect matching the table's stage-0 selector (or `[data-eos-target]`);
  - after a real interaction, the arrow hides and reappears on stuck (wait 4 s).

  Wait games 66 and 80 expect `.verb-wait`.
- `eos_check_text.mjs`: the font floor (§B) at 1280×860 and 390×844.
- `eos_flow.mjs`:
  - sample `.eosLane::before` positions at t and t+2 s and assert the distance to the centre decreased;
  - `emulateMedia({reducedMotion:"reduce"})` → `animation-name: none`.
- `eos_checkin.mjs`:
  - click the PANIC orb, then LET'S SHIFT IT; assert `.stage-play` and the game id is in `EOS_ROUTES.panic`;
  - type "i am so angry" and assert the ANGER orb pulses;
  - finish HOT POTATO by dragging 6 potatoes, then assert `.eosShiftMeter` and the count-down.
- `eos_safety.mjs`: type a safety phrase, then assert `.eosSafetyCard[role=alert]` and that `.releaseChoiceButton` is still clickable.
- Regression: run the existing audits (`/tmp/audit_*/audit.mjs`) and compare the `playWorked` counts (must not drop), with no new page errors.
