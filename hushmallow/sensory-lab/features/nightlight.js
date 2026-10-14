// Placeholder until Mallow Nightlight lands (owned by the nightlight engineer from hand-over).
import { stageScreen } from './stage-screen.js';
export const meta = { id: 'nightlight', title: 'Mallow Nightlight' };
export function mount(root, ctx) { const s = stageScreen(root, ctx, { title: 'Mallow Nightlight', onExit: () => ctx.navigate('/') }); return { unmount() { s.unmount(); } }; }
