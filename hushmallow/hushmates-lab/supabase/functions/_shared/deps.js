// Everything the Edge Function shares with the rest of Hushmates, in one place. The same
// screening and wording the app and the lab use, so a feeling is judged the same way
// everywhere. The files under ./vendor are exact copies of the originals (in core/ and the
// main app's src/ultra), made by tools/sync-edge.mjs so a Supabase deploy carries them;
// the tests fail if a copy and its original ever differ.

export { screenFeeling, screenReframe, providerSupport } from './vendor/hushmates-lab/core/feeling-safety.js';
export { normaliseText, charCount, checkPseudonym } from './vendor/hushmates-lab/core/text-policy.js';
export { LABEL_IDS } from './vendor/hushmates-lab/core/relay-config.js';
export { RELAY_MESSAGES } from './vendor/hushmates-lab/core/relay-messages.js';
export { formatExport } from './vendor/hushmates-lab/core/export-format.js';
export { libraryProvider, anotherAngleProvider } from './vendor/hushmates-lab/core/perspectives.js';
