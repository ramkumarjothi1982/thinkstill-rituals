# Hushmates Lab: private human companionship (prototype)

**Status: Phase 1 prototype, waiting for approval of the user experience.**
Two simulated test identities, a local demonstration service, and no real
backend, real people or production data. Nothing here is deployed:
`tools/build-site.sh` copies only `src/` and `assets/`, so this folder never
ships with the app.

Hushmates lets two real people who **both said yes** talk privately in a
text-only **Hushspace**. It has no feeds, followers or public profiles, it
uses no AI anywhere, and nobody is ever obliged to reply.

## Run it

```bash
# from the repository root (the folder that contains hushmallow/)
python3 -m http.server 8000
# open http://localhost:8000/hushmallow/hushmates-lab/index.html
```

- **Desktop:** both devices sit side by side (Device A: MoonMallow, Device B:
  CloudMallow), with the demo guide on the right.
- **Phone:** the bar at the top switches which device you're holding. A pink
  badge means that person has something new (muted Hushspaces don't count).
- **Demo guide:** the ten demonstration steps tick themselves off from the
  real state. "Type it for me" fills in the scripted lines, "Play the demo"
  clicks through the real interface, and "Reset demo" starts over. Lab state
  is saved in this browser only (`localStorage`); add `?fresh` to the URL to
  ignore it once.
- **Server-side check:** after blocking, "Try sending as CloudMallow anyway"
  sends straight to the service, skipping the interface, and shows the refusal.
- **Network:** each device has an Online/Offline switch. Messages sent while
  offline show *Not sent · Try again*, and the retry can't create a duplicate.

## What's real and what's simulated

| | |
|---|---|
| **Real (enforced and tested)** | Mutual consent before any conversation exists. Two-person Hushspaces. Blocking (both ways, plus re-contact protection after unblocking). Quiet periods after a decline or disconnect. Invitation expiry, duplicates, the pending cap and the 3-Hushmate limit, rechecked at acceptance. Text rules. Size and rate limits. Duplicate-safe sends. Reports with evidence snapshots. Moderator-only, audited access. Data export and identity deletion. Viewer-specific data (no account ids, e-mails or registration details ever leave the service). |
| **Real (client)** | Optimistic sending, *sending / not sent / retry* states, catching up after an interruption, ordering by server sequence, pagination, unread counts without read receipts. |
| **Simulated** | The service runs **inside the page** (`core/service.js`), saved to `localStorage`. Sign-in is simulated for labelled test accounts. The "network" (`net/local-network.js`) is an in-page transport with latency, offline mode and lost replies. There's no Supabase, no server, no push notifications and no real-time across separate browsers. |
| **Not built yet** | Moderator interface (the service API and tests exist), appeals, age assurance, real authentication, SQL schema and RLS, Realtime, notifications, retention purge jobs, cost model. Phase 2 onwards; see `docs/ARCHITECTURE.md`. |

Seeded test identities: **MoonMallow** (starts with no identity, so the lab
shows creating one), **CloudMallow** (discoverable), **StarMallow** and
**FernMallow** (discoverable; nobody operates them, and Fern has paused
invitations), **DreamMallow** (hidden: must never appear in Find), and one
**moderator** account.

## Tests

```bash
node --test hushmallow/hushmates-lab/tests/*.test.mjs                 # 32 tests: rules, attacks, client
node hushmallow/hushmates-lab/tools/shots.cjs <out-dir> [base-url]   # plays the demo at 390×844, 375×812, 320×568, 1280×860; screenshots + console errors
```

The tests cover identity separation, discovery opt-in and opt-out,
invitations (accept, decline, duplicate, self, cancel, expiry, codes),
connection limits, messaging before acceptance (refused), third-party and
moderator access to a conversation (refused), ordering and pagination,
unread counts and the absence of read receipts, duplicate prevention, size,
text and rate limits, stored text that's never interpreted as markup,
intents, quiet mode and mute, blocking and unblocking, disconnecting,
reports, moderation, deleted accounts and data export. On top of that,
**forged requests** through the network entry point: internal methods, fake
tokens, caller-supplied user ids, acting on other people's invitations,
malformed and oversized arguments, and realtime events leaking to
non-members.

These tests prove the **rules**. They can't prove **database security**:
that needs Phase 2 RLS tests with real, isolated authenticated identities.

## Map

| Path | What |
|---|---|
| `core/config.js` | Every limit and list (limits, intents, styles, report categories) |
| `core/text-policy.js` | Deterministic text rules (links, contact details, money requests); no AI |
| `core/service.js` | The rules: identity, discovery, invitations, Hushspaces, blocks, reports, moderation, your data |
| `core/seed.js` | Test identities |
| `net/local-network.js` | Demo transport: method allow-list, JSON copies, latency, offline, lost replies, realtime channel |
| `client/client.js` | One device's state and delivery guarantees, which the interface talks to |
| `ui/` | Interface: `device.js` (router, sheets, toasts), `presence.js` (living Mallow, no speech), `screens/*` |
| `styles/hushmates.css` | Hushmates styles on the Hushmallow tokens; scoped to `.hm-device` |
| `lab/`, `styles/lab.css`, `index.html` | Lab scaffolding only (two devices, guide) |
| `docs/` | Architecture and the Phase 2 plan, safety and privacy drafts, screenshots |

The Mallows are the official art and the living rig from `src/mallows/`,
reused read-only. Nothing outside this folder was changed.
