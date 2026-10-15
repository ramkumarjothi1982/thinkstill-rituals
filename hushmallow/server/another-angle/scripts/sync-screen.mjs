// Copies the app's risk screener (hushmallow/src/beyond/risk-screen.js) verbatim into the server, so the server reads
// distress exactly as the phone does (a client that skips its own check-in still meets the same reading here). Run after the
// app's screener changes:
//   npm run sync:screen
// test/risk-screen.test.js fails while the two differ.
import { copyFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const from = fileURLToPath(new URL('../../../src/beyond/risk-screen.js', import.meta.url));
const to = fileURLToPath(new URL('../src/safety/risk-screen.js', import.meta.url));
if (!existsSync(from)) {
  console.error(`No risk screener at ${from}; keeping the current copy.`);
  process.exit(1);
}
copyFileSync(from, to);
console.log(`Copied ${from} → ${to}`);
