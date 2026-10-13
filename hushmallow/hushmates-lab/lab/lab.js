// Hushmates Lab · the Feeling Relay. One author phone, one catcher phone that
// can be any of six test identities, and a control room (guide, dev clock,
// Mallow perspective source, safety desk). Everything here is lab scaffolding,
// labelled as such: the guide reads the service directly to tick off steps,
// which a real client could never do.

import { RelayService } from '../core/relay.js';
import { seedRelay, RELAY_IDENTITIES } from '../core/relay-seed.js';
import { libraryProvider, demoProvider, anotherAngleProvider, chain } from '../core/perspectives.js';
import { LocalNetwork } from '../net/local-network.js';
import { RelayClient } from '../client/relay-client.js';
import { Device } from '../ui/device.js';
import { SCREENS, startScene, connectRelay } from '../ui/relay/index.js';

const STORE = 'hushmates-relay-lab:v1';
const $ = (sel, root = document) => root.querySelector(sel);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const store = {
  get() { try { return JSON.parse(localStorage.getItem(STORE) || 'null'); } catch { return null; } },
  set(v) { try { localStorage.setItem(STORE, JSON.stringify(v)); } catch { /* private mode: in-memory only */ } },
  clear() { try { localStorage.removeItem(STORE); } catch { /* ignore */ } },
};

const AUTHOR = 'moon';
const CATCHERS = ['cloud', 'star', 'fern', 'dream', 'pebble', 'ember'];
const NAME = Object.fromEntries(RELAY_IDENTITIES.map((p) => [p.key, p.pseudonym]));

// The demonstration's words. A person operating the lab types (or inserts)
// each perspective by hand: nothing here is generated.
const FEELINGS = {
  relay: { text: 'My friend hasn’t replied. I think they’re avoiding me.', label: 'worry' },
  fallback: { text: 'I keep replaying something awkward I said in a meeting.', label: 'worry' },
};
const SUGGESTED = {
  cloud: 'Maybe they’ve had a really full week and meant to reply when they had more energy.',
  star: 'Another possibility could be that they read it on the go and forgot it was still unanswered.',
  fern: 'Could there be another explanation, like them worrying about saying the wrong thing?',
  dream: 'Maybe the silence says more about their week than about how they feel about you.',
  pebble: 'Another possibility: they might be going through something of their own right now, and it isn’t about you at all.',
};

// ------------------------------------------------------------- boot --
const params = new URLSearchParams(location.search);
const saved = params.has('fresh') ? null : store.get();
const clock = { offset: saved?.offset || 0 };
const config = { source: saved?.config?.source || 'demo', angleUrl: saved?.config?.angleUrl || 'http://127.0.0.1:8790' };
const flags = saved?.flags || {};
const now = () => Date.now() + clock.offset;

function makeProvider() {
  if (config.source === 'library') return libraryProvider();
  if (config.source === 'angle') {
    const base = config.angleUrl.replace(/\/$/, '');
    const session = async () => (await (await fetch(`${base}/v1/session`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ device_id: 'hushmates-relay-lab-0001' }) })).json()).token;
    return chain(anotherAngleProvider({ baseUrl: base, session, timeoutMs: 20000 }), libraryProvider());
  }
  return demoProvider();
}

// what the phones say about Mallow perspectives in this lab (the product copy says "AI service")
const MALLOW_NOTE = {
  demo: 'In this lab no AI key is configured: you’ll get a canned demo line, labelled as one.',
  library: 'In this lab it comes from the Reframe library (rule-based, not AI), labelled as such.',
  angle: 'In this lab it comes from a local Another Angle server, labelled AI-generated only if that server runs a real model.',
};

let service;
let tokens;
if (saved?.state && saved.tokens) {
  service = new RelayService({ state: saved.state, now, provider: makeProvider() });
  tokens = saved.tokens;
} else {
  service = seedRelay(new RelayService({ now, provider: makeProvider() }));
  tokens = Object.fromEntries(RELAY_IDENTITIES.map((p) => [p.key, service.signInTestAccount(p.key)]));
  service.s.profiles[accId(AUTHOR)].onboarded = false;         // the author meets Hushmates from the start
}
function accId(key) { return Object.values(service.s.accounts).find((a) => a.key === key)?.id; }

let saveTimer = 0;
const persist = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => store.set({ state: service.toJSON(), tokens, offset: clock.offset, config, flags }), 200); };
service.onPersist = persist;
persist();

const net = new LocalNetwork(service);
const devices = {};
const lab = $('.lab');

function mount(key, host) {
  const root = document.createElement('div');
  root.className = 'lab-device';
  root.dataset.who = key;
  host.append(root);
  const link = net.link(key);
  const client = new RelayClient(link, tokens[key]);
  const device = new Device(root, client, {
    name: key, screens: SCREENS, start: startScene,
    onScreen: (screen, data) => { onSignal(key, screen, data); },
  });
  connectRelay(device);
  device.env.mallowNote = MALLOW_NOTE[config.source];
  const d = { key, link, client, device, root, started: false };
  devices[key] = d;
  client.on(() => { renderBadges(); scheduleGuide(); });
  return d;
}
async function start(d) {
  if (d.started) return;
  d.started = true;
  await d.client.start().catch(() => {});
  d.device.start(startScene);
}

// --------------------------------------------------- the two phones --
mount(AUTHOR, $('#device-author'));
const select = $('#catcher-select');
for (const k of CATCHERS) select.append(new Option(NAME[k], k));
let catcher = CATCHERS.includes(flags.catcher) ? flags.catcher : 'cloud';
select.value = catcher;
async function showCatcher(key) {
  catcher = key;
  flags.catcher = key;
  select.value = key;
  if (!devices[key]) mount(key, $('#device-catcher'));
  for (const k of CATCHERS) if (devices[k]) devices[k].root.hidden = k !== key;
  await start(devices[key]);
  syncNet();
  persist();
}
select.addEventListener('change', () => showCatcher(select.value));

function setView(view) {
  lab.dataset.view = view;
  document.querySelectorAll('[data-view-btn]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.viewBtn === view)));
}
document.querySelectorAll('[data-view-btn]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.viewBtn)));
const layoutBtn = $('#layout-toggle');
function setLayout(single) {
  lab.dataset.layout = single ? 'single' : 'pair';
  layoutBtn.setAttribute('aria-pressed', String(single));
  layoutBtn.textContent = single ? 'Two phones' : 'One phone';
  layoutBtn.title = single ? 'Show both phones side by side' : 'Show one phone at a time';
}
layoutBtn.addEventListener('click', () => setLayout(lab.dataset.layout !== 'single'));
setLayout(params.get('layout') === 'single');

function phoneOf(which) { return which === 'author' ? devices[AUTHOR] : devices[catcher]; }
function syncNet() {
  for (const which of ['author', 'catcher']) {
    const d = phoneOf(which);
    const b = $(`[data-net="${which}"]`);
    if (!d || !b) continue;
    b.setAttribute('aria-pressed', String(!d.link.online));
    b.querySelector('span').textContent = d.link.online ? 'Online' : 'Offline';
  }
}
document.querySelectorAll('[data-net]').forEach((b) => b.addEventListener('click', () => {
  const d = phoneOf(b.dataset.net);
  d.link.setOnline(!d.link.online);
  syncNet();
}));

function renderBadges() {
  const n = devices[AUTHOR]?.client.state.me?.homeUnseen || 0;
  document.querySelectorAll('[data-badge="author"]').forEach((b) => { b.textContent = n ? String(n) : ''; b.hidden = !n; });
}

// ---------------------------------------------------------- dev clock --
const clockEl = $('#clock');
const fmtClock = new Intl.DateTimeFormat(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' });
function renderClock() {
  const ahead = clock.offset;
  const label = ahead < 60e3 ? 'real time' : ahead < 3600e3 ? `+${Math.round(ahead / 60e3)} min` : `+${(ahead / 3600e3).toFixed(ahead % 3600e3 ? 1 : 0)} h`;
  clockEl.textContent = `Service time: ${fmtClock.format(new Date(now()))} · ${label}`;
}
async function advance(ms) {
  clock.offset = ms === 0 ? 0 : clock.offset + ms;
  service.tick();
  persist();
  renderClock();
  await Promise.all(Object.values(devices).filter((d) => d.started).map((d) => d.client.refreshAll().catch(() => {})));
  scheduleGuide();
}
document.querySelectorAll('[data-advance]').forEach((b) => b.addEventListener('click', () => advance(Number(b.dataset.advance))));
$('#clock-reset').addEventListener('click', () => advance(0));
setInterval(() => { service.tick(); renderClock(); }, 1000);
renderClock();

// ------------------------------------------- Mallow perspective source --
const sourceStatus = $('#source-status');
const angleRow = $('#angle-row');
const angleUrl = $('#angle-url');
angleUrl.value = config.angleUrl;
function renderSource(extra = '') {
  document.querySelectorAll('input[name="source"]').forEach((r) => { r.checked = r.value === config.source; });
  angleRow.hidden = config.source !== 'angle';
  const used = service.s.daily[new Date(now()).toISOString().slice(0, 10)]?.global || 0;
  const what = { demo: 'Canned demo lines (labelled “demo example, not live AI”).', library: 'Reframe library (labelled “not AI”).', angle: 'Another Angle first, then the Reframe library if it can’t answer.' }[config.source];
  sourceStatus.textContent = `${what} Provider calls this session: ${service.providerCalls}. Mallow perspectives today: ${used}. ${extra}`;
}
document.querySelectorAll('input[name="source"]').forEach((r) => r.addEventListener('change', () => {
  config.source = r.value;
  service.provider = makeProvider();
  for (const d of Object.values(devices)) d.device.env.mallowNote = MALLOW_NOTE[config.source];
  persist();
  renderSource();
  if (config.source === 'angle') checkAngle();
}));
angleUrl.addEventListener('change', () => { config.angleUrl = angleUrl.value.trim() || 'http://127.0.0.1:8790'; service.provider = makeProvider(); persist(); renderSource(); });
async function checkAngle() {
  try {
    const hl = await (await fetch(`${config.angleUrl.replace(/\/$/, '')}/v1/health`)).json();
    const live = hl.provider === 'anthropic' && hl.configured?.provider_key;
    renderSource(`Server says: provider “${hl.provider}”, ${live ? 'a real model: answers are labelled AI-generated.' : 'not a real model: answers are labelled demo.'}`);
  } catch {
    renderSource('Couldn’t reach it (is the local harness running, and does it allow this origin?). Asking a Mallow will fall back to the Reframe library, labelled.');
  }
}
$('#angle-check').addEventListener('click', checkAngle);
renderSource();

// ---------------------------------------------------------- safety desk --
const modLink = net.link('mod');
const modList = $('#mod-list');
async function renderMod() {
  let list = [];
  try { list = (await modLink.request('modListReports', tokens.mod, {})).reports; } catch { /* offline */ }
  if (!list.length) { modList.replaceChildren(Object.assign(document.createElement('p'), { className: 'lab-small', textContent: 'No reports. Report a feeling (catcher) or a perspective (author) to see the human review queue.' })); return; }
  modList.replaceChildren(...list.slice(0, 6).map((r) => {
    const row = document.createElement('div');
    row.className = `lab-mod-row${r.status === 'open' ? ' is-open' : ''}`;
    const t = document.createElement('p');
    t.textContent = `${r.urgent ? 'Priority · ' : ''}${r.kind === 'feeling' ? 'Feeling' : 'Perspective'} · ${r.reason} · ${r.status}`;
    row.append(t);
    if (r.status === 'open') {
      const acts = r.kind === 'feeling' ? [['resume-feeling', 'Resume'], ['remove-feeling', 'Remove']] : [['dismiss', 'Dismiss'], ['remove-perspective', 'Remove']];
      for (const [action, label] of acts) {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'guide-btn'; b.textContent = label;
        b.addEventListener('click', async () => { try { await modLink.request('modResolve', tokens.mod, { id: r.id, action }); } catch { /* shown by state */ } renderMod(); scheduleGuide(); });
        row.append(b);
      }
    }
    return row;
  }));
}

// ----------------------------------------------------------- the guide --
const norm = (s) => String(s || '').replace(/[’']/g, "'").replace(/\s+/g, ' ').trim().toLowerCase();
function journeyFor(kind) {
  const id = flags[`${kind}Id`];
  if (id && service.s.journeys[id]) return service.s.journeys[id];
  const j = Object.values(service.s.journeys).filter((x) => x.owner === accId(AUTHOR) && norm(x.text) === norm(FEELINGS[kind].text)).sort((a, b) => b.createdAt - a.createdAt)[0];
  if (j) { flags[`${kind}Id`] = j.id; persist(); }
  return j || null;
}
const humansOn = (j) => (j ? Object.values(service.s.reframes).filter((r) => r.journeyId === j.id) : []);
const gaveOn = (j, key) => humansOn(j).some((r) => r.author === accId(key));

const SCENARIOS = {
  relay: {
    lede: 'MoonMallow releases a feeling; five different people catch it in turn, each offering a possibility; it comes home with five ways of seeing it.',
    steps: () => {
      const j = journeyFor('relay');
      return [
        { who: 'author', title: `MoonMallow releases “${FEELINGS.relay.text}”`, hint: 'Phone A: (welcome) → Write a feeling → the words → Worry → Review → Release.', fill: 'feeling', done: !!j },
        ...['cloud', 'star', 'fern', 'dream', 'pebble'].map((k, i) => ({
          who: k, title: `${NAME[k]} catches it and offers perspective ${i + 1} of 5`,
          hint: `Phone B: choose ${NAME[k]} → Catch → Look up → Catch this feeling → write → Add my perspective.`, words: SUGGESTED[k], fill: 'reframe',
          done: gaveOn(j, k),
        })),
        { who: 'service', title: 'The fifth perspective sends it home', hint: 'No sixth person can take a slot: holds are capped by the slots left.', done: !!j && j.status !== 'travelling' },
        { who: 'author', title: 'MoonMallow watches it come home', hint: 'Phone A: Returned → the feeling. The orb returns and unfolds into five perspectives.', done: !!j && j.seenReturn },
        { who: 'author', title: 'MoonMallow keeps a perspective (and can let one go)', hint: 'Tap “Keep this” on any perspective.', done: !!j && Object.values(j.choices || {}).some((v) => v === true) },
        { who: 'ember', title: 'EmberMallow looks: the full feeling never reaches a sixth person', hint: 'Phone B: choose EmberMallow → Catch → Look up.', done: !!flags.emberAfterFull },
      ];
    },
  },
  fallback: {
    lede: 'Nobody catches this one. MoonMallow allowed a Mallow perspective; after 30 minutes they can ask for one. It is labelled, never counted as a person, and generated at most once.',
    steps: () => {
      const j = journeyFor('fallback');
      const f = j ? service.s.fallbacks[j.id] : null;
      return [
        { who: 'author', title: `MoonMallow releases “${FEELINGS.fallback.text}” and allows a Mallow perspective`, hint: 'Phone A: Write a feeling → turn on “If nobody catches my feeling, let a Mallow offer a perspective” → Release.', fill: 'feeling-fallback', done: !!j && j.allowFallback },
        { who: 'clock', title: 'Nobody catches it: move the clock on 30 minutes', hint: 'Use “+30 min” in the dev clock below.', done: !!j && (!!j.fallbackOfferedAt || !!f) },
        { who: 'author', title: 'MoonMallow opens the journey and asks the Mallow', hint: 'Phone A: Journeys → the feeling → Ask Loomi. (Shows what processing it needs first.)', done: !!f },
        { who: 'service', title: 'The Mallow perspective arrives, labelled with its real source', hint: 'Still “0 of 5 perspectives found”: a Mallow never counts as a person.', done: !!f && f.status !== 'pending' },
        { who: 'clock', title: 'Move the clock on 24 hours: it comes home with what it collected', hint: 'Use “+24 h”.', done: !!j && j.status !== 'travelling' },
        { who: 'author', title: 'MoonMallow opens what came back', hint: 'Phone A: Returned → the feeling.', done: !!j && j.seenReturn },
      ];
    },
  },
};
let scenario = flags.scenario === 'fallback' ? 'fallback' : 'relay';
const guideList = $('#guide-steps');
let guideQueued = false;
function scheduleGuide() { if (guideQueued) return; guideQueued = true; requestAnimationFrame(() => { guideQueued = false; renderGuide(); }); }
function whoLabel(w) {
  if (w === 'author') return 'Phone A · MoonMallow';
  if (w === 'service') return 'The service';
  if (w === 'clock') return 'Dev clock';
  return `Phone B · ${NAME[w]}`;
}
function renderGuide() {
  document.querySelectorAll('[data-scenario]').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.scenario === scenario)));
  $('.lab-guide__lede').textContent = SCENARIOS[scenario].lede;
  const steps = SCENARIOS[scenario].steps();
  let next = -1;
  guideList.replaceChildren(...steps.map((s, i) => {
    if (!s.done && next < 0) next = i;
    const li = document.createElement('li');
    li.className = `guide-step${s.done ? ' is-done' : ''}${next === i ? ' is-next' : ''}`;
    const n = Object.assign(document.createElement('span'), { className: 'guide-step__n', textContent: s.done ? '✓' : String(i + 1) });
    n.setAttribute('aria-hidden', 'true');
    const box = document.createElement('div');
    box.append(Object.assign(document.createElement('p'), { className: 'guide-step__who', textContent: whoLabel(s.who) }),
      Object.assign(document.createElement('p'), { className: 'guide-step__title', textContent: s.title }),
      Object.assign(document.createElement('p'), { className: 'guide-step__hint', textContent: s.hint || '' }));
    if (s.words && !s.done) box.append(Object.assign(document.createElement('p'), { className: 'guide-step__words', textContent: `Suggested words (written for the lab, not generated): “${s.words}”` }));
    if (s.fill && !s.done && next === i) {
      const b = Object.assign(document.createElement('button'), { type: 'button', className: 'guide-btn', textContent: 'Type it for me' });
      b.addEventListener('click', () => fill(s));
      box.append(b);
    }
    li.append(n, box);
    if (s.done) li.setAttribute('aria-label', `Done: ${s.title}`);
    return li;
  }));
  const done = steps.filter((s) => s.done).length;
  $('#guide-progress').textContent = `${done} of ${steps.length}`;
  $('#guide-bar').style.setProperty('--p', `${(done / steps.length) * 100}%`);
  renderSource();
  renderMod();
}
document.querySelectorAll('[data-scenario]').forEach((t) => t.addEventListener('click', () => { scenario = t.dataset.scenario; flags.scenario = scenario; persist(); renderGuide(); }));

/** Lab-only help: put the suggested words into the open text box (the operator still presses the button). */
async function fill(step) {
  if (step.fill.startsWith('feeling')) {
    setView('author');
    const d = devices[AUTHOR];
    const words = step.fill === 'feeling-fallback' ? FEELINGS.fallback : FEELINGS.relay;
    if (!d.root.querySelector('[data-test="feeling-text"]')) {
      if (d.device.current?.name !== 'release') d.device.go('release', { compose: true }, { replace: true });
      else d.root.querySelector('[data-test="start-feeling"]')?.click();
      await wait(400);
    }
    type(d.root.querySelector('[data-test="feeling-text"]'), words.text);
    const chip = d.root.querySelector(`[data-test="label-${words.label}"]`);
    if (chip && chip.getAttribute('aria-pressed') !== 'true') chip.click();
    if (step.fill === 'feeling-fallback') {
      const sw = d.root.querySelector('[data-test="allow-fallback"]');
      if (sw && sw.getAttribute('aria-checked') !== 'true') sw.click();
    }
    return;
  }
  setView('catcher');
  if (catcher !== step.who) await showCatcher(step.who);
  const box = devices[step.who].root.querySelector('[data-test="reframe-text"]');
  if (!box) { devices[step.who].device.toast('Catch the feeling first, then I can type the suggested words.'); return; }
  type(box, step.words);
}
function type(el, text) {
  if (!el) return;
  el.value = text;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.focus({ preventScroll: true });
}

function onSignal(key, name, data) {
  if (name === 'catch:result' && key === 'ember') {
    const j = journeyFor('relay');
    if (j && humansOn(j).length >= 5 && norm(data?.text) !== norm(FEELINGS.relay.text)) { flags.emberAfterFull = true; persist(); }
  }
  scheduleGuide();
}

$('#reset').addEventListener('click', () => { store.clear(); location.href = location.pathname; });
$('#guide-toggle').addEventListener('click', () => {
  const open = lab.classList.toggle('guide-open');
  $('#guide-toggle').setAttribute('aria-expanded', String(open));
  if (open) $('#guide-title').focus();
});
$('#guide-close').addEventListener('click', () => { lab.classList.remove('guide-open'); $('#guide-toggle').setAttribute('aria-expanded', 'false'); });

// ------------------------------------------------------------ autoplay --
// Drives the real interface (real taps, real service calls), slowly enough
// to watch. The scene contract (data-test hooks) is listed in docs/SCENES.md.
const pace = { ms: 650 };
async function find(key, sel, timeout = 6000) {
  const root = devices[key].root;
  const t0 = performance.now();
  for (;;) {
    const found = root.querySelector(sel);
    if (found && !found.disabled && found.offsetParent !== null) return found;
    if (performance.now() - t0 > timeout) throw new Error(`autoplay: ${NAME[key]} could not find ${sel}`);
    await wait(80);
  }
}
async function tap(key, sel, timeout) {
  setView(key === AUTHOR ? 'author' : 'catcher');
  const e = await find(key, sel, timeout);
  // bring it into view inside the phone only (never scroll the lab page)
  const scroller = e.closest('.hm-scroll');
  if (scroller) {
    const r = e.getBoundingClientRect(); const box = scroller.getBoundingClientRect();
    if (r.top < box.top || r.bottom > box.bottom) scroller.scrollTop += r.top - box.top - box.height / 2 + r.height / 2;
  }
  await wait(pace.ms / 2);
  e.click();
  await wait(pace.ms);
}
async function go(key, place) {
  const d = devices[key].device;
  if (d.current?.name === place) return;
  const nav = devices[key].root.querySelector(`[data-test="nav-${place}"]`);
  if (nav && nav.offsetParent !== null) { nav.click(); await wait(pace.ms); return; }
  d.history = [];
  d.go(place, {}, { replace: true });
  await wait(pace.ms);
}
async function welcomeThrough(key) {
  const d = devices[key].device;
  for (let i = 0; i < 6 && d.current?.name === 'welcome'; i++) {
    const enter = devices[key].root.querySelector('[data-test="welcome-enter"]');
    if (enter && enter.offsetParent !== null) {
      const age = devices[key].root.querySelector('[data-test="welcome-adult"]');
      if (age && age.getAttribute('aria-checked') !== 'true') { age.click(); await wait(pace.ms / 2); }
      await tap(key, '[data-test="welcome-enter"]');
      await wait(pace.ms);
      break;
    }
    await tap(key, '[data-test="welcome-next"]');
  }
}
async function releaseFeeling(words, allowFallback) {
  await welcomeThrough(AUTHOR);
  await go(AUTHOR, 'release');
  await tap(AUTHOR, '[data-test="start-feeling"]');
  type(await find(AUTHOR, '[data-test="feeling-text"]'), words.text);
  await wait(pace.ms);
  await tap(AUTHOR, `[data-test="label-${words.label}"]`);
  if (allowFallback) await tap(AUTHOR, '[data-test="allow-fallback"]');
  await tap(AUTHOR, '[data-test="review-feeling"]');
  await tap(AUTHOR, '[data-test="release-submit"]');
  await find(AUTHOR, '[data-test="release-sent"]', 12000);
  await wait(pace.ms * 2);
}
async function giveAs(key) {
  setView('catcher');
  await showCatcher(key);
  await wait(pace.ms);
  await go(key, 'catch');
  await tap(key, '[data-test="find-feeling"]');
  await tap(key, '[data-test="catch-feeling"]', 9000);
  type(await find(key, '[data-test="reframe-text"]'), SUGGESTED[key]);
  await wait(pace.ms);
  await tap(key, '[data-test="reframe-submit"]');
  await find(key, '[data-test="reframe-after"]', 12000);
  await wait(pace.ms * 2);
}
const PLAY = {
  relay: async () => {
    if (!journeyFor('relay')) await releaseFeeling(FEELINGS.relay, false);
    for (const k of ['cloud', 'star', 'fern', 'dream', 'pebble']) if (!gaveOn(journeyFor('relay'), k)) await giveAs(k);
    const j = journeyFor('relay');
    if (j && !j.seenReturn) {
      await go(AUTHOR, 'returned');
      await tap(AUTHOR, `[data-test="returned-${j.id}"]`);
      await find(AUTHOR, '[data-test="homecoming-ready"]', 16000);
      await wait(pace.ms * 2);
    }
    if (j && !Object.values(j.choices).some((v) => v === true)) await tap(AUTHOR, '[data-test="perspective"] [data-test="keep"]');
    if (!flags.emberAfterFull) {
      await showCatcher('ember');
      await go('ember', 'catch');
      await tap('ember', '[data-test="find-feeling"]');
      await wait(pace.ms * 2);
    }
  },
  fallback: async () => {
    if (!journeyFor('fallback')) await releaseFeeling(FEELINGS.fallback, true);
    const j = journeyFor('fallback');
    if (!j.fallbackOfferedAt && !service.s.fallbacks[j.id]) { await advance(30 * 60e3); await wait(pace.ms * 2); }
    if (!service.s.fallbacks[j.id]) {
      await go(AUTHOR, 'journeys');
      await tap(AUTHOR, `[data-test="journey-${j.id}"]`);
      await tap(AUTHOR, '[data-test="ask-mallow"]');
      await tap(AUTHOR, '[data-test="confirm"]');
      await find(AUTHOR, '[data-test="mallow-ready"], [data-test="mallow-failed"]', 25000);
      await wait(pace.ms * 3);
    }
    if (j.status === 'travelling') { await advance(24 * 3600e3); await wait(pace.ms * 2); }
    if (!j.seenReturn) {
      await go(AUTHOR, 'returned');
      await tap(AUTHOR, `[data-test="returned-${j.id}"]`);
      await find(AUTHOR, '[data-test="homecoming-ready"]', 16000);
    }
  },
};
let playing = false;
async function play(which = scenario) {
  if (playing) return;
  playing = true;
  $('#play').disabled = true;
  try { await PLAY[which](); } catch (e) { console.warn(e.message); }
  playing = false;
  $('#play').disabled = false;
  renderGuide();
}
$('#play').addEventListener('click', () => play());

// ------------------------------------------------- fixtures (QA only) --
// Put the service into a known state through the service itself, then let
// the phones catch up. Used for screenshots and scene work.
async function fixture(name) {
  const T = tokens;
  service.s.profiles[accId(AUTHOR)].onboarded = true;
  const rel = (kind, extra = {}) => journeyFor(kind) || service.submitFeeling(T[AUTHOR], { text: FEELINGS[kind].text, label: FEELINGS[kind].label, clientId: `fx-${kind}-0001`, ...extra }).journey && journeyFor(kind);
  const giveN = (j, n) => {
    for (const k of ['cloud', 'star', 'fern', 'dream', 'pebble'].slice(0, n)) {
      if (gaveOn(j, k)) continue;
      const { offer } = service.findFeeling(T[k]);
      if (!offer) continue;
      service.catchFeeling(T[k], { holdId: offer.holdId });
      service.submitReframe(T[k], { holdId: offer.holdId, text: SUGGESTED[k], clientId: `fx-${k}-${j.id.slice(-6)}` });
    }
  };
  if (name === 'travelling') rel('relay');
  if (name === 'three') giveN(rel('relay'), 3);
  if (name === 'home') giveN(rel('relay'), 5);
  if (name === 'fallback-available' || name === 'fallback-ready') {
    const j = rel('fallback', { allowFallback: true });
    if (!j.fallbackOfferedAt) { clock.offset += 31 * 60e3; service.tick(); }
    if (name === 'fallback-ready') await service.askMallow(T[AUTHOR], { journeyId: j.id }).catch(() => {});
  }
  if (name === 'offer') { rel('relay'); }
  persist();
  await Promise.all(Object.values(devices).filter((d) => d.started).map((d) => d.client.refreshAll().catch(() => {})));
  renderClock();
  scheduleGuide();
  return { relay: journeyFor('relay')?.id, fallback: journeyFor('fallback')?.id };
}
function show(key, screen, p = {}) {
  setView(key === AUTHOR ? 'author' : 'catcher');
  const d = devices[key].device;
  d.history = [];
  d.go(screen, p, { transition: 'none' });
}

// ---------------------------------------------------------------- go --
await start(devices[AUTHOR]);
await showCatcher(catcher);
renderBadges();
renderGuide();
window.__lab = { service, devices, flags, tokens, setView, setLayout, showCatcher, play, fixture, show, advance, pace, accId, journeyFor, ready: true };
