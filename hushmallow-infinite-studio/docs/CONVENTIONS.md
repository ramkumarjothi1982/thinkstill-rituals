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
- Temp files go in `mkWorkTemp(prefix)` under `WORK/tmp`, never the system `/tmp`. Agents' own scratch files go there too, not in a harness scratchpad: the write audit (below) reports any file written outside the studio and `WORK`.

### The write jail: `render/lib/write-jail.mjs`

Studio jobs run in a private mount namespace where the kernel lets them write only to `STUDIO` and `WORK`. Everything else on the machine is read-only (`EROFS`), and so are the frozen v2 paths inside the studio. `/tmp` and `/var/tmp` are a private directory under `WORK/tmp`, removed when the job ends, and `/dev/shm` is a private tmpfs. Child processes such as Chromium, ffmpeg and python inherit all of it.

| Entry point | How it is confined |
|---|---|
| `npm test`, `npm run test:*`, `npm run preview` | wrapped: `node render/lib/write-jail.mjs -- …` |
| `node cli/hm.mjs …` (so `npm run hm`, `lib:validate`, `guard`) | `hm` re-runs itself in the jail (`await confine()`) |
| `node render/lib/heavy-lock.mjs … -- <cmd>` (so `npm run render`, `bench:probe`, `derive`) | the lock runs `<cmd>` in the jail |
| `tools/golden/{capture-v2,sequential-v2,freeze}.mjs` | `await confine()` as their first statement |

- New entry scripts call `await confine()` first, or are started through the heavy-lock CLI or `npm run jail -- <cmd>`.
- `node render/lib/write-jail.mjs --status` tells you whether you are inside.
- `HM_JAIL=off` disables it, with a warning, on a machine without mount namespaces. The guards still apply.
- It needs root (`CAP_SYS_ADMIN`), which the studio machine has. It is a guard rail against mistakes, not a security boundary.
- git commits made inside the jail, for example in throw-away test repositories, need `-c commit.gpgsign=false`: the sandbox's signing helper lives in the host's `/tmp`.

## 2. The frozen v2

These paths are frozen (`paths.FROZEN`):

- `stage/` and `stage2/`
- `videos/my-brain-at-2am-v2.js`
- `audio/soundtrack-v2.mjs` and `audio/soundtrack.mjs`
- `render/render.mjs` and `render/verify.mjs`
- `assets/noomi/` and `output/v2/`

They are hash-locked and tagged `v2-approved`. The lock covers **every file on disk** under these paths, git-ignored ones included:

- `qa/golden/v2/frozen.sha256` lists the files git tracks: 50 files, the same in every clone.
- `qa/golden/v2/frozen-local.sha256` lists the files git does not track: the approved render's ignored video pass, `render.log` and `test.wav` in `output/v2/`.
- Any other file that appears under a frozen path is reported as `added`, whether git ignores it or not.
- In a linked worktree (`git worktree add`), git never checked out the local-only files, so they are listed as "not in this worktree" instead of missing. Edits and additions there still fail.

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
node render/lib/heavy-lock.mjs --exclusive -- node tools/bench.mjs …    # CLI wrapper: runs the command in the write jail; exit code passes through
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

Commands (`hm help` prints the live list with one line each):

- WP-00: `hm guard`, `hm test [guard] [unit] [parity] [property] [golden] [derive]`, `hm lock status`, `hm golden capture`, `hm golden sequential`, `hm golden verify`.
- WP-01 (render farm): `hm render`, `hm status`, `hm doctor`.
- WP-02 (performance pass): `hm bench` (exclusive lock, median of 3), `hm bench gate` (G-PIXEL on the 16 golden times; `--steps both` runs every feature's own gate, switched off alone and on alone), `hm proof` (6 full-quality stills); `hm render --profile exact|final|draft`.
- WP-03 (composer) has no `hm` command of its own: `hm spec compile` runs it (G-DIR, G-COST), and `hm render composer/t01-v2` renders the composed golden T01 through runtime v3. Contracts: `docs/ARCHITECTURE.md`.
- WP-06 (planner): `hm lib validate` (extended: the story library, then the planner inputs), `hm lib coverage`, `hm plan`, `hm spec new`, `hm spec show`, `hm spec seal`, `hm spec check`, `hm spec compile`, `hm approve`, `hm reject`, `hm export`.
- WP-07 (asset derivation) has no `hm` command yet: run `python3 -I tools/derive/derive_mallow.py --mallow <id>` and `python3 -I tools/derive/asset_qa.py --mallow <id>`; both take the exclusive heavy lock themselves.

## 5. Tests: `node:test`, no dependencies

```
tests/unit/         fast, pure (no browser)                      npm run test:unit     = hm test unit
tests/guard/        safety rails (frozen, app, wall clock, writes) npm run test:guard    = hm test guard
tests/parity/       re-sample in Chromium vs goldens (≈ 1–2 min) npm run test:parity   = hm test parity
tests/property/     planner invariants over 1k–10k specs (≈ 2 min) npm run test:property = hm test property
tests/golden/       pixel goldens + render farm, heavy (≈ 5 min)  npm run test:golden   = hm test golden
tests/derive/       tools/derive Python unittest (≈ 2.5 min)      npm run test:derive   = hm test derive
tests/smoke/  tests/determinism/                                  (from WP-24 and WP-26)
npm test            guard + unit + parity + property: run before handing in any package (= node cli/hm.mjs test)
```

- Parity opt-ins (WP-03): `HM_PARITY_FULL=1` renders all 16 golden frames through the composer (default 4, ≈ 100 s for 16); `HM_PARITY_SEQUENTIAL=1` renders all 450 frames in order against the sequential golden (≈ 25 min). Run both after any change to `engine/` or `composer/` that may move pixels, and at every merge of such a change.
- Files are named `*.test.mjs`. Tests that render take the heavy lock themselves (shared), so running them directly is safe too.
- Tests never touch the network, the app or the frozen files. Temp directories come from `mkWorkTemp()`.
- The suites are defined once, in `cli/commands/test.mjs`; the npm scripts are aliases. `hm` runs inside the write jail, so a test that writes outside the studio fails with `EROFS`.
- `node cli/hm.mjs test` is the npm-free form. npm itself (not studio code) writes bytecode for its own modules to `$TMPDIR/node-compile-cache` before it reads any studio setting; the write audit verifies each such entry (below), and plain `node` writes nothing outside.

### The write audit: `render/lib/write-audit.mjs`

`tests/guard/no-outside-writes.test.mjs` and `hm guard` look at the whole machine, against the committed baseline `qa/guard/outside-writes.json`. On every writable storage mount, each of these is a failure:

- **written:** a file or symlink whose ctime is newer than the baseline;
- **deleted:** a name that existed at arming and is gone. Arming records the names in every directory (`WORK/guard/listing-*.json.gz`, its sha256 in the baseline); directories changed since are compared with it;
- **git config:** a key added, changed or removed in the repository's git config, except routine branch/remote keys. A key that can make git run a program (`core.hooksPath`, `alias.*`, `include.path`, …) is never routine.

Not reported:

- this studio or `WORK`;
- another worktree of this repository, which its own guards check;
- the data ordinary git commands write: `objects/`, `refs/`, `logs/`, `index`, `HEAD`, … (`GIT_INTERNALS`). The rest of the git directory is audited: `hooks/`, `info/`, `description`, and any unknown file;
- `EXTERNAL_WRITERS`: a short list, each entry with a reason, of places the agent harness and the sandbox's boot provisioning write to (one entry, the harness's session directories, excuses removals only);
- npm's own V8 compile cache, entry by entry: the file name must be Node's cache key for a module inside npm's installation and the header must hold that module's exact length and CRC32. Any other cache entry is a finding.

An agent's scratchpad (`/tmp/claude-*/…/scratchpad`) is **not** exempt. When the audit fails:

- delete stray files, and put scratch in `WORK/tmp`;
- if the writer is not studio code, add an `EXTERNAL_WRITERS` entry with a reason;
- or, after review, re-arm the baseline with `node cli/hm.mjs guard --arm --reason "<what was reviewed>"` and commit the file. Like re-freezing, this is a deliberate act.

## 6. Determinism

- `engine/` and `composer/` never read the wall clock or unseeded randomness. Use the seeded streams and the virtual clock. `tests/guard/no-wallclock.test.mjs` scans both directories, which are listed in `determinism-scan.DETERMINISTIC_DIRS`.
- The scanner **parses** every file (Acorn, vendored in `render/lib/vendor/`), so identifier escapes are decoded, regex literals and divisions cannot be confused, and a file that does not parse is a finding. It judges the syntax tree:
  - `Math`, `Date`, `performance`, `crypto` and `Temporal` are recognised **by name, on any receiver**: `window.window.Date.now()`, `frames.Math.random()`, `globalThis?.Math.random()`, `x['Ma'+'th'].random()` are all findings.
  - **allowed:** any `Math` member except `random`; `new Date(<args>)`, `Date.UTC` and `Date.parse`; `crypto.subtle`; `typeof` and `instanceof` checks.
  - **findings:** `Math.random`, `Date.now`, `new Date()`, `Date()`, any read of `performance`, `crypto.getRandomValues`/`randomUUID`, `Temporal.Now`, `process.hrtime`/`uptime`, `node:perf_hooks`, node:crypto's random functions; the object used as a value, by a computed key or by rest destructuring; the global object indexed by a computed key or passed to `Reflect`/`Object`; strings that spell a banned call; and every route from a string to code (`eval`, `Function`, `.constructor`, string timers, computed `import()`/`Worker`/`require`, `document.write`, `innerHTML`, `<script>` creation, `on*` attributes, `javascript:` URLs, `node:vm` and friends).
  - Code that `engine/` and `composer/` import from elsewhere in the studio is scanned too. Imports of the frozen v2 and the live app are not followed (they are hash-locked); packages, URLs and files outside the studio cannot be imported.
  - Load modules through constant specifiers, e.g. a table of `() => import('./moves/g-jolt.js')` thunks, so the guard can follow them. `stage2/stage.js`'s ``import(`../videos/${videoId}.js`)`` is a finding under these rules.
- Comments are ignored and assignments are allowed, which is how the virtual clock installs itself (`Math.random = mulberry32(seed)`).
- **There is no inline opt-out.** The only exceptions are the entries of `WALLCLOCK_ALLOWED` in `render/lib/determinism-scan.mjs` (empty today). Each one pins a file, an exact source line that occurs once in that file, and the findings it may produce, with a reason. An entry fails the guard when it is stale (no longer produces the finding), pending (its file does not exist: register it in the same change as the line) or ambiguous (the line occurs twice).
  - Excusing a capture never excuses the handle: every binding declared on an excused line is watched, so each later use or export of it (`RealDate.now()`, `{ RealDate }`) is a finding of its own.
  - The v1 clock's `realPerfNow` and `RealDate` captures are unused. WP-01 drops them, and the two `clock` properties that export them, when it inlines the clock as `engine/runtime/clock.js`; `tests/guard/no-wallclock.test.mjs` shows that the result has no findings.

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
