// G-DUPES: is this video a near-duplicate of one decided or posted recently?
//
// The signature (qa/gates/signature.py and audio.py) holds a 64-bit pHash at
// each of the 7 anchor frames, a colour grid and an audio band profile. The
// corpus is every signature recorded in the ledger (fingerprints.jsonl lines
// carrying `signature`, written at approval from the QA report: WP-25) plus
// any extra corpus file (JSONL of { id, at, channel?, signature }), within the
// last `days` days before the reference date (the spec's plannedFor, else
// --at, else today). A record of the same id is the video itself and skipped.
//
//   held   >= 5 of the 7 anchors within Hamming 10 of one corpus video: held
//          for review (fails, so it cannot be exported without a look)
//   cover  the cover frame >= 14 from each of the channel's last 30 posts
// Thresholds are provisional until WP-27 fits them to owner-rated pairs.

import fs from 'node:fs';
import { check, gate, notRunGate } from './verdict.mjs';

export const hamming = (a, b) => {
  let x = BigInt(`0x${a}`) ^ BigInt(`0x${b}`), c = 0;
  while (x) { c += Number(x & 1n); x >>= 1n; }
  return c;
};

function readJsonl(file) {
  return fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.trim()).map((l, i) => {
    try { return JSON.parse(l); } catch (e) { throw new Error(`${file}:${i + 1}: not JSON (${e.message})`); }
  });
}

/** Signature records of the ledger and extra corpus files. */
export async function corpusOf(ctx) {
  const out = [];
  if (ctx.ledgerDir !== 'empty') {
    const { readLedger } = await import('../../planner/ledger.mjs');
    for (const r of readLedger('fingerprints', { dir: ctx.ledgerDir || undefined })) if (r.signature) out.push({ ...r, source: 'ledger' });
  }
  for (const f of ctx.corpus || []) for (const r of readJsonl(f)) if (r.signature) out.push({ ...r, source: f });
  return out;
}

async function publishedOf(ctx) {
  if (ctx.ledgerDir === 'empty') return [];
  const { readLedger } = await import('../../planner/ledger.mjs');
  return readLedger('published', { dir: ctx.ledgerDir || undefined });
}

export async function dupesGate(ctx, signature, T) {
  if (!signature?.anchors?.length) return notRunGate('no signature (the pixel pass did not run)');
  const L = T.gates['G-DUPES'];
  const ref = ctx.spec?.plannedFor ? `${ctx.spec.plannedFor}T12:00:00Z` : ctx.at || new Date().toISOString();
  const refMs = Date.parse(ref);
  const self = ctx.spec?.id || ctx.label;
  const corpus = (await corpusOf(ctx)).filter((r) => r.id !== self);
  const recent = corpus.filter((r) => {
    const t = Date.parse(r.at);
    return Number.isFinite(t) && t <= refMs + 86400e3 && refMs - t <= L.days * 86400e3;
  });
  const mine = new Map(signature.anchors.map((a) => [a.label, a.phash]));
  const scored = recent.map((r) => {
    const near = [], dist = [];
    for (const a of r.signature.anchors || []) {
      if (!mine.has(a.label)) continue;
      const d = hamming(mine.get(a.label), a.phash);
      dist.push(d);
      if (d <= L.hamming) near.push(a.label);
    }
    return { id: r.id, at: r.at, source: r.source, near: near.length, compared: dist.length, meanHamming: dist.length ? dist.reduce((s, x) => s + x, 0) / dist.length : null };
  }).sort((a, b) => b.near - a.near || a.meanHamming - b.meanHamming);
  const held = scored.filter((s) => s.near >= L.anchorsHeld);
  const checks = {
    held: check(held.length ? 'fail' : 'pass', scored[0]?.near ?? 0, L.anchorsHeld,
      held.length ? `held for review: ${held[0].near} of ${held[0].compared} anchors within Hamming ${L.hamming} of ${held[0].id} (${held[0].at})`
        : `${recent.length} videos in the last ${L.days} days; the closest shares ${scored[0]?.near ?? 0} anchors within Hamming ${L.hamming}`),
  };
  // the cover against the channel's last posts
  const channel = ctx.spec?.channel;
  if (channel) {
    const posts = (await publishedOf(ctx)).filter((p) => p.channel === channel && p.id !== self).sort((a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt)).slice(0, L.lastPosts);
    const sigs = new Map(corpus.map((r) => [r.id, r.signature]));
    const cover = mine.get('cover');
    const near = posts.map((p) => ({ id: p.id, d: sigs.get(p.id)?.anchors?.find((a) => a.label === 'cover') })).filter((x) => x.d && cover)
      .map((x) => ({ id: x.id, d: hamming(cover, x.d.phash) })).sort((a, b) => a.d - b.d);
    checks.cover = check(near.length && near[0].d < L.coverMin ? 'fail' : 'pass', near[0]?.d ?? null, L.coverMin,
      near.length ? `closest cover among the last ${posts.length} ${channel} posts: ${near[0].id} at Hamming ${near[0].d}` : `no signed post on ${channel} to compare the cover with`);
  } else {
    checks.cover = check('pass', null, L.coverMin, 'no channel (review spec): the cover rule applies to production posts');
  }
  return gate(checks, { metrics: { reference: ref, corpus: corpus.length, recent: recent.length, nearest: scored.slice(0, 3) } });
}
