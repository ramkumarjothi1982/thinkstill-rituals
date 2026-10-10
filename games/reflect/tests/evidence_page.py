"""Build the Reflect review page from an evidence run (scratch/run_evidence.sh → <ev>/{sm,ma,er,sizes}).

  python3 evidence_page.py <ev-dir> <framer-smoke-dir> <room-test-output.txt> <out-dir> <play-url>

Writes <out-dir>/index.html, img/*.jpg, vid/*.mp4 and files.json (published path → source path)."""
import html, json, os, re, shutil, statistics, subprocess, sys
from PIL import Image

EV, FRAMER, ROOMTXT, OUT, PLAY = sys.argv[1:6]
os.makedirs(os.path.join(OUT, 'img'), exist_ok=True); os.makedirs(os.path.join(OUT, 'vid'), exist_ok=True)
FILES = {}


def jpg(src, rel, width):
    im = Image.open(src).convert('RGB')
    if im.width > width: im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    dst = os.path.join(OUT, rel); im.save(dst, 'JPEG', quality=82, optimize=True, progressive=True)
    FILES[rel] = dst
    return rel


def first(d, pat):
    if not os.path.isdir(d): return None
    xs = sorted(f for f in os.listdir(d) if re.fullmatch(pat, f))
    return os.path.join(d, xs[0]) if xs else None


def last(d, pat):
    if not os.path.isdir(d): return None
    xs = sorted(f for f in os.listdir(d) if re.fullmatch(pat, f))
    return os.path.join(d, xs[-1]) if xs else None


def vid(src, rel):
    if not src or not os.path.exists(src): return None
    dst = os.path.join(OUT, rel)
    shutil.copy(src, dst); FILES[rel] = dst
    return rel


def pct(xs, q):
    if not xs: return None
    xs = sorted(xs); k = min(len(xs) - 1, max(0, int(round(q * (len(xs) - 1)))))
    return round(xs[k], 1)


def timing(mfile):
    if not os.path.exists(mfile): return None
    m = json.load(open(mfile))
    fr = m.get('frames') or []
    evt = m.get('evt') or []
    return {'frame_p50': pct(fr, 0.5), 'frame_p95': pct(fr, 0.95), 'frames': len(fr), 'evt_n': len(evt), 'evt_max': round(max([e.get('dur', 0) for e in evt] or [0])), 'errors': len(m.get('errors') or [])}


E = lambda s: html.escape(s, quote=True)

RITUALS = [
    dict(id='sm', rid='shadow-monsters', title='Shadow Monsters', tag='Everything looks bigger in the dark.', genre='Spooky comedy · 2–4 people',
         points=[
             ('The emotional problem', 'Dread that grows in the dark: the deadline, the unopened message, the money thing. Worry magnifies whatever you hold closest to it.'),
             ('How you take part', 'Everyone secretly builds a shadow monster from ridiculous household objects — a fork, a croissant, a rubber glove, a bunny slipper — on sticks between a lamp and a sheet. Slide a piece towards the lamp and its shadow looms; turn it; optionally tag what it’s about. Then the Shadow Show: each monster rises over the whole audience (everyone in the room plus the Bubbles in the seats), people scream / laugh / hug in real time, and only its maker can hold to pull the light back.'),
             ('Why it’s funny', 'The gap. A towering beast is, with the lights up, a whisk, a duck and a croissant. The Bubbles commit: Rush faints, Drop sobs, Glitch films it and breaks the lamp, Loopie brings “the same croissant dragon. Again.”, and Still’s terrifying monster is one rubber duck held very close to the bulb.'),
             ('Instant relief', 'It happens in your hand: you hold, the light pulls back, and the thing that loomed over everyone shrinks to its real size while they watch. Then the lights come up and the room laughs at what it was made of.'),
             ('The discovery', '“Same stuff. More distance.” Every monster shown at the lamp beside the pile of ordinary objects it was made of, with how many times bigger the lamp made it. You find out your dread was mostly distance — by doing it, not by reading it.'),
             ('Surprise and replay', 'A different toybox every round, other people’s monsters you can’t predict until the lights come up, Bubble monsters that change, and a shadow toy that is fun on its own.'),
             ('The finale', 'All the monsters do a conga line across the sheet — until Still’s tiny duck quacks. They scatter in panic, turn into a flock of birds and fly into a sunrise on the sheet. Share card: “What it felt like / What it was made of.”')]),
    dict(id='ma', rid='mess-auction', title='The Glorious Mess Auction', tag='Draw it blind. Watch it sell.', genre='Comedy · 2–4 people',
         points=[
             ('The emotional problem', 'Perfectionism: the voice that says your stuff isn’t good enough to show. We judge our own mess far more harshly than anyone else does.'),
             ('How you take part', 'Draw yourself blindfolded in eight seconds (the Bubbles can see it and are trying very hard not to laugh), then add the hair — still blind — sign it, and put a secret price on it. Then a live auction: the velvet cloth comes off each mess, and everyone else holds a paddle up while the price climbs. Let go and you’re out. Friends bid on each other’s messes in real time; the Bubble collectors bid in character.'),
             ('Why it’s funny', 'Blind drawings are reliably glorious, and the blindfold coming off is the first big laugh. Then the pomp: a velvet auction house, a harpsichord minuet and a gavel, treating scribbles like old masters. Rush panics and drops first, Loopie raises its paddle again after dropping, Sync copies whoever lets go, Drop weeps and holds on, Patch “restores” lots with tape and “straightens” your easel while you can’t see. Prices come in pickles and moons.'),
             ('Instant relief', 'Being blind removes any way to do it right, so perfectionism has nothing to grip — you just laugh at your own mess. Then you watch people fight over it.'),
             ('The discovery', 'The estimates board: what each artist secretly asked for their own mess beside what it sold for (×98). Then one line made from your own paddle: “You’d pay 240 for Rush’s mess. You’d sell your own for 5.” With friends: “Ben held on to 630 for yours.” Nobody answers a question — your hands already did.'),
             ('Surprise and replay', 'Four prompts (self-portrait, Monday morning with coffee, your inner critic with a hat, you as a superhero with a cape); every blind drawing is new; each lot has a different collector who falls for it; real bidding wars with friends.'),
             ('The finale', 'The Museum of Glorious Messes: the camera walks a marble gallery where every lot hangs under a picture light with its sale on a brass card. Yours is behind a velvet rope, a laser grid and a guard with tea. The last exhibit is your own price tag, on a velvet cushion under a glass dome, “acquired by Drop for one pickle” — until Rush trips the alarm.')]),
    dict(id='er', rid='emotional-rollercoaster', title='Emotional Rollercoaster', tag='Same day. Same ride. Totally different drops.', genre='Spectacle · 2–4 people · the benchmark, pushed further',
         points=[
             ('The emotional problem', 'Feeling alone in how a day hit you, and assuming everyone felt it the way you did.'),
             ('How you take part', 'Everyone shapes a coaster track for the same five moments of a Saturday — how high or low each felt and how it moved you (drop, loop, tunnel, corkscrew, smooth). Then everyone rides at once on tracks side by side, and at two junctions you can jump onto a friend’s track and feel their version.'),
             ('Why it’s funny', 'New: the Bubble companions ride in character, live in an on-ride camera strip — Rush panics on the lift hill and screams through every drop, Still is unbothered by all of it and falls asleep in the tunnel, Drop weeps in the dark, Loopie goes silly upside down, each with its own voice and pictograms.'),
             ('Instant relief', 'The ride itself: drops, loops and screams together, then riding someone else’s version of the same moment.'),
             ('The discovery', 'At the station every track is overlaid and the moments where you diverged pulse: “Same cancelled brunch. You dropped; Ben looped.” You see your biggest drop and your ending next to theirs.'),
             ('Surprise and replay', 'Different friends, different tracks, different jumps — and the moments can be a day the group really shared.'),
             ('The finale', 'Every track merges into one loop; the carts couple and go round together under fireworks; the on-ride photo prints with each face caught at its biggest drop.')]),
]

SHOTS = {
    'sm': [('phone-1-hook-monster', 'The first three seconds'), ('phone-3-monster', 'Building a monster backstage'), (r'phone-s\d+-loom-\d', 'It looms over the audience'), (r'phone-s-pulling-\d', 'Its maker pulls the light back'), (r'phone-s\d+-lights-\d', 'Lights up: what it was made of'), (r'phone-s\d+-evr--1', 'Same stuff. More distance.'), (r'phone-s\d+-finale--1', 'The parade'), ('phone-z-end', 'Ritual complete · share card')],
    'ma': [('phone-1-hook-bang', 'The first three seconds'), ('phone-3-blind', 'Drawing blind — they can see it'), ('phone-4-reveal', 'Blindfold off'), ('phone-6-price', 'A secret price'), (r'phone-b-holding-\d', 'Holding the paddle up'), (r'phone-a\d+-sold-\d', 'SOLD'), (r'phone-a\d+-gap--1', 'The estimates are in'), ('phone-z-end', 'Ritual complete · share card')],
    'er': [('phone-1-hook', 'The first three seconds'), ('phone-3-shaping', 'Shaping the day'), ('phone-5-ride-lift', 'On-ride camera: the Bubbles in character'), ('phone-6-ride-drop', 'The first drop'), ('phone-7-switch-lever', 'Jump onto a friend’s track'), ('phone-10-station', 'Where you diverged'), ('phone-11-one-loop', 'One loop together'), ('phone-12-photo', 'On-ride photo')],
}
DESK = {
    'sm': [(r'desktop-s\d+-react-\d', 'Desktop · the audience reacts'), (r'desktop-s\d+-lights-\d', 'Desktop · lights up')],
    'ma': [(r'desktop-3-blind', 'Desktop · drawing blind'), (r'desktop-a\d+-sold-\d', 'Desktop · SOLD')],
    'er': [(r'desktop-8-ride-loop', 'Desktop · the loop'), (r'desktop-10-station', 'Desktop · the station')],
}
CHECK_LABELS = {
    'guest_monster_hidden_from_host': 'The guest’s monster is invisible to the host until the show',
    'same_show_and_clock': 'Both devices get the same show and the same start time',
    'host_pulled_own_light': 'The host pulled their own light back',
    'guest_pulled_own_light': 'The guest pulled their own light back',
    'both_see_the_same_pulls': 'Both devices agree on every pull',
    'guest_reactions_reached_host': 'The guest’s reactions reached the host',
    'host_reactions_reached_guest': 'The host’s reactions reached the guest',
    'guest_drawing_and_price_hidden_from_host': 'The guest’s drawing and secret price are invisible to the host until the auction',
    'same_lots_and_clock': 'Both devices get the same lots and the same start time',
    'both_agree_on_every_sale': 'Both devices agree on every hammer price and winner',
    'host_sees_what_guest_held_for_it': 'The host sees what the guest held on for their mess',
    'guest_sees_what_host_held_for_it': 'The guest sees what the host held on for theirs',
    'human_bids_recorded': 'Both people’s paddles are recorded by the room',
    'guest_track_hidden_from_host': 'The guest’s track is invisible to the host until the ride',
    'same_ride_schedule': 'Both devices get the same ride and the same start time',
    'guest_switched': 'The guest jumped onto another track',
    'host_saw_switch': 'The host saw the jump',
}

sections, nav = [], []
for R in RITUALS:
    d = os.path.join(EV, R['id'])
    nav.append(f'<a href="#{R["id"]}">{E(R["title"])}</a>')
    pts = ''.join(f'<div class="pt"><h4><span>{i + 1}</span>{E(t)}</h4><p>{E(b)}</p></div>' for i, (t, b) in enumerate(R['points']))
    shots = []
    for pat, cap in SHOTS[R['id']]:
        f = first(d, pat + r'\.png') if '\\' in pat or '(' in pat else (os.path.join(d, pat + '.png') if os.path.exists(os.path.join(d, pat + '.png')) else None)
        if not f: continue
        rel = jpg(f, f'img/{R["id"]}-{os.path.basename(f)[:-4]}.jpg', 520)
        shots.append(f'<figure class="shot"><img src="{rel}" alt="{E(cap)}" loading="lazy" width="390" height="844"><figcaption>{E(cap)}</figcaption></figure>')
    desk = []
    for pat, cap in DESK[R['id']]:
        f = first(d, pat + r'\.png')
        if not f: continue
        rel = jpg(f, f'img/{R["id"]}-{os.path.basename(f)[:-4]}.jpg', 1100)
        desk.append(f'<figure class="shot"><img src="{rel}" alt="{E(cap)}" loading="lazy" width="1280" height="860"><figcaption>{E(cap)}</figcaption></figure>')
    vids = []
    for src, rel, cap, cls in [(os.path.join(d, 'phone-solo.mp4'), f'vid/{R["id"]}-phone-solo.mp4', 'Phone · solo with Bubble companions · the whole ritual, real pointer input', 'tall'),
                               (os.path.join(d, 'multi-host-phone.mp4'), f'vid/{R["id"]}-two-browsers-host.mp4', 'Two browsers · host on a phone', 'tall'),
                               (os.path.join(d, 'multi-guest-desktop.mp4'), f'vid/{R["id"]}-two-browsers-guest.mp4', 'Two browsers · guest on a desktop', 'wide')]:
        r = vid(src, rel)
        if r: vids.append(f'<figure class="vid {cls}"><video src="{r}" controls playsinline preload="metadata" muted></video><figcaption>{E(cap)}</figcaption></figure>')
    log = json.load(open(os.path.join(d, 'multi-log.json'))) if os.path.exists(os.path.join(d, 'multi-log.json')) else {'checks': {}, 'errors': []}
    checks = ''.join(f'<li class="{"ok" if v is True else "bad"}"><span>{"✓" if v is True else "✕"}</span>{E(CHECK_LABELS.get(k, k))}</li>' for k, v in log.get('checks', {}).items())
    extra = ''
    if R['id'] == 'ma' and log.get('host_mirror'):
        extra = f'<p class="quote">Host’s screen at the estimates: “{E(log["host_mirror"].replace(chr(10), " "))}” · Guest’s: “{E(log.get("guest_mirror", "").replace(chr(10), " "))}”</p>'
    tm = []
    for form in ('phone', 'desktop'):
        t = timing(os.path.join(d, f'{form}-metrics.json'))
        if t: tm.append(f'<tr><th>{form}</th><td>{t["frame_p50"]} / {t["frame_p95"]} ms</td><td>{t["evt_n"]} <small>(max {t["evt_max"]} ms)</small></td><td>{t["errors"]}</td></tr>')
    sections.append(f'''<section id="{R['id']}">
<header class="rh"><p class="eyebrow">{E(R['genre'])}</p><h2>{E(R['title'])}</h2><p class="tag">{E(R['tag'])}</p></header>
<div class="pts">{pts}</div>
<h3>On a phone</h3><div class="strip">{''.join(shots)}</div>
<h3>On a desktop</h3><div class="grid2">{''.join(desk)}</div>
<h3>Watch it <small>automated runs with real pointer input; the fonts in these captures are fallbacks (the sandbox can’t reach Google Fonts)</small></h3><div class="vids">{''.join(vids)}</div>
<h3>Two real browsers in one room <small>phone + desktop, separate storage, local room server, plus one Bubble companion</small></h3><ul class="checks">{checks}</ul>{extra}
<h3>Smoothness <small>headless Chromium on a shared cloud CPU</small></h3>
<div class="tw"><table><thead><tr><th></th><th>Frame time p50 / p95</th><th>Inputs slower than 16 ms</th><th>Page errors</th></tr></thead><tbody>{''.join(tm)}</tbody></table></div>
</section>''')

# engineering checks
room_lines = open(ROOMTXT).read().strip().splitlines() if os.path.exists(ROOMTXT) else []
room_ok = sum(1 for l in room_lines if l.startswith('ok')); room_fail = sum(1 for l in room_lines if l.startswith('FAIL'))
sizes = json.load(open(os.path.join(EV, 'sizes', 'sizes.json'))) if os.path.exists(os.path.join(EV, 'sizes', 'sizes.json')) else {}
size_bad = [k for k, v in sizes.items() if v['hscroll'] or v['outside'] or v['small_targets'] or v['errors']]
fr = json.load(open(os.path.join(FRAMER, 'framer-smoke.json'))) if os.path.exists(os.path.join(FRAMER, 'framer-smoke.json')) else {'checks': {}, 'errors': []}
fchk = fr.get('checks', {})
framer_ok = all([fchk.get('a_unmounted'), fchk.get('a_remounted'), fchk.get('a_plays_mess-auction'), fchk.get('a_plays_emotional-rollercoaster'), fchk.get('b_static_poster_no_engine'), all(fchk.get('a_in_ritual_b_on_hub') or [False])]) and not fr.get('errors')
size_imgs = []
for f, cap in [('shadow-monsters-360x780', 'Shadow Monsters · 360 × 780'), ('mess-auction-360x780', 'Mess Auction · 360 × 780'), ('emotional-rollercoaster-360x780', 'Rollercoaster · 360 × 780'), ('mess-auction-1440x900', 'Mess Auction · 1440 × 900')]:
    src = os.path.join(EV, 'sizes', f + '.png')
    if os.path.exists(src):
        rel = jpg(src, f'img/size-{f}.jpg', 520 if '360' in f else 1100)
        size_imgs.append(f'<figure class="shot{" wide" if "1440" in f else ""}"><img src="{rel}" alt="{E(cap)}" loading="lazy"><figcaption>{E(cap)}</figcaption></figure>')
for f, cap in [('framer-two-instances.png', 'Framer: two components on one page, dark and bright'), ('framer-a-playing.png', 'One plays Shadow Monsters, the other stays on the hub')]:
    src = os.path.join(FRAMER, f)
    if os.path.exists(src):
        rel = jpg(src, 'img/' + f.replace('.png', '.jpg'), 1100)
        size_imgs.append(f'<figure class="shot wide"><img src="{rel}" alt="{E(cap)}" loading="lazy"><figcaption>{E(cap)}</figcaption></figure>')

SCORE = json.load(open(os.path.join(EV, 'scorecard.json'))) if os.path.exists(os.path.join(EV, 'scorecard.json')) else None
score_html = ''
if SCORE:
    head = ''.join(f'<th>{E(r)}</th>' for r in SCORE['rituals'])
    rows = ''.join(f'<tr><th>{E(c["criterion"])}</th>' + ''.join(f'<td><b>{E(str(s["score"]))}</b><small>{E(s["note"])}</small></td>' for s in c['scores']) + '</tr>' for c in SCORE['rows'])
    gaps = ''.join(f'<li>{E(g)}</li>' for g in SCORE['gaps'])
    review = ''.join(f'<li>{E(g)}</li>' for g in SCORE.get('review', []))
    score_html = f'''<section id="score"><header class="rh"><p class="eyebrow">Honest assessment</p><h2>Where they really stand</h2><p class="tag">{E(SCORE['summary'])}</p></header>
<div class="tw"><table class="score"><thead><tr><th></th>{head}</tr></thead><tbody>{rows}</tbody></table></div>
<h3>Not good enough yet</h3><ul class="gaps">{gaps}</ul>
{f'<h3>From an independent review <small>a separate agent that did not build these, looking only at the captures and the brief</small></h3><ul class="gaps">{review}</ul>' if review else ''}
</section>'''

doc = f'''<title>Reflect Rituals Review</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&family=Fredoka:wght@400;500;600;700&family=Playfair+Display:ital,wght@1,800&display=swap">
<style>
:root{{color-scheme:dark;--bg:#100c1d;--panel:#1a1530;--panel2:#221b3d;--line:rgba(255,255,255,.12);--fg:#f6f1ff;--mut:rgba(246,241,255,.72);--acc:#ffd27a;--ok:#7be0a5;--bad:#ff8a8a;--sm:#ffb26b;--ma:#e9c46a;--er:#7fd8ff}}
html,body{{background:var(--bg);color:var(--fg)}}
body{{margin:0;font:15.5px/1.55 Fredoka,ui-rounded,system-ui,-apple-system,"Segoe UI",sans-serif}}
.wrap{{max-width:1180px;margin:0 auto;padding-block:30px 70px;padding-inline:16px}}
h1{{font:800 clamp(32px,6.4vw,54px)/1.02 "Baloo 2",Fredoka,system-ui,sans-serif;margin:0 0 10px;text-wrap:balance}}
.sub{{color:var(--mut);max-width:66ch;margin:0 0 20px}}
.cta{{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 24px}}
.cta a{{display:inline-flex;align-items:center;min-height:46px;padding:0 20px;border-radius:999px;background:var(--acc);color:#241703;font-weight:700;text-decoration:none}}
.cta a.sec{{background:transparent;color:var(--fg);border:1.5px solid var(--line)}}
.changes{{background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:16px 18px;max-width:86ch;margin:0 0 26px}}
.changes h3{{margin:0 0 8px;font-size:16px}} .changes ul{{margin:0;padding-left:18px;display:grid;gap:6px;color:var(--mut)}} .changes b{{color:var(--fg)}}
nav{{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 8px;position:sticky;top:env(safe-area-inset-top,0px);background:var(--bg);padding-block:10px;z-index:3}}
nav a{{color:var(--fg);text-decoration:none;padding:7px 14px;border-radius:999px;border:1px solid var(--line);font-size:14px}}
section{{border-top:1px solid var(--line);padding-block:34px 10px;scroll-margin-top:60px}}
.rh .eyebrow{{margin:0;color:var(--acc);font-size:13px;letter-spacing:.06em;text-transform:uppercase}}
#sm .eyebrow{{color:var(--sm)}} #ma .eyebrow{{color:var(--ma)}} #er .eyebrow{{color:var(--er)}}
h2{{font:800 clamp(28px,5vw,42px)/1.05 "Baloo 2",Fredoka,system-ui,sans-serif;margin:4px 0 2px;text-wrap:balance}}
#ma h2{{font-family:"Playfair Display",Georgia,serif;font-style:italic}}
.tag{{color:var(--mut);margin:0 0 20px;font-size:17px;max-width:70ch}}
h3{{font-size:17px;margin:30px 0 12px}} h3 small{{color:var(--mut);font-weight:400;font-size:13px;display:block}}
.pts{{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,330px),1fr));gap:12px}}
.pt{{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:14px 16px;min-width:0}}
.pt h4{{margin:0 0 6px;font-size:15px;display:flex;gap:9px;align-items:center}}
.pt h4 span{{flex:none;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:var(--panel2);color:var(--acc);font-size:13px}}
.pt p{{margin:0;color:var(--mut);font-size:14.5px}}
.strip{{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(170px,210px);gap:12px;overflow-x:auto;padding-bottom:10px;scroll-snap-type:x mandatory}}
.strip .shot{{scroll-snap-align:start}}
.shot{{margin:0;min-width:0}} .shot img{{display:block;width:100%;height:auto;border-radius:14px;border:1px solid var(--line);background:#000}}
.shot figcaption{{font-size:13px;color:var(--mut);margin-top:6px}}
.grid2{{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}}
.vids{{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(0,2.2fr);gap:12px;align-items:start}}
.vid{{margin:0;min-width:0}} .vid video{{display:block;width:100%;max-height:72vh;border-radius:14px;background:#000;border:1px solid var(--line)}}
.vid figcaption{{font-size:13px;color:var(--mut);margin-top:6px}}
ul.checks{{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr));gap:7px 18px}}
ul.checks li{{display:flex;gap:9px;align-items:baseline;font-size:14px}} ul.checks li span{{font-weight:800;width:16px;flex:none}}
li.ok span{{color:var(--ok)}} li.bad span{{color:var(--bad)}}
.quote{{margin:12px 0 0;color:var(--mut);font-size:14px;max-width:86ch;border-left:3px solid var(--ma);padding-left:12px}}
.tw{{overflow-x:auto}} table{{border-collapse:collapse;min-width:560px;width:100%;font-variant-numeric:tabular-nums;font-size:14px}}
th,td{{text-align:left;vertical-align:top;padding:9px 10px;border-bottom:1px solid var(--line)}} thead th{{color:var(--mut);font-weight:600;font-size:13px}} td small{{color:var(--mut);display:block;font-size:12.5px;margin-top:2px}}
table.score{{min-width:760px}} table.score td b{{font-size:18px;color:var(--acc)}} table.score th{{width:16%}}
ul.gaps{{margin:0;padding-left:20px;display:grid;gap:8px;max-width:90ch;color:var(--mut)}}
.eng{{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:12px}}
.card{{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:14px 16px}} .card b{{display:block;font-size:22px;color:var(--ok)}} .card.bad b{{color:var(--bad)}} .card p{{margin:4px 0 0;color:var(--mut);font-size:14px}}
.sizes{{display:grid;grid-template-columns:repeat(3,minmax(0,1fr)) minmax(0,2.2fr);gap:12px;align-items:start;margin-top:14px}}
.sizes .shot.wide{{grid-column:auto}}
code{{font-size:13px;background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:1px 6px;overflow-wrap:anywhere}}
.foot{{color:var(--mut);font-size:13px;margin-top:40px;max-width:90ch}}
@media (max-width:820px){{.vids{{grid-template-columns:1fr 1fr}}.vids .wide{{grid-column:1/-1}}.grid2{{grid-template-columns:1fr}}.sizes{{grid-template-columns:repeat(3,minmax(0,1fr))}}.sizes .shot.wide{{grid-column:1/-1}}}}
</style>
<div class="wrap">
<h1>Three Reflect rituals, ready for you to play</h1>
<p class="sub">Shadow Monsters and The Glorious Mess Auction are built from scratch to replace the two you rejected; Emotional Rollercoaster is pushed further. Each one below: the seven things you asked to see, phone and desktop screens, full walkthrough videos, a two-browser multiplayer run, and an honest score — including where they still fall short.</p>
<div class="cta"><a href="{E(PLAY)}">Play all three</a><a class="sec" href="#score">Jump to the honest score</a></div>
<div class="changes"><h3>Since your feedback</h3><ul>
<li><b>Group Think Glitch and Drama Dubbing Booth are gone.</b> Two new rituals with entirely different interactions: building shadows with a lamp, and drawing blind for a live auction.</li>
<li><b>The Bubbles now act.</b> A shared character rig (squash, stretch, faints, hops, tears, confetti), a wordless synthesised voice for each Bubble, and authored personalities in every scene. They are always labelled companions; nothing they do is AI-generated.</li>
<li><b>Nobody types.</b> Contributions are objects, drawings, a price, a paddle, a track. Reflection arrives as something you see your own hands did.</li>
<li><b>“Ritual” everywhere</b> in Reflect: Start ritual, Try another ritual, Ritual complete.</li>
</ul></div>
<nav>{''.join(nav)}<a href="#score">Score</a><a href="#eng">Engineering</a></nav>
{''.join(sections)}
{score_html}
<section id="eng"><header class="rh"><p class="eyebrow">Engineering checks</p><h2>Built to run anywhere</h2><p class="tag">One TypeScript codebase: the Framer component, this claude.ai artifact and a Cloudflare room server.</p></header>
<div class="eng">
<div class="card{' bad' if room_fail else ''}"><b>{room_ok} / {room_ok + room_fail}</b><p>room and ritual-rule tests pass: privacy until the reveal, rejoin, spectators, the auction clock, the pull window</p></div>
<div class="card{' bad' if size_bad else ''}"><b>{len(sizes) - len(size_bad)} / {len(sizes)}</b><p>layout checks pass (3 rituals × 360, 375, 390, 430 px phones and 1280, 1440 px desktops): no sideways scroll, nothing outside the screen, every primary control ≥ 44 px</p></div>
<div class="card{'' if framer_ok else ' bad'}"><b>{'Pass' if framer_ok else 'Check'}</b><p>Framer component: two instances on one page, each ritual inside it, unmount / remount, a static poster on the canvas</p></div>
</div>
<div class="sizes">{''.join(size_imgs)}</div>
<p class="foot">Framer: <code>games/framer/ThinkStillReflect.tsx</code> — paste into a Framer code file; set Room Server to enable inviting friends (solo play with Bubble companions works without it). Captures come from automated runs in a cloud sandbox (headless Chromium, synthesised audio not recorded). Real playtests with people are still needed to confirm the laughs and the relief.</p>
</section>
</div>
'''
open(os.path.join(OUT, 'index.html'), 'w').write(doc)
json.dump(FILES, open(os.path.join(OUT, 'files.json'), 'w'), indent=1)
total = sum(os.path.getsize(p) for p in FILES.values())
print(json.dumps({'files': len(FILES), 'mb': round(total / 1e6, 1), 'room': [room_ok, room_fail], 'sizes_bad': size_bad, 'framer_ok': framer_ok}))
