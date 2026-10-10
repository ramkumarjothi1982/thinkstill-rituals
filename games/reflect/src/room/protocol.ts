/* Reflect room protocol: the typed contract shared by the browser client, the Cloudflare Durable Object and the local
 * dev server. The server is authoritative; clients send intents ("act") and receive filtered views ("state").
 * Private submissions ("seal") are stored server-side and never leave it until the room reaches the reveal phase. */

export type Slug = 'loopie' | 'glitch' | 'patch' | 'drop' | 'rush' | 'still' | 'sync';
export const SLUGS: Slug[] = ['loopie', 'glitch', 'patch', 'drop', 'rush', 'still', 'sync'];
export type RitualId = 'group-think-glitch' | 'drama-dubbing-booth' | 'emotional-rollercoaster';
export type Phase = 'lobby' | 'play' | 'reveal' | 'finale';

export interface Player {
  pid: string;
  name: string;
  avatar: Slug;
  human: boolean;          // false = scripted Bubble companion (always labelled in the UI)
  connected: boolean;
  seat: number;            // stable order; companions get seats too
  spectator: boolean;      // joined after the ritual started: watches, cannot seal
}

/** What every client may see. Secrets are absent until the reveal. */
export interface RoomView {
  code: string;
  v: number;               // version, increments on every change
  hostPid: string | null;
  ritual: RitualId;
  phase: Phase;
  seed: number;
  round: number;           // increments on every start, so clients can reset per round
  players: Player[];
  pub: any;                // ritual public state (roles, cameras, start time...)
  sealed: Record<string, boolean>;
  revealed: Record<string, any> | null;   // pid -> sealed payload, only once phase >= reveal
  live: LiveEvent[];       // short public event log (reactions, track switches), capped
  consent: Record<string, boolean>;       // pid -> may this player's contribution appear in a share image
  startedAt: number | null;
  serverNow: number;       // server clock at send time, for synchronised starts
  mine?: any;              // this player's own sealed payload (so a rejoin restores it)
  you?: string;            // pid of the receiver
}

export interface LiveEvent { n: number; pid: string; at: number; data: any; }

export type ClientMsg =
  | { t: 'hello'; room: string; token?: string; name: string; avatar: Slug; ritual?: RitualId }
  | { t: 'act'; id: string; kind: ActKind; data?: any }
  | { t: 'ping'; at: number };

export type ActKind =
  | 'start' | 'seal' | 'live' | 'consent' | 'finale' | 'replay' | 'ritual'
  | 'add_companion' | 'remove_player' | 'force_reveal' | 'leave' | 'rename';

export type ServerMsg =
  | { t: 'welcome'; pid: string; token: string; view: RoomView }
  | { t: 'state'; view: RoomView }
  | { t: 'error'; code: string; message?: string; actId?: string }
  | { t: 'pong'; at: number; serverNow: number };

export const LIMITS = {
  maxHumans: 4,            // per room (rituals may set lower)
  maxSeats: 6,             // humans + companions
  maxMessageBytes: 16384,
  maxLive: 80,
  maxName: 24,
  codeRe: /^[A-Z2-9]{5}$/, // room codes: no 0/O/1/I confusion
};

export function cleanName(s: any): string {
  return String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, LIMITS.maxName) || 'Player';
}
