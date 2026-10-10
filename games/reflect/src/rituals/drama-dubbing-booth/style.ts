import { cq } from '../../ui/dom';
/* Drama Dubbing Booth — a 1950s dubbing studio: walnut panels, a booth window onto the projector screen, a green
 * enamel mixing desk with paper-tape lanes, script cards, brass faders, VU meters and tape reels. Limelight for the
 * marquee, Courier Prime for the script. */
export const DDB_FONTS = 'https://fonts.googleapis.com/css2?family=Limelight&family=Courier+Prime:wght@400;700&display=swap';

export const DDB_CSS = cq(`
.ddb{position:absolute;inset:0;overflow:hidden;color:#f7ecd9;font-family:var(--rf-ui);-webkit-user-select:none;user-select:none;
  background:radial-gradient(90% 60% at 50% -10%,rgba(255,196,120,.35),transparent 70%),repeating-linear-gradient(90deg,#3a2316 0 46px,#2f1c11 46px 48px,#432a1a 48px 94px,#2f1c11 94px 96px);}
.ddb *{box-sizing:border-box}
:where(.ddb) button{font:inherit;color:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
:where(.ddb) button:focus-visible,:where(.ddb) [tabindex]:focus-visible{outline:2px solid #ffd27a;outline-offset:2px}
.ddb .scr{font-family:'Courier Prime','Courier New',ui-monospace,monospace}
.ddb .deco{font-family:'Limelight','Baloo 2',Georgia,serif;letter-spacing:.04em}
.ddb-studio{position:absolute;inset:0;display:grid;grid-template-columns:1fr;grid-template-rows:auto auto 1fr auto;gap:8px;padding:8px 12px calc(10px + var(--rf-safe-b,0px))}
.ddb-win{position:relative;border-radius:14px;padding:7px;background:linear-gradient(180deg,#1d1612,#0f0b09);box-shadow:0 14px 34px rgba(0,0,0,.6),inset 0 0 0 1px rgba(255,220,170,.12)}
.ddb-win::before,.ddb-win::after{content:'';position:absolute;width:8px;height:8px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#ffe2a8,#9a6a2a);top:5px;left:5px;box-shadow:calc(100cqw - 18px) 0 0 #c8964a}
.ddb-screen{position:relative;width:100%;aspect-ratio:16/9;border-radius:8px;overflow:hidden;background:#000;touch-action:manipulation;cursor:pointer}
.ddb-screen canvas{position:absolute;inset:0;width:100%;height:100%}
.ddb-tc{position:absolute;right:10px;top:8px;font:600 12px ui-monospace,Menlo,monospace;color:#fff;text-shadow:0 1px 2px #000;opacity:.85}
.ddb-onair{position:absolute;left:10px;top:8px;display:flex;align-items:center;gap:6px;font:700 11px ui-monospace,monospace;letter-spacing:.12em;color:#ffd9d9;padding:3px 8px;border-radius:4px;background:rgba(60,0,0,.55)}
.ddb-onair i{width:9px;height:9px;border-radius:50%;background:#5a1414}
.ddb-onair.on i{background:#ff3b3b;box-shadow:0 0 10px #ff3b3b}
.ddb-playbig{position:absolute;left:50%;top:50%;width:62px;height:62px;margin:-31px 0 0 -31px;border-radius:50%;background:rgba(10,6,2,.55);display:grid;place-items:center;border:2px solid rgba(255,236,200,.7);transition:opacity .2s}
.ddb-playbig svg{width:24px;height:24px;margin-left:3px}
.ddb-desk{position:relative;border-radius:14px;padding:6px 8px 8px;background:linear-gradient(180deg,#36473d,#26332b);box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 8px 20px rgba(0,0,0,.45)}
.ddb-ruler{position:relative;height:24px;margin-left:44px;touch-action:none;cursor:ew-resize}
.ddb-ruler .bt{position:absolute;top:0;bottom:0;border-left:1px solid rgba(255,236,200,.35);padding-left:3px;font:600 10px var(--rf-ui);color:rgba(255,236,200,.75);white-space:nowrap;overflow:hidden}
.ddb-lanes{position:relative;display:flex;flex-direction:column;gap:6px}
.ddb-lane{position:relative;display:grid;grid-template-columns:38px 1fr;gap:6px;align-items:center;height:50px}
.ddb-lane .who{width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.08);display:grid;place-items:center}
.ddb-lane .who img{width:36px;height:36px;object-fit:contain}
.ddb-track{position:relative;height:100%;border-radius:8px;background:repeating-linear-gradient(90deg,#efe4cc 0 calc(100%/24 - 1px),#d9cbad calc(100%/24 - 1px) calc(100%/24));box-shadow:inset 0 2px 4px rgba(0,0,0,.25);overflow:hidden;touch-action:none}
.ddb-track.over{box-shadow:inset 0 0 0 3px #ffd27a}
.ddb-head{position:absolute;top:0;bottom:-4px;width:2px;margin-left:-1px;background:#ff4d4d;box-shadow:0 0 8px #ff4d4d;pointer-events:none;z-index:4}
.ddb-head::before{content:'';position:absolute;top:-4px;left:-5px;border:6px solid transparent;border-top-color:#ff4d4d}
.ddb-cue{position:absolute;top:5px;bottom:5px;min-width:30px;border-radius:7px;display:flex;align-items:center;gap:4px;padding:0 6px 0 2px;font:700 11px 'Courier Prime','Courier New',monospace;color:#1d1408;box-shadow:0 2px 4px rgba(0,0,0,.35);touch-action:none;cursor:grab;overflow:hidden;white-space:nowrap;z-index:2}
.ddb-cue img{width:30px;height:30px;flex:0 0 30px;object-fit:contain}
.ddb-cue span{overflow:hidden;text-overflow:ellipsis}
.ddb-cue.sel{outline:3px solid #fff;z-index:3}
.ddb-drop{position:absolute;top:2px;bottom:2px;width:3px;background:#ffd27a;box-shadow:0 0 10px #ffd27a;pointer-events:none;z-index:5}
.ddb-panel{position:relative;min-height:0;border-radius:14px;background:linear-gradient(180deg,#2b221a,#1f1812);box-shadow:inset 0 1px 0 rgba(255,236,200,.1);padding:8px;display:flex;flex-direction:column;gap:8px;overflow:hidden}
.ddb-beatbar{display:flex;align-items:center;gap:8px}
.ddb-beatbar b{flex:1;min-width:0;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ddb-arrow{width:40px;height:40px;border-radius:10px;border:0;background:rgba(255,255,255,.08);font-size:18px}
.ddb-lines{display:grid;grid-template-columns:1fr 1fr;gap:8px;min-height:0;overflow:auto}
.ddb-line{position:relative;text-align:left;min-height:48px;padding:6px 8px 6px 12px;border-radius:8px;border:0;background:#f3e7cf;color:#22180c;box-shadow:0 2px 6px rgba(0,0,0,.35);font:700 clamp(11px,3.1vw,12.5px)/1.18 'Courier Prime','Courier New',monospace;touch-action:none}
.ddb-line::before{content:'';position:absolute;left:0;top:0;bottom:0;width:6px;border-radius:8px 0 0 8px;background:var(--tone)}
.ddb-line small{display:block;margin-top:3px;font:600 10px var(--rf-ui);color:#6b5a40;text-transform:uppercase;letter-spacing:.08em}
.ddb-line.own{grid-column:1/-1;min-height:44px;display:flex;align-items:center;gap:10px;background:#2f261d;color:#f7ecd9;border:1.5px dashed rgba(255,236,200,.4);box-shadow:none}
.ddb-line.own small{margin:0}
.ddb-ghost{position:fixed;z-index:60;pointer-events:none;max-width:200px;padding:7px 10px;border-radius:8px;background:#f3e7cf;color:#22180c;font:700 12px 'Courier Prime',monospace;box-shadow:0 10px 24px rgba(0,0,0,.5);transform:rotate(-3deg)}
.ddb-perf{display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:center;min-height:0}
.ddb-perf h4{grid-column:1/3;margin:0;font-size:13px;font-weight:600;display:flex;gap:8px;align-items:center}
.ddb-perf h4 span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ddb-wheel{position:relative;width:150px;height:150px;border-radius:50%;background:radial-gradient(circle,#3a2e22 0 38%,#2a2119 39% 100%);box-shadow:inset 0 0 0 2px rgba(255,236,200,.12);touch-action:none}
.ddb-wheel button{position:absolute;width:40px;height:40px;margin:-20px 0 0 -20px;border-radius:50%;border:2px solid transparent;background:rgba(255,255,255,.06);padding:1px}
.ddb-wheel button img{width:100%;height:100%;object-fit:contain}
.ddb-wheel button.on{border-color:#ffd27a;background:rgba(255,210,122,.2)}
.ddb-wheel .mid{position:absolute;left:50%;top:50%;width:54px;height:54px;margin:-27px 0 0 -27px;border-radius:50%;display:grid;place-items:center;text-align:center;font-size:10px;color:#e8d8bd;pointer-events:none}
.ddb-faders{display:flex;flex-direction:column;gap:8px;min-width:0}
.ddb-fader{display:grid;grid-template-columns:44px 1fr;align-items:center;gap:6px;font-size:11px;color:#e8d8bd}
.ddb-fader input{width:100%;height:32px;accent-color:#e0b25c}
.ddb-row{display:flex;gap:8px;flex-wrap:wrap}
.ddb-sbtn{min-height:40px;padding:0 12px;border-radius:10px;border:0;background:rgba(255,255,255,.1);font-size:13px;font-weight:600}
.ddb-own{display:flex;flex-direction:column;gap:8px}
.ddb-own input{min-height:44px;border-radius:10px;border:1.5px solid rgba(255,236,200,.3);background:#14100c;color:#f7ecd9;padding:0 12px;font:700 15px 'Courier Prime',monospace}
.ddb-tones{display:flex;gap:6px;flex-wrap:wrap}
.ddb-tones button{min-height:36px;padding:0 10px;border-radius:999px;border:1.5px solid var(--tone);background:transparent;font-size:12px}
.ddb-tones button.on{background:var(--tone);color:#1d1408}
.ddb-controls{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px}
.ddb-preview{min-height:54px;padding:0 18px;border-radius:999px;border:0;background:radial-gradient(circle at 40% 30%,#ffe2a8,#c8964a);color:#2a1806;font-weight:800;font-size:15px;box-shadow:0 6px 16px rgba(0,0,0,.4)}
.ddb-meters{display:flex;align-items:center;justify-content:center;gap:8px;min-width:0}
.ddb-meters canvas{width:64px;height:38px;border-radius:6px;background:#efe2c4;box-shadow:inset 0 0 0 2px #2a1f14}
.ddb-reel{width:30px;height:30px;color:#c8b48f}
.ddb-reel.spin{animation:ddbSpin 1.1s linear infinite}
@keyframes ddbSpin{to{transform:rotate(360deg)}}
.ddb-print{position:relative;width:86px;height:58px;border-radius:14px;border:0;background:linear-gradient(180deg,#e03b3b,#a3161c);color:#fff;font:800 13px/1.05 var(--rf-ui);letter-spacing:.02em;box-shadow:0 6px 16px rgba(0,0,0,.45);touch-action:none;overflow:hidden}
.ddb-print i{position:absolute;left:0;bottom:0;height:5px;width:0;background:#ffd27a}
.ddb-print[disabled]{filter:grayscale(.7) brightness(.75);cursor:not-allowed}
.ddb-hint{font-size:12px;color:rgba(247,236,217,.75);text-align:center}
.ddb-wait{position:absolute;inset:0;z-index:30;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;text-align:center;background:rgba(18,12,8,.85);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}
.ddb-wait h3{margin:0;font-family:'Limelight',Georgia,serif;font-weight:400;font-size:26px;color:#ffd27a}
.ddb-chips{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;max-width:560px}
.ddb-chip{display:flex;flex-direction:column;align-items:center;gap:3px;width:100px;font-size:12px}
.ddb-chip img{width:60px;height:60px;object-fit:contain}
.ddb-chip b{font-size:13px;max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ddb-chip small{opacity:.75;font-size:10px}
.ddb-btn{min-height:48px;padding:0 20px;border-radius:999px;border:0;background:#ffd27a;color:#2a1a05;font-weight:700;font-size:15px}
.ddb-btn.ghost{background:rgba(255,255,255,.1);color:#f7ecd9;border:1px solid rgba(255,236,200,.25)}
/* premiere */
.ddb-cin{position:absolute;inset:0;background:#07050a}
.ddb-cin>canvas{position:absolute;inset:0;width:100%;height:100%}
.ddb-over{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:10px;padding:14px 14px calc(14px + var(--rf-safe-b,0px));pointer-events:none}
.ddb-over>*{pointer-events:auto}
.ddb-react{display:flex;gap:12px;justify-content:center}
.ddb-react button{width:58px;height:58px;border-radius:50%;border:1.5px solid rgba(255,236,200,.35);background:rgba(20,14,10,.7);font-size:26px;line-height:1}
.ddb-react button:active{transform:scale(.92)}
.ddb-rows{width:100%;max-width:640px;display:flex;flex-direction:column;gap:6px;max-height:44%;overflow:auto}
.ddb-vrow{display:grid;grid-template-columns:44px minmax(0,1fr);column-gap:10px;align-items:center;padding:6px 10px;border-radius:12px;background:rgba(20,14,10,.82);border:1px solid rgba(255,236,200,.14)}
.ddb-vrow img{grid-row:1/3;width:44px;height:44px;object-fit:contain}
.ddb-vrow b{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ddb-vrow small{font-size:11px;opacity:.8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ddb-line2{font-family:'Limelight',Georgia,serif;font-size:clamp(16px,4.4vw,24px);text-align:center;max-width:620px;color:#ffe2a8;text-shadow:0 2px 12px rgba(0,0,0,.9)}
.ddb-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:10px}
.ddb-note{font-size:12px;opacity:.75;text-align:center}
.ddb-consent{display:flex;align-items:center;gap:8px;font-size:13px;background:rgba(20,14,10,.75);padding:8px 12px;border-radius:12px}
.ddb-consent input{width:22px;height:22px;accent-color:#ffd27a}
.ddb-poster{width:min(86vw,380px);border-radius:12px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,.6)}
.ddb-poster canvas{display:block;width:100%;height:auto;max-height:50vh;object-fit:contain;background:#120c08}
.ddb-float{position:absolute;font-size:30px;pointer-events:none;animation:ddbUp 2.4s ease-out forwards}
@keyframes ddbUp{0%{transform:translateY(0) scale(.6);opacity:0}15%{opacity:1;transform:translateY(-20px) scale(1.15)}100%{transform:translateY(-240px) scale(1);opacity:0}}
@media (min-width:900px){
  .ddb-studio{grid-template-columns:minmax(0,1fr) 340px;grid-template-rows:auto auto 1fr;column-gap:16px;padding:12px 20px 16px}
  .ddb-win{grid-column:1;grid-row:1;max-width:min(100%,calc((100vh - 330px) * 16 / 9));justify-self:center;width:100%}
  .ddb-desk{grid-column:1;grid-row:2}
  .ddb-panel{grid-column:2;grid-row:1/3}
  .ddb-controls{grid-column:2;grid-row:3;align-self:start}
  .ddb-lines{grid-template-columns:1fr}
}
@media (prefers-reduced-motion:reduce){.ddb *{animation-duration:.01ms!important;transition-duration:.01ms!important}}
`);
