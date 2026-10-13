// The Feeling Relay's scenes, and the small bit of app-wide behaviour every
// device shares (a feeling coming home is noticed wherever you are).

import { release } from './release.js';
import { support } from './support.js';
import { catchScene } from './catch.js';
import { journeys, journey } from './journeys.js';
import { returned, homecoming } from './returned.js';
import { share } from './share.js';
import { you, deleted } from './you.js';
import { welcome } from './welcome.js';
import { play } from '../sound.js';

export const SCREENS = {
  welcome, release, support, catch: catchScene, journeys, journey, returned, homecoming, share, you, deleted,
  home: release,
};

/** Where a person starts: the welcome until they've been through it. */
export const startScene = (state) => (state.me?.accountState === 'deleted' ? 'deleted' : state.me?.profile?.onboarded ? 'release' : 'welcome');

/** App-wide reactions: a feeling that comes home is announced (gently) anywhere. */
export function connectRelay(dev) {
  dev.client.on((state, detail) => {
    if (!detail?.cameHome?.length) return;
    const here = dev.current?.name;
    if (here === 'homecoming') return;
    play('home');
    dev.toast(detail.cameHome.length > 1 ? `${detail.cameHome.length} feelings found their way home.` : 'Your feeling found its way home.', { ms: 3600 });
  });
}
