# Test status — the 12 known failures

`npm test` (guard, unit, parity, property) does **not** fully pass on this branch. Twelve tests fail,
always the same twelve, and none of them is caused by the "Feel Something?" sample work (v1, v2, v3).
They are listed here so the suite is never reported as green when it is not.

Last run: 2026-10-15, branch `claude/feel-something-v3`, `node cli/hm.mjs test guard unit` →
**535 tests, 522 pass, 12 fail** (1 more is the summary line). Parity and property: see the v3 review
(`output/feel-something-v3/qa/tests.txt`).

## 1. Composer work in progress — 7 tests (pre-existing; not fixed here)

| file | test |
| --- | --- |
| `tests/unit/composer-personality.test.mjs` | a different performer is transformed: amplitude, tempo and lag, with the impact still landing by 1.0 s |
| | the eye gate: closed-eye Mallows open only when intensity × opening reaches the gate |
| | intents expand through the pack, falling back to the app presets through the adapter |
| `tests/unit/composer-poses.test.mjs` | compatibility: a pose flows into itself; an awake pose does not flow into the painted cover |
| | the composer inserts a bridge between mismatching moves, inside the gap only |
| `tests/unit/composer-validate.test.mjs` | the golden T01 direction passes G-DIR in well under 3 s |
| | poses: a direction whose span moves mismatch with no bridge recorded is flagged pose:mismatch |

**Evidence it predates this work:** the same 7 fail, with the same messages, on the base commit
`7e786dc` ("M0 follow-up (in progress) … FU-4/FU-5 underway") in a clean worktree
(`node --test tests/unit/composer-{personality,poses,validate}.test.mjs` → 28 pass, 7 fail).
The commit message itself marks FU-4/FU-5 as unfinished; these tests describe that unfinished
composer behaviour (pose bridges, personality transforms, the eye gate).

**Why not fixed here:** they belong to the generator (Phase 2 composer), which the owner has said not
to build until the sample is approved. Fixing them means finishing FU-4/FU-5, a separate work package.

## 2. Frozen v2 artefacts that a fresh clone does not have — 4 tests (environmental)

| file | test |
| --- | --- |
| `tests/guard/frozen-hashes.test.mjs` | every frozen v2 file matches its recorded sha256; none added, none missing (ignored files included) |
| | the check is sensitive: a tampered manifest is reported as changed / missing / added |
| `tests/guard/no-outside-writes.test.mjs` | the frozen render cannot overwrite the approved output from inside the jail |
| `tests/unit/farm-worker.test.mjs` | hm render: options parse; --list shows the registered directions; hm status runs |

All four stop at the same precondition: `hm render: the frozen v2 changed: missing (3):
output/v2/my-brain-at-2am-v2.video.mp4, output/v2/render.log, output/v2/test.wav`. Those three files
are git-ignored render outputs of the frozen "My Brain at 2 AM" film; their hashes are recorded in the
manifest, but the files only exist on the machine that rendered them. A cloud checkout never has them.

**Why not fixed here:** the files must not be fabricated, and re-rendering the frozen film to recreate
them would be touching frozen output. The fix is operational: run these tests on the machine that holds
the approved outputs, or have the owner restore the three files from that machine.

## 3. Machine-specific write audit — 1 test (environmental)

| file | test |
| --- | --- |
| `tests/guard/no-outside-writes.test.mjs` | nothing on this machine was written or deleted outside the studio and WORK since the baseline, and the git config is unchanged |

The committed baseline (`render/lib/write-audit.mjs`) lists the original workstation's files and git
config (2026-10-14). On any other machine (this cloud container included) everything outside the studio
looks "changed". The audit's own sensitivity tests (miniature machine) pass.

**Why not fixed here:** re-arming the baseline on a throwaway container would make the check meaningless
on the real workstation. Re-arm it on the machine where the guard is meant to protect.

## What the sample work adds to the suite

Nothing fails because of v1, v2 or v3. The approved audio parity test (`tests/parity/audio-score.test.mjs`,
the --compat v2-score render must hash to the approved soundtrack) passes; the v1 score re-renders
byte-identical; v2 frames re-render pixel-identical after the v3 engine additions (checked in the v3 QA).
