// Exact fingerprint of a variant spec: sha256 of its canonical visible slots
// plus the seed (PHASE2-PLAN data model 1). Invisible slots (world jitter,
// sound, gag intensity, quality, batch, pins) never change it, and key order
// never matters (canonical JSON), so the same video always has the same
// fingerprint across runs, machines and planner refactors.
//
// Visible slots = the plan's list (template, mallow, tod, weather, dressing
// set, gag, metaphor, the lines, ritual, hook, end copy, camera, loop,
// duration) plus three the viewer also sees: realm, turn and the R-NAMEIT
// name word. Changing this function changes every fingerprint: the unit test
// pins a known value so that can never happen by accident.

import { hashOf } from './canonical.mjs';

/** The visible slots of a spec, as a canonical object. */
export function visibleSlots(spec) {
  return {
    template: spec.template,
    mallow: spec.mallow,
    realm: spec.realm,
    tod: spec.tod,
    weather: spec.weather,
    dressing: [...(spec.dressing || [])].map((d) => `${d.id}#${d.variant}`).sort(),
    duration: spec.duration,
    gag: spec.gag?.id,
    metaphor: spec.metaphor,
    turn: spec.turn,
    ritual: spec.ritual,
    loop: spec.loop,
    camera: spec.camera,
    hook: spec.copy?.hook,
    lines: spec.copy?.lines,
    end: spec.copy?.end ? { kind: spec.copy.end.kind, text: spec.copy.end.text } : null,
    nameWord: spec.copy?.nameWord ?? null,
  };
}

/** 'sha256:<hex>' over the visible slots and the seed. */
export function fingerprint(spec) {
  return hashOf({ schema: 'hm-fingerprint/1', visible: visibleSlots(spec), seed: spec.seed });
}

/** Human-readable spec id: <Txx>-<mallow>-<tod>-<D>s-<first 6 hex of the fingerprint>. */
export function specId(spec, fp = fingerprint(spec)) {
  const short = String(spec.template).split('-')[0];
  return `${short}-${spec.mallow}-${spec.tod}-${spec.duration}s-${fp.slice('sha256:'.length, 'sha256:'.length + 6)}`;
}

/**
 * Set fingerprint and id from the visible slots and seed (for hand-written
 * specs such as specs/golden/t01-v2.json). Sealing proves nothing about
 * validity: run G-SPEC (hm spec check) afterwards.
 */
export function sealSpec(spec) {
  const fp = fingerprint(spec);
  return { ...spec, id: specId(spec, fp), fingerprint: fp };
}
