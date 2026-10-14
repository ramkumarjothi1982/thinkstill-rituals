"""heavy_lid finder (STUB): Glitzi.

Face: heavy lids, an emission (glitch) layer and a carved mouth groove.
Built by WP-53 (Glitzi). Until then every entry point raises NotImplementedError,
so a config naming this family fails loudly instead of running the closed-tube
pipeline on a face it cannot handle.

Planned (docs/design/design-ship-incrementally.md section 5.5 and docs/design/map-asset-glitzi.md):
  - emission-layer separation first (9x1 opening, then a 3 px ellipse; the remainder is additive light)
  - transplanted-patch mouth fill with min-cut seams and seamlessClone
  - pad weight map, lid-skin sprites and ribbon sampling

The interface to implement is documented in finders/__init__.py.
"""
FAMILY = 'heavy_lid'
STATUS = 'stub'
OWNER = 'WP-53 (Glitzi)'
PLANNED = (
    'emission-layer separation first (9x1 opening, then a 3 px ellipse; the remainder is additive light)',
    'transplanted-patch mouth fill with min-cut seams and seamlessClone',
    'pad weight map, lid-skin sprites and ribbon sampling',
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
