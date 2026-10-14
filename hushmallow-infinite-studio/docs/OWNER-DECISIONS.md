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
