# Owner decisions

The single log of choices that belong to the owner. **Defaults apply until the owner answers.** Agents read this file before they plan work that depends on any of these choices, and they never decide them on the owner's behalf.

When the owner answers, set **Status** to `answered`, record the answer and the date, then list the work packages to re-check under "Consequences". If an answer reverses a default that work already relied on, add a line to `docs/CHANGELOG.md` (created in WP-57; until then note it in the affected work-package report).

Source: `docs/PHASE2-PLAN.md`, sections "Open questions for the owner" and "CONFLICTS RESOLVED". Recorded in WP-00.

## Open questions (defaults in force)

### Q1. Posting while Noomi is the only finished Mallow

| | |
|---|---|
| **Status** | open: default in force |
| **Needed by** | the M2 gate, when production starts (about week 9) |
| **Why it matters** | The story library's sequencing rules ("no two posts in a row with the same Mallow", "every Mallow at least once in any 10 posts") can't be met with one Mallow. |
| **Default** | Post **Noomi-only, capped at 3–5 posts per week per channel, until 3 Mallows are approved** (Noomi plus Blubi and Loomi, about week 12). Every other rule still applies unchanged: template, gag, ritual and feeling-family rules, plus cooldowns. The Mallow rules apply to whichever Mallows are unlocked at the time. |
| **Alternative** | Hold all public posting until at least 3 Mallows are approved. |
| **Consequences** | WP-06 and WP-25 (the planner's cadence cap, and sequencing over the unlocked set), WP-27 (the posting plan in Batch A). |

### Q2. Canonical art where the app sprite and the approved 1254 px art are different paintings

| | |
|---|---|
| **Status** | open: default in force |
| **Needed by** | Loomi by the end of M1 (WP-31 is blocked until then). Boppo by M3 (WP-42). Zuzu by M4 (WP-51). |
| **Default** | **The 1254 px art is canonical for Loomi, Boppo and Zuzu.** It is the only version usable at video resolution without upscaling. |
| | Loomi: 2 closed arcs plus a smile, no brows at rest. The app shows 4 arcs. |
| | Boppo: a wide grin with a heart-shaped tongue. The app shows a narrow crescent. |
| | Zuzu: the hi-res proportions, about 6.5 % wider than the app sprite. |
| **Alternative** | Use the app version for any of the three. That needs re-painting at hi-res, because the 439 px sprites can't be upscaled to the quality bar. |
| **Consequences** | WP-31, WP-42, WP-51 (derivation), WP-32, WP-40, WP-50 (face styles), and the owner checkpoint stills for each Mallow. |

### Q3. How the owner reviews batches

| | |
|---|---|
| **Status** | open: default in force |
| **Needed by** | the M1 gate (the first review batch, WP-15) |
| **Default** | **Galleries stay local. Previews of 15 MB or less are shareable.** Each batch's gallery is static HTML on this machine and opens offline. Every video also gets a preview MP4 of 15 MB or less that can be shared for review on any device, such as a phone. Decisions are exported as `decisions.json` with reason codes and imported with `hm review import`. |
| **Option** | Also publish a batch gallery as a private claude.ai page, so approvals can be ticked from any device. This happens only when the owner asks; a page stays private unless the owner shares it. The plan's synthesis offered this as its default; WP-00 records the more conservative "local first" default. |
| **Alternative** | Local files only, with no shareable previews. |
| **Consequences** | WP-05 (the gallery, and the preview encode at 15 MB or less), WP-15, WP-27, WP-37, WP-48 and WP-57 (batch delivery). |

### Q4. Master encoder for segmented renders: CRF 16 (D7) or constant QP

| | |
|---|---|
| **Status** | open: raised by WP-01 and its review (Wave B integration, 2026-10-14). D7 stays the decided default until the owner answers. |
| **Needed by** | WP-02 (the final profile), and in any case before the first production master (M2). |
| **Why it matters** | D7 (and PHASE2-PLAN "CONFLICTS RESOLVED" #7) keeps the CRF 16 master. The render farm encodes 90-frame segments and joins them with `concat -c copy`, and its acceptance asks for ≥ 60 dB against a single pass. CRF carries rate-control state across segments, so segmented CRF 16 measured 49.5 dB against a single pass. WP-01 therefore made constant QP 15 the farm's default (`render/encode.mjs`), which is bit-identical to a single pass. Measured: QP 15 is slightly **better** than the approved master on the 15 frame-aligned goldens (PSNR-Y 45.86 vs 45.02 dB) but **34 % larger** (video stream 45.9 MB vs 34.2 MB; the plan budgeted about 35 MB per master). Details: `docs/wp/WP-01.md`, deviation 1. |
| **Options** | (a) Accept constant QP for masters: QP 15 (≈ 46 MB) or QP 16 (≈ 39 MB estimated, quality just below CRF 16). (b) Keep CRF 16: segments are rendered to a lossless or near-lossless intermediate and the master is one CRF 16 pass over the joined frames (more disk and one extra encode per video). (c) Keep CRF 16 per segment and drop the ≥ 60 dB segment criterion (visible-seam risk not measured). |
| **Consequences** | WP-01 (`ENCODERS` default), WP-02 (profiles), WP-05 (the size check), and the disk budget in PHASE2-PLAN "Resources". |

### Q5. G-DIR thresholds calibrated on the approved v2, and the G-JOLT extremes sheet (D2)

| | |
|---|---|
| **Status** | open: raised by WP-03 and its review (Wave C integration, 2026-10-14). The calibrated values below are in force (marked provisional in `composer/validate.js` `THRESHOLDS` and pinned by a unit test) until the owner or WP-13 answers. |
| **Needed by** | WP-13 (the tuning-matrix workflow and the M1 moves), before any cell other than the v2 point is approved. |
| **Why it matters** | Five plan values would reject the approved v2 itself, so WP-03 loosened them to what v2 measures: **stretch** ≤ 1.4 (plan 1.3; v2 reaches 1.386; `library/mallows/noomi.json` `body.limits.stretchMax`); **R-BREATH exhale** ≥ 1.25× the inhale (plan 1.5×; v2 1.28×: 1.48 s in, 1.9 s out); **glass readability** at card alpha ≥ 0.75 (plan 0.9; depth dims v2's back cards to 0.84); **captions "fully clear at alpha ≥ 0.9"** for their reading time is a warning, not an error (v2's end card is clear for 1.95 of the 2.35 s its length asks); **glass cards on the right rail** are a warning (v2's second card crosses the rail for 0.72 s). Every future direction is judged by these values. Separately, the `G-JOLT × noomi` cell in `library/tuning-matrix.json` (mirroring `library/capabilities.json`) is `approved` with intensity range 0.8–1, but no extremes sheet exists (`evidence.extremesSheet: null`, flag `D2-extremes-sheet-pending`). D2 approves a cell only after the owner ticks its extremes sheet, so the planner can currently sample intensities the owner has not seen. |
| **Options** | (a) Accept the calibrated values as the brand's limits. (b) Keep the plan's values for new content and exempt only the v2 golden (a per-spec waiver recorded in the spec). (c) Per-value: e.g. keep the stretch at 1.4 for Noomi's pack only and restore 1.3 elsewhere. For G-JOLT: tick an extremes sheet for intensity 0.8 and 1.0 (WP-13 builds the sheets), or collapse the range to the v2 point until then. |
| **Consequences** | WP-13 (cells and extremes sheets), WP-21–WP-23 (new moves are judged by these values), WP-05 (QA gates share some of them), WP-06 (planner sampling ranges). |

### Q6. QA limits calibrated on the approved v2 (WP-05)

| | |
|---|---|
| **Status** | open: raised by WP-05 and its review (Wave D integration, 2026-10-14). The calibrated values below are in force (tagged `provisional` in `qa/gates/thresholds.json`, the plan's value kept as the warn band) until the owner or WP-27 answers. |
| **Needed by** | WP-15 (the first review batch), and in any case before WP-27 refits the thresholds on 12 or more approved videos. |
| **Why it matters** | Five plan limits would fail the approved v2 itself, so WP-05 set the fail limit at or beyond what v2 measures and kept the plan's value as a warning. Every future video is passed by these values. **Thought-card text** (glass) ≥ 1.8:1 (plan 4.5:1; v2's cards measure 2.19:1). **Cards over the Mallow** ≤ 25 % (plan 15 %; v2 21.8 %) and **over the face** ≤ 8 % (plan 5 %; v2 5.7 %). **Skin grade** (G-FINAL:fidelity): hue shift fails at 30° (plan 10°; v2's cold and warm relight reaches 22.4°) and chroma at 0.45–1.6× (plan 0.8–1.2×; v2 0.55–1.42×), so a body recoloured by about 20° only warns. **Logo SSIM** ≥ 0.95 (plan 0.995; v2 0.988 against a canvas LogoCard probe without the post-processing). Separately, the plan's rest-probe fidelity check (identity post, dE2000 mean ≤ 1.0) is not built: it needs an engine probe mode (WP-10). |
| **Options** | (a) Accept the calibrated values as the brand's limits. (b) Keep the plan's values for new content and exempt only the approved v2 (a per-video waiver). (c) Per value: e.g. accept the card coverage but restore the 10° hue limit once the rest probes exist and judge the relight there. |
| **Consequences** | WP-05 (`qa/gates/thresholds.json`), WP-10 (rest probes), WP-12 (glass card ink and alpha), WP-15 and WP-27 (batch QA and the refit). |

### Q7. When new videos switch to the generic score (WP-04)

| | |
|---|---|
| **Status** | open: raised by WP-04 and its review (Wave D integration, 2026-10-14). Default in force: every composed direction keeps `meta.score: 'soundtrack-v2'` (`composer/compose.js`), so nothing renders with the generic score until the owner answers. |
| **Needed by** | the M0 gate (the A/B listening pass in `docs/m0/audio/README.md`), before the first M1 render. |
| **Why it matters** | The generic score (`audio/score.mjs`, `'hm-score'`) fixes R7, R10 and R11 and voices each Mallow in its own kit and realm. It also makes musical changes the owner has not heard: hit sync moves kit gestures up to 0.3 s earlier and softens answer notes (Pipzi's 4-bell run now leads 240 ms into the logo; Glitzi and Boppo move their take sounds), MO-CLOSE is lifted into the phone band (≥ 600 Hz), and a loop is delivered as 256 kb/s AAC with an MP4 edit list hiding 1 s of pre-roll (192 kb/s plain mux in v2). A player that ignores edit lists would play that score 1.02 s late. |
| **Options** | (a) Switch new directions to `'hm-score'` after the listening pass (the golden T01 keeps `'soundtrack-v2'`). (b) Switch per Mallow as each kit is approved by ear. (c) Keep `'soundtrack-v2'` until the banned-recipe lint gaps found in the WP-04 review are closed. |
| **Consequences** | WP-04 (score defaults, bitrate), WP-01 (`render/mux.mjs` loop mux), WP-13 onward (every new direction's sound), WP-25/WP-27 (delivery checks on the uploaded file). |

## Decided defaults (the owner may still overrule them)

These came out of the plan synthesis. They count as settled unless the owner says otherwise.

| # | Topic | Decision |
|---|---|---|
| D1 | Noomi colours | The approved v2 values win: source-over blush rgba(255,110,200) × 0.42, tongue #ff8ab0 → #e2557f, mouth inside #1a0a3a. Registry colours apply only to the other six Mallows. |
| D2 | Cell approval | Approving a video does not approve its cells. A cell is approved only when it compiles clean (G-DIR) **and** the owner has ticked its min/default/max extremes sheet. Review batches may use candidate cells; production uses approved cells only. A cell's version is the hash of its compiled output on fixtures. |
| D3 | Moonmilk set pieces | The headland and lighthouse, aurora, pearly shore, shells and pearls, fireflies and dream bubbles are approved designs: they are in the app's `moonmilk-cove.js`. Set pieces that really are new, such as a pond for Pipzi, stay out. |
| D4 | Rest-match failure | There is never a "crossfade off" fallback. The only fallbacks are a better derivation or a narrower expression range. A style that fails rest-match does not ship. |
| D5 | Flash gate | Zero flashes allowed. A flash is any change of 10 % or more over 25 % or more of the frame. The gate is calibrated so that v2 passes. The WCAG count is reported only as an extra check. |
| D6 | Rejection reason codes | Reason codes flag cells for re-tuning. The only automatic down-weighting is a bounded "sameness" penalty, with a floor of 0.5 and a 30-day decay. |
| D7 | Encoding and storage | The master is encoded at CRF 16. Disk space is managed by retention rules, with the spec plus the engine SHA as the archive. Clean-plate caption variants are an optional later work package. |
| D8 | Copy | No generated copy. The export writes `caption.txt` only from library strings plus a hashtag list the owner curates. Nothing is ever posted automatically. |
| D9 | Rollout order | Vertical slices: each wave brings faces and realms together. Blubi derivation starts during M1. |
| D10 | Small choices | Segments are 90 frames. The story library stays in `templates/`; packs live in `library/`. |
| D11 | Throughput | The plan assumes a ceiling of 60–80 accepted videos a day; the real limit is owner review. The content plan still holds at about 55 a day if the performance work falls short. |
| D12 | Frozen v2 (WP-00) | The approved v2 is hash-locked (`qa/golden/v2/frozen.sha256` for tracked files, `frozen-local.sha256` for the git-ignored render artefacts in `output/v2/`) and tagged `v2-approved`. That covers `stage/`, `stage2/`, `videos/my-brain-at-2am-v2.js`, `audio/soundtrack-v2.mjs`, `audio/soundtrack.mjs`, `render/render.mjs`, `render/verify.mjs`, `assets/noomi/` and `output/v2/`. Phase 2 forks these files and never edits them. Re-freezing needs the owner's approval. |
