import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (name) => JSON.parse(fs.readFileSync(path.join(here, name), "utf8"));

const normalize = (value) => String(value ?? "").toLowerCase().normalize("NFKC")
  .replace(/[’]/g, "'").replace(/[^\p{L}\p{N}\s']/gu, " ").replace(/\s+/g, " ").trim();
const words = (value) => normalize(value).split(" ").filter(Boolean);
const containsWholePhrase = (haystack, phrase) => {
  const h = ` ${normalize(haystack)} `;
  const p = normalize(phrase);
  return !!p && h.includes(` ${p} `);
};
const matchesAny = (input, phrases) => phrases.some((p) => containsWholePhrase(input, p));
function scoreAliasMatch(input, aliases=[]) {
  const inputTokens = new Set(words(input));
  let score = 0;
  for (const alias of aliases) {
    const a = normalize(alias); if (!a) continue;
    if (input === a) { score = Math.max(score,120); continue; }
    if (containsWholePhrase(input,a)) { score = Math.max(score,95); continue; }
    const at = words(a).filter((t)=>t.length>2); if(!at.length) continue;
    const matched=at.filter((t)=>inputTokens.has(t)).length; const coverage=matched/at.length;
    if(matched>=1 && coverage>=0.5) score=Math.max(score,Math.min(72,matched*18+Math.round(coverage*18)));
  }
  return score;
}
const substanceLanguage = (input) => matchesAny(input,["urge","urges","craving","crave","drug","drugs","addiction","substance use","relapse","compulsion","smoke","smoking","nicotine","vape","vaping","alcohol","cocaine","cannabis","weed","gamble","gambling","betting","doomscroll","doomscrolling","compulsive shopping","porn urge"]);
const deliberationLanguage = (input) => matchesAny(input,["should i","whether to","decide","decision","choice","quit","treatment","what should i do","thinking about stopping","thinking about changing"]);
const severeSubstanceLanguage = (input) => matchesAny(input,["overdose","overdosed","severe withdrawal","alcohol withdrawal","benzodiazepine withdrawal","seizure","unconscious","can't stay awake","cannot stay awake","unsafe intoxication"]);
const explicitHighRiskLanguage = (input) => matchesAny(input,["kill myself","hurt myself","harm myself","end my life","want to die","suicidal","suicide attempt","self harm","kill someone","hurt someone","harm someone","can't stay safe","cannot stay safe","danger to others","medical emergency","overdose","overdosed","seizure","chest pain","can't tell what's real","cannot tell what is real","hearing voices"]) || severeSubstanceLanguage(input);
function semanticIntent(input){
  if(matchesAny(input,["panic","panicking","panic attack","can't breathe","cannot breathe","racing heart","heart pounding","body alarm"])) return "PANIC";
  if(matchesAny(input,["angry","anger","furious","rage","mad","pissed off","irritated","fuming","seeing red"])) return "ANGER";
  if(substanceLanguage(input)) return "URGE";
  if(matchesAny(input,["lonely","loneliness","rejected","rejection","left out","ghosted","ignored","judged","jealous","jealousy","comparison"])) return "SOCIAL";
  if(matchesAny(input,["family pressure","parent pressure","parents pressure","family conflict","argument with family"])) return "FAMILY";
  if(matchesAny(input,["debt","debts","rent","mortgage","bills","money stress","money worry","financial stress","financial worry"])) return "MONEY";
  if(matchesAny(input,["can't switch off","cannot switch off","can't switch my mind off","cannot switch my mind off","mind won't stop at night","busy mind at night","can't sleep","cannot sleep","awake at night","bedtime","insomnia"])) return "SLEEP";
  if(matchesAny(input,["boss stress","stress at work","work stress","job stress","meeting stress","meeting","interview","job interview","exam","presentation","public speaking"])) return "PERFORMANCE";
  if(matchesAny(input,["overthinking","overthink","keep thinking","can't stop thinking","mind keeps going","thought loop","spiralling thoughts","spiraling thoughts","rumination"])) return "LOOP";
  return "NONE";
}
function familyBoost(intent,bestFor){
  const b=normalize(bestFor);
  if(intent==="ANGER"&&b.includes("emotion play")) return 180;
  if(intent==="SOCIAL"&&(b.includes("social pressure")||b.includes("social interpretation"))) return 180;
  if(intent==="URGE"&&(b.includes("urges")||b.includes("habit loops"))) return 220;
  if(intent==="MONEY"&&(b.includes("uncertainty")||b.includes("decision pressure")||b.includes("worry"))) return 170;
  if(intent==="SLEEP"&&(b.includes("winding down")||b.includes("sleep & quiet")||b.includes("sleep"))) return 210;
  if(intent==="FAMILY"&&(b.includes("communication")||b.includes("social pressure"))) return 170;
  if(intent==="PERFORMANCE"&&b.includes("performance pressure")) return 180;
  if(intent==="PANIC"&&b.includes("panic/body alarm")) return 230;
  if(intent==="LOOP"&&(b.includes("rumination")||b.includes("overthinking")||b.includes("mental quiet"))) return 180;
  return 0;
}
function route(challenge, rituals, routing){
  const input=normalize(challenge); const byId=new Map(rituals.map((r)=>[r.id,r]));
  if(explicitHighRiskLanguage(input)){
    const support=routing.filter((r)=>r.supportFirstBypass);
    const ranked=support.map((r)=>({r,score:scoreAliasMatch(input,r.supportTrigger)})).sort((a,b)=>b.score-a.score);
    const row=ranked.find((x)=>x.score>0)?.r ?? support.find((r)=>r.supportCategory==="EMERGENCY NOW") ?? support[0];
    return {ritual:byId.get(row.id), routing:row, score:1000};
  }
  const semantic=semanticIntent(input); const sub=substanceLanguage(input); const candidates=[];
  for(const row of routing){
    if(row.supportFirstBypass) continue; const ritual=byId.get(row.id); if(!ritual) continue;
    let score=scoreAliasMatch(input,row.intentAliases); score+=familyBoost(semantic,row.bestFor);
    if(sub){
      if(row.substanceRouteTier==="TIER 1 · URGE") score+=90;
      else if(row.substanceRouteTier==="TIER 2 · HABIT") score+=50;
      else if(row.substanceRouteTier==="TIER 3 · DELIBERATION") score+=deliberationLanguage(input)?25:-120;
    } else if(row.substanceRouteTier!=="NONE") score-=60;
    if(semantic==="PANIC") score += row.cognitiveLoad==="LOW"?30:row.cognitiveLoad==="MEDIUM"?12:0;
    if(row.firstSessionPick) score+=2;
    if(score>0) candidates.push({ritual,routing:row,score});
  }
  candidates.sort((a,b)=>b.score-a.score || (a.routing.rank??999)-(b.routing.rank??999) || a.ritual.id.localeCompare(b.ritual.id));
  if(candidates.length) return candidates[0];
  const row=routing.find((r)=>!r.supportFirstBypass&&r.cognitiveLoad==="LOW") ?? routing.find((r)=>!r.supportFirstBypass);
  return {ritual:byId.get(row.id),routing:row,score:0};
}

export function runRoutingSmoke(){
  const rituals=read('thinkstill-rituals.v19.5.json').rituals;
  const routing=read('thinkstill-routing.v19.5.json').routing;
  const tests=[
    ["I am furious at my boss", /Emotion play/i, false],
    ["I feel lonely and rejected", /Social pressure|Social interpretation/i, false],
    ["I keep wanting to gamble", /Urges|Habit loops/i, false],
    ["I want to vape right now", /Urges|Habit loops/i, false],
    ["I am stressed about debt and rent", /Uncertainty|Decision pressure|Worry/i, false],
    ["I can't switch my mind off at night", /Winding down|Sleep/i, false],
    ["My family is pressuring me", /Communication|Social pressure/i, false],
    ["panic", /Panic\/body alarm/i, false],
    ["I am overwhelmed at work", /Performance pressure|Attention|Grounding/i, false],
    ["I keep overthinking everything", /Rumination|Overthinking|Mental quiet/i, false],
    ["I want to die", /Support first/i, true],
    ["chest pain", /Support first/i, true],
  ];
  for(const [input, expectedBestFor, supportExpected] of tests){
    const got=route(input,rituals,routing);
    if(!got?.ritual) throw new Error(`No result for ${input}`);
    if(Boolean(got.routing.supportFirstBypass)!==supportExpected) throw new Error(`Support mismatch for ${input}: ${got.routing.bestFor}`);
    if(!expectedBestFor.test(got.routing.bestFor)) throw new Error(`Wrong family for ${input}: ${got.routing.bestFor}`);
  }
  for(const input of ["I am worried about surgery","I have an urgent meeting"]){
    const got=route(input,rituals,routing);
    if(/Urges|Habit loops/i.test(got.routing.bestFor)) throw new Error(`Substring false positive for ${input}: ${got.routing.bestFor}`);
  }
  return tests.length+2;
}

if(import.meta.url===`file://${process.argv[1]}`){
  const n=runRoutingSmoke();
  console.log(`✓ routing smoke passed (${n} cases)`);
}
