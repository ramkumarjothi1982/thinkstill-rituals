/* Group Think Glitch — its own visual world: a dusk rooftop seen through camera feeds, then a detective's corkboard.
 * Typewriter labels (Special Elite), handwritten polaroids (Caveat), console UI in Fredoka. */
export const GTG_FONTS = 'https://fonts.googleapis.com/css2?family=Special+Elite&family=Caveat:wght@600;700&display=swap';

export const GTG_CSS = `
.gtg{position:absolute;inset:0;display:flex;flex-direction:column;color:#f6efe6;background:radial-gradient(120% 90% at 50% 0%,#2a2350 0%,#120f26 55%,#0a0918 100%);font-family:var(--rf-ui);overflow:hidden;-webkit-user-select:none;user-select:none;touch-action:none}
.gtg *{box-sizing:border-box}
.gtg .tw{font-family:'Special Elite',ui-monospace,Menlo,monospace;letter-spacing:.02em}
.gtg .hand{font-family:'Caveat','Comic Sans MS',cursive}
:where(.gtg) button{font:inherit;color:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
:where(.gtg) button:focus-visible,:where(.gtg) [tabindex]:focus-visible{outline:2px solid #ffd27a;outline-offset:2px}

/* investigation */
.gtg-inv{position:absolute;inset:0;display:grid;grid-template-columns:1fr;grid-template-rows:auto 1fr auto auto;gap:8px;padding:6px 12px calc(10px + var(--rf-safe-b,0px))}
.gtg-head{display:flex;align-items:center;gap:10px;min-height:34px}
.gtg-camchip{display:flex;align-items:center;gap:8px;padding:5px 10px 5px 6px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);font-size:13px;white-space:nowrap}
.gtg-camchip i{width:9px;height:9px;border-radius:50%;background:#ff4d5e;box-shadow:0 0 10px #ff4d5e;animation:gtgRec 1.2s steps(2) infinite}
@keyframes gtgRec{50%{opacity:.25}}
.gtg-hint{flex:1;min-width:0;font-size:13px;opacity:.82;line-height:1.25}
.gtg-feedwrap{position:relative;min-height:0;display:flex;align-items:center;justify-content:center}
.gtg-feed{position:relative;border-radius:14px;overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.08);touch-action:none;cursor:crosshair;background:#000}
.gtg-feed canvas{display:block;width:100%;height:100%}
.gtg-found{position:absolute;left:50%;top:12px;transform:translate(-50%,-6px);padding:6px 12px;border-radius:999px;background:rgba(255,214,120,.95);color:#2a1a05;font-weight:600;font-size:13px;opacity:0;transition:opacity .15s,transform .15s;pointer-events:none;white-space:nowrap}
.gtg-found.on{opacity:1;transform:translate(-50%,0)}
.gtg-scrub{display:grid;grid-template-columns:48px 1fr auto;align-items:center;gap:10px}
.gtg-play{width:48px;height:48px;border-radius:50%;border:0;background:#ffb36b;color:#2a1405;display:grid;place-items:center;box-shadow:0 6px 16px rgba(255,150,80,.35)}
.gtg-play svg{width:20px;height:20px}
.gtg-track{position:relative;height:52px;border-radius:10px;overflow:hidden;background:#000;box-shadow:inset 0 0 0 1px rgba(255,255,255,.12);touch-action:none;cursor:ew-resize}
.gtg-track canvas{position:absolute;inset:0;width:100%;height:100%}
.gtg-head2{position:absolute;top:-2px;bottom:-2px;width:3px;margin-left:-1.5px;background:#ffd27a;box-shadow:0 0 12px #ffb36b;pointer-events:none}
.gtg-head2::after{content:'';position:absolute;left:50%;top:-1px;width:14px;height:14px;margin-left:-7px;border-radius:50%;background:#ffd27a}
.gtg-time{font-variant-numeric:tabular-nums;font-size:13px;opacity:.85;min-width:44px;text-align:right}
.gtg-tray{display:grid;grid-template-columns:repeat(3,minmax(0,1fr)) auto;gap:10px;align-items:center}
.gtg-slot{position:relative;aspect-ratio:5/6;max-height:118px;border-radius:6px;border:1.5px dashed rgba(255,255,255,.22);display:grid;place-items:center;font-size:11px;opacity:.9;color:rgba(255,255,255,.55);text-align:center;padding:4px}
.gtg-slot .pol{position:absolute;inset:0}
.gtg-pinbtn{min-width:96px;height:64px;border-radius:16px;border:0;background:#3a3358;color:#cfc6e8;font-weight:700;font-size:15px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;transition:background .15s,transform .1s,box-shadow .15s}
.gtg-pinbtn small{font-weight:500;font-size:11px;opacity:.8}
.gtg-pinbtn.ready{background:#ffd27a;color:#2a1a05;box-shadow:0 0 0 4px rgba(255,210,122,.25),0 10px 24px rgba(255,190,90,.35);animation:gtgPulse 1s ease-in-out infinite}
.gtg-pinbtn:active{transform:scale(.96)}
.gtg-pinbtn.case{background:#e23b3b;color:#fff;box-shadow:0 10px 24px rgba(226,59,59,.35)}
@keyframes gtgPulse{50%{box-shadow:0 0 0 9px rgba(255,210,122,.08),0 10px 24px rgba(255,190,90,.35)}}

/* polaroids */
.pol{background:#fbf7ef;border-radius:3px;padding:6% 6% 22%;box-shadow:0 6px 14px rgba(0,0,0,.45);transform:rotate(var(--rot,0deg));transition:transform .25s}
.pol canvas{display:block;width:100%;height:auto;aspect-ratio:1/1;background:#1b1830}
.pol b{position:absolute;left:5%;right:5%;bottom:2%;height:19%;display:flex;align-items:center;justify-content:center;font-family:'Caveat',cursive;font-weight:700;color:#2b2540;font-size:clamp(10px,2.9vw,15px);line-height:.95;text-align:center;overflow:hidden}
.pol .x{position:absolute;right:-8px;top:-8px;width:28px;height:28px;border-radius:50%;border:0;background:#2b2540;color:#fff;font-size:15px;line-height:28px;padding:0;box-shadow:0 2px 6px rgba(0,0,0,.4)}
.pol.fly{transition:transform .55s cubic-bezier(.2,.9,.25,1.15)}

/* corkboard */
.gtg-board{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;gap:10px;padding:8px 14px calc(12px + var(--rf-safe-b,0px));background:
  radial-gradient(100% 70% at 50% 0%,rgba(255,220,170,.18),transparent 70%),
  repeating-radial-gradient(circle at 20% 30%,rgba(90,52,20,.18) 0 2px,transparent 2px 5px),
  repeating-radial-gradient(circle at 70% 60%,rgba(255,220,160,.10) 0 1px,transparent 1px 4px),
  linear-gradient(160deg,#b98552,#9a6a3c 55%,#7d5430);box-shadow:inset 0 0 0 10px #4a2f1a,inset 0 0 0 12px #2b1a0e,inset 0 0 60px rgba(0,0,0,.45)}
.gtg-board h2{margin:6px 0 0;font-family:'Special Elite',monospace;font-weight:400;font-size:20px;color:#2a160a;background:#f3e6c9;padding:4px 14px;border-radius:2px;box-shadow:0 3px 8px rgba(0,0,0,.3);transform:rotate(-1.2deg)}
.gtg-board .sub{font-size:13px;color:#2a160a;background:rgba(255,245,225,.85);padding:3px 10px;border-radius:3px;text-align:center;max-width:520px}
.gtg-slots{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;width:100%;max-width:560px}
.gtg-bslot{position:relative;aspect-ratio:5/6;border-radius:4px;background:rgba(40,20,8,.22);box-shadow:inset 0 0 0 2px rgba(40,20,8,.35);display:flex;align-items:flex-end;justify-content:center}
.gtg-bslot>span{position:absolute;top:-12px;left:50%;transform:translateX(-50%);font-family:'Special Elite',monospace;font-size:12px;color:#2a160a;background:#f3e6c9;padding:1px 8px;border-radius:2px;white-space:nowrap;z-index:2}
.gtg-bslot .pol{position:absolute;inset:6px;cursor:grab;touch-action:none}
.gtg-bslot.over{box-shadow:inset 0 0 0 3px #ffd27a}
.gtg-case{position:relative;width:100%;max-width:560px;flex:1;min-height:150px;display:flex;flex-direction:column;align-items:center;justify-content:space-between;gap:8px;padding-top:4px}
.gtg-cake{position:relative;width:74px;height:74px;border-radius:50%;background:#fbf7ef;box-shadow:0 4px 10px rgba(0,0,0,.4);display:grid;place-items:center;touch-action:none;cursor:grab;z-index:3}
.gtg-cake canvas{width:62px;height:62px;border-radius:50%}
.gtg-cake::after{content:'';position:absolute;top:-6px;left:50%;width:14px;height:14px;margin-left:-7px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#ff8a8a,#b0141c);box-shadow:0 2px 3px rgba(0,0,0,.5)}
.gtg-sus{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;width:100%;z-index:3}
.gtg-tok{display:flex;flex-direction:column;align-items:center;gap:4px;border:0;background:none;padding:0}
.gtg-tok .c{position:relative;width:min(60px,15vw);height:min(60px,15vw);border-radius:50%;background:#fbf7ef;box-shadow:0 4px 10px rgba(0,0,0,.4);display:grid;place-items:center;transition:transform .15s,box-shadow .15s}
.gtg-tok .c canvas,.gtg-tok .c img{width:86%;height:86%;border-radius:50%;object-fit:contain}
.gtg-tok span{font-size:12px;font-weight:600;color:#2a160a;background:rgba(255,245,225,.9);padding:1px 6px;border-radius:3px;white-space:nowrap}
.gtg-tok.on .c{transform:scale(1.12);box-shadow:0 0 0 4px #e23b3b,0 8px 18px rgba(0,0,0,.45)}
.gtg-thread{position:absolute;inset:0;pointer-events:none;z-index:2;overflow:visible}
.gtg-row{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;max-width:560px}
.gtg-knob{position:relative;width:78px;height:78px;border-radius:50%;border:0;background:radial-gradient(circle at 40% 35%,#5a4a3a,#2b2018);box-shadow:0 6px 14px rgba(0,0,0,.5),inset 0 2px 2px rgba(255,255,255,.15);touch-action:none}
.gtg-knob i{position:absolute;left:50%;top:8px;width:4px;height:22px;margin-left:-2px;border-radius:2px;background:#ffd27a;transform-origin:2px 31px}
.gtg-knobl{display:flex;flex-direction:column;gap:2px;font-size:12px;color:#2a160a}
.gtg-knobl b{font-family:'Special Elite',monospace;font-weight:400;font-size:15px;background:#f3e6c9;padding:2px 8px;border-radius:2px}
.gtg-seal{position:relative;width:88px;height:88px;border-radius:50%;border:0;background:radial-gradient(circle at 38% 32%,#ff6b6b,#b3121c 60%,#7a0910);box-shadow:0 8px 18px rgba(0,0,0,.5),inset 0 -4px 8px rgba(0,0,0,.3);color:#ffe3e3;font-family:'Special Elite',monospace;font-size:12px;line-height:1.1;touch-action:none}
.gtg-seal[disabled]{filter:grayscale(.8) brightness(.8);cursor:not-allowed}
.gtg-seal svg{position:absolute;inset:-6px;width:100px;height:100px;pointer-events:none}
.gtg-seal.stamped{animation:gtgStamp .35s cubic-bezier(.2,1.6,.4,1)}
@keyframes gtgStamp{0%{transform:scale(1.3)}60%{transform:scale(.9)}100%{transform:scale(1)}}

/* waiting */
.gtg-wait{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px;background:rgba(14,10,28,.82);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);text-align:center;z-index:20}
.gtg-wait h3{margin:0;font-family:'Special Elite',monospace;font-weight:400;font-size:22px}
.gtg-chips{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;max-width:560px}
.gtg-chip{display:flex;flex-direction:column;align-items:center;gap:4px;width:104px}
.gtg-chip .av{position:relative;width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,.08)}
.gtg-chip .av img{width:100%;height:100%;object-fit:contain}
.gtg-chip .st{font-size:12px;opacity:.85}
.gtg-chip .nm{font-size:13px;font-weight:600;max-width:104px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gtg-chip .lab{font-size:10px;opacity:.7;margin-top:-3px}
.gtg-chip .wax{position:absolute;right:-4px;bottom:-4px;width:26px;height:26px;border-radius:50%;background:radial-gradient(circle at 38% 32%,#ff6b6b,#b3121c 60%,#7a0910);box-shadow:0 2px 4px rgba(0,0,0,.5)}
.gtg-btn{min-height:48px;padding:0 20px;border-radius:999px;border:0;background:#ffd27a;color:#2a1a05;font-weight:700;font-size:15px;box-shadow:0 8px 20px rgba(255,190,90,.3)}
.gtg-btn.ghost{background:rgba(255,255,255,.1);color:#f6efe6;box-shadow:none;border:1px solid rgba(255,255,255,.18)}

/* reveal + finale */
.gtg-stage{position:absolute;inset:0}
.gtg-stage>canvas{position:absolute;inset:0;width:100%;height:100%}
.gtg-over{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:10px;padding:16px 14px calc(16px + var(--rf-safe-b,0px));pointer-events:none}
.gtg-over>*{pointer-events:auto}
.gtg-verdicts{width:100%;max-width:640px;display:flex;flex-direction:column;gap:6px;max-height:46%;overflow:auto;padding:2px}
.gtg-vrow{display:grid;grid-template-columns:44px minmax(0,1fr);grid-template-areas:'av who' 'av vd' 'av clue';column-gap:10px;row-gap:1px;align-items:center;padding:6px 10px;border-radius:14px;background:rgba(14,10,28,.8);border:1px solid rgba(255,255,255,.1)}
.gtg-vrow>img{grid-area:av;width:44px;height:44px;object-fit:contain}
.gtg-vrow .who{grid-area:who;min-width:0;display:flex;align-items:baseline;gap:6px}
.gtg-vrow .who b{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gtg-vrow .who small{font-size:11px;opacity:.75;white-space:nowrap}
.gtg-vrow .clue{grid-area:clue;font-size:11px;opacity:.7;line-height:1.2}
.gtg-vrow .vd{grid-area:vd;display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;white-space:nowrap}
.gtg-vrow .vd canvas,.gtg-vrow .vd img{width:24px;height:24px;border-radius:50%;background:#fbf7ef}
.gtg-line{font-family:'Special Elite',monospace;font-size:clamp(15px,4.2vw,22px);text-align:center;max-width:620px;text-shadow:0 2px 12px rgba(0,0,0,.8)}
.gtg-tags{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;max-width:640px}
.gtg-tag{min-height:40px;padding:0 14px;border-radius:999px;border:1px solid rgba(255,255,255,.22);background:rgba(14,10,28,.7);font-size:13px}
.gtg-tag.on{background:#ffd27a;color:#2a1a05;border-color:#ffd27a}
.gtg-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:10px}
.gtg-note{font-size:12px;opacity:.75;text-align:center}
.gtg-card{position:relative;width:min(92vw,420px);border-radius:16px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,.6)}
.gtg-card canvas{display:block;width:100%;height:auto}
.gtg-consent{display:flex;align-items:center;gap:8px;font-size:13px;background:rgba(14,10,28,.7);padding:8px 12px;border-radius:12px}
.gtg-consent input{width:22px;height:22px;accent-color:#ffd27a}
.gtg-float{position:absolute;top:22%;margin-left:-42vw;width:84vw;max-width:520px;display:flex;justify-content:center;pointer-events:none;animation:gtgFloat 3.2s ease-out forwards}
.gtg-float>span{padding:6px 12px;border-radius:14px;background:rgba(255,214,120,.94);color:#2a1a05;font-size:13px;font-weight:600;text-align:center}
@keyframes gtgFloat{0%{transform:translateY(30px) scale(.8);opacity:0}15%{opacity:1;transform:translateY(0) scale(1)}100%{transform:translateY(-120px);opacity:0}}

/* desktop: feed left, panel right */
@media (min-width:900px){
  .gtg-inv{grid-template-columns:minmax(0,1fr) 300px;grid-template-rows:auto 1fr auto;column-gap:18px;padding:10px 20px 18px}
  .gtg-head{grid-column:1/3}
  .gtg-feedwrap{grid-column:1;grid-row:2}
  .gtg-scrub{grid-column:1;grid-row:3}
  .gtg-tray{grid-column:2;grid-row:2/4;grid-template-columns:1fr 1fr;grid-template-rows:auto auto auto;align-content:center;gap:14px}
  .gtg-slot{max-height:none}
  .gtg-pinbtn{grid-column:1/3;height:72px;font-size:17px}
  .gtg-hint{font-size:14px}
}
@media (prefers-reduced-motion:reduce){.gtg *{animation-duration:.01ms!important;transition-duration:.01ms!important}}
`;
