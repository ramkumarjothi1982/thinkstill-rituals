"""Automated playthrough of Case File.

Runs either a curated sample case (instant analysis) or a typed case answered by a mock AI
with a delay (exercises the forensics/dusting wait). Captures screenshots, console errors and
frame-rate samples.

Usage: python3 games/tests/play_casefile.py [--size 390x844] [--theme dark|bright] [--mode sample|ai]
"""
import argparse, json, os, subprocess, sys, time, socket
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

def free_port():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p

MOCK_AI = r"""
window.ThinkStillHost = { reason: (prompt) => new Promise(res => setTimeout(() => res(JSON.stringify({
  safety: 'ok',
  case_title: 'The Case of the Fridge Note',
  conclusion: 'Your flatmate wants you out.',
  exhibits: [
    { id: 'e1', kind: 'camera', text: 'Your flatmate left a note on the fridge.', why: 'The note exists. Anyone could see it.' },
    { id: 'e2', kind: 'camera', text: 'It said: “Some of us like a clean kitchen.”', why: 'Those are the exact words on the note.' },
    { id: 'e3', kind: 'brain', text: 'The note was passive-aggressive.', why: 'A camera records the words. The tone you hear in them is a reading.' },
    { id: 'e4', kind: 'brain', text: 'He’s been cold for days.', why: '“Cold” is a judgement about mood. A camera would see fewer chats, not coldness.' },
    { id: 'e5', kind: 'brain', text: 'He hates living with you and wants you to move out.', why: 'Mind-reading plus a prediction. Nothing on record says this.' }
  ],
  witness_id: 'e5',
  unknowns: [
    { id: 'u1', text: 'What set off the note today?', about: 'e2' },
    { id: 'u2', text: 'Has he said anything directly about the kitchen?', about: 'e1' },
    { id: 'u3', text: 'What else is going on for him this week?', about: 'e4' }
  ],
  suspects: [
    { id: 's1', name: 'THE DISHES', theory: 'He’s annoyed about the kitchen specifically, not about you as a flatmate.', fits: ['e1','e2'], needs: 'A messy few days in the kitchen.', plausibility: 'common', fear: false, line: 'I’m about plates. Just plates.' },
    { id: 's2', name: 'THE AWKWARD ASK', theory: 'He hates confrontation, so a note felt easier than a chat.', fits: ['e1','e2'], needs: 'Him avoiding face-to-face friction.', plausibility: 'common', fear: false, line: 'Talking is scary. Fridges don’t answer back.' },
    { id: 's3', name: 'THE BAD WEEK', theory: 'He’s stressed about something else and the kitchen tipped him over.', fits: ['e1','e2'], needs: 'Pressure from work, money or family.', plausibility: 'possible', fear: false, line: 'I brought my stress home and stuck it on the fridge.' },
    { id: 's4', name: 'THE EVICTION', theory: 'He wants you to move out.', fits: ['e1','e2'], needs: 'A bigger problem with you he hasn’t mentioned.', plausibility: 'long shot', fear: true, line: 'I’d need a lot more than one note to be true.' }
  ],
  fear_support: 'weak',
  support_reason: 'A note about the kitchen is about the kitchen. Nothing on record mentions moving out.',
  leads: [
    { kind: 'ask', text: 'Ask him: “Saw the note. Want to sort out a kitchen system?”', for: 'u2' },
    { kind: 'prepare', text: 'Suggest one simple cleaning rota you could both live with.', for: 'u1' },
    { kind: 'steady', text: 'Do your own dishes tonight, then do something nice for yourself.', for: '' }
  ],
  glitch: { closed: 'Elementary. He wants you out. I barely glanced at the fridge.', witness: 'My star witness was a fridge magnet with feelings?', unknowns: 'I may have solved this without, technically, any questions.', lineup: 'Four suspects, one note. Every one of them fits.', reopened: 'Reopened. I’ll be at the fridge, reflecting.', supported: 'Fair enough. This one deserves a proper plan.' }
})), 6000)) };
"""

CUSTOM = "My flatmate left a passive-aggressive note on the fridge saying 'some of us like a clean kitchen'. He's been cold for days. He hates living with me and wants me to move out."

FPS = r"""
(ms) => new Promise(res => {
  const times = []; let start = performance.now(), last = start;
  function f(now){ times.push(now - last); last = now; if (now - start < ms) requestAnimationFrame(f); else {
    times.shift(); const sorted = times.slice().sort((a,b)=>a-b); const avg = times.reduce((a,b)=>a+b,0)/times.length;
    res({ fps: +(1000/avg).toFixed(1), p95Ms: +sorted[Math.floor(sorted.length*0.95)].toFixed(1), worstMs: +sorted[sorted.length-1].toFixed(1) });
  }}
  requestAnimationFrame(f);
})
"""

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=os.path.join(ROOT, 'games', 'tests', 'out', 'casefile'))
    ap.add_argument('--size', default='390x844')
    ap.add_argument('--theme', default='dark')
    ap.add_argument('--mode', default='sample')
    ap.add_argument('--video', action='store_true')
    ap.add_argument('--path', default='games/case-file/index.html', help='page to load, relative to the repo root')
    ap.add_argument('--tag', default='')
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    w, h = map(int, a.size.split('x'))
    port = free_port()
    server = subprocess.Popen([sys.executable, '-m', 'http.server', str(port), '--bind', '127.0.0.1'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    url = f'http://127.0.0.1:{port}/{a.path}?theme={a.theme}'
    tag = f'{a.size}-{a.theme}-{a.mode}{a.tag}'
    report = {'tag': tag, 'console': [], 'fps': {}}
    try:
        with sync_playwright() as p:
            b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
            ctx_args = dict(viewport={'width': w, 'height': h}, device_scale_factor=2 if w < 700 else 1, has_touch=w < 700, is_mobile=w < 700)
            if a.video: ctx_args['record_video_dir'] = a.out; ctx_args['record_video_size'] = {'width': w, 'height': h}
            ctx = b.new_context(**ctx_args)
            page = ctx.new_page()
            if a.mode == 'ai': page.add_init_script(MOCK_AI)
            page.on('console', lambda m: report['console'].append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
            page.on('pageerror', lambda e: report['console'].append(f'pageerror: {e}'))
            def shot(name): page.screenshot(path=os.path.join(a.out, f'{tag}-{name}.png'))
            t0 = time.time()
            page.goto(url); page.wait_for_load_state('networkidle'); page.wait_for_timeout(1500)
            shot('01-intake')
            report['fps']['intake'] = page.evaluate(FPS, 3000)
            if a.mode == 'sample':
                page.click('#samples .ts-chip >> nth=0')
            else:
                page.fill('#caseText', CUSTOM)
            page.click('#openCase'); page.wait_for_timeout(1800); shot('02-closed')
            page.evaluate("() => { const s = document.getElementById('certainty'); s.value = '85'; s.dispatchEvent(new Event('input', {bubbles:true})); }")
            page.click('#toEvidence'); page.wait_for_timeout(1200)
            if a.mode == 'ai':
                shot('03-dust')
                box = page.locator('#dustCard').bounding_box()
                page.mouse.move(box['x'] + 20, box['y'] + 40); page.mouse.down()
                for i in range(40):
                    page.mouse.move(box['x'] + 20 + (i * 9) % (box['width'] - 40), box['y'] + 40 + (i * 7) % (box['height'] - 60), steps=2)
                page.mouse.up(); page.wait_for_timeout(500); shot('04-dusted')
            page.wait_for_function("window.__casefile.stage.current === window.__casefile.sc.desk", timeout=40000)
            page.wait_for_timeout(1200); shot('05-desk')
            n = page.evaluate("window.__casefile.S.analysis.exhibits.length")
            kinds = page.evaluate("window.__casefile.S.analysis.exhibits.map(e => e.kind)")
            for i, k in enumerate(kinds):
                if i == 1:
                    # deliberately disagree once to show the forensics note
                    wrong = '#trayBrain' if k == 'camera' else '#trayCam'
                    page.click(wrong); page.wait_for_timeout(700); shot('06-note')
                    page.click('.note .ts-btn:not(.ts-btn-quiet)'); page.wait_for_timeout(900)
                    continue
                page.click('#trayCam' if k == 'camera' else '#trayBrain')
                page.wait_for_timeout(2600 if i == n - 1 else 800)
                if i == n - 1: shot('07-witness')
            page.wait_for_function("window.__casefile.stage.current === window.__casefile.sc.board", timeout=15000)
            page.wait_for_timeout(1200); shot('08-board')
            blanks = page.locator('.blank')
            for i in range(blanks.count()):
                blanks.nth(i).click(); page.wait_for_timeout(500)
            page.wait_for_timeout(900); shot('09-board-flipped')
            blanks.nth(0).click(); page.wait_for_timeout(900); shot('10-board-picked')
            page.click('#toLineup'); page.wait_for_timeout(1400); shot('11-lineup')
            report['fps']['lineup'] = page.evaluate(FPS, 3000)
            count = page.evaluate("window.__casefile.S.analysis.suspects.length")
            plan = [4, 3, 1, 2] if count == 4 else ([5, 3, 2] if count == 3 else [6, 4])
            for si in range(count):
                for _ in range(plan[si]):
                    page.locator('.chiprow').nth(si).locator('button').nth(1).click()
            page.locator('.suspect').nth(count - 1).click(); page.wait_for_timeout(600); shot('12-lineup-chips')
            page.click('#lockIn'); page.wait_for_timeout(2600); shot('13-verdict')
            page.locator('.lead').nth(0).click(); page.wait_for_timeout(600); shot('14-verdict-lead')
            report['fps']['verdict'] = page.evaluate(FPS, 2000)
            page.click('#fileIt'); page.wait_for_timeout(500)
            page.click('#newCase'); page.wait_for_timeout(1200)
            page.click('#archiveBtn'); page.wait_for_timeout(600); shot('15-archive')
            report['events'] = page.evaluate("() => JSON.parse(localStorage.getItem('thinkstill:events') || '[]').map(e => e.name + (e.verdict ? ':' + e.verdict : ''))")
            report['result'] = page.evaluate("() => { const S = window.__casefile.S; return { before: S.certainty, after: S.after, verdict: S.verdict, twist: S.witnessTwist, disagree: S.disagree, source: S.source }; }")
            report['overflowX'] = page.evaluate("() => document.documentElement.scrollWidth > window.innerWidth")
            report['seconds'] = round(time.time() - t0, 1)
            ctx.close(); b.close()
    finally:
        server.terminate()
    with open(os.path.join(a.out, f'report-{tag}.json'), 'w') as f: json.dump(report, f, indent=2)
    print(json.dumps(report, indent=1))

if __name__ == '__main__':
    main()
