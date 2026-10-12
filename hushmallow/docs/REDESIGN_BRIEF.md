# Redesign brief (from the owner, 12 Oct 2026)

The owner's three briefs, kept verbatim: the master redesign (the Hushfold, MallowTouch, Hushflow, Memory Garden, Flow and Beyond), the typography redesign, and the lowercase brand rule. Every redesign task works from this file. Decisions and status: `docs/HUSHFOLD.md`.

---

CLAUDE MASTER REDESIGN PROMPT
HUSHMALLOW — THE LIVING, SQUEEZABLE EMOTIONAL UNIVERSE
You are redesigning Hushmallow from the ground up into an extraordinary, ultra-premium, interactive iPhone experience.
Act as a world-class combination of:

* Apple-level mobile product designer
* Premium mobile game creative director
* Cinematic animation director
* Character animation and soft-body physics specialist
* Human-computer interaction designer
* Evidence-informed emotional wellbeing experience designer
* Senior Framer / React / TypeScript engineer

Your objective is not to make Hushmallow look slightly better. It is to fundamentally change what Hushmallow is.
Study the existing Hushmallow code, approved seven Mallow assets, expression engine, previous ritual libraries and working functionality before making changes.
Preserve functional code and original character identities wherever possible.
Do not give me mockups pretending to be working gameplay. Implement actual interactions.
1. THE NEW PRODUCT VISION
Hushmallow — Your second brain for feelings.
Imagine the emotional storytelling of an animated feature, the tactile satisfaction of a beautifully made squishy toy, the immersion of a premium mobile game and the usefulness of evidence-informed emotional skills.
Create an original interactive emotional universe called The Hushfold.
The seven Mallows live inside this universe.
The user should be able to open the app whenever they feel angry, anxious, frustrated, sad, overwhelmed, lonely, restless or simply want to relax.
Within the first second, they should be able to touch and squeeze a Mallow.
The sensation should feel delightful.
The character should feel alive.
The world should respond.
Then, if the user wants, the experience should naturally evolve into an interactive emotional journey.
Fundamental change:
OLD:
Open app → complete form → select ritual → perform gesture → finish → return to menu.
NEW:
Open app → squeeze Mallow → express feeling naturally → thought comes alive → interact → discover → transform → flow into another world → pause or continue whenever desired.
The user should never feel like they are filling out a therapy worksheet.
They should feel like they have entered a magical, living world.
Take cinematic and emotional storytelling inspiration from films such as Inside Out, but create entirely original character designs, storytelling devices, interfaces and worlds. Do not copy protected characters, scenes or visual identities.
2. THE SEVEN MALLOWS ARE THE GAMEPLAY
Use my seven approved, transparent Mallow assets:

1. Noomi — pale icy blue, peaceful, dreamy.
2. Blubi — soft blue, sensitive, expressive.
3. Pipzi — vivid pink, excited, playful.
4. Boppo — warm orange, comforting, cheerful.
5. Zuzu — electric purple, iconic spiral eyes, mischievous.
6. Loomi — cyan blue, calm, soothing.
7. Glitzi — dark indigo, distinctive glitch expression, energetic.

Never substitute generic emoji, basic circles, CSS blobs or unrelated characters for their approved artwork.
Preserve their visual identities.
Build MallowTouch, a real, tactile, interactive character system.
Mandatory squeeze mechanics
A user must be able to:

* Press and hold a Mallow.
* Compress its soft body.
* Stretch it with two fingers.
* Gently pull and deform its shape.
* Release it and see realistic rebound.
* Flick it and watch soft-body wobble.
* Jiggle it.
* Gently massage it through circular finger movements.
* Stroke it to calm its expression.
* Watch its cheeks, eyes and mouth respond.
* Interact freely without needing to complete an objective.

The Mallows should feel physically soft, elastic, squishy and alive.
Use realistic spring behaviour, damping, inertia, squash-and-stretch, secondary motion and expressive face rigs.
A simple `scale(0.9)` animation is NOT acceptable as the final squeeze system.
Consider lightweight deformation meshes, layered assets or other mobile-efficient methods suitable for Framer.
Track finger movement, press duration, movement speed and two-finger distance to create convincing interactions.
Understand that an ordinary iPhone touchscreen does not reliably provide physical squeeze pressure. Simulate squeeze depth through supported touch measurements.
Sensory satisfaction
Add:

* Soft compression.
* Delayed jelly rebound.
* Gentle wobbling.
* Subtle, delightful sounds.
* Optional haptics where supported.
* Playful facial changes.
* Character-specific reactions.
* Reactive particles.
* Beautiful lighting effects.

Everything must feel connected to the user's movements, not like an unrelated animation playing afterward.
The character must remain fully playable even if the user never enters a thought.
This is the primary product experience.
3. REPLACE FORMS WITH CINEMATIC SUBTITLE CONVERSATIONS
The emotional-input interface must not resemble a regular form.
No giant text-entry panel.
No clinical questionnaire.
No traditional chatbot interface.
The user should continue playing while short cinematic subtitles appear as an elegant overlay.
Example:
Glitzi is wobbling as the user squeezes it.
A subtitle gently appears:
"Something bothering you?"
The user can continue squeezing.
Another appears:
"Want to tell me?"
A compact, temporary text or microphone entry overlay appears only when the user chooses to respond.
The user enters:
"My boss embarrassed me today."
The overlay disappears.
The world continues moving.
Subtitles should:

* Appear one short thought at a time.
* Animate in softly.
* Use clear typography and beautiful spacing.
* Sit comfortably within the game composition.
* Never obscure the user's touch target.
* Give users enough time to absorb the message.
* Avoid lengthy monologues.
* Allow replay, pause, skip and adjustable reading speed.
* Keep important discoveries visible until acknowledged.

Users must remain able to interact while subtitles are visible.
The experience should feel like participating in a movie rather than chatting with software.
No AI or bots
Hushmallow must not use runtime AI, LLMs, chatbots or AI-generated responses.
Use authored, rule-based conversations.
Preserve the user's exact entered text.
Use explicit emotion and situation selections where needed to choose appropriate prewritten responses.
Do not pretend to psychologically understand arbitrary free-text input.
4. THOUGHTS BECOME LIVING THOUGHT MALLOWS
This is a signature Hushmallow feature.
When users enter a thought, the thought should physically enter the Hushfold.
Example:
User:
"My boss embarrassed me today."
A tiny Thought Mallow appears.
Its body is tense.
Its cheeks puff.
Its eyes react.
The user's own words appear as readable floating text.
Glitzi notices the Thought Mallow.
The user can now physically interact with it.
Depending on the selected emotional journey:

* Squeeze and soften it.
* Gently stretch it.
* Untangle its words.
* Slow down its movement.
* Create space around it.
* Let it float beside them.
* Move it farther away.
* Change the surrounding environment.
* Help it settle.
* Watch it transform.

Different emotional states can affect the Thought Mallow's appearance and motion.
Anger might create a tense, crackling character.
Anxiety might create a restless, trembling character.
Overthinking might appear as multiple Thought Mallows talking over one another.
Sadness might produce a slower, heavier character.
The key is that the user's thought is externalised into something they can see, touch and explore.
Do not imply that difficult feelings are bad or must be destroyed.
Create a symbolic experience for changing one's relationship with a thought.
5. INTRODUCE BELIEF MALLOWS
Distinguish between:
Thought Mallows: Temporary representations of specific thoughts.
Belief Mallows: Longer-lived, user-identified ideas or patterns.
Examples:
"I'm not good enough."
"I must always be perfect."
"Everybody judges me."
"I can pause before responding."
A Belief Mallow can carry visible symbolic objects, such as an oversized stone, protective shell, tangled thread or luminous charm.
Through appropriate experiences, the user can examine how that belief influences their reactions.
The belief can become more flexible, less dominant or better understood.
Do not impose beliefs on users or automatically declare their thinking incorrect.
This system must support authored, optional exploration rather than psychological diagnosis.
Structured interpretation-reframing and evidence comparison must remain part of the higher subscription's Another Angle feature.
6. REPLACE SEPARATE RITUALS WITH CONTINUOUS HUSHFLOW
Stop building a menu of 1,000 isolated games.
Create Hushflow, a continuous sequence of interacting worlds.
When one experience reaches a natural completion point, the environment should seamlessly transform into the next.
For example:
Static Storm → Molten Ocean → Thought Aquarium → Silent Constellation → Moonmilk Cove.
Avoid loading screens, abrupt black transitions and repeatedly returning to menus.
Every new world should introduce meaningful differences in touch behaviour, sensory effects and emotional purpose.
The user must be able to:

* Continue automatically.
* Stay longer in the current world.
* Pause at any time.
* Resume later if progress was saved.
* Switch emotions.
* Switch the desired type of experience.
* Choose a favourite world.
* Finish without penalty.

Provide a non-intrusive sidebar or compact settings panel.
Possible emotional selections:
Angry / Anxious / Sad / Overwhelmed / Frustrated / Lonely / Restless / Something else.
Possible intentions:
Calm me down / Help me let go / Distract me gently / Help me feel steady / Let me just play.
Changes should lead to appropriate, seamless world transitions.
Use deterministic, non-AI selection and rotation logic.
Avoid repeating the same experiences unnecessarily.
7. USE THE ORIGINAL TECHNIQUE LIBRARY AS THE PSYCHOLOGICAL FOUNDATION
Study my supplied material covering:

* Vigyan Bhairav Tantra and its 112 contemplative approaches.
* Patanjali Yoga Sutras.
* Gentle pranayama and breath awareness.
* Mindfulness.
* Meditation.
* Vedanta and self-inquiry.
* Bhagavad Gita and Yoga Vasistha.
* ACT.
* CBT.
* DBT.
* Behavioural activation.
* Somatic grounding.
* Self-compassion.
* Sensory attention.
* Catharsis and emotional expression.
* Mental digestion.
* Intentional slowing.
* Increasing the pause between thoughts.
* Unclutching.
* Observing the mind like a movie.
* Non-identification with passing thoughts.
* Mental holiday.
* Responding rather than reacting.
* Empty space and stillness.

Extract the usable experiential principles and convert them into original interactive gameplay.
Do not turn every method into a breathing animation.
Examples:
Intentional slowing: A fast-moving molten surface becomes smoother through enjoyable slower finger movements.
ACT cognitive defusion: The entered thought becomes a visible object that can be observed without being obeyed.
Mental digestion: Thought objects gently settle through a living underwater environment.
VBT-inspired attention to stillness: A reactive galaxy becomes quiet when touch pauses.
Mindfulness: The user follows a flowing current while other thoughts drift past.
Self-compassion: A distressed Thought Mallow receives gentle care rather than punishment.
DBT-inspired pause: A responsive world changes when the user creates a pause before acting.
Yoga-inspired concentration: A tiny point unfolds into an immersive universe as the user gives it sustained attention.
The psychological skill must be demonstrated through actual interaction.
The user should discover something by playing, not merely reading advice.
Scientific integrity
Distinguish supported psychological processes from spiritual or creative inspiration.
Do not claim every traditional practice or invented gameplay experience is scientifically proven.
Avoid potentially unsafe forced breath holding, hyperventilation or intense physical practices.
Do not claim to cure, treat or guarantee relief from psychological conditions.
Aim for useful emotional settling and practical learning, and test these outcomes with real users.
8. CREATE CINEMATIC DISCOVERY MOMENTS
As users play, introduce brief moments of discovery.
Example:
The user moves a finger quickly.
The molten surface becomes turbulent.
The user naturally slows the movement.
The liquid settles into a beautiful smooth pattern.
A subtitle appears:
"See what happened?"
Pause.
"You changed your pace."
Pause.
"The world responded."
Then the user can experiment again.
Do not force them to read the conclusion before exploring.
Make insights observable, playful and memorable.
These moments must feel like discoveries inside an interactive movie, not lessons from a textbook.
9. THE MEMORY GARDEN — COLLECTIBLE EMOTIONAL SKILLS
When users practise or discover a skill, offer to save it as a beautiful collectible.
Create a magical location called The Memory Garden.
Example:
The user discovers intentional slowing.
A luminous ripple forms above Glitzi.
It transforms into a tiny skill charm or miniature Mallow.
The charm travels through a spectacular, brief portal sequence.
It arrives in the Memory Garden.
An elegant message appears:
"NEW TOOL SAVED"
"The Power of Slowing Down"
The user can later reopen the skill and practise it again.
Every skill can have:

* A distinctive collectible visual.
* A short practical explanation.
* A beautiful installation animation.
* A real-life example.
* An optional replay experience.
* A link to other relevant tools.

The installation is a visual metaphor for remembering a skill—not a claim that the app has literally reprogrammed the user's brain.
Avoid meaningless collection mechanics that reward users for actions without learning or useful practice.
Make saved discoveries feel meaningful and worth revisiting.
10. DESIGN ENGAGEMENT TO BE EXTRAORDINARY
Hushmallow must feel exceptionally replayable.
Prioritise:

1. Immediate sensory satisfaction.
2. Extremely responsive character reactions.
3. Surprising but emotionally appropriate visual transformations.
4. Interactive discoveries.
5. Character personality and humour.
6. Beautiful world transitions.
7. Varied sensory experiences.
8. Meaningful saved skills.
9. A sense of increasing familiarity and mastery.
10. Voluntary continuous exploration.

Every squeeze must feel satisfying.
Every world should reward experimentation.
Every Mallow should have a recognisable personality.
Every emotional journey should offer something beyond visual decoration.
Do not rely on repetitive tapping for points, artificial streak anxiety, psychological pressure, excessive notifications or manipulative randomness.
We want people to love returning because Hushmallow feels wonderful and is genuinely useful—not because they feel dependent on it.
Important: The user should never have to continue playing to receive a reward they have already earned.
11. USER PHOTO UPLOADS — UP TO SEVEN IMAGES
Allow 0–7 user-uploaded pictures.
Integrate the pictures directly into relevant experiences.
The user's photos may become:

* Memory charms.
* Floating visual thoughts.
* Dreamlike postcards.
* Soft elastic panels.
* Emotional bubbles.
* Orbiting memory tiles.
* Glowing fragments.
* Objects that shrink, soften, dissolve, float or move farther away.

The user's exact text must also remain meaningfully connected to the experience.
Photos should be optional.
Users can remove or replace individual images.
Treat uploaded images as private, potentially sensitive information.
Do not silently upload or retain them.
Do not depict violent attacks against identifiable people in their photographs.
The focus is symbolic emotional processing, distancing and transformation.
12. THE NEW SUBSCRIPTIONS
Remove the user-facing names:

* Paid
* Ultra
* Premium Paid
* Ultra Premium

Replace them with exactly two paid subscription experiences.
Hushmallow Flow
Tagline: A little more room for your feelings.
Includes:

* The seven living, squeezable Mallows.
* MallowTouch.
* Cinematic emotional conversations.
* Thought Mallows.
* Continuous Hushflow.
* Emotion-responsive worlds.
* Emotional release and regulation experiences.
* Sensory play.
* Mallow discoveries.
* Memory Garden.
* Skill collection.
* Favourites and saved progress.
* Appropriate user image integration.

Hushmallow Beyond
Tagline: There's more than one way to see it.
Includes everything in Hushmallow Flow, plus:

* Another Angle.
* Structured cognitive reframing.
* Fact-versus-interpretation exploration.
* Alternative perspectives.
* Belief Mallow investigation.
* More advanced authored perspective-changing worlds.
* Additional experiential tools where they provide meaningful value.

Do not make Beyond simply a larger catalogue of identical experiences.
Its value must be an additional capability, especially helping people reconsider interpretations, not just more animations.
No runtime AI in either subscription.
Use the existing subscription infrastructure where possible. Change customer-facing plan names and benefits carefully without breaking existing product IDs or entitlements.
Offer monthly and annual purchase options if supported.
Subscription screens should feel like magical invitations into the Hushfold, not corporate pricing tables.
Do not add a third paid tier.
13. FRAMER ENGINEERING REQUIREMENTS
The previous huge TSX files caused Framer to freeze when saving.
Do not repeat that mistake.
Build an efficient architecture with reusable modules and separately loaded content.
Avoid embedding:

* Thousands of long ritual descriptions in one TSX file.
* Large base64 image collections.
* Hundreds of full scene components inside a single source file.
* Heavy synchronous scene initialisation.
* Unnecessary effects and animation loops.

Keep the main Framer component lightweight.
Use efficient asset loading, clearly defined scene modules, reusable animation systems and data-driven content selection.
Build touch-responsive scenes that perform well on iPhones.
Provide fallbacks for unsupported haptics, audio features and two-finger interaction.
Respect reduced-motion preferences.
Use actual approved Mallow assets, preserving transparency and visual integrity.
Keep subtitles, top controls, emotional sidebar and gameplay areas clearly separated.
No clipped buttons.
No unreadable instructions.
No overlapping text.
No black masks covering character images.
Optimise portrait phone layouts and gracefully adapt to desktop.
Preserve working save, settings, music, privacy and other existing functionality unless changing it is genuinely necessary.
14. BUILD THE FIRST COMPLETE EXPERIENCE
Do not attempt to generate 1,000 shallow worlds immediately.
Build one truly remarkable vertical slice containing:
Opening: A living Mallow immediately available to squeeze.
Cinematic input: A short, natural subtitle invitation to share a feeling.
Thought materialisation: The user's words become a Thought Mallow.
Squeeze interaction: Believable soft-body physics with facial responses.
First world: Glitzi's Static Storm, built around emotional charge and enjoyable intentional slowing.
Seamless transition: Static Storm melts into a luminous interactive ocean.
Second world: A distinctive wave interaction that feels as relaxing as the wave experience I previously liked.
Discovery: The user can experimentally observe how changing their movement changes the world.
Skill saved: A beautiful optional Memory Garden installation animation.
Continuation: The next Hushflow experience begins automatically if the user has enabled Auto-flow.
User freedom: Pause, finish, switch emotion or continue.
Build this as actual playable Framer code.
Every step must work.
The user should never feel that they are dragging objects around simply to satisfy an arbitrary objective.
15. REQUIRED QUALITY AUDIT
Test the prototype against these standards:

* Can a user squeeze a Mallow immediately?
* Does the Mallow visibly deform rather than merely shrink?
* Do the face and body react naturally?
* Does the interaction feel satisfying without instructions?
* Can the user enter a real thought without leaving the cinematic experience?
* Do the subtitles give the user time to read?
* Is the user's actual text used in the world?
* Does the emotional mechanism make sense?
* Does each environment have its own actual gameplay behaviour?
* Does the wave experience feel soothing rather than task-like?
* Are transitions seamless?
* Can the user freely pause or leave?
* Do saved skills remain accessible?
* Is every screen readable on an iPhone?
* Does Framer save without freezing?
* Does the full experience work without runtime AI?

Test at least a small iPhone portrait layout, 390 × 844, a larger mobile layout and desktop.
Test actual touch behaviour, not just mouse clicks.
Identify and correct weak experiences rather than presenting cosmetic reskins as finished gameplay.
16. LONG-TERM EXPANSION
Design Hushflow so it can expand to hundreds or thousands of original experiences over time.
But do not equate 1,000 database records with 1,000 genuinely different experiences.
Keep a world registry containing:

* World ID and title.
* Emotional purpose.
* Source technique.
* Evidence classification.
* Unique scene environment.
* Touch mechanics.
* Mallow character behaviour.
* User-input integration.
* Emotional experience progression.
* Cinematic dialogue.
* Sound and haptics.
* Completion and transition logic.
* Memory Garden reward.
* Accessibility alternatives.
* Playtest results.
* Implementation status.

A new world must deliver a meaningfully different experience.
Do not generate repetitive template games with different colours and names.
The experience must be designed for emotional usefulness, original tactile enjoyment and production quality.
17. DELIVERABLES
Work in this order:

1. Audit the existing app and preserve working assets and functions.
2. Define the final Hushmallow creative and technical architecture.
3. Create the original MallowTouch soft-body interaction engine.
4. Build cinematic subtitle input and responses.
5. Build the Thought Mallow representation system.
6. Build the continuous Hushflow world-transition engine.
7. Implement the first two genuinely distinct playable environments.
8. Create the Memory Garden installation animation.
9. Implement the Flow and Beyond subscription presentation and entitlements.
10. Test, optimise, fix and package the working Framer code.

Provide actual code and a usable build, not just a written proposal.
Clearly identify what has been implemented, what has been tested and what is planned.
Never label an unbuilt feature as complete.
FINAL CREATIVE COMMAND
Stop thinking of Hushmallow as an app containing 1,000 rituals.
Think of it as a living emotional universe that begins with one incredibly satisfying squeeze.
The Mallows are the toys.
Thoughts become characters.
Feelings influence the world.
Touch becomes the interaction.
Discoveries become tools.
Skills become beautiful memories.
Worlds flow continuously.
The experience is cinematic, tactile, magical, funny when appropriate, soothing when needed and unmistakably original.
Users should want to open Hushmallow when they feel emotionally overloaded because touching and interacting with their Mallows feels wonderful, with useful emotional skills naturally embedded in the experience.
Create the first complete, extraordinary, playable version of that vision.
Build the Mallow that people cannot wait to squeeze again because it feels delightful—not because the app pressures them to return.# CLAUDE — HUSHMALLOW GLOBAL TYPOGRAPHY REDESIGN

Claude, completely upgrade the typography across the entire Hushmallow app to an **ultra-premium, cinematic, beautiful, emotionally expressive standard**.

Hushmallow is an interactive emotional universe featuring seven living, squeezable Mallows. Every word must feel carefully designed and integrated into that universe.

**Creative benchmark: Apple elegance + Pixar character warmth + Netflix cinematic storytelling + premium mobile game typography.**

Do not copy their branding or proprietary fonts.

## 1. Create a beautiful global font system

Use a carefully chosen combination of:

- **Nunito Sans** — warm, rounded, friendly text suitable for the Mallows.
- **Manrope** — sophisticated, premium typography for interface controls and settings.
- **Fraunces** — selectively for magical discoveries, cinematic chapter titles and special emotional moments.

Use appropriate licensed font files or reliable loading methods. Never rely on fonts that fail to load in Framer.

Do not mix too many typefaces on one screen. Define consistent global styles and reusable typography tokens.

## 2. Apply typography throughout the entire app

Redesign every textual element:

- Hushmallow home screen and brand presentation.
- Cinematic conversations.
- Floating movie-style subtitles.
- User thought and emotion overlays.
- Mallow dialogue.
- World introductions and transitions.
- How to Play instructions.
- Emotional choices and side controls.
- Interactive thought and belief labels.
- Ritual names and descriptions.
- Mind bends and discoveries.
- Memory Garden skill collections.
- Settings and navigation.
- Subscription screens for **Hushmallow Flow** and **Hushmallow Beyond**.
- Pause, Resume, Skip and Continue controls.

No screens should retain inconsistent or unattractive default typography.

## 3. Cinematic subtitles — extremely important

Hushmallow's subtitle system is a signature feature.

Make dialogue feel like beautifully directed animated-film storytelling.

Requirements:

- Short phrases, usually one or two lines.
- Comfortable reading sizes.
- Natural line breaks.
- Gentle fade and reveal effects.
- Sufficient time to absorb each sentence.
- Beautiful spacing and letterforms.
- Excellent legibility over moving scenes.
- No excessive glowing, bouncing or shaking text.
- No cheap typewriter effects.
- Avoid text that disappears before users finish reading.
- Allow users to pause, replay, skip or adjust subtitle speed.

**Users must be able to keep squeezing and playing with Mallows while reading.**

Use a subtle adaptive gradient or soft contrast treatment behind dialogue only when necessary.

Do not cover Mallow faces or important interactive objects.

## 4. Give different types of text distinct personalities

**Mallow conversations:** Warm, soft, personable, slightly rounded.

**Thought Mallows:** Expressive and emotionally relevant, but readable.

**Cinematic discoveries:** Elegant, memorable and quietly spectacular.

**Memory Garden rewards:** Beautiful, magical and celebratory without becoming visually noisy.

**How to Play:** Extremely clear, direct and readable.

**Settings:** Minimal, refined and familiar to iPhone users.

**Subscription screens:** Aspirational, elegant and trustworthy.

## 5. Mobile-first font sizes

Use responsive typography, with these starting guidelines:

| Text element | Suggested iPhone size |
|---|---|
| Main cinematic title | 28–36px |
| World title | 24–30px |
| Mallow dialogue | 19–23px |
| Cinematic subtitles | 19–22px |
| Body text | 16–18px |
| How to Play | 16–18px |
| Buttons | 15–17px |
| Supporting labels | 13–15px |

Adjust for small screens, user accessibility settings and actual layout testing.

Avoid unnecessarily tiny text. Prioritise readable contrast, adequate line height and responsive text sizing.

Do not let titles, conversations or instructions overlap character artwork or controls.

## 6. Make typography feel alive

Introduce subtle context-sensitive effects:

- Cinematic titles may softly emerge from the environment.
- Important discoveries can reveal in carefully timed sequences.
- Mallow dialogue can respond with small, personality-driven transitions.
- Memory Garden titles can appear with refined light effects.
- User-entered words can transform into interactive objects while remaining readable.

Animations should enhance meaning, not distract users.

Respect reduced-motion preferences.

## 7. Preserve the Hushmallow logo

Keep the official **hushmallow** logo in lowercase.

Do not replace its lettering with ordinary text or alter the approved logo artwork.

The rest of the typography should complement its soft, expressive visual identity.

## 8. Technical implementation

Create a central typography system with reusable styles and design tokens.

Apply it globally throughout Hushmallow.

For Framer:

- Use efficient, compatible font loading.
- Avoid large embedded font files inside TSX.
- Keep the component lightweight.
- Provide appropriate fallback fonts.
- Prevent layout shifts when fonts load.
- Ensure text remains legible in bright and dark environments.
- Test mobile layouts at 375 × 812, 390 × 844 and 430 × 932.
- Verify that all text fits without clipping, overlap or horizontal scrolling.

Do not merely replace `font-family` across the project.

Review hierarchy, font weights, line heights, letter spacing, sizing, positioning, alignment, contrast and animation.

## 9. Final typography quality audit

Inspect every visible piece of text across all Hushmallow screens.

Correct:

- Ugly default fonts.
- Overly small text.
- Poor contrast.
- Inconsistent typography.
- Text covering Mallows.
- Cut-off instructions.
- Overlapping buttons.
- Titles competing for attention.
- Dialogue disappearing too quickly.
- Font loading failures.
- Excessive visual effects.

**Final instruction:**

Make Hushmallow's typography so beautiful, readable and distinctive that users instantly recognise it as part of a world-class premium app.

The result should feel **cinematic, magical, warm, sophisticated, irresistibly inviting and unmistakably Hushmallow**.

Implement the changes in the actual app code, preserve working functionality and verify the results on iPhone-sized screens.
CLAUDE — GLOBAL HUSHMALLOW BRAND CAPITALISATION RULE
Claude, implement a permanent, global branding rule throughout the entire Hushmallow ecosystem.
1. Official brand spelling
The brand name must ALWAYS be written as:
hushmallow
All lowercase letters, including the first h.
Never use:

* Hushmallow
* HUSHMALLOW
* HushMallow
* Hush Mallow

The only approved spelling is hushmallow.
This applies to every screen, message, document and brand asset.
2. Update everywhere
Audit and correct the brand spelling across:

* Official logo and wordmark
* App icon where text appears
* Splash and loading screens
* Home screen
* Cinematic subtitles and Mallow conversations
* All in-app messages and notifications
* Settings and menus
* Memory Garden
* Hushflow experiences
* Subscription and payment screens
* App Store descriptions and screenshots
* Website and landing pages
* Welcome emails and customer support messages
* Social media bios, advertisements and marketing materials
* Terms of service and privacy policy
* Sharing screens and referral messages

3. Subscription branding
Use these exact customer-facing names:
hushmallow Flow
hushmallow Beyond
Do not revert to Paid, Ultra or Premium as customer-facing plan names.
4. Official tagline
Use:
Less noise. More magic.
Keep the approved punctuation and capitalisation.
Where the brand and tagline appear together:
hushmallow — Less noise. More magic.
5. Logo requirements
The logo must display hushmallow entirely in lowercase.
Preserve the existing approved mascot artwork, proportions, colours and visual identity.
Do not redesign the logo unnecessarily.
If the logo contains baked-in uppercase lettering, update the logo asset itself—not simply add lowercase text over the original image.
Maintain premium typography and consistent spacing.
6. Make this a permanent design-system rule
Create a centralised brand configuration:

* `brandName: "hushmallow"`
* `brandTagline: "Less noise. More magic."`
* `flowPlanName: "hushmallow Flow"`
* `beyondPlanName: "hushmallow Beyond"`

Use this shared configuration wherever possible to prevent inconsistent spelling.
Preserve technical identifiers, existing domains, API paths, subscription product IDs and other integrations if changing them would break functionality.
7. Final audit
Perform a case-sensitive search across the complete project.
Identify all customer-facing instances of incorrect capitalisation and correct them.
Verify the logo, app screens, subscription presentation and communications visually.
Final non-negotiable rule: The first letter of hushmallow must always be lowercase in all customer-facing branding and communications, including the logo.
Implement the changes without breaking existing functionality.