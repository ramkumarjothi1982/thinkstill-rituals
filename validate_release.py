#!/usr/bin/env python3
import json, os, sys
BASE=os.path.dirname(os.path.abspath(__file__))
def load(n):
    with open(os.path.join(BASE,n),encoding='utf-8') as f:return json.load(f)
manifest=load('thinkstill-manifest.json')
rit=[]
for b in manifest['bubbles']:
    for p in b['parts']:
        d=load(p['filename']); rows=d['rituals'] if isinstance(d,dict) else d
        assert len(rows)==p['rows'], (p['filename'],len(rows),p['rows'])
        rit.extend(rows)
assert len(rit)==750
ids=[r['id'] for r in rit]
assert len(set(ids))==750
assert sorted(ids, key=lambda x:int(x.split('-')[1]))==[f'TS-{i:03d}' for i in range(1,751)]
modes=load('thinkstill-modes.json')
full_modes=load('thinkstill-mode-variants-full.json')
assert len(modes)==2250
assert len(full_modes)==2250
assert len({m['variantKey'] for m in modes})==2250
for rid in ids:
    ms=[m for m in modes if m['id']==rid]
    assert {m['mode'] for m in ms}=={'Jolly','Cheeky','Unfiltered'}
    assert all('USE ONLY IF' in m['safety'] and 'STOP NOW IF' in m['safety'] and 'URGENT OVERRIDE' in m['safety'] for m in ms)
exp=load('thinkstill_750_expression_map.json'); titles=load('thinkstill-ui-titles.json'); safety=load('thinkstill-safety.json')
assert set(exp)==set(ids)==set(titles)==set(safety)
assert all(len({exp[r][k]['expression'] for k in ['goal','rule','try','twist','win']})==5 for r in ids)
t3=[r for r in ids if safety[r]['tier']==3]
assert len(t3)==8
assert all(all(m['supportFirst'] for m in modes if m['id']==rid) for rid in t3)
print('PASS: ThinkStill v61 GitHub release package')
print('750 canonical rituals | 2250 modes | 750 safety | 750 title maps | 750 expression maps')
