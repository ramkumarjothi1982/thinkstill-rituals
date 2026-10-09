# v2 CRUSH review (code lens) round 1 — progress (reviewer, no file edits)
- call ~5: started; build /tmp/pilot_rev_crush_code; scratch dir rvc/ in session scratchpad (reuse rv/rv.mjs driver from CLEANSE review)
- call ~25: read 74 fully + 71 finale/freeze/sound-later. Driver rvc/rc.mjs (scratchpad). Probes: f8 390 u0/u1/u3 + 1280 u0: 0 violations
  (only 1 host visible at start; uploads -> UPLOAD pic); f6 390+1280: reveal, 0 misses (taps + holdRelease stages).
  t390 touch anger: words 15px D150 text below+inside, faces neg->pos; prog 20,40,60,80,83,100; onDone x1 @2257 (bonus 260);
  sfx pop x4 (none on last word); 0 snd after handoff; 0 arena anims during mega; hold=1; settle 2109 handoff 2257 mega 2436;
  arrows: no stray arrows in trans/setup/finale; big arrow at +193ms; round arrows return 1.4-2.0s after round start (shared rule).
  release raced auto-full (hold>1.5s due to 150ms frames) -> rerun with short hold. elementFromPoint during mega hits pilot plane
  (mega pointer-events none) -> compare with pilot=off. frames med 150 (env load). peak anims 77 play / 38 climax.
  code notes: charge cue 900ms tone not stopped at release (tail under climax on quick release).
- call ~45: off390 baseline OK (reveal; frames med 250 vs pilot 150 -> perf env-bound). zc.mjs stacking: mega (fixed z 2147483500) on top at 63/63
  points with pilot and pilot=off (elementFromPoint parity: mega is pointer-events none in both). m1280 mouse hold500: manual release,
  climax beat t=35, climaxDt 1084 (1.1 s frames env), charge tone (900ms) tail to T0+331 under impact. k390 kbd: reveal, climaxDt 113.
  red390: handoff 906, 0 anims. sk390 (touchCancel in charge -> slams, skip tap, sound off): settle 1307 handoff 1320, 0 anims/0 snd after,
  tones muted. up390: 3 uploads -> UPLOAD faces; removal -> game restarts with default neg faces (wrapper). 
  FINDING (major): guide hand drawn at .crMouth centre = on the blob's picture (390: hand (196,450) vs pic centre; 1280: hand (641,450)
  vs pic centre (641,461)) -> covers the player's picture at Mirror and at each round start (F8 full image visible). Crop crops2.png.
  no identifier / keyframe collisions. peak anims 77-98 play, 38-78 climax; non-compositor: pips/embers CSS transitions bg/box-shadow.
- call ~62: rz (resize 1280->1000 mid-game): gallery/shelves follow the new layout, 0 errors. t1280 touch: reveal, onDone x1 2254,
  0 anims/snd under mega; pointerup handler ran 788ms late (466ms frames) -> climax+cube beats bunched (788/791), notch cue after T0.
  fz 1280: settled blob D189, words 15px below+inside pic; hand (641,450) on pic centre (641,461).
- VERDICT: fix. major = guide hand painted on the blob's picture (Mirror + every round start; F8 full image / F1-F6 hand must not cover).
  minor = charge tone not stopped at release (tail under climax), perf (77-98 running anims, bg/box-shadow transitions),
  lastPct coupling to wrapper bucket formula, beat bunching under late handler (real phone check), six-image rule with N=5.
  PASS: onDone once, progress monotonic, settle/handoff 2103-2109/2254-2270, reduced 906, 0 anims/0 pilot sound/0 words under mega,
  mega on top 63/63 (same as pilot=off), no stray arrows, kbd/touchCancel/skip/sound-off OK, pilot=off OK, no collisions, 0 errors.
