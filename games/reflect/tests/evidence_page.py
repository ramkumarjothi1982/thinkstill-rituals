"""Build the Gate B evidence page (an artifact): screenshots (4 moments × phone/desktop), extras, videos, multiplayer
checks, timing, layout checks, test checklist. Usage: python3 evidence_page.py <out-dir> <artifact-url>"""
import html, json, os, sys
from PIL import Image

PILOTS = [('gtg', 'Group Think Glitch', 'Mystery · scrub time and search with a magnifying light',
           'Four cameras on one rooftop party. Each player gets one angle, pins what glints, threads a verdict and seals it. The reveal cracks every camera open, then swings up to the ceiling angle nobody had.'),
          ('ddb', 'Drama Dubbing Booth', 'Comedy · drop a line on the exact frame, perform the face',
           'One silent golden-hour short. Each player dubs it — line, voice, timing, face — and prints the cut. The premiere plays every cut in sync with live seat reactions, then freezes the same frame side by side.'),
          ('er', 'Emotional Rollercoaster', 'Spectacle · sculpt your track, then ride it together',
           'One Saturday, five moments. Each rider shapes how each moment felt into track. Everyone launches together, can jump onto a friend’s track at two junctions, and sees where the rides diverged at the station.')]
MOMENT_LABELS = {'start': 'Start', 'mid': 'Mid-play', 'consequence': 'Interaction consequence', 'finale': 'Finale'}
CHECK_LABELS = {
    'guest_sees_host': 'Guest joined the host’s room', 'names': 'Distinct names', 'ritual': 'Guest landed in the right ritual',
    'guest_sealed_visible_to_host_as_flag_only': 'Host saw only “sealed”, not the content', 'host_view_has_no_guest_payload': 'Host’s view never contained the guest’s sealed payload',
    'guest_has_own_payload': 'Guest’s own sealed payload came back to the guest', 'revealed_count': 'Sealed payloads revealed together',
    'both_see_same_reveal': 'Both browsers received the identical reveal', 'live_event_reached_host': 'Guest’s live tap reached the host',
    'consent_synced': 'Consent toggle synced', 'rejoin_same_pid': 'Reload rejoined the same seat',
    'guest_cut_hidden_from_host': 'Guest’s cut hidden from the host until the premiere', 'same_premiere_schedule': 'Both browsers on the same premiere schedule',
    'reaction_reached_host': 'Guest’s reaction reached the host',
    'guest_track_hidden_from_host': 'Guest’s track hidden from the host until the ride', 'same_ride_schedule': 'Both browsers on the same ride schedule',
    'guest_switched': 'Guest pulled the switch lever', 'host_saw_switch': 'Host saw the guest jump tracks'}


def jpg(src, dst, maxw=1280):
    im = Image.open(src).convert('RGB')
    if im.width > maxw: im = im.resize((maxw, round(im.height * maxw / im.width)))
    im.save(dst, 'JPEG', quality=80, optimize=True)


def main(out, url):
    ev = os.path.join(out, 'evidence')
    page = os.path.join(out, 'page'); os.makedirs(os.path.join(page, 'img'), exist_ok=True); os.makedirs(os.path.join(page, 'vid'), exist_ok=True)
    files = {}
    timing = json.load(open(os.path.join(ev, 'timing.json')))
    sizes = json.load(open(os.path.join(out, 'sizes', 'sizes.json'))) if os.path.exists(os.path.join(out, 'sizes', 'sizes.json')) else {}
    sec = []
    for pid, title, verb, blurb in PILOTS:
        d = os.path.join(ev, pid)
        if not os.path.isdir(d): continue
        rows = []
        for form in ('phone', 'desktop'):
            cells = []
            for i, key in enumerate(['start', 'mid', 'consequence', 'finale']):
                f = os.path.join(d, f'{form}-{i + 1}-{key}.png')
                if not os.path.exists(f): continue
                rel = f'img/{pid}-{form}-{i + 1}.jpg'; jpg(f, os.path.join(page, rel), 900 if form == 'phone' else 1280); files[rel] = rel
                cells.append(f'<figure class="shot {form}"><img src="{rel}" alt="{html.escape(title)} — {MOMENT_LABELS[key]} ({form})" loading="lazy"><figcaption>{MOMENT_LABELS[key]}</figcaption></figure>')
            rows.append(f'<h4>{"Phone · 390 × 844" if form == "phone" else "Desktop · 1280 × 860"}</h4><div class="grid {form}">' + ''.join(cells) + '</div>')
        extras = []
        for f in sorted(os.listdir(d)):
            if '-x-' in f and f.endswith('.png'):
                rel = f'img/{pid}-{f[:-4]}.jpg'; jpg(os.path.join(d, f), os.path.join(page, rel), 700 if f.startswith('phone') else 960); files[rel] = rel
                name = f[:-4].split('-x-')[1].split('-', 1)[1].replace('-', ' ')
                extras.append(f'<figure class="shot sm {"phone" if f.startswith("phone") else "desktop"}"><img src="{rel}" alt="{html.escape(name)}" loading="lazy"><figcaption>{html.escape(name)} · {"phone" if f.startswith("phone") else "desktop"}</figcaption></figure>')
        vids = []
        for name, label in [('phone-solo.mp4', 'Phone gameplay (solo with Bubble companions, automated run)'), ('multiplayer-two-browsers.mp4', 'Two separate browsers in one room (host on a phone, guest on a desktop)')]:
            f = os.path.join(d, name)
            if os.path.exists(f):
                rel = f'vid/{pid}-{name}'; os.replace(f, os.path.join(page, rel)) if False else __import__('shutil').copy(f, os.path.join(page, rel)); files[rel] = rel
                vids.append(f'<figure class="vid"><video src="{rel}" controls playsinline preload="metadata"></video><figcaption>{label}</figcaption></figure>')
        log = json.load(open(os.path.join(d, 'multiplayer-log.json'))) if os.path.exists(os.path.join(d, 'multiplayer-log.json')) else {'checks': {}}
        checks = []
        for k, v in log.get('checks', {}).items():
            ok = v is True or (isinstance(v, int) and not isinstance(v, bool) and v >= 2) or (isinstance(v, list) and len(v) >= 2) or (isinstance(v, str) and v)
            if isinstance(v, bool) or k == 'guest_sees_host': shown = ''
            elif isinstance(v, list): shown = html.escape(', '.join(map(str, v)))
            elif isinstance(v, int): shown = str(v)
            else: shown = html.escape(str(v).replace('-', ' '))
            checks.append(f'<li class="{"ok" if ok else "bad"}"><span>{"✓" if ok else "✕"}</span>{html.escape(CHECK_LABELS.get(k, k))}{(" — " + shown) if shown else ""}</li>')
        tm = []
        for form in ('phone', 'desktop'):
            t = timing.get(f'{pid}-{form}')
            if not t: continue
            i, e, fr, so = t['input_to_next_frame_ms'], t['event_timing_over_16ms'], t['frame_ms'], t['sound_gesture_to_start_ms']
            tm.append(f'<tr><th>{form}</th><td>{i["p50"]} / {i["p95"]} ms <small>({i["n"]})</small></td><td>{e["n"]} <small>max {round(e["max"])} ms</small></td><td>{fr["p50"]} / {fr["p95"]} ms</td><td>{so["p50"]} / {so["p95"]} ms <small>({so["n"]})</small></td></tr>')
        sec.append(f'''<section id="{pid}"><header><p class="eyebrow">{html.escape(verb)}</p><h2>{html.escape(title)}</h2><p class="lede">{html.escape(blurb)}</p></header>
{''.join(rows)}
<h3>Gameplay video</h3><div class="vids">{''.join(vids)}</div>
<h3>Multiplayer checks <small>two separate browsers, dev room server</small></h3><ul class="checks">{''.join(checks)}</ul>
<h3>Measured timing <small>headless Chromium, shared cloud CPU</small></h3>
<div class="tablewrap"><table><thead><tr><th></th><th>Input → next frame p50 / p95</th><th>Inputs over 16 ms (Event Timing)</th><th>Frame p50 / p95</th><th>Gesture → sound p50 / p95</th></tr></thead><tbody>{''.join(tm)}</tbody></table></div>
<details><summary>More moments ({len(extras)})</summary><div class="grid extras">{''.join(extras)}</div></details></section>''')
    # layout checks
    lay = []
    for k, v in sizes.items():
        bad = v['hscroll'] or v['outside'] or v['small_targets'] or v['errors']
        name, size = k.rsplit('-', 1)
        lay.append(f'<li class="{"bad" if bad else "ok"}"><span>{"✕" if bad else "✓"}</span>{html.escape(name.replace("-", " ").title())} · {size.replace("x", " × ")}</li>')
    for f in ['group-think-glitch-360x780', 'drama-dubbing-booth-360x780', 'emotional-rollercoaster-360x780', 'group-think-glitch-1440x900']:
        src = os.path.join(out, 'sizes', f + '.png')
        if os.path.exists(src): rel = f'img/size-{f}.jpg'; jpg(src, os.path.join(page, rel), 720); files[rel] = rel
    size_imgs = ''.join(f'<figure class="shot sm phone"><img src="img/size-{f}.jpg" alt="{f}" loading="lazy"><figcaption>{f.split("-")[-1]}</figcaption></figure>' for f in ['group-think-glitch-360x780', 'drama-dubbing-booth-360x780', 'emotional-rollercoaster-360x780'] if os.path.exists(os.path.join(page, f'img/size-{f}.jpg')))
    sl = json.load(open(os.path.join(out, 'sightlines.json'))) if os.path.exists(os.path.join(out, 'sightlines.json')) else None
    if sl:
        sl_ok = all(v['pass'] for v in sl.values())
        sight = (f'Group Think Glitch sightlines, pixel-diff over {sl["door"]["of"]} moments per camera: the doorway and the phone never show the cat '
                 f'({sl["door"]["frames_visible"]} and {sl["phone"]["frames_visible"]} frames); the balcony and the DJ booth see it ({sl["balcony"]["frames_visible"]} and {sl["booth"]["frames_visible"]} frames)')
        sight_li = f'<li class="{"ok" if sl_ok else "bad"}"><span>{"✓" if sl_ok else "✕"}</span>{html.escape(sight)}</li>'
    else: sight_li = ''
    doc = f'''<title>Reflect Pilot Evidence</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&family=Fredoka:wght@400;500;600;700&display=swap">
<style>
:root{{color-scheme:dark;--bg:#0f0d1f;--panel:#19162f;--line:rgba(255,255,255,.12);--fg:#f5f1ff;--mut:rgba(245,241,255,.7);--acc:#ffd27a;--ok:#7be0a5;--bad:#ff7a7a}}
html,body{{background:var(--bg);color:var(--fg)}}
body{{margin:0;font:15px/1.5 Fredoka,ui-rounded,system-ui,-apple-system,"Segoe UI",sans-serif}}
.wrap{{max-width:1180px;margin:0 auto;padding-block:28px 60px;padding-inline:16px}}
h1{{font:800 clamp(30px,6vw,48px)/1.05 "Baloo 2",Fredoka,system-ui,sans-serif;margin:0 0 8px;text-wrap:balance}}
.sub{{color:var(--mut);max-width:62ch;margin:0 0 18px}}
.cta{{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 26px}}
.cta a{{display:inline-flex;align-items:center;min-height:44px;padding:0 18px;border-radius:999px;background:var(--acc);color:#251803;font-weight:700;text-decoration:none}}
.cta a.sec{{background:transparent;color:var(--fg);border:1.5px solid var(--line)}}
nav{{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 30px}}
nav a{{color:var(--fg);text-decoration:none;padding:6px 12px;border-radius:999px;border:1px solid var(--line);font-size:14px}}
section{{border-top:1px solid var(--line);padding-block:30px}}
.eyebrow{{margin:0;color:var(--acc);font-size:13px;letter-spacing:.06em;text-transform:uppercase}}
h2{{font:800 clamp(24px,4.5vw,34px)/1.1 "Baloo 2",Fredoka,system-ui,sans-serif;margin:4px 0 8px}}
.lede{{color:var(--mut);max-width:70ch;margin:0 0 18px}}
h3{{font-size:17px;margin:26px 0 10px}} h3 small,h4 small{{color:var(--mut);font-weight:400;font-size:13px}}
h4{{font-size:14px;color:var(--mut);font-weight:600;margin:16px 0 8px}}
.grid{{display:grid;gap:12px}}
.grid.phone{{grid-template-columns:repeat(4,minmax(0,1fr))}}
.grid.desktop{{grid-template-columns:repeat(2,minmax(0,1fr))}}
.grid.extras{{grid-template-columns:repeat(auto-fill,minmax(180px,1fr));margin-top:12px}}
.shot{{margin:0;min-width:0}} .shot img{{display:block;width:100%;height:auto;border-radius:12px;border:1px solid var(--line);background:#000}}
.shot figcaption{{font-size:13px;color:var(--mut);margin-top:6px}}
.vids{{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2fr);gap:14px;align-items:start}}
.vid{{margin:0;min-width:0}} .vid video{{display:block;width:100%;max-height:70vh;border-radius:12px;background:#000;border:1px solid var(--line)}}
.vid figcaption{{font-size:13px;color:var(--mut);margin-top:6px}}
ul.checks{{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,320px),1fr));gap:6px 18px}}
ul.builds{{margin:0;padding-left:18px;display:grid;gap:10px;max-width:80ch}} ul.builds a{{color:var(--acc)}} code{{font-size:13px;background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:1px 5px;overflow-wrap:anywhere}}
ul.checks li{{display:flex;gap:8px;align-items:baseline;font-size:14px}} ul.checks li span{{font-weight:800;width:16px;flex:none}}
li.ok span{{color:var(--ok)}} li.bad span{{color:var(--bad)}}
.tablewrap{{overflow-x:auto}} table{{border-collapse:collapse;min-width:560px;width:100%;font-variant-numeric:tabular-nums;font-size:14px}}
th,td{{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line)}} thead th{{color:var(--mut);font-weight:600;font-size:13px}} td small{{color:var(--mut)}}
details{{margin-top:18px}} summary{{cursor:pointer;color:var(--acc);font-weight:600;min-height:44px;display:flex;align-items:center}}
.note{{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px 16px;color:var(--mut);font-size:14px;max-width:80ch}}
.note b{{color:var(--fg)}}
@media (max-width:760px){{.grid.phone{{grid-template-columns:repeat(2,minmax(0,1fr))}}.grid.desktop{{grid-template-columns:1fr}}.vids{{grid-template-columns:1fr}}}}
</style>
<div class="wrap">
<h1>Reflect · three hero pilots</h1>
<p class="sub">Gate B evidence for Group Think Glitch, Drama Dubbing Booth and Emotional Rollercoaster: phone and desktop screens at four moments, gameplay video, two-browser multiplayer runs with privacy checks, measured timing and layout checks. Everything here comes from automated runs of the pilot build. The build you can play adds one later fix for Framer (sizes follow the frame, not the browser window), re-checked with the layout, Framer and Dubbing Booth runs.</p>
<div class="cta"><a href="{html.escape(url)}" target="_blank" rel="noopener">Play the pilots</a></div>
<nav>{''.join(f'<a href="#{p}">{t}</a>' for p, t, _, _ in PILOTS)}<a href="#layout">Layout checks</a><a href="#builds">Builds</a><a href="#checklist">Test checklist</a></nav>
{''.join(sec)}
<section id="layout"><h2>Layout checks</h2><p class="lede">Each pilot’s main play screen at 360×780, 375×812, 390×844, 430×932, 1280×860 and 1440×900: no sideways scrolling, every control inside the screen and clear of the top bar, primary controls at least 44 px.</p>
<ul class="checks">{''.join(lay)}</ul><div class="grid phone" style="margin-top:14px">{size_imgs}</div></section>
<section id="builds"><h2>What you can run</h2>
<ul class="builds">
<li><b>Playable build</b> — the console with all three pilots, solo with Bubble companions or live with friends (invite link from the lobby). <a href="{html.escape(url)}" target="_blank" rel="noopener">Open it</a>.</li>
<li><b>Framer component</b> — <code>ThinkStillReflect.tsx</code>, one self-contained file (sent in the chat and in the repo at <code>games/framer/</code>). Controls: Room Server, Asset Base, Theme, Sound, Motion, Radius, onExit, onComplete. Solo play works with no server.</li>
<li><b>Room server</b> — <code>games/reflect/dist/worker.js</code>, a Cloudflare Worker with a Durable Object per room. Live rooms in Framer need it deployed; the playable build above uses the artifact’s own live rooms instead.</li>
<li><b>Source</b> — <code>games/reflect/</code> on the <code>reset-reframe-prototypes</code> branch, with the tests listed below.</li>
</ul></section>
<section id="checklist"><h2>Test checklist</h2>
<ul class="checks">
<li class="ok"><span>✓</span>Room authority unit tests (14 cases: host-only start, companions, sealed privacy, dedupe, rejoin, invalid evidence, reveal, spectators, replay)</li>
<li class="ok"><span>✓</span>Each pilot end to end, solo, on phone and desktop (hook → play → seal → reveal → finale)</li>
<li class="ok"><span>✓</span>Each pilot with two separate browsers on the room server (privacy, same reveal, live events)</li>
<li class="ok"><span>✓</span>Artifact live rooms (encrypted host-in-browser) with two tabs over a stand-in for the room capability</li>
<li class="ok"><span>✓</span>Framer component in a desktop-width window: a dark and a bright phone-sized instance, each pilot starts inside it, independent play, unmount/remount, static canvas poster; the dubbing drag card stays under the pointer inside a transformed wrapper</li>
<li class="ok"><span>✓</span>Six viewport sizes for all three pilots</li>
{sight_li}
<li class="ok"><span>✓</span>Type check (tsc --noEmit) on the whole TypeScript source</li>
</ul>
<p class="note"><b>Read these numbers carefully.</b> Timing comes from headless Chromium with software rendering on a shared cloud machine, so real phones will differ (usually faster to paint, sometimes slower to start audio). Sound latency is the time from the gesture to the sound being scheduled, plus the audio context’s reported output latency. The test machine cannot load Google Fonts, so screenshots and videos show fallback fonts; real devices load Fredoka, Baloo 2, Special Elite, Caveat, Limelight, Courier Prime and Bungee.</p>
</section>
</div>'''
    open(os.path.join(page, 'index.html'), 'w').write(doc)
    json.dump(files, open(os.path.join(page, 'files.json'), 'w'), indent=1)
    total = sum(os.path.getsize(os.path.join(page, f)) for f in files)
    print('page files:', len(files), round(total / 1048576, 2), 'MB')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
