# game-pop progress (POP id 1, "Balloon Morning")

- [x] Read spec §0-§2, §3.0-3.1, §4-5; systems.done notes; 71_pilot_fx API (Actor, Stage, Finale, Sound, Gesture, Box); 79 demo; BEFORE sheet 1.
- [ ] Write src/pilot/72_pilot_pop.jsx (EosPilotPopEngine / EosPilotPopInner / EOS_PILOT_POP / EOS_PILOT_POP_CSS, eosPilotRegister(1,...))
- [ ] Build /tmp/pilot_pop, play at 390 (scripted + finishGame), 1280; contact sheets
- [ ] Iterate; commit 72_pilot_pop.jsx + status/game-pop.*; push

Design decisions so far:
- Bubble = button (position via `translate`, CSS transition for the 600 ms re-balance) > sway node (CSS loop rotating about the hero's hand point, so the tether end stays on the hand) > swing node (WAAPI neighbour swings / miss wobble, same origin) > tether (anchored at the hand, rotated toward the bubble base) + film body + iridescent rim + word.
- Per-hit text (counter pill) is an attribute shown by ::after.
- Pop FX pools owned by POP: 2 rings, 4 glyph shards, 8 hanging droplets, 3 glints; droplets from the sky kit pool (16).
