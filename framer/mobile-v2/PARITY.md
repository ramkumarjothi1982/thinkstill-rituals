# Mobile V2 — parity checklist

Legend: **P** preserved from desktop (same code path) · **I** improved / redesigned for mobile · **F** desktop bug fixed ·
**T** tested here (how) · **—** not tested yet.

Desktop reference = launch build a2612e9 + the v6–v19 edits (rotation v11, Rain Out v10, settings v12, screen arrows v18/v19).
The mobile payload is compiled from the same source (`desktop/`), so every ritual engine, the router, the strict rotation,
the check-in, shift meter, rewards and safety layer are the desktop code — not re-implementations.

## Engine and state

| Area | Status | Evidence |
| --- | --- | --- |
| Source = desktop launch build | P | `desktop/` rebuilds a2612e9 byte-identical before ports (sha256 82e549b9…) |
| v6–v19 minified edits ported into source | P | rotation v11, Rain Out clear sky v10, settings v12, screen arrows v18/v19, v6 copy — see git history |
| Strict no-repeat rotation (`eos_rotation_strict_v2`, migration from v1) | P · T | 25/25 scenarios identical to the v19 build (fresh, partial, 2 left, exhausted, old-key migration × 5 feelings) — `rotation_parity.mjs` |
| Safety flag rotation dead-end (only 7 gentle rituals, then "no ritual fits" until reload) | F | gentle list cycles again once exhausted |
| Router, emotion detection, safety scan, support lines | P | same code |
| Text → 6 entries, image-only entries, live re-materialise while playing | P | same code; shell offers "edit words" during play |
| Uploads: max 6, 1 → all slots, 2 → 3 each, 3 → 2 each…, remove → defaults | P · I · T | same code; new pictures sheet; upload + badge tested |
| Score / played list / sparks / tokens / FLOW level | P | same code |
| Persistence keys | P | same keys; adds `ts_release_theme` |
| Header arrows = previous/next SCREEN (never ritual) | P · F · T | v19 rules; fixed: reveal → ‹ → finish again now reaches the reveal; REPEAT no longer lets › skip to the old end screen; a skipped check-in is not forced back |
| Haptics setting | F | every ritual's vibration now honours it (desktop ignored it in ~120 places) |
| Music button | P · I | shared ThinkStill music source when present (desktop behaviour); otherwise a generative Eclipse score (desktop was silent) |
| Close | P | `onClose` event (Framer property "On Close"); without it, resets to a new thought (v19 behaviour) |

## Shell (new mobile presentation)

| Area | Status | Evidence |
| --- | --- | --- |
| Header "Emotional Release Console by ThinkStill", ‹ › music · settings · close | I · T | 360 / 390 / 430 widths, dark + bright |
| Settings popover stays open while toggling (sound, haptics, calm visuals, music volume, appearance, support, about) | I · T | `ui.mjs` |
| Check-in (desktop EOS check-in, restyled; grid adapts to phone height) | P · I · T | 390×844, 360×740, 430×932 |
| Breathing Eclipse: home, transitions, reveal | I · T | launch: dive → Eclipse core → title card with the user's words → ritual opens from the light; reduced motion → cross-fade |
| Thought → Words → Released strip during every ritual | I · T | progress read from the engine's own progressbar |
| Reveal: headline, released words, shift meter, I'M GOOD / ONE MORE / REPEAT, legacy question when check-in is off | P · I · T | full flow to the payoff step |
| Dark / bright themes | I · T | check-in, play chrome, reveal checked in both |
| Keyboard never covers the composer | I | visualViewport inset |

## Rituals (30 launch rituals; engines unchanged in behaviour)

Filled in from the per-group re-composition passes (see `qa/`).
