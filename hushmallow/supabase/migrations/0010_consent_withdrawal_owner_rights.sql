-- hushmallow · 0010 deleting an account in the dashboard works with sync on
-- Deleting a user in the Supabase dashboard (or through the Auth admin API)
-- runs as supabase_auth_admin. The cascade from auth.users removes the
-- account's sync_consents row, and 0006's trigger then ran as that role,
-- which has no rights on public.preferences or the library tables: the whole
-- deletion failed ("permission denied for table preferences") for any account
-- with a sync switch on. The trigger now runs with its owner's rights (the
-- role that runs these migrations, like the sign-up trigger and
-- delete_my_account()). It still deletes only the rows of the account whose
-- consent row changed (old.user_id); only that account (Row Level Security on
-- sync_consents), the server roles or the account's own deletion can change
-- that row. Same function, same trigger, same body; safe to run again at any
-- time. Requires 0006.

begin;

create or replace function hm_private.sync_consents_withdrawn()
returns trigger
language plpgsql
security definer
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

insert into hm_private.schema_migrations (version, name) values (10, '0010_consent_withdrawal_owner_rights')
on conflict (version) do nothing;

commit;
