#!/usr/bin/env python3
"""Cut docs/EOS_SPEC.md (≈295 KB) into one small brief per task: docs/briefs/<task>.md.

Each brief = spec intro + §0 (shared core contract) + exactly the sections the build plan
lists for that task (ranges like §5.1-§5.5 expanded) + the owner decisions.
Agents read their brief instead of re-reading the whole spec several times.
Re-run whenever EOS_SPEC.md or workflows/build_plan.json changes.
"""
import json, os, re
here = os.path.dirname(os.path.abspath(__file__))
spec = open(os.path.join(here, "..", "docs", "EOS_SPEC.md"), encoding="utf-8").read().splitlines()
plan = json.load(open(os.path.join(here, "build_plan.json")))
out_dir = os.path.join(here, "..", "docs", "briefs")
os.makedirs(out_dir, exist_ok=True)

heads = []  # (line_no, level, key)
for i, line in enumerate(spec):
    m = re.match(r"^(#{2,3}) (\d+(?:\.\d+)?)[. ]", line)
    if m:
        heads.append((i, len(m.group(1)), m.group(2)))
    elif line.startswith("## Owner decisions"):
        heads.append((i, 2, "owner"))

def span(key):
    """Lines of section `key` (top-level 'N' includes its subsections)."""
    for idx, (i, lvl, k) in enumerate(heads):
        if k == key:
            end = len(spec)
            for j, l2, _ in heads[idx + 1:]:
                if l2 <= lvl:
                    end = j
                    break
            return (i, end)
    return None

def expand(ref):
    keys = []
    for a, b in re.findall(r"§(\d+(?:\.\d+)?)(?:\s*-\s*§?(\d+(?:\.\d+)?))?", ref):
        if b and "." in a and "." in b and a.split(".")[0] == b.split(".")[0]:
            top = a.split(".")[0]
            keys += [f"{top}.{n}" for n in range(int(a.split(".")[1]), int(b.split(".")[1]) + 1)]
        else:
            keys.append(a)
    return keys

intro = spec[: heads[0][0]] if heads else []
def build(task_id, ref):
    keys = ["0"] + expand(ref) + ["owner"]
    spans, seen = [], set()
    for k in keys:
        s = span(k)
        if s and s not in seen:
            seen.add(s); spans.append(s)
    # drop spans fully contained in another
    spans = [s for s in spans if not any(o != s and o[0] <= s[0] and s[1] <= o[1] for o in spans)]
    spans.sort()
    body = [f"# BRIEF for task `{task_id}` — extracted from docs/EOS_SPEC.md (sections: {ref})",
            "Read THIS file instead of the whole spec. If you truly need another section, grep docs/EOS_SPEC.md for it rather than reading the whole file.", ""]
    body += intro + [""]
    for a, b in spans:
        body += spec[a:b] + [""]
    return "\n".join(body)

sizes = {}
for t in plan["tasks"]:
    txt = build(t["id"], t["spec_sections"])
    open(os.path.join(out_dir, f"{t['id']}.md"), "w", encoding="utf-8").write(txt)
    sizes[t["id"]] = len(txt)
for g in plan["integration_groups"]:
    txt = build(g["id"], g["spec_sections"])
    open(os.path.join(out_dir, f"{g['id']}.md"), "w", encoding="utf-8").write(txt)
    sizes[g["id"]] = len(txt)
full = sum(len(l) + 1 for l in spec)
print(f"spec {full//1024} KB ->", ", ".join(f"{k} {v//1024}KB" for k, v in sizes.items()))
