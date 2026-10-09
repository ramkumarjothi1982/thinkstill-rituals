The round-3 fixes for the readability piece are pushed to `claude/jolly-hopper-ognrxj` (head 70e71f9). I fixed the major and three minors, left two minors unchanged with reasons, and fixed one extra word-break I found while testing. The integrated test build `/tmp/v2_readability` ran with zero page errors throughout.

The orchestrator's automatic "WIP: release v2 / audit checkpoint" commits (7d7d3c1, 2d4ba97, c76e79c, 69b4065) picked up my changes to `src/eos/10_eos_readability.jsx` and `readability.build.md` before I committed. My own commit, 70e71f9, therefore only adds the last line of the progress note. I checked that the final code and the round-3 notes are on the remote branch.

One line per finding:

- **MAJOR, the user's words flipped between two sizes forever (VACUUM 23, RED LIGHT 64, TINY SOUNDTRACK 106):** fixed. The word fit now only looks past a parent box whose width comes from its text, so a box with a set width or one that fills its parent is treated as the real limit. A word that was sized down and now exactly fills its box keeps that size, so later passes no longer push it back up. Verified:
  - The reviewer's 115 px test case now holds 15.08 on all 8 passes in all four layouts.
  - The flip sweep over games 1-110 found 0 flipping elements at 390 (run twice) and at 1280.
  - MICROSCOPE 58 has one font size per word (15.25 at 390, 16.25 at 1280) and never grows back while shrinking.
  - VACUUM, RED LIGHT and TINY SOUNDTRACK all finish at 390 and 1280.
- **EXTRA, TINY SOUNDTRACK at 390 broke "meetin|g" inside the word:** fixed. A screenshot showed it in a 53 px column. On phones the word now also uses the space under the 26 px avatar badge (84 px), and the fit counts that extra width. Verified: every word holds 16.25 px with no further size changes over 8 s, the screenshot reads cleanly, and the game finishes at 390.
- **MINOR, the pop on the narrowed meter's pills was dead CSS:** fixed with a more specific selector. Verified at 390: on DRAMA 105 and RAIN OUT 110 the pills now run both the fade and the pop. With reduced motion they only fade.
- **MINOR, the band faded out before the TOKENS/CHAIN pills:** fixed. The band now has its own timing (1.75 s and 2.75 s) and stays until the pills are gone. Verified in normal and reduced motion: whenever a pill was visible, the band was fully shown.
- **MINOR, TOKENS and CHAIN overlapped during the pop:** fixed. Each pill now grows away from the gap between them. Verified: the 4 px gap held during the pop on FINGER TRAP 102 and DRAMA 105.
- **MINOR, the hit headline read 7.7-8.9 px:** not changed; it is a test-machine artifact. The arcade's 780 ms entrance starts small and blurred and is under 12 px for only about 20-30 ms (1-2 frames). Changing it would alter an existing animation, which the owner policy forbids. My frame trace got only 29 frames in about 35 s on the loaded machine, which is why it looked held.
- **MINOR (optional), text floored in stages at play start on desktop:** not changed. It was seen only on a heavily loaded machine and not on phone, and fixing it would mean reworking the core pass loop.

One sweep run hit a 30 s click timeout while starting game 106. Re-running games 105-107 was clean, and 106 also finished full plays at both sizes, so I treated it as machine load.

Files are in `/home/user/thinkstill-rituals/framer`:
- src/eos/10_eos_readability.jsx
- docs/eos_status/readability.build.md
- docs/eos_status/v2_readability.progress.md
