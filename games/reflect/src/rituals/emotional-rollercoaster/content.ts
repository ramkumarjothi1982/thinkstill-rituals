/* Emotional Rollercoaster — authored content. A fictional Saturday in five moments; each rider shapes one track
 * segment per moment (how high or low it felt, and how it moved them). Source rituals: TS-209 Middle of the Movie ·
 * TS-293 Loud Now, Long How? · TS-262 Shuffle Three Scenes · TS-055 First Ten Seconds Bet. */

export type Mod = 'smooth' | 'drop' | 'loop' | 'tunnel' | 'cork';
export const MODS: { id: Mod; label: string; verb: string; blurb: string }[] = [
  { id: 'smooth', label: 'Smooth', verb: 'rode it smooth', blurb: 'It passed. Gentle.' },
  { id: 'drop', label: 'Drop', verb: 'dropped', blurb: 'It hit suddenly.' },
  { id: 'loop', label: 'Loop', verb: 'looped', blurb: 'It spun me round.' },
  { id: 'tunnel', label: 'Tunnel', verb: 'went into a tunnel', blurb: 'I went quiet inside.' },
  { id: 'cork', label: 'Corkscrew', verb: 'corkscrewed', blurb: 'It twisted me up.' }
];
export const MOD_IDS = MODS.map(m => m.id);

export interface Moment { time: string; text: string; short: string; icon: 'alarm' | 'brunch' | 'jacket' | 'chat' | 'pizza' | 'star'; }
export const SATURDAY: Moment[] = [
  { time: '7:40', text: 'Your alarm doesn’t go off', short: 'Alarm', icon: 'alarm' },
  { time: '10:15', text: 'A friend cancels brunch', short: 'Brunch', icon: 'brunch' },
  { time: '13:30', text: 'A stranger compliments your jacket', short: 'Jacket', icon: 'jacket' },
  { time: '17:05', text: 'The group chat goes quiet after your message', short: 'Chat', icon: 'chat' },
  { time: '20:20', text: 'The pizza arrives early', short: 'Pizza', icon: 'pizza' }
];
export const N_SEG = 5;
export interface Seg { h: number; mod: Mod; }

/** Ride timing (seconds): lift hill + first drop, five moments, brake run into the station. */
export const T_PRE = 5, T_SEG = 6, T_POST = 3;
export const RIDE_LEN = T_PRE + N_SEG * T_SEG + T_POST;
/** Two switch junctions: just before moment 3 and moment 5 you may jump onto a friend's track for that moment. */
export const JUNCTIONS = [{ j: 0, seg: 2 }, { j: 1, seg: 4 }];
export const SWITCH_WINDOW = 2.8;
export const junctionTime = (j: number) => T_PRE + JUNCTIONS[j].seg * T_SEG;

/** "Same cancelled brunch. One of you dropped, one of you looped." */
export function divergenceLine(m: Moment, riders: { name: string; seg: Seg }[]): string {
  const by = new Map<string, string[]>();
  riders.forEach(r => { const k = (MODS.find(x => x.id === r.seg.mod) || MODS[0]).verb + (r.seg.h > 0.35 ? ' high' : r.seg.h < -0.35 ? ' low' : ''); by.set(k, [...(by.get(k) || []), r.name]); });
  const parts = Array.from(by.entries()).map(([k, names]) => (names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names[0]) + ' ' + k);
  const body = parts.join('; ');
  return `Same ${m.short.toLowerCase()} moment. ` + body.charAt(0).toUpperCase() + body.slice(1) + '.';
}

/** Optional: a host may name the five moments of a day the group really shared (kept inside the room). */
export function cleanMoments(d: any): Moment[] | null {
  if (!d || !Array.isArray(d.moments) || d.moments.length !== N_SEG) return null;
  const BLOCK = ['fuck', 'shit', 'cunt', 'nigg', 'fag', 'retard', 'kill yourself', 'rape'];
  const out: Moment[] = [];
  for (let i = 0; i < N_SEG; i++) {
    const t = String(d.moments[i] == null ? '' : d.moments[i]).replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 48);
    if (!t || BLOCK.some(b => t.toLowerCase().includes(b))) return null;
    out.push({ time: SATURDAY[i].time, text: t, short: t.split(' ').slice(0, 2).join(' '), icon: 'star' });
  }
  return out;
}
