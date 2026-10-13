-- hushmallow · 0004 preferences ("Sync my settings", opt-in)
-- The app's settings as switches and fixed values only (no free text):
-- sound, volume, haptics, motion, low stimulation, the history switch, the
-- saved-angles switch, intro seen, auto-flow, subtitle speed, text size and
-- the home Mallow. Written only while sync_consents.settings_sync is on
-- (the policy checks it); withdrawing deletes the row (0006).
-- Requires 0001 and 0003.

begin;

create table if not exists public.preferences (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  sound          boolean not null default true,
  volume         numeric(3, 2) not null default 0.60 check (volume between 0 and 1),
  haptics        boolean not null default true,
  motion         text not null default 'system' check (motion in ('system', 'reduced', 'full')),
  low_stim       boolean not null default false,
  save_history   boolean not null default true,
  save_words     boolean not null default false,
  seen_intro     boolean not null default false,
  auto_flow      boolean not null default false,
  subtitle_speed numeric(3, 2) not null default 1 check (subtitle_speed in (0.75, 1, 1.25, 1.5)),
  text_scale     numeric(3, 2) not null default 1 check (text_scale in (1, 1.12, 1.25)),
  mallow         text check (mallow is null or mallow in ('glitzi', 'blubi', 'zuzu', 'boppo', 'pipzi', 'loomi', 'noomi')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
comment on table public.preferences is 'hushmallow: synced settings (opt-in, sync_consents.settings_sync). Switches and fixed values only.';

alter table public.preferences enable row level security;
alter table public.preferences force row level security;

revoke all on table public.preferences from public;
revoke all on table public.preferences from anon, authenticated;
grant select, insert, update, delete on table public.preferences to authenticated;

drop policy if exists preferences_select_own on public.preferences;
drop policy if exists preferences_insert_own on public.preferences;
drop policy if exists preferences_update_own on public.preferences;
drop policy if exists preferences_delete_own on public.preferences;
create policy preferences_select_own on public.preferences
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy preferences_insert_own on public.preferences
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.sync_consents c where c.user_id = (select auth.uid()) and c.settings_sync)
  );
create policy preferences_update_own on public.preferences
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.sync_consents c where c.user_id = (select auth.uid()) and c.settings_sync)
  );
create policy preferences_delete_own on public.preferences
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create or replace function hm_private.keep_created_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
  else
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;
revoke all on function hm_private.keep_created_at() from public;
revoke all on function hm_private.keep_created_at() from anon, authenticated;

create or replace trigger preferences_created
  before insert or update on public.preferences
  for each row execute function hm_private.keep_created_at();
create or replace trigger preferences_updated_at
  before insert or update on public.preferences
  for each row execute function hm_private.set_updated_at();

insert into hm_private.schema_migrations (version, name) values (4, '0004_preferences')
on conflict (version) do nothing;

commit;
