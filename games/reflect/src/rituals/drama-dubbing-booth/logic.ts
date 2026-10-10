/* Drama Dubbing Booth — authoritative rules (room server + in-page host). A sealed "cut" is the list of dubbing cues;
 * nobody sees anyone's cut until the premiere. The premiere is scheduled from the reveal moment so every device plays
 * the same cut at the same time (live reactions land on the same frame for everyone). */
import { RitualLogic, Seat, Rng, shuffle } from '../../room/ritual';
import { Cue, FACES, FILM_LEN, LINES, MAX_CUES, TONES, Tone, WHO, Who, cleanLine, lineById } from './content';

export interface DdbPub { film: 'the-gift'; order?: string[]; revealAt?: number; }
export interface DdbSeal { cues: Cue[]; }
const TONE_IDS = new Set(TONES.map(t => t.id));
const REACT = ['laugh', 'gasp', 'aww'];

function cleanCue(c: any): Cue | null {
  if (!c || typeof c !== 'object') return null;
  const t = Number(c.t);
  if (!Number.isFinite(t) || t < 0 || t > FILM_LEN - 0.3) return null;
  if (!WHO.includes(c.who)) return null;
  const face = FACES.includes(c.face) ? c.face : 'happy';
  const pitch = Math.max(-1, Math.min(1, Number(c.pitch) || 0));
  const pace = Math.max(-1, Math.min(1, Number(c.pace) || 0));
  if (c.line === 'custom') {
    const text = cleanLine(c.text);
    if (!text) return null;
    const tone: Tone = TONE_IDS.has(c.tone) ? c.tone : 'warm';
    return { t: Math.round(t * 100) / 100, who: c.who, line: 'custom', text, tone, face, pitch: Math.round(pitch * 100) / 100, pace: Math.round(pace * 100) / 100 };
  }
  const L = lineById(String(c.line));
  if (!L) return null;
  return { t: Math.round(t * 100) / 100, who: c.who, line: L.id, tone: L.tone, face, pitch: Math.round(pitch * 100) / 100, pace: Math.round(pace * 100) / 100 };
}

export const ddbLogic: RitualLogic = {
  id: 'drama-dubbing-booth',
  title: 'Drama Dubbing Booth',
  min: 2, max: 4,
  setup(): DdbPub { return { film: 'the-gift' }; },
  validateSeal(_pub: DdbPub, _seat: Seat, d: any): DdbSeal | null {
    if (!d || !Array.isArray(d.cues)) return null;
    const cues = d.cues.slice(0, MAX_CUES).map(cleanCue).filter(Boolean) as Cue[];
    if (!cues.length) return null;
    cues.sort((a, b) => a.t - b.t);
    return { cues };
  },
  companionSeal(_pub: DdbPub, seat: Seat, rng: Rng): DdbSeal {
    // Loopie: melodrama, big faces. Glitch: deadpan, literal, still faces. Rush: always early on the cue.
    const persona = seat.avatar;
    const pickTone = (beat: number): Tone => {
      if (persona === 'glitch') return rng() < 0.75 ? 'deadpan' : 'sarcastic';
      if (persona === 'loopie') return beat === 2 ? 'warm' : rng() < 0.5 ? 'nervous' : 'warm';
      if (persona === 'rush') return rng() < 0.5 ? 'sarcastic' : 'warm';
      return (['warm', 'sarcastic', 'nervous', 'deadpan'] as Tone[])[Math.floor(rng() * 4)];
    };
    const faceFor = (tone: Tone): string => {
      if (persona === 'glitch') return rng() < 0.7 ? 'cool' : 'surprised';
      if (persona === 'loopie') return ({ warm: 'love', nervous: 'worried', sarcastic: 'laugh', deadpan: 'surprised' } as Record<Tone, string>)[tone];
      return ({ warm: 'happy', nervous: 'worried', sarcastic: 'cool', deadpan: 'cool' } as Record<Tone, string>)[tone];
    };
    const cues: Cue[] = [];
    const speakers: Who[] = ['patch', 'patch', 'sync', 'patch'];
    for (let beat = 0; beat < 4; beat++) {
      if (persona === 'glitch' && beat === 1 && rng() < 0.5) continue;    // Glitch leaves a silence
      const tone = pickTone(beat);
      const L = LINES.find(l => l.beat === beat && l.tone === tone)!;
      let t = beat * 3 + 0.5 + rng() * 0.8;
      if (persona === 'rush') t = Math.max(0, beat * 3 - 0.6);               // early, every time
      if (beat === 2 && persona !== 'rush') t = 6.9 + rng() * 0.5;          // the reaction after the lid pops
      const who: Who = persona === 'loopie' && beat === 0 ? 'sync' : speakers[beat];
      cues.push({ t: Math.round(t * 100) / 100, who, line: L.id, tone: L.tone, face: faceFor(L.tone), pitch: persona === 'loopie' ? 0.5 : persona === 'glitch' ? -0.6 : 0.1, pace: persona === 'rush' ? 0.8 : persona === 'glitch' ? -0.4 : 0 });
    }
    return { cues };
  },
  validateLive(pub: DdbPub, _seat: Seat, d: any, phase: string) {
    if (phase === 'play' || !d || d.kind !== 'react' || !REACT.includes(d.icon)) return null;
    return { kind: 'react', icon: d.icon, at: Number.isFinite(d.at) ? Math.max(0, Math.min(600, Number(d.at))) : 0 };
  },
  onReveal(pub: DdbPub, now: number, sealed: Record<string, any>): DdbPub {
    const ids = Object.keys(sealed).sort();
    return { ...pub, order: shuffle(ids, ids.join('').length * 7919 + 13), revealAt: now };
  }
};
