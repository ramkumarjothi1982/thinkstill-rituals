// THE WELCOME after a plan Stripe has confirmed (src/app/plan-change.js after a change of plan, src/app/billing.js
// welcomeBack after a Beyond Checkout): never before the server has read the subscription from Stripe.
//
//   A move into hushmallow Beyond: a full-screen sheet, the seven Mallows gathered together (their own pictures from
//   src/mallows/registry.js, as the Mallows screen shows them), a gentle entrance (nothing moves with reduced motion
//   or low stimulation), "Welcome to hushmallow Beyond", three short lines on what is open now (only what
//   src/app/entitlements.js PLANS.ultra says Beyond includes), "Try Another Angle" and "Continue".
//   Any other confirmed move (monthly → yearly on the same plan, or to Flow): the same style, smaller ("You're on
//   hushmallow Flow, yearly"), with three Mallows and "Continue".
//
// Both are openSheet() sheets (src/app/ui.js): role=dialog, aria-modal, labelled by their heading, the keyboard focus
// moved in (to the heading) and given back on close, Escape and Back close them, what is behind is out of reach.
// Every picture is the app's own (img-src 'self'); nothing is fetched from anywhere else.
//
//   openPlanWelcome(app, { tier, period, from, fromUnknown? }) → Promise<sheet handle>
//   welcomeKind({ tier, from, fromUnknown? }) → 'beyond' | 'plan'   (fromUnknown: the plan before is not known, so the
//     smaller one, which says only the plan as it is now: never "Welcome to hushmallow Beyond" to someone already on it)
//   beyondLines() → the lines on what Beyond opens;  planLine({ tier, period }) → "You're on hushmallow Flow, yearly"
import { h, icon, openSheet } from '../ui.js';
import { PLANS, LIVE_FEATURES } from '../entitlements.js';
import { MALLOWS, MALLOW_IDS } from '../../mallows/registry.js';
import { withBrand } from '../../ui/type.js';
import { ensurePlanCss, stillFor } from '../plan-change.js';

/** The words, in one place (warm and calm, never pushy, nothing medical). */
export const WELCOME_LINES = Object.freeze({
  eyebrow: 'Your plan is confirmed',
  beyondTitle: `Welcome to ${PLANS.ultra.name}`,
  lede: 'The Mallows gathered to say hello. Here’s what’s open to you now:',
  manage: 'You can change your plan or cancel any time in Settings → Manage subscription.',
  tryAngle: 'Try Another Angle',
  continue: 'Continue',
  gathered: 'The seven Mallows, gathered together',
});

/** What Beyond opens, said only as PLANS.ultra.includes says it (Belief Mallows only while they are switched on). */
export function beyondLines() {
  return [
    'Another Angle: fresh perspectives on your own situations, explored with Zuzu',
    ...(LIVE_FEATURES.beliefMallows ? ['Belief Mallows, for the stories that keep coming back'] : []),
    `Perspective-changing worlds, with everything in ${PLANS.paid.name}`,
  ];
}
/** The full welcome for a move into Beyond; the smaller one for every other confirmed move. */
export function welcomeKind({ tier, from, fromUnknown = false } = {}) { return tier === 'ultra' && !fromUnknown && from?.tier !== 'ultra' ? 'beyond' : 'plan'; }
/** "You're on hushmallow Flow, yearly" (the period only when the server said it). */
export function planLine({ tier, period } = {}) {
  const name = PLANS[tier]?.name;
  if (!name) return 'Your plan has changed';
  return `You’re on ${name}${period === 'monthly' || period === 'yearly' ? `, ${period}` : ''}`;
}
/** The smaller confirmation's line: how it is billed now, and where it can be changed or cancelled. */
export function planDetail({ period } = {}) {
  const billed = period === 'yearly' ? 'Billed once a year.' : period === 'monthly' ? 'Billed monthly.' : '';
  return `${billed ? `${billed} ` : ''}${WELCOME_LINES.manage}`;
}

// Where each Mallow stands in the gathering (centre x %, bottom y %, width %, depth): Zuzu, Another Angle's guide,
// in front in the middle; the others close around, the back row a little raised.
const GATHER = Object.freeze([
  ['glitzi', 10, 20, 19, 1], ['blubi', 23.5, 5, 23, 2], ['pipzi', 35, 25, 20, 1], ['zuzu', 50, 1, 30, 4],
  ['boppo', 65, 25, 20, 1], ['loomi', 76.5, 5, 23, 2], ['noomi', 90, 20, 19, 1],
]);
const SMALL = Object.freeze([[30, 6, 30, 1], [50, 2, 38, 2], [70, 6, 30, 1]]);
const SPARKS = Object.freeze([[6, 78], [22, 92], [41, 86], [60, 95], [79, 88], [95, 74]]);

/** The three Mallows of the smaller welcome: the home Mallow in the middle, its two neighbours beside it. */
function smallTrio(app) {
  const home = MALLOWS[app?.prefs?.get?.('mallow')] ? app.prefs.get('mallow') : 'noomi';
  const i = MALLOW_IDS.indexOf(home), n = MALLOW_IDS.length;
  return [MALLOW_IDS[(i + n - 1) % n], home, MALLOW_IDS[(i + 1) % n]];
}
function gathering(ids, spots, { label }) {
  const kids = ids.map((id, i) => {
    const m = MALLOWS[id];
    const [x, y, w, z] = spots[i];
    return h('span', { class: 'pw-mallow', 'data-mallow': id, style: { left: `${x}%`, bottom: `${y}%`, width: `${w}%`, zIndex: String(z), animationDelay: `${140 + i * 80}ms` } },
      h('img', { src: m.file, alt: '', width: 192, height: 192, decoding: 'async', draggable: 'false' }));
  });
  const sparks = SPARKS.map(([x, y], i) => h('i', { class: 'pw-spark', style: { left: `${x}%`, bottom: `${y}%`, animationDelay: `${900 + i * 260}ms` } }));
  return h('div', { class: 'pw-gather', role: 'img', 'aria-label': label }, h('span', { class: 'pw-glow', 'aria-hidden': 'true' }), ...sparks, ...kids);
}

let uid = 0;
/** The welcome for a plan Stripe has confirmed (the CSS first, so it never shows unstyled). */
export async function openPlanWelcome(app, { tier, period = null, from = null, fromUnknown = false } = {}) {
  await ensurePlanCss();
  const kind = welcomeKind({ tier, from, fromUnknown });
  const still = stillFor(app);
  const id = `pw-title-${++uid}`, lede = `pw-lede-${uid}`;
  const done = (then) => { s.close(); then?.(); };
  let body, foot;
  if (kind === 'beyond') {
    const ids = GATHER.map(([m]) => m);
    body = h('div', { class: 'pw-body' },
      gathering(ids, GATHER.map(([, ...spot]) => spot), { label: WELCOME_LINES.gathered }),
      h('p', { class: 'pw-eyebrow' }, WELCOME_LINES.eyebrow),
      h('h2', { class: 'pw-title', id, tabindex: '-1', autofocus: true }, ...withBrand(WELCOME_LINES.beyondTitle)),
      h('p', { class: 'pw-lede', id: lede }, WELCOME_LINES.lede),
      h('ul', { class: 'pw-list' }, ...beyondLines().map((line) => {
        const i = line.indexOf(': ');
        return h('li', {}, icon('sparkle'), h('span', {}, ...(i > 0 ? [h('b', {}, line.slice(0, i + 1)), ...withBrand(line.slice(i + 1))] : withBrand(line))));
      })),
      h('p', { class: 'pw-manage' }, WELCOME_LINES.manage));
    foot = h('div', { class: 'pw-actions' },
      h('button', { class: 'btn ultra block', 'data-act': 'try-angle', onclick: () => done(() => app.go?.('angle')) }, WELCOME_LINES.tryAngle),
      h('button', { class: 'btn ghost block', 'data-act': 'continue', onclick: () => done() }, WELCOME_LINES.continue));
  } else {
    body = h('div', { class: 'pw-body' },
      gathering(smallTrio(app), SMALL, { label: 'Three Mallows, together' }),
      h('p', { class: 'pw-eyebrow' }, WELCOME_LINES.eyebrow),
      h('h2', { class: 'pw-title', id, tabindex: '-1', autofocus: true }, ...withBrand(planLine({ tier, period }))),
      h('p', { class: 'pw-lede', id: lede }, planDetail({ period })));
    foot = h('div', { class: 'pw-actions' },
      h('button', { class: 'btn primary block', 'data-act': 'continue', onclick: () => done() }, WELCOME_LINES.continue));
  }
  const s = openSheet({ title: null, label: kind === 'beyond' ? WELCOME_LINES.beyondTitle : planLine({ tier, period }), body, foot, full: kind === 'beyond' });
  // labelled by its own heading, described by the line under it
  s.el.removeAttribute('aria-label');
  s.el.setAttribute('aria-labelledby', id);
  s.el.setAttribute('aria-describedby', lede);
  s.el.classList.add('plan-welcome', `is-${kind}`);
  if (still) s.el.classList.add('is-still');
  s.el.setAttribute('data-plan-welcome', kind);
  if (tier && period) s.el.setAttribute('data-to', `${tier}.${period}`);
  s.backdrop?.classList?.add('plan-welcome-backdrop');
  app.haptic?.('success');
  if (!still) app.world?.react?.('celebrate');
  return s;
}
