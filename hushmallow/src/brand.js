// hushmallow brand — the single source of how the brand is written.
//
// The brand is always lowercase, also at the start of a sentence:
// "hushmallow". Never put it inside an uppercasing style (.eyebrow, badges,
// overlines) unless it is wrapped in brandMark() / .brand-name, which can
// never be transformed. Plan ids stay 'paid' / 'ultra' (StoreKit, stored
// entitlements and tests depend on them); only the customer names change.
//
// index.html, manifest.webmanifest and the Framer embed cannot import this
// file, so they use literals; tests/brand.test.mjs keeps them in line.

const A = (p) => new URL(`../assets/brand/${p}`, import.meta.url).href;

/** Widths the logo is exported at (WebP), for srcset. */
export const LOGO_WIDTHS = Object.freeze([360, 480, 720, 960]);

export const BRAND = Object.freeze({
  brandName: 'hushmallow',
  brandTagline: 'Less noise. More magic.',
  brandLockup: 'hushmallow — Less noise. More magic.',
  productDescriptor: 'Your second brain for feelings.',
  flowPlanName: 'hushmallow Flow',
  flowTagline: 'A little more room for your feelings.',
  beyondPlanName: 'hushmallow Beyond',
  beyondTagline: 'There’s more than one way to see it.',
  planName: Object.freeze({ paid: 'hushmallow Flow', ultra: 'hushmallow Beyond' }),   // tier ids stay paid/ultra
  // the approved logo, lettering recoloured only (mascot pixels untouched):
  // light lettering for dark grounds, ink lettering for light ones
  logo: Object.freeze({
    light: A('hushmallow-logo-light-720.webp'),
    ink: A('hushmallow-logo-ink-720.webp'),
    light2x: A('hushmallow-logo-light-960.webp'),
    w: 1540, h: 289,
  }),
});

export const { brandName, brandTagline, brandLockup, productDescriptor, flowPlanName, flowTagline, beyondPlanName, beyondTagline } = BRAND;

/** `Settings · hushmallow`, or just `hushmallow`. */
export const docTitle = (t) => (t ? `${t} · ${brandName}` : brandName);

/** The customer name of a tier id ('paid' → 'hushmallow Flow'); null for none. */
export const planNameFor = (tier) => BRAND.planName[tier] || null;

/** One exported logo file: tone 'light' | 'ink', width one of LOGO_WIDTHS. */
export const logoUrl = (tone = 'light', width = 720) => A(`hushmallow-logo-${tone === 'ink' ? 'ink' : 'light'}-${width}.webp`);

/** srcset for an <img> of the logo. */
export const logoSrcset = (tone = 'light') => LOGO_WIDTHS.map((w) => `${logoUrl(tone, w)} ${w}w`).join(', ');
