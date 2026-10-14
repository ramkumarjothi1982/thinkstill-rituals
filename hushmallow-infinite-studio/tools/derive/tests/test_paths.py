"""paths.py mirrors render/lib/paths.mjs and refuses every forbidden write target."""
import json
import os
import shutil
import subprocess
import unittest

from derive import paths


class PathsTest(unittest.TestCase):
    def test_frozen_and_work_match_the_js_module(self):
        node = shutil.which('node')
        if not node:
            self.skipTest('node not installed')
        mod = os.path.join(paths.STUDIO, 'render', 'lib', 'paths.mjs')
        js = (f'import({json.dumps("file://" + mod)}).then(m => '
              'console.log(JSON.stringify({FROZEN: m.FROZEN, WORK: m.WORK, STUDIO: m.STUDIO})))')
        out = subprocess.run([node, '--input-type=module', '-e', js], capture_output=True, text=True, check=True,
                             env={**os.environ, 'HM_WORK': paths.WORK})
        got = json.loads(out.stdout)
        self.assertEqual(list(paths.FROZEN), got['FROZEN'])
        self.assertEqual(paths.WORK, got['WORK'])
        self.assertEqual(paths.STUDIO, got['STUDIO'])

    def test_frozen_paths(self):
        s = paths.studio_path
        for p in ('assets/noomi', 'assets/noomi/noomi-clean.png', 'stage2/x.js', 'output/v2/a.mp4', 'render/render.mjs'):
            self.assertTrue(paths.is_frozen(s(p)), p)
        for p in ('assets/noomix/a.png', 'assets/blubi/blubi-art.png', 'output/asset-qa/qa-stats.json', 'render/farm.mjs', 'tools/derive'):
            self.assertFalse(paths.is_frozen(s(p)), p)
        self.assertFalse(paths.is_frozen('/etc/passwd'))

    def test_assert_writable(self):
        s = paths.studio_path
        self.assertEqual(paths.assert_writable(s('assets/blubi/blubi-art.png')), s('assets/blubi/blubi-art.png'))
        self.assertTrue(paths.assert_writable(paths.work_path('derive-test', 'x.png')).startswith(paths.WORK))
        for bad in (s('assets/noomi/noomi-clean.png'), s('assets/noomi'), s('output/v2/x'),
                    os.path.join(paths.HUSHMALLOW, 'assets', 'x.png'), '/tmp/x.png', os.path.join(paths.REPO, 'x.txt'),
                    s('assets/../../hushmallow/x.png')):
            with self.assertRaises(PermissionError, msg=bad):
                paths.assert_writable(bad)

    def test_is_inside(self):
        self.assertTrue(paths.is_inside('/a/b/c', '/a/b'))
        self.assertTrue(paths.is_inside('/a/b', '/a/b'))
        self.assertFalse(paths.is_inside('/a/bc', '/a/b'))
        self.assertFalse(paths.is_inside('/a', '/a/b'))


if __name__ == '__main__':
    unittest.main()
