// The Mallow as the Edge Function (and the local stack) runs it: the Reframe library always,
// Another Angle only when it is configured AND the owner's switch is on, and the database as
// the ledger that keeps AI spending under its caps.
//
//   createMallowFor({ db, env, log, now }) → { perspective(…) }   (supabase/functions/_shared/mallow.js)
//
// Settings are the database's (hushmates.settings 'ai'), read at most every 30 seconds. The
// switch is checked again inside the database at the moment of every AI call (ai_reserve), so
// turning AI off takes effect at once, and two instances can never both take the last of a cap.

import { createMallow } from './mallow.js';
import { libraryProvider } from './deps.js';
import { anotherAngleSettings, createAnotherAngle } from './ai-another-angle.js';

const SETTINGS_MS = 30e3;

/** The AI ledger, kept in the database (hushmates.ai_usage). */
export function dbUsage(db) {
  const summary = (memberId) => db.rpc('ai_summary', { p_member: memberId || null });
  return {
    async reserveAi({ memberId, journeyId, costAud }) {
      const r = await db.rpc('ai_reserve', { p: { memberId, journeyId, costAud } });
      return r?.ok ? { ok: true, id: String(r.id) } : { ok: false, reason: r?.reason || 'over-budget' };
    },
    async recordAi(row) { await db.rpc('ai_record', { p: row }); },
    async aiSpentThisMonthAud() { return Number((await summary(null)).spentThisMonthAud); },
    async aiCallsToday(memberId) { return Number((await summary(memberId)).callsTodayMember); },
    async aiCallsTodayGlobal() { return Number((await summary(null)).callsTodayGlobal); },
  };
}

export function createMallowFor({ db, env = {}, log = console, now = () => Date.now(), fetch: doFetch = globalThis.fetch }) {
  const aiConfig = anotherAngleSettings(env);
  // nothing configured, nothing that could ever be called (the switch alone isn't enough)
  const ai = aiConfig.baseUrl && (aiConfig.serviceToken || aiConfig.deviceId) ? createAnotherAngle({ ...aiConfig, fetch: doFetch, now }) : null;
  let cached = null;
  let at = 0;
  async function settings() {
    if (!cached || now() - at > SETTINGS_MS) {
      try { cached = await db.rpc('settings', {}); at = now(); } catch (e) { if (!cached) throw e; }
    }
    // the estimate the adapter was configured with, unless the owner set one in the settings
    return { ...cached, ai: { costPerCallAud: aiConfig.costPerCallAud, ...(cached?.ai || {}) } };
  }
  const mallow = createMallow({
    library: libraryProvider(), ai, settings, usage: dbUsage(db), now,
    log: { info: (m) => log.log?.(m), warn: (m) => log.log?.(m), error: (m) => log.error?.(m) },
  });
  return { ...mallow, aiConfigured: !!ai };
}
