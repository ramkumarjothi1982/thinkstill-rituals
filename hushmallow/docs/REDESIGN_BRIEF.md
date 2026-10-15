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

---

# Brief 2 (from the owner, 12 Oct 2026): hushmallow Beyond — Another Angle with a secure backend, and the brand language rule

This supersedes the earlier "no AI at runtime" rule for **Another Angle in hushmallow Beyond only**; everything else stays deterministic. Kept verbatim:

CLAUDE MASTER PROMPT — hushmallow Beyond
Build the world's most compelling AI-powered Reframe experience
Claude, redesign and upgrade Another Angle, the Reframe experience exclusive to hushmallow Beyond, using a secure AI backend.
The objective is to provide users with exceptionally relevant, intelligent, practical and thought-provoking alternative perspectives on their own real-life situations.
This must NOT behave like an ordinary AI chatbot, therapy questionnaire or motivational quote generator.
It must feel like a premium, cinematic, interactive experience inside the Hushfold, featuring the seven living Mallows.
The goal: The user enters a thought that bothers them and discovers a more helpful way to understand or respond to the situation, often within 30–90 seconds.
Do not promise guaranteed emotional relief.
1. WHAT THE AI BRAIN MUST DO
The user may enter:

* "My boss embarrassed me in front of everyone."
* "My partner hasn't replied for hours."
* "I failed my exam. I'm useless."
* "Nobody likes me."
* "My colleague got promoted instead of me."
* "I made a mistake at work. Everyone will judge me."
* "My friend invited everyone except me."

The AI must identify what is actually bothering the user and provide a relevant, useful new angle.
It should consider:

1. What the user actually knows.
2. What they might be assuming.
3. What alternative explanations remain possible.
4. What is within their control.
5. Whether a practical next action would help.
6. Whether a more compassionate perspective is appropriate.

Use evidence-informed principles from CBT, ACT, DBT, cognitive flexibility, self-compassion and practical problem-solving.
Never invent facts about other people or pretend to know their intentions.
Never invalidate the user's experience or insist that a genuinely harmful event was harmless.
2. EXTREMELY SHORT AI RESPONSES
This is non-negotiable.
Each visible AI response must contain a maximum of two short sentences, ideally 15–35 words total.
No essays.
No paragraphs.
No five-point lists.
No generic motivational speeches.
No therapy jargon.
No repetitive empathy introductions.
No "As an AI..."
No automatic "I understand how you feel."
Responses should be:

* Highly situation-specific.
* Emotionally appropriate.
* Intelligent.
* Practical.
* Conversational.
* Unexpected when helpful.
* Easy to understand.
* Memorable.
* Grounded in the user's actual issue.

A strong response should produce a moment of recognition:
"Oh. I hadn't thought of that."
Or:
"That's actually something I can do."
Keep the tone warm, sharp and lightly playful when suitable, never dismissive.
3. EXAMPLES OF THE REQUIRED QUALITY
Example A — Work embarrassment
USER:
"My boss embarrassed me in front of everyone."
WEAK RESPONSE:
"Remember that you are worthy and valuable. Practise self-love."
UNACCEPTABLE.
BETTER RESPONSE:
"Your boss's behaviour may have been unfair. What matters now is deciding whether to address it privately or document what happened."
The second response acknowledges the situation and gives the user an actionable choice.
Example B — Relationship anxiety
USER:
"He hasn't replied to my message for five hours."
WEAK RESPONSE:
"Don't worry. He probably loves you."
UNACCEPTABLE.
BETTER RESPONSE:
"Five hours without a reply is a fact. What it means is still an unanswered question."
Example C — Self-criticism
USER:
"I failed my exam. I'm useless."
WEAK RESPONSE:
"Believe in yourself. You are amazing."
UNACCEPTABLE.
BETTER RESPONSE:
"One exam measured your performance on one day. It didn't measure everything you're capable of learning."
Example D — Jealousy
USER:
"My colleague got promoted instead of me."
BETTER RESPONSE:
"That disappointment makes sense. Could you ask what specific experience or results would strengthen your next promotion opportunity?"
Example E — Overthinking
USER:
"I keep replaying something embarrassing I said."
BETTER RESPONSE:
"Your brain keeps replaying the moment, but replaying isn't repairing. Is there anything useful left to do, or can this remain an awkward memory?"
These examples establish the quality standard, not fixed answers to repeat.
AI must dynamically respond to each user's actual situation.
4. MAKE THE USER DISCOVER THE REFRAME THROUGH GAMEPLAY
Do not immediately display the entire response in a message box.
Create a cinematic interactive sequence.
Example:
USER:
"My boss embarrassed me."
The user's own words materialise as a small, distressed Thought Mallow.
Zuzu enters the scene.
The Thought Mallow is holding a glowing interpretation.
Zuzu slowly separates the visible event from the assumptions surrounding it.
The user interacts using swipes, squeezes, stretching, peeling, rotating or moving thought objects.
An AI-generated short perspective is then revealed as a cinematic subtitle.
The user should experience the distinction, not simply read it.
Different AI reasoning patterns must drive meaningfully different interactive mechanics.
Examples:
Fact versus assumption: Pull apart two connected Thought Mallows.
Catastrophising: Slowly resize an exaggerated future projection.
Personalisation: Move the imagined responsibility back to its appropriate place.
All-or-nothing thinking: Reveal a spectrum between extremes.
Mind reading: Open several possible interpretations without claiming one is true.
Overgeneralisation: Separate one event from a larger collection of experiences.
Rumination: Let a looping thought continue moving without repeatedly engaging it.
Practical problem: Assemble one small actionable next step.
Self-criticism: Soften an overly harsh interpretation without erasing accountability.
Valid anger: Identify what boundary or response may be needed rather than pressuring the user to forgive.
Do not implement every experience as the same floating-card interface.
5. SHORT CINEMATIC SUBTITLE DELIVERY
No chatbot bubbles.
No ordinary question-and-answer form.
AI responses must appear as beautifully paced movie-style subtitles while users continue interacting with Mallows.
Example:
Zuzu reveals:
"Five hours without a reply is a fact."
Pause naturally.
"What it means is still an unanswered question."
Allow the user time to read and absorb the words.
Requirements:

* One brief sentence at a time.
* Large, readable, premium typography.
* Soft fade-in animation.
* Carefully designed pauses.
* The user can squeeze or touch the Mallow while reading.
* Important lines remain until acknowledged.
* Replay, pause, skip and subtitle-speed controls.
* No text covering Mallow faces or essential touch targets.
* No long AI monologues.

A user should feel they're discovering something through an interactive film.
6. USE THE AI TO CHOOSE A RELEVANT EXPERIENCE
The AI should return structured reasoning information, not merely dialogue.
Return a validated JSON object containing fields equivalent to:

* emotion
* situation_type
* reasoning_pattern
* known_fact
* possible_assumption
* alternative_angle
* practical_next_step
* interaction_type
* mallow_character
* subtitle_line_1
* subtitle_line_2
* safety_status

The renderer must use a controlled list of authored interaction types and approved Mallow characters.
Do not let the model generate arbitrary executable code, URLs or unsafe gameplay instructions.
The AI should never invent the content of the user's original experience.
The user's raw text remains separate and unchanged.
The game engine uses the structured result to choose and personalise the appropriate scene.
7. MAKE THE MALLOWS CENTRAL
Zuzu is the signature guide for Another Angle.
However, all seven Mallows may participate depending on the situation.

* Zuzu — unexpected perspectives and cognitive flexibility.
* Glitzi — anger, boundaries and frustration.
* Noomi — detachment, rest and rumination.
* Loomi — calm and emotional steadiness.
* Blubi — sadness and emotional tenderness.
* Boppo — self-compassion and constructive action.
* Pipzi — curiosity, possibility and playful discoveries.

Mallows should have expressive faces, soft-body physics, memorable reactions and occasional tasteful humour.
Avoid generic static avatars.
The AI writes concise content; the app controls character movement, animation and visual storytelling.
8. GIVE THE USER A CHANCE TO TEST THE NEW ANGLE
A reframe should not simply be presented as the correct answer.
The user should be able to explore it.
Examples:
"Could there be another explanation?"
"What do you actually know?"
"What would you tell a friend?"
"Is there one useful action?"
Allow the user to select an interpretation, reject a suggestion or ask for another angle.
If the first reframe doesn't fit, generate a genuinely different perspective without contradicting known facts.
Never force the user to agree.
Include optional feedback:

* That helped.
* Show me another angle.
* Not relevant.
* I'd rather just squeeze a Mallow.

Use feedback to improve future suggestions only with appropriate privacy protections and consent.
9. THE AI MUST FEEL INTELLIGENT, NOT GENERIC
Create a quality-control layer.
Reject and regenerate responses that are:

* Generic affirmations.
* Unrelated to the user's input.
* Too long.
* Repetitive.
* Factually speculative.
* Overly therapeutic.
* Condescending.
* Unrealistically positive.
* Blaming the user.
* Overly complicated.
* Impractical.
* Inappropriately humorous.
* Based on unsupported assumptions.

Ensure multiple requests for another angle produce genuinely different useful perspectives.
But do not manufacture novelty at the expense of accuracy or emotional safety.
Specificity, credibility and practical usefulness take priority over cleverness.
10. SECURE AI BACKEND
Use a proper server-side AI architecture.
Never expose API keys in Framer's frontend code.
Preferred architecture:
Framer iPhone UI → Secure backend endpoint → AI provider → Response validation → Structured scene data → Hushmallow cinematic renderer.
Cloudflare Workers is an acceptable option if it fits the existing deployment.
Requirements:

* Server-side secrets.
* Authentication and Beyond entitlement verification.
* Secure HTTPS.
* Strict input validation and output schema validation.
* Rate limiting and abuse protection.
* Token and usage cost controls.
* Model timeouts and error handling.
* Safe fallback responses.
* Monitoring without unnecessary sensitive content logging.
* Protection against prompt injection.
* Versioned system prompts.
* Model-independent provider abstraction where practical.
* Explicit disclosure that this feature uses AI.

Use an appropriate fast, capable model that reliably follows short, structured-output instructions.
Optimise for accuracy, response relevance, latency and cost.
Do not hard-code a provider without considering the existing project configuration.
Target fast responses, but never sacrifice response safety or accuracy merely to save time.
While waiting, the user must be able to keep squeezing the Mallow. Do not display a blocking spinner.
11. PRIVACY AND EMOTIONAL SAFETY
Users may enter sensitive personal information involving relationships, workplace conflict, shame, grief or distress.
Do not automatically transmit uploaded personal photographs to the AI backend.
Ask for explicit permission before any image analysis.
Process only the minimum information needed.
Provide clear data-retention and deletion controls.
Do not use personal emotional disclosures for model training without explicit, informed consent and an appropriate provider arrangement.
The AI must not diagnose conditions, replace professional care, encourage dependency or provide false psychological certainty.
Handle severe distress, self-harm risk, abuse and crisis disclosures using an appropriate, separately designed safety response.
Do not present ordinary reframes as sufficient support for emergencies.
12. NEW SUBSCRIPTION POSITIONING
Preserve exactly two paid subscription plans:
hushmallow Flow
Core squeezable Mallows, emotional release, Hushflow, Memory Garden and personal emotional experiences.
hushmallow Beyond
Everything in Flow, plus the AI-powered Another Angle Reframe experience.
Make the additional value immediately understandable.
Beyond users get more useful ways to examine their thoughts and situations, not simply longer AI conversations.
The rest of the Hushmallow experience can remain deterministic and AI-free.
Clearly distinguish which feature uses AI.
13. PREMIUM INTERACTION AND RETENTION
Make the experience delightful, memorable and worth voluntarily returning to.
Use:

* Exceptionally satisfying Mallow squish physics.
* Short cinematic revelations.
* Responsive visual transformations.
* Surprising but relevant perspective changes.
* Character-specific reactions.
* Gentle haptics and beautiful sound.
* Optional Memory Garden discoveries.
* Meaningful real-world takeaways.

Avoid artificial pressure, endless engagement traps, guilt-based streaks or rewards designed to prolong distress.
The user should feel comfortable finishing after one useful insight.
Success means people find the experience enjoyable and helpful enough to return when they choose.
14. IMPLEMENTATION PRIORITY
Build and test one complete working vertical slice before expanding.
The first experience should demonstrate:

1. User opens Another Angle.
2. Zuzu appears as a living, squeezable Mallow.
3. User enters a real concern using a cinematic overlay.
4. The concern becomes an expressive Thought Mallow.
5. The secure backend analyses the relevant situation.
6. A short, practical alternative perspective is generated.
7. Gameplay makes that distinction visible and interactive.
8. The perspective appears in two short cinematic subtitle lines.
9. The user can explore, reject or request another angle.
10. The user can save a useful discovery in the Memory Garden.
11. The user can continue Hushflow or finish immediately.

Test with at least 30 varied realistic inputs spanning relationships, work, anxiety, jealousy, shame, self-criticism, disappointment, rumination and uncertainty.
Evaluate relevance, accuracy, concision, actionability, respectful tone, emotional safety and gameplay enjoyment.
Fix weak responses before expanding.
Also verify performance on iPhone-sized screens and keep the Framer component lightweight.
FINAL NON-NEGOTIABLE STANDARD
The user should feel that Zuzu has revealed a useful possibility they had not considered—not that an AI has delivered a generic motivational message.
Maximum two short sentences per reveal.
Deep reasoning behind the scenes.
Simple, meaningful words on the screen.
Spectacular, tactile, original gameplay.
Practical relevance to the user's real issue.
Build the actual AI-backed experience, not a mock chatbot or scripted demonstration.
The desired feeling is:
"That actually makes sense. Let me try looking at it that way."# CLAUDE — PERMANENT hushmallow BRAND LANGUAGE RULE

Although hushmallow Beyond uses an intelligent backend to generate personalised reframes, **never use the term "AI" in the everyday user experience, marketing language or cinematic storytelling.**

## Mandatory changes

Remove technology-focused labels such as:

- AI-powered Reframe
- Ask AI
- AI Brain
- AI Assistant
- AI Analysis
- AI-generated Response
- AI Insights
- Powered by AI

Instead, use Hushmallow's own original language:

| Instead of | Use |
|---|---|
| AI-powered Reframe | Another Angle |
| AI is analysing your thought | Zuzu is exploring another angle |
| AI-generated insight | A new perspective |
| Ask AI again | Show me another angle |
| AI response | Zuzu's perspective |
| AI has found a solution | Here's something worth considering |
| Save AI insight | Keep this discovery |
| AI recommendations | Suggested experiences |

## Cinematic experience

Never display technical processing messages.

While the backend prepares a response, Zuzu must remain animated and squeezable.

Use subtle cinematic subtitles such as:

"There's another side to this..."

"Let's look a little closer."

"What else could be true?"

Then reveal one or two short, situation-specific sentences.

Do not imply Zuzu is a real human or that it knows things about the user that were never provided.

## Important transparency exception

Keep accurate disclosures about automated processing, external service providers, sensitive information and data handling in the appropriate privacy, consent and legal screens.

Do not hide material information from users or make misleading claims about how their personal information is processed.

## Permanent rule

**The technology operates behind the scenes. The Hushmallow universe remains the experience.**

Users interact with Mallows, thoughts, feelings, discoveries and perspectives—not technical systems.

Apply this consistently across the app's visible interface, subscription descriptions, tutorials, subtitles, buttons and marketing materials.

Preserve the secure backend, short personalised responses and the existing features.