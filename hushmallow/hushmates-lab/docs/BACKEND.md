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
- **AI is off.** `settings.ai.enabled = false`, and Another Angle is
  configured nowhere. When the owner turns it on, each call needs:
  - the switch on;
  - a configured provider;
  - room in the monthly AUD cap, the person's daily limit and the overall daily limit.

  These are checked and the estimated cost held in one locked step in the
  database (`hushmates_api.ai_reserve`), so instances can't overspend
  together. Any refusal, timeout, error or unsafe answer falls back to the
  Reframe library (free). Every attempt is recorded in `ai_usage`.
  `supabase/functions/_shared/mallow.js` decides; `mallow-setup.js` wires it
  to the database.
- **The Mallow library fits the feeling.** `core/perspectives.js` picks
  among the Reframe engine's angles and Hushmates' own lines. It goes by the
  words, the label and the person's Mallow (its voice). It is deterministic,
  avoids the angles that person saw recently, and never uses forced
  positivity, diagnosis or claims about other people's minds.
- **Changes reach the app by polling** (every 20 s while the app is visible,
  and after every action). Supabase Realtime can come later; nothing depends
  on it.

## One Hushmallow login, later

Today the only sign-in is Hushmates' own, isolated Supabase Auth project. Nothing
is connected to the production Hushmallow login.

The pieces that let one Hushmallow account reach Hushmates later, with no second
account:
- A member is linked to sign-in *identities*, `(issuer, subject)`
  (`hushmates.identities`), never to one provider's user id.
- The gateway's verifier takes a list of issuers (`createVerifier({ issuers })`),
  each with its own keys (`supabase/functions/_shared/jwt.js`).

To add the main login (each step needs the owner's approval):
1. Add its issuer (its JWKS address, and `provider: 'hushmallow'`) to the
   verifier in `supabase/functions/hushmates/index.ts`. If it isn't a Supabase
   login, give the issuer its own role and audience rules. Today every issuer
   must send `role: authenticated`.
2. Add a "link" method. A person signed in with both proves it once, and a
   second identity row points at the same member.
3. A new person signing in with the main login gets a member on first use, under
   whatever invitation or eligibility rule applies then.
4. `ownIssuers` stays limited to Hushmates' own project. Deleting Hushmates data
   never deletes the main Hushmallow account.

## The gateway's HTTP API

`/functions/v1/hushmates/…` (on the dev stack, the same path on localhost):

| Route | Who | What |
|---|---|---|
| `POST /rpc/<method>` | a signed-in person (Bearer token) | Body `{ args }`. Answers `{ ok: true, result }`, or `{ ok: false, code, message }` with the HTTP status of the error |
| `GET /health` | anyone | `{ ok: true }` |
| `POST /jobs/tick` | the scheduler (`x-hushmates-job: <JOB_SECRET>`) | homecoming, expiry, the Mallow fallback, and retrying sign-in deletions |
| `POST /jobs/retention` | the scheduler secret | retention. On Supabase, pg_cron also runs it directly in SQL every day (`hushmates-retention`) |

Methods: everything in `CLIENT_METHODS` (`core/relay.js`), with the same
arguments and answers, plus:
- `redeemInvite { code, name, adult }`;
- `markMallowSeen { journeyId }`;
- `MODERATOR_METHODS`, checked against the member's role in the database.

`me` answers `{ needsInvite: true }` for a signed-in person who isn't a member
yet; every other method answers `invite-required`.

## Deploying (staging only, with approval)

- `supabase/functions/hushmates/index.ts`: the Edge Function entry. It reads the secrets and wires up the gateway. It takes the project's new secret key (`SUPABASE_SECRET_KEYS`) or the legacy `service_role` key. A new-style key goes in the `apikey` header only, as Supabase requires (`keyHeaders` in `postgrest-db.js`). It passes `deno check` (`npm run check:edge`).
- `supabase/config.toml`: the function checks tokens itself (`verify_jwt = false`), and `hushmates_api` is exposed to PostgREST for the service role only.
- `tools/sync-edge.mjs`: copies the shared code (`core/…`, and the main app's `src/ultra/…`) byte for byte into `supabase/functions/_shared/vendor/`, so a deploy carries it. A test fails if a copy differs.
- `tools/build-app.mjs --supabase-url … --anon-key …`: builds the app and the desk for a project. The CSP may connect to that project only, and a secret key is refused.
- `server/admin.mjs`: the operator's tool for invitations, settings, ops and lifting restrictions.
- `tools/pack-site.mjs`: one folder for the static host, with its `_headers`, `_redirects` and `404.html`.
- `tools/staging-secrets.mjs`, `tools/staging-preflight.mjs`, `tools/staging-check.mjs`, `tools/recovery-drill.mjs`: the staging kit (`npm run staging:…`).
- Step by step in `STAGING.md`. Costs are in `COSTS.md`, and what remains before launch in `READINESS.md`.

## The safety desk

`/staff/` (`staff/desk.js`) is a separate page for moderators. It signs in
with an email code like the app, and its session is held in that tab only.
The server answers its methods only for members whose role is `moderator`
(from a safety team invitation). It shows:
- the queue, urgent first;
- the evidence (people's words as text, never markup);
- earlier reports about the same person, never who they are;
- decisions with an explanation of each, and team notes;
- the activity log.

Every report opened and every decision is recorded on the server. It signs
out after 30 minutes idle.

## Local development

Needs Postgres 16 with a superuser at `postgres://postgres@127.0.0.1:54329`
(the tests and the dev stack create their own databases). To use another one:
- `HUSHMATES_TEST_PG` for the tests (server URL, no database);
- `HUSHMATES_PG` for the dev stack (server URL; it uses the `hushmates_dev` database);
- `HUSHMATES_ADMIN_PG` for `server/admin.mjs` (the full URL including the database; default `…/hushmates_dev`).

```
npm install                         # dev-only: the Postgres driver for tests and the dev stack
node server/dev-stack.mjs           # Postgres (local), Auth (local copy), the gateway, the app, the desk, the lab (tester key)
                                    # sign-in codes and invitations are printed; no email is sent
node --test tests/*.test.mjs
```

**The real Edge Function under Deno.** `HUSHMATES_EDGE=deno` (or `edge: 'deno'`)
makes the dev stack run `supabase/functions/hushmates/index.ts` under Deno, through
`server/edge-local.ts`:
- with only its secrets, as on Supabase;
- with network access to this machine only;
- reaching the database over HTTP through `server/postgrest-emulator.mjs`, a local stand-in for Supabase's PostgREST: `Content-Profile`, named arguments, the database role from the key, PostgREST's error statuses.

`HUSHMATES_DENO` names the Deno binary. With Deno installed, `tests/edge-deno.test.mjs`
and `tests/staging-check.test.mjs` use it, and `npm run e2e:deno` runs the full
browser E2E through it.
