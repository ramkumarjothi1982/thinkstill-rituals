"""The original script is preserved byte for byte, and the code moved out of it is verbatim.

The full proof is the Noomi regression (derive_mallow.py --mallow noomi: byte-identical
files). These fast checks catch an accidental edit of moved code long before that.
"""
import hashlib
import importlib.util
import inspect
import os
import sys
import unittest

from derive import common, paths, qa_draw
from derive.finders import closed_tube

# sha256 of tools/derive_noomi_hires.py as committed in 526ddd9 (the approved v2 derivation)
LEGACY_SHA256 = '341982589764a97c15e647675e405b26f70fe81d00c8d2af530ce7c48a4016fc'
LEGACY = os.path.join(paths.HERE, 'legacy_noomi.py')


def load_legacy():
    name = 'legacy_noomi_ref'
    if name not in sys.modules:             # registered, so inspect can find its classes' source
        spec = importlib.util.spec_from_file_location(name, LEGACY)
        mod = importlib.util.module_from_spec(spec)
        sys.modules[name] = mod
        spec.loader.exec_module(mod)        # definitions only: main() runs under __main__ alone
    return sys.modules[name]


class LegacyTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.L = load_legacy()

    def test_legacy_copy_is_byte_identical_to_the_approved_script(self):
        with open(LEGACY, 'rb') as f:
            self.assertEqual(hashlib.sha256(f.read()).hexdigest(), LEGACY_SHA256)

    def test_moved_functions_are_verbatim(self):
        verbatim = {
            common: ['ell', 'laplace_fill', 'norm_blur', 'loclin_lowpass', 'zhang_suen', 'skeleton_path', 'bez',
                     'bez_tan', 'fit_quad_bezier', 'arclen_samples', 'side_cos', '_Level', '_down',
                     'patchmatch_complete', 'r1', 'rgbhex', 'colour'],
            closed_tube: ['measure_stroke'],
            qa_draw: ['_on_bg', '_label'],
        }
        for mod, names in verbatim.items():
            for n in names:
                self.assertEqual(inspect.getsource(getattr(mod, n)), inspect.getsource(getattr(self.L, n)),
                                 f'{mod.__name__}.{n} is no longer verbatim')

    def test_constants_match_configs(self):
        from derive import config
        cfg = config.load('noomi')
        L = self.L
        self.assertEqual((cfg.pad, cfg.alpha_min, cfg.halo_r, cfg.seed), (L.PAD, L.ALPHA_MIN, L.HALO_R, L.SEED))
        norm = lambda d: {k: (list(v) if isinstance(v, tuple) else v) for k, v in d.items()}
        self.assertEqual(list(cfg.inpaint.items()), list(norm(L.P).items()))
        self.assertEqual(list(cfg.height_normal.items()), list(norm(L.HN).items()))
        self.assertTrue((common.LUMA == L.LUMA).all())

    def test_wrapper_maps_the_old_command_line(self):
        spec = importlib.util.spec_from_file_location('dnh', os.path.join(paths.STUDIO, 'tools', 'derive_noomi_hires.py'))
        w = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(w)
        self.assertEqual(w.to_derive_args([]), ['--mallow', 'noomi'])
        self.assertEqual(w.to_derive_args(['/x/noomi.webp']), ['--mallow', 'noomi', '--src', '/x/noomi.webp'])
        self.assertEqual(w.to_derive_args(['/x/n.webp', '--out', '/w']), ['--mallow', 'noomi', '--src', '/x/n.webp', '--out', '/w'])
        self.assertEqual(w.to_derive_args(['--gates']), ['--mallow', 'noomi', '--gates'])


if __name__ == '__main__':
    unittest.main()
