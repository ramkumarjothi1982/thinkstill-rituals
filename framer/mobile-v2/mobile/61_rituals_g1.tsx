/* ================================================================== */
/* Ritual re-composition · group g1                                  */
/* ================================================================== */
// Phone layout + world styling for this group's rituals. Selectors must start with ${TSM_B} (or ${TSM_BR}
// for bright-only rules) and target the ritual by its data-ritual id on the shell, e.g.
//   ${TSM_B} .tsmShell[data-ritual="1"] .burstArena { ... }
//
// g1 = 1 POP (twilight lagoon) · 6 ZAP (storm lab) · 15 SHRED (lamp-lit desk) · 22 FLUSH (porcelain basin at night)
//      · 25 SWIPE AWAY (spotlit card table). Every world is painted on the ritual's own .arena so it is the same in
// dark and bright chrome; every text sits on its own object (bubble glass, paper, card, chip), so it reads in both.
// The engines add state classes for the ritual-owned climaxes (≤ 1.5 s, no text, before the approved burst):
//   POP .mv2Cleared · ZAP .zapPhase-done · SHRED .mv2Final · FLUSH .mv2Final · SWIPE AWAY .mv2Final

const G1_ALL = `${TSM_B} .tsmShell:is([data-ritual="1"],[data-ritual="6"],[data-ritual="15"],[data-ritual="22"],[data-ritual="25"]) .releaseGameHost`
const G1_POP = `${TSM_B} .tsmShell[data-ritual="1"] .releaseGameHost`
const G1_ZAP = `${TSM_B} .tsmShell[data-ritual="6"] .releaseGameHost`
const G1_SHRED = `${TSM_B} .tsmShell[data-ritual="15"] .releaseGameHost`
const G1_FLUSH = `${TSM_B} .tsmShell[data-ritual="22"] .releaseGameHost`
const G1_SWIPE = `${TSM_B} .tsmShell[data-ritual="25"] .releaseGameHost`
const G1_CALM = `${TSM_B}[data-calm=true] .tsmShell:is([data-ritual="1"],[data-ritual="6"],[data-ritual="15"],[data-ritual="22"],[data-ritual="25"]) .releaseGameHost`
// paper / card ink (SF Rounded body text, regular-semibold, never heavy)
const G1_INK = `font-family:${FONT_ROUND}!important;font-weight:600!important;letter-spacing:-.01em!important`

const TSM_RITUAL_CSS_G1 = String.raw`
/* ================= shared ================= */
/* the drifting emotion orbs of the desktop stage would float over the phone worlds (clutter, a face over the HUD band) */
${G1_ALL} .characterEmotionUniverse{display:none!important}
/* the long grey desktop instructions are hidden by the layout guard; the strip + guide carry progress */
${G1_ALL} .arena .literalStatus{display:none!important}
/* the 1/6 counters: one small glass chip, top-left, readable on every world */
${G1_ALL} .arena>.literalProgress{left:12px!important;top:10px!important;right:auto!important;bottom:auto!important;width:auto!important;height:auto!important;min-width:0!important;padding:5px 10px!important;border-radius:999px!important;
  font:600 12px/1.1 ${FONT_ROUND}!important;letter-spacing:.06em!important;color:rgba(255,255,255,.92)!important;background:rgba(8,10,28,.52)!important;border:0!important;
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.16),0 6px 16px rgba(0,0,0,.28)!important;-webkit-backdrop-filter:blur(12px)!important;backdrop-filter:blur(12px)!important;text-shadow:none!important;overflow:visible!important;z-index:70!important}
/* the shared picture + words inside a bubble: body text is semibold, not heavy */
/* the face always covers its bubble (upload mode re-flows bubble children; the hidden source words must not push it) */
${G1_ALL} .tsBubbleFaceHost>ts-face{position:absolute!important;inset:0!important}
${G1_ALL} .tsBubbleFaceHost>.tsBubbleFaceSrcHidden{position:absolute!important;left:0!important;top:0!important}
${G1_ALL} ts-face-text.tsBubbleFaceText{font-weight:650!important;font-family:${FONT_ROUND}!important;letter-spacing:-.005em!important}
/* paper / card print used by SHRED · FLUSH · SWIPE AWAY (engine renders .mv2PaperPic + .mv2PaperWords) */
${G1_ALL} .mv2PaperPic{position:relative!important;display:block!important;flex:none!important;border-radius:50%!important;overflow:hidden!important;
  background:radial-gradient(circle at 50% 36%,rgba(255,255,255,.95),rgba(214,236,255,.75) 60%,rgba(170,205,240,.6))!important;
  box-shadow:0 0 0 2px rgba(255,255,255,.9),0 0 0 3px rgba(40,60,110,.14),0 8px 18px rgba(30,40,90,.22)!important}
${G1_ALL} .mv2PaperPic>img{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;object-fit:contain!important;display:block!important;opacity:1!important;filter:none!important;border-radius:50%!important;margin:0!important;max-width:none!important}
${G1_ALL} .mv2PaperWords{display:-webkit-box!important;flex:none!important;height:auto!important;max-height:none!important;min-height:0!important;width:auto!important;padding:0!important;margin:0!important;line-height:1.2!important;-webkit-box-orient:vertical!important;-webkit-line-clamp:3!important;overflow:hidden!important;max-width:100%!important;
  ${G1_INK};text-align:center!important;color:#1b2236!important;text-shadow:none!important;background:none!important;-webkit-text-fill-color:currentColor!important;overflow-wrap:anywhere!important;white-space:normal!important;visibility:visible!important;opacity:1!important}

/* ================= 1 · POP — twilight lagoon ================= */
${G1_POP} .arena.popArenaV2{--g1b:clamp(102px,31vw,132px);overflow:hidden!important;isolation:isolate;
  background:
    radial-gradient(circle 26px at 16% 8%,#fff8ec 0,#ffe6c6 18px,#f6c08e 25px,rgba(246,192,142,0) 27px),
    radial-gradient(circle 90px at 16% 8%,rgba(255,214,170,.38),rgba(255,214,170,0) 100%),
    radial-gradient(120% 16% at 50% 77%,rgba(80,205,255,.42),rgba(80,205,255,0) 72%),
    linear-gradient(180deg,#0a0a26 0%,#16124a 30%,#24216c 55%,#1c4d86 72%,#0e3a5e 76.6%,#082741 77%,#05182c 100%)!important}
/* ::before = POP's climax ripple on the water (idle: invisible) */
${G1_POP} .arena.popArenaV2::before{content:""!important;display:block!important;position:absolute!important;left:50%!important;top:77%!important;right:auto!important;bottom:auto!important;width:60px!important;height:60px!important;margin:-30px 0 0 -30px!important;border-radius:50%!important;z-index:1!important;pointer-events:none!important;
  background:radial-gradient(circle,rgba(255,255,255,.95),rgba(190,240,255,.5) 30%,rgba(190,240,255,0) 70%)!important;
  box-shadow:0 0 0 3px rgba(220,248,255,.95),0 0 22px 6px rgba(150,230,255,.6),0 0 0 26px rgba(190,240,255,0),0 0 0 29px rgba(200,244,255,.7),0 0 0 56px rgba(190,240,255,0),0 0 0 59px rgba(200,244,255,.45),0 0 0 90px rgba(190,240,255,0),0 0 0 92px rgba(200,244,255,.25)!important;
  opacity:0;transform:scale(.2,.06);animation:none!important}
${G1_POP} .arena.popArenaV2::after{content:""!important;position:absolute!important;inset:auto 0 0 0!important;height:23.2%!important;z-index:0;pointer-events:none;display:block!important;opacity:1!important;transform:none!important;
  background:
    linear-gradient(180deg,rgba(150,225,255,.30),rgba(150,225,255,0) 22%),
    repeating-linear-gradient(180deg,rgba(170,230,255,.13) 0 1px,rgba(0,0,0,0) 1px 7px),
    radial-gradient(14% 60% at 81% 0%,rgba(255,214,170,.32),rgba(255,214,170,0) 80%)!important;
  -webkit-mask-image:linear-gradient(180deg,#000,rgba(0,0,0,.35));mask-image:linear-gradient(180deg,#000,rgba(0,0,0,.35));animation:g1Shimmer 7s ease-in-out infinite alternate!important}
@keyframes g1Shimmer{from{background-position:0 0,0 0,0 0}to{background-position:0 0,0 6px,8px 0}}
${G1_POP} .arena.popArenaV2>.depthHalo{display:none!important}
/* water-level glow under the bubbles (light shafts on the water) */
${G1_POP} .arena.popArenaV2>.popFieldGlow{display:block!important;position:absolute!important;left:-10%!important;right:-10%!important;top:8%!important;bottom:20%!important;width:auto!important;height:auto!important;transform:none!important;margin:0!important;z-index:0!important;opacity:1!important;pointer-events:none!important;
  background:conic-gradient(from 196deg at 82% -6%,rgba(255,220,180,0) 0deg,rgba(255,220,180,.07) 8deg,rgba(255,220,180,0) 15deg,rgba(255,220,180,.05) 24deg,rgba(255,220,180,0) 34deg)!important;filter:blur(2px);animation:none!important}
/* rising micro-bubbles (depth) */
${G1_POP} .arena.popArenaV2>.bubbleDepthLayer.far{display:block!important;position:absolute!important;left:0!important;right:0!important;top:0!important;height:200%!important;width:auto!important;transform:none;margin:0!important;border-radius:0!important;z-index:0!important;opacity:.85!important;pointer-events:none!important;filter:none!important;
  background-image:
    radial-gradient(circle at 12% 30%,rgba(200,240,255,0) 2.4px,rgba(200,240,255,.55) 3px,rgba(200,240,255,0) 3.8px),
    radial-gradient(circle at 34% 72%,rgba(200,240,255,0) 1.6px,rgba(200,240,255,.5) 2.2px,rgba(200,240,255,0) 3px),
    radial-gradient(circle at 58% 18%,rgba(200,240,255,0) 3.2px,rgba(200,240,255,.45) 4px,rgba(200,240,255,0) 5px),
    radial-gradient(circle at 86% 56%,rgba(200,240,255,0) 2px,rgba(200,240,255,.5) 2.6px,rgba(200,240,255,0) 3.4px),
    radial-gradient(circle at 70% 88%,rgba(200,240,255,0) 1.4px,rgba(200,240,255,.45) 2px,rgba(200,240,255,0) 2.8px),
    radial-gradient(circle at 46% 46%,rgba(200,240,255,0) 1.2px,rgba(200,240,255,.4) 1.8px,rgba(200,240,255,0) 2.4px)!important;
  background-size:100% 50%!important;background-repeat:repeat!important;background-color:transparent!important;box-shadow:none!important;animation:g1Rise 26s linear infinite!important}
@keyframes g1Rise{from{transform:translateY(0)}to{transform:translateY(-50%)}}
${G1_POP} .arena.popArenaV2>.bubbleDepthLayer.near,${G1_POP} .arena.popArenaV2>.depthHalo{display:none!important}

/* the six bubbles: true circles on a calm staggered 2-column layout (nothing clipped, nothing overlapping) */
${G1_POP} .arena.popArenaV2 .popBubbleV2{position:absolute!important;width:var(--g1b)!important;height:var(--g1b)!important;min-width:0!important;min-height:0!important;max-width:none!important;max-height:none!important;margin:calc(var(--g1b) / -2) 0 0 calc(var(--g1b) / -2)!important;padding:0!important;border-radius:50%!important;z-index:3!important;
  touch-action:manipulation!important;-webkit-tap-highlight-color:transparent!important;border:0!important;
  background:
    radial-gradient(circle at 32% 24%,rgba(255,255,255,.62) 0,rgba(255,255,255,.16) 13%,rgba(255,255,255,0) 26%),
    radial-gradient(circle at 70% 84%,rgba(130,255,235,.22),rgba(130,255,235,0) 38%),
    radial-gradient(circle at 50% 50%,rgba(70,90,200,.10) 0,rgba(70,90,200,.10) 50%,rgba(170,130,255,.30) 74%,rgba(120,225,255,.62) 100%)!important;
  box-shadow:inset 0 0 0 1.5px rgba(220,244,255,.6),inset 0 -12px 26px rgba(110,200,255,.22),inset 8px 10px 22px rgba(255,170,240,.16),0 22px 34px -10px rgba(0,0,0,.5),0 0 26px rgba(120,200,255,.22)!important;
  -webkit-backdrop-filter:blur(3px) saturate(1.3)!important;backdrop-filter:blur(3px) saturate(1.3)!important}
${G1_POP} .arena.popArenaV2 .popBubbleV2 .bubbleRim{display:block!important;position:absolute!important;inset:0!important;width:auto!important;height:auto!important;border-radius:50%!important;pointer-events:none!important;opacity:.85!important;
  background:conic-gradient(from 30deg,rgba(255,120,220,.55),rgba(120,220,255,.55),rgba(140,255,190,.45),rgba(255,230,140,.5),rgba(255,120,220,.55))!important;
  -webkit-mask:radial-gradient(circle,transparent 64%,#000 66%,#000 70%,transparent 72%)!important;mask:radial-gradient(circle,transparent 64%,#000 66%,#000 70%,transparent 72%)!important;filter:blur(.6px)!important;border:0!important;box-shadow:none!important;transform:none!important}
${G1_POP} .arena.popArenaV2 .popBubbleV2 .bubbleSheen{display:block!important;position:absolute!important;left:16%!important;top:9%!important;width:34%!important;height:20%!important;border-radius:50%!important;transform:rotate(-28deg)!important;pointer-events:none!important;z-index:7!important;
  background:radial-gradient(ellipse at 50% 40%,rgba(255,255,255,.85),rgba(255,255,255,0) 70%)!important;opacity:.75!important;filter:blur(.4px)!important}
${G1_POP} .arena.popArenaV2 .popBubbleV2 .bubbleCaustic{display:block!important;position:absolute!important;right:18%!important;bottom:10%!important;left:auto!important;top:auto!important;width:22%!important;height:9%!important;border-radius:50%!important;transform:rotate(-30deg)!important;pointer-events:none!important;z-index:7!important;
  background:radial-gradient(ellipse,rgba(255,255,255,.55),rgba(255,255,255,0) 70%)!important;opacity:.6!important;filter:none!important}
${G1_POP} .arena.popArenaV2 .popBubbleV2::before,${G1_POP} .arena.popArenaV2 .popBubbleV2::after{display:none!important}
${G1_POP} .arena.popArenaV2 .popBubbleV2 ts-face[data-round]::before{background:radial-gradient(circle at 50% 36%,rgba(205,244,255,.16),rgba(140,214,255,.08) 58%,rgba(120,190,255,0) 100%)!important}
${G1_POP} .arena.popArenaV2 .popBubbleV2 ts-face-text{color:#fff!important;text-shadow:0 1px 2px rgba(6,10,40,.9),0 0 10px rgba(10,20,70,.65)!important}
/* stable slots (data-pop-slot): bubble centres in % of the arena */
${G1_POP} .arena.popArenaV2 .popBubbleV2[data-pop-slot="0"]{left:27%!important;top:15.5%!important}
${G1_POP} .arena.popArenaV2 .popBubbleV2[data-pop-slot="1"]{left:72%!important;top:20%!important}
${G1_POP} .arena.popArenaV2 .popBubbleV2[data-pop-slot="2"]{left:29%!important;top:40%!important}
${G1_POP} .arena.popArenaV2 .popBubbleV2[data-pop-slot="3"]{left:73%!important;top:44.5%!important}
${G1_POP} .arena.popArenaV2 .popBubbleV2[data-pop-slot="4"]{left:27%!important;top:64%!important}
${G1_POP} .arena.popArenaV2 .popBubbleV2[data-pop-slot="5"]{left:71%!important;top:68%!important}
${G1_POP} .arena.popArenaV2 .popBubbleV2[data-pop-slot="6"]{left:50%!important;top:30%!important}
${G1_POP} .arena.popArenaV2 .popBubbleV2[data-pop-slot="7"]{left:50%!important;top:54%!important}
${G1_POP} .arena.popArenaV2 .popBubbleV2[data-pop-slot="8"]{left:50%!important;top:8%!important}
${G1_POP} .arena.popArenaV2 .popBubbleV2[data-pop-slot="9"]{left:50%!important;top:76%!important}
/* POPPED n / 6 — floats on the water */
${G1_POP} .arena.popArenaV2>.combo{position:absolute!important;left:50%!important;right:auto!important;top:10px!important;bottom:auto!important;transform:translateX(-50%)!important;margin:0!important;z-index:20!important;
  padding:7px 14px!important;border-radius:999px!important;font:600 12.5px/1.1 ${FONT_ROUND}!important;letter-spacing:.08em!important;color:#eaf7ff!important;white-space:nowrap!important;
  background:rgba(6,22,44,.5)!important;border:0!important;box-shadow:inset 0 0 0 1px rgba(170,230,255,.28),0 8px 22px rgba(0,0,0,.3)!important;-webkit-backdrop-filter:blur(12px)!important;backdrop-filter:blur(12px)!important;text-shadow:none!important;animation:none!important}
${G1_POP} .arena.popArenaV2>.combo::before,${G1_POP} .arena.popArenaV2>.combo::after{display:none!important}
/* POP climax: the lagoon answers the last pop — ripple rings run out over the water + a rising shimmer column */
${G1_POP} .arena.popArenaV2.mv2Cleared::before{animation:g1PopRipple 1.4s cubic-bezier(.15,.7,.3,1) both!important}
@keyframes g1PopRipple{0%{opacity:0;transform:scale(.2,.06)}10%{opacity:1}100%{opacity:0;transform:scale(2.6,.8)}}
${G1_POP} .arena.popArenaV2.mv2Cleared::after{animation:g1PopWater 1.4s ease-out both!important}
@keyframes g1PopWater{0%{filter:brightness(1)}22%{filter:brightness(2.4) saturate(1.3)}100%{filter:brightness(1)}}
${G1_POP} .arena.popArenaV2.mv2Cleared>.popFieldGlow{animation:g1PopShafts 1.4s ease-out both!important}
@keyframes g1PopShafts{0%{filter:blur(2px) brightness(1)}30%{filter:blur(2px) brightness(3.2)}100%{filter:blur(2px) brightness(1)}}
${G1_POP} .arena.popArenaV2.mv2Cleared>.bubbleDepthLayer.far{animation:g1Rise 3.2s linear infinite!important;opacity:1!important}

/* ================= 6 · ZAP — storm lab ================= */
${G1_ZAP} .arena.eosZapArena{--zd:min(28%,128px)!important;overflow:hidden!important;isolation:isolate;
  background:
    radial-gradient(70% 24% at 22% 0%,rgba(120,150,210,.30),rgba(120,150,210,0) 70%),
    radial-gradient(60% 20% at 78% 2%,rgba(110,140,200,.26),rgba(110,140,200,0) 70%),
    radial-gradient(90% 30% at 50% 100%,rgba(60,220,255,.20),rgba(60,220,255,0) 70%),
    linear-gradient(180deg,#0b1024 0%,#0e1631 36%,#111b3a 62%,#0a1226 100%)!important}
/* storm ceiling: slow cloud bank with a lightning flicker deep inside */
${G1_ZAP} .arena.eosZapArena::before{content:""!important;position:absolute!important;left:-10%!important;right:-10%!important;top:-4%!important;height:22%!important;z-index:0!important;pointer-events:none!important;display:block!important;opacity:1!important;transform:none;
  background:
    radial-gradient(22% 60% at 12% 40%,rgba(150,170,220,.30),rgba(150,170,220,0) 70%),
    radial-gradient(26% 70% at 38% 30%,rgba(140,160,215,.26),rgba(140,160,215,0) 70%),
    radial-gradient(24% 66% at 64% 46%,rgba(150,170,220,.24),rgba(150,170,220,0) 70%),
    radial-gradient(26% 70% at 90% 34%,rgba(140,160,215,.28),rgba(140,160,215,0) 70%)!important;
  filter:blur(6px);animation:g1Storm 9s ease-in-out infinite!important}
@keyframes g1Storm{0%,100%{transform:translateX(0);filter:blur(6px) brightness(1)}46%{filter:blur(6px) brightness(1)}48%{filter:blur(6px) brightness(2.1)}50%{filter:blur(6px) brightness(1.1)}52%{filter:blur(6px) brightness(1.8)}56%{filter:blur(6px) brightness(1)}50.1%{transform:translateX(-2%)}}
${G1_ZAP} .arena.eosZapArena::after{content:""!important;position:absolute!important;inset:0!important;z-index:9!important;pointer-events:none!important;display:block!important;opacity:0;background:radial-gradient(circle at 50% 30%,rgba(220,250,255,.65),rgba(120,225,255,.18) 40%,rgba(120,225,255,0) 70%)!important;transform:none}
/* lab floor: a lit grid in perspective under the zapper */
${G1_ZAP} .arena.eosZapArena .eosZapFloor{height:34%!important;bottom:0!important;left:-20%!important;right:-20%!important;z-index:0!important;
  background:
    repeating-linear-gradient(90deg,rgba(110,225,255,.22) 0 1px,rgba(0,0,0,0) 1px 38px),
    repeating-linear-gradient(0deg,rgba(110,225,255,.18) 0 1px,rgba(0,0,0,0) 1px 30px),
    radial-gradient(60% 80% at 50% 100%,rgba(60,210,255,.26),rgba(60,210,255,0) 70%),
    linear-gradient(180deg,rgba(8,14,32,0),rgba(8,14,32,.6))!important;
  transform:perspective(320px) rotateX(56deg)!important;transform-origin:50% 100%!important;
  -webkit-mask-image:linear-gradient(0deg,#000 35%,transparent 100%)!important;mask-image:linear-gradient(0deg,#000 35%,transparent 100%)!important}
/* the bubbles sit below the top of the stage (the relieved float, pips and halo never slide under it) */
${G1_ZAP} .arena.eosZapArena .eosZapBubble{margin-top:calc(var(--zd) / -2 + 6.6vh)!important;
  background:radial-gradient(circle at 32% 24%,rgba(255,255,255,.5) 0,rgba(255,255,255,.12) 14%,rgba(255,255,255,0) 27%),radial-gradient(circle at 50% 50%,rgba(40,60,140,.10) 50%,rgba(130,120,255,.26) 76%,rgba(110,225,255,.5) 100%)!important;
  box-shadow:inset 0 0 0 1.5px rgba(200,240,255,.55),inset 0 -12px 24px rgba(110,200,255,.2),0 18px 30px -12px rgba(0,0,0,.55),0 0 22px rgba(0,210,255,.22)!important;border-color:rgba(165,236,255,.55)!important}
${G1_ZAP} .arena.eosZapArena .eosZapBubble.h1{box-shadow:inset 0 0 0 1.5px rgba(200,250,255,.8),0 0 18px rgba(60,225,255,.7),0 0 38px rgba(60,225,255,.3)!important}
${G1_ZAP} .arena.eosZapArena .eosZapBubble.relieved{box-shadow:inset 0 0 0 1.5px rgba(255,236,160,.9),0 0 22px rgba(255,214,110,.5),0 0 44px rgba(110,255,200,.22)!important;border-color:rgba(255,232,140,.98)!important}
${G1_ZAP} .arena.eosZapArena .eosZapBubble ts-face-text{color:#fff!important;text-shadow:0 1px 2px rgba(4,8,30,.95),0 0 10px rgba(6,14,50,.7)!important}
/* RUSH's speech chip + the SMILING counter: same type system as the shell */
${G1_ZAP} .arena.eosZapArena .eosZapSay{font:700 12.5px/1.2 ${FONT_ROUND}!important;letter-spacing:.01em!important;padding:7px 11px!important;border-radius:14px!important;max-width:min(150px,32vw)!important}
${G1_ZAP} .arena.eosZapArena .eosZapCount{right:12px!important;bottom:14px!important;padding:8px 12px!important;border-radius:16px!important;background:rgba(40,30,8,.42)!important;border:0!important;box-shadow:inset 0 0 0 1px rgba(255,226,140,.45),0 8px 20px rgba(0,0,0,.3)!important;-webkit-backdrop-filter:blur(12px)!important;backdrop-filter:blur(12px)!important}
${G1_ZAP} .arena.eosZapArena .eosZapCount b{font:700 19px/1 ${FONT_ROUND}!important;color:#fff4cf!important}
${G1_ZAP} .arena.eosZapArena .eosZapCount span{font:600 10.5px/1 ${FONT_ROUND}!important;letter-spacing:.12em!important;color:#ffe7a6!important}
${G1_ZAP} .arena.eosZapArena .eosZapCradle{box-shadow:inset 0 2px 0 rgba(255,255,255,.45),0 10px 22px rgba(0,0,0,.5),0 0 26px rgba(60,210,255,.18)!important}
/* ZAP climax (everybody smiling): the storm breaks — a white-gold sky flash and the ceiling lights up once */
${G1_ZAP} .arena.eosZapArena.zapPhase-done::after{animation:g1ZapFlash 1.3s ease-out both!important;background:radial-gradient(circle at 50% 26%,rgba(255,250,225,.75),rgba(255,226,140,.24) 38%,rgba(255,226,140,0) 72%)!important}
@keyframes g1ZapFlash{0%{opacity:0}8%{opacity:1}18%{opacity:.25}26%{opacity:.85}100%{opacity:0}}
${G1_ZAP} .arena.eosZapArena.zapPhase-done::before{animation:g1ZapCalm 1.3s ease-out both!important}
@keyframes g1ZapCalm{0%{filter:blur(6px) brightness(1)}10%{filter:blur(6px) brightness(2.6) hue-rotate(-20deg)}100%{filter:blur(8px) brightness(1.15) hue-rotate(-30deg)}}

/* ================= 15 · SHRED — the desk lamp and the shredder ================= */
${G1_SHRED} .arena.literalShredArena{--g1pw:min(76vw,300px);--g1ph:31%;--g1bw:min(86vw,336px);overflow:hidden!important;isolation:isolate;
  background:
    radial-gradient(60% 40% at 18% 2%,rgba(255,206,140,.34),rgba(255,206,140,0) 70%),
    radial-gradient(80% 22% at 50% 92%,rgba(255,186,120,.16),rgba(255,186,120,0) 70%),
    linear-gradient(180deg,#14101f 0%,#1d1628 44%,#221a2a 70%,#2a1c18 70.4%,#3a2619 78%,#24170f 100%)!important}
/* lamp cone + desk grain */
${G1_SHRED} .arena.literalShredArena::before{content:""!important;position:absolute!important;left:-30%!important;top:-6%!important;width:110%!important;height:86%!important;z-index:0!important;pointer-events:none!important;display:block!important;opacity:1!important;transform:none!important;
  background:conic-gradient(from 132deg at 20% 0%,rgba(255,214,150,0) 0deg,rgba(255,214,150,.13) 14deg,rgba(255,214,150,.06) 44deg,rgba(255,214,150,0) 60deg)!important;filter:blur(3px)!important;animation:none!important}
${G1_SHRED} .arena.literalShredArena::after{content:""!important;position:absolute!important;left:0!important;right:0!important;bottom:0!important;top:70.4%!important;z-index:0!important;pointer-events:none!important;display:block!important;opacity:.55!important;transform:none!important;
  background:repeating-linear-gradient(176deg,rgba(255,220,180,.05) 0 2px,rgba(0,0,0,0) 2px 9px),linear-gradient(180deg,rgba(255,220,170,.14),rgba(255,220,170,0) 18%)!important;animation:none!important}
${G1_SHRED} .arena.literalShredArena>.shredRoomGlow,${G1_SHRED} .arena.literalShredArena>.shredFloorShadow{display:none!important}
/* the paper waits ON the feed slot; the anchor's bottom edge is the slot line (the paper is pulled down behind it) */
${G1_SHRED} .arena.literalShredArena .shredPaperAnchor{position:absolute!important;left:50%!important;top:6%!important;width:var(--g1pw)!important;height:var(--g1ph)!important;margin:0 0 0 calc(var(--g1pw) / -2)!important;transform:none!important;
  overflow:hidden!important;z-index:6!important;pointer-events:auto!important;touch-action:manipulation!important;cursor:pointer;padding:0!important;border-radius:0!important;background:none!important;box-shadow:none!important}
${G1_SHRED} .arena.literalShredArena .shredPaper{position:absolute!important;left:5%!important;right:5%!important;top:4%!important;bottom:0!important;width:auto!important;height:auto!important;margin:0!important;padding:0!important;border-radius:6px 6px 0 0!important;overflow:hidden!important;
  background:linear-gradient(180deg,#fffdf7,#f6f1e6 70%,#eee6d6)!important;border:0!important;
  box-shadow:inset 0 0 0 1px rgba(120,96,60,.12),0 -2px 0 rgba(255,255,255,.6),0 18px 30px rgba(0,0,0,.35)!important;filter:none!important}
${G1_SHRED} .arena.literalShredArena .shredPaper::before{content:""!important;position:absolute!important;inset:0!important;pointer-events:none!important;display:block!important;z-index:0!important;
  background:repeating-linear-gradient(180deg,rgba(0,0,0,0) 0 25px,rgba(90,120,200,.10) 25px 26px),linear-gradient(90deg,rgba(0,0,0,0) 0 13%,rgba(220,90,90,.16) 13% calc(13% + 1px),rgba(0,0,0,0) calc(13% + 1px))!important;opacity:1!important;transform:none!important}
${G1_SHRED} .arena.literalShredArena .shredPaper::after{display:none!important}
${G1_SHRED} .arena.literalShredArena .paperTopCurl{display:block!important;position:absolute!important;left:0!important;right:0!important;top:0!important;height:10px!important;z-index:1!important;background:linear-gradient(180deg,rgba(255,255,255,.9),rgba(0,0,0,0))!important;border:0!important;box-shadow:none!important;transform:none!important}
${G1_SHRED} .arena.literalShredArena .shredPaperText.mv2PaperPrint{position:absolute!important;inset:0!important;z-index:2!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:8px!important;padding:10px 18px 12px!important;margin:0!important;background:none!important;box-shadow:none!important;transform:none!important}
${G1_SHRED} .arena.literalShredArena .mv2PaperPrint .mv2PaperPic{width:clamp(66px,24vw,96px)!important;height:clamp(66px,24vw,96px)!important}
${G1_SHRED} .arena.literalShredArena .mv2PaperPrint .mv2PaperWords{font-size:clamp(16px,4.6vw,19px)!important;line-height:1.2!important;color:#1d2232!important}
${G1_SHRED} .arena.literalShredArena .paperFeedMarks,${G1_SHRED} .arena.literalShredArena .shredCutCurtain{display:none!important}
/* the machine: steel body, slot at the very top (the paper anchor ends on it), cutting rollers, window bin */
${G1_SHRED} .arena.literalShredArena .shredderBody{position:absolute!important;left:50%!important;top:calc(6% + var(--g1ph) - 14px)!important;width:var(--g1bw)!important;height:40%!important;margin:0 0 0 calc(var(--g1bw) / -2)!important;transform:none!important;padding:0!important;z-index:7!important;
  border-radius:26px 26px 20px 20px!important;border:0!important;overflow:visible!important;
  background:
    linear-gradient(180deg,rgba(255,255,255,.16),rgba(255,255,255,0) 8%),
    repeating-linear-gradient(90deg,rgba(255,255,255,.025) 0 2px,rgba(0,0,0,.03) 2px 4px),
    linear-gradient(180deg,#3d4552 0%,#2a303b 28%,#1d222b 100%)!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.28),inset 0 -6px 14px rgba(0,0,0,.35),0 26px 40px -12px rgba(0,0,0,.65),0 0 0 1px rgba(0,0,0,.4)!important}
${G1_SHRED} .arena.literalShredArena .shredderBody::before,${G1_SHRED} .arena.literalShredArena .shredderBody::after{display:none!important}
${G1_SHRED} .arena.literalShredArena .shredderMouth{position:absolute!important;left:5%!important;right:5%!important;top:4px!important;height:40px!important;width:auto!important;margin:0!important;transform:none!important;border-radius:12px!important;overflow:hidden!important;z-index:2!important;
  background:linear-gradient(180deg,#05070b,#10141b 60%,#1a1f28)!important;box-shadow:inset 0 3px 8px rgba(0,0,0,.9),inset 0 -1px 0 rgba(255,255,255,.12),0 1px 0 rgba(255,255,255,.08)!important;border:0!important}
${G1_SHRED} .arena.literalShredArena .shredderMouth>b{display:none!important}
${G1_SHRED} .arena.literalShredArena .shredRoller{position:absolute!important;left:3%!important;right:3%!important;width:auto!important;height:12px!important;margin:0!important;border-radius:6px!important;transform:none!important;display:flex!important;gap:0!important;
  background:repeating-linear-gradient(90deg,#8d97a6 0 5px,#4b535f 5px 7px,#c9d1db 7px 9px,#5b6470 9px 12px)!important;box-shadow:inset 0 2px 2px rgba(255,255,255,.35),inset 0 -2px 3px rgba(0,0,0,.6)!important}
${G1_SHRED} .arena.literalShredArena .shredRoller.left{top:7px!important;bottom:auto!important}
${G1_SHRED} .arena.literalShredArena .shredRoller.right{top:21px!important;bottom:auto!important}
${G1_SHRED} .arena.literalShredArena .shredRoller>i{display:none!important}
${G1_SHRED} .arena.literalShredArena.mv2Fed .shredRoller{animation:g1Roll .28s linear infinite!important}
${G1_SHRED} .arena.literalShredArena.mv2Fed .shredRoller.right{animation-direction:reverse!important}
@keyframes g1Roll{to{background-position:12px 0}}
${G1_SHRED} .arena.literalShredArena .shredTeeth{position:absolute!important;left:3%!important;right:3%!important;bottom:2px!important;top:auto!important;height:8px!important;width:auto!important;margin:0!important;transform:none!important;display:flex!important;justify-content:space-between!important;opacity:.85!important}
${G1_SHRED} .arena.literalShredArena .shredTeeth>i{width:4px!important;height:8px!important;background:linear-gradient(180deg,#e6ecf3,#7b8592)!important;clip-path:polygon(0 0,100% 0,50% 100%)!important;border:0!important;box-shadow:none!important;margin:0!important;transform:none!important}
${G1_SHRED} .arena.literalShredArena .shredFeedGuide{display:none!important}
${G1_SHRED} .arena.literalShredArena .shredderTop{position:absolute!important;left:8%!important;right:8%!important;top:54px!important;height:24px!important;width:auto!important;margin:0!important;padding:0 12px!important;transform:none!important;border-radius:12px!important;z-index:2!important;display:flex!important;align-items:center!important;justify-content:space-between!important;
  background:linear-gradient(180deg,rgba(0,0,0,.35),rgba(0,0,0,.2))!important;box-shadow:inset 0 1px 2px rgba(0,0,0,.6),0 1px 0 rgba(255,255,255,.07)!important;border:0!important}
${G1_SHRED} .arena.literalShredArena .shredderTop>span{font:600 9.5px/1 ${FONT_ROUND}!important;letter-spacing:clamp(.12em,.6vw,.24em)!important;white-space:nowrap!important;overflow:hidden!important;color:rgba(220,228,240,.72)!important;text-shadow:none!important;background:none!important;-webkit-text-fill-color:currentColor!important}
${G1_SHRED} .arena.literalShredArena .shredderTop>i{display:block!important;width:7px!important;height:7px!important;border-radius:50%!important;background:#3a4250!important;box-shadow:inset 0 1px 1px rgba(0,0,0,.6)!important;position:static!important;margin:0!important;transform:none!important}
${G1_SHRED} .arena.literalShredArena.mv2Fed .shredderTop>i{background:#5cf0a6!important;box-shadow:0 0 8px #3ef09a,0 0 2px #b5ffd9!important}
${G1_SHRED} .arena.literalShredArena .shredderBinWindow{position:absolute!important;left:7%!important;right:7%!important;top:88px!important;bottom:22px!important;width:auto!important;height:auto!important;margin:0!important;transform:none!important;border-radius:14px 14px 18px 18px!important;overflow:hidden!important;z-index:1!important;
  background:linear-gradient(180deg,rgba(6,8,14,.92),rgba(20,24,34,.86))!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08),inset 0 10px 24px rgba(0,0,0,.65);border:0!important}
${G1_SHRED} .arena.literalShredArena .shredderBinWindow::after{content:""!important;position:absolute!important;inset:0!important;z-index:5!important;pointer-events:none!important;display:block!important;background:linear-gradient(115deg,rgba(255,255,255,.10),rgba(255,255,255,0) 32%,rgba(255,255,255,0) 70%,rgba(255,255,255,.05))!important;opacity:1!important;transform:none!important}
/* yesterday's strips: a soft mound of cut paper at the bottom of the bin, lit from the slot */
${G1_SHRED} .arena.literalShredArena .shredBinGlow{display:block!important;position:absolute!important;inset:auto -6% 0 -6%!important;height:30%!important;transform:none!important;opacity:1!important;z-index:1!important;
  background:
    linear-gradient(180deg,rgba(255,236,206,.22),rgba(255,236,206,0) 45%),
    repeating-linear-gradient(93deg,rgba(236,226,206,.55) 0 3px,rgba(160,148,128,.45) 3px 4px,rgba(210,198,176,.5) 4px 7px,rgba(120,110,96,.35) 7px 8px),
    linear-gradient(180deg,#8a8172,#5c554b)!important;
  -webkit-mask-image:radial-gradient(64% 120% at 50% 100%,#000 58%,transparent 76%)!important;mask-image:radial-gradient(64% 120% at 50% 100%,#000 58%,transparent 76%)!important;filter:blur(.5px) brightness(.8)!important}
/* the desktop's loose white bars are replaced by the cut print itself (.mv2ShredOut) */
${G1_SHRED} .arena.literalShredArena .shredStrip{display:none!important}
/* the shredded print: the same picture + words, cut into strips, coming out bottom-edge first */
${G1_SHRED} .arena.literalShredArena .mv2ShredOut{position:absolute;left:50%;top:0;width:calc(var(--g1pw) * .9 * .86);height:100%;margin-left:calc(var(--g1pw) * .9 * .86 / -2);z-index:3;pointer-events:none;
  transform:translateY(calc((var(--feed) - 100) * 1%));transition:transform .22s cubic-bezier(.3,.9,.3,1);
  -webkit-mask-image:repeating-linear-gradient(90deg,#000 0 9px,transparent 9px 12px);mask-image:repeating-linear-gradient(90deg,#000 0 9px,transparent 9px 12px)}
${G1_SHRED} .arena.literalShredArena .mv2ShredOut.isGone{transform:translateY(40%);opacity:0;transition:transform .72s cubic-bezier(.5,0,.8,.4),opacity .72s ease-in}
${G1_SHRED} .arena.literalShredArena .mv2ShredOutPrint{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;padding:8px 12px;background:linear-gradient(180deg,#fffdf7,#efe7d6);
  background-image:repeating-linear-gradient(90deg,rgba(0,0,0,0) 0 9px,rgba(0,0,0,.08) 9px 9.5px),linear-gradient(180deg,#fffdf7,#efe7d6)}
${G1_SHRED} .arena.literalShredArena .mv2ShredOutPrint .mv2PaperPic{width:clamp(56px,20vw,82px)!important;height:clamp(56px,20vw,82px)!important}
${G1_SHRED} .arena.literalShredArena .mv2ShredOutPrint .mv2PaperWords{font-size:clamp(14px,4vw,16.5px)!important;line-height:1.2!important}
${G1_SHRED} .arena.literalShredArena .shredderFeet{display:none!important}
${G1_SHRED} .arena.literalShredArena .shredMotorFx{left:50%!important;top:calc(6% + var(--g1ph) - 14px)!important;z-index:8!important;pointer-events:none!important}
/* the control: a machined start key under the machine */
${G1_SHRED} .arena.literalShredArena .shredAction{left:50%!important;right:auto!important;top:auto!important;bottom:2.2%!important;width:min(84vw,330px)!important;height:54px!important;transform:translateX(-50%)!important;margin:0!important;border-radius:18px!important;z-index:30!important;
  font:650 15.5px/1 ${FONT_ROUND}!important;letter-spacing:.06em!important;color:#fff!important;text-shadow:0 1px 1px rgba(0,0,0,.35)!important;-webkit-text-fill-color:#fff!important;
  background:linear-gradient(180deg,#e2503c,#b8301f 60%,#93220f)!important;border:0!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.4),inset 0 -3px 0 rgba(0,0,0,.25),0 14px 26px -8px rgba(160,30,10,.65),0 0 0 1px rgba(60,10,0,.45)!important;touch-action:manipulation!important}
${G1_SHRED} .arena.literalShredArena .shredAction:active{transform:translateX(-50%) translateY(2px) scale(.985)!important}
${G1_SHRED} .arena.literalShredArena .shredAction:disabled{opacity:.72!important;filter:saturate(.6)!important}
${G1_SHRED} .arena.literalShredArena .shredAction::before,${G1_SHRED} .arena.literalShredArena .shredAction::after{display:none!important}
/* SHRED climax (last paper gone): the machine exhales a storm of paper strips up into the lamp light */
${G1_SHRED} .arena.literalShredArena.mv2Final .shredderBinWindow{animation:g1BinFlare 1.4s ease-out both!important}
@keyframes g1BinFlare{0%{box-shadow:inset 0 0 0 1px rgba(255,255,255,.08),inset 0 10px 24px rgba(0,0,0,.65)}25%{box-shadow:inset 0 0 0 1px rgba(255,230,190,.6),inset 0 -30px 60px rgba(255,190,120,.55),0 0 40px rgba(255,190,120,.45)}100%{box-shadow:inset 0 0 0 1px rgba(255,255,255,.08),inset 0 10px 24px rgba(0,0,0,.65)}}
${G1_SHRED} .arena.literalShredArena.mv2Final .shredderBody::after{content:""!important;display:block!important;position:absolute!important;left:10%!important;right:10%!important;top:auto!important;bottom:calc(100% - 34px)!important;height:250px!important;transform-origin:50% 100%;pointer-events:none!important;z-index:9!important;
  background-image:
    linear-gradient(#fffdf7,#fffdf7),linear-gradient(#f3ead8,#f3ead8),linear-gradient(#fffdf7,#fffdf7),linear-gradient(#efe6d2,#efe6d2),linear-gradient(#fffdf7,#fffdf7),linear-gradient(#f3ead8,#f3ead8),linear-gradient(#fffdf7,#fffdf7),linear-gradient(#efe6d2,#efe6d2)!important;
  background-size:4px 22px,4px 18px,4px 26px,4px 16px,4px 20px,4px 24px,4px 18px,4px 22px!important;background-repeat:no-repeat!important;
  background-position:8% 100%,22% 100%,36% 100%,48% 100%,60% 100%,72% 100%,84% 100%,94% 100%;
  animation:g1Confetti 1.4s cubic-bezier(.15,.75,.3,1) both!important}
@keyframes g1Confetti{0%{opacity:0;background-position:8% 100%,22% 100%,36% 100%,48% 100%,60% 100%,72% 100%,84% 100%,94% 100%}12%{opacity:1}70%{opacity:1;background-position:-6% 22%,14% 6%,32% 0%,50% 12%,62% 2%,80% 10%,96% 18%,112% 30%}100%{opacity:0;background-position:-10% 46%,10% 34%,30% 30%,52% 40%,64% 30%,84% 38%,100% 44%,116% 56%}}

/* ================= 22 · FLUSH — porcelain basin at night ================= */
${G1_FLUSH} .arena.sinkFlushArena{overflow:hidden!important;isolation:isolate;
  background:
    radial-gradient(70% 34% at 50% 0%,rgba(170,215,255,.20),rgba(170,215,255,0) 70%),
    linear-gradient(180deg,#0d1726 0%,#122236 46%,#0b1726 100%)!important}
/* tiled wall: glossy ceramic squares with grout lines */
${G1_FLUSH} .arena.sinkFlushArena::before{content:""!important;position:absolute!important;left:0!important;right:0!important;top:0!important;height:58%!important;z-index:0!important;pointer-events:none!important;display:block!important;opacity:1!important;transform:none!important;
  background:
    radial-gradient(60% 50% at 50% 0%,rgba(200,235,255,.22),rgba(200,235,255,0) 70%),
    repeating-linear-gradient(90deg,rgba(4,10,20,.55) 0 2px,rgba(0,0,0,0) 2px 44px),
    repeating-linear-gradient(180deg,rgba(4,10,20,.55) 0 2px,rgba(0,0,0,0) 2px 44px),
    repeating-linear-gradient(90deg,rgba(255,255,255,0) 0 6px,rgba(255,255,255,.05) 6px 14px,rgba(255,255,255,0) 14px 44px),
    linear-gradient(180deg,#2c4a63,#22394f 60%,#1a2c40)!important;
  -webkit-mask-image:linear-gradient(180deg,#000 70%,transparent);mask-image:linear-gradient(180deg,#000 70%,transparent);animation:none!important}
${G1_FLUSH} .arena.sinkFlushArena::after{content:""!important;position:absolute!important;inset:0!important;z-index:30!important;pointer-events:none!important;display:block!important;opacity:0;transform:none}
${G1_FLUSH} .arena.sinkFlushArena>.sinkBacksplash{display:none!important}
${G1_FLUSH} .arena.sinkFlushArena>.sinkSceneGlow{left:50%!important;top:44%!important}
${G1_FLUSH} .arena.sinkFlushArena>.sinkFaucet{top:4%!important}
${G1_FLUSH} .arena.sinkFlushArena>.sinkBasin{top:21%!important;width:min(92vw,370px)!important;height:46%!important;transform:translateX(-50%)!important;
  box-shadow:inset 0 2px 0 rgba(255,255,255,.7),0 30px 50px -16px rgba(0,0,0,.7),0 0 0 1px rgba(0,0,0,.25)!important}
${G1_FLUSH} .arena.sinkFlushArena .sinkWater{top:58%!important;width:84%!important;height:72%!important;opacity:1!important;
  background:
    radial-gradient(60% 30% at 40% 18%,rgba(255,255,255,.55),rgba(255,255,255,0) 70%),
    radial-gradient(circle at 50% 70%,rgba(4,30,60,.55),rgba(4,30,60,0) 34%),
    radial-gradient(circle at 50% 50%,#7fd8f2 0,#3aa6d6 38%,#1a6fa8 70%,#0e4678 100%)!important;
  box-shadow:inset 0 10px 24px rgba(255,255,255,.28),inset 0 -18px 30px rgba(0,20,50,.45)!important}
${G1_FLUSH} .arena.sinkFlushArena .sinkDrain{top:auto!important;bottom:9%!important;width:70px!important;height:34px!important;margin-left:0!important;
  background:
    repeating-conic-gradient(from 0deg,rgba(0,0,0,.75) 0 9deg,rgba(0,0,0,0) 9deg 30deg),
    radial-gradient(closest-side,#05080d 0,#05080d 46%,#3b4652 50%,#e9eff4 62%,#8e9cab 76%,#f4f7fa 88%,#6d7b89 100%)!important;
  box-shadow:0 2px 6px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.6)!important;border:0!important}
${G1_FLUSH} .arena.sinkFlushArena .sinkDrain>i,${G1_FLUSH} .arena.sinkFlushArena .sinkDrain>b{opacity:.35!important}
${G1_FLUSH} .arena.sinkFlushArena .sinkPaperAnchor{top:7%!important;width:min(56vw,224px)!important;height:auto!important;transform:translateX(-50%)!important}
${G1_FLUSH} .arena.sinkFlushArena .sinkPaperWord{width:100%!important;height:auto!important;min-height:0!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:7px!important;padding:12px 14px 13px!important;border-radius:12px!important;
  background:linear-gradient(160deg,#fffef9,#f2f5f3 60%,#e4edee)!important;box-shadow:inset 0 0 0 1px rgba(80,110,130,.14),0 14px 24px -8px rgba(0,20,40,.5)!important;overflow:hidden!important}
${G1_FLUSH} .arena.sinkFlushArena .sinkPaperWord .mv2PaperPic{width:clamp(56px,18vw,72px)!important;height:clamp(56px,18vw,72px)!important}
${G1_FLUSH} .arena.sinkFlushArena .sinkPaperWord .mv2PaperWords{font-size:clamp(15px,4.3vw,17.5px)!important;line-height:1.2!important;color:#1a2433!important}
/* the stone countertop the basin is set into */
${G1_FLUSH} .arena.sinkFlushArena .sinkCounter{left:0!important;right:0!important;width:auto!important;top:62%!important;bottom:auto!important;height:16%!important;border-radius:0!important;z-index:6!important;
  background:linear-gradient(180deg,#c9d2da 0,#eef2f5 4%,#b9c3cc 9%,#8e99a5 100%)!important;
  box-shadow:inset 0 2px 0 rgba(255,255,255,.7),inset 0 -14px 24px rgba(20,30,45,.35),0 18px 30px -8px rgba(0,0,0,.55)!important}
${G1_FLUSH} .arena.sinkFlushArena .sinkCounter .counterEdge{display:block!important;position:absolute!important;left:0!important;right:0!important;bottom:0!important;top:auto!important;height:22%!important;width:auto!important;background:linear-gradient(180deg,#6f7b88,#3c4652)!important;box-shadow:0 1px 0 rgba(255,255,255,.2) inset!important;border-radius:0!important;transform:none!important}
${G1_FLUSH} .arena.sinkFlushArena .flushLever{left:50%!important;top:auto!important;bottom:2.2%!important;width:min(84vw,330px)!important;height:56px!important;transform:translateX(-50%)!important;margin:0!important;border-radius:20px!important;z-index:30!important;gap:12px!important;
  background:linear-gradient(180deg,#f5fbff,#c7d6e2 52%,#9fb2c2)!important;border:0!important;
  box-shadow:inset 0 1px 0 #fff,inset 0 -3px 0 rgba(40,70,100,.25),0 16px 28px -10px rgba(0,0,0,.6),0 0 0 1px rgba(20,40,60,.35)!important;touch-action:manipulation!important}
${G1_FLUSH} .arena.sinkFlushArena .flushLever>span{font:650 15px/1 ${FONT_ROUND}!important;letter-spacing:.06em!important;color:#16304a!important;-webkit-text-fill-color:#16304a!important;text-shadow:0 1px 0 rgba(255,255,255,.6)!important}
${G1_FLUSH} .arena.sinkFlushArena .flushLever>i{width:30px!important;height:14px!important;border-radius:7px!important;background:linear-gradient(180deg,#8ea3b6,#4e6478)!important;box-shadow:inset 0 1px 1px rgba(255,255,255,.6),0 1px 2px rgba(0,0,0,.4)!important;transform:rotate(-14deg)!important;transition:transform .25s cubic-bezier(.2,1.4,.4,1)!important}
${G1_FLUSH} .arena.sinkFlushArena .flushLever.active>i{transform:rotate(26deg)!important}
${G1_FLUSH} .arena.sinkFlushArena .flushLever:active{transform:translateX(-50%) translateY(2px) scale(.985)!important}
${G1_FLUSH} .arena.sinkFlushArena .flushLever:disabled{opacity:.8!important}
${G1_FLUSH} .arena.sinkFlushArena .flushLever::before,${G1_FLUSH} .arena.sinkFlushArena .flushLever::after{display:none!important}
/* FLUSH climax (last paper gone): the whole basin becomes a whirlpool of light that collapses into the drain */
${G1_FLUSH} .arena.sinkFlushArena.mv2Final::after{animation:g1Whirl 1.45s cubic-bezier(.3,.6,.3,1) both!important;
  background:conic-gradient(from 0deg at 50% 60%,rgba(120,230,255,0),rgba(170,240,255,.55),rgba(120,230,255,0) 22%,rgba(200,250,255,.45) 36%,rgba(120,230,255,0) 52%,rgba(170,240,255,.5) 70%,rgba(120,230,255,0) 86%)!important;
  -webkit-mask-image:radial-gradient(circle at 50% 60%,#000 0,#000 30%,transparent 62%);mask-image:radial-gradient(circle at 50% 60%,#000 0,#000 30%,transparent 62%)}
@keyframes g1Whirl{0%{opacity:0;transform:rotate(0) scale(1.25)}20%{opacity:1}100%{opacity:0;transform:rotate(-540deg) scale(.08)}}

/* ================= 25 · SWIPE AWAY — the spotlit card table ================= */
${G1_SWIPE} .arena.literalSwipeArena{--g1cw:min(68vw,272px);--g1ch:min(48%,330px);--commit:0;overflow:hidden!important;isolation:isolate;
  background:
    conic-gradient(from 164deg at 50% -10%,rgba(255,230,200,0) 0deg,rgba(255,230,200,.09) 10deg,rgba(255,230,200,.12) 16deg,rgba(255,230,200,.09) 22deg,rgba(255,230,200,0) 32deg),
    radial-gradient(56% 40% at 50% 46%,rgba(255,226,200,.20),rgba(255,226,200,0) 72%),
    radial-gradient(120% 70% at 50% 50%,rgba(70,30,80,0) 40%,rgba(10,4,18,.65) 100%),
    linear-gradient(180deg,#1a0f2a 0%,#2a1638 48%,#1c0e26 100%)!important}
/* the two release lanes light up toward the side you are throwing */
${G1_SWIPE} .arena.literalSwipeArena::before,${G1_SWIPE} .arena.literalSwipeArena::after{content:""!important;position:absolute!important;top:12%!important;bottom:18%!important;width:30%!important;z-index:1!important;pointer-events:none!important;display:block!important;transform:none!important;opacity:.22;transition:opacity .2s}
${G1_SWIPE} .arena.literalSwipeArena::before{left:0!important;right:auto!important;background:radial-gradient(90% 60% at 0% 50%,rgba(255,140,190,.55),rgba(255,140,190,0) 70%)!important}
${G1_SWIPE} .arena.literalSwipeArena::after{right:0!important;left:auto!important;background:radial-gradient(90% 60% at 100% 50%,rgba(120,220,255,.55),rgba(120,220,255,0) 70%)!important}
${G1_SWIPE} .arena.literalSwipeArena.mv2Left::before{opacity:calc(.22 + var(--commit) * .78)!important}
${G1_SWIPE} .arena.literalSwipeArena.mv2Right::after{opacity:calc(.22 + var(--commit) * .78)!important}
${G1_SWIPE} .arena.literalSwipeArena>.swipeTrack{overflow:visible!important;position:absolute!important;left:6%!important;right:6%!important;top:calc(46% + var(--g1ch) / 2 + 26px)!important;height:2px!important;width:auto!important;transform:none!important;border-radius:2px!important;
  background:linear-gradient(90deg,rgba(255,150,200,.6),rgba(255,255,255,.12) 30%,rgba(255,255,255,.12) 70%,rgba(130,220,255,.6))!important;box-shadow:none!important;opacity:.7!important}
/* the table: a velvet top in perspective with the spotlight pool under the deck */
${G1_SWIPE} .arena.literalSwipeArena>.swipeHintLane{display:block!important;position:absolute!important;left:-30%!important;right:-30%!important;top:30%!important;bottom:-24%!important;width:auto!important;height:auto!important;margin:0!important;z-index:0!important;pointer-events:none!important;opacity:1!important;border-radius:50%!important;
  background:
    radial-gradient(30% 34% at 50% 34%,rgba(255,232,206,.30),rgba(255,232,206,0) 70%),
    repeating-radial-gradient(circle at 50% 40%,rgba(255,255,255,.018) 0 2px,rgba(0,0,0,0) 2px 4px),
    radial-gradient(60% 60% at 50% 40%,#5a2a5e,#3a1a40 55%,#1c0c22 100%)!important;
  box-shadow:inset 0 3px 0 rgba(255,210,240,.18),inset 0 30px 60px rgba(0,0,0,.35),0 -2px 0 #120716!important;transform:perspective(500px) rotateX(52deg)!important;transform-origin:50% 0!important;animation:none!important}
${G1_SWIPE} .arena.literalSwipeArena>.swipeHintLane>i{display:none!important}
/* the deck: the thoughts still waiting, stacked under the live card */
${G1_SWIPE} .arena.literalSwipeArena>.mv2SwipeDeck{position:absolute;left:50%;top:46%;width:var(--g1cw);height:var(--g1ch);margin:calc(var(--g1ch) / -2) 0 0 calc(var(--g1cw) / -2);z-index:2;pointer-events:none}
${G1_SWIPE} .arena.literalSwipeArena>.mv2SwipeDeck>i{position:absolute;inset:0;border-radius:24px;background:linear-gradient(180deg,#f2ece4,#ddd4c8);box-shadow:inset 0 0 0 1px rgba(80,50,30,.12),0 10px 20px rgba(0,0,0,.35);
  transform:translateY(calc(var(--k) * 9px)) scale(calc(1 - var(--k) * .045));opacity:calc(1 - var(--k) * .22);transition:transform .35s cubic-bezier(.2,.9,.3,1)}
${G1_SWIPE} .arena.literalSwipeArena>.mv2SwipeDeck>i:nth-child(1){z-index:3}
${G1_SWIPE} .arena.literalSwipeArena>.mv2SwipeDeck>i:nth-child(2){z-index:2}
${G1_SWIPE} .arena.literalSwipeArena>.mv2SwipeDeck>i:nth-child(3){z-index:1}
/* the live card: ivory card stock, picture above the words */
${G1_SWIPE} .arena.literalSwipeArena .swipeCard{position:absolute!important;left:50%!important;top:46%!important;right:auto!important;bottom:auto!important;width:var(--g1cw)!important;height:var(--g1ch)!important;min-height:0!important;margin:calc(var(--g1ch) / -2) 0 0 calc(var(--g1cw) / -2)!important;padding:20px 18px 34px!important;z-index:5!important;
  display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:12px!important;border-radius:24px!important;border:0!important;overflow:hidden!important;cursor:grab!important;
  touch-action:none!important;-webkit-user-select:none!important;user-select:none!important;-webkit-tap-highlight-color:transparent!important;
  background:radial-gradient(120% 70% at 50% 0%,#ffffff,#fbf7f1 55%,#f1e9de)!important;
  box-shadow:inset 0 0 0 1px rgba(90,60,40,.12),inset 0 2px 0 #fff,0 26px 46px -14px rgba(0,0,0,.7),0 0 0 1px rgba(0,0,0,.18)!important}
${G1_SWIPE} .arena.literalSwipeArena .swipeCard.dragging{cursor:grabbing!important;box-shadow:inset 0 0 0 1px rgba(90,60,40,.12),inset 0 2px 0 #fff,0 40px 60px -16px rgba(0,0,0,.75),0 0 0 1px rgba(0,0,0,.18)!important}
${G1_SWIPE} .arena.literalSwipeArena .swipeCard::before,${G1_SWIPE} .arena.literalSwipeArena .swipeCard::after{display:none!important}
${G1_SWIPE} .arena.literalSwipeArena .swipeCard .mv2PaperPic{width:clamp(84px,27vw,112px)!important;height:clamp(84px,27vw,112px)!important}
${G1_SWIPE} .arena.literalSwipeArena .swipeCard .mv2PaperWords{font-size:clamp(17px,5vw,21px)!important;line-height:1.22!important;color:#22182e!important}
${G1_SWIPE} .arena.literalSwipeArena .swipeCard>b{position:absolute!important;left:0!important;right:0!important;top:14px!important;display:block!important;visibility:visible!important;opacity:1!important;font:600 10.5px/1 ${FONT_ROUND}!important;letter-spacing:.22em!important;color:rgba(70,40,80,.45)!important;text-align:center!important;background:none!important;text-shadow:none!important;-webkit-text-fill-color:currentColor!important;padding:0!important;margin:0!important;border:0!important;box-shadow:none!important}
${G1_SWIPE} .arena.literalSwipeArena .swipeCard .mv2CommitMeter{position:absolute;left:18%;right:18%;bottom:16px;height:5px;border-radius:3px;background:rgba(60,30,70,.12);overflow:hidden}
${G1_SWIPE} .arena.literalSwipeArena .swipeCard .mv2CommitMeter>i{position:absolute;left:0;top:0;bottom:0;width:calc(var(--commit) * 100%);border-radius:3px;background:linear-gradient(90deg,#ff7eb3,#ffb36b);transition:width .28s cubic-bezier(.2,.9,.3,1)}
${G1_SWIPE} .arena.literalSwipeArena.mv2Dragging .swipeCard .mv2CommitMeter>i{transition:none}
${G1_SWIPE} .arena.literalSwipeArena.mv2Committed .swipeCard .mv2CommitMeter>i{background:linear-gradient(90deg,#5ee6a8,#7fe0ff)}
${G1_SWIPE} .arena.literalSwipeArena.mv2Committed .swipeCard{box-shadow:inset 0 0 0 2px rgba(94,230,168,.7),0 30px 50px -14px rgba(0,0,0,.7),0 0 34px rgba(94,230,168,.35)!important}
/* SWIPE AWAY climax (last card thrown): a comet streak follows it out and the lane flares */
${G1_SWIPE} .arena.literalSwipeArena>.swipeTrack::after{content:"";position:absolute;left:-30%;top:-60px;width:60%;height:120px;opacity:0;pointer-events:none;background:radial-gradient(50% 6% at 50% 50%,rgba(255,255,255,.95),rgba(255,210,170,.5) 40%,rgba(255,210,170,0) 100%);filter:blur(1px)}
${G1_SWIPE} .arena.literalSwipeArena.mv2Final>.swipeTrack::after{animation:g1Comet 1.1s cubic-bezier(.2,.7,.3,1) both}
@keyframes g1Comet{0%{opacity:0;transform:translateX(0) scaleX(.4)}15%{opacity:1}100%{opacity:0;transform:translateX(260%) scaleX(1.6)}}
${G1_SWIPE} .arena.literalSwipeArena.mv2Final.mv2Left>.swipeTrack::after{animation-name:g1CometL}
@keyframes g1CometL{0%{opacity:0;transform:translateX(160%) scaleX(.4)}15%{opacity:1}100%{opacity:0;transform:translateX(-120%) scaleX(1.6)}}
${G1_SWIPE} .arena.literalSwipeArena.mv2Final::before,${G1_SWIPE} .arena.literalSwipeArena.mv2Final::after{animation:g1LaneFlare 1.2s ease-out both!important}
@keyframes g1LaneFlare{0%{opacity:.22}20%{opacity:1}100%{opacity:.1}}

/* ================= calm visuals / reduced motion: still worlds, no climax motion ================= */
${G1_CALM} .arena,${G1_CALM} .arena::before,${G1_CALM} .arena::after,${G1_CALM} .arena *,${G1_CALM} .arena *::before,${G1_CALM} .arena *::after{animation-duration:.01ms!important;animation-iteration-count:1!important}
@media (prefers-reduced-motion:reduce){
${G1_ALL} .arena,${G1_ALL} .arena::before,${G1_ALL} .arena::after,${G1_ALL} .arena *,${G1_ALL} .arena *::before,${G1_ALL} .arena *::after{animation-duration:.01ms!important;animation-iteration-count:1!important}
}
`
