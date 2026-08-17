import { loadThinkStill } from "./thinkstill-loader.js";

const status = document.getElementById("status");
const sample = document.getElementById("sample");

try {
  const { manifest, rituals } = await loadThinkStill(".");
  const bad = rituals.filter(r =>
    typeof r.formula_flow !== "string" ||
    typeof r.formulaFlow !== "string" ||
    typeof r.safety !== "string" ||
    typeof r.steps !== "string"
  );

  if (bad.length) throw new Error(`${bad.length} rituals contain non-string display fields.`);

  status.className = "ok";
  status.textContent = `PASS — ${rituals.length}/${manifest.row_count} rituals loaded. No object-valued display fields.`;
  sample.textContent = [
    rituals[0].title,
    "",
    "FORMULA FLOW",
    rituals[0].formula_flow,
    "",
    "SAFETY",
    rituals[0].safety
  ].join("\n");
} catch (err) {
  status.className = "bad";
  status.textContent = `FAIL — ${err.message}`;
}
