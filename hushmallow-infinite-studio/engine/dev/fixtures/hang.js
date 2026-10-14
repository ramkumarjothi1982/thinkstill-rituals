// Fixture: from frame 2 on, overlay() never returns (the worker's per-frame watchdog must fire).
import { makeCard } from './card.js';

export default makeCard({ id: 'dev/hang', text: 'Stuck', hangAt: 2, frames: 6 });
