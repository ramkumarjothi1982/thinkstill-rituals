# launch30 progress

- [call ~3] started; clean tree at 1191c45 on claude/jolly-hopper-ognrxj. Reading router/pick.
- [call ~22] code edits done: core EOS_LAUNCH_IDS/eosLaunchOk/eosLaunchGames; router eligibility+bench(6 out)+routes(6,75,41)+act2 general fallback+menu group; pick group filter; arcade chooseRelevantGame, infinityChoices, startChosenGame guard, openAdjacentRelease, owner menu lists/labels; CRACK/STOMP back to classic via EOS_TOOLS_LIVE=false. Next: build /tmp/launch30 + routing test.
- [call ~40] build /tmp/launch30 OK; API routing test (13 emotions x 3 bands x 3 flag states, excludeId fallthrough, act2, preview, rotation 2 cycles) = 0 bad at 390 + 1280; UI routing run in progress (/tmp/l30/ui.mjs). Next: menu test, sweep 390 then 1280 (/tmp/l30/sweep.mjs).
- [call ~52] UI routing 390: 13 emotions x (3 typed phrases x RELEASE IT + 2 NEXT) + 3 check-ins = 156 launches, 0 outside the 30, 0 early repeats, 0 errors. Owner menu (menu=1): exactly the 30; start(3) swapped to 112; PREV/NEXT browse stays in 30. ship_smoke.mjs now honours DIR. Sweep 390 running (/tmp/l30/sweep_390.log), then 1280.
- [call ~60] sweep 390x844: 30/30 reveal, 0 page errors. Sweep 1280 started (now also clicks NEXT at the reveal).
- [call ~64] sweep 1280x860: 30/30 reveal, NEXT at reveal served a launch game 30/30, 0 page errors. Next: package.
- [call ~72] packaged: FULL.txt 2,969,235 B; FRAMER.txt 821,661 B underLimit true. Single-file harness /tmp/launch30_single: ship_smoke 390x844 10/10 REVEAL, 0 errors; launch list present (30), routing API 0 bad. Docs: SHIP_NOW_NOTES Launch 30 section, LAUNCH_30 build-notes line. Committing.
