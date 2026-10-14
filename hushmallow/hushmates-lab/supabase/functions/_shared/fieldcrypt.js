// Words people write, locked before they reach the database.
//
// Runtime-neutral (Web Crypto, TextEncoder, atob/btoa): the Edge Function uses
// it on Deno, the tests on Node 22.
//
// A stored text looks like  hmenc:v1:<key id>:<iv>:<ciphertext>
//   · AES-256-GCM, a fresh random 12-byte iv for every text, so the same words
//     never look the same twice;
//   · the key id is bound in as additional data ('hushmates:v1:<key id>'), so a
//     text can't be passed off as locked with a different key;
//   · GCM's tag means any change to a stored text is caught, never decrypted
//     into something else.
// The empty string stays empty, so words someone cleared stay cleared.
//
// Rotation: list every key id that may still be in the database, and name the
// newest as `current`. New texts use `current`; old ones open with their own
// key until they're rewritten. (With random ivs one key is good for billions of
// texts; rotate on a schedule or if a key may have been seen, not for volume.)
//
// `mac` is a keyed hash (HMAC-SHA256) with its own key, for duplicate checks
// and look-ups (e.g. invitation codes) without keeping the words. It hashes
// exactly what it's given: normalise first if near-identical texts should match.

const PREFIX = 'hmenc:v1:';
const KID = /^[A-Za-z0-9_-]{1,32}$/;
const B64URL = /^[A-Za-z0-9_-]+$/;
const MAX_DEPTH = 64;

const encoder = new TextEncoder();
const strictDecoder = new TextDecoder('utf-8', { fatal: true });

function bytesToBase64url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Accepts standard base64 (what `openssl rand -base64 32` prints) or base64url.
function base64ToBytes(s) {
  const clean = String(s).trim().replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
  if (!/^[A-Za-z0-9+/]*$/.test(clean)) throw new Error('not base64');
  const bin = atob(clean + '==='.slice((clean.length + 3) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function keyBytes(value, what) {
  let bytes;
  try { bytes = base64ToBytes(value); } catch { throw new Error(`${what} is not base64`); }
  if (bytes.length !== 32) throw new Error(`${what} must be 32 bytes (it is ${bytes.length})`);
  return bytes;
}

const sameBytes = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

class CannotUnlock extends Error {
  constructor(reason) {
    super('This text could not be unlocked.');
    this.name = 'CannotUnlock';
    this.code = 'decrypt-failed';
    this.reason = reason;                       // for the server's log only
  }
}

/** True for a string in the stored, locked form. */
export const isEncrypted = (s) => typeof s === 'string' && s.startsWith(PREFIX);

/**
 * @param {object} o
 *   keys     { [kid]: base64 32-byte key }  every key that may still be in use
 *   current  the kid new texts are locked with
 *   macKey   base64 32 bytes, used only for `mac` (never one of the keys above)
 */
export async function createFieldCrypt({ keys, current, macKey } = {}) {
  if (!keys || typeof keys !== 'object' || Object.keys(keys).length === 0) throw new Error('createFieldCrypt needs keys');
  if (!Object.hasOwn(keys, current)) throw new Error('the current key id is not among the keys');
  const raw = new Map();
  for (const [kid, value] of Object.entries(keys)) {
    if (!KID.test(kid)) throw new Error(`key id ${JSON.stringify(kid)} must be 1-32 letters, digits, - or _`);
    raw.set(kid, keyBytes(value, `key ${kid}`));
  }
  const macBytes = keyBytes(macKey, 'macKey');
  // one key, one job: a key that both locks and hashes would tie the two together
  for (const [kid, bytes] of raw) if (sameBytes(bytes, macBytes)) throw new Error(`macKey must differ from key ${kid}`);

  const aes = new Map();
  for (const [kid, bytes] of raw) {
    aes.set(kid, await crypto.subtle.importKey('raw', bytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']));
  }
  const hmac = await crypto.subtle.importKey('raw', macBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const aad = (kid) => encoder.encode(`hushmates:v1:${kid}`);

  async function encrypt(text) {
    if (typeof text !== 'string') throw new TypeError('encrypt takes a string');
    if (text === '') return '';
    // locking twice would hand someone a locked text as their words later
    if (isEncrypted(text)) throw new Error('this text is already encrypted');
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: aad(current), tagLength: 128 }, aes.get(current), encoder.encode(text)));
    return `${PREFIX}${current}:${bytesToBase64url(iv)}:${bytesToBase64url(ct)}`;
  }

  async function decrypt(s) {
    if (s === '') return '';
    if (!isEncrypted(s)) throw new CannotUnlock('not-encrypted');
    const parts = s.slice(PREFIX.length).split(':');
    if (parts.length !== 3) throw new CannotUnlock('malformed');
    const [kid, ivText, ctText] = parts;
    const key = aes.get(kid);
    if (!key) throw new CannotUnlock('unknown-kid');
    if (!B64URL.test(ivText) || !B64URL.test(ctText)) throw new CannotUnlock('malformed');
    let iv, ct;
    try { iv = base64ToBytes(ivText); ct = base64ToBytes(ctText); } catch { throw new CannotUnlock('malformed'); }
    if (iv.length !== 12 || ct.length < 16) throw new CannotUnlock('malformed');
    let plain;
    try {
      plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: aad(kid), tagLength: 128 }, key, ct);
    } catch {
      throw new CannotUnlock('tampered');
    }
    try { return strictDecoder.decode(plain); } catch { throw new CannotUnlock('not-text'); }
  }

  async function mac(text) {
    if (typeof text !== 'string') throw new TypeError('mac takes a string');
    const sig = new Uint8Array(await crypto.subtle.sign('HMAC', hmac, encoder.encode(text)));
    return Array.from(sig, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  // A new value (the input is left alone) with every locked string opened.
  async function decryptDeep(value, depth = 0) {
    if (depth > MAX_DEPTH) throw new Error('data nested too deeply');
    if (typeof value === 'string') return isEncrypted(value) ? decrypt(value) : value;
    if (Array.isArray(value)) return Promise.all(value.map((v) => decryptDeep(v, depth + 1)));
    if (value !== null && typeof value === 'object') {
      const proto = Object.getPrototypeOf(value);
      if (proto !== Object.prototype && proto !== null) return value;            // dates and the like: as they are
      const entries = await Promise.all(Object.entries(value).map(async ([k, v]) => [k, await decryptDeep(v, depth + 1)]));
      return Object.fromEntries(entries);                                          // own keys only, even '__proto__'
    }
    return value;
  }

  return Object.freeze({ encrypt, decrypt, mac, decryptDeep: (value) => decryptDeep(value), isEncrypted, currentKid: current });
}
