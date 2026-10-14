-- Hushmates · LOCAL DEVELOPMENT ONLY: the tables behind the local copy of
-- Supabase Auth's email-code sign-in (server/auth-emulator.mjs).
--
-- This file is never a migration and never runs on a Supabase project: a real
-- project has its own `auth` schema, run by Supabase. It lives outside
-- supabase/migrations on purpose, and it refuses to run where Supabase's own
-- auth role exists.
--
-- Safe to run again and again (everything is "if not exists"), and safe when
-- several test databases on one server start at once (roles belong to the whole
-- server, so a role someone else just made is fine).
--
-- Nothing here is reachable from a browser: no grants to anon or authenticated,
-- and row level security on with no policies.

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    raise exception 'This looks like a Supabase database: the auth emulation schema is for local development only.';
  end if;
end
$$;

-- The roles Supabase projects have. NOLOGIN: nobody signs in to Postgres as them.
do $$
declare
  r text;
begin
  foreach r in array array['anon', 'authenticated', 'service_role'] loop
    if not exists (select 1 from pg_roles where rolname = r) then
      begin
        if r = 'service_role' then
          execute format('create role %I nologin noinherit bypassrls', r);   -- as on Supabase
        else
          execute format('create role %I nologin noinherit', r);
        end if;
      exception when duplicate_object or unique_violation then
        null;                                                               -- another database made it first
      end;
    end if;
  end loop;
end
$$;

create schema if not exists auth;
revoke all on schema auth from public;

create table if not exists auth.users (
  id uuid primary key,
  email text not null unique check (email = lower(email) and length(email) between 3 and 254),
  created_at timestamptz not null default now(),
  last_sign_in_at timestamptz
);

-- One row per code sent. Only a keyed hash of the code is kept; the newest
-- unused code for an email is the only one that works.
create table if not exists auth.otp_codes (
  id bigint generated always as identity primary key,
  email text not null,
  code_hash text not null,
  create_user boolean not null default true,
  attempts integer not null default 0 check (attempts >= 0),
  created_at timestamptz not null,
  expires_at timestamptz not null,
  used_at timestamptz,                                     -- signed in with it, or replaced by a newer code
  check (expires_at > created_at)
);
create index if not exists otp_codes_email_created on auth.otp_codes (email, created_at desc);

create table if not exists auth.sessions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null,
  refreshed_at timestamptz,
  aal text not null default 'aal1'
);
create index if not exists sessions_user on auth.sessions (user_id);

-- Refresh tokens are stored hashed (SHA-256). Each refresh replaces the token
-- with a new one (`parent` points at the one it replaced); a replaced token
-- stays as `revoked` while its session lives, so reusing it can be noticed.
create table if not exists auth.refresh_tokens (
  id bigint generated always as identity primary key,
  token_hash text not null unique,
  session_id uuid not null references auth.sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  parent bigint,
  revoked boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz
);
create index if not exists refresh_tokens_session on auth.refresh_tokens (session_id);

-- The emulator's signing key (ES256), kept so restarting the dev stack doesn't
-- sign everyone out. A development key in a development database: the emulator
-- only ever signs for a local issuer, which no production verifier trusts.
create table if not exists auth.emulator_keys (
  kid text primary key,
  private_jwk jsonb not null,
  public_jwk jsonb not null,
  created_at timestamptz not null default now()
);

alter table auth.users enable row level security;
alter table auth.otp_codes enable row level security;
alter table auth.sessions enable row level security;
alter table auth.refresh_tokens enable row level security;
alter table auth.emulator_keys enable row level security;

revoke all on all tables in schema auth from public, anon, authenticated, service_role;
revoke all on all sequences in schema auth from public, anon, authenticated, service_role;
