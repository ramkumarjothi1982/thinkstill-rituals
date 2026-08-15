// ThinkStill v58.19 compatibility helpers
export async function loadThinkStill(base = ".") {
  const clean = base.replace(/\/$/, "");
  const manifestRes = await fetch(`${clean}/manifest.json`, { cache: "no-store" });
  if (!manifestRes.ok) throw new Error(`manifest.json ${manifestRes.status}`);
  const manifest = await manifestRes.json();
  const ritualFile = manifest?.files?.all_rituals || manifest.rituals_file || "rituals.json";
  const routingFile = manifest?.files?.routing || manifest.routing_file || "routing.json";
  const [ritualRes, routingRes] = await Promise.all([
    fetch(`${clean}/${ritualFile}`, { cache: "no-store" }),
    fetch(`${clean}/${routingFile}`, { cache: "no-store" })
  ]);
  if (!ritualRes.ok) throw new Error(`${ritualFile} ${ritualRes.status}`);
  if (!routingRes.ok) throw new Error(`${routingFile} ${routingRes.status}`);
  return { manifest, rituals: await ritualRes.json(), routing: await routingRes.json() };
}

export function modernizeRitual(r) {
  return {
    id: r.id,
    name: r.name || r.title,
    playTime: r.playTime || r.play_time,
    goal: r.goal,
    steps: r.stepsArray || String(r.steps || "").split(/\n(?=\d+\.\s)/).map(x => x.replace(/^\d+\.\s*[^—-]+\s*[—-]\s*/, "").trim()).filter(Boolean),
    win: r.win,
    tips: r.tips || String(r.supports || "").split("\n").map(x => x.replace(/^[•-]\s*/, "").trim()).filter(Boolean),
    mindBend: r.mindBend || r.mind_bend || "",
    formulaFlow: r.formulaFlow || String(r.formula_flow || "").split("→").map(x => x.trim()).filter(Boolean),
    safety: r.safety,
    feedback: r.feedback
  };
}
