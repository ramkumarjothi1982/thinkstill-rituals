// Everything the Edge Function shares with the rest of Hushmates, in one place. The same
// screening and wording the app and the lab use, so a feeling is judged the same way
// everywhere. tools/sync-edge.mjs copies these files next to the function for deployment.

export { screenFeeling, screenReframe, providerSupport } from '../../../core/feeling-safety.js';
export { normaliseText, charCount, checkPseudonym } from '../../../core/text-policy.js';
export { LABEL_IDS } from '../../../core/relay-config.js';
export { RELAY_MESSAGES } from '../../../core/relay-messages.js';
export { formatExport } from '../../../core/export-format.js';
