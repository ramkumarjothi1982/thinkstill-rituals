"""tools/derive: generic, deterministic derivation of a Mallow's hi-res rig assets.

Entry points (run with `python3 -I`; each takes the heavy-job lock itself):

    tools/derive/derive_mallow.py --mallow <id>   art crop, clean body, edit mask, face JSON,
                                                  height + normal maps, QA pack, asset gates
    tools/derive/asset_qa.py --mallow <id>        QA pack + shared asset-gate metrics on
                                                  already-derived files
    tools/derive/run_legacy.py --out DIR          the original Noomi script, redirected (A/B)

Modules:

    paths.py            studio locations + assert_writable (mirror of render/lib/paths.mjs)
    lock.py             heavy-job lock (re-exec through render/lib/heavy-lock.mjs)
    config.py           configs/<id>.json loading and validation
    common.py           family-independent numerics, PatchMatch, glow un-blending,
                        zone-A re-synthesis, composite, height/normal maps
    pipeline.py         the derivation steps in order, the writers, byte comparison
    finders/<family>.py per-family feature finders and face-JSON writers
    asset_qa.py         review pack (verbatim) + the asset-QA command line
    gates.py            the shared asset-gate metrics (asset-gates.json)
    metrics.py          tested metric primitives (dE2000, NCC, bootstrap, ...)
    qa_draw.py          review-pack drawing helpers (verbatim)
    legacy_noomi.py     byte-for-byte copy of the pre-refactor tools/derive_noomi_hires.py
                        (reference only, never edited)
"""
