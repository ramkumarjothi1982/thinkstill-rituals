// Transient layers and history (main.js): the Hushfold's input, side panel
// and reader, the account screens, and every sheet (openSheet in ui.js) get a
// history entry of their own, so Back closes them first, even on the root
// scene. Kept free of the page (history is passed in) so node can test it.
//
//   push() → token        a new entry for a layer that just opened
//   popMany([tokens])     those layers closed another way (✕, Escape, send,
//                         a scene change): step history back over their
//                         entries in ONE traversal, history.go(-n). Two
//                         history.back() calls in a row can land as one
//                         (WebKit keeps only the newest scheduled history
//                         navigation), which would leave an entry behind.
//   onPop() → 'ours' | token | 0
//                         a popstate: 'ours' is one of our own steps back
//                         landing (ignore it); a token is the newest layer
//                         whose entry Back just used; 0: no layer, the
//                         scene router's turn
//   settled()             resolves once our own steps back have landed (or
//                         after 400 ms), so the next scene's entry is never
//                         the one they pop; null when none is in flight
//   forget()              a scene change: the layers left become plain
//                         duplicate entries
//
// A layer that opens while one of our steps back is still in flight (the
// panel closing as the overlay opens, in one tap) waits for it to land, or
// its new entry would be the one popped.

export function createLayers({ history, index = () => 0, here = () => globalThis.location?.hash || '', setTimer = setTimeout } = {}) {
  const layers = [];
  let seq = 0, ignorePops = 0;
  const popWaiters = [];
  const pendingPush = new Map();   // token → push()
  const api = {
    push() {
      const t = ++seq;
      layers.push(t);
      const push = () => { if (ignorePops && !pendingPush.has(t)) return; pendingPush.delete(t); history.pushState({ i: index(), layer: t }, '', here()); };
      if (!ignorePops) push();
      else { pendingPush.set(t, push); popWaiters.push(() => pendingPush.get(t)?.()); setTimer(() => pendingPush.get(t)?.(), 500); }
      return t;
    },
    popMany(ts) {
      let n = 0;
      for (const t of ts || []) {
        const k = layers.lastIndexOf(t);
        if (k < 0) continue;
        layers.splice(k, 1);
        if (pendingPush.delete(t)) continue;   // its entry was never pushed: nothing to step back over
        n++;
      }
      if (n) { ignorePops++; history.go(-n); }
      return n;
    },
    onPop() {
      if (ignorePops > 0) { ignorePops--; if (!ignorePops) popWaiters.splice(0).forEach((r) => r()); return 'ours'; }
      return layers.length ? layers.pop() : 0;
    },
    settled() { return ignorePops ? new Promise((r) => { popWaiters.push(r); setTimer(r, 400); }) : null; },
    forget() { layers.length = 0; pendingPush.clear(); },
    get open() { return layers.slice(); },
    get inFlight() { return ignorePops; },
  };
  return api;
}

/**
 * Back used layer entry t. A sheet's entry closes that sheet; any other goes
 * to the scene (its blockBack(t) closes the layer that owns t, without
 * stepping history again); and a sheet the scene owned by t never outlives
 * it. Returns 'sheet' or 'scene'.
 */
export function closeLayerOnBack(t, { sheets = null, scene = null } = {}) {
  if (sheets?.back(t)) return 'sheet';
  try { const close = scene?.blockBack; if (typeof close === 'function') close(t); } catch (err) { console.warn(err); }
  sheets?.afterBack(t);
  return 'scene';
}
