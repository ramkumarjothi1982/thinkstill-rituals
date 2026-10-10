/* The contract between the Reflect console and a ritual scene. A scene owns its stage element while the room is in
 * play / reveal / finale; the console owns everything around it (hub, lobby, invites, controls). */
import type { RoomView, ActKind, Player } from '../room/protocol';
import type { FaceBank } from '../actor/faces';
import type { Synth } from '../audio/synth';

export interface RoomLike {
  readonly view: RoomView | null;
  readonly pid: string | null;
  readonly isHost: boolean;
  act(kind: ActKind, data?: any): string;
  serverNow(): number;
  on(fn: (v: RoomView) => void): () => void;
  onError(fn: (code: string) => void): () => void;
}

export interface Prefs { sound: boolean; reducedMotion: boolean; theme: 'dark' | 'bright'; }

export interface SceneCtx {
  stage: HTMLElement;            // the scene's own element (inside the console's shadow root)
  room: RoomLike;
  faces: FaceBank;
  sfx: Synth;
  prefs: Prefs;
  /** console chrome the scene may use */
  toast(msg: string): void;
  exit(): void;
  /** labelled display name for a player: humans by name, companions as "<Name> · Bubble companion" */
  label(p: Player): string;
  /** called by the scene when the finale is over and the player chooses what next */
  next(choice: 'replay' | 'hub'): void;
  /** offer a generated file (share card) to the viewer; resolves false if the platform refused */
  download(filename: string, blob: Blob): Promise<boolean>;
  metrics: Metrics;
}

export interface Scene {
  update(v: RoomView): void;
  resize(): void;
  destroy(): void;
}

export type SceneFactory = (ctx: SceneCtx) => Scene;

/** Measurements the tests read (input → visual feedback, frame times). */
export class Metrics {
  input: number[] = [];
  frames: number[] = [];
  private pending: number | null = null;
  private last = 0;
  /** call from an input handler; the next painted frame closes the measurement */
  mark(ev?: Event) { this.pending = ev && (ev as any).timeStamp ? (ev as any).timeStamp : performance.now(); }
  /** call once per rendered frame */
  frame(now: number) {
    if (this.last) { const d = now - this.last; if (d < 250) { this.frames.push(Math.round(d * 10) / 10); if (this.frames.length > 600) this.frames.shift(); } }
    this.last = now;
    if (this.pending != null) { const dt = now - this.pending; if (dt >= 0 && dt < 1000) { this.input.push(Math.round(dt * 10) / 10); if (this.input.length > 200) this.input.shift(); } this.pending = null; }
  }
  idle() { this.last = 0; }
}
