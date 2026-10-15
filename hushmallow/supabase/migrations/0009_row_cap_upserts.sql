-- hushmallow · 0009 row cap counts new rows only
-- 0005's cap (at most 64 favourite worlds / 64 Memory Garden tools per
-- account) is a BEFORE INSERT trigger, and an upsert (INSERT … ON CONFLICT
-- DO UPDATE, which the app's sync sends) fires it for rows that already
-- exist: with 64 rows kept, every later sync of the same 64 was refused
-- (23514). The cap now lets a row whose key is already there through (it
-- becomes an update) and counts only genuinely new keys. Same function name,
-- same triggers; safe to run again at any time. Requires 0005.

begin;

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
    -- already kept: the upsert updates it, nothing new is added
    if exists (select 1 from public.favourite_worlds f where f.user_id = new.user_id and f.world_id = new.world_id) then
      return new;
    end if;
    select count(*) into n from public.favourite_worlds where user_id = new.user_id;
  elsif tg_table_name = 'garden_skills' then
    if exists (select 1 from public.garden_skills g where g.user_id = new.user_id and g.skill_id = new.skill_id) then
      return new;
    end if;
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

insert into hm_private.schema_migrations (version, name) values (9, '0009_row_cap_upserts')
on conflict (version) do nothing;

commit;
