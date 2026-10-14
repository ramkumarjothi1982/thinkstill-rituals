// A minimal v2-contract direction for the render farm's own tests: a soft
// procedural blob for a Mallow, a still night lake, and one glass card whose
// text texture is always requested under the same key ('b0'). It renders in a
// fraction of a second at a small render scale and loads no files.
//
// Options (one fixture module per variant, see engine/directions.js):
//   text       the card's words (two fixtures with different text but the same
//              texture key prove that textures cannot bleed between videos, R4)
//   nanAt      frame indices where subframes() returns NaN (R18 guard)
//   hangAt     first frame whose overlay() never returns (render watchdog)
//   frames     length in frames (30 fps)
//   runtime    meta.runtime (a 'v3' fixture proves routing follows meta, R3)

const lin = (h) => [1, 3, 5].map((i) => Math.pow(parseInt(h.slice(i, i + 2), 16) / 255, 2.2));

export function makeCard({ id, text, nanAt = [], hangAt = Infinity, frames = 30, runtime = 'v2' }) {
  const meta = { id, title: `fixture ${id}`, fps: 30, duration: frames / 30, subframes: 1, shutter: 0.4, runtime, score: null };
  const ART = 256;
  let textTex = null, hw = 0, hh = 0;

  function artCanvas() {
    const c = document.createElement('canvas');
    c.width = ART; c.height = ART;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(ART * 0.45, ART * 0.42, 8, ART / 2, ART / 2, ART * 0.48);
    gr.addColorStop(0, '#fff6fb'); gr.addColorStop(0.7, '#f2c9e6'); gr.addColorStop(1, 'rgba(230,170,215,0)');
    g.fillStyle = gr;
    g.beginPath(); g.ellipse(ART / 2, ART * 0.55, ART * 0.46, ART * 0.42, 0, 0, Math.PI * 2); g.fill();
    return c;
  }

  function cardCanvas(words) {
    const size = 50, S = 2;
    const m = document.createElement('canvas').getContext('2d');
    m.font = `500 ${size}px "Fredoka"`;
    hw = m.measureText(words).width / 2 + 38; hh = size / 2 + 26;
    const c = document.createElement('canvas');
    c.width = Math.ceil(hw * 2 * S); c.height = Math.ceil(hh * 2 * S);
    const g = c.getContext('2d');
    g.scale(S, S);
    g.font = `500 ${size}px "Fredoka"`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#1b1d57';
    g.fillText(words, hw, hh + 1);
    return c;
  }

  // the blob sits on the lake: art px → world px, 1.2 px per art px, base at y 1300
  function buildMesh(mesh, flip, t) {
    const { cols, rows, stride, data } = mesh;
    const s = 1.2, breathe = 1 + 0.04 * Math.sin(t * Math.PI * 2);
    let k = 0;
    for (let j = 0; j <= rows; j++) {
      for (let i = 0; i <= cols; i++) {
        const u = i / cols, v = j / rows;
        const X = (u - 0.5) * ART * s, Y = (1 - v) * ART * s * breathe;
        data[k] = 540 + X; data[k + 1] = flip ? 1300 + Y : 1300 - Y;
        data[k + 2] = u; data[k + 3] = v; data[k + 4] = 1; data[k + 5] = 0;
        k += stride;
      }
    }
    mesh.upload();
  }

  async function setup(stage) {
    const art = artCanvas(), face = document.createElement('canvas');
    face.width = ART; face.height = ART;
    stage.renderer.setMallow({ artImg: art, pristineImg: null, faceCanvas: face, normalImg: null, cols: 16, rows: 16 });
    textTex = stage.renderer.textTexture('b0', cardCanvas(text));
    stage.cue(0, 'scene', { loop: meta.duration });
  }

  const W = { zenith: lin('#05071c'), high: lin('#12164a'), horizon: lin('#4a3f8e'), haze: lin('#8b7fcf'), water: lin('#070823'), far: lin('#2a2768') };

  function state(t) {
    return {
      t,
      cam: { x: 540, y: 960, zoom: 1, roll: 0 },
      buildMesh: (mesh, flip) => buildMesh(mesh, flip, t),
      drawFace: () => false,
      mallow: {
        bodyBox: [ART / 2, ART, ART * 0.46, ART * 0.84], rest: 0,
        light: { dir: [0.45, 0.55, 0.7], key: [1, 1, 1], rim: [0.6, 0.55, 1], rimAmt: 0.3, spec: 0.4, specCol: [0.9, 0.95, 1], glowCol: [1, 0.8, 0.6], glow: 0, ambient: [0.2, 0.18, 0.45], sss: 1 },
      },
      world: {
        zenith: W.zenith, high: W.high, horizon: W.horizon, haze: W.haze,
        moon: [850, 590, 50], moonCol: [1, 0.97, 0.98], moonGlow: 1, haloCol: [0.4, 0.36, 1],
        stars: 1, clouds: 0, hillCol: lin('#141238'), horizonY: 1150,
        waterNear: W.water, waterFar: W.far, fresnel: 1, agitation: 0, reflAmt: 0.62,
        contactY: 1300, contact: [540, 140], shadow: 0.5, ripples: [], skyCam: [540, 1150, 1], loop: meta.duration,
      },
      bubblesBack: [],
      bubblesFront: [{ x: 540, y: 640, hw, hh, scale: 1, squash: [1, 1], rot: 0, radius: Math.min(hh, 64), alpha: 1, textAlpha: 1, glowUp: 0, textTex, tint: [0.92, 0.91, 1], edge: [0.9, 0.92, 1], stress: 0 }],
      particles: [],
      post: { exposure: 1, bloom: 0.14, bloomThresh: 0.85, contrast: 1.04, sat: 1.03, shadowTint: [0.95, 0.97, 1.05], highTint: [1, 1, 1], vignette: 0.38, grain: 0.018, time: t },
      audio: { t: +t.toFixed(4) },
    };
  }

  function subframes(t) {
    return nanAt.includes(Math.round(t * meta.fps)) ? NaN : 1;
  }

  function overlay(ctx, t) {
    if (Math.round(t * meta.fps) >= hangAt) for (;;) { /* a render that never finishes: the worker's watchdog must fire */ }
    return false;
  }

  return { meta, setup, state, subframes, overlay };
}
