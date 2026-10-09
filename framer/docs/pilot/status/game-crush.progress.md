# game-crush progress (CRUSH id 2, "The Press")

- [x] Read spec §1, §2 (S0-S6), §3.0, §3.3, §4, §5; systems.done notes; 71_pilot_fx API (Actor, Stage, Finale, Sound, Gesture, Box); POP engine as the pattern; BEFORE sheet 2.
- [ ] Write src/pilot/74_pilot_crush.jsx (EosPilotCrushEngine / EosPilotCrushInner / EOS_PILOT_CRUSH / EOS_PILOT_CRUSH_CSS, eosPilotRegister(2,...))
- [ ] Build /tmp/pilot_crush, play at 390 (scripted + finishGame), 1280; contact sheets
- [ ] Iterate; commit 74_pilot_crush.jsx + status/game-crush.*; push

Design decisions so far:
- Workshop kit's generic press/anvil/shelf/tray props are hidden (stage `hide`); CRUSH draws its own press rig in the play plane, laid out from the S5 play box (fractions per spec §3.3 layout table).
- Per tap: zero React commits. Count/pips/plate/data-eos-n are attribute writes; jaw/blob/shake/goo are WAAPI. One commit per word (round state).
