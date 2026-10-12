// W7 lab: the rig with high-res (`res`) support.
//
// tools/hires/rig-res.patch is merged (A1), so the labs import the real
// registry.js, expressions.js and rig.js; the in-browser blob patching that
// stood in for it until then is gone.
//
// The registry now switches HIRES_VERIFIED at import (A-1). A lab that needs
// the ORIGINAL drawings as its base (check.html kind=old, mode=pair's
// "current" side, fit.html's OLD) must run with `hires=0` in its own URL,
// e.g. run.cjs json 'mode=jump&kind=old&hires=0'; kind=new is the same
// either way (hiresMallow() on an already switched entry changes nothing).
const APP = new URL('../../../', import.meta.url).href;            // hushmallow/

let cached = null;

/** -> the rig module (MallowRig, PRESETS, STAGES, faceRectSrc, ...) plus
 *  `registry` and `expressions` (use THESE MALLOWS / SPRITES: the rig reads
 *  them), `hiresOn` (the ids the registry switched; [] with ?hires=0) and
 *  `patched` (always false now: nothing is patched in the browser). */
export function loadRig() {
  if (cached) return cached;
  cached = (async () => {
    const [registry, expressions, rig] = await Promise.all(
      ['src/mallows/registry.js', 'src/mallows/expressions.js', 'src/mallows/rig.js'].map((p) => import(APP + p)));
    return Object.assign({ patched: false, states: {}, hiresOn: registry.HIRES_ON, registry, expressions }, rig);
  })();
  return cached;
}
