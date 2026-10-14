// G-FINAL allowlist: every asset the render loaded is a known file with a
// known hash, and no approved raster was magnified.
//
// Loaded assets come from the render's provenance (provenance.json assets,
// built by the farm from what the static server delivered) or, for the legacy
// v2, from the committed render evidence. An asset is a served file under the
// studio's assets/ or the app's assets/ (code is covered by the job key). It is
// allowed when its sha256 appears in one of:
//   library/assets-manifest.json   the runtime allowlist (PHASE2-PLAN file layout), once it exists
//   qa/golden/v2/frozen.sha256     the hash-locked v2 files (assets/noomi/**)
//   qa/golden/app-tree.sha256      the live app's hash-lock (hushmallow/assets/**)

import fs from 'node:fs';
import path from 'node:path';
import { STUDIO, studioPath } from '../../render/lib/paths.mjs';
import { check, gate, notRunGate } from './verdict.mjs';

const STUDIO_NAME = path.basename(STUDIO);

/** repo-relative path → sha256, from every allowlist source that exists. */
export function allowlist() {
  const map = new Map(), sources = [];
  const manifest = studioPath('library', 'assets-manifest.json');
  if (fs.existsSync(manifest)) {
    const m = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    for (const [p, h] of Object.entries(m.files || {})) map.set(`${STUDIO_NAME}/${p}`, h);
    sources.push('library/assets-manifest.json');
  }
  const sums = (file, prefix) => {
    if (!fs.existsSync(file)) return;
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const m = /^([0-9a-f]{64})\s+\*?(.+)$/.exec(line.trim());
      if (m) map.set(prefix + m[2], m[1]);
    }
    sources.push(path.relative(STUDIO, file));
  };
  sums(studioPath('qa', 'golden', 'v2', 'frozen.sha256'), `${STUDIO_NAME}/`);
  sums(studioPath('qa', 'golden', 'app-tree.sha256'), '');
  return { map, sources };
}

export function allowlistGate(ctx, T) {
  const assets = ctx.provenance?.assets || ctx.evidence?.assets;
  if (!assets?.files) return notRunGate('no render provenance (provenance.json assets) to check the loaded assets against');
  const prefixes = T.gates['G-FINAL:allowlist'].assetPrefixes;
  const { map, sources } = allowlist();
  const loaded = assets.files.map((f) => ({ ...f, rel: f.url.replace(/^\/+/, '') })).filter((f) => prefixes.some((p) => f.rel.startsWith(p)));
  const unknown = loaded.filter((f) => !map.has(f.rel));
  const changed = loaded.filter((f) => map.has(f.rel) && map.get(f.rel) !== f.sha256);
  const conflicts = assets.conflicts || [];
  const checks = {
    assets: check(unknown.length || changed.length ? 'fail' : 'pass', loaded.length - unknown.length - changed.length, loaded.length,
      unknown.length || changed.length
        ? [unknown.length && `not on the allowlist: ${unknown.map((f) => f.rel).join(', ')}`, changed.length && `hash differs from the allowlist: ${changed.map((f) => f.rel).join(', ')}`].filter(Boolean).join('; ')
        : `${loaded.length} loaded assets, each on the allowlist with its hash (${sources.join(', ')})`),
    stable: check(conflicts.length ? 'fail' : 'pass', conflicts.length, 0, conflicts.length ? `assets changed mid-render: ${conflicts.map((c) => c.url).join(', ')}` : 'no asset changed during the render'),
  };
  return gate(checks, { metrics: { loaded: loaded.map((f) => ({ path: f.rel, sha256: f.sha256 })), sources, provenance: ctx.provenance ? 'provenance.json' : 'render evidence' } });
}

/** Magnification part of G-FINAL fidelity (provenance's asset log). */
export function magnificationCheck(ctx, T) {
  const assets = ctx.provenance?.assets || ctx.evidence?.assets;
  const lim = T.gates['G-FINAL:fidelity'].magnification.fail;
  if (!assets?.rasters) return check('not-run', null, lim, 'no render provenance with an asset log (magnification per raster)');
  const imgs = assets.rasters.filter((r) => r.kind === 'image');
  const worst = imgs.reduce((w, r) => ((r.maxMagnification ?? 0) > (w?.maxMagnification ?? -1) ? r : w), null);
  const over = imgs.filter((r) => (r.maxMagnification ?? 0) > lim + 1e-9);
  return check(over.length ? 'fail' : 'pass', worst ? Math.round(worst.maxMagnification * 1e4) / 1e4 : null, lim,
    over.length ? `upscaled rasters: ${over.map((r) => `${r.role} ${r.maxMagnification.toFixed(3)}x`).join(', ')} (limit ${lim} screen px per art px)`
      : `largest magnification ${worst ? `${worst.role} ${worst.maxMagnification.toFixed(3)}x` : 'n/a'} over every rendered sub-frame (limit ${lim})`);
}

