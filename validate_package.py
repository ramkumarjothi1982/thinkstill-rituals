#!/usr/bin/env python3
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BUBBLES = ["GLITCH","DROP","LOOPIE","PATCH","RUSH","STILL","SYNC"]

def load(name):
    return json.loads((ROOT / name).read_text(encoding="utf-8"))

manifest = load("manifest.json")
errors = []

if manifest.get("ritual_count") != 750:
    errors.append("manifest ritual_count != 750")

all_rows = []
for entry in manifest.get("bubbles", []):
    bubble = entry.get("bubble")
    parts = entry.get("parts") or []
    if bubble not in BUBBLES:
        errors.append(f"invalid bubble in manifest: {bubble}")
        continue
    if not parts:
        errors.append(f"no parts for {bubble}")
        continue
    for part in parts:
        fn = part.get("filename")
        p = ROOT / fn
        if not p.exists():
            errors.append(f"missing file: {fn}")
            continue
        payload = json.loads(p.read_text(encoding="utf-8"))
        rows = payload.get("rituals", [])
        if len(rows) != part.get("rows"):
            errors.append(f"row count mismatch: {fn}")
        for r in rows:
            if r.get("b") != bubble:
                errors.append(f"bubble mismatch: {r.get('id')} in {fn}")
            lowered_keys = {str(k).lower() for k in r.keys()}
            if "tips" in lowered_keys or "5 tips" in lowered_keys or "supports" in lowered_keys:
                errors.append(f"forbidden tips/supports field: {r.get('id')}")
            for field in ("plain","ritualText","fullRitual"):
                if "5 TIPS" in str(r.get(field, "")).upper():
                    errors.append(f"visible Tips marker in {field}: {r.get('id')}")
            all_rows.append(r)

ids = [r.get("id") for r in all_rows]
if len(all_rows) != 750:
    errors.append(f"loaded {len(all_rows)} rituals, expected 750")
if len(set(ids)) != 750:
    errors.append("IDs are not unique")
expected = [f"TS-{i:03d}" for i in range(1, 751)]
if sorted(ids) != expected:
    errors.append("IDs are not exactly TS-001 through TS-750")

for r in all_rows:
    for key in ("id","r","b","name","thinking_error","precise_subpattern","goal","steps","win","mindBend","formulaFlow","safety","plain"):
        if r.get(key) in (None, ""):
            errors.append(f"missing {key}: {r.get('id')}")
            break

if errors:
    print("FAIL")
    for e in errors[:100]:
        print("-", e)
    sys.exit(1)

print("PASS — ThinkStill v58.20 GitHub package is internally consistent and contains no runtime Tips.")
print("Rituals:", len(all_rows))
print("Bubble counts:", {b: sum(1 for r in all_rows if r.get("b") == b) for b in BUBBLES})
print("Thinking-error groups:", len({r.get("thinking_error") for r in all_rows}))
print("Precise subpatterns:", len({r.get("precise_subpattern") for r in all_rows}))
