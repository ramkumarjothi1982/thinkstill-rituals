/* A stand-in for the claude.ai artifact `room` capability, for local tests only: pages in one browser talk over a
 * BroadcastChannel with the same semantics the artifact runtime documents (everyone hears every emit, 4 KiB limit,
 * presence per peer, joined/left/updated deltas, sameTab echoes). Load it before the artifact page's own script. */
(function () {
  var ch = new BroadcastChannel('mock-artifact-room');
  var me = Math.random().toString(36).slice(2, 12);
  var rooms = new Map();
  function sender(peer, mine) { return { peer: peer, by: null, isMe: mine, sameTab: mine, kind: 'viewer', guest: false }; }
  function makeRoom(name) {
    var listeners = new Map(), peerL = new Set(), peers = new Map(), myPresence = {};
    var self = Object.assign(sender(me, true), { presence: {}, updatedAt: Date.now() });
    peers.set(me, self);
    function snap() { return Object.freeze(Array.from(peers.values())); }
    function notify(j, l, u) { var s = snap(); peerL.forEach(function (f) { f({ peers: s, joined: j, left: l, updated: u }); }); }
    function post(m) { m.room = name; m.from = me; ch.postMessage(m); }
    function onMsg(e) {
      var m = e.data; if (!m || m.room !== name || m.from === me) return;
      if (m.type === 'emit') { var ls = listeners.get(m.topic); if (ls) ls.forEach(function (f) { f(Object.assign(sender(m.from, false), { topic: m.topic, data: m.data })); }); }
      else if (m.type === 'presence' || m.type === 'hello') {
        var had = peers.has(m.from);
        var p = Object.assign(sender(m.from, false), { presence: Object.freeze(m.presence || {}), updatedAt: Date.now() });
        peers.set(m.from, p);
        notify(had ? [] : [p], [], had ? [p] : []);
        if (m.type === 'hello') post({ type: 'presence', presence: myPresence });
      } else if (m.type === 'leave') { var q = peers.get(m.from); if (q) { peers.delete(m.from); notify([], [q], []); } }
    }
    ch.addEventListener('message', onMsg);
    var nr = {
      name: name,
      emit: function (topic, data) {
        var s = JSON.stringify(data === undefined ? null : data);
        if (new TextEncoder().encode(s).length > 4096) return Promise.reject({ code: 'invalid_argument', message: 'data over 4 KiB' });
        post({ type: 'emit', topic: topic, data: data });
        var ls = listeners.get(topic); if (ls) ls.forEach(function (f) { f(Object.assign(sender(me, true), { topic: topic, data: data })); });
        window.__mockEmits = (window.__mockEmits || 0) + 1;
        return Promise.resolve();
      },
      on: function (topic, fn) { if (!listeners.has(topic)) listeners.set(topic, new Set()); listeners.get(topic).add(fn); return function () { listeners.get(topic).delete(fn); }; },
      presence: function (patch) {
        myPresence = Object.assign({}, myPresence, patch);
        self = Object.assign(sender(me, true), { presence: Object.freeze(myPresence), updatedAt: Date.now() }); peers.set(me, self);
        post({ type: 'presence', presence: myPresence }); notify([], [], [self]);
        return Promise.resolve();
      },
      peers: function () { return snap(); },
      onPeers: function (fn) { peerL.add(fn); setTimeout(function () { fn({ peers: snap(), joined: snap(), left: [], updated: [] }); }, 0); return function () { peerL.delete(fn); }; },
      connected: function () { return true; },
      onConnection: function (fn) { setTimeout(function () { fn(true); }, 0); return function () {}; },
      leave: function () { post({ type: 'leave' }); ch.removeEventListener('message', onMsg); rooms.delete(name); return Promise.resolve(); }
    };
    post({ type: 'hello', presence: {} });
    return nr;
  }
  var room = {
    join: function (name) { if (!/^[a-z0-9][a-z0-9_.-]{0,47}$/.test(name)) return Promise.reject({ code: 'invalid_argument' }); if (!rooms.has(name)) rooms.set(name, makeRoom(name)); return new Promise(function (r) { setTimeout(function () { r(rooms.get(name)); }, 30); }); },
    connected: function () { return true; }
  };
  window.addEventListener('pagehide', function () { rooms.forEach(function (r) { r.leave(); }); });
  window.claude = { use: function (n) { return Promise.resolve(n === 'room' ? room : null); } };
})();
