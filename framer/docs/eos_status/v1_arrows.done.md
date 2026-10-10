Committed (853078a) and pushed. Nothing further is needed from the tools; the job is complete.

| item | cause | fix | 390 | 1280 | commit |
|---|---|---|---|---|---|
| Returning players (founder replaying, `learned >= 2`) lose the cue | veteran cue auto-hid 2.5 s after first show, idle 6 s (baseline 390 veteran sweep: 36/57 gone at 3.5 s, 2 never shown) | no auto-hide; idle re-show 4 s for everyone (label-free level-1 cue kept for veterans) — `src/eos/30_eos_arrows.jsx` | start arrow 114/114 visible, 114/114 still up at 3.5 s | 114/114, 114/114 | 4284671 |
| Cue felt missing right after a good step | next cue waited the full 4 s idle | after a step that moved the bar (`S.lastDownAt`) re-show after 2.2 s idle | veteran re-show: POP 0.75 s, ZAP 0.16, CRACK 0.38, TRADE MACHINE 0.19, VELCRO 2.6, CLEANSE 3.8 (1.06 s hold + 2.2), CRUSH 4.1 (tap did not move the bar) | 0.40 / 0.15 / 0.39 / 0.17 / 2.7 / 3.6 / 4.2 s | 4284671 |
| Every stage, every game, ALL 114 (tool-first + multi-stage) | sweep `dev/f6_probe.mjs` + `arrowCheck` (aim ≤ 18 px, painted, reveal) | probes added; no further code change needed | 235/235 stage arrows, 0 stage misses, 0 aim misses, 114/114 reach the reveal (18, 42 OK solo after load timeouts); tool games point at the tool first then objects | 231/231, 0, 0, 114/114 reach the reveal | 4284671 (probe) |
| 88 TRADE MACHINE 1280: hand 40 px off every prize | `choose` candidates included the midpoint between options (finger rested in the gap) | shared rule: finger lands ON an option — rims 4 px in for word-filled options, midpoint only when options touch (≤ 12 px) | 8 stages, 0 aim | 8 stages, 0 aim (was 40 px) | 50b407e |
| 109 CLEANSE at 0 %: arrow fine, game never charged | hold charge was `+3.2` per 34 ms `setInterval` tick; starved main thread → 13 % after 1.4 s | `CleanseEngine` beginHold/finishHold: charge follows elapsed hold time, same 1.06 s full time | reveal reached with arrow up | reveal reached | c1c889a |
| 66 BUFFERING "gone at 3.5 s" (1280) | not a defect: wait gesture (HANDS OFF) finishes in ~3 s, cue leaves with the reveal | — | OK | OK | — |
| Paint-diff flags 7, 45, 67 (390), 48 (1280) | screenshot-diff measure below threshold | arrow + hand visible by eye (fix_F6_hands.jpg); 7/45 painted in solo runs | visible | visible | probe sensitivity only |
| Confirmation on HEAD 642c864 build after the parallel CRACK/STOMP tool change (rows 3/4, `25_eos_game_tools.jsx`) | — | re-probe ids 1, 3, 4, 67, 88, 109 | 6/6 start, 15/15 stage arrows, 0 miss, 0 aim, 6/6 reveal (3, 4: tool stage then bubbles) | same 6/6, 15/15, 0, 0, 6/6 | 853078a (docs) |
| Report + F6 status + evidence | — | `docs/founder/v1_fix_arrows.md`, F6 line FIXED in `FEEDBACK_LOG.md`, `fix_F6_sheet_A.jpg` / `fix_F6_sheet_B.jpg` / `fix_F6_hands.jpg`, progress `docs/eos_status/v1_arrows.progress.md` | — | — | 853078a (pushed) |

Files: /home/user/thinkstill-rituals/framer/docs/founder/v1_fix_arrows.md, /home/user/thinkstill-rituals/framer/docs/founder/FEEDBACK_LOG.md (F6 line only), /home/user/thinkstill-rituals/framer/docs/founder/fix_F6_sheet_A.jpg, fix_F6_sheet_B.jpg, fix_F6_hands.jpg, /home/user/thinkstill-rituals/framer/docs/eos_status/v1_arrows.progress.md. Build: `python3 build.py --dev-dir /tmp/v1_arrows` OK on HEAD (23 parts). gap_rows.json untouched (P8.3-a is a derived row in GAP_AUDIT §3 row 13; the package step merges).

Left open (not blocking):
- 67 TAP OUT at 390: glove fingertip sits on the LEFT pad's right rim (hotspot inside the target, aim 0 px) while the glove body overlaps the RIGHT pad's edge; the arrow points at LEFT and the label reads LEFT · RIGHT · LEFT — cosmetic.
- The "painted" screenshot-diff check has false negatives (3 at 390, 1 at 1280) — probe sensitivity, not product.
- Timing (not-done) failures appear only under machine load 30-40; all passed solo. Full sweeps should run on an idle machine.
- Untracked `framer/dev/package-lock.json` in the tree is not mine and was not added.
