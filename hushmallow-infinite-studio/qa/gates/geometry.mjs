// Per-frame geometry of a direction, for the pixel gates (qa/gates/pixels.py).
//
// The composer's scene (composer/scene.js) is the one evaluator of a
// direction: it gives the soft body's DOFs, the camera, the props and the
// envelopes at any time. From it this module computes, for every frame time
// i / fps, everything a pixel gate needs to know *where* to look:
//
//   body      the Mallow's silhouette contour on screen (the pristine art's
//             alpha outline pushed through the same soft-body mesh the
//             renderer builds, then the camera)
//   samples   art points on the skin (outside the face) and on the face,
//             with their screen positions: the pixel at a sample's screen
//             position shows that art point (relit, graded), which is how the
//             fidelity gate compares the render with the pristine painting
//   faceBox   the face's screen bounding box
//   text      overlay text lines (TextBlock rows, the LogoCard) and the text
//             on glass cards, with alpha and polarity (light or dark ink)
//   glass     glass card boxes (they cover the Mallow by design)
//   rest      the painted-rest envelope; motion: shutter displacement (px)
//   mood      the world dials (tension, warmth) that pick the realm's look
//
// Screen = (world - camera focus) * zoom + frame centre (engine/renderer
// glsl-v2.js); overlay text is in screen space already. All values are in
// design px (1080 x 1920); pixels.py scales them to the video.

import fs from 'node:fs';
import { decodePNG } from '../../render/lib/png.mjs';
import { studioPath } from '../../render/lib/paths.mjs';
import { createScene } from '../../composer/scene.js';
import { textLine, logoAlpha, TEXTBLOCK_DEFAULTS, TEXT_STYLES } from '../../composer/layout.js';

export const GEOMETRY_SCHEMA = 'hm-qa-geometry/1';
const r1 = (v) => Math.round(v * 10) / 10;
const r3 = (v) => Math.round(v * 1000) / 1000;

/** Alpha of an RGBA art image as a lookup. */
function alphaOf(img) {
  const { width: w, height: h, data } = img;
  return { w, h, at: (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : data[(Math.round(y) * w + Math.round(x)) * 4 + 3]) };
}

/** The face's bounding box in art px: brows, eyes, mouth and cheeks, padded by the glow reach. */
export function faceBoxArt(spec) {
  const xs = [], ys = [];
  const add = (x, y) => { xs.push(x); ys.push(y); };
  for (const b of Object.values(spec.brows || {})) for (const p of [b.p0, b.c, b.p1]) add(p[0], p[1] - (b.lw || 0));
  for (const e of Object.values(spec.eyes || {})) { add(e.x - e.hw - (e.lw || 0), e.y - e.r); add(e.x + e.hw + (e.lw || 0), e.y + e.r); }
  const m = spec.mouth;
  if (m) { add(m.x - m.w / 2 - m.lw, m.y - m.lw); add(m.x + m.w / 2 + m.lw, m.y + (m.sag || 0) + m.lw); }
  for (const c of Object.values(spec.cheeks || {})) if (Array.isArray(c)) { add(c[0] - c[2], c[1] - c[2]); add(c[0] + c[2], c[1] + c[2]); }
  const pad = spec.colors?.glow?.reach ?? 40;
  return [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) + pad, Math.max(...ys) + pad];
}

/**
 * Art-space points: the alpha contour (a closed polygon), skin samples (well
 * inside the silhouette, outside the face box) and face samples.
 */
export function artPoints(img, faceBox, { contourStep = 12, skinStep = 34, faceStep = 30, inset = 26 } = {}) {
  const A = alphaOf(img);
  const left = [], right = [];
  for (let y = 0; y < A.h; y += contourStep) {
    let x0 = -1, x1 = -1;
    for (let x = 0; x < A.w; x++) if (A.at(x, y) > 128) { if (x0 < 0) x0 = x; x1 = x; }
    if (x0 >= 0 && x1 - x0 > 4) { left.push([x0, y]); right.push([x1, y]); }
  }
  const contour = [...left, ...right.reverse()];
  const solid = (x, y) => {
    for (const [dx, dy] of [[0, 0], [inset, 0], [-inset, 0], [0, inset], [0, -inset], [inset, inset], [-inset, inset], [inset, -inset], [-inset, -inset]]) {
      if (A.at(x + dx, y + dy) < 250) return false;
    }
    return true;
  };
  const [fx0, fy0, fx1, fy1] = faceBox;
  const inFace = (x, y) => x >= fx0 && x <= fx1 && y >= fy0 && y <= fy1;
  const skin = [], face = [];
  for (let y = skinStep / 2; y < A.h; y += skinStep) for (let x = skinStep / 2; x < A.w; x += skinStep) if (solid(x, y) && !inFace(x, y)) skin.push([x, y]);
  for (let y = fy0; y <= fy1; y += faceStep) for (let x = fx0; x <= fx1; x += faceStep) if (A.at(x, y) >= 250) face.push([Math.round(x), Math.round(y)]);
  return { contour, skin, face };
}

/** A stub mesh for SoftBody.build: positions only, read back in Node. */
function stubMesh(cols, rows) {
  const stride = 6;
  return { cols, rows, stride, nVerts: (cols + 1) * (rows + 1), data: new Float32Array((cols + 1) * (rows + 1) * stride), upload() {} };
}

/** World position of art point (x, y) on the built mesh (bilinear in its grid cell). */
function meshAt(mesh, artW, artH, x, y) {
  const { cols, rows, stride, data } = mesh;
  const u = Math.max(0, Math.min(cols - 1e-6, (x / artW) * cols)), v = Math.max(0, Math.min(rows - 1e-6, (y / artH) * rows));
  const i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j;
  const o = (jj, ii) => (jj * (cols + 1) + ii) * stride;
  const p00 = o(j, i), p10 = o(j, i + 1), p01 = o(j + 1, i), p11 = o(j + 1, i + 1);
  const lx = (a, b, f) => a + (b - a) * f;
  return [
    lx(lx(data[p00], data[p10], fu), lx(data[p01], data[p11], fu), fv),
    lx(lx(data[p00 + 1], data[p10 + 1], fu), lx(data[p01 + 1], data[p11 + 1], fu), fv),
  ];
}

/** Overlay text boxes (screen px) of the direction's text items at t. */
export function overlayText(items, t) {
  const out = [];
  for (const it of items || []) {
    if (it.drawFrom !== undefined && t < it.drawFrom) continue;
    if (it.kind === 'textblock') {
      const o = { ...TEXTBLOCK_DEFAULTS, ...it.opts };
      o.lines.forEach((line, i) => {
        const { a, y } = textLine(o, t, i);
        if (a <= 0) return;
        const w = it.widths?.[i] ?? line.length * o.size * 0.55;
        out.push({ id: `${it.id}:${i}`, kind: 'overlay', box: [r1(o.x - w / 2), r1(y - o.size * 0.8), r1(o.x + w / 2), r1(y + o.size * 0.25)], alpha: r3(a), polarity: 'light' });
      });
    } else if (it.kind === 'logocard') {
      const a = logoAlpha(it.opts, t);
      const o = { ...TEXT_STYLES.logo, ...it.opts };
      if (a.plate > 0) out.push({ id: `${it.id}:plate`, kind: 'logo', box: [r1(540 - o.logoW / 2 - 38), r1(o.y - 70), r1(540 + o.logoW / 2 + 38), r1(o.y + 70)], alpha: r3(a.plate), polarity: 'dark' });
    }
  }
  return out;
}

/**
 * Geometry for every frame of a direction.
 * → { schema, fps, frames, duration, design, art, faceBoxArt, samples, frames: [...], probes, rest windows, turn }
 */
export function directionGeometry(direction, { frames, fps } = {}) {
  const meta = direction.meta;
  fps = fps || meta.fps;
  frames = frames || Math.round(meta.duration * fps);
  const scene = createScene(direction);
  const m = direction.mallow;
  const artFile = studioPath(m.assets.pristine);
  const img = decodePNG(fs.readFileSync(artFile));
  const [artW, artH] = m.artSize;
  if (img.width !== artW || img.height !== artH) throw new Error(`${m.assets.pristine} is ${img.width}x${img.height}, the direction says ${artW}x${artH}`);
  const fbArt = faceBoxArt(m.faceSpec);
  const pts = artPoints(img, fbArt);
  const mesh = stubMesh(m.body.cols, m.body.rows);
  const W = meta.width || 1080, H = meta.height || 1920;
  const restCh = scene.channel('env.rest');
  const tension = scene.channel('world.tension'), warmth = scene.channel('world.warmth');

  const per = [];
  for (let i = 0; i < frames; i++) {
    const t = i / fps;
    const S = scene.state(t);
    const cam = S.cam;
    const toScreen = ([x, y]) => [(x - cam.x) * cam.zoom + W / 2, (y - cam.y) * cam.zoom + H / 2];
    scene.body.build(mesh, t, scene.dofAt, scene.xf, false);
    const proj = (list) => {
      const flat = new Array(list.length * 2);
      list.forEach(([x, y], k) => { const s = toScreen(meshAt(mesh, artW, artH, x, y)); flat[2 * k] = r1(s[0]); flat[2 * k + 1] = r1(s[1]); });
      return flat;
    };
    const fbc = proj([[fbArt[0], fbArt[1]], [fbArt[2], fbArt[1]], [fbArt[0], fbArt[3]], [fbArt[2], fbArt[3]]]);
    const faceBox = [Math.min(fbc[0], fbc[2], fbc[4], fbc[6]), Math.min(fbc[1], fbc[3], fbc[5], fbc[7]), Math.max(fbc[0], fbc[2], fbc[4], fbc[6]), Math.max(fbc[1], fbc[3], fbc[5], fbc[7])];
    const glass = [], text = overlayText(direction.text, t);
    for (const b of [...S.bubblesBack, ...S.bubblesFront]) {
      const sx = b.hw * b.scale * (b.squash?.[0] ?? 1) * cam.zoom, sy = b.hh * b.scale * (b.squash?.[1] ?? 1) * cam.zoom;
      const [cx, cy] = toScreen([b.x, b.y]);
      glass.push([r1(cx - sx), r1(cy - sy), r1(cx + sx), r1(cy + sy), r3(b.alpha)]);
      const ta = b.alpha * (b.textAlpha ?? 1);
      if (ta > 0.003) {
        const pad = TEXT_STYLES.bubble;
        text.push({ id: `glass:${glass.length - 1}`, kind: 'glass', box: [r1(cx - sx + pad.padX * b.scale * cam.zoom), r1(cy - sy + pad.padY * b.scale * cam.zoom), r1(cx + sx - pad.padX * b.scale * cam.zoom), r1(cy + sy - pad.padY * b.scale * cam.zoom)], alpha: r3(ta), polarity: 'dark' });
      }
    }
    per.push({
      t: r3(t), cam: [r1(cam.x), r1(cam.y), r3(cam.zoom)], scale: r3(scene.xf.s * cam.zoom),
      rest: r3(Math.max(0, Math.min(1, restCh(t)))), motion: r1(scene.motion(t).d),
      mood: [r3(tension(t)), r3(warmth(t))],
      contour: proj(pts.contour), skin: proj(pts.skin), face: proj(pts.face), faceBox, glass, text,
    });
  }
  const anchors = direction.anchors || {};
  return {
    schema: GEOMETRY_SCHEMA,
    fps, frames: per.length, duration: meta.duration, design: [W, H],
    art: { file: m.assets.pristine, size: [artW, artH] },
    faceBoxArt: fbArt.map(r1),
    samples: { skin: pts.skin, face: pts.face, contour: pts.contour },
    perFrame: per,
    probes: direction.probes || [],
    turn: anchors.TURN !== undefined && anchors.RITUAL0 !== undefined ? [anchors.TURN, anchors.RITUAL0] : null,
    logo: (direction.text || []).filter((x) => x.kind === 'logocard').map((x) => ({ id: x.id, opts: x.opts })),
  };
}
