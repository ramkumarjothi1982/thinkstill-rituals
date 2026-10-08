#!/usr/bin/env python3
"""Build the Workflow args for resuming eos_build.js from durable on-disk progress.

docs/eos_status/<task>.build.md  -> builder finished (report inside); skip the build step
docs/eos_status/<task>.done.md   -> build + dual review passed; skip the task entirely
docs/eos_status/integrate_<g>.done.md -> integration group applied + committed; skip it
Usage: python3 framer/workflows/resume_args.py > /tmp/args.json
"""
import glob, json, os
here = os.path.dirname(os.path.abspath(__file__))
st = os.path.join(here, "..", "docs", "eos_status")
args = json.load(open(os.path.join(here, "eos_build_args.json")))
built, done, integrated = {}, {}, []
for p in sorted(glob.glob(os.path.join(st, "*.md"))):
    name = os.path.basename(p)[:-3]
    body = open(p, encoding="utf-8").read()
    if name.startswith("integrate_") and name.endswith(".done"):
        integrated.append(name[len("integrate_"):-len(".done")])
    elif name.endswith(".done"):
        done[name[:-5]] = body
    elif name.endswith(".build"):
        if "IN PROGRESS" in body.splitlines()[0].upper() if body.strip() else True:
            continue  # an interrupted agent's notes, not a final report
        built[name[:-6]] = body
for k in done:
    built.pop(k, None)
args.update({"built": built, "done": done, "integrated": integrated})
print(json.dumps(args))
