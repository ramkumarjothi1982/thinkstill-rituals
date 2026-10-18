// For a test file whose Worker must run as the staging Worker does, against a made-up staging project (or, with '',
// with no staging project at all): src/config.js loads with only its STAGING_SUPABASE_PROJECT_URL line changed, as
// billing-fixtures.js withStagingProject does for config.js alone. The repository's own line names the owner's
// project (test/billing.test.js); these tests never reach it. Call loadAsStaging() before anything imports src/,
// then import with await import(). node --test runs each test file in its own process, so no other file sees it.
// This file imports nothing from src/.

import { register } from 'node:module';

/** A made-up staging project (billing-fixtures.js STAGING_SUPABASE). */
export const STAGING_PROJECT = 'https://hmstagingtest0000000.supabase.co';
/** The one line of src/config.js that names the staging project, whatever it holds. */
export const STAGING_LINE = /^const STAGING_SUPABASE_PROJECT_URL = '[^']*';$/m;

/** @param {string} [url] the project src/config.js should name ('' simulates "no staging project") */
export function loadAsStaging(url = STAGING_PROJECT) {
  const config = new URL('../src/config.js', import.meta.url).href;
  register(`data:text/javascript,${encodeURIComponent(`
const dec = new TextDecoder();
const line = new RegExp(${JSON.stringify(STAGING_LINE.source)}, 'm');
export async function load(url, context, next) {
  const r = await next(url, context);
  if (url !== ${JSON.stringify(config)}) return r;
  const src = typeof r.source === 'string' ? r.source : dec.decode(r.source);
  if (src.split(line).length !== 2) throw new Error('the STAGING_SUPABASE_PROJECT_URL line is not in src/config.js exactly once');
  return { ...r, source: src.replace(line, ${JSON.stringify(`const STAGING_SUPABASE_PROJECT_URL = '${url}';`)}) };
}`)}`);
}
