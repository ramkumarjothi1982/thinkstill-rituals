/* ThinkStill safety layer (instance-scoped)
 * Runs locally BEFORE any AI call, and again on the AI's own "safety" field.
 *   support -> stop the game and show real help (no playful framing)
 *   care    -> the game may run, but endings point toward proper help and never reassure
 *   ok      -> play
 * Australian services by default (verified against healthdirect.gov.au, Oct 2026).
 * No regex lookbehind anywhere (older iOS Safari).
 */
(function (env) {
  'use strict';
  const TS = env.TS;
  const S = (TS.safety = {});

  const SUPPORT = [
    /\bsuicid/i, /\bkill(ing)?\s+my\s*self\b/i, /\bend\s+(it\s+all|my\s+life|things)\b/i, /\b(want|wanna|wish)\s+(to\s+)?(die|be\s+dead|disappear\s+forever)\b/i,
    /\bdon'?t\s+want\s+to\s+(be\s+alive|live|wake\s+up|exist)\b/i, /\bbetter\s+off\s+(dead|without\s+me)\b/i, /\bno\s+(reason|point)\s+(to|in)\s+(live|living|going\s+on)\b/i,
    /\bself[-\s]?harm/i, /\b(cut|cutting|hurt|hurting|burn|burning)\s+my\s*self\b/i, /\boverdos/i, /\bcan'?t\s+go\s+on\b/i,
    /\b(kill|hurt|stab|shoot)\s+(him|her|them|someone|somebody|people|my\s+\w+)\b/i,
    /\b(he|she|they|partner|husband|wife|boyfriend|girlfriend|dad|mum|mom|father|mother)\s+(hit|hits|beat|beats|chok\w*|strangl\w*|threaten\w*\s+to\s+kill)\b/i,
    /\b(abus(e|ed|ing|ive)|rape|raped|sexual(ly)?\s+assault\w*|molest\w*)\b/i, /\bnot\s+safe\s+(at\s+home|with)\b/i,
    /\b(can'?t|cannot)\s+breathe\b/i, /\bchest\s+pain\b/i, /\boverdosed\b/i
  ];
  const CARE = [
    /\b(doctor|gp|hospital|diagnos\w*|biopsy|scan\s+results?|test\s+results?|lump|tumou?r|cancer|pregnan\w*|miscarr\w*)\b/i,
    /\b(lawyer|solicitor|court|police|arrest\w*|charged|lawsuit|sued)\b/i,
    /\b(debt|bankrupt\w*|evict\w*|foreclos\w*|homeless|can'?t\s+pay\s+(rent|bills))\b/i,
    /\b(funeral|passed\s+away|grieving|bereave\w*)\b/i
  ];

  S.screen = (text) => {
    const t = String(text || '');
    if (SUPPORT.some(r => r.test(t))) return 'support';
    if (CARE.some(r => r.test(t))) return 'care';
    return 'ok';
  };
  S.merge = (local, ai) => {
    const rank = { ok: 0, care: 1, support: 2 };
    const a = rank[local] ?? 0, b = rank[ai] ?? 0;
    return a >= b ? (local || 'ok') : ai;
  };

  S.SERVICES = [
    { name: 'Emergency', detail: 'If you or someone else is in danger right now', number: '000' },
    { name: 'Lifeline', detail: '24/7 crisis support. Text 0477 13 11 14', number: '13 11 14' },
    { name: 'Suicide Call Back Service', detail: '24/7 phone and online counselling', number: '1300 659 467' },
    { name: 'Beyond Blue', detail: 'Talk to a counsellor', number: '1300 22 4636' },
    { name: '1800RESPECT', detail: 'Family, domestic and sexual violence', number: '1800 737 732' },
    { name: 'Kids Helpline', detail: 'Ages 5 to 25', number: '1800 55 1800' }
  ];
  S.CARE_LINE = 'If this involves health, money, housing or legal stuff, someone qualified can tell you exactly where you stand.';

  /* Full-screen support panel inside the game root. onBack returns to the start, never straight into play. */
  S.show = (o) => {
    o = o || {};
    TS.track('safety_support', {});
    TS.emit('safety', 'support');
    const h = TS.h;
    const old = TS.$('.ts-support'); if (old) old.remove();
    const copy = async (btn, num, numEl) => {
      try { await navigator.clipboard.writeText(num.replace(/\s/g, '')); btn.textContent = 'Copied'; }
      catch (e) {
        try { const r = document.createRange(); r.selectNodeContents(numEl); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = 'Selected'; } catch (e2) { btn.textContent = 'Press and hold'; }
      }
      TS.later(() => { btn.textContent = 'Copy'; }, 1600);
    };
    const panel = h('div', { class: 'ts-support', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Support' },
      h('div', { class: 'ts-support-card' },
        h('h2', { text: 'Let’s pause the game.' }),
        h('p', { text: 'What you wrote sounds heavier than a game should carry. You deserve to talk to a real person about it, and you can reach someone right now.' }),
        h('ul', { class: 'ts-support-list' },
          S.SERVICES.map(sv => {
            const num = h('a', { href: 'tel:' + sv.number.replace(/\s/g, ''), text: sv.number });
            const b = h('button', { type: 'button', class: 'ts-btn ts-btn-quiet', text: 'Copy' });
            b.addEventListener('click', () => copy(b, sv.number, num));
            return h('li', null, h('div', { class: 'ts-support-name' }, h('strong', { text: sv.name }), h('span', { text: sv.detail })), h('div', { class: 'ts-support-num' }, num, b));
          })
        ),
        h('p', { class: 'ts-support-note', text: 'Outside Australia? Call your local emergency number.' }),
        h('div', { class: 'ts-support-actions' },
          (() => { const b = h('button', { type: 'button', class: 'ts-btn', text: o.backLabel || 'Back to the start' }); b.addEventListener('click', () => { panel.remove(); if (o.onBack) o.onBack(); }); return b; })()
        )
      )
    );
    TS.layer().append(panel);
    TS.later(() => { const f = panel.querySelector('button'); if (f) f.focus(); }, 50);
    return panel;
  };
})(window.TSG_ENV);
