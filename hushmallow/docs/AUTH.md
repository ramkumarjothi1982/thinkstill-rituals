# Accounts and sign-in (Supabase)

Sign-in is **optional**. Guests keep every experience exactly as before; an
account adds email sign-in, keeps one person's things apart from another's
on a shared device, and (only if the person opts in) keeps their settings,
favourites and progress with the account. Nothing a person types, no
feeling and no photo is ever sent to Supabase.

Status (13 Oct 2026): stage 1 (the core) and stage 2 (every account screen,
account deletion, the opt-in sync while the app runs) are built and tested
against a local fake of Supabase and a local PostgreSQL, in Node and in
Chromium on the built site. Stage 3 adds the **isolated end-to-end check on
a real local Supabase stack** in GitHub Actions (below: "The isolated E2E");
it has run there three times on `claude/upbeat-pasteur-b0aqg1`, all green:
run 38377721517 (**76 of 76**), run 38390483903 (**97 of 97**) and run
38416054844 (**101 of 101**, after the round-3 docs commit `de58144`).
Production is verified only by the owner's manual checklist below. The
**Settings row is wired** (Settings → Privacy, the top row; nothing when
sign-in is off); the side panel **deliberately has no account link**
(below, "Wiring"); `/#account` opens the screens too, and is the only deep
link the app honours.

The final QA sweep (13 Oct 2026, "everything around the main screen"):
an arrival is said on the account card's own lede, never in a toast over
its fields; the Settings row keeps an address whole (it breaks after "@"
first); Settings' delete button says whose things it deletes ("Delete
this account's things on this phone" signed in, "Delete the guest's things
on this phone" for a guest on a phone accounts also use); Settings → About
says what an account keeps instead of "nothing you type leaves this
phone"; every sheet closes on Back before the scene does.

Round 2 (the first independent review): a password change is real
reauthentication on every session (the current password first, the emailed
code only when Supabase asks); guests' keys are pinned byte for byte by
tests; Delete account never shows a happy Mallow; a sync in flight can no
longer write a deleted or signed-out account's things back; a reset link
works on a browser where someone else is signed in; the 64-row cap allows
re-saving (SQL `0009`).

Round 3 (the second independent review): deleting the account, "Sign out
and remove my things" and "Remove this phone's data" now clear this
device's copy even when **another tab of the same account** is open in a
scene that is not calm (a device-level tombstone every page honours, below);
the home Mallow picker shows the Mallow actually greeting you; an arrival
names the account it signed in; "That password doesn't match." sits under
Current password; an address in a lede stays in one piece; today's guest
snapshot uses a real plan tier and pins every guest key. Found while
re-running the E2E dry run: on a shared browser, a page checking its own
session at the moment another tab opened someone else's link could clear
(and end on the server) the *other* account's new session; a page now only
ever clears its own session (below, "Shared browsers").

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
| `supabase/` | migrations 0001–0009, rollback, `tests/rls_check.sql`, email templates, README; `config.toml` = the **local** stack for the CI E2E only (never a hosted project) |
| `tools/auth/` | `fake-supabase.mjs` (test double; renders the real templates and answers a Mailpit-style API), `pages-serve.mjs` (Cloudflare-Pages-like static server), `callback-e2e.cjs`, `screens-e2e.cjs` and `fixes-e2e.cjs` (browser proofs against the fake), `sql-check.sh` + `pg-supabase-shim.sql` (SQL on a throwaway local PostgreSQL), `e2e-stack-env.mjs` (the local stack's public values for CI), `E2E` (append a line to run the CI E2E) |
| `tests/auth-*.test.mjs` | node tests (two pages of one account and the device-level tombstone (`auth-wipe`), config, namespaces, errors + callback parsing, the client with the real supabase-js against the fake, two-device sync, the screens' logic and the Mallow, static SQL, the E2E's own safety and plumbing, races with a sync in flight (`auth-quiesce`), today's guest keys (`auth-guest-keys`, snapshot in `tests/helpers/guest-snapshot.mjs`)) |
| `tests/e2e/auth.e2e.mjs` | the isolated end-to-end check (CI: a local Supabase stack; dry run: the fake) |
| `.github/workflows/hushmallow-auth-e2e.yml` | runs it on a GitHub runner (below) |

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
| `hm2:auth.wipe:<uid>` (**device-level**, one per account) | the tombstone written when that account's copy here is removed (`{ v, id, at, reason: deleted \| signed-out \| device-data, pending }`; ids and times only), below. A guest's "Delete everything on this phone" leaves it |
| `hm2:<key>` whoever is signed in (**device-level**) | `entitlement` (the plan belongs to the device / App Store account, test purchases included), `beyond.device` (Another Angle's random device code: the server's daily allowance is per device), `beyond.session` (the server session bound to that code), `beyond.invite` (tester invite code), `sound`, `haptics` (the engines' raw switches: they mirror the settings of whoever is using the phone, rewritten from that person's `prefs` at boot exactly as today's app does, so a guest's own values come back from the guest's `hm2:prefs` at the guest's next boot) |
| supabase-js's own | `sb-<ref>-auth-token`, `…-code-verifier`, `…-flow-…`, `…-user`: removed on sign-out and deletion |

Another Angle **consent is per person**: a second person on the same phone
is asked again; the device code is not reset.

**Guests keep today's data** (coordinator decision 3): every key today's app
keeps for a guest is read and written exactly as before, with sign-in off
and on. `tests/auth-guest-keys.test.mjs` seeds a snapshot of today's guest
keys (`tests/helpers/guest-snapshot.mjs`: prefs, favourites, Hushflow pause
and rotation, Memory Garden, Another Angle consent / device / session /
feedback, the plan, the raw sound and haptics switches), boots the app's own
store with sign-in off and on, reads every key through the app's readers and
asserts each raw value is byte-identical with no key moved; then a real
sign-in → "Not now" → the account's page → sign-out, and the same again. The
browser proof (`tools/auth/fixes-e2e.cjs`) and the CI E2E (`guestkeys`) do
it in the built app.

* Sign-in / sign-out / deletion reload the page into the right namespace.
* **First sign-in on a device** with guest things: asked once, "Keep this
  phone's things?" **Keep** copies the guest's keys into the account's
  namespace (keys the account does not have; favourites and the Memory
  Garden merge with the account's own; the guest keeps its own copy; nothing
  is uploaded). **Not now** copies nothing; the account screen then offers
  "This phone's guest things · Bring them in" once (the same copy, later).
  Back on the question means Not now. Asked once per account per device
  (`auth.local`).
* The question is only asked when the guest has real things: a brand-new
  visitor's automatic preferences (defaults, the intro seen, the Mallow
  shown) do not count (`prefsChosen()`).
* **Sign-out** (local scope): revokes this session on the server, removes
  every supabase-js key; the account's local copy stays unless the person
  asks to remove it (`signOut({ removeLocal: true })`).
* **Delete account**: `delete_my_account()` on the server, then this
  device's copy of the account and every supabase-js key; the guest's
  things stay.
* **"Remove this device's data"**: this account's local copy only.
* **Nothing is written back afterwards**: the moment a sign-out, a deletion
  or "Remove this device's data" starts, the account's namespace is
  **sealed** (`sealAccount()`: every set / remove through its store is
  dropped) and the opt-in sync is paused and waited for (at most 5 s); the
  account's copy is removed, and removed once more right before the reload.
  A deletion the server refuses unseals and resumes. (Round 1 found a sync
  in flight writing `hm2:u:<deleted uid>:auth.sync` back.)
* **…on every page of this device, not only the one that did it** (round
  2 found a second tab of the same account, sitting in the Memory Garden,
  writing into the deleted account's namespace until its deferred reload,
  and nothing ever removing those keys). Before anything is removed,
  `deleteAccount()`, `signOut({ removeLocal: true })`, `removeDeviceData()`
  and the "deleted elsewhere" check write a **device-level tombstone**,
  `hm2:auth.wipe:<uid>`, with a new id (`writeWipe`). Then:
  * every store of that account compares the tombstone it booted with
    (`ns.wipeId`) on each write: a newer one means the write is dropped, at
    once, even before the page hears the storage event (`wipedSince`);
  * a page that hears the event (`client.js` `onWipe`, or `boot.js` before
    supabase-js has loaded) seals itself, removes what it wrote before it
    heard (when the copy is to go), pauses its sync and reloads at its next
    calm moment, saying so at once ("Your account is deleted…", "You're
    signed out…", "This device's copy of your things is removed.");
  * the next boot (`authBoot` → `cleanupWipes`) removes anything left of an
    account whose tombstone is still *pending*; a boot that lands while
    another tab is still removing that very account's copy (pending and
    under 2 minutes old) boots sealed and writes nothing, not even the
    once-only question's marker;
  * signing that account in again on this device (a sign-in here, or a
    link on `/auth/callback`) settles the tombstone first (`settleWipe`:
    anything left goes, the tombstone stops asking, same id), so its new
    copy is kept from then on, across later plain sign-outs.
  "Remove this phone's data" is never pending (the account stays signed in
  and its "cleared" marker stays); pages that boot after the tombstone are
  not sealed by it. A plain sign-out and an expired session write **no**
  tombstone: the account keeps its copy for its next sign-in.
* **An account deleted on another device**: if this page asks the server
  while its access token is still valid, the answer is `user_not_found`:
  this device writes the tombstone, drops to guest and removes that
  account's copy. Once the access token has expired, supabase-js's refresh
  fails with `refresh_token_not_found` instead, which reads exactly like a
  session ended elsewhere, so the page drops to guest and **keeps** the copy
  (see Known limits). An account only signed out elsewhere keeps its copy.
* Settings' **"Delete everything on this phone"** in an account empties that
  account's namespace and the device keys (Settings puts the plan back); in
  guest mode it leaves every account namespace alone.

## Client API (`await app.auth.load()`)

`status()` · `user()` · `onChange(fn)` · `init()` · `signUp({ email, password, name })` ·
`signIn({ email, password })` · `chooseGuestData('keep'|'fresh')` · `enter(hash)` ·
`signOut({ removeLocal })` · `resend({ email })` · `sendReset({ email })` ·
`cooldownLeft(kind)` · `updatePassword({ current, password, nonce })` · `reauthenticate()` ·
`endDetachedSession({ access_token, refresh_token })` · `addQuiescer({ pause, resume })` ·
`deleteAccount()` · `removeDeviceData()` · `profile.get/update/touch` ·
`consents.get/set('settings'|'library', on)` · `sync.pushPreferences/pullPreferences/pushLibrary/pullLibrary/syncNow(store, prefs)` ·
`guestDataWaiting` · `importGuestData()` ·
`signInWithProvider('google')` (a hook: `PROVIDERS.google` is false until
Google is configured; no button). Synchronous without loading:
`app.auth.enabled`, `.status()`, `.user()`, `.pendingGuestChoice`,
`.guestDataWaiting`, `.namespace`; `app.auth.start({ store, prefs })` (signed
in: load, check the session, start the opt-in sync; main.js calls it on
idle) and `app.auth.autosync` once started.

### Changing the password: real reauthentication (coordinator decision 2)

`updatePassword({ current, password })` on the account screen:
1. The **current** password is checked with `signInWithPassword` for the
   signed-in email on an **isolated** supabase-js client
   (`createIsolatedClient`: `persistSession`, `autoRefreshToken` and
   `detectSessionInUrl` off, its own in-memory storage and its own storage
   key, so its own lock; it never touches this page's session or the
   account's namespace). Its short-lived session is signed out at once with
   scope **`local`**, never `global` (which would end the person's real
   session on every device). A wrong current password reads **"That password
   doesn't match."** (no lockout wording, nothing about the account);
   "Forgot your password?" sits right under the field.
2. `updateUser({ password })` on the main client. On a session signed in
   within the last 24 hours that is all.
3. Only when Supabase answers `reauthentication_needed` (secure password
   change on a session **over 24 hours old**) is the 6-digit code emailed
   (`reauthenticate()`); the screen asks for it, and
   `updatePassword({ current, password, nonce })` finishes the change
   (within 10 minutes the current password is not checked again). A wrong
   code reads "That code didn't work…". "Send a new code" waits 60 s.
Supabase then ends the account's other sessions (its own rule for a
password change), so other devices sign in again. `/auth/callback` sets a
new password from a reset link with `updatePassword({ password,
recoveryUid })`, only for the account that link opened.

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
| `password` | the current password (`current-password`, show/hide, "Forgot your password?" under it) and the new one (`new-password`, strength hint); a hidden `username` field for password managers. Only when Supabase asks (a session over 24 hours old): "Enter the code" (`one-time-code`, numeric), "Send a new code" after 60 s |
| `signout` | Sign out / Sign out and remove my things from this phone / Stay signed in |
| `device-data` | removes this account's things from this phone only; says whether what is kept with the account comes back |
| `delete` | exactly what is deleted on the server and on this phone, and what is not touched (the guest's things, other accounts, the plan, Another Angle); type **“delete”** (set apart in the label) to enable the button |
| `off` / `expired` | sign-in off in this build / the session ended |

**The home Mallow** (`src/auth/mallow.js`, the same on `/auth/callback`):
the Mallow greeting this person now, picked exactly as the Hushfold picks it
(`view-model.js` `homeMallow`: this visit's pick, then this device's last
choice, `prefs.mallow`, else the Mallow on the stage, i.e. the time of
day), alive; the picker on the account card rings that same Mallow and,
until one is picked, says "Pipzi is greeting you for now. Until you pick
one, it changes with the time of day." The account's own home Mallow
(chosen on another device) is used only on a device that has not chosen
one. Moods:
idle; **away** (eyes shut in two soft arcs while a password field has
focus); busy (waiting for the server); **happy** (one soft hop on success,
then idle); **concerned** (worried brows, a flat mouth, no tears) after an
error, until typing starts again. Reduced motion: no hop and no float, the
face still changes. **Delete account** and **Remove this phone's data** are
sombre from the very first frame (coordinator decision 4): the concerned
face is applied at once (`mood(name, { instant: true })` drops any reaction
still playing and a rising hop), a late "happy" from an earlier screen is
ignored there, and typing the confirmation keeps it concerned. A notice
still showing from before ("You're signed in.") fades as soon as the person
moves to another screen. If the rig cannot load, a still picture with small CSS
moods. Decorative (`aria-hidden`): every state is also said in words.

**Accessibility and phones**: every field has a label; focus moves to the
screen's heading; errors are `role=alert` and the field gets
`aria-invalid` + `aria-describedby`; text ≥ 13 px, inputs ≥ 16 px (no iOS
zoom), targets ≥ 44 px; an email breaks after `@` first, then after a dot,
never mid-word (`emailParts()`, also in the Settings row); a pill that must
wrap balances its lines ("Confirmed? Sign in" when "I've confirmed it: sign
in" would wrap); keyboard-safe on iPhone
(`visualViewport` → `--kb`: the Mallow sits smaller and a field hidden by
the keyboard is scrolled into the visible part; a field already in sight
never moves); an offline pill; works at 320×568 at text size 1.25 and at
1280×800 (the card stays phone-sized).
**Naming the account**: an arrival says which account it signed in. On the
account card (where an arrival lands: `/#account`, a first sign-in, Keep /
Not now) the card's lede says it the first time it shows, in full as the
card shows the address anyway ("You're signed in as ana@example.com.",
"Your email is confirmed. You're signed in as …"), never a toast over the
card's fields on a small phone; `main.js` hands the notice to the scene
(`params.notice`) and the scene toasts any other notice itself. Elsewhere
the line is a toast, shortened for anyone nearby ("You're signed in as
an…@example.com."), as on the `/auth/callback` page. "Keep this phone's
things?" names it in full: a link, or a shared phone, that signed in someone
other than expected is plain at once. A field's error sits right under that field
(Change password: "That password doesn't match." under Current password,
above "Forgot your password?"); others just above the buttons. An email in a
lede stays in one piece with its punctuation (it moves to the next line
whole and breaks at "@" or a dot only when wider than the card).
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

**Shared browsers**: the callback page belongs to no account
(`createCallbackAuth`: passive, namespace-free). The link decides whose
session comes next: B's reset link opened where A is signed in sets **B's**
new password (round 1 found it refused with "Sign in first"). The session
the browser held before is ended on the server with scope `local`
(`endDetachedSession`, an isolated client; that one session only), the app
then boots into B's own namespace, another open tab leaves A's namespace,
and A's things stay in A's namespace for A's next sign-in. `openLink()`
holds the link's work, so Node tests run it.

**A page only ever clears its own session** (round 3). While B's link is
being opened in tab 2, A's page in tab 1 may be checking its session; tab 2
ends A's session on the server, so A's check (already on the wire with A's
token) is refused. supabase-js's `getUser()` reacts to "session not found"
by removing whatever session is stored at that moment, which is B's by
then, and A's page used to sign out (on the server) whatever session was
stored: B's new password then failed with "Sign in first" (seen in 2 of 3
E2E dry runs). Now `verify()` asks `GET /auth/v1/user` itself, with exactly
the token it read from storage, and clears that session only while it is
still the one stored (`ownSession`); `signOut()` and `deleteAccount()` call
supabase-js's sign-out only while the stored session is still the
account's own, and never remove another account's keys (`clearOwnKeys`).
`tests/auth-session-race.test.mjs` makes the other tab's write at the exact
moment A's request is on the wire (3 of its first 4 tests fail on the
previous client).

**…and the link's page keeps hold of the session it opened.** A trace of a
remaining dry-run failure showed the other direction: A's page had a token
refresh in flight when tab 2 stored B's session, heard about B only ~0.5 s
later (localStorage reaches other tabs asynchronously), and its save landed
over B's session. `/auth/callback` now keeps the session the link opened in
its own memory (`holdLinkSession`) and puts it back if it was overwritten,
before it sets a new password and before it sends the person into the app
(`keepLinkSession`); and a page that hears that the stored session is gone
or another account's stops supabase-js's auto refresh at once. (The dry
run's 20 s access tokens, shorter than supabase-js's 90 s refresh margin,
make every call refresh and so widen this window enormously; with
production's hour-long tokens a page refreshes about once an hour.)

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
  (Supabase asks for the emailed reauthentication code when the session is
  **more than 24 hours old**; the app always checks the current password
  first, on every session, and asks for the code only when Supabase does.)
* If the dashboard offers it (Authentication → Emails → notifications): the
  "password changed" notification email, so an account hears when its password changes
* Minimum password length: **8** · Required characters: none (length matters most; the app hints gently)
* Leaked password protection: on if the plan has it
* Email OTP expiration: 3600 s · Email OTP length: 6
* Anonymous sign-ins: off · Manual linking: off · CAPTCHA: off for now (the app does not send a captcha token yet)

**Authentication → Emails → Templates** (copy from `supabase/templates/`; every
link uses `token_hash`, so it works on any device; the reauthentication email
is a code):
| Template | Subject | Link / content |
|---|---|---|
| Confirm signup | Confirm your hushmallow account | `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&amp;type=email` (`confirmation.html`) |
| Reset password | Reset your hushmallow password | `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&amp;type=recovery` (`recovery.html`) |
| Change email address | Confirm your new email for hushmallow | `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&amp;type=email_change` (`email_change.html`) |
| Reauthentication | Your hushmallow code | `{{ .Token }}` (`reauthentication.html`) |
| Magic link (not used by the app) | Your hushmallow sign-in link | `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&amp;type=email` (`magic_link.html`) |

Every link goes to **the Site URL's own** `/auth/callback`
(`https://app.hushmallow.com/auth/callback`), whatever address the request
named: a one-time token in an email can only ever reach the production app,
never a preview or a loopback address that some request put in
`redirect_to` (Supabase accepts any allow-listed URL there, and any
`127.0.0.1` / `localhost` address). So **the Site URL must be exactly
`https://app.hushmallow.com`, with no trailing slash** (a slash would make
the links `…com//auth/callback`). An email asked for on a preview therefore
opens production; the person signs in on the preview afterwards. (Until
stage 3 the links used `{{ .RedirectTo }}`, which returned to a preview but
let an allow-listed origin receive tokens.) The links write `&amp;type=…`
(`&amp;` is HTML for `&`; the mail client opens `…&type=…`). The same files are what the CI
E2E's local stack sends (`supabase/config.toml`), so the links are checked
end to end there.

**Authentication → Sessions**
* JWT expiry: 3600 s (default) · Refresh token rotation: on · Reuse interval: 10 s (defaults)
* Single session per user: **off** (people use more than one device; and
  the current-password check signs in once more on an isolated client: with
  "single session" on, that would end the person's real session)
* Time-box / inactivity timeout: off, or an inactivity timeout of 30 days if the plan has it

**SMTP (Authentication → Emails → SMTP Settings): required before real people sign up.**
Supabase's built-in email service only delivers to members of the project's
team and is heavily rate limited; real users need a custom SMTP provider
(Resend, Postmark, Amazon SES, …) with a sender such as
`hello@hushmallow.com`, SPF / DKIM / DMARC on the domain, then raise
Authentication → Rate Limits → emails per hour to fit (e.g. 30).

**Database**: run the SQL in `supabase/README.md` order, then
`supabase/tests/rls_check.sql` (must end `ALL 35 CHECKS PASSED`).
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

## The isolated E2E (CI, a local Supabase stack)

`.github/workflows/hushmallow-auth-e2e.yml` runs the real flows against
**real Supabase software on the GitHub runner**, never against a hosted
project. Run it by appending a line to `hushmallow/tools/auth/E2E` on a
`claude/**` branch (or Actions → "hushmallow sign-in e2e" → Run workflow,
once the file is on `main`). About 10 minutes. Steps:

1. Refuses to start if any Supabase secret, access token or the production
   values are in the job, or if `supabase/config.toml` names a hosted
   project. No repository secret is read at all.
2. `node --test hushmallow/tests/auth-*.test.mjs`.
3. Supabase CLI **2.117.0** (pinned, `supabase/setup-cli` pinned to a
   commit): `supabase start` in `hushmallow/` with `supabase/config.toml`
   (Postgres 17, Auth, PostgREST, Kong, Mailpit; Studio, Realtime, Storage,
   Functions, analytics off; the migrations `0001`…`0009` applied in order
   as `postgres`, like the SQL editor; no seed).
4. `tools/auth/e2e-stack-env.mjs` keeps only the stack's **public** values
   from `supabase status -o json` (API URL, publishable key, the local
   database URL, Mailpit) and refuses anything not on the runner; the
   stack's secret / service-role keys are never read or stored.
5. psql: the 9 migrations are recorded; `supabase/tests/rls_check.sql`
   must print `ALL … CHECKS PASSED` with no `FAIL` and leave no account
   behind, or the job stops.
6. `tools/build-site.sh` with `HM_AUTH_MODE=ci` and the stack's URL and
   publishable key; the site served at its root on `http://127.0.0.1:8000`
   by `tools/auth/pages-serve.mjs`, the way Cloudflare Pages serves it.
7. Playwright 1.63.0 + Chromium: `tests/e2e/auth.e2e.mjs` (below).
8. Always: the screenshots, `report.json`, `summary.md`, the RLS output and
   the stack's container logs as the run's `hushmallow-auth-e2e` artifact;
   the summary table on the run page; `supabase stop --no-backup`.

`supabase/config.toml` (local stack only): Site URL and redirect list
`http://127.0.0.1:8000[/auth/callback]`; email confirmations, secure email
change and **secure password change on**; 8-character passwords; refresh
rotation; **access tokens of 120 s** so supabase-js refreshes for real
during the run; the production templates and subjects from
`supabase/templates/`; Mailpit on 54324; generous local rate limits (one
IP signs in many times); new public tables get **no** Data API privileges by
default (`auto_expose_new_tables = false`), so the migrations' own grants
must be enough. It was checked with the pinned CLI here (it parses the file
and the template paths before it needs Docker).

`tests/e2e/auth.e2e.mjs`, by touch (CDP) on phone-sized Chromium contexts,
with mail read from Mailpit's API and the server's view read with psql from
the local database (each section says why if it cannot run):
* **guest**: the app boots unchanged for a guest (no supabase-js, no
  request to the stack); `/auth/callback/` headers; `/auth/callback`
  redirects with the query kept.
* **callback**: a bogus `token_hash` and an error link → "This link didn't
  open … expired or was already used", a clean address bar, the only way
  out is this site.
* **signup**: create → the confirmation email (subject and a
  `<site>/auth/callback?token_hash=…&type=email` link) → "Send it again" →
  a new email → its link on another device signs in there; the profile row
  (name, schema version) from the trigger; nothing synced before opt-in;
  the used link and the replaced link both fail kindly.
* **signin**: wrong password and unknown email read the same → right one
  → "Keep this phone's things?" → Keep → reload keeps the session.
* **sync**: both switches on → rows for this account only, consent
  times from the server; a new star and a setting follow within seconds;
  off → the rows deleted, withdrawal time-stamped, the phone keeps its copy.
* **refresh**: past the access token's expiry, still signed in; the next
  call works and the token was refreshed.
* **guestkeys**: a snapshot of today's guest keys boots in the built app
  and comes through sign in → "Not now" → the account → sign out
  byte-identical and unmoved.
* **password**: a session from today: a wrong current password is refused
  ("That password doesn't match."), the right one changes it at once, no
  code is emailed and the page's own session stays alive (the check's
  sign-in was ended with scope `local`); then the session is aged 25 hours
  **in the local database**: Supabase asks for reauthentication, the
  emailed code is required, a wrong code is refused, the right one works,
  the old password no longer does.
* **signout**: every `sb-` key gone; the guest's things back; the account's
  copy kept; this browser's session gone on the server.
* **reset**: forgot → the reset email → its link on a 320×568 phone → a new
  password, signed in there → signed in here with it.
* **expiry**: this account's sessions deleted on the server → one calm
  line, a guest again, guest things untouched.
* **people**: a second account on the same browser ("Not now") sees nothing
  of the first or the guest; with A's own token PostgREST returns none of
  B's rows in any table, refuses to create B's rows and changes or deletes
  0 of B's rows; anon reads nothing and cannot call `delete_my_account()`;
  B's token reads exactly B's row; neither local namespace holds the other's.
* **shared**: B's reset link in a second tab while A is signed in on the
  same browser → "All set", B's new password works, A's session there is
  ended on the server, the first tab leaves A's namespace.
* **delete**: a sync started just before the tap; typed confirmation → auth
  user, sessions and every row gone, sign-in fails, this device's copy and
  `sb-` keys gone (and still gone seconds later), the other account (here
  and on the server) and the guest untouched; a second tab of the same
  account, open in the Memory Garden all along (a paid plan on the phone),
  is sealed at once (its favourite, setting and journey entry never land)
  and leaves nothing of the account after its reload.
* **unconfirmed**: "Please confirm your email first" → send the link again.
* no page or console errors from the site (the stack's expected 4xx
  refusals aside).

**Dry run here** (no Docker; the fake, which renders the same templates and
answers a Mailpit-style API, with Supabase's one-link-per-kind, 24-hour
reauthentication, sign-out-other-sessions-on-password-change and 10 s
refresh-reuse rules):
```
HM_AUTH_MODE=ci SUPABASE_URL=http://127.0.0.1:8203 SUPABASE_PUBLISHABLE_KEY=sb_publishable_hushmallow_local_dev_only \
  bash hushmallow/tools/build-site.sh /tmp/claude-0/hf/auth/site e2edry1
node hushmallow/tools/auth/fake-supabase.mjs --port 8203 --site http://127.0.0.1:8202 &
node hushmallow/tools/auth/pages-serve.mjs /tmp/claude-0/hf/auth/site 8202 &
E2E_SITE=http://127.0.0.1:8202 E2E_API_URL=http://127.0.0.1:8203 E2E_PUBLIC_KEY=sb_publishable_hushmallow_local_dev_only \
E2E_MAIL_URL=http://127.0.0.1:8203/__fake/mailpit E2E_FAKE_URL=http://127.0.0.1:8203 \
E2E_CHROMIUM=/opt/pw-browsers/chromium E2E_CHROMIUM_ARGS='--use-gl=swiftshader --enable-unsafe-swiftshader' \
  timeout 400 node hushmallow/tests/e2e/auth.e2e.mjs --out /tmp/claude-0/hf/e2e/out
```
A pass there proves the spec and the app against the fake only; the CI run
on the real stack is the evidence.

## Tests and evidence

Everything here ran in this sandbox against the **local fake** of Supabase
(`tools/auth/fake-supabase.mjs`) and a throwaway PostgreSQL 16, never
production and never Supabase itself.
* Round 3: `node --test hushmallow/tests/*.test.mjs`: **548 of 548**. New:
  `auth-wipe` (9: two pages of one account on one Storage, the real
  supabase-js against the fake, simulated storage events; tab 2 deletes /
  signs out removing / removes this phone's data while tab 1 writes late
  and a write slips in, then a fresh boot: no `hm2:u:<uid>:` key left;
  device-data keeps its marker and writes again after the reload; a plain
  sign-out writes no tombstone; the pre-load handle; a boot mid-removal; a
  sign-in again settles it; and the old behaviour for contrast (without
  the tombstone the late writes survive)); in `auth-screens` the home
  Mallow chain and the account named on arrival; `auth-guest-keys` with a
  real plan tier and journey, played, the Hushflow rotation and the invite
  code pinned. 8 of the 9 `auth-wipe` tests fail with `writeWipe` disabled.
  `auth-session-race` (5: A's check refused while B's session lands in
  storage, B untouched here and on the server; A's own refused session
  still leaves; A's sign-out and A's deletion with B's session stored; A's
  late save over B's session, which the link's page puts back before the
  new password and before the arrival).
* `node --test hushmallow/tests/*.test.mjs`: **532 of 532** (round 2). New
  this round: `auth-quiesce` (9: delete, sign-out with and without removing,
  "Remove this device's data" while a sync is mid-pull, a refused deletion,
  an account deleted elsewhere; each race fails with the seal and pause
  taken out), `auth-guest-keys` (3: today's guest keys, sign-in off / on /
  through a sign-in cycle), and in `auth-client` the password change both
  ways (a fresh session, a 25-hour-old one), the isolated client, recovery
  for the link's account only and a reset link on a shared browser; plus
  checks in `auth-errors`, `auth-screens`, `auth-namespace`, `auth-sql`.
* `tests/e2e/auth.e2e.mjs` dry-run against the fake on the built site:
  **97 of 97**, twice in a row (round 2; sections guest, callback, signup, guestkeys,
  signin, sync, refresh, password, signout, reset, expiry, people, shared,
  delete, unconfirmed). **On the real local Supabase stack in GitHub
  Actions** (`hushmallow-auth-e2e.yml`, all on `claude/upbeat-pasteur-b0aqg1`):
  run 38377721517 **76 of 76**, run 38390483903 **97 of 97**, run
  38416054844 **101 of 101** (after `de58144`).
* `bash hushmallow/tools/auth/sql-check.sh` on PostgreSQL 16: migrations
  `0001`–`0009` twice, `rls_check.sql` **35 of 35**, rollback, re-apply;
  the new cap check fails without `0009`.
* Browser, on the **built** site (an `HM_AUTH_MODE=dev` build in
  `/tmp/claude-0/hf/auth/site`, served by `tools/auth/pages-serve.mjs` on
  8202 the way Pages serves it; the fake on 8203; the dev tree on 8201):
  * Round 3 (`/tmp/claude-0/hf/auth/r2fix/`): `fixes-e2e.cjs` **74 of 74**
    (new `xtab`: tab 1 in the Memory Garden while tab 2 deletes the account
    at 390×844, signs out removing at 320×568, removes this phone's data at
    390×844: tab 1 sealed, its late favourite / setting / journey entry
    never land, nothing of the account after its reload, the guest's things
    untouched, one calm line at once; new `r2screens` at 390×844 and
    320×568: the picker, the mismatch under Current, the code lede's
    address on one line, the account named on arrival and in the question);
    `callback-e2e.cjs` **42 of 42**; `screens-e2e.cjs` flows **49 of 49**,
    people **14 of 14**, gallery **62 of 62**; the E2E spec dry run on a
    CI-mode build (`HM_AUTH_MODE=ci`, the fake's 20 s access tokens): **101 of 101, four runs in a row** after the two session fixes ("Shared browsers", above); before them the `shared` section failed in 3 of 6 untraced runs (traced and root-caused). The new delete-section check (a second tab in the Memory Garden) passes in every run.
  * `tools/auth/callback-e2e.cjs`: 41 of 41.
  * `tools/auth/screens-e2e.cjs --part flows`: 49 of 49 by touch (CDP),
    including Change password: a wrong current password ("That password
    doesn't match.", no code, nothing changed), the right one (saved, the
    check's session gone, the page's alive), and a 25-hour-old session (the
    code step, a wrong code refused, the right one).
  * `--part people`: 14 of 14. `--part gallery`: 62 of 62 (every screen at
    390×844, 375×812, 320×568, 320×568 at text size 1.25 and 1280×800;
    reduced motion).
  * `tools/auth/fixes-e2e.cjs` (new): 39 of 39: today's guest keys in the
    real app; Delete account and Remove this phone's data tapped while the
    arrival reaction plays, concerned from the first frame (rig mouth ≤ 0,
    no reaction) at 390×844 and 320×568, full and reduced motion, the notice
    faded; B's reset link while A is signed in; delete while a sync is
    mid-pull.
* Final QA sweep (the integrated pilot, `HM_AUTH_MODE=dev` build served by
  `pages-serve.mjs`, the fake behind it): `screens-e2e.cjs` flows **49 of
  49**, people **14 of 14**, gallery **62 of 62**; `callback-e2e.cjs` **42
  of 42**; `fixes-e2e.cjs` **74 of 74** (the arrival checks now read the
  card's lede, and an address's lines are counted from its text).
* Not verified: hosted Supabase (production: the owner's checklist below),
  real email delivery, a physical iPhone keyboard (a stand-in
  `visualViewport` was used), VoiceOver. Real Supabase Auth and PostgREST
  are covered by the CI runs above (a local stack, not the hosted project).

## Manual checklist (owner, production, your own email)

The account screens open from Settings → Privacy (the top row) or at
`https://app.hushmallow.com/#account`.
1. SQL editor: run `0001` … `0009` (already ran `0001`–`0008`? run just `0009`), then `tests/rls_check.sql` → `ALL 35 CHECKS PASSED`.
2. Dashboard settings above (URL configuration, email provider, templates, sessions, **custom SMTP**).
3. Cloudflare Pages: the two variables for Production and Preview; deploy.
4. `curl -sI https://app.hushmallow.com/auth/callback/` → `cache-control: no-store`, `x-frame-options: DENY`, `referrer-policy: no-referrer`; `curl -sI https://app.hushmallow.com/auth/callback` → a redirect to `/auth/callback/` (Pages serves the folder), with the query kept.
5. In a private window, as a guest: everything works as before; the network panel shows no request to `supabase.co` until you open `/#account` and a sign-in screen.
6. Star a world as a guest. `/#account` → Create an account with your address (and a name). "Check your email" shows your address; "Send it again" counts down.
7. The email comes from your SMTP sender; its button points to `https://app.hushmallow.com/auth/callback?token_hash=…&type=email`. Open it **on a different device**: "You're in", then the account screen there. Open the same link again: "expired or already used".
8. On the first phone: "I've confirmed it: sign in". A wrong password first → "That email and password don't match…" (the same as for an unknown email) and a worried Mallow. Then the right one → "Keep this phone's things?" → Keep → signed in with your star.
9. Reload: still signed in. Account card: your name, email, home Mallow; pick another Mallow (it hops; the Hushfold uses it).
10. Turn on both switches: each shows "On since …". Table Editor: rows for your user only in `preferences` and `favourite_worlds` (no words or feelings anywhere), `sync_consents` with both times. Star another world: it appears within seconds. Turn both off: the rows are gone; `sync_consents` shows the withdrawal times; the phone keeps its stars.
11. Change password: the screen asks for your **current** password and a new one. A wrong current password first → "That password doesn't match." (nothing changes, no email). Then the right one → "Your new password is saved", no code asked on a session signed in today. Sign in elsewhere with it (your other devices are signed out by Supabase). **On a session more than 24 hours old** (stay signed in on a phone until the next day): after the current password the screen says "Enter the code" and a 6-digit code arrives ("Your hushmallow code"); a wrong code → "That code didn't work…", the right one saves it.
12. Sign out → Sign out: a guest again with the guest's things. Forgot your password → the email → the link (any device) → choose a new password → signed in there; sign in here with it (no second "keep" question).
13. Shared device: sign in as A, star a world, sign out; create B (a second address) → Not now: none of A's or the guest's things; "Bring them in" brings the guest's in. Sign out: the guest's things are back. Sign in as A: A's things only. Then, signed in as A, open B's password-reset email on the same phone: B's new password is saved ("All set"), the app opens as B, and A is signed out there (A's things wait for A).
14. Session end: delete your test user in Authentication → Users while the app is open on your phone; bring the app to the front: one calm line, then guest.
15. Delete account (type `delete`): Authentication → Users no longer lists it; no rows remain for it; "Your account is deleted…"; the app is a guest again with the guest's things.
16. Offline (aeroplane mode) on the account card: a calm pill; a switch says it can't reach hushmallow and stays as it was.
17. On a preview (`*.hushmallow.pages.dev`): sign up; the email's button opens **production's** `https://app.hushmallow.com/auth/callback` (by design, coordinator decision 1: one-time tokens only ever reach the production app, never a preview) and confirms there; then sign in on the preview with the confirmed account. The same for a reset link asked for on a preview: the new password is set on production.
18. Authentication → URL Configuration: the Site URL is exactly `https://app.hushmallow.com` (no trailing slash), so the links in step 7 read `…com/auth/callback?…`, not `…com//auth/callback?…`.
19. As a guest who has used the app before (favourites, a Memory Garden tool, settings, Another Angle): open the version with sign-in on; everything is exactly where it was. Sign in, answer "Not now", sign out: still exactly where it was.
20. Two tabs: signed in, open the app in a second tab and leave it in the Memory Garden. In the first tab, Delete account. The second tab says "Your account is deleted…" at once; star a world there (nothing is kept); go back to the Hushfold: it reloads as a guest. In the browser's storage (DevTools → Application → Local Storage) no `hm2:u:<your id>:` key is left. The same with "Sign out and remove my things from this phone".
21. Arrivals name the account: after signing in, the account card's lede reads "You're signed in as you@yourdomain." (no toast over the card); the page a confirmation link opens reads "…You're signed in as yo…@yourdomain."; the "Keep this phone's things?" question shows your full address.
22. Settings → Privacy as a guest: the top row reads "Sign in or create an account · Optional. Everything works without one." → Sign in → the welcome screen; Back comes back to Settings. Signed in, the row reads "Your account · Signed in as <your address>" (whole, or broken after "@" on a small phone) → Manage → the account card; Back → Settings. On a small phone or at the largest text size (320×568 at 1.25), the button sits under the label, full width: "Your account" stays on one line and the address breaks only after "@" or at a dot. On the account card, the full stop after your address never sits alone on a line.
23. Signed in, Settings → "Delete this account's things on this phone": the sheet says this account's things go from this phone and other people's are not touched → Delete: this account's copy here is emptied and you stay signed in (with a sync switch on, what is kept with the account comes back at the next sync). Sign out: the button now reads "Delete the guest's things on this phone" and its sheet says accounts on this phone keep their own things; Delete leaves the account's things for its next sign-in. Back (or a swipe) on either sheet closes the sheet and stays on Settings.

## Known limits

* The GitHub Pages copy (`hushmallow-pages.yml`) builds without the two values: sign-in is off there, and its `/auth/callback/` (absolute `/v/<ver>/` paths for a site at the domain root) is not meant to be used under a project path.
* Signing out while offline removes the session from this device but cannot revoke it on the server; it expires on its own (refresh-token rotation ends it at the next refresh attempt).
* The Framer embed is a cross-site iframe: browsers partition its storage, so an account there is a separate session (see below).
* Deep paths other than `/`, `/#…` and `/auth/callback` (e.g. `/a/b`) still get Pages' single-page fallback, whose relative asset paths do not resolve two folders down (unchanged from before; nothing links there).
* Changing the account's email is not in the app yet (the template and `/auth/callback?type=email_change` are ready).
* Settings' "Delete this account's things on this phone" (signed in) empties this account's copy here; with a sync switch on, what is kept with the account comes back at the next sync (the account still has it). Turning the switch off first deletes it there too.
* The browser proofs drive a stand-in keyboard (`visualViewport`); a physical iPhone has not been tried.
* The current-password check is one more sign-in for the account: it counts towards Supabase's sign-in rate limit (per IP) and stamps `last_sign_in_at`. If its immediate sign-out cannot reach the server (the network drops at that moment), that short session stays on the server until Supabase ends it (the password change itself ends every other session); nobody holds its tokens (memory only).
* Settings' delete as a guest leaves every account's namespace on the phone (by design: those are other people's things). Once an account has been used on the phone it reads "Delete the guest's things on this phone" and its sheet says so; on a phone no account has used it is still "Delete everything on this phone".
* Deep links: only `/#account` is honoured, and only on builds with sign-in on. Any other hash (`#garden`, `#settings`, `#plans`, `#angle`) opens the Hushfold (boot replaces it with `#home`), so Back from that first page leaves the site. Deliberate for the pilot; a garden deep link (from a notification or the Framer page) would be handled in boot like `AUTH.deepLink`, pushing home first so Back returns to the Hushfold.
* **An account deleted on another device can leave its copy on this one.** This phone removes it only when it asks the server while its access token is still valid (the answer is then `user_not_found`). Once the access token has expired (an hour by default), supabase-js's refresh fails with `refresh_token_not_found`, exactly as for a session ended elsewhere: the phone drops to guest calmly and keeps the copy, as it does for any signed-out account, until that account signs in here again (it cannot: it no longer exists) or someone removes it (Settings' "Delete everything on this phone" while signed in to it is no longer possible, so in practice it stays until the browser's data is cleared). Nothing of it reaches the server or another account; it is this device's own copy (settings, favourites, Memory Garden ids, journey with feeling families). The tombstone covers every tab of the device that did the deleting, not other devices.
* With sign-in off, guests still load the small sign-in boot modules (`boot.js`, `config.js`, `namespace.js` and `sync.js`'s merge helpers, about 35 KB, no network); supabase-js itself never loads for them.
* Email links always open the production app (`{{ .SiteURL }}/auth/callback`), also when the email was asked for on a preview (see the templates above).

## Wiring (done in the integration)

* **Settings row** (wired): `src/app/scenes/settings.js` fills an empty `h('div')` at the top of the Privacy section with
  `if (app.auth?.enabled) import('./account.js').then((m) => m.mountAccountRow(app, rowEl))` (guarded, so a build with sign-in off loads nothing extra on a Settings visit): "Sign in or create an account · Optional…" / "Your account · Signed in as …" with one button; nothing when sign-in is off.
* **Side panel link**: deliberately **not** wired. The Hushfold's side panel stays with feelings and worlds (Another Angle, Memory Garden, More rituals, Your journey, Settings); sign-in is optional and lives one step away, in Settings → Privacy. Should it be wanted later: `import('../app/scenes/account.js').then((m) => m.openAccount(app))`, shown only when `app.auth.enabled`; `openAccount(app, { view: 'signin' })` or `{ view: 'create' }` opens a guest's screen directly.
* **Settings' delete** (done): signed in it reads "Delete this account's things on this phone" (sheet: this account's things, other people's untouched); a guest on a phone an account has used reads "Delete the guest's things on this phone" (sheet: accounts keep their own things); otherwise "Delete everything on this phone".
* **Settings → About** (done): with sign-in on it says the words, feelings and photos stay on the phone and names what an account keeps (the email, the name and home Mallow if chosen; with sync, settings, favourite worlds, Memory Garden and where a Hushflow paused), from `src/app/privacy.js`.
* The opt-in sync needs no wiring: `main.js` starts it (`app.auth.start`) and it hears `app.prefs` and `app.store` writes.
* The Framer embed runs the app in a cross-site iframe: browsers partition its storage, so a session there is separate from `app.hushmallow.com`; sign-in is best offered in the top-level app.
