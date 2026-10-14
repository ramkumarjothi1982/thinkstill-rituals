// Mallow perspective providers: where the optional fallback comes from.
//
// Human first. These run only when the owner allowed a Mallow perspective,
// nobody has caught the feeling for a while, and the relay has reserved the
// single generation this feeling may ever have. Each provider returns
//   { status: 'ok', text, mallow, source: 'ai' | 'library' | 'demo', model? }
//   { status: 'support' }        the words need care, not a reframe
//   { status: 'unavailable', reason }
//
// 1. anotherAngleProvider: Claude Account 1's Another Angle server (POST
//    /v1/angle), the AI reframe being built for the main app. It owns the
//    model call, prompt, safety gate, quality gate and spending caps; we never
//    build a second AI system. Production: called from a Hushmates server
//    function, never from a browser (the token and the person's words stay
//    server-side). Not configured in the lab by default.
// 2. libraryProvider: the main app's authored Reframe engine
//    (src/ultra/reframe-engine.js), the same offline path Another Angle falls
//    back to. Real, free, on-device. Not AI, and labelled so.
// 3. demoProvider: fixed development examples, one per Mallow personality. Shown as "Example for
//    testing, not generated", and refused outside the lab (RelayService cannedExamples).

import { checkSafety, matchScenarios, detectPatterns, buildAngles } from '../../src/ultra/reframe-engine.js';

// ------------------------------------------------- the authored library --
// Which kinds of authored angle each Mallow reaches for first (their voice).
const KIND_PREFERENCE = {
  noomi: ['self-compassion', 'context', 'benign'],
  blubi: ['self-compassion', 'benign', 'context'],
  pipzi: ['benign', 'neutral', 'context'],
  boppo: ['worry-partly-true', 'benign', 'self-compassion'],
  zuzu: ['neutral', 'benign', 'context'],
  loomi: ['context', 'neutral', 'benign'],
  glitzi: ['worry-partly-true', 'neutral', 'benign'],
};

export function libraryProvider() {
  return async ({ text, mallow = 'loomi' }) => {
    const safety = checkSafety(text);
    if (!safety.reframeAppropriate) return { status: 'support' };
    const ranked = matchScenarios(text);
    // only use a situation-specific angle when the match is likely; otherwise the general framework
    const best = ranked.find((r) => r.confidence === 'likely') || ranked[ranked.length - 1];
    const angles = buildAngles(best.scenario, { interpretation: text, patterns: detectPatterns(text) })
      // scenario angles are written for the situation; pattern angles quote the person back, keep them out
      .filter((a) => a.source !== 'pattern' && a.text && !/[“”"]/.test(a.text));
    const prefs = KIND_PREFERENCE[mallow] || KIND_PREFERENCE.loomi;
    const pick = prefs.map((k) => angles.find((a) => a.kind === k)).find(Boolean) || angles[0];
    if (!pick) return { status: 'unavailable', reason: 'no-angle' };
    return { status: 'ok', text: pick.text, mallow, source: 'library', model: `reframe-library:${best.scenario.id}` };
  };
}

// ----------------------------------------------------- the demo example --
const DEMO_LINES = {
  worry: 'Worry often borrows trouble from a future that hasn’t happened yet. What would you tell a friend in the same spot?',
  sadness: 'It makes sense that this feels heavy. Sadness can be a sign of how much something mattered to you.',
  anger: 'Your anger might be pointing at something that genuinely needs to change. What would a fair next step look like?',
  joy: 'This sounds worth savouring. What made it feel good, and how could you make a little more room for that?',
  loneliness: 'Feeling lonely around people can mean you’re missing being truly seen, not that something is wrong with you.',
  confusion: 'Not knowing yet is allowed. Could you pick one small question to answer first, and leave the rest for later?',
  frustration: 'Frustration often shows up when we care and feel stuck. Is there one part of this you can influence today?',
  excitement: 'Being excited and afraid at once is common: it means it matters. What would a small first step look like?',
  none: 'There might be more than one way to read this. What would someone who cares about you notice that you might be missing?',
};
// The same idea in each Mallow's voice (relay-rules MALLOW_VOICES), so the lab shows the personalities.
const DEMO_VOICES = {
  noomi: 'It makes sense this is weighing on you. Could there be a softer reading of it, the kind you’d offer someone you love?',
  blubi: 'That sounds like it has been sitting heavily with you. What might change if it meant a little less than it seems to right now?',
  pipzi: 'What if we turned this round for a moment? If it were a friend’s story, what lighter version might you spot?',
  boppo: 'You’re looking at this carefully, and that takes care. What’s one small part of it that’s still in your hands?',
  zuzu: 'Imagine looking back on this a year from now. Which part do you think you’d still notice, and which might have faded?',
  loomi: 'Let’s separate what happened from what it might mean. What do you know for sure, and what are you guessing?',
  glitzi: 'Your mind might be writing the worst-case script again. What would the less dramatic version of this story say?',
};
export function demoProvider() {
  return async ({ label, mallow = 'loomi' }) => ({ status: 'ok', text: DEMO_VOICES[mallow] || DEMO_LINES[label] || DEMO_LINES.none, mallow, source: 'demo', model: 'demo-canned-v1' });
}

// ------------------------------------------- Account 1's Another Angle --
// The relay's eight labels are all ids in the server's emotion taxonomy.
const EMOTION = { worry: 'worry', sadness: 'sadness', anger: 'anger', joy: 'joy', loneliness: 'loneliness', confusion: 'confusion', frustration: 'frustration', excitement: 'excitement' };

/**
 * @param {object} o
 *   baseUrl    the Another Angle deployment (e.g. https://another-angle.example.workers.dev)
 *   session    async () => bearer token (POST /v1/session with the service's own device id or service entitlement)
 *   fetch      fetch implementation (server-side in production)
 *   timeoutMs  one deadline for the whole answer: health, session, request and body
 */
export function anotherAngleProvider({ baseUrl, session, fetch: doFetch = globalThis.fetch, timeoutMs = 30000 } = {}) {
  const base = String(baseUrl || '').replace(/\/$/, '');
  let token = null;
  const timeout = (signal, ms) => new Promise((resolve) => {
    const t = setTimeout(() => resolve({ timedOut: true }), ms);
    signal?.addEventListener?.('abort', () => { clearTimeout(t); resolve({ timedOut: true }); }, { once: true });
  });
  /** Is the server running the real model right now? Asked for every answer (one cheap GET per feeling, at most),
   *  never cached, so a redeploy to the mock provider can't be labelled AI. → true | false | null (unknown) */
  const isLive = async (signal) => {
    try {
      const res = await doFetch(`${base}/v1/health`, { signal });
      if (!res.ok) return null;
      const h = await res.json();
      return h?.provider === 'anthropic' && !!h?.configured?.provider_key;
    } catch { return null; }
  };
  const call = async (body, signal) => {
    if (!token) {
      const t = await Promise.race([session(), timeout(signal, timeoutMs)]);
      if (!t || t.timedOut || typeof t !== 'string') throw Object.assign(new Error('no session'), { code: 'session' });   // refused, limited or too slow
      token = t;
    }
    return doFetch(`${base}/v1/angle`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      signal,
    });
  };
  const answer = async ({ text, label, requestId }, signal) => {
    if (!base || !session) return { status: 'unavailable', reason: 'unconfigured' };
    const body = { consent: true, text, emotion: EMOTION[label] || 'something-else', intention: 'steady', locale: 'en-GB', ...(requestId ? { request_id: requestId } : {}) };
    let res;
    let data;
    try {
      res = await call(body, signal);
      if (res.status === 401) { token = null; res = await call(body, signal); }   // one fresh session, once
      if (res.status === 429) return { status: 'unavailable', reason: 'limit' };
      if (!res.ok) return { status: 'unavailable', reason: `http-${res.status}` };
      data = await res.json();                                                   // the deadline covers the body too
    } catch (e) {
      return { status: 'unavailable', reason: e?.code === 'session' ? 'session' : signal?.aborted ? 'timeout' : 'network' };
    }
    if (data.status === 'crisis' || data.status === 'care') return { status: 'support', level: data.status, support: data.support || null };
    if (data.status !== 'ok' || !data.scene) return { status: 'unavailable', reason: data.fallback?.reason || 'fallback' };
    const sc = data.scene;
    const line = [sc.subtitle_line_1, sc.subtitle_line_2].filter(Boolean).join(' ') || sc.alternative_angle;
    if (!line) return { status: 'unavailable', reason: 'empty' };
    // only a real model answer is labelled AI-generated; the mock provider is a demo; unknown is not shown at all
    const ai = await isLive(signal);
    if (ai === null) return { status: 'unavailable', reason: 'provenance-unknown' };
    return { status: 'ok', text: line, mallow: sc.mallow_character, source: ai ? 'ai' : 'demo', model: `${data.prompt_version || 'another-angle'}${ai ? '' : ':mock'}` };
  };
  return async (args) => {
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = setTimeout(() => ctl?.abort(), timeoutMs);
    try {
      const out = await Promise.race([answer(args, ctl?.signal), timeout(ctl?.signal, timeoutMs + 50)]);
      return out?.timedOut ? { status: 'unavailable', reason: 'timeout' } : out;
    } finally { clearTimeout(timer); ctl?.abort(); }
  };
}

/** Try providers in order; the first that answers (ok or support) wins. */
export function chain(...providers) {
  return async (args) => {
    let last = { status: 'unavailable', reason: 'none' };
    for (const p of providers.filter(Boolean)) {
      try {
        const r = await p(args);
        if (r && (r.status === 'ok' || r.status === 'support')) return r;
        last = r || last;
      } catch { last = { status: 'unavailable', reason: 'error' }; }
    }
    return last;
  };
}
