# Founder gameplay feedback log (highest priority — fix before AI-review findings)

Each item: status OPEN / FIXED (commit) / NEEDS-APPROVAL. Fixers must verify by playing the game at 390x844 first, then 1280x860, and attach before/after screenshots.

## F1 · UNHOOK (id 41) — OPEN · reported 2026-10-09 on the hosted preview (phone)
Screenshot: docs/founder/feedback_unhook_2026-10-09.png
- **Founder:** "unhook doesn't even look attached to the bubbles."
- **Observed:** the strings are diagonal lines that cross the stage and end nowhere near the bubbles; the big hook is not visible on the phone; the bubbles show only a word + "3 STRINGS HOLDING" with no character picture; the guide hand/arrow covers the bubble text.
- **Likely cause:** the cords are drawn in the hook SVG's own coordinate system while the bubbles are laid out separately in HTML (.unhookBubbleField), so on a phone the cord ends do not land on the bubbles; the hook sits off-screen on the left.
- **Required (founder Part 13.20 + bubble rules):** ONE large, clearly visible, realistic hook; THREE strings per bubble that visibly run from the hook to the bubble and attach to it (measured positions, recomputed on resize/layout); each tap visibly snaps one string with a physical reaction (recoil, swing, sound); the bubble floats free when its last string snaps; character picture in each bubble with the user's text BELOW the picture INSIDE the bubble; no black masks; guide hand must not cover the bubble text; the existing finale stays (lag fixes only) unless it is a shared generic burst, in which case UNHOOK gets its own "dramatic separation" finale; tools must look real (the hook is a real metal hook).
- **Test:** play to the end at 390x844 and 1280x860; screenshots at start, after each snap, finale; strings must touch the bubbles in every frame.
