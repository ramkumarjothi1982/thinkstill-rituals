(function (global) {
  'use strict';

  var DEFAULT_SEEN_KEY = 'thinkstill_v6_seen_ids';

  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9']+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function tokens(s) {
    return norm(s).split(' ').filter(function (x) { return x.length >= 3; });
  }

  function loadSeen(key) {
    try {
      var v = JSON.parse(localStorage.getItem(key || DEFAULT_SEEN_KEY) || '[]');
      return new Set(Array.isArray(v) ? v : []);
    } catch (_) { return new Set(); }
  }

  function saveSeen(seen, key) {
    try { localStorage.setItem(key || DEFAULT_SEEN_KEY, JSON.stringify(Array.from(seen))); } catch (_) {}
  }

  function clearSeen(key) {
    try { localStorage.removeItem(key || DEFAULT_SEEN_KEY); } catch (_) {}
  }

  function isSafetyIntent(query, routing) {
    var q = norm(query);
    var phrases = (routing && routing.safety_intent_phrases) || [];
    return phrases.some(function (p) { return q.indexOf(norm(p)) >= 0; });
  }

  function detectIntents(query, routing) {
    var q = ' ' + norm(query) + ' ';
    var out = [];
    var groups = (routing && routing.route_intents) || {};
    Object.keys(groups).forEach(function (name) {
      var aliases = groups[name] || [];
      if (aliases.some(function (a) { return q.indexOf(' ' + norm(a) + ' ') >= 0 || q.indexOf(norm(a)) >= 0; })) out.push(name);
    });
    return out;
  }

  function bubbleHint(query, routing) {
    var q = norm(query);
    var lang = (routing && routing.bubble_language) || {};
    var best = null, bestScore = 0;
    Object.keys(lang).forEach(function (bubble) {
      var score = 0;
      (lang[bubble] || []).forEach(function (term) { if (q.indexOf(norm(term)) >= 0) score += 1; });
      if (score > bestScore) { bestScore = score; best = bubble; }
    });
    return best;
  }

  function scoreRitual(r, query, routing, recentBubbles) {
    var q = norm(query);
    var qTokens = tokens(q);
    var intents = detectIntents(q, routing);
    var safety = isSafetyIntent(q, routing);
    var support = !!String(r.support_first || '').trim();
    if (safety && !support) return -100000;
    var score = 0;
    if (!safety && support) score -= 18;
    var cats = Array.isArray(r.route_categories) ? r.route_categories : [];
    intents.forEach(function (intent) {
      if (cats.indexOf(intent) >= 0) score += 14;
      var bias = routing && routing.intent_bubble_bias && routing.intent_bubble_bias[intent];
      if (bias && bias[r.bubble]) score += Number(bias[r.bubble] || 0);
    });
    var rk = new Set((r.routing_keywords || []).map(norm));
    qTokens.forEach(function (t) { if (rk.has(t)) score += 2.3; });
    var bestFor = norm(r.best_for);
    qTokens.forEach(function (t) { if (bestFor.indexOf(t) >= 0) score += 1.2; });
    var titleMission = norm((r.title || '') + ' ' + (r.mission || ''));
    qTokens.forEach(function (t) { if (titleMission.indexOf(t) >= 0) score += 0.7; });
    var hint = bubbleHint(q, routing);
    if (hint && hint === r.bubble) score += 1.5;
    if (recentBubbles && recentBubbles.indexOf(r.bubble) >= 0) score -= 0.35;
    score += Math.random() * 0.05;
    return score;
  }

  function choose(rituals, query, routing, options) {
    options = options || {};
    var seen = options.seen || loadSeen(options.seenKey);
    var safety = isSafetyIntent(query, routing);
    var available = rituals.filter(function (r) { return !seen.has(r.id); });
    if (!available.length) {
      seen.clear();
      saveSeen(seen, options.seenKey);
      available = rituals.slice();
    }
    var scored = available.map(function (r) {
      return { ritual: r, score: scoreRitual(r, query, routing, options.recentBubbles || []) };
    }).sort(function (a, b) { return b.score - a.score; });
    var selected = scored[0] && scored[0].ritual;

    // Safety wins over novelty. If all support-first rows have been seen, never fall through to an inward ritual.
    if (safety && (!selected || !String(selected.support_first || '').trim())) {
      var supports = rituals.filter(function (r) { return String(r.support_first || '').trim(); });
      selected = supports[Math.floor(Math.random() * supports.length)] || selected;
    }

    if (selected) {
      seen.add(selected.id);
      saveSeen(seen, options.seenKey);
    }
    return { ritual: selected || null, seen: seen, safetyIntent: safety };
  }

  global.ThinkStillRouter = {
    norm: norm,
    tokens: tokens,
    loadSeen: loadSeen,
    saveSeen: saveSeen,
    clearSeen: clearSeen,
    isSafetyIntent: isSafetyIntent,
    detectIntents: detectIntents,
    choose: choose,
    scoreRitual: scoreRitual
  };
})(window);
