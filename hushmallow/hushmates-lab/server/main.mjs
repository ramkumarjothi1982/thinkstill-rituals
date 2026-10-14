#!/usr/bin/env node
// Run the Hushmates server.
//
//   production (the built app only, no lab):
//     node tools/build-app.mjs
//     HUSHMATES_INVITES="CODE1,CODE2" node server/main.mjs --mode production --port 8080
//
//   development (the app from the source tree, plus the lab for testers):
//     HUSHMATES_TESTER_KEY="<at least 16 characters>" node server/main.mjs --mode development
//     (without a key, one is made up and printed; the lab opens at /lab/?key=…)
//
// Options: --port (8080), --host (127.0.0.1), --state <file> (keep data between restarts),
// --dist <folder> (production: dist/app). Invitations: HUSHMATES_INVITES (members),
// HUSHMATES_STAFF_INVITES (moderators), comma separated. Nothing is deployed by this script.

import { randomBytes } from 'node:crypto';
import { resolve, join } from 'node:path';
import { createHushmatesServer, builtFiles } from './server.mjs';
import { appFiles, labFiles, LAB_ROOT } from './app-files.mjs';

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const mode = arg('mode', 'production');
const port = Number(arg('port', 8080));
const host = arg('host', '127.0.0.1');
const list = (v) => (v || '').split(',').map((x) => x.trim()).filter(Boolean);
const make = () => randomBytes(6).toString('hex').toUpperCase();

let invites = [...list(process.env.HUSHMATES_INVITES).map((code) => ({ code, role: 'member' })), ...list(process.env.HUSHMATES_STAFF_INVITES).map((code) => ({ code, role: 'moderator' }))];
let options;
if (mode === 'production') {
  options = { mode, files: builtFiles(resolve(arg('dist', join(LAB_ROOT, 'dist', 'app')))) };
  if (!invites.length) console.warn('No invitations configured (HUSHMATES_INVITES): nobody can join.');
} else if (mode === 'development') {
  const testerKey = process.env.HUSHMATES_TESTER_KEY || randomBytes(18).toString('base64url');
  if (!invites.length) invites = [make(), make(), make()].map((code) => ({ code, role: 'member' }));
  options = { mode, files: appFiles(), labFiles: labFiles(), testerKey, secureCookies: false };
  console.log(`Development server. Lab for testers: http://${host}:${port}/lab/?key=${testerKey}`);
  console.log(`Invitations: ${invites.map((i) => i.code).join(', ')}`);
} else {
  console.error('--mode must be production or development');
  process.exit(2);
}
const app = createHushmatesServer({ ...options, invites, statePath: arg('state', null) });
app.server.listen(port, host, () => console.log(`Hushmates (${mode}) on http://${host}:${port}/app/`));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => app.close().then(() => process.exit(0)));
