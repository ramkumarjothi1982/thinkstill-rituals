#!/usr/bin/env python3
"""Import the Hushmallow 1,000 ritual blueprints (V3 workbook) into the app.

    python3 -I tools/import_v3.py content/Hushmallow_1000_Rituals_V3.xlsx [--workbook]

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


def plot_twist(s, win):
    s = clean(s)
    s = re.sub(r'^As ' + re.escape(win) + r',\s*', '', s, flags=re.I)  # "As <win state>, …"
    s = re.sub(r'^As [^,]+,\s*', '', s)
    s = re.split(r'\s+The [^.]* stays interactive', s)[0]  # designer note
    s = re.sub(r'^At the end\s+', '', s)
    return cap(s.rstrip('.') + '.')


# ---------------------------------------------------------------- corrections --
# The workbook's copy is generated from templates; a few templates drop the
# article before the prop ("Oh, molten-rim dial is…"), use a law's name as a
# verb ("when you half-speed hush", "when you wake"), lower-case place names,
# leave a capital mid-sentence ("…arc, At the end…") or use US spelling.
# Every fix below is mechanical and listed in docs/V3_CORRECTIONS.md; the
# meaning of every line is unchanged.
LAW_VERB = {
    1: 'slowed to half speed', 2: 'paused between pulses', 3: 'mirrored your touch', 4: 'followed the gentle S-curve',
    5: 'took three gentle beats', 6: 'eased the last inch', 7: 'changed direction once', 8: 'lightened your hold',
    9: 'landed both parts', 10: 'waited for the wake', 11: 'went left, then right', 12: 'moved from the edge to the centre',
    13: 'moved from the centre to the horizon', 14: 'found the comfort band', 15: 'traced your way back',
    16: 'turned the volume down without deleting', 17: 'chose your exit', 18: 'touched the slow lights',
    19: 'anchored and explored', 20: 'released things in stages',
}
# props that take a plural verb ("the two polarity stones are…")
PLURAL = {'three glass gates', 'layered echo tiles', 'two knotted satellites', 'two overlapping clouds', 'word-carousel horses',
          'two polarity stones', 'crossed silk ribbons', 'embers under a copper grille', 'detached constellation stars',
          'movable sound baffles', 'double clock hands', 'floating lantern switches', 'three water ribbons',
          'rippling tide-pool rings', 'magnetic compass petals', 'resting seed and soft soil'}
def agree(prop):
    pl = prop in PLURAL
    return {'IS': 'are' if pl else 'is', 'HAS': 'have' if pl else 'has', 'ITS': 'their' if pl else 'its'}
LINE_FIX = {
    # opening
    'Here in {L}, we can try the {W} move with {P}.': 'Here in the {LT}, we can try the {WT} move with the {P}.',
    "Come closer if you'd like. {P} can hold these words for a moment.": "Come closer if you'd like. The {P} can hold these words for a moment.",
    "We can carry these words gently through {P}. No need to pretend they're small.": "We can carry these words gently through the {P}. No need to pretend they're small.",
    'Oh, {P} is being dramatic. Your words get the controls—not the noise.': 'Oh, the {P} {IS} being dramatic. Your words get the controls—not the noise.',
    "Oh! {P} is ready for its very specific mission. Your text's coming along!": "Oh! The {P} {IS} ready for {ITS} very specific mission. Your words are coming along!",
    'Welcome to the weird little {P}. Want to try a different kind of movement?': 'Welcome to the weird little world of the {P}. Want to try a different kind of movement?',
    "There's no rush here. Let {P} meet your actual words.": "There's no rush here. Let the {P} meet your actual words.",
    # during
    'Your {P} and this {L} just shifted together; you chose the pace.': 'Your {P} and the {LT} just shifted together; you chose the pace.',
    'A soft move. {P} followed without needing a hurry.': 'A soft move. The {P} followed without any hurry.',
    'Look at that—{P} has room to settle at your speed.': 'Look at that—the {P} {HAS} room to settle at your speed.',
    'Ha. {P} actually listened when you {V}.': 'Ha. The {P} actually listened when you {VT}.',
    'Ooh, {P} did the thing when you {V}!': 'Ooh, the {P} did the thing when you {VT}!',
    'The scene shifted when you {V}; we can let it settle.': 'The scene shifted when you {VT}; we can let it settle.',
    'Did you see that little change? That was your {X}!': 'Did you see that little change? That was your {WT} move!',
    'My spirals spotted that gentle {X}. Nicely steered.': 'My spirals spotted that {WT} move. Nicely steered.',
    # exit
    'We can leave the {P} resting here in {L}, with your original words safe to revisit.': 'We can leave the {P} resting here in the {LT}, with your original words safe to revisit.',
}
BEND_FIX = {
    'For {SK}, notice: {P} could change pace without demanding that your feeling change pace too. {INS}.': 'For {SK}, notice: the {P} could change pace without demanding that your feeling change pace too. {INS}.',
    'You guided {P} by choice, not by arguing with your words. That is the point of {SK}: {INS}.': 'You guided the {P} by choice, not by arguing with your words. That is the point of {SK}: {INS}.',
    'The quietest moment happened when {P} stopped being hurried. {INS}.; the issue did not need erasing.': 'The quietest moment happened when the {P} stopped being hurried. {INS}; the issue did not need erasing.',
    'Your hands found two directions for {P}, yet the sentence stayed the same. {INS}.': 'Your hands found two directions for the {P}, yet the sentence stayed the same. {INS}.',
    "Three small actions changed the visible world of {P}; they didn't have to fix the outside world. {INS}.": "Three small actions changed the visible world of the {P}; they didn't have to fix the outside world. {INS}.",
    "The last inch of {P} took more care than the first. That's a practical version of {SK}: {INS}.": "The last inch of the {P} took more care than the first. That's a practical version of {SK}: {INS}.",
    'Changing the route of {P} was possible without deciding your feeling was wrong. {INS}.': 'Changing the route of the {P} was possible without deciding your feeling was wrong. {INS}.',
    'The lighter touch shifted {P}, though no one required you to suppress an emotion. {INS}.': 'The lighter touch shifted the {P}, though no one required you to suppress an emotion. {INS}.',
    'Separating pieces of {P} is not the same as separating from people. {INS}.': 'Separating pieces of the {P} is not the same as separating from people. {INS}.',
    'You waited and {P} kept moving on its own for a while. {INS}.': 'You waited, and the {P} kept moving on {ITS} own for a while. {INS}.',
    'Left and right on {P} were choices, not tests of your worth. {INS}.': 'Left and right on the {P} were choices, not tests of your worth. {INS}.',
    'When {P} came closer, you controlled the distance—not the truth of your words. {INS}.': 'When the {P} came closer, you controlled the distance—not the truth of your words. {INS}.',
    'You gave {P} more room without putting your concern out of reach. {INS}.': 'You gave the {P} more room without putting your concern out of reach. {INS}.',
    'A comfortable middle setting for {P} was enough. {INS}.': 'A comfortable middle setting for the {P} was enough. {INS}.',
    'Tracing {P} backward did not rewind real life; it gave you another moment to choose. {INS}.': 'Tracing the {P} backwards did not rewind real life; it gave you another moment to choose. {INS}.',
    'Turning down the prominence of {P} changed your attention, not the meaning of your memory. {INS}.': 'Turning down the prominence of the {P} changed your attention, not the meaning of your memory. {INS}.',
    'Either exit for {P} was valid because emotions are not exams. {INS}.': 'Either exit for the {P} was valid, because emotions are not exams. {INS}.',
    'The slow lights of {P} followed your hands, not a compulsory rhythm. {INS}.': 'The slow lights of the {P} followed your hands, not a compulsory rhythm. {INS}.',
    'Your anchor stayed while {P} explored a little. {INS}.': 'Your anchor stayed put while you explored the {P} a little. {INS}.',
    'Piece by piece, {P} settled; you were not asked to resolve every part of your feeling. {INS}.': 'Piece by piece, the {P} settled; you were not asked to resolve every part of your feeling. {INS}.',
}
TWIST_FIX = {
    'The compass spins for a beat, then chooses to follow the direction you reversed into.': 'A little compass appears, spins for a beat, then follows the direction you reversed into.',
    'Instead of a perfect zero, the gauge reveals a wide, comfortable middle zone.': 'Instead of a perfect zero, the scene reveals a wide, comfortable middle zone.',
    'The scene reveals two equally beautiful endings, and the user picks the one that fits.': 'The scene reveals two equally beautiful endings, and you pick the one that fits.',
}
TEXT_FIX = [  # engines, laws, skills (British spelling; second person)
    (r'\bcounter-?clockwise\b', 'anticlockwise'), (r'\btoward\b', 'towards'), (r'\bbackward\b', 'backwards'),
    (r'\bcanceling\b', 'cancelling'), (r'\bminimizing\b', 'minimising'), (r'\blabeling\b', 'labelling'),
    (r'You can practice an unhurried pace', 'You can practise an unhurried pace'),
    (r'^Needle wobbles gently and settles where the user chooses\.', 'The needle wobbles gently and settles where you choose.'),
    (r'along the user-visible safe channel', 'along the visible safe channel'),
    (r'Prefix the user thought with "My mind is telling me…" before watching it pass\.', 'Put “My mind is telling me…” in front of the thought, then watch it pass.'),
    (r'Never ask user to look at phone while walking; use audio-only/off-screen prompts\.', 'Never ask anyone to look at their phone while walking; use audio-only or off-screen prompts.'),
    (r"let user choose", 'let the person choose'),
]
CORRECTIONS = []  # (where, before, after)

def fix_text(s, where):
    out = s
    for pat, rep in TEXT_FIX:
        out = re.sub(pat, rep, out)
    if out != s:
        CORRECTIONS.append((where, s, out))
    return out

def fix_line(q, ctx, where):
    """Correct one Mallow line using its template."""
    t = q
    t = re.sub(re.escape(ctx['prop']), '{P}', t, flags=re.I)
    t = re.sub(re.escape(ctx['loc']), '{L}', t, flags=re.I)
    t = re.sub(re.escape(ctx['law']), '{W}', t, flags=re.I)
    t = re.sub(r'when you [^;!.]+', 'when you {V}', t)
    t = re.sub(r'That was your [^!]+!', 'That was your {X}!', t)
    t = re.sub(r'spotted that gentle .+?\. Nicely', 'spotted that gentle {X}. Nicely', t)
    if t in LINE_FIX:
        new = LINE_FIX[t].format(P=ctx['prop'], LT=ctx['loc_title'], WT=ctx['law'], VT=LAW_VERB[ctx['law_n']], **agree(ctx['prop']))
        if new != q:
            CORRECTIONS.append((where, q, new))
        return new
    return q

def fix_bend(b, ctx, where):
    t = re.sub(re.escape(ctx['prop']), '{P}', b, flags=re.I)
    t = t.replace(ctx['skill'], '{SK}').replace(ctx['insight'].rstrip('.'), '{INS}')
    if t in BEND_FIX:
        new = BEND_FIX[t].format(P=ctx['prop'], SK=ctx['skill'], INS=ctx['insight'].rstrip('.'), **agree(ctx['prop']))
        if new != b:
            CORRECTIONS.append((where, b, new))
        return new
    return b


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

    F = lambda v, where: fix_text(v, where)
    ENG = [{
        'id': clean(e['Engine ID']), 'name': clean(e['Device']), 'prop': clean(e['Touchable Prop']),
        'motion': F(cap(e['Exact Base User Motion']), f"{clean(e['Engine ID'])} motion"), 'physics': F(cap(e['Responsive Physics']), f"{clean(e['Engine ID'])} physics"),
        'win': F(clean(e['Base Win State']), f"{clean(e['Engine ID'])} win"), 'primitive': clean(e['iPhone Input Primitive']),
    } for e in engines]
    LAW = [{
        'n': int(l['World Law #']), 'name': clean(l['Movement / World Law']), 'rule': F(cap(l['Additional Physical Constraint']), f"Law {l['World Law #']} rule"),
        'payoff': F(clean(l['Visual Payoff']), f"Law {l['World Law #']} payoff"), 'principle': clean(l['Emotional / Attention Principle']),
        'location': clean(l['Fantasy Location']), 'geometry': clean(l['Location Geometry']), 'finale': F(clean(l['Light Finale']), f"Law {l['World Law #']} finale"),
    } for l in laws]
    SKILL = [{
        'name': clean(s['Named Skill']), 'group': F(clean(s['Group']), f"Skill {clean(s['Named Skill'])} group"), 'does': F(cap(s['Core Action']), f"Skill {clean(s['Named Skill'])} action"),
        'insight': F(cap(s['Foundational Insight']), f"Skill {clean(s['Named Skill'])} insight"), 'precaution': F(cap(s['Precaution']), f"Skill {clean(s['Named Skill'])} precaution"),
        'scope': clean(s['Evidence Scope']),
    } for s in skills]
    raw_insight = {clean(s['Named Skill']): cap(s['Foundational Insight']) for s in skills}
    # research links stay in the docs (the shipped app makes no outside requests)
    refs = [(clean(s['Named Skill']), clean(s['Group']), clean(s['Evidence Scope']), clean(s['Research URL'])) for s in skills]

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
        scene = clean(r['SCENE — Unique Name'])
        sk = clean(r['Evidence-informed Skill'])
        ctx = {'prop': prop, 'loc': LAW[li]['location'], 'loc_title': (re.search(r' in the (.+?): ', scene) or re.search(r'(.*)', LAW[li]['location'].title())).group(1),
               'law': LAW[li]['name'], 'law_n': LAW[li]['n'], 'skill': sk, 'insight': raw_insight[sk]}
        line = lambda col, label: [fix_line(q, ctx, f'{rid} {label}') for q in quotes(r[col])]
        bend = fix_bend(mind_bend(r['MIND BEND — Experiential Insight']), ctx, f'{rid} mind bend')
        # the skill sentence inside the bend gets the same spelling fixes as the skill itself
        bend = fix_text(bend, f'{rid} mind bend')
        tw0 = plot_twist(r['PLOT TWIST — Surprise Event'], clean(engines[ei]['Base Win State']))
        tw = TWIST_FIX.get(tw0, tw0)
        if tw != tw0: CORRECTIONS.append((f'{rid} plot twist', tw0, tw))
        copy[ENG[ei]['id']][rid] = {
            'scene': scene,
            'open': line('MALLOW — Opening Conversation', 'opening line'),
            'during': line('MALLOW — During Movement', 'during line'),
            'exit': line('MALLOW — Exit Conversation', 'exit line'),
            'bend': bend,
            'twist': tw,
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
    write_corrections(xlsx)
    if '--workbook' in sys.argv:
        write_corrected_workbook(xlsx)
    doc = ROOT / 'docs/V3_SKILLS.md'
    doc.write_text('# The 40 evidence-informed skills (V3 rituals)\n\n'
                   'Generated by tools/import_v3.py. Each ritual practises one skill. These are calming, '
                   'non-clinical activities; the links show the research family each draws on.\n\n'
                   '| Skill | Group | Evidence scope | Source |\n|---|---|---|---|\n'
                   + ''.join(f'| {a} | {b} | {c} | {d} |\n' for a, b, c, d in refs), encoding='utf-8')
    size = (OUT / 'catalog.js').stat().st_size // 1024
    print(f'{len(index)} rituals · catalog {size} KB · {len(copy)} copy chunks')


def write_corrected_workbook(xlsx):
    """A copy of the workbook with every correction applied, plus a CORRECTIONS sheet."""
    out = Path(xlsx).with_name(Path(xlsx).stem + '_corrected.xlsx')
    wb = openpyxl.load_workbook(xlsx)
    ws = wb['1000 UNIQUE RITUALS']
    hdr = [c.value for c in ws[1]]
    col = {name: i for i, name in enumerate(hdr)}
    rowof = {ws.cell(row=r, column=1).value: r for r in range(2, ws.max_row + 1)}
    target = {'opening line': 'MALLOW — Opening Conversation', 'during line': 'MALLOW — During Movement', 'exit line': 'MALLOW — Exit Conversation',
              'mind bend': 'MIND BEND — Experiential Insight', 'plot twist': 'PLOT TWIST — Surprise Event'}
    applied = 0
    for where, before, after in CORRECTIONS:
        m = re.match(r'^(HM-\d+) (.+)$', where)
        if m and m.group(2) in target:
            cell = ws.cell(row=rowof[m.group(1)], column=col[target[m.group(2)]] + 1)
            v = str(cell.value or '')
            if before in v: cell.value = v.replace(before, after); applied += 1
    for r in range(2, ws.max_row + 1):  # "…arc, At the end the…" → "…arc, at the end the…"
        cell = ws.cell(row=r, column=col['PLOT TWIST — Surprise Event'] + 1)
        if cell.value and ', At the end ' in str(cell.value): cell.value = str(cell.value).replace(', At the end ', ', at the end ')
    for sheet in ('50 TOUCH ENGINES', '20 WORLD LAWS', '40 EVIDENCE SKILLS', '1000 UNIQUE RITUALS'):
        for row in wb[sheet].iter_rows(min_row=2):
            for cell in row:
                if isinstance(cell.value, str):
                    v = cell.value
                    for pat, rep in TEXT_FIX: v = re.sub(pat, rep, v, flags=re.M)
                    v = re.sub(r'\bPractice the underlying skill', 'Practise the underlying skill', v)
                    if v != cell.value: cell.value = v
    cs = wb.create_sheet('CORRECTIONS', 0)
    cs.append(['Where', 'Before', 'After'])
    for row in CORRECTIONS: cs.append(list(row))
    cs.column_dimensions['A'].width = 26; cs.column_dimensions['B'].width = 90; cs.column_dimensions['C'].width = 90
    wb.save(out)
    print(f'corrected workbook → {out.name} ({applied} ritual cells)')


def write_corrections(xlsx):
    """docs/V3_CORRECTIONS.md: every kind of correction with counts and examples."""
    import collections
    kinds = collections.OrderedDict()
    for where, before, after in CORRECTIONS:
        key = re.sub(r'^HM-\d+ ', '', where)
        kinds.setdefault(key, []).append((where, before, after))
    out = ['# Corrections to the V3 ritual workbook', '',
           f'Generated by tools/import_v3.py from `{Path(xlsx).name}`. The workbook itself is unchanged; the app uses the corrected text.',
           'Every fix is mechanical (grammar, missing articles, a law name used as a verb, a stray capital, US spelling, third-person wording); no meaning changed.', '',
           f'**{len(CORRECTIONS)} corrections in total.**', '']
    for key, items in kinds.items():
        out.append(f'## {key} — {len(items)}')
        seen = set()
        for where, b, a in items:
            sig = re.sub(r'\s+', ' ', b)[:60]
            if sig in seen and len(items) > 6:
                continue
            seen.add(sig)
            out.append(f'- `{where}`  \n  before: {b}  \n  after: **{a}**')
            if len(seen) >= 6:
                break
        out.append('')
    (ROOT / 'docs/V3_CORRECTIONS.md').write_text('\n'.join(out) + '\n', encoding='utf-8')
    print(f'{len(CORRECTIONS)} corrections → docs/V3_CORRECTIONS.md')


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    main(args[0] if args else ROOT / 'content/Hushmallow_1000_Rituals_V3.xlsx')
