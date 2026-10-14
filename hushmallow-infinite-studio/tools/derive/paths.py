"""Canonical studio locations for the Python derivation tools.

A Python mirror of render/lib/paths.mjs (the single source of truth): the same
STUDIO / REPO / HUSHMALLOW / WORK constants, the same FROZEN list and the same
assert_writable() rule, so a typo on the command line can never land a file in
the live app, in the frozen v2 (assets/noomi/ included) or elsewhere on the
machine. tests/test_paths.py checks that FROZEN and WORK agree with the
JavaScript module.

    STUDIO      this studio (.../hushmallow-infinite-studio), from this file
    REPO        the git repository root (STUDIO's parent)
    HUSHMALLOW  the live app (.../hushmallow): READ-ONLY, never written to
    WORK        shared scratch, default /home/user/hm-work (env HM_WORK overrides)
"""
import os
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))           # tools/derive
STUDIO = os.path.dirname(os.path.dirname(HERE))
REPO = os.path.dirname(STUDIO)
HUSHMALLOW = os.path.join(REPO, 'hushmallow')
WORK = os.path.abspath(os.environ.get('HM_WORK') or '/home/user/hm-work')
WORK_TMP = os.path.join(WORK, 'tmp')
HIRES_SRC = os.path.join(HUSHMALLOW, 'assets', 'source', 'hires')   # approved 1254 px art, <id>.webp

# Keep in step with render/lib/paths.mjs FROZEN (tests/test_paths.py compares them).
FROZEN = (
    'stage/',
    'stage2/',
    'videos/my-brain-at-2am-v2.js',
    'audio/soundtrack-v2.mjs',
    'audio/soundtrack.mjs',
    'render/render.mjs',
    'render/verify.mjs',
    'assets/noomi/',
    'output/v2/',
)


def is_inside(p, root):
    """True when `p` is `root` itself or lies inside it (lexically, after resolving)."""
    rel = os.path.relpath(os.path.abspath(p), os.path.abspath(root))
    return rel == '.' or not (rel == '..' or rel.startswith('..' + os.sep) or os.path.isabs(rel))


def studio_rel(p):
    """Studio-relative POSIX path of `p`, or None when it lies outside the studio."""
    a = os.path.abspath(p)
    if not is_inside(a, STUDIO):
        return None
    rel = os.path.relpath(a, STUDIO)
    return '' if rel == '.' else rel.replace(os.sep, '/')


def is_frozen(p):
    """True when `p` is a frozen v2 file or lies inside a frozen directory."""
    rel = studio_rel(p)
    if rel is None:
        return False
    return any((rel == f[:-1] or rel.startswith(f)) if f.endswith('/') else rel == f for f in FROZEN)


def assert_writable(p):
    """Raise unless `p` is a place studio code may write to (inside STUDIO or
    WORK, not in the live app, not frozen). Returns the absolute path."""
    a = os.path.abspath(p)
    if is_inside(a, HUSHMALLOW):
        raise PermissionError(f'refusing to write inside the live app (read-only): {a}')
    if not is_inside(a, STUDIO) and not is_inside(a, WORK):
        raise PermissionError(f'refusing to write outside the studio root and {WORK}: {a}')
    if is_frozen(a):
        raise PermissionError(f'refusing to write a frozen v2 path (fork it instead): {studio_rel(a)}')
    return a


def studio_path(*p):
    return os.path.join(STUDIO, *p)


def work_path(*p):
    return os.path.join(WORK, *p)


def mk_work_temp(prefix='hm-'):
    """A fresh private temp directory under WORK/tmp (never the system /tmp)."""
    os.makedirs(WORK_TMP, exist_ok=True)
    return tempfile.mkdtemp(prefix=prefix, dir=WORK_TMP)
