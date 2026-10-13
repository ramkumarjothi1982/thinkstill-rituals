# Accounts and sign-in (Supabase)

Sign-in is **optional**. Guests keep every experience exactly as before; an
account adds email sign-in, keeps one person's things apart from another's
on a shared device, and (only if the person opts in) keeps their settings,
favourites and progress with the account. Nothing a person types, no
feeling and no photo is ever sent to Supabase.

Status (stage 1, 13 Oct 2026): the core is built and tested against a local
fake of Supabase and a local PostgreSQL. **Not yet verified against Supabase
itself**: that is the CI job on a local Supabase stack (next stage) and the
owner's manual checklist below on production. The account *screens* are a
stub until the next stage.

## Project

| | |
|---|---|
| Supabase project | **hushmallow1**, ref `igbxbfuaoybfzsroxuln`, Sydney (ap-southeast-2) |
| URL | `https://igbxbfuaoybfzsroxuln.supabase.co` |
| Publishable key | `sb_publishable_NSv1Liou2yjKjauX09U5qQ_CxwzDuiw` (public by design; RLS protects the data) |
| Never used | the old Singapore project; any `sb_secret_…` key; any service_role key; `SUPABASE_ACCESS_TOKEN`. No migration is ever run against production by a tool: the owner pastes the SQL (see `supabase/README.md`). |

## Files

| File | What |
|---|---|
| `vendor/supabase/` | supabase-js **2.117.2** UMD build, byte for byte (sha256 + SRI in `manifest.json`), MIT `LICENSE`, `README.md` |
| `src/auth/config.js` | the one project, key classification, production / dev / ci validation (build and browser) |
| `src/auth/public-config.js` | `{ enabled: false }` in the repository; the build writes the public values here |
| `tools/site/auth-config.mjs` | build step: validates `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY`, refuses secrets in the build environment, writes `public-config.js` and `_headers` |
| `src/auth/boot.js` | synchronous boot step: namespace, store, root → callback forward, `#account`, notices; `app.auth` handle (lazy `load()`) |
| `src/auth/namespace.js` | per-account local namespaces, device-level keys, the guest-data question, cleanup |
| `src/auth/client.js` | the sign-in API over supabase-js (below) |
| `src/auth/errors.js` | friendly messages without account enumeration; client-side checks; password hint |
| `src/auth/sync.js` | ids-and-numbers mapping and merges for the opt-in sync |
| `auth/callback/index.html`, `src/auth/callback.js` | `/auth/callback`: email links and provider sign-ins |
| `src/auth/auth.css` | the sign-in surfaces (callback page, account screens) |
| `src/app/scenes/account.js` | the `account` scene (stage 1 stub) + `mountAccountRow(app, el)`, `openAccount(app)` |
| `supabase/` | migrations 0001–0008, rollback, `tests/rls_check.sql`, email templates, README |
| `tools/auth/` | `fake-supabase.mjs` (test double), `pages-serve.mjs` (Cloudflare-Pages-like static server), `callback-e2e.cjs` (browser proof), `sql-check.sh` + `pg-supabase-shim.sql` (SQL on a throwaway local PostgreSQL) |
| `tests/auth-*.test.mjs` | node tests (config, namespaces, errors + callback parsing, the client with the real supabase-js against the fake, static SQL) |

## How it fits the app

* **Boot** (`src/app/main.js` → `authBoot()`): before any store exists, the
  page reads the session supabase-js left in `localStorage`
  (`sb-igbxbfuaoybfzsroxuln-auth-token`) **without loading supabase-js** and
  picks the namespace. Sign-in off: the store is exactly `createStore()`,
  nothing else changes, nothing loads.
* **Lazy library**: guests never download supabase-js. It loads (from this
  site, `<script>` with Subresource Integrity) when a session is already on
  the device (after the first screen, on idle) or when an account screen
  needs it. The client: `persistSession`, `autoRefreshToken`,
  `detectSessionInUrl: false`, `flowType: 'pkce'`, default storage key, and
  a `fetch` that refuses any URL outside the project's origin.
* **Sessions**: supabase-js refreshes tokens before they expire and when the
  tab becomes visible. `client.js` only ever compares the *persisted
  session* with the namespace the page booted into (`reconcile()`):
  * gone (a refresh that failed for good, a sign-out in another tab, a
    deleted account found by the visibility re-check) → the page drops to
    guest **calmly**: one line ("You’ve been signed out on this device…"),
    a reload at the next calm moment (Hushfold idle, or the account /
    settings screens). Guest things were never touched; the account's own
    copy stays for its next sign-in.
  * another account (another tab signed in) → reload into that namespace.
  * offline / server error → nothing happens; the session stays.
  * `TOKEN_REFRESHED` / `USER_UPDATED` → nothing to do (same account).
* **Data access**: every server call filters by the booted account's id,
  checks the live session belongs to it, and drops any row that is not its
  own; Row Level Security enforces the same on the server.

### Local namespaces (shared devices)

| Where | Keys |
|---|---|
| `hm2:<key>` (guest; also everything when sign-in is off) | the guest's things, exactly as before accounts |
| `hm2:u:<uid>:<key>` (each account) | `prefs` (all settings, `seenIntro` and the home Mallow included), `hushfold.favourites`, `hushfold.progress`, `hushfold.rotation`, `hushflow.rotation`, `hushfold.lines`, `garden`, `journey`, `played`, `rotation`, `ultra.sealedPredictions`, `beyond.consent`, `beyond.feedback`, `beyond.seen`, `beyond.visits`, `auth.local` (this account on this device: created, guest-data answer), `auth.sync`, `auth.touchedAt` |
| `hm2:<key>` whoever is signed in (**device-level**) | `entitlement` (the plan belongs to the device / App Store account, test purchases included), `beyond.device` (Another Angle's random device code: the server's daily allowance is per device), `beyond.session` (the server session bound to that code), `beyond.invite` (tester invite code), `sound`, `haptics` (the engines' raw switches) |
| supabase-js's own | `sb-<ref>-auth-token`, `…-code-verifier`, `…-flow-…`, `…-user`: removed on sign-out and deletion |

Another Angle **consent is per person**: a second person on the same phone
is asked again; the device code is not reset.

* Sign-in / sign-out / deletion reload the page into the right namespace.
* **First sign-in on a device** with guest things: asked once, "Keep this
  device's things with your account?" Keep copies the guest's keys into the
  account's namespace (only keys the account does not have; the guest keeps
  its own copy; nothing is uploaded). Start fresh copies nothing. Asked once
  per account per device (`auth.local`).
* **Sign-out** (local scope): revokes this session on the server, removes
  every supabase-js key; the account's local copy stays unless the person
  asks to remove it (`signOut({ removeLocal: true })`).
* **Delete account**: `delete_my_account()` on the server, then this
  device's copy of the account and every supabase-js key; the guest's
  things stay.
* **"Remove this device's data"**: this account's local copy only.
* Settings' **"Delete everything on this phone"** in an account empties that
  account's namespace and the device keys (Settings puts the plan back); in
  guest mode it leaves every account namespace alone.

## Client API (`await app.auth.load()`)

`status()` · `user()` · `onChange(fn)` · `init()` · `signUp({ email, password, name })` ·
`signIn({ email, password })` · `chooseGuestData('keep'|'fresh')` · `enter(hash)` ·
`signOut({ removeLocal })` · `resend({ email })` · `sendReset({ email })` ·
`cooldownLeft(kind)` · `reauthenticate()` · `updatePassword({ password, nonce })` ·
`deleteAccount()` · `removeDeviceData()` · `profile.get/update/touch` ·
`consents.get/set('settings'|'library', on)` · `sync.pushPreferences/pullPreferences/pushLibrary/pullLibrary/syncNow(store, prefs)` ·
`signInWithProvider('google')` (a hook: `PROVIDERS.google` is false until
Google is configured; no button). Synchronous without loading:
`app.auth.enabled`, `.status()`, `.user()`, `.pendingGuestChoice`, `.namespace`.
Every failure is `{ ok: false, error: { code, message, field, kind } }` with a
friendly message (never the server's text; sign-in failures read the same
for a wrong password and an unknown email; sign-up, resend and reset always
answer "check your email").

## /auth/callback

`dist/auth/callback/index.html` (absolute `/v/<ver>/` paths; the root
`index.html` keeps relative paths) handles `?token_hash=&type=` (verifyOtp:
works on any device; the recommended templates), `?code=` (PKCE exchange:
same device and browser; a code opened elsewhere says "it’s confirmed: sign
in to carry on"), `?error=` / `#error=`, and recovery → the set-new-password
form. The address bar is cleaned before anything else runs; the only way out
is this site's own `#account` / `#home`. `_headers` for `/auth/*`:
`Cache-Control: no-store`, `Referrer-Policy: no-referrer`, `X-Frame-Options:
DENY`, `X-Content-Type-Options: nosniff`, and a CSP (`default-src 'self'`,
`connect-src 'self' <project>`, `frame-ancestors 'none'`). The root page is
**not** frame-blocked (the Framer embed). Sign-in links that land on the root
(Supabase's Site URL fallback) move to `/auth/callback` with
`location.replace`. No `404.html` is shipped: Pages keeps serving the root
for unknown paths (the version forwarder is unchanged).

## Supabase dashboard settings (owner)

**Authentication → URL Configuration**
* Site URL: `https://app.hushmallow.com`
* Redirect URLs (allow list), exactly:
  * `https://app.hushmallow.com/auth/callback`
  * `https://app.hushmallow.com/auth/callback/`
  * `https://hushmallow.pages.dev/auth/callback`
  * `https://*.hushmallow.pages.dev/auth/callback` (every preview and branch alias)

**Authentication → Sign In / Providers → Email**
* Enable email provider: on · Allow new users to sign up: on
* Confirm email: **on** · Secure email change: **on** · **Secure password change: on**
* Minimum password length: **8** · Required characters: none (length matters most; the app hints gently)
* Leaked password protection: on if the plan has it
* Email OTP expiration: 3600 s · Email OTP length: 6
* Anonymous sign-ins: off · Manual linking: off · CAPTCHA: off for now (the app does not send a captcha token yet)

**Authentication → Emails → Templates** (copy from `supabase/templates/`; every
link uses `token_hash`, so it works on any device; the reauthentication email
is a code):
| Template | Subject | Link / content |
|---|---|---|
| Confirm signup | Confirm your hushmallow account | `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email` (`confirmation.html`) |
| Reset password | Reset your hushmallow password | `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery` (`recovery.html`) |
| Change email address | Confirm your new email for hushmallow | `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email_change` (`email_change.html`) |
| Reauthentication | Your hushmallow code | `{{ .Token }}` (`reauthentication.html`) |
| Magic link (not used by the app) | Your hushmallow sign-in link | `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email` (`magic_link.html`) |

`{{ .RedirectTo }}` is the `/auth/callback` address the app asked for (so a
preview's emails return to that preview); if it is ever not on the allow
list Supabase uses the Site URL, and the root forwards the link to
`/auth/callback`.

**Authentication → Sessions**
* JWT expiry: 3600 s (default) · Refresh token rotation: on · Reuse interval: 10 s (defaults)
* Single session per user: off (people use more than one device)
* Time-box / inactivity timeout: off, or an inactivity timeout of 30 days if the plan has it

**SMTP (Authentication → Emails → SMTP Settings): required before real people sign up.**
Supabase's built-in email service only delivers to members of the project's
team and is heavily rate limited; real users need a custom SMTP provider
(Resend, Postmark, Amazon SES, …) with a sender such as
`hello@hushmallow.com`, SPF / DKIM / DMARC on the domain, then raise
Authentication → Rate Limits → emails per hour to fit (e.g. 30).

**Database**: run the SQL in `supabase/README.md` order, then
`supabase/tests/rls_check.sql` (must end `ALL 34 CHECKS PASSED`).
Data API exposed schemas: `public` only (never `hm_private`).

**Google, later**: Authentication → Providers → Google (client id / secret
from Google Cloud; authorised redirect URI
`https://igbxbfuaoybfzsroxuln.supabase.co/auth/v1/callback`), then set
`PROVIDERS.google = true` in `src/auth/client.js` and add a button that calls
`signInWithProvider('google')` (it returns through `/auth/callback?code=`).

## Cloudflare Pages

Project **hushmallow**, Git integration from this repository: root directory
`hushmallow`, build command `bash tools/build-site.sh dist "$CF_PAGES_COMMIT_SHA"`,
output `dist`, production branch `main` → `https://app.hushmallow.com`,
previews on `*.hushmallow.pages.dev`.

Environment variables, **Production and Preview** (plain text; both values are public):
* `SUPABASE_URL` = `https://igbxbfuaoybfzsroxuln.supabase.co`
* `SUPABASE_PUBLISHABLE_KEY` = `sb_publishable_NSv1Liou2yjKjauX09U5qQ_CxwzDuiw`
* (recommended) `NODE_VERSION` = `22`
* Never: `HM_AUTH_MODE` (dev/ci only), any secret / service-role key, `SUPABASE_ACCESS_TOKEN` — the build fails if one is present.

Without the two values the build publishes `{ enabled: false }` and the app
runs as before (the GitHub Pages workflow builds this way).

## Tests and evidence (stage 1)

* `node --test hushmallow/tests/*.test.mjs` — the whole suite, auth included (61 auth tests).
* `bash hushmallow/tools/auth/sql-check.sh` — migrations (twice), `rls_check.sql` (34/34), rollback, re-apply, on a throwaway local PostgreSQL 16 with a small Supabase stand-in. Also with `SHIM_NO_BYPASS=1`: the pre-flight stops before anything is created.
* `tools/auth/callback-e2e.cjs` — the built site served Pages-style against the fake: 41 checks (sign-up → token_hash link on another device → signed in in the account's namespace; link reuse; recovery → new password with the Mallow reactions; same-device code; code on another device; error / malformed links; no open redirect; root forward; deep links `/`, `/#account`, `/auth/callback`; headers; expiry → guest; sign-in off = boot unchanged; 320×568 at text size 1.25; no console errors or CSP violations).
* Not verified yet: real Supabase Auth (stage E2E on a local Supabase stack in CI), real email delivery, a physical iPhone.

## Manual checklist (owner, production, your own email)

1. SQL editor: run `0001` … `0008`, then `tests/rls_check.sql` → `ALL 34 CHECKS PASSED`.
2. Dashboard settings above (URL configuration, email provider, templates, sessions, **custom SMTP**).
3. Cloudflare Pages: the two variables for Production and Preview; deploy.
4. `curl -sI https://app.hushmallow.com/auth/callback/` → `cache-control: no-store`, `x-frame-options: DENY`, `referrer-policy: no-referrer`; `curl -sI https://app.hushmallow.com/auth/callback` → a redirect to `/auth/callback/` (Pages serves the folder), with the query kept.
5. In a private window, as a guest: everything works as before; the network panel shows no request to `supabase.co`.
6. Create an account with your address (account screen, next stage; until then `await __hush.auth.load().then(a => a.signUp({ email, password }))` in the console). The email comes from your SMTP sender; its button points to `https://app.hushmallow.com/auth/callback?token_hash=…&type=email`.
7. Open the email **on a different device**: "You’re in", then the app with your account. Open the same link again: "expired or already used".
8. Sign out → guest, your guest things as before. Sign in with a wrong password → the same message as for an unknown email. Sign in correctly.
9. Forgot password → email → link → choose a new password → signed in → sign in on the other device with it.
10. Change password in the app → a 6-digit code by email → enter it → the new password works; without the code nothing changes.
11. Turn on "Sync my settings" and "Keep my favourites and progress": Table Editor shows rows for your user only in `preferences`, `favourite_worlds`, `garden_skills`, `hushflow_progress`, and no words or feelings. Turn them off: the rows are gone; `sync_consents` shows the withdrawal time.
12. Shared device: sign in as A, star a world, sign out; sign in as B (a second address): A's star is not there; sign out: the guest's things are back.
13. Session end: delete your test user in Authentication → Users while the app is open on your phone; bring the app to the front: one calm line, then guest.
14. Delete account (typed confirmation): Authentication → Users no longer lists it; no rows remain for it; the app is a guest again.
15. On a preview (`*.hushmallow.pages.dev`): sign up; the email returns to that preview.

## Coordinator wiring points

* **Settings row**: in `src/app/scenes/settings.js`, an empty `h('div')` in the Privacy section filled with
  `import('./account.js').then((m) => m.mountAccountRow(app, rowEl))` (renders nothing when sign-in is off).
* **Side panel link**: `import('../app/scenes/account.js').then((m) => m.openAccount(app))` (only when `app.auth.enabled`).
* **Settings "Delete everything on this phone"** copy: in an account it deletes that account's copy on this phone (not the guest's, not other accounts'); consider "Delete this account's things on this phone" when `app.auth.status() === 'signed-in'`.
* **Prefs sync** (next stage): when "Sync my settings" is on, debounce `prefs.onChange` → `sync.pushPreferences(prefs.all())`; call `sync.syncNow(app.store, app.prefs)` after `init()` and after turning a switch on.
* **Account screens** (next stage) replace the body of `src/app/scenes/account.js`, same scene contract and exports.
* The Framer embed runs the app in a cross-site iframe: browsers partition its storage, so a session there is separate from `app.hushmallow.com`; sign-in is best offered in the top-level app.
