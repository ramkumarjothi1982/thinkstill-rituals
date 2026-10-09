<!-- Founder's master requirements for the ThinkStill Release Console, received 2026-10-09. BINDING for every builder, reviewer and fixer. Latest explicit founder instruction wins. -->

# THINKSTILL RELEASE CONSOLE
## MASTER HISTORICAL FEEDBACK, CREATIVE VISION & NON-NEGOTIABLE DEVELOPMENT REQUIREMENTS

**TO CLAUDE CODE — READ THIS ENTIRE DOCUMENT BEFORE CONTINUING RELEASE DEVELOPMENT.**

This document consolidates the founder's extensive historical instructions, repeated corrections, design decisions, gameplay requirements, bug reports and quality expectations for the ThinkStill Release Console.

These requirements were developed through many iterations of game design, testing and refinement.

**Do not treat them as new brainstorming suggestions. Many represent problems that were already discovered, corrected or explicitly prohibited from recurring.**

The objective is to preserve the founder's original vision, incorporate all established requirements into the current Release development, and ensure that the upgraded 114-game arcade does not regress to earlier problems.

Where requirements have evolved, the latest explicit founder instruction takes precedence. Inspect the existing implementation before assuming a feature is absent.

Do not interrupt working processes, discard development progress or overwrite approved functionality.

---

# PART 1 — THE ORIGINAL PURPOSE OF THINKSTILL RELEASE

ThinkStill is a premium emotional entertainment platform.

The Release Console has one fundamental purpose:

**Allow people to physically, symbolically and satisfyingly release emotions through interactive gameplay.**

A user might arrive feeling:

- Angry or frustrated.
- Sad or rejected.
- Jealous or insecure.
- Embarrassed or ashamed.
- Overwhelmed or mentally exhausted.
- Stuck on a recurring thought.
- Upset about another person's behaviour.
- Unable to stop replaying an unpleasant experience.

Rather than reading advice or completing an exercise, users should interact with their emotions.

They might pop them, burn them, shred them, flush them, melt them, throw them away, vacuum them, disconnect them or transform them.

**Their emotions become tangible objects inside an interactive world.**

The user should feel:

"I actually did something with that emotion."

Release should make the emotional experience visible, interactive and satisfying.

The games are intended to provide a useful opportunity for emotional catharsis and relief, not guarantee a specific psychological outcome.

## The founder's original ambition

The games must be:

- Extraordinary and original.
- Immediately engaging.
- Highly interactive.
- Visually hypnotic and immersive.
- Exceptionally satisfying.
- Funny or playful where appropriate.
- Worth replaying.
- Emotionally useful.
- Visually premium.
- Different from ordinary wellness applications.

Our creative ambition is comparable to the craftsmanship of Pixar animation, the anticipation of premium entertainment and the responsiveness of outstanding mobile games.

We are not copying their visual intellectual property.

We are pursuing their standard of storytelling, production quality and emotional engagement.

**Do not build something that feels like a therapeutic worksheet with animations added.**

---

# PART 2 — SUBSCRIBER VALUE AND RETENTION

We are targeting a premium subscription experience, potentially around A$10 per week.

At that price, ThinkStill must deliver recurring value.

Users should return because:

1. They enjoy the games.
2. The interactions are genuinely satisfying.
3. They experience useful emotional benefits.
4. Different emotions produce different experiences.
5. They discover new mechanics, characters and worlds.
6. The platform feels polished and premium.
7. The games offer something more distinctive than free entertainment or a generic chatbot.

Release may become our most naturally shareable feature.

But sharing alone is insufficient.

**The experience must be valuable enough that subscribers want to continue paying after the initial novelty fades.**

Build replayability through meaningful variation, personalised content, satisfying mastery and creativity.

Avoid artificial addiction mechanisms, manipulative rewards or pressure on emotionally vulnerable users.

---

# PART 3 — THE RELEASE CONSOLE MUST MATCH THE ESTABLISHED THINKSTILL EXPERIENCE

The founder previously instructed that Release should be wrapped inside a console/chat-window experience consistent with the Reset Console.

Maintain a coherent visual identity across ThinkStill.

However, Release must remain its own fully interactive arcade, not become a Reset-style text-card interface.

## Global layout requirements

1. The entire main experience must fit within one screen on mobile wherever practicable.
2. No unnecessary vertical scrolling during gameplay.
3. All important controls must remain visible and accessible.
4. The game should occupy the largest practical visual area.
5. Controls must not interfere with the game.
6. Avoid excessive instructional paragraphs or decorative panels.
7. Maintain proper visual balance on desktop and mobile.
8. Keep character images, text and interactive objects readable.
9. Preserve the premium dark/neon aesthetic and approved themes.
10. Avoid distorted or imperfect circles.

Design and test at 390 × 844 mobile and 1280 × 860 desktop, as well as smaller responsive sizes.

## Console header

The game title must be centred.

The upper-right controls must include the established progress/score indicator and sound toggle.

The progress indicator should appear before the sound control in the intended layout.

**The progress indicator must never disappear unexpectedly during gameplay, transitions or finales.**

The sound toggle should control the relevant game audio consistently.

## Feedback messages

The founder previously requested a feedback bubble:

- Positioned at the bottom-right.
- Transparent or visually lightweight.
- Visible for approximately 1–2 seconds.
- Not blocking game elements.
- Not overlapping interactive objects or important text.
- Providing immediate, playful feedback.

Do not replace the game view with intrusive messages.

## Existing controls

Preserve supported controls including:

- Change Vibe.
- Save/Vault functionality where applicable.
- Sharing.
- Score/XP/progress.
- Sound.
- Game navigation.
- New thought.
- Replay.
- Image and microphone inputs.

Do not remove working functionality simply because a redesign looks cleaner.

---

# PART 4 — EMOTION INPUT IS A FUNDAMENTAL REQUIREMENT

The established primary input prompt is:

**"What emotion are you carrying?"**

The supporting explanation is:

**"Your thoughts are materialised to be released."**

The user should be able to provide emotional material through text, supported microphone input and uploaded images.

The user should not have to complete a lengthy questionnaire before playing.

## Personalisation

A game must use the actual thoughts, words and images supplied by the user.

Do not simply show their words on the opening screen and then run a generic animation.

Their input should become part of the actual game objects.

Examples:

- Text printed on objects to be shredded.
- Thoughts inside bubbles to be popped.
- An image inside a potato being passed around.
- A thought being disconnected from a hook.
- Words being vacuumed away.
- An emotional object being burned, melted or released.

**The input must feel physically connected to the game.**

Do not replace the user's words with unrelated placeholders when usable input is available.

---

# PART 5 — GLOBAL BUBBLE DESIGN RULES

These requirements were repeated across numerous Release games.

They must be implemented as shared, reusable standards.

## 5.1 Bubble shapes

Bubbles must remain genuine circles.

No oval distortion.

No squashed images.

No irregular clipping caused by responsive layouts.

There should generally be at least five visible circular emotion bubbles in games using the established multi-bubble system, unless the specific approved mechanic requires a different arrangement.

Bubbles must fit inside the available gameplay area without unwanted overflow.

## 5.2 Bubble pictures

Every bubble must display a clearly visible picture or character image where the game design uses bubble imagery.

Use our existing emotional bubble characters and expression assets.

If users do not upload images, show appropriate existing emotion or character imagery rather than empty objects.

If users upload images, distribute them according to the established upload rules.

## 5.3 Images must be fully visible

This was a repeated founder complaint.

**Do not crop off important parts of the bubble picture.**

Image rendering must preserve the complete visible image inside its circular presentation.

Use appropriate containment, scaling and positioning rather than enlarging the image until important parts disappear.

Images should be large enough to appreciate.

Avoid microscopic images floating inside oversized bubbles.

## 5.4 Remove black masks

This is a global rule for ALL Release games.

**Never put black masks, black backgrounds, black rectangles or dark blocking overlays around bubble pictures or bubble text.**

This instruction was explicitly reinforced during the October development work.

Do not reintroduce these overlays during future redesigns.

The picture must be clean, bright and clearly visible.

Text must not sit inside an unnecessary black box.

## 5.5 Text position

The latest global founder requirement is:

**The user's text must appear BELOW the bubble picture, while remaining INSIDE the same bubble.**

The text must not cover the face or main image.

The text must not sit on top of important image details.

The picture and text must both fit inside the bubble.

Text should be:

- Centred horizontally.
- Legible.
- Correctly scaled.
- Properly wrapped.
- Visually separated from the picture.
- Fully contained within the bubble.

Do not allow letters to protrude beyond the circular object.

Do not make text unreadably small simply to force it into an inadequate layout.

## 5.6 Consistent bubble styling

The founder repeatedly requested standardisation.

Use CLEANSE's approved visual approach as a reference where relevant.

Apply shared conventions for:

- Bubble dimensions.
- Image sizes.
- Text sizes.
- Image-to-text spacing.
- Circular clipping.
- Contrast.
- Placement.
- Animation quality.

Individual games may arrange bubbles differently, but should not independently invent inconsistent picture-and-text rendering.

## 5.7 Text editor controls

Previous revisions addressed text readability and editor control.

Preserve fine-grained text sizing adjustments where supported, including small increments.

Preserve or improve image scaling controls, including the previously requested zoom capability beyond 2.5×, while preventing unintended cropping in the final game.

---

# PART 6 — IMAGE UPLOAD RULES

The founder requested a specific, compact upload experience.

## Upload interaction

The + button should open a small popup immediately above the + control toward the extreme right of the input area.

The popup should contain six image-upload slots.

The popup closes when:

- The user clicks outside.
- The user selects another input method.
- The appropriate completed interaction requires it to close.

Do not allow it to obstruct the main gameplay screen unnecessarily.

## Maximum images

Support up to six uploaded images.

## Image distribution

Images must be distributed as evenly as possible across the six available image positions.

Examples:

| Images uploaded | Six-position distribution |
|---|---|
| 1 | Image 1 repeated six times |
| 2 | Three of each image |
| 3 | Two of each image |
| 4 | Balanced distribution, with no image unfairly dominating |
| 5 | Balanced distribution |
| 6 | One of each image |

Keep the distribution order intentional and visually balanced.

Do not put all instances of one image together if a more natural spread is possible.

## Remove unnecessary text

The founder explicitly instructed removal of the label:

"UPLOADED IMAGE"

Do not display that label over the images.

Uploaded images should appear naturally inside game objects.

## Image and text relationship

If a game has both a user-supplied image and associated text:

- The image is circular and clearly visible.
- The user's text appears beneath it.
- Both remain inside the relevant bubble or object.
- They do not overlap.
- No black masks are added.
- The image remains recognisable throughout the interaction.

---

# PART 7 — CHARACTER EXPRESSIONS AND ANIMATION

ThinkStill has an established cast of seven bubble characters:

Glitch, Drop, Loopie, Patch, Rush, Still and Sync.

Use the existing character imagery and emotional expression library where appropriate.

The founder has spent considerable time developing and standardising these emotional assets.

**Do not substitute generic emojis or randomly selected character pictures when the correct ThinkStill assets already exist.**

## Characters must feel alive

Character expressions should respond to what is happening.

Examples:

- A character looks worried before an action.
- Reacts when touched or moved.
- Looks surprised during a twist.
- Shows excitement during a satisfying interaction.
- Celebrates or visibly settles at the end.
- Responds differently depending on the gameplay mechanism.

Do not treat the characters as static decorative portraits.

## Expression consistency

Use the intended emotional state rather than repeating the same image unnecessarily.

Previously identified problems included:

- Duplicate emotion pictures.
- Incorrect expressions.
- Images being cut off.
- Characters appearing too small.
- Characters obscured by text.
- Incorrect emotion progression.

These must not recur.

Where a mechanic includes an emotional transformation, show a credible progression from a negative or unsettled state toward a more positive, calm or relieved state.

Do not falsely claim the user now feels positive simply because an animation has completed.

## Performance

Animations should feel responsive and natural.

Avoid long delays between user actions and character reactions.

---

# PART 8 — GAMEPLAY MUST BE ACTIVE, NOT PASSIVE

This is one of the most important original product requirements.

**The player must DO something to release the emotion.**

Not merely read.

Not just watch an animation.

Not just click Next repeatedly.

The player should physically interact with the emotional material.

Examples:

- Drag.
- Pull.
- Swipe.
- Throw.
- Pop.
- Scratch.
- Hold.
- Disconnect.
- Twist.
- Crush.
- Burn.
- Activate a tool.
- Move an object.
- Select something to keep or release.

Every successful interaction should cause visible and audible feedback.

## Every game needs a real mechanic

The founder has repeatedly requested that Release games not feel like reskins of the same animation.

A game called BURN must feel meaningfully different from MELT.

SHRED should not be POP with paper graphics.

SLINGSHOT must involve an actual slingshot interaction.

VACUUM should visibly suck material away.

UNHOOK should visibly disconnect attachments.

The visual world, physical mechanic, sound and finale should support the name and theme of each game.

## Clear progression

Every game should have:

1. An understandable starting state.
2. A visible emotional object or challenge.
3. A distinct player interaction.
4. Responsive visual feedback.
5. A sense of progression.
6. A clear successful ending.
7. A satisfying finale.
8. Useful navigation after completion.

Avoid ambiguous objectives and games where users cannot tell whether they have won.

---

# PART 9 — ORIGINAL GAME SELECTION AND NAVIGATION

The original Release Console included a selector with 16 choices:

**"Let ThinkStill choose" plus 15 individual game choices.**

The current expanded arcade may contain many more games.

Do not regress the new catalogue to only 15 games.

Instead, preserve the original selection principles:

- Users can allow ThinkStill to choose.
- Users can manually select games.
- Users can change games midway.
- Navigation is intuitive.
- The interface remains compact.
- The available games are discoverable.
- Users are never unnecessarily trapped in a single experience.

## Game switching

Switching games during play must work reliably.

Do not leave old animation state, duplicate audio or outdated images on screen after switching.

## End-of-game navigation

Preserve the established completion options.

Inside the game container, supported options include:

- Again.
- New thought.
- Try POP, where that specific recommendation is appropriate.

Outside the game container, maintain the requested previous/next navigation and **Try next game** behaviour.

A contextual recommendation such as **Try Meteor** may be offered based on the user's interaction and available game mechanics, rather than shown randomly or hard-coded everywhere.

Avoid cluttering the finale with too many competing buttons.

The user must be able to start another game without navigating through a long onboarding flow again.

---

# PART 10 — IDLE ANIMATIONS

The founder previously requested animated idle states while the user is preparing to play.

Requirements:

- Breathing or gently animated bubbles.
- A visually alive interface.
- A brief, clear explanation of how Release works.
- Readable letters and instructions.
- No unnecessary blank screen.
- No static, lifeless waiting state.

The idle animations should contribute to ThinkStill's emotional identity.

They should not introduce lag or prevent a game from starting immediately.

---

# PART 11 — DOPAMINE BURSTS AND FINALES

This has been one of the founder's strongest and most frequently repeated priorities.

## The original vision

Every Release game needs a spectacular, satisfying conclusion.

Not a generic confetti animation.

Not a tiny explosion.

Not a brief colour flash.

The founder specifically requested inspiration from:

- Eclipses.
- Constellations.
- Black holes.
- Cosmic events.
- Expanding rings.
- Collapsing energy.
- Powerful geometric transformations.
- Hypnotic, immersive visual sequences.

These are sources of inspiration, not a requirement that every game use the same cosmic theme.

## Global finale requirements

1. Visually powerful.
2. Full-screen or appropriately immersive.
3. Originating from the centre of the experience when that is the established burst design.
4. Fast and highly responsive.
5. Smoothly animated.
6. Closely synchronised with sound.
7. Distinctive for each game.
8. No letters or instructional text over the main dopamine-burst sequence.
9. No unwanted black screen.
10. No performance collapse during the finale.

## Every game needs its own identity

Do not use the same dopamine burst for every game with only a different colour.

The founder explicitly requested unique finales across Release games.

A successful finale should feel like the natural climax of that particular mechanic.

Examples:

- POP could build toward a spectacular chain reaction.
- SHRED could create a powerful disintegration sequence.
- BURN could create a visually dramatic combustion finale.
- SLINGSHOT could generate an extraordinary impact or release.
- CLEANSE could finish with an unmistakable visual purification or washout.
- UNHOOK could culminate in a dramatic separation.

These examples are creative directions, not permission to overwrite existing approved finales.

## Critical preservation rule

The founder later explicitly instructed:

**"Don't change dopamine bursts, fix lag only."**

This instruction must be respected.

If a dopamine burst has already been approved, do not redesign it while addressing performance.

Optimise its implementation without changing its established appearance, choreography or intended emotional impact.

Seek founder approval before changing an approved finale.

## Visual safety

Provide reduced-motion alternatives, avoid hazardous strobing and allow users to control sound.

A hypnotic aesthetic should come from beautiful movement and immersion, not unsafe flashing.

---

# PART 12 — SOUND AND MUSIC

Sound is fundamental to the Release experience.

A satisfying game must feel good to touch, watch and hear.

## Shared music system

The founder explicitly requested that Release use the same shared per-Bubble music files as Reset.

**Reset remains the source of truth for music URLs.**

Release should consume those shared URLs automatically.

Do not create unnecessary duplicate music assignments or separate manual asset-management processes.

Follow the existing shared approach already used for character assets and transition videos.

## Sound effects

Each action should trigger appropriate feedback.

Examples:

- Pop.
- Tear.
- Crush.
- Impact.
- Whoosh.
- Fire.
- Vacuum suction.
- Water.
- Rain.
- Mechanical click.
- Scratch.
- Energy burst.

Sound must match the physical action.

A powerful impact with a weak or delayed sound feels cheap.

## Timing

Ensure tight synchronisation between:

- Player input.
- Animation response.
- Character reaction.
- Sound effect.
- Progress update.
- Finale.

Where timing logs and sound-sync measurements exist, use them to improve responsiveness.

Do not report sound as tested when testing occurred in a browser without usable audio.

## Existing audio problems

Previous issues included:

- Rain sound playing without the visual washout.
- Missing or inconsistent sound.
- Lag during bursts.
- Sound continuing after game changes.
- Animation and audio not matching.

Test these behaviours explicitly.

---

# PART 13 — GAME-SPECIFIC HISTORICAL CORRECTIONS

These corrections must be checked against the current implementation.

They are not simply future feature ideas.

## 13.1 POP

Preserve the satisfaction of physically popping emotions.

Bubble imagery and user text must be correctly integrated.

Reactions must be immediate.

The pop animation, sound and finale should be highly satisfying.

For the cinematic Pilot A rebuild, show a genuine improvement over the original rather than adding decorative scenes without improving gameplay.

## 13.2 CLEANSE

CLEANSE established several of the preferred visual standards for bubble images and text.

Maintain its clear visual presentation.

Ensure the cleansing mechanism visibly changes or removes the emotional material.

A previous build had a missing ending. Verify that the completion sequence now works reliably.

At completion, the user should see a clear visual outcome.

## 13.3 CRUSH

The crushing mechanic must physically respond to user actions.

It must feel like pressure, deformation and impact, rather than a generic tap animation.

The Pilot A cinematic rebuild must improve the interaction and its finale without breaking the existing working game.

## 13.4 RAIN OUT

This game had a specific repeated bug.

After the sixth bubble pull, the rain sound played, but the expected washout did not happen.

Required behaviour:

- User interacts with the six bubbles.
- Rain is activated appropriately.
- The visual washout actually happens.
- Text completely disappears.
- Uploaded images completely disappear.
- Emotional objects are genuinely removed.
- Clouds remain visible where required by the established design.
- The game reaches its completion state.

**Do not treat audio playing as proof that the washout occurred.**

## 13.5 X-RAY

After the X-ray reveal, add or preserve the requested:

**"Kill/Burn All" button.**

The button must perform its advertised destructive action.

Update the How to Play guidance so users understand the full interaction.

Do not end the game immediately after the reveal without providing the requested action.

## 13.6 SCRATCH REVEAL

The founder specifically asked for a realistic scratching interaction.

Requirements:

- A proper scratching tool.
- Visible scratch marks following user movements.
- Convincing removal of the covering material.
- Actual progress from scratching.
- No unnecessary bottom container.
- Pictures and text arranged correctly.
- White readable text where appropriate to the approved design.

Avoid fake scratching that simply reveals everything after a tap.

## 13.7 JUGGLE

The founder provided very specific layout instructions.

- Position bubbles centrally.
- Arrange them in a straight line.
- Selected thought rises above the others.
- Unselected thoughts move lower.
- Selected and unselected states must be visually obvious.

The requested How to Play instruction was:

**"Select which thought to keep and release which doesn't serve you. Click selected thought 3 times to win."**

Implement and verify that win condition.

The game must not become stuck because the selected object does not register three clicks.

## 13.8 KEEP / DROP

The bubble should appear between the Up and Down arrows.

The visual image must change with the selected option, not just the displayed text.

The decision should feel like an actual physical Keep or Drop interaction.

Ensure image and text remain readable.

## 13.9 VOLUME KNOB

Previous fixes concerned object visibility, image quality and bubble presentation.

Ensure the knob is clearly interactive and displays visible changes in response to manipulation.

Do not obscure the bubble picture or text.

The mechanic should feel like meaningful volume adjustment rather than an ordinary button.

## 13.10 GO WEIRD

Preserve the intended absurd and playful interaction.

Correct visibility, circle rendering and picture/text layout.

The game should feel genuinely amusing and surprising.

Avoid static text reveals masquerading as gameplay.

## 13.11 SPACE MAKER

Fix the previously identified visibility and layout problems.

Maintain properly circular images.

Ensure user input remains recognisable.

The interaction must clearly communicate the creation of space.

## 13.12 COIN FLIP

Preserve the actual coin-flipping interaction.

Fix image visibility and alignment problems.

Do not allow the uploaded image or user text to cover the coin's important visual features.

## 13.13 DOOR A / B

The two choices must be recognisable and easy to interact with.

Preserve correct imagery and text.

Opening or choosing a door must produce a meaningful corresponding result.

Do not substitute a simple text reveal for a proper interaction.

## 13.14 KNOB

Correct previously identified visibility and presentation issues.

Preserve a meaningful, responsive control interaction.

Avoid cropping bubble images or overlapping labels.

## 13.15 FACT / STORY / UNSURE

This game previously required better images and properly centred text.

Keep each choice visually understandable.

Ensure the correct emotional objects appear and the selection changes the game appropriately.

Do not make the user struggle to read information.

## 13.16 VACUUM

The founder gave specific corrections:

- Use one column where specified.
- Keep all words visible.
- Ensure text is readable.
- Provide the requested **"Vacuum suck"** button.
- The vacuum must visibly suck away the relevant objects.

Do not merely make an object fade away without the intended vacuum interaction.

## 13.17 SHRED / SHREDDER

Correct paper alignment.

Use convincing shredder artwork.

Ensure paper physically enters the shredder in the correct position.

The shredding effect must be visible and satisfying.

Avoid paper floating beside the machine or missing its opening.

## 13.18 LOWER PLATFORM

Use down arrows where required.

Preserve the requested **"Activate tool"** interaction.

The platform must visibly move downward.

Do not replace the movement with a static reveal.

## 13.19 HOT POTATO

Several highly specific corrections were made.

Requirements:

- Potato starts red/hot.
- Changes to blue/cool according to the intended interaction.
- Use the appropriate bubble pictures inside the potatoes.
- Images must remain circular.
- Show the full picture without cutting off important parts.
- Make the pictures larger and clearer.
- Put the user's input text below the image.
- Keep both picture and text readable inside the potato.
- Remove the generic **"HOT"** label and replace it with the user's actual input text.
- No black mask around the image.
- No black mask around the text.
- Preserve all other working behaviour unless explicitly changed.

This game is an important regression test because several global image rules were reinforced during its development.

## 13.20 UNHOOK

The founder requested:

- One large visible hook.
- Three strings.
- Each string visibly attached.
- The user clicks or interacts to disconnect each string.
- Every disconnection produces an obvious physical result.
- The successful result should feel like a genuine release.

Do not simply hide a string without convincing disconnect animation.

## 13.21 MELT

The object should visibly transform through melting.

The mechanism must be recognisably different from BURN.

User imagery and text should be handled consistently.

## 13.22 SLINGSHOT

A proper slingshot interaction is expected.

Dragging, tension, release and object movement should feel connected.

The emotion should visibly travel away from the user.

## 13.23 BURN

Use an actual burning transformation.

The game should not resemble a simple opacity fade.

Keep the approved finale intact unless specifically authorised to change it.

## 13.24 FLUSH

The interaction must clearly communicate flushing and removal.

Visual movement and sound should match the action.

The emotional material should not remain visible after successful completion.

## 13.25 SWIPE AWAY

Objects should respond naturally to swiping direction and force.

Avoid requiring arbitrary repetitive taps for a swipe-based game.

## 13.26 STOMP / CRACK / ZAP / TAP OUT / BIN

Each needs its own convincing physical mechanic.

- STOMP should feel like a stomp.
- CRACK should visibly fracture material.
- ZAP should visibly deliver energy.
- TAP OUT should have a meaningful tap-based challenge.
- BIN should involve a satisfying discard action.

Do not reuse the same disappearance animation for all five games.

## 13.27 DRAMA MACHINE

Preserve its distinct theatrical or exaggerated emotional interaction.

The game should feel genuinely different from destructive Release games.

## 13.28 ECHO CHAMBER

Preserve the intended echo-based interaction and readable bubble text.

Earlier revisions addressed text fitting problems.

Verify no words overflow their objects.

## 13.29 MAGIC TRAP DOOR

The trap door must operate as an actual interactive object.

Provide convincing movement and disappearance.

Its finale should fit the magical trap-door concept.

## 13.30 PRIORITY BLOCKS / SCALE DOWN / TRADE MACHINE / CONTROL PANEL

Preserve the distinct action behind each mechanism.

Do not reduce these games to identical text-selection interfaces.

The player should manipulate appropriately designed objects, receive immediate feedback and experience a clear end state.

## 13.31 Additional current arcade games

The expanded Release arcade includes many more games than this historical named list.

Apply the global standards to the entire catalogue.

For all 114 games, verify:

- A working beginning.
- Proper input display.
- Distinct gameplay.
- A clear win condition.
- Reliable transitions.
- A complete finale.
- Working replay and navigation.
- Correct images and text.
- Appropriate sound.
- Mobile responsiveness.
- No regression of approved behaviour.

Pay particular attention to UNFOLLOW, which the current audit identifies as getting stuck at 17% on mobile.

A game must not be offered as a normal playable experience if its required completion path is broken.

---

# PART 14 — VISUAL PRESENTATION AND END SCREENS

The founder repeatedly requested improvements to visual quality.

Examples included:

- Larger clouds.
- Brighter images.
- Properly centred objects.
- Text below the picture.
- Clean visual presentation.
- Better spacing.
- More impressive end screens.
- Stronger character expressions.
- Less clutter.
- Properly visible words.
- Images that are not cut off.

Apply these as universal quality principles.

A beautiful animation is not premium if the text is unreadable or the image is cropped.

Likewise, a functional game does not become premium simply by adding particles.

**Premium means that the game, characters, images, typography, interactions, sound and cinematic effects work together as one coherent experience.**

---

# PART 15 — PERFORMANCE AND BUG REGRESSION RULES

Numerous historical fixes involved performance.

Problems previously identified include:

- Lag during dopamine bursts.
- Progress indicators disappearing.
- Black screens after input.
- Rain audio playing without the visual effect.
- Games not completing correctly.
- Incorrect image clipping.
- Text overlap.
- Invisible instructions.
- Broken transitions.
- Misaligned game objects.
- Interactions not registering.
- Sound and visuals becoming unsynchronised.

These failures must not reappear during the cinematic upgrades.

## Performance requirements

Target smooth, responsive 60 FPS gameplay on capable devices.

Measure input-to-feedback latency.

Optimise costly effects.

Avoid unnecessary rendering.

Release unused animation resources and audio handlers.

Keep memory use manageable.

Verify that switching between games does not leave abandoned processes running.

Prioritise reliable performance on actual mobile devices, not only desktop browser emulation.

## Important distinction

Do not solve performance problems by stripping away the spectacular elements that make ThinkStill distinctive.

**Optimise the implementation before reducing the experience.**

Where a substantial visual change is unavoidable, request approval.

---

# PART 16 — EACH GAME MUST DELIVER A SATISFYING EMOTIONAL ARC

The founder's vision goes beyond mechanical interactions.

A successful Release game should contain a miniature emotional journey.

### Opening

The user sees their emotion represented as something tangible.

The world establishes curiosity or anticipation.

### Interaction

They begin physically manipulating the emotional object.

The world and characters respond.

### Escalation

The interaction becomes more satisfying, surprising, humorous or dramatic.

### Twist

Something unexpected happens.

It could be a funny character reaction, a surprising transformation or a dramatic change in the game world.

### Finale

The user's emotional material is visibly released according to the game's mechanic.

The sequence feels deliberate and rewarding.

### Completion

The user returns to a clear, controlled state of the interface.

They can replay, enter another thought or choose another game.

A playful completion moment may celebrate the action without claiming an emotional benefit the user hasn't reported.

**Every game must feel like an interactive experience with a beginning, middle and ending — not a repetitive task with an explosion attached.**

---

# PART 17 — PERSONALITY AND TONE

ThinkStill supports three established vibes:

**Jolly, Cheeky and Unfiltered.**

Preserve the user's selected vibe and intensity.

The selected personality should influence more than an opening sentence.

Where appropriate, it should shape:

- Character reactions.
- Humour.
- Instructions.
- Feedback messages.
- Surprise moments.
- Completion dialogue.
- Word choices.
- Emotional intensity.

Do not make all three vibes identical after the first line.

Maintain the founder's preference for playful, entertaining, irreverent language rather than clinical or overly therapeutic instructions.

However, humour must fit the user's situation. Serious distress, sensitive material and safety-critical situations require appropriate handling.

---

# PART 18 — SAFETY AND EMOTIONAL RESPONSIBILITY

Release games are designed to help people deal with uncomfortable emotions.

They are not a substitute for emergency care, medical treatment or psychological therapy.

Do not promise that a game will cure anxiety, trauma or another condition.

Do not encourage dangerous actions toward real people.

Do not amplify violent intentions simply because the game theme involves symbolic destruction.

Do not automatically assume the user's emotional concern is irrational.

Respect existing safety screening and escalation rules.

When appropriate, allow users to stop or change games without penalty.

Keep emotional material private by default.

The user should remain in control of their experience.

---

# PART 19 — SHARING AND VIRAL POTENTIAL

The founder wants Release to become naturally shareable.

The main source of virality should be the quality of the experience itself.

Users should want to show others:

- Extraordinary character reactions.
- Satisfying physical interactions.
- Beautiful effects.
- Unexpected twists.
- Unique finales.
- Funny or delightful gameplay moments.

Explore optional shareable replays, short clips or visual completion moments.

But never automatically reveal private emotional text, uploaded pictures or personal circumstances.

Sharing must be opt-in, with a clear preview.

The ability to enjoy Release privately must never be compromised.

---

# PART 20 — PRESERVE THE SHARED ARCHITECTURE

Review existing source files before changing the implementation.

Reuse:

- Shared bubble-character assets.
- Existing expression maps.
- Music URLs from Reset.
- Shared transition videos.
- Existing sound infrastructure.
- Approved input handling.
- Image-rendering components.
- Navigation controls.
- Vibe and intensity settings.
- Existing game-selection logic.
- Progress and reward systems.

Avoid creating different implementations of the same global UI behaviour in dozens of separate games.

In particular, bubble image and text layout should be governed by shared code wherever practical.

**One global fix should repair every applicable game.**

Do not duplicate assets or manually assign music files when shared references already exist.

Keep the Release changes isolated from Reset and Reframe unless a shared-system update is explicitly necessary and regression-tested.

---

# PART 21 — CURRENT DEVELOPMENT STATUS AND PRIORITIES

The latest development report identifies:

- 114 Release games in the expanded scope.
- Four new playable hero games.
- Approximately 90 existing games completing successfully.
- Twenty existing games with incomplete or broken completion paths.
- No games yet approved as fully premium.
- Pilot A covering POP, CLEANSE and CRUSH.
- Ongoing integration, review and mobile testing.

These are reported development figures, not proof of independent verification.

## Priority 0 — Prevent broken experiences

Fix games that freeze, crash, fail to complete or lose essential controls.

Resolve UNFOLLOW and other confirmed blockers.

Verify that previously fixed issues remain fixed.

## Priority 1 — Enforce global founder requirements

Implement and verify:

- No black masks.
- Images above text.
- Text inside bubbles.
- Full circular images.
- Consistent bubble presentation.
- Correct image distribution.
- Single-screen mobile layout.
- Reliable navigation.
- Shared audio.
- Visible progress.
- Working finales.

## Priority 2 — Complete Pilot A

Produce premium playable versions of POP, CLEANSE and CRUSH.

Provide genuine before-and-after comparisons.

Do not scale their creative style across the arcade without founder approval.

## Priority 3 — Improve the entire arcade

Once the founder approves the premium benchmark, apply the appropriate quality standard across the remaining games while preserving their unique mechanics.

Do not force every game into the same cinematic structure.

---

# PART 22 — MANDATORY REGRESSION TESTING

Before declaring a game complete, verify the following.

### A. Input testing

Test with:

- No uploaded image.
- One uploaded image.
- Two uploaded images.
- Three uploaded images.
- Four uploaded images.
- Five uploaded images.
- Six uploaded images.
- Short text.
- Long text.
- Empty or missing optional input.
- Microphone input where supported.

### B. Visual testing

Confirm:

- Pictures are visible.
- No unexpected cropping.
- No black masks.
- Text appears beneath pictures.
- Words fit inside bubbles.
- Bubble shapes are circular.
- No overlap.
- Characters are recognisable.
- Controls remain visible.
- Gameplay fits the viewport.

### C. Gameplay testing

Confirm:

- Every required action works.
- Drag and swipe input register correctly.
- The player understands what to do.
- Progress changes appropriately.
- Win conditions are achievable.
- The game reaches its finale.
- Images and words are removed or transformed as intended.
- Replay works.
- Switching games works.
- Navigation works.

### D. Audio testing

Confirm:

- Correct audio plays.
- Sound toggle works.
- No unexpected duplicate sounds.
- Music selection is correct.
- Timing matches the animation.
- Audio ends or transitions appropriately.

### E. Performance testing

Confirm:

- Smooth interaction.
- No black screen.
- No freezing.
- No excessive lag.
- No disappearing progress.
- No game-breaking frame drops.
- Acceptable behaviour on mobile.

### F. Finale testing

Confirm:

- The finale actually plays.
- The effect is correct for the game.
- Its origin and timing match the approved design.
- Existing approved dopamine bursts have not been unnecessarily altered.
- The correct end controls appear.
- The player can continue.

Automated browser testing is essential but is not the only validation.

Also perform actual-device testing for touch interactions, audio, performance and responsiveness.

---

# PART 23 — FOUNDER APPROVAL PACKAGE

The founder must personally approve the premium creative direction.

For Pilot A, provide:

1. A playable private build that opens on mobile.
2. The actual source files or Framer-compatible code.
3. Before-and-after screenshots.
4. Beginning, mid-game, finale and completion screenshots.
5. A complete gameplay video for each game.
6. Mobile and desktop layout checks.
7. Measured interaction responsiveness.
8. Sound synchronisation evidence from a sound-capable environment.
9. A brief description of what makes the new version substantially better.
10. A clear list of remaining known issues.

Do not describe a game as fully tested if audio, actual mobile performance or complete gameplay has not been verified.

Do not describe a prototype as premium simply because an AI critic rated it 8/10.

**Founder approval is the decisive creative gate.**

---

# PART 24 — DEVELOPMENT EFFICIENCY

The founder has already experienced prolonged development delays, usage limits, container restarts and repeated review cycles.

Improve development efficiency without lowering the quality bar.

Use:

- Shared components.
- Reusable animation systems.
- Clear test scripts.
- Incremental playable previews.
- Focused reviews.
- Targeted bug re-checks.
- Frequent commits.
- Safe checkpoints.
- Protected branches.

Avoid excessive planning documents and repeated agent reviews that produce no meaningful improvement.

Prioritise delivering something the founder can actually play.

Do not attempt to perfect all 114 games before presenting evidence of real progress.

---

# PART 25 — WHAT PREMIUM RELEASE MUST FEEL LIKE

Imagine the user enters:

"I'm furious that my colleague took credit for my work."

The Release Console transforms that input into an interactive emotional object.

The user selects a game.

An expressive ThinkStill character reacts to the situation.

The game environment becomes alive.

The emotional material is clearly represented.

The user touches, pulls, moves, burns, shreds or transforms it through an interaction that feels appropriate to the chosen mechanic.

Every action produces immediate visual and auditory feedback.

The character responds.

The interaction develops.

Something surprising happens.

The player completes the release action.

The game delivers a spectacular, unique finale.

The user has a clear opportunity to experience some emotional relief.

They can replay, enter another thought or try another game immediately.

**This is an interactive emotional release experience, not a sequence of buttons that trigger animations.**

The game should feel expertly designed, visually cohesive and uniquely ThinkStill.

---

# PART 26 — FINAL INSTRUCTIONS TO CLAUDE

You must now audit the current Release implementation against this historical feedback.

Do not simply acknowledge these requirements.

**Turn them into verifiable engineering and creative acceptance criteria.**

I want a clear distinction between:

- Requirements already implemented and verified.
- Requirements implemented but not fully tested.
- Requirements partially implemented.
- Requirements missing.
- Confirmed regressions.
- Older instructions superseded by newer founder decisions.

For each identified gap, specify:

- Affected game or shared component.
- Current behaviour.
- Required behaviour.
- Severity.
- Proposed correction.
- Whether the fix belongs in shared code or an individual game.
- How it will be tested.

Do not claim full compliance without evidence.

Do not rebuild working functionality unnecessarily.

Do not downgrade approved cinematics, game mechanics or dopamine bursts while fixing bugs.

Do not disrupt the existing Release work.

Continue prioritising the private preview, critical fixes and Pilot A.

## THE FINAL NON-NEGOTIABLE STANDARD

Every game must pass four tests.

**1. DOES IT WORK?**

All interactions, inputs, graphics, sound, navigation and endings function correctly.

**2. DOES IT FEEL EXTRAORDINARY?**

It offers memorable, immersive, responsive and satisfying gameplay rather than ordinary web animations.

**3. DOES IT DELIVER EMOTIONAL VALUE?**

The mechanic creates a genuine opportunity for the user to release or disengage from an uncomfortable emotional experience.

**4. WOULD SOMEONE PAY FOR IT?**

The experience offers enough polish, originality, entertainment and repeatability to contribute meaningfully to a premium subscription.

We are not building 114 generic games.

We are building 114 distinct emotional release experiences as part of an ambitious premium gaming platform.

The ambition is Pixar-level creative craftsmanship, remarkable interactivity, memorable characters, extraordinary finales and exceptional subscriber value.

**Protect what we have already established. Fix what is broken. Improve what is mediocre. Do not repeat problems the founder has spent months correcting.**

Begin with a requirements-to-implementation gap audit, then continue the existing development and deliver playable results for founder approval.

---
## Addendum (founder, 2026-10-09)
- Dopamine bursts must be different for different games so the user doesn't get bored.
- The stomping boot should look like a boot when the user activates it. Likewise all tools should feel real.
- Hide all release-selection options from users; ThinkStill's logic picks the next best release automatically. No release may repeat until every release in its group has been played. (Supersedes Part 9's manual selection for end users; keep the menu only as an owner/test property control.)
