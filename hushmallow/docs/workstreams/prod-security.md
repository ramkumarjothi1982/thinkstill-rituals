# Workstream prod-security: headers, sweep, monitor, runbook

Branch `claude/hm-prod-security`. Files: `tools/site/security-headers.mjs` (new),
`tools/site/auth-config.mjs` (writes `_headers`), `tools/site/pages-headers.mjs`
(new: a Pages-like server), `tools/ops/monitor.mjs` (new),
`tests/security-headers.test.mjs`, `tests/security-headers-monitor.test.mjs`,
`tests/e2e/csp-sweep.mjs`, `docs/ops/ROLLBACK.md`,
`docs/workstreams/prod-security/monitor.yml` (workflow to install). Nothing
in `build-site.sh`, `functions/`, `server/` or `src/` was changed.

## Final headers (production build, sign-in on)

`_headers` is generated at build time from the build's own values: the
published Supabase origin, `ANGLE_ENDPOINT` from `src/app/config.js`, the
build version, and SHA-256 hashes of the inline code in `index.html` and
`auth/callback/index.html`.

```
/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  Referrer-Policy: same-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), hid=(), midi=(), display-capture=(), magnetometer=(), xr-spatial-tracking=(), idle-detection=(), screen-wake-lock=(), publickey-credentials-create=(), publickey-credentials-get=(), otp-credentials=(), browsing-topics=(), local-fonts=(), window-management=()
  Cross-Origin-Opener-Policy: same-origin
  Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval' 'sha256-<inline hmStale script>' 'unsafe-hashes' 'sha256-<onerror="hmStale()">'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; media-src 'self'; connect-src 'self' https://igbxbfuaoybfzsroxuln.supabase.co wss://igbxbfuaoybfzsroxuln.supabase.co https://hushmallow-another-angle.vibyfy-chat.workers.dev; worker-src 'self'; manifest-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors https://hushmallow.com https://www.hushmallow.com; upgrade-insecure-requests
/auth/*            (unchanged rule; added to the one above, so both CSPs are enforced)
  Cache-Control: no-store
  Referrer-Policy: no-referrer        ("same-origin, no-referrer" → no-referrer)
  X-Frame-Options: DENY
  Content-Security-Policy: default-src 'self'; script-src 'self'; connect-src 'self' https://igbxbfuaoybfzsroxuln.supabase.co; img-src 'self' data:; style-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'
/, /index.html, /version.json, /manifest.webmanifest, /src/app/main.js     Cache-Control: no-cache
/v/<this version>/assets/*, vendor/*, src/<each folder>/*, src/<each file>, src/auth/<each file but public-config.js>
                                                                         Cache-Control: public, max-age=31536000, immutable
/v/<this version>/src/auth/public-config.js                              Cache-Control: no-cache
```

That is 35 rules; the longest line is about 680 characters (Pages allows 100
rules and 2,000 characters a line). Decisions:

- **Enforced**, not report-only. There is no `report-to`; adding one (for
  example on the Worker) is a possible follow-up.
- **frame-ancestors**: the Framer embed was agreed (`docs/HUSHFOLD.md` D1,
  `docs/FRAMER.md`, and `docs/AUTH.md`: "The root page is not frame-blocked
  (the Framer embed)"). No document names the Framer domain. Following the
  brief, I allowed `https://hushmallow.com` and `https://www.hushmallow.com`
  (Framer serves one and redirects the other). **Owner: confirm the domain.**
  Framer's editor and preview canvases (`*.framer.app`, `*.framer.website`)
  will show a blank frame. `X-Frame-Options` is left off the root because it
  cannot allow another origin, so frame-ancestors governs. `/auth/*` keeps
  `DENY` plus `'none'`.
- **HSTS** has no `preload`: that is the owner's choice and hard to undo.
  `includeSubDomains` on app.hushmallow.com covers only its own subdomains.
- **Referrer-Policy `same-origin`**: nothing needs a cross-origin referrer.
  The Worker checks `Origin`, not `Referer`, and Supabase needs none.
- **COOP `same-origin`**: sign-in email links and provider redirects are
  top-level navigations. Nothing calls `window.open`. COOP has no effect
  inside the Framer iframe. There is no Stripe redirect yet; payments are not
  on the web (`docs/FRAMER.md` §3).
- **form-action `'self'`**: no form posts anywhere. Every auth form submits
  through JS, and there is no Stripe form.
- **Permissions-Policy** denies only unused features. These stay available:
  accelerometer/gyroscope (devicemotion in `green-glitch-compass.js`),
  autoplay, clipboard-write, web-share and fullscreen (also delegated by the
  Framer iframe's `allow`). Photos use a file input, so no camera permission
  is needed. Chromium flags `bluetooth` and `ambient-light-sensor` as
  unrecognized, so they are not listed.
- **onnxruntime-web 1.23** (on-device safety model, another branch):
  - `'wasm-unsafe-eval'` allows compiling WebAssembly from our own files.
  - `connect-src 'self'` covers fetching the `.wasm`/`.onnx` files, and
    `script-src 'self'` covers its `.mjs` glue.
  - Without COEP the page is not cross-origin isolated, so ORT runs
    single-threaded and starts no pthread workers. Its proxy worker is off by
    default. From same-origin files it needs **no blob: workers**, and
    `worker-src` is `'self'`.
  - **If that branch sets `env.wasm.proxy = true` or loads ORT from another
    origin, it will need `worker-src 'self' blob:`.** Re-run the sweep with it.
- `wss://` for the project is listed as the brief asked; nothing uses
  Realtime today.
- `upgrade-insecure-requests` is production-only. dev/ci builds (a localhost
  Supabase over http) leave it out and get `http://…` + `ws://…` in
  connect-src, so the auth E2E on a local stack keeps working.

## Inline code inventory

**Scripts.** The built site has exactly two pieces, both in `index.html` and
both hashed at build time:
- the `<script>` holding `hmStale()`;
- `onerror="hmStale()"` on the module script, which needs `'unsafe-hashes'`
  plus its hash.

`auth/callback/index.html` has no inline code. Nothing in `src/` uses `eval`,
`new Function`, string timers, `javascript:` URLs or inline handlers (the
reviewer confirmed this by grep). The vendored supabase-js loads from
`'self'` with SRI.

**Optional diff (index.html, not my file) to drop `'unsafe-hashes'`.** The
generator then removes it automatically and the test still checks that every
hash matches:

```diff
--- a/hushmallow/index.html
+++ b/hushmallow/index.html
@@ function hmStale() {
       .catch(function () {});
   }
+  // the module (or one it imports) failed to load: error events reach window in the capture phase
+  window.addEventListener('error', function (e) {
+    var t = e.target;
+    if (t && t.tagName === 'SCRIPT' && /\/src\/app\/main\.js/.test(t.src || '')) hmStale();
+  }, true);
 </script>
@@
-  <script type="module" src="src/app/main.js" onerror="hmStale()"></script>
+  <script type="module" src="src/app/main.js"></script>
```

**Styles: why `'unsafe-inline'` stays for `style-src`.** A sweep run with
`style-src 'self'` (`--strict-styles`, 390 px) gets violations in 16 of 28
scenes. Six modules inject `<style>` elements:
- `src/mallows/thought/layer.js`
- `src/hushfold/flow/placeholders.js`
- `src/hushfold/garden-install.js`
- `src/rituals/moonmilk-wind-down.js`
- `src/app/scenes/garden.js`
- `src/beyond/styles.js`

`style=""` attributes are also set by:
- `setAttribute('style')` in `src/ultra/another-angle.js`,
  `src/rituals/static-to-signal.js` and `src/rituals/green-glitch-compass.js`;
- SVG/HTML templates in `src/ultra/another-angle.js`,
  `src/rituals/drift-and-dock.js` and `src/rituals/sunpop-savour.js`.

`el.style.x` and `cssText` (CSSOM) are not affected. Removing
`'unsafe-inline'` would mean moving those six stylesheets into `.css` files
(or `adoptedStyleSheets` with `CSSStyleSheet.replaceSync`) and the attributes
into CSSOM. That is a `src/` change for later; the risk left now is CSS
injection only, never script. The `/auth/*` policy stays `style-src 'self'`,
and the callback page and account screens pass under it.

## Sweep result

`node hushmallow/tests/e2e/csp-sweep.mjs` builds production with the real
project URL and a made-up publishable key, then serves it with
`tools/site/pages-headers.mjs`. Off-site requests go to local doubles: the
Supabase fake and an Another Angle mock (health → session → angle).

**Result: 56 scene visits (28 scenes × 390×844 and 1280×800), 0 violations,
0 scenes not reached, 0 off-site requests.** Re-run on the final policy (after the review fixes) with the same result.

Scenes covered:
- **Hushfold:** the home screen (with a squeeze); Tell → question → Play →
  Static Storm (the real path); Tell → "Just be with it"; crisis words → the
  urgent sheet; care words.
- **Labs:** the Hushflow lab for Static Storm and Luminous Ocean; the Memory
  Garden lab (install, offer); the V3 lab (HM-0001).
- **Classic scenes:** classic home, Express, Encounter, a classic ritual,
  landing/share, Memory Garden, plans ×2, settings, library, journey,
  mallows, the support sheet.
- **Another Angle:** consent → Accept → Tell → "Another angle" → mocked
  Worker calls.
- **Account (guest):** welcome, sign-in, create, forgot.
- **Account (signed in):** create → email → `/auth/callback?token_hash` →
  signed in → account, password, device data, sign-out and delete screens.
- **/auth/callback:** an error link, a bogus token, `/auth/callback`
  redirecting to `/auth/callback/`, and the root `?code=` fallback.
- **Stale page:** `main.js` 404 → `onerror` → version.json.

There are no pilot pages on any branch I can see.

The reviewer separately ran all 11 classic rituals and 24 V3 rituals spread
across HM-0001…HM-0953: 0 violations.

## Monitor

`tools/ops/monitor.mjs` has no dependencies and needs no secrets. It checks:

| Check | What it requires |
|---|---|
| site | `/` returns 200 and is the app. Every security header **exactly** matches the repo's generated headers (CSP directive by directive; only the inline-script hashes may differ). |
| version | `version.json` equals the page's version, is a 40-hex commit, and is in the main window. |
| config | `public-config.js` points at `igbxbfuaoybfzsroxuln`, uses a publishable key, holds no secret, and is never cached. |
| code | `main.js` is JavaScript and immutable. |
| callback | `/auth/callback/` headers match exactly. |
| worker | The Worker's `/v1/health` (sent with `Origin`) returns ok; not the mock; both keys configured; schema present; CORS allows the site. |

Every response must be under 4 s. A failure is retried once, and a check
that passes on the retry is printed as RECOVERED.

`--allow-gate` needs a `--gate-marker`. It still checks the gate page's
headers and prints what the gate kept it from checking.

Tests run it against a local fake for: healthy, wrong/stale version, missing
CSP, weakened CSP/headers, cached config, wrong project, secret in config,
Worker down/misconfigured/mock, slow, hang, gate with and without marker, and
a blip versus a real failure.

**Workflow** (`docs/workstreams/prod-security/monitor.yml`, to be installed
as `.github/workflows/hushmallow-monitor.yml`):
- runs every 10 minutes and on dispatch;
- permissions: `contents: read`, `issues: write`;
- the version window uses `--first-parent` on main;
- opens or updates one `prod-monitor` issue (only the one it opened itself)
  and closes it when healthy again.

## Tests

- `node --test hushmallow/tests/*.test.mjs` on the final head: **1124/1124 pass**
  (including `security-headers.test.mjs`, 9 tests, and `security-headers-monitor.test.mjs`, 8 tests).
- CSP sweep on the final head: 56 visits, 0 violations (above).

## Independent review (adversarial subagent)

| Severity | Finding | Fix |
|---|---|---|
| Medium–High | The cache rules used `/v/:version/…`. Pages' single-page fallback answers any missing file with `index.html` (200), so after a deploy or rollback another version's module URL could be cached as immutable HTML. This would break supabase.js SRI and leave a blank app after a rollback. | **Fixed.** The rules name the literal build version, so other versions get Pages' default `max-age=0, must-revalidate`. Tested. |
| Medium | `--allow-gate` passed when production was completely broken. | **Fixed.** It needs a positive gate marker, and the final line lists what was not checked. Tested. |
| Medium | The version window used `git log` without `--first-parent`: merge commits gave wrong versions and false alarms. | **Fixed** (`--first-parent`; checked on a simulated merge history). |
| Medium | The monitor accepted weakened headers (`script-src *`, `frame-ancestors *`, `no-store-not`, `unsafe-url`). | **Fixed.** Exact comparison with the generated headers. Tested. |
| Low–Medium | No CSP reporting. | Not done; a possible follow-up. |
| Low | Broader sources than needed. | `media-src` is now `'self'`. `wasm-unsafe-eval`, `wss:`, `img data:` and `worker-src 'self'` are kept on purpose (ORT, and the brief). The `'unsafe-hashes'` diff is above. |
| Low | Workflow issue handling. | **Fixed.** Only the issue it authored is touched, output is escaped, and a timeout opens an issue. |
| Low | Runbook facts. | **Fixed.** version.json names the bad deploy; the module recovery limits; the full list of Worker deploy paths; `expect_version` after a rollback; open apps keep a not-ready Worker until reloaded. |
| Low | Unquoted handlers were not hashed. | **Fixed** and tested. |

**Re-checks.**
- **Round 2:** all four Medium fixes held. One new Medium: a repeated CSP
  directive got past the monitor, because browsers obey the first copy and
  the monitor read the last. **Fixed:** repeats now fail. The fix also checks
  version.json's headers, counts extra inline hashes, and requires the gate
  marker to be literal text of 8+ characters. Tested.
- **Round 3:** "no Medium-or-worse issue remains".

Lows left as they are:
- A gate marker that also appears on an error page would hide a failure.
  The runbook now asks for a unique token such as `data-hm-pilot-gate`.
- A swapped inline hash with the same count passes. This is by design for
  older builds, and a hash still allows only one exact piece of code.
- After a rollback to a build made before a header change, the monitor raises
  a false alarm. This is noted in the runbook.

## Where `pages-headers.mjs` may differ from Cloudflare

It was written from Cloudflare's documentation and the open-source
pages-shared asset server: all matching rules apply in file order, the first
rule to set a header replaces Pages' default, a later rule appends `, value`,
`!` deletes, `*` matches slashes, and `:name` matches one segment. The
reviewer's understanding agrees.

Not modelled:
- **Pages Functions:** `_headers` does not apply to Function-generated
  responses. That matters for the pilot gate.
- 304/ETag, Early Hints, the exact content types, and zone-level "Browser
  Cache TTL".

The generated file avoids relying on any uncertain semantics:
- no `!` detaches;
- Cache-Control comes from exactly one rule for each path;
- the only headers that two rules set are CSP (two enforced policies) and
  Referrer-Policy (the last token wins).

## Integration steps for the coordinator

1. Merge this branch. `build-site.sh` already writes `_headers` through
   `auth-config.mjs` with the version, so no change is needed there.
2. Install `docs/workstreams/prod-security/monitor.yml` as
   `.github/workflows/hushmallow-monitor.yml`.
3. **Pilot gate (functions/, other workstream):**
   - A Function's own responses (the gate page, redirects) must set the same
     security headers as the `/*` rule, because `_headers` does not apply to
     them. Export them from `tools/site/security-headers.mjs` or copy them
     from the built `_headers`.
   - The gate must **not** cover `/auth/*`, where sign-in links land.
   - It should let through `/version.json`, `/v/*/src/auth/public-config.js`
     and `/v/*/src/app/main.js` (all public) so the monitor keeps checking
     them.
   - The gate page needs a marker such as `data-pilot-gate`; set
     `HM_MONITOR_ALLOW_GATE=1` and `HM_MONITOR_GATE_MARKER` while it is on.
   - Pilot pages must have no inline scripts, styles or handlers.
4. **ORT branch:** run `node hushmallow/tests/e2e/csp-sweep.mjs` with the
   model wired in. Add `blob:` to `worker-src` in
   `tools/site/security-headers.mjs` only if it uses a proxy or blob worker.
5. Optional: the `index.html` diff above (drops `'unsafe-hashes'`).
6. Owner decisions:
   - confirm the Framer domain(s) in `FRAME_ANCESTORS`;
   - HSTS preload (not set).
7. After the first deploy, compare the live headers with the monitor
   (`node hushmallow/tools/ops/monitor.mjs`) or with
   `curl -sI https://app.hushmallow.com/`.
