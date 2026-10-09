F8 is only partly fixed, so I left it OPEN in the feedback log rather than marking it FIXED. Most games now show a default picture in every bubble, but four games still have empty objects. At desktop size, POP and ZAP showed empty circles in the screenshots. Both commits are pushed to `claude/jolly-hopper-ognrxj` (94445cf with the fix, 0c67214 with the log update).

**What was wrong**
- Games 1–99 run on the older game engine (`GameEngineLegacy`), and it had no default pictures at all. Without uploads, POP, CRACK, STOMP, ZAP, UNHOOK and others showed empty bubbles. Many games' main objects (CRUSH, HAMMER, METEOR and so on) carried the user's words with no picture.
- With uploads, those games drew the photo as a stretched background behind the text, in oval shapes, with the text on top of the picture.
- The six-image rule grouped copies together (2 uploads gave A A A B B B) instead of spreading them.

**What I changed**
- **New shared module `framer/src/eos/16_eos_bubble_face.jsx`**, the one implementation for every game:
  - It picks the pictures. With no uploads it uses the seven characters' expressions, chosen by the user's emotion. Every face starts negative and turns positive as the game's progress bar rises, and all are positive at 100%.
  - Uploads replace the defaults and are spread across the six positions. Removing them brings the defaults back.
  - It draws one face per bubble: a true circle with the full image visible, and the user's text below it inside the bubble. There is no dark mask, and taps pass straight through to the game.
  - It skips the custom approved looks (HOT POTATO, RAIN OUT, GO WEIRD) and bubbles the newer engine already gives a picture.
  - It preloads each game's pictures, both negative and positive.
- **`framer/src/00_arcade.jsx`:** both engines now use the shared face. The upload spread is now A B A B A B, A B C A B C, A B C D A B, A B C D E A, and one each for 6.
- **New test script `framer/dev/f8_probe.mjs`** checks every bubble for: missing picture, not a circle, cropping, text over the picture, text outside the bubble, dark masks, and a happy face at the start.
- No game mechanics or dopamine bursts were changed. While testing I caught one regression I had caused (my styling stacked UNHOOK's bubbles into a column and the game got stuck at 78%). I fixed it, and UNHOOK's layout and completion now match the old build.

**How I verified it**
- **Phone sweep of all 114 games (390x844, no upload):**

  | | Before | After |
  |---|---|---|
  | Games with an empty bubble or object | 29 | 4 |
  | Bubbles with no picture | 98 | 1 |
  | Not a circle | 46 | 7 |
  | Text over the picture | 10 | 6 |
  | Dark mask | 12 | 6 |

  No face was positive at the start.
- **Uploads (POP and UNHOOK):** 1–6 uploads gave AAAAAA, ABABAB, ABCABC, ABCDAB, ABCDEA, ABCDEF. Upload then remove brought the defaults back.
- **Played to the finale at 390x844 and 1280x860:** POP, CRUSH, ZAP, LASER SLICE, UNHOOK, DRAMA MACHINE and COOL THE VOLCANO all reached the end screen at both sizes with no errors. Faces went from negative to positive as the bar rose.
- Screenshots and sweep data are in `framer/docs/founder/`: `fix_F8_before_390.png`, `fix_F8_before_1280.png`, `fix_F8_after_390.png`, `fix_F8_after_1280.png`, `fix_F8_uploads_390.png`, and `fix_F8_sweep_before_390.json` / `fix_F8_sweep_after_390.json`.

**Still open (written into FEEDBACK_LOG.md)**
- 18 BURN, 38 DRAWER, 49 UNZIP and 111 BIG SIGH still show words without a picture.
- In the 1280x860 screenshots, POP and ZAP faces appear as empty circles even though the page reports the image as loaded. They show correctly at 390, and LASER and UNHOOK show correctly at 1280. I don't know the cause yet, so this needs checking in a real desktop browser.
- I did not run the full 1280 sweep or the 12-game sample with 2–5 uploads.
- The remaining circle, text-position and dark-mask problems sit inside games' own designs and were not traced.

The two remaining tasks were too big for this pass, so they're logged as next steps.

Progress notes are in `framer/docs/eos_status/v2_f8.progress.md`.
