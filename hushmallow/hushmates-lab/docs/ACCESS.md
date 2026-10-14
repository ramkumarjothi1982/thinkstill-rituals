# Hushmates · Two experiences, strictly apart

Hushmates now has two separate experiences, and the server keeps them apart.

| | Customer experience | Developer experience |
|---|---|---|
| What it is | The app: invitation, welcome, Release, Catch, My journeys, Returned, You & safety, Your data | The lab: Control room, scenarios A/B/C, Phone A/B, test identities, dev clock, "Type it for me", safety desk, lab notes |
| Where | `/app/` on a Hushmates server (`app/index.html`) | `/lab/` on a **development** server, for authorised testers only (`index.html`, `lab/`) |
| Production build | `dist/app`, made by `tools/build-app.mjs` | Not built, not served, not present |
| Who it talks to | The Hushmates server's API, as the signed-in member | An in-page simulated service with seven test identities, entirely inside the tester's browser |

## How the separation is enforced

**On the server** (`server/server.mjs`), not by hiding buttons:

- **Two modes.** `production` serves only the built app (the files in
  `dist/app/manifest.json`, each checked against its hash at start-up) and the
  API. It has no lab routes at all, and it refuses to start if given a lab or a
  tester key. `development` adds the lab, but only for a tester.
- **Only what the app loads.** The customer file list is worked out by
  following the app's imports from `app/index.html` (`server/app-files.mjs`).
  The server answers only for those exact paths. Every other path gets the same
  plain "This page isn't here." page, so `/lab/` looks like any missing page.
  Server code, tests, tools, docs, test data and the simulated network are
  never in the list. Traversal tricks (`..`, `%2e%2e`, `%2f`, backslashes,
  case changes) don't work, because a path is looked up, never joined.
- **Testers.** The lab answers only to a tester key that whoever runs a
  development server sets (`HUSHMATES_TESTER_KEY`, 16 characters or more).
  The tester opens `/lab/?key=…` once. The server swaps the key for an HttpOnly,
  SameSite=Strict cookie and redirects, so the key leaves the address bar. With
  no key, a short key or a wrong key, there is no lab. A member's session
  doesn't open it, and a tester's cookie opens no account.
- **Members.** People join with a single-use invitation code, a name only they
  see, and confirmation that they're 18 or over. The server checks all three
  and records the adult confirmation. The session is an HttpOnly,
  SameSite=Strict cookie (Secure in production). The server keeps the mapping
  from that cookie to the internal session, so page scripts can't read either.
  Coming back after signing out needs the same invitation code and the same
  name. Guessing invitations is slowed to 10 tries per 15 minutes.
- **The API** (`/api/v1/rpc/<method>`) reaches only the methods a person may
  use (`CLIENT_METHODS`). The safety-desk methods (`MODERATOR_METHODS`) check
  the moderator role on the server. Test, account and internal methods
  (`createTestAccount`, `signInTestAccount`, `seedRelay`, `createMember`,
  `issueSession`, `tick`, anything starting `_`) can't be called. There is no
  clock route.
- **Changes from other sites are refused.** Every change needs a header that a
  page on another site can't send, a JSON body, and (when the browser says) our
  own origin and `Sec-Fetch-Site`.
- **Errors.** The server returns the service's own words (written for people)
  or one gentle line. Details stay in the server's log.

**In the service** (`core/relay.js`):

- `testMode` must be set for test identities to exist (`createTestAccount`,
  `signInTestAccount`, `seedRelay`). Only the lab and the tests set it, and the
  server never does. A test identity found in saved state is nobody on a
  server: it can't sign in.
- Fixed testing examples (`cannedExamples`) need `testMode` too. A canned
  answer is treated as no answer, and one kept in old state is never shown or
  exported. The label "Example for testing, not generated" lives only in the
  server-side service.
- Test controls can't bypass the rules. The lab's controls go through the same
  service rules (consent, screening, holds, limits): "Type it for me" only fills
  a text box, which is screened like any other. The dev clock and fixtures
  touch only the lab's own in-page service. Nothing in the lab reaches a server.

**In the build** (`tools/build-app.mjs`):

- `dist/app` holds exactly the files the app loads (68 today; a test pins the
  list, so a stray import of server or lab code fails).
- Every built file is scanned. The build is refused if it contains lab or
  control-room words, test identities, simulated services, testing labels,
  developer signals, server tuning, debug calls, local addresses, anything that
  looks like a credential, or placeholders. A test plants each kind of content
  and checks that the scan catches it.
- Server-only code never ships: `core/relay.js`, `core/relay-rules.js` (hold
  times, rate limits, budgets, review thresholds), `core/relay-seed.js`,
  `core/perspectives.js`, `net/`, `lab/`.

**In the interface:**

- Lab-only notes (where a Mallow perspective came from, "test identity", the
  crisis-resources review note) live in `lab/lab-notes.js`, which the
  customer app never loads. Scenes leave an empty place (`hostNote`) that only
  the lab fills.
- Only words written for people reach the screen (`ui/dom.js` `humane`). A
  browser, parsing or programming error becomes "Something went wrong. Please
  try again in a moment."
- "Your data" is a short, warm summary with **Download my data**. The file is
  for the person's device and is never shown on screen (see below).

## Your data

`exportMyData` (format `hushmates-personal-data`, version 1) is built field by
field from an allow-list. It is never a copy of stored records.

- **It holds** your name here and your Mallow, your choices, and each feeling's
  words, status and dates. It also holds when you agreed to share it
  anonymously and to a Mallow perspective, the perspectives that came back to
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

Tests: `tests/your-data.test.mjs` (10). They cover the allow-list, both
directions of privacy, sealing, removals, reports, blocks, who may export, the
Mallow perspective, and plain words and ISO dates.

## What the tests prove

`tests/access-control.test.mjs` (18) runs real servers over HTTP in both modes:

- the lab, its files and test data are 404 in production for everyone, with
  the tester key too, and look like any missing page;
- server code, tests, tools and docs can't be fetched, however the path is
  written;
- with no session, everything is "not signed in";
- joining needs a real invitation and adult confirmation, the cookie flags are
  right, and no internal token reaches the page;
- invitation guessing is slowed down;
- an ordinary member can't reach the lab or any testing method;
- the safety desk answers only to moderators;
- the lab opens only for the tester key (and not at all without one), and the
  tester cookie is not an account;
- forged, leaked and signed-out cookies open nothing;
- changes from other sites are refused;
- consent, safety screening, privacy, Mallow timing and honest labels hold for
  direct API calls;
- deleting your data ends the session for good;
- live updates reach only their person;
- a build changed after it was made is refused.

`tests/build.test.mjs` (4) checks the build: the file list, the scan, planted
defects and the pinned list. `tests/audit-fixes.test.mjs` (6) covers the
developer-content audit's findings.

`tools/app-shots.mjs` drives the customer app as customers get it: the
production build on a production-mode server, with people joining by
invitation. It photographs each screen and fails if any screen's visible text,
labels or placeholders contain developer content, raw data, internal ids,
programming values or testing words, or if there's any console error.

## Running them

```bash
# the customer app, from the production build (nothing is deployed)
node hushmallow/hushmates-lab/tools/build-app.mjs
HUSHMATES_INVITES="CODE-ONE,CODE-TWO" node hushmallow/hushmates-lab/server/main.mjs --mode production --port 8080
# → http://127.0.0.1:8080/app/  (/lab/ is "This page isn't here.")

# a development server with the lab for testers
HUSHMATES_TESTER_KEY="$(openssl rand -base64 24)" node hushmallow/hushmates-lab/server/main.mjs --mode development --port 8090
# → the app at /app/; the lab at the /lab/?key=… address it prints
```

The lab still works as a standalone page on a developer's own machine
(`python3 -m http.server`, see the README). That serves the source tree, so
use it only locally. The Hushmates server is the only way the app is meant to
be served to anyone else.

## Limits of this prototype (need approval before production)

- **Sign-in.** Invitation codes stand in for real accounts. Production needs
  Supabase Auth (`RELAY.md` §5); the server's design (HttpOnly session, API
  allow-list, origin checks, no lab in production) carries over.
- **State.** The server keeps state in memory, or in one JSON file
  (`--state`). Production needs Postgres with the rules enforced there, as in
  `RELAY.md` §5.
- **Moderators** join with a staff invitation (`HUSHMATES_STAFF_INVITES`). The
  safety desk interface exists only in the lab today, so a staff tool is still
  to be built.
- **`data-test` attributes.** They stay in the app's markup for automated
  checks. They are invisible, and say nothing a person's own API replies don't
  already say.
- **Not tested here:** TLS, hosting, real email invitations and rate limiting
  across several server instances.
