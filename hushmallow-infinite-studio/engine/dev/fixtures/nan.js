// Fixture: subframes() returns NaN at frames 1 and 2 (R18: the stage must fall back and log, not render black).
import { makeCard } from './card.js';

export default makeCard({ id: 'dev/nan', text: 'Not a number', nanAt: [1, 2] });
