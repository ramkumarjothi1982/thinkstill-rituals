"""Python replica of the rig's face geometry (src/mallows/rig.js eyeGeom,
drawBrow, drawMouth), used by the high-res re-rig tools to draw overlays and
to fit rig parameters against the artwork. Keep in step with rig.js."""
import numpy as np

PARAM_DEFAULTS = dict(eyeOpen=1, closedCurve=0.6, lidTop=0, lidBot=0, lidSlant=0, wink=0, lookX=0, lookY=0,
                      irisScale=1, eyeScale=1, browAlpha=0, browY=0, browTilt=0, browCurve=0, browAsym=0,
                      mouthSmile=0.5, mouthOpen=0, mouthWidth=1, mouthRound=0, mouthWave=0, mouthSkew=0,
                      mouthPout=0, blink=0)


def lerp(a, b, t):
    return a + (b - a) * t


def clamp(v, a, b):
    return max(a, min(b, v))


def params(neutral):
    P = dict(PARAM_DEFAULTS)
    P.update(neutral or {})
    return P


def bez3(p0, c0, c1, p1, n=48):
    t = np.linspace(0, 1, n)[:, None]
    p0, c0, c1, p1 = map(np.asarray, (p0, c0, c1, p1))
    return (1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * c0 + 3 * (1 - t) * t * t * c1 + t ** 3 * p1


def bez2(p0, c, p1, n=48):
    t = np.linspace(0, 1, n)[:, None]
    p0, c, p1 = map(np.asarray, (p0, c, p1))
    return (1 - t) ** 2 * p0 + 2 * (1 - t) * t * c + t * t * p1


def eye_geom(spec, side, P, style):
    inner = 1 if side == 'L' else -1
    es = P['eyeScale']
    rx, ry = spec['rx'] * es, spec['ry'] * es
    ex = spec['x']
    ey = spec['y'] + spec['sag'] * 0.42 if style == 'closed' else spec['y']
    wink = clamp(P['wink'], 0, 1) if side == 'R' else 0
    o = clamp(P['eyeOpen'] * (1 - wink) * (1 - P['blink']), 0, 1.45)
    oc = min(1, o)
    curve = lerp(P['closedCurve'], -1, wink)
    yC = spec['y'] if style == 'closed' else ey + ry * 0.12
    sagC = spec['sag'] * curve
    tilt = spec.get('tilt', 0) * (1 - oc)
    hw = lerp(spec['hw'] * (1 if style == 'closed' else min(1.1, es)), rx * 1.3, oc)
    # proposed additive rig fields (default 0 = today's rig): per-eye lid slant
    # and a lid bias that makes heavier lids without changing lidTop semantics
    lslant = P['lidSlant'] + spec.get('lidSlant', 0)
    lidT = P['lidTop'] + spec.get('lidBias', 0) * (1 - P['lidTop'])
    slant = lslant * ry * 0.3 * oc
    xin, xout = ex + inner * hw, ex - inner * hw
    yCorner = lerp(yC, ey, oc)
    yin, yout = yCorner + tilt + slant, yCorner - tilt - slant * 0.6
    oTop = clamp(o * (1 - lidT), 0, 1.45)
    oBot = clamp(o * (1 - P['lidBot']), 0, 1.45)
    qUp = lerp(yC + 2 * sagC, ey - ry * 2.35, oTop)
    qLo = lerp(yC + 2 * sagC, ey + ry * 2.35, oBot)

    def c(x0, y0, x1, y1, qy, sl):
        qx = (x0 + x1) / 2
        return [x0 + (qx - x0) * 2 / 3, y0 + (qy - y0) * 2 / 3 + sl * (1 if x0 == xin else -0.5),
                x1 + (qx - x1) * 2 / 3, y1 + (qy - y1) * 2 / 3 + sl * (1 if x1 == xin else -0.5)]
    up = c(xout, yout, xin, yin, qUp, lslant * ry * 0.55 * oc)
    lo = c(xin, yin, xout, yout, qLo, 0)
    upper = bez3((xout, yout), up[:2], up[2:], (xin, yin))
    lower = bez3((xin, yin), lo[:2], lo[2:], (xout, yout))
    return dict(ex=ex, ey=ey, rx=rx, ry=ry, o=o, oc=oc, upper=upper, lower=lower, region=np.vstack([upper, lower]))


def brow_curve(spec, eye, side, P):
    unit = (eye.get('ry') or eye['hw'] * 0.7) * 0.42
    p0, c, p1 = spec['p0'], spec['c'], spec['p1']
    inner_is_p1 = p1[0] > p0[0] if side == 'L' else p1[0] < p0[0]
    lift = -P['browY'] * unit - (P['browAsym'] if side == 'L' else -P['browAsym'] * 0.35) * unit * 0.9
    tin, tout = -P['browTilt'] * unit * 1.55, P['browTilt'] * unit * 0.45
    q0 = [p0[0], p0[1] + lift + (tout if inner_is_p1 else tin)]
    q1 = [p1[0], p1[1] + lift + (tin if inner_is_p1 else tout)]
    mid = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2]
    bend = 1 + P['browCurve'] * 0.6 + min(0, P['browTilt']) * 0.5
    cc = [c[0], mid[1] + lift + (c[1] - mid[1]) * bend + (tin + tout) * 0.5]
    return bez2(q0, cc, q1)


def mouth_geom(M, P):
    s = clamp(P['mouthSmile'], -1.2, 1.2)
    o = clamp(P['mouthOpen'], 0, 1.4)
    r = clamp(P['mouthRound'], 0, 1)
    pout = clamp(P['mouthPout'], 0, 1)
    W = M['w'] * clamp(P['mouthWidth'], 0.3, 1.5) * (1 - 0.5 * r) * (1 - 0.45 * pout)
    oc0 = clamp(o, 0, 1)
    sagBase = M['sag'] if M.get('sag') is not None else M['w'] * 0.2
    sagS = (M['w'] * 0.18 * (1 - oc0) if M.get('sag') == 0 else sagBase) * s * (1 - 0.6 * r)
    skewY = P['mouthSkew'] * M['w'] * 0.1
    x0 = M['x'] - W / 2 + P['mouthSkew'] * M['w'] * 0.04
    x1 = M['x'] + W / 2 + P['mouthSkew'] * M['w'] * 0.04
    yL, yR = M['y'] + skewY, M['y'] - skewY
    upperOpen = (M['upper'] if M.get('upper') is not None else -M['w'] * 0.08) * (0.4 + 0.6 * max(0, s))
    oc = clamp(o, 0, 1)
    depth = M.get('depth') or M['w'] * 0.45
    U = lerp(sagS, upperOpen, oc) - r * o * depth * 0.28
    Lo = sagS + o * depth * (1 + 0.15 * r) * (0.7 if s < -0.2 else 1)
    if s < 0 and oc > 0.05:
        U = min(U, Lo - 2 * M.get('unit', 1))
    cy = M['y']
    k = 4 / 3
    upper = bez3((x0, yL), (x0 + W * 0.22, cy + U * k), (x1 - W * 0.22, cy + U * k), (x1, yR))
    lower = bez3((x1, yR), (x1 - W * 0.22, cy + Lo * k), (x0 + W * 0.22, cy + Lo * k), (x0, yL))
    is_open = Lo - U > 2.2 * M.get('unit', 1)
    return dict(upper=upper, lower=lower, open=is_open, U=U, Lo=Lo, W=W, x0=x0, x1=x1)
