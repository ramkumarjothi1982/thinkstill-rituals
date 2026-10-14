# M0 gate: the v2 score with the documented fixes (WP-04)

An A/B listening pass on the approved v2 score ("My Brain at 2 AM") against the
generic score (`audio/score.mjs`). Each fix lands on its own, so each one is heard
on its own: every "after" below is the next fix's "before".

The files here are short 16-bit excerpts of the window where a change is audible. The
full-length 24-bit WAVs, with their plans and G-AUDIO reports, are in
`/home/user/hm-work/m0-gate/audio/` (not committed). Every excerpt is cut with ffmpeg
(`EX='-map_metadata -1 -fflags +bitexact -flags:a +bitexact -c:a pcm_s16le'`):

- a window: `ffmpeg -ss <from> -t <length> -i <full.wav> $EX <excerpt.wav>`;
- the loop seam (the last second, then the first, as a platform loop plays them):
  `ffmpeg -i <full.wav> -filter_complex "[0:a]atrim=start=14,asetpts=PTS-STARTPTS[a];[0:a]atrim=end=1,asetpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=0:a=1[o]" -map "[o]" $EX <excerpt.wav>`.

`/home/user/hm-work/m0-gate/audio/make-excerpts.sh` runs exactly these and first shows that the
round-1 excerpts reproduce byte for byte from the full WAVs.

Seam numbers: the **wrap step** is the QA gate's |x[0] − x[N−1]| (`qa/gates/audio.py`, limit −60
dBFS), read on the AAC as the MP4 delivers it; the **click** is WP-04's discontinuity estimate
(`audio/check.mjs`).

| Stage | Command (from the studio root) | Full WAV sha256 | Wrap step (delivered) | Click (WAV) | G-AUDIO (score side) |
|---|---|---|---|---|---|
| s0 v2 | `node audio/score.mjs output/v2/cues.json s0-v2-compat.wav --compat v2-score` | `cfbf57e5…4187a`, **the approved soundtrack, byte for byte** | −31.3 dBFS | −31.4 | fail (seam) |
| s1 +R10 | `… s1-r10.wav --fixes r10` | `cfbf57e5…4187a` (identical to s0) | −31.3 | −31.4 | fail (seam) |
| s2 +R11 | `… s2-r11.wav --fixes r10,r11` | `eb45dbe5…8fff34` | −31.5 | −31.4 | fail (seam) |
| s3 +swirl at spin_up | `… s3-swirl.wav --fixes r10,r11,swirl` | `f1fcb42f…54d686` | −31.9 | −31.4 | fail (seam) |
| s4 +R7 (the default) | `… s4-r7-default.wav` | `e56a0e11…36a177` | **−63.4** | **−108.7** (−67.4 delivered) | **every check** |

Every stage measures −16.0 LUFS, −2.0 dBTP and LRA 3.3 LU. Round 3 changed s4 only by its splice
(below): rotated back by its 42 samples, s4 equals round 2's (`7f366c08…`) within 1 LSB of 24 bits
(−138.5 dBFS).

## What to listen for

**R10: no fallback times, every cue has a recipe.** On v2's own cue log there is nothing to hear
(s0 = s1). It shows on any other timing, so the pair here is T01 composed at 20 s (the composer's
own variant of the template: thoughts at 3.2, 4.8 and 6.4 s), scored without the fixes and with R10
alone (`… /home/user/hm-work/wp04r3/r10/t01-d20/cues.json r10-d20-before.wav --fixes none` and
`--fixes r10`). Excerpts `r10-before.wav` and `r10-after.wav` cover 2.7–3.7 s. v2's hard-coded
times start the orbit's timeline and its tension hum at 2.9 s and dip the bed at 3.0 s, 300 and
200 ms before the first thought; R10 takes both from the first thought (3.1 s and 3.2 s). The
difference signal is −51 dBFS RMS over 2–3 s and −43 to −18 dBFS over 3–10 s, while the swirl and
hum sound 200 ms apart. (Both renders also carry the same hit-sync moves, below, which this
composition needs whatever the fixes.) R10's other half, refusing a missing cue or a cue without a
recipe instead of a silent default, is in `tests/unit/audio-score.test.mjs`.

**R11: one breath envelope and one pan constant.** Excerpts `r11-before.wav` and `r11-after.wav`
cover 11.6–13.6 s. As the eyes open the body keeps breathing, and now a soft exhale (12.2 s) breathes
with it. v2's score had its own copy of the envelope, and that copy had lost the picture's 0.7 plateau.
The added breath is quiet by design: the difference signal is −46 dBFS RMS over 12–13 s. The whoosh pans
also widen by 420/400 (at most 0.042), which the excerpt does not cover.

**Swirl at spin_up.** Excerpts `swirl-before.wav` and `swirl-after.wav` cover 4.0–6.4 s. Before the
fix, the orbit whooshes murmured from 2.9 s, about 20 dB under the mix (difference −43 to −57 dBFS RMS
per second over 3–6 s). After it, they are silent until the thoughts start to spiral (spin_up, 5.6 s)
and ramp in over 0.5 s. The tension hum is unchanged.

**R7: circular render and its splice.** Excerpts `r7-seam-before.wav` and `r7-seam-after.wav` play
the last second and then the first second. Before the fix, the end dips to 70 % over 80 ms and frame 0
restarts from silence with a 4 ms ramp (a −31 dBFS jump). After it, the score is rendered past the end
and its tail is added onto the start: the last inhale, the reverb and the crickets carry straight
through; the bed crossfades into its own continuation and the limiter is circular. Round 3 adds the
splice (`audio/splice.mjs`): on a continuous loop the gate's wrap step is the waveform's slope where
the loop is cut, so the score shifts its whole mix by 42 samples (0.875 ms) to the flat point nearest
the picture's loop point, where it reads −73.1 dBFS in the WAV and −63.4 delivered through the
loop-aware AAC (`audio/loop-aac.mjs`), click −67.4, A/V offset 0. Nothing in the excerpt changes but
that sub-millisecond shift.

## Other Mallows

**R2: MO-CLOSE on a kit whose accent falls.** Excerpts `close-glitzi-before.wav` and
`close-glitzi-after.wav` cover 12.5–13.7 s of T01 voiced by Glitzi in Static Storm (round 2). Before,
the logo ends on Glitzi's FM zap, which falls from 1827 to 498 Hz. After, the voice is damped over 30
ms where the zap would start, and a two-bell celesta resolution answers, 1661 → 2489 Hz, above
everything since the logo.

**R2: the bed crossfade on an anti-correlated bed.** Excerpts `xfade-pipzi-before.wav` and
`xfade-pipzi-after.wav` cover the first 1.2 s of T01 voiced by Pipzi in Spark Festival (ρ −0.35). Round 1
clamped ρ at 0 and the bed dipped by up to 6.9 dB; the per-block weights hold it within 0.34 dB.

**R3: hits land on their cues.** "Before" is round 2's render of the same voicing, "after" round 3's.
- `hits-glitzi-take-*` (0.2–0.8 s): Glitzi's surprise stutters 130 ms after the eye-pop, louder than
  it, so the take was heard 109 ms late. Now the gesture starts 129 ms early: its glide leads in and the
  stutter lands on the eye-pop.
- `hits-glitzi-logo-*` (12.3–13.3 s): Glitzi's closing phrase rises into the phone band, so its second,
  then its third note was the loud one (91, then 96 ms late). Now the phrase starts 187 ms early and
  its top note lands on the logo, the first two leading in. The celesta resolution answers after the
  sleepy blink's hit window (12.92 s) instead of inside it.
- `phone-zuzu-*` (11.6–12.1 s): the eyes-open celesta pair re-spelled in G is D5–G5, and D5 (587 Hz) is
  below the band a phone plays, so the answer (G5) was heard as the hit, 110 ms late. Now the pair is
  lifted an octave as a unit (D6–G6). Pipzi and Loomi too; Noomi's is v2's G5–C6.
- `phone-loomi-*` (12.5–13.0 s): Loomi's closing phrase (G3, a low bell) lies wholly below the phone
  band. Now MO-CLOSE's celesta doubles its first note two octaves up (784 Hz) on the logo.

Excerpt sha256 (16-bit PCM, 48 kHz stereo):

| File | sha256 |
|---|---|
| r10-before.wav | `dd06a82d023d8221ba36b0b6bd0740da73d8d08f352e51bff4221dcf7a042e2b` |
| r10-after.wav | `eabfef42fc675e0b73059d223a223abb929d6c5a7d87df5e2135092b6254d1b2` |
| r11-before.wav | `c288af88009cc7d6b971b60dfe24717842a64223e78408b5a67636d4c5564c69` |
| r11-after.wav | `0424218e7564ae0642d327b3fa05c27de9a0c1ab6b7523f519aebd0349fe0cde` |
| swirl-before.wav | `322bc10025a7a3af871940173c4c69a54caa67123d54d53c5e6a7ef062b5dfd1` |
| swirl-after.wav | `9dbfa032f0ebcf1f5c8597b3e774d807313688ff64efd4ad50aac88fa64ad4ac` |
| r7-seam-before.wav | `2433f339cec8c34fa1a59bcb01328ba52fdc743824b60b777c94bb66885283e0` |
| r7-seam-after.wav | `fda687564ce950d925f808d1ed383099a1c2b1e210c3e5f38f17ff2e5c3c257b` |
| close-glitzi-before.wav | `e041262f4af7f6d12e43ea255576dc62e8fe925a6082001ecb7e4f128cb1abbc` |
| close-glitzi-after.wav | `4d9c8a4bb7c0819ed1cef72ba7bc667b9527acbc5ce4931923cc4355ec7afce0` |
| xfade-pipzi-before.wav | `a1c898fa7875ebd9d5593a59746b309fa98aac0e39f8f41ba163f72616ef42fe` |
| xfade-pipzi-after.wav | `470e26abcdc50735eea07726e5cffd8b2b0e5c989ca2ab980064c2dc99a5c5c5` |
| hits-glitzi-take-before.wav | `f801060360c82e0b08af6774a30d2a74468751e4528348e36e41671fd05be252` |
| hits-glitzi-take-after.wav | `322db0412dc80402dc1fcff548849d60fd5162f7e494e8f3acb0d3e802727974` |
| hits-glitzi-logo-before.wav | `c94232b7f8d2fd9827c4d47d2c8c0892a5daef6e32b7d6ae2011a15b56b11853` |
| hits-glitzi-logo-after.wav | `7a18c69347cdc347f59020c7c388476c555a0878ccfb826786ec427293fbb161` |
| phone-zuzu-before.wav | `12d6a9067bd054d96c698447e5833f8c72b1a1b971cdca0dca45be238e458cc5` |
| phone-zuzu-after.wav | `83d29099dfb201afec8a88c19bcd39275545479dc2b5a5726feec3974d19225c` |
| phone-loomi-before.wav | `c9b632079471d760da1f7b47b9ead220435233be1ddff9fa333c9713fed4c82b` |
| phone-loomi-after.wav | `83001ff86bd74f995b7129bd95db9f0f55ac70dab96fae706b249b3aa52dd473` |

Also in `/home/user/hm-work/m0-gate/audio/`: `demo-t01-voiced-as-<mallow>.wav` for all 7 Mallows (round
3): T01's score re-voiced with each Mallow's kit, transposed key and home bed: Glitzi (Bb4 minor
pentatonic, Static Storm), Blubi (F5 major pentatonic, Raindrop Lagoon), Zuzu (G4 Hirajoshi, Spiral
Observatory), Boppo (E major pentatonic, Sunpop Orchard), Pipzi (G major pentatonic, Spark Festival),
Loomi (G major pentatonic, Blue Drift), and Noomi (= s4). The picture is still Noomi's. Each passes
the project's G-AUDIO gate on its delivered MP4 (`/home/user/hm-work/wp04r3/gate/gate-results.json`).
