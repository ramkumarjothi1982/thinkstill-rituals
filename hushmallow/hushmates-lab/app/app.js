// Hushmates, the customer app: one person, one device, talking to the
// Hushmates backend. Only what a person needs is here; developer tools are
// kept apart and never ship (tools/build-app.mjs checks every build).
//
// The way in: sign in with an email code (client/supabase-auth.js), then, for
// someone who isn't a member yet, their invitation, a name and 18+. Everything
// a person keeps lives with their account on the server, so a new device only
// needs a new code. All the rest goes through the gateway (client/functions-link.js).

import { Device } from '../ui/device.js';
import { RelayClient } from '../client/relay-client.js';
import { createAuth } from '../client/supabase-auth.js';
import { FunctionsLink } from '../client/functions-link.js';
import { SCREENS, startScene, connectRelay } from '../ui/relay/index.js';
import { invite } from '../ui/relay/invite.js';
import { signin } from '../ui/relay/sign-in.js';

const host = document.getElementById('hushmates');
const screens = { ...SCREENS, invite, signin };
let current = null;
let settings = null;
let auth = null;
let gone = false;                      // the account was deleted on this device: stay with the goodbye
let ended = false;                     // a session just ended by itself: the sign-in says welcome back

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

/**
 * Where the backend is: app/config.json, next to this file (so one build can point at the
 * local stack or a Supabase project). An empty supabaseUrl means this site.
 */
async function loadSettings() {
  const res = await fetch(new URL('./config.json', import.meta.url), { cache: 'no-store', credentials: 'same-origin' });
  if (!res.ok) throw new Error('settings missing');
  const c = await res.json();
  const url = typeof c?.supabaseUrl === 'string' ? c.supabaseUrl.trim().replace(/\/+$/, '') : '';
  if (typeof c?.supabaseAnonKey !== 'string' || !c.supabaseAnonKey) throw new Error('settings incomplete');
  const path = typeof c.functionsPath === 'string' && c.functionsPath.trim() ? c.functionsPath.trim() : '/functions/v1/hushmates';
  const functions = /^https?:\/\//i.test(path) ? path : `${url}${path.startsWith('/') ? '' : '/'}${path}`;
  return { url, anonKey: c.supabaseAnonKey, functions, captchaSiteKey: typeof c.captchaSiteKey === 'string' ? c.captchaSiteKey : '' };
}

async function ready() {
  if (auth) return true;
  try {
    settings = await loadSettings();
    auth = createAuth({ url: settings.url, anonKey: settings.anonKey });
  } catch {
    settings = null;
    return false;
  }
  // another tab signed in or out: follow it (not while saying goodbye)
  auth.onChange((_s, why) => { if (why === 'storage' && !gone) boot().catch(() => resting(guest())); });
  return true;
}

const signOutHere = async () => { await auth.signOut().catch(() => {}); await boot(); };

function linkFor() {
  const link = new FunctionsLink({
    base: settings.functions, auth, anonKey: settings.anonKey,
    // the session can't be used any more (signed out elsewhere, or it ran out): back to sign-in,
    // except while saying goodbye after a deletion
    onSignedOut: () => { if (gone) return; ended = true; auth.forget(); boot().catch(() => resting(guest())); },
  });
  const request = link.request.bind(link);
  link.request = async (method, token, args) => {
    const result = await request(method, token, args);
    if (method === 'deleteMyData') {
      // the account is gone: this device forgets its session and stops asking for changes
      gone = true;
      current?.client.stop?.();
      auth.forget();
    }
    return result;
  };
  return link;
}

/** Signed out: the sign-in scene. `reason` 'signed-out' when a session just ended. */
function door(reason) {
  const device = mount(guest());
  device.env.auth = auth;
  device.env.signedIn = () => boot();
  // A check that it's a person (captchaSiteKey) needs its widget and a CSP change: not wired yet,
  // so no token is sent and Supabase's captcha protection must stay off until it is.
  device.start('signin', reason ? { reason } : {});
}

/** Signed in, not a member yet: the invitation, a name only they see, and 18+. */
function invitation(link) {
  const device = mount(guest());
  device.env.auth = auth;
  device.env.signOut = signOutHere;
  device.env.redeemInvite = async (form) => {
    await link.request('redeemInvite', null, { code: form.code, name: form.name, adult: form.adult === true });
    await boot();
  };
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
    if (!(await ready())) { resting(guest()); return; }
    if (!auth.session()) { door(ended ? 'signed-out' : undefined); ended = false; return; }
    const link = linkFor();
    let me;
    try {
      me = await link.request('me');
    } catch (e) {
      if (e.code === 'not-signed-in') { ended = false; door('signed-out'); return; }
      resting(guest());                                        // couldn't reach Hushmates: not a sign-out
      return;
    }
    if (me?.needsInvite) { invitation(link); return; }
    const client = new RelayClient(link, 'session');
    try {
      await client.start();
    } catch (e) {
      client.stop();
      if (e.code === 'not-signed-in') { ended = false; door('signed-out'); return; }
      resting(client);
      return;
    }
    const device = mount(client);
    device.env.signOut = signOutHere;
    connectRelay(device);
    device.start(startScene);
  })().finally(() => { booting = null; });
  return booting;
}

boot().catch(() => resting(guest()));
