(function (global) {
  "use strict";

  const STORAGE_KEY = "thinkstill_v37_9_seen_ids";
  const ALL_COUNT = 400;
  let state = { manifest: null, rituals: [], routing: null, byId: new Map() };

  const stop = new Set("a an the and or but if then to of in on at for from with without is are was were be been being i me my mine we our you your they their it this that these those do does did can could should would will just very really now".split(/\s+/));

  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  function tokens(s) {
    return norm(s).split(" ").filter(x => x && !stop.has(x));
  }
  function seenSet() {
    try {
      const arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return new Set(Array.isArray(arr) ? arr : []);
    } catch { return new Set(); }
  }
  function saveSeen(set) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  }
  function resetHistory() {
    localStorage.removeItem(STORAGE_KEY);
  }
  function scoreText(userText, label, aliases=[]) {
    const input = norm(userText);
    const it = new Set(tokens(input));
    const phrases = [label, ...aliases].map(norm);
    let score = 0;
    for (const p of phrases) {
      if (!p) continue;
      if (input.includes(p)) score += 12 + Math.min(8, p.split(" ").length);
      const pt = tokens(p);
      let overlap = 0;
      for (const t of pt) if (it.has(t)) overlap++;
      score += overlap * 3;
    }
    return score;
  }
  function bestTrigger(text) {
    let best = null;
    for (const [name, route] of Object.entries(state.routing.routes)) {
      const score = scoreText(text, name, route.aliases || []);
      if (!best || score > best.score) best = { name, score, route };
    }
    return best;
  }
  function bestPattern(text, triggerResult) {
    let best = null;
    for (const p of triggerResult.route.patterns || []) {
      const score = scoreText(text, p.name, []);
      if (!best || score > best.score) best = { name:p.name, score, ritual_ids:p.ritual_ids };
    }
    return best;
  }
  function candidateScore(text, ritual, triggerScore, patternScore) {
    let score = triggerScore * 3 + patternScore * 4;
    score += scoreText(text, ritual.title, []);
    score += scoreText(text, ritual.goal, []);
    for (const s of ritual.steps || []) score += scoreText(text, `${s.move} ${s.action}`, []) * 0.15;
    return score;
  }
  function select(text) {
    if (!state.rituals.length) throw new Error("ThinkStill not initialized.");
    let seen = seenSet();
    if (seen.size >= ALL_COUNT) {
      seen = new Set();
      saveSeen(seen);
    }

    const tr = bestTrigger(text);
    const pr = bestPattern(text, tr);
    let ids = (pr && pr.score > 0 ? pr.ritual_ids : tr.route.ritual_ids) || [];
    let candidates = ids.map(id => state.byId.get(id)).filter(Boolean).filter(r => !seen.has(r.id));

    // If the matched pocket is exhausted, stay in the same trigger; then fall back globally.
    if (!candidates.length) {
      candidates = tr.route.ritual_ids.map(id => state.byId.get(id)).filter(Boolean).filter(r => !seen.has(r.id));
    }
    if (!candidates.length) {
      candidates = state.rituals.filter(r => !seen.has(r.id));
    }

    const patternScore = pr ? pr.score : 0;
    candidates.sort((a,b) => {
      const d = candidateScore(text,b,tr.score,patternScore) - candidateScore(text,a,tr.score,patternScore);
      return d || a.ritual_number - b.ritual_number;
    });

    const ritual = candidates[0];
    seen.add(ritual.id);
    saveSeen(seen);
    return {
      ritual,
      match: { trigger: tr.name, pattern: pr ? pr.name : null },
      seen_count: seen.size,
      remaining: ALL_COUNT - seen.size
    };
  }

  async function init(manifestUrl="./manifest.json") {
    const loaded = await global.ThinkStillLoader.load(manifestUrl);
    state.manifest = loaded.manifest;
    state.rituals = loaded.rituals;
    state.routing = loaded.routing;
    state.byId = new Map(state.rituals.map(r => [r.id,r]));
    return state.manifest;
  }

  function historyStatus() {
    const seen = seenSet();
    return { seen: seen.size, remaining: Math.max(0, ALL_COUNT - seen.size), total: ALL_COUNT };
  }

  global.ThinkStill = { init, select, resetHistory, historyStatus, STORAGE_KEY };
})(window);
