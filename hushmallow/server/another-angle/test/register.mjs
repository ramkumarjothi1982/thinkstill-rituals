// Lets Node import *.md files as text, the way Wrangler bundles them
// ([[rules]] type = "Text" in wrangler.toml). Used by `npm test` and the harness.
import { register } from 'node:module';

register('./md-loader.mjs', import.meta.url);
