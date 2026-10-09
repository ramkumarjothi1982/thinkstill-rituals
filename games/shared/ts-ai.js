/* ThinkStill AI adapter (instance-scoped)
 * One call surface for every game. Back ends, tried in order:
 *   1. opts.reason(prompt, {tier, game}) or window.ThinkStillHost.reason   (a host page that owns the model)
 *   2. opts.aiEndpoint: POST {game, tier, prompt} -> {text}                 (Framer: the ThinkStill AI proxy)
 *   3. parent-frame bridge via postMessage                                  (an embed whose parent owns the key)
 *   4. claude.ai artifact runtime: claude.use("sample")                     (the viewer's own Claude account)
 * With none available the games use their deterministic local engines, so play never blocks.
 */
(function (env) {
  'use strict';
  const TS = env.TS, opts = TS.opts;
  const AI = (TS.ai = {});

  let samplerPromise = null;
  function claudeSampler() {
    if (samplerPromise) return samplerPromise;
    const c = window.claude;
    if (!c || typeof c.use !== 'function' || opts.framer) { samplerPromise = Promise.resolve(null); return samplerPromise; }
    samplerPromise = c.use('sample').then(s => s || null).catch(() => null);
    return samplerPromise;
  }

  let disabled = false; // after a permanent refusal (viewer declined, sampling disabled)
  AI.disable = () => { disabled = true; };
  const hostReason = () => (typeof opts.reason === 'function' ? opts.reason : (window.ThinkStillHost && typeof window.ThinkStillHost.reason === 'function' ? window.ThinkStillHost.reason.bind(window.ThinkStillHost) : null));
  const endpoint = () => (typeof opts.aiEndpoint === 'string' && /^https:\/\/|^http:\/\/(localhost|127\.0\.0\.1)/.test(opts.aiEndpoint.trim()) ? opts.aiEndpoint.trim() : '');

  AI.available = async () => {
    if (disabled || opts.staticRender || opts.aiMode === 'local') return null;
    if (hostReason()) return 'host';
    if (endpoint()) return 'endpoint';
    if (TS.aiBridge) return 'bridge';
    const s = await claudeSampler();
    return s ? 'claude' : null;
  };

  let rpcId = 0;
  const pending = new Map();
  TS.on('host-message', (m) => {
    if (m.type !== 'thinkstill:ai:result' || !pending.has(m.id)) return;
    const p = pending.get(m.id); pending.delete(m.id);
    if (m.error) p.reject({ code: 'upstream_error', message: String(m.error) }); else p.resolve(String(m.text || ''));
  });
  TS.onDestroy(() => { pending.forEach(p => p.reject({ code: 'cancelled' })); pending.clear(); });

  /* Only pass options that are set: the artifact runtime validates every key it is given. */
  function sampleOpts(o) {
    const s = { modelTier: o.tier || 'default' };
    if (o.signal) s.signal = o.signal;
    if (typeof o.onText === 'function') s.onText = o.onText;
    return s;
  }

  async function viaEndpoint(prompt, o) {
    const ctl = new AbortController();
    const kill = TS.later(() => ctl.abort(), o.timeoutMs || 28000);
    const outer = o.signal;
    const onAbort = () => ctl.abort();
    if (outer) outer.addEventListener('abort', onAbort);
    try {
      const res = await fetch(endpoint(), {
        method: 'POST', headers: { 'content-type': 'application/json' }, signal: ctl.signal,
        body: JSON.stringify({ game: TS.game.id, tier: o.tier || 'default', prompt })
      });
      if (res.status === 429) throw { code: 'rate_limited' };
      if (!res.ok) throw { code: 'upstream_error', message: 'HTTP ' + res.status };
      const data = await res.json();
      if (!data || typeof data.text !== 'string') throw { code: 'invalid_json' };
      return data.text;
    } catch (e) {
      if (e && e.name === 'AbortError') throw { code: outer && outer.aborted ? 'cancelled' : 'timeout' };
      throw e && e.code ? e : { code: 'upstream_error', message: String(e && e.message || e) };
    } finally {
      TS.cancel(kill);
      if (outer) outer.removeEventListener('abort', onAbort);
    }
  }

  AI.text = async (prompt, o) => {
    o = o || {};
    const via = await AI.available();
    if (via === 'host') return String(await hostReason()(prompt, { tier: o.tier || 'default', game: TS.game.id }));
    if (via === 'endpoint') return viaEndpoint(prompt, o);
    if (via === 'bridge') {
      return new Promise((resolve, reject) => {
        const id = ++rpcId; pending.set(id, { resolve, reject });
        TS.post({ type: 'thinkstill:ai', id, prompt, tier: o.tier || 'default', game: TS.game.id });
        TS.later(() => { if (pending.has(id)) { pending.delete(id); reject({ code: 'timeout' }); } }, o.timeoutMs || 28000);
        if (o.signal) o.signal.addEventListener('abort', () => { if (pending.has(id)) { pending.delete(id); reject({ code: 'cancelled' }); } });
      });
    }
    if (via === 'claude') {
      const s = await claudeSampler();
      const r = await s(prompt, sampleOpts(o));
      return r.text;
    }
    throw { code: 'unavailable', message: 'No AI back end in this view' };
  };

  AI.json = async (prompt, o) => {
    o = o || {};
    const via = await AI.available();
    if (via === 'claude') {
      const s = await claudeSampler();
      return s.json(prompt, sampleOpts(o));
    }
    return AI.parse(await AI.text(prompt, o));
  };

  /* Tolerant JSON parse: whole text, a fenced block, or first { to last }. */
  AI.parse = (text) => {
    const t = String(text || '').trim();
    const tries = [t];
    const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(t);
    if (fence) tries.push(fence[1]);
    const a = t.indexOf('{'), b = t.lastIndexOf('}');
    if (a >= 0 && b > a) tries.push(t.slice(a, b + 1));
    for (const s of tries) { try { return JSON.parse(s); } catch (e) { /* next */ } }
    throw { code: 'invalid_json', message: 'Could not parse AI reply' };
  };

  /* What a game should do about a failure. */
  AI.failure = (e) => {
    const code = (e && e.code) || 'upstream_error';
    if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(code)) { disabled = true; return 'offline'; }
    if (code === 'unavailable') return 'offline';
    if (code === 'cancelled') return 'cancelled';
    if (code === 'refused') return 'refused';
    return 'fallback';
  };

  /* Shared guardrails prepended to every game prompt. */
  AI.GUARDRAILS = [
    'You are the reasoning engine inside ThinkStill, a playful game that helps people with everyday emotional moments.',
    'Rules you must follow:',
    '- Use only what the player wrote. Never invent facts about their life, names, dates or events.',
    '- Do not diagnose, label disorders, or give medical, legal or financial advice.',
    '- Respect real concerns. Never tell the player a worry is silly or certainly wrong.',
    '- If the text mentions suicide, self-harm, wanting to die, abuse, violence, being unsafe, or a medical emergency, set "safety" to "support" and keep every other field minimal.',
    '- If it involves health results, legal trouble, debt or housing risk, set "safety" to "care": stay gentle and point toward proper help in the next steps.',
    '- Keep every string short, plain and kind. No emoji. Australian/British spelling.'
  ].join('\n');

  AI.vibeGuide = (vibe) => ({
    Jolly: 'Voice: warm, upbeat, gently funny, like a kind friend who makes you smile.',
    Cheeky: 'Voice: playful and teasing, quick wit, a little sass, never mean.',
    Unfiltered: 'Voice: blunt, punchy, irreverent; mild words like "damn" are fine; no slurs, no cruelty, never mock the player.'
  }[vibe] || 'Voice: warm and gently funny.');
})(window.TSG_ENV);
