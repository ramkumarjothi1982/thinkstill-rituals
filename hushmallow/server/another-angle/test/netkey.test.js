import { test } from 'node:test';
import assert from 'node:assert/strict';
import { networkKey, ipv6Groups } from '../src/limits/netkey.js';

test('IPv4 is keyed by the full address', () => {
  assert.equal(networkKey('203.0.113.7'), 'v4:203.0.113.7');
  assert.notEqual(networkKey('203.0.113.7'), networkKey('203.0.113.8'));
});

test('IPv6 is keyed by its /64, whatever the spelling', () => {
  const a = networkKey('2001:db8:abcd:12::1');
  assert.equal(a, 'v6:2001:db8:abcd:12::/64');
  for (const same of ['2001:0db8:abcd:0012:ffff:1:2:3', '2001:DB8:ABCD:12:aaaa::9', '[2001:db8:abcd:12::5]', 'fe80::1%eth0'.replace('fe80::1', '2001:db8:abcd:12::77')]) {
    assert.equal(networkKey(same), a, same);
  }
  assert.notEqual(networkKey('2001:db8:abcd:13::1'), a);
});

test('IPv4-mapped IPv6 counts as IPv4; junk and missing headers still get a key', () => {
  assert.equal(networkKey('::ffff:198.51.100.4'), 'v4:198.51.100.4');
  assert.equal(networkKey(''), 'local');
  assert.equal(networkKey(null), 'local');
  assert.equal(networkKey('not-an-ip'), 'raw:not-an-ip');
  assert.equal(networkKey('1:2:3:4:5:6:7:8:9'), 'raw:1:2:3:4:5:6:7:8:9');
  assert.equal(ipv6Groups('1::2::3'), null);
  assert.deepEqual(ipv6Groups('::1'), [0, 0, 0, 0, 0, 0, 0, 1]);
});
