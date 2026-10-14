// Fixture: a direction whose meta names runtime 'v3'. The engine must route it by
// meta.runtime (to the composer runtime, not installed before WP-03), never by its id (R3).
import { makeCard } from './card.js';

export default makeCard({ id: 'dev/v3-probe', text: 'v3', runtime: 'v3' });
