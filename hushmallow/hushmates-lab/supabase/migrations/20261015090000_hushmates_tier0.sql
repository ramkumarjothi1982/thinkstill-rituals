-- Tier 0 (docs/safety/TIER0_SELF_ASSESSMENT.md): what people are told after a report, honestly.
-- The safety team is small and isn't there around the clock, and it can't see who anyone is or
-- contact anyone, so the acknowledgement says so (docs/legal/MODERATION.md §4.1). core/relay.js says the
-- same usual words; the away notice is here only (the in-memory relay has no settings).
-- While the owner marks the desk as away (settings.desk.awayUntil: the day a reader will next check it,
-- written "2026-12-29", read in Sydney), reporters are told when it will be read instead. server/admin.mjs
-- takes only that form, today to 90 days ahead. Anything else found there (another date format, "infinity",
-- "soon", "", further ahead) still means someone marked the desk away, so it reads as away with no day:
-- never the usual "within a day" while nobody may be reading, and never a day we can't trust.

insert into hushmates.settings (key, value) values ('desk', '{ "awayUntil": null }') on conflict (key) do nothing;

create or replace function hushmates.expectation(p_urgent boolean) returns text
language plpgsql stable set search_path = '' as $$
declare
  v_set jsonb := hushmates.setting('desk') -> 'awayUntil';
  v_raw text := v_set #>> '{}';
  v_today date := (hushmates.clock() at time zone 'Australia/Sydney')::date;
  v_until date;
  v_day text;
  v_end text := 'We can’t see who wrote it, so we can’t contact them or send help. If someone is in danger right now, call 000. '
    || case when p_urgent then 'If this has stayed with you, Lifeline is there any time on 13 11 14. ' else '' end
    || 'Nobody is told who reported.';
begin
  if v_set is not null and jsonb_typeof(v_set) <> 'null' then
    -- only YYYY-MM-DD, by to_date (DateStyle would read 12/01/2027 as 1 December), and only a real, finite
    -- day that reads back the same (to_date refuses 2026-02-30; 0000-01-01 comes back as 1 BC)
    if jsonb_typeof(v_set) = 'string' and v_raw ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
      begin
        v_until := to_date(v_raw, 'YYYY-MM-DD');
        if not isfinite(v_until) or to_char(v_until, 'YYYY-MM-DD') is distinct from v_raw then v_until := null; end if;
      exception when others then
        v_until := null;                     -- a mistyped date never stops a report
      end;
    end if;
    if v_until is not null and v_until < v_today then
      null;                                  -- the day it named has passed: a reader is back, the usual words
    else
      if v_until <= v_today + 90 then v_day := nullif(trim(to_char(v_until, 'FMDay FMDD FMMonth')), ''); end if;
      return coalesce('Thank you for telling us. Our safety team is away until ' || v_day || ', so it will be read when we’re back. ',
        'Thank you for telling us. Our safety team is away for now and may not be able to read it straight away. It will be read when we’re back. ')
        || v_end;
    end if;
  end if;
  return case when p_urgent
    then 'Thank you for telling us. This goes to the front of the queue for a person on our safety team. We’re a small team and we’re not here around the clock: during the pilot we aim to read priority reports within a day, and nights, weekends and holidays can take longer. We can’t see who wrote it, so we can’t contact them or send help. If you know someone is in danger right now, call 000. If this has stayed with you, Lifeline is there any time on 13 11 14. Nobody is told who reported.'
    else 'Thank you for telling us. A person on our safety team will read it. We’re a small team, not here around the clock: during the pilot we aim to read reports within two days. Nobody is told who reported.' end;
end $$;
