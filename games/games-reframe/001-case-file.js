/* 001 Case File — Reframe · REFRAME · Beliefs / Evidence (flagship)
 * Mechanism: source monitoring (Johnson, Hashtroudi & Lindsay 1993) and examining the evidence from cognitive therapy
 * (Beck; Padesky): the player sweeps a UV lamp over their own statement to separate what a camera could have recorded
 * from what the brain added, bags the additions, sees how few words the footage actually holds, names the blank spots,
 * then weighs rival explanations that all fit the facts (the feared one stays in the lineup) with ten hunch chips.
 * Honest: when the facts support the worry, the verdict says so and pins a plan, not a pep talk.
 * Verb: scan (sweep the UV lamp, tap to bag). Finale: dawn over the office: the rain stops, Glitch tips his hat, the
 * blinds lift and light beams sweep across the stamped case file.
 */
(function (env) {
  'use strict';
  (env.games = env.games || []).push({
    id: 'case-file', mode: 'reframe', name: 'Case File', verb: 'scan', family: 'REFRAME', flagship: true, minutes: 3,
    parents: ['Beliefs / Evidence', 'Social / Team / Perspective', 'Uncertainty / Future Worry / Reassurance'],
    cast: ['glitch', 'patch', 'drop', 'rush', 'still', 'sync'], poster: { char: 'glitch', mood: 'smug' },
    fonts: ['Anton', 'Special+Elite', 'Limelight'],
    tagline: 'Inspector Glitch closed your case in 0.3 seconds. Reopen it.',
    why: 'For a scary conclusion: separate what a camera saw from what your brain added.',
    css: `
.g-case-file { --cf-l: 12px; --cf-w: 366px; --cf-t: 170px; --cf-b: 16px; --cf-bot: 118px; --lr: 62;
  --cf-stampf: "Anton", Impact, "Haettenschweiler", "Arial Narrow Bold", "Arial Narrow", sans-serif;
  --cf-type: "Special Elite", "Courier New", Courier, monospace;
  --cf-title: "Limelight", Didot, "Bodoni 72", Georgia, serif;
  --cf-wall1: #1b2338; --cf-wall2: #0a0d17; --cf-frame: #0a0807; --cf-desk1: #452c1a; --cf-desk2: #1c1108;
  --cf-paper: #f1e8d4; --cf-paper2: #ddd0b3; --cf-ink: #1f1b16; --cf-ink2: #594f43; --cf-stamp: #cf3a30; --cf-amber: #ffb24f;
  --cf-cam: #3fd0c9; --cf-brain: #ff5fa2; --cf-cami: #0a7a75; --cf-braini: #b42c6b;
  --cf-cork: #7b5937; --cf-cork2: #5d4127; --cf-string: #d9362d; --cf-gold: #e6b95c; --cf-manila: #dbbb7b; --cf-manila2: #b38e4f;
  --cf-lamp: rgba(255, 184, 92, 0.30); --cf-slat: #2e2925; --cf-fg: #fbf3e6; --cf-muted: #c9bba6; --cf-dk1: #130c28; --cf-dk2: #030309;
  background: var(--cf-wall2); color: var(--cf-fg); }
.g-case-file.cf-bright { --cf-wall1: #c5ccd6; --cf-wall2: #96a1ae; --cf-frame: #2b221c; --cf-desk1: #92623f; --cf-desk2: #5f3e28;
  --cf-paper: #f8f1e1; --cf-paper2: #e7dcc5; --cf-stamp: #b8322a; --cf-amber: #b8680f; --cf-cork: #b98b58; --cf-cork2: #9b7046;
  --cf-string: #b8322a; --cf-gold: #6b4a12; --cf-lamp: rgba(255, 228, 170, 0.22); --cf-slat: #ddd6ca; --cf-fg: #2a1d10; --cf-muted: #5e4f3c; --cf-dk1: #2f2a42; --cf-dk2: #0c0c13; }
.g-case-file .cf-rig { position: absolute; inset: 0; }
.g-case-file .cf-world { position: absolute; inset: 0; overflow: hidden; transition: visibility 0s; }
/* an opaque set, or the lights-out blackout once it has faded in, covers the office: skip drawing it */
.g-case-file.cf-still .cf-world { visibility: hidden; }
.g-case-file.cf-out .cf-world { visibility: hidden; transition: visibility 0s linear 0.85s; }
.g-case-file .cf-wall { position: absolute; inset: 0; background: radial-gradient(ellipse 60% 44% at 72% 72%, var(--cf-lamp), transparent 72%), radial-gradient(ellipse 85% 55% at 50% 20%, rgba(120, 150, 230, 0.12), transparent 70%), linear-gradient(180deg, var(--cf-wall1), var(--cf-wall2)); }
.g-case-file .cf-wall::before { content: ""; position: absolute; inset: 0; background: repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.025) 0 2px, transparent 2px 44px); }
.g-case-file .cf-wall::after { content: ""; position: absolute; inset: 0; background: repeating-linear-gradient(-16deg, transparent 0 30px, rgba(150, 175, 255, 0.05) 30px 42px); transition: opacity 1.5s ease; }
.g-case-file.cf-bright .cf-wall::after { background: repeating-linear-gradient(-16deg, transparent 0 30px, rgba(255, 255, 255, 0.13) 30px 42px); }
.g-case-file.cf-dawn .cf-wall::after { opacity: 0; }
.g-case-file .cf-window { position: absolute; left: var(--wx, 12px); top: var(--wy, 60px); width: var(--ww, 366px); height: var(--wh, 280px); border: 9px solid var(--cf-frame); border-radius: 4px; overflow: hidden; background: #0c1426;
  box-shadow: 0 20px 44px rgba(0, 0, 0, 0.45), inset 0 0 0 1px rgba(255, 255, 255, 0.06); }
.g-case-file .cf-rainl { position: absolute; z-index: 1; left: 0; right: 0; top: -256px; bottom: 0; pointer-events: none; background-image: var(--rainA, none); background-size: 128px 256px; will-change: transform; opacity: var(--rain, 1); transition: opacity 2.6s ease, visibility 0s; }
.g-case-file .cf-rainl.r2 { background-image: var(--rainB, none); opacity: calc(var(--rain, 1) * 0.85); }
.g-case-file.cf-still .cf-rainl, .g-case-file.cf-out .cf-rainl { visibility: hidden; transition: opacity 2.6s ease, visibility 0s linear 0.8s; }
.g-case-file .cf-wflash { display: none; position: absolute; z-index: 1; inset: 0; background: rgba(205, 215, 255, 0.24); opacity: 0; pointer-events: none; }
.g-case-file .cf-wflash.is-on { display: block; }
.g-case-file .cf-letter { position: absolute; z-index: 2; left: 0; right: 0; top: 13%; text-align: center; color: var(--cf-gold); text-shadow: 0 0 18px rgba(227, 180, 90, 0.35); pointer-events: none; transition: opacity 1.2s ease; }
.g-case-file.cf-bright .cf-letter { text-shadow: 0 1px 0 rgba(255, 255, 255, 0.55), 0 0 18px rgba(255, 255, 255, 0.4); }
.g-case-file .cf-letter b { display: block; font: 400 clamp(30px, 8.5cqw, 48px)/1 var(--cf-title); letter-spacing: 0.06em; }
.g-case-file .cf-letter span { display: block; margin-top: 6px; font: 600 12px/1.3 var(--font-ui); letter-spacing: 0.16em; text-transform: uppercase; opacity: 0.9; white-space: nowrap; }
.g-case-file .cf-mull { position: absolute; z-index: 3; left: 0; right: 0; top: 66%; height: 7px; background: var(--cf-frame); }
.g-case-file .cf-sill { position: absolute; z-index: 2; right: 16%; bottom: 0; width: 58px; height: 54px; }
.g-case-file .cf-sill svg { width: 100%; height: 100%; display: block; overflow: visible; }
.g-case-file .cf-tail { transform-origin: 44px 50px; }
@keyframes cf-tail { 0%, 62%, 100% { transform: rotate(0deg); } 74% { transform: rotate(-18deg); } 86% { transform: rotate(5deg); } }
.g-case-file.cf-still .cf-wisp, .g-case-file.cf-out .cf-wisp { visibility: hidden; }
.g-case-file .cf-blinds { position: absolute; z-index: 4; left: -2px; right: -2px; top: 0; height: 100%; will-change: transform; transform: translateY(-66%);
  background: repeating-linear-gradient(180deg, var(--cf-slat) 0 calc(12px - var(--gap, 4px)), rgba(0, 0, 0, 0) calc(12px - var(--gap, 4px)) 12px); box-shadow: 0 6px 12px rgba(0, 0, 0, 0.35); }
.g-case-file .cf-blinds::after { content: ""; position: absolute; left: 0; right: 0; bottom: -7px; height: 9px; border-radius: 3px; background: linear-gradient(180deg, #6a6058, #2e2823); box-shadow: 0 3px 6px rgba(0, 0, 0, 0.4); }
.g-case-file .cf-cord { position: absolute; z-index: 1; left: 16px; top: 0; bottom: -30px; width: 2px; background: rgba(230, 220, 200, 0.65); }
.g-case-file .cf-cord::after { content: ""; position: absolute; left: -4px; bottom: -12px; width: 10px; height: 15px; border-radius: 5px; background: #c9b48a; box-shadow: 0 2px 3px rgba(0, 0, 0, 0.4); }
.g-case-file .cf-desk { position: absolute; left: 0; right: 0; top: var(--dk, 62%); bottom: 0;
  background: radial-gradient(ellipse calc(var(--W, 390px) * 0.6) calc(var(--H, 844px) * 0.44) at 72% calc(var(--H, 844px) * 0.72 - var(--dk, 500px)), var(--cf-lamp), transparent 72%), linear-gradient(180deg, var(--cf-desk1), var(--cf-desk2)); box-shadow: 0 -2px 0 rgba(255, 255, 255, 0.07), 0 -14px 28px rgba(0, 0, 0, 0.34); }
.g-case-file .cf-desk::before { content: ""; position: absolute; inset: 0; background: repeating-linear-gradient(178deg, rgba(255, 255, 255, 0.03) 0 3px, transparent 3px 11px, rgba(0, 0, 0, 0.07) 11px 13px, transparent 13px 26px); }
.g-case-file .cf-prop, .g-case-file .cf-mug { position: absolute; z-index: 1; width: 62px; height: 62px; top: calc(var(--dk, 62%) - 44px); pointer-events: none; }
.g-case-file .cf-prop { right: var(--propx, 16px); }
.g-case-file .cf-mug { left: var(--mugx, 16px); width: 50px; height: 56px; top: calc(var(--dk, 62%) - 38px); }
.g-case-file .cf-prop svg, .g-case-file .cf-mug svg { width: 100%; height: 100%; display: block; overflow: visible; filter: drop-shadow(0 6px 6px rgba(0, 0, 0, 0.35)); }
.g-case-file .cf-wisp { position: absolute; z-index: 1; left: 30%; top: -12px; width: 5px; height: 20px; border-radius: 3px; background: linear-gradient(0deg, rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0)); will-change: transform, opacity; opacity: 0; }
.g-case-file .cf-wisp.w2 { left: 52%; }
.g-case-file .cf-dark { position: absolute; inset: 0; z-index: 8; pointer-events: none; opacity: 0; visibility: hidden; transition: opacity 0.8s ease, visibility 0s linear 0.8s;
  background: radial-gradient(ellipse 70% 60% at 50% 55%, var(--cf-dk1), var(--cf-dk2)); }
.g-case-file.cf-out .cf-dark { opacity: 1; visibility: visible; transition: opacity 0.8s ease, visibility 0s; }
.g-case-file .cf-beams { position: absolute; inset: 0; z-index: 7; pointer-events: none; opacity: 0; visibility: hidden; overflow: hidden; transition: opacity 1.6s ease; }
.g-case-file .cf-beams i { position: absolute; top: var(--by, 10%); left: var(--bx, 40%); width: var(--bw, 22%); height: 170%; transform-origin: 50% 0; transform: rotate(var(--ba, 24deg));
  background: linear-gradient(90deg, rgba(255, 214, 150, 0), rgba(255, 220, 160, 0.30) 32%, rgba(255, 228, 175, 0.30) 68%, rgba(255, 214, 150, 0));
  -webkit-mask-image: linear-gradient(180deg, #000 0%, transparent 72%); mask-image: linear-gradient(180deg, #000 0%, transparent 72%); }
.g-case-file .cf-beams.is-sweep i { animation: cf-sweep 2.8s cubic-bezier(.3, 0, .2, 1) 1 both; }
.g-case-file .cf-beams.is-sweep i:nth-child(2) { animation-duration: 3.2s; }
.g-case-file .cf-beams.is-sweep i:nth-child(3) { animation-duration: 2.5s; }
@keyframes cf-sweep { from { transform: rotate(calc(var(--ba, 24deg) - 9deg)); } to { transform: rotate(calc(var(--ba, 24deg) + 7deg)); } }
.g-case-file.cf-dawn .cf-beams { opacity: var(--beam, 1); visibility: visible; }
.g-case-file .cf-warm { position: absolute; inset: 0; z-index: 7; pointer-events: none; opacity: 0; visibility: hidden; transition: opacity 1.6s ease;
  background: linear-gradient(180deg, rgba(255, 170, 110, 0.20), rgba(255, 205, 150, 0.12) 50%, rgba(255, 190, 120, 0.08)); }
.g-case-file.cf-dawn .cf-warm { opacity: var(--warm, 1); visibility: visible; }
.g-case-file .cf-pfx { position: absolute; inset: 0; z-index: 36; pointer-events: none; overflow: hidden; }
.g-case-file .cf-pt { position: absolute; margin: 0; border-radius: 50%; background: var(--c); box-shadow: 0 0 6px 1px var(--c); pointer-events: none; will-change: transform, opacity; }
.g-case-file .cf-pt.is-star { border-radius: 0; box-shadow: none; clip-path: polygon(50% 0, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0 50%, 39% 39%); }
.g-case-file .cf-pt.is-soft { box-shadow: none; background: radial-gradient(circle, var(--c), transparent 70%); }
.g-case-file .gk-char { z-index: 32; }
.g-case-file .gk-bubble { background: #f6efdf; color: #1f1b16; border-color: rgba(31, 27, 22, 0.22); box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45); }
.g-case-file .gk-char.gk-side-below .gk-bubble { max-width: 270px; }
.g-case-file .cf-hat { position: absolute; z-index: 2; left: 50%; top: calc(var(--sz) * -0.27); width: calc(var(--sz) * 0.74); height: calc(var(--sz) * 0.42); pointer-events: none;
  transform: translate(-50%, 0) rotate(-8deg); transform-origin: 50% 90%; filter: drop-shadow(0 3px 3px rgba(0, 0, 0, 0.45)); will-change: transform, opacity; }
.g-case-file .cf-hat svg { width: 100%; height: 100%; display: block; overflow: visible; }
.g-case-file .gk-r-glitch .cf-hat { animation: cf-hatjit 0.8s steps(2, end); }
@keyframes cf-hatjit { 0%, 100% { transform: translate(-50%, 0) rotate(-8deg); } 25% { transform: translate(-46%, -6px) rotate(-22deg); } 50% { transform: translate(-54%, 2px) rotate(6deg); } 75% { transform: translate(-50%, -3px) rotate(-14deg); } }
.g-case-file.cf-rgb .cf-panel:not(.is-gone) { animation: cf-rgb 0.9s steps(6, end); }
@keyframes cf-rgb { 0%, 100% { transform: none; filter: none; } 15% { transform: translate(-5px, 1px) skewX(4deg); filter: drop-shadow(4px 0 0 rgba(255, 0, 90, 0.7)) drop-shadow(-4px 0 0 rgba(0, 240, 230, 0.7)); }
  35% { transform: translate(4px, -2px) skewX(-5deg); filter: none; } 55% { transform: translate(-2px, 2px); filter: drop-shadow(-5px 0 0 rgba(255, 0, 90, 0.7)) drop-shadow(5px 0 0 rgba(0, 240, 230, 0.7)); } 75% { transform: translate(3px, 0); filter: none; } }
.g-case-file .cf-scanfx { display: none; position: absolute; inset: 0; z-index: 45; pointer-events: none; opacity: 0; background: repeating-linear-gradient(180deg, rgba(255, 255, 255, 0.10) 0 2px, transparent 2px 5px); }
.g-case-file.cf-rgb .cf-scanfx { display: block; animation: cf-flick 0.9s steps(5, end); }
@keyframes cf-flick { 0%, 100% { opacity: 0; } 20% { opacity: 0.9; } 40% { opacity: 0.2; } 60% { opacity: 0.8; } 80% { opacity: 0.3; } }

/* panels: one centred column of paper in front of the set */
.g-case-file .cf-panel { position: absolute; z-index: 10; left: var(--cf-l); width: var(--cf-w); top: var(--cf-t); bottom: var(--cf-b); display: flex; flex-direction: column; gap: 10px;
  transition: opacity 0.45s ease, transform 0.6s cubic-bezier(.2, .9, .3, 1); will-change: transform; }
.g-case-file .cf-panel.is-pre { opacity: 0; transform: translateY(40px); }
.g-case-file .cf-panel.is-gone { opacity: 0; transform: translateY(-26px) scale(0.98); pointer-events: none; transition-duration: 0.3s, 0.4s; }
.g-case-file .cf-set { position: absolute; inset: 0; z-index: 9; opacity: 0; transition: opacity 0.6s ease; pointer-events: none; overflow: hidden; }
.g-case-file .cf-set.is-on { opacity: 1; }
.g-case-file .cf-inkbtn { background: #1f1b16; color: #f6efdf; box-shadow: 0 5px 0 rgba(0, 0, 0, 0.35); }
.g-case-file .cf-inkbtn:active { transform: translateY(3px); box-shadow: 0 2px 0 rgba(0, 0, 0, 0.35); }
.g-case-file .cf-folder { position: relative; margin-top: auto; background: linear-gradient(180deg, var(--cf-manila), var(--cf-manila2)); color: var(--cf-ink); border-radius: 4px 14px 14px 14px; padding: 16px;
  box-shadow: 0 22px 46px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.35); display: flex; flex-direction: column; gap: 13px; transform: rotate(-0.8deg); }
.g-case-file .cf-folder::after { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: radial-gradient(ellipse at 20% 0%, rgba(255, 255, 255, 0.22), transparent 55%); }
.g-case-file .cf-tab { position: absolute; left: 0; top: -27px; height: 28px; padding: 0 16px; display: flex; align-items: center; background: var(--cf-manila); border-radius: 9px 9px 0 0; font: 400 13px/1 var(--cf-type); letter-spacing: 0.08em; color: var(--cf-ink2); }
.g-case-file .cf-fhead { display: flex; justify-content: space-between; gap: 8px; font: 400 13px/1.2 var(--cf-type); color: var(--cf-ink2); letter-spacing: 0.04em; }
.g-case-file .cf-vlabel { font: 600 12px/1 var(--font-ui); letter-spacing: 0.16em; color: var(--cf-ink2); text-transform: uppercase; }
.g-case-file .cf-vblock { position: relative; padding-right: 41%; min-height: 96px; }
.g-case-file .cf-vblock .cf-stamp { width: max-content; max-width: none; font-size: 25px; }
.g-case-file .cf-sw { display: block; white-space: nowrap; }
.g-case-file .cf-vtext { margin: 6px 0 0; font: 400 22px/1.28 var(--cf-type); color: var(--cf-ink); min-height: 2.56em; text-wrap: balance; }
.g-case-file .cf-stamp { position: absolute; z-index: 4; right: 6px; top: 50%; margin-top: -42px; max-width: 38%; font: 400 29px/0.98 var(--cf-stampf); letter-spacing: 0.05em; color: var(--cf-stamp); border: 4px solid currentColor; border-radius: 8px;
  padding: 8px 11px 6px; transform: rotate(-9deg); opacity: 0; pointer-events: none; text-transform: uppercase; text-align: center; white-space: normal; background: rgba(255, 255, 255, 0.04);
  -webkit-mask-image: radial-gradient(rgba(0, 0, 0, 0.62) 0.8px, #000 1.5px); mask-image: radial-gradient(rgba(0, 0, 0, 0.62) 0.8px, #000 1.5px); -webkit-mask-size: 5px 5px; mask-size: 5px 5px; }
.g-case-file .cf-stamp.is-slam { animation: cf-slam 0.44s cubic-bezier(.3, 1.4, .5, 1) forwards; }
.g-case-file .cf-stamp.is-amber { color: var(--cf-amber); }
.g-case-file .cf-stamp.is-void { opacity: 0.38 !important; transition: opacity 0.5s ease; }
.g-case-file .cf-stamp i { position: absolute; left: -10%; right: -10%; top: 50%; height: 5px; margin-top: -2px; border-radius: 3px; background: #1f1b16; transform: scaleX(0); transform-origin: 0 50%; transition: transform 0.45s cubic-bezier(.6, 0, .2, 1); }
.g-case-file .cf-stamp.is-void i { transform: scaleX(1) rotate(-6deg); }
@keyframes cf-slam { 0% { opacity: 0; transform: rotate(-9deg) scale(2.5); } 60% { opacity: 0.96; transform: rotate(-9deg) scale(0.93); } 100% { opacity: 0.92; transform: rotate(-9deg) scale(1); } }
.g-case-file .cf-sure { display: grid; gap: 10px; }
.g-case-file .cf-srow { display: grid; grid-template-columns: 1fr auto; align-items: end; gap: 5px 10px; font: 600 14px/1.2 var(--font-ui); color: var(--cf-ink2); }
.g-case-file .cf-srow b { font: 400 24px/1 var(--cf-stampf); color: var(--cf-ink); letter-spacing: 0.02em; font-variant-numeric: tabular-nums; }
.g-case-file .cf-strack { grid-column: 1 / -1; position: relative; height: 12px; border-radius: 6px; background: rgba(40, 25, 5, 0.16); box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.22); }
.g-case-file .cf-strack i { position: absolute; left: 0; top: 0; bottom: 0; width: 100%; border-radius: 6px; background: #6b5d4a; transform-origin: 0 50%; transform: scaleX(var(--v, 0)); transition: transform 1.1s cubic-bezier(.2, .9, .3, 1); }
.g-case-file .cf-srow.is-gl .cf-strack i { background: linear-gradient(90deg, var(--cf-stamp), #ff8a5c); box-shadow: 0 0 10px rgba(255, 90, 60, 0.45); }
.g-case-file .cf-srow.is-over .cf-strack i { animation: cf-over 0.5s ease-in-out 4 alternate; }
@keyframes cf-over { from { transform: scaleX(var(--v, 1)); } to { transform: scaleX(calc(var(--v, 1) * 1.03)); } }
.g-case-file .cf-bump { animation: cf-bump 0.36s cubic-bezier(.2, 1.6, .4, 1); }
@keyframes cf-bump { 0% { transform: scale(1); } 40% { transform: scale(1.22); } 100% { transform: scale(1); } }
/* statement sheet + UV scan */
.g-case-file .cf-scanp { justify-content: center; }
.g-case-file .cf-sheet { position: relative; flex: 0 1 auto; min-height: 0; display: flex; flex-direction: column; background: var(--cf-paper); color: var(--cf-ink); border-radius: 3px;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45); transition: background-color 0.7s ease, box-shadow 0.7s ease; }
.g-case-file .cf-sheet::before { content: ""; position: absolute; z-index: 0; left: 30px; top: 0; bottom: 0; width: 1.5px; background: rgba(196, 64, 54, 0.4); pointer-events: none; transition: opacity 0.6s; }
.g-case-file .cf-sheet.is-dark { background: #262033; box-shadow: 0 18px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(160, 120, 255, 0.22); }
.g-case-file .cf-sheet.is-dark::before { opacity: 0.25; }
.g-case-file .cf-shead { position: relative; z-index: 1; display: flex; justify-content: space-between; align-items: baseline; gap: 10px; padding: 13px 14px 2px 42px; font: 400 13px/1.2 var(--cf-type); color: var(--cf-ink2); letter-spacing: 0.05em; transition: color 0.6s; }
.g-case-file .cf-shead b { font: 400 18px/1 var(--cf-stampf); letter-spacing: 0.1em; color: var(--cf-ink); transition: color 0.6s; }
.g-case-file .cf-sheet.is-dark .cf-shead, .g-case-file .cf-sheet.is-dark .cf-shead b { color: #cdbff2; }
.g-case-file .cf-count { display: inline-block; font: 400 15px/1 var(--cf-stampf); letter-spacing: 0.08em; }
.g-case-file .cf-sfoot { position: relative; z-index: 1; display: flex; justify-content: space-between; gap: 8px; padding: 6px 16px 11px 42px; font: 400 13px/1.2 var(--cf-type); color: var(--cf-ink2); border-top: 1px dashed rgba(0, 0, 0, 0.18); transition: color 0.6s, opacity 0.6s; }
.g-case-file .cf-sheet.is-dark .cf-sfoot { opacity: 0.35; }
.g-case-file .cf-tb { position: relative; z-index: 1; flex: 1; min-height: 0; overflow-x: hidden; overflow-y: auto; scrollbar-width: none; touch-action: none; outline: none; cursor: crosshair; }
.g-case-file .cf-sheet.is-uv .cf-tb { cursor: none; }
.g-case-file .cf-tb::-webkit-scrollbar { display: none; }
.g-case-file .cf-tb:focus-visible { box-shadow: inset 0 0 0 2px #8b5cff; }
.g-case-file .cf-tc { position: relative; min-height: 100%; }
.g-case-file .cf-cover { position: absolute; z-index: 3; left: 0; right: 0; top: -22px; height: calc(100% + 22px); pointer-events: none; will-change: transform; background: linear-gradient(180deg, rgba(241, 232, 212, 0) 0, var(--cf-paper) 22px); }
.g-case-file .cf-tc .cf-ink, .g-case-file .cf-tc .cf-uv { margin: 0; padding: 6px 16px 20px 42px; font-family: var(--cf-type); font-weight: 400; font-size: var(--fs, 18px); line-height: var(--lh, 1.8);
  white-space: pre-wrap; overflow-wrap: break-word; letter-spacing: 0; text-align: left; }
.g-case-file .cf-tc .cf-ink { color: var(--cf-ink); transition: color 0.7s ease; }
.g-case-file .cf-sheet.is-dark .cf-ink { color: rgba(206, 196, 236, 0.36); }
.g-case-file .cf-m { border-radius: 3px; -webkit-box-decoration-break: clone; box-decoration-break: clone; transition: color 0.3s, background-color 0.3s, box-shadow 0.3s; }
.g-case-file .cf-sheet.is-dark .cf-ink .cf-m.is-found.cam { color: #8ef6ef; text-shadow: 0 0 4px rgba(63, 208, 201, 0.7); }
.g-case-file .cf-sheet.is-dark .cf-ink .cf-m.is-found.brain { color: #ffa3cf; text-shadow: 0 0 4px rgba(255, 95, 162, 0.75); }
.g-case-file .cf-sheet:not(.is-dark) .cf-ink .cf-m.is-found.cam { background: linear-gradient(180deg, transparent 34%, rgba(63, 208, 201, 0.34) 34%, rgba(63, 208, 201, 0.34) 90%, transparent 90%); }
.g-case-file .cf-sheet:not(.is-dark) .cf-ink .cf-m.is-found.brain { background: linear-gradient(180deg, transparent 34%, rgba(255, 95, 162, 0.36) 34%, rgba(255, 95, 162, 0.36) 90%, transparent 90%); cursor: pointer; }
.g-case-file .cf-sheet.is-bagging .cf-ink .cf-m.brain.is-found:not(.is-bagged):not(.is-fact) { animation: cf-arm 1.4s steps(2, jump-none) infinite; }
@keyframes cf-arm { 0%, 100% { box-shadow: 0 3px 0 -1px rgba(180, 44, 107, 0); } 50% { box-shadow: 0 3px 0 -1px rgba(180, 44, 107, 0.9); } }
.g-case-file .cf-sheet:not(.is-dark) .cf-ink .cf-m.is-bagged { color: transparent; background: repeating-linear-gradient(-45deg, rgba(180, 44, 107, 0.16) 0 3px, transparent 3px 7px); box-shadow: inset 0 0 0 1.5px rgba(180, 44, 107, 0.55); animation: none; }
.g-case-file .cf-sheet:not(.is-dark) .cf-ink .cf-m.is-fact { color: var(--cf-ink); background: linear-gradient(180deg, transparent 34%, rgba(63, 208, 201, 0.34) 34%, rgba(63, 208, 201, 0.34) 90%, transparent 90%); box-shadow: 0 3px 0 -1px rgba(10, 122, 117, 0.8); animation: none; }
.g-case-file .cf-m:focus-visible { outline: 3px solid #8b5cff; outline-offset: 2px; }
.g-case-file .cf-port { position: absolute; z-index: 2; left: 0; top: 0; width: calc(var(--lr) * 2px); height: calc(var(--lr) * 2px); border-radius: 50%; overflow: hidden; pointer-events: none; opacity: 0; transition: opacity 0.25s ease; will-change: transform; }
.g-case-file .cf-port.is-on { opacity: 1; }
.g-case-file .cf-tc .cf-uv { position: absolute; left: 0; top: 0; color: rgba(200, 182, 255, 0.52); will-change: transform;
  background: radial-gradient(circle at 30% 20%, rgba(170, 120, 255, 0.10), transparent 40%), radial-gradient(circle at 80% 70%, rgba(120, 90, 255, 0.10), transparent 45%), #1b0f33; }
.g-case-file .cf-uv .cf-m.cam { color: #8afff7; text-shadow: 0 0 3px rgba(63, 208, 201, 0.9); background: rgba(63, 208, 201, 0.2); }
.g-case-file .cf-uv .cf-m.brain { color: #ffa6d1; text-shadow: 0 0 3px rgba(255, 95, 162, 0.9); background: rgba(255, 95, 162, 0.22); }
.g-case-file .cf-uv .cf-m.is-found { box-shadow: 0 0 0 1.5px currentColor; }
.g-case-file .cf-uv .cf-m { transition: none; } /* the lens copy snaps; the page copy fades */
.g-case-file .cf-egg { position: absolute; pointer-events: none; }
.g-case-file .cf-egg svg { width: 100%; height: 100%; display: block; }
.g-case-file .cf-portglow { position: absolute; inset: 0; border-radius: 50%; box-shadow: inset 0 0 22px 8px rgba(120, 70, 255, 0.55), 0 0 0 1.5px rgba(196, 168, 255, 0.6); background: radial-gradient(circle, rgba(170, 130, 255, 0.10), rgba(120, 70, 255, 0) 62%); }
.g-case-file .cf-lamp { position: absolute; z-index: 24; left: 0; top: 0; width: 0; height: 0; pointer-events: none; opacity: 0; transition: opacity 0.25s ease; will-change: transform; }
.g-case-file .cf-lamp.is-on { opacity: 1; }
.g-case-file .cf-halo { position: absolute; left: calc(var(--lr) * -1.55px); top: calc(var(--lr) * -1.55px); width: calc(var(--lr) * 3.1px); height: calc(var(--lr) * 3.1px); border-radius: 50%;
  background: radial-gradient(circle, rgba(150, 110, 255, 0) 31%, rgba(150, 100, 255, 0.24) 33.5%, rgba(110, 60, 255, 0.08) 52%, rgba(100, 60, 255, 0) 70%); }
.g-case-file .cf-cone { position: absolute; left: -40px; top: 0; width: 80px; height: calc(var(--lr) * 0.62px); background: linear-gradient(0deg, rgba(190, 150, 255, 0.5), rgba(190, 150, 255, 0)); clip-path: polygon(36% 100%, 64% 100%, 100% 0, 0 0); }
.g-case-file .cf-torch { will-change: transform; position: absolute; left: -15px; top: calc(var(--lr) * 0.62px); width: 30px; height: 92px; transform-origin: 50% 0; transform: rotate(var(--tilt, 0deg)); filter: drop-shadow(0 8px 8px rgba(0, 0, 0, 0.5)); }
.g-case-file .cf-torch svg { width: 100%; height: 100%; display: block; overflow: visible; }
.g-case-file .cf-pop { position: absolute; z-index: 41; padding: 5px 8px 4px; border-radius: 4px; font: 400 13px/1 var(--cf-stampf); letter-spacing: 0.1em; white-space: nowrap; pointer-events: none; animation: cf-popup 1.25s ease-out forwards; }
.g-case-file .cf-pop.cam { background: #3fd0c9; color: #04201e; box-shadow: 0 0 14px rgba(63, 208, 201, 0.8); }
.g-case-file .cf-pop.brain { background: #ff5fa2; color: #2b0618; box-shadow: 0 0 14px rgba(255, 95, 162, 0.8); }
.g-case-file .cf-pop.fact { background: #f6efdf; color: #0a7a75; box-shadow: 0 0 0 2px #0a7a75; }
@keyframes cf-popup { 0% { opacity: 0; transform: translate(-50%, -60%) scale(0.7); } 18% { opacity: 1; transform: translate(-50%, -112%) scale(1.08); } 70% { opacity: 1; transform: translate(-50%, -130%); } 100% { opacity: 0; transform: translate(-50%, -165%); } }
.g-case-file .cf-bottom { position: relative; flex: none; height: var(--cf-bot); }
.g-case-file .cf-tray, .g-case-file .cf-bag { position: absolute; inset: 0; transition: opacity 0.45s ease, transform 0.55s cubic-bezier(.2, .9, .3, 1); }
.g-case-file .cf-tray { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 14px; overflow: hidden; color: #ece6ff;
  background: linear-gradient(180deg, rgba(26, 18, 44, 0.94), rgba(12, 8, 24, 0.96)); border: 1px solid rgba(160, 120, 255, 0.38); box-shadow: 0 12px 28px rgba(0, 0, 0, 0.45), inset 0 0 26px rgba(139, 92, 255, 0.2); }
.g-case-file .cf-tray.is-gone, .g-case-file .cf-bag.is-pre { opacity: 0; transform: translateY(24px); pointer-events: none; }
.g-case-file .cf-holster { flex: none; width: 26px; height: 78px; margin: 0 4px 0 6px; transform: rotate(-18deg); opacity: 0.95; transition: opacity 0.3s; }
.g-case-file .cf-holster.is-empty { opacity: 0.18; }
.g-case-file .cf-trayt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
.g-case-file .cf-trayt p { margin: 0; font: 600 14px/1.3 var(--font-ui); }
.g-case-file .cf-legend { display: flex; gap: 6px 14px; flex-wrap: wrap; font: 400 14px/1 var(--cf-stampf); letter-spacing: 0.08em; }
.g-case-file .cf-legend .c { color: #3fd0c9; } .g-case-file .cf-legend .b { color: #ff5fa2; }
.g-case-file .cf-revealall { flex: none; align-self: center; appearance: none; cursor: pointer; min-height: 44px; padding: 10px 13px; border-radius: 999px; border: 1px solid rgba(200, 180, 255, 0.5); background: rgba(139, 92, 255, 0.16); color: #efe9ff; font: 600 14px/1 var(--font-ui); }
.g-case-file .cf-bag { border-radius: 12px 12px 18px 18px; padding: 9px 10px 10px; display: flex; flex-direction: column; gap: 7px; transform-origin: 50% 100%;
  background: linear-gradient(160deg, rgba(235, 245, 255, 0.32), rgba(200, 220, 240, 0.13) 45%, rgba(230, 240, 255, 0.24)); border: 2px solid rgba(240, 248, 255, 0.58);
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.65), inset 0 -10px 24px rgba(255, 255, 255, 0.08); }
.g-case-file.cf-bright .cf-bag { background: linear-gradient(160deg, rgba(255, 255, 255, 0.62), rgba(225, 235, 245, 0.42) 45%, rgba(255, 255, 255, 0.55)); border-color: rgba(255, 255, 255, 0.85); }
.g-case-file .cf-bag::before { content: ""; position: absolute; left: 12px; right: 12px; top: 4px; height: 4px; border-radius: 2px; background: repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.9) 0 3px, rgba(255, 255, 255, 0.25) 3px 6px); }
.g-case-file .cf-bag.is-gulp { animation: cf-gulp 0.42s cubic-bezier(.2, 1.4, .4, 1); }
@keyframes cf-gulp { 0% { transform: scale(1); } 30% { transform: scale(1.04, 0.9); } 65% { transform: scale(0.98, 1.03); } 100% { transform: none; } }
.g-case-file .cf-bag.is-sealed::after { content: ""; position: absolute; left: -4px; right: -4px; top: 14px; height: 16px; background: repeating-linear-gradient(-45deg, #c8342b 0 10px, #e9d9a9 10px 20px); box-shadow: 0 2px 4px rgba(0, 0, 0, 0.35); animation: cf-tape 0.4s cubic-bezier(.2, .9, .3, 1) both; transform-origin: 0 50%; }
@keyframes cf-tape { from { transform: scaleX(0); } to { transform: scaleX(1); } }
.g-case-file .cf-baghead { display: flex; align-items: center; gap: 8px; margin-top: 6px; min-height: 30px; }
.g-case-file .cf-baghead b { flex: none; background: #c8342b; color: #fff; font: 400 15px/1 var(--cf-stampf); letter-spacing: 0.12em; padding: 5px 8px 4px; border-radius: 3px; box-shadow: 0 2px 0 rgba(0, 0, 0, 0.3); }
.g-case-file .cf-baghead span { min-width: 0; font: 600 12px/1.2 var(--font-ui); letter-spacing: 0.08em; text-transform: uppercase; color: var(--cf-fg); }
.g-case-file .cf-baghead em { margin-left: auto; flex: none; white-space: nowrap; font: 400 19px/1 var(--cf-stampf); font-style: normal; color: var(--cf-brain); text-shadow: 0 0 10px rgba(255, 95, 162, 0.45); }
.g-case-file.cf-bright .cf-baghead em { color: var(--cf-braini); text-shadow: none; }
.g-case-file .cf-seal { margin-left: auto; flex: none; min-height: 44px; padding: 10px 16px; font-size: 15px; }
.g-case-file .cf-slips { flex: 1; min-height: 0; display: flex; flex-wrap: nowrap; align-items: center; gap: 8px; overflow-x: auto; overflow-y: hidden; padding: 2px 4px; scrollbar-width: none; scroll-behavior: smooth; }
.g-case-file .cf-slips::-webkit-scrollbar { display: none; }
.g-case-file .cf-slip { flex: none; appearance: none; border: 0; cursor: pointer; min-height: 44px; max-width: 72%; padding: 6px 10px; border-radius: 3px; background: var(--cf-paper); color: var(--cf-ink); font: 400 15px/1.2 var(--cf-type);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3), inset 0 0 0 2px rgba(180, 44, 107, 0.6); transform: rotate(var(--r, -2deg)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; animation: cf-slipin 0.38s cubic-bezier(.2, 1.5, .4, 1) both; }
.g-case-file .cf-slip:active { transform: rotate(var(--r, -2deg)) scale(0.95); }
@keyframes cf-slipin { from { opacity: 0; transform: translateY(-16px) rotate(var(--r, -2deg)) scale(0.7); } to { opacity: 1; transform: rotate(var(--r, -2deg)); } }
.g-case-file .cf-bagempty { margin: auto; font: 500 14px/1.3 var(--font-ui); color: var(--cf-fg); opacity: 0.85; text-align: center; }
.g-case-file .cf-fly { position: absolute; z-index: 40; left: 0; top: 0; padding: 6px 10px; border-radius: 3px; background: var(--cf-paper); color: var(--cf-ink); font: 400 15px/1.2 var(--cf-type); white-space: nowrap;
  max-width: 250px; overflow: hidden; text-overflow: ellipsis; pointer-events: none; will-change: transform; box-shadow: 0 12px 22px rgba(0, 0, 0, 0.42), inset 0 0 0 2px rgba(180, 44, 107, 0.65); }
.g-case-file .cf-fly.is-cam { box-shadow: 0 12px 22px rgba(0, 0, 0, 0.42), inset 0 0 0 2px rgba(10, 122, 117, 0.7); }
.g-case-file .cf-note { position: absolute; z-index: 42; width: min(292px, calc(100% - 24px)); background: #fff3b8; color: #1f1b16; border-radius: 3px; padding: 15px 14px 12px; box-shadow: 0 16px 34px rgba(0, 0, 0, 0.45);
  display: flex; flex-direction: column; gap: 9px; transform: rotate(-1.2deg); animation: cf-notein 0.32s cubic-bezier(.2, 1.4, .4, 1) both; }
.g-case-file .cf-note::before { content: ""; position: absolute; top: -9px; left: 50%; width: 72px; height: 18px; margin-left: -36px; background: rgba(255, 255, 255, 0.6); transform: rotate(3deg); box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15); }
@keyframes cf-notein { from { opacity: 0; transform: rotate(-6deg) scale(0.85); } to { opacity: 1; transform: rotate(-1.2deg); } }
.g-case-file .cf-note small { font: 600 12px/1 var(--font-ui); letter-spacing: 0.16em; text-transform: uppercase; color: #0a7a75; }
.g-case-file .cf-note p { margin: 0; font: 400 15px/1.4 var(--cf-type); }
.g-case-file .cf-note p b { font-weight: 400; color: #0a7a75; }
.g-case-file .cf-row2 { display: flex; gap: 8px; }
.g-case-file .cf-row2 .ts-btn { flex: 1; min-height: 44px; padding: 10px 10px; font-size: 14px; }
.g-case-file .cf-note .ts-btn-quiet { color: #1f1b16; border-color: rgba(0, 0, 0, 0.3); }

/* CCTV */
.g-case-file .cf-set-cctv { background: radial-gradient(ellipse 70% 50% at 50% 38%, rgba(60, 200, 190, 0.12), transparent 70%), linear-gradient(180deg, #0e131b, #05070b); }
.g-case-file .cf-set-cctv::after { content: ""; position: absolute; inset: 0; background: repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.02) 0 1px, transparent 1px 64px); }
.g-case-file .cf-cctv { justify-content: center; }
.g-case-file .cf-mon { position: relative; flex: 0 1 auto; height: min(47cqh, 400px); min-height: 220px; padding: 14px 14px 28px; border-radius: 24px; background: linear-gradient(180deg, #2c3036, #15171b);
  box-shadow: 0 24px 46px rgba(0, 0, 0, 0.62), inset 0 2px 0 rgba(255, 255, 255, 0.09), inset 0 -3px 0 rgba(0, 0, 0, 0.45); }
.g-case-file .cf-mon::after { content: ""; position: absolute; right: 24px; bottom: 10px; width: 8px; height: 8px; border-radius: 50%; background: #ff3b3b; box-shadow: 0 0 8px #ff3b3b; }
.g-case-file .cf-scr { position: relative; height: 100%; border-radius: 18px / 14px; overflow: hidden; background: radial-gradient(ellipse at 50% 45%, #0f2723, #030807 82%); box-shadow: inset 0 0 44px rgba(0, 0, 0, 0.85), inset 0 0 0 2px rgba(0, 0, 0, 0.6); }
.g-case-file .cf-osd { position: absolute; z-index: 3; left: 14px; right: 14px; top: 11px; display: flex; justify-content: space-between; gap: 8px; font: 400 13px/1 var(--cf-stampf); letter-spacing: 0.12em; color: rgba(220, 255, 245, 0.88); text-shadow: 0 0 6px rgba(120, 255, 220, 0.6); }
.g-case-file .cf-rec { color: #ff5b5b; text-shadow: 0 0 6px rgba(255, 60, 60, 0.85); }
.g-case-file .cf-scene { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 1; will-change: transform; transform: scale(1.06) translate(-2%, 1%); }
.g-case-file .cf-trans { position: absolute; z-index: 2; left: 0; right: 0; bottom: 0; max-height: 66%; padding: 30px 14px 13px; overflow: hidden; display: flex; flex-direction: column; justify-content: flex-end; gap: 7px; background: linear-gradient(180deg, rgba(0, 0, 0, 0), rgba(0, 8, 6, 0.8) 34%);
  font: 400 16px/1.4 ui-monospace, "SFMono-Regular", "Courier New", monospace; color: #dafff5; text-shadow: 0 0 6px rgba(110, 255, 220, 0.55), 1.5px 0 0 rgba(255, 60, 90, 0.35), -1.5px 0 0 rgba(60, 200, 255, 0.35); }
.g-case-file .cf-ln { flex: none; }
.g-case-file .cf-ln i { font: 400 13px/1 var(--cf-stampf); font-style: normal; letter-spacing: 0.1em; color: rgba(150, 255, 220, 0.62); margin-right: 8px; }
.g-case-file .cf-ln.is-nosig { color: #ff8cc2; text-shadow: 0 0 6px rgba(255, 95, 162, 0.85); font: 400 15px/1.3 var(--cf-stampf); letter-spacing: 0.14em; }
.g-case-file .cf-scanl { position: absolute; inset: 0; z-index: 4; pointer-events: none; background: repeating-linear-gradient(180deg, rgba(0, 0, 0, 0.3) 0 1px, transparent 1px 3px); }
.g-case-file .cf-roll { will-change: transform; position: absolute; z-index: 4; left: 0; right: 0; top: -30%; height: 30%; pointer-events: none; background: linear-gradient(180deg, transparent, rgba(180, 255, 230, 0.06), transparent); }
.g-case-file .cf-static { display: none; will-change: transform; position: absolute; inset: -20%; z-index: 5; pointer-events: none; opacity: 0.85; background-image: var(--noise, none); background-size: 96px 96px; }
.g-case-file .cf-static.is-on { display: block; }
.g-case-file .cf-idle { position: absolute; z-index: 3; inset: 0; display: grid; place-items: center; background: rgba(0, 10, 8, 0.35); font: 400 20px/1 var(--cf-stampf); letter-spacing: 0.2em; color: rgba(220, 255, 245, 0.75); text-shadow: 0 0 10px rgba(120, 255, 220, 0.6); }
.g-case-file .cf-counts { flex: none; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.g-case-file .cf-cnt { border-radius: 14px; padding: 10px 12px; background: rgba(0, 0, 0, 0.45); border: 1px solid rgba(255, 255, 255, 0.12); display: flex; flex-direction: column; gap: 5px; }
.g-case-file .cf-cnt b { font: 400 36px/1 var(--cf-stampf); font-variant-numeric: tabular-nums; }
.g-case-file .cf-cnt.cam b { color: #3fd0c9; text-shadow: 0 0 14px rgba(63, 208, 201, 0.6); }
.g-case-file .cf-cnt.brain b { color: #ff5fa2; text-shadow: 0 0 14px rgba(255, 95, 162, 0.6); }
.g-case-file .cf-cnt span { font: 600 13px/1.25 var(--font-ui); color: #d8dde6; }
.g-case-file .cf-deck { flex: none; display: flex; align-items: center; justify-content: center; gap: 14px; min-height: 76px; }
.g-case-file .cf-play { width: 68px; height: 68px; flex: none; border-radius: 50%; border: 0; cursor: pointer; display: grid; place-items: center; transition: transform 0.1s, box-shadow 0.1s;
  background: radial-gradient(circle at 40% 35%, #ff7a6e, #c8281f 70%); box-shadow: 0 6px 0 #7a140f, 0 12px 22px rgba(0, 0, 0, 0.5), inset 0 2px 0 rgba(255, 255, 255, 0.35); }
.g-case-file .cf-play.is-down { transform: translateY(5px); box-shadow: 0 1px 0 #7a140f, 0 6px 12px rgba(0, 0, 0, 0.5), inset 0 2px 0 rgba(255, 255, 255, 0.25); }
.g-case-file .cf-play svg { width: 26px; height: 26px; margin-left: 4px; fill: #fff; }
.g-case-file .cf-decklbl { font: 400 16px/1.2 var(--cf-stampf); letter-spacing: 0.16em; color: #e8ecf2; }
.g-case-file .cf-caption { margin: 0; flex: none; font: 400 22px/1.2 var(--cf-stampf); letter-spacing: 0.03em; text-align: center; color: #f4f1ea; text-wrap: balance; animation: cf-notein 0.4s ease both; }
.g-case-file .cf-caption .c { color: #3fd0c9; } .g-case-file .cf-caption .b { color: #ff5fa2; }
.g-case-file .cf-next { flex: none; align-self: center; min-width: 220px; }
.g-case-file .cf-cctv .cf-next, .g-case-file .cf-lineupp .cf-next { background: #f6efdf; color: #1f1b16; }

/* corkboard */
.g-case-file .cf-set-board { background-color: var(--cf-cork); background-image: radial-gradient(rgba(0, 0, 0, 0.14) 1px, transparent 1.6px), radial-gradient(rgba(255, 255, 255, 0.09) 1px, transparent 1.6px), linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(0, 0, 0, 0.24));
  background-size: 7px 7px, 11px 11px, 100% 100%; background-position: 0 0, 3px 5px, 0 0; }
.g-case-file .cf-set-board::after { content: ""; position: absolute; inset: 0; box-shadow: inset 0 0 0 12px #2a1d12, inset 0 0 80px rgba(0, 0, 0, 0.5); }
.g-case-file .cf-bhead { flex: none; align-self: center; display: flex; align-items: baseline; gap: 10px; padding: 8px 14px 7px; background: #1f1b16; color: #f6efdf; border-radius: 3px; box-shadow: 0 6px 14px rgba(0, 0, 0, 0.4); transform: rotate(-1deg); }
.g-case-file .cf-bhead b { font: 400 18px/1 var(--cf-stampf); letter-spacing: 0.12em; }
.g-case-file .cf-bhead span { font: 500 13px/1 var(--font-ui); opacity: 0.85; }
.g-case-file .cf-bwrap { position: relative; flex: 1; min-height: 0; display: flex; flex-direction: column; justify-content: center; gap: 30px; }
.g-case-file .cf-strings { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; z-index: 1; }
.g-case-file .cf-strings path { fill: none; stroke: var(--cf-string); stroke-width: 2.6; stroke-linecap: round; }
.g-case-file .cf-strings path.sh { stroke: rgba(0, 0, 0, 0.3); stroke-width: 3; }
.g-case-file .cf-facts { position: relative; z-index: 2; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
.g-case-file .cf-fact { position: relative; width: calc(50% - 6px); max-width: 250px; background: var(--cf-paper); color: var(--cf-ink); padding: 15px 11px 11px; border-radius: 2px; box-shadow: 0 6px 14px rgba(0, 0, 0, 0.4);
  transform: rotate(var(--r, -1deg)); font: 400 15px/1.32 var(--cf-type); }
.g-case-file .cf-fact.is-none { color: var(--cf-stamp); }
.g-case-file .cf-fact small { display: block; margin-bottom: 6px; font: 600 12px/1 var(--font-ui); letter-spacing: 0.14em; color: #0a7a75; text-transform: uppercase; }
.g-case-file .cf-fact .gk-user { font-weight: 400; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
.g-case-file .cf-pin.is-low { top: auto; bottom: -6px; }
.g-case-file .cf-pin { position: absolute; z-index: 4; top: -6px; left: 50%; margin-left: -7px; width: 14px; height: 14px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #ff8b80, #b8322a 70%); box-shadow: 0 2px 3px rgba(0, 0, 0, 0.45); }
.g-case-file .cf-blanks { position: relative; z-index: 2; display: grid; grid-template-columns: 1fr 1fr; gap: 16px 14px; }
.g-case-file .cf-blank { position: relative; appearance: none; border: 0; padding: 0; margin: 0; background: none; cursor: pointer; min-height: 118px; perspective: 900px; transform: rotate(var(--r, 0deg)); font: inherit; color: inherit; }
.g-case-file .cf-blank.is-odd { grid-column: 1 / -1; width: calc(50% - 7px); justify-self: center; }
.g-case-file .cf-face { position: absolute; inset: 0; border-radius: 3px; -webkit-backface-visibility: hidden; backface-visibility: hidden; transition: transform 0.65s cubic-bezier(.3, 1.25, .4, 1);
  display: flex; align-items: center; justify-content: center; padding: 16px 12px 12px; box-shadow: 0 8px 16px rgba(0, 0, 0, 0.42); }
.g-case-file .cf-front { background: linear-gradient(180deg, #2b303b, #1a1e26); color: rgba(255, 255, 255, 0.9); font: 400 52px/1 var(--cf-stampf); }
.g-case-file .cf-back { background: var(--cf-paper); color: var(--cf-ink); font: 400 15px/1.36 var(--cf-type); transform: rotateY(180deg); text-align: left; align-items: flex-start; justify-content: flex-start; }
.g-case-file .cf-blank.is-flip .cf-front { transform: rotateY(-180deg); }
.g-case-file .cf-blank.is-flip .cf-back { transform: rotateY(0deg); }
.g-case-file .cf-blank.is-dim { opacity: 0.7; }
.g-case-file .cf-ring { position: absolute; inset: -12px; z-index: 5; pointer-events: none; }
.g-case-file .cf-ring svg { width: 100%; height: 100%; display: block; overflow: visible; }
.g-case-file .cf-ring path { fill: none; stroke: var(--cf-string); stroke-width: 4.5; stroke-linecap: round; stroke-dasharray: 640; stroke-dashoffset: 640; }
.g-case-file .cf-blank.is-pick .cf-ring path { animation: cf-draw 0.7s ease forwards; }
@keyframes cf-draw { to { stroke-dashoffset: 0; } }
.g-case-file .cf-boardp .cf-next { background: #1f1b16; color: #f6efdf; box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4); }

/* lineup */
.g-case-file .cf-set-lineup { background: linear-gradient(180deg, #5b6471 0%, #464e5a 60%, #15181e 60.3%, #1e2229 100%); }
.g-case-file .cf-marks { position: absolute; left: 0; right: 0; top: 13%; height: 44%; background: repeating-linear-gradient(180deg, rgba(255, 255, 255, 0.24) 0 1px, transparent 1px 25%); }
.g-case-file .cf-marks span { display: none; position: absolute; left: 12px; font: 600 12px/1 var(--font-ui); color: rgba(255, 255, 255, 0.55); letter-spacing: 0.08em; }
.g-case-file .cf-row { position: relative; flex: none; display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 6px; padding-top: 8px; }
.g-case-file .cf-sus { position: relative; appearance: none; border: 0; background: none; padding: 0; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 5px; color: #fff; font: inherit; min-width: 0; }
.g-case-file .cf-spot { position: absolute; top: -76px; left: 50%; width: 150px; height: 220px; transform: translateX(-50%); background: radial-gradient(ellipse 46% 58% at 50% 30%, rgba(255, 240, 200, 0.34), transparent 70%); opacity: 0; transition: opacity 0.35s; pointer-events: none; }
.g-case-file .cf-sus img { position: relative; width: var(--ps, 70px); height: var(--ps, 70px); object-fit: contain; transition: transform 0.35s cubic-bezier(.2, 1.4, .4, 1); filter: drop-shadow(0 8px 10px rgba(0, 0, 0, 0.45)) saturate(0.78) brightness(0.88); }
.g-case-file .cf-sus[aria-pressed="true"] .cf-spot { opacity: 1; }
.g-case-file .cf-sus[aria-pressed="true"] img { transform: translateY(-6px) scale(1.1); filter: drop-shadow(0 12px 14px rgba(0, 0, 0, 0.5)); }
.g-case-file .cf-sus.is-hop img { animation: cf-hop 0.4s cubic-bezier(.2, 1.5, .4, 1); }
@keyframes cf-hop { 40% { transform: translateY(-14px) scale(1.12); } }
.g-case-file .cf-plac { position: relative; width: 100%; min-height: 2.5em; display: flex; align-items: center; justify-content: center; text-align: center; padding: 5px 3px 4px; border-radius: 3px; background: #101216; border: 1px solid rgba(255, 255, 255, 0.22);
  font: 400 13px/1.1 var(--cf-stampf); letter-spacing: 0.03em; overflow-wrap: anywhere; }
.g-case-file .cf-sus.is-fear .cf-plac { color: #ffd2cd; border-color: rgba(255, 120, 110, 0.5); }
.g-case-file .cf-sus[aria-pressed="true"] .cf-plac { border-color: #ffb24f; box-shadow: 0 0 0 1px #ffb24f; }
.g-case-file .cf-stack { position: relative; width: 36px; height: 30px; }
.g-case-file .cf-stack i { position: absolute; left: 4px; width: 28px; height: 9px; border-radius: 50%; background: radial-gradient(ellipse at 50% 35%, #ffd98a, #d9881c 75%); box-shadow: 0 1px 0 #8a4f08, inset 0 0 0 1.5px rgba(255, 255, 255, 0.55); animation: cf-chipin 0.3s cubic-bezier(.2, 1.6, .4, 1) both; }
@keyframes cf-chipin { from { transform: translateY(-14px); opacity: 0; } to { transform: none; opacity: 1; } }
.g-case-file .cf-pct { font: 400 16px/1 var(--cf-stampf); color: #ffb24f; font-variant-numeric: tabular-nums; }
.g-case-file .cf-lineupp { justify-content: center; }
.g-case-file .cf-dos { position: relative; flex: 0 1 auto; min-height: 0; background: var(--cf-paper); color: var(--cf-ink); border-radius: 4px; padding: 13px 14px 12px; box-shadow: 0 16px 34px rgba(0, 0, 0, 0.45); display: flex; flex-direction: column; gap: 7px; overflow: hidden; }
.g-case-file .cf-dinfo { flex: 1; min-height: 0; overflow: hidden; display: flex; flex-direction: column; gap: 7px; }
.g-case-file .cf-dos.is-swap { animation: cf-swap 0.32s ease; }
@keyframes cf-swap { from { opacity: 0.35; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.g-case-file .cf-dos h3 { margin: 0; font: 400 21px/1.05 var(--cf-stampf); letter-spacing: 0.04em; display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.g-case-file .cf-dos h3 small { font: 600 12px/1 var(--font-ui); letter-spacing: 0.1em; color: var(--cf-ink2); text-transform: uppercase; white-space: nowrap; }
.g-case-file .cf-theory { margin: 0; font: 400 16px/1.32 var(--cf-type); }
.g-case-file .cf-quote { margin: 0; font: italic 500 14px/1.35 var(--font-ui); color: var(--cf-ink2); }
.g-case-file .cf-lbl { font: 600 12px/1 var(--font-ui); letter-spacing: 0.14em; color: var(--cf-ink2); text-transform: uppercase; }
.g-case-file .cf-fits { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.g-case-file .cf-fits li { display: grid; grid-template-columns: 18px 1fr; gap: 6px; font: 400 15px/1.3 var(--font-ui); }
.g-case-file .cf-fits .gk-user { font-weight: 400; }
.g-case-file .cf-fits li span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.g-case-file .cf-fits i { font-style: normal; font-weight: 700; }
.g-case-file .cf-fits .y i { color: #23764a; } .g-case-file .cf-fits .n i { color: #b8322a; } .g-case-file .cf-fits .q i { color: var(--cf-ink2); }
.g-case-file .cf-meta { display: flex; justify-content: space-between; gap: 4px 12px; flex-wrap: wrap; font: 600 12px/1.35 var(--font-ui); letter-spacing: 0.06em; text-transform: uppercase; color: var(--cf-ink2); }
.g-case-file .cf-meta b { color: var(--cf-ink); letter-spacing: 0.01em; text-transform: none; font-size: 14px; font-weight: 600; }
.g-case-file .cf-plaus { display: inline-flex; gap: 3px; vertical-align: middle; margin-left: 4px; }
.g-case-file .cf-plaus i { width: 14px; height: 7px; border-radius: 2px; background: rgba(0, 0, 0, 0.15); }
.g-case-file .cf-plaus i.on { background: #1f1b16; }
.g-case-file .cf-ctl { flex: none; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding-top: 8px; border-top: 1px dashed rgba(0, 0, 0, 0.22); }
.g-case-file .cf-ctl button { width: 54px; height: 48px; flex: none; border-radius: 14px; border: 0; cursor: pointer; background: #1f1b16; color: #f6efdf; font: 600 26px/1 var(--font-ui); box-shadow: 0 4px 0 rgba(0, 0, 0, 0.35); }
.g-case-file .cf-ctl button:active { transform: translateY(3px); box-shadow: 0 1px 0 rgba(0, 0, 0, 0.35); }
.g-case-file .cf-ctl button:disabled { opacity: 0.28; cursor: default; transform: none; }
.g-case-file .cf-ctl output { flex: 1; text-align: center; font: 600 15px/1.2 var(--font-ui); }
.g-case-file .cf-bank { flex: none; display: flex; align-items: center; gap: 12px; }
.g-case-file .cf-bankl { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; color: #fff; }
.g-case-file .cf-dots { display: flex; gap: 4px; flex-wrap: wrap; }
.g-case-file .cf-dots i { width: 17px; height: 17px; border-radius: 50%; background: radial-gradient(circle at 40% 35%, #ffd98a, #d9881c 72%); box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.55), 0 2px 0 rgba(0, 0, 0, 0.35); transition: transform 0.25s, opacity 0.25s; }
.g-case-file .cf-dots i.is-used { opacity: 0.18; transform: scale(0.72); }
.g-case-file .cf-bankl span { font: 600 14px/1.2 var(--font-ui); }
.g-case-file .cf-lock { flex: none; min-width: 124px; background: #ffb24f; color: #1a1206; box-shadow: 0 5px 0 rgba(0, 0, 0, 0.4); }
.g-case-file .cf-lock[disabled] { background: #6b6358; color: #f1ead9; opacity: 0.7; }
.g-case-file .cf-flychip { position: absolute; z-index: 40; left: 0; top: 0; width: 20px; height: 20px; margin: -10px 0 0 -10px; border-radius: 50%; pointer-events: none; background: radial-gradient(circle at 40% 35%, #ffe2a2, #d9881c 72%); box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.6), 0 6px 10px rgba(0, 0, 0, 0.4); }

/* verdict + dawn */
.g-case-file .cf-final { justify-content: flex-end; }
.g-case-file .cf-vsheet { position: relative; flex: none; background: var(--cf-paper); color: var(--cf-ink); border-radius: 4px; padding: 14px 15px 13px; box-shadow: 0 22px 46px rgba(0, 0, 0, 0.5); display: flex; flex-direction: column; gap: 9px; transform: rotate(-0.5deg); }
.g-case-file .cf-vhead { display: flex; justify-content: space-between; gap: 8px; font: 400 13px/1 var(--cf-type); color: var(--cf-ink2); letter-spacing: 0.05em; }
.g-case-file .cf-vtitle { position: relative; display: flex; align-items: center; gap: 10px; min-height: 64px; }
.g-case-file .cf-vtitle h2 { flex: 1; min-width: 0; }
.g-case-file .cf-vsheet h2 { margin: 0; font: 400 22px/1.1 var(--cf-stampf); letter-spacing: 0.03em; text-transform: uppercase; text-wrap: balance; }
.g-case-file .cf-vsheet .cf-stamp { position: relative; right: auto; top: auto; margin: 0 2px 0 0; flex: none; width: max-content; max-width: none; font-size: 22px; border-width: 3px; padding: 6px 9px 4px; }
.g-case-file .cf-filed { position: absolute; z-index: 4; left: 14px; bottom: 64px; font: 400 18px/1 var(--cf-stampf); letter-spacing: 0.1em; color: #2f5d8a; border: 3px solid currentColor; border-radius: 6px; padding: 5px 8px 3px; transform: rotate(-6deg); opacity: 0.85; pointer-events: none; animation: cf-slam 0.44s cubic-bezier(.3, 1.4, .5, 1) both; }
.g-case-file .cf-say { margin: 0; font: 400 15px/1.38 var(--cf-type); }
.g-case-file .cf-nums { display: grid; gap: 6px; }
.g-case-file .cf-num { display: grid; grid-template-columns: 104px 1fr 46px; gap: 8px; align-items: center; font: 600 12px/1.2 var(--font-ui); letter-spacing: 0.06em; text-transform: uppercase; color: var(--cf-ink2); }
.g-case-file .cf-num .cf-strack { grid-column: auto; height: 11px; }
.g-case-file .cf-num.is-after .cf-strack i { background: var(--cf-stamp); }
.g-case-file .cf-num b { font: 400 19px/1 var(--cf-stampf); color: var(--cf-ink); text-align: right; font-variant-numeric: tabular-nums; }
.g-case-file .cf-cw { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 4px 10px; font: 600 14px/1.3 var(--font-ui); color: var(--cf-ink2); }
.g-case-file .cf-tier { font: 400 13px/1 var(--cf-stampf); letter-spacing: 0.1em; text-transform: uppercase; padding: 5px 8px 4px; border-radius: 4px; color: #3a2405; background: linear-gradient(135deg, #fff1b8, #ffd36b 55%, #f0a63a); box-shadow: 0 2px 0 rgba(120, 70, 10, 0.35); }
.g-case-file .cf-tier.is-plain { color: var(--cf-ink2); background: rgba(0, 0, 0, 0.08); box-shadow: none; }
.g-case-file .cf-cw b { font: 400 17px/1 var(--cf-stampf); letter-spacing: 0.02em; }
.g-case-file .cf-cw .c { color: var(--cf-cami); } .g-case-file .cf-cw .b { color: var(--cf-braini); }
.g-case-file .cf-lead { display: grid; grid-template-columns: auto 1fr; gap: 9px; align-items: baseline; padding: 9px 11px; border-radius: 8px; background: rgba(255, 255, 255, 0.55); border: 1px solid rgba(0, 0, 0, 0.14); font: 400 15px/1.35 var(--cf-type); }
.g-case-file .cf-lead em { font: 600 12px/1.4 var(--font-ui); font-style: normal; letter-spacing: 0.12em; text-transform: uppercase; color: var(--cf-ink2); white-space: nowrap; }
.g-case-file .cf-rack { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; min-width: 0; font: 600 12px/1 var(--font-ui); letter-spacing: 0.1em; text-transform: uppercase; color: var(--cf-ink2); }
.g-case-file .cf-rack i { width: 25px; height: 15px; display: inline-block; flex: none; }
.g-case-file .cf-rack b { margin-right: 4px; }
.g-case-file .cf-rack i svg { width: 100%; height: 100%; display: block; overflow: visible; }
.g-case-file .cf-rack i.is-lock { opacity: 0.22; filter: grayscale(1) brightness(0.3); }
.g-case-file .cf-rack i.is-new { animation: cf-bump 0.6s cubic-bezier(.2, 1.6, .4, 1) 2; }
.g-case-file .cf-rack span { margin-left: auto; letter-spacing: 0.06em; font-size: 13px; color: var(--cf-ink); white-space: nowrap; }
.g-case-file .cf-rack b { white-space: nowrap; }
.g-case-file .cf-acts { display: flex; gap: 8px; flex-wrap: wrap; }
.g-case-file .cf-acts .ts-btn { flex: 1 1 auto; min-height: 46px; padding: 12px 14px; font-size: 15px; }
.g-case-file .cf-vsheet .ts-btn-quiet { background: transparent; color: #1f1b16; border-color: rgba(0, 0, 0, 0.3); }
.g-case-file .cf-vsheet .ts-btn-quiet[disabled] { opacity: 0.6; }
.g-case-file .cf-plan { position: relative; flex: none; display: flex; flex-direction: column; gap: 7px; padding: 12px 12px 12px; border: 7px solid #2a1d12; border-radius: 4px; box-shadow: 0 14px 30px rgba(0, 0, 0, 0.45);
  background-color: var(--cf-cork); background-image: radial-gradient(rgba(0, 0, 0, 0.14) 1px, transparent 1.6px); background-size: 7px 7px; }
.g-case-file .cf-plan > b { align-self: flex-start; font: 400 15px/1 var(--cf-stampf); letter-spacing: 0.14em; color: #fff7e6; background: #1f1b16; padding: 5px 9px 4px; border-radius: 2px; }
.g-case-file .cf-card { position: relative; display: grid; grid-template-columns: 70px 1fr; gap: 8px; align-items: baseline; background: #fffdf5; color: #1f1b16; padding: 9px 10px 8px; border-radius: 2px; font: 400 14px/1.32 var(--cf-type);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35); transform: rotate(var(--r, 0deg)); animation: cf-pinin 0.45s cubic-bezier(.2, 1.5, .4, 1) both; }
.g-case-file .cf-card em { font: 600 12px/1.3 var(--font-ui); font-style: normal; letter-spacing: 0.12em; color: #b8322a; text-transform: uppercase; }
.g-case-file .cf-card .cf-pin { left: 14px; margin-left: 0; }
@keyframes cf-pinin { from { opacity: 0; transform: translateY(-18px) rotate(var(--r, 0deg)) scale(1.06); } to { opacity: 1; transform: rotate(var(--r, 0deg)); } }
@container (min-width: 760px) {
  .g-case-file .cf-rack { gap: 8px; }
  .g-case-file .cf-rack i { width: 30px; height: 18px; }
  .g-case-file .cf-marks span { display: block; left: 24px; }
  .g-case-file .cf-vtext { font-size: 24px; }
  .g-case-file .cf-sus img { --ps: 92px; }
  .g-case-file .cf-plac { font-size: 15px; }
  .g-case-file .cf-trans { font-size: 17px; }
  .g-case-file .cf-caption { font-size: 25px; }
  .g-case-file .cf-vsheet h2 { font-size: 25px; }
  .g-case-file .cf-blank { min-height: 128px; }
}
@container (max-height: 700px) {
  .g-case-file .cf-sus img { --ps: 56px; }
  .g-case-file .cf-blank { min-height: 100px; }
}
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el, UI = ctx.ui;
      const TAU = Math.PI * 2, inten = ctx.intensity;
      const reduced = () => K.reduced();
      let an = ctx.analysis || {};

      /* ---------------- Glitch's voice (every line in all three vibes) ---------------- */
      const V = {
        closed: [
          { Jolly: 'My first guess: {verdict} I’ve learned a guess isn’t a verdict. Shall we look?', Cheeky: 'Old me would’ve stamped this already. {verdict} New me fetches the lamp.', Unfiltered: 'Gut says: {verdict} Gut’s been wrong before. Lamp.' },
          { Jolly: 'Closed in {time}! {verdict} …Should we check? We always find something.', Cheeky: '{verdict} Closed in {time}. Fine. Bring the lamp. I know you will.', Unfiltered: '{verdict} {time}. My gut has a record. Get the lamp.' },
          { Jolly: 'Case closed again! {verdict} Only took {time}. I’m being thorough now.', Cheeky: 'Solved in {time}. {verdict} See? I slowed down. Slightly.', Unfiltered: '{verdict} {time}. Taking my time now. Sort of.' },
          { Jolly: 'Case closed! {verdict} Solved in {time}. A personal best!', Cheeky: 'Elementary. {verdict} Solved in {time}. My coffee’s still hot.', Unfiltered: 'Done. {verdict} {time}. Next case.' }
        ],
        reopen: { Jolly: 'Reopened? Fine! A good detective double-checks. Apparently.', Cheeky: 'Reopening a closed case. Bold. Lights off, then.', Unfiltered: 'Reopened. Kill the lights.' },
        scan: { Jolly: 'Lights out! Sweep the UV lamp over your statement. Ink can bluff. UV can’t.', Cheeky: 'Blinds down. Sweep the lamp. Let’s see what glows. Probably nothing. Probably.', Unfiltered: 'Sweep the lamp over every line. Teal is footage. Pink is your brain.' },
        firstCam: { Jolly: 'Teal! That one’s on record. A camera could have caught it.', Cheeky: 'Teal. On record. Boring. Correct.', Unfiltered: 'Teal: a camera could film that. Fact.' },
        firstBrain: { Jolly: 'Pink?! That glow means your brain wrote it, not a camera.', Cheeky: 'Pink glow. That’s brain ink. Interesting.', Unfiltered: 'Pink. No camera saw that. Your brain added it.' },
        witnessGlow: { Jolly: 'Wait. My star witness is glowing… pink?', Cheeky: 'Hang on. Why is my star witness pink?', Unfiltered: 'My key witness glows pink. Not great.' },
        scanDone: { Jolly: 'Every mark found! Lights up.', Cheeky: 'All lit up. Show-off.', Unfiltered: 'All found. Lights on.' },
        bag: { Jolly: 'Now bag everything pink. Brain stuff is evidence, not the verdict.', Cheeky: 'Bag the pink bits. Evidence, not opinions.', Unfiltered: 'Tap the pink. Bag it.' },
        noPink: { Jolly: 'No pink at all? Everything here is on record. Seal the bag and check the footage.', Cheeky: 'Not one pink mark. Suspiciously factual. Seal it.', Unfiltered: 'No pink. All on record. Seal it.' },
        bagged: { Jolly: ['Bagged!', 'Into the bag you go.', 'Lovely. Evidence, not verdict.'], Cheeky: ['Bagged. Next.', 'Off my desk.', 'Tagged and bagged.'], Unfiltered: ['Bagged.', 'Gone.', 'Next.'] },
        kept: { Jolly: 'Good call. Facts stay on the sheet.', Cheeky: 'Correct. Leave the facts alone.', Unfiltered: 'Right. It stays.' },
        anyway: { Jolly: 'Your case, your call. Bagged.', Cheeky: 'Bagging a fact. Bold. Noted.', Unfiltered: 'Your call. Bagged.' },
        putBack: { Jolly: 'Back on the sheet. You know this case better than me.', Cheeky: 'Fine. It’s a fact. Your call.', Unfiltered: 'Back it goes. Your call.' },
        witness: { Jolly: 'My star witness was… a guess? Oh dear. Oh dear oh dear.', Cheeky: 'Hold on. My key witness was your brain doing an impression of a fact?', Unfiltered: 'My star witness was a guess. I need to sit down.' },
        witnessKept: { Jolly: 'You know this case better than me. We’ll keep it as a fact for now.', Cheeky: 'Noted. Filed as a fact, under mild protest.', Unfiltered: 'Your call. It stays in the facts pile.' },
        sealed: { Jolly: 'Sealed. Now let’s see what the camera actually got.', Cheeky: 'Sealed. Now the footage. Brace for boring.', Unfiltered: 'Sealed. Roll the tape.' },
        cctv: { Jolly: 'Camera: {cam}. Your brain: {brain}. I built a whole movie from a trailer.', Cheeky: '{cam} on tape. {brain} from your brain. Guess which I believed.', Unfiltered: '{cam} on tape. {brain} added on top. Noted.' },
        cctvNone: { Jolly: 'No footage at all? Then all of this came from inside your head. Hm.', Cheeky: 'Blank tape. Everything here is brain. Fascinating.', Unfiltered: 'Nothing on tape. All brain.' },
        unknowns: { Jolly: 'Blank spots! I may have skipped a few steps.', Cheeky: 'Funny. I solved this without asking a single question.', Unfiltered: 'I closed this case with holes in it. Embarrassing.' },
        pick: { Jolly: 'Which blank spot matters most? Circle one.', Cheeky: 'Pick the hole that bothers you most.', Unfiltered: 'Which gap actually matters? Circle it.' },
        picked: { Jolly: 'Good choice. That’s where your next lead points.', Cheeky: 'That one. Noted in red.', Unfiltered: 'Circled. That’s the lead.' },
        lineup: { Jolly: 'Meet the suspects! Every one of them fits the camera facts.', Cheeky: 'Suspects, step forward. Yes, even the scary one.', Unfiltered: 'Lineup. Same facts, different stories. Place your bets.' },
        chips: { Jolly: 'Ten hunch chips. Spread them where the facts point.', Cheeky: 'Ten chips. Bet like a detective.', Unfiltered: 'Ten chips. Place them honestly.' },
        locked: { Jolly: 'Hunches locked. Stamp time.', Cheeky: 'Locked. Let’s see what the file says.', Unfiltered: 'Locked. Verdict.' },
        reopened: { Jolly: 'Case reopened! My reputation is also reopened.', Cheeky: 'Fine. Reopened. Tell no one about the {time}.', Unfiltered: 'Reopened. I’m keeping the hat though.' },
        pending: { Jolly: 'Still open. Good detectives can live with that.', Cheeky: 'Unsolved, for now. Very noir of us.', Unfiltered: 'Open case. That’s honest. Moving on.' },
        thin: { Jolly: 'Your hunch is strong, but the file is thin. Worth checking before you believe it.', Cheeky: 'Big hunch, tiny file. Check it before you sign it.', Unfiltered: 'Betting big on thin evidence. Check first.' },
        partly: { Jolly: 'Part of this worry stands on real facts. Let’s plan for that part.', Cheeky: 'Some of this has legs. Let’s plan for those legs.', Unfiltered: 'Partly real. Plan for the real part.' },
        supported: { Jolly: 'Your brain flagged something real. Let’s get you ready for it.', Cheeky: 'Credit where it’s due. This one deserves a plan, not a pep talk.', Unfiltered: 'This one’s legit. Let’s deal with it properly.' },
        dawn: { Jolly: 'Rain’s stopped. Hat off to you. Let’s let some light in.', Cheeky: 'Hat off. You earned it. Blinds up.', Unfiltered: 'Morning. Hat off. Blinds up.' },
        dawnPlan: { Jolly: 'A real concern deserves a real plan. Here’s ours.', Cheeky: 'No pep talk. A plan. Pinned.', Unfiltered: 'It’s real. Here’s the plan.' },
        newHat: { Jolly: 'Ooh, a new hat! For my next, slower case.', Cheeky: 'New hat. Same Glitch. Slightly wiser.', Unfiltered: 'New hat. Earned it. You did, anyway.' }
      };

      /* ---------------- practice cases (the player came from the library with no words) ---------------- */
      const PRACTICE = [
        { text: 'My boss messaged me at 4:55pm: "Can we have a quick chat tomorrow?" No context. She’s been a bit short with me this week. I’m definitely getting fired.',
          title: 'The Case of the 4:55 Message', conclusion: 'You’re getting fired.', fs: 'weak', reason: 'The message is neutral. Nothing in it points to a firing, and no warnings were mentioned.',
          spans: [['My boss messaged me at 4:55pm', 'camera', 'The time is stamped on the message. Anyone could check it.'], ['"Can we have a quick chat tomorrow?"', 'camera', 'Her exact words, on record.'], ['No context', 'camera', 'Nothing else was written. That part is observable.'],
            ['She’s been a bit short with me this week', 'brain', 'A camera could record brief replies. “Short with me” is a reading of why.'], ['I’m definitely getting fired', 'brain', 'A prediction. No camera can film tomorrow.']],
          witness: 4, unknowns: [['What does she want to talk about?', 1], ['Does she often book chats without saying why?', 2], ['Has her week been busy or stressful?', 3]],
          alts: [['THE CHECK-IN', 'A routine catch-up she didn’t think needed context.', 'She was busy and typed fast at 5 pm.', 'common', 'I’m a calendar invite with no agenda. Boring, but very common.'], ['THE NEW TASK', 'She wants to hand you a project or shift your priorities.', 'Something is changing on the team.', 'common', 'I come with extra work. Not exciting. Not scary either.'],
            ['THE BAD WEEK', 'Her brief replies are about her own pressure; the chat is unrelated.', 'Her week has been heavy.', 'possible', 'Bosses have bad weeks too. I explain the short replies.'], ['THE SACKING', 'She plans to let you go tomorrow.', 'A serious problem raised with no earlier warning.', 'possible', 'I’m the scariest suspect. That’s not the same as the likeliest.', 1]],
          leads: [['ask', 'Reply: “Sure! Anything you’d like me to bring or prepare?”', 0], ['prepare', 'Jot down two recent wins and one thing you’d like help with.', 2], ['steady', 'Close the laptop. The chat is tomorrow; tonight is still yours.', -1]] },
        { text: 'I texted my best friend at lunch asking if she wanted dinner on Friday. It says read at 1:12pm. It’s now 8pm and nothing. She’s clearly annoyed with me about something.',
          title: 'The Case of the Silent Read Receipt', conclusion: 'Your friend is annoyed with you.', fs: 'weak', reason: 'Seven hours of silence after a read receipt fits many ordinary explanations.',
          spans: [['I texted my best friend at lunch asking if she wanted dinner on Friday', 'camera', 'The message exists. Anyone could read it.'], ['It says read at 1:12pm', 'camera', 'The receipt is on screen. It shows she opened it, not what she felt.'], ['It’s now 8pm and nothing', 'camera', 'Silence is observable. Its reason isn’t.'], ['She’s clearly annoyed with me about something', 'brain', 'That’s a story added to the silence. A camera can’t see annoyance.']],
          witness: 3, unknowns: [['What has her day looked like?', 2], ['Does she usually reply quickly?', 1], ['Has anything happened between you lately?', 0]],
          alts: [['THE BUSY DAY', 'She read it between things and meant to answer later.', 'Her afternoon filled up.', 'common', 'I read it in a lift. Then the doors opened.'], ['THE MAYBE', 'She’s checking her Friday plans before saying yes.', 'Friday isn’t settled for her yet.', 'common', 'I’m waiting on someone else’s answer before I give mine.'],
            ['THE MENTAL REPLY', 'She answered in her head and forgot to hit send.', 'She’s human.', 'common', 'I typed the reply. In my imagination.'], ['THE COLD SHOULDER', 'She’s annoyed with you and staying quiet.', 'Something upset her that she hasn’t mentioned.', 'possible', 'I’m possible. I’m also the only suspect who needs a secret grudge.', 1]],
          leads: [['ask', 'Send a light follow-up: “No rush on Friday, just let me know!”', 0], ['prepare', 'Make a Friday backup plan you’d enjoy either way.', 1], ['steady', 'Put your phone in another room for one hour.', -1]] },
        { text: 'In my presentation today I lost my place and said "um" for about ten seconds. Two people looked at their phones. Everyone thinks I’m incompetent now and I’ll never live it down.',
          title: 'The Case of the Ten-Second Pause', conclusion: 'Everyone thinks you’re incompetent.', fs: 'weak', reason: 'A short pause and two phones are normal meeting events. Nothing shows anyone changed their view of you.',
          spans: [['In my presentation today I lost my place', 'camera', 'A video would show the pause. That part happened.'], ['said "um" for about ten seconds', 'camera', 'A camera records the pause, not how long it felt.'], ['Two people looked at their phones', 'camera', 'Observable. Why they looked is a separate question.'], ['Everyone thinks I’m incompetent now', 'brain', 'That’s mind-reading a whole room. A camera only sees faces.'], ['I’ll never live it down', 'brain', 'A prediction about months of other people’s memories.']],
          witness: 3, unknowns: [['What did people actually say afterwards?', 3], ['Why were those two on their phones?', 2], ['How did the rest of the presentation go?', 0]],
          alts: [['THE BLIP', 'People noticed a pause, then got on with their day.', 'People mostly think about themselves.', 'common', 'I lasted ten seconds. People forget me by lunch.'], ['THE PHONE HABIT', 'The two phone-checkers do that in every meeting.', 'Meetings are long and phones are close.', 'common', 'I check my phone at weddings. Don’t take it personally.'],
            ['THE SYMPATHY', 'Some people felt for you. Most have frozen in front of a room.', 'Your colleagues are human.', 'possible', 'I’m the “oof, that’s happened to me” feeling.'], ['THE REPUTATION HIT', 'One pause changed what everyone thinks of your ability.', 'People judging you on ten seconds, ignoring everything else.', 'long shot', 'I’d need everyone to forget everything else you’ve ever done.', 1]],
          leads: [['ask', 'Ask one friendly colleague: “How did that land for you?”', 0], ['prepare', 'Next time, keep three cue words on a card you can glance at.', 2], ['steady', 'Write down one part of the presentation that went fine.', -1]] }
      ];
      function practiceAnalysis(p) {
        const exhibits = p.spans.map((s, i) => ({ id: 'e' + (i + 1), kind: s[1], text: s[0], why: s[2] }));
        const camIds = exhibits.filter(e => e.kind === 'camera').map(e => e.id);
        const unknowns = p.unknowns.map((u, i) => ({ id: 'u' + (i + 1), text: u[0], about: 'e' + (u[1] + 1) }));
        return { safety: 'ok', source: 'practice', case_title: p.title, conclusion: p.conclusion, fear_support: p.fs, support_reason: p.reason,
          spans: p.spans.map((s, i) => ({ quote: s[0], kind: s[1], exhibit: 'e' + (i + 1) })), exhibits, witness_id: 'e' + (p.witness + 1), unknowns,
          alternatives: p.alts.map((x, i) => ({ id: 's' + (i + 1), name: x[0], theory: x[1], needs: x[2], plausibility: x[3], line: x[4], fear: !!x[5], fits: camIds.slice() })),
          leads: p.leads.map(l => ({ kind: l[0], text: l[1], for: l[2] >= 0 ? 'u' + (l[2] + 1) : '' })) };
      }

      /* ---------------- reasons to come back: today's office, Glitch's growth, the hat rack ---------------- */
      const WEATHER = [
        { id: 'downpour', label: 'Downpour', drops: 1.35, wind: 0.24, beads: 1 },
        { id: 'drizzle', label: 'Drizzle', drops: 0.5, wind: 0.08, beads: 1.4 },
        { id: 'fog', label: 'Fog and drizzle', drops: 0.42, wind: 0.05, beads: 0.9, fog: 1 },
        { id: 'thunder', label: 'Distant thunder', drops: 1.1, wind: 0.3, beads: 1, thunder: 1 },
        { id: 'gusts', label: 'Sideways rain', drops: 1, wind: 0.62, beads: 0.8 }
      ];
      const VISITORS = [
        { id: 'ginger', coat: '#d9822b', eye: '#9be564' }, { id: 'black', coat: '#121117', eye: '#ffd34d' }, { id: 'tabby', coat: '#7d7f86', eye: '#8fe3b0' },
        { id: 'white', coat: '#ece7df', eye: '#7fc4ff' }, { id: 'calico', coat: '#eadcca', patch: '#d27a32', patch2: '#2a2522', eye: '#ffcf5a' }, { id: 'pigeon', bird: true }
      ];
      const PROPS = ['radio', 'globe', 'duck', 'cactus', 'fish', 'knight'];
      const NIGHT = ['11:58 PM', '12:40 AM', '1:12 AM', '2:47 AM', '3:05 AM', '4:16 AM'], DAYT = ['1:30 PM', '2:15 PM', '3:40 PM', '4:05 PM', '4:55 PM', '5:20 PM'];
      const W8 = K.dailyPick(WEATHER, 1), VIS = K.dailyPick(VISITORS, 2), PROP = K.dailyPick(PROPS, 3);
      const clock = () => K.dailyPick(K.dark() ? NIGHT : DAYT, 4);
      const visits = K.visits();
      const smug = visits === 0 ? 3 : visits < 3 ? 2 : visits < 6 ? 1 : 0;
      const solveTime = ['4 whole seconds', '1.2 seconds', '0.5 seconds', '0.3 seconds'][smug];
      const glSure = [100, 100, 99, 97, 94, 91, 88, 85][Math.min(7, visits)];
      const HATS = [{ id: 'fedora', name: 'Fedora' }, { id: 'deerstalker', name: 'Deerstalker' }, { id: 'bowler', name: 'Bowler' }, { id: 'panama', name: 'Panama' },
        { id: 'beret', name: 'Beret' }, { id: 'newsboy', name: 'Newsboy cap' }, { id: 'porkpie', name: 'Pork pie' }, { id: 'tophat', name: 'Top hat' }];
      const owned = () => ['fedora'].concat(K.collection().filter(x => /^hat:/.test(x)).map(x => x.slice(4)));
      const wornHat = (() => { const o = owned(); return HATS.slice().reverse().find(x => o.includes(x.id)) || HATS[0]; })();
      const caseNo = String(1000 + Math.floor(Math.random() * 8999));

      /* ---------------- drawn art (no image files) ---------------- */
      function hatSVG(id) {
        const P = { fedora: ['#2c2b34', '#8a2433'], deerstalker: ['#8b6a3e', '#5b4426'], bowler: ['#1c1c22', '#4a3a2a'], panama: ['#e3cf9a', '#24201c'], beret: ['#b8383a', '#7e2224'],
          newsboy: ['#6c6e76', '#45474e'], porkpie: ['#5b3b25', '#22160c'], tophat: ['#18181d', '#7e1f2c'] }[id] || ['#2c2b34', '#8a2433'];
        const c = P[0], b = P[1], hl = 'rgba(255,255,255,.2)';
        const parts = {
          fedora: `<ellipse cx="50" cy="47" rx="48" ry="8" fill="${c}"/><path d="M24 46 C23 22 33 9 50 9 C67 9 77 22 76 46 Z" fill="${c}"/><path d="M37 11 Q50 24 63 11" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="3"/><rect x="24" y="35" width="52" height="9" fill="${b}"/>`,
          deerstalker: `<path d="M6 47 Q22 39 34 46 L31 53 Q16 55 6 47Z" fill="${b}"/><path d="M94 47 Q78 39 66 46 L69 53 Q84 55 94 47Z" fill="${b}"/><path d="M20 47 C20 13 80 13 80 47 Z" fill="${c}"/><path d="M35 18 V46 M50 14 V47 M65 18 V46 M22 34 H78 M24 25 H76" stroke="${b}" stroke-width="1.6" opacity=".7"/><circle cx="50" cy="14" r="4" fill="${b}"/>`,
          bowler: `<path d="M12 46 Q50 38 88 46 Q88 53 50 51 Q12 53 12 46Z" fill="${c}"/><path d="M26 45 C24 11 76 11 74 45 Z" fill="${c}"/><rect x="26" y="36" width="48" height="7" fill="${b}"/>`,
          panama: `<ellipse cx="50" cy="47" rx="48" ry="8" fill="${c}"/><path d="M24 46 C23 22 33 9 50 9 C67 9 77 22 76 46 Z" fill="${c}"/><path d="M37 11 Q50 24 63 11" fill="none" stroke="rgba(0,0,0,.2)" stroke-width="3"/><rect x="24" y="35" width="52" height="9" fill="${b}"/><path d="M28 20 H72 M26 28 H74" stroke="rgba(120,90,40,.35)" stroke-width="1.4"/>`,
          beret: `<rect x="46" y="12" width="7" height="9" rx="2" fill="${b}"/><ellipse cx="50" cy="35" rx="46" ry="15" transform="rotate(-6 50 35)" fill="${c}"/><path d="M16 44 Q50 54 84 42" fill="none" stroke="${b}" stroke-width="5" stroke-linecap="round"/>`,
          newsboy: `<path d="M50 44 Q80 40 97 50 Q74 55 48 51Z" fill="${b}"/><ellipse cx="45" cy="34" rx="40" ry="17" fill="${c}"/><circle cx="45" cy="18" r="4" fill="${b}"/><path d="M45 18 L22 40 M45 18 L68 40" stroke="${b}" stroke-width="1.5" opacity=".6"/>`,
          porkpie: `<ellipse cx="50" cy="46" rx="42" ry="7" fill="${c}"/><path d="M27 45 L29 24 Q50 18 71 24 L73 45 Z" fill="${c}"/><path d="M30 25 Q50 30 70 25" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="2.5"/><rect x="27" y="37" width="46" height="7" fill="${b}"/>`,
          tophat: `<ellipse cx="50" cy="47" rx="44" ry="7" fill="${c}"/><path d="M30 46 L32 4 Q50 0 68 4 L70 46 Z" fill="${c}"/><rect x="31" y="34" width="38" height="8" fill="${b}"/>`
        };
        return `<svg viewBox="0 0 100 56" aria-hidden="true">${parts[id] || parts.fedora}<path d="M30 20 C34 15 40 13 46 13" fill="none" stroke="${hl}" stroke-width="3" stroke-linecap="round"/></svg>`;
      }
      function visitorSVG(v) {
        if (v.bird) return '<svg viewBox="0 0 60 56" aria-hidden="true"><path d="M14 40 q-9 4 -11 10 q11 -2 15 -6z" fill="#5c626d"/><ellipse cx="30" cy="42" rx="17" ry="11" fill="#6f7682"/><circle cx="42" cy="28" r="8" fill="#7d8592"/><path d="M49 27 l7 2.5 -7 2.5z" fill="#d9a441"/><circle cx="44.5" cy="26" r="1.7" fill="#ffb23f"/><path d="M36 33 q4 6 0 12" stroke="#4fa58e" stroke-width="3" fill="none" opacity=".75"/><path d="M26 52 v4 M34 52 v4" stroke="#d98a5a" stroke-width="2"/></svg>';
        const c = v.coat;
        return `<svg viewBox="0 0 60 56" aria-hidden="true"><path class="cf-tail" d="M44 50 C56 48 60 38 54 30" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"/><path d="M15 55 C11 42 13 31 21 27 C19 19 20 13 23 8 L27 15 C29 14 32 14 34 15 L38 8 C41 13 42 19 40 27 C48 31 50 43 46 55 Z" fill="${c}"/>` +
          (v.patch ? `<path d="M17 41 C20 35 26 35 28 41 C26 47 20 48 17 41Z" fill="${v.patch}"/><path d="M33 22 C36 19 39 21 39 25 C36 27 34 26 33 22Z" fill="${v.patch2}"/>` : '') +
          `<circle cx="26.5" cy="21" r="1.9" fill="${v.eye}"/><circle cx="34.5" cy="21" r="1.9" fill="${v.eye}"/></svg>`;
      }
      const PROP_SVG = {
        radio: '<svg viewBox="0 0 60 60" aria-hidden="true"><path d="M44 18 L54 2" stroke="#8d8d96" stroke-width="2"/><rect x="4" y="18" width="52" height="38" rx="9" fill="#7a4a2a"/><rect x="9" y="24" width="26" height="26" rx="13" fill="#3a2214"/><g fill="#a77048">' + [0, 1, 2].map(r => [0, 1, 2].map(c => `<circle cx="${15 + c * 7}" cy="${30 + r * 7}" r="2"/>`).join('')).join('') + '</g><rect x="39" y="25" width="12" height="9" rx="2" fill="#f3d58c"/><circle cx="45" cy="44" r="5" fill="#d9b06b"/></svg>',
        globe: '<svg viewBox="0 0 60 60" aria-hidden="true"><path d="M12 50 h36 l-4 9 h-28z" fill="#5b3a22"/><circle cx="30" cy="30" r="22" fill="rgba(190,225,255,.35)" stroke="rgba(255,255,255,.6)" stroke-width="1.5"/><path d="M14 40 h32 v6 h-32z" fill="#ffffff"/><rect x="22" y="28" width="6" height="12" fill="#2b3550"/><rect x="30" y="24" width="7" height="16" fill="#3a4466"/><g fill="#fff"><circle cx="20" cy="22" r="1.2"/><circle cx="38" cy="18" r="1.2"/><circle cx="28" cy="15" r="1"/><circle cx="42" cy="30" r="1.1"/></g><path d="M18 18 a16 16 0 0 1 10 -8" stroke="rgba(255,255,255,.75)" stroke-width="2" fill="none"/></svg>',
        duck: '<svg viewBox="0 0 60 60" aria-hidden="true"><ellipse cx="28" cy="44" rx="22" ry="13" fill="#ffd23f"/><path d="M8 40 q-6 -6 0 -10 q4 4 6 8z" fill="#ffc21a"/><circle cx="40" cy="24" r="12" fill="#ffd23f"/><path d="M50 24 q10 0 9 4 q-5 3 -10 1z" fill="#ff8a1f"/><circle cx="43" cy="21" r="2" fill="#1d1d1d"/><path d="M20 40 q8 8 18 0" stroke="#e8b400" stroke-width="2" fill="none"/></svg>',
        cactus: '<svg viewBox="0 0 60 60" aria-hidden="true"><path d="M16 44 h28 l-3 15 h-22z" fill="#c4683a"/><rect x="14" y="40" width="32" height="6" rx="2" fill="#a9532b"/><rect x="25" y="8" width="10" height="34" rx="5" fill="#4f9a5a"/><path d="M25 28 h-6 q-4 0 -4 -4 v-8" stroke="#4f9a5a" stroke-width="7" stroke-linecap="round" fill="none"/><path d="M35 22 h6 q4 0 4 -4 v-5" stroke="#4f9a5a" stroke-width="7" stroke-linecap="round" fill="none"/><circle cx="30" cy="8" r="3" fill="#ff7aa8"/></svg>',
        fish: '<svg viewBox="0 0 60 60" aria-hidden="true"><path d="M8 26 a22 22 0 1 0 44 0 z" fill="rgba(140,200,255,.38)"/><circle cx="30" cy="34" r="22" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1.5"/><ellipse cx="30" cy="12" rx="14" ry="3" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="1.5"/><path d="M24 36 q8 -8 14 0 q-6 8 -14 0z" fill="#ff8a2a"/><path d="M38 36 l6 -5 v10z" fill="#ff8a2a"/><circle cx="27" cy="35" r="1.3" fill="#1d1d1d"/><path d="M14 50 q16 6 32 0" stroke="#5aa36a" stroke-width="3" fill="none"/></svg>',
        knight: '<svg viewBox="0 0 60 60" aria-hidden="true"><path d="M16 58 h28 v-6 h-28z" fill="#e9e1d1"/><path d="M19 52 c0 -10 4 -14 4 -20 c-6 2 -10 0 -10 -4 c6 -6 10 -16 20 -20 c10 2 14 12 13 24 c-1 8 -3 12 -3 20z" fill="#e9e1d1"/><circle cx="31" cy="18" r="1.8" fill="#3a3530"/><path d="M33 8 l4 -6 l2 7" fill="#e9e1d1"/></svg>'
      };
      const MUG = '<i class="cf-wisp"></i><i class="cf-wisp w2"></i><svg viewBox="0 0 50 56" aria-hidden="true"><path d="M40 27 Q50 27 50 35 Q50 43 40 43" fill="none" stroke="#e9e4da" stroke-width="4"/><path d="M8 21 H40 V47 Q40 55 32 55 H16 Q8 55 8 47 Z" fill="#e9e4da"/><ellipse cx="24" cy="21" rx="16" ry="3.5" fill="#4a2c17"/><path d="M13 32 H35" stroke="#c8342b" stroke-width="3"/></svg>';
      const TORCH = '<svg viewBox="0 0 30 92" aria-hidden="true"><defs><linearGradient id="cfTorchG" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#121217"/><stop offset=".45" stop-color="#4d4d5a"/><stop offset="1" stop-color="#0f0f13"/></linearGradient></defs><path d="M2 3 H28 L24 24 H6 Z" fill="url(#cfTorchG)"/><rect x="1" y="0" width="28" height="5" rx="2" fill="#2d2d36"/><ellipse cx="15" cy="2.6" rx="11.5" ry="2.3" fill="#c7a6ff"/><rect x="7" y="23" width="16" height="66" rx="5" fill="url(#cfTorchG)"/><path d="M8 42 H22 M8 48 H22 M8 54 H22 M8 60 H22 M8 66 H22 M8 72 H22" stroke="rgba(255,255,255,.13)" stroke-width="1.6"/><rect x="11" y="28" width="8" height="8" rx="2" fill="#8b5cff"/></svg>';
      const PRINT = '<svg viewBox="0 0 60 70" aria-hidden="true"><g fill="none" stroke="rgba(170,255,210,.45)" stroke-width="1.6">' + [6, 10, 14, 18, 22, 26].map(r => `<ellipse cx="30" cy="36" rx="${(r * 0.8).toFixed(1)}" ry="${r}" stroke-dasharray="${(r * 1.6).toFixed(1)} 3"/>`).join('') + '</g></svg>';
      const RING = '<svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,226,150,.32)" stroke-width="7" stroke-dasharray="150 12 30 9"/></svg>';
      const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4 L20 12 L6 20 Z"/></svg>';
      const SCENE = '<svg class="cf-scene" viewBox="0 0 320 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="320" height="220" fill="#0b201b"/><path d="M0 0H320V130H0Z" fill="#0f3028"/><path d="M0 130H320V220H0Z" fill="#09201a"/><g stroke="#143a30" stroke-width="1">' +
        [-140, -60, 20, 100, 180, 260, 340, 420].map(x => '<path d="M160 74 L' + x + ' 220"/>').join('') + '<path d="M0 150H320M0 176H320M0 204H320"/></g>' +
        '<rect x="198" y="20" width="92" height="72" fill="#1b4c40"/><g stroke="#0c2721" stroke-width="3">' + [26, 32, 38, 44, 50, 56].map(y => '<path d="M198 ' + y + 'H290"/>').join('') + '</g><rect x="198" y="20" width="92" height="72" fill="none" stroke="#0a1f1a" stroke-width="4"/><path d="M244 20V92" stroke="#0a1f1a" stroke-width="3"/>' +
        '<rect x="22" y="38" width="46" height="92" fill="#0e2b24" stroke="#1c4d40" stroke-width="2"/><circle cx="60" cy="88" r="2.6" fill="#2f7f6a"/>' +
        '<path d="M100 108 L74 136 L134 136 Z" fill="rgba(150,255,215,0.08)"/><path d="M86 134L234 134L252 158L68 158Z" fill="#1d5243"/><rect x="76" y="158" width="8" height="42" fill="#153d33"/><rect x="238" y="158" width="8" height="42" fill="#153d33"/>' +
        '<path d="M106 134v-20l-9-9" stroke="#2b705d" stroke-width="3" fill="none"/><path d="M88 103l17-7 4 11z" fill="#33806b"/><rect x="150" y="126" width="42" height="8" fill="#2f7a66" transform="rotate(-4 171 130)"/><rect x="212" y="120" width="11" height="14" rx="2" fill="#2a6d5c"/>' +
        '<rect x="148" y="142" width="36" height="22" rx="5" fill="#174539"/><path d="M150 164h32v30h-32z" fill="#11352c"/></svg>';
      const RINGPATH = '<svg viewBox="0 0 200 140" preserveAspectRatio="none" aria-hidden="true"><path d="M104 8 C172 6 197 40 192 74 C188 112 140 134 96 132 C44 130 8 108 8 70 C8 34 46 10 112 13"/></svg>';

      /* ---------------- the player's words -> UV marks (exact substrings, never invented) ---------------- */
      const BRAINY = /\b(think|thinks|thought|feel|feels|felt|seems?|seemed|must|probably|definitely|obviously|clearly|surely|going to|gonna|will|won'?t|means?|meant|hates?|angry|annoyed|upset|mad|bored|rude|disappointed|useless|stupid|incompetent|everyone|everybody|nobody|always|never|fired|sacked|ruined|over|dumped|leaving|judg\w*|laughing at|on purpose|doesn'?t care|losing interest|cheating|lying|furious|fail\w*|disaster|worst|failure|idiot|loser|fraud|worthless|pathetic|awful|terrible|should|shouldn'?t)\b|\w+['’]ll\b/i;
      const STOP = new Set('a an the to of and or but is was were be been am are it its at in on with for that this so as by from i me my you your he him his she her they them their we our just really very about not no'.split(' '));
      const toks = (s) => String(s || '').toLowerCase().replace(/’/g, "'").split(/[^a-z0-9':]+/).map(w => w.replace(/^'+|'+$/g, '')).filter(w => w && !STOP.has(w));
      const overlap = (a, b) => { const x = new Set(toks(a)), y = new Set(toks(b)); if (!x.size || !y.size) return 0; let n = 0; x.forEach(w => { if (y.has(w)) n++; }); return n / Math.min(x.size, y.size); };
      const wordsIn = (s) => String(s || '').split(/\s+/).filter(w => /[A-Za-z0-9]/.test(w)).length;
      const short = (s, n) => K.words(String(s || '').replace(/^["“”'’\s]+|["“”'’\s.,;:!?]+$/g, ''), n);
      const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
      function tidy(q) {
        q = String(q || '').trim();
        const open = /^["“]/.test(q), close = /["”]$/.test(q);
        if (open && !close) q = q.slice(1);
        if (close && !open && !/["“]/.test(q.slice(0, -1))) q = q.slice(0, -1);
        q = q.replace(/^[\s.,;:!?…–—-]+/, '').replace(/[\s,;:–—-]+$/, '').trim();
        return wordsIn(q) ? q : '';
      }
      function marksFrom(text, a, local) {
        const low = text.toLowerCase(), ex = a.exhibits || [], marks = [];
        (a.spans || []).slice(0, 12).forEach(sp0 => {
          let sp = sp0;
          const q = tidy(sp && sp.quote);
          if (!q) return;
          let at = -1, from = 0;
          for (;;) { at = low.indexOf(q.toLowerCase(), from); if (at < 0) break; const end = at + q.length; if (!marks.some(m => at < m.end && end > m.at)) break; from = at + 1; }
          if (at < 0) return;
          let kind = sp.kind === 'camera' ? 'camera' : 'brain';
          let exh = sp.exhibit ? ex.find(e => e.id === sp.exhibit) : null;
          if (!exh) { let best = 0.34; ex.forEach(e => { const o = overlap(q, e.text) + (e.kind === kind ? 0.06 : 0); if (o > best) { best = o; exh = e; } }); }
          let why = exh && exh.kind === kind ? exh.why : '';
          if (local) {
            const quoted = /["“”]/.test(q);
            if (kind === 'camera' && BRAINY.test(q) && !quoted) { kind = 'brain'; why = ''; }
            else if (kind === 'brain' && !BRAINY.test(q) && /^(no|nothing|not a word|silence)\b/i.test(q)) { kind = 'camera'; why = 'An absence is on record too: nothing else was there.'; }
            if (kind !== (sp.kind === 'camera' ? 'camera' : 'brain')) sp = Object.assign({}, sp, { repaired: true });
          }
          if (!why) why = kind === 'camera' ? 'A camera or microphone could have recorded this.' : 'A reading, motive or prediction. A camera records events, not meanings.';
          marks.push({ at, end: at + q.length, q: text.slice(at, at + q.length), kind, why, exId: exh ? exh.id : '', words: wordsIn(q), repaired: !!sp.repaired });
        });
        return marks.sort((x, y) => x.at - y.at);
      }
      const ACTORS = ['patch', 'drop', 'rush', 'still'];
      const FACES = { patch: ['neutral', 'happy'], drop: ['neutral', 'think'], rush: ['neutral', 'happy'], still: ['neutral', 'wink'], sync: ['worried', 'think'] };
      const GENERIC_ALTS = [{ name: 'THE ORDINARY REASON', theory: 'Something everyday explains this, with nothing aimed at you.', needs: 'An ordinary, boring cause.', plausibility: 'common', line: 'I’m boring. Boring things happen a lot.' },
        { name: 'THE THING YOU CAN’T SEE', theory: 'Something on their side that you don’t know about.', needs: 'Information you don’t have yet.', plausibility: 'possible', line: 'I’m invisible from where you’re standing.' }];
      function build() {
        let text = K.clean(ctx.text || '', 900), a = an || {}, practice = false;
        let marks = text ? marksFrom(text, a, a.source !== 'ai') : [];
        if (text && !marks.length && S.analysis && S.analysis.local) { try { const l = S.analysis.local(text); marks = marksFrom(text, l, true); a = Object.assign({}, l, a, { spans: l.spans, exhibits: l.exhibits, witness_id: a.witness_id || l.witness_id }); } catch (e) { marks = []; } }
        if (!marks.length) { const p = K.dailyPick(PRACTICE, 5); text = p.text; a = practiceAnalysis(p); practice = true; marks = marksFrom(text, a, false); }
        marks.forEach((m, i) => Object.assign(m, { i, t: 0, found: false, bagged: false, fact: false, byLamp: false, witness: false }));
        const brains = marks.filter(m => m.kind === 'brain');
        let w = brains.find(m => m.exId && m.exId === a.witness_id) || null;
        if (!w && brains.length) {
          const wex = (a.exhibits || []).find(e => e.id === a.witness_id), target = (wex ? wex.text : '') + ' ' + (a.conclusion || '');
          let best = 0.2; brains.forEach(m => { const o = overlap(m.q, target); if (o > best) { best = o; w = m; } });
          if (!w) w = brains[brains.length - 1];
        }
        if (w) w.witness = true;
        let alts = (a.alternatives || []).filter(x => x && x.name && x.theory).map(x => Object.assign({}, x));
        const fear = alts.find(x => x.fear) || { id: 'sf', name: 'THE FEAR', theory: K.sentence(a.conclusion || 'The scary reading is right'), needs: 'Facts you haven’t got yet.', plausibility: 'possible', fear: true, line: 'I’m the story you came in with. Let’s see how I hold up.', fits: [] };
        let ords = alts.filter(x => !x.fear).slice(0, 3);
        GENERIC_ALTS.forEach((g, i) => { if (ords.length < 2) ords.push(Object.assign({ id: 'sg' + i, fear: false, fits: [] }, g)); });
        alts = ords.concat([fear]);
        alts.forEach((x, i) => { x.id = x.id || 's' + (i + 1); x.actor = x.fear ? 'sync' : ACTORS[i % 4]; x.fits = Array.isArray(x.fits) ? x.fits : []; });
        let unknowns = (a.unknowns || []).filter(u => u && u.text).slice(0, 4);
        if (unknowns.length < 2) unknowns = unknowns.concat([{ id: 'ux1', text: 'What would they say if you asked?', about: '' }, { id: 'ux2', text: 'What else could explain it?', about: '' }]).slice(0, 3);
        let leads = (a.leads || []).filter(l => l && l.text).slice(0, 3);
        if (!leads.length) leads = [{ kind: 'ask', text: 'Ask one simple, low-stakes question to fill the biggest gap.', for: unknowns[0].id }, { kind: 'prepare', text: 'Write down what you’d do if the worst did happen.', for: '' }, { kind: 'steady', text: 'Take a ten-minute walk before deciding anything.', for: '' }];
        const conclusion = K.sentence(String(a.conclusion || (w ? w.q : 'This means the worst')).replace(/[.…]+$/, ''));
        return { text, a, practice, marks, alts, unknowns, leads, conclusion, title: a.case_title || 'The Case of the Closed Conclusion', support: ['weak', 'some', 'strong'].includes(a.fear_support) ? a.fear_support : 'weak',
          reason: a.support_reason || '', care: a.safety === 'care' };
      }
      let D = build();
      const ST = { step: 'intro', ready: false, busy: false, note: false, finished: false, dawn: false, twisted: false, scanDone: false, said: {} };

      /* Ambient loops (rain, steam, CCTV) are compositor animations that all step on one shared 50 ms grid
         (start time 0, every step a whole number of grid steps), so they change on the same frames and the
         compositor repaints at most 20 times a second while the player reads. Paused under reduced motion. */
      const GRID = 50, AMB = [];
      function amb(node, frames, ms, o) {
        if (!node || !node.animate) return null;
        const a = node.animate(frames, Object.assign({ duration: ms, iterations: Infinity, easing: 'steps(' + Math.max(1, Math.round(ms / GRID)) + ', end)' }, o));
        try { a.startTime = 0; } catch (e) { /* unaligned is still fine */ }
        if (reduced()) a.pause();
        AMB.push(a);
        return a;
      }
      S.on('motion', (r) => {
        for (let i = AMB.length - 1; i >= 0; i--) {
          const a = AMB[i], t = a.effect && a.effect.target;
          if (!t || !t.isConnected) { a.cancel(); AMB.splice(i, 1); continue; }
          if (r) a.pause(); else { a.play(); try { a.startTime = 0; } catch (e) { /* ignore */ } }
        }
      });
      const FALL = [{ transform: 'translateY(0)' }, { transform: 'translateY(256px)' }];
      const STEAM = [{ opacity: 0, transform: 'translateY(8px) scaleY(0.6)', easing: 'ease-in-out' }, { opacity: 0.8, offset: 0.4, easing: 'ease-in-out' }, { opacity: 0, transform: 'translateY(-14px) scaleY(1.2) skewX(-12deg)' }];

      /* ---------------- the office: wall, rain window with blinds, desk, lamp ---------------- */
      const applyTheme = () => el.classList.toggle('cf-bright', !K.dark());
      applyTheme();
      const rig = h('div', { class: 'cf-rig' });
      const world = h('div', { class: 'cf-world', 'aria-hidden': 'true' });
      const win = h('div', { class: 'cf-window' });
      const blinds = h('div', { class: 'cf-blinds' }, h('div', { class: 'cf-cord' }));
      const letter = h('div', { class: 'cf-letter' }, h('b', { text: 'Case File' }), h('span', { text: 'Insp. Glitch · Private Eye' }));
      const wflash = h('i', { class: 'cf-wflash' });
      const rainFar = h('i', { class: 'cf-rainl r2' }), rainNear = h('i', { class: 'cf-rainl r1' });
      const rainAn = [amb(rainFar, FALL, 850), amb(rainNear, FALL, 500)];
      win.append(rainFar, rainNear, wflash, letter, h('div', { class: 'cf-sill', html: visitorSVG(VIS) }), h('div', { class: 'cf-mull' }), blinds);
      const mug = h('div', { class: 'cf-mug', html: MUG });
      const steamAn = Array.from(mug.querySelectorAll('.cf-wisp')).map((wp, i) => amb(wp, STEAM, 2800, { delay: -1400 * i, easing: 'steps(28, end)' })); // slow steam: 10 fps on the same grid
      world.append(h('div', { class: 'cf-wall' }), win, h('div', { class: 'cf-desk' }), mug, h('div', { class: 'cf-prop', html: PROP_SVG[PROP] || '' }));
      const beams = h('div', { class: 'cf-beams' }, h('i', { style: { '--bx': '14%', '--ba': '30deg', '--bw': '17%' } }), h('i', { style: { '--bx': '40%', '--ba': '21deg', '--bw': '24%' } }), h('i', { style: { '--bx': '66%', '--ba': '13deg', '--bw': '14%' } }));
      rig.append(world, beams, h('div', { class: 'cf-warm' }), h('div', { class: 'cf-dark' }));
      el.append(rig, h('div', { class: 'cf-scanfx' }));
      const noise = (() => { try { const c = document.createElement('canvas'); c.width = c.height = 96; const g = c.getContext('2d'), im = g.createImageData(96, 96); for (let i = 0; i < im.data.length; i += 4) { const v = (Math.random() * 255) | 0; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = (60 + Math.random() * 150) | 0; } g.putImageData(im, 0, 0); return c.toDataURL(); } catch (e) { return ''; } })();
      if (noise) el.style.setProperty('--noise', 'url(' + noise + ')');

      const rc = K.canvas(win, { before: true, cls: 'cf-raincv', maxDpr: 1.25 });
      /* Particles as small DOM sparks animated on the compositor (WAAPI transform + opacity): a full-screen particle
         canvas would repaint the whole screen every frame of a burst; these only damage their own few pixels. */
      const pfx = h('div', { class: 'cf-pfx', 'aria-hidden': 'true' });
      el.append(pfx);
      const PK = { spark: { size: [3, 6], speed: [90, 240], life: [450, 850], grav: 300, glow: 1 }, star: { size: [7, 11], speed: [60, 190], life: [600, 1000], grav: 60, star: 1 },
        dust: { size: [7, 13], speed: [20, 70], life: [600, 1100], grav: -40, soft: 1 }, mote: { size: [3, 6], speed: [6, 24], life: [2200, 3600], grav: -14, glow: 1 } };
      const rr = (a) => a[0] + Math.random() * (a[1] - a[0]);
      function burst(kind, x, y, n, o) {
        o = o || {};
        const p = PK[kind] || PK.spark, cols = o.colors || (kind === 'dust' ? ['rgba(230,220,200,0.55)'] : ['#fff3c4', '#ffd36b', '#ffae4a']);
        n = Math.round((n || 10) * (reduced() ? 0.35 : 1) * (inten === 0 ? 0.7 : inten === 2 ? 1.3 : 1));
        for (let i = 0; i < n && pfx.childElementCount < 90; i++) {
          const a = o.angle != null ? o.angle + (Math.random() - 0.5) * (o.spread == null ? TAU : o.spread) : Math.random() * TAU;
          const sp = rr(o.speed || p.speed), life = rr(p.life), T = life / 1000, sz = rr(p.size), c = cols[Math.floor(Math.random() * cols.length)];
          const d = h('i', { class: 'cf-pt' + (p.star ? ' is-star' : p.soft ? ' is-soft' : ''), style: { left: (x - sz / 2).toFixed(1) + 'px', top: (y - sz / 2).toFixed(1) + 'px', width: sz.toFixed(1) + 'px', height: sz.toFixed(1) + 'px', '--c': c } });
          pfx.append(d);
          const at = (k) => { const t = k * T, dr = Math.pow(0.9, t * 6); return 'translate(' + (Math.cos(a) * sp * t * dr).toFixed(1) + 'px,' + (Math.sin(a) * sp * t * dr + 0.5 * p.grav * t * t).toFixed(1) + 'px) scale(' + (p.soft ? 1 + k : 1 - 0.7 * k).toFixed(2) + ')'; };
          const an = d.animate([{ transform: at(0), opacity: 1 }, { transform: at(0.35), opacity: 1, offset: 0.35 }, { transform: at(0.7), opacity: 0.7, offset: 0.7 }, { transform: at(1), opacity: 0 }], { duration: reduced() ? life * 0.5 : life, easing: 'linear' });
          an.onfinish = () => d.remove();
        }
      }
      const P = { emit: burst };
      const WX = { rain: 1, rainT: 1, dawn: 0, calm: false, bl: 0.34, blT: 0.34, gap: 4, gapT: 4, flash: 0, thunder: 5, sil: null, lastBl: -1, lastGap: -1 };
      let dawnFade = null;
      function mixC(a, b, k) {
        const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16), m = (s) => Math.round(((pa >> s) & 255) + ((((pb >> s) & 255) - ((pa >> s) & 255)) * k));
        return 'rgb(' + m(16) + ',' + m(8) + ',' + m(0) + ')';
      }
      function buildSky() {
        const w = rc.w, H = rc.h;
        if (!w || !H) return;
        const r = K.rng(41 + VIS.id.length * 7), dark = K.dark(), blds = [];
        let x = -8;
        while (x < w + 8) { const bw = 22 + r() * 46; blds.push({ x, w: bw, h: H * (0.2 + r() * 0.4), roof: r() }); x += bw + 2 + r() * 5; }
        const lights = [];
        blds.forEach(b => { for (let wy = H - b.h + 6; wy < H - 4; wy += 9) for (let wx = b.x + 4; wx < b.x + b.w - 5; wx += 7) if (r() < (dark ? 0.3 : 0.1)) lights.push({ x: wx, y: wy, c: r() < 0.82 ? 0 : 1, off: r() }); });
        const mk = (col) => {
          const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w * rc.dpr)); c.height = Math.max(1, Math.ceil(H * rc.dpr));
          const g = c.getContext('2d'); g.setTransform(rc.dpr, 0, 0, rc.dpr, 0, 0); g.fillStyle = col;
          blds.forEach(b => { g.fillRect(b.x, H - b.h, b.w, b.h + 2); if (b.roof < 0.3 && b.w > 34) g.fillRect(b.x + b.w * 0.25, H - b.h - 9, 5, 9); if (b.roof > 0.8) { g.beginPath(); g.moveTo(b.x, H - b.h); g.lineTo(b.x + b.w / 2, H - b.h - 12); g.lineTo(b.x + b.w, H - b.h); g.fill(); } });
          return c;
        };
        const tile = (seed, n, len, alpha) => {
          try {
            const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d'), q = K.rng(seed), sl = W8.wind * 0.5;
            g.strokeStyle = (dark ? 'rgba(175,195,235,' : 'rgba(255,255,255,') + alpha + ')'; g.lineWidth = 1; g.lineCap = 'round'; g.beginPath();
            for (let i = 0; i < n; i++) { const x = q() * 128, y = q() * 256, l = len * (0.6 + q() * 0.8); [0, 256].forEach(oy => [-128, 0, 128].forEach(ox => { g.moveTo(x + ox, y - oy); g.lineTo(x + ox + l * sl, y - oy - l); })); }
            g.stroke();
            return 'url(' + c.toDataURL() + ')';
          } catch (e) { return 'none'; }
        };
        win.style.setProperty('--rainA', tile(7, Math.round(20 * W8.drops) + 4, 18, dark ? 0.42 : 0.6));
        win.style.setProperty('--rainB', tile(9, Math.round(34 * W8.drops) + 6, 10, dark ? 0.26 : 0.4));
        WX.dirty = true;
        if (dawnFade) dawnFade.finish();
        Object.assign(WX, { w, h: H, dark, lights, sil: mk(dark ? 'rgba(6,8,17,0.94)' : 'rgba(78,90,106,0.78)'), silD: mk('rgba(62,42,74,0.9)'),
          bokeh: dark ? Array.from({ length: 16 }, () => ({ x: r() * w, y: H * (0.35 + r() * 0.6), r: 6 + r() * 16, c: r() < 0.5 ? '255,180,90' : r() < 0.5 ? '255,95,162' : '63,208,201' })) : [],
          drops: Array.from({ length: Math.round(w * H / 900 * W8.drops) }, () => ({ x: r() * w, y: r() * H, l: 8 + r() * 14, v: 380 + r() * 260 })),
          beads: Array.from({ length: Math.round(w * H / 5200 * (W8.beads || 1)) }, () => ({ x: r() * w, y: r() * H, r: 1.2 + r() * 2.6, v: r() < 0.3 ? 8 + r() * 30 : 0 })),
          clouds: Array.from({ length: 4 }, () => ({ x: r() * w, y: H * (0.06 + r() * 0.26), s: 50 + r() * 70, v: 3 + r() * 6 })) });
      }
      rc.onResize(buildSky);
      /* Sunrise: the dawn picture is painted once on a second canvas and faded in on the shared grid, instead of
         repainting the sky every few frames for the whole finale. */
      function skyDawn(ms) {
        const fin = () => { dawnFade = null; WX.dawn = 1; drawWindow(); if (cv) cv.remove(); };
        let cv = null;
        if (dawnFade || WX.dawn >= 1) return;
        cv = rc.g && WX.sil ? h('canvas', { class: 'gk-canvas cf-dawncv', 'aria-hidden': 'true' }) : null;
        const g2 = cv && cv.getContext('2d');
        if (!g2 || reduced() || !cv.animate) { cv = null; fin(); return; }
        cv.width = rc.el.width; cv.height = rc.el.height; cv.style.opacity = '0';
        g2.setTransform(rc.dpr, 0, 0, rc.dpr, 0, 0);
        drawWindow(g2, 1);
        rc.el.after(cv);
        dawnFade = cv.animate([{ opacity: 0, easing: 'cubic-bezier(0.3, 0.1, 0.3, 1)' }, { opacity: 1 }], { duration: ms, easing: 'steps(' + Math.round(ms / GRID) + ', end)', fill: 'forwards' });
        try { const t = document.timeline.currentTime; if (t != null) dawnFade.startTime = Math.ceil(t / GRID) * GRID; } catch (e) { /* unaligned is fine */ }
        dawnFade.onfinish = fin;
        S.onDestroy(() => { if (dawnFade) { dawnFade.onfinish = null; dawnFade.cancel(); } });
      }
      function drawWindow(g, dd) {
        g = g || rc.g;
        if (!g || !WX.sil) return;
        const w = WX.w, H = WX.h, d = dd != null ? dd : WX.dawn, dk = WX.dark, calm = WX.calm;
        g.setTransform(rc.dpr, 0, 0, rc.dpr, 0, 0);
        const sk = g.createLinearGradient(0, 0, 0, H);
        sk.addColorStop(0, mixC(dk ? '#0a1123' : '#97abbf', calm ? '#7d89a6' : '#3d4f9c', d));
        sk.addColorStop(0.62, mixC(dk ? '#141d38' : '#b9c6d3', calm ? '#cbb79f' : '#ec8c68', d));
        sk.addColorStop(1, mixC(dk ? '#1c2646' : '#d3dbe4', calm ? '#eedbb6' : '#ffd88c', d));
        g.fillStyle = sk; g.fillRect(0, 0, w, H);
        if (d > 0.15) {
          const k = K.ease.outCubic(K.clamp((d - 0.15) / 0.85, 0, 1)), sx = w * 0.7, sy = H * (1.08 - (calm ? 0.36 : 0.5) * k), sr = Math.min(w, H) * 0.11;
          const sg = g.createRadialGradient(sx, sy, 0, sx, sy, sr * 5);
          sg.addColorStop(0, 'rgba(255,238,196,' + ((calm ? 0.55 : 0.9) * k).toFixed(3) + ')'); sg.addColorStop(0.3, 'rgba(255,196,120,' + ((calm ? 0.25 : 0.45) * k).toFixed(3) + ')'); sg.addColorStop(1, 'rgba(255,170,100,0)');
          g.fillStyle = sg; g.fillRect(0, 0, w, H);
          g.fillStyle = 'rgba(255,248,226,' + ((calm ? 0.55 : 0.96) * k).toFixed(3) + ')'; g.beginPath(); g.arc(sx, sy, sr, 0, TAU); g.fill();
        }
        WX.clouds.forEach(c => { g.fillStyle = d > 0.5 ? 'rgba(255,214,190,' + (0.1 + 0.12 * d).toFixed(3) + ')' : (dk ? 'rgba(40,50,80,0.35)' : 'rgba(240,244,248,0.35)'); g.beginPath(); g.ellipse(c.x, c.y, c.s, c.s * 0.28, 0, 0, TAU); g.fill(); });
        if (WX.bokeh.length && d < 0.9) WX.bokeh.forEach(b => { const gg = g.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r); gg.addColorStop(0, 'rgba(' + b.c + ',' + (0.32 * (1 - d)).toFixed(3) + ')'); gg.addColorStop(1, 'rgba(' + b.c + ',0)'); g.fillStyle = gg; g.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2); });
        if (d < 0.99) { g.globalAlpha = 1 - d; g.drawImage(WX.sil, 0, 0, w, H); }
        if (d > 0.01) { g.globalAlpha = d; g.drawImage(WX.silD, 0, 0, w, H); }
        g.globalAlpha = 1;
        const lc = dk ? 'rgba(255,196,110,0.8)' : 'rgba(236,241,246,0.6)';
        WX.lights.forEach(L1 => { if (L1.off < d * 1.2) return; g.fillStyle = L1.c ? 'rgba(150,220,255,0.65)' : lc; g.fillRect(L1.x, L1.y, 3, 4); });
        if (W8.fog) { const fg = g.createLinearGradient(0, H * 0.35, 0, H); fg.addColorStop(0, 'rgba(200,210,225,0)'); fg.addColorStop(1, 'rgba(200,210,225,' + (0.38 * (1 - d)).toFixed(3) + ')'); g.fillStyle = fg; g.fillRect(0, 0, w, H); }
        const bk = Math.min(1, WX.rainT * 1.3 + 0.2 * (1 - d));
        if (bk > 0.03) for (const b of WX.beads) {
          g.fillStyle = dk ? 'rgba(200,220,255,' + (0.18 * bk).toFixed(3) + ')' : 'rgba(255,255,255,' + (0.35 * bk).toFixed(3) + ')'; g.beginPath(); g.arc(b.x, b.y, b.r, 0, TAU); g.fill();
          g.fillStyle = 'rgba(255,255,255,' + ((dk ? 0.4 : 0.8) * bk).toFixed(3) + ')'; g.beginPath(); g.arc(b.x - b.r * 0.3, b.y - b.r * 0.35, b.r * 0.35, 0, TAU); g.fill();
        }
        // the glass sheen is painted here rather than as one more window-sized layer over the rain
        const gx = 0.9063, gy = 0.4226, gl0 = (w * gx + H * gy) / 2, sh = g.createLinearGradient(w / 2 - gx * gl0, H / 2 - gy * gl0, w / 2 + gx * gl0, H / 2 + gy * gl0);
        sh.addColorStop(0, 'rgba(255,255,255,0.08)'); sh.addColorStop(0.36, 'rgba(255,255,255,0)'); sh.addColorStop(0.64, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(255,255,255,0.05)');
        g.fillStyle = sh; g.fillRect(0, 0, w, H);
      }

      /* ---------------- noir jazz (v1's walking-bass scheduler, with layers per room and a dawn mode) ---------------- */
      const MU = { on: false, next: 0, beat: 0, bpm: 76, mode: 'noir', L: { bass: true, brush: true, vibes: false, tense: false, uv: false } };
      const BASS = [['D2', 'F2', 'A2', 'C3'], ['G2', 'A#2', 'D3', 'F3'], ['E2', 'G2', 'A2', 'C#3'], ['D2', 'A2', 'F2', 'E2']];
      const VIB = [['F4', 'A4', 'C5', 'E5'], ['F4', 'A#4', 'D5', 'F5'], ['G4', 'A#4', 'C#5', 'E5'], ['F4', 'A4', 'D5', 'E5']];
      const DBASS = ['D2', 'G2', 'B1', 'A1'], DCH = [['D4', 'F#4', 'A4', 'E5'], ['G4', 'B4', 'D5', 'F#5'], ['B3', 'D4', 'F#4', 'A4'], ['A3', 'C#4', 'E4', 'B4']];
      const UVN = ['A5', 'C6', 'A#5', 'C#6'];
      const brushM = (t, v, d) => A.noise({ when: t, filter: 'bandpass', freq: 3800, q: 0.6, dur: d, attack: 0.05, vol: v, bus: 'music' });
      function musicTick() {
        if (!MU.on || !A.ctx) return;
        const ahead = A.now() + 0.2;
        while (MU.next < ahead) {
          const t = MU.next, i = MU.beat, bar = Math.floor(i / 4) % 4, b = i % 4, Lx = MU.L, spb = 60 / MU.bpm;
          if (MU.mode === 'dawn') {
            if (b === 0) { A.pluck(A.note(DBASS[bar]), { when: t, vol: 0.24, damp: 0.995, lp: 600, bus: 'music' }); A.pad(DCH[bar].map(n => A.note(n)), { when: t, dur: spb * 4.3, vol: 0.085, attack: 0.9 }); }
            if (b === 2 || (b === 3 && i % 8 === 7)) A.pluck(A.note(DCH[bar][(i >> 1) % 4]) * 2, { when: t, vol: 0.05, damp: 0.997, verb: 0.5, bus: 'music' });
          } else {
            if (Lx.bass) A.pluck(A.note(BASS[bar][b]), { when: t, vol: 0.4, damp: 0.991, lp: 650, bus: 'music' });
            if (Lx.brush && inten > 0) { if (b === 1 || b === 3) brushM(t, 0.06, 0.16); else brushM(t, 0.026, 0.34); A.noise({ when: t + spb * 0.66, filter: 'highpass', freq: 6500, dur: 0.06, attack: 0.02, vol: 0.016, bus: 'music' }); }
            if (Lx.vibes && (b === 0 || (b === 2 && i % 8 === 2))) VIB[bar].forEach((n, k) => A.tone({ when: t + k * 0.012, type: 'sine', freq: A.note(n), dur: 2.2, vol: 0.032, attack: 0.004, bus: 'music' }));
            if (Lx.tense && b === 0) A.tone({ when: t, type: 'triangle', freq: A.note('D2'), dur: spb * 4, vol: 0.06, attack: 0.4, lp: 400, bus: 'music' });
            if (Lx.uv && b === 0) { const f = A.note(UVN[bar]); A.tone({ when: t, type: 'sine', freq: f, to: f * 1.06, glide: spb * 2, dur: spb * 3.8, vol: 0.016, attack: 0.5, bus: 'music' }); }
          }
          MU.beat++; MU.next += spb;
        }
      }
      function musicStart() { if (!A.ctx || MU.on) return; MU.on = true; MU.next = A.now() + 0.12; MU.beat = 0; A.busLevel('music', [0.34, 0.5, 0.6][inten] || 0.5); }
      const layers = (o) => Object.assign(MU.L, o);
      let rainAmb = null, dawnAmb = null, hum = null;
      function audioUp() { musicStart(); if (!rainAmb && !ST.dawn) { rainAmb = K.ambience('rain'); rainAmb.level(0.3 + 0.3 * Math.min(1.3, W8.drops), 1.2); } }
      if (A.ctx) audioUp();
      S.on('audio-ready', audioUp);
      const PENT = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6'];
      const SND = {
        stamp() { K.sfx.thud(); if (A.ctx) { A.paper({ freq: 1800, vol: 0.16, dur: 0.12 }); A.noise({ filter: 'lowpass', freq: 300, dur: 0.25, vol: 0.18 }); } },
        shutter() { if (!A.ctx) return; const t = A.now(); A.click({ when: t, vol: 0.16 }); A.noise({ when: t + 0.04, filter: 'highpass', freq: 2500, dur: 0.05, vol: 0.1 }); A.click({ when: t + 0.09, vol: 0.1 }); },
        warble(n) { if (!A.ctx) return; const f = A.note(PENT[n % PENT.length]) / 2, t = A.now(); A.tone({ when: t, type: 'sine', freq: f, to: f * 1.5, glide: 0.16, dur: 0.45, vol: 0.06, verb: 0.5 }); A.tone({ when: t + 0.16, type: 'sine', freq: f * 1.5, to: f * 1.33, glide: 0.25, dur: 0.6, vol: 0.05, verb: 0.5 }); },
        zip() { if (A.ctx) A.noise({ filter: 'bandpass', freq: 2400, to: 5200, q: 2, dur: 0.22, attack: 0.02, vol: 0.12 }); },
        crinkle() { if (!A.ctx) return; const t = A.now(); for (let i = 0; i < 4; i++) A.noise({ when: t + i * 0.035 + Math.random() * 0.02, filter: 'highpass', freq: 3000 + Math.random() * 3000, dur: 0.03, vol: 0.06 }); },
        glitch() { K.sfx.glitch(); if (!A.ctx) return; const t = A.now(); A.noise({ when: t, filter: 'bandpass', freq: 1200, q: 0.6, dur: 0.4, vol: 0.12 }); A.tone({ when: t + 0.4, type: 'sawtooth', freq: 220, to: 70, glide: 0.5, dur: 0.6, vol: 0.07, lp: 900 }); },
        twang(n) { if (A.ctx) A.pluck(A.note(['E5', 'G5', 'A5', 'C6'][n % 4]), { vol: 0.12, damp: 0.985, dur: 0.8 }); },
        marker() { if (A.ctx) A.noise({ filter: 'bandpass', freq: 1800, to: 3400, q: 3, dur: 0.5, attack: 0.05, vol: 0.07 }); },
        step() { if (A.ctx) A.tone({ type: 'sine', freq: 90, to: 60, dur: 0.18, vol: 0.22 }); },
        chip() { if (A.ctx) A.wood(undefined, 0.16, 1.7 + Math.random() * 0.2); },
        clunk() { K.sfx.lock(); if (A.ctx) A.thud({ vol: 0.3 }); },
        blinds(up) { if (!A.ctx) return; const t = A.now(); for (let i = 0; i < 10; i++) A.noise({ when: t + i * (up ? 0.07 : 0.045), filter: 'bandpass', freq: 1300 + i * (up ? 70 : -40), q: 2.4, dur: 0.04, vol: 0.05 }); },
        lamp(on) { if (!A.ctx) return; A.click({ vol: 0.14 }); if (on) A.tone({ type: 'sine', freq: 120, dur: 0.25, vol: 0.05 }); },
        sting(minor) { if (!A.ctx) return; const t = A.now(); (minor ? ['D3', 'F3', 'G#3', 'C4'] : ['D3', 'F3', 'A3', 'C4']).forEach((n, i) => A.tone({ when: t + i * 0.02, type: 'triangle', freq: A.note(n), dur: 1.6, vol: 0.06, attack: 0.01, lp: 1800, verb: 0.4, bus: 'music' })); },
        rumble() { if (A.ctx) A.noise({ filter: 'lowpass', freq: 140, dur: 2.4, attack: 0.3, vol: 0.16, bus: 'amb', pink: true }); }
      };

      /* ---------------- layout + Glitch ---------------- */
      let LY = { W: 390, H: 844, wide: false, sz: 84, colL: 12, colW: 366, top: 168 };
      let SH = null, BRD = null;
      const gl = K.character('glitch', { mood: smug >= 2 ? 'smug' : 'coffee', voice: 380, x: 12, y: 72 });
      const hatEl = h('div', { class: 'cf-hat', html: hatSVG(wornHat.id) });
      gl.el.append(hatEl);
      function placeGlitch() {
        const { wide, sz, colL, top } = LY;
        gl.el.style.setProperty('--sz', sz + 'px');
        if (wide) { gl.side('below'); gl.place(Math.max(16, colL - 300), top + 48); }
        else { gl.side('right'); gl.place(12, 72); }
      }
      function layout() {
        const W = el.clientWidth || 390, H = el.clientHeight || 844, wide = W >= 760, sz = wide ? 104 : 84;
        const colW = wide ? Math.min(560, W - 360) : Math.min(520, W - 24);
        const colL = wide ? Math.max(330, Math.round((W - colW) / 2)) : Math.round((W - colW) / 2);
        const top = wide ? 74 : 168;
        const ww = wide ? Math.min(700, W - 80) : W - 24, wx = Math.round((W - ww) / 2), wy = wide ? 70 : 60, wh = Math.round(wide ? Math.min(H * 0.44, 380) : Math.min(H * 0.34, 290));
        const dk = wy + wh + (wide ? 64 : 50), st = el.style;
        [['--W', W], ['--H', H], ['--cf-l', colL], ['--cf-w', colW], ['--cf-t', top], ['--cf-bot', wide ? 128 : 118], ['--wx', wx], ['--wy', wy], ['--ww', ww], ['--wh', wh], ['--dk', dk],
          ['--propx', wide ? Math.max(24, W - colL - colW - 120) : 18], ['--mugx', wide ? Math.max(24, colL - 130) : 18]].forEach(([k, v]) => st.setProperty(k, v + 'px'));
        st.setProperty('--lr', String(wide ? 74 : 62));
        letter.style.top = wide ? '40%' : '42%';
        LY = { W, H, wide, sz, colW, colL, top, wx, wy, ww, wh, dk };
        // K.canvas pins its CSS size in px (TS.fitCanvas), so its own ResizeObserver never sees the parent change: refit by hand
        rc.el.style.width = '100%'; rc.el.style.height = '100%'; rc.fit();
        placeGlitch();
        if (SH) { SH.box = null; fitText(); measure(); }
        if (BRD) drawStrings();
      }
      let lq = 0;
      try { const ro = new ResizeObserver(() => { S.cancel(lq); lq = S.later(layout, 60); }); ro.observe(el); S.onDestroy(() => ro.disconnect()); } catch (e) { S.listen(window, 'resize', () => layout()); }
      S.on('theme', () => { applyTheme(); buildSky(); });
      layout();

      /* ---------------- helpers ---------------- */
      const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (m0, k) => (o && o[k] != null ? o[k] : m0));
      function say(lines, o) {
        o = o || {};
        const raw = Array.isArray(lines) ? K.pick(lines) : ctx.line(lines);
        const line = fill(raw, Object.assign({ verdict: D.conclusion, time: solveTime }, o.vars || {}));
        return gl.say(line, { mood: o.mood, moodMs: o.moodMs, ms: o.ms != null ? o.ms : Math.max(3600, line.length * 66) });
      }
      const once = (key, lines, o) => { if (ST.said[key]) return null; ST.said[key] = true; return say(lines, o); };
      function panel(cls) { const p = h('div', { class: 'cf-panel is-pre ' + cls }); rig.append(p); return p; }
      async function showP(p) { void p.offsetWidth; p.classList.remove('is-pre'); await K.wait(reduced() ? 60 : 480); }
      async function hideP(p) { p.classList.add('is-gone'); await K.wait(reduced() ? 60 : 420); p.remove(); }
      const EXIT = 280; // let the old panel mostly fade before the next one rises
      let setsOn = 0;
      function setOn(cls, kids) { const s = h('div', { class: 'cf-set ' + cls }, kids || null); rig.append(s); void s.offsetWidth; s.classList.add('is-on'); setsOn++; S.later(() => { WX.covered = setsOn > 0; el.classList.toggle('cf-still', WX.covered); }, 650); return s; }
      function setOff(s) { if (!s) return; s.classList.remove('is-on'); setsOn = Math.max(0, setsOn - 1); WX.covered = false; el.classList.remove('cf-still'); S.later(() => s.remove(), 700); }
      const tapOnce = (b) => new Promise(res => { const f = () => { b.removeEventListener('click', f); res(); }; b.addEventListener('click', f); });
      const juice = (b, fn) => { S.listen(b, 'pointerdown', () => { if (!b.disabled) (fn || K.sfx.tap)(); }); return b; };
      function button(label, cls, aria) { return juice(h('button', { type: 'button', class: 'ts-btn ' + (cls || ''), text: label, 'aria-label': aria || null })); }
      async function typeInto(node, text, speed) {
        node.textContent = '';
        if (reduced()) { node.textContent = text; return; }
        const ch = Array.from(text);
        for (let i = 0; i < ch.length; i += 2) { node.textContent = ch.slice(0, i + 2).join(''); if (A.ctx && i % 4 === 0) A.typeKey({ vol: 0.05 }); await K.wait(speed || 24); }
        node.textContent = text;
      }
      function nudge(px) {
        // shake the paper in front, not the whole room: the panel is its own layer, so this costs no repaint
        const tg = rig.querySelector('.cf-panel:not(.is-gone):not(.is-pre)');
        if (reduced() || inten === 0 || !tg || !tg.animate) return;
        const p = px || 5;
        tg.animate([{ transform: 'none' }, { transform: `translate(${-p}px, ${p * 0.6}px)` }, { transform: `translate(${p * 0.8}px, ${-p * 0.4}px)` }, { transform: `translate(${-p * 0.4}px, ${p * 0.2}px)` }, { transform: 'none' }], { duration: 300, easing: 'ease-out', composite: 'add' });
      }
      const rectIn = (node) => K.rectIn(node, el);
      const stampWords = (t) => String(t).split(/\s+/).map(w => h('span', { class: 'cf-sw', text: w }));
      const bump = (node) => { node.classList.remove('cf-bump'); void node.offsetWidth; node.classList.add('cf-bump'); };
      function popAt(x, y, text, kind) { const k = h('div', { class: 'cf-pop ' + kind, text, style: { top: y + 'px' } }); el.append(k); const hw = (k.offsetWidth || 160) / 2 + 10; k.style.left = K.clamp(x, hw, LY.W - hw) + 'px'; S.later(() => k.remove(), 1300); return k; }

      /* ---------------- frame loop ---------------- */
      K.loop((dt) => {
        WX.bl += (WX.blT - WX.bl) * Math.min(1, dt * 2.6); WX.gap += (WX.gapT - WX.gap) * Math.min(1, dt * 4);
        // the blinds slide as one composited layer; the slat gap repaints only when it changes by a whole pixel
        if (Math.abs(WX.bl - WX.lastBl) > 0.0008) { WX.lastBl = WX.bl; blinds.style.transform = 'translateY(' + ((WX.bl - 1) * 100).toFixed(2) + '%)'; }
        const gp = Math.round(WX.gap); if (gp !== WX.lastGap) { WX.lastGap = gp; blinds.style.setProperty('--gap', gp + 'px'); }
        if (W8.thunder && WX.rainT > 0.5 && inten > 0 && !reduced() && !WX.covered) { WX.thunder -= dt; if (WX.thunder < 0) { WX.thunder = 8 + Math.random() * 9; SND.rumble(); wflash.classList.add('is-on'); const fa = wflash.animate([{ opacity: 0 }, { opacity: 1, offset: 0.12 }, { opacity: 0.25, offset: 0.3 }, { opacity: 0.8, offset: 0.4 }, { opacity: 0 }], { duration: 900, easing: 'ease-out' }); fa.onfinish = () => wflash.classList.remove('is-on'); } }
        if (WX.dirty) { WX.dirty = false; drawWindow(); }
        if (SH && SH.live) scanTick(dt);
        musicTick();
      });
      const titleCase = (t) => String(t || '').toLowerCase().replace(/(^|[\s-])\w/g, m => m.toUpperCase());
      const beforeVal = () => (ctx.before == null || isNaN(Number(ctx.before)) ? null : K.clamp(Math.round(Number(ctx.before)), 0, 100));

      /* ================= 1. CASE CLOSED: Glitch stamps your scariest reading ================= */
      async function stepClosed() {
        ST.step = 'closed'; ST.ready = false;
        const before = beforeVal();
        const p = panel('cf-closedp');
        const vtext = h('p', { class: 'cf-vtext' });
        const stamp = h('div', { class: 'cf-stamp' }, stampWords(smug ? 'Case closed' : 'Closed?'), h('i'));
        const you = h('div', { class: 'cf-srow' }, h('span', { text: before == null ? 'You came in unrated' : 'You came in ' + before + '% sure' }), h('b', { text: before == null ? '–' : before + '%' }), h('div', { class: 'cf-strack' }, h('i')));
        const glr = h('div', { class: 'cf-srow is-gl' }, h('span', { text: 'Glitch: ' + glSure + '% sure' }), h('b', { text: glSure + '%' }), h('div', { class: 'cf-strack' }, h('i')));
        const go = button('Reopen the case', 'cf-inkbtn');
        go.hidden = true;
        p.append(h('div', { class: 'cf-folder' },
          h('div', { class: 'cf-tab', text: 'CASE No. ' + caseNo }),
          h('div', { class: 'cf-fhead' }, h('span', { text: D.practice ? 'Practice case' : 'Insp. Glitch' }), h('span', { text: clock() + ' · ' + W8.label })),
          h('div', { class: 'cf-vblock' }, h('span', { class: 'cf-vlabel', text: 'Inspector’s verdict' }), vtext, stamp),
          h('div', { class: 'cf-sure' }, you, glr), go));
        ST.btn = go;
        await showP(p);
        K.sfx.paper();
        await K.wait(150);
        await typeInto(vtext, D.conclusion, 26);
        await K.wait(220);
        stamp.classList.add('is-slam');
        S.later(() => { SND.stamp(); nudge(6); S.buzz(20); gl.react('bounce'); const r = rectIn(stamp); P.emit('spark', r.cx, r.cy, 16, { colors: ['#e0483d', '#ff8a7a', '#7a1a14'], speed: [80, 220] }); P.emit('dust', r.cx, r.cy, 8); }, 200);
        gl.face(smug >= 2 ? 'smug' : 'coffee');
        say(V.closed[smug], { ms: 6000 });
        await K.wait(600);
        you.querySelector('.cf-strack i').style.setProperty('--v', String((before || 0) / 100)); K.sfx.tap();
        await K.wait(700);
        glr.querySelector('.cf-strack i').style.setProperty('--v', String(glSure / 100)); K.sfx.rise();
        S.later(() => glr.classList.add('is-over'), 1100);
        await K.wait(800);
        go.hidden = false; ST.ready = true;
        K.guide({ id: 'reopen', g: 'tap', target: go, label: 'REOPEN THE CASE', delay: 1500 });
        await tapOnce(go);
        K.guide(null); ST.ready = false;
        stamp.classList.add('is-void'); K.sfx.whoosh(); SND.marker();
        gl.face('surprised', 1000); say(V.reopen, { ms: 3000 });
        ctx.track('reopen', { before: before == null ? -1 : before, visits });
        await K.wait(700);
        hideP(p); await K.wait(EXIT);
      }

      /* ================= 2. UV LAMP SCAN: what glows teal was on camera, pink was added ================= */
      const LP = { x: 0, y: 0, tx: 0, ty: 0, held: false, hover: false, key: 0, off: 0, seen: false, tilt: 0, down: null };
      function buildSheet() {
        const p = panel('cf-scanp');
        const count = h('span', { class: 'cf-count', text: 'UV MARKS 0/' + D.marks.length });
        const tb = h('div', { class: 'cf-tb', tabindex: '0', role: 'group', 'aria-label': 'Your statement under the UV lamp. Arrow keys move the lamp. Enter scans the next mark.' });
        const tc = h('div', { class: 'cf-tc' });
        const ink = h('p', { class: 'cf-ink gk-user' }), uv = h('p', { class: 'cf-uv gk-user', 'aria-hidden': 'true' });
        let pos = 0;
        D.marks.forEach(m => {
          if (m.at > pos) { ink.append(D.text.slice(pos, m.at)); uv.append(D.text.slice(pos, m.at)); }
          const cls = 'cf-m ' + (m.kind === 'camera' ? 'cam' : 'brain');
          m.ink = h('span', { class: cls, 'data-i': String(m.i) }, m.q); m.uv = h('span', { class: cls }, m.q);
          ink.append(m.ink); uv.append(m.uv); pos = m.end;
        });
        if (pos < D.text.length) { ink.append(D.text.slice(pos)); uv.append(D.text.slice(pos)); }
        const eggs = [h('i', { class: 'cf-egg', html: PRINT }), h('i', { class: 'cf-egg', html: RING })];
        eggs.forEach(e => uv.append(e));
        const port = h('div', { class: 'cf-port' }, uv, h('i', { class: 'cf-portglow' }));
        tc.append(ink, port); tb.append(tc);
        const sheet = h('div', { class: 'cf-sheet' }, h('div', { class: 'cf-shead' }, h('b', { text: D.practice ? 'PRACTICE STATEMENT' : 'YOUR STATEMENT' }), count), tb,
          h('div', { class: 'cf-sfoot' }, h('span', { text: 'Taken ' + clock() }), h('span', { text: 'Insp. Glitch' })));
        const legendC = h('span', { class: 'c', text: 'ON RECORD 0' }), legendB = h('span', { class: 'b', text: 'BRAIN ADDED 0' });
        const holster = h('div', { class: 'cf-holster', html: TORCH });
        const reveal = juice(h('button', { type: 'button', class: 'cf-revealall', text: 'Reveal all', hidden: true }));
        const tray = h('div', { class: 'cf-tray' }, holster, h('div', { class: 'cf-trayt' }, h('p', { text: 'Sweep the lamp slowly over every line.' }), h('div', { class: 'cf-legend' }, legendC, legendB)), reveal);
        const bottom = h('div', { class: 'cf-bottom' }, tray);
        p.append(sheet, bottom);
        const lamp = h('div', { class: 'cf-lamp', 'aria-hidden': 'true' }, h('i', { class: 'cf-halo' }), h('i', { class: 'cf-cone' }), h('div', { class: 'cf-torch', html: TORCH }));
        el.append(lamp);
        SH = { p, sheet, count, tb, tc, ink, uv, port, eggs, legendC, legendB, holster, reveal, tray, bottom, lamp, box: null, live: false, found: 0, R: 62, frame: 0 };
        return SH;
      }
      function fitText() {
        if (!SH) return;
        const chrome = SH.sheet.offsetHeight - SH.tb.offsetHeight;
        const avail = Math.floor(SH.p.clientHeight - SH.bottom.offsetHeight - 10 - chrome);
        if (avail < 60) return;
        const sizes = LY.wide ? [26, 24, 22, 21, 20, 19, 18, 17, 16, 15] : [24, 23, 22, 21, 20, 19, 18, 17, 16, 15];
        let ok = false;
        for (const fs of sizes) { SH.tc.style.setProperty('--fs', fs + 'px'); SH.tc.style.setProperty('--lh', fs >= 21 ? '1.75' : fs >= 17 ? '1.8' : '1.7'); if (SH.ink.offsetHeight <= avail) { ok = true; break; } }
        if (!ok) SH.tc.style.setProperty('--lh', '1.5');
        const room = Math.min(avail, Math.max(SH.ink.offsetHeight + 10, LY.wide ? 230 : 210));
        SH.tb.style.flex = '0 0 ' + room + 'px';
        const iw = SH.ink.offsetWidth, ih = Math.max(SH.ink.offsetHeight, room);
        SH.uv.style.width = iw + 'px'; SH.uv.style.height = ih + 'px';
        SH.eggs[0].style.cssText = 'left:' + (iw - 74) + 'px;top:' + (ih - 92) + 'px;width:56px;height:66px;';
        SH.eggs[1].style.cssText = 'left:' + (iw - 106) + 'px;top:4px;width:86px;height:86px;';
        SH.R = LY.wide ? 74 : 62;
      }
      function measure() {
        if (!SH) return;
        const sc = K.scaleOf(el) || 1, tr = SH.tc.getBoundingClientRect();
        D.marks.forEach(m => { m.rects = Array.from(m.ink.getClientRects()).map(r => ({ x: (r.left - tr.left) / sc, y: (r.top - tr.top) / sc, w: r.width / sc, h: r.height / sc })); });
        SH.box = rectIn(SH.tb);
      }
      function startHum() { if (!hum && A.ctx) hum = A.loop({ filter: 'bandpass', freq: 1750, q: 7 }); }
      function stopHum() { if (hum) { const x = hum; x.level(0.0001, 0.1); S.later(() => x.stop(), 300); hum = null; } }
      function lampAim(p, off) {
        LP.tx = p.x; LP.ty = p.y + SH.tb.scrollTop + off;
        if (!LP.seen) { LP.x = LP.tx; LP.y = LP.ty; LP.seen = true; SH.holster.classList.add('is-empty'); SND.lamp(true); startHum(); }
      }
      function bindSheet() {
        K.press(SH.tb, {
          down: (p, e) => {
            const touch = !!(e && (e.pointerType === 'touch' || e.pointerType === 'pen'));
            LP.down = { x: p.x, y: p.y };
            if (ST.step === 'scan' && SH && SH.live) { LP.held = true; LP.off = touch ? -60 : 0; lampAim(p, LP.off); }
          },
          move: (p) => { if (ST.step === 'scan' && SH && SH.live && LP.held) lampAim(p, LP.off); },
          up: (p) => {
            LP.held = false;
            const d0 = LP.down; LP.down = null;
            if (ST.step === 'bag' && d0 && Math.hypot(p.x - d0.x, p.y - d0.y) < 16) tapAt(p);
          }
        });
        S.listen(SH.tb, 'pointermove', (e) => { if (e.pointerType === 'mouse' && !e.buttons && ST.step === 'scan' && SH && SH.live) { lampAim(K.local(e, SH.tb), 0); LP.hover = true; } });
        S.listen(SH.tb, 'pointerleave', (e) => { if (e.pointerType === 'mouse') LP.hover = false; });
        S.listen(SH.tb, 'keydown', onSheetKey);
      }
      function scanTick(dt) {
        if (!SH.box || ++SH.frame % 45 === 0) measure();
        const R = SH.R, on = LP.held || LP.hover || LP.key > 0, tb = SH.tb;
        LP.key = Math.max(0, LP.key - dt);
        const k = Math.min(1, dt * 16), px = LP.x;
        LP.x += (LP.tx - LP.x) * k; LP.y += (LP.ty - LP.y) * k;
        const sp = Math.abs(LP.x - px) / Math.max(dt, 0.001);
        LP.tilt += (K.clamp((LP.x - px) * 1.4, -20, 20) - LP.tilt) * Math.min(1, dt * 8);
        const st = tb.scrollTop, vis = LP.y - st;
        if (on && tb.scrollHeight > tb.clientHeight + 2) { if (vis > tb.clientHeight - 28) tb.scrollTop = st + Math.min(8, (vis - tb.clientHeight + 28) * 0.3); else if (vis < 28 && st > 0) tb.scrollTop = st - Math.min(8, (28 - vis) * 0.3); }
        const sx = Math.round(LP.x - R), sy = Math.round(LP.y - R);
        SH.port.style.transform = 'translate(' + sx + 'px,' + sy + 'px)'; SH.uv.style.transform = 'translate(' + (-sx) + 'px,' + (-sy) + 'px)';
        const vis2 = on && LP.seen;
        if (SH.vis !== vis2) { SH.vis = vis2; SH.port.classList.toggle('is-on', vis2); SH.lamp.classList.toggle('is-on', vis2); }
        const bx = SH.box.x + LP.x, by = SH.box.y + LP.y - tb.scrollTop;
        SH.lamp.style.transform = 'translate(' + bx.toFixed(1) + 'px,' + by.toFixed(1) + 'px)';
        SH.lamp.style.setProperty('--tilt', LP.tilt.toFixed(1) + 'deg');
        if (hum) hum.level(on ? 0.012 + Math.min(0.03, sp / 9000) : 0.0001, 0.08);
        if (!vis2) { SH.lastT = 0; return; }
        const now = performance.now(), rdt = Math.min(0.12, Math.max(dt, (now - (SH.lastT || now)) / 1000)); SH.lastT = now;
        D.marks.forEach(m => {
          if (m.found || !m.rects) return;
          const hit = m.rects.some(r => { const cx = K.clamp(LP.x, r.x, r.x + r.w), cy = K.clamp(LP.y, r.y, r.y + r.h); return Math.hypot(LP.x - cx, LP.y - cy) <= R * 0.78; });
          if (hit) { m.t += rdt; if (m.t >= 0.25) reveal(m, true); } else m.t = Math.max(0, m.t - rdt * 0.5);
        });
      }
      function reveal(m, byLamp) {
        if (m.found || !SH) return;
        m.found = true; m.byLamp = !!byLamp;
        m.ink.classList.add('is-found'); m.uv.classList.add('is-found');
        SH.found++;
        const cam = m.kind === 'camera';
        SH.count.textContent = 'UV MARKS ' + SH.found + '/' + D.marks.length; bump(SH.count);
        SH.legendC.textContent = 'ON RECORD ' + D.marks.filter(x => x.found && x.kind === 'camera').length;
        SH.legendB.textContent = 'BRAIN ADDED ' + D.marks.filter(x => x.found && x.kind === 'brain').length;
        if (!SH.box) measure();
        const r0 = (m.rects && m.rects[0]) || { x: 60, y: 30, w: 80, h: 24 };
        const x = SH.box.x + r0.x + Math.min(r0.w, 200) / 2, y = SH.box.y + r0.y - SH.tb.scrollTop;
        popAt(x, Math.max(LY.top + 18, y), cam ? 'ON RECORD' : 'BRAIN ADDED', cam ? 'cam' : 'brain');
        P.emit(cam ? 'spark' : 'star', x, y + r0.h / 2, 14, { colors: cam ? ['#3fd0c9', '#b6fff9', '#ffffff'] : ['#ff5fa2', '#ffc1dc', '#ffffff'], speed: [40, 160] });
        if (cam) { SND.shutter(); K.sfx.good(undefined, 2 + SH.found); } else { SND.warble(SH.found); K.sfx.pop(undefined, 420 + SH.found * 60); }
        if (m.witness && !cam) { gl.face('gasp', 1800); say(V.witnessGlow, { ms: 3400 }); ST.said.firstBrain = true; SH.witAt = performance.now(); }
        else if (cam) { if (!once('firstCam', V.firstCam, { ms: 3000 })) gl.face('think', 700); }
        else if (!once('firstBrain', V.firstBrain, { mood: 'surprised', moodMs: 1400, ms: 3200 })) gl.face('surprised', 700);
        if (SH.found >= D.marks.length) scanDone();
      }
      function lightsOut() {
        el.classList.add('cf-out'); SH.sheet.classList.add('is-dark', 'is-uv');
        WX.blT = 1; WX.gapT = 0; SND.blinds(false); SND.lamp(false);
        layers({ bass: false, brush: false, tense: true, uv: true, vibes: false });
      }
      function lightsOn() {
        el.classList.remove('cf-out'); SH.sheet.classList.remove('is-dark', 'is-uv');
        SH.live = false; SH.lamp.classList.remove('is-on'); SH.port.classList.remove('is-on');
        WX.blT = 0.34; WX.gapT = 4; SND.blinds(true); SND.lamp(true); stopHum();
        layers({ bass: true, brush: true, tense: false, uv: false, vibes: true });
      }
      async function scanDone() {
        if (ST.scanDone) return;
        ST.scanDone = true;
        K.guide(null);
        K.sfx.great();
        if (!SH.witAt || performance.now() - SH.witAt > 2600) say(V.scanDone, { mood: 'wow', moodMs: 1400, ms: 2400 });
        await K.wait(1000);
        lightsOn();
        await K.wait(500);
        if (SH.resolveScan) SH.resolveScan();
      }
      async function revealAll() {
        if (ST.scanDone || !SH) return;
        SH.reveal.hidden = true;
        for (const m of D.marks) { if (!m.found) { reveal(m, false); await K.wait(170); } }
      }
      async function sweepNext() {
        const m = D.marks.find(x => !x.found);
        if (!m || !m.rects || !m.rects.length || SH.sweeping) return;
        SH.sweeping = true;
        if (!LP.seen) lampAim({ x: m.rects[0].x, y: m.rects[0].y - SH.tb.scrollTop }, 0);
        for (const r of m.rects) { const y = r.y + r.h / 2; await K.anim(560, (k) => { LP.tx = r.x + r.w * k; LP.ty = y; LP.key = 0.6; }); }
        SH.sweeping = false;
      }
      function onSheetKey(e) {
        if (!SH) return;
        if (ST.step === 'scan' && SH.live) {
          const s = 26, map = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] };
          if (map[e.key]) {
            e.preventDefault();
            if (!LP.seen) lampAim({ x: SH.tb.clientWidth / 2, y: 30 }, 0);
            LP.tx = K.clamp(LP.tx + map[e.key][0], 0, SH.tc.offsetWidth); LP.ty = K.clamp(LP.ty + map[e.key][1], 0, SH.tc.offsetHeight); LP.key = 1.2;
          } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sweepNext(); }
        } else if (ST.step === 'bag') {
          const i = e.target && e.target.getAttribute ? e.target.getAttribute('data-i') : null;
          if ((e.key === 'Enter' || e.key === ' ') && i != null) { e.preventDefault(); actOn(D.marks[Number(i)]); }
        }
      }
      async function stepScan() {
        ST.step = 'scan'; ST.ready = false;
        buildSheet(); bindSheet();
        fitText();
        const cover = reduced() ? null : h('i', { class: 'cf-cover', 'aria-hidden': 'true' });
        if (cover) SH.tb.append(cover);
        await showP(SH.p);
        measure();
        if (cover) {
          const lines = Math.max(1, Math.round(SH.ink.offsetHeight / 40)), ms = Math.min(1700, 240 * lines);
          const an = cover.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(' + (SH.ink.offsetHeight + 30) + 'px)' }], { duration: ms, easing: 'linear', fill: 'forwards' });
          let n = 0;
          const tick = () => { if (A.ctx) A.typeKey({ vol: 0.05 }); if (++n * 70 < ms) S.later(tick, 70); };
          tick();
          await an.finished.catch(() => {});
          cover.remove();
          if (A.ctx) A.chime(A.note('E6'), { vol: 0.05, dur: 0.6 });
          await K.wait(250);
        }
        lightsOut();
        gl.face('scan'); say(V.scan, { ms: 5200 });
        LP.x = LP.tx = SH.tb.clientWidth * 0.5; LP.y = LP.ty = 40;
        SH.live = true; ST.ready = true;
        K.guide({ id: 'scan', g: 'sweep', target: SH.tb, d: Math.min(110, SH.tb.clientWidth * 0.3), oy: 0.2, label: 'SWEEP THE LAMP', ms: 1700 });
        SH.reveal.addEventListener('click', () => revealAll());
        S.later(() => { if (!ST.scanDone && SH) SH.reveal.hidden = false; }, inten === 0 ? 8000 : 10000);
        await new Promise(res => { SH.resolveScan = res; });
        ctx.track('scan', { marks: D.marks.length, lamp: D.marks.filter(m => m.byLamp).length });
      }

      /* ================= 3. BAG IT: brain additions go in the evidence bag ================= */
      function markPt(m) {
        const r = m.ink.getClientRects()[0];
        if (!r) return null;
        const rr = el.getBoundingClientRect(), sc = K.scaleOf(el) || 1;
        return { x: (r.left - rr.left + Math.min(r.width, 160) / 2) / sc, y: (r.top - rr.top + r.height / 2) / sc };
      }
      function guideBag() {
        if (!SH || ST.sealed) return;
        const m = D.marks.find(x => x.kind === 'brain' && !x.bagged && !x.fact);
        if (m) K.guide({ id: 'bag', g: 'tap', target: () => markPt(m), label: 'TAP TO BAG IT' });
        else if (SH.seal && !SH.seal.hidden) K.guide({ id: 'seal', g: 'tap', target: SH.seal, label: 'SEAL THE BAG' });
      }
      function tapAt(p) {
        if (ST.busy || ST.note || ST.sealed) return;
        measure();
        const cy = p.y + SH.tb.scrollTop;
        let best = null, bd = 1e9;
        D.marks.forEach(m => (m.rects || []).forEach(r => {
          if (p.x >= r.x - 8 && p.x <= r.x + r.w + 8 && cy >= r.y - 11 && cy <= r.y + r.h + 11) { const d = Math.abs(cy - (r.y + r.h / 2)) + Math.abs(p.x - K.clamp(p.x, r.x, r.x + r.w)); if (d < bd) { bd = d; best = m; } }
        }));
        if (best) actOn(best); else K.sfx.soft();
      }
      function actOn(m) {
        if (!m || ST.busy || ST.note || ST.sealed || m.bagged) return;
        if (m.kind === 'brain') bagMark(m, false); else forensics(m);
      }
      function flyFrom(m, cls) {
        measure();
        const r0 = m.rects[0], fly = h('div', { class: 'cf-fly gk-user' + (cls || ''), text: short(m.q, 5) });
        el.append(fly);
        const fw = fly.offsetWidth || 160;
        return { fly, x: K.clamp(SH.box.x + r0.x, 8, LY.W - fw - 8), y: SH.box.y + r0.y - SH.tb.scrollTop };
      }
      async function bagMark(m, anyway) {
        ST.busy = true; K.guide(null);
        K.sfx.pop(); SND.zip();
        const f = flyFrom(m, m.kind === 'camera' ? ' is-cam' : '');
        m.ink.classList.add('is-bagged'); m.ink.classList.remove('is-fact');
        const br = rectIn(SH.bag), fw = f.fly.offsetWidth;
        const tx = br.x + K.clamp(br.w * (0.2 + 0.5 * Math.random()) - fw / 2, 6, Math.max(6, br.w - fw - 6)), ty = br.y + 40;
        P.emit('dust', f.x + 30, f.y + 10, 8);
        await K.anim(reduced() ? 160 : 560, (k) => {
          const e = K.ease.inOutCubic(k), x = f.x + (tx - f.x) * e, y = f.y + (ty - f.y) * e - Math.sin(k * Math.PI) * 80;
          f.fly.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + (-6 + 14 * k).toFixed(1) + 'deg) scale(' + (1 + 0.12 * Math.sin(k * Math.PI) - 0.22 * e).toFixed(3) + ')';
          f.fly.style.opacity = k > 0.88 ? String((1 - k) / 0.12) : '1';
        });
        f.fly.remove();
        m.bagged = true; m.fact = false; m.anyway = !!anyway;
        addSlip(m);
        SH.bag.classList.remove('is-gulp'); void SH.bag.offsetWidth; SH.bag.classList.add('is-gulp');
        SND.crinkle(); K.sfx.thud();
        P.emit('spark', tx + fw / 2, ty, 10, { colors: m.kind === 'brain' ? ['#ff5fa2', '#ffffff'] : ['#3fd0c9', '#ffffff'], speed: [40, 140] });
        updateBag();
        if (m.witness && !ST.twisted) await twist();
        else if (!anyway && Math.random() < 0.55) say(V.bagged, { ms: 1700 });
        ST.busy = false;
        checkBag();
      }
      function addSlip(m) {
        const empty = SH.slips.querySelector('.cf-bagempty'); if (empty) empty.remove();
        const s = juice(h('button', { type: 'button', class: 'cf-slip gk-user', text: short(m.q, 4), 'aria-label': 'Put back as a fact: ' + m.q, style: { '--r': ((m.i % 2 ? 1 : -1) * (1 + (m.i % 3))) + 'deg' } }));
        s.addEventListener('click', () => putBack(m));
        m.slip = s; SH.slips.append(s);
        S.later(() => { try { SH.slips.scrollLeft = SH.slips.scrollWidth; } catch (e) { /* gone */ } }, 40);
      }
      async function putBack(m) {
        if (ST.busy || ST.note || !m.bagged || ST.sealed || !m.slip) return;
        ST.busy = true; K.guide(null);
        const sr = rectIn(m.slip); m.slip.remove(); m.slip = null;
        const f = flyFrom(m, ' is-cam');
        K.sfx.whoosh();
        await K.anim(reduced() ? 160 : 480, (k) => { const e = K.ease.inOutCubic(k), x = sr.x + (f.x - sr.x) * e, y = sr.y + (f.y - sr.y) * e - Math.sin(k * Math.PI) * 70; f.fly.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + (8 - 10 * k).toFixed(1) + 'deg)'; });
        f.fly.remove();
        m.bagged = false; m.fact = true;
        m.ink.classList.remove('is-bagged'); m.ink.classList.add('is-fact');
        K.sfx.ok(); popAt(f.x + 50, Math.max(LY.top + 18, f.y), 'IT’S A FACT', 'fact');
        if (!SH.slips.children.length) SH.slips.append(h('p', { class: 'cf-bagempty', text: 'Bag empty. Tap pink marks to bag them.' }));
        updateBag();
        say(m.witness ? V.witnessKept : V.putBack, { mood: 'think', moodMs: 1400, ms: 2800 });
        ST.busy = false; checkBag();
      }
      function updateBag() { const w = D.marks.filter(m => m.bagged).reduce((n, m) => n + m.words, 0); SH.bcount.textContent = plural(w, 'word'); bump(SH.bcount); }
      function forensics(m) {
        ST.note = true; K.guide(null); K.sfx.paper();
        measure();
        const rl = m.rects[m.rects.length - 1], st = SH.tb.scrollTop;
        const leave = button('Leave it', 'cf-inkbtn'), anyway = button('Bag it anyway', 'ts-btn-quiet');
        const note = h('div', { class: 'cf-note', role: 'dialog', 'aria-label': 'Forensics note' }, h('small', { text: 'Forensics · on record' }), h('p', { text: m.why }),
          h('p', null, h('b', { text: 'This one’s on record.' }), ' Bag it anyway?'), h('div', { class: 'cf-row2' }, leave, anyway));
        el.append(note);
        const nw = note.offsetWidth, nh = note.offsetHeight;
        let y = SH.box.y + rl.y - st + rl.h + 12;
        if (y + nh > LY.H - 16) y = SH.box.y + m.rects[0].y - st - nh - 14;
        const x = K.clamp(SH.box.x + rl.x + rl.w / 2 - nw / 2, LY.colL, LY.colL + LY.colW - nw);
        note.style.left = x + 'px'; note.style.top = Math.max(LY.top, y) + 'px';
        gl.face('nerd', 1800);
        const done = (bagIt) => {
          note.remove(); ST.note = false;
          if (bagIt) { say(V.anyway, { ms: 2200 }); bagMark(m, true); }
          else { K.sfx.soft(); say(V.kept, { ms: 2200 }); m.kept = true; guideBag(); }
        };
        leave.addEventListener('click', () => done(false)); anyway.addEventListener('click', () => done(true));
        S.later(() => { try { leave.focus({ preventScroll: true }); } catch (e) { /* focus optional */ } }, 60);
      }
      function checkBag() {
        if (!SH || ST.sealed) return;
        const pending = D.marks.filter(m => m.kind === 'brain' && !m.bagged && !m.fact);
        if (!pending.length) {
          if (SH.seal.hidden) { SH.seal.hidden = false; SH.blabel.hidden = true; K.sfx.ok(); }
          K.guide({ id: 'seal', g: 'tap', target: SH.seal, label: 'SEAL THE BAG' });
        } else guideBag();
      }
      async function twist() {
        ST.twisted = true;
        ctx.track('witness', { twist: 1 });
        SND.glitch(); S.buzz([30, 40, 30]);
        if (!reduced() && inten > 0) { el.classList.remove('cf-rgb'); void el.offsetWidth; el.classList.add('cf-rgb'); S.later(() => el.classList.remove('cf-rgb'), 950); }
        gl.react('glitch'); gl.face('meltdown');
        const gr = rectIn(gl.el); P.emit('spark', gr.cx, gr.cy, 24, { colors: ['#3fd0c9', '#ff5fa2', '#ffffff'], speed: [80, 260] });
        await say(V.witness, { ms: 4600 });
        await K.wait(800);
        gl.face('dizzy', 1500);
        gl.base('confused');
      }
      async function stepBag() {
        ST.step = 'bag'; ST.ready = false;
        const bcount = h('em', { text: '0 words' }), blabel = h('span', { text: 'Brain added · not on record' });
        const seal = button('Seal the bag', 'cf-inkbtn cf-seal'); seal.hidden = true;
        const slips = h('div', { class: 'cf-slips' }, h('p', { class: 'cf-bagempty', text: 'Tap a pink mark on the sheet to bag it.' }));
        const bag = h('div', { class: 'cf-bag is-pre', role: 'group', 'aria-label': 'Evidence bag for what the brain added' }, h('div', { class: 'cf-baghead' }, h('b', { text: 'EVIDENCE' }), blabel, bcount, seal), slips);
        SH.bottom.append(bag);
        Object.assign(SH, { bag, bcount, blabel, seal, slips });
        SH.tray.classList.add('is-gone');
        void bag.offsetWidth; bag.classList.remove('is-pre');
        S.later(() => { if (SH && SH.tray) SH.tray.remove(); }, 600);
        SH.sheet.classList.add('is-bagging');
        D.marks.forEach(m => { m.ink.setAttribute('tabindex', '0'); m.ink.setAttribute('role', 'button'); m.ink.setAttribute('aria-label', (m.kind === 'brain' ? 'Brain added: ' : 'On record: ') + m.q); });
        say(D.marks.some(m => m.kind === 'brain') ? V.bag : V.noPink, { mood: 'determined', ms: 4200 });
        ST.ready = true; ST.sealBtn = seal;
        checkBag();
        await tapOnce(seal);
        ST.sealed = true; K.guide(null);
        bag.classList.add('is-sealed'); SND.zip(); K.sfx.lock(); nudge(3);
        const w = D.marks.find(x => x.witness);
        if (!ST.twisted && w && !w.bagged) say(V.witnessKept, { mood: 'think', ms: 3000 }); else say(V.sealed, { ms: 3000 });
        D.marks.forEach(m => { m.ink.removeAttribute('tabindex'); m.ink.removeAttribute('role'); });
        ctx.track('bag', { bagged: D.marks.filter(m => m.bagged).length, kept: D.marks.filter(m => m.kind === 'brain' && m.fact).length, anyway: D.marks.filter(m => m.anyway && m.bagged).length });
        await K.wait(1100);
        const old = SH; SH = null;
        hideP(old.p).then(() => old.lamp.remove()); await K.wait(EXIT);
      }
      /* ================= 4. CCTV CUT: only what a camera could have recorded ================= */
      async function stepCCTV() {
        ST.step = 'cctv'; ST.ready = false;
        const set = setOn('cf-set-cctv');
        layers({ vibes: false, tense: true, brush: true, bass: true });
        const p = panel('cf-cctv');
        const tcode = h('span', { text: '00:00:00' });
        const trans = h('div', { class: 'cf-trans', 'aria-live': 'polite' });
        const stat = h('i', { class: 'cf-static' }), idle = h('div', { class: 'cf-idle', text: 'TAPE READY' });
        const scr = h('div', { class: 'cf-scr', html: SCENE }, h('div', { class: 'cf-osd' }, h('span', { class: 'cf-rec', text: '● REC' }), h('span', { text: 'CAM 02' }), tcode), trans, idle, h('i', { class: 'cf-roll' }), h('i', { class: 'cf-scanl' }), stat);
        amb(scr.querySelector('.cf-scene'), [{ transform: 'scale(1.06) translate(-2%, 1%)', easing: 'ease-in-out' }, { transform: 'scale(1.14) translate(2.5%, -1%)' }], 16000, { direction: 'alternate', easing: 'steps(160, end)' });
        amb(scr.querySelector('.cf-rec'), [{ opacity: 1 }, { opacity: 1, offset: 0.5 }, { opacity: 0.25, offset: 0.5 }, { opacity: 0.25 }], 1200, { easing: 'linear' });
        amb(scr.querySelector('.cf-roll'), [{ transform: 'translateY(0)' }, { transform: 'translateY(430%)' }], 3400, { easing: 'steps(34, end)' });
        amb(stat, [{ transform: 'translate(0, 0)' }, { transform: 'translate(-7%, 4%)' }, { transform: 'translate(5%, -6%)' }, { transform: 'translate(-3%, 8%)' }, { transform: 'translate(0, 0)' }], 400, { easing: 'steps(4, end)' });
        const camN = h('b', { text: '0' }), brN = h('b', { text: '0' });
        const play = juice(h('button', { type: 'button', class: 'cf-play', 'aria-label': 'Play the footage', html: PLAY }));
        const deck = h('div', { class: 'cf-deck' }, play, h('span', { class: 'cf-decklbl', text: 'PLAY THE TAPE' }));
        const cap = h('p', { class: 'cf-caption', hidden: true });
        const next = button('To the corkboard', 'cf-next'); next.hidden = true;
        p.append(h('div', { class: 'cf-mon' }, scr), h('div', { class: 'cf-counts' }, h('div', { class: 'cf-cnt cam' }, camN, h('span', { text: 'words the camera recorded' })), h('div', { class: 'cf-cnt brain' }, brN, h('span', { text: 'words your brain added' }))),
          deck, cap, next);
        ST.play = play; ST.next = next;
        await showP(p);
        ST.ready = true;
        K.guide({ id: 'play', g: 'tap', target: play, label: 'PRESS PLAY' });
        await tapOnce(play);
        K.guide(null);
        play.classList.add('is-down'); play.disabled = true; SND.clunk();
        const whirr = A.ctx ? A.loop({ pink: true, filter: 'bandpass', freq: 420, q: 1.2 }) : null;
        if (whirr) whirr.level(0.05, 0.1);
        stat.classList.add('is-on'); idle.remove();
        await K.wait(450);
        stat.classList.remove('is-on');
        const facts = D.marks.filter(m => !m.bagged), bagged = D.marks.filter(m => m.bagged), speed = inten === 0 ? 120 : 72;
        // a recorded line keeps the punctuation right after it ("tomorrow?") and never leaves a quote open
        const camLine = (m) => {
          let t = m.q + ((D.text.slice(m.end).match(/^[?!.,;:…]*["”’]?/) || [''])[0]);
          if ((t.match(/“/g) || []).length > (t.match(/”/g) || []).length) t += '”';
          const sq = t.match(/"/g) || [];
          if (sq.length % 2) t = /"\s*$|^[^"]*[A-Za-z0-9?!.,]"/.test(t) && !/"[A-Za-z0-9]/.test(t) ? '"' + t : t + '"';
          return t;
        };
        let cw = 0, sec = 0;
        for (const m of facts) {
          sec += 3 + (m.i % 3) * 4;
          const ts = '00:00:' + String(Math.min(59, sec)).padStart(2, '0'), ws = h('span', { class: 'gk-user' });
          tcode.textContent = ts;
          trans.append(h('div', { class: 'cf-ln' }, h('i', { text: ts }), ws));
          const words = camLine(m).split(/\s+/);
          for (let k = 0; k < words.length; k++) {
            ws.textContent = words.slice(0, k + 1).join(' ');
            if (/[A-Za-z0-9]/.test(words[k])) { cw++; camN.textContent = String(cw); }
            if (A.ctx) A.typeKey({ vol: 0.045 });
            await K.wait(speed);
          }
          bump(camN);
          await K.wait(150);
        }
        if (!facts.length) trans.append(h('div', { class: 'cf-ln is-nosig', text: 'NO FOOTAGE ON FILE' }));
        if (whirr) { whirr.level(0.0001, 0.2); S.later(() => whirr.stop(), 500); }
        await K.wait(300);
        const bw = bagged.reduce((n, m) => n + m.words, 0);
        if (bagged.length) {
          stat.classList.add('is-on');
          if (A.ctx) A.noise({ filter: 'highpass', freq: 1200, dur: 0.6, vol: 0.08 });
          trans.append(h('div', { class: 'cf-ln is-nosig', text: 'NO SIGNAL · ' + plural(bw, 'word') + ' not on tape' }));
          for (let k = 1; k <= bw; k++) { brN.textContent = String(k); if (k % 2 === 0 && A.ctx) A.click({ vol: 0.04 }); await K.wait(Math.max(18, 380 / bw)); }
          bump(brN);
          await K.wait(250); stat.classList.remove('is-on');
        }
        D.camWords = cw; D.brainWords = bw;
        cap.append('Camera recorded ', h('span', { class: 'c', text: plural(cw, 'word') }), '. Your brain added ', h('span', { class: 'b', text: String(bw) }), '.');
        deck.hidden = true; cap.hidden = false; K.sfx.great(); nudge(3);
        gl.face(cw ? 'gasp' : 'confused', 2000);
        say(cw ? V.cctv : V.cctvNone, { vars: { cam: plural(cw, 'word'), brain: plural(bw, 'word') }, ms: 5200 });
        ctx.track('cctv', { cam: cw, brain: bw });
        next.hidden = false;
        K.guide(Object.assign({ id: 'board', g: 'tap', target: next, label: 'TO THE CORKBOARD' }, LY.wide ? { delay: 1400, place: 'below' } : { delay: 3200 })); // phone: let the tally be read first
        await tapOnce(next);
        K.guide(null);
        hideP(p); S.later(() => setOff(set), 380); await K.wait(EXIT);
      }

      /* ================= 5. CORKBOARD: the blank spots Glitch skipped ================= */
      /* red string: geometry is measured only when the layout changes; a twang just rewrites one path's curve */
      function drawStrings(only) {
        if (!BRD) return;
        if (only == null || !BRD.geo) {
          const wr = BRD.wrap.getBoundingClientRect(), sc = K.scaleOf(el) || 1;
          if (!wr.width) return;
          BRD.svg.setAttribute('viewBox', '0 0 ' + (wr.width / sc).toFixed(0) + ' ' + (wr.height / sc).toFixed(0));
          BRD.geo = BRD.blanks.map((b, i) => {
            const f = BRD.factEls[BRD.links[i]];
            if (!f) return null;
            const fr = f.getBoundingClientRect(), r = b.getBoundingClientRect();
            return { x1: (fr.left + fr.width / 2 - wr.left) / sc, y1: (fr.bottom - wr.top) / sc, x2: (r.left + r.width / 2 - wr.left) / sc, y2: (r.top - wr.top + 1) / sc };
          });
          if (!BRD.paths) {
            const NS = 'http://www.w3.org/2000/svg';
            BRD.paths = BRD.geo.map(() => { const a = document.createElementNS(NS, 'path'), b = document.createElementNS(NS, 'path'); a.setAttribute('class', 'sh'); a.setAttribute('transform', 'translate(1.5 2.5)'); BRD.svg.append(a, b); return [a, b]; });
          }
        }
        BRD.geo.forEach((g, i) => {
          if (only != null && only !== i) return;
          const pr = BRD.paths[i];
          if (!g) { pr[0].removeAttribute('d'); pr[1].removeAttribute('d'); return; }
          const d = 'M' + g.x1.toFixed(1) + ' ' + g.y1.toFixed(1) + ' Q ' + ((g.x1 + g.x2) / 2).toFixed(1) + ' ' + ((g.y1 + g.y2) / 2 + 16 + BRD.wob[i]).toFixed(1) + ' ' + g.x2.toFixed(1) + ' ' + g.y2.toFixed(1);
          pr[0].setAttribute('d', d); pr[1].setAttribute('d', d);
        });
      }
      function guideBoard() {
        if (!BRD) return;
        const nf = BRD.blanks.find((b, i) => !BRD.flipped.has(i));
        if (nf) K.guide({ id: 'flip', g: 'tap', target: nf, label: 'FLIP THE BLANK SPOTS' });
        else if (BRD.picked < 0) K.guide({ id: 'circle', g: 'choose', target: BRD.blanks.slice(), label: 'CIRCLE ONE' });
      }
      function blankTap(i) {
        if (!BRD) return;
        const b = BRD.blanks[i];
        if (!BRD.flipped.has(i)) {
          BRD.flipped.add(i); b.classList.add('is-flip'); b.setAttribute('aria-label', 'Blank spot: ' + D.unknowns[i].text);
          K.sfx.paper(); SND.twang(i); S.later(() => K.sfx.tap(), 260);
          const r = rectIn(b); P.emit('dust', r.cx, r.y + 10, 8);
          if (!reduced()) K.anim(700, (k) => { if (!BRD) return; BRD.wob[i] = 20 * Math.cos(k * 16) * (1 - k); drawStrings(i); });
          if (BRD.flipped.size === D.unknowns.length) {
            ST.allFlipped = true;
            BRD.next.textContent = 'Circle the one that matters most';
            S.later(() => { say(V.pick, { mood: 'idea', ms: 3600 }); guideBoard(); }, 650);
          } else guideBoard();
          return;
        }
        if (BRD.flipped.size < D.unknowns.length) return;
        if (BRD.picked === i) return;
        BRD.picked = i;
        BRD.blanks.forEach((x, k) => { x.classList.toggle('is-pick', k === i); x.classList.toggle('is-dim', k !== i); });
        SND.marker(); K.sfx.good(undefined, 5);
        BRD.next.disabled = false; BRD.next.textContent = 'Bring in the suspects';
        once('picked', V.picked, { ms: 3000 });
        K.guide({ id: 'suspects', g: 'tap', target: BRD.next, label: 'BRING THEM IN', delay: 900 });
      }
      async function stepBoard() {
        ST.step = 'board'; ST.ready = false;
        const set = setOn('cf-set-board');
        layers({ tense: false, vibes: true, brush: false, bass: true });
        const p = panel('cf-boardp');
        const facts = D.marks.filter(m => !m.bagged), chosen = [];
        D.unknowns.forEach(u => { const f = facts.find(m => m.exId && m.exId === u.about); if (f && !chosen.includes(f)) chosen.push(f); });
        facts.forEach(f => { if (!chosen.includes(f)) chosen.push(f); });
        const shown = chosen.slice(0, LY.wide ? 3 : 2);
        const factEls = shown.map((m, i) => h('div', { class: 'cf-fact', style: { '--r': [-1.6, 1.3, -0.7][i] + 'deg', width: shown.length > 2 ? 'calc(33.3% - 7px)' : null } }, h('i', { class: 'cf-pin' }), h('i', { class: 'cf-pin is-low' }), h('small', { text: 'On record' }), h('span', { class: 'gk-user', text: short(m.q, 12) })));
        if (!factEls.length) factEls.push(h('div', { class: 'cf-fact is-none', style: { '--r': '-1deg' } }, h('i', { class: 'cf-pin' }), h('i', { class: 'cf-pin is-low' }), h('small', { text: 'On record' }), 'Nothing yet. All of it was brain.'));
        const n = D.unknowns.length;
        const blanks = D.unknowns.map((u, i) => {
          const b = juice(h('button', { type: 'button', class: 'cf-blank' + (n % 2 && i === n - 1 ? ' is-odd' : ''), 'aria-label': 'Blank spot ' + (i + 1) + '. Tap to flip.', style: { '--r': [1.2, -1.4, 0.8, -0.6][i % 4] + 'deg' } },
            h('span', { class: 'cf-face cf-front', 'aria-hidden': 'true' }, '?'), h('span', { class: 'cf-face cf-back' }, u.text), h('i', { class: 'cf-pin' }), h('span', { class: 'cf-ring', html: RINGPATH })));
          b.addEventListener('click', () => blankTap(i));
          return b;
        });
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'cf-strings'); svg.setAttribute('aria-hidden', 'true');
        const wrap = h('div', { class: 'cf-bwrap' }, svg, h('div', { class: 'cf-facts' }, factEls), h('div', { class: 'cf-blanks' }, blanks));
        const next = button('Flip every card', 'cf-next'); next.disabled = true;
        p.append(h('div', { class: 'cf-bhead' }, h('b', { text: 'BLANK SPOTS' }), h('span', { text: 'what the file doesn’t say' })), wrap, next);
        BRD = { svg, wrap, factEls, blanks, next, flipped: new Set(), picked: -1, wob: D.unknowns.map(() => 0),
          links: D.unknowns.map((u, i) => { const k = shown.findIndex(m => m.exId && m.exId === u.about); return k >= 0 ? k : i % factEls.length; }) };
        factEls.forEach((f, k) => { if (!BRD.links.includes(k)) { const lp = f.querySelector('.cf-pin.is-low'); if (lp) lp.remove(); } }); // no string, no lower pin
        ST.blanks = blanks; ST.next = next; ST.allFlipped = false;
        await showP(p);
        drawStrings();
        gl.face('think'); say(V.unknowns, { ms: 4200 });
        ST.ready = true;
        guideBoard();
        await tapOnce(next);
        K.guide(null);
        D.picked = D.unknowns[BRD.picked] || D.unknowns[0];
        ctx.track('blank', { n, pick: BRD.picked });
        BRD = null; hideP(p); S.later(() => setOff(set), 380); await K.wait(EXIT);
      }

      /* ================= 6. LINEUP: rival explanations, the fear included, and ten hunch chips ================= */
      async function stepLineup() {
        ST.step = 'lineup'; ST.ready = false;
        const marksEl = h('div', { class: 'cf-marks' }, [200, 190, 180, 170, 160].map((cm, i) => h('span', { style: { top: (i * 25 - 1) + '%' }, text: cm + ' cm' })));
        const set = setOn('cf-set-lineup', marksEl);
        layers({ vibes: false, brush: true, tense: true, bass: true });
        const p = panel('cf-lineupp');
        const CH = {};
        D.alts.forEach(a => { CH[a.id] = 0; FACES[a.actor].forEach(md => { const im = new Image(); im.src = K.face(a.actor, md); }); });
        const placed = () => Object.values(CH).reduce((x, y) => x + y, 0);
        const setFace = (x, md) => { if (x.el.md !== md) { x.el.md = md; x.el.img.src = K.face(x.actor, md); } }; // only swap (and decode) faces that change
        let sel = null, lockGuided = false;
        const row = h('div', { class: 'cf-row', role: 'group', 'aria-label': 'Suspects' });
        D.alts.forEach(a => {
          const img = h('img', { alt: '', draggable: 'false', src: K.face(a.actor, FACES[a.actor][0]) });
          const stack = h('span', { class: 'cf-stack', 'aria-hidden': 'true' }), pct = h('span', { class: 'cf-pct', text: '0%' });
          const btn = juice(h('button', { type: 'button', class: 'cf-sus' + (a.fear ? ' is-fear' : ''), 'aria-pressed': 'false', 'aria-label': 'Question ' + a.name }, h('span', { class: 'cf-spot' }), img, h('span', { class: 'cf-plac', text: a.name }), stack, pct), () => SND.step());
          btn.addEventListener('click', () => select(a));
          a.el = { btn, img, stack, pct, md: FACES[a.actor][0] };
          row.append(btn);
        });
        const info = h('div', { class: 'cf-dinfo' });
        const minus = juice(h('button', { type: 'button', 'aria-label': 'Take a hunch chip back', text: '−' }), () => {}), plus = juice(h('button', { type: 'button', 'aria-label': 'Place a hunch chip', text: '+' }), () => {});
        const out = h('output', { text: '' });
        const dos = h('div', { class: 'cf-dos', 'aria-live': 'polite' }, info, h('div', { class: 'cf-ctl' }, minus, out, plus));
        const dots = h('div', { class: 'cf-dots', 'aria-hidden': 'true' }, Array.from({ length: 10 }, () => h('i')));
        const left = h('span', { text: '10 hunch chips to place' });
        const lock = button('Lock in', 'cf-lock'); lock.disabled = true;
        p.append(row, dos, h('div', { class: 'cf-bank' }, h('div', { class: 'cf-bankl' }, dots, left), lock));
        const meter = (pl) => { const n2 = pl === 'common' ? 3 : pl === 'long shot' ? 1 : 2; return h('span', { class: 'cf-plaus', 'aria-hidden': 'true' }, [0, 1, 2].map(i => h('i', { class: i < n2 ? 'on' : '' }))); };
        function renderDos(a) {
          const facts = D.marks.filter(m => !m.bagged).slice(0, 3);
          const li = facts.map(m => {
            const aiCam = m.kind === 'camera', ok = D.a.source !== 'ai' || m.repaired || !a.fits.length || !m.exId || a.fits.includes(m.exId), cls = !aiCam ? 'q' : ok ? 'y' : 'n';
            return h('li', { class: cls }, h('i', { text: !aiCam ? '?' : ok ? '✓' : '✗' }), h('span', { class: 'gk-user', text: short(m.q, 8) + (!aiCam ? ' (your call)' : '') }));
          });
          info.innerHTML = '';
          info.append(h('h3', null, h('span', { text: a.name }), h('small', { text: 'Played by ' + titleCase(a.actor) })),
            h('p', { class: 'cf-theory', text: a.theory }),
            a.line ? h('p', { class: 'cf-quote', text: '“' + String(a.line).replace(/^["“]+|["”]+$/g, '') + '”' }) : null,
            h('span', { class: 'cf-lbl', text: 'Fits the facts on record' }),
            h('ul', { class: 'cf-fits' }, li.length ? li : [h('li', { class: 'q' }, h('i', { text: '?' }), h('span', { text: 'Nothing on record to check against.' }))]),
            a.needs ? h('div', { class: 'cf-meta' }, h('span', null, 'Would need: ', h('b', { text: a.needs }))) : null,
            h('div', { class: 'cf-meta' }, h('span', null, 'Inspector’s estimate: ', h('b', { text: a.plausibility || 'possible' }), meter(a.plausibility)), a.fear ? h('span', { text: 'The one you walked in with' }) : null));
          dos.classList.remove('is-swap'); void dos.offsetWidth; dos.classList.add('is-swap');
        }
        function renderChips() {
          const used = placed();
          Array.from(dots.children).forEach((x, i) => x.classList.toggle('is-used', i < used));
          left.textContent = used === 10 ? 'All 10 chips placed' : plural(10 - used, 'hunch chip') + ' to place';
          D.alts.forEach(a => {
            const n = CH[a.id], st = a.el.stack;
            a.el.pct.textContent = n * 10 + '%';
            while (st.children.length < n) st.append(h('i', { style: { bottom: (st.children.length * 2) + 'px' } }));
            while (st.children.length > n) st.lastChild.remove();
          });
          out.textContent = sel ? plural(CH[sel.id], 'chip') + ' on ' + titleCase(sel.name) : '';
          minus.disabled = !sel || CH[sel.id] <= 0; plus.disabled = used >= 10;
          lock.disabled = used !== 10;
          if (used === 10 && !lockGuided) { lockGuided = true; K.guide({ id: 'lock', g: 'tap', target: lock, label: 'LOCK IN', delay: 500 }); }
          if (used < 10) lockGuided = false;
        }
        function select(a) {
          if (sel === a) return;
          sel = a;
          D.alts.forEach(x => { x.el.btn.setAttribute('aria-pressed', String(x === a)); setFace(x, FACES[x.actor][x === a ? 1 : 0]); });
          renderDos(a); renderChips();
          a.el.btn.classList.remove('is-hop'); void a.el.btn.offsetWidth; a.el.btn.classList.add('is-hop');
        }
        function chip(d) {
          const a = sel;
          if (!a) return;
          if (d > 0 && placed() >= 10) { K.sfx.no(); bump(left); return; }
          if (d < 0 && CH[a.id] <= 0) { K.sfx.no(); return; }
          const idx = d > 0 ? placed() : placed() - 1;
          const dotR = rectIn(dots.children[K.clamp(idx, 0, 9)]), stR = rectIn(a.el.stack);
          CH[a.id] += d;
          SND.chip();
          renderChips();
          a.el.btn.classList.remove('is-hop'); void a.el.btn.offsetWidth; a.el.btn.classList.add('is-hop');
          if (d > 0 && !a.fear && CH[a.id] >= 3) setFace(a, 'happy');
          if (reduced()) return;
          const c = h('i', { class: 'cf-flychip' }); el.append(c);
          const A0 = d > 0 ? dotR : stR, B0 = d > 0 ? stR : dotR;
          K.anim(340, (k) => { const e = K.ease.inOutCubic(k), x = A0.cx + (B0.cx - A0.cx) * e, y = A0.cy + (B0.cy - A0.cy) * e - Math.sin(k * Math.PI) * 60; c.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)'; }).then(() => { c.remove(); if (d > 0) P.emit('spark', B0.cx, B0.cy, 6, { colors: ['#ffd98a', '#ffffff'], speed: [30, 110] }); });
        }
        minus.addEventListener('click', () => chip(-1)); plus.addEventListener('click', () => chip(1));
        ST.sus = D.alts.map(a => a.el.btn); ST.plus = plus; ST.lock = lock;
        await showP(p);
        select(D.alts[0]);
        gl.face('nerd'); say(V.lineup, { ms: 4200 });
        S.later(() => { if (ST.step === 'lineup' && placed() < 10) say(V.chips, { ms: 3400 }); }, 4600);
        ST.ready = true;
        K.guide({ id: 'chips', g: 'tap', target: plus, label: 'PLACE YOUR CHIPS', delay: 1200 });
        await tapOnce(lock);
        K.guide(null);
        const fear = D.alts.find(a => a.fear);
        D.after = (CH[fear.id] || 0) * 10;
        D.chips = Object.assign({}, CH);
        D.top = D.alts.filter(a => !a.fear).sort((x, y) => CH[y.id] - CH[x.id])[0];
        SND.clunk(); SND.sting(true); nudge(4);
        say(V.locked, { ms: 2400 });
        ctx.track('chips', { fear: D.after, before: beforeVal() == null ? -1 : beforeVal() });
        await K.wait(800);
        hideP(p); S.later(() => setOff(set), 380); await K.wait(EXIT);
      }
      /* ================= 7. VERDICT + DAWN: the rain stops, the blinds lift ================= */
      const STAMP = { supported: 'Concern supported', partly: 'Partly supported', reopened: 'Reopened', thin: 'Unproven', pending: 'Pending' };
      const TITLE = { supported: 'Concern supported', partly: 'Partly supported', reopened: 'Case reopened', thin: 'Unproven', pending: 'Case pending' };
      const LEADK = { ask: 'Find out', prepare: 'Prepare', steady: 'Steady' };
      function sayText(type) {
        if (type === 'reopened') return 'More than one explanation fits the facts.' + (D.top && D.chips[D.top.id] ? ' “' + titleCase(D.top.name) + '” got the most of your chips.' : '');
        if (type === 'pending') return 'Your fear is one live possibility among others. The facts on record don’t settle it yet.';
        if (type === 'thin') return 'Your hunch is strong, but nothing on record points to it more than the others. Worth checking before you believe it.';
        const rs = K.sentence(D.reason || 'The facts give this worry a real basis');
        return /plan/i.test(rs) ? rs + ' A plan, not a pep talk.' : rs + ' It deserves a plan, not a pep talk.';
      }
      function rackRow(newHat) {
        const have = owned(), row = h('div', { class: 'cf-rack', 'aria-label': 'Glitch’s hat rack: ' + have.length + ' of ' + HATS.length + ' hats' }, h('b', { text: 'Hat rack' }));
        HATS.forEach(x => row.append(h('i', { class: (have.includes(x.id) ? '' : 'is-lock') + (newHat && newHat.id === x.id ? ' is-new' : ''), html: hatSVG(x.id), title: x.name })));
        row.append(h('span', { text: have.length + '/' + HATS.length }));
        return row;
      }
      async function hatOff() {
        if (reduced()) { hatEl.style.opacity = '0'; return; }
        K.sfx.whoosh();
        await K.anim(700, (k) => { const e = K.ease.outCubic(k); hatEl.style.transform = 'translate(-50%,' + (-26 * e).toFixed(1) + 'px) rotate(' + (-8 - 28 * e).toFixed(1) + 'deg)'; });
        K.sfx.chime(4);
        const r = rectIn(hatEl); P.emit('star', r.cx, r.cy, 10);
        await K.anim(600, (k) => { hatEl.style.transform = 'translate(-50%,' + (-26 - 34 * k).toFixed(1) + 'px) rotate(' + (-36 + 50 * k).toFixed(1) + 'deg)'; hatEl.style.opacity = String(1 - k); });
      }
      function hatOn(hat) {
        hatEl.innerHTML = hatSVG(hat.id);
        hatEl.style.opacity = '0';
        K.anim(reduced() ? 120 : 700, (k) => { const e = K.ease.outBack(k); hatEl.style.transform = 'translate(-50%,' + (-60 + 60 * e).toFixed(1) + 'px) rotate(' + (10 - 18 * e).toFixed(1) + 'deg)'; hatEl.style.opacity = String(Math.min(1, k * 3)); });
        K.sfx.sparkle();
        S.later(() => { const r = rectIn(hatEl), g2 = rectIn(gl.img); P.emit('star', r.cx, r.cy, 14); popAt(g2.cx + (LY.wide ? 0 : 70), g2.y + g2.h + 34, 'NEW HAT: ' + hat.name.toUpperCase(), 'fact'); }, 520);
      }
      async function dawn(plan, planEl, leads) {
        ST.dawn = true;
        el.style.setProperty('--beam', plan ? '0.5' : '1'); el.style.setProperty('--warm', plan ? '0.55' : '1');
        WX.calm = plan; WX.rainT = 0; win.style.setProperty('--rain', '0'); WX.dirty = true;
        S.later(() => { rainAn.forEach(a => { if (!a) return; a.pause(); const i = AMB.indexOf(a); if (i >= 0) AMB.splice(i, 1); }); rainFar.style.display = rainNear.style.display = 'none'; }, 2800);
        // morning: the all-night coffee has gone cold, so each puff of steam finishes its cycle and stops
        S.later(() => steamAn.forEach(a => { if (!a) return; try { a.effect.updateTiming({ iterations: (a.effect.getComputedTiming().currentIteration || 0) + 1 }); } catch (e) { a.cancel(); } const i = AMB.indexOf(a); if (i >= 0) AMB.splice(i, 1); }), 3600);
        if (rainAmb) { const ra = rainAmb; ra.level(0.0001, 1.4); S.later(() => ra.stop(0.6), 3200); rainAmb = null; }
        if (A.ctx && !dawnAmb) dawnAmb = K.ambience('dawn');
        MU.mode = 'dawn'; MU.bpm = 62;
        gl.face('calm');
        say(plan ? V.dawnPlan : V.dawn, { ms: 4600 });
        S.later(() => skyDawn(plan ? 7000 : 5600), 300);
        await hatOff();
        SND.blinds(true); WX.blT = 0; WX.gapT = 7; gl.react('bounce');
        await K.wait(350);
        el.classList.add('cf-dawn'); beams.classList.add('is-sweep');
        K.sfx.win();
        if (!reduced()) S.later(() => { for (let i = 0; i < 18; i++) P.emit('mote', LY.wx + Math.random() * LY.ww, LY.wy + LY.wh * (0.3 + Math.random() * 0.9), 1, { colors: ['#fff3d0', '#ffe2a8', '#ffd28a'], speed: [6, 22] }); }, 600);
        if (plan && planEl) {
          planEl.hidden = false;
          for (let i = 0; i < leads.length; i++) {
            const l = leads[i];
            planEl.append(h('div', { class: 'cf-card', style: { '--r': [-1.2, 0.8, -0.5][i % 3] + 'deg' } }, h('i', { class: 'cf-pin' }), h('em', { text: LEADK[l.kind] || 'Lead' }), h('span', { text: l.text })));
            K.sfx.thud(); K.sfx.tap();
            await K.wait(420);
          }
        }
        await K.wait(plan ? 1100 : 2600);
        gl.base(plan ? 'calm' : 'happy');
        if (D.newHat) { hatOn(D.newHat); S.later(() => say(V.newHat, { ms: 3200 }), 900); }
      }
      function fileCase(btn, sheet) {
        if (D.filed) return;
        D.filed = true;
        const list = S.store.get('case-file:archive', []);
        list.unshift({ id: caseNo + '-' + Date.now(), no: caseNo, title: D.title, date: Date.now(), before: beforeVal(), after: D.after, verdict: D.type, outcome: null });
        S.store.set('case-file:archive', list.slice(0, 40));
        btn.textContent = 'Filed ✓'; btn.disabled = true;
        SND.stamp(); K.sfx.paper(); nudge(3);
        say({ Jolly: 'Filed! Pop back once you know how it turned out. No rush.', Cheeky: 'Filed. Tell me how it really went. I’m curious now.', Unfiltered: 'Filed. Record the real outcome later.' }, { ms: 3400 });
        ctx.track('file_case', { verdict: D.type });
      }
      function openArchive() {
        const body = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } });
        const render = () => {
          body.innerHTML = '';
          const list = S.store.get('case-file:archive', []);
          const resolved = list.filter(c => c.outcome && c.outcome !== 'unknown'), came = resolved.filter(c => c.outcome === 'true').length;
          body.append(h('p', { class: 'ts-sheet-note', text: resolved.length ? 'Resolved cases: ' + resolved.length + '. Your fear came true in ' + came + '.' : 'File a case, then come back once you know what happened. Over time this shows how often your fears come true.' }));
          if (!list.length) body.append(h('p', { class: 'ts-sheet-note', text: 'No cases filed yet.' }));
          list.slice(0, 20).forEach(c => {
            const status = c.outcome === 'true' ? 'Fear came true' : c.outcome === 'other' ? 'Something else happened' : c.outcome === 'unknown' ? 'Still unknown' : 'Open';
            const item = h('div', { style: { border: '1px solid var(--ui-line)', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' } },
              h('b', { text: c.title, style: { font: '400 17px/1.2 Anton, Impact, sans-serif', letterSpacing: '0.03em' } }),
              h('span', { style: { font: '500 14px/1.35 var(--font-ui)', color: 'var(--ui-muted)' }, text: 'No. ' + c.no + ' · ' + new Date(c.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) + ' · Fear ' + (c.before == null ? '–' : c.before + '%') + ' → ' + c.after + '% · ' + (TITLE[c.verdict] || 'Filed') + ' · ' + status }));
            if (!c.outcome || c.outcome === 'unknown') {
              const r2 = h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } });
              [['true', 'The fear came true'], ['other', 'Something else'], ['unknown', 'Still unknown']].forEach(([v, label]) => {
                const b = h('button', { type: 'button', class: 'ts-chip', text: label });
                b.addEventListener('click', () => { const all = S.store.get('case-file:archive', []), x = all.find(y => y.id === c.id); if (x) x.outcome = v; S.store.set('case-file:archive', all); ctx.track('case_outcome', { outcome: v }); K.sfx.tap(); render(); });
                r2.append(b);
              });
              item.append(h('span', { class: 'ts-field-label', text: 'What actually happened?' }), r2);
            }
            body.append(item);
          });
        };
        render();
        UI.sheet({ title: 'Case Archive', note: 'Only titles, numbers and verdicts are kept, on this device. Never what you typed.', body });
      }
      async function stepVerdict() {
        ST.step = 'verdict'; ST.ready = false;
        const before = beforeVal(), after = D.after;
        let type;
        if (D.support === 'strong') type = 'supported';
        else if (D.support === 'some' && after >= 40) type = 'partly';
        else if (after <= 30) type = 'reopened';
        else if (after >= 70) type = 'thin';
        else type = 'pending';
        D.type = type;
        const plan = type === 'supported' || type === 'partly';
        layers({ tense: false, vibes: true, brush: true, bass: true });
        const n = D.marks.length || 1;
        const sep = D.marks.filter(m => (m.kind === 'brain') === !!m.bagged).length / n, sweep = D.marks.filter(m => m.byLamp).length / n;
        const score = Math.round(100 * (0.7 * sep + 0.3 * sweep)), tier = K.tier(score / 100), pb = K.best('clean', score, 'higher');
        const nextHat = HATS.find(x => !owned().includes(x.id));
        let newHat = null;
        if (nextHat && K.collect('hat:' + nextHat.id).isNew) newHat = nextHat;
        const badges = [];
        if (tier) badges.push(tier + ' detective');
        if (pb.isNew) badges.push('New best: ' + score + '% clean');
        if (newHat) badges.push('Collected: ' + newHat.name);
        if (ST.twisted) badges.push('Star witness unmasked');
        Object.assign(D, { badges: badges.slice(0, 4), score, tier, newHat });
        const pid = D.picked ? D.picked.id : '';
        const leads = D.leads.slice().sort((x, y) => (y.for === pid) - (x.for === pid));
        D.lead = leads[0];
        const p = panel('cf-final');
        const planEl = plan ? h('div', { class: 'cf-plan', hidden: true }, h('b', { text: 'THE PLAN' })) : null;
        if (planEl) p.append(planEl);
        const stamp = h('div', { class: 'cf-stamp' + (plan ? ' is-amber' : ''), 'aria-label': STAMP[type] }, stampWords(STAMP[type]));
        const nb = h('i'), na = h('i');
        const archiveBtn = button('Case Archive', 'ts-btn-quiet'), fileBtn = button('File it', 'ts-btn-quiet'), closeBtn = button('Close the case', 'cf-inkbtn');
        const acts = h('div', { class: 'cf-acts', hidden: true }, archiveBtn, fileBtn, closeBtn);
        const vsheet = h('div', { class: 'cf-vsheet' },
          h('div', { class: 'cf-vhead' }, h('span', { text: 'CASE No. ' + caseNo }), h('span', { text: new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) })),
          h('div', { class: 'cf-vtitle' }, h('h2', { text: D.title }), stamp), h('p', { class: 'cf-say', text: sayText(type) }),
          h('div', { class: 'cf-nums' },
            h('div', { class: 'cf-num' }, h('span', { text: 'You came in' }), h('span', { class: 'cf-strack' }, nb), h('b', { text: before == null ? '–' : before + '%' })),
            h('div', { class: 'cf-num is-after' }, h('span', { text: 'Hunches now' }), h('span', { class: 'cf-strack' }, na), h('b', { text: after + '%' }))),
          h('div', { class: 'cf-cw' }, h('span', null, 'Camera ', h('b', { class: 'c', text: String(D.camWords || 0) }), ' words · Brain ', h('b', { class: 'b', text: String(D.brainWords || 0) })), h('span', { class: 'cf-tier' + (tier ? '' : ' is-plain'), text: (tier ? tier + ' detective · ' : 'Detective · ') + score + '% clean' })),
          !plan && D.lead ? h('div', { class: 'cf-lead' }, h('em', { text: 'Next lead' }), h('span', { text: D.lead.text })) : null,
          D.care ? h('p', { class: 'cf-say', text: 'Someone qualified can tell you exactly where you stand.' }) : null,
          rackRow(newHat), acts);
        p.append(vsheet);
        ST.fileBtn = fileBtn; ST.closeBtn = closeBtn;
        await showP(p);
        await K.wait(250);
        stamp.classList.add('is-slam');
        S.later(() => { SND.stamp(); nudge(7); S.buzz(25); const r = rectIn(stamp); P.emit('spark', r.cx, r.cy, 20, { colors: plan ? ['#ffb24f', '#ffe0a0'] : ['#e0483d', '#ff8a7a'], speed: [80, 240] }); }, 200);
        gl.face({ supported: 'idea', partly: 'idea', reopened: 'worried', thin: 'think', pending: 'think' }[type]);
        S.later(() => gl.react(type === 'reopened' ? 'shake' : 'bounce'), 260);
        say(V[type], { ms: 4200 });
        S.later(() => nb.style.setProperty('--v', String((before || 0) / 100)), 500);
        S.later(() => { na.style.setProperty('--v', String(after / 100)); K.sfx.good(undefined, 3); }, 950);
        ctx.track('verdict', { type, after, support: D.support, score });
        await K.wait(2700);
        const away = !plan && !reduced();
        if (away) {
          const r = rectIn(vsheet), peek = LY.wide ? 150 : 132, dy = Math.max(0, Math.round(LY.H - 14 - peek - r.y));
          p.style.transition = 'transform 1.1s cubic-bezier(.5, 0, .2, 1), opacity 0.45s ease'; p.style.transform = 'translateY(' + dy + 'px)';
          K.sfx.whoosh();
        }
        await dawn(plan, planEl, leads);
        acts.hidden = false;
        if (away) { p.style.transition = 'transform 0.9s cubic-bezier(.2, .9, .3, 1), opacity 0.45s ease'; p.style.transform = ''; K.sfx.paper(); await K.wait(900); }
        fileBtn.addEventListener('click', () => fileCase(fileBtn, vsheet));
        archiveBtn.addEventListener('click', () => openArchive());
        ST.ready = true;
        K.guide({ id: 'close', g: 'tap', target: closeBtn, label: 'CLOSE THE CASE', delay: 1800 });
        await tapOnce(closeBtn);
        finish();
      }
      function finish() {
        if (ST.finished) return;
        ST.finished = true; K.guide(null);
        const before = beforeVal();
        ctx.finish({
          title: TITLE[D.type], mood: 'idea',
          lines: ['Camera ' + (D.camWords || 0) + ' words · Brain ' + (D.brainWords || 0), before == null ? 'Fear now: ' + D.after + '%' : 'Fear: ' + before + '% → ' + D.after + '%', 'Next lead: ' + K.words(D.lead ? D.lead.text : 'Ask one simple question.', 18)],
          share: TITLE[D.type] + '. ' + (before == null ? 'Fear now ' + D.after + '%' : 'Fear ' + before + '% → ' + D.after + '%'),
          badges: D.badges || []
        });
      }

      /* ---------------- run ---------------- */
      if (ctx.analysisReady && ctx.analysisReady.then) ctx.analysisReady.then((a) => { if (a && a !== an && a.source === 'ai' && (ST.step === 'intro' || ST.step === 'closed')) { an = a; D = build(); } }).catch(() => {});
      const SUB = ['Glitch took 4 whole seconds this time. Personal growth. Let’s check his work.', 'Glitch closed it in 1.2 seconds. He’s learning. Let’s reopen it anyway.', 'Glitch closed your case in 0.5 seconds. Slower than last time. Reopen it.', 'Inspector Glitch closed your case in 0.3 seconds. Let’s reopen it.'];
      (async () => {
        await K.intro({ title: 'Case File', sub: SUB[smug], how: 'Sweep the UV lamp over your words. Bag what your brain added.', char: 'glitch', mood: smug >= 2 ? 'smug' : 'think' });
        await stepClosed();
        await stepScan();
        await stepBag();
        await stepCCTV();
        await stepBoard();
        await stepLineup();
        await stepVerdict();
      })();

      /* ---------------- autoplay: real inputs, start to finish ---------------- */
      function lineBands() {
        const r = document.createRange(); r.selectNodeContents(SH.ink);
        const tbR = SH.tb.getBoundingClientRect(), sc = K.scaleOf(el) || 1, bands = [];
        Array.from(r.getClientRects()).forEach(q => {
          if (q.width < 2) return;
          const cy = (q.top + q.height / 2 - tbR.top) / sc;
          let b = bands.find(x => Math.abs(x.y - cy) < 8);
          if (!b) { b = { y: cy, x0: 1e9, x1: -1e9 }; bands.push(b); }
          b.x0 = Math.min(b.x0, (q.left - tbR.left) / sc); b.x1 = Math.max(b.x1, (q.right - tbR.left) / sc);
        });
        return bands.sort((a, b) => a.y - b.y);
      }
      return {
        async autoplay() {
          const until = async (f, ms) => { const t0 = performance.now(); while (!f()) { if (performance.now() - t0 > (ms || 45000)) throw new Error('autoplay stuck at ' + ST.step); await K.wait(100); } };
          await K.wait(400);
          const card = el.querySelector('.gk-intro');
          if (card) await K.sim.tap(card);
          await until(() => ST.step === 'closed' && ST.ready);
          await K.wait(900); await K.sim.tap(ST.btn);
          await until(() => ST.step === 'scan' && ST.ready);
          await K.wait(600);
          for (let pass = 0; pass < 3 && !ST.scanDone; pass++) {
            for (const b of lineBands()) {
              if (ST.scanDone) break;
              const x0 = Math.max(6, b.x0 - 14), x1 = Math.min(SH.tb.clientWidth - 6, b.x1 + 14);
              await K.sim.drag(SH.tb, { x: x0, y: b.y + 60 }, { x: x1, y: b.y + 60 }, Math.max(650, (x1 - x0) * 2.8), 18);
            }
          }
          if (!ST.scanDone) { await until(() => SH && !SH.reveal.hidden, 15000); await K.sim.tap(SH.reveal); }
          await until(() => ST.step === 'bag' && ST.ready);
          await K.wait(700);
          for (const m of D.marks.filter(x => x.kind === 'brain')) {
            await until(() => !ST.busy && !ST.note);
            if (m.bagged) continue;
            const r = m.ink.getClientRects()[0], tr = SH.tb.getBoundingClientRect(), sc = K.scaleOf(el) || 1;
            await K.sim.tap(SH.tb, (r.left - tr.left + Math.min(r.width, 120) / 2) / sc, (r.top - tr.top + r.height / 2) / sc);
            await K.wait(350);
          }
          await until(() => !ST.busy && ST.sealBtn && !ST.sealBtn.hidden);
          await K.wait(1000); await K.sim.tap(ST.sealBtn);
          await until(() => ST.step === 'cctv' && ST.ready);
          await K.wait(700); await K.sim.tap(ST.play);
          await until(() => ST.step === 'cctv' && ST.next && !ST.next.hidden);
          await K.wait(2000); await K.sim.tap(ST.next);
          await until(() => ST.step === 'board' && ST.ready);
          for (const b of ST.blanks) { await K.wait(500); await K.sim.tap(b); }
          await until(() => ST.allFlipped);
          await K.wait(1000); await K.sim.tap(ST.blanks[0]);
          await K.wait(1000); await K.sim.tap(ST.next);
          await until(() => ST.step === 'lineup' && ST.ready);
          await K.wait(800);
          const ords = D.alts.filter(a => !a.fear), fear = D.alts.find(a => a.fear), chips = ords.map((a, i) => [a, [5, 2, 1][i] || 0]);
          chips.push([fear, 2]);
          chips[0][1] += 10 - chips.reduce((s2, x) => s2 + x[1], 0);
          for (const [a, cnt] of chips) {
            if (!cnt) continue;
            await K.sim.tap(a.el.btn); await K.wait(380);
            for (let k = 0; k < cnt; k++) { await K.sim.tap(ST.plus); await K.wait(200); }
          }
          await until(() => !ST.lock.disabled);
          await K.wait(800); await K.sim.tap(ST.lock);
          await until(() => ST.step === 'verdict' && ST.ready, 60000);
          await K.wait(1400); await K.sim.tap(ST.fileBtn);
          await K.wait(3200); await K.sim.tap(ST.closeBtn);
          await until(() => ST.finished);
        }
      };
    }
  });
})(window.TSG_ENV);
