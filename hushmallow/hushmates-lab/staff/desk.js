// The safety desk: where the Hushmates safety team reads reports and decides what happens.
//
// Anyone can load this page, but it shows nothing until a person signs in, and the server
// answers its questions only for a moderator (every report opened and every decision is
// recorded in the activity log, on the server). People's words are shown as text, never as
// markup. A desk session lives only in this tab (sessionStorage) and ends after 30 minutes
// without activity.

import { createAuth } from '../client/supabase-auth.js';
import { FunctionsLink } from '../client/functions-link.js';
import { REPORT_REASONS } from '../core/relay-config.js';
import { DESK_ACTIONS, URGENT_GUIDE, isOverdue } from './desk-guide.js';

const IDLE_MS = 30 * 60e3;
const REFRESH_MS = 60e3;
const GENTLE = 'Something went wrong on our side. Please try again in a moment.';
const reasonLabel = Object.fromEntries(REPORT_REASONS.map((r) => [r.id, r.label]));

const root = document.getElementById('desk');
const who = document.getElementById('desk-who');

// ------------------------------------------------------------------ bits --
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  for (const c of children.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}
const words = (e) => (e && e.human && e.message ? e.message : GENTLE);
function ago(ms) {
  const m = Math.max(0, Math.round((Date.now() - ms) / 60e3));
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const hrs = Math.round(m / 60);
  return hrs < 48 ? `${hrs} h ago` : `${Math.round(hrs / 24)} days ago`;
}
const when = (ms) => new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
function show(...nodes) {
  root.replaceChildren(...nodes);
  const heading = root.querySelector('h1, h2');
  if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: false }); }
}
function errorLine(id) { return h('p', { class: 'desk-error', id, role: 'alert', hidden: true }); }
function sayError(el, e) { el.textContent = typeof e === 'string' ? e : words(e); el.hidden = false; }

// a session only for this tab, apart from the customer app's
const tabStore = (() => {
  const mem = new Map();
  let ss = null;
  try { ss = window.sessionStorage; ss.setItem('staff:probe', '1'); ss.removeItem('staff:probe'); } catch { ss = null; }
  return {
    getItem(k) { try { return ss ? ss.getItem(`staff:${k}`) : (mem.get(k) ?? null); } catch { return mem.get(k) ?? null; } },
    setItem(k, v) { try { if (ss) ss.setItem(`staff:${k}`, v); else mem.set(k, v); } catch { mem.set(k, v); } },
    removeItem(k) { try { ss?.removeItem(`staff:${k}`); } catch { /* memory only */ } mem.delete(k); },
  };
})();

let auth;
let link;
let me = null;
let refreshTimer = null;
const call = (method, args = {}) => link.request(method, null, args);

// ----------------------------------------------------------- signing in --
function signIn(note = '') {
  stopRefresh();
  who.hidden = true;
  const err = errorLine('signin-error');
  const email = h('input', { id: 'signin-email', type: 'email', autocomplete: 'email', required: true, inputmode: 'email', 'aria-describedby': 'signin-error' });
  const form = h('form', { class: 'desk-card desk-narrow', 'data-test': 'desk-signin', onsubmit: async (ev) => {
    ev.preventDefault();
    err.hidden = true;
    const button = form.querySelector('button');
    button.disabled = true;
    try { await auth.sendCode(email.value.trim()); enterCode(email.value.trim()); } catch (e) { sayError(err, e); button.disabled = false; }
  } },
  h('h1', {}, 'Sign in to the safety desk'),
  note ? h('p', { class: 'desk-note' }, note) : null,
  h('p', {}, 'We’ll send a six-digit code to your work email.'),
  h('label', { for: 'signin-email' }, 'Email'), email, err,
  h('button', { type: 'submit', class: 'desk-primary' }, 'Send me a code'));
  show(form);
}

function enterCode(address) {
  const err = errorLine('code-error');
  const code = h('input', { id: 'signin-code', inputmode: 'numeric', autocomplete: 'one-time-code', pattern: '[0-9]{6}', maxlength: 6, required: true, 'aria-describedby': 'code-error' });
  const form = h('form', { class: 'desk-card desk-narrow', 'data-test': 'desk-code', onsubmit: async (ev) => {
    ev.preventDefault();
    err.hidden = true;
    try { await auth.verifyCode(address, code.value.replace(/\D/g, '')); await enter(); } catch (e) { sayError(err, e); }
  } },
  h('h1', {}, 'Enter your code'),
  h('p', {}, `We sent it to ${address}.`),
  h('label', { for: 'signin-code' }, 'Six-digit code'), code, err,
  h('button', { type: 'submit', class: 'desk-primary' }, 'Continue'),
  h('button', { type: 'button', class: 'desk-quiet', onclick: () => signIn() }, 'Use a different email'));
  show(form);
}

/** A new team member's first visit: their safety team invitation. */
function join() {
  const err = errorLine('join-error');
  const code = h('input', { id: 'join-code', autocomplete: 'off', autocapitalize: 'characters', required: true });
  const name = h('input', { id: 'join-name', autocomplete: 'off', minlength: 3, maxlength: 20, required: true, 'aria-describedby': 'join-name-hint' });
  const adult = h('input', { id: 'join-adult', type: 'checkbox', required: true });
  const form = h('form', { class: 'desk-card desk-narrow', 'data-test': 'desk-join', onsubmit: async (ev) => {
    ev.preventDefault();
    err.hidden = true;
    try { await call('redeemInvite', { code: code.value, name: name.value, adult: adult.checked }); await enter(); } catch (e) { sayError(err, e); }
  } },
  h('h1', {}, 'Your safety team invitation'),
  h('p', {}, 'Enter the invitation the team lead gave you. It works once.'),
  h('label', { for: 'join-code' }, 'Invitation'), code,
  h('label', { for: 'join-name' }, 'A name for you here'), name,
  h('p', { class: 'desk-meta', id: 'join-name-hint' }, '3 to 20 letters or numbers, not words like staff or support. Only you see it; the activity log shows an account reference.'),
  h('label', { class: 'desk-check' }, adult, ' I’m 18 or over'), err,
  h('button', { type: 'submit', class: 'desk-primary' }, 'Join the desk'),
  h('button', { type: 'button', class: 'desk-quiet', onclick: signOut }, 'Sign out'));
  show(form);
}

function notForYou() {
  stopRefresh();
  show(h('section', { class: 'desk-card desk-narrow', 'data-test': 'desk-not-staff' },
    h('h1', {}, 'This desk is for the safety team'),
    h('p', {}, 'Your account isn’t part of the Hushmates safety team. Safety team accounts are separate from member accounts: sign out, then sign in with a different email (one not used in the Hushmates app) and enter your safety team invitation.'),
    h('button', { type: 'button', class: 'desk-primary', onclick: signOut }, 'Sign out')));
}

async function signOut() {
  stopRefresh();
  try { await auth.signOut(); } catch { auth.forget?.(); }
  me = null;
  signIn();
}

async function enter() {
  try { me = await call('me'); } catch (e) { return trouble(e); }
  if (me.needsInvite) return join();
  if (!me.isModerator) return notForYou();
  who.hidden = false;
  who.replaceChildren(`Signed in as ${me.profile?.pseudonym || 'a team member'} `, h('button', { type: 'button', class: 'desk-quiet', 'data-test': 'desk-signout', onclick: signOut }, 'Sign out'));
  return queue('open');
}

function trouble(e) {
  stopRefresh();
  show(h('section', { class: 'desk-card desk-narrow' },
    h('h1', {}, 'The desk can’t reach Hushmates'),
    h('p', {}, words(e)),
    h('button', { type: 'button', class: 'desk-primary', onclick: () => enter() }, 'Try again')));
}

// ---------------------------------------------------------------- queue --
let tab = 'open';
let selected = null;
let reports = [];

function stopRefresh() { clearInterval(refreshTimer); refreshTimer = null; }
function startRefresh() {
  stopRefresh();
  refreshTimer = setInterval(() => { if (document.visibilityState === 'visible' && tab !== 'activity') reloadList(); }, REFRESH_MS);
}

function tabs() {
  const b = (id, label, count) => h('button', { type: 'button', role: 'tab', 'aria-selected': String(tab === id), class: `desk-tab${tab === id ? ' is-on' : ''}`, 'data-test': `desk-tab-${id}`, onclick: () => queue(id) },
    label, count != null ? h('span', { class: 'desk-count' }, String(count)) : null);
  const open = reports.filter((r) => r.status === 'open').length;
  return h('nav', { class: 'desk-tabs', role: 'tablist', 'aria-label': 'Reports' }, b('open', 'Open', open), b('decided', 'Decided'), b('activity', 'Activity log'));
}

function kindOf(r) {
  if (r.kind === 'feeling') return 'A feeling';
  return r.isMallow ? 'A Mallow perspective' : 'A perspective';
}

const rowIds = new WeakMap();
// a priority report still open past the team's 12-hour target says so in words, not only colour
const overdueBadge = () => h('span', { class: 'desk-overdue', 'data-test': 'desk-overdue' },
  h('span', { class: 'desk-sr' }, 'Overdue: '), 'Over 12 hours');
function row(r) {
  return h('li', {},
    track(r.id, h('button', { type: 'button', class: `desk-row${r.urgent ? ' is-urgent' : ''}${selected === r.id ? ' is-on' : ''}`, 'data-test': 'desk-report', 'aria-current': selected === r.id ? 'true' : null, onclick: () => detail(r.id) },
      r.urgent ? h('span', { class: 'desk-badge' }, 'Priority') : null,
      h('span', { class: 'desk-row-main' }, `${kindOf(r)} · ${reasonLabel[r.reason] || 'Something else'}`),
      h('span', { class: 'desk-row-side' }, isOverdue(r, Date.now()) ? [overdueBadge(), ' '] : null,
        r.status === 'open' ? ago(r.at) : r.status === 'actioned' ? 'Action taken' : 'No action needed'))));
}
function track(id, el) { rowIds.set(el, id); return el; }

async function reloadList() {
  try { reports = (await call('modListReports')).reports || []; } catch (e) { if (e?.code === 'forbidden') return notForYou(); return; }
  if (tab !== 'activity') paint();
}

async function queue(which) {
  tab = which;
  if (which === 'activity') return activity();
  try { reports = (await call('modListReports')).reports || []; } catch (e) { if (e?.code === 'forbidden') return notForYou(); return trouble(e); }
  startRefresh();
  paint(true);
  return undefined;
}

let detailPane = null;
function paint(focusHeading = false) {
  // a quiet refresh: whoever was typing a note or moving through the list keeps their place
  // (noted first: moving the open report into the new layout takes focus out of it)
  const keep = focusHeading ? null : document.activeElement;
  const keptRow = keep && rowIds.get(keep);
  const sel = keep && 'selectionStart' in keep ? [keep.selectionStart, keep.selectionEnd] : null;
  const list = reports.filter((r) => (tab === 'open' ? r.status === 'open' : r.status !== 'open'));
  if (tab === 'decided') list.reverse();
  const listPane = h('section', { class: 'desk-list', 'aria-labelledby': 'desk-list-title' },
    h('h1', { id: 'desk-list-title' }, tab === 'open' ? 'Reports waiting for a decision' : 'Decided reports'),
    list.length ? h('ul', { class: 'desk-rows' }, list.map(row))
      : h('p', { class: 'desk-empty' }, tab === 'open' ? 'Nothing is waiting. This list refreshes by itself while this tab is in view and you’re signed in. Nothing alerts anyone, open or closed, so check at the set times.' : 'Nothing decided yet.'));
  detailPane = detailPane && selected ? detailPane : h('section', { class: 'desk-detail' },
    h('p', { class: 'desk-empty' }, 'Choose a report to read it. Every report you open is recorded in the activity log.'));
  const body = h('div', { class: `desk-split${selected ? ' has-detail' : ''}` }, listPane, detailPane);
  if (focusHeading) return show(tabs(), body);
  root.replaceChildren(tabs(), body);
  const target = keptRow ? [...root.querySelectorAll('.desk-row')].find((b) => rowIds.get(b) === keptRow) : keep;
  if (target && target !== document.body && target.isConnected && document.activeElement !== target) {
    target.focus({ preventScroll: true });
    if (sel && target === keep) { try { target.setSelectionRange(sel[0], sel[1]); } catch { /* not a text field */ } }
  }
  return undefined;
}

// --------------------------------------------------------------- detail --
async function detail(id) {
  selected = id;
  let r;
  try { r = await call('modGetReport', { id }); } catch (e) {
    detailPane = h('section', { class: 'desk-detail' }, h('p', { class: 'desk-error', role: 'alert' }, words(e)));
    paint();
    return;
  }
  const summary = reports.find((x) => x.id === id);
  if (summary) summary.isMallow = r.isMallow;
  const ev = r.evidence || {};
  const err = errorLine('resolve-error');
  const note = h('textarea', { id: 'resolve-note', maxlength: 900, rows: 3, 'aria-describedby': 'resolve-error' });
  const kind = r.kind === 'feeling' ? 'feeling' : r.isMallow ? 'mallow' : 'perspective';
  const actions = DESK_ACTIONS[kind];

  async function decide(action) {
    err.hidden = true;
    const a = actions.find((x) => x.id === action);
    if (a.confirm && !window.confirm(a.confirm)) return;
    try {
      await call('modResolve', { id, action, note: [`Decision: ${a.label}`, note.value.trim()].filter(Boolean).join('. ') });   // the team notes say which decision it was
      await reloadList();
      await detail(id);
    } catch (e) { sayError(err, e); }
  }

  const back = h('button', { type: 'button', class: 'desk-quiet desk-back', onclick: () => { selected = null; detailPane = null; paint(true); } }, 'Back to reports');
  const history = r.subjectHistory;
  detailPane = h('section', { class: 'desk-detail', 'data-test': 'desk-detail', 'aria-labelledby': 'desk-detail-title' },
    back,
    h('h2', { id: 'desk-detail-title', tabindex: '-1' }, `${kindOf(r)} · ${reasonLabel[r.reason] || 'Something else'}`),   // focus moves here when it opens or is decided
    h('p', { class: 'desk-meta' }, `Reported ${when(r.at)} (${ago(r.at)})`),
    r.urgent ? h('aside', { class: 'desk-urgent', 'data-test': 'desk-urgent' },
      h('h3', {}, URGENT_GUIDE.title), h('ol', { class: 'desk-steps' }, URGENT_GUIDE.steps.map((s) => h('li', {}, s))),
      h('ul', {}, URGENT_GUIDE.resources.map((x) => h('li', {}, h('strong', {}, x.label), ` ${x.detail}`)))) : null,
    r.details ? h('figure', { class: 'desk-quote' }, h('figcaption', {}, 'What the person who reported it added'), h('blockquote', {}, r.details)) : null,
    h('figure', { class: 'desk-quote' }, h('figcaption', {}, 'The feeling'),
      ev.feeling ? h('blockquote', { 'data-test': 'desk-evidence-feeling' }, ev.feeling) : h('p', { class: 'desk-gone' }, 'Its words are no longer stored.')),
    r.kind === 'perspective' ? h('figure', { class: 'desk-quote' }, h('figcaption', {}, r.isMallow ? 'The Mallow perspective (written automatically)' : 'The perspective'),
      ev.perspective ? h('blockquote', { 'data-test': 'desk-evidence-perspective' }, ev.perspective) : h('p', { class: 'desk-gone' }, 'Its words are no longer stored.')) : null,
    history ? h('p', { class: 'desk-meta', 'data-test': 'desk-history' },
      history.reports ? `Earlier reports about the same person: ${history.reports} (${history.actioned} with action taken).` : 'No earlier reports about the same person.',
      history.restricted ? ' Their account is restricted.' : '') : null,
    r.subjectRef ? h('p', { class: 'desk-meta desk-ref' }, `Account reference (for a team lead): ${r.subjectRef}`) : null,
    r.isMallow ? h('p', { class: 'desk-meta' }, 'The person stopped seeing it as soon as they reported it. Nobody else ever sees a Mallow perspective.') : null,
    (r.notes || []).length ? h('div', { class: 'desk-notes' }, h('h3', {}, 'Team notes'),
      (r.notes || []).map((n) => h('p', {}, h('span', { class: 'desk-meta' }, `${when(n.at)} · `), n.text))) : null,
    r.status === 'open'
      ? h('div', { class: 'desk-decide' },
        h('h3', {}, 'Decide'),
        h('label', { for: 'resolve-note' }, 'A note for the team (optional, only the team sees it) ',
          h('span', { class: 'desk-label-hint' }, 'What you saw and did. No diagnosis, no guesses about who anyone is.')), note,
        h('div', { class: 'desk-actions' }, actions.map((a) => h('div', { class: 'desk-action' },
          h('button', { type: 'button', class: a.strong ? 'desk-primary' : 'desk-secondary', 'data-test': `desk-${a.id}`, onclick: () => decide(a.id) }, a.label),
          h('p', {}, a.explain)))),
        err)
      : h('p', { class: 'desk-decided', 'data-test': 'desk-decided' }, r.status === 'actioned' ? 'Decided: action taken.' : 'Decided: no action needed.'));
  paint();
  detailPane.querySelector('h2')?.focus();
}

// ------------------------------------------------------------- activity --
async function activity() {
  let entries = [];
  try { entries = (await call('modAuditLog')).entries || []; } catch (e) { if (e?.code === 'forbidden') return notForYou(); return trouble(e); }
  stopRefresh();
  const label = {
    'mod.list-reports': 'Looked at the report list', 'mod.view-report': 'Opened a report', 'mod.resolve': 'Decided a report', 'mod.view-audit': 'Looked at this log',
    'report.created': 'A report came in', 'account.created': 'Someone joined', 'account.deleted': 'Someone deleted their account',
    'withdraw-perspective': 'Someone took back a perspective they gave',
    'account.state': 'A team lead changed an account’s access',
  };
  const decisionLabel = Object.fromEntries(Object.values(DESK_ACTIONS).flat().map((a) => [a.id, a.label.toLowerCase()]));
  show(tabs(), h('section', { class: 'desk-list desk-wide', 'data-test': 'desk-activity' },
    h('h1', {}, 'Activity log'),
    h('p', { class: 'desk-meta' }, 'The last 200 entries, newest first. Entries name accounts by reference only.'),
    h('table', { class: 'desk-table' },
      h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'When'), h('th', { scope: 'col' }, 'What'), h('th', { scope: 'col' }, 'Who'))),
      h('tbody', {}, entries.slice().reverse().map((e) => h('tr', {},
        h('td', {}, when(e.at)), h('td', {}, `${label[e.action] || 'Something else happened'}${e.decision ? `: ${decisionLabel[e.decision] || e.decision}` : ''}${e.reason ? ` (${reasonLabel[e.reason] || e.reason})` : ''}`),
        h('td', { class: 'desk-ref' }, String(e.actor || '').slice(0, 8))))))));
  return undefined;
}

// ------------------------------------------------------------ idle limit --
let lastActive = Date.now();
for (const ev of ['pointerdown', 'keydown', 'scroll']) window.addEventListener(ev, () => { lastActive = Date.now(); }, { passive: true });
setInterval(() => {
  if (me && Date.now() - lastActive > IDLE_MS) { me = null; stopRefresh(); auth.signOut().catch(() => auth.forget?.()).finally(() => signIn('You were signed out after 30 minutes without activity.')); }
}, 60e3);

// ---------------------------------------------------------------- start --
async function boot() {
  let config;
  try { config = await (await fetch('../app/config.json', { cache: 'no-store' })).json(); } catch (e) { return trouble(e); }
  const base = config.supabaseUrl || '';
  auth = createAuth({ url: base, anonKey: config.supabaseAnonKey, storage: tabStore });
  link = new FunctionsLink({ base: `${base}${config.functionsPath || '/functions/v1/hushmates'}`, auth, anonKey: config.supabaseAnonKey,
    onSignedOut: () => { me = null; signIn('Please sign in again.'); } });
  if (!auth.session()) return signIn();
  return enter();
}
boot();
