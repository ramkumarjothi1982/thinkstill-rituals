# Wave 2 game specs (Reset 011-022, Reframe 011-022)

Each spec is a brief, not a cage: keep the mechanism, the verb, the beats and the ethics; invent everything else to make it
premium, hypnotic and funny. Read `games/BUILDING_GAMES.md` first. Every game must also play well with no words
(`ctx.text === ''`): use the warm generic content suggested in the spec.

---------------------------------------------------------------------------------------------------------------------------
## RESET

### R011 `slow-drum` — Slow Drum · GROUND
- **Parents:** Panic / Body Alarm · Emotion · Sleep / Winding Down. **Cast:** still (host), sync, patch. **Poster:** still `music`.
- **Mechanism:** rhythmic entrainment plus alternating left-right tapping (as in the "butterfly hug" self-soothing technique):
  playing along with a beat that slowly falls from about 100 to 60 BPM brings breathing and arousal down with it.
- **Verb:** alternate taps on two hand drums (left, right) on the beat. Keys: ArrowLeft/ArrowRight and F/J.
- **Beats:** night campfire clearing, two big drums at the bottom. Beat starts ~96 BPM (Gentle 84, Full 108). Every hit: skin
  ripple, ember burst, a deep drum (`A.drum` with reverb), and a beat ring your tap should meet ("in the pocket" glow;
  off-beat taps still sound, never fail). Hold the groove and characters join the circle one by one, each adding a layer
  (shaker, wood block, bass). The player's strands appear as sparks above the fire that pop when hit on the beat.
  **Twist:** the tempo begins to slow 2-3 BPM every few bars ("FOLLOW THE SLOWER BEAT"); at ~66 BPM the pattern becomes
  two taps (in) then a long rest (out), so the exhale is longer.
- **Finale:** the fire settles to embers that rise into a starry sky; the beats you played draw a constellation; a tempo
  line shows 96 → 60.
- **Come back:** `K.best` groove accuracy, tier; daily campfire place (beach, forest, snow, desert); a new instrument joins
  the circle after repeat visits (kalimba, rain stick, frame drum...).
- **Share:** "Drummed my heart rate down from 96 to 60 BPM." **No words:** sparks read "TOO MUCH", "WHAT IF", "RUSH".
- Use `K.rhythm({ bpm, onBeat })`, `R.set(bpm)` to slow, `R.judge()` for timing (audio-time accurate).

### R022 `pop-therapy` — Pop Therapy · FEEL
- **Parents:** Emotion · Mental Overload / Working Memory · Overthinking / Thought Fusion. **Cast:** sync, loopie. **Poster:** sync `laugh`.
- **Mechanism:** a short burst of controllable, satisfying sensory release (bubble wrap) discharges tension and resets
  attention; the sheets get slower and more rhythmic so the session ends calm.
- **Verb:** tap to pop; later swipe along a row to chain-pop; hold to squeeze the giant one.
- **Beats:** a glossy sheet of bubble wrap (canvas domes with highlights). Some bubbles hold the player's fragments
  (`K.phrases` / strands) as tiny text. Each pop: crisp pop with a pentatonic pitch from its position (you play melodies),
  squash, plastic flecks, the dome wrinkles flat; word bubbles burst into letters that scatter. Sheet 2: chain rows
  (ratatat). **Twist:** the Mega Bubble holds the core thought; hold to squeeze it until it bursts in slow motion.
  Sheet 3 is the slow sheet: bubbles glow in a breathing sequence (4 in, 6 out); pop in rhythm as it slows.
- **Finale:** the flat sheet shimmers into a rainbow and folds itself into a paper crane that flies off; "You popped 214".
- **Come back:** daily sheet pattern (hex, heart, star) and special bubble types on a daily rotation (golden, glitter,
  heart: never random rewards); `K.best` rhythm accuracy on the slow sheet.
- **Share:** "Popped 214 bubbles and one giant worry." **No words:** bubbles read "ugh", "so much", "what if".

### R012 `urge-surf` — Urge Surf · CHOOSE
- **Parents:** Urges / Habit Loops · Emotion · Panic / Body Alarm. **Cast:** rush, drop. **Poster:** rush `determined`.
- **Mechanism:** urge surfing (Marlatt; Bowen & Marlatt 2009): urges rise, peak and pass like waves when you ride them
  without acting; feeling the crest and the fall teaches that the urge is temporary.
- **Verb:** balance: drag left/right (or arrow keys) to keep the surfer in the glowing sweet spot of a moving wave face.
- **Beats:** golden-hour ocean; the urge is named on a buoy (`analysis.urge`, else "the urge"). Wave 1 small: learn
  balance; the board leaves a trail. Wave 2 bigger: an urge meter rises 1-10; soft prompts ride the wave ("notice it in
  your chest", "breathe out"). **Twist:** the peak curls into a slow-motion barrel; hold your line through it. Then it
  subsides into foam and the meter falls: "It passed. You didn't have to do anything."
- **Finale:** paddle in at sunset; footprints count the waves you rode; Drop draws a heart in the sand.
- **Come back:** `K.best` smoothest ride, tiers earn board designs; daily break (tropical, cold water, night surf with
  bioluminescence).
- **Share:** "Rode an urge until it passed. 3 waves, zero wipeouts." **No words:** buoy reads "THE URGE".

### R020 `north-star` — North Star · CLARIFY
- **Parents:** Values / Meaning / Grief · Identity / Self · Decision Pressure. **Cast:** drop, still. **Poster:** drop `idea`.
- **Mechanism:** values-based action (ACT, Hayes et al.): picking a personal value as a direction (not a goal) and steering
  back to it whenever difficult thoughts push you off course builds psychological flexibility.
- **Verb:** steer: drag the tiller / turn the wheel to keep the bow on your chosen star while gusts push you off.
- **Beats:** night sea, a small sailboat, a sky where each bright star is a value (Kindness, Courage, Honesty, Curiosity,
  Connection, Growth, Calm, Play; suggest three from the analysis). Tap to choose: it brightens and its constellation forms.
  Gusts carry the player's strands as dark cloudlets that push the boat off course; every correction chimes ("you came
  back"); the wake shows each return. **Twist:** fog hides the star; hold the heading by the compass memory: values are
  still there when you can't feel them. Fog lifts. At the harbour, pick one small action today that points that way
  (`analysis.tinyStep` or three suggestions).
- **Finale:** the lighthouse greets you; your whole route draws itself into the constellation.
- **Come back:** an atlas of the values you've sailed by (`K.collect`); daily sky (moon phase, aurora nights); tier for a
  steady course.
- **Share:** "Sailed by Courage tonight."

### R013 `domino-start` — Domino Start · ACT
- **Parents:** Getting Started · Performance / Confidence · Mental Overload / Working Memory. **Cast:** rush, patch. **Poster:** rush `celebrate`.
- **Mechanism:** behavioural activation and the two-minute start (implementation intentions, Gollwitzer): shrinking a task to
  a tiny first action builds momentum. Dominoes make momentum visible; a domino can topple one about 1.5x its size, so
  small really does move big.
- **Verb:** drag dominoes into place along a path (snap), then flick the first one.
- **Beats:** warm wooden table; the task (`analysis.task`, else "the thing I'm putting off") is a bell at the far end. Its
  3-5 micro-steps become domino labels (from `tinyStep` plus generic micro-steps: "open it", "write one line"). Place
  them with satisfying snaps; spacing matters and the guide shows it. **Twist:** the last domino is the whole task, far too
  big; add growing intermediate dominoes until the chain can reach it. Flick the tiny first one: accelerating clicks, the
  camera follows, slow motion on the big fall, the bell rings.
- **Finale:** confetti, a card "Your first domino: <tiny step>. Two minutes." (no countdown).
- **Come back:** domino sets unlock with tiers; daily table (kitchen, desk, café, garden); collect chain shapes (spiral,
  staircase, split).
- **Share:** "Tipped one tiny domino. The big one fell too."

### R016 `gut-coin` — Gut Coin · CHOOSE
- **Parents:** Decision Pressure · Uncertainty / Future Worry / Reassurance · Overthinking / Thought Fusion. **Cast:** glitch, patch. **Poster:** glitch `idea`.
- **Mechanism:** the coin-flip gut check: your instant reaction to a coin's result (relief or disappointment) shows what you
  already prefer. It cuts through overthinking; it never decides for you.
- **Verb:** flick: drag and release the coin upward (strength sets height and spin); tap to catch.
- **Beats:** name the two options with quick chips (prefill from the analysis; generic pairs: Stay/Go, Say it/Leave it,
  Now/Later; editable). Drag each onto a coin face. Flick: a heavy metal coin with spin blur and ringing; bullet time at
  the apex: "Quick: which side are you hoping for?" Tap one. It lands. "It says X. You were hoping for Y." Relief or
  disappointment? **Twist:** Glitch offers "Best of three?" Wanting a re-flip is itself the answer, played for laughs.
- **Finale:** the coin melts into a medal stamped with your gut choice; one gentle next step ("Sleep on it, then do five
  minutes of Y tomorrow").
- **Care:** when `analysis.safety === 'care'` it is a clarity check, not a decider, and says so.
- **Come back:** a daily mint (coin designs of the world via `K.dailyPick`); "you trusted your gut 4 times" across visits.
- **Share:** "Flipped a coin and found out what I actually wanted."

### R014 `sense-hunt` — Sense Hunt · GROUND
- **Parents:** Attention / Grounding / Mental Quiet · Panic / Body Alarm · Overthinking / Thought Fusion. **Cast:** still, loopie. **Poster:** still `calm`.
- **Mechanism:** 5-4-3-2-1 grounding: noticing five things you see, four you hear, three you can touch, two you smell and one
  you taste pulls attention out of the alarm loop into the present.
- **Verbs:** find and tap; listen and point; rub textures; follow a scent with a slow drag; hold to sip.
- **Beats:** an illustrated cosy scene with parallax (daily: rainy café window, forest cabin, beach hut, city balcony at
  night). SEE 5: small things that come alive when found (a cat's tail, steam, a bird). HEAR 4: spatial sounds (rain left,
  kettle right, wind chime above, a dog far off): tap where each comes from; the soundscape builds. **Twist:** the
  player's strands try to interrupt as notification pop-ups; swipe them away gently and go back to the sounds. TOUCH 3:
  rub a wool blanket, a smooth stone, tree bark, each with its own sound and haptic pattern. SMELL 2: follow a scent curl
  with a slow drag (a slow breath in). TASTE 1: choose tea, mint or orange; hold for a slow sip.
- **Finale:** the scene saturates from grey-blue to full warm colour; Still by the window: "You're here."
- **Come back:** each scene hides a sixth secret thing that appears on later visits (`K.visits`), collected in a scrapbook.
- **Share:** "5 things I saw, 4 I heard... and I'm back in the room."

### R018 `cloud-shapes` — Cloud Shapes · PLAY
- **Parents:** Creativity / Mind Play · Overthinking / Thought Fusion · Attention / Grounding / Mental Quiet. **Cast:** loopie, sync. **Poster:** loopie `silly`.
- **Mechanism:** playful imagination (finding shapes in clouds) is absorbing and effortless; it shifts attention from
  rumination into a curious, positive mode, and turning worries into silly creatures loosens their grip (defusion).
- **Verb:** trace a loop around a cloud; it morphs into the creature you "saw" and comes alive.
- **Beats:** lying on the grass with Loopie; big soft procedural clouds drift. Tracing a cloud matches the trace's shape to a
  library of simple drawn creatures (whale, rabbit, dragon, teapot, dinosaur, sheep, rocket, octopus...) that then animate
  (the whale swims off). Loopie names each one in the vibe's voice. **Twist:** grey thought-clouds roll in carrying the
  player's strands; tracing them turns them into ridiculous creatures too ("What-if Walrus" in a party hat).
- **Finale:** sunset parade of every creature; night falls and they become constellations: "Your sky: 7 creatures".
- **Come back:** a sky bestiary of 30+ creatures that fills over visits; daily weather and time of day.
- **Share:** "Found a What-if Walrus in the clouds. 7 creatures in my sky today."

### R015 `squish` — Squish · QUIET
- **Parents:** Panic / Body Alarm · Sleep / Winding Down · Emotion. **Cast:** sync, still. **Poster:** sync `calm`.
- **Mechanism:** progressive muscle relaxation (Jacobson; Bernstein & Borkovec): briefly tensing then releasing muscle
  groups lowers physical arousal, and the contrast teaches the body what letting go feels like.
- **Verb:** hold to squeeze (tense your real muscles with it), release to melt.
- **Beats:** a soft jelly companion with real soft-body wobble (spring mesh). Rounds: hands ("make fists"), shoulders
  ("up to your ears"), face ("scrunch"), optionally feet. Hold ~5 s: it squishes, reddens, creaks; release: it melts and
  wobbles, cools, a long exhale sound, ~10 s of melt with drifting motes while a body silhouette glows where you let go.
  Its face blushes when squeezed and goes blissful when melting. Gentle = shorter holds; always "about 70%, no pain".
  **Twist:** the last round is everything at once: the biggest squeeze, then the jelly puddles into a warm bath.
- **Finale:** a still puddle reflecting stars; the silhouette glows head to toe.
- **Come back:** daily jelly flavour and colour; collect jelly friends; `K.best` stillest melt.
- **Share:** "Squeezed, then melted. Shoulders officially down from my ears."

### R021 `dream-deck` — Dream Deck · QUIET
- **Parents:** Sleep / Winding Down · Overthinking / Thought Fusion · Mental Overload / Working Memory. **Cast:** still, loopie. **Poster:** still `sleepy`.
- **Mechanism:** the cognitive shuffle (serial diverse imagining, Beaudoin): picturing a slow series of random, neutral,
  unrelated things mimics the drifting imagery of sleep onset and crowds out worry.
- **Verb:** drag a card up slowly to flip it, then rest your finger while its picture forms.
- **Beats:** made for bed: dark, warm, low contrast, low volume, no flashes, slowly dimming. A deck of soft cards, one calm
  concrete word each (BLANKET, OTTER, LANTERN, PEBBLE, KITE...; a pool of 150+, nothing emotional). Flip one; hold still ~5
  s while a delicate generative watercolour of the word blooms and Still murmurs ("its colour... its weight").
  Each card is slower and dimmer. **Twist:** Loopie tries to sneak a worry card (a strand) into the deck; it turns face
  down by itself and drifts away: "not tonight". After 8-12 cards (Gentle fewer) the spread lays out like a sky.
- **Finale:** the cards float up as stars and the screen settles near black. End quietly.
- **Come back:** a dream journal of words you've imagined; daily art style (watercolour, chalk, ink); nights played (no streaks).
- **Share:** "Shuffled 12 dream cards and drifted off."

### R017 `joy-fireworks` — Joy Fireworks · AMPLIFY
- **Parents:** Positive State · Emotion · Values / Meaning / Grief. **Cast:** sync, loopie, drop. **Poster:** sync `celebrate`.
- **Mechanism:** savouring (Bryant & Veroff): deliberately expanding a good moment by attending to its details amplifies and
  extends positive emotion.
- **Verb:** build shells (drag sense ingredients into the mortar), then swipe up to launch; tap on the beat for the finale.
- **Beats:** harbour at night, skyline, Sync directs the show. The good moment comes from the player's words (Positive
  State) or quick chips ("a good moment today, even a small one"). Each detail you add (who was there, what you saw, a
  sound, how your body felt, why it mattered) becomes a shell type (peony, willow, crossette, ring, heart) coloured by the
  sense. Launch: it rises, bursts with the detail word in the centre for a moment, crackle and boom in sync.
  **Twist:** the grand finale: tap on the music's beats to fire bigger and bigger shells (on-beat = bigger, never a fail).
- **Finale:** smoke clears to reflections on the water and a cheering crowd; replay the show you made.
- **Come back:** collect shell types by using different senses; `K.best` finale combo; daily venue (harbour, mountain lake,
  desert, snowy village).
- **Share:** "Turned one good moment into a 9-shell fireworks show."

### R019 `pass-the-glow` — Pass the Glow · CONNECT
- **Parents:** Social / Team / Perspective · Communication / Boundaries · Values / Meaning / Grief. **Cast:** patch, drop, still. **Poster:** patch `love`.
- **Mechanism:** loving-kindness practice (Fredrickson et al. 2008; Hutcherson et al. 2008): directing simple good wishes to
  yourself and others raises social connection and positive emotion, even in short doses.
- **Verb:** hold to charge a glowing orb with a kind wish, then drag or fling it to the next house.
- **Beats:** a dark hillside village at night. Yourself: hold while "May I be okay" (vibe variants) forms; your window
  lights. Someone you care about (pick an icon: friend, family, partner, pet; no names): carry the orb along the path.
  Someone neutral (the barista, the bus driver): fling it to a distant window. **Twist:** someone difficult, optional and
  gentle ("only if you want"): the orb flickers, then steadies with a longer hold. Everyone: the orb splits into hundreds of
  seeds that drift to every house.
- **Finale:** the whole hillside glows, fireflies rise, Patch hugs.
- **Come back:** the village grows a new house each visit (`K.visits`); daily season; lantern styles.
- **Share:** "Lit up a whole village with one small kind wish."

---------------------------------------------------------------------------------------------------------------------------
## REFRAME (family `REFRAME` for all)

### F011 `objection` — Objection!
- **Parents:** Beliefs / Evidence · Inner Speech / Mental Text · Social / Team / Perspective. **Cast:** glitch, patch, still. **Poster:** glitch `determined`.
- **Mechanism:** catching thinking traps as they happen (Beck's cognitive restructuring): naming the distortion loosens
  belief in the thought; then you state it fairly.
- **Verb:** tap OBJECTION! at the exact moment a distorted phrase is spoken, then choose the grounds.
- **Beats:** a dramatic courtroom. The Inner Critic prosecutes (Glitch, smug); you defend with Patch; Still judges; the cast
  is the jury. The prosecutor reads the case line by line from `analysis.thought` / `spans`; distorted spans (`kind:'brain'`,
  `distortions[].quote`) glow faintly as they are spoken. OBJECTION! (screen shake, burst, stinger), then pick the grounds
  from three: Speculation (mind reading), Calls for a prediction (fortune telling), Overreach (all-or-nothing), Name-calling
  (labelling), Facts not in evidence (jumping to conclusions), Should-ing (rigid rule). "Sustained!" or "Overruled, but
  close..." (learning, never a penalty). **Twist:** the prosecutor's closing goes rapid-fire; chained objections build a
  combo. Defence closing: arrange 2-3 fragment cards into the fair statement (`analysis.balanced`); Patch reads it.
- **Finale:** the jury whispers; verdict "NOT PROVEN"; gavel slam, court papers fly, sunlight through tall windows.
- **Come back:** a law book of the objection types you've used, with case counts; tiers by accuracy; daily court (night
  court, rooftop court, tiny claims court).
- **Share:** "OBJECTION! Sustained. My worst thought got thrown out of court."

### F021 `psychic-refund` — Psychic Refund
- **Parents:** Social / Team / Perspective · Uncertainty / Future Worry / Reassurance · Beliefs / Evidence. **Cast:** glitch, sync, patch. **Poster:** glitch `scan`.
- **Mechanism:** testing mind reading (Beck; Burns): treating "I know what they think" as a hypothesis (what did they actually
  say or do, what else could it mean, how could I find out) reduces social anxiety.
- **Verb:** rub the crystal ball (circle gesture) to cycle readings; stamp the refund ticket.
- **Beats:** a carnival at night; "MADAME CERTAIN: I KNOW WHAT THEY THINK" (Glitch in costume) pronounces the player's
  mind-read with crystal-ball theatrics. Demand proof at three stalls: what they actually said or did (`spans` camera),
  what else it could mean (rub the ball to cycle `analysis.alternatives`, each a different smoke colour and voice), how you
  could find out (a lead: ask, wait, check). Each check stamps the ticket. **Twist:** the ball cracks; Madame admits she
  never read minds; the ball becomes a mirror: "Neither do you." Pick the most plausible reading.
- **Finale:** the machine prints a golden refund ticket with the fair thought; the Ferris wheel lights up.
- **Come back:** bust a new fake psychic tool each visit (tarot, tea leaves, palm, horoscope); daily carnival attractions.
- **Share:** "Got a full refund from a fake psychic. Turns out I can't read minds either."

### F012 `worst-case-plinko` — Worst-Case Plinko
- **Parents:** Uncertainty / Future Worry / Reassurance · Decision Pressure · Panic / Body Alarm. **Cast:** rush, glitch. **Poster:** rush `surprised`.
- **Mechanism:** decatastrophising with chained probabilities (Leahy): a worst case usually needs several things to go wrong
  in a row; multiplying honest odds shows it is far less likely than it feels, and planning how you'd cope shrinks the fear.
- **Verb:** set each gate's odds (drag), then hold to stream 100 balls through the board.
- **Beats:** a giant neon plinko board; the fear sits in the WORST CASE slot. Build the chain: 3-4 links it needs (from the
  analysis, else "it goes wrong", "nobody helps", "it can't be fixed", "it ruins everything"); for each set "honestly, how
  likely?" with the gut "feels like" shown beside it. Stream the balls: glorious clatter, pitched clicks; each gate splits
  them by its odds into other slots ("awkward but fine", "partly wrong, fixable", "something else entirely"). The worst-case
  slot gets a few. **Twist:** Rush: "But what if it DID happen?" Drag three coping resources (people, steps, skills) into
  the slot and it becomes "Hard, but I'd handle it". Reveal "Feels like 80%. Chain says about 4%" with the honest maths.
- **Finale:** jackpot lights on the realistic slots; a ticket strip prints "Most likely: ...".
- **Care:** when `fear_support` is strong, take it seriously: the coping plan is the hero, not the odds.
- **Come back:** ball skins by tier; daily board theme; best "gap closed" between feel and chain.
- **Share:** "My worst case needed 4 things to go wrong. Odds: about 1 in 25."

### F018 `claw-machine` — Claw Machine
- **Parents:** Overthinking / Thought Fusion · Decision Pressure · Mental Overload / Working Memory. **Cast:** glitch, rush, loopie. **Poster:** loopie `wow`.
- **Mechanism:** workability (ACT) and cost-benefit analysis (CBT): asking what holding a thought costs and what it gives
  makes it easier to loosen your grip on unhelpful thoughts and keep a useful version.
- **Verb:** steer the claw (drag) and drop it (tap); open your hand to let go.
- **Beats:** a glowing claw machine full of capsules, each holding one of the player's thoughts (strands, core). Steer the
  swinging claw, drop, grab (arcade sounds, lights). On the counter: what holding it costs (sleep, mood, time, confidence,
  people) and what it gives (protection, motivation, feeling prepared) weigh on a little scale. **Twist:** the claw slips,
  like every real claw machine; Glitch: "Sometimes the best grip is letting go." Choose to open the claw and let an
  unhelpful one fall. The final grab is the prize capsule: the workable version (`analysis.balanced`) or one action.
- **Finale:** prize-chute fanfare, tokens rain, the capsule opens on a bubble-character figurine holding the reframe.
- **Ethics:** it looks like an arcade game but rewards are never random: figurines are earned deterministically.
- **Come back:** collect figurines (variants by mastery tier); daily machine skin.
- **Share:** "Let go of 3 thoughts, kept 1 that actually helps."

### F013 `sticker-shock` — Sticker Shock
- **Parents:** Identity / Self · Performance / Confidence · Inner Speech / Mental Text. **Cast:** patch, sync, drop. **Poster:** patch `determined`.
- **Mechanism:** de-labelling (Burns; Beck): swapping a global label ("I'm a failure") for a specific, fair description of a
  behaviour in a situation ("I missed one deadline this week") reduces shame and keeps responsibility proportionate.
- **Verb:** peel a sticker slowly from its corner (real curl, shine and stretch).
- **Beats:** your bubble figure covered in loud labels ("IDIOT", "LAZY", "FAILURE", "TOO MUCH": from the labelling
  distortion, else a generic set). Peel: sticky crackle; underneath, the specific behaviour in the player's own words where
  possible (`spans` camera). **Twist:** a stubborn label tears halfway; peel it in short tugs; under it a hidden strength
  ("cares a lot"). Re-label with fair, specific stickers (`evidence_against`, `balanced`): "usually reliable", "learning",
  "had a hard week". The figure goes from slumped to standing.
- **Finale:** the sticker sheet becomes a holographic card of your fair self-description; Patch high-fives.
- **Come back:** a sticker book that fills across visits (holographic and glitter by tier); daily sheet themes.
- **Share:** "Peeled off 4 harsh labels. Underneath: a person having a hard week."

### F014 `should-forge` — Should Forge
- **Parents:** Inner Speech / Mental Text · Performance / Confidence · Communication / Boundaries. **Cast:** rush, still. **Poster:** rush `determined`.
- **Mechanism:** from demands to preferences (Ellis's REBT; Burns): rigid should/must/always rules turn wishes into
  commands that fuel guilt and anger; rewording them as preferences keeps the value without the pressure.
- **Verbs:** hold to pump the bellows; hammer on the beat (tap); drag to bend; drag down to quench.
- **Beats:** a blacksmith's forge (coals, sparks). The should-sentence (from the should distortion, else "I should be
  further along") is a rigid iron bar with the words stamped in. Heat it until the letters soften. Hammer on the beat
  (`K.rhythm`): sparks and clang, the word SHOULD deforms. Bend it: the stamped words morph into the preference ("I'd like
  to..., and if I don't, I'm still okay"; should → I'd like to, must → I'd prefer to, always → often, never → not yet).
  **Twist:** a second bar about other people ("They should...") becomes a boundary: "I'd prefer they..., and I can ask."
  Quench: a huge steam hiss.
- **Finale:** the forged piece becomes a charm on a keyring with the new phrase; it glints.
- **Come back:** collect charms (shapes vary); rhythm tiers; daily forge (desert, snowy smithy, mountain hall).
- **Share:** "Forged my shoulds into something I can actually carry."

### F015 `spotlight` — Spotlight
- **Parents:** Social / Team / Perspective · Performance / Confidence · Memory / Replay / Rumination. **Cast:** patch, rush, sync, glitch. **Poster:** patch `shy`.
- **Mechanism:** the spotlight effect (Gilovich, Medvec & Savitsky 2000): people overestimate how much others notice their
  mistakes; seeing what others are actually attending to corrects the bias.
- **Verb:** drag the spotlight across the audience to reveal what each person is thinking.
- **Beats:** you're on a stage under a harsh spotlight; the moment you worry about replays as a tiny scene. Guess first:
  "How many noticed?" (a slider). Take the spotlight: drag it over the dark audience; thought bubbles reveal most people
  thinking about their own lives ("Did I leave the oven on?", "I'm starving", "My talk is next", "Is my hair weird?"), and a
  few who noticed kindly ("happens to everyone"). A counter tallies. **Twist:** the light swings to show every audience
  member under their own little spotlight: everyone feels watched. Compare the guess to the reveal; the fair statement.
- **Finale:** curtain call; a standing ovation for being human; roses; the harsh light softens to warm house lights.
- **Come back:** an album of funny audience thoughts (80+ in the pool, new ones each visit); daily venue (theatre, school
  hall, office meeting, wedding, group chat).
- **Share:** "I thought everyone noticed. The spotlight says: 2 out of 30."

### F019 `night-shift` — Night Shift
- **Parents:** Sleep / Winding Down · Uncertainty / Future Worry / Reassurance · Overthinking / Thought Fusion. **Cast:** still, loopie, drop. **Poster:** still `sleepy`.
- **Mechanism:** night-time thinking is more catastrophic (tiredness and darkness amplify threat); naming that bias and
  postponing the worry to a set daylight time (worry postponement, Borkovec) reduces night rumination.
- **Verbs:** drag the sun up the horizon to scrub from 3 a.m. to 10 a.m.; fold a letter; hold to seal it with wax.
- **Beats:** a bedroom at 3:07 a.m.; the thought is a monstrous shadow on the wall cast by a small object on the desk. Drag
  the sun: morning light shrinks the shadow to its real size and reveals the ordinary object; the thought's wording calms
  from night version (the conclusion) to morning version (the balanced thought). Two or three facts that are true at 10
  a.m. appear. **Twist:** drag back to night and the shadow grows again: "Same thought. Different hour." Postpone: fold a
  note to morning-you, seal it, post it "Open at 10 a.m."
- **Finale:** night again but calm: moonlight, a tiny shadow, stars at the window, very soft audio: "The worry has an
  appointment tomorrow. You can sleep."
- **Come back:** daily moon phase; collect the small objects that cast big shadows (a sock that looked like a monster).
- **Share:** "At 3 a.m. it was a monster. At 10 a.m. it was a sock."

### F016 `gold-pan` — Gold Pan
- **Parents:** Emotion · Positive State · Beliefs / Evidence. **Cast:** drop, rush. **Poster:** drop `happy`.
- **Mechanism:** correcting the mental filter and discounting the positive (Beck; Burns): low mood keeps the negatives and
  throws out the rest; searching on purpose for the overlooked true and good facts restores a fair picture.
- **Verbs:** swirl the pan (circle gesture); pick gold flecks with tweezers (tap or drag); bite-test.
- **Beats:** a sunlit river; Drop the prospector. The day is a pan of gravel with dark heavy stones labelled with the
  negatives (`evidence_for`, spans) on top. Swirl: water spins, light gravel washes out, gold flecks surface: overlooked
  facts (`evidence_against`, neutral facts, small good things) with a glint and chime; pick them into a vial.
  **Twist:** fool's gold, a fleck that looks good but isn't true ("everyone loves you"): bite-test it and toss it. We want
  true facts, not toxic positivity. Weigh the stones against the vial: the scale evens out.
- **Finale:** the vial pours into a mould: a gold nugget engraved with the fair thought; the river sparkles at sunset.
- **Come back:** collect nuggets (size by true facts found, never random); daily river (alpine, canyon, rainforest).
- **Share:** "Panned my day for gold. Found 5 true good things the gloom was hiding."

### F017 `body-radio` — Body Radio
- **Parents:** Panic / Body Alarm · Uncertainty / Future Worry / Reassurance · Emotion. **Cast:** still, sync. **Poster:** still `music`.
- **Mechanism:** reinterpreting body sensations (Clark's cognitive model of panic; arousal reappraisal, Jamieson et al. 2012):
  a racing heart, quick breathing and dizziness are usually the normal adrenaline response; reading them as "my body is
  revving up" instead of "danger" breaks the panic loop.
- **Verb:** turn a big dial (drag around it) to tune; fine-tune with small moves; hold and release to breathe.
- **Beats:** a vintage radio by the bed; static; the needle on STATION DANGER where a distorted announcer reads catastrophic
  takes on the player's sensations (`analysis.body`, else heart, breath, dizzy). For each sensation, tune through the band:
  static hiss, flickering stations (DANGER, ADRENALINE, TIRED, TOO MUCH COFFEE); lock onto the clear station with a calm,
  accurate explanation ("A racing heart is your body pumping more oxygen. It's built for this."); static clears into warm
  music. **Twist:** the breath station: a slow pulse; hold on the in-breath, release on the long out-breath; the alarm's
  volume knob turns down with each breath.
- **Care, always:** a clear station: "If this is new, severe or you're unsure, call a doctor or 000." (No jokes near it.)
- **Finale:** STATION OKAY plays a full song; the room warms; the dial glows.
- **Come back:** collect station cards (sensation + explanation); daily radio model; tier for a smooth tune.
- **Share:** "Tuned my body from STATION DANGER to STATION ADRENALINE."

### F020 `thought-train` — Thought Train
- **Parents:** Overthinking / Thought Fusion · Inner Speech / Mental Text · Beliefs / Evidence. **Cast:** loopie, glitch. **Poster:** loopie `think`.
- **Mechanism:** separating facts from interpretations (Beck's event vs thought; ACT defusion): sorting what a camera would
  record from what the mind added weakens fusion with the story.
- **Verb:** tap the track switch as each carriage approaches to send it to FACT (main line) or STORY (the Maybe siding).
- **Beats:** a tilt-shift model railway with a junction; a train of carriages, each labelled with a piece of the player's
  words (`spans`: camera = FACT, brain = STORY, plus generic ones). Glitch the conductor explains each call in a line ("a
  camera couldn't record 'they hate me': that's story"). Misroutes are gently rerouted, never failed. **Twist:** a glued
  carriage mixes fact and story ("They didn't reply = they're angry"): tap to decouple it, then route each half. At
  Reality Station the facts train is short; the siding keeps the stories as "maybe", not facts. Choose a kind next stop
  from `analysis.leads` / `tinyStep` on the destination board.
- **Finale:** the facts train departs through a sunset landscape to "Next stop: <action>", whistle, a heart of steam.
- **Come back:** train liveries by tier; daily landscape (mountains, coast, snow, blossom).
- **Share:** "Sorted my thoughts into facts and stories. The facts train was 3 carriages long."

### F022 `good-enough-bakery` — Good Enough Bakery
- **Parents:** Getting Started · Performance / Confidence · Mental Overload / Working Memory. **Cast:** rush, patch, drop. **Poster:** rush `happy`.
- **Mechanism:** challenging perfectionism (all-or-nothing standards; Shafran et al.) with a behavioural experiment:
  satisfaction plateaus long before 100% effort, and done beats perfect.
- **Verbs:** pipe icing (drag strokes); tap SERVE when you decide it's good enough.
- **Beats:** a cosy bakery; customers (bubble characters) queue with orders. Pipe icing with squishy piping physics; a
  Perfect-o-meter climbs with visibly diminishing returns. Serve whenever you like: at 70-80% customers are delighted; at
  100% they say exactly the same, but it took three times longer (a gentle time readout, never a penalty or a timer).
  **Twist:** the Critic (the player's perfectionist thought) inspects a cake with a magnifying glass: "There's a smudge!"
  The customers don't notice and eat it happily. Then: "What would 80% look like for your real task?" (`analysis.task`)
  and one done-step.
- **Finale:** closing time: a display case of imperfect, delicious cakes, thank-you notes, sunset through the windows.
- **Come back:** collect cake designs; daily menu; best "delighted customers at good enough".
- **Share:** "Served 6 good-enough cakes. Customers rated them the same as the perfect one."
