"""Shadow Monsters end-to-end runs (Playwright).

  solo:  python3 e2e_sm.py solo  <base-url> <out-dir> [phone|desktop]
  multi: python3 e2e_sm.py multi <base-url> <out-dir>

solo   — one person + three labelled Bubble companions, in-page room: builds a monster from the toybox (placement via
         the builder's test hooks; tray taps, the hold-to-seal chain, the pull and the reactions with real input),
         then the whole Shadow Show, the "same stuff, more distance" board, the finale and the end card.
multi  — two separate browsers (phone + desktop) on the dev room server plus one Bubble companion: both build and seal
         privately (the host checks the guest's monster is NOT visible before the show); in the show each owner holds
         to pull their own light back and the other sees it; reactions travel both ways; both reach the end card.
"""
import json, os, sys, time
from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from e2e_common import PHONE, DESK, EVENT_TIMING, shot, wait_for, metrics, errors_to

PREF = ['fork', 'glove', 'cactus', 'whisk', 'teapot', 'umbrella', 'slipper', 'scissors', 'doughnut', 'broccoli', 'banana', 'duck', 'croissant', 'duster']


def build(page, out, pre, shots=True, layout=0):
    wait_for(page, "!!window.__smBuilder", 25000)
    page.wait_for_timeout(600)
    if shots: shot(page, out, pre + "2-build")
    box = page.evaluate("__smBuilder.boxList()")
    pick = [o for o in PREF if o in box][:3]
    # the first object straight from the toybox tray, with a real tap
    page.locator("[data-obj=%s]" % pick[0]).click(); page.wait_for_timeout(400)
    plans = [[(-0.035, 0.14, 0), (0.02, 0.3, 0), (0.05, 0.19, 1)], [(0.0, 0.12, 2), (-0.04, 0.22, 0), (0.04, 0.26, 6)]][layout]
    page.evaluate("(() => { const b = __smBuilder; b.move(0, %f, %f); })()" % plans[0][:2])
    for (o, (x, z, r)) in zip(pick[1:], plans[1:]): page.evaluate("__smBuilder.add('%s', %f, %f, %d)" % (o, x, z, r))
    page.wait_for_timeout(1200)
    if shots: shot(page, out, pre + "3-monster")
    size = page.evaluate("__smBuilder.size()")
    lb = page.locator(".sm-chain").bounding_box()
    page.mouse.move(lb["x"] + lb["width"] / 2, lb["y"] + lb["height"] / 2); page.mouse.down(); page.wait_for_timeout(1050); page.mouse.up()
    return {"objs": pick, "size": size}


class Viewer:
    """Polls one page through the show: pulls its own light back when the lever appears, reacts to others' monsters."""
    def __init__(self, page, out, pre, react=True, shots=True):
        self.page, self.out, self.pre, self.react, self.shots = page, out, pre, react, shots
        self.pulled, self.reacted, self.n, self.last, self.seen, self.reacted_on = [], 0, 0, 0, None, set()

    def tick(self):
        pg = self.page
        st = pg.evaluate("(() => { const s = window.__smShow; if (!s) return null; if (s.phase === 'finale') return {part: 'finale', i: -1, t: (performance.now() - s.finaleAt) / 1000}; const w = s.where(); const m = s.ms[w.i]; return {part: w.part, i: w.i, k: w.k, slotT: w.slotT, mine: !!(m && m.pid === s.view.you)}; })()")
        if not st: return st
        # a few moments worth seeing in full (not just the first frame of each part)
        self.extra = getattr(self, 'extra', set())
        for name, cond in (('x-evr', st['part'] == 'evr' and st.get('k', 0) > 0.7), ('x-parade', st['part'] == 'finale' and 4.0 < st.get('t', 0) < 7), ('x-birds', st['part'] == 'finale' and 10.2 < st.get('t', 0) < 12.5)):
            if cond and name not in self.extra and self.shots: self.extra.add(name); shot(pg, self.out, self.pre + name)
        if st.get("mine") and st["part"] in ("react", "loom") and st["i"] not in self.pulled:
            try:
                if pg.locator(".sm-pull").count():
                    b = pg.locator(".sm-pull").bounding_box(timeout=1200)
                    pg.mouse.move(b["x"] + b["width"] / 2, b["y"] + b["height"] / 2); pg.mouse.down(); pg.wait_for_timeout(760); pg.mouse.up()
                    self.pulled.append(st["i"]); self.pull_at = st.get("slotT")
                    if self.shots: pg.wait_for_timeout(250); shot(pg, self.out, self.pre + "s-pulling-%d" % st["i"])
            except Exception as e:
                self.pull_err = str(e)[:200]
        elif self.react and not st.get("mine") and st["part"] in ("rise", "react", "loom", "pull", "beat") and st["i"] not in self.reacted_on:
            try:
                if pg.locator(".sm-react button").count():
                    b = pg.locator(".sm-react button").nth(len(self.reacted_on) % 3).bounding_box(timeout=1000)
                    pg.mouse.click(b["x"] + b["width"] / 2, b["y"] + b["height"] / 2); self.reacted += 1; self.reacted_on.add(st["i"])
            except Exception as e:
                self.react_err = str(e)[:200]
        key = "%s-%s" % (st["part"], st["i"])
        if self.shots and key != self.seen:
            self.seen = key; self.n += 1; shot(pg, self.out, self.pre + "s%03d-%s" % (self.n, key))
        return st


def show(viewers, timeout=240):
    t0 = time.time()
    while time.time() - t0 < timeout:
        done = True
        for v in viewers:
            v.tick()
            if v.page.locator(".sm-end").count() == 0: done = False
        if done: break
        viewers[0].page.wait_for_timeout(150)
    for v in viewers:
        v.page.wait_for_timeout(700)
        if v.shots: shot(v.page, v.out, v.pre + "z-end")


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
        page.locator("[data-ritual=shadow-monsters] [data-act=solo]").click()
        page.wait_for_timeout(1000); shot(page, out, pre + "1-hook-monster")
        page.wait_for_timeout(1600); shot(page, out, pre + "1-hook-backstage")
        bl = build(page, out, pre)
        v = Viewer(page, out, pre)
        show([v])
        m = metrics(page); m["errors"] = errs; m["build"] = bl; m["pulled"] = v.pulled; m["reactions"] = v.reacted
        json.dump(m, open(os.path.join(out, pre + "metrics.json"), "w"), indent=1)
        vid = page.video.path() if page.video else None
        ctx.close(); b.close()
        if vid: os.replace(vid, os.path.join(out, pre + "solo.webm"))
        print(json.dumps({"errors": errs[:10], "build": bl, "pulled": v.pulled, "reactions": v.reacted}))


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
        host.locator("[data-ritual=shadow-monsters] [data-act=invite]").click()
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
            pg.wait_for_timeout(900); pg.locator(".sm-skip").click()
        gb = build(guest, out, "guest-", layout=1)
        wait_for(guest, "(() => { const v = window.__reflect.state.view; return v.sealed[v.you]; })()")
        hv = host.evaluate("JSON.stringify(window.__reflect.state.view)")
        log["checks"]["guest_monster_hidden_from_host"] = ('"objs"' not in hv)
        hb = build(host, out, "host-", layout=0)
        wait_for(host, "window.__reflect.state.view.phase === 'reveal'", 30000)
        wait_for(guest, "window.__reflect.state.view.phase === 'reveal'", 30000)
        same = "JSON.stringify([window.__reflect.state.view.revealed, window.__reflect.state.view.pub.revealAt, window.__reflect.state.view.pub.order])"
        log["checks"]["same_show_and_clock"] = host.evaluate(same) == guest.evaluate(same)
        wait_for(host, "!!window.__smShow", 20000); wait_for(guest, "!!window.__smShow", 20000)
        H, G = Viewer(host, out, "host-"), Viewer(guest, out, "guest-")
        show([H, G], timeout=260)
        hp, gp = host.evaluate("window.__reflect.state.view.you"), guest.evaluate("window.__reflect.state.view.you")
        pulls = host.evaluate("window.__reflect.state.view.pub.pulls || {}")
        order = host.evaluate("window.__reflect.state.view.pub.order")
        log["checks"]["host_pulled_own_light"] = any(order[int(i)] == hp for i in pulls)
        log["checks"]["guest_pulled_own_light"] = any(order[int(i)] == gp for i in pulls)
        log["checks"]["both_see_the_same_pulls"] = json.dumps(pulls, sort_keys=True) == json.dumps(guest.evaluate("window.__reflect.state.view.pub.pulls || {}"), sort_keys=True)
        live = host.evaluate("window.__reflect.state.view.live.map(e => [e.pid, e.data && e.data.k])")
        log["checks"]["guest_reactions_reached_host"] = any(e[0] == gp and e[1] == "react" for e in live)
        log["checks"]["host_reactions_reached_guest"] = any(e[0] == hp and e[1] == "react" for e in guest.evaluate("window.__reflect.state.view.live.map(e => [e.pid, e.data && e.data.k])"))
        log["build"] = {"host": hb, "guest": gb}
        log["pull_seen_at_slot_seconds"] = {"host": getattr(H, "pull_at", None), "guest": getattr(G, "pull_at", None)}
        log["pulls"] = pulls; log["order"] = order; log["you"] = {"host": hp, "guest": gp}
        log["live"] = host.evaluate("window.__reflect.state.view.live.map(e => [e.n, e.pid, e.data && e.data.k, e.data && e.data.i])")
        log["pull_err"] = {"host": getattr(H, "pull_err", None), "guest": getattr(G, "pull_err", None)}
        log["reacted"] = {"host": sorted(H.reacted_on), "guest": sorted(G.reacted_on), "errs": [getattr(H, "react_err", None), getattr(G, "react_err", None)]}
        log["room_errors"] = {"host": host.evaluate("window.__reflect.errors"), "guest": guest.evaluate("window.__reflect.errors")}
        PROBE = "(() => { const c = window.__reflect.client, t = c && c.t; return { status: c && c.status, ws: t && t.ws ? t.ws.readyState : null, queued: t && t.queue ? t.queue.length : null, v: c && c.view && c.view.v, skew: c && Math.round(c.clockSkew), connected: c && c.view && c.view.players.map(p => p.name + ':' + p.connected) }; })()"
        log["clients"] = {"host": host.evaluate(PROBE), "guest": guest.evaluate(PROBE)}
        log["metrics"] = {"host": metrics(host), "guest": metrics(guest)}
        vids = [(host.video.path() if host.video else None, "multi-host-phone.webm"), (guest.video.path() if guest.video else None, "multi-guest-desktop.webm")]
        c1.close(); c2.close(); b1.close(); b2.close()
        for src, name in vids:
            if src: os.replace(src, os.path.join(out, name))
        json.dump(log, open(os.path.join(out, "multi-log.json"), "w"), indent=1)
        print(json.dumps({k: v for k, v in log.items() if k != "metrics"}, indent=1))


if __name__ == "__main__":
    mode, base, out = sys.argv[1], sys.argv[2], sys.argv[3]
    if mode == "solo": solo(base, out, sys.argv[4] if len(sys.argv) > 4 else "phone")
    else: multi(base, out)
