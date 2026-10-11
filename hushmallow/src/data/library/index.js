// Ritual library index. Each authored ritual's content lives in its own
// file here (one entry per file, `export default { ...spec }`), next to its
// interaction module in src/rituals/. Adding a ritual = add the two files,
// list it below and in src/rituals/index.js. No app code changes.
import softLanding from './soft-landing.js';
import sparkToLantern from './spark-to-lantern.js';
import greenGlitchCompass from './green-glitch-compass.js';
import raindropKeeper from './raindrop-keeper.js';
import moonmilkWindDown from './moonmilk-wind-down.js';
import driftAndDock from './drift-and-dock.js';
import sunpopSavour from './sunpop-savour.js';

export const LIBRARY = [
  softLanding,
  sparkToLantern,
  greenGlitchCompass,
  raindropKeeper,
  moonmilkWindDown,
  driftAndDock,
  sunpopSavour,
];
