/* ================================================================== */
/* Theme — tokens, typography, global CSS                              */
/* ================================================================== */

type ThemeName = "dark" | "bright"

const FONT = `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
const FONT_ROUND = `ui-rounded, "SF Pro Rounded", -apple-system, BlinkMacSystemFont, "Nunito", "Inter", system-ui, sans-serif`

const THEMES: Record<ThemeName, Record<string, string>> = {
    dark: {
        "--bg0": "#090817",
        "--bg1": "#141032",
        "--bg2": "#0a1a2e",
        "--ink": "#F5F3FF",
        "--ink2": "rgba(236,233,255,.74)",
        "--ink3": "rgba(236,233,255,.52)",
        "--hair": "rgba(255,255,255,.12)",
        "--hair2": "rgba(255,255,255,.06)",
        "--fill": "rgba(255,255,255,.07)",
        "--fill2": "rgba(255,255,255,.12)",
        "--surface": "rgba(24,21,48,.80)",
        "--surfaceSolid": "#1a1735",
        "--sheet": "rgba(20,18,40,.92)",
        "--accent": "#FFC98B",
        "--accentHi": "#FFE0B8",
        "--accentGlow": "rgba(255,190,120,.35)",
        "--bgTop": "#2a1f66",
        "--accentInk": "#2A1708",
        "--accent2": "#8CD6FF",
        "--good": "#7EF0C2",
        "--warn": "#FF8F7A",
        "--shadow": "0 18px 50px rgba(0,0,0,.45)",
        "--orbGlass": "rgba(255,255,255,.07)",
        "--orbRim": "rgba(255,255,255,.34)",
        "--orbText": "#FFFFFF",
        "--orbTextShadow": "0 1px 2px rgba(10,6,30,.55)",
        "--corona": "255,196,128",
        "--coronaCool": "140,214,255",
        "--core": "#06050f",
        "--coreLift": "#1b1640",
        "--scrim": "rgba(6,5,18,.55)",
    },
    bright: {
        "--bg0": "#F8F5FF",
        "--bg1": "#FFF3E6",
        "--bg2": "#E8F1FF",
        "--ink": "#16132B",
        "--ink2": "rgba(22,19,43,.70)",
        "--ink3": "rgba(22,19,43,.50)",
        "--hair": "rgba(22,19,43,.12)",
        "--hair2": "rgba(22,19,43,.06)",
        "--fill": "rgba(255,255,255,.62)",
        "--fill2": "rgba(255,255,255,.86)",
        "--surface": "rgba(255,255,255,.82)",
        "--surfaceSolid": "#ffffff",
        "--sheet": "rgba(250,248,255,.95)",
        "--accent": "#D9822B",
        "--accentHi": "#F0A85A",
        "--accentGlow": "rgba(217,130,43,.32)",
        "--bgTop": "#ffe9d2",
        "--accentInk": "#FFFFFF",
        "--accent2": "#3D6FF5",
        "--good": "#14A372",
        "--warn": "#D2492F",
        "--shadow": "0 18px 44px rgba(60,40,120,.18)",
        "--orbGlass": "rgba(255,255,255,.42)",
        "--orbRim": "rgba(255,255,255,.95)",
        "--orbText": "#1B1735",
        "--orbTextShadow": "0 1px 0 rgba(255,255,255,.7)",
        "--corona": "255,170,80",
        "--coronaCool": "110,160,255",
        "--core": "#14112e",
        "--coreLift": "#2d2768",
        "--scrim": "rgba(40,30,80,.28)",
    },
}

function themeVars(name: ThemeName): React.CSSProperties {
    return THEMES[name] as unknown as React.CSSProperties
}

/** Global stylesheet. Everything is scoped under .tsm so nothing leaks into the host page. */
const TSM_CSS = String.raw`
.tsm{position:relative;width:100%;height:100%;overflow:hidden;font-family:${FONT};color:var(--ink);background:var(--bg0);
  -webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility;isolation:isolate;
  -webkit-user-select:none;user-select:none;-webkit-touch-callout:none;contain:layout paint;}
.tsm *,.tsm *::before,.tsm *::after{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
.tsm button{font:inherit;color:inherit;background:none;border:0;padding:0;margin:0;cursor:pointer;touch-action:manipulation}
.tsm button:disabled{cursor:default}
.tsm :focus{outline:none}
.tsm :focus-visible{outline:2px solid var(--accent2);outline-offset:3px;border-radius:12px}
.tsm input,.tsm textarea{font:inherit;color:inherit;-webkit-user-select:text;user-select:text}
.tsm img{-webkit-user-drag:none;user-select:none}
.tsm .tsmStage{touch-action:none;-webkit-user-select:none;user-select:none}

/* ---------- app backdrop (living night / airy dawn) ---------- */
.tsm .tsmBackdrop{position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden;
  background:
    radial-gradient(120% 70% at 50% -10%, var(--bgTop) 0%, transparent 62%),
    radial-gradient(90% 60% at 100% 100%, var(--bg2) 0%, transparent 70%),
    linear-gradient(180deg, var(--bg0), var(--bg1) 140%);}
.tsm[data-theme=bright] .tsmBackdrop{background:
    radial-gradient(120% 70% at 50% -10%, #ffe9d2 0%, transparent 60%),
    radial-gradient(100% 70% at 0% 100%, #e3ecff 0%, transparent 70%),
    radial-gradient(80% 60% at 100% 80%, #f6e6ff 0%, transparent 70%),
    linear-gradient(180deg, #faf7ff, #fff6ee);}
.tsm .tsmNebula{position:absolute;border-radius:50%;filter:blur(40px);opacity:.55;will-change:transform}
.tsm .tsmMote{position:absolute;width:2px;height:2px;border-radius:50%;background:#fff;opacity:.0;
  box-shadow:0 0 6px rgba(255,236,210,.9);animation:tsmMote var(--d,14s) linear infinite;animation-delay:var(--dl,0s)}
.tsm[data-theme=bright] .tsmMote{background:#ffb866;box-shadow:0 0 6px rgba(255,170,90,.8)}
@keyframes tsmMote{0%{transform:translate3d(0,0,0);opacity:0}15%{opacity:.7}85%{opacity:.45}100%{transform:translate3d(var(--mx,20px),-120px,0);opacity:0}}
@keyframes tsmDrift{0%,100%{transform:translate3d(0,0,0) scale(1)}50%{transform:translate3d(var(--nx,20px),var(--ny,-16px),0) scale(1.08)}}

/* ---------- typography ---------- */
.tsm .tLarge{font-size:30px;line-height:1.08;font-weight:700;letter-spacing:-.022em}
.tsm .tTitle{font-size:22px;line-height:1.15;font-weight:650;letter-spacing:-.018em}
.tsm .tHead{font-size:17px;line-height:1.25;font-weight:600;letter-spacing:-.012em}
.tsm .tBody{font-size:16px;line-height:1.38;font-weight:400;letter-spacing:-.008em}
.tsm .tSub{font-size:14px;line-height:1.35;font-weight:400;color:var(--ink2)}
.tsm .tCap{font-size:12px;line-height:1.25;font-weight:500;letter-spacing:.01em;color:var(--ink3)}
.tsm .tEyebrow{font-size:11px;line-height:1;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--ink3)}

/* ---------- controls ---------- */
.tsm .tsmPrimary{height:54px;border-radius:27px;padding:0 26px;display:inline-flex;align-items:center;justify-content:center;gap:10px;
  font-size:17px;font-weight:600;letter-spacing:-.01em;color:var(--accentInk);
  background:linear-gradient(180deg, var(--accentHi), var(--accent));
  box-shadow:0 10px 30px var(--accentGlow), inset 0 1px 0 rgba(255,255,255,.45);
  transition:transform .18s cubic-bezier(.2,.8,.2,1), opacity .2s}
.tsm .tsmPrimary:active{transform:scale(.965)}
.tsm .tsmPrimary:disabled{opacity:.42}
.tsm .tsmSecondary{height:50px;border-radius:25px;padding:0 22px;display:inline-flex;align-items:center;justify-content:center;gap:8px;
  font-size:16px;font-weight:550;color:var(--ink);background:var(--fill);box-shadow:inset 0 0 0 1px var(--hair);transition:transform .18s}
.tsm .tsmSecondary:active{transform:scale(.965)}
.tsm .tsmGhost{min-height:44px;padding:0 14px;display:inline-flex;align-items:center;justify-content:center;gap:6px;font-size:15px;font-weight:500;color:var(--ink2);border-radius:22px}
.tsm .tsmGhost:active{opacity:.6}
.tsm .tsmIconBtn{width:44px;height:44px;border-radius:22px;display:grid;place-items:center;color:var(--ink);transition:transform .15s, background .2s}
.tsm .tsmIconBtn:active{transform:scale(.9);background:var(--fill)}
.tsm .tsmIconBtn[aria-disabled=true]{opacity:.32}
.tsm .tsmPill{display:inline-flex;align-items:center;gap:8px;height:34px;padding:0 14px;border-radius:17px;font-size:14px;font-weight:500;
  color:var(--ink);background:var(--fill);box-shadow:inset 0 0 0 1px var(--hair2);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}

/* ---------- character idle performances (applied to the inner face layer) ---------- */
@keyframes tsmNervous{0%,100%{transform:rotate(0) translateX(0)}20%{transform:rotate(-2.4deg) translateX(-1px)}40%{transform:rotate(2deg) translateX(1px)}60%{transform:rotate(-1.6deg)}80%{transform:rotate(1.2deg) translateX(.5px)}}
@keyframes tsmTremble{0%,62%,100%{transform:translate(0,0)}64%{transform:translate(-1.6px,.4px)}68%{transform:translate(1.8px,-.4px)}72%{transform:translate(-1.4px,0)}76%{transform:translate(1.2px,.4px)}80%{transform:translate(-.8px,0)}84%{transform:translate(0,0)}}
@keyframes tsmDroop{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(3px) rotate(-2.5deg) scale(.985,1.01)}}
@keyframes tsmTilt{0%,100%{transform:rotate(0)}35%{transform:rotate(7deg)}65%{transform:rotate(-3deg)}}
@keyframes tsmBounce{0%,100%{transform:translateY(0) scale(1,1)}30%{transform:translateY(-7px) scale(.96,1.05)}55%{transform:translateY(0) scale(1.06,.94)}70%{transform:translateY(-2px) scale(.99,1.01)}}
@keyframes tsmFloat{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-6px) rotate(1.5deg)}}
@keyframes tsmHappy{0%,100%{transform:rotate(0) scale(1)}25%{transform:rotate(-4deg) scale(1.03)}50%{transform:rotate(0) scale(1)}75%{transform:rotate(4deg) scale(1.03)}}
@keyframes tsmSpin{to{transform:rotate(360deg)}}
@keyframes tsmSpinRev{to{transform:rotate(-360deg)}}
@keyframes tsmPulse{0%,100%{opacity:.55;transform:scale(1)}50%{opacity:1;transform:scale(1.06)}}
@keyframes tsmFadeUp{from{opacity:0;transform:translate3d(0,10px,0)}to{opacity:1;transform:none}}
@keyframes tsmFadeIn{from{opacity:0}to{opacity:1}}
@keyframes tsmRing{0%{transform:scale(.6);opacity:.9}100%{transform:scale(1.9);opacity:0}}
@keyframes tsmShimmer{0%{transform:translateX(-120%)}100%{transform:translateX(220%)}}
@keyframes tsmHint{0%,100%{transform:translate3d(0,0,0);opacity:.95}50%{transform:translate3d(var(--hx,0px),var(--hy,-10px),0);opacity:.75}}

@media (prefers-reduced-motion: reduce){
  .tsm .tsmMote,.tsm .tsmNebula{animation:none!important}
}
.tsm[data-calm=true] .tsmMote{display:none}
.tsm[data-calm=true] .tsmNebula{animation:none!important}
`
