// The recovery drill (tools/recovery-drill.mjs) on a real backup: a database with people's
// words in it is backed up with pg_dump, restored into a new database, and every locked text
// is opened with the keys. With the wrong keys nothing opens: a backup is only as good as the
// keys kept with it. Skipped (with a note) where the Postgres client tools aren't installed.

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runRecoveryDrill, pgTool } from '../tools/recovery-drill.mjs';
import { backend, FEELING, REFRAMES, cid } from './backend-helpers.mjs';

const dumpTool = pgTool('pg_dump');
const skip = dumpTool && pgTool('pg_restore') ? false : 'no pg_dump / pg_restore here';
const KEYS = { k1: Buffer.alloc(32, 7).toString('base64') };                 // the test database's keys (backend-helpers)
const MAC = Buffer.alloc(32, 9).toString('base64');

test('a backup comes back, and every stored word opens with the keys (and with no other keys)', { skip, timeout: 120e3 }, async () => {
  const b = await backend();
  const dir = mkdtempSync(join(tmpdir(), 'hushmates-drill-'));
  try {
    for (const n of ['moon', 'cloud', 'star']) await b.join(n);
    const r = await b.as('moon').call('submitFeeling', { text: FEELING, consent: true, clientId: cid('f') });
    for (const [i, who] of ['cloud', 'star'].entries()) {
      const { offer } = await b.as(who).call('findFeeling');
      await b.as(who).call('catchFeeling', { holdId: offer.holdId });
      await b.as(who).call('submitReframe', { holdId: offer.holdId, text: REFRAMES[i], clientId: cid('p') });
    }
    await b.as('star').call('submitFeeling', { text: 'I’m nervous about my first day at the new job.', consent: true, clientId: cid('f') });
    const { offer } = await b.as('cloud').call('findFeeling');
    await b.as('cloud').call('reportFeeling', { holdId: offer.holdId, reason: 'other', details: 'Just checking how reports are kept.' });
    assert.ok(r.journey.id);
    const dump = join(dir, 'backup.dump');
    const d = spawnSync(dumpTool, ['--format=custom', '--schema=hushmates', '--schema=hushmates_api', `--file=${dump}`, b.url], { encoding: 'utf8' });
    assert.equal(d.status, 0, d.stderr);

    const good = await runRecoveryDrill({ dump, keys: KEYS, current: 'k1', macKey: MAC });
    assert.equal(good.tables.members, 3);
    assert.equal(good.tables.journeys, 2);
    assert.equal(good.tables.perspectives, 2);
    assert.ok(good.encrypted >= 5, `only ${good.encrypted} locked texts`);
    assert.equal(good.opened, good.encrypted);
    assert.equal(good.unreadable, 0);
    assert.equal(good.plain, 0, 'words were stored unlocked');
    assert.deepEqual(Object.keys(good.kids), ['k1']);

    const wrong = await runRecoveryDrill({ dump, keys: { k1: Buffer.alloc(32, 1).toString('base64') }, current: 'k1', macKey: MAC });
    assert.equal(wrong.opened, 0);
    assert.equal(wrong.unreadable, good.encrypted);
  } finally {
    await b.drop();
    rmSync(dir, { recursive: true, force: true });
  }
});
