"""Check records and the thresholds file, shared by every Python gate.

A gate returns {'checks': {name: check}, 'metrics': {...}, 'artefacts': [...]}.
A check is {'status': 'pass'|'warn'|'fail'|'not-run', 'value': ..., 'limit': ...,
'detail': '...'}; the Node side (qa/run-qa.mjs) turns checks into the gate's
pass/warn verdict, so the rule "a gate passes only when every required check
ran and passed" lives in one place.
"""
import json
import math
import os

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
THRESHOLDS_FILE = os.path.join(HERE, 'thresholds.json')
_cache = {}


def thresholds(path=THRESHOLDS_FILE):
    if path not in _cache:
        with open(path) as f:
            _cache[path] = json.load(f)
    return _cache[path]


def limits(gate, path=THRESHOLDS_FILE):
    """The threshold block of one gate, e.g. limits('G-FINAL:flash')."""
    g = thresholds(path)['gates'].get(gate)
    if g is None:
        raise KeyError(f'thresholds.json has no block for {gate}')
    return g


def num(v, nd=4):
    """JSON-friendly rounding (NaN/inf become None)."""
    if v is None:
        return None
    v = float(v)
    if math.isnan(v) or math.isinf(v):
        return None
    return round(v, nd)


def check(status, value=None, limit=None, detail='', **extra):
    out = {'status': status, 'value': value, 'limit': limit, 'detail': detail}
    out.update(extra)
    return out


def not_run(reason):
    return check('not-run', detail=reason)


def band(value, lim, *, higher_is_worse=True, unit=''):
    """Grade a value against {'fail': x, 'warn': y} (warn optional).

    higher_is_worse: fail when value > fail (else when value < fail).
    """
    f, w = lim.get('fail'), lim.get('warn')
    bad = (lambda a, b: a > b) if higher_is_worse else (lambda a, b: a < b)
    op = '<=' if higher_is_worse else '>='
    if value is None:
        return check('not-run', None, f, 'no value measured')
    if f is not None and bad(value, f):
        return check('fail', num(value), f, f'{num(value)}{unit} breaks the limit {op} {f}{unit}')
    if w is not None and bad(value, w):
        return check('warn', num(value), f, f'{num(value)}{unit} is inside the warn band ({op} {w}{unit} expected)', warn=w)
    return check('pass', num(value), f, f'{num(value)}{unit} {op} {f}{unit}', warn=w)


def range_band(value, lim, unit=''):
    """Grade a value against {'fail': [lo, hi], 'warn': [lo, hi]}."""
    f, w = lim.get('fail'), lim.get('warn')
    if value is None:
        return check('not-run', None, f, 'no value measured')
    if not (f[0] <= value <= f[1]):
        return check('fail', num(value), f, f'{num(value)}{unit} outside {f[0]}..{f[1]}{unit}')
    if w and not (w[0] <= value <= w[1]):
        return check('warn', num(value), f, f'{num(value)}{unit} outside the warn band {w[0]}..{w[1]}{unit}', warn=w)
    return check('pass', num(value), f, f'{num(value)}{unit} within {f[0]}..{f[1]}{unit}', warn=w)


def longest_run(flags):
    """Length of the longest run of True values."""
    best = cur = 0
    for v in flags:
        cur = cur + 1 if v else 0
        best = max(best, cur)
    return best
