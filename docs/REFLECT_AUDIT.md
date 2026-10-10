# ThinkStill Reflect — Source Audit (Gate A)

Date: 10 Oct 2026. Branch: `reset-reframe-prototypes`.

## What was inspected

| Source | Where | Inspected | Notes |
|---|---|---|---|
| 1,000-ritual corpus | `rituals.json` (repo root, 1,000 entries `TS-001`…`TS-1000`) | Yes | Fields include `bubble`, `name`, `challenge_type`, `challenge`, `unique_game_move`, `play`, `rule`, `twist`, `theory_backbone`, `safety_class`. Seven bubbles: 150 each, Sync 100. 973 distinct pattern families. The same corpus also ships as `ThinkStill_MASTER_1000_PRODUCTION_LOCKED_FINAL.xlsx` inside the uploaded Reset.zip. |
| Reset console (Framer TSX) | uploaded `Reset.zip` → `ThinkStill_RESET_CONSOLE_DUPLICATE_LABELS_REMOVED_FINAL (1).txt` | Yes (shared-media, music, theme, avatar conventions) | v40.05. Source of truth for the seven Bubble avatars and Bubble music. |
| Reset / Reframe game consoles (this project) | `games/` (engine, kit, 76 games) | Yes | Instance-scoped engine, Bubble expression system, guide hand, synthesized audio, QA runner, esbuild → Framer pipeline. |
| Reframe V2 sample | uploaded `Reframe.zip` (earlier in this project) | Yes, earlier | Shared theme / shared media hooks. |
| Bubble expression art | `bubble-expressions/` (700 webp, 512×512 RGBA) | Yes | |
| **Reflect V2** `ThinkStillReflect30_ReleaseStandard_v2.tsx` | — | **Not available** | Not in the repo or uploads. Its 30 concept names are taken from the rebuild directive instead. |
| **Release console** `ThinkStill_RELEASE_CONSOLE_UNIQUE_GAME_COPY_FINAL_v2.tsx` | — | **Not available** | The quality baseline could not be inspected directly; the Release conventions already adopted in this project (EOS guide-hand grammar, shared avatar bridge) are reused. |
| Cloudflare Worker / Durable Object backend | — | **None exists** | A new one is written for Reflect (`games/reflect/src/server/`). |
| `docs/CREATIVE_STANDARDS.md` | — | **None exists** | Reflect standards are in `docs/REFLECT_CREATIVE_BIBLE.md`. |

Screenshots of the current Reflect V2 build could not be captured because its source was not provided.

## Shared conventions Reflect must reuse

- **Bubble art URL:** `https://raw.githubusercontent.com/ramkumarjothi1982/thinkstill-rituals/main/bubble-expressions/<slug>_E<NN>.webp`
  (`slug` ∈ loopie, glitch, patch, drop, rush, still, sync). Overridable per build (`assetBase`). Mood → code map lives in
  `games/kit/kit.js` (`MOODS`).
- **Shared-media bridge (Reset is the source of truth):** `localStorage["__ts_reset_shared_media_v1"]` =
  `{ version: 3, avatars: {slug: url}, overlays: {"<slug>_overlay_<n>": url}, videoOverlayKeys: [...], music: { global, still, patch, sync, loopie, drop, rush, glitch } }`,
  plus the same-window event `thinkstill:reset-shared-media`. Reflect plays the Bubble/global music from here and never
  asks for its own music assignments.
- **Theme:** `__ts_chat_theme_v181` = `dark` | `bright`, shared across consoles.
- **Momentum XP:** `__ts_thinkstill_experience_v1`; growth events `__ts_growth_events_v1` (never free text).
- **Header / navigation:** eclipse brand mark top-left, sound + settings top-right, leave button only when the host passes `onExit`.
- **Guide hand:** gold glove + chevron, 2–4 word uppercase label, hides on touch, returns after idle.

## Mechanics reuse risk (from the directive)

The rejected Reflect V2 drove 30 configs through one `CinematicStage` / `RX_SCENES` layout (per the directive). Reflect
therefore shares only low-level primitives (camera, particles, audio, gestures, room transport, Bubble actor) and gives every
ritual its own scene module, verb, state machine and finale.
