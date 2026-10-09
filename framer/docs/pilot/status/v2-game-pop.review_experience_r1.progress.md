# v2 POP review (EXPERIENCE lens) round 1 — reviewer progress

## State (call ~12)
- Read: Emotional Shift Standard, §14, F8, builder report v2-game-pop.build.md.
- Built /tmp/pilot_rev_pop_experience OK.
- Emotion comes from text detection (eosCurrentEmotion = store.emotion || detected).
- Test script: scratchpad/revx/play.mjs (W H emotionTag text). Shots: /tmp/revx_shots.
- NEXT: run panic/anger/sad at 390, then 1280; contact sheets; compare BEFORE dev/shots/quality/sheets/1.png.

## State (call ~28)
- Runs done (scratchpad/revx/play.mjs, burst.mjs, zprobe.mjs; shots /tmp/revx_shots): panic390, anger390 (+video, +replay), sad390 (+replay), panic1280, burst pilot vs off 390.
- Viewed 5 images: sheet_panic390, sheet_anger_video, sheet_sad390, BEFORE 1.png, sheet_burst.
- Findings so far: mirror strong for anger/sad, panic sky reads as pleasant day; words chunked into fragments ("racing and","breathe I'm","front of","I miss my");
  sad first frame hero shows "D" monogram placeholder at 250ms; climax pearl/pumps illegible at phone scale, hero small at bottom, sky empty;
  BURST: in pilot the mega burst shows only the card, no visible bloom/nova/hearts vs pilot=off (bright pale still scene washes out burst?) — burst z=2147483500 above arena (not covered); checking blend modes.
  End/reveal orb shows negative (screaming/crying) hero face (shared reveal, out of pilot scope).
- NEXT: burst blend check, 1280 sheet, hero-performance crops, score.

## State (call ~42), 9 images used
- Burst verified intact & on top (z 2147483500 fixed, face nova/hearts/card visible over pilot scene: sheet_blend); bloom (screen white) + light backdrop invisible on the bright still sky -> minor contrast note.
- Hero cold-load: no hero image for first 814 ms; fallback shows text "DROP"/"D" monogram (f8t.mjs) -> major Mirror finding.
- Word chunks: eosPilotWords(entries,6) + stopOnly filter drops "at me in" -> fragments ("front of","everyone and") -> major.
- Hero performance = face swaps on a fixed sprite + transforms; climax pearl ~15px, pumps unreadable at phone scale; 1280 sparse.
- 1280: compact bunch, tiny text, lots of empty sky. Wrapper step toast covers hero/cloud at 390 every pop.
- NEXT: calibrated video of panic run (press stretch + bird surprise), then score + StructuredOutput.

## State (call ~50), 10 images used — DONE, verdict fix
- Calibrated panic video (vid.mjs, sheet_panic_vid.png): cold-load hero monogram "S" + empty inflating bubble at game start; press stretch not perceptible; bird surprise not legible; climax pearl tiny, rainbow+bubble at bottom third.
- Release length: panic first->last press 7.8 s (5 presses, N=6) vs standard 30-90 s.
- Scores A7 B8 C6 D6 E6 F8 G7 H7 I7 J5. Majors: length, climax legibility/WOW, cold-load mirror/F8 empties, word fragments, juice, surprise legibility.
