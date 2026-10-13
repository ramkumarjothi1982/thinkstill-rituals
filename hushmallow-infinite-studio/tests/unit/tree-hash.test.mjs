import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { mkWorkTemp } from '../../render/lib/paths.mjs';
import {
  sha256, hashFile, listFiles, hashFiles, formatManifest, parseManifest, diffManifest, describeDiff,
} from '../../render/lib/tree-hash.mjs';

function fixture() {
  const d = mkWorkTemp('tree-hash-');
  fs.mkdirSync(path.join(d, 'a/b'), { recursive: true });
  fs.mkdirSync(path.join(d, '.git'), { recursive: true });
  fs.writeFileSync(path.join(d, 'a/b/one.txt'), 'one\n');
  fs.writeFileSync(path.join(d, 'two.bin'), Buffer.from([0, 1, 2, 255]));
  fs.writeFileSync(path.join(d, '.git/HEAD'), 'ignored\n');
  return d;
}

test('hashFile equals sha256 of the bytes (and of coreutils sha256sum)', () => {
  const d = fixture();
  try {
    const f = path.join(d, 'a/b/one.txt');
    assert.equal(hashFile(f), sha256(Buffer.from('one\n')));
    assert.equal(hashFile(f), execFileSync('sha256sum', [f], { encoding: 'utf8' }).split(' ')[0]);
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});

test('listFiles is sorted, POSIX-relative, and skips .git', () => {
  const d = fixture();
  try {
    assert.deepEqual(listFiles(d), ['a/b/one.txt', 'two.bin']);
    assert.deepEqual(listFiles(path.join(d, 'a'), { base: d }), ['a/b/one.txt']);
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});

test('manifests round-trip and are accepted by `sha256sum -c`', () => {
  const d = fixture();
  try {
    const map = hashFiles(d, listFiles(d));
    const text = formatManifest(map);
    assert.deepEqual(parseManifest(text), map);
    fs.writeFileSync(path.join(d, 'm.sha256'), text);
    const out = execFileSync('sha256sum', ['-c', 'm.sha256'], { cwd: d, encoding: 'utf8' });
    assert.match(out, /a\/b\/one\.txt: OK/);
    assert.throws(() => parseManifest('nonsense line'), /not "<sha256>  <path>"/);
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});

test('diffManifest reports changed, missing and added files', () => {
  const rec = { a: '1'.repeat(64), b: '2'.repeat(64), c: '3'.repeat(64) };
  const cur = { a: '1'.repeat(64), b: 'f'.repeat(64), d: '4'.repeat(64) };
  const d = diffManifest(rec, cur);
  assert.equal(d.ok, false);
  assert.deepEqual([d.changed, d.missing, d.added], [['b'], ['c'], ['d']]);
  assert.match(describeDiff(d), /changed \(1\): b; missing \(1\): c; added \(1\): d/);
  assert.equal(diffManifest(rec, { ...rec }).ok, true);
});
