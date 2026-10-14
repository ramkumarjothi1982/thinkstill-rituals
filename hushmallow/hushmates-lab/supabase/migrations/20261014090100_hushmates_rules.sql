-- Hushmates · 2 of 3 · the rules
--
-- One function per action, each running in one transaction. The reference for every
-- behaviour is core/relay.js (the tested engine the lab runs); a differential test
-- drives both with the same multi-person sequences and compares every answer.
--
-- Errors: hushmates.fail() raises (the whole action is undone); hushmates.err()
-- returns an error answer while keeping what was already changed (as the reference
-- does, e.g. a hold that turns out to be stale is ended, and then the person is told).
-- Words arrive and leave encrypted; the Edge Function screens and decrypts them.

-- ------------------------------------------------------------------- basics --
create or replace function hushmates.clock() returns timestamptz
language sql stable set search_path = '' as $$
  select coalesce(nullif(pg_catalog.current_setting('hushmates.fake_now', true), '')::timestamptz, pg_catalog.now())
$$;

create or replace function hushmates.ms(t timestamptz) returns bigint
language sql immutable set search_path = '' as $$ select (extract(epoch from t) * 1000)::bigint $$;

create or replace function hushmates.setting(k text) returns jsonb
language sql stable set search_path = '' as $$ select value from hushmates.settings where key = k $$;

create or replace function hushmates.lim(k text) returns bigint
language sql stable set search_path = '' as $$ select (value ->> k)::bigint from hushmates.settings where key = 'limits' $$;

create or replace function hushmates.fail(code text, message text default null) returns void
language plpgsql set search_path = '' as $$
begin
  raise exception using errcode = 'P0001', message = 'hm:' || code, detail = coalesce(message, '');
end $$;

create or replace function hushmates.err(code text, message text default null) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object('error', jsonb_build_object('code', code, 'message', message))
$$;

create or replace function hushmates.audit(p_actor text, p_action text, p_detail jsonb default '{}') returns void
language sql set search_path = '' as $$
  insert into hushmates.audit_log (at, actor, action, detail) values (hushmates.clock(), p_actor, p_action, p_detail)
$$;

create or replace function hushmates.as_uuid(v text) returns uuid
language plpgsql immutable set search_path = '' as $$
begin
  return v::uuid;
exception when others then
  return null;
end $$;

create or replace function hushmates.client_id_ok(v text) returns boolean
language sql immutable set search_path = '' as $$ select v is not null and v ~ '^[A-Za-z0-9_-]{8,64}$' $$;

/** Check one or more allowances together; only when all have room is the attempt recorded in each. */
create or replace function hushmates.rate(p_subject text, p_rules jsonb) returns void
language plpgsql set search_path = '' as $$
declare r jsonb; v_t timestamptz := hushmates.clock();
begin
  for r in select * from jsonb_array_elements(p_rules) loop
    if (select count(*) from hushmates.rate_events e
        where e.subject = p_subject and e.kind = r ->> 0 and e.at > v_t - make_interval(secs => (r ->> 2)::numeric / 1000)) >= (r ->> 1)::int then
      perform hushmates.fail('rate-limited');
    end if;
  end loop;
  insert into hushmates.rate_events (subject, kind, at) select p_subject, x ->> 0, v_t from jsonb_array_elements(p_rules) x;
end $$;

create or replace function hushmates.bump(p_kind text, p_n int default 1) returns void
language sql set search_path = '' as $$
  insert into hushmates.ops_daily (day, kind, count) values (hushmates.clock()::date, p_kind, p_n)
  on conflict (day, kind) do update set count = hushmates.ops_daily.count + p_n
$$;

-- ------------------------------------------------------------------ people --
create or replace function hushmates.actor(m hushmates.members, p_allow text[] default array['active', 'restricted']) returns void
language plpgsql stable set search_path = '' as $$
begin
  if m.id is null or m.state = 'deleted' then perform hushmates.fail('not-signed-in'); end if;
  if not (m.state = any (p_allow)) then perform hushmates.fail('account-inactive'); end if;
end $$;

create or replace function hushmates.blocked(a uuid, b uuid) returns boolean
language sql stable set search_path = '' as $$
  select exists (select 1 from hushmates.blocks where (blocker = a and blocked = b) or (blocker = b and blocked = a))
$$;
create or replace function hushmates.blocked_by(p_by uuid, p_who uuid) returns boolean
language sql stable set search_path = '' as $$
  select exists (select 1 from hushmates.blocks where blocker = p_by and blocked = p_who)
$$;

-- ----------------------------------------------------------------- holds --
create or replace function hushmates.hold_live(h hushmates.holds) returns boolean
language sql stable set search_path = '' as $$
  select h.status in ('offered', 'caught') and h.expires_at > hushmates.clock()
$$;

create or replace function hushmates.end_hold(p_hold uuid, p_status text) returns void
language sql set search_path = '' as $$
  update hushmates.holds set status = p_status, ended_at = hushmates.clock() where id = p_hold
$$;

/** Holds whose time is up are expired (the reference's tick does this before anything else). */
create or replace function hushmates.expire_holds(p_member uuid default null, p_journey uuid default null) returns int
language plpgsql set search_path = '' as $$
declare n int;
begin
  update hushmates.holds set status = 'expired', ended_at = hushmates.clock()
  where status in ('offered', 'caught') and expires_at <= hushmates.clock()
    and (p_member is null or member_id = p_member) and (p_journey is null or journey_id = p_journey);
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------------------------------------------------------------- journeys --
create or replace function hushmates.human_count(p_journey uuid) returns int
language sql stable set search_path = '' as $$
  select count(*)::int from hushmates.perspectives where journey_id = p_journey and not set_aside
$$;
create or replace function hushmates.answered(p_journey uuid) returns int
language sql stable set search_path = '' as $$
  select count(*)::int from hushmates.perspectives where journey_id = p_journey and not set_aside and not removed
$$;
create or replace function hushmates.live_holds(p_journey uuid) returns int
language sql stable set search_path = '' as $$
  select count(*)::int from hushmates.holds where journey_id = p_journey and status in ('offered', 'caught') and expires_at > hushmates.clock()
$$;

create or replace function hushmates.push_event(p_journey uuid, p_event jsonb) returns void
language sql set search_path = '' as $$
  update hushmates.journeys set events = events || jsonb_build_array(p_event) where id = p_journey
$$;

/** Bring a feeling home: its live holds end; it stops travelling. */
create or replace function hushmates.return_journey(p_journey uuid, p_reason text) returns void
language plpgsql set search_path = '' as $$
declare v_t timestamptz := hushmates.clock();
begin
  update hushmates.journeys set status = 'returned', return_reason = p_reason, returned_at = v_t
  where id = p_journey and status = 'travelling';
  if not found then return; end if;
  perform hushmates.push_event(p_journey, jsonb_build_object('type', 'returned', 'at', hushmates.ms(v_t), 'reason', p_reason));
  update hushmates.holds set status = 'voided', ended_at = v_t
  where journey_id = p_journey and status in ('offered', 'caught') and expires_at > v_t;
end $$;

/**
 * May a Mallow be asked? Opt-in, once per feeling, nothing under review, owner in good standing.
 * While it travels: only after the wait and while nobody has caught it (humans first).
 * Once it is home ("Explore another angle"): whatever came back, the people have had their turn.
 */
create or replace function hushmates.askable(j hushmates.journeys, p_allow boolean default null) returns boolean
language plpgsql stable set search_path = '' as $$
begin
  if not coalesce(p_allow, j.allow_fallback) then return false; end if;
  if not coalesce((hushmates.setting('mallow') ->> 'available')::boolean, true) then return false; end if;
  if exists (select 1 from hushmates.mallow_perspectives where journey_id = j.id) then return false; end if;
  if j.paused or j.return_reason = 'removed' then return false; end if;
  if (select state from hushmates.members where id = j.owner) <> 'active' then return false; end if;
  if j.status = 'returned' then return true; end if;
  return j.status = 'travelling' and hushmates.human_count(j.id) = 0
    and hushmates.clock() - j.released_at >= make_interval(secs => hushmates.lim('fallbackAfterMs')::numeric / 1000);
end $$;

/** Room in today's Mallow allowance (per person and for the whole service)? Charges it if so. */
create or replace function hushmates.charge_mallow(p_member uuid) returns boolean
language plpgsql set search_path = '' as $$
declare v_day date := hushmates.clock()::date; v_global int; v_person int;
begin
  select coalesce(sum(used) filter (where scope = 'global'), 0), coalesce(sum(used) filter (where scope = p_member::text), 0)
    into v_global, v_person
  from hushmates.usage_daily where day = v_day and kind = 'mallow' and scope in ('global', p_member::text);
  if v_global >= hushmates.lim('fallbackGlobalPerDay') or v_person >= hushmates.lim('fallbackPerPersonPerDay') then return false; end if;
  insert into hushmates.usage_daily (day, scope, kind, used) values (v_day, 'global', 'mallow', 1), (v_day, p_member::text, 'mallow', 1)
  on conflict (day, scope, kind) do update set used = hushmates.usage_daily.used + 1;
  return true;
end $$;

/**
 * Everything time does to one travelling feeling: holds whose time is up expire; a feeling whose
 * day is over comes home; after the wait, the Mallow can offer a perspective (and, with the
 * person's consent, the scheduled job prepares it so it's there even if the app is closed).
 */
create or replace function hushmates.settle_journey(p_journey uuid) returns void
language plpgsql set search_path = '' as $$
declare j hushmates.journeys; v_t timestamptz := hushmates.clock();
begin
  perform hushmates.expire_holds(null, p_journey);
  select * into j from hushmates.journeys where id = p_journey;
  if j.id is null or j.status <> 'travelling' then return; end if;
  if j.expires_at <= v_t then perform hushmates.return_journey(j.id, 'expired'); return; end if;
  if j.fallback_offered_at is null and hushmates.askable(j) then
    update hushmates.journeys set fallback_offered_at = v_t where id = j.id;
    perform hushmates.push_event(j.id, jsonb_build_object('type', 'mallow-offer', 'at', hushmates.ms(v_t)));
    if coalesce((hushmates.setting('mallow') ->> 'autoGenerate')::boolean, false) and hushmates.charge_mallow(j.owner) then
      insert into hushmates.mallow_perspectives (journey_id, status, mallow, requested_by, created_at)
      values (j.id, 'pending', j.mallow, 'schedule', v_t) on conflict do nothing;
    end if;
  end if;
end $$;

create or replace function hushmates.settle_member(p_member uuid) returns void
language plpgsql set search_path = '' as $$
declare r record;
begin
  perform hushmates.expire_holds(p_member, null);
  for r in select id from hushmates.journeys where owner = p_member and status = 'travelling' loop
    perform hushmates.settle_journey(r.id);
  end loop;
end $$;

-- ------------------------------------------------------------------- views --
/**
 * What came back. Up to five visible perspectives, humans first. A Mallow's fills a place no person
 * has; once five people have answered it moves to its own optional place (extra), so it never hides
 * or inflates the human count.
 */
create or replace function hushmates.items(j hushmates.journeys) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  v_max int := hushmates.lim('perspectivesPerFeeling');
  v_visible jsonb := '[]'; v_extra jsonb; v_item jsonb; r record; f hushmates.mallow_perspectives;
begin
  for r in select * from hushmates.perspectives p
           where p.journey_id = j.id and not p.set_aside and not p.removed and not p.hidden_for_owner order by p.slot limit v_max loop
    v_visible := v_visible || jsonb_build_array(jsonb_build_object(
      'id', r.id, 'kind', 'human', 'source', 'human', 'label', 'A Hushmate’s perspective', 'text', r.text_enc, 'mallow', r.mallow,
      'slot', r.slot, 'at', hushmates.ms(r.created_at), 'kept', j.choices -> (r.id::text), 'shareable', r.allow_share));
  end loop;
  select * into f from hushmates.mallow_perspectives where journey_id = j.id;
  if f.journey_id is not null and f.status = 'ready' and not f.hidden and f.source in ('ai', 'library') then
    v_item := jsonb_build_object('id', f.id, 'kind', 'mallow', 'source', f.source, 'label', 'A Mallow perspective · Automatically generated',
      'text', f.text_enc, 'mallow', f.mallow, 'at', hushmates.ms(coalesce(f.ready_at, f.created_at)), 'kept', j.choices -> (f.id::text));
    if hushmates.answered(j.id) < v_max and jsonb_array_length(v_visible) < v_max then v_visible := v_visible || jsonb_build_array(v_item);
    else v_extra := v_item; end if;
  end if;
  return jsonb_build_object('visible', v_visible, 'extra', v_extra);
end $$;

create or replace function hushmates.fallback_view(j hushmates.journeys) returns jsonb
language plpgsql stable set search_path = '' as $$
declare f hushmates.mallow_perspectives; v jsonb;
begin
  select * into f from hushmates.mallow_perspectives where journey_id = j.id;
  if f.journey_id is not null then
    v := jsonb_build_object('status', f.status, 'mallow', f.mallow, 'source', f.source, 'reason', f.reason,
      'superseded', f.status = 'ready' and hushmates.answered(j.id) >= hushmates.lim('perspectivesPerFeeling'), 'seen', f.seen);
    if f.support is not null and not f.hidden then v := v || jsonb_build_object('support', f.support); end if;
    return v;
  end if;
  if not j.allow_fallback or not coalesce((hushmates.setting('mallow') ->> 'available')::boolean, true) then return jsonb_build_object('status', 'off'); end if;
  if j.paused or j.return_reason = 'removed' then return jsonb_build_object('status', 'held'); end if;
  if (select state from hushmates.members where id = j.owner) <> 'active' then return jsonb_build_object('status', 'off'); end if;
  if hushmates.askable(j) then return jsonb_build_object('status', 'available', 'mallow', j.mallow); end if;
  if hushmates.human_count(j.id) > 0 then return jsonb_build_object('status', 'not-needed'); end if;
  return jsonb_build_object('status', 'waiting', 'mallow', j.mallow,
    'availableAt', hushmates.ms(j.released_at) + hushmates.lim('fallbackAfterMs'));
end $$;

/** One journey as its author sees it: nobody else's identity, words sealed until it comes home. */
create or replace function hushmates.journey_view(p_journey uuid) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  j hushmates.journeys; v_items jsonb; v_home boolean; v_shown jsonb; v_petals jsonb; v_count int; v_all int;
  v_owner_active boolean; v_max int := hushmates.lim('perspectivesPerFeeling');
begin
  select * into j from hushmates.journeys where id = p_journey;
  v_items := hushmates.items(j);
  v_home := j.status <> 'travelling';
  select x into v_shown from jsonb_array_elements(v_items -> 'visible') x where x ->> 'kind' = 'mallow' limit 1;
  -- what the author can still be shown: a perspective they hid leaves no count or petal behind
  select count(*)::int, coalesce(jsonb_agg(jsonb_build_object('slot', p.slot, 'mallow', p.mallow) order by p.slot), '[]')
    into v_count, v_petals
  from hushmates.perspectives p where p.journey_id = j.id and not p.set_aside and not p.removed and not p.hidden_for_owner;
  v_all := hushmates.human_count(j.id);
  v_owner_active := (select state from hushmates.members where id = j.owner) = 'active';
  return jsonb_build_object(
    'id', j.id, 'status', j.status, 'text', j.text_enc, 'label', j.label, 'mallow', j.mallow, 'allowFallback', j.allow_fallback,
    'createdAt', hushmates.ms(j.created_at), 'expiresAt', hushmates.ms(j.expires_at), 'returnedAt', hushmates.ms(j.returned_at),
    'returnReason', j.return_reason, 'paused', j.paused, 'humanCount', v_count, 'of', v_max,
    'petals', v_petals,
    'mallowPetal', case when v_shown is null then null else jsonb_build_object('mallow', v_shown ->> 'mallow', 'source', v_shown ->> 'source') end,
    'events', j.events,
    'fallback', hushmates.fallback_view(j),
    'collection', case when v_home then v_items -> 'visible'
                       else coalesce((select jsonb_agg(x) from jsonb_array_elements(v_items -> 'visible') x where x ->> 'kind' = 'mallow'), '[]') end,
    'mallowExtra', v_items -> 'extra',
    'seenReturn', j.seen_return, 'saved', j.saved, 'resends', j.resends,
    'canResend', j.status = 'returned' and j.consent_at is not null and v_owner_active and v_all = 0
                 and not j.paused and j.return_reason is distinct from 'removed' and j.resends < hushmates.lim('maxResends'),
    'canExplore', j.status = 'returned' and hushmates.askable(j, true));
end $$;

create or replace function hushmates.offer_view(p_hold uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object('holdId', h.id, 'state', h.status, 'expiresAt', hushmates.ms(h.expires_at),
    'feeling', jsonb_build_object('text', j.text_enc, 'label', j.label, 'mallow', j.mallow,
      'perspectivesSoFar', hushmates.human_count(j.id), 'of', hushmates.lim('perspectivesPerFeeling')))
  from hushmates.holds h join hushmates.journeys j on j.id = h.journey_id where h.id = p_hold
$$;

create or replace function hushmates.me_view(p_member uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'accountState', m.state, 'isModerator', m.role = 'moderator', 'adultConfirmed', m.adult_confirmed_at is not null,
    'profile', jsonb_build_object('pseudonym', m.pseudonym, 'mallow', m.mallow, 'catching', m.catching, 'notifyReturn', m.notify_return, 'onboarded', m.onboarded),
    'limits', jsonb_build_object('perspectives', hushmates.lim('perspectivesPerFeeling'), 'perspectivesPerFeeling', hushmates.lim('perspectivesPerFeeling'),
      'maxActiveJourneys', hushmates.lim('maxActiveJourneys'), 'feelingMinChars', hushmates.lim('feelingMinChars'), 'feelingMaxChars', hushmates.lim('feelingMaxChars'),
      'reframeMinChars', hushmates.lim('reframeMinChars'), 'reframeMaxChars', hushmates.lim('reframeMaxChars')),
    'travelling', (select count(*) from hushmates.journeys where owner = m.id and status = 'travelling'),
    'homeUnseen', (select count(*) from hushmates.journeys where owner = m.id and status = 'returned' and not seen_return),
    'activeHold', (select h.id from hushmates.holds h where h.member_id = m.id and h.status in ('offered', 'caught') and h.expires_at > hushmates.clock() limit 1),
    'now', hushmates.ms(hushmates.clock()))
  from hushmates.members m where m.id = p_member
$$;

-- ------------------------------------------------------------ the methods --
create or replace function hushmates.m_me(m hushmates.members) returns jsonb
language plpgsql set search_path = '' as $$
begin
  perform hushmates.actor(m, array['active', 'restricted', 'suspended']);
  perform hushmates.settle_member(m.id);
  return hushmates.me_view(m.id);
end $$;

create or replace function hushmates.m_save_preferences(m hushmates.members, a jsonb) returns jsonb
language plpgsql set search_path = '' as $$
begin
  perform hushmates.actor(m, array['active', 'restricted', 'suspended']);
  if a is null or jsonb_typeof(a) <> 'object' then perform hushmates.fail('invalid'); end if;
  if a ? 'catching' then
    if (a ->> 'catching')::boolean is true and m.state <> 'active' then perform hushmates.fail('account-inactive'); end if;
    update hushmates.members set catching = coalesce((a ->> 'catching')::boolean, false) where id = m.id;
    if not coalesce((a ->> 'catching')::boolean, false) then
      update hushmates.holds set status = 'released', ended_at = hushmates.clock()
      where member_id = m.id and status in ('offered', 'caught') and expires_at > hushmates.clock();
    end if;
  end if;
  if a ? 'notifyReturn' then update hushmates.members set notify_return = coalesce((a ->> 'notifyReturn')::boolean, false) where id = m.id; end if;
  if a ? 'mallow' then
    if a ->> 'mallow' is null or a ->> 'mallow' not in ('noomi', 'blubi', 'pipzi', 'boppo', 'zuzu', 'loomi', 'glitzi') then perform hushmates.fail('invalid'); end if;
    update hushmates.members set mallow = a ->> 'mallow' where id = m.id;
  end if;
  if a ? 'onboarded' then update hushmates.members set onboarded = coalesce((a ->> 'onboarded')::boolean, false) where id = m.id; end if;
  perform hushmates.settle_member(m.id);
  return hushmates.me_view(m.id);
end $$;

/** Release a feeling. The gateway has already screened the words and encrypted them. */
create or replace function hushmates.m_submit_feeling(m hushmates.members, a jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare d hushmates.journeys; v_t timestamptz := hushmates.clock(); v_id uuid; v_allow boolean := coalesce((a ->> 'allowFallback')::boolean, false);
begin
  perform hushmates.actor(m);
  if not hushmates.client_id_ok(a ->> 'clientId') then perform hushmates.fail('invalid'); end if;
  if (a ->> 'consent') is distinct from 'true' then perform hushmates.fail('consent-required'); end if;
  select * into d from hushmates.journeys where owner = m.id and client_id = a ->> 'clientId';
  if d.id is not null then
    -- a replay must be the same words; a reused id with different words is a client bug, not a release
    if d.status = 'deleted' or d.text_mac is distinct from a ->> 'textMac' or d.allow_fallback <> v_allow then
      perform hushmates.fail('invalid', 'Something changed while this was sending. Please send it again.');
    end if;
    return jsonb_build_object('status', 'released', 'journey', hushmates.journey_view(d.id), 'duplicate', true);
  end if;
  if m.state <> 'active' then perform hushmates.fail('account-inactive'); end if;
  perform hushmates.settle_member(m.id);
  if (select count(*) from hushmates.journeys where owner = m.id and status = 'travelling') >= hushmates.lim('maxActiveJourneys') then
    perform hushmates.fail('too-many-active');
  end if;
  perform hushmates.rate(m.id::text, jsonb_build_array(jsonb_build_array('submit-h', hushmates.lim('submissionsPerHour'), 3600000),
                                                       jsonb_build_array('submit-d', hushmates.lim('submissionsPerDay'), 86400000)));
  insert into hushmates.journeys (owner, client_id, text_enc, text_mac, label, mallow, allow_fallback, consent_at, fallback_consent_at,
    status, created_at, released_at, expires_at, last_progress_at, events)
  values (m.id, a ->> 'clientId', a ->> 'textEnc', a ->> 'textMac', nullif(a ->> 'label', ''),
    case when a ->> 'mallow' in ('noomi', 'blubi', 'pipzi', 'boppo', 'zuzu', 'loomi', 'glitzi') then a ->> 'mallow' else m.mallow end,
    v_allow, v_t, case when v_allow then v_t end, 'travelling', v_t, v_t,
    v_t + make_interval(secs => hushmates.lim('journeyTtlMs')::numeric / 1000), v_t,
    jsonb_build_array(jsonb_build_object('type', 'released', 'at', hushmates.ms(v_t))))
  returning id into v_id;
  return jsonb_build_object('status', 'released', 'journey', hushmates.journey_view(v_id), 'duplicate', false);
end $$;

create or replace function hushmates.mine(m hushmates.members, p_journey text) returns hushmates.journeys
language plpgsql set search_path = '' as $$
declare j hushmates.journeys; v_id uuid := hushmates.as_uuid(p_journey);
begin
  perform hushmates.actor(m, array['active', 'restricted', 'suspended']);
  perform hushmates.settle_member(m.id);
  select * into j from hushmates.journeys where id = v_id for update;
  -- the same answer whether it doesn't exist or isn't yours
  if j.id is null or j.owner <> m.id or j.status = 'deleted' then perform hushmates.fail('not-found'); end if;
  return j;
end $$;

create or replace function hushmates.m_list_journeys(m hushmates.members) returns jsonb
language plpgsql set search_path = '' as $$
begin
  perform hushmates.actor(m, array['active', 'restricted', 'suspended']);
  perform hushmates.settle_member(m.id);
  return jsonb_build_object('journeys', coalesce((select jsonb_agg(hushmates.journey_view(j.id) order by j.created_at desc)
    from hushmates.journeys j where j.owner = m.id and j.status <> 'deleted'), '[]'), 'now', hushmates.ms(hushmates.clock()));
end $$;

create or replace function hushmates.m_withdraw_feeling(m hushmates.members, a jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare j hushmates.journeys := hushmates.mine(m, a ->> 'journeyId');
begin
  if j.status <> 'travelling' then perform hushmates.fail('not-available'); end if;
  perform hushmates.return_journey(j.id, 'withdrawn');
  return hushmates.journey_view(j.id);
end $$;

create or replace function hushmates.all_item_ids(p_journey uuid) returns text[]
language sql stable set search_path = '' as $$
  select coalesce(array_agg(x ->> 'id'), '{}') from (
    select jsonb_array_elements(i -> 'visible') x from (select hushmates.items(j) i from hushmates.journeys j where j.id = p_journey) s
    union all
    select i -> 'extra' from (select hushmates.items(j) i from hushmates.journeys j where j.id = p_journey) s where i -> 'extra' is not null and jsonb_typeof(i -> 'extra') = 'object'
  ) t
$$;

create or replace function hushmates.m_choose(m hushmates.members, a jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare j hushmates.journeys := hushmates.mine(m, a ->> 'journeyId');
begin
  if not ((a ->> 'perspectiveId') = any (hushmates.all_item_ids(j.id))) then perform hushmates.fail('not-found'); end if;
  if not (a ? 'keep') or jsonb_typeof(a -> 'keep') not in ('boolean', 'null') then perform hushmates.fail('invalid'); end if;
  update hushmates.journeys set choices = choices || jsonb_build_object(a ->> 'perspectiveId', a -> 'keep') where id = j.id;
  return hushmates.journey_view(j.id);
end $$;

create or replace function hushmates.m_save_journey(m hushmates.members, a jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare j hushmates.journeys := hushmates.mine(m, a ->> 'journeyId');
begin
  if j.status = 'travelling' then perform hushmates.fail('not-available'); end if;
  update hushmates.journeys set saved = case when a ? 'saved' then coalesce((a ->> 'saved')::boolean, false) else true end where id = j.id;
  return hushmates.journey_view(j.id);
end $$;

create or replace function hushmates.wipe_fallback(p_journey uuid) returns void
language sql set search_path = '' as $$
  update hushmates.mallow_perspectives
  set text_enc = '', hidden = true, support = null,
      status = case when status = 'pending' then 'failed' else status end,
      reason = case when status = 'pending' then 'withdrawn' else reason end   -- a late answer is dropped
  where journey_id = p_journey
$$;

/** Let the feeling go: the words are cleared; perspectives you kept stay with you. */
create or replace function hushmates.m_release_journey(m hushmates.members, a jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare j hushmates.journeys := hushmates.mine(m, a ->> 'journeyId'); v_ids text[]; f hushmates.mallow_perspectives;
begin
  if j.status = 'travelling' then perform hushmates.return_journey(j.id, 'withdrawn'); end if;
  v_ids := hushmates.all_item_ids(j.id);
  select * into j from hushmates.journeys where id = j.id;
  update hushmates.journeys set status = 'released', text_enc = '', released_at = hushmates.clock() where id = j.id;
  update hushmates.perspectives set hidden_for_owner = true
  where journey_id = j.id and id::text = any (v_ids) and (j.choices -> (id::text)) is distinct from 'true'::jsonb;
  select * into f from hushmates.mallow_perspectives where journey_id = j.id;
  if f.journey_id is not null and (j.choices -> (f.id::text)) is distinct from 'true'::jsonb then perform hushmates.wipe_fallback(j.id); end if;
  return hushmates.journey_view(j.id);
end $$;

create or replace function hushmates.m_delete_journey(m hushmates.members, a jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare j hushmates.journeys := hushmates.mine(m, a ->> 'journeyId');
begin
  if (a ->> 'confirm') is distinct from 'DELETE' then perform hushmates.fail('invalid'); end if;
  if j.status = 'travelling' then perform hushmates.return_journey(j.id, 'withdrawn'); end if;
  update hushmates.perspectives set text_enc = '', text_mac = null, removed = true where journey_id = j.id and not set_aside;
  perform hushmates.wipe_fallback(j.id);
  update hushmates.journeys set text_enc = '', text_mac = null, status = 'deleted', events = '[]', choices = '{}' where id = j.id;
  return jsonb_build_object('deleted', true);
end $$;

create or replace function hushmates.m_mark_return_seen(m hushmates.members, a jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare j hushmates.journeys := hushmates.mine(m, a ->> 'journeyId');
begin
  if j.status = 'returned' and not j.seen_return then update hushmates.journeys set seen_return = true where id = j.id; end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function hushmates.m_mark_mallow_seen(m hushmates.members, a jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare j hushmates.journeys := hushmates.mine(m, a ->> 'journeyId');
begin
  update hushmates.mallow_perspectives set seen = true where journey_id = j.id and status = 'ready';
  return hushmates.journey_view(j.id);
end $$;

-- ---------------------------------------------------------- resend --
/** "Send it out again", step 1: may it? (the gateway then re-screens the words, then step 2) */
create or replace function hushmates.m_resend_check(m hushmates.members, a jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare j hushmates.journeys := hushmates.mine(m, a ->> 'journeyId');
begin
  if not hushmates.client_id_ok(a ->> 'clientId') then perform hushmates.fail('invalid'); end if;
  -- a replay of a resend already applied is answered as a duplicate, whatever happened since
  if (a ->> 'clientId') = any (j.resend_client_ids) then
    return jsonb_build_object('status', 'released', 'journey', hushmates.journey_view(j.id), 'duplicate', true);
  end if;
  if j.status <> 'returned' or j.paused or j.return_reason = 'removed' then perform hushmates.fail('not-available'); end if;
  if hushmates.human_count(j.id) > 0 then perform hushmates.fail('not-available', 'Only a feeling nobody caught can be sent out again.'); end if;
  if j.resends >= hushmates.lim('maxResends') then perform hushmates.fail('resend-limit'); end if;
  if j.consent_at is null then perform hushmates.fail('consent-required'); end if;
  return jsonb_build_object('check', jsonb_build_object('text', j.text_enc));
end $$;

create or replace function hushmates.m_resend_commit(m hushmates.members, a jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare j hushmates.journeys; v_check jsonb; v_t timestamptz := hushmates.clock();
begin
  v_check := hushmates.m_resend_check(m, a);
  if v_check ? 'duplicate' then return v_check; end if;
  j := hushmates.mine(m, a ->> 'journeyId');
  if m.state <> 'active' then perform hushmates.fail('account-inactive'); end if;
  if (select count(*) from hushmates.journeys where owner = m.id and status = 'travelling') >= hushmates.lim('maxActiveJourneys') then
    perform hushmates.fail('too-many-active');
  end if;
  perform hushmates.rate(m.id::text, jsonb_build_array(jsonb_build_array('submit-h', hushmates.lim('submissionsPerHour'), 3600000),
                                                       jsonb_build_array('submit-d', hushmates.lim('submissionsPerDay'), 86400000)));
  update hushmates.journeys set
    status = 'travelling', released_at = v_t, expires_at = v_t + make_interval(secs => hushmates.lim('journeyTtlMs')::numeric / 1000),
    last_progress_at = v_t, returned_at = null, return_reason = null, seen_return = false, resends = resends + 1,
    resend_client_ids = resend_client_ids || (a ->> 'clientId'),
    fallback_offered_at = case when exists (select 1 from hushmates.mallow_perspectives where journey_id = j.id) then fallback_offered_at end,
    -- the Mallow choice can be given or taken back for the new trip; left out, the earlier choice stands
    allow_fallback = case when (a -> 'allowFallback') = 'true'::jsonb then true when (a -> 'allowFallback') = 'false'::jsonb then false else allow_fallback end,
    fallback_consent_at = case when (a -> 'allowFallback') = 'true'::jsonb and not allow_fallback then v_t
                               when (a -> 'allowFallback') = 'false'::jsonb then null else fallback_consent_at end
  where id = j.id;
  perform hushmates.push_event(j.id, jsonb_build_object('type', 'resent', 'at', hushmates.ms(v_t)));
  return jsonb_build_object('status', 'released', 'journey', hushmates.journey_view(j.id), 'duplicate', false);
end $$;

-- ----------------------------------------------------------- catching --
create or replace function hushmates.eligible(j hushmates.journeys, p_member uuid) returns boolean
language sql stable set search_path = '' as $$
  select j.status = 'travelling' and not j.paused and j.owner <> p_member and j.consent_at is not null
    and j.expires_at > hushmates.clock()
    and not exists (select 1 from hushmates.exposures e where e.journey_id = j.id and e.member_id = p_member)
    and not hushmates.blocked(j.owner, p_member)
    and (select state from hushmates.members where id = j.owner) = 'active'
    and hushmates.human_count(j.id) + hushmates.live_holds(j.id) < hushmates.lim('perspectivesPerFeeling')
$$;

/**
 * Find a feeling for this person: reserve it atomically (an expiring hold), so nobody else can
 * take the same place. Fair: at random among the few longest-waiting eligible feelings.
 */
create or replace function hushmates.m_find_feeling(m hushmates.members) returns jsonb
language plpgsql set search_path = '' as $$
declare v_current uuid; v_ids uuid[]; v_id uuid; j hushmates.journeys; v_hold uuid; v_t timestamptz := hushmates.clock();
  v_busy uuid[] := '{}'; v_pass int;
begin
  perform hushmates.actor(m);
  if m.state <> 'active' then perform hushmates.fail('account-inactive'); end if;
  if not m.catching then perform hushmates.fail('not-catching'); end if;
  perform hushmates.settle_member(m.id);
  select id into v_current from hushmates.holds where member_id = m.id and status in ('offered', 'caught') and expires_at > v_t limit 1;
  if v_current is not null then return jsonb_build_object('offer', hushmates.offer_view(v_current)); end if;
  perform hushmates.rate(m.id::text, jsonb_build_array(jsonb_build_array('find', hushmates.lim('findsPerHour'), 3600000)));
  perform hushmates.bump('find');
  select array_agg(id order by random()) into v_ids from (
    select x.id from hushmates.journeys x where x.status = 'travelling' and hushmates.eligible(x, m.id)
    order by x.last_progress_at, x.created_at limit hushmates.lim('fairnessPool')) c;
  -- first pass: lock a candidate, skipping any that someone else is taking at this very moment;
  -- second pass: those busy ones, waiting briefly for them, so people looking at the same instant
  -- aren't told there's nothing while places are free (bounded: a wait that times out or would
  -- deadlock just moves on)
  for v_pass in 1..2 loop
    if v_pass = 2 then
      exit when cardinality(v_busy) = 0;
      v_ids := v_busy;
      perform set_config('lock_timeout', '2000', true);
    end if;
    foreach v_id in array coalesce(v_ids, '{}') loop
      j := null;
      if v_pass = 1 then
        select * into j from hushmates.journeys where id = v_id for update skip locked;
        if j.id is null then v_busy := v_busy || v_id; continue; end if;
      else
        begin
          select * into j from hushmates.journeys where id = v_id for update;
        exception when lock_not_available or deadlock_detected then continue;
        end;
      end if;
      continue when j.id is null;
      perform hushmates.expire_holds(null, j.id);
      continue when not hushmates.eligible(j, m.id);
      insert into hushmates.holds (journey_id, member_id, status, created_at, expires_at)
      values (j.id, m.id, 'offered', v_t, v_t + make_interval(secs => hushmates.lim('offerHoldMs')::numeric / 1000)) returning id into v_hold;
      insert into hushmates.exposures (journey_id, member_id, at) values (j.id, m.id, v_t) on conflict do nothing;
      return jsonb_build_object('offer', hushmates.offer_view(v_hold));
    end loop;
  end loop;
  return jsonb_build_object('offer', null);
end $$;

/** The person's hold, checked: ended (and an error answer) if it can't go on. → { hold, journey } or { error } */
create or replace function hushmates.my_hold(m hushmates.members, p_hold text, p_live boolean default true) returns jsonb
language plpgsql set search_path = '' as $$
declare h hushmates.holds; j hushmates.journeys; v_id uuid := hushmates.as_uuid(p_hold);
begin
  perform hushmates.actor(m);
  perform hushmates.expire_holds(m.id, null);
  select * into h from hushmates.holds where id = v_id;
  if h.id is null or h.member_id <> m.id then perform hushmates.fail('not-found'); end if;
  if not p_live then return jsonb_build_object('hold', h.id, 'journey', h.journey_id); end if;
  if m.state <> 'active' then perform hushmates.fail('account-inactive'); end if;
  select * into j from hushmates.journeys where id = h.journey_id for update;
  perform hushmates.settle_journey(j.id);
  select * into h from hushmates.holds where id = v_id for update;
  if not hushmates.hold_live(h) then
    return hushmates.err(case when h.status = 'expired' then 'hold-expired' else 'not-available' end);
  end if;
  select * into j from hushmates.journeys where id = h.journey_id;
  if j.status <> 'travelling' or j.paused or hushmates.blocked_by(j.owner, m.id) then
    perform hushmates.end_hold(h.id, 'voided');
    return hushmates.err('not-available');
  end if;
  return jsonb_build_object('hold', h.id, 'journey', j.id);
end $$;

create or replace function hushmates.m_catch(m hushmates.members, a jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare r jsonb := hushmates.my_hold(m, a ->> 'holdId'); v_t timestamptz := hushmates.clock();
begin
  if r ? 'error' then return r; end if;
  update hushmates.holds set status = 'caught', caught_at = v_t, expires_at = v_t + make_interval(secs => hushmates.lim('catchHoldMs')::numeric / 1000)
  where id = (r ->> 'hold')::uuid and status = 'offered';
  return jsonb_build_object('offer', hushmates.offer_view((r ->> 'hold')::uuid));
end $$;

create or replace function hushmates.m_float_past(m hushmates.members, a jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare r jsonb := hushmates.my_hold(m, a ->> 'holdId', false); h hushmates.holds;
begin
  select * into h from hushmates.holds where id = (r ->> 'hold')::uuid;
  if hushmates.hold_live(h) then perform hushmates.end_hold(h.id, 'passed'); end if;
  return jsonb_build_object('ok', true);           -- nobody is told; it stays out of this person's sky
end $$;

create or replace function hushmates.after_reframe(p_perspective uuid, p_duplicate boolean) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'slot', r.slot,
    -- a set-aside perspective answers exactly as a counted one would, so its writer can't tell
    'homeward', j.status <> 'travelling' or (r.set_aside and r.slot >= hushmates.lim('perspectivesPerFeeling')),
    'earlier', coalesce((select jsonb_agg(jsonb_build_object('slot', x.slot, 'text', x.text_enc) order by x.slot)
                         from hushmates.perspectives x where x.journey_id = r.journey_id and not x.set_aside and x.slot < r.slot and not x.removed), '[]'),
    'duplicate', p_duplicate,
    'perspective', jsonb_build_object('id', r.id, 'text', r.text_enc))
  from hushmates.perspectives r join hushmates.journeys j on j.id = r.journey_id where r.id = p_perspective
$$;

/** Offer a perspective, step 1 (checks; the gateway then screens the words against the earlier ones). */
create or replace function hushmates.m_reframe_prepare(m hushmates.members, a jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare d hushmates.perspectives; held hushmates.holds; r jsonb; h hushmates.holds; j hushmates.journeys;
begin
  perform hushmates.actor(m);
  if not hushmates.client_id_ok(a ->> 'clientId') then perform hushmates.fail('invalid'); end if;
  select * into d from hushmates.perspectives where author = m.id and client_id = a ->> 'clientId';
  if d.id is not null then
    select * into held from hushmates.holds where id = hushmates.as_uuid(a ->> 'holdId');
    if held.id is not null and held.member_id = m.id and held.journey_id <> d.journey_id then perform hushmates.fail('invalid', 'Please try again.'); end if;
    return jsonb_build_object('duplicate', hushmates.after_reframe(d.id, true));
  end if;
  r := hushmates.my_hold(m, a ->> 'holdId');
  if r ? 'error' then return r; end if;
  select * into h from hushmates.holds where id = (r ->> 'hold')::uuid;
  select * into j from hushmates.journeys where id = h.journey_id;
  if h.status <> 'caught' then perform hushmates.fail('invalid', 'Catch the feeling first.'); end if;
  if j.owner = m.id then perform hushmates.fail('forbidden'); end if;
  if exists (select 1 from hushmates.perspectives where journey_id = j.id and author = m.id and not set_aside) then perform hushmates.fail('already-contributed'); end if;
  if hushmates.human_count(j.id) >= hushmates.lim('perspectivesPerFeeling') then
    perform hushmates.end_hold(h.id, 'voided');
    return hushmates.err('not-available');
  end if;
  return jsonb_build_object('prepare', jsonb_build_object(
    'earlier', coalesce((select jsonb_agg(x.text_enc order by x.slot) from hushmates.perspectives x where x.journey_id = j.id and not x.set_aside), '[]')));
end $$;

/** The writer may not be safe: their words are never stored or passed on, and the feeling floats on. */
create or replace function hushmates.m_reframe_support(m hushmates.members, a jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare h hushmates.holds;
begin
  perform hushmates.actor(m);
  select * into h from hushmates.holds where id = hushmates.as_uuid(a ->> 'holdId') and member_id = m.id;
  if h.id is not null and hushmates.hold_live(h) then perform hushmates.end_hold(h.id, 'passed'); end if;
  return jsonb_build_object('ok', true);
end $$;

/** Offer a perspective, step 2: everything is checked again under the feeling's lock, then written. */
create or replace function hushmates.m_reframe_commit(m hushmates.members, a jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare p jsonb; h hushmates.holds; j hushmates.journeys; v_slot int; v_id uuid; v_t timestamptz := hushmates.clock();
  v_share boolean := coalesce((a ->> 'allowShare')::boolean, false); v_aside boolean;
begin
  p := hushmates.m_reframe_prepare(m, a);
  if p ? 'error' or p ? 'duplicate' then return p; end if;
  select * into h from hushmates.holds where id = hushmates.as_uuid(a ->> 'holdId');
  select * into j from hushmates.journeys where id = h.journey_id for update;
  perform hushmates.rate(m.id::text, jsonb_build_array(jsonb_build_array('reframe', hushmates.lim('reframesPerHour'), 3600000)));
  v_slot := hushmates.human_count(j.id) + 1;
  -- If this person has blocked the author (after catching), refusing would tell them whose feeling it is, and
  -- counting it would tell the author someone blocked them. So it is set aside: the writer sees the usual thanks
  -- and keeps their words in their own list; the feeling never learns of it, and the place stays open.
  v_aside := hushmates.blocked_by(m.id, j.owner);
  begin
    insert into hushmates.perspectives (journey_id, author, slot, text_enc, text_mac, client_id, created_at, mallow,
      hidden_for_owner, set_aside, allow_share, share_consent_at)
    values (j.id, m.id, v_slot, a ->> 'textEnc', a ->> 'textMac', a ->> 'clientId', v_t, m.mallow,
      v_aside, v_aside, v_share, case when v_share then v_t end)
    returning id into v_id;
  exception when unique_violation then
    -- the same request twice at once: the first one won; answer as a duplicate
    select id into v_id from hushmates.perspectives where author = m.id and client_id = a ->> 'clientId';
    if v_id is not null then return jsonb_build_object('duplicate', hushmates.after_reframe(v_id, true)); end if;
    perform hushmates.fail('already-contributed');
  end;
  perform hushmates.end_hold(h.id, 'used');
  if not v_aside then
    update hushmates.journeys set last_progress_at = v_t where id = j.id;
    perform hushmates.push_event(j.id, jsonb_build_object('type', 'perspective', 'at', hushmates.ms(v_t), 'slot', v_slot));
    if v_slot >= hushmates.lim('perspectivesPerFeeling') then perform hushmates.return_journey(j.id, 'complete'); end if;
  end if;
  return hushmates.after_reframe(v_id, false);
end $$;

create or replace function hushmates.m_my_gifts(m hushmates.members) returns jsonb
language plpgsql set search_path = '' as $$
begin
  perform hushmates.actor(m, array['active', 'restricted', 'suspended']);
  return jsonb_build_object('gifts', coalesce((select jsonb_agg(jsonb_build_object(
      'id', r.id, 'text', r.text_enc, 'at', hushmates.ms(r.created_at), 'slot', r.slot, 'allowShare', r.allow_share,
      'journeyHome', j.status <> 'travelling') order by r.created_at desc)
    from hushmates.perspectives r join hushmates.journeys j on j.id = r.journey_id where r.author = m.id and not r.removed), '[]'));
end $$;

/** A writer can take back a perspective: its words are removed for good; the place stays used. */
create or replace function hushmates.m_withdraw_perspective(m hushmates.members, a jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare r hushmates.perspectives;
begin
  perform hushmates.actor(m, array['active', 'restricted', 'suspended']);
  select * into r from hushmates.perspectives where id = hushmates.as_uuid(a ->> 'perspectiveId') for update;
  if r.id is null or r.author <> m.id or r.removed then perform hushmates.fail('not-found'); end if;
  update hushmates.perspectives set text_enc = '', text_mac = null, removed = true, withdrawn_at = hushmates.clock(), allow_share = false, share_consent_at = null
  where id = r.id;
  if not r.set_aside then   -- a set-aside one was never part of the journey
    perform hushmates.push_event(r.journey_id, jsonb_build_object('type', 'perspective-withdrawn', 'at', hushmates.ms(hushmates.clock())));
  end if;
  perform hushmates.audit(m.id::text, 'withdraw-perspective', jsonb_build_object('perspectiveId', r.id));
  return hushmates.m_my_gifts(m);
end $$;

create or replace function hushmates.m_set_gift_sharing(m hushmates.members, a jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare r hushmates.perspectives;
begin
  perform hushmates.actor(m, array['active', 'restricted', 'suspended']);
  select * into r from hushmates.perspectives where id = hushmates.as_uuid(a ->> 'perspectiveId') for update;
  if r.id is null or r.author <> m.id or r.removed then perform hushmates.fail('not-found'); end if;
  if jsonb_typeof(a -> 'allowShare') is distinct from 'boolean' then perform hushmates.fail('invalid'); end if;
  update hushmates.perspectives set allow_share = (a ->> 'allowShare')::boolean,
    share_consent_at = case when (a ->> 'allowShare')::boolean then hushmates.clock() end where id = r.id;
  return hushmates.m_my_gifts(m);
end $$;

-- ------------------------------------------------------- the Mallow (requests) --
/**
 * The optional Mallow perspective, step 1: reserve the one generation (or answer with what exists).
 * The gateway then asks the provider and completes it (hushmates.mallow_complete).
 */
create or replace function hushmates.m_ask_mallow(m hushmates.members, a jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare j hushmates.journeys := hushmates.mine(m, a ->> 'journeyId'); v_opt boolean; v_t timestamptz := hushmates.clock();
begin
  if exists (select 1 from hushmates.mallow_perspectives where journey_id = j.id) then return hushmates.journey_view(j.id); end if;
  -- "Explore another angle": the person can opt in now; consent is recorded only once the request is accepted
  v_opt := not j.allow_fallback and (a -> 'consent') = 'true'::jsonb;
  if not j.allow_fallback and not v_opt then perform hushmates.fail('fallback-off'); end if;
  if m.state <> 'active' then perform hushmates.fail('account-inactive'); end if;
  if j.paused or j.return_reason = 'removed' then perform hushmates.fail('fallback-held'); end if;
  if not hushmates.askable(j, case when v_opt then true end) then perform hushmates.fail('fallback-not-yet'); end if;
  if not hushmates.charge_mallow(m.id) then perform hushmates.fail('fallback-budget'); end if;
  if v_opt then update hushmates.journeys set allow_fallback = true, fallback_consent_at = v_t where id = j.id; end if;
  insert into hushmates.mallow_perspectives (journey_id, status, mallow, requested_by, created_at, claimed_at)
  values (j.id, 'pending', j.mallow, m.id::text, v_t, v_t);
  return jsonb_build_object('reserved', jsonb_build_object('journeyId', j.id, 'text', j.text_enc, 'label', j.label, 'mallow', j.mallow, 'memberId', m.id));
end $$;

/** Pause a feeling, end anyone's hold on it, and put it in front of a person on the safety team. */
create or replace function hushmates.hold_for_safety(p_journey uuid, p_details_enc text) returns void
language plpgsql set search_path = '' as $$
declare j hushmates.journeys; v_id uuid;
begin
  select * into j from hushmates.journeys where id = p_journey;
  update hushmates.journeys set paused = true where id = p_journey;
  update hushmates.holds set status = 'voided', ended_at = hushmates.clock()
  where journey_id = p_journey and status in ('offered', 'caught') and expires_at > hushmates.clock();
  insert into hushmates.reports (at, by_member, kind, journey_id, reason, details_enc, subject, urgent, evidence)
  values (hushmates.clock(), null, 'feeling', p_journey, 'safety', coalesce(p_details_enc, ''), j.owner, true, jsonb_build_object('feeling', j.text_enc))
  returning id into v_id;
  perform hushmates.audit('system', 'report.created', jsonb_build_object('report', v_id, 'kind', 'feeling', 'reason', 'safety'));
end $$;

/** The provider answered (or didn't): record it, unless the person let go of it meanwhile. */
create or replace function hushmates.mallow_complete(p_journey uuid, p_result jsonb) returns void
language plpgsql set search_path = '' as $$
declare f hushmates.mallow_perspectives; j hushmates.journeys; v_t timestamptz := hushmates.clock();
begin
  select * into f from hushmates.mallow_perspectives where journey_id = p_journey for update;
  select * into j from hushmates.journeys where id = p_journey;
  if f.journey_id is null then return; end if;
  -- the person may have let go of it, deleted it, or left while we waited: a late answer is dropped
  if f.hidden or f.status <> 'pending' or j.status in ('deleted', 'released') then
    update hushmates.mallow_perspectives set status = 'failed', reason = coalesce(reason, 'withdrawn'), text_enc = '' where journey_id = p_journey and status = 'pending';
    return;
  end if;
  if p_result ->> 'status' = 'support' then
    -- the provider's safety check saw danger the rules missed: stop the journey, bring support, ask a person to look
    update hushmates.mallow_perspectives set status = 'failed', reason = 'safety', support = p_result -> 'support' where journey_id = p_journey;
    perform hushmates.hold_for_safety(p_journey, p_result ->> 'detailsEnc');
    return;
  end if;
  if p_result ->> 'status' = 'ok' and p_result ->> 'source' in ('ai', 'library') and coalesce(p_result ->> 'text', '') <> '' then
    update hushmates.mallow_perspectives set status = 'ready', text_enc = p_result ->> 'text', source = p_result ->> 'source',
      model = p_result ->> 'model', angle_id = p_result ->> 'angleId', voice = p_result ->> 'voice', ready_at = v_t
    where journey_id = p_journey;
    perform hushmates.push_event(p_journey, jsonb_build_object('type', 'mallow-perspective', 'at', hushmates.ms(v_t)));
    perform hushmates.bump('mallow-' || (p_result ->> 'source'));
  else
    update hushmates.mallow_perspectives set status = 'failed',
      reason = case when p_result ->> 'reason' in ('timeout', 'safety', 'unconfigured') then p_result ->> 'reason' else 'unavailable' end
    where journey_id = p_journey;
    perform hushmates.bump('mallow-failed');
  end if;
end $$;

-- -------------------------------------------------------- reports, blocks --
create or replace function hushmates.expectation(p_urgent boolean) returns text
language sql immutable set search_path = '' as $$
  select case when p_urgent
    then 'Thank you. This is marked as a priority for our human safety team (we aim to look within 24 hours during the pilot). If anyone is in immediate danger, contact local emergency services now.'
    else 'Thank you. A person on our safety team will review this. During the pilot we aim to review reports within 48 hours. Nobody is told who reported.' end
$$;

create or replace function hushmates.report(m hushmates.members, p_kind text, p_journey uuid, p_perspective uuid, a jsonb) returns hushmates.reports
language plpgsql set search_path = '' as $$
declare j hushmates.journeys; r hushmates.perspectives; f hushmates.mallow_perspectives; rep hushmates.reports;
begin
  if coalesce(a ->> 'reason', '') not in ('unkind', 'harassment', 'identifying', 'sexual', 'scam', 'safety', 'other') then
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
  perform hushmates.audit(m.id::text, 'report.created', jsonb_build_object('report', rep.id, 'kind', p_kind, 'reason', a ->> 'reason'));
  return rep;
end $$;

/** A catcher reports the feeling they were offered. It leaves their sky; enough reports pause it. */
create or replace function hushmates.m_report_feeling(m hushmates.members, a jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare h hushmates.holds; j hushmates.journeys; v_open hushmates.reports; v_answered boolean; rep hushmates.reports; v_reporters int;
begin
  perform hushmates.actor(m, array['active', 'restricted', 'suspended']);
  select * into h from hushmates.holds where id = hushmates.as_uuid(a ->> 'holdId');
  if h.id is null or h.member_id <> m.id then perform hushmates.fail('not-found'); end if;
  select * into j from hushmates.journeys where id = h.journey_id for update;
  if j.id is null then perform hushmates.fail('not-found'); end if;
  select * into v_open from hushmates.reports where kind = 'feeling' and journey_id = j.id and by_member = m.id and status = 'open' limit 1;
  if v_open.id is not null then
    if hushmates.hold_live(h) then perform hushmates.end_hold(h.id, 'reported'); end if;
    return jsonb_build_object('received', true, 'reportId', v_open.id, 'expectation', hushmates.expectation(v_open.urgent));
  end if;
  v_answered := exists (select 1 from hushmates.reports where kind = 'feeling' and journey_id = j.id and by_member = m.id);
  rep := hushmates.report(m, 'feeling', j.id, null, a);
  if hushmates.hold_live(h) then perform hushmates.end_hold(h.id, 'reported'); end if;
  -- a moderator already looked at this person's report on this feeling: a new one waits for review, it can't pause it alone
  select count(distinct by_member) into v_reporters from hushmates.reports
  where kind = 'feeling' and journey_id = j.id and status = 'open' and by_member is not null;
  if not v_answered and (v_reporters >= hushmates.lim('reportsToPause') or rep.reason = 'safety') then
    update hushmates.journeys set paused = true where id = j.id;
    update hushmates.holds set status = 'voided', ended_at = hushmates.clock()
    where journey_id = j.id and status in ('offered', 'caught') and expires_at > hushmates.clock();
  end if;
  return jsonb_build_object('received', true, 'reportId', rep.id, 'expectation', hushmates.expectation(rep.urgent));
end $$;

create or replace function hushmates.forget(p_journey uuid, p_item text) returns void
language plpgsql set search_path = '' as $$
begin
  update hushmates.perspectives set hidden_for_owner = true where journey_id = p_journey and id::text = p_item;
  if not found then update hushmates.mallow_perspectives set hidden = true where journey_id = p_journey and id::text = p_item; end if;
end $$;

/** The owner reports a perspective: it disappears from their collection straight away. */
create or replace function hushmates.m_report_perspective(m hushmates.members, a jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare j hushmates.journeys := hushmates.mine(m, a ->> 'journeyId'); rep hushmates.reports; v_pid uuid;
begin
  if not ((a ->> 'perspectiveId') = any (hushmates.all_item_ids(j.id))) then perform hushmates.fail('not-found'); end if;
  v_pid := hushmates.as_uuid(a ->> 'perspectiveId');
  rep := hushmates.report(m, 'perspective', j.id,
    case when exists (select 1 from hushmates.perspectives where id = v_pid) then v_pid end, a);
  if rep.perspective_id is null then update hushmates.reports set perspective_id = v_pid where id = rep.id; end if;
  perform hushmates.forget(j.id, a ->> 'perspectiveId');
  return jsonb_build_object('received', true, 'reportId', rep.id, 'expectation', hushmates.expectation(rep.urgent), 'journey', hushmates.journey_view(j.id));
end $$;

/** Never meet this person again in the relay, without either side learning who. */
create or replace function hushmates.m_block(m hushmates.members, a jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare h hushmates.holds; j hushmates.journeys; r hushmates.perspectives; v_other uuid;
begin
  perform hushmates.actor(m, array['active', 'restricted', 'suspended']);
  if a ? 'holdId' and a ->> 'holdId' is not null then
    select * into h from hushmates.holds where id = hushmates.as_uuid(a ->> 'holdId');
    if h.id is null or h.member_id <> m.id then perform hushmates.fail('not-found'); end if;
    select owner into v_other from hushmates.journeys where id = h.journey_id;
    if hushmates.hold_live(h) then perform hushmates.end_hold(h.id, 'passed'); end if;
  else
    j := hushmates.mine(m, a ->> 'journeyId');
    select * into r from hushmates.perspectives where id = hushmates.as_uuid(a ->> 'perspectiveId');
    if r.id is null or r.journey_id <> j.id then perform hushmates.fail('not-found'); end if;
    v_other := r.author;
    update hushmates.perspectives set hidden_for_owner = true where id = r.id;
  end if;
  if v_other is null or v_other = m.id then perform hushmates.fail('not-found'); end if;
  insert into hushmates.blocks (blocker, blocked, at) values (m.id, v_other, hushmates.clock()) on conflict do nothing;
  -- from now on: nothing of theirs reaches you, including words already written on your other feelings,
  -- and any feeling of yours they are holding drifts on (they are not told why)
  update hushmates.holds h2 set status = 'voided', ended_at = hushmates.clock()
  from hushmates.journeys j2
  where j2.id = h2.journey_id and j2.owner = m.id and h2.member_id = v_other and h2.status in ('offered', 'caught') and h2.expires_at > hushmates.clock();
  update hushmates.perspectives p set hidden_for_owner = true
  from hushmates.journeys j3 where j3.id = p.journey_id and j3.owner = m.id and p.author = v_other;
  return jsonb_build_object('blocked', true);
end $$;

-- -------------------------------------------------------------- your data --
/** Everything that's the person's own, raw; the gateway decrypts it and words it (core/export-format.js). */
create or replace function hushmates.m_export_raw(m hushmates.members) returns jsonb
language plpgsql set search_path = '' as $$
begin
  perform hushmates.actor(m, array['active', 'restricted', 'suspended']);
  perform hushmates.settle_member(m.id);
  return jsonb_build_object(
    'now', hushmates.ms(hushmates.clock()),
    'you', jsonb_build_object('pseudonym', m.pseudonym, 'mallow', m.mallow, 'createdAt', hushmates.ms(m.created_at),
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

/** Close the account's Hushmates data: feelings deleted, given perspectives withdrawn, sign-ins ended. */
create or replace function hushmates.m_delete_my_data(m hushmates.members, a jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare r record; v_ids jsonb;
begin
  perform hushmates.actor(m, array['active', 'restricted', 'suspended']);
  if (a ->> 'confirm') is distinct from 'DELETE' then perform hushmates.fail('invalid'); end if;
  for r in select id, status from hushmates.journeys where owner = m.id and status <> 'deleted' for update loop
    if r.status = 'travelling' then perform hushmates.return_journey(r.id, 'withdrawn'); end if;
    update hushmates.perspectives set text_enc = '', text_mac = null, removed = true where journey_id = r.id and not set_aside;
    perform hushmates.wipe_fallback(r.id);
    update hushmates.journeys set text_enc = '', text_mac = null, status = 'deleted', events = '[]', choices = '{}' where id = r.id;
  end loop;
  -- perspectives this person gave leave the collections they were in
  update hushmates.perspectives set text_enc = '', text_mac = null, removed = true where author = m.id;
  update hushmates.holds set status = 'voided', ended_at = hushmates.clock()
  where member_id = m.id and status in ('offered', 'caught') and expires_at > hushmates.clock();
  select coalesce(jsonb_agg(jsonb_build_object('issuer', issuer, 'subject', subject)), '[]') into v_ids from hushmates.identities where member_id = m.id;
  delete from hushmates.identities where member_id = m.id;
  update hushmates.members set state = 'deleted', deleted_at = hushmates.clock(), pseudonym = 'A former Mallow', mallow = 'noomi', catching = false where id = m.id;
  perform hushmates.audit(m.id::text, 'account.deleted');
  return jsonb_build_object('deleted', true, 'identities', v_ids, 'memberId', m.id);
end $$;

-- ----------------------------------------------------------- invitations --
create or replace function hushmates.redeem_invite(p_issuer text, p_subject text, p_provider text, a jsonb, ctx jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare inv hushmates.invites; v_member uuid; v_t timestamptz := hushmates.clock(); v_who text := p_issuer || '|' || p_subject;
  v_net text := coalesce(ctx ->> 'net', 'unknown'); v_wrong int; v_wrong_net int;
begin
  select member_id into v_member from hushmates.identities where issuer = p_issuer and subject = p_subject;
  if v_member is not null then return hushmates.me_view(v_member); end if;           -- already in: nothing to do
  if (a -> 'adult') is distinct from 'true'::jsonb then perform hushmates.fail('invalid', 'Hushmates is for adults (18+) during the pilot.'); end if;
  -- wrong codes are limited per person, and (more loosely: people share homes and campuses) per network
  select count(*) filter (where subject = v_who), count(*) filter (where subject = 'net:' || v_net) into v_wrong, v_wrong_net
  from hushmates.rate_events where kind = 'invite-wrong' and subject in (v_who, 'net:' || v_net) and at > v_t - interval '1 hour';
  if v_wrong >= hushmates.lim('invitesPerHour') or v_wrong_net >= coalesce(hushmates.lim('invitesPerHourPerNetwork'), 3 * hushmates.lim('invitesPerHour')) then
    perform hushmates.fail('rate-limited', 'That’s a lot of tries. Please wait a little and try again.');
  end if;
  select * into inv from hushmates.invites where code_mac = a ->> 'codeMac' for update;
  if inv.id is null or inv.revoked_at is not null or (inv.expires_at is not null and inv.expires_at <= v_t) or inv.uses >= inv.max_uses then
    insert into hushmates.rate_events (subject, kind, at) values (v_who, 'invite-wrong', v_t), ('net:' || v_net, 'invite-wrong', v_t);
    return hushmates.err('invite-invalid', 'That invitation code didn’t work. It may have been used already or expired. Please check it, or ask the person who invited you.');
  end if;
  insert into hushmates.members (role, pseudonym, adult_confirmed_at, invite_id, created_at)
  values (inv.role, a ->> 'name', v_t, inv.id, v_t) returning id into v_member;
  insert into hushmates.identities (issuer, subject, member_id, provider, created_at, last_seen_at) values (p_issuer, p_subject, v_member, p_provider, v_t, v_t);
  update hushmates.invites set uses = uses + 1 where id = inv.id;
  perform hushmates.audit(v_member::text, 'account.created', jsonb_build_object('role', inv.role));
  return hushmates.me_view(v_member);
end $$;

-- ------------------------------------------------------------ moderation --
create or replace function hushmates.moderator(m hushmates.members) returns void
language plpgsql stable set search_path = '' as $$
begin
  perform hushmates.actor(m);
  if m.role <> 'moderator' then perform hushmates.fail('forbidden'); end if;
end $$;

create or replace function hushmates.m_mod_list(m hushmates.members) returns jsonb
language plpgsql set search_path = '' as $$
begin
  perform hushmates.moderator(m);
  perform hushmates.audit(m.id::text, 'mod.list-reports');
  return jsonb_build_object('reports', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'at', hushmates.ms(at), 'kind', kind, 'reason', reason, 'urgent', urgent, 'status', status)
    order by urgent desc, at) from hushmates.reports), '[]'));
end $$;

create or replace function hushmates.m_mod_get(m hushmates.members, a jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare r hushmates.reports;
begin
  perform hushmates.moderator(m);
  select * into r from hushmates.reports where id = hushmates.as_uuid(a ->> 'id');
  if r.id is null then perform hushmates.fail('not-found'); end if;
  perform hushmates.audit(m.id::text, 'mod.view-report', jsonb_build_object('report', r.id));
  return jsonb_build_object('id', r.id, 'at', hushmates.ms(r.at), 'by', coalesce(r.by_member::text, 'system'), 'kind', r.kind, 'journeyId', r.journey_id,
    'perspectiveId', r.perspective_id, 'reason', r.reason, 'details', r.details_enc, 'subject', r.subject, 'status', r.status, 'urgent', r.urgent,
    'evidence', r.evidence, 'subjectRef', r.subject, 'isMallow', r.kind = 'perspective' and not exists (select 1 from hushmates.perspectives x where x.id = r.perspective_id),
    -- what the desk needs to see a pattern, without anyone's identity: earlier reports about the same person
    'subjectHistory', case when r.subject is null then null else jsonb_build_object(
      'reports', (select count(*) from hushmates.reports x where x.subject = r.subject and x.id <> r.id and x.at < r.at),
      'actioned', (select count(*) from hushmates.reports x where x.subject = r.subject and x.id <> r.id and x.at < r.at and x.status = 'actioned'),
      'restricted', (select state from hushmates.members where id = r.subject) = 'restricted') end,
    'notes', coalesce((select jsonb_agg(jsonb_build_object('by', n.by_member, 'at', hushmates.ms(n.at), 'text', n.text_enc) order by n.at)
      from hushmates.report_notes n where n.report_id = r.id), '[]'));
end $$;

create or replace function hushmates.m_mod_resolve(m hushmates.members, a jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare r hushmates.reports; j hushmates.journeys; v_status text; s hushmates.members;
begin
  perform hushmates.moderator(m);
  select * into r from hushmates.reports where id = hushmates.as_uuid(a ->> 'id') for update;
  if r.id is null then perform hushmates.fail('not-found'); end if;
  select * into j from hushmates.journeys where id = r.journey_id for update;
  case a ->> 'action'
    when 'dismiss' then v_status := 'no-action';
    when 'resume-feeling' then
      if j.id is null then perform hushmates.fail('invalid'); end if;
      update hushmates.journeys set paused = false where id = j.id; v_status := 'no-action';
    when 'remove-feeling' then
      if j.id is null then perform hushmates.fail('invalid'); end if;
      update hushmates.journeys set paused = true where id = j.id;
      if j.status = 'travelling' then perform hushmates.return_journey(j.id, 'removed'); end if;
      v_status := 'actioned';
    when 'remove-perspective' then
      if r.perspective_id is null then perform hushmates.fail('invalid'); end if;
      update hushmates.perspectives set removed = true where id = r.perspective_id;
      v_status := 'actioned';
    when 'restrict-user' then
      if r.subject is null then perform hushmates.fail('invalid'); end if;
      select * into s from hushmates.members where id = r.subject;
      if s.id is not null and s.role <> 'moderator' then
        update hushmates.members set state = 'restricted', catching = false where id = s.id;
        update hushmates.holds set status = 'voided', ended_at = hushmates.clock()
        where member_id = s.id and status in ('offered', 'caught') and expires_at > hushmates.clock();
      end if;
      v_status := 'actioned';
    else perform hushmates.fail('invalid');
  end case;
  update hushmates.reports set status = v_status, resolved_at = hushmates.clock() where id = r.id;
  if coalesce(a ->> 'noteEnc', '') <> '' then
    insert into hushmates.report_notes (report_id, by_member, at, text_enc) values (r.id, m.id, hushmates.clock(), a ->> 'noteEnc');
  end if;
  perform hushmates.audit(m.id::text, 'mod.resolve', jsonb_build_object('report', r.id, 'decision', a ->> 'action'));
  return jsonb_build_object('id', r.id, 'status', v_status);
end $$;

create or replace function hushmates.m_mod_audit(m hushmates.members) returns jsonb
language plpgsql set search_path = '' as $$
begin
  perform hushmates.moderator(m);
  perform hushmates.audit(m.id::text, 'mod.view-audit');
  return jsonb_build_object('entries', coalesce((select jsonb_agg(x.e order by x.id) from (
    select detail || jsonb_build_object('id', id, 'at', hushmates.ms(at), 'actor', actor, 'action', action) as e, id
    from hushmates.audit_log order by id desc limit 200) x), '[]'));
end $$;
