-- Tier 0 (docs/safety/TIER0_SELF_ASSESSMENT.md): what people are told after a report, honestly.
-- The safety team is small and isn't there around the clock, and it can't see who anyone is or
-- contact anyone, so the acknowledgement says so (docs/legal/MODERATION.md). core/relay.js says the same.
-- While the owner marks the desk as away (settings.desk.awayUntil, a date such as "2026-12-29"),
-- reporters are told when it will be read instead.

insert into hushmates.settings (key, value) values ('desk', '{ "awayUntil": null }') on conflict (key) do nothing;

create or replace function hushmates.expectation(p_urgent boolean) returns text
language plpgsql stable set search_path = '' as $$
declare v_until date;
begin
  begin
    v_until := nullif(hushmates.setting('desk') ->> 'awayUntil', '')::date;
  exception when others then
    v_until := null;                       -- a mistyped date never stops a report
  end;
  if v_until is not null and v_until >= (hushmates.clock() at time zone 'Australia/Sydney')::date then
    return 'Thank you for telling us. Our safety team is away until ' || trim(to_char(v_until, 'FMDay FMDD FMMonth'))
      || ', so it will be read when we’re back. We can’t see who wrote it, so we can’t contact them or send help. '
      || 'If someone is in danger right now, call 000. Nobody is told who reported.';
  end if;
  return case when p_urgent
    then 'Thank you for telling us. This goes to the front of the queue for a person on our safety team. We’re a small team and we’re not here around the clock: during the pilot we aim to read priority reports within a day, and nights, weekends and holidays can take longer. We can’t see who wrote it, so we can’t contact them or send help. If you know someone is in danger right now, call 000. If this has stayed with you, Lifeline is there any time on 13 11 14. Nobody is told who reported.'
    else 'Thank you for telling us. A person on our safety team will read it. We’re a small team, not here around the clock: during the pilot we aim to read reports within two days. Nobody is told who reported.' end;
end $$;
