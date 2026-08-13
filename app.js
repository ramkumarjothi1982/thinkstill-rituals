const STORAGE = {
  theme: "thinkstill.theme.v1",
  used: "thinkstill.used.v4053",
  history: "thinkstill.history.v1",
};

const STOP_WORDS = new Set([
  "about", "after", "again", "also", "and", "are", "because", "been", "before", "being",
  "but", "can", "cannot", "could", "did", "does", "doing", "for", "from", "have", "having",
  "how", "into", "its", "just", "like", "more", "most", "not", "now", "really", "same",
  "that", "the", "their", "them", "then", "there", "these", "they", "this", "those", "too",
  "very", "want", "was", "what", "when", "where", "which", "while", "who", "why", "will",
  "with", "would", "you", "your",
]);

const state = {
  manifest: null,
  routing: null,
  rituals: [],
  current: null,
  currentSignal: "",
  sessionMechanisms: new Set(),
  failedAttempts: 0,
  visibleLimit: 24,
  toastTimer: null,
};

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const make = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
const readJson = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
};
const writeJson = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const shuffle = values => {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};
const normalize = value => String(value ?? "").toLowerCase().replace(/[^a-z0-9\s'-]/g, " ").replace(/\s+/g, " ").trim();
const tokens = value => [...new Set(normalize(value).split(" ").filter(word => word.length > 2 && !STOP_WORDS.has(word)))];
const suppressTitleCallback = (value, ritual) => String(value).split(ritual.title).join("This ritual");
const consumerGoal = ritual => suppressTitleCallback(ritual.goal, ritual);
const consumerWin = ritual => suppressTitleCallback(ritual.win, ritual);
const consumerCopy = ritual => [
  ritual.title,
  "",
  "PLAY TIME",
  ritual.playTime,
  "",
  "GOAL",
  consumerGoal(ritual),
  "",
  ...ritual.moves.map(move => `${move.number}. ${move.label} — ${move.body}`),
  "",
  "WIN",
  `✓ ${consumerWin(ritual)}`,
  "",
  "TIPS",
  ...ritual.tips.map(tip => `• ${tip}`),
  "",
  "MIND BEND",
  ritual.mindBend,
  "",
  "FORMULA FLOW",
  ritual.formulaFlow.join(" → "),
  "",
  "SAFETY",
  ...ritual.safety,
].join("\n");

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(STORAGE.theme, theme);
  const button = $("#themeToggle");
  const isDark = theme === "dark";
  button.querySelector("span").textContent = isDark ? "☀" : "☾";
  button.setAttribute("aria-label", isDark ? "Switch to bright theme" : "Switch to dark theme");
  document.querySelector('meta[name="theme-color"]').setAttribute("content", isDark ? "#0a0a0f" : "#f4f4ee");
}

function setView(name, updateHash = true) {
  const normalizedName = ["home", "ritual", "library", "progress"].includes(name) ? name : "home";
  $$(".view").forEach(view => view.classList.toggle("is-active", view.id === `${normalizedName}View`));
  $$(".nav-link").forEach(link => link.classList.toggle("is-active", link.dataset.viewTarget === normalizedName));
  if (updateHash) {
    const nextHash = normalizedName === "home" ? "#home" : normalizedName === "ritual" && state.current ? `#ritual=${state.current.id}` : `#${normalizedName}`;
    if (location.hash !== nextHash) history.pushState(null, "", nextHash);
  }
  if (normalizedName === "library") renderLibrary();
  if (normalizedName === "progress") renderProgress();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function getUsed() {
  return new Set(readJson(STORAGE.used, []).filter(id => state.rituals.some(ritual => ritual.id === id)));
}

function markUsed(id) {
  const used = getUsed();
  used.add(id);
  writeJson(STORAGE.used, [...used]);
}

function resetUsedIfComplete() {
  const used = getUsed();
  if (used.size >= state.rituals.length) {
    writeJson(STORAGE.used, []);
    state.sessionMechanisms.clear();
    showToast("All 750 rituals served. A fresh no-repeat cycle has started.");
    return new Set();
  }
  return used;
}

function matchingScore(ritual, queryTokens, rawQuery) {
  if (!queryTokens.length) return Math.random() * 2 + Math.max(0, 3 - ritual.engine.firstLinePriority);
  const title = normalize(ritual.title);
  const goal = normalize(ritual.goal);
  const specialist = normalize(ritual.specialist);
  const world = normalize(ritual.world);
  const terms = normalize(ritual.engine.matchTerms);
  let score = Math.max(0, 4 - ritual.engine.firstLinePriority);
  for (const token of queryTokens) {
    if (title.includes(token)) score += 8;
    if (goal.includes(token)) score += 6;
    if (specialist.includes(token)) score += 5;
    if (world.includes(token)) score += 3;
    if (terms.includes(token)) score += 4;
  }
  if (terms.includes(normalize(rawQuery)) && normalize(rawQuery).length > 4) score += 10;
  return score + Math.random() * 0.75;
}

function selectRitual(signal = "", options = {}) {
  const used = resetUsedIfComplete();
  const excludeMechanism = options.excludeMechanism ?? null;
  const queryTokens = tokens(signal);
  let candidates = state.rituals.filter(ritual => !used.has(ritual.id));
  if (options.world) candidates = candidates.filter(ritual => ritual.world === options.world);
  if (excludeMechanism) candidates = candidates.filter(ritual => ritual.engine.mechanismKey !== excludeMechanism);
  if (options.avoidSessionMechanisms) {
    const strict = candidates.filter(ritual => !state.sessionMechanisms.has(ritual.engine.mechanismKey));
    if (strict.length) candidates = strict;
  }
  if (!candidates.length) {
    candidates = state.rituals.filter(ritual => ritual.engine.mechanismKey !== excludeMechanism);
  }
  const ranked = candidates
    .map(ritual => ({ ritual, score: matchingScore(ritual, queryTokens, signal) }))
    .sort((a, b) => b.score - a.score);
  const top = ranked.slice(0, Math.min(queryTokens.length ? 10 : 40, ranked.length));
  return shuffle(top.slice(0, Math.max(1, Math.ceil(top.length / 2))))[0]?.ritual ?? ranked[0]?.ritual;
}

function recordView(ritual) {
  const history = readJson(STORAGE.history, []);
  history.unshift({
    id: ritual.id,
    title: ritual.title,
    world: ritual.world,
    shift: ritual.shift,
    outcome: "VIEWED",
    viewedAt: new Date().toISOString(),
  });
  writeJson(STORAGE.history, history.slice(0, 120));
}

function recordOutcome(outcome) {
  const history = readJson(STORAGE.history, []);
  const entry = history.find(item => item.id === state.current?.id && item.outcome === "VIEWED");
  if (entry) {
    entry.outcome = outcome;
    entry.respondedAt = new Date().toISOString();
  }
  writeJson(STORAGE.history, history);
}

function openRitual(ritual, context = {}) {
  if (!ritual) return;
  state.current = ritual;
  if (context.signal !== undefined) state.currentSignal = context.signal;
  markUsed(ritual.id);
  recordView(ritual);

  $("#ritualId").textContent = ritual.id;
  $("#ritualTitle").textContent = ritual.title;
  $("#ritualGoal").textContent = consumerGoal(ritual);
  $("#ritualWin").textContent = consumerWin(ritual);
  $("#ritualMindBend").textContent = ritual.mindBend;
  $("#moveCount").textContent = `${ritual.moves.length} moves · ${ritual.playTime}`;

  const meta = $("#ritualMeta");
  meta.replaceChildren();
  [
    [ritual.playTime, ""],
    [ritual.world, ""],
    [ritual.specialist, ""],
    [`SHIFT · ${ritual.shift}`, "shift"],
  ].forEach(([label, className]) => meta.append(make("span", `meta-pill ${className}`.trim(), label)));

  const moves = $("#ritualMoves");
  moves.replaceChildren();
  ritual.moves.forEach(move => {
    const item = make("li", "move-card");
    item.append(make("span", "move-number", String(move.number)));
    const copy = make("div");
    copy.append(make("h3", "", move.label), make("p", "", move.body));
    item.append(copy);
    moves.append(item);
  });

  const tipList = $("#ritualTips");
  tipList.replaceChildren(...ritual.tips.map(tip => make("li", "", tip)));

  const flow = $("#ritualFlow");
  flow.replaceChildren();
  ritual.formulaFlow.forEach((step, index) => {
    if (index) flow.append(make("span", "flow-arrow", "→"));
    flow.append(make("span", "flow-chip", step));
  });

  const safety = $("#ritualSafety");
  safety.replaceChildren();
  ritual.safety.filter((line, index) => !(index === 0 && normalize(line) === "pause")).forEach(line => safety.append(make("p", "", line)));

  $("#feedbackResult").replaceChildren();
  $("#remainingOptions").replaceChildren();
  $$(".feedback-button").forEach(button => { button.disabled = false; });
  if (context.message) $("#feedbackResult").textContent = context.message;
  setView("ritual");
  requestAnimationFrame(() => $("#ritualTitle").focus?.({ preventScroll: true }));
}

function showSupport(message) {
  if (message) $("#supportCopy").textContent = message;
  const dialog = $("#supportDialog");
  if (typeof dialog.showModal === "function") dialog.showModal();
  else alert(`${$("#supportTitle").textContent}\n\n${$("#supportCopy").textContent}`);
}

function actionButton(label, handler) {
  const button = make("button", "button button-secondary", label);
  button.type = "button";
  button.addEventListener("click", handler);
  return button;
}

function routeDifferentMechanism(extraSignal, message) {
  const current = state.current;
  if (!current) return;
  if (current.engine.safetyTier >= 3 || state.failedAttempts >= 3) {
    showSupport(current.feedback.safetyRoute || "Pause this retry loop and change support type now.");
    return;
  }
  state.sessionMechanisms.add(current.engine.mechanismKey);
  const signal = [state.currentSignal, extraSignal].filter(Boolean).join(" ");
  const next = selectRitual(signal, {
    excludeMechanism: current.engine.mechanismKey,
    avoidSessionMechanisms: true,
  });
  openRitual(next, { signal, message });
}

function handleFeedback(outcome) {
  const ritual = state.current;
  if (!ritual) return;
  const result = $("#feedbackResult");
  const options = $("#remainingOptions");
  result.replaceChildren();
  options.replaceChildren();

  if (outcome === "better") {
    state.failedAttempts = 0;
    recordOutcome("BETTER");
    result.textContent = ritual.feedback.better;
    const row = make("div", "option-list");
    row.append(actionButton("Copy my shift card", () => copyText(ritual.shareCard, "Shift card copied")));
    row.append(actionButton("Choose another ritual", () => setView("home")));
    options.append(row);
    return;
  }

  state.failedAttempts += 1;
  if (outcome === "aLittle") {
    recordOutcome("A LITTLE");
    result.textContent = ritual.feedback.aLittle;
    if (ritual.engine.safetyTier >= 3 || state.failedAttempts >= 3) {
      options.append(actionButton("Change support type", () => showSupport(ritual.feedback.safetyRoute)));
      return;
    }
    options.append(make("p", "", "What still feels strongest?"));
    const list = make("div", "option-list");
    ritual.feedback.options.forEach(option => {
      const button = make("button", "option-button", option);
      button.type = "button";
      button.addEventListener("click", () => routeDifferentMechanism(option, "A different mechanism is ready."));
      list.append(button);
    });
    options.append(list);
    return;
  }

  recordOutcome("NOT YET");
  result.textContent = ritual.feedback.notYet;
  const label = ritual.engine.safetyTier >= 3 || state.failedAttempts >= 3 ? "Change support type" : "Switch mechanism";
  options.append(actionButton(label, () => {
    if (ritual.engine.safetyTier >= 3 || state.failedAttempts >= 3) showSupport(ritual.feedback.safetyRoute);
    else routeDifferentMechanism("", "That ritual was a miss. Here is a genuinely different mechanism.");
  }));
}

async function copyText(value, confirmation) {
  try {
    await navigator.clipboard.writeText(value);
    showToast(confirmation);
  } catch {
    const area = make("textarea");
    area.value = value;
    document.body.append(area);
    area.select();
    document.execCommand("copy");
    area.remove();
    showToast(confirmation);
  }
}

function filteredLibrary() {
  const query = normalize($("#librarySearch").value);
  const world = $("#worldFilter").value;
  const queryTokens = tokens(query);
  return state.rituals.filter(ritual => {
    if (world && ritual.world !== world) return false;
    if (!queryTokens.length) return true;
    const haystack = normalize([ritual.title, ritual.goal, ritual.world, ritual.specialist, ritual.engine.matchTerms].join(" "));
    return queryTokens.every(token => haystack.includes(token));
  });
}

function renderLibrary() {
  const results = filteredLibrary();
  const visible = results.slice(0, state.visibleLimit);
  $("#libraryResultCount").textContent = `${results.length} ritual${results.length === 1 ? "" : "s"}`;
  const grid = $("#libraryGrid");
  grid.replaceChildren();
  if (!visible.length) {
    grid.append(make("div", "empty-state", "No ritual matches that search. Try fewer words or another world."));
  }
  visible.forEach(ritual => {
    const card = make("button", "library-card");
    card.type = "button";
    card.setAttribute("aria-label", `Open ${ritual.title}`);
    const top = make("div", "card-top");
    top.append(make("span", "", ritual.world), make("span", "", ritual.playTime));
    card.append(top, make("h3", "", ritual.title), make("p", "", consumerGoal(ritual)), make("span", "card-arrow", "Open ritual →"));
    card.addEventListener("click", () => openRitual(ritual, { signal: $("#librarySearch").value }));
    grid.append(card);
  });
  $("#loadMoreButton").hidden = visible.length >= results.length;
}

function renderProgress() {
  const history = readJson(STORAGE.history, []);
  const used = getUsed();
  const better = history.filter(item => item.outcome === "BETTER").length;
  const responded = history.filter(item => item.outcome !== "VIEWED").length;
  const stats = $("#progressStats");
  stats.replaceChildren();
  [
    [used.size, "rituals opened this cycle"],
    [better, "reported shifts"],
    [state.rituals.length - used.size, "unseen before reset"],
  ].forEach(([value, label]) => {
    const card = make("div", "stat-card");
    card.append(make("strong", "", String(value)), make("span", "", label));
    stats.append(card);
  });

  const list = $("#historyList");
  list.replaceChildren();
  if (!history.length) {
    list.append(make("div", "empty-state", "Your recent rituals will appear here after you open one."));
    return;
  }
  history.slice(0, 30).forEach(item => {
    const row = make("div", "history-item");
    const copy = make("div");
    copy.append(make("h3", "", item.title), make("p", "", `${item.id} · ${item.world} · ${new Date(item.viewedAt).toLocaleDateString()}`));
    const badge = make("span", `outcome-badge ${item.outcome === "BETTER" ? "better" : ""}`, item.outcome);
    row.append(copy, badge);
    row.addEventListener("click", () => {
      const ritual = state.rituals.find(candidate => candidate.id === item.id);
      if (ritual) openRitual(ritual);
    });
    list.append(row);
  });
  $("#clearHistoryButton").hidden = !responded && !history.length;
}

function renderWorlds() {
  const worlds = state.routing.worlds;
  const buttons = $("#worldButtons");
  buttons.replaceChildren();
  const select = $("#worldFilter");
  worlds.forEach(world => {
    const button = make("button", "world-button", world);
    button.type = "button";
    button.addEventListener("click", () => openRitual(selectRitual(world, { world }), { signal: world }));
    buttons.append(button);
    const option = make("option", "", world);
    option.value = world;
    select.append(option);
  });
}

function wireEvents() {
  $("[data-view-target='home'].brand").addEventListener("click", () => setView("home"));
  $$("[data-view-target]").filter(node => !node.classList.contains("brand")).forEach(button => {
    button.addEventListener("click", () => setView(button.dataset.viewTarget));
  });
  $("#themeToggle").addEventListener("click", () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
  $("#matchForm").addEventListener("submit", event => {
    event.preventDefault();
    const signal = $("#signalInput").value.trim();
    if (!signal) {
      $("#signalInput").focus();
      showToast("Tell ThinkStill what is hitting first.");
      return;
    }
    state.sessionMechanisms.clear();
    state.failedAttempts = 0;
    openRitual(selectRitual(signal), { signal });
  });
  $("#surpriseButton").addEventListener("click", () => {
    state.sessionMechanisms.clear();
    state.failedAttempts = 0;
    openRitual(selectRitual(""), { signal: "" });
  });
  $("#newMatchButton").addEventListener("click", () => {
    $("#signalInput").value = "";
    setView("home");
    setTimeout(() => $("#signalInput").focus(), 250);
  });
  $("#copyRitualButton").addEventListener("click", () => state.current && copyText(consumerCopy(state.current), "Full ritual copied"));
  $$(".feedback-button").forEach(button => button.addEventListener("click", () => handleFeedback(button.dataset.feedback)));
  $("#librarySearch").addEventListener("input", () => { state.visibleLimit = 24; renderLibrary(); });
  $("#worldFilter").addEventListener("change", () => { state.visibleLimit = 24; renderLibrary(); });
  $("#clearFilters").addEventListener("click", () => {
    $("#librarySearch").value = "";
    $("#worldFilter").value = "";
    state.visibleLimit = 24;
    renderLibrary();
  });
  $("#loadMoreButton").addEventListener("click", () => { state.visibleLimit += 24; renderLibrary(); });
  $("#clearHistoryButton").addEventListener("click", () => {
    if (confirm("Clear your local ThinkStill history and begin a fresh no-repeat cycle?")) {
      localStorage.removeItem(STORAGE.history);
      localStorage.removeItem(STORAGE.used);
      renderProgress();
    }
  });
  window.addEventListener("hashchange", routeFromHash);
}

function routeFromHash() {
  const hash = location.hash.replace(/^#/, "");
  if (hash.startsWith("ritual=")) {
    const id = hash.split("=")[1];
    const ritual = state.rituals.find(item => item.id === id);
    if (ritual && ritual.id !== state.current?.id) openRitual(ritual);
    else if (ritual) setView("ritual", false);
    return;
  }
  setView(["library", "progress", "home"].includes(hash) ? hash : "home", false);
}

function validateLoadedData(payload) {
  if (!payload || !Array.isArray(payload.rituals) || payload.rituals.length !== state.manifest.rowCount) {
    throw new Error("The ritual library did not match the locked manifest.");
  }
  const required = ["id", "title", "goal", "moves", "win", "tips", "mindBend", "formulaFlow", "safety", "ritualText"];
  payload.rituals.forEach((ritual, index) => {
    required.forEach(field => {
      const value = ritual[field];
      if (value === undefined || value === null || value === "" || (Array.isArray(value) && !value.length)) {
        throw new Error(`Missing ${field} at ritual ${index + 1}`);
      }
    });
  });
}

function showFatal(error) {
  console.error(error);
  const card = $("#matchForm");
  card.replaceChildren();
  card.append(make("p", "section-kicker", "PACKAGE CHECK"), make("h2", "", "The ritual data could not load."), make("p", "", "Run this package through a local server or GitHub Pages, then run npm test to verify every file."));
}

async function init() {
  try {
    setTheme(localStorage.getItem(STORAGE.theme) === "light" ? "light" : "dark");
    state.manifest = await fetch("manifest.json", { cache: "no-store" }).then(response => {
      if (!response.ok) throw new Error("manifest.json is unavailable");
      return response.json();
    });
    const [payload, routing] = await Promise.all([
      fetch(state.manifest.data.rituals).then(response => response.json()),
      fetch(state.manifest.data.routing).then(response => response.json()),
    ]);
    validateLoadedData(payload);
    state.rituals = payload.rituals;
    state.routing = routing;
    $("#ritualCount").textContent = String(state.rituals.length);
    renderWorlds();
    wireEvents();
    routeFromHash();
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
    document.documentElement.dataset.ready = "true";
  } catch (error) {
    showFatal(error);
  }
}

init();
