# hushmallow Story-Template Library v1: 28 templates, the slot grammar and the on-brand rules

The library is written as data the generator can read, with a validator next to it. The validator passes: 0 errors and 1 warning. The warning is the word "INSTANTLY" in one T13 hook, which makes no claim, so I left it.
- `/home/user/thinkstill-rituals/hushmallow-infinite-studio/templates/story-library.json` holds the format, the beat clocks, the Mallow profiles, the building-block libraries, all 28 templates, the slot grammar, the variation rules and the medical/therapy flags.
- `/home/user/thinkstill-rituals/hushmallow-infinite-studio/templates/validate-library.mjs` is run with `node templates/validate-library.mjs`. It checks copy lengths, ALL CAPS hooks and bubble wrapping (2 lines of 17 characters or fewer). It also checks every reference, Mallow and realm against time of day, whether each listed Mallow has a gag and a ritual that fits every allowed duration, repeated copy anywhere in the library, and a scan for banned medical/therapy words.
- I tested it by inserting bad copy on purpose: an "anxiety" line, a breathing instruction, a lowercase hook, a "nervous system" claim, "2 AM" on an afternoon template, and a ritual too long for 10 s. It rejected every one.
- The library counts are 28 templates, 221 hooks, 336 thought lines, 84 resolutions, 19 gags, 25 metaphors, 17 rituals, 5 loop strategies, 5 cameras, 9 palette arcs and 14 score motifs.
- By tone, 19 templates are difficult feelings, 4 positive and 5 mixed.
- Only `hushmallow-infinite-studio/templates/` is new. It is not committed. `hushmallow/` is untouched.

---

## 1. Format and beat grammar (taken from the approved v2)

The format is 1080×1920, 30 fps, H.264 + AAC, mastered to −16 LUFS with peaks at −1.5 dBTP or lower. Durations are 10, 12, 15 or 20 s, with 15 s as the default.

**Fixed rules:**
- The gag always lands within the first second.
- The end card is anchored to the end of the video.
- Only the escalation and the ritual stretch or shrink with duration.
- Idle breathing repeats exactly D/k times per video, so the loop seam matches.
- Frames 0–0.17 s and the last 0.5 s show the untouched painted face.

| Beat | 10 s | 12 s | 15 s (= v2) | 20 s |
|---|---|---|---|---|
| Anticipation / gag starts / impact | .22/.36/.90 | .24/.38/.95 | .26/.40/.98 | .26/.40/.98 |
| Hook caption leaves | 2.0 | 2.3 | 2.72 | 2.9 |
| Lines 1/2/3 | 2.2/2.9/3.6 | 2.5/3.2/3.9 | 3.0/4.0/5.0 | 3.2/4.8/6.4 (+ line 4 at 8.0) |
| Peak → turn | 4.0–4.6 | 4.3–5.2 | 5.6–7.0 | 8.4–10.0 |
| Ritual window | 4.9–7.0 (2.1 s) | 5.4–8.7 (3.3 s) | 7.4–11.5 | 10.4–15.8 |
| Eyes open / resolution line / logo | 6.9/7.1/7.7 | 8.8/9.0/9.6 | 11.7/11.9/12.6 | 16.6/16.8/17.5 |
| Settle / card out / hook returns | 8.6/9.3/9.66 | 10.5/11.3/11.66 | 13.5/14.3/14.66 | 18.4/19.3/19.66 |

**Layout (from v2):**
- Mallow base at (540, 1300), drawn at 0.56 of the 1254 px art, so it is always shrunk, never enlarged.
- Hook caption at y 286, 76 px. It shrinks automatically to a 50 px floor so a 32-character line fits in 960 px; 22 characters or fewer keeps the full 76 px.
- Thought bubbles are 50 px text and orbit around (540, 600).
- Resolution line at y 262, 62 px.
- Logo card at y 488: the approved logo, untouched on its plate, plus "hushmallow.com".

**Safe zones:**
- Key text stays inside x 60–1020 and y 180–1250.
- Nothing important sits in the right-hand button rail (x > 900, y 700–1500).
- Nothing sits below y 1500.

## 2. Building blocks (reused across templates)

**Mallow profiles** (home realm and its times of day, energy, how each one plays a beat):

| Mallow | Realm and times of day | Energy | How it plays |
|---|---|---|---|
| noomi | moonmilk-cove: dusk, night, late night, pre-dawn | 0.35 | Sleepy. Eyes open only on big beats. Signature: G-JOLT / R-CLOUDWRAP. |
| glitzi | static-storm: night, late night, pre-dawn | 0.85 | Dry and deadpan, glitches when flustered. Ends on a smirk, never gushes. Signature: G-GLITCHSLIP / R-DEFRAG. |
| blubi | raindrop-lagoon: blue hour, dusk, rainy evening, night, misty morning | 0.55 | Beautifully dramatic, tears allowed. Signature: G-SPLASHSIT / R-RAINLIFT. |
| zuzu | spiral-observatory: any time | 0.75 | Spiral speed equals thought speed. Signature: G-SPINUP / R-SPIRALSLOW. |
| boppo | sunpop-orchard: morning, afternoon, golden | 1.0 | Bounces even when low. Signature: G-LAUNCH / R-SUNSOAK. |
| pipzi | spark-festival: dusk, night | 1.0 | Feelings come out as sparks. Signature: G-SPARKPOP / R-LANTERN. |
| loomi | blue-drift: morning, midday, afternoon, golden | 0.4 | Under-reacts; the comedy is the contrast. Signature: G-DEADPAN / R-DRIFT. |

**Gags.** All body-only, since Mallows have no limbs: squash, stretch, inflate, hop, lean, sway, rim ripple, shrink, slide. Every peak or impact lands by 1.0 s.
- **G-JOLT**, jolt & flump (the v2 hypnic jerk with a heavy jelly landing). High render cost.
- **G-FLOP**, pancake flop: height 0.62, width 1.35, slow "schlorp" back up.
- **G-DEFLATE**, slow leak.
- **G-DOUBLETAKE**, double take with a mini hop.
- **G-SINK**, sink to the cheeks. Water or cloud realms only (noomi, blubi, loomi, boppo). The mouth always stays above the line, so it never reads as underwater or breath-holding.
- **G-LAUNCH**, shoots up out of the top of frame and drops back. boppo, pipzi, zuzu, glitzi only. High cost.
- **G-CRINGE**, shrinks to 0.72 with a blush.
- **G-SCOOT**, "nope" scoot: three little sideways hops away from the thing.
- **G-JELLYFREEZE**, locks up, then quivers like set jelly.
- **G-PUFF**, balloon puff that floats.
- **G-MELT**, melts sideways like ice cream.
- **G-WEEBLE**, rocks side to side, never falls.
- **G-PING**, a glass notification bubble pops in and the body stretches tall.
- **G-DEADPAN**, does nothing, slow blink, one late boing.
- **G-BONK**, something lands on its head and squashes it.
- Signature gags: **G-GLITCHSLIP** (glitzi; brightness stays constant), **G-SPINUP** (zuzu), **G-SPARKPOP** (pipzi; small local sparks, no full-frame brightening), **G-SPLASHSIT** (blubi).

**Escalation metaphors.** All in the v2 frosted-glass style.
- No more than 3 readable texts on screen besides the captions.
- No phones, no real app screens, no people, no other characters.

The metaphors:
- **M-ORBIT**: thought bubbles orbit (v2).
- **M-ECHO**: a sent message repeats in different "tones".
- **M-DOTS**: typing dots that fade softly, at least 1.2 s per cycle.
- **M-CLOUD**: a personal drizzle cloud.
- **M-SWELL**: the Mallow fills and starts to float.
- **M-STACK**: glass blocks pile on its head.
- **M-WEEK**: five blocks marked M T W T F, with the sun sliding down.
- **M-METER**: a glass battery whose segments dim.
- **M-TABS**: 3 readable tabs plus blurred decoys.
- **M-LOOM**: a task card that grows and looms.
- **M-FRAMES**: shiny frames with abstract scenes scroll past.
- **M-FARGLOW**: the party glows warm far away.
- **M-CLOCK**: a clock face.
- **M-SPOTLIGHT**: a spotlight cone that fades in, never switches on hard.
- **M-JITTERS**: fizz around the rim.
- **M-FORK**: two options pull left and right.
- **M-NOISE**: soft sound rings, 6 elements at most.
- **M-BUZZ**: vibration rings.
- **M-PEBBLES**: pebbles bonk, a grumpy cloud grows, no lightning.
- **M-ICONS**: chore icons orbit and poke.
- **M-COSYPILE**: cushions drop in.
- **M-FOG**: mist and memory bubbles out of reach.
- **M-DREAMBUBBLES**: sepia memory bubbles rise.
- **M-GLOW**: blush, slow hearts or stars.
- **M-TEARS**: gentle tear arcs.

**Rituals ("the Hushmallow moment").** Each is the Mallow's own physical moment, never an instruction to the viewer. Each one ends by triggering the realm's own transformation from the app. Minimum and ideal durations decide which ritual can fit which video length.
- **R-BREATH, one big breath.** Anyone. Minimum 3.2 s, so 12 s videos or longer.
  - The inhale is 1.2 s or more.
  - A natural soft crest of 0.35 s or less, never labelled.
  - The exhale is at least 1.5× the inhale.
  - No counts, no holds, no on-screen instructions.
- **R-SQUISH**, a slow deep squish, then a jelly rise (1.6 s).
- **R-COSY**, shrinks round with a realm blanket; the face is never covered (2.0 s).
- **R-CLOUDWRAP**, a cloud wraps the Mallow like a hug (2.4 s).
- **R-NAMEIT, name it softly** (2.0 s). The bubbles merge into one everyday feeling word, lowercase; the Mallow nods. Never a diagnosis.
- **R-FLOAT-AWAY**, boops the bubble up into the sky, where it becomes a star or lantern (1.8 s).
- **R-DRIFT**, lies back and drifts on the water (2.4 s). loomi, noomi, blubi, boppo.
- **R-LANTERN**, folds the thoughts into a rising paper lantern (2.4 s). pipzi, noomi, blubi.
- Signature rituals: **R-SPIRALSLOW** (zuzu), **R-DEFRAG** (glitzi: slices realign, floor heals into a golden mandala), **R-SUNSOAK** (boppo, loomi, zuzu: golden fill and a rainbow), **R-RAINLIFT** (blubi, noomi: raindrops and tears lift into light).
- **R-WIGGLE**, wiggles the feeling loose; sway of 2 Hz or slower (1.5 s).
- **R-STRETCH**, a big stretch and yawn (1.8 s).
- **R-SETDOWN**, blocks or tabs leave one by one and the body springs up (2.0 s).
- **R-SAVOUR**, positive: lets it glow, glow ramps over at least 0.6 s, no burst (1.8 s).
- **R-BOOP-SIZE**, boops the looming thing back down to its real size (1.8 s).

**Loop strategies.** Every template uses LP-BASE plus one other.
- **LP-BASE**:
  - All repeating motion fits a whole number of times into the video.
  - Palette and pose at the end equal frame 0.
  - The realm sound bed crosses the seam.
  - The hook returns at D−0.34 s in the identical position.
- **LP-RETURN**: back to the cover pose (v2).
- **LP-RETRIGGER**: the trigger comes back on the seam, "here we go again".
- **LP-CYCLE**: the sun or morning wraps around.
- **LP-OBJECT**: the released object leaves the top of frame while a new one arrives on frame 0.
- **Seam QA**: the frame change across the seam may not exceed the film's own changes between keyframes. v2 measured 1.89 at the seam against 2.02–2.09 inside the film.

**Cameras.** One continuous shot. Zoom stays between 0.95 and 1.10 and changes by at most 0.04 per second. No roll, no shake, no cuts.
- **C-DRIFT-IN**: slow push-in to 1.075 during the escalation, easing back on the ritual (v2).
- **C-HOLD-WIDE**: locked at 0.96.
- **C-FOLLOW-SOFT**: follows hops at 0.2 of the lift.
- **C-PULL-BACK**: starts close at 1.08, eases back to reveal the metaphor, returns for the loop.
- **C-LOW-HERO**: slightly lower, gently rising, for pride and joy.

**Palette arcs.** Keyframes on the app's four realm mood dials (agitation, heaviness, clarity, warmth); the end equals the cover.
- **A-COLD-DIP-WARM**: night, then cold, then warm (the v2 arc).
- **A-GREY-CLEAR**: grey and heavy, then clear.
- **A-BUSY-STILL**: agitated, then still.
- **A-FLAT-GOLDEN**: flat, then golden.
- **A-BRIGHT-GLOW**: bright, then glowing.
- **A-DIM-SOFT**: dim, then soft warmth.
- **A-DIM-CONE-OPEN**: dims to a spotlight cone, then opens into warm light.
- **A-DUSK-DIP-GOLD**: the sun drops with the dread and inches back up in the ritual.
- **A-PREDAWN-SUNRISE**: grey pre-dawn to a warm sunrise.
- **Grade rules**:
  - The Mallow is only relit, never recoloured.
  - Exposure changes by 12% or less, ramped over at least 0.5 s.
  - No frame-to-frame brightness jump of 10% or more over a quarter of the frame, ever.

**Score motifs (no music).** The score is three layers:
- the realm's sound bed from the app, driven by the same four mood dials;
- each Mallow's kit gestures from the app;
- procedural foley tied to on-screen cues.

Pitches use only the Mallow kit's major pentatonic scale. Resolutions rise or arch, never fall at the end. No samples, ringtones, messenger pops, alarm tones, heartbeat sounds or jump-scare stings.

The motifs:
- **MO-TICK**: a clock that speeds up, then stops dead at the turn.
- **MO-DOTS**: typing plinks.
- **MO-GLASS-RISE**: one ting per line on scale steps 0/2/4.
- **MO-ORBIT**: whooshes panned to each bubble.
- **MO-HUM**: a tension tone, −24 dBFS max, consonant only.
- **MO-THUNK** and **MO-POP**: landings and pops.
- **MO-BUZZ**: a soft vibration pattern, never a ringtone.
- **MO-FIZZ**: soft crackle.
- **MO-PATTER**: rain.
- **MO-MURMUR**: pitched noise suggesting a crowd, never voices.
- **MO-MUSICBOX**: an original 3–4 note celesta phrase.
- **MO-WARMPAD**: a warm pad from the ritual onward.
- **MO-CLOSE**: the Mallow's content gesture plus the logo chime. Mandatory in every template.

## 3. The templates (28)

Each line pool (L1/L2/L3) includes the primary line as one of its options. Hooks are written to be read as "line 1 / line 2".

### T01-brain-at-2am - My Brain at 2 AM
- Feeling: replaying cringe at night [overthinking; difficult; comic]
- Mallows: noomi, zuzu | also blubi, glitzi | not boppo, loomi (their realms have no night)
- ToD late-night/night | 12/15/20 s | cost H | palette A-COLD-DIP-WARM | camera C-DRIFT-IN
- HOOK: ME TRYING TO SLEEP / AT 2 AM...
- Hook variants:
  - MY BRAIN AT 3 AM: / LET'S REVIEW EVERYTHING
  - ME: FINALLY COMFY / MY BRAIN: REMEMBER 2014?
  - LIGHTS OFF. BRAIN ON.
  - TRYING TO SLEEP BUT MY / BRAIN HAS OTHER PLANS
  - WHEN YOU CLOSE YOUR EYES / AND THE REPLAY STARTS
  - 2 AM AND MY BRAIN JUST / OPENED A NEW CHAPTER
  - BEDTIME? MY BRAIN THINKS / IT'S MEETING TIME
- Gag: G-JOLT (alts G-JELLYFREEZE, G-SINK, G-SPINUP). Asleep on the cover; the memory hits like a hypnic jerk.
- Escalation: M-ORBIT (alt M-ECHO). Clouds swallow the moon, the water chops, the light goes cold, the eyes chase the orbit.
- Lines: "That awkward conversation." → "Did I say something weird?" → "Why did I do that?"
- Thought variants:
  - L1: "That thing from 2014.", "What I said at lunch.", "That email I sent."
  - L2: "Did they notice?", "Was that rude?", "Should I explain?"
  - L3: "Why am I like this?", "Should I move away?", "Time to replay it again."
- Ritual: R-BREATH (alts R-CLOUDWRAP, R-FLOAT-AWAY, R-SPIRALSLOW). The exhale carries the thoughts away as warm motes; clouds part, the moon warms, the lake stills.
- Resolution: "Give your feelings / somewhere soft to land."
  - Variants: "Thoughts get quieter / when they're held softly." · "Not every thought / needs an answer tonight."
- Loop: LP-RETURN. Eyes drift shut and warmth eases back into night; the returning hook reads as "...every night".
- Sound: COVER crickets + sleeping breath across the seam · ANTIC dream-flinch hum · GAG eye-pop, boing, water plip · IMPACT heavy wet flump, squelch, bloop, wobble tail · AFTER blink bips, glances, a clock that won't stop · L1–L3 glass tings rising 0/2/4, cringe squeak on L1 · PEAK orbit whooshes, accelerating tick, tension hum · TURN everything stops dead · RITUAL inhale / soft crest / long exhale, release squelch, dissolve chimes and sparkles, warm pad · OPEN Noomi content glide · LOGO closing chime
- Flags: this is the approved v2. Keep "Why am I like this?" out of rejection templates.

### T02-sunday-scaries - Sunday Scaries
- Feeling: Sunday-evening Monday dread [dread; difficult; comic]
- Mallows: loomi, blubi, noomi | also glitzi, zuzu | not boppo (no dusk), pipzi (energy reads as party, not dread)
- ToD golden/dusk/blue-hour/night | 12/15/20 s | cost M | palette A-DUSK-DIP-GOLD | camera C-HOLD-WIDE
- HOOK: SUNDAY 6 PM: / MY BRAIN STARTS MONDAY
- Hook variants:
  - ME ENJOYING SUNDAY / UNTIL ABOUT 5 PM
  - THE SUNDAY SCARIES / ARRIVING RIGHT ON TIME
  - WEEKEND: STILL HERE / MY BRAIN: IT'S MONDAY
  - SUNDAY NIGHT AND MONDAY / IS ALREADY IN MY HEAD
  - ME PRETENDING TOMORROW / ISN'T MONDAY
  - THAT SUNDAY FEELING / WHEN THE SUN GOES DOWN
- Gag: G-DOUBLETAKE (alts G-DEFLATE, G-SINK, G-DEADPAN). The Mallow glances at the low sun, looks away, looks back: the sun has lurched lower.
- Escalation: M-WEEK (alt M-CLOCK). M T W T F blocks drop in one per line; the sun slides down; the light goes dusky blue.
- Lines: "Monday is coming." → "Did I do anything?" → "The whole week at once."
- Thought variants:
  - L1: "Alarm at 6:30.", "That inbox though.", "Tomorrow's to-do list."
  - L2: "Where did it go?", "I wasted the weekend.", "Is it Friday yet?"
  - L3: "Every meeting. All of it.", "Five days. In a row.", "Can weekends be longer?"
- Ritual: R-FLOAT-AWAY (alts R-BREATH, R-COSY, R-DRIFT). The week blocks float out to the horizon and become small islets or lanterns; the sun inches back up, as if the Mallow slowed time.
- Resolution: "Monday can wait / until it's Monday."
  - Variants: "Tonight is still yours." · "Sunday evening counts / as weekend too."
- Loop: LP-CYCLE. The sun is back at its cover height as the hook returns.
- Sound: COVER realm evening bed · GAG blink bip, low "whoop" as the sun drops, tiny boing · L1–L3 glass thunks stepping down · PEAK distant soft tick + hum · TURN silence · RITUAL boop, blocks swish away, rising shimmer as the sun returns, warm pad · LOGO chime

### T03-social-battery - Social Battery Empty
- Feeling: drained after people time [depletion; difficult; comic]
- Mallows: loomi, noomi, blubi | also glitzi, boppo
- ToD any | 10/12/15/20 s | cost M | palette A-GREY-CLEAR | camera C-DRIFT-IN
- HOOK: MY SOCIAL BATTERY / AFTER ONE PHONE CALL
- Hook variants:
  - ME AFTER ONE PARTY: / SOCIAL BATTERY AT 1%
  - SOCIAL BATTERY: 2% / SOMEONE: ONE MORE GAME?
  - WHEN YOU'VE SMILED / AT 40 PEOPLE TODAY
  - ME GETTING HOME AFTER / BEING 'ON' ALL DAY
  - INTROVERT FUEL GAUGE: / EMPTY
  - THE MOMENT THE DOOR / CLOSES BEHIND YOU
  - SOCIAL BATTERY AT 1% / AND IT'S ONLY 8 PM
- Gag: G-FLOP (alts G-DEFLATE, G-MELT, G-DEADPAN). The battery fades in at 1% and the Mallow pancakes.
- Escalation: M-METER. One battery segment dims per line; the last one pulses slowly in amber.
- Lines: "So many people." → "Did I talk too much?" → "Need to be a blob now."
- Thought variants:
  - L1: "Small talk. So much.", "Three hours of nodding.", "Everyone was so loud."
  - L2: "Was I weird at dinner?", "Did I laugh right?", "Did I say bye properly?"
  - L3: "No words left. Only mush.", "Must lie down. Forever.", "Do not perceive me."
- Ritual: R-COSY (alts R-DRIFT, R-SQUISH, R-CLOUDWRAP). Tucked under the realm blanket, the battery refills one warm segment at a time.
- Resolution: "Alone time isn't rude. / It's recharging."
  - Variants: "Some batteries charge / in the quiet." · "Quiet nights count / as plans too."
- Loop: LP-RETRIGGER. The freshly full battery drops back to 1% as the hook returns.
- Sound: GAG soft low-battery "boop", wet flump, long deflating squeak, sigh · L1–L3 segment plinks stepping down 4/2/0 · PEAK slow warm low-battery pulse, never an alarm · RITUAL blanket swish, cosy hum, recharge plucks rising 0/2/4/7 · OPEN content sigh · LOGO chime
- Flags: "Introvert" is fine; never drift into "burnout".

### T04-replaying-the-text - Replaying the Text I Sent
- Feeling: re-reading your own message [overthinking; difficult; comic]
- Mallows: zuzu, blubi | also glitzi, pipzi, noomi | not loomi (too unbothered to re-read)
- ToD any | 10/12/15/20 s | cost M | palette A-COLD-DIP-WARM | camera C-DRIFT-IN
- HOOK: ME REREADING THE TEXT / I SENT 3 HOURS AGO
- Hook variants:
  - SENT IT. NOW READING IT / FOR THE 40TH TIME
  - WHY DID I SEND 'OK.' / WITH A FULL STOP
  - ME ANALYSING MY OWN / TEXT LIKE A DETECTIVE
  - THE TEXT WAS FINE. / MY BRAIN: WAS IT THOUGH?
  - RE-READING WHAT I SENT / IN 9 DIFFERENT TONES
  - WHEN YOU SEND 'HAHA' / AND IMMEDIATELY REGRET IT
  - ME AFTER SENDING A / VOICE NOTE
- Gag: G-CRINGE (alts G-DOUBLETAKE, G-SINK, G-SPINUP). The sent bubble whooshes up; the Mallow reads it and shrinks.
- Escalation: M-ECHO (alt M-ORBIT). The message repeats in copies styled in different "tones".
- Lines: "Was 'haha' too much?" → "Sounded rude, right?" → "Should I unsend it?"
- Thought variants:
  - L1: "Too many exclamations?", "Why the full stop?", "That emoji was weird."
  - L2: "They think I'm upset.", "Did it sound annoyed?", "Do I explain the joke?"
  - L3: "New phone. New name.", "Time to move countries.", "Reading it again. Again."
- Ritual: R-FLOAT-AWAY (alts R-NAMEIT, R-SQUISH, R-SPIRALSLOW). The echoes collapse into one bubble; the Mallow boops it into the sky, where it becomes a star.
  - Name words: unsure. / embarrassed. / worried.
- Resolution: "Most texts are read / once. Not forty times."
  - Variants: "They probably read it / in two seconds." · "You meant it kindly. / That's what counts."
- Loop: LP-OBJECT. The star leaves the top of frame; a new "sent" bubble whooshes in on frame 0.
- Sound: COVER soft "send" swish · GAG cringe squeak · L1–L3 each echo a ting at a comic new pitch · PEAK overlapping tings, hum (Zuzu: spiral warble) · RITUAL boop, rising shimmer, star ting, pad · LOGO chime
- Flags: a generic message bubble only; never a real messenger's colours, ticks or "Read" label.

### T05-waiting-for-reply - Waiting for a Reply
- Feeling: watching the typing dots [anticipation; difficult; comic]
- Mallows: pipzi, blubi | also zuzu, boppo, glitzi | not loomi (would not be watching)
- ToD any | 10/12/15/20 s | cost M | palette A-BUSY-STILL | camera C-DRIFT-IN
- HOOK: WAITING FOR A REPLY / LIKE...
- Hook variants:
  - THEY'VE BEEN TYPING / FOR 4 MINUTES
  - ME CHECKING IF THEY / REPLIED (IT'S BEEN 2 MIN)
  - SEEN 1H AGO. / COOL. COOL COOL COOL.
  - WHEN THE TYPING DOTS / APPEAR AND DISAPPEAR
  - ME STARING AT MY PHONE / LIKE IT OWES ME MONEY
  - SENT A TEXT AT 6. / IT IS NOW 6:02.
  - WAITING FOR A REPLY / IS A FULL-TIME JOB
- Gag: G-PING (alts G-DOUBLETAKE, G-SPARKPOP, G-SPLASHSIT). The dots bubble pops in; the Mallow stretches up hopefully.
- Escalation: M-DOTS (alt M-CLOCK). The dots pulse, vanish and return; the Mallow leans in each time; a clock ticks faster.
- Lines: "They're typing!" → "...they stopped." → "Are they mad at me?"
- Thought variants:
  - L1: "Ooh, the dots!", "Seen at 6:04.", "Is that a buzz?"
  - L2: "Dots gone. Hmm.", "Still nothing.", "Should I double text?"
  - L3: "Did I ruin everything?", "Writing a 2nd draft.", "Okay, they hate me."
- Ritual: R-FLOAT-AWAY (alts R-LANTERN, R-BREATH, R-RAINLIFT). The Mallow nudges the dots up into the sky (it'll come when it comes) and turns back to its own warm world.
- Resolution: "Your worth isn't measured / in reply times."
  - Variants: "People reply when / life lets them." · "The wait feels longer / than it really is."
- Loop: LP-RETRIGGER. The dots reappear as the hook returns.
- Sound: GAG glass ding + stretch boing · L1 typing plinks · L2 "fwip" as the dots vanish · L3 + PEAK speeding tick, hum · TURN stop · RITUAL whoosh up, lantern or star shimmer, pad · LOGO chime · HOOK_IN the plinks restart across the seam
- Flags: no real app's "seen" screen.

### T06-imposter-feeling - Waiting to Be Found Out
- Feeling: imposter feeling [self-doubt; difficult; comic]
- Mallows: glitzi, zuzu | also boppo, pipzi
- ToD any | 12/15/20 s | cost M | palette A-DIM-CONE-OPEN | camera C-DRIFT-IN
- HOOK: ME AT WORK WAITING FOR / SOMEONE TO FIND ME OUT
- Hook variants:
  - GOT THE JOB. / NOW I HAVE TO DO THE JOB.
  - ME IN THE MEETING / HOPING NO ONE ASKS ME
  - WHEN EVERYONE SEEMS TO / KNOW WHAT THEY'RE DOING
  - FIRST WEEK AT THE NEW JOB / LIKE...
  - ME NODDING LIKE I KNOW / WHAT A KPI IS
  - ACTING CONFIDENT WHILE / MY BRAIN SAYS 'FRAUD'
  - WHEN THEY CALL YOU / 'THE EXPERT'
- Gag: G-JELLYFREEZE (alts G-SCOOT, G-GLITCHSLIP, G-SPINUP). The spotlight thunks on and the Mallow locks up, quivering.
- Escalation: M-SPOTLIGHT. The cone narrows with each line; the Mallow shrinks slightly inside it.
- Lines: "They'll find me out." → "Everyone knows more." → "Was it just luck?"
- Thought variants:
  - L1: "Act natural.", "Nod. Keep nodding.", "Did they mean me?"
  - L2: "Who let me in here?", "I'm winging it.", "They're all so sure."
  - L3: "Any second now...", "Should I confess?", "Is there a back door?"
- Ritual: R-BREATH (alts R-NAMEIT, R-DEFRAG, R-SPIRALSLOW). On the exhale the spotlight softens and widens into warm general light, so everyone is in the same light.
  - Name words: nervous. / new at this. / unsure.
- Resolution: "Feeling new isn't / the same as not belonging."
  - Variants: "Everyone's figuring it / out as they go." · "You were picked / for a reason."
- Loop: LP-RETRIGGER. The spotlight fades back on over 0.3 s, never a flash.
- Sound: GAG soft spotlight clunk + air, jelly wobble · L1 one comic cricket in the silence · L2–L3 tings, rising hum · TURN stop · RITUAL breath, light-widening swell, pad · LOGO chime
- Flags: never "imposter syndrome". Captions supply the workplace; the realm is never redrawn as an office.

### T07-procrastination-guilt - The Task That Grew
- Feeling: procrastination guilt [guilt; difficult; comic]
- Mallows: glitzi, pipzi, loomi | also boppo, zuzu
- ToD any | 12/15/20 s | cost M | palette A-GREY-CLEAR | camera C-HOLD-WIDE
- HOOK: ME AVOIDING ONE / 5-MINUTE TASK FOR 3 WEEKS
- Hook variants:
  - THE TASK: 10 MINUTES. / ME: AVOIDING IT SINCE MAY
  - I'LL START AT 3:00. / IT'S 3:01. GUESS I'LL WAIT.
  - ME CLEANING MY WHOLE ROOM / INSTEAD OF ONE EMAIL
  - ONE THING TO DO. / ME: DOES EVERYTHING ELSE.
  - THE DEADLINE IS TOMORROW. / ME: SNACK BREAK
  - MY TO-DO LIST / WATCHING ME RELAX
  - PROCRASTINATING SO HARD / I FEEL GUILTY ABOUT IT
- Gag: G-SCOOT (alts G-DEADPAN, G-WEEBLE, G-GLITCHSLIP). A small task card appears; the Mallow scoots away in three hops; the card follows one hop.
- Escalation: M-LOOM (alt M-STACK). The card swells with each line until it towers over and shades the Mallow.
- Lines: "Just one more minute." → "It's still not done." → "Now it's huge."
- Thought variants:
  - L1: "I'll do it later.", "After this snack.", "Need the right mood."
  - L2: "Why haven't I started?", "It's watching me.", "Everyone else is done."
  - L3: "It grew a second task.", "It's a monster now.", "Moving to the woods."
- Ritual: R-BOOP-SIZE (alts R-SQUISH, R-SETDOWN, R-BREATH). Boop: the giant card shrinks to its real tiny size, and one nudge folds it into a glowing tick.
- Resolution: "Big feelings make / small tasks look huge."
  - Variants: "Guilt is heavier / than the task." · "Tiny steps / still count."
- Loop: LP-RETRIGGER. A new small card pops in as the hook returns.
- Sound: GAG card pop, three patter squeaks · L1–L3 glass-stretch creaks, a low "whoom" as the shadow lands · PEAK hum · RITUAL boop, deflate squeak, unlock + success gesture · LOGO chime
- Flags: no productivity shaming. The insight is about guilt inflating the task, not about working harder.

### T08-too-many-tabs - Too Many Tabs Open
- Feeling: mental clutter [overwhelm; difficult; comic]
- Mallows: zuzu, glitzi | also pipzi, boppo, loomi
- ToD any | 10/12/15/20 s | cost H | palette A-BUSY-STILL | camera C-DRIFT-IN, C-PULL-BACK
- HOOK: MY BRAIN RIGHT NOW: / 47 TABS OPEN
- Hook variants:
  - WHICH TAB IS PLAYING / THE MUSIC?
  - ME TRYING TO RELAX / WITH 63 BRAIN TABS OPEN
  - MY BRAIN HAS 40 TABS OPEN / AND 3 ARE FROZEN
  - TRYING TO FOCUS ON ONE / THING. BRAIN: NEW TAB.
  - WHEN YOU WALK INTO A ROOM / AND FORGET WHY
  - MENTAL LOAD: / LOADING...
  - ONE THOUGHT? NO. / FORTY. AT ONCE.
- Gag: G-WEEBLE (alts G-SPINUP, G-GLITCHSLIP, G-BONK). The first tab pops in and bonks the Mallow, which rocks like a weeble.
- Escalation: M-TABS. 3 readable tabs in front; 6–12 blurred decoys crowd in behind and jostle.
- Lines: "Reply to that email." → "Buy more toothpaste." → "What's that song called?"
- Thought variants:
  - L1: "Water the plant.", "Birthday gift? Whose?", "Return that parcel."
  - L2: "Did I reply to that?", "Is that tab... music?", "Learn Italian someday."
  - L3: "Everything. All at once.", "Why is one tab beeping?", "Tab 48 just opened."
- Ritual: R-SETDOWN (alts R-SPIRALSLOW, R-DEFRAG, R-BREATH). The tabs fold shut one by one into the glow with paper clicks until a single warm star remains.
- Resolution: "Not everything needs / to stay open."
  - Variants: "One tab at a time / is plenty." · "A full brain deserves / a soft place to rest."
- Loop: LP-RETRIGGER. Tab one pops back in on the seam.
- Sound: GAG soft "pock" + bonk, rocking creaks · L1–L3 and decoys pops stepping up, clutter rustle · PEAK faint comic "mystery music" plink + hum · TURN stop · RITUAL descending paper clicks, settle, a "clear" swell, pad · LOGO chime
- Flags: I removed "Did I lock the door?" because repeated checking reads as a clinical pattern.

### T09-rejection-sting - The No That Stings
- Feeling: rejection sting [hurt; difficult; gentle-comic]
- Mallows: blubi, noomi | also boppo, glitzi | not pipzi (sparks read as celebration)
- ToD any | 12/15/20 s | cost M | palette A-GREY-CLEAR | camera C-DRIFT-IN
- HOOK: WHEN THEY SAID NO / AND YOU SAID 'NO WORRIES!'
- Hook variants:
  - 'WE WENT WITH ANOTHER / CANDIDATE.' ME:
  - ME ACTING CHILL AFTER / GETTING TURNED DOWN
  - WHEN YOU PUT YOURSELF / OUT THERE AND... NOPE
  - 'MAYBE NEXT TIME' / ME, A WOBBLY JELLY:
  - SAID 'IT'S FINE'. / IT WAS NOT FINE.
  - THAT LITTLE STING WHEN / THE ANSWER IS NO
- Gag: G-DEFLATE (alts G-SPLASHSIT, G-DOUBLETAKE, G-DEADPAN). A brave smile, then a slow leak.
- Escalation: M-CLOUD. A little personal cloud forms and drizzles; the body droops.
- Lines: "It's fine. Totally fine." → "Was it something I did?" → "Ouch. That stings."
- Thought variants:
  - L1: "Smile and nod.", "Play it cool.", "Not crying. You are."
  - L2: "Maybe I'm too much.", "Should I have tried harder?", "What did I miss?"
  - L3: "Never trying again.", "Becoming a hermit now.", "Okay. That really hurt."
- Ritual: R-CLOUDWRAP (alts R-RAINLIFT, R-BREATH, R-COSY). The rain cloud itself softens and wraps the Mallow like a hug.
- Resolution: "A no is about a moment, / not about you."
  - Variants: "It stings because / you cared. That's brave." · "Let it sting. / Then let it soften."
- Loop: LP-OBJECT. The last motes gather back into a tiny grey cloud at the seam.
- Sound: GAG soft pip, "pfff" squeak, wobbly-lip warble · L1–L3 tings stepping down 4/2/0, rain building · PEAK rain + low pad, never a minor drone · RITUAL cloud swish, comfort gesture, pad, droplet chimes rising · LOGO chime
- Flags: I removed "What's wrong with me?" because it reads as self-blame. Gag intensity stays at 0.6 or less.

### T10-excitement-overflow - Can't Contain It
- Feeling: excitement you can't hold in [joy; positive; comic]
- Mallows: boppo, pipzi | also zuzu, blubi, glitzi
- ToD any | 10/12/15/20 s | cost H | palette A-BRIGHT-GLOW | camera C-FOLLOW-SOFT, C-HOLD-WIDE
- HOOK: ME TRYING TO ACT CASUAL / ABOUT GOOD NEWS
- Hook variants:
  - WHEN YOU HAVE NEWS / BUT CAN'T TELL ANYONE YET
  - TRYING TO STAY CALM / THE WEEK BEFORE MY TRIP
  - ME: ACTING NORMAL. / MY BODY: VIBRATING
  - WHEN THEY SAY YES / AND YOU PLAY IT COOL
  - THE NIGHT BEFORE / SOMETHING EXCITING (night realms only)
  - TOO EXCITED TO BE / A NORMAL PERSON TODAY
  - HOLDING IN THE BEST NEWS / OF MY ENTIRE LIFE
- Gag: G-PUFF (alts G-LAUNCH, G-SPARKPOP, G-GLITCHSLIP). Cheeks puff, the Mallow inflates and floats, a squeak leaks out.
- Escalation: M-SWELL (alt M-GLOW). It inflates a bit per line, slow sparkles rise inside, it starts to float. No flashes.
- Lines: "Act normal. Act normal." → "What if it's amazing?" → "I'm going to burst."
- Thought variants:
  - L1: "Be cool. Be so cool.", "Normal face. Normal face.", "Don't smile. Don't."
  - L2: "Who can I tell?", "Is it real? IT'S REAL.", "Counting the sleeps."
  - L3: "Cannot. Contain. It.", "Sparkles everywhere.", "Vibrating at max."
- Ritual: R-SAVOUR (alts R-LANTERN, R-SUNSOAK, R-WIGGLE). Instead of holding it in: one big soft bounce, a golden bloom, sparkles drifting up slowly.
- Resolution: "Good feelings deserve / room to sparkle."
  - Variants: "Let the good stuff / take up space." · "For all the feelings, / even the sparkly ones."
- Loop: LP-RETRIGGER. The cheeks start to puff again as the hook returns.
- Sound: GAG rubbery balloon stretch, leaky squeak · L1–L3 tings rising 0/2/4 then 7, fizz building · PEAK kit "surprise" gesture · RITUAL big soft boing, bloom, sparkle drift, celebrate gesture at low intensity · LOGO chime
- Flags: sparkles stay small and slow, never a full-frame flash.

### T11-comparison-scroll - Comparison Scrolling
- Feeling: feeling behind while scrolling [comparison; difficult; comic]
- Mallows: glitzi, blubi | also zuzu, loomi | not boppo (reads as mocking the feeling)
- ToD any | 12/15/20 s | cost M | palette A-GREY-CLEAR | camera C-DRIFT-IN
- HOOK: ME SCROLLING AT 11 PM / COMPARING MY WHOLE LIFE
- Hook variants:
  - EVERYONE ONLINE: THRIVING / ME: EATING CEREAL AT 4 PM
  - WHEN YOUR FEED IS / EVERYONE'S BEST DAY
  - ME AFTER 5 MINUTES / OF SCROLLING
  - OPENED THE APP FOR FUN. / LEFT FEELING BEHIND.
  - THEIR HIGHLIGHT REEL / VS MY BLOOPERS
  - SCROLLING UNTIL I FEEL / LIKE I'M LOSING A RACE
  - WHY IS EVERYONE ELSE / SO PUT TOGETHER?
- Gag: G-DOUBLETAKE (alts G-CRINGE, G-GLITCHSLIP, G-DEFLATE). A dazzling frame slides past; double take; the Mallow glances at its own reflection.
- Escalation: M-FRAMES. Frames scroll up, each brighter; the Mallow's glow dims and it shrinks a touch.
- Lines: "They're on a beach." → "They got promoted." → "What am I doing?"
- Thought variants:
  - L1: "Another engagement.", "They bought a house?", "Perfect latte art."
  - L2: "Everyone's ahead.", "Am I behind?", "I made toast today."
  - L3: "Is my life a blooper?", "Should I start over?", "Five more minutes..."
- Ritual: R-SQUISH (alts R-FLOAT-AWAY, R-DEFRAG, R-DRIFT). A deep squish and pop-back: its own glow returns brighter than the frames, which dim and sink like cards set face-down.
- Resolution: "You're comparing your / inside to their outside."
  - Variants: "Highlight reels / skip the bloopers." · "Your pace is / still a pace."
- Loop: LP-RETRIGGER. A new shiny frame slides in on the seam.
- Sound: GAG soft scroll swish, double-take bips · L1–L3 one bright soft ting per frame, the dimming glow as a descending hum · RITUAL squish squelch, glow bloom, frames sinking with a "bloop" · LOGO chime
- Flags: frames show abstract scenes only. No bodies, faces, fitness, appearance or real app screens.

### T12-three-pm-slump - The 3 PM Slump
- Feeling: afternoon energy crash [depletion; difficult; comic]
- Mallows: loomi, boppo | also zuzu | not noomi, glitzi, pipzi, blubi (their realms have no afternoon)
- ToD afternoon/midday | 10/12/15/20 s | cost M | palette A-FLAT-GOLDEN | camera C-HOLD-WIDE
- HOOK: ME AT 3 PM: / A MELTED MARSHMALLOW
- Hook variants:
  - THE 3 PM SLUMP / HITTING LIKE...
  - ME AFTER LUNCH TRYING / TO LOOK PRODUCTIVE
  - MY ENERGY AT 9 AM VS / MY ENERGY AT 3 PM
  - WHEN THE AFTERNOON / LASTS 400 HOURS
  - 3 PM. EYES OPEN. / BRAIN: OUT OF OFFICE.
  - TRYING TO FOCUS AT 3 PM / LIKE...
  - THE AFTERNOON SLUMP / HAS ENTERED THE CHAT
- Gag: G-MELT (alts G-FLOP, G-DEADPAN). The Mallow melts sideways like ice cream in the sun.
- Escalation: M-CLOCK. The clock's hands crawl in slow motion; the Mallow melts lower per line; faint heat shimmer.
- Lines: "Is it home time yet?" → "Read that line 4 times." → "Melting. Slowly."
- Thought variants:
  - L1: "Snack? Snack.", "What was I doing?", "Eyelids: heavy."
  - L2: "Typing the same word.", "Is it 3:01? Oh no.", "The clock is frozen."
  - L3: "I am now a puddle.", "Brain has left.", "Nap under the desk?"
- Ritual: R-STRETCH (alts R-SUNSOAK, R-DRIFT, R-WIGGLE). A huge stretch and a yawn, then it pops back round and fresh.
- Resolution: "Afternoons are allowed / to be slow."
  - Variants: "Even sunshine / needs a stretch." (boppo only) · "Slow is still / moving."
- Loop: LP-RETRIGGER. The Mallow starts to sag again as the hook returns.
- Sound: COVER soft afternoon bed · GAG soft slide-whistle down, sticky schlorp · L1–L3 slow ticks detuning lower · PEAK one comically slow "tock" · RITUAL rubbery creak gliding up, yawn, pop-back boing · LOGO chime
- Flags: no caffeine jokes; no "brain fog".

### T13-yes-meant-no - Said Yes, Meant No
- Feeling: saying yes when you meant no [people-pleasing; difficult; comic]
- Mallows: boppo, blubi | also pipzi, loomi, glitzi
- ToD any | 12/15/20 s | cost M | palette A-GREY-CLEAR | camera C-HOLD-WIDE
- HOOK: ME SAYING 'SURE!' / WHEN I MEANT 'NO'
- Hook variants:
  - THEY ASKED FOR A FAVOUR. / MY MOUTH SAID YES.
  - HOW IT STARTED: 'SURE!' / HOW IT'S GOING:
  - WHEN YOU SAY YES / TO THE 5TH THING THIS WEEK
  - ME AGREEING TO PLANS / I WANT TO CANCEL
  - MY BRAIN: SAY NO. / MY MOUTH: OF COURSE!
  - WHY DID I SAY YES / TO HELPING EVERYONE MOVE
  - SAYING YES TO BE NICE / AND REGRETTING IT INSTANTLY
- Gag: G-BONK (alts G-DOUBLETAKE, G-CRINGE). An eager nod-bounce ("sure!"), and the first block lands on its head.
- Escalation: M-STACK. Each "yes" lands as a block; the stack wobbles; the Mallow squashes lower.
- Lines: "Sure, no problem!" → "Wait. When is it?" → "That's my only free day."
- Thought variants:
  - L1: "Of course I can!", "Happy to help!", "Yep, sounds great!"
  - L2: "Why did I say that?", "How do I get out?", "That's three things now."
  - L3: "I'm a yes-machine.", "Saying yes to everyone.", "When do I rest?"
- Ritual: R-SETDOWN (alts R-WIGGLE, R-BREATH). A gentle tip and the blocks slide off one by one; the Mallow springs back up; one keeper block glows.
- Resolution: "A kind 'no' is still / kind."
  - Variants: "Your time counts too." · "No is a full sentence. / A soft one, too."
- Loop: LP-RETRIGGER. A new block hovers in ("one more?") as the hook returns.
- Sound: GAG eager kit "success" chirp, then a soft glass thunk + squelch · L1–L3 thunks stepping lower, stack creaks · RITUAL "shhk" + thunk ×3, spring boing, relief sigh · LOGO chime
- Flags: the jargon "set boundaries" never appears on screen.

### T14-missing-someone - Missing Someone
- Feeling: missing someone far away [longing; difficult; gentle]
- Mallows: noomi, blubi, loomi | also zuzu | not glitzi (sarcasm undercuts it), boppo, pipzi (too bouncy or sparky)
- ToD any | 12/15/20 s | cost M | palette A-DIM-SOFT | camera C-DRIFT-IN
- HOOK: MISSING SOMEONE / IN THE QUIET MOMENTS
- Hook variants:
  - WHEN YOU WANT TO TELL THEM / SOMETHING AND REMEMBER
  - MILES APART. THINKING / ABOUT THEM ANYWAY.
  - SAW SOMETHING THEY'D LOVE / AND MISSED THEM AGAIN
  - LONG DISTANCE HITS / DIFFERENT AT NIGHT
  - WHEN THE HOUSE IS QUIET / AND YOU MISS YOUR PEOPLE
  - HOMESICK FOR A PERSON, / NOT A PLACE
- Gag: G-WEEBLE (alts G-DEADPAN, G-SPLASHSIT). A soft gag, intensity 0.4 or less: the Mallow leans into an empty hug, tips, and wobbles back upright.
- Escalation: M-FOG. Mist rolls in; each line is a memory bubble drifting just out of reach.
- Lines: "They'd love this." → "Wish they were here." → "Is it silly to miss them?"
- Thought variants:
  - L1: "Remember that day?", "Their laugh, though.", "Saved them a seat."
  - L2: "Too far away.", "Should I call?", "Not the same without them."
  - L3: "Missing them a lot.", "Hug in the mail, please.", "Feels so far tonight."
- Ritual: R-CLOUDWRAP (alts R-LANTERN, R-BREATH). A cloud wraps the Mallow like a hug; the memory bubble drifts back and becomes a small warm star that stays near.
- Resolution: "Missing them means / they matter."
  - Variants: "Distance can't reach / the warm parts." · "Some love travels / the long way round."
- Loop: LP-OBJECT. The star drifts up; a memory bubble returns from the horizon at the seam.
- Sound: COVER quiet night bed · GAG soft tip "plop", gentle wobble · L1–L3 a slow 3-note celesta memory phrase, repeated softer · PEAK fog air, no drones · RITUAL cloud swish, comfort gesture, warm pad, star ting · LOGO chime
- Flags: this may read as grief, so no slapstick and no "gone forever" lines. "WHEN YOU WANT TO TELL THEM SOMETHING AND REMEMBER" is the most grief-adjacent hook: schedule it sparingly and never pair it with a comic L3.

### T15-presentation-nerves - Five Minutes Before
- Feeling: pre-presentation nerves [nerves; difficult; comic]
- Mallows: pipzi, zuzu, glitzi | also boppo, blubi
- ToD any | 10/12/15/20 s | cost M | palette A-BUSY-STILL | camera C-DRIFT-IN
- HOOK: ME 5 MINUTES BEFORE / MY PRESENTATION
- Hook variants:
  - WAITING FOR MY NAME / TO BE CALLED LIKE...
  - WHEN THEY SAY / 'YOU'RE UP NEXT'
  - ME PRETENDING I'M READY / FOR THE BIG MEETING
  - PRACTISED IT 40 TIMES. / FORGOT IT IN 4 SECONDS.
  - THE NIGHT BEFORE / THE BIG PRESENTATION
  - WHEN YOU HAVE TO / SPEAK IN FRONT OF PEOPLE
  - MY NERVES WHEN SOMEONE / SAYS 'QUICK QUESTION'
- Gag: G-JELLYFREEZE (alts G-LAUNCH, G-SPARKPOP, G-SCOOT). The name-called ping; the Mallow locks up and quivers.
- Escalation: M-JITTERS (alt M-SPOTLIGHT). Sparks and fizz around the rim build with each line; the quiver grows.
- Lines: "What's my first line?" → "Everyone will stare." → "What if I freeze?"
- Thought variants:
  - L1: "Slide one. Slide one.", "Did I save the file?", "Where are my notes?"
  - L2: "Why is it so quiet?", "They look so serious.", "Talk slower. Slower."
  - L3: "Can I just email it?", "Is there a fire exit?", "Too late to move away?"
- Ritual: R-BREATH (alts R-WIGGLE, R-LANTERN, R-SPIRALSLOW). On the exhale the jittery sparks settle into a calm, steady ring of lights: the energy becomes a glow. 10 s versions use R-WIGGLE.
- Resolution: "Nerves are just energy / looking for a job."
  - Variants: "Butterflies mean / it matters to you." · "You don't have to be / fearless. Just you."
- Loop: LP-RETRIGGER. The name-called ping returns on the seam.
- Sound: GAG ping + jelly wobble · L1 soft paper shuffle · L2–L3 rising fizz, tick · TURN stop · RITUAL breath; the sparks resolve into a soft pentatonic chime ring; pad · LOGO chime
- Flags: no symptom lists (dry mouth, racing heart, sweating). Never claim "calm your nerves in X seconds".

### T16-morning-dread - Alarm vs Me
- Feeling: morning dread [dread; difficult; comic]
- Mallows: noomi, loomi, blubi | also glitzi, boppo, zuzu | not pipzi (no morning)
- ToD pre-dawn/morning/misty-morning | 10/12/15/20 s | cost M | palette A-PREDAWN-SUNRISE | camera C-DRIFT-IN
- HOOK: MY ALARM: BOOP BOOP. / ME: ABSOLUTELY NOT.
- Hook variants:
  - ME WHEN THE ALARM / GOES OFF AT 6 AM
  - SNOOZE NUMBER FOUR / HITS DIFFERENT
  - MORNING ME VS / THE WHOLE DAY AHEAD
  - WHEN YOU WAKE UP AND / REMEMBER IT'S TUESDAY
  - 5 MORE MINUTES. / (SAID 6 TIMES)
  - WAKING UP ALREADY / THINKING ABOUT THE DAY
  - THE ALARM GOES OFF AND / THE DREAD WAKES UP TOO
- Gag: G-SINK (alts G-JOLT, G-FLOP, G-DEADPAN). The soft alarm bubble boops; the Mallow sinks to its cheeks to hide.
- Escalation: M-CLOCK (alt M-STACK). The alarm bubble rings softly; the day's blocks drop in; the sun rises too fast.
- Lines: "Is it morning already?" → "So much to do today." → "Can I stay a cloud?"
- Thought variants:
  - L1: "Snooze. Snooze. Snooze.", "Was that the alarm?", "Not the alarm. Please."
  - L2: "That meeting at 9.", "Where are my socks?", "The whole day. Ugh."
  - L3: "Cancel today, please.", "Hibernate until spring?", "Becoming one with the duvet."
- Ritual: R-STRETCH (alts R-SUNSOAK, R-BREATH, R-COSY). A slow morning stretch and a yawn; the sunrise warms gently around it.
- Resolution: "You don't have to face / the whole day at once."
  - Variants: "Just this morning. / That's enough for now." · "Mornings can start / slowly."
- Loop: LP-CYCLE. The light dips back to pre-dawn and the alarm boops as the hook returns.
- Sound: GAG gentle two-note marimba "boop boop" (never an alarm tone), soft glug + two blub plinks · L1–L3 tick + thunks · RITUAL creak gliding up, yawn, sparse soft bird chirps, sunrise shimmer, pad · LOGO chime
- Flags: G-SINK keeps the mouth above the waterline.

### T17-small-win - Small Win, Huge Joy
- Feeling: small-win joy [pride; positive; comic]
- Mallows: boppo, pipzi, loomi, glitzi | also noomi, blubi, zuzu
- ToD any | 10/12/15/20 s | cost M | palette A-BRIGHT-GLOW | camera C-LOW-HERO
- HOOK: ME AFTER FINALLY REPLYING / TO ONE EMAIL
- Hook variants:
  - I DID THE DISHES. / PLEASE CLAP.
  - MADE A PHONE CALL / WITHOUT PRACTISING IT
  - WHEN THE TINY THING / FINALLY GETS DONE
  - ME AFTER MAKING MY BED / LIKE I WON AN AWARD
  - SMALL WIN. HUGE / INTERNAL CELEBRATION.
  - WHEN YOU REMEMBER / EVERYONE'S NAME
  - SENT THE EMAIL. / VICTORY LAP TIME.
- Gag: G-DOUBLETAKE (alts G-LAUNCH, G-SPARKPOP, G-DEADPAN). "Wait... did I just do that?"
- Escalation: M-GLOW (alt M-SWELL). The joy builds: the glow grows, slow golden stars orbit, a tiny glass trophy appears.
- Lines: "Wait... I did it?" → "First try, too!" → "Am I unstoppable?"
- Thought variants:
  - L1: "It's done. DONE.", "That was... easy?", "No one saw. Still counts."
  - L2: "Should I tell someone?", "Tiny trophy for me.", "Look at me go!"
  - L3: "Running for mayor next.", "Peak me. Right here.", "Unstoppable. Mostly."
- Ritual: R-SAVOUR (alts R-SUNSOAK, R-LANTERN, R-DEFRAG). One happy hop, a golden bloom, drifting sparkles: letting the win land.
- Resolution: "Small wins are / still wins."
  - Variants: "Notice the good bits too." · "Tiny victories / deserve a little glow."
- Loop: LP-RETURN. A proud little bob back into the cover pose.
- Sound: COVER soft "done" gesture · GAG bip-bip, tiny boing · L1–L3 rising major tings, a 3-note celesta fanfare on L3 · RITUAL low-intensity celebrate gesture, bloom, star sparkle · LOGO chime
- Flags: the Glitzi version plays it as "Order. Disgusting. I love it." A smirk, not a grin.

### T18-left-out - Plans Without Me
- Feeling: feeling left out [loneliness; difficult; gentle-comic]
- Mallows: blubi, loomi | also glitzi, noomi | not boppo (too bouncy), pipzi (lives at the party)
- ToD any | 12/15/20 s | cost M | palette A-DIM-SOFT | camera C-HOLD-WIDE
- HOOK: WHEN THE GROUP CHAT / MADE PLANS WITHOUT ME
- Hook variants:
  - SEEING THE PHOTOS FROM / THE PARTY I WASN'T AT
  - ME FINDING OUT / THERE WAS A GROUP CHAT
  - WHEN EVERYONE'S OUT / AND YOU'RE HOME. AGAIN.
  - 'WE FIGURED YOU WERE BUSY' / ME:
  - THAT LEFT-OUT FEELING / HITTING AT 9 PM
  - FOMO, BUT MAKE IT / A QUIET FRIDAY NIGHT
  - WATCHING THE STORIES / FROM MY SOFA LIKE...
- Gag: G-DEFLATE (alts G-DOUBLETAKE, G-SINK). A far-off festive glow appears; the Mallow slowly leaks.
- Escalation: M-FARGLOW (alt M-FRAMES). The far glow warms with each line while the Mallow's light cools.
- Lines: "Oh. They all went." → "Did they forget me?" → "Fine. I'm fine."
- Thought variants:
  - L1: "Wait, there's photos?", "That looks fun.", "Nobody asked me."
  - L2: "Was it on purpose?", "Am I the boring one?", "Should I say something?"
  - L3: "Me and my sofa then.", "Not jealous. (Jealous.)", "Party of one, I guess."
- Ritual: R-COSY (alts R-CLOUDWRAP, R-BREATH, R-RAINLIFT). The Mallow makes its own warmth: a cosy shrink, a blanket, a lantern lighting beside it. The glow is here too.
- Resolution: "Left out of one plan / isn't left out of life."
  - Variants: "You're allowed to want / to be included." · "Missing one night / doesn't change your worth."
- Loop: LP-RETRIGGER. The far festive glow fades back in on the seam.
- Sound: GAG distant festive murmur, low-passed, deflate squeak · L1–L3 tings stepping down, sigh · RITUAL blanket swish, lantern pluck, warm pad · LOGO chime
- Flags: generic "group chat" wording only; no real app names.

### T19-cant-decide - Can't Decide
- Feeling: decision paralysis [overthinking; mixed; comic]
- Mallows: zuzu, pipzi | also boppo, glitzi
- ToD any | 10/12/15/20 s | cost M | palette A-BUSY-STILL | camera C-DRIFT-IN
- HOOK: ME PICKING WHAT TO WATCH / FOR 45 MINUTES
- Hook variants:
  - WHEN SOMEONE ASKS / 'WHERE DO YOU WANT TO EAT?'
  - TWO OPTIONS. ZERO IDEA. / SEND HELP.
  - ME AT THE MENU / FOR THE NEXT 20 MINUTES
  - MAKING A TINY DECISION / LIKE IT'S THE BIG FINAL
  - WHEN BOTH ARE FINE / AND I STILL CAN'T PICK
  - OVERTHINKING WHICH / SOCKS TO WEAR
  - SCROLLING FOR SOMETHING / TO WATCH UNTIL BEDTIME
- Gag: G-WEEBLE (alts G-SPINUP, G-DOUBLETAKE). Ping-pong lean: option A, option B, A again; the body rocks between them.
- Escalation: M-FORK. Two option bubbles pull left and right; the ping-pong speeds up (Zuzu's spirals spin).
- Lines: "This one? Or that one?" → "What if I pick wrong?" → "Can I have both?"
- Thought variants:
  - L1: "Pizza? Noodles? Pizza?", "Red or blue?", "Left? No. Right?"
  - L2: "Reading reviews again.", "Make a pros list?", "What would they pick?"
  - L3: "I'll just stand here.", "Flip a coin? Twice?", "Now I want neither."
- Ritual: R-FLOAT-AWAY (alts R-SPIRALSLOW, R-SQUISH). The Mallow boops one option, which glows; the other floats off kindly as a star.
- Resolution: "Most choices are / smaller than they feel."
  - Variants: "Good enough / is often great." · "Either way, / you'll figure it out."
- Loop: LP-RETRIGGER. Two new options pop up on the seam.
- Sound: GAG left/right "pock" pings panned, rocking boings · L1–L3 ping-pong speeding up (Zuzu: spiral warble) · RITUAL boop, float shimmer, success gesture · LOGO chime
- Flags: "LIFE OR DEATH" replaced with "THE BIG FINAL".

### T20-too-loud - Everything Is a Lot
- Feeling: too much noise and people [overwhelm; difficult; gentle-comic]
- Mallows: loomi, noomi, blubi | also glitzi, zuzu | not boppo, pipzi (too loud themselves)
- ToD any | 12/15/20 s | cost M | palette A-BUSY-STILL | camera C-DRIFT-IN
- HOOK: ME AFTER A DAY OF / NOISE, LIGHTS AND PEOPLE
- Hook variants:
  - WHEN EVERYTHING IS / JUST... A LOT
  - TOO MANY SOUNDS. / TOO MANY PEOPLE. TOO MUCH.
  - WHEN THREE PEOPLE TALK / AT YOU AT ONCE
  - ME IN A LOUD ROOM / WISHING FOR A MUTE BUTTON
  - THE SUPERMARKET ON / A SATURDAY LIKE...
  - WHEN YOUR BRAIN NEEDS / THE VOLUME TURNED DOWN
  - ONE MORE NOISE / AND I'M BECOMING A PUDDLE
- Gag: G-CRINGE (alts G-SINK, G-JELLYFREEZE). A sound ring hits and the Mallow shrinks from it.
- Escalation: M-NOISE. Rings and small onomatopoeia bubbles drift in and overlap. Busy, but never overwhelming to watch: 6 elements at most, low contrast, slow.
- Lines: "So. Many. Sounds." → "Who turned it up?" → "Need a quiet corner."
- Thought variants:
  - L1: "Beep. Buzz. Ding.", "Everyone's talking.", "Bright. So bright."
  - L2: "Can't hear myself think.", "Too much. Too fast.", "Is it getting louder?"
  - L3: "Mute button, please.", "Becoming a pebble.", "Hide in a cloud?"
- Ritual: R-COSY (alts R-DRIFT, R-CLOUDWRAP). The Mallow tucks into a cloud; the score literally muffles into quiet and the rings fade.
- Resolution: "It's okay to need / the volume down."
  - Variants: "Quiet is a kind of / comfort too." · "Soft places help / loud days land."
- Loop: LP-RETRIGGER. A single soft "ding" ring returns on the seam.
- Sound: GAG one soft ring "whomm", cringe squeak · L1–L3 layered soft pings, buzzes and murmur building, all gentle and level-capped · TURN everything ducks · RITUAL a closing muffle sweep, cosy hum, cloud swish, then only the quiet realm bed · LOGO chime
- Flags: never "overstimulated" or "sensory overload" on screen.

### T21-plans-cancelled - Plans Cancelled (Yay)
- Feeling: the joy of cancelled plans [relief; positive; comic]
- Mallows: loomi, noomi, glitzi | also blubi, boppo
- ToD any | 10/12/15/20 s | cost L | palette A-FLAT-GOLDEN | camera C-DRIFT-IN
- HOOK: WHEN THEY CANCEL PLANS / I WAS DREADING
- Hook variants:
  - 'HEY, CAN WE RESCHEDULE?' / ME:
  - PLANS CANCELLED. / PYJAMAS: ACTIVATED.
  - WHEN THE RAIN CANCELS / THE THING I WAS DREADING
  - ME PRETENDING TO BE SAD / THEY CANCELLED
  - THE JOY OF A CANCELLED / PLAN ON A FRIDAY NIGHT
  - THEY SAID 'RAIN CHECK?' / I SAID 'PLEASE.'
  - SUDDENLY FREE EVENING / UNLOCKED
- Gag: G-DEADPAN (alts G-DOUBLETAKE, G-LAUNCH). Reads the cancellation... slow blink... a tiny gleeful hop.
- Escalation: M-COSYPILE. The Mallow tries to frown but the smile keeps breaking through; cushions drop in one by one.
- Lines: "Oh no. Anyway." → "Sweatpants o'clock." → "A whole free night?!"
- Thought variants:
  - L1: "Aw, what a shame.", "Totally gutted. Not.", "Act a bit sad."
  - L2: "Sofa: reserved.", "Is it rude to cheer?", "Snacks. Blanket. Bliss."
  - L3: "Best plan ever made.", "Nobody move. Bliss.", "Is this joy? It's joy."
- Ritual: R-COSY (alts R-DRIFT, R-SQUISH). Sinks into the cushion pile, shrinks cosy, warm glow.
- Resolution: "Rest is a plan too."
  - Variants: "Relief is a feeling / worth noticing." · "A free evening / is a tiny gift."
- Loop: LP-RETURN. The cushions fade and the Mallow returns to the cover pose.
- Sound: GAG soft message "boop", slow-blink bip, gleeful squeak · L1–L3 cushion "pfumf" landings ×3 · RITUAL sink-in squish, content sigh, cosy hum · LOGO chime
- Flags: I removed "Cancel more things?" because it reads as encouraging withdrawal.

### T22-guilty-resting - Trying to Rest
- Feeling: guilt about resting [guilt; mixed; comic]
- Mallows: loomi, noomi, boppo | also blubi, pipzi
- ToD any | 12/15/20 s | cost M | palette A-GREY-CLEAR | camera C-HOLD-WIDE
- HOOK: ME TRYING TO RELAX / BUT FEELING GUILTY ABOUT IT
- Hook variants:
  - DAY OFF. BRAIN: / BUT WHAT ABOUT THE EMAILS?
  - WHEN YOU SIT DOWN / AND REMEMBER 9 CHORES
  - TRYING TO REST LIKE / A NORMAL PERSON
  - LYING ON THE SOFA / FEELING LIKE A CRIMINAL
  - ME ON HOLIDAY STILL / CHECKING MY INBOX
  - REST? IN THIS ECONOMY.
  - MY BODY: RESTING. / MY BRAIN: BUT ARE WE THOUGH?
- Gag: G-FLOP (alts G-DEADPAN, G-JELLYFREEZE). Flops down to rest, and immediately a chore icon pings beside it.
- Escalation: M-ICONS (alt M-ORBIT). Glass chore icons orbit and poke while the Mallow tries to lie still.
- Lines: "Should I be doing stuff?" → "Everyone's so busy." → "Rest = lazy?"
- Thought variants:
  - L1: "Just sitting. Is that ok?", "The laundry is staring.", "Maybe one quick email."
  - L2: "Did I earn this nap?", "Others are working.", "Am I falling behind?"
  - L3: "Resting... guiltily.", "Fine. I'll fold socks.", "Relaxing is hard work."
- Ritual: R-DRIFT (alts R-CLOUDWRAP, R-COSY). Lies back and drifts; the chores float away like leaves on the water.
- Resolution: "Rest isn't a reward. / It's part of the plan."
  - Variants: "Resting counts / as doing something." · "Drifting is a valid plan." (loomi only; this is Loomi's approved voice line from the app)
- Loop: LP-RETRIGGER. A chore icon pings back on the seam.
- Sound: GAG flop flump + content sigh, then a chore "ping" · L1–L3 icon whooshes, a guilty "hmm" glide · RITUAL water lap, slow wind, chores floating off with a "bloop" · LOGO chime

### T23-compliment-malfunction - Compliment Malfunction
- Feeling: can't take a compliment [shy joy; mixed; comic]
- Mallows: glitzi, blubi | also boppo, pipzi, zuzu
- ToD any | 10/12/15/20 s | cost M | palette A-BRIGHT-GLOW | camera C-DRIFT-IN
- HOOK: WHEN SOMEONE GIVES ME / A COMPLIMENT
- Hook variants:
  - THEM: GREAT IDEA! / ME: SYSTEM MALFUNCTION
  - SOMEONE: YOU'RE SO FUNNY. / ME, A JELLY:
  - HOW I TAKE A COMPLIMENT / (I DON'T)
  - WHEN MY BOSS SAYS / 'NICE WORK' IN PUBLIC
  - ME TRYING TO SAY / 'THANK YOU' NORMALLY
  - THEY SAID SOMETHING NICE. / I FORGOT HOW TO TALK.
  - WHEN A STRANGER / COMPLIMENTS MY TASTE
- Gag: G-JELLYFREEZE (alts G-CRINGE, G-GLITCHSLIP, G-SPLASHSIT). A warm compliment bubble lands; total freeze; a jelly quiver; blush floods in.
- Escalation: M-GLOW. The blush spreads, slow hearts rise, the Mallow wobbles shyly. On Glitzi a slice slips per line, with brightness held constant.
- Lines: "Wait, me?" → "Quick, deflect!" → "Did I say 'you too'?"
- Thought variants:
  - L1: "Nobody's ever said...", "Uh. Um. Thanks?", "Are they joking?"
  - L2: "Make it a joke!", "It was nothing, really.", "Act normal. Too late."
  - L3: "Replay it for a week.", "Hide in my own blush.", "Saving it forever."
- Ritual: R-SAVOUR (alts R-SQUISH, R-DEFRAG). The compliment bubble sinks into the Mallow and warms it from inside: letting it in.
- Resolution: "You can just say thanks. / And keep it."
  - Variants: "Kind words fit you. / Let them stay." · "Compliments are allowed / to land."
- Loop: LP-RETURN. Back to the cover pose; the blush fades by the seam.
- Sound: GAG warm bell ting, jelly wobble (Glitzi: bit-crushed chirps) · L1–L3 warm blush whoosh, heart plinks rising · RITUAL soft absorbing "bloop", bloom, content glide · LOGO chime
- Flags: compliments are about ideas, humour or taste, never appearance.

### T24-one-of-those-days - One of Those Days
- Feeling: tiny annoyances piling up [frustration; difficult; comic]
- Mallows: glitzi, pipzi | also blubi, boppo, zuzu
- ToD any | 10/12/15/20 s | cost M | palette A-BUSY-STILL | camera C-DRIFT-IN
- HOOK: ONE OF THOSE DAYS / WHERE EVERYTHING GOES...
- Hook variants:
  - SPILLED TEA. MISSED BUS. / IT'S 8:15 AM.
  - WHEN THE SMALL THINGS / KEEP GOING WRONG
  - STUBBED MY TOE ON / THE SAME CHAIR. AGAIN.
  - TODAY'S VIBE: / MILDLY CURSED
  - WHEN EVERY LIGHT / TURNS RED FOR YOU
  - LOST MY KEYS. FOUND THEM. / IN MY HAND.
  - ME AFTER THE 9TH / TINY INCONVENIENCE
- Gag: G-BONK (alts G-GLITCHSLIP, G-WEEBLE). A little grey pebble bonks the Mallow; it squashes; a grumpy puff appears.
- Escalation: M-PEBBLES (alt M-CLOUD). One pebble per line, each adding to a grumpy little cloud. No lightning flashes.
- Lines: "Wi-Fi's down. Great." → "Lost a sock. Again." → "Is the universe mad?"
- Thought variants:
  - L1: "The printer. Again.", "Coffee: spilled.", "Phone at 2%."
  - L2: "Who did I upset?", "Seriously, what now?", "Everything's sticky."
  - L3: "I'm going back to bed.", "Today is cancelled.", "Just me vs. the day."
- Ritual: R-WIGGLE (alts R-DEFRAG, R-BREATH). A long jelly wiggle; the pebbles fly off as sparkles; round and fresh again.
- Resolution: "A bad day isn't / a bad life."
  - Variants: "Tiny storms pass too." · "Shake it out. / Start again soft."
- Loop: LP-RETRIGGER. One pebble bonks again on the seam.
- Sound: GAG soft wood-block "tok", squelch, kit "offended" gesture · L1–L3 toks climbing in comic pitch, a low soft grumble from the cloud · RITUAL wobble, sparkle flicks, settle · LOGO chime
- Flags: the Static Storm's "digital lightning" must stay dim and slow in this template.

### T25-phone-call-nerves - When It Actually Rings
- Feeling: phone-call nerves [nerves; difficult; comic]
- Mallows: blubi, zuzu, loomi | also noomi, glitzi
- ToD any | 10/12/15/20 s | cost M | palette A-BUSY-STILL | camera C-DRIFT-IN
- HOOK: WHEN THE PHONE RINGS / AND IT'S NOT A TEXT
- Hook variants:
  - ME PRACTISING A PHONE CALL / BEFORE MAKING IT
  - UNKNOWN NUMBER CALLING. / ME:
  - MY PHONE IS RINGING. / WHO CALLS ANYMORE?
  - WHEN YOU HAVE TO CALL / TO BOOK SOMETHING
  - LETTING IT RING OUT / THEN TEXTING 'HEY, SORRY'
  - MY PHONE BUZZES. / MY WHOLE SOUL: NO.
  - THE CALL WAS 2 MINUTES. / I PREPARED FOR AN HOUR.
- Gag: G-JELLYFREEZE (alts G-SCOOT, G-SINK, G-JOLT). The buzz starts; the Mallow freezes and quivers in time with it.
- Escalation: M-BUZZ. Vibration rings come faster and nudge the Mallow; the ground ripples.
- Lines: "Is it ringing? It is." → "What do I say first?" → "Can they text instead?"
- Thought variants:
  - L1: "Is that... a call?", "Unknown number!", "Hide. Just hide."
  - L2: "Rehearse it. Again.", "What if it's awkward?", "Hello? No. Hi? No."
  - L3: "Let it ring out?", "I'll text them, okay?", "Moving to a cave."
- Ritual: R-BREATH (alts R-SQUISH, R-NAMEIT). After the exhale the Mallow boops the bubble and the rings settle into a warm hum. 10 s versions use R-SQUISH or R-NAMEIT.
  - Name words: nervous. / wobbly. / shy.
- Resolution: "Most calls are shorter / than the dread."
  - Variants: "Nervous and brave / can happen together." · "You can be nervous / and still do it."
- Loop: LP-RETRIGGER. The buzz returns on the seam.
- Sound: GAG soft low buzz pattern, jelly wobble · L1–L3 ring "whooms" quickening · TURN stop · RITUAL breath, boop, the rings settle into a warm chord · LOGO chime
- Flags: "appointment" kept out of hooks (medical adjacency); the buzz never imitates a real ringtone.

### T26-nostalgia - Nostalgia Ambush
- Feeling: a memory out of nowhere [nostalgia; mixed; warm]
- Mallows: noomi, blubi, zuzu | also loomi
- ToD any | 12/15/20 s | cost M | palette A-DIM-SOFT | camera C-DRIFT-IN
- HOOK: WHEN AN OLD SONG COMES ON / AND YOU'RE 15 AGAIN
- Hook variants:
  - FOUND AN OLD PHOTO. / NOW I'M EMOTIONAL.
  - THAT SMELL THAT TAKES YOU / STRAIGHT BACK TO CHILDHOOD
  - ONE SONG AND I'M / BACK IN 2012
  - WHEN A MEMORY HITS / OUT OF NOWHERE
  - SCROLLING OLD PHOTOS / AT MIDNIGHT LIKE...
  - MISSING A TIME, / NOT JUST A PLACE
  - THE NOSTALGIA HIT / NOBODY WARNED ME ABOUT
- Gag: G-DOUBLETAKE (alts G-JELLYFREEZE, G-PUFF). A music-note memory bubble floats past; double take.
- Escalation: M-DREAMBUBBLES (alt M-ORBIT). Warm sepia memory bubbles rise; the colour grade warms; the eyes go a little wet.
- Lines: "Wait, I know this song." → "Summer, years ago..." → "Can I go back? Briefly?"
- Thought variants:
  - L1: "Is that... THE song?", "That old cartoon!", "Remember that summer?"
  - L2: "We were so little.", "Everything felt new.", "Where did time go?"
  - L3: "Happy-sad. Both.", "Okay, I'm emotional.", "Play it again. Again."
- Ritual: R-SAVOUR (alts R-FLOAT-AWAY, R-CLOUDWRAP). The memories drift in and merge into one warm orb that settles into the Mallow's glow: keeping the good part.
- Resolution: "Happy and sad / can share one heart."
  - Variants: "Some memories are / meant to be visited." · "The past still glows / in the good bits."
- Loop: LP-OBJECT. The orb floats up; a new memory bubble drifts in on the seam.
- Sound: GAG a slow original 4-note music-box phrase begins, double-take bips · L1–L3 dream-bubble plinks, wobbly-lip warble on L3 · RITUAL gathering shimmer, bloom, content glide · LOGO chime
- Flags: the "old song" is an original procedural phrase, never a real song. No family members named (grief adjacency).

### T27-someone-remembered - They Remembered
- Feeling: feeling seen [warmth; positive; warm]
- Mallows: blubi, boppo, noomi | also loomi, pipzi, glitzi
- ToD any | 10/12/15/20 s | cost L | palette A-BRIGHT-GLOW | camera C-DRIFT-IN
- HOOK: WHEN SOMEONE REMEMBERS / A TINY THING YOU SAID
- Hook variants:
  - THEY REMEMBERED HOW / I TAKE MY TEA
  - WHEN A FRIEND CHECKS IN / JUST BECAUSE
  - SOMEONE SAVED ME / THE LAST COOKIE
  - WHEN THEY ASK HOW / THE THING WENT
  - THE WARM FUZZY FEELING / WHEN SOMEONE GETS YOU
  - 'THIS REMINDED ME OF YOU' / ME:
  - BEING REMEMBERED HITS / DIFFERENT
- Gag: G-MELT (alts G-JELLYFREEZE, G-SPLASHSIT, G-PUFF). A happy melt: the Mallow goes soft and gooey with joy.
- Escalation: M-GLOW. The blush spreads, slow hearts rise, the good melt deepens.
- Lines: "They remembered?" → "Oh no, I'm melting." → "Best. Person. Ever."
- Thought variants:
  - L1: "Wait... for me?", "They were listening!", "That's so thoughtful."
  - L2: "Act normal. I can't.", "Heart: doing a wobble.", "Am I blushing? Yes."
  - L3: "Keeping them forever.", "Happy tears, sorry.", "Making them a cake."
- Ritual: R-SAVOUR (alts R-LANTERN, R-SQUISH). A warm orb settles inside; the glow blooms; a content wiggle.
- Resolution: "Feeling seen / is a soft kind of magic."
  - Variants: "Little kindnesses / stay with us." · "Remember the people / who remember you."
- Loop: LP-RETURN. Re-forms into the cover pose as the warmth eases back.
- Sound: GAG warm bell ting, a sweet descending melt glide · L1–L3 heart plinks rising, comfort gesture · RITUAL bloom, low-intensity celebrate gesture, pad · LOGO chime
- Flags: a good default for brand-line closers.

### T28-big-feelings-small-thing - Crying at an Advert
- Feeling: big feelings over a small thing [tenderness; mixed; comic]
- Mallows: blubi, noomi | also boppo, zuzu, glitzi
- ToD any | 10/12/15/20 s | cost M | palette A-DIM-SOFT | camera C-DRIFT-IN
- HOOK: ME CRYING AT AN ADVERT / ABOUT A LOST DOG
- Hook variants:
  - WHEN THE KIDS' CARTOON / GETS EMOTIONAL
  - CRYING AT A VIDEO OF / A DUCK MAKING A FRIEND
  - WHY AM I TEARING UP / AT A CEREAL ADVERT?
  - WHEN THE SHOW'S ENDING / IS TOO WHOLESOME
  - ME: I'M NOT EMOTIONAL. / ALSO ME, AT A DOG VIDEO:
  - SOBBING AT A MOVIE / I'VE SEEN 12 TIMES
  - BIG FEELINGS. TINY REASON.
- Gag: G-JELLYFREEZE (alts G-DOUBLETAKE, G-SPLASHSIT). The score's "advert music" swells; freeze; the lip starts to wobble.
- Escalation: M-TEARS (alt M-CLOUD). The eyes well; tear droplets lift in gentle arcs that build into comic waterworks.
- Lines: "Oh no. The music." → "He found his family!" → "I'm fine. Leaking."
- Thought variants:
  - L1: "Wait, is this sad?", "The little duck!", "Not the slow piano."
  - L2: "Who's chopping onions?", "It's just an advert!", "Hold it together..."
  - L3: "Full waterworks.", "Happy crying. Mostly.", "Need a tissue fort."
- Ritual: R-RAINLIFT for blubi/noomi; the others squish or cloud-wrap (alts R-SQUISH, R-CLOUDWRAP). The tears lift upward and turn to little lights; the Mallow glows.
- Resolution: "A soft heart is / a strong thing."
  - Variants: "Big feelings, tiny reasons. / All allowed." · "Tears can be / the happy kind too."
- Loop: LP-RETURN. Back to the cover pose; the advert motif restarts across the seam.
- Sound: GAG an original 3-note celesta "advert music" swell, freeze wobble · L1–L3 lip warble, droplet plinks, a soft (never gross) sniffle · RITUAL droplets rising into chimes, bloom, comfort gesture · LOGO chime
- Flags: US locale uses "AD" for "ADVERT". Keep it light: this is happy crying.

## 4. Slot grammar

A video spec is a template plus a set of slot choices.

**Picture slots.** Changing any of these means a full re-render, about 20–30 min per 15 s on this machine.

| Slot | Chosen from | Constraint |
|---|---|---|
| template | the 28 templates | scheduler cooldowns |
| duration | the template's allowed durations | 15 s by default |
| mallow | primary Mallows (weight 3) or secondary (weight 1) | its realm must offer a time of day the template allows; never an "avoid" Mallow |
| realm | the Mallow's home realm | no guest realms |
| time of day | the realm's times ∩ the template's times | must agree with time words in the hook |
| palette | the template's arc + the realm's base grade | jitter on the world only: hue ±6°, warmth ±0.1, exposure ±0.05 |
| gag | primary or alts the Mallow can perform | the Mallow's signature gag about 40% of the time |
| metaphor | the template's metaphor or alts | — |
| lines | one each from L1/L2/L3, or the curated primary triple | no two lines start with the same word; 2 question marks at most |
| ritual | primary or alts | the Mallow must be allowed it; its minimum duration must fit the ritual window |
| name word | the template's list | only with R-NAMEIT |
| camera | the template's camera list | — |
| seed | — | timing jitter ±80 ms on beats not tied to sound, blink placement, glance targets, orbit slots, mote seeds, decoy-tab layout |

**Audio slots.** These can be re-scored onto an existing picture with `render.mjs --remux`:
- the kit root note (per Mallow);
- the motif contour (from a rising or arching set);
- tick tempo ±10%;
- panning;
- the bed mood, which follows the palette arc.

**Overlay slots** (cheap): the hook text and the resolution text, or a brand closer. They can only be swapped cheaply if stage2 is changed to output a clean picture and the caption layer separately. Today the overlay is composited inside `renderer.renderFrame`. Thought lines sit inside the glass bubbles, so they stay picture slots.

**Time-word rule.** Hooks containing words like "2 AM", "MIDNIGHT", "ALARM", "3 PM", "AFTER LUNCH", "SUNDAY 6 PM" or "FRIDAY NIGHT" force a matching time of day. Captions can name human places (office, sofa), but the realm is never redrawn as one.

**Pipeline:**
1. Pick a template.
2. Pick the Mallow, which is never the previous post's Mallow, then its realm and time of day.
3. Pick the gag, metaphor, ritual and camera.
4. Pick the copy, respecting copy cooldowns, and lint it.
5. Fingerprint the spec and check distance from recent posts; resample up to 50 times.
6. Compile the beat clock into body, face, world, camera, bubble and sound-cue tracks, in the same structure as `videos/my-brain-at-2am-v2.js`.
7. Render, then run QA:
   - `verify.mjs`;
   - the loop-seam check;
   - a brightness scan for flashes;
   - a safe-zone check;
   - filmstrips.

## 5. Rules for staying on-brand and non-repetitive

**Uniqueness:**
- Never publish the same fingerprint twice. The fingerprint covers template, Mallow, time of day, gag, metaphor, ritual, the three lines, hook, resolution, camera and seed.
- Any two videos on one channel within 14 days must differ in at least 3 visible slots (Mallow, hook text, line triple, ritual, gag, realm/time, metaphor). One of the three must be the Mallow or the hook text.
- A video that changes only its overlay (new hook or resolution) counts as the same video. Use those only for hook A/B tests or cross-platform versions.

**Sequencing:**
- No two posts in a row with the same template, Mallow, ritual or gag.
- Every Mallow appears at least once and no more than 3 times in any 10 posts.
- Any 7 posts cover at least 4 feeling families and include at least 2 positive or mixed templates.
- Each template at most twice in 7 days; T01 at most once in 7 days.

**Copy cooldowns:**
- A hook is not reused on a channel for 90 days.
- A thought line appears at most 3 times in 30 days.
- A resolution line appears at most once in 7 days.
- No line appears in two templates; the validator enforces this.
- The brand closer appears in about 30% of posts and never in more than 2 posts in a row.

**End card:** either the template's insight line or a brand closer ("Your second brain / for feelings." or "Give your feelings / somewhere soft to land."), never both. Then the untouched logo on its plate and "hushmallow.com". The brand name is always lowercase. The logo is never recoloured, stretched, outlined, cropped or animated beyond a fade.

**Personality:**
- Each beat is filtered through the app's per-Mallow expression overrides (`expressions.js`) and reactions (`reactions.js`), so the same beat reads differently on each Mallow.
- Noomi, Blubi and Loomi open their eyes only on strong beats and always start and end on their painted face.

**Design:**
- Only the approved hi-res art is used, never enlarged.
- No accessories, limbs or recolouring.
- Deformation limits: squash height 0.6 or more, stretch 1.3 or less, shrink 0.6 or more. The silhouette must always read as that Mallow.
- Faces use only the rig's own vocabulary.
- One Mallow per video, in its own realm. No humans, no new characters, no real brands, apps or songs.
- Cinematic restraint:
  - no camera shake or roll, no cuts;
  - no more than 3 readable texts besides captions;
  - no bouncing or shaking text;
  - no flashes or strobing;
  - no "!" glyph effects, sweat drops or outlined captions.

**Tone:** relatable and kind. Never self-hatred, self-harm, death (even as a joke), illness, body/weight/food guilt, alcohol, drugs or appearance comparisons.

**Capacity:** each template has roughly 10^5–10^6 combinations, and several hundred clearly distinct posts after the 3-slot distance rule. Throughput is limited by rendering (about 55 videos of 15 s per day on 4 cores), not by the library.

## 6. Copy that could read as medical or therapy advice

**Banned in all on-screen copy (the validator rejects these):**
- Clinical and therapy words: therapy, therapist, treatment, cure, heal(ing), diagnosis, symptom, disorder, syndrome, clinical(ly), proven, science-backed, evidence-based, doctor.
- Condition names: anxiety, panic (attack), depression, trauma, triggered, PTSD, OCD, ADHD, bipolar, insomnia, mental illness.
- Body-science claims: nervous system, regulate, vagus, cortisol, dopamine, serotonin.
- Technique names: coping mechanism or skill, grounding technique, breathing exercise, box breathing, 4-7-8, self-soothe, "name it to tame it", CBT, DBT, mindfulness exercise.
- Breath-holding: "hold your/my breath", "breath hold".
- Harm and death: self-harm, suicide, "kill me", "I'm dead", dying, "life or death".
- Labels: crazy, insane, psycho, toxic, gaslight, narcissist.

**Caution (the validator warns):** anxious, overstimulated, sensory overload, burnout, brain fog, intrusive, ruminate, dissociate, boundaries, you should / you need to / you must, fix, instantly, feel better, stop overthinking, mental health, breathe in/out, inhale/exhale.

**Swaps:**

| Avoid | Use instead |
|---|---|
| imposter syndrome | imposter feeling, "fraud" |
| anxiety / panic | nervous, jittery, wobbly, the spiral |
| overstimulated | a lot, too loud |
| brain fog / burnout | 3 pm slump, social battery |
| intrusive thoughts | the replay, that cringe memory |
| set boundaries | a kind no, your time counts too |
| any calming or stress claim | no claim at all; the Mallow's moment speaks |
| breathing instructions | none; the Mallow is shown breathing, never told |

**Specific decisions in this library:**
- No "imposter syndrome" anywhere.
- I removed:
  - "What's wrong with me?" (self-blame);
  - "Did I lock the door?" (reads as clinical checking);
  - symptom lines such as dry mouth, racing heart and sweating;
  - "Cancel more things?" (reads as encouraging withdrawal);
  - "LIFE OR DEATH";
  - "Your brain isn't broken" (implies a disorder frame);
  - references to drinking water, the dentist and caffeine (health-advice adjacency).
- No breath words in any escalation line.
- R-BREATH has no counts or holds, a crest of 0.35 s or less, and an exhale at least 1.5× the inhale.
- There is no underwater ritual, and G-SINK keeps the mouth above the waterline.
- Missing-someone and nostalgia are capped at gag intensity 0.4 with no "gone forever" lines.
- No heartbeat sounds and no alarm or ringtone imitations.
- Every resolution is an observation or a kindness, never a fix or a promised outcome.

## 7. What has to be built before most templates can render

- **Per-Mallow hi-res assets.** Only Noomi has them (`assets/noomi/`). `derive_noomi_hires.py` needs to be generalised to remove and measure the painted face on the other six. Glitzi, Zuzu, Boppo and Pipzi have painted open eyes, iris sprites and brows, so their face models differ from Noomi's.
- **Realm worlds in WebGL at v2 quality.** Six more are needed (static-storm, raindrop-lagoon, spiral-observatory, sunpop-orchard, spark-festival, blue-drift), ported from the app's realm code. Each must have its four mood dials and its transformation, with every looping element repeating cleanly over D. Today's lake world can be reused for Noomi.
- **New props in the glass style:** cards and tabs, the battery meter, the cloud, the spotlight cone, droplets, sparks, lanterns and blocks.
- **New body motions:** uniform shrink and sideways slide; the soft body currently has squash, inflate, lean, sway, shimmer and lift.
- **A clean picture plus a separate caption layer** in stage2, so overlay slots can be swapped cheaply.