#!/usr/bin/env node
// Run Hushmates.
//
//   production (the built app and safety desk only: no lab, no local sign-in, no API;
//   on staging and production the API is the Hushmates Edge Function on Supabase):
//     node tools/build-app.mjs
//     node server/main.mjs --mode production --port 8080
//
//   development (everything on this machine, nothing outside it: Postgres, a local copy of
//   Supabase Auth, the Edge Function's code, the scheduler, and the lab for testers):
//     node server/main.mjs --mode development     (the same as node server/dev-stack.mjs)
//     HUSHMATES_PG=postgres://postgres@127.0.0.1:54329  HUSHMATES_TESTER_KEY=<16+ characters>
//     HUSHMATES_INVITES=CODE1,CODE2  HUSHMATES_STAFF_INVITES=CODE3 (the safety team)
//
// Options: --port (8080 production, 8090 development), --host (127.0.0.1),
// --dist <folder> (production: dist), --db <name> (development: hushmates_dev).
// Nothing is deployed by this script.

import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHushmatesServer, builtFiles } from './server.mjs';
import { LAB_ROOT } from './app-files.mjs';

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const mode = arg('mode', 'production');
const host = arg('host', '127.0.0.1');

if (mode === 'production') {
  const dist = resolve(arg('dist', join(LAB_ROOT, 'dist')));
  const files = builtFiles(join(dist, 'app'));
  if (existsSync(join(dist, 'staff', 'manifest.json'))) for (const [url, file] of builtFiles(join(dist, 'staff'))) files.set(url, file);
  const port = Number(arg('port', 8080));
  const app = createHushmatesServer({ mode, files });
  app.server.listen(port, host, () => console.log(`Hushmates (production files) on http://${host}:${port}/app/`));
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => app.close().then(() => process.exit(0)));
} else if (mode === 'development') {
  const { startDevStack } = await import('./dev-stack.mjs');
  const list = (v) => (v || '').split(',').map((x) => x.trim()).filter(Boolean);
  const stack = await startDevStack({ port: Number(arg('port', 8090)), host, database: arg('db', 'hushmates_dev'),
    invites: list(process.env.HUSHMATES_INVITES), staffInvites: list(process.env.HUSHMATES_STAFF_INVITES) });
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => stack.close().then(() => process.exit(0)));
} else {
  console.error('--mode must be production or development');
  process.exit(2);
}
