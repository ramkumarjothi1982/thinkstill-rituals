// Friendly, secure messages for everything sign-in can say no to.
//
// Rules: never show the server's own text; never tell anyone whether an
// email has an account (sign-in failures read the same for a wrong password
// and an unknown email; reset and resend always "send"); a calm sentence and
// one thing to do next. British spelling, no blame. Pure, no DOM.
//
//   friendlyError(err, context) → { code, message, field, retry, kind }
//     context: 'signin' | 'signup' | 'resend' | 'reset' | 'verify' | 'callback'
//              | 'current' (checking the current password before a change)
//              | 'password' | 'reauth' | 'delete' | 'profile' | 'sync' | 'session'
//     code:    a stable id for tests and analytics-free logic
//     field:   'email' | 'password' | 'current' | 'code' | 'name' | null (where to show it)
//     kind:    'input' | 'link' | 'limit' | 'network' | 'server' | 'session' | 'unknown'

export const MESSAGES = Object.freeze({
  invalid_login: 'That email and password don’t match. Check them, or reset your password.',
  // the current password, asked before a change: no lockout talk, nothing about the account
  password_mismatch: 'That password doesn’t match.',
  email_not_confirmed: 'Please confirm your email first. We can send the link again.',
  email_invalid: 'That email doesn’t look quite right.',
  password_short: 'Choose a password with at least 8 characters.',
  password_weak: 'That password is easy to guess. Try a longer one, or add a few words.',
  password_same: 'That’s your current password. Choose a new one.',
  name_long: 'Keep your name under 40 characters.',
  link_expired: 'This link has expired or was already used. You can ask for a new one.',
  link_other_device: 'This link works on the device where you asked for it. If you were confirming your email, it’s confirmed: sign in to carry on.',
  link_invalid: 'This link isn’t complete. Open it straight from the email, or ask for a new one.',
  code_wrong: 'That code didn’t work. Check it, or ask for a new one.',
  code_needed: 'For your safety, enter the code we’ve just emailed you.',
  current_needed: 'Enter your current password first.',
  rate_limited: 'Let’s take a short breather. Try again in a minute.',
  signup_closed: 'New accounts are paused for now. You can keep using hushmallow as a guest.',
  signed_out: 'You’ve been signed out. Sign in again whenever you like.',
  network: 'We can’t reach hushmallow right now. Check your connection and try again.',
  server: 'Something went wrong on our side. Please try again in a moment.',
  not_signed_in: 'Sign in first, then try again.',
  sync_off: 'Turn this on in your account first.',
  unknown: 'Something didn’t work. Please try again.',
});

const NETWORK_NAMES = new Set(['AuthRetryableFetchError', 'TypeError', 'AbortError', 'FetchError']);

/** The code a supabase-js / GoTrue / PostgREST error carries, normalised. */
export function errorCode(err) {
  if (!err) return null;
  if (typeof err === 'string') return err;
  const c = err.code ?? err.error_code ?? err.errorCode;
  if (typeof c === 'string' && c) return c;
  if (err.name === 'AuthSessionMissingError') return 'session_missing';
  if (err.name === 'AuthPKCECodeVerifierMissingError') return 'pkce_code_verifier_not_found';
  if (err.name === 'AuthWeakPasswordError') return 'weak_password';
  if (err.name === 'AuthInvalidTokenResponseError') return 'invalid_token_response';
  return null;
}

function isNetwork(err) {
  if (!err || typeof err !== 'object') return false;
  if (NETWORK_NAMES.has(err.name) && (!err.status || err.status === 0)) return true;
  return err.status === 0 || /Failed to fetch|NetworkError|Load failed|network/i.test(String(err.message || ''));
}

const R = (code, kind, field = null, retry = true) => ({ code, kind, field, retry, message: MESSAGES[code] || MESSAGES.unknown });

export function friendlyError(err, context = 'unknown') {
  if (!err) return null;
  const code = errorCode(err);
  const status = Number(err.status) || 0;

  // server busy / unreachable first: these say nothing about the account
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || code === 'over_sms_send_rate_limit' || status === 429) return R('rate_limited', 'limit');
  if (status >= 500 && status !== 0) return R('server', 'server');
  if (isNetwork(err) && !code) return R('network', 'network');

  // the current password before a change: every "no" from the sign-in reads the same
  if (context === 'current') {
    if (['invalid_credentials', 'user_not_found', 'invalid_grant', 'email_not_confirmed', 'password_mismatch', 'validation_failed'].includes(code) || status === 400 || status === 401 || status === 403) return R('password_mismatch', 'input', 'current');
    if (code === 'current_needed') return R('current_needed', 'input', 'current');
  }

  switch (code) {
    case 'invalid_credentials':
    case 'user_not_found':
    case 'invalid_grant':
      if (context === 'signin') return R('invalid_login', 'input', 'password');
      break;
    case 'password_mismatch':
      return R('password_mismatch', 'input', 'current');
    case 'current_needed':
      return R('current_needed', 'input', 'current');
    case 'email_not_confirmed':
      return R('email_not_confirmed', 'input', 'email');
    case 'email_address_invalid':
    case 'email_address_not_authorized':   // the built-in mailer only reaches team members
    case 'validation_failed':
      if (context === 'password') return R('password_weak', 'input', 'password');
      return R('email_invalid', 'input', 'email');
    case 'weak_password': {
      const reasons = Array.isArray(err.reasons) ? err.reasons : [];
      return R(reasons.includes('length') ? 'password_short' : 'password_weak', 'input', 'password');
    }
    case 'same_password':
      return R('password_same', 'input', 'password');
    case 'otp_expired':
    case 'flow_state_expired':
    case 'flow_state_not_found':
    case 'bad_code_verifier':
    case 'invalid_token_response':
      return context === 'reauth' || context === 'password' ? R('code_wrong', 'input', 'code') : R('link_expired', 'link', null);
    case 'pkce_code_verifier_not_found':
      return R('link_other_device', 'link', null, false);
    case 'invalid_link':
      return R('link_invalid', 'link', null, false);
    case 'reauthentication_needed':
    case 'reauth_nonce_missing':
      return R('code_needed', 'input', 'code');
    case 'reauthentication_not_valid':
      return R('code_wrong', 'input', 'code');
    case 'signup_disabled':
    case 'email_provider_disabled':
    case 'provider_disabled':
      return R('signup_closed', 'server', null, false);
    case 'session_missing':
    case 'session_not_found':
    case 'session_expired':
    case 'refresh_token_not_found':
    case 'refresh_token_already_used':
    case 'bad_jwt':
    case 'no_authorization':
      return context === 'signin' ? R('invalid_login', 'input', 'password') : R('signed_out', 'session', null, false);
    case 'user_already_exists':
    case 'email_exists':
      // never confirm that an email has an account: the caller shows "check your email"
      return { ...R('unknown', 'input'), code: 'neutral_sent', message: '' };
    case 'not_signed_in':
      return R('not_signed_in', 'session', null, false);
    case 'sync_off':
      return R('sync_off', 'input', null, false);
    case 'name_long':
      return R('name_long', 'input', 'name');
    case 'captcha_failed':
      return R('unknown', 'unknown');
    default: break;
  }
  if (status === 401 || status === 403) return context === 'signin' ? R('invalid_login', 'input', 'password') : R('signed_out', 'session', null, false);
  if (isNetwork(err)) return R('network', 'network');
  if (context === 'signin' && status === 400) return R('invalid_login', 'input', 'password');
  return R('unknown', 'unknown');
}

/** The ?error= / #error= parameters Supabase adds to a redirect → a friendly result. */
export function callbackError({ error, error_code: code, error_description: description } = {}) {
  if (!error && !code) return null;
  const c = code || (/expired/i.test(String(description || '')) ? 'otp_expired' : error === 'access_denied' ? 'otp_expired' : 'unknown');
  return friendlyError({ code: c, status: 400 }, 'callback');
}

/** Gentle client-side checks before anything is sent. null when fine. */
export function checkEmail(email) {
  const e = String(email ?? '').trim();
  if (!e || e.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return R('email_invalid', 'input', 'email');
  return null;
}

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;   // bcrypt's limit: Supabase ignores anything longer

export function checkPassword(pw) {
  const p = String(pw ?? '');
  if (p.length < PASSWORD_MIN) return R('password_short', 'input', 'password');
  if (p.length > PASSWORD_MAX) return { ...R('password_weak', 'input', 'password'), message: `Keep your password under ${PASSWORD_MAX} characters.` };
  return null;
}

/**
 * A gentle strength hint (never a gate beyond the minimum): 0 … 4 and a short line.
 * Length counts most; variety a little; a very common shape is marked down.
 */
export function passwordStrength(pw) {
  const p = String(pw ?? '');
  if (!p) return { score: 0, hint: `At least ${PASSWORD_MIN} characters.` };
  let s = 0;
  if (p.length >= PASSWORD_MIN) s++;
  if (p.length >= 12) s++;
  if (p.length >= 16) s++;
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(p)).length;
  if (kinds >= 3) s++;
  if (/^(.)\1+$/.test(p) || /^(password|qwerty|letmein|123456|hushmallow)/i.test(p)) s = Math.min(s, 1);
  s = Math.min(4, s);
  const hint = p.length < PASSWORD_MIN ? `A little longer: at least ${PASSWORD_MIN} characters.`
    : s <= 1 ? 'Good start. A few more characters makes it much stronger.'
      : s === 2 ? 'Nice. A short phrase you’ll remember is even stronger.'
        : 'Lovely and strong.';
  return { score: s, hint };
}
