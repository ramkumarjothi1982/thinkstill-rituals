# Hushmates architecture, and how the prototype maps to Supabase

## Layers

```
 interface (ui/)  ──>  client (client/client.js)  ──>  link  ──>  service rules
                                                        │
             Phase 1: net/local-network.js  ──>  core/service.js (in the page)
             Phase 2: supabase-js           ──>  Postgres (RLS + functions) + Realtime
```

The interface only ever talks to `HushmatesClient`. Phase 2 swaps the link
underneath it; the screens shouldn't need to change.

## Invariants the backend must enforce (all are enforced and tested in `core/service.js`)

1. **Identity comes from the session.** Use `auth.uid()`, never a user id
   supplied by the client.
2. **Other people are only a view.** Show an opaque `handle`, a pseudonym, a
   Mallow and the fields they chose to share. Never show an account id, an
   e-mail, registration data or activity times.
3. **No conversation exists before mutual acceptance.** Accepting an
   invitation is the only thing that creates a connection and its Hushspace,
   which has exactly two members.
4. **Writes need an open Hushspace you belong to, with no block either way.**
   This covers messages, intents and quiet mode. A non-member gets the same
   "not found" as a Hushspace that doesn't exist.
5. **Limits are checked again at acceptance**, for both people, in one
   transaction.
6. **Blocks** close the Hushspace, cancel pending invitations both ways, and
   hide each person from the other in discovery. After an unblock, the
   blocked person still can't initiate contact until the unblocker invites
   them.
7. **Quiet periods.** After a decline or disconnect, the other person can't
   re-invite for 30 days. Discovery and invitations both respect this.
8. **Rate limits and size limits are server-side** (`core/config.js`).
9. **Realtime delivers only to members**, and only what that member could
   fetch anyway.
10. **Moderators have no endpoint to read conversations.** They see the
    evidence captured in a report, and every look is audited.

## Phase 2 draft data model (for review; not applied anywhere)

| Table | Key columns | Notes |
|---|---|---|
| `hushmate_profiles` | `user_id` PK → `auth.users`, `handle` unique, `pseudonym` unique (case-insensitive), `avatar`, `interests text[]`, `style`, `language`, `availability`, `status`, `discoverable` default false, `accepting_invites` | The owner can read and write their own row; nobody else reads the table directly |
| `hushmate_discovery` (view or function) | public card fields only | Exposed through a `discover(style, interests)` security-definer function that applies opt-in, blocks, quiet periods, the cap of 12 and a rate limit. **No direct select on profiles** |
| `hushmate_invite_codes` | `code` unique, `user_id` | Redeemed only through a function, which rate-limits guesses |
| `hushmate_invitations` | `id`, `from_user`, `to_user`, `status`, `expires_at`, `via` | Partial unique index on the unordered pair `where status = 'pending'`. Insert and update only through functions |
| `hushmate_connections` | `id`, `user_a < user_b` (check), `status` | Partial unique index on the pair `where status = 'active'` |
| `hushmate_conversations` | `id`, `connection_id` unique, `status` | Exactly one per connection |
| `hushmate_conversation_members` | `(conversation_id, user_id)` PK, `intent`, `quiet`, `muted`, `last_read_seq` | Two rows per conversation, created by the accept function |
| `hushmate_messages` | `id`, `conversation_id`, `seq`, `sender_id`, `body` (check `char_length <= 1000`), `client_id`, `created_at`, `deleted_at` | `unique (conversation_id, seq)` and `unique (sender_id, client_id)`. Index on `(conversation_id, seq desc)` |
| `hushmate_blocks` | `(blocker, blocked)` PK | |
| `hushmate_quiet_periods` | `(protects, from_user)` PK, `until` | |
| `hushmate_reports` | `id`, `reporter`, `subject`, `conversation_id`, `message_id`, `category`, `details`, `evidence jsonb`, `status`, `assigned_to`, `urgent` | Evidence is copied when the report is made. Members can insert only, through a function |
| `hushmate_moderation_actions`, `hushmate_audit_log` | | Append-only. Readable only with the moderator role |
| `hushmate_rate_events` | `user_id`, `kind`, `at` | Or a token bucket inside the functions |

**RLS outline:**

- Members can `select` messages and member rows only where a row exists in
  `hushmate_conversation_members` with `user_id = auth.uid()`.
- Members never get direct `insert`, `update` or `delete` on the
  connection, conversation, member, invitation, block or report tables. All
  writes go through `security definer` functions (`send_message`,
  `respond_invitation`, `block_user`, …) that re-check invariants 3 to 8
  and run limit checks with `select … for update` on both people's profile
  rows.
- The moderator role is a separate claim, checked inside the functions.
  There's no RLS policy that lets moderators read messages.

**Realtime:** use Supabase Realtime *Broadcast* on private per-member
channels, authorised by Realtime RLS on `realtime.messages`. Alternatively,
use Postgres Changes on `hushmate_messages`, filtered by RLS. Events carry the
message the member may see, or a plain "changed" signal that tells the
client to refetch, as in Phase 1. Clean up subscriptions when leaving a
screen. Reconnect with backoff and catch up with `after_seq`, as
`client.catchUp` already does.

**Privileged operations** (moderation actions, deletion jobs, retention
purges) run in Edge Functions or Workers with the service role, server-side
only. Service-role keys never reach the browser.

**Integration with the main app** (Phase 4): get the session from Claude 1's
Supabase Auth module when it lands. Mount `Device` (renamed, without the lab
scaffolding) in a Hushmates scene, and import `styles/hushmates.css`. Don't
create a second authentication system, and don't touch existing tables.

## Encryption model (to state accurately to users)

HTTPS in transit and encryption at rest provided by the database host. Not
end-to-end encrypted: that's what makes human review of **reported**
messages possible. Because there's no browsing interface for moderators,
access to anything else would need production database access, which is
restricted and audited. If end-to-end encryption is wanted later, reports
would have to carry the plaintext the reporter chooses to share. That's a
product decision to revisit.
