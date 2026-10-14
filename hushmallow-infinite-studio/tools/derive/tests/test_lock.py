"""Heavy-lock helper: lease parsing, the re-exec command, and no re-exec inside a lease."""
import os
import unittest
from unittest import mock

from derive import lock, paths


class LockTest(unittest.TestCase):
    def test_parse_lease(self):
        self.assertEqual(lock.parse_lease('exclusive@/w/locks'), ('exclusive', 0, '/w/locks'))
        self.assertEqual(lock.parse_lease('shared:2@/w/locks'), ('shared', 2, '/w/locks'))
        for bad in (None, '', 'exclusive', 'shared:x@/w', 'other@/w'):
            self.assertIsNone(lock.parse_lease(bad), bad)

    def test_lock_command(self):
        cmd = lock.lock_command(['/s/derive_mallow.py', '--mallow', 'noomi'], 'derive-noomi', python='/usr/bin/python3')
        self.assertEqual(cmd[1:], [os.path.join(paths.STUDIO, 'render', 'lib', 'heavy-lock.mjs'), '--exclusive', '--label',
                                   'derive-noomi', '--', '/usr/bin/python3', '-I', '/s/derive_mallow.py', '--mallow', 'noomi'])
        self.assertEqual(lock.lock_command(['x.py'], 't', mode='shared')[2], '--shared')
        with self.assertRaises(ValueError):
            lock.lock_command(['x.py'], 't', mode='weird')

    def test_no_reexec_inside_a_lease(self):
        with mock.patch.dict(os.environ, {lock.ENV_KEY: 'exclusive@/w/locks'}), mock.patch('os.execv') as ex:
            lock.ensure_heavy_lock(['x.py'], 't')
            ex.assert_not_called()

    def test_reexec_without_a_lease(self):
        env = {k: v for k, v in os.environ.items() if k != lock.ENV_KEY}
        with mock.patch.dict(os.environ, env, clear=True), mock.patch('os.execv') as ex:
            lock.ensure_heavy_lock(['x.py', '--a'], 'lbl')
            ex.assert_called_once()
            argv = ex.call_args[0][1]
            self.assertIn('--exclusive', argv)
            self.assertEqual(argv[-2:], ['x.py', '--a'])


if __name__ == '__main__':
    unittest.main()
