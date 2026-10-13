# Accounts and sign-in (Supabase)

Sign-in is **optional**. Guests keep every experience exactly as before; an
account adds email sign-in, keeps one person's things apart from another's
on a shared device, and (only if the person opts in) keeps their settings,
favourites and progress with the account. Nothing a person types, no
feeling and no photo is ever sent to Supabase.

Status (13 Oct 2026): stage 1 (the core) and stage 2 (every account screen,
account deletion, the opt-in sync while the app runs) are built and tested
against a local fake of Supabase and a local PostgreSQL, in Node and in
Chromium on the built site. **Not yet verified against Supabase itself**:
that is the CI job on a local Supabase stack (next stage) and the owner's
manual checklist below on production. The screens are not wired into
Settings or the side panel yet (coordinator, below); `/#account` opens them.

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
| `src/app/scenes/account.js` | the `account` scene: every account screen (below) + `mountAccountRow(app, el)`, `openAccount(app, params)` |
| `src/ui/account.css` | the account screens' own styles, on top of `src/auth/auth.css` |
| `src/auth/view-model.js` | the screens' pure parts: first screen, cooldown and consent lines, dates, the delete check |
| `src/auth/mallow.js` | the living home Mallow above the card (the app's rig; a still picture if it cannot load) |
| `src/auth/autosync.js` | the opt-in sync while the app runs (never decides consent itself) |
| `supabase/` | migrations 0001–0008, rollback, `tests/rls_check.sql`, email templates, README |
| `tools/auth/` | `fake-supabase.mjs` (test double), `pages-serve.mjs` (Cloudflare-Pages-like static server), `callback-e2e.cjs` and `screens-e2e.cjs` (browser proofs), `sql-check.sh` + `pg-supabase-shim.sql` (SQL on a throwaway local PostgreSQL) |
| `tests/auth-*.test.mjs` | node tests (config, namespaces, errors + callback parsing, the client with the real supabase-js against the fake, two-device sync, the screens' logic and the Mallow, static SQL) |

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
| `hm2:u:<uid>:<key>` (each account) | `prefs` (all settings, `seenIntro` and the home Mallow included), `hushfold.favourites`, `hushfold.progress`, `hushfold.rotation`, `hushflow.rotation`, `hushfold.lines`, `garden`, `journey`, `played`, `rotation`, `ultra.sealedPredictions`, `beyond.consent`, `beyond.feedback`, `beyond.seen`, `beyond.visits`, `auth.local` (this account on this device: created, guest-data answer `keep` / `fresh` ("Not now") / `none` / `cleared`), `auth.sync` (the sync's bookkeeping: the server time of the last settings sync, whether a setting changed here since, and the ids both sides had at the last library sync; ids and times only), `auth.touchedAt` |
| `hm2:<key>` whoever is signed in (**device-level**) | `entitlement` (the plan belongs to the device / App Store account, test purchases included), `beyond.device` (Another Angle's random device code: the server's daily allowance is per device), `beyond.session` (the server session bound to that code), `beyond.invite` (tester invite code), `sound`, `haptics` (the engines' raw switches) |
| supabase-js's own | `sb-<ref>-auth-token`, `…-code-verifier`, `…-flow-…`, `…-user`: removed on sign-out and deletion |

Another Angle **consent is per person**: a second person on the same phone
is asked again; the device code is not reset.

* Sign-in / sign-out / deletion reload the page into the right namespace.
* **First sign-in on a device** with guest things: asked once, "Keep this
  phone's things?" **Keep** copies the guest's keys into the account's
  namespace (keys the account does not have; favourites and the Memory
  Garden merge with the account's own; the guest keeps its own copy; nothing
  is uploaded). **Not now** copies nothing; the account screen then offers
  "This phone's guest things · Bring them in" once (the same copy, later).
  Back on the question means Not now. Asked once per account per device
  (`auth.local`).
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
`guestDataWaiting` · `importGuestData()` ·
`signInWithProvider('google')` (a hook: `PROVIDERS.google` is false until
Google is configured; no button). Synchronous without loading:
`app.auth.enabled`, `.status()`, `.user()`, `.pendingGuestChoice`,
`.guestDataWaiting`, `.namespace`; `app.auth.start({ store, prefs })` (signed
in: load, check the session, start the opt-in sync; main.js calls it on
idle) and `app.auth.autosync` once started.

### The opt-in sync (`sync.syncNow`, `src/auth/autosync.js`)

Only what the person switched on, only ids, numbers and switches.
* **Settings** ("Sync my settings"): the newer side wins **by the server's
  clock** (`preferences.updated_at`): the account's copy comes down when
  another device changed it since this one last synced and nothing changed
  here; otherwise this device's goes up. The first time on a device the
  account's copy wins.
* **Favourites, Memory Garden, Hushflow pause** ("Keep my favourites and
  progress with my account"): merged three ways against what both sides had
  at the last sync, so a world un-starred, a tool let go or a pause finished
  on either device stays gone; new things on both sides are kept; the newer
  pause wins. Only what differs is uploaded.
* **When**: after the session check at start; a few seconds after a synced
  setting or a library change (debounced; a change during a run queues one
  more); when the page comes back to the front (at most once a minute) or
  back online; when it goes to the background with a change waiting; at
  once after a switch is turned on. A switch known to be off costs no
  request.
* **Withdrawing** deletes the synced rows on the server (SQL 0006) and
  forgets the bookkeeping; this phone keeps its own copy; turning it on
  again starts from this phone.

## The account screens (`src/app/scenes/account.js`)

One scene, one card, the person's home Mallow above it. `data-auth-view`
on the scene names the screen; deeper screens get a history entry, so Back
(the button or the browser's) steps back through them before leaving.

| Screen | What it does |
|---|---|
| `welcome` (guest) | three plain promises; Create an account / Sign in / Continue as a guest |
| `create` | email (`autocomplete=email`), password (`new-password`, show/hide, a gentle strength meter and hint, 8+ characters), optional name (`nickname`) |
| `check-email` | the address; "I've confirmed it: sign in"; "Send it again" with its 60 s cooldown counting down; use a different email |
| `signin` | email, password (`current-password`, show/hide), Forgot your password?; wrong password and unknown email read the same; unconfirmed → "Send the link again" |
| `forgot` → `reset-sent` | the same neutral answer for any email; resend with cooldown; the link sets the new password on `/auth/callback` |
| `guest-choice` | Keep them with my account / Not now (above) |
| `account` | "Hi, <name>", the email, with hushmallow since; name (saved to the profile); home Mallow (seven portraits, a radio group; also the Hushfold's Mallow); the two sync switches, each with a privacy line and "On since <date, time>" / "Off since … deleted then"; Change password; Sign out; Remove this phone's data; Delete my account |
| `password` | step 1 emails a 6-digit code (Supabase reauthentication); step 2: the code (`one-time-code`, numeric) + the new password; a hidden `username` field for password managers; resend after 60 s |
| `signout` | Sign out / Sign out and remove my things from this phone / Stay signed in |
| `device-data` | removes this account's things from this phone only; says whether what is kept with the account comes back |
| `delete` | exactly what is deleted on the server and on this phone, and what is not touched (the guest's things, other accounts, the plan, Another Angle); type `delete` to enable the button |
| `off` / `expired` | sign-in off in this build / the session ended |

**The home Mallow** (`src/auth/mallow.js`, the same on `/auth/callback`):
the account's home Mallow (else the Hushfold's, else Blubi), alive. Moods:
idle; **away** (eyes shut in two soft arcs while a password field has
focus); busy (waiting for the server); **happy** (one soft hop on success,
then idle); **concerned** (worried brows, a flat mouth, no tears) after an
error, until typing starts again. Reduced motion: no hop and no float, the
face still changes. If the rig cannot load, a still picture with small CSS
moods. Decorative (`aria-hidden`): every state is also said in words.

**Accessibility and phones**: every field has a label; focus moves to the
screen's heading; errors are `role=alert` and the field gets
`aria-invalid` + `aria-describedby`; text ≥ 13 px, inputs ≥ 16 px (no iOS
zoom), targets ≥ 44 px; emails break at `@` or `.`; keyboard-safe on iPhone
(`visualViewport` → `--kb`: the Mallow sits smaller and a field hidden by
the keyboard is scrolled into the visible part; a field already in sight
never moves); an offline pill; works at 320×568 at text size 1.25 and at
1280×800 (the card stays phone-sized).
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

## Tests and evidence

Everything here ran in this sandbox against the **local fake** of Supabase
(`tools/auth/fake-supabase.mjs`) and a throwaway PostgreSQL 16, never
production and never Supabase itself.
* `node --test hushmallow/tests/*.test.mjs`: the whole suite, auth included
  (stage 2: 503 of 503; `auth-screens` 11 and `auth-sync-live` 5 are new).
* `bash hushmallow/tools/auth/sql-check.sh`: migrations (twice),
  `rls_check.sql` (34/34), rollback, re-apply (stage 1; the SQL did not
  change in stage 2).
* Browser, on the **built** site (an `HM_AUTH_MODE=dev` build in
  `/tmp/claude-0/hf/auth/site`, served by `tools/auth/pages-serve.mjs` on
  8202 the way Pages serves it; the fake on 8203; the dev tree on 8201):
  * `tools/auth/callback-e2e.cjs`: 41 checks (stage 1, rerun on the new screens).
  * `tools/auth/screens-e2e.cjs --part flows`: 42 checks by touch (CDP):
    create → check email → confirm on another device → sign in (wrong
    password first) → Keep → reload keeps the session → sync on (rows
    appear, ongoing changes follow) → withdraw (rows deleted) → change
    password (wrong code first) → sign out → forgot → reset on another
    device → sign in; token expiry → refresh; refresh failure → calm guest
    fallback; Back through the screens; the keyboard; unconfirmed + resend.
  * `--part people`: 14 checks: two accounts and a guest on one browser,
    Not now then Bring them in, offline, delete account (auth user and rows
    gone, this device's copy wiped, the others untouched).
  * `--part gallery`: 67 checks: every screen at 390×844, 375×812,
    320×568, 320×568 at text size 1.25 and 1280×800 (no sideways scroll,
    text ≥ 13 px, inputs ≥ 16 px, targets ≥ 44 px, nothing clipped), and
    reduced motion.
* Not verified: real Supabase Auth and PostgREST (the CI job on a local
  Supabase stack), real email delivery, a physical iPhone keyboard (a
  stand-in `visualViewport` was used), VoiceOver.

## Manual checklist (owner, production, your own email)

The account screen opens at `https://app.hushmallow.com/#account` until
the Settings row is wired.
1. SQL editor: run `0001` … `0008`, then `tests/rls_check.sql` → `ALL 34 CHECKS PASSED`.
2. Dashboard settings above (URL configuration, email provider, templates, sessions, **custom SMTP**).
3. Cloudflare Pages: the two variables for Production and Preview; deploy.
4. `curl -sI https://app.hushmallow.com/auth/callback/` → `cache-control: no-store`, `x-frame-options: DENY`, `referrer-policy: no-referrer`; `curl -sI https://app.hushmallow.com/auth/callback` → a redirect to `/auth/callback/` (Pages serves the folder), with the query kept.
5. In a private window, as a guest: everything works as before; the network panel shows no request to `supabase.co` until you open `/#account` and a sign-in screen.
6. Star a world as a guest. `/#account` → Create an account with your address (and a name). "Check your email" shows your address; "Send it again" counts down.
7. The email comes from your SMTP sender; its button points to `https://app.hushmallow.com/auth/callback?token_hash=…&type=email`. Open it **on a different device**: "You're in", then the account screen there. Open the same link again: "expired or already used".
8. On the first phone: "I've confirmed it: sign in". A wrong password first → "That email and password don't match…" (the same as for an unknown email) and a worried Mallow. Then the right one → "Keep this phone's things?" → Keep → signed in with your star.
9. Reload: still signed in. Account card: your name, email, home Mallow; pick another Mallow (it hops; the Hushfold uses it).
10. Turn on both switches: each shows "On since …". Table Editor: rows for your user only in `preferences` and `favourite_worlds` (no words or feelings anywhere), `sync_consents` with both times. Star another world: it appears within seconds. Turn both off: the rows are gone; `sync_consents` shows the withdrawal times; the phone keeps its stars.
11. Change password → "Email me a code" → a 6-digit code by email → a wrong code first ("That code didn't work") → the right code + a new password → "Your new password is saved". Sign in elsewhere with it.
12. Sign out → Sign out: a guest again with the guest's things. Forgot your password → the email → the link (any device) → choose a new password → signed in there; sign in here with it (no second "keep" question).
13. Shared device: sign in as A, star a world, sign out; create B (a second address) → Not now: none of A's or the guest's things; "Bring them in" brings the guest's in. Sign out: the guest's things are back. Sign in as A: A's things only.
14. Session end: delete your test user in Authentication → Users while the app is open on your phone; bring the app to the front: one calm line, then guest.
15. Delete account (type `delete`): Authentication → Users no longer lists it; no rows remain for it; "Your account is deleted…"; the app is a guest again with the guest's things.
16. Offline (aeroplane mode) on the account card: a calm pill; a switch says it can't reach hushmallow and stays as it was.
17. On a preview (`*.hushmallow.pages.dev`): sign up; the email returns to that preview.

## Known limits

* The GitHub Pages copy (`hushmallow-pages.yml`) builds without the two values: sign-in is off there, and its `/auth/callback/` (absolute `/v/<ver>/` paths for a site at the domain root) is not meant to be used under a project path.
* Signing out while offline removes the session from this device but cannot revoke it on the server; it expires on its own (refresh-token rotation ends it at the next refresh attempt).
* The Framer embed is a cross-site iframe: browsers partition its storage, so an account there is a separate session (see below).
* Deep paths other than `/`, `/#…` and `/auth/callback` (e.g. `/a/b`) still get Pages' single-page fallback, whose relative asset paths do not resolve two folders down (unchanged from before; nothing links there).
* Changing the account's email is not in the app yet (the template and `/auth/callback?type=email_change` are ready).
* Settings' "Delete everything on this phone" in an account empties this account's copy here; with a sync switch on, what is kept with the account comes back at the next sync (the account still has it). Turning the switch off first deletes it there too.
* The browser proofs drive a stand-in keyboard (`visualViewport`); a physical iPhone has not been tried.

## Coordinator wiring points

The screens are ready to wire (stage 2); nothing in Settings or the side
panel was changed here.
* **Settings row**: in `src/app/scenes/settings.js`, an empty `h('div')` at the top of the Privacy section filled with
  `import('./account.js').then((m) => m.mountAccountRow(app, rowEl))`: "Sign in or create an account · Optional…" / "Your account · Signed in as …" with one button; renders nothing when sign-in is off.
* **Side panel link**: `import('../app/scenes/account.js').then((m) => m.openAccount(app))`, shown only when `app.auth.enabled`; `openAccount(app, { view: 'signin' })` or `{ view: 'create' }` opens a guest's screen directly.
* **Settings "Delete everything on this phone"** copy: in an account it deletes that account's copy on this phone (not the guest's, not other accounts'); consider "Delete this account's things on this phone" when `app.auth.status() === 'signed-in'`, and see the known limit about sync above.
* The opt-in sync needs no wiring: `main.js` starts it (`app.auth.start`) and it hears `app.prefs` and `app.store` writes.
* The Framer embed runs the app in a cross-site iframe: browsers partition its storage, so a session there is separate from `app.hushmallow.com`; sign-in is best offered in the top-level app.
