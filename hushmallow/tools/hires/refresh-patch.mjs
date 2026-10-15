#!/usr/bin/env node
// W7: refresh tools/hires/rig-res.patch against today's files.
//
//   node hushmallow/tools/hires/refresh-patch.mjs [--check]
//
// Applies the patch to the current src files (tolerant of line offsets and
// outer-context fuzz, tools/hires/res-patch.mjs), then rewrites it with exact
// line numbers and context, so `git apply` takes it cleanly. Files whose hunks
// are all merged already drop out of the patch. A hunk that fits nowhere is
// reported (its lines changed: edit the patch by hand) and nothing is written.
// --check only reports.
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePatch, applyFilePatch } from './res-patch.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '../../..');                 // the git root (paths in the patch start with hushmallow/)
const PATCH = join(here, 'rig-res.patch');
const check = process.argv.includes('--check');

const files = parsePatch(readFileSync(PATCH, 'utf8'));
const tmp = mkdtempSync(join(tmpdir(), 'rig-res-'));
let out = '', bad = 0;
try {
  for (const fp of files) {
    const cur = readFileSync(join(repo, fp.file), 'utf8');
    const r = applyFilePatch(cur, fp);
    const note = r.hunks.map((h) => `${h.state}${h.fuzz ? ` fuzz ${h.fuzz}` : ''}${h.offset ? ` @${h.offset > 0 ? '+' : ''}${h.offset}` : ''}`);
    console.log(`${fp.file}: ${r.state}  [${note.join(', ')}]`);
    r.hunks.forEach((h) => { if (h.state === 'failed') console.log(`  FAILED near: ${h.header}`); });
    if (r.state === 'failed') { bad++; continue; }
    if (r.state === 'merged') continue;
    const A = join(tmp, 'a', fp.file), B = join(tmp, 'b', fp.file);
    mkdirSync(dirname(A), { recursive: true }); mkdirSync(dirname(B), { recursive: true });
    // the merged hunks are part of today's file: diff today's file against the result
    writeFileSync(A, cur); writeFileSync(B, r.text);
    let d = '';
    try { execFileSync('git', ['diff', '--no-index', '-U2', '--no-color', A, B], { encoding: 'utf8' }); } catch (e) { d = e.stdout; }
    d = d.split(join(tmp, 'a') + '/').join('').split(join(tmp, 'b') + '/').join('')
      .replace(/^diff --git a?\/?(\S+) b?\/?(\S+)$/m, `diff --git a/${fp.file} b/${fp.file}`)
      .replace(/^--- .*$/m, `--- a/${fp.file}`).replace(/^\+\+\+ .*$/m, `+++ b/${fp.file}`)
      .replace(/^index .*\n/m, '');
    out += d;
  }
} finally { rmSync(tmp, { recursive: true, force: true }); }
if (bad) { console.log(`${bad} file(s) with hunks that fit nowhere: nothing written`); process.exit(1); }
if (check) process.exit(0);
writeFileSync(PATCH, out);
console.log(`wrote ${PATCH} (${out.split('\n').length - 1} lines)`);
