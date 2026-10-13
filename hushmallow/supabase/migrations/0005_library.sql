-- hushmallow · 0005 favourites and progress ("Keep my favourites and progress with my account", opt-in)
-- Ids and numbers only, never words, thoughts, feelings, photos or anything typed:
--   favourite_worlds   the worlds starred in the side panel (world ids)
--   garden_skills      Memory Garden tools kept: skill id, when kept / last
--                      practised, how often, which world and Mallow (ids)
--   hushflow_progress  where a Hushflow paused: world id, step numbers, the
--                      world sequence (ids), Mallow id, seed. Not the feeling
--                      or intention picked, not the world's own state.
-- Written only while sync_consents.library_sync is on (the policies check
-- it); withdrawing deletes every row here (0006). At most 64 favourites and
-- 64 tools per account. Requires 0001, 0003 and 0004 (keep_created_at).

begin;

-- ---------------------------------------------------------------- favourite worlds --
create table if not exists public.favourite_worlds (
  user_id    uuid not null references auth.users (id) on delete cascade,
  world_id   text not null check (world_id ~ '^[a-z0-9][a-z0-9._-]{0,47}$'),
  position   smallint not null default 0 check (position between 0 and 63),
  created_at timestamptz not null default now(),
  primary key (user_id, world_id)
);
comment on table public.favourite_worlds is 'hushmallow: favourite world ids, position 0 = most recent (opt-in, sync_consents.library_sync).';

-- ---------------------------------------------------------------- Memory Garden --
create table if not exists public.garden_skills (
  user_id           uuid not null references auth.users (id) on delete cascade,
  skill_id          text not null check (skill_id ~ '^[a-z][a-z0-9-]{1,47}$'),
  saved_at          timestamptz not null,
  last_practised_at timestamptz,
  practised         integer not null default 0 check (practised between 0 and 1000000),
  from_world        text check (from_world is null or from_world ~ '^[a-z][a-z0-9-]{1,47}$'),
  mallow            text check (mallow is null or mallow in ('glitzi', 'blubi', 'zuzu', 'boppo', 'pipzi', 'loomi', 'noomi')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  primary key (user_id, skill_id)
);
comment on table public.garden_skills is 'hushmallow: Memory Garden tool ids kept (opt-in, sync_consents.library_sync). Ids, dates and counts only.';

-- ---------------------------------------------------------------- Hushflow progress --
create table if not exists public.hushflow_progress (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  world_id   text not null check (world_id ~ '^[a-z0-9][a-z0-9._-]{0,47}$'),
  idx        smallint not null default 0 check (idx between 0 and 999),
  sequence   text[] not null default '{}'
             check (cardinality(sequence) <= 24
                    and array_position(sequence, null) is null
                    and array_to_string(sequence, ',') ~ '^([a-z0-9][a-z0-9._-]{0,47}(,[a-z0-9][a-z0-9._-]{0,47})*)?$'),
  step       real not null default 0 check (step between 0 and 1),
  mallow     text check (mallow is null or mallow in ('glitzi', 'blubi', 'zuzu', 'boppo', 'pipzi', 'loomi', 'noomi')),
  seed       bigint not null default 0 check (seed between 0 and 4294967295),
  saved_at   timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.hushflow_progress is 'hushmallow: where a Hushflow paused (opt-in, sync_consents.library_sync). World ids and numbers only.';

-- ---------------------------------------------------------------- security --
alter table public.favourite_worlds enable row level security;
alter table public.favourite_worlds force row level security;
alter table public.garden_skills enable row level security;
alter table public.garden_skills force row level security;
alter table public.hushflow_progress enable row level security;
alter table public.hushflow_progress force row level security;

revoke all on table public.favourite_worlds from public;
revoke all on table public.favourite_worlds from anon, authenticated;
revoke all on table public.garden_skills from public;
revoke all on table public.garden_skills from anon, authenticated;
revoke all on table public.hushflow_progress from public;
revoke all on table public.hushflow_progress from anon, authenticated;
grant select, insert, update, delete on table public.favourite_worlds to authenticated;
grant select, insert, update, delete on table public.garden_skills to authenticated;
grant select, insert, update, delete on table public.hushflow_progress to authenticated;

drop policy if exists favourite_worlds_select_own on public.favourite_worlds;
drop policy if exists favourite_worlds_insert_own on public.favourite_worlds;
drop policy if exists favourite_worlds_update_own on public.favourite_worlds;
drop policy if exists favourite_worlds_delete_own on public.favourite_worlds;
create policy favourite_worlds_select_own on public.favourite_worlds
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy favourite_worlds_insert_own on public.favourite_worlds
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.sync_consents c where c.user_id = (select auth.uid()) and c.library_sync)
  );
create policy favourite_worlds_update_own on public.favourite_worlds
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.sync_consents c where c.user_id = (select auth.uid()) and c.library_sync)
  );
create policy favourite_worlds_delete_own on public.favourite_worlds
  for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists garden_skills_select_own on public.garden_skills;
drop policy if exists garden_skills_insert_own on public.garden_skills;
drop policy if exists garden_skills_update_own on public.garden_skills;
drop policy if exists garden_skills_delete_own on public.garden_skills;
create policy garden_skills_select_own on public.garden_skills
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy garden_skills_insert_own on public.garden_skills
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.sync_consents c where c.user_id = (select auth.uid()) and c.library_sync)
  );
create policy garden_skills_update_own on public.garden_skills
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.sync_consents c where c.user_id = (select auth.uid()) and c.library_sync)
  );
create policy garden_skills_delete_own on public.garden_skills
  for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists hushflow_progress_select_own on public.hushflow_progress;
drop policy if exists hushflow_progress_insert_own on public.hushflow_progress;
drop policy if exists hushflow_progress_update_own on public.hushflow_progress;
drop policy if exists hushflow_progress_delete_own on public.hushflow_progress;
create policy hushflow_progress_select_own on public.hushflow_progress
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy hushflow_progress_insert_own on public.hushflow_progress
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.sync_consents c where c.user_id = (select auth.uid()) and c.library_sync)
  );
create policy hushflow_progress_update_own on public.hushflow_progress
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.sync_consents c where c.user_id = (select auth.uid()) and c.library_sync)
  );
create policy hushflow_progress_delete_own on public.hushflow_progress
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------- caps and stamps --
-- at most 64 favourites / 64 tools per account (the app keeps the same caps)
create or replace function hm_private.enforce_row_cap()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  n integer;
begin
  if tg_table_name = 'favourite_worlds' then
    select count(*) into n from public.favourite_worlds where user_id = new.user_id;
  elsif tg_table_name = 'garden_skills' then
    select count(*) into n from public.garden_skills where user_id = new.user_id;
  else
    return new;
  end if;
  if n >= 64 then
    raise exception 'hushmallow keeps at most 64 of these per account' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function hm_private.enforce_row_cap() from public;
revoke all on function hm_private.enforce_row_cap() from anon, authenticated;

create or replace trigger favourite_worlds_cap
  before insert on public.favourite_worlds
  for each row execute function hm_private.enforce_row_cap();
create or replace trigger garden_skills_cap
  before insert on public.garden_skills
  for each row execute function hm_private.enforce_row_cap();

create or replace trigger favourite_worlds_created
  before insert or update on public.favourite_worlds
  for each row execute function hm_private.keep_created_at();
create or replace trigger garden_skills_created
  before insert or update on public.garden_skills
  for each row execute function hm_private.keep_created_at();
create or replace trigger garden_skills_updated_at
  before insert or update on public.garden_skills
  for each row execute function hm_private.set_updated_at();
create or replace trigger hushflow_progress_created
  before insert or update on public.hushflow_progress
  for each row execute function hm_private.keep_created_at();
create or replace trigger hushflow_progress_updated_at
  before insert or update on public.hushflow_progress
  for each row execute function hm_private.set_updated_at();

insert into hm_private.schema_migrations (version, name) values (5, '0005_library')
on conflict (version) do nothing;

commit;
