// The public sign-in values for this build.
//
// tools/build-site.sh replaces this file in the published copy
// (v/<version>/src/auth/public-config.js) with the two PUBLIC values from
// the SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY build variables (Cloudflare
// Pages), after src/auth/config.js has checked them. In the repository it is
// always switched off, so the app runs exactly as it does without accounts.
// Never put a value here by hand.
export default Object.freeze({ enabled: false });
