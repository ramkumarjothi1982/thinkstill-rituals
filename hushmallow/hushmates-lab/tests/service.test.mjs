// Rules of Hushmates, tested against the service (the enforcement point).
// node --test hushmallow/hushmates-lab/tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, connect, throwsCode } from './helpers.mjs';

const json = (x) => JSON.stringify(x);

test('identity: two people get separate identities, and nobody sees registration details', () => {
  const w = world();
  const moon = w.svc.me(w.T.moon);
  const cloud = w.svc.me(w.T.cloud);
  assert.equal(moon.profile.pseudonym, 'MoonMallow');
  assert.equal(cloud.profile.pseudonym, 'CloudMallow');
  assert.notEqual(moon.profile.handle, cloud.profile.handle);
  // nothing a member can read contains another person's e-mail or account id
  const cid = connect(w);
  w.svc.sendMessage(w.T.cloud, { conversationId: cid, body: 'hello', clientId: 'cloud-0001' });
  const seenByMoon = json([
    w.svc.discover(w.T.moon), w.svc.listInvitations(w.T.moon), w.svc.listHushmates(w.T.moon),
    w.svc.getMessages(w.T.moon, { conversationId: cid }), w.svc.exportMyData(w.T.moon),
  ]);
  const cloudAcc = Object.values(w.svc.s.accounts).find((a) => a.key === 'cloud');
  assert.ok(!seenByMoon.includes('cloud.test@example.invalid'));
  assert.ok(!seenByMoon.includes(cloudAcc.id));
  assert.ok(!seenByMoon.includes('@example.invalid'));
});

test('identity: pseudonyms are validated and unique; avatars must be official Mallows', () => {
  const w = world();
  throwsCode(() => w.svc.saveProfile(w.T.star, { pseudonym: 'cloudmallow' }), 'name-taken');
  throwsCode(() => w.svc.saveProfile(w.T.star, { pseudonym: 'me@mail.com' }), 'invalid');
  throwsCode(() => w.svc.saveProfile(w.T.star, { avatar: 'https://evil.example/me.jpg' }), 'invalid');
  throwsCode(() => w.svc.saveProfile(w.T.star, { photo: 'x' } && { avatar: 'selfie' }), 'invalid');
  throwsCode(() => w.svc.saveProfile(w.T.star, { interests: ['Books', 'Hacking'] }), 'invalid');
  // unknown fields are ignored, never stored
  w.svc.saveProfile(w.T.star, { email: 'leak@x.com', realName: 'Real Person' });
  assert.ok(!json(w.svc.s.profiles).includes('leak@x.com'));
});

test('discovery: off by default, and only people who opted in appear', () => {
  const w = world();
  assert.equal(w.svc.me(w.T.moon).profile.discoverable, false);
  const names = (tok) => w.svc.discover(tok).cards.map((c) => c.pseudonym).sort();
  assert.deepEqual(names(w.T.moon), ['CloudMallow', 'FernMallow', 'StarMallow']);   // not DreamMallow (hidden), not self
  assert.ok(!names(w.T.cloud).includes('MoonMallow'));
  w.svc.saveProfile(w.T.moon, { discoverable: true });
  assert.ok(names(w.T.cloud).includes('MoonMallow'));
  w.svc.saveProfile(w.T.moon, { discoverable: false });                              // quick way to become undiscoverable
  assert.ok(!names(w.T.cloud).includes('MoonMallow'));
});

test('discovery: cards carry only public fields; filters are the person’s own choices', () => {
  const w = world();
  const card = w.svc.discover(w.T.moon).cards.find((c) => c.pseudonym === 'CloudMallow');
  assert.deepEqual(Object.keys(card).sort(), ['acceptingInvites', 'availability', 'avatar', 'handle', 'interests', 'invitation', 'language', 'pseudonym', 'style', 'test'].sort());
  assert.deepEqual(w.svc.discover(w.T.moon, { style: 'deep' }).cards.map((c) => c.pseudonym), ['StarMallow']);
  assert.deepEqual(w.svc.discover(w.T.moon, { interests: ['Music'] }).cards.map((c) => c.pseudonym), ['CloudMallow']);
  // ordering is deterministic
  assert.deepEqual(w.svc.discover(w.T.moon).cards, w.svc.discover(w.T.moon).cards);
});

test('discovery: hidden people cannot be invited through the discovery route', () => {
  const w = world();
  throwsCode(() => w.svc.sendInvitation(w.T.moon, { handle: w.handle('dream') }), 'not-available');
  throwsCode(() => w.svc.sendInvitation(w.T.moon, { handle: w.handle('fern') }), 'not-available');   // invitations paused
  throwsCode(() => w.svc.sendInvitation(w.T.moon, { handle: 'h_doesnotexist' }), 'not-available');
});

test('invitations: accept opens exactly one two-person Hushspace', () => {
  const w = world();
  const inv = w.svc.sendInvitation(w.T.moon, { handle: w.handle('cloud') });
  assert.equal(inv.status, 'pending');
  assert.equal(w.svc.listHushmates(w.T.moon).hushmates.length, 0);   // nothing before acceptance
  const got = w.svc.listInvitations(w.T.cloud).invitations[0];
  assert.equal(got.direction, 'received');
  assert.equal(got.other.pseudonym, 'MoonMallow');
  const done = w.svc.respondToInvitation(w.T.cloud, { id: got.id, accept: true });
  assert.equal(done.status, 'accepted');
  const conv = w.svc.s.conversations[done.conversationId];
  assert.equal(conv.members.length, 2);
  assert.equal(w.svc.listHushmates(w.T.moon).hushmates[0].other.pseudonym, 'CloudMallow');
});

test('invitations: decline, duplicates, self, cancel, expiry', () => {
  const w = world();
  const inv = w.svc.sendInvitation(w.T.moon, { handle: w.handle('cloud') });
  throwsCode(() => w.svc.sendInvitation(w.T.moon, { handle: w.handle('cloud') }), 'already-invited');
  throwsCode(() => w.svc.sendInvitation(w.T.cloud, { handle: w.svc.me(w.T.moon).profile.handle }), 'not-available');   // Moon isn't discoverable
  w.svc.saveProfile(w.T.moon, { discoverable: true });
  throwsCode(() => w.svc.sendInvitation(w.T.cloud, { handle: w.handle('moon') }), 'they-invited-you');
  throwsCode(() => w.svc.sendInvitation(w.T.moon, { handle: w.handle('moon') }), 'self');
  throwsCode(() => w.svc.respondToInvitation(w.T.moon, { id: inv.id, accept: true }), 'not-found');   // can't accept your own
  w.svc.respondToInvitation(w.T.cloud, { id: inv.id, accept: false });
  // after a decline the sender can't keep asking
  throwsCode(() => w.svc.sendInvitation(w.T.moon, { handle: w.handle('cloud') }), 'not-available');
  assert.ok(!w.svc.discover(w.T.moon).cards.some((c) => c.pseudonym === 'CloudMallow'));
  // cancel + expiry
  const inv2 = w.svc.sendInvitation(w.T.moon, { handle: w.handle('star') });
  assert.equal(w.svc.cancelInvitation(w.T.moon, { id: inv2.id }).status, 'cancelled');
  const inv3 = w.svc.sendInvitation(w.T.moon, { handle: w.handle('star') });
  w.advance(8 * 24 * 3600e3);
  throwsCode(() => w.svc.respondToInvitation(w.T.star, { id: inv3.id, accept: true }), 'expired');
});

test('invitations: private invitation code reaches a hidden person, and is rate-limited', () => {
  const w = world();
  const code = w.svc.me(w.T.dream).profile.inviteCode;
  const inv = w.svc.redeemInviteCode(w.T.moon, { code: code.toLowerCase().replace('-', ' ') });
  assert.equal(inv.other.pseudonym, 'DreamMallow');
  for (let i = 0; i < 9; i++) throwsCode(() => w.svc.redeemInviteCode(w.T.moon, { code: `ZZZZ-${i}${i}${i}${i}` }), 'bad-code');
  throwsCode(() => w.svc.redeemInviteCode(w.T.moon, { code }), 'rate-limited');
  // regenerating retires the old code
  const old = w.svc.me(w.T.star).profile.inviteCode;
  w.svc.regenerateInviteCode(w.T.star);
  throwsCode(() => w.svc.redeemInviteCode(w.T.cloud, { code: old }), 'bad-code');
});

test('connection limit: a burst of invitations cannot exceed the maximum', () => {
  const w = world({ limits: { maxActiveHushmates: 2 } });
  w.svc.saveProfile(w.T.dream, { discoverable: true });
  const invs = ['cloud', 'star', 'dream'].map((k) => w.svc.sendInvitation(w.T.moon, { handle: w.handle(k) }));
  w.svc.respondToInvitation(w.T.cloud, { id: invs[0].id, accept: true });
  w.svc.respondToInvitation(w.T.star, { id: invs[1].id, accept: true });
  throwsCode(() => w.svc.respondToInvitation(w.T.dream, { id: invs[2].id, accept: true }), 'their-limit-reached');
  assert.equal(w.svc.listHushmates(w.T.moon).active, 2);
  throwsCode(() => w.svc.sendInvitation(w.T.moon, { handle: w.handle('fern') }), 'limit-reached');
});

test('messaging: impossible before mutual acceptance, and only for the two members', () => {
  const w = world();
  const inv = w.svc.sendInvitation(w.T.moon, { handle: w.handle('cloud') });
  // there is no conversation yet; guessing ids gets nowhere
  throwsCode(() => w.svc.sendMessage(w.T.moon, { conversationId: 'hs_guess', body: 'hi', clientId: 'moon-0001' }), 'not-found');
  const cid = w.svc.respondToInvitation(w.T.cloud, { id: inv.id, accept: true }).conversationId;
  // a third person can't read, write, change intent or report into it
  for (const fn of [
    () => w.svc.getMessages(w.T.star, { conversationId: cid }),
    () => w.svc.sendMessage(w.T.star, { conversationId: cid, body: 'hi', clientId: 'star-0001' }),
    () => w.svc.getConversation(w.T.star, { conversationId: cid }),
    () => w.svc.setIntent(w.T.star, { conversationId: cid, intent: 'listen' }),
    () => w.svc.markRead(w.T.star, { conversationId: cid, seq: 1 }),
    () => w.svc.report(w.T.star, { conversationId: cid, category: 'spam' }),
    () => w.svc.getMessages(w.T.mod, { conversationId: cid }),   // moderators can't browse either
  ]) throwsCode(fn, 'not-found');
});

test('messaging: bidirectional, ordered, paginated, with unread counts and no read receipts', () => {
  const w = world({ limits: { pageSize: 5 } });
  const cid = connect(w);
  w.svc.sendMessage(w.T.moon, { conversationId: cid, body: 'I’ve had a difficult day at work.', clientId: 'moon-0001' });
  w.svc.sendMessage(w.T.cloud, { conversationId: cid, body: 'That sounds tough. Would you like to talk about what happened?', clientId: 'cloud-0001' });
  for (let i = 0; i < 6; i++) w.svc.sendMessage(w.T.moon, { conversationId: cid, body: `line ${i}`, clientId: `moon-x${i}xxxxx` });
  const page = w.svc.getMessages(w.T.cloud, { conversationId: cid });
  assert.equal(page.messages.length, 5);
  assert.equal(page.hasMore, true);
  const older = w.svc.getMessages(w.T.cloud, { conversationId: cid, beforeSeq: page.messages[0].seq });
  const all = [...older.messages, ...page.messages];
  assert.deepEqual(all.map((m) => m.seq), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(all[1].body, 'That sounds tough. Would you like to talk about what happened?');
  assert.equal(all[1].mine, true);
  // Cloud's own reply counts as having read up to it: 6 unread after it
  assert.equal(w.svc.listHushmates(w.T.cloud).hushmates[0].unread, 6);
  const moonBefore = json([w.svc.listHushmates(w.T.moon), w.svc.getMessages(w.T.moon, { conversationId: cid })]);
  w.svc.markRead(w.T.cloud, { conversationId: cid, seq: 8 });
  assert.equal(w.svc.listHushmates(w.T.cloud).hushmates[0].unread, 0);
  // no read receipts: nothing Moon can see changes when Cloud reads
  assert.equal(json([w.svc.listHushmates(w.T.moon), w.svc.getMessages(w.T.moon, { conversationId: cid })]), moonBefore);
});

test('messaging: duplicate-safe sends, size and text rules, rate limits', () => {
  const w = world();
  const cid = connect(w);
  const a = w.svc.sendMessage(w.T.moon, { conversationId: cid, body: 'hello', clientId: 'same-client-id' });
  const b = w.svc.sendMessage(w.T.moon, { conversationId: cid, body: 'hello', clientId: 'same-client-id' });
  assert.equal(a.message.id, b.message.id);
  assert.equal(b.duplicate, true);
  assert.equal(w.svc.getMessages(w.T.moon, { conversationId: cid }).messages.length, 1);
  throwsCode(() => w.svc.sendMessage(w.T.moon, { conversationId: cid, body: 'x'.repeat(1001), clientId: 'long-0001' }), 'text-too-long');
  throwsCode(() => w.svc.sendMessage(w.T.moon, { conversationId: cid, body: 'see https://example.com', clientId: 'link-0001' }), 'text-link');
  throwsCode(() => w.svc.sendMessage(w.T.moon, { conversationId: cid, body: 'text me 555 123 4567', clientId: 'phone-0001' }), 'text-contact');
  throwsCode(() => w.svc.sendMessage(w.T.moon, { conversationId: cid, body: '   ', clientId: 'empty-0001' }), 'text-empty');
  throwsCode(() => w.svc.sendMessage(w.T.moon, { conversationId: cid, body: 'hi', clientId: 'bad id!' }), 'invalid');
  for (let i = 1; i < 20; i++) w.svc.sendMessage(w.T.moon, { conversationId: cid, body: `m${i}`, clientId: `rate-${i}-xxxxx` });
  throwsCode(() => w.svc.sendMessage(w.T.moon, { conversationId: cid, body: 'one more', clientId: 'rate-over-xx' }), 'rate-limited');
  w.advance(61e3);
  w.svc.sendMessage(w.T.moon, { conversationId: cid, body: 'after a pause', clientId: 'rate-after-x' });
});

test('messaging: text is stored as text (no markup is interpreted), invisible characters removed', () => {
  const w = world();
  const cid = connect(w);
  const r = w.svc.sendMessage(w.T.moon, { conversationId: cid, body: '<img src=x onerror=alert(1)>‮hi​', clientId: 'xss-00001' });
  assert.equal(r.message.body, '<img src=x onerror=alert(1)>hi');
});

test('conversation intent and quiet mode are visible to both; mute is private', () => {
  const w = world();
  const cid = connect(w);
  w.svc.setIntent(w.T.moon, { conversationId: cid, intent: 'perspective' });
  assert.equal(w.svc.getConversation(w.T.cloud, { conversationId: cid }).intent.theirs, 'perspective');
  assert.equal(w.svc.getConversation(w.T.moon, { conversationId: cid }).intent.mine, 'perspective');
  throwsCode(() => w.svc.setIntent(w.T.moon, { conversationId: cid, intent: 'therapy' }), 'invalid');
  w.svc.setConversationQuiet(w.T.moon, { conversationId: cid, quiet: true });
  assert.equal(w.svc.getConversation(w.T.cloud, { conversationId: cid }).quiet.theirs, true);
  w.svc.setConversationMuted(w.T.moon, { conversationId: cid, muted: true });
  assert.equal(w.svc.getConversation(w.T.cloud, { conversationId: cid }).muted, false);
  // quiet mode is a boundary, not a block: messages still flow
  w.svc.sendMessage(w.T.cloud, { conversationId: cid, body: 'No rush at all.', clientId: 'cloud-q-001' });
});

test('blocking: no more messages either way, no invitations, no discovery, survives unblock', () => {
  const w = world();
  const cid = connect(w);
  w.svc.sendMessage(w.T.moon, { conversationId: cid, body: 'hi', clientId: 'moon-b-001' });
  w.svc.block(w.T.moon, { handle: w.handle('cloud') });
  throwsCode(() => w.svc.sendMessage(w.T.cloud, { conversationId: cid, body: 'hello?', clientId: 'cloud-b-001' }), 'closed');
  throwsCode(() => w.svc.sendMessage(w.T.moon, { conversationId: cid, body: 'hello?', clientId: 'moon-b-002' }), 'closed');
  w.svc.saveProfile(w.T.moon, { discoverable: true });
  throwsCode(() => w.svc.sendInvitation(w.T.cloud, { handle: w.handle('moon') }), 'not-available');
  assert.ok(!w.svc.discover(w.T.cloud).cards.some((c) => c.pseudonym === 'MoonMallow'));
  assert.equal(w.svc.listHushmates(w.T.moon).active, 0);
  // the blocked person sees a closed Hushspace, not "you were blocked"
  const seen = w.svc.getConversation(w.T.cloud, { conversationId: cid });
  assert.equal(seen.open, false);
  assert.equal(seen.closedByMe, null);
  // unblocking doesn't let them reach out first…
  w.svc.unblock(w.T.moon, { handle: w.handle('cloud') });
  throwsCode(() => w.svc.sendInvitation(w.T.cloud, { handle: w.handle('moon') }), 'not-available');
  // …until the unblocker explicitly invites them
  const inv = w.svc.sendInvitation(w.T.moon, { handle: w.handle('cloud') });
  w.svc.respondToInvitation(w.T.cloud, { id: inv.id, accept: true });
  assert.equal(w.svc.listHushmates(w.T.moon).active, 1);
});

test('disconnect: either person can leave without explanation; no immediate re-invitation', () => {
  const w = world();
  const cid = connect(w);
  w.svc.removeHushmate(w.T.cloud, { conversationId: cid });
  throwsCode(() => w.svc.sendMessage(w.T.moon, { conversationId: cid, body: 'wait', clientId: 'moon-d-001' }), 'closed');
  throwsCode(() => w.svc.sendInvitation(w.T.moon, { handle: w.handle('cloud') }), 'not-available');
  w.advance(31 * 24 * 3600e3);
  w.svc.sendInvitation(w.T.moon, { handle: w.handle('cloud') });   // after the quiet period, an ordinary invitation
});

test('reports: confirmation, evidence snapshot survives deletion, reporter stays anonymous to the subject', () => {
  const w = world();
  const cid = connect(w);
  const m = w.svc.sendMessage(w.T.cloud, { conversationId: cid, body: 'something unkind', clientId: 'cloud-r-001' }).message;
  const r = w.svc.report(w.T.moon, { conversationId: cid, messageId: m.id, category: 'harassment', details: 'this hurt' });
  assert.equal(r.received, true);
  assert.match(r.expectation, /human|person/i);
  w.svc.deleteMessage(w.T.cloud, { conversationId: cid, messageId: m.id });
  const rep = w.svc.modGetReport(w.T.mod, { id: r.reportId });
  assert.equal(rep.evidence[0].body, 'something unkind');
  assert.equal(rep.kind, 'message');
  // you can't report your own message as evidence against someone else
  const mine = w.svc.sendMessage(w.T.moon, { conversationId: cid, body: 'mine', clientId: 'moon-r-001' }).message;
  throwsCode(() => w.svc.report(w.T.moon, { conversationId: cid, messageId: mine.id, category: 'spam' }), 'not-found');
  assert.ok(!json(w.svc.exportMyData(w.T.cloud)).includes(r.reportId));
});

test('moderation: moderator-only, audited, and restrictions take effect', () => {
  const w = world();
  const cid = connect(w);
  w.svc.report(w.T.moon, { conversationId: cid, category: 'scam' });
  throwsCode(() => w.svc.modListReports(w.T.moon), 'forbidden');
  throwsCode(() => w.svc.modSetAccountState(w.T.cloud, { ref: 'x', state: 'suspended', reason: 'x' }), 'forbidden');
  const list = w.svc.modListReports(w.T.mod).reports;
  assert.equal(list.length, 1);
  const rep = w.svc.modUpdateReport(w.T.mod, { id: list[0].id, status: 'in-review', note: 'looking', assignToMe: true });
  assert.equal(rep.status, 'in-review');
  throwsCode(() => w.svc.modSetAccountState(w.T.mod, { ref: rep.subject.ref, state: 'suspended', reason: '' }), 'invalid');
  w.svc.modSetAccountState(w.T.mod, { ref: rep.subject.ref, state: 'suspended', reason: 'Scam attempt confirmed' });
  throwsCode(() => w.svc.sendMessage(w.T.cloud, { conversationId: cid, body: 'hi', clientId: 'cloud-s-001' }), 'account-inactive');
  throwsCode(() => w.svc.discover(w.T.cloud), 'account-inactive');
  const audit = w.svc.modAuditLog(w.T.mod).entries.map((e) => e.action);
  for (const a of ['report.created', 'mod.list-reports', 'mod.update-report', 'mod.account-state']) assert.ok(audit.includes(a), a);
});

test('urgent report categories rise to the top of the queue', () => {
  const w = world();
  const cid = connect(w);
  w.svc.report(w.T.moon, { conversationId: cid, category: 'spam' });
  w.advance(1000);
  w.svc.report(w.T.cloud, { conversationId: cid, category: 'minor' });
  assert.equal(w.svc.modListReports(w.T.mod).reports[0].category, 'minor');
});

test('deleted identity: profile, handle and sent words are gone; sessions end', () => {
  const w = world();
  const cid = connect(w);
  w.svc.sendMessage(w.T.cloud, { conversationId: cid, body: 'my words', clientId: 'cloud-del-1' });
  throwsCode(() => w.svc.deleteMyIdentity(w.T.cloud, {}), 'invalid');
  w.svc.deleteMyIdentity(w.T.cloud, { confirm: 'DELETE' });
  throwsCode(() => w.svc.me(w.T.cloud), 'not-signed-in');
  const msgs = w.svc.getMessages(w.T.moon, { conversationId: cid }).messages;
  assert.equal(msgs[0].body, '');
  assert.equal(msgs[0].deleted, true);
  assert.equal(w.svc.getConversation(w.T.moon, { conversationId: cid }).other.pseudonym, 'A former Mallow');
  assert.ok(!w.svc.discover(w.T.moon).cards.some((c) => c.pseudonym === 'CloudMallow'));
  // the name is free again
  w.svc.saveProfile(w.T.star, { pseudonym: 'CloudMallow' });
});

test('own data export contains your Hushspaces and nothing about other people beyond pseudonyms', () => {
  const w = world();
  const cid = connect(w);
  w.svc.sendMessage(w.T.cloud, { conversationId: cid, body: 'hi Moon', clientId: 'cloud-ex-01' });
  const data = w.svc.exportMyData(w.T.moon);
  assert.equal(data.hushspaces[0].messages[0].body, 'hi Moon');
  assert.ok(!json(data).includes('cloud.test@example.invalid'));
});
