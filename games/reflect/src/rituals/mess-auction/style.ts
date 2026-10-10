import { cq } from '../../ui/dom';
/* The Glorious Mess Auction — a grand (and deeply unserious) auction house: burgundy velvet, gold leaf, cream paper.
 * Titles in Playfair Display (the pomp), UI in the console face. */
export const MA_FONTS = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;0,900;1,700&display=swap';

export const MA_CSS = cq(`
.ma{position:absolute;inset:0;overflow:hidden;color:#fbf3e3;font-family:var(--rf-ui);-webkit-user-select:none;user-select:none;background:radial-gradient(120% 90% at 50% 10%,#6e1529 0%,#3a0917 55%,#1d040b 100%)}
.ma *{box-sizing:border-box}
:where(.ma) button{font:inherit;color:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
:where(.ma) button:focus-visible,:where(.ma) [tabindex]:focus-visible{outline:2px solid #e9c46a;outline-offset:2px}
.ma .pomp{font-family:'Playfair Display',Georgia,serif;font-weight:800}
.ma-stage{position:absolute;inset:0;background:#1d040b}
.ma-stage>canvas{position:absolute;inset:0;width:100%;height:100%}
.ma-words{position:absolute;left:0;right:0;bottom:0;padding:60px 18px calc(84px + var(--rf-safe-b,0px));text-align:center;pointer-events:none;background:linear-gradient(180deg,rgba(29,4,11,0),rgba(29,4,11,.82) 45%,rgba(29,4,11,.94))}
.ma-title{font-family:'Playfair Display',Georgia,serif;font-weight:900;font-style:italic;font-size:clamp(30px,8.5vw,56px);line-height:1.02;color:#e9c46a;text-shadow:0 4px 24px rgba(0,0,0,.8)}
.ma-sub{font-size:15px;margin-top:10px;color:#fbf3e3}
.ma-btn{min-height:54px;border-radius:16px;border:0;background:linear-gradient(180deg,#f6d77a,#c99a3e);color:#2a1606;font-weight:800;font-size:15px;padding:0 20px;box-shadow:0 6px 18px rgba(201,154,62,.25)}
.ma-btn.ghost{background:rgba(29,4,11,.7);color:#fbf3e3;border:1.5px solid rgba(233,196,106,.4);box-shadow:none}
.ma-btn:disabled{opacity:.45}
.ma-skip{position:absolute;right:14px;bottom:calc(14px + var(--rf-safe-b,0px));min-height:44px}
/* drawing */
.ma-draw{position:absolute;inset:0;display:grid;grid-template-rows:auto minmax(0,1fr) auto;gap:10px;padding:8px 12px calc(12px + var(--rf-safe-b,0px));justify-items:center}
.ma-head{text-align:center;min-height:52px;display:flex;flex-direction:column;justify-content:center}
.ma-head b{font-family:'Playfair Display',Georgia,serif;font-weight:800;font-style:italic;font-size:clamp(22px,6.4vw,30px);color:#e9c46a;line-height:1.05}
.ma-head span{display:block;font-size:13px;opacity:.85;margin-top:3px}
.ma-easel{position:relative;width:100%;height:100%;min-height:0;display:flex;align-items:center;justify-content:center}
.ma-paper{position:relative;flex:none;width:300px;height:300px;max-width:100%;max-height:100%;border-radius:6px;box-shadow:0 0 0 10px #c99a3e,0 0 0 12px #8a6420,0 22px 50px rgba(0,0,0,.55);background:#f7efe0;touch-action:none;overflow:hidden;outline:none}
.ma-paper:focus-visible{box-shadow:0 0 0 10px #c99a3e,0 0 0 13px #fff3c4,0 22px 50px rgba(0,0,0,.55)}
.ma-paper canvas{position:absolute;inset:0;width:100%;height:100%}
.ma-fx{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2}
.ma-foot{width:100%;max-width:560px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:176px}
.ma-row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;width:100%}
.ma-row .ma-btn{flex:1;min-width:140px}
.ma-hint{font-size:12.5px;opacity:.85;text-align:center;min-height:18px}
.ma-price{width:100%;display:flex;flex-direction:column;align-items:center;gap:6px}
.ma-price .amt{font-family:'Playfair Display',Georgia,serif;font-weight:900;font-size:clamp(30px,9vw,44px);color:#ffe9a8;line-height:1}
.ma-price .amt small{font-size:.45em;font-weight:700;color:#e9c46a;margin-left:6px}
.ma-price input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:44px;background:transparent;margin:0;touch-action:pan-y}
.ma-price input[type=range]::-webkit-slider-runnable-track{height:10px;border-radius:999px;background:linear-gradient(90deg,#8a6420,#e9c46a 60%,#fff3c4);box-shadow:inset 0 1px 3px rgba(0,0,0,.5)}
.ma-price input[type=range]::-moz-range-track{height:10px;border-radius:999px;background:linear-gradient(90deg,#8a6420,#e9c46a 60%,#fff3c4)}
.ma-price input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:34px;height:34px;margin-top:-12px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#d6455d,#9b1b30 60%,#6e1020);border:3px solid #fff3c4;box-shadow:0 3px 10px rgba(0,0,0,.5)}
.ma-price input[type=range]::-moz-range-thumb{width:30px;height:30px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#d6455d,#9b1b30 60%,#6e1020);border:3px solid #fff3c4}
.ma-price input[type=range]:focus-visible{outline:2px solid #fff3c4;outline-offset:4px;border-radius:999px}
.ma-seal{position:relative;overflow:hidden;touch-action:none;width:100%}
.ma-seal i{position:absolute;left:0;bottom:0;height:6px;width:0;background:#7a1830}
/* waiting */
.ma-wait{position:absolute;inset:0;z-index:30;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;text-align:center;background:radial-gradient(90% 70% at 50% 40%,rgba(110,21,41,.95),rgba(29,4,11,.98))}
.ma-wait h3{margin:0;font-family:'Playfair Display',Georgia,serif;font-weight:900;font-style:italic;font-size:clamp(26px,8vw,40px);color:#e9c46a}
.ma-chips{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;max-width:560px}
.ma-chip{display:flex;flex-direction:column;align-items:center;gap:3px;width:100px;font-size:12px}
.ma-chip img{width:60px;height:60px;object-fit:contain}
.ma-chip b{font-size:13px;max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ma-chip small{opacity:.75;font-size:10px}
/* the auction */
.ma-over{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:8px;padding:12px 12px calc(12px + var(--rf-safe-b,0px));pointer-events:none}
.ma-over>*{pointer-events:auto}
.ma-over.dim{background:radial-gradient(90% 70% at 50% 45%,rgba(58,9,23,.86),rgba(29,4,11,.96));justify-content:center}
.ma-paddle{position:relative;width:min(340px,94%);min-height:64px;border-radius:999px;border:0;font-weight:900;font-size:17px;letter-spacing:.02em;touch-action:none;background:linear-gradient(180deg,#fbf3e3,#e2d2b0);color:#2a1606;box-shadow:0 0 0 3px #c99a3e,0 10px 30px rgba(0,0,0,.45)}
.ma-paddle.up{background:linear-gradient(180deg,#ffe9a8,#e9c46a);box-shadow:0 0 0 3px #fff3c4,0 0 40px rgba(233,196,106,.6)}
.ma-paddle.out{opacity:.6;box-shadow:0 0 0 2px rgba(201,154,62,.5)}
.ma-paddle.pulse{animation:maPulse 1s ease-in-out infinite}
@keyframes maPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
.ma-cap{padding:7px 16px;border-radius:999px;background:rgba(29,4,11,.84);border:1px solid rgba(233,196,106,.35);font-size:14px;font-weight:600;text-align:center;max-width:94%}
.ma-cap small{display:block;font-weight:500;font-size:12px;opacity:.8}
.ma-line{font-family:'Playfair Display',Georgia,serif;font-weight:900;font-style:italic;font-size:clamp(24px,7vw,40px);color:#e9c46a;text-align:center;text-shadow:0 3px 18px rgba(0,0,0,.9)}
.ma-end{display:flex;flex-direction:column;align-items:center;gap:10px;width:100%;max-width:560px}
.ma-card{width:min(76%,300px);border-radius:14px;overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,.6)}
.ma-card canvas{display:block;width:100%;height:auto;max-height:44vh;object-fit:contain;background:#3a0917}
.ma-acts{display:flex;flex-wrap:wrap;justify-content:center;gap:10px}
.ma-consent{display:flex;align-items:center;gap:8px;font-size:13px;background:rgba(29,4,11,.8);padding:8px 12px;border-radius:12px}
.ma-consent input{width:22px;height:22px;accent-color:#e9c46a}
.ma-banner{position:absolute;left:50%;top:14%;transform:translateX(-50%);padding:9px 18px;border-radius:999px;background:rgba(233,196,106,.96);color:#2a1606;font-weight:800;font-size:15px;white-space:nowrap;animation:maBanner 2.4s ease-out forwards;pointer-events:none}
@keyframes maBanner{0%{opacity:0;transform:translate(-50%,10px)}12%{opacity:1;transform:translate(-50%,0)}80%{opacity:1}100%{opacity:0}}
@media (min-width:900px){
  .ma-draw{grid-template-columns:minmax(0,1fr) 340px;grid-template-rows:auto minmax(0,1fr);column-gap:24px;padding:14px 24px 18px}
  .ma-head{grid-column:1/3}
  .ma-easel{grid-column:1;grid-row:2}
  .ma-foot{grid-column:2;grid-row:2;align-self:center;min-height:0}
}
@media (prefers-reduced-motion:reduce){.ma *{animation-duration:.01ms!important;transition-duration:.01ms!important}}
`);
