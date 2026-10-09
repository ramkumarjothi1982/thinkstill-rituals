/* 020 Thought Train — Reframe · REFRAME · Overthinking / Thought Fusion
 * Mechanism: separating events from interpretations (Beck's cognitive model: the situation versus the automatic thought)
 * plus cognitive defusion (ACT; Hayes, Strosahl & Wilson): sorting what a camera could have recorded from the meaning the
 * mind added loosens fusion with the story. Stories are parked as "maybe", never deleted or "disproved", and a glued
 * carriage ("no reply = they're angry") shows how a fact and a meaning get welded into one thought.
 * Verb: switch (tap FACT or STORY as each carriage rolls up to the signal; a throw on the beat is a perfect throw; tap the
 * glue to decouple a fact from its story). Finale: the facts train leaves Reality Station through a sunset landscape for
 * the next stop the player chose, whistling, and its steam draws a heart in the sky.
 */
(function (env) {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const inOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const outCubic = (t) => 1 - Math.pow(1 - t, 3);
  const outBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  const rgbOf = (c) => { const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(c || ''); return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [128, 128, 128]; };
  const toHex = (r) => '#' + r.map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, k) => { const A = rgbOf(a), B = rgbOf(b); return toHex(A.map((v, i) => v + (B[i] - v) * k)); };
  const rgba = (c, a) => { const A = rgbOf(c); return 'rgba(' + A[0] + ',' + A[1] + ',' + A[2] + ',' + a + ')'; };
  const shade = (c, k) => (k < 0 ? mix(c, '#000000', -k) : mix(c, '#ffffff', k));
  function rr(g, x, y, w, hh, r) { r = Math.max(0, Math.min(r, w / 2, hh / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function ell(g, x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU); g.fill(); }
  /* track geometry: dense polylines with cumulative arc length */
  function bez(p0, p1, p2, p3, n, out) { for (let i = 1; i <= n; i++) { const t = i / n, u = 1 - t; out.push({ x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x, y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y }); } return out; }
  function seg(a, b, n, out) { for (let i = 1; i <= n; i++) out.push({ x: lerp(a.x, b.x, i / n), y: lerp(a.y, b.y, i / n) }); return out; }
  function mkPath(raw) { const P = { pts: [], cum: [], len: 0 }; raw.forEach(p => { const n = P.pts.length; if (n) { const d = Math.hypot(p.x - P.pts[n - 1].x, p.y - P.pts[n - 1].y); if (d < 0.3) return; P.len += d; } P.pts.push({ x: p.x, y: p.y }); P.cum.push(P.len); }); return P; }
  function at(P, s) {
    const pts = P.pts, cum = P.cum, n = pts.length;
    if (s <= 0) { const a = pts[0], b = pts[1], d = cum[1] || 1; return { x: a.x + (b.x - a.x) / d * s, y: a.y + (b.y - a.y) / d * s, a: Math.atan2(b.y - a.y, b.x - a.x) }; }
    if (s >= P.len) { const a = pts[n - 2], b = pts[n - 1], d = (cum[n - 1] - cum[n - 2]) || 1, e = s - P.len; return { x: b.x + (b.x - a.x) / d * e, y: b.y + (b.y - a.y) / d * e, a: Math.atan2(b.y - a.y, b.x - a.x) }; }
    let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
    const a = pts[lo], b = pts[hi], k = (s - cum[lo]) / ((cum[hi] - cum[lo]) || 1);
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, a: Math.atan2(b.y - a.y, b.x - a.x) };
  }
  function offPts(pts, d) { const out = []; for (let i = 0; i < pts.length; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1; out.push({ x: pts[i].x - dy / l * d, y: pts[i].y + dx / l * d }); } return out; }
  /* No GPU (VMs, blocklisted devices): canvas pixels are rasterised on the CPU, so render at 1x and an even 30 fps there. */
  let softMemo = null;
  function softwareGfx() {
    if (softMemo != null) return softMemo;
    try {
      const c = document.createElement('canvas'), gl = c.getContext('webgl');
      if (!gl) return (softMemo = true);
      const ext = gl.getExtension('WEBGL_debug_renderer_info'), r = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
      const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
      return (softMemo = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(r));
    } catch (e) { return (softMemo = false); }
  }
  function poly(g, pts) { if (!pts.length) return; g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y); g.stroke(); }

  /* daily layouts: the model maker's scenery changes every day */
  const LANDS = [
    { key: 'meadow', name: 'Meadow Line', sky: ['#8fd0ff', '#e3f4ff'], grass: ['#8ccf6b', '#6cb556', '#a9de86'], tree: ['#4f9d4a', '#3f8d41', '#6cb75a'], kind: 'round', roof: ['#d95b4a', '#c76a3c', '#e48a4d', '#8b5a9c'], wall: ['#f6ecd8', '#efe1c6'], water: '#5db7e6', back: 'hills', drift: null },
    { key: 'alpine', name: 'Mountain Line', sky: ['#7ec1f2', '#dcefff'], grass: ['#7cc265', '#5ea350', '#98d27f'], tree: ['#2f7a4a', '#3a8a52', '#256a3f'], kind: 'pine', roof: ['#b9473d', '#7a4b33', '#d06a3a'], wall: ['#f3eee6', '#e8dcc8'], water: '#4fa9dd', back: 'peaks', drift: null },
    { key: 'coast', name: 'Seaside Line', sky: ['#86d3ff', '#e8f8ff'], grass: ['#9ad678', '#7cbf63', '#b5e290'], tree: ['#4fa65a', '#62b765', '#3d9050'], kind: 'round', roof: ['#3f8fd1', '#e0573f', '#f0b13a', '#5bb6b0'], wall: ['#ffffff', '#f6f0e4'], water: '#3fb2e0', back: 'sea', sand: '#f2dcaa', drift: null },
    { key: 'snow', name: 'Snow Line', sky: ['#a9cbe9', '#eef5fb'], grass: ['#eef4fa', '#d6e3ef', '#ffffff'], tree: ['#2f6b55', '#3c7a62', '#285c4a'], kind: 'pine', snowy: true, roof: ['#8f3b34', '#5b6f8f', '#a8553a'], wall: ['#f4ead8', '#e9dcc4'], water: '#8cc6e8', back: 'snowpeaks', drift: 'snow' },
    { key: 'blossom', name: 'Blossom Line', sky: ['#9fd6ff', '#fdeef4'], grass: ['#97d47a', '#77bb63', '#b2e292'], tree: ['#f6aecb', '#f08fb6', '#fbd0e0'], kind: 'blossom', roof: ['#c9443b', '#3f5f8f', '#e07a5f'], wall: ['#fbf3ea', '#f3e7da'], water: '#6cc0ec', back: 'hills', drift: 'petal' },
    { key: 'autumn', name: 'Harvest Line', sky: ['#9ccdf0', '#fff1dc'], grass: ['#bccf6d', '#9fb956', '#d3df8c'], tree: ['#e88b35', '#d4592c', '#f1b33d', '#b5432a'], kind: 'round', roof: ['#8a3b2b', '#5d4a3a', '#c2653a'], wall: ['#f7ecd6', '#efdcbc'], water: '#5aaed8', back: 'hills', drift: 'leaf' }
  ];
  /* liveries are earned by conducting skill (tiers), never by chance */
  const LIVERIES = [
    { key: 'heritage', name: 'Heritage Green', body: '#2f6f52', side: '#1f4d39', roof: '#efe6d2', trim: '#d9b45a', boiler: '#2a6249' },
    { key: 'claret', name: 'Royal Claret', body: '#8a2a40', side: '#5f1a2b', roof: '#f1e6d4', trim: '#e7c57d', boiler: '#7a2236' },
    { key: 'midnight', name: 'Midnight Blue', body: '#2a3d82', side: '#1b2858', roof: '#e3e9f4', trim: '#c7cfdf', boiler: '#22336d' },
    { key: 'golden', name: 'Golden Arrow', body: '#efe1bd', side: '#bfa978', roof: '#3a3330', trim: '#c9a227', boiler: '#2e2a28' }
  ];
  const TIER_LIVERY = { Bronze: 'claret', Silver: 'midnight', Gold: 'golden' };
  /* no words: a classic, relatable train to sort (clearly a sample, never about the player) */
  const SAMPLES = [
    { cars: [['fact', 'I texted my friend at 2pm'], ['story', 'They’re annoyed with me'], ['fact', 'It says “read”'], ['story', 'I said something wrong'], ['fact', 'No reply yet'], ['story', 'They’re ignoring me on purpose']], glue: ['No reply for three hours', 'they’re upset with me'] },
    { cars: [['fact', 'My manager wrote “see me later”'], ['story', 'I’m in trouble'], ['fact', 'The email had no smiley'], ['story', 'She’s disappointed in me'], ['fact', 'The meeting is at 3pm'], ['story', 'I’ll get a bad review']], glue: ['She didn’t say hi this morning', 'she’s angry with me'] },
    { cars: [['fact', 'I told a joke at dinner'], ['story', 'Everyone thinks I’m weird'], ['fact', 'Two people didn’t laugh'], ['story', 'I ruined the night'], ['fact', 'Someone changed the subject'], ['story', 'They won’t invite me again']], glue: ['Someone yawned during my story', 'I’m boring'] }
  ];
  const PRACTICE = [[['fact', 'It rained at 9am'], ['story', 'The sky has it in for me']], [['fact', 'The bus came six minutes late'], ['story', 'The universe hates my commute']], [['fact', 'The cat knocked my cup over'], ['story', 'The cat did it to spite me']], [['fact', 'My plant has three yellow leaves'], ['story', 'I’m a terrible plant parent']]];
  const GLUE_EX = [['They didn’t reply', 'they’re angry'], ['She checked her phone', 'I’m boring her'], ['The email had no greeting', 'he’s furious']];
  const GENERIC_LEADS = [['ask', 'Ask one simple question to fill the biggest gap.'], ['prepare', 'Write down what you would do if the worst did happen.'], ['steady', 'Take a ten-minute walk before deciding anything.']];
  const KINDLAB = { ask: 'ASK', prepare: 'PLAN', steady: 'STEADY', help: 'HELP' };
  /* patchwork fields per layout: [ground, rows, crop dots] */
  const FIELDS = {
    meadow: [['#a9d977', '#93c663'], ['#ead27c', '#d6b95c', '#c99a3a'], ['#9f7d58', '#866646'], ['#bba8ea', '#9f8ad8', '#8a6cd0']],
    alpine: [['#94d072', '#7dbd5d'], ['#c9dc84', '#b2c76c'], ['#e2d488', '#cdbd6c']],
    coast: [['#aedd80', '#96ca6a'], ['#f2d98c', '#e0c26e'], ['#c4e6a0', '#a9d488', '#ff8f6b']],
    snow: [['#f4f8fc', '#a99a8c'], ['#eef3f9', '#b8c7d8'], ['#f7f2ea', '#c9a98a', '#d9534a']],
    blossom: [['#f6bdd2', '#ea9fbb', '#ffffff'], ['#aadd88', '#90cb6e'], ['#ffe28e', '#f2ca60']],
    autumn: [['#ebc76c', '#d8ad4c'], ['#b86a3e', '#9c5733', '#f08a24'], ['#bcc86c', '#a2b256']]
  };

  const ICON_CAM = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M11 9.5l2-3h6l2 3" fill="currentColor"/><rect x="4" y="9" width="24" height="17" rx="4.5" fill="currentColor"/><circle cx="16" cy="17.5" r="5.4" fill="none" stroke="rgba(0,60,50,.75)" stroke-width="2.6"/><circle cx="23.6" cy="12.6" r="1.5" fill="rgba(0,60,50,.75)"/></svg>';
  const ICON_CLOUD = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M9.2 24.5h14.6a5.6 5.6 0 0 0 .7-11.2A7.6 7.6 0 0 0 10.2 11a6.8 6.8 0 0 0-1 13.5z" fill="currentColor"/><circle cx="11.8" cy="18.4" r="1.5" fill="rgba(40,20,110,.75)"/><circle cx="16.4" cy="18.4" r="1.5" fill="rgba(40,20,110,.75)"/><circle cx="21" cy="18.4" r="1.5" fill="rgba(40,20,110,.75)"/></svg>';

  const LINES = {
    hello: { Jolly: 'All aboard! Loopie’s been driving your thoughts round the same loop all day.', Cheeky: 'Your thought train’s been doing laps. Loopie’s dizzy. Let’s sort the cargo.', Unfiltered: 'Same loop all day. Time to sort this train.' },
    helloCare: { Jolly: 'All aboard. Let’s gently sort what happened from what your mind is adding.', Cheeky: 'Let’s sort this train carefully: what happened on one track, guesses on the other.', Unfiltered: 'Let’s sort what happened from the guesses.' },
    sample: { Jolly: 'No cargo from you today, so here’s a classic train to sort.', Cheeky: 'No words? I brought a sample train. Suspiciously relatable.', Unfiltered: 'Sample train today. Same rules.' },
    practice: { Jolly: 'Two practice carriages first, then yours.', Cheeky: 'Warm-up carriages first. Then the real cargo.', Unfiltered: 'Two practice ones, then yours.' },
    rule: { Jolly: 'Rule of the line: if a camera could film it, it’s a FACT. If your mind added it, it’s a STORY.', Cheeky: 'Could a camera film it? FACT. Did your brain write it? STORY.', Unfiltered: 'Filmable: FACT. Added by your mind: STORY.' },
    first: { Jolly: 'Throw the switch as it reaches the signal. Right on the beat is a perfect throw.', Cheeky: 'Wait for it to reach the signal, then throw. On the beat if you’re fancy.', Unfiltered: 'Throw it at the signal, on the beat.' },
    fact: { Jolly: ['Fact! A camera could film that. Main line.', 'Fact. Filmable, so it rides the main line.'], Cheeky: ['Fact. Boring, filmable, perfect.', 'Fact. The camera agrees.'], Unfiltered: ['Fact. Main line.', 'Filmable. Fact.'] },
    story: { Jolly: ['Story! That’s meaning your mind added. Off to the Maybe siding.', 'Story. No camera could film that one.'], Cheeky: ['No camera on earth films that. Story.', 'Story. Your brain wrote that bit.'], Unfiltered: ['Story. Siding.', 'Not filmable. Story.'] },
    storyD: { Jolly: 'Story: {d}. A camera can’t film that.', Cheeky: '{d}, spotted. Off to Maybe.', Unfiltered: 'Story. {d}.' },
    toStory: { Jolly: 'Ooh, hang on. A camera could film “{q}”. That’s a fact. Shunting it over.', Cheeky: 'Plot twist: “{q}” is filmable. Fact. Back it goes.', Unfiltered: '“{q}” is filmable. Fact. Rerouting.' },
    toFact: { Jolly: 'Hmm. Could a camera film “{q}”? Not really. That’s story. Rerouting.', Cheeky: 'Cameras can’t film “{q}”. Story. Nice try, though.', Unfiltered: 'Not filmable. Story. Rerouting.' },
    tip: { Jolly: 'Pro move: wait until it reaches the signal, then throw on the beat.', Cheeky: 'Early bird! Try waiting for the signal, then throw on the beat.', Unfiltered: 'Wait for the signal. Throw on the beat.' },
    glued: { Jolly: 'Whoa, this one’s glued: a fact stuck to a story. Tap the glue to split them.', Cheeky: 'Someone superglued a fact to a story. Classic brain move. Tap to unglue.', Unfiltered: 'Fact glued to a story. Unglue it.' },
    locked: { Jolly: 'Can’t route a glued one. Unglue it first.', Cheeky: 'Nope, still glued. Unglue first.', Unfiltered: 'Glued. Unglue first.' },
    split: { Jolly: 'Unglued! “{f}” is what happened. “{s}” is what your mind added.', Cheeky: '“{f}”: filmable. “{s}”: brain fan fiction. Different trains.', Unfiltered: '“{f}”: fact. “{s}”: story.' },
    wait: { Jolly: 'Your call, conductor: fact or story?', Cheeky: 'It’s waiting for you. No rush. Fact or story?', Unfiltered: 'Fact or story?' },
    sum: { Jolly: 'Look: the facts train is just {f} long. The stories wait in the siding as maybes.', Cheeky: 'Facts train: {f}. Maybe siding: {m}. Your brain was doing overtime.', Unfiltered: 'Facts: {f}. Maybes: {m}. That’s the real size of it.' },
    sumStrong: { Jolly: 'Short facts train, but some of it points somewhere real. That deserves a plan, not a brush-off.', Cheeky: 'Fewer facts than it felt like, and some point somewhere real. So: a plan.', Unfiltered: 'Some facts back this up. Make a plan.' },
    sumCare: { Jolly: 'The facts train is short. For the rest, ask someone qualified. The maybes can wait.', Cheeky: 'Facts sorted. The maybes need a qualified pair of eyes, not a guess.', Unfiltered: 'Facts sorted. Get proper advice for the rest.' },
    next: { Jolly: 'Where should the facts train go next? Pick one kind next stop.', Cheeky: 'Pick a destination. Something real, not another lap.', Unfiltered: 'Pick the next stop.' },
    depart: { Jolly: 'Facts train departing! Toot toot!', Cheeky: 'Facts only. Choo choo.', Unfiltered: 'Departing.' },
    newProp: { Jolly: 'The model maker added something to the layout since last time. Spot it?', Cheeky: 'Someone’s been building. Spot what’s new?', Unfiltered: 'New addition on the layout.' }
  };

  (env.games = env.games || []).push({
    id: 'thought-train', mode: 'reframe', name: 'Thought Train', verb: 'switch', family: 'REFRAME', minutes: 2,
    parents: ['Overthinking / Thought Fusion', 'Inner Speech / Mental Text', 'Beliefs / Evidence'],
    cast: ['loopie', 'glitch'], poster: { char: 'loopie', mood: 'think' },
    fonts: ['Alfa+Slab+One', 'Overpass+Mono:wght@600;700'],
    tagline: 'Facts to the main line, stories to the Maybe siding. On the beat.',
    why: 'For a story on repeat: sort what a camera could film from what your mind added.',
    css: `
.g-thought-train { --tt-fact: #2fc7a9; --tt-story: #a38bff; --tt-gold: #ffd24a; --tt-slab: "Alfa Slab One", "Rockwell", "Roboto Slab", "DejaVu Serif", Georgia, serif; --tt-mono: "Overpass Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, "DejaVu Sans Mono", monospace; background: #0d0c10; }
.g-thought-train .tt-board { position: absolute; z-index: 24; top: calc(env(safe-area-inset-top, 0px) + 60px); left: 10px; right: 10px; padding: 9px 12px 10px; border-radius: 14px;
  background: linear-gradient(180deg, #1d1915, #0f0d0b); border: 2px solid #5a4632; box-shadow: 0 0 0 3px #17110c, inset 0 1px 0 rgba(255, 226, 170, .14), 0 14px 30px rgba(0, 0, 0, .45); color: #ffd36b; font-family: var(--tt-mono); }
.g-thought-train .tt-bhead { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 7px; font: 700 12px/1 var(--tt-mono); letter-spacing: .12em; text-transform: uppercase; color: #f3e2c1; }
.g-thought-train .tt-blabel { display: flex; align-items: center; gap: 7px; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.g-thought-train .tt-blabel::before { content: ""; flex: none; width: 8px; height: 8px; border-radius: 50%; background: var(--tt-lamp, #ff6a3d); box-shadow: 0 0 8px var(--tt-lamp, #ff6a3d); animation: thought-train-blink 1.2s steps(2) infinite; }
.g-thought-train .tt-bcount { flex: none; color: #c9b48f; }
.g-thought-train .tt-btext { font: 700 16px/1.42 var(--tt-mono); color: #ffcf45; perspective: 500px; overflow-wrap: anywhere; }
.g-thought-train .tt-btext.tt-sys { color: #a6f2df; }
.g-thought-train .tt-w { display: inline-block; white-space: nowrap; }
.g-thought-train .tt-c { display: inline-block; min-width: .6em; margin: 0 .5px; padding: 0 .5px; text-align: center; border-radius: 2px;
  background: linear-gradient(180deg, #2c2621 0 47%, #0b0908 47% 53%, #241f1a 53%); animation: thought-train-flip .34s cubic-bezier(.3, 1.5, .5, 1) both; animation-delay: calc(var(--i, 0) * 11ms); }
@keyframes thought-train-flip { 0% { transform: rotateX(-88deg); opacity: .15; } 60% { transform: rotateX(14deg); opacity: 1; } 100% { transform: none; } }
@keyframes thought-train-blink { 50% { opacity: .35; } }
.g-thought-train .tt-pad { position: absolute; z-index: 22; display: flex; align-items: center; gap: 10px; padding: 8px 14px 8px 10px; border: 0; border-radius: 18px; cursor: pointer; color: #fff; text-align: left; touch-action: manipulation; -webkit-tap-highlight-color: transparent;
  background: linear-gradient(180deg, var(--c1), var(--c2)); box-shadow: 0 6px 0 var(--c3), 0 14px 26px rgba(0, 0, 0, .34), inset 0 2px 0 rgba(255, 255, 255, .38); transition: transform .07s ease, box-shadow .07s ease, filter .25s ease; }
.g-thought-train .tt-pad.tt-fact { --c1: #45dcbd; --c2: #17a088; --c3: #0c6656; }
.g-thought-train .tt-pad.tt-story { --c1: #b9a2ff; --c2: #7c5be0; --c3: #4a3398; }
.g-thought-train .tt-pad i { flex: none; display: grid; place-items: center; width: 42px; height: 42px; border-radius: 13px; background: rgba(255, 255, 255, .22); color: #fff; }
.g-thought-train .tt-pad i svg { width: 30px; height: 30px; display: block; }
.g-thought-train .tt-pad span { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.g-thought-train .tt-pad b { font: 400 21px/1 var(--tt-slab); letter-spacing: .05em; text-shadow: 0 2px 0 rgba(0, 0, 0, .22); }
.g-thought-train .tt-pad small { font: 700 12px/1.1 var(--font-ui); letter-spacing: .06em; text-transform: uppercase; white-space: nowrap; }
.g-thought-train .tt-pad em { position: absolute; top: -9px; right: -6px; min-width: 26px; padding: 5px 7px; border-radius: 999px; background: #fffaf0; color: #2a1d10; font: 800 13px/1 var(--font-ui); font-style: normal; text-align: center; box-shadow: 0 2px 6px rgba(0, 0, 0, .3); }
.g-thought-train .tt-pad::after { content: ""; position: absolute; inset: -5px; border-radius: 22px; border: 3px solid var(--c1); opacity: var(--beat, 0); pointer-events: none; }
.g-thought-train .tt-pad.down { transform: translateY(5px); box-shadow: 0 1px 0 var(--c3), 0 6px 14px rgba(0, 0, 0, .3), inset 0 2px 0 rgba(255, 255, 255, .38); }
.g-thought-train .tt-pad.off { filter: saturate(.4) brightness(.84); }
.g-thought-train .tt-pad.shake { animation: thought-train-shake .38s ease; }
.g-thought-train .tt-pad:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
@keyframes thought-train-shake { 20% { translate: -5px 0; } 40% { translate: 4px 0; } 60% { translate: -3px 0; } 80% { translate: 2px 0; } }
.g-thought-train .tt-tag { position: absolute; z-index: 20; left: 0; top: 0; max-width: 200px; padding: 5px 10px 5px 16px; border-radius: 5px 10px 10px 5px; background: #fff3d8; color: #3b2814; font: 700 15px/1.2 var(--font-ui); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; box-shadow: 0 4px 10px rgba(0, 0, 0, .32); pointer-events: none; will-change: transform; }
.g-thought-train .tt-tag::before { content: ""; position: absolute; left: 5px; top: 50%; width: 6px; height: 6px; margin-top: -3px; border-radius: 50%; background: #b98b55; }
.g-thought-train .tt-glue { position: absolute; z-index: 23; left: 0; top: 0; width: 72px; height: 72px; margin: -36px 0 0 -36px; border: 0; border-radius: 50%; cursor: pointer; display: grid; place-content: center; gap: 2px; color: #fff; touch-action: manipulation;
  background: radial-gradient(circle at 38% 32%, #ffd6ec, #ff70b8 45%, #c0307e 100%); box-shadow: 0 0 0 4px rgba(255, 255, 255, .6), 0 0 26px rgba(255, 110, 180, .85), 0 8px 18px rgba(0, 0, 0, .35); animation: thought-train-goo 1.1s ease-in-out infinite; }
.g-thought-train .tt-glue b { font: 400 26px/.9 var(--tt-slab); text-align: center; }
.g-thought-train .tt-glue small { font: 800 12px/1 var(--font-ui); letter-spacing: .06em; }
.g-thought-train .tt-glue.hit { animation: thought-train-squish .32s ease; }
@keyframes thought-train-goo { 50% { transform: scale(1.07, .94); } }
@keyframes thought-train-squish { 0% { transform: scale(1.28, .76); } 60% { transform: scale(.9, 1.1); } 100% { transform: none; } }
.g-thought-train .thought-train-pop { position: absolute; z-index: 40; transform: translate(-50%, -50%); white-space: nowrap; pointer-events: none; font: 400 24px/1 var(--tt-slab); letter-spacing: .04em; color: #ffe066; text-shadow: 0 3px 0 #7a4400, 0 0 16px rgba(255, 196, 64, .75); animation: thought-train-pop 1.05s ease-out both; }
.g-thought-train .thought-train-pop.great { color: #c9ffeb; text-shadow: 0 3px 0 #0b5a4b, 0 0 14px rgba(80, 255, 200, .6); font-size: 20px; }
@keyframes thought-train-pop { 0% { opacity: 0; transform: translate(-50%, -30%) scale(.6); } 18% { opacity: 1; transform: translate(-50%, -50%) scale(1.12); } 70% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -120%); } }
.g-thought-train .tt-sum { position: absolute; z-index: 21; transform: translate(-50%, -100%); padding: 7px 12px; border-radius: 999px; background: rgba(18, 15, 12, .92); border: 2px solid var(--c, #ffd24a); color: #fff; font: 700 13px/1 var(--tt-mono); letter-spacing: .08em; white-space: nowrap; pointer-events: none; animation: thought-train-rise .55s cubic-bezier(.2, 1.4, .4, 1) both; }
@keyframes thought-train-rise { from { opacity: 0; transform: translate(-50%, -60%) scale(.8); } to { opacity: 1; transform: translate(-50%, -100%); } }
.g-thought-train .tt-stops { position: absolute; z-index: 25; padding: 10px 12px 12px; border-radius: 16px; background: linear-gradient(180deg, #1d1915, #0f0d0b); border: 2px solid #5a4632; box-shadow: 0 0 0 3px #17110c, 0 18px 36px rgba(0, 0, 0, .5); animation: thought-train-rise2 .5s cubic-bezier(.2, 1.3, .4, 1) both; }
.g-thought-train .tt-stops > b { display: block; margin: 2px 2px 9px; font: 700 12px/1 var(--tt-mono); letter-spacing: .14em; color: #f3e2c1; }
@keyframes thought-train-rise2 { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
.g-thought-train .tt-opt { appearance: none; display: flex; align-items: center; gap: 10px; width: 100%; min-height: 52px; margin-top: 7px; padding: 8px 11px; border-radius: 11px; cursor: pointer; text-align: left;
  background: linear-gradient(180deg, #2b241e, #1b1612); border: 1px solid #6b5338; color: #fff0cc; font: 600 15px/1.3 var(--font-ui); box-shadow: 0 3px 0 #0b0806; transition: transform .1s ease, border-color .2s ease, opacity .25s ease; animation: thought-train-glowopt 1.6s ease-in-out infinite; }
.g-thought-train .tt-opt:nth-of-type(2) { animation-delay: .25s; } .g-thought-train .tt-opt:nth-of-type(3) { animation-delay: .5s; }
.g-thought-train .tt-opt small { flex: none; min-width: 58px; font: 700 12px/1 var(--tt-mono); letter-spacing: .1em; color: var(--tt-fact); }
.g-thought-train .tt-opt:active { transform: translateY(2px); }
.g-thought-train .tt-opt:focus-visible { outline: 3px solid var(--tt-gold); outline-offset: 2px; }
.g-thought-train .tt-opt.pick { border-color: var(--tt-gold); box-shadow: 0 0 0 2px var(--tt-gold), 0 3px 0 #0b0806; animation: none; }
.g-thought-train .tt-opt.gone { opacity: 0; transform: scale(.96); animation: none; }
@keyframes thought-train-glowopt { 50% { border-color: #c9a227; } }
.g-thought-train .tt-dest { position: absolute; z-index: 30; left: 50%; width: min(560px, calc(100% - 28px)); transform: translateX(-50%); padding: 12px 16px 14px; border-radius: 16px; text-align: center; color: #3a2210;
  background: linear-gradient(180deg, #fff7e4, #f4dfb4); box-shadow: 0 0 0 3px #c9a227, 0 16px 34px rgba(40, 10, 30, .5); animation: thought-train-ticket .7s cubic-bezier(.2, 1.4, .4, 1) both; pointer-events: none; }
.g-thought-train .tt-dest small { display: block; font: 400 15px/1 var(--tt-slab); letter-spacing: .22em; color: #b4472a; margin-bottom: 8px; }
.g-thought-train .tt-dest span { display: block; font: 600 17px/1.35 var(--font-ui); text-wrap: balance; }
@keyframes thought-train-ticket { from { opacity: 0; transform: translateX(-50%) translateY(24px) rotate(-2deg); } to { opacity: 1; transform: translateX(-50%); } }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el;
      const inten = clamp(ctx.intensity | 0, 0, 2), visits = K.visits();
      const now = () => performance.now() / 1000;
      let an = ctx.analysis || {};
      const care = () => an.safety === 'care';
      const L = (o, sub) => { let s = ctx.line(care() && o.Jolly ? { Jolly: o.Jolly } : o) || ''; if (sub) Object.keys(sub).forEach(k => { s = s.split('{' + k + '}').join(sub[k]); }); return s; };
      const BPM = [88, 96, 104][inten], BEAT = 60 / BPM, DB = [8, 6, 4][inten], NGLUE = [2, 3, 4][inten];
      const WIN_P = [0.16, 0.12, 0.09][inten], WIN_G = [0.34, 0.26, 0.2][inten];
      const LAND = K.dailyPick(LANDS, 3);
      const owned = K.collection();
      const LIV = LIVERIES.slice().reverse().find(l => l.key === 'heritage' || owned.indexOf('Livery: ' + l.name) >= 0) || LIVERIES[0];
      const bright = () => S.scene() === 'bright';
      const clip = (s, n) => { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); if (s.length <= n) return s; const c = s.slice(0, n - 1), sp = c.lastIndexOf(' '); return (sp > n * 0.55 ? c.slice(0, sp) : c).replace(/[\s,;:–-]+$/, '') + '…'; };
      const short = (s, n) => { const w = String(s || '').replace(/[“”"]/g, '').split(/\s+/).filter(Boolean); return w.length <= n ? w.join(' ') : w.slice(0, n).join(' ') + '…'; };
      const faces = {};
      ['dizzy', 'happy', 'wow', 'celebrate', 'love', 'think'].forEach(m => { const im = new Image(); im.src = K.face('loopie', m); faces[m] = im; });
      let loopie = 'dizzy';

      /* ---------------- world, DOM ---------------- */
      const SOFT = softwareGfx();
      const cv = K.canvas(el, { opaque: true, maxDpr: SOFT ? 1 : 2 });
      const P = K.particles({ max: 280 });
      const bg = document.createElement('canvas'); let bgKey = '';
      const portal = document.createElement('canvas');
      const bLabel = h('span', { class: 'tt-blabel', text: 'SORTING YARD' });
      const bCount = h('span', { class: 'tt-bcount', text: LAND.name.toUpperCase() });
      const bText = h('div', { class: 'tt-btext tt-sys' });
      const board = h('div', { class: 'tt-board' }, h('div', { class: 'tt-bhead' }, bLabel, bCount), bText);
      const live = h('div', { class: 'tsg-sr', 'aria-live': 'polite' });
      const mkPad = (kind) => {
        const fact = kind === 'fact', n = h('em', { text: '0' });
        const b = h('button', { type: 'button', class: 'tt-pad tt-' + kind + ' off', 'aria-label': fact ? 'Fact. Send it to the main line.' : 'Story. Send it to the Maybe siding.' },
          h('i', { html: fact ? ICON_CAM : ICON_CLOUD }), h('span', null, h('b', { text: fact ? 'FACT' : 'STORY' }), h('small', { text: fact ? 'Main line' : 'Maybe siding' })), n);
        b._n = n; K.tap(b, () => call(kind)); return b;
      };
      const padS = mkPad('story'), padF = mkPad('fact');
      const tag = h('div', { class: 'tt-tag gk-user', hidden: true, 'aria-hidden': 'true' });
      const glueBtn = h('button', { type: 'button', class: 'tt-glue', hidden: true, 'aria-label': 'Tap to unglue the fact from the story' }, h('b', { text: '=' }), h('small', { text: 'UNGLUE' }));
      K.tap(glueBtn, () => unglueTap());
      el.append(board, tag, padS, padF, glueBtn, live);
      const glitch = K.character('glitch', { side: 'right', mood: 'smug', size: K.phone() ? 64 : 88, x: 10, y: 600 });
      K.onKey(['ArrowLeft', 'KeyA'], (e) => { e.preventDefault(); call('story'); });
      K.onKey(['ArrowRight', 'KeyD'], (e) => { e.preventDefault(); call('fact'); });

      /* ---------------- sound: a railway shuffle on the same beat grid as the carriages ---------------- */
      const SND = {
        clack(pan, k) { if (!A.ctx) return; const v = 0.03 + 0.045 * k; A.noise({ filter: 'bandpass', freq: 2300, q: 2.4, dur: 0.022, vol: v, pan }); A.tone({ type: 'triangle', freq: 190, to: 140, dur: 0.05, vol: v * 0.7, pan, lp: 800 }); },
        chuff(vol, when) { if (!A.ctx) return; A.noise({ when, pink: true, filter: 'bandpass', freq: 760, to: 360, q: 0.8, dur: 0.17, attack: 0.006, vol }); A.noise({ when, filter: 'highpass', freq: 4200, dur: 0.06, vol: vol * 0.22 }); },
        whistle(len, vol, when) { if (!A.ctx) return; const t = when || A.now(); [[A.note('A5'), 0], [A.note('C#6'), 5], [A.note('E6'), -5]].forEach(([f, d]) => A.tone({ when: t, type: 'triangle', freq: f * 0.975, to: f, glide: 0.09, dur: len, vol: vol * 0.1, attack: 0.05, detune: d, lp: 3400, verb: 0.35 })); A.noise({ when: t, filter: 'bandpass', freq: 2400, q: 1.4, dur: len, attack: 0.05, vol: vol * 0.07 }); },
        toot(n) { if (!A.ctx) return; const notes = ['E5', 'G5', 'A5', 'C6', 'D6', 'E6']; const f = A.note(notes[Math.min(notes.length - 1, n - 1)]); A.tone({ type: 'triangle', freq: f * 0.98, to: f, glide: 0.05, dur: 0.24, vol: 0.06, attack: 0.02, lp: 3200, verb: 0.3 }); A.tone({ type: 'triangle', freq: f * 1.26, dur: 0.24, vol: 0.035, attack: 0.02, lp: 3200 }); },
        clunk(k) { if (!A.ctx) return; A.thud({ vol: 0.22 * k }); A.wood(undefined, 0.18 * k, 0.6); A.tone({ type: 'triangle', freq: 1320, dur: 0.14, vol: 0.03 * k, verb: 0.3 }); },
        locked() { if (!A.ctx) return; const t = A.now(); A.wood(t, 0.2, 0.55); A.wood(t + 0.11, 0.2, 0.5); A.tone({ when: t, type: 'square', freq: 110, dur: 0.2, vol: 0.03, lp: 500 }); },
        clink() { if (!A.ctx) return; const t = A.now(); A.tone({ when: t, type: 'sine', freq: 2650, dur: 0.09, vol: 0.045 }); A.tone({ when: t + 0.05, type: 'sine', freq: 3420, dur: 0.12, vol: 0.035 }); A.noise({ when: t, filter: 'highpass', freq: 5000, dur: 0.03, vol: 0.04 }); },
        hiss(dur, vol) { if (!A.ctx) return; A.noise({ filter: 'highpass', freq: 3600, dur: dur || 0.6, attack: 0.08, vol: vol || 0.04 }); },
        squeal() { if (!A.ctx) return; A.tone({ type: 'sine', freq: 2950, to: 2650, glide: 0.4, dur: 0.45, vol: 0.01, attack: 0.05 }); },
        flap(n) { if (!A.ctx) return; const t = A.now(); for (let i = 0; i < n; i++) A.noise({ when: t + i * 0.021 + Math.random() * 0.01, filter: 'bandpass', freq: 2600 + Math.random() * 1700, q: 3, dur: 0.012, vol: 0.025 + Math.random() * 0.02 }); },
        squelch(k) { if (!A.ctx) return; A.noise({ pink: true, filter: 'lowpass', freq: 650 + k * 180, to: 170, dur: 0.24, vol: 0.13 }); A.tone({ type: 'sine', freq: 320 + k * 70, to: 140, glide: 0.2, dur: 0.24, vol: 0.06 }); },
        bell() { if (!A.ctx) return; const t = A.now(); A.chime(A.note('E6'), { when: t, vol: 0.06, dur: 1.2 }); A.chime(A.note('E6'), { when: t + 0.28, vol: 0.05, dur: 1.4 }); },
        magnet() { if (!A.ctx) return; A.tone({ type: 'sine', freq: 180, to: 520, glide: 0.18, dur: 0.22, vol: 0.03 }); }
      };
      const PROG = [{ r: 'G2', f: 'D3', c: ['G4', 'B4', 'D5'] }, { r: 'E2', f: 'B2', c: ['E4', 'G4', 'B4'] }, { r: 'C3', f: 'G2', c: ['C4', 'E4', 'G4'] }, { r: 'D3', f: 'A2', c: ['D4', 'F#4', 'A4'] }];
      const MEL = [0, 1, 2, 1, 2, 0, 1, 2];
      const MUS = { t0: now(), next: 0, on: false, vol: 0.8, chuff: 0 };
      const beatT = (n) => MUS.t0 + n * BEAT;
      const beatPos = (t) => (t - MUS.t0) / BEAT;
      function playBeat(n, w) {
        const v = MUS.vol, bar = Math.floor(n / 4), b = n % 4, ch = PROG[bar % 4], sw = BEAT * 0.58;
        if (b === 0) A.pluck(A.note(ch.r), { when: w, vol: 0.24 * v, damp: 0.993, lp: 720, bus: 'music' });
        if (b === 2) A.pluck(A.note(ch.f), { when: w, vol: 0.19 * v, damp: 0.992, lp: 720, bus: 'music' });
        if (b === 1 || b === 3) { if (inten > 0) A.brush(w, 0.032 * v, 0.12); ch.c.forEach((nn, i) => A.pluck(A.note(nn), { when: w + i * 0.009, vol: 0.026 * v, damp: 0.982, lp: 2600, bus: 'music' })); }
        A.pluck(A.note(ch.c[MEL[(n * 2) % 8]]), { when: w, vol: 0.05 * v, damp: 0.995, verb: 0.2, bus: 'music' });
        if (b !== 3) A.pluck(A.note(ch.c[MEL[(n * 2 + 1) % 8]]), { when: w + sw, vol: 0.035 * v, damp: 0.995, verb: 0.2, bus: 'music' });
        if (MUS.big && b === 0) ch.c.forEach(nn => A.tone({ when: w, type: 'triangle', freq: A.note(nn) / 2, dur: BEAT * 4, vol: 0.03 * v, attack: 0.4, lp: 1400, verb: 0.4, bus: 'music' }));
        A.shaker(w, 0.012 * v); A.shaker(w + sw, 0.008 * v);
        if (MUS.chuff > 0.03) { SND.chuff(0.075 * MUS.chuff, w); SND.chuff(0.05 * MUS.chuff, w + sw); }
      }
      function musicTick(t) {
        if (!MUS.on || !A.ctx) return;
        if (beatT(MUS.next) < t - 0.06) MUS.next = Math.ceil(beatPos(t - 0.02));
        let guard = 0;
        while (beatT(MUS.next) < t + 0.22 && guard++ < 8) { const n = MUS.next++, w = A.now() + (beatT(n) - t); if (w >= A.now() - 0.01) playBeat(n, Math.max(A.now(), w)); }
      }

      /* ---------------- geometry and layout ---------------- */
      const M = { W: 0, H: 0, ph: true };
      let PA = null, PM = null, PY = null;
      const ST = { phase: 'boot', cars: [], queue: [], active: null, glued: null, back: null, loco: null, rake: { d: 0, from: 0, to: 0, t0: 0, dur: 0 }, pts: { b: 1, to: 1 }, sig: { k: 0, to: 0 },
        fx: [], calls: [], pending: null, taps: 0, k: 0, total: 0, park: { fact: 0, story: 0 }, exp: { fact: 1, story: 1 }, streak: 0, view: 'yard', finished: false, sample: false, leads: [], dest: null, dep: null,
        nag: 0, tagCar: null, tagW: 0, iris: null, misroutes: 0, f: 0, m: 0, tipped: false, glueAt: null };
      const lenOf = (c) => (c.glue ? M.Lc * 2 + 10 : M.Lc);
      function posOn(route, s) { if (s <= M.sJ || !route) return at(PA, s); return at(route === 'fact' ? PM : PY, s - M.sJ); }
      function pose(route, s, len) { const f = posOn(route, s - len * 0.14), b = posOn(route, s - len * 0.86); return { x: (f.x + b.x) / 2, y: (f.y + b.y) / 2, a: Math.atan2(f.y - b.y, f.x - b.x) }; }
      function layout() {
        const W = cv.w, H = cv.h; if (!W || !H) return;
        const ph = W < 700; Object.assign(M, { W, H, ph });
        M.Lc = ph ? 44 : 70; M.gap = ph ? 3 : 5; M.cw = ph ? 18 : 27; M.lo = ph ? 60 : 94; M.ex = ph ? 4.5 : 6.5;
        M.bed = ph ? 15 : 21; M.gauge = ph ? 8 : 11.5; M.slen = ph ? 13 : 18.5; M.sgap = ph ? 6.5 : 8.5; M.joint = ph ? 38 : 54; M.vRun = ph ? 118 : 172;
        if (ph) { Object.assign(board.style, { left: '10px', right: '10px', width: 'auto' }); bText.style.setProperty('--lines', '3'); }
        else { const bw = Math.min(780, W - 140); Object.assign(board.style, { left: Math.round((W - bw) / 2) + 'px', right: 'auto', width: bw + 'px' }); bText.style.setProperty('--lines', '2'); }
        M.boardB = 60 + (ph ? 110 : 88);
        const yq = Math.round(M.boardB + (ph ? 40 : 60));
        const csz = ph ? 64 : 88; M.csz = csz;
        const gTop = ph ? H - 16 - csz - 44 : H - 16 - csz;
        const padH = ph ? 66 : 70, padW = ph ? Math.floor((W - 36) / 2) : 214;
        const padTop = gTop - (ph ? 12 : 10) - padH;
        const yS = Math.round(padTop - (ph ? 34 : 42));
        const J = { x: Math.round(W / 2), y: Math.round(yq + (yS - yq) * 0.64) };
        Object.assign(M, { yq, yS, J, gTop, padTop, padH, padW });
        const xH = Math.round(ph ? W * 0.72 : J.x + Math.min(250, W * 0.2));
        const a = [{ x: W + 1400, y: yq }]; seg(a[0], { x: xH, y: yq }, 140, a);
        const p3 = { x: J.x, y: J.y - (ph ? 86 : 104) };
        bez({ x: xH, y: yq }, { x: lerp(xH, J.x, 0.9), y: yq }, { x: J.x, y: lerp(yq, p3.y, 0.42) }, p3, 64, a);
        seg(p3, J, 24, a);
        PA = mkPath(a);
        M.sJ = PA.len; M.sDec = W + 1400 - xH; M.sStop = M.sJ - (ph ? 52 : 62); M.xH = xH;
        const off = ph ? W * 0.21 : Math.min(270, W * 0.18);
        const xM = Math.round(J.x + off), xY = Math.round(J.x - off);
        const branch = (xb, xEnd) => { const r = [{ x: J.x, y: J.y }]; seg(J, { x: J.x, y: J.y + 10 }, 4, r); bez({ x: J.x, y: J.y + 10 }, { x: J.x, y: lerp(J.y + 10, yS, 0.6) }, { x: lerp(J.x, xb, 0.4), y: yS }, { x: xb, y: yS }, 56, r); const cl = mkPath(r).len; seg({ x: xb, y: yS }, { x: xEnd, y: yS }, Math.max(8, Math.round(Math.abs(xEnd - xb) / 6)), r); return { P: mkPath(r), cl }; };
        const bufX = ph ? 14 : Math.max(40, Math.round(J.x - W * 0.43));
        const bm = branch(xM, W + 900), by = branch(xY, bufX);
        PM = bm.P; PY = by.P;
        const xLoco = W - (ph ? 16 : Math.round(W * 0.07));
        M.sLoco = M.sJ + bm.cl + (xLoco - xM); M.sBuf = M.sJ + PY.len - 2;
        Object.assign(M, { xM, xY, bufX, xLoco });
        pitch();
        Object.assign(padS.style, { width: padW + 'px', height: padH + 'px', top: padTop + 'px', left: (ph ? 12 : Math.round(xY - padW / 2)) + 'px' });
        Object.assign(padF.style, { width: padW + 'px', height: padH + 'px', top: padTop + 'px', left: (ph ? W - 12 - padW : Math.round(xM - padW / 2)) + 'px' });
        glitch.place(ph ? 10 : 24, gTop);
        M.portal = { x: Math.round(W - (ph ? 40 : 96)), y: yq - (ph ? 40 : 58), w: ph ? 60 : 120, h: ph ? 76 : 108 };
        bgKey = '';
        resnap();
        if (ST.stops) placeStops();
      }
      function pitch() {
        if (!PA) return;
        const minF = M.sJ + 24 + M.Lc, fF = M.sLoco - M.lo - M.gap, fS = M.sBuf;
        const nF = Math.max(1, ST.exp.fact + 1), nS = Math.max(1, ST.exp.story + 1);
        M.pF = clamp((fF - minF) / Math.max(1, nF - 1), M.Lc * 0.86, M.Lc + M.gap);
        M.pS = clamp((fS - minF) / Math.max(1, nS - 1), M.Lc * 0.86, M.Lc + M.gap);
        M.first = { fact: fF, story: fS };
      }
      const slotFront = (route, k) => M.first[route] - k * (route === 'fact' ? M.pF : M.pS);
      function layQueue() { let s = M.sDec + ST.rake.d; ST.queue.forEach(c => { c.s = s; s -= lenOf(c) + M.gap; }); }
      function resnap() {
        ST.cars.forEach(c => { if (c.mode === 'parked') c.s = slotFront(c.route, c.slot); });
        if (ST.loco && ST.loco.mode === 'parked') ST.loco.s = M.sLoco;
        layQueue();
      }
      cv.onResize(() => layout());
      S.on('theme', () => { bgKey = ''; });
      try { if (document.fonts) S.listen(document.fonts, 'loadingdone', () => { bgKey = ''; }); } catch (e) { /* no font events */ }

      /* ---------------- the cargo: the player's words, labelled by the reading ---------------- */
      let cid = 0;
      const mkCar = (o) => Object.assign({ id: ++cid, text: '', kind: 'fact', src: 'player', route: null, s: 0, v: 0, mode: 'queue', badge: 0, slot: -1, bog: [null, null], wob: 0, glue: null, half: '' }, o);
      function pickStory(stories) {
        const dq = (Array.isArray(an.distortions) ? an.distortions : []).map(d => String((d && d.quote) || '').toLowerCase()).filter(Boolean);
        const cw = String(an.conclusion || an.thought || '').toLowerCase().replace(/[^a-z’' ]/g, ' ').split(/\s+/).filter(w => w.length > 3);
        let best = stories[stories.length - 1], bs = -1;
        stories.forEach((x, i) => { const t = x.text.toLowerCase(); let sc = i * 0.1; if (dq.some(q => t.indexOf(q) >= 0)) sc += 2; sc += cw.filter(w => t.indexOf(w) >= 0).length * 0.6; if (sc > bs) { bs = sc; best = x; } });
        return best;
      }
      function build() {
        const text = String(ctx.text || '').trim();
        const seen = new Set(), items = [];
        (Array.isArray(an.spans) ? an.spans : []).forEach(x => {
          if (!x || typeof x.quote !== 'string' || x.quote.trim().split(/\s+/).length < 2) return;
          const t = clip(x.quote.trim().replace(/[\s,;:–-]+$/, ''), 96), key = t.toLowerCase();
          if (seen.has(key)) return; seen.add(key);
          items.push({ text: t, kind: x.kind === 'camera' ? 'fact' : 'story', src: 'player' });
        });
        let reg = [], glue = null;
        if (!text || !items.length) {
          const SC = K.dailyPick(SAMPLES, 5); ST.sample = true;
          reg = SC.cars.slice(0, [3, 4, 5][inten]).map(([k, t]) => ({ text: t, kind: k, src: 'sample' }));
          glue = { fact: SC.glue[0], story: SC.glue[1], src: 'sample' };
        } else {
          const facts = items.filter(x => x.kind === 'fact'), stories = items.filter(x => x.kind === 'story');
          if (facts.length && stories.length && items.length >= 3) {
            const gs = pickStory(stories), gi = items.indexOf(gs);
            const gf = items.slice(0, gi).reverse().find(x => x.kind === 'fact') || facts[0];
            glue = { fact: clip(gf.text, 60), story: clip(gs.text, 60), src: 'player' };
            reg = items.filter(x => x !== gs && x !== gf);
          } else {
            reg = items.slice();
            const gen = /^(something happened|this means something bad)/i;
            const fa = facts.length ? facts[facts.length - 1].text : clip(an.situation || '', 60), sa = stories.length ? stories[stories.length - 1].text : clip(an.conclusion || an.thought || '', 60);
            if (fa && sa && !gen.test(fa) && !gen.test(sa) && items.length >= 2) { glue = { fact: clip(fa, 60), story: clip(sa, 60), src: 'player' }; reg = items.filter(x => x.text !== fa && x.text !== sa); }
            else { const ex = K.dailyPick(GLUE_EX, 2); glue = { fact: ex[0], story: ex[1], src: 'example' }; }
          }
          const max = [4, 6, 7][inten];
          if (reg.length > max) { const keep = reg.slice(0, max); ['fact', 'story'].forEach(k => { if (!keep.some(x => x.kind === k)) { const y = reg.find(x => x.kind === k); if (y) keep[keep.length - 1] = y; } }); reg = keep; }
          if (reg.length < 2 && !care()) { const pr = K.dailyPick(PRACTICE, 4); reg = pr.map(([k, t]) => ({ text: t, kind: k, src: 'practice' })).concat(reg); ST.practice = true; }
        }
        const list = reg.map(x => mkCar(x));
        list.splice(Math.ceil(reg.length / 2), 0, mkCar({ kind: 'glued', glue, src: glue.src, text: glue.fact + ' = ' + glue.story }));
        ST.cars = list; ST.queue = list.slice();
        ST.exp.fact = reg.filter(x => x.kind === 'fact').length + 1; ST.exp.story = reg.filter(x => x.kind === 'story').length + 1;
        ST.total = reg.length + 2;
        let ls = (Array.isArray(an.leads) ? an.leads : []).filter(l => l && l.text).map(l => ({ kind: String(l.kind || 'step'), text: clip(l.text, 96) }));
        if (!ls.length) ls = GENERIC_LEADS.map(([k, t]) => ({ kind: k, text: t }));
        if (an.fear_support === 'strong') ls.sort((a, b) => (b.kind === 'prepare') - (a.kind === 'prepare'));
        if (care()) ls.unshift({ kind: 'help', text: 'Get the real facts from someone qualified: a GP, an adviser or a legal service.' });
        ST.leads = ls.slice(0, 3);
        pitch();
      }
      function distFor(c) {
        if (c.src !== 'player') return '';
        const t = c.text.toLowerCase();
        const d = (Array.isArray(an.distortions) ? an.distortions : []).find(x => x && x.quote && x.label && t.indexOf(String(x.quote).toLowerCase()) >= 0);
        return d ? String(d.label) : '';
      }

      /* ---------------- the departure board (split-flap) ---------------- */
      function setBoard(o) {
        bLabel.textContent = o.label || ''; bCount.textContent = o.count || '';
        board.style.setProperty('--tt-lamp', o.lamp || '#ff6a3d');
        bText.className = 'tt-btext' + (o.user ? ' gk-user' : ' tt-sys');
        bText.replaceChildren();
        const words = String(o.text || '').split(/\s+/).filter(Boolean), red = K.reduced();
        let i = 0;
        words.forEach((w, wi) => {
          const ws = h('span', { class: 'tt-w' });
          Array.from(w).forEach(ch => { const c = h('span', { class: 'tt-c', text: ch }); if (red) c.style.animation = 'none'; else c.style.setProperty('--i', String(i)); i++; ws.append(c); });
          bText.append(ws); if (wi < words.length - 1) bText.append(document.createTextNode(' '));
        });
        live.textContent = (o.label ? o.label + ': ' : '') + (o.text || '');
        SND.flap(Math.min(26, 6 + Math.round(i / 4)));
      }

      /* ---------------- juice helpers ---------------- */
      function pop(text, x, y, cls) {
        const e = h('div', { class: 'thought-train-pop' + (cls ? ' ' + cls : ''), text, 'aria-hidden': 'true' });
        e.style.left = clamp(x, 90, M.W - 90) + 'px'; e.style.top = clamp(y, M.boardB + 30, M.H - 60) + 'px';
        el.append(e); K.later(() => e.remove(), 1100);
      }
      function pressPad(p) { p.classList.add('down'); K.later(() => p.classList.remove('down'), 150); }
      function shakePad(p) { p.classList.remove('shake'); void p.offsetWidth; p.classList.add('shake'); }
      function setPads(on) { [padS, padF].forEach(p => p.classList.toggle('off', !on)); }
      const kindCol = (k) => (k === 'fact' ? '#2fc7a9' : '#a38bff');
      function counts() { const n = (k) => ST.cars.filter(c => c.mode === 'parked' && c.route === k && c.src !== 'practice').length; padF._n.textContent = String(n('fact')); padS._n.textContent = String(n('story')); }
      function throwPoints(route, t, auto) {
        const to = route === 'fact' ? 1 : 0;
        if (ST.pts.to !== to) { ST.pts.to = to; if (auto) SND.clunk(0.7); }
        ST.fx.push({ route, t0: t });
      }
      function clearSignal() { ST.sig.to = 1; K.later(() => { ST.sig.to = 0; }, 1500); }

      /* ---------------- the guide on every step ---------------- */
      function guideFor(c) {
        if (c.glue) { K.guide({ id: 'glued-roll', g: 'still', target: () => { const p = pose(null, c.s, lenOf(c)); return { x: p.x, y: p.y }; }, label: 'A GLUED CARRIAGE…', place: 'above', delay: 600 }); return; }
        if (ST.k === 1) {
          const fact = c.kind === 'fact';
          K.guide({ id: 'first', g: 'tap', target: fact ? padF : padS, label: fact ? 'A CAMERA COULD FILM IT' : 'YOUR MIND ADDED IT', place: 'above', delay: 500 });
        } else K.guide({ id: 'call' + c.id, g: 'choose', target: [padS, padF], label: 'FACT OR STORY?', place: 'above', delay: 900 });
      }

      /* ---------------- scheduling: one carriage at a time, arriving on the beat ---------------- */
      const U0 = 0.32, NRM = 1 - U0 / 2;
      const fRoll = (u) => (u < U0 ? u * u / (2 * U0) : u - U0 / 2) / NRM;
      const dRoll = (u) => (u < U0 ? u / U0 : 1) / NRM;
      const TB = Math.min(0.45, 0.3 * DB * BEAT);
      function plan(c, t, mini) {
        const nb = mini ? 2 : DB, mod = mini ? 2 : 4;
        let n = Math.ceil(beatPos(t + 0.35));
        while (((n + nb) % mod + mod) % mod !== 0) n++;
        ST.pending = { c, mini, tRel: beatT(n), tArr: beatT(n + nb) };
        announce(c);
      }
      function announce(c) {
        if (c.src !== 'practice' && ST.practice && !ST.pgone) { ST.pgone = true; ST.cars.filter(o => o.src === 'practice').forEach(o => { if (o.mode === 'parked') K.later(() => poof(o), 400); else o.poofOnPark = true; }); }
        if (c.glue) { setBoard({ label: 'GLUED CARRIAGE', count: 'FACT + STORY?', text: c.text, user: c.src === 'player', lamp: '#ff6fb5' }); return; }
        ST.k++;
        const label = c.half ? (c.half === 'front' ? 'UNGLUED · FRONT HALF' : 'UNGLUED · BACK HALF') : c.src === 'practice' ? 'PRACTICE CARRIAGE' : c.src === 'sample' ? 'SAMPLE TRAIN' : 'NOW APPROACHING';
        setBoard({ label, count: 'CARRIAGE ' + ST.k + ' OF ' + ST.total, text: c.text, user: c.src === 'player', lamp: '#ffb02e' });
      }
      function release(p, t) {
        const c = p.c;
        if (p.mini) { ST.back = c === ST.back ? null : ST.back; }
        else {
          ST.queue.shift();
          ST.rake.d -= lenOf(c) + M.gap; ST.rake.from = ST.rake.d; ST.rake.to = 0; ST.rake.t0 = t + BEAT; ST.rake.dur = BEAT * 1.5;
          SND.clink(); SND.magnet(); const mp = at(PA, M.sDec); P.emit('spark', mp.x, mp.y, 8, { colors: ['#fff3a0', '#ffd24a'] });
        }
        c.mode = 'roll'; c.s0 = c.s; c.s1 = c.glue ? M.sStop - (M.ph ? 40 : 48) : M.sStop; c.tRel = p.tRel; c.tArr = p.tArr;
        ST.active = c;
        if (!c.glue) { ST.tagCar = c; tag.textContent = clip(c.text.replace(/[“”"]/g, ''), M.ph ? 22 : 30); tag.hidden = false; ST.tagW = tag.offsetWidth || 140; }
        else { ST.glued = c; tag.hidden = true; ST.tagCar = null; }
        setPads(!c.glue);
        guideFor(c);
      }
      function schedule(t) {
        if (ST.pending) { if (t >= ST.pending.tRel) { const p = ST.pending; ST.pending = null; release(p, t); } return; }
        if (ST.active) { const c = ST.active; if (c.mode === 'wait' && !c.glue && t > ST.nag) { ST.nag = t + 16; glitch.say(L(LINES.wait), { mood: 'wink', ms: 2600 }); } return; }
        const busy = ST.cars.some(c => (c.mode === 'run' && c.s - lenOf(c) < M.sJ + 6) || c.mode === 'misrouted' || c.mode === 'reverse' || c.mode === 'roll' || c.mode === 'brake');
        if (busy) return;
        if (ST.back) { plan(ST.back, t, true); return; }
        if (ST.queue.length) { plan(ST.queue[0], t, false); return; }
        if (ST.cars.length && ST.cars.every(c => c.mode === 'parked')) summary();
      }

      /* ---------------- the player's call ---------------- */
      function call(kind) {
        const t = now(), pad = kind === 'fact' ? padF : padS;
        pressPad(pad);
        if (ST.phase !== 'sort') { K.sfx.tap(); return; }
        const c = ST.active;
        if (!c || c.route || !(c.mode === 'roll' || c.mode === 'brake' || c.mode === 'wait') || t < c.tRel - 0.05) { K.sfx.tap(); SND.clunk(0.4); shakePad(pad); return; }
        if (c.glue) { K.sfx.no(); SND.locked(); shakePad(padS); shakePad(padF); glitch.say(L(LINES.locked), { mood: 'smug', ms: 2200 }); return; }
        K.sfx.lock(); SND.clunk(1);
        const dtc = t - c.tArr, adt = Math.abs(dtc);
        const grade = c.mode === 'wait' ? 'waited' : adt <= WIN_P ? 'perfect' : adt <= WIN_G ? 'great' : dtc < 0 ? 'early' : 'late';
        const ok = kind === c.kind;
        c.route = kind; c.correct = ok; ST.active = null; setPads(false);
        throwPoints(kind, t, false); clearSignal();
        if (ok) { c.slot = ST.park[kind]++; c.target = slotFront(kind, c.slot); }
        else { c.target = Math.max(M.sJ + M.Lc * 0.7 + 12, Math.min(M.sJ + M.Lc + 34, slotFront(kind, ST.park[kind]) - 2)); ST.misroutes++; }
        c.v = Math.max(0, c.v); c.mode = 'run';
        ST.calls.push({ ok, grade, dt: dtc, src: c.src });
        ctx.track('call', { k: ST.calls.length, ok: ok ? 1 : 0, ms: Math.round(dtc * 1000), g: grade });
        const sp = at(PA, M.sStop);
        if (grade === 'perfect') { ST.streak++; pop('PERFECT THROW!', sp.x, sp.y - 46); SND.toot(ST.streak); K.sfx.sparkle(); P.emit('star', sp.x, sp.y, 18, { colors: ['#fff6c8', '#ffd24a', kindCol(kind)] }); }
        else if (grade === 'great') { ST.streak = Math.max(0, ST.streak - 1); pop('GREAT THROW', sp.x, sp.y - 46, 'great'); P.emit('spark', sp.x, sp.y, 12, { colors: ['#e9fff6', kindCol(kind)] }); }
        else { ST.streak = 0; P.emit('spark', sp.x, sp.y, 7, { colors: ['#fff3c4', kindCol(kind)] }); }
        if (ok) explain(c, grade);
        else glitch.face('think', 1600);
        K.guide(null);
        if (grade === 'early' && !ST.tipped && ST.calls.length < 4) { ST.tipped = true; K.later(() => { if (ST.phase === 'sort') glitch.say(L(LINES.tip), { mood: 'wink', ms: 3200 }); }, 2700); }
      }
      function explain(c, grade) {
        let line;
        if (c.kind === 'fact') line = L(LINES.fact);
        else { const d = distFor(c); line = d ? L(LINES.storyD, { d }) : L(LINES.story); }
        glitch.say(line, { mood: grade === 'perfect' ? 'cool' : c.kind === 'fact' ? 'happy' : 'wink', ms: 2600 });
        glitch.react('bounce');
      }
      function teach(c) {
        const q = short(c.text, 5);
        glitch.say(L(c.kind === 'fact' ? LINES.toStory : LINES.toFact, { q }), { mood: 'think', ms: 3800 });
        K.sfx.soft();
      }
      function onWait(c, t) {
        if (c.glue) {
          glueBtn.hidden = false; ST.glueAt = t;
          glitch.say(L(LINES.glued), { mood: 'surprised', ms: 4600 }); glitch.react('shake');
          SND.squelch(0); K.sfx.glitch();
          K.guide({ id: 'glue', g: 'tap', target: glueBtn, label: 'TAP TO UNGLUE', place: 'above', delay: 700 });
        } else { SND.hiss(0.5, 0.03); ST.nag = t + 6; }
      }
      function unglueTap() {
        const c = ST.glued;
        if (!c || c.mode !== 'wait' || ST.phase !== 'sort') return;
        ST.taps++; c.wob = 1;
        K.sfx.pop(undefined, 300 + ST.taps * 90); SND.squelch(ST.taps);
        glueBtn.classList.remove('hit'); void glueBtn.offsetWidth; glueBtn.classList.add('hit');
        const p = jointPos(c); P.emit('drop', p.x, p.y, 10, { colors: ['#ff8fc8', '#ffc2e2', '#ff5fa8'] });
        glitch.face(ST.taps >= NGLUE ? 'wow' : 'determined', 700);
        if (ST.taps >= NGLUE) split(c, now());
        else K.guide({ id: 'glue' + ST.taps, g: 'tap', target: glueBtn, label: 'KEEP TAPPING', place: 'above', delay: 900 });
      }
      function jointPos(c) { const p = posOn(null, c.s - M.Lc - 5); return { x: p.x, y: p.y + M.ex * 0.5 }; }
      function split(c, t) {
        glueBtn.hidden = true; K.guide(null);
        const i = ST.cars.indexOf(c);
        const front = mkCar({ text: c.glue.fact, kind: 'fact', src: c.src, half: 'front' }), back = mkCar({ text: c.glue.story, kind: 'story', src: c.src, half: 'back' });
        front.s = c.s + 2; back.s = c.s - M.Lc - 14; front.mode = 'hold'; back.mode = 'hold';
        ST.cars.splice(i, 1, front, back); ST.active = null; ST.glued = null; ST.back = back;
        const p = jointPos(c);
        K.sfx.pop(); if (A.ctx) { A.pop({ vol: 0.2, freq: 380 }); A.noise({ pink: true, filter: 'lowpass', freq: 900, to: 200, dur: 0.3, vol: 0.12 }); }
        P.emit('drop', p.x, p.y, 26, { colors: ['#ff8fc8', '#ffc2e2', '#ff5fa8', '#ffffff'], speed: [80, 240] }); P.emit('star', p.x, p.y, 10, { colors: ['#fff', '#ffd0ec'] });
        glitch.say(L(LINES.split, { f: short(front.text, 5), s: short(back.text, 5) }), { mood: 'celebrate', ms: 5600 });
        ctx.track('unglue', { taps: ST.taps });
        plan(front, t + 1.4, true);
      }

      /* ---------------- vehicles ---------------- */
      function runTo(c, dt, target, dir) {
        const rem = (target - c.s) * dir;
        if (rem <= 0.4) { c.s = target; c.v = 0; return true; }
        const vStop = Math.sqrt(2 * 160 * rem);
        const sp = Math.max(Math.min(c.vmax || M.vRun, Math.abs(c.v) + 190 * dt, vStop), Math.min(14, vStop));
        c.v = sp * dir; c.s += c.v * dt;
        if ((target - c.s) * dir <= 0) { c.s = target; c.v = 0; return true; }
        return false;
      }
      let lastClack = 0;
      function clacks(c, t, len, route) {
        const s0 = c.s - len * 0.14, s1 = c.s - len * 0.86;
        [s0, s1].forEach((s, i) => { const j = Math.floor(s / M.joint); if (c.bog[i] !== j) { if (c.bog[i] != null && Math.abs(c.v) > 6 && t - lastClack > 0.045) { lastClack = t; const p = posOn(route, s); SND.clack(clamp(p.x / M.W * 2 - 1, -0.8, 0.8), clamp(Math.abs(c.v) / 120, 0.3, 1)); } c.bog[i] = j; } });
      }
      function poof(c) {
        if (ST.cars.indexOf(c) < 0) return;
        const p = pose(c.route, c.s, lenOf(c));
        P.emit('smoke', p.x, p.y, 12, { colors: ['rgba(255,255,255,0.75)'], speed: [20, 70], size: [6, 12] }); P.emit('star', p.x, p.y, 8, { colors: ['#fff6c8', '#ffd24a'] });
        if (A.ctx) A.whoosh({ vol: 0.07, dur: 0.35 });
        const route = c.route, slot = c.slot;
        ST.cars.splice(ST.cars.indexOf(c), 1); ST.park[route] = Math.max(0, ST.park[route] - 1);
        ST.cars.forEach(o => { if (o.route === route && o.slot > slot && (o.mode === 'parked' || o.mode === 'run')) { o.slot--; o.target = slotFront(route, o.slot); if (o.mode === 'parked') { o.mode = 'run'; o.v = 0; } } });
        counts();
      }
      function arrive(c, t) {
        if (c.route !== c.kind) { c.mode = 'misrouted'; c.misT = t; SND.squeal(); teach(c); return; }
        const re = c.badge >= 1;
        c.mode = 'parked'; c.v = 0; SND.clink(); if (!re) K.sfx.tap();
        if (c.poofOnPark) { c.poofOnPark = false; K.later(() => poof(c), 600); }
        const p = posOn(c.route, c.s); P.emit('dust', p.x, p.y, 5, { colors: ['rgba(230,225,210,0.6)'] });
        if (ST.tagCar === c) { tag.hidden = true; ST.tagCar = null; }
        counts();
      }
      function updCar(c, dt, t) {
        const len = lenOf(c);
        if (c.mode === 'parked' && c.badge < 1) c.badge = Math.min(1, c.badge + dt * 2.6);
        c.wob = Math.max(0, c.wob - dt * 2.2);
        switch (c.mode) {
          case 'roll': {
            if (t < c.tRel) { c.v = 0; break; }
            const T = Math.max(0.2, c.tArr - c.tRel), u = clamp((t - c.tRel) / T, 0, 1);
            c.s = c.s0 + (c.s1 - c.s0) * fRoll(u); c.v = (c.s1 - c.s0) / T * dRoll(u);
            if (!c.route && t >= c.tArr - TB) { c.dec = c.v * c.v / (2 * Math.max(1, c.s1 - c.s)); c.mode = 'brake'; }
            break;
          }
          case 'brake': c.v = Math.max(0, c.v - c.dec * dt); c.s = Math.min(c.s1, c.s + c.v * dt); if (c.v < 1 || c.s >= c.s1 - 0.3) { c.s = c.s1; c.v = 0; c.mode = 'wait'; onWait(c, t); } break;
          case 'run': if (runTo(c, dt, c.target, 1)) arrive(c, t); break;
          case 'misrouted': if (t - c.misT > 2.8) { c.mode = 'reverse'; c.target = M.sJ - 8; SND.hiss(0.4, 0.03); } break;
          case 'reverse': if (runTo(c, dt, c.target, -1)) { c.route = c.kind; throwPoints(c.kind, t, true); c.slot = ST.park[c.kind]++; c.target = slotFront(c.kind, c.slot); c.mode = 'run'; c.v = 0; } break;
          default: break;
        }
        clacks(c, t, len, c.route);
      }
      function updLoco(lo, dt, t) {
        if (lo.mode === 'run') { if (runTo(lo, dt, M.sLoco, 1)) { lo.mode = 'parked'; lo.arrived && lo.arrived(); } }
        const moving = Math.abs(lo.v) > 4;
        if (moving) { lo.trail = (lo.trail || 0) + Math.abs(lo.v) * dt; if (lo.trail > 11) { lo.trail = 0; const c = locoChim(lo); P.emit('smoke', c.x, c.y, 1, { colors: ['rgba(255,255,255,0.55)'], speed: [6, 18] }); } }
        else if (t - (lo.idle || 0) > 1.3) { lo.idle = t; const c = locoChim(lo); P.emit('smoke', c.x, c.y, 1, { colors: ['rgba(255,255,255,0.35)'], speed: [4, 10] }); }
        clacks(lo, t, M.lo, lo.route);
      }
      function locoChim(lo) { const p = posOn(lo.route, lo.s - M.lo * 0.13); return { x: p.x, y: p.y - M.ex - 3 }; }

      /* ---------------- flow ---------------- */
      async function arriveTrain() {
        ST.phase = 'arrive';
        const total = ST.queue.reduce((a, c) => a + lenOf(c) + M.gap, 0);
        const startD = -((M.W - M.xH) + 140 + M.lo);
        ST.rake.d = startD; ST.rake.from = startD; ST.rake.to = 0; ST.rake.t0 = now(); ST.rake.dur = K.reduced() ? 1.2 : 3.4; ST.rake.ease = outCubic;
        ST.loco = { s: 0, v: 0, route: null, mode: 'rake', bog: [null, null] };
        MUS.chuff = 1; SND.whistle(0.7, 1);
        void total;
        await K.wait(K.reduced() ? 1300 : 3500);
        ST.rake.ease = null; MUS.chuff = 0; SND.hiss(0.9, 0.05);
        loopie = 'dizzy';
        glitch.say(L(care() ? LINES.helloCare : LINES.hello), { mood: 'smug', ms: 4200 });
        await K.wait(2600);
        if (ST.sample) glitch.say(L(LINES.sample), { mood: 'wink', ms: 3400 });
        else if (ST.practice) glitch.say(L(LINES.practice), { mood: 'wink', ms: 3000 });
        // the locomotive uncouples and steams down to Reality Station: the main line, demonstrated
        SND.clink(); const lo = ST.loco; lo.route = 'fact'; lo.mode = 'run'; lo.v = 0; lo.vmax = M.vRun * 0.95; MUS.chuff = 0.8;
        ST.pts.to = 1; SND.clunk(0.8); clearSignal(); ST.fx.push({ route: 'fact', t0: now() });
        setBoard({ label: 'FIRST STOP', count: 'MAIN LINE', text: 'REALITY STATION: FACTS ONLY', user: false, lamp: '#2fc7a9' });
        await new Promise(res => { lo.arrived = res; S.later(res, 9000); });
        lo.route = 'fact'; lo.mode = 'parked'; lo.v = 0; MUS.chuff = 0; loopie = 'happy';
        SND.whistle(0.35, 0.8); SND.hiss(0.7, 0.04); SND.bell();
        glitch.say(L(LINES.rule), { mood: 'nerd', ms: 5200 });
        await K.wait(1600);
        ST.phase = 'sort';
        K.later(() => { if (ST.phase === 'sort' && ST.calls.length === 0) glitch.say(L(LINES.first), { mood: 'determined', ms: 4400 }); }, 3800);
      }
      function summary() {
        if (ST.phase !== 'sort') return;
        ST.phase = 'summary'; K.guide(null); setPads(false); tag.hidden = true; ST.tagCar = null;
        const mine = (k) => ST.cars.filter(c => c.mode === 'parked' && c.route === k && c.src !== 'practice').length;
        const f = mine('fact'), m = mine('story'); ST.f = f; ST.m = m;
        const fc = (n) => n + ' carriage' + (n === 1 ? '' : 's');
        setBoard({ label: 'REALITY STATION', count: 'ALL SORTED', text: f + ' FACT' + (f === 1 ? '' : 'S') + ' · ' + m + ' MAYBE' + (m === 1 ? '' : 'S'), user: false, lamp: '#2fc7a9' });
        const chip = (txt, col, s, route) => { const p = posOn(route, s); const e = h('div', { class: 'tt-sum', text: txt, style: { '--c': col } }); e.style.left = clamp(p.x, 70, M.W - 70) + 'px'; e.style.top = (p.y - (M.ph ? 18 : 24)) + 'px'; el.append(e); ST.chips = (ST.chips || []).concat([e]); };
        const facts = ST.cars.filter(c => c.mode === 'parked' && c.route === 'fact' && c.src !== 'practice'), stories = ST.cars.filter(c => c.mode === 'parked' && c.route === 'story' && c.src !== 'practice');
        const midS = (arr, extra) => { const ss = arr.map(c => c.s - M.Lc / 2).concat(extra || []); return ss.length ? (Math.min(...ss) + Math.max(...ss)) / 2 : M.sJ + 60; };
        chip('FACTS · ' + f, '#2fc7a9', midS(facts, [M.sLoco - M.lo / 2]), 'fact');
        chip('MAYBE · ' + m, '#a38bff', midS(stories), 'story');
        const strong = an.fear_support === 'strong';
        glitch.say(L(care() ? LINES.sumCare : strong ? LINES.sumStrong : LINES.sum, { f: fc(f), m: fc(m) }), { mood: 'celebrate', ms: 5400 });
        glitch.react('bounce'); SND.bell(); loopie = 'wow';
        ctx.track('sorted', { f, m, mis: ST.misroutes });
        K.later(nextStop, K.reduced() ? 2600 : 4800);
      }
      function placeStops() {
        const e = ST.stops; if (!e) return;
        if (M.ph) Object.assign(e.style, { left: '12px', right: '12px', width: 'auto', top: (M.yq - 6) + 'px' });
        else { const w = Math.min(600, M.W - 160); Object.assign(e.style, { left: Math.round((M.W - w) / 2) + 'px', right: 'auto', width: w + 'px', top: (M.yq + 4) + 'px' }); }
      }
      function nextStop() {
        if (ST.phase !== 'summary') return;
        ST.phase = 'nextstop';
        const box = h('div', { class: 'tt-stops', role: 'group', 'aria-label': 'Choose the next stop' }, h('b', { text: 'CHOOSE THE NEXT STOP' }));
        ST.leads.forEach((l, i) => { const b = h('button', { type: 'button', class: 'tt-opt' }, h('small', { text: KINDLAB[l.kind] || 'NEXT' }), h('span', { text: l.text })); K.tap(b, () => pickStop(i, b)); box.append(b); });
        el.append(box); ST.stops = box; placeStops();
        glitch.say(L(LINES.next), { mood: 'idea', ms: 4400 });
        K.guide({ id: 'stop', g: 'choose', target: () => { const b = box.querySelector('.tt-opt'); if (!b) return null; const r = K.rectIn(b); return { x: r.x + r.w * 0.62, y: r.cy }; }, label: 'PICK THE NEXT STOP', place: 'above', delay: 900 });
      }
      function pickStop(i, b) {
        if (ST.phase !== 'nextstop') return;
        ST.phase = 'depart'; ST.dest = ST.leads[i]; K.guide(null);
        (ST.chips || []).forEach(e => { e.style.animation = 'none'; e.style.transition = 'opacity .35s'; e.style.opacity = '0'; K.later(() => e.remove(), 400); }); ST.chips = [];
        K.sfx.great(); SND.flap(18); b.classList.add('pick');
        ST.stops.querySelectorAll('.tt-opt').forEach(x => { if (x !== b) x.classList.add('gone'); });
        ctx.track('stop', { kind: ST.dest.kind });
        K.later(() => { if (ST.stops) { ST.stops.remove(); ST.stops = null; } setBoard({ label: 'NEXT STOP', count: 'DEPARTING', text: ST.dest.text, user: false, lamp: '#2fc7a9' }); depart(); }, 750);
      }
      async function depart() {
        glitch.say(L(LINES.depart), { mood: 'celebrate', ms: 3200 }); loopie = 'celebrate';
        SND.whistle(0.8, 1); await K.wait(520); SND.whistle(0.45, 0.9);
        const train = [ST.loco].concat(ST.cars.filter(c => c.mode === 'parked' && c.route === 'fact'));
        train.forEach(v => { v.mode = 'depart'; v.s00 = v.s; });
        ST.dep = { d: 0, v: 0, list: train };
        const t0 = now();
        while (now() - t0 < 6) {
          await K.wait(80);
          const rear = train.reduce((a, v) => (v.s < a.s ? v : a), train[0]);
          if (posOn('fact', rear.s - M.Lc).x > M.W + 20) break;
        }
        ST.iris = { t0: now(), dir: 1, x: M.W - 10, y: M.yS };
        await K.wait(K.reduced() ? 250 : 650);
        startPano();
        ST.iris = { t0: now(), dir: -1, x: M.W * 0.42, y: M.H * 0.62 };
        await K.wait(K.reduced() ? 3000 : 7600);
        finishGame();
      }
      function finishGame() {
        if (ST.finished) return; ST.finished = true;
        const calls = ST.calls, n = Math.max(1, calls.length);
        const acc = calls.filter(c => c.ok).length / n;
        const tv = { perfect: 1, great: 0.75, early: 0.35, late: 0.3, waited: 0.15 };
        const tim = calls.reduce((a, c) => a + (tv[c.grade] || 0.2), 0) / n;
        const tier = K.tier(0.55 * acc + 0.45 * tim, [0.45, 0.68, 0.86]);
        const perfect = calls.filter(c => c.grade === 'perfect').length;
        const near = calls.filter(c => c.grade !== 'waited' && Math.abs(c.dt) <= 0.45);
        const badges = [];
        if (tier) badges.push(tier + ' conductor');
        if (near.length >= 3) { const ms = Math.round(near.reduce((a, c) => a + Math.abs(c.dt), 0) / near.length * 1000); const b = K.best('throw-ms', ms, 'lower'); if (b.isNew) badges.push('New best: ' + ms + ' ms from the beat'); else if (b.first) badges.push('Smoothest throws: ' + ms + ' ms from the beat'); }
        const lk = tier && TIER_LIVERY[tier];
        if (lk) { const lv = LIVERIES.find(x => x.key === lk); const col = K.collect('Livery: ' + lv.name); if (col.isNew) badges.push('Unlocked: ' + lv.name + ' livery'); }
        const line = K.collect('Line: ' + LAND.name);
        if (line.isNew) badges.push('Collected: ' + LAND.name + ' (' + Math.min(LANDS.length, line.items.filter(x => /^Line: /.test(x)).length) + '/' + LANDS.length + ')');
        const f = ST.f, m = ST.m;
        ctx.track('done', { f, m, perfect, tier: tier || 'none' });
        ctx.finish({
          title: 'The facts train has left', mood: 'celebrate',
          lines: [f + ' fact' + (f === 1 ? '' : 's') + ' on the main line, ' + m + ' stor' + (m === 1 ? 'y' : 'ies') + ' parked as maybe', 'Perfect throws: ' + perfect + ' of ' + calls.length, 'Next stop: ' + clip(ST.dest ? ST.dest.text : '', 70)],
          share: 'Sorted my thoughts into facts and stories. The facts train was ' + f + ' carriage' + (f === 1 ? '' : 's') + ' long.',
          badges: badges.slice(0, 4)
        });
      }

      /* ---------------- the static diorama (rendered once, tilt-shifted) ---------------- */
      const glow = (c) => K.glowSprite(c);
      function renderBg() {
        const W = M.W, H = M.H, dpr = cv.dpr || 1, br = bright();
        const key = W + 'x' + H + ':' + dpr + ':' + (br ? 'b' : 'd');
        if (bgKey === key) return; bgKey = key;
        bg.width = Math.max(2, Math.round(W * dpr)); bg.height = Math.max(2, Math.round(H * dpr));
        const g = bg.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const R = K.rng(LAND.key + ':' + Math.round(W) + 'x' + Math.round(H));
        const hz = Math.round(M.yq - (M.ph ? 36 : 54)); M.hz = hz;
        const lights = [];
        SIGNQ.length = 0;
        backdrop(g, W, hz, br, R);
        const gg = g.createLinearGradient(0, hz, 0, H);
        gg.addColorStop(0, shade(LAND.grass[1], -0.06)); gg.addColorStop(0.28, LAND.grass[0]); gg.addColorStop(1, shade(LAND.grass[0], 0.06));
        g.fillStyle = gg; g.fillRect(0, hz, W, H - hz);
        g.save(); g.globalAlpha = 0.22; for (let i = 0; i < 7; i++) g.drawImage(glow(LAND.grass[2]), R() * W - 130, hz + R() * (H - hz) - 90, 260, 180);
        g.globalAlpha = 0.14; for (let i = 0; i < 5; i++) g.drawImage(glow(shade(LAND.grass[1], -0.25)), R() * W - 110, hz + R() * (H - hz) - 70, 220, 140); g.restore();
        g.fillStyle = shade(LAND.grass[1], -0.32); g.fillRect(0, hz - 1, W, 4);
        for (let i = 0, n = Math.round(W * (H - hz) / 140); i < n; i++) { const x = R() * W, y = hz + R() * (H - hz); g.fillStyle = R() < 0.5 ? rgba(shade(LAND.grass[1], -0.12), 0.38) : rgba(LAND.grass[2], 0.5); g.fillRect(x, y, 1.4 + R() * 1.8, 1 + R() * 0.8); }
        if (LAND.sand) { g.fillStyle = LAND.sand; g.beginPath(); g.moveTo(0, hz); g.lineTo(W * 0.62, hz); g.quadraticCurveTo(W * 0.3, hz + 40, 0, hz + (M.ph ? 70 : 90)); g.closePath(); g.fill(); }
        const pond = M.ph ? { x: W * 0.22, y: lerp(M.yq, M.J.y, 0.48), rx: W * 0.15, ry: W * 0.085 } : { x: M.J.x - W * 0.29, y: lerp(M.yq, M.J.y, 0.52), rx: Math.min(130, W * 0.1), ry: Math.min(70, W * 0.055) };
        M.pond = pond;
        const st = { x: M.xM + 4, y: M.yS - M.bed / 2 - 5, w: W - M.xM - (M.ph ? 10 : 30), d: M.ph ? 17 : 26, hh: M.ph ? 24 : 38 };
        const shw = Math.max(56, Math.min(M.ph ? 120 : 200, M.xY - M.bufX - 18)), sh = { x: M.bufX + 6 + (M.ph ? 0 : 20), y: M.yS - M.bed / 2 - 5, w: shw, d: M.ph ? 15 : 22, hh: M.ph ? 20 : 30 };
        const sb = { x: M.J.x - (M.ph ? 66 : 104), y: M.J.y - (M.ph ? 16 : 26), w: M.ph ? 26 : 40, d: M.ph ? 13 : 20, hh: M.ph ? 18 : 28 };
        const plat = { x: M.xM - 8, y: M.yS + M.bed / 2 + 3, w: W - M.xM + 8, h: M.ph ? 15 : 22 };
        M.station = st; M.shed = sh;
        const plan = planScenery(R, hz, pond, st, sh, sb, plat);
        plan.fields.forEach(f => drawFieldP(g, f, R));
        plan.lanes.forEach(l => drawLane(g, l));
        drawPond(g, pond, br);
        [PA, PM, PY].forEach(Pp => drawTrack(g, Pp));
        const sp = at(PA, M.sStop), nx = -Math.sin(sp.a), ny = Math.cos(sp.a);
        g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(sp.x - nx * M.bed * 0.6, sp.y - ny * M.bed * 0.6); g.lineTo(sp.x + nx * M.bed * 0.6, sp.y + ny * M.bed * 0.6); g.stroke();
        const dp = at(PA, M.sDec);
        g.save(); g.translate(dp.x, dp.y); g.rotate(dp.a); g.fillStyle = '#f4c52a'; g.fillRect(-7, -M.gauge / 2 + 1, 14, M.gauge - 2); g.fillStyle = '#2a2420'; for (let i = -6; i < 7; i += 4) { g.beginPath(); g.moveTo(i, -M.gauge / 2 + 1); g.lineTo(i + 2, 0); g.lineTo(i, M.gauge / 2 - 1); g.lineTo(i + 1.2, M.gauge / 2 - 1); g.lineTo(i + 3.2, 0); g.lineTo(i + 1.2, -M.gauge / 2 + 1); g.closePath(); g.fill(); } g.restore();
        sign(g, dp.x + 2, M.yq - M.bed / 2 - 18, ['HUMP'], '#f4c52a', '#2a2420', 12);
        g.fillStyle = 'rgba(20,30,10,0.25)'; g.fillRect(plat.x + 2, plat.y + 3, plat.w, plat.h);
        g.fillStyle = br ? '#cfc9be' : '#b9b2a8'; g.fillRect(plat.x, plat.y, plat.w, plat.h);
        g.fillStyle = '#f2c94c'; g.fillRect(plat.x, plat.y + 1.5, plat.w, 2);
        for (let x = plat.x + 10; x < plat.x + plat.w - 6; x += 22) { g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(x, plat.y + 4, 1, plat.h - 4); }
        for (let i = 0, n = M.ph ? 4 : 7; i < n; i++) { const x = plat.x + 16 + R() * (plat.w - 30), y = plat.y + plat.h * 0.62; person(g, x, y, ['#e05a4a', '#3f7fd1', '#f0b13a', '#6a4c9c', '#2f9a7a'][i % 5]); }
        lamp(g, plat.x + plat.w * 0.35, plat.y + 6, lights); lamp(g, plat.x + plat.w * 0.8, plat.y + 6, lights);
        station(g, st, lights, br); shed(g, sh, lights);
        const bp = at(PY, PY.len - 1);
        g.fillStyle = 'rgba(20,30,10,0.3)'; g.fillRect(bp.x - 4, bp.y - M.bed / 2 + 2, 6, M.bed + 2);
        g.fillStyle = '#c6302c'; g.fillRect(bp.x - 5, bp.y - M.bed / 2 - 1, 5, M.bed + 2); g.fillStyle = '#fff'; for (let y = bp.y - M.bed / 2; y < bp.y + M.bed / 2; y += 5) g.fillRect(bp.x - 5, y, 5, 2.4);
        lights.push({ x: bp.x - 2.5, y: bp.y - M.bed / 2 - 3, c: '#ff5a4a', r: 12 });
        house(g, sb.x + sb.w / 2, sb.y, sb.w, sb.d, sb.hh, '#8e5a3a', '#3f4a5c', lights, true);
        M.chimneys = [];
        plan.objs.sort((a, b) => a.y - b.y).forEach(o => drawObj(g, o, lights, R));
        bokeh(g, W, H, R);
        if (!br) {
          const mg = g.createLinearGradient(0, hz, 0, H); mg.addColorStop(0, '#585daa'); mg.addColorStop(1, '#8a86c4');
          g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = mg; g.fillRect(0, hz - 2, W, H - hz + 2); g.restore();
          g.save(); g.globalCompositeOperation = 'lighter';
          lights.forEach(l => { const r = l.r || 14; g.globalAlpha = 0.85; g.drawImage(glow(l.c || '#ffcf7a'), l.x - r, l.y - r, r * 2, r * 2); });
          g.restore();
          lights.forEach(l => { if (l.win) { g.fillStyle = '#ffd98a'; g.fillRect(l.win[0], l.win[1], l.win[2], l.win[3]); } });
        } else {
          g.save(); g.globalCompositeOperation = 'screen'; const sw = g.createRadialGradient(W * 0.08, hz, 10, W * 0.08, hz, Math.max(W, H) * 0.9); sw.addColorStop(0, 'rgba(255,236,190,0.42)'); sw.addColorStop(1, 'rgba(255,236,190,0)'); g.fillStyle = sw; g.fillRect(0, 0, W, H); g.restore();
        }
        SIGNQ.splice(0).forEach(f => f());
        g.fillStyle = br ? '#7a4e2d' : '#3e2716'; g.fillRect(0, H - 9, W, 9); g.fillStyle = 'rgba(255,220,170,0.25)'; g.fillRect(0, H - 9, W, 1.5);
        const vg = g.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.32, W / 2, H * 0.55, Math.max(W, H) * 0.78);
        vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, br ? 'rgba(50,35,20,0.22)' : 'rgba(5,4,24,0.45)');
        g.fillStyle = vg; g.fillRect(0, 0, W, H);
        tiltShift(g, W, H, dpr);
        renderPortal(br);
      }
      function backdrop(g, W, hz, br, R) {
        const sky = g.createLinearGradient(0, 0, 0, hz);
        if (br) { sky.addColorStop(0, LAND.sky[0]); sky.addColorStop(1, LAND.sky[1]); } else { sky.addColorStop(0, '#1b1a44'); sky.addColorStop(0.55, '#55407c'); sky.addColorStop(1, '#ef8d6c'); }
        g.fillStyle = sky; g.fillRect(0, 0, W, hz + 2);
        if (!br) { g.fillStyle = 'rgba(255,255,255,0.8)'; for (let i = 0; i < 40; i++) g.fillRect(R() * W, R() * hz * 0.6, 1.2, 1.2); }
        const far = br ? mix(LAND.sky[0], '#4f6f91', 0.5) : '#4b3767', mid = br ? mix(LAND.grass[1], LAND.sky[1], 0.45) : '#3a2c50';
        if (LAND.back === 'sea') {
          const sy = hz - Math.min(70, hz * 0.4); const sg = g.createLinearGradient(0, sy, 0, hz); sg.addColorStop(0, br ? '#3aa7de' : '#3b4f8a'); sg.addColorStop(1, br ? '#7fd0f2' : '#c9788a');
          g.fillStyle = sg; g.fillRect(0, sy, W, hz - sy);
          g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1.2; for (let i = 0; i < 14; i++) { const x = R() * W, y = sy + 6 + R() * (hz - sy - 8); g.beginPath(); g.moveTo(x, y); g.lineTo(x + 10 + R() * 14, y); g.stroke(); }
          const lx = W * 0.86, ly = sy + 8; g.fillStyle = '#f4f1ea'; g.fillRect(lx - 4, ly - 30, 8, 30); g.fillStyle = '#d6453a'; g.fillRect(lx - 4, ly - 22, 8, 6); g.fillRect(lx - 4, ly - 10, 8, 6); g.fillStyle = '#ffe9a0'; g.fillRect(lx - 3, ly - 36, 6, 6);
        } else ridge(g, W, hz, far, R, LAND.back === 'peaks' || LAND.back === 'snowpeaks', LAND.back === 'snowpeaks' || LAND.back === 'peaks');
        hillsBand(g, W, hz, mid, R);
        for (let i = 0; i < 5; i++) cloud(g, R() * W, 10 + R() * hz * 0.45, 16 + R() * 24, br ? 'rgba(255,255,255,0.88)' : 'rgba(255,200,190,0.28)');
      }
      function ridge(g, W, hz, col, R, jag, snow) {
        const base = hz + 2, top = Math.max(6, hz - Math.min(120, hz * 0.75));
        const pts = []; let x = -40; while (x < W + 60) { const peak = jag ? lerp(top, base - 14, R() * 0.6) : lerp(top + (base - top) * 0.35, base - 10, R()); pts.push({ x, y: peak }); x += jag ? 50 + R() * 70 : 90 + R() * 80; }
        g.fillStyle = col; g.beginPath(); g.moveTo(-40, base); pts.forEach((p, i) => { if (jag) g.lineTo(p.x, p.y); else { const q = pts[i - 1] || { x: p.x - 80, y: p.y }; g.quadraticCurveTo((q.x + p.x) / 2, Math.min(q.y, p.y) - 18, p.x, p.y); } if (jag) g.lineTo(p.x + 30 + R() * 20, lerp(p.y, base, 0.45)); }); g.lineTo(W + 60, base); g.closePath(); g.fill();
        if (snow && jag) { g.fillStyle = 'rgba(255,255,255,0.92)'; pts.forEach(p => { g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + 11, p.y + 13); g.lineTo(p.x + 4, p.y + 10); g.lineTo(p.x - 2, p.y + 15); g.lineTo(p.x - 10, p.y + 11); g.closePath(); g.fill(); }); }
      }
      function hillsBand(g, W, hz, col, R) { g.fillStyle = col; g.beginPath(); g.moveTo(-20, hz + 2); let x = -20; while (x < W + 40) { const nx = x + 70 + R() * 90; g.quadraticCurveTo((x + nx) / 2, hz - 10 - R() * 26, nx, hz + 2); x = nx; } g.closePath(); g.fill(); }
      function cloud(g, x, y, r, col) { g.fillStyle = col; ell(g, x, y, r * 1.2, r * 0.48); ell(g, x - r * 0.55, y + r * 0.08, r * 0.62, r * 0.38); ell(g, x + r * 0.5, y - r * 0.12, r * 0.7, r * 0.45); }
      function drawPond(g, p, br) {
        g.fillStyle = shade(LAND.grass[1], -0.22); ell(g, p.x + 1, p.y + 2, p.rx + 5, p.ry + 4);
        const wg = g.createLinearGradient(0, p.y - p.ry, 0, p.y + p.ry); wg.addColorStop(0, shade(LAND.water, -0.18)); wg.addColorStop(1, shade(LAND.water, 0.18));
        g.fillStyle = wg; ell(g, p.x, p.y, p.rx, p.ry);
        if (LAND.snowy) { g.fillStyle = 'rgba(235,246,255,0.75)'; ell(g, p.x, p.y, p.rx * 0.96, p.ry * 0.94); g.strokeStyle = 'rgba(150,190,220,0.8)'; g.lineWidth = 1; for (let i = 0; i < 5; i++) { const a = i * 1.3; g.beginPath(); g.moveTo(p.x + Math.cos(a) * p.rx * 0.2, p.y + Math.sin(a) * p.ry * 0.2); g.lineTo(p.x + Math.cos(a + 0.3) * p.rx * 0.6, p.y + Math.sin(a + 0.3) * p.ry * 0.55); g.lineTo(p.x + Math.cos(a + 0.1) * p.rx * 0.85, p.y + Math.sin(a + 0.1) * p.ry * 0.8); g.stroke(); } }
        g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1.4; g.beginPath(); g.ellipse(p.x - p.rx * 0.2, p.y - p.ry * 0.25, p.rx * 0.5, p.ry * 0.38, 0, Math.PI * 1.1, Math.PI * 1.6); g.stroke();
        if (!LAND.snowy) { g.fillStyle = '#5c9a3f'; [[0.45, 0.2], [0.55, 0.35], [-0.5, 0.3]].forEach(([a, b]) => { ell(g, p.x + p.rx * a, p.y + p.ry * b, 4, 2.6); }); }
        g.strokeStyle = shade(LAND.grass[1], -0.3); g.lineWidth = 1.2; for (let i = 0; i < 7; i++) { const x = p.x - p.rx * 0.9 + i * 3, y = p.y + p.ry * 0.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 1 + (i % 2) * 2, y - 9); g.stroke(); }
        if (!br) { /* moon reflection */ g.fillStyle = 'rgba(255,240,210,0.5)'; ell(g, p.x + p.rx * 0.3, p.y, 5, 1.6); }
      }
      function drawFieldP(g, f, R) {
        const hedge = LAND.snowy ? '#3f6f5f' : shade(LAND.key === 'autumn' ? '#6f8a3a' : LAND.kind === 'blossom' ? '#4f8f45' : LAND.tree[0], -0.2);
        const jit = () => (R() - 0.5) * 9;
        const c = [{ x: -f.w / 2 + jit(), y: -f.h / 2 + jit() }, { x: f.w / 2 + jit(), y: -f.h / 2 + jit() }, { x: f.w / 2 + jit(), y: f.h / 2 + jit() }, { x: -f.w / 2 + jit(), y: f.h / 2 + jit() }];
        const path = () => { g.beginPath(); g.moveTo(c[0].x, c[0].y); for (let i = 1; i < 4; i++) g.lineTo(c[i].x, c[i].y); g.closePath(); };
        g.save(); g.translate(f.x + f.w / 2, f.y + f.h / 2); g.rotate(f.rot);
        g.save(); g.translate(2, 3); path(); g.fillStyle = 'rgba(20,35,10,0.18)'; g.fill(); g.restore();
        g.save(); path(); g.clip();
        g.fillStyle = f.k[0]; g.fillRect(-f.w, -f.h, f.w * 2, f.h * 2);
        g.strokeStyle = f.k[1]; g.lineWidth = 2.6;
        if (f.rows) for (let y = -f.h / 2 - 6; y < f.h / 2 + 6; y += 6.5) { g.beginPath(); g.moveTo(-f.w, y); g.lineTo(f.w, y + 3); g.stroke(); }
        else for (let x = -f.w / 2 - 6; x < f.w / 2 + 6; x += 6.5) { g.beginPath(); g.moveTo(x, -f.h); g.lineTo(x + 3, f.h); g.stroke(); }
        if (f.k[2]) { g.fillStyle = f.k[2]; for (let i = 0, n = Math.round(f.w * f.h / 90); i < n; i++) { g.beginPath(); g.arc(-f.w / 2 + R() * f.w, -f.h / 2 + R() * f.h, 1.7, 0, TAU); g.fill(); } }
        const lg = g.createLinearGradient(0, -f.h / 2, 0, f.h / 2); lg.addColorStop(0, 'rgba(255,255,255,0.16)'); lg.addColorStop(1, 'rgba(0,0,0,0.06)'); g.fillStyle = lg; g.fillRect(-f.w, -f.h, f.w * 2, f.h * 2);
        g.restore();
        const top = LAND.snowy ? '#ffffff' : shade(hedge, 0.3);
        for (let i = 0; i < 4; i++) {
          const a = c[i], b = c[(i + 1) % 4], Ln = Math.hypot(b.x - a.x, b.y - a.y);
          for (let d = 0; d < Ln; d += 4.2) { const x = a.x + (b.x - a.x) * d / Ln, y = a.y + (b.y - a.y) * d / Ln, r = 2.3 + R() * 1.3; g.fillStyle = 'rgba(20,35,10,0.22)'; g.beginPath(); g.arc(x + 1.2, y + 1.6, r, 0, TAU); g.fill(); g.fillStyle = hedge; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); if (R() < 0.6) { g.fillStyle = top; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.35, r * 0.45, 0, TAU); g.fill(); } }
        }
        if (f.bales) { for (let i = 0; i < 3; i++) { const bx = -f.w * 0.3 + i * f.w * 0.28, by = -f.h * 0.05 + (i % 2) * f.h * 0.22; g.fillStyle = 'rgba(40,30,10,0.25)'; ell(g, bx + 2, by + 3, 5, 2.5); g.fillStyle = '#e6c46a'; ell(g, bx, by, 4.6, 3.6); g.strokeStyle = '#b8923e'; g.lineWidth = 1; g.beginPath(); g.arc(bx, by, 2, 0, TAU); g.stroke(); } }
        g.restore();
      }
      function drawLane(g, l) {
        g.save(); g.lineCap = 'round';
        g.strokeStyle = LAND.snowy ? '#c4ccd8' : '#b39a6c'; g.lineWidth = (M.ph ? 6 : 8) + 2; g.beginPath(); g.ellipse(l.x, l.y, l.rx, l.ry, 0, 0, TAU); g.stroke();
        g.strokeStyle = LAND.snowy ? '#e4e9f0' : '#dcc694'; g.lineWidth = M.ph ? 6 : 8; g.stroke();
        g.fillStyle = shade(LAND.grass[0], 0.08); ell(g, l.x, l.y, l.rx - 6, l.ry - 6);
        g.restore();
      }
      function bokeh(g, W, H, R) {
        const cols = LAND.key === 'blossom' ? ['#f39bbd', '#5f9f4f', '#3f7f3f', '#fbd0df'] : LAND.key === 'autumn' ? ['#d9622f', '#7c8f3a', '#e8913a'] : LAND.snowy ? ['#eef3fa', '#3c6e5a', '#cfdbe8'] : ['#3f8a3c', '#5aa84c', '#2f6f35', '#ffd36b'];
        const n = M.ph ? 10 : 18;
        for (let i = 0; i < n; i++) { const x = (i + R() * 0.9) / n * W, y = H - 2 - R() * 26, r = (M.ph ? 26 : 38) * (0.7 + R() * 0.8); g.globalAlpha = 0.95; g.drawImage(glow(cols[Math.floor(R() * cols.length)]), x - r, y - r, r * 2, r * 2); }
        g.globalAlpha = 1;
      }
      function drawTrack(g, Pp) {
        const pts = Pp.pts.filter(p => p.x > -60 && p.x < M.W + 60 && p.y > -60 && p.y < M.H + 60);
        if (pts.length < 2) return;
        g.lineCap = 'round'; g.lineJoin = 'round';
        g.strokeStyle = 'rgba(30,40,20,0.28)'; g.lineWidth = M.bed + 6; poly(g, pts.map(p => ({ x: p.x + 1.5, y: p.y + 2.5 })));
        g.strokeStyle = LAND.snowy ? '#b9bcc6' : '#9a9184'; g.lineWidth = M.bed + 3; poly(g, pts);
        g.strokeStyle = LAND.snowy ? '#cfd3dc' : '#b5ab9c'; g.lineWidth = M.bed - 2; poly(g, pts);
        const s0 = Pp.cum[Pp.pts.indexOf(pts[0])] || 0, s1 = Pp.cum[Pp.pts.indexOf(pts[pts.length - 1])] || Pp.len;
        g.fillStyle = '#6b4a35';
        for (let s = s0; s < s1; s += M.sgap) { const p = at(Pp, s); g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillRect(-1.5, -M.slen / 2, 3, M.slen); g.restore(); }
        const l = offPts(pts, M.gauge / 2), r = offPts(pts, -M.gauge / 2);
        g.lineCap = 'butt';
        g.strokeStyle = '#5f646c'; g.lineWidth = 2.6; poly(g, l.map(p => ({ x: p.x, y: p.y + 0.8 }))); poly(g, r.map(p => ({ x: p.x, y: p.y + 0.8 })));
        g.strokeStyle = '#dfe3ea'; g.lineWidth = 1.4; poly(g, l); poly(g, r);
      }
      const SIGNQ = [];
      function sign(g, x, y, lines, bgc, ink, fs, now2) {
        if (!now2) { SIGNQ.push(() => sign(g, x, y, lines, bgc, ink, fs, true)); return null; }
        g.font = '400 ' + fs + 'px "Alfa Slab One", Rockwell, "Roboto Slab", "DejaVu Serif", Georgia, serif';
        const w = Math.max(...lines.map(s => g.measureText(s).width)) + 10, hh = lines.length * (fs + 3) + 6;
        g.fillStyle = 'rgba(20,20,10,0.3)'; rr(g, x - w / 2 + 2, y + 2, w, hh, 3); g.fill();
        g.fillStyle = bgc; rr(g, x - w / 2, y, w, hh, 3); g.fill();
        g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; rr(g, x - w / 2, y, w, hh, 3); g.stroke();
        g.fillStyle = ink; g.textAlign = 'center'; g.textBaseline = 'top';
        lines.forEach((s, i) => g.fillText(s, x, y + 4 + i * (fs + 3)));
        return { w, h: hh };
      }
      function person(g, x, y, c) { g.fillStyle = 'rgba(0,0,0,0.2)'; ell(g, x + 1.5, y + 1.5, 3, 1.4); g.fillStyle = c; rr(g, x - 2.2, y - 6, 4.4, 6, 1.6); g.fill(); g.fillStyle = '#f2c9a0'; g.beginPath(); g.arc(x, y - 7.4, 1.9, 0, TAU); g.fill(); }
      function lamp(g, x, y, lights) { g.strokeStyle = '#3a3a40'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 16); g.stroke(); g.fillStyle = '#fff2c4'; g.beginPath(); g.arc(x, y - 17, 2.2, 0, TAU); g.fill(); lights.push({ x, y: y - 17, c: '#ffd27a', r: 16 }); }
      function house(g, x, y, w, d, hh, wall, roof, lights, plain) {
        g.fillStyle = 'rgba(25,35,15,0.28)'; g.beginPath(); g.moveTo(x - w / 2 + 3, y); g.lineTo(x + w / 2 + hh * 0.5, y + hh * 0.18); g.lineTo(x + w / 2 + hh * 0.5 - 2, y - d + 4); g.lineTo(x + w / 2, y - d); g.closePath(); g.fill();
        g.fillStyle = wall; g.fillRect(x - w / 2, y - hh, w, hh);
        g.fillStyle = shade(wall, -0.12); g.fillRect(x - w / 2, y - 3, w, 3);
        g.fillStyle = roof; g.beginPath(); g.moveTo(x - w / 2 - 2, y - hh); g.lineTo(x + w / 2 + 2, y - hh); g.lineTo(x + w / 2 - 1, y - hh - d); g.lineTo(x - w / 2 + 1, y - hh - d); g.closePath(); g.fill();
        g.fillStyle = shade(roof, 0.18); g.fillRect(x - w / 2 + 1, y - hh - d, w - 2, 2.2);
        g.fillStyle = shade(roof, -0.2); g.fillRect(x - w / 2 - 2, y - hh - 1.5, w + 4, 1.5);
        const ww = Math.max(3, w * 0.16), wh = Math.max(3, hh * 0.28);
        [[x - w * 0.28, y - hh * 0.62], [x + w * 0.12, y - hh * 0.62]].forEach(([wx, wy]) => { g.fillStyle = '#5b7f9a'; g.fillRect(wx, wy, ww, wh); lights.push({ x: wx + ww / 2, y: wy + wh / 2, c: '#ffcf7a', r: 9, win: [wx, wy, ww, wh] }); });
        if (!plain) { g.fillStyle = shade(wall, -0.35); g.fillRect(x + w * 0.3 - 2, y - hh * 0.45, 4, hh * 0.45); g.fillStyle = '#7a5a48'; g.fillRect(x + w * 0.22, y - hh - d * 0.75, 3, d * 0.6 + 2); return { cx: x + w * 0.22 + 1.5, cy: y - hh - d * 0.75 }; }
        return null;
      }
      function station(g, s, lights, br) {
        house(g, s.x + s.w / 2, s.y, s.w, s.d, s.hh, '#f3e6cc', '#4c5d78', lights, true);
        g.fillStyle = '#7b2f2a'; g.fillRect(s.x + s.w / 2 - 4, s.y - s.hh * 0.55, 8, s.hh * 0.55);
        g.fillStyle = '#fff'; g.beginPath(); g.arc(s.x + s.w / 2, s.y - s.hh - s.d * 0.45, M.ph ? 4.5 : 6, 0, TAU); g.fill(); g.strokeStyle = '#333'; g.lineWidth = 1; g.stroke();
        g.beginPath(); g.moveTo(s.x + s.w / 2, s.y - s.hh - s.d * 0.45); g.lineTo(s.x + s.w / 2, s.y - s.hh - s.d * 0.45 - 3); g.moveTo(s.x + s.w / 2, s.y - s.hh - s.d * 0.45); g.lineTo(s.x + s.w / 2 + 2.2, s.y - s.hh - s.d * 0.45); g.stroke();
        const lines = M.ph ? ['REALITY', 'STATION'] : ['REALITY STATION'];
        sign(g, s.x + s.w / 2, s.y - s.hh - s.d - (M.ph ? 36 : 24), lines, '#fff6e2', '#1f5a4c', M.ph ? 12 : 14);
        void br;
      }
      function shed(g, s, lights) {
        house(g, s.x + s.w / 2, s.y, s.w, s.d, s.hh, '#cdb08a', '#8d6fd8', lights, true);
        g.fillStyle = '#3f2c22'; g.fillRect(s.x + s.w * 0.62, s.y - s.hh * 0.8, s.w * 0.22, s.hh * 0.8);
        g.fillStyle = '#a07a52'; for (let i = 0; i < 3; i++) g.fillRect(s.x + 3 + i * 7, s.y + 2, 6, 5);
        sign(g, s.x + s.w / 2, s.y - s.hh - s.d - (M.ph ? 36 : 24), M.ph ? ['MAYBE', 'SIDING'] : ['MAYBE SIDING'], '#efe6ff', '#4a2f9e', M.ph ? 12 : 14);
      }
      function planScenery(R, hz, pond, st, sh, sb, plat) {
        const W = M.W, H = M.H, ph = M.ph, CS = 6;
        const gw = Math.ceil(W / CS) + 2, gh = Math.ceil(H / CS) + 2, occ = new Uint8Array(gw * gh);
        const cell = (v) => Math.floor(v / CS);
        const mark = (x0, y0, x1, y1, v) => { const a = Math.max(0, cell(x0)), b = Math.min(gw - 1, cell(x1)), c = Math.max(0, cell(y0)), d = Math.min(gh - 1, cell(y1)); for (let y = c; y <= d; y++) for (let x = a; x <= b; x++) if (occ[y * gw + x] < v) occ[y * gw + x] = v; };
        const free = (x0, y0, x1, y1) => { if (x0 < 2 || x1 > W - 2 || y0 < hz + 4 || y1 > H - 6) return false; const a = Math.max(0, cell(x0)), b = Math.min(gw - 1, cell(x1)), c = Math.max(0, cell(y0)), d = Math.min(gh - 1, cell(y1)); for (let y = c; y <= d; y++) for (let x = a; x <= b; x++) if (occ[y * gw + x]) return false; return true; };
        [PA, PM, PY].forEach(Pp => { for (let s = 0; s < Pp.len; s += 3) { const p = at(Pp, s); if (p.x < -30 || p.x > W + 30) continue; const r = M.bed / 2 + 6; mark(p.x - r, p.y - r, p.x + r, p.y + r, 1); } });
        const signH = ph ? 40 : 30;
        [{ x: st.x - 6, y: st.y - st.hh - st.d - signH - 6, w: st.w + 12, h: st.hh + st.d + signH + 10 },
          { x: sh.x - 6, y: sh.y - sh.hh - sh.d - signH - 6, w: sh.w + 12, h: sh.hh + sh.d + signH + 10 },
          { x: sb.x - 6, y: sb.y - sb.hh - sb.d - 8, w: sb.w + 12, h: sb.hh + sb.d + 12 },
          { x: plat.x - 4, y: plat.y - 4, w: plat.w + 8, h: plat.h + 12 },
          { x: pond.x - pond.rx - 10, y: pond.y - pond.ry - 10, w: pond.rx * 2 + 20, h: pond.ry * 2 + 18 },
          { x: M.portal.x - 20, y: M.portal.y - 10, w: W, h: M.portal.h + 20 },
          { x: at(PA, M.sStop).x + 4, y: at(PA, M.sStop).y - 46, w: 30, h: 52 },
          { x: at(PA, M.sDec).x - 30, y: M.yq - M.bed / 2 - 22, w: 60, h: 22 }
        ].forEach(q => mark(q.x, q.y, q.x + q.w, q.y + q.h, 2));
        const padL = ph ? 12 : Math.round(M.xY - M.padW / 2), padR = ph ? W - 12 - M.padW : Math.round(M.xM - M.padW / 2);
        mark(padL - 4, M.padTop - 4, padL + M.padW + 4, M.padTop + M.padH + 8, 2); mark(padR - 4, M.padTop - 4, padR + M.padW + 4, M.padTop + M.padH + 8, 2);
        mark(0, M.gTop - 6, (ph ? 10 : 24) + M.csz + 8, H, 2);
        const fields = [], lanes = [], objs = [];
        const FK = FIELDS[LAND.key] || FIELDS.meadow;
        for (let i = 0, tries = 0; i < (ph ? 3 : 7) && tries < 320; tries++) {
          const w = Math.round((ph ? 66 : 124) * (0.75 + R() * 0.55)), hh = Math.round((ph ? 38 : 70) * (0.75 + R() * 0.5));
          const x = 4 + R() * (W - w - 8), y = hz + 8 + R() * (H - hz - hh - 30);
          if (!free(x - 8, y - 8, x + w + 8, y + hh + 8)) continue;
          const k = FK[Math.floor(R() * FK.length)];
          fields.push({ x, y, w, h: hh, k, rows: R() < 0.5, rot: (R() - 0.5) * 0.12, bales: (LAND.key === 'meadow' || LAND.key === 'alpine') && /^#e[0-9a-f]/i.test(k[0]) });
          mark(x - 4, y - 4, x + w + 4, y + hh + 4, 3); i++;
        }
        const pickTree = () => (LAND.kind === 'pine' ? 'pine' : LAND.kind === 'blossom' ? (R() < 0.75 ? 'blossom' : 'tree') : (LAND.key !== 'coast' && R() < 0.15 ? 'pine' : 'tree'));
        const vr = ph ? 38 : 76;
        for (let tries = 0; tries < 200; tries++) {
          const cx = vr + 12 + R() * (W - 2 * vr - 24), cy = hz + vr * 0.5 + 30 + R() * (H - hz - vr - 90);
          if (!free(cx - vr - 10, cy - vr * 0.55 - 26, cx + vr + 10, cy + vr * 0.55 + 10)) continue;
          lanes.push({ x: cx, y: cy, rx: vr * 0.86, ry: vr * 0.5 });
          const n = ph ? 5 : 8;
          for (let i = 0; i < n; i++) {
            const a = -Math.PI + (i + 0.5) / n * TAU + (R() - 0.5) * 0.3, w = (ph ? 15 : 27) * (0.9 + R() * 0.35);
            objs.push({ t: (!ph && i === 2) ? 'steeple' : 'house', x: cx + Math.cos(a) * vr * 0.86, y: cy + Math.sin(a) * vr * 0.5 + w * 0.32, w, r: w, wall: LAND.wall[Math.floor(R() * LAND.wall.length)], roof: LAND.roof[Math.floor(R() * LAND.roof.length)] });
          }
          objs.push({ t: pickTree(), x: cx, y: cy + 6, s: ph ? 8 : 11, c: LAND.tree[0] });
          mark(cx - vr - 10, cy - vr * 0.55 - 26, cx + vr + 10, cy + vr * 0.55 + 10, 3);
          break;
        }
        const s0 = ph ? 8.5 : 13;
        const tryTree = (x, y, s) => { if (!free(x - s * 0.8, y - s * 2.05, x + s * 0.8, y + s * 0.2)) return false; objs.push({ t: pickTree(), x, y, s, c: LAND.tree[Math.floor(R() * LAND.tree.length)] }); mark(x - s * 0.55, y - s * 1.8, x + s * 0.55, y - s * 0.1, 3); return true; };
        for (let gi = 0, tries = 0; gi < (ph ? 5 : 15) && tries < 400; tries++) {
          const cx = 10 + R() * (W - 20), cy = hz + 26 + R() * (H - hz - 50);
          if (!tryTree(cx, cy, s0 * (0.9 + R() * 0.4))) continue;
          gi++;
          for (let i = 0, n = 3 + Math.floor(R() * (ph ? 6 : 9)), at2 = 0; i < n && at2 < 50; at2++) { const s = s0 * (0.65 + R() * 0.6); if (tryTree(cx + (R() + R() - 1) * s0 * 3.4, cy + (R() + R() - 1) * s0 * 2.2, s)) i++; }
        }
        for (let i = 0, tries = 0; i < (ph ? 8 : 26) && tries < 400; tries++) { if (tryTree(8 + R() * (W - 16), hz + 18 + R() * (H - hz - 40), s0 * (0.7 + R() * 0.5))) i++; }
        for (let i = 0, tries = 0; i < (ph ? 16 : 36) && tries < 400; tries++) {
          const x = 6 + R() * (W - 12), y = hz + 10 + R() * (H - hz - 30);
          if (!free(x - 5, y - 4, x + 5, y + 4)) continue;
          objs.push({ t: R() < 0.55 ? 'bush' : 'flowers', x, y, r: 5, c: LAND.tree[Math.floor(R() * LAND.tree.length)] }); mark(x - 4, y - 3, x + 4, y + 3, 3); i++;
        }
        if (visits >= 1 && fields[0]) { const f = fields[0]; for (let i = 0; i < 3; i++) objs.push({ t: 'sheep', x: f.x + f.w * (0.25 + i * 0.25), y: f.y + f.h * (0.4 + (i % 2) * 0.28), r: 4 }); }
        return { fields, lanes, objs };
      }
      function drawObj(g, o, lights, R) {
        if (o.t === 'tree' || o.t === 'blossom') {
          const s = o.s;
          g.fillStyle = 'rgba(25,40,15,0.28)'; ell(g, o.x + s * 0.6, o.y + s * 0.12, s * 1.1, s * 0.42);
          g.fillStyle = '#7a5236'; g.fillRect(o.x - s * 0.12, o.y - s * 0.75, s * 0.24, s * 0.78);
          const c = LAND.snowy ? '#3f7a62' : o.c;
          g.fillStyle = shade(c, -0.2); g.beginPath(); g.arc(o.x + s * 0.1, o.y - s * 1.1, s, 0, TAU); g.fill();
          g.fillStyle = c; g.beginPath(); g.arc(o.x - s * 0.04, o.y - s * 1.2, s * 0.88, 0, TAU); g.fill();
          g.fillStyle = shade(c, 0.22); g.beginPath(); g.arc(o.x - s * 0.32, o.y - s * 1.47, s * 0.4, 0, TAU); g.fill();
          g.fillStyle = shade(c, 0.4); g.beginPath(); g.arc(o.x - s * 0.42, o.y - s * 1.56, s * 0.16, 0, TAU); g.fill();
          if (o.t === 'blossom') { g.fillStyle = '#ffffff'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(o.x + (R() - 0.5) * s * 1.2, o.y - s * 1.2 + (R() - 0.5) * s, 1.1, 0, TAU); g.fill(); } }
          if (LAND.snowy) { g.fillStyle = 'rgba(255,255,255,0.92)'; g.beginPath(); g.arc(o.x - s * 0.15, o.y - s * 1.55, s * 0.5, Math.PI, TAU); g.fill(); }
        } else if (o.t === 'pine') {
          const s = o.s;
          g.fillStyle = 'rgba(25,40,15,0.28)'; ell(g, o.x + s * 0.65, o.y + s * 0.1, s * 1.15, s * 0.36);
          g.fillStyle = '#6b4630'; g.fillRect(o.x - s * 0.1, o.y - s * 0.5, s * 0.2, s * 0.52);
          for (let k = 0; k < 3; k++) { const yy = o.y - s * 0.4 - k * s * 0.62, ww = s * (1 - k * 0.24); g.fillStyle = shade(o.c, -0.12 + k * 0.06); g.beginPath(); g.moveTo(o.x - ww, yy); g.lineTo(o.x, yy - s * 1.0); g.lineTo(o.x + ww, yy); g.closePath(); g.fill(); g.fillStyle = shade(o.c, 0.14 + k * 0.05); g.beginPath(); g.moveTo(o.x - ww, yy); g.lineTo(o.x, yy - s * 1.0); g.lineTo(o.x - ww * 0.15, yy); g.closePath(); g.fill(); if (LAND.snowy) { g.fillStyle = 'rgba(255,255,255,0.92)'; g.beginPath(); g.moveTo(o.x - ww * 0.4, yy - s * 0.6); g.lineTo(o.x, yy - s * 1.0); g.lineTo(o.x + ww * 0.4, yy - s * 0.6); g.closePath(); g.fill(); } }
        } else if (o.t === 'house' || o.t === 'steeple') {
          const ch = house(g, o.x, o.y, o.w, o.w * 0.62, o.w * 0.78, o.wall, o.roof, lights, o.t === 'steeple');
          if (ch) M.chimneys.push(ch);
          if (o.t === 'steeple') { const tx = o.x - o.w * 0.18, ty = o.y - o.w * 0.78 - o.w * 0.62; g.fillStyle = shade(o.wall, -0.06); g.fillRect(tx - 4, ty - 14, 8, 16); g.fillStyle = o.roof; g.beginPath(); g.moveTo(tx - 5.5, ty - 14); g.lineTo(tx, ty - 30); g.lineTo(tx + 5.5, ty - 14); g.closePath(); g.fill(); g.fillStyle = '#ffd36b'; g.fillRect(tx - 0.7, ty - 35, 1.4, 6); }
          if (LAND.snowy) { g.fillStyle = 'rgba(255,255,255,0.92)'; g.fillRect(o.x - o.w / 2, o.y - o.w * 0.78 - o.w * 0.62, o.w, o.w * 0.3); }
        } else if (o.t === 'bush') { g.fillStyle = 'rgba(25,40,15,0.25)'; ell(g, o.x + 2, o.y + 2, 5.4, 2.6); g.fillStyle = shade(LAND.snowy ? '#3f7a62' : LAND.tree[0], -0.2); ell(g, o.x, o.y, 5, 3.4); g.fillStyle = shade(LAND.snowy ? '#3f7a62' : LAND.tree[0], 0.08); ell(g, o.x - 1, o.y - 1, 3.6, 2.4); }
        else if (o.t === 'flowers') { ['#ff8fb1', '#ffd36b', '#ffffff', '#b49cff'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(o.x + (i - 1.5) * 2.6, o.y + (i % 2) * 2, 1.25, 0, TAU); g.fill(); }); }
        else if (o.t === 'sheep') { g.fillStyle = 'rgba(0,0,0,0.18)'; ell(g, o.x + 1.5, o.y + 2, 5, 2.4); g.fillStyle = '#fbf8f0'; ell(g, o.x, o.y, 5, 3.6); g.fillStyle = '#3a3a3a'; ell(g, o.x + 4.4, o.y - 1, 1.8, 1.6); }
      }
      function tiltShift(g, W, H, dpr) {
        const pw = bg.width, phh = bg.height;
        const tmp = document.createElement('canvas'); tmp.width = pw; tmp.height = phh;
        const tg = tmp.getContext('2d');
        if (typeof tg.filter === 'string') { tg.filter = 'blur(' + Math.round((M.ph ? 6 : 8) * dpr) + 'px) saturate(1.15)'; tg.drawImage(bg, 0, 0); tg.filter = 'none'; }
        else { const sm = document.createElement('canvas'); sm.width = Math.max(1, Math.round(pw / 7)); sm.height = Math.max(1, Math.round(phh / 7)); sm.getContext('2d').drawImage(bg, 0, 0, sm.width, sm.height); tg.imageSmoothingEnabled = true; tg.drawImage(sm, 0, 0, pw, phh); }
        tg.globalCompositeOperation = 'destination-in';
        const top = clamp((M.yq - 30) / H, 0.06, 0.45), bot = clamp((H - (M.ph ? 116 : 104)) / H, 0.6, 0.96);
        const m = tg.createLinearGradient(0, 0, 0, phh);
        m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(top * 0.6, 'rgba(0,0,0,0.85)'); m.addColorStop(top, 'rgba(0,0,0,0)'); m.addColorStop(bot, 'rgba(0,0,0,0)'); m.addColorStop(1, 'rgba(0,0,0,1)');
        tg.fillStyle = m; tg.fillRect(0, 0, pw, phh);
        g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(tmp, 0, 0); g.restore();
      }
      function renderPortal(br) {
        const q = M.portal, d = cv.dpr || 1;
        portal.width = Math.max(2, Math.round(q.w * d)); portal.height = Math.max(2, Math.round(q.h * d));
        const g = portal.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, q.w, q.h);
        const cy = M.yq - q.y, mx = 16, base = br ? shade(LAND.grass[1], -0.08) : mix(shade(LAND.grass[1], -0.1), '#2c2f5a', 0.55);
        g.fillStyle = 'rgba(20,30,10,0.3)'; ell(g, mx + q.w * 0.62, cy + q.h * 0.18, q.w * 0.66, q.h * 0.4);
        const mg = g.createRadialGradient(mx + q.w * 0.3, cy - q.h * 0.3, 4, mx + q.w * 0.5, cy, q.w * 0.8);
        mg.addColorStop(0, shade(base, 0.22)); mg.addColorStop(1, shade(base, -0.12));
        g.fillStyle = mg; ell(g, mx + q.w * 0.6, cy - 2, q.w * 0.6, q.h * 0.46);
        if (LAND.snowy) { g.fillStyle = br ? '#ffffff' : '#c9cbe6'; ell(g, mx + q.w * 0.56, cy - q.h * 0.2, q.w * 0.44, q.h * 0.22); }
        const sw = M.cw + 10;
        g.fillStyle = br ? '#a59f95' : '#6a6680'; rr(g, mx - 6, cy - sw / 2 - 5, 14, sw + 10, 4); g.fill();
        g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1; for (let y = cy - sw / 2 - 2; y < cy + sw / 2 + 4; y += 5) { g.beginPath(); g.moveTo(mx - 5, y); g.lineTo(mx + 7, y); g.stroke(); }
        const dk = g.createLinearGradient(mx, 0, mx + 26, 0); dk.addColorStop(0, '#120e0c'); dk.addColorStop(1, 'rgba(18,14,12,0)');
        g.fillStyle = dk; rr(g, mx + 4, cy - sw / 2 + 1, 26, sw - 2, 3); g.fill();
        const tc = LAND.snowy ? '#3f7a62' : LAND.tree[0];
        for (let i = 0; i < 5; i++) { const x = mx + q.w * (0.35 + i * 0.13), y = cy - q.h * (0.3 - (i % 2) * 0.08), r = q.h * 0.09; g.fillStyle = shade(tc, -0.15); g.beginPath(); g.arc(x + 1, y + 1, r, 0, TAU); g.fill(); g.fillStyle = tc; g.beginPath(); g.arc(x, y, r * 0.9, 0, TAU); g.fill(); }
      }
      /* ---------------- per-frame drawing ---------------- */
      function drawBody(g, x, y, a, len, w, ex, liv, dusk) {
        g.save(); g.translate(x + 2.5, y + ex + 2.5); g.rotate(a); g.fillStyle = 'rgba(12,22,8,0.3)'; rr(g, -len / 2 - 1, -w / 2 - 1, len + 2, w + 2, w * 0.4); g.fill(); g.restore();
        for (let k = 1; k >= 0.5; k -= 0.5) { g.save(); g.translate(x, y + ex * k); g.rotate(a); g.fillStyle = liv.side; rr(g, -len / 2, -w / 2, len, w, w * 0.32); g.fill(); g.restore(); }
        const kk = w / 18;
        g.save(); g.translate(x, y + ex); g.rotate(a); g.fillStyle = dusk ? '#ffd98a' : '#cfe8f1';
        for (let i = -len / 2 + 5 * kk; i < len / 2 - 7 * kk; i += 7 * kk) { g.fillRect(i, -w / 2 + 0.6 * kk, 4.2 * kk, 1.7 * kk); g.fillRect(i, w / 2 - 2.3 * kk, 4.2 * kk, 1.7 * kk); }
        g.restore();
        g.save(); g.translate(x, y); g.rotate(a);
        g.fillStyle = liv.body; rr(g, -len / 2, -w / 2, len, w, w * 0.32); g.fill();
        g.fillStyle = liv.roof; rr(g, -len / 2 + 2.6 * kk, -w / 2 + 2.6 * kk, len - 5.2 * kk, w - 5.2 * kk, w * 0.26); g.fill();
        g.strokeStyle = liv.trim; g.lineWidth = kk; rr(g, -len / 2 + 1.3 * kk, -w / 2 + 1.3 * kk, len - 2.6 * kk, w - 2.6 * kk, w * 0.3); g.stroke();
        g.fillStyle = shade(liv.roof, -0.14); g.fillRect(-len / 2 + 6, -0.6, len - 12, 1.2);
        g.fillStyle = shade(liv.roof, -0.22); g.beginPath(); g.arc(-len * 0.22, 0, 1.4, 0, TAU); g.arc(len * 0.22, 0, 1.4, 0, TAU); g.fill();
        g.restore();
      }
      function drawBadge(g, x, y, kind, k) {
        const r = M.cw * 0.5 * outBack(clamp(k, 0, 1)); if (r <= 0.5) return;
        g.fillStyle = kind === 'fact' ? '#1fae93' : '#8a6cf0'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
        g.strokeStyle = '#ffffff'; g.lineWidth = 1.4; g.stroke();
        g.fillStyle = '#ffffff';
        if (kind === 'fact') { rr(g, x - r * 0.55, y - r * 0.32, r * 1.1, r * 0.72, r * 0.15); g.fill(); g.fillStyle = '#1fae93'; g.beginPath(); g.arc(x, y + r * 0.04, r * 0.24, 0, TAU); g.fill(); }
        else { g.beginPath(); g.arc(x - r * 0.28, y + r * 0.08, r * 0.26, 0, TAU); g.arc(x + r * 0.05, y - r * 0.12, r * 0.33, 0, TAU); g.arc(x + r * 0.34, y + r * 0.1, r * 0.24, 0, TAU); g.fill(); g.fillRect(x - r * 0.5, y + r * 0.08, r * 1.05, r * 0.26); }
      }
      function drawCar(g, c, t, dusk) {
        const len = lenOf(c);
        if (c.glue) {
          const wob = c.wob * Math.sin(t * 42) * 2.4;
          const pf = pose(null, c.s + wob, M.Lc), pb = pose(null, c.s - M.Lc - 10 - wob, M.Lc);
          if (pb.x > M.W + 80) return;
          drawBody(g, pb.x, pb.y, pb.a, M.Lc, M.cw, M.ex, LIV, dusk); drawBody(g, pf.x, pf.y, pf.a, M.Lc, M.cw, M.ex, LIV, dusk);
          const j = posOn(null, c.s - M.Lc - 5), r = M.cw * (0.62 + 0.08 * Math.sin(t * 5)) * (1 + c.wob * 0.35);
          g.fillStyle = 'rgba(120,20,70,0.3)'; ell(g, j.x + 2, j.y + M.ex + 2, r * 0.95, r * 0.6);
          const gg = g.createRadialGradient(j.x - r * 0.3, j.y - r * 0.3, 1, j.x, j.y, r * 1.1); gg.addColorStop(0, '#ffd6ec'); gg.addColorStop(0.5, '#ff70b8'); gg.addColorStop(1, '#c0307e');
          g.fillStyle = gg; ell(g, j.x, j.y + M.ex * 0.4, r * 0.9, r * 0.72);
          g.fillStyle = 'rgba(255,255,255,0.75)'; ell(g, j.x - r * 0.32, j.y - r * 0.12, r * 0.22, r * 0.14);
          g.fillStyle = '#fff'; g.fillRect(j.x - r * 0.35, j.y - r * 0.05, r * 0.7, r * 0.14); g.fillRect(j.x - r * 0.35, j.y + r * 0.22, r * 0.7, r * 0.14);
          return;
        }
        const p = pose(c.route, c.s, len);
        if (p.x < -70 || p.x > M.W + 70) return;
        drawBody(g, p.x, p.y, p.a, len, M.cw, M.ex, LIV, dusk);
        if (c.src === 'practice') { g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = 'rgba(255,214,60,0.9)'; g.fillRect(-len / 2 + 3, -1.6, 5, 3.2); g.fillRect(len / 2 - 8, -1.6, 5, 3.2); g.restore(); }
        if (c.badge > 0) drawBadge(g, p.x, p.y, c.kind, c.badge);
        if (ST.phase !== 'sort' && ST.phase !== 'arrive' && c.mode === 'parked' && c.route === 'story') { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.25 + 0.15 * Math.sin(t * 2 + c.id); g.drawImage(glow('#b49cff'), p.x - 30, p.y - 30, 60, 60); g.restore(); }
      }
      let faceJob = null;
      function drawLoco(g, lo, t, dusk) {
        const len = M.lo, w = M.cw + 2;
        let s = lo.s, route = lo.route;
        if (lo.mode === 'rake') { s = M.sDec + ST.rake.d + M.gap + len; route = null; lo.s = s; }
        const p = pose(route, s, len);
        if (p.x > M.W + 90 || p.x < -90) { faceJob = null; return; }
        g.save(); g.translate(p.x + 2.5, p.y + M.ex + 2.5); g.rotate(p.a); g.fillStyle = 'rgba(12,22,8,0.32)'; rr(g, -len / 2, -w / 2, len, w, 5); g.fill(); g.restore();
        for (let k = 1; k >= 0.5; k -= 0.5) { g.save(); g.translate(p.x, p.y + M.ex * k); g.rotate(p.a); g.fillStyle = '#25262b'; rr(g, -len / 2, -w / 2, len, w, 4); g.fill(); g.restore(); }
        const k = M.cw / 18;
        g.save(); g.translate(p.x, p.y); g.rotate(p.a);
        g.fillStyle = '#2f3036'; rr(g, -len / 2, -w / 2, len, w, 4 * k); g.fill();
        const cabL = 17 * k, bx0 = -len / 2 + cabL, bl = len - cabL - 4 * k;
        g.fillStyle = LIV.boiler; rr(g, bx0, -w / 2 + 2 * k, bl, w - 4 * k, (w - 4 * k) / 2); g.fill();
        g.fillStyle = shade(LIV.boiler, 0.28); rr(g, bx0 + 2 * k, -w / 2 + 3.4 * k, bl - 4 * k, 2.4 * k, 1.2 * k); g.fill();
        g.fillStyle = shade(LIV.boiler, -0.35); rr(g, len / 2 - 11 * k, -w / 2 + 2 * k, 8 * k, w - 4 * k, 3 * k); g.fill();
        g.strokeStyle = LIV.trim; g.lineWidth = k; [bx0 + bl * 0.33, bx0 + bl * 0.66].forEach(xx => { g.beginPath(); g.moveTo(xx, -w / 2 + 2 * k); g.lineTo(xx, w / 2 - 2 * k); g.stroke(); });
        g.fillStyle = '#d9b45a'; g.beginPath(); g.arc(bx0 + bl * 0.45, 0, 3.4 * k, 0, TAU); g.fill();
        g.fillStyle = '#1b1b1f'; g.beginPath(); g.arc(len / 2 - 15 * k, 0, 3.8 * k, 0, TAU); g.fill(); g.fillStyle = '#4a4a52'; g.beginPath(); g.arc(len / 2 - 15 * k, 0, 2 * k, 0, TAU); g.fill();
        g.fillStyle = LIV.body; rr(g, -len / 2, -w / 2, cabL, w, 3 * k); g.fill();
        g.fillStyle = LIV.roof; rr(g, -len / 2 + 2 * k, -w / 2 + 2 * k, cabL - 4 * k, w - 4 * k, 2.5 * k); g.fill();
        g.fillStyle = '#c6302c'; g.fillRect(len / 2 - 2.5 * k, -w / 2, 2.5 * k, w);
        g.fillStyle = '#fff8d0'; g.beginPath(); g.arc(len / 2 - k, 0, 2 * k, 0, TAU); g.fill();
        g.restore();
        const hp = posOn(route, s + 2);
        if (dusk) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.8; g.drawImage(glow('#fff1b8'), hp.x - 22, hp.y - 22, 44, 44); g.restore(); }
        const cab = posOn(route, s - len + 9 * M.cw / 18), fr = M.ph ? 14 : 20;
        faceJob = { x: cab.x, y: cab.y + w * 0.5 + fr * 0.5, r: fr };
      }
      function drawFace(g) {
        if (!faceJob) return;
        const im = faces[loopie] || faces.happy, f = faceJob;
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.arc(f.x + 1.5, f.y + 2.5, f.r, 0, TAU); g.fill();
        if (im && im.complete && im.naturalWidth) g.drawImage(im, f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
        else { g.fillStyle = '#c04ad8'; g.beginPath(); g.arc(f.x, f.y, f.r, 0, TAU); g.fill(); }
      }
      function drawStrike(g, t) {
        const p = at(PA, M.sStop), nx = -Math.sin(p.a), ny = Math.cos(p.a);
        const bp = ((beatPos(t) % 1) + 1) % 1, pulse = ST.phase === 'sort' ? Math.exp(-bp * 6) : 0;
        g.save(); g.lineCap = 'round';
        g.strokeStyle = rgba('#ffd84a', 0.35 + 0.55 * pulse); g.lineWidth = 3 + pulse * 2.5;
        g.beginPath(); g.moveTo(p.x - nx * M.bed * 0.85, p.y - ny * M.bed * 0.85); g.lineTo(p.x + nx * M.bed * 0.85, p.y + ny * M.bed * 0.85); g.stroke();
        const c = ST.active;
        if (c && !c.route && !c.glue && (c.mode === 'roll' || c.mode === 'brake') && t >= c.tRel) {
          const q = clamp((c.tArr - t) / (2 * BEAT), 0, 1), r = 9 + 50 * q;
          g.strokeStyle = rgba('#ffd84a', 0.3 + 0.6 * (1 - q)); g.lineWidth = 2.5 + 2.5 * (1 - q);
          g.beginPath(); g.arc(p.x, p.y, r, 0, TAU); g.stroke();
          const left = Math.max(0, Math.ceil((c.tArr - t) / BEAT - 0.001));
          for (let i = 0; i < Math.min(4, left); i++) { const a = -Math.PI / 2 + (i - 1.5) * 0.36; g.fillStyle = '#ffe680'; g.beginPath(); g.arc(p.x + Math.cos(a) * (r + 7), p.y + Math.sin(a) * (r + 7), 2.4, 0, TAU); g.fill(); }
        }
        if (c && !c.route && c.mode === 'wait' && !c.glue) { const k = 0.5 + 0.5 * Math.sin(t * 6); g.strokeStyle = rgba('#ffd84a', 0.4 + 0.4 * k); g.lineWidth = 3; g.beginPath(); g.arc(p.x, p.y, 14 + 4 * k, 0, TAU); g.stroke(); }
        g.restore();
      }
      function drawPoints(g) {
        const b = ST.pts.b, n = 8, lp = [], rp = [];
        for (let i = 0; i <= n; i++) {
          const s = 2 + i / n * (M.ph ? 30 : 36), pm = at(PM, s), py = at(PY, s);
          const x = lerp(py.x, pm.x, b), y = lerp(py.y, pm.y, b), aa = lerp(py.a, pm.a, b), nx = -Math.sin(aa), ny = Math.cos(aa);
          lp.push({ x: x + nx * M.gauge / 2, y: y + ny * M.gauge / 2 }); rp.push({ x: x - nx * M.gauge / 2, y: y - ny * M.gauge / 2 });
        }
        g.save(); g.lineCap = 'round'; g.strokeStyle = '#fbfcff'; g.lineWidth = 2; poly(g, lp); poly(g, rp); g.restore();
        const J = M.J, lx = J.x + (M.ph ? -18 : -22), ly = J.y + 4;
        g.fillStyle = '#3a3a40'; g.fillRect(lx - 5, ly - 3, 10, 6);
        const la = lerp(-0.6, 0.6, b);
        g.strokeStyle = '#c9c9d2'; g.lineWidth = 2; g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + Math.sin(la) * 9, ly - Math.cos(la) * 9); g.stroke();
        g.fillStyle = b > 0.5 ? '#2fc7a9' : '#a38bff'; g.beginPath(); g.arc(lx + Math.sin(la) * 9, ly - Math.cos(la) * 9, 2.6, 0, TAU); g.fill();
      }
      function drawSignal(g, t) {
        const p = at(PA, M.sStop + 3), nx = -Math.sin(p.a), ny = Math.cos(p.a), off = M.bed / 2 + 10;
        const bx = p.x - nx * off, by = p.y - ny * off, sc = M.ph ? 1 : 1.4, post = 30 * sc;
        g.strokeStyle = 'rgba(10,20,10,0.25)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(bx + 1, by + 1); g.lineTo(bx + post * 0.5, by + post * 0.3); g.stroke();
        g.strokeStyle = '#3b3f46'; g.lineWidth = 2.6 * sc; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx, by - post); g.stroke();
        g.fillStyle = '#3b3f46'; g.beginPath(); g.arc(bx, by - post - 1.5, 2 * sc, 0, TAU); g.fill();
        const th = Math.PI + 0.7 * ST.sig.k;
        g.save(); g.translate(bx - 1, by - post + 5 * sc); g.rotate(th); g.fillStyle = '#d23a2e'; g.fillRect(0, -2.2 * sc, 15 * sc, 4.4 * sc); g.fillStyle = '#fff'; g.fillRect(9 * sc, -2.2 * sc, 2.2 * sc, 4.4 * sc); g.restore();
        const lc = ST.sig.k > 0.5 ? '#5dff9a' : '#ff4d3d', lx = bx + 3 * sc, ly = by - post + 8 * sc;
        g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.9; g.drawImage(glow(lc), lx - 11, ly - 11, 22, 22); g.restore();
        g.fillStyle = lc; g.beginPath(); g.arc(lx, ly, 2.2 * sc, 0, TAU); g.fill(); void t;
      }
      function drawFx(g, t) {
        ST.fx = ST.fx.filter(f => t - f.t0 < 1);
        ST.fx.forEach(f => {
          const k = (t - f.t0) / 1, Pp = f.route === 'fact' ? PM : PY, end = Math.min(Pp.len, f.route === 'fact' ? M.sLoco - M.sJ : PY.len) * outCubic(Math.min(1, k * 1.6));
          const pts = []; for (let s = 0; s <= end; s += 6) pts.push(at(Pp, s));
          if (pts.length < 2) return;
          g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.strokeStyle = rgba(f.route === 'fact' ? '#3fe6c2' : '#b69bff', 0.55 * (1 - k)); g.lineWidth = M.bed + 2; poly(g, pts); g.restore();
        });
      }
      const AMB = { birds: [], next: 0 };
      function ambient(g, t, dt) {
        const W = M.W, H = M.H;
        const sh = glow('#0c1a08');
        g.save(); g.globalAlpha = bright() ? 0.1 : 0.06;
        for (let i = 0; i < 2; i++) { const x = ((t * (9 + i * 5) + i * W * 0.6) % (W + 500)) - 250, y = H * (0.36 + i * 0.28); g.drawImage(sh, x - 200, y - 110, 400, 220); }
        g.restore();
        const pd = M.pond; if (pd) { g.fillStyle = 'rgba(255,255,255,0.8)'; for (let i = 0; i < 4; i++) { const k = 0.5 + 0.5 * Math.sin(t * (1.3 + i * 0.4) + i * 2); if (k < 0.55) continue; const x = pd.x + Math.cos(i * 2.1) * pd.rx * 0.55, y = pd.y + Math.sin(i * 1.7) * pd.ry * 0.45; g.globalAlpha = (k - 0.55) * 2; g.fillRect(x - 3, y, 6, 1.2); } g.globalAlpha = 1; }
        if (M.chimneys && t > AMB.next) { AMB.next = t + 0.7; M.chimneys.slice(0, 3).forEach(c => P.emit('smoke', c.cx, c.cy, 1, { colors: ['rgba(240,240,245,0.4)'], speed: [4, 10], size: [3, 6] })); }
        if (LAND.drift && Math.random() < dt * (LAND.drift === 'snow' ? 6 : 2.2)) P.emit(LAND.drift, Math.random() * W, M.hz + Math.random() * 30, 1, { speed: [10, 40] });
        if (visits >= 2) { const wx = M.ph ? W * 0.88 : W * 0.9, wy = M.yS - (M.ph ? 120 : 150); g.strokeStyle = '#efe6d2'; g.lineWidth = 2; for (let i = 0; i < 4; i++) { const a = t * 1.2 + i * Math.PI / 2; g.beginPath(); g.moveTo(wx, wy); g.lineTo(wx + Math.cos(a) * 12, wy + Math.sin(a) * 12); g.stroke(); } g.fillStyle = '#b8743f'; g.fillRect(wx - 3, wy, 6, 16); }
        if (visits >= 3) { const bx = ((t * 7) % (W + 120)) - 60, by = M.hz + 24 + Math.sin(t * 0.6) * 6; g.fillStyle = '#ff7a59'; g.beginPath(); g.arc(bx, by, 9, 0, TAU); g.fill(); g.fillStyle = '#ffd24a'; g.fillRect(bx - 9, by - 1.5, 18, 3); g.strokeStyle = '#6b4a35'; g.lineWidth = 1; g.beginPath(); g.moveTo(bx - 4, by + 8); g.lineTo(bx - 3, by + 14); g.moveTo(bx + 4, by + 8); g.lineTo(bx + 3, by + 14); g.stroke(); g.fillStyle = '#8a5a3a'; g.fillRect(bx - 3.5, by + 14, 7, 4); }
        if (t > (AMB.bt || 0)) { AMB.bt = t + 7 + Math.random() * 6; AMB.birds.push({ x: -20, y: M.hz + 20 + Math.random() * 80, v: 40 + Math.random() * 20 }); }
        g.strokeStyle = 'rgba(40,40,50,0.7)'; g.lineWidth = 1.3;
        AMB.birds = AMB.birds.filter(b => b.x < W + 30);
        AMB.birds.forEach(b => { b.x += b.v * dt; const f = Math.sin(t * 9 + b.y) * 2.5; g.beginPath(); g.moveTo(b.x - 5, b.y - f); g.lineTo(b.x, b.y); g.lineTo(b.x + 5, b.y - f); g.stroke(); });
      }
      function tagFollow() {
        const c = ST.tagCar; if (!c || tag.hidden) return;
        const p = pose(c.route, c.s, lenOf(c)), tw = ST.tagW || 140;
        let x = p.x - 22 - tw, y = p.y - 16;
        if (x < 8) x = p.x - 22 - tw < -40 ? p.x + 22 : 8;
        x = clamp(x, 8, M.W - tw - 8); y = clamp(y, M.boardB + 6, M.H - 120);
        tag.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
        ST.tagXY = { x, y, px: p.x, py: p.y, tw };
      }
      function drawTagString(g) {
        const q = ST.tagXY; if (!q || tag.hidden || !ST.tagCar) return;
        const ax = q.x > q.px ? q.x : q.x + q.tw, ay = q.y + 14;
        g.strokeStyle = 'rgba(255,243,216,0.75)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo((ax + q.px) / 2, ay + 10, q.px, q.py); g.stroke();
      }
      function drawIris(g, t) {
        const ir = ST.iris; if (!ir) return;
        const k = clamp((t - ir.t0) / (K.reduced() ? 0.25 : 0.62), 0, 1), e = ir.dir > 0 ? inOut(k) : 1 - inOut(k);
        if (ir.dir < 0 && k >= 1) { ST.iris = null; return; }
        const R = Math.hypot(M.W, M.H) * (1 - e);
        g.save(); g.fillStyle = '#0c0a10'; g.beginPath(); g.rect(0, 0, M.W, M.H); g.arc(ir.x, ir.y, Math.max(0.1, R), 0, TAU, true); g.fill('evenodd'); g.restore();
      }

      /* ---------------- the sunset run (finale) ---------------- */
      const PANO = { t0: 0, x: 0, puffs: [], heart: false, banner: null, sky: null, far: null, mid: null, near: null, sparkT: 0 };
      let puffSprite = null;
      function startPano() {
        ST.view = 'pano'; buildPano(); PANO.t0 = now(); PANO.x = 0; PANO.puffs = []; PANO.heart = false;
        MUS.big = true; MUS.vol = 1; MUS.chuff = 0.9; loopie = 'celebrate';
        glitch.show(false);
        [padS, padF, tag, board, glueBtn].forEach(e => { e.style.transition = 'opacity .4s'; e.style.opacity = '0'; e.style.pointerEvents = 'none'; });
      }
      function buildPano() {
        const W = M.W, H = M.H, d = Math.min(1.5, cv.dpr || 1);
        const mk = () => { const c = document.createElement('canvas'); c.width = Math.max(2, Math.round(W * d)); c.height = Math.max(2, Math.round(H * d)); const g = c.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); return [c, g]; };
        const hz = Math.round(H * (M.ph ? 0.6 : 0.58)), ty = Math.round(H * (M.ph ? 0.665 : 0.68));
        PANO.hz = hz; PANO.ty = ty;
        const R = K.rng('pano' + LAND.key);
        const tri = (u) => 1 - 2 * Math.abs(u - Math.floor(u) - 0.5);
        const [sk, sg] = mk();
        const gr = sg.createLinearGradient(0, 0, 0, H);
        gr.addColorStop(0, '#1e1748'); gr.addColorStop(0.26, '#4f2d6c'); gr.addColorStop(0.44, '#b24f6e'); gr.addColorStop(0.56, '#f3845b'); gr.addColorStop(0.62, '#ffbd72'); gr.addColorStop(1, '#ffd9a0');
        sg.fillStyle = gr; sg.fillRect(0, 0, W, H);
        const sx = W * 0.66, sy = hz - H * 0.02, sr = Math.min(W, H) * 0.08;
        const gl = sg.createRadialGradient(sx, sy, sr * 0.4, sx, sy, sr * 7); gl.addColorStop(0, 'rgba(255,236,180,0.95)'); gl.addColorStop(0.2, 'rgba(255,170,110,0.42)'); gl.addColorStop(1, 'rgba(255,140,90,0)');
        sg.fillStyle = gl; sg.fillRect(0, 0, W, H);
        sg.fillStyle = '#fff3cc'; sg.beginPath(); sg.arc(sx, sy, sr, 0, TAU); sg.fill();
        sg.fillStyle = '#ffffff'; for (let i = 0; i < 70; i++) { sg.globalAlpha = 0.15 + R() * 0.7; sg.fillRect(R() * W, R() * H * 0.28, 1.3, 1.3); }
        for (let i = 0; i < 5; i++) { const cx = R() * W, cy = H * (0.1 + R() * 0.32), cw = 80 + R() * 150, ch = 18 + R() * 16; sg.globalAlpha = 0.42; sg.drawImage(glow('#ff9f8a'), cx - cw, cy - ch, cw * 2, ch * 2); sg.globalAlpha = 0.3; sg.drawImage(glow('#ffe1c4'), cx - cw * 0.55, cy - ch * 0.2, cw * 1.1, ch * 0.9); }
        sg.globalAlpha = 1;
        PANO.sky = sk;
        const [fc, fg] = mk();
        if (LAND.back === 'sea') {
          const sea = fg.createLinearGradient(0, hz - 30, 0, H); sea.addColorStop(0, '#7a4f8c'); sea.addColorStop(0.3, '#c86a7c'); sea.addColorStop(1, '#4a2850');
          fg.fillStyle = sea; fg.fillRect(0, hz - 30, W, H - hz + 30);
          fg.fillStyle = 'rgba(255,214,150,0.65)'; for (let i = 0; i < 22; i++) fg.fillRect(sx - 40 + R() * 80 - i * 1.5, hz - 26 + i * 3, 18 + R() * 34, 1.6);
          fg.fillStyle = '#4a2a55'; fg.fillRect(W * 0.18, hz - 70, 9, 42); fg.fillRect(W * 0.18 - 3, hz - 77, 15, 8); fg.fillStyle = '#ffe9a0'; fg.fillRect(W * 0.18 + 1, hz - 76, 7, 5);
        } else {
          const hills = LAND.back === 'hills';
          const far = (x) => { const u = x / W; return hills ? hz - 24 - 26 * (0.5 + 0.5 * Math.sin(TAU * (2 * u + 0.1))) - 14 * (0.5 + 0.5 * Math.sin(TAU * (5 * u + 0.4))) : hz - 22 - 84 * tri(3 * u + 0.15) - 30 * tri(7 * u + 0.6) - 10 * tri(15 * u + 0.3); };
          const ridgePath = () => { fg.beginPath(); fg.moveTo(0, H); for (let x = 0; x <= W; x += 3) fg.lineTo(x, far(x)); fg.lineTo(W, H); fg.closePath(); };
          fg.fillStyle = '#8b4876'; ridgePath(); fg.fill();
          if (!hills) {
            fg.save(); ridgePath(); fg.clip();
            fg.beginPath(); fg.moveTo(0, 0); for (let x = 0; x <= W; x += 3) fg.lineTo(x, hz - 74 + 7 * tri(x / W * 24)); fg.lineTo(W, 0); fg.closePath(); fg.fillStyle = LAND.back === 'snowpeaks' ? 'rgba(255,228,236,0.9)' : 'rgba(255,214,222,0.55)'; fg.fill();
            fg.restore();
          }
          const haze = fg.createLinearGradient(0, hz - 60, 0, hz + 10); haze.addColorStop(0, 'rgba(255,170,140,0)'); haze.addColorStop(1, 'rgba(255,170,140,0.35)'); fg.fillStyle = haze; fg.fillRect(0, hz - 60, W, 70);
        }
        PANO.far = fc;
        const [mc, mg] = mk();
        const mid = (x) => { const u = x / W; return hz + 10 - 16 * (0.5 + 0.5 * Math.sin(TAU * (3 * u + 0.2))) - 10 * (0.5 + 0.5 * Math.sin(TAU * (7 * u + 0.7))); };
        mg.fillStyle = '#5a2b57'; mg.beginPath(); mg.moveTo(0, H); for (let x = 0; x <= W; x += 3) mg.lineTo(x, mid(x)); mg.lineTo(W, H); mg.closePath(); mg.fill();
        mg.fillStyle = '#47204a';
        for (let i = 0; i < (M.ph ? 14 : 26); i++) { const x = R() * W, r = 6 + R() * 9, y = mid(x) + 3; [-W, 0, W].forEach(o => { if (LAND.kind === 'pine') { mg.beginPath(); mg.moveTo(o + x - r, y + 3); mg.lineTo(o + x, y - r * 2.4); mg.lineTo(o + x + r, y + 3); mg.closePath(); mg.fill(); } else { mg.beginPath(); mg.arc(o + x, y - r * 0.9, r, 0, TAU); mg.fill(); mg.fillRect(o + x - 1.5, y - r, 3, r + 3); } }); }
        mg.fillStyle = 'rgba(255,205,120,0.9)'; for (let i = 0; i < 7; i++) { const x = R() * W, y = mid(x) + 8 + R() * 8; [-W, 0, W].forEach(o => mg.fillRect(o + x, y, 2.6, 2.6)); }
        PANO.mid = mc;
        const [nc, ng] = mk();
        const deck = ty + 2, river = ng.createLinearGradient(0, deck, 0, H);
        river.addColorStop(0, '#f08a64'); river.addColorStop(0.35, '#b2506e'); river.addColorStop(1, '#3a1c44');
        ng.fillStyle = river; ng.fillRect(0, deck, W, H - deck);
        ng.fillStyle = 'rgba(255,220,160,0.55)'; for (let i = 0; i < 26; i++) { const x = R() * W, y = deck + 40 + R() * (H - deck - 50); [-W, 0, W].forEach(o => ng.fillRect(o + x, y, 14 + R() * 30, 1.6)); }
        const n = Math.max(3, Math.round(W / (M.ph ? 70 : 96))), A = W / n, top = deck + 12, archTop = top + (M.ph ? 40 : 52);
        ng.fillStyle = '#26112c'; ng.beginPath(); ng.rect(0, deck, W, H - deck);
        for (let k = -1; k <= n; k++) { const x0 = k * A + A * 0.16, x1 = (k + 1) * A - A * 0.16, r = (x1 - x0) / 2; ng.moveTo(x0, H + 10); ng.lineTo(x0, archTop); ng.arc(x0 + r, archTop, r, Math.PI, 0, false); ng.lineTo(x1, H + 10); ng.closePath(); }
        ng.fill('evenodd');
        ng.fillStyle = '#3d1c44'; ng.fillRect(0, deck, W, 6); ng.fillStyle = '#6b3a5c'; ng.fillRect(0, deck, W, 1.6);
        PANO.near = nc;
        if (!puffSprite) { puffSprite = document.createElement('canvas'); puffSprite.width = puffSprite.height = 64; const pg = puffSprite.getContext('2d'), rg = pg.createRadialGradient(30, 28, 2, 32, 32, 31); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.5, 'rgba(255,246,248,0.88)'); rg.addColorStop(1, 'rgba(255,236,242,0)'); pg.fillStyle = rg; pg.fillRect(0, 0, 64, 64); }
      }
      function strip(g, c, off) { const W = M.W, H = M.H, x = -(((off % W) + W) % W); g.drawImage(c, x - 0.5, 0, W + 1, H); g.drawImage(c, x + W - 1, 0, W + 1, H); }
      function drawPano(g, t, dt) {
        const W = M.W, H = M.H, k = t - PANO.t0, sc = M.ph ? 1 : 1.25;
        const speed = 150 * sc; PANO.x += speed * dt;
        g.drawImage(PANO.sky, 0, 0, W, H);
        strip(g, PANO.far, PANO.x * 0.06); strip(g, PANO.mid, PANO.x * 0.28);
        const nCars = Math.max(0, Math.min(5, ST.f));
        const loLen = 116 * sc, carLen = 92 * sc, gap = 7 * sc, trainLen = loLen + nCars * (carLen + gap);
        const xFront = lerp(-30, Math.min(W * 0.62, W * 0.36 + trainLen * 0.5), outCubic(clamp(k / 1.8, 0, 1)));
        const ty = PANO.ty, wheelA = PANO.x / (11 * sc);
        for (let i = 0; i < nCars; i++) sideCar(g, xFront - loLen - gap - i * (carLen + gap) - carLen, ty, carLen, sc, wheelA);
        const chim = sideLoco(g, xFront - loLen, ty, loLen, sc, wheelA, t);
        strip(g, PANO.near, PANO.x);
        PANO.emit = (PANO.emit || 0) + dt;
        if (PANO.emit > 0.065) { PANO.emit = 0; PANO.puffs.push({ x: chim.x, y: chim.y, vx: -speed * 0.75 + (Math.random() - 0.5) * 20, vy: -38 - Math.random() * 22, r: 8 * sc, age: 0, life: 2.2 }); }
        if (!PANO.heart && k > (K.reduced() ? 0.6 : 1.7)) {
          PANO.heart = true; const cx = W * 0.5, cy = H * (M.ph ? 0.3 : 0.29), hs = Math.min(W, H) * (M.ph ? 0.0185 : 0.0145);
          for (let i = 0; i < 40; i++) { const a = i / 40 * TAU, hx = 16 * Math.pow(Math.sin(a), 3), hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)); PANO.puffs.push({ heart: true, sx: chim.x, sy: chim.y, tx: cx + hx * hs, ty: cy + hy * hs, t0: t + (i % 5) * 0.03, dur: 1.15 + (i % 3) * 0.08, r: (M.ph ? 19 : 23) * (0.85 + Math.random() * 0.3), age: 0, life: 99 }); }
          SND.whistle(1.1, 1.1); K.sfx.win();
          K.later(() => { if (A.ctx) A.pad(['G3', 'B3', 'D4', 'G4'].map(n => A.note(n)), { dur: 4, vol: 0.12, attack: 0.5 }); K.sfx.sparkle(); P.emit('star', cx, cy, 26, { colors: ['#fff6d8', '#ffd0e0', '#ffe39a'] }); }, 1350);
          K.later(showBanner, 1500);
        }
        g.save();
        PANO.puffs = PANO.puffs.filter(q => q.age < q.life);
        PANO.puffs.forEach(q => {
          q.age += dt;
          if (q.heart) {
            const u = clamp((t - q.t0) / q.dur, 0, 1); if (t < q.t0) return;
            const e = outCubic(u), mx = lerp(q.sx, q.tx, 0.5), my = Math.min(q.sy, q.ty) - 60;
            const x = (1 - e) * (1 - e) * q.sx + 2 * (1 - e) * e * mx + e * e * q.tx, y = (1 - e) * (1 - e) * q.sy + 2 * (1 - e) * e * my + e * e * q.ty;
            const r = q.r * (0.5 + 0.5 * e) * (1 + 0.06 * Math.sin(t * 2 + q.tx));
            g.globalAlpha = 0.9; g.drawImage(puffSprite, x - r, y - r, r * 2, r * 2);
            if (u >= 1) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.18; g.drawImage(glow('#ff9fc0'), x - r * 1.5, y - r * 1.5, r * 3, r * 3); g.globalCompositeOperation = 'source-over'; }
          } else {
            q.x += q.vx * dt; q.y += q.vy * dt; q.vy *= 0.985; q.r += 15 * dt;
            g.globalAlpha = 0.62 * (1 - q.age / q.life); g.drawImage(puffSprite, q.x - q.r, q.y - q.r, q.r * 2, q.r * 2);
          }
        });
        g.restore();
        if (k > 2.2) { g.fillStyle = '#fff8e0'; for (let i = 0; i < 14; i++) { const tw = 0.5 + 0.5 * Math.sin(t * 2.4 + i * 1.7); g.globalAlpha = clamp((k - 2.2) * 0.6, 0, 1) * tw; const x = (i * 97.7) % W, y = (i * 41.3) % (H * 0.22) + 8; K.starPath(g, x, y, 3.2, 1.2, 4, 0); g.fill(); } g.globalAlpha = 1; }
      }
      function sideCar(g, x, y, len, sc, wa) {
        const hh = 30 * sc, top = y - 9 * sc - hh;
        g.fillStyle = 'rgba(20,8,24,0.5)'; rr(g, x + 3, top + 4, len, hh, 6 * sc); g.fill();
        g.fillStyle = LIV.body; rr(g, x, top, len, hh, 6 * sc); g.fill();
        g.fillStyle = LIV.roof; rr(g, x - 2 * sc, top - 6 * sc, len + 4 * sc, 8 * sc, 4 * sc); g.fill();
        g.fillStyle = LIV.trim; g.fillRect(x + 4 * sc, top + hh - 7 * sc, len - 8 * sc, 1.6 * sc);
        for (let i = 0; i < 4; i++) { const wx = x + 8 * sc + i * (len - 16 * sc) / 4; g.fillStyle = '#ffd98a'; rr(g, wx, top + 6 * sc, (len - 16 * sc) / 4 - 6 * sc, 11 * sc, 2.5 * sc); g.fill(); }
        const bx = x + len / 2, by = top + hh * 0.66 + 6 * sc, r = 8.5 * sc;
        g.fillStyle = '#1fae93'; g.beginPath(); g.arc(bx, by + 6 * sc, r, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1.6; g.stroke();
        g.fillStyle = '#fff'; rr(g, bx - r * 0.55, by + 6 * sc - r * 0.32, r * 1.1, r * 0.7, 2); g.fill(); g.fillStyle = '#1fae93'; g.beginPath(); g.arc(bx, by + 6 * sc + r * 0.03, r * 0.24, 0, TAU); g.fill();
        [x + 14 * sc, x + len - 14 * sc].forEach(cx => [-6, 6].forEach(o => wheel(g, cx + o * sc, y - 5 * sc, 5 * sc, wa * 1.6)));
      }
      function wheel(g, x, y, r, a) { g.fillStyle = '#1a1018'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.strokeStyle = '#8b6a78'; g.lineWidth = 1.2; g.beginPath(); g.arc(x, y, r * 0.75, 0, TAU); g.stroke(); g.beginPath(); for (let i = 0; i < 3; i++) { const aa = a + i * Math.PI / 3; g.moveTo(x - Math.cos(aa) * r * 0.75, y - Math.sin(aa) * r * 0.75); g.lineTo(x + Math.cos(aa) * r * 0.75, y + Math.sin(aa) * r * 0.75); } g.stroke(); }
      function sideLoco(g, x, y, len, sc, wa, t) {
        const bh = 26 * sc, by = y - 12 * sc - bh, cabW = 34 * sc, cabH = 46 * sc;
        g.fillStyle = 'rgba(20,8,24,0.5)'; rr(g, x + 3, by + 3, len, bh + 10 * sc, 6 * sc); g.fill();
        g.fillStyle = '#231a22'; g.fillRect(x + 4 * sc, y - 14 * sc, len - 8 * sc, 6 * sc);
        g.fillStyle = LIV.boiler; rr(g, x + cabW - 4 * sc, by, len - cabW - 6 * sc, bh, bh / 2); g.fill();
        g.fillStyle = shade(LIV.boiler, 0.3); rr(g, x + cabW, by + 4 * sc, len - cabW - 16 * sc, 3.4 * sc, 1.6 * sc); g.fill();
        g.fillStyle = shade(LIV.boiler, -0.35); rr(g, x + len - 22 * sc, by, 16 * sc, bh, 5 * sc); g.fill();
        g.strokeStyle = LIV.trim; g.lineWidth = 1.5; [0.42, 0.62].forEach(f => { const xx = x + cabW + (len - cabW) * f; g.beginPath(); g.moveTo(xx, by + 2); g.lineTo(xx, by + bh - 2); g.stroke(); });
        g.fillStyle = '#d9b45a'; rr(g, x + cabW + (len - cabW) * 0.48, by - 7 * sc, 12 * sc, 9 * sc, 5 * sc); g.fill();
        const chx = x + len - 16 * sc; g.fillStyle = '#1b1418'; g.fillRect(chx - 4.5 * sc, by - 15 * sc, 9 * sc, 16 * sc); g.fillRect(chx - 6.5 * sc, by - 18 * sc, 13 * sc, 4 * sc);
        g.fillStyle = LIV.body; rr(g, x, y - 12 * sc - cabH, cabW, cabH, 4 * sc); g.fill();
        g.fillStyle = LIV.roof; rr(g, x - 3 * sc, y - 15 * sc - cabH, cabW + 6 * sc, 6 * sc, 3 * sc); g.fill();
        const fr = 14 * sc, fx = x + cabW / 2, fy = y - 12 * sc - cabH + 7 * sc + fr;
        g.fillStyle = '#ffe3a0'; rr(g, fx - fr - 3 * sc, fy - fr - 3 * sc, fr * 2 + 6 * sc, fr * 2 + 6 * sc, 6 * sc); g.fill();
        PANO.face = { x: fx, y: fy, r: fr };
        g.fillStyle = '#c6302c'; g.fillRect(x + len - 4 * sc, y - 16 * sc, 5 * sc, 10 * sc);
        g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(glow('#fff1b8'), x + len - 6 * sc - 26, by + bh * 0.4 - 26, 52, 52); g.restore();
        g.fillStyle = '#fff8d0'; g.beginPath(); g.arc(x + len - 2 * sc, by + bh * 0.4, 3.4 * sc, 0, TAU); g.fill();
        const wr = 11 * sc, wxs = [x + cabW + 6 * sc, x + cabW + 6 * sc + wr * 2.3, x + cabW + 6 * sc + wr * 4.6];
        wxs.forEach(wx => wheel(g, wx, y - wr + 1, wr, wa));
        wheel(g, x + len - 14 * sc, y - 6 * sc, 6 * sc, wa * 1.8);
        const ca = Math.cos(wa) * wr * 0.55, sa = Math.sin(wa) * wr * 0.55;
        g.strokeStyle = '#c9c0c8'; g.lineWidth = 2.4 * sc; g.beginPath(); g.moveTo(wxs[0] + ca, y - wr + 1 + sa); g.lineTo(wxs[2] + ca, y - wr + 1 + sa); g.stroke();
        void t;
        return { x: chx, y: by - 18 * sc };
      }
      function drawPanoFace(g) {
        const f = PANO.face; if (!f) return;
        const im = faces[loopie] || faces.happy;
        if (im && im.complete && im.naturalWidth) g.drawImage(im, f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
      }
      function showBanner() {
        if (PANO.banner || !ST.dest) return;
        const b = h('div', { class: 'tt-dest' }, h('small', { text: 'NEXT STOP' }), h('span', { text: ST.dest.text }));
        b.style.top = Math.round(M.H * (M.ph ? 0.79 : 0.78)) + 'px';
        el.append(b); PANO.banner = b; SND.bell();
      }

      /* ---------------- the loop ---------------- */
      const QA = { n: 0, acc: 0, q: 1 };
      let lastT = now();
      K.loop((dt0) => {
        const g = cv.g; if (!g || !M.W || !PA) return;
        const t = now(); if (SOFT && t - lastT < 0.03) return;
        const dt = Math.min(0.1, Math.max(0.001, t - lastT)); lastT = t;
        QA.n++; QA.acc += dt0; if (QA.n >= 90) { if (QA.acc / QA.n > 0.028 && QA.q > 0.6) { QA.q -= 0.2; cv.setQuality(QA.q); } QA.n = 0; QA.acc = 0; }
        musicTick(t);
        const rk = ST.rake, prevD = rk.d;
        if (rk.dur) { const k = clamp((t - rk.t0) / rk.dur, 0, 1); if (t >= rk.t0) rk.d = lerp(rk.from, rk.to, (rk.ease || inOut)(k)); if (k >= 1) rk.dur = 0; }
        layQueue();
        const rv = Math.abs(rk.d - prevD) / dt;
        ST.queue.forEach(c => { c.v = rv; clacks(c, t, lenOf(c), null); });
        if (ST.loco && ST.loco.mode === 'rake') ST.loco.v = rv;
        if (ST.loco) updLoco(ST.loco, dt, t);
        for (const c of ST.cars) if (c.mode !== 'queue') updCar(c, dt, t);
        if (ST.dep) { const d = ST.dep; d.v = Math.min(330, d.v + 110 * dt); d.d += d.v * dt; d.list.forEach(v => { v.s = v.s00 + d.d; v.v = d.v; }); MUS.chuff = clamp(d.v / 140, 0.3, 1); }
        ST.pts.b += (ST.pts.to - ST.pts.b) * Math.min(1, dt * 16);
        ST.sig.k += (ST.sig.to - ST.sig.k) * Math.min(1, dt * 7);
        if (ST.phase === 'sort') schedule(t);
        if (ST.glued && !glueBtn.hidden) { const p = jointPos(ST.glued); glueBtn.style.translate = Math.round(p.x) + 'px ' + Math.round(p.y) + 'px'; }
        const c = ST.active, pulse = c && !c.route && !c.glue && ST.phase === 'sort' ? Math.exp(-(((beatPos(t) % 1) + 1) % 1) * 5) : 0;
        if (Math.abs(pulse - (QA.pl || 0)) > 0.04) { QA.pl = pulse; padS.style.setProperty('--beat', pulse.toFixed(2)); padF.style.setProperty('--beat', pulse.toFixed(2)); }
        tagFollow();
        const dusk = !bright();
        if (ST.view === 'yard') {
          renderBg();
          g.drawImage(bg, 0, 0, M.W, M.H);
          ambient(g, t, dt);
          drawFx(g, t);
          drawStrike(g, t);
          drawPoints(g);
          for (const car of ST.cars) drawCar(g, car, t, dusk);
          faceJob = null;
          if (ST.loco) drawLoco(g, ST.loco, t, dusk);
          if (portal.width > 2) g.drawImage(portal, M.portal.x, M.portal.y, M.portal.w, M.portal.h);
          drawSignal(g, t);
          drawTagString(g);
          P.update(dt); P.draw(g);
          drawFace(g);
        } else {
          drawPano(g, t, dt);
          P.update(dt); P.draw(g);
          drawPanoFace(g);
        }
        drawIris(g, t);
      });

      /* ---------------- start ---------------- */
      (async () => {
        setBoard({ label: 'SORTING YARD', count: LAND.name.toUpperCase(), text: 'THOUGHT TRAIN NOW ARRIVING', user: false, lamp: '#ffb02e' });
        await K.intro({ title: 'Thought Train', sub: 'Your thoughts have been going round in circles. Time to sort the carriages.', how: 'A camera could film it? FACT. Your mind added it? STORY. Throw the switch on the beat.', char: 'loopie', mood: 'dizzy' });
        try { const a2 = await Promise.race([ctx.analysisReady, K.wait(700).then(() => null)]); if (a2 && typeof a2 === 'object' && Array.isArray(a2.spans)) an = a2; } catch (e) { /* keep the local reading */ }
        build();
        layQueue();
        MUS.t0 = now() + 0.1; MUS.next = 0; MUS.on = true;
        if (visits >= 2 && (visits === 2 || visits === 3)) K.later(() => glitch.say(L(LINES.newProp), { mood: 'wink', ms: 3000 }), 12000);
        await arriveTrain();
      })();

      return {
        async autoplay() {
          const until = async (fn, ms) => { const s = performance.now(); while (!fn() && performance.now() - s < (ms || 30000)) await K.wait(40); return fn(); };
          await K.wait(600);
          const card = el.querySelector('.gk-intro'); if (card) await K.sim.tap(card);
          await until(() => ST.phase === 'sort', 40000);
          let k = 0, wrongDone = false;
          while (ST.phase === 'sort') {
            await until(() => ST.phase !== 'sort' || (ST.active && !ST.active.route && (ST.active.mode === 'roll' || ST.active.mode === 'brake' || ST.active.mode === 'wait')), 30000);
            if (ST.phase !== 'sort') break;
            const c = ST.active;
            if (!c) continue;
            if (c.glue) {
              await until(() => c.mode === 'wait' || ST.phase !== 'sort', 20000);
              await K.wait(1100);
              for (let i = 0; i < NGLUE + 2 && ST.glued === c; i++) { if (!glueBtn.hidden) await K.sim.tap(glueBtn); await K.wait(380); }
              await until(() => ST.active !== c, 5000);
              continue;
            }
            while (now() < c.tArr - 0.03 && c.mode !== 'wait' && !c.route && ST.active === c) await K.wait(8);
            if (c.route || ST.active !== c) continue;
            k++;
            const wrong = !wrongDone && k === 2 && ST.total >= 4;
            if (wrong) wrongDone = true;
            const kind = wrong ? (c.kind === 'fact' ? 'story' : 'fact') : c.kind;
            await K.sim.tap(kind === 'fact' ? padF : padS);
            await until(() => ST.active !== c, 4000);
          }
          await until(() => ST.phase === 'nextstop' || ST.finished, 40000);
          if (ST.phase === 'nextstop') { await K.wait(1400); const b = ST.stops && ST.stops.querySelector('.tt-opt'); if (b) await K.sim.tap(b); }
          await until(() => ST.finished, 45000);
        }
      };
    }
  });
})(window.TSG_ENV);
