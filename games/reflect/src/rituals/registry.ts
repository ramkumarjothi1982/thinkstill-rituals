/* Server-side ritual rules, keyed by id. Imported by the room server and the in-page host. */
import type { RitualLogic } from '../room/ritual';
import { smLogic } from './shadow-monsters/logic';
import { maLogic } from './mess-auction/logic';
import { erLogic } from './emotional-rollercoaster/logic';

export const REGISTRY: Record<string, RitualLogic> = {
  [smLogic.id]: smLogic, [maLogic.id]: maLogic,
  [erLogic.id]: erLogic
};
