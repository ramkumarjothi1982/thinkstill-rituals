// Copies the app's shared safety lexicon (hushmallow/src/data/safety-lexicon.js,
// owned by the Hushfold shell) verbatim into the server, so the server's
// pre-check matches the app's. Run after the app's lexicon changes:
//   npm run sync:lexicon
// test/safety.test.js fails while the two differ.
import { copyFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const from = fileURLToPath(new URL('../../../src/data/safety-lexicon.js', import.meta.url));
const to = fileURLToPath(new URL('../src/safety/shared-lexicon.js', import.meta.url));
if (!existsSync(from)) {
  console.error(`No shared lexicon at ${from}; keeping the current copy.`);
  process.exit(1);
}
copyFileSync(from, to);
console.log(`Copied ${from} → ${to}`);
