/* Reflect console chrome: hub, lobby, top bar. Uses the ThinkStill console faces (Baloo 2 + Fredoka) and the shared
 * dark / bright theme; each ritual brings its own world inside the stage. */
export const RF_FONTS = 'https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;800&family=Fredoka:wght@400;500;600;700&display=swap';

import { cq } from '../ui/dom';

export const RF_CSS = cq(`
:host{all:initial;display:block;position:relative;width:100%;height:100%}
.rf{--rf-ui:'Fredoka',ui-rounded,system-ui,-apple-system,'Segoe UI',sans-serif;--rf-display:'Baloo 2','Fredoka',ui-rounded,system-ui,sans-serif;
  --bg:#0f0d1f;--bg2:#1a1733;--card:#221e40;--line:rgba(255,255,255,.12);--fg:#f5f1ff;--mut:rgba(245,241,255,.7);--acc:#ffd27a;--acc2:#7fd8ff;--danger:#ff6b6b;
  position:absolute;inset:0;overflow:hidden;background:var(--bg);color:var(--fg);font-family:var(--rf-ui);font-size:15px;line-height:1.35;-webkit-font-smoothing:antialiased;
  --rf-safe-b:env(safe-area-inset-bottom,0px);--rf-safe-t:env(safe-area-inset-top,0px);
  container-type:size;container-name:rf}
.rf[data-theme=bright]{--bg:#f6f2ff;--bg2:#ece6ff;--card:#ffffff;--line:rgba(30,20,70,.12);--fg:#1d1838;--mut:rgba(29,24,56,.68);--acc:#e8a33a;--acc2:#2b8fd6}
.rf *{box-sizing:border-box}
:where(.rf) button{font:inherit;color:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
:where(.rf) button:focus-visible,:where(.rf) input:focus-visible{outline:2px solid var(--acc);outline-offset:2px}
.rf-bar{position:absolute;left:0;right:0;top:0;height:calc(48px + var(--rf-safe-t));padding:var(--rf-safe-t) 8px 0;display:flex;align-items:center;gap:6px;z-index:40;background:linear-gradient(180deg,rgba(10,8,22,.85),rgba(10,8,22,0));color:#f5f1ff}
.rf-bar .ttl{flex:1;min-width:0;font-family:var(--rf-display);font-weight:800;font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center}
.rf-ib{width:44px;height:44px;border-radius:12px;border:0;background:rgba(255,255,255,.08);display:grid;place-items:center;color:inherit}
.rf-ib svg{width:20px;height:20px}
.rf-stage{position:absolute;left:0;right:0;bottom:0;top:calc(48px + var(--rf-safe-t))}
.rf-scroll{position:absolute;inset:0;overflow:auto;-webkit-overflow-scrolling:touch}
.rf-hub{max-width:1100px;margin:0 auto;padding:calc(18px + var(--rf-safe-t)) 16px calc(28px + var(--rf-safe-b))}
.rf-brand{display:flex;align-items:center;gap:12px;margin-bottom:6px}
.rf-brand h1{margin:0;font-family:var(--rf-display);font-weight:800;font-size:clamp(30px,8vw,46px);letter-spacing:-.01em;line-height:1}
.rf-brand .sp{flex:1}
.rf-sub{color:var(--mut);margin:0 0 18px;font-size:15px;max-width:560px}
.rf-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:16px}
.rf-card{position:relative;display:flex;flex-direction:column;border-radius:20px;overflow:hidden;background:var(--card);border:1px solid var(--line);box-shadow:0 14px 34px rgba(0,0,0,.25)}
.rf-card .pv{position:relative;aspect-ratio:16/10;background:#000;overflow:hidden}
.rf-card .pv canvas{position:absolute;inset:0;width:100%;height:100%}
.rf-card .pv .tag{position:absolute;left:10px;top:10px;padding:3px 9px;border-radius:999px;background:rgba(10,8,22,.7);color:#fff;font-size:12px}
.rf-card .bd{padding:12px 14px 14px;display:flex;flex-direction:column;gap:8px;flex:1}
.rf-card h2{margin:0;font-family:var(--rf-display);font-weight:800;font-size:22px;line-height:1.1}
.rf-card p{margin:0;color:var(--mut);font-size:14px}
.rf-card .meta{display:flex;gap:8px;flex-wrap:wrap;font-size:12px;color:var(--mut)}
.rf-card .meta span{padding:2px 8px;border-radius:999px;border:1px solid var(--line)}
.rf-card .act{display:flex;gap:8px;flex-wrap:wrap;margin-top:auto;padding-top:4px}
.rf-card.soon .pv{filter:saturate(.4) brightness(.7)}
.rf-btn{min-height:46px;padding:0 18px;border-radius:999px;border:0;background:var(--acc);color:#251803;font-weight:700;font-size:15px;display:inline-flex;align-items:center;justify-content:center;gap:6px}
.rf-btn.sec{background:transparent;color:var(--fg);border:1.5px solid var(--line)}
.rf-btn[disabled]{opacity:.45;cursor:not-allowed}
.rf-join{display:flex;gap:8px;align-items:center;margin-top:18px;flex-wrap:wrap}
.rf-in{min-height:46px;padding:0 14px;border-radius:12px;border:1.5px solid var(--line);background:var(--bg2);color:var(--fg);font:inherit;font-size:16px}
.rf-code{letter-spacing:.3em;text-transform:uppercase;width:150px;font-weight:700}
.rf-lobby{max-width:640px;margin:0 auto;padding:calc(64px + var(--rf-safe-t)) 16px calc(24px + var(--rf-safe-b));display:flex;flex-direction:column;gap:16px}
.rf-lobby h2{margin:0;font-family:var(--rf-display);font-weight:800;font-size:26px}
.rf-roomcode{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:14px;border-radius:16px;background:var(--card);border:1px solid var(--line)}
.rf-roomcode b{font-family:var(--rf-display);font-size:34px;letter-spacing:.18em}
.rf-roomcode .lnk{flex:1;min-width:0;font-size:12px;color:var(--mut);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;user-select:all}
.rf-seats{display:flex;flex-direction:column;gap:8px}
.rf-seat{display:grid;grid-template-columns:52px minmax(0,1fr) auto;gap:10px;align-items:center;padding:8px 10px;border-radius:14px;background:var(--card);border:1px solid var(--line)}
.rf-seat img{width:52px;height:52px;object-fit:contain}
.rf-seat b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rf-seat small{color:var(--mut);font-size:12px}
.rf-seat .x{min-height:40px;padding:0 12px;border-radius:999px;border:1px solid var(--line);background:transparent;font-size:13px}
.rf-me{display:flex;flex-direction:column;gap:8px;padding:12px;border-radius:16px;background:var(--bg2)}
.rf-avs{display:flex;gap:6px;flex-wrap:wrap}
.rf-av{width:48px;height:48px;border-radius:50%;border:2px solid transparent;background:rgba(255,255,255,.06);padding:2px}
.rf-av img{width:100%;height:100%;object-fit:contain}
.rf-av[aria-pressed=true]{border-color:var(--acc)}
.rf-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.rf-note{font-size:13px;color:var(--mut)}
.rf-toast{position:absolute;left:50%;bottom:calc(24px + var(--rf-safe-b));transform:translate(-50%,20px);padding:10px 16px;border-radius:999px;background:#1d1838;color:#fff;font-size:14px;opacity:0;transition:opacity .2s,transform .2s;z-index:90;pointer-events:none;max-width:90%;text-align:center}
.rf-toast.on{opacity:1;transform:translate(-50%,0)}
.rf-status{position:absolute;right:10px;top:calc(56px + var(--rf-safe-t));z-index:45;padding:4px 10px;border-radius:999px;background:rgba(255,107,107,.9);color:#fff;font-size:12px}
@media (prefers-reduced-motion:reduce){.rf *{animation-duration:.01ms!important;transition-duration:.01ms!important}}
`);
