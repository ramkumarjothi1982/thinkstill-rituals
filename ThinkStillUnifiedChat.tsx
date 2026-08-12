import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

type Ritual = {
    id:string; world:string; specialist:string; title:string; playTime:string; goal:string;
    steps:string[]; win:string; tips:string[]; mindBend:string; formulaFlow:string; safety:string;
    safetyTier:number; firstLinePriority:number; mechanism:string; moment:string; precisePattern:string;
    routingKeywords:string[]; feedbackOptions:string[];
}
type Manifest = { rituals:string; routing:string; rowCount:number; brandLine?:string }
type Routing = { specialists:Array<{world:string;specialist:string;keywords:string[];count:number}>; highRiskSignals:string[] }

const norm=(s:string)=>String(s||"").toLowerCase().replace(/[^a-z0-9'\s-]/g," ").replace(/\s+/g," ").trim()
const words=(s:string)=>new Set(norm(s).split(" ").filter(w=>w.length>2))
const abs=(base:string,p:string)=>new URL(p,base).toString()
const read=(k:string,f:any)=>{try{return JSON.parse(localStorage.getItem(k)||"")??f}catch{return f}}
const write=(k:string,v:any)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}}
const USED="__thinkstill_v40_used_rituals"
const OUT="__thinkstill_v40_outcomes"

function scoreKeywords(q:string, kws:string[]=[]){
    const n=norm(q), t=words(q); let s=0
    for(const raw of kws){const k=norm(raw); if(!k)continue; if(k.includes(" ")&&n.includes(k))s+=18; else if(t.has(k))s+=5; else if(k.length>4&&n.includes(k))s+=2}
    return s
}

function Card({r}:{r:Ritual}){
    const safety=String(r.safety||"").split(/\n+/).map(x=>x.trim()).filter(Boolean).filter(x=>norm(x)!=="safety")
    if(safety[0]?.toUpperCase()==="PAUSE") safety.shift()
    return <article style={S.card}>
        <div style={S.topline}><span style={S.chip}>{r.world}</span><span>{r.playTime}</span></div>
        <h1 style={S.title}>{r.title}</h1>
        <Section label="GOAL"><div style={S.goal}>{r.goal}</div></Section>
        <div style={{display:"grid",gap:10,marginBottom:18}}>{r.steps.map((x,i)=>{
            const m=x.match(/^\s*\d+[.)]\s*(.+?)(?:\s+[—–-]\s+)(.+)$/); const a=m?.[1]||`MOVE ${i+1}`; const d=m?.[2]||x
            return <div key={i} style={S.step}><div style={S.num}>{i+1}</div><div><b>{a}</b><div style={S.detail}>{d}</div></div></div>
        })}</div>
        <Section label="WIN"><div style={S.win}>{r.win}</div></Section>
        <Section label="TIPS"><ul style={{margin:0,paddingLeft:20}}>{r.tips.map((t,i)=><li key={i} style={{margin:"8px 0",color:"#cfdae5",lineHeight:1.5}}>{t}</li>)}</ul></Section>
        <Section label="MIND BEND"><div style={S.bend}>↯ {r.mindBend}</div></Section>
        <Section label="FORMULA FLOW"><div style={S.muted}>{r.formulaFlow}</div></Section>
        <Section label="SAFETY"><div style={S.safety}><b style={{color:"#ffd37a"}}>PAUSE</b>{safety.map((x,i)=><p key={i} style={{margin:"7px 0 0"}}>{x}</p>)}</div></Section>
    </article>
}
function Section({label,children}:{label:string,children?:React.ReactNode}){return <section style={S.section}><div style={S.label}>{label}</div>{children}</section>}

export default function ThinkStillUnifiedChat(props:{manifestUrl?:string}){
    const [rituals,setRituals]=React.useState<Ritual[]>([]), [routing,setRouting]=React.useState<Routing|null>(null)
    const [input,setInput]=React.useState(""), [current,setCurrent]=React.useState<Ritual|null>(null), [original,setOriginal]=React.useState("")
    const [round,setRound]=React.useState(0), [refine,setRefine]=React.useState(false), [done,setDone]=React.useState(false)
    const tried=React.useRef(new Set<string>()), mechanisms=React.useRef(new Set<string>())
    React.useEffect(()=>{(async()=>{if(!props.manifestUrl)return; const m:Manifest=await (await fetch(props.manifestUrl,{cache:"no-store"})).json(); setRituals(await (await fetch(abs(props.manifestUrl,m.rituals),{cache:"no-store"})).json()); setRouting(await (await fetch(abs(props.manifestUrl,m.routing),{cache:"no-store"})).json())})().catch(console.error)},[props.manifestUrl])

    const pick=React.useCallback((q:string,different=false)=>{
        if(!routing||!rituals.length)return null
        const n=norm(q); const high=(routing.highRiskSignals||[]).some(x=>n.includes(norm(x)))
        const ranked=routing.specialists.map(s=>({...s,score:scoreKeywords(q,s.keywords)+(high&&s.specialist==="High-Risk Support Bridge"?1000:0)})).sort((a,b)=>b.score-a.score)
        let used=new Set<string>(read(USED,[])); if(used.size>=rituals.length){used=new Set();write(USED,[])}
        let pool=rituals.filter(r=>!used.has(r.id)&&!tried.current.has(r.id)); if(high)pool=pool.filter(r=>r.specialist==="High-Risk Support Bridge")
        if(different&&current){const p=pool.filter(r=>r.mechanism!==current.mechanism);if(p.length)pool=p}
        const out=read(OUT,{})
        const rs=(r:Ritual)=>{const rank=ranked.findIndex(s=>s.specialist===r.specialist);let s=Math.max(0,70-rank*8)+scoreKeywords(q,r.routingKeywords)*2+scoreKeywords(q,[r.moment,r.precisePattern,r.goal,r.mechanism]);s+=(4-Number(r.firstLinePriority||3))*5;const h=out[`${r.specialist}||${r.mechanism}`]||{};s+=(h.better||0)*6+(h.little||0)*1.5-(h.notYet||0)*4;if(mechanisms.current.has(r.mechanism))s-=60;return s}
        pool.sort((a,b)=>rs(b)-rs(a)); const r=pool[0]||null; if(r){used.add(r.id);write(USED,[...used]);tried.current.add(r.id);mechanisms.current.add(r.mechanism)} return r
    },[routing,rituals,current])

    const start=(q=input)=>{if(!q.trim())return;tried.current.clear();mechanisms.current.clear();setOriginal(q);setRound(1);setRefine(false);setDone(false);setCurrent(pick(q,false));setInput("")}
    const log=(kind:string)=>{if(!current)return;const out=read(OUT,{}),k=`${current.specialist}||${current.mechanism}`;out[k]??={better:0,little:0,notYet:0};out[k][kind]=(out[k][kind]||0)+1;write(OUT,out)}
    const feedback=(k:"better"|"little"|"notYet")=>{log(k);if(k==="better"){setDone(true);return}setRefine(true)}
    const next=(signal:string)=>{const r=pick(`${original}. ${signal}`,true);setCurrent(r);setRound(x=>x+1);setRefine(false)}

    return <div style={S.root}>
        <div style={S.hero}><div style={S.label}>THINKSTILL NOW · BUILT FOR DURING</div><h1 style={S.heroTitle}>WHEN YOUR MIND HITS HARD, <span style={{color:"#73e7ff"}}>HIT THINKSTILL.</span></h1><p style={S.heroText}>Tell ThinkStill what is happening right now. Get one matched mental move. If it misses, change mechanism.</p>
        <div style={S.inputRow}><textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();start()}}} placeholder="What is happening right now?" style={S.input}/><button onClick={()=>start()} style={S.button}>HIT THINKSTILL</button></div></div>
        {current&&<><div style={S.status}>ROUND {round} · {current.world} · {current.specialist}</div><Card r={current}/>
        <div style={S.feedback}><div style={S.label}>CHECK THE SHIFT</div>{done?<><h2>Good. Don’t overwork it.</h2><p style={S.muted}>ThinkStill has remembered the kind of move that helped.</p><button style={S.button} onClick={()=>{setCurrent(null);setDone(false);setRound(0);tried.current.clear();mechanisms.current.clear()}}>NEW MOMENT</button></>:refine?<><h2>What is still strongest?</h2><div style={S.chips}>{current.feedbackOptions.map(x=><button key={x} style={S.softButton} onClick={()=>next(x)}>{x}</button>)}</div></>:<><h2>Did anything shift?</h2><div style={S.chips}><button style={S.button} onClick={()=>feedback("better")}>✓ BETTER</button><button style={S.softButton} onClick={()=>feedback("little")}>◇ A LITTLE</button><button style={S.softButton} onClick={()=>feedback("notYet")}>↻ NOT YET</button></div></>}</div></>}
    </div>
}

const S:any={root:{width:"100%",minHeight:"100%",background:"radial-gradient(circle at 50% -10%,#13223d,#05070b 48%)",color:"#f8fbff",fontFamily:"Inter,system-ui,sans-serif",padding:"24px",overflow:"auto"},hero:{maxWidth:860,margin:"0 auto",textAlign:"center",padding:"36px 0 24px"},heroTitle:{fontSize:"clamp(36px,6vw,66px)",lineHeight:.98,letterSpacing:"-.055em",margin:"12px 0 18px"},heroText:{maxWidth:670,margin:"0 auto 20px",color:"#c5d0dc",fontSize:18,lineHeight:1.55},inputRow:{display:"flex",maxWidth:760,margin:"0 auto",gap:8,padding:9,border:"1px solid rgba(115,231,255,.2)",borderRadius:22,background:"rgba(16,23,34,.94)"},input:{flex:1,minHeight:64,resize:"vertical",border:0,outline:0,background:"transparent",color:"white",fontSize:16,padding:10},button:{border:0,borderRadius:15,background:"linear-gradient(135deg,#73e7ff,#5ba7ff)",color:"#04111b",fontWeight:900,padding:"14px 16px",cursor:"pointer"},softButton:{border:"1px solid rgba(255,255,255,.1)",borderRadius:15,background:"rgba(255,255,255,.04)",color:"#fff",fontWeight:800,padding:"14px 16px",cursor:"pointer"},status:{maxWidth:820,margin:"20px auto 10px",textAlign:"center",color:"#73e7ff",fontSize:11,fontWeight:900,letterSpacing:".12em"},card:{maxWidth:820,margin:"0 auto",padding:"clamp(22px,4vw,40px)",borderRadius:28,border:"1px solid rgba(255,255,255,.1)",background:"linear-gradient(180deg,rgba(18,27,41,.97),rgba(8,13,21,.98))"},topline:{display:"flex",justifyContent:"space-between",color:"#93a4b8",fontSize:12,fontWeight:800},chip:{color:"#73e7ff",border:"1px solid rgba(115,231,255,.2)",borderRadius:999,padding:"6px 9px"},title:{fontSize:"clamp(30px,5vw,46px)",letterSpacing:"-.045em",lineHeight:1.04,margin:"18px 0 26px"},section:{padding:"19px 0",borderTop:"1px solid rgba(255,255,255,.09)"},label:{fontSize:11,fontWeight:900,letterSpacing:".13em",color:"#73e7ff"},goal:{fontSize:20,lineHeight:1.48,fontWeight:650,marginTop:9},step:{display:"grid",gridTemplateColumns:"38px 1fr",gap:12,padding:14,borderRadius:17,border:"1px solid rgba(255,255,255,.07)",background:"rgba(255,255,255,.025)"},num:{width:34,height:34,borderRadius:11,display:"grid",placeItems:"center",background:"rgba(115,231,255,.08)",color:"#73e7ff",fontWeight:900},detail:{color:"#c8d3df",lineHeight:1.5,marginTop:5},win:{color:"#eafff5",fontSize:18,fontWeight:650,lineHeight:1.5,marginTop:8},bend:{marginTop:10,padding:18,borderRadius:18,border:"1px solid rgba(182,140,255,.24)",background:"rgba(182,140,255,.07)",fontSize:18,lineHeight:1.5,fontWeight:700},muted:{color:"#9eafc0",lineHeight:1.55,marginTop:8},safety:{marginTop:9,padding:16,borderRadius:16,background:"rgba(255,211,122,.04)",border:"1px solid rgba(255,211,122,.12)",color:"#aebbc8",fontSize:13,lineHeight:1.5},feedback:{maxWidth:820,margin:"14px auto",padding:24,borderRadius:24,border:"1px solid rgba(255,255,255,.1)",background:"#0c1119",textAlign:"center"},chips:{display:"flex",flexWrap:"wrap",justifyContent:"center",gap:9,marginTop:14}}

addPropertyControls(ThinkStillUnifiedChat,{manifestUrl:{type:ControlType.String,title:"Manifest URL",placeholder:"https://raw.githubusercontent.com/.../manifest.json"}})
