"""Write src/mallows/hires.js, the high-res rig patch table (W7, step 4 of 4).

    python3 tools/hires/build_table.py tools/hires/data tools/hires/data/old-registry.json \
        src/mallows/hires.js [verified ids...]

Takes measure-<id>.json (measure.py) and optional fit-<id>.json (the lab's
render-fit pass) from the data dir, the sprite sizes from assets/rig-hires
(derive.py), keeps
everything the art does not define (ink colours, mouth style, tongue colour,
cheek colour/base) from the current registry, and converts all geometry to
the rig's *logical* space: new-art pixels / res, where res is the old->new
scale (~2.3-2.7). In that space every constant inside rig.js (line widths of
tears, glitch-line heights, thresholds, MallowTouch's padding) keeps the
meaning it had with the original art, so the rig only needs to draw the art
at m.size and divide sprite pixels by res.
"""
import json, sys, os
import numpy as np
from PIL import Image

WORK, OLD, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
VERIFIED = sys.argv[4:]
IDS = ['glitzi', 'zuzu', 'boppo', 'pipzi', 'blubi', 'loomi', 'noomi']
OLD_REG = json.load(open(OLD))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
NEUTRAL = {'glitzi': {'lidTop': 0.55, 'lidSlant': 0.2}, 'boppo': {'mouthOpen': 0.7}}
# Hand decisions after the lab check, applied last (logical px):
#   Glitzi's lid line doubles as its blink line: the painted lid has no hard
#   edge (a fit drives it to a hairline), a blink needs one. 6 sits between.
TWEAKS = {'glitzi': {('eyes', 'L', 'lw'): 6.0, ('eyes', 'R', 'lw'): 6.0}}


def r1(v):
    return round(float(v), 1)


RIG_HIRES = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'assets', 'rig-hires')


def sprite_size(key):
    return Image.open(f'{RIG_HIRES}/{key}.webp').size[0]


def build(name):
    meas = json.load(open(f'{WORK}/measure-{name}.json'))
    old = OLD_REG[name]
    f = meas['feats']
    res = meas['unit']
    L = lambda v: r1(v / res)
    P = lambda p: [L(p[0]), L(p[1])]
    face = json.loads(json.dumps(old['face']))
    neutral = dict(face['neutral'], **NEUTRAL.get(name, {}))
    face['neutral'] = neutral
    style = face['eyeStyle']
    sprites = {}
    for s in 'LR':
        e_new, e = f['eye' + s], face['eyes'][s]
        for k in ('x', 'y', 'rx', 'ry', 'hw', 'sag', 'lw'):
            e[k] = L(e_new[k])
        if 'tilt' in e_new:
            e['tilt'] = L(e_new['tilt'])
        if style == 'spiral':
            key = f'zuzu-spiral-{s}'
            e['sprite'] = 'hires:' + key
            e['spriteR'] = L(sprite_size(key) / 2)
            sprites['hires:' + key] = f'rig-hires/{key}.webp'
        elif style == 'closed':
            e['iris'] = 'hires:iris-navy'
            e['irisR'] = L(e_new['irisR'])
            e['irisOff'] = P(e_new['irisOff'])
            sprites['hires:iris-navy'] = 'rig-hires/iris-navy.webp'
        else:
            key = f'{name}-iris-{s}'
            ir = f['iris' + s]
            # the sprite's radius (width/2 - 2) is drawn at irisR: keep 1:1
            irR = (sprite_size(key) / 2 - 2)
            lx, ly = neutral.get('lookX', 0), neutral.get('lookY', 0)
            off = [ir['cx'] - e_new['x'] - lx * (e_new['rx'] - irR) * 0.85,
                   ir['cy'] - e_new['y'] - ly * (e_new['ry'] - irR) * 0.8]
            e['iris'] = 'hires:' + key
            e['irisR'] = L(irR)
            e['irisOff'] = P(off)
            sprites['hires:' + key] = f'rig-hires/{key}.webp'
        b_new, b = f['brow' + s], face['brows'][s]
        b['p0'], b['c'], b['p1'] = P(b_new['p0']), P(b_new['c']), P(b_new['p1'])
        b['lw'] = L(b_new['lw'])
        b['alpha'] = b_new['alpha']
        cx, cy, cr = f['cheeks'][s]
        face['cheeks'][s] = [L(cx), L(cy), L(cr)]
    M_new, M = f['mouth'], face['mouth']
    for k in ('x', 'y', 'w', 'sag', 'lw', 'upper', 'depth'):
        if k in M_new and M_new[k] is not None:
            M[k] = L(M_new[k])
    # optional render-fit pass (lab: the drawn neutral face vs the approved
    # art on the real rig renderer), already in logical px
    fit_path = f'{WORK}/fit-{name}.json'
    if os.path.exists(fit_path):
        fitj = json.load(open(fit_path))
        rep = fitj.get('report', {})
        fit = fitj['face']
        # only the numbers the fit actually tuned (its report), never the rest
        # of the face snapshot it was run on
        def take(dst, src, keys):
            for k in keys:
                base = k.split('.')[0]
                if base in src and base in dst:
                    v = src[base]
                    dst[base] = [r1(x) for x in v] if isinstance(v, list) else r1(v)
        for s in 'LR':
            if 'eye' + s in rep:
                take(face['eyes'][s], fit['eyes'][s], rep['eye' + s]['values'])
            if 'brow' + s in rep and face['brows'][s].get('alpha', 0) > 0:
                take(face['brows'][s], fit['brows'][s], rep['brow' + s]['values'])
        # open mouths keep their painted landmarks (measure.py); the pixel fit
        # only tunes line / crease mouths
        if 'mouth' in rep and face['mouth']['style'] != 'open':
            take(face['mouth'], fit['mouth'], rep['mouth']['values'])
    for path, v in TWEAKS.get(name, {}).items():
        o = face
        for k in path[:-1]:
            o = o[k]
        o[path[-1]] = v
    W, H = meas['size']
    entry = {
        'res': round(res, 4),
        'file': f'mallows-hires/{name}.webp', 'body': f'rig-hires/{name}-body.webp',
        'size': [r1(W / res), r1(H / res)],
        'bodyBox': [L(v) for v in meas['bodyBox']],
        'face': face, 'sprites': sprites,
    }
    if name == 'glitzi':
        entry['glitchRows'] = [L(v) for v in meas['glitchRows']]
    return entry


def js(v, ind=0):
    pad = '  ' * ind
    if isinstance(v, dict):
        items = []
        for k, x in v.items():
            key = k if k.isidentifier() else json.dumps(k)
            items.append(f'{pad}  {key}: {js(x, ind + 1)}')
        return '{\n' + ',\n'.join(items) + f',\n{pad}}}'
    if isinstance(v, list):
        return '[' + ', '.join(js(x, ind) for x in v) + ']'
    if isinstance(v, str):
        return json.dumps(v)
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return json.dumps(v)


table = {name: build(name) for name in IDS}
head = '''// High-res Mallow rigs: a patch table over registry.js (workstream W7).
//
// GENERATED by tools/hires/build_table.py from the owner's 1254 px art in
// assets/source/hires (prepare.py -> measure.py -> derive.py). Re-run the
// tools instead of editing numbers here.
//
// Each entry replaces a Mallow's art, body, sprites, size, bodyBox and face
// spec. Geometry is in the rig's LOGICAL space: new-art pixels / res
// (res ~2.3-2.7 art px per logical px), so every constant inside rig.js keeps
// the scale it had with the original art. The rig must support `res`:
//   * draw A.body and A.original at m.size (not their natural size),
//   * draw sprite pixels / res (Zuzu's spirals),
//   * read m.glitchRows (Glitzi) instead of GLITCH_ROWS,
//   * allow skin q up to 1.25 * res.
// (see W7's report for the exact patch). Without it the art draws 2.6x too big.
//
// Decision D13: a Mallow switches to its high-res rig only after a visual
// check. HIRES_VERIFIED lists the ones that passed; applyHires() applies those
// (or the ids you pass) to the registry objects, once, before rigs load.
// The cyan file without brows is treated as Loomi (owner to confirm): its
// high-res rig has no brows at rest (they appear only when an expression
// raises browAlpha), so Loomi stays off HIRES_VERIFIED until the owner says.
//
// Integration (after rig.js supports res): in registry.js, once, at the end:
//   import { applyHires } from './hires.js';  applyHires(MALLOWS, SPRITES);
// and ship assets/mallows-hires + assets/rig-hires in tools/build-site.sh.

const A =(p) => new URL(`../../assets/${p}`, import.meta.url).href;
'''
out = [head]
out.append('const T = ' + js(table) + ';\n')
out.append('''
for (const e of Object.values(T)) {
  e.file = A(e.file);
  e.body = A(e.body);
  for (const k of Object.keys(e.sprites)) e.sprites[k] = A(e.sprites[k]);
}

export const HIRES = T;

/** Mallows whose high-res rig passed the studio check (D13). */
export const HIRES_VERIFIED = ''' + json.dumps(VERIFIED) + ''';

/** The registry entry for `id` with its high-res rig, as a new object. */
export function hiresMallow(base, id = base?.id) {
  const h = T[id];
  if (!base || !h) return base || null;
  return { ...base, file: h.file, body: h.body, size: h.size.slice(), bodyBox: h.bodyBox.slice(), res: h.res,
    ...(h.glitchRows ? { glitchRows: h.glitchRows.slice() } : {}), face: structuredClone(h.face), hires: true };
}

/** Switch `ids` (default: HIRES_VERIFIED) to their high-res rigs in place:
 *  mallows = registry MALLOWS, sprites = registry SPRITES. Idempotent.
 *  Call before any rig loads that Mallow. Returns the ids switched. */
export function applyHires(mallows, sprites, ids = HIRES_VERIFIED) {
  const done = [];
  for (const id of ids) {
    const h = T[id];
    if (!h || !mallows[id]) continue;
    Object.assign(sprites, h.sprites);
    if (!mallows[id].hires) Object.assign(mallows[id], hiresMallow(mallows[id], id));
    done.push(id);
  }
  return done;
}
''')
open(OUT, 'w').write(''.join(out))
print('wrote', OUT, 'verified:', VERIFIED)
