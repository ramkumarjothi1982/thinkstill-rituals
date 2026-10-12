// Cloudflare Worker entry for Another Angle (hushmallow Beyond).
// The system prompt is bundled as text (wrangler.toml [[rules]] Text *.md).

// Keep in step with PROMPT_VERSION in src/prompt.js (test/worker.test.js checks).
import SYSTEM_PROMPT from '../prompts/angle-v2.md';
import { createApp } from './app.js';
import { Ledger } from './limits/ledger.js';

const app = createApp({ systemPrompt: SYSTEM_PROMPT });

export default {
  /** @param {Request} request @param {Record<string, any>} env @param {{ waitUntil(p: Promise<unknown>): void }} ctx */
  fetch(request, env, ctx) {
    return app.fetch(request, env, ctx);
  },
};

export { Ledger };
