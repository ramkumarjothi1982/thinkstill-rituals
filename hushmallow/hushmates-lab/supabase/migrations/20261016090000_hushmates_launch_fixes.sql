-- Launch fixes: what the review of 9012d6f found in the rules. Each function here replaces the one of the
-- same name in 20261014090100_hushmates_rules.sql (create or replace), and the one constraint is dropped
-- and made again, so applying this twice changes nothing. core/relay.js changes in step with it
-- (tests/backend-differential.test.mjs drives both and compares every answer).
--   1. "Let it carry on" resumes a feeling only when no other report on it is still open (m_mod_resolve).
--   2. A decided report can't be decided again: the answer is 'already-decided', and nothing changes (m_mod_resolve).
--   3. The desk never sees who reported: the activity log names no account for a report's entries
--      (m_mod_audit). The stored row keeps its actor, for the operator.
--   4. A catcher is sent what their screen shows (the words, the label, the count), not the author's Mallow (offer_view).
--   5. The personal-data file says when the person confirmed they're 18 or over (m_export_raw).
--   6. A report reason for a member who seems to be under 18, at the usual priority (reports.reason, hushmates.report).

-- ------------------------------------------------------------- report reasons --
alter table hushmates.reports drop constraint if exists reports_reason_check;
alter table hushmates.reports add constraint reports_reason_check
  check (reason in ('unkind', 'harassment', 'identifying', 'sexual', 'scam', 'under18', 'safety', 'other'));

create or replace function hushmates.report(m hushmates.members, p_kind text, p_journey uuid, p_perspective uuid, a jsonb) returns hushmates.reports
language plpgsql set search_path = '' as $$
declare j hushmates.journeys; r hushmates.perspectives; f hushmates.mallow_perspectives; rep hushmates.reports;
begin
  -- the reasons in core/relay-config.js (REPORT_REASONS); only "Someone may be in danger" is a priority
  if coalesce(a ->> 'reason', '') not in ('unkind', 'harassment', 'identifying', 'sexual', 'scam', 'under18', 'safety', 'other') then
    perform hushmates.fail('invalid', 'Choose what best describes it.');
  end if;
  if coalesce((a ->> 'detailsTooLong')::boolean, false) then perform hushmates.fail('invalid', 'Please keep the details under 600 characters.'); end if;
  perform hushmates.rate(m.id::text, jsonb_build_array(jsonb_build_array('report', hushmates.lim('reportsPerDay'), 86400000)));
  select * into j from hushmates.journeys where id = p_journey;
  if p_perspective is not null then select * into r from hushmates.perspectives where id = p_perspective; end if;
  select * into f from hushmates.mallow_perspectives where journey_id = p_journey;
  insert into hushmates.reports (at, by_member, kind, journey_id, perspective_id, reason, details_enc, subject, urgent, evidence)
  values (hushmates.clock(), m.id, p_kind, p_journey, p_perspective, a ->> 'reason', coalesce(a ->> 'detailsEnc', ''),
    case when p_kind = 'feeling' then j.owner else r.author end, a ->> 'reason' = 'safety',
    case when p_kind = 'feeling' then jsonb_build_object('feeling', j.text_enc)
         else jsonb_build_object('feeling', j.text_enc, 'perspective', coalesce(r.text_enc, f.text_enc, '')) end)
  returning * into rep;
  -- the reporter is kept here for the operator; the desk's view of the log never shows it (m_mod_audit)
  perform hushmates.audit(m.id::text, 'report.created', jsonb_build_object('report', rep.id, 'kind', p_kind, 'reason', a ->> 'reason'));
  return rep;
end $$;

-- ------------------------------------------------------------------ catching --
create or replace function hushmates.offer_view(p_hold uuid) returns jsonb
language sql stable set search_path = '' as $$
  -- what the catcher's screen shows, and nothing more: never the author's Mallow
  select jsonb_build_object('holdId', h.id, 'state', h.status, 'expiresAt', hushmates.ms(h.expires_at),
    'feeling', jsonb_build_object('text', j.text_enc, 'label', j.label,
      'perspectivesSoFar', hushmates.human_count(j.id), 'of', hushmates.lim('perspectivesPerFeeling')))
  from hushmates.holds h join hushmates.journeys j on j.id = h.journey_id where h.id = p_hold
$$;

-- ----------------------------------------------------------------- your data --
/** Everything that's the person's own, raw; the gateway decrypts it and words it (core/export-format.js). */
create or replace function hushmates.m_export_raw(m hushmates.members) returns jsonb
language plpgsql set search_path = '' as $$
begin
  perform hushmates.actor(m, array['active', 'restricted', 'suspended']);
  perform hushmates.settle_member(m.id);
  return jsonb_build_object(
    'now', hushmates.ms(hushmates.clock()),
    'you', jsonb_build_object('pseudonym', m.pseudonym, 'mallow', m.mallow, 'createdAt', hushmates.ms(m.created_at),
      'adultConfirmedAt', hushmates.ms(m.adult_confirmed_at),
      'catching', m.catching, 'notifyReturn', m.notify_return, 'state', m.state),
    'feelings', coalesce((select jsonb_agg(jsonb_build_object(
        'text', j.text_enc, 'label', j.label, 'status', j.status, 'createdAt', hushmates.ms(j.created_at),
        'returnedAt', hushmates.ms(j.returned_at), 'returnReason', j.return_reason, 'resends', j.resends, 'saved', j.saved,
        'consentAt', hushmates.ms(j.consent_at), 'fallbackConsentAt', hushmates.ms(j.fallback_consent_at),
        'people', (select count(*) from hushmates.perspectives p where p.journey_id = j.id and not p.set_aside and not p.removed and not p.hidden_for_owner),
        'items', hushmates.items(j), 'events', j.events) order by j.created_at)
      from hushmates.journeys j where j.owner = m.id and j.status <> 'deleted'), '[]'),
    'offered', coalesce((select jsonb_agg(jsonb_build_object('text', r.text_enc, 'at', hushmates.ms(r.created_at), 'allowShare', r.allow_share,
        'shareConsentAt', hushmates.ms(r.share_consent_at), 'journeyHome', j.status <> 'travelling') order by r.created_at)
      from hushmates.perspectives r join hushmates.journeys j on j.id = r.journey_id where r.author = m.id and not r.removed), '[]'),
    'feelingsThatFoundYou', (select count(*) from hushmates.holds where member_id = m.id),
    'reports', coalesce((select jsonb_agg(jsonb_build_object('kind', x.kind, 'reason', x.reason, 'details', x.details_enc, 'at', hushmates.ms(x.at), 'status', x.status) order by x.at)
      from hushmates.reports x where x.by_member = m.id), '[]'),
    'blocked', (select count(*) from hushmates.blocks where blocker = m.id));
end $$;

-- ---------------------------------------------------------------- moderation --
create or replace function hushmates.m_mod_resolve(m hushmates.members, a jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare r hushmates.reports; j hushmates.journeys; v_status text; s hushmates.members; v_waiting boolean; v_paused boolean;
begin
  perform hushmates.moderator(m);
  select * into r from hushmates.reports where id = hushmates.as_uuid(a ->> 'id') for update;
  if r.id is null then perform hushmates.fail('not-found'); end if;
  -- one decision per report: a second one (another reader's, or the same one sent twice) changes nothing
  if r.status <> 'open' then perform hushmates.fail('already-decided'); end if;
  select * into j from hushmates.journeys where id = r.journey_id for update;
  case a ->> 'action'
    when 'dismiss' then v_status := 'no-action';
    when 'resume-feeling' then
      if j.id is null then perform hushmates.fail('invalid'); end if;
      -- it carries on only when nothing else about it is still waiting: another open report on the same
      -- feeling (a priority one included) keeps it paused until that one is decided too
      v_waiting := exists (select 1 from hushmates.reports x
                           where x.journey_id = j.id and x.kind = 'feeling' and x.status = 'open' and x.id <> r.id);
      if not v_waiting then update hushmates.journeys set paused = false where id = j.id; end if;
      v_paused := j.paused and v_waiting;
      v_status := 'no-action';
    when 'remove-feeling' then
      if j.id is null then perform hushmates.fail('invalid'); end if;
      update hushmates.journeys set paused = true where id = j.id;
      if j.status = 'travelling' then perform hushmates.return_journey(j.id, 'removed'); end if;
      v_status := 'actioned';
    when 'remove-perspective' then
      if r.perspective_id is null then perform hushmates.fail('invalid'); end if;
      update hushmates.perspectives set removed = true, text_enc = '', text_mac = null where id = r.perspective_id;
      v_status := 'actioned';
    when 'restrict-user' then
      if r.subject is null then perform hushmates.fail('invalid'); end if;
      select * into s from hushmates.members where id = r.subject;
      if s.id is not null and s.role <> 'moderator' then
        update hushmates.members set state = 'restricted', catching = false where id = s.id;
        update hushmates.holds set status = 'voided', ended_at = hushmates.clock()
        where (member_id = s.id or journey_id in (select id from hushmates.journeys where owner = s.id))
          and status in ('offered', 'caught') and expires_at > hushmates.clock();
      end if;
      v_status := 'actioned';
    else perform hushmates.fail('invalid');
  end case;
  update hushmates.reports set status = v_status, resolved_at = hushmates.clock() where id = r.id;
  if coalesce(a ->> 'noteEnc', '') <> '' then
    insert into hushmates.report_notes (report_id, by_member, at, text_enc) values (r.id, m.id, hushmates.clock(), a ->> 'noteEnc');
  end if;
  perform hushmates.audit(m.id::text, 'mod.resolve', jsonb_build_object('report', r.id, 'decision', a ->> 'action'));
  -- "Let it carry on" says whether it really did (it stays paused while another report on it is open)
  return jsonb_build_object('id', r.id, 'status', v_status)
    || case when a ->> 'action' = 'resume-feeling' then jsonb_build_object('paused', v_paused) else '{}'::jsonb end;
end $$;

create or replace function hushmates.m_mod_audit(m hushmates.members) returns jsonb
language plpgsql set search_path = '' as $$
begin
  perform hushmates.moderator(m);
  perform hushmates.audit(m.id::text, 'mod.view-audit');
  return jsonb_build_object('entries', coalesce((select jsonb_agg(x.e order by x.id) from (
    -- accounts by a short reference only; and the desk never sees who reported, so a report's entries
    -- name no account at all ("a member"; "system" for the provider's safety check)
    select (detail - 'member') || jsonb_build_object('id', id, 'at', hushmates.ms(at),
      'actor', case when left(action, 7) = 'report.' then case when actor = 'system' then 'system' else 'a member' end
                    when actor ~ '^[0-9a-f-]{36}$' then left(actor, 8) else actor end,
      'action', action) as e, id
    from hushmates.audit_log order by id desc limit 200) x), '[]'));
end $$;
