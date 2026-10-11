/* ================================================================== */
/* Shell styles (mobile chrome) + desktop overrides                    */
/* ================================================================== */
// TSM_SHELL_CSS styles the mobile chrome (all classes tsm*). TSM_DESKTOP_CSS re-composes the desktop
// console pieces for a portrait phone. The desktop stylesheet uses !important with ID-boosted selectors,
// so overrides use a triple-ID prefix (#tsmRoot ×3) to win deterministically.

const TSM_B = "#tsmRoot#tsmRoot#tsmRoot"
const TSM_BR = "#tsmRoot#tsmRoot#tsmRoot[data-theme=bright]"

const TSM_SHELL_CSS = String.raw`
/* ---------- living backdrop ---------- */
.tsm .tsmNebula.n1{left:-30%;top:-6%;width:95%;height:46%;background:radial-gradient(circle, rgba(120,84,255,.42), transparent 68%);animation:tsmDrift 19s ease-in-out infinite}
.tsm .tsmNebula.n2{right:-34%;top:38%;width:100%;height:44%;background:radial-gradient(circle, rgba(0,168,255,.26), transparent 68%);animation:tsmDrift 25s ease-in-out infinite;--nx:-26px;--ny:18px}
.tsm .tsmNebula.n3{left:-20%;bottom:-14%;width:90%;height:40%;background:radial-gradient(circle, rgba(255,150,96,.18), transparent 70%);animation:tsmDrift 29s ease-in-out infinite;--nx:18px}
.tsm[data-theme=bright] .tsmNebula.n1{background:radial-gradient(circle, rgba(160,130,255,.30), transparent 68%)}
.tsm[data-theme=bright] .tsmNebula.n2{background:radial-gradient(circle, rgba(90,170,255,.24), transparent 68%)}
.tsm[data-theme=bright] .tsmNebula.n3{background:radial-gradient(circle, rgba(255,170,110,.28), transparent 70%)}

/* ---------- shell frame ---------- */
.tsmShell{--safeT:env(safe-area-inset-top,0px);--safeB:env(safe-area-inset-bottom,0px);--hdr:54px;--top:calc(var(--safeT) + var(--hdr));--story:56px}

/* ---------- header ---------- */
.tsmHeader{position:absolute;left:0;right:0;top:0;z-index:400;height:var(--top);padding:var(--safeT) 6px 0;display:flex;align-items:center;justify-content:space-between;gap:4px;pointer-events:none}
.tsmHeader::before{content:"";position:absolute;inset:0 0 -14px;pointer-events:none;
  background:linear-gradient(180deg, var(--bg0) 0%, rgba(0,0,0,0) 100%);opacity:.0;transition:opacity .4s}
.tsmShell.tsm-play .tsmHeader::before{opacity:.9}
.tsm[data-theme=bright] .tsmShell.tsm-play .tsmHeader::before{opacity:.75}
.tsmHeadSide{display:flex;align-items:center;gap:0;position:relative;z-index:1;pointer-events:auto;flex:none}
.tsmHBtn{position:relative;width:38px;height:44px;border-radius:14px;display:grid;place-items:center;color:var(--ink);opacity:.9;transition:transform .16s cubic-bezier(.2,.8,.2,1), opacity .2s, background .2s}
.tsmHBtn:active{transform:scale(.88);background:var(--fill)}
.tsmHBtn[aria-disabled=true]{opacity:.28}
.tsmHBtn.isOn{color:var(--accent)}
.tsmHBtn .tsmMusicPulse{position:absolute;inset:8px;border-radius:50%;border:1.5px solid var(--accent);opacity:0;animation:tsmRing 2.6s ease-out infinite}
.tsmTitle{position:relative;z-index:1;min-width:0;flex:1;text-align:center;line-height:1.1;pointer-events:none;padding:0 2px}
.tsmTitle b{display:block;font-size:clamp(12px,3.55vw,14.5px);font-weight:600;letter-spacing:-.02em;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tsmTitle span{display:block;margin-top:2px;font-size:11px;font-weight:500;letter-spacing:.01em;color:var(--ink3)}
.tsmTitle em{font-style:normal;font-weight:650;background:linear-gradient(90deg, var(--accent), var(--accent2));-webkit-background-clip:text;background-clip:text;color:transparent}
@media (max-width:370px){.tsmHBtn{width:34px}}

/* ---------- story strip: thought → words → release ---------- */
.tsmStory{position:absolute;left:12px;right:12px;top:var(--top);z-index:390;height:var(--story);padding:7px 8px 0 14px;border-radius:18px;
  background:var(--surface);-webkit-backdrop-filter:blur(18px) saturate(1.4);backdrop-filter:blur(18px) saturate(1.4);box-shadow:inset 0 0 0 1px var(--hair2), 0 8px 24px rgba(0,0,0,.18)}
.tsmStoryTop{display:flex;align-items:center;gap:10px}
.tsmStoryText{flex:1;min-width:0;display:flex;align-items:baseline;gap:8px;white-space:nowrap;overflow:hidden}
.tsmStoryText b{font-size:15px;font-weight:650;letter-spacing:-.01em;color:var(--ink);flex:none}
.tsmStoryText span{font-size:12.5px;color:var(--ink2);overflow:hidden;text-overflow:ellipsis}
.tsmStoryEdit{flex:none;width:34px;height:30px;margin-top:-2px;border-radius:12px;display:grid;place-items:center;color:var(--ink2);background:var(--fill)}
.tsmStoryEdit.isOn{color:var(--accentInk);background:var(--accent)}
.tsmSteps{display:flex;align-items:center;gap:6px;margin-top:5px;padding-right:6px}
.tsmStep{display:flex;align-items:center;gap:5px;font-size:10.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--ink3);flex:none;transition:color .4s}
.tsmStep i{width:7px;height:7px;border-radius:50%;background:var(--hair);box-shadow:none;transition:all .4s}
.tsmStep.isOn{color:var(--ink2)}
.tsmStep.isOn i{background:var(--accent);box-shadow:0 0 8px var(--accent)}
.tsmStepLine{position:relative;flex:1;height:2px;border-radius:2px;background:var(--hair);overflow:hidden;min-width:14px}
.tsmStepLine.isOn{background:var(--accent);opacity:.65}
.tsmStepLine em{position:absolute;inset:0 auto 0 0;width:var(--p,0%);background:linear-gradient(90deg, var(--accent), var(--accent2));transition:width .5s cubic-bezier(.2,.8,.2,1);border-radius:2px}
.tsmStory.isDone{box-shadow:inset 0 0 0 1px var(--accent), 0 0 30px var(--accentGlow)}
.tsmStory.isDone .tsmStoryText span{color:var(--accent)}

/* ---------- home (check-in skipped) ---------- */
.tsmHome{position:absolute;inset:0;z-index:30;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:30px 28px 120px;text-align:center;overflow-y:auto}
.tsmHome .tsmHomeEcl{margin:18px 0 44px;display:grid;place-items:center}
.tsmHome h1{margin:0;color:var(--ink)}
.tsmHome p.tSub{margin:12px auto 0;max-width:320px}
.tsmHowSteps{list-style:none;margin:28px 0 0;padding:0;display:flex;flex-direction:column;gap:12px;width:100%;max-width:330px;text-align:left}
.tsmHowSteps li{display:flex;gap:14px;align-items:flex-start;padding:12px 14px;border-radius:16px;background:var(--fill);box-shadow:inset 0 0 0 1px var(--hair2)}
.tsmHowSteps b{flex:none;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-size:13px;font-weight:650;color:var(--accentInk);background:var(--accent)}
.tsmHowSteps span{font-size:13.5px;line-height:1.35;color:var(--ink2)}
.tsmHowSteps strong{display:block;font-size:15px;font-weight:600;color:var(--ink);margin-bottom:1px}

/* ---------- composer ---------- */
.tsmComposer{position:absolute;left:0;right:0;bottom:0;z-index:420;padding:10px 12px calc(10px + var(--safeB));transition:transform .28s cubic-bezier(.2,.8,.2,1)}
.tsmComposer::before{content:"";position:absolute;inset:-26px 0 0;pointer-events:none;background:linear-gradient(180deg, rgba(0,0,0,0), var(--bg0) 46%);opacity:.92}
.tsmComposer.hasKb{padding-bottom:10px}
.tsmComposer.isEdit{z-index:430}
.tsmEditNote{position:relative;margin:0 6px 8px;font-size:12.5px;color:var(--ink2);text-align:center}
.tsmComposerRow{position:relative;display:flex;align-items:center;gap:8px}
.tsmCBtn{position:relative;flex:none;width:46px;height:46px;border-radius:23px;display:grid;place-items:center;color:var(--ink);background:var(--fill);box-shadow:inset 0 0 0 1px var(--hair)}
.tsmCBtn.isOn{color:var(--accent)}
.tsmCBtn:active{transform:scale(.92)}
.tsmBadge{position:absolute;right:-2px;top:-2px;min-width:18px;height:18px;padding:0 5px;border-radius:9px;font-size:11px;font-weight:700;line-height:18px;color:var(--accentInk);background:var(--accent)}
.tsmField{position:relative;flex:1;min-width:0;height:48px;border-radius:24px;background:var(--fill2);box-shadow:inset 0 0 0 1px var(--hair), 0 6px 20px rgba(0,0,0,.14);display:flex;align-items:center;transition:box-shadow .25s}
.tsmField:focus-within{box-shadow:inset 0 0 0 1.5px var(--accent), 0 6px 26px var(--accentGlow)}
.tsmField.isListening{box-shadow:inset 0 0 0 1.5px var(--warn), 0 6px 26px rgba(255,120,100,.25)}
.tsmField input{flex:1;min-width:0;height:100%;border:0;background:transparent;padding:0 4px 0 18px;font-size:16px;line-height:1.2;color:var(--ink);outline:none;border-radius:24px}
.tsmField input::placeholder{color:var(--ink3);opacity:1}
.tsmMic{position:relative;flex:none;width:42px;height:42px;margin-right:3px;border-radius:21px;display:grid;place-items:center;color:var(--ink2)}
.tsmMic.isOn{color:#fff;background:var(--warn)}
.tsmMic .tsmMicWave{position:absolute;inset:-3px;border-radius:50%;border:2px solid var(--warn);animation:tsmRing 1.3s ease-out infinite}
.tsmGo{flex:none;width:48px;height:48px;border-radius:24px;display:grid;place-items:center;color:var(--accentInk);background:var(--fill);box-shadow:inset 0 0 0 1px var(--hair);transition:transform .2s, box-shadow .3s, background .3s}
.tsmGo.isReady{background:radial-gradient(circle at 50% 40%, var(--accentHi), var(--accent));box-shadow:0 8px 26px var(--accentGlow)}
.tsmGo:active{transform:scale(.9)}
.tsmGo .tsmGoEcl{width:22px;height:22px;border-radius:50%;background:radial-gradient(circle, #14112e 54%, transparent 57%), radial-gradient(circle, rgba(255,240,215,1) 56%, rgba(255,200,120,.6) 64%, transparent 74%);box-shadow:0 0 10px rgba(255,210,150,.8)}
.tsmComposer.isEdit .tsmGo{color:var(--accentInk);background:var(--accent)}

/* ---------- toast ---------- */
.tsmToast{position:absolute;left:50%;bottom:calc(var(--lift,26px) + var(--safeB));z-index:600;max-width:calc(100% - 40px);transform:translate(-50%,16px);opacity:0;pointer-events:none;
  padding:11px 18px;border-radius:20px;font-size:14px;font-weight:500;line-height:1.3;text-align:center;color:var(--ink);
  background:var(--surface);-webkit-backdrop-filter:blur(20px) saturate(1.5);backdrop-filter:blur(20px) saturate(1.5);box-shadow:inset 0 0 0 1px var(--hair2), var(--shadow);transition:opacity .25s, transform .35s cubic-bezier(.2,.8,.2,1)}
.tsmToast.isOn{opacity:1;transform:translate(-50%,0)}

/* ---------- settings popover ---------- */
.tsmSettings{position:absolute;right:10px;top:calc(var(--top) - 2px);z-index:700;width:min(320px, calc(100% - 20px));max-height:calc(100% - var(--top) - 20px);overflow-y:auto;padding:14px 14px 12px;border-radius:22px;
  background:var(--sheet);-webkit-backdrop-filter:blur(30px) saturate(1.6);backdrop-filter:blur(30px) saturate(1.6);box-shadow:inset 0 0 0 1px var(--hair2), 0 24px 60px rgba(0,0,0,.42);
  transform-origin:calc(100% - 64px) 0;animation:tsmPop .32s cubic-bezier(.2,1.2,.3,1)}
@keyframes tsmPop{from{opacity:0;transform:scale(.86) translateY(-8px)}to{opacity:1;transform:none}}
.tsmSetHead{display:flex;align-items:center;justify-content:space-between;padding:2px 4px 10px}
.tsmSetHead b{font-size:17px;font-weight:650;letter-spacing:-.01em}
.tsmDone{height:32px;padding:0 14px;border-radius:16px;font-size:15px;font-weight:600;color:var(--accent)}
.tsmGroup{border-radius:16px;background:var(--fill);box-shadow:inset 0 0 0 1px var(--hair2);margin-bottom:10px;overflow:hidden}
.tsmRow{width:100%;min-height:48px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:15.5px;color:var(--ink);text-align:left}
.tsmRow+.tsmRow{box-shadow:0 -1px 0 var(--hair2)}
.tsmRow.col{flex-direction:column;align-items:stretch;gap:10px}
.tsmRow em{font-style:normal;color:var(--ink3);font-size:14px;margin-left:6px}
.tsmRow.link span{display:flex;align-items:center;gap:10px}
.tsmRow .gold{color:var(--accent);font-weight:550}
.tsmSwitch{position:relative;flex:none;width:51px;height:31px;border-radius:16px;background:var(--hair);transition:background .25s}
.tsmSwitch i{position:absolute;left:2px;top:2px;width:27px;height:27px;border-radius:50%;background:#fff;box-shadow:0 3px 8px rgba(0,0,0,.22);transition:transform .28s cubic-bezier(.3,1.4,.4,1)}
.tsmSwitch.isOn{background:#34C759}
.tsmSwitch.isOn i{transform:translateX(20px)}
.tsmRange{-webkit-appearance:none;appearance:none;width:100%;height:28px;background:transparent}
.tsmRange::-webkit-slider-runnable-track{height:5px;border-radius:3px;background:linear-gradient(90deg, var(--accent) var(--v), var(--hair) var(--v))}
.tsmRange::-moz-range-track{height:5px;border-radius:3px;background:var(--hair)}
.tsmRange::-moz-range-progress{height:5px;border-radius:3px;background:var(--accent)}
.tsmRange::-webkit-slider-thumb{-webkit-appearance:none;width:26px;height:26px;margin-top:-10.5px;border-radius:50%;background:#fff;box-shadow:0 3px 9px rgba(0,0,0,.28)}
.tsmRange::-moz-range-thumb{width:26px;height:26px;border:0;border-radius:50%;background:#fff;box-shadow:0 3px 9px rgba(0,0,0,.28)}
.tsmSeg{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;padding:2px;border-radius:10px;background:var(--hair2)}
.tsmSeg button{height:32px;border-radius:8px;font-size:14px;font-weight:500;color:var(--ink2)}
.tsmSeg button.isOn{color:var(--ink);background:var(--fill2);box-shadow:0 2px 8px rgba(0,0,0,.14);font-weight:600}
.tsmSetFoot{padding:4px 6px 2px;font-size:12px;color:var(--ink3);text-align:center}

/* ---------- sheets ---------- */
.tsmSheetWrap{position:absolute;inset:0;z-index:720}
.tsmScrim{position:absolute;inset:0;background:var(--scrim);animation:tsmFadeIn .25s ease}
.tsmSheet{position:absolute;left:0;right:0;bottom:0;max-height:88%;overflow-y:auto;padding:8px 20px calc(22px + var(--safeB, 0px));border-radius:26px 26px 0 0;
  background:var(--sheet);-webkit-backdrop-filter:blur(30px) saturate(1.6);backdrop-filter:blur(30px) saturate(1.6);box-shadow:0 -16px 50px rgba(0,0,0,.35);animation:tsmSheetUp .42s cubic-bezier(.2,1,.3,1)}
@keyframes tsmSheetUp{from{transform:translateY(100%)}to{transform:none}}
.tsmGrab{display:block;width:38px;height:5px;border-radius:3px;background:var(--hair);margin:2px auto 8px}
.tsmSheetHead{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
.tsmSheetHead b{font-size:20px;font-weight:650;letter-spacing:-.015em}
.tsmSheetLead{margin:6px 0 14px;font-size:15px;line-height:1.45;color:var(--ink2)}
.tsmSheetFoot{margin:12px 0 0;font-size:12.5px;line-height:1.4;color:var(--ink3);text-align:center}
.tsmSlots{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:4px 0 16px}
.tsmSlot{position:relative;aspect-ratio:1;border-radius:50%;display:grid;place-items:center;color:var(--ink3);background:var(--fill);box-shadow:inset 0 0 0 1.5px var(--hair);overflow:visible}
.tsmSlot.filled{box-shadow:0 6px 18px rgba(0,0,0,.25), 0 0 0 2px var(--orbRim)}
.tsmSlot img{width:100%;height:100%;border-radius:50%;object-fit:cover;display:block}
.tsmSlotX{position:absolute;right:2%;top:2%;width:26px;height:26px;border-radius:13px;display:grid;place-items:center;color:#fff;background:rgba(20,16,40,.85);box-shadow:0 2px 6px rgba(0,0,0,.3)}
.tsmUi .wide{width:100%}

/* ---------- reveal ---------- */
.tsmReveal{position:absolute;inset:0;z-index:60;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;padding:10px 18px calc(28px + var(--safeB));display:flex;flex-direction:column;align-items:center}
.tsmRevealHero{display:flex;flex-direction:column;align-items:center;margin-top:4px}
.tsmRevealHero .ecl{margin:20px 0 22px}
.tsmRevealTitle{text-align:center}
.tsmRevealTitle h2{margin:8px 0 0;font-size:30px;font-weight:700;letter-spacing:-.02em;color:var(--ink)}
.tsmHeadline{margin:8px 0 0;display:flex;flex-direction:column;gap:3px;align-items:center}
.tsmHeadline b{font-size:15px;font-weight:650;letter-spacing:.06em;color:var(--accent)}
.tsmHeadline span{font-size:14px;color:var(--ink2);letter-spacing:.02em}
.tsmReleasedWords{width:100%;max-width:360px;margin:20px 0 6px;padding:14px 16px;border-radius:18px;background:var(--fill);box-shadow:inset 0 0 0 1px var(--hair2);text-align:center}
.tsmRWLabel{display:block;font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--ink3)}
.tsmReleasedWords p{position:relative;margin:8px 0 6px;font-size:17px;line-height:1.35;color:var(--ink);min-height:23px}
.tsmReleasedWords p .tsmWordsGhost{position:absolute;inset:0;font-style:normal;color:var(--ink3);opacity:0;filter:blur(.6px);letter-spacing:.01em;animation:tsmGhostIn 1.4s ease 3.2s forwards;pointer-events:none}
@keyframes tsmGhostIn{to{opacity:.38}}
.tsmReleasedWords p i{display:inline-block;font-style:normal;animation:tsmLetterGo 1.7s cubic-bezier(.5,0,.6,1) forwards;animation-delay:calc(var(--d) + 1.3s)}
@keyframes tsmLetterGo{0%{opacity:1;transform:none;filter:blur(0)}55%{opacity:.85;color:var(--accent)}100%{opacity:0;transform:translate(var(--x),-46px) rotate(var(--r)) scale(.6);filter:blur(2px)}}
.tsmRWLine{display:block;font-size:13.5px;color:var(--accent);font-weight:550;animation:tsmFadeUp .8s ease 2.9s both}
.tsmMeterWrap{width:100%;max-width:400px;margin-top:6px}
.tsmCheck{width:100%;max-width:360px;margin-top:12px;display:flex;flex-direction:column;align-items:center;gap:12px}
.tsmCheck h3{margin:6px 0 0;font-size:20px;font-weight:650;color:var(--ink)}
.tsmCheckRow{display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%}
.tsmChoice{height:52px;border-radius:26px;display:flex;align-items:center;justify-content:center;gap:6px;font-size:17px;font-weight:600;color:var(--ink);background:var(--fill);box-shadow:inset 0 0 0 1px var(--hair)}
.tsmChoice.isOn{color:var(--accentInk);background:var(--accent)}
.tsmCheckOut{width:100%;display:flex;flex-direction:column;gap:12px;animation:tsmFadeUp .4s ease}
.tsmMind{margin:4px 0;font-size:16px;line-height:1.4;color:var(--ink2);text-align:center}
.tsmActions{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.tsmActions .tsmPrimary,.tsmActions .tsmSecondary{padding:0 12px;font-size:16px}
.tsmReco{display:flex;gap:14px;align-items:center;padding:12px 14px;border-radius:18px;background:var(--fill);box-shadow:inset 0 0 0 1px var(--hair2);text-align:left}
.tsmReco img{width:64px;height:64px;border-radius:50%;flex:none}
.tsmReco strong{display:block;margin:4px 0 2px;font-size:17px;font-weight:650;color:var(--ink)}
.tsmReco p{margin:0;font-size:13.5px;line-height:1.35;color:var(--ink2)}
.tsmLibNav{display:flex;gap:8px;margin-top:10px}
`

/* Desktop console pieces, re-composed for a portrait phone. */
const TSM_DESKTOP_CSS = String.raw`
${TSM_B} .tsArcade{position:absolute!important;inset:0!important;min-height:0!important;height:100%!important;overflow:hidden!important;background:transparent!important;color:var(--ink)!important}
/* Apple typography: SF Rounded inside rituals and the check-in (the desktop used Baloo 2), SF Pro for chrome */
${TSM_B} .tsArcade{--eos-font:${FONT_ROUND}!important;font-family:${FONT_ROUND}!important}
${TSM_B} .tsArcade :not(.tsmUi):not(.tsmUi *):not(svg):not(svg *){font-family:${FONT_ROUND}!important}
${TSM_B} .tsArcade>.ambient,${TSM_B} .tsArcade>.scan,${TSM_B} .tsArcade>.infinityField{display:none!important}
${TSM_B} .tsPixarRoot{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;background:transparent!important}
${TSM_B} .tsArcade>.shell.tsmShell{position:absolute!important;inset:0!important;display:block!important;width:100%!important;max-width:none!important;height:100%!important;padding:0!important;margin:0!important;grid-template-rows:none!important;background:transparent!important;overflow:hidden!important}
${TSM_B} .tsmShell>.releaseStage{position:absolute!important;left:0!important;right:0!important;top:var(--top)!important;bottom:0!important;height:auto!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;overflow:hidden!important;z-index:20!important}
${TSM_B} .tsmShell.tsm-input>.releaseStage{bottom:calc(70px + var(--safeB))!important}
${TSM_B} .tsmShell.tsm-play>.releaseStage{top:calc(var(--top) + var(--story) + 6px)!important;bottom:var(--safeB)!important}
${TSM_B} .tsmShell.tsm-reveal>.releaseStage{bottom:0!important}
${TSM_B} .tsmShell>.tsmHeader{border:0!important;box-shadow:none!important;background:transparent!important;border-radius:0!important;position:absolute!important;z-index:400!important;top:0!important;left:0!important;right:0!important}
${TSM_B} .tsmShell>.tsmStory{position:absolute!important;z-index:390!important;top:var(--top)!important;left:12px!important;right:12px!important}
${TSM_B} .tsmShell>.tsmComposer{position:absolute!important;z-index:420!important;left:0!important;right:0!important;bottom:0!important;top:auto!important}
${TSM_B} .tsmShell>.tsmToast{position:absolute!important;z-index:600!important}
${TSM_B} .tsmShell>.tsmSettings{position:absolute!important;z-index:700!important}
${TSM_B} .tsmShell>.tsmSheetWrap{position:absolute!important;z-index:720!important;inset:0!important}
${TSM_B} .tsmComposer input.releaseThoughtInput{all:unset;flex:1;min-width:0;height:100%;padding:0 4px 0 18px!important;font:400 16px/1.2 ${FONT}!important;color:var(--ink)!important;background:transparent!important;border:0!important;box-shadow:none!important;-webkit-user-select:text;user-select:text;cursor:text}
${TSM_B} .tsmComposer input.releaseThoughtInput::placeholder{color:var(--ink3)!important;opacity:1!important}
/* the check-in's launch dive becomes the Eclipse core growing from the touch (the curtain continues it) */
${TSM_B} .eosCkDive{background:radial-gradient(circle at var(--eos-x) var(--eos-y), hsla(var(--eos-h),90%,70%,.75) 0, hsla(var(--eos-h),70%,30%,.9) 7%, #1b1640 16%, #07060f 52%, #020108 100%)!important}
/* check-in: Apple-clean headings (no gold glow), one line on every phone */
${TSM_B} .eosCheckIn .eosCkTitle{font:700 clamp(22px,6.4vw,28px)/1.1 ${FONT}!important;letter-spacing:-.022em!important;color:var(--ink)!important;background:none!important;-webkit-text-fill-color:currentColor!important;text-shadow:none!important;white-space:nowrap!important;filter:none!important}
${TSM_B} .eosCheckIn .eosCkQ{font:700 clamp(20px,5.8vw,25px)/1.15 ${FONT}!important;letter-spacing:-.02em!important;color:var(--ink)!important;background:none!important;-webkit-text-fill-color:currentColor!important;text-shadow:none!important}
${TSM_B} .eosCheckIn .eosCkHead p,${TSM_B} .eosCheckIn .eosCkSub{font:400 15px/1.35 ${FONT}!important;color:var(--ink2)!important;text-shadow:none!important;letter-spacing:-.005em!important}
/* bright mode: the check-in sits on the airy dawn backdrop */
${TSM_BR} .eosCheckIn{background:none!important}
${TSM_BR} .eosCheckIn .eosCkGlow{opacity:.35!important}
${TSM_BR} .eosCheckIn .eosOrbLabel{color:var(--ink)!important;text-shadow:0 1px 0 rgba(255,255,255,.6)!important}
${TSM_BR} .eosCheckIn .eosOrbSub,${TSM_BR} .eosCheckIn .eosCkSubPart{color:var(--ink2)!important;text-shadow:none!important}
${TSM_BR} .eosCheckIn .eosCkLink{color:var(--ink2)!important;text-shadow:none!important}
${TSM_BR} .eosCheckIn .eosCkChip:not(.isGood){background:var(--fill2)!important;color:var(--ink)!important;box-shadow:inset 0 0 0 1px var(--hair),0 6px 18px rgba(60,40,120,.12)!important;text-shadow:none!important}
${TSM_BR} .eosCheckIn .eosCkHeadCold{color:var(--ink)!important}
${TSM_B} .tsArcade::before,${TSM_B} .tsArcade::after{display:none!important}
${TSM_B} .tsmShell .eosThoughtFlow{background:transparent!important}
${TSM_BR} .tsmShell.tsm-input>.releaseStage::before,${TSM_BR} .tsmShell.tsm-input>.releaseStage::after,${TSM_BR} .tsmShell.tsm-reveal>.releaseStage::before,${TSM_BR} .tsmShell.tsm-reveal>.releaseStage::after{display:none!important;opacity:0!important;content:none!important}
/* the Pixar light rig lights the ritual world only: below the header + story strip, during play */
${TSM_B} .tsPixarRoot>.tsArcade:not(.stage-play)~.tsPxRig{display:none!important}
${TSM_B} .tsPixarRoot>.tsPxRig{top:calc(env(safe-area-inset-top,0px) + 116px)!important;bottom:0!important;left:0!important;right:0!important;height:auto!important}
${TSM_BR} .eosCheckIn .eosCkHead.isCold,${TSM_BR} .eosCheckIn .eosCkHead{background:none!important}
${TSM_BR} .eosCheckIn .eosCkMeet{color:#C2334A!important;text-shadow:none!important}
${TSM_BR} .eosCheckIn .eosCkNamed{color:#A85A12!important;text-shadow:none!important}
${TSM_BR} .eosCheckIn .eosCkWordsQ,${TSM_BR} .eosCheckIn .eosCkChevron{color:var(--ink2)!important;text-shadow:none!important}
${TSM_BR} .eosDialWord{color:#C2334A!important;text-shadow:none!important}
${TSM_BR} .eosShiftMeter :is(.eosShiftHead,.eosShiftHeadline,.eosShiftSub,.eosShiftLine,.eosShiftMany,.eosShiftHelp,.eosShiftRetro,.eosSmTitle,.eosSmCaption,.eosShiftNum,.eosShiftRewards),${TSM_BR} .eosShiftMeter :is(.eosShiftHead,.eosSmTitle,.eosSmCaption) *{color:var(--ink)!important;text-shadow:none!important;-webkit-text-fill-color:currentColor!important}
${TSM_BR} .eosShiftMeter :is(.eosSmSkip,.eosShiftLink,.eosShiftShareLink){color:var(--ink2)!important;text-shadow:none!important}
${TSM_BR} .eosShiftMeter .eosShiftHalo{opacity:.45!important}
${TSM_BR} .eosDialLabel,${TSM_BR} .eosDialLabel *{color:var(--ink)!important;text-shadow:none!important;-webkit-text-fill-color:currentColor!important}
${TSM_BR} .eosShiftMeter .eosShiftSet:disabled{opacity:.55!important}
/* end screen buttons: one Apple-style capsule system */
${TSM_B} .eosShiftMeter .eosShiftBtn{min-height:54px!important;border-radius:27px!important;font:600 17px/1.15 ${FONT}!important;letter-spacing:-.01em!important;text-transform:none!important;box-shadow:none!important;border:0!important}
${TSM_B} .eosShiftMeter .eosShiftBtn.isGood{background:linear-gradient(180deg,var(--accentHi),var(--accent))!important;color:var(--accentInk)!important;box-shadow:0 10px 28px var(--accentGlow), inset 0 1px 0 rgba(255,255,255,.45)!important}
${TSM_B} .eosShiftMeter .eosShiftBtn.isMore{background:var(--fill)!important;color:var(--ink)!important;box-shadow:inset 0 0 0 1px var(--hair)!important}
${TSM_B} .eosShiftMeter .eosShiftBtn.isTalk{background:transparent!important;color:var(--accent)!important;box-shadow:inset 0 0 0 1.5px var(--accent)!important}
${TSM_B} .eosShiftMeter .eosShiftBtn small{font:500 12.5px/1.2 ${FONT}!important;opacity:.75!important;text-transform:none!important;letter-spacing:0!important}
${TSM_B} .eosShiftMeter .eosShiftBtn:active{transform:scale(.97)!important}
/* native ritual play: the ritual layer lives under the console; the console's transparent full-screen
   containers let touches through and only the chrome (header buttons, story strip, composer, popovers,
   sheets, the safety card) stays interactive. Desktop decoration over the stage is switched off. */
${TSM_B}[data-native=true] .tsPixarRoot,${TSM_B}[data-native=true] .tsArcade,${TSM_B}[data-native=true] .tsmShell,${TSM_B}[data-native=true] .tsmShell>.releaseStage,${TSM_B}[data-native=true] .tsmShell>.releaseStage>*{pointer-events:none!important}
${TSM_B}[data-native=true] .tsmShell>.releaseStage>:not(.eosSafetyCard):not(:has(.eosSafetyCard)){visibility:hidden!important}
${TSM_B}[data-native=true] .tsmShell>.releaseStage::before,${TSM_B}[data-native=true] .tsmShell>.releaseStage::after,${TSM_B}[data-native=true] .tsPxRig{display:none!important}
${TSM_B}[data-native=true] .tsmShell .eosSafetyCard,${TSM_B}[data-native=true] .tsmShell .eosSafetyCard *{pointer-events:auto!important;visibility:visible!important}
${TSM_B}[data-native=true] .tsmShell>:is(.tsmStory,.tsmComposer,.tsmSettings,.tsmSheetWrap,.tsmToast),${TSM_B}[data-native=true] .tsmShell .tsmHeadSide{pointer-events:auto!important}
/* full-bleed ritual worlds: no card frame around the arena on a phone */
${TSM_B} .tsmShell .releaseGameHost .arena{border:0!important;border-radius:0!important;box-shadow:none!important}
${TSM_B} .tsmShell .releaseGameHost{border:0!important;border-radius:0!important;box-shadow:none!important;background:transparent!important}
/* the desktop progress HUD stays in the DOM (the story strip reads it) but the strip shows progress */
${TSM_B} .tsmShell .engineProgressHud{opacity:0!important;pointer-events:none!important;height:0!important;min-height:0!important;overflow:hidden!important;margin:0!important;padding:0!important}
`
