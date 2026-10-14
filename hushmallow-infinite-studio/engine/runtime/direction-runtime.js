// Runtime 'v3': renders a composer direction (direction.json, hm-direction/3)
// on the engine stage.
//
// It exposes the same direction interface the stage loads for every runtime
// (engine/stage.js Stage.init / renderFrame / dryRun / prime):
//   { meta, setup(stage), state(t, stage, {center}), overlay(ctx, t, stage),
//     subframes(t, stage), probes(), dispose(stage) }
// so engine/stage.js needs no change. Unlike a v2 module it holds no
// module-level state: every runtime is its own instance (R4).
//
// Direction semantics live in composer/scene.js, the one implementation the
// composer's dry runs (curves, G-DIR, G-COST) use too; this file adds what only
// a page has: images, the face canvas, glass text textures, overlay type, cues.
//
// Two ways in:
//   createDirectionRuntime({ direction })     a compiled direction.json
//   createDirectionRuntime({ spec })          compose in the page at setup,
//                                             after Stage.init has loaded Fredoka,
//                                             so layout uses the real font
// Nothing falls back: a missing asset, face JSON or measurement mismatch is a
// hard error (R13).
//
// Wiring into the registry (engine/directions.js, not changed by WP-03):
//   RUNTIMES.v3 = (mod, meta) => createDirectionRuntime({ direction: mod.direction })
// with a registry entry whose load() fetches the direction JSON (data, not code).

import { Face, specFromDerived } from '../face.js';
import { TextBlock, LogoCard } from '../type.js';
import { MALLOWS } from '../../../hushmallow/src/mallows/registry.js';
import { createScene } from '../../composer/scene.js';
import { compose, FRAME, DIRECTION_SCHEMA } from '../../composer/compose.js';
import { indexLibraryLite } from '../../composer/library.js';
import { canvasMeasure } from '../../composer/layout.js';
import { checkChannels } from '../../composer/channels.js';
import { wrapTime } from '../../composer/circular.js';

export const RUNTIME = 'v3';

// engine/stage.js (loadImage, silhouette: the exact measurement the frozen v2 used) is imported on
// first use: it installs the virtual clock, which needs a page, so this module stays importable in Node.
const stageLib = () => import('../stage.js');

const STUDIO_URL = new URL('../../', import.meta.url);
const studioUrl = (rel) => new URL(rel, STUDIO_URL).href;

async function fetchJSON(rel) {
  const res = await fetch(studioUrl(rel));
  if (!res.ok) throw new Error(`runtime v3: ${rel} → HTTP ${res.status}`);
  return res.json();
}

/** A library file's JSON and the sha256 of its exact bytes (the provenance Node's composer records too). */
async function fetchHashed(rel) {
  const res = await fetch(studioUrl(rel));
  if (!res.ok) throw new Error(`runtime v3: ${rel} → HTTP ${res.status}`);
  const bytes = await res.arrayBuffer();
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return { value: JSON.parse(new TextDecoder().decode(bytes)), sha256: Array.from(digest, (b) => b.toString(16).padStart(2, '0')).join('') };
}

async function image(rel) {
  const { loadImage } = await stageLib();
  try { return await loadImage(studioUrl(rel)); } catch (e) { throw new Error(`runtime v3: cannot load ${rel} (${e.message}); no fallback`); }
}

/** Deep equality on JSON data, key order ignored. */
const canon = (v) => (Array.isArray(v) ? `[${v.map(canon).join(',')}]` : v && typeof v === 'object' ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}` : JSON.stringify(v));
const same = (a, b) => canon(a) === canon(b);

/** Compose a spec in this page: library data fetched, the face derived, text measured with the loaded font. */
export async function composeInPage(spec, { lib = null } = {}) {
  lib = lib || indexLibraryLite(await fetchJSON('templates/story-library.json'));
  const packFile = await fetchHashed(`library/mallows/${spec.mallow}.json`);
  const pack = packFile.value;
  const [realmFile, tuningFile, faceJson, pristine] = await Promise.all([
    fetchHashed(`library/realms/${spec.realm}.json`), fetchHashed('library/tuning-matrix.json'), fetchJSON(pack.art.face), image(pack.art.pristine),
  ]);
  const realm = realmFile.value, tuning = tuningFile.value;
  const rig = MALLOWS[pack.registry]?.face;
  if (!rig) throw new Error(`runtime v3: the app registry has no face rig for ${pack.registry}`);
  const { silhouette } = await stageLib();
  const sil = silhouette(pristine);
  const { sha256: _, ...recorded } = pack.measured.silhouette;
  if (!same(sil, recorded)) throw new Error(`runtime v3: ${pack.id}'s silhouette measures ${JSON.stringify(sil)}, the pack records ${JSON.stringify(recorded)}`);
  const data = {
    pack, realm, tuning, faceSpec: specFromDerived(faceJson, rig, pack.face.rigScale), silhouette: sil, measure: canvasMeasure(document), measuredBy: 'page',
    hashes: { pack: packFile.sha256, realm: realmFile.sha256, tuning: tuningFile.sha256 },
  };
  return compose(spec, { lib, data });
}

/** v2's bubbleCanvas(): a glass card's text, supersampled, centred rows. */
function glassText(item, st) {
  const m = document.createElement('canvas').getContext('2d');
  m.font = `${st.weight} ${st.size}px "Fredoka"`;
  const w = Math.max(...item.lines.map((l) => m.measureText(l).width));
  const hw = w / 2 + st.padX, hh = (item.lines.length * st.lineHeight) / 2 + st.padY;
  const S = st.supersample;
  const c = document.createElement('canvas');
  c.width = Math.ceil(hw * 2 * S); c.height = Math.ceil(hh * 2 * S);
  const g = c.getContext('2d');
  g.scale(S, S);
  g.font = `${st.weight} ${st.size}px "Fredoka"`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = st.ink;
  item.lines.forEach((l, i) => g.fillText(l, hw, hh + (i - (item.lines.length - 1) / 2) * st.lineHeight + 1));
  return { canvas: c, w, hw, hh };
}

/**
 * The stage-facing direction. input: { direction } | { spec, lib? }.
 * opts.allowShimLayout: render a direction whose text was measured with the
 * font-metrics shim (previews only; boxes then differ slightly from the page).
 */
export function createDirectionRuntime(input, opts = {}) {
  let direction = input.direction || null;
  const spec = input.spec || null;
  if (!direction && !spec) throw new Error('runtime v3: give { direction } or { spec }');
  if (direction && direction.schema !== DIRECTION_SCHEMA) throw new Error(`runtime v3: expected ${DIRECTION_SCHEMA}, got ${direction.schema}`);
  const meta = direction ? { ...direction.meta } : {
    id: spec.id, title: null, runtime: RUNTIME, score: 'soundtrack-v2', fps: FRAME.fps, duration: Number(spec.duration),
    width: FRAME.width, height: FRAME.height, subframes: FRAME.subframes, subframeMax: FRAME.subframeMax, subframePx: FRAME.subframePx, shutter: FRAME.shutter,
  };
  let scene = null, face = null, texts = [], textures = {}, D = meta.duration, P = 0, report = null;

  const runtime = {
    contract: RUNTIME,
    meta,
    get direction() { return direction; },
    get report() { return report; },

    async setup(stage) {
      if (!direction) {
        ({ direction, report } = await composeInPage(spec, { lib: input.lib || null }));
        for (const k of ['fps', 'duration', 'shutter', 'subframes']) if (direction.meta[k] !== meta[k]) throw new Error(`runtime v3: composed meta.${k} ${direction.meta[k]} ≠ ${meta[k]}`);
        Object.assign(meta, direction.meta);
      }
      const errs = checkChannels(direction.channels, direction.meta.duration);
      if (errs.length) throw new Error(`runtime v3: direction ${meta.id} is malformed: ${errs.slice(0, 5).map((e) => `${e.rule} ${e.message}`).join('; ')}`);
      if (direction.meta.layout !== 'page' && !opts.allowShimLayout) throw new Error(`runtime v3: direction ${meta.id} was laid out with the ${direction.meta.layout} font metrics; compose it in the page (createDirectionRuntime({ spec })) or pass allowShimLayout`);
      D = direction.meta.duration; P = direction.meta.P || 0;
      const M = direction.mallow;

      // the Mallow: derived art, measured face, soft body (no fallback, R13)
      const [pristine, clean, normal, faceJson] = await Promise.all([image(M.assets.pristine), image(M.assets.clean), image(M.assets.normal), fetchJSON(M.assets.face)]);
      const { silhouette } = await stageLib();
      const sil = silhouette(pristine);
      if (!same(sil, M.silhouette)) throw new Error(`runtime v3: silhouette of ${M.assets.pristine} is ${JSON.stringify(sil)}, the direction was composed for ${JSON.stringify(M.silhouette)}`);
      const rig = MALLOWS[M.registry]?.face;
      if (!rig) throw new Error(`runtime v3: the app registry has no face rig for ${M.registry}`);
      const faceSpec = specFromDerived(faceJson, rig, M.rigScale);
      if (!same(faceSpec, M.faceSpec)) throw new Error(`runtime v3: the face spec derived from ${M.assets.face} differs from the direction's (assets changed after compile?)`);
      const faceCanvas = document.createElement('canvas');
      faceCanvas.width = pristine.width; faceCanvas.height = pristine.height;
      face = new Face(M.faceSpec, faceCanvas);
      stage.renderer.setMallow({ artImg: clean, pristineImg: pristine, faceCanvas, normalImg: normal, cols: M.body.cols, rows: M.body.rows });
      scene = createScene(direction, { silhouette: sil, faceSpec: M.faceSpec });

      // glass text on the props
      for (const p of direction.props) {
        for (const it of p.items) {
          const g = glassText(it, p.style.text);
          if (Math.abs(g.w - it.layout.w) > (opts.allowShimLayout ? 1e9 : 0)) throw new Error(`runtime v3: "${it.lines.join(' ')}" measures ${g.w} px here, the direction says ${it.layout.w}`);
          textures[it.tex] = stage.renderer.textTexture(it.tex, g.canvas);
        }
      }
      // overlay type, in z order
      texts = [];
      for (const x of direction.text) {
        const obj = x.kind === 'logocard' ? new LogoCard(x.opts) : new TextBlock(x.opts);
        if (x.kind === 'logocard') await obj.load();
        texts.push({ obj, drawFrom: x.drawFrom });
      }
      // the cue log the score is rendered from
      for (const c of direction.cues) stage.cue(c.t, c.type, c.data);
    },

    state(t) {
      const s = scene.state(t);
      for (const b of s.bubblesBack) b.textTex = textures[b.textTex];
      for (const b of s.bubblesFront) b.textTex = textures[b.textTex];
      const tc = wrapTime(t, D, P);
      const F = scene.raw.faceAt(tc);
      return {
        t: s.t, cam: s.cam,
        buildMesh: (mesh, flip) => scene.body.build(mesh, tc, scene.raw.dofAt, scene.xf, flip),
        drawFace: () => face.draw(F),
        mallow: s.mallow, world: s.world, bubblesBack: s.bubblesBack, bubblesFront: s.bubblesFront, particles: s.particles, post: s.post, audio: s.audio,
      };
    },

    overlay(ctx, t) {
      const tc = wrapTime(t, D, P);
      ctx.clearRect(0, 0, direction.meta.width, direction.meta.height);
      for (const x of texts) {
        if (x.drawFrom !== undefined && tc < x.drawFrom) continue;
        x.obj.draw(ctx, tc);
      }
      return true;
    },

    subframes(t) { return scene.subframes(t); },

    probes() { return direction ? direction.probes.map((p) => ({ ...p })) : []; },

    dispose() { scene = null; face = null; texts = []; textures = {}; },
  };
  return runtime;
}

/** Fetch a direction.json (studio-relative path or URL) and wrap it. */
export async function loadDirectionRuntime(rel, opts) {
  const direction = await fetchJSON(rel);
  return createDirectionRuntime({ direction }, opts);
}
