# Wave 3 game specs (Reset 023-038, Reframe 023-038)

Same rules as wave 2: keep the mechanism, verb, beats and ethics; invent the rest to make it premium, hypnotic and funny.
Read `games/BUILDING_GAMES.md` first (it has been updated: kit fixes, timing notes, `strands[].generic`). Every game must
play well with no words (`ctx.text === ''`). Strands marked `generic: true` were not written by the player: show them as
gentle examples ("a thought like..."), never as the player's own words.

---------------------------------------------------------------------------------------------------------------------------
## RESET

### R023 `silly-voice` — Silly Voice · INTERRUPT
- **Parents:** Inner Speech / Mental Text · Overthinking / Thought Fusion · Performance / Confidence. **Cast:** loopie, glitch. **Poster:** loopie `laugh`.
- **Mechanism:** cognitive defusion by silly voices (ACT, Hayes): hearing a harsh thought in a cartoon voice loosens its grip;
  the words stay the same, their authority doesn't.
- **Verb:** turn the knobs and sliders of a retro voice-changer machine (pitch, speed, wobble, echo), then hit PLAY.
- **Beats:** a chunky 80s voice machine with VU meters and tape reels. The critic's line (the core strand, else a generic one
  shown as an example) loads on a cassette. Presets to discover: Helium, Robot, Slow-mo Giant, Opera, Sports Commentator,
  Tiny Mouse. Use `speechSynthesis` **only with voices where `localService === true`** (on-device, so the words never leave
  the phone); if none, a babble synth (syllable blips shaped to the words) with the text bouncing in a bubble. Loopie and
  Glitch crack up at each version. **Twist:** the grand finale: the whole cast sings the line as an over-the-top opera
  trio while the words physically wobble and fall apart into confetti.
- **Finale:** the tape ejects as a gold "Greatest Hits" cassette; the line is still there, but tiny and funny.
- **Come back:** collect voice presets (new one unlocked each visit), daily machine skin, best "loosest grip" rating.
- **Share:** "Played my inner critic back in a helium voice. It lost the argument."

### R031 `walk-on-song` — Walk-On Song · ACT
- **Parents:** Performance / Confidence · Getting Started · Positive State. **Cast:** rush, sync, patch. **Poster:** rush `celebrate`.
- **Mechanism:** arousal reappraisal (Brooks 2014; Jamieson et al.): saying "I'm excited" instead of trying to calm down
  turns pre-performance nerves into energy and improves performance.
- **Verb:** tap the beat to build the crowd's hype, and drag a big fader from NERVES to EXCITED as you re-read each body cue.
- **Beats:** backstage tunnel before a walk-on; your heart is pounding (a pulse you can see). Pick a walk-on beat (three
  synthesized anthems). Each body cue (racing heart, butterflies, shaky hands; from the analysis or generic) appears as a
  meter labelled NERVES; drag it across to EXCITED while Rush explains the same sensation as fuel. Tap on the beat to build
  the crowd chant. **Twist:** the lights cut out right before you go on (the classic wobble); breathe once (hold), the
  crowd starts chanting your name-less hype line, the lights slam back on.
- **Finale:** walk out (swipe up) into a stadium of lights, pyrotechnic flames on the beat, confetti cannons.
- **Come back:** anthem collection, daily venue (club, stadium, school hall, rooftop), best hype combo, tiers.
- **Share:** "Turned my nerves into a walk-on song."

### R024 `moth-jar` — Moth Jar · ORGANISE
- **Parents:** Overthinking / Thought Fusion · Uncertainty / Future Worry / Reassurance · Sleep / Winding Down. **Cast:** still, loopie. **Poster:** still `calm`.
- **Mechanism:** mental noting / labelling (mindfulness noting; affect labelling, Lieberman et al. 2007): naming a thought's
  type ("worrying", "planning", "remembering", "judging") puts space between you and it and quietens it.
- **Verb:** sweep a soft net through the air to catch fluttering moths; flick each into the jar that names its type.
- **Beats:** a warm porch lamp at dusk; moths (each carrying a strand) flutter erratically around the light, which is your
  attention. Slow sweeps catch better than frantic ones (hypnotic, calm skill). Four labelled jars: WORRY, PLAN, MEMORY,
  JUDGEMENT. Still says the label softly as each moth lands. **Twist:** a moth that is a real task (from `task`) glows
  differently: it goes onto a small note "tomorrow, 10 minutes", not into a jar.
- **Finale:** the lamp dims, the jars glow like lanterns, the moths turn into fireflies that drift into the garden.
- **Come back:** a field guide of moth species (named by labelling skill), daily dusk palette, best calm sweep.
- **Share:** "Caught 9 thought-moths and named every one."

### R030 `let-it-float` — Let It Float · DISTANCE
- **Parents:** Memory / Replay / Rumination · Emotion · Values / Meaning / Grief. **Cast:** drop, still. **Poster:** drop `calm`.
- **Mechanism:** "leaves on a stream" (ACT defusion exercise): placing each thought on a leaf and watching it float away
  practises noticing thoughts without holding on.
- **Verb:** fold a paper boat (two or three folding drags), set it on the water, then let the current take it.
- **Beats:** a sunlit stream with stones, ferns and dappled light, gentle water sound. Each thought (strands) is written on a
  sheet; fold it into a boat (satisfying crease physics and paper sounds); place it on the water; it bobs away. Ripples
  follow your finger. **Twist:** one boat snags on a rock and spins (the sticky thought); nudge the water near it, never
  the boat itself, until it frees and floats on: "Some take longer. That's fine."
- **Finale:** the boats gather on a wide lake at sunset, little lights flicker on in each, and they drift out of sight.
- **Come back:** paper colours and boat designs, daily season on the stream, best gentle release.
- **Share:** "Folded 5 paper boats and let them float."

### R025 `clear-the-desk` — Clear the Desk · ORGANISE
- **Parents:** Mental Overload / Working Memory · Getting Started · Decision Pressure. **Cast:** patch, rush. **Poster:** patch `think`.
- **Mechanism:** cognitive offloading and triage (Risko & Gilbert 2016): getting the jumble out of your head and sorting it
  frees working memory and makes the next step obvious.
- **Verb:** flick sticky notes into three trays: NOW, LATER, NOT MINE; then pick one NOW note to pin up.
- **Beats:** a delightfully messy desk seen from above: sticky notes (strands, task, generic items), coffee rings, cables,
  crumpled paper. Flicking a note sends it sliding with real friction into a tray (thunk, paper riffle). Each sort tidies
  something on the desk (a cable coils itself, a mug cleans itself). **Twist:** a stack of notes is glued together: peel
  them apart to find three separate small things inside one big worry.
- **Finale:** the clean desk, warm lamp, a plant, and one note pinned in the middle; drawers slide shut in sequence.
- **Come back:** desk items collection (lamp, plant, figurines) unlocked by visits, daily desk theme, best tidy.
- **Share:** "Cleared a desk of 14 worries. One note left."

### R037 `blanket-fort` — Blanket Fort · QUIET
- **Parents:** Emotion · Sleep / Winding Down · Social / Team / Perspective. **Cast:** patch, drop, still. **Poster:** patch `cosy`.
- **Mechanism:** self-soothing through the five senses (DBT self-soothe skill): building comfort on purpose calms distress
  and loneliness.
- **Verb:** drag blankets, pillows, fairy lights and cushions into place; each snaps with soft-body cloth physics.
- **Beats:** a living room on a rainy evening. Drape blankets over chairs (cloth that sags and folds), stuff pillows, string
  fairy lights (drag along a path, they light one by one), add a warm drink (steam) and a soft sound (rain, music box).
  Each item soothes a sense and the room warms in colour. Characters crawl in when invited. **Twist:** thunder rumbles; a
  blanket slips; Patch and Drop hold it up while you pin it with a clothes peg.
- **Finale:** inside the fort, glowing lights, rain outside, everyone snug; the camera pulls out to the cosy window at night.
- **Come back:** fort decorations collection, daily weather outside, a new guest on later visits.
- **Share:** "Built a blanket fort. Rain outside, fairy lights inside."

### R026 `snow-globe` — Snow Globe · GROUND
- **Parents:** Attention / Grounding / Mental Quiet · Overthinking / Thought Fusion · Panic / Body Alarm. **Cast:** still, sync. **Poster:** still `meditate`.
- **Mechanism:** the "snow globe mind" (mindfulness): agitation swirls everything; holding still lets it settle and things
  become clear. Slow breathing and stillness speed the settling.
- **Verb:** shake (rapid swipes), then hold your finger perfectly still on the globe while you breathe slowly.
- **Beats:** a beautiful glass globe on a wooden base, a tiny village inside. Your thoughts swirl as letters among the snow.
  Shake it: a blizzard with whooshing sound. Hold still: the snow settles in slow motion; each slow out-breath (guided ring)
  makes it settle faster; the thought-letters sink and dissolve into the ground. **Twist:** Sync bumps the table: snow
  flies again, and you learn that settling again is the skill, not staying still forever.
- **Finale:** crystal clear: lights come on in the village, a tiny train runs, smoke curls from chimneys; the globe glows.
- **Come back:** a shelf of globes (new village scene each visit), daily season inside, best settle time.
- **Share:** "Shook it up, held still, watched it settle."

### R032 `breath-maze` — Breath Maze · GROUND
- **Parents:** Panic / Body Alarm · Attention / Grounding / Mental Quiet · Sleep / Winding Down. **Cast:** still, rush. **Poster:** still `calm`.
- **Mechanism:** box breathing (4-4-4-4; used by first responders): equal in, hold, out, hold slows breathing and steadies
  attention.
- **Verb:** trace a glowing marble around a square path at breath pace: one side per phase.
- **Beats:** a carved wooden labyrinth seen from above; a glowing marble; each straight side of a square loop is one phase
  (IN, HOLD, OUT, HOLD) with a soft tone that rises, holds, falls. Keep the marble in the glow (too fast and it outruns
  the light). Each completed box opens a door to the next, larger loop (slower count). **Twist:** the walls start to
  rotate and the square becomes a slow spiral that the marble follows by itself while you just breathe.
- **Finale:** the maze unfolds into a mandala of light; the marble settles in the centre.
- **Come back:** maze designs by day, collected marbles by tier, best steady box.
- **Share:** "Breathed my way through a 4-4-4-4 maze."

### R027 `kite-line` — Kite Line · DISTANCE
- **Parents:** Uncertainty / Future Worry / Reassurance · Mental Imagery · Overthinking / Thought Fusion. **Cast:** sync, drop. **Poster:** sync `happy`.
- **Mechanism:** self-distancing (Kross & Ayduk): viewing a worry from further away lowers its emotional intensity and
  widens perspective.
- **Verb:** crank the reel (circle gesture) to let line out; tap to tug when gusts dip the kite.
- **Beats:** a grassy hilltop; the worry is written on a bright kite. Let line out and it climbs: the words shrink, the
  view widens (fields, a river, a town, the coastline). Gusts tug: small taps keep it steady. Birds join; clouds pass
  below. **Twist:** a big gust; the line hums; hold the reel still and the kite steadies on its own: you don't have to
  fight every gust.
- **Finale:** the kite is a tiny dot in a huge sunset sky; tie the line to a fence post and lie back in the grass.
- **Come back:** kite designs collection, daily sky and landscape, best steady flight.
- **Share:** "Flew my worry so high it became a dot."

### R036 `lily-pads` — Lily Pads · ACT
- **Parents:** Getting Started · Uncertainty / Future Worry / Reassurance · Performance / Confidence. **Cast:** loopie, rush. **Poster:** loopie `determined`.
- **Mechanism:** taking the next step without certainty (graded approach; tolerating uncertainty): the path appears as you
  move, not before.
- **Verb:** press-and-release to hop (hold longer for a longer hop), landing on lily pads.
- **Beats:** a misty pond at dawn; a frog (Loopie in a frog hat, or a drawn frog with Loopie cheering) on the bank; the far
  shore is the goal (the task or "the thing"). Only the next pad is visible in the mist; each hop reveals the next. Landing
  gives a satisfying splash-squish; a slightly short hop still lands (a wobble, never a fail). Some pads carry micro-steps.
  **Twist:** a big gap with no pad; a log floats into place only after you commit to the hop (you jump into the mist and
  it holds).
- **Finale:** the mist lifts from the whole pond; the path behind you glows; the frog sits proud on the far bank, dragonflies.
- **Come back:** pond seasons by day, frog outfits by tier, best clean hops.
- **Share:** "Couldn't see the path. Hopped anyway. Made it."

### R028 `mirror-dance` — Mirror Dance · CONNECT
- **Parents:** Social / Team / Perspective · Positive State · Emotion. **Cast:** sync, patch, loopie. **Poster:** sync `laugh`.
- **Mechanism:** interpersonal synchrony (Hove & Risen 2009; Tarr et al. 2015): moving in time with others boosts mood,
  closeness and trust.
- **Verb:** copy the dancer's moves with swipes and taps on the beat (up, down, left, right, spin, clap), then lead and
  watch them copy you.
- **Beats:** a disco floor with a light-up grid; Sync dances a short move (four beats), you mirror it; matching makes the
  floor light up and the music add layers. **Twist:** roles swap: you invent the moves and the whole cast copies you
  (delight in being followed).
- **Finale:** a conga line of every character, mirror ball, spotlights sweeping, freeze-frame pose.
- **Come back:** dance move collection, daily floor style (70s disco, neon, garden party), best sync streak in-session only.
- **Share:** "Danced in sync with the whole cast."

### R033 `bouncer` — Bouncer · CONNECT
- **Parents:** Communication / Boundaries · Social / Team / Perspective · Values / Meaning / Grief. **Cast:** patch, rush, glitch. **Poster:** patch `cool`.
- **Mechanism:** assertiveness practice: rehearsing kind-but-firm "no" and "not now" responses builds confidence in
  setting boundaries (assertiveness training; DBT DEAR MAN).
- **Verb:** at the velvet rope, swipe to let a request in, hold up a palm (hold) for a kind no, or offer a "not tonight,
  but..." card.
- **Beats:** you're the bouncer at the door of your own evening (a cosy club called YOUR TIME). Requests queue in comic
  costumes ("Can you just quickly...", "One more favour", "Reply right now!"; from the analysis or a generic set). Pick the
  response card (kind no, offer, yes with limits); the request reacts (most are fine with it!). The club inside stays
  chill and the music clear when you hold your boundaries; it gets crowded if you let everything in. **Twist:** a
  pushy request that tries guilt ("after everything I've done?"): stay kind and firm; Patch coaches the wording.
- **Finale:** closing time: the club glows, your evening is yours, the velvet rope sparkles.
- **Come back:** phrasebook of boundary lines collected, daily club theme, tiers by kind-firm balance.
- **Share:** "Worked the door of my own evening. Kind no, firm rope."

### R029 `tiny-garden` — Tiny Garden · AMPLIFY
- **Parents:** Positive State · Values / Meaning / Grief · Emotion. **Cast:** drop, still. **Poster:** drop `grow`.
- **Mechanism:** gratitude practice (Emmons & McCullough 2003): noting a few specific good things lifts mood and broadens
  attention.
- **Verb:** plant a seed (drag into soil), water it (hold the can), and pull the sun across (drag) to grow it.
- **Beats:** a small terracotta garden bed on a balcony. Three good things (quick chips with specifics: who, what, small
  wins) each become a seed; each grows a unique procedural flower (stem L-system, petals, colour from the kind of good
  thing) with lovely growth animation and sound. **Twist:** a weed of a worry pops up (a strand); you don't yank it, you
  plant a flower next to it and the flower's leaves shade it until it shrinks.
- **Finale:** bees and butterflies visit; a golden-hour photo of your bed.
- **Persistence:** the garden is saved (`ctx.TS.store`) and grows across visits (a bigger bed, new pots): the strongest
  comeback hook in the set. Never wilts if you stay away.
- **Share:** "Planted 3 good things. They're blooming."

### R035 `kintsugi` — Kintsugi · CLARIFY
- **Parents:** Values / Meaning / Grief · Identity / Self · Emotion. **Cast:** drop, still. **Poster:** drop `calm`.
- **Mechanism:** self-compassion and meaning-making (Neff; growth after adversity): treating the hard parts of your story
  with care, not shame, makes them part of a stronger whole.
- **Verb:** trace each crack slowly with liquid gold (the gold follows your finger and pools beautifully).
- **Beats:** a broken bowl's pieces on a cloth; fit them together (drag pieces into place, satisfying clicks). Each crack is
  something hard (a strand, or a gentle generic "a rough week"). Trace the crack with gold; a quiet kind line appears as the
  gold cools (vibe-aware, never cheesy). **Twist:** one tiny piece is missing; instead of hiding it, fill the gap with a
  gold patch shaped like something that matters to you (a value chip).
- **Finale:** the bowl turns slowly on a stand in warm light, gold seams glowing, catching the light.
- **Come back:** a shelf of mended bowls across visits, daily glaze colours, best steady trace.
- **Share:** "Mended a broken bowl with gold. The cracks are the best part."

### R034 `brain-pinball` — Brain Pinball · INTERRUPT
- **Parents:** Overthinking / Thought Fusion · Mental Overload / Working Memory · Memory / Replay / Rumination. **Cast:** glitch, rush. **Poster:** glitch `wow`.
- **Mechanism:** absorbing visuospatial play interrupts rumination and intrusive replay (Holmes et al. 2009: the Tetris effect
  on intrusive memories); a short burst of engaged attention resets the loop.
- **Verb:** flip the flippers (tap left/right sides) to keep the ball alive and send thought-balls into the PARK IT hole.
- **Beats:** a gorgeous neon pinball table themed as a brain (lobes as bumpers, synapse ramps). Thought-balls carry
  strands; hit bumpers, light lanes, trigger multiball. Sinking a thought in PARK IT files it away for later (a satisfying
  vacuum tube). Never a game over: drained balls return. **Twist:** multiball of every loop at once, then the table slows
  to a calm, single glowing ball you can just watch roll.
- **Finale:** the table lights up in a full attract-mode light show; the score is "thoughts parked".
- **Come back:** table themes by day, best score (calm skill, no timers), tiers.
- **Share:** "Parked 7 thoughts in Brain Pinball."

### R038 `doodle-monster` — Doodle Monster · PLAY
- **Parents:** Creativity / Mind Play · Emotion · Overthinking / Thought Fusion. **Cast:** loopie, sync. **Poster:** loopie `silly`.
- **Mechanism:** externalising a feeling as a character (narrative therapy externalisation; art-based expression): giving
  it a shape and a silly life makes it separate from you and easier to handle.
- **Verb:** draw freely with your finger; the game brings your doodle to life.
- **Beats:** a sketchbook page; "draw how this feeling looks" (any scribble works). Your strokes become a living creature:
  the game finds the shape's body, adds googly eyes and little legs, and it wobbles to life (verlet springs along your
  strokes). Name it with a silly generator (vibe-aware). Feed it, tickle it, tell it to sit; it shrinks as you care for it.
  **Twist:** it tries to grow big and scary; you draw a tiny hat on it and it becomes ridiculous.
- **Finale:** your monster waves goodbye and curls up to sleep in the corner of the page; the page saves as a card.
- **Come back:** a sketchbook gallery of your monsters, daily pen colours, unlockable accessories.
- **Share:** "Drew my stress. It's a tiny wobbly monster now." (The card shows the doodle, never the player's words.)

---------------------------------------------------------------------------------------------------------------------------
## REFRAME (family `REFRAME` for all)

### F023 `zoom-out` — Zoom Out
- **Parents:** Beliefs / Evidence · Emotion · Memory / Replay / Rumination. **Cast:** sync, glitch. **Poster:** sync `wow`.
- **Mechanism:** correcting the mental filter and overgeneralising (Beck): one bad moment, cropped tight, looks like the
  whole story; zooming out restores the rest of the picture.
- **Verb:** pinch/drag to zoom out (and back in) on a photo of your week.
- **Beats:** a tight, grainy close-up of the bad moment (the situation) fills the screen, captioned with the hot thought.
  Zoom out: the frame widens through a giant mosaic of tiles (other moments of the week: neutral, good, ordinary; generic
  and gently labelled, plus any true facts from the analysis); the caption updates to fit what's now in view. **Twist:**
  zoom out far enough and the whole mosaic forms a picture (a sunrise, a face, a map), and the bad tile is one pixel of it.
- **Finale:** the mosaic animates (tiles flip in a wave) and settles into the big picture with the fair thought.
- **Come back:** mosaic pictures collected, daily mosaic theme, best "fair caption" choices.
- **Share:** "Zoomed out on a bad moment. It was one tile of a much bigger picture."

### F031 `behind-the-post` — Behind the Post
- **Parents:** Identity / Self · Social / Team / Perspective · Performance / Confidence. **Cast:** patch, sync, drop. **Poster:** patch `wink`.
- **Mechanism:** correcting upward social comparison (Festinger; social media comparison research): comparing your
  behind-the-scenes with others' highlight reels distorts self-judgement.
- **Verb:** flip each glossy post to see behind the scenes (card flip), then flip your own story to see its highlights.
- **Beats:** a fake, invented social feed of perfect posts (no real people or brands: bubble characters and invented users),
  glossy and flawless. Flip each to reveal the outtakes: the 47 attempts, the mess off-camera, the nerves before the
  "effortless" talk (funny, kind). **Twist:** your own day appears as a messy behind-the-scenes; flip it the other way to
  find its highlights (true small wins from the analysis or chips).
- **Finale:** a feed of "real posts" (front and back side by side) that glows; your post gets kind comments from the cast.
- **Come back:** an album of outtakes (big pool), daily feed theme, tiers.
- **Share:** "Flipped 8 perfect posts. Everyone's got outtakes."

### F024 `both-and-dj` — Both/And DJ
- **Parents:** Emotion · Identity / Self · Decision Pressure. **Cast:** sync, rush, loopie. **Poster:** sync `cool`.
- **Mechanism:** dialectical thinking (DBT "both/and"): holding two true things at once ("I'm struggling AND I'm coping")
  replaces either/or thinking and reduces distress.
- **Verb:** crossfade between two decks (drag the crossfader), scratch (circle on the platter) and drop the beat (tap).
- **Beats:** a DJ booth at a rooftop party. Deck A plays the hot thought as a looping track; Deck B loads true counterweights
  (facts, values, strengths from the analysis or chips). Find the mix where both play together: the crowd goes wild when
  both are audible. Each "AND" line appears as a big lyric ("I'm nervous AND I'm prepared"). **Twist:** the crowd requests
  only Deck A (the either/or trap); you blend in B and they like it better.
- **Finale:** the drop: lights, lasers, confetti; the both/and lines scroll as the encore lyrics.
- **Come back:** record crate collection (track styles), daily venue, best blend.
- **Share:** "Mixed 'I'm struggling' AND 'I'm coping'. The crowd loved it."

### F036 `nature-doc` — Nature Doc
- **Parents:** Social / Team / Perspective · Emotion · Inner Speech / Mental Text. **Cast:** glitch, drop, loopie. **Poster:** glitch `nerd`.
- **Mechanism:** self-distancing by describing (DBT observe/describe; third-person self-talk, Kross et al. 2014): narrating
  your situation like a calm wildlife documentary separates description from judgement.
- **Verb:** pan the documentary camera (drag) to frame the moment, then choose the narrator's line (descriptive vs
  judgemental cards).
- **Beats:** a lush documentary set: you (a bubble-character stand-in) "in the wild" of the situation. A calm narrator voice
  (an original invented narrator, never an imitation of a real person) describes: "Here we see the human, awaiting a
  reply..." Judgemental lines make the footage glitch; descriptive ones make it beautiful. Gentle comedy throughout.
  **Twist:** the camera crew (characters) comment on how common this behaviour is in the species (normalising).
- **Finale:** the documentary's title card and credits roll ("Filmed on location in your Tuesday").
- **Come back:** episode collection (daily habitat: office savannah, group-chat coral reef, kitchen tundra), tiers.
- **Share:** "My Tuesday, narrated as a nature documentary. Fascinating species."

### F025 `not-just-me` — Not Just Me
- **Parents:** Identity / Self · Social / Team / Perspective · Emotion. **Cast:** patch, drop, sync. **Poster:** patch `hug`.
- **Mechanism:** common humanity (Neff's self-compassion): realising many others feel the same turns "something's wrong
  with me" into "this is human".
- **Verb:** pull the big lever to light up a stadium: seats light for everyone who has felt this; tap sections to hear
  their one-line stories.
- **Beats:** a dark stadium; your seat lights first. Name the feeling (from the analysis or chips). Pull the lever: seats
  flicker on in waves (with honest framing: "lots of people", never invented statistics presented as fact; if you show
  numbers, label them as illustration). Tap sections for short, kind, invented-but-plausible voices ("I felt that before my
  first shift") that are clearly from fictional fans. **Twist:** the screen shows the stadium from space: lights all over
  the world.
- **Finale:** the whole stadium does a wave of light; a banner: "Not just you."
- **Come back:** stories album, daily venue, gentle tiers.
- **Share:** "Turns out it's not just me. A whole stadium lit up."

### F029 `bubble-council` — Bubble Council
- **Parents:** Social / Team / Perspective · Decision Pressure · Beliefs / Evidence. **Cast:** all seven. **Poster:** glitch `think`.
- **Mechanism:** perspective-taking (CBT "what would someone else say?"): hearing several distinct viewpoints on the same
  facts breaks the single-story view.
- **Verb:** deal the case card onto the round table, then rotate the lazy Susan (circle gesture) to hear each member, and
  stack the cards you agree with.
- **Beats:** a candlelit round table; the seven bubble characters each speak from their speciality (Glitch logic, Patch
  relationships, Drop meaning, Rush action, Still calm, Sync emotions, Loopie the loop it sees), each a card with one line
  built from the analysis (alternatives, balanced, leads). **Twist:** Loopie argues for the scary story; the council
  doesn't silence it, it gives it one seat out of seven.
- **Finale:** the council votes with glowing tokens; the verdict card prints with the fair thought and a next step.
- **Come back:** council member cards (variants per visit), daily room, tiers.
- **Share:** "Called a council of 7. The scary story got 1 vote."

### F026 `load-test` — Load Test
- **Parents:** Beliefs / Evidence · Uncertainty / Future Worry / Reassurance · Overthinking / Thought Fusion. **Cast:** rush, glitch. **Poster:** rush `determined`.
- **Mechanism:** evaluating evidence (Beck): conclusions that rest on feelings and assumptions don't hold weight; facts do.
- **Verb:** build a bridge by dragging planks across a canyon, then send the test truck (tap) and watch the physics.
- **Beats:** a canyon between "the situation" and "the conclusion". Planks are claims (facts = solid timber, feelings and
  assumptions = cardboard, from spans and exhibits). Build, then run the truck: cardboard sags and snaps (spectacular
  but cartoony physics), facts hold. **Twist:** rebuild toward a different destination (the fair thought) with the facts
  you have: the truck crosses easily.
- **Finale:** fireworks over the canyon; the truck honks; a plaque on the bridge with the fair thought.
- **Come back:** truck and bridge styles, daily canyon, best fewest-snaps build.
- **Share:** "My worst-case bridge was made of cardboard. The fact bridge held."

### F038 `shaky-tower` — Shaky Tower
- **Parents:** Beliefs / Evidence · Identity / Self · Inner Speech / Mental Text. **Cast:** glitch, loopie. **Poster:** glitch `scan`.
- **Mechanism:** testing which supports a belief rests on (Beck): when you remove the assumptions, a harsh conclusion often
  can't stand.
- **Verb:** slowly drag blocks out of a stacked tower (steady hands; the tower wobbles with real physics).
- **Beats:** the conclusion sits on top of a tall wooden block tower; each block is a support (facts vs assumptions,
  labelled from the analysis). Pull the assumption blocks out carefully (tension, creaks, wobble). **Twist:** pull the last
  assumption and the conclusion topples (slow-motion crash); rebuild a short, steady tower from fact blocks with the fair
  thought on top.
- **Finale:** the new tower glows; dust settles in a sunbeam.
- **Come back:** wood types by tier, daily table, best steady pull.
- **Share:** "Pulled out the assumptions. The harsh thought fell over."

### F027 `coach-swap` — Coach Swap
- **Parents:** Inner Speech / Mental Text · Performance / Confidence · Identity / Self. **Cast:** rush, patch, still. **Poster:** rush `determined`.
- **Mechanism:** self-compassion improves motivation more than self-criticism (Breines & Chen 2012): swapping a drill
  sergeant inner voice for a kind, specific coach helps you try again.
- **Verb:** drag the coach's voice sliders (harsh → kind, vague → specific, past → next step) and watch your athlete react.
- **Beats:** a sports track; your athlete (a bubble character) stumbles over the hurdle from the analysis. The drill
  sergeant critic barks the hot thought; the athlete slumps and slows. Swap coaches: slide each dimension; the coach's line
  rewrites live (harsh "You blew it again" → kind "That was hard"; vague → specific "the second hurdle"; past → next step
  "lift the knee earlier"). The athlete visibly perks up and runs better. **Twist:** the sergeant says "Kindness makes you
  soft!" and you run it both ways and compare the times (the kind run is faster).
- **Finale:** a podium, medals, a slow-motion victory lap with the coach's line on the stadium board.
- **Come back:** coach lines collection, daily sport (track, swimming, climbing wall), tiers.
- **Share:** "Fired my drill-sergeant inner voice. Hired a coach."

### F030 `what-i-knew-then` — What I Knew Then
- **Parents:** Memory / Replay / Rumination · Identity / Self · Decision Pressure. **Cast:** still, drop. **Poster:** still `think`.
- **Mechanism:** hindsight bias (Fischhoff 1975): once you know the outcome, the past looks more predictable than it was;
  judging past-you by present knowledge is unfair.
- **Verb:** scrub a film timeline back to the moment of the decision, then tap away everything you didn't know yet (it fogs).
- **Beats:** your memory as a film reel; at the decision point, everything you know now is on screen (the outcome, the later
  facts) mixed with what you knew then. Tap each later-known thing and it fades into fog; what's left is the small, foggy
  view past-you actually had. **Twist:** play forward from there with only that information: past-you's choice looks
  reasonable.
- **Finale:** a kind letter from now-you to then-you assembles from choices; the reel glows warm.
- **Come back:** reels collection, daily film stock (sepia, VHS, polaroid), tiers.
- **Share:** "Judged my past self with today's information. Not fair. Rewound."

### F028 `chisel` — Chisel
- **Parents:** Inner Speech / Mental Text · Beliefs / Evidence · Overthinking / Thought Fusion. **Cast:** still, glitch. **Poster:** still `determined`.
- **Mechanism:** de-absolutising (Beck; Ellis): removing absolute words (always, never, everyone, nothing, completely) leaves
  a statement that is truer and calmer.
- **Verb:** tap the chisel along the stone to knock off absolute words (each tap chips; rhythm matters), then polish (circle).
- **Beats:** a marble block with the thought carved in; absolute words stick out as rough protrusions. Chip them off: stone
  chips fly, dust, satisfying clinks; the sentence re-carves itself to the truer version ("I always mess up" → "I messed
  this one up"). **Twist:** an absolute word is load-bearing; remove it and the meaning collapses; carve in a fair
  replacement ("sometimes", "this time", "some people").
- **Finale:** polish reveals a gleaming statue/plaque; light from a skylight; Still nods.
- **Come back:** stone types, plaque collection, daily studio, tiers.
- **Share:** "Chiselled the 'always' out of a thought. It's a statue now."

### F032 `headline-desk` — Headline Desk
- **Parents:** Uncertainty / Future Worry / Reassurance · Beliefs / Evidence · Communication / Boundaries. **Cast:** glitch, rush. **Poster:** glitch `coffee`.
- **Mechanism:** decatastrophising language (Beck; Burns): rewriting a tabloid-style catastrophe into a sober, accurate
  headline reduces its emotional charge.
- **Verb:** drag word tiles to replace loud words, then slam the press (hold).
- **Beats:** a newspaper office at deadline. The tabloid front page screams the thought in giant type ("DOOMED!"). The
  editor (Glitch) hands you a tray of sober word tiles; swap the loud ones (drag), fact-check each claim against the
  analysis (stamped TRUE / UNVERIFIED). **Twist:** the sub-editor (Rush) wants it even louder for clicks; you hold the line.
- **Finale:** the presses roll (massive machinery animation and sound), the sober broadsheet lands on doorsteps at dawn.
- **Come back:** front pages archive, daily masthead, tiers.
- **Share:** "Turned 'DOOMED!' into 'Meeting moved to Thursday'."

### F033 `dont-open-it` — Don't Open It
- **Parents:** Uncertainty / Future Worry / Reassurance · Urges / Habit Loops · Overthinking / Thought Fusion. **Cast:** rush, still, loopie. **Poster:** rush `worried`.
- **Mechanism:** reducing reassurance-seeking and checking (intolerance of uncertainty, Dugas et al.): checking soothes for
  a moment and keeps the worry alive; letting the question sit teaches you can handle not knowing.
- **Verb:** resist: a glowing mystery box tempts you to shake/open it; instead, place it on the shelf (drag) and do
  absorbing small things around the room (tap tasks). The less you check, the calmer it gets.
- **Beats:** a cosy room; a box labelled with the uncertainty ("WHAT IF THEY'RE ANGRY?"). Loopie keeps nudging it toward you
  (the urge). Shaking gives a tiny relief sparkle, then the box grows heavier and louder (the checking cycle, shown
  gently, never punished). Put it on the shelf and water a plant, tidy a stack, make tea: the box quietens. **Twist:** the
  box opens by itself at the end, and inside is "you were okay not knowing".
- **Finale:** a calm room, sunset light, the box an ordinary ornament on the shelf.
- **Come back:** room objects collection, daily room, best "let it sit" tier.
- **Share:** "Didn't open the worry box. Watered a plant instead."

### F034 `circle-of-control` — Circle of Control
- **Parents:** Uncertainty / Future Worry / Reassurance · Mental Overload / Working Memory · Decision Pressure. **Cast:** still, rush, patch. **Poster:** still `calm`.
- **Mechanism:** the dichotomy of control (Stoicism; ACT acceptance and committed action): sorting worries into what you can
  influence and what you can't directs energy to action and lets the rest be.
- **Verb:** drag worry stones into three rings (CONTROL, INFLUENCE, NOT MINE), then pull a lever on the controllable ones.
- **Beats:** a zen garden table with three raked rings; worry stones (strands, unknowns, generic) on the edge. Each ring
  responds differently (control: stones become levers; influence: stones grow a little bridge; not mine: they become
  weather clouds you watch drift). **Twist:** a stone that seems uncontrollable has a small controllable part: tap to
  split it.
- **Finale:** pull the levers: little lights turn on across a miniature town; the clouds drift past; balance.
- **Come back:** garden stones collection, daily season, tiers.
- **Share:** "Sorted my worries: 3 levers, 2 bridges, 5 clouds drifting by."

### F035 `snowball` — Snowball
- **Parents:** Overthinking / Thought Fusion · Uncertainty / Future Worry / Reassurance · Panic / Body Alarm. **Cast:** loopie, still. **Poster:** loopie `worried`.
- **Mechanism:** interrupting a catastrophic spiral with questions (Socratic questioning, Beck): each question slows the
  "and then... and then..." chain and breaks it into realistic pieces.
- **Verb:** drag fences and speed bumps (question cards) onto the slope ahead of a growing snowball.
- **Beats:** a mountain slope; a thought rolls downhill, gathering "and then" layers and growing. Place question barriers
  ("What's the evidence?", "What else could happen?", "Could I cope?", "What would I tell a friend?"); each hit slows it
  and knocks off a layer (snow chunks fly). **Twist:** the snowball splits into small, manageable snowballs; you build a
  tiny snowman from them (playful).
- **Finale:** sunshine over the valley; the snowman wears a scarf with the fair thought.
- **Come back:** snowman outfits, daily mountain, tiers.
- **Share:** "Stopped a worry snowball with 4 questions. Built a snowman."

### F037 `thought-lab` — Thought Lab
- **Parents:** Beliefs / Evidence · Performance / Confidence · Social / Team / Perspective. **Cast:** glitch, sync. **Poster:** glitch `nerd`.
- **Mechanism:** behavioural experiments (Bennett-Levy et al.): treating a belief as a prediction and planning a small real
  test is one of the most powerful ways to change it.
- **Verb:** pour liquids between beakers (tilt-drag) to mix a hypothesis, a test and a prediction; seal the experiment.
- **Beats:** a glowing lab. The belief is the hypothesis ("If I speak up, they'll laugh"). Pour in a small, safe test
  (chips: ask one question, send one message), set your prediction strength (fill level), and choose how you'll know
  (observation). Bubbling reactions, glassware clinks. **Twist:** a "safety behaviour" contaminant (over-rehearsing,
  avoiding eye contact) makes the result unreadable; filter it out.
- **Finale:** the experiment card is sealed in a glowing capsule labelled with the date to try it; the lab lights up.
- **Come back:** experiment notebook (plans you made), daily lab glassware, tiers.
- **Share:** "Designed a tiny experiment to test a scary thought."
