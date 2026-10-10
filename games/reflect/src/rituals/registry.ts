/* Server-side ritual rules, keyed by id. Imported by the room server and the in-page host. */
import type { RitualLogic } from '../room/ritual';
import { gtgLogic } from './group-think-glitch/logic';
import { ddbLogic } from './drama-dubbing-booth/logic';
import { erLogic } from './emotional-rollercoaster/logic';

export const REGISTRY: Record<string, RitualLogic> = {
  [gtgLogic.id]: gtgLogic,
  [ddbLogic.id]: ddbLogic,
  [erLogic.id]: erLogic
};
