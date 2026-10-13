-- hushmallow · 0001 foundation
-- A private schema for helpers the Data API never exposes, the updated_at
-- trigger function, and a small record of which scripts have run.
-- Safe to run more than once. Run in the Supabase SQL editor, in order.

begin;

-- Pre-flight: every user-data table FORCEs row level security, so the two
-- functions that must act for the system (the sign-up trigger, which runs as
-- Supabase Auth inserts a user, and delete_my_account) rely on their owner,
-- the role running these scripts, bypassing RLS. Supabase's `postgres` role
-- has BYPASSRLS; stop here, before anything is created, if this one does not.
do $preflight$
begin
  if not exists (select 1 from pg_roles where rolname = current_user and (rolbypassrls or rolsuper)) then
    raise exception 'hushmallow: the role "%" cannot bypass row level security (BYPASSRLS), so with FORCE RLS sign-ups would fail. Run these scripts in the Supabase SQL editor as postgres; if you did, stop and ask before going on. Nothing was changed.', current_user;
  end if;
end
$preflight$;

create schema if not exists hm_private;
comment on schema hm_private is 'hushmallow internals (trigger functions, bookkeeping). Not exposed by the Data API.';
revoke all on schema hm_private from public;
revoke all on schema hm_private from anon, authenticated;

create table if not exists hm_private.schema_migrations (
  version    integer primary key,
  name       text not null,
  applied_at timestamptz not null default now()
);
revoke all on table hm_private.schema_migrations from public;
revoke all on table hm_private.schema_migrations from anon, authenticated;

-- Every user-data table keeps updated_at itself; nobody can set it by hand.
create or replace function hm_private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function hm_private.set_updated_at() from public;
revoke all on function hm_private.set_updated_at() from anon, authenticated;

insert into hm_private.schema_migrations (version, name) values (1, '0001_foundation')
on conflict (version) do nothing;

commit;
