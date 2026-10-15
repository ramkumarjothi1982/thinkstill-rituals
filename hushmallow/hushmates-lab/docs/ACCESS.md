# Hushmates · Three experiences, strictly apart

| | Customer app | Safety desk | Lab |
|---|---|---|---|
| What it is | Sign-in, invitation, welcome, Release, Catch, My journeys, Returned, You & safety, Your data | Reports, decisions, team notes, the activity log | Control room, scenarios A/B/C, Phone A/B, test identities, dev clock |
| Where | `/app/` (`app/`) | `/staff/` (`staff/`) | `/lab/` on a **development** host, for authorised testers only (`index.html`, `lab/`) |
| Production build | `dist/app` (`tools/build-app.mjs`) | `dist/staff` | Not built, not served, not present |
| Who it talks to | Supabase Auth (email codes) and the Hushmates Edge Function, as the signed-in member | The same, as a moderator; the server checks the role on every call | An in-page simulated service with seven test identities, entirely inside the tester's browser |

## How the separation is enforced

**In the database** (`supabase/migrations`):

- Every table is in schema `hushmates`, with row level security on and no grants
  to anyone. Browsers (the `anon` and `authenticated` roles) can't read, write or
  call anything, and the service role can't touch a table directly either.
- The only door is `hushmates_api.rpc(issuer, subject, method, args)`, executable
  by the service role alone, which the Edge Function uses. It finds the member
  from the verified sign-in identity, and every method checks ownership and role
  inside its own transaction. Asking for someone else's feeling, hold,
  perspective or report answers "not found". The desk's methods answer
  "forbidden" to anyone who isn't a moderator.
- Words are stored encrypted (AES-256-GCM, by the Edge Function), so a database
  export or a dashboard browse shows no one's feelings.

**In the Edge Function** (`supabase/functions/_shared/gateway.js`):

- Who is calling comes only from a verified Supabase access token: signature,
  issuer, audience, expiry and role, and **how they signed in**. Only an email
  code (`amr`: otp or magiclink) opens Hushmates, so a password sign-up for
  someone else's email gets nothing.
- Only allow-listed methods (`CLIENT_METHODS`, `MODERATOR_METHODS`). Test,
  account and internal methods (`createTestAccount`, `seedRelay`, `mallowContext`,
  the two-step internals, anything else) answer "not found". There is no clock
  route; the scheduler's route needs its own secret.
- Other sites: CORS answers only the app's own origins, a request from another
  origin is refused, bodies must be JSON and small, and tokens travel as a Bearer
  header (never a cookie), so another site's page can't act as anyone.
- Errors carry the service's own words (written for people) or one gentle line.
  Details stay in the function's log.

**Members** sign in with an email code, then (the first time) an invitation code,
a name only they see, and confirmation that they're 18 or over:

- Invitation codes are stored only as keyed hashes. They are single use (or as set),
  expire, and can be revoked. Wrong guesses are limited per person and per network.
- The session (Supabase's access and refresh tokens) is kept in the browser's
  storage, as supabase-js does. The app's strict Content Security Policy
  (`script-src 'self'`) is what keeps other scripts from reading it.
- A new device needs only a new code, and has everything (the account is on the
  server). Deleting your data deletes the account's words and its sign-in.

**Testers.** The lab answers only on a development host and only to a tester key
set by whoever runs it (`HUSHMATES_TESTER_KEY`, 16 characters or more). The
tester opens `/lab/?key=…` once; the host swaps the key for an HttpOnly,
SameSite=Strict cookie and redirects. With no key, a short key or a wrong key,
there is no lab. The tester cookie is not an account: the API still needs a real
sign-in.

**On the web host** (`server/server.mjs`): production serves only the built files
(each checked against the build's hash), by lookup, never by joining a path onto
the disk. Every other path, the lab, `/auth/`, `/functions/` and the old `/api/`
included, is the same "This page isn't here." page. A production host refuses to
start with a lab, a sign-in emulator or an API.

**In the reference engine** (`core/relay.js`, which the lab runs in the page and the
tests compare the database against): `testMode` must be set for test identities
and canned examples to exist. Only the lab and the tests set it. The real backend
has no test identities at all.

**In the build** (`tools/build-app.mjs`):

- `dist/app` and `dist/staff` hold exactly the files each page loads (a test pins
  the app's list, so a stray import of server or lab code fails).
- No comments ship; every stripped module is checked to still parse.
- Every built file is scanned, and the build refused, for lab and control-room
  words, test identities, testing labels, debug calls, local addresses, anything
  that looks like a credential, and any signed key that isn't the public anon key.
- For a Supabase project, `--supabase-url` and `--anon-key` write `config.json`
  and allow the page (and the production host's header policy) to connect to
  that project, and nowhere else.

**In the interface:** lab-only notes live in `lab/lab-notes.js`, which the
customer app never loads. Only words written for people reach the screen
(`ui/dom.js` `humane`).

## Your data

`exportMyData` (format `hushmates-personal-data`, version 2) is built field by
field from an allow-list. It is never a copy of stored records.

- **It holds** your name here and your Mallow, your choices, and each feeling's
  words, status and dates. It also holds when you agreed to share it
  without your name and to a Mallow perspective, the perspectives that came back to
  you, your Mallow's perspective with its label, the journey in plain words, the
  perspectives you offered with your share-picture choice, and your own reports
  (your reason, your words, and whether they were reviewed). It ends with counts
  of feelings that found you and people you blocked.
- **It never holds** other people's names, Mallows, ids or order (they are
  "A Hushmate"), or words you were never shown: sealed while travelling, let go,
  reported, blocked, taken back, removed, or deleted. It never holds the text of
  a feeling you caught or reported, the safety team's notes, who you blocked,
  internal ids, roles, test flags or session tokens.
- Only the signed-in person's own file can be made. Arguments that name anyone
  else are ignored.

Other people's perspectives carry no time in the file, and their steps on a
feeling's journey are dated by day only: the file says exactly when *you* did
things, never exactly when anyone else did.

If a catcher has blocked the author (after catching the feeling), their
perspective is set aside. They see the usual thanks and keep their words, but
the feeling never learns of it: no place taken, no petal, no journey step,
nothing in the author's file. A perspective the author hid themselves (by
blocking, reporting or letting it go) leaves no count or petal either.

Deleting everything removes the account's words (feelings, perspectives given, the Mallow's perspectives, the person's own report notes), the safety evidence about them, and their sign-in (`m_delete_my_data`; tested in `tests/backend-ops.test.mjs` and `tests/access-control.test.mjs`).

Tests: `tests/your-data.test.mjs` (12). They cover the allow-list, both
directions of privacy, sealing, removals, reports, blocks (including the
set-aside case), who may export, the Mallow perspective, and plain words and
dates.

## What the tests prove

`tests/access-control.test.mjs` (16) runs the production host and the whole local
stack (real Postgres, the local copy of Supabase Auth, the Edge Function's code)
over HTTP:

- production: the app and the desk served with protective headers; no lab, no
  sign-in emulation, no API, however asked; server code, keys and tools can't be
  fetched, however the path is written; a deploy build connects only to its
  Supabase project, and a secret key is refused; a build changed afterwards is
  refused;
- no token, a forged token (unsigned, signed with the public key, a real token
  with its claims changed), an expired token: "please sign in again";
- signed in but not invited: only "who am I" and "redeem an invitation"; real
  codes only, adults only, single use;
- invitation guessing slowed per person and per network, and a header can't
  pretend to be another network;
- a member can't reach the lab, any testing method, the scheduler or the desk's
  methods; a safety-team invitation opens the desk;
- other sites can't call the API;
- consent, safety screening, encryption at rest and privacy hold for direct calls;
- the same person on a new device has everything; deleting ends the sign-in.

Also: `backend-db-access` (role by role, no table or function reachable),
`backend-auth` (36: the sign-in tokens, the encryption, the local Auth copy),
`backend-review-fixes` (regressions from the independent reviews, including
password sign-ins refused), `client-auth` and `client-review-fixes` (the app's
sign-in and link), `build` (8), `your-data` (12), `audit-fixes` (6).

`tools/app-shots.mjs` drives the production build in Chromium on the whole local
stack with many accounts at once, and fails on developer content, raw data or
testing words on any screen, internal ids on any customer screen (the desk shows a
labelled account reference by design), a refused session the test didn't cause,
or any unexpected console error.

## Running them

```bash
cd hushmallow/hushmates-lab
node --test tests/*.test.mjs                          # needs the local Postgres (docs/BACKEND.md)
node server/dev-stack.mjs                             # everything locally; the lab only with HUSHMATES_TESTER_KEY
node tools/build-app.mjs && node server/main.mjs --mode production --port 8080   # the production files
```

## Limits (need the owner before production)

- The real Supabase project, Auth and Edge runtime are exercised only on staging
  (`docs/STAGING.md`); locally they are the local Auth copy and the Edge
  Function's code under Node.
- The network used for invitation limits comes from the last `x-forwarded-for`
  entry (or `HUSHMATES_CLIENT_IP_HEADER`); confirm on staging which header the
  platform sets.
- `data-test` attributes stay in the markup for automated checks; they are
  invisible and say nothing a person's own answers don't.
