/* Shadow Monsters — music: a spooky-cute music box in the attic, a heartbeat drone under each monster, a conga for
 * the parade, bells for the dawn. All synthesised (see audio/music.ts). */
import type { Song } from '../../audio/music';

export const SONGS: Record<string, Song> = {
  attic: { bpm: 84, tracks: [
    { inst: 'musicbox', pat: 'A5 . . . E5 . C5 . D5 . . . B4 . G4 . A4 . . . C5 . E5 . F5 . E5 . D5 . B4 .', vol: 0.9 },
    { inst: 'organ', pat: 'A3+C4+E4 - - - - - - - - - - - - - - - F3+A3+C4 - - - - - - - - - - - - - - -', vol: 0.55 },
    { inst: 'bass', pat: 'A2 . . . . . . . E2 . . . . . . . F2 . . . . . . . E2 . . . . . . .', vol: 0.6 },
    { inst: 'tick', pat: 'x . . . x . . . x . . . x . . . x . . . x . . . x . . . x . . .', vol: 0.45 }
  ] },
  dread: { bpm: 66, tracks: [
    { inst: 'organ', pat: 'D2+A2+F3 - - - - - - - - - - - - - - - D2+A2+G#3 - - - - - - - - - - - - - - -', vol: 0.7 },
    { inst: 'kick', pat: 'x . x . . . . . . . . . . . . . x . x . . . . . . . . . . . . .', vol: 0.55 },
    { inst: 'tick', pat: '. . . . . . . . x . . . . . . . . . . . . . . . x . . . . . . .', vol: 0.3 }
  ] },
  parade: { bpm: 112, swing: 0.12, tracks: [
    { inst: 'conga', pat: 'x . . x . . x . . . x . x . . . x . . x . . x . . . x . x . x .', vol: 0.8 },
    { inst: 'congaLo', pat: '. . x . . . . . x . . . . . x . . . x . . . . . x . . . . . x .', vol: 0.8 },
    { inst: 'shaker', pat: 'x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x x', vol: 0.7 },
    { inst: 'clap', pat: '. . . . x . . . . . . . x . . . . . . . x . . . . . . . x . . .', vol: 0.6 },
    { inst: 'bass', pat: 'D3 . . D3 . . A2 . D3 . . D3 . . F3 . G2 . . G2 . . D3 . G2 . . A2 . . C#3 .', vol: 0.8 },
    { inst: 'pluck', pat: 'D4 . F4 . A4 . . . G4 . F4 . E4 . . . F4 . A4 . D5 . . . C#5 . A4 . . . . .', vol: 0.75 }
  ] },
  dawn: { bpm: 72, tracks: [
    { inst: 'bell', pat: 'D5 . . . A4 . . . F#5 . . . E5 . . . D5 . . . B4 . . . A4 . . . . . . .', vol: 0.8 },
    { inst: 'strings', pat: 'D4+F#4+A4 - - - - - - - - - - - - - - - G3+B3+D4 - - - - - - - - - - - - - - -', vol: 0.8 }
  ] }
};
