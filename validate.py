#!/usr/bin/env python3
import json, re, sys
from collections import Counter
from pathlib import Path
ROOT=Path(__file__).resolve().parent
manifest=json.loads((ROOT/'manifest.json').read_text(encoding='utf-8'))
rows=json.loads((ROOT/manifest['canonical_file']).read_text(encoding='utf-8'))
errors=[]
if len(rows)!=400: errors.append(f"Expected 400 rituals, got {len(rows)}")
for field in ('id','title','ritual','win','formula_flow'):
    vals=[r.get(field) for r in rows]
    if len(set(vals))!=len(vals): errors.append(f"Duplicate {field} values detected")
counts=Counter(r['bubble'] for r in rows)
if {b:counts[b] for b in manifest['bubble_order']} != manifest['bubble_counts']:
    errors.append(f"Bubble counts differ: {dict(counts)}")
for r in rows:
    if not re.fullmatch(r'T-\d{3}',r['id']): errors.append(f"Bad ID: {r['id']}")
    if re.search(r'\b(\w+)\s+\1\b', str(r['ritual']), re.I): errors.append(f"Possible doubled word in {r['id']}")
if errors:
    print('FAIL')
    for e in errors: print('-',e)
    sys.exit(1)
print('PASS — ThinkStill package integrity checks passed')
print('Rituals:',len(rows))
print('Bubble counts:',{b:counts[b] for b in manifest['bubble_order']})
