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
.beyond.bx-corner .bx-dock { justify-content: flex-end; padding-left: var(--bx-corner, 128px); padding-right: 20px; }
.beyond.hf-typing .bx-dock { opacity: 0; pointer-events: none; }
/* the Memory Garden's install owns the stage: no subtitle pill left floating without a line */
.beyond.bx-installing .hf-subs .hf-subctl { opacity: 0 !important; pointer-events: none !important; }
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
.bx-tag.card { display: grid; justify-items: center; gap: 4px; padding: 8px 12px 9px; border-radius: 16px; background: rgba(14, 10, 36, 0.76); border: 1px solid rgba(255, 255, 255, 0.12);
  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); box-shadow: 0 8px 22px rgba(4, 2, 16, 0.28); }
/* (a title wider than its card wraps inside the card's padding, balanced, never running to its border: "What your mind added") */
.bx-tag.card .bx-card-title { display: block; max-width: 100%; font: 700 calc(13px * var(--bx-k))/1.2 var(--hf-ff-ui); letter-spacing: 0.01em; color: #efeaff; white-space: normal; text-wrap: balance; text-align: inherit; }
.bx-tag.card .bx-card-title::before { content: ''; display: inline-block; vertical-align: 0.08em; margin-right: 7px; width: 7px; height: 7px; border-radius: 50%; background: var(--bx-dot, #ffd98a); box-shadow: 0 0 10px var(--bx-dot, #ffd98a); }
.bx-tag.card .bx-card-text { font: 600 calc(15px * var(--bx-k))/1.3 var(--hf-ff-voice); color: #fbf8ff; }
.bx-tag.card.ask .bx-card-text { font-style: italic; font-weight: 550; color: #e4dcfb; }
.bx-tag.piece { padding: 0 6px; font: 750 calc(15px * var(--bx-k))/1.22 var(--hf-ff-voice); color: #3a1d04; text-shadow: 0 1px 0 rgba(255, 246, 225, 0.6); }
/* the blame, carried on its own amber weight (return_responsibility): two balanced lines at most */
.bx-tag.piece.slab { padding: 0 4px; line-height: 1.2; color: #3a1a02; }
.bx-tag.piece.slab.inbowl { font-size: calc(13px * var(--bx-k)); line-height: 1.18; padding: 0 2px; }
/* open_interpretations: the first guess, clutched by the thought, reads away from it (once it is one possibility among
   the others it is centred like them, its name kept) */
.bx-tag.card.guess { justify-items: start; text-align: left; }
/* a short phone's column of four possibilities, when they would not fit at their usual size */
.bx-tag.line.tight, .bx-tag.card.tight .bx-card-text { font-size: calc(13px * var(--bx-k)); line-height: 1.22; }
.bx-tag.line.tight { padding: 4px 9px; }
.bx-tag.card.tight { padding: 5px 9px 6px; gap: 2px; }
/* no line ever leaves one word on its own */
.bx-tag.line, .bx-tag.words, .bx-tag.piece, .bx-tag.card .bx-card-text, .bx-tag.verdict { text-wrap: balance; }
.bx-tag.verdict { --bx-soft: 0; padding: 8px 14px; font: 800 calc(17px * var(--bx-k))/1.25 var(--hf-ff-voice);
  border-radius: calc(4px + 16px * var(--bx-soft)); border: 1.5px solid rgba(220, 226, 255, calc(0.7 - 0.45 * var(--bx-soft)));
  background: rgba(32, 34, 72, calc(0.86 - 0.18 * var(--bx-soft))); letter-spacing: calc(0.02em - 0.02em * var(--bx-soft)); box-shadow: 0 8px 22px rgba(4, 2, 16, 0.35); }

/* a played scene steps back while its perspective is told */
.beyond.bx-recede .bx-tag { opacity: 0 !important; }
/* while a mechanic is on stage the subtitle band jumps to its new place instead of gliding there: a glide (as the
   dock's pill goes) would sweep its control pill over the scene's labels (review r4) */
.beyond.bx-onstage .hf-subs { transition: none; }

/* consent: a calm card above Zuzu (who stays squeezable underneath) */
.bx-consent { position: fixed; z-index: 4; left: 16px; right: 16px; top: calc(var(--safe-top, 0px) + 66px); margin: 0 auto; max-width: 520px; box-sizing: border-box;
  max-height: var(--bx-card-max, calc(100dvh - 300px)); display: flex; flex-direction: column; gap: 8px; padding: 18px 18px 14px; border-radius: 26px;
  background: radial-gradient(120% 70% at 50% 0%, rgba(57, 240, 255, 0.13), rgba(57, 240, 255, 0) 60%), rgba(13, 9, 34, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.14); box-shadow: 0 24px 60px rgba(4, 2, 16, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  -webkit-backdrop-filter: blur(18px) saturate(1.15); backdrop-filter: blur(18px) saturate(1.15); color: #f7f3ff;
  opacity: 0; transform: translateY(14px); transition: opacity 520ms var(--hf-ease), transform 680ms var(--hf-ease); }
.bx-consent.in { opacity: 1; transform: none; }
.bx-consent.out { opacity: 0; transform: translateY(-8px); transition-duration: 300ms; pointer-events: none !important; }
.bx-consent.reduced, .bx-consent.reduced.in { transform: none; transition: opacity 200ms ease; }
.bx-eyebrow { margin: 0; font: 700 calc(13px * var(--bx-k))/1.2 var(--hf-ff-ui); letter-spacing: 0.04em; color: #9ff7ff; }
.bx-title { margin: 0; font: var(--type-world, 540 calc(clamp(24px, 9.091vw - 9.091px, 30px) * var(--bx-k))/1.12 var(--hf-ff-story)); font-optical-sizing: auto; letter-spacing: -0.01em; text-wrap: balance; }
.bx-scrollwrap { position: relative; display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; }
.bx-scroll { flex: 1 1 auto; overflow-y: auto; overscroll-behavior: contain; min-height: 0; margin: 0 -6px; padding: 0 6px 10px; -webkit-overflow-scrolling: touch; }
.bx-scroll:focus { outline: none; }
.bx-scroll:focus-visible { outline: 2px solid rgba(159, 247, 255, 0.6); outline-offset: 2px; border-radius: 10px; }
/* there is more of the notice below: said plainly, in its own row under the notice (never over a line of it), and a tap
   reads on; at the end of the notice the row keeps its place (nothing jumps) and the pill goes */
.bx-more { position: relative; flex: none; align-self: center; margin-top: 4px; display: inline-flex; align-items: center; gap: 6px; min-height: 34px; padding: 0 14px;
  border-radius: 999px; border: 1px solid rgba(159, 247, 255, 0.5); background: rgba(24, 18, 62, 0.94); color: #e9fcff; cursor: pointer;
  font: 700 calc(13px * var(--bx-k))/1 var(--hf-ff-ui); letter-spacing: 0.01em; box-shadow: 0 6px 18px rgba(4, 2, 16, 0.45); }
.bx-more[hidden] { display: none; }
.bx-more.bx-end { visibility: hidden; }
.bx-more .bx-more-arrow { font-size: 15px; line-height: 1; }
.bx-more:focus-visible { outline: 3px solid #9ff7ff; outline-offset: 2px; }
.bx-care { color: #e9e4fb; }
.bx-care b { color: #fff; font-weight: 800; }
.bx-notice { display: grid; gap: 10px; }
.bx-notice p, .bx-notice li { font: 500 calc(15px * var(--bx-k))/1.45 var(--hf-ff-voice); color: #e9e4fb; }
.bx-notice .bx-lead { margin: 0; font-weight: 600; color: #fbf8ff; font-size: calc(16px * var(--bx-k)); }
.bx-points { margin: 0; padding: 0; list-style: none; display: grid; gap: 8px; }
.bx-points li { padding: 6px 11px; border-radius: 13px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.07); line-height: 1.4; }
.bx-points { gap: 6px; }
@media (max-width: 429px) {
  .bx-points li { font-size: calc(14.5px * var(--bx-k)); padding: 6px 10px; }
  .bx-notice .bx-lead { font-size: calc(15.5px * var(--bx-k)); }
}
.bx-points b { color: #fff; font-weight: 800; }
.bx-todo { display: inline; padding: 1px 6px; border-radius: 6px; border: 1.5px dashed #ffc35c; background: rgba(255, 195, 92, 0.12); color: #ffe2a6; font-weight: 700; }
.bx-link { display: inline-flex; align-items: flex-end; min-height: 44px; margin: -23px 0 0; padding: 0 4px 0 0; border: 0; background: none; color: #ffd6ea; font: 700 calc(15px * var(--bx-k))/1.2 var(--hf-ff-ui); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
.bx-small { margin: 0; font: 550 calc(13px * var(--bx-k))/1.4 var(--hf-ff-ui); color: #cdc6ea; }
.bx-actions { display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; }
.bx-actions { gap: 12px; }
.bx-actions .bx-choice { flex: 1 1 0; min-width: 120px; max-width: 220px; min-height: 48px; padding: 0 20px; border-radius: 999px; cursor: pointer;
  border: 1.5px solid rgba(255, 255, 255, 0.34); background: rgba(255, 255, 255, 0.08); color: #fbf8ff; font: 700 calc(16px * var(--bx-k))/1.2 var(--hf-ff-ui); letter-spacing: 0.01em;
  transition: background 200ms ease, border-color 200ms ease, transform 160ms ease; }
.bx-actions .bx-choice:hover { background: rgba(255, 255, 255, 0.14); border-color: rgba(255, 255, 255, 0.5); }
.bx-actions .bx-choice:active { transform: scale(0.97); }
.bx-actions .bx-choice:focus-visible { outline: 3px solid #9ff7ff; outline-offset: 2px; }
/* the title takes focus only so a screen reader starts there (it is not a control): no ring */
.bx-title:focus, .bx-title[tabindex="-1"]:focus-visible { outline: none; }
/* (balanced: never one word on a line of its own) */
.bx-after { text-align: right; text-wrap: balance; }
.bx-setting-note { display: block; margin-top: 2px; font: var(--type-caption, 550 13px/1.4 var(--hf-ff-ui)); color: var(--text-3, #b9b1dc); }
.bx-sheet-copy { margin: 0; font: var(--type-body, 500 17px/1.5 var(--hf-ff-voice)); color: var(--text-2, #cdc6ea); }
/* Settings → Tester code: the field (16px: iOS never zooms) and Save on one row, wrapping on a narrow phone */
.bx-invite-row { display: flex; gap: 8px; margin-top: 8px; align-items: center; flex-wrap: wrap; }
.bx-invite-row input.bx-invite { flex: 1 1 140px; min-width: 0; width: auto; font-size: max(16px, 1em); }
.bx-invite-row .btn { flex: none; min-height: 48px; }

.bx-consent .bx-title { font-size: calc(clamp(22px, 6.4vw, 28px) * var(--bx-k)); line-height: 1.12; }
/* a short screen: the notice is a sheet, from under the top bar to the bottom edge (Zuzu waits out of sight below it,
   another-angle.js layout), with its title on one line where it fits, so the notice reads in a few steps */
@media (max-height: 700px) {
  .bx-consent { top: calc(var(--safe-top, 0px) + 60px); bottom: calc(var(--safe-bottom, 0px) + 10px); max-height: none; gap: 6px; padding: 14px 16px 10px; }
  .bx-consent .bx-title { font-size: calc(18px * var(--bx-k)); line-height: 1.15; }
  .bx-consent .bx-small { line-height: 1.32; }
  .bx-consent .bx-points li { padding: 6px 9px; line-height: 1.38; }
  .bx-consent .bx-notice { gap: 8px; }
}
@media (max-width: 360px) {
  .bx-consent { left: 10px; right: 10px; padding: 14px 14px 12px; border-radius: 22px; gap: 8px; }
  .bx-notice p, .bx-notice li { font-size: calc(14px * var(--bx-k)); }
  .bx-notice .bx-lead { font-size: calc(15px * var(--bx-k)); }
  .bx-points li { padding: 8px 10px; }
  .bx-tag.words { font-size: max(15px, calc(15px * var(--bx-k))); padding: 6px 11px; }
  .bx-tag.line, .bx-tag.piece, .bx-tag.card .bx-card-text { font-size: calc(14px * var(--bx-k)); }
  .bx-tag.card { padding: 7px 10px 8px; }
  .bx-tag.line { padding: 5px 10px; line-height: 1.25; }
  .bx-tag.words { white-space: normal; }
  .bx-tag.card .bx-card-title::before { margin-right: 6px; }
}
/* a short, narrow phone (320x568): the sheet's own spacing wins over the narrow card's (12px sides: the title and the
   caption each fit on one line at text size 1) */
@media (max-height: 700px) and (max-width: 360px) {
  .bx-consent { gap: 6px; padding: 12px 12px 10px; }
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
