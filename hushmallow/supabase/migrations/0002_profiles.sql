-- hushmallow · 0002 profiles
-- One row per account: an optional display name (at most 40 characters),
-- the home Mallow, when the account was created and last seen, and the
-- schema version. Created automatically for every new sign-up (trigger on
-- auth.users); accounts made before this script ran get theirs from
-- 0008_backfill_profiles.sql. Never words, feelings, thoughts or photos.
-- Requires 0001.

begin;

create table if not exists public.profiles (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  display_name   text
                 check (display_name is null
                        or (char_length(display_name) between 1 and 40 and display_name !~ '[[:cntrl:]]')),
  home_mallow    text
                 check (home_mallow is null
                        or home_mallow in ('glitzi', 'blubi', 'zuzu', 'boppo', 'pipzi', 'loomi', 'noomi')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  last_seen_at   timestamptz,
  schema_version smallint not null default 1 check (schema_version between 1 and 999)
);
comment on table public.profiles is 'hushmallow: one row per account. Display name (optional, <= 40 chars), home Mallow id, created / last seen, schema version. No free text beyond the name.';

alter table public.profiles enable row level security;
alter table public.profiles force row level security;

-- no anon access at all; the signed-in owner only, and only these columns
revoke all on table public.profiles from public;
revoke all on table public.profiles from anon, authenticated;
grant select, delete on table public.profiles to authenticated;
grant insert (user_id, display_name, home_mallow) on table public.profiles to authenticated;
grant update (display_name, home_mallow, last_seen_at) on table public.profiles to authenticated;

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy profiles_delete_own on public.profiles
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- the server owns created_at, updated_at, schema_version and the last-seen time
create or replace function hm_private.profiles_stamp()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.schema_version := 1;
    new.last_seen_at := case when new.last_seen_at is null then null else now() end;
  else
    new.user_id := old.user_id;
    new.created_at := old.created_at;
    new.schema_version := old.schema_version;
    if new.last_seen_at is distinct from old.last_seen_at then
      new.last_seen_at := now();
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function hm_private.profiles_stamp() from public;
revoke all on function hm_private.profiles_stamp() from anon, authenticated;

create or replace trigger profiles_stamp
  before insert or update on public.profiles
  for each row execute function hm_private.profiles_stamp();

-- a profile for every new sign-up (the name, if one was given, cleaned and capped)
create or replace function hm_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  v_name := nullif(btrim(regexp_replace(coalesce(new.raw_user_meta_data ->> 'display_name', ''), '[[:cntrl:]]', '', 'g')), '');
  if v_name is not null then
    v_name := left(v_name, 40);
  end if;
  insert into public.profiles (user_id, display_name)
  values (new.id, v_name)
  on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke all on function hm_private.handle_new_user() from public;
revoke all on function hm_private.handle_new_user() from anon, authenticated;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function hm_private.handle_new_user();

insert into hm_private.schema_migrations (version, name) values (2, '0002_profiles')
on conflict (version) do nothing;

commit;
