"""open_socket finder (STUB): Boppo, Pipzi.

Face: painted open eyes: eye whites with a pink edge fade, irises, brows, an open mouth with tongue, glittery cheeks.
Built by WP-41 (Pipzi) and WP-42 (Boppo). Until then every entry point raises NotImplementedError,
so a config naming this family fails loudly instead of running the closed-tube
pipeline on a face it cannot handle.

Planned (docs/design/design-ship-incrementally.md section 5.5 and docs/design/map-asset-pipzi.md, docs/design/map-asset-boppo.md):
  - eye-white, iris, brow, mouth and tongue detectors
  - harmonic base plus a fitted cheek field (the cheek runs under the eye whites)
  - 5-level PatchMatch with a guidance term, a reuse penalty and per-region source pools
  - glitter re-seeded at the measured density
  - native iris sprites cut from the art with the catchlight removed
  - identical alpha snap in art and clean

The interface to implement is documented in finders/__init__.py.
"""
FAMILY = 'open_socket'
STATUS = 'stub'
OWNER = 'WP-41 (Pipzi) and WP-42 (Boppo)'
PLANNED = (
    'eye-white, iris, brow, mouth and tongue detectors',
    'harmonic base plus a fitted cheek field (the cheek runs under the eye whites)',
    '5-level PatchMatch with a guidance term, a reuse penalty and per-region source pools',
    'glitter re-seeded at the measured density',
    'native iris sprites cut from the art with the catchlight removed',
    'identical alpha snap in art and clean',
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
