import { loadThinkStill } from "./thinkstill-loader.js";

const STORAGE_KEY = "thinkstill_v58_20_5_seen_ids";
const THEME_KEY = "thinkstill_theme";

const STOP = new Set([
  "the","a","an","and","or","to","of","in","on","for","with","is","it","this","that",
  "i","me","my","you","your","we","our","be","am","are","was","were","do","does","did",
  "have","has","had","very","really","just","from","at","as"
]);

const CRISIS_PHRASES = [
  "suicide","suicidal","kill myself","end my life","want to die","don't want to live",
  "dont want to live","self harm","self-harm","hurt myself","overdose",
  "kill someone","hurt someone","weapon","immediate danger"
];

let DATA = null;
let currentQuery = "";

const $ = (id) => document.getElementById(id);

function normalize(s = "") {
  return s.toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function tokens(s = "") {
  return normalize(s).split(" ").filter(w => w.length > 2 && !STOP.has(w));
}
function getSeen() {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")); }
  catch { return new Set(); }
}
function saveSeen(seen) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen]));
}
function markSeen(id) {
  const seen = getSeen();
  seen.add(id);
  saveSeen(seen);
}
function resetIfExhausted() {
  let seen = getSeen();
  if (seen.size >= DATA.rituals.length) {
    seen = new Set();
    saveSeen(seen);
  }
  return seen;
}
function isCrisis(query = "") {
  const q = normalize(query);
  return CRISIS_PHRASES.some(x => q.includes(normalize(x)));
}
function score(meta, ritual, query) {
  const qTokens = new Set(tokens(query));
  const weighted = [
    [meta.pattern, 12],
    [meta.moment, 10],
    [meta.specialist, 8],
    [meta.world, 5],
    [meta.terms?.join(" ") || "", 5],
    [ritual.goal, 4],
    [ritual.title, 2]
  ];
  let value = 0;
  for (const [text, weight] of weighted) {
    const fieldTokens = tokens(text);
    for (const t of fieldTokens) if (qTokens.has(t)) value += weight;
    const nq = normalize(query), nf = normalize(text);
    if (nq.length > 7 && nf.includes(nq)) value += weight * 5;
  }
  value += (Number(meta.priority) || 0) * 0.15;
  return value;
}
function pickRitual(query = "") {
  const seen = resetIfExhausted();
  let pool = DATA.rituals.filter(r => !seen.has(r.id));

  if (isCrisis(query)) {
    const unseenTier3 = pool.filter(r => DATA.backendById.get(r.id)?.safetyTier === 3);
    if (unseenTier3.length) {
      pool = unseenTier3;
    } else {
      // Safety overrides ordinary no-repeat behavior: never fall back to a Tier-1/Tier-2
      // ritual for explicit crisis/high-risk language just because all Tier-3 cards were seen.
      pool = DATA.rituals.filter(r => DATA.backendById.get(r.id)?.safetyTier === 3);
    }
  } else {
    // Never surface Tier-3 crisis bridge cards through ordinary/random routing.
    pool = pool.filter(r => DATA.backendById.get(r.id)?.safetyTier !== 3);
  }

  if (!pool.length) return null;
  if (!query.trim()) return pool[Math.floor(Math.random() * pool.length)];

  return pool
    .map(r => {
      const meta = DATA.normalizedById.get(r.id) || {};
      return { r, s: score(meta, r, query) };
    })
    .sort((a,b) => b.s - a.s)[0].r;
}
function renderRitual(r) {
  if (!r) return;
  markSeen(r.id);
  $("bubbleBadge").textContent = r.bubble;
  $("playTime").textContent = r.playTime || "";
  $("ritualTitle").textContent = r.title;
  $("goalText").textContent = r.goal;

  const list = $("stepsList");
  list.innerHTML = "";
  r.steps.forEach(step => {
    const li = document.createElement("li");
    const n = document.createElement("div");
    n.className = "step-num";
    n.textContent = step.n;
    const text = document.createElement("div");
    text.className = "step-text";
    text.textContent = step.text;
    li.append(n, text);
    list.appendChild(li);
  });

  $("winText").textContent = r.win;
  $("mindBendText").textContent = r.mindBend;
  $("flowText").textContent = r.formulaFlow;
  $("safetyText").textContent = r.safety?.raw || "";
  $("feedbackPrompt").textContent = r.feedback?.prompt || "Did that shift anything?";

  const feedback = $("feedbackOptions");
  feedback.innerHTML = "";
  (r.feedback?.options || []).forEach(option => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "feedback-btn";
    b.textContent = option;
    feedback.appendChild(b);
  });

  $("startCard").classList.add("hidden");
  $("ritualView").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function run(query = "") {
  currentQuery = query;
  const ritual = pickRitual(query);
  renderRitual(ritual);
}
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  $("themeToggle").textContent = theme === "light" ? "☾" : "☀";
}

async function init() {
  DATA = await loadThinkStill(".");
  const savedTheme = localStorage.getItem(THEME_KEY);
  const preferred = matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  setTheme(savedTheme || preferred);

  $("enterBtn").addEventListener("click", () => {
    const q = $("mindInput").value.trim();
    if (!q) return $("mindInput").focus();
    run(q);
  });
  $("anotherBtn").addEventListener("click", () => run(currentQuery));
  $("doneBtn").addEventListener("click", () => {
    $("ritualView").classList.add("hidden");
    $("startCard").classList.remove("hidden");
    $("mindInput").focus();
  });
  $("themeToggle").addEventListener("click", () => {
    setTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light");
  });
}
init().catch(err => {
  console.error(err);
  document.body.innerHTML = `<main class="shell"><section class="panel"><h1>ThinkStill could not load.</h1><p>${err.message}</p></section></main>`;
});
