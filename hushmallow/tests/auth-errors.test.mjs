// Friendly, secure messages (no account enumeration, never the server's own
// text) and the /auth/callback link parsing (no open redirect).
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { friendlyError, callbackError, checkEmail, checkPassword, passwordStrength, MESSAGES, PASSWORD_MIN } from '../src/auth/errors.js';
import { parseCallback, returnUrl, scrubbedUrl, OTP_TYPES } from '../src/auth/callback.js';
import { siteRoot, callbackUrl } from '../src/auth/client.js';

const api = (code, status = 400, extra = {}) => ({ name: 'AuthApiError', code, status, message: `server says ${code} for someone@example.com`, ...extra });

test('a wrong password and an unknown email read exactly the same', () => {
  const a = friendlyError(api('invalid_credentials'), 'signin');
  const b = friendlyError(api('user_not_found'), 'signin');
  const c = friendlyError({ status: 400, message: 'Invalid login credentials' }, 'signin');
  assert.equal(a.message, b.message); assert.equal(a.message, c.message);
  assert.equal(a.code, 'invalid_login'); assert.equal(a.field, 'password');
});

test('sign-up never says an email is taken; reset and resend are always neutral (callers show "check your email")', () => {
  for (const code of ['user_already_exists', 'email_exists']) {
    const f = friendlyError(api(code, 422), 'signup');
    assert.equal(f.code, 'neutral_sent');
    assert.equal(f.message, '');
  }
});

test('no message ever echoes server text, emails or codes', () => {
  const codes = ['invalid_credentials', 'email_not_confirmed', 'weak_password', 'same_password', 'otp_expired', 'flow_state_not_found', 'bad_code_verifier',
    'reauthentication_needed', 'reauthentication_not_valid', 'over_email_send_rate_limit', 'session_not_found', 'refresh_token_not_found', 'signup_disabled',
    'email_address_invalid', 'validation_failed', 'captcha_failed', 'something_new', 'unexpected_failure'];
  for (const code of codes) {
    for (const ctx of ['signin', 'signup', 'reset', 'resend', 'callback', 'password', 'reauth', 'delete', 'sync']) {
      const f = friendlyError(api(code), ctx);
      assert.ok(typeof f.message === 'string');
      assert.doesNotMatch(f.message, /server says|@example\.com|AuthApiError|\b(400|401|403|422|429|500)\b/, `${code}/${ctx}`);
      assert.doesNotMatch(f.message, /\bAI\b/);
      if (f.message) assert.ok(f.message.length <= 160, `${code}: short`);
    }
  }
  for (const m of Object.values(MESSAGES)) assert.doesNotMatch(m, /Hushmallow|HUSHMALLOW/, 'the brand is lowercase');
});

test('mapping: limits, network, server, links, codes, sessions', () => {
  assert.equal(friendlyError(api('over_email_send_rate_limit', 429), 'resend').code, 'rate_limited');
  assert.equal(friendlyError({ status: 429 }, 'signin').code, 'rate_limited');
  assert.equal(friendlyError({ name: 'AuthRetryableFetchError', status: 0, message: 'Failed to fetch' }, 'signin').code, 'network');
  assert.equal(friendlyError(new TypeError('Failed to fetch'), 'signup').code, 'network');
  assert.equal(friendlyError({ status: 503 }, 'signin').code, 'server');
  assert.equal(friendlyError(api('otp_expired', 403), 'callback').code, 'link_expired');
  assert.equal(friendlyError({ name: 'AuthPKCECodeVerifierMissingError' }, 'callback').code, 'link_other_device');
  assert.equal(friendlyError(api('reauthentication_needed'), 'password').code, 'code_needed');
  assert.equal(friendlyError(api('reauthentication_not_valid'), 'password').code, 'code_wrong');
  assert.equal(friendlyError(api('same_password', 422), 'password').code, 'password_same');
  assert.equal(friendlyError(api('weak_password', 422, { reasons: ['length'] }), 'signup').code, 'password_short');
  assert.equal(friendlyError(api('weak_password', 422, { reasons: ['pwned'] }), 'signup').code, 'password_weak');
  assert.equal(friendlyError(api('email_not_confirmed'), 'signin').code, 'email_not_confirmed');
  assert.equal(friendlyError({ name: 'AuthSessionMissingError' }, 'sync').code, 'signed_out');
  assert.equal(friendlyError(api('refresh_token_not_found'), 'session').code, 'signed_out');
  assert.equal(friendlyError({ code: 'sync_off' }, 'sync').code, 'sync_off');
  assert.equal(friendlyError(null), null);
});

test('the current password before a change: every “no” reads “That password doesn’t match.”; limits and the network keep their own words', () => {
  for (const e of [api('invalid_credentials'), api('user_not_found'), api('invalid_grant'), api('email_not_confirmed'), { status: 400, message: 'Invalid login credentials' }, { code: 'password_mismatch' }]) {
    const f = friendlyError(e, 'current');
    assert.equal(f.code, 'password_mismatch', JSON.stringify(e));
    assert.equal(f.message, 'That password doesn’t match.');
    assert.equal(f.field, 'current');
  }
  assert.equal(MESSAGES.password_mismatch, 'That password doesn’t match.');
  assert.doesNotMatch(MESSAGES.password_mismatch, /lock|attempt|account|email/i, 'no lockout wording, nothing about the account');
  assert.equal(friendlyError({ status: 429 }, 'current').code, 'rate_limited', 'a limit is a limit, not a mismatch');
  assert.doesNotMatch(friendlyError({ status: 429 }, 'current').message, /lock/i);
  assert.equal(friendlyError(new TypeError('Failed to fetch'), 'current').code, 'network');
  assert.equal(friendlyError({ status: 503 }, 'current').code, 'server');
  assert.equal(friendlyError({ code: 'current_needed' }, 'current').field, 'current');
  // the code step after reauthentication_needed
  assert.equal(friendlyError(api('reauthentication_needed'), 'password').code, 'code_needed');
  assert.equal(friendlyError(api('reauthentication_not_valid'), 'password').code, 'code_wrong');
  assert.equal(friendlyError(api('same_password', 422), 'password').code, 'password_same');
});

test('callback ?error= / #error= parameters', () => {
  assert.equal(callbackError({ error: 'access_denied', error_code: 'otp_expired', error_description: 'Email link is invalid or has expired' }).code, 'link_expired');
  assert.equal(callbackError({ error: 'access_denied' }).code, 'link_expired');
  assert.equal(callbackError({}), null);
});

test('client-side checks and the gentle strength hint', () => {
  assert.equal(checkEmail(' ana@example.com '), null);
  for (const e of ['', 'ana', 'ana@', 'a b@example.com', '@example.com', 'ana@example']) assert.equal(checkEmail(e)?.code, 'email_invalid', e);
  assert.equal(checkPassword('short').code, 'password_short');
  assert.equal(checkPassword('x'.repeat(PASSWORD_MIN - 1)).code, 'password_short');
  assert.equal(checkPassword('x'.repeat(PASSWORD_MIN)), null);
  assert.ok(checkPassword('x'.repeat(73)));
  assert.equal(passwordStrength('').score, 0);
  assert.ok(passwordStrength('password123').score <= 1);
  assert.ok(passwordStrength('gentle moon over the sea 7').score >= 3);
  for (const p of ['', 'abc', 'abcdefgh', 'Abcdefgh1234!', 'a much longer phrase here']) assert.ok(passwordStrength(p).hint.length > 0);
});

test('callback links: token_hash (any device), code (same device), errors, junk', () => {
  const base = 'https://app.hushmallow.com/auth/callback/';
  assert.deepEqual(parseCallback(`${base}?token_hash=pkce_0123456789abcdef&type=signup`), { kind: 'token', tokenHash: 'pkce_0123456789abcdef', type: 'signup', next: 'account' });
  assert.equal(parseCallback(`${base}?token_hash=abcdef0123456789&type=recovery&next=home`).next, 'home');
  assert.equal(parseCallback(`${base}?code=7b0c2a8e-1111-4a5b-9c9d-0123456789ab`).kind, 'code');
  assert.equal(parseCallback(`${base}#error=access_denied&error_code=otp_expired&error_description=expired`).kind, 'error');
  assert.equal(parseCallback(`${base}?error=server_error&error_description=x`).kind, 'error');
  assert.equal(parseCallback(`${base}?token_hash=abc<script>&type=signup`).kind, 'invalid');
  assert.equal(parseCallback(`${base}?token_hash=0123456789abcdef&type=sudo`).kind, 'invalid');
  assert.equal(parseCallback(`${base}#access_token=x.y.z&refresh_token=r`).kind, 'implicit', 'implicit tokens are refused, never used');
  assert.equal(parseCallback(base).kind, 'none');
  assert.equal(parseCallback('not a url').kind, 'none');
  assert.deepEqual([...OTP_TYPES].sort(), ['email', 'email_change', 'invite', 'magiclink', 'recovery', 'signup']);
});

test('no open redirect: the only way out is this site’s own app, at #account or #home', () => {
  const loc = (pathname, origin = 'https://app.hushmallow.com') => ({ origin, pathname });
  assert.equal(returnUrl(loc('/auth/callback/')), 'https://app.hushmallow.com/#account');
  assert.equal(returnUrl(loc('/auth/callback'), 'home'), 'https://app.hushmallow.com/#home');
  assert.equal(returnUrl(loc('/auth/callback/index.html'), 'https://evil.example'), 'https://app.hushmallow.com/#account');
  assert.equal(returnUrl(loc('/auth/callback/', 'https://feature-x.hushmallow.pages.dev')), 'https://feature-x.hushmallow.pages.dev/#account');
  assert.equal(parseCallback('https://app.hushmallow.com/auth/callback/?code=abcdefgh&next=https://evil.example').next, 'account');
  assert.equal(parseCallback('https://app.hushmallow.com/auth/callback/?code=abcdefgh&next=//evil.example').next, 'account');
  assert.equal(scrubbedUrl({ origin: 'https://app.hushmallow.com', pathname: '/auth/callback/' }), 'https://app.hushmallow.com/auth/callback/');
});

test('the emailRedirectTo the app sends is <site>/auth/callback on the same origin', () => {
  const L = (href) => { const u = new URL(href); return { origin: u.origin, pathname: u.pathname }; };
  assert.equal(callbackUrl(L('https://app.hushmallow.com/?v=abc#home')), 'https://app.hushmallow.com/auth/callback');
  assert.equal(callbackUrl(L('https://app.hushmallow.com/index.html')), 'https://app.hushmallow.com/auth/callback');
  assert.equal(callbackUrl(L('https://abc123.hushmallow.pages.dev/')), 'https://abc123.hushmallow.pages.dev/auth/callback');
  assert.equal(callbackUrl(L('https://app.hushmallow.com/auth/callback/')), 'https://app.hushmallow.com/auth/callback');
  assert.equal(siteRoot(L('http://localhost:8201/hushmallow/index.html')), 'http://localhost:8201/hushmallow/');
});
