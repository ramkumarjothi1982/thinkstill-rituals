/* 024 Moth Jar — Reset · ORGANISE · Overthinking / Thought Fusion
 * Mechanism: mental noting and affect labelling (mindfulness noting; Lieberman et al. 2007). Naming a thought's type
 * ("worrying", "planning", "remembering", "judging") puts a little space between you and the thought and quietens it.
 * The porch lamp is attention and the player's looping thoughts are moths circling it. A slow, steady sweep of the net
 * catches one without scattering the rest (slow, deliberate movement settles arousal); a flick files it in the jar that
 * names its type, and Still says the label softly. A moth that is a real job glows differently and goes on a note,
 * "tomorrow, 10 minutes", not in a jar (worry postponement for the one thing that needs doing, not noting).
 * Verb: sweep (a slow net through the air), then flick (into a jar). Finale: the lamp dims, the jars glow like lanterns,
 * the lids lift and every named moth becomes a firefly drifting into the garden, until the whole garden blinks together.
 */
(function (env) {
  'use strict';
  const TAU = Math.PI * 2;
  const hex = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mix = (a, b, k) => { const p = hex(a), q = hex(b); k = Math.max(0, Math.min(1, k)); const f = (i) => Math.round(p[i] + (q[i] - p[i]) * k); return '#' + ((1 << 24) + (f(0) << 16) + (f(1) << 8) + f(2)).toString(16).slice(1); };
  const rgba = (c, a) => { const p = hex(c); return `rgba(${p[0]},${p[1]},${p[2]},${a})`; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; };

  /* Today's dusk (the same all day): its own sky for dark (late dusk) and bright (golden dusk), and its own foxgloves. */
  const DUSKS = [
    { id: 'blue', name: 'Blue Hour',
      dark: { top: '#0a1130', mid: '#1f2a5e', low: '#4b4a86', hz: '#c27b86', glow: '#ffcf8a', flower: '#e7a3d6' },
      bright: { top: '#4f6bb4', mid: '#8b97d2', low: '#d9aec4', hz: '#ffd2a6', glow: '#ffdca0', flower: '#c8448c' } },
    { id: 'lavender', name: 'Lavender Dusk',
      dark: { top: '#120d2c', mid: '#34275e', low: '#7c5a98', hz: '#e9a083', glow: '#ffc98a', flower: '#f2c6ff' },
      bright: { top: '#7466bd', mid: '#ad97d6', low: '#eebfd0', hz: '#ffd8a8', glow: '#ffdc9a', flower: '#8e4ec6' } },
    { id: 'ember', name: 'Ember Dusk',
      dark: { top: '#110b1d', mid: '#381736', low: '#82303f', hz: '#ec8346', glow: '#ffbf72', flower: '#ffd27a' },
      bright: { top: '#61549a', mid: '#bd7488', low: '#f1a074', hz: '#ffcf86', glow: '#ffd28e', flower: '#d8572a' } },
    { id: 'mint', name: 'Mint Dusk',
      dark: { top: '#061722', mid: '#103a45', low: '#336f6c', hz: '#d3cf86', glow: '#ffd98e', flower: '#c9f0ff' },
      bright: { top: '#3f8197', mid: '#82bdb6', low: '#d9e2ae', hz: '#fff0b6', glow: '#ffe6a8', flower: '#2f8fb0' } },
    { id: 'rose', name: 'Rose Dusk',
      dark: { top: '#180e22', mid: '#441f42', low: '#9a4566', hz: '#f8a985', glow: '#ffc890', flower: '#fff0f6' },
      bright: { top: '#8065aa', mid: '#d985a3', low: '#ffbfb0', hz: '#ffdcae', glow: '#ffdca6', flower: '#b43a70' } }
  ];
  /* Four jars, four kinds of thought. Each is tuned to a note of the closing chord; a calm catch reveals the rare species. */
  const JARS = [
    { id: 'worry', label: 'Worry', verb: 'Worrying', note: 'F4', glow: '#ffd27a', lid: ['#7f98bd', '#c3d3ea'], common: 'whatif', calm: 'silverwhatif' },
    { id: 'plan', label: 'Plan', verb: 'Planning', note: 'A4', glow: '#c8f5a8', lid: ['#8eab7c', '#cfe2bf'], common: 'luna', calm: 'moonluna' },
    { id: 'memory', label: 'Memory', verb: 'Remembering', note: 'C5', glow: '#ffb37a', lid: ['#c98b9a', '#f0ccd5'], common: 'underwing', calm: 'rosyunder' },
    { id: 'judge', label: 'Judgement', verb: 'Judging', note: 'E5', glow: '#ff9f8f', lid: ['#c9a25c', '#f0d9a6'], common: 'tiger', calm: 'scarlet' }
  ];
  const LOOP_JAR = { whatif: 0, worstcase: 0, body: 0, todo: 1, urge: 1, replay: 2, shouldhave: 3, mindread: 3 };
  /* The field guide: species are named by the jar you choose (and a calm sweep finds the rare one), never by luck. */
  const SP = {
    whatif: { name: 'Common What-If', latin: 'Noctua quidsi', shape: 'noctuid', fore: ['#8f8574', '#bcb09a'], hind: ['#d3cab8', '#9a907e'], line: '#4a4136', mark: 'kidney', body: '#7a6e5e' },
    silverwhatif: { name: 'Silver What-If', latin: 'Autographa argentea', shape: 'noctuid', fore: ['#5e5a72', '#908aa6'], hind: ['#b8b2c8', '#7f7a92'], line: '#2e2b3c', mark: 'y', markCol: '#f6f4ff', body: '#55506a' },
    luna: { name: 'Tomorrow Luna', latin: 'Actias crastina', shape: 'luna', fore: ['#dcf6c6', '#97d888'], hind: ['#d3f2bb', '#88cc7a'], line: '#86607a', costa: '#8a4f6e', eye: ['#f2d27a', '#5a3a7a'], body: '#f4f6e8', feather: true },
    moonluna: { name: 'Moonlit Luna', latin: 'Actias selene', shape: 'luna', fore: ['#f0f8ff', '#b8d4ef'], hind: ['#e8f2ff', '#a6c6e8'], line: '#6a78a8', costa: '#6a78a8', eye: ['#d8e6ff', '#3a4a7a'], body: '#ffffff', feather: true },
    underwing: { name: 'Replay Underwing', latin: 'Catocala iterum', shape: 'noctuid', fore: ['#7d6d5e', '#a69583'], hind: ['#f6973f', '#e2722a'], band: '#2a1912', line: '#3e3128', mark: 'kidney', body: '#6e5f50' },
    rosyunder: { name: 'Rosy Underwing', latin: 'Catocala rosea', shape: 'noctuid', fore: ['#6c5d68', '#968694'], hind: ['#f05c7c', '#d23a5c'], band: '#22121a', line: '#33262f', mark: 'kidney', body: '#5e5058' },
    tiger: { name: 'Should-Have Tiger', latin: 'Arctia debuisse', shape: 'tiger', fore: ['#f4e8cb', '#e6d6b0'], hind: ['#f06e40', '#d84a2a'], blotch: '#5a3a26', spots: '#1e2440', body: '#3a2a20', feather: true },
    scarlet: { name: 'Scarlet Tiger', latin: 'Callimorpha dominula', shape: 'tiger', fore: ['#1f2b2c', '#30403f'], hind: ['#ea3650', '#c81e3c'], blotch: '#f3e08a', spots: '#141414', body: '#1a1a1a', light: true },
    glow: { name: 'Errand Glow-moth', latin: 'Lampyra crastina', shape: 'geometer', fore: ['#f8f5e2', '#e6ebc8'], hind: ['#f4f2de', '#e0e8c2'], line: '#a6c858', glow: '#d6ff7a', body: '#e8e6c8' },
    emperor: { name: 'Heavy Emperor', latin: 'Saturnia gravis', shape: 'silk', fore: ['#b49878', '#d2b898'], hind: ['#d8a070', '#c07a50'], line: '#6a4a3a', eye: ['#f2c25e', '#26161e'], band: '#f4dccc', body: '#8a6a52', feather: true },
    gentleemp: { name: 'Gentle Emperor', latin: 'Saturnia lenis', shape: 'silk', fore: ['#c6b8da', '#e0d6ee'], hind: ['#d6bce0', '#b89ecb'], line: '#6a5a8a', eye: ['#f6dc8a', '#2a2448'], band: '#fff2e0', body: '#9a8ab0', feather: true }
  };
  const FIELD = Object.keys(SP).length;
  /* Moths in flight are dusky and cryptic; their colours only show once they are named and resting in a jar. */
  const DUSKY = [
    { shape: 'noctuid', fore: ['#7e7263', '#a89a86'], hind: ['#aa9e8a', '#7e7262'], line: '#4a4036', mark: 'kidney', body: '#6a5e50' },
    { shape: 'geometer', fore: ['#9a8e7c', '#c4b8a2'], hind: ['#bab09a', '#968a76'], line: '#5e5446', body: '#8a7e6c' },
    { shape: 'hawk', fore: ['#6f6a5e', '#99917e'], hind: ['#a48c76', '#7a6656'], line: '#3e3a32', body: '#5e584c', feather: true },
    { shape: 'noctuid', fore: ['#857868', '#ae9f88'], hind: ['#c6b59c', '#8c7c68'], line: '#53473b', mark: 'kidney', body: '#73685a' }
  ];
  const NET_RIMS = [['#5e4128', '#a8784a'], ['#8a4a22', '#e8a060'], ['#7c8592', '#eef4fb'], ['#a07a22', '#ffe08a']];
  const NET_NAMES = ['Ash', 'Copper', 'Silver', 'Gold'];
  const PROG = [['F2', ['A3', 'C4', 'E4', 'G4']], ['F2', ['G3', 'B3', 'D4', 'E4']], ['E2', ['G3', 'B3', 'D4', 'E4']], ['A1', ['G3', 'C4', 'E4', 'A4']]];
  const PENTA = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6'];

  /* The kit's daily pick, reproduced so "tomorrow's dusk" can be named honestly. */
  const dayVal = (d) => d.getFullYear() * 1000 + Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
  function pickFor(dv, arr, salt) {
    let x = (dv * 2654435761 + (salt || 0) * 40503 + Array.from('moth-jar').reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) >>> 0;
    x ^= x >>> 15; x = Math.imul(x, 2246822507) >>> 0; x ^= x >>> 13;
    return arr[(x >>> 0) % arr.length];
  }
  /* A task from the reading becomes the glowing job moth only if it is a doable job (not a regret like "have visited more"). */
  function cleanTask(s) {
    let t = String(s || '').replace(/[“”"]/g, '').replace(/…/g, ' ').replace(/\s+/g, ' ').trim();
    t = t.split(/\s+(?:and|but|because|so|then|or|before|after)\s+|[,.;:!?]/i)[0].trim();
    if (t.length < 4 || /^(have|had|been|be|not|never|stop|feel|feeling)\b/i.test(t)) return '';
    if (/\b(relax|calm down|sleep|be happy|stop thinking|feel better|chill)\b/i.test(t)) return '';
    t = t.replace(/\s+(tomorrow|today|tonight|later|soon|this week|next week|by friday|first thing)$/i, '').trim();
    if (t.length < 4) return '';
    t = t.charAt(0).toUpperCase() + t.slice(1);
    return t.length > 34 ? t.slice(0, 33).trim() + '…' : t;
  }

  /* ---------------- wing and body painting (field-guide plates, rendered once into sprites) ---------------- */
  function forePath(g, sh, S) {
    g.beginPath();
    if (sh === 'hawk') { g.moveTo(0.6, -0.16 * S); g.quadraticCurveTo(0.5 * S, -0.5 * S, 1.02 * S, -0.56 * S); g.quadraticCurveTo(0.84 * S, -0.22 * S, 0.56 * S, 0.04 * S); g.quadraticCurveTo(0.28 * S, 0.06 * S, 0.6, 0.02 * S); }
    else if (sh === 'geometer') { g.moveTo(0.6, -0.2 * S); g.quadraticCurveTo(0.4 * S, -0.56 * S, 0.94 * S, -0.42 * S); g.quadraticCurveTo(1.0 * S, -0.04 * S, 0.76 * S, 0.14 * S); g.quadraticCurveTo(0.36 * S, 0.14 * S, 0.6, 0.04 * S); }
    else if (sh === 'silk' || sh === 'luna') { g.moveTo(0.6, -0.22 * S); g.quadraticCurveTo(0.36 * S, -0.64 * S, 0.98 * S, -0.52 * S); g.quadraticCurveTo(1.04 * S, -0.1 * S, 0.78 * S, 0.12 * S); g.quadraticCurveTo(0.38 * S, 0.16 * S, 0.6, 0.04 * S); }
    else { g.moveTo(0.6, -0.18 * S); g.quadraticCurveTo(0.44 * S, -0.54 * S, 0.98 * S, -0.46 * S); g.quadraticCurveTo(0.92 * S, -0.12 * S, 0.7 * S, 0.1 * S); g.quadraticCurveTo(0.34 * S, 0.1 * S, 0.6, 0.04 * S); }
    g.closePath();
  }
  function hindPath(g, sh, S) {
    g.beginPath();
    if (sh === 'luna') { g.moveTo(0.6, 0); g.quadraticCurveTo(0.62 * S, -0.06 * S, 0.7 * S, 0.2 * S); g.quadraticCurveTo(0.62 * S, 0.5 * S, 0.42 * S, 0.62 * S); g.quadraticCurveTo(0.36 * S, 0.92 * S, 0.5 * S, 1.2 * S); g.quadraticCurveTo(0.26 * S, 1.0 * S, 0.22 * S, 0.62 * S); g.quadraticCurveTo(0.1 * S, 0.5 * S, 0.6, 0.24 * S); }
    else if (sh === 'hawk') { g.moveTo(0.6, 0.02 * S); g.quadraticCurveTo(0.42 * S, -0.02 * S, 0.5 * S, 0.14 * S); g.quadraticCurveTo(0.44 * S, 0.32 * S, 0.22 * S, 0.34 * S); g.quadraticCurveTo(0.08 * S, 0.3 * S, 0.6, 0.2 * S); }
    else if (sh === 'silk') { g.moveTo(0.6, 0); g.quadraticCurveTo(0.66 * S, -0.08 * S, 0.82 * S, 0.22 * S); g.quadraticCurveTo(0.78 * S, 0.62 * S, 0.4 * S, 0.66 * S); g.quadraticCurveTo(0.1 * S, 0.6 * S, 0.6, 0.26 * S); }
    else { g.moveTo(0.6, 0); g.quadraticCurveTo(0.56 * S, -0.06 * S, 0.74 * S, 0.18 * S); g.quadraticCurveTo(0.68 * S, 0.46 * S, 0.34 * S, 0.5 * S); g.quadraticCurveTo(0.1 * S, 0.42 * S, 0.6, 0.22 * S); }
    g.closePath();
  }
  function eyespot(g, x, y, r, eye) {
    g.fillStyle = 'rgba(20,12,10,0.55)'; g.beginPath(); g.arc(x, y, r * 1.18, 0, TAU); g.fill();
    g.fillStyle = eye[0]; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.fillStyle = eye[1]; g.beginPath(); g.arc(x, y, r * 0.58, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.arc(x - r * 0.18, y - r * 0.2, r * 0.17, 0, TAU); g.fill();
  }
  function speckle(g, S, y0, n, seed) {
    const r = seedRng(seed);
    for (let i = 0; i < n; i++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.13)' : 'rgba(255,255,255,0.12)'; g.fillRect(r() * S, y0 * S + (r() - 0.5) * S * 0.9, 0.5 + r() * 0.8, 0.5 + r() * 0.8); }
  }
  function seedRng(s) { let x = (s * 2654435761) >>> 0 || 7; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
  function paintWings(g, sp, S, seed) {
    const sh = sp.shape;
    g.save(); hindPath(g, sh, S);
    let gr = g.createRadialGradient(0, 0.1 * S, 0.04 * S, 0, 0.1 * S, 0.86 * S); gr.addColorStop(0, sp.hind[0]); gr.addColorStop(1, sp.hind[1]);
    g.fillStyle = gr; g.fill(); g.clip();
    if (sp.band && sh !== 'silk') { g.strokeStyle = sp.band; g.lineWidth = 0.075 * S; [0.36, 0.6].forEach(rr => { g.beginPath(); g.arc(0, 0.04 * S, rr * S, -0.4, 2.0); g.stroke(); }); }
    if (sh === 'silk') { if (sp.band) { g.strokeStyle = sp.band; g.lineWidth = 0.03 * S; g.beginPath(); g.arc(0, 0.04 * S, 0.62 * S, -0.3, 1.9); g.stroke(); } eyespot(g, 0.46 * S, 0.32 * S, 0.12 * S, sp.eye); }
    if (sh === 'luna' && sp.eye) eyespot(g, 0.38 * S, 0.3 * S, 0.065 * S, sp.eye);
    if (sh === 'tiger') { g.fillStyle = sp.spots; [[0.42, 0.24, 0.06], [0.58, 0.18, 0.05], [0.3, 0.4, 0.055]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x * S, y * S, r * S, 0, TAU); g.fill(); }); }
    if (sh === 'luna' && sp.costa) { g.strokeStyle = rgba(sp.costa, 0.5); g.lineWidth = 0.04 * S; g.beginPath(); g.moveTo(0.42 * S, 0.62 * S); g.quadraticCurveTo(0.36 * S, 0.92 * S, 0.5 * S, 1.2 * S); g.stroke(); }
    speckle(g, S, 0.25, 34, seed + 3);
    g.restore();
    g.save(); hindPath(g, sh, S); g.strokeStyle = 'rgba(30,20,10,0.35)'; g.lineWidth = 0.6; g.stroke(); g.restore();
    // forewing
    g.save(); forePath(g, sh, S);
    gr = g.createLinearGradient(0, -0.05 * S, S, -0.45 * S); gr.addColorStop(0, sp.fore[0]); gr.addColorStop(1, sp.fore[1]);
    g.fillStyle = gr; g.fill(); g.clip();
    if (sp.costa) { g.strokeStyle = sp.costa; g.lineWidth = 0.07 * S; g.beginPath(); g.moveTo(0.6, -0.22 * S); g.quadraticCurveTo(0.36 * S, -0.66 * S, 0.98 * S, -0.54 * S); g.stroke(); }
    if (sh === 'tiger') {
      g.fillStyle = sp.blotch;
      [[0.24, -0.26, 0.1, 0.07], [0.5, -0.36, 0.11, 0.07], [0.76, -0.38, 0.09, 0.06], [0.38, -0.06, 0.1, 0.06], [0.64, -0.12, 0.1, 0.07], [0.86, -0.18, 0.06, 0.06]].forEach(([x, y, rx, ry], i) => { g.beginPath(); g.ellipse(x * S, y * S, rx * S, ry * S, 0.4 + i * 0.3, 0, TAU); g.fill(); });
    } else if (sp.line) {
      g.strokeStyle = rgba(sp.line, 0.55); g.lineWidth = Math.max(0.5, 0.022 * S);
      [0.34, 0.62, 0.84].forEach((f, k) => { g.beginPath(); for (let a = -1.5; a <= 0.3; a += 0.07) { const rr = f * S * (1 + 0.05 * Math.sin(a * 13 + k * 2)); const x = Math.cos(a) * rr, y = Math.sin(a) * rr - 0.02 * S; if (a === -1.5) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke(); });
    }
    if (sp.mark === 'kidney') { g.strokeStyle = rgba(sp.line, 0.7); g.lineWidth = Math.max(0.5, 0.02 * S); g.beginPath(); g.ellipse(0.53 * S, -0.22 * S, 0.075 * S, 0.042 * S, 0.6, 0, TAU); g.stroke(); g.beginPath(); g.arc(0.33 * S, -0.2 * S, 0.035 * S, 0, TAU); g.stroke(); }
    if (sp.mark === 'y') { g.strokeStyle = sp.markCol; g.lineWidth = 0.045 * S; g.lineCap = 'round'; g.beginPath(); g.moveTo(0.36 * S, -0.3 * S); g.lineTo(0.46 * S, -0.18 * S); g.lineTo(0.56 * S, -0.3 * S); g.moveTo(0.46 * S, -0.18 * S); g.lineTo(0.5 * S, -0.06 * S); g.stroke(); }
    if ((sh === 'silk' || sh === 'luna') && sp.eye) eyespot(g, 0.56 * S, -0.24 * S, sh === 'silk' ? 0.11 * S : 0.06 * S, sp.eye);
    if (sh === 'silk' && sp.band) { g.strokeStyle = sp.band; g.lineWidth = 0.03 * S; g.beginPath(); g.moveTo(0.82 * S, -0.56 * S); g.quadraticCurveTo(0.74 * S, -0.2 * S, 0.62 * S, 0.12 * S); g.stroke(); }
    g.strokeStyle = sp.light ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)'; g.lineWidth = 0.5;
    for (let i = 0; i < 6; i++) { const a = -1.0 + i * 0.22; g.beginPath(); g.moveTo(1, -0.04 * S); g.lineTo(Math.cos(a) * S, Math.sin(a) * S * 0.9); g.stroke(); }
    speckle(g, S, -0.2, 54, seed);
    g.restore();
    g.save(); forePath(g, sh, S); g.strokeStyle = 'rgba(30,20,10,0.42)'; g.lineWidth = 0.7; g.stroke(); g.restore();
    // fringe along the outer margin
    g.save(); g.strokeStyle = sp.light ? 'rgba(255,240,200,0.4)' : 'rgba(255,248,230,0.35)'; g.lineWidth = Math.max(0.6, 0.03 * S); g.setLineDash([0.9, 1.6]); g.beginPath();
    if (sh === 'hawk') { g.moveTo(1.02 * S, -0.56 * S); g.quadraticCurveTo(0.84 * S, -0.22 * S, 0.56 * S, 0.04 * S); }
    else if (sh === 'geometer') { g.moveTo(0.94 * S, -0.42 * S); g.quadraticCurveTo(1.0 * S, -0.04 * S, 0.76 * S, 0.14 * S); }
    else if (sh === 'silk' || sh === 'luna') { g.moveTo(0.98 * S, -0.52 * S); g.quadraticCurveTo(1.04 * S, -0.1 * S, 0.78 * S, 0.12 * S); }
    else { g.moveTo(0.98 * S, -0.46 * S); g.quadraticCurveTo(0.92 * S, -0.12 * S, 0.7 * S, 0.1 * S); }
    g.stroke(); g.restore();
  }
  function paintBody(g, sp, S) {
    const silk = sp.shape === 'silk', hawk = sp.shape === 'hawk', col = sp.body;
    const bw = S * (silk ? 0.12 : hawk ? 0.1 : 0.085);
    g.fillStyle = mix(col, '#000000', 0.14);
    g.beginPath(); g.ellipse(0, S * 0.22, bw * 0.86, S * (hawk ? 0.36 : 0.3), 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 0.5;
    for (let i = 1; i < 5; i++) { const y = S * (0.04 + i * 0.09); g.beginPath(); g.moveTo(-bw * 0.7, y); g.quadraticCurveTo(0, y + 1, bw * 0.7, y); g.stroke(); }
    const tg = g.createRadialGradient(0, -S * 0.13, 0, 0, -S * 0.1, bw * 1.4); tg.addColorStop(0, mix(col, '#ffffff', 0.3)); tg.addColorStop(1, col);
    g.fillStyle = tg; g.beginPath(); g.ellipse(0, -S * 0.1, bw * 1.06, S * 0.14, 0, 0, TAU); g.fill();
    g.strokeStyle = rgba(mix(col, '#ffffff', 0.45), 0.55); g.lineWidth = 0.6;
    for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * 0.3; g.beginPath(); g.moveTo(Math.cos(a) * bw * 0.6, -S * 0.1 + Math.sin(a) * S * 0.08); g.lineTo(Math.cos(a) * bw * 1.2, -S * 0.1 + Math.sin(a) * S * 0.16); g.stroke(); }
    g.fillStyle = mix(col, '#000000', 0.22); g.beginPath(); g.arc(0, -S * 0.27, bw * 0.75, 0, TAU); g.fill();
    g.fillStyle = '#140e0a'; [-1, 1].forEach(s => { g.beginPath(); g.arc(s * bw * 0.5, -S * 0.29, bw * 0.33, 0, TAU); g.fill(); });
    g.strokeStyle = mix(col, '#000000', 0.35); g.lineWidth = Math.max(0.6, S * 0.02); g.lineCap = 'round';
    [-1, 1].forEach(s => {
      g.beginPath(); g.moveTo(s * bw * 0.3, -S * 0.33); g.quadraticCurveTo(s * S * 0.07, -S * 0.5, s * S * 0.25, -S * 0.62); g.stroke();
      if (sp.feather) { g.lineWidth = Math.max(0.4, S * 0.012); for (let k = 0.25; k < 0.95; k += 0.12) { const x = s * (bw * 0.3 + (S * 0.25 - bw * 0.3) * k) , y = -S * (0.33 + 0.29 * k); g.beginPath(); g.moveTo(x, y); g.lineTo(x + s * S * 0.035, y + S * 0.03); g.moveTo(x, y); g.lineTo(x - s * S * 0.02, y - S * 0.035); g.stroke(); } g.lineWidth = Math.max(0.6, S * 0.02); }
    });
  }

  const L = {
    start: { Jolly: 'Lamp’s on, and your thoughts have come to visit. Let’s catch them, gently.', Cheeky: 'Lamp’s on. Every thought in the garden turned up. Typical.', Unfiltered: 'Thoughts are circling the lamp. Catch one. Slowly.' },
    loopStart: { Jolly: 'Round and round and round. I know that feeling.', Cheeky: 'Round and round. Honestly? Same.', Unfiltered: 'Round and round. Like my head.' },
    scatter: { Jolly: 'Whoa, they scattered!', Cheeky: 'Ninja net. The moths are not impressed.', Unfiltered: 'Too fast. They bolted.' },
    slower: { Jolly: 'Slow and dreamy works best. Moths don’t mind a slow net.', Cheeky: 'Slower. You’re catching moths, not a bus.', Unfiltered: 'Slow sweeps catch. Fast ones scare.' },
    slower2: { Jolly: 'Gently does it.', Cheeky: 'Easy, tiger.', Unfiltered: 'Slower.' },
    first: { Jolly: 'Got one. Have a look… then flick it into the jar that names it.', Cheeky: 'Caught! Now name it. A rough label is fine.', Unfiltered: 'Caught. Flick it into the jar that names its type.' },
    anyJar: { Jolly: 'There’s no wrong jar. Your best guess is the right one.', Cheeky: 'No wrong answers. It’s your thought.', Unfiltered: 'Any jar works. You know it best.' },
    bonk: { Jolly: 'That one keeps bonking the lamp. Same, little guy.', Cheeky: 'Bonk. Bonk. Bonk. Very committed.', Unfiltered: 'It keeps hitting the lamp. Relatable.' },
    glowIn: { Jolly: 'Ooh. This one glows differently.', Cheeky: 'Hello, glowy. You’re not like the others.', Unfiltered: 'That one glows. It’s different.' },
    glowCaught: { Jolly: 'That’s not a loop, it’s a real job. Jobs go on the note: tomorrow, ten minutes.', Cheeky: 'An actual job! Those get a note, not a jar. Tomorrow, ten minutes.', Unfiltered: 'Real job. Note, not jar. Tomorrow, ten minutes.' },
    glowExample: { Jolly: 'If there’s a real job in there, it goes on a note: tomorrow, ten minutes.', Cheeky: 'Real jobs get a note, not a jar. Tomorrow, ten minutes.', Unfiltered: 'Jobs go on the note. Tomorrow, ten minutes.' },
    notJar: { Jolly: 'Not a jar for this one. It goes on the note.', Cheeky: 'Nope, jobs don’t go in jars. The note!', Unfiltered: 'Not a jar. The note.' },
    noted: { Jolly: 'Written down. You don’t have to hold it tonight.', Cheeky: 'On the note. Officially tomorrow’s problem.', Unfiltered: 'Written down. Done for tonight.' },
    coreIn: { Jolly: 'Oh! That’s a big one.', Cheeky: 'Okay. That one’s the boss.', Unfiltered: 'Big one incoming.' },
    coreTip: { Jolly: 'The heaviest one. Your slowest sweep yet.', Cheeky: 'The heavy one. Slow as honey.', Unfiltered: 'Heaviest one. Slowest sweep.' },
    crickets: { Jolly: 'Hear the crickets slowing down? They chirp slower as the night cools.', Cheeky: 'Crickets chirp slower when it cools down. Even they’re chilling.', Unfiltered: 'Crickets slow down as it cools. Listen.' },
    dim: { Jolly: 'Every one named. Let’s turn the lamp down.', Cheeky: 'All named. The lamp can clock off.', Unfiltered: 'All named. Lamp down.' },
    lids: { Jolly: 'Lift the lids. Named thoughts can go.', Cheeky: 'Open up. They’ve been labelled, they can leave.', Unfiltered: 'Open the jars. Let them go.' },
    sleepy: { Jolly: 'They’re just little lights now.', Cheeky: 'Fireflies. Much less needy.', Unfiltered: 'Just lights now.' },
    hedgehog: { Jolly: 'Is that… a hedgehog? Hello!', Cheeky: 'A hedgehog’s come to watch. No pressure.', Unfiltered: 'Hedgehog. Hi.' },
    owl: { Jolly: 'An owl’s come to watch. Hoo’s there?', Cheeky: 'The owl is judging your technique. Kindly.', Unfiltered: 'Owl on the fence.' }
  };

  (env.games = env.games || []).push({
    id: 'moth-jar', mode: 'reset', name: 'Moth Jar', verb: 'sweep', family: 'ORGANISE', minutes: 2,
    parents: ['Overthinking / Thought Fusion', 'Uncertainty / Future Worry / Reassurance', 'Sleep / Winding Down'],
    cast: ['still', 'loopie'], poster: { char: 'still', mood: 'calm' }, fonts: ['IM+Fell+English:ital@0;1'],
    tagline: 'Catch the thought-moths circling your lamp and name each one.',
    why: 'For thoughts that keep circling: catch each one gently and name what kind it is.',
    css: `
.g-moth-jar { --mj-display: "IM Fell English", "Lora", "TeX Gyre Pagella", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif; --font-display: var(--mj-display);
  --ui-bg: #0b0f26; --ui-surface: #201a33; --ui-fg: #f8eedb; --ui-muted: #d6c9b4; --ui-accent: #ffc76b; --ui-accent-ink: #2a1806; --ui-line: rgba(248, 238, 219, 0.2); --ui-scrim: rgba(10, 8, 20, 0.55);
  --mj-paper: #f6ecd2; --mj-ink: #3a2a1a; --mj-rust: #8a4f24; background: #0b0f26; color-scheme: dark; }
.tsg[data-scene="bright"] .g-moth-jar { --ui-bg: #efe2d4; --ui-surface: #fffaf1; --ui-fg: #2c2018; --ui-muted: #6b5848; --ui-accent: #a3561a; --ui-accent-ink: #ffffff; --ui-line: rgba(44, 32, 24, 0.16); --ui-scrim: rgba(44, 32, 24, 0.3); background: #6f86c9; color-scheme: light; }
.g-moth-jar .gk-intro-title { font-weight: 400; font-style: italic; letter-spacing: 0; }
.g-moth-jar .mj-pad { position: absolute; inset: 0; z-index: 20; touch-action: none; cursor: crosshair; outline: none; -webkit-tap-highlight-color: transparent; }
.g-moth-jar .mj-pad:focus-visible { box-shadow: inset 0 0 0 3px rgba(255, 214, 140, 0.8); }
.g-moth-jar .mj-label { position: absolute; left: 0; top: 0; z-index: 22; transform: translate(-50%, -50%) rotate(var(--rot, 0deg)); pointer-events: none; padding: 5px 8px 4px; text-align: center; white-space: nowrap;
  font: italic 400 15px/1.05 var(--mj-display); color: var(--mj-ink); background: var(--mj-paper); border-radius: 3px; letter-spacing: 0.01em;
  box-shadow: 0 1px 0 rgba(120, 80, 40, 0.35), 0 4px 10px rgba(0, 0, 0, 0.3); transition: box-shadow 0.35s ease; }
.g-moth-jar .mj-label::before { content: ""; position: absolute; left: 50%; top: -7px; width: 1px; height: 7px; background: rgba(140, 100, 60, 0.7); }
.g-moth-jar.mj-desk .mj-label { font-size: 18px; padding: 6px 11px 5px; }
.g-moth-jar .mj-label.mj-hint { box-shadow: 0 0 0 2px #ffd27a, 0 0 18px 5px rgba(255, 210, 122, 0.6), 0 4px 10px rgba(0, 0, 0, 0.3); animation: moth-jar-hint 1.6s ease-in-out infinite; }
@keyframes moth-jar-hint { 0%, 100% { box-shadow: 0 0 0 2px #ffd27a, 0 0 12px 3px rgba(255, 210, 122, 0.45), 0 4px 10px rgba(0, 0, 0, 0.3); } 50% { box-shadow: 0 0 0 2px #ffe6a8, 0 0 22px 7px rgba(255, 210, 122, 0.7), 0 4px 10px rgba(0, 0, 0, 0.3); } }
.g-moth-jar .mj-tag { position: absolute; left: 0; top: 0; z-index: 33; pointer-events: none; width: max-content; max-width: min(200px, 54cqw); padding: 7px 11px 8px 21px; background: var(--mj-paper); color: var(--mj-ink);
  border-radius: 3px 10px 10px 3px; box-shadow: 0 1px 0 rgba(120, 80, 40, 0.35), 0 8px 18px rgba(0, 0, 0, 0.38); opacity: 0; transition: opacity 0.25s ease; will-change: transform; }
.g-moth-jar .mj-tag::before { content: ""; position: absolute; left: 7px; top: 50%; width: 7px; height: 7px; margin-top: -3.5px; border-radius: 50%; background: rgba(58, 42, 26, 0.3); box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.35); }
.g-moth-jar .mj-tag.mj-on { opacity: 1; }
.g-moth-jar .mj-tag small { display: block; font: 600 12px/1.15 var(--font-ui); letter-spacing: 0.1em; text-transform: uppercase; color: var(--mj-rust); margin-bottom: 3px; }
.g-moth-jar .mj-tag .gk-user { display: block; font: 700 16px/1.15 var(--font-ui); letter-spacing: 0.03em; text-wrap: balance; }
.g-moth-jar .mj-tag.mj-task { background: #f2f7dc; box-shadow: 0 0 0 2px rgba(190, 240, 110, 0.75), 0 0 20px rgba(200, 255, 120, 0.45), 0 8px 18px rgba(0, 0, 0, 0.38); }
.g-moth-jar .mj-note { position: absolute; left: 0; top: 0; z-index: 24; width: 160px; padding: 20px 11px 10px; background: #fbf6e6; color: var(--mj-ink); border-radius: 2px; pointer-events: none;
  box-shadow: 0 1px 0 rgba(120, 80, 40, 0.3), 0 10px 22px rgba(0, 0, 0, 0.35); transform: translateY(14px) rotate(2deg); opacity: 0;
  transition: opacity 0.5s ease, transform 0.6s cubic-bezier(.2, 1.2, .4, 1), left 0.9s cubic-bezier(.3, .9, .3, 1), top 0.9s cubic-bezier(.3, .9, .3, 1), width 0.9s ease, padding 0.9s ease;
  background-image: repeating-linear-gradient(180deg, transparent 0 20px, rgba(110, 150, 190, 0.22) 20px 21px); background-position: 0 28px; }
.g-moth-jar.mj-desk .mj-note { width: 196px; }
.g-moth-jar .mj-note.mj-on { opacity: 1; transform: rotate(2deg); }
.g-moth-jar .mj-note.mj-glow { box-shadow: 0 0 0 2px rgba(190, 240, 110, 0.8), 0 0 26px rgba(200, 255, 120, 0.5), 0 10px 22px rgba(0, 0, 0, 0.35); }
.g-moth-jar .mj-note .mj-pin { position: absolute; left: 50%; top: 6px; width: 12px; height: 12px; margin-left: -6px; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #ffb0a0, #c0392b 60%, #6e1a12); box-shadow: 0 2px 3px rgba(0, 0, 0, 0.4); }
.g-moth-jar .mj-note small { display: block; font: 700 13px/1.2 var(--font-ui); letter-spacing: 0.02em; color: #2f6b2a; margin-bottom: 4px; white-space: nowrap; }
.g-moth-jar .mj-note .gk-user { display: block; font: 600 16px/1.25 var(--font-ui); text-wrap: balance; }
.g-moth-jar .mj-note em { display: block; margin-top: 4px; font: italic 400 13px/1.2 var(--mj-display); color: #6b5848; }
.g-moth-jar .mj-note canvas { position: absolute; right: -14px; top: -16px; width: 60px; height: 44px; pointer-events: none; }
.g-moth-jar .mj-card { position: absolute; left: 0; top: 0; z-index: 34; transform: translate(-50%, -100%) translateY(10px); text-align: center; pointer-events: none; opacity: 0; width: max-content; max-width: 230px;
  transition: opacity 0.45s ease, transform 0.8s cubic-bezier(.2, .9, .3, 1); color: #fff6e4; text-shadow: 0 2px 8px rgba(10, 6, 20, 0.85), 0 0 2px rgba(10, 6, 20, 0.9); }
.g-moth-jar .mj-card.mj-on { opacity: 1; transform: translate(-50%, -100%); }
.g-moth-jar .mj-card b { display: block; font: italic 400 19px/1.1 var(--mj-display); }
.g-moth-jar .mj-card span { display: block; margin-top: 3px; font: 600 12px/1.2 var(--font-ui); letter-spacing: 0.06em; color: #ffe0a8; }
.tsg[data-scene="bright"] .g-moth-jar .mj-card { color: #fffaf0; text-shadow: 0 2px 8px rgba(40, 20, 50, 0.9), 0 0 2px rgba(40, 20, 50, 0.95); }
.g-moth-jar .mj-cap { position: absolute; left: 50%; top: 0; z-index: 36; transform: translate(-50%, -40%); text-align: center; pointer-events: none; opacity: 0; width: max-content; max-width: calc(100% - 32px);
  transition: opacity 1.4s ease, transform 1.6s cubic-bezier(.2, .9, .3, 1); color: #fff7e2; text-shadow: 0 3px 16px rgba(6, 4, 16, 0.9), 0 0 3px rgba(6, 4, 16, 0.8); }
.g-moth-jar .mj-cap.mj-on { opacity: 1; transform: translate(-50%, -50%); }
.g-moth-jar .mj-cap b { display: block; font: italic 400 clamp(34px, 10.5cqw, 58px)/1.02 var(--mj-display); text-wrap: balance; }
.g-moth-jar .mj-cap span { display: block; margin-top: 10px; font: 600 14px/1.35 var(--font-ui); letter-spacing: 0.06em; color: #ffe7b8; }
.g-moth-jar .mj-cap i { display: block; margin-top: 4px; font: italic 400 15px/1.3 var(--mj-display); color: #f4dcae; }
.g-moth-jar .gk-char { transition: opacity 0.5s ease; }
.g-moth-jar .gk-bubble { max-width: min(250px, calc(100cqw - 164px)); }
.g-moth-jar.mj-desk .gk-bubble { max-width: 300px; }
.g-moth-jar .mj-note.mj-tucked { width: 140px; padding: 16px 9px 8px; }
.g-moth-jar .mj-note.mj-tucked em { display: none; }
.g-moth-jar .mj-note.mj-tucked .gk-user { font-size: 15px; }
.g-moth-jar .mj-note.mj-tucked canvas { right: auto; left: -16px; top: -22px; }
.tsg.reduced-motion .g-moth-jar .mj-label.mj-hint { animation: none; }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el;
      let an = ctx.analysis || {};
      const inten = clamp(Number(ctx.intensity) || 0, 0, 2);
      const care = () => an.safety === 'care';
      const say = (o) => (typeof o === 'string' ? o : care() ? o.Jolly : ctx.line(o));
      const visits = K.visits();
      let DK = pickFor(dayVal(new Date()), DUSKS, 3);
      try { if (S.isDev && S.isDev()) { const q = new URLSearchParams(location.search).get('mjdusk'), f = DUSKS.find(x => x.id === q); if (f) DK = f; } } catch (e) { /* dev preview only */ }
      const TOMORROW = pickFor(dayVal(new Date(Date.now() + 864e5)), DUSKS, 3);
      const netTier = clamp(Number(S.store.get('moth-jar:net', 0)) || 0, 0, 3);
      const T = {
        strands: [2, 4, 6][inten], flying: [2, 3, 3][inten], hoop: [46, 40, 35][inten], vCalm: [1000, 780, 640][inten], vMin: 22,
        spd: [62, 84, 102][inten], wander: [0.6, 0.9, 1.15][inten], dart: [0.25, 0.45, 0.6][inten], tired: [8, 14, 20][inten], ff: [6, 8, 10][inten]
      };
      const pal = () => DK[K.dark() ? 'dark' : 'bright'];

      /* ---------------- words: the player's own thoughts (strands), the job, the heaviest one ---------------- */
      function buildItems() {
        const key = (s) => String(s || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
        const strands = (an.strands || []).filter(s => s && s.label);
        const core = an.core && an.core.label ? an.core : null;
        const seen = new Set(core ? [key(core.label)] : []);
        let task = null;
        const job = cleanTask(an.task);
        if (job) task = { kind: 'task', text: job, generic: false, loop: 'todo' };
        else {
          const td = strands.find(s => s.loop === 'todo' && !s.generic) || strands.find(s => s.loop === 'todo');
          if (td) { task = { kind: 'task', text: td.label, generic: !!td.generic, loop: 'todo' }; seen.add(key(td.label)); }
          else task = { kind: 'task', text: 'A JOB FOR TOMORROW', generic: true, loop: 'todo' };
        }
        const out = [];
        for (const s of strands) { if (out.length >= T.strands) break; const k = key(s.label); if (!k || seen.has(k)) continue; seen.add(k); out.push({ kind: 'strand', text: s.label, generic: !!s.generic, loop: s.loop || 'other' }); }
        let c = core ? { kind: 'core', text: core.label, generic: !!core.generic, loop: core.loop || 'other' } : null;
        if (!c && out.length > 2) { c = out.pop(); c.kind = 'core'; }
        return { strands: out, task, core: c };
      }
      let ITEMS = buildItems();
      const hintJar = (it) => (it && LOOP_JAR[it.loop] != null ? LOOP_JAR[it.loop] : -1);

      /* ---------------- DOM ---------------- */
      const cv = K.canvas(el, { opaque: true, maxDpr: 1.5 });
      const P = K.particles({ max: 300 });
      const pad = h('div', { class: 'mj-pad', role: 'application', tabindex: '0', 'aria-label': 'A porch at dusk. Drag to sweep the net slowly through the moths, then flick a caught moth into the jar that names it. Keys: arrows move the net, space sweeps, 1 to 4 pick a jar, N for the note.' });
      const labels = JARS.map((j, i) => h('div', { class: 'mj-label', text: j.label, 'aria-hidden': 'true', style: { '--rot': ['-2deg', '1.5deg', '-1deg', '2deg'][i] } }));
      const tag = h('div', { class: 'mj-tag', role: 'status' }, h('small'), h('span', { class: 'gk-user' }));
      const noteCv = h('canvas', { 'aria-hidden': 'true' });
      const note = h('div', { class: 'mj-note', role: 'note', 'aria-label': 'Tomorrow, ten minutes' }, h('i', { class: 'mj-pin' }), h('small', { text: 'Tomorrow · 10 min' }), h('span', { class: 'gk-user' }), h('em'), noteCv);
      const card = h('div', { class: 'mj-card', 'aria-live': 'polite' }, h('b'), h('span'));
      const cap = h('div', { class: 'mj-cap', 'aria-live': 'polite' }, h('b'), h('span'), h('i'));
      el.append(pad, ...labels, note, tag, card, cap);
      note.hidden = true;
      const still = K.character('still', { side: 'right', mood: 'calm', x: 10, y: 96, size: 58 });
      const loopie = K.character('loopie', { side: 'left', mood: 'worried', x: 320, y: 96, size: 56 });
      el.classList.toggle('mj-desk', false);

      /* ---------------- voices: Still speaks first, Loopie waits for a gap ---------------- */
      const CH = { still: { c: still, until: 0 }, loopie: { c: loopie, until: 0 } };
      function talk(who, o, ms, mood, moodMs) {
        if (finished && who === 'loopie') return;
        const me = CH[who], other = CH[who === 'still' ? 'loopie' : 'still'], txt = say(o), now = performance.now();
        const go = () => { other.c.hush(); other.until = 0; me.c.say(txt, { ms: ms || 3200, mood, moodMs }); me.until = performance.now() + (ms || 3200); };
        if (who === 'loopie' && other.until > now + 250) { S.later(go, Math.min(2600, other.until - now)); return; }
        go();
      }

      /* ---------------- state ---------------- */
      const G = { w: 0, h: 0, phone: true, U: 1 };
      const W = { phase: 'intro', t: 0, lampK: 1, night: 0, nightT: 0, phi: 0, phiV: 0, lampX: 0, lampY: 0, bonks: 0, saidBonk: false, frantic: 0, lastFrantic: -99, saidFrantic: false, jarGlow: 0, ffK: 0, syncChime: 0, cameoT: 0, bpm: 66, saidCrickets: false };
      const NET = { alpha: 1, gx: 0, gy: 0, x: 0, y: 0, vx: 0, th: 0, thv: 0, hx: 0, hy: 0, phx: 0, phy: 0, tx: 0, ty: 0, tvx: 0, tvy: 0, speed: 0, moth: null, touching: false, trail: [], init: false, auto: null, bump: 0 };
      const SC = { catches: [], best: 0, frantic: 0, jarred: 0, noted: 0, matched: 0, species: [] };
      const SPH = [];
      const moths = [], FF = [], MOTES = [];
      const J = JARS.map(() => ({ moths: [], lid: 0, lidV: 0, lidT: 0, flash: 0, open: false, freed: false, cx: 0, glow: 0, lan: 0 }));
      let Q = [], doneCount = 0, total = 0, finished = false, spawnSide = 1, taskMoth = null, noteShown = false, noteRest = false;
      let BG = null, BGN = null, CUR = null, bgId = 0, LAN = null, JARC = null, JARCN = null, LIDS = null, SPR = new Map();

      /* ---------------- layout ---------------- */
      function off(w, hh) { const c = document.createElement('canvas'); const d = cv.dpr || 1; c.width = Math.max(1, Math.round(w * d)); c.height = Math.max(1, Math.round(hh * d)); const g = c.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); return { c, g, w, h: hh }; }
      function layout() {
        const w = cv.w, H = cv.h; if (!w || !H) return;
        const phone = w < 700, U = phone ? clamp(Math.min(w / 390, H / 760), 0.86, 1.12) : clamp(H / 700, 1, 1.35);
        Object.assign(G, { w, h: H, phone, U });
        el.classList.toggle('mj-desk', !phone);
        G.ceil = Math.round(phone ? 70 : 78); G.beam = G.ceil + Math.round(phone ? 16 : 20);
        G.lx = Math.round(w / 2); G.ly = Math.round(H * (phone ? 0.31 : 0.33));
        G.lw = 44 * U; G.lh = 72 * U;
        G.post = phone ? 18 : 26;
        G.postL = phone ? 0 : Math.max(0, Math.round(w / 2 - 600)); G.postR = phone ? w - G.post : Math.min(w - G.post, Math.round(w / 2 + 600 - G.post));
        G.shelf = H - (phone ? 46 : 52);
        G.jw = phone ? Math.min(80, (w - 50) / 4 - 10) : 94 * U; G.jh = G.jw * 1.38; G.gap = phone ? (w - 4 * G.jw) / 5 : 44 * U;
        G.jarTop = G.shelf - G.jh;
        const x0 = phone ? G.gap : w / 2 - (4 * G.jw + 3 * G.gap) / 2;
        J.forEach((j, i) => { j.x = x0 + i * (G.jw + G.gap); j.cx = j.x + G.jw / 2; });
        G.rx = phone ? Math.min(w * 0.4, 162) : Math.min(w * 0.27, 330 * U);
        G.ry = Math.min(phone ? G.rx * 0.8 : 150 * U, G.ly - G.beam - 34 * U);
        G.hz = Math.round(H * (phone ? 0.56 : 0.5));
        G.zone = { x0: G.postL + G.post + 14, x1: G.postR - 14, y0: G.beam + 16, y1: G.jarTop - 60 * U };
        G.r = T.hoop * U; G.L = 98 * U;
        G.home = phone ? { x: w * 0.8, y: G.jarTop - 26 * U } : { x: G.lx + G.rx * 0.78, y: G.jarTop - 20 * U };
        G.noteW = phone ? 160 : 196;
        G.note = phone ? { x: w - G.noteW - 14, y: Math.round(G.hz - 20 * U) } : { x: G.postR - G.noteW - 40, y: Math.round(G.hz - 40 * U) };
        G.tuck = phone ? { x: w - 140 - 12, y: G.beam + 8 + 56 + 14 } : { x: G.postR - 196 - 40, y: Math.round(G.hz - 40 * U) };
        G.rest = phone ? { x: w - 140 - 14, y: Math.round(G.hz - 6 * U) } : G.tuck;   // finale: pinned on the fence, clear of the voices above
        if (!NET.init) { NET.init = true; NET.gx = NET.x = G.home.x; NET.gy = NET.y = G.home.y; NET.hx = NET.phx = NET.x; NET.hy = NET.phy = NET.y - G.L; NET.tx = NET.hx; NET.ty = NET.hy + G.r * 1.5; }
        else if (!NET.touching && !NET.moth) { NET.gx = G.home.x; NET.gy = G.home.y; }
        // characters on the porch beam
        const cs = phone ? 58 : 84, ls = phone ? 56 : 80;
        still.el.style.setProperty('--sz', cs + 'px'); loopie.el.style.setProperty('--sz', ls + 'px');
        G.still = { x: phone ? 8 : G.postL + G.post + 18, y: G.beam + 8, s: cs };
        G.loopie = { x: phone ? w - ls - 8 : G.postR - ls - 18, y: G.beam + 8, s: ls };
        still.place(G.still.x, G.still.y); loopie.place(G.loopie.x, G.loopie.y);
        labels.forEach((lb, i) => { lb.style.left = J[i].cx + 'px'; lb.style.top = (G.jarTop + G.jh * 0.6) + 'px'; });
        const np = SC.noted ? (noteRest ? G.rest : G.tuck) : G.note; note.style.left = np.x + 'px'; note.style.top = np.y + 'px';
        cap.style.top = Math.round(phone ? H * 0.43 : H * 0.42) + 'px';
        SPR = new Map(); paintAll();
      }
      function paintAll() { BG = paintBack(false); BGN = paintBack(true); CUR = off(G.w, G.h); CUR.key = ''; bgId++; LAN = paintLantern(); JARC = paintJar(false); JARCN = K.dark() ? null : paintJar(true); LIDS = JARS.map((j, i) => paintLid(i)); moths.forEach(m => { m.spr = sprite(m.look, m.S); }); }

      /* ---------------- sprites ---------------- */
      function sprite(sp, Sz) {
        const key = (sp.name || sp.shape + sp.fore[0]) + ':' + Sz.toFixed(1);
        if (SPR.has(key)) return SPR.get(key);
        const pr = Math.min(3, (cv.dpr || 1) * 1.25), seed = Array.from(key).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
        const wtop = Sz * 0.72, wbot = Sz * (sp.shape === 'luna' ? 1.28 : 0.74), ww = Sz * 1.1 + 2, wh = wtop + wbot;
        const wing = document.createElement('canvas'); wing.width = Math.ceil(ww * pr); wing.height = Math.ceil(wh * pr);
        const wg = wing.getContext('2d'); wg.setTransform(pr, 0, 0, pr, 0, wtop * pr); paintWings(wg, sp, Sz, seed);
        const lit = document.createElement('canvas'); lit.width = wing.width; lit.height = wing.height;
        const lg = lit.getContext('2d'); lg.drawImage(wing, 0, 0); lg.globalCompositeOperation = 'screen'; lg.fillStyle = 'rgba(255,196,128,0.5)'; lg.fillRect(0, 0, lit.width, lit.height); lg.globalCompositeOperation = 'destination-in'; lg.drawImage(wing, 0, 0);
        const bw = Sz * 0.62, bt = Sz * 0.68, bh = bt + Sz * 0.62;
        const body = document.createElement('canvas'); body.width = Math.ceil(bw * pr); body.height = Math.ceil(bh * pr);
        const bg = body.getContext('2d'); bg.setTransform(pr, 0, 0, pr, bw / 2 * pr, bt * pr); paintBody(bg, sp, Sz);
        const s = { S: Sz, wing, lit, body, ww, wh, ay: wtop, bw, bh, bx: bw / 2, by: bt };
        SPR.set(key, s); return s;
      }
      function drawMothSpr(g, spr, x, y, rot, flap, scale, lit, alpha) {
        g.save(); g.translate(x, y); g.rotate(rot); if (scale !== 1) g.scale(scale, scale);
        g.globalAlpha = alpha;
        for (let side = -1; side <= 1; side += 2) {
          g.save(); g.scale(side * flap, 1);
          g.drawImage(spr.wing, 0, -spr.ay, spr.ww, spr.wh);
          if (lit > 0.04) { g.globalAlpha = alpha * lit; g.drawImage(spr.lit, 0, -spr.ay, spr.ww, spr.wh); g.globalAlpha = alpha; }
          g.restore();
        }
        g.drawImage(spr.body, -spr.bx, -spr.by, spr.bw, spr.bh);
        g.restore(); g.globalAlpha = 1;
      }

      /* ---------------- the garden, the porch and the light: two cached pictures (lamp on, lamp down) ---------------- */
      function paintBack(night) {
        const w = G.w, H = G.h, D = K.dark(), C = pal(), U = G.U, hz = G.hz, dim = night ? 1 : 0;
        const o = off(w, H), g = o.g;
        // night: in dark it goes to deep ink; in bright it settles into a rich blue hour (still night, never black)
        const top = mix(C.top, D ? '#03040c' : '#11133a', dim * (D ? 0.5 : 0.74)), mid = mix(C.mid, D ? '#070818' : '#1f2152', dim * (D ? 0.55 : 0.72));
        const low = mix(mix(C.low, C.mid, dim * 0.55), D ? C.low : '#2e2b62', D ? 0 : dim * 0.62), hzc = mix(mix(C.hz, C.low, dim * 0.65), D ? C.hz : '#5a4a86', D ? 0 : dim * 0.55);
        const sky = g.createLinearGradient(0, 0, 0, hz + 30 * U);
        sky.addColorStop(0, top); sky.addColorStop(0.5, mid); sky.addColorStop(0.82, low); sky.addColorStop(1, hzc);
        g.fillStyle = sky; g.fillRect(0, 0, w, hz + 30 * U);
        const sa = D ? (0.5 + dim * 0.5) : dim * 0.65;
        if (sa > 0.02) { const r = K.rng(31 + DK.id.length); g.fillStyle = '#ffffff'; for (let i = 0; i < (G.phone ? 120 : 240); i++) { const x = r() * w, y = Math.pow(r(), 1.5) * hz * 0.82, s = r() < 0.12 ? 1.8 : 1.1; g.globalAlpha = sa * (0.25 + r() * 0.6) * (1 - y / hz); g.fillRect(x, y, s, s); } g.globalAlpha = 1; }
        // the moon (phase from the date)
        const ph = [0.18, 0.4, 0.7, 1, 1, 0.7, 0.4, 0.18][K.daily() % 8], mr = (G.phone ? 15 : 21) * U;
        const mx = G.phone ? w * 0.73 : G.lx + 360 * U, my = G.beam + (G.phone ? 128 : 118) * U;
        const mg = g.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 6); mg.addColorStop(0, rgba('#fff4dc', D ? 0.3 : 0.22)); mg.addColorStop(1, rgba('#fff4dc', 0));
        g.fillStyle = mg; g.fillRect(mx - mr * 6, my - mr * 6, mr * 12, mr * 12);
        const mo = off(mr * 2 + 4, mr * 2 + 4); mo.g.fillStyle = D ? '#fbf3df' : '#fffaf0'; mo.g.beginPath(); mo.g.arc(mr + 2, mr + 2, mr, 0, TAU); mo.g.fill();
        mo.g.fillStyle = 'rgba(200,190,170,0.35)'; [[0.3, -0.2, 0.22], [-0.25, 0.25, 0.16], [0.1, 0.4, 0.1]].forEach(([a, b, c]) => { mo.g.beginPath(); mo.g.arc(mr + 2 + a * mr, mr + 2 + b * mr, c * mr, 0, TAU); mo.g.fill(); });
        if (ph < 1) { mo.g.globalCompositeOperation = 'destination-out'; mo.g.beginPath(); mo.g.arc(mr + 2 - mr * 2 * ph, mr + 2 - mr * 0.15, mr * 1.02, 0, TAU); mo.g.fill(); }
        g.globalAlpha = D ? 1 : 0.85; g.drawImage(mo.c, mx - mr - 2, my - mr - 2, mr * 2 + 4, mr * 2 + 4); g.globalAlpha = 1;
        // horizon haze
        const hg = g.createLinearGradient(0, hz - 90 * U, 0, hz + 10); hg.addColorStop(0, rgba(C.hz, 0)); hg.addColorStop(1, rgba(C.hz, 0.32 * (1 - dim * 0.7)));
        g.fillStyle = hg; g.fillRect(0, hz - 90 * U, w, 100 * U);
        // garden layers: each drawn on its own layer, then lit by the lamp where it is close
        const dk = D ? '#04050c' : '#2a2e4c';
        const far = mix(mix(C.low, C.mid, 0.5), dk, (D ? 0.5 : 0.3) + dim * (D ? 0.15 : 0.42)), midc = mix(C.mid, dk, (D ? 0.62 : 0.42) + dim * (D ? 0.12 : 0.4)), near = mix(C.top, dk, (D ? 0.55 : 0.45) + dim * (D ? 0.1 : 0.32));
        const fence = mix(midc, '#efe2cc', (D ? 0.2 : 0.34) - dim * 0.1), lawn = mix(C.top, D ? '#020306' : '#1d2138', (D ? 0.68 : 0.45) + dim * (D ? 0.12 : 0.4));
        const lay = off(w, H), lg = lay.g, litA = night ? 0.1 : (D ? 0.55 : 0.36);
        const light = (a, rad) => { lg.globalCompositeOperation = 'source-atop'; const gr = lg.createRadialGradient(G.lx, G.ly, 10, G.lx, G.ly, rad); gr.addColorStop(0, rgba(C.glow, a)); gr.addColorStop(0.5, rgba(C.glow, a * 0.3)); gr.addColorStop(1, rgba(C.glow, 0)); lg.fillStyle = gr; lg.fillRect(0, 0, w, H); lg.globalCompositeOperation = 'source-over'; };
        const flush = () => { g.drawImage(lay.c, 0, 0, w, H); lg.clearRect(0, 0, w, H); };
        const rr = K.rng(7 + DK.id.length);
        lg.fillStyle = far; for (let x = -30; x < w + 40;) { const r0 = (20 + rr() * 30) * U; lg.beginPath(); lg.arc(x, hz - r0 * 0.35 - rr() * 14 * U, r0, 0, TAU); lg.fill(); x += r0 * (0.9 + rr() * 0.6); }
        lg.fillRect(0, hz - 12 * U, w, 60 * U); light(litA * 0.35, H * 0.7); flush();
        lg.fillStyle = midc; for (let x = -20; x < w + 30;) { const r0 = (16 + rr() * 22) * U; lg.beginPath(); lg.arc(x, hz + 36 * U - r0 * 0.4, r0, 0, TAU); lg.fill(); x += r0 * (1.1 + rr() * 0.5); }
        lg.fillRect(0, hz + 30 * U, w, 70 * U); light(litA * 0.6, H * 0.55); flush();
        // the picket fence
        const pt = hz + 30 * U, pb = hz + 100 * U, pw = 10 * U, pstep = 21 * U;
        const ga = G.lx - 30 * U, gb = G.lx + 30 * U;   // a garden gate under the lamp, with a rose arch
        lg.fillStyle = mix(fence, '#000000', 0.25); [[0, ga], [gb, w]].forEach(([x0, x1]) => { lg.fillRect(x0, pt + 22 * U, x1 - x0, 5 * U); lg.fillRect(x0, pt + 56 * U, x1 - x0, 5 * U); });
        for (let x = -pw; x < w + pw; x += pstep) { if (x + pw > ga - 6 * U && x < gb + 6 * U) continue; lg.fillStyle = fence; lg.beginPath(); lg.moveTo(x, pb); lg.lineTo(x, pt + 6 * U); lg.lineTo(x + pw / 2, pt); lg.lineTo(x + pw, pt + 6 * U); lg.lineTo(x + pw, pb); lg.closePath(); lg.fill(); lg.fillStyle = 'rgba(0,0,0,0.18)'; lg.fillRect(x + pw * 0.72, pt + 6 * U, pw * 0.28, pb - pt - 6 * U); }
        [ga - 9 * U, gb].forEach(x => { lg.fillStyle = fence; lg.fillRect(x, pt - 16 * U, 9 * U, pb - pt + 16 * U); lg.beginPath(); lg.arc(x + 4.5 * U, pt - 18 * U, 5 * U, 0, TAU); lg.fill(); });
        lg.strokeStyle = fence; lg.lineWidth = 4 * U; lg.beginPath(); lg.arc(G.lx, pt - 16 * U, 34.5 * U, Math.PI, TAU); lg.stroke();
        lg.strokeStyle = mix(near, midc, 0.4); lg.lineWidth = 2 * U; for (let a = Math.PI * 1.04; a < TAU - 0.05; a += 0.22) { lg.beginPath(); lg.arc(G.lx + Math.cos(a) * 34.5 * U, pt - 16 * U + Math.sin(a) * 34.5 * U, 4.5 * U, a, a + 2.4); lg.stroke(); }
        for (let a = Math.PI * 1.1; a < TAU - 0.1; a += 0.31) { lg.fillStyle = mix(C.flower, '#000000', (D ? 0.25 : 0) + dim * 0.3); lg.beginPath(); lg.arc(G.lx + Math.cos(a) * 36 * U, pt - 16 * U + Math.sin(a) * 36 * U, 3 * U, 0, TAU); lg.fill(); }
        light(litA * 1.1, H * 0.48); flush();
        // lawn with a pool of lamplight
        const lw = g.createLinearGradient(0, pb - 6 * U, 0, G.shelf); lw.addColorStop(0, mix(lawn, midc, 0.3)); lw.addColorStop(1, mix(lawn, '#000000', 0.25));
        g.fillStyle = lw; g.fillRect(0, pb - 6 * U, w, G.shelf - pb + 6 * U);
        if (!night) { g.save(); g.globalCompositeOperation = D ? 'lighter' : 'source-over'; const pg = g.createRadialGradient(G.lx, pb + 70 * U, 4, G.lx, pb + 70 * U, Math.min(w * 0.5, 260 * U)); pg.addColorStop(0, rgba(C.glow, D ? 0.2 : 0.22)); pg.addColorStop(1, rgba(C.glow, 0)); g.fillStyle = pg; g.fillRect(0, pb, w, G.shelf - pb); g.restore(); }
        // stepping stones from the porch out to the gate, catching the lamplight
        const nst = clamp(Math.floor((G.jarTop - pb) / (24 * U)), 0, 5);
        for (let k = 0; k < nst; k++) {
          const t = nst > 1 ? k / (nst - 1) : 0.5, y = G.jarTop - 8 * U + (pb + 8 * U - (G.jarTop - 8 * U)) * Math.pow(t, 0.85), x = G.lx + Math.sin(k * 1.7) * 9 * U * (1 - t), rx2 = (30 - 19 * t) * U, ry2 = rx2 * 0.34;
          g.fillStyle = mix(lawn, '#000000', 0.3); g.beginPath(); g.ellipse(x, y + ry2 * 0.4, rx2, ry2, 0, 0, TAU); g.fill();
          const st = g.createLinearGradient(0, y - ry2, 0, y + ry2); st.addColorStop(0, mix(mix(lawn, '#c8c0b4', 0.42), C.glow, night ? 0 : 0.28)); st.addColorStop(1, mix(lawn, '#8a8278', 0.25));
          g.fillStyle = st; g.beginPath(); g.ellipse(x, y, rx2, ry2, 0, 0, TAU); g.fill();
        }
        // grass blades along the fence foot
        g.strokeStyle = mix(lawn, '#000000', 0.2); g.lineWidth = 1.2 * U;
        for (let x = 0; x < w; x += 5 * U) { const hh = (6 + rr() * 12) * U; g.beginPath(); g.moveTo(x, pb + 2); g.quadraticCurveTo(x + 2 * U, pb - hh * 0.5, x + (rr() - 0.5) * 6 * U, pb - hh); g.stroke(); }
        // foxgloves and ferns in front of the fence
        const fx = G.phone ? [0.07, 0.15, 0.87, 0.95] : [0.06, 0.11, 0.16, 0.84, 0.89, 0.94];
        fx.forEach((k, i) => {
          const x = w * k, by = pb + (30 + rr() * 30) * U, ty = hz - (10 + rr() * 50) * U;
          lg.strokeStyle = near; lg.lineWidth = 2.4 * U; lg.beginPath(); lg.moveTo(x, by); lg.quadraticCurveTo(x + 6 * U, (by + ty) / 2, x + (rr() - 0.5) * 8 * U, ty); lg.stroke();
          lg.fillStyle = near; for (let k2 = 0; k2 < 3; k2++) { lg.beginPath(); lg.ellipse(x + (k2 - 1) * 12 * U, by - 6 * U, 16 * U, 6 * U, (k2 - 1) * 0.5, 0, TAU); lg.fill(); }
          const n = 9;
          for (let b = 0; b < n; b++) { const kk = b / n, yy = ty + 10 * U + (by - ty) * 0.62 * kk, s = (3 + kk * 4.5) * U, side = b % 2 ? 1 : -1; lg.fillStyle = mix(C.flower, '#000000', (D ? 0.35 : 0.1) + dim * 0.3); lg.beginPath(); lg.ellipse(x + side * s * 0.9, yy, s * 0.75, s, side * 0.5, 0, TAU); lg.fill(); lg.fillStyle = rgba('#ffffff', D ? 0.18 : 0.3); lg.beginPath(); lg.arc(x + side * s * 0.9, yy + s * 0.4, s * 0.3, 0, TAU); lg.fill(); }
          void i;
        });
        [[0, 1], [w, -1]].forEach(([x, s]) => { lg.strokeStyle = near; lg.lineWidth = 1.6 * U; for (let f = 0; f < 6; f++) { const a = -Math.PI / 2 + s * (0.25 + f * 0.17), len = (70 + rr() * 50) * U, ex = x + Math.cos(a) * len * s * s, ey = G.shelf - 10 * U + Math.sin(a) * len; lg.beginPath(); lg.moveTo(x, G.shelf - 6 * U); lg.quadraticCurveTo(x + s * len * 0.5, G.shelf - len * 0.9, ex + s * 20 * U, ey); lg.stroke(); for (let l = 0.2; l < 1; l += 0.1) { const lx = x + (ex + s * 20 * U - x) * l, ly = G.shelf - 6 * U + (ey - G.shelf) * l * 0.95 - Math.sin(l * Math.PI) * 20 * U; lg.beginPath(); lg.moveTo(lx, ly); lg.lineTo(lx + s * 7 * U * (1 - l), ly + 6 * U); lg.stroke(); } } });
        light(litA * 0.9, H * 0.5); flush();
        // a flowerbed just behind the shelf: mounded shrubs, lavender spikes and lamp-lit daisies
        const bedC = mix(near, '#000000', D ? 0.2 : 0.12), lav = mix(C.flower, '#6a4c9c', 0.45);
        const behindJar = (x, m) => J.some(j => x > j.x - m && x < j.x + G.jw + m);
        lg.fillStyle = bedC;
        for (let x = -24; x < w + 30;) { const r0 = (16 + rr() * 22) * U; lg.beginPath(); lg.arc(x, G.shelf - r0 * 0.15, r0, 0, TAU); lg.fill(); x += r0 * (1.1 + rr() * 0.7); }
        for (let i = 0; i < (G.phone ? 44 : 80); i++) {
          const x = rr() * w, hh = (60 + rr() * 90) * U, lean = (rr() - 0.5) * 16 * U, tx = x + lean, ty = G.shelf - hh;
          if (ty + hh * 0.38 > G.jarTop - 4 && behindJar(tx, 6 * U)) continue;
          lg.strokeStyle = bedC; lg.lineWidth = 1.3 * U; lg.beginPath(); lg.moveTo(x, G.shelf); lg.quadraticCurveTo(x + lean * 0.2, G.shelf - hh * 0.6, tx, ty); lg.stroke();
          lg.fillStyle = mix(lav, '#000000', (D ? 0.35 : 0.08) + dim * 0.3);
          for (let b = 0; b < 6; b++) { const k = b / 6, bx = x + (tx - x) * (0.62 + k * 0.38), by = G.shelf + (ty - G.shelf) * (0.62 + k * 0.38); lg.beginPath(); lg.ellipse(bx + (b % 2 ? 1.6 : -1.6) * U, by, 1.7 * U, 2.6 * U, 0, 0, TAU); lg.fill(); }
        }
        for (let i = 0; i < (G.phone ? 22 : 40); i++) {
          const x = (0.04 + rr() * 0.92) * w, y = G.shelf - (40 + rr() * 110) * U, pr2 = (3.2 + rr() * 2.2) * U;
          if (y > G.jarTop - 8 && behindJar(x, 10 * U)) continue;
          lg.strokeStyle = bedC; lg.lineWidth = 1 * U; lg.beginPath(); lg.moveTo(x, G.shelf); lg.lineTo(x + (rr() - 0.5) * 6 * U, y); lg.stroke();
          lg.fillStyle = mix('#f6efdc', '#000000', (D ? 0.3 : 0) + dim * 0.4);
          for (let p = 0; p < 7; p++) { const a = p / 7 * TAU; lg.beginPath(); lg.ellipse(x + Math.cos(a) * pr2, y + Math.sin(a) * pr2 * 0.7, pr2 * 0.55, pr2 * 0.28, a, 0, TAU); lg.fill(); }
          lg.fillStyle = '#e8b84a'; lg.beginPath(); lg.arc(x, y, pr2 * 0.38, 0, TAU); lg.fill();
        }
        light(litA * 1.2, H * 0.42); flush();
        // the porch: ceiling planks, beam, posts, the shelf where the jars stand
        const wood = D ? '#2c1b12' : '#5e3c27', woodLit = D ? '#8a5530' : '#c08050';
        g.fillStyle = wood; g.fillRect(0, 0, w, G.beam);
        const cg = g.createRadialGradient(G.lx, G.ceil, 4, G.lx, G.ceil, w * (G.phone ? 0.62 : 0.42)); cg.addColorStop(0, rgba(woodLit, 0.95 - dim * 0.7)); cg.addColorStop(1, rgba(woodLit, 0));
        g.fillStyle = cg; g.fillRect(0, 0, w, G.ceil);
        for (let y = 9 * U; y < G.ceil; y += 11 * U) { g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(0, y, w, 1.2); g.fillStyle = 'rgba(255,220,180,0.06)'; g.fillRect(0, y + 1.2, w, 1); }
        g.fillStyle = mix(wood, '#000000', 0.3); g.fillRect(0, G.ceil, w, G.beam - G.ceil);
        const bl = g.createLinearGradient(0, 0, w, 0); bl.addColorStop(0, rgba(C.glow, 0)); bl.addColorStop(0.5, rgba(C.glow, 0.42 - dim * 0.32)); bl.addColorStop(1, rgba(C.glow, 0));
        g.fillStyle = bl; g.fillRect(0, G.beam - 2.5 * U, w, 2.5 * U);
        [G.postL, G.postR].forEach((px, i) => {
          g.fillStyle = wood; g.fillRect(px, G.beam, G.post, G.shelf - G.beam);
          const pg = g.createLinearGradient(px, 0, px + G.post, 0), inner = i === 0 ? 1 : 0;
          pg.addColorStop(inner, rgba(woodLit, 0.6 - dim * 0.4)); pg.addColorStop(1 - inner, rgba(woodLit, 0));
          g.fillStyle = pg; g.fillRect(px, G.beam, G.post, G.shelf - G.beam);
          g.fillStyle = mix(wood, '#000000', 0.25); g.beginPath(); const bx = i === 0 ? px + G.post : px; g.moveTo(bx, G.beam); g.lineTo(bx + (i === 0 ? 1 : -1) * 26 * U, G.beam); g.lineTo(bx, G.beam + 26 * U); g.closePath(); g.fill();
        });
        g.fillStyle = mix(wood, '#000000', 0.12); g.fillRect(0, G.shelf, w, H - G.shelf);
        const sg = g.createLinearGradient(0, 0, w, 0); sg.addColorStop(0, rgba(woodLit, 0.15)); sg.addColorStop(0.5, rgba(woodLit, 0.75 - dim * 0.5)); sg.addColorStop(1, rgba(woodLit, 0.15));
        g.fillStyle = sg; g.fillRect(0, G.shelf, w, 4 * U);
        g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, G.shelf + 14 * U, w, 1.5);
        J.forEach(j => { g.fillStyle = 'rgba(0,0,0,0.38)'; g.beginPath(); g.ellipse(j.cx, G.shelf + 2, G.jw * 0.52, 4.5 * U, 0, 0, TAU); g.fill(); });
        // the lamp's warm wash over everything near it
        if (!night) {
          const wl = off(w, H), wg = wl.g.createRadialGradient(G.lx, G.ly, 6, G.lx, G.ly, H * 0.62); wg.addColorStop(0, rgba(C.glow, D ? 0.2 : 0.45)); wg.addColorStop(1, rgba(C.glow, 0));
          wl.g.fillStyle = wg; wl.g.fillRect(0, 0, w, H); wl.g.globalCompositeOperation = 'destination-in';
          const mk = wl.g.createLinearGradient(0, hz - 110 * U, 0, hz + 10 * U); mk.addColorStop(0, 'rgba(0,0,0,0)'); mk.addColorStop(1, 'rgba(0,0,0,1)'); wl.g.fillStyle = mk; wl.g.fillRect(0, 0, w, H);
          g.save(); g.globalCompositeOperation = D ? 'lighter' : 'soft-light'; g.drawImage(wl.c, 0, 0, w, H); g.restore();
        }
        // a soft vignette keeps the eye on the lamp
        const vg = g.createRadialGradient(w / 2, H * 0.42, Math.min(w, H) * 0.3, w / 2, H * 0.45, Math.max(w, H) * 0.78);
        vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, D ? `rgba(4,2,10,${0.42 + dim * 0.16})` : `rgba(14,12,40,${0.22 + dim * 0.3})`);
        g.fillStyle = vg; g.fillRect(0, 0, w, H);
        return o;
      }
      function paintLantern() {
        const U = G.U, lw = G.lw, lh = G.lh, pad = 8 * U, o = off(lw + pad * 2, lh + pad * 2), g = o.g, cx = o.w / 2;
        const iron = K.dark() ? '#211913' : '#33251b', brass = '#b98a44', brassHi = '#f2d08a';
        const ring = pad + 3.5 * U, r0 = pad + 7 * U, r1 = pad + 19 * U, gy0 = r1 + 3.5 * U, gy1 = pad + lh - 12 * U, gx0 = lw * 0.42, gx1 = lw * 0.35;
        g.lineCap = 'round'; g.lineJoin = 'round';
        g.strokeStyle = iron; g.lineWidth = 2 * U; g.beginPath(); g.arc(cx, ring, 3.2 * U, 0, TAU); g.stroke();
        g.fillStyle = iron; g.beginPath(); g.moveTo(cx - 5 * U, r0); g.lineTo(cx + 5 * U, r0); g.lineTo(cx + lw * 0.56, r1); g.lineTo(cx - lw * 0.56, r1); g.closePath(); g.fill();
        g.strokeStyle = rgba(brassHi, 0.55); g.lineWidth = 1 * U; g.beginPath(); g.moveTo(cx - 3 * U, r0 + 1.5 * U); g.lineTo(cx - lw * 0.44, r1 - 1.5 * U); g.stroke();
        g.fillStyle = brass; g.fillRect(cx - lw * 0.5, r1, lw, 3.5 * U);
        g.fillStyle = rgba(brassHi, 0.6); g.fillRect(cx - lw * 0.5, r1, lw, 1 * U);
        g.strokeStyle = iron; g.lineWidth = 2.6 * U; g.beginPath(); g.moveTo(cx - gx0, gy0); g.lineTo(cx - gx1, gy1); g.lineTo(cx + gx1, gy1); g.lineTo(cx + gx0, gy0); g.closePath(); g.stroke();
        g.lineWidth = 1.5 * U; [-0.5, 0.5].forEach(k => { g.beginPath(); g.moveTo(cx + gx0 * k, gy0); g.lineTo(cx + gx1 * k, gy1); g.stroke(); });
        g.beginPath(); g.moveTo(cx - (gx0 + gx1) / 2, (gy0 + gy1) / 2 + 6 * U); g.lineTo(cx + (gx0 + gx1) / 2, (gy0 + gy1) / 2 + 6 * U); g.lineWidth = 1 * U; g.stroke();
        g.fillStyle = brass; g.fillRect(cx - lw * 0.42, gy1, lw * 0.84, 3.5 * U);
        g.fillStyle = iron; g.beginPath(); g.moveTo(cx - lw * 0.36, gy1 + 3.5 * U); g.lineTo(cx + lw * 0.36, gy1 + 3.5 * U); g.lineTo(cx + 4 * U, gy1 + 9.5 * U); g.lineTo(cx - 4 * U, gy1 + 9.5 * U); g.closePath(); g.fill();
        g.fillStyle = brass; g.beginPath(); g.arc(cx, gy1 + 11 * U, 2 * U, 0, TAU); g.fill();
        return { c: o.c, w: o.w, h: o.h, ax: cx, ay: ring, gy0, gy1, gx0, gx1, cy: (gy0 + gy1) / 2 + 2 * U };
      }
      function jarPath(g, x0, y0, jw, jh) {
        const nw = jw * 0.68, l = x0 + (jw - nw) / 2, r = x0 + (jw + nw) / 2;
        g.beginPath(); g.moveTo(l, y0 + jh * 0.05); g.lineTo(l, y0 + jh * 0.12); g.bezierCurveTo(l - 2, y0 + jh * 0.18, x0, y0 + jh * 0.17, x0, y0 + jh * 0.28); g.lineTo(x0, y0 + jh * 0.9);
        g.quadraticCurveTo(x0, y0 + jh, x0 + jw * 0.13, y0 + jh); g.lineTo(x0 + jw * 0.87, y0 + jh); g.quadraticCurveTo(x0 + jw, y0 + jh, x0 + jw, y0 + jh * 0.9); g.lineTo(x0 + jw, y0 + jh * 0.28);
        g.bezierCurveTo(x0 + jw, y0 + jh * 0.17, r + 2, y0 + jh * 0.18, r, y0 + jh * 0.12); g.lineTo(r, y0 + jh * 0.05); g.closePath();
      }
      function paintJar(nightGlass) {
        // bright theme gets a second, darker glass for the finale night, so the lantern glow reads
        const U = G.U, jw = G.jw, jh = G.jh, D = K.dark() || !!nightGlass, o = off(jw + 10 * U, jh + 10 * U), g = o.g, x0 = 5 * U, y0 = 5 * U;
        jarPath(g, x0, y0, jw, jh); g.fillStyle = D ? 'rgba(170,210,225,0.1)' : 'rgba(255,255,255,0.2)'; g.fill();
        g.save(); jarPath(g, x0, y0, jw, jh); g.clip();
        const hl = g.createLinearGradient(x0, 0, x0 + jw, 0);
        hl.addColorStop(0, 'rgba(255,255,255,0)'); hl.addColorStop(0.1, 'rgba(255,255,255,0.36)'); hl.addColorStop(0.2, 'rgba(255,255,255,0.05)'); hl.addColorStop(0.78, 'rgba(255,255,255,0)'); hl.addColorStop(0.87, 'rgba(255,255,255,0.2)'); hl.addColorStop(1, 'rgba(255,255,255,0.02)');
        g.fillStyle = hl; g.fillRect(x0, y0 + jh * 0.2, jw, jh * 0.76);
        g.fillStyle = D ? 'rgba(210,240,245,0.16)' : 'rgba(255,255,255,0.32)'; g.beginPath(); g.ellipse(x0 + jw / 2, y0 + jh * 0.975, jw * 0.42, jh * 0.035, 0, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = 1.2 * U; g.beginPath(); g.ellipse(x0 + jw / 2, y0 + jh * 0.3, jw * 0.46, jh * 0.04, 0, Math.PI * 0.1, Math.PI * 0.9); g.stroke();
        g.restore();
        jarPath(g, x0, y0, jw, jh); g.strokeStyle = D ? 'rgba(225,242,255,0.55)' : 'rgba(60,80,105,0.5)'; g.lineWidth = 1.4 * U; g.stroke();
        const nw = jw * 0.68;
        g.strokeStyle = D ? 'rgba(225,242,255,0.35)' : 'rgba(60,80,105,0.3)'; g.lineWidth = 1 * U;
        [0.075, 0.1].forEach(k => { g.beginPath(); g.moveTo(x0 + (jw - nw) / 2, y0 + jh * k); g.quadraticCurveTo(x0 + jw / 2, y0 + jh * k + 2.2 * U, x0 + (jw + nw) / 2, y0 + jh * k); g.stroke(); });
        return { c: o.c, w: o.w, h: o.h, ox: x0, oy: y0 };
      }
      function paintLid(i) {
        const U = G.U, nw = G.jw * 0.68, lw = nw * 1.24, lh = G.jh * 0.2, o = off(lw + 10 * U, lh + 12 * U), g = o.g, cx = o.w / 2, top = 4 * U, [base, hi] = JARS[i].lid, D = K.dark();
        const b = D ? mix(base, '#000000', 0.12) : base;
        g.fillStyle = mix(b, '#000000', 0.18);
        g.beginPath(); g.moveTo(cx - lw * 0.42, top + lh * 0.3); g.lineTo(cx - lw * 0.5, top + lh * 0.86);
        for (let s = 0; s < 5; s++) { const x1 = cx - lw * 0.5 + lw * (s + 1) / 5; g.quadraticCurveTo(x1 - lw * 0.1, top + lh * 1.04, x1, top + lh * 0.86); }
        g.lineTo(cx + lw * 0.42, top + lh * 0.3); g.closePath(); g.fill();
        g.save(); g.clip(); g.strokeStyle = rgba(hi, 0.35); g.lineWidth = 2 * U; for (let x = -lw; x < lw; x += 6 * U) { g.beginPath(); g.moveTo(cx + x, top); g.lineTo(cx + x + lh, top + lh); g.stroke(); g.beginPath(); g.moveTo(cx + x + lh, top); g.lineTo(cx + x, top + lh); g.stroke(); } g.restore();
        const dg = g.createLinearGradient(0, top, 0, top + lh * 0.5); dg.addColorStop(0, hi); dg.addColorStop(1, b);
        g.fillStyle = dg; g.beginPath(); g.ellipse(cx, top + lh * 0.3, lw * 0.44, lh * 0.26, 0, 0, TAU); g.fill();
        g.strokeStyle = rgba('#ffffff', 0.25); g.lineWidth = 1 * U; g.setLineDash([2 * U, 2 * U]); g.beginPath(); g.ellipse(cx, top + lh * 0.3, lw * 0.38, lh * 0.2, 0, 0, TAU); g.stroke(); g.setLineDash([]);
        const tw = top + lh * 0.62;
        g.strokeStyle = '#8a6a3a'; g.lineWidth = 1.6 * U; [0, 2.5 * U].forEach(d => { g.beginPath(); g.moveTo(cx - nw * 0.52, tw + d); g.quadraticCurveTo(cx, tw + d + 2.4 * U, cx + nw * 0.52, tw + d); g.stroke(); });
        g.beginPath(); g.ellipse(cx + nw * 0.18 - 4 * U, tw - 1 * U, 4 * U, 2.6 * U, -0.5, 0, TAU); g.stroke(); g.beginPath(); g.ellipse(cx + nw * 0.18 + 4 * U, tw - 1 * U, 4 * U, 2.6 * U, 0.5, 0, TAU); g.stroke();
        g.beginPath(); g.moveTo(cx + nw * 0.18, tw); g.lineTo(cx + nw * 0.18 - 2 * U, tw + 9 * U); g.moveTo(cx + nw * 0.18, tw); g.lineTo(cx + nw * 0.18 + 3 * U, tw + 8 * U); g.stroke();
        return { c: o.c, w: o.w, h: o.h, ax: cx, ay: tw };
      }

      /* ---------------- sound: porch waltz, crickets that slow as the night cools, the lamp hum, the net's swish ---------------- */
      const AU = { hum: null, air: null, swish: null };
      const audioOn = () => {
        if (!A.ctx || AU.hum) return;
        AU.hum = A.loop({ filter: 'bandpass', freq: 236, q: 7, bus: 'amb' }); if (AU.hum) AU.hum.level(0.03, 1.2);
        AU.air = A.loop({ pink: true, filter: 'lowpass', freq: 520, q: 0.4, bus: 'amb' }); if (AU.air) AU.air.level(0.035, 2);
        AU.swish = A.loop({ filter: 'bandpass', freq: 700, q: 0.9 });
      };
      S.on('audio-ready', audioOn); audioOn();
      S.onDestroy(() => Object.values(AU).forEach(x => { if (x) x.stop(); }));
      const NF = {}; const nf = (n) => NF[n] || (NF[n] = A.note(n));
      const MU = { on: true, next: 0, step: 0, vol: 0.85, beats: [] };
      S.loop(() => {
        if (!A.ctx || !MU.on) return;
        if (!MU.next || MU.next < A.now() - 0.5) MU.next = A.now() + 0.12;
        while (MU.next < A.now() + 0.25) {
          const tm = MU.next, i = MU.step, bar = Math.floor(i / 3) % 4, b = i % 3, [bass, ch] = PROG[bar], v = MU.vol, night = W.night;
          if (b === 0) {
            A.pluck(nf(bass), { when: tm, vol: 0.24 * v, damp: 0.994, lp: 460, bus: 'music' });
            A.pad(ch.map(nf), { when: tm, dur: 60 / W.bpm * 3.3, vol: 0.04 * v, attack: 0.9, lp: 900, bus: 'music' });
          } else {
            const n1 = ch[b === 1 ? 1 : 2], n2 = ch[b === 1 ? 2 : 3];
            A.pluck(nf(n1), { when: tm, vol: 0.07 * v, damp: 0.995, lp: 2200, verb: 0.32, bus: 'music' });
            A.pluck(nf(n2), { when: tm + 0.014, vol: 0.055 * v, damp: 0.995, lp: 2200, verb: 0.32, bus: 'music' });
          }
          if (b === 2 && bar % 2 === 1 && W.phase !== 'intro') A.chime(nf(ch[3]) * 2, { when: tm + 60 / W.bpm * 0.5, vol: 0.022 * v, dur: 1.6, verb: 0.5, bus: 'music' });
          if (b !== 0 && Math.random() < 0.5 + night * 0.4) { const f = 4200 + Math.random() * 600, pan = Math.random() * 1.6 - 0.8, cw = tm + 0.05 + Math.random() * 0.12; for (let k = 0; k < 3; k++) A.tone({ when: cw + k * 0.042, type: 'sine', freq: f, dur: 0.026, vol: 0.01 + night * 0.008, attack: 0.004, bus: 'amb', pan }); }
          MU.beats.push(tm); if (MU.beats.length > 6) MU.beats.shift();
          MU.step++; MU.next += 60 / W.bpm;
        }
      });
      const beatPulse = () => { if (!A.ctx || !MU.beats.length) return 0; const now = A.now() - A.latency(); let last = -9; for (const b of MU.beats) if (b <= now) last = b; return Math.exp(-(now - last) * 4); };
      const flutter = (vol) => { if (!A.ctx) return; for (let i = 0; i < 7; i++) A.noise({ when: A.now() + i * 0.042, filter: 'bandpass', freq: 800 + Math.random() * 600, q: 1.3, dur: 0.03, vol: vol * (1 - i / 9) }); };
      const tik = (vol) => { if (!A.ctx) return; A.tone({ type: 'sine', freq: 3000 + Math.random() * 1200, dur: 0.035, vol: vol || 0.035, attack: 0.002 }); A.noise({ filter: 'highpass', freq: 5200, dur: 0.012, vol: 0.02 }); };
      const chimeN = (n, vol, when) => { if (A.ctx) A.chime(nf(n), { vol: vol || 0.05, dur: 1.6, verb: 0.45, when }); };

      /* ---------------- moths ---------------- */
      function spawnMoth(item) {
        const U = G.U, core = item.kind === 'core', task = item.kind === 'task';
        const look = core ? SP.emperor : task ? SP.glow : DUSKY[(total + moths.length) % DUSKY.length];
        const Sz = (core ? 36 : task ? 21 : 20 + ((total * 7) % 5)) * U;
        spawnSide = -spawnSide;
        const m = {
          item, look, S: Sz, spr: sprite(look, Sz), state: 'enter', age: 0, x: spawnSide < 0 ? -40 : G.w + 40, y: G.hz - 20 * U + Math.random() * 60 * U, vx: 0, vy: 0, rot: 0,
          r0: core ? 1.0 : 0.45 + Math.random() * 0.55, dir: Math.random() < 0.5 ? -1 : 1, spd: T.spd * (core ? 0.72 : task ? 0.85 : 0.9 + Math.random() * 0.25),
          w1: 0.7 + Math.random() * 0.8, w2: 1.6 + Math.random() * 1.4, w3: 3.1 + Math.random() * 2.2, p1: Math.random() * 9, p2: Math.random() * 9, p3: Math.random() * 9,
          fr: core ? 7 : 13 + Math.random() * 6, fp: Math.random(), dartT: 0, dvx: 0, dvy: 0, bonkT: 2 + Math.random() * 4, stT: 0, sx: 0, sy: 0, trail: [], calm: 0, t: 0, lit: 0
        };
        m.vx = -spawnSide * m.spd * U; total++;
        if (core) { m.x = G.lx + (Math.random() - 0.5) * 20 * U; m.y = G.hz + 40 * U; m.vx = 0; m.vy = -m.spd * U; } // the heaviest one rises through the garden gate
        moths.push(m);
        if (task) { taskMoth = m; if (W.phase === 'play') { S.later(() => { talk('still', L.glowIn, 2600, 'wow', 2400); if (A.ctx) { chimeN('E6', 0.04); chimeN('B5', 0.035, A.now() + 0.12); } }, 900); } }
        if (core && W.phase === 'play') { S.later(() => { talk('loopie', L.coreIn, 2200, 'wow', 2400); }, 600); S.later(() => { talk('still', L.coreTip, 3200, 'calm'); guideCatch(true); }, 2400); if (A.ctx) A.tone({ type: 'sine', freq: 82, to: 70, glide: 1.2, dur: 1.6, vol: 0.06, attack: 0.3 }); }
        return m;
      }
      /* Who flies next: a small swarm of thoughts; once some are named the job moth comes (with the air nearly clear,
         and nothing else while it is out); the heaviest one comes last, alone. */
      const taskDue = () => (ITEMS.strands.length ? Math.max(1, Math.floor(ITEMS.strands.length / 2)) : 0);
      const takeStrand = () => { const i = Q.findIndex(x => x.kind === 'strand'); return i >= 0 ? Q.splice(i, 1)[0] : null; };
      function topUp() {
        if (W.phase !== 'play' && W.phase !== 'intro') return;
        const ti = Q.findIndex(x => x.kind === 'task');
        if (ti >= 0 && doneCount >= taskDue()) { if (moths.length <= 1 && W.phase === 'play') spawnMoth(Q.splice(ti, 1)[0]); return; }
        if (taskMoth) return;
        while (moths.length < T.flying) { const it = takeStrand(); if (!it) break; spawnMoth(it); }
        if (!moths.length && Q.length && Q.every(x => x.kind === 'core')) spawnMoth(Q.shift());
      }
      function buildQueue() {
        ITEMS = buildItems();
        const q = ITEMS.strands.slice();
        q.splice(Math.min(q.length, Math.max(1, Math.floor(q.length / 2))), 0, ITEMS.task);
        if (ITEMS.core) q.push(ITEMS.core);
        return q;
      }
      // if the AI reading lands before anything is caught, the moths carry it instead (nothing has been shown yet)
      ctx.analysisReady.then(a => {
        if (!a || typeof a !== 'object' || a === an || doneCount > 0 || NET.moth || finished) return;
        an = a; const fresh = buildQueue(), order = [];
        moths.forEach(m => { const i = fresh.findIndex(x => x.kind === m.item.kind); if (i >= 0) { m.item = fresh[i]; fresh.splice(i, 1); } order.push(m); });
        Q = fresh;
      }).catch(() => {});
      const vCalm = () => T.vCalm * G.U;
      function lampGlassHit(m) { return Math.abs(m.x - W.lampX) < G.lw * 0.44 && Math.abs(m.y - W.lampY) < G.lh * 0.36; }
      function stepMoth(m, dt) {
        m.age += dt; m.fp += dt * m.fr * (m.state === 'net' ? 1.5 : 1);
        if (m.state === 'net') return;
        if (m.state === 'toss' || m.state === 'back') { stepToss(m, dt); return; }
        if (!isFinite(m.x) || !isFinite(m.y)) { m.x = G.lx; m.y = G.ly + G.ry; m.vx = m.vy = 0; }
        const U = G.U, Lx = W.lampX, Ly = W.lampY, core = m.item.kind === 'core', task = m.item.kind === 'task';
        const tired = sm((m.age - T.tired) / 12) * (core ? 0.8 : 1);
        let spd = m.spd * U * (1 - 0.62 * tired);
        const dx = m.x - Lx, dy = (m.y - Ly) / 0.8, d = Math.hypot(dx, dy) || 1;
        const r0 = (core ? G.rx * 0.62 : G.rx * m.r0) * (m.state === 'startle' ? 1.45 : 1);
        let ux = -dy / d * m.dir, uy = dx / d * m.dir;
        const rad = clamp((r0 - d) / Math.max(30, r0), -1.2, 1.2) * 1.6;
        ux += dx / d * rad; uy += dy / d * rad;
        const amp = (task ? 0.45 : core ? 0.6 : 1) * T.wander * (1 - 0.6 * tired) * (K.reduced() ? 0.55 : 1);
        const wv = (Math.sin(W.t * m.w1 + m.p1) + Math.sin(W.t * m.w2 + m.p2) * 0.6 + Math.sin(W.t * m.w3 + m.p3) * 0.35) * amp;
        const cw = Math.cos(wv), sw = Math.sin(wv);
        let qx = ux * cw - uy * sw, qy = (ux * sw + uy * cw) * 0.8;
        const ql = Math.hypot(qx, qy) || 1; qx /= ql; qy /= ql;
        let dvx = qx * spd, dvy = qy * spd;
        if (m.state === 'enter') {
          const tx = Lx + (m.x < Lx ? -1 : 1) * r0 * 0.9, ty = Ly + 10 * U, el2 = Math.hypot(tx - m.x, ty - m.y) || 1;
          dvx = (tx - m.x) / el2 * spd * 1.25; dvy = (ty - m.y) / el2 * spd * 1.25;
          if (m.x > G.zone.x0 + m.S && m.x < G.zone.x1 - m.S && m.y < G.zone.y1 && Math.hypot(m.x - Lx, m.y - Ly) < r0 * 1.5 + 40 * U) m.state = 'fly';
        } else if (m.state === 'startle') {
          m.stT -= dt; const ax = m.x - m.sx, ay = m.y - m.sy, al = Math.hypot(ax, ay) || 1;
          dvx = ax / al * spd * 2.4; dvy = ay / al * spd * 2.4 - spd * 0.4;
          if (m.stT <= 0) m.state = 'fly';
        } else {
          if (m.dartT > 0) { m.dartT -= dt; dvx = m.dvx; dvy = m.dvy; }
          else if (!task && Math.random() < dt * T.dart * (1 - tired) * (K.reduced() ? 0.4 : 1)) { const a = Math.atan2(qy, qx) + (Math.random() - 0.5) * 2.6, s = spd * (1.7 + Math.random() * 0.8); m.dvx = Math.cos(a) * s; m.dvy = Math.sin(a) * s; m.dartT = 0.1 + Math.random() * 0.22; }
          m.bonkT -= dt;
          if (m.bonkT <= 0 && !task) { const a = Math.atan2(Ly - m.y, Lx - m.x); dvx = Math.cos(a) * spd * 1.6; dvy = Math.sin(a) * spd * 1.6; }
        }
        const k = 1 - Math.exp(-dt * (m.state === 'startle' ? 7 : 4.4));
        m.vx += (dvx - m.vx) * k; m.vy += (dvy - m.vy) * k;
        m.x += m.vx * dt; m.y += m.vy * dt;
        if (lampGlassHit(m)) {
          const sx = Math.sign(m.x - Lx) || 1;
          m.x = Lx + sx * G.lw * 0.46; m.vx = sx * Math.abs(m.vx) * 0.7 + sx * 30 * U; m.vy = -Math.abs(m.vy) * 0.4 - 30 * U;
          m.bonkT = 2.5 + Math.random() * 5 * (1 + tired);
          W.phiV += sx * -0.07 * (core ? 2 : 1); W.bonks++;
          tik(core ? 0.05 : 0.032); if (Math.random() < 0.5) P.emit('mote', m.x, m.y, 2, { colors: ['#fff2c8', '#ffd890'] });
          if (W.bonks >= 4 && !W.saidBonk && W.phase === 'play' && !care() && !NET.moth) { W.saidBonk = true; talk('loopie', L.bonk, 2600, 'laugh', 2400); }
        }
        if (m.state !== 'enter') {
          const Z = G.zone, push = 9, mg = m.S * 0.8;
          if (m.x < Z.x0 + mg) m.vx += (Z.x0 + mg - m.x) * push * dt * 10; if (m.x > Z.x1 - mg) m.vx -= (m.x - Z.x1 + mg) * push * dt * 10;
          if (m.y < Z.y0) m.vy += (Z.y0 - m.y) * push * dt * 10; if (m.y > Z.y1) m.vy -= (m.y - Z.y1) * push * dt * 10;
        }
        const tr = Math.atan2(m.vy, m.vx) + Math.PI / 2;
        m.rot += angDiff(tr, m.rot) * Math.min(1, dt * 9);
        m.trail.push(m.x, m.y); if (m.trail.length > 76) m.trail.splice(0, 2);
      }
      function startle(m, hx, hy) {
        if (m.state === 'startle') return;
        m.state = 'startle'; m.stT = 0.85; m.sx = hx; m.sy = hy;
        P.emit('dust', m.x, m.y, 4, { colors: ['rgba(255,230,190,0.6)'] });
        if (A.ctx) flutter(0.05);
      }

      /* ---------------- the net: grip spring, a wrist-held handle with follow-through, a cloth bag that trails ---------------- */
      function stepNet(dt) {
        if (NET.auto) {
          const m = NET.auto.m; NET.auto.t -= dt;
          if (!m || m.state === 'net' || moths.indexOf(m) < 0 || NET.auto.t <= 0) NET.auto = null;
          else { const tx = m.x, ty = m.y + G.L, dx = tx - NET.gx, dy = ty - NET.gy, dl = Math.hypot(dx, dy) || 1, s = Math.min(dl, vCalm() * 0.45 * dt); NET.gx += dx / dl * s; NET.gy += dy / dl * s; }
        }
        const k = 1 - Math.exp(-dt * 24);
        const nx = NET.x + (NET.gx - NET.x) * k, ny = NET.y + (NET.gy - NET.y) * k;
        const vx = (nx - NET.x) / dt, ax = clamp((vx - NET.vx) / dt, -12000, 12000);
        NET.vx = vx; NET.x = nx; NET.y = ny;
        NET.thv += (-62 * NET.th - 8.5 * NET.thv - ax / G.L * Math.cos(NET.th) * 0.5) * dt;
        NET.th = clamp(NET.th + NET.thv * dt, -0.95, 0.95);
        NET.phx = NET.hx; NET.phy = NET.hy;
        NET.hx = NET.x + Math.sin(NET.th) * G.L; NET.hy = NET.y - Math.cos(NET.th) * G.L;
        const inst = Math.hypot(NET.hx - NET.phx, NET.hy - NET.phy) / dt;
        NET.speed += (inst - NET.speed) * Math.min(1, dt * 12);
        if (NET.touching || NET.auto) { SPH.push(W.t, NET.speed); while (SPH.length > 2 && SPH[0] < W.t - 0.9) SPH.splice(0, 2); }
        // the bag: a tip on a spring, pulled by gravity and dragged by the air
        const BL = G.r * 1.55, dx = NET.tx - NET.hx, dy = NET.ty - NET.hy, d = Math.hypot(dx, dy) || 1;
        let fx = -NET.tvx * 3.4, fy = 760 * G.U - NET.tvy * 3.4;
        const f = (d - BL) * 170; fx -= dx / d * f; fy -= dy / d * f;
        if (NET.moth) { fx += Math.sin(W.t * 37) * 1100; fy += Math.cos(W.t * 29) * 800; }
        NET.tvx += fx * dt; NET.tvy += fy * dt; NET.tx += NET.tvx * dt; NET.ty += NET.tvy * dt;
        const d2 = Math.hypot(NET.tx - NET.hx, NET.ty - NET.hy);
        if (d2 > BL * 1.7) { NET.tx = NET.hx + (NET.tx - NET.hx) / d2 * BL * 1.7; NET.ty = NET.hy + (NET.ty - NET.hy) / d2 * BL * 1.7; }
        // the lantern swings if the hoop knocks it
        if (Math.abs(NET.hx - W.lampX) < G.lw * 0.5 + G.r * 0.6 && Math.abs(NET.hy - W.lampY) < G.lh * 0.5 + G.r * 0.4 && NET.speed > 60) {
          if (W.t - NET.bump > 0.6) { NET.bump = W.t; W.phiV += clamp((NET.hx - NET.phx) / dt * 0.0004, -0.25, 0.25); tik(0.05); if (A.ctx) A.wood(undefined, 0.05, 1.6); }
        }
        NET.alpha += ((W.phase === 'play' || W.phase === 'intro' ? 1 : 0) - NET.alpha) * Math.min(1, dt * 2.2);
        const calmNow = NET.touching && NET.speed > T.vMin * 2 && NET.speed < vCalm();
        NET.trail.push(NET.hx, NET.hy, calmNow ? 1 : 0); if (NET.trail.length > 54) NET.trail.splice(0, 3);
        if (AU.swish) { AU.swish.level(NET.touching ? Math.min(0.075, NET.speed / vCalm() * 0.05) : 0.0001, 0.06); AU.swish.freq(420 + Math.min(2600, NET.speed * 1.4), 0.06); }
      }
      function netPocket() { const bx = NET.tx - NET.hx, by = NET.ty - NET.hy; return { x: NET.hx + bx * 0.6, y: NET.hy + by * 0.6 }; }
      function segDist(px, py, ax, ay, bx, by) { const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy; let t = l2 ? ((px - ax) * vx + (py - ay) * vy) / l2 : 0; t = clamp(t, 0, 1); return Math.hypot(px - ax - vx * t, py - ay - vy * t); }
      function tryCatch() {
        if (NET.moth || W.phase !== 'play' || moths.some(m => m.state === 'back')) return;
        const sp = NET.speed, calmMax = vCalm(), frantic = sp > calmMax * 1.22;
        let scared = false;
        for (const m of moths) {
          if (m.state !== 'fly' && m.state !== 'startle') continue;
          const d = segDist(m.x, m.y, NET.phx, NET.phy, NET.hx, NET.hy), core = m.item.kind === 'core';
          if (frantic || (core && sp > calmMax * 0.8)) { if (d < (core ? 170 : 125) * G.U) { startle(m, NET.hx, NET.hy); scared = true; } continue; }
          if (m.state === 'startle') continue;
          if (sp >= T.vMin && d < G.r * 0.95 && (NET.touching || NET.auto)) { catchMoth(m); return; }
        }
        if (scared) noteFrantic();
      }
      function calmScore() {
        let n = 0, s = 0, s2 = 0;
        for (let i = 0; i < SPH.length; i += 2) if (SPH[i] >= W.t - 0.7) { n++; s += SPH[i + 1]; s2 += SPH[i + 1] * SPH[i + 1]; }
        if (n < 3) return 0.75;
        const avg = s / n, sd = Math.sqrt(Math.max(0, s2 / n - avg * avg)), lo = 150 * G.U;
        const steady = clamp(1 - sd / (avg + 90 * G.U), 0, 1), slow = clamp(1 - (avg - lo) / Math.max(60, vCalm() - lo), 0, 1);
        return clamp(0.45 * steady + 0.55 * slow + 0.1, 0, 1);
      }
      function noteFrantic() {
        SC.frantic++;
        if (W.t - W.lastFrantic < 9) return;
        W.lastFrantic = W.t;
        if (!W.saidFrantic) { W.saidFrantic = true; loopie.react('shake'); talk('loopie', L.scatter, 1900, 'dizzy', 2200); S.later(() => talk('still', L.slower, 3400, 'calm'), 1700); }
        else talk('still', L.slower2, 1800);
      }
      function catchMoth(m) {
        m.state = 'net'; NET.moth = m; NET.auto = null; m.caughtAt = W.t;
        S.cancel(cardT); card.classList.remove('mj-on');   // the last species card gives way to the new catch's tag
        const c = calmScore(); m.calm = c; SC.catches.push(c); SC.best = Math.max(SC.best, c);
        K.sfx.good(undefined, 3 + Math.min(6, SC.catches.length));
        if (A.ctx) { A.noise({ filter: 'lowpass', freq: 900, to: 260, dur: 0.2, attack: 0.01, vol: 0.12 }); flutter(0.06); }
        P.emit('mote', NET.hx, NET.hy, 10, { colors: ['#ffe8b0', '#ffd27a', '#fff6dc'], speed: [20, 70] });
        NET.tvx += (Math.random() - 0.5) * 400; NET.tvy -= 200;
        const it = m.item, task = it.kind === 'task', core = it.kind === 'core';
        tag.classList.toggle('mj-task', task);
        tag.firstChild.textContent = task ? (it.generic ? 'A job like…' : 'A real job') : core ? (it.generic ? 'A heavy one, like…' : 'The heaviest one') : (it.generic ? 'A thought like…' : 'In the net');
        tag.lastChild.textContent = it.text;
        tag.classList.add('mj-on'); TAG.w = tag.offsetWidth || 150; TAG.h = tag.offsetHeight || 56;
        const hj = hintJar(it);
        labels.forEach((lb, i) => lb.classList.toggle('mj-hint', !task && i === hj));
        if (task) { showNote(); talk('still', it.generic ? L.glowExample : L.glowCaught, 4400, 'idea'); loopie.face('surprised', 1800); }
        else if (SC.catches.length === 1) { talk('still', L.first, 3800, 'happy'); loopie.face('wow', 1600); }
        else if (core) { loopie.face('wow', 1800); still.face('wow', 1200); }
        else if (!care() && SC.catches.length === 3) loopie.face('happy', 1400);
        guideFlick();
        ctx.track('catch', { kind: it.kind, calm: Math.round(c * 100), n: SC.catches.length });
      }
      const TAG = { w: 150, h: 56 };
      function hideTag() { tag.classList.remove('mj-on'); labels.forEach(lb => lb.classList.remove('mj-hint')); }
      function showNote() {
        if (noteShown) return; noteShown = true;
        const it = ITEMS.task || (taskMoth && taskMoth.item) || { text: 'A JOB FOR TOMORROW', generic: true };
        note.children[2].textContent = it.text;
        note.children[3].textContent = it.generic ? 'an example of a job' : '';
        note.children[3].hidden = !it.generic;
        note.hidden = false; void note.offsetWidth; note.classList.add('mj-on', 'mj-glow');
        G.noteH = note.offsetHeight || 96;
        K.sfx.paper(); if (A.ctx) A.click({ vol: 0.08 });
      }
      const notePoint = () => ({ x: G.note.x + G.noteW * 0.5, y: G.note.y + (G.noteH || 96) * 0.45 });
      const jarPoint = (j) => ({ x: J[j].cx, y: G.jarTop + G.jh * 0.08 });

      /* ---------------- flick: into a jar (or onto the note) ---------------- */
      function pickTarget(vx, vy) {
        const sp = Math.hypot(vx, vy); if (sp < 300 * G.U || !NET.moth || W.t - (NET.moth.caughtAt || 0) < 0.25) return null;
        const cands = J.map((j, i) => ({ kind: 'jar', j: i, p: jarPoint(i) }));
        if (NET.moth && NET.moth.item.kind === 'task') cands.push({ kind: 'note', p: notePoint() });
        let best = null, bc = 0.7;
        cands.forEach(c => { if (c.kind === 'jar' && vy < sp * 0.3) return; const dx = c.p.x - NET.hx, dy = c.p.y - NET.hy, dl = Math.hypot(dx, dy) || 1, cs = (dx * vx + dy * vy) / (dl * sp); if (cs > bc) { bc = cs; best = c; } });
        return best;
      }
      function overTarget(x, y) {
        for (let i = 0; i < 4; i++) { const j = J[i]; if (x > j.x - 8 && x < j.x + G.jw + 8 && y > G.jarTop - 30 * G.U && y < G.shelf) return { kind: 'jar', j: i }; }
        if (NET.moth && NET.moth.item.kind === 'task' && noteShown) { const n = G.note; if (x > n.x - 10 && x < n.x + G.noteW + 10 && y > n.y - 20 && y < n.y + (G.noteH || 96) + 10) return { kind: 'note' }; }
        return null;
      }
      function toss(m, tgt) {
        if (!m || m !== NET.moth) return;
        NET.moth = null; NET.auto = null; hideTag(); K.guide(null);
        m.state = 'toss'; m.t = 0; m.fx = NET.hx + (NET.tx - NET.hx) * 0.5; m.fy = NET.hy + (NET.ty - NET.hy) * 0.5; m.x = m.fx; m.y = m.fy; m.target = tgt;
        const to = tgt.kind === 'jar' ? jarPoint(tgt.j) : notePoint();
        m.tx = to.x; m.ty = to.y; m.cx = (m.fx + m.tx) / 2; m.cy = Math.min(m.fy, m.ty) - 70 * G.U;
        m.refuse = m.item.kind === 'task' && tgt.kind === 'jar';
        if (tgt.kind === 'jar' && !m.refuse) J[tgt.j].lidT = 1;
        K.sfx.whoosh(); if (A.ctx) A.whoosh({ from: 1400, to: 500, dur: 0.4, vol: 0.06 });
        NET.tvy -= 300;
      }
      function stepToss(m, dt) {
        m.t = Math.min(1, m.t + dt / (m.state === 'back' ? 0.5 : 0.46));
        const k = m.t, e = 1 - (1 - k) * (1 - k);
        m.x = (1 - e) * (1 - e) * m.fx + 2 * (1 - e) * e * m.cx + e * e * m.tx; m.y = (1 - e) * (1 - e) * m.fy + 2 * (1 - e) * e * m.cy + e * e * m.ty;
        m.rot += angDiff(Math.atan2(m.ty - m.y, m.tx - m.x) + Math.PI / 2, m.rot) * Math.min(1, dt * 8);
        if (m.t < 1) return;
        if (m.state === 'back') { m.state = 'net'; NET.moth = m; tag.classList.add('mj-on'); guideFlick(); return; }
        if (m.refuse) { refuse(m); return; }
        if (m.target.kind === 'jar') landInJar(m, m.target.j); else landOnNote(m);
      }
      function refuse(m) {
        const j = J[m.target.j]; j.flash = 0.5; j.lidV -= 6;
        if (A.ctx) { A.tone({ type: 'triangle', freq: 520, to: 380, glide: 0.08, dur: 0.12, vol: 0.06 }); tik(0.04); }
        talk('still', L.notJar, 2600, 'think');
        m.state = 'back'; m.t = 0; m.fx = m.x; m.fy = m.y; const p = netPocket(); m.tx = p.x; m.ty = p.y; m.cx = (m.fx + m.tx) / 2; m.cy = Math.min(m.fy, m.ty) - 50 * G.U;
      }
      function landInJar(m, i) {
        const j = J[i], calm = m.calm >= 0.8, core = m.item.kind === 'core';
        const key = core ? (calm ? 'gentleemp' : 'emperor') : (calm ? JARS[i].calm : JARS[i].common), sp = SP[key];
        j.moths.push({ key, sp, ph: Math.random() * 6, rot: (Math.random() - 0.5) * 1.1, slot: j.moths.length });
        j.flash = 1; j.lidT = 0; j.lidV -= 3;
        removeMoth(m); doneCount++; SC.jarred++; if (hintJar(m.item) === i) SC.matched++;
        if (A.ctx) { chimeN(JARS[i].note.replace(/\d/, (n) => String(Number(n) + 1)), 0.05); A.pop({ freq: 230, vol: 0.12 }); A.noise({ filter: 'bandpass', freq: 3000, q: 0.8, dur: 0.5, attack: 0.15, vol: 0.02 }); }
        K.sfx.chime(i + 2);
        P.emit('mote', j.cx, G.jarTop + G.jh * 0.2, 12, { colors: [JARS[i].glow, '#fff6dc'], speed: [20, 80] });
        const n = SC.jarred, verb = JARS[i].verb;
        talk('still', { Jolly: n === 1 ? verb + '. Just noticing.' : verb + '.', Cheeky: n === 1 ? verb + '. Spotted it.' : verb + '.', Unfiltered: verb + '.' }, 2300, n === 1 ? 'happy' : 'calm');
        if (!W.saidAny && hintJar(m.item) >= 0 && hintJar(m.item) !== i) { W.saidAny = true; S.later(() => talk('still', L.anyJar, 3000, 'happy'), 2400); }
        speciesCard(key, j.cx, G.jarTop - 14 * G.U);
        ctx.track('noted', { jar: JARS[i].id, kind: m.item.kind, calm: Math.round(m.calm * 100), match: hintJar(m.item) === i ? 1 : 0 });
        afterLand();
      }
      function landOnNote(m) {
        removeMoth(m); doneCount++; SC.noted++;
        note.classList.remove('mj-glow'); note.classList.add('mj-glow');
        const s = sprite(SP.glow, 18), nc = noteCv, d = cv.dpr || 1;
        nc.width = Math.round(60 * d); nc.height = Math.round(44 * d); const g = nc.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0);
        const gl = g.createRadialGradient(30, 22, 2, 30, 22, 24); gl.addColorStop(0, 'rgba(214,255,122,0.65)'); gl.addColorStop(1, 'rgba(214,255,122,0)'); g.fillStyle = gl; g.fillRect(0, 0, 60, 44);
        drawMothSpr(g, s, 30, 24, 0.35, 1, 1, 0.2, 1);
        K.sfx.paper(); if (A.ctx) { chimeN('G5', 0.05); chimeN('D6', 0.04, A.now() + 0.14); }
        P.emit('mote', notePoint().x, notePoint().y, 14, { colors: ['#e6ff9a', '#fff6c8'], speed: [20, 80] });
        talk('still', L.noted, 3200, 'happy'); loopie.face('happy', 1600);
        speciesCard('glow', G.note.x + G.noteW / 2, G.note.y - 8 * G.U);
        S.later(() => { note.classList.add('mj-tucked'); note.style.left = G.tuck.x + 'px'; note.style.top = G.tuck.y + 'px'; }, 2200);
        taskMoth = null;
        ctx.track('job_noted', { generic: m.item.generic ? 1 : 0 });
        afterLand();
      }
      function removeMoth(m) { const i = moths.indexOf(m); if (i >= 0) moths.splice(i, 1); if (taskMoth === m && m.item.kind !== 'task') taskMoth = null; }
      function afterLand() {
        const prog = doneCount / Math.max(1, total + Q.length);
        W.bpm = 66 - 8 * prog; W.nightT = prog * 0.35;
        if (!W.saidCrickets && prog >= 0.6 && !care()) { W.saidCrickets = true; S.later(() => talk('loopie', L.crickets, 3400, 'think', 3000), 3000); }
        if (!Q.length && !moths.length) { S.later(finale, 1700); return; }
        S.later(() => { topUp(); if (W.phase === 'play' && !NET.moth) guideCatch(moths.some(x => x.item.kind === 'core')); }, 1100);
      }
      let cardT = 0;
      function speciesCard(key, x, y) {
        const sp = SP[key], col = K.collect(sp.name);
        if (!SC.species.includes(sp.name)) SC.species.push(sp.name);
        card.children[0].textContent = sp.name;
        card.children[1].textContent = (col.isNew ? 'New in your field guide · ' : 'In your field guide · ') + col.count + ' of ' + FIELD;
        card.style.left = clamp(x, 120, G.w - 120) + 'px'; card.style.top = y + 'px';
        card.classList.remove('mj-on'); void card.offsetWidth; card.classList.add('mj-on');
        if (col.isNew) { K.sfx.sparkle(); P.emit('star', x, y - 16, 8, { colors: ['#ffe9a8', '#ffffff'], speed: [30, 110] }); }
        S.cancel(cardT); cardT = S.later(() => card.classList.remove('mj-on'), 2600);
      }

      /* ---------------- guides (every step) ---------------- */
      function guideCatch(core) {
        if (W.phase !== 'play' || NET.moth) return;
        K.guide({ id: core ? 'mj-core' : 'mj-catch', g: 'sweep', target: () => ({ x: W.lampX - G.rx * 0.2, y: W.lampY + G.ry * 0.62 }), d: (G.phone ? 62 : 90) * G.U, label: core ? 'SLOWEST SWEEP YET' : 'SWEEP THE NET SLOWLY', place: 'below', ms: core ? 3200 : 2300 });
      }
      function guideFlick() {
        const m = NET.moth; if (!m) return;
        // demonstrated from the net itself toward the jar (or the note); while a finger is still down it waits for the release
        const task = m.item.kind === 'task', hj = hintJar(m.item), tp = task ? notePoint() : jarPoint(hj >= 0 ? hj : 1);
        K.guide({ id: task ? 'mj-note' : 'mj-flick', g: 'drag', target: () => ({ x: NET.hx, y: NET.hy }), dx: (tp.x - NET.hx) * 0.85, dy: (tp.y - NET.hy) * 0.85, label: task ? 'FLICK IT TO THE NOTE' : 'FLICK IT INTO A JAR', place: 'above', ms: 1400, delay: NET.touching ? 60000 : 450 });
      }

      /* ---------------- input ---------------- */
      K.drag(pad, {
        start: (p) => {
          if (finished) return false;
          if (W.phase === 'release') { const t = overTarget(p.x, p.y); if (t && t.kind === 'jar') openJar(t.j); return false; }
          if (W.phase !== 'play' && W.phase !== 'intro') return false;
          NET.touching = true; NET.auto = null; NET.gx = p.x; NET.gy = p.y; SPH.length = 0;
          if (A.ctx) A.noise({ filter: 'bandpass', freq: 1800, q: 0.7, dur: 0.12, attack: 0.02, vol: 0.05 });
          K.sfx.tap();
        },
        move: (p) => {
          NET.gx = clamp(p.x, 6, G.w - 6); NET.gy = clamp(p.y, G.beam + G.L * 0.4, G.h - 4);
          if (NET.moth && W.phase === 'play') { const t = overTarget(NET.hx, NET.hy); if (t && (t.kind === 'note' || NET.hy > G.jarTop - 16 * G.U)) toss(NET.moth, t); }
        },
        end: (p, d) => {
          NET.touching = false;
          if (NET.moth && W.phase === 'play') {
            const t = pickTarget(d.vx, d.vy) || overTarget(NET.hx, NET.hy);
            if (t) toss(NET.moth, t); else guideFlick();
          }
        }
      });
      K.onKey(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Enter', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'KeyN'], (e) => {
        if (finished) return;
        if (W.phase === 'release') { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); const i = J.findIndex(j => j.moths.length && !j.open); if (i >= 0) openJar(i); } return; }
        if (W.phase !== 'play') return;
        e.preventDefault(); A.unlock(); K.guideDone();
        const st = 24 * G.U;
        if (e.code === 'ArrowLeft') NET.gx -= st; if (e.code === 'ArrowRight') NET.gx += st; if (e.code === 'ArrowUp') NET.gy -= st; if (e.code === 'ArrowDown') NET.gy += st;
        NET.gx = clamp(NET.gx, 6, G.w - 6); NET.gy = clamp(NET.gy, G.beam + G.L * 0.4, G.h - 4);
        if ((e.code === 'Space' || e.code === 'Enter') && !NET.moth) { let best = null, bd = 1e9; moths.forEach(m => { if (m.state !== 'fly') return; const dd = Math.hypot(m.x - NET.hx, m.y - NET.hy); if (dd < bd) { bd = dd; best = m; } }); if (best) { NET.auto = { m: best, t: 3 }; SPH.length = 0; } }
        if (NET.moth && /^Digit[1-4]$/.test(e.code)) toss(NET.moth, { kind: 'jar', j: Number(e.code.slice(5)) - 1 });
        if (NET.moth && e.code === 'KeyN' && NET.moth.item.kind === 'task') toss(NET.moth, { kind: 'note' });
      });

      /* ---------------- lantern, jars, fireflies ---------------- */
      function stepLamp(dt) {
        W.phiV += (-11 * W.phi - 0.9 * W.phiV) * dt; W.phi += W.phiV * dt;
        if (K.reduced()) W.phi *= 0.9;
        // a rigid lantern on a chain: the ring swings about the beam hook, the light hangs below the ring
        const off2 = LAN ? LAN.cy - LAN.ay : 30, chain = G.ly - G.beam - off2, rx = G.lx + Math.sin(W.phi) * chain, ry = G.beam + Math.cos(W.phi) * chain;
        W.ringX = rx; W.ringY = ry; W.lampX = rx + Math.sin(W.phi) * off2; W.lampY = ry + Math.cos(W.phi) * off2;
        W.night += (W.nightT - W.night) * Math.min(1, dt * 0.6);
        if (AU.hum) AU.hum.level(0.03 * W.lampK, 0.3);
      }
      function stepJars(dt) {
        J.forEach(j => {
          j.lidV += ((j.lidT - j.lid) * 140 - j.lidV * 11) * dt; j.lid += j.lidV * dt;
          j.flash = Math.max(0, j.flash - dt * 1.6);
          const want = (j.moths.length ? 0.25 + j.moths.length * 0.12 : 0) * (W.phase === 'play' || W.phase === 'intro' ? 1 : 0) + W.jarGlow * (j.moths.length ? (j.freed ? 0.5 : 1) : 0.45);
          j.glow += (want - j.glow) * Math.min(1, dt * 2);
          // lantern light: full while the named moths wait inside, a warm ember once they have flown
          const lw = W.jarGlow * (j.moths.length ? (j.freed ? 0.32 : 1) : 0.16);
          j.lan += (lw - j.lan) * Math.min(1, dt * (lw > j.lan ? 1.4 : 0.8));
        });
      }
      function openJar(i) {
        const j = J[i]; if (!j || j.open || !j.moths.length) return;
        j.open = true; j.lidT = 1.9; j.lidV += 9;
        J.forEach((e, k) => { if (!e.moths.length && !e.open) S.later(() => { e.open = true; e.lidT = 1.9; e.lidV += 5; }, 500 + k * 120); });
        K.sfx.pop(undefined, 300 + i * 60); if (A.ctx) { chimeN(JARS[i].note, 0.07); chimeN(JARS[i].note.replace(/\d/, (n) => String(Number(n) + 1)), 0.04, A.now() + 0.18); A.whoosh({ from: 600, to: 2400, dur: 0.9, vol: 0.05 }); }
        const per = T.ff;
        j.moths.forEach((mm, k) => { for (let f = 0; f < per; f++) S.later(() => addFirefly(j.cx + (Math.random() - 0.5) * G.jw * 0.36, G.jarTop + G.jh * (0.04 + Math.random() * 0.12), false), k * 140 + f * 70); });
        S.later(() => { j.freed = true; }, 400 + j.moths.length * 140);
        P.emit('mote', j.cx, G.jarTop, 16, { colors: [JARS[i].glow, '#f4ffb0'], speed: [30, 100] });
        ctx.track('release', { jar: JARS[i].id, n: j.moths.length });
        const left = J.filter(x => x.moths.length && !x.open);
        if (left.length) guideLid(); else K.guide(null);
      }
      function addFirefly(x, y, ambient) {
        const U = G.U;
        // a jar's fireflies leave in a soft fountain so they spread into the garden instead of clumping over the jar
        const a = -Math.PI / 2 + (Math.random() - 0.5) * (ambient ? 1.2 : 2.3), sp = (ambient ? 30 + Math.random() * 40 : 80 + Math.random() * 130) * U;
        FF.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, tx: G.w * (0.06 + Math.random() * 0.88), ty: G.beam + 70 * U + Math.pow(Math.random(), 0.7) * (G.jarTop - G.beam - 100 * U), ph: Math.random(), w: 0.55 + Math.random() * 0.12, s: 0.7 + Math.random() * 0.7, born: W.t, ambient });
      }
      function stepFireflies(dt) {
        let cs = 0, sn = 0;
        for (const f of FF) { cs += Math.cos(f.ph * TAU); sn += Math.sin(f.ph * TAU); }
        const n = FF.length || 1, R = Math.hypot(cs, sn) / n, psi = Math.atan2(sn, cs);
        const Kc = W.ffK;
        for (const f of FF) {
          const a = f.ph * TAU;
          f.ph += (f.w + Kc * R * Math.sin(psi - a) / TAU * 3) * dt; if (f.ph > 1) f.ph -= 1;
          const dx = f.tx - f.x, dy = f.ty - f.y, dl = Math.hypot(dx, dy) || 1;
          if (dl < 30 * G.U) { f.tx = clamp(f.x + (Math.random() - 0.5) * 180 * G.U, 20, G.w - 20); f.ty = clamp(f.y + (Math.random() - 0.5) * 120 * G.U, G.beam + 60 * G.U, G.jarTop - 10 * G.U); }
          const sp = 34 * G.U;
          f.vx += (dx / dl * sp - f.vx) * Math.min(1, dt * 0.9) + Math.sin(W.t * 1.7 + f.ph * 9) * 6 * dt; f.vy += (dy / dl * sp - f.vy) * Math.min(1, dt * 0.9);
          f.x += f.vx * dt; f.y += f.vy * dt;
        }
        W.R = R;
        if (W.phase === 'sync' && R > 0.82 && A.ctx) { const mp = ((psi / TAU) + 1) % 1; if (W.prevMp != null && mp < W.prevMp - 0.5) { W.syncChime++; chimeN(PENTA[W.syncChime % PENTA.length], 0.022); } W.prevMp = mp; }
      }

      /* ---------------- drawing ---------------- */
      function drawFrame(g) {
        const D = K.dark(), C = pal(), w = G.w, H = G.h, U = G.U, bp = beatPulse();
        g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        // dusk drifting toward night: re-blend the two cached pictures only when the level visibly changes
        const nightA = clamp(W.night, 0, 1), nq = Math.round(nightA * 32), key = bgId + ':' + nq;
        if (CUR.key !== key) { const cg = CUR.g; CUR.key = key; cg.setTransform(1, 0, 0, 1, 0, 0); cg.globalAlpha = 1; cg.drawImage(BG.c, 0, 0); if (nq) { cg.globalAlpha = nq / 32; cg.drawImage(BGN.c, 0, 0); cg.globalAlpha = 1; } }
        g.drawImage(CUR.c, 0, 0, w, H);
        // twinkles
        if (D || nightA > 0.3) { g.fillStyle = '#ffffff'; for (let i = 0; i < 6; i++) { const x = ((i * 137.7) % 1) * w + (i * 61.3) % w, y = ((i * 53.1) % (G.hz * 0.5)) + G.beam + 30, a = Math.max(0, Math.sin(W.t * (0.9 + i * 0.21) + i * 2)) * (D ? 0.8 : nightA * 0.6); if (a > 0.05) { g.globalAlpha = a; g.fillRect(x % w, y, 1.6, 1.6); } } g.globalAlpha = 1; }
        drawCameo(g);
        // the lamp's halo, breathing with the waltz
        const halo = (G.phone ? 230 : 300) * U * (0.94 + 0.06 * bp) * (0.35 + 0.65 * W.lampK);
        g.globalCompositeOperation = D ? 'lighter' : 'screen';
        g.globalAlpha = (D ? 0.46 : 0.62) * (0.25 + 0.75 * W.lampK); g.drawImage(K.glowSprite(rgba(C.glow, 0.85)), W.lampX - halo, W.lampY - halo, halo * 2, halo * 2);
        g.globalAlpha = (D ? 0.5 : 0.6) * W.lampK; g.drawImage(K.glowSprite(rgba(mix(C.glow, '#ffffff', 0.4), 0.95)), W.lampX - 74 * U, W.lampY - 74 * U, 148 * U, 148 * U);
        g.globalAlpha = 1;
        // dust motes drifting in the light
        if (MOTES.length < 18 && W.lampK > 0.5) MOTES.push({ x: W.lampX + (Math.random() - 0.5) * G.rx * 1.4, y: W.lampY + (Math.random() - 0.3) * G.ry * 1.6, a: 0, life: 4 + Math.random() * 4, vx: (Math.random() - 0.5) * 6, vy: -3 - Math.random() * 5 });
        g.fillStyle = D ? '#fff1cc' : '#fffaf0';
        for (let i = MOTES.length - 1; i >= 0; i--) { const mo = MOTES[i]; mo.a += FDT; mo.x += mo.vx * FDT; mo.y += mo.vy * FDT; const k = mo.a / mo.life; if (k >= 1) { MOTES.splice(i, 1); continue; } g.globalAlpha = Math.sin(k * Math.PI) * 0.55 * W.lampK; g.fillRect(mo.x, mo.y, 1.4, 1.4); }
        g.globalAlpha = 1;
        // long-exposure light trails: the loops each thought draws round the lamp
        g.lineCap = 'round'; g.lineJoin = 'round';
        for (const m of moths) {
          const tr = m.trail, n = tr.length / 2; if (n < 4 || m.state === 'net') continue;
          const col = m.item.kind === 'task' ? '#d6ff7a' : D ? '#ffd9a0' : '#fff4dc';
          for (let s = 0; s < 3; s++) {
            const i0 = Math.floor(s * n / 3), i1 = Math.min(n - 1, Math.floor((s + 1) * n / 3) + 1);
            g.strokeStyle = rgba(col, (D ? 0.06 + s * 0.07 : 0.1 + s * 0.1) * (0.4 + 0.6 * W.lampK)); g.lineWidth = (0.8 + s * 0.5) * U;
            g.beginPath(); g.moveTo(tr[i0 * 2], tr[i0 * 2 + 1]); for (let i = i0 + 1; i <= i1; i++) g.lineTo(tr[i * 2], tr[i * 2 + 1]); g.stroke();
          }
        }
        g.globalCompositeOperation = 'source-over';
        drawLantern(g, C, D);
        // moths in the air
        for (const m of moths) if (m.state !== 'net' && !(m.state === 'toss' && m.t > 0.9 && !m.refuse)) drawFlying(g, m, C, D);
        drawJars(g, D);
        for (const m of moths) if (m.state === 'toss' && m.t > 0.9 && !m.refuse) drawFlying(g, m, C, D);
        drawNet(g, D);
        if (FF.length) drawFireflies(g, D);
        P.update(FDT); P.draw(g);
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        // the caught moth's tag rides beside the net, never over a character
        if (tag.classList.contains('mj-on')) {
          let x = NET.hx < w / 2 ? NET.hx + G.r + 14 : NET.hx - G.r - 14 - TAG.w, y = NET.hy - TAG.h / 2;
          x = clamp(x, 8, w - TAG.w - 8); y = clamp(y, G.beam + 6, G.jarTop - TAG.h - 10);
          const top = Math.max(G.still.y + G.still.s, G.loopie.y + G.loopie.s) + 6;
          if (y < top && (x < G.still.x + G.still.s + 6 || x + TAG.w > G.loopie.x - 6)) y = top;
          if (SC.noted && note.classList.contains('mj-tucked')) { const nx = G.tuck.x - 8, nw = 160, ny = G.tuck.y - 24, nh = (G.noteH || 90) + 30; if (x + TAG.w > nx && x < nx + nw && y + TAG.h > ny && y < ny + nh) y = ny + nh + 4; }
          tag.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
        }
      }
      function drawLantern(g, C, D) {
        const U = G.U, L2 = LAN;
        // chain
        g.strokeStyle = D ? '#1d1510' : '#3a2a1e'; g.lineWidth = 2.4 * U; g.setLineDash([3.2 * U, 2.2 * U]);
        g.beginPath(); g.moveTo(G.lx, G.beam - 2); g.lineTo(W.ringX, W.ringY - 3 * U); g.stroke(); g.setLineDash([]);
        g.save(); g.translate(W.ringX, W.ringY); g.rotate(-W.phi);
        const ox = -L2.ax, oy = -L2.ay, cx = 0;
        // the glass, lit from inside
        const k = W.lampK, gy0 = oy + L2.gy0, gy1 = oy + L2.gy1;
        g.beginPath(); g.moveTo(cx - L2.gx0, gy0); g.lineTo(cx - L2.gx1, gy1); g.lineTo(cx + L2.gx1, gy1); g.lineTo(cx + L2.gx0, gy0); g.closePath();
        const gl = g.createLinearGradient(0, gy0, 0, gy1); gl.addColorStop(0, rgba(mix(C.glow, '#ffffff', 0.5), 0.3 + 0.62 * k)); gl.addColorStop(0.55, rgba('#fff6e0', 0.35 + 0.6 * k)); gl.addColorStop(1, rgba(C.glow, 0.25 + 0.6 * k));
        g.fillStyle = gl; g.fill();
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.6 * k + 0.1;
        const bs = 30 * U * (0.95 + 0.05 * Math.sin(W.t * 7.3) * (K.reduced() ? 0 : 1));
        g.drawImage(K.glowSprite('rgba(255,250,230,1)'), cx - bs, oy + L2.cy - bs, bs * 2, bs * 2);
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        g.strokeStyle = rgba('#fff8e8', 0.5 + 0.4 * k); g.lineWidth = 1.2 * U; g.beginPath(); g.moveTo(cx - 3 * U, oy + L2.cy + 4 * U); g.quadraticCurveTo(cx, oy + L2.cy - 6 * U, cx + 3 * U, oy + L2.cy + 4 * U); g.stroke();
        g.drawImage(L2.c, ox, oy, L2.w, L2.h);
        g.restore();
      }
      function drawFlying(g, m, C, D) {
        const U = G.U, task = m.item.kind === 'task';
        const lit = clamp(1.15 - Math.hypot(m.x - W.lampX, m.y - W.lampY) / (300 * U), 0, 1) * (0.25 + 0.75 * W.lampK);
        const flap = m.state === 'toss' ? 0.3 + 0.7 * Math.abs(Math.cos(m.fp * Math.PI)) : 0.16 + 0.84 * Math.abs(Math.cos(m.fp * Math.PI));
        if (task) {
          const pulse = 0.55 + 0.45 * Math.sin(W.t * 4.4);
          g.globalCompositeOperation = D ? 'lighter' : 'source-over'; g.globalAlpha = (D ? 0.7 : 0.55) * pulse;
          const gs = 46 * U; g.drawImage(K.glowSprite('rgba(214,255,122,0.95)'), m.x - gs, m.y - gs, gs * 2, gs * 2);
          g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        }
        const bob = K.reduced() ? 0 : Math.sin(m.fp * TAU) * 1.4 * U;   // each wingbeat lifts the body a little
        drawMothSpr(g, m.spr, m.x, m.y + bob, m.rot, flap, 1, task ? 0.6 : lit, 1);
        if (!K.reduced() && m.state !== 'toss') drawMothSpr(g, m.spr, m.x, m.y - bob, m.rot, flap < 0.6 ? 0.9 : 0.3, 1, lit, 0.12);
      }
      function drawJars(g, D) {
        const U = G.U, jw = G.jw, jh = G.jh, jt = G.jarTop;
        // lantern light (finale): a warm halo behind each glowing jar and a pool of light on the shelf in front of it
        if (W.jarGlow > 0.01) {
          g.globalCompositeOperation = D ? 'lighter' : 'screen';
          J.forEach((j, i) => {
            if (j.lan < 0.02) return;
            const col = JARS[i].glow, a = j.lan * (0.92 + 0.08 * Math.sin(W.t * 2.1 + i * 1.7) * (K.reduced() ? 0 : 1)), hs = jw * 1.6;
            g.globalAlpha = Math.min(1, a * (D ? 0.5 : 0.62)); g.drawImage(K.glowSprite(rgba(col, 0.9)), j.cx - hs, jt + jh * 0.56 - hs, hs * 2, hs * 2);
            g.globalAlpha = Math.min(1, a * (D ? 0.6 : 0.7)); g.drawImage(K.glowSprite(rgba(mix(col, '#fff6dc', 0.3), 0.9)), j.cx - jw * 1.15, G.shelf - 9 * U, jw * 2.3, 20 * U);
          });
          g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        }
        const nj = JARCN ? clamp((W.night - 0.35) / 0.5, 0, 1) : 0;
        const fillIn = D ? 'rgba(14,16,30,0.2)' : `rgba(${Math.round(40 - 26 * nj)},${Math.round(40 - 24 * nj)},${Math.round(70 - 40 * nj)},${(0.07 + 0.15 * nj).toFixed(3)})`;
        J.forEach((j, i) => {
          const x = j.x, gl = clamp(j.glow + j.flash * 0.6, 0, 1.6);
          g.fillStyle = fillIn; g.save(); jarPath(g, x, jt, jw, jh); g.fill(); g.clip();
          if (gl > 0.01) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, gl * (D ? 0.7 : 0.55)); const gs = jw * 1.25; g.drawImage(K.glowSprite(rgba(JARS[i].glow, 0.95)), j.cx - gs, jt + jh * 0.58 - gs, gs * 2, gs * 2); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
          if (j.lan > 0.02) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, j.lan * 0.75); const cs = jw * 0.7; g.drawImage(K.glowSprite(rgba(mix(JARS[i].glow, '#ffffff', 0.55), 0.95)), j.cx - cs, jt + jh * 0.6 - cs, cs * 2, cs * 2); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
          const slots = [[0.32, 0.36], [0.68, 0.84], [0.66, 0.35], [0.3, 0.84], [0.5, 0.27], [0.5, 0.88]];
          j.moths.forEach((mm, k) => {
            if (j.freed) return;
            const silk = mm.sp.shape === 'silk', S0 = (silk ? 33 : 20) * U, spr = sprite(mm.sp, S0), sc = (jw * (silk ? 0.3 : 0.23)) / S0;
            const s = slots[k % slots.length], fl = 0.82 + 0.18 * Math.sin(W.t * 0.9 + mm.ph);
            drawMothSpr(g, spr, x + jw * s[0], jt + jh * s[1], mm.rot + Math.sin(W.t * 0.3 + mm.ph) * 0.05, fl, sc, clamp(0.35 + 0.4 * W.lampK + 0.6 * j.lan, 0, 1), 1);
          });
          g.restore();
          if (nj < 1) { g.globalAlpha = 1 - nj; g.drawImage(JARC.c, x - JARC.ox, jt - JARC.oy, JARC.w, JARC.h); }
          if (nj > 0) { g.globalAlpha = nj; g.drawImage(JARCN.c, x - JARCN.ox, jt - JARCN.oy, JARCN.w, JARCN.h); }
          g.globalAlpha = 1;
          // the lid (cloth top tied with twine): it lifts as a moth arrives, and floats away when the jar is opened
          const lk = j.lid, LD = LIDS[i], ly = jt + jh * 0.1 - lk * 18 * U, rot = -lk * 0.3, fade = j.open ? clamp(1 - (lk - 1) / 0.9, 0, 1) : 1;
          if (fade > 0.01) { g.save(); g.globalAlpha = fade; g.translate(j.cx + lk * 8 * U, ly); g.rotate(rot); g.drawImage(LD.c, -LD.ax, -LD.ay, LD.w, LD.h); g.restore(); g.globalAlpha = 1; }
        });
      }
      function drawNet(g, D) {
        const U = G.U, r = G.r, hx = NET.hx, hy = NET.hy, rim = NET_RIMS[netTier], NA = NET.alpha;
        if (NA < 0.02) return;
        g.globalAlpha = NA;
        // a soft light-painting trail while the sweep is calm
        const tr = NET.trail;
        if (tr.length > 9) {
          g.globalCompositeOperation = D ? 'lighter' : 'source-over'; g.lineCap = 'round';
          for (let i = 3; i < tr.length; i += 3) { if (!tr[i + 2] || !tr[i - 1]) continue; const a = i / tr.length; g.strokeStyle = rgba(D ? '#ffd88a' : '#fff6dc', a * (D ? 0.32 : 0.5)); g.lineWidth = (1 + a * 3) * U; g.beginPath(); g.moveTo(tr[i - 3], tr[i - 2]); g.lineTo(tr[i], tr[i + 1]); g.stroke(); }
          g.globalCompositeOperation = 'source-over';
        }
        const bx = NET.tx - hx, by = NET.ty - hy, bl = Math.hypot(bx, by) || 1, nx = bx / bl, ny = by / bl, px = -ny, py = nx;
        // the handle, gripped where the finger is
        const dgx = NET.x - hx, dgy = NET.y - hy, ea = Math.atan2((dgx * nx + dgy * ny) / (r * 0.36), (dgx * px + dgy * py) / r);
        const ax = hx + px * r * Math.cos(ea) + nx * r * 0.36 * Math.sin(ea), ay = hy + py * r * Math.cos(ea) + ny * r * 0.36 * Math.sin(ea);
        const ex = NET.x + (NET.x - ax) * 0.12, ey = NET.y + (NET.y - ay) * 0.12;
        g.lineCap = 'round';
        g.strokeStyle = D ? '#2c1a10' : '#4a2e1a'; g.lineWidth = 5.4 * U; g.beginPath(); g.moveTo(ax, ay); g.lineTo(ex, ey); g.stroke();
        g.strokeStyle = rgba(D ? '#a8703e' : '#c8925a', 0.9); g.lineWidth = 1.6 * U; g.beginPath(); g.moveTo(ax - 1.2 * U, ay); g.lineTo(ex - 1.2 * U, ey); g.stroke();
        g.strokeStyle = D ? '#5a2a1e' : '#7a3a26'; g.lineWidth = 7 * U; const gx0 = NET.x + (ax - NET.x) * 0.22, gy0 = NET.y + (ay - NET.y) * 0.22; g.beginPath(); g.moveTo(gx0, gy0); g.lineTo(ex, ey); g.stroke();
        // the bag
        const rimW = r * 0.97, L1x = hx + px * rimW, L1y = hy + py * rimW, R1x = hx - px * rimW, R1y = hy - py * rimW, tx = NET.tx, ty = NET.ty;
        const bag = () => { g.beginPath(); g.moveTo(L1x, L1y); g.quadraticCurveTo(L1x + nx * bl * 0.8, L1y + ny * bl * 0.8, tx + px * r * 0.2, ty + py * r * 0.2); g.quadraticCurveTo(tx + nx * r * 0.22, ty + ny * r * 0.22, tx - px * r * 0.2, ty - py * r * 0.2); g.quadraticCurveTo(R1x + nx * bl * 0.8, R1y + ny * bl * 0.8, R1x, R1y); g.closePath(); };
        g.fillStyle = D ? 'rgba(236,240,255,0.1)' : 'rgba(255,255,255,0.28)'; bag(); g.fill();
        if (NET.moth) { const p = netPocket(), m = NET.moth, j = Math.sin(W.t * 31) * 3 * U; drawMothSpr(g, m.spr, p.x + j, p.y + Math.cos(W.t * 27) * 2 * U, m.rot + Math.sin(W.t * 9) * 0.5, 0.3 + 0.7 * Math.abs(Math.cos(m.fp * Math.PI)), m.item.kind === 'core' ? 0.62 : 0.85, 0.5, 0.9 * NA); g.globalAlpha = NA; if (m.item.kind === 'task') { g.globalCompositeOperation = D ? 'lighter' : 'source-over'; g.globalAlpha = 0.5 * NA; const gs = 34 * U; g.drawImage(K.glowSprite('rgba(214,255,122,0.9)'), p.x - gs, p.y - gs, gs * 2, gs * 2); g.globalAlpha = NA; g.globalCompositeOperation = 'source-over'; } }
        g.save(); bag(); g.clip();
        g.strokeStyle = D ? 'rgba(240,244,255,0.2)' : 'rgba(255,255,255,0.45)'; g.lineWidth = 0.7;
        const st = 4.2 * U, span = bl + r * 1.2;
        for (let s = -r * 1.3; s <= r * 1.3; s += st) { g.beginPath(); g.moveTo(hx + px * s - nx * 4, hy + py * s - ny * 4); g.lineTo(hx + px * s + nx * span, hy + py * s + ny * span); g.stroke(); }
        for (let s = 0; s <= span; s += st) { g.beginPath(); g.moveTo(hx + nx * s - px * r * 1.3, hy + ny * s - py * r * 1.3); g.lineTo(hx + nx * s + px * r * 1.3, hy + ny * s + py * r * 1.3); g.stroke(); }
        g.restore();
        g.strokeStyle = D ? 'rgba(240,244,255,0.5)' : 'rgba(255,255,255,0.85)'; g.lineWidth = 1 * U; bag(); g.stroke();
        // the hoop: an ellipse that faces the sweep
        const rot = Math.atan2(py, px);
        g.strokeStyle = rim[0]; g.lineWidth = 3.4 * U; g.beginPath(); g.ellipse(hx, hy, r, r * 0.36, rot, 0, TAU); g.stroke();
        g.strokeStyle = rim[1]; g.lineWidth = 1.3 * U; g.beginPath(); g.ellipse(hx, hy, r, r * 0.36, rot, Math.PI * 1.05, Math.PI * 1.9); g.stroke();
        if (NET.touching && NET.speed > vCalm() * 1.22) { g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1 * U; g.beginPath(); g.ellipse(hx, hy, r * 1.2, r * 0.5, rot, 0, TAU); g.stroke(); }
        g.globalAlpha = 1;
      }
      function drawFireflies(g, D) {
        const U = G.U, spr = K.glowSprite('rgba(220,255,130,0.95)'), RM = K.reduced(), ka = D ? 1 : 0.82;
        g.globalCompositeOperation = 'lighter';
        for (const f of FF) {
          // a firefly's blink is a short bright pulse; with reduced motion it is a slow, shallow swell instead
          const a = f.ph * TAU, b = RM ? 0.3 + 0.3 * (0.5 + 0.5 * Math.cos(a)) : Math.pow(Math.max(0, Math.cos(a)), 6), age = clamp((W.t - f.born) / 0.8, 0, 1);
          const s = (9 + 15 * b) * f.s * U;
          g.globalAlpha = (0.28 + 0.6 * b) * age * ka; g.drawImage(spr, f.x - s, f.y - s, s * 2, s * 2);
          g.globalAlpha = (0.65 + 0.35 * b) * age; g.fillStyle = '#f8ffd8'; g.beginPath(); g.arc(f.x, f.y, (1.3 + b * 1.2) * U, 0, TAU); g.fill();
        }
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      }
      function drawCameo(g) {
        if (!W.cameo || W.phase === 'intro') return;
        const U = G.U, D = K.dark(), col = mix(pal().top, '#000000', D ? 0.75 : 0.55);
        if (W.cameo === 'hedgehog') {
          if (W.cameoT <= 0) return;
          const k = clamp((W.t - W.cameoT) / 26, 0, 1); if (k >= 1) return;
          const x = -30 + (G.w + 60) * k, y = G.hz + 120 * U + Math.sin(W.t * 8) * 0.8;
          g.fillStyle = col; g.beginPath(); g.ellipse(x, y, 13 * U, 8 * U, 0, Math.PI, TAU); g.fill();
          g.strokeStyle = col; g.lineWidth = 1.2 * U; for (let i = 0; i < 9; i++) { const a = Math.PI + 0.2 + i * 0.32; g.beginPath(); g.moveTo(x + Math.cos(a) * 10 * U, y + Math.sin(a) * 6 * U); g.lineTo(x + Math.cos(a) * 16 * U, y + Math.sin(a) * 11 * U); g.stroke(); }
          g.beginPath(); g.moveTo(x + 11 * U, y - 3 * U); g.lineTo(x + 19 * U, y + 1 * U); g.lineTo(x + 10 * U, y + 1 * U); g.closePath(); g.fill();
          g.fillStyle = D ? 'rgba(255,230,180,0.8)' : 'rgba(255,255,255,0.8)'; g.fillRect(x + 13 * U, y - 2 * U, 1.4 * U, 1.4 * U);
        } else if (W.cameo === 'owl') {
          const x = G.phone ? G.w * 0.2 : G.lx - G.rx - 60 * U, y = G.hz + 30 * U, blink = (W.t % 5) < 0.18;
          g.fillStyle = col; g.beginPath(); g.ellipse(x, y - 14 * U, 9 * U, 13 * U, 0, 0, TAU); g.fill();
          g.beginPath(); g.moveTo(x - 8 * U, y - 24 * U); g.lineTo(x - 5 * U, y - 31 * U); g.lineTo(x - 2 * U, y - 25 * U); g.moveTo(x + 8 * U, y - 24 * U); g.lineTo(x + 5 * U, y - 31 * U); g.lineTo(x + 2 * U, y - 25 * U); g.fill();
          if (!blink) { g.fillStyle = '#ffd36b'; [-1, 1].forEach(s => { g.beginPath(); g.arc(x + s * 3.6 * U, y - 19 * U, 2.2 * U, 0, TAU); g.fill(); }); }
        }
      }

      /* ---------------- frame loop ---------------- */
      let lastT = 0, FDT = 1 / 60, qAcc = 0, qN = 0, qLvl = 1;
      const DEV = !!(S.isDev && S.isDev()), PERF = { n: 0, draw: 0 };
      K.loop((dtIn, tNow) => {
        const g = cv.g; if (!g || !G.w || !BG) return;
        const raw = lastT ? tNow - lastT : dtIn; lastT = tNow;
        const rdt = clamp(raw, 0, 0.25); FDT = rdt;
        if (raw < 0.5) { qAcc += raw; qN++; if (qN >= 120) { if (qAcc / qN > 0.03 && qLvl > 0.7) { qLvl = qLvl > 0.9 ? 0.8 : 0.7; cv.setQuality(qLvl); } qAcc = 0; qN = 0; } }
        for (let rem = rdt; rem > 1e-4; rem -= 1 / 60) {
          const dt = Math.min(rem, 1 / 60);
          W.t += dt;
          stepLamp(dt); stepNet(dt);
          for (let i = moths.length - 1; i >= 0; i--) stepMoth(moths[i], dt);
          tryCatch(); stepJars(dt);
          if (FF.length) stepFireflies(dt);
        }
        const t1 = DEV ? performance.now() : 0;
        drawFrame(g);
        if (DEV) { const pf = PERF; pf.n++; pf.draw += performance.now() - t1; }
      });

      /* ---------------- finale: the lamp dims, jars glow, lids lift, fireflies ---------------- */
      let releaseIdle = 0;
      function guideLid() {
        const i = J.findIndex(j => j.moths.length && !j.open); if (i < 0) return;
        K.guide({ id: 'mj-lid', g: 'tap', target: labels[i], label: 'TAP TO LIFT THE LID', place: 'above', oy: -1.6, delay: 500 });
      }
      async function finale() {
        if (W.phase !== 'play') return;
        W.phase = 'dim'; K.guide(null); hideTag(); NET.touching = false; NET.gx = G.home.x; NET.gy = G.home.y;
        if (SC.noted && G.phone) { noteRest = true; note.classList.add('mj-tucked'); note.style.left = G.rest.x + 'px'; note.style.top = G.rest.y + 'px'; }
        talk('still', L.dim, 3000, 'calm'); loopie.base('calm');
        await K.wait(1500);
        if (A.ctx) { A.click({ vol: 0.12 }); A.wood(undefined, 0.08, 0.7); }
        MU.vol = 0.7;
        await K.anim(2600, (k) => { W.lampK = 1 - 0.86 * sm(k); W.nightT = 0.35 + 0.65 * k; W.night = W.nightT; W.jarGlow = sm(k); });
        W.lampK = 0.14; W.jarGlow = 1;
        if (A.ctx) A.pad(['F3', 'A3', 'C4', 'E4'].map(nf), { dur: 4, vol: 0.12, attack: 1.2 });
        W.phase = 'release'; releaseIdle = performance.now();
        talk('still', L.lids, 3400, 'happy');
        guideLid();
        while (J.some(j => j.moths.length && !j.open)) {
          await S.sleep(200);
          if (performance.now() - releaseIdle > 6500) { releaseIdle = performance.now(); const i = J.findIndex(j => j.moths.length && !j.open); if (i >= 0) openJar(i); }
        }
        W.phase = 'sync'; K.guide(null);
        for (let i = 0; i < (G.phone ? 22 : 40); i++) addFirefly(G.w * Math.random(), G.hz + Math.random() * 160 * G.U, true);
        S.later(() => talk('loopie', L.sleepy, 3000, 'sleepy'), 1200);
        still.base('sleepy');
        const n = SC.jarred + SC.noted;
        cap.children[0].textContent = 'Named, and let go.';
        cap.children[1].textContent = n + ' thought-moths named · ' + DK.name;
        cap.children[2].textContent = 'Tomorrow evening: ' + TOMORROW.name;
        S.later(() => cap.classList.add('mj-on'), 2000);
        await K.anim(4200, (k) => { W.ffK = 1.6 * sm(k); });
        await K.wait(K.reduced() ? 1800 : 300);
        cap.classList.add('mj-on');
        K.finale('fireflies', { colors: ['#e9ff9a', '#fff3a0', '#d6ff7a'], chord: ['F3', 'A3', 'C4', 'E4', 'G4'], ms: 3800, z: 26 });
        await K.wait(4600);
        finish();
      }
      function finish() {
        if (finished) return;
        finished = true; W.phase = 'end';
        const n = SC.jarred + SC.noted, avg = SC.catches.length ? SC.catches.reduce((a, b) => a + b, 0) / SC.catches.length : 0.7;
        const calmShare = SC.catches.length ? SC.catches.filter(c => c >= 0.8).length / SC.catches.length : 0.5;
        const score = clamp(avg * 0.6 + calmShare * 0.4, 0, 1), tier = K.tier(score), tierIdx = ({ Bronze: 1, Silver: 2, Gold: 3 })[tier] || 0;
        const best = Math.round(SC.best * 100), badges = [];
        const pb = K.best('calm', best, 'higher');
        if (pb.isNew) badges.push('New best: ' + best + '% steady sweep'); else if (pb.first) badges.push('First calm sweep: ' + best + '% steady');
        if (tierIdx > netTier) { S.store.set('moth-jar:net', tierIdx); badges.push('Unlocked: ' + NET_NAMES[tierIdx] + ' net'); } else if (tier) badges.push(tier + ' sweeper');
        const guide = K.collection().filter(x => Object.values(SP).some(s => s.name === x)).length;
        badges.push('Field guide: ' + guide + ' of ' + FIELD + ' species');
        ctx.track('done', { n, calm: best, tier: tierIdx, frantic: SC.frantic, matched: SC.matched, job: SC.noted });
        const lines = [n + ' thoughts caught and named', SC.noted ? (ITEMS.task && !ITEMS.task.generic ? '1 real job moved to tomorrow, 10 minutes' : 'Jobs go on a note: tomorrow, 10 minutes') : 'Every one went in a jar', 'Calmest sweep: ' + best + '% steady'];
        if (care()) lines[2] = 'For the bigger stuff, a real person can help too';
        ctx.finish({ title: 'Every moth named', mood: 'calm', lines, share: 'Caught ' + n + ' thought-moths and named every one.', badges });
      }

      /* ---------------- start ---------------- */
      S.on('theme', () => { if (G.w) { SPR = new Map(); paintAll(); } });
      cv.onResize(() => layout());
      W.cameo = visits >= 1 ? ['hedgehog', 'owl'][(visits - 1) % 2] : null;
      Q = buildQueue();
      W.lampX = G.lx; W.lampY = G.ly;
      for (let i = 0; i < Math.min(2, T.flying); i++) { const it = takeStrand(); if (!it) break; const m = spawnMoth(it); if (G.w) { m.x = G.lx + (i ? 1 : -1) * G.rx * 0.6; m.y = G.ly + (i ? -0.2 : 0.3) * G.ry; m.state = 'fly'; } }
      if (DEV) window.__mothJar = { W, NET, SC, moths, J, G, Q: () => Q, PERF };
      (async () => {
        await K.intro({ title: 'Moth Jar', sub: 'Thoughts circle the lamp like moths. Catch each one gently, and name what kind it is.', how: 'Sweep the net slowly. Flick each moth into the jar that names it.', char: 'still', mood: 'calm' });
        W.phase = 'play';
        talk('still', L.start, 4200, 'calm');
        S.later(() => talk('loopie', L.loopStart, 2800, 'worried'), 4600);
        topUp(); guideCatch(false);
        if (W.cameo) S.later(() => { W.cameoT = W.t; if (!care()) talk('loopie', L[W.cameo], 2600, 'wow', 2200); }, 26000);
      })();

      return {
        async autoplay() {
          const intro = el.querySelector('.gk-intro'); if (intro) await K.sim.tap(intro);
          while (W.phase === 'intro') await K.wait(100);
          const tEnd = performance.now() + 150000;
          while (W.phase === 'play' && performance.now() < tEnd) {
            const fly = moths.filter(m => m.state === 'fly');
            if (!fly.length) { await K.wait(150); continue; }
            let tgt = fly[0], bd = 1e9; fly.forEach(m => { const d = Math.hypot(m.x - NET.hx, m.y - NET.hy); if (d < bd) { bd = d; tgt = m; } });
            const pr = await K.sim.press(pad, NET.x, NET.y);
            let gx = NET.x, gy = NET.y, last = performance.now(), t0 = last;
            while (!NET.moth && W.phase === 'play' && performance.now() - t0 < 9000) {
              if (tgt.state !== 'fly') { const f2 = moths.filter(m => m.state === 'fly'); if (!f2.length) break; tgt = f2[0]; }
              const now = performance.now(), dt = Math.min(0.12, (now - last) / 1000); last = now;
              const wx = tgt.x + tgt.vx * 0.12, wy = tgt.y + tgt.vy * 0.12 + G.L, dx = wx - gx, dy = wy - gy, dl = Math.hypot(dx, dy) || 1, s = Math.min(dl + 10, vCalm() * (tgt.item.kind === 'core' ? 0.42 : 0.5) * dt);
              gx += dx / dl * s; gy += dy / dl * s;
              if (dl < 8) { gx += (Math.random() - 0.5) * 30; }
              pr.move(gx, gy); await K.wait(40);
            }
            if (NET.moth) {
              await K.wait(500);
              const m = NET.moth, task = m.item.kind === 'task', hj = hintJar(m.item), tp = task ? notePoint() : jarPoint(hj >= 0 ? hj : (SC.jarred % 4));
              const ax = tp.x, ay = tp.y - 120 * G.U;
              for (let i = 0; i < 14 && NET.moth; i++) { gx += (ax - (gx + 0)) * 0.25; gy += (ay + G.L - gy) * 0.25; pr.move(gx, gy); await K.wait(40); }
              for (let i = 1; i <= 3 && NET.moth; i++) { gx += (tp.x - NET.hx) * 0.3; gy += (tp.y - NET.hy) * 0.3; pr.move(gx, gy); await K.wait(16); }
              pr.up(gx, gy);
              await K.wait(300);
              if (NET.moth) { const p2 = await K.sim.press(pad, NET.x, NET.y); const tx = tp.x, ty = tp.y + G.L - 4; for (let i = 1; i <= 12 && NET.moth; i++) { p2.move(NET.x + (tx - NET.x) * i / 12, NET.y + (ty - NET.y) * i / 12); await K.wait(40); } p2.up(tx, ty); }
              await K.wait(900);
            } else pr.up(gx, gy);
          }
          while (W.phase === 'dim') await K.wait(150);
          while (W.phase === 'release') { const i = J.findIndex(j => j.moths.length && !j.open); if (i >= 0) await K.sim.tap(pad, J[i].cx, G.jarTop + G.jh * 0.5); await K.wait(700); }
          while (!finished) await K.wait(200);
        }
      };
    }
  });
})(window.TSG_ENV);
