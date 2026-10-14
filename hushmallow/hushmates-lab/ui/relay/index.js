// The Feeling Relay's scenes, and the small bit of app-wide behaviour every
// device shares (a feeling coming home is noticed wherever you are).

import { release } from './release.js';
import { support } from './support.js';
import { catchScene } from './catch.js';
import { journeys, journey } from './journeys.js';
import { returned, homecoming } from './returned.js';
import { share } from './share.js';
import { you, deleted } from './you.js';
import { yourData } from './your-data.js';
import { away } from './away.js';
import { welcome } from './welcome.js';
import { play } from '../sound.js';
import { MALLOWS } from '../mallows-data.js';

export const SCREENS = {
  welcome, release, support, catch: catchScene, journeys, journey, returned, homecoming, share, you, data: yourData, deleted, away,
  home: release,
};

export { startScene } from './start.js';

/**
 * App-wide reactions, gentle and only if the person wants them ("Tell me when a feeling comes home"):
 * a feeling that came home, and a Mallow that can now offer another way to see one. Never during a
 * moment (the homecoming, a release or a perspective being passed on), and never over the share story.
 * The dock's badge shows the state either way.
 */
export function connectRelay(dev) {
  const quiet = () => {
    const here = dev.current?.name;
    const el = dev.current?.el;
    return here === 'homecoming' || here === 'share' || el?.classList.contains('is-cinematic') || ['launch', 'passing'].includes(el?.dataset.state);
  };
  dev.client.on((state, detail) => {
    if (state.me?.profile?.notifyReturn === false) return;
    if (detail?.cameHome?.length && !quiet()) {
      play('home');
      dev.toast(detail.cameHome.length > 1 ? `${detail.cameHome.length} feelings found their way home.` : 'One of your feelings found its way home.', { ms: 3600 });
    }
    if (detail?.mallowOffer?.length && !quiet() && dev.current?.name !== 'journey') {
      const m = MALLOWS[state.me?.profile?.mallow] || MALLOWS.noomi;
      dev.toast(`Nobody’s caught one of your feelings yet. ${m.name} can offer another way to see it, if you’d like.`, { ms: 4200 });
    }
    if (detail?.mallowFound?.length && !quiet() && dev.current?.name !== 'journey') {
      const m = MALLOWS[state.me?.profile?.mallow] || MALLOWS.noomi;
      dev.toast(`Nobody had caught one of your feelings yet, so ${m.name} found another way to see it. It’s waiting in your journeys.`, { ms: 4600 });
    }
  });
}
