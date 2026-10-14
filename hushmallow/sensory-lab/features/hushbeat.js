// Placeholder until Hushbeat Symphony lands (owned by the hushbeat engineer from hand-over).
import { stageScreen } from './stage-screen.js';
export const meta = { id: 'hushbeat', title: 'Hushbeat Symphony' };
export function mount(root, ctx) { const s = stageScreen(root, ctx, { title: 'Hushbeat Symphony', onExit: () => ctx.navigate('/') }); return { unmount() { s.unmount(); } }; }
