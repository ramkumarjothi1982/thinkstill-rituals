#!/usr/bin/env python3
"""Import the Hushmallow 1,000 ritual blueprints (V3 workbook) into the app.

    python3 -I tools/import_v3.py content/Hushmallow_1000_Rituals_V3.xlsx

Every ritual in the workbook is one unique pairing of a touch engine (50) and
a world law (20), led by one Mallow in its realm, practising one of 40
evidence-informed skills. This writes:

  src/v3/data/catalog.js        engines, laws, skills and a compact index of
                                all 1,000 rituals (loaded with the app)
  src/v3/data/copy/ge-NN.js     the user-facing words for the 20 rituals on
                                each engine (loaded when one is played)

Only user-facing copy is kept: the Mallow's lines without stage directions,
the mind bend without the designer note, the plot-twist sentence, the sound
cue. Nothing is reworded; text is trimmed and the first letter capitalised.
Rerun after the workbook changes.
"""
import json
import re
import sys
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'src/v3/data'

# sheet feeling words → emotion ids in src/data/emotions.js
EMOTION_IDS = {
    'anger': ['anger'], 'anxiety': ['anxiety'], 'overwhelm': ['overwhelm'], 'resentment': ['resentment'],
    'sadness': ['sadness'], 'rumination': ['overthinking'], 'conflict': ['conflicted'],
    'mental clutter': ['overwhelm', 'scattered'], 'racing thoughts': ['overthinking', 'anxiety'],
    'flatness': ['flat'], 'panic-like worry': ['panic', 'worry'], 'helplessness': ['helpless'],
    'self-criticism': ['self-critical'], 'overthinking': ['overthinking'], 'shame': ['shame'], 'guilt': ['guilt'],
    'low motivation': ['unmotivated'], 'tension': ['tense'], 'discouragement': ['discouraged'],
    'intrusive thoughts': ['overthinking', 'anxiety'], 'confusion': ['confusion'], 'future worry': ['worry', 'dread'],
    'embarrassment': ['embarrassment'], 'loneliness': ['loneliness'], 'stress': ['stress'], 'impulsivity': ['urge'],
    'stuckness': ['stuck'], 'hurt': ['hurt'], 'fatigue': ['fatigue'], 'worry': ['worry'], 'ambivalence': ['ambivalence'],
    'frustration': ['frustration'], 'apathy': ['apathy'], 'unease': ['unease'], 'irritation': ['irritation'],
    'restlessness': ['restlessness'], 'regret': ['regret'], 'distractibility': ['scattered'], 'pressure': ['pressured'],
    'disappointment': ['disappointment'], 'self-blame': ['guilt', 'self-critical'], 'numbness': ['numbness'],
    'decision fatigue': ['indecision', 'fatigue'],
}
MALLOW_IDS = {'Glitzi': 'glitzi', 'Blubi': 'blubi', 'Zuzu': 'zuzu', 'Boppo': 'boppo', 'Pipzi': 'pipzi', 'Loomi': 'loomi', 'Noomi': 'noomi'}
REALM_IDS = {'Static Storm': 'static-storm', 'Raindrop Lagoon': 'raindrop-lagoon', 'Spiral Observatory': 'spiral-observatory',
             'Sunpop Orchard': 'sunpop-orchard', 'Spark Festival': 'spark-festival', 'Blue Drift': 'blue-drift', 'Moonmilk Cove': 'moonmilk-cove'}


def rows(wb, name):
    it = wb[name].iter_rows(values_only=True)
    hdr = next(it)
    return [dict(zip(hdr, r)) for r in it if r and r[0] not in (None, '')]


def clean(s):
    return re.sub(r'\s+', ' ', str(s or '')).strip()


def cap(s):
    s = clean(s)
    return s[:1].upper() + s[1:] if s else s


def quotes(s):
    """The Mallow's spoken lines only (drops [buttons] and stage directions)."""
    return [cap(q) for _, q in re.findall(r'(\w+): "([^"]+)"', str(s or ''))]


def mind_bend(s):
    parts = [p for p in re.split(r'(?<=[.!?])\s+', clean(s)) if p and not p.startswith('In this particular')]
    return cap(' '.join(parts))


def plot_twist(s, prop):
    s = clean(s)
    s = re.sub(r'^As [^,]+,\s*', '', s)                  # "As <win state>, …"
    s = re.split(r'\s+The [^.]* stays interactive', s)[0]  # designer note
    s = re.sub(r'^At the end\s+', '', s)
    return cap(s.rstrip('.') + '.')


def main(xlsx):
    wb = openpyxl.load_workbook(xlsx, read_only=True, data_only=True)
    engines = rows(wb, '50 TOUCH ENGINES')
    laws = rows(wb, '20 WORLD LAWS')
    skills = rows(wb, '40 EVIDENCE SKILLS')
    rituals = rows(wb, '1000 UNIQUE RITUALS')
    assert len(engines) == 50 and len(laws) == 20 and len(skills) == 40 and len(rituals) == 1000

    eng_idx = {clean(e['Device']): i for i, e in enumerate(engines)}
    law_idx = {clean(l['Movement / World Law']): i for i, l in enumerate(laws)}
    skill_idx = {clean(s['Named Skill']): i for i, s in enumerate(skills)}

    ENG = [{
        'id': clean(e['Engine ID']), 'name': clean(e['Device']), 'prop': clean(e['Touchable Prop']),
        'motion': cap(e['Exact Base User Motion']), 'physics': cap(e['Responsive Physics']),
        'win': clean(e['Base Win State']), 'primitive': clean(e['iPhone Input Primitive']),
    } for e in engines]
    LAW = [{
        'n': int(l['World Law #']), 'name': clean(l['Movement / World Law']), 'rule': cap(l['Additional Physical Constraint']),
        'payoff': clean(l['Visual Payoff']), 'principle': clean(l['Emotional / Attention Principle']),
        'location': clean(l['Fantasy Location']), 'geometry': clean(l['Location Geometry']), 'finale': clean(l['Light Finale']),
    } for l in laws]
    SKILL = [{
        'name': clean(s['Named Skill']), 'group': clean(s['Group']), 'does': cap(s['Core Action']),
        'insight': cap(s['Foundational Insight']), 'precaution': cap(s['Precaution']),
        'scope': clean(s['Evidence Scope']), 'url': clean(s['Research URL']),
    } for s in skills]

    index, copy = [], {e['id']: {} for e in ENG}
    seen_pairs = set()
    for r in rituals:
        ei = eng_idx[clean(r['Gesture Engine (reused)'])]
        li = law_idx[clean(r['World Law (reused)'])]
        assert (ei, li) not in seen_pairs, r['Ritual ID']
        seen_pairs.add((ei, li))
        prim, sec = clean(r['Primary Emotion']), clean(r['Secondary Emotion'])
        emos = list(dict.fromkeys(EMOTION_IDS[prim] + EMOTION_IDS[sec]))
        rid = clean(r['Ritual ID'])
        index.append([rid, clean(r['Ritual Name']), ei, li, MALLOW_IDS[clean(r['Mallow'])], REALM_IDS[clean(r['Hushfold Realm'])],
                      prim, sec, skill_idx[clean(r['Evidence-informed Skill'])], int(r['Duration Seconds']), emos])
        prop = ENG[ei]['prop']
        copy[ENG[ei]['id']][rid] = {
            'scene': clean(r['SCENE — Unique Name']),
            'open': quotes(r['MALLOW — Opening Conversation']),
            'during': quotes(r['MALLOW — During Movement']),
            'exit': quotes(r['MALLOW — Exit Conversation']),
            'bend': mind_bend(r['MIND BEND — Experiential Insight']),
            'twist': plot_twist(r['PLOT TWIST — Surprise Event'], prop),
            'sound': cap(clean(r['Music / Sound / Haptics']).split(';')[0]),
        }

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'copy').mkdir(exist_ok=True)
    head = ('// GENERATED by tools/import_v3.py from content/Hushmallow_1000_Rituals_V3.xlsx.\n'
            '// Do not edit by hand: change the workbook and rerun the importer.\n')
    j = lambda x: json.dumps(x, ensure_ascii=False, separators=(',', ':'))
    (OUT / 'catalog.js').write_text(
        head
        + f'export const ENGINES = {j(ENG)};\n'
        + f'export const LAWS = {j(LAW)};\n'
        + f'export const SKILLS = {j(SKILL)};\n'
        + '// [id, name, engine, law, mallow, realm, primary, secondary, skill, seconds, emotionIds]\n'
        + f'export const INDEX = {j(index)};\n', encoding='utf-8')
    for eid, m in copy.items():
        (OUT / 'copy' / f'{eid.lower()}.js').write_text(head + f'export default {j(m)};\n', encoding='utf-8')
    size = (OUT / 'catalog.js').stat().st_size // 1024
    print(f'{len(index)} rituals · catalog {size} KB · {len(copy)} copy chunks')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else ROOT / 'content/Hushmallow_1000_Rituals_V3.xlsx')
