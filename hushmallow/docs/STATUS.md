# Hushmallow — status

What is built and verified, what is known to be imperfect, and what needs
you. "Verified" means driven end to end in a real browser (Chromium via
Playwright) at phone sizes, plus the automated tests. Nothing here has been
tried on a physical phone yet; see §4.

---

## 1. Built

### The two paid experiences
| | Hushmallow (Paid) | Hushmallow Ultra |
|---|---|---|
| Rituals | 10 interactive rituals (below) | Everything in Paid |
| Quick tricks | 291 one-minute attention and getting-started tricks | All 1,000 ThinkStill tricks (the extra 709 are plot twists for thoughts) |
| Reframe | — | **Another Angle**: Fact or Fiction split, Thought X-Ray, Evidence Orbit, Perspective Portal, Possibility Machine and conversation practice, plus optional lenses (see §1.4) |

Access is enforced in code, not just hidden: the ritual host refuses to run
without the right plan, the recommender never offers outside the plan, and
Ultra code and content (Another Angle, the 709 plot twists) are only ever
loaded through `loadUltra()` / `loadUltraTricks()`, which check the plan.
There are no Reset / Release / Reflect / Reframe consoles anywhere.

### 1.1 Paid ritual library
Every emotion family in the A–Z taxonomy has at least one made-for-it ritual
(a test checks this).

| Ritual | Mallow · realm | For | What you do |
|---|---|---|---|
| Static to Signal | Glitzi · Static Storm | anger, frustration | Scribble the static out, hold the ground stone through three breaths, flick away what isn't yours, name the need, pick a next move |
| Green Glitch Compass | Glitzi · Static Storm | envy, jealousy, comparison | Glitch the highlight reel apart, spin the compass to what you want, turn the comparison dial down, take one step your way |
| Raindrop Keeper | Blubi · Raindrop Lagoon | sadness, grief, hurt, loneliness | Catch drops and name them, hold them warm, float them out as lanterns, choose one small kindness |
| Soft Landing | Blubi · Raindrop Lagoon | shame, guilt, embarrassment | Cool the hot stone in the lagoon, wrap it in a friend's words, choose a repair or a rest, pocket the pebble |
| Untangle | Zuzu · Spiral Observatory | confusion, indecision, overthinking | Wind the knot, pull each strand free, sort threads onto orbit rings, give the first one a tug |
| Sunpop Savour | Boppo · Sunpop Orchard | joy, love, pride, gratitude | Plant the good thing, water it with details, soak it in, keep or share it |
| Spark to Lantern | Pipzi · Spark Festival | excitement, restlessness, cravings, shock | Tap with the slowing beat, surf the urge wave, spark or shelf the energy, launch a lantern |
| Drift and Dock | Loomi · Blue Drift | anxiety, worry, dread | Trace the slow wave, launch worry boats, dock them (today / later / not mine), drop an anchor |
| Moonmilk Wind-down | Noomi · Moonmilk Cove | exhaustion, burnout, boredom, numbness | Snuff the day's lanterns, sweep a moonbeam down, slow blinks, one tiny rest |
| Name It | Loomi (any) · Blue Drift | any feeling, incl. disgust and mixed | Find a closer word, place it in the body, give it a shape, ask what it needs |

Every gesture has a button or keyboard alternative; reduced motion and low
stimulation are respected; leaving mid-ritual cleans up. The library is
data: a ritual is two files plus two list entries, with no app changes and no
cap on the number of rituals.

### 1.2 The 1,000 ThinkStill tricks
Imported unchanged from the locked workbook (`content/`) by
`tools/import_tricks.py`. Each trick plays as: the Mallow's line in your
chosen voice (Jolly / Cheeky / Unfiltered; Unfiltered swears and is opt-in),
**call it** (a dial, yes/no, choice, counter or a sealed guess, chosen from
the trick's own wording), **your move** with a pacing ring, **plot twist**
card flip and "how did your guess do?", **mind bend**, then replay or another.
Extra-care tricks show their safety note first and are held back when a
feeling is very intense.

### 1.3 The Hushfold
All seven realms are full procedural worlds that respond to mood (agitation,
heaviness, clarity, warmth), transform at a ritual's finale and react to six
kinds of pulse, with no full-screen flashes:
Static Storm, Raindrop Lagoon, Spiral Observatory, Sunpop Orchard,
**Spark Festival**, **Blue Drift** and **Moonmilk Cove** (the last three are
new; they were grey placeholders).

### 1.4 Another Angle lenses (Ultra)
Optional lenses after the Perspective Portal, picked by rule from what the
person wrote: **Future Lens** (known vs predicted), **Meaning Mixer**
(dials on loaded words like "always" or "terrible") and **Zoom Out** (the
wider picture). See §5 for the final check of this work.

### 1.5 Fixed in this round
- The finish screen never loaded (a stray bracket), so no ritual could
  actually finish.
- A sound-engine error (`setValueCurveAtTime overlaps`) could end a ritual
  on a sigh. Envelopes now fall back safely and sound errors are contained.
- Holds and breath timers ran slow on janky frames; they now use real time.
- Ritual titles were unreadable on bright realms; speech bubbles covered
  instructions; Meet a Mallow hid the Mallow's face behind the card; the
  express screen's button was off-screen on 320×568.
- Plans claimed a 1,000-trick library that didn't exist and "written by
  people"; both corrected (and the library now exists).
- Test purchases worked on any website, which would have given plans away
  on a public site. They are now limited to hosts in `src/app/config.js`.
- The font came from Google Fonts (every visitor's IP sent to Google); it is
  now bundled.

---

## 2. How it was checked
- `node --test hushmallow/tests/*.test.mjs`: library validity, every module
  exists, every family has a Paid fit, reframing is Ultra-only, the 1,000
  tricks are all present once with Paid/Ultra split by issue, no swearing
  outside Unfiltered, plan copy matches the data, entitlement gates (no plan /
  Paid / Ultra), rotation never repeats, the feeling finder, crisis
  detection, no network calls in the shipped code, plus the Reframe engine
  tests.
- Each ritual: played to the finish screen with real pointer gestures at
  390×844, with button alternatives at 320×568, with reduced motion, and
  left mid-way. Zero console or page errors in every final run.
- Experience A ("I'm furious about what happened at work.") played through
  the real app from Home to the finish screen.
- Every ritual started through the real ritual host (not the dev lab) at
  390×844 and 320×568, then left: no errors, no horizontal overflow, nothing
  left behind.

## 3. Known imperfections
- **Speed on real phones is unmeasured.** The test machine renders canvas in
  software and was heavily loaded, so frame times there (roughly 20–40 ms for
  the busiest realms) say little about a phone's GPU. Blue Drift (live
  reflections) and Spark Festival are the heaviest; check them on an older
  iPhone first. Realms already drop to 1× resolution when frames are slow.
- On 320×568 some rituals show the Mallow quite small, and speech bubbles
  can briefly cover part of a ritual's scene.
- The home screen stands the Mallow higher than each realm's painted stage,
  so the stage sits behind the bottom buttons there.
- Shake detection in Green Glitch Compass doesn't ask iOS for motion
  permission; tapping and rubbing work everywhere.
- No dedicated drum, sizzle or pocket sounds exist yet; rituals reuse the
  closest existing sounds.

## 4. Needs you
1. **Payments.** App Store: Apple Developer account, the four products
   (`hushmallow.paid.monthly/yearly`, `hushmallow.ultra.monthly/yearly`), and
   a native wrapper implementing the `hushStore` bridge with StoreKit 2. Web:
   a payment provider (e.g. Stripe) and a small server that confirms the plan.
   Until one exists, the public web build can't sell or unlock plans.
2. **Editorial and safety review.** Every ritual is `review.status: 'draft'`.
   A person should sign off the copy, ideally including someone with
   wellbeing or clinical-content experience for the safety lines and the
   support numbers in your launch countries. The 1,000 tricks are as locked
   in your workbook.
3. **A real-phone pass**: sound by ear, haptics, frame rate, safe areas.
4. **Hosting**: switch on GitHub Pages (see `docs/FRAMER.md`) and add the
   Framer component.

## 5. Final check of this round
See the summary at the end of the session for the last Another Angle and
Experience B verification.
