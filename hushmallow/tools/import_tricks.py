#!/usr/bin/env python3
"""Import the locked ThinkStill master (1,000 quick tricks) into Hushmallow.

    python3 -I tools/import_tricks.py content/ThinkStill_MASTER_1000_PRODUCTION_LOCKED_FINAL.xlsx

Reads the "PRODUCTION UI — 1000" sheet (display copy) and "FIT FOR PURPOSE —
1000" (the issue each trick targets) and writes two content modules:

  src/data/tricks/quick-tricks.js   Paid: sensory/attention resets and
                                    action/procrastination starters
  src/ultra/plot-twists.js          Ultra only: every trick that works on
                                    thoughts, meaning, relationships, memory…
                                    (reframing territory). Loaded only via
                                    loadUltraTricks(), which checks the tier.

The copy is used exactly as locked in the workbook; nothing is rewritten.
The only derived fields are the Mallow (from the legacy bubble), emotion
families (from the target issue) and the prediction control (from the
wording of ONE RULE). Rerun after the workbook changes.
"""
import json
import re
import sys
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent

BUBBLE_TO_MALLOW = {
    'Glitch': 'glitzi', 'Drop': 'blubi', 'Loopie': 'zuzu', 'Patch': 'boppo',
    'Rush': 'pipzi', 'Sync': 'loomi', 'Still': 'noomi',
}

# Issues that are about attention or action, not about what a situation
# means. These are Paid; everything else is reframing territory → Ultra.
PAID_ISSUES = {'Sensory / attention reset', 'Action / procrastination'}

# Which emotion families (src/data/emotions.js) each target issue suits.
ISSUE_FAMILIES = {
    'Relationship / conflict': ['loneliness', 'anger', 'shame', 'fear', 'envy', 'love'],
    'Sensory / attention reset': ['fear', 'anger', 'confusion', 'boredom', 'calm', 'curiosity', 'surprise'],
    'Action / procrastination': ['boredom', 'fear', 'confusion', 'shame', 'desire'],
    'Thought / certainty': ['fear', 'confusion', 'shame', 'anger'],
    'Meaning / identity': ['shame', 'sadness', 'envy', 'pride', 'confusion'],
    'Rumination / overthinking': ['fear', 'sadness', 'shame', 'confusion', 'anger'],
    'Emotion / alignment': ['anger', 'fear', 'sadness', 'confusion', 'desire'],
    'Memory / learning': ['curiosity', 'confusion', 'sadness'],
    'Fear / anxiety': ['fear'],
    'Sadness / loss': ['sadness', 'loneliness'],
    'Anger / irritability': ['anger'],
    'Problem-solving / mental set': ['confusion', 'anger'],
    'Shame / guilt': ['shame'],
    'Urge / impulse': ['desire', 'anger'],
}


def rows(wb, name):
    it = wb[name].iter_rows(values_only=True)
    hdr = next(it)
    return [dict(zip(hdr, r)) for r in it if r and r[0]]


def clean(s):
    return re.sub(r'\s+', ' ', str(s or '')).strip()


def predict_kind(rule):
    """How the person locks in their guess for ONE RULE."""
    if re.search(r'0\s*[–-]\s*100\s*%|\b\d+\s*%', rule) or re.search(r'\bpercent', rule, re.I):
        return {'kind': 'percent'}
    if re.search(r'yes or no\??$', rule, re.I):
        # "A or B — yes or no?" can't be answered with yes/no; seal a guess instead
        stem = re.sub(r'[—–-]*\s*yes or no\??$', '', rule, flags=re.I)
        return {'kind': 'seal'} if re.search(r'\bor\b', stem) else {'kind': 'yesno'}
    m = re.match(r'^(Which|What)\b[^:]*:\s*(.+)\?$', rule)
    if m:
        body = m.group(2)
        parts = re.split(r',\s*(?:or\s+)?|\s+or\s+', body)
        parts = [x.strip() for x in parts if x.strip()]
        if 2 <= len(parts) <= 4 and all(len(x) <= 60 for x in parts):
            return {'kind': 'either', 'options': parts}
    if re.match(r'^(Will|Is|Are|Does|Do|Can|Could|Would|Should|Did|Has|Have)\b', rule) and rule.endswith('?') and ' or ' not in rule:
        return {'kind': 'yesno'}
    if re.match(r'^How many\b', rule, re.I):
        return {'kind': 'count'}
    return {'kind': 'seal'}


def main(xlsx):
    wb = openpyxl.load_workbook(xlsx, read_only=True, data_only=True)
    ui = rows(wb, 'PRODUCTION UI — 1000')
    fit = {r['Ritual_ID']: r for r in rows(wb, 'FIT FOR PURPOSE — 1000')}
    assert len(ui) == 1000, len(ui)
    paid, ultra, kinds = [], [], {}
    for r in ui:
        tid = r['Ritual_ID']
        f = fit[tid]
        assert f['Final_Status'] == 'PASS', tid
        bubble = clean(r['Bubble'])
        mallow = BUBBLE_TO_MALLOW[bubble.split('·')[0].strip()]
        issue = clean(f['Primary_User_Issue'])
        rule = clean(r['ONE_RULE'])
        pk = predict_kind(rule)
        kinds[pk['kind']] = kinds.get(pk['kind'], 0) + 1
        t = {
            'id': tid.lower(),
            'ref': tid,
            'mallow': mallow,
            'bubble': bubble,
            'title': clean(r['Ritual_Title']),
            'theme': clean(r['Parent_Theme']),
            'pattern': clean(r['Target_Pattern']),
            'issue': issue,
            'shift': clean(f['Intended_State_Shift']),
            'families': ISSUE_FAMILIES[issue],
            'sec': int(r['Time_sec']),
            'lines': {'jolly': clean(r['Jolly_Line']), 'cheeky': clean(r['Cheeky_Line']), 'unfiltered': clean(r['Unfiltered_Line'])},
            'mission': clean(r['MISSION']),
            'rule': rule,
            'predict': pk,
            'move': clean(r['YOUR_MOVE']),
            'twist': clean(r['PLOT_TWIST']),
            'bend': clean(r['MIND_BEND']),
            'why': clean(r['REVEAL_INTERNAL']),
            'loop': clean(r['LOOP']),
            'care': 'extra' if str(r['Safety_Tier']).startswith('S2') else 'everyday',
            'safety': clean(r['SAFETY']),
            'basis': clean(r['Theory_Backbone']),
        }
        if issue in PAID_ISSUES:
            t['tier'] = 'paid'
            paid.append(t)
        else:
            t['tier'] = 'ultra'
            ultra.append(t)

    head = ('// GENERATED by tools/import_tricks.py from the locked ThinkStill master\n'
            '// workbook (content/ThinkStill_MASTER_1000_PRODUCTION_LOCKED_FINAL.xlsx).\n'
            '// Do not edit by hand: change the workbook and rerun the importer.\n')
    out_paid = ROOT / 'src/data/tricks/quick-tricks.js'
    out_paid.parent.mkdir(parents=True, exist_ok=True)
    out_paid.write_text(head + '// Paid tier: attention resets and getting-started tricks.\n'
                        f'export const QUICK_TRICKS = {json.dumps(paid, ensure_ascii=False, separators=(",", ":"))};\n', encoding='utf-8')
    out_ultra = ROOT / 'src/ultra/plot-twists.js'
    out_ultra.write_text(head + '// ULTRA ONLY: loaded through loadUltraTricks(), which checks the entitlement.\n'
                         f'export const PLOT_TWISTS = {json.dumps(ultra, ensure_ascii=False, separators=(",", ":"))};\n', encoding='utf-8')
    print(f'paid {len(paid)} → {out_paid.relative_to(ROOT)} ({out_paid.stat().st_size // 1024} KB)')
    print(f'ultra {len(ultra)} → {out_ultra.relative_to(ROOT)} ({out_ultra.stat().st_size // 1024} KB)')
    print('predict kinds', kinds)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else ROOT / 'content/ThinkStill_MASTER_1000_PRODUCTION_LOCKED_FINAL.xlsx')
