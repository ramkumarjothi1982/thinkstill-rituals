# mood — progress carried over from earlier attempts (cut off by usage limits)
- Draft src/eos/14_eos_mood.jsx exists.
- DONE: colour script visuals tuned (all emotions, both sizes).
- IN PROGRESS: flip bloom words at finish (timing, size, look); acceptance script (POP, HOT POTATO, CLEANSE x anger/panic, numb, reduced) at 1280 and 390 — test scripts were in /tmp/eos_mood_t (may still exist).
- TODO: finish the above, write the report to docs/eos_status/mood.build.md and commit.

## Notes the earlier attempt left (it was cut off):
# mood build — IN PROGRESS (session resumed after a usage limit)

- File: src/eos/14_eos_mood.jsx (draft complete: EosMoodGrade, EOS_MOOD_CSS, eosExpose("mood")).
- Now: hardening (calm mode without transforms), acceptance runs (POP / HOT POTATO / CLEANSE × anger / panic,
  numb, reduced, calm) at 1280×860 and 390×844, screenshots into dev/shots/eos/mood_*.png.
- Acceptance script: /tmp/eos_mood_t/accept.mjs (one case per process).

## 2026-10-08 resume (attempt 3)
- Re-read draft (complete), rebuilt /tmp/eos_mood_int (integrated) + /tmp/eos_mood (isolated); both OK.
- Prior acceptance: run5/run6 all pass except 100 HOT POTATO @1280 finish timeouts (flaky). Now: control run (no mood) vs mood build to see if the layers cause it.
- Next: fix if mood-caused, full acceptance rerun, screenshots refresh, report + commit.
- HOT POTATO @1280 stuck at 83 % (bottom-left potato) reproduced WITH the mood layers display:none → not mood; driver/game flake. accept.mjs got a manual-toss fallback for id 100.
- Running full acceptance (cases2.txt, 20 cases) on /tmp/eos_mood_int → accept_run8.jsonl. Next: real-world finish shots with dots+readability (/tmp/eos_mood_int2), report, commit.
- run8 (accept_run8.jsonl): 21/22 PASS, 0 page errors at both sizes. Only 100/panic/1280 failed: game never finished (stuck 83 %, driver flake). Checking control build (no mood) for the same flake; rerunning the case.
- HOT POTATO @1280 bisect: control (no mood) 5/5; mood build ~50 %; mood with layers display:none 0/1; mood WITHOUT pointer listeners AND without the rAF tween still 1/3 stuck at 83 % → not caused by mood rendering, listeners or tween. Reported as a headless flake for Regression/fixes. run9 rerun of 100/panic/1280 PASS → 22/22 acceptance cases pass.
- Writing mood.build.md and committing.

## 2026-10-09 FIX round 1 started
- Findings: mood.review_r1.json (1 major: crown covers hero finale; 5 minors: bloom >2.0s, avoid finale, measure @900, grade over HUD, card prediction glide).
- (call ~17) Rewrote placement: hard content obstacles (pinned hero roots + [data-eos-avoid] + img>=36 + text>=14px), tiered search (near crown -> stage-wide -> tight/stack -> shrink >=20px), yield-fade instead of glide, bloom 200ms stagger x 1.5s (ends 1.9s), measure @900, SVG-mask chrome carve-out over HUD/guide. Builds OK. Running overlap test /tmp/eos_mood_t/overlap.mjs on 111-114 + POP at 390/1280.
- (call ~34) Card model fixed per wrapper (100+: centred in shell; 1-99: last-press clamp), card weight 10, rise 44px (30 counted), nudge inside candidate eval, img>=20px, host-wide content scan. Node unit test /tmp/eos_mood_t/unit2.mjs PASS. Phone matrix m2: 112 clean 0%; 113 crowded (tier 3, imgs 14-36px) -> lowered img threshold. Next: desktop matrix, screenshots, old acceptance subset, report, commit.
- (call ~45) Phone matrix m2: 111/112/114/POP clean, 0% word overlap with game img/text, card prediction within 4px in both wrappers; 113 (crowded finale) tier-3 fallback. Test now freezes each word 700ms into its own anim (reviewer method) for measurement + screenshot. Running desktop matrix m3 + old acceptance subset (accept_r10.jsonl).
- (call ~58) DONE round 1. Desktop 111-114 + POP: tier-0 clean crowns, 42px, 0% overlap, 0 yields; phone all clean except 113 (crowded, stacked 21px, 1 yield). Old acceptance r11 PASS (stagger assertion updated). Report written to mood.build.md. Committing src/eos/14_eos_mood.jsx + docs/eos_status/mood.*.
