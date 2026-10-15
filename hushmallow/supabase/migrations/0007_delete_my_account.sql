-- hushmallow · 0007 delete_my_account()
-- "Delete account" in the app calls this (POST /rest/v1/rpc/delete_my_account
-- with the person's own session). It takes no arguments: it can only ever
-- delete the caller, auth.uid(). It deletes every hushmallow row the account
-- owns and then its auth.users row, whose foreign keys cascade to anything
-- left (profiles, consents, synced rows) and, inside Supabase Auth, to its
-- identities, sessions and refresh tokens. Only the authenticated role may
-- execute it; anon and public may not.
-- SECURITY DEFINER because deleting from auth.users needs the owner's rights;
-- search_path is empty and every name is schema-qualified.
-- Requires 0001 to 0006.

begin;

create or replace function public.delete_my_account()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or coalesce(auth.jwt() ->> 'role', '') <> 'authenticated' then
    raise exception 'sign in to delete your account' using errcode = '42501';
  end if;
  delete from public.hushflow_progress where user_id = v_uid;
  delete from public.garden_skills where user_id = v_uid;
  delete from public.favourite_worlds where user_id = v_uid;
  delete from public.preferences where user_id = v_uid;
  delete from public.sync_consents where user_id = v_uid;
  delete from public.profiles where user_id = v_uid;
  delete from auth.users where id = v_uid;
  if not found then
    raise exception 'no such account' using errcode = 'P0002';
  end if;
  return jsonb_build_object('deleted', true);
end;
$$;
comment on function public.delete_my_account() is 'hushmallow: deletes the calling account (auth.uid()) and all of its rows. No arguments; authenticated only.';
revoke all on function public.delete_my_account() from public;
revoke all on function public.delete_my_account() from anon;
grant execute on function public.delete_my_account() to authenticated;

insert into hm_private.schema_migrations (version, name) values (7, '0007_delete_my_account')
on conflict (version) do nothing;

commit;
