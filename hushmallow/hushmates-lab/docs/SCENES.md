# Hushmates 2.0 · Scenes

The relay's interface is made of scenes (`ui/relay/*.js`), each a function
`(device, params) → { el, mood, update?, destroy? }` mounted by `ui/device.js`.

## The Hushfold language

2.0 rebuilt every scene around the landing page's composition (the notes the
redesign worked from are summarised below), not just its colours:

- **A room, not a page.** Each scene is a soft room tinted by a Mallow's
  colours (`room()` in `ui/relay/parts.js`), under a drifting parallax sky
  (`ui/sky.js`) and the breathing light of `ui/atmosphere.js`.
- **One living character at the centre.** The official Mallow art stands on
  its three-cloud pillow with a breathing halo (`stage()`); it breathes,
  blinks, notices, reaches, thinks, squeezes and cheers (`ui/mallow.js`).
- **Words live in thought clouds, never cards.** The landing page's blob
  (`ThoughtCloud`) holds what someone wrote; status comes from the Mallow's
  speech bubble (`Speech`), not banners.
- **One serif line, one big action, quiet escape hatches.** Fraunces SOFT
  headlines, Nunito Sans text, ink pill buttons, text links for the rest; no
  borders (inset hairlines), long soft lilac shadows.
- **The orb** (`ui/orb.js`): a luminous sphere that forms from words, squashes
  and stretches, ripples, glows, and gains a petal of light for each person
  (a star for a Mallow). It flies on bezier paths with a delicate trail
  (`fly()`).
- **Sound** (`ui/sound.js`): delicate synthesised sounds for gather, squish,
  ripple, release, arrive, catch, petal, think, reveal and home, started only
  after a touch, with one switch to turn them off.

Every scene is a column (head, scroll, dock) sized from its own box with
container queries, so it composes the same way at 320 × 568, 390 × 844, a
768 tablet and a desktop window. Long content scrolls inside the phone; the
header and dock float above it.

## The four places (dock)

| Dock | Scene | What it is |
|---|---|---|
| Release | `release` | Your Mallow in its room, a thought cloud that fills as you write, "What's on your mind?", optional tags, the consent tick, the Mallow choice (off by default), "Release into Hushfold" and "Cancel". Then the release moment and "Your feeling is on its way." |
| Catch | `catch` | "Catch a feeling" → look up → the orb arrives: "A feeling has found you." → "Catch this feeling" / "Let it float past" → "Can you see this another way?" "Offer a possibility, not a verdict." → the petal moment → how the others saw it. |
| My journeys | `journeys` → `journey` | Feelings still travelling, as a small constellation of orbs with their petals and "3 of 5 human perspectives". The detail shows your words, time left, and your Mallow offering another way to see it once it can. Bring it home early, delete. |
| Returned | `returned` → `homecoming` | Feelings that came home. First time: the cinematic return. Then each perspective as a slide (keep / let it go), your Mallow's perspective apart once five people answered, and Save my journey, Explore another angle, Share, Release this feeling, Delete my journey. Nobody caught it: Send it out again / Keep it with me / Let it go. |

Other scenes:
- `welcome`: three quiet beats in your Mallow's room: what Hushmates is, how a
  feeling travels (the orb gathering petals), then the promises, privacy
  details, "Let feelings find me" and the adult-pilot confirmation.
- `support`: shown instead of a release when words suggest someone may not be
  safe. Nothing was sent or saved; real places to turn.
- `share`: a live 9:16 story, then a picture or a short video, made on the
  device. The author chooses what it shows (see `RELAY.md` §2a).
- `you`: You & safety: who you are here, choices, your Mallow, the
  perspectives you've offered (with their share choice), the standards,
  support, your data.
- `deleted`.

## Motion moments

- **Release** (`release.js` `launch`):
  1. The words in the thought cloud drift together and shrink into light: the
     orb forms.
  2. Your Mallow notices it, leans in and reaches.
  3. The orb settles in its arms; it squeezes, the orb compresses, ripples and
     glows.
  4. It lets go with its signature move; light blooms and the sky pans.
  5. The orb floats up through the atmosphere with a delicate trail.
  6. "Your feeling is on its way." then "Let's see how someone else sees it."
- **Catch** (`catch.js`): ripples in the sky while you look; the orb drifts in
  and the Mallow notices and reaches. When you add your perspective the Mallow
  squeezes the orb, it ripples, gains a petal in your Mallow's colour, and
  flies on: "Your perspective is woven in."
- **Fallback magic** (`journeys.js` `ask`, `returned.js` `explore`): the orb
  drifts into your Mallow's arms; it thinks (sleepy eyes, a slow sway) while
  the answer is made, squeezes, the orb glows and gains a star, and "Your
  Mallow found another way to see it." unfolds.
- **Homecoming** (`returned.js` `moment`):
  1. The sky softens to dusk and pans: "Something is coming home…"
  2. A distant orb drifts closer; the Mallow notices it and reaches.
  3. It floats into the Mallow's arms: bloom, "Your feeling found its way home."
  4. A petal of light for each person, a star if a Mallow helped.
  5. The orb rises into place and opens; the first perspective emerges from it.

**Reduced motion** replaces flights with cross-fades, stops ambient loops, and
keeps every state reachable (checked by the QA tool's reduced-motion run).

## Scene contract (`data-test` hooks)

The lab's autoplay, the QA tool and the guide use these hooks; scenes keep them stable.

| Scene | Hooks |
|---|---|
| dock | `nav-release`, `nav-catch`, `nav-journeys`, `nav-returned`, `open-you` |
| welcome | `welcome`, `welcome-next`, `welcome-privacy`, `welcome-catching`, `welcome-adult`, `welcome-enter` |
| release | `feeling-text`, `label-<id>`, `share-consent`, `privacy-link`, `allow-fallback`, `release-submit`, `cancel-feeling`, `feeling-error`, `release-limit`, `release-sent`, `follow-journey`, `go-catch`, `release-another` |
| support | `support-scene`, `support-unsent`, `support-resources`, `support-edit`, `support-clear` |
| catch | `catching-on`, `find-feeling`, `catch-none`, `look-again`, `catch-offer`, `offer-text`, `catch-feeling`, `float-past`, `offer-more`, `report-feeling`, `block-author`, `caught-text`, `starter-<n>`, `reframe-text`, `allow-share`, `reframe-error`, `reframe-submit`, `reframe-after`, `catch-another`, `catch-done`, `catch-gone`, `my-gifts` |
| journeys | `journey-<id>`, `empty-release`, `progress`, `mallow-waiting`, `mallow-available`, `ask-mallow`, `mallow-ready`, `mallow-failed`, `perspective`, `persp-source`, `lab-source` (lab only), `withdraw`, `delete-journey` |
| returned | `returned-<id>`, `homecoming`, `homecoming-ready`, `home-note`, `perspective` (+ `data-kind`, `data-source`), `persp-source`, `lab-source` (lab only), `keep`, `let-go`, `persp-more`, `report-perspective`, `block-contributor`, `mallow-extra`, `home-empty`, `send-again`, `keep-with-me`, `explore-angle`, `save-journey`, `share-journey`, `release-journey`, `delete-journey` |
| share | `share-preview`, `share-play`, `share-privacy`, `share-label`, `share-words`, `share-pick` (+ `data-kind`), `share-pick-locked`, `share-save`, `share-image`, `share-video`, `share-video-out` |
| you | `privacy-link`, `pref-catching`, `pref-notify`, `pref-sound`, `mallow-<id>`, `gifts`, `gift`, `gift-share-<id>`, `open-support`, `export-data`, `export-json`, `export-copy`, `delete-data`, `pilot-note`, `deleted` |
| sheets | `confirm`, `privacy-details`, `reason-<id>`, `report-send`, `report-received` |
