/* Emotional Rollercoaster — a theme park at sunset: ride signage (Bungee), neon edges, a coaster lever to lock in. */
export const ER_FONTS = 'https://fonts.googleapis.com/css2?family=Bungee&display=swap';

export const ER_CSS = `
.er{position:absolute;inset:0;overflow:hidden;color:#fff4ea;font-family:var(--rf-ui);-webkit-user-select:none;user-select:none;background:linear-gradient(180deg,#1b1640 0%,#4a2f7a 45%,#c65d8a 80%,#ff9a76 100%)}
.er *{box-sizing:border-box}
:where(.er) button{font:inherit;color:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
:where(.er) button:focus-visible,:where(.er) [tabindex]:focus-visible{outline:2px solid #ffd27a;outline-offset:2px}
.er .sign{font-family:'Bungee','Baloo 2',system-ui,sans-serif;letter-spacing:.02em}
.er-build{position:absolute;inset:0;display:grid;grid-template-rows:auto 1fr auto auto auto;gap:8px;padding:8px 12px calc(10px + var(--rf-safe-b,0px))}
.er-card{display:grid;grid-template-columns:52px 1fr;gap:10px;align-items:center;padding:8px 12px;border-radius:14px;background:rgba(20,14,40,.7);border:1px solid rgba(255,214,140,.25);min-height:66px}
.er-card canvas{width:52px;height:52px}
.er-card b{display:block;font-family:'Bungee','Baloo 2',sans-serif;font-weight:400;font-size:13px;color:#ffd27a}
.er-card span{display:block;font-size:15px;font-weight:600;line-height:1.2}
.er-card small{display:block;font-size:12px;opacity:.75;margin-top:2px}
.er-canvas{position:relative;min-height:0;border-radius:16px;overflow:hidden;box-shadow:0 14px 34px rgba(0,0,0,.45),0 0 0 2px rgba(255,214,140,.25);touch-action:none;cursor:ns-resize;background:#1b1640}
.er-canvas canvas{position:absolute;inset:0;width:100%;height:100%}
.er-canvas .lab{position:absolute;right:8px;font-size:11px;font-weight:600;color:rgba(255,244,234,.75);pointer-events:none;text-shadow:0 1px 3px #000}
.er-mods{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}
.er-mod{min-height:48px;border-radius:12px;border:1.5px solid rgba(255,255,255,.18);background:rgba(20,14,40,.6);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;font-size:11px;padding:2px}
.er-mod canvas{width:28px;height:20px}
.er-mod.on{border-color:#ffd27a;background:rgba(255,210,122,.18)}
.er-mod.cur{box-shadow:inset 0 -3px 0 #ffd27a}
.er-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:center}
.er-btn{min-height:54px;border-radius:16px;border:0;background:#ffd27a;color:#2a1a05;font-weight:800;font-size:15px}
.er-btn.ghost{background:rgba(20,14,40,.65);color:#fff4ea;border:1.5px solid rgba(255,214,140,.35)}
.er-lever{position:relative;overflow:hidden;background:linear-gradient(180deg,#e63946,#a3161c);color:#fff;font-family:'Bungee','Baloo 2',sans-serif;font-weight:400;letter-spacing:.03em;touch-action:none}
.er-lever i{position:absolute;left:0;bottom:0;height:6px;width:0;background:#ffd27a}
.er-hint{font-size:12px;text-align:center;opacity:.85}
.er-test{position:absolute;inset:0;z-index:20;background:#000}
.er-test canvas{position:absolute;inset:0;width:100%;height:100%}
.er-hud{position:absolute;left:0;right:0;top:10px;display:flex;justify-content:center;pointer-events:none}
.er-hud div{display:flex;align-items:center;gap:8px;padding:6px 12px 6px 6px;border-radius:999px;background:rgba(20,14,40,.75);border:1px solid rgba(255,214,140,.3);font-size:14px;font-weight:600;max-width:92%;transition:opacity .3s,transform .3s}
.er-hud canvas{width:34px;height:34px}
.er-hud b{font-family:'Bungee','Baloo 2',sans-serif;font-weight:400;color:#ffd27a}
.er-close{position:absolute;right:12px;bottom:calc(12px + var(--rf-safe-b,0px));z-index:5}
.er-wait{position:absolute;inset:0;z-index:30;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;text-align:center;background:rgba(20,14,40,.86);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}
.er-wait h3{margin:0;font-family:'Bungee','Baloo 2',sans-serif;font-weight:400;font-size:24px;color:#ffd27a}
.er-chips{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;max-width:560px}
.er-chip{display:flex;flex-direction:column;align-items:center;gap:3px;width:100px;font-size:12px}
.er-chip img{width:60px;height:60px;object-fit:contain}
.er-chip b{font-size:13px;max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.er-chip small{opacity:.75;font-size:10px}
/* ride + station + finale */
.er-stage{position:absolute;inset:0;background:#07061a}
.er-stage>canvas{position:absolute;inset:0;width:100%;height:100%}
.er-over{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:10px;padding:14px 14px calc(14px + var(--rf-safe-b,0px));pointer-events:none}
.er-over>*{pointer-events:auto}
.er-switch{display:flex;flex-direction:column;align-items:center;gap:8px;padding:10px 14px;border-radius:18px;background:rgba(20,14,40,.82);border:2px solid #ffd27a;box-shadow:0 0 30px rgba(255,210,122,.35);animation:erPulse .8s ease-in-out infinite alternate}
@keyframes erPulse{to{box-shadow:0 0 50px rgba(255,210,122,.6)}}
.er-switch b{font-family:'Bungee','Baloo 2',sans-serif;font-weight:400;font-size:14px;color:#ffd27a}
.er-switch .row{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.er-switch button{min-height:48px;padding:0 12px 0 6px;border-radius:999px;border:0;background:#ffd27a;color:#2a1a05;font-weight:700;display:flex;align-items:center;gap:6px}
.er-switch button img{width:36px;height:36px;object-fit:contain}
.er-banner{position:absolute;left:50%;top:12%;transform:translateX(-50%);padding:8px 16px;border-radius:999px;background:rgba(255,210,122,.95);color:#2a1a05;font-weight:700;font-size:14px;white-space:nowrap;animation:erBanner 2.6s ease-out forwards;pointer-events:none}
@keyframes erBanner{0%{opacity:0;transform:translate(-50%,10px)}12%{opacity:1;transform:translate(-50%,0)}80%{opacity:1}100%{opacity:0}}
.er-div{max-width:640px;width:100%;padding:12px 14px;border-radius:16px;background:rgba(20,14,40,.88);border:1px solid rgba(255,214,140,.3);font-size:15px;line-height:1.35;text-align:center}
.er-div b{font-family:'Bungee','Baloo 2',sans-serif;font-weight:400;color:#ffd27a;display:block;font-size:13px;margin-bottom:4px}
.er-line{font-family:'Bungee','Baloo 2',sans-serif;font-size:clamp(15px,4.2vw,22px);text-align:center;color:#ffd27a;text-shadow:0 2px 12px rgba(0,0,0,.8);max-width:640px}
.er-acts{display:flex;flex-wrap:wrap;justify-content:center;gap:10px}
.er-note{font-size:12px;opacity:.8;text-align:center}
.er-consent{display:flex;align-items:center;gap:8px;font-size:13px;background:rgba(20,14,40,.75);padding:8px 12px;border-radius:12px}
.er-consent input{width:22px;height:22px;accent-color:#ffd27a}
.er-photo{width:min(90vw,420px);border-radius:14px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,.6)}
.er-photo canvas{display:block;width:100%;height:auto;max-height:50vh;object-fit:contain;background:#1b1640}
@media (min-width:900px){
  .er-build{grid-template-columns:minmax(0,1fr) 320px;grid-template-rows:auto 1fr auto;column-gap:16px;padding:12px 20px 16px}
  .er-card{grid-column:2;grid-row:1}
  .er-canvas{grid-column:1;grid-row:1/4}
  .er-mods{grid-column:2;grid-row:2;align-self:start;grid-template-columns:1fr}
  .er-mod{flex-direction:row;justify-content:flex-start;gap:10px;padding:0 12px;font-size:13px}
  .er-actions{grid-column:2;grid-row:3;grid-template-columns:1fr}
  .er-hint{grid-column:2}
}
@media (prefers-reduced-motion:reduce){.er *{animation-duration:.01ms!important;transition-duration:.01ms!important}}
`;
