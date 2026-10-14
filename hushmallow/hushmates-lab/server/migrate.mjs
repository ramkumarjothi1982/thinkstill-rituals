// Apply the database migrations (supabase/migrations) in order, each once, each in its own
// transaction. For local development and tests; on Supabase, `supabase db push` does this.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export async function migrate(pool, dir, { log = console } = {}) {
  const c = await pool.connect();
  try {
    await c.query('create table if not exists public.hushmates_migrations (name text primary key, applied_at timestamptz not null default now())');
    const done = new Set((await c.query('select name from public.hushmates_migrations')).rows.map((r) => r.name));
    for (const name of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
      if (done.has(name)) continue;
      await c.query('begin');
      try {
        await c.query(readFileSync(join(dir, name), 'utf8'));
        await c.query('insert into public.hushmates_migrations (name) values ($1)', [name]);
        await c.query('commit');
        log.log?.(`migrated: ${name}`);
      } catch (e) {
        await c.query('rollback');
        throw new Error(`migration ${name} failed: ${e.message}`);
      }
    }
  } finally { c.release(); }
}
