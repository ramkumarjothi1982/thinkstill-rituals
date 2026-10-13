// Malicious requests through the network entry point, realtime isolation,
// and the client's delivery guarantees (ordering, interruption, retries).
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, connect } from './helpers.mjs';
import { LocalNetwork } from '../../net/local-network.js';
import { CLIENT_METHODS, MODERATOR_METHODS } from '../core/service.js';
import { HushmatesClient } from '../client/client.js';

const settle = (ms = 40) => new Promise((r) => setTimeout(r, ms));
const rejectsCode = async (p, code) => {
  try { await p; } catch (e) { assert.equal(e.code, code, e.message); return; }
  assert.fail(`expected ${code}`);
};

function lab() {
  const w = world();
  const net = new LocalNetwork(w.svc, { latency: [1, 4], methods: [...CLIENT_METHODS, ...MODERATOR_METHODS] });
  return { ...w, net };
}

test('attack: only client methods are reachable; internals and seeding are not', async () => {
  const { net, T } = lab();
  const link = net.link('attacker');
  for (const m of ['createTestAccount', 'signInTestAccount', '_actor', '_emit', 'toJSON', 'subscribe', 'constructor', '__proto__', 'hasOwnProperty']) {
    await rejectsCode(link.request(m, T.star, { key: 'mod' }), 'forbidden');
  }
});

test('attack: forged, missing and non-string tokens are rejected', async () => {
  const { net } = lab();
  const link = net.link('attacker');
  for (const tok of ['tok_forged', '', null, 42, { id: 'acc_x' }, ['tok']]) {
    await rejectsCode(link.request('listHushmates', tok), 'not-signed-in');
  }
});

test('attack: a caller-supplied identity is ignored (identity comes from the token)', async () => {
  const w = lab();
  const cid = connect(w);
  const cloudId = Object.values(w.svc.s.accounts).find((a) => a.key === 'cloud').id;
  const link = w.net.link('moon');
  // Star pretends to be Cloud: as a non-member, the Hushspace doesn't exist for them
  await rejectsCode(link.request('sendMessage', w.T.star, { conversationId: cid, body: 'hi', clientId: 'forge-0001', from: cloudId, accountId: cloudId }), 'not-found');
  // Moon tries to send "as" Cloud: the message is still Moon's
  const r = await link.request('sendMessage', w.T.moon, { conversationId: cid, body: 'hi', clientId: 'forge-0002', from: cloudId, senderId: cloudId });
  assert.equal(r.message.mine, true);
  assert.equal(w.svc.s.messages[cid][0].from, Object.values(w.svc.s.accounts).find((a) => a.key === 'moon').id);
});

test('attack: invitations and moderation cannot be operated on someone else’s behalf', async () => {
  const w = lab();
  const link = w.net.link('x');
  const inv = await link.request('sendInvitation', w.T.moon, { handle: w.handle('cloud') });
  await rejectsCode(link.request('respondToInvitation', w.T.star, { id: inv.id, accept: true }), 'not-found');
  await rejectsCode(link.request('respondToInvitation', w.T.moon, { id: inv.id, accept: true }), 'not-found');
  await rejectsCode(link.request('cancelInvitation', w.T.cloud, { id: inv.id }), 'not-found');
  await rejectsCode(link.request('modListReports', w.T.moon), 'forbidden');
  await rejectsCode(link.request('modAuditLog', w.T.cloud), 'forbidden');
  // the invitation list of a third person shows nothing of it
  const starView = await link.request('listInvitations', w.T.star);
  assert.equal(starView.invitations.length, 0);
});

test('attack: oversized and malformed arguments fail closed', async () => {
  const w = lab();
  const cid = connect(w);
  const link = w.net.link('x');
  await rejectsCode(link.request('sendMessage', w.T.moon, { conversationId: cid, body: 'x'.repeat(50000), clientId: 'big-000001' }), 'text-too-long');
  await rejectsCode(link.request('sendMessage', w.T.moon, { conversationId: { $ne: null }, body: 'hi', clientId: 'obj-000001' }), 'not-found');
  await rejectsCode(link.request('getMessages', w.T.moon, { conversationId: ['hs'] }), 'not-found');
  const page = await link.request('getMessages', w.T.moon, { conversationId: cid, limit: 1e9 });
  assert.ok(page.messages.length <= 30);
  await rejectsCode(link.request('saveProfile', w.T.moon, { pseudonym: '<script>x</script>' }), 'invalid');
});

test('realtime: events reach only the two members of a Hushspace', async () => {
  const w = lab();
  const cid = connect(w);
  const got = { moon: [], cloud: [], star: [], mod: [] };
  for (const k of Object.keys(got)) w.net.link(k).subscribe(w.T[k], (ev) => got[k].push(ev));
  await w.net.link('moon').request('sendMessage', w.T.moon, { conversationId: cid, body: 'only for Cloud', clientId: 'rt-0000001' });
  await settle();
  assert.equal(got.cloud.filter((e) => e.type === 'message').length, 1);
  assert.equal(got.moon.filter((e) => e.type === 'message').length, 1);
  assert.equal(got.star.length, 0);
  assert.equal(got.mod.length, 0);
  assert.equal(got.cloud[0].message.mine, false);
  assert.ok(!JSON.stringify(got.cloud).includes('acc_'));
});

test('client: two devices exchange messages in order, with unread counts', async () => {
  const w = lab();
  const cid = connect(w);
  const moon = new HushmatesClient(w.net.link('moon'), w.T.moon);
  const cloud = new HushmatesClient(w.net.link('cloud'), w.T.cloud);
  await Promise.all([moon.start(), cloud.start()]);
  await moon.openConversation(cid);
  await moon.sendMessage(cid, 'I’ve had a difficult day at work.');
  await settle(150);   // event, then a debounced refresh of the list
  assert.equal(cloud.state.hushmates[0].unread, 1);
  await cloud.openConversation(cid);
  await cloud.sendMessage(cid, 'That sounds tough. Would you like to talk about what happened?');
  await settle();
  const seq = (c) => c.state.conversations[cid].messages.map((m) => [m.seq, m.mine]);
  assert.deepEqual(seq(moon), [[1, true], [2, false]]);
  assert.deepEqual(seq(cloud), [[1, false], [2, true]]);
  await settle(120);
  assert.equal(cloud.state.hushmates[0].unread, 0);
});

test('client: offline send fails visibly and a retry delivers exactly once', async () => {
  const w = lab();
  const cid = connect(w);
  const link = w.net.link('moon');
  const moon = new HushmatesClient(link, w.T.moon);
  await moon.start();
  await moon.openConversation(cid);
  link.setOnline(false);
  const r = await moon.sendMessage(cid, 'are you there?');
  assert.equal(r.ok, false);
  const item = moon.state.conversations[cid].outbox[0];
  assert.equal(item.state, 'failed');
  link.setOnline(true);
  await moon.retry(cid, item.clientId);
  await moon.retry(cid, item.clientId);   // a double tap is harmless
  assert.equal(w.svc.s.messages[cid].length, 1);
  assert.equal(moon.state.conversations[cid].outbox.length, 0);
});

test('client: a lost response followed by a retry never duplicates the message', async () => {
  const w = lab();
  const cid = connect(w);
  const link = w.net.link('moon');
  const moon = new HushmatesClient(link, w.T.moon);
  await moon.start();
  await moon.openConversation(cid);
  link.loseNextResponse = true;
  const r = await moon.sendMessage(cid, 'did this arrive?');
  assert.equal(r.ok, false);
  assert.equal(w.svc.s.messages[cid].length, 1);        // it did arrive
  // the realtime catch-up can reconcile the lost send before anyone retries (then the outbox is already
  // empty); either way, retrying must never create a second copy
  const item = moon.state.conversations[cid].outbox[0];
  if (item) await moon.retry(cid, item.clientId);
  await settle();
  assert.equal(w.svc.s.messages[cid].length, 1);
  assert.equal(moon.state.conversations[cid].messages.length, 1);
  assert.equal(moon.state.conversations[cid].outbox.length, 0);
});

test('client: after a network interruption the other device catches up in order', async () => {
  const w = lab();
  const cid = connect(w);
  const cloudLink = w.net.link('cloud');
  const moon = new HushmatesClient(w.net.link('moon'), w.T.moon);
  const cloud = new HushmatesClient(cloudLink, w.T.cloud);
  await Promise.all([moon.start(), cloud.start()]);
  await Promise.all([moon.openConversation(cid), cloud.openConversation(cid)]);
  cloudLink.setOnline(false);
  for (const t of ['one', 'two', 'three']) await moon.sendMessage(cid, t);
  await settle();
  assert.equal(cloud.state.conversations[cid].messages.length, 0);
  cloudLink.setOnline(true);
  await settle(80);
  assert.deepEqual(cloud.state.conversations[cid].messages.map((m) => m.body), ['one', 'two', 'three']);
});

test('client: a rule refusal is not retried and explains itself', async () => {
  const w = lab();
  const cid = connect(w);
  const moon = new HushmatesClient(w.net.link('moon'), w.T.moon);
  await moon.start();
  const pre = await moon.sendMessage(cid, 'add me on discord');
  assert.equal(pre.ok, false);
  assert.equal(pre.error.code, 'contact');
  w.svc.block(w.T.cloud, { handle: w.handle('moon') });
  const r = await moon.sendMessage(cid, 'hello?');
  assert.equal(r.ok, false);
  assert.equal(r.error.code, 'closed');
  assert.equal(moon.state.conversations[cid].outbox.length, 0);
});
