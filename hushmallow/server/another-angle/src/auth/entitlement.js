// Entitlement check behind one interface, used by POST /v1/session:
//
//   testing  — the current phase. Anyone with the app (and, if
//              TESTER_INVITE_CODES is set, a tester invite code) gets a
//              device token. The subject is a keyed hash of the app's own
//              device_id, so a new session for the same device keeps the same
//              daily allowance (without a device_id each session gets a fresh
//              one). Abuse is bounded by per-network session caps, the daily
//              allowance per subject and the global daily spend cap.
//   storekit — production. The app sends its StoreKit 2 signed transaction;
//              the server verifies it (auth/storekit.js, untested against
//              real receipts) and issues a token that expires with the
//              subscription (at most STOREKIT_TOKEN_TTL_HOURS).
//   both     — storekit when a signed transaction is sent, otherwise testing.
//   billing  — the web (Stripe, src/billing/). The app sends the signed-in
//              account's Supabase access token (Authorization: Bearer); the
//              server checks it with the sign-in project and needs an active
//              hushmallow Beyond subscription for that account, as the Stripe
//              webhook recorded it. The token's subject is a keyed hash of the
//              account id, so the daily allowance is per subscriber (on every
//              device), and it expires with the paid period (at most
//              BILLING_TOKEN_TTL_HOURS). No invite code is accepted.
//   billing+testing — billing, or a valid tester invite code (a testing
//              session exactly as in testing mode, with its caps). Only with
//              TESTER_INVITE_CODES set; without codes it is billing alone,
//              never open to anyone.
//
// Either way /v1/angle only ever checks the server's own signed token.

import { verifySignedTransaction } from './storekit.js';
import { keyedHash, safeEqual } from './tokens.js';

/**
 * @typedef {{ ok: true, subject: string, source: 'testing' | 'storekit' | 'billing', expiresAt: number }
 *         | { ok: false, status: number, code: string, message: string }} EntitlementResult
 * @typedef {{ accountToken?: string | null,
 *   beyond?: (token: string) => Promise<{ ok: true, uid: string, until: number } | { ok: false, status: number, code: string, message: string }> }} BillingDeps
 */

/**
 * @param {{ invite: string | null, signedTransaction: string | null, deviceId?: string | null }} body
 * @param {import('../config.js').Config} cfg
 * @param {number} now
 * @param {BillingDeps} [deps] billing modes only: the account's token and the subscription check (src/billing/routes.js)
 * @returns {Promise<EntitlementResult>}
 */
export async function checkEntitlement(body, cfg, now, deps = {}) {
  if (cfg.entitlementMode === 'billing' || cfg.entitlementMode === 'billing+testing') return billingEntitlement(body, cfg, now, deps);
  const useStoreKit = cfg.entitlementMode === 'storekit' || (cfg.entitlementMode === 'both' && body.signedTransaction);
  if (useStoreKit) {
    if (!body.signedTransaction) return { ok: false, status: 401, code: 'transaction_required', message: 'Send the StoreKit signed transaction for hushmallow Beyond.' };
    const r = await verifySignedTransaction(body.signedTransaction, cfg.apple, now);
    if (!r.ok) {
      const status = r.code === 'storekit_not_configured' ? 503 : r.code === 'expired' || r.code === 'revoked' || r.code === 'not_beyond' ? 403 : 401;
      return { ok: false, status, code: r.code, message: 'The subscription could not be verified.' };
    }
    const subject = `st_${await keyedHash(cfg.hashKey, `otid:${r.originalTransactionId}`)}`;
    return { ok: true, subject, source: 'storekit', expiresAt: Math.min(r.expiresAt, now + cfg.storekitTokenTtlMs) };
  }
  if (cfg.inviteCodes.length) {
    let match = false;
    for (const code of cfg.inviteCodes) if (body.invite && (await safeEqual(body.invite.trim(), code, cfg.hashKey))) match = true;
    if (!match) return { ok: false, status: 403, code: 'invite_required', message: 'A tester invite code is required during the testing phase.' };
  }
  const subject = body.deviceId ? `dev_${await keyedHash(cfg.hashKey, `device:${body.deviceId}`)}` : `dev_${crypto.randomUUID()}`;
  return { ok: true, subject, source: 'testing', expiresAt: now + cfg.testingTokenTtlMs };
}

/** @param {string | null} invite @param {import('../config.js').Config} cfg */
async function inviteMatches(invite, cfg) {
  let match = false;
  for (const code of cfg.inviteCodes) if (invite && (await safeEqual(invite.trim(), code, cfg.hashKey))) match = true;
  return match;
}

/**
 * @param {{ invite: string | null, deviceId?: string | null }} body @param {import('../config.js').Config} cfg @param {number} now @param {BillingDeps} deps
 * @returns {Promise<EntitlementResult>}
 */
async function billingEntitlement(body, cfg, now, { accountToken = null, beyond } = {}) {
  const testers = cfg.entitlementMode === 'billing+testing' && cfg.inviteCodes.length > 0;
  /** @type {EntitlementResult | null} */
  let refused = null;
  if (accountToken) {
    const r = beyond ? await beyond(accountToken) : { ok: /** @type {const} */ (false), status: 503, code: 'billing_not_configured', message: 'Web subscriptions are not set up on this server.' };
    if (r.ok) {
      const subject = `acct_${await keyedHash(cfg.hashKey, `account:${r.uid}`)}`;
      return { ok: true, subject, source: 'billing', expiresAt: Math.min(now + cfg.billing.tokenTtlMs, r.until) };
    }
    refused = { ok: false, status: r.status, code: r.code, message: r.message };
  }
  // a tester's invite code (billing+testing with codes set): the testing session, as in testing mode
  if (testers && body.invite) {
    if (await inviteMatches(body.invite, cfg)) {
      const subject = body.deviceId ? `dev_${await keyedHash(cfg.hashKey, `device:${body.deviceId}`)}` : `dev_${crypto.randomUUID()}`;
      return { ok: true, subject, source: 'testing', expiresAt: now + cfg.testingTokenTtlMs };
    }
    if (!refused) return { ok: false, status: 403, code: 'invite_required', message: 'That tester invite code is not one of ours.' };
  }
  return refused || { ok: false, status: 401, code: 'account_required', message: 'Sign in with a hushmallow Beyond subscription.' };
}
