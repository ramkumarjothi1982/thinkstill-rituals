F1 (UNHOOK, id 41) is fixed, played to the finale at 390x844 and then 1280x860, and pushed to `claude/jolly-hopper-ognrxj`. The fix is commit 870bdfe (source, rebuilt .txt, screenshots); the log update is commit 8c402aa.

**What was wrong**
- **Strings not attached:** the strings were drawn on a full-stage SVG that was stretched to fit the stage, while the bubbles were laid out separately in HTML. On a phone the string ends crossed the stage and stopped short of, or past, their bubbles.
- **Hook:** it was a flat white J squashed to the stage's shape, not a real hook, with a vertical "BIG HOOK" label.
- **Old mechanic:** 6 bubbles with 3 strings each, 18 taps in total. Founder decision C11 replaced this with 3 bubbles, each on its own string from one hook.
- **Guide hand:** it sat on the bubble and covered its text.

**What I changed**
- **Game rewrite:** `UnhookLiteralEngine` in `src/00_arcade.jsx` now turns the user's words into 3 bubbles, in the user's order, even when the input has been repeated to fill six slots.
- **Hook:** one large steel hook at top centre, drawn to scale with a chain, eye, shank, bend, point, barb and twine wraps. It is fully on screen: 149x205 px on phone, 177x243 on desktop.
- **Strings:** every frame, each string is drawn from the measured tie point on the hook to a brass ring on its bubble's live edge. It stays attached through resizing, the bubbles' bob and the hook's swing.
- **Snap:** tapping the string's grip, the string or the bubble snaps it:
  - the top half whips back to a frayed stub on the hook, with a flash at the break;
  - the hook recoils and swings, and the other bubbles jolt;
  - pop/win sound and vibration play;
  - the freed bubble floats out the top with its cut string trailing beside it, not across the picture or words.
- **Bubbles:** each shows the character picture with the user's text below it, inside the bubble, through the shared bubble-picture component. The bubbles sit above the status line.
- **Guide and copy:** the guide arrow is now "SNAP THE STRING" and points at a grip on the string above the bubble. I updated the game card text, the guide line in `60_eos_fixes.jsx`, the arrows table in `30_eos_arrows.jsx` and the matching rows in `docs/EOS_SPEC.md`.
- **Unchanged:** the reveal, burst, progress, sound and navigation. The burst after the last bubble is the approved one. UNHOOK's own "dramatic separation" moment before the burst stays with F7, which needs founder approval.

**How I verified**
- **Play-through:** a scripted play at 390x844, then 1280x860, with screenshots at the start, at each snap, mid-float and at the finale. Both reach the reveal in 3 taps with 0 errors.
- **Attachment, every frame:**
  - a string's end is never more than 3.0 px from its own bubble's edge (the ring sits 2 px inside by design);
  - its start is within 1.5 px of the hook;
  - a snapped string's trailing piece stays within 3.0 px of its floating bubble.
- **Automated runs:** the standard test player finishes UNHOOK in 3 taps at both sizes, and also with reduced motion and a one-word input. The arrow is visible with the right label each time.
- **Guide hand:** it covers 0 px² of bubble text at every step on both sizes. It slightly overlaps one bubble's picture (680 px²) only at the last step on desktop.
- **Overlap check:** the existing F2 check for controls covered by other panels finds 0 issues on UNHOOK at both sizes.
- **Before screenshots:** I took these from a clean copy of the previous commit. An older copy I first used turned out to be stale and was discarded.

In the desktop screenshots, the remaining bubbles' faces briefly show as empty rings right after a snap. This comes from the shared picture swap that is still open under F8, not from this fix.

Files are in `/home/user/thinkstill-rituals/framer/`:
- `src/00_arcade.jsx`
- `src/eos/30_eos_arrows.jsx`
- `src/eos/60_eos_fixes.jsx`
- `docs/EOS_SPEC.md`
- `ThinkStillReleaseArcade_EOS_FULL.txt`
- `docs/founder/fix_F1_before_390.png`
- `docs/founder/fix_F1_before_1280.png`
- `docs/founder/fix_F1_after_390.png`
- `docs/founder/fix_F1_after_1280.png`
- `docs/founder/FEEDBACK_LOG.md` (F1 is now FIXED (870bdfe) with a verification note)
- `docs/eos_status/v2_f1.progress.md`
