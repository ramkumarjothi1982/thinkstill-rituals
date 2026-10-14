-- Hushmates · 1 of 3 · the tables
--
-- Every record lives in schema `hushmates`. Browsers have no access to it at all:
-- row-level security is on for every table with no policies, and nothing is granted
-- to anon or authenticated. The only way in is the functions in `hushmates_api`
-- (2 of 3), callable only by the service role the Hushmates Edge Function uses.
--
-- Words people write are stored encrypted by the Edge Function (hmenc:v1:…); the
-- database never sees them in the clear. `*_mac` columns hold a keyed hash for
-- duplicate checks.
--
-- The constraints are the last line of defence for the rules: even a bug or a
-- race in a function can't give a feeling a sixth perspective, two from one
-- person, a duplicate write, a second Mallow generation, or circulation without
-- consent.

create schema if not exists hushmates;
create schema if not exists hushmates_api;
revoke all on schema hushmates from public;
revoke all on schema hushmates_api from public;

-- ------------------------------------------------------------------ settings --
-- Limits and switches, changeable without a migration. Defaults match core/relay-rules.js.
create table hushmates.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
insert into hushmates.settings (key, value) values
  ('limits', '{
     "perspectivesPerFeeling": 5, "offerHoldMs": 180000, "catchHoldMs": 600000, "fallbackAfterMs": 1800000,
     "journeyTtlMs": 86400000, "maxActiveJourneys": 3, "maxResends": 2,
     "feelingMinChars": 3, "feelingMaxChars": 500, "reframeMinChars": 8, "reframeMaxChars": 280,
     "submissionsPerHour": 6, "submissionsPerDay": 24, "findsPerHour": 40, "reframesPerHour": 12, "reportsPerDay": 20,
     "fallbackPerPersonPerDay": 5, "fallbackGlobalPerDay": 500, "fairnessPool": 3, "reportsToPause": 2, "similarity": 0.8,
     "invitesPerHour": 10, "invitesPerHourPerNetwork": 30, "requestsPerMinute": 120
   }'),
  ('mallow', '{ "available": true, "autoGenerate": true, "claimTimeoutMs": 120000 }'),
  ('ai', '{ "enabled": false, "monthlyCapAud": 0, "perMemberDaily": 3, "perDayGlobal": 200, "timeoutMs": 20000, "costPerCallAud": 0.06, "cacheTtlMs": 3600000 }'),
  ('retention', '{ "returnedDays": 30, "evidenceDaysAfterResolution": 90, "openEvidenceDays": 180, "auditDays": 365, "rateEventsHours": 48 }');

-- ------------------------------------------------------------------- people --
create table hushmates.invites (
  id uuid primary key default gen_random_uuid(),
  code_mac text not null unique,                       -- a keyed hash of the code: the code itself is never stored
  role text not null default 'member' check (role in ('member', 'moderator')),
  max_uses int not null default 1 check (max_uses > 0),
  uses int not null default 0 check (uses >= 0 and uses <= max_uses),
  expires_at timestamptz,
  revoked_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);

create table hushmates.members (
  id uuid primary key default gen_random_uuid(),
  role text not null default 'member' check (role in ('member', 'moderator')),
  state text not null default 'active' check (state in ('active', 'restricted', 'suspended', 'deleted')),
  pseudonym text not null check (char_length(pseudonym) between 1 and 40),
  mallow text not null default 'noomi' check (mallow in ('noomi', 'blubi', 'pipzi', 'boppo', 'zuzu', 'loomi', 'glitzi')),
  catching boolean not null default false,
  notify_return boolean not null default true,
  onboarded boolean not null default false,
  adult_confirmed_at timestamptz not null,             -- nobody becomes a member without confirming they're 18 or over
  invite_id uuid references hushmates.invites (id) on delete set null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- A member is reached through sign-in identities (issuer + subject). Today: the isolated
-- Hushmates Auth project. Later: the main Hushmallow login can be linked to the same member.
create table hushmates.identities (
  issuer text not null,
  subject text not null,
  member_id uuid not null references hushmates.members (id) on delete cascade,
  provider text not null default 'hushmates',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  primary key (issuer, subject)
);
create index identities_member on hushmates.identities (member_id);

create table hushmates.blocks (
  blocker uuid not null references hushmates.members (id),
  blocked uuid not null references hushmates.members (id),
  at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
create index blocks_blocked on hushmates.blocks (blocked);

-- ----------------------------------------------------------------- feelings --
create table hushmates.journeys (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references hushmates.members (id),
  client_id text not null check (client_id ~ '^[A-Za-z0-9_-]{8,64}$'),
  text_enc text not null default '',
  text_mac text,
  label text check (label in ('worry', 'sadness', 'anger', 'joy', 'loneliness', 'confusion', 'frustration', 'excitement')),
  mallow text not null check (mallow in ('noomi', 'blubi', 'pipzi', 'boppo', 'zuzu', 'loomi', 'glitzi')),
  allow_fallback boolean not null default false,
  consent_at timestamptz not null,                      -- nothing circulates without recorded consent
  fallback_consent_at timestamptz,
  status text not null check (status in ('travelling', 'returned', 'released', 'deleted')),
  created_at timestamptz not null,
  released_at timestamptz not null,
  expires_at timestamptz not null,
  last_progress_at timestamptz not null,
  returned_at timestamptz,
  return_reason text check (return_reason in ('complete', 'expired', 'withdrawn', 'removed')),
  resends int not null default 0 check (resends between 0 and 20),
  resend_client_ids text[] not null default '{}',
  paused boolean not null default false,
  fallback_offered_at timestamptz,
  seen_return boolean not null default false,
  saved boolean not null default false,
  choices jsonb not null default '{}',                  -- perspective id → kept (true) / let go (false)
  events jsonb not null default '[]',                   -- the journey's steps, never anyone's identity
  unique (owner, client_id),
  check (allow_fallback = false or fallback_consent_at is not null)
);
create index journeys_travelling on hushmates.journeys (last_progress_at, created_at) where status = 'travelling';
create index journeys_owner on hushmates.journeys (owner, created_at desc);

create table hushmates.holds (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references hushmates.journeys (id) on delete cascade,
  member_id uuid not null references hushmates.members (id),
  status text not null check (status in ('offered', 'caught', 'used', 'expired', 'passed', 'voided', 'reported', 'released')),
  created_at timestamptz not null,
  expires_at timestamptz not null,
  caught_at timestamptz,
  ended_at timestamptz
);
-- one feeling held at a time per person, whatever happens concurrently
create unique index holds_one_live_per_member on hushmates.holds (member_id) where status in ('offered', 'caught');
create index holds_journey_live on hushmates.holds (journey_id) where status in ('offered', 'caught');
create index holds_member on hushmates.holds (member_id, created_at desc);

create table hushmates.exposures (                      -- never shown the same feeling twice
  journey_id uuid not null references hushmates.journeys (id) on delete cascade,
  member_id uuid not null references hushmates.members (id),
  at timestamptz not null,
  primary key (journey_id, member_id)
);

create table hushmates.perspectives (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references hushmates.journeys (id) on delete cascade,
  author uuid not null references hushmates.members (id),
  slot smallint not null check (slot between 1 and 5),
  text_enc text not null default '',
  text_mac text,
  client_id text not null check (client_id ~ '^[A-Za-z0-9_-]{8,64}$'),
  created_at timestamptz not null,
  mallow text not null,
  hidden_for_owner boolean not null default false,
  set_aside boolean not null default false,             -- written by someone who had blocked the author: never part of the journey
  removed boolean not null default false,
  withdrawn_at timestamptz,
  allow_share boolean not null default false,
  share_consent_at timestamptz,
  unique (author, client_id),                           -- no duplicate writes
  unique (journey_id, author),                          -- one perspective per person per feeling
  check (allow_share = false or share_consent_at is not null)
);
-- never two in the same place, so never a sixth (with slot ≤ 5)
create unique index perspectives_one_per_slot on hushmates.perspectives (journey_id, slot) where not set_aside;
create index perspectives_author on hushmates.perspectives (author, created_at desc);

create table hushmates.mallow_perspectives (            -- the journey is the key: one generation per feeling, ever
  journey_id uuid primary key references hushmates.journeys (id) on delete cascade,
  id uuid not null unique default gen_random_uuid(),
  status text not null check (status in ('pending', 'ready', 'failed')),
  mallow text not null,
  source text check (source in ('ai', 'library')),
  text_enc text not null default '',
  model text,
  angle_id text,
  voice text,
  reason text,
  support jsonb,
  hidden boolean not null default false,
  seen boolean not null default false,
  requested_by text not null,                           -- a member id, or 'schedule'
  created_at timestamptz not null,
  ready_at timestamptz,
  claimed_at timestamptz
);
create index mallow_pending on hushmates.mallow_perspectives (created_at) where status = 'pending';

-- ------------------------------------------------------------------- safety --
create table hushmates.reports (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null,
  by_member uuid references hushmates.members (id),     -- null: raised by the system (a provider's safety check)
  kind text not null check (kind in ('feeling', 'perspective')),
  journey_id uuid not null references hushmates.journeys (id) on delete cascade,
  perspective_id uuid,
  reason text not null check (reason in ('unkind', 'harassment', 'identifying', 'sexual', 'scam', 'safety', 'other')),
  details_enc text not null default '',
  subject uuid references hushmates.members (id),
  status text not null default 'open' check (status in ('open', 'no-action', 'actioned')),
  urgent boolean not null default false,
  evidence jsonb not null default '{}',                 -- encrypted words, kept for the safety team, purged on schedule
  resolved_at timestamptz
);
create index reports_queue on hushmates.reports (urgent desc, at) where status = 'open';
create index reports_journey on hushmates.reports (journey_id);

create table hushmates.report_notes (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references hushmates.reports (id) on delete cascade,
  by_member uuid not null references hushmates.members (id),
  at timestamptz not null,
  text_enc text not null
);

create table hushmates.audit_log (                      -- what happened, never anyone's words
  id bigserial primary key,
  at timestamptz not null,
  actor text not null,
  action text not null,
  detail jsonb not null default '{}'
);
create index audit_at on hushmates.audit_log (at);

-- ------------------------------------------------------------ limits, costs --
create table hushmates.rate_events (
  subject text not null,                                -- a member id, an identity, or a hashed network address
  kind text not null,
  at timestamptz not null
);
create index rate_events_lookup on hushmates.rate_events (subject, kind, at);

create table hushmates.usage_daily (
  day date not null,
  scope text not null,                                  -- 'global' or a member id
  kind text not null,
  used int not null default 0,
  primary key (day, scope, kind)
);

create table hushmates.ai_usage (                       -- every AI call, with its estimated cost (AI is off until approved)
  id bigserial primary key,
  at timestamptz not null,
  member_id uuid,
  journey_id uuid,
  provider text not null,
  model text,
  input_tokens int,
  output_tokens int,
  cost_aud numeric(12, 6) not null default 0,
  status text not null,
  ms int
);
create index ai_usage_at on hushmates.ai_usage (at);

create table hushmates.ops_daily (                      -- counts of expensive or telling operations, for monitoring
  day date not null,
  kind text not null,
  count bigint not null default 0,
  primary key (day, kind)
);

-- Sign-ins to end at the sign-in provider after someone deletes their data. The Edge Function ends
-- them at once; any it couldn't (the provider down) are retried by the scheduler until they're gone.
create table hushmates.auth_deletions (
  issuer text not null,
  subject text not null,
  created_at timestamptz not null,
  attempts int not null default 0,
  last_attempt_at timestamptz,
  primary key (issuer, subject)
);

-- ---------------------------------------------------------------- no access --
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'hushmates' loop
    execute format('alter table hushmates.%I enable row level security', t.tablename);
    execute format('revoke all on hushmates.%I from public', t.tablename);
  end loop;
end $$;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on schema hushmates, hushmates_api from anon;
    revoke all on all tables in schema hushmates from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on schema hushmates, hushmates_api from authenticated;
    revoke all on all tables in schema hushmates from authenticated;
  end if;
end $$;
