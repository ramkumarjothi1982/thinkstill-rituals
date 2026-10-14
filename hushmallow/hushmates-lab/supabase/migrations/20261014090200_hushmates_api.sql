-- Hushmates · 3 of 3 · the only way in
--
-- hushmates_api holds the functions the Hushmates Edge Function calls (as the service
-- role). Nothing here is callable by anon or authenticated: a signed-in person can't
-- reach the database directly, only through the Edge Function, which verifies who
-- they are and passes their verified identity (issuer, subject).

-- --------------------------------------------------------------- one door --
create or replace function hushmates_api.rpc(p_issuer text, p_subject text, p_method text, p_args jsonb default '{}', p_ctx jsonb default '{}')
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare m hushmates.members; a jsonb := coalesce(p_args, '{}'); v jsonb;
begin
  if jsonb_typeof(a) <> 'object' then a := '{}'; end if;
  begin
    if p_issuer is null or p_subject is null or p_method is null then perform hushmates.fail('not-signed-in'); end if;
    select mm.* into m from hushmates.identities i join hushmates.members mm on mm.id = i.member_id
    where i.issuer = p_issuer and i.subject = p_subject;

    if p_method = 'redeemInvite' then
      return hushmates.redeem_invite(p_issuer, p_subject, coalesce(p_ctx ->> 'provider', 'hushmates'), a, p_ctx);
    end if;
    if m.id is null then
      if p_method = 'me' then return jsonb_build_object('needsInvite', true, 'now', hushmates.ms(hushmates.clock())); end if;
      perform hushmates.fail('invite-required', 'Please enter your invitation first.');
    end if;
    if m.state = 'deleted' then perform hushmates.fail('not-signed-in'); end if;
    -- a ceiling on how fast anyone can call at all (each action also has its own limits)
    perform hushmates.rate(m.id::text, jsonb_build_array(jsonb_build_array('rpc', hushmates.lim('requestsPerMinute'), 60000)));
    update hushmates.identities set last_seen_at = hushmates.clock()
    where issuer = p_issuer and subject = p_subject and (last_seen_at is null or last_seen_at < hushmates.clock() - interval '1 hour');

    v := case p_method
      when 'me' then hushmates.m_me(m)
      when 'savePreferences' then hushmates.m_save_preferences(m, a)
      when 'submitFeeling' then hushmates.m_submit_feeling(m, a)
      when 'listJourneys' then hushmates.m_list_journeys(m)
      when 'getJourney' then hushmates.journey_view((hushmates.mine(m, a ->> 'journeyId')).id)
      when 'withdrawFeeling' then hushmates.m_withdraw_feeling(m, a)
      when 'askMallow' then hushmates.m_ask_mallow(m, a)
      when 'resendJourney:check' then hushmates.m_resend_check(m, a)
      when 'resendJourney:commit' then hushmates.m_resend_commit(m, a)
      when 'setGiftSharing' then hushmates.m_set_gift_sharing(m, a)
      when 'withdrawPerspective' then hushmates.m_withdraw_perspective(m, a)
      when 'markReturnSeen' then hushmates.m_mark_return_seen(m, a)
      when 'markMallowSeen' then hushmates.m_mark_mallow_seen(m, a)
      when 'choosePerspective' then hushmates.m_choose(m, a)
      when 'saveJourney' then hushmates.m_save_journey(m, a)
      when 'releaseJourney' then hushmates.m_release_journey(m, a)
      when 'deleteJourney' then hushmates.m_delete_journey(m, a)
      when 'findFeeling' then hushmates.m_find_feeling(m)
      when 'catchFeeling' then hushmates.m_catch(m, a)
      when 'letFloatPast' then hushmates.m_float_past(m, a)
      when 'submitReframe:prepare' then hushmates.m_reframe_prepare(m, a)
      when 'submitReframe:support' then hushmates.m_reframe_support(m, a)
      when 'submitReframe:commit' then hushmates.m_reframe_commit(m, a)
      when 'myGifts' then hushmates.m_my_gifts(m)
      when 'reportFeeling' then hushmates.m_report_feeling(m, a)
      when 'reportPerspective' then hushmates.m_report_perspective(m, a)
      when 'blockContributor' then hushmates.m_block(m, a)
      when 'exportMyData' then hushmates.m_export_raw(m)
      when 'deleteMyData' then hushmates.m_delete_my_data(m, a)
      when 'modListReports' then hushmates.m_mod_list(m)
      when 'modGetReport' then hushmates.m_mod_get(m, a)
      when 'modResolve' then hushmates.m_mod_resolve(m, a)
      when 'modAuditLog' then hushmates.m_mod_audit(m)
      when 'mallowContext' then hushmates.mallow_context(m)
    end;
    if v is null then perform hushmates.fail('not-found', 'That isn’t available.'); end if;
    return v;
  exception when sqlstate 'P0001' then
    if sqlerrm like 'hm:%' then
      declare v_detail text;
      begin
        get stacked diagnostics v_detail = pg_exception_detail;
        return hushmates.err(substr(sqlerrm, 4), nullif(v_detail, ''));
      end;
    end if;
    raise;
  end;
end $$;

-- ---------------------------------------------------- the Mallow, completing --
/** The gateway completes a request it reserved (askMallow). → the journey as its author sees it. */
create or replace function hushmates_api.mallow_complete(p_issuer text, p_subject text, p_journey uuid, p_result jsonb)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_member uuid;
begin
  select member_id into v_member from hushmates.identities where issuer = p_issuer and subject = p_subject;
  if v_member is null or not exists (select 1 from hushmates.journeys where id = p_journey and owner = v_member) then
    return hushmates.err('not-found');
  end if;
  perform hushmates.mallow_complete(p_journey, p_result);
  return hushmates.journey_view(p_journey);
end $$;

/** What the gateway needs to choose a Mallow perspective well for this person (no one else's data). */
create or replace function hushmates.mallow_context(m hushmates.members) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object('recentAngles', coalesce((select jsonb_agg(f.angle_id) from (
    select mp.angle_id from hushmates.mallow_perspectives mp join hushmates.journeys j on j.id = mp.journey_id
    where j.owner = m.id and mp.angle_id is not null order by mp.created_at desc limit 12) f), '[]'))
$$;

-- ------------------------------------------------------- scheduled work --
/**
 * Every minute (pg_cron calls the Edge Function's job route, which calls this): holds whose time is
 * up expire, feelings whose day is over come home, and after the wait a Mallow perspective is
 * prepared where the person allowed it. Idempotent; safe to run twice at once.
 */
create or replace function hushmates_api.job_tick() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r record; v_held int; v_n int := 0;
begin
  v_held := hushmates.expire_holds(null, null);
  for r in select id from hushmates.journeys where status = 'travelling'
             and (expires_at <= hushmates.clock() or (allow_fallback and fallback_offered_at is null))
           for update skip locked loop
    perform hushmates.settle_journey(r.id);
    v_n := v_n + 1;
  end loop;
  perform hushmates.bump('job-tick');
  return jsonb_build_object('holdsExpired', v_held, 'journeysSettled', v_n);
end $$;

/** Claim Mallow perspectives waiting to be written (or whose writer stopped answering). */
create or replace function hushmates_api.job_mallow_claim(p_limit int default 10) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v jsonb; v_timeout interval := make_interval(secs => coalesce((hushmates.setting('mallow') ->> 'claimTimeoutMs')::numeric, 120000) / 1000);
begin
  with c as (
    select mp.journey_id from hushmates.mallow_perspectives mp
    where mp.status = 'pending' and not mp.hidden and (mp.claimed_at is null or mp.claimed_at < hushmates.clock() - v_timeout)
    order by mp.created_at limit greatest(1, least(p_limit, 50)) for update skip locked
  ), u as (
    update hushmates.mallow_perspectives mp set claimed_at = hushmates.clock() from c where mp.journey_id = c.journey_id returning mp.journey_id
  )
  select coalesce(jsonb_agg(jsonb_build_object('journeyId', j.id, 'text', j.text_enc, 'label', j.label, 'mallow', j.mallow, 'memberId', j.owner,
      'recentAngles', (hushmates.mallow_context(m)) -> 'recentAngles')), '[]')
    into v
  from u join hushmates.journeys j on j.id = u.journey_id join hushmates.members m on m.id = j.owner;
  return v;
end $$;

create or replace function hushmates_api.job_mallow_complete(p_journey uuid, p_result jsonb) returns void
language sql security definer set search_path = '' as $$ select hushmates.mallow_complete(p_journey, p_result) $$;

/** Daily: keep only what the retention rules allow (hushmates.settings 'retention'). */
create or replace function hushmates_api.job_retention() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s jsonb := hushmates.setting('retention'); v_t timestamptz := hushmates.clock(); n1 int; n2 int; n3 int; n4 int;
begin
  -- returned feelings nobody saved: their words and what came back are cleared after the retention period
  update hushmates.journeys set text_enc = '', text_mac = null, status = 'deleted', events = '[]', choices = '{}'
  where status in ('returned', 'released') and not saved
    and coalesce(returned_at, released_at) < v_t - make_interval(days => (s ->> 'returnedDays')::int);
  get diagnostics n1 = row_count;
  update hushmates.perspectives p set text_enc = '', text_mac = null, removed = true
  from hushmates.journeys j where j.id = p.journey_id and j.status = 'deleted' and p.text_enc <> '';
  update hushmates.mallow_perspectives mp set text_enc = '', hidden = true
  from hushmates.journeys j where j.id = mp.journey_id and j.status = 'deleted' and mp.text_enc <> '';
  -- the evidence in resolved reports, after its time
  update hushmates.reports set evidence = '{}', details_enc = ''
  where status <> 'open' and resolved_at < v_t - make_interval(days => (s ->> 'evidenceDaysAfterResolution')::int) and evidence <> '{}';
  get diagnostics n2 = row_count;
  delete from hushmates.audit_log where at < v_t - make_interval(days => (s ->> 'auditDays')::int);
  get diagnostics n3 = row_count;
  delete from hushmates.rate_events where at < v_t - make_interval(hours => (s ->> 'rateEventsHours')::int);
  get diagnostics n4 = row_count;
  delete from hushmates.usage_daily where day < (v_t - interval '7 days')::date;
  return jsonb_build_object('journeysCleared', n1, 'evidenceCleared', n2, 'auditDeleted', n3, 'rateEventsDeleted', n4);
end $$;

-- ------------------------------------------------------------ AI accounting --
create or replace function hushmates_api.ai_summary(p_member uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'spentThisMonthAud', coalesce((select sum(cost_aud) from hushmates.ai_usage where at >= date_trunc('month', hushmates.clock())), 0),
    'callsTodayMember', (select count(*) from hushmates.ai_usage where member_id = p_member and at >= date_trunc('day', hushmates.clock())),
    'callsTodayGlobal', (select count(*) from hushmates.ai_usage where at >= date_trunc('day', hushmates.clock())),
    'settings', hushmates.setting('ai'))
$$;

/**
 * Before an AI call: check the owner's switch and limits and hold the call's estimated cost, in one
 * step under a lock, so instances asking at the same moment can't both take the last of the budget.
 * The limits are the database's own settings (never the caller's). → { ok, id } | { ok: false, reason }
 */
create or replace function hushmates_api.ai_reserve(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s jsonb := hushmates.setting('ai'); v_cost numeric := (p ->> 'costAud')::numeric; v_member uuid := hushmates.as_uuid(p ->> 'memberId');
  v_t timestamptz := hushmates.clock(); v_spent numeric; v_n int; v_id bigint;
begin
  if coalesce((s ->> 'enabled')::boolean, false) is not true then return jsonb_build_object('ok', false, 'reason', 'disabled'); end if;
  if v_cost is null or v_cost <= 0 then return jsonb_build_object('ok', false, 'reason', 'no-estimate'); end if;
  perform pg_advisory_xact_lock(hashtext('hushmates.ai-ledger'));
  select coalesce(sum(cost_aud), 0) into v_spent from hushmates.ai_usage where at >= date_trunc('month', v_t);
  if v_spent + v_cost > coalesce((s ->> 'monthlyCapAud')::numeric, 0) then return jsonb_build_object('ok', false, 'reason', 'over-budget'); end if;
  select count(*) into v_n from hushmates.ai_usage where member_id = v_member and at >= date_trunc('day', v_t);
  if v_member is null or v_n >= coalesce((s ->> 'perMemberDaily')::int, 0) then return jsonb_build_object('ok', false, 'reason', 'member-daily'); end if;
  select count(*) into v_n from hushmates.ai_usage where at >= date_trunc('day', v_t);
  if v_n >= coalesce((s ->> 'perDayGlobal')::int, 0) then return jsonb_build_object('ok', false, 'reason', 'global-daily'); end if;
  insert into hushmates.ai_usage (at, member_id, journey_id, provider, cost_aud, status)
  values (v_t, v_member, hushmates.as_uuid(p ->> 'journeyId'), coalesce(p ->> 'provider', 'another-angle'), v_cost, 'held')
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

/** After an AI call (or one that never happened): one row per attempt; with an id, it settles that hold. */
create or replace function hushmates_api.ai_record(p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if (p ->> 'id') ~ '^[0-9]+$' then
    update hushmates.ai_usage set model = p ->> 'model', input_tokens = (p ->> 'inputTokens')::int, output_tokens = (p ->> 'outputTokens')::int,
      cost_aud = coalesce((p ->> 'costAud')::numeric, cost_aud), status = coalesce(p ->> 'status', 'unknown'), ms = (p ->> 'ms')::int
    where id = (p ->> 'id')::bigint and status = 'held';
    if found then return; end if;
  end if;
  insert into hushmates.ai_usage (at, member_id, journey_id, provider, model, input_tokens, output_tokens, cost_aud, status, ms)
  values (hushmates.clock(), hushmates.as_uuid(p ->> 'memberId'), hushmates.as_uuid(p ->> 'journeyId'), coalesce(p ->> 'provider', 'unknown'),
    p ->> 'model', (p ->> 'inputTokens')::int, (p ->> 'outputTokens')::int, coalesce((p ->> 'costAud')::numeric, 0), coalesce(p ->> 'status', 'unknown'), (p ->> 'ms')::int);
end $$;

create or replace function hushmates_api.settings() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_object_agg(key, value) from hushmates.settings
$$;

/** For the team: what the service did and spent (no one's words). */
create or replace function hushmates_api.ops_summary(p_days int default 7) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'ops', coalesce((select jsonb_agg(jsonb_build_object('day', day, 'kind', kind, 'count', count) order by day desc, kind)
                     from hushmates.ops_daily where day > (hushmates.clock() - make_interval(days => p_days))::date), '[]'),
    'aiSpentThisMonthAud', coalesce((select sum(cost_aud) from hushmates.ai_usage where at >= date_trunc('month', hushmates.clock())), 0),
    'members', (select count(*) from hushmates.members where state <> 'deleted'),
    'travelling', (select count(*) from hushmates.journeys where status = 'travelling'),
    'openReports', (select count(*) from hushmates.reports where status = 'open'))
$$;

-- ------------------------------------------------------------------ admin --
-- Used by the operator's tools (server/admin.mjs), never by the app.
create or replace function hushmates_api.admin_create_invite(p_code_mac text, p_role text default 'member', p_max_uses int default 1,
  p_expires_at timestamptz default null, p_note text default null) returns uuid
language sql security definer set search_path = '' as $$
  insert into hushmates.invites (code_mac, role, max_uses, expires_at, note) values (p_code_mac, p_role, p_max_uses, p_expires_at, p_note) returning id
$$;

create or replace function hushmates_api.admin_revoke_invite(p_code_mac text) returns boolean
language sql security definer set search_path = '' as $$
  update hushmates.invites set revoked_at = hushmates.clock() where code_mac = p_code_mac and revoked_at is null returning true
$$;

create or replace function hushmates_api.admin_set_setting(p_key text, p_value jsonb) returns void
language sql security definer set search_path = '' as $$
  insert into hushmates.settings (key, value, updated_at) values (p_key, p_value, hushmates.clock())
  on conflict (key) do update set value = hushmates.settings.value || excluded.value, updated_at = excluded.updated_at
$$;

/** A team lead lifts (or sets) a restriction, by the reference the safety desk shows. */
create or replace function hushmates_api.admin_set_member_state(p_member uuid, p_state text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_old text;
begin
  if p_state not in ('active', 'restricted', 'suspended') then raise exception 'state is active, restricted or suspended'; end if;
  select state into v_old from hushmates.members where id = p_member for update;
  if v_old is null or v_old = 'deleted' then raise exception 'no such account'; end if;
  update hushmates.members set state = p_state, catching = case when p_state = 'active' then catching else false end where id = p_member;
  if p_state <> 'active' then
    update hushmates.holds set status = 'voided', ended_at = hushmates.clock()
    where member_id = p_member and status in ('offered', 'caught') and expires_at > hushmates.clock();
  end if;
  perform hushmates.audit('operator', 'account.state', jsonb_build_object('member', p_member, 'from', v_old, 'to', p_state));
  return jsonb_build_object('member', p_member, 'from', v_old, 'to', p_state);
end $$;

-- ------------------------------------------------------------------ grants --
revoke all on all functions in schema hushmates from public;
revoke all on all functions in schema hushmates_api from public;
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin;
  end if;
end $$;
grant usage on schema hushmates_api to service_role;
grant execute on all functions in schema hushmates_api to service_role;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on all functions in schema hushmates_api from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on all functions in schema hushmates_api from authenticated;
  end if;
end $$;

-- ------------------------------------------------------------- schedules --
-- On Supabase (pg_cron and pg_net available): call the Edge Function's job route every minute,
-- and retention daily. The job secret is read from Supabase Vault ('hushmates_job_secret') and
-- the URL from 'hushmates_job_url'; see docs/STAGING.md. Locally the dev stack runs the same jobs.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') and exists (select 1 from pg_extension where extname = 'pg_net') then
    perform cron.schedule('hushmates-tick', '* * * * *', $job$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'hushmates_job_url') || '/jobs/tick',
        headers := jsonb_build_object('content-type', 'application/json',
          'x-hushmates-job', (select decrypted_secret from vault.decrypted_secrets where name = 'hushmates_job_secret')),
        body := '{}'::jsonb, timeout_milliseconds := 55000)
    $job$);
    perform cron.schedule('hushmates-retention', '17 3 * * *', $job$ select hushmates_api.job_retention() $job$);
  end if;
end $$;
