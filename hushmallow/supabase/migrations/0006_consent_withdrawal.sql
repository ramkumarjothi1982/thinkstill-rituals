-- hushmallow · 0006 withdrawing consent deletes what was synced
-- Turning "Sync my settings" off deletes the account's preferences row;
-- turning "Keep my favourites and progress with my account" off deletes its
-- favourite_worlds, garden_skills and hushflow_progress rows. Deleting the
-- consent row withdraws both. Runs with the rights of whoever changed the
-- consent (the account itself through the app), so Row Level Security still
-- limits it to that account's own rows. Requires 0001 to 0005.

begin;

create or replace function hm_private.sync_consents_withdrawn()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  was_settings boolean := old.settings_sync;
  was_library  boolean := old.library_sync;
  now_settings boolean := case when tg_op = 'DELETE' then false else new.settings_sync end;
  now_library  boolean := case when tg_op = 'DELETE' then false else new.library_sync end;
begin
  if was_settings and not now_settings then
    delete from public.preferences where user_id = old.user_id;
  end if;
  if was_library and not now_library then
    delete from public.favourite_worlds where user_id = old.user_id;
    delete from public.garden_skills where user_id = old.user_id;
    delete from public.hushflow_progress where user_id = old.user_id;
  end if;
  return null;
end;
$$;
revoke all on function hm_private.sync_consents_withdrawn() from public;
revoke all on function hm_private.sync_consents_withdrawn() from anon, authenticated;

create or replace trigger sync_consents_withdrawn
  after update or delete on public.sync_consents
  for each row execute function hm_private.sync_consents_withdrawn();

insert into hm_private.schema_migrations (version, name) values (6, '0006_consent_withdrawal')
on conflict (version) do nothing;

commit;
