// Adaptive quality: watches real frame times and steps the soft body down a
// tier when the device can't keep up (never back up mid-session, to avoid
// visible popping). 'auto' starts at medium on small touch screens.

export function initialTier(pref) {
  if (pref && pref !== 'auto') return pref;
  try {
    const touch = matchMedia('(pointer: coarse)').matches;
    const cores = navigator.hardwareConcurrency || 4;
    const mem = navigator.deviceMemory || 4;
    if (cores <= 4 || mem <= 2) return 'low';
    return touch ? 'medium' : 'high';
  } catch { return 'medium'; }
}

export class FrameMonitor {
  constructor(onDowngrade, { window = 90, slowMs = 24 } = {}) {
    this.onDowngrade = onDowngrade;
    this.n = window; this.slow = slowMs;
    this.samples = [];
    this.last = 0;
    this.enabled = true;
  }

  frame(t) {
    if (!this.enabled) return;
    if (this.last) {
      const dt = t - this.last;
      if (dt < 250) this.samples.push(dt);   // ignore tab switches
    }
    this.last = t;
    if (this.samples.length >= this.n) {
      const sorted = [...this.samples].sort((a, b) => a - b);
      const p75 = sorted[Math.floor(sorted.length * 0.75)];
      this.samples.length = 0;
      this.fps = 1000 / p75;
      if (p75 > this.slow) this.onDowngrade(p75);
    }
  }
}

export const NEXT_TIER = { high: 'medium', medium: 'low', low: null };
