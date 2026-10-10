"""Shared Playwright helpers for the Reflect end-to-end runs."""
import os

PHONE = dict(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
DESK = dict(viewport={"width": 1280, "height": 860}, device_scale_factor=1)
EVENT_TIMING = """
window.__evt = [];
try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (['pointerdown','pointerup','click','keydown'].includes(e.name)) window.__evt.push({name: e.name, dur: e.duration, delay: e.processingStart - e.startTime}); }).observe({type: 'event', durationThreshold: 16, buffered: true}); } catch (e) {}
"""


def shot(page, out, name):
    p = os.path.join(out, name + ".png")
    page.screenshot(path=p)
    return p


def wait_for(page, js, timeout=15000):
    page.wait_for_function(js, timeout=timeout)


def metrics(page):
    return page.evaluate("""() => { const r = window.__reflect; const m = r ? r.state : null; return { input: m ? m.metrics.input : [], frames: m ? m.metrics.frames : [], sound: m ? m.sound.samples : [], evt: window.__evt || [], ua: navigator.userAgent }; }""")


def errors_to(page, log, who):
    page.on("pageerror", lambda e: log.append(who + ": " + str(e)[:300]))
    page.on("console", lambda m: log.append(who + " console: " + m.text[:300]) if m.type == "error" and "ERR_TUNNEL" not in m.text and "fonts.g" not in m.text else None)
