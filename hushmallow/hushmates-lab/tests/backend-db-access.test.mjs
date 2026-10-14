// Nobody but the Edge Function gets into the database. A browser holding the public key
// (anon) or a signed-in person's token (authenticated) reaches PostgREST with those roles;
// here they try every table and every function directly, and get nothing.

import test from 'node:test';
import assert from 'node:assert/strict';
import { backend, FEELING, cid } from './backend-helpers.mjs';

test('database: anon and authenticated can read, write or call nothing; the service role can only call hushmates_api', async () => {
  const b = await backend();
  try {
    await b.join('moon');
    await b.as('moon').call('submitFeeling', { text: FEELING, consent: true, clientId: cid('f') });
    const tables = (await b.sql("select tablename from pg_tables where schemaname = 'hushmates' order by 1")).map((r) => r.tablename);
    assert.ok(tables.length >= 15);
    // every table has row-level security on
    const rls = await b.sql("select relname, relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'hushmates' and c.relkind = 'r'");
    assert.ok(rls.every((r) => r.relrowsecurity), `RLS off on ${rls.filter((r) => !r.relrowsecurity).map((r) => r.relname)}`);
    for (const role of ['anon', 'authenticated']) {
      for (const t of tables) {
        for (const q of [`select * from hushmates.${t} limit 1`, `delete from hushmates.${t}`, `insert into hushmates.${t} default values`]) {
          await assert.rejects(b.sql(`set local role ${role}; ${q}`), /permission denied/, `${role}: ${q}`);
        }
      }
      for (const fn of ['rpc(\'x\',\'y\',\'me\')', 'job_tick()', 'job_mallow_claim(1)', 'job_retention()', 'settings()', 'ai_summary(null)', 'ops_summary()',
        "admin_create_invite('x')", "admin_set_setting('ai', '{\"enabled\":true}')"]) {
        await assert.rejects(b.sql(`set local role ${role}; select hushmates_api.${fn}`), /permission denied/, `${role} called ${fn}`);
      }
      await assert.rejects(b.sql(`set local role ${role}; select hushmates.clock()`), /permission denied/, `${role} reached an internal function`);
    }
    // the service role (the Edge Function) can call the API but can't touch the tables directly
    await assert.rejects(b.sql('set local role service_role; select * from hushmates.journeys'), /permission denied/);
    await assert.doesNotReject(b.sql("set local role service_role; select hushmates_api.settings() s"));
  } finally { await b.drop(); }
});

test('database: stored words are encrypted, and the database never sees a feeling in the clear', async () => {
  const b = await backend();
  try {
    await b.join('moon');
    await b.as('moon').call('submitFeeling', { text: FEELING, consent: true, clientId: cid('f') });
    const rows = await b.sql('select text_enc from hushmates.journeys');
    assert.match(rows[0].text_enc, /^hmenc:v1:/);
    const dump = JSON.stringify(await b.sql("select row_to_json(j) r from hushmates.journeys j"));
    assert.ok(!dump.includes('avoiding'), 'a feeling is readable in the database');
  } finally { await b.drop(); }
});
