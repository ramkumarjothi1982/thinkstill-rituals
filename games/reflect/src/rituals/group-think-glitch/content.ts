/* Group Think Glitch — authored content shared by the room server (validation, companions) and the scene (rendering).
 * The incident is one 9-second event in a single 3D world; each camera rig sees part of it. */

export type CamId = 'door' | 'balcony' | 'phone' | 'booth';
export const CAMS: CamId[] = ['door', 'balcony', 'phone', 'booth'];
export const CAM_INFO: Record<CamId, { label: string; short: string; blurb: string }> = {
  door: { label: 'DOORWAY CAM', short: 'Doorway', blurb: 'Low and warm, by the stairs.' },
  balcony: { label: 'BALCONY CAM', short: 'Balcony', blurb: 'High above the party.' },
  phone: { label: "GLITCH'S PHONE", short: 'Phone', blurb: 'Handheld. Shaky. Live.' },
  booth: { label: 'DJ BOOTH CAM', short: 'DJ booth', blurb: 'Behind the cake, under the lights.' }
};

export type Suspect = 'rush' | 'cat' | 'balloon' | 'patch' | 'unsure';
export const SUSPECTS: { id: Suspect; label: string }[] = [
  { id: 'rush', label: 'Rush' }, { id: 'cat', label: 'The cat' }, { id: 'balloon', label: 'The balloon' },
  { id: 'patch', label: 'Patch' }, { id: 'unsure', label: "Can't tell" }
];
export const SURE = ['Hunch', 'Fairly sure', 'Certain'];
export const DURATION = 9;

/** Evidence the light can find: a world point, a time window, the cameras that can see it, and what it suggests. */
export interface Hotspot { id: string; t0: number; t1: number; cams: CamId[]; label: string; points: Suspect; }
export const HOTSPOTS: Hotspot[] = [
  { id: 'edge', t0: 0.6, t1: 1.6, cams: ['booth', 'balcony'], label: 'Cake slid to the edge', points: 'patch' },
  { id: 'catjump', t0: 1.8, t1: 2.9, cams: ['balcony', 'booth'], label: 'Cat on the stool', points: 'cat' },
  { id: 'string', t0: 3.1, t1: 3.9, cams: ['phone', 'door'], label: 'Balloon string at a foot', points: 'balloon' },
  { id: 'stumble', t0: 3.5, t1: 4.3, cams: ['door', 'phone'], label: 'Rush stumbles', points: 'rush' },
  { id: 'paw', t0: 3.9, t1: 4.5, cams: ['balcony'], label: 'A paw on the cake', points: 'cat' },
  { id: 'lunge', t0: 4.2, t1: 4.8, cams: ['door', 'booth', 'balcony'], label: 'Rush reaches for the cake', points: 'rush' },
  { id: 'wobble', t0: 3.9, t1: 4.6, cams: ['booth'], label: 'The table wobbles', points: 'patch' },
  { id: 'splat', t0: 4.7, t1: 5.4, cams: ['door', 'booth', 'phone', 'balcony'], label: 'Splat', points: 'unsure' },
  { id: 'hands', t0: 6.4, t1: 8.8, cams: ['door', 'phone', 'booth'], label: 'Icing on Rush’s hands', points: 'rush' }
];
export const hotspotsFor = (cam: CamId) => HOTSPOTS.filter(h => h.cams.includes(cam));

/** What a single camera most strongly suggests: the honest verdict a viewer with only that angle might reach. */
export const CAM_LEAN: Record<CamId, Suspect> = { door: 'rush', balcony: 'cat', phone: 'balloon', booth: 'patch' };

/** The full chain, for the ceiling-camera reveal. */
export const TRUTH = [
  { t: 1.0, text: 'Patch slides the cake to the edge to make room.' },
  { t: 2.2, text: 'The cat hops onto the stool behind it.' },
  { t: 3.5, text: 'A balloon string catches Rush’s foot.' },
  { t: 4.2, text: 'The cat paws the cake as Rush lunges to save it.' },
  { t: 4.8, text: 'Splat.' }
];
