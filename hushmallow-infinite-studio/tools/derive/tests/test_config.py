"""configs/<id>.json loading: Noomi spells out the approved values, defaults equal them, typos fail."""
import json
import os
import unittest

from derive import config, finders, paths
from derive.finders import closed_tube


class ConfigTest(unittest.TestCase):
    def setUp(self):
        with open(config.config_path('noomi')) as f:
            self.noomi = json.load(f)

    def test_noomi_resolves(self):
        cfg = config.load('noomi')
        self.assertEqual((cfg.id, cfg.name, cfg.family), ('noomi', 'Noomi', 'closed_tube'))
        self.assertEqual(cfg.src_path, os.path.join(paths.HUSHMALLOW, 'assets', 'source', 'hires', 'noomi.webp'))
        self.assertEqual(cfg.assets_dir, paths.studio_path('assets', 'noomi'))
        self.assertEqual(cfg.qa_dir, paths.studio_path('output', 'asset-qa'))
        self.assertEqual(cfg.generator, 'tools/derive_noomi_hires.py')
        self.assertEqual((cfg.pad, cfg.alpha_min, cfg.halo_r, cfg.seed), (24, 2, 64, 1234))
        self.assertEqual(len(cfg.sha256), 64)
        self.assertEqual(cfg.file('clean-mask.png'), 'noomi-clean-mask.png')

    def test_noomi_values_are_the_defaults_in_the_same_order(self):
        for sec in ('inpaint', 'height_normal', 'crop'):
            self.assertEqual(list(self.noomi[sec].items()), list(config.DEFAULTS[sec].items()), sec)
            # the face JSON echoes these: the float/int spelling must survive (10.0 stays 10.0)
            self.assertEqual(json.dumps(self.noomi[sec]), json.dumps(config.DEFAULTS[sec]), sec)
        self.assertEqual(self.noomi['halo_r'], config.DEFAULTS['halo_r'])
        self.assertEqual(self.noomi['seed'], config.DEFAULTS['seed'])
        self.assertEqual(json.dumps(self.noomi['finder']), json.dumps(closed_tube.DEFAULTS))

    def test_minimal_config_inherits_defaults(self):
        cfg = config.parse({'id': 'blubi', 'family': 'closed_tube'})
        self.assertEqual(cfg.inpaint, config.DEFAULTS['inpaint'])
        self.assertEqual(cfg.assets_dir, paths.studio_path('assets', 'blubi'))
        self.assertEqual(cfg.qa_dir, paths.studio_path('output', 'asset-qa', 'blubi'))
        self.assertEqual(cfg.generator, 'tools/derive/derive_mallow.py --mallow blubi')
        self.assertEqual(cfg.name, 'Blubi')

    def test_override_keeps_default_order(self):
        cfg = config.parse({'id': 'loomi', 'family': 'closed_tube', 'inpaint': {'seam_sigma': 7, 'band': 12}})
        self.assertEqual(list(cfg.inpaint), list(config.DEFAULTS['inpaint']))
        self.assertEqual((cfg.inpaint['band'], cfg.inpaint['seam_sigma']), (12, 7))

    def test_rejections(self):
        bad = [
            {'id': 'x', 'family': 'closed_tube', 'inpiant': {}},                     # unknown top-level key
            {'id': 'x', 'family': 'closed_tube', 'inpaint': {'bnad': 3}},            # unknown section key
            {'id': 'x', 'family': 'closed_tube', 'inpaint': {'pm_levels': 3}},       # pm_em/pm_iters length
            {'id': 'x', 'family': 'closed_tube', 'inpaint': {'ratio_su': 4.5}},      # must be an integer
            {'id': 'x', 'family': 'closed_tube', 'crop': {'pad': '24'}},
            {'id': 'x', 'family': 'closed_tube', 'halo_r': 0},
            {'id': 'x', 'family': 'closed_tube', 'seed': -1},
            {'id': 'X', 'family': 'closed_tube'},
            {'id': 'x', 'family': 'tube'},
            {'family': 'closed_tube'},
        ]
        for doc in bad:
            with self.assertRaises(config.ConfigError, msg=json.dumps(doc)):
                config.parse(doc)

    def test_missing_config_lists_the_available_ones(self):
        with self.assertRaises(config.ConfigError) as cm:
            config.load('nobody')
        self.assertIn('noomi', str(cm.exception))

    def test_every_shipped_config_validates(self):
        for mid in config.available():
            cfg = config.load(mid)
            fin = finders.load(cfg.family)
            fin.validate(cfg.finder)


class ClosedTubeConfigTest(unittest.TestCase):
    def test_defaults_fill_in(self):
        f = closed_tube.validate({'rows': [['browL', 'browR'], ['eyeL', 'eyeR'], ['mouth']],
                                  'cheeks': {'pink_min': 25}})
        self.assertEqual(f['cheeks']['pink_min'], 25)
        self.assertEqual(f['cheeks']['window'], 170)
        self.assertEqual(f['stroke_pixel'], closed_tube.DEFAULTS['stroke_pixel'])

    def test_rejections(self):
        for bad in ({'stroke_pixel': [['Q', '<', 3]]}, {'stroke_pixel': [['R', '<=', 3]]}, {'rows': []},
                    {'rows': [['eyeL', 'eyeL']]}, {'rows': [['edit']]}, {'cheeks': {'radius': 3}}, {'colour': 1},
                    {'core_close_r': 1.5}, {'cheeks': {'init': [1, 2]}}):
            with self.assertRaises(config.ConfigError, msg=json.dumps(bad)):
                closed_tube.validate(bad)


if __name__ == '__main__':
    unittest.main()
