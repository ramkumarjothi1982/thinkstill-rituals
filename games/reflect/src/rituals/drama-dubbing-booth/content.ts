/* Drama Dubbing Booth — authored content shared by the room server (validation, companions) and the studio.
 * One silent 12-second short, "The Gift", in four beats. Players dub it: which line, who says it, on which frame,
 * with which face and voice. Source rituals: TS-047 Same Text, Three Voices · TS-064 Wrong Voice Casting ·
 * TS-146 Punctuation on Trial · TS-159 Two-Lane Conversation · TS-148 Ask or Telepathy? */

export const FILM_LEN = 12;
export type Who = 'patch' | 'sync';
export const WHO: Who[] = ['patch', 'sync'];
export type Tone = 'warm' | 'sarcastic' | 'nervous' | 'deadpan';
export const TONES: { id: Tone; label: string; color: string }[] = [
  { id: 'warm', label: 'Warm', color: '#ffb36b' },
  { id: 'sarcastic', label: 'Sarcastic', color: '#c3a6ff' },
  { id: 'nervous', label: 'Nervous', color: '#7fd8ff' },
  { id: 'deadpan', label: 'Deadpan', color: '#b8c0cc' }
];
export const BEATS = [
  { i: 0, t0: 0, t1: 3, title: 'Patch arrives with a box' },
  { i: 1, t0: 3, t1: 6, title: 'Patch holds it out' },
  { i: 2, t0: 6, t1: 9, title: 'Sync opens it: a tiny cactus' },
  { i: 3, t0: 9, t1: 12, title: 'Patch walks away' }
];
export interface Line { id: string; beat: number; tone: Tone; text: string; }
export const LINES: Line[] = [
  { id: 'b0w', beat: 0, tone: 'warm', text: 'I saw this and thought of you!' },
  { id: 'b0s', beat: 0, tone: 'sarcastic', text: 'Oh good. You’re here.' },
  { id: 'b0n', beat: 0, tone: 'nervous', text: 'Um, hi! Is now a bad time?' },
  { id: 'b0d', beat: 0, tone: 'deadpan', text: 'Package. Delivered. Probably.' },
  { id: 'b1w', beat: 1, tone: 'warm', text: 'Happy birthday. Truly.' },
  { id: 'b1s', beat: 1, tone: 'sarcastic', text: 'Don’t get excited.' },
  { id: 'b1n', beat: 1, tone: 'nervous', text: 'If you hate it I can take it back?' },
  { id: 'b1d', beat: 1, tone: 'deadpan', text: 'It is a box. With a thing.' },
  { id: 'b2w', beat: 2, tone: 'warm', text: 'A cactus! It’s perfect!' },
  { id: 'b2s', beat: 2, tone: 'sarcastic', text: 'Wow. Spiky. Just like me.' },
  { id: 'b2n', beat: 2, tone: 'nervous', text: 'Oh! It’s… very… pointy.' },
  { id: 'b2d', beat: 2, tone: 'deadpan', text: 'A plant that bites. Noted.' },
  { id: 'b3w', beat: 3, tone: 'warm', text: 'Same time next year!' },
  { id: 'b3s', beat: 3, tone: 'sarcastic', text: 'You’re welcome, I guess.' },
  { id: 'b3n', beat: 3, tone: 'nervous', text: 'Water it! Or don’t! Bye!' },
  { id: 'b3d', beat: 3, tone: 'deadpan', text: 'Water: never. Love: optional.' }
];
export const lineById = (id: string) => LINES.find(l => l.id === id) || null;

/** Faces a performer can put on each Bubble (kit mood names), arranged around the expression wheel. */
export const FACES = ['happy', 'love', 'laugh', 'surprised', 'worried', 'sad', 'angry', 'cool'];
export const FACE_LABEL: Record<string, string> = { happy: 'Happy', love: 'Adoring', laugh: 'Laughing', surprised: 'Shocked', worried: 'Worried', sad: 'Sad', angry: 'Cross', cool: 'Too cool' };

export const MAX_CUES = 6;
export const MAX_TEXT = 40;
export interface Cue { t: number; who: Who; line: string; text?: string; tone: Tone; face: string; pitch: number; pace: number; }

/** Auto-title for a cut from its tones (shown on the premiere title card and the marquee). */
export function cutTitle(cues: Cue[]): string {
  if (!cues.length) return 'The Gift (Silent Version)';
  const n: Record<string, number> = {};
  cues.forEach(c => { n[c.tone] = (n[c.tone] || 0) + 1; });
  const top = Object.keys(n).sort((a, b) => n[b] - n[a])[0];
  const mixed = Object.keys(n).length >= 3;
  if (mixed) return 'The Gift: A Rollercoaster of Tone';
  return ({ warm: 'The Gift: A Love Story', sarcastic: 'The Gift, Allegedly', nervous: 'The Anxious Present', deadpan: 'Object Transfer' } as Record<string, string>)[top] || 'The Gift';
}

/** A small, conservative word filter for typed lines (they are optional and shown to everyone in the room). */
const BLOCK = ['fuck', 'shit', 'cunt', 'bitch', 'nigg', 'fag', 'retard', 'kill yourself', 'kys', 'rape', 'slut', 'whore'];
export function cleanLine(s: any): string | null {
  const t = String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT);
  if (!t) return null;
  const low = t.toLowerCase();
  if (BLOCK.some(b => low.includes(b))) return null;
  return t;
}
