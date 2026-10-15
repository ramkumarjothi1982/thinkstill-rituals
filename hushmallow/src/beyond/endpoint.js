// Where Another Angle may send words: our own server, or nowhere.
// No network here (Settings reads it to decide which privacy rows to show);
// the one request lives in angle-client.js.

import { ANGLE_ENDPOINT, ANGLE_ALLOWED_HOSTS } from '../app/config.js';

const DEV_HOSTS = ['localhost', '127.0.0.1'];

/**
 * The endpoint this build may talk to, or null (→ the authored engine only).
 * Production: ANGLE_ENDPOINT from src/app/config.js, https, on a host listed in
 * ANGLE_ALLOWED_HOSTS, nothing but an origin and a path. Development only: on
 * localhost, `?angleDev=<port>` points at a local server on this same machine
 * (server/another-angle: `npm run harness -- --serve <port>`).
 */
export function resolveEndpoint({ configured = ANGLE_ENDPOINT, allowedHosts = ANGLE_ALLOWED_HOSTS, loc = globalThis.location } = {}) {
  try {
    if (loc && DEV_HOSTS.includes(loc.hostname)) {
      const port = new URLSearchParams(loc.search || '').get('angleDev');
      if (port && /^\d{2,5}$/.test(port)) return `${loc.protocol === 'https:' ? 'https:' : 'http:'}//${loc.hostname}:${port}`;
    }
  } catch { /* no dev override */ }
  if (!configured || typeof configured !== 'string') return null;
  let u;
  try { u = new URL(configured); } catch { return null; }
  if (u.protocol !== 'https:' || !Array.isArray(allowedHosts) || !allowedHosts.includes(u.hostname)) return null;
  if (u.username || u.password || u.search || u.hash) return null;
  return `${u.origin}${u.pathname.replace(/\/+$/, '')}`;
}
