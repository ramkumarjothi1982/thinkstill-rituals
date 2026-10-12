// Entitlement check behind one interface, used by POST /v1/session:
//
//   testing  — the current phase. Anyone with the app (and, if
//              TESTER_INVITE_CODES is set, a tester invite code) gets a
//              device token. Abuse is bounded by per-IP session caps, the
//              per-device daily quota and the global daily spend cap.
//   storekit — production. The app sends its StoreKit 2 signed transaction;
//              the server verifies it (auth/storekit.js, untested against
//              real receipts) and issues a token that expires with the
//              subscription (at most STOREKIT_TOKEN_TTL_HOURS).
//   both     — storekit when a signed transaction is sent, otherwise testing.
//
// Either way /v1/angle only ever checks the server's own signed token.

import { verifySignedTransaction } from './storekit.js';
import { keyedHash, safeEqual } from './tokens.js';

/**
 * @typedef {{ ok: true, subject: string, source: 'testing' | 'storekit', expiresAt: number }
 *         | { ok: false, status: number, code: string, message: string }} EntitlementResult
 */

/**
 * @param {{ invite: string | null, signedTransaction: string | null }} body
 * @param {import('../config.js').Config} cfg
 * @param {number} now
 * @returns {Promise<EntitlementResult>}
 */
export async function checkEntitlement(body, cfg, now) {
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
  return { ok: true, subject: `dev_${crypto.randomUUID()}`, source: 'testing', expiresAt: now + cfg.testingTokenTtlMs };
}
