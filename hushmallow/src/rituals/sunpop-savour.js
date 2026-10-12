// SUNPOP SAVOUR — Boppo, The Sunshine. For good feelings: joy, love, pride,
// calm, gratitude, relief, hope, satisfaction, triumph and their cousins.
//
// 1. Plant it      — pick what the good thing is (own words optional), then
//                    drag its glowing seed into the orchard soil. A sprout pops.
// 2. Grow it       — for each sense (saw, heard, body, who), pick a detail; it
//                    fills Boppo's watering can; tip the can over the sapling.
//                    The tree grows and a sunpop fruit appears.
// 3. Soak it in    — the fruits merge into one big sunpop. Hold the sun while
//                    it ripens and glows (~12 s). Let it land.
// 4. Keep or share — tell someone, write it down, take a mental photo, plan a
//                    repeat, or just enjoy it.
// Finale           — the sunpop pops into confetti light, the tree blossoms,
//                    the orchard turns golden, Boppo celebrates.
//
// Rationale (plain): savouring — noticing a good moment, adding sensory
// detail, resting attention on it for a few seconds, and sharing or recording
// it — is a widely shared idea for giving positive feelings more room. No
// promise it will make the feeling last; it just gives it a bit longer.

import { h } from '../app/ui.js';
import { getEmotion } from '../data/emotions.js';

const WHO = 'Boppo';

const GOOD = [
  ['went-right', 'Something went right', 'Something went RIGHT! Into the ground you go, little winner.'],
  ['kind', 'Someone was kind', 'Kindness seeds grow the juiciest fruit. That’s science. Probably.'],
  ['did', 'I did a thing', 'You did a THING! Thing-doers get the biggest trees.'],
  ['moment', 'A lovely moment', 'A lovely moment! That’s my favourite flavour.'],
  ['calm', 'I feel calm', 'A calm seed. Shh. I’ll plant it gently. Gently-ish.'],
];

const SENSES = [
  { id: 'see', q: 'What did you see?', short: 'Saw', colour: '#7fd4ff', chips: ['Bright light', 'A big smile', 'Lovely colours', 'Something I made', 'A good view', 'A tick on the list'],
    line: 'Ooh, I can picture it! My eyes went sparkly.' },
  { id: 'hear', q: 'What did you hear?', short: 'Heard', colour: '#c9a6ff', chips: ['Laughter', 'Kind words', 'Music', 'Lovely quiet', 'My own voice', 'Birds or outside'],
    line: 'My ears are doing a happy wiggle. Do I have ears? They’re wiggling anyway.' },
  { id: 'body', q: 'Where did you feel it in your body?', short: 'Felt', colour: '#ff9fc8', chips: ['Warm chest', 'Loose shoulders', 'Big grin', 'Fizzy all over', 'Light and floaty', 'Easy breathing'],
    line: 'Bodies remember good stuff too. Juicy!' },
  { id: 'who', q: 'Who was there?', short: 'With', colour: '#ffd23a', chips: ['Just me', 'A friend', 'Family', 'Someone at work or school', 'A pet', 'A kind stranger'],
    line: 'Good company makes good fruit. Look at it go!' },
];

const KEEP = [
  ['tell', 'Tell someone', 'Whenever it suits — out loud, over tea, no rush. Saying it again lets you enjoy it twice. Nothing to send now.', 'Telling someone means enjoying it twice. Efficient!'],
  ['write', 'Write it down for later', 'A note for future you. Edit it however you like — it’ll be in your summary at the end.', 'Future you is going to love this note.'],
  ['photo', 'Take a mental photo', 'Look at your tree for a moment, then tap the shutter. Click. It’s in the album now.', 'Say cheese! Or… say sunpop.'],
  ['again', 'Do it again soon', 'When might a repeat fit?', 'Ooh, a sequel! Boppo loves a sequel.'],
  ['enjoy', 'Just enjoy it', 'Perfect. No homework. Just sunshine.', 'Just enjoy it? Bold. Correct.'],
];
const AGAIN = ['Later today', 'Tomorrow', 'This weekend', 'Next time I see them'];

const OPENERS = {
  joy: 'OOH. A good one! I can feel it from here. Let’s make it stay a bit longer!',
  love: 'Aww, a warm-fuzzy one! My cheeks are doing the thing. Let’s keep it!',
  pride: 'Look at you, standing tall! Boppo is bouncing on your behalf.',
  calm: 'Ooh, a calm one. I’ll bounce… softly. Ish. Let’s let it linger.',
  other: 'A good feeling? In MY orchard? Let’s plant it before it wanders off!',
};

// Tree shape, in units of the tree size S (y measured upwards from the soil).
const BLOBS = [
  // [x, y, r, appearAt, shade 0 back .. 2 front]
  [-0.22, 0.62, 0.17, 0.32, 0], [0.24, 0.64, 0.17, 0.36, 0], [0, 0.86, 0.19, 0.42, 0],
  [-0.13, 0.75, 0.19, 0.5, 1], [0.14, 0.79, 0.18, 0.55, 1], [-0.29, 0.5, 0.13, 0.62, 1], [0.3, 0.52, 0.13, 0.66, 1],
  [0, 0.62, 0.2, 0.7, 2], [-0.17, 0.92, 0.12, 0.8, 2], [0.18, 0.94, 0.11, 0.85, 2],
];
const BRANCHES = [[0.62, -0.75, 0.24, 0.25], [0.7, 0.8, 0.26, 0.3], [0.82, -0.35, 0.18, 0.45], [0.86, 0.4, 0.17, 0.5]];
const SLOTS = [[-0.2, 0.56], [0.22, 0.64], [-0.06, 0.88], [0.31, 0.45]];
const BLOSSOM_SPOTS = [[-0.3, 0.6], [-0.1, 0.98], [0.12, 0.7], [0.28, 0.82], [-0.22, 0.82], [0.02, 0.44], [0.36, 0.56], [-0.36, 0.44], [0.2, 1.0], [-0.04, 0.74], [0.24, 0.5], [-0.15, 0.6]];
const CONFETTI = ['#ffd23a', '#ff7a0a', '#ff5ed0', '#fff3c4', '#9fcf45', '#7fd4ff'];

export const meta = { id: 'sunpop-savour' };

export async function run(ctx) {
  const { world, audio, haptic, setMove, dock, signal } = ctx;
  const rm = !!ctx.reducedMotion;
  const low = !!ctx.lowStim;
  const realm = () => world.realm;
  const say = (t, ms = 2800) => ctx.say(t, { who: WHO, ms });
  const result = { completed: false, good: null, ownWords: '', details: {}, soakSeconds: 0, keep: [], again: null, note: '', photo: false };
  const timers = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (!signal.aborted) fn(); }, ms); timers.add(id); return id; };
  const pause = (ms) => new Promise((r) => { const id = setTimeout(r, ms); signal.addEventListener('abort', () => { clearTimeout(id); r(); }, { once: true }); });

  // ---------------------------------------------------------- stage ----
  const canvas = h('canvas', { 'aria-hidden': 'true', style: { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' } });
  const layer = h('div', { style: { position: 'absolute', inset: '0', pointerEvents: 'none' } });
  world.fx.replaceChildren(canvas, layer);
  const g = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  const resize = () => {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    fit();
  };
  // tree state: bx/by = soil centre, S = size; eased toward targets
  const st = {
    bx: 0, by: 0, S: 0, tbx: 0, tby: 0, tS: 0, ready: false,
    grow: 0, growT: 0, trunkH: 0, m: 0, soil: 0, soilHot: 0, soilTarget: false,
    fruits: [], big: null, ripen: 0, blossoms: [], photo: 0, shade: 0,
  };
  const drops = [], motes = [], confetti = [], puffs = [];

  function titleBottom() {
    const el = document.querySelector('.ritual-ui .move-title');
    return el ? el.getBoundingClientRect().bottom : 150;
  }
  function fit() {
    if (!W) return;
    const dTop = dock.getBoundingClientRect().top || H * 0.7;
    const top = titleBottom() + 18;
    const by = Math.max(top + 90, dTop - 26);
    const avail = by - top;
    const S = Math.max(84, Math.min(avail / 1.08, (W * 0.34 - 8) / 0.44, 300));
    st.tbx = W * 0.66; st.tby = by; st.tS = S;
    if (!st.ready) { st.bx = st.tbx; st.by = st.tby; st.S = st.tS; st.ready = true; }
    // Boppo stands on the same ground, to the left of the tree
    const Hl = Math.min(H * 0.56, 470), Wl = Math.min(W * 0.86, 430);
    const s = Math.max(0.26, Math.min(0.72, (0.66 * S) / (0.66 * Hl)));
    const halfW = 0.33 * Wl * s;
    const cx = Math.max(halfW + 2, Math.min(W * 0.27, st.tbx - 0.46 * S - halfW));
    const cy = by - 0.38 * Hl * s + 2;
    world.place({ x: (cx / W) * 100, y: (cy / H) * 100, scale: s, calm: rm });
  }
  const note = (text) => h('p', { style: { textAlign: 'center', margin: '0 auto', padding: '6px 14px', borderRadius: '999px', background: 'rgba(20,16,48,.62)', color: 'var(--text-1)', font: '650 14px/1.3 var(--font-ui)', width: 'fit-content', maxWidth: '100%' } }, text);
  const gridStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' };
  const chipStyle = { minHeight: '44px', whiteSpace: 'normal', lineHeight: '1.15', padding: '6px 10px', fontSize: '14px', justifyContent: 'center', textAlign: 'center' };
  const glassGhost = { background: 'rgba(20,16,48,.5)', color: 'var(--text-1)' };
  const setDock = (...kids) => { dock.replaceChildren(...kids); requestAnimationFrame(() => { if (!signal.aborted) fit(); }); };
  resize();
  addEventListener('resize', resize);

  // tree-space -> screen
  // canopy coords (ny measured up from the soil; 0.6 = top of a full-grown
  // trunk) scale with the tree's maturity so young canopies sit on the trunk.
  const tp = (nx, ny) => {
    const y = st.by - st.S * 0.02 - st.trunkH - (ny - 0.6) * st.S * st.m;
    return [st.bx + nx * st.S * st.m + sway() * 0.4 * (st.by - y), y];
  };

  let raf = 0, last = performance.now(), T = 0;
  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; T += dt;
    const k = 1 - Math.exp(-dt * 4);
    st.bx += (st.tbx - st.bx) * k; st.by += (st.tby - st.by) * k; st.S += (st.tS - st.S) * k;
    st.grow += (st.growT - st.grow) * (1 - Math.exp(-dt * (rm ? 6 : 2.6)));
    st.soilHot += ((st.soilTarget ? 1 : 0) * (st.soilNear ? 1 : 0.35) - st.soilHot) * k;
    st.trunkH = st.S * (0.04 + 0.56 * sm(0.06, 0.8, st.grow));
    st.m = st.trunkH / (st.S * 0.6 || 1);
    if (st.soilOn) st.soil = Math.min(1, st.soil + dt * 2);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    drawSoil();
    drawTree();
    drawFruits(dt);
    drawBlossoms();
    drawParticles(dt);
    drawPhoto(dt);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const popScale = (born) => {
    const k = Math.max(0, Math.min(1, (T - born) / (rm ? 0.25 : 0.6)));
    return rm ? k : 1 - Math.pow(1 - k, 3) + Math.sin(k * Math.PI) * 0.28;
  };
  const sway = () => (rm ? 0 : Math.sin(T * 1.2) * 0.018 * Math.min(1, st.grow * 2));

  function drawSoil() {
    const { bx, by, S } = st;
    const rx = S * 0.36 * st.soil, ry = S * 0.07 * st.soil;
    if (rx <= 0) return;
    if (st.soilHot > 0.01) {
      const pulseA = rm ? 0.6 : 0.5 + Math.sin(T * 2.4) * 0.15;
      const gl = g.createRadialGradient(bx, by - ry, 0, bx, by - ry, rx * 1.5);
      gl.addColorStop(0, `rgba(255,240,170,${0.75 * st.soilHot * pulseA})`); gl.addColorStop(1, 'rgba(255,210,58,0)');
      g.fillStyle = gl; g.beginPath(); g.ellipse(bx, by - ry, rx * 1.5, rx * 0.9, 0, 0, Math.PI * 2); g.fill();
    }
    const gr = g.createLinearGradient(0, by - ry, 0, by + ry);
    gr.addColorStop(0, '#a4552e'); gr.addColorStop(1, '#5a2418');
    g.fillStyle = gr;
    g.beginPath(); g.ellipse(bx, by, rx, ry, 0, Math.PI, 0); g.ellipse(bx, by, rx, ry * 0.45, 0, 0, Math.PI); g.fill();
    g.fillStyle = 'rgba(255,214,150,.35)';
    g.beginPath(); g.ellipse(bx - rx * 0.25, by - ry * 0.55, rx * 0.35, ry * 0.22, -0.1, 0, Math.PI * 2); g.fill();
    // grass tufts
    g.strokeStyle = '#7fb83a'; g.lineWidth = 2; g.lineCap = 'round';
    for (const [o, l] of [[-0.8, 1], [-0.55, 0.7], [0.6, 0.9], [0.85, 0.6]]) {
      const x = bx + o * rx, y = by - ry * (1 - Math.abs(o)) * 0.6;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x - 3, y - 8 * l); g.moveTo(x, y); g.lineTo(x + 3, y - 10 * l); g.stroke();
    }
  }

  function drawTree() {
    const gr = st.grow;
    if (gr < 0.003) return;
    const { bx, by, S } = st;
    g.save();
    g.translate(bx, by - S * 0.02);
    g.rotate(sway() * 0.4);
    const trunkH = st.trunkH, m = st.m;
    const tw = S * (0.006 + 0.04 * sm(0.08, 0.9, gr));
    const bend = S * 0.03 * sm(0.2, 1, gr);
    // trunk
    const bark = g.createLinearGradient(-tw, 0, tw, 0);
    bark.addColorStop(0, '#6a2a2a'); bark.addColorStop(0.5, '#9a4b2c'); bark.addColorStop(1, '#5a2418');
    g.fillStyle = gr < 0.2 ? '#7fb83a' : bark;
    g.beginPath();
    g.moveTo(-tw, 0);
    g.quadraticCurveTo(-tw * 0.6 + bend, -trunkH * 0.55, -tw * 0.45 + bend * 0.4, -trunkH);
    g.lineTo(tw * 0.45 + bend * 0.4, -trunkH);
    g.quadraticCurveTo(tw * 0.6 + bend, -trunkH * 0.55, tw, 0);
    g.closePath(); g.fill();
    // branches
    g.strokeStyle = '#7a3a26'; g.lineCap = 'round';
    for (const [at, ang, len, appear] of BRANCHES) {
      const a = sm(appear, appear + 0.18, gr) * m;
      if (a <= 0) continue;
      const y0 = -trunkH * at, x0 = bend * 0.5;
      g.lineWidth = Math.max(1.5, tw * 0.55);
      g.beginPath(); g.moveTo(x0, y0);
      g.quadraticCurveTo(x0 + Math.sin(ang) * len * S * a * 0.5, y0 - len * S * a * 0.55, x0 + Math.sin(ang) * len * S * a, y0 - Math.cos(ang) * len * S * a * 0.7);
      g.stroke();
    }
    // sprout leaves (fade as the canopy arrives)
    const leafA = (1 - sm(0.32, 0.55, gr)) * Math.min(1, gr / 0.08);
    if (leafA > 0.01) {
      const ls = S * 0.075 * Math.min(1, gr / 0.12 + 0.2);
      g.globalAlpha = leafA;
      for (const s of [-1, 1]) {
        g.save(); g.translate(bend * 0.4, -trunkH); g.rotate(s * (0.9 + (rm ? 0 : Math.sin(T * 2 + s) * 0.08)));
        const lg = g.createLinearGradient(0, 0, 0, -ls * 1.6);
        lg.addColorStop(0, '#5f9a2e'); lg.addColorStop(1, '#b8e05a');
        g.fillStyle = lg;
        g.beginPath(); g.ellipse(0, -ls * 0.8, ls * 0.45, ls * 0.85, 0, 0, Math.PI * 2); g.fill();
        g.restore();
      }
      g.globalAlpha = 1;
    }
    g.restore();
    // canopy (screen space via tp, so fruit and blossoms line up with it)
    BLOBS.forEach(([x, y, r, at, shade], i) => {
      const s = sm(at, at + 0.18, gr);
      if (s <= 0.01) return;
      const [cx, cy] = tp(x, y);
      const R = r * S * m * (rm ? s : s * (1 + Math.sin(Math.min(1, s) * Math.PI) * 0.12));
      if (R < 1) return;
      const lg = g.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
      const cols = [['#8fc23e', '#4d8a28'], ['#a6d348', '#5f9a2e'], ['#c3e866', '#74ae36']][shade];
      lg.addColorStop(0, cols[0]); lg.addColorStop(1, cols[1]);
      g.fillStyle = lg;
      g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
      // leafy flecks + a soft rim so the blobs read as foliage, not balloons
      g.strokeStyle = 'rgba(40,90,20,.22)'; g.lineWidth = Math.max(1, R * 0.05);
      g.beginPath(); g.arc(cx, cy, R * 0.97, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
      g.fillStyle = shade === 0 ? 'rgba(200,240,140,.22)' : 'rgba(235,255,170,.34)';
      for (let j = 0; j < 6; j++) {
        const a = i * 1.7 + j * 2.3, d = R * (0.3 + ((i + j) % 4) * 0.15);
        g.beginPath(); g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, Math.max(1, R * (0.035 + (j % 2) * 0.025)), 0, Math.PI * 2); g.fill();
      }
      if (shade === 2) { g.fillStyle = 'rgba(255,250,200,.16)'; g.beginPath(); g.arc(cx - R * 0.3, cy - R * 0.35, R * 0.35, 0, Math.PI * 2); g.fill(); }
    });
  }

  function fruitShape(x, y, r, ripe, glow) {
    if (glow > 0.01) {
      const halo = g.createRadialGradient(x, y, r * 0.6, x, y, r * (2.2 + glow * 1.6));
      halo.addColorStop(0, `rgba(255,236,150,${0.55 * glow})`); halo.addColorStop(1, 'rgba(255,210,58,0)');
      g.fillStyle = halo; g.beginPath(); g.arc(x, y, r * (2.2 + glow * 1.6), 0, Math.PI * 2); g.fill();
    }
    const mix = (a, b) => Math.round(a + (b - a) * ripe);
    const c0 = `rgb(${mix(236, 255)},${mix(244, 246)},${mix(150, 190)})`;
    const c1 = `rgb(${mix(190, 255)},${mix(214, 160)},${mix(70, 20)})`;
    const c2 = `rgb(${mix(130, 240)},${mix(170, 100)},${mix(40, 10)})`;
    const fg = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    fg.addColorStop(0, c0); fg.addColorStop(0.55, c1); fg.addColorStop(1, c2);
    g.fillStyle = fg; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(x - r * 0.38, y - r * 0.42, r * 0.22, r * 0.13, -0.6, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#5f9a2e'; g.beginPath(); g.ellipse(x + r * 0.25, y - r * 1.02, r * 0.32, r * 0.14, -0.5, 0, Math.PI * 2); g.fill();
  }

  function drawFruits() {
    for (const f of st.fruits) {
      let [x, y] = tp(f.nx, f.ny);
      let s = popScale(f.born);
      if (f.merge != null) {
        const k = Math.min(1, (T - f.merge) / (rm ? 0.3 : 0.8));
        const e = k * k * (3 - 2 * k);
        const [bx2, by2] = tp(0, 0.6);
        x += (bx2 - x) * e; y += (by2 - y) * e; s *= 1 - e * 0.9;
        if (k >= 1) f.gone = true;
      }
      if (f.gone || s <= 0.01) continue;
      const bob = rm ? 0 : Math.sin(T * 2 + f.nx * 9) * 1.5;
      fruitShape(x, y + bob, st.S * 0.058 * Math.max(0.6, st.m) * s, 0.75, 0.25);
    }
    if (st.big) {
      const b = st.big;
      if (b.popped) return;
      const [x, y] = tp(0, 0.6);
      const r = st.S * (0.1 + 0.05 * st.ripen) * popScale(b.born);
      if (r <= 0.5) return;
      const shimmer = rm || low ? 0 : Math.sin(T * 1.6) * 0.06;
      fruitShape(x, y, r, Math.min(1, 0.15 + st.ripen), Math.min(1, 0.15 + st.ripen * 0.85 + shimmer));
    }
  }

  function drawBlossoms() {
    for (const b of st.blossoms) {
      const s = popScale(b.born);
      if (s <= 0) continue;
      const [x, y] = tp(b.nx, b.ny);
      const r = st.S * 0.03 * s;
      g.fillStyle = b.c;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + b.rot;
        g.beginPath(); g.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.75, 0, Math.PI * 2); g.fill();
      }
      g.fillStyle = '#ffd23a'; g.beginPath(); g.arc(x, y, r * 0.55, 0, Math.PI * 2); g.fill();
    }
  }

  function drawParticles(dt) {
    // water drops (from the can)
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.vy += 900 * dt; d.x += d.vx * dt; d.y += d.vy * dt;
      if (d.y > d.stop) { drops.splice(i, 1); if (!low && Math.random() < 0.5) puffs.push({ x: d.x, y: d.y, age: 0, c: d.c }); continue; }
      g.fillStyle = d.c; g.globalAlpha = 0.9;
      g.beginPath(); g.ellipse(d.x, d.y, 2.6, 4.2, Math.atan2(d.vx, d.vy) * -1, 0, Math.PI * 2); g.fill();
      g.globalAlpha = 1;
    }
    for (let i = puffs.length - 1; i >= 0; i--) {
      const p = puffs[i]; p.age += dt;
      if (p.age > 0.4) { puffs.splice(i, 1); continue; }
      g.strokeStyle = p.c; g.globalAlpha = 1 - p.age / 0.4; g.lineWidth = 1.5;
      g.beginPath(); g.arc(p.x, p.y, 3 + p.age * 22, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1;
    }
    // ripening motes
    g.globalCompositeOperation = 'lighter';
    for (let i = motes.length - 1; i >= 0; i--) {
      const m = motes[i]; m.age += dt; m.y -= m.v * dt; m.x += Math.sin(m.age * 3 + m.ph) * 10 * dt;
      if (m.age > m.life) { motes.splice(i, 1); continue; }
      const a = Math.sin((m.age / m.life) * Math.PI) * 0.8;
      const gl = g.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.s);
      gl.addColorStop(0, `rgba(255,244,190,${a})`); gl.addColorStop(1, 'rgba(255,210,58,0)');
      g.fillStyle = gl; g.beginPath(); g.arc(m.x, m.y, m.s, 0, Math.PI * 2); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
    // confetti light
    for (let i = confetti.length - 1; i >= 0; i--) {
      const c = confetti[i]; c.age += dt;
      c.vy += (rm ? 40 : 260) * dt; c.vx *= 0.985; c.vy *= 0.985; c.x += c.vx * dt; c.y += c.vy * dt; c.rot += c.vr * dt;
      if (c.age > c.life || c.y > H + 20) { confetti.splice(i, 1); continue; }
      g.save(); g.translate(c.x, c.y); g.rotate(c.rot);
      g.globalAlpha = Math.min(1, (c.life - c.age) * 1.5);
      g.fillStyle = c.c;
      if (c.round) { g.beginPath(); g.arc(0, 0, c.w * 0.6, 0, Math.PI * 2); g.fill(); } else g.fillRect(-c.w / 2, -c.h / 2, c.w, c.h * Math.abs(Math.cos(c.rot * 1.7)) + 1);
      g.restore();
    }
    g.globalAlpha = 1;
  }

  // mental-photo viewfinder: corner brackets + a gentle warm veil (no flash)
  function drawPhoto(dt) {
    if (st.photo <= 0 && !st.veil) return;
    const { bx, by, S } = st;
    const x0 = bx - S * 0.62, x1 = bx + S * 0.62, y0 = by - S * 1.18, y1 = by + S * 0.1;
    if (st.photo > 0) {
      g.strokeStyle = `rgba(255,246,228,${0.9 * st.photo})`; g.lineWidth = 3; g.lineCap = 'round';
      const L = S * 0.14;
      for (const [x, y, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) {
        g.beginPath(); g.moveTo(x, y + sy * L); g.lineTo(x, y); g.lineTo(x + sx * L, y); g.stroke();
      }
    }
    if (st.veil) {
      st.veil.t += dt;
      const k = st.veil.t / 0.9;
      if (k >= 1) st.veil = null;
      else {
        g.fillStyle = `rgba(255,240,200,${0.22 * Math.sin(k * Math.PI)})`;
        g.fillRect(x0, y0, x1 - x0, y1 - y0);
      }
    }
  }

  function pour(x, y, colour) {
    const n = rm || low ? 1 : 2;
    for (let i = 0; i < n; i++) {
      drops.push({ x: x + (Math.random() - 0.5) * 6, y, vx: 40 + Math.random() * 50, vy: 40 + Math.random() * 40, c: colour,
        stop: st.by - (st.trunkH + st.S * 0.4 * st.m) * (0.6 + Math.random() * 0.5) });
    }
  }
  function confettiBurst(x, y) {
    const n = rm ? 26 : low ? 50 : 130;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = (rm ? 60 : 160) + Math.random() * (rm ? 80 : 360);
      confetti.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (rm ? 30 : 160), rot: Math.random() * 6, vr: rm ? 0.5 : (Math.random() - 0.5) * 12,
        w: 5 + Math.random() * 6, h: 8 + Math.random() * 8, c: CONFETTI[i % CONFETTI.length], round: i % 4 === 0, age: 0, life: (rm ? 2.2 : 2.6) + Math.random() * 1.4 });
    }
  }

  let humSound = null;
  const handlers = [];
  const listen = (el, ev, fn, opts) => { el.addEventListener(ev, fn, opts); handlers.push([el, ev, fn, opts]); };
  const cleanup = () => {
    cancelAnimationFrame(raf);
    removeEventListener('resize', resize);
    for (const [el, ev, fn, opts] of handlers) el.removeEventListener(ev, fn, opts);
    handlers.length = 0;
    for (const id of timers) clearTimeout(id);
    timers.clear();
    humSound?.stop(); humSound = null;
    world.fx.classList.remove('live');
    world.fx.replaceChildren();
  };
  signal.addEventListener('abort', cleanup, { once: true });

  // a draggable DOM token on the fx layer
  function token(el, { x, y }) {
    Object.assign(el.style, { position: 'absolute', left: `${x}px`, top: `${y}px`, transform: 'translate(-50%,-50%)', pointerEvents: 'auto', touchAction: 'none' });
    layer.append(el);
    return el;
  }
  function draggable(el, { onMove, onDrop, onStart }) {
    let drag = null;
    listen(el, 'pointerdown', (e) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      drag = { dx: e.clientX - (r.left + r.width / 2), dy: e.clientY - (r.top + r.height / 2), id: e.pointerId };
      el.setPointerCapture?.(e.pointerId);
      el.style.transition = 'none';
      onStart?.();
    });
    listen(el, 'pointermove', (e) => {
      if (!drag) return;
      const x = Math.max(24, Math.min(W - 24, e.clientX - drag.dx)), y = Math.max(24, Math.min(H - 24, e.clientY - drag.dy));
      el.style.left = `${x}px`; el.style.top = `${y}px`;
      onMove?.(x, y);
    });
    const end = () => {
      if (!drag) return;
      drag = null;
      const r = el.getBoundingClientRect();
      onDrop?.(r.left + r.width / 2, r.top + r.height / 2);
    };
    listen(el, 'pointerup', end);
    listen(el, 'pointercancel', end);
  }
  const glide = (el, x, y, ms = 500) => {
    el.style.transition = rm ? 'none' : `left ${ms}ms cubic-bezier(.2,.8,.2,1.1), top ${ms}ms cubic-bezier(.2,.8,.2,1.1), transform 300ms`;
    el.style.left = `${x}px`; el.style.top = `${y}px`;
  };

  // ====================================================== 1. PLANT IT ==
  setMove(0, { eyebrow: 'Move 1 of 4', title: 'Plant it', prompt: 'What’s the good thing? Pick the closest one.' });
  const fam = topFamily(ctx.input);
  const startI = Math.max(0.55, Math.min(1, 0.55 + (ctx.input.intensity || 0.6) * 0.45));
  world.setEmotion(fam === 'calm' ? { happy: 0.6, excited: 0.4 } : { excited: 0.8, happy: 0.2 }, startI);
  realm()?.setMood?.({ warmth: 0.6, clarity: 0.45, heaviness: 0.1, agitation: fam === 'calm' ? 0.1 : 0.3 });
  realm()?.transform?.(0.05);
  later(() => world.react(rm ? 'nod' : 'hop'), 250);
  // wait for Boppo to settle into place so the bubble sits above him
  later(() => say(OPENERS[fam] || OPENERS.other, 3400), rm ? 200 : 800);
  if ((ctx.input.intensity ?? 0.6) < 0.3) later(() => say('Even a little glow counts. Small sunshine is still sunshine.', 2800), 4400);

  let picked = null;
  const chipRow = h('div', { style: gridStyle, role: 'group', 'aria-label': 'What the good thing is' });
  const ownInput = h('input', { class: 'feel', type: 'text', maxlength: '80', placeholder: 'In your own words (optional)', 'aria-label': 'The good thing, in your own words (optional)',
    style: { minHeight: '46px', height: '46px', padding: '0 14px', fontSize: '16px', display: 'none', width: '100%', boxSizing: 'border-box', borderRadius: '14px', border: '1px solid var(--line-strong)', background: 'rgba(255,255,255,.07)', color: 'var(--text-1)' } });
  if (ctx.input.text) ownInput.value = String(ctx.input.text).trim().slice(0, 80);
  const ownBtn = h('button', { class: 'chip', style: { ...chipStyle, borderStyle: 'dashed' }, 'aria-expanded': 'false' }, '+ My own words');
  const seedBtn = h('button', { class: 'btn primary block', disabled: true }, 'Make it a seed');
  for (const [id, label] of GOOD) {
    const c = h('button', { class: 'chip', 'aria-pressed': 'false', style: chipStyle }, label);
    listen(c, 'click', () => {
      chipRow.querySelectorAll('[aria-pressed]').forEach((x) => x.setAttribute('aria-pressed', 'false'));
      c.setAttribute('aria-pressed', 'true');
      picked = id;
      seedBtn.disabled = false;
      audio.ui?.('select'); haptic('light');
      world.react('tap');
      realm()?.pulse?.('tap', { x: c.getBoundingClientRect().left + 30, y: c.getBoundingClientRect().top });
      world.setEmotion({ excited: 0.5, curious: 0.5 }, startI, { quiet: true });
    });
    chipRow.append(c);
  }
  chipRow.append(ownBtn);
  listen(ownBtn, 'click', () => {
    const open = ownInput.style.display === 'none';
    ownInput.style.display = open ? 'block' : 'none';
    ownBtn.setAttribute('aria-expanded', String(open));
    if (open) ownInput.focus();
    fit();
  });
  listen(ownInput, 'input', () => { if (!picked && ownInput.value.trim()) seedBtn.disabled = false; });
  setDock(chipRow, ownInput, seedBtn);
  await new Promise((r) => { listen(seedBtn, 'click', r); signal.addEventListener('abort', r, { once: true }); });
  if (signal.aborted) return result;
  result.good = picked;
  result.ownWords = ownInput.style.display !== 'none' ? ownInput.value.trim() : '';
  const goodLabel = GOOD.find(([id]) => id === picked)?.[1] || 'A good thing';
  const seedName = result.ownWords || goodLabel;

  // ---- drag the seed into the soil
  setMove(0, { eyebrow: 'Move 1 of 4', title: 'Plant it', prompt: 'Drag the seed into the glowing soil.' });
  const plantBtn = h('button', { class: 'btn block' }, 'Plant it for me');
  setDock(note('Boppo saved you a sunny spot. It’s glowing.'), plantBtn);
  st.soilTarget = true; st.soilOn = true;
  world.setEmotion({ excited: 0.7, happy: 0.3 }, startI);
  await say(result.ownWords ? `“${clip(result.ownWords, 54)}” — ooh. That’s a lovely seed.` : 'Ooh, a lovely seed! Catch!', 2600);
  if (signal.aborted) return result;
  const seed = h('button', { 'aria-label': `Seed: ${seedName}. Drag it into the soil, or press Enter to plant it.`,
    style: { width: '64px', height: '64px', borderRadius: '50%', border: '0', padding: '0', cursor: 'grab', display: 'grid', placeItems: 'center',
      background: 'radial-gradient(circle, rgba(255,240,170,.55), rgba(255,210,58,0) 70%)' } },
  h('span', { 'aria-hidden': 'true', style: { width: '24px', height: '32px', borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%', display: 'block',
    background: 'radial-gradient(circle at 35% 30%, #fff6c4, #ffb31f 55%, #c8643a)', boxShadow: '0 0 18px rgba(255,210,58,.9), inset -3px -4px 6px rgba(120,40,10,.35)' } }));
  const tag = h('span', { 'aria-hidden': 'true', style: { position: 'absolute', top: '62px', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', maxWidth: '150px',
    overflow: 'hidden', textOverflow: 'ellipsis', font: '700 12px var(--font-ui)', padding: '3px 9px', borderRadius: '999px', background: 'rgba(255,246,228,.92)', color: '#3a0602' } }, seedName);
  seed.append(tag);
  const home = () => ({ x: Math.max(84, Math.min(W * 0.36, st.bx - st.S * 0.55)), y: Math.max(titleBottom() + 44, st.by - st.S * 0.8) });
  const h0 = home();
  const m0 = world.mallowRect();
  token(seed, rm ? h0 : { x: m0.cx, y: m0.top + m0.height * 0.3 });
  if (!rm) { world.react('hop'); requestAnimationFrame(() => glide(seed, h0.x, h0.y, 650)); }
  audio.fx?.('star', { intensity: 0.4 });

  await new Promise((resolve) => {
    let done = false;
    const near = (x, y) => Math.hypot(x - st.bx, y - (st.by - st.S * 0.06)) < Math.max(60, st.S * 0.45);
    const plant = () => {
      if (done) return; done = true;
      glide(seed, st.bx, st.by - 6, 420);
      seed.style.transform = 'translate(-50%,-50%) scale(.4)';
      later(() => { seed.remove(); resolve(); }, rm ? 60 : 420);
    };
    draggable(seed, {
      onStart: () => { seed.style.cursor = 'grabbing'; haptic('light'); world.setEmotion({ excited: 0.4, curious: 0.6 }, startI, { quiet: true }); },
      onMove: (x, y) => { st.soilNear = near(x, y); },
      onDrop: (x, y) => {
        st.soilNear = false;
        if (near(x, y)) plant();
        else { const p = home(); glide(seed, p.x, p.y, 450); world.react('flick'); }
      },
    });
    listen(seed, 'keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); plant(); } });
    listen(plantBtn, 'click', plant);
    signal.addEventListener('abort', resolve, { once: true });
  });
  if (signal.aborted) return result;
  st.soilTarget = false;
  st.growT = 0.14;
  audio.fx?.('drop-in', { intensity: 0.7 });
  later(() => audio.fx?.('bloom', { intensity: 0.5, pitch: 1.2 }), 220);
  haptic('pop');
  realm()?.pulse?.('ripple', { x: st.bx, y: st.by });
  world.react('gasp');
  world.setEmotion({ surprised: 0.5, excited: 0.5 }, 0.9);
  await say('It’s ALIVE! Hello, tiny sprout! I love you already.', 2600);
  if (signal.aborted) return result;
  say(GOOD.find(([id]) => id === picked)?.[2] || 'A seed of your very own. Brilliant.', 2600);
  world.setEmotion({ happy: 0.7, excited: 0.3 }, 0.85);
  realm()?.transform?.(0.15);
  await pause(1800);
  if (signal.aborted) return result;

  // ======================================================= 2. GROW IT ==
  const can = h('button', { 'aria-label': 'Watering can. Drag it over the tree and tip it to pour, or press Enter to pour.',
    style: { width: '78px', height: '66px', border: '0', padding: '0', background: 'none', cursor: 'grab', transition: 'transform 250ms' } });
  can.innerHTML = canSVG();
  const water = () => can.querySelector('[data-water]');
  const fruitLines = ['A SUNPOP! Look! It’s tiny and it’s perfect.', 'Another one! The tree is showing off now.', 'Three sunpops! I’m going to burst. Not literally. Yet.', 'Four! A whole orchard of you!'];
  let fruitCount = 0;
  for (let si = 0; si < SENSES.length; si++) {
    const sense = SENSES[si];
    setMove(1, { eyebrow: `Move 2 of 4 · ${sense.short} (${si + 1} of 4)`, title: 'Grow it', prompt: sense.q });
    world.setEmotion({ curious: 0.5, happy: 0.5 }, 0.75, { quiet: true });
    const row = h('div', { style: gridStyle, role: 'group', 'aria-label': sense.q });
    const skip = h('button', { class: 'btn ghost block', style: glassGhost }, 'Skip this one');
    let choice = null;
    const chosen = new Promise((r) => {
      for (const label of sense.chips) {
        const c = h('button', { class: 'chip', style: chipStyle }, h('span', { class: 'hue', style: { background: sense.colour, boxShadow: `0 0 8px ${sense.colour}` } }), label);
        listen(c, 'click', () => { choice = label; audio.ui?.('select'); haptic('light'); r(); });
        row.append(c);
      }
      listen(skip, 'click', () => { choice = null; r(); });
      signal.addEventListener('abort', r, { once: true });
    });
    setDock(row, skip);
    await chosen;
    if (signal.aborted) return result;
    if (!choice) {
      st.growT = Math.min(1, st.growT + 0.08);
      realm()?.pulse?.('tap', { x: st.bx, y: st.by - st.S * 0.4 });
      if (si === 0) say('Skipping’s fine! Trees are very relaxed about it.', 2000);
      continue;
    }
    result.details[sense.id] = choice;

    // ---- fill the can, then tip it over the tree
    setMove(1, { eyebrow: `Move 2 of 4 · ${sense.short} (${si + 1} of 4)`, title: 'Grow it', prompt: 'Drag the can over your tree and tip it in.' });
    const meterFill = h('i', { style: { background: `linear-gradient(90deg, ${sense.colour}, #ffd23a)` } });
    const meter = h('div', { class: 'meter', role: 'progressbar', 'aria-label': 'Watering', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': 0 }, meterFill);
    const pourBtn = h('button', { class: 'btn block' }, 'Pour it for me');
    setDock(note(`${sense.short}: ${choice}`), meter, pourBtn);
    await pause(60);
    if (signal.aborted) return result;
    const canHome = () => {
      const m = world.mallowRect();
      return { x: Math.max(48, Math.min(W * 0.3, st.bx - st.S * 0.7)), y: Math.max(titleBottom() + 40, Math.min(st.by - st.S * 1.0, m.top + m.height * 0.12 - 44)) };
    };
    const c0 = canHome();
    if (!can.isConnected) token(can, c0); else glide(can, c0.x, c0.y, 400);
    water().setAttribute('fill', sense.colour);
    water().setAttribute('y', '58'); water().setAttribute('height', '0');
    requestAnimationFrame(() => { if (!rm) { water().style.transition = 'y 500ms, height 500ms'; } water().setAttribute('y', '30'); water().setAttribute('height', '28'); });
    audio.fx?.('sort', { intensity: 0.4, pitch: 1 + si * 0.08 });
    if (si === 0) say('Sunshine juice! Tip it over the tree. Splashing encouraged.', 2600);

    await new Promise((resolve) => {
      let filled = 0, pouring = false, auto = false, dragging = false, lastT = performance.now(), lastTick = 0, finished = false;
      const spout = () => { const r = can.getBoundingClientRect(); return [r.right - 4, r.top + r.height * 0.32]; };
      const inZone = () => {
        const [sx, sy] = spout();
        return Math.abs(sx - st.bx) < Math.max(70, st.S * 0.55) && sy < st.by - st.S * 0.45 && sy > st.by - st.S * 1.9;
      };
      const step = (now) => {
        const dt = Math.min(0.25, (now - lastT) / 1000); lastT = now;
        pouring = auto || (dragging && inZone());
        can.style.transform = `translate(-50%,-50%) rotate(${pouring ? 32 : 0}deg)`;
        if (pouring) {
          const [sx, sy] = spout();
          pour(sx, sy, sense.colour);
          filled = Math.min(1, filled + dt / 1.6);
          meterFill.style.width = `${Math.round(filled * 100)}%`;
          meter.setAttribute('aria-valuenow', Math.round(filled * 100));
          water().setAttribute('y', String(30 + 28 * filled)); water().setAttribute('height', String(28 * (1 - filled)));
          st.growT = Math.max(st.growT, Math.min(1, baseGrow + filled * 0.2));
          if (now - lastTick > 260) { lastTick = now; haptic('tick'); audio.fx?.('rotate-tick', { intensity: 0.25, pitch: 1 + filled * 0.5 }); }
        }
        if (filled >= 1) { finish(); return; }
        tick = requestAnimationFrame(step);
      };
      const baseGrow = st.growT;
      let tick = requestAnimationFrame(step);
      const goAuto = () => {
        if (auto) return;
        auto = true;
        const p = [st.bx - st.S * 0.38 - 30, Math.max(titleBottom() + 34, st.by - st.S * 1.18)];
        glide(can, p[0], p[1], 500);
      };
      draggable(can, {
        onStart: () => { dragging = true; can.style.cursor = 'grabbing'; },
        onDrop: () => { dragging = false; can.style.cursor = 'grab'; },
      });
      listen(can, 'keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goAuto(); } });
      listen(pourBtn, 'click', goAuto);
      function finish() {
        if (finished) return; finished = true;
        cancelAnimationFrame(tick);
        resolve();
      }
      signal.addEventListener('abort', () => { cancelAnimationFrame(tick); resolve(); }, { once: true });
    });
    if (signal.aborted) return result;
    can.style.transform = 'translate(-50%,-50%) rotate(0deg)';
    const ch = canHome(); glide(can, ch.x, ch.y, 500);
    st.growT = Math.min(1, 0.28 + (si + 1) * 0.18);
    const slot = SLOTS[fruitCount % SLOTS.length];
    st.fruits.push({ nx: slot[0], ny: slot[1], born: T + 0.5 });
    fruitCount++;
    later(() => {
      const [fx, fy] = tp(slot[0], slot[1]);
      audio.fx?.('chime', { intensity: 0.6, pitch: 1 + fruitCount * 0.12 });
      haptic('pop');
      realm()?.pulse?.('ripple', { x: fx, y: fy });
    }, 500);
    world.react('tap');
    world.setEmotion({ happy: 0.6, loved: 0.4 }, 0.85);
    realm()?.setMood?.({ warmth: 0.6 + fruitCount * 0.08, clarity: 0.5 + fruitCount * 0.08 });
    realm()?.transform?.(0.15 + fruitCount * 0.08);
    await pause(500);
    say(choice === 'Just me' ? 'Just you? Excellent company, honestly.' : (fruitCount === 1 ? fruitLines[0] : (si % 2 ? sense.line : fruitLines[fruitCount - 1])), 2400);
    await pause(1700);
    if (signal.aborted) return result;
  }
  can.remove();
  st.growT = 1;

  // ===================================================== 3. SOAK IT IN ==
  setMove(2, { eyebrow: 'Move 3 of 4', title: 'Soak it in', prompt: 'Hold the sun while your sunpop ripens. Let it land.' });
  world.setEmotion({ happy: 0.5, calm: 0.5 }, 0.7);
  // the little fruits fly together into one big sunpop
  for (const f of st.fruits) f.merge = T;
  st.big = { born: T + (st.fruits.length ? (rm ? 0.3 : 0.7) : 0) };
  later(() => { audio.fx?.('bloom', { intensity: 0.6 }); realm()?.pulse?.('ripple', { x: tp(0, 0.6)[0], y: tp(0, 0.6)[1] }); haptic('soft'); }, rm ? 300 : 700);

  const ring = h('span', { 'aria-hidden': 'true', style: { position: 'absolute', inset: '0', borderRadius: '50%', background: 'conic-gradient(#ffd23a 0turn, rgba(255,255,255,.14) 0turn)' } });
  const core = h('span', { 'aria-hidden': 'true', style: { position: 'absolute', inset: '10px', borderRadius: '50%', background: 'radial-gradient(circle at 40% 35%, #fff6c4, #ffd23a 50%, #ff7a0a)', boxShadow: '0 0 30px rgba(255,210,58,.6)', transition: 'transform 300ms' } });
  const holdLabel = h('span', { style: { position: 'relative', color: '#3a0602', font: '800 14px var(--font-ui)', letterSpacing: '.06em' } }, 'HOLD');
  const sun = h('button', { class: 'hold-target', style: { width: '112px', height: '112px' }, 'aria-label': 'The sun. Press and hold to ripen the sunpop. Press Enter to start or pause.' }, ring, core, holdLabel);
  const cue = note('Press and hold the sun'); cue.setAttribute('aria-live', 'polite');
  const tapMode = h('button', { class: 'btn ghost block', style: glassGhost }, 'Can’t hold? Tap to ripen on its own');
  setDock(sun, cue, tapMode);
  await pause(rm ? 300 : 900);
  if (signal.aborted) return result;
  say('Okay. Boppo is going to do… quiet bouncing. Hold the sun.', 2800);

  const SOAK = 12;
  await new Promise((resolve) => {
    let holding = false, toggled = false, t = 0, prev = performance.now(), lastBeat = 0, said = 0;
    humSound = audio.hold?.('hum', { intensity: 0 }) || null;
    const lines = [[3, 'Let it land. No rush.'], [6.5, 'Where does it sit in your body? Just notice it there.'], [10, 'Mmm. Golden.']];
    const step = (now) => {
      const dt = Math.min(0.25, (now - prev) / 1000); prev = now;
      const active = holding || toggled;
      if (active) {
        t += dt;
        const p = Math.min(1, t / SOAK);
        st.ripen = p;
        ring.style.background = `conic-gradient(#ffd23a ${p}turn, rgba(255,255,255,.14) ${p}turn)`;
        core.style.transform = `scale(${1 + p * 0.06})`;
        humSound?.update?.({ intensity: 0.3 + p * 0.4, pitch: 1 + p * 0.2 });
        world.setEmotion({ calm: 0.35 + p * 0.3, loved: 0.25 + p * 0.25, happy: Math.max(0.05, 0.4 - p * 0.35) }, 0.75, { quiet: true });
        if (world.rig) world.rig.target.glow = 0.3 + p * 0.9;
        realm()?.setMood?.({ warmth: 0.85 + p * 0.15, clarity: 0.75 + p * 0.2, agitation: 0.05 });
        realm()?.transform?.(0.5 + p * 0.25);
        if (!low && Math.random() < dt * (rm ? 3 : 9)) {
          const [x, y] = tp(0, 0.6);
          motes.push({ x: x + (Math.random() - 0.5) * st.S * 0.3, y, v: 20 + Math.random() * 30, s: 5 + Math.random() * 7, age: 0, life: 1.6 + Math.random(), ph: Math.random() * 6 });
        }
        if (now - lastBeat > 3000) { lastBeat = now; haptic('soft'); }
        if (said < lines.length && t >= lines[said][0]) { say(lines[said][1], 2600); said++; }
        cue.textContent = `Ripening… ${Math.round(p * 100)}%`;
        holdLabel.textContent = toggled && !holding ? 'PAUSE' : '';
      } else {
        humSound?.update?.({ intensity: 0 });
        if (t > 0) cue.textContent = 'Paused. Hold again whenever.';
        holdLabel.textContent = 'HOLD';
      }
      result.soakSeconds = Math.round(t);
      if (t >= SOAK) { finish(); return; }
      tick = requestAnimationFrame(step);
    };
    let tick = requestAnimationFrame(step);
    const on = (e) => { e.preventDefault(); holding = true; sun.setPointerCapture?.(e.pointerId); haptic('light'); };
    const off = () => { holding = false; };
    listen(sun, 'pointerdown', on);
    listen(sun, 'pointerup', off);
    listen(sun, 'pointercancel', off);
    listen(sun, 'contextmenu', (e) => e.preventDefault());
    listen(sun, 'keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggled = !toggled; } });
    listen(tapMode, 'click', () => { toggled = !toggled; tapMode.textContent = toggled ? 'Pause' : 'Tap to keep ripening'; });
    function finish() {
      cancelAnimationFrame(tick);
      humSound?.stop(); humSound = null;
      resolve();
    }
    signal.addEventListener('abort', () => { cancelAnimationFrame(tick); resolve(); }, { once: true });
  });
  if (signal.aborted) return result;
  st.ripen = 1;
  audio.fx?.('star', { intensity: 0.7 });
  haptic('success');
  realm()?.pulse?.('success', { x: tp(0, 0.6)[0], y: tp(0, 0.6)[1] });
  world.setEmotion({ happy: 0.6, loved: 0.4 }, 0.85);
  world.react('success');
  await say('Ripe! It’s so ripe it’s humming. Is that me humming? Could be me.', 2600);
  if (signal.aborted) return result;

  // ================================================= 4. KEEP OR SHARE ==
  setMove(3, { eyebrow: 'Move 4 of 4', title: 'Keep it or share it', prompt: 'How would you like to keep this one?' });
  world.setEmotion({ proud: 0.5, hopeful: 0.5 }, 0.75);
  const noteText = () => {
    const d = SENSES.filter((s) => result.details[s.id]).map((s) => `${s.short}: ${result.details[s.id].toLowerCase()}.`);
    return [`Good thing: ${seedName}.`, ...d, 'Remember this one!'].join(' ');
  };
  const cardStyle = { padding: '12px 14px', borderRadius: '18px', background: 'rgba(20,16,48,.66)', display: 'grid', gap: '10px' };
  function buildDetail(id) {
    const [, label, text] = KEEP.find(([k]) => k === id);
    const kids = [h('strong', { style: { color: 'var(--accent)', font: '800 12px/1 var(--font-ui)', letterSpacing: '.1em', textTransform: 'uppercase' } }, label),
      h('p', { style: { margin: '0', color: 'var(--text-1)', font: '600 14px/1.35 var(--font-ui)' } }, text)];
    if (id === 'write') {
      const ta = h('textarea', { class: 'feel', 'aria-label': 'Note for later', style: { minHeight: '76px', height: '76px', fontSize: '16px' } }, result.note || noteText());
      result.note = ta.value;
      listen(ta, 'input', () => { result.note = ta.value; });
      kids.push(ta);
    } else if (id === 'photo') {
      st.photo = 1;
      const shutter = h('button', { class: 'btn block', 'aria-label': 'Take the mental photo' }, result.photo ? 'Click! (one more?)' : 'Tap the shutter');
      listen(shutter, 'click', () => {
        result.photo = true;
        st.veil = { t: 0 };
        audio.fx?.('lens-focus', { intensity: 0.5 });
        later(() => audio.fx?.('snap', { intensity: 0.4 }), 160);
        haptic('pop');
        world.react('tap');
        shutter.textContent = 'Click! It’s in the album.';
      });
      kids.push(shutter);
    } else if (id === 'again') {
      const row = h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px' }, role: 'group', 'aria-label': 'When to do it again' });
      for (const when of AGAIN) {
        const c = h('button', { class: 'chip', 'aria-pressed': String(result.again === when), style: { minHeight: '44px' } }, when);
        listen(c, 'click', () => { result.again = when; row.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', String(x === c))); audio.ui?.('select'); haptic('light'); world.react('nod'); });
        row.append(c);
      }
      kids.push(row);
    }
    return h('div', { style: cardStyle }, ...kids);
  }
  await new Promise((resolve) => {
    const grid = h('div', { class: 'choice-grid' });
    for (const [id, label, , line] of KEEP) {
      const b = h('button', { class: 'choice', style: { minHeight: '54px', padding: '8px 12px', fontSize: '14px', gridColumn: id === 'enjoy' ? '1 / -1' : null, textAlign: id === 'enjoy' ? 'center' : null } }, label);
      listen(b, 'click', () => {
        result.keep = [id];
        if (id !== 'again') result.again = null;
        audio.ui?.('select'); haptic('light');
        say(line, 2400);
        world.react('nod');
        world.setEmotion(id === 'enjoy' ? { happy: 0.7, calm: 0.3 } : { proud: 0.4, happy: 0.6 }, 0.8, { quiet: true });
        realm()?.pulse?.('tap', { x: st.bx, y: st.by - st.S * 0.6 });
        showDetail(id);
      });
      grid.append(b);
    }
    const showGrid = () => { st.photo = 0; result.keep = []; setDock(grid); };
    function showDetail(id) {
      const done = h('button', { class: 'btn primary block' }, 'Done — pop it!');
      const back = h('button', { class: 'btn ghost block', style: glassGhost }, 'Pick a different one');
      listen(done, 'click', resolve);
      listen(back, 'click', showGrid);
      st.photo = 0;
      setDock(buildDetail(id), done, back);
    }
    showGrid();
    signal.addEventListener('abort', resolve, { once: true });
  });
  if (signal.aborted) return result;
  if (result.keep.includes('write') && !result.note) result.note = noteText();
  if (!result.keep.includes('write')) result.note = '';
  st.photo = 0;

  // ========================================================== FINALE ==
  setDock();
  setMove(4, { eyebrow: 'The Sunpop Orchard', title: 'Pop!', prompt: '' });
  const [px, py] = tp(0, 0.6);
  if (st.big) st.big.popped = true;
  confettiBurst(px, py);
  audio.fx?.('clear', { intensity: 0.85 });
  later(() => audio.fx?.('bloom', { intensity: 0.7, pitch: 1.1 }), 300);
  haptic('success');
  realm()?.pulse?.('burst', { x: px, y: py });
  realm()?.transform?.(1);
  realm()?.setMood?.({ warmth: 1, clarity: 1, agitation: 0.15, heaviness: 0 });
  BLOSSOM_SPOTS.forEach(([nx, ny], i) => st.blossoms.push({ nx, ny, born: T + 0.25 + i * (rm ? 0.03 : 0.09), rot: i, c: i % 3 ? '#ffd1e8' : '#fff6e4' }));
  later(() => realm()?.pulse?.('clear', { x: st.bx, y: st.by - st.S * 0.5 }), 1200);
  world.setEmotion({ excited: 0.7, happy: 0.3 }, 0.95);
  world.react('celebrate');
  await say('BOOP! You did it! Everything is golden!', 2600);
  if (signal.aborted) return result;
  await say('That good thing? It’s yours now. Pop back and visit it any time.', 2800);
  if (signal.aborted) return result;
  cleanup();

  result.completed = true;
  const det = SENSES.filter((s) => result.details[s.id]).map((s) => `${s.short}: ${result.details[s.id]}`);
  const keepLabels = result.keep.map((id) => KEEP.find(([k]) => k === id)[1]);
  result.summary = [
    { label: 'The good thing', text: result.ownWords ? `${goodLabel} — “${clip(result.ownWords, 80)}”` : goodLabel },
    det.length ? { label: 'Grown with', text: det.join(' · ') } : null,
    { label: 'Soaked in', text: `${Math.max(SOAK, result.soakSeconds)} seconds of ripening` },
    { label: 'Keeping it', text: (keepLabels.join(' + ') || 'Just enjoying it') + (result.again ? ` (${result.again.toLowerCase()})` : '') },
    result.note ? { label: 'Note for later', text: result.note } : null,
  ].filter(Boolean);
  result.share = { title: 'A sunpop, savoured', subtitle: 'Boppo helped me grow a good feeling into a whole tree.' };
  return result;
}

function topFamily(input) {
  for (const e of input?.emotions || []) {
    const em = getEmotion(e.id);
    const f = em?.family || e.id;
    if (['joy', 'love', 'pride', 'calm'].includes(f)) return f;
  }
  return 'other';
}

function canSVG() {
  return `<svg viewBox="0 0 90 76" width="78" height="66" aria-hidden="true" style="overflow:visible;pointer-events:none">
    <defs><clipPath id="sps-can"><rect x="14" y="26" width="46" height="34" rx="9"/></clipPath></defs>
    <path d="M58 34 L84 18 L87 23 L62 44 Z" fill="#ffb31f" stroke="#c8643a" stroke-width="2.5" stroke-linejoin="round"/>
    <ellipse cx="85" cy="20" rx="4" ry="6" transform="rotate(30 85 20)" fill="#ffd23a" stroke="#c8643a" stroke-width="2"/>
    <path d="M22 28 C 20 8, 52 8, 50 28" fill="none" stroke="#c8643a" stroke-width="5" stroke-linecap="round"/>
    <rect x="14" y="26" width="46" height="34" rx="9" fill="#fff6e4" stroke="#c8643a" stroke-width="3"/>
    <rect data-water x="14" y="58" width="46" height="0" fill="#7fd4ff" clip-path="url(#sps-can)" opacity=".9"/>
    <rect x="14" y="26" width="46" height="34" rx="9" fill="none" stroke="#c8643a" stroke-width="3"/>
    <circle cx="27" cy="38" r="4" fill="#fff" opacity=".7"/>
  </svg>`;
}

function clip(s, n) { s = String(s || ''); return s.length > n ? `${s.slice(0, n - 1)}…` : s; }
