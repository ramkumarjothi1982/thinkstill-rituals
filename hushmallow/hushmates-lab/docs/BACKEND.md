# Hushmates · The Supabase backend (Phase 2)

Status: built and tested locally against a real Postgres 16, a local copy of
Supabase Auth's email-code endpoints, and the gateway run under Node. Nothing
is deployed. Staging needs the owner's Supabase account (see
`STAGING.md`).

## Shape

```
browser (customer app, staff desk)
  │  1. sign in: Supabase Auth, passwordless email code   →  /auth/v1/otp, /auth/v1/verify, /auth/v1/token
  │  2. everything else: the Hushmates Edge Function       →  /functions/v1/hushmates/rpc/<method>
  ▼                (Authorization: Bearer <the person's access token>)
Edge Function `hushmates` (supabase/functions/hushmates)
  · verifies the token (signature, issuer, audience, expiry) against the issuer's keys
  · allow-lists methods, checks origin, limits body size
  · screens words (the shared safety lexicon), encrypts them (AES-256-GCM)
  · calls one database entry point as the service role, decrypts what comes back
  · the Mallow: Reframe library by default; Another Angle only behind a server-side switch
  ▼
Postgres (schema hushmates: tables; schema hushmates_api: the only callable functions)
  · every rule and every count lives here, in transactions with row locks
  · constraints make the critical rules impossible to break, even under races
  · RLS on every table and no grants: browsers can't read or write anything directly
  · scheduled jobs (pg_cron): homecoming, hold expiry, the Mallow fallback, retention
```

## Decisions

- **Rules in the database.** Each method is one `security definer` function
  running in one transaction, with `select … for update` on the rows it
  changes. Constraints back every critical rule:
  - `unique (journey_id, author)`: one perspective per person per feeling;
  - a partial `unique (journey_id, slot)` and `check (slot between 1 and 5)`:
    never a sixth;
  - a partial `unique (member_id)` on live holds: one feeling held at a time;
  - `unique (owner, client_id)` and `unique (author, client_id)`: no duplicate
    writes;
  - `consent_at not null`: nothing circulates without consent;
  - the Mallow perspective's primary key is the journey: one generation per
    feeling.
- **The same behaviour as the tested reference.** `core/relay.js` (the lab's
  engine, 169 tests) is the reference. A differential test drives random
  multi-account sequences through both and compares every answer.
- **Identity, not just a user id.** A member is linked to sign-in identities
  `(issuer, subject)`. Today the only issuer is the isolated Hushmates Auth
  project. Later, the main Hushmallow login can be added as a second issuer
  and linked to the same member, so one Hushmallow account reaches Hushmates
  with no second account. Production Hushmallow auth is not touched.
- **Invitations.** A code is stored only as a hash, with configurable rules: a
  use limit, an expiry date and revocation. The first sign-in needs a valid code,
  a name and 18+ confirmation. Wrong attempts are limited per identity and per
  network address.
- **Feelings are encrypted at rest by the gateway.** The texts of feelings,
  perspectives, Mallow perspectives, report details, evidence and moderator
  notes are stored as `hmenc:v1:<key id>:<iv>:<ciphertext>`. The key exists
  only in the Edge Function's secrets. A keyed hash (`*_mac`) supports
  duplicate checks without the text. Supabase also encrypts the disk; this
  second layer keeps a database export or a dashboard browse from showing
  anyone's feelings.
- **Time.** `hushmates.clock()` is the transaction time. Tests (and only tests,
  as a database superuser) can set `hushmates.fake_now`.
- **Limits are settings, not code.** Hold times, rates, budgets and AI caps
  live in `hushmates.settings`, with defaults matching `core/relay-rules.js`.
- **The Mallow fallback is server-side.** Thirty minutes after release, with
  nobody having caught the feeling and the person's consent, the scheduled job
  prepares the author's Mallow's perspective, whether or not the app is open.
  The app reveals it with the same moment as before. Any request can also ask
  for it, sharing the same single generation.
- **AI is off.** `settings.ai.enabled = false`. When the owner turns it on,
  each request still needs room in the monthly AUD cap and the per-person
  daily limit. Any refusal, timeout or error falls back to the Reframe library
  (free). Every AI call is recorded in `ai_usage` with its estimated cost.
- **Changes reach the app by polling** (every 20 s while the app is visible,
  and after every action). Supabase Realtime can come later; nothing depends
  on it.

## The gateway's HTTP API

`/functions/v1/hushmates/…` (on the dev stack, the same path on localhost):

| Route | Who | What |
|---|---|---|
| `POST /rpc/<method>` | a signed-in person (Bearer token) | Body `{ args }`. Answers `{ ok: true, result }`, or `{ ok: false, code, message }` with the HTTP status of the error |
| `GET /health` | anyone | `{ ok: true }` |
| `POST /jobs/tick` | the scheduler (`x-hushmates-job: <JOB_SECRET>`) | homecoming, expiry, Mallow fallback, retention |

Methods: everything in `CLIENT_METHODS` (`core/relay.js`), with the same
arguments and answers, plus:
- `redeemInvite { code, name, adult }`;
- `markMallowSeen { journeyId }`;
- `MODERATOR_METHODS`, checked against the member's role in the database.

`me` answers `{ needsInvite: true }` for a signed-in person who isn't a member
yet; every other method answers `invite-required`.

## Local development

```
npm install                         # dev-only: the Postgres driver for tests and the dev stack
node server/dev-stack.mjs           # Postgres (local), Auth (local copy), the gateway, the app, the desk, the lab (tester key)
node --test tests/*.test.mjs
```
