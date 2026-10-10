"""The Glorious Mess Auction end-to-end runs (Playwright), with real pointer input throughout.

  solo:  python3 e2e_ma.py solo  <base-url> <out-dir> [phone|desktop]
  multi: python3 e2e_ma.py multi <base-url> <out-dir>

solo   — one person + three labelled Bubble companions, in-page room (instant entry): draws blind twice, signs, prices,
         seals, then bids with the paddle on every Bubble lot and watches their own mess sell.
multi  — two separate browsers (phone + desktop, separate storage) on the dev room server plus one Bubble companion:
         both draw and seal privately; the host checks the guest's drawing and price are NOT visible before the reveal;
         both hold paddles on each other's lots at the same time; both must agree on every hammer price and winner,
         and each must see what the other person held on for their mess.
Writes screenshots, videos (.webm) and a JSON log into <out-dir>.
"""
import json, math, os, sys, time
from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from e2e_common import PHONE, DESK, EVENT_TIMING, shot, wait_for, metrics, errors_to


def stroke(page, pts):
    page.mouse.move(*pts[0]); page.mouse.down()
    for p in pts[1:]: page.mouse.move(*p, steps=2)
    page.mouse.up()


def studio(page, out, pre, est_moves=-1, shots=True, wobble=0.0):
    """Blind face, blind hair, signature, secret price, hold-to-seal."""
    wait_for(page, "!!window.__maStudio", 25000)
    page.wait_for_timeout(500)
    if shots: shot(page, out, pre + "2-studio")
    box = page.locator(".ma-paper").bounding_box()
    X = lambda u: box["x"] + u * box["width"]; Y = lambda v: box["y"] + v * box["height"]
    w = lambda i: wobble * math.sin(i * 1.7)
    page.locator("[data-act=blindfold]").click(); page.wait_for_timeout(650)
    # what a blindfolded hand does: a head that doesn't close, eyes that drift out of it, a nose and mouth that wander
    jit = lambda i, a=0.012: (math.sin(i * 2.3) + math.sin(i * 0.7)) * a * (1 + wobble)
    stroke(page, [(X(0.48 + 0.29 * math.cos(a / 16 * 2 * math.pi) * (1 + 0.08 * math.sin(a)) + jit(a)), Y(0.47 + 0.31 * math.sin(a / 16 * 2 * math.pi) + jit(a + 3))) for a in range(-2, 15)])
    if shots: shot(page, out, pre + "3-blind")
    stroke(page, [(X(0.3), Y(0.3)), (X(0.36), Y(0.27)), (X(0.38), Y(0.33)), (X(0.31), Y(0.35)), (X(0.3), Y(0.3))])
    stroke(page, [(X(0.63), Y(0.2)), (X(0.69), Y(0.17)), (X(0.71), Y(0.24)), (X(0.64), Y(0.25))])
    stroke(page, [(X(0.55), Y(0.36)), (X(0.47), Y(0.53)), (X(0.58), Y(0.55))])
    stroke(page, [(X(0.45 + 0.3 * t / 8), Y(0.66 + 0.08 * math.sin(t / 8 * math.pi) + 0.05 * t / 8)) for t in range(0, 9)])
    wait_for(page, "__maStudio.state().step === 'reveal'", 12000)
    page.wait_for_timeout(2200)
    if shots: shot(page, out, pre + "4-reveal")
    page.locator("[data-act=next]").click(); page.wait_for_timeout(400)
    page.locator("[data-act=blindfold]").click(); page.wait_for_timeout(650)
    for i in range(6): stroke(page, [(X(0.36 + i * 0.085), Y(0.13 + 0.02 * math.sin(i))), (X(0.31 + i * 0.1), Y(0.02 + 0.03 * (i % 2)))])
    wait_for(page, "__maStudio.state().step === 'reveal'", 12000)
    page.wait_for_timeout(2300)
    if shots: shot(page, out, pre + "5-reveal-hair")
    page.locator("[data-act=next]").click(); page.wait_for_timeout(400)
    stroke(page, [(X(0.6 + 0.3 * t / 12), Y(0.9 - 0.035 * abs(math.sin(t * 1.4)))) for t in range(0, 13)])
    page.locator("[data-act=signed]").click(); page.wait_for_timeout(400)
    rng = page.locator(".ma-price input"); rng.focus()
    for _ in range(abs(est_moves)): page.keyboard.press("ArrowLeft" if est_moves < 0 else "ArrowRight")
    page.wait_for_timeout(300)
    if shots: shot(page, out, pre + "6-price")
    st = page.evaluate("__maStudio.state()")
    b = page.locator("[data-act=seal]").bounding_box()
    page.mouse.move(b["x"] + b["width"] / 2, b["y"] + b["height"] / 2); page.mouse.down(); page.wait_for_timeout(1150); page.mouse.up()
    return st


class Bidder:
    """Holds the paddle for a planned time on each lot it may bid on. Polled, so two pages can bid at once."""
    def __init__(self, page, out, pre, holds, shots=True):
        self.page, self.out, self.pre, self.holds, self.shots = page, out, pre, list(holds), shots
        self.done, self.down, self.log, self.n, self.mirror = set(), None, [], 0, ""

    def tick(self):
        pg = self.page
        s = pg.evaluate("window.__maAuction ? __maAuction.state() : null")
        if not s: return s
        if s.get("part") == "gap" and not self.mirror and pg.locator(".ma-cap").count(): self.mirror = pg.locator(".ma-cap").first.inner_text()
        self.extra = getattr(self, 'extra', set())
        for name, cond in (('x-estimates', s.get('part') == 'gap' and s.get('k', 0) > 0.6), ('x-museum', s.get('part') == 'finale' and 5.0 < s.get('t', 0) < 6.6), ('x-tag', s.get('part') == 'finale' and 12.6 < s.get('t', 0) < 14.2), ('x-alarm', s.get('part') == 'finale' and 14.8 < s.get('t', 0) < 15.8)):
            if cond and name not in self.extra and self.shots: self.extra.add(name); shot(pg, self.out, self.pre + name)
        now = time.time()
        if self.down and now >= self.down[1]:
            pg.mouse.up(); self.log.append({"lot": self.down[0], "released": round(now, 2)})
            if self.shots: shot(pg, self.out, self.pre + "b-dropped-%d" % self.down[0])
            self.down = None
        if not self.down and s.get("part") in ("open", "bid") and s.get("paddle") == "ready" and s["i"] not in self.done and self.holds:
            bb = pg.locator("[data-act=paddle]").bounding_box()
            if bb:
                pg.mouse.move(bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2); pg.mouse.down()
                h = self.holds.pop(0); self.done.add(s["i"]); self.down = (s["i"], now + h)
                self.log.append({"lot": s["i"], "pressed": round(now, 2), "hold": h})
                if self.shots: pg.wait_for_timeout(350); shot(pg, self.out, self.pre + "b-holding-%d" % s["i"])
        return s


def auction(pages, timeout=260, shots_every=2.5):
    """pages: list of (Bidder, prefix). Runs until every page shows the end card."""
    t0 = time.time(); last = 0; seen = {}
    while time.time() - t0 < timeout:
        allend = True
        for bd in pages:
            s = bd.tick()
            part = (s or {}).get("part")
            key = "%s-%s" % (part, (s or {}).get("i"))
            if bd.shots and part and seen.get(bd.pre) != key and (time.time() - last > shots_every or part in ("sold", "gap", "finale")):
                seen[bd.pre] = key; last = time.time(); bd.n += 1
                shot(bd.page, bd.out, bd.pre + "a%03d-%s" % (bd.n, key))
            if bd.page.locator(".ma-end").count() == 0: allend = False
        if allend: break
        pages[0].page.wait_for_timeout(120)
    for bd in pages:
        bd.page.wait_for_timeout(600)
        if bd.shots: shot(bd.page, bd.out, bd.pre + "z-end")


def solo(base, out, form="phone"):
    os.makedirs(out, exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
        opts = dict(PHONE if form == "phone" else DESK)
        opts["record_video_dir"] = out; opts["record_video_size"] = opts["viewport"]
        ctx = b.new_context(**opts); ctx.add_init_script(EVENT_TIMING)
        page = ctx.new_page()
        errs = []; errors_to(page, errs, "solo")
        page.goto(base + "/index.html"); page.wait_for_timeout(1500)
        pre = form + "-"
        shot(page, out, pre + "0-hub")
        page.locator("[data-ritual=mess-auction] [data-act=solo]").click()
        page.wait_for_timeout(900); shot(page, out, pre + "1-hook-bang")
        page.wait_for_timeout(1700); shot(page, out, pre + "1-hook-title")
        st = studio(page, out, pre, est_moves=-1)
        bd = Bidder(page, out, pre, [3.0, 7.0, 1.5])
        auction([bd])
        result = page.evaluate("JSON.stringify(window.__reflect.state.view.pub)")
        m = metrics(page); m["errors"] = errs; m["studio"] = st; m["bids"] = bd.log
        m["mirror"] = bd.mirror
        json.dump(m, open(os.path.join(out, pre + "metrics.json"), "w"), indent=1)
        vid = page.video.path() if page.video else None
        ctx.close(); b.close()
        if vid: os.replace(vid, os.path.join(out, pre + "solo.webm"))
        print(json.dumps({"errors": errs[:10], "studio": st, "bids": bd.log}))


def multi(base, out):
    os.makedirs(out, exist_ok=True)
    with sync_playwright() as p:
        b1 = p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"]); b2 = p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
        c1 = b1.new_context(**dict(PHONE, record_video_dir=out, record_video_size=PHONE["viewport"]))
        c2 = b2.new_context(**dict(DESK, record_video_dir=out, record_video_size=DESK["viewport"]))
        for c in (c1, c2): c.add_init_script(EVENT_TIMING)
        host, guest = c1.new_page(), c2.new_page()
        log = {"errors": [], "checks": {}}
        errors_to(host, log["errors"], "host"); errors_to(guest, log["errors"], "guest")
        host.goto(base + "/index.html"); host.wait_for_timeout(1200)
        host.locator("[data-ritual=mess-auction] [data-act=invite]").click()
        wait_for(host, "!!window.__reflect && !!window.__reflect.state.view")
        code = host.evaluate("window.__reflect.state.code"); log["room"] = code
        guest.goto(base + "/index.html?reflectRoom=" + code)
        wait_for(guest, "!!window.__reflect && !!window.__reflect.state.view && window.__reflect.state.view.players.length >= 2")
        for pg, nm in ((host, "Asha"), (guest, "Ben")):
            inp = pg.locator(".rf-me input"); inp.fill(nm); inp.press("Enter")
        host.wait_for_timeout(500)
        host.locator(".rf-btn", has_text="Bubble companion").click(); host.wait_for_timeout(400)
        shot(host, out, "host-0-lobby"); shot(guest, out, "guest-0-lobby")
        host.locator("[data-act=start]").click()
        wait_for(guest, "window.__reflect.state.view.phase === 'play'")
        for pg in (host, guest):
            pg.wait_for_timeout(900); pg.locator(".ma-skip").click()
        gst = studio(guest, out, "guest-", est_moves=-2, wobble=1.0)
        wait_for(guest, "(() => { const v = window.__reflect.state.view; return v.sealed[v.you]; })()")
        hv = host.evaluate("JSON.stringify(window.__reflect.state.view)")
        log["checks"]["guest_drawing_and_price_hidden_from_host"] = ('"strokes"' not in hv) and ('"est"' not in hv)
        hst = studio(host, out, "host-", est_moves=0)
        wait_for(host, "window.__reflect.state.view.phase === 'reveal'", 30000)
        wait_for(guest, "window.__reflect.state.view.phase === 'reveal'", 30000)
        same = "JSON.stringify([window.__reflect.state.view.revealed, window.__reflect.state.view.pub.revealAt, window.__reflect.state.view.pub.order])"
        log["checks"]["same_lots_and_clock"] = host.evaluate(same) == guest.evaluate(same)
        order = host.evaluate("window.__reflect.state.view.pub.order")
        hp, gp = host.evaluate("window.__reflect.state.view.you"), guest.evaluate("window.__reflect.state.view.you")
        # the host holds long on the guest's lot; the guest holds very long on the host's lot
        hh = [4.5 if pid == gp else 1.6 for pid in order if pid != hp]
        gh = [7.5 if pid == hp else 2.2 for pid in order if pid != gp]
        HB, GB = Bidder(host, out, "host-", hh), Bidder(guest, out, "guest-", gh)
        wait_for(host, "!!window.__maAuction", 20000)
        wait_for(guest, "!!window.__maAuction", 20000)
        # read both sides at the estimates
        t0 = time.time(); got = False
        while time.time() - t0 < 200:
            for bd in (HB, GB): bd.tick()
            s = host.evaluate("__maAuction.state()")
            if s.get("part") == "gap" and not got:
                host.wait_for_timeout(1800)
                hs, gs = host.evaluate("JSON.stringify(__maAuction.state().lots)"), guest.evaluate("JSON.stringify(__maAuction.state().lots)")
                log["checks"]["both_agree_on_every_sale"] = hs == gs
                log["lots"] = json.loads(hs)
                log["host_mirror"] = host.locator(".ma-cap").first.inner_text() if host.locator(".ma-cap").count() else ""
                log["guest_mirror"] = guest.locator(".ma-cap").first.inner_text() if guest.locator(".ma-cap").count() else ""
                log["checks"]["host_sees_what_guest_held_for_it"] = "Ben held on to" in log["host_mirror"]
                log["checks"]["guest_sees_what_host_held_for_it"] = "Asha held on to" in log["guest_mirror"]
                shot(host, out, "host-8-estimates"); shot(guest, out, "guest-8-estimates")
                got = True; break
            host.wait_for_timeout(120)
        log["checks"]["human_bids_recorded"] = host.evaluate("(() => { const p = window.__reflect.state.view.pub; return Object.keys(p.ins).length > 0 && Object.keys(p.drops).length > 0; })()")
        auction([HB, GB], timeout=90, shots_every=4)
        log["bids"] = {"host": HB.log, "guest": GB.log}
        log["studio"] = {"host": hst, "guest": gst}
        log["metrics"] = {"host": metrics(host), "guest": metrics(guest)}
        vids = [(host.video.path() if host.video else None, "multi-host-phone.webm"), (guest.video.path() if guest.video else None, "multi-guest-desktop.webm")]
        c1.close(); c2.close(); b1.close(); b2.close()
        for src, name in vids:
            if src: os.replace(src, os.path.join(out, name))
        json.dump(log, open(os.path.join(out, "multi-log.json"), "w"), indent=1)
        print(json.dumps({k: v for k, v in log.items() if k not in ("metrics", "lots")}, indent=1))


if __name__ == "__main__":
    mode, base, out = sys.argv[1], sys.argv[2], sys.argv[3]
    if mode == "solo": solo(base, out, sys.argv[4] if len(sys.argv) > 4 else "phone")
    else: multi(base, out)
