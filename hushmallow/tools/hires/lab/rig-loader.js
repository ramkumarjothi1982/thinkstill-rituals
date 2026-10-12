// W7 lab: the rig with high-res (`res`) support.
//
// Until W2 merges tools/hires/rig-res.patch, the lab applies THAT patch file
// (the same hunks W2 will `git apply`, through tools/hires/res-patch.mjs) to
// the live registry.js, expressions.js and rig.js in the browser and imports
// the results from blob URLs, wired to each other. Once every hunk is merged
// the real modules are used as they are; then this blob path can go.
import { parsePatch, applyFilePatch, appPath } from '../res-patch.mjs';

const APP = new URL('../../../', import.meta.url).href;            // hushmallow/
const PATCH = new URL('../rig-res.patch', import.meta.url).href;
// the modules the labs need, in import order (each imports only earlier ones)
const MODS = ['src/mallows/registry.js', 'src/mallows/expressions.js', 'src/mallows/rig.js'];

let cached = null;

/** -> the rig module (MallowRig, PRESETS, STAGES, faceRectSrc, ...) with res
 *  support, plus `registry` and `expressions` (use THESE MALLOWS / SPRITES:
 *  the patched rig reads them) and `patched` (false once merged). */
export function loadRig() {
  if (cached) return cached;
  cached = (async () => {
    const fetchText = async (u) => { const r = await fetch(u, { cache: 'no-store' }); if (!r.ok) throw new Error(`${u}: ${r.status}`); return r.text(); };
    const patch = parsePatch(await fetchText(PATCH));
    const byPath = Object.fromEntries(patch.map((fp) => [appPath(fp.file), fp]));
    const srcs = {}, states = {};
    for (const p of MODS) {
      const src = await fetchText(APP + p);
      if (!byPath[p]) { srcs[p] = null; states[p] = 'untouched'; continue; }
      const r = applyFilePatch(src, byPath[p]);
      if (r.state === 'failed') {
        const at = r.hunks.filter((h) => h.state === 'failed').map((h) => h.header).join(' | ');
        throw new Error(`rig-res.patch no longer fits ${p} (run node hushmallow/tools/hires/refresh-patch.mjs): ${at}`);
      }
      states[p] = r.state;
      srcs[p] = r.state === 'merged' ? null : r.text;
    }
    const urls = {};
    for (const p of MODS) {
      if (srcs[p] == null) { urls[p] = APP + p; continue; }
      // imports: patched siblings by blob, everything else by absolute URL
      // (and import.meta.url stays the file's own: registry.js resolves its assets with it)
      const s = srcs[p].replace(/from '(\.\.?\/[\w./-]+\.js)'/g, (m, f) => {
        const target = new URL(f, APP + p).href.slice(APP.length);
        return `from '${urls[target] || new URL(f, APP + p).href}'`;
      }).split('import.meta.url').join(JSON.stringify(APP + p));
      urls[p] = URL.createObjectURL(new Blob([s], { type: 'text/javascript' }));
    }
    const [registry, expressions, rig] = await Promise.all(MODS.map((p) => import(urls[p])));
    const patched = Object.values(states).some((s) => s === 'applied' || s === 'partial');
    return Object.assign({ patched, states, registry, expressions }, rig);
  })();
  return cached;
}
