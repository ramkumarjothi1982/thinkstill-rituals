# Hushmallow Mallow production profiles (Phase 2 input)

These profiles come from reading the approved app (read-only): `registry.js`, `expressions.js`, `reactions.js`, `rig.js`, `particles.js`, `voices.js`, `shapes.js`, `src/world/realm.js` plus all 7 realm files, and `src/engine/audio.js`. I also looked at the approved art and at the studio's v2 code (`stage2/face.js`, `stage2/renderer.js`, `audio/soundtrack.mjs`). Nothing was modified.

**Units:**
- Rig coordinates are in each Mallow's own 439 px app sprite pixels (`assets/mallows/<id>.png`).
- "Energy" is given as two numbers: the registry value, then the personality multiplier from `expressions.js`.
- Realm mood has four axes (agitation, heaviness, clarity, warmth) plus a transform value `p` from 0 to 1. Realms respond to taps and story beats with six "pulse" types: tap, ripple, success, burst, strike, clear.

## Findings that block reusing the app rig on hi-res art

1. **The 439 px app sprites are not uniformly scaled copies of the 1254 px approved art.** I measured the opaque body bounding box of each and compared the width and height ratios:

   | Mallow | kx | ky |
   |---|---|---|
   | glitzi | 2.90 | 2.75 |
   | blubi | 2.76 | 2.67 |
   | zuzu | 3.19 | 2.93 |
   | boppo | 3.18 | 3.02 |
   | pipzi | 2.77 | 2.73 |
   | loomi | 3.24 | 2.79 |
   | noomi | 2.69 | 2.60 (v2 used about 2.70) |

   The app sprites are taller and narrower than the hi-res art. Registry face coordinates therefore cannot simply be multiplied up. Every Mallow needs its own measurement on the hi-res art, the way `tools/derive_noomi_hires.py` did it for Noomi.

2. **Loomi's two approved versions differ.** The 439 px app art has two stacked closed lines per eye: the eye line plus a U-shaped "upper-lid" line, which the registry stores as brows (alpha 1). The 1254 px hi-res art has only one line per eye and no brows. The owner must decide which is canonical before any Loomi video.

3. **Glitzi's glitch-line rows were measured on the 439 px art.** `GLITCH_ROWS` = [61, 111, 122, 177, 215, 242, 269, 281, 329] in `rig.js`. The hi-res art's streak layout is different, so the rows must be measured again.

4. **Three app iris sprites are recoloured copies of Boppo's 439 px iris.** `iris-navy` (used by Noomi, Blubi and Loomi when their eyes open) and `iris-amber` (Glitzi) both come from Boppo's iris. At video size they would be upscaled, which breaks the no-upscaling rule. Options:
   - Use the procedural navy galaxy iris v2 already has (fits Noomi, Blubi, Loomi).
   - Cut Glitzi's own amber starburst iris from its hi-res art.
   - Cut Boppo's and Pipzi's own irises and Zuzu's spirals from the hi-res art (roughly 3× the 439 px sprites, so never upscaled).

---

## 1. GLITZI — "The Chaos Mallow" (id `glitzi`)

**Personality:** sarcastic, mischievous, glitchy, secretly lovable. Energy 0.85 / 0.9.

**Range and story roles**
- Deadpan side-eye comedian who "pretends not to care, very loudly".
- The app's feeling lines (`voices.js`) cast Glitzi for anger, fear, sadness, shame/cringe, envy and joy.
- Comedy comes from contrast: when happy, the glitch rises (1.1) with a skewed half-smile; sarcastic approval ("Order. Disgusting. I love it.").
- Its tender beat: sadness turns the glitch almost off (0.1) and the eyes go big and wet (irisScale 1.12, wet 1). "Even my glitches went quiet."
- Suits: the inner critic or narrator, "me pretending I'm fine", irritation, Monday or meeting brain, jealousy, cringe replay, "when someone says calm down", and the secretly-soft reveal.
- Strong duo foil for Loomi (chaos vs. unbothered).

**Colours**
- Body #2a1a6e (deep indigo with starfield speckle).
- Glow #3ee8ff (cyan), accent #ff3df2 (magenta), ink #0b0e33.
- Face line #0a0d2e with a blue highlight rgba(120,150,255,.25).
- Cheeks magenta #ff3df2, base 0: no painted blush, it only appears with emotion.
- Mouth inside #140820, tongue #d4406f.

**Face rig (eyeStyle `glitzi`)**
- **Eyes open at rest.** They sit under heavy, puffy, body-textured lids that are painted into the art. Neutral values:
  - lidTop 0.4, lidSlant −0.12
  - side-eye up and to the right: lookX 0.55, lookY −0.35
- **Eyes are asymmetric.** L (126, 218) rx 54 ry 40; R (258, 210) rx 54 ry 42.
- **Iris and sclera.** Iris is `iris-amber`, r 22, offsets [10,−4] and [14,−8]. Sclera shades lavender (#efe9f6 to #b9add8). Lash or lid line is heavier (lw×1.1), with a neon lid rim rgba(120,200,255,.25).
- **Brows** are hidden at rest (alpha 0). They appear only through browAlpha in anger, frustration or offence: dark ink #05061c tubes lw 15 with a neon-cyan highlight.
- **Mouth** style `crease`: a carved frown groove (x 198, y 281, w 148, sag 15, lw 7) with a lit ridge above. It opens to a normal mouth only when mouthOpen is above about 0.
- **Neutral:** mouthSmile −0.75, glitch 0.6, blush 0.
- **Special system: glitch.**
  - Painted streak rows brighten, drift and stretch in a cyan→white→magenta gradient when glitch is above 0.55, and dim to #1b1452 when it is below.
  - Glitch bursts shift 3–5 horizontal body slices sideways. They trigger only when glitch is above 0.8, at most a couple per second, "never strobing".
  - Particle remaps: fxSpark spawns shards; fxHeart spawns pixel hearts.

**Expression overrides**
- happy: glitch 1.1, skewed half-smile, lidTop 0.15, shards 0.7
- excited / surprised: glitch 1.4
- angry: glitch 2, browTilt −1.5, steam 0.3
- frustrated: glitch 1.5
- sad: glitch 0.1, big wet eyes
- lonely: glitch 0.15, looks away
- calm: glitch 0.08, lidTop 0.6
- playful: tongue 0.9
- loved: heartEyes 0.7
- embarrassed: lookX 0.9
- proud: lidTop 0.38
- scared

**Reactions**
- tap: glitch, eye-roll up and to the left, 6 shards, buzz haptic
- doubleTap: 16 shards + a pixel heart
- flick: furious, glitch 2
- release: smirk
- idle: eye-roll, 2 shards
- glitchBurst (unique to Glitzi): 14 shards
- celebrate: 14 shards + 3 pixel hearts, heartEyes 0.6
- squeezeFace: annoyed, glitch 1.8

**Signature particles**
- Shards: thin horizontal additive bars in #3ee8ff, #ff3df2, #ffffff and #7a5cff, with fast drag.
- Pixel hearts: a 7×6 pixel heart in #ff3df2.

**Realm: The Static Storm** — "Where scrambled feelings crackle until they find their pattern."
- **Time of day:** night storm. Clarity raises a dawn glow on the horizon.
- **Palette:** deep #05061f, sky #0b0e33, mid #17135c, horizon #2e1f74, cyan #3ee8ff, magenta #ff3df2, violet #6b4dff, warm #ffb37a, gold #ffd98a.
- **Set pieces:**
  - A mammatus thunderhead deck seen from below: round pouches rim-lit cyan and magenta.
  - Shafts of fractured light whose slices slip out of line.
  - Five corrupted constellations (hex, star6, diamond, penta, crown) whose lines split and misalign.
  - A cracked-glass floor glowing like a spider web, radiating from under the Mallow.
  - A distant crystal range, and chunky crystal clusters framing the stage left and right.
  - Drifting light shards, digital lightning, glitch bands that displace slices of the world, a scanline sweep, and a stage halo that lifts the dark Mallow off the night.
- **Mood response:**
  - Agitation: more lightning and cloud flicker, a magenta tension glow.
  - Heaviness: lowers the clouds.
  - Clarity: snaps constellations into clean geometry, realigns the light shafts, heals the floor into a golden mandala and warms the cloud rims.
  - Transform: clouds lift and thin.
- **Pulses:** strike draws a lightning bolt (the reduced-motion version is a soft ring). clear sends golden rings and snaps the nearest constellation.

**v2 translation — cost HIGH**
- Sky gradient and stratus clouds can be recoloured to cyan/magenta rims over #17135c. Use no moon, or turn the moon into a hidden cloud glow.
- Replace the lake with a dark glass floor. The v2 reflection and fresnel still work. Add an emissive crack-ray shader that cross-fades to a gold mandala on the "clear" beat.
- New work:
  - mammatus fbm pouch shader
  - constellation line layer
  - crystal silhouette sprites
  - shard particles
  - horizontal row displacement (post-process plus soft-body mesh row shear for Glitzi's bursts)
- **Brand rule:** lightning bolts and flicker must be dropped. Use only the slow cloud glows. Glitch displacement must not change brightness.
- **Lighting:** the body is very dark, so a strong cyan rim and a stage halo are mandatory.

**Voice (tone: dry, teasing, warm underneath)**
- "Oh. You again. …Good. I was getting bored of being mysterious."
- "Static check: you look like you carried something heavy in here."
- "Go on. I'm pretending not to care, very loudly."
- "Hey. That sounds rough. Even my glitches went quiet."
- "Look at that. Order. Disgusting. I love it."
- "Okay, that was actually cool. Don't tell anyone I said so."
- "I'll keep the static low. You rest."
- Feeling lines:
  - anger: "Ugh. Say no more. Actually, say more. Loudly."
  - shame: "Cringe is just static with a spotlight on it…"
  - envy: "Jealousy, huh? Rude feeling. Very human."
  - joy: "Is that… a good mood? Don't make it weird. (Make it a bit weird.)"

**Audio kit**
- Root Bb4 (466.16 Hz), minor pentatonic [0,3,5,7,10]. Speed 0.85. Reverb send 0.06, the driest kit.
- Timbres:
  - note: bit-crushed triangle chirp with a small up-glide
  - stutter: rapid 2–3 note repeats
  - glide: staircase square-wave glide through a resonant lowpass
  - air: regular crackle grains
  - accent: FM zap
- Special gestures: tap (stutter), surprise (FM sweep + stutter), offended (stutter + falling staircase + zap), celebrate (crushed run + stutter + zap), idle, splash.
- **Realm bed:**
  - Continuous: brown-noise rumble with a slow filter LFO, a band-passed hiss swell, a pair of detuned 55 Hz square drones (grows with heaviness), a warm 110 Hz sine (grows with warmth).
  - Events: crushed chirps (more with agitation), 3.6 s low thunder swells (fewer as clarity rises), soft celesta bells at 932 Hz (more with clarity).

---

## 2. BLUBI — "The Softie" (id `blubi`)

**Personality:** sensitive, comforting, sweet, beautifully dramatic. Energy 0.55 / 0.75.

**Range and story roles**
- The app casts Blubi for sadness, loneliness, shame, fear and joy ("happy tears").
- Big feelings shown big:
  - sad: droop 1, tears 0.95, rain cloud 0.5, trembling mouth
  - angry is "hurt-angry": wobbly pout, wet eyes, puffed cheeks, never fierce
  - jealous: pouts and looks away
  - happy: blush 1.9, bounce, eyes stay closed in ^^ arcs
- Suits: comfort reels, "when someone is nice to me", crying at ads, after a long week, homesick, overwhelm, being moved, gentle hold-it-together moments, and the "comforter" role opposite another Mallow.

**Colours**
- Body #0b8ff0, glow #7fd4ff, accent #ff8ef2, ink #050a3a.
- Line #050a3a with highlight rgba(140,200,255,.38).
- Cheeks #ff7ef0, painted (base 1).
- Mouth inside #2a0a3a, tongue #ff6f9c.

**Face rig (eyeStyle `closed`)**
- Closed glossy-tube eye arcs that sag into a relaxed ‿ shape (closedCurve 1). Happy flips them to ^^.
  - L (138.5, 243.8), hw 43.5, sag 19.5, **tilt 3.7** (inner corner lower), lw 12
  - R (287.5, 244.4), sag 20.3, tilt 3.8
- Opening eyes: `iris-navy` (r 23, socket r 34), behind an eye gate of [0.38, 0.85]. Eyes open only for strong eye-opening emotions.
- **Brows are painted and always visible** (alpha 1): ∩ arches, lw 12.
- Mouth `line`: x 212.5, y 297.2, w 85, sag 19.5, lw 12.
- Neutral: eyeOpen 0, closedCurve 1, mouthSmile 1.

**Expression overrides**
- sad, happy, anxious (blinkRate 3), loved (blush 2.3, hearts 0.9), lonely (tears, shrink 0.45), comforted, angry (hurt-pout), jealous, frustrated.

**Reactions**
- tap: blush, ^^ squish + shear, 4 drops, soft haptic
- doubleTap: eyes pop open, 10 drops + 2 rings, splash sound
- flick: wounded, wet eyes, trembling pout
- idle: blush + wobble
- celebrate: 12 drops + 3 rings, happy tears 0.4
- squeezeFace: blush 2.4, ^^

**Signature particles**
- Droplets: glass-gradient drops with a white highlight.
- Flat water rings in glow #7fd4ff, aspect 0.28.
- Tears from the outer eye corners.
- Rain cloud above the head when sad (shared system; Blubi triggers it most).

**Realm: The Raindrop Lagoon** — "A soft lagoon where every tear hangs like glass, waiting to turn to light."
- **Time of day:** blue hour, wrapped in pink haze, with faint early stars. A gold glow comes in on transform.
- **Palette:** sky #081d5e → #0f3f9a → #2f86d8 → #8fd0f5 → pink haze #ffc4ec; pink #ff8ef2; water #0a3f8c → deep #041a4a, with a #ffd6f0 horizon band; gold #ffe1a8.
- **Set pieces:**
  - Stratus banks lit pink from below.
  - Two ridges of soft, pastel "cushion hills": lavender #a9b9f0/#d8c6f2 and #7f9ee0/#c2b4ee.
  - A mirror-still lagoon reflecting the hills, with drifting shimmer bands and twinkling glints.
  - About 38 hanging glass-bead raindrops (30% teardrop-shaped) that refract an upside-down horizon. They keep to the sides so the stage stays airy.
  - Tufted cushion lily pads in pink, blue, mint and lilac, with a little lotus.
  - A big cushion pad that Blubi stands on.
  - A pink reflection column under the stage, ripple rings, and real rain that leaves ring splashes.
- **Mood response:**
  - Heaviness: rain falls, the drops sag, a dim overlay.
  - Clarity and transform: every hanging drop floats up and turns into light.
  - Warmth: a pink/peach grade.
- **Pulses:** strike drops a single bright droplet that lands softly. clear sends a gold ring and rising motes.

**v2 translation — cost LOW-MEDIUM (closest to v2 after Moonmilk)**
- Keep the lake; recolour the sky and water. Turn the moon off or make it a faint pink glow column. Set stars to about 0.3.
- Hills must become soft pastel rounded shapes rather than dark silhouettes. That needs a hill-shape or gradient parameter.
- New elements:
  - glass beads, by reusing the frosted-glass bubble shader at small scale
  - lily-pad and cushion sprites with mirrored reflections
  - rain streaks that drive the existing `uRip[8]` ripple rings
  - bead-to-light transformation particles

**Voice (tone: tender, effusive, teary-happy)**
- "Oh! You came! I saved you the softest cushion."
- "Hi, hi. Whatever it is, we can hold it together."
- "I'm listening with my whole squishy heart."
- "Oh, that's a lot. Come here, let's go slowly."
- "You did that so gently. I'm going to cry. Happy tears!"
- "Rest here as long as you like. The rain can wait."
- Feeling lines:
  - sadness: "That's a heavy raindrop. We can hold it together."
  - loneliness: "You're not on your own right now. I'm right here, all squishy."
  - shame: "Oh no, that sting. Let's be extra gentle with you."

**Audio kit**
- Root F5 (698.46 Hz), major pentatonic. Speed 1. Send 0.22.
- Timbres:
  - note: droplet plink
  - glide: sine with a bubbly, decaying vibrato (14–19 Hz)
  - air: brown-noise swell with scattered droplets
  - accent: high droplet
- Special gestures: splash (noise wash + 6 droplets), comfort (low glide + two droplets), idle.
- **Realm bed:**
  - Continuous: high-passed rain hiss (agitation), brown-noise lapping with a 0.12 Hz swell, an F3/C4 sine pad (warmth).
  - Events: F-pentatonic droplets at 0.5–2.7 per second, wobbly sine glides (heaviness).

---

## 3. ZUZU — "The Spiral" (id `zuzu`)

**Personality:** curious, hypnotic, playful, overthinking. Energy 0.75 / 0.85.

**Range and story roles**
- The app casts Zuzu for confusion and fear ("spinning thoughts").
- Spiral spin speed works as an on-screen thought meter:
  - calm 0.1, sad 0.06, exhausted 0.04
  - curious 0.8, confused 0.9 + jitter, anxious 1.3 + jitter, angry 1.6
  - happy 1.4 + rainbow hue, excited 2.2, surprised 2.6
- Suits:
  - "what-if" loops, 3 AM overthinking, replaying a conversation, decision paralysis
  - "looking at it upside down" reframes
  - curiosity and discovery, the playful "And then what?" interrogator
- Pairs naturally with Noomi (the night overthinker).

**Colours**
- Body #c414e6, glow #39f0ff, accent #ff6ad0, ink #3a0052.
- Line #3a0052 with highlight rgba(255,170,255,.3).
- Cheeks #ff8cf0 (base 1, painted with sparkles).
- Mouth inside #4f001d, tongue #ff6aa0.

**Face rig (eyeStyle `spiral`)**
- Big round cyan glossy spiral eyes, sprites `zuzu-spiral-L/R` (126 px in the app):
  - L (114.6, 180.5), R (263.9, 179.6), rx = ry 57, spriteR 60
- Spirals rotate with spinAngle, the left one forward and the right one reversed. Speed is (spin × 2.4 + jitter) rad/s.
- `spiralHue` adds an additive conic rainbow (#ff3df2, #ffe14d, #3dffb8, #3d8bff) at 0.32 alpha.
- Lids clip the spiral (lidTop and lidBot work).
- Brows hidden (alpha 0, lw 11).
- Mouth `open` at rest: x 188, y 262, w 117, sag 0, upper −10, depth 54.
- Neutral: eyeOpen 1, mouthSmile 0.9, mouthOpen 1, spin 0.25.
- heartEyes are suppressed in the loved override.

**Expression overrides**
- anxious, happy, excited, calm, confused, sad, angry, curious, exhausted, loved, surprised (all spin and hue values as listed above).

**Reactions**
- tap: spin 4 + hue, 2 rings
- doubleTap: spin 6, a full **body pirouette** (impulse spin), 4 rings + 6 stars
- flick: spin 5 + jitter, wavy mouth, tilt −12, "?" glyph
- idle: spin 1.6, head tilt 10
- celebrate: pirouette, 5 rings + 10 stars
- squeezeFace: spin 3

**Signature particles**
- Rings centred on the body and perfectly round, unlike everyone else's flat ground rings. Colour #39f0ff.
- White 4-point stars.

**Realm: The Spiral Observatory** — "A dome of looping thoughts, slowly turning into a galaxy you can read."
- **Time of day:** night interior with deep space beyond.
- **Palette:** void #07021a, deep #12052e, sky #1d0840, purple #c414e6, cyan #39f0ff, violet #7a3cff, pink #ff7ad9, gold #ffd27a, stone #2a0f52 / #4a1f86.
- **Set pieces:**
  - Inside a violet dome with a painted gold celestial chart and ribs. A vast spiral galaxy turns through the shutter slit.
  - Armillary rings orbit the galaxy, with beads travelling along them. Luminous ribbons orbit too.
  - A brass-and-glass telescope on the left, and a floating lens on the right that magnifies the stars.
  - A distant arcade rim with arched windows.
  - A tiled radial floor, and a stepped astrolabe dais with engraved glyph ticks and rotating glyph lamps.
  - Motes curl along the galaxy's spiral.
- **Mood response:**
  - Low clarity warps the spiral: ghost copies, breathing distortion, rings tangled on precessing tilted planes.
  - Clarity resolves it into one crisp galaxy with rings flat in its plane, and the dome shutters slide open onto the full starfield.
- **Pulses:** strike fires a telescope beam. clear sends a golden ring around the galaxy. Burst particles fling out in a spiral pattern.

**v2 translation — cost HIGH (biggest departure from the lake)**
- Replace the moon with a procedural log-spiral galaxy shader (ghosted when confused, crisp at the "clear" beat).
- Floor: polished stone, using the v2 reflection with low fresnel and no swell, plus emissive ring and glyph markings for the dais.
- The floating lens fits the existing glass-bubble refraction shader almost directly.
- Armillary rings and ribbons: an SDF line overlay.
- Dome, telescope and arcade: silhouette sprites. Shutter-open is a two-layer reveal.

**Voice (tone: bubbly, inquisitive, trance-y)**
- "Ooh, a visitor! Quick question: what if we looked at it from upside down?"
- "Hiii. My spirals are already spinning about you."
- "Mm-hm. And then what? And then what after that?"
- "Wobbly thoughts, huh? Let's slow the spin together."
- "Whoa. Did you see that perspective flip? Again again!"
- "Spirals slowing… slowing… there."
- Feeling lines:
  - confusion: "Ooh, a tangle! I love a tangle…"
  - fear: "Spinning thoughts? Let's slow the spiral and look properly."

**Audio kit**
- Root G4 (392 Hz), Hirajoshi-like scale [0,2,3,7,8] — the only exotic scale. Speed 1.15. Send 0.26.
- Timbres:
  - note: warbly triangle with vibrato
  - glide: glissando whoosh (sine + sub triangle + band noise)
  - air: phaser swirl
  - accent: dual detuning sine swell
- Special gestures: surprise, yawn, hop (warble), idle.
- **Realm bed:**
  - Continuous: detuned triangle pad (G2, D3, Bb3) through a 4-stage allpass phaser with an LFO; band-passed brown-noise "air" sweeping.
  - Events: slow 3 s vibrato glissandi, celesta bells at 784 Hz (clarity).

---

## 4. BOPPO — "The Sunshine" (id `boppo`)

**Personality:** joyful, optimistic, bouncy, adorably chaotic. Energy 1 / 1.15 — the highest.

**Range and story roles**
- The app casts Boppo for joy, pride and sadness.
- Joy: biggest hops (doubleTap hop 1.6), excited bounce rate 2.7, eyes scale up to 1.3 when surprised.
- Pathos is a strong contrast beat: when sad, the bounce stops, the glow goes off, sparkle drops to 0.4 and Boppo pouts. "Not every day is a bouncy day, and that's okay."
- Suits: small wins, gratitude, morning energy, "the plan worked", Friday, cheering someone on, the hype friend, and "even sunshine has grey days".

**Colours**
- Body #ff7a0a, glow #ffd23a, accent #ff5ed0, ink #3a0602.
- Line #3a0602 with highlight rgba(255,200,150,.3).
- Cheeks #ff5ed0 (base 1).
- Mouth inside #440000, tongue #c8364e.

**Face rig (eyeStyle `open`)**
- Painted dark galaxy irises with starburst highlights, cut from the art (sprites `boppo-iris-L/R`, about 72 px in the app):
  - L (115.1, 196.9), R (263.9, 193.9), rx 43 ry 46.8
  - irisR 33.5, offsets [6.6, 0.4] and [−9, −1] (slightly cross-eyed inward = cute)
- Blinks are visible: every 2.2–5.5 s, with an 18% chance of a double blink.
- Brows painted and visible (alpha 1), lw 15 / 14.5.
- Mouth `open` at rest: x 190.5, y 251, w 86, sag 12, upper 12, depth 36.
- Neutral: eyeOpen 1, mouthSmile 1, mouthOpen 0.45.

**Expression overrides**
- excited (bounce 1, rate 2.7, eyeScale 1.2), sad (pout 0.6, droop 0.8, glow 0, sparkle 0.4), surprised (eyeScale 1.3, round open mouth), happy (bounce 0.6), playful.

**Reactions**
- tap: hop 0.65, 6 pops
- doubleTap: hop 1.6, 16 pops + 6 stars
- flick: startled
- idle: small hop
- celebrate: hop 1.4, 18 pops + 8 stars
- squeezeFace: ^^ grin
- Landings throw up dust puffs whenever bounce is above 0.3.

**Signature particles**
- Golden "pops": additive radial orbs in #ffd23a, #ffb12a, #fff1a0 and #ff8a3d, thrown upward with gravity.
- Stars.

**Realm: The Sunpop Orchard** — "Floating islands of golden fruit that bounce whenever good things grow."
- **Time of day:** warm late afternoon under an apricot sky. The transform turns it to golden hour.
- **Palette:** sky #e85d78 → #ff7f6e → #ff9f72 → #ffc98a → horizon #ffe7ad; gold #ffd23a, orange #ff7a0a, sun #fff3c4, leaf #9fcf45 / #5f9a2e, rock #c8643a / #6a2a2a, cream #fff6e4; cloud sea #ffe2bd → #f7b4a4.
- **Set pieces:**
  - A soft breathing sun with sunbeams fanning out from it.
  - Far high cumulus and drifting mid-air cumulus.
  - A rolling **sea of clouds** below instead of water.
  - Floating islands: rocky cones with strata and dangling vines, grassy caps, round golden-fruit trees that sway.
  - A meadow island as the stage, with dappled shade, grass tufts and flowers.
  - Glowing fruit that bounces with squash and stretch and occasionally pops into a golden burst.
  - Pollen motes. A soft rainbow arcs behind the Mallow on transform.
- **Mood response:**
  - Joy: fruit bounces higher and pops.
  - Heaviness: greys the sky and stills the orchard.
  - Transform: everything ripens into golden hour, and the rainbow appears.
- **Pulses:** success pops the nearest fruit. strike lands a warm sunbeam column. clear sends a big ring.

**v2 translation — cost HIGH**
- No lake. The ground becomes a cloud-sea top surface (fbm billow, no reflection) plus a meadow-island stage sprite.
- The moon parameter becomes a soft sun (upper right). Stars 0. Clouds are cream/peach cumulus (the stratus model needs a billow variant). Use the v2 "shafts" for the sunbeams.
- New elements: island and fruit-tree sprites, bouncing fruit (sprites with squash), a rainbow arc shader.
- Lighting: switch to a daytime key light with higher ambient.
- **Contrast risk:** an orange body on an orange sky. The green meadow, contact shade and a cooler rim are needed.
- A cheap "golden-hour lake" fallback exists, but it is not faithful to the realm.

**Voice (tone: ALL-CAPS joy, self-correcting, supportive)**
- "YOU'RE HERE! Okay, okay, calm Boppo. …YOU'RE HERE!"
- "Hi sunshine! I mean, I'm the sunshine. Hi anyway!"
- "Tell me everything! I'm bouncing quietly. Mostly."
- "Oh no. Not every day is a bouncy day, and that's okay."
- "BOOP! You did it! Everything is golden!"
- "Soft bounce… softer… sleepy sunshine."
- Feeling lines:
  - joy: "That's golden. Let's squeeze every drop of good out of it."
  - pride: "Look at you! Proud Boppo noises!"
  - default: "Small bounce. Supportive bounce."

**Audio kit**
- Root E4 (329.63 Hz), major pentatonic. Speed 0.9. Send 0.12.
- Timbres:
  - note: springy triangle up-glide
  - glide: "boing" (triangle with delayed wobble vibrato + sub sine)
  - air: short noise whoosh
  - accent: bright soft pop
- Special gestures: hop, celebrate (boing run + pops), splash, idle.
- **Realm bed:**
  - Continuous: detuned E-major-ish pad (E3, G#3, B3, E4), swelling leaf rustle.
  - Events: bird-like chirp trills, soft pops, an occasional springy boing.

---

## 5. PIPZI — "The Spark" (id `pipzi`)

**Personality:** energetic, excitable, expressive, funny. Energy 1 / 1.1.

**Range and story roles**
- The app casts Pipzi for surprise, joy and anger ("Ooh, sparky! Let's aim those sparks somewhere useful.").
- The widest mouth (open 1 at rest, 1.1–1.2 in reactions) and the fastest celebrations (bounce rate 2.9).
- Anger and frustration come out as a puffed-cheek pout, not fury.
- Suits: "when you get the text", plot twists, new-idea bursts, hype reactions, reaction-cam comedy, "wait, say that again", and turning anger into motivation.
- Avoid labelling Pipzi as ADHD or anything clinical.
- Good duo with Loomi.

**Colours**
- Body #f2073b, glow #ffcf4a, accent #ffb0f0, ink #4a0610.
- Line #4a0610 with highlight rgba(255,160,170,.3).
- Cheeks #ffb0f0 (r 32, painted with sparkles).
- Mouth inside #4a0008, tongue #ff5f8a.

**Face rig (eyeStyle `open`, same pipeline as Boppo)**
- Painted galaxy irises `pipzi-iris-L/R` (82 px in the app):
  - L (130.9, 215.4) rx 52.6 ry 54.5; R (301.2, 214.6)
  - irisR 39, offsets [9.9, −0.8] and [−11.2, −0.4]
- Brows painted (alpha 1).
- Mouth `open`: x 218, y 289, w 118, sag 0, upper −14, depth 58.
- Neutral: eyeOpen 1, mouthSmile 0.9, mouthOpen 1.

**Expression overrides**
- happy (blush 2, sparks 0.7), angry and frustrated (pout + cheekPuff 1), excited (bounce rate 2.9, sparks 1), sad (pout 0.5), surprised (mouthOpen 1.1).

**Reactions**
- tap: 10 sparks
- doubleTap: 24 sparks + 4 ribbons
- flick: "!" glyph
- idle: sparkle eyes, 4 sparks
- celebrate: 30 sparks + 6 ribbons
- squeezeFace: grin, sparkle 2

**Signature particles**
- Sparks: additive 4-point stars with short trails and gravity, in #ffd84a, #ff7ae0, #7af0ff, #ffffff and #ff9a3d.
- Ribbons: wavy rising lines in glow, accent or white.
- "!" glyph.

**Realm: The Spark Festival** — "A night festival where every lantern waits for your spark."
- **Time of day:** warm night with a moon and stars.
- **Palette:** deep #0b0213, sky #1c0627, plum #34093f, berry #5a1150, magenta #8c1f5c, rose #c2416a, ember #ff8a5a, gold #ffcf4a, lantern #ff8a3d, red #f2073b, pink #ff5a9a, cream #fff1d6, violet #a77bff, mint #8ff0d2.
- **Set pieces:**
  - Rolling plum hills with distant tents and village lights, and horizon mist in the valley.
  - Sky wisps lit from below by the fair.
  - A slow Ferris wheel whose gondolas hang level, with a ticket booth.
  - A striped big top and a carousel (horses and poles) glowing from inside, plus a little booth.
  - Two tall festoon poles with pennants. Festoon strings of paper lanterns and glass bulbs sway between them.
  - Paper sky lanterns drift up. Soft round fireworks bloom far away.
  - Confetti, and a round wooden dais ringed with bulbs plus short lamp posts (the stage).
- **Mood response:**
  - Agitation: lanterns swing, sparks fizz, confetti swirls.
  - Heaviness: lanterns go unlit and the emptied fair drains of colour.
  - Clarity: clears haze and brings out stars. Warmth gilds everything.
  - Transform: lights every lantern one by one from left to right, releases the sky lanterns together, and crowns the sky with one slow golden bloom.
- **Photosensitivity rules built into the realm:** no full-screen flashes; fireworks rise over at least 0.45 s and fade over seconds; sky glow stays local; reduced motion replaces fireworks with a static glinting crown.

**v2 translation — cost MEDIUM-HIGH**
- Sky, moon and stars carry over directly after a plum recolour (zenith #0b0213, horizon #5a1150/#8c1f5c, haze #c2416a). Clouds become ember-lit wisps.
- Hills: plum silhouettes.
- Ground: grass crest + dais sprite (in the app realm the ground is a hill, not water). An optional reflecting pond would look superb with the lanterns, but it is not in the app realm and needs approval.
- New elements:
  - catenary lantern strings with glow sprites and sway
  - Ferris wheel sprite with slow rotation
  - tent and carousel silhouettes with warm interiors
  - sky lanterns, slow fireworks and spark particles (the existing glow quads are fine)
  - confetti (new spinning-rectangle particle)

**Voice (tone: rapid, exclamatory, comic)**
- "Sparks! Lanterns! You! Best combination!"
- "Ooh, ooh, I have IDEAS. Do you have feelings? Let's do both."
- "Wait wait wait — say that again, I'm paying such good attention."
- "Hey. I can do quiet sparks too. Promise."
- "KAPOW! Okay that was the best thing I've seen all day."
- "Tiny sparks. Very tiny. Like… whisper sparks."
- Feeling lines:
  - surprise: "WAIT. Really?! Okay, okay, tell me more!"
  - joy: "Sparks everywhere! This is the best!"

**Audio kit**
- Root G5 (783.99 Hz) — the highest kit. Major pentatonic. Speed 0.7 — the fastest. Send 0.18.
- Timbres:
  - note: sparkly bell
  - glide: quick pentatonic bell up-run
  - air: fine crackle grains at 3.2 kHz
  - accent: celesta double-ping
- Special gestures: celebrate (fast bell arpeggio + crackle), surprise, success, idle.
- **Realm bed:**
  - Continuous: A-major triad triangle pad (A3, C#4, E4), crowd murmur (brown noise band-passed at 420 Hz with an LFO).
  - Events: spark bells at 880 Hz, distant fireworks (a 70→42 Hz thump + crackle).

---

## 6. LOOMI — "The Chill One" (id `loomi`)

**Personality:** calm, unbothered, gently amusing. Energy 0.4 / 0.55.

**Range and story roles**
- The app casts Loomi for fear ("let it float") and boredom ("Flat days happen. Let's drift…").
- Comedy is understatement:
  - angry: a flat slit eye (eyeOpen 0.42, lidTop 0.55) and a sideways mouth, no trembling
  - jealous: side-eye
  - frustrated: big sighs
  - happy: barely-there bounce 0.22
  - calm: float 0.65, breath 1.65
- Suits: "me vs. drama", Sunday reset, calm in chaos, letting it float, quiet pride ("quietly impressed"), boredom, slow-living or ASMR-style loops.
- The straight man to Glitzi or Pipzi.

**Colours**
- Body #1aa8f5, glow #a8f0ff, accent #ff7cf5, ink #02072e.
- Line #02072e with highlight rgba(160,220,255,.38).
- Cheeks #ff7cf5 (base 1).
- Mouth inside #1a0a3a, tongue #ff6f9c.

**Face rig (eyeStyle `closed`)**
- Closed relaxed ‿ arcs:
  - L (116.5, 229.25), hw 36.5, sag 16.3, tilt 0, lw 12
  - R (248.5, 228.5), hw 38.5, sag 17
- Opening eyes: `iris-navy` r 20, eye gate [0.45, 0.9].
- **Brows alpha 1, but they are U-shaped "second lid" lines** ([77,189]–[110,206]–[143,177]). They exist in the 439 px app art and are **absent from the 1254 px hi-res art** — owner decision needed.
- Mouth `line`: x 183, y 272.6, w 74, sag 16.3, lw 11.
- Neutral: eyeOpen 0, closedCurve 1, mouthSmile 1.

**Expression overrides**
- calm, anxious (eyes only to 0.72, light sweat), scared, happy, excited (bounce 0.5), angry, jealous, frustrated.

**Reactions**
- All slow (1.3–2.4 s), using lean impulses rather than hops.
- tap: ^^ + a single ring
- doubleTap: eyes open 0.9, float 1, 3 rings + 3 ribbons
- flick: just leans and smirks sideways
- idle: float
- celebrate: float + glow, 6 ribbons + 3 rings

**Signature particles**
- Ribbons: wavy rising lines in glow #a8f0ff, accent or white.
- Flat water rings.

**Realm: The Blue Drift** — "Quiet islands drifting over glass-still water. Nothing here is in a hurry."
- **Time of day:** bright, airy, high-key midday. Warmth moves it toward golden hour.
- **Palette:** zenith #2a8fd8, #48aae8, #76c6f1, #ade0f7, haze #daf3fc, horizon #f4fcff, sun #fffbea, gold #ffd596, ink #0d3e66, deep #1a6fb5, water #bdeefc.
- **Set pieces:**
  - A mirror reaching to a far white horizon.
  - Soft mossy islets, each crowned with one rounded tree, a balanced cairn, or smooth boulders, drifting by inches.
  - Far flat islets with a tiny tree.
  - Brushed cirrus and very slow lenticular cloud streaks. Everything is reflected.
  - Sun glitter, seed fluffs, a few birds, cat's-paw gusts darkening the water.
  - A smooth flat river stone that Loomi sits on (with its own reflection and moss), sending quiet rings out now and then.
- **Mood response:**
  - Agitation: wind chop slices the mirror; gusts; faster drift.
  - Heaviness: an overcast grey-blue deck, dimmer sun.
  - Clarity: sharper mirror, horizon and glints.
  - Transform: islands settle into a harmonious arrangement over a flawless mirror under a haloed sun, with light motes rising.
- **Pulses:** strike lands a soft shaft of sunlight (explicitly no lightning). clear brings a breeze from the horizon that leaves the water glass-smooth.

**v2 translation — cost MEDIUM**
- The v2 lake and reflection are exactly right: set agitation to 0 for a perfect mirror; chop already exists for the windy beats.
- The moon becomes the sun (with a halo at transform). Stars 0. Clouds become white lenticular streaks with lavender undersides. Moon glitter becomes sun glitter.
- New elements: islet sprites with reflections (replacing the single hill silhouette), the river-stone stage sprite, seed fluffs and birds (particles), and a daytime key light.
- **Contrast risk:** a blue body on blue sky and water. Use golden-hour warmth, a darker foreground band of water, or a strong rim light.

**Voice (tone: low-key, slow, dry warmth)**
- "Oh, hey. No rush. The water's nice."
- "Hi. I saved you a slow minute."
- "Mm. Take your time. I have all of it."
- "That sounds heavy. Let's let it float a bit."
- "Nice. Very nice. Quietly impressed over here."
- "Drifting is a valid plan."
- Feeling line, fear: "No rush. The water's calm here."

**Audio kit**
- Root G3 (196 Hz) — the lowest kit. Major pentatonic. Speed 1.6 — the slowest. Send 0.36 — the wettest.
- Timbres:
  - note: soft sine + octave triangle
  - glide: swelling sine
  - air: breathy band-noise whoosh
  - accent: low bell with a 2 s ring
- Special gestures: comfort (warm pad + bell), sigh, celebrate (slow bells + pad), idle.
- **Realm bed:**
  - Continuous: a beating C2 sine drone pair + a G2 fifth, a G3/D4 low-passed pad, breathing wind.
  - Events: low bells, slow wind swells.

---

## 7. NOOMI — "The Dreamer" (id `noomi`) — Phase 1 star

**Personality:** sleepy, soothing, whimsical, dreamy. Energy 0.35 / 0.5 — the lowest.

**Range and story roles**
- The app casts Noomi for boredom ("Low and foggy? Let's get cosy about it.") and sadness ("wrap that in a cloud").
- Range:
  - exhausted: yawns 1.3, Zzz 0.9
  - bored: yawns
  - happy: floats
  - excited and surprised: eyes pop wide (1.3–1.35)
  - angry is "grumpy-sleepy, woken up cross": slit eyes, pout, puffed cheeks, steam
- Suits: 2 AM brain (proven in v2), insomnia, "5 more minutes", bedtime wind-down, rest, exhaustion, gentle comfort, dreamy wonder.

**Colours**
- Body #8fd0ff, glow #fff4c8, accent #ff7ff0, ink #0a1450.
- Line #0a1450 with highlight rgba(170,200,255,.42).
- Cheeks #ff7ff0 (r 34).
- Mouth inside #1a0a3a, tongue #ff6f9c.

**Face rig (eyeStyle `closed`)**
- Closed ‿ arcs:
  - L (141, 226), hw 44, sag 18, lw 13
  - R (301.5, 226.2), hw 44.5, sag 18.7
- Opening eyes: navy iris r 24, eye gate [0.5, 0.95].
- Brows hidden at rest (alpha 0); expression-only.
- Mouth `line`: x 219.5, y 283.7, w 87, sag 19.4, lw 13.
- Neutral: eyeOpen 0, closedCurve 1, mouthSmile 1.
- **Already built at hi-res in v2:** `stage2/noomi-face-measured.json` (spec in hi-res art pixels, k about 2.70) and `assets/noomi/*` (face-cleaned art, normal and height maps).

**Expression overrides**
- exhausted, excited, surprised, sad (eyes 0.08, trembling mouth, tears 0.7), calm (float 0.5, Zzz 0.15), happy, bored, angry, jealous, frustrated.

**Reactions**
- tap: peeks (eyeOpen 0.55), 4 moon-stars + a "z"
- doubleTap: wide awake, brows up, 12 moon-stars + "!"
- flick: grumpy, 2 "z"
- idle: snoozing, mouth "o", a "z"
- celebrate: eyes open, glow, float, 16 moon-stars + 2 clouds

**Signature particles**
- Moon-stars: cream #fff3c4 twinkling 4-point stars.
- "z" glyphs.
- Cream cloud puffs.

**Realm: The Moonmilk Cove** — "A sleepy cove under a milky moon, where dreams wash gently ashore."
- **Time of day:** night under a huge milky moon.
- **Palette:** #07061f, #110e3c, #1f1a58, #332a76, #5a4a9e, haze #9a84d2, horizon #dcc6ee; milk #fff4c8, moon #fffaf0, blue #8fd0ff, lavender #b9a6ff, pink #ffc4ec, peach #ffcfa8, mint #c4f7e6, foam #f4f0ff, sand #cbbde8, ink #15123d.
- **Set pieces:**
  - The moon has creamy maria, a lavender limb and a wide breathing halo.
  - About 120 twinkling stars, a milky band of dream dust, low lavender cloud banks, and restless scud that gathers only when agitated.
  - A far tall headland with a cliff, a tiny lighthouse turning its soft beam very slowly, and a cottage. A low distant isle and rock stacks.
  - A shimmering moon path with glints across calm lavender water; lazy wavelets.
  - A pearly crescent shore with wet sand and milky lacy foam, pearl dust, smooth moonlit boulders, glowing shells and pearls.
  - Foreground dunes with swaying grass and seed heads.
  - Dream bubbles drifting up, and dream fireflies.
- **Mood response:**
  - Agitation: busier waves, clouds hurrying across the moon.
  - Heaviness: mist, a dimmer moon, fewer stars.
  - Clarity: crisp stars and moon path. Warmth: a peach/lavender glow.
  - Transform: the tide stills to a mirror, a moonmilk aurora ribbon unfurls, more stars come out, bubbles rise.
- **Pulses:** strike sends a gliding falling star (never a flash). burst pops nearby bubbles into sparkles.

**v2 translation — cost LOW**
- v2 is already essentially this realm: moon, halo, stars, stratus, still lake with moon column and glitter, glass bubbles. The v2 palette (zenith #05071c, horizon #4a3f8e, halo #a59cff) is within a few percent of the realm's.
- Optional additions for variety:
  - lavender water tint
  - headland silhouette with a lighthouse beam cone
  - foreground pearly shore and foam band
  - shells and pearls (glow sprites)
  - fireflies (existing particles)
  - an aurora ribbon shader for the transform beat
  - mist via the haze parameter

**Voice (tone: hushed, drowsy, affectionate)**
- "Mmh… oh, hello. I was dreaming you'd visit."
- "Shh, the stars are napping. Come sit."
- "I'm awake. Mostly. Tell me softly."
- "Oh, sweet thing. Let's wrap that in a cloud for a moment."
- "Oh! *eyes open* …that was lovely. *eyes close*"
- "Moonmilk and slow breaths. Stay as long as you like."

**Audio kit**
- Root C5 (523.25 Hz), major pentatonic. Speed 1.3. Send 0.34.
- Timbres:
  - note: music-box bell
  - glide: airy hum (half-octave sine with vibrato + soft noise)
  - air: soft noise swell
  - accent: celesta double-ping
- Special gestures: yawn (formant-like noise sweep + falling sines), tap, celebrate (5-note music-box run), idle.
- **Realm bed:**
  - Continuous: brown-noise waves with a 0.07 Hz swell, a C-E-G sine hum with vibrato.
  - Events: music-box notes or a C-E-G phrase, a slow G3→F3 sigh glide.
- Already used in v2. The studio's `audio/soundtrack.mjs` fetches `audio.js` as text and adds one export line in memory, so **all 7 kits and all 7 realm beds are available today just by passing a different mallowId or realmId**, with no porting.

---

## Comparison tables

**Character and face**

| Mallow | Title | Energy (reg / pers) | Body / glow / accent / ink | Eye style | Brows at rest | Mouth at rest | Eye gate | Signature fx | Feeling families in the app |
|---|---|---|---|---|---|---|---|---|---|
| Glitzi | Chaos | .85 / .90 | #2a1a6e / #3ee8ff / #ff3df2 / #0b0e33 | glitzi: open, heavy lids, amber iris, side-eye | hidden (neon-rim ink) | crease frown | none | shards, pixel hearts | anger, fear, sadness, shame, envy, joy |
| Blubi | Softie | .55 / .75 | #0b8ff0 / #7fd4ff / #ff8ef2 / #050a3a | closed ‿, tilted | **visible ∩** | line smile | .38–.85 | droplets, flat rings, tears | sadness, loneliness, shame, fear, joy |
| Zuzu | Spiral | .75 / .85 | #c414e6 / #39f0ff / #ff6ad0 / #3a0052 | spiral sprites, rotating | hidden | open grin | none | round rings, stars | confusion, fear |
| Boppo | Sunshine | 1.0 / 1.15 | #ff7a0a / #ffd23a / #ff5ed0 / #3a0602 | open, painted iris | visible | open smile (.45) | none | golden pops, stars, dust | joy, pride, sadness |
| Pipzi | Spark | 1.0 / 1.10 | #f2073b / #ffcf4a / #ffb0f0 / #4a0610 | open, painted iris | visible | wide open (1.0) | none | trailed sparks, ribbons, "!" | surprise, joy, anger |
| Loomi | Chill | .40 / .55 | #1aa8f5 / #a8f0ff / #ff7cf5 / #02072e | closed ‿ | visible U lid-lines (app art only!) | line smile | .45–.90 | ribbons, flat rings | fear, boredom |
| Noomi | Dreamer | .35 / .50 | #8fd0ff / #fff4c8 / #ff7ff0 / #0a1450 | closed ‿ | hidden | line smile | .50–.95 | moon-stars, z, clouds | boredom, sadness |

**World and audio**

| Mallow | Realm | Time / light | Ground | v2 reuse | Main new world work | Audio root / scale / speed / send | Bed character |
|---|---|---|---|---|---|---|---|
| Glitzi | Static Storm | night storm → dawn | cracked glass floor | low | mammatus clouds, cracks→mandala, constellations, crystals, glitch rows; no lightning | Bb4 minor pent / .85 / .06 | rumble, hiss, 55 Hz beating drone, crushed chirps |
| Blubi | Raindrop Lagoon | blue hour, pink haze | lagoon (water) | high | pastel hills, glass beads, lily pads, rain | F5 major pent / 1.0 / .22 | rain hiss, lapping, droplets |
| Zuzu | Spiral Observatory | night interior | stone floor + dais | low | galaxy shader, rings, lens, dome, shutters | G4 Hirajoshi / 1.15 / .26 | phaser pad, glissandi, celesta |
| Boppo | Sunpop Orchard | apricot afternoon → golden | cloud sea + meadow island | low | sun beams, islands, fruit, rainbow, cloud sea | E4 major pent / .9 / .12 | warm pad, leaves, chirps, boings |
| Pipzi | Spark Festival | night, moon | hill + wooden dais | medium (sky) | lantern strings, wheel, tents, sky lanterns, fireworks, confetti | G5 major pent / .7 / .18 | A-major pad, crowd, bells, far fireworks |
| Loomi | Blue Drift | bright midday → golden | mirror lake + stone | high (water) | sun, islets, river stone, daytime light | G3 major pent / 1.6 / .36 | drones, wind, low bells |
| Noomi | Moonmilk Cove | night, huge moon | lake + pearly shore | ~done | optional shore, lighthouse, aurora | C5 major pent / 1.3 / .34 | waves, hum, music box |

## Which Mallows share face pipelines

**A. Closed glossy-tube pipeline: Noomi (done in v2), Blubi, Loomi**
- Same eye style (`closed`), same `line` mouth, same eye-gated opening with a navy iris, same tube stroke style. v2's `face.js` (`specFromDerived`) and `derive_noomi_hires.py` carry over almost unchanged.
- Per-Mallow work:
  - Generalise the derivation script to each Mallow's stroke count (Noomi 3; Blubi 5 because of the brows; Loomi 3 or 5 depending on the decision) and measure again.
  - Set ink and highlight colours.
  - Add eye tilt (Blubi 3.7).
  - Support **always-visible brows** (Blubi; Loomi's lid-lines). Today v2 brows are expression-only.
- The v2 procedural navy galaxy iris serves all three. This is the fastest group to bring to v2 quality.

**B. Open painted-iris pipeline: Boppo, Pipzi**
- Identical code; only the parameter values differ.
- Steps on the hi-res art:
  1. Remove painted brows, eye whites and irises, and the open mouth.
  2. Cut the hi-res irises (keeps the exact painted starburst galaxy).
  3. Redraw sclera and rim, iris sprite plus sparkle and heart overlays, lid line with lash, visible brows, and an open-at-rest mouth.
- New `face.js` features needed: open-at-rest mouth with upper and depth parameters plus per-Mallow inside and tongue colours; a visible blink system.

**C. Zuzu: group B mouth plus its own spiral eye**
- A rotating spiral layer clipped by the lid region, with L and R spinning opposite ways, plus the `spiralHue` conic overlay.
- At hi-res, keep the glossy rim and specular highlight static and rotate only the spiral (a rotating highlight reads wrong), or build the spiral procedurally.
- Cap the visible rotation speed and rely on motion blur. App values reach about 14 rad/s, which risks wagon-wheel strobing at 30 fps.

**D. Glitzi: unique pipeline**
- Painted heavy lids stay part of the body art (lidTop 0.4 at rest).
- Lavender-shaded sclera and its own amber iris.
- Crease mouth (groove + lit ridge).
- Brows that appear only with emotion.
- An emissive animated glitch-line layer in art space (rows measured again on hi-res) plus mesh row-shear glitch bursts.
- Magenta blush only with emotion.

**Shared by all four groups**
- Expression engine (27 presets, 10 stages, per-Mallow overrides, eye gate, energy scaling).
- Pristine approved-art cross-fade at rest (v2 `uPristine` / `uRest`).
- Cheek blush (screen blend) and blush lines, tears and sweat, tongue and pout, the ink + shadow + highlight tube style.

**Parameters v2 `face.js` lacks for the other six**
- browAsym, browCurve
- heartEyes, wet, tears, sweat
- mouthPout, tongue, mouthTremble, cheekPuff, blushLines
- glitch, spin, spinJitter, spiralHue
- Body parameters: bounce, droop, shrink, float, tremble, glitchBurst.
- Wink is already possible through the per-eye eyeOpenL / eyeOpenR.

## Production notes that apply to every Mallow

**Particles**
- v2 draws only soft round glow quads. Those already cover Boppo's pops, motes, sky lanterns and fireflies.
- Blubi's and Loomi's flat rings can use v2's water-ripple uniforms (`uRip[8]`).
- New shapes needed:
  - 4-point star (`drawStar`)
  - heart and pixel heart
  - glass droplet
  - shard bar
  - round ring (Zuzu)
  - ribbon
  - puff and cloud
  - confetti
  - glyphs z / ? / ! / ♪ — treat these as icons and drop the app's "!" scale wobble, to respect the "no bouncing or shaking text" rule.

**Brand and photosensitivity**
- Static Storm: no lightning bolts or flicker events.
- Glitzi glitch: displacement only, no brightness change, at most about 1–2 bursts per second.
- Fireworks: rise over at least 0.45 s and fade over seconds.
- Captions stay static while Boppo or Pipzi bounce.
- No clinical framing (Pipzi as ADHD, Blubi as depression).
- No breath-hold lines in any voice set ("slow breaths" is fine).

**Lighting**
- Daytime realms (Blue Drift, Sunpop) need a sun key light with higher ambient. The v2 moon-rim setup fits only the night realms.
- Dark Glitzi needs a stage halo and rim light.
- Blue-on-blue (Loomi) and orange-on-apricot (Boppo) need a deliberate contrast fix.

**Render time**
- The new set pieces add load to the world pass, which already costs about 1 s per frame.
- Bake static layers (sky, far props, silhouettes) to textures once per shot, as `realm.js` does. Animate only the moving elements.

**Story beats**
- Every realm already maps the mood axes plus transform `p` to visuals. Driving each video with agitation / heaviness / clarity / warmth / `p` tracks, plus the six pulse kinds, gives every Mallow consistent "problem → resolution" beats.
- The "clear" pulse and the transform are each realm's built-in payoff.

## Files

**App (read only)**
- /home/user/thinkstill-rituals/hushmallow/src/mallows/registry.js
- /home/user/thinkstill-rituals/hushmallow/src/mallows/expressions.js
- /home/user/thinkstill-rituals/hushmallow/src/mallows/reactions.js
- /home/user/thinkstill-rituals/hushmallow/src/mallows/rig.js
- /home/user/thinkstill-rituals/hushmallow/src/mallows/particles.js
- /home/user/thinkstill-rituals/hushmallow/src/mallows/voices.js
- /home/user/thinkstill-rituals/hushmallow/src/world/realm.js
- /home/user/thinkstill-rituals/hushmallow/src/world/realms/*.js
- /home/user/thinkstill-rituals/hushmallow/src/engine/audio.js
- /home/user/thinkstill-rituals/hushmallow/assets/source/hires/*.webp
- /home/user/thinkstill-rituals/hushmallow/assets/mallows/*.png
- /home/user/thinkstill-rituals/hushmallow/assets/rig/*.png

**Studio**
- /home/user/thinkstill-rituals/hushmallow-infinite-studio/stage2/face.js
- /home/user/thinkstill-rituals/hushmallow-infinite-studio/stage2/renderer.js
- /home/user/thinkstill-rituals/hushmallow-infinite-studio/stage2/noomi-face-measured.json
- /home/user/thinkstill-rituals/hushmallow-infinite-studio/tools/derive_noomi_hires.py
- /home/user/thinkstill-rituals/hushmallow-infinite-studio/audio/soundtrack.mjs

**Comparison images (scratch)**
- /tmp/claude-0/-home-user-thinkstill-rituals/408ed79f-c8dc-5aa7-9180-8647f2fe949e/scratchpad/hires_sheet.jpg
- /tmp/claude-0/-home-user-thinkstill-rituals/408ed79f-c8dc-5aa7-9180-8647f2fe949e/scratchpad/cmp.jpg (app vs. hi-res, all 7)
- /tmp/claude-0/-home-user-thinkstill-rituals/408ed79f-c8dc-5aa7-9180-8647f2fe949e/scratchpad/loomi_cmp.jpg (Loomi and Blubi, app vs. hi-res)