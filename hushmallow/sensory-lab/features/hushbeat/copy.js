// Every user-facing string in Hushbeat Symphony, in one table so it can be
// linted (tests/lib/copy-lint.mjs): short, warm, plain British English. No
// claims about calming or helping anyone, no scores, no streaks. Individual
// notes are never announced; role words are said on first use only.
// Mallow names are passed in (from src/mallows/registry.js) by the caller.

export const COPY = Object.freeze({
  title: 'Hushbeat',
  meta: 'Hushbeat Symphony',
  /** 'Boppo', 'Boppo & Loomi', plus ' · Visual only' */
  subtitle: (lead, friend = null, visualOnly = false) => `${lead}${friend ? ` & ${friend}` : ''}${visualOnly ? ' · Visual only' : ''}`,

  // the hint under the Mallow: [bold word, rest]; at ≤ 360 px only the bold words
  hint: Object.freeze([['Tap', ' a note'], ['Squeeze', ' bass'], ['Stroke', ' a tune'], ['Hold', ' a hum']]),

  // said once per role (every time, at most once per 1.5 s, while the music is only light)
  roles: Object.freeze({
    note: 'Note', chord: 'Chord', bass: 'Bass', tune: 'Tune', hum: 'Hum', glide: 'Glide', breath: 'Breathing in',
  }),

  chips: Object.freeze({
    note: 'Note', chord: 'Chord', tune: 'Tune', bass: 'Bass', hum: 'Hum', breathe: 'Breathe',
    buttons: 'Buttons', replay: 'Replay', stop: 'Stop', keep: 'Keep', kept: 'Kept', friend: 'Friend',
    playIt: 'Play it', both: 'Both', music: 'Music', close: 'Close',
  }),

  aria: Object.freeze({
    tray: 'Gesture buttons',
    target: 'Play on',
    row: 'Hushbeat controls',
    volume: 'Volume',
    /** each stage's label; in a duet it adds G and Tab */
    stage: (name, duet = false) => `${name}. Tap for a note, squeeze or press down for bass, stroke for a tune, hold for a hum. `
      + 'Keys: Enter note, D chord, P tune, T glide, S bass, H hum, B breathe, 1 to 7 notes, R replay.'
      + (duet ? ' G plays both together. Tab moves to the other Mallow.' : ''),
    friend: 'Friend: invite another Mallow',
  }),

  // the feedback chip (role=status)
  say: Object.freeze({
    /** a friend arrives / leaves (the subtitle changes too) */
    joins: (name) => `${name} joins`,
    alone: 'Playing alone',
    kept: 'Kept',
    removed: 'Removed',
    keepFull: 'Six tunes kept. Remove one in Sound and pace.',
    replaying: 'Replaying',
    replayDone: 'Replay finished',
    soundOff: 'Sound off: playing with light',
  }),

  friend: Object.freeze({
    title: (lead) => `Who joins ${lead}?`,
    alone: 'Play alone',
    /** a pill's label: 'Loomi, soft pads' (+ ', playing now' for the friend on stage) */
    pill: (name, words, on = false) => `${name}, ${words}${on ? ', playing now' : ''}`,
  }),

  // two words for each Mallow's instrument (friend picker)
  soundWords: Object.freeze({
    glitzi: 'glitchy chirps', blubi: 'water drops', zuzu: 'spiral glides', boppo: 'springy boings',
    pipzi: 'spark bells', loomi: 'soft pads', noomi: 'music box',
  }),

  sheet: Object.freeze({
    title: 'Sound and pace',
    volume: 'Volume',
    volumeSub: 'Same as in Settings',
    sound: 'Sound',
    music: 'Music',
    visualOnly: 'Visual only',
    soundSub: 'Visual only: music as light and movement, no sound',
    pace: 'Breath pace',
    paceSub: 'For this visit. Keep saves it with the tune.',
    paces: Object.freeze({ slower: 'Slower', natural: 'Natural', livelier: 'Livelier' }),
    answers: 'Friend answers',
    answersSub: 'Your friend answers a tune or a chord',
    on: 'On',
    off: 'Off',
    tunes: 'Your tunes',
    play: 'Play',
    remove: 'Remove',
    /** each tune's buttons say which tune they act on */
    playTune: (tune) => `Play ${tune}`,
    removeTune: (tune) => `Remove ${tune}`,
    tunesEmpty: 'Tap ★ Keep after you play to keep a tune here.',
    tunesOff: "Personalisation is off, so tunes can't be kept.",
    lab: 'Lab settings',
    open: 'Open',
    footnote: 'Music plays even with the Mallow voice off. Use Mute or Visual only for quiet.',
  }),
});
