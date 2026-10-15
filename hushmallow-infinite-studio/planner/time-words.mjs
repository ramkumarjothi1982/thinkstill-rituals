// Clock times in copy → the times of day they pin (planner copy lint).
//
// The library's timeWords (templates/story-library.json) spell clock times
// one way only ("2 AM", "9 PM"), so "2:00 AM", "2.30am", "3 a.m.", "TWO AM",
// "two-thirty a.m.", "2 o'clock AM", "quarter to three AM", "3 in the
// morning", "10 at night", "02:00", "0200 hours" or "noon" would slip past a
// time-of-day check built on them alone. This module reads every explicit
// clock time, takes its hour (0-23) and maps it through
// policy.lint.clockTimes.hours to the ToD classes the library uses.
//
// A clock phrase is read as a whole: "two o'clock in the morning" is 2 AM,
// a late-night time, even though the library's bare MORNING keyword sits
// inside it. maskClockTimes() blanks the phrases out so the keyword patterns
// (the library's and the planner's) only see the rest of the text. The copy
// lint then intersects that reading with the library validator's own (its
// timeWords on the whole text, MORNING included) as a floor, so such a phrase
// fits no time of day (planner/lint-copy.mjs timeClassesOf).
//
// Times with no AM/PM and no part-of-day phrase ("6:30", "three o'clock",
// "at 3") are ambiguous (6:30 in the morning or the evening?) and set no
// constraint, exactly as the library leaves "6:30" free; a leading-zero or
// 13-23 hour ("02:00", "23:30") or an "hours" suffix ("0200 hours") is a
// 24-hour time and is not ambiguous.
//
// Pure (no imports): the composer may reuse it in the render page.

const NUM_WORDS = Object.freeze({ one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 });
const HOUR_WORD = Object.keys(NUM_WORDS).join('|');
const HOUR = `(\\d{1,2}|${HOUR_WORD})`;
// What may follow the hour before AM/PM or a part of day: ":30", ".30", " thirty", "-forty-five",
// " oh five", then an optional "o'clock". Only the hour matters, so minutes are consumed, not read.
const DIGIT_WORD = 'one|two|three|four|five|six|seven|eight|nine';
const MINUTE_WORD = `(?:oh[\\s-]?(?:${DIGIT_WORD})|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|(?:twenty|thirty|forty|fifty)(?:[\\s-]?(?:${DIGIT_WORD}))?)`;
const AFTER = `(?:[:.][0-5]\\d|[\\s-]${MINUTE_WORD}\\b)?(?:[\\s-]?ish\\b)?(?:\\s*o'?\\s?clock)?`;
// What may precede the hour: "half past", "quarter to", "ten past", "20 to", "five after";
// "half two" is British for 2:30. "to/till/before" moves the hour back by one.
const BEFORE = `(?:((?:quarter|half|\\d{1,2}|five|ten|twenty|twenty[\\s-]five)(?:[\\s-]+minutes)?[\\s-]+(past|after|to|till|til|before)|half(?=\\s+(?:\\d|${HOUR_WORD})\\b))[\\s-]+)?`;
const START = '(?<![\\w:.])';

// "2 AM", "2:00 AM", "2.30am", "3 a.m.", "TWO P.M.", "two-thirty a.m.", "2 o'clock AM", "quarter to three AM"
const MERIDIEM = new RegExp(`${START}${BEFORE}${HOUR}${AFTER}\\s*([ap])\\.?\\s?m\\b\\.?`, 'gi');
// "3 in the morning", "two o'clock in the morning", "10 at night", "3 in the night", "two in the afternoon", "11 tonight", "3 this morning"
const PART_OF_DAY = new RegExp(`${START}${BEFORE}${HOUR}${AFTER}\\s+((?:in\\s+the|this)\\s+(?:morning|afternoon|evening)|at\\s+night|in\\s+the\\s+night|tonight|last\\s+night|in\\s+the\\s+[ap]\\.?\\s?m\\b\\.?)`, 'gi');
// "02:00", "00:30", "13:45", "23:59" (24-hour; 1:00-12:59 without AM/PM stays ambiguous;
// a '.' is not read here, so a price like 19.99 is never a time)
const H24 = new RegExp(`${START}(0\\d|1[3-9]|2[0-3]):([0-5]\\d)\\b(?!\\s*[ap]\\.?\\s?m\\b)`, 'gi');
// "0200 hours", "02:00 hrs", "0530h", "14:00 hours", "1400 hours": military time. "1000 hours"
// and "1200 hours" (no separator, no leading zero) read as counts and are left alone.
const HOURS_SUFFIX = new RegExp(`${START}(?:(0\\d)[:.]?[0-5]\\d|(1\\d|2[0-3])[:.][0-5]\\d|(1[3-9]|2[0-3])[0-5]\\d)\\s*(?:hours|hrs|hr|h)\\b`, 'gi');
// "oh-two-hundred", "zero two hundred hours", "oh five thirty": spelled military time (hour 0-9; a
// spelled hour of 10 or more needs "hours", because "twelve hundred" is a count)
const SPELLED_MILITARY = new RegExp(`${START}(?:(?:oh|zero)[\\s-]?(${DIGIT_WORD})[\\s-]?(?:hundred|${MINUTE_WORD})(?:\\s+(?:hours|hrs))?|(ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|twenty[\\s-]?(?:one|two|three))[\\s-]?hundred\\s+(?:hours|hrs))\\b`, 'gi');
const SPELLED_HOURS = Object.freeze({ ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, twentyone: 21, twentytwo: 22, twentythree: 23 });
// "noon", "12 noon", "midday", "midnight"
const NAMED = /\b(noon|midday|midnight)\b/gi;

const num = (s) => (/^\d+$/.test(s) ? Number(s) : NUM_WORDS[s.toLowerCase()]);

/** The 12-hour clock hour (1-12) the phrase names: "quarter to three" is 2:45, so 2. null when out of range. */
function hourOnDial(hourText, relation) {
  const h = num(hourText);
  if (!(h >= 1 && h <= 12)) return null;
  if (relation && /^(to|till|til|before)$/i.test(relation)) return h === 1 ? 12 : h - 1;
  return h;
}

/** Hour (0-23) of an h (1-12) with a meridiem 'a' | 'p'. */
function hour12(h, ap) {
  if (ap === 'a') return h === 12 ? 0 : h;
  return h === 12 ? 12 : h + 12;
}

/** Hour (0-23) of "h in the morning/afternoon/evening", "h at night", "h tonight", "h last night". */
function hourOfPart(h, part) {
  const p = part.toLowerCase().replace(/\s+/g, ' ');
  const ap = /^in the ([ap])\.? ?m/.exec(p);
  if (ap) return hour12(h, ap[1]);                             // "3 in the a.m." is 3 AM
  if (p.endsWith('morning')) return h === 12 ? 0 : h;          // "3 in the morning" is 3 AM
  if (p.endsWith('afternoon') || p.endsWith('evening')) return h === 12 ? 12 : h + 12;
  // at night / in the night / tonight / last night: 6-11 are evening hours, 12 is midnight, 1-5 are small hours
  if (h === 12) return 0;
  return h >= 6 ? h + 12 : h;
}

/**
 * Every explicit clock time in text → [{ hour, match, at, end }] in text
 * order, one per phrase (where two readings overlap, the earlier and longer
 * phrase wins: "two o'clock in the morning" is one time, not two).
 */
export function clockTimes(text) {
  const s = String(text);
  const found = [];
  const push = (m, hour) => { if (hour !== null) found.push({ hour, match: m[0].trim(), at: m.index, end: m.index + m[0].length }); };
  for (const m of s.matchAll(MERIDIEM)) {
    const h = hourOnDial(m[3], m[2]);
    push(m, h === null ? null : hour12(h, m[4].toLowerCase()));
  }
  for (const m of s.matchAll(PART_OF_DAY)) {
    const h = hourOnDial(m[3], m[2]);
    push(m, h === null ? null : hourOfPart(h, m[4]));
  }
  for (const m of s.matchAll(HOURS_SUFFIX)) push(m, Number(m[1] ?? m[2] ?? m[3]));
  for (const m of s.matchAll(SPELLED_MILITARY)) push(m, m[1] ? NUM_WORDS[m[1].toLowerCase()] : SPELLED_HOURS[m[2].toLowerCase().replace(/[\s-]/g, '')]);
  for (const m of s.matchAll(H24)) push(m, Number(m[1]));
  for (const m of s.matchAll(NAMED)) push(m, m[1].toLowerCase() === 'midnight' ? 0 : 12);
  found.sort((a, b) => a.at - b.at || b.end - a.end);
  const out = [];
  for (const f of found) if (!out.length || f.at >= out.at(-1).end) out.push(f);
  return out;
}

/** text with every clock phrase blanked out (same length), for the keyword patterns. */
export function maskClockTimes(text) {
  let s = String(text);
  for (const t of clockTimes(s)) s = s.slice(0, t.at) + ' '.repeat(t.end - t.at) + s.slice(t.end);
  return s;
}

/**
 * Union of the ToD classes the clock times in text pin, or null when it has
 * none. hours: { 'late-night|night': [0, 1, ...], ... } (policy.lint.clockTimes.hours).
 */
export function clockClasses(text, hours) {
  const times = clockTimes(text);
  if (!times.length) return null;
  const byHour = new Map();
  for (const [classes, hs] of Object.entries(hours)) for (const h of hs) byHour.set(h, classes.split('|'));
  const out = new Set();
  for (const t of times) for (const c of byHour.get(t.hour) || []) out.add(c);
  return [...out];
}

/**
 * The times of day a text allows: the keyword classes (the library's
 * timeWords plus the planner's timePhrases, read on the text with its clock
 * phrases masked) and the clock-time classes must both hold (intersection).
 * → array (possibly empty: contradictory time words), or null when the text
 * names no time.
 */
export function allowedTods(keywordClasses, clock) {
  if (keywordClasses && clock) return keywordClasses.filter((c) => clock.includes(c));
  return keywordClasses || clock || null;
}
