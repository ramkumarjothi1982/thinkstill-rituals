# FU-1: Guard bypasses (the open WP-00 gaps)

**Status: done.** All five gaps listed in `docs/wp/WP-00.md` ("Integrator notes (Wave A)", gaps 2–5) and `docs/M0-REPORT.md` §9 item 3 are closed. Each closure has a regression test, and every one of those tests fails against the guard modules at `HEAD`. Changed: `render/lib/determinism-scan.mjs`, `render/lib/write-audit.mjs` and their tests. The write audit was re-armed after review, and `hm guard` is green.

Machine and date: the studio machine, 2026-10-14, Node v22.22.0. Every command ran inside the write jail (`hm` confines itself; `node render/lib/write-jail.mjs -- …` for direct `node --test` runs). Scratch went to `WORK/tmp/fu1/` only. The FU-2 agent was working in the same checkout at the same time, so the default suite shared the heavy lock with its jobs.

## What was built

### 1. Determinism guard (`render/lib/determinism-scan.mjs`)

Before FU-1, the guard judged only the files under `engine/` and `composer/`, plus studio code they imported. Everything else was skipped or listed. Now it follows **everything engine/ and composer/ can load** and judges it by the same rules.

| Gap (WP-00 integrator notes) | Before | Now |
|---|---|---|
| **3. `node_modules` skipped** | the walk skipped every `node_modules` folder, so `engine/node_modules/x/index.js` was never parsed, even when `engine/a.js` imported it relatively | Every import is followed wherever it lands, a `node_modules` folder included. Bare specifiers (packages) are resolved as Node resolves them, upward through `node_modules`. Every entry the package can expose is judged: each `exports` condition (browser, node, import, require, default), `main`, `module` and `browser`. CommonJS `require()` gets Node's probing (extensions, index files, a directory's `main`). `node_modules` folders are still not walked eagerly, because code there runs only if something imports it. |
| **4. symlinked directories not followed** | `readdir` dirents of symlinks were neither files nor directories, so the walk skipped them; imports through a link were skipped as "inside engine/" | The walk follows symlinked directories and files, once per real directory, so cycles end. Each real file is judged once. A module reached through a symlink has its imports resolved from its **own path** (what browsers do) **and** from its **real path** (what Node does), and both targets are judged. A symlink to code outside the studio and the locked code is a finding, and so is an import through one. The "skip imports into engine/" shortcut is gone: every resolved import is enqueued, and the queue de-duplicates. |
| **5. locked code listed, never followed** | imports of the frozen v2 paths and of `../hushmallow` were listed in `report.locked`, so engine code could reach `stage/components/clock.js` (`realNow`, `RealDate`, `window.__hushClock`) or live-app modules (`rig.js`) with zero findings | Locked code is **followed and judged**, transitively. It cannot be edited, so a finding there needs a reviewed `WALLCLOCK_ALLOWED` entry. Such an entry pins a line of a hash-locked file, so it cannot drift. **Excused handles are now followed across files** (next paragraph). |
| (found during FU-1) **import maps not followed** | `<script type="importmap">` was skipped as a data block, so a page could send any specifier to unscanned code | Every address an import map names (`imports` and `scopes`) is followed as code the page loads; a prefix mapping (`"lib/": "../lib/"`) brings in the whole folder. An import map that is not inline JSON, or that is external (`src=`), is a finding. `<iframe>`/`<frame>` pages are followed too. |
| (found during FU-1) **page-relative `<script src="x.js">` misread** | reported as "a package (x.js)" | resolved as a URL relative to the page |

**Following excused handles across files.** WP-00 watched only the bindings declared on an excused line, inside that one file. FU-1 follows the excused value to wherever it goes; `analyzeSource` records an `escape` for each clock finding and each reference:

- **A variable:** watched in that file, as before. Each use or export of it is a finding.
- **An object property** (`{ realNow: realPerfNow }`): the property name is watched in **every scanned file**. A read of `.realNow`, a destructuring of it, a constant key, or a string spelling it is a finding.
- **A global property:** the global that the holding object, or the value itself, is published under (`window.__hushClock = clock`) is watched in every file. Each **read** of `__hushClock` is a finding; assigning a replacement is not.
- **Anything else** (returned, exported, thrown, passed to a call as a statement, stored under a computed key): a finding that no entry can excuse.

An entry for a derived finding extends the watch in turn, so the guard iterates to a fixpoint.

**The studio today** (`scanDirs(STUDIO)`): 99 files judged, 4 studio files followed, 11 locked files followed, 0 in `node_modules`, 0 symlinks, **0 findings**, 6 findings excused, 0 stale, 0 pending, 0 ambiguous; 1.08 s.

- **Locked files followed:** `videos/my-brain-at-2am-v2.js`, `stage2/{softbody,face,type,stage,motion,gl,renderer}.js`, `stage/components/clock.js`, and the live app's `registry.js` and `expressions.js`.
- **The 5 `WALLCLOCK_ALLOWED` entries** are all in frozen v1/v2 stage code (deviation 1). They excuse:
  - `stage2/stage.js:109`, the computed direction import;
  - the v1 clock's captures, `clock.js:42` (`performance.now`, `performance` as a value) and `:44` (`Date` as a value);
  - the clock's two export properties, `clock.js:85–86`.
- **Watched:**
  - bindings `realPerfNow` and `RealDate` (clock.js:42, :44);
  - properties `realNow` (clock.js:85) and `RealDate` (clock.js:86);
  - the global `__hushClock` (clock.js:89).

  Every read of those in any scanned file is a finding. The path WP-00 left open, through `clock.js`, is now closed rather than moved.

### 2. Write audit (`render/lib/write-audit.mjs`)

| Gap | Before | Now |
|---|---|---|
| **2. create-then-delete invisible** | only names missing from the arming listing were findings; a directory whose ctime moved while its names stayed the same was accepted silently, so the 00:56:35 jail-probe breach left `hm guard` green | Two new finding kinds, judged per changed directory against the arming listing. **`touched`**: the directory changed since the baseline, no name it held at arming is gone, and nothing in it accounts for its last change. That is, no entry has a birth time or ctime within `TOUCH_EPS_MS` = 50 ms of the directory's mtime (measured gap for a real create or rename: at most 6.6 ms, 500 samples). That is a file or directory created and deleted again. A directory whose ctime is later than its mtime (mode, owner or attributes changed) is `touched` too. **`created`**: a directory that did not exist at arming. `mkdir` is a write, so an empty directory is no longer exempt. |

Places that churn by design are exempted narrowly, all by exact path, never for what lies below:

- **`EXTERNAL_WRITERS` gains a `touch` scope with one entry, `/tmp` itself.** The harness creates and removes `/tmp/claude-<hex>-cwd` on every shell command. That was observed with read-only `fs.watch` (inotify) in `WORK/tmp/fu1/watch.mjs`.
- **Git and worktree places come from the layout (`worktreePlaces`):**
  - the git directory: every git command takes and drops `index.lock`, and `git status` does it too, as measured;
  - `<git>/worktrees` and `<git>/worktrees/*`;
  - the checkout's top level, `.claude/` and `.claude/worktrees/` (the harness's convention);
  - every directory between a known worktree and the top level.

  These may be created, may change with nothing left behind, and may be removed when they held only worktree places at arming. **This removal rule fixed the red `hm guard` found at the start of FU-1:** the Wave D worktrees had been removed at 23:15–23:18, which deleted `.claude` and `.git/worktrees`.
- **Harness session directories** (`/tmp/claude-*/*/*`, the existing `remove` scope) may now also be *created*. Touching one is still a finding, and so is writing a file there.
- **Unchanged:** npm's compile-cache directories may be created; their entries are each verified as before.

Other changes:

- `gitLayout()` now returns `top` and `mainTop`.
- `auditScope()` returns the layout and treats `<git>/worktrees` (git removes it with the last worktree) as removable.
- A mount point that two mounts' `find` both list is judged once.
- Compiled globs are cached.
- The directory checks are factored into `auditDirectories()`.
- `describeAudit` names the new kinds and their remedy.

**What remains undetectable is stated in the module header:**

- a create-then-delete in a directory that changes visibly again afterwards. That later change masks it; in practice this is where the harness writes constantly: `/root/.claude.json`, `/tmp/claude-*`;
- a create-then-delete directly in the `touch` places (`/tmp`, the git directory, the worktree containers and the checkout's top level). A file *left* there is still reported (`written`, and `git status` for the repository).

**Re-armed after review** (`qa/guard/outside-writes.json`, `since` 2026-10-14T23:49:02.330Z; listing `WORK/guard/listing-2026-10-14T23-49-02-330Z.json.gz`, 27,868 directories, 221,554 entries; schema unchanged, `hm-write-audit/2`). Before arming, against the Wave D baseline, the new audit reported **exactly one** finding:

- **`touched`**: `/tmp/claude-0/…/408ed79f-…/scratchpad` at 22:33:52.871Z.
- **What it was:** the M0 auditor's copy of `docs/wp/WP-02.md`, created there and deleted again (`docs/M0-REPORT.md` §11, "Audit hygiene").
- **Why the old audit missed it:** its scratchpad check passed once the file was gone.

The baseline's reason records this.

## Files

```
render/lib/determinism-scan.mjs     follow node_modules, symlinks, locked code, import maps, frames; cross-file handle watch; 5 reviewed entries
render/lib/write-audit.mjs          touched / created directories, 'touch' scope, worktree places, auditDirectories(), gitLayout top/mainTop
tests/guard/no-wallclock.test.mjs   7 new regression tests, 3 updated (the real studio scan, imports, stage2 under full rules), allowlist premise test
tests/guard/guard-sensitivity.test.mjs   new miniature-machine test: touched / created / metadata, silent harness, git and worktree churn
tests/unit/write-audit.test.mjs     exemption list incl. 'touch', worktreePlaces, gitLayout/auditScope
qa/guard/outside-writes.json        re-armed after review (see above)
docs/wp/FU-1.md                     this report
```

Not committed (`WORK`): `guard/listing-2026-10-14T23-49-02-330Z.json.gz` (machine-local, sha256 in the baseline); `tmp/fu1/` (exploration and dry-run scripts, logs).

No frozen file and nothing in `../hushmallow` was modified; nothing was written outside the studio and `WORK`, as the green `hm guard` at the end shows (it now also catches create-then-delete).

## Acceptance criteria

FU-1's brief has no separate acceptance list in `docs/PHASE2-PLAN.md`. Its criteria are the gaps as stated (WP-00 integrator notes, gaps 2–5; M0 report §9 item 3) plus the brief's own requirements. Each is listed below with the exact command and the measured result.

### 1. `node_modules` reached by engine/composer imports is scanned (WP-00 gap 3)

```
$ node render/lib/write-jail.mjs -- node --test tests/guard/no-wallclock.test.mjs
✔ bypass: code in node_modules that engine code imports is scanned (relative imports into node_modules and package imports)
```

The test tree has:

- `engine/node_modules/x/index.js`, with `Date.now()`, imported relatively by `engine/a.js`;
- a package `pkg` with `exports {".": {browser, default}, "./sub"}` and `main`;
- a CommonJS `require('./lib')` without an extension;
- a scoped dependency `@scope/dep`;
- an unused `engine/node_modules/unused/` and an uninstalled package.

Findings: exactly the clock reads in `engine/node_modules/x/index.js`, `node_modules/pkg/b.js` (the browser entry), `node_modules/pkg/lib.js` (reached through `main.cjs`) and `node_modules/@scope/dep/index.js`. The uninstalled package is a finding. The unused package is not scanned: nothing imports it, so it never runs.

### 2. Symlinked directories are followed (WP-00 gap 4)

```
✔ bypass: symlinked directories are followed, imports through them are judged, links out of the studio are findings
```

- **Followed:** `engine/shared -> ../lib/shared` is walked; its `performance.now()` is reported on the real file `lib/shared/clock.js`.
- **Links out of the studio:**
  - `engine/out -> ../../outside` (a directory) is a finding;
  - so is `composer/x.js -> ../../outside/x.js` (a file);
  - `import '../lib/out/x.js'` through a link out is "imports code from outside the studio (through a symlink)".
- **Both resolutions:** the symlinked file `engine/linked.js -> ../other/linked.js` imports `./helper.js`, and **both** `engine/helper.js` (link path, as browsers resolve it) and `other/helper.js` (real path, as Node resolves it) are judged.
- **Cycles:** `engine/loop -> .` ends.

### 3. Imports of locked code are followed; real-clock handles are findings wherever they are read (WP-00 gap 5)

```
✔ bypass: imports of locked code are followed: a live-app module that reads the clock is a finding (rig.js)
✔ bypass: the v1 clock's real-clock handles (realNow, RealDate, window.__hushClock) are findings wherever they are read
✔ allowlist: a handle that leaves an excused line where the guard cannot follow it is a finding no entry can excuse
✔ imports: studio code imported from elsewhere is scanned too, locked code is followed and judged, unfollowable imports are findings
✔ the allowlist's premise: in the engine page, every stage2 module the frozen v2 module imports is redirected to engine/ by the import map
✔ the code WP-01 forked (stage2/) and the v2 direction under the full rules: the computed direction import and the v1 clock's captures
```

**rig.js.** An engine import of a live-app `rig.js` that calls `Math.random()` and `performance.now()` is reported in `../hushmallow/src/mallows/rig.js`. An entry may pin a line of locked code. Excusing `export const blink = () => Math.random() < 0.1;` still reports "exports the real-clock handle blink".

**The v1 clock.** The test uses the frozen `stage/components/clock.js`, copied read-only into a test tree.

- **Without entries:** importing it gives its 3 capture findings.
- **With the studio's 4 clock entries:** the import is clean, and each of these is a finding:

  | Read | Finding |
  |---|---|
  | `window.__hushClock.realNow()` | the `__hushClock` carrier and the `.realNow` handle |
  | `new clock.RealDate()` | the `.RealDate` handle |
  | `const { realNow } = clock` | the `.realNow` handle |
  | `globalThis['__hush' + 'Clock']` | the `__hushClock` carrier |
  | `Reflect.get(clock, 'realNow')` | a string naming the handle |
  | a bare `__hushClock` | the `__hushClock` carrier |

- **Not a finding:** assigning `window.__hushClock = {…}` installs a replacement, not a read.

**On the real studio:**

```
$ node render/lib/write-jail.mjs -- node -e "…scanDirs(process.cwd())…"
ms 1077 scanned 99 followed 4 locked 11 packages 0 symlinks 0 findings 0 allowed 6 stale 0 pending 0 ambiguous 0
watched: binding realPerfNow <- stage/components/clock.js:42; binding RealDate <- stage/components/clock.js:44;
         property realNow <- stage/components/clock.js:85; property RealDate <- stage/components/clock.js:86;
         global __hushClock <- stage/components/clock.js:89
```

### 4. A file created and deleted again outside the studio is detected (WP-00 gap 2; M0 report §9 item 3)

**Miniature machine** (under `WORK/tmp`, real filesystem calls; `tests/guard/guard-sensitivity.test.mjs`):

```
✔ write audit: a file created and deleted again leaves a touched directory; new directories and metadata changes are reported; harness, git and worktree churn is not
  reported:  created etc/newdir (a new directory)
             touched home/user (changed with nothing left to show for it: a file or directory created and deleted again)
             created home/user/tmpdir (a new directory)
             touched srv (its mode, owner or attributes changed)
             touched tmp/agent/sess/scratchpad (changed with nothing left to show for it: …)
             deleted repo/.claude (a directory with 2 entries at arming)      ← a worktree container that also held settings.json
  silent:    the harness rewriting its config atomically (root/.claude.json), its cwd file in tmp, a new harness session,
             git's index.lock (the git directory and a worktree's admin dir), a worktree added and removed, the last
             worktree removed with .claude/, .claude/worktrees/ and <git>/worktrees
```

**The real machine, without touching it** (a dry run against the WP-00 round-3 baseline of 00:47:08. Its listing is still in `WORK/guard`; the baseline JSON comes from git, `f034da8~1`. Nothing is written outside WORK):

```
$ node render/lib/write-jail.mjs -- node /home/user/hm-work/tmp/fu1/dryrun-round3.mjs
round-3 baseline 2026-10-14T00:47:08.488Z: 106 findings, 0 errors, 2124 ms   (touched 30, created 1, written 75)
  touched  2026-10-14T00:56:35.554Z  /home/user
  touched  2026-10-14T00:56:35.559Z  /home/user/thinkstill-rituals/hushmallow
  touched  2026-10-14T00:56:35.559Z  /usr/local
  touched  2026-10-14T00:56:35.559Z  /run
  touched  2026-10-14T00:56:35.561Z  /dev/shm
  created  2026-10-14T02:35:05.031Z  /root/.config/procps
  touched  2026-10-14T03:20:26.099Z  /usr/lib/python3/dist-packages/yaml/__pycache__   (and pip/_internal/commands/__pycache__)
  touched  2026-10-14T18:28:42.811Z  …/scratchpad/{assets2,…,zuzu}  (its mode, owner or attributes changed)
  touched  2026-10-14T22:33:52.871Z  …/scratchpad
```

- **The 00:56:35 breach of the Wave A review:** a jail probe created and deleted `hm-jail-probe-<pid>` in each protected directory. It is now reported in `/home/user`, the live app's directory, `/usr/local`, `/run` and the host's `/dev/shm`.
- **Masked by later legitimate changes:** `/root` and the repository root (the documented residual limit; the harness later rewrote `/root/.claude.json` and created and removed `.claude/`).
- **The written files and the 18:28:42 metadata bump:** the 75 written files are the scratchpad files whose ctime the environment bumped at 18:28:42, which Wave D already reviewed. The same bump shows on their directories.

Both the 00:56:35 event and the 22:33:52 scratchpad event had left the WP-00 audit green.

**Live, before re-arming** (Wave D baseline 22:09:51): `node cli/hm.mjs guard --json` gave exactly one finding, `touched …/scratchpad [2026-10-14T22:33:52.871Z]`. That is the M0 auditor's copy of `WP-02.md`, created and deleted again (M0 report §11). The audit was re-armed after this review with `node cli/hm.mjs guard --arm --by "FU-1 (guard bypasses)" --reason "…"`.

### 5. The probes are non-mutating

- **Neither guard writes:** the scanner only reads files. The audit only runs `find`, `readdir`, `lstat` and `git config --list`. Arming writes only the baseline (studio) and the listing (WORK).
- **Every sensitivity probe is confined to WORK:** it runs on a throw-away tree under `WORK/tmp` (scanner trees and both miniature machines). The frozen v1 clock is copied *read-only* into a test tree.
- **The real-machine evidence wrote nothing outside WORK:**
  - the round-3 dry run reads a copy of an old baseline in WORK;
  - the harness churn was observed with read-only `fs.watch` (inotify);
  - timestamp tolerances were measured on files created in WORK.
- **The WP-00 jail probe is unchanged:** it still asks the kernel with `access(W_OK)` (the integrator's Wave A change).
- **Proof by the guard itself:** it now detects create-then-delete, and it stayed green over the whole default suite, which ran from 23:49:28 to 23:53:11 after the 23:49:02 re-arm. So no test created and deleted anything outside the studio and WORK. The only blind spots are the `touch` places, and tests run with a private `/tmp` in the jail.

### 6. `hm guard` is green

```
$ node cli/hm.mjs guard                                         (2026-10-14T23:54:46Z, after all suites)
ok    frozen v2 (tree 8d0627dfee6d, local 9a740db17b29)
ok    live app untouched (tree 1bef9b971ea7)
ok    no changes in the repository outside the studio root
ok    nothing written or deleted on this machine outside the studio and WORK, git config unchanged, since 2026-10-14T23:49:02.330Z (/ /dev /dev/shm /run/sandbox-telemetry; 1963 ms)
```

At the start of FU-1 the guard was **red**: `DELETED .claude` and `DELETED .git/worktrees` from the Wave D worktree removal at 23:15–23:18. The worktree housekeeping rule closes that, and the audit time is unchanged (1.8–2.8 s against about 2.0 s).

### 7. A regression test for each bypass, and each one fails on the old guard

Running the new test files against the `HEAD` versions of `determinism-scan.mjs` and `write-audit.mjs` (copied to `WORK/tmp/fu1/old-head/`; the tests are unchanged except for absolute imports of `paths.mjs`):

```
$ node render/lib/write-jail.mjs -- node --test WORK/tmp/fu1/old-head/tests/guard/{no-wallclock,guard-sensitivity}.test.mjs
not ok … write audit: a file created and deleted again leaves a touched directory; …
not ok … imports: studio code imported from elsewhere is scanned too, locked code is followed and judged, …
not ok … bypass: code in node_modules that engine code imports is scanned …
not ok … bypass: symlinked directories are followed, imports through them are judged, links out of the studio are findings
not ok … bypass: imports of locked code are followed: a live-app module that reads the clock is a finding (rig.js)
not ok … bypass: the v1 clock's real-clock handles (realNow, RealDate, window.__hushClock) are findings wherever they are read
not ok … allowlist: a handle that leaves an excused line where the guard cannot follow it is a finding no entry can excuse
not ok … bypass: import maps, frames and script sources of HTML pages are followed
not ok … the code WP-01 forked (stage2/) and the v2 direction under the full rules: …
# pass 127  # fail 10
```

The tenth failure is the real-studio test's diagnostic reading the new `packages` field. The 127 older tests still pass on the old guard, so no earlier case was weakened.

### Hard rules: frozen v2, parity, suites

| Check | Command | Result |
|---|---|---|
| Frozen v2 byte-identical | `node tools/golden/freeze.mjs --check`; `sha256sum -c qa/golden/v2/frozen.sha256 qa/golden/v2/frozen-local.sha256` | frozen v2 OK (tree `8d0627df…`, local `9a740db1…`), live app OK; **53/53 OK** |
| App and frozen paths untouched | `git diff v2-approved -- hushmallow`; `git diff HEAD -- <frozen paths>` | both empty |
| T01 parity | `node cli/hm.mjs test` (parity part) | G-STATE 2,446 rows, 476,585 numbers, **max \|Δ\| 0** (frozen module, engine, composer → runtime v3); composer → runtime v3 **4/4 golden frames bit-identical** |
| Goldens | `node cli/hm.mjs golden verify` | all committed files and 16 PNGs ok; tolerance 0/255, 1e-9 |
| Default suites | `node cli/hm.mjs test` (guard, unit, parity, property; 23:49–23:53, sharing the heavy lock with FU-2's jobs) | **548 tests: 545 pass, 2 fail, 1 skipped** (the opt-in sequential render), 3 min 43 s. The 2 failures are in `tests/unit/audio-lint.test.mjs` ("each limit, walked from both sides", "no false alarms…"). That file imports neither guard module; it fails on FU-2's uncommitted, in-progress edits to `audio/lint-shapes.mjs` and `audio/lint-recipes.mjs`. |
| Guard suite, after the last edits | `node cli/hm.mjs test guard` | **154/154** in 2.8 s (146 at the M0 audit, plus 7 new scanner tests and 1 new sensitivity test) |
| Unit suite, after the last edits | `node cli/hm.mjs test unit` | 356 tests, 354 pass; the same 2 FU-2 audio-lint failures; `tests/unit/write-audit.test.mjs` 14/14 |
| Scanner tests alone | `node --test tests/guard/no-wallclock.test.mjs` (confined) | **130/130**, 0.84 s |

## Deviations

1. **`WALLCLOCK_ALLOWED` is no longer empty: 5 entries, all in hash-locked v1/v2 stage code.**
   - **Why there are findings at all:** following locked code means following the frozen v2 module's literal imports. `engine/directions.js` imports `videos/my-brain-at-2am-v2.js`, which names `../stage2/stage.js`, which imports the v1 clock. In the engine page, `engine/index.html`'s import map sends every one of those `../stage2/*.js` URLs to the engine's own copies, so frozen stage2 and the v1 clock never load there.
   - **Why the guard still judges them:** the guard cannot know which page loads a module. It judges both the literal graph and every import-map target, because the conservative union is the only sound choice.
   - **Why the entries cannot drift:** they pin hash-locked lines.
   - **Why the premise holds:** a new test checks that the import map covers every stage2 import of the v2 module.
   - **Why nothing escapes:** the handles they let out stay watched.
   - **Alternative:** the M0 report suggested flagging every import of locked code unless pinned. Judging the code is stronger, because it verifies instead of trusting. A new locked import with clean code needs no entry; one with findings fails until those findings are reviewed.
2. **Package imports are followed rather than flagged outright.** A bare specifier used to be a finding in itself ("a package (x)"). Now an installed package is resolved and judged; a missing one is still a finding ("a package (x) that is not installed here"). This is what "scan node_modules reached by engine/composer imports" asks for. A package with any clock read, `Function`, `eval` or similar in any entry it exposes still fails.
3. **New directories are findings** (`created`). WP-00 had stated "a new empty directory is not reported (it holds no data)". `mkdir` is a write, and a new directory can hide a create-then-delete inside it.
4. **Three kinds of place carry a `touch` exemption** (`/tmp` itself, the git directory, the worktree containers and the top level). Each changes on every shell command, every git command, or every worktree lifecycle, with nothing left behind. Reporting them would make the guard red all the time; the residual limit is stated in the module.
5. **`docs/CONVENTIONS.md` and `cli/commands/guard.mjs` are not edited.** FU-1 owns only the two modules and their tests, and CONVENTIONS changes go through the lead or integrator. Their text is now partly out of date; proposed replacement text is under "Open issues".

## Open issues and notes for the integrator

- **Commit `qa/guard/outside-writes.json`** (re-armed by FU-1) together with the code. The listing it names is in `WORK/guard/`.
- **`docs/CONVENTIONS.md` §6, proposed text** in place of the "Code that `engine/` and `composer/` import from elsewhere…" bullet and the "There is no inline opt-out" paragraph:
  > Everything `engine/` and `composer/` can load is judged by the same rules, wherever it lives: studio code they import, hash-locked code (the frozen v2 paths and the live app, followed transitively), installed packages (every entry a package can expose), code reached through symlinks (resolved from both the link and the real path), and the addresses of import maps and `<iframe>` pages. URLs, absolute paths, packages that are not installed and files outside the studio and the locked code cannot be imported.
  > The only exceptions are the entries of `WALLCLOCK_ALLOWED` (5 today, all in frozen v1/v2 stage code that the engine page never loads because of its import map). Excusing a finding never excuses the handle: the guard follows the excused value into variables (watched in that file), object properties (the name is watched in every file: `.realNow`, `.RealDate`) and globals (`__hushClock`), and a value that leaves the line any other way is a finding no entry can excuse.
- **`docs/CONVENTIONS.md` §5, proposed addition** to the write-audit list of failures:
  > **touched:** a directory that changed with nothing left to show for it (a file created and deleted again), or whose mode/owner changed; **created:** a directory that did not exist at arming.

  And to "Not reported":
  > `/tmp` itself, the git directory and the worktree containers changing with nothing left behind (harness cwd files, git lock files, worktree lifecycles).
- **`cli/commands/guard.mjs`** prints "nothing written or deleted …"; "written, deleted, created or touched" would match the audit now. (`describeAudit`'s own text is updated.)
- **The 5 locked entries can be removed** if the engine stops importing the frozen v2 module, for example once the v2 route is retired or WP-01 vendors a copy. The guard then reports them as stale, and that is the signal.
- **Residual limits** (also in the module headers):
  - **Scanner:** a property name computed at run time on an object the guard cannot identify; time that arrives as data; what a callee keeps when an excused handle is passed into it on an allowlisted line.
  - **Audit:** a create-then-delete masked by a later visible change in the same directory; a create-then-delete directly in a `touch` place.
- **No VM reboot has happened since the new checks were armed.** The first audit after a reboot may name directories that boot provisioning creates or touches (for example under `/etc`, `/root` or `/run`). Review them and add `EXTERNAL_WRITERS` entries with reasons; do not re-arm blindly.
