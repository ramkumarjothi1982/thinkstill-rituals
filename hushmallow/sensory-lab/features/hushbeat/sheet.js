// Hushbeat sheets, both on the lab's openSheet and built fresh each time they open:
//   "Sound and pace" (the ♪ button)  Volume (the lab's own volume, as in Settings), Music |
//       Visual only, Breath pace for this visit, Friend answers (in a duet), Your tunes
//       (Play and Remove), Lab settings, and the footnote on what silences the music.
//   "Who joins Boppo?" (Friend)  the six other Mallows, each with the two words for its
//       instrument, and Play alone in a duet. A friend is for this visit only.
// The feature opens them inside its screen (so they take the realm's chrome tones and
// the .hushbeat styles) and passes a model of callbacks; nothing here holds state.
// The pure helpers at the top (friend choices, kept tunes, the take as a tune, the
// friend's tier) are exported for the Node tests.

import { h, openSheet, segmented } from '../../lab-ui.js';
import { describeTune, PACES, FAV_CAP } from '../../core/comfort-dna.js';
import { encodeMotif } from '../../core/music-time.js';
import { MALLOWS, MALLOW_IDS } from '../../../src/mallows/registry.js';
import { COPY } from './copy.js';

const valid = (id) => typeof id === 'string' && Object.hasOwn(MALLOWS, id);

/** A friend runs one quality tier below the lab's (two soft bodies, one realm). */
export const TIER_BELOW = Object.freeze({ high: 'medium', medium: 'low', low: 'low' });
export const tierBelow = (q) => TIER_BELOW[q] || 'low';

/** The six other Mallows for the picker: { id, name, words, colour }. */
export function friendChoices(lead) {
  return MALLOW_IDS.filter((id) => id !== lead).map((id) => ({ id, name: MALLOWS[id].name, words: COPY.soundWords[id], colour: MALLOWS[id].colours.body }));
}

/** The kept tunes to list: newest first (favourites are kept newest first), at most six. */
export function yourTunes(favourites) {
  return (Array.isArray(favourites) ? favourites : []).filter((f) => f && f.kind === 'hushbeat').slice(0, FAV_CAP.hushbeat);
}

/**
 * The take as a favourite tune, or null without events. The friend is the one on stage now, or
 * (when it has left) the one who played the take's friend notes, so a kept duet always comes back
 * as a duet; never the lead itself.
 */
export function tuneItem({ lead, friend = null, takeFriend = null, pace = 'natural', events = null } = {}) {
  if (!valid(lead) || !Array.isArray(events) || !events.length) return null;
  const f = valid(friend) ? friend : (events.some((e) => e.slot === 1) && valid(takeFriend) ? takeFriend : null);
  return {
    kind: 'hushbeat', id: 'hushbeat', mallow: lead, ...(f && f !== lead ? { friend: f } : {}),
    pace: PACES.includes(pace) ? pace : 'natural', motif: encodeMotif(events),
  };
}

// The sheet handle: onClosed runs once, whatever closed it (Done, the scrim, Escape or close()), through
// openSheet's onClose. → { el, close(), open }
function sheetOf(root, title, content, onClosed) {
  let done = false, body = null;
  const close = openSheet(root, title, (closeSheet) => (body = content(closeSheet)), {
    onClose: () => { if (done) return; done = true; onClosed?.(); },
  });
  return { el: body?.closest('.sheet') || null, close, get open() { return !done; } };
}

const row = (label, ctl, sub, cls = '') => h('div', { class: `row ${cls}`.trim() },
  h('span', { class: 'lbl' }, label, sub ? h('span', { class: 'sub' }, sub) : null), ctl);

/**
 * "Sound and pace". model: { pace, setPace(p), duet, answers, setAnswers(b), tunes() → items | null
 * (null: personalisation is off), playTune(it), removeTune(it), onClosed() }.
 * → { el, close(), open }
 */
export function openMusicSheet(root, ctx, model) {
  const { prefs } = ctx;
  return sheetOf(root, COPY.sheet.title, (closeSheet) => {
    const vol = h('input', {
      type: 'range', min: '0', max: '1', step: '0.05', value: String(prefs.get('volume')), 'aria-label': COPY.aria.volume, class: 'hb-volume',
      oninput: (e) => prefs.set('volume', +e.target.value),
    });
    const sound = segmented([[false, COPY.sheet.music], [true, COPY.sheet.visualOnly]], !!prefs.get('musicVisualOnly'),
      (v) => prefs.set('musicVisualOnly', v), COPY.sheet.sound);
    const pace = segmented(PACES.map((p) => [p, COPY.sheet.paces[p]]), model.pace, (p) => model.setPace?.(p), COPY.sheet.pace);
    const answers = model.duet
      ? segmented([[true, COPY.sheet.on], [false, COPY.sheet.off]], model.answers !== false, (v) => model.setAnswers?.(v), COPY.sheet.answers)
      : null;
    for (const s of [sound, pace, answers]) s?.classList.add('hb-seg');

    // Your tunes: Play closes the sheet and plays the tune here; Remove updates the list in place
    const list = h('div', { class: 'hb-tunes', role: 'list', tabindex: '-1', 'aria-label': COPY.sheet.tunes });
    const render = (focusAt = -1) => {
      const tunes = model.tunes?.();
      list.replaceChildren();
      if (!tunes) { list.append(h('p', { class: 'hb-empty' }, COPY.sheet.tunesOff)); return; }
      if (!tunes.length) { list.append(h('p', { class: 'hb-empty' }, COPY.sheet.tunesEmpty)); if (focusAt >= 0) list.focus({ preventScroll: true }); return; }
      // two takes can share a description: each row also says where it is in the list (newest first)
      tunes.forEach((it, i) => {
        const name = describeTune(it), n = tunes.length;
        list.append(h('div', { class: 'hb-tune', role: 'listitem' },
          h('span', { class: 'hb-tune-name' }, name, h('span', { class: 'hb-tune-pos' }, COPY.sheet.position(i))),
          h('span', { class: 'hb-tune-acts' },
            h('button', { type: 'button', class: 'btn-quiet hb-tune-play', 'aria-label': COPY.sheet.playTune(name, i, n), onclick: () => { closeSheet(); model.playTune?.(it); } }, COPY.sheet.play),
            h('button', {
              type: 'button', class: 'btn-quiet hb-tune-remove', 'aria-label': COPY.sheet.removeTune(name, i, n),
              onclick: () => { model.removeTune?.(it); render(i); },
            }, COPY.sheet.remove))));
      });
      // after a Remove, focus stays in the list (never falls to the page, where Escape would leave)
      if (focusAt >= 0) {
        const rows = list.querySelectorAll('.hb-tune-remove');
        (rows[Math.min(focusAt, rows.length - 1)] || list).focus({ preventScroll: true });
      }
    };
    render();

    const settings = h('button', { type: 'button', class: 'btn-quiet hb-lab', onclick: () => { closeSheet(); ctx.openSettings?.(); } }, COPY.sheet.open);
    return h('div', { class: 'hb-sheet' },
      row(COPY.sheet.volume, vol, COPY.sheet.volumeSub),
      row(COPY.sheet.sound, sound, COPY.sheet.soundSub),
      row(COPY.sheet.pace, pace, COPY.sheet.paceSub),
      answers ? row(COPY.sheet.answers, answers, COPY.sheet.answersSub, 'hb-answers') : null,
      h('div', { class: 'row stack hb-tunes-row' }, h('span', { class: 'lbl' }, COPY.sheet.tunes), list),
      row(COPY.sheet.lab, settings),
      h('p', { class: 'hb-foot' }, COPY.sheet.footnote));
  }, model.onClosed);
}

/** "Who joins Boppo?": onPick(id | null) after the sheet closes; the friend on stage just closes it. → { el, close(), open } */
export function openFriendPicker(root, ctx, { lead, friend = null, onPick, onClosed } = {}) {
  return sheetOf(root, COPY.friend.title(MALLOWS[lead]?.name || ''), (closeSheet) => {
    const pick = (id) => { closeSheet(); if (id !== friend) onPick?.(id); };
    return h('div', { class: 'hb-sheet hb-friends-sheet' },
      h('div', { class: 'hb-friends', role: 'group', 'aria-label': COPY.friend.title(MALLOWS[lead]?.name || '') },
        ...friendChoices(lead).map((m) => h('button', {
          type: 'button', class: 'hb-friend', 'data-mallow': m.id, 'aria-pressed': String(m.id === friend),
          'aria-label': COPY.friend.pill(m.name, m.words, m.id === friend), onclick: () => pick(m.id),
        },
        h('span', { class: 'hb-dot', 'aria-hidden': 'true', style: { background: m.colour } }),
        h('span', { class: 'hb-friend-txt' }, h('b', {}, m.name), h('small', {}, m.words))))),
      friend ? h('button', { type: 'button', class: 'btn-quiet hb-alone', onclick: () => pick(null) }, COPY.friend.alone) : null);
  }, onClosed);
}
