-- hushmallow · 0003 sync consents
-- The person's two opt-in choices, both OFF until they turn them on:
--   settings_sync  "Sync my settings"                              → public.preferences
--   library_sync   "Keep my favourites and progress with my account" → favourite_worlds,
--                  garden_skills, hushflow_progress
-- The server stamps when each was given (…_sync_at) and withdrawn
-- (…_withdrawn_at). Withdrawing deletes the synced rows (0006). The synced
-- tables refuse writes unless the matching consent is on (0004, 0005).
-- A missing row means both are off. Requires 0001.

begin;

create table if not exists public.sync_consents (
  user_id               uuid primary key references auth.users (id) on delete cascade,
  settings_sync         boolean not null default false,
  settings_sync_at      timestamptz,
  settings_withdrawn_at timestamptz,
  library_sync          boolean not null default false,
  library_sync_at       timestamptz,
  library_withdrawn_at  timestamptz,
  consent_version       smallint not null default 1 check (consent_version between 1 and 999),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
comment on table public.sync_consents is 'hushmallow: opt-in consent to keep settings / favourites and progress with the account, with server timestamps for giving and withdrawing.';

alter table public.sync_consents enable row level security;
alter table public.sync_consents force row level security;

revoke all on table public.sync_consents from public;
revoke all on table public.sync_consents from anon, authenticated;
grant select, delete on table public.sync_consents to authenticated;
grant insert (user_id, settings_sync, library_sync) on table public.sync_consents to authenticated;
grant update (settings_sync, library_sync) on table public.sync_consents to authenticated;

drop policy if exists sync_consents_select_own on public.sync_consents;
drop policy if exists sync_consents_insert_own on public.sync_consents;
drop policy if exists sync_consents_update_own on public.sync_consents;
drop policy if exists sync_consents_delete_own on public.sync_consents;
create policy sync_consents_select_own on public.sync_consents
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy sync_consents_insert_own on public.sync_consents
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy sync_consents_update_own on public.sync_consents
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy sync_consents_delete_own on public.sync_consents
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- the timestamps are the server's: given when a switch turns on, withdrawn when it turns off
create or replace function hm_private.sync_consents_stamp()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.settings_sync_at := case when new.settings_sync then now() else null end;
    new.settings_withdrawn_at := null;
    new.library_sync_at := case when new.library_sync then now() else null end;
    new.library_withdrawn_at := null;
  else
    new.user_id := old.user_id;
    new.created_at := old.created_at;
    new.settings_sync_at := case when new.settings_sync and not old.settings_sync then now() else old.settings_sync_at end;
    new.settings_withdrawn_at := case when old.settings_sync and not new.settings_sync then now() else old.settings_withdrawn_at end;
    new.library_sync_at := case when new.library_sync and not old.library_sync then now() else old.library_sync_at end;
    new.library_withdrawn_at := case when old.library_sync and not new.library_sync then now() else old.library_withdrawn_at end;
  end if;
  new.consent_version := 1;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function hm_private.sync_consents_stamp() from public;
revoke all on function hm_private.sync_consents_stamp() from anon, authenticated;

create or replace trigger sync_consents_stamp
  before insert or update on public.sync_consents
  for each row execute function hm_private.sync_consents_stamp();

insert into hm_private.schema_migrations (version, name) values (3, '0003_sync_consents')
on conflict (version) do nothing;

commit;
