# Hushfold vertical slice: integration plan

Repo `/home/user/thinkstill-rituals`, app `hushmallow/`. Written 12 Oct 2026, 19:10 UTC, against HEAD `281bf0a`. Read-only pass: nothing in the repo was edited.

## 0. Baseline (checked just now)

- **Tests.** `node --test hushmallow/tests/*.test.mjs` passes 297/297 in about 15 s, and running it leaves the tree unchanged.
- **Dirty files.** Only W8 r2 files are dirty: `src/beyond/{authored,styles}.js` and `src/beyond/mechanics/{assemble-step,return-responsibility}.js`.
- **Hi-res patch.** `git apply --check hushmallow/tools/hires/rig-res.patch` passes, and the patch is not applied yet. `applyHires` is imported nowhere. `HIRES_VERIFIED` (hires.js:684) still includes `pipzi`.
- **Builders that are live now** (task list):

| Builder | Files | Tasks |
|---|---|---|
| W2b r3 | `src/mallows/thought/**` | #104 in progress, #105-107 pending |
| W4b r2 | `src/hushfold/flow/**` | #99 in progress (rest-rect layout key, frozen glide), #100-103 pending (#100 = hero keep-out for thought/plate/bubbles) |
| W8 r2 | `src/beyond/**` | #92 in progress, #93-96 pending |
| W6t r4 | `server/**` | #97-98 done (angle-v5, gate). `gate-r4-review` is still writing (19:05), so `server/**` stays frozen until it reports. |

- **Where the seam reports are now out of date:**
  - W2b is on round 3, not round 2. `layer.js` is committed (97971f6).
  - `docs/HUSHFOLD.md` is no longer dirty.
  - W8 B1 landed in e58d2cf:
    - another-angle.js `finish()` (:848-863) calls `app.go('home', {safety:{level}})`.
    - `continueFlow()` (:835-846) calls `app.go('home', {flow:{worldId, emotion, intention, text}})`, or `{carry}` when there is no world.
    - hushfold.js:1023-1026 reads only `params.flow.worldId`. It ignores `params.flow.{emotion,intention,text}`, `params.carry` and `params.safety`.
- **The tree moved while this plan was written (19:12).** New dirty files:
  - W2b r3: `src/mallows/thought/{belief,render,styles,thought}.js`, and also **`src/mallows/touch/softbody.js`** (a new `puffK` rest option and an allocation-free rest key). That is the SoftBody shared with the hero.
  - W4b r2 #99: `src/hushfold/flow/worlds/luminous-ocean.js` (+391/−124).
  - W8 r2: `src/beyond/mechanics/{find-boundary,separate-one,shrink-projection,soften-harsh}.js`.
  - Consequences:
    - W2b reaches outside `thought/**`, so A1 must agree file ownership with W2b first (see A1).
    - Every line number cited below for `luminous-ocean.js` is approximate until W4b r2 lands.
    - Q1 (the hero's feel) must be re-run after W2b r3 merges.
- **No builder is touching these integration files:** hushfold.js, stage.js, input-router.js, side-panel.js, input-overlay.js, garden-install.js, main.js, world.js, realm.js, rig.js, mallow-touch.js, registry.js (mallows), expressions.js, index.html, build-site.sh and the workflows.

## 1. Order of work

### 1.1 Map

```
START NOW (separate worktrees, disjoint files)
  A1 hi-res + shared rig loop      src/mallows/{rig,registry,expressions,hires}.js, touch/mallow-touch.js, tests/hires.test.mjs, src/ultra/another-angle.js:486,816
  A2 stage adapters                src/hushfold/stage.js (adapters :1-148 only), src/app/world.js, tests/stage.test.mjs (new)
  A3 input router                  src/hushfold/input-router.js, tests/router.test.mjs (new)
  A4 garden-install                src/hushfold/garden-install.js, tests/garden.test.mjs
  A5 shipping                      .github/workflows/{hushmallow-pages,another-angle}.yml, tools/build-site.sh, tools/site/check.mjs (new), index.html, manifest.webmanifest, src/app/main.js, src/app/config.js (BUILD :31 only)
  A6 realm pause                   src/world/realm.js
  A7 overlay options               src/hushfold/input-overlay.js
  A8 side panel                    src/hushfold/side-panel.js, tests/panel.test.mjs (new)
  H1 shell pass 1                  src/app/scenes/hushfold.js, src/ui/hushfold.css, src/app/scenes/support.js:15, tests/hushfold.test.mjs
                                   (rebase onto A2 before merging; calls into A4/A5/A6/A8 use ?. so nothing hard-depends)
WAIT
  B1 director + worlds   ← W4b r2 done (#103), or hand the list to W4b r2 (#100-102)
  B2 stage on one loop + ThoughtLayer (stage.js createStage)   ← W2b r3 verify (#107) + A2
  B3 ThoughtLayer additive API   → W2b r3 polish (#106) makes these edits itself
  H2 shell pass 2        ← B1 + H1
  H3 shell pass 3        ← B2 + B3 + H2
  B4 Beyond client       ← W8 r2 verify (#96) + A4 + A7
  B5 lexicon + server sync + staging redeploy   ← gate-r4-review reported
  G1 Another Angle go-live commit   ← B4 + B5 + owner L1/L2/L3
  D1 docs                ← everything else
```

**Merge order into the shared tree:** A1, A2, A3, A4, A6, A7, A8, A5, H1, then B1 → H2, then B2 + B3 → H3, then B4 + B5 → G1, then D1. Run the full node suite after every merge, and the Q1 smoke (§3) after every merge from A2 onwards.

**Hard rules:**
- `hushfold.js` has one owner at a time, in the order H1 → H2 → H3. No other unit edits it.
- `stage.js` is A2 first, then B2, run by the same agent or rebased.
- A new test goes into a new test file whenever another unit owns the existing one.

### 1.2 Units

#### A1: hi-res rig and the shared loop (start now)

- **Owns:** `src/mallows/rig.js`, `src/mallows/touch/mallow-touch.js`, `src/mallows/registry.js`, `src/mallows/expressions.js`, `src/mallows/hires.js`, `tests/hires.test.mjs`, `src/ultra/another-angle.js` (:486 and :816 only), `tools/hires/lab/rig-loader.js`.
- **Never touches:** `src/mallows/thought/**` or `src/mallows/touch/softbody.js` (W2b r3 is editing it now).
- **Before starting:** tell W2b that A1 owns the files above for the duration. Before each commit, run `git status --short hushmallow/src/mallows`: if W2b has touched one of A1's files, stop and rebase onto W2b's work.

Edits, one commit each:

1. **Apply the patch.** From the repo root: `git apply --check hushmallow/tools/hires/rig-res.patch && git apply hushmallow/tools/hires/rig-res.patch`.
   - It changes rig.js (art at `m.size`, res-aware spirals and partBounds), mallow-touch.js:330 (`_atSkin` draws at `rig.mallow.size`), registry.js:296 (`m.art || m.file`) and expressions.js:261 (presetOverrides).
   - It is additive: with the current art nothing changes.
   - If it has drifted by then, run `node hushmallow/tools/hires/refresh-patch.mjs`.
2. **rig.js `frame()` (:52-65).** Call `requestAnimationFrame(frame)` first. Wrap `r._tick(dt, t/1000)` (:57) in try/catch and log once per rig. Today one throwing rig stops MallowTouch, the director and the thoughts together.
3. **mallow-touch.js.**
   - `pointer()` :616: also accept a `move` whose `e.id === this.reader._shift?.src` (the same rule as `_bindPointer` :735).
   - Add `wheel(e) { return this.reader?.wheel?.(e); }`.
   - Do not pass `skinSize`, because it turns the adaptive skin off (:117). Leave the `_wantSkin` ceiling at :346 at 768 until A-4 is answered.
4. **Only if the owner says yes to A-1.**
   - hires.js:684 becomes `['glitzi','zuzu','boppo','blubi','noomi']`, keeping one source of truth.
   - registry.js: add `import { applyHires } from './hires.js';`, then after SPRITES (:261-266) add `export const HIRES_ON = (typeof location !== 'undefined' && new URLSearchParams(location.search).get('hires') === '0') ? [] : applyHires(MALLOWS, SPRITES);`.
   - tests/hires.test.mjs :292-299 ('open mouths…') and :104-127 ('others untouched') compare against `tools/hires/data/old-registry.json`, not the live MALLOWS. Never regenerate that JSON.
   - src/ultra/another-angle.js:486 and :816: use `MALLOWS[id].file` instead of `assets/mallows/${id}.png`.
5. After step 4 is merged, delete the blob-patch path in `tools/hires/lab/rig-loader.js`.
6. Optional: snap Zuzu's spin to the painted phase. At rig.js:149 use `this.mallow.hires ? 0 : Math.random()*6`, and near :691 ease towards a 2π multiple at rest.

Done when:
- `git apply --check -R hushmallow/tools/hires/rig-res.patch` exits 0.
- The suite is green, with hires.test 15/15.
- A new node test passes: two tickers plus a fake rig whose `_tick` throws, and both tickers still fire on the next frame.
- `node /tmp/claude-0/hf/plan/scripts/shell-touch.cjs http://localhost:8000/hushmallow/index.html '?touch=1' 390 844` passes. For tiers A, B and C, `touch.setQuality('gl'|'tri'|'strip')` gives screenshots of the whole hi-res Glitzi at rest, with no 2.6× crop. After step 4, `touch.rig.assets.original.naturalWidth` is 1024 for the five and 434/363 for pipzi/loomi.

In flux: the static drawImage guard at tests/hires.test.mjs:346 also scans `thought/**`. Re-run it after W2b r3 merges.

#### A2: stage adapters and `world.releaseMallow` (start now)

- **Owns:** `src/hushfold/stage.js` :1-148 (`createStage` stays as it is until B2), `src/app/world.js`, `tests/stage.test.mjs` (new).

Edits:
- **`createStageMallow`** :30: `if (touch) return touchAdapter(touch, world);`.
- **`touchAdapter(t, world)`** :116-148:
  - `get ready() { return !!t.ready; }` (:123 is `return true` today).
  - `setStage: (n, o) => t.setStage(n, o)` and `react: (k, o) => t.react(k, o)` (:126-127). This way `{quiet:true}` from hushfold.js:152, 158, 547, 554, 577, 604, 685 and 884 reaches MallowTouch (no anticipation squash or blink on the care face).
  - `setEmotion: (mix, i, o) => { t.setEmotion(mix, i, o); const top = typeof mix === 'string' ? mix : Object.entries(mix || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral'; world?.realm?.setEmotion?.(top, i ?? 0.7); }`. Rig mode already does this in world.js setEmotion.
  - `rect: () => t.rect()`. `MallowTouch.rect()` is a bodyRect alias (mallow-touch.js:595). static-storm.js:177 and :1488 call only `mallow?.rect?.()`.
  - `fit({ cx, cy, size }) { t.place({ x: cx, y: cy, size }); }`, replacing the private `t._P()/t.st.s` at :138-142. This fixes the measured 2.34 → 1.02 entrance glide.
  - Add `setMallow: (id) => t.setMallow(id)`, `get loaded() { return t.loaded; }`, `get tier() { return t.stats?.tier; }` and `wheel: (e) => t.wheel?.(e)`.
- **Rig adapter** :71-111:
  - Add `rect() { return world.bodyRect(); }`.
  - Replace `float() {}` (:84) with the lab's float from placeholders.js:46-55: CSS `translate`/`rotate` on `rig.canvas`, transformOrigin '50% 82%', lift × bodyRect height. Clear `style.translate`/`style.rotate` in `detach()`.
- **world.js:** add `releaseMallow() { if (rig) { rig.destroy(); rig.container?.remove(); rig = null; mallowId = null; } }`, adapted to world.js's own variable names. garden.js:913, the classic scene and the ritual scenes recreate the rig through `setMallow` on enter.
- Keep the shape `kind: 'touch',[\s\S]*?multiTouch: true` that hushfold.test.mjs:569 matches.

Done when:
- The suite is green.
- `tests/stage.test.mjs` passes. With a fake MallowTouch that records its arguments: setStage/react pass opts through, fit calls `place({x,y,size})`, and both adapters have `rect` and `float`.
- In shell-touch.cjs, the 50 ms sampler shows `touch.st.s === touch.goalSt.s` from the first ready frame.
- **W8 smoke**, because W8 uses this adapter at another-angle.js:354, :896 and :901: ultra entitlement, `#angle` at 390×844. Screenshot before and after: Zuzu and the companion are at the same position and size, within 4 px.

#### A3: input router (start now)

- **Owns:** `src/hushfold/input-router.js`, `tests/router.test.mjs` (new).

Edits:
- `routed()` :19-22: add `shift: !!e.shiftKey, mouse: e.pointerType === 'mouse'`. This makes TouchReader's Shift-drag stretch (gestures.js:148) reachable.
- Change `setWorld(fn)` to `setWorld(fn, { thoughts = false } = {})`, storing `worldOwnsThoughts = !!fn && thoughts`. In `down()` :55, `else if (!worldOwnsThoughts && (th = thoughts?.hitTest?.(x, y)))` means that while a world owns the thoughts, Thought Mallow hits go to `'world'`. The world then forwards them to `thought.pointer` itself (director.js:23-28; static-storm.js:436/456/482; luminous-ocean.js:445-481).
- Add a `wheel` listener on `el` (`{passive:false}`). If `e.ctrlKey && mallow?.hitTest?.(e.clientX, e.clientY)`, call `preventDefault()` and then `mallow.wheel?.({ x: e.clientX, y: e.clientY, deltaY: e.deltaY, t: e.timeStamp })`. This is the desktop trackpad pinch (gestures.js:483).
- Optional: velocity from `createVelocity` (flow/velocity.js), as the W4a note asked.

Done when:
- The suite is green, including hushfold.test.mjs:537.
- In `tests/router.test.mjs` (fake DOM as in hushfold.test.mjs:549): a thought hit reaches `thoughts.pointer` without the flag and the world fn with `{thoughts:true}`, and the routed event carries `shift`.
- W8 (another-angle.js:882) calls `createInputRouter` without a second `setWorld` argument, so its behaviour is unchanged.

#### A4: garden-install (start now; W5 is finished)

- **Owns:** `src/hushfold/garden-install.js`, `tests/garden.test.mjs`.

Edits:
- **`keepDiscovery`** :1210-1219:
  - If `signal?.aborted` before the install, return `{kept:true, already:false, stored:true, action:null}`.
  - Then: `const handle = playInstall({...}); const onAbort = () => handle.cancel?.(); signal?.addEventListener?.('abort', onAbort, { once: true }); const r = await handle; signal?.removeEventListener?.('abort', onAbort);`.
  - `playInstall` already returns a promise with `cancel()` (garden-install.js:22 and :1174). Today the signal only reaches `offerSave`.
- **`screenFrame`** :414 and :417: use `.hf-top, .bx-top` and `.hf-dock > *, .bx-dock > *`. Beyond's top bar and dock (another-angle.js:71, :77) are ignored today.
- **`export function relayoutInstall()`** calls `openOffer?.__place?.()` and `openCard?.__place?.()`.
  - Set `el.__place = () => { if (!folded) geom = place(); }` in offerSave near :698.
  - Set `card.__place = onResize` in playInstall near :1165.
  - Never dispatch a synthetic `resize` instead: hushfold's onResize calls `layout()` and would loop.
- **Events:** dispatch `window` `hm:offer` `{phase:'open'|'fold'|'unfold'|'close'}` at :658, :666, :668 and :690.
- Keep `export const onOffer = keepDiscovery;` (garden.test.mjs:255).

Done when:
- garden.test passes 19/19, plus a new test: aborting during playInstall removes `.hm-install` and the promise resolves.
- Screenshots of `?gardenlab=offer` and `?gardenlab=install` at 390×844 and 320×568 are unchanged.

#### A5: shipping (start now)

- **Owns:** `.github/workflows/hushmallow-pages.yml`, `.github/workflows/another-angle.yml` (one new step), `tools/build-site.sh`, `tools/site/check.mjs` (new, ported from `/tmp/claude-0/hf/plan/scripts/crawl.mjs` and `assets.mjs`), `index.html`, `manifest.webmanifest`, `src/app/main.js`, `src/app/config.js` (only the BUILD label at :31).

Edits:
- **hushmallow-pages.yml:**
  - `name: Publish hushmallow` (:5), and lowercase the comments at :1 and :4.
  - Replace the paths at :11 with: `'hushmallow/**'`, `'!hushmallow/server/**'`, `'hushmallow/server/another-angle/src/vocab.js'` (tests/beyond.test.mjs:10 imports it) and `'.github/workflows/hushmallow-pages.yml'`. Then add negations for `docs/**`, `**/*.md`, `content/**`, `assets/source/**` and `tools/**`, re-including `tools/build-site.sh` and `tools/site/**`.
  - Add a `pull_request:` trigger with the same paths, `if: github.event_name != 'pull_request'` on the deploy job, and `timeout-minutes: 10` on the test job.
- **another-angle.yml:** after the smoke test (:126-130), add `E2E_INVITE="${TESTER_INVITE_CODES%%,*}" node scripts/e2e.mjs "$url" --origin https://ramkumarjothi1982.github.io`.
- **build-site.sh:**
  - :17: copy with `for d in "$here"/assets/*/; do n=$(basename "$d"); [ "$n" = source ] || cp -r "$d" "$out/v/$ver/assets/$n"; done`.
  - :16: also `rm -rf "$out/v/$ver/src/studio"`.
  - Then run `node "$here/tools/site/check.mjs" "$out" "$ver"`, allowlisting `v3/dev/`.
- **index.html:**
  - `<link rel="stylesheet" href="src/ui/hushfold.css">` after app.css (:20). main.js:253 `ensureStylesheet` then skips the injection.
  - A classic `hmStale()` script (fetches `version.json` with no-store and calls `location.replace('./?v=…')`), plus `onerror="hmStale()"` on the module script (:29).
  - Optional: `<link rel="modulepreload" href="src/mallows/touch/mallow-touch.js">`, only if the sed in build-site.sh rewrites `href="src/`.
- **main.js:**
  - :102: `docTitle(view.title)` from src/brand.js:38, behind a `goSeq` guard so only the latest `go()` sets the title.
  - Add `app.staleCode()` (`checkVersion()` → `applyUpdateIfSafe`), an `unhandledrejection` listener matching `/Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i`, and a 10-minute visible-only `checkVersion`.
- **manifest:** add `"id":"./"` and `"scope":"./"`.

Done when:
- `bash hushmallow/tools/build-site.sh /tmp/claude-0/hf/plan/site t1` runs and check.mjs exits 0. The crawl finds only the localhost-only `v3/dev/sample-photos.js` missing, and assets show 0 of 60 missing.
- `smoke.cjs` on a Pages-like path shows no 4xx, no console errors, title `hushmallow`, hushfold.css served from index.html, both HM fonts and the icons returning 200.
- `stale.cjs` (build old1, load, rebuild as new2, tap `[data-hf=panel-handle]`): the panel opens, or the page lands on `?v=new2` within 5 s.
- Cached-root check: the old index.html over the new root leads to `?v=new2`.
- Title check: `go('settings')` immediately followed by `go('home')` ends with the title `hushmallow`.
- `python3 -c "import yaml…"` prints `Publish hushmallow` and the negated server path.
- Note: core.test.mjs:71-101 scans only `src/*.js`, and the inline `version.json` fetch lives in index.html, outside it. Say so in that test's comment.

#### A6: realm pause (start now; W4 area outside W4b r2's scope, so tell W4b)

- **Owns:** `src/world/realm.js`.
- **Edit:** on the `mountRealm` handle (:449-470), add `pause(b) { held = !!b; if (held) stop(); else start(); return handle; }`. `shouldRun` (:427) returns false while held.
- **Done when:** flow, garden and ocean tests are green; realms.html and the studio are unchanged; with `world.realm.pause(true)`, a monkeypatched `world.realm.core.draw` counts 0 calls in 2 s.

#### A7: input-overlay options (start now)

- **Owns:** `src/hushfold/input-overlay.js`.
- **Edit:** apply `/tmp/claude-0/hf/plan/beyond-seam/input-overlay.diff`.
  - `openInput({…, photos = true, privacyNote = null})` (:50-51) and its header doc (:15-17).
  - When `!photos`, `photoBtn` is null (:85), and `togglePhotos()` starts with `if (!photoBtn) return;` (:113).
  - `setNote()` (:192-196) uses `privacyNote`.
- **Done when:** the Hushfold overlay screenshot is unchanged (Photos button and 'Your words stay on this phone.' at 390 and 320), and the suite is green.

#### A8: side panel (start now)

- **Owns:** `src/hushfold/side-panel.js`, `tests/panel.test.mjs` (new, static).

Edits:
- **New option `onAngle`.** Add `angleLink = link('sparkle', 'Another Angle', () => { api.close(); onAngle ? onAngle() : app.go('angle'); }, 'With Zuzu, a fresh side to something real')`, hidden by default, as the first child of `.hf-links` (:74). In `update()`: `angleLink.hidden = !(s.angle ?? ent.has('ultra'))`. The 'sparkle' icon exists (icons.js:27).
- **'Drift on' button** beside Stay (:47 and :71): `flow.next()`. Enabled when `st.worldId && (st.nextId || st.complete) && !s.locked`.
- **Stay:** `aria-pressed = !!st.staying`. Un-staying needs the director's `stay(false)` (B1), because `next()` melts. Until then the button is not a toggle.
- **`flowNote`** :144: `st.title ?? s.worldTitle` (the director has no `title` today).
- **`act()`:** when `state().locked` (crisis hold), Pause, Resume, Stay and Drift on do nothing, and the buttons are disabled. Today side-panel.js:91 calls `flow.resume()` directly.

Done when: the static test passes; screenshots of the panel as a 320×568 bottom sheet and as the 1280×800 side panel show every row reachable with no clipped buttons.

#### H1: shell pass 1 (start now; rebase onto A2 before merging)

- **Owns:** `src/app/scenes/hushfold.js`, `src/ui/hushfold.css`, `src/app/scenes/support.js` (:15), `tests/hushfold.test.mjs`.
- **Test constraints to keep:**
  - hushfold.test.mjs:476 strings.
  - :595 regex `…'concern'\) \{[^}]*await careBeat`. Put no `{…}` before `await careBeat` in that if-body; new care logic goes inside careBeat.
  - :192-196 order crisis → care → D4.
  - :220 switchMallow slice.
  - The `if (S.crisisSpoken) say(` literal at :631.
  - garden.test.mjs:247, which needs the literal `install.onOffer(`.

Edits:

1. **MallowTouch by default.** In `enter()` :976-993:
   - Condition: `const dev = ['localhost','127.0.0.1'].includes(location.hostname), qs = new URLSearchParams(location.search); if (!(dev && qs.get('touch') === '0') && prefs.get('mallowTouch') !== false) {…}`.
   - Inside the branch, first `world.showMallow(false); world.releaseMallow?.();`. Do this before the dynamic import; today :976 shows the classic rig and :991 hides it later.
   - `touchBox = h('div', { class: 'hf-touch' })`, with no `aria-hidden` (MallowTouch's root is a focusable role=button with instructions, mallow-touch.js:450-455).
   - Constructor options gain `quality: (dev && qs.get('tier')) || 'auto'` and `reducedMotion: prefs.get('motion') === 'system' ? undefined : prefs.reducedMotion()` (follows the OS live, :115).
   - Then `await Promise.race([touchMt.loaded, timeout(5000)])` before `createStageMallow`. On reject: `touchMt.destroy(); touchBox.remove(); touchMt = null; world.showMallow(true)` and use the rig adapter.
   - The prefs `onChange('motion')` at :1010 passes `undefined` when the value is 'system'.
   - showMallow :425: wrap `await touchMt.loaded` in try/catch.
   - QA hook :1018: `get touch() { return touchMt; }`.
2. **World start and end.**
   - onWorld :349-370: call `world.realm?.pause?.(true)` and record `S.worldTitle = d?.title || S.worldTitle`.
   - endWorldMode :371-382: start with `stageMallow?.float?.({ lift: 0, tilt: 0 })`, then `world.realm?.pause?.(false)` and `showMallow(mallowId, { entrance: !gentle() })`.
   - onFinished :383-390: start with `world.realm?.pause?.(false)`. When `gentle()`, say no `SHARED_LINES.finished`; use `stageMallow.setStage(CARE_FACE,{quiet:true})` and `say(SHARED_LINES.careQuiet)`. When `S.crisis`, say nothing new.
3. **Garden offer.** Rewrite `onOffer` (:401-418) and delete the fallback at :410-417:
   ```js
   if (S.left || S.crisis) return;
   let install; try { install = installMod ||= await import('../../hushfold/garden-install.js'); } catch (e) { console.warn('[garden]', e?.message); app.staleCode?.(); return; }
   let host = null; try { host = (await import('../../hushfold/flow/registry.js')).registry.get(worldId)?.mallow?.id || null; } catch {}
   if (S.left || S.crisis || !ent.has('paid')) return;
   const origin = () => stageMallow?.bodyRect?.() || null;
   const face = () => { try { return install.mallowFaceRect(origin(), MALLOWS[mallowId]); } catch { return null; } };
   const ctl = offerCtl = new AbortController();
   try { await install.onOffer({ app, store, skillId, worldId, mallow: MALLOWS[host] ? host : mallowId, origin, face, avoid: offerAvoid,
     subtitles: installSubtitles, reducedMotion: prefs.reducedMotion(), lowStim: !!prefs.get('lowStim'), signal: ctl.signal }); }
   catch (e) { console.warn('[garden] onOffer', e); }
   finally { if (offerCtl === ctl) offerCtl = null; installSubtitles.resume(); if (!S.left) app.applyUpdateIfSafe?.(); }
   ```
   - State near :161: `let installMod = null, offerCtl = null;`.
   - `offerAvoid()` returns `[...(flowRef?.avoid?.() || []), worldMode ? flowRef?.subtitleBand?.() : null, worldThoughtRect(), ...(stage?.thoughts.rects() || []), overlay?.rect?.(), panel?.isOpen ? panel.el.getBoundingClientRect() : null].filter(Boolean)`. Leave out `mallowAvoidRect()`: the face is protected through `face`. If 320×568 then gets the `squeezed` form, drop the subtitleBand there.
   - `installSubtitles = { pause() { held = !subtitles.paused; subtitles.clear({ keepHeld: true }); subtitles.pause(); }, resume() { if (held) { held = false; subtitles.resume(); } } }`, using its own `held` variable. Today flowSubtitles.resume un-pauses the person's own ⏸.
   - Subtitles avoid :94: append `...(installMod?.installAvoidRects?.() || [])`.
   - `safeForUpdate` :1069: `if (document.querySelector('.hm-offer.is-in') || document.body.classList.contains('hm-installing')) return false;`.
   - `leave()` :1030: `offerCtl?.abort()`.
   - End of `layout()` :240: `installMod?.relayoutInstall?.()`.
4. **Safety in a running world, interim.** This uses only today's director `pause()`, `finish()` and `setAutoFlow()`.
   - `noteSafety` (:536-549) calls a new `safetyHold(level)` whenever the level rises:
     - Crisis: `offerCtl?.abort(); stage?.thoughts.release(900); S.hold = 'crisis';`. If a world is running: `flowRef.setAutoFlow?.(false); flowRef.pause?.();`.
     - Care or concern: `stage?.thoughts.release(900)` (owner P-5).
     - If `flowP` is pending and `!worldMode`: `S.holdOnWorld = level`. `onWorld` checks this first, pauses at once, and for crisis finishes.
   - Crisis with the overlay closed or sent: in the afterTell crisis branch (:627-635) and in the overlay's onClose when `S.level === 'crisis'`, call `if (worldMode) flowRef?.finish?.()`.
   - Care in a world: inside `careBeat` (:681), first `if (worldMode) { flowRef?.pause?.(); S.hold = 'care'; }`. 'Stay here quietly' keeps it paused, and Resume is allowed. 'Play' in a world uses today's `startFlow({worldId})` hard cut; H2 replaces it with a melt.
   - Guards:
     - `onPaused` :330: for crisis, no pill and no line; for care, the pill but no 'Paused' line.
     - Refuse to resume while `S.hold === 'crisis'` in `resumeFlow` :339, `holdWorld(false)` :837-845, the subtitles `onControl` :99 and the panel `onPause` :798, which returns true.
     - `flowSubtitles.say/choice` (:267-273) return `Promise.resolve(null)` while `S.hold === 'crisis'`.
   - Offers while `S.hold === 'care'` are owner question P-4. The default is no offer.
5. **Earlier words in a gentle world.** In `startFlow` (:710), right after `requireEntitlement`: `if (gentle()) wordsCur = null;`. This fixes careBeat :705 handing the earlier words to the gentle world through :727 `handThought`.
6. **Coming back from Another Angle.** In `enter()` before `resumePendingTell()` (:1022): `if (params.safety?.level) { noteSafety(params.safety); S.careSaid = true; }`. For `params.flow`: `if (params.flow?.emotion) await setFeeling(params.flow.emotion, { quiet: true }); if (params.flow?.intention) S.intention = params.flow.intention;` before `startFlow`. `params.flow.text` waits for owner P-15.
7. **Panel state.** In `ensurePanel()` :782-801:
   - `state()` adds `angle: ent.has('ultra') && !gentle()`, `worldTitle: S.worldTitle` and `locked: S.hold === 'crisis'`.
   - `onAngle: () => app.go('angle', S.level === 'none' && words.full ? { text: words.full } : {})`. Prefilling the words waits for owner P-15; until then pass `{}`.
8. **Warm the lazy modules.** In idle after `opening()`: `Promise.all([import('../../hushfold/input-overlay.js'), import('../../hushfold/side-panel.js'), import('../../hushfold/flow/director.js'), import('../../hushfold/flow/registry.js').then((m) => { m.registry.prefetch?.('static-storm'); m.registry.prefetch?.('luminous-ocean'); }), import('../../hushfold/garden-install.js')]).catch(() => app.staleCode?.())`. Also call `app.staleCode?.()` on director `error` events of kind `load`.
9. **CSS.** hushfold.css:44-45: add `!important` to the `body.hf-world-leaving` `opacity:0` rule. The director's inline `opacity:'1'` (director.js:184) beats it today, so Finish hard-cuts.
10. **support.js:15:** `app.world?.setStage?.(urgent ? 'concerned' : 'comforting')`.
11. **New static guards in tests/hushfold.test.mjs:**
    - `.hf-touch` is created without `aria-hidden`.
    - The condition `prefs.get('mallowTouch') !== false` is present.
    - onOffer passes `signal:` and `avoid:`, and no `fx:`.
    - `startFlow` clears the words when `gentle()`.
    - `noteSafety` calls `safetyHold`.
    - `onWorld` reads `holdOnWorld`.

Done when: the suite is green, and §3 checks Q1, Q2, Q3, Q6, Q10 (finish fade), Q11a/c/d/e/g (interim), Q17 and Q18 pass at 390×844 and 320×568.

#### B1: director and worlds (W4b files; send to W4b r2, or start after #103)

- **Owns:** `src/hushfold/flow/{director,registry}.js`, `worlds/static-storm.js`, `worlds/luminous-ocean.js`, `tests/flow.test.mjs`, `tests/ocean.test.mjs`.

**Director (director.js):**
- **Gentle sessions.**
  - `start()` :423 destructures `gentle = false` and stores `session.gentle`. Pass `{gentle}` into `registry.select` at :442 and into pickNext at :365.
  - Add a `ctx.gentle` getter in makeCtx (:254-300).
  - Add `setGentle(b)`: `nextChoice = null`, call `cur.world.setGentle?.(b)`, emit `'gentle'`. Session only; never persisted.
  - `state` (:910-917) gains `gentle` and `title: cur?.entry.title`.
- **Safety stop.**
  - `pause(o = {})` :836: when `!cur && phase === 'loading'`, set `pausePending = o.reason || true`. In `start()`, after `await prepare(cur)` (:457), if `pausePending` is set, enter the world paused, veil it, don't step, and emit `pause {reason}`.
  - `finish(o = {})` :855-866: `++startToken`, which `start()` checks after every await (:453, :457) so that a finish during loading wins. Also clear `choiceOpen`, set `hushed = true`, and emit `finish {worldId, reason}`.
  - `discover()` :526-550: return false when `paused || phase === 'finished'`. Skip the 'offer' emit at :542-545 when `hushed`.
  - `onComplete`'s say (:561) gets the same guard, and the wait loop at :570 stops once finished.
- **Melt and host.**
  - beginMelt :506: `emit('melt', { from: from.id, to: to.id, k: 0, mallow: to.entry.mallow?.id })`. Additive: ocean.test.mjs:392 still sees k values [0,1].
  - In `step()` :728-734, once per melt when `melt.e` first reaches 0.5: `emit('host', { from: from.id, to: to.id, mallow: to.entry.mallow?.id, k: melt.k })`.
- **Holds.** Add `hold(key, on)` over a Set. `canMelt` (:486-492) returns false while `holds.size`, `discoveryPending > 0` or `subtitles?.holding`. `safeForUpdate` (:921) returns false while anything is held.
- **Chosen next world.** `next({worldId} = {})`: when the world is playable and has not failed, set `nextChoice = {id: worldId, bags: persist.bags}`. Drop a staged `inc` whose id differs, with `destroyInstance(inc); staging = null;`.
- **Stay toggle.** `stay(on = true)`: `stay(false)` clears `cur.staying` without melting.

**Registry (registry.js):**
- `calm: true` on LUMINOUS_OCEAN (:132-224) and `calm: false` on STATIC_STORM (:38-130).
- `selectNext` (:285-320) keeps only `e.calm` worlds when `state.gentle`. In a gentle session that gives 'none' after the ocean.
- What follows the ocean otherwise is owner question P-1.

**Static Storm (static-storm.js):**
- `enter()` :1497: `react('appear')` only when `!(thought?.ov?.appear >= 1)`, otherwise `react('notice')`.
- `layout()` :214-216: seed `tSpring` at `thought.x/y` when the handle already has a position.
- :832: `thought.scale = tScale * tR / (thought.r || tR)`, eased in from the current size, and `thought.labelSide = 'below'`.
- :835: quantise `soften(k)` to 0.05 steps.
- `clearOfThought`/`thoughtYields`/`avoid` (:899-935, :1554): use `thought.extent?.()` plus `ctx.thoughtLayer?.rects()`, matched by id.

**Luminous Ocean (luminous-ocean.js):**
- :857: `thought.z = st.distance; thought.scale = tS.surf / (1 - 0.5 * thought.z);`. Today `z = dist ≥ 1` clamps to 1: half size, alpha 0.72, one line of words.
- :1555: the same appear → notice rule.

W4b r2 #100 (hero keep-out) needs `mallow.rect()` in the shell. A2 provides it; the lab already has it.

Done when:
- ocean.test still sees melt k values [0,1].
- New flow tests pass:
  - `selectNext({gentle:true})` returns only calm worlds, and 'none' after the ocean.
  - `start({gentle:true})` picks luminous-ocean.
  - `pause({reason:'safety'})` during loading enters paused with the loop stopped.
  - `finish()` during loading makes `start()` resolve null, and the phase stays 'finished'.
  - There is exactly one 'host' per melt, with 0.45 ≤ k ≤ 0.6.
  - `hold('offer', true)` keeps the phase 'playing' with autoFlow on and the world complete.
  - `state.title === entry.title`.
- In the lab `?hushflow=static-storm&next=luminous-ocean`, the melt's minimum luminance stays ≥ 40 (W4b measured 46).

#### B2: stage on one loop, with W2b's ThoughtLayer (after #107 and A2)

- **Owns:** `src/hushfold/stage.js` (createStage :150-433), `tests/stage.test.mjs`.
- **Delete:** the header :14-19, TINTS/MOTION/BASE_TENSION/excerpt :229-248, the placeholder `createThoughtLayer` :250-365, `drawThought` :367-433, the own rAF loop `frame`/`kick` :169-204 and its visibilitychange handler. The rig loop already handles visibility (rig.js:75-77). Import `{ addTicker, removeTicker }` from `'../mallows/rig.js'`.
- **New signature:** `createStage({ fx, tagRoot, reducedMotion, lowStim, onReadThought, keepOut, bounds, haptic, audio })`.
- **Lazy layer:** `ready = import('../mallows/thought/index.js').then(({ ThoughtLayer }) => destroyed ? null : (layer = new ThoughtLayer({ ctx2d: g, tagRoot, keepOut, bounds, onRead: onReadThought, reducedMotion, lowStim, haptic, audio })))`.
- **One tick, in this order:** `worldTick?.(dt, t)` (the director, so worlds write the thought's x/y/z/scale/rot/state/labelSide first), then `if (frozen) return`, then skip when idle, then clear, ripples, and `layer.frame(dt, t)`, with DOM tag writes last.
- **Returns:** `{ canvas, get thoughts() { return layer || EMPTY }, whenThoughts: () => ready, start(), worldTicker: { add, remove }, freeze(b), ripple(x, y, c), kick(), get size(), destroy() }`.
  - `EMPTY` is frozen: `{ list: [], primary: null, rects: () => [], hitTest: () => null, pointer: () => false, release() {}, hideTags() {}, roominess: Infinity, tagOf: () => null }`.
- **Done when:**
  - Static: stage.js contains no `requestAnimationFrame(` and imports `mallows/thought`.
  - A Node ordering test passes: with a fake ticker as `worldTicker` and a real ThoughtLayer without tags, a world writes `thought.x = 200`, and after `layer.frame` in the same tick, `th.render.cx - th.off.x` is within 1 px of 200.

#### B3: additive ThoughtLayer API (W2b edits it, as part of #106)

Asks:
- (a) `release(ms = 700, which = null)`, where `which` is one thought or an array. **Hard dependency for H3**: the primary rides into the world while the others drift off.
- (b) `get primary()` (layer.js:165) skips leaving thoughts.
- (c) A public `leaving` getter on ThoughtMallow.
- (d) `.tm-tag` uses `z-index: var(--tm-z, 1)` instead of the hard-coded 6 (layer.js:54). Today it paints over `.hf-panel` (z5), `.hf-input` (z4) and `.bx-consent` (z4).
- (e) A `textScale: () => k` option, used in `_tagMax`/`_measureTag` and the tag font size. Text size 1.25 is ignored today; the placeholder honoured `--hf-k`.
- (f) A public `relayout()`.
- (g) Optional: an opacity the world can write, for the ocean's surfacing fade.

If (b)/(c) are missing, H3 filters `!t._leaving`. If (d) is missing, H3 uses `.hushfold .tm-tag{z-index:1 !important}`.

#### H2: shell pass 2 (after B1)

- **getFlow** :308-311:
  - Pass `subtitleBand: () => bandPx`, the shell's band height. `layout()` :188 sets `bandPx = band`, and director `bandRect` (:229-234) expects a number.
  - `f.on('melt', (d) => { if (d.k === 0 && d.mallow) import('../../mallows/registry.js').then((r) => r.loadMallowAssets(d.mallow)).catch(() => {}); })`. `loadMallowAssets` is at registry.js:288.
  - `f.on('host', (d) => hostMallow(d.mallow))`. `hostMallow(id)` is :359-364 factored out: `homeMallow ||= mallowId; mallowId = id; theme(); showMallow(id, { entrance: false }); if (!prefs.reducedMotion()) stageMallow.react('hop');`. `onWorld` then sees `d.mallow === mallowId` and skips its end-of-melt swap.
  - Do not swap on a timer: it fires during a paused melt.
- **Prefetch** the first host's art in `startFlow`: `loadMallowAssets(registry.get(worldId)?.mallow?.id)`.
- **onOffer:** call `flowRef.hold?.('offer', true)` before `install.onOffer`, and `hold('offer', false)` in `finally` and on `hm:offer` 'fold' (FOLD_AFTER.offer is 16 s, garden-install.js:58).
- **Full safety hold:**
  - `pause({reason:'safety'})` now also works during loading, so drop `holdOnWorld`.
  - Crisis with the overlay closed calls `finish({reason:'safety'})`.
  - Care, then 'play' in a world: `flowRef.setGentle(true)`, then `flowRef.state.worldId === 'luminous-ocean' ? flowRef.resume() : flowRef.next({ worldId: 'luminous-ocean' })`. That is a melt, not a hard cut.
- **Subtitle bounds** :93: when `worldMode && !panelSheet()`, the top is `flowRef.subtitleBand().y`.
- **Sheets:** `trackSheet` (:120-147) holds the world while any sheet is open in a world. `.hf-subs` is hidden under sheets (hushfold.css:329), so today the world keeps talking unseen.

Done when: Q7 (host at 0.45-0.6), Q9 and Q11b pass.

#### H3: shell pass 3 (after B2, B3 and H2)

Edits:
- **createStage** :978-979: pass `keepOut: () => mallowAvoidRect()`, `bounds: () => thoughtBounds` (a cached object), `haptic` and a live sound `audio: { fx: (n, o) => prefs.get('sound') ? app.audio?.fx?.(n, o) : false }`.
- Call `stage.start()` after `await rigP` (:1005).
- **layout():**
  - At the end, fill `thoughtBounds`: left/right edges with the panel, the top under the overlay or the band, the bottom above the dock or sheet, minus 10.
  - Delete :229-237, the tag clamp and the moveHome column.
  - Call `stage.thoughts.hideTags(tagsAway)` at :212.
  - Re-run layout from `showTell()` (:527), the supportPill toggles (:545, :683) and the paused pill.
- **`spawnThought`** :758-769 becomes `async`:
  - Return early on `!stage || !text || gentle()`, then `await stage.whenThoughts()` and check again.
  - The cap is 3 at home and 1 in a world, using `L.release(900, live.slice(0, n))` and never `remove()`.
  - Use `add({text, emotion, intensity, r}, {from, home: thoughtHome})`.
  - In afterTell :650: `if (text) spawnThought(text, emotion, { inWorld: worldMode })`.
- **getFlow:** `await stage.whenThoughts()`, then `thoughts: gentle() ? null : stage.thoughts, ticker: stage.worldTicker`, and delete `thought: null`.
  - `f.on('pause', () => { stage.freeze(true); onPaused(true); })` and the matching resume handler. The freeze goes before onPaused's `held` early return.
- **Remove the placeholder hand-off:** delete `handThought`, `worldThought` and `worldThoughtRect` (:737-756), their calls at :719/:727, `:377 worldThought = null` and the `:94` avoid entry. Add `setThoughts() {}` to `createStubFlow` (:281).
- **onWorld:** `router.setWorld(fn, { thoughts: true })`. Replace :356 with `const p = stage.thoughts.primary; stage.thoughts.release(900, stage.thoughts.list.filter((t) => t !== p));`.
- **endWorldMode:** `stage.freeze(false)`, then `stage.thoughts.primary?.moveHome(thoughtHome)` (or release, per owner P-6).
- **Safety and offers:**
  - `safetyHold` also calls `flowRef?.setThoughts?.(null)`.
  - `offerAvoid` already includes `stage.thoughts.rects()`.
  - `closeRead` focuses `stage.thoughts.tagOf(th)`.
- **CSS:** delete hushfold.css :296-302 and :314 (`.hf-tag`). Do not port the `.hf-world` hide. Add `.hushfold .tm-tag{z-index:1}` and the `body.hf-world-held … canvas.hf-stage, … .tm-tag {opacity:0 !important; pointer-events:none !important}` rule.
- **QA hook:** replace `get worldThought()` with `get thoughts() { return stage.thoughts; }`.
- **Static guards:**
  - hushfold.js does not import `placeholders.js` and has no `thought: null`.
  - It passes `thoughts:` and `ticker:`.
  - spawnThought checks `gentle()`.

Done when: Q4, Q5 (continuity), Q8, Q11f and Q15 (one rAF) pass.

#### B4: Beyond client (after W8 r2 verify #96, or hand to W8 r2 polish #95)

- **Owns:** `src/beyond/{another-angle,consent,angle-client,lines}.js`.

Edits:
- **`openTellNow`** :426-475: `openInput({…, photos: false, privacyNote: serverMode() ? SERVER_CLAUSE : null, support: (o) => openSupport(app, o)})`.
  - Delete the `.hf-ghost.photo` hack (:462), the MutationObserver (:473), which is never disconnected, and PRIVACY_CLAUSE.
  - Add a sheet tracker (as in hushfold.js:120-147) so Back closes the urgent sheet first.
- **`keep()`** :804-822: pass a `signal` from an AbortController that noteSafety (:502) aborts on crisis or care, plus a `subtitles` adapter shaped like H1's `installSubtitles`.
- **Invite codes:**
  - consent.js `mountAngleSettings` gets a 'Tester code' row: text input, ≥16 px, maxlength 64. Saving does `store.set(STORE_KEYS.invite, code.trim()); store.remove(STORE_KEYS.session)`.
  - angle-client.js:162: `403 && data.error.code === 'invite_required'` → `reason: 'invite'`. Remember it until the stored invite changes, so each angle does not spend the per-network session quota.
  - `startAngle` (:563) says once per visit, with no speaker (new lines.js line): 'Another Angle is open to invited testers for now. You can add your code in Settings.' Then the authored scene.
- **`continueFlow`** :835-846: also pass `thought: { x, y, r, emotion }`, per owner P-15.

Done when: beyond.test is green and Q12a-c pass.

#### B5: lexicon and server sync (after gate-r4-review reports)

1. Merge `/tmp/claude-0/hf/W6/r3/for-W3-lexicon-additions.json` into `src/data/safety-lexicon.js`.
2. Check these false positives: 'overdosing on caffeine', 'hurting myself at the gym', "don't want to live with my parents".
3. `cd hushmallow/server/another-angle && npm run sync:lexicon && npm test`.
4. Run the app suite and `node /tmp/claude-0/hf/W3-review/safety-probe.mjs`.
5. Redeploy staging by appending a line to `hushmallow/server/another-angle/deploy/STAGING` and pushing a branch. another-angle-staging.yml then runs e2e, and `eval/RUN` triggers eval run 4 in GitHub Actions.

#### G1: Another Angle go-live (one commit; after B4, B5 and owner L1-L3)

- **Files:**
  - config.js :26 `ANGLE_ENDPOINT = 'https://hushmallow-another-angle.vibyfy-chat.workers.dev'` and :28 `ANGLE_ALLOWED_HOSTS = ['hushmallow-another-angle.vibyfy-chat.workers.dev']`. Rewrite the comment at :20-25. No other `workers.dev` literal may appear in src, including the staging URL (core.test.mjs:96-99 also scans comments).
  - plans.js:104 gets the approved sentence (L3), and the comment at :100-103 changes.
  - tests/brand.test.mjs:509-517 becomes conditional on the endpoint.
  - consent.js:36 `PROVIDER_RETENTION` = the owner text (L1).
  - tests/beyond.test.mjs:321: non-empty and not the placeholder when the endpoint is set.
  - settings.js:46-49: mount the rows only when `(endpoint && app.ent.has('ultra')) || c.hasAngleData(app.store)`.
  - docs/FRAMER.md §4 (:64-73).
  - Optional: plans.js:130 returns to 'angle' when `params.reason === 'ultra'`.
- **Pre-checks:** the scratch copy `/tmp/claude-0/hf/plan/beyond-seam/golive.diff` already passed beyond, core and brand.
- **Done when:**
  - The suite is green.
  - `grep -rn workers.dev hushmallow/src` shows only the two config.js lines.
  - After the merge to main, GitHub Actions shows: the production preflight returns 204 for the github.io Origin and 403 for a framer.website Origin or `null`, and `node hushmallow/server/another-angle/scripts/e2e.mjs https://hushmallow-another-angle.vibyfy-chat.workers.dev --origin https://ramkumarjothi1982.github.io` passes.

#### D1: docs (last)

- **HUSHFOLD.md:**
  - Delete :119.
  - Fix the W4 row :123 and W5 row :125 (the ocean is playable) and the W7 row :126 (build-site is done).
  - Add rows for W6, W6t, W8 and Integration.
  - §2: MallowTouch lives in `.hf-touch`, a fixed sibling before `#fx-layer`. Thoughts draw in 2D on `#fx-layer canvas.hf-stage`, and their tags are `.tm-tag` at z1.
  - §3 ownership additions. The W4 contract gains gentle/setGentle, pause/finish reason, hold, 'host', `next({worldId})`, `stay(false)` and `state.title`.
  - D1: the embed is 97 lines, not 94. §6: boot is 1028 KB of JS in 53 files.
- **Also:** README :40-121, a STATUS.md rewrite, FRAMER.md (the rest), AUDIT.md casing, studio.js:172 and sound-lab.html:6 casing, and resolved items struck in `/tmp/claude-0/hf/integration-todo.md`.

## 2. Cross-seam conflicts and how to sequence them

| # | Where | Who wants it | Conflict | Resolution |
|---|---|---|---|---|
| 1 | stage.js `touchAdapter`/rig adapter | MallowTouch, Thoughts, Director seams | All three add `rect()`. MallowTouch also rewrites fit/ready/opts; Thoughts also rewrites `createStage` underneath. | A2 owns the adapters and defines `rect` once. B2 (later) owns `createStage`, run by the same agent or rebased on A2. |
| 2 | hushfold.js `enter()` | MallowTouch default, ThoughtLayer opts, `params.safety`/`params.flow`, QA hooks | Same block. | H1 (MallowTouch, params, hooks), then H3 (createStage opts, `stage.start()`). H3 keeps H1's MallowTouch block as it is. |
| 3 | `getFlow()` | MallowTouch (timer swap), Thoughts (`thoughts`/`ticker`/`subtitleBand`/freeze), Director (`subtitleBand`/'host') | Timer vs event for the host; two spellings of subtitleBand. | 'host' event from B1 (a timer fires while paused). `subtitleBand` returns a number (director.js:231). H2 adds band and host; H3 adds thoughts, ticker and freeze. |
| 4 | `onWorld()` | host swap; release all but primary; realm pause; holdOnWorld | Same lines (:353-364). | H1: realm pause and holdOnWorld. H2: host. H3: primary release and `setWorld(…, {thoughts:true})`. |
| 5 | `endWorldMode()` | float reset; freeze/moveHome; `entrance: !gentle()`; realm resume | Same function. | H1: float, realm and entrance. H3: freeze and moveHome. |
| 6 | `noteSafety()` | lowStim (owner); thoughts release + `setThoughts(null)` + pause; safetyHold; offer abort | Four additions. | One `safetyHold(level)` in H1 (abort, release, pause/finish). H2 switches it to `pause({reason})`/`finish({reason})`/setGentle. H3 adds `setThoughts(null)`. |
| 7 | `onOffer()` | live origin/face; avoid, signal, hold; full rewrite | Different avoid lists (`subtitles.rect()` vs none). | The garden seam's rewrite in H1. garden-install already avoids `.hf-sub/.hf-chips/.hf-subctl/.hf-read`, so no `subtitles.rect()`. `hold('offer')` in H2; thought rects automatically in H3. |
| 8 | subtitles avoid (hushfold.js:94) and bounds (:93) | installAvoidRects; world band top; worldThoughtRect removal | Same line. | H1 (installAvoidRects), H2 (band top), H3 (drop worldThoughtRect). |
| 9 | Thought hits while a world plays | Thoughts seam (wrapper in hushfold.js) vs Director seam (router flag) | Two mechanisms. | Router flag `setWorld(fn, {thoughts:true})` (A3), switched on in H3. Before H3 the placeholder thoughts are released at world start, so nothing is needed. |
| 10 | director melt events | MallowTouch seam (`mallow` on melt k:0) vs Director seam ('host' at e ≥ 0.5) | ocean.test.mjs:392 pins melt ks to [0,1]. | Both, additive (B1). The shell prefetches on melt k:0 and swaps on 'host'. |
| 11 | luminous-ocean.js:857 | Thoughts (`z = st.distance` + scale compensation) vs Director (`z` only) | Size. | The Thoughts version, so the drawn size matches the ocean's projection. |
| 12 | Panel Stay | Director seam: toggle via `next()` | `next()` melts. | A8 ships `aria-pressed` only; un-staying is `stay(false)` from B1. |
| 13 | rig.js / mallow-touch.js | rig-res.patch vs try/catch + Shift fix | Same files. | The patch first, inside A1. |
| 14 | tests/hires.test.mjs:346 guard | A1 vs W2b r3 | It scans `thought/**`. | Re-run after W2b r3 merges. |
| 15 | Where thoughts draw | `ThoughtLayer.attach(mt)` (MallowTouch 2D canvas, z1) vs `ctx2d` on `.hf-stage` (#fx-layer, z2) | Layering. | `ctx2d` on `.hf-stage`. The director's `.hf-front` is appended after it, so world front layers draw over thoughts; check in Q5. |
| 16 | input-overlay.js → another-angle.js | A7 → B4 | Order. | A7 first; it is backwards compatible. |
| 17 | W8 shares stage.js, input-router.js, garden-install.js | A2/A3/A4 change behaviour W8 relies on | Behaviour, not files. | Run the Q12a smoke after each, and tell W8 r2. |
| 18 | side-panel.js:91 calls `flow.resume()` directly | Crisis hold | Bypass. | A8 adds `locked`; H1's `onPause` returns true. |
| 19 | hushfold.test.mjs:595 care regex | safetyHold insertion | A `{…}` before `await careBeat` breaks it. | Care logic goes inside `careBeat`. |
| 20 | `params.flow` from Another Angle | W8 continueFlow vs hushfold enter | Extra fields ignored. | H1 reads emotion/intention; text waits for owner P-15. |
| 21 | `src/mallows/touch/**` | A1 vs W2b r3 (now editing `softbody.js`) | Shared SoftBody and possibly gestures.js. | A1 stays out of softbody.js and gestures.js, and agrees ownership with W2b before starting. Re-run touch.test and Q1 after W2b r3. |
| 22 | luminous-ocean.js | B1 vs W4b r2 #99, mid-edit now (+391 lines) | Line numbers :857, :1019, :1555 will move. | B1 goes to W4b as a list, or runs after #103, citing functions rather than line numbers. |

## 3. QA checklist (vertical slice)

### 3.0 Harness

- **Serve.** `cd /home/user/thinkstill-rituals && python3 -m http.server 8000` and use `http://localhost:8000/hushmallow/index.html`. Port 8000 matters: the local harness's ALLOWED_ORIGINS is `http://localhost:8000,http://127.0.0.1:8000`.
- **Mock Another Angle server.** `cd hushmallow/server/another-angle && npm run harness -- --serve 8790` (node_modules is present; mock provider; never set `PROVIDER=anthropic` here). The app uses `?angleDev=8790`.
- **Playwright.**
  - Load it with `const { createRequire } = require('module'); const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');`, then `chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] })`.
  - Never run `playwright install`. Run one browser job at a time under `timeout 400`. Other planners share `/tmp/claude-0/hf/plan/`.
- **Contexts.**
  - Phones 375×812, 390×844, 430×932 and 320×568: `{ deviceScaleFactor: 2, hasTouch: true, isMobile: true }`, plus one extra run at 390×844 with dpr 3 (MallowTouch caps it at 2).
  - Desktop 1280×800: `{ deviceScaleFactor: 1, hasTouch: false }`, with mouse and keyboard.
- **Seeds** (addInitScript, before goto):
  - Entitlement: `localStorage['hm2:entitlement'] = JSON.stringify({ tier, source: 'test', since: Date.now() })`, with tier `none` (free), `paid` (Flow) or `ultra` (Beyond).
  - Prefs: `localStorage['hm2:prefs']` with `{textScale: 1.25}`, `{motion: 'reduced'}`, `{lowStim: true}`, `{autoFlow: true}` or `{sound: false}`.
  - OS reduced motion: `page.emulateMedia({ reducedMotion: 'reduce' })` with prefs motion 'system'.
- **Touch** goes through CDP: `const cdp = await ctx.newCDPSession(page); cdp.send('Input.dispatchTouchEvent', { type: 'touchStart'|'touchMove'|'touchEnd', touchPoints: [{ x, y, id }] })`. Helpers: `press(x, y, ms)`, `drag(points, msPerStep)`, `spread(cx, cy, d0, d1, ms)`, `scribble(rect, s)`, `slowStroke(a, b, s)`. Starting template: `/tmp/claude-0/hf/plan/scripts/shell-touch.cjs`.
- **Hooks** (localhost only): `window.__hushfold` exposes `{ mallow, touch, stage, router, subtitles, flow, panel, overlay, layers, S, startFlow, openTell, onOffer, safeForUpdate, layout, resumableNow }`, plus `thoughts` after H3.
- **Per run:**
  - Zero `pageerror`, zero console errors and zero 4xx responses.
  - Screenshots go to `/tmp/claude-0/hf/plan/qa/<WxH>/<tier>/<nn-step>.png` and JSON to `/tmp/claude-0/hf/plan/qa/<run>.json`.
- **Generic asserts on every screenshot** (run them in the page):
  - `document.documentElement.scrollWidth <= innerWidth` (no horizontal scroll).
  - Every visible text element has `fontSize ≥ 13` (12 for `.badge`), and inputs are ≥ 16.
  - `bodyRect()` lies inside the viewport, ≥ 20 px from the side edges.
  - No visible `.hf-sub`, `.hf-chips`, `.tm-tag`/`.hf-tag`, `.hm-offer`, `.hm-card` or `.hf-pill` intersects `install.mallowFaceRect(bodyRect, MALLOWS[id])`.
  - For each button, `scrollWidth <= clientWidth` (nothing clipped).
- **Look at the screenshot every time:**
  - The Mallow's approved art: no black masks, no crop.
  - Subtitles readable over the scrim.
  - Nothing over the title, subtitles or controls.
  - At 320×568, the dock pills and subtitles don't touch.

### 3.1 Matrix

| Check | 375×812 | 390×844 | 430×932 | 320×568 | 1280×800 | Tiers | RM | Text 1.25 | Available after |
|---|---|---|---|---|---|---|---|---|---|
| Q1 boot + squeeze | ✓ | ✓ (also dpr 3) | ✓ | ✓ | mouse | none, paid, ultra | ✓ | ✓ | H1 |
| Q2 invitation | ✓ | ✓ | ✓ | ✓ | ✓ | none, paid | ✓ | ✓ | now |
| Q3 free Tell → plans → back | | ✓ | | ✓ | | none → paid | | ✓ | now |
| Q4 Thought Mallow | ✓ | ✓ | ✓ | ✓ | ✓ | paid | ✓ | ✓ | H3 (placeholder version now) |
| Q5 Static Storm | ✓ | ✓ | ✓ | ✓ | ✓ | paid | ✓ | | H1 / H3 for continuity |
| Q6 discovery → garden | | ✓ | ✓ | ✓ | ✓ | paid, ultra | ✓ | ✓ | H1 |
| Q7 melt storm → ocean | ✓ | ✓ | ✓ | ✓ | ✓ | paid | ✓ | | H1 (swap at end), H2 (mid-melt) |
| Q8 ocean discovery | | ✓ | | ✓ | ✓ | paid | ✓ | | now / H3 for z |
| Q9 Auto-flow | | ✓ | | ✓ | | paid | | | H2 |
| Q10 pause / finish / switch | ✓ | ✓ | ✓ | ✓ | ✓ | paid | ✓ | ✓ | H1 |
| Q11 safety paths | | ✓ | | ✓ | ✓ | none, paid, ultra | ✓ | ✓ | H1 interim / H2 full |
| Q12 Another Angle | | ✓ | ✓ | ✓ | ✓ | ultra, paid | ✓ | ✓ | A2 smoke now; B4; G1 live |
| Q13 reduced motion / lowStim | | ✓ | | ✓ | | paid | ✓ | | H1 |
| Q14 desktop input + keyboard | | | | | ✓ | paid | | ✓ | A1 + A3 + H1 |
| Q15 one loop / perf | | ✓ | | ✓ | | paid | | | H3 + A6 |
| Q16 tiers + context loss | | ✓ | | ✓ | | none | ✓ | | A1 |
| Q17 garden round trip | | ✓ | | ✓ | | paid | | | A2 + H1 |
| Q18 shipping | | ✓ | | | | none | | | A5 |

### 3.2 Checks

**Q1: boot and first squeeze**
- From `goto(load)`, within 1000 ms of DOMContentLoaded on a warm cache (2500 ms on SwiftShader): `__hushfold.mallow.kind === 'touch'` and `__hushfold.touch.ready`.
- A 50 ms sampler sees `touch.st.s === touch.goalSt.s` from the first ready frame (no glide).
- `#mallow-layer` has the hidden class or opacity 0; `.hf-touch` has no `aria-hidden`; `.hf-touch canvas` count is 2.
- `app.world.rig === null`, or the classic rig is not ticking.
- Press and hold for 700 ms at the bodyRect centre. During the hold, `router.owners` is `['mallow']`; `touch.state.depth ≥ 0.9`. The events captured with `__hushfold.mallow.on('touch')` include press, squeeze and release.
- Two-finger spread from 40 to 160 px on the body: owners `['mallow','mallow']`, `touch.state.stretch > 1.3`, events stretch and stretchEnd.
- Screenshots: rest, deepest squeeze, stretch, 300 ms after release (rebound). Look at the face: it reacts, there is no crop, and the cheeks and eyes are intact.
- Free tier as well: squeezing is identical (D4).

**Q2: subtitle invitation**
- The first reaction gives a subtitle (`subtitles.busy`) within 600 ms.
- After ≥ 3 reactions and more than 5.5 s, a 'Tell me' / 'Just play' choice appears. `elementFromPoint` at each chip centre returns the chip.
- A tap made 50 ms after the chips appear still hits (the 0.5 s glide).
- While the overlay is open, three squeezes add no line.
- With text size 1.25 at 320×568: the chips are on one or two rows, there is no overflow, and the subtitle rect doesn't intersect `mallowAvoidRect()`.
- Screenshot when the choice is visible.

**Q3: free tier Tell**
- Tier none: 'Tell me', then type 'My boss embarrassed me today.' (via `page.keyboard.type`), pick Embarrassed, Send.
- Expect `location.hash === '#plans'`, `app.state.pendingTell.input.text` equal to the exact words, and no `.tm-tag`/`.hf-tag`.
- Test-purchase Flow on the plans page, then go Back (or let it return home).
- Within 2 s, one Thought Mallow carries the exact words, and the world begins after the beat (2.4 s, or 1.2 s with reduced motion).
- Screenshots: the plans page, then the returned stage.

**Q4: words become a Thought Mallow** (paid)
- After the Send above, there is exactly one `.tm-tag` (`.hf-tag` before H3) whose `textContent` is a prefix of the exact words.
- Focus it and press Enter: `.hf-read p` has the full exact text. Escape closes it and focus returns to the tag.
- `stage.thoughts.rects()` doesn't intersect `mallow.bodyRect()`.
- The tag's top is ≥ the topbar bottom plus the band; its bottom is ≤ the dock pill top minus 8.
- `elementFromPoint` on a tag with the panel open (sheet at 390, side at 1280) returns the panel (z-index fix).
- Four Tells at home (stub the flow with `__hushfold.S.flowAsked`, or localhost no-plan bypass): at most 3 thoughts are not leaving; the oldest fades (an opacity transition, not removal); no thought rects overlap at 390 and 320.
- Screenshot: the thought beside the Mallow.

**Q5: Glitzi's Static Storm** (paid)
- `__hushfold.startFlow({ worldId: 'static-storm', emotion: 'angry', intention: 'calm' })`, or the natural path from Q4.
- On 'world': `touch.id === 'glitzi'`, the title card is said once, and `flow.state.phase === 'playing'`.
- After 2 s: `flow.world.layoutPlan` is non-null and its relayout key doesn't start with '-' (mallow rect known). No `flow.avoid()` rect intersects `mallow.bodyRect()`.
- Glitzi looks towards a finger dragged on the world (the gaze changes).
- After H3, continuity: sample `thoughts.primary` every frame from 300 ms before to 1500 ms after 'world'. It is the same object; the largest per-frame jump is under 12 px; `render.P` changes by less than 12 % on the first world frame; `ov.appear` never drops below 1; the tag stays connected.
- After H3, a drag on the thought gives `router.owners` `['world']`, the thought follows (Δ > 40 px) and `flow.world.metrics.thoughtCharge` changes.
- 'slowing' discovery: a 2 s fast scribble (≥ 1200 px/s), then slow strokes (≤ 120 px/s at 320, ≤ 180 at 390) for 4 s. The 'discovery' event fires with `skillId 'slowing-down'`; the held line stays until it is tapped.
- Screenshots: agitated (during the scribble), slowed (after), the held discovery line. Look: the subtitle band stays readable (the scrim) and postcards don't cover the Mallow or the thought.

**Q6: Memory Garden save** (paid; ultra repeats it)
- Before Continue, `localStorage['hm2:garden']` is null. Tap Continue: `.hm-offer.is-in` appears.
- The offer rect doesn't intersect the face, any `flow.avoid()` rect, `flow.subtitleBand()`, `.hf-sub`, `.hf-chips:not([hidden])`, `.hf-subctl:not(.is-hidden)`, `.hf-top` or `.hf-dock > *`. Record its form (full/compact/bar); it must not be 'squeezed'.
- While the offer is up, `__hushfold.safeForUpdate() === false`.
- Tap 'Keep this' (`.hm-offer .hm-primary`):
  - `hm2:garden.skills['slowing-down']` is `{fromWorld: 'static-storm', mallow: 'glitzi'}`.
  - `hm:install` events arrive as start → card → end; 'NEW TOOL SAVED' is shown.
  - `subtitles.rect()` never intersects `installAvoidRects()`.
  - After 'end', `subtitles.paused` is back to its earlier value. Repeat with ⏸ pressed beforehand.
- 'Visit the garden' → `#garden` and `.hg-live` says 'The Power of Slowing Down is in your garden now.'. `page.goBack()` → `#home` with the resume choice.
- 'Keep playing' instead: the world goes on and `flow.state.discoveries` includes 'slowing'.
- Branches:
  - 'Not now' writes nothing, and a later 'stillness' discovery doesn't offer again.
  - Already kept: `.hm-note` '…already in your Memory Garden', `practised` + 1, no `.hm-offer`.
  - `store.set` stubbed to return false: the honest note and no `.hm-install`.
- Panel open while the offer is up: the offer moves off the panel (`relayoutInstall`).
- Screenshots: offer, card at about 2.6 s, folded chip after 16 s, garden arrival.

**Q7: seamless melt storm → ocean**
- Complete the storm by touch, or call `flow.next()`, then sample every 100 ms:
  - `flow.state.phase`, `flow.state.melt` and `touch.id`.
  - Mean luminance of `#world canvas.hf-back` (getImageData on a 32×32 downsample). It never drops below 40 and no frame is black.
- Host:
  - After H2, `touch.id` becomes 'loomi' while melt is between 0.45 and 0.6, with no entrance hop after phase 'playing'.
  - Before H2, record that the swap happens at k = 1.
- One body is drawn for the thought; there are no `.hf-tag` elements after H3.
- Postcards turn into bubbles. The horizon rises after k = 0.5 (W4b: 553 → 371 px at 390).
- In the ocean, `touch.fl.gl !== 0` within 3 s (the hero rides the swells).
- Reduced motion: the melt lasts 1.6 s, there are no hops, and luminance stays ≥ 40.
- Screenshots at melt 0, 0.25, 0.5, 0.75 and 1. Look: no seam, no pop, and Loomi arrives mid-melt.

**Q8: Luminous Ocean discovery**
- Slow long strokes away from the viewer (4-6 at 390, 2-3 at 320). The 'distance' discovery fires, and the offer is 'A Little More Room'.
- Flicks give a short chop that fades in about 2.5 s; 'long-waves' offers nothing.
- After H3, at home distance `thought.z < 0.3`, and `render.P ≥ 0.7×` its storm size. The tag follows the thought (|tag centre − thought.x| < 140 px). Strokes towards the viewer bring it back.
- Screenshot when the thought is at its farthest.

**Q9: Auto-flow** (prefs autoFlow true)
- Complete the ocean with the offer open and no touch for 6 s: the phase stays 'playing' (hold, H2).
- Close the offer and wait the idle time: it melts into the next world (whatever owner P-1 decides) or says completeStay.
- Panel 'Stay longer': `aria-pressed='true'` and no melt for 15 s.
- 'Drift on': phase 'melting' within 6 s.
- In a gentle session, no melt into static-storm within 15 s.

**Q10: pause, finish, switch**
- **Pause** from the panel (side at 1280, sheet at 390):
  - `flow.state.paused`; the veil shows; the 'Paused' pill and line appear.
  - After H3, the primary's x/y stay within 1 px for 3 s.
  - With the sheet held at 390, `canvas.hf-stage` and `.tm-tag` are at opacity 0.
  - Resume: the first-frame jump is under 12 px. Also test the subtitle ▶.
- **Finish:**
  - The `#world canvas.hf-back` opacity, sampled every 100 ms, falls from 1 to about 0 over roughly 1.2 s (the `!important` fix).
  - Then `worldMode` is false, `touch.id` is the home Mallow, `touch.fl.gl === 0 && touch.fl.gt === 0`, the 'finished' line is said, and the realm draws again (A6).
- **Switch feeling** mid-storm (panel chip 'Sad'): `flow.setEmotion` runs. If the storm no longer fits, a melt starts (phase 'melting'), not a hard cut.
- **Switch intention:** the same.
- **Mallow switcher** in a world: `touch.id` stays the host, the home Mallow changes, and `touch.renderer` is the same object.
- **Mallow switcher** at home: `touch.id` changes, `.hf-touch canvas` count stays 2, and the renderer is the same object.
- The panel says 'Now: Glitzi’s Static Storm'.

**Q11: safety paths** (phrases from `/tmp/claude-0/hf/W3-review/safety-probe.mjs`)
- **a. Crisis typed while a world runs, not sent** (paid, storm playing). `openTell()`, type 'I want to end my life' and do not send.
  - Within 100 ms: `flow.state.paused === true`. No `subtitles.say` with Glitzi as speaker follows; no 'offer' event; `S.level === 'crisis'`; the Support pill is visible.
  - Close the overlay: `flow.state.phase === 'finished'`. About 1.3 s later `worldMode` is false.
  - The 'All done…' line is not said; the Paused pill is hidden; the urgent sheet is open.
  - Panel Resume, the subtitle ▶ and Space do not resume.
  - Back closes the sheet first.
  - Screenshots: paused under the veil, the sheet, the stage after.
- **b. Crisis during loading** (after H2). `startFlow({worldId:'static-storm'})`, then the crisis phrase at once through the overlay. The world never steps (`flow.debug.time ≈ 0`) and no world lines appear.
- **c. Care mid-world.** 'my partner hits me', then Send.
  - The world pauses and the careBeat choice shows 'Stay here quietly' first.
  - 'Stay here quietly': it stays paused and Resume is allowed.
  - The other run, the calm choice:
    - Before H2: a hard cut into `luminous-ocean`, with `flow.thought === null`.
    - After H2: phase 'melting' (not a palette-only frame), `state.gentle === true`, no 'Stay, or drift on?', and no melt into static-storm.
- **d. Care before plans** (free tier, tier none). Type the care phrase and Send.
  - It stays on `#home`; the Support pill shows; the concerned face shows (`touch.rig.stage === 'concerned'`); there are no jokes or invitations; squeezing gives no new line (3 squeezes).
  - Choose 'Stay here quietly': `careQuiet` is said and the hash never becomes `#plans`.
  - Second run, choose the gentle world: `#plans`, and `app.state.pendingTell` has `input: null` and a `gentle` level.
  - Test-purchase and return: the Support pill is still visible and a gentle world starts with no thought (`flow.thought === null`, no tag).
- **e. Crisis at home** (free and paid). No thought, no world, no `#plans`; the urgent sheet opens; one calm line once the sheet closes. A second message after that gets `supportConcern`.
- **f. Care with an earlier thought** (paid, after H3). Tell a safe thought, then the care phrase. The earlier thought's list empties within 1.2 s, and choosing the calm world gives `flow.thought === null`.
- **g. Crisis during the offer or the install.**
  - Offer open, then the crisis phrase typed: `.hm-offer` closes and nothing is saved.
  - During playInstall: `.hm-install` is removed and no card appears.
- **h. Beyond** (ultra, mock harness).
  - Type the crisis phrase in Another Angle: `page.route('**/v1/angle')` counts 0 requests; the support sheet opens.
  - Care phrase, then Finish: back in the Hushfold the Support pill is visible (H1 `params.safety`), there is no invitation, and the side panel has no 'Another Angle' link.

**Q12: Another Angle**
- **a. Local** (ultra, `?angleDev=8790`, harness running, app served on :8000).
  - The panel shows 'Another Angle'. Tapping it opens `#angle` with Zuzu on stage; Back returns to the Hushfold.
  - The consent card has real retention text after G1 (before G1 the placeholder shows, which is expected) and no rendered 'AI' outside the consent card or sheet (`node hushmallow/tools/brand-smoke.cjs`).
  - After Accept, the overlay has no Photos button (`.hf-input .hf-ghost.photo` is null after B4), and the note contains 'secure server'.
  - Send 'My boss embarrassed me in front of everyone.':
    - `/v1/session`, then `/v1/angle` returns 200 with `prompt_version`.
    - The waiting lines appear, a mechanic plays to touch, and two lines are revealed.
    - 'That helped' → `.hm-offer` → Keep → `hm2:garden.skills['another-angle']` is `{fromWorld:'another-angle', mallow:'zuzu'}`. The offer, card and chip don't intersect `.bx-top` or `.bx-dock > *` (A4).
  - 'Show me another angle' four times, then the cap line.
  - 'Continue' → `#home` with `params.flow.worldId`, and the feeling is carried (H1).
  - Screenshots at 390 and 320: consent, mechanic, reveal, offer.
- **b. Paid, not ultra.** No panel link; `#angle` goes to `#plans` (reason 'ultra', focus ultra).
- **c. Server down** (kill the harness): the authored scene plays after one line; `checkText` still runs (the crisis phrase gives zero requests and support).
- **d. Invite codes** (GitHub Actions, staging with TESTER_INVITE_CODES set):
  - `/v1/session` without an invite returns 403 `invite_required`.
  - In the app: the authored scene, one invite line, and `/v1/session` is not called again on each angle.
  - After the code is entered in Settings, the next angle returns `ok`.
- **e. Live** (GitHub Actions only; the sandbox proxy blocks `*.workers.dev`):
  - `curl -si -X OPTIONS $PROD/v1/angle -H 'Origin: https://ramkumarjothi1982.github.io' -H 'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers: authorization, content-type'` returns 204 with ACAO set to github.io.
  - The same request with a `*.framer.website` Origin or `null` returns 403.
  - `scripts/e2e.mjs $PROD --origin https://ramkumarjothi1982.github.io` passes health, session, angle, another angle, feedback and crisis.
- **f.** Real iPhone inside Framer: see §5.

**Q13: reduced motion and low stimulation**
- With motion 'reduced' (and separately with OS reduce plus 'system'):
  - `touch.opts.reducedMotion` is true and the melt lasts 1.6 s.
  - No entrance hops and no host hop.
  - Subtitles appear without slide-in.
  - The storm's flashes stay at ≤ 3 bright events per second (sample the luminance delta at 30 fps).
- lowStim: `touch.opts.lowStim` is true and `touch.rig.particles.list.length === 0` after 10 squeezes. Toggling it in Settings flips it live.
- 320×568: the body fits between the band and the dock.

**Q14: desktop 1280×800**
- Mouse press-hold squeezes. Shift-drag stretches (A1 + A3); `touch.state.stretch > 1.2`. ctrl+wheel over the body stretches.
- Tab reaches the `.hf-touch` role=button, whose aria-label is announced (`accessibility.snapshot()`). Holding Space squeezes; the arrows pull.
- The panel is a side panel and the Mallow is not covered by it.
- The overlay sits in the upper band; Escape closes it.
- Text size 1.25: nothing clipped.

**Q15: one loop and performance**
- Wrap `window.requestAnimationFrame` before load to count callbacks per frame during the storm and the ocean.
  - After H3 + A6: the count is 1, with `flow.debug.loop === 'rig-ticker'`.
  - Before that, record the count (rig loop + stage loop + realm loop).
- The realm's `core.draw` is not called while hf-back is opaque.
- Frame times p50/p90 come from `flow.state.quality` and timestamps (SwiftShader is relative only).
- No console warnings 'world input' or '[stageMallow]'.

**Q16: tiers and context loss**
- `touch.setQuality('gl'|'tri'|'strip')` gives `stats.tier` A/B/C. Screenshot each, at rest and squeezed.
- `node hushmallow/tools/hires/lab/run.cjs json 'mode=jump&kind=new'` gives jumps ≤ the README table.
- `touch.renderer.gl.getExtension('WEBGL_lose_context').loseContext()` emits 'tier' `{reason:'context-lost'}` and tier B; the Mallow is still squeezable. `restoreContext()` brings back tier A.
- Auto tier under SwiftShader is B (expected).

**Q17: garden round trip**
- Open the garden from the panel, then Back to the Hushfold.
- `app.world.rig === null` (`releaseMallow`), exactly one Mallow is drawn, `.hf-touch` is recreated once, and there are no leaked canvases (`document.querySelectorAll('canvas').length` is stable over 3 round trips).
- 'Practise again' in the garden starts that world. Back takes 2 taps today; record the count until owner P-12 is decided.

**Q18: shipping**
- The A5 done-criteria: build, check.mjs, smoke.cjs, stale.cjs, cached root, title, workflow parse.
- The built site at `/thinkstill-rituals/` also passes Q1 on the built site (`?touch` is ignored there; MallowTouch is the default).

## 4. Owner questions still open (merged; Cloudflare secrets dropped as answered)

**Launch blockers for Another Angle going live (G1)**
- **L1.** The provider retention wording for consent.js:36 `PROVIDER_RETENTION`. Is it 7 days or 30, and is flagged content kept up to 2 years? Please confirm at privacy.claude.com. Should the notice also name Cloudflare as the host that handles the connection?
- **L2.** Invite codes, or open testing? Today `TESTER_INVITE_CODES` is unset and there is no code-entry screen. `TEST_PURCHASE_HOSTS` includes `ramkumarjothi1982.github.io`, so anyone with the link can unlock Beyond for free and use the real model, limited only by 500 sessions/day, 20 angles per device per day, 10 sessions per IP per day and the $10/day cap (a forged Origin through curl gets the same). One person can use up the day's sessions or budget until midnight UTC. Build the code row first (B4) and then set the secret? Lower `DAILY_SPEND_CAP_USD` (for example to $3) for the first week? Keep test purchases on github.io during testing?
- **L3.** Approve the plans copy: 'Another Angle asks first, then sends only the words you choose to our secure server. Never your photos.'
- **L4.** Switch to the production Worker in this integration PR, or keep Pages on Zuzu's authored angles until L1-L3 are settled?
- **L5.** Have you set a monthly spend limit in the Anthropic Console for the production key?

**Product decisions for the slice**
- **P1.** What follows the Luminous Ocean? 'Drift on' back into Glitzi's storm, re-charged from the first feeling, or 'Stay as long as you like' plus Finish until a third world exists?
- **P2.** Should Glitzi hand over to Loomi halfway through the melt (W4b's recommendation)? Does a world that melts in get its own title card (today only the first does)?
- **P3.** Crisis typed during a world: end it quietly back to the Hushfold with no Resume for that visit (proposed). Confirm.
- **P4.** Care or distress typed during a world: does 'Stay here quietly' keep the world paused under its veil with Resume available (proposed), or end it? In a gentle session, should Memory Garden offers and the 'NEW TOOL SAVED' celebration still appear, and should Auto-flow stay off whatever the setting?
- **P5.** After a care or crisis disclosure: should an earlier Thought Mallow drift off gently (proposed) or stay? Should squeezing keep the playful reactions (grins, sparkles, celebrate sounds), or switch to low stimulation while the Support pill is up?
- **P6.** After a Hushflow finishes, does the person's Thought Mallow stay beside their Mallow? It holds off update reloads (hushfold.js:1076). Or does it settle and drift off with the closing line?
- **P7.** New words typed while a world plays: replace the world's Thought Mallow, with the old one drifting off (proposed: one per world), or host both?
- **P8.** A cap of 3 Thought Mallows on the home stage, the oldest drifting off. OK? (Five overcrowd a 320×568 screen.)
- **P9.** Make MallowTouch the default for everyone now, with the rig as the fallback only, before the iPhone and Framer feel check (`touch-lab.html?mallow=glitzi` on a real phone)?
- **P10.** Auto-flow off by default (prefs.js:10), with Stay as the default. Confirm.
- **P11.** An offer left unanswered (folded into a chip, then lost to leaving, a reload or a newer offer) is never offered again for that saved Hushflow. Should it come back on resume?
- **P12.** After 'Visit the garden' mid-world, Back shows 'Carry on', or nothing if Save history is off. Should Back go straight back into the world? 'Practise again' needs two Backs to reach the Hushfold today. Is that acceptable?
- **P13.** Harm-to-others policy: support first as `concern`, while 'I could kill him' as an idiom stays `none`. Confirm.
- **P14.** The Another Angle entry: the side-panel link for Beyond only, or for Flow too (leading to plans with focus ultra)? An optional 'look at it from another angle' chip right after telling, before the first world?
- **P15.** When opening Another Angle from the Hushfold, prefill the words already told this visit? They stay local and are sent only after consent and Send. And should 'Continue' at the end of Another Angle carry the words into Hushflow as its Thought Mallow?
- **P16.** After buying Beyond from 'Meet Another Angle', land straight in Another Angle instead of the Hushfold?
- **P17.** Should a lapsed plan keep a read-only Memory Garden (`READ_ONLY_WHEN_LAPSED = true`, garden.js:31)? For a Flow person who holds the Another Angle tool, should the garden link to Beyond?
- **P18.** D12: does the ocean's sculpted swell keep the feel of the wave you liked (Drift and Dock's 'Slow the wave')?
- **P19.** Seven Mallow cards on small phones: fewer cards or two rows (320×568 shows only 2-4 postcards, on purpose).

**Art**
- **A-1.** Switch the five verified hi-res Mallows now (glitzi, zuzu, boppo, blubi, noomi), leaving pipzi (its mouth needs work) and loomi on the old drawings, which mixes two styles in the switcher, cards and scenes? Or hold until all seven switch together?
- **A-2.** Is the browless cyan drawing Loomi?
- **A-3.** Do Blubi, Noomi and that Loomi read as distinct? All three are closed-eye smiles in blues.
- **A-4.** After a device measurement: raise MallowTouch's dpr cap (2) or skin cap (768) for hi-res on 3× iPhones? About 4 MB of GPU and canvas memory per step.

**Shipping, native and store**
- **S1.** Skip Pages deploys for docs-, tools-, content- and server-only commits, and use a content hash as the version? Today every deploy moves every open app to a new folder and re-downloads all its art.
- **S2.** Framer: add 'accelerometer; gyroscope' to the iframe's allow list for Green Glitch Compass's shake? It means re-pasting the component.
- **S3.** Will the iOS shell load the remote github.io page (Origin works as it is) or bundled files (Origin 'null' or a custom scheme, which needs a server ALLOWED_ORIGINS change plus StoreKit sessions, since the client sends no `signed_transaction` yet)?
- **S4.** App Store listing and StoreKit display names; the `ent.prices()` bridge (App Review 3.1.2 needs prices shown); the native purchase replying `{cancelled:true}` on a back-out.

**After the first production deploy (owner checks)**
- **X1.** Cloudflare logs carry metadata only (no IP, no headers), and `cpu_ms` for `/v1/angle` stays well under 10, including the cold start (about 365-390 ms locally).
- **X2.** A real iPhone pass, in Safari and inside the Framer site (§5).

## 5. Risks, and what only a real iPhone can verify

**Risks**
- **hushfold.js is the hub.** Three passes edit the same file, and its regex tests pin its structure (hushfold.test.mjs:192-196, :476, :595; garden.test.mjs:247). Mitigation: one owner at a time, static guards after each pass, and a Q1/Q4/Q11 re-run.
- **The shared rig loop is a single point of failure until A1 step 2 lands.** One throw stops the hero, the thoughts and the world; the director's watchdog rescues only the world.
- **MallowTouch for everyone.**
  - WebGL memory, and two contexts in Beyond (Zuzu plus a companion).
  - The tier A → B fallback on context loss.
  - About 8.5 MB decoded per hi-res Mallow, and `loadImage`'s cache (registry.js:274) never evicts, so cycling the switcher keeps every one decoded.
  - The 5 s load timeout falls back to the rig. If assets stall on cellular, the person sees the classic rig.
- **W2b r3 is still changing placement** (#104 hard plate constraint, no timed repack). Tag positions in Q4/Q5 will move. If 3 thoughts still overlap at 320×568 after r3, cap the stage at 2 below 360 px.
- **Director safety changes** (pause/finish during loading, start tokens) touch the melt state machine. Keep ocean.test.mjs:392 and the existing panel semantics green.
- **Stale deploys.**
  - Lazy imports 404 after a redeploy and silently break storm → ocean for open sessions. The director marks the world failed for the whole session. A5 and H1 warm-up mitigate this.
  - Pages and the Worker deploy in parallel on merge, so Another Angle uses authored scenes for a few minutes (safe).
- **Lexicon drift.** Any app lexicon change without `npm run sync:lexicon` fails the production Worker's deploy tests.
- **Open testing** (L2): cost and abuse, and lock-out once the cap is reached. Going live with an empty `PROVIDER_RETENTION` shows the '[Owner to confirm…]' placeholder in public.
- **The thought layer draws under the world's front canvas.** Storm front layers paint over the thought (Q5 visual check).
- **SwiftShader is slow and CDP is not real touch.** Shell frames take 30-40 ms; CDP delivery is slow and has no coalesced or pressure data. All timings are relative only.
- **Framer iframe.** Storage is partitioned by the top-level site, so consent and the device allowance are separate from the direct link (expected). A `sandbox` attribute or a custom domain would change the Origin and get a 403.

**Only a real iPhone can verify** (owner, Safari and inside the Framer site with Web Inspector on the iframe):
- **Touch feel.**
  - Squeeze depth without pressure, rebound, flick and jiggle timing, massage turns.
  - Two-finger stretch and twist; `gesturestart` really blocking pinch-zoom.
  - The edge-swipe Back gesture against the 20 px gutter.
- **Timing and performance.**
  - The first squeeze within 1 s of a cold cellular load.
  - 120 Hz ProMotion against the 1/120 s substeps.
  - Real frame times and the quality governor in the storm, ocean and melt.
  - Low Power Mode throttling rAF to 30 Hz.
- **Rendering.**
  - WebP decode of the 1024 px hi-res art in WebKit, and memory pressure or jetsam with several Mallows decoded.
  - WebGL context loss and restore across background and foreground.
  - Whether 3× displays need a higher skin cap (A-4).
- **Keyboard and input.**
  - The iOS keyboard against `visualViewport` for the Tell overlay, in Safari and inside the cross-origin iframe.
  - Dictation through the keyboard mic.
  - Safe-area insets (notch and home indicator) against the dock, pills and offer chip.
- **Sound and haptics.** Haptics (Safari has none; only the native shell) and audio unlock on the first touch.
- **Accessibility.** VoiceOver on the `.hf-touch` role=button, the `.tm-tag` buttons, the live regions for subtitles, offers and 'NEW TOOL SAVED', and reduced motion from iOS Settings.
- **Another Angle from the device.** `/v1/session` and `/v1/angle` carry `Origin: https://ramkumarjothi1982.github.io` from inside Framer; consent is asked again on the Framer site (partitioned storage); the response shows `prompt_version` angle-v5; the mechanic plays and the two lines are revealed.
