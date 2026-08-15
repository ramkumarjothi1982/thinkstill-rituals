import fs from "node:fs";
import crypto from "node:crypto";

const rituals = JSON.parse(fs.readFileSync(new URL("./rituals.json", import.meta.url), "utf8"));
const routing = JSON.parse(fs.readFileSync(new URL("./routing.json", import.meta.url), "utf8"));

const fail = message => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const ids = rituals.map(r => r.id);
const routingIds = routing.map(r => r.id);

if (rituals.length !== 750) fail(`Expected 750 rituals, found ${rituals.length}`);
if (routing.length !== 750) fail(`Expected 750 routing rows, found ${routing.length}`);
if (new Set(ids).size !== 750) fail("Consumer IDs are not unique");
if (new Set(routingIds).size !== 750) fail("Routing IDs are not unique");

for (let i = 1; i <= 750; i++) {
  const expected = `TS-${String(i).padStart(3, "0")}`;
  if (ids[i - 1] !== expected) fail(`ID sequence mismatch at ${i}: ${ids[i - 1]} != ${expected}`);
}

for (const r of rituals) {
  if (r.tips.length !== 5) fail(`${r.id} does not have exactly 5 tips`);
  if (!r.steps.length) fail(`${r.id} has no steps`);
  if (!r.formulaFlow.length) fail(`${r.id} has no formula flow`);
  if (!r.feedback?.prompt || !r.feedback?.options?.length) fail(`${r.id} feedback is incomplete`);
}

const sha = crypto.createHash("sha256")
  .update(fs.readFileSync(new URL("./rituals.json", import.meta.url)))
  .digest("hex");

if (!process.exitCode) {
  console.log("PASS: 750/750 consumer rituals and routing rows validated");
  console.log(`rituals.json sha256: ${sha}`);
}
