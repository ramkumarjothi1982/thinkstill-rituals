#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = __dirname;
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
let total = 0;
const ids = new Set();
const titles = new Set();
let failed = false;

for (const file of manifest.files) {
  const full = path.join(root, file.filename);
  if (!fs.existsSync(full)) {
    console.error(`Missing: ${file.filename}`);
    failed = true;
    continue;
  }
  const data = JSON.parse(fs.readFileSync(full, "utf8"));
  const rituals = Array.isArray(data) ? data : data.rituals;
  if (!Array.isArray(rituals)) {
    console.error(`Invalid rituals array: ${file.filename}`);
    failed = true;
    continue;
  }
  if (rituals.length !== file.rows) {
    console.error(`Count mismatch in ${file.filename}: ${rituals.length} vs ${file.rows}`);
    failed = true;
  }
  for (const ritual of rituals) {
    total++;
    if (!ritual.id || !ritual.title || !ritual.b) {
      console.error(`Missing required field in ${file.filename}`);
      failed = true;
    }
    if (ids.has(ritual.id)) {
      console.error(`Duplicate ID: ${ritual.id}`);
      failed = true;
    }
    ids.add(ritual.id);
    const titleKey = String(ritual.title).trim().toLowerCase();
    if (titles.has(titleKey)) {
      console.error(`Duplicate title: ${ritual.title}`);
      failed = true;
    }
    titles.add(titleKey);
  }
}
if (total !== manifest.row_count) {
  console.error(`Manifest total mismatch: ${total} vs ${manifest.row_count}`);
  failed = true;
}
if (failed) process.exit(1);
console.log(`PASS: ${total} rituals across ${manifest.files.length} Bubble files.`);
