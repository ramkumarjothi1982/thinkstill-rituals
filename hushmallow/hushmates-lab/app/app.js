// Hushmates, the customer app: one person, one device, talking to the
// Hushmates server. Only what a person needs is here; developer tools are
// kept apart and never ship (tools/build-app.mjs checks every build).

import { Device } from '../ui/device.js';
import { RelayClient } from '../client/relay-client.js';
import { HttpLink, session, signIn, signOut } from '../client/http-link.js';
import { SCREENS, startScene, connectRelay } from '../ui/relay/index.js';
import { invite } from '../ui/relay/invite.js';

const host = document.getElementById('hushmates');
const screens = { ...SCREENS, invite };
let current = null;

function mount(client) {
  current?.client.stop?.();
  current?.root.remove();
  const root = document.createElement('div');
  root.className = 'app-device';
  host.append(root);
  const device = new Device(root, client, { name: 'you', screens, start: startScene });
  current = { root, client, device };
  return device;
}

/** Before sign-in there is no account: a quiet stand-in client keeps the scenes' contract. */
const guest = () => ({ state: { online: globalThis.navigator?.onLine !== false, ready: true, me: null, journeys: [], gifts: [] }, on: () => () => {}, now: () => Date.now(), stop() {} });

function door() {
  const device = mount(guest());
  device.env.signIn = async (form) => { await signIn(form); await boot(); };
  device.start('invite');
}

/** Hushmates couldn't be reached: a gentle screen, and another try when the connection returns. */
function resting(client) {
  client.stop?.();
  const device = mount(client);
  device.env.retry = () => boot();
  device.start('away');
  globalThis.addEventListener('online', () => boot().catch(() => {}), { once: true });
}

let booting = null;
function boot() {
  booting ||= (async () => {
    const who = await session().catch(() => null);
    if (!who) { resting(guest()); return; }                     // couldn't reach the server: not a sign-out
    if (!who.signedIn) { door(); return; }
    const link = new HttpLink({
      // the session ended (signed out elsewhere, or the data was deleted): back to the door, except
      // while saying goodbye after a deletion
      onSignedOut: () => { if (current?.device.current?.name !== 'deleted') boot(); },
    });
    const client = new RelayClient(link, 'session');
    try {
      await client.start();
    } catch (e) {
      if (e.code === 'not-signed-in') { door(); return; }
      resting(client);
      return;
    }
    const device = mount(client);
    device.env.signOut = async () => { await signOut().catch(() => {}); await boot(); };
    connectRelay(device);
    device.start(startScene);
  })().finally(() => { booting = null; });
  return booting;
}

boot().catch(() => resting(guest()));
