// Placeholder until Weather Weaver lands (owned by the weather engineer from hand-over).
import { stageScreen } from './stage-screen.js';
export const meta = { id: 'weather', title: 'Hushfold Weather Weaver' };
export function mount(root, ctx) { const s = stageScreen(root, ctx, { title: 'Hushfold Weather Weaver', onExit: () => ctx.navigate('/') }); return { unmount() { s.unmount(); } }; }
