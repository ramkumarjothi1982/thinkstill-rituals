// Hushmates Lab: two simulated people, two devices, one local demonstration
// service. Everything here is lab scaffolding (labelled as such on screen):
// the guide reads the service directly to tick off the demo steps, which a
// real client could never do.

import { HushmatesService } from '../core/service.js';
import { seedDemo } from '../core/seed.js';
import { LocalNetwork } from '../net/local-network.js';
import { HushmatesClient } from '../client/client.js';
import { Device } from '../ui/device.js';

const STORE = 'hushmates-lab:v1';
const $ = (sel, root = document) => root.querySelector(sel);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const store = {
  get() { try { return JSON.parse(localStorage.getItem(STORE) || 'null'); } catch { return null; } },
  set(v) { try { localStorage.setItem(STORE, JSON.stringify(v)); } catch { /* private mode: in-memory only */ } },
  clear() { try { localStorage.removeItem(STORE); } catch { /* ignore */ } },
};

const PEOPLE = [
  { key: 'moon', device: 'Device A', name: 'MoonMallow' },
  { key: 'cloud', device: 'Device B', name: 'CloudMallow' },
];

const LINES = {
  moon: 'I’ve had a difficult day at work.',
  cloud: 'That sounds tough. Would you like to talk about what happened?',
};

// ------------------------------------------------------------- boot --
const saved = new URLSearchParams(location.search).has('fresh') ? null : store.get();
let service;
let tokens;
let flags;
if (saved?.state && saved.tokens) {
  service = new HushmatesService({ state: saved.state });
  tokens = saved.tokens;
  flags = saved.flags || {};
} else {
  service = seedDemo(new HushmatesService());
  tokens = { moon: service.signInTestAccount('moon'), cloud: service.signInTestAccount('cloud') };
  flags = {};
}
let saveTimer = 0;
const persist = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => store.set({ state: service.toJSON(), tokens, flags }), 200); };
service.onPersist = persist;
persist();

const net = new LocalNetwork(service);
const devices = {};
const ids = () => Object.fromEntries(Object.entries(service.s.accounts).map(([id, a]) => [a.key, id]));

for (const person of PEOPLE) {
  const link = net.link(person.key);
  const client = new HushmatesClient(link, tokens[person.key]);
  const root = $(`#device-${person.key}`);
  const device = new Device(root, client, {
    name: person.key,
    onScreen: (screen, data) => {
      if (screen === 'find') flags[`${person.key}Find`] = true;
      if (screen === 'find:results' && data.names.includes('CloudMallow') && person.key === 'moon') flags.moonSawCloud = true;
      if (screen === 'hushspace') flags[`${person.key}InHs`] = true;
      persist();
      renderGuide();
    },
  });
  devices[person.key] = { ...person, link, client, device, root };
  client.on(() => { renderBadges(); renderGuide(); });
  const netBtn = $(`[data-net="${person.key}"]`);
  netBtn.addEventListener('click', () => {
    link.setOnline(!link.online);
    netBtn.setAttribute('aria-pressed', String(!link.online));
    netBtn.querySelector('span').textContent = link.online ? 'Online' : 'Offline';
  });
}


// ------------------------------------------------------- view switch --
const lab = $('.lab');
function setView(key) {
  lab.dataset.view = key;
  document.querySelectorAll('[data-view-btn]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.viewBtn === key)));
}
document.querySelectorAll('[data-view-btn]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.viewBtn)));
setView('moon');
// "One phone": the real, single-phone experience; "Two phones": both people side by side
const layoutBtn = $('#layout-toggle');
function setLayout(single) {
  lab.dataset.layout = single ? 'single' : 'pair';
  layoutBtn.setAttribute('aria-pressed', String(single));
  layoutBtn.textContent = single ? 'Two phones' : 'One phone';
  layoutBtn.title = single ? 'Show both phones side by side' : 'Show one phone at a time';
}
layoutBtn.addEventListener('click', () => setLayout(lab.dataset.layout !== 'single'));
setLayout(new URLSearchParams(location.search).get('layout') === 'single');

function renderBadges() {
  for (const d of Object.values(devices)) {
    const n = d.client.state.hushmates.filter((x) => x.open && !x.muted).reduce((a, x) => a + x.unread, 0)
      + d.client.state.invitations.filter((i) => i.direction === 'received' && i.status === 'pending').length;
    document.querySelectorAll(`[data-badge="${d.key}"]`).forEach((b) => { b.textContent = n ? String(n) : ''; b.hidden = !n; });
  }
}

// ------------------------------------------------------------- guide --
const conv = () => Object.values(service.s.conversations).find((c) => {
  const k = ids();
  return c.members.includes(k.moon) && c.members.includes(k.cloud);
});
const same = (a, b) => a.replace(/[’']/g, "'").trim() === b.replace(/[’']/g, "'").trim();
const sentBy = (key, line) => {
  const c = conv(); if (!c) return false;
  return (service.s.messages[c.id] || []).some((m) => m.from === ids()[key] && same(m.body, line));
};
const inviteFromMoon = () => Object.values(service.s.invitations).filter((i) => i.from === ids().moon && i.to === ids().cloud);

const STEPS = [
  { who: 'moon', title: 'MoonMallow opens Hushmates and selects “Find a Hushmate”', hint: 'Create the identity (Device A), then tap Find a Hushmate.', done: () => flags.moonFind },
  { who: 'moon', title: 'MoonMallow discovers CloudMallow’s opt-in card', hint: 'CloudMallow opted into discovery; DreamMallow didn’t and never appears.', done: () => flags.moonSawCloud },
  { who: 'moon', title: 'MoonMallow sends a private companionship request', hint: 'Invite → Send private invitation.', done: () => inviteFromMoon().some((i) => ['pending', 'accepted'].includes(i.status)) },
  { who: 'cloud', title: 'CloudMallow accepts', hint: 'Device B: Invitations → Accept.', done: () => inviteFromMoon().some((i) => i.status === 'accepted') },
  { who: 'both', title: 'Both enter their dedicated Hushspace', hint: 'Open our Hushspace (B); My Hushmates → CloudMallow (A).', done: () => flags.moonInHs && flags.cloudInHs },
  { who: 'moon', title: `MoonMallow: “${LINES.moon}”`, fill: 'moon', done: () => sentBy('moon', LINES.moon) },
  { who: 'cloud', title: `CloudMallow: “${LINES.cloud}”`, fill: 'cloud', done: () => sentBy('cloud', LINES.cloud) },
  { who: 'moon', title: 'MoonMallow selects “Another Perspective”, and CloudMallow sees it', hint: 'Tap “You · Share a preference” at the top of the Hushspace.',
    done: () => conv()?.intent[ids().moon] === 'perspective' && devices.cloud.client.state.hushmates.some((x) => x.intent.theirs === 'perspective') },
  { who: 'moon', title: 'MoonMallow puts the Hushspace on quiet mode', hint: '⋯ → Quiet mode for this Hushspace.', done: () => !!conv()?.quiet[ids().moon] },
  { who: 'moon', title: 'MoonMallow blocks CloudMallow; new messages are refused', hint: '⋯ → Block. Then try sending as CloudMallow, bypassing the interface.',
    done: () => service.s.blocks.some((b) => b.by === ids().moon && b.who === ids().cloud) && flags.refusedAfterBlock },
];

const guideList = $('#guide-steps');
const bypassOut = $('#bypass-result');
function renderGuide() {
  let next = -1;
  const items = STEPS.map((s, i) => {
    const ok = !!s.done();
    if (!ok && next < 0) next = i;
    const li = document.createElement('li');
    li.className = `guide-step ${ok ? 'is-done' : ''} ${next === i ? 'is-next' : ''}`;
    li.innerHTML = `<span class="guide-step__n" aria-hidden="true">${ok ? '✓' : i + 1}</span><div><p class="guide-step__who"></p><p class="guide-step__title"></p><p class="guide-step__hint"></p></div>`;
    li.querySelector('.guide-step__who').textContent = s.who === 'both' ? 'Both devices' : s.who === 'moon' ? 'Device A · MoonMallow' : 'Device B · CloudMallow';
    li.querySelector('.guide-step__title').textContent = s.title;
    li.querySelector('.guide-step__hint').textContent = s.hint || '';
    if (ok) li.setAttribute('aria-label', `Done: ${s.title}`);
    if (s.fill && !ok) {
      const b = document.createElement('button');
      b.className = 'guide-btn'; b.type = 'button'; b.textContent = 'Type it for me';
      b.addEventListener('click', () => fillComposer(s.fill));
      li.querySelector('div').append(b);
    }
    return li;
  });
  guideList.replaceChildren(...items);
  const done = STEPS.filter((s) => s.done()).length;
  $('#guide-progress').textContent = `${done} of ${STEPS.length}`;
  $('#guide-bar').style.setProperty('--p', `${(done / STEPS.length) * 100}%`);
  $('#bypass').disabled = !conv();
}

function fillComposer(key) {
  const d = devices[key];
  setView(key);
  const ta = d.root.querySelector('[data-test="composer"]');
  if (!ta) { d.device.toast('Open the Hushspace first.'); return null; }
  ta.value = LINES[key];
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  ta.focus();
  return ta;
}

// Prove enforcement is server-side: send as CloudMallow straight through the
// network, ignoring what the interface allows.
$('#bypass').addEventListener('click', async () => {
  const c = conv();
  if (!c) return;
  bypassOut.hidden = false;
  bypassOut.textContent = 'Sending as CloudMallow directly to the service…';
  try {
    await devices.cloud.link.request('sendMessage', tokens.cloud, { conversationId: c.id, body: 'Are you still there?', clientId: `bypass-${Date.now().toString(36)}` });
    bypassOut.dataset.tone = 'ok';
    bypassOut.textContent = 'Accepted: the Hushspace is still open, so the service let it through. Block first, then try again.';
  } catch (e) {
    bypassOut.dataset.tone = 'refused';
    bypassOut.textContent = `Refused by the service (${e.code}): ${e.message}`;
    if (service.s.blocks.some((b) => b.by === ids().moon && b.who === ids().cloud)) { flags.refusedAfterBlock = true; persist(); }
  }
  renderGuide();
});

$('#reset').addEventListener('click', () => { store.clear(); location.href = location.pathname; });
$('#guide-toggle').addEventListener('click', () => {
  const open = lab.classList.toggle('guide-open');
  $('#guide-toggle').setAttribute('aria-expanded', String(open));
  if (open) $('#guide-title').focus();
});
$('#guide-close').addEventListener('click', () => { lab.classList.remove('guide-open'); $('#guide-toggle').setAttribute('aria-expanded', 'false'); });

// --------------------------------------------------------- autoplay --
// Drives the real interface (real clicks, real service calls), slowly
// enough to watch. Used by the "Play the demo" button and the screenshot tool.
const pace = { ms: 700 };
async function el(key, sel, timeout = 4000) {
  const root = devices[key].root;
  const t0 = performance.now();
  for (;;) {
    const found = root.querySelector(sel);
    if (found && !found.disabled) return found;
    if (performance.now() - t0 > timeout) throw new Error(`autoplay: ${key} ${sel} not found`);
    await wait(60);
  }
}
async function tap(key, sel) { setView(key); const e = await el(key, sel); e.scrollIntoView({ block: 'center', behavior: 'instant' }); await wait(pace.ms / 2); e.click(); await wait(pace.ms); }
async function toScreen(key, name) {
  const d = devices[key].device;
  if (d.current?.name === name) return;
  d.history = []; d.go('home', {}, { back: true }); await wait(pace.ms / 2);
}

// The scene contract (data-test hooks) every scene keeps, so the demo can be
// played through the real interface: see docs/SCENES.md.
const RUN = [
  async () => {
    const d = devices.moon.device;
    if (d.current?.name === 'welcome') await tap('moon', '[data-test="create-identity"]');
    for (let i = 0; i < 8 && d.current?.name === 'identity'; i++) {
      const save = devices.moon.root.querySelector('[data-test="save-identity"]');
      if (save && !save.disabled) { await tap('moon', '[data-test="save-identity"]'); await wait(pace.ms * 2); break; }
      await tap('moon', '[data-test="id-next"]');
    }
    await toScreen('moon', 'home');
    await tap('moon', '[data-test="go-find"]');
  },
  async () => {
    setView('moon');
    const pick = await el('moon', '[data-test="pick-CloudMallow"]').catch(() => null);
    if (pick && !devices.moon.root.querySelector('[data-test="card-CloudMallow"]')) await tap('moon', '[data-test="pick-CloudMallow"]');
    await el('moon', '[data-test="card-CloudMallow"]');
    await wait(pace.ms);
  },
  async () => { await tap('moon', '[data-test="invite-CloudMallow"]'); await tap('moon', '[data-test="send-invite"]'); await wait(pace.ms * 2.5); },
  async () => {
    await toScreen('cloud', 'home'); await tap('cloud', '[data-test="go-invitations"]');
    await tap('cloud', '[data-test="received-MoonMallow"] [data-test="accept"]');
    await el('cloud', '[data-test="composer"]', 8000);       // the shared moment flows into the Hushspace
    await wait(pace.ms);
  },
  async () => {
    await toScreen('moon', 'home');
    await tap('moon', '[data-test="hushmate-CloudMallow"]');
    await el('moon', '[data-test="composer"]', 8000);
    await wait(pace.ms);
  },
  async () => { await el('moon', '[data-test="composer"]'); fillComposer('moon'); await wait(pace.ms); await tap('moon', '[data-test="send"]'); },
  async () => { setView('cloud'); await wait(pace.ms); await el('cloud', '[data-test="composer"]'); fillComposer('cloud'); await wait(pace.ms); await tap('cloud', '[data-test="send"]'); },
  async () => { setView('moon'); await wait(pace.ms); await tap('moon', '[data-test="intent-mine"]'); await tap('moon', '[data-test="intent-perspective"]'); await wait(pace.ms); setView('cloud'); await wait(pace.ms * 1.5); },
  async () => { await tap('moon', '[data-test="hs-more"]'); await tap('moon', '[data-test="quiet-toggle"]'); await wait(pace.ms); devices.moon.device.closeSheet(); await wait(pace.ms * 1.5); },
  async () => {
    await tap('moon', '[data-test="hs-more"]'); await tap('moon', '[data-test="block"]'); await tap('moon', '[data-test="confirm"]');
    await wait(pace.ms * 1.5); setView('cloud'); await wait(pace.ms); $('#bypass').click(); await wait(pace.ms);
  },
];
async function runStep(n) { await RUN[n - 1](); renderGuide(); }
let playing = false;
$('#play').addEventListener('click', async () => {
  if (playing) return;
  playing = true;
  $('#play').disabled = true;
  try {
    for (let i = 0; i < STEPS.length; i++) if (!STEPS[i].done()) await runStep(i + 1);
  } catch (e) { console.warn(e.message); }
  playing = false;
  $('#play').disabled = false;
});

// Fixtures (lab only): put the service into a known state through the
// service itself, then let both phones catch up. Used by QA and scene work.
async function fixture(name) {
  const k = ids();
  const tm = tokens.moon, tc = tokens.cloud;
  if (!service.s.profiles[k.moon]) {
    service.saveProfile(tm, { pseudonym: 'MoonMallow', avatar: 'noomi', interests: ['Work & study', 'Everyday stress'], style: 'gentle', availability: 'evenings' });
  }
  let convId = conv()?.id || null;
  if (['invited', 'connected', 'chatting'].includes(name) && !convId) {
    let inv = Object.values(service.s.invitations).find((i) => i.from === k.moon && i.to === k.cloud && i.status === 'pending');
    if (!inv) inv = service.s.invitations[service.sendInvitation(tm, { handle: service.me(tc).profile.handle }).id];
    if (name !== 'invited') convId = service.respondToInvitation(tc, { id: inv.id, accept: true }).conversationId;
  }
  if (name === 'chatting' && convId && !(service.s.messages[convId] || []).length) {
    service.sendMessage(tm, { conversationId: convId, body: LINES.moon, clientId: 'fixture-moon-1' });
    service.sendMessage(tc, { conversationId: convId, body: LINES.cloud, clientId: 'fixture-cloud-1' });
    service.setIntent(tm, { conversationId: convId, intent: 'perspective' });
  }
  await Promise.all(Object.values(devices).map((d) => d.client.refreshAll().catch(() => {})));
  return { conversationId: convId };
}
function show(key, screen, params = {}) {
  setView(key);
  const d = devices[key].device;
  d.history = [];
  d.go(screen, params, { transition: 'none' });
}

// start the devices only once everything above exists
await Promise.all(Object.values(devices).map((d) => d.client.start().catch(() => {})));
for (const d of Object.values(devices)) {
  if (d.client.state.me) d.device.start();
  else d.device.go('deleted', {}, { replace: true });
}
renderBadges();
renderGuide();
window.__lab = { service, devices, flags, setView, setLayout, runStep, fixture, show, pace, steps: () => STEPS.map((s) => !!s.done()), ready: true };
