// hm remux provenance (FU-5): the stamp grammar, and G-FINAL:delivery's check of a
// remux stamp against the remux record and the farm's picture.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { parseStamp, remuxStamp, stamp } from '../../render/lib/provenance.mjs';
import { h264StreamSha256 } from '../../render/encode.mjs';
import { provenanceCheck } from '../../qa/gates/delivery.mjs';
import { mkWorkTemp } from '../../render/lib/paths.mjs';

const KEY = 'ab'.repeat(32), RKEY = 'cd'.repeat(32);
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

test('stamp grammar: farm, remux and legacy stamps parse; a re-remux replaces the remux part', () => {
  const farm = stamp({ job: { direction: 'composer/t01-v2', key: KEY }, git: { sha: '0123456789abcdef', dirty: true } });
  assert.equal(farm, `hushmallow-infinite-studio composer/t01-v2 @ 0123456789ab-dirty job ${KEY.slice(0, 12)}`);
  assert.deepEqual(parseStamp(farm), { kind: 'farm', direction: 'composer/t01-v2', commit: '0123456789ab', dirty: true, job: KEY.slice(0, 12), remux: null, farm });
  const r = remuxStamp(farm, RKEY);
  assert.equal(r, `${farm} remux ${RKEY.slice(0, 12)}`);
  assert.equal(parseStamp(r).remux, RKEY.slice(0, 12));
  assert.equal(parseStamp(r).farm, farm);
  assert.equal(remuxStamp(r, 'ef'.repeat(32)), `${farm} remux efefefefefef`, 'a remux of a remux keeps one remux part');
  assert.deepEqual(parseStamp('hushmallow-infinite-studio my-brain-at-2am-v2 @ 9a16084d9477'), { kind: 'legacy', direction: 'my-brain-at-2am-v2', commit: '9a16084d9477' });
  assert.equal(parseStamp(`${farm} | remux {"contour":"rise-1"}`), null, "WP-04's free-form remux stamp is not a stamp QA can verify");
  assert.equal(parseStamp(''), null);
  assert.throws(() => remuxStamp('hushmallow-infinite-studio my-brain-at-2am-v2 @ 9a16084d9477', RKEY), /not a farm stamp/);
});

test('G-FINAL:delivery accepts a remux stamp only with a matching record and the farm\'s own picture', async () => {
  const dir = mkWorkTemp('remux-stamp-');
  try {
    const mk = (name, src) => {
      const f = path.join(dir, name);
      assert.equal(spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', src, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', f]).status, 0);
      return f;
    };
    const picture = mk('video.mp4', 'testsrc2=s=64x48:r=30:d=1');
    const other = mk('other.mp4', 'color=c=red:s=64x48:r=30:d=1');
    const remuxed = path.join(dir, 'final.remux.mp4');
    assert.equal(spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', picture, '-f', 'lavfi', '-i', 'sine=d=1', '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-shortest', remuxed]).status, 0);
    const stream = h264StreamSha256(picture);
    assert.equal(h264StreamSha256(remuxed), stream, 'a remux copies the picture: same H.264 stream');
    const farm = `hushmallow-infinite-studio composer/t01-v2 @ 0123456789ab job ${KEY.slice(0, 12)}`;
    const st = remuxStamp(farm, RKEY);
    const record = { schema: 'hm-remux/1', key: RKEY, picture: { file: 'video.mp4', sha256: sha(picture), videoStream: stream }, output: { file: 'final.remux.mp4', sha256: sha(remuxed) }, git: { dirty: false } };
    const prov = { job: { key: KEY, direction: 'composer/t01-v2' }, videoStream: { sha256: stream }, final: { file: 'final.remux.mp4', sha256: sha(remuxed) }, remux: record };
    const ctx = (p, video = remuxed) => ({ provenance: p, video, videoSha256: sha(video) });
    const ok = await provenanceCheck(ctx(prov), st);
    assert.equal(ok.status, 'pass', ok.detail);
    assert.match(ok.detail, /remux cdcdcdcdcdcd keeps the farm's picture/);
    // the WP-04 stamp the M0 audit found failing stays refused
    assert.equal((await provenanceCheck(ctx(prov), `${farm} | remux {"contour":"rise-1"}`)).status, 'fail');
    // a remux stamp whose key has no record
    const noRec = await provenanceCheck(ctx({ ...prov, remux: undefined }), st);
    assert.equal(noRec.status, 'fail');
    assert.match(noRec.detail, /no matching remux record/);
    assert.match((await provenanceCheck(ctx(prov), remuxStamp(farm, 'ee'.repeat(32)))).detail, /no matching remux record/);
    // a file whose picture is not the farm's (a different stream behind a copied record)
    const swapped = path.join(dir, 'swapped.mp4');
    assert.equal(spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', other, '-f', 'lavfi', '-i', 'sine=d=1', '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-shortest', swapped]).status, 0);
    const bad = await provenanceCheck(ctx({ ...prov, final: { sha256: sha(swapped) }, remux: { ...record, output: { sha256: sha(swapped) } } }, swapped), st);
    assert.equal(bad.status, 'fail');
    assert.match(bad.detail, /the picture is not the one the remux kept/);
    // the remux record describes another file
    const stale = await provenanceCheck(ctx({ ...prov, remux: { ...record, output: { sha256: '0'.repeat(64) } } }), st);
    assert.match(stale.detail, /remux record describes another file/);
    // the farm stamp alone, for the farm's own final.mp4, is unchanged
    const plain = await provenanceCheck(ctx({ ...prov, remux: undefined, final: { sha256: sha(picture) } }, picture), farm);
    assert.equal(plain.status, 'pass', plain.detail);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
