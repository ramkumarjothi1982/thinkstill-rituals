# Studio conventions (Phase 2)

These are the shared rails every work package builds on. They were set up in WP-00. Change them only through the lead or integrator, because every parallel agent relies on them.

## 1. Locations: `render/lib/paths.mjs`

| Constant | Meaning |
|---|---|
| `STUDIO` | This studio. Resolved from the file itself, so every git worktree gets its own. |
| `REPO` | The repository root (`STUDIO/..`). |
| `HUSHMALLOW` | The live app (`REPO/hushmallow`). **Read-only, always.** Fetch its code as text and patch it in memory. |
| `WORK` | Shared scratch at `/home/user/hm-work` (env `HM_WORK` overrides). It holds large artefacts that are never committed (golden PNGs, segments), plus `WORK/tmp` and `WORK/locks`. |
| `GOLDEN_V2`, `WORK_GOLDEN_V2` | `qa/golden/v2` (small and committed) and `WORK/golden/v2` (large). |

- Tools pass every output path they accept through `assertWritable(p)`. It refuses anything outside `STUDIO` and `WORK`, anything inside the app, and any frozen v2 path.
- Temp files go in `mkWorkTemp(prefix)` under `WORK/tmp`, never the system `/tmp`.

## 2. The frozen v2

These paths are frozen (`paths.FROZEN`):

- `stage/` and `stage2/`
- `videos/my-brain-at-2am-v2.js`
- `audio/soundtrack-v2.mjs` and `audio/soundtrack.mjs`
- `render/render.mjs` and `render/verify.mjs`
- `assets/noomi/` and `output/v2/`

They are hash-locked in `qa/golden/v2/frozen.sha256` and tagged `v2-approved`.

- **Fork or copy; never edit.** WP-01 forks `stage2/` into `engine/`. WP-04 must also fork `audio/soundtrack.mjs`, for example into `audio/score.mjs` plus a shared module, even though the plan lists the file as edited (see `docs/wp/WP-00.md`).
- `render/serve.mjs` is not frozen (WP-01 owns it). It must keep exporting `startServer(port)` and `REPO_ROOT`, because the frozen route imports them (`tests/guard/legacy-route.test.mjs`).
- Re-freezing (`node tools/golden/freeze.mjs --force`) needs an owner decision.

## 3. Heavy jobs: `render/lib/heavy-lock.mjs`

The machine has 4 cores and no GPU. Every heavy job runs inside the flock-based lock in `WORK/locks`, which is shared by all worktrees:

| Mode | Use for |
|---|---|
| `--shared` | Render workers and render-based tests. Up to `HM_HEAVY_SLOTS` (default 2) run at once. `--weight N` takes N slots. |
| `--exclusive` | Benchmarks, golden captures and derivations: anything whose timing, or need for the whole machine, matters. It waits for running jobs and blocks new ones. |

```sh
node render/lib/heavy-lock.mjs --exclusive -- node tools/bench.mjs …    # CLI wrapper; exit code passes through
node render/lib/heavy-lock.mjs --shared --weight 2 -- python3 tools/derive/derive_mallow.py …
node render/lib/heavy-lock.mjs --status                                 # or: hm lock status
```

```js
import { withHeavyLock } from '../render/lib/heavy-lock.mjs';
await withHeavyLock({ mode: 'exclusive', label: 'bench final' }, async (lease) => { … });
```

- Waiters are served in arrival order, so an exclusive job can't be starved.
- If a process dies, even with `kill -9`, the kernel releases its lock. There are never stale locks.
- A lease exports `HM_HEAVY_LOCK` to child processes. Nested requests it already covers are no-ops. An uncovered request, such as exclusive inside shared, throws instead of deadlocking.
- Benchmark numbers count only when they were taken under `--exclusive`.
- `npm run render` wraps the legacy route in a shared lock.

## 4. The CLI: `cli/hm.mjs`

Commands are files, so packages add files instead of editing a shared switch. The file name gives the command:

| File | Command |
|---|---|
| `cli/commands/plan.mjs` | `hm plan` |
| `cli/commands/review.import.mjs` | `hm review import` |
| `cli/commands/bench.realm.mjs` | `hm bench realm` (the longest match wins) |

Contract (see `cli/lib/registry.mjs`):

```js
export const summary = 'One line shown by hm help';
export const usage = 'hm review import <decisions.json>';                      // optional
export async function run(args, ctx) { /* return an exit code */ }   // ctx: { name, paths, heavy, log }
```

- A command module does **no work at import**: it imports heavy dependencies inside `run()`. `tests/unit/cli.test.mjs` checks this for every command.
- Run commands with `node cli/hm.mjs …` or `npm run hm -- …`.

Commands since WP-00:

- `hm guard`
- `hm lib validate`
- `hm lock status`
- `hm golden capture`
- `hm golden sequential`
- `hm golden verify`

## 5. Tests: `node:test`, no dependencies

```
tests/unit/         fast, pure (no browser)                      npm run test:unit
tests/guard/        safety rails (frozen, app, wall clock, writes) npm run test:guard
tests/parity/       re-sample in Chromium vs goldens (≈ 20 s)     npm run test:parity
tests/golden/       pixel goldens, heavy (≈ 2 min)                npm run test:golden
tests/property/  tests/smoke/  tests/determinism/                 (from WP-06, WP-24 and WP-26)
npm test            guard + unit + parity: run before handing in any package
```

- Files are named `*.test.mjs`. Tests that render take the heavy lock themselves (shared), so running them directly is safe too.
- Tests never touch the network, the app or the frozen files. Temp directories come from `mkWorkTemp()`.

## 6. Determinism

- `engine/` and `composer/` never call `Math.random`, `Date.now` or `performance.now`. Use the seeded streams and the virtual clock. `tests/guard/no-wallclock.test.mjs` scans both directories, and they are listed in `determinism-scan.DETERMINISTIC_DIRS`.
- The scanner ignores comments and allows assignments, which is how the virtual clock installs itself.
- A real need (for example, the clock keeping the real timer for profiling) is opted out per line with `// hm-allow-wallclock: <reason>`. Every opt-out is listed in the test output.

## 7. Goldens: `qa/golden/v2/`

What is there:

- `state.ndjson.gz`: 2,441 state rows, plus 5 rows for the 0.98 s golden.
- `mesh-hashes.json`, `subframes.json`, `cues.json`, `curves.json` and `plan-v2.json`.
- `frames.sha256`: hashes of the 16 PNGs in `WORK/golden/v2/frames`.
- `determinism.json` and `manifest.json` (provenance, tolerances, per-frame RGBA hashes and PSNR against the approved MP4).

How to use them:

- `tools/golden/compare.mjs` provides `loadGoldenV2()`, `compareStates()` and `compareDeep()`. `tools/golden/v2-harness.mjs` opens the frozen stage exactly as `render.mjs` does. `tools/golden/plan-v2.mjs` provides `buildPlanV2` without running the CLI.
- Tolerances: state values must match within |Δ| ≤ 1e-9 · max(1, |a|, |b|). Mesh hashes, sub-frame counts, cues, curves and the plan must match exactly. Pixels: see `manifest.tolerance.pixel`, where 0 means bit-identical.
- Golden frames are **cold renders**: each frame is rendered in a fresh page, and they reproduce bit for bit. They are also exactly the approved master's frames:
  - `qa/golden/v2/sequential-frames.json` holds the RGBA hashes of all 450 frames rendered in order, as `render.mjs` did.
  - All 15 frame-aligned cold goldens equal their in-sequence frames.
  - Re-encoding the in-order render gives an H.264 stream bit-identical to the approved MP4.
- v2 has one **render-history dependence**: the face's scratch canvas `Face.tmp` in `stage2/face.js`. Each stroke clears only its own corner of it, and a blurred `drawImage` at a fractional offset reads stale texels from earlier strokes.
  - Rendering frames **out of order** in one page can therefore differ, by up to 10/255 in a few hundred face and reflection pixels. Natural order matches.
  - Compare single frames against cold renders, and full videos against the sequential hashes.
  - Any engine change that clears or resizes `Face.tmp` (WP-02/WP-10) is a pixel change and must be gated as one.
- Chromium flags: use `RECOMMENDED_ARGS` in `tools/golden/v2-harness.mjs` (`--use-angle=vulkan --enable-unsafe-swiftshader`), which is bit-identical to the legacy flags. Never use `--use-angle=swiftshader`: it changes pixels.

## 8. Work-package reports

Each package writes `docs/wp/<WP-ID>.md` with:

- what was built;
- the file list;
- for **every** acceptance criterion, the exact command run and the measured result;
- deviations from the plan, with reasons;
- open issues.

Do not commit or push unless you work in an isolated worktree; the integrator commits each wave.
