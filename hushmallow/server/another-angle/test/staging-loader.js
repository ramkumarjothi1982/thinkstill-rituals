// For a test file whose Worker must run as the staging Worker does once the owner has created hushmallow-staging:
// src/config.js loads with its STAGING_SUPABASE_PROJECT_URL filled in (the one line the owner's values change, as
// billing-fixtures.js withStagingProject does for config.js alone). Call loadAsStaging() before anything imports
// src/, then import with await import(). node --test runs each test file in its own process, so no other file sees it.
// This file imports nothing from src/.

import { register } from 'node:module';

/** A made-up staging project (billing-fixtures.js STAGING_SUPABASE). */
export const STAGING_PROJECT = 'https://hmstagingtest0000000.supabase.co';

/** @param {string} [url] */
export function loadAsStaging(url = STAGING_PROJECT) {
  const config = new URL('../src/config.js', import.meta.url).href;
  const line = "const STAGING_SUPABASE_PROJECT_URL = '';";
  register(`data:text/javascript,${encodeURIComponent(`
const dec = new TextDecoder();
export async function load(url, context, next) {
  const r = await next(url, context);
  if (url !== ${JSON.stringify(config)}) return r;
  const src = typeof r.source === 'string' ? r.source : dec.decode(r.source);
  if (src.split(${JSON.stringify(line)}).length !== 2) throw new Error('the staging placeholder line is not in src/config.js exactly once');
  return { ...r, source: src.replace(${JSON.stringify(line)}, ${JSON.stringify(`const STAGING_SUPABASE_PROJECT_URL = '${url}';`)}) };
}`)}`);
}
