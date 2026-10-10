"""Drama Dubbing Booth end-to-end runs (Playwright).
  solo:  python3 e2e_ddb.py solo  <base-url> <out-dir> [phone|desktop]
  multi: python3 e2e_ddb.py multi <base-url> <out-dir>     (two browsers on the dev room server)
"""
import json, os, sys, time
from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from e2e_gtg import PHONE, DESK, EVENT_TIMING, shot, wait_for, metrics


def dub(page, out, pre, shots=True, plan=((0.9, 0, 0), (3.7, 1, 1), (6.95, 2, 0), (9.6, 3, 3))):
    """Place lines: for each (time, beat, card index) seek the ruler, open the beat and tap a line card."""
    wait_for(page, "!!window.__ddbStudio", 25000)
    page.wait_for_timeout(600)
    if shots: shot(page, out, pre + "2-studio")
    ruler = page.locator(".ddb-ruler").bounding_box()
    for n, (t, beat, card) in enumerate(plan):
        page.mouse.click(ruler["x"] + ruler["width"] * (t / 12.0), ruler["y"] + ruler["height"] / 2)
        page.wait_for_timeout(150)
        if page.locator(".ddb-perf").count():
            page.locator(".ddb-sbtn", has_text="Done").click(); page.wait_for_timeout(150)
        page.locator(".ddb-line:not(.own)").nth(card).click()
        page.wait_for_timeout(500)
        if n == 1:
            # perform the face: pick a face on the wheel and push the pitch
            page.locator(".ddb-wheel button").nth(5).click(); page.wait_for_timeout(250)
            if shots: shot(page, out, pre + "3-perform")
        page.locator(".ddb-sbtn", has_text="Done").click(); page.wait_for_timeout(200)
    # drag one more line onto Sync's lane at a chosen frame (the timing joke)
    page.mouse.click(ruler["x"] + ruler["width"] * (7.6 / 12.0), ruler["y"] + 4)
    page.wait_for_timeout(200)
    card = page.locator(".ddb-line:not(.own)").nth(3).bounding_box()
    lane = page.locator(".ddb-track[data-who=sync]").bounding_box()
    page.mouse.move(card["x"] + card["width"] / 2, card["y"] + card["height"] / 2)
    page.mouse.down()
    page.mouse.move(card["x"] + 30, card["y"] - 30, steps=5)
    page.mouse.move(lane["x"] + lane["width"] * (8.2 / 12.0), lane["y"] + lane["height"] / 2, steps=10)
    if shots: shot(page, out, pre + "4-drag-line")
    page.mouse.up()
    page.wait_for_timeout(400)
    page.locator(".ddb-sbtn", has_text="Done").click(); page.wait_for_timeout(200)
    # preview the cut from the start
    page.mouse.click(ruler["x"] + 2, ruler["y"] + ruler["height"] / 2)
    page.locator(".ddb-preview").click()
    page.wait_for_timeout(7300)
    if shots: shot(page, out, pre + "5-preview")
    page.locator(".ddb-preview").click()
    n_cues = page.evaluate("window.__ddbStudio.cueList.length")
    pb = page.locator(".ddb-print").bounding_box()
    page.mouse.move(pb["x"] + pb["width"] / 2, pb["y"] + pb["height"] / 2)
    page.mouse.down(); page.wait_for_timeout(1000); page.mouse.up()
    return n_cues


def premiere(page, out, pre, host=True, shots=True):
    wait_for(page, "window.__reflect.state.view && window.__reflect.state.view.phase === 'reveal'", 60000)
    v = page.evaluate("window.__reflect.state.view")
    n = len(v["revealed"] or {})
    t0 = time.time()
    total = 3.2 + n * 15.4
    marks = [(1.5, "6-premiere-intro"), (4.4, "7-title-card"), (3.2 + 2.6 + 7.4, "8-premiere-film"), (total + 1.5, "10-same-frame"), (total + 4.5, "11-board")]
    reacted = False
    for at, name in marks:
        dt = at - (time.time() - t0)
        if dt > 0: page.wait_for_timeout(int(dt * 1000))
        if name == "8-premiere-film" and not reacted:
            page.locator(".ddb-react button").nth(0).click(); page.wait_for_timeout(350); reacted = True
        if shots: shot(page, out, pre + name)
    if host:
        page.locator(".ddb-btn", has_text="Director").click()
    t1 = time.time()
    for at, name in [(6.5, "12-directors-cut"), (15.2, "13-red-carpet"), (19.5, "14-poster")]:
        dt = at - (time.time() - t1)
        if dt > 0: page.wait_for_timeout(int(dt * 1000))
        if shots: shot(page, out, pre + name)


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
        page.locator("[data-ritual=drama-dubbing-booth] [data-act=solo]").click()
        page.wait_for_timeout(2600)
        shot(page, out, pre + "1-hook")
        n = dub(page, out, pre)
        premiere(page, out, pre)
        m = metrics(page); m["errors"] = errs; m["cues"] = n
        json.dump(m, open(os.path.join(out, pre + "metrics.json"), "w"), indent=1)
        vid = page.video.path() if page.video else None
        ctx.close(); b.close()
        if vid: os.replace(vid, os.path.join(out, pre + "solo.webm"))
        print(json.dumps({"errors": errs[:10], "cues": n, "input_n": len(m["input"])}))


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
        host.locator("[data-ritual=drama-dubbing-booth] [data-act=invite]").click()
        wait_for(host, "!!window.__reflect && !!window.__reflect.state.view")
        code = host.evaluate("window.__reflect.state.code"); log["room"] = code
        guest.goto(base + "/index.html?reflectRoom=" + code)
        wait_for(guest, "!!window.__reflect && !!window.__reflect.state.view && window.__reflect.state.view.players.length >= 2")
        for pg, nm in ((host, "Asha"), (guest, "Ben")):
            inp = pg.locator(".rf-me input"); inp.fill(nm); inp.press("Enter")
        host.wait_for_timeout(500)
        log["checks"]["ritual"] = guest.evaluate("window.__reflect.state.view.ritual")
        host.locator(".rf-btn", has_text="Bubble companion").click(); host.wait_for_timeout(400)
        host.locator("[data-act=start]").click()
        wait_for(guest, "window.__reflect.state.view.phase === 'play'")
        for pg in (host, guest):
            pg.wait_for_timeout(1200)
            pg.locator(".ddb-btn", has_text="Skip").click()
        n_g = dub(guest, out, "guest-", shots=True, plan=((1.2, 0, 2), (4.0, 1, 0), (7.1, 2, 1)))
        wait_for(guest, "(() => { const v = window.__reflect.state.view; return v.sealed[v.you]; })()")
        hv = host.evaluate("JSON.stringify(window.__reflect.state.view)")
        log["checks"]["guest_cut_hidden_from_host"] = ('"cues"' not in hv)
        n_h = dub(host, out, "host-", shots=True)
        wait_for(host, "window.__reflect.state.view.phase === 'reveal'", 30000)
        wait_for(guest, "window.__reflect.state.view.phase === 'reveal'", 30000)
        same = host.evaluate("JSON.stringify([window.__reflect.state.view.revealed, window.__reflect.state.view.pub.order, window.__reflect.state.view.pub.revealAt])") == guest.evaluate("JSON.stringify([window.__reflect.state.view.revealed, window.__reflect.state.view.pub.order, window.__reflect.state.view.pub.revealAt])")
        log["checks"]["same_premiere_schedule"] = same
        guest.wait_for_timeout(12000)
        guest.locator(".ddb-react button").nth(2).click()
        host.wait_for_timeout(900)
        log["checks"]["reaction_reached_host"] = host.evaluate("window.__reflect.state.view.live.some(e => e.data && e.data.kind === 'react')")
        shot(host, out, "host-8-premiere-reaction"); shot(guest, out, "guest-8-premiere-reaction")
        log["metrics"] = {"host": metrics(host), "guest": metrics(guest)}
        vids = [(host.video.path() if host.video else None, "multi-host-phone.webm"), (guest.video.path() if guest.video else None, "multi-guest-desktop.webm")]
        c1.close(); c2.close(); b1.close(); b2.close()
        for src, name in vids:
            if src: os.replace(src, os.path.join(out, name))
        log["cues"] = {"host": n_h, "guest": n_g}
        json.dump(log, open(os.path.join(out, "multi-log.json"), "w"), indent=1)
        print(json.dumps({k: v for k, v in log.items() if k != "metrics"}, indent=1))


if __name__ == "__main__":
    mode, base, out = sys.argv[1], sys.argv[2].rstrip("/"), sys.argv[3]
    if mode == "solo": solo(base, out, sys.argv[4] if len(sys.argv) > 4 else "phone")
    else: multi(base, out)
