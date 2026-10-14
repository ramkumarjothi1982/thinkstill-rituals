// Screen wake: an honest, opt-in "keep the screen on" (DOM; navigator and
// document injectable, so it runs in Node tests with fakes).
//
// Off unless the person asks. A lock is requested only while the page is
// visible, is let go whenever the page is hidden (the browser lets go too) and
// asked for again on return while it is still wanted, and ends for good after
// maxMs (an hour by default) or at the first refusal. A refusal is swallowed,
// reported once through onFail and never retried in a loop. Where the Screen
// Wake Lock API is missing, `supported` is false and nothing throws.
// Generic name, owned by Mallow Nightlight in Phase 3.
//
//   const wake = new ScreenWake({ onFail: () => turnTheToggleOff() });
//   wake.want(true);          // only if the person opted in
//   wake.refresh();           // after pageshow / resume (re-requests if still wanted)
//   wake.want(false);         // the end, an exit
//   wake.destroy();           // unmount

export const WAKE_MAX_MS = 3600e3;

export class ScreenWake {
  /**
   * @param {{nav?:Navigator, doc?:Document, maxMs?:number, onFail?:Function,
   *          setTimeout?:Function, clearTimeout?:Function}} [o]
   */
  constructor({ nav = globalThis.navigator, doc = globalThis.document, maxMs = WAKE_MAX_MS, onFail = null,
    setTimeout: st = globalThis.setTimeout, clearTimeout: ct = globalThis.clearTimeout } = {}) {
    this.nav = nav;
    this.doc = doc;
    this.maxMs = Math.max(1, +maxMs || WAKE_MAX_MS);
    this.onFail = typeof onFail === 'function' ? onFail : null;
    // plain calls: the browser's setTimeout refuses another `this`
    this._st = (fn, ms) => st(fn, ms);
    this._ct = (t) => ct(t);
    this._wanted = false;
    this._sentinel = null;
    this._pending = false;
    this._timer = null;
    this._dead = false;
    this.requests = 0;    // lock requests made (tests)
    this.releases = 0;    // locks let go by us (tests)
    this.failed = false;  // the last request was refused
    this._onRelease = () => { this._sentinel = null; };   // the browser let go (hidden, low battery…)
    this._vis = () => { if (this.doc?.hidden) this.release(); else this._request(); };
    this.doc?.addEventListener?.('visibilitychange', this._vis);
  }

  /** The Screen Wake Lock API exists here. */
  get supported() { return typeof this.nav?.wakeLock?.request === 'function'; }
  /** The person wants the screen kept on (and it has not expired or been refused). */
  get wanted() { return this._wanted; }
  /** A lock is held right now. */
  get held() { return !!this._sentinel; }

  /** Ask for (true) or give up (false) the lock. Requests only while visible; true starts the maxMs limit. */
  want(on) {
    const w = !!on && this.supported && !this._dead;
    if (w === this._wanted) { if (w) this._request(); return this; }
    this._wanted = w;
    if (w) {
      this.failed = false;
      this._clearTimer();
      this._timer = this._st(() => { this._timer = null; this._wanted = false; this.release(); }, this.maxMs);
      this._request();
    } else {
      this._clearTimer();
      this.release();
    }
    return this;
  }

  /** Re-request if still wanted and visible (pageshow, resume). */
  refresh() { this._request(); return this; }

  /** Let go of a held lock; `wanted` stays as it is (a return to visible asks again). */
  release() {
    const s = this._sentinel;
    this._sentinel = null;
    if (!s) return;
    this.releases++;
    s.removeEventListener?.('release', this._onRelease);
    try { Promise.resolve(s.release?.()).catch(() => {}); } catch { /* already released */ }
  }

  destroy() {
    this.want(false);
    this._dead = true;
    this.doc?.removeEventListener?.('visibilitychange', this._vis);
  }

  _request() {
    if (!this._wanted || this._dead || this._sentinel || this._pending || this.doc?.hidden) return;
    this._pending = true;
    this.requests++;
    let p;
    try { p = this.nav.wakeLock.request('screen'); } catch { this._pending = false; this._fail(); return; }
    Promise.resolve(p).then((s) => {
      this._pending = false;
      if (!s) { this._fail(); return; }
      // no longer wanted, or hidden by the time it came (a return to visible asks again)
      if (!this._wanted || this._dead || this.doc?.hidden) {
        try { Promise.resolve(s.release?.()).catch(() => {}); } catch { /* ignore */ }
        return;
      }
      this._sentinel = s;
      s.addEventListener?.('release', this._onRelease);
    }, () => { this._pending = false; this._fail(); });
  }

  // refused (or unavailable right now): stop wanting it, say so once, never retry in a loop
  _fail() {
    this.failed = true;
    if (!this._wanted) return;
    this._wanted = false;
    this._clearTimer();
    this.onFail?.();
  }

  _clearTimer() { if (this._timer != null) { this._ct(this._timer); this._timer = null; } }
}
