// The Privacy Policy and the Terms of Use: two static pages, legal/privacy.html
// and legal/terms.html, which tools/build-site.sh publishes at the site's root
// (/legal/…) beside index.html, so their addresses never change between
// versions. Every link to them in the app comes from here: Settings → Privacy
// and About, the plans page's footer and the sign-up form. They open in a new
// tab, so the app keeps its place (a half-typed form included).
//
// The addresses are relative to the app's own page: index.html sits at the
// site's root, in the repository and in the published site alike (the GitHub
// Pages copy under /thinkstill-rituals/ included). tools/site/check.mjs reads
// LEGAL_PAGES from the published copy of this file and fails the build when a
// page it names is missing.
//
// The pages themselves may name the provider and the technology behind Another
// Angle (tests/brand.test.mjs allows legal/ for that, like the consent card);
// these links never do.
import { h } from './ui.js';

/** Where each page lives, relative to the app's page. */
export const LEGAL_PAGES = Object.freeze({ privacy: 'legal/privacy.html', terms: 'legal/terms.html' });
/** What the links say. */
export const LEGAL_LABELS = Object.freeze({ privacy: 'Privacy Policy', terms: 'Terms' });
/** The sign-up form's line (src/app/scenes/account.js), with "Terms" and "Privacy Policy" linked (agreeLine). */
export const AGREE_LINE = 'By creating an account you agree to the Terms and Privacy Policy.';

/**
 * A link to one page, in a new tab. Its accessible name starts with the words on it (WCAG 2.5.3) and says it opens
 * a new tab, like the support sheet's links. cls / style: for a link drawn as a button.
 */
export function legalLink(kind, { label = LEGAL_LABELS[kind], cls = null, style = null } = {}) {
  return h('a', { href: LEGAL_PAGES[kind], target: '_blank', rel: 'noopener', class: cls, style, 'aria-label': `${label} (opens a new tab)`, 'data-legal': kind }, label);
}

/** "Terms · Privacy Policy": the small pair under Settings → About and at the foot of the plans page (app.css .legal-links). */
export function legalLinks(cls = 'legal-links') {
  return h('p', { class: cls, 'data-legal': 'links' }, legalLink('terms'), h('span', { 'aria-hidden': 'true' }, ' · '), legalLink('privacy'));
}

/** AGREE_LINE as a paragraph, its two names linked. */
export function agreeLine(cls = null) {
  return h('p', { class: cls, 'data-legal': 'agree' }, 'By creating an account you agree to the ', legalLink('terms'), ' and ', legalLink('privacy'), '.');
}
