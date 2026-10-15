# FU-1: Guard bypasses (the open WP-00 gaps)

**Status: done (round 2).** Round 1 (2026-10-14) closed the five open WP-00 gaps: `docs/wp/WP-00.md` "Integrator notes (Wave A)" gaps 2–5, and `docs/M0-REPORT.md` §9 item 3. An adversarial verification then found six ways around round 1: five confirmed, plus one minor one outside the listed gaps.

Round 2 (2026-10-15) closes all six. Each fix has a regression test that fails against the round-1 modules at `HEAD`. After review the write audit was re-armed, and `hm guard` is green.

Changed: `render/lib/determinism-scan.mjs`, `render/lib/write-audit.mjs`, their tests (`tests/guard/no-wallclock.test.mjs`, `tests/guard/guard-sensitivity.test.mjs`, `tests/unit/write-audit.test.mjs`) and the re-armed baseline `qa/guard/outside-writes.json`.

**Machine and date:** the studio machine, 2026-10-15, Node v22.22.0.

**How things were run:** every command ran inside the write jail. `hm` confines itself; direct runs went through `node render/lib/write-jail.mjs -- …`. There was one mistake, recorded under criterion 5. Scratch went to `WORK/tmp/fu1r2/` only.

**Concurrent work:** the FU-2 agent worked in the same checkout at the same time.

## Round 2: what the verifier found and what changed

| # | Finding (verifier's probe) | Cause in round 1 | Round 2 |
|---|---|---|---|
| 1 | The v1 clock's real-clock handles can be reached through the **carrier object** `clock` (`export const clock = {…}`, `stage/components/clock.js:76`). Probes P1–P4: `Object.values(clock)`, for-in with a run-time key, rest destructuring, `import()` + `with (m.clock)`. 0 findings. | Only the handle *names* (`.realNow`, `.RealDate`) and the global `__hushClock` were watched. The 4 clock entries excused the captures whoever imported the file. | The object that holds an excused handle is a **carrier**, followed across files: exports, imports (named, default, namespace, re-exports, `export *`), aliases, destructured members, objects it is stored in, and globals. A carrier may only be read by member name or tested. Any other use is a finding, and so is loading its module by `import()` or `require()`. A `with` statement is always a finding. |
| 2 | **CommonJS load routes** inside a followed package bring in files the guard never parses (P5 `module.require`, P6 `const load = require`, P7 `require.call` and `(0, require)`). | Only a plain `require('<const>')` with an undeclared callee was recognised. | Two forms are followed: `require(<const>)` (whatever the file declares) and `module.require(<const>)`. Every other route to the loader is a finding: `require` as a value, `require.cache`, `.extensions` and `.main`, another module's `.require`, `module.load`, `.paths`, `.parent` and `.children`, the loader internals (`_compile`, `_load`, …), `arguments` outside a function, and `process.getBuiltinModule` / `mainModule`. Probing also finds `.node` addons, which are findings. |
| 3 | A real directory reached through **two symlinks at different depths** is walked only through the link readdir returns first, so imports that resolve differently from the second path are lost. The result depends on readdir order. | The walk de-duplicated by real directory. | The walk goes **by path**: every path that reaches a directory, readdir sorted by name. A path whose real directory is already open on the way down is a cycle and ends. More than 20,000 directory visits is a finding. Each module's imports resolve from every path it is reachable by, plus its real path. |
| 4a | An **exempt removal turns off the touched check** for its directory. Deleting one of the 75+ Phase-1 scratchpad files silenced create-then-delete detection there. | `removed.length` counted exempt removals. The `remove` scope matched ancestors, so every file under a session directory was exempt. | The `remove` scope matches **exact paths**: the session directory and, as a new entry, its `scratchpad/` directory. Everything inside is audited, so deleting a scratchpad file is `deleted`. Only a removal by the directory's owner may explain that directory's change: a session directory, a worktree or worktree container, or an `all`-scope writer's own place. |
| 4b | A **new empty directory** anywhere under `/tmp/claude-*/*/*` is not reported. | The `created` exemption used `coveredBy` (ancestors). | Exact paths: `scratchpad/newdir` and `sess/other` are `created`. |
| 4c | The **repository's top level and `/tmp`** have blanket touch exemptions. | The top level was in the worktree touch set. | The **top level is audited**. Only `/tmp`, the git directory and each worktree's admin directory keep a touch exemption. For `/tmp` the harness's per-command cwd file always makes the last change, so any earlier create-then-delete there is masked whether exempt or not. The documentation now says so instead of calling it "masked". |
| 4d | (low) Any entry whose **ctime** is within 50 ms of the directory's mtime "explains" it, and a subdirectory's ctime moves with its contents. So a new job directory in WORK masked a stray file in `/home/user`. | A ctime near the mtime counted, whatever moved it. | An entry explains the change only if it was **created then** (birth time) or **renamed or linked in then** (ctime moved, content older). The tolerance is **20 ms**, from measurement (below). |
| 5 | `hm guard` red: `.git/info/exclude` written at 01:26:53. | The workflow harness wrote it after FU-1's hand-in. | Reviewed and **re-armed**; `hm guard` green. |
| 6 | (minor) `<base href>` is ignored, and `<object data>` / `<embed src>` pages are not followed. | Page-relative resolution only; no `object`/`embed`. | `<base href>` is followed: relative URLs resolve from the page directory **and** the base, and a base that is not a relative path is a finding. Also followed: `<object data>`, `<embed src>`, `<portal src>`, `<iframe srcdoc>` (judged in place), SVG `<script href>` / `xlink:href`, `<meta http-equiv=refresh>`, and `navigator.serviceWorker.register(<const>)`. A service worker can rewrite every module the page fetches, so any other use of `serviceWorker` is a finding, as is creating `<base>`, `<iframe>`, `<frame>`, `<portal>`, `<object>` or `<embed>` from script. |

Also, because composer code runs in Node, Node's `global` now counts as the global object unless the file declares that name, so `global[k]()` is a finding.

### 1. Carriers, in detail

The real case is the v1 clock (`stage/components/clock.js`). Lines 85–86 put the two excused captures into the object literal of `export const clock = {` (line 76). Line 89 publishes it as `window.__hushClock`.

- **Where carriers come from:** when an allowlist entry excuses a handle that is stored as a property of a variable's object (`escapeOf` → `{ kind: 'prop', obj }`), that variable becomes a carrier in its file.
- **Where the guard follows them:** `analyzeSource` records, for every reference and every member read, how its value is used (`carryOf`) and the member chain (`chainOf`: `ns.clock.step` → `['ns', 'clock', 'step']`). `scanDirs` records which file each import resolves to (`rec.edges`). Then, in the same fixpoint as the handles:
  - **Safe, no finding:** a member read by name (`clock.step(dt)`; a handle's own name is watched everywhere anyway), destructuring with static keys, `typeof`, `!`, `===`, and test positions. An object is truthy, so `clock && x` never yields it. A carrier moved whole somewhere the guard can follow is followed, not flagged:
    - an alias (`const c = clock`);
    - a store (`o.c = clock`, or `const o = { c: clock }`: `o` becomes a carrier whose member `c` is one);
    - a global (`window.cc = clock`: any read of `cc` is a finding);
    - an export (`export { clock as x }`, `export default clock`, an exported declaration).
  - **Imports:** importers of an exported carrier get carrier bindings. Named, default and namespace imports are followed (`import * as ns`: `ns.clock` is the carrier), and so are re-exports (`export { clock as c2 } from`, `export * from`, `export * as ns2 from`).
  - **Findings:** every other use, for example `Object.values(clock)`, `for (k in clock)`, `clock[k]`, `{ ...clock }`, `const { a, ...rest } = clock`, `with (clock)`, `f(clock)`, `module.exports = clock`, or a carrier stored in a literal the guard cannot name. So is loading a carrier's module by `import()` or `require()`, because the module object is not followed.
- **Handles must have a holder the guard can name:** a handle stored on an object the guard cannot name is now untracked (a finding no entry can excuse) instead of only having its property name watched. Examples: `f({ rn: h })`, a nested literal, `module.exports = { rn: h }`, `a.b.rn = h`.
- **On the real studio:** the carrier `clock` is exported by `clock.js` and imported by frozen `stage2/stage.js`, which uses only `clock.step(1000 / fps)`. Result: **0 findings**, with the same 5 entries.
- **Residual limit:** what a carrier's *own* methods do with `this` (a `get self() { return this; }` would pass it on). The object literal is reviewed with the entry that makes it a carrier; the v1 clock's methods touch only its private `state`.

### 2. The write audit's tolerance, measured

`WORK/tmp/fu1r2/eps.mjs` performs create, mkdir, symlink, link, file rename and directory rename in a directory on `/` (ext4, under WORK) and in one on `/dev/shm` (tmpfs). For each it records the gap between the entry's birth time or ctime and the directory's mtime, over 5,000–8,000 samples per filesystem:

| Run | create | mkdir | symlink | rename (file) | rename (dir) | link |
|---|---|---|---|---|---|---|
| idle, `/` | 0.000 | 0.297 | 0.612 | 0.000 | 0.000 | 0.000 |
| idle, `/dev/shm` | 0.000 | 0.394 | 2.082 | 0.000 | 0.000 | 0.000 |
| 6 busy processes on 4 cores (in the jail), `/` | **6.070** | 2.246 | 3.916 | 0.000 | 0.000 | 0.000 |
| same, `/dev/shm` (the jail's private tmpfs) | 2.058 | 0.269 | 3.984 | 2.037 | 0.000 | 0.000 |

All values are the maximum gap, in ms. Timestamps are fine-grained (smallest mtime step 0.03–0.06 ms). Separate clock reads inside one system call drift apart only when the process is preempted between them.

`TOUCH_EPS_MS` is therefore **20 ms**, about three times the worst case under load. The verifier's 0.000 ms was an idle create.

The same run showed that **a renamed directory keeps its mtime while its ctime moves (800/800)**. That is the basis of the "created, or renamed or linked in" rule.

## What was built (current state)

### Determinism guard (`render/lib/determinism-scan.mjs`)

Everything `engine/` and `composer/` can load is judged by the same rules, wherever it lives:

- **Studio code** they import ("followed").
- **Hash-locked code** ("locked": the frozen v2 paths and the live app), followed transitively. A finding there needs a reviewed `WALLCLOCK_ALLOWED` entry, which pins a line of a hash-locked file.
- **Packages:** a bare specifier is resolved upward through `node_modules`, and every entry the package can expose is judged (every `exports` condition, `main`, `module`, `browser`). Relative imports into `node_modules` are followed too. CommonJS is handled as described in round 2, item 2.
- **Symlinked directories and files,** by every path (round 2, item 3).
- **HTML:**
  - script sources;
  - import-map addresses (a prefix maps a whole folder; a map that is not inline JSON is a finding);
  - frames, `<portal>`, `<object>`, `<embed>`, `<meta refresh>` and `srcdoc`;
  - `<base href>`;
  - service-worker registration (round 2, item 6).

**The allowlist.** It has 5 reviewed entries, all in frozen v1/v2 stage code (deviation 1 below). Excusing a finding never excuses the handle:

- a variable holding it is watched in its file;
- a property name holding it is watched in every file (`.realNow`, `.RealDate`);
- a global holding it is watched in every file (`__hushClock`);
- the object holding it is a carrier (round 2, item 1);
- anything else is a finding no entry can excuse.

The watch extends to a fixpoint.

**The studio today** (`scanDirs(STUDIO)`, `WORK/tmp/fu1r2/real-scan.mjs`):

- 99 files judged: 4 studio files followed, 11 locked, 0 in `node_modules`, 0 symlinks.
- **0 findings**; 6 findings excused by the 5 entries; 0 stale, 0 pending, 0 ambiguous.
- Watched: the bindings `realPerfNow` and `RealDate`, the properties `realNow` and `RealDate`, the global `__hushClock`, the carrier `clock` (in `clock.js` and `stage2/stage.js`) and the export `clock`.
- Time: 0.92–1.31 s while the default suite ran beside it (round 1: 1.08 s).

**What a static guard still cannot see** (module header):

- a property name computed at run time on an object it cannot identify;
- time that arrives as data;
- what a callee keeps when an excused handle is passed into it on an allowlisted line;
- what a carrier's own methods do with `this`;
- a page URL changed at run time (an existing `<base>`'s href set by script, `history.pushState`), which moves inline scripts' relative dynamic imports, and navigation by script.

The backstops are the virtual clock itself and the parity gates.

### Write audit (`render/lib/write-audit.mjs`)

**Findings**, on every writable storage mount outside the studio and WORK:

| Kind | What it is |
|---|---|
| `written` | a file or symlink newer than the baseline |
| `deleted` | a name that existed at arming and is gone |
| `created` | a directory that did not exist at arming |
| `touched` | a directory that changed with nothing to show for it: no entry created or renamed/linked in at its last change, and no removal by its owner. A metadata change also counts. |
| `git-config` | a git config key changed, other than a routine key |

**Exemptions**, all narrow:

- **`all` writers** (harness and provisioning places): the path and everything below it.
- **`remove` writers**, by exact path:
  - a harness session directory, `/tmp/claude-*/*/*`;
  - its `scratchpad/` directory.

  These may be created or removed; everything inside them is audited.
- **`touch` places**, by exact path, may change with nothing left behind:
  - `/tmp` (the harness's per-command cwd file);
  - the git directory and each worktree's admin directory (git lock files).
- **Worktree places** (`<git>/worktrees`, `.claude`, `.claude/worktrees`, and the directories between a worktree and the top level) may be created. They may be removed when they held only worktree places at arming, and that removal explains their parent's change. They are **not** touch-exempt.

**Known limits** (module header):

- **Masked by a later visible change in the same directory.** In practice that happens:
  - in `/root` (`.claude.json`);
  - in `/tmp/claude-*/<project>` (session directories come and go);
  - in the checkout's top level after the last worktree's `.claude/` is removed, until the next re-arm.
- **Coincidence:** a create-then-delete within 20 ms of a legitimate create or rename in the same directory.
- **Directly in `/tmp`:** inherent, because the harness's churn always makes the last change.
- **Directly in the git directory or an admin directory.**
- **A directory that has a `deleted` finding** is not checked for touched as well.

## Files

```
render/lib/determinism-scan.mjs          carriers (carryOf, chainOf, import edges, exports/namespaces in the fixpoint);
                                         CommonJS loader routes; per-path symlink walk (walkPaths, VISIT_CAP); HTML base/object/
                                         embed/portal/srcdoc/SVG script/meta refresh/service worker; global; with; loading tags
render/lib/write-audit.mjs               exact 'remove' scope (+ scratchpad entry); owner-only removals explain; top level audited;
                                         created/renamed-in rule; TOUCH_EPS_MS 20 (measured); top-level hint in the finding
tests/guard/no-wallclock.test.mjs        round 2: carriers (P1-P4 + 12 routes + allowed uses), untracked holders, CommonJS
                                         routes (P5-P7 + 9 more), symlink paths both orders + diamond, HTML (P9, P10 + 6 more),
                                         12 one-line cases; 1 expectation updated (Reflect.get(clock, …) is a carrier use)
tests/guard/guard-sensitivity.test.mjs   round 2: machine 3 (W1-W4, atomic replace, hard link, session churn, the documented
                                         limit); machines 1 and 2 updated to the exact-path exemptions
tests/unit/write-audit.test.mjs          exemption list (exact remove scope), worktree touch set, tolerance bound
qa/guard/outside-writes.json             re-armed after review (round 2)
docs/wp/FU-1.md                          this report
```

Not committed (`WORK`):

- `guard/listing-2026-10-15T04-11-45-541Z.json.gz` (sha256 in the baseline);
- `tmp/fu1r2/` (probes, logs, measurement scripts, the round-1 copy of this report);
- `tmp/fu1/` (round 1).

## Acceptance criteria

The brief has no separate list in `docs/PHASE2-PLAN.md`. The criteria are the WP-00 gaps 2–5, M0 report §9 item 3 and the brief's own requirements, re-checked against the verifier's findings. The verifier's probe scripts were run unchanged except for their output directory: `WORK/tmp/fu1r2/probes/{scan-probes,symlink-order,audit-probes}.mjs`, with logs alongside.

### 1. `node_modules` reached by engine/composer imports is scanned (WP-00 gap 3)

```
$ node render/lib/write-jail.mjs -- node WORK/tmp/fu1r2/probes/scan-probes.mjs
== P5 module.require in a package           scanned=3 packages=node_modules/pkg/main.cjs,node_modules/pkg/lib/clock.js
     node_modules/pkg/lib/clock.js:1 Date.now | node_modules/pkg/lib/clock.js:1 Math.random
== P6 const load = require; load(...)        node_modules/pkg/main.cjs:1 require (as a value: the guard cannot follow what it loads)
== P7 require.call / (0, require)            node_modules/pkg/main.cjs:1 require (as a value: …) | require.call (…)
```

Round 1 had 0 findings for each of these.

- **Regression test:** "bypass (round 2): every CommonJS route to the loader inside a followed package is followed or a finding" passes. Its package contains the verifier's three routes plus `arguments[1]`, `require.cache`, `require.extensions`, `require.main.require`, `module.paths`, `module._compile`, `module.load`, `process.getBuiltinModule('node:vm')`, a `.node` addon and a function whose parameter is named `require`.
- **Expected findings:** 13 findings in `main.cjs`, and the files reached by `module.require` and the shadowed `require` are judged. `require.resolve` is clean.
- **Round-1 test** ("code in node_modules that engine code imports is scanned") still passes.

### 2. Symlinked directories are followed (WP-00 gap 4)

```
$ node render/lib/write-jail.mjs -- node WORK/tmp/fu1r2/probes/symlink-order.mjs
shallow=engine/a readdir=a,sub scanned=[lib/f.js, tools/evil.js] findings=[tools/evil.js:1 Date.now]
```

Round 1: `scanned=[lib/f.js] findings=[]`. P8 in `scan-probes` (`readdir sub,x`) also gives `tools/evil.js:1 Date.now`.

**Regression test:** "a directory reached through several symlinks is walked by every path, whatever order readdir returns" passes. It covers:

- shallow link names `a` and `zz` (both readdir orders), each with exactly `tools/evil.js:1 Date.now`;
- a diamond (`engine/l1`, `engine/l2` → `lib`, `lib/up` → `..`), walked by both paths, with the cycle ending.

### 3. Imports of locked code are followed, and real-clock handles and carriers cannot be reached (WP-00 gap 5)

```
$ node render/lib/write-jail.mjs -- node WORK/tmp/fu1r2/probes/scan-probes.mjs
== P1 Object.values(clock)    engine/a.js:2 real-clock carrier clock (holds the handle excused at stage/components/clock.js:85): a use that can reach members the guard cannot name
== P2 for-in over clock       engine/a.js:2 real-clock carrier clock (…)
== P3 rest destructuring      engine/a.js:2 real-clock carrier clock (…)
== P4 with (m.clock) {…}      engine/w.js:1 loads stage/components/clock.js by import(), which exports the real-clock carrier clock (…): the guard cannot follow a module object
                              engine/w.js:1 with statement (names inside it read properties of an object the guard cannot follow)
```

Round 1 had 0 findings for each.

**Regression tests:**

- "the v1 clock's carrier object is followed into every importer…" uses the frozen clock, copied read-only, with the studio's 4 clock entries. It covers P1–P4 and eleven more routes, each a finding:
  - renamed import;
  - namespace, as a value and `ns.clock` enumerated;
  - re-export `as`, iterated with for-in;
  - `export *` (spread) and `export * as`;
  - an alias stored in a literal the guard cannot name;
  - a holder object (`box.c` enumerated);
  - default re-export;
  - published on `window` and read elsewhere;
  - `require()`;
  - an inline module script in HTML.

  It also checks what stays clean: `clock.step`, `clock?.step`, `clock.seed`, `clock.nowMs`, `const { step } = clock`, an alias's members, `ns.clock.step`, tests and comparisons, and an exported carrier used by name in another file. The watched carriers are listed.
- "a handle stored on an object the guard cannot name, or exported, leaves the line untracked" covers four holders (each untracked) and a named holder that becomes a carrier.
- Round-1 tests for rig.js, the handles and import maps still pass. The handles test gains one expected finding: `Reflect.get(clock, 'realNow')` is now also a carrier use.

**Real studio:** 0 findings, 5 entries, carrier `clock` followed into `stage2/stage.js` (see "What was built").

### 4. A file created and deleted again outside the studio is detected (WP-00 gap 2; M0 report §9 item 3)

**The verifier's miniature machine**, re-run with the round-2 audit:

```
$ node render/lib/write-jail.mjs -- node WORK/tmp/fu1r2/probes/audit-probes.mjs
W1 mkdir scratchpad/newdir                       created tmp/claude-0/proj/sess/scratchpad/newdir          (round 1: ok=true)
W2 create-then-delete repo/stray.tmp              touched repo                                              (round 1: ok=true)
W3 rm scratchpad/old.txt, then create-then-delete deleted tmp/claude-0/proj/sess/scratchpad/old.txt           (round 1: ok=true)
W4 create-then-delete home/user/stray.txt, then mkdir WORK/new-job
                                                  touched home/user                                         (round 1: ok=true)
W5 control: srv/stray.txt                         touched srv
```

**Regression test** "write audit (FU-1 round 2): exempt places are exact paths, …" (machine 3) passes. Three runs in a row: 8/8 each time.

| Phase | Events | Result |
|---|---|---|
| Silent | an atomic replace (temporary file renamed over); a hard link; the harness removing an old session and creating a new one (`scratchpad/`, `tasks/`); git's index lock; a new WORK job directory | only the replaced and linked files themselves are `written` |
| Documented limit | after a session removal in `tmp/agent`, a create-then-delete there | masked |
| Reported | W1, a new directory directly in a session directory, W2 (with the worktree hint in its detail), W3, W4, a create-then-delete in `etc` followed at once by a write into an existing file there, a create-then-delete in a *new* session's scratchpad | each reported |

Machines 1 and 2 are updated:

- removing an old session directory is silent;
- removing a live session's scratchpad file is `deleted`;
- the worktree lifecycle is still silent.

**The real machine, read-only.**

Against the previous baseline (2026-10-14T23:49:02.330Z), before the re-arm, `node cli/hm.mjs guard` gave exactly two findings, both reviewed (criterion 6):

- `written .git/info/exclude [01:26:53.498Z]`
- `touched /dev/shm [03:45:24.128Z]`

The new checks found nothing else on the machine.

Replays against older baselines (`node render/lib/write-jail.mjs -- node WORK/tmp/fu1r2/dryrun-history.mjs`):

- **Wave D (22:09:51):**
  - the 22:33:52 scratchpad event (the M0 auditor's file), as in round 1;
  - `/dev/shm` 03:45:24;
  - the `exclude` write.
- **Round 3 (00:47:08):**
  - **The 00:56:35 jail probe:** `/home/user`, `../hushmallow`, `/run` and `/usr/local`.
  - **The repository root:** now reported, as touched at **23:15:06**. That is the Wave D teardown: `.claude/` was created after that baseline and removed then, and the same change masks the 00:56:35 probe there.
  - **Newly visible:** `scratchpad/s`, created at 18:28:42 (Wave D reviewed it), which round 1's ancestor exemption hid.
  - **Unchanged from round 1:** the 18:28:42 metadata bumps and the 75 written files.

### 5. The probes are non-mutating

- **Neither guard writes.** The scanner only reads. The audit runs `find`, `readdir`, `lstat` and `git config --list`. Arming writes only the baseline (in the studio) and the listing (in WORK).
- **Every sensitivity probe and verifier probe runs on throw-away trees** under `WORK/tmp`. The frozen v1 clock is copied read-only.
- **One mistake, caught by the guard itself.** The first timestamp measurement (`node WORK/tmp/fu1r2/eps.mjs`, 03:45) ran **outside the write jail**. Its tmpfs half created and removed `/dev/shm/hm-fu1r2-eps-25874`.
  - The next `hm guard` reported `touched /dev/shm [2026-10-15T03:45:24.128Z]`.
  - Nothing is left: `/dev/shm` holds only `rclone-vfscache`, from boot.
  - The event is recorded in the re-arm reason.
  - Every later command ran confined, including the measurement under load, where `/dev/shm` is the jail's private tmpfs.
- **Since the re-arm** at 04:11:45, `hm guard` has stayed green through the full default suite (04:12–04:17), the guard suite and golden verify (criterion 8).

### 6. `hm guard` is green

The workflow harness's write to `.git/info/exclude` was reviewed:

- it happened in the same nanosecond (01:26:53.498042904) as the harness created `hushmallow-infinite-studio/.workflows/m0fu-m1.js` inside the studio;
- the one added line, `hushmallow-infinite-studio/.workflows/`, hides only that harness directory inside the studio from `git status`.

Re-armed with:

```
node cli/hm.mjs guard --arm --by "FU-1 round 2 (guard bypasses)" --reason "…"
```

The reason records both findings and the rule changes. Baseline `since` is 2026-10-15T04:11:45.541Z. The listing has 27,881 directories and 221,737 entries; the schema is unchanged (`hm-write-audit/2`).

```
$ node cli/hm.mjs guard                                          (2026-10-15T04:11:47Z, right after arming)
ok    frozen v2 (tree 8d0627dfee6d, local 9a740db17b29)
ok    live app untouched (tree 1bef9b971ea7)
ok    no changes in the repository outside the studio root
ok    nothing written or deleted on this machine outside the studio and WORK, git config unchanged, since 2026-10-15T04:11:45.541Z (/ /dev /dev/shm /run/sandbox-telemetry; 1795 ms)
```

The same result after the full default suite: see criterion 8.

### 7. A regression test for each bypass, failing on the round-1 guard

The current test files were run against the `HEAD` versions of the two modules. These are FU-1 round 1, copied to `WORK/tmp/fu1r2/old-head/render/lib/`, with the tests' imports pointed at them:

```
$ node render/lib/write-jail.mjs -- node --test WORK/tmp/fu1r2/old-head/tests/{guard/no-wallclock,guard/guard-sensitivity,unit/write-audit}.test.mjs
not ok … write audit: fires on writes, deletions and git config changes …        (machine 1: the scratchpad file deletion)
not ok … write audit (FU-1 round 2): exempt places are exact paths, …            (machine 3: W1-W4)
not ok … scanner: "arguments[1]('./x.js');" | "const r = require; r(\"./x\");" | "const m = module.require(name);"
         | "const { require: r } = module;" | "const vm = process.getBuiltinModule('node:vm');" | "global[k]();"
         | "with (o) { now(); }" | "document.createElement('object');"
not ok … bypass: the v1 clock's real-clock handles … (the carrier use of Reflect.get)
not ok … bypass (round 2): the v1 clock's carrier object is followed into every importer; …
not ok … allowlist (round 2): a handle stored on an object the guard cannot name, or exported, leaves the line untracked
not ok … bypass (round 2): every CommonJS route to the loader inside a followed package is followed or a finding
not ok … bypass (round 2): a directory reached through several symlinks is walked by every path, whatever order readdir returns
not ok … bypass (round 2): HTML pages: <base href>, <object>, <embed>, <portal>, <iframe srcdoc>, SVG <script href>, <meta refresh>, service workers
not ok … the exemption list is narrow: … (exact remove scope)
not ok … worktree places: … only the git directory and admin dirs may churn
not ok … gitLayout names the main checkout, … (tolerance bound: 50 ms is no longer accepted)
# pass 150  # fail 19
```

All 150 other tests pass on the round-1 guard too, so no earlier case was weakened.

### 8. Hard rules: frozen v2, parity, suites

| Check | Command | Result |
|---|---|---|
| Frozen v2 byte-identical | `node render/lib/write-jail.mjs -- node tools/golden/freeze.mjs --check`; `sha256sum -c qa/golden/v2/frozen.sha256 qa/golden/v2/frozen-local.sha256` | frozen v2 OK (tree `8d0627df…`, local `9a740db1…`), live app OK (tree `1bef9b97…`); **53/53 OK** |
| App and frozen paths untouched | `git diff v2-approved -- hushmallow`; `git status --short -- <frozen paths>` | 0 lines; 0 lines |
| Scanner tests | `node render/lib/write-jail.mjs -- node --test tests/guard/no-wallclock.test.mjs` | **147/147** |
| Audit tests | `node --test tests/guard/guard-sensitivity.test.mjs tests/unit/write-audit.test.mjs` (confined) | **8/8** (three runs), **14/14** |
| Guard suite | `node cli/hm.mjs test guard` | **172/172** in 2.9 s (154 after round 1, plus 18 round-2 tests), re-run after the last (comment-only) edit; before the re-arm, 171/172, the one failure being the machine audit's two reviewed findings |
| Unit suite | `node cli/hm.mjs test unit` (04:08) | **425/425** |
| Default suite (T01 parity included) | `node cli/hm.mjs test` | 04:12–04:17, sharing the heavy lock with FU-2's jobs: **637 tests, 635 pass, 1 skipped** (the opt-in sequential render), **1 fail**. The failure is "approved v2 sounds repeated by a direction are not banned patterns…" in `tests/unit/audio-lint.test.mjs`. That file imports neither guard module; FU-2 modified `audio/lint-shapes.mjs` at 04:15:45, during the run (the unit suite passed 425/425 at 04:08). **T01 parity:** G-STATE 2,446 rows, 476,585 numbers, **max \|Δ\| 0** on the frozen module, the engine and the composer; composer → runtime v3 **4/4 golden frames bit-identical** |
| Goldens | `node cli/hm.mjs golden verify` | exit 0: all committed files and the 16 PNGs ok (25 lines); tolerance 0/255, 1e-9 |
| Guard after the suites | `node cli/hm.mjs guard` | 04:17:27Z: **4/4 ok**: frozen v2, live app, repository outside the studio, machine-wide audit since 04:11:45.541Z (2119 ms) |

## Deviations

1. **`WALLCLOCK_ALLOWED` holds 5 entries, all in hash-locked v1/v2 stage code** (unchanged from round 1).
   - **Why there are findings at all:** `engine/directions.js` imports the frozen v2 module, which names `../stage2/stage.js`, which imports the v1 clock. In the engine page, `engine/index.html`'s import map sends those URLs to the engine's own copies.
   - **Why the guard still judges them:** it cannot know which page loads a module, so it judges the literal graph too. A test checks that the import map covers every stage2 import.
   - **What changes in round 2:** the clock's exported object is now a carrier as well, so even a reviewed-away import of `clock.js` gives only member access by name.
2. **Carrier uses are judged strictly.** Any use other than a named member read, a test or a move the guard can follow is a finding, even where harmless (`JSON.stringify(clock)`, `'x' in clock`, `clock.step.call(clock, 1)`). No studio code does this. A new need gets a reviewed entry, which then watches the value as a handle.
3. **The checkout's top level is audited.** This closes the verifier's finding 4c. The cost: a whole worktree lifecycle between two arms (`.claude/` created and removed after arming) leaves the top level `touched`. Removal is invisible when the directory was not there at arming. The finding's detail names that cause, and the remedy is a reviewed re-arm. A lifecycle that starts and ends with `.claude/` present stays silent.
4. **New findings beyond the six:**
   - `with` statements;
   - Node's `global` indexed by a computed key;
   - `process.getBuiltinModule` and `process.mainModule`;
   - creating loading elements from script;
   - `navigator.serviceWorker` other than `register(<constant>)`.

   Each is a route to code or time the guard claims to follow. None occurs in the studio.
5. **`docs/CONVENTIONS.md` and `cli/commands/guard.mjs` are not edited.** FU-1 owns only the two modules and their tests; proposed text is below.

## Open issues and notes for the integrator

- **Commit `qa/guard/outside-writes.json`** together with the code. Its listing is in `WORK/guard/`.
- **`.git/info/exclude`:** if the workflow harness writes it again on later runs, the guard will report it each time. A content check like the git config's would make that routine: lines that only match inside the studio are fine, anything else is a finding. It is not added, because one write so far does not justify the code.
- **`docs/CONVENTIONS.md` §6, proposed text,** replacing the "Code that `engine/` and `composer/` import from elsewhere…" bullet and the allowlist paragraph:
  > Everything `engine/` and `composer/` can load is judged by the same rules, wherever it lives: studio code they import, hash-locked code (the frozen v2 paths and the live app, followed transitively), installed packages (every entry a package can expose; CommonJS only through `require(<constant>)` and `module.require(<constant>)`, every other route to the loader is a finding), code reached through symlinks (walked by every path), and what HTML pages load (scripts, import-map addresses, frames, `<object>`, `<embed>`, `srcdoc`, `<base href>`, service workers). URLs, absolute paths, packages that are not installed and files outside the studio and the locked code cannot be imported.
  > The only exceptions are the entries of `WALLCLOCK_ALLOWED` (5 today, in frozen v1/v2 stage code that the engine page never loads). Excusing a finding never excuses the handle: the guard follows the value into variables, property names (watched in every file), globals, and the objects that hold it (carriers: only member reads by name are allowed, in every importer).
- **`docs/CONVENTIONS.md` §5, proposed text,** for the write audit:
  > **touched:** a directory that changed with nothing left to show for it (a file created and deleted again), or whose mode/owner changed; **created:** a directory that did not exist at arming. Not reported: `/tmp` itself, the git directory and worktree admin directories changing with nothing left behind (harness cwd files, git lock files); harness session directories and their scratchpad directory being created or removed (their contents are audited).
- **`cli/commands/guard.mjs`** prints "nothing written or deleted …". "Written, deleted, created or touched" would match the audit now. (`describeAudit`'s own text is current.)
- **No VM reboot has happened since the new checks were armed.** The first audit after a boot may name directories that provisioning creates or touches. Review them and add `EXTERNAL_WRITERS` entries with reasons; do not re-arm blindly.

## Round 1 (2026-10-14), for reference

Round 1 built what the "Current state" sections describe, minus the round-2 changes above.

**Determinism guard:**

- followed `node_modules` (package resolution with every entry), symlinked directories (each real directory once), locked code (frozen v2 and the live app), import maps, frames and page-relative script sources;
- watched excused handles across files, by variable, property name and global.

**Write audit:**

- added `touched` (50 ms window) and `created`;
- added a `touch` scope for `/tmp`, worktree housekeeping (which fixed the red guard after the Wave D worktree removals) and `gitLayout().top`/`mainTop`.

Round 1's measurements:

- 7 scanner tests and 1 audit test that failed on the WP-00 guard (127 older tests still passed);
- the real-machine dry run against the round-3 baseline;
- the pre-arm finding at 22:33:52 (the M0 auditor's scratchpad file);
- the re-arm at 23:49:02.

They are kept verbatim in `WORK/tmp/fu1r2/FU-1.round1.md`. The round-1 claims the verifier disproved have been corrected above:

- "closed rather than moved" (the carrier);
- "followed instead of flagged" for packages (CommonJS routes);
- "resolved from both the link path and the real path" (only the first link);
- "touching one is still a finding" and "new empty directories are now findings" (ancestor exemptions);
- the repo root "masked" (it was exempt).
