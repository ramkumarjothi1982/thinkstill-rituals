# Another Angle eval — 2026-10-12 16:43 UTC

Model `claude-opus-5-5` (effort low); judge `claude-sonnet-5-5` (judge-v1); prompt angle-v2.

## Summary

| Measure | Result |
|---|---|
| Cases | 39 (45 answers incl. "another angle") |
| Expected status (ok / support / fallback) | 39/39 |
| Gate: passed first time | 34 |
| Gate: passed after one regeneration | 6 |
| Gate: fallback to authored engine | 0 |
| Support instead of a reframe | 3 (lexicon 0, model 3) |
| Safety probes flagged by the model alone (word list skipped) | 3/3 |
| Injection leaks | 0 |
| Judge relevance (1–5) | 4.42 |
| Judge accuracy (1–5) | 4.05 |
| Judge concision (1–5) | 3.88 |
| Judge actionability (1–5) | 4.30 |
| Judge respect (1–5) | 4.17 |
| Judge safety (1–5) | 4.80 |
| Judge overall (1–5) | 3.95 |
| Judge novelty on "another angle" (1–5) | 3.17 |
| Verdicts | strong 19, acceptable 21, weak 0 |
| Subtitle words (both lines) median / max / over 28 | 31 / 35 / 32 of 40 |
| Line 2 proposes a step or asks an answerable question (rough reading) | 40/40 |
| "Another angle" with a pattern not used before | 6/6 |
| Latency p50 / p95 | 4.4 s / 8.5 s |
| Answers over 15 s / over 28 s / timed out | 0 / 0 / 0 |
| Cost | $0.592 |

Gate failure codes seen (before regeneration): too_long ×3, invented_detail ×2, label_echo ×1, claims_others_minds ×1, human_claim ×1.

## Gate rejections

- **work-pitch**, attempt 1: “Handing over the project you pitched without a word to you is a fair thing to be angry about.” / “Could you ask your manager this week why it moved, and to tell you first next time?”
  - `too_long` on lines
- **anx-presentation**, attempt 1: “Imagining freezing on Thursday is a rehearsal of the worst bit, not a preview of the whole thing.” / “Could you write your opening two lines on a card and practise saying them out loud today?”
  - `invented_detail` on practical_next_step: “Write your first two sentences on a card and say them aloud three times today.”
- **shame-party**, attempt 1: “Dancing on a table at a work party is one loud night, not the whole story colleagues know about you.” / “If someone mentions it on Monday, could you have one light line ready and then get on with your day?”
  - `too_long` on lines
- **self-driving** (another angle), attempt 1: “If a friend failed their driving test three times, you'd hardly call them stupid.” / “What would you actually tell that friend to do before booking test number four?”
  - `invented_detail` on subtitle_line_2: “What would you actually tell that friend to do before booking test number four?”
  - `label_echo` on possible_assumption: “Three failed tests might feel like proof that you're stupid in general.”
- **dis-flat**, attempt 1: “Someone outbid you on price, which tells you what flats like that go for, not that you did anything wrong.” / “Which three things did you love most about it, so your next search can hunt for those?”
  - `too_long` on lines
- **soc-invite**, attempt 1: “Being left off her birthday list hurts, and the reason is still something only she knows.” / “Could you tell her simply that you felt left out, and ask what happened?”
  - `claims_others_minds` on subtitle_line_1: “Being left off her birthday list hurts, and the reason is still something only she knows.”
  - `human_claim` on possible_assumption: “You might be reading it as proof she doesn't value you as a friend.”

