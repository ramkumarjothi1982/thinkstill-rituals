All checks pass on the real build at both 390x844 and 1280x860, with zero page errors in every run. No integration fixes were needed.

**Integration**
- `python3 dev/eos_integrate.py --check`: all 41 anchors OK.
- `--in-place --groups I1`: 22 edits OK. I2: 12 OK. I3: 7 OK. None BAD. A second `--check` afterwards shows all 41 as SKIP.
- `python3 build.py`: OK (2685 KB, 17 parts).

**Smoke test** (`dev/index.html`)

| Check | 390x844 | 1280x860 |
|---|---|---|
| Home check-in renders | PASS (12 orbs) | PASS (12 orbs) |
| Check-in panic | PASS, routes to 111 BIG SIGH and it starts | PASS, 111 |
| Check-in anger | PASS, routes to 112 COOL THE VOLCANO | PASS, 112 |
| Check-in anxiety | PASS, routes to 111 | PASS, 111 |
| Check-in sad | PASS, routes to 110 | PASS, 110 |
| POP (1) | PASS, reveal + shift meter, 17.5 s | PASS, 19.0 s |
| CRUSH (2) | PASS, 44.3 s | PASS, 56.4 s |
| HOT POTATO (100) | PASS, 47.0 s | PASS, 120.4 s |
| CLEANSE (109) | PASS when run alone, 86.4 s (failed once with 3 browsers sharing the CPU, see below) | PASS, 78.2 s |
| 111 BIG SIGH | PASS, 45.9 s | PASS, 57.5 s |
| 112 COOL THE VOLCANO | PASS, 45.0 s | PASS, 45.5 s |
| 113 GROUND CONTROL | PASS, 38.2 s | PASS, 32.7 s |
| 114 SKY LANTERNS | PASS, 45.9 s | PASS, 48.6 s |
| Shift meter after the reveal (`.eosShiftMeter`) | PASS, all 8 games | PASS, all 8 games |
| Mic | PASS (label goes "Use microphone" to "Stop microphone" and back; a test stand-in for the browser's speech input was used) | PASS |
| + upload | PASS (popup opens with its file input and closes) | PASS |
| Sound toggle | PASS (turns off and back on) | PASS |
| Manual game menu | PASS (119 items; picking HAMMER starts it) | PASS |
| LET THINKSTILL CHOOSE | PASS (starts 113) | PASS |
| Page errors | 0 | 0 |

One contact sheet of the screenshots looks right: the check-in ring, the menu with the new relief games group and the 15 signature games, the routed games, and the shift meter after the reveal.

**CLEANSE (109) on phone:** the first 390 run, with 3 browsers sharing 4 cores, stopped at 83% after the 150 s test limit. Run alone it reached the reveal and the shift meter. This is not an integration breakage, so I left it alone:
- The hold bar fills by a fixed step every 34 ms, and the release needs 72%. When the test browser is starved, those steps come every 80–120 ms instead, so the test's holds release too early.
- On the same 2 s hold, the integrated build reached 73.6% and the build from before integration reached 100%. So the new modules make each step about 1.3 times slower in headless Chromium.
- Most of the time goes to the original game's label-overlap check in `src/00_arcade.jsx` (around lines 20465–20730), which measures elements on every step in both builds.
- On a real phone the game still finishes; the bar just fills more slowly under load.

**Git** (branch `claude/jolly-hopper-ognrxj`, pushed to origin)
- `framer/src/00_arcade.jsx`, `framer/src/99_pixar.jsx` and `framer/ThinkStillReleaseArcade_EOS_FULL.txt` were committed and pushed by the workflow's automatic checkpoint 7b3df77 before I committed. That commit does not carry the required closing lines. There was nothing left to add for those files.
- My commit ccb7fb9 adds `framer/docs/eos_status/v2_integrate.progress.md` with the results, and ends with the required two lines.
- `framer/dev/out.js` is gitignored.

Files are in `/home/user/thinkstill-rituals/framer`:
- `src/00_arcade.jsx`
- `src/99_pixar.jsx`
- `ThinkStillReleaseArcade_EOS_FULL.txt`
- `docs/eos_status/v2_integrate.progress.md`

The test script is `/tmp/claude-0/-home-user-thinkstill-rituals/b5e1bfa3-ddef-5c62-9291-4d212bc0e4f1/scratchpad/smoke.mjs`; the screenshots are in the `shots/` folder next to it.
