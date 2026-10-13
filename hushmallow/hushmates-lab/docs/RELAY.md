# Hushmates 2.0 · The Feeling Relay: architecture

> **One feeling. Five perspectives. Back to you.**
> SUBMIT → RELEASE → TRAVEL → CATCH → REFRAME → PASS → RETURN → CHOOSE

This document describes how the relay works in the lab today, what is
simulated, and how it maps onto Supabase for a pilot. **Nothing here has been
applied to any production system.** Production integration waits for the
owner's approval.

## 1. What runs where today

| Layer | Lab (this folder) | Pilot (proposed, not built) |
|---|---|---|
| Rules | `core/relay.js` (`RelayService`), in the page | Postgres functions + one Edge Function (§5) |
| Network | `net/local-network.js`: latency, offline, lost replies, method allow-list, JSON-only payloads | HTTPS to the Edge Function; Supabase Realtime |
| Client | `client/relay-client.js` (`RelayClient`) | the same class with a Supabase transport |
| Interface | `ui/relay/*` scenes, `ui/orb.js`, `ui/sky.js`, `ui/mallow.js` | the same modules, mounted in the app |
| Identity | seven labelled test identities, simulated sign-in | Supabase Auth (invitation-only, adults) |
| Mallow perspective | labelled canned demo (default), Reframe library, or a local Another Angle server in mock mode | Another Angle, called server-to-server, Reframe library when it can't answer |
| Storage | this browser's `localStorage` | a **new** Supabase project for the pilot |

The interface only ever talks to `RelayClient`; `RelayClient` only talks to a
link with `request(method, token, args)` and `subscribe(token, fn)`. Swapping
the in-page service for Supabase changes the link, not the scenes.

## 2. The rules (all enforced by the service, all tested)

**Releasing**
- Free text, 3–500 characters, an optional label from eight (worry, sadness,
  anger, joy, loneliness, confusion, frustration, excitement).
- Screening before anything is stored (`core/feeling-safety.js`):
  - Crisis or care words get **support**. The text is never stored, never
    shown to anyone and never sent to an AI provider.
  - The same check runs on the device first, so those words never leave it.
  - Contact details, links, money requests and identifying details are refused
    with a clear reason.
  - Every rule reads an NFKC-normalised copy, so full-width letters can't slip
    past.
- No lifetime quota. Instead:
  - 3 feelings travelling at once;
  - 6 releases an hour and 24 a day (checked together, so a refused attempt
    never uses up an allowance);
  - every write is idempotent by `clientId`.

**Catching**
- Only people who opted in ("Let feelings find me") can catch. Catching is
  always voluntary; "Let it float past" has no penalty and nobody is told.
- A find **atomically reserves** a slot: an expiring hold. An offer lasts
  3 minutes; after catching, 10 minutes to write.
- A feeling can be held by at most (5 − perspectives already given) people at
  once, so two people can never take the same last slot.
- Each person can hold one feeling at a time and is never offered the same
  feeling twice (exposures). The author is never offered their own feeling.
- Fairness: the pick is random among the three longest-waiting eligible
  feelings, so older feelings never starve.

**Reframing**
- 8–280 characters. Perspectives are screened for:
  - safety, unkindness and diagnosis;
  - contact details and identifying details;
  - near-copies of earlier perspectives (Jaccard similarity ≥ 0.8 is refused).
- Certainty words ("definitely", "obviously") get a gentle nudge in the
  interface.
- **At most five distinct people per feeling**: never the author, one each,
  enforced in the write. The fifth perspective sends the feeling home.
- Earlier perspectives are shown to a contributor **only after** they've
  given their own (no copying), and never with who wrote them.
- Each perspective becomes a petal in the contributor's Mallow colour. The
  author sees petals (light) while it travels, but the words stay sealed until
  it comes home.

**Returning and choosing**
- A feeling comes home after five perspectives, or after 24 hours with
  whatever it has. The author can also bring it home early; a moderator can
  remove it.
- At home the author can:
  - keep or let go of each perspective;
  - save the journey;
  - release the feeling (its words are cleared; kept perspectives stay);
  - delete everything;
  - report a perspective or block its author;
  - share a picture (light and the label only, never anyone's words);
  - or "Explore another angle" if a Mallow is allowed and hasn't been asked.

**The Mallow fallback** (§4)
- Opt-in for each feeling.
- Offered only after 30 minutes with no person.
- Asked for by the author, at most once per feeling.
- Labelled with its real source, never counted as a person, and always yields
  to five humans.

**Durations** live in `core/relay-config.js` (`RELAY`) as pilot defaults to
be tuned, not product rules.

## 3. State

```
accounts   id, key (lab only), role (member | moderator), state (active | restricted | suspended | deleted), test
profiles   pseudonym, mallow, catching, notifyReturn, onboarded
journeys   id, owner, clientId, text, label, mallow, allowFallback,
           status (travelling | returned | released | deleted),
           createdAt, expiresAt, lastProgressAt, returnedAt,
           returnReason (complete | expired | withdrawn | removed),
           paused, fallbackOfferedAt, seenReturn, saved, choices{perspectiveId: true|false|null}, events[]
holds      id, journeyId, user, status (offered | caught | passed | used | expired | voided | reported), createdAt, expiresAt, caughtAt
exposures  journeyId:user → at                         (never offered twice)
reframes   id, journeyId, author, slot (1..5), text, clientId, at, mallow, hiddenForOwner, removed
fallbacks  journeyId → { status (pending | ready | failed), mallow, source (ai | library | demo), text, model, reason, support, hidden }
blocks     { by, who, at }
reports    id, by (account | 'system'), kind (feeling | perspective), journeyId, perspectiveId, reason, details,
           subject, status (open | no-action | actioned), urgent, evidence, notes[]
audit      { at, actor, action, … no feeling text }
rate       per account, per kind: recent timestamps
daily      per UTC day: Mallow perspectives (global and per person)
```

**Journey lifecycle:** `travelling → returned → (released | deleted)`, or
`travelling → deleted`. **Hold lifecycle:** `offered → caught → used`, with
`passed`, `expired`, `voided` or `reported` as the other endings.

**Views are built per viewer.** An author sees their journeys: words, petals
(no names), events, their Mallow offer, and the collection only once home. A
catcher sees only the offered feeling's words, label and count. Nobody sees
anyone's identity. Moderators reach content only through report evidence,
and every look is audited.

## 4. The Mallow fallback

Who may ask, and when:
- The author turned it on for this feeling ("If nobody catches my feeling,
  let a Mallow offer a perspective"), with the disclosure that this needs AI
  processing.
- At least 30 minutes have passed and nobody has caught it.
- It is not paused or removed by moderation, and the owner's account is
  active.

What happens:
1. The author asks. The interface explains first: one reply, sent to an AI
   service, always labelled, never counted as a person.
2. A `pending` record is written **before** the provider is called.
   Concurrent and repeated asks wait on the same in-flight call: **one
   generation per feeling, ever** (cached).
3. Budgets are checked and charged in the same step: 5 per person per day and
   500 for the whole service per day, on top of Another Angle's own caps.
4. The text is screened again; flagged or held text never reaches a provider.
5. The provider is called inside one deadline (`fallbackTimeoutMs`, 45 s).
   The relay passes a 300-token output ceiling; the library and demo providers
   honour it, while Another Angle applies its own server-side limits (§6). The
   perspective is shown under the Mallow the person asked, whatever character
   the provider picked.
6. What comes back is handled in one of these ways:
   - **A late answer:** if the person let the feeling go or deleted it while
     waiting, the answer is dropped.
   - **A safety verdict** (the provider sees danger the rules missed): the
     feeling is paused, holds are voided, an urgent report is filed for a
     person, and the author sees support.
   - **An answer that breaks the perspective rules:** it is discarded.
   - **Anything else that fails:** `failed`; the feeling still comes home.
7. Shown as "A Mallow perspective · AI-generated", "… · from the Reframe
   library, not AI" or "… · demo example, not live AI". It is drawn as a star
   on a dashed orbit, never a petal.
8. If five people later catch the feeling, the Mallow steps aside: humans fill
   every slot.

**Which Mallow speaks** depends on the label:

| Label | Mallow |
|---|---|
| worry | Loomi (calm) |
| sadness | Blubi (warm) |
| anger, frustration | Glitzi (constructively challenging) |
| joy | Boppo (encouraging) |
| loneliness | Noomi (gentle) |
| confusion | Zuzu (imaginative) |
| excitement | Pipzi (playful) |
| none | Loomi |

**Providers** (`core/perspectives.js`):
- `anotherAngleProvider`: Account 1's Another Angle server, reused rather
  than building a second AI system.
  - Its request carries only consent, text, emotion, intention and locale.
  - Provenance is checked for every answer, never cached: a reply is labelled
    AI-generated only when the server reports the real model with a key. Mock
    output is labelled demo, and unknown provenance is not shown.
- `libraryProvider`: the main app's rule-based Reframe engine, used offline.
- `demoProvider`: canned lines for interface demonstration.
- `chain()`: tries providers in order.

**In the lab no AI key is configured**, so no live AI output exists here. The
default is the canned demo, labelled. The Reframe library and a local Another
Angle server in mock mode are selectable in the control room.

## 5. Supabase mapping (proposal; nothing applied)

Use a **new Supabase project** for the pilot. Nothing touches the production
project, its tables, policies or auth.

**Tables** (schema `hushmates`):
- `profiles(user_id pk → auth.users, pseudonym, mallow, catching, notify_return, onboarded, state, role, created_at)`
- `journeys(id uuid pk, owner uuid, client_id text, text, label, mallow, allow_fallback, status, created_at, expires_at, last_progress_at, returned_at, return_reason, paused, fallback_offered_at, seen_return, saved, choices jsonb)` with `unique(owner, client_id)`
- `holds(id, journey_id, user_id, status, created_at, expires_at, caught_at, ended_at)`, plus a partial unique index `(user_id) where status in ('offered','caught')`: one live hold per person
- `exposures(journey_id, user_id, at)`, primary key `(journey_id, user_id)`
- `perspectives(id, journey_id, author, slot smallint check (slot between 1 and 5), text, client_id, created_at, mallow, hidden_for_owner, removed)`, with `unique(journey_id, author)`, `unique(journey_id, slot)` and `unique(author, client_id)`. **These constraints make a sixth perspective, a second from the same person, or a duplicate write impossible, even under races.**
- `mallow_perspectives(journey_id pk, status, mallow, source, text, model, reason, support jsonb, hidden, requested_by, created_at)`. **The primary key means one per feeling.**
- `blocks(by, who, at)`, primary key `(by, who)`
- `reports`, `report_notes`, `audit_log`
- `rate_events(user_id, kind, at)` and `ai_budget(day, scope, used)`

**Row-level security**
- RLS is on for every table.
- Members may `select` only their own `profiles` row and their own `journeys`
  (minus moderation fields). They get nothing on `holds`, `perspectives`,
  `exposures`, `reports` or `mallow_perspectives`: those are read through
  functions that build the same per-viewer views as `_journeyView` and
  `_offerView`.
- **No table grants `insert`, `update` or `delete` to `authenticated`.**

**Writes**
- Every write goes through one Edge Function (`hushmates-relay`). It holds
  the same method allow-list as `LocalNetwork` and verifies the user's JWT.
- It runs the JavaScript screening (the lexicon is JS, shared with Reframe),
  then calls `security definer` Postgres functions. Those use
  `set search_path = ''`, take the verified user id, and are executable only
  by the function's role.
- Key functions:
  - **`find_feeling(user)`:** expire stale holds; select eligible journeys
    ordered by `last_progress_at`, `limit 3 for update skip locked`; pick one
    at random; re-count `perspectives + live holds < 5` under the row lock;
    insert the hold and the exposure in one transaction.
  - **`submit_perspective(user, hold, text, client_id)`:** lock the journey
    row; check the hold is live, owned and caught, and the account is active
    and not blocked by the owner; insert with `slot = count + 1`; at five, mark
    the journey returned and void its holds.
  - **The rest:** `catch_feeling`, `let_float_past`, `withdraw`, `choose`,
    `save`, `release`, `delete_journey`, `report_*`, `block_*`, `export_my_data`,
    `delete_my_data` and the `mod_*` functions (moderators only, audited).
  - **`ask_mallow`:** `insert … on conflict do nothing returning` reserves the
    one generation. A conditional `update ai_budget … where used < limit
    returning` charges the budget. Only the request that won both calls
    Another Angle, with the **service credential kept in the Edge Function's
    secrets**.

**Time**
- `pg_cron` runs a `tick()` every minute: expire holds, return journeys past
  24 hours, record the 30-minute Mallow offer.
- Every function also does the same checks lazily, as the lab service does.

**Realtime**
- A private broadcast channel per user (`user:<uid>`) carries
  `{ type: 'changed', scope, id }` only, never words, exactly as in the lab.
  RLS on `realtime.messages` limits each channel to its owner.

**Never in the browser:** the service-role key, Another Angle credentials, or
any provider key. The browser holds only the user's session.

**Retention** (proposed for approval):
- Travelling journeys: at most 24 hours.
- Returned journeys: kept 30 days unless saved.
- Released journeys: words cleared at once.
- Deleted journeys and accounts: removed at once, and from backups within
  their rotation.
- Report evidence: 90 days after resolution.
- Audit log (no feeling text): 1 year.

**Before Another Angle can be used server-to-server** (from the review):
- Its production config refuses requests without an allowed `Origin`
  (`ALLOW_NO_ORIGIN = "false"`).
- It limits each device to 20 answers a day.
- A Hushmates service entitlement (or an allowed origin and a higher limit for
  that one identity) has to be agreed with the owner of that service.

## 6. Costs

Another Angle runs **Claude Opus 5.5** (`claude-opus-5-5`) at low effort, with
one retry and a 15-second attempt timeout. Prices are $4 per million input
tokens and $20 per million output tokens; cached prompt reads cost $0.20 per
million and cache writes $5 per million. Its prompt is about 4,800 tokens.

| Per Mallow perspective | Input | Output | Cost |
|---|---|---|---|
| Typical (prompt cached, about 600 output tokens incl. thinking) | ≈4,300 cached + 500 fresh | ≈600 | **≈ $0.015** |
| Uncached first call of the day | 4,800 (cache write) | ≈600 | ≈ $0.036 |
| Worst case (two attempts, 3,000 output tokens each) | 2 × 4,800 | 2 × 3,000 | ≈ $0.17 |

**Ceilings, from tightest to widest**
1. **One generation per feeling, ever.** Cached, and never regenerated, even
   after a failure.
2. **Only if the author opted in, after 30 minutes with nobody, and only when
   they ask.** Most feelings should be caught by people, so most never cost
   anything.
3. **5 per person per day**, and **500 for the whole service per day**:
   ≈ $7.50 a day typical, under the worst case Another Angle's own cap stops
   it first.
4. **Another Angle's daily spend cap** ($10 in production), checked before
   each call with a pessimistic estimate.
5. **Failure is graceful.** Budget exhausted, timeout or provider down: the
   Mallow is `failed`, the feeling keeps travelling and still comes home.
   There is no retry storm; the Reframe library can answer instead, labelled
   "not AI".

The relay's own rules cost nothing per use. Expected infrastructure for an
invitation-only pilot (a few hundred people) fits Supabase's smallest paid
tier; that is an estimate to confirm, not a quote.

## 7. Tests

```bash
node --test hushmallow/hushmates-lab/tests/*.test.mjs                 # 82 relay tests
node --test hushmallow/hushmates-lab/v1-messaging/tests/*.test.mjs    # 32 (archived v1)
```

| File | What it covers |
|---|---|
| `relay.test.mjs` (31) | Every rule above: five-person cap, atomic last slot, expiry, idempotency, fairness, screening, privacy both ways, 24-hour return, choices, reports, fallback opt-in / human-first / one generation / labels / budget / failure, data deletion |
| `relay-attacks.test.mjs` (14) | A hostile client through the network layer: forbidden internals, forged tokens, other people's journeys, hold theft and replay, malformed input, rate limits, realtime privacy, lost replies; the provider contracts against a fake Another Angle server; an optional live check against a local harness |
| `review-*.test.mjs` (37) | Written by three independent adversarial reviewers to **fail** on the reviewed code (caps and concurrency, privacy and safety, the fallback and costs). All failed; all now pass after the fixes, and they stay as regression tests. |

**Interface QA:** `tools/shots.cjs` captures 20 scenes at 390 × 844,
375 × 812, 320 × 568, 1280 (two phones) and 1280 (one phone). It also plays
both demonstrations through the real interface, checks every guide step ticks
from the service's state, and fails on any console error or warning.
