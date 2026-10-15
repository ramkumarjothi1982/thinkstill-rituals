// The personal-data file (format v2), worded for people. Both the lab's engine and the
// Hushmates Edge Function build the same raw facts and pass them here, so the file is
// the same wherever it's made. Field by field from an allow-list: other people appear
// only as "A Hushmate", their actions are dated by day only, and nothing that identifies
// anyone else (or that the person was never shown) is ever in it.
// Version 2 renamed the sharing consent (see `version` below). Fields added since only add
// (you.confirmedYouAre18OrOverAt: when you confirmed you're 18 or over), so a v2 reader keeps working.

import { FEELING_LABELS, REPORT_REASONS } from './relay-config.js';

const STATUS = { travelling: 'travelling', returned: 'came home', released: 'let go' };
const RETURN = { complete: 'five people offered a perspective', expired: 'its day of travelling ended', withdrawn: 'you brought it home early', removed: 'our safety team stopped it travelling' };
const EVENT = {
  released: 'sent into Hushfold', resent: 'sent out again', perspective: 'a Hushmate offered a perspective',
  'perspective-withdrawn': 'a Hushmate took their perspective back', 'mallow-offer': 'your Mallow could offer a perspective',
  'mallow-perspective': 'your Mallow offered a perspective', returned: 'came home',
};
const OTHERS_EVENTS = new Set(['perspective', 'perspective-withdrawn']);   // other people's actions: dated by day only
const ACCOUNT = { active: 'active', restricted: 'catching paused by our safety team', suspended: 'paused by our safety team' };

const iso = (t) => (typeof t === 'number' ? new Date(t).toISOString() : null);
const day = (t) => (typeof t === 'number' ? new Date(t).toISOString().slice(0, 10) : null);
const choice = (v) => (v === true ? 'kept' : v === false ? 'let go' : 'not chosen yet');

/**
 * raw: { now, you: { pseudonym, mallow, createdAt, adultConfirmedAt, catching, notifyReturn, state },
 *        feelings: [{ text, label, status, createdAt, returnedAt, returnReason, resends, saved, consentAt, fallbackConsentAt,
 *                     people, items: { visible, extra }, events }],          (oldest first; deleted ones left out)
 *        offered: [{ text, at, allowShare, shareConsentAt, journeyHome }],  (oldest first; taken back ones left out)
 *        feelingsThatFoundYou, reports: [{ kind, reason, details, at, status }], blocked }
 */
export function formatExport(raw) {
  const feelings = raw.feelings.map((j) => {
    const home = j.status !== 'travelling';
    const { visible = [], extra = null } = j.items || {};
    const mallow = [...visible, extra].find((x) => x && x.kind === 'mallow') || null;
    return {
      words: j.text || null,                                         // gone once you let the feeling go
      feeling: FEELING_LABELS.find((l) => l.id === j.label)?.label || null,
      status: STATUS[j.status] || 'with you',
      sentAt: iso(j.createdAt),
      cameHomeAt: iso(j.returnedAt),
      cameHomeBecause: RETURN[j.returnReason] || null,
      timesSentOutAgain: j.resends || 0,
      saved: !!j.saved,
      agreedToShareWithoutYourNameAt: iso(j.consentAt),
      agreedToAMallowPerspectiveAt: iso(j.fallbackConsentAt),
      peopleWhoOfferedAPerspective: j.people,
      // as in the app: people's words stay sealed until the feeling comes home, and carry no time
      perspectivesFromHushmates: home ? visible.filter((x) => x.kind === 'human').map((x) => ({ from: 'A Hushmate', words: x.text, yourChoice: choice(x.kept) })) : [],
      mallowPerspective: mallow ? { from: 'Your Mallow', label: mallow.label, words: mallow.text, at: iso(mallow.at), yourChoice: choice(mallow.kept) } : null,
      journey: (j.events || []).map((e) => ({ step: EVENT[e.type] || 'something changed', at: OTHERS_EVENTS.has(e.type) ? day(e.at) : iso(e.at) })),
    };
  });
  return {
    // version 2: the consent is "agreedToShareWithoutYourNameAt" (it was "…AnonymouslyAt"; D8)
    format: 'hushmates-personal-data', version: 2, exportedAt: iso(raw.now),
    about: 'Everything Hushmates keeps that is yours: your feelings and what came back to you, the perspectives you offered, your reports, your choices, and when you agreed to each. Other people appear only as "A Hushmate", never by name. Anything you let go of or deleted is gone and is not included.',
    you: {
      name: raw.you.pseudonym, mallow: raw.you.mallow, joinedAt: iso(raw.you.createdAt),
      confirmedYouAre18OrOverAt: iso(raw.you.adultConfirmedAt),       // the "I'm 18 or over" you ticked when you joined (added in v2)
      letFeelingsFindYou: !!raw.you.catching, gentleNotices: raw.you.notifyReturn !== false,
      account: ACCOUNT[raw.you.state] || 'active',
    },
    feelings,
    perspectivesYouOffered: raw.offered.map((r) => ({
      words: r.text, offeredAt: iso(r.at),
      mayAppearInSharePictures: !!r.allowShare, agreedToSharePicturesAt: iso(r.shareConsentAt),
      feelingHasComeHome: !!r.journeyHome,
    })),
    feelingsThatFoundYou: raw.feelingsThatFoundYou,
    reportsYouMade: raw.reports.map((r) => ({
      about: r.kind === 'feeling' ? 'A feeling that found you' : 'A perspective on your feeling',
      reason: REPORT_REASONS.find((x) => x.id === r.reason)?.label || 'Something else',
      yourWords: r.details || null, madeAt: iso(r.at),
      status: r.status === 'open' ? 'waiting for our safety team' : 'reviewed by our safety team',
    })),
    peopleYouBlocked: raw.blocked,
  };
}
