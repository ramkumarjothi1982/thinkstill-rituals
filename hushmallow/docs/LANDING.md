# hushmallow landing page (Framer)

`framer/HushmallowLanding.tsx` is the whole public landing page as one Framer
code component: the hero, the live Mallow preview, the seven Mallows and the
sign-up entry points. It uses the official logo and the seven approved Mallow
artworks, and it doesn't sign anyone in by itself. Its buttons hand people to
**your app's** sign-up and log-in pages, and those pages talk to Supabase.

Screenshots: `landing/screenshots/`. Local preview and automated checks:
`landing/preview/` (see the end of this file).

---

## 1. The concept: "A softer space for feelings."

**hushmallow: A softer space for feelings.** *A playful, soothing space to
touch, unwind and connect.* The page follows the journey curiosity → delight →
sensory interaction → understanding → human connection → sign-up, with the
Mallows as the stars throughout. hushmallow is never called an AI companion,
therapy, a dating service or a game.

| Section | Headline | What the visitor does |
|---|---|---|
| Hero | **A *softer* space for feelings.** / *A playful, soothing space to touch, unwind and connect.* | Presses and holds Pipzi, who squishes, closes her eyes happily, rebounds and says *"Hey. Long day?"* The other six lean towards the cursor and hop along, and tapping one brings it to the middle. The word **softer** squishes with the Mallow. **Meet the Mallows** goes to the character stage and **Discover hushmallow** to the three ways in. |
| Three ways in (`#discover`) | **Touch. Unwind. Connect.** | Three linked columns, each with its Mallows. Connect is marked *Coming soon*. |
| Touch (`#mallows`) | **Meet the Mallows.** | A character stage with the neighbouring Mallows peeking in. Picking one makes it drop into focus and say hello in its own voice, and squeezing shows its signature move. Swipe, arrows or the tray all work. |
| Unwind (`#unwind`) | **A little room for everything you feel.** | Pops floating everyday thoughts ("47 tabs open", "fine, technically"). |
| Unwind (`#try`) | **How's your world feeling right now?** | Picks a feeling, or types one into **FeelSense** (see below). The matching Mallow moves the way that feeling feels, three press-and-hold breaths soften the thought cloud, the visitor lets it drift or keeps it and checks in on how they feel, and then gets the invitation → **Create my hushmallow account**. |
| Unwind (`#how`) | **More than a moment.** | Pause, Express, Release, Reframe and Reflect along a line that fills as you scroll. |
| Connect (`#hushmates`) | **Real people. Softer connections.** · *Coming soon* | Introduces **Hushmates**. Loomi and Boppo face each other across a soft glowing line, and squeezing one sends a little heart to the other. There is no chat, no matching and no member count. A **Keep me updated** button appears only if you set a real updates URL; otherwise the section says plainly that Hushmates isn't open yet. |
| Your space (`#join`) | **Your space, your pace.** | Why an account is worth having today, a working opt-in **"Remember my Mallow on this browser"** switch, and the sign-up panel. |
| Final | **Find your soft place.** | All seven Mallows on a dusk horizon. A remembered visitor reads *"Loomi will be here whenever you're ready."* |

**Why it should convert:** the page lets people feel the product before
asking for anything, and it makes clear that the Mallows and the Unwind moments
exist *today*. Hushmates is presented as something coming later, not as the
reason to join. Every sign-up button passes the feeling and Mallow the visitor
tried on to your app (`?feeling=anxious&mallow=loomi`).

**Brand rules followed.** Copy uses the tagline and description exactly.
"hushmallow" stays lowercase to match the official logo and the global
capitalisation rule in `REDESIGN_BRIEF.md`. Fonts are Fraunces, Nunito Sans and
Manrope. There are no testimonials, user counts, prices, medical claims or
urgency, and the footer says the Mallows are animated characters and Hushmates
is a planned feature.

### FeelSense (preview)

Visitors can type how they feel in their own words. The preview matches the
words against simple rules in `FEELINGS[].words`, then **asks**: *"It sounds
like today has been a lot. Did I get that right?"* They can answer **Yes,
that's it** or **Not quite**, and their own words go into the thought cloud.

- It says on the page that this is word matching on the page, **not AI**, and
  that nothing typed is sent anywhere. That is true: the component makes no
  network calls with it.
- "not happy" counts towards *low*, and "not worried" counts for nothing.
- Self-harm and crisis language (the same patterns as the app's
  `src/engine/interpret.js`) skips the Mallows entirely. It shows *"That sounds
  really heavy. You deserve support from a real person right now"*, the
  emergency-number line and findahelpline.com. Words like "hopeless" or "can't
  cope" add a gentle support note.
- There is no microphone, camera or automatic sensing. A future AI or voice
  FeelSense belongs in the app, behind an explicit opt-in.

### Making the Mallows feel alive
- **Breathing**: each Mallow at its own pace (Loomi slowest, Zuzu fastest).
- **Blinking**: Pipzi, Boppo, Glitzi and Zuzu blink every few seconds
  (sometimes twice). While squeezed they hold their eyes closed in a happy
  squint. The eyelids are separate layers (`landing/assets/<id>-lids.webp`)
  cut to each Mallow's own eyes, textured from the face-cleaned rig art and
  colour-matched to the approved artwork, with a closed-eye crease in each
  Mallow's ink colour (`landing/tools/lids.py`). The approved art itself is
  never redrawn or blurred. Noomi, Blubi and Loomi already have closed eyes.
- **Squish**: real squash-and-stretch on spring physics. A quick tap still
  gets a proper squish.
- **Signature moves**: Noomi sinks sleepily (z's), Blubi wobbles (drops),
  Pipzi bounces (sparkles), Boppo hops (hearts), Zuzu spins (spirals), Loomi
  glows (ripples), Glitzi glitches (RGB split, bolts). All of them blush.
- **Mood**: in scene 3 the Mallow moves the way the feeling does (Glitzi
  shakes and flickers, Loomi trembles, Blubi droops, Zuzu wobbles, Pipzi
  bounces) and settles a little with each breath.
- **Reduced motion** switches off the idle loops, blinking, drifting and
  springs. Everything stays fully usable, and there's a **Do it for me**
  button for anyone who doesn't want to press and hold.

---

## 2. Install it in Framer

1. **Assets → Code → + → New component**, name it `HushmallowLanding`, and
   replace everything with `hushmallow/framer/HushmallowLanding.tsx`.
2. Put it on an empty page. Set **Width: Fill** and **Height: Fit**, with no
   other sections around it (the page has its own nav and footer).
3. The layout follows the component's own width (CSS container queries), so
   Framer's Desktop, Tablet and Phone breakpoints each get the right layout.
   Use the same component instance on all of them.
4. Fill in the properties (next section) and publish.

The art loads from a copy of this repository pinned to one commit (jsDelivr),
so it works straight away. **For production, upload the images in the
properties panel** so Framer's own CDN serves them: `landing/assets/` holds
`hushmallow-logo.webp`, `mascot.webp` and the seven `<id>.webp` Mallows. The
eyelid layers keep loading from the pinned copy. If you swap in *different*
Mallow art, switch **Blinking** off.

Fonts load from Google Fonts. Browser support is current Chrome, Edge,
Firefox and Safari 16+ (container queries).

## 3. Properties

| Property | What it does |
|---|---|
| **Sign-up URL** | Your app's sign-up page, for example `https://app.hushmallow.com/signup`. Each button adds `method=google\|apple\|email`, `mode=signup\|login`, `source=landing` and, after the preview, `feeling` and `mallow`. |
| **Log-in URL** | Nav and final "Log in" go straight here. Leave it empty to show the panel in log-in mode, which uses the Sign-up URL with `mode=login`. |
| Google / Apple / Email URL | Optional per-method overrides (they still get `mode`, `source`, `feeling`, `mallow`). |
| Google / Apple / Email | Show or hide each button. |
| Terms URL / Privacy URL | Adds "By continuing you agree to our Terms and Privacy Policy" with links. |
| Contact URL | Footer link (mailto: works). |
| Headline / Squishy word | `A softer space for feelings.` and `softer`. The squishy word must appear in the headline (any case). If it doesn't, the headline simply shows without the squish. |
| Support line, Description | Hero lines under the headline. |
| Description | Two paragraphs; a blank line in the property starts a new paragraph. |
| Hero button | "Meet the Mallows". Scrolls to the Mallows and focuses the one in the middle, ready to squeeze. |
| Second button | "Discover hushmallow". Scrolls to the three ways in. |
| Second button | "See how hushmallow works". Scrolls to scene 5. |
| Nav button, After preview, Final button | The account buttons: "Create account", "Create my hushmallow account", "Create my hushmallow account". |
| Final headline | "Find your soft place." (A headline starting with "Your Mallow" is also personalised with a remembered Mallow's name.) |
| Hushmates updates | Leave **empty** until you have a working waitlist or newsletter page. Empty shows a plain "Coming soon" note; a URL shows a **Keep me updated** button that opens it. |
| Plans note | Under the sign-up buttons. It promises no prices or free tiers, only that people see what they'd pay before paying. |
| Fixed nav | Pins the nav to the top of the window. |
| Blinking | The eyelid layers (on by default). |
| Remember me | Shows or hides the opt-in "Remember my Mallow" switch. |
| Logo, Logo mascot, Noomi … Glitzi | The images. |
| On sign-up tap / On log-in tap | Framer interactions, for example analytics, fired before navigation. |

**When the URLs are empty** the buttons don't fail silently. In the Framer
editor and preview, the panel shows *"Setup needed: add your Sign-up URL…"*.
On a published site it shows *"Accounts are opening very soon…"* and logs a
console warning.

## 4. Connecting Supabase (in your app, not in Framer)

The landing page only links to your app. No keys or secrets go into Framer.
Your app's `/signup` (and `/login`) page reads the parameters and starts
Supabase auth itself:

```ts
// app.hushmallow.com/signup: in your app
import { createClient } from "@supabase/supabase-js"

// the anon key is publishable by design (protect data with Row Level Security);
// the service-role key must never reach a browser
const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)

const q = new URLSearchParams(location.search)
const method = q.get("method")            // google | apple | email
const mode = q.get("mode") ?? "signup"    // signup | login
const back = new URL("/welcome", location.origin)
for (const k of ["feeling", "mallow"]) if (q.get(k)) back.searchParams.set(k, q.get(k)!)

if (method === "google" || method === "apple") {
  await supabase.auth.signInWithOAuth({ provider: method, options: { redirectTo: back.toString() } })
} else {
  // show your email form, then:
  // await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: back.toString() } })
}
```

In the Supabase dashboard:
1. **Authentication → Providers**: enable **Google** (OAuth client from Google
   Cloud) and **Apple** (Services ID, key and team ID from Apple Developer).
   Email is on by default.
2. **Authentication → URL Configuration**: set **Site URL** to your app and add
   `https://app.hushmallow.com/welcome` (plus any preview domains) to
   **Redirect URLs**.
3. On `/welcome`, read `feeling` and `mallow` to greet people with the Mallow
   they just met.

Stripe stays in the app too: the landing page never shows prices. When plans
launch, sell them from the app (for example Stripe Checkout, with a server
webhook that records the plan in Supabase).

## 5. Privacy

- What visitors type in the preview stays in the page. Nothing is sent, stored
  or logged.
- **Remember my Mallow** is off until the visitor switches it on. It stores
  only the Mallow's id (`hushmallow.mallow` in this browser's localStorage).
  Switching it off, or tapping "Forget me", deletes it.
- The page loads Google Fonts and, until you upload the images to Framer, the
  art from jsDelivr. There are no analytics in the component.

## 6. What changed in the "softer space" update

- **Positioning**: every "companion" reference is gone (eyebrow, support
  line, scene copy, perks, footer, defaults, code comments). The hero is now
  *A softer space for feelings.* / *A playful, soothing space to touch, unwind
  and connect.* with the two-paragraph description; the eyebrow reads
  *Touch · Unwind · Connect*.
- **CTAs**: "Meet the Mallows" (to the character stage), "Discover
  hushmallow" (to the new three-ways strip), "Create my hushmallow account"
  after the preview and at the end, "Find your soft place." as the final
  headline. The nav is The Mallows · Unwind · Hushmates · Your space.
- **Squishy word**: now matched in any case, and shown exactly as the headline
  spells it, so changing the headline or word can't break the animation.
- **New sections**: *Touch. Unwind. Connect.* (three ways in) and **Hushmates**
  (Connect, coming soon), with a new **Hushmates updates** property.
- **Story order**: hero → three ways → Touch → Unwind (thoughts, the little
  moment, more than a moment) → Connect → your space → final.
- **Footer**: "A softer space for feelings.", the brief's explanation of the
  Mallows and Hushmates, and a short not-a-medical-or-crisis-service line,
  plus the helpline link.
- **Unchanged**: all seven Mallows and their art, lines, blinking, squints,
  particles and signature moves; FeelSense and its crisis care; the breathing
  moment; Remember my Mallow; the sign-up and log-in panels and URL handoff;
  every existing property control; reduced motion.

### Earlier: the companion update
The previous round added FeelSense, blinking, the remember switch and the
seven-scene story. Its copy has been replaced by the update above.

## 7. Quality audit

Each point was checked in Chromium with Playwright at 1440×900, 1280×800,
768×1024, 390×844, 375×812 and 320×700, plus reduced motion.
`landing/preview/play.mjs` plays the page like a visitor (104 checks).

| Question | Verdict |
|---|---|
| First screen explains hushmallow? | Yes: eyebrow, tagline, product description, the hero description and a Mallow inviting a squeeze. On 390 px the CTA and Pipzi's face are both on the first screen (the small "No account needed" note is hidden on phones to make room). |
| Distinctly hushmallow, not SaaS? | Character-led scenes, no card grids, Fraunces SOFT display type, a dusk finale. |
| Real logo integrated? | The official wordmark with its white background removed (mascot intact) in the nav and footer, and the logo mascot in the sign-up panel. |
| Mallows premium and alive? | The original art at 640 px, breathing, blinking, squash and stretch, signature moves, moods, leaning, and a voice for each. |
| Hero creates curiosity? | The squeeze reacts the instant you press, the squad joins in, and the headline word squishes too. |
| Demo delightful and real? | A state machine (pick → sense → breathe ×3 → drift/keep → check-in → invite). Keyboard (Space), touch, mouse and "Do it for me" all play it through. |
| Persuasive, not pushy? | Sign-up is offered after the value and never blocks it. There's no urgency. Honest notes cover plans and FeelSense. |
| Typography? | Fraunces, Nunito Sans and Manrope. Balanced headings and pretty-wrapped body text. Reading text is 13.5 px or larger; only small uppercase labels are 12 px. |
| Animations sophisticated? | Springs on transform and opacity only, with idle loops in CSS. Respects reduced motion. |
| Every CTA real? | Anchors scroll. Account buttons open the sign-up panel and navigate with context. Unconfigured URLs show a visible message. |
| Beautiful at 390 px? | Yes, no horizontal overflow at any size (checked automatically). |
| New positioning clear? | Tagline and description in the hero, Touch · Unwind · Connect throughout, Hushmates clearly marked coming soon, and an automated check that no "companion" / AI wording appears on the page. |
| Why an account? | Scene 6 lists concrete benefits, and the demo's ending invites people in. |
| Reasons to return? | A greeting from a remembered Mallow (opt-in), and every Mallow has more to say. No streaks or guilt. |

**Known limits.** The eyelids come from the older rig art, recoloured to
match. They're only visible for about 0.2 s per blink (longer during a
squeeze), and you can see faint patch edges if you look closely while holding.
The "remembered" features beyond the browser switch (favourites, check-ins,
sync) describe the app with an account, not something the landing page does.
Nothing here has been tried on a physical phone yet.

## 8. Preview it locally

```bash
cd hushmallow/landing/preview
npm install
node build.mjs            # dist/index.html (open via any static server)
node build.mjs --inline   # also dist/standalone.html, one file with the art inlined
node shots.mjs full       # screenshots at the six viewports + overflow/error checks
node play.mjs             # plays the page like a visitor (104 checks)
```

URL parameters simulate configuration: `?signup=…&login=…&terms=…&privacy=…`,
and `?target=canvas|live` mimics Framer's editor or a published site. A small
`framer-shim.ts` stands in for Framer's `framer` package.
