# Mobile V2 — parity checklist

Legend: **P** preserved from desktop (same code path) · **I** improved / redesigned for mobile · **F** desktop bug fixed ·
**T** tested here (how) · **—** not tested yet.

Desktop reference = launch build a2612e9 + the v6–v19 edits (rotation v11, Rain Out v10, settings v12, screen arrows v18/v19).
The mobile payload is compiled from the same source (`desktop/`), so the router, the strict rotation, the check-in,
shift meter, rewards and safety layer are the desktop code — not re-implementations. The 30 rituals themselves are
rebuilt natively for phones (`mobile/5x_r_*.tsx`): same mechanic, steps, word chunks, face changes and completion bonus
as the desktop audit, redesigned so one focal world fits a phone with nothing fighting for space.

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
| Thought → Words → Released strip during every ritual | I · T | each native ritual reports progress after every real success only (never for failed attempts) |
| Reveal: headline, released words, shift meter, I'M GOOD / ONE MORE / REPEAT, legacy question when check-in is off | P · I · T | full flow to the payoff step |
| Dark / bright themes | I · T | check-in, play chrome, reveal checked in both |
| Keyboard never covers the composer | I | visualViewport inset |

## Rituals (30 launch rituals, rebuilt natively for phones)

Every ritual completes by real touch gestures (scripted pointer events, not API calls) to the reveal screen with no page
errors: all 30 at 390×844 dark in one regression pass on the merged build, and per ritual at 360×740, 430×932,
390×844 bright, a 2-word and a ~25-word thought by the agent that built it. Evidence screenshots: `qa/native/`.

| # | Ritual | Status | Mobile gesture / notes |
| --- | --- | --- | --- |
| 1 | POP | I · T | tap bubbles; letters fly; chain of light to the moon |
| 6 | ZAP | I · T | zapper in a ring of 6; 2 hits each; gold lightning chain |
| 15 | SHRED | I · T | words on the paper (desktop bug fixed); 5 bites × 6 pages; bin burst |
| 22 | FLUSH | I · T | pull chain (weak pull springs back); spiral down the drain; calm water |
| 25 | SWIPE AWAY | I · T | either direction or fast flick; weak swipe springs back |
| 29 | MUTE | I · T | fader pull ≥80%; fader resets per word (fixed); ON AIR off |
| 32 | PARK IT | I · T | real drag into LATER TODAY / TOMORROW / NOT NOW; chosen bay kept (fixed) |
| 36 | CLOUD PASS | I · T | slow push passes, fast push puffs up; sunrise + rainbow |
| 39 | BLACK HOLE | I · T | hold builds gravity; early release halves charge; golden galaxy |
| 40 | PAPER PLANE | I · T | fold both wings, flick up/left/right (desktop: right only); down springs back |
| 41 | UNHOOK | I · T | swipe across a string to snap it; faces flip per bubble (fixed) |
| 47 | UNFOLLOW | I · T | drag the plug out; near-miss springs back; feed powers off |
| 52 | SUBTITLES | I · T | SOAP / NATURE / SPORT restyle the same words; curtains |
| 61 | FREEZE | I · T | 3 taps → frost → crust → ice → shatter |
| 75 | INK BLEED | I · T | drag the drop through the words; ~70% of letters must be touched |
| 79 | MISS ON PURPOSE | I · T | tap any pad but the bullseye; bullseye = no credit |
| 87 | KEEP / DROP | I · T | drag up to keep, down to drop; short drag springs back |
| 88 | TRADE MACHINE | I · T | token into slot, then TIME / SPACE / LAUGH |
| 97 | X-RAY | I · T | 3 scans ≥60% across, then KILL / BURN ALL |
| 100 | HOT POTATO | I · T | fling ≥48 px; short drag springs back; room cools |
| 101 | TUG OF WAR | I · T | pull until it strains, then let go; 6 rounds |
| 102 | FINGER TRAP | I · T | push an end inward; pulling outward tightens; bracelet finale |
| 105 | DRAMA MACHINE | I · T | MAKE IT DRAMATIC / CUT; 6 distinct effects (takes in fixed order: filmstrip dropped) |
| 106 | TINY SOUNDTRACK | I · T | faces are keys (C D E F G A); CLEAN / SILLY; melody replay |
| 107 | GO WEIRD | I · T | drag or tap 5 props onto the character; disco finale |
| 110 | RAIN OUT | I · T | pull clouds down; storm then clear sky (v10 timings) |
| 111 | BIG SIGH | I · T | hold to breathe in, slide up to sip, let go slowly; clouds lift per sigh |
| 112 | COOL THE VOLCANO | I · T | crater-only taps (fixed); hold for rain paced by breath; garden |
| 113 | GROUND CONTROL | I · T | 3 spot + 2 body beacons; rocket lands; constellation |
| 114 | SKY LANTERNS | I · T | hold to warm, release to rise; send or keep (share path not yet device-tested) |

Known gaps: reduced-motion passes were not run for every ritual (79 and 88 still play short one-off bounces);
SKY LANTERNS' native share sheet is untested on a device; BURN, CRACK, STOMP, CLEANSE, SLINGSHOT and METEOR stay
benched as in the desktop launch build.
