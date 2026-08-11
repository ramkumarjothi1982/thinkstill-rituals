(() => {
  "use strict";

  const STORAGE = {
    seen: "thinkstill_seen_v37_9",
    theme: "thinkstill_theme_v37_9",
    lastIssue: "thinkstill_last_issue_v37_9"
  };

  let rituals = [];
  let routing = null;
  let current = null;
  let lastQuery = "";

  const $ = (id) => document.getElementById(id);

  const normalize = (s) => String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = (s) => new Set(normalize(s).split(" ").filter(w => w.length > 2));

  function getSeen() {
    try {
      const x = JSON.parse(localStorage.getItem(STORAGE.seen) || "[]");
      return Array.isArray(x) ? x : [];
    } catch { return []; }
  }

  function setSeen(ids) {
    localStorage.setItem(STORAGE.seen, JSON.stringify(ids.slice(-400)));
  }

  function markSeen(id) {
    let seen = getSeen();
    if (!seen.includes(id)) seen.push(id);
    if (seen.length >= rituals.length) {
      // Keep the just-served ritual as the first item in the fresh cycle.
      seen = [id];
    }
    setSeen(seen);
  }

  function tokenizeScore(query, ritual) {
    const q = words(query);
    if (!q.size) return 0;

    const route = ritual.routing || {};
    const hay = [
      route.release_trigger,
      route.secondary_trigger,
      route.release_pattern,
      route.original_trigger,
      route.original_pattern,
      ritual.goal,
      ritual.title
    ].filter(Boolean).join(" ");

    const h = words(hay);
    let overlap = 0;
    q.forEach(w => { if (h.has(w)) overlap += 1; });

    const nq = normalize(query);
    let phraseBoost = 0;
    [route.release_trigger, route.secondary_trigger, route.release_pattern].filter(Boolean).forEach(v => {
      const nv = normalize(v);
      if (nv && (nq.includes(nv) || nv.includes(nq))) phraseBoost += 8;
    });

    return overlap + phraseBoost;
  }

  function pickRitual(query) {
    const seen = new Set(getSeen());
    let pool = rituals.filter(r => !seen.has(r.id));
    if (!pool.length) {
      setSeen([]);
      pool = [...rituals];
    }

    const scored = pool.map(r => ({ r, score: tokenizeScore(query, r) }));
    const max = Math.max(...scored.map(x => x.score), 0);
    let best = scored.filter(x => x.score === max).map(x => x.r);

    if (!query.trim() || max === 0) {
      best = pool;
    }

    return best[Math.floor(Math.random() * best.length)];
  }

  function parseSteps(text) {
    return String(text || "").split(/\n(?=\d+\.\s)/).map(s => s.trim()).filter(Boolean);
  }

  function render(ritual) {
    current = ritual;
    $("bubbleBadge").textContent = ritual.bubble;
    $("playTime").textContent = ritual.play_time;
    $("ritualTitle").textContent = ritual.title;
    $("goal").textContent = ritual.goal;
    $("win").textContent = ritual.win;
    $("formulaFlow").textContent = ritual.formula_flow;
    $("safety").textContent = ritual.safety;

    $("steps").replaceChildren(...parseSteps(ritual.steps).map(line => {
      const div = document.createElement("div");
      div.className = "step";
      const m = line.match(/^(\d+\.)\s*([^—-]+)\s*[—-]\s*(.*)$/s);
      if (m) {
        const strong = document.createElement("strong");
        strong.textContent = `${m[1]} ${m[2].trim()} — `;
        div.append(strong, document.createTextNode(m[3].trim()));
      } else {
        div.textContent = line;
      }
      return div;
    }));

    const supportLines = String(ritual.supports || "")
      .split("\n")
      .map(s => s.replace(/^[•\-]\s*/, "").trim())
      .filter(Boolean);

    $("supports").replaceChildren(...supportLines.map(line => {
      const div = document.createElement("div");
      div.className = "support-line";
      div.textContent = `• ${line}`;
      return div;
    }));

    $("ritualCard").classList.remove("hidden");
    $("status").textContent = "Matched from the locked 400-ritual library.";
    markSeen(ritual.id);
    $("ritualCard").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function find() {
    const query = $("issue").value.trim();
    lastQuery = query;
    localStorage.setItem(STORAGE.lastIssue, query);
    const ritual = pickRitual(query);
    if (ritual) render(ritual);
  }

  async function copyCurrent() {
    if (!current) return;
    const text = [
      current.bubble,
      current.title,
      "",
      "GOAL",
      current.goal,
      "",
      "RITUAL",
      current.steps,
      "",
      "WIN",
      current.win,
      "",
      current.supports,
      "",
      "FORMULA FLOW",
      current.formula_flow,
      "",
      current.safety
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      $("status").textContent = "Ritual copied.";
    } catch {
      $("status").textContent = "Copy was blocked by this browser.";
    }
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE.theme, theme);
  }

  function toggleTheme() {
    const now = document.documentElement.dataset.theme || "dark";
    applyTheme(now === "dark" ? "light" : "dark");
  }

  async function boot() {
    const theme = localStorage.getItem(STORAGE.theme) || "dark";
    applyTheme(theme);

    try {
      const [ritualRes, routeRes] = await Promise.all([
        fetch("rituals.json", { cache: "no-store" }),
        fetch("routing.json", { cache: "no-store" })
      ]);
      if (!ritualRes.ok || !routeRes.ok) throw new Error("Data files unavailable.");
      rituals = await ritualRes.json();
      routing = await routeRes.json();

      const prior = localStorage.getItem(STORAGE.lastIssue) || "";
      $("issue").value = prior;
      $("status").textContent = `${rituals.length} locked rituals ready.`;
    } catch (err) {
      $("status").textContent = "Could not load ritual data. Open through a web server or GitHub Pages.";
      console.error(err);
    }
  }

  $("findBtn").addEventListener("click", find);
  $("anotherBtn").addEventListener("click", () => {
    const ritual = pickRitual(lastQuery || $("issue").value.trim());
    if (ritual) render(ritual);
  });
  $("copyBtn").addEventListener("click", copyCurrent);
  $("themeToggle").addEventListener("click", toggleTheme);
  $("issue").addEventListener("keydown", e => {
    if (e.key === "Enter") find();
  });

  boot();
})();
