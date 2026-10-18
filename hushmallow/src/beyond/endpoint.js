// Where Another Angle may send words: our own server, or nowhere.
// No network here (Settings reads it to decide which privacy rows to show);
// the one request lives in angle-client.js.

import { deploySettings } from '../app/config.js';

const DEV_HOSTS = ['localhost', '127.0.0.1'];

/**
 * The endpoint this build may talk to, or null (→ the authored engine only).
 * Production: ANGLE_ENDPOINT from src/app/config.js, https, on a host listed in
 * ANGLE_ALLOWED_HOSTS, nothing but an origin and a path. A branch preview of
 * the Pages project (src/app/config.js isPreviewHost): STAGING_ANGLE_ENDPOINT
 * on STAGING_ALLOWED_HOSTS instead, by the same rules (deploySettings). Development only: on
 * localhost, `?angleDev=<port>` points at a local server on this same machine
 * (server/another-angle: `npm run harness -- --serve <port>`).
 */
export function resolveEndpoint({ configured, allowedHosts, loc = globalThis.location } = {}) {
  try {
    if (loc && DEV_HOSTS.includes(loc.hostname)) {
      const port = new URLSearchParams(loc.search || '').get('angleDev');
      if (port && /^\d{2,5}$/.test(port)) return `${loc.protocol === 'https:' ? 'https:' : 'http:'}//${loc.hostname}:${port}`;
    }
  } catch { /* no dev override */ }
  // this page's own Worker and allow-list, unless a caller names them
  const here = deploySettings(loc);
  if (configured === undefined) configured = here.angleEndpoint;
  if (allowedHosts === undefined) allowedHosts = here.angleAllowedHosts;
  if (!configured || typeof configured !== 'string') return null;
  let u;
  try { u = new URL(configured); } catch { return null; }
  if (u.protocol !== 'https:' || !Array.isArray(allowedHosts) || !allowedHosts.includes(u.hostname)) return null;
  if (u.username || u.password || u.search || u.hash) return null;
  return `${u.origin}${u.pathname.replace(/\/+$/, '')}`;
}
