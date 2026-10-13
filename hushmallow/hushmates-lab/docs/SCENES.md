# Hushmates 2.0 · Scenes

The relay's interface is made of scenes (`ui/relay/*.js`), each a function
`(device, params) → { el, mood, update?, destroy? }` mounted by `ui/device.js`.
They follow the landing page's visual language:

- **Ground and light:** cream ground and drifting pastel light (`ui/atmosphere.js`),
  under a parallax cloud sky with a camera that glides up when a feeling is released
  (`ui/sky.js`).
- **Type and controls:** Fraunces SOFT headlines with gradient italics, Manrope and
  Nunito Sans text, ink pills, hairline insets and long lilac shadows.
- **The living Mallows** (`ui/mallow.js`): breathing, blinking, squash-and-stretch
  on springs, and a signature move each.
- **The feeling orb** (`ui/orb.js`): a luminous sphere that squashes and stretches,
  holds the words, and gains a petal of light for each person.
- **Sound:** delicate synthesised sounds (`ui/sound.js`), started only after a
  touch, with one switch to turn them off.

There are no dashboards and no boxes of data. Every scene is a column (head, body,
stage, foot, dock) sized from its own box, so it composes the same way at 320 × 480
inside the lab and at 390 × 844.

## The four places (dock)

| Dock | Scene | What it is |
|---|---|---|
| Release | `release` | "What's on your mind?", your Mallow holding an empty orb. Compose → review → the release moment → "Your feeling is on its way." |
| Catch | `catch` | "Catch a feeling". Look up → "A feeling has found you." → catch or let it float past → "Can you see this another way?" → the petal → pass it on → how others saw it. |
| Journeys | `journeys` → `journey` | Your travelling feelings: petals, "3 of 5 perspectives found", time left, the Mallow offer if you allowed one. Bring it home early, delete. |
| Returned | `returned` → `homecoming` | Feelings that came home. First time: the cinematic return. Then keep or let go of each perspective, save, release, delete, share, explore another angle. |

Other scenes:
- `welcome` (three steps, ending with catching and the adult-pilot confirmation)
- `support` (shown instead of a release when words suggest someone isn't safe)
- `share` (a 9:16 picture: light and the label only)
- `you` (You & safety: choices, standards, support, data)
- `deleted`

## Motion moments

- **Release:**
  1. The orb (with the words inside) drops into the Mallow's arms.
  2. Both squeeze; the words fade into light.
  3. The Mallow springs back and lets it go: the orb flies up on a curve with a
     trail of motes.
  4. The sky camera pans up and the Mallow sinks out of frame.
  5. "Your feeling is on its way." then "Let's see how someone else sees it."
- **Catch:** the orb arrives from the sky; catching squeezes it. Your perspective
  unfurls as a petal in your Mallow's colour (with a chime and the Mallow's cheer),
  then the orb flies on.
- **Homecoming:**
  1. Dusk, then the sky settles from above.
  2. "Something is coming home…": the orb drifts down and the Mallow catches it.
  3. Bloom, then "Your feeling found its way home."
  4. The orb rises into place and each perspective opens out of it.

Reduced motion replaces flights with cross-fades and keeps every state reachable.

## Scene contract (`data-test` hooks)

The lab's autoplay, the QA tool and the guide use these hooks; scenes keep them stable.

| Scene | Hooks |
|---|---|
| dock | `nav-release`, `nav-catch`, `nav-journeys`, `nav-returned` |
| welcome | `welcome-next`, `welcome-catching`, `welcome-adult`, `welcome-enter` |
| release | `start-feeling`, `feeling-text`, `label-<id>`, `allow-fallback`, `disclosure`, `review-feeling`, `cancel-feeling`, `edit-feeling`, `release-submit`, `release-sent`, `follow-journey`, `go-catch`, `release-limit`, `feeling-error` |
| support | `support-scene`, `support-unsent`, `support-resources`, `support-edit`, `support-clear` |
| catch | `catching-on`, `find-feeling`, `catch-none`, `look-again`, `catch-offer`, `offer-text`, `catch-feeling`, `float-past`, `offer-more`, `report-feeling`, `block-author`, `reframe-text`, `starter-<n>`, `reframe-error`, `reframe-submit`, `reframe-after`, `catch-another`, `catch-done`, `catch-gone`, `my-gifts` |
| journeys | `journey-<id>`, `empty-release`, `journey-detail`, `progress`, `mallow-waiting`, `mallow-available`, `ask-mallow`, `mallow-pending`, `mallow-ready`, `mallow-failed`, `mallow-held`, `withdraw`, `delete-journey` |
| returned | `returned-<id>`, `homecoming`, `homecoming-ready`, `perspective` (+ `data-kind`, `data-source`), `persp-source`, `keep`, `let-go`, `persp-more`, `report-perspective`, `block-contributor`, `explore-angle`, `save-journey`, `share-journey`, `release-journey`, `delete-journey`, `home-empty` |
| share | `share-preview`, `share-privacy`, `share-label`, `share-save` |
| you | `open-you`, `pref-catching`, `pref-notify`, `pref-sound`, `mallow-<id>`, `open-support`, `export-data`, `delete-data`, `pilot-note`, `deleted` |
| sheets | `confirm`, `reason-<id>`, `report-send`, `report-received` |
