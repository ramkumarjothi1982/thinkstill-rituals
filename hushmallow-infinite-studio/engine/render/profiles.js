// Quality profiles (PHASE2-PLAN "Profiles", WP-02).
//
//   exact  the approved v2 rules: the direction's own sub-frame count (floor 3),
//          the face redrawn for every sub-frame with full-resolution blurs, the
//          v2 world and pass structure. Bit-identical to the goldens; used for
//          goldens and parity only (~26 min per 15 s).
//   final  the production master: scale 1, every optimisation of WP-02's
//          performance pass, x264 master + CRF 20 preview. Target <= 9 min per
//          15 s on one worker, accepted <= 12.
//
// Every optimisation is a named feature, so each can be switched off on its
// own: the per-step PSNR gates of WP-02 compare a profile with and without one
// feature (tools/perf/gate.mjs), and `features=-<name>` (engine page query,
// hm bench / hm gate --features) bisects a regression. The exact profile has
// none of them.
//
// Pure data, no browser APIs: imported by the engine page and by Node (the
// render farm, hm bench) alike.

/** The optimisation features, in the order the performance pass landed them. */
export const FEATURES = Object.freeze({
  overlaySkip: 'P2: an overlay with nothing drawn on it is neither cleared again, uploaded nor composited',
  faceCache: 'P3: the face is drawn once per frame from quantised parameters; per sub-frame only while it moves > 1.5 px',
  faceFastGlow: 'P3b: face glows blurred at 1/4 resolution, soft inner tube bands at 1/2; a face-box-sized texture (dirty rect)',
  worldFast: 'P4: world shader terms only where they can be non-zero; the water samples a once-rendered sky layer',
  fgAccum: 'P5: premultiplied foreground accumulation over the world, scissored passes, the reflection at 1/4 resolution',
});

/** Features that read another feature's output: dependent → base. */
const NEEDS = Object.freeze({ faceFastGlow: 'faceCache' });     // the fast face is drawn through the cache

const ALL = Object.keys(FEATURES);
const none = () => Object.fromEntries(ALL.map((f) => [f, false]));
const all = () => Object.fromEntries(ALL.map((f) => [f, true]));

export const PROFILES = Object.freeze({
  exact: Object.freeze({
    name: 'exact', summary: 'approved v2 rules, bit-identical to the goldens (goldens and parity only)',
    scale: 1, features: Object.freeze(none()), encoder: 'qp15', preview: null, mark: null,
  }),
  final: Object.freeze({
    name: 'final', summary: 'production master: every WP-02 optimisation at full scale',
    scale: 1, features: Object.freeze(all()), encoder: 'qp15', preview: 'crf20', mark: null,
  }),
});

export const DEFAULT_PROFILE = 'exact';

/**
 * Parse a feature override list: "+a,-b" (or "a,-b"; "none" / "all" resets).
 * → { reset: 'none' | 'all' | null, on: [...], off: [...] }
 */
export function parseFeatures(spec) {
  const out = { reset: null, on: [], off: [] };
  if (spec == null || spec === '') return out;
  for (const raw of String(spec).split(',').map((s) => s.trim()).filter(Boolean)) {
    if (raw === 'none' || raw === 'all') { out.reset = raw; out.on = []; out.off = []; continue; }
    const off = raw.startsWith('-'), name = raw.replace(/^[+-]/, '');
    if (!Object.hasOwn(FEATURES, name)) throw new Error(`unknown feature "${name}" (have: ${ALL.join(', ') || 'none yet'})`);
    (off ? out.off : out.on).push(name);
  }
  return out;
}

/**
 * The effective profile: a named profile plus optional feature overrides.
 * → frozen { ...profile, features: { name: bool }, overrides }
 */
export function resolveProfile(name = DEFAULT_PROFILE, { features = null } = {}) {
  const base = Object.hasOwn(PROFILES, name) ? PROFILES[name] : null;
  if (!base) throw new Error(`unknown profile "${name}" (have: ${Object.keys(PROFILES).join(', ')})`);
  const f = parseFeatures(features);
  const feat = f.reset === 'none' ? none() : f.reset === 'all' ? all() : { ...base.features };
  for (const n of f.on) feat[n] = true;
  for (const n of f.off) feat[n] = false;
  // a feature that builds on another one's output follows it off; asking for it without its base is an error
  for (const [dep, base] of Object.entries(NEEDS)) {
    if (!feat[dep] || feat[base]) continue;
    if (f.on.includes(dep)) throw new Error(`feature ${dep} needs ${base}`);
    feat[dep] = false;
  }
  return Object.freeze({ ...base, features: Object.freeze(feat), overrides: features || null });
}

/** A short stable label of the active features ('none', 'all' or the list), for logs. */
export function featureLabel(profile) {
  const on = ALL.filter((f) => profile.features[f]);
  return on.length === 0 ? 'none' : on.length === ALL.length ? 'all' : on.join('+');
}
