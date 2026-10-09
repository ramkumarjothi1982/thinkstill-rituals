# v2 gap regressions (R1-R8) progress

- ~25 calls: read GAP_AUDIT R1-R8 + plan row 0. Findings: chime 1175/1568/1976 = mood bloom tones (14_eos_mood ~L1063);
  mood/companion mount only in stage play; mega unmount == onDone == reveal, so the post-burst bloom must be an
  imperative layer on .releaseStage. Finish card (.globalFinishFeedbackCopy) is BASE markup (no EOS rule touches it).
  Test script: scratchpad fp_freeze2.mjs (in-page EOS hide diff at mega +0.6 s).
- ~70 calls: implemented 01_eos_burst.jsx (gate + eosAfterBurst), mood deferral + eosMoodAfterBloom, dots tick/frame/bed
  gating, Still Moment eosStillBreath (no rain), reveal nav hide rules removed (phone nav row above card), SHARE as
  quiet link, header centred (stacked score pill), 105/106 BASE sizes, ZAP glass counter, word-fit + circle-fit.
  R5 compact story strip: check-in panel bottom:42px to make room. Next: verify freeze diff + sound log + 1280.
- ~88 calls: verified R1/R2 (freeze + sound + text scans both sizes), committed c4f9a87, docs updated.
