// The Privacy Policy and the Terms of Use: two static pages, legal/privacy.html
// and legal/terms.html, which tools/build-site.sh publishes at the site's root
// (/legal/…) beside index.html, so their addresses never change between
// versions. Every link to them in the app comes from here: Settings → Privacy
// and About, the plans page's footer and the sign-up form's required tick. They
// open in a new tab, so the app keeps its place (a half-typed form included).
//
// The addresses are relative to the app's own page: index.html sits at the
// site's root, in the repository and in the published site alike (the GitHub
// Pages copy under /thinkstill-rituals/ included). tools/site/check.mjs reads
// LEGAL_PAGES and LEGAL_VERSIONS from the published copy of this file and fails
// the build when a page it names is missing or carries another version.
//
// The versions (owner, 17 Oct 2026): what a new account agrees to, recorded on
// the account at sign-up (src/auth/client.js signUp → consentRecord, in
// Supabase's user_metadata) and stamped into each page as
// <meta name="legal-version" content="…">. This is the one place they are
// written: change a page's terms → bump its version here and its stamp there
// (tests/signup-consent.test.mjs fails until both agree). A version ends in
// "-draft" exactly while the pages are drafts (the DRAFT SWITCH in
// src/ui/legal.css), so approving them needs a new version too.
//
// The pages themselves may name the provider and the technology behind Another
// Angle (tests/brand.test.mjs allows legal/ for that, like the consent card);
// these links never do.
import { h } from './ui.js';

/** Where each page lives, relative to the app's page. */
export const LEGAL_PAGES = Object.freeze({ privacy: 'legal/privacy.html', terms: 'legal/terms.html' });
/** What the links say. */
export const LEGAL_LABELS = Object.freeze({ privacy: 'Privacy Policy', terms: 'Terms' });
/** The version of each page that a sign-up agrees to (see above). */
export const TERMS_VERSION = '2026-10-17-draft';
export const PRIVACY_VERSION = '2026-10-17-draft';
export const LEGAL_VERSIONS = Object.freeze({ terms: TERMS_VERSION, privacy: PRIVACY_VERSION });
/** The sign-up form's required tick (src/app/scenes/account.js consentTick), with "Terms" and "Privacy Policy" linked. */
export const CONSENT_LINE = 'I’m 18 or older, and I agree to the Terms and the Privacy Policy';

/**
 * What a ticked box records on the new account (supabase signUp's options.data, kept as user_metadata): when the
 * person said they are 18 or older and accepted the pages, and which versions. Self-declaration: nothing else checks age.
 */
export function consentRecord(at = Date.now()) {
  const iso = new Date(at).toISOString();
  return { age_18_confirmed_at: iso, terms_accepted_at: iso, terms_version: TERMS_VERSION, privacy_version: PRIVACY_VERSION };
}

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

/** CONSENT_LINE as the tick's label: its words, with the two names linked (each opens its page in a new tab). */
export function consentLabel() {
  return ['I’m 18 or older, and I agree to the ', legalLink('terms'), ' and the ', legalLink('privacy')];
}
