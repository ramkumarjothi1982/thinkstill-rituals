-- hushmallow · ROLLBACK of migrations 0001–0009
--
-- Removes everything the hushmallow migrations created: the RPC, the
-- triggers (including on_auth_user_created on auth.users), the six tables
-- WITH ALL THEIR ROWS (profiles, consents and every synced setting,
-- favourite, Memory Garden tool and progress record), and the hm_private
-- schema. It does NOT delete any account in auth.users: people can still
-- sign in; the app then simply has nothing stored for them (and works,
-- because every server row is optional).
--
-- Only for undoing a failed rollout. Take a backup first (Database →
-- Backups) and turn sign-in off in the app (remove SUPABASE_URL /
-- SUPABASE_PUBLISHABLE_KEY from Cloudflare Pages and redeploy) before you run it.
-- Re-running the migrations afterwards recreates empty tables; run
-- 0008_backfill_profiles.sql again to give existing accounts their profiles.

begin;

drop function if exists public.delete_my_account();

-- The sign-up trigger lives on auth.users, which Supabase Auth owns. Where the
-- SQL editor's role may not drop it, it is left in place with a do-nothing
-- body (sign-ups keep working) and a notice says how to remove it: Dashboard
-- → Database → Triggers → on_auth_user_created → Delete.
do $rollback$
begin
  begin
    drop trigger if exists on_auth_user_created on auth.users;
  exception when insufficient_privilege then
    create or replace function hm_private.handle_new_user()
    returns trigger language plpgsql security invoker set search_path = '' as $noop$ begin return new; end; $noop$;
    raise notice 'on_auth_user_created could not be dropped from this role: it now does nothing. Remove it in Dashboard → Database → Triggers, then run this script again.';
  end;
end
$rollback$;

drop table if exists public.hushflow_progress;
drop table if exists public.garden_skills;
drop table if exists public.favourite_worlds;
drop table if exists public.preferences;
drop table if exists public.sync_consents;
drop table if exists public.profiles;

drop function if exists hm_private.sync_consents_withdrawn();
drop function if exists hm_private.enforce_row_cap();
drop function if exists hm_private.keep_created_at();
drop function if exists hm_private.sync_consents_stamp();
drop function if exists hm_private.profiles_stamp();
drop function if exists hm_private.set_updated_at();
drop table if exists hm_private.schema_migrations;
-- hm_private goes only once nothing (the sign-up trigger) still uses it
do $rollback$
begin
  if not exists (select 1 from pg_trigger where tgname = 'on_auth_user_created' and tgrelid = 'auth.users'::regclass) then
    drop function if exists hm_private.handle_new_user();
    drop schema if exists hm_private;
  end if;
end
$rollback$;

commit;
