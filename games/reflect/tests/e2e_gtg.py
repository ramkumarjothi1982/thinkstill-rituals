"""Group Think Glitch end-to-end runs (Playwright).

  solo:  python3 e2e_gtg.py solo  <base-url> <out-dir> [phone|desktop]
  multi: python3 e2e_gtg.py multi <base-url> <out-dir>

solo   — one person + two labelled Bubble companions, in-page room (instant entry).
multi  — two separate browsers (phone + desktop contexts, separate storage) on the dev room server: host creates the
         room, the guest joins with the code, both investigate their own camera, seal privately, the host checks that
         the guest's verdict is NOT visible before the reveal, then both see the same reveal and finale.
Writes screenshots, videos (.webm) and metrics.json into <out-dir>.
"""
import json, os, sys, time
from playwright.sync_api import sync_playwright

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


def investigate(page, out, prefix, n_pins=2, shots=True):
    wait_for(page, "!!window.__gtgInv", 20000)
    page.wait_for_timeout(500)
    if shots:
        shot(page, out, prefix + "2-investigate-start")
    pinned = 0
    for i in range(4):
        tg = page.evaluate(f"window.__gtgInv.target({i})")
        if not tg:
            continue
        track = page.locator(".gtg-track").bounding_box()
        page.mouse.click(track["x"] + track["width"] * (tg["t"] / 9.0), track["y"] + track["height"] / 2)
        feed = page.locator(".gtg-feed").bounding_box()
        x, y = feed["x"] + feed["width"] * tg["fx"], feed["y"] + feed["height"] * tg["fy"]
        page.mouse.move(x - 40, y - 30)
        page.mouse.down()
        page.mouse.move(x - 15, y - 10, steps=4)
        page.mouse.move(x, y, steps=4)
        page.mouse.up()
        page.wait_for_timeout(250)
        ready = page.locator(".gtg-pinbtn.ready").count() > 0
        if shots and pinned == 0:
            shot(page, out, prefix + "3-evidence-found")
        if ready:
            page.locator(".gtg-pinbtn").click()
            page.wait_for_timeout(900)
            pinned += 1
            if shots and pinned == 1:
                shot(page, out, prefix + "4-pinned")
        if pinned >= n_pins:
            break
    return pinned


def build_case(page, out, prefix, suspect_index=0, shots=True):
    page.locator(".gtg-pinbtn.case").click()
    page.wait_for_timeout(700)
    page.locator(".gtg-tok").nth(suspect_index).click()
    page.wait_for_timeout(300)
    page.locator(".gtg-knob").click()
    page.wait_for_timeout(300)
    if shots:
        shot(page, out, prefix + "5-board")
    seal = page.locator(".gtg-seal").bounding_box()
    page.mouse.move(seal["x"] + seal["width"] / 2, seal["y"] + seal["height"] / 2)
    page.mouse.down()
    page.wait_for_timeout(950)
    page.mouse.up()


def reveal_and_finale(page, out, prefix, host=True, shots=True):
    wait_for(page, "window.__reflect.state.view && window.__reflect.state.view.phase === 'reveal'", 60000)
    t0 = time.time()
    marks = [(2.6, "6-reveal-mosaic"), (5.9, "7-reveal-verdicts"), (7.1, "8-reveal-shards"), (12.0, "9-reveal-ceiling"), (17.2, "10-reveal-board")]
    for at, name in marks:
        dt = at - (time.time() - t0)
        if dt > 0:
            page.wait_for_timeout(int(dt * 1000))
        if shots:
            shot(page, out, prefix + name)
    tags = page.locator(".gtg-tag")
    if tags.count():
        tags.nth(0).click()
        page.wait_for_timeout(600)
        if shots:
            shot(page, out, prefix + "11-surprise")
    if host:
        page.locator(".gtg-btn", has_text="Finale").click()
    wait_for(page, "true")
    t1 = time.time()
    fmarks = [(1.4, "12-finale-rewind"), (4.0, "13-finale-pose"), (5.1, "14-finale-flash"), (8.2, "15-finale-polaroids"), (10.6, "16-finale-card")]
    for at, name in fmarks:
        dt = at - (time.time() - t1)
        if dt > 0:
            page.wait_for_timeout(int(dt * 1000))
        if shots:
            shot(page, out, prefix + name)


def metrics(page):
    return page.evaluate("""() => { const r = window.__reflect; const m = r ? r.state : null; return { input: m ? m.metrics.input : [], frames: m ? m.metrics.frames : [], sound: m ? m.sound.samples : [], evt: window.__evt || [], ua: navigator.userAgent }; }""")


def solo(base, out, form="phone"):
    os.makedirs(out, exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
        opts = dict(PHONE if form == "phone" else DESK)
        opts["record_video_dir"] = out
        opts["record_video_size"] = opts["viewport"]
        ctx = b.new_context(**opts)
        ctx.add_init_script(EVENT_TIMING)
        page = ctx.new_page()
        errs = []
        page.on("pageerror", lambda e: errs.append(str(e)))
        page.on("console", lambda m: errs.append("console." + m.type + ": " + m.text) if m.type in ("error",) else None)
        page.goto(base + "/index.html")
        page.wait_for_timeout(1500)
        pre = form + "-"
        shot(page, out, pre + "0-hub")
        page.locator("[data-act=solo]").first.click()
        page.wait_for_timeout(1500)
        shot(page, out, pre + "1-hook")
        investigate(page, out, pre)
        build_case(page, out, pre)
        reveal_and_finale(page, out, pre, host=True)
        m = metrics(page)
        m["errors"] = errs
        json.dump(m, open(os.path.join(out, pre + "metrics.json"), "w"), indent=1)
        vid = page.video.path() if page.video else None
        ctx.close()
        b.close()
        if vid:
            os.replace(vid, os.path.join(out, pre + "solo.webm"))
        print(json.dumps({"errors": errs[:10], "input_n": len(m["input"]), "frames_n": len(m["frames"])}))


def multi(base, out):
    os.makedirs(out, exist_ok=True)
    with sync_playwright() as p:
        b1 = p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
        b2 = p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
        c1 = b1.new_context(**dict(PHONE, record_video_dir=out, record_video_size=PHONE["viewport"]))
        c2 = b2.new_context(**dict(DESK, record_video_dir=out, record_video_size=DESK["viewport"]))
        for c in (c1, c2):
            c.add_init_script(EVENT_TIMING)
        host, guest = c1.new_page(), c2.new_page()
        log = {"errors": [], "checks": {}}
        for pg, who in ((host, "host"), (guest, "guest")):
            pg.on("pageerror", lambda e, who=who: log["errors"].append(who + ": " + str(e)))
        host.goto(base + "/index.html")
        host.wait_for_timeout(1200)
        host.locator("[data-act=invite]").first.click()
        wait_for(host, "!!window.__reflect && !!window.__reflect.state.code && !!window.__reflect.state.view")
        code = host.evaluate("window.__reflect.state.code")
        log["room"] = code
        shot(host, out, "host-0-lobby")
        guest.goto(base + "/index.html?reflectRoom=" + code)
        wait_for(guest, "!!window.__reflect && !!window.__reflect.state.view && window.__reflect.state.view.players.length >= 2")
        host.wait_for_timeout(600)
        shot(host, out, "host-1-lobby-with-guest")
        shot(guest, out, "guest-1-lobby")
        log["checks"]["guest_sees_host"] = guest.evaluate("window.__reflect.state.view.players.map(p => p.name + (p.human ? '' : ' (companion)'))")
        # one labelled companion fills the third seat
        for pg, nm in ((host, "Asha"), (guest, "Ben")):
            inp = pg.locator(".rf-me input")
            inp.fill(nm)
            inp.press("Enter")
            inp.blur()
        host.wait_for_timeout(500)
        log["checks"]["names"] = host.evaluate("window.__reflect.state.view.players.map(p => p.name)")
        host.locator(".rf-btn", has_text="Bubble companion").click()
        host.wait_for_timeout(400)
        host.locator("[data-act=start]").click()
        wait_for(host, "window.__reflect.state.view.phase === 'play'")
        wait_for(guest, "window.__reflect.state.view.phase === 'play'")
        cams = host.evaluate("window.__reflect.state.view.pub.cams")
        log["cams"] = cams
        # both investigate; the guest seals first
        investigate(guest, out, "guest-", n_pins=2, shots=True)
        build_case(guest, out, "guest-", suspect_index=1, shots=True)
        wait_for(guest, "(() => { const v = window.__reflect.state.view; return v.sealed[v.you]; })()")
        # privacy: the host's view must not contain the guest's sealed payload before the reveal
        hv = host.evaluate("JSON.stringify(window.__reflect.state.view)")
        gpid = guest.evaluate("window.__reflect.state.pid")
        gv = guest.evaluate("window.__reflect.state.view")
        log["checks"]["guest_sealed_visible_to_host_as_flag_only"] = (('"' + gpid + '":true') in hv) and (hv.find('"revealed":null') >= 0)
        log["checks"]["host_view_has_no_guest_payload"] = json.dumps(gv.get("mine")) not in hv if gv.get("mine") else None
        log["checks"]["guest_has_own_payload"] = bool(gv.get("mine"))
        shot(host, out, "host-2-while-guest-sealed")
        investigate(host, out, "host-", n_pins=2, shots=True)
        build_case(host, out, "host-", suspect_index=0, shots=True)
        wait_for(host, "window.__reflect.state.view.phase === 'reveal'", 30000)
        wait_for(guest, "window.__reflect.state.view.phase === 'reveal'", 30000)
        rv = host.evaluate("window.__reflect.state.view.revealed")
        log["checks"]["revealed_count"] = len(rv or {})
        log["checks"]["both_see_same_reveal"] = host.evaluate("JSON.stringify(window.__reflect.state.view.revealed)") == guest.evaluate("JSON.stringify(window.__reflect.state.view.revealed)")
        # surprise tag from the guest reaches the host
        guest.wait_for_timeout(17500)
        guest.locator(".gtg-tag").nth(4).click()
        host.wait_for_timeout(800)
        log["checks"]["live_event_reached_host"] = host.evaluate("window.__reflect.state.view.live.length") > 0
        shot(host, out, "host-3-reveal-board")
        shot(guest, out, "guest-3-reveal-board")
        host.locator(".gtg-btn", has_text="Finale").click()
        wait_for(guest, "window.__reflect.state.view.phase === 'finale'")
        host.wait_for_timeout(10800)
        # consent: guest ticks the box; host sees it
        guest.locator(".gtg-consent input").check()
        host.wait_for_timeout(600)
        log["checks"]["consent_synced"] = host.evaluate("(() => { const v = window.__reflect.state.view; return Object.values(v.consent).some(Boolean); })()")
        shot(host, out, "host-4-finale-card")
        shot(guest, out, "guest-4-finale-card")
        # rejoin: the guest reloads and gets the same seat back
        guest.reload()
        wait_for(guest, "!!window.__reflect && !!window.__reflect.state.view")
        log["checks"]["rejoin_same_pid"] = guest.evaluate("window.__reflect.state.pid") == gpid
        log["metrics"] = {"host": metrics(host), "guest": metrics(guest)}
        vids = [(host.video.path() if host.video else None, "multi-host-phone.webm"), (guest.video.path() if guest.video else None, "multi-guest-desktop.webm")]
        c1.close(); c2.close(); b1.close(); b2.close()
        for src, name in vids:
            if src:
                os.replace(src, os.path.join(out, name))
        json.dump(log, open(os.path.join(out, "multi-log.json"), "w"), indent=1)
        print(json.dumps({k: v for k, v in log.items() if k != "metrics"}, indent=1))


if __name__ == "__main__":
    mode, base, out = sys.argv[1], sys.argv[2].rstrip("/"), sys.argv[3]
    if mode == "solo":
        solo(base, out, sys.argv[4] if len(sys.argv) > 4 else "phone")
    else:
        multi(base, out)
