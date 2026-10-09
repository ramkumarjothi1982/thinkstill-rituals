# Pilot A eng critique — progress (critic, eng)
- [x] read PILOT_A_SPEC.md fully; pilot_build HOOK (routers are hook-free → early return safe)
- [x] wrappers: ep rebuilt every render (callbacks unstable); legacy+new audit MO (childList/subtree/characterData; new also attr src) tags .tsExactUserText; root unmounts engine at reveal (stage switch) → tableau never visible under reveal card
- [x] arrows: marker label key is `label` (data-eos-label) NOT `L`; fallback list; dead regex; disabled check
- [x] eosTone: ctx.currentTime+at, no latency comp; eosAudio resume async; 2 AudioContexts (arcade+eos)
- [x] reduced = framer useReducedMotion (OS only); in-app calm = data-eos-calm on root
- [x] SHORT_HINT read at call time by shortHint(); wrapper computes guide text BEFORE router renders → apply hints at module top-level
- next: eos_drive finishGame hold/taps, face URLs/sizes, mood avoid, write PILOT_A_CRITIQUE_eng.md
- [x] (call ~50) wrote docs/pilot/PILOT_A_CRITIQUE_eng.md: E1-E9 blockers, E10-E17 perf/sound, E18-E30 robustness; no browser run needed (pre-build review, no pilot code yet)
