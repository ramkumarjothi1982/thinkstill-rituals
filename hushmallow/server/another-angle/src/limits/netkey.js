// Which "network" a request comes from, for the per-IP limits.
//
// IPv4 is keyed by the full address. IPv6 is keyed by its /64 prefix: one
// home or phone usually gets a whole /64, so keying the full address would
// let a single device rotate through billions of addresses and step round
// the per-IP burst and session limits. IPv4-mapped IPv6 (::ffff:1.2.3.4)
// counts as the IPv4 address. Anything unparseable is keyed as given, so it
// is still limited. The key is hashed with IP_HASH_KEY before it is used or
// stored (src/app.js), and it is never logged.

/** @param {string} v4 */
const isV4 = (v4) => /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/.test(v4);

/**
 * Expand an IPv6 address to eight 16-bit groups, or null if it is not one.
 * @param {string} ip
 * @returns {number[] | null}
 */
export function ipv6Groups(ip) {
  let s = ip.toLowerCase().replace(/%.*$/, '').replace(/^\[|\]$/g, '');
  // A trailing dotted IPv4 part becomes two groups.
  const tail = /^(.*:)(\d+\.\d+\.\d+\.\d+)$/.exec(s);
  if (tail) {
    if (!isV4(tail[2])) return null;
    const [a, b, c, d] = tail[2].split('.').map(Number);
    s = `${tail[1]}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const halves = s.split('::');
  if (halves.length > 2) return null;
  const part = (/** @type {string} */ h) => (h ? h.split(':') : []);
  const head = part(halves[0]);
  const rest = halves.length === 2 ? part(halves[1]) : [];
  const missing = 8 - head.length - rest.length;
  if (halves.length === 2 ? missing < 1 : missing !== 0) return null;
  const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill('0'), ...rest];
  if (groups.length !== 8 || !groups.every((g) => /^[0-9a-f]{1,4}$/.test(g))) return null;
  return groups.map((g) => Number.parseInt(g, 16));
}

/**
 * @param {string | null | undefined} ip the cf-connecting-ip header
 * @returns {string} e.g. "v4:203.0.113.7", "v6:2001:db8:1:2::/64", "local"
 */
export function networkKey(ip) {
  const s = String(ip ?? '').trim();
  if (!s) return 'local';
  if (isV4(s)) return `v4:${s}`;
  if (s.includes(':')) {
    const g = ipv6Groups(s);
    if (g) {
      // ::ffff:a.b.c.d (IPv4-mapped) is really an IPv4 client.
      if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) {
        return `v4:${g[6] >> 8}.${g[6] & 255}.${g[7] >> 8}.${g[7] & 255}`;
      }
      return `v6:${g.slice(0, 4).map((x) => x.toString(16)).join(':')}::/64`;
    }
  }
  return `raw:${s.slice(0, 64).toLowerCase()}`;
}
