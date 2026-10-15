"""Write src/mallows/hires.js, the high-res rig patch table (W7, step 4 of 4).

    python3 tools/hires/build_table.py tools/hires/data tools/hires/data/old-registry.json \
        src/mallows/hires.js [verified ids...]

    python3 tools/hires/build_table.py tools/hires/data tools/hires/data/old-registry.json \
        /tmp/hires-nofit.js --no-fit      (the table the render-fit lab starts from)

Takes measure-<id>.json (measure.py) and optional fit-<id>.json (the lab's
render-fit pass, tools/hires/lab/fit.js) from the data dir, the sprite sizes
from assets/rig-hires (derive.py). The painted colours measure.py samples
(open mouths' inside and tongue, painted brows' ink) replace the registry's;
everything else the art does not define (line colours, mouth style, cheek
colour/base) is kept from the current registry. Writes the table, and (not
with --no-fit) silhouette.json and checks.json into the data dir for
tests/hires.test.mjs. It converts all geometry to
the rig's *logical* space: new-art pixels / res, where res is the old->new
scale (~2.3-2.7). In that space every constant inside rig.js (line widths of
tears, glitch-line heights, thresholds, MallowTouch's padding) keeps the
meaning it had with the original art, so the rig only needs to draw the art
at m.size and divide sprite pixels by res.
"""
import json, sys, os
import numpy as np
import cv2
from PIL import Image

args = [a for a in sys.argv[1:] if not a.startswith('--')]
NO_FIT = '--no-fit' in sys.argv      # the table the render-fit lab starts from
# where assets/ is, relative to the written module (src/mallows/ -> ../../)
ASSET_BASE = next((a.split('=', 1)[1] for a in sys.argv if a.startswith('--asset-base=')), '../../assets/')
WORK, OLD, OUT = args[0], args[1], args[2]
VERIFIED = args[3:]
IDS = ['glitzi', 'zuzu', 'boppo', 'pipzi', 'blubi', 'loomi', 'noomi']
OLD_REG = json.load(open(OLD))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
NEUTRAL = {'glitzi': {'lidTop': 0.55, 'lidSlant': 0.2}, 'boppo': {'mouthOpen': 0.7}}
GLITZI_ROUND_OPEN = {'surprised': 1.4, 'awe': 1.0, 'scared': 0.9}
# Hand decisions after the lab check, applied last (logical px):
#   Glitzi's lid line doubles as its blink line: the painted lid has no hard
#   edge (a fit drives it to a hairline), a blink needs one. 6 sits between.
#   Glitzi's carved frown has no painted open mouth to measure, so the rig's
#   default depth (w * 0.45 = 56) applied; with the redraw's deeper frown
#   (sag 31: the corners sit low) and its shorter body that pushed an excited
#   mouth past the outline. 27 keeps every preset, stage and reaction at full
#   intensity, with the mouth spring's ~7% overshoot, >= 6 px inside the
#   silhouette and a stuck-out tongue's tip >= 3 px (playful + yawn is the
#   tightest; tests/hires.test.mjs checks all of it), and an excited Glitzi
#   still opens a 75 px grin (the current rig: ~93 px on a taller body).
#   An explicit upper lip (-22; the default is w * -0.08 = -10) lets the open
#   mouth grow up into the face instead: an excited grin ~85 px tall, a
#   surprised "o" ~40 px, both well clear of the eyes (>= 25 px).
#   relief: the painted frown is a black groove with a lit blue rim just
#   BELOW it (sampled: rgb ~(18,52,151) against the body's ~(9,18,65),
#   centred ~1 lw under the groove), not the faint ridge above the current
#   rig draws; drawn here so the closed frown keeps its carved look at phone
#   size. [colour, width, offset] in lw units, + = below.
# Loomi (the browless cyan drawing, owner-approved; workstream hires-loomi):
#   it paints no brows, so measure.py kept the OLD drawing's brow strokes
#   relative to the eyes, and those were a second set of lid arcs (U-shaped,
#   ~20 px above the closed eyes). Faded in by an expression (sad, anxious,
#   the concerned stage) they read as a ghost double eyelid. These are brows
#   proper: an arch (control point above the ends) ~30-45 px above the eyes,
#   placed like Noomi's relative to its eyes, mirrored; still alpha 0 at rest.
LOOMI_BROWS = {'L': {'p0': [91.0, 155.0], 'c': [115.0, 145.0], 'p1': [139.0, 152.0]},
               'R': {'p0': [246.0, 151.6], 'c': [270.0, 144.6], 'p1': [294.0, 154.6]}}
TWEAKS = {'loomi': {('brows', s, k): v for s, b in LOOMI_BROWS.items() for k, v in b.items()},
          'glitzi': {('eyes', 'L', 'lw'): 6.0, ('eyes', 'R', 'lw'): 6.0,
                     ('mouth', 'depth'): 27.0, ('mouth', 'upper'): -22.0,
                     ('mouth', 'relief'): [['rgba(34,92,235,0.6)', 0.75, 0.95],
                                           ['rgba(150,190,255,0.16)', 0.5, -0.8]]}}
# Per-preset targets for a re-rigged face (rig-res.patch: resolveExpression
# merges mallow.presetOverrides after PERSONALITY). The redrawn Glitzi rests
# heavier-lidded (neutral lidTop 0.55, the current art 0.40), and every
# preset that sets no lidTop of its own inherits that: surprised, scared and
# awe read bored. These put the lids where those feelings open them.
# Its round mouths: depth 27 (above) keeps a wide grin and a yawn inside the
# shorter body, but halves every "o" (surprised, awe, scared read as a dot).
# A depth that follows mouthRound cannot help: the round yawn (open 1.15)
# binds it at ~29 (containment test). So those three presets open wider
# instead, as far as the containment test allows with its 6 px margin
# (GLITZI_ROUND_OPEN).
PRESET_OVERRIDES = {'glitzi': {
    'surprised': {'lidTop': 0, 'mouthOpen': GLITZI_ROUND_OPEN['surprised']},
    'scared': {'lidTop': 0, 'mouthOpen': GLITZI_ROUND_OPEN['scared']},
    'awe': {'lidTop': 0.05, 'mouthOpen': GLITZI_ROUND_OPEN['awe']},
    'hopeful': {'lidTop': 0.15}, 'curious': {'lidTop': 0.25}, 'anxious': {'lidTop': 0.25},
    'confused': {'lidTop': 0.35}, 'playful': {'lidTop': 0.35}, 'comforted': {'lidTop': 0.4},
}}


def r1(v):
    return round(float(v), 1)


DERIVE = json.load(open(f'{WORK}/derive-report.json')) if os.path.exists(f'{WORK}/derive-report.json') else {}
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
        if 'ink_paint' in b_new:
            # a painted brow: its own ink (the registry's line colour is a
            # shade lighter than Pipzi's painted brows)
            b['ink'] = b_new['ink_paint']
        cx, cy, cr = f['cheeks'][s]
        face['cheeks'][s] = [L(cx), L(cy), L(cr)]
    M_new, M = f['mouth'], face['mouth']
    for k in ('x', 'y', 'w', 'sag', 'lw', 'upper', 'depth'):
        if k in M_new and M_new[k] is not None:
            M[k] = L(M_new[k])
    if 'mouthPaint' in meas:
        # open mouths: interior and tongue colours of the new art, not the
        # old registry's (the redraws are lighter and pinker inside)
        M['inside'] = meas['mouthPaint']['inside']
        M['tongue'] = meas['mouthPaint']['tongue']
    # optional render-fit pass (lab: the drawn neutral face vs the approved
    # art on the real rig renderer), already in logical px
    fit_path = f'{WORK}/fit-{name}.json'
    if os.path.exists(fit_path) and not NO_FIT:
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
    # painted brows: never thinner than they are painted (the fit's
    # luminance loss is happy with a thinner, darker core; side by side the
    # drawn brow then reads thin). 0.95: the tube's soft shadow adds width.
    for s in 'LR':
        b_new, b = f['brow' + s], face['brows'][s]
        if 'lw_paint' in b_new and b.get('alpha', 0) > 0:
            b['lw'] = max(b['lw'], r1(b_new['lw_paint'] * 0.95 / res))
    # irises derive.py re-cut along the painted outline (Boppo: no sclera
    # crescent): placed from that circle, relative to the final eye (after
    # the fit), so the sprite sits where its pixels were painted
    for s, c in DERIVE.get(name, {}).get('iris', {}).items():
        e = face['eyes'][s]
        key = e['iris'].split(':', 1)[1]
        irR = sprite_size(key) / 2 - 2
        lx, ly = neutral.get('lookX', 0), neutral.get('lookY', 0)
        ir_l = irR / res
        e['irisR'] = r1(ir_l)
        e['irisOff'] = [r1(c['cx'] / res - e['x'] - lx * (e['rx'] - ir_l) * 0.85),
                        r1(c['cy'] / res - e['y'] - ly * (e['ry'] - ir_l) * 0.8)]
    for path, v in TWEAKS.get(name, {}).items():
        o = face
        for k in path[:-1]:
            o = o[k]
        o[path[-1]] = v
    W, H = meas['size']
    entry = {
        'res': round(res, 4),
        'file': f'mallows-hires/{name}-thumb.webp', 'art': f'mallows-hires/{name}.webp',
        'body': f'rig-hires/{name}-body.webp',
        'size': [r1(W / res), r1(H / res)],
        'bodyBox': [L(v) for v in meas['bodyBox']],
        'face': face, 'sprites': sprites,
    }
    if name == 'glitzi':
        entry['glitchRows'] = [L(v) for v in meas['glitchRows']]
    if name in PRESET_OVERRIDES:
        entry['presetOverrides'] = PRESET_OVERRIDES[name]
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

# The silhouette of every cut-out, for tests/hires.test.mjs (face parts must
# stay inside the body): per 2 logical px column, the body's top and bottom
# (alpha >= 50%) in logical px.
ART = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'assets', 'mallows-hires')
sil = {}
for name in IDS:
    a = np.array(Image.open(f'{ART}/{name}.webp').convert('RGBA'))[..., 3]
    res = table[name]['res']
    top, bot = [], []
    for i in range(0, int(np.ceil(a.shape[1] / res)), 2):
        x = min(a.shape[1] - 1, int(round((i + 1) * res)))
        col = np.nonzero(a[:, x] >= 128)[0]
        top.append(r1(col.min() / res) if len(col) else None)
        bot.append(r1(col.max() / res) if len(col) else None)
    sil[name] = {'step': 2, 'top': top, 'bottom': bot}


def spiral_check(key):
    """A rotating sprite must not carry body pixels (they would orbit inside
    the eye), and its dark rim must read all the way round: per 5 degree
    sector, the outer 6 px hold a dark rim pixel."""
    a = np.array(Image.open(f'{RIG_HIRES}/{key}.webp').convert('RGBA')).astype(np.float64)
    S = a.shape[0] / 2
    yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]] + 0.5
    d, th = np.hypot(xx - S, yy - S), np.arctan2(yy - S, xx - S)
    al, rgb = a[..., 3], a[..., :3]
    L = rgb @ [0.299, 0.587, 0.114]
    Rc = d[al > 128].max()
    body = (al > 128) & (d > Rc - 12) & (rgb[..., 0] > 150) & (rgb[..., 0] > rgb[..., 2] + 10)
    ring = (d > Rc - 6) & (al > 128)
    sec = ((th + np.pi) / (2 * np.pi) * 72).astype(int) % 72
    dark = [L[ring & (sec == k)].min() < 70 for k in range(72)]
    return {'bodyPx': int(body.sum()), 'rimDark': round(float(np.mean(dark)), 3), 'size': a.shape[0]}


def iris_check(key):
    """An iris sprite must not carry sclera: no pale (light, unsaturated)
    pixel past rc = w/2 - 2 (the radius the rig draws at irisR), and no pale
    crescent along its rim (per 30 degree sector of the outer 6 px; a thin
    even gloss line is fine, Boppo's old cut held a 14 px crescent: 312)."""
    a = np.array(Image.open(f'{RIG_HIRES}/{key}.webp').convert('RGBA'))
    h, w = a.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w] + 0.5
    d, th = np.hypot(xx - w / 2, yy - h / 2), np.degrees(np.arctan2(yy - h / 2, xx - w / 2)) % 360
    hsv = cv2.cvtColor(np.ascontiguousarray(a[..., :3]), cv2.COLOR_RGB2HSV).astype(np.float64)
    pale = (hsv[..., 2] > 150) & (hsv[..., 1] < 110) & (a[..., 3] > 64)
    rc = w / 2 - 2
    band = pale & (d > rc - 6)
    sectors = np.histogram(th[band], bins=12, range=(0, 360))[0]
    return {'paleOutside': int((pale & (d > rc)).sum()), 'paleRimSector': int(sectors.max()), 'size': w}


checks = {'sprites': {f'zuzu-spiral-{s}': spiral_check(f'zuzu-spiral-{s}') for s in 'LR'}}
for k, c in checks['sprites'].items():
    if c['bodyPx'] or c['rimDark'] < 0.95:
        sys.exit(f'{k}: body pixels in the sprite or a broken rim: {c} (re-run derive.py)')
checks['irises'] = {k: iris_check(k) for k in ['glitzi-iris-L', 'glitzi-iris-R', 'boppo-iris-L', 'boppo-iris-R',
                                                  'pipzi-iris-L', 'pipzi-iris-R', 'iris-navy']}
for k, c in checks['irises'].items():
    if c['paleOutside'] > 10 or c['paleRimSector'] > 100:
        sys.exit(f'{k}: sclera in the iris sprite: {c} (re-run derive.py)')
if not NO_FIT:
    json.dump(sil, open(f'{WORK}/silhouette.json', 'w'), separators=(',', ':'))
    json.dump(checks, open(f'{WORK}/checks.json', 'w'), indent=1)
head = '''// High-res Mallow rigs: a patch table over registry.js (workstream W7).
//
// GENERATED by tools/hires/build_table.py from the owner's 1254 px art in
// assets/source/hires (prepare.py -> measure.py -> derive.py). Re-run the
// tools instead of editing numbers here.
//
// Each entry replaces a Mallow's pictures, body, sprites, size, bodyBox and
// face spec:
//   art    the 1024 px approved cut-out, for the rig only (loaded as
//          `m.art || m.file`),
//   file   the same cut-out at 384 px, for every other picture of a Mallow
//          (side-panel switcher, mallows scene, studio tiles, ritual cards):
//          those keep reading `m.file` and get the new drawing at the
//          current art's decode cost (~4 MB for seven, not ~28 MB).
// Geometry is in the rig's LOGICAL space: new-art pixels / res (res ~2.3-2.7
// art px per logical px), so every constant inside rig.js keeps the scale it
// had with the original art.
//
// THE RIG MUST SUPPORT `res` FIRST: tools/hires/rig-res.patch (git apply;
// additive, no change for the current art). It touches
//   rig.js       art and body drawn at m.size; spiral sprites / res (draw and
//                dirty rect); m.glitchRows; skin q up to 1.25 * res; the
//                crease mouth's relief (m.face.mouth.relief);
//   touch/mallow-touch.js  _atSkin draws the approved art and Glitzi's bare
//                body at m.size (tier A cross-fades them in at rest: without
//                it a switched Mallow shows a 2.6x crop of its art at rest);
//   registry.js  the rig loads m.art || m.file;
//   expressions.js  resolveExpression merges m.presetOverrides (Glitzi's
//                lids and round mouths).
// Without it the art draws 2.6x too big. tests/hires.test.mjs checks the
// patch still fits today's files and that the patched code never draws an
// art asset at its natural size; node hushmallow/tools/hires/refresh-patch.mjs
// rewrites it against the current files.
//
// Decision D13: a Mallow switches to its high-res rig only after a visual
// check. HIRES_VERIFIED lists the ones that passed; applyHires() applies those
// (or the ids you pass) to the registry objects, once, before rigs load.
// The cyan file without brows is Loomi (owner-approved, workstream
// hires-loomi): no brows at rest, as drawn; arched brows (build_table.py
// LOOMI_BROWS) appear only when an expression raises browAlpha, as on Noomi.
// Sweeps: hushmallow/docs/workstreams/hires-loomi.md.
//
// Integration (after the patch is merged): in registry.js, once, at the end:
//   import { applyHires } from './hires.js';  applyHires(MALLOWS, SPRITES);
// ship assets/mallows-hires + assets/rig-hires in tools/build-site.sh, and
// let MallowTouch use skinSize ~1024 for a high-res Mallow (its 640 default
// downsamples the 1024 px art and gives up most of the gain on 3x phones).
// Pipeline, labs and checks: tools/hires/README.md.

const A = (p) => new URL(`ASSET_BASE${p}`, import.meta.url).href;
'''.replace('ASSET_BASE', ASSET_BASE)
out = [head]
out.append('const T = ' + js(table) + ';\n')
out.append('''
for (const e of Object.values(T)) {
  e.file = A(e.file);
  e.art = A(e.art);
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
  // JSON, not structuredClone: this runs at registry import time, and
  // structuredClone throws on Safari < 15.4 (the specs are plain JSON)
  const copy = (v) => JSON.parse(JSON.stringify(v));
  return { ...base, file: h.file, art: h.art, body: h.body, size: h.size.slice(), bodyBox: h.bodyBox.slice(), res: h.res,
    ...(h.glitchRows ? { glitchRows: h.glitchRows.slice() } : {}),
    ...(h.presetOverrides ? { presetOverrides: copy(h.presetOverrides) } : {}),
    face: copy(h.face), hires: true };
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
