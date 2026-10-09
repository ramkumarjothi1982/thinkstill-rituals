# v2 CLEANSE review (code lens) round 1 — progress (reviewer, no file edits)
- call ~3: started, build /tmp/pilot_rev_cleanse_code
- call ~16: read 73 fully; 71 finale/gesture/faces/timers; wrapper reward bucket (00_arcade 19864/20118) + wrappedSfx.
  code suspicions: (a) hero onHoldFull sets clear.H before let-go -> pointercancel/Escape after full = onHoldCancel ->
  hero disabled (gone) but st.gone.H unset -> soft-lock (verify via keyboard Enter-hold + Escape); (b) fv final-report
  logic duplicates wrapper rewardSize formula (fragile coupling, works now); (c) exhale cue arcade:"pop" -> wrappedSfx
  triggers step reward each release (explicit game) — builder attributes to progress; (d) words fs=clamp(D*.13,9,15):
  390 -> D112 -> 15px OK, 360 -> 14px; (e) rAF in climax beat not cancelled (harmless).
- call ~33: probes done (scratch rv/ in session scratchpad): f8 390 u0/u1/u3/u6 + 1280 u0: 0 violations (u3=ABCAB, u6=ABCDE: 6th never shown with 4 words);
  f6 390+1280: reached reveal, 0 misses, only 'hold' stage recorded. Own driver rv/rv.mjs (hooks live.current onProgress/onDone via fiber).
  t390 touch run: words 14px (D=108, arena w 360) hero 15px -> BELOW 15px binding; prog 20,40,60,80,83,100 monotonic; onDone x1 @2368;
  climax beat logged 447ms after the input (handler ran late: machine loaded by another agent's chromium, frames med 166ms) -> climaxDt 635;
  0 arena anims during mega, flip 0, 0 snd after handoff, stepAfterT0 0; elementFromPoint hits eosPilotL0m (mega is pointer-events none) -> compare with pilot=off.
- next: contact sheet t390, 1280 mouse, pilot=off 390 (compare), reduced, kbd Escape-after-full soft-lock, touchCancel soft-lock, early hero let-go, soundOff, upload-remove.
- call ~50: m1280 mouse anger run: words 15px; prog monotonic 20..83,100; onDone x1 @2354; climax beat @33ms; 0 arena anims under mega,
  0 snd after handoff, stepAfterT0 0; frames: 1280 headless software raster very slow (med 650ms) -> need pilot=off baseline (running).
  collisions grep: none. code: hold cue tone lasts o.ms=inhale and is never stopped on let-go -> early hero let-go (>=850ms) leaves the
  rising in-breath tone under the climax (and past hand-off when inhale 3400 i.e. N>=7). __f8ClearUploads not defined anywhere -> driver
  removes uploads via 'Add images' popup .releaseUploadRemove.
- running bg: off1280, esc390 (kbd Escape after full on hero), tc390 (touchCancel after full on hero).
- call ~60: BLOCKER confirmed: hero onHoldFull -> setClear(H) -> button disabled (gone=clear[key]) while still held.
  kbd390 (Enter hold to full, keyup): keyup never reaches the disabled hero -> prog stuck 80, no onDone, no reveal.
  esc390 (Escape after full) same (hold stays "H"). tc390 (touchCancel after full): onHoldCancel clears st.hold but hero stays
  isClear+disabled, next=H -> stuck forever. Mouse/touch normal let-go works (t390, m1280).
  off1280 frames med 650 (same as pilot 650) -> 1280 headless perf is environment-bound; 390: pilot med 150-167 vs off ? (not computed).
- next: reduced 390, early-let-go many-words (hold tone tail), uploads3+remove, 1280 touch, sound off; then verdict.
- call ~66: red390 handoff 903 ok; early390 (N=6, hero let-go at 950ms): hold tone scheduled T0-1014 for 3350ms -> runs to T0+2336 (past
  settleAt 2208, 18ms before handoff; N>=7 -> past handoff). up390: 3 uploads ABCAB; removal mid-run -> wrapper resets the game, defaults
  tsFaceNeg restored. t1280 touch: climax beat ran 1417ms after input (all early beats bunched) - load; climax start <=300 in 3/8 runs.
  snd390: sound toggle off -> all climax rows muted. skip390: skip at ~1026 -> settle 1048 handoff 1106, 0 anims under mega, 0 snd.
  exhale stage: marker "BREATHE OUT…" set (data-eos-idle=10000) but arrow NOT visible within 2s in 5/5 exhales (builder claims it shows).
- call ~70: off390b frames med 233 (pilot 150-183 same load) -> perf env-bound. murk390: murk visibility:hidden at +120ms after let-go
  for word orb 0 and hero H (isClear set in same handler / at full) while its exit anim runs -> pour-out + climax silver plume invisible.
  murk390 climax beat 13ms, first rAF 49ms.
- VERDICT: fix. blocker = hero soft-lock (kbd / pointercancel / Escape after full). major = words 14px@390; murk exit + climax silver
  breath invisible. minor = hold-tone tail under climax, climax-start not robust under load (bunched beats), exhale arrow never visible
  (idle 10000), 83-not-96 coupling to wrapper formula, step-toast attribution (sfx pop), 6th upload unused, perf notes.
