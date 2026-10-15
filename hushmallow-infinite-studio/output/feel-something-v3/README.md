# "Feel Something?" v3 — emotional-impact pass (for review, not approved)

Status: **waiting for the owner's decision.** Nothing has been merged, no batch has been started.
v1 (`claude/feel-something-sample`), v2 (`claude/feel-something-v2`), the approved soundtrack and `main`
are untouched; this work lives on `claude/feel-something-v3`.

## Files

| file | what |
| --- | --- |
| `feel-something-v3.mp4` | the master: 20 s, 1080 × 1920, 30 fps, H.264 High 4.2 + AAC, treatment T1 |
| `feel-something-v3.phone.mp4` | phone-size preview, 540 × 960 (what a feed shows on a phone) |
| `feel-something-v3.preview.mp4` | light 1080 × 1920 copy |
| `feel-something-v3.reduced-motion.mp4` | the reduced-motion cut (still framings, same story and sound) |
| `compare/side-by-side.mp4` | v2 and v3 at the same playhead, with v3's sound |
| `treatments/feel-something-v3.t2.mp4`, `.t3.mp4`, `score-t2.wav`, `score-t3.wav` | the two alternative musical treatments on the same picture |
| `score.wav` | the T1 score (mastered −16 LUFS, −2 dBTP) |
| `cues.json` | every story event with its time (what the score is written to) |
| `qa/` | verify.json (delivery gates), determinism, playback, character sizes, audio reviews, contact sheet, loop seam |

## What changed, and why it should feel different

v2 showed a beautiful world with small characters doing many things. v3 is built around one emotional
journey with the characters large, close and looking at you:

1. **Curiosity (0–2.5 s).** Frame 0 is Noomi's face filling the screen, eyes on the viewer, a small light —
   *your* feeling — by the lens. She glances at it, back at you, leans in. "Feeling something?"
2. **Vulnerability (2.5–5 s).** She touches the light and it melts into her: she feels it too. Her eyes fill,
   a tear rolls down each cheek, she looks down, then back up at you. The world dims and goes soft.
   "Whatever it is..."
3. **Connection (5–7.5 s).** Blubi hops in, sees her tear, tears up itself, and snuggles into her. "There's a
   Mallow for that." Blubi talks (its own voice), Noomi nods and smiles. "Talk it out." Loomi drifts down,
   anxious, and takes one big slow breath that Noomi — and the music — breathe with.
4. **Wonder (7.5–10 s).** The camera rises; four lights lift out of the lake and, one per beat, become Mallows
   that land on the others' heads: Pipzi's anger bursts into fireworks, lonely Glitzi is welcomed and winks,
   Zuzu's racing spirals slow to wonder.
5. **Joy (10–12.5 s).** Boppo lands on top on the downbeat: the pile is complete, the drop hits, the whole pile
   bounces with the music. "Feel what you feel."
6. **Belonging (12.5–15 s).** Close on the pile, everyone snuggles in and looks at you; one slow blink
   together; your light comes back and lands in front of them, and they all look at it fondly.
   "Meet your Mallows." Then the brand: logo, THINK EMOTION. THINK HUSHMALLOW., "Feel something?
   Hushmallow.", Noomi's wink, and the six fly back into the one light by the lens: frame 0.

How that was achieved: the six companions are now painted from the owner-supplied 1254 px art (registered
onto the app rig, so their real faces still act), shots were rebuilt around close-ups, there is one short
caption at a time, the world is quieter (fewer lanterns, softer background with depth of field), and every
Mallow has one readable transformation and one comforting act.

## The music

One signature theme, grown from the "hush-mal-low" logo motif (G E C': a fall of a third, then a leap of a
sixth), carried through harmony written for the journey: Am9 → Fmaj7 (a question), Dm9 → Fm6 (the borrowed
minor chord is the tear), C/E → Fmaj9 (warmth; the hug lands on it), a bass climbing one step per arrival
(Dm9 Em7 Fmaj7 G6sus), the drop on C, Am9 → Fmaj9 for belonging, home for the brand, and G6sus back into
Am9 so the loop never quite ends. The vulnerable bar is played behind the beat; the tears, the touch, the
hug and your light landing have their own sounds placed on the picture, not on the grid; there is a
half-beat breath before the drop.

| treatment | arrangement | best for |
| --- | --- | --- |
| **T1 dream-pop electronic** (in the master) | a wordless "Mallow voice" lead with ping-pong echoes, a slow dragging drone that circles the listener, supersaws that pump with the kick, sub bass with harmonics for phone speakers, claps and hats | social feeds: the most distinctive and the biggest payoff |
| T2 felt piano and strings | piano theme, string ensemble, choir, marimba ostinato, soft kick | warmth and nostalgia; the most "cinematic" |
| T3 hypnotic lullaby | music box and voice, a heavy swirling drone, a constant soft heartbeat, no drop | calm, absorbing, the most hypnotic; the smallest payoff |

**The honest limitation.** All three are synthesised in code (oscillators, filters, noise; no samples, no
paid or cloud service). That suits T1's electronic style well. Its limits: the "voice" is a formant synth,
not a singer; T2's piano and strings are modelled and will sound like a good synth piano and pad, not a
recorded ensemble; and no one has listened yet — I can't hear audio, so every judgement below about the
music is from measurements. Before any paid option, the free next steps would be: (1) your listening
notes and a revision pass; (2) permissively licensed sample libraries rendered offline (for example a
CC0 chamber-orchestra library or a CC-BY grand piano) — free, but it needs network access and a licence
review; open-source music models were ruled out because their released weights are non-commercial.

## Independent creative evaluation

Objective findings are measured. Subjective scores (1–5) are my own judgement as the maker — they are not
viewer data and are biased towards the work. **Emotional effectiveness is UNVERIFIED: no viewer has seen
v3.**

| criterion | objective findings | my subjective score (v2 → v3) | verified? |
| --- | --- | --- | --- |
| Emotional connection | Noomi looks into the lens for most of 0–5 s and 12.5–19 s; her face fills the screen at frame 0 (median height 1,206 px vs 651 px in v2) | 2 → 4 | **UNVERIFIED** |
| Character affection | median companion height 192 → 324 px (+69 %); frames with a companion ≥ 400 px tall 1 % → 28 %; companions on screen from 5 s (v2: 8 s); faces from 1254 px art | 2 → 4 | **UNVERIFIED** |
| Musical memorability | one theme stated 4 times plus the logo motif; 95 % of the music's pitched energy on the composed chord-scale; on a simulated phone speaker (mono, nothing below 300 Hz) every section keeps all but ≤ 2.7 dB and the theme stays on top | 2 → 3.5 (not heard) | **UNVERIFIED** |
| Hypnotic immersion | continuous camera, depth of field, a drone whose tuning drags and whose position circles; L/R correlation 0.85 (wide but mono-safe: −0.3 dB) | 3 → 3.5 | **UNVERIFIED** |
| Uplifting payoff | the drop at 10.0 s: dominant → tonic, a half-beat breath, joy section +3.7 dB over the wonder section (−15.4 vs −19.1 dBFS RMS); sunburst and the completed pile on the same frame | 2 → 4 | **UNVERIFIED** |
| Visual storytelling | one story beat per bar; one caption at a time (8 short lines, none overlapping); readable at 540 px wide (phone preview) | 3 → 4 | **UNVERIFIED** (sound-off comprehension untested) |
| First three seconds | face + eye contact + caption + the theme all start at frame 0; but the opening is soft (−19.6 dBFS RMS vs −15.4 at the drop) — a risk for feeds | 3 → 3.5 | **UNVERIFIED** |
| Desire to rewatch / explore | seamless loop (seam 40.8 dB PSNR, smoother than a normal frame step at 27.0 dB); the ending returns your light to the lens | 3 → 3.5 | **UNVERIFIED** |

### How to verify it (a small viewer test, no paid tools)

8–12 people from the target audience, each on their own phone, the video placed in a scrolling feed of
other shorts; T1/T2/T3 assigned blind. Record: whether they stop in the first 3 s; how many times it loops
before they move on; then ask them to retell the story with the sound off (one silent viewing), name the
feeling it gave them, name their favourite Mallow and why, and — ten minutes later — hum the tune.
Suggested bar for "it works": most stop within 3 s, most retell the tear → hug → pile story unprompted,
every Mallow is someone's favourite, and at least a third can hum the opening phrase.

## QA (on the delivered files)

See `qa/verify.json` and the review page. Delivery, decode, audio, loop and flash gates pass on the master;
the reduced-motion cut (still framings, no tremble, shorter journeys, smaller acting) has 48 % of the
full cut's mean frame-to-frame change and 44 % at the 95th percentile, with no camera movement (gate:
≤ 50 % or ≤ 60 %); real browser playback on an emulated phone passes;
the determinism check (7 frames, two fresh pages, opposite orders) is bit-identical after a fix to Noomi's
tears made in this pass (their streaks had outlived their frame). v2 frames re-render pixel-identical; the
approved soundtrack and the v1 score re-render byte-identical. Test suite: see `docs/TEST-STATUS.md`.

## Outstanding limitations

- **Not heard and not viewer-tested** (above).
- **Render time:** 26.5 min for the final (1,592 s; 2.65 s per frame, 2 workers, ~5 motion-blur samples), up
  from 21 min for v2: the hi-res faces are uploaded as larger textures and the camera moves more. Half-res
  previews take ~8 min.
- **Loomi's hi-res painting has a different resting face** from the rig's; v3 uses the rig's face on Loomi's
  hi-res body and never shows the painting's own face.
- **Glitzi, Blubi and Loomi's irises** still come from the shared app sprites (the painting hides them).
- **Groups are still medium-size** in the wide wonder and brand shots (median companion ~300 px); the big
  moments are the close-ups.
- **Captions:** all eight brand lines are kept, as the brief requires; on a phone that is still a lot of text
  for 20 s. Dropping "Talk it out." or merging lines would make it calmer if you allow it.
