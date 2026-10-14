// Lab only: small notes for testers inside the phones. The customer app never
// loads this file; scenes leave a place for a host note (ui/relay/parts.js
// hostNote) and the lab fills it, so no testing words live in the app's code.

import { h } from '../ui/dom.js';

/** Where a Mallow perspective really came from, so testers can tell a live AI response from a canned example. */
const SOURCES = { ai: 'live AI response (test key)', library: 'Reframe library (rule-based)', demo: 'canned example' };

export function labNote(kind, data = {}) {
  switch (kind) {
    case 'mallow-source':
      return h('span', { class: `hf-lab-tag hf-lab-tag--${data.source === 'ai' ? 'live' : 'canned'}`, dataset: { test: 'lab-source', source: data.source } }, `Lab · ${SOURCES[data.source] || data.source}`);
    case 'account':
      return data.me?.test ? h('span', { class: 'hf-lab-tag', title: 'A simulated account used for testing the prototype' }, 'Lab · test identity') : null;
    case 'support':
      return h('p', { class: 'kit-note hf-lab-tag hf-lab-tag--note' }, 'Lab note: crisis resources must be reviewed for each launch region by a safety lead before real people use Hushmates.');
    case 'pilot':
      return h('span', { class: 'hf-lab-tag hf-lab-tag--block' }, 'Lab: every account here is a simulated test identity; nothing reaches real people.');
    default:
      return null;
  }
}
