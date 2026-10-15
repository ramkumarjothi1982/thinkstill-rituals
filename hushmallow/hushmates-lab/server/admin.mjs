#!/usr/bin/env node
// The operator's tool: invitations, settings and what the service did and spent. It talks
// straight to the database as its owner (never through the app), so it needs the database
// connection string, and for invitations the key their codes are hashed with.
//
//   node server/admin.mjs invite [--count 5] [--role member|moderator] [--uses 1] [--expires-days 14] [--note "…"]
//   node server/admin.mjs revoke <CODE>
//   node server/admin.mjs settings
//   node server/admin.mjs set <key> '<json to merge>'     e.g. set ai '{"monthlyCapAud": 20}'
//   node server/admin.mjs set desk '{"awayUntil": "2026-12-29"}'   nobody can read the desk until then: reporters are
//                                                                   told so (set it back with '{"awayUntil": null}')
//   node server/admin.mjs ops [--days 7]
//   node server/admin.mjs member <reference> active|restricted|suspended   (the reference the safety desk shows)
//
//   HUSHMATES_ADMIN_PG   postgres://… (local default: the dev stack's database)
//   HUSHMATES_MAC_KEY    base64 (default: .data/staging.env with HUSHMATES_ADMIN_PG set, else .data/dev-keys.json)
//
// Codes are shown once, here, and stored only as a keyed hash: keep them somewhere safe
// until you hand them out. Turning AI on (set ai '{"enabled": true}') costs money once a
// provider is configured: only with the owner's approval of the costs.

import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomInt } from 'node:crypto';
import { join } from 'node:path';
import pg from 'pg';
import { LAB_ROOT } from './app-files.mjs';
import { createFieldCrypt } from '../supabase/functions/_shared/fieldcrypt.js';
import { normaliseCode } from '../supabase/functions/_shared/gateway.js';

// no 0/O, 1/I/L: codes are read aloud and typed from messages
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const SETTING_KEYS = ['limits', 'mallow', 'ai', 'retention', 'invites', 'desk'];

/** A new code like 7KQ2M-XW9HD (about 50 bits; wrong guesses are limited per person and network). */
export function newCode() {
  let s = '';
  for (let i = 0; i < 10; i += 1) s += ALPHABET[randomInt(ALPHABET.length)];
  return `${s.slice(0, 5)}-${s.slice(5)}`;
}

export async function inviteMac(crypt, code) {
  const c = normaliseCode(code);
  if (!c) throw new Error('not an invitation code');
  return crypt.mac(`invite:${c}`);
}

/** The commands, on a pg client or pool and a field crypt (for invitation hashes). Used by the CLI and the tests. */
export function createAdmin({ db, crypt = null, now = () => Date.now() }) {
  const call = async (sql, params = []) => (await db.query(sql, params)).rows[0]?.v;
  const settings = () => call('select hushmates_api.settings() v');
  return {
    settings,
    async invite({ count = 1, role = 'member', uses, expiresDays, note = null } = {}) {
      if (!crypt) throw new Error('HUSHMATES_MAC_KEY is needed to make invitations');
      if (!['member', 'moderator'].includes(role)) throw new Error('role is member or moderator');
      const rules = (await settings()).invites || {};
      const maxUses = Number(uses ?? rules.defaultMaxUses ?? 1);
      const days = Number(expiresDays ?? rules.defaultExpiryDays ?? 14);
      if (!(maxUses >= 1 && maxUses <= 1000)) throw new Error('uses is 1 to 1000');
      if (!(days > 0 && days <= 365)) throw new Error('expires-days is 1 to 365');
      const expires = new Date(now() + days * 86400e3);
      const out = [];
      for (let i = 0; i < Math.min(Math.max(1, count), 200); i += 1) {
        const code = newCode();
        await call('select hushmates_api.admin_create_invite($1, $2, $3, $4, $5) v', [await inviteMac(crypt, code), role, maxUses, expires, note]);
        out.push(code);
      }
      return { codes: out, role, maxUses, expires: expires.toISOString() };
    },
    async revoke(code) {
      if (!crypt) throw new Error('HUSHMATES_MAC_KEY is needed to find an invitation');
      return { revoked: !!(await call('select hushmates_api.admin_revoke_invite($1) v', [await inviteMac(crypt, code)])) };
    },
    async set(key, value) {
      if (!SETTING_KEYS.includes(key)) throw new Error(`settings are ${SETTING_KEYS.join(', ')}`);
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('the value is a JSON object to merge');
      await call('select hushmates_api.admin_set_setting($1, $2::jsonb) v', [key, JSON.stringify(value)]);
      return (await settings())[key];
    },
    ops: (days = 7) => call('select hushmates_api.ops_summary($1) v', [days]),
    member: (ref, state) => call('select hushmates_api.admin_set_member_state($1::uuid, $2) v', [ref, state]),
  };
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const opt = (name, fallback) => { const i = rest.indexOf(`--${name}`); return i >= 0 ? rest[i + 1] : fallback; };
  const pgUrl = process.env.HUSHMATES_ADMIN_PG || 'postgres://postgres@127.0.0.1:54329/hushmates_dev';
  let macKey = process.env.HUSHMATES_MAC_KEY;
  const devKeys = join(LAB_ROOT, '.data', 'dev-keys.json');
  const stagingEnv = join(LAB_ROOT, '.data', 'staging.env');
  if (!macKey && !process.env.HUSHMATES_ADMIN_PG && existsSync(devKeys)) macKey = JSON.parse(readFileSync(devKeys, 'utf8')).macKey;
  // against a real project: the key from the private staging secrets file (tools/staging-secrets.mjs)
  if (!macKey && process.env.HUSHMATES_ADMIN_PG && existsSync(stagingEnv)) macKey = /^HUSHMATES_MAC_KEY='?([^'\n]+)'?$/m.exec(readFileSync(stagingEnv, 'utf8'))?.[1];
  // invitation hashes use only the MAC key (the field crypt wants a data key too: a throwaway one)
  const crypt = macKey ? await createFieldCrypt({ keys: { unused: randomBytes(32).toString('base64') }, current: 'unused', macKey }) : null;
  const client = new pg.Client({ connectionString: pgUrl });
  await client.connect();
  try {
    const admin = createAdmin({ db: client, crypt });
    let out;
    if (cmd === 'invite') out = await admin.invite({ count: Number(opt('count', 1)), role: opt('role', 'member'), uses: opt('uses'), expiresDays: opt('expires-days'), note: opt('note', null) });
    else if (cmd === 'revoke') out = await admin.revoke(rest[0]);
    else if (cmd === 'settings') out = await admin.settings();
    else if (cmd === 'set') out = await admin.set(rest[0], JSON.parse(rest[1] || 'null'));
    else if (cmd === 'ops') out = await admin.ops(Number(opt('days', 7)));
    else if (cmd === 'member') out = await admin.member(rest[0], rest[1]);
    else { console.error('commands: invite, revoke, settings, set, ops, member (see the top of server/admin.mjs)'); process.exitCode = 2; return; }
    console.log(JSON.stringify(out, null, 2));
  } finally { await client.end(); }
}

/** Run as `node <this file>`? Compared as real paths, so spaces, % or a symlink in the path don't stop it. */
function runAsCommand() {
  try { return !!process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; }
}

if (runAsCommand()) main().catch((e) => { console.error(e.message); process.exit(1); });
