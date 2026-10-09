# v2_unstick progress
- started; built current; harness at scratchpad/run.mjs
- baseline (current build, lite): FAIL 47@390 (17%, plug parked translateX(190) off-screen), 34@1280 (33-67%, leaf parked at constraint edge); PASS 8,14,17,21,28,107 both sizes (14/17/21/107 fixed earlier by 60_eos_fixes)
- fix applied: key per idx on .plug(47) .leafWord(34) .meteorRock(8) .fileCard(28) + phase guard in 34 onDragEnd; rebuilt; testing
- r1 after fix: 47 PASS 390+1280 (manual 130px pulls also finish at 390); 8, 28 PASS both; 34 PASS 1280, one intermittent stall @390 (50%), 3 reruns pass -> investigating with stress runs
- todo: router EOS_ROUTER_PHONE_FRAGILE drop 47 (router.build.md says remove once finishGame(47) passes at 390); contact sheet; commit
- 34 intermittent stall ROOT CAUSE reproduced: press just above the leaf + drag down selects the leaf word (stage text selectable); next grab = dragstart+pointercancel (native text drag), selection persists -> permanent stall. Fix: both uniq `shell` divs get TS_STAGE_NO_SELECT style + onPointerDownCapture clear selection + onDragStartCapture preventDefault (helpers above UniqueReleaseEngineLegacy). Repro now passes (34, 47 @390).
- next: full sweep 8 games x 2 sizes, contact sheet, router PHONE_FRAGILE, commit
