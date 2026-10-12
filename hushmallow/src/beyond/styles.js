// Another Angle's own styles (injected once). Built on the Hushfold's tokens
// (src/ui/hushfold.css, src/ui/type.css): voice for words, UI for labels.
// Floors: 13px for reading text, 16px+ for anything typed; contrast ≥4.5:1
// (light text on deep glass, dark text on the warm step pieces).

const CSS = `
.beyond { --bx-k: var(--type-scale, 1); }
.bx-top { position: fixed; z-index: 3; top: calc(var(--safe-top, 0px) + 12px); left: var(--hf-edge, 16px); right: var(--hf-edge, 16px); display: flex; align-items: center; gap: 10px; pointer-events: none; transition: opacity 320ms var(--hf-ease); }
.bx-top > * { pointer-events: auto; }
.bx-top .grow { flex: 1; pointer-events: none; }
.bx-top .bx-name { display: inline-flex; align-items: center; gap: 8px; pointer-events: none; font: 700 calc(15px * var(--bx-k))/1.2 var(--hf-ff-ui); letter-spacing: 0.01em; color: #fbf8ff; text-shadow: 0 2px 12px rgba(8, 4, 28, 0.6); }
.bx-top .bx-name::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: #39f0ff; box-shadow: 0 0 12px #39f0ff; }
.beyond.hf-typing .bx-top { opacity: 0; }
.beyond.hf-typing .bx-top > * { pointer-events: none !important; }
.bx-dock { position: fixed; z-index: 3; left: 0; right: 0; bottom: calc(var(--safe-bottom, 0px) + 18px); display: flex; justify-content: center; align-items: center; flex-wrap: wrap; gap: 10px; padding: 0 16px; pointer-events: none; }
.bx-dock > * { pointer-events: auto; }
.bx-dock .hf-pill { min-height: 48px; }
.bx-dock .hf-pill.assist { border-color: rgba(127, 246, 255, 0.45); background: rgba(16, 30, 58, 0.72); }
.bx-dock .hf-pill.assist .dot { background: #7ff6ff; box-shadow: 0 0 12px #7ff6ff; }
.beyond.hf-typing .bx-dock { opacity: 0; pointer-events: none; }
.beyond.hf-typing .bx-dock > * { pointer-events: none !important; }

/* labels on the scene: DOM text over the canvas (never touchable) */
.bx-tag { position: fixed; z-index: 1; left: 0; top: 0; opacity: 0; pointer-events: none; will-change: transform, opacity; text-align: center; overflow-wrap: anywhere;
  color: #fbf8ff; transition: opacity 380ms var(--hf-ease); user-select: none; -webkit-user-select: none; }
.bx-tag.words { padding: 7px 13px; border-radius: 14px; border: 1px solid rgba(255, 255, 255, 0.16); background: rgba(16, 12, 40, 0.7);
  -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); font: var(--hf-font-thought); font-size: max(15px, calc(16px * var(--bx-k))); box-shadow: 0 8px 24px rgba(4, 2, 16, 0.3); }
.bx-tag.label { display: inline-flex; align-items: center; gap: 7px; padding: 6px 11px 6px 9px; border-radius: 999px; background: rgba(14, 10, 36, 0.74); border: 1px solid rgba(255, 255, 255, 0.12);
  font: 700 calc(13px * var(--bx-k))/1.2 var(--hf-ff-ui); letter-spacing: 0.01em; white-space: nowrap; }
.bx-tag.label::before { content: ''; flex: 0 0 auto; width: 7px; height: 7px; border-radius: 50%; background: var(--bx-dot, #ffd98a); box-shadow: 0 0 10px var(--bx-dot, #ffd98a); }
.bx-tag.line { padding: 7px 12px; border-radius: 14px; background: rgba(14, 10, 36, 0.68); border: 1px solid rgba(255, 255, 255, 0.1);
  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); font: 600 calc(15px * var(--bx-k))/1.3 var(--hf-ff-voice); }
.bx-tag.piece { padding: 0 6px; font: 750 calc(15px * var(--bx-k))/1.22 var(--hf-ff-voice); color: #3a1d04; text-shadow: 0 1px 0 rgba(255, 246, 225, 0.6); }
.bx-tag.verdict { --bx-soft: 0; padding: 8px 14px; font: 800 calc(17px * var(--bx-k))/1.25 var(--hf-ff-voice);
  border-radius: calc(4px + 16px * var(--bx-soft)); border: 1.5px solid rgba(220, 226, 255, calc(0.7 - 0.45 * var(--bx-soft)));
  background: rgba(32, 34, 72, calc(0.86 - 0.18 * var(--bx-soft))); letter-spacing: calc(0.02em - 0.02em * var(--bx-soft)); box-shadow: 0 8px 22px rgba(4, 2, 16, 0.35); }

/* consent: a calm card above Zuzu (who stays squeezable underneath) */
.bx-consent { position: fixed; z-index: 4; left: 16px; right: 16px; top: calc(var(--safe-top, 0px) + 66px); margin: 0 auto; max-width: 520px; box-sizing: border-box;
  max-height: var(--bx-card-max, calc(100dvh - 300px)); display: flex; flex-direction: column; gap: 10px; padding: 18px 18px 14px; border-radius: 26px;
  background: radial-gradient(120% 70% at 50% 0%, rgba(57, 240, 255, 0.13), rgba(57, 240, 255, 0) 60%), rgba(13, 9, 34, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.14); box-shadow: 0 24px 60px rgba(4, 2, 16, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  -webkit-backdrop-filter: blur(18px) saturate(1.15); backdrop-filter: blur(18px) saturate(1.15); color: #f7f3ff;
  opacity: 0; transform: translateY(14px); transition: opacity 520ms var(--hf-ease), transform 680ms var(--hf-ease); }
.bx-consent.in { opacity: 1; transform: none; }
.bx-consent.out { opacity: 0; transform: translateY(-8px); transition-duration: 300ms; pointer-events: none !important; }
.bx-consent.reduced, .bx-consent.reduced.in { transform: none; transition: opacity 200ms ease; }
.bx-eyebrow { margin: 0; font: 700 calc(13px * var(--bx-k))/1.2 var(--hf-ff-ui); letter-spacing: 0.04em; color: #9ff7ff; }
.bx-title { margin: 0; font: var(--type-world, 540 calc(clamp(24px, 9.091vw - 9.091px, 30px) * var(--bx-k))/1.12 var(--hf-ff-story)); font-optical-sizing: auto; letter-spacing: -0.01em; text-wrap: balance; }
.bx-scroll { overflow-y: auto; overscroll-behavior: contain; min-height: 0; margin: 0 -6px; padding: 0 6px; -webkit-overflow-scrolling: touch; }
.bx-notice { display: grid; gap: 10px; }
.bx-notice p, .bx-notice li { font: 500 calc(15px * var(--bx-k))/1.45 var(--hf-ff-voice); color: #e9e4fb; }
.bx-notice .bx-lead { margin: 0; font-weight: 600; color: #fbf8ff; font-size: calc(16px * var(--bx-k)); }
.bx-points { margin: 0; padding: 0; list-style: none; display: grid; gap: 8px; }
.bx-points li { padding: 9px 12px; border-radius: 14px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.07); }
.bx-points b { color: #fff; font-weight: 800; }
.bx-todo { display: inline; padding: 1px 6px; border-radius: 6px; border: 1.5px dashed #ffc35c; background: rgba(255, 195, 92, 0.12); color: #ffe2a6; font-weight: 700; }
.bx-link { display: inline-flex; align-items: center; min-height: 44px; margin: -10px 0 -12px; padding: 0 4px; border: 0; background: none; color: #ffd6ea; font: 700 calc(15px * var(--bx-k))/1.2 var(--hf-ff-ui); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
.bx-small { margin: 0; font: 550 calc(13px * var(--bx-k))/1.4 var(--hf-ff-ui); color: #cdc6ea; }
.bx-actions { display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; }
.bx-actions .hf-ghost { min-height: 48px; padding: 0 20px; }
.bx-actions .hf-send { min-height: 48px; padding: 0 26px; }
.bx-after { text-align: right; }
.bx-setting-note { display: block; margin-top: 2px; font: var(--type-caption, 550 13px/1.4 var(--hf-ff-ui)); color: var(--text-3, #b9b1dc); }
.bx-sheet-copy { margin: 0; font: var(--type-body, 500 17px/1.5 var(--hf-ff-voice)); color: var(--text-2, #cdc6ea); }

@media (max-width: 360px) {
  .bx-consent { left: 10px; right: 10px; padding: 14px 14px 12px; border-radius: 22px; gap: 8px; }
  .bx-notice p, .bx-notice li { font-size: calc(14px * var(--bx-k)); }
  .bx-notice .bx-lead { font-size: calc(15px * var(--bx-k)); }
  .bx-points li { padding: 8px 10px; }
  .bx-tag.words { font-size: max(15px, calc(15px * var(--bx-k))); padding: 6px 11px; }
  .bx-tag.line, .bx-tag.piece { font-size: calc(14px * var(--bx-k)); }
}
@media (prefers-reduced-motion: reduce) {
  .bx-consent, .bx-consent.in { transform: none; transition: opacity 200ms ease; }
  .bx-tag { transition: opacity 160ms ease; }
}
.beyond.reduced .bx-tag { transition: opacity 160ms ease; }
`;

let done = false;
export function ensureBeyondCss() {
  if (done || typeof document === 'undefined') return;
  done = true;
  const el = document.createElement('style');
  el.id = 'beyond-css';
  el.textContent = CSS;
  document.head.append(el);
}
