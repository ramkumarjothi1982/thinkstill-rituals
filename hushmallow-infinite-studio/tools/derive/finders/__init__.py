"""Per-family feature finders.

Every Mallow's painted face has to be found, measured and removed from its
approved art. What a "feature" is depends on the face family (see
docs/PHASE2-PLAN.md, face styles):

    closed_tube   Noomi, Blubi, Loomi   navy tube strokes (closed eyes, line mouth, brows)
    open_socket   Boppo, Pipzi          eye whites, irises, brows, open mouth + tongue
    spiral        Zuzu                  spiral eye discs, mouth
    heavy_lid     Glitzi                emission layer, lids, carved mouth groove

A finder module exports:

    FAMILY, STATUS ('implemented' or 'stub'), OWNER (the work package that builds it)
    validate(finder_cfg) -> dict          the config's "finder" section, defaults filled in;
                                          raises config.ConfigError on bad values
    find(art, cfg) -> Features            feature masks, cheeks and protected pixels
    measure(art, features, Lbg, cfg)      per-feature measurements for the face JSON
    face_doc(derivation) -> dict          the <id>-face.json document
    fit_cheeks(img, coreU, cfg)           (optional) cheek model, used by the cheek-refit gate

The removal pipeline itself (pipeline.py + common.py) is shared. A family whose
removal differs (e.g. the 5-level guided PatchMatch planned for open_socket)
adds the variant to its own module and pipeline.py grows a hook for it; the
Noomi regression must stay byte-identical either way.
"""
from dataclasses import dataclass, field

FAMILIES = ('closed_tube', 'open_socket', 'spiral', 'heavy_lid')


@dataclass
class Features:
    """What a finder found on the cropped art (all masks in art pixel space)."""
    cores: dict                # name -> uint8 mask of each painted feature, in a fixed order
    dimple: dict = None        # top dimple (center, centroid, bbox) or None
    cheeks: dict = field(default_factory=dict)   # side -> fitted cheek model
    excl: object = None        # bool mask kept out of the glow-transmission fit (cheek discs)
    protect: object = None     # bool mask never re-synthesised nor used as data (sparkles)


class FeatureError(RuntimeError):
    """The art does not contain the features the family config expects."""


def load(family):
    """Import a family's finder module (constant module names, no dynamic import strings)."""
    if family == 'closed_tube':
        from . import closed_tube as m
    elif family == 'open_socket':
        from . import open_socket as m
    elif family == 'spiral':
        from . import spiral as m
    elif family == 'heavy_lid':
        from . import heavy_lid as m
    else:
        raise ValueError(f'unknown face family {family!r} (have: {", ".join(FAMILIES)})')
    return m
