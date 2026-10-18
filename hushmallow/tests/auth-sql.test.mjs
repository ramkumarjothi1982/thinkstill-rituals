// Static checks of the Supabase SQL (the behaviour is proved by
// supabase/tests/rls_check.sql, run by tools/auth/sql-check.sh locally and on
// a local Supabase stack in CI): RLS enabled AND forced on every table; every
// policy matches auth.uid() and writes have WITH CHECK; nothing for anon;
// search_path pinned on every function; no column for free text.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SYNC_COLUMNS } from '../src/auth/sync.js';
import { TABLES as FAKE_TABLES } from '../tools/auth/fake-supabase.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const dir = `${root}supabase/migrations`;
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
const strip = (s) => s.replace(/--[^\n]*/g, '');
const all = files.map((f) => strip(readFileSync(`${dir}/${f}`, 'utf8'))).join('\n');
const tables = [...all.matchAll(/create table if not exists public\.(\w+)\s*\(([\s\S]*?)\n\);/g)].map((m) => ({ name: m[1], body: m[2] }));
const policies = [...all.matchAll(/create policy (\w+) on public\.(\w+)\s+for (select|insert|update|delete) to (\w+)([\s\S]*?);/g)].map((m) => ({ name: m[1], table: m[2], cmd: m[3], role: m[4], body: m[5] }));
const functions = [...all.matchAll(/create or replace function ([\w.]+)\(\)([\s\S]*?)\$(\w*)\$[\s\S]*?\$\3\$;/g)].map((m) => ({ name: m[1], head: m[2] }));

test('migrations run in order 0001 … 0010 and each is one transaction', () => {
  assert.deepEqual(files, ['0001_foundation.sql', '0002_profiles.sql', '0003_sync_consents.sql', '0004_preferences.sql', '0005_library.sql', '0006_consent_withdrawal.sql', '0007_delete_my_account.sql', '0008_backfill_profiles.sql', '0009_row_cap_upserts.sql', '0010_consent_withdrawal_owner_rights.sql']);
  files.forEach((f, i) => {
    const s = strip(readFileSync(`${dir}/${f}`, 'utf8'));
    assert.match(s, /^\s*begin;/, `${f} begins a transaction`);
    assert.match(s, /commit;\s*$/, `${f} commits`);
    assert.match(s, new RegExp(`values \\(${i + 1}, '${f.replace('.sql', '')}'\\)`), `${f} records itself`);
  });
});

test('the six user-data tables', () => {
  assert.deepEqual(tables.map((t) => t.name).sort(), ['favourite_worlds', 'garden_skills', 'hushflow_progress', 'preferences', 'profiles', 'sync_consents']);
  for (const t of tables) assert.match(t.body, /user_id\s+uuid[^,]*references auth\.users \(id\) on delete cascade/, `${t.name}: owned by an account, removed with it`);
});

test('RLS enabled AND forced on every table', () => {
  for (const { name } of tables) {
    assert.match(all, new RegExp(`alter table public\\.${name} enable row level security;`), `${name} enable`);
    assert.match(all, new RegExp(`alter table public\\.${name} force row level security;`), `${name} force`);
  }
});

test('every policy is for authenticated, matches auth.uid() to user_id, and writes have WITH CHECK', () => {
  for (const { name } of tables) {
    const mine = policies.filter((p) => p.table === name);
    assert.deepEqual(mine.map((p) => p.cmd).sort(), ['delete', 'insert', 'select', 'update'], `${name}: one policy per command`);
  }
  for (const p of policies) {
    assert.equal(p.role, 'authenticated', `${p.name}: never anon or public`);
    assert.match(p.body, /\(select auth\.uid\(\)\) = user_id/, `${p.name}: own rows only`);
    if (p.cmd === 'insert') { assert.match(p.body, /^\s*with check/, p.name); assert.doesNotMatch(p.body, /using/, p.name); }
    if (p.cmd === 'update') assert.match(p.body, /using \(\(select auth\.uid\(\)\) = user_id\)\s+with check \(\s*\(select auth\.uid\(\)\) = user_id/, `${p.name}: USING and WITH CHECK`);
    if (p.cmd === 'select' || p.cmd === 'delete') assert.match(p.body, /^\s*using \(\(select auth\.uid\(\)\) = user_id\)\s*$/, p.name);
    assert.doesNotMatch(p.body, /\btrue\b|or\s/i, `${p.name}: no escape hatch`);
  }
  // synced tables: writes need the matching consent
  const gate = { preferences: 'settings_sync', favourite_worlds: 'library_sync', garden_skills: 'library_sync', hushflow_progress: 'library_sync' };
  for (const p of policies.filter((x) => gate[x.table] && (x.cmd === 'insert' || x.cmd === 'update'))) {
    assert.match(p.body, new RegExp(`exists \\(select 1 from public\\.sync_consents c where c\\.user_id = \\(select auth\\.uid\\(\\)\\) and c\\.${gate[p.table]}\\)`), `${p.name}: consent gate`);
  }
});

test('nothing is granted to anon (or public); authenticated gets only what it needs', () => {
  assert.doesNotMatch(all, /grant[^;]*\bto\b[^;]*\b(anon|public)\b/i);
  for (const { name } of tables) assert.match(all, new RegExp(`revoke all on table public\\.${name} from anon, authenticated;`), `${name}: default privileges revoked`);
  assert.match(all, /grant update \(display_name, home_mallow, last_seen_at\) on table public\.profiles to authenticated;/);
  assert.match(all, /grant update \(settings_sync, library_sync\) on table public\.sync_consents to authenticated;/);
  assert.match(all, /revoke all on function public\.delete_my_account\(\) from anon;/);
  assert.match(all, /grant execute on function public\.delete_my_account\(\) to authenticated;/);
  assert.match(all, /revoke all on schema hm_private from anon, authenticated;/);
});

test('every function pins search_path to \'\'; security definer only where it must be', () => {
  assert.ok(functions.length >= 8);
  for (const f of functions) {
    assert.match(f.head, /set search_path = ''/, `${f.name}: search_path`);
    assert.match(f.head, /security (definer|invoker)/, `${f.name}: says how it runs`);
  }
  // the last definition of each function is the one that stands (0010 redefines 0006's withdrawal trigger)
  const latest = [...new Map(functions.map((f) => [f.name, f])).values()];
  const definers = latest.filter((f) => /security definer/.test(f.head)).map((f) => f.name).sort();
  // the withdrawal trigger runs as its owner so Supabase Auth's role can delete a user with sync on (0010)
  assert.deepEqual(definers, ['hm_private.handle_new_user', 'hm_private.sync_consents_withdrawn', 'public.delete_my_account']);
  // only delete_my_account is in public (exposed as an RPC); everything else is private
  assert.deepEqual(functions.filter((f) => f.name.startsWith('public.')).map((f) => f.name), ['public.delete_my_account']);
  for (const f of functions.filter((x) => x.name.startsWith('hm_private.'))) assert.match(all, new RegExp(`revoke all on function ${f.name.replace('.', '\\.')}\\(\\) from anon, authenticated;`), f.name);
});

test('delete_my_account() takes no arguments and deletes only auth.uid()', () => {
  const body = /create or replace function public\.delete_my_account\(\)[\s\S]*?\$\$([\s\S]*?)\$\$;/.exec(all)[1];
  assert.match(body, /v_uid uuid := auth\.uid\(\);/);
  assert.match(body, /if v_uid is null/);
  for (const t of tables.map((x) => x.name)) assert.match(body, new RegExp(`delete from public\\.${t} where user_id = v_uid;`), t);
  assert.match(body, /delete from auth\.users where id = v_uid;/);
  assert.doesNotMatch(body.replace(/where (user_)?id = v_uid/g, ''), /where/, 'no other filter');
});

test('a profile is made for every sign-up; the backfill covers older accounts', () => {
  assert.match(all, /create or replace trigger on_auth_user_created\s+after insert on auth\.users\s+for each row execute function hm_private\.handle_new_user\(\);/);
  assert.match(all, /insert into public\.profiles \(user_id, display_name\)\s+select u\.id,[\s\S]*from auth\.users u\s+where not exists/);
  assert.doesNotMatch(all, /drop trigger[^;]*auth\.users/, 'never needs to own auth.users');
});

test('updated_at triggers on every table that has the column; consent timestamps are the server’s', () => {
  for (const t of tables.filter((x) => /\bupdated_at\b/.test(x.body))) {
    const stamped = new RegExp(`create or replace trigger \\w+\\s+before insert or update on public\\.${t.name}\\s+for each row execute function hm_private\\.(set_updated_at|profiles_stamp|sync_consents_stamp)\\(\\)`).test(all);
    assert.ok(stamped, `${t.name}: updated_at kept by a trigger`);
  }
  assert.match(all, /new\.settings_sync_at := case when new\.settings_sync and not old\.settings_sync then now\(\)/);
  assert.match(all, /new\.library_withdrawn_at := case when old\.library_sync and not new\.library_sync then now\(\)/);
  assert.match(all, /delete from public\.preferences where user_id = old\.user_id;/);
  for (const t of ['favourite_worlds', 'garden_skills', 'hushflow_progress']) assert.match(all, new RegExp(`delete from public\\.${t} where user_id = old\\.user_id;`), `withdrawal deletes ${t}`);
});

/** A table body split into its column definitions (top-level commas only). */
function columns(body) {
  const out = []; let depth = 0, cur = '';
  for (const ch of body) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.filter((d) => !/^primary key/.test(d)).map((d) => { const m = /^(\w+)\s+([\w\[\]]+(?:\(\d+,\s*\d+\))?)/.exec(d); return { name: m[1], type: m[2], def: d.replace(/\s+/g, ' ') }; });
}

test('no column can hold free text: thoughts, words, feelings, notes or photos', () => {
  const FORBIDDEN = /\b(thought|thoughts|words?|text|note|notes|journal|message|content|body|feeling|feelings|emotion|emotions|intention|mood|photo|photos|image|images|picture|blob|story|reflection|entry|transcript)\b/;
  let textCols = 0;
  for (const t of tables) {
    for (const c of columns(t.body)) {
      assert.doesNotMatch(c.name, FORBIDDEN, `${t.name}.${c.name}`);
      assert.doesNotMatch(c.type, /^(jsonb|json|bytea|varchar|character)/, `${t.name}.${c.name}: no free-form type`);
      if (/^text/.test(c.type)) {
        textCols++;
        // every text column is constrained: an id pattern, a fixed list of ids, or the ≤ 40-character name
        assert.match(c.def, /check \(/, `${t.name}.${c.name}: has a check`);
        assert.match(c.def, /~ '\^\(?\[a-z|in \('|char_length\(display_name\) between 1 and 40/, `${t.name}.${c.name}: an id pattern, a fixed list or the short name`);
      }
    }
  }
  assert.equal(textCols, 11, 'display_name, home_mallow, motion, mallow ×3, world_id ×2, skill_id, from_world, sequence');
});

test('the client and the local fake write only columns the SQL has', () => {
  for (const [table, cols] of Object.entries(SYNC_COLUMNS)) {
    const t = tables.find((x) => x.name === table);
    for (const c of cols) assert.match(t.body, new RegExp(`\\n\\s*${c}\\s`), `${table}.${c} exists in SQL`);
  }
  for (const [table, def] of Object.entries(FAKE_TABLES)) {
    const t = tables.find((x) => x.name === table);
    assert.ok(t, table);
    const sqlCols = [...t.body.matchAll(/^\s*([a-z_]+)\s+(uuid|text|boolean|numeric|real|integer|smallint|bigint|timestamptz)/gm)].map((m) => m[1]).filter((c) => c !== 'primary');
    for (const c of def.cols) assert.ok(sqlCols.includes(c), `fake ${table}.${c} exists in SQL`);
  }
});

test('the rollback and the RLS check exist and roll back what they create', () => {
  const rb = readFileSync(`${root}supabase/rollback/rollback_all.sql`, 'utf8');
  for (const t of tables.map((x) => x.name)) assert.match(rb, new RegExp(`drop table if exists public\\.${t};`));
  assert.match(rb, /drop function if exists public\.delete_my_account\(\);/);
  const ck = readFileSync(`${root}supabase/tests/rls_check.sql`, 'utf8');
  assert.match(ck, /set local role authenticated/);
  assert.match(ck, /set_config\('request\.jwt\.claims'/);
  assert.match(ck, /set local role anon/);
  assert.match(ck, /raise exception using errcode = 'P0001', message = 'hm_rls_check_rollback';/);
  assert.match(ck, /@example\.invalid/);
  assert.doesNotMatch(strip(ck), /\bcommit\b/i);
});
