// The Hushmates Edge Function on Supabase (Deno). JavaScript with the few type notes Deno's
// checker asks for (Supabase looks for index.ts): all the logic is in ../_shared/gateway.js,
// the same code the local stack and the tests run under Node. This file only reads the
// function's secrets and wires it up. `npm run check:edge` type-checks it with Deno.
//
// Secrets (supabase secrets set …; never in the app or the repository):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   provided by Supabase
//   HUSHMATES_DATA_KEYS        {"<kid>":"<base64 32 bytes>", …}  every key words may still be locked with
//   HUSHMATES_DATA_KEY_ID      the kid new words are locked with
//   HUSHMATES_MAC_KEY          base64 32 bytes (invitation codes, duplicate checks, job secret checks)
//   HUSHMATES_JOB_SECRET       the scheduler's shared secret (also stored in Vault for pg_cron)
//   HUSHMATES_ALLOWED_ORIGINS  the app's origins, comma separated (e.g. https://hushmates-staging.example)
//   HUSHMATES_JWT_SECRET       only for a project still on the legacy shared-secret tokens
//   HUSHMATES_CLIENT_IP_HEADER optional: the header the platform sets with the caller's address (see STAGING.md)
//   HUSHMATES_AI_URL, HUSHMATES_AI_TOKEN   Another Angle, used only when the owner turns AI on
//                              (hushmates.settings 'ai'.enabled); unset = never called
//   ANOTHER_ANGLE_COST_PER_CALL_AUD, ANOTHER_ANGLE_TIMEOUT_MS   optional: the adapter's cost
//                              estimate (the budget hold uses the larger of it and the setting's) and timeout
//
// supabase/config.toml turns off Supabase's own token check for this function, because it
// checks every token itself (and the scheduler's route has no person's token).

import { createGateway } from '../_shared/gateway.js';
import { createVerifier } from '../_shared/jwt.js';
import { createFieldCrypt } from '../_shared/fieldcrypt.js';
import { createPostgrestDb } from '../_shared/postgrest-db.js';
import { createMallowFor } from '../_shared/mallow-setup.js';

const env = (name: string) => Deno.env.get(name) || '';
const must = (name: string) => { const v = env(name); if (!v) throw new Error(`the ${name} secret is not set`); return v; };

const url = must('SUPABASE_URL').replace(/\/+$/, '');
const serviceKey = must('SUPABASE_SERVICE_ROLE_KEY');
const issuer = `${url}/auth/v1`;
// the shared code only ever calls log.log and log.error
const log = { log: (...a: unknown[]) => console.log(...a), error: (...a: unknown[]) => console.error(...a) } as unknown as Console;

const db = createPostgrestDb({ url, serviceKey });
const verifier = createVerifier({
  issuers: [{
    // signed in by email code only: a password sign-up for someone else's email gets nothing
    iss: issuer, provider: 'hushmates', audience: 'authenticated', methods: ['otp', 'magiclink'],
    ...(env('HUSHMATES_JWT_SECRET') ? { hs256Secret: env('HUSHMATES_JWT_SECRET') } : { jwksUrl: `${issuer}/.well-known/jwks.json` }),
  }],
});
const crypt = await createFieldCrypt({ keys: JSON.parse(must('HUSHMATES_DATA_KEYS')), current: must('HUSHMATES_DATA_KEY_ID'), macKey: must('HUSHMATES_MAC_KEY') });
const AI_ENV = ['HUSHMATES_AI_URL', 'HUSHMATES_AI_TOKEN', 'ANOTHER_ANGLE_COST_PER_CALL_AUD', 'ANOTHER_ANGLE_TIMEOUT_MS'];
const mallow = createMallowFor({ db, env: Object.fromEntries(AI_ENV.map((k) => [k, env(k)])), log });
const gateway = createGateway({
  db, verifier, crypt, mallow, log,
  config: {
    allowedOrigins: must('HUSHMATES_ALLOWED_ORIGINS').split(',').map((s) => s.trim()).filter(Boolean),
    jobSecret: must('HUSHMATES_JOB_SECRET'),
    ownIssuers: [issuer],
    // which header carries the caller's address on the platform (default: the last x-forwarded-for entry)
    clientIpHeader: env('HUSHMATES_CLIENT_IP_HEADER') || undefined,
  },
  // deleting their data ends the person's sign-in too (only this project's own accounts)
  authAdmin: {
    async deleteUser({ subject }: { subject: string }) {
      const res = await fetch(`${issuer}/admin/users/${encodeURIComponent(subject)}`, { method: 'DELETE', headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` } });
      if (!res.ok && res.status !== 404) throw new Error(`could not delete the sign-in (${res.status})`);
    },
  // the shared JavaScript's default for it is null, which Deno's checker reads as its only type
  // deno-lint-ignore no-explicit-any
  } as any,
});

Deno.serve((req) => gateway.handle(req));
