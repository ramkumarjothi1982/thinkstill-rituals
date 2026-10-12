// Central character asset registry for the seven Mallows.
//
// Every visual here is derived from the approved artwork:
//   assets/mallows/<id>.png      approved transparent cut-out (source of truth)
//   assets/rig/<id>-body.png     same artwork with eyes/brows/mouth inpainted,
//                                used underneath the animated face
//   assets/rig/*-iris-*.png      irises cut from Pipzi / Boppo
//   assets/rig/zuzu-spiral-*.png Zuzu's spiral eyes cut from the artwork
//   assets/rig/iris-navy|amber   Boppo's iris recoloured for Mallows whose
//                                approved face has closed eyes, and Glitzi
//
// All rig coordinates are in the approved PNG's own pixel space, measured by
// tools/detect.py (see tools/features.json).

export const MALLOW_IDS = ['glitzi', 'blubi', 'zuzu', 'boppo', 'pipzi', 'loomi', 'noomi'];

// Legacy ThinkStill bubble ids -> Mallow ids (saved data + old ritual library)
export const LEGACY_BUBBLE_TO_MALLOW = {
  glitch: 'glitzi', drop: 'blubi', loopie: 'zuzu', patch: 'boppo',
  rush: 'pipzi', sync: 'loomi', still: 'noomi',
};

const A = (p) => new URL(`../../assets/${p}`, import.meta.url).href;

export const MALLOWS = {
  glitzi: {
    id: 'glitzi', name: 'Glitzi', title: 'The Chaos Mallow',
    personality: 'Sarcastic, mischievous, glitchy, secretly lovable',
    voice: {
      hello: ['Oh. You again. …Good. I was getting bored of being mysterious.',
        'Static check: you look like you carried something heavy in here.'],
      listen: ['Go on. I’m pretending not to care, very loudly.'],
      concern: ['Hey. That sounds rough. Even my glitches went quiet.'],
      cheer: ['Look at that. Order. Disgusting. I love it.', 'Okay, that was actually cool. Don’t tell anyone I said so.'],
      rest: ['I’ll keep the static low. You rest.'],
    },
    colours: { body: '#2a1a6e', glow: '#3ee8ff', accent: '#ff3df2', ink: '#0b0e33' },
    realm: 'static-storm',
    signature: 'glitch',
    energy: 0.85,
    file: A('mallows/glitzi.png'), body: A('rig/glitzi-body.png'),
    size: [383, 387], bodyBox: [6, 7, 375, 379],
    face: {
      eyeStyle: 'glitzi',
      line: '#0a0d2e', lineHi: 'rgba(120,150,255,.25)',
      eyes: {
        L: { x: 126, y: 218, rx: 54, ry: 40, iris: 'iris-amber', irisR: 22, irisOff: [10, -4], hw: 50, sag: 6, lw: 9 },
        R: { x: 258, y: 210, rx: 54, ry: 42, iris: 'iris-amber', irisR: 22, irisOff: [14, -8], hw: 50, sag: 6, lw: 9 },
      },
      brows: {
        L: { p0: [74, 180], c: [124, 162], p1: [176, 172], lw: 15, alpha: 0, ink: '#05061c', hi: 'rgba(80,225,255,.95)' },
        R: { p0: [208, 166], c: [258, 150], p1: [312, 168], lw: 15, alpha: 0, ink: '#05061c', hi: 'rgba(80,225,255,.95)' },
      },
      mouth: { x: 198, y: 281, w: 148, sag: 15, lw: 7, style: 'crease',
        inside: '#140820', tongue: '#d4406f' },
      cheeks: { L: [92, 252, 28], R: [292, 248, 28], colour: '#ff3df2', base: 0 },
      neutral: { eyeOpen: 1, lidTop: 0.4, lidSlant: -0.12, lookX: 0.55, lookY: -0.35, mouthSmile: -0.75, glitch: 0.6, blush: 0 },
    },
  },
  blubi: {
    id: 'blubi', name: 'Blubi', title: 'The Softie',
    personality: 'Sensitive, comforting, sweet, beautifully dramatic',
    voice: {
      hello: ['Oh! You came! I saved you the softest cushion.', 'Hi, hi. Whatever it is, we can hold it together.'],
      listen: ['I’m listening with my whole squishy heart.'],
      concern: ['Oh, that’s a lot. Come here, let’s go slowly.'],
      cheer: ['You did that so gently. I’m going to cry. Happy tears!'],
      rest: ['Rest here as long as you like. The rain can wait.'],
    },
    colours: { body: '#0b8ff0', glow: '#7fd4ff', accent: '#ff8ef2', ink: '#050a3a' },
    realm: 'raindrop-lagoon',
    signature: 'droplet',
    energy: 0.55,
    file: A('mallows/blubi.png'), body: A('rig/blubi-body.png'),
    size: [414, 417], bodyBox: [6, 7, 406, 409],
    face: {
      eyeStyle: 'closed',
      line: '#050a3a', lineHi: 'rgba(140,200,255,.38)',
      eyes: {
        L: { x: 138.5, y: 243.8, hw: 43.5, sag: 19.5, tilt: 3.7, lw: 12, rx: 34, ry: 34, iris: 'iris-navy', irisR: 23, irisOff: [3, 0] },
        R: { x: 287.5, y: 244.4, hw: 43.5, sag: 20.3, tilt: 3.8, lw: 12, rx: 34, ry: 34, iris: 'iris-navy', irisR: 23, irisOff: [-3, 0] },
      },
      brows: {
        L: { p0: [106, 201.1], c: [136.5, 181.1], p1: [167, 183.7], lw: 12, alpha: 1 },
        R: { p0: [260, 183.8], c: [290, 184.9], p1: [320, 202], lw: 12, alpha: 1 },
      },
      mouth: { x: 212.5, y: 297.2, w: 85, sag: 19.5, lw: 12, style: 'line',
        inside: '#2a0a3a', tongue: '#ff6f9c' },
      cheeks: { L: [88, 276, 30], R: [338, 276, 30], colour: '#ff7ef0', base: 1 },
      neutral: { eyeOpen: 0, closedCurve: 1, mouthSmile: 1 },
    },
  },
  zuzu: {
    id: 'zuzu', name: 'Zuzu', title: 'The Spiral',
    personality: 'Curious, hypnotic, playful, overthinking',
    voice: {
      hello: ['Ooh, a visitor! Quick question: what if we looked at it from upside down?',
        'Hiii. My spirals are already spinning about you.'],
      listen: ['Mm-hm. And then what? And then what after that?'],
      concern: ['Wobbly thoughts, huh? Let’s slow the spin together.'],
      cheer: ['Whoa. Did you see that perspective flip? Again again!'],
      rest: ['Spirals slowing… slowing… there.'],
    },
    colours: { body: '#c414e6', glow: '#39f0ff', accent: '#ff6ad0', ink: '#3a0052' },
    realm: 'spiral-observatory',
    signature: 'spiral',
    energy: 0.75,
    file: A('mallows/zuzu.png'), body: A('rig/zuzu-body.png'),
    size: [377, 386], bodyBox: [7, 6, 370, 377],
    face: {
      eyeStyle: 'spiral',
      line: '#3a0052', lineHi: 'rgba(255,170,255,.3)',
      eyes: {
        L: { x: 114.6, y: 180.5, rx: 57, ry: 57, sprite: 'zuzu-spiral-L', spriteR: 60, hw: 52, sag: 14, lw: 11 },
        R: { x: 263.9, y: 179.6, rx: 57, ry: 57, sprite: 'zuzu-spiral-R', spriteR: 60, hw: 52, sag: 14, lw: 11 },
      },
      brows: {
        L: { p0: [70, 112], c: [114, 96], p1: [158, 110], lw: 11, alpha: 0 },
        R: { p0: [220, 110], c: [264, 96], p1: [308, 112], lw: 11, alpha: 0 },
      },
      mouth: { x: 188, y: 262, w: 117, sag: 0, lw: 9, style: 'open',
        upper: -10, depth: 54, inside: '#4f001d', tongue: '#ff6aa0' },
      cheeks: { L: [70, 250, 30], R: [310, 250, 30], colour: '#ff8cf0', base: 1 },
      neutral: { eyeOpen: 1, mouthSmile: 0.9, mouthOpen: 1, spin: 0.25 },
    },
  },
  boppo: {
    id: 'boppo', name: 'Boppo', title: 'The Sunshine',
    personality: 'Joyful, optimistic, bouncy, adorably chaotic',
    voice: {
      hello: ['YOU’RE HERE! Okay, okay, calm Boppo. …YOU’RE HERE!', 'Hi sunshine! I mean, I’m the sunshine. Hi anyway!'],
      listen: ['Tell me everything! I’m bouncing quietly. Mostly.'],
      concern: ['Oh no. Not every day is a bouncy day, and that’s okay.'],
      cheer: ['BOOP! You did it! Everything is golden!'],
      rest: ['Soft bounce… softer… sleepy sunshine.'],
    },
    colours: { body: '#ff7a0a', glow: '#ffd23a', accent: '#ff5ed0', ink: '#3a0602' },
    realm: 'sunpop-orchard',
    signature: 'bounce',
    energy: 1,
    file: A('mallows/boppo.png'), body: A('rig/boppo-body.png'),
    size: [379, 384], bodyBox: [5, 6, 372, 376],
    face: {
      eyeStyle: 'open',
      line: '#3a0602', lineHi: 'rgba(255,200,150,.3)',
      eyes: {
        L: { x: 115.1, y: 196.9, rx: 43, ry: 46.8, iris: 'boppo-iris-L', irisR: 33.5, irisOff: [6.6, 0.4], hw: 40, sag: 10, lw: 10 },
        R: { x: 263.9, y: 193.9, rx: 43, ry: 46.8, iris: 'boppo-iris-R', irisR: 33.5, irisOff: [-9, -1], hw: 40, sag: 10, lw: 10 },
      },
      brows: {
        L: { p0: [80, 139.8], c: [111, 114.5], p1: [142, 125], lw: 15, alpha: 1 },
        R: { p0: [238, 116.7], c: [269, 110.1], p1: [300, 129.5], lw: 14.5, alpha: 1 },
      },
      mouth: { x: 190.5, y: 251, w: 86, sag: 12, lw: 9, style: 'open',
        upper: 12, depth: 36, inside: '#440000', tongue: '#c8364e' },
      cheeks: { L: [78, 262, 30], R: [300, 258, 30], colour: '#ff5ed0', base: 1 },
      neutral: { eyeOpen: 1, mouthSmile: 1, mouthOpen: 0.45 },
    },
  },
  pipzi: {
    id: 'pipzi', name: 'Pipzi', title: 'The Spark',
    personality: 'Energetic, excitable, expressive, funny',
    voice: {
      hello: ['Sparks! Lanterns! You! Best combination!', 'Ooh, ooh, I have IDEAS. Do you have feelings? Let’s do both.'],
      listen: ['Wait wait wait — say that again, I’m paying such good attention.'],
      concern: ['Hey. I can do quiet sparks too. Promise.'],
      cheer: ['KAPOW! Okay that was the best thing I’ve seen all day.'],
      rest: ['Tiny sparks. Very tiny. Like… whisper sparks.'],
    },
    colours: { body: '#f2073b', glow: '#ffcf4a', accent: '#ffb0f0', ink: '#4a0610' },
    realm: 'spark-festival',
    signature: 'spark',
    energy: 1,
    file: A('mallows/pipzi.png'), body: A('rig/pipzi-body.png'),
    size: [434, 423], bodyBox: [6, 7, 425, 415],
    face: {
      eyeStyle: 'open',
      line: '#4a0610', lineHi: 'rgba(255,160,170,.3)',
      eyes: {
        L: { x: 130.9, y: 215.4, rx: 52.6, ry: 54.5, iris: 'pipzi-iris-L', irisR: 39, irisOff: [9.9, -0.8], hw: 50, sag: 12, lw: 11 },
        R: { x: 301.2, y: 214.6, rx: 52.7, ry: 55.1, iris: 'pipzi-iris-R', irisR: 39, irisOff: [-11.2, -0.4], hw: 50, sag: 12, lw: 11 },
      },
      brows: {
        L: { p0: [91, 140.5], c: [125.5, 114], p1: [160, 124.3], lw: 14.5, alpha: 1 },
        R: { p0: [271, 122.7], c: [307.5, 113.6], p1: [344, 137.6], lw: 14, alpha: 1 },
      },
      mouth: { x: 218, y: 289, w: 118, sag: 0, lw: 9, style: 'open',
        upper: -14, depth: 58, inside: '#4a0008', tongue: '#ff5f8a' },
      cheeks: { L: [90, 278, 32], R: [350, 278, 32], colour: '#ffb0f0', base: 1 },
      neutral: { eyeOpen: 1, mouthSmile: 0.9, mouthOpen: 1 },
    },
  },
  loomi: {
    id: 'loomi', name: 'Loomi', title: 'The Chill One',
    personality: 'Calm, unbothered, gently amusing',
    voice: {
      hello: ['Oh, hey. No rush. The water’s nice.', 'Hi. I saved you a slow minute.'],
      listen: ['Mm. Take your time. I have all of it.'],
      concern: ['That sounds heavy. Let’s let it float a bit.'],
      cheer: ['Nice. Very nice. Quietly impressed over here.'],
      rest: ['Drifting is a valid plan.'],
    },
    colours: { body: '#1aa8f5', glow: '#a8f0ff', accent: '#ff7cf5', ink: '#02072e' },
    realm: 'blue-drift',
    signature: 'drift',
    energy: 0.4,
    file: A('mallows/loomi.png'), body: A('rig/loomi-body.png'),
    size: [363, 388], bodyBox: [9, 7, 352, 380],
    face: {
      eyeStyle: 'closed',
      line: '#02072e', lineHi: 'rgba(160,220,255,.38)',
      eyes: {
        L: { x: 116.5, y: 229.25, hw: 36.5, sag: 16.3, tilt: 0, lw: 12, rx: 30, ry: 30, iris: 'iris-navy', irisR: 20, irisOff: [3, 0] },
        R: { x: 248.5, y: 228.5, hw: 38.5, sag: 17, tilt: 0, lw: 12, rx: 30, ry: 30, iris: 'iris-navy', irisR: 20, irisOff: [-3, 0] },
      },
      brows: {
        L: { p0: [77, 189.1], c: [110, 206.3], p1: [143, 177.6], lw: 12, alpha: 1 },
        R: { p0: [219, 177.1], c: [254, 207.3], p1: [289, 186], lw: 12, alpha: 1 },
      },
      mouth: { x: 183, y: 272.6, w: 74, sag: 16.3, lw: 11, style: 'line',
        inside: '#1a0a3a', tongue: '#ff6f9c' },
      cheeks: { L: [75, 266, 30], R: [290, 266, 30], colour: '#ff7cf5', base: 1 },
      neutral: { eyeOpen: 0, closedCurve: 1, mouthSmile: 1 },
    },
  },
  noomi: {
    id: 'noomi', name: 'Noomi', title: 'The Dreamer',
    personality: 'Sleepy, soothing, whimsical, dreamy',
    voice: {
      hello: ['Mmh… oh, hello. I was dreaming you’d visit.', 'Shh, the stars are napping. Come sit.'],
      listen: ['I’m awake. Mostly. Tell me softly.'],
      concern: ['Oh, sweet thing. Let’s wrap that in a cloud for a moment.'],
      cheer: ['Oh! *eyes open* …that was lovely. *eyes close*'],
      rest: ['Moonmilk and slow breaths. Stay as long as you like.'],
    },
    colours: { body: '#8fd0ff', glow: '#fff4c8', accent: '#ff7ff0', ink: '#0a1450' },
    realm: 'moonmilk-cove',
    signature: 'dream',
    energy: 0.35,
    file: A('mallows/noomi.png'), body: A('rig/noomi-body.png'),
    size: [439, 420], bodyBox: [7, 8, 429, 412],
    face: {
      eyeStyle: 'closed',
      line: '#0a1450', lineHi: 'rgba(170,200,255,.42)',
      eyes: {
        L: { x: 141, y: 226, hw: 44, sag: 18, tilt: 0, lw: 13, rx: 36, ry: 36, iris: 'iris-navy', irisR: 24, irisOff: [3, 0] },
        R: { x: 301.5, y: 226.2, hw: 44.5, sag: 18.7, tilt: 0, lw: 13, rx: 36, ry: 36, iris: 'iris-navy', irisR: 24, irisOff: [-3, 0] },
      },
      brows: {
        L: { p0: [108, 186], c: [140, 176], p1: [172, 184], lw: 11, alpha: 0 },
        R: { p0: [270, 184], c: [302, 176], p1: [334, 186], lw: 11, alpha: 0 },
      },
      mouth: { x: 219.5, y: 283.7, w: 87, sag: 19.4, lw: 13, style: 'line',
        inside: '#1a0a3a', tongue: '#ff6f9c' },
      cheeks: { L: [92, 272, 34], R: [342, 272, 34], colour: '#ff7ff0', base: 1 },
      neutral: { eyeOpen: 0, closedCurve: 1, mouthSmile: 1 },
    },
  },
};

export const SPRITES = {
  'pipzi-iris-L': A('rig/pipzi-iris-L.png'), 'pipzi-iris-R': A('rig/pipzi-iris-R.png'),
  'boppo-iris-L': A('rig/boppo-iris-L.png'), 'boppo-iris-R': A('rig/boppo-iris-R.png'),
  'iris-navy': A('rig/iris-navy.png'), 'iris-amber': A('rig/iris-amber.png'),
  'zuzu-spiral-L': A('rig/zuzu-spiral-L.png'), 'zuzu-spiral-R': A('rig/zuzu-spiral-R.png'),
};

export function getMallow(id) {
  const key = LEGACY_BUBBLE_TO_MALLOW[String(id).toLowerCase()] || String(id).toLowerCase();
  return MALLOWS[key] || null;
}

// Shared image cache: every rig instance reuses decoded images.
const cache = new Map();
export function loadImage(src) {
  if (!cache.has(src)) {
    cache.set(src, new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Could not load ${src}`));
      img.src = src;
    }));
  }
  return cache.get(src);
}

export async function loadMallowAssets(id) {
  const m = MALLOWS[id];
  const keys = new Set();
  for (const e of Object.values(m.face.eyes)) {
    if (e.iris) keys.add(e.iris);
    if (e.sprite) keys.add(e.sprite);
  }
  const [original, body, ...sprites] = await Promise.all([
    loadImage(m.file), loadImage(m.body), ...[...keys].map((k) => loadImage(SPRITES[k])),
  ]);
  const map = {};
  [...keys].forEach((k, i) => { map[k] = sprites[i]; });
  return { original, body, sprites: map, mask: bodyMask(id, original) };
}

export const MASK_SIZE = 64;
const masks = new Map();
/** 64×64 alpha (0..1) of the approved art over its full image, row-major —
 *  for mesh culling, hit-testing and particle mass. Sampled once per Mallow. */
export function bodyMask(id, img) {
  if (masks.has(id)) return masks.get(id);
  let out = null;
  try {
    const N = MASK_SIZE;
    const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(N, N) : document.createElement('canvas');
    c.width = N; c.height = N;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0, N, N);
    const px = g.getImageData(0, 0, N, N).data;
    out = new Float32Array(N * N);
    for (let i = 0; i < N * N; i++) out[i] = px[4 * i + 3] / 255;
  } catch { out = null; }
  masks.set(id, out);
  return out;
}

/** Bilinear alpha from a mask at image uv (0..1). */
export function maskAlpha(mask, u, v) {
  if (!mask) return 1;
  const N = MASK_SIZE;
  const x = Math.min(N - 1.001, Math.max(0, u * N - 0.5)), y = Math.min(N - 1.001, Math.max(0, v * N - 0.5));
  const i = x | 0, j = y | 0, tx = x - i, ty = y - j;
  const a = mask[j * N + i], b = mask[j * N + i + 1], c = mask[(j + 1) * N + i], d = mask[(j + 1) * N + i + 1];
  return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
}
