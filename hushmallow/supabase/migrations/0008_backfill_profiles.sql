-- hushmallow · 0008 backfill profiles
-- Accounts created before 0002 put its trigger on auth.users have no
-- profile row. This adds one for each (display name from the sign-up
-- metadata, cleaned and capped like the trigger does). It changes nothing
-- for accounts that already have one and is safe to run again at any time.
-- Requires 0002.

begin;

insert into public.profiles (user_id, display_name)
select u.id,
       left(nullif(btrim(regexp_replace(coalesce(u.raw_user_meta_data ->> 'display_name', ''), '[[:cntrl:]]', '', 'g')), ''), 40)
from auth.users u
where not exists (select 1 from public.profiles p where p.user_id = u.id)
on conflict (user_id) do nothing;

insert into hm_private.schema_migrations (version, name) values (8, '0008_backfill_profiles')
on conflict (version) do nothing;

commit;
