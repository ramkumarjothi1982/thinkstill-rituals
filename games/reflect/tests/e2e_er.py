"""Emotional Rollercoaster end-to-end runs (Playwright).
  solo:  python3 e2e_er.py solo  <base-url> <out-dir> [phone|desktop]
  multi: python3 e2e_er.py multi <base-url> <out-dir>
"""
import json, os, sys, time
from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from e2e_common import PHONE, DESK, EVENT_TIMING, shot, wait_for, metrics

PLAN = [(-0.6, 'drop'), (-0.35, 'tunnel'), (0.75, 'loop'), (-0.5, 'cork'), (0.6, 'smooth')]


def build(page, out, pre, plan=PLAN, shots=True, test_ride=True):
    wait_for(page, "!!window.__erBuilder", 25000)
    page.wait_for_timeout(500)
    if shots: shot(page, out, pre + "2-build")
    box = page.locator(".er-canvas").bounding_box()
    for i, (h, mod) in enumerate(plan):
        # drag the peg in the moment's column: x at the column centre, y from the baseline to the height
        x = box["x"] + box["width"] * ((9 + (i + 0.5) * 34) / (34 * 5 + 14))
        top, bottom = box["y"] + box["height"] * 0.14, box["y"] + box["height"] * 0.9
        yw = 8 + h * 7.5
        y = bottom - ((yw + 1.5) / 29.0) * (bottom - top)
        page.mouse.move(x, box["y"] + box["height"] * 0.6)
        page.mouse.down(); page.mouse.move(x, y, steps=6); page.mouse.up()
        page.wait_for_timeout(150)
        page.locator(".er-mod").nth(['smooth', 'drop', 'loop', 'tunnel', 'cork'].index(mod)).click()
        page.wait_for_timeout(200)
        if shots and i == 2: shot(page, out, pre + "3-shaping")
    segs = page.evaluate("window.__erBuilder.segList")
    if test_ride:
        page.locator(".er-btn", has_text="Test ride").click()
        page.wait_for_timeout(5200)
        if shots: shot(page, out, pre + "4-test-ride")
        page.locator(".er-btn", has_text="Back to building").click()
        page.wait_for_timeout(300)
    lb = page.locator(".er-lever").bounding_box()
    page.mouse.move(lb["x"] + lb["width"] / 2, lb["y"] + lb["height"] / 2)
    page.mouse.down(); page.wait_for_timeout(1000); page.mouse.up()
    return segs


def ride(page, out, pre, host=True, shots=True, switch=True):
    wait_for(page, "window.__reflect.state.view && window.__reflect.state.view.phase === 'reveal'", 60000)
    t0 = time.time()
    did = False
    for at, name in [(2.5, "5-ride-lift"), (7.0, "6-ride-drop"), (14.2, "7-switch-lever"), (19.5, "8-ride-loop"), (27.0, "9-ride-cork"), (39.5, "10-station")]:
        dt = at - (time.time() - t0)
        if dt > 0: page.wait_for_timeout(int(dt * 1000))
        if shots: shot(page, out, pre + name)
        if name == "7-switch-lever" and switch and page.locator(".er-switch button").count():
            page.locator(".er-switch button").first.click(); did = True
    if host:
        page.locator(".er-btn", has_text="Ride together").click()
    t1 = time.time()
    for at, name in [(3.0, "11-one-loop"), (10.5, "12-photo")]:
        dt = at - (time.time() - t1)
        if dt > 0: page.wait_for_timeout(int(dt * 1000))
        if shots: shot(page, out, pre + name)
    return did


def solo(base, out, form="phone"):
    os.makedirs(out, exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
        opts = dict(PHONE if form == "phone" else DESK)
        opts["record_video_dir"] = out; opts["record_video_size"] = opts["viewport"]
        ctx = b.new_context(**opts); ctx.add_init_script(EVENT_TIMING)
        page = ctx.new_page()
        errs = []
        page.on("pageerror", lambda e: errs.append(str(e)))
        page.on("console", lambda m: errs.append("console." + m.type + ": " + m.text) if m.type == "error" and "ERR_TUNNEL" not in m.text else None)
        page.goto(base + "/index.html"); page.wait_for_timeout(1500)
        pre = form + "-"
        page.locator("[data-ritual=emotional-rollercoaster] [data-act=solo]").click()
        page.wait_for_timeout(2600)
        shot(page, out, pre + "1-hook")
        segs = build(page, out, pre)
        did = ride(page, out, pre)
        m = metrics(page); m["errors"] = errs; m["segs"] = segs; m["switched"] = did
        json.dump(m, open(os.path.join(out, pre + "metrics.json"), "w"), indent=1)
        vid = page.video.path() if page.video else None
        ctx.close(); b.close()
        if vid: os.replace(vid, os.path.join(out, pre + "solo.webm"))
        print(json.dumps({"errors": errs[:10], "segs": segs, "switched": did}))


def multi(base, out):
    os.makedirs(out, exist_ok=True)
    with sync_playwright() as p:
        b1 = p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"]); b2 = p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
        c1 = b1.new_context(**dict(PHONE, record_video_dir=out, record_video_size=PHONE["viewport"]))
        c2 = b2.new_context(**dict(DESK, record_video_dir=out, record_video_size=DESK["viewport"]))
        for c in (c1, c2): c.add_init_script(EVENT_TIMING)
        host, guest = c1.new_page(), c2.new_page()
        log = {"errors": [], "checks": {}}
        for pg, who in ((host, "host"), (guest, "guest")): pg.on("pageerror", lambda e, who=who: log["errors"].append(who + ": " + str(e)))
        host.goto(base + "/index.html"); host.wait_for_timeout(1200)
        host.locator("[data-ritual=emotional-rollercoaster] [data-act=invite]").click()
        wait_for(host, "!!window.__reflect && !!window.__reflect.state.view")
        code = host.evaluate("window.__reflect.state.code"); log["room"] = code
        guest.goto(base + "/index.html?reflectRoom=" + code)
        wait_for(guest, "!!window.__reflect && !!window.__reflect.state.view && window.__reflect.state.view.players.length >= 2")
        for pg, nm in ((host, "Asha"), (guest, "Ben")):
            inp = pg.locator(".rf-me input"); inp.fill(nm); inp.press("Enter")
        host.wait_for_timeout(500)
        host.locator(".rf-btn", has_text="Bubble companion").click(); host.wait_for_timeout(400)
        host.locator("[data-act=start]").click()
        wait_for(guest, "window.__reflect.state.view.phase === 'play'")
        for pg in (host, guest):
            pg.wait_for_timeout(1200); pg.locator(".er-btn", has_text="Skip").click()
        build(guest, out, "guest-", plan=[(0.3, 'smooth'), (-0.8, 'drop'), (0.2, 'cork'), (-0.6, 'tunnel'), (0.9, 'loop')], test_ride=False)
        wait_for(guest, "(() => { const v = window.__reflect.state.view; return v.sealed[v.you]; })()")
        hv = host.evaluate("JSON.stringify(window.__reflect.state.view)")
        log["checks"]["guest_track_hidden_from_host"] = ('"segs"' not in hv)
        build(host, out, "host-", test_ride=False)
        wait_for(host, "window.__reflect.state.view.phase === 'reveal'", 30000)
        wait_for(guest, "window.__reflect.state.view.phase === 'reveal'", 30000)
        log["checks"]["same_ride_schedule"] = host.evaluate("JSON.stringify([window.__reflect.state.view.revealed, window.__reflect.state.view.pub.revealAt])") == guest.evaluate("JSON.stringify([window.__reflect.state.view.revealed, window.__reflect.state.view.pub.revealAt])")
        # the guest pulls the switch at the first junction; the host must see the jump
        guest.wait_for_function("document.querySelector('*') && true")
        t0 = time.time()
        jumped = False
        while time.time() - t0 < 20:
            if guest.locator(".er-switch button").count():
                guest.locator(".er-switch button").first.click(); jumped = True; break
            guest.wait_for_timeout(250)
        host.wait_for_timeout(900)
        log["checks"]["guest_switched"] = jumped
        log["checks"]["host_saw_switch"] = host.evaluate("window.__reflect.state.view.live.some(e => e.data && e.data.kind === 'switch')")
        shot(host, out, "host-7-after-switch"); shot(guest, out, "guest-7-after-switch")
        log["metrics"] = {"host": metrics(host), "guest": metrics(guest)}
        vids = [(host.video.path() if host.video else None, "multi-host-phone.webm"), (guest.video.path() if guest.video else None, "multi-guest-desktop.webm")]
        c1.close(); c2.close(); b1.close(); b2.close()
        for src, name in vids:
            if src: os.replace(src, os.path.join(out, name))
        json.dump(log, open(os.path.join(out, "multi-log.json"), "w"), indent=1)
        print(json.dumps({k: v for k, v in log.items() if k != "metrics"}, indent=1))


if __name__ == "__main__":
    mode, base, out = sys.argv[1], sys.argv[2].rstrip("/"), sys.argv[3]
    if mode == "solo": solo(base, out, sys.argv[4] if len(sys.argv) > 4 else "phone")
    else: multi(base, out)
