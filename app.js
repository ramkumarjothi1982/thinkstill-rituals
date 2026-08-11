const STORAGE_KEY = "thinkstill_v37_9_seen";
const SAVED_KEY = "thinkstill_v37_9_saved";
const THEME_KEY = "thinkstill_v37_9_theme";
let rituals = [];
let currentRitual = null;
let currentInput = "";
const $ = id => document.getElementById(id);

function esc(s=""){return String(s).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));}
function norm(s=""){return String(s).toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s'-]/g," ").replace(/\s+/g," ").trim();}
const STOP=new Set("a an the and or but if then to of in on at for from with without into is are was were be been being i me my mine we our you your it this that these those as so very really just still feel feels feeling think thinking thought thoughts mind right now about".split(" "));
function tokens(s){return norm(s).split(" ").filter(w=>w.length>2&&!STOP.has(w));}
function getSet(key){try{return new Set(JSON.parse(localStorage.getItem(key)||"[]"));}catch{return new Set();}}
function saveSet(key,set){localStorage.setItem(key,JSON.stringify([...set]));}
function seenIds(){return getSet(STORAGE_KEY)}
function markSeen(id){const s=seenIds();s.add(id);saveSet(STORAGE_KEY,s)}
function pool(){let s=seenIds();if(s.size>=rituals.length){localStorage.removeItem(STORAGE_KEY);s=new Set()}return rituals.filter(r=>!s.has(r.id));}
function score(r,text){const q=tokens(text);if(!q.length)return 0;const rt=r.routing||{};const fields=[[rt.trigger,5],[rt.secondaryTrigger,4],[rt.pattern,5],[rt.distressCue,2.5],[r.goal,2.7],[r.title,2],[r.steps,1.2],[r.formulaFlow,1.2]];let total=0;for(const word of q){for(const [field,w] of fields){const f=norm(field||"");if(f.includes(word))total+=w;if(word.length>5&&f.split(" ").some(x=>x.startsWith(word.slice(0,5))))total+=w*.35}}return total+Math.random()*.05;}
function choose(text=""){const p=pool();if(!p.length)return rituals[Math.floor(Math.random()*rituals.length)];if(!text.trim())return p[Math.floor(Math.random()*p.length)];const ranked=p.map(r=>[score(r,text),r]).sort((a,b)=>b[0]-a[0]);const best=ranked[0][0];const close=ranked.filter(([s])=>s>0&&s>=best*.9).slice(0,6);return close.length?close[Math.floor(Math.random()*close.length)][1]:p[Math.floor(Math.random()*p.length)];}
function parseStep(line){return line.replace(/^\s*\d+[.)]\s*/,"").trim();}
function formatStep(line){const p=line.split(/\s+[—–-]\s+/,2);return p.length===2?`<strong>${esc(p[0])}</strong> — ${esc(p[1])}`:esc(line);}
function cleanSafety(s){return String(s||"").replace(/^\s*PAUSE\s*/i,"").trim();}
function fullText(r){return `TITLE\n${r.title}\n\nGOAL\n${r.goal}\n\nRITUAL\n\n${r.steps}\n\nWIN\n${r.win}\n\n${r.supports}\n\nFORMULA FLOW\n${r.formulaFlow}\n\nSAFETY\nPAUSE\n${cleanSafety(r.safety)}`;}
function render(r){
  currentRitual=r;markSeen(r.id);
  $("welcome").hidden=true;$("ritualScreen").hidden=false;
  $("bubblePill").textContent=`◇ ${r.bubble} BUBBLE`;
  $("timePill").textContent=r.playTime||"1–2 minutes";
  $("ritualTitle").textContent=r.title;
  $("ritualGoal").textContent=r.goal;
  const steps=String(r.steps||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  $("stepsList").innerHTML=steps.map(x=>`<li>${formatStep(parseStep(x))}</li>`).join("");
  $("ritualWin").textContent=String(r.win||"").replace(/^\s*✓\s*/,"✓ ");
  const supports=String(r.supports||"").split(/\r?\n/).map(x=>x.replace(/^\s*[•*-]\s*/,"").trim()).filter(Boolean);
  $("supportsList").innerHTML=supports.map(x=>`<li>${esc(x)}</li>`).join("");
  const flow=String(r.formulaFlow||"").split("→").map(x=>x.trim()).filter(Boolean);
  $("flow").innerHTML=flow.map((x,i)=>`${i?'<span class="flow-arrow">→</span>':''}<span class="flow-chip">${esc(x)}</span>`).join("");
  $("safety").textContent=cleanSafety(r.safety);
  $("progressText").textContent=`${seenIds().size} of ${rituals.length} rituals used before the pool resets.`;
  $("saveBtn").textContent=getSet(SAVED_KEY).has(r.id)?"Saved ✓":"Save";
  window.scrollTo({top:0,behavior:"smooth"});
}
function showFromInput(){currentInput=$("thoughtInput").value.trim();render(choose(currentInput));}
function setTheme(theme){document.documentElement.dataset.theme=theme;localStorage.setItem(THEME_KEY,theme);$("themeToggle").textContent=theme==="light"?"☀ Bright":"☾ Dark";}
async function copyCurrent(){if(!currentRitual)return;try{await navigator.clipboard.writeText(fullText(currentRitual));$("copyBtn").textContent="Copied ✓";setTimeout(()=>$("copyBtn").textContent="Copy",1300)}catch{$("copyBtn").textContent="Copy failed";}}
function toggleSave(){if(!currentRitual)return;const s=getSet(SAVED_KEY);if(s.has(currentRitual.id))s.delete(currentRitual.id);else s.add(currentRitual.id);saveSet(SAVED_KEY,s);$("saveBtn").textContent=s.has(currentRitual.id)?"Saved ✓":"Save";}
function resetToInput(){$("ritualScreen").hidden=true;$("welcome").hidden=false;$("thoughtInput").focus();window.scrollTo({top:0,behavior:"smooth"});}
async function init(){
  setTheme(localStorage.getItem(THEME_KEY)||"dark");
  try{const res=await fetch("rituals.json",{cache:"no-store"});if(!res.ok)throw new Error(`HTTP ${res.status}`);rituals=await res.json();if(!Array.isArray(rituals)||rituals.length!==400)throw new Error("Expected exactly 400 rituals.");}
  catch(err){$("welcome").innerHTML=`<p class="eyebrow">RITUAL DATA ERROR</p><h1>rituals.json did not load.</h1><p>${esc(err.message||String(err))}</p><p>Upload <strong>index.html, styles.css, app.js and rituals.json</strong> to the same GitHub folder and use GitHub Pages.</p>`;return;}
  $("sendBtn").addEventListener("click",showFromInput);
  $("randomBtn").addEventListener("click",()=>{currentInput="";render(choose(""));});
  $("thoughtInput").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();showFromInput();}});
  $("anotherBtn").addEventListener("click",()=>render(choose(currentInput)));
  $("changeBtn").addEventListener("click",resetToInput);
  $("closeBtn").addEventListener("click",resetToInput);
  $("themeToggle").addEventListener("click",()=>setTheme(document.documentElement.dataset.theme==="light"?"dark":"light"));
  $("copyBtn").addEventListener("click",copyCurrent);
  $("saveBtn").addEventListener("click",toggleSave);
}
document.addEventListener("DOMContentLoaded",init);
