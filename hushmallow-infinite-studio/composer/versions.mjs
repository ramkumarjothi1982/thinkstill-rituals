// Move versions for the tuning matrix (PHASE2-PLAN data model §4, OWNER-DECISIONS D2):
// a move's version is the sha256 of what it compiles to on the canonical
// fixtures, not of its source text. A refactor that changes nothing keeps the
// version (and the cells' approval); any change in output changes it, and the
// move's cells must drop to candidate.
//
// Node only (node:crypto); run through tests/unit/composer-library.test.mjs,
// which refuses a matrix whose versions are stale.

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { compose } from './compose.js';
import { studioPath } from '../render/lib/paths.mjs';

/** The canonical fixtures: specs every move version is computed on. */
export const FIXTURES = Object.freeze([studioPath('specs', 'golden', 't01-v2.json')]);

/** JSON with sorted keys at every depth. */
function canonical(v) {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`;
  return JSON.stringify(v);
}

/** Everything move `id` contributed to a compiled direction. */
export function outputOf(compiled, id) {
  const d = compiled.direction;
  const channels = {};
  for (const [name, def] of Object.entries(d.channels)) {
    const mine = {};
    if (def.keys) { const k = def.keys.filter((x) => x.by === id); if (k.length) mine.keys = k; }
    if (def.list) { const l = def.list.filter((x) => x.by === id); if (l.length) mine.list = l; }
    if (def.windows) { const w = def.windows.filter((x) => x.by === id); if (w.length) mine.windows = w; }
    if (def.by === id) mine.term = def;
    if (Object.keys(mine).length) channels[name] = mine;
  }
  const ran = d.moves.find((m) => m.id === id);
  return {
    channels,
    cues: d.cues.filter((c) => c.by === id),
    text: d.text.filter((x) => x.by === id),
    props: d.props.filter((p) => d.provenance.props[p.id] && Object.values(d.provenance.props[p.id]).includes(id)).map((p) => ({ id: p.id, fields: Object.entries(d.provenance.props[p.id]).filter(([, by]) => by === id).map(([f]) => f), prop: p })),
    anchors: Object.fromEntries((ran?.published || []).map((n) => [n, d.anchors[n]])),
    posts: Object.fromEntries(Object.entries(compiled.report.posts).map(([k, l]) => [k, l.filter((p) => p.by === id).map((p) => p.value)]).filter(([, l]) => l.length)),
    params: ran?.params ?? null,
  };
}

/** { moveId: 'sha256:…' } over the fixtures. */
export async function moveVersions(fixtures = FIXTURES) {
  const compiled = [];
  for (const f of fixtures) compiled.push(await compose(JSON.parse(fs.readFileSync(f, 'utf8'))));
  const ids = [...new Set(compiled.flatMap((c) => c.direction.moves.map((m) => m.id)))];
  const out = {};
  for (const id of ids.sort()) {
    const h = createHash('sha256').update(canonical(compiled.map((c) => outputOf(c, id)))).digest('hex');
    out[id] = `sha256:${h}`;
  }
  return out;
}
