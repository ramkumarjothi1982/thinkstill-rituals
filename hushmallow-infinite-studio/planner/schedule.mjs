// Posting rules for one channel, checked in post order (story-library
// variationRules + PHASE2-PLAN G-SPEC): sequencing (no back-to-back
// template/Mallow/ritual/gag, Mallow quotas, feeling-family balance,
// template caps per week), the cadence cap, copy cooldowns and reservations,
// and structural distance to the last 14 days of posts.
//
// History = the channel's published posts from the ledger plus the posts
// planned earlier in the same batch. The Mallow rules apply to the unlocked
// set (OWNER-DECISIONS Q1 default): with one Mallow unlocked there is no
// "different Mallow" rule, and the per-10 cap scales to max(3, ceil(10/n)).
// A Mallow's absence streak counts from its last post or from its unlock date
// (capabilities mallows.<id>.unlockedOn), so a newly unlocked Mallow is not
// instantly "overdue".

import { visibleSlots } from './fingerprint.mjs';
import { distanceOk, sameHook } from './distance.mjs';
import { loadPolicy } from './policy.mjs';

const DAY = 86400000;
/** Whole UTC day number of 'YYYY-MM-DD' or an ISO timestamp. */
export function dayNumber(s) {
  const t = Date.parse(String(s).length === 10 ? `${s}T00:00:00Z` : s);
  if (Number.isNaN(t)) throw new Error(`not a date: ${s}`);
  return Math.floor(t / DAY);
}
/** 'YYYY-MM-DD' of day number n. */
export const dateOfDay = (n) => new Date(n * DAY).toISOString().slice(0, 10);

/** The copy strings of a spec as ledger copy-usage entries { kind, text }. */
export function copyTexts(spec) {
  const c = spec.copy, out = [{ kind: 'hook', text: c.hook.join(' / ') }];
  for (const l of c.lines) out.push({ kind: 'line', text: l });
  out.push({ kind: c.end.kind === 'closer' ? 'closer' : 'resolution', text: c.end.text.join(' / ') });
  if (c.nameWord) out.push({ kind: 'nameWord', text: c.nameWord });
  return out;
}

/** A spec as a post of the channel history. */
export function postOf(spec, lib) {
  const t = lib.template(spec.template);
  return {
    id: spec.id, fingerprint: spec.fingerprint, day: dayNumber(spec.plannedFor), visible: visibleSlots(spec),
    family: t.feeling.family, valence: t.feeling.valence, endKind: spec.copy.end.kind,
  };
}

/**
 * The channel context a production spec is checked against.
 * → { channel, batch, history: posts by day, copyUsage: [{kind,text,day}], reservations, unlocked, unlockedOn }
 */
export function channelContext({ ledger, channel, batch = null, batchSpecs = [], lib, caps }) {
  const history = [];
  for (const p of ledger.published) {
    if (p.channel !== channel) continue;
    history.push({ id: p.id, fingerprint: p.fingerprint, day: dayNumber(p.postedAt), visible: p.visible, family: p.family, valence: p.valence, endKind: p.visible?.end?.kind || null });
  }
  const copyUsage = ledger.copyUsage.filter((u) => u.channel === channel).map((u) => ({ kind: u.kind, text: u.text, id: u.id, day: dayNumber(u.at) }));
  history.sort((a, b) => a.day - b.day);              // stable: same-day posts keep their order
  const unlocked = caps.unlocked();
  const unlockedOn = Object.fromEntries(unlocked.map((m) => [m, caps.raw.mallows?.[m]?.unlockedOn ? dayNumber(caps.raw.mallows[m].unlockedOn) : -Infinity]));
  const reservations = ledger.reservations.filter((r) => r.channel === channel && r.batch !== batch).map((r) => ({ ...r, untilDay: dayNumber(r.until) }));
  const ctx = { channel, batch, history, copyUsage, reservations, unlocked, unlockedOn };
  // a batch post that is already recorded as published is in the history once, as the real post
  // (counting it again as planned would double its cadence, cooldown and quota weight)
  const posted = new Set(history.map((p) => p.id));
  for (const s of batchSpecs) if (!posted.has(s.id)) recordPlanned(ctx, s, lib);
  return ctx;
}

/** Add a planned spec to a channel context (after the posts of its day). */
export function recordPlanned(ctx, spec, lib) {
  const post = postOf(spec, lib);
  let i = ctx.history.length;
  while (i > 0 && ctx.history[i - 1].day > post.day) i--;
  ctx.history.splice(i, 0, post);
  for (const u of copyTexts(spec)) ctx.copyUsage.push({ ...u, id: spec.id, day: post.day });
}

/** Posts-per-week cap for the unlocked set. */
export const cadenceCap = (nUnlocked, policy = loadPolicy()) =>
  (nUnlocked < policy.cadence.fewMallowsBelow ? policy.cadence.maxPerWeekFewMallows : policy.cadence.maxPerWeek);

/**
 * Why one copy string may not be used on `day` (cooldown or reservation), or
 * null. kind: 'hook' (text = lines array) | 'line' | 'resolution' | 'closer' |
 * 'nameWord'. The sampler pre-filters with this; checkSchedule applies it too.
 * selfId: the spec being judged, whose own (already recorded) use never counts.
 */
export function copyBlock(kind, text, day, ctx, policy = loadPolicy(), selfId = null) {
  const C = policy.cooldowns;
  const used = selfId ? ctx.copyUsage.filter((u) => u.id !== selfId) : ctx.copyUsage;
  const flat = Array.isArray(text) ? text.join(' / ') : text;
  if (kind === 'hook') {
    const hit = used.find((u) => u.kind === 'hook' && u.day <= day && day - u.day < C.hookDays && sameHook(u.text, text, policy));
    if (hit) return { rule: 'cooldown:hook', message: `hook "${flat}" is the same as "${hit.text}" used ${day - hit.day} days ago (cooldown ${C.hookDays} days)` };
  } else if (kind === 'line') {
    const uses = used.filter((u) => u.kind === 'line' && u.text === flat && u.day <= day && day - u.day < C.lineDays).length + 1;
    if (uses > C.lineUses) return { rule: 'cooldown:line', message: `line "${flat}" would be used ${uses} times in ${C.lineDays} days (max ${C.lineUses})` };
  } else if (kind === 'resolution') {
    const uses = used.filter((u) => u.kind === 'resolution' && u.text === flat && u.day <= day && day - u.day < C.resolutionDays).length + 1;
    if (uses > C.resolutionUses) return { rule: 'cooldown:resolution', message: `resolution "${flat}" would be used ${uses} times in ${C.resolutionDays} days (max ${C.resolutionUses})` };
  }
  const r = ctx.reservations.find((x) => x.kind === kind && x.text === flat && x.untilDay >= day);
  if (r) return { rule: 'reservation', message: `${kind} "${flat}" is reserved by batch ${r.batch} until ${r.until}` };
  return null;
}

/** Would a brand closer on `day` make a run longer than policy allows? */
export function closerRunBlocked(day, ctx, policy = loadPolicy(), selfId = null) {
  const k = policy.sampling.closer.maxConsecutive;
  const tail = ctx.history.filter((p) => p.day <= day && p.id !== selfId).slice(-k);
  return tail.length === k && tail.every((p) => p.endKind === 'closer');
}

/**
 * The sequencing rules as per-slot predicates for a post on `day`, so the
 * sampler can exclude options before it picks (constraint-guided sampling)
 * and checkSchedule can judge a finished spec with the same code. Each
 * predicate returns null (allowed) or { rule, message }.
 *   template(t)  repeats, template-per-week cap, feeling-family and valence balance
 *   mallow(m)    repeats, quota per 10, absence streaks, rotation feasibility
 *   ritual(id), gag(id)  back-to-back repeats
 */
export function sequenceFilter(ctx, day, { policy = loadPolicy(), selfId = null } = {}) {
  const S = policy.sequencing;
  const H = ctx.history.filter((p) => p.day <= day && p.id !== selfId);      // posts before (or on) the candidate's day, never itself
  const last = H[H.length - 1];
  const n = ctx.unlocked.length;
  const repeat = (slot, v) => (last && last.visible[slot] === v && S.noRepeat.includes(slot) && !(slot === 'mallow' && n < 2)
    ? { rule: `sequence:repeat-${slot}`, message: `same ${slot} (${v}) as the previous post ${last.id}` } : null);
  const week = H.filter((p) => day - p.day < 7);
  const famWin = H.slice(-(S.familyWindow - 1));
  const streak = (m) => { let k = 0; for (let i = H.length - 1; i >= 0 && H[i].visible.mallow !== m && H[i].day >= ctx.unlockedOn[m]; i--) k++; return k; };
  const streaks = new Map(ctx.unlocked.map((m) => [m, streak(m)]));
  const mWin = H.slice(-(S.mallowWindow - 1));
  return {
    template(t) {
      const r = repeat('template', t.id);
      if (r) return r;
      const tmax = S.templatePerWeekOverrides[t.id] ?? S.templatePerWeek;
      const tcount = week.filter((p) => p.visible.template === t.id).length + 1;
      if (tcount > tmax) return { rule: 'sequence:template-week', message: `${t.id} would be posted ${tcount} times in 7 days (max ${tmax})` };
      const win = [...famWin, { family: t.feeling.family, valence: t.feeling.valence }];
      const families = new Set(win.map((p) => p.family)).size;
      const pos = win.filter((p) => p.valence === 'positive' || p.valence === 'mixed').length;
      const left = S.familyWindow - win.length;      // posts still to come in this window (0 once it is full)
      if (S.minFamilies - families > left) return { rule: 'sequence:families', message: `only ${families} feeling families in ${win.length} consecutive posts; ${S.minFamilies} needed per ${S.familyWindow}` };
      if (S.minPositiveOrMixed - pos > left) return { rule: 'sequence:valence', message: `only ${pos} positive/mixed templates in ${win.length} consecutive posts; ${S.minPositiveOrMixed} needed per ${S.familyWindow}` };
      return null;
    },
    mallow(m) {
      if (n < 2) return null;
      const r = repeat('mallow', m);
      if (r) return r;
      const cap = Math.max(S.mallowMaxPerWindow, Math.ceil(S.mallowWindow / n));
      const count = mWin.filter((p) => p.visible.mallow === m).length + 1;
      if (count > cap) return { rule: 'sequence:mallow-quota', message: `${m} would appear ${count} times in ${S.mallowWindow} posts (max ${cap} with ${n} Mallows unlocked)` };
      if (n > S.mallowWindow) return null;
      // every other unlocked Mallow must still fit into the rotation: Mallow x,
      // absent for s posts, must appear within the next W-1-s posts (deadline);
      // deadlines sorted ascending must satisfy D[i] >= i+1 (one Mallow per post)
      const deadlines = [];
      for (const [x, s] of streaks) {
        if (x === m) continue;
        if (s >= S.mallowWindow - 1) return { rule: 'sequence:mallow-absent', message: `${x} would be missing from ${s + 1} consecutive posts (every unlocked Mallow appears at least once in any ${S.mallowWindow})` };
        deadlines.push(S.mallowWindow - 1 - s);
      }
      deadlines.sort((a, b) => a - b);
      const i = deadlines.findIndex((d, k) => d < k + 1);
      if (i >= 0) return { rule: 'sequence:mallow-rotation', message: `posting ${m} now leaves ${i + 1} Mallows due within ${deadlines[i]} posts: the 1-in-${S.mallowWindow} rotation would break` };
      return null;
    },
    ritual: (id) => repeat('ritual', id),
    gag: (id) => repeat('gag', id),
  };
}

/**
 * Violations of the posting rules for candidate spec (needs plannedFor) in
 * channel context ctx. → [{ rule, message }]
 */
export function checkSchedule(spec, ctx, { lib, policy = loadPolicy() }) {
  const out = [];
  const add = (v) => { if (v) out.push(v); };
  const cand = postOf(spec, lib);
  const v = cand.visible, day = cand.day;
  const H = ctx.history.filter((p) => p.day <= day && p.id !== spec.id);   // a re-check never compares a post with itself
  const f = sequenceFilter(ctx, day, { policy, selfId: spec.id });
  add(f.template(lib.template(spec.template)));
  add(f.mallow(spec.mallow));
  add(f.ritual(spec.ritual));
  add(f.gag(spec.gag.id));
  // the channel cadence
  const n = ctx.unlocked.length, cap = cadenceCap(n, policy);
  const week = H.filter((p) => day - p.day < 7).length + 1;
  if (week > cap) add({ rule: 'cadence', message: `${week} posts in 7 days on ${ctx.channel} (cap ${cap} with ${n} Mallow${n === 1 ? '' : 's'} unlocked)` });
  // brand closer runs
  if (spec.copy.end.kind === 'closer' && closerRunBlocked(day, ctx, policy, spec.id)) {
    add({ rule: 'sequence:closer-run', message: `a brand closer would end ${policy.sampling.closer.maxConsecutive + 1} posts in a row` });
  }
  // copy cooldowns and reservations held by other batches on this channel
  const c = spec.copy;
  const texts = [['hook', c.hook], ...c.lines.map((l) => ['line', l]), [c.end.kind === 'closer' ? 'closer' : 'resolution', c.end.text], ...(c.nameWord ? [['nameWord', c.nameWord]] : [])];
  for (const [kind, text] of texts) add(copyBlock(kind, text, day, ctx, policy, spec.id));
  // exact and structural uniqueness against the window
  for (const p of H) {
    if (p.fingerprint === spec.fingerprint) add({ rule: 'fingerprint-repeat', message: `same fingerprint as post ${p.id}` });
    if (day - p.day >= policy.uniqueness.windowDays) continue;
    const d = distanceOk(v, p.visible, policy);
    if (!d.ok) add({ rule: 'distance', message: `too close to ${p.id} (${day - p.day} days earlier): ${d.reason}` });
  }
  return out;
}
