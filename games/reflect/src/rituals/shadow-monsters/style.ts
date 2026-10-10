import { cq } from '../../ui/dom';
/* Shadow Monsters — an attic theatre at night: plum dark, one warm lamp, a cream bedsheet, velvet and brass.
 * Titles in Creepster (a horror-comic face that cannot take itself seriously), UI in the console face. */
export const SM_FONTS = 'https://fonts.googleapis.com/css2?family=Creepster&display=swap';

export const SM_CSS = cq(`
.sm{position:absolute;inset:0;overflow:hidden;color:#fbefdc;font-family:var(--rf-ui);-webkit-user-select:none;user-select:none;background:radial-gradient(120% 90% at 50% 20%,#2a1d3a 0%,#140c20 55%,#09060f 100%)}
.sm *{box-sizing:border-box}
:where(.sm) button{font:inherit;color:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
:where(.sm) button:focus-visible,:where(.sm) [tabindex]:focus-visible{outline:2px solid #ffcf7a;outline-offset:2px}
.sm .spook{font-family:'Creepster','Baloo 2',Georgia,serif;letter-spacing:.04em;font-weight:400}
.sm-stage{position:absolute;inset:0;background:#09060f}
.sm-stage>canvas{position:absolute;inset:0;width:100%;height:100%}
.sm-words{position:absolute;left:16px;right:16px;text-align:center;pointer-events:none}
.sm-words.low{left:0;right:0;bottom:0;padding:60px 18px calc(84px + var(--rf-safe-b,0px));background:linear-gradient(180deg,rgba(9,6,15,0),rgba(9,6,15,.78) 45%,rgba(9,6,15,.92))}
.sm-title{font-size:clamp(30px,9vw,60px);line-height:1;color:#ffcf7a;text-shadow:0 4px 30px rgba(0,0,0,.9),0 0 18px rgba(255,140,60,.35)}
.sm-sub{font-size:15px;margin-top:10px;color:#fbefdc;text-shadow:0 2px 10px #000}
.sm-btn{min-height:52px;border-radius:16px;border:0;background:linear-gradient(180deg,#ffd98f,#f0a945);color:#2c1606;font-weight:800;font-size:15px;padding:0 18px;box-shadow:0 6px 18px rgba(240,169,69,.25)}
.sm-btn.ghost{background:rgba(24,14,36,.72);color:#fbefdc;border:1.5px solid rgba(255,207,122,.35);box-shadow:none}
.sm-skip{position:absolute;right:14px;bottom:calc(14px + var(--rf-safe-b,0px));min-height:44px}
/* building */
.sm-build{position:absolute;inset:0;display:grid;grid-template-rows:auto minmax(0,1fr) auto auto;gap:8px;padding:8px 10px calc(10px + var(--rf-safe-b,0px))}
.sm-head{display:flex;align-items:center;gap:10px;min-height:44px;padding:4px 6px}
.sm-head b{font-family:'Creepster','Baloo 2',Georgia,serif;font-weight:400;font-size:clamp(20px,6vw,26px);color:#ffcf7a;letter-spacing:.03em;line-height:1}
.sm-head span{display:block;font-size:12.5px;opacity:.85;line-height:1.3;margin-top:2px}
.sm-canvas{position:relative;min-height:0;border-radius:18px;overflow:hidden;touch-action:none;background:#09060f;box-shadow:0 0 0 1.5px rgba(255,207,122,.22),0 18px 40px rgba(0,0,0,.5)}
.sm-canvas canvas{position:absolute;inset:0;width:100%;height:100%}
.sm-tip{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);padding:7px 14px;border-radius:999px;background:rgba(18,10,28,.82);border:1px solid rgba(255,207,122,.35);font-size:13px;font-weight:600;white-space:nowrap;pointer-events:none;transition:opacity .35s}
.sm-tray{display:flex;gap:8px;overflow-x:auto;overscroll-behavior-x:contain;scrollbar-width:none;padding:2px 2px 4px;touch-action:pan-x}
.sm-tray::-webkit-scrollbar{display:none}
.sm-item{flex:0 0 auto;width:72px;min-height:74px;border-radius:14px;border:1.5px solid rgba(255,207,122,.22);background:linear-gradient(180deg,rgba(66,42,30,.85),rgba(38,24,20,.9));display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:4px 2px;font-size:11px;touch-action:none}
.sm-item canvas{width:56px;height:44px}
.sm-item.used{opacity:.38;filter:saturate(.4)}
.sm-item.full{opacity:.55}
.sm-foot{display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:center}
.sm-tagbtn{min-height:52px;min-width:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;gap:6px;padding:0 12px;font-size:13px;font-weight:700}
.sm-tagbtn canvas{width:26px;height:26px}
.sm-chain{position:relative;overflow:hidden;touch-action:none}
.sm-chain i{position:absolute;left:0;bottom:0;height:5px;width:0;background:#fff3d6}
.sm-tags{position:absolute;left:10px;right:10px;bottom:calc(76px + var(--rf-safe-b,0px));z-index:12;padding:12px;border-radius:18px;background:rgba(18,10,28,.95);border:1.5px solid rgba(255,207,122,.35);box-shadow:0 14px 40px rgba(0,0,0,.6)}
.sm-tags p{margin:0 0 8px;font-size:13px;opacity:.85;text-align:center}
.sm-tags .grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.sm-tags button{min-height:64px;border-radius:12px;border:1.5px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-size:11px;padding:4px}
.sm-tags button canvas{width:30px;height:30px}
.sm-tags button.on{border-color:#ffcf7a;background:rgba(255,207,122,.16)}
.sm-tags .none{grid-column:1/-1;min-height:44px;flex-direction:row}
/* waiting */
.sm-wait{position:absolute;inset:0;z-index:30;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;text-align:center;background:radial-gradient(90% 70% at 50% 40%,rgba(42,26,48,.94),rgba(9,6,15,.97))}
.sm-wait h3{margin:0;font-family:'Creepster','Baloo 2',Georgia,serif;font-weight:400;font-size:clamp(26px,8vw,40px);color:#ffcf7a;letter-spacing:.04em}
.sm-chips{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;max-width:560px}
.sm-chip{display:flex;flex-direction:column;align-items:center;gap:3px;width:100px;font-size:12px}
.sm-chip img{width:60px;height:60px;object-fit:contain}
.sm-chip b{font-size:13px;max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sm-chip small{opacity:.75;font-size:10px}
/* the show */
.sm-over{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:10px;padding:14px 12px calc(12px + var(--rf-safe-b,0px));pointer-events:none}
.sm-over>*{pointer-events:auto}
.sm-over.dim{background:radial-gradient(90% 70% at 50% 45%,rgba(18,10,28,.82),rgba(9,6,15,.94));justify-content:center}
.sm-react{display:flex;gap:10px;justify-content:center}
.sm-react button{width:60px;height:60px;border-radius:50%;border:2px solid rgba(255,207,122,.4);background:rgba(18,10,28,.78);display:grid;place-items:center;padding:4px;transition:transform .12s}
.sm-react button:active{transform:scale(.9)}
.sm-react img{width:46px;height:46px;object-fit:contain}
.sm-pull{position:relative;overflow:hidden;min-width:min(320px,92%);min-height:60px;touch-action:none;font-size:16px}
.sm-pull i{position:absolute;left:0;bottom:0;height:6px;width:0;background:#2c1606;opacity:.5}
.sm-cap{padding:7px 16px;border-radius:999px;background:rgba(18,10,28,.82);border:1px solid rgba(255,207,122,.3);font-size:14px;font-weight:600;text-align:center;max-width:94%}
.sm-cap small{display:block;font-weight:500;font-size:12px;opacity:.8}
.sm-banner{position:absolute;left:50%;top:16%;transform:translateX(-50%);padding:9px 18px;border-radius:999px;background:rgba(255,207,122,.95);color:#2c1606;font-weight:800;font-size:15px;white-space:nowrap;animation:smBanner 2.4s ease-out forwards;pointer-events:none}
@keyframes smBanner{0%{opacity:0;transform:translate(-50%,10px)}12%{opacity:1;transform:translate(-50%,0)}80%{opacity:1}100%{opacity:0}}
.sm-line{font-family:'Creepster','Baloo 2',Georgia,serif;font-weight:400;font-size:clamp(24px,7vw,40px);color:#ffcf7a;text-align:center;letter-spacing:.04em;text-shadow:0 3px 18px rgba(0,0,0,.9)}
.sm-end{display:flex;flex-direction:column;align-items:center;gap:10px;width:100%;max-width:560px}
.sm-card{width:min(78%,300px);border-radius:14px;overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,.6)}
.sm-card canvas{display:block;width:100%;height:auto;max-height:44vh;object-fit:contain;background:#120c1f}
.sm-acts{display:flex;flex-wrap:wrap;justify-content:center;gap:10px}
.sm-consent{display:flex;align-items:center;gap:8px;font-size:13px;background:rgba(18,10,28,.8);padding:8px 12px;border-radius:12px}
.sm-consent input{width:22px;height:22px;accent-color:#ffcf7a}
@media (min-width:900px){
  .sm-build{grid-template-columns:minmax(0,1fr) 300px;grid-template-rows:auto minmax(0,1fr) auto;column-gap:16px;padding:12px 18px 16px}
  .sm-head{grid-column:1/3}
  .sm-canvas{grid-column:1;grid-row:2/4}
  .sm-tray{grid-column:2;grid-row:2;display:grid;grid-template-columns:1fr 1fr;align-content:start;overflow:visible}
  .sm-item{width:auto;min-height:86px}
  .sm-foot{grid-column:2;grid-row:3;grid-template-columns:1fr}
  .sm-tags{left:auto;right:18px;width:300px;bottom:110px}
}
@media (prefers-reduced-motion:reduce){.sm *{animation-duration:.01ms!important;transition-duration:.01ms!important}}
`);
