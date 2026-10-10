/* Server-side ritual rules, keyed by id. Imported by the room server and the in-page host. */
import type { RitualLogic } from '../room/ritual';
import { gtgLogic } from './group-think-glitch/logic';

export const REGISTRY: Record<string, RitualLogic> = {
  [gtgLogic.id]: gtgLogic
};
