# brand

## Summary
I read the brief, then audited brand spelling, copy, type, fonts and the logo in /home/user/thinkstill-rituals/hushmallow (read-only). All scratch output is in /tmp/claude-0/audit/brand/.

BRAND. There are 27 customer-facing wrong spellings in 13 app files: index.html 3, manifest.webmanifest 2, src/app/main.js 2 (document.title), src/app/entitlements.js 3, home.js 3, landing.js 3, plans.js 3, settings.js 1, support.js 1, journey.js 1, src/ultra/another-angle.js 1, src/v3/host.js 1 (share-card subtitle) and framer/HushmallowEmbed.tsx 3. The plan names Paid/Ultra also show to customers: 'ULTRA' badges (home.js:34, encounter.js:129, library.js:91), 'Ultra only.' (settings.js:38), 'Another Angle is part of Ultra' (plans.js:33), the PLANS names, and another-angle.js:63. There is also a trap: CSS text-transform:uppercase on .eyebrow (app.css:37), .bubble .who (app.css:116) and .summary-card .k (app.css:165), plus 8 textTransform calls in another-angle.js and one in sunpop-savour.js:785. Today plans.js:11 draws 'HUSHMALLOW' through .eyebrow (seen in the screenshot). Any lowercase brand string placed in those styles will be shown in capitals unless wrapped in an element that never transforms. Docs: README.md 10, docs/FRAMER.md 10, STATUS.md 3, AUDIT.md 3, V3_* 2, and REDESIGN_BRIEF.md 34, which is the owner's verbatim brief and must not be edited. Dev or comment-only: about 75, including 50 generated ge-NN.js header lines that quote the workbook file name. The GitHub workflow is named 'Publish Hushmallow' (.github/workflows/hushmallow-pages.yml:5), and FRAMER.md:14 refers to that name.

TYPE TODAY. One display face, Fredoka 700 (self-hosted, 29,732 B latin file, preloaded). The UI face is ui-rounded, which only exists on Apple devices; Chromium, Android and the Framer desktop preview fall back to system-ui, so the UI type differs by platform. I count 26 distinct fixed px sizes (9–84px) and 39 uses below 13px (9, 9.5, 10, 10.5, 11, 12, 12.5px). They sit mostly in another-angle.js (49 inline font declarations), the signature rituals and journey.js. Canvas text uses fx.FONT (src/v3/fx.js:313; imported by 10 engine files) plus hard-coded ui-rounded/system-ui stacks in 9 ritual files and landing.js. The bubble speaker colour #8a6bd6 on white is 4.07:1, below the 4.5:1 AA line for small text. On the plans screen (.plan background rgba(255,255,255,.04), app.css:172) light text sits on a bright peach realm and is hard to read.

FONTS. The npm registry works through the proxy (HTTP 200). The packages are @fontsource-variable/nunito-sans@5.3.0, @fontsource-variable/manrope@5.3.0 and @fontsource-variable/fraunces@5.3.0, all published 2026-07-19. Each tarball's sha512 matches the registry's dist.integrity. All three are OFL-1.1 with no Reserved Font Name. The two fonts every screen needs at start-up (Nunito Sans + Manrope latin, both variable-weight) total 55,912 B. Fraunces standard (optical size + weight) is 67,304 B and can load later, when a title first needs it. Files are in /tmp/claude-0/audit/brand/fonts/. I computed metric-matched fallback faces so the font swap barely moves the layout, and rendered a specimen at 390px: /tmp/claude-0/audit/brand/shots/specimen-390.png.

LOGO. The separate logo-mascot.webp is NOT the same drawing as the mascot inside the logo. The best uniform-scale fit (s=0.16172, offset 1161.61,375.26) leaves a mean error of 17.5/255. A stretched fit (sx 0.16783, sy 0.14876) still misplaces the eyes and mouth (fit-compare.png). So pasting it in would change the approved artwork. The working recipe instead cuts out the logo's own mascot pixels:
- Lettering: alpha comes from luminance (paper 254, ink rgb 17,17,15), and only the lettering colour is replaced.
- Mascot: the interior (24,786 px) is kept bit-identical; only a 9px edge band is separated from the white paper (known-background matting).
- Check: the ink version placed back on paper differs from the source by mean 0.30/255 (p99 4.2).
- Outputs: ink and light versions, trimmed to 1540×289, in /tmp/claude-0/audit/brand/logo/final/. I looked at them on dark, purple, white and cream backgrounds at 360–960px wide.

ETA input for the orchestrator: assets (fonts and logos) are ready now. The brand sweep is small (about 30 call sites). Type tokens plus the main CSS migration is medium. Moving another-angle.js and the 10 signature rituals' inline styles onto the tokens is the largest part (about 100 call sites).

## Keep
- hushmallow/assets/fonts/ build/copy pipeline: tools/build-site.sh:17 already copies assets/fonts into v/<ver>/assets/, and tokens.css uses ../../assets/fonts/ relative URLs that survive the versioned layout — drop the new woff2 files into the same folder.
- Self-hosting pattern in src/ui/tokens.css:1-8 (unicode-range split latin/latin-ext, font-display swap, OFL text beside the files) — reuse for the three new families; keep OFL texts as assets/fonts/OFL-nunito-sans.txt, OFL-manrope.txt, OFL-fraunces.txt.
- Asset URL pattern src/mallows/registry.js:23 `const A = (p) => new URL(`../../assets/${p}`, import.meta.url).href` — the logo URLs in brand.js must use the same import.meta.url-relative pattern (document-relative 'assets/...' breaks under v/<ver>/).
- Technical identifiers that must NOT change: folder hushmallow/ (Pages path, workflow paths filter 'hushmallow/**', tools/v3-lab.cjs:19, tools/v3-sweep.cjs:30, Framer 'App URL'); product IDs hushmallow.paid.monthly / hushmallow.paid.yearly / hushmallow.ultra.monthly / hushmallow.ultra.yearly (entitlements.js:30,43); tier ids 'paid'/'ultra' (RANK entitlements.js:106, store key 'entitlement' {tier}, native bridge reply {tier}, ritual.tier, tests); storage PREFIX 'hm2:' (engine/storage.js:4) and keys entitlement, prefs, played, journey, rotation, ultra.sealedPredictions, hm2:sound, hm2:haptics; globals window.__hush (main.js:178), globalThis.__hm3 (v3/host.js:516-538), window.__hushStoreReply, window.HushNative.store, webkit.messageHandlers.hushStore; CSS classes .brand, .ultra-card, .btn.ultra, .plan.ultra, .badge, .eyebrow; file/identifier HushmallowEmbed (framer/HushmallowEmbed.tsx:27,80,86 — Framer instances bind to it); content/Hushmallow_1000_Rituals_V3.xlsx (+ _corrected) referenced by tools/import_v3.py:4,271,361 and the generated headers of src/v3/data/catalog.js and copy/ge-01..50.js line 1; share download filename 'hushmallow.png' (landing.js:108,113, already lowercase); ritual codes HM-0001..HM-1000, engines GE-01..GE-50; version.json + v/<ver>/ layout.
- Tests that encode plan copy: tests/v3.test.mjs:209-215 requires PLANS.paid.includes to keep a line matching /^N interactive touch rituals/ (or /^Over 1,000/) and the phrase 'up to six of your own photos' — keep those strings (or update the test deliberately) when renaming to hushmallow Flow.
- Bubble placement logic src/app/ui.js:86-121 (say(): avoids .move-title, .dock and .card) — keep when restyling to the dialogue token; it measures offsetWidth/Height, so the font must be loaded before say() measures (see the boot gate).
- Generated assets in /tmp/claude-0/audit/brand/logo/final/ (copy into hushmallow/assets/brand/): hushmallow-logo-light.png 111,629 B (1540x289 master), -light-360.webp 12,712, -light-480.webp 17,526, -light-720.webp 27,010, -light-720.png 46,243, -light-960.webp 38,308; hushmallow-logo-ink.png 112,538, -ink-360.webp 8,140, -ink-480.webp 11,238, -ink-720.webp 17,848, -ink-720.png 42,236, -ink-960.webp 26,336.
- Font files in /tmp/claude-0/audit/brand/fonts/ (copy needed ones into hushmallow/assets/fonts/): nunito-sans-latin-wght-normal.woff2 31,076 B [CRITICAL]; manrope-latin-wght-normal.woff2 24,836 B [CRITICAL]; fraunces-latin-standard-normal.woff2 67,304 B [RECOMMENDED, loaded only when first needed; opsz 9-144 + wght 100-900]; nunito-sans-latin-ext-wght-normal.woff2 27,908 / manrope-latin-ext-wght-normal.woff2 15,120 / fraunces-latin-ext-standard-normal.woff2 59,388 [only fetched for latin-ext characters]; optional: fraunces-latin-full-normal.woff2 121,016 (adds SOFT 0-100 + WONK; visually subtle, see shots/fraunces-axes.png), nunito-sans-latin-wght-italic.woff2 33,080, fraunces-latin-wght-normal.woff2 36,620 (opsz pinned at 9 = text cut; do not use for titles), fraunces-latin-standard-italic.woff2 81,520; licences OFL-nunito-sans.txt 4,526, OFL-manrope.txt 4,383, OFL-fraunces.txt 4,504.
- Recipe and evidence scripts: /tmp/claude-0/audit/brand/scripts/logo_recipe.py (final; needs scipy from /tmp/claude-0/audit/brand/pylib2, which is not installed system-wide — commit the outputs rather than running it in CI), register.py + compare.py (proof that logo-mascot.webp does not match), fallback.py (fallback metrics), fontinfo.py (axes/metrics), specimen/index.html + specimen/tokens-proposal.css (working prototype of the proposed @font-face + tokens).

## Integration points
- hushmallow/index.html:9-10,14,24 — meta description / <title> / Fredoka preload / noscript: lowercase brand, add <meta name="apple-mobile-web-app-title" content="hushmallow">, replace L14 with two preloads: <link rel="preload" href="assets/fonts/nunito-sans-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin> and the manrope equivalent (build-site.sh's sed rewrites href="assets/ automatically). Optionally preload assets/brand/hushmallow-logo-light-720.webp as=image.
- hushmallow/manifest.webmanifest:2-4 — "name"/"short_name": "hushmallow" (the iOS/Android home-screen label), description "Less noise. More magic.".
- hushmallow/tools/build-site.sh:17 — `cp -r "$here/assets/mallows" "$here/assets/rig" "$here/assets/fonts" "$out/v/$ver/assets/"` must add "$here/assets/brand" or the logo 404s on GitHub Pages.
- hushmallow/src/app/main.js:74 — `document.title = view.title ? `${view.title} · Hushmallow` : 'Hushmallow'` → `document.title = docTitle(view.title)` from src/brand.js. main.js boot() (L226-249): insert `await Promise.race([fontsReady(['voice','ui']), wait(700)])` after createWorld (L228) and before `app.go('home', …)` (L248), so the Mallow canvas starts immediately but DOM text appears in the final font.
- hushmallow/src/app/entitlements.js:28-47 — PLANS.paid {id:'paid', name: flowPlanName, tagline: 'A little more room for your feelings.', productIds unchanged}; PLANS.ultra {id:'ultra', name: beyondPlanName, tagline: 'There’s more than one way to see it.', productIds unchanged}; includes[0] of ultra `Everything in ${flowPlanName}`; header comment L3-4.
- hushmallow/src/app/scenes/plans.js:11 (eyebrow shows plan name through uppercase .eyebrow), :17 `Choose ${p.name}`, :23 toast, :33 title — show the plan name in a .brand-name span that is never uppercased; title for reason 'ultra' → `Another Angle is part of ${beyondPlanName}`.
- hushmallow/src/app/scenes/home.js:29 ('Start Hushmallow'), :32 (aria-label), :34 ('ULTRA' badge → 'BEYOND'), :38 (topbar .brand text → logo image or brandMark()), :45 (hero 'Your second brain / for feelings.' → logo lockup + tagline).
- hushmallow/src/app/scenes/landing.js:32 (.brand), :101-111 share(): title canvas font '700 84px ui-rounded…' → story token, subtitle '600 44px' → voice token, :106 g.fillText('HUSHMALLOW', 540, 1270) → drawImage(light logo, 360x68 at y≈1236), :110 navigator.share title → brandName; await fontsReady(['story','voice']) and the logo image decode() before drawing.
- hushmallow/src/app/scenes/settings.js:38 ('Ultra only.' → `${beyondPlanName} only.`), :44 (About copy → 'hushmallow uses no AI…', lowercase even at sentence start), :24 tierName (via PLANS).
- hushmallow/src/app/scenes/support.js:24, src/app/scenes/journey.js:25, src/ultra/another-angle.js:63 (eyebrow 'Hushmallow Ultra · Another Angle' is uppercased by .move-title .eyebrow — use 'Another Angle' or a non-transforming span), src/app/scenes/encounter.js:129 ('ULTRA'), src/app/scenes/library.js:91 ('ULTRA' inline badge, 10px), src/v3/host.js:553 (share subtitle `A Hushmallow ritual with …` → `A ${brandName} ritual with …`).
- hushmallow/framer/HushmallowEmbed.tsx:45-46,56 — placeholder text and iframe title become the literal 'hushmallow' (a pasted Framer component cannot import app modules); keep the export name HushmallowEmbed; L43 font stays system-ui (no font files inside TSX).
- hushmallow/src/ui/tokens.css:1-8 (Fredoka @font-face → three new families + three *Fallback faces), :41-48 (--font-display/--font-ui/--fs-* → new --ff-* and --type-* tokens; keep the old variable names as aliases during migration so app.css keeps working).
- hushmallow/src/ui/app.css — every text rule to re-point (line: selector): 4 body, 32 .brand, 34 .hero, 35 .title, 36 .lede, 37 .eyebrow, 38 .muted, 55 .btn, 73 .ask, 79 .chip, 83 textarea.feel, 86 input.search/.text, 93 .card h3, 96 .reasons span, 101-103 .ultra-card .badge/.t/.s, 112 .bubble, 116 .bubble .who, 130 .sheet-head h2, 136 .az-letter, 138-139 .emo-row .n/.b, 154-155 .move-title h2/p, 160 .choice, 163 .hold-target, 165-167 .summary-card .k/.v, 169 .toast, 174 .plan h3, 177 .test-note, 182-183 .mallow-tile b/span, 186 .setting small, 206-207 .enc-card (≤640h), 213 .home .brand font-size:0 (≤360w), 222 .v3-tap, 224 .btn.icon-only, 226 .v3-words, 231 .v3-law-chip, 236 .v3-bend, 237 .v3-skill, 238 .v3-loop-note, 239-240 .v3-done/.v3-end btns, 242 .v3-keep, 244 .v3-full, 245 .v3-steps, 254 .photo-tray .x, 256 .add, 257-259 .photo-head/.photo-note, 263-266 (≤360w), 269 .add.wide, 272 .photo-full.
- hushmallow/src/v3/fx.js:313 `export const FONT = '"Fredoka", …'` → re-export CANVAS_FONT.voice from src/ui/type.js (keeps the 10 engine imports and words.js:60 working); src/v3/host.js:48 `Promise.all([loadCopy(ENG.id), loadEngine(ENG.id,…), standIns])` → add fontsReady(['voice']) so engines measure text with the loaded font; host.js:458,473-474 twist banner ('PLOT TWIST' 800 (10s+1)px, body 600 (13s+1)px) → canvasFont('overline'|'voice').
- Hard-coded canvas stacks to replace with canvasFont(): src/mallows/particles.js:299, src/rituals/untangle.js:28 (FONT const), moonmilk-wind-down.js:396,400,602, soft-landing.js:199, static-to-signal.js:162, spark-to-lantern.js:461, green-glitch-compass.js:312,318,323,336,339,604,841 (SVG font-family attr), name-it.js:739,754,832,833,840,843, raindrop-keeper.js:260,551; DOM inline-font hotspots: src/ultra/another-angle.js (49 declarations, sizes 9-34px, e.g. :200, :418, :761, :1184, :1192, :1301, :1448), name-it.js 16, green-glitch-compass.js 12, spark-to-lantern.js 10, sunpop-savour.js 9, drift-and-dock.js 9, raindrop-keeper.js 8, moonmilk-wind-down.js 8, untangle.js 6, soft-landing.js 5, static-to-signal.js 4, journey.js 13, express.js 2, library.js 2, settings.js 2, support.js 2, mallows.js 1, encounter.js 1.
- hushmallow/src/app/ui.js:78-82 toast() and :86-121 say() — classes .toast/.bubble get the new tokens; say() measures offsetWidth/Height (L92-96), so fonts must be loaded first (boot gate covers this).
- CI: .github/workflows/hushmallow-pages.yml runs `node --test hushmallow/tests/*.test.mjs` — a new hushmallow/tests/brand.test.mjs runs automatically. Optional rename of workflow name L5 'Publish Hushmallow' → 'Publish hushmallow', together with docs/FRAMER.md:14.
- Docs: README.md (10), docs/FRAMER.md (10; L66 says the 'Fredoka font is bundled' → update), docs/STATUS.md (3), docs/AUDIT.md (3), docs/V3_CORRECTIONS.md:3 and docs/V3_ENGINE_CONTRACT.md:3 (file-name mention, keep), and docs/HUSHFOLD.md (named in REDESIGN_BRIEF.md:3 but not created yet) — never edit docs/REDESIGN_BRIEF.md (verbatim brief).

## Proposals
### src/brand.js — the single source of brand spelling
Create hushmallow/src/brand.js:
```js
const A = (p) => new URL(`../assets/brand/${p}`, import.meta.url).href;
export const BRAND = Object.freeze({
  brandName: 'hushmallow',
  brandTagline: 'Less noise. More magic.',
  brandLockup: 'hushmallow — Less noise. More magic.',
  productDescriptor: 'Your second brain for feelings.',
  flowPlanName: 'hushmallow Flow',   flowTagline: 'A little more room for your feelings.',
  beyondPlanName: 'hushmallow Beyond', beyondTagline: 'There’s more than one way to see it.',
  planName: { paid: 'hushmallow Flow', ultra: 'hushmallow Beyond' },   // tier ids stay paid/ultra
  logo: { light: A('hushmallow-logo-light-720.webp'), ink: A('hushmallow-logo-ink-720.webp'), light2x: A('hushmallow-logo-light-960.webp'), w: 1540, h: 289 },
});
export const { brandName, brandTagline, flowPlanName, beyondPlanName, productDescriptor } = BRAND;
export const docTitle = (t) => (t ? `${t} · ${brandName}` : brandName);
```
In src/ui (it needs h()), add `brandMark()` → `<span class="brand-name" translate="no">hushmallow</span>`, with CSS `.brand-name{text-transform:none!important;font-variant-caps:normal}` so uppercase eyebrow/badge/who styles can never capitalise it. Also add `logoImg({tone:'light'|'ink', width})` → `<img src srcset="…720.webp 720w, …960.webp 960w" width="1540" height="289" alt="hushmallow" decoding="async" style="width:Wpx;height:auto">`. The width/height attributes reserve the aspect ratio, so there is no layout shift when it loads. The light logo goes over bright realms with `filter: drop-shadow(0 2px 14px rgba(10,6,30,.45))` (the same shadow .hero uses today); the filter does not touch the artwork.

Per file:
- main.js:74 → docTitle()
- entitlements.js PLANS names and taglines → BRAND (ids and productIds untouched)
- plans.js:11,33 → brandMark(p.name)
- home.js:29,32,38,45 → BRAND / logoImg, and 'ULTRA' → 'BEYOND'
- landing.js:32,106,110 → logoImg / drawImage / brandName
- settings.js:38,44, support.js:24, journey.js:25, another-angle.js:63, encounter.js:129, library.js:91, v3/host.js:553 → template strings from BRAND
- index.html, manifest.webmanifest and framer/HushmallowEmbed.tsx cannot import, so they use literals, enforced by the test below.

Brand-and-tagline placements: index.html meta description `hushmallow — Less noise. More magic. Your second brain for feelings: seven living Mallows, one magical world.` Home lockup: logo + 'Less noise. More magic.'

### tests/brand.test.mjs — permanent case-sensitive guard (runs in the Pages workflow)
1. Scan index.html, manifest.webmanifest, framer/*.tsx and src/**/*.{js,css} (excluding src/v3/data/**). Strip // and /* */ comments, then fail on /Hushmallow|HUSHMALLOW|HushMallow|Hush ?Mallow/ except the allowlist /HushmallowEmbed|Hushmallow_1000_Rituals_V3/.
2. Assert the BRAND values exactly ('hushmallow', 'Less noise. More magic.', 'hushmallow Flow', 'hushmallow Beyond').
3. Assert PLANS.paid.name === flowPlanName, PLANS.ultra.name === beyondPlanName, and productIds deep-equal {monthly:'hushmallow.paid.monthly', yearly:'hushmallow.paid.yearly'} / {…ultra…}.
4. Assert no customer string literal contains 'Ultra', 'ULTRA', 'Premium' or 'Paid' (allow the ids 'ultra'/'paid', ULTRA_MODULES, ULTRA_MALLOWS).
5. Assert manifest name/short_name === 'hushmallow' and <title> === 'hushmallow'.
6. Type floor: fail on any px font size below 12 in src/**/*.{js,css}. Today that catches another-angle.js:1007,1018,1186,1393, green-glitch-compass.js:609, library.js:91 and app.css:101,116,165.

Keep tests/v3.test.mjs:209-215 passing by keeping the 'N interactive touch rituals…' and 'up to six of your own photos' lines in PLANS.paid.includes.

### Self-hosted fonts: exact @font-face block (replaces tokens.css:1-8)
Family names get an 'HM ' prefix so a locally installed Nunito Sans or Manrope can never override ours. This only renames the CSS family; the OFL has no Reserved Font Name, so it is fine.
```css
@font-face{font-family:"HM Nunito Sans";font-style:normal;font-weight:200 1000;font-display:swap;src:url("../../assets/fonts/nunito-sans-latin-wght-normal.woff2") format("woff2-variations"),url("../../assets/fonts/nunito-sans-latin-wght-normal.woff2") format("woff2");unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
```
Add the same latin-ext twin with unicode-range U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C4,U+2113,U+2C60-2C7F,U+A720-A7FF. Do the same for "HM Manrope" (weight 200 800, manrope-latin[-ext]-wght-normal.woff2) and "HM Fraunces" (weight 100 900, fraunces-latin[-ext]-standard-normal.woff2; this file contains both the optical-size and weight axes, so set `font-optical-sizing:auto` and 30px titles get the 30pt design).

Metric-matched fallbacks, computed against Liberation Sans/Serif (Arial/Times metrics; Arial ships on iOS):
```css
@font-face{font-family:"HM Nunito Sans Fallback";src:local("Arial"),local("ArialMT"),local("Helvetica");size-adjust:102%;ascent-override:99%;descent-override:34.6%;line-gap-override:0%}
@font-face{font-family:"HM Manrope Fallback";src:local("Arial"),local("ArialMT"),local("Helvetica");size-adjust:106%;ascent-override:100.6%;descent-override:28.3%;line-gap-override:0%}
@font-face{font-family:"HM Fraunces Fallback";src:local("Georgia"),local("Times New Roman");size-adjust:109%;ascent-override:89.5%;descent-override:23.4%;line-gap-override:0%}
```
The exact figures (weight-matched): Nunito Sans 500 → 101.94/99.18/34.63%, at 600 → 102.82/98.33/34.33%; Manrope 600 → 105.95/100.62/28.32%, 700 against Arial Bold → 100.54/106.03/29.84%; Fraunces 600 at opsz 36 against Times Bold → 109.23/89.54/23.35%. Re-tune the Fraunces line against Georgia on a real iPhone.

Family stacks:
- `--ff-voice:"HM Nunito Sans","HM Nunito Sans Fallback",ui-rounded,system-ui,sans-serif`
- `--ff-ui:"HM Manrope","HM Manrope Fallback",system-ui,-apple-system,"Segoe UI",sans-serif`
- `--ff-story:"HM Fraunces","HM Fraunces Fallback",Georgia,serif`

Retire Fredoka from tokens.css:3-8, index.html:14, fx.js:313, name-it.js:832/840 and moonmilk-wind-down.js:602. Rename assets/fonts/OFL.txt to OFL-fredoka.txt, or delete it together with the Fredoka files. Startup font bytes go from 29,732 B to 55,912 B; Fraunces adds 67,304 B, loaded only when first needed.

### Typography token system (src/ui/type.css + src/ui/type.js)
Sizes are given at 375 → 430 CSS px, written as clamp(min, slope·vw + intercept, max) where slope = (max-min)/55·100vw. Example: 30→36 = clamp(30px, 10.91vw - 10.91px, 36px). Each line: size; weight; line-height; letter-spacing; family; where it is used.

STORY (Fraunces, DOM only, `font-optical-sizing:auto`, `text-wrap:balance`, at most 2 lines):
- --type-cinematic: 30→36; 560; 1.08; -0.015em. Hushfold/Hushflow chapter titles, opening title, plans invitation hero.
- --type-world: 25→30; 540; 1.12; -0.01em. World introductions and transitions, .move-title h2 (today 26 Fredoka), encounter ritual name (today 26).
- --type-discovery: 24→28; 500; 1.18; -0.005em. The insight line of a discovery ('You changed your pace.').
- --type-reward: 26→30; 600; 1.12; -0.01em. Memory Garden skill title, paired with the overline 'NEW TOOL SAVED'.

VOICE (Nunito Sans):
- --type-dialogue: 20→22; 650; 1.32; 0. Mallow lines (.bubble, today 650 16).
- --type-subtitle: 19.5→21; 600; 1.36; +0.004em; max-width 24ch, ≤2 lines, centred, text-shadow 0 1px 12px rgba(5,3,20,.8), plus a radial scrim only when the background is bright.
- --type-thought: 18→20; 700; 1.25. User words on Thought/Belief Mallows (DOM and canvas).
- --type-quote: 19; 600; 1.45. User's full text (.v3-full, today 650 20).
- --type-body: 17; 500; 1.5. .lede, card p, purpose, support copy, plan benefits.
- --type-howto: 17; lead 650 / steps 550; 1.5. 'How to play'.
- Input: textarea.feel 18 / 500 / 1.4.

UI (Manrope; its x-height is 0.54 em against Nunito Sans's 0.484, so it reads about 11% larger at the same px):
- --type-screen-title: 28; 700; 1.12; -0.02em. Settings, Library, Your journey, The Mallows.
- --type-heading: 20; 700; 1.2; -0.01em. Sheet h2 (today 22 Fredoka), card h3, plan card title.
- --type-button: 16 (15 at ≤360w); 700; 1; +0.005em; keep min-height 52/46.
- --type-control: 15; 650; 1.2. Chips (today 14.5), .choice, select, segmented controls, dock buttons.
- --type-input: 16; 500. Must stay ≥16px or iOS Safari zooms on focus.
- --type-row: 16; 600; 1.3. Settings rows, list rows .emo-row .n.
- --type-label: 14; 600; 1.35. .reasons, toast, .v3-words, legends.
- --type-caption: 13; 550; 1.4. .muted, notes, .test-note, law chip, journey subs. This is the floor and replaces every 11/12/12.5 use.
- --type-overline: 13; 750; 1; +0.12em; uppercase. .eyebrow, .bubble .who, .summary-card .k. Never use it with the brand name, or wrap the brand in .brand-name.
- --type-badge: 12; 800; 1; +0.1em; uppercase; decorative only ('BEYOND', 'NEW').
- --type-stat: 28; 800; 1; -0.02em; font-variant-numeric: tabular-nums. Journey tiles.

A user scale `--type-scale: 1 | 1.12 | 1.25` (Settings → Reading → Text size; iOS web pages do not follow Dynamic Type) multiplies the voice and UI tokens; story tokens grow by half as much. Apply tokens with utility classes (.t-cinematic, .t-world, .t-dialogue, .t-subtitle…) plus a JS mirror, so inline-style modules use `style: type('subtitle')` instead of literal px.

src/ui/type.js exports:
- `CANVAS_FONT = {voice, ui, story}` (family strings)
- `canvasFont(token, scale = 1)` → '600 20px "HM Nunito Sans", …'. Canvas weights must be multiples of 100, because Safari's canvas font parser is not reliable with 560/650.
- `fontsReady(groups, timeoutMs = 1200)` → Promise.race of document.fonts.load('600 20px "HM Nunito Sans"') etc. against a timeout.

Keep Fraunces out of canvas: there is no reliable optical-size control there, so it would render the 9pt text cut. A working prototype is in /tmp/claude-0/audit/brand/specimen/tokens-proposal.css; rendered at 390px in shots/specimen-390.png.

### No layout shift and no font failures (DOM, canvas, Framer)
1. Preload only the two startup woff2 files (index.html).
2. Use font-display:swap together with the metric-matched fallbacks above, so a late swap moves text by about 1–3%.
3. Boot gate in main.js boot(): race fontsReady(['voice','ui']) against 700ms before the first scene renders. The world/Mallow canvas is created first (main.js:228), so squeezing is still possible within the first second.
4. Fraunces is never preloaded. Title, discovery and Garden reveals call `await fontsReady(['story'])` (1200ms timeout) before their fade-in starts; they are timed reveals anyway, so a swap is never seen.
5. Canvas: add fontsReady(['voice']) to the Promise.all at v3/host.js:48 and before landing.js share(). The new subtitle and Thought Mallow layers should await it before their first measureText or wrap (fx.js:302 wrap() measures with the current font).
6. Logos: width/height attributes plus `height:auto`, decode() before the share-card drawImage.
7. Line boxes: Nunito Sans (1.364 em ascent+descent) and Manrope (1.366 em) are about 13% taller than Fredoka (1.21 em) at line-height:normal. Give every token an explicit line-height; .btn, .ask and .chip currently use `font:` shorthand without one (app.css:55,73,79), which resets them to normal.
8. Framer: the app runs inside the iframe and fonts load from the GitHub Pages origin, so Framer never parses or embeds a font and nothing goes into the TSX. If the Framer page itself ever needs the families, upload the same woff2 files under Site Settings → Fonts.
9. Verify at 375×812, 390×844 and 430×932: document.fonts.check() is true for all three faces, and no element has scrollWidth > clientWidth.

### Logo: transparent + reversed versions without altering the artwork (exact recipe, done)
Do not composite logo-mascot.webp: it is a different drawing. Measured on the 1672×941 source:
- Mascot in the logo: mask bbox x1162–1365, y396–562 (204×167), centroid (1263.4, 482.3).
- logo-mascot.webp: alpha bbox x1–1253, y52–1206; interior alpha is about 252, not 255.
- Best uniform fit: s=0.16172 at offset (1161.61, 375.26), mean error 0.0685 (17.5/255).
- Best anisotropic fit: sx=0.16783, sy=0.14876 at (1157.99, 384.06), error 0.0565. The eyes and mouth stay misregistered (logo/fit-compare.png; eye spacing scales 0.170 while silhouette height scales 0.145).

Recipe (scripts/logo_recipe.py):
(a) paper = median of pixels with lum>240 = (254,254,254); ink = median of pixels with lum<40 and chroma<20 = (17,17,15); lettering bbox x96–1580, y334–569.
(b) Lettering alpha = clip((250 − lum)/(250 − (17.3+4)), 0, 1); its RGB is replaced by the ink (#11110f) or the light colour (#f7f3ff = --text-1). Only the lettering is recoloured.
(c) Mascot mask: in window x1140–1390, y370–590, seed = |P − paper|∞ > 14 and not (chroma<22 and lum<120). Then binary opening, largest component, closing ×3, fill holes, and gaussian(1.5) > 0.5 to smooth the contour.
(d) Interior = mask eroded 6px; its RGB is bit-identical to the source (24,786 px) at alpha 1.
(e) Edge band = mask dilated 3px minus the interior. Known-background matting against the paper W: a = clip(dot(P−W, F−W)/|F−W|²), where F is the gaussian(2) interior colour propagated outward; a = 0 where the lettering alpha > 0.5, or where the pixel is grey stroke anti-aliasing (chroma<25 and lum < lum(F) − 20). Colour = smoothstep blend of F and (P − (1−a)W)/a over a 0.6–0.95.
(f) Stack the mascot over the lettering. Letters and mascot are separated by a 1–2px paper line in the artwork, so the layers do not conflict.
(g) Trim to the content bbox (93,331)-(1584,571) + 24px = crop (69,307,1609,596), giving 1540×289 (aspect 5.329:1). In trimmed coordinates the mascot sits at x1093–1296, y89–255. Export PNG master + WebP 360/480/720/960.

Fidelity: the ink version on paper vs the source differs by mean 0.30/255, p99 4.2, p99.9 15.0. Accepted limitation: the mascot's soft top bloom into white paper becomes a faint pale rim (≤1px at 720w) on dark grounds; it reads as a glow (logo/display-720-final.png, display-small-final.png). Ship to hushmallow/assets/brand/ and commit the outputs; scipy is not installed system-wide, so do not run the script in CI.

Use light-720/960 on dark screens (home, splash, plans, share card) and ink on light surfaces. Sizes: home lockup width min(64vw, 280px) ≈ 52px tall; topbar mark height 24–26px (128–139px wide; the ≤360w rule at app.css:213 hides it today); share card 360×68 at (360, 1236) on the 1080×1350 card. Optional: app icon from logo-mascot.webp as square 180/192/512 PNGs. The icon has no lettering, so the brand rule does not apply; but manifest.webmanifest:10 currently points at pipzi.png, which is 434×423 (not square).

### Every screen's text → token map (coverage list for the typography builder)
HOME (home.js):
- topbar .brand → logo mark
- hero h1 L45 → logo lockup + tagline (voice 600 17, text-2)
- Mallow name pill .eyebrow L26 → overline
- .ask L29 → control 17 (Manrope 600)
- quick chips L30 → control
- Beyond card L32-34: badge → badge, .t → heading 19, .s → label 14
- bubbles L94/96/99 → dialogue

EXPRESS (express.js):
- h1 L39 (inline 24px) → screen-title or world
- textarea + placeholder L23 → input 18 voice
- tip L41 and ack L25 → caption
- suggestion and chosen chips → control
- 'Browse every feeling A–Z →' L44 → button ghost
- 'How big?' L47 (inline 700 14) → label; level label → caption
- 'Meet a Mallow' → button
- 'Need support now?' L36 → button ghost
- A–Z sheet L93-113: title → heading, search → input, family chips, count muted, .az-letter (800 13) → overline, .emo-row .n/.b → row/caption, 'Done'
- photo tray (v3/tray.js:26,32,34) → button / caption

ENCOUNTER (encounter.js):
- topbar emotions eyebrow L65 → overline
- card eyebrow L84 → overline
- h3 ritual name L85 (inline 26) → world
- purpose p L86 → body
- reasons L87-88 → label
- photo button L54-56 → button ghost
- 'Let’s do it' / 'Something else' L91-92
- empty state L72-77
- Beyond card L127-129
- toast L36

RITUAL HOST (ritual.js):
- .move-title eyebrow/h2/p L17-25 → overline / world / subtitle-or-howto 17
- leave sheet L37-39
- toast L87
- sr-only status

V3 HOST (v3/host.js):
- law chip L66 → caption
- words chip L71/79 → thought-label 14-15
- 'Tap instead' / '?' / support / 'Finish' L72-74 → button 15
- 'Your words' sheet L198-206: .v3-full → quote, chips, input, captions, 'Use these words'
- 'How to play' sheet L213-227: lead p (inline 700 17) → howto lead, ol.v3-steps → howto, summary k/v → overline/body
- setMove texts L301/378/442
- end card: .v3-bend → discovery, .v3-skill → label, loop note → caption, 'Keep playing' / 'I’m done' L436, .v3-keep
- canvas: twist banner L458/473-474, fx.label/drawWords/arcText across all engines → canvasFont voice
- share subtitle L553

LANDING (landing.js):
- brand L32 → logo
- card eyebrow, h3 checkIn L41 → heading 20 (or world)
- check chips → control
- muted note
- Finish / Another ritual / Save / share buttons
- 'What you did' eyebrow
- summary-card k/v
- bubbles L59-69
- support ghost L76
- toasts L83/114
- share-card canvas L101-106 (84/44/34px) → story / voice / logo

PLANS (plans.js):
- plan eyebrow L11 → brandMark, not uppercase
- h3 tagline L12 → story heading 22-24
- li L13 → body
- buttons L15-18
- h1 L33 → cinematic
- lede L34 → body
- Restore / support ghosts L39-40
- test-note L41-43 (12.5) → caption
- toasts L23/L39
- give .plan the --glass-strong background (unreadable today)

SETTINGS (settings.js):
- h1 (inline 26) → screen-title
- eyebrows Feel/Privacy/Plan/About → overline
- .setting labels → row, small notes → caption
- select / range
- delete button
- tier name
- 'View plans', 'Remove test plan'
- About copy L44 → caption or body
- 'Support lines'
- version (inline 12) → caption 13
- delete sheet L52-54
- new rows needed: Text size, Subtitle speed, Auto-flow

LIBRARY (library.js):
- count eyebrow
- h1 (inline 26)
- muted
- tab chips ('★ Saved · n', 'Rituals · n')
- search
- category/Mallow chips
- rows .emo-row n/b
- inline 'ULTRA' badge L91 (10px) → badge 'BEYOND'
- empty state
- 'Show more'

JOURNEY (journey.js):
- h1, muted, section eyebrows
- tile value (inline 800 28 display) → stat
- tile label 700 13 → label; tile sub 12 → caption
- bars 14, legend 13, notes 12.5/13, day labels 11 → caption 13
- recent rows 14
- buttons

MALLOWS (mallows.js):
- h1, muted
- tile b (700 17 display) → heading 17
- tile spans (12.5) → caption
- favourites eyebrow
- .choice rows

ANGLE / ANOTHER ANGLE (src/ultra/another-angle.js): 49 inline declarations from 9 to 34px.
- The largest are L1192 '700 34px/1 display' → cinematic, L200 '700 26px/1.35 display' → world, L418/L1448 '700 20px/1.35 display' → discovery, L1301 '700 22px/1.42 display' → discovery.
- 9–11px labels at L1007, L1018, L1186, L1393 → overline 13.
- Sheets: 'What actually happened?' L169, 'Add your own evidence' L314, 'Your sealed prediction' L1463, 'Practise the words' L1481.
- Toasts L77, L1452.
- Zuzu say() L177/191.

SUPPORT (support.js):
- sheet title, intro p (inline 17/1.45) → body
- cards: eyebrow / h3 (18) / p
- Call/Open buttons
- muted footer L24
- foot button

SHARED (ui.js):
- sheets .sheet-head h2 → heading
- toast → label 14 Manrope 600
- bubble → dialogue, .who → overline 13 in #6a4ac0 (6.26:1 on white; today #8a6bd6 is 4.07:1)

SIGNATURE RITUALS (src/rituals/*.js, 10 modules): inline DOM fonts plus canvas stacks listed under integration points. Their say() lines (e.g. moonmilk-wind-down.js:229-608, drift-and-dock.js:244-727) go through the bubble → dialogue.

FRAMER placeholder (HushmallowEmbed.tsx:43-47) stays system-ui, lowercase brand.

NEW SURFACES (Hushfold): subtitles, Thought/Belief labels, world intro, discovery, Garden reward, Flow/Beyond invitation, Pause/Resume/Skip/Continue, emotion/intention sidebar → the tokens above.

### Suggested build order for the brand/type slice (input for the ETA answer)
1. Copy the font and logo assets, plus OFL texts, into assets/fonts and assets/brand; update build-site.sh:17. Small; assets are ready.
2. src/brand.js, the brand sweep (27 customer-facing sites + 7 plan-name sites) and tests/brand.test.mjs. Small.
3. type.css/type.js tokens and fallbacks, the index.html preloads, the boot gate, and fx.FONT re-pointed. Small–medium.
4. Move app.css's ~50 text rules onto the tokens and remove Fredoka. Medium.
5. Move inline styles onto the tokens: another-angle.js (49), the 10 signature rituals (~85 DOM plus canvas sites), and journey/express/library/settings/support/mallows/encounter (~23). Large but mechanical.
6. Update docs (README.md, FRAMER.md:66, STATUS.md).
7. QA at 375×812, 390×844 and 430×932, plus desktop: fonts loaded, no text below 13px except badges, no overflow, contrast ≥4.5:1 for text under 18px.

Steps 1–3 can ship with the pilot; steps 4–5 can follow screen by screen without breaking anything, because the old --font-display/--font-ui variables stay as aliases.


## Risks
- Uppercase CSS breaks the lowercase rule: .eyebrow (app.css:37), .bubble .who (:116), .summary-card .k (:165), 8× textTransform in another-angle.js and sunpop-savour.js:785. Any 'hushmallow Flow/Beyond' placed in those styles renders as HUSHMALLOW. It must be wrapped in .brand-name (text-transform:none) or kept out of overlines, and the brand test should check for it.
- The brand rule applies at sentence start too ('hushmallow uses no AI…'). Some copy reviewers or auto-capitalising tools (iOS share sheets, e-mail subjects, App Store Connect fields) may capitalise it; the App Store listing and native shell (HushNative/StoreKit product display names) are outside this repo and need the owner to update them.
- Renaming PLANS names is safe only if ids 'paid'/'ultra' and productIds stay exactly as they are; StoreKit, the stored 'entitlement' {tier} and tests depend on them. Do not rename tiers to 'flow'/'beyond' internally.
- tests/v3.test.mjs:209-215 asserts specific PLANS.paid.includes phrasing; rewriting the Flow benefits list will fail CI unless those two phrases stay or the test is updated with intent.
- Canvas text does not trigger web-font loading. Engines that measure or wrap text before document.fonts.load resolves will lay out with the fallback and may mis-wrap; await fontsReady before engine.create (v3/host.js:48/303). Safari's canvas font parser may reject non-100-multiple weights (560/650), so use 600/700 on canvas.
- Fraunces has no dependable optical-size control in canvas and the wght-only file is pinned at the opsz 9 text cut. Keep Fraunces to DOM titles, and use fraunces-latin-standard-normal.woff2 (opsz+wght) rather than the 36 KB wght file.
- Line boxes grow about 13% at line-height:normal when moving from Fredoka (1.21 em) to Nunito Sans/Manrope (about 1.365 em). Components using `font:` shorthand without a line-height (.btn, .ask, .chip, many inline styles) may grow; tight layouts (.enc-card at ≤640h, v3 dock at ≤700h, home topbar at ≤360w) need re-checking.
- Manrope's large x-height (0.54 em) makes 15–16px UI text look as large as about 17–18px Nunito. Mixing three families on one screen goes against the brief's 'don't mix too many typefaces'; limit Fraunces to one element per screen.
- The logo cut-out keeps the mascot interior bit-exact, but its soft top bloom into the white paper becomes a faint pale rim on dark grounds (≤1px at 720w). If the owner wants a perfectly clean edge, that needs an artwork export with real transparency from the original design file, not further processing.
- logo-mascot.webp is not the mascot drawn in the logo (different proportions and feature placement). Anyone 'fixing' the reversed logo by pasting logo-mascot.webp would alter the approved logo; using it as a separate character/app-icon asset is fine.
- The light logo on very bright realms (Sunpop Orchard peach sky) has low contrast. Use the CSS drop-shadow or a soft scrim, or the ink variant, chosen per realm; do not edit the asset.
- iOS Safari zooms the page when a focused input has font-size < 16px. Keep --type-input ≥ 16px (the new subtitle reply overlay and search fields included).
- logo_recipe.py depends on scipy, which is not installed system-wide (I installed it under /tmp/claude-0/audit/brand/pylib2). Commit the generated assets; do not make CI or the site build depend on the script. A scratch http.server is still running on 127.0.0.1:8766 serving /tmp/claude-0/audit/brand (harmless, scratch only).