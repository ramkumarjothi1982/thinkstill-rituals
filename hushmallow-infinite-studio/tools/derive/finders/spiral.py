"""spiral finder (STUB): Zuzu.

Face: spiral eye discs and a mouth.
Built by WP-51 (Zuzu). Until then every entry point raises NotImplementedError,
so a config naming this family fails loudly instead of running the closed-tube
pipeline on a face it cannot handle.

Planned (docs/design/design-ship-incrementally.md section 5.5 and docs/design/map-asset-zuzu.md):
  - disc and mouth segmentation
  - thin-plate global shading prior
  - cheek extrapolation
  - 5-level PatchMatch per window
  - spiral phase-field fit with a correction term

The interface to implement is documented in finders/__init__.py.
"""
FAMILY = 'spiral'
STATUS = 'stub'
OWNER = 'WP-51 (Zuzu)'
PLANNED = (
    'disc and mouth segmentation',
    'thin-plate global shading prior',
    'cheek extrapolation',
    '5-level PatchMatch per window',
    'spiral phase-field fit with a correction term',
)


def _todo(what):
    raise NotImplementedError(f'the {FAMILY} finder is a stub ({what} not implemented yet; owner: {OWNER})')


def validate(fcfg):
    """Accept the section as is: the schema is defined with the finder."""
    return dict(fcfg or {})


def find(art, cfg):
    _todo('find')


def measure(art, features, Lbg, cfg):
    _todo('measure')


def face_doc(derivation):
    _todo('face_doc')
