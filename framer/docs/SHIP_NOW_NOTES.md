# ThinkStill Release — ship-now build (10 Oct 2026)

**File:** `framer/ThinkStillReleaseArcade_EOS_FULL.txt`. This is the whole app in one Framer code component: 47,506 lines, 2.9 MB.

It is the current state of the v1 work, built at the founder's request before v1 was finished. Everything listed under "Not in this build yet" below is still to come in v1.

> **Update (10 Oct) — USE ONE FILE: `framer/ThinkStillRelease_FRAMER.txt` (808 KB).** Framer allows at most 1 MB (1,048,576 bytes) per code file and the app is 1.75 MB even compiled, so this single file stores the whole app compressed (deflate + base64) and unpacks it when the component loads (synchronously, with fflate, then `new Function`). It exports one real component, `ThinkStillRelease`, with all 23 property controls. Same app as the earlier ship-now build.
> Checked here: the file loads in Node (Framer's server-side render path) with the default export and 23 controls; 10 key games (POP, CRUSH, CRACK, ZAP, UNHOOK, UNFOLLOW, HOT POTATO, CLEANSE, RAIN OUT, BIG SIGH) play to the end at 390x844 and 5 at 1280x860, 0 page errors. Rebuild with `node dev/framer_single.mjs`.
>
> **Paste steps:** (1) delete the old code file(s) and their component on the canvas, then **reload the Framer tab**; (2) Assets → Code → **+** → New Code File, name it `ThinkStillRelease`; (3) select all, delete, paste the **whole** file, save; (4) drag **ThinkStillRelease** onto the page, full width and height, keep *Show game menu* off. If the component shows "ThinkStill could not start: …", send that message (it would mean the browser blocked unpacking).
>
> Older deliverables (kept only for reference): `ThinkStillReleaseArcade_EOS_FULL.txt` (2.9 MB, over the limit), `ThinkStillReleaseArcade_FRAMER_SAFE.txt` (1.7 MB, over the limit), `framer_files/` (the four-file split).

## How to put it in Framer
1. In Framer go to **Assets → Code → "+" → New Code File**. Name it `ThinkStillReleaseArcade`.
2. Select everything in the new file. Delete it, then paste the **entire** contents of the .txt and save.
3. Drag the component onto your page. Make it fill the frame: full width and full height, phone first.
4. **Property controls** (right panel):
   - Show game menu: owner/testing only, keep it **off** for users.
   - Emotion Check-in.
   - Support Lines, Support Link, Emergency Line: your crisis text.
   - Share Link.
   - The Pixar look: Light, Warmth, Light Follows, Squash & Stretch, Bokeh, Dust Motes.
   - Every original arcade control is kept.
5. Character pictures load from this GitHub repository's `bubble-expressions/` folder on `main`, as in the original code. Keep that folder published.

## What is in this build
- **All 114 games:** the 110 originals plus BIG SIGH (panic), COOL THE VOLCANO (anger), GROUND CONTROL (anxiety) and SKY LANTERNS (sad / lonely).
- **ThinkStill picks every release.** The user types or speaks what they feel. There is no game menu, and no game repeats until its group has been played.
- **Frozen games fixed:**
  - All 24 games that used to stall now play to the end on phone and desktop, including UNFOLLOW.
  - CLEANSE's hold now charges correctly on busy phones.
- **Your approved bursts play clean.** No overlays, words or extra chime on top of them, and the end-screen buttons, centred phone header and full-size pictures in games 105/106 are restored.
- **Guide arrows:**
  - On the phone, every stage showed its arrow in the 94 games tested (183 of 183 stages).
  - Returning players keep their arrow, and it comes back after 2.2 s of idling.
  - The hand points at the real option, never at the gap between two.
- **Bubble pictures:** one shared standard for every game.
  - **Pictures:** a character picture appears in every bubble when nothing is uploaded, true circles, no zoom or crop, and no black masks. A build check stops dark masks from coming back.
  - **Words:** below the picture, inside the bubble, at 15 px. The bubble grows rather than shrinking the text.
  - **Uploads:** spread evenly (1 photo appears 6 times, 2 alternate ABABAB, and so on). The upload pop-up sits right above **+**, closes properly and says "MAX 6".
- **UNHOOK:** three bubbles on real strings from one steel hook.
- **ZAP:** a real handheld zapper and the angry RUSH helper. Each bolt flies from the zapper's tip into the bubble, and faces go from scared to shocked to happy.
- **No more overlap:** the LIVE GUIDE has its own band, so it no longer covers buttons (e.g. VACUUM).
- **Earlier work, all still included:**
  - readable text and the gathering background dots;
  - the calm colour shift and the "how do you feel now" shift meter;
  - rewards, and the safety card for self-harm words.

## Not in this build yet (known issues, honestly)
- **CRACK** still has no real spanner, and **STOMP** no real boot. **CRUSH** does not yet squash with each press, and other tools still look generic.
- **Picture and text fit on phones (F10):**
  - Crowded rows of six small bubbles (ERASE, BIN, JUGGLE, STOMP) still show text at 12-14 px and small pictures. JUGGLE can cut "deadline pan…".
  - POP's 6th bubble is clipped at the right edge.
  - POP and CLEANSE show an extra name label when photos are uploaded.
  - In HOT POTATO the words sit over the picture.
  - Some bubbles still clip their text.
- **Named game fixes still to do:**
  - VACUUM: one column, with objects travelling into the nozzle.
  - MAGIC TRAPDOOR: a real door.
  - RAIN OUT: full washout.
  - SHRED: strips.
  - BIN: completes on desktop.
  - JUGGLE: your exact how-to words.
  - VOLUME KNOB: grip.
  - X-RAY: the "KILL / BURN ALL" label.
  - 103: the Activate tool.
  - FLUSH, MELT vs BURN, TAP OUT, SCRATCH.
- **First screen:** it does not yet read "What emotion are you carrying?" / "Your thoughts are materialised to be released.". The check-in is still on by default; you can switch it off with the **Emotion Check-in** control.
- **End screen and toast:** the end-screen buttons are not yet labelled Next / Again / New thought. The feedback toast is not yet pinned bottom-right.
- **Safety:** threats against other people ("I want to hurt my boss John") are not yet caught. Self-harm words are caught.
- **Finale timing:** on some games the approved burst starts 0.5-5.5 s after the last tap.
- **Testing:**
  - This exact build has not had the full all-114 sweep at both sizes. Key games were played to the end before shipping (see below).
  - Nothing has been tested on a real phone, and sound was not heard: the cloud browser has no speakers.
- **Out of v1 by your decision:** a unique climax per game, and the from-scratch redesign (Pilot A is saved separately).

## Pre-ship check of this exact file
See `docs/SHIP_NOW_SMOKE.txt`. Key games were played to the end at phone (390×844) and desktop (1280×860) size: POP, CRUSH, CRACK, ZAP, UNHOOK, UNFOLLOW, HOT POTATO, CLEANSE, RAIN OUT and BIG SIGH. It also records the page error count.
