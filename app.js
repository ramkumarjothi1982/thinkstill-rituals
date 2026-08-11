const STORAGE_KEY = "thinkstill_v37_9_seen";
const THEME_KEY = "thinkstill_theme";
let rituals = [];
let currentInput = "";
let currentRitual = null;

const $ = (id) => document.getElementById(id);

function norm(s="") {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s'-]/g, " ").replace(/\s+/g," ").trim();
}

const STOP = new Set("a an the and or but if then to of in on at for from with without into is are was were be been being i me my mine we our you your it this that these those as so very really just still keep keeps kept feel feels feeling think thinking thought thoughts mind right now about".split(" "));
function tokens(s) { return norm(s).split(" ").filter(w => w.length > 2 && !STOP.has(w)); }

function seenIds() {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")); }
  catch { return new Set(); }
}
function saveSeen(set) { localStorage.setItem(STORAGE_KEY, JSON.stringify([...set])); }
function markSeen(id) { const s=seenIds(); s.add(id); saveSeen(s); }
function availablePool() {
  let s=seenIds();
  if (s.size >= rituals.length) { localStorage.removeItem(STORAGE_KEY); s=new Set(); }
  return rituals.filter(r => !s.has(r.id));
}

function scoreRitual(r, userText) {
  const q=tokens(userText); if (!q.length) return 0;
  const rt=r.routing || {};
  const weighted=[
    [rt.trigger,5.0],[rt.secondaryTrigger,4.0],[rt.pattern,5.0],[rt.distressCue,2.0],
    [r.goal,2.7],[r.title,2.0],[r.steps,1.0],[r.formulaFlow,1.2]
  ];
  let score=0;
  for (const word of q) {
    for (const [field,w] of weighted) {
      const f=norm(field || "");
      if (!f) continue;
      if (f.includes(word)) score += w;
      if (word.length > 5 && f.split(" ").some(x => x.startsWith(word.slice(0,5)))) score += w*.35;
    }
  }
  const phrase=norm(userText);
  if (rt.pattern && phrase.includes(norm(rt.pattern))) score += 12;
  if (rt.trigger && phrase.includes(norm(rt.trigger))) score += 12;
  return score + Math.random()*.08;
}

function chooseRitual(text="") {
  const pool=availablePool();
  if (!pool.length) return rituals[Math.floor(Math.random()*rituals.length)];
  if (!text.trim()) return pool[Math.floor(Math.random()*pool.length)];
  const ranked=pool.map(r=>[scoreRitual(r,text),r]).sort((a,b)=>b[0]-a[0]);
  const best=ranked[0][0];
  const close=ranked.filter(([s])=>s >= best*.90 && s>0).slice(0,6);
  return (close.length ? close[Math.floor(Math.random()*close.length)][1] : pool[Math.floor(Math.random()*pool.length)]);
}

function parseStep(line) {
  return line.replace(/^\s*\d+[.)]\s*/, "").trim();
}
function formatStep(s) {
  const parts=s.split(/\s+[—–-]\s+/,2);
  if(parts.length===2) return `<strong>${escapeHtml(parts[0])}</strong> — ${escapeHtml(parts[1])}`;
  return escapeHtml(s);
}
function escapeHtml(s="") { return s.replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }

function render(r) {
  currentRitual=r; markSeen(r.id);
  $("bubblePill").textContent=r.bubble;
  $("timePill").textContent=r.playTime;
  $("ritualTitle").textContent=r.title;
  $("ritualGoal").textContent=r.goal;
  $("ritualWin").textContent=r.win.replace(/^✓\s*/, "✓ ");
  const steps=r.steps.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  $("stepsList").innerHTML=steps.map(x=>`<li>${formatStep(parseStep(x))}</li>`).join("");
  const supports=r.supports.split(/\r?\n/).map(x=>x.replace(/^\s*[•*-]\s*/,"").trim()).filter(Boolean);
  $("supportsList").innerHTML=supports.map(x=>`<li>${escapeHtml(x)}</li>`).join("");
  const flow=r.formulaFlow.split("→").map(x=>x.trim()).filter(Boolean);
  $("flow").innerHTML=flow.map((x,i)=>`${i?'<span class="flow-arrow">→</span>':''}<span class="flow-chip">${escapeHtml(x)}</span>`).join("");
  $("safety").textContent=r.safety.replace(/^SAFETY\s*/i,"").trim();
  const seen=seenIds().size;
  $("progressText").textContent=`${seen} of ${rituals.length} rituals used before the pool resets.`;
  $("inputScreen").hidden=true; $("ritualScreen").hidden=false;
  window.scrollTo({top:0,behavior:"smooth"});
}

function showNext(useInput=true){ render(chooseRitual(useInput ? currentInput : "")); }
function showInput(){ $("ritualScreen").hidden=true; $("inputScreen").hidden=false; $("thoughtInput").focus(); window.scrollTo({top:0,behavior:"smooth"}); }

function setTheme(theme){ document.documentElement.dataset.theme=theme; localStorage.setItem(THEME_KEY,theme); $("themeToggle").textContent=theme==="light"?"☾":"☀"; }
function initTheme(){ const saved=localStorage.getItem(THEME_KEY); const prefersLight=window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches; setTheme(saved || (prefersLight?"light":"dark")); }

async function init(){
  initTheme();
  try {
    const res=await fetch('rituals.json',{cache:'no-store'});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    rituals=await res.json();
    if(!Array.isArray(rituals) || rituals.length!==400) throw new Error('Expected 400 rituals.');
  } catch(err) {
    document.body.innerHTML=`<main class="shell"><div class="ritual-card"><h2>Ritual file could not load.</h2><p class="goal">Publish these files through GitHub Pages or another web server. Opening index.html directly from your computer can block JSON loading.</p><p class="micro">${escapeHtml(String(err))}</p></div></main>`;
    return;
  }
  $("thoughtInput").addEventListener('input',e=>$("remaining").textContent=700-e.target.value.length);
  $("ritualForm").addEventListener('submit',e=>{e.preventDefault(); currentInput=$("thoughtInput").value.trim(); showNext(true);});
  $("surpriseBtn").addEventListener('click',()=>{currentInput="";showNext(false)});
  $("anotherBtn").addEventListener('click',()=>showNext(Boolean(currentInput)));
  $("backBtn").addEventListener('click',showInput);
  $("closeRitual").addEventListener('click',showInput);
  $("themeToggle").addEventListener('click',()=>setTheme(document.documentElement.dataset.theme==='light'?'dark':'light'));
}

document.addEventListener('DOMContentLoaded',init);
