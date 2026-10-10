/* The Glorious Mess Auction — music: a pompous harpsichord minuet for the auction house, a tense pulse for the
 * bidding, a music-box waltz for the museum. Synthesised (audio/music.ts). */
import type { Song } from '../../audio/music';

export const SONGS: Record<string, Song> = {
  minuet: { bpm: 104, tracks: [
    { inst: 'harpsi', pat: 'D5 . F#5 . A5 . F#5 . D5 . A4 . B4 . C#5 . D5 . E5 . F#5 . E5 . D5 . C#5 . B4 . A4 .', vol: 0.8 },
    { inst: 'harpsi', pat: 'D3 . . . A3 . . . D3 . . . A3 . . . G3 . . . D4 . . . A3 . . . E3 . . .', vol: 0.6 },
    { inst: 'strings', pat: 'D4+F#4+A4 - - - - - - - - - - - - - - - G3+B3+D4 - - - - - - - A3+C#4+E4 - - - - - - -', vol: 0.45 }
  ] },
  bidding: { bpm: 132, tracks: [
    { inst: 'timpani', pat: 'D2 . . . D2 . . . D2 . . . D2 . . . D2 . . . D2 . . . D2 . D2 . D2 . D2 .', vol: 0.5 },
    { inst: 'strings', pat: 'D4+A4 - - - - - - - D#4+A#4 - - - - - - - E4+B4 - - - - - - - F4+C5 - - - - - - -', vol: 0.55 },
    { inst: 'tick', pat: 'x . x . x . x . x . x . x . x . x . x . x . x . x x x x x x x x x', vol: 0.4 }
  ] },
  waltz: { bpm: 96, tracks: [
    { inst: 'musicbox', pat: 'G5 . . . B5 . . . D6 . . . C6 . . . A5 . . . F#5 . . . G5 . . . . . . . . . . . . . . . . . . . . . . . . . .', vol: 0.9 },
    { inst: 'bell', pat: 'G3 . . . . . . . . . . . D3 . . . . . . . . . . . G3 . . . . . . . . . . . D3 . . . . . . . . . . .', vol: 0.5 },
    { inst: 'strings', pat: 'G3+B3+D4 - - - - - - - - - - - D3+F#3+A3 - - - - - - - - - - - G3+B3+D4 - - - - - - - - - - - C4+E4+G4 - - - - - - - - - - -', vol: 0.4 }
  ] }
};
