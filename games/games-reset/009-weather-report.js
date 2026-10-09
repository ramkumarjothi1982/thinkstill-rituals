/* 009 Weather Report — Reset · FEEL · Emotion
 * Mechanism: affect labelling and emotional granularity. Putting a feeling into a precise word dampens its intensity
 * (Lieberman et al. 2007; Kashdan, Barrett & McKnight 2015), and forecasting it forward is a reminder that feelings are
 * weather, not climate: they move through. The player maps, sizes and names their inner weather, then scrubs the
 * forecast slowly from now to tomorrow while the studio's radar sweeps in time with the music.
 * Verb: forecast (drag weather onto your inner planet, size it, name it exactly, slide the forecast slowly to tomorrow).
 * Finale: a rainbow arcs over the little planet, the studio lights warm up, the lower third reads the forecast and the
 * named word joins the player's emotion almanac (their little planet grows as the almanac grows).
 */
(function (env) {
  'use strict';
  const WX = {
    sun: { label: 'Sun', words: ['hopeful', 'relieved', 'proud'], adv: ['content', 'grateful'], fc: 'sunny spells', clear: 'bright all day', sizes: ['soft', 'warm', 'bright', 'blazing'], later: 'sun' },
    cloud: { label: 'Cloud', words: ['low', 'gloomy', 'heavy', 'meh', 'deflated'], adv: ['glum', 'disheartened'], fc: 'clouds breaking', clear: 'brighter later', sizes: ['wispy', 'grey', 'heavy', 'overcast'], later: 'partly' },
    rain: { label: 'Rain', words: ['sad', 'disappointed', 'lonely', 'hurt', 'homesick'], adv: ['wistful', 'grieving'], fc: 'showers easing', clear: 'clearing later', sizes: ['drizzle', 'showers', 'heavy', 'downpour'], later: 'partly' },
    storm: { label: 'Storm', words: ['angry', 'furious', 'frustrated', 'resentful', 'irritated'], adv: ['indignant', 'exasperated'], fc: 'passing showers', clear: 'clearing later', sizes: ['rumbling', 'stormy', 'severe', 'raging'], later: 'rain' },
    fog: { label: 'Fog', words: ['numb', 'confused', 'flat', 'foggy', 'unsure'], adv: ['detached', 'listless'], fc: 'fog lifting', clear: 'clearer later', sizes: ['patchy', 'misty', 'thick', 'dense'], later: 'partly' },
    wind: { label: 'Wind', words: ['restless', 'anxious', 'on edge', 'rushed', 'wired'], adv: ['jittery', 'overstimulated'], fc: 'gusts easing', clear: 'calmer later', sizes: ['breezy', 'gusty', 'strong', 'gale'], later: 'partly' },
    heat: { label: 'Heat haze', words: ['embarrassed', 'ashamed', 'jealous', 'guilty', 'flustered'], adv: ['humiliated', 'self-conscious'], fc: 'cooling off', clear: 'fresher later', sizes: ['warm', 'hot', 'sweltering', 'scorching'], later: 'partly' },
    snow: { label: 'Snow', words: ['tired', 'drained', 'frozen', 'stuck'], adv: ['weary', 'depleted'], fc: 'slow thaw', clear: 'milder tomorrow', sizes: ['flurries', 'steady', 'heavy', 'blizzard'], later: 'partly' }
  };
  const ORDER = ['sun', 'cloud', 'rain', 'storm', 'fog', 'wind', 'heat', 'snow'];
  const CLOUDY = { cloud: 1, rain: 1, storm: 1, snow: 1 };
  /* the reader's one-word feeling → the weather family it belongs to (seeds the word chips) */
  const FEEL = {
    angry: 'storm', furious: 'storm', frustrated: 'storm', irritated: 'storm', annoyed: 'storm', resentful: 'storm', grumpy: 'storm', mad: 'storm', overwhelmed: 'storm',
    sad: 'rain', disappointed: 'rain', lonely: 'rain', hurt: 'rain', homesick: 'rain', upset: 'rain', tearful: 'rain', heartbroken: 'rain',
    numb: 'fog', confused: 'fog', flat: 'fog', foggy: 'fog', unsure: 'fog', bored: 'fog', lost: 'fog',
    restless: 'wind', anxious: 'wind', rushed: 'wind', wired: 'wind', stressed: 'wind', nervous: 'wind', scared: 'wind', worried: 'wind', alarmed: 'wind', panicky: 'wind', 'on edge': 'wind',
    embarrassed: 'heat', ashamed: 'heat', jealous: 'heat', guilty: 'heat', flustered: 'heat',
    tired: 'snow', drained: 'snow', frozen: 'snow', stuck: 'snow', exhausted: 'snow',
    hopeful: 'sun', relieved: 'sun', proud: 'sun', excited: 'sun', happy: 'sun', buzzing: 'sun', grateful: 'sun', content: 'sun',
    low: 'cloud', gloomy: 'cloud', heavy: 'cloud', meh: 'cloud', deflated: 'cloud', down: 'cloud'
  };
  ORDER.forEach(tp => WX[tp].words.concat(WX[tp].adv).forEach(wd => { if (!FEEL[wd]) FEEL[wd] = tp; }));
  /* the almanac only ever stores words from this fixed vocabulary, never anything the player typed */
  const VOCAB = new Set(Object.keys(FEEL));
  const WORLDS = [{ id: 'home', name: 'Home Sweet Home' }, { id: 'lighthouse', name: 'Lighthouse Point' }, { id: 'windmill', name: 'Windmill Hill' }, { id: 'camp', name: 'Campfire Ridge' }, { id: 'dome', name: 'Stargazer Dome' }];
  const PACKS = [
    { hot: '#ff7a3d', t1: '#ffc35c', t2: '#ff8a3d', ink: '#2b1200' }, { hot: '#22bfae', t1: '#a4f4e6', t2: '#3cc9b9', ink: '#04302b' },
    { hot: '#8f7bff', t1: '#ddd4ff', t2: '#a593ff', ink: '#1d1150' }, { hot: '#f0ab00', t1: '#ffe48a', t2: '#ffbf1f', ink: '#2d2100' }
  ];
  const FACTS = ['Fog is a cloud that touches the ground', 'A rainbow is a full circle; the horizon hides half of it', 'The average thunderstorm lasts about 30 minutes',
    'Snowflakes grow with six-fold symmetry', 'Wind is air moving from high pressure to low', 'Heat haze is light bending through warm air'];
  const SVG = (inner) => '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">' + inner + '</svg>';
  const CLOUD_D = 'M13 35H35A8 8 0 0 0 35.5 19A11 11 0 0 0 14.5 17.5A9 9 0 0 0 13 35Z';
  const RAYS = [0, 45, 90, 135, 180, 225, 270, 315].map(a => { const r = a * Math.PI / 180; return '<line x1="' + (24 + Math.cos(r) * 14).toFixed(1) + '" y1="' + (24 + Math.sin(r) * 14).toFixed(1) + '" x2="' + (24 + Math.cos(r) * 20).toFixed(1) + '" y2="' + (24 + Math.sin(r) * 20).toFixed(1) + '"/>'; }).join('');
  const ICONS = {
    sun: SVG('<g stroke="#ffc83d" stroke-width="3.4" stroke-linecap="round">' + RAYS + '</g><circle cx="24" cy="24" r="9.5" fill="#ffd84d" stroke="#f29d1f" stroke-width="2"/>'),
    cloud: SVG('<path d="' + CLOUD_D + '" fill="#f4f7ff" stroke="#9fb3d1" stroke-width="2"/>'),
    rain: SVG('<g transform="translate(0 -5)"><path d="' + CLOUD_D + '" fill="#dfe8f6" stroke="#8ea4c6" stroke-width="2"/></g><g stroke="#5ab8ff" stroke-width="3" stroke-linecap="round"><line x1="18" y1="35" x2="15.5" y2="41"/><line x1="25.5" y1="35" x2="23" y2="41"/><line x1="33" y1="35" x2="30.5" y2="41"/></g>'),
    storm: SVG('<g transform="translate(0 -6)"><path d="' + CLOUD_D + '" fill="#7a87a3" stroke="#4c5873" stroke-width="2"/></g><path d="M26 27L19 38H24.5L21.5 46L31 33.5H25.5L29 27Z" fill="#ffd84d" stroke="#e59a12" stroke-width="1.5" stroke-linejoin="round"/>'),
    fog: SVG('<g stroke="#e6edf5" stroke-width="3.4" stroke-linecap="round"><line x1="8" y1="17" x2="33" y2="17"/><line x1="15" y1="24" x2="40" y2="24"/><line x1="8" y1="31" x2="36" y2="31"/><line x1="14" y1="38" x2="34" y2="38"/></g>'),
    wind: SVG('<g fill="none" stroke="#c4ebff" stroke-width="3.4" stroke-linecap="round"><path d="M6 19H29A5.5 5.5 0 1 0 23.5 13.5"/><path d="M6 27H36A5.5 5.5 0 1 1 30.5 32.5"/><path d="M10 35H22"/></g>'),
    heat: SVG('<g fill="none" stroke-width="3.2" stroke-linecap="round"><path d="M15 42C11 37 19 34 15 29S19 21 15 16" stroke="#ff8a4c"/><path d="M24 42C20 37 28 34 24 29S28 21 24 16" stroke="#ffb547"/><path d="M33 42C29 37 37 34 33 29S37 21 33 16" stroke="#ff6b5a"/></g><circle cx="24" cy="9" r="3.6" fill="#ffd84d"/>'),
    snow: SVG('<g stroke="#eaf6ff" stroke-width="3" stroke-linecap="round" fill="none"><line x1="24" y1="8" x2="24" y2="40"/><line x1="10.1" y1="16" x2="37.9" y2="32"/><line x1="10.1" y1="32" x2="37.9" y2="16"/><path d="M19 11L24 15L29 11M19 37L24 33L29 37"/></g>'),
    partly: SVG('<g stroke="#ffc83d" stroke-width="2.8" stroke-linecap="round"><line x1="31" y1="2.5" x2="31" y2="5.5"/><line x1="41.5" y1="6.5" x2="39.4" y2="8.6"/><line x1="45.5" y1="17" x2="42.5" y2="17"/><line x1="20.5" y1="6.5" x2="22.6" y2="8.6"/></g><circle cx="31" cy="17" r="8" fill="#ffd84d" stroke="#f29d1f" stroke-width="1.8"/><path d="' + CLOUD_D + '" transform="translate(-3 5)" fill="#f4f7ff" stroke="#9fb3d1" stroke-width="2"/>'),
    rainbow: SVG('<g fill="none" stroke-width="3.8" stroke-linecap="round"><path d="M6 37A18 18 0 0 1 42 37" stroke="#ff5f6d"/><path d="M10.5 37A13.5 13.5 0 0 1 37.5 37" stroke="#ffd93d"/><path d="M15 37A9 9 0 0 1 33 37" stroke="#4db5ff"/></g><g fill="#f4f7ff"><circle cx="8" cy="39" r="4.5"/><circle cx="13" cy="40" r="3.5"/><circle cx="40" cy="39" r="4.5"/><circle cx="35" cy="40" r="3.5"/></g>')
  };
  const RESIZE = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const CLOCK = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8.6" fill="rgba(255,255,255,0.35)" stroke="currentColor" stroke-width="2.2"/><g class="wr-hh"><path d="M12 12V7.4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></g><g class="wr-mh"><path d="M12 12V5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></g><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>';
  const MINI = '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><circle cx="30" cy="17" r="8" fill="#ffd84d"/><path d="' + CLOUD_D + '" transform="translate(-4 4) scale(.92)" fill="#fff"/></svg>';

  (env.games = env.games || []).push({
    id: 'weather-report', mode: 'reset', name: 'Weather Report', verb: 'forecast', family: 'FEEL', minutes: 2,
    parents: ['Emotion', 'Identity / Self'],
    cast: ['sync'], poster: { char: 'sync', mood: 'E65' },
    tagline: 'Present the weather inside you, name it exactly, watch it pass.',
    why: 'For a big or murky feeling: naming it precisely turns the volume down.',
    css: `
.g-weather-report { --wr-hot: #ff7a3d; --wr-t1: #ffc35c; --wr-t2: #ff8a3d; --wr-tink: #2b1200; --wr-gold: #ffd166; }
.g-weather-report .wr-probe { position: absolute; left: 0; top: 0; width: 0; height: 0; visibility: hidden; pointer-events: none; padding: env(safe-area-inset-top, 0px) 0 env(safe-area-inset-bottom, 0px); }
.g-weather-report .wr-bug { position: absolute; z-index: 8; display: flex; gap: 6px; align-items: center; pointer-events: none; }
.g-weather-report .wr-live { display: inline-flex; align-items: center; gap: 6px; font: 700 12px/1 var(--font-ui); letter-spacing: 0.12em; text-transform: uppercase; color: #fff; background: #e23b3b; padding: 6px 9px 5px; border-radius: 6px; box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3); }
.g-weather-report .wr-live i { width: 7px; height: 7px; border-radius: 50%; background: #fff; box-shadow: 0 0 6px #fff; }
.g-weather-report .wr-clock { font: 700 12px/1 var(--font-ui); letter-spacing: 0.1em; color: #0c1834; background: rgba(255, 255, 255, 0.94); padding: 6px 9px 5px; border-radius: 6px; text-transform: uppercase; box-shadow: 0 3px 10px rgba(0, 0, 0, 0.22); white-space: nowrap; }
.g-weather-report .wr-caption { position: absolute; z-index: 7; left: 0; top: 0; transform: translateX(-50%); font: 700 12px/1 var(--font-ui); letter-spacing: 0.16em; text-transform: uppercase; color: #fff; text-shadow: 0 1px 6px rgba(0, 30, 20, 0.85); white-space: nowrap; pointer-events: none; transition: opacity 0.4s ease; }
.g-weather-report .wr-pal { position: absolute; z-index: 12; display: grid; gap: 6px; opacity: 0; transform: translateX(-24px); transition: opacity 0.45s ease, transform 0.55s cubic-bezier(.2, .9, .3, 1); pointer-events: none; }
.g-weather-report .wr-pal.on { opacity: 1; transform: none; pointer-events: auto; }
.g-weather-report .wr-pal.gone { opacity: 0; transform: translateX(-30px); pointer-events: none; }
.g-weather-report .wr-tile { appearance: none; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; padding: 3px 2px 4px; margin: 0; border-radius: 14px; cursor: grab; touch-action: none; color: #fff;
  background: linear-gradient(180deg, rgba(10, 48, 44, 0.84), rgba(4, 28, 26, 0.9)); border: 1px solid rgba(255, 255, 255, 0.24); box-shadow: 0 6px 14px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.14);
  transition: transform 0.15s ease, opacity 0.25s ease, background 0.2s, border-color 0.2s; font-family: var(--font-ui); }
.g-weather-report .wr-tile svg { width: 60%; max-width: 40px; aspect-ratio: 1; height: auto; pointer-events: none; filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.35)); }
.g-weather-report .wr-tile .wr-tl { font: 600 12px/1.05 var(--font-ui); letter-spacing: 0.02em; text-align: center; pointer-events: none; white-space: nowrap; }
.g-weather-report .wr-tile[aria-pressed="true"] { background: linear-gradient(180deg, rgba(255, 209, 102, 0.42), rgba(255, 170, 60, 0.3)); border-color: var(--wr-gold); box-shadow: 0 0 0 2px rgba(255, 209, 102, 0.35), 0 6px 14px rgba(0, 0, 0, 0.28); }
.g-weather-report .wr-tile[aria-pressed="true"]::after { content: ""; position: absolute; top: 5px; right: 5px; width: 9px; height: 9px; border-radius: 50%; background: var(--wr-gold); box-shadow: 0 0 6px var(--wr-gold); }
.g-weather-report .wr-tile.lift { transform: scale(0.92); opacity: 0.7; }
.g-weather-report .wr-tile.dim { opacity: 0.42; }
.g-weather-report .wr-tile:focus-visible { outline: 3px solid var(--wr-gold); outline-offset: 2px; }
.g-weather-report .wr-ghost { position: absolute; z-index: 40; left: 0; top: 0; width: 76px; height: 76px; margin: -38px 0 0 -38px; pointer-events: none; filter: drop-shadow(0 12px 16px rgba(0, 0, 0, 0.45)); transition: transform 0.14s ease; }
.g-weather-report .wr-ghost svg { width: 100%; height: 100%; display: block; }
.g-weather-report .wr-ghost.hot { transform: scale(1.22) rotate(-6deg); }
.g-weather-report .wr-ghost.fly { transition: left 0.42s cubic-bezier(.3, .8, .3, 1), top 0.42s cubic-bezier(.3, .8, .3, 1), transform 0.42s ease, opacity 0.42s ease; transform: scale(0.8); }
.g-weather-report .wr-handle { position: absolute; z-index: 16; left: 0; top: 0; width: 48px; height: 48px; margin: -24px 0 0 -24px; padding: 0; border-radius: 50%; border: 3px solid #fff; cursor: grab; touch-action: none;
  background: radial-gradient(circle at 40% 35%, #fff2c4, #ffc23d 62%, #e58a12); color: #4a2a00; display: grid; place-items: center; box-shadow: 0 0 0 5px rgba(255, 200, 80, 0.3), 0 8px 16px rgba(0, 0, 0, 0.38); }
.g-weather-report .wr-handle::before { content: ""; position: absolute; inset: -9px; border-radius: 50%; border: 3px solid rgba(255, 214, 120, 0.7); pointer-events: none; animation: wr-ring 1.54s ease-out infinite; }
.g-weather-report .wr-handle.on::before { animation: none; opacity: 0; }
.g-weather-report .wr-handle svg { width: 22px; height: 22px; }
.g-weather-report .wr-handle.on { transform: scale(1.14); }
.g-weather-report .wr-handle:focus-visible { outline: 3px solid #fff; outline-offset: 4px; }
@keyframes wr-ring { 0% { transform: scale(0.82); opacity: 0.95; } 100% { transform: scale(1.38); opacity: 0; } }
.g-weather-report .wr-tag { position: absolute; z-index: 15; left: 0; top: 0; transform: translateX(-50%); font: 700 12px/1 var(--font-ui); letter-spacing: 0.12em; text-transform: uppercase; color: #fff; background: rgba(8, 20, 40, 0.82);
  padding: 6px 9px 5px; border-radius: 7px; white-space: nowrap; pointer-events: none; box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3); }
.g-weather-report .wr-lower { position: absolute; z-index: 20; display: flex; flex-direction: column; align-items: flex-start; pointer-events: none; opacity: 0; transform: translateX(-18px);
  transition: opacity 0.45s ease, transform 0.6s cubic-bezier(.2, .9, .3, 1); }
.g-weather-report .wr-lower.on { opacity: 1; transform: none; }
.g-weather-report .wr-lt-tag { display: inline-flex; align-items: center; gap: 6px; font: 700 12px/1 var(--font-ui); letter-spacing: 0.14em; text-transform: uppercase; color: var(--wr-tink); background: linear-gradient(90deg, var(--wr-t1), var(--wr-t2)); padding: 5px 11px 5px 7px; border-radius: 9px 9px 0 0; }
.g-weather-report .wr-lt-tag svg { width: 18px; height: 18px; }
.g-weather-report .wr-lt-bar { display: flex; flex-direction: column; gap: 3px; width: 100%; box-shadow: 0 10px 22px rgba(0, 0, 0, 0.32); background: linear-gradient(90deg, rgba(10, 22, 50, 0.97), rgba(20, 40, 82, 0.93)); border-left: 5px solid var(--wr-hot); border-radius: 0 12px 12px 12px; padding: 9px 14px 10px; color: #fff; overflow: hidden; position: relative; }
.g-weather-report .wr-lt-bar::after { content: ""; position: absolute; inset: 0; background: linear-gradient(105deg, transparent 30%, rgba(255, 255, 255, 0.1) 45%, transparent 60%); transform: translateX(-100%); animation: wr-sheen 6.15s ease-in-out infinite; }
@keyframes wr-sheen { 0%, 60% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
.g-weather-report .wr-lt-main { font: 700 17px/1.22 var(--font-ui); letter-spacing: 0.005em; text-wrap: balance; }
.g-weather-report .wr-lt-sub { font: 500 13px/1.25 var(--font-ui); color: rgba(220, 232, 255, 0.86); }
.g-weather-report .wr-word { color: var(--wr-gold); font-size: max(17px, 1em); }
.g-weather-report.wr-bright .wr-lt-bar { background: linear-gradient(90deg, rgba(255, 255, 255, 0.99), rgba(242, 247, 255, 0.97)); color: #0f1d36; }
.g-weather-report.wr-bright .wr-lt-sub { color: #46557a; }
.g-weather-report.wr-bright .wr-word { color: #b4530a; }
.g-weather-report .wr-tray { position: absolute; z-index: 22; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; gap: 12px; transition: opacity 0.4s ease; box-sizing: border-box; }
.g-weather-report .wr-tray.desk { padding: 18px 20px; border-radius: 24px; background: color-mix(in srgb, var(--ui-surface) 93%, transparent); border: 1px solid var(--ui-line); box-shadow: 0 18px 44px rgba(0, 0, 0, 0.22); }
.g-weather-report .wr-dhead { display: none; }
.g-weather-report .wr-tray.desk .wr-dhead { display: flex; flex-direction: column; align-items: center; gap: 7px; width: 100%; padding-bottom: 14px; border-bottom: 1px solid var(--ui-line); text-align: center; }
.g-weather-report .wr-onair { font: 800 12px/1 var(--font-ui); letter-spacing: 0.16em; text-transform: uppercase; color: #fff; background: #e23b3b; padding: 6px 10px 5px; border-radius: 6px; }
.g-weather-report .wr-dhead b { font: 700 19px/1.1 var(--font-ui); color: var(--ui-fg); }
.g-weather-report .wr-dhead .wr-dp { font: 500 14px/1.25 var(--font-ui); color: var(--ui-muted); }
.g-weather-report .wr-body { display: flex; flex-direction: column; align-items: center; gap: 10px; width: 100%; }
.g-weather-report .wr-tray.desk .wr-body { flex: 1 1 auto; justify-content: flex-start; gap: 16px; padding-top: clamp(12px, 5vh, 56px); }
.g-weather-report .wr-dfoot { display: none; }
.g-weather-report .wr-tray.desk .wr-dfoot { display: flex; flex-direction: column; align-items: center; gap: 6px; width: 100%; padding-top: 14px; border-top: 1px solid var(--ui-line); text-align: center; }
.g-weather-report .wr-tray.desk .wr-dfoot[hidden] { display: none; }
.g-weather-report .wr-dalm { display: none; }
.g-weather-report .wr-tray.desk .wr-dalm { display: flex; flex-direction: column; align-items: center; gap: 9px; width: 100%; padding: 14px 0 6px; text-align: center; }
.g-weather-report .wr-tray.desk .wr-dalm[hidden] { display: none; }
.g-weather-report .wr-dalm > b { font: 700 12px/1 var(--font-ui); letter-spacing: 0.12em; text-transform: uppercase; color: var(--ui-muted); }
.g-weather-report .wr-dalm > span { font: 500 15px/1.35 var(--font-ui); color: var(--ui-muted); max-width: 30ch; text-wrap: balance; }
.g-weather-report .wr-dfoot b { font: 700 12px/1 var(--font-ui); letter-spacing: 0.14em; text-transform: uppercase; color: var(--ui-muted); }
.g-weather-report .wr-dfoot span { font: 500 15px/1.35 var(--font-ui); color: var(--ui-fg); max-width: 32ch; text-wrap: balance; }
.g-weather-report .wr-body.wr-swap { animation: wr-in 0.42s cubic-bezier(.2, 1.2, .4, 1) both; }
.g-weather-report .wr-run { display: flex; gap: 5px; justify-content: center; width: 100%; max-width: 440px; }
.g-weather-report .wr-run span { flex: 1 1 0; text-align: center; font: 700 12px/1 var(--font-ui); letter-spacing: 0.08em; text-transform: uppercase; color: var(--ui-muted); padding: 0 0 7px; border-bottom: 3px solid var(--ui-line); white-space: nowrap; transition: color 0.3s, border-color 0.3s; }
.g-weather-report .wr-run span.on { color: var(--ui-fg); border-color: var(--wr-hot); }
.g-weather-report .wr-run span.done { border-color: color-mix(in srgb, var(--wr-hot) 50%, transparent); }
.g-weather-report .wr-hint { margin: 0; font: 600 15px/1.32 var(--font-ui); text-align: center; color: var(--ui-fg); max-width: 36ch; text-wrap: balance; }
.g-weather-report .wr-hint.wr-sub { font-size: 14px; font-weight: 500; color: var(--ui-muted); }
.g-weather-report .wr-ed { display: flex; flex-direction: column; align-items: center; gap: 7px; text-align: center; padding: 14px 18px 15px; border-radius: 18px; background: linear-gradient(180deg, #1b3363, #0c1a3a); color: #fff; box-shadow: 0 12px 26px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.12); width: min(100%, 400px); box-sizing: border-box; }
.g-weather-report .wr-tray.desk .wr-ed { display: none; }
.g-weather-report .wr-ed b { font: 700 12px/1 var(--font-ui); letter-spacing: 0.16em; text-transform: uppercase; color: var(--wr-t1); }
.g-weather-report .wr-ed span { font: 700 18px/1.2 var(--font-ui); }
.g-weather-report .wr-ed small { font: 500 14px/1.3 var(--font-ui); color: rgba(220, 232, 255, 0.85); }
.g-weather-report .wr-placed { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; min-height: 44px; }
.g-weather-report .wr-pchip { appearance: none; display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 4px 12px 4px 5px; border-radius: 999px; border: 1px solid var(--ui-line); background: color-mix(in srgb, var(--ui-surface) 86%, transparent);
  color: var(--ui-fg); font: 600 14px/1 var(--font-ui); cursor: pointer; animation: wr-in 0.35s cubic-bezier(.2, 1.3, .4, 1) both; }
.g-weather-report .wr-pchip b { font-weight: 600; opacity: 0.6; font-size: 14px; }
.g-weather-report .wr-ti { width: 32px; height: 32px; border-radius: 50%; background: #17324f; display: grid; place-items: center; flex: none; }
.g-weather-report .wr-ti svg { width: 26px; height: 26px; }
.g-weather-report .wr-go { min-width: 210px; box-shadow: 0 10px 24px rgba(0, 0, 0, 0.28); animation: wr-in 0.4s cubic-bezier(.2, 1.3, .4, 1) both; }
@keyframes wr-in { from { opacity: 0; transform: translateY(10px) scale(0.97); } to { opacity: 1; transform: none; } }
.g-weather-report .wr-gauges { display: flex; flex-direction: column; gap: 6px; width: 100%; max-width: 420px; }
.g-weather-report .wr-gauge .wr-ti { width: 38px; height: 38px; } .g-weather-report .wr-gauge .wr-ti svg { width: 30px; height: 30px; }
.g-weather-report .wr-gauge { display: flex; align-items: center; gap: 10px; padding: 0 14px 0 6px; border-radius: 16px; background: linear-gradient(90deg, #1b3363, #0e1d3e); color: #fff; box-shadow: 0 6px 14px rgba(0, 0, 0, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.1); animation: wr-in 0.4s cubic-bezier(.2, 1.3, .4, 1) both; }
.g-weather-report .wr-segs { display: flex; flex: 1 1 auto; align-items: flex-end; min-width: 0; }
.g-weather-report .wr-seg { appearance: none; border: 0; background: none; margin: 0; padding: 0 2px; height: 46px; flex: 1 1 0; cursor: pointer; display: flex; align-items: center; }
.g-weather-report .wr-seg i { display: block; width: 100%; border-radius: 4px; background: rgba(255, 255, 255, 0.16); transition: background 0.2s, box-shadow 0.2s; }
.g-weather-report .wr-seg:nth-child(1) i { height: 9px; } .g-weather-report .wr-seg:nth-child(2) i { height: 13px; } .g-weather-report .wr-seg:nth-child(3) i { height: 17px; } .g-weather-report .wr-seg:nth-child(4) i { height: 21px; }
.g-weather-report .wr-seg.on i { background: linear-gradient(90deg, #ffd166, #ff9a3d); box-shadow: 0 0 10px rgba(255, 190, 90, 0.5); }
.g-weather-report .wr-seg:focus-visible { outline: 2px solid var(--wr-gold); outline-offset: -2px; border-radius: 6px; }
.g-weather-report .wr-gw { font: 700 13px/1 var(--font-ui); letter-spacing: 0.06em; text-transform: uppercase; color: var(--wr-gold); width: 84px; flex: none; text-align: right; white-space: nowrap; }
.g-weather-report .wr-tabs { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; }
.g-weather-report .wr-tab { appearance: none; display: inline-flex; align-items: center; gap: 7px; min-height: 44px; padding: 5px 13px 5px 6px; border-radius: 999px; border: 1px solid var(--ui-line);
  background: color-mix(in srgb, var(--ui-surface) 82%, transparent); color: var(--ui-fg); font: 600 14px/1 var(--font-ui); cursor: pointer; }
.g-weather-report .wr-tab[aria-selected="true"] { border-color: var(--ui-accent); background: color-mix(in srgb, var(--ui-accent) 24%, var(--ui-surface)); box-shadow: 0 0 0 2px color-mix(in srgb, var(--ui-accent) 30%, transparent); }
.g-weather-report .wr-chips .ts-chip { min-height: 44px; font-size: 15px; padding: 10px 15px; font-weight: 600; }
.g-weather-report .wr-chips .wr-seed { border-color: var(--wr-gold); }
.g-weather-report .wr-chips .wr-seed::after { content: " ✦"; color: var(--wr-gold); }
.g-weather-report.wr-bright .wr-chips .wr-seed::after { color: #c26a00; }
.g-weather-report .wr-chiphost { display: flex; flex-direction: column; align-items: center; width: 100%; }
.g-weather-report .wr-fc { display: flex; flex-direction: column; align-items: stretch; gap: 4px; width: 100%; max-width: 560px; }
.g-weather-report .wr-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.g-weather-report .wr-card { position: relative; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 9px 5px 8px; border-radius: 15px; color: #fff; text-align: center; min-width: 0;
  background: linear-gradient(180deg, #1d3768, #0c1a3a); border: 1px solid rgba(255, 255, 255, 0.14); box-shadow: 0 8px 18px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.12);
  transition: transform 0.4s cubic-bezier(.2, 1.3, .4, 1), border-color 0.3s, box-shadow 0.3s; perspective: 300px; }
.g-weather-report .wr-card.here, .g-weather-report .wr-card.lit { border-color: var(--wr-gold); box-shadow: 0 0 0 2px rgba(255, 209, 102, 0.35), 0 10px 22px rgba(0, 0, 0, 0.32); }
.g-weather-report .wr-card.here { transform: translateY(-4px) scale(1.04); }
.g-weather-report .wr-ch { font: 700 12px/1 var(--font-ui); letter-spacing: 0.1em; text-transform: uppercase; color: rgba(220, 232, 255, 0.86); white-space: nowrap; }
.g-weather-report .wr-ci { width: 46px; height: 46px; display: block; }
.g-weather-report .wr-ci svg { width: 100%; height: 100%; display: block; filter: drop-shadow(0 3px 4px rgba(0, 0, 0, 0.35)); }
.g-weather-report .wr-ci.flip { animation: wr-flip 0.55s cubic-bezier(.2, 1.3, .4, 1); }
@keyframes wr-flip { 0% { transform: rotateY(90deg) scale(0.8); opacity: 0.2; } 100% { transform: none; opacity: 1; } }
.g-weather-report .wr-ct { font: 600 13px/1.18 var(--font-ui); color: #eaf1ff; min-height: 2.36em; display: grid; place-items: center; text-wrap: balance; max-width: 100%; }
.g-weather-report .wr-ct.gk-user { font-size: 15px; color: var(--wr-gold); min-height: 2.1em; }
.g-weather-report .wr-time { position: relative; width: 100%; height: 58px; touch-action: none; cursor: grab; flex: none; --l: 58px; }
.g-weather-report .wr-time:focus-visible { outline: 2px solid var(--ui-accent); outline-offset: 2px; border-radius: 14px; }
.g-weather-report .wr-time.gone { opacity: 0; pointer-events: none; transition: opacity 0.4s ease; }
.g-weather-report .wr-track { position: absolute; left: var(--l); right: var(--l); top: 23px; height: 12px; border-radius: 6px; background: linear-gradient(90deg, #5d6f98 0%, #f08a4b 40%, #25346f 68%, #ffcf5c 100%); box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.35), 0 1px 0 rgba(255, 255, 255, 0.15); }
.g-weather-report .wr-track::after { content: ""; position: absolute; left: 0; right: 0; top: 2px; bottom: 2px; background: repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.5) 0 1.5px, transparent 1.5px 4.1667%); opacity: 0.5; border-radius: 6px; }
.g-weather-report .wr-stop { position: absolute; top: 21px; width: 16px; height: 16px; margin-left: -8px; border-radius: 50%; background: #fff; border: 3px solid #1d3557; pointer-events: none; box-sizing: border-box; }
.g-weather-report .wr-knob { position: absolute; top: 29px; left: 0; width: 54px; height: 54px; margin: -27px 0 0 -27px; border-radius: 50%; border: 3px solid #fff; color: #5a3300; display: grid; place-items: center; pointer-events: none; box-sizing: border-box;
  background: radial-gradient(circle at 40% 35%, #fff6d0, #ffc84a 62%, #e8901c); box-shadow: 0 0 0 6px rgba(255, 200, 80, 0.28), 0 8px 18px rgba(0, 0, 0, 0.38); transform: translateX(var(--x, 0px)); }
.g-weather-report .wr-knob.on { box-shadow: 0 0 0 9px rgba(255, 220, 120, 0.35), 0 0 26px rgba(255, 210, 110, 0.6), 0 8px 18px rgba(0, 0, 0, 0.38); }
.g-weather-report .wr-knob.fast { animation: wr-wob 0.42s ease; }
@keyframes wr-wob { 25% { margin-left: -31px; } 50% { margin-left: -23px; } 75% { margin-left: -29px; } }
.g-weather-report .wr-knob svg { width: 30px; height: 30px; }
.g-weather-report .wr-board { display: flex; flex-direction: column; align-items: center; gap: 7px; width: 100%; animation: wr-in 0.55s cubic-bezier(.2, 1.2, .4, 1) 0.25s both; }
.g-weather-report .wr-alab { font: 700 12px/1 var(--font-ui); letter-spacing: 0.12em; text-transform: uppercase; color: var(--ui-muted); }
.g-weather-report .wr-alm { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; max-width: 440px; }
.g-weather-report .wr-aw { display: inline-flex; align-items: center; gap: 6px; font: 600 15px/1 var(--font-ui); padding: 7px 12px; border-radius: 999px; background: color-mix(in srgb, var(--ui-surface) 84%, transparent); border: 1px solid var(--ui-line); color: var(--ui-fg); }
.g-weather-report .wr-aw.new { border-color: var(--wr-gold); background: linear-gradient(180deg, rgba(255, 209, 102, 0.34), rgba(255, 170, 60, 0.2)); box-shadow: 0 0 12px rgba(255, 200, 90, 0.35); }
.g-weather-report .wr-aw.new em { font: 800 12px/1 var(--font-ui); font-style: normal; letter-spacing: 0.08em; color: var(--wr-gold); }
.g-weather-report.wr-bright .wr-aw.new em { color: #b4530a; }
.g-weather-report .wr-aw.more { color: var(--ui-muted); }
.g-weather-report .wr-tiers { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
.g-weather-report .wr-tier { display: inline-flex; align-items: center; gap: 8px; font: 700 13px/1 var(--font-ui); letter-spacing: 0.07em; text-transform: uppercase; padding: 7px 13px 7px 7px; border-radius: 999px; background: linear-gradient(90deg, #13254b, #1f3d77); color: #fff; box-shadow: 0 6px 14px rgba(0, 0, 0, 0.25); white-space: nowrap; }
.g-weather-report .wr-medal { width: 22px; height: 22px; border-radius: 50%; flex: none; background: radial-gradient(circle at 35% 30%, #fff8d8, var(--m, #ffc84a) 58%, rgba(0, 0, 0, 0.35)); box-shadow: 0 0 9px var(--m, #ffc84a); }
.g-weather-report .wr-tier.nb { padding: 7px 12px; background: linear-gradient(90deg, var(--wr-t1), var(--wr-t2)); color: var(--wr-tink); }
.g-weather-report .wr-ticker { position: absolute; z-index: 20; display: flex; align-items: stretch; border-radius: 9px; overflow: hidden; background: rgba(8, 16, 36, 0.95); box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.1); pointer-events: none; }
.g-weather-report .wr-tk-tag { flex: none; display: flex; align-items: center; padding: 0 10px; font: 800 12px/1 var(--font-ui); letter-spacing: 0.12em; text-transform: uppercase; color: #fff; background: #e23b3b; }
.g-weather-report .wr-ticker.brk .wr-tk-tag { animation: wr-brk 0.77s ease-in-out 4; }
@keyframes wr-brk { 50% { background: #ff7262; box-shadow: 0 0 16px rgba(255, 90, 80, 0.9); } }
.g-weather-report .wr-tk-msg { display: block; flex: 1 1 auto; min-width: 0; padding: 0 12px; font: 600 14px/32px var(--font-ui); letter-spacing: 0.05em; text-transform: uppercase; color: #eaf1ff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: opacity 0.3s ease, transform 0.3s ease; }
.g-weather-report .wr-tk-msg.out { opacity: 0; transform: translateY(-6px); }
.g-weather-report .wr-tk-msg .gk-user { color: var(--wr-gold); }
.g-weather-report .gk-char .wr-clicker { position: absolute; right: -9px; bottom: 6px; width: 15px; height: 30px; border-radius: 6px; background: linear-gradient(180deg, #4a5268, #1a1f2c); box-shadow: 0 3px 6px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.2); transform: rotate(20deg); transition: transform 0.12s ease; }
.g-weather-report .gk-char .wr-clicker::before { content: ""; position: absolute; left: 3.5px; top: 5px; width: 8px; height: 8px; border-radius: 50%; background: #ff4d4d; box-shadow: 0 0 7px #ff4d4d; }
.g-weather-report .gk-char .wr-clicker.press { transform: rotate(20deg) translateY(2px) scale(0.92); }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el;
      const TAU = K.TAU, clamp = K.clamp;
      let an = ctx.analysis || {};
      const inten = ctx.intensity == null ? 1 : ctx.intensity;
      const visits = K.visits();
      const almanac0 = K.collection().filter(x => VOCAB.has(x));
      const grow = almanac0.length;
      const hour = new Date().getHours();
      const EDITION = hour >= 5 && hour < 12 ? 'Morning edition' : hour >= 12 && hour < 17 ? 'Afternoon edition' : hour >= 17 && hour < 21 ? 'Evening edition' : 'Late edition';
      const GREET = hour >= 5 && hour < 12 ? 'Good morning' : hour >= 12 && hour < 17 ? 'Good afternoon' : 'Good evening';
      const WORLD = K.dailyPick(WORLDS), PACK = K.dailyPick(PACKS, 1), FACT = K.dailyPick(FACTS, 2);
      const advanced = visits >= 2;
      let stage = 0, finished = false;
      if (ctx.analysisReady && ctx.analysisReady.then) ctx.analysisReady.then(a => { if (a && stage < 3) an = a; }, () => {});
      const items = [];
      let word = '', wordType = '', sizedOnce = false, laterSaid = false, curZone = 0;
      const W = { f: 0, ft: 0, warm: 0, rainbow: 0, flash: 0, drag: null, laser: null, t: 0, finT: 0, flying: false, nudge: 0, spin: 0, night: 0, sunK: 0 };
      const Pl = { x: 0, y: 0, r: 0, tx: 0, ty: 0, tr: 0, init: false };
      const s0 = clamp(0.82 + ((an.intensity || 6) - 1) / 9 * 0.45, 0.8, 1.28);
      let L = null;
      const ss = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
      const bump = (x, a, b, c) => (x <= a || x >= c ? 0 : x < b ? ss(a, b, x) : 1 - ss(b, c, x));
      const hs = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
      const backOut = (k) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
      const cap = (s) => s ? s[0].toUpperCase() + s.slice(1) : s;

      /* ---------------- lines (every one in all three vibes) ---------------- */
      const LN = {
        intro: { Jolly: '{g}! Today’s forecast comes from somewhere special: inside you.', Cheeky: '{g}! I’m Sync. Today the weather is… you. No pressure.', Unfiltered: 'We’re live. Today’s map is your insides. Let’s read it.' },
        back: { Jolly: '{g}, welcome back to the studio! Let’s read today’s inner weather.', Cheeky: 'A regular viewer! {g}. What’s the sky doing in there today?', Unfiltered: 'Back on air. New day, new weather. Let’s read it.' },
        step1: { Jolly: 'Drag the weather that matches how it feels in there. One to three.', Cheeky: 'Pick your weather, up to three. It’s live TV, so be honest.', Unfiltered: 'Drag on the weather that fits. One to three.' },
        full: { Jolly: 'Three systems. A full map! Tap when it looks right.', Cheeky: 'Busy skies. Tap when the map’s accurate.', Unfiltered: 'Map’s full. Tap when it’s right.' },
        step2: { Jolly: 'How big is it right now? Drag the gold handle to size it.', Cheeky: 'Now size it. Light drizzle or full monsoon?', Unfiltered: 'Size it. Small or huge. Be accurate.' },
        step3: { Jolly: 'Now name it exactly. The precise word turns the volume down.', Cheeky: 'Name it like a pro. “Bad” isn’t a weather.', Unfiltered: 'Pick the exact word. Precise names shrink feelings.' },
        named: { Jolly: 'Named it. See that? It’s already a little softer.', Cheeky: 'Look at that. Named, and a bit less loud.', Unfiltered: 'Named. Softer already. That’s the science.' },
        namedSun: { Jolly: 'Named it! Good feelings glow brighter when you name them.', Cheeky: 'Look at that glow. Naming the good stuff works too.', Unfiltered: 'Named. Savour that one.' },
        fresh: { Jolly: 'Ooh, a brand new word for your almanac!', Cheeky: 'New word unlocked. Look at that vocabulary.', Unfiltered: 'New word. Into the almanac.' },
        step4: { Jolly: 'Now the forecast. Slide it slowly, from now to tomorrow.', Cheeky: 'Fast-forward time. Slowly. Weather never sticks around.', Unfiltered: 'Slide it forward, slowly. Watch it move on.' },
        slow: { Jolly: 'Easy… let it roll through at its own pace.', Cheeky: 'Whoa there, time traveller. Slower.', Unfiltered: 'Slower. Weather moves at its own pace.' },
        later: { Jolly: 'See? It’s already moving through.', Cheeky: 'Already drifting off. Typical weather.', Unfiltered: 'Moving. Like weather does.' },
        fin: { Jolly: 'And that’s your forecast: {w}, passing through. Back to you!', Cheeky: '{W}, moving through. Weather always does. Back to you!', Unfiltered: '{W}. Moving through. That’s the weather.' }
      };
      const PLACE = {
        sun: { Jolly: 'Some sunshine in there too. Love that.', Cheeky: 'Sun! A mixed forecast. Nice.', Unfiltered: 'Sun. Good. Keep it.' },
        cloud: { Jolly: 'Cloud cover. Heavy skies count too.', Cheeky: 'Grey and moody. Very cinematic.', Unfiltered: 'Clouds. Noted.' },
        rain: { Jolly: 'Rain on the map. That’s allowed.', Cheeky: 'Drizzly in there. Brolly out.', Unfiltered: 'Rain. Fair enough.' },
        storm: { Jolly: 'A storm system. Thanks for reporting it.', Cheeky: 'Thunder rolling in. Respect.', Unfiltered: 'Storm. Big energy. Noted.' },
        fog: { Jolly: 'Foggy. Hard to see far. That’s real.', Cheeky: 'Visibility: low. Classic fog.', Unfiltered: 'Fog. Can’t see much. Okay.' },
        wind: { Jolly: 'Windy! Everything’s moving fast in there.', Cheeky: 'Gusty. Hold onto your hat.', Unfiltered: 'Wind. Restless air. Got it.' },
        heat: { Jolly: 'Heat haze. That hot, prickly feeling.', Cheeky: 'Hot cheeks weather. Been there.', Unfiltered: 'Heat. Burning-face kind of day.' },
        snow: { Jolly: 'Snow. Everything slowed right down.', Cheeky: 'Snowed in. Blanket weather.', Unfiltered: 'Snow. Frozen and heavy. Okay.' }
      };
      const FACE = { sun: 'happy', cloud: 'think', rain: 'sad', storm: 'storm', fog: 'confused', wind: 'dizzy', heat: 'shy', snow: 'sleepy' };
      const say = (lines, o) => keeper.say(ctx.line(lines).replace('{g}', GREET), o);

      /* ---------------- world ---------------- */
      el.classList.toggle('wr-bright', !K.dark());
      el.style.setProperty('--wr-hot', PACK.hot); el.style.setProperty('--wr-t1', PACK.t1); el.style.setProperty('--wr-t2', PACK.t2); el.style.setProperty('--wr-tink', PACK.ink);
      const probe = h('div', { class: 'wr-probe', 'aria-hidden': 'true' });
      el.append(probe);
      const cv = K.canvas(el, { maxDpr: 1.75 }); // soft illustration: 1.75x is visually identical on phones and ~23% cheaper per frame
      let bg = null, bgWarm = null;
      const P = K.particles();
      const liveDot = h('i');
      const clockEl = h('span', { class: 'wr-clock', text: 'Now' });
      const bug = h('div', { class: 'wr-bug', 'aria-hidden': 'true' }, h('span', { class: 'wr-live' }, liveDot, 'Live'), clockEl);
      const caption = h('span', { class: 'wr-caption', text: 'Your inner planet', 'aria-hidden': 'true' });
      const pal = h('div', { class: 'wr-pal', role: 'group', 'aria-label': 'Weather icons. Drag one onto your planet.' });
      const tiles = {};
      ORDER.forEach(type => { const b = h('button', { type: 'button', class: 'wr-tile', 'aria-pressed': 'false', 'aria-label': WX[type].label + '. Drag onto your planet, or press to add.', html: ICONS[type] + '<span class="wr-tl">' + WX[type].label + '</span>' }); tiles[type] = b; pal.append(b); });
      const ghost = h('div', { class: 'wr-ghost', hidden: true, 'aria-hidden': 'true' });
      const lower = h('div', { class: 'wr-lower', role: 'status', 'aria-live': 'polite' });
      const ltTagText = h('span', { text: 'Inner weather' });
      const ltMain = h('div', { class: 'wr-lt-main' }), ltSub = h('div', { class: 'wr-lt-sub' });
      lower.append(h('div', { class: 'wr-lt-tag' }, h('span', { html: MINI }), ltTagText), h('div', { class: 'wr-lt-bar' }, ltMain, ltSub));
      const tray = h('div', { class: 'wr-tray' });
      const body = h('div', { class: 'wr-body' });
      const foot = h('div', { class: 'wr-dfoot', 'aria-hidden': 'true' }, h('b', { text: 'Weather fact' }), h('span', { text: FACT }));
      const dalm = h('div', { class: 'wr-dalm', 'aria-hidden': 'true' }, h('b', { text: grow ? 'Your emotion almanac · ' + grow + (grow === 1 ? ' word' : ' words') : 'Your emotion almanac' }),
        grow ? h('div', { class: 'wr-alm' }, almanac0.slice(-8).reverse().map(x => h('span', { class: 'wr-aw', text: cap(x) }))) : h('span', { text: 'Every precise word you name today is kept here.' }));
      tray.append(h('div', { class: 'wr-dhead', 'aria-hidden': 'true' }, h('span', { class: 'wr-onair', text: 'On air' }), h('b', { text: EDITION }), h('span', { class: 'wr-dp', text: 'Today’s planet: ' + WORLD.name })), body, dalm, foot);
      const tkTag = h('span', { class: 'wr-tk-tag', text: 'Latest' }), tkMsg = h('span', { class: 'wr-tk-msg' });
      const ticker = h('div', { class: 'wr-ticker', 'aria-hidden': 'true' }, tkTag, tkMsg);
      el.append(bug, caption, pal, lower, tray, ticker, ghost);
      const keeper = K.character('sync', { side: 'right', mood: 'E65', x: 12, y: 400, size: el.clientWidth >= 700 ? 112 : 84 });
      const clicker = h('i', { class: 'wr-clicker', 'aria-hidden': 'true' });
      keeper.el.append(clicker);
      const music = K.music('lofi');
      music.level(0.55);

      /* ---------------- layout ---------------- */
      function layout() {
        const w = el.clientWidth || cv.w || 390, H = el.clientHeight || cv.h || 844;
        const cs = getComputedStyle(probe);
        const insT = parseFloat(cs.paddingTop) || 0, insB = parseFloat(cs.paddingBottom) || 0;
        const wide = w >= 700, top = insT + 62, bottom = H - insB - 16;
        const l = { w, H, wide, r0: wide ? 20 : 16 };
        if (!wide) {
          l.ticker = { x: 12, y: bottom - 32, w: w - 24, h: 32 };
          const mapH = clamp(Math.round(H * 0.37), 236, 340);
          l.map = { x: 12, y: top, w: w - 24, h: mapH };
          l.ltH = 80; l.lt = { x: 12, y: l.map.y + l.map.h - 18, w: w - 24 };
          l.sz = 84; l.pres = { x: 12, y: l.lt.y + l.ltH + 6 };
          const ty = l.pres.y + l.sz + 8;
          l.tray = { x: 12, y: ty, w: w - 24, h: Math.max(170, l.ticker.y - 8 - ty) };
          l.desk = ty - 16;
          const tw = 62, th = clamp(Math.floor((l.map.h - 20 - 22 - 18) / 4), 48, 64);
          l.pal = { x: l.map.x + 10, y: l.map.y + 10, tw, th };
          const px = l.pal.x + 2 * tw + 6;
          l.p1 = { x: px + (l.map.x + l.map.w - px) / 2, y: l.map.y + l.map.h * 0.56, r: Math.min(56, l.map.h * 0.18) };
          l.p2 = { x: l.map.x + l.map.w / 2, y: l.map.y + l.map.h * 0.56, r: Math.min(70, l.map.h * 0.2) };
        } else {
          l.ticker = { x: 24, y: bottom - 34, w: w - 48, h: 34 };
          const pw = clamp(Math.round(w * 0.32), 340, 440);
          l.map = { x: 24, y: top, w: w - 48 - pw - 20, h: l.ticker.y - 14 - top };
          l.tray = { x: l.map.x + l.map.w + 20, y: top, w: pw, h: l.map.h };
          l.ltH = 84; l.lt = { x: l.map.x + 16, y: l.map.y + l.map.h - l.ltH - 16, w: Math.min(600, l.map.w - 32) };
          l.sz = 112; l.pres = { x: l.map.x + 22, y: l.lt.y - l.sz - 30 };
          l.desk = 0;
          const tw = 100, th = clamp(Math.floor((l.pres.y - 16 - (l.map.y + 22) - 18) / 4), 56, 84);
          l.pal = { x: l.map.x + 22, y: l.map.y + 22, tw, th };
          const px = l.pal.x + 2 * tw + 6;
          l.p1 = { x: px + (l.map.x + l.map.w - px) / 2, y: l.map.y + l.map.h * 0.44, r: Math.min(118, l.map.h * 0.16) };
          l.p2 = { x: l.map.x + l.map.w * 0.54, y: l.map.y + l.map.h * 0.45, r: Math.min(140, l.map.h * 0.19) };
        }
        l.lamps = []; const n = wide ? 7 : 4; for (let i = 0; i < n; i++) l.lamps.push(w * (i + 0.5) / n);
        L = l;
        const pos = (node, r) => { node.style.left = r.x + 'px'; node.style.top = r.y + 'px'; if (r.w != null) node.style.width = r.w + 'px'; if (r.h != null) node.style.height = r.h + 'px'; };
        pos(tray, l.tray); pos(ticker, l.ticker);
        tray.classList.toggle('desk', wide);
        lower.style.left = l.lt.x + 'px'; lower.style.width = l.lt.w + 'px'; lower.style.top = 'auto'; lower.style.bottom = (H - l.lt.y - l.ltH) + 'px';
        bug.style.right = (w - l.map.x - l.map.w + 10) + 'px'; bug.style.top = (l.map.y + 10) + 'px';
        pal.style.left = l.pal.x + 'px'; pal.style.top = l.pal.y + 'px';
        pal.style.gridTemplateColumns = 'repeat(2, ' + l.pal.tw + 'px)'; pal.style.gridAutoRows = l.pal.th + 'px';
        keeper.el.style.setProperty('--sz', l.sz + 'px');
        keeper.place(l.pres.x, l.pres.y);
        const tp = stage <= 1 ? l.p1 : l.p2;
        Pl.tx = tp.x; Pl.ty = tp.y; Pl.tr = tp.r;
        if (!Pl.init) { Pl.x = tp.x; Pl.y = tp.y; Pl.r = tp.r; Pl.init = true; }
        renderBg();
        fitTime();
      }

      /* ---------------- the studio, cached: it only changes on resize, theme and the finale's warm-up ---------------- */
      function rr(g, x, y, w, hh, r, keep) { r = Math.max(0, Math.min(r, w / 2, hh / 2)); if (!keep) g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
      function front(g, pts, cold) {
        const m = L.map, col = cold ? 'rgba(130,190,255,0.5)' : 'rgba(255,135,120,0.5)';
        const pp = pts.map(p => ({ x: m.x + p[0] * m.w, y: m.y + p[1] * m.h }));
        g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 2.2; g.beginPath(); pp.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.stroke();
        let acc = 14;
        for (let i = 1; i < pp.length; i++) {
          const a = pp[i - 1], b = pp[i], dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, th = Math.atan2(uy, ux);
          while (acc < len) {
            const x = a.x + ux * acc, y = a.y + uy * acc;
            g.beginPath();
            if (cold) { g.moveTo(x - ux * 6, y - uy * 6); g.lineTo(x + ux * 6, y + uy * 6); g.lineTo(x + uy * 8, y - ux * 8); g.closePath(); }
            else { g.moveTo(x, y); g.arc(x, y, 6, th - Math.PI, th); g.closePath(); }
            g.fill(); acc += 28;
          }
          acc -= len;
        }
      }
      function paintStudio(warm) {
        const w = cv.w, H = cv.h, d = cv.dpr, dark = K.dark(), m = L.map;
        const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * d)); c.height = Math.max(1, Math.round(H * d));
        const g = c.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0);
        const wall = g.createLinearGradient(0, 0, 0, H);
        if (dark) { wall.addColorStop(0, '#0b1433'); wall.addColorStop(0.5, '#131f47'); wall.addColorStop(1, '#070b1d'); }
        else { wall.addColorStop(0, '#d6e0f1'); wall.addColorStop(0.5, '#e7edf7'); wall.addColorStop(1, '#c6d1e4'); }
        g.fillStyle = wall; g.fillRect(0, 0, w, H);
        g.strokeStyle = dark ? 'rgba(160,180,255,0.07)' : 'rgba(40,60,100,0.08)'; g.lineWidth = 1;
        for (let x = 28; x < w; x += 58) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, H); g.stroke(); }
        if (L.desk) { // the presenter's desk: the controls sit on it
          const dy = L.desk, dg = g.createLinearGradient(0, dy, 0, H);
          if (dark) { dg.addColorStop(0, '#1a2856'); dg.addColorStop(0.07, '#0e1838'); dg.addColorStop(1, '#03060e'); }
          else { dg.addColorStop(0, '#fbfcff'); dg.addColorStop(0.07, '#dfe6f2'); dg.addColorStop(1, '#b9c5da'); }
          g.save(); g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 24; g.shadowOffsetY = -4;
          g.fillStyle = dg; rr(g, 4, dy, w - 8, H - dy + 40, 28); g.fill(); g.restore();
          g.fillStyle = K.hexA(PACK.hot, dark ? 0.8 : 0.9); rr(g, 30, dy - 1, w - 60, 3, 1.5); g.fill();
          const glow = g.createLinearGradient(0, dy, 0, dy + 46); glow.addColorStop(0, K.hexA(PACK.hot, dark ? 0.16 : 0.12)); glow.addColorStop(1, K.hexA(PACK.hot, 0));
          g.fillStyle = glow; g.fillRect(8, dy + 2, w - 16, 46);
        }
        g.fillStyle = dark ? '#1a2342' : '#9aa7bf'; g.fillRect(0, 6, w, 10);
        g.strokeStyle = dark ? 'rgba(140,160,220,0.25)' : 'rgba(60,72,100,0.35)'; g.lineWidth = 1.2;
        g.beginPath(); for (let x = 0; x < w; x += 14) { g.moveTo(x, 6); g.lineTo(x + 7, 16); g.lineTo(x + 14, 6); } g.stroke();
        L.lamps.forEach(lx => { g.fillStyle = dark ? '#252f52' : '#6f7d99'; g.beginPath(); g.moveTo(lx - 10, 14); g.lineTo(lx + 10, 14); g.lineTo(lx + 13, 30); g.lineTo(lx - 13, 30); g.closePath(); g.fill(); });
        const halo = g.createRadialGradient(m.x + m.w / 2, m.y + m.h / 2, 10, m.x + m.w / 2, m.y + m.h / 2, Math.max(m.w, m.h) * 0.8);
        halo.addColorStop(0, dark ? 'rgba(50,210,150,0.22)' : 'rgba(40,170,120,0.16)'); halo.addColorStop(1, 'rgba(50,210,150,0)');
        g.fillStyle = halo; g.fillRect(0, 0, w, H);
        // the green screen: bezel, glow, grid, isobars, fronts, pressure letters, sheen, vignette
        g.save(); g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 28; g.shadowOffsetY = 12;
        g.fillStyle = dark ? '#060a16' : '#24304b'; rr(g, m.x - 4, m.y - 4, m.w + 8, m.h + 8, L.r0 + 4); g.fill(); g.restore();
        g.save(); rr(g, m.x, m.y, m.w, m.h, L.r0); g.clip();
        const gs = g.createRadialGradient(m.x + m.w * 0.5, m.y + m.h * 0.42, 10, m.x + m.w * 0.5, m.y + m.h * 0.5, Math.max(m.w, m.h) * 0.78);
        if (dark) { gs.addColorStop(0, '#27a87a'); gs.addColorStop(0.55, '#17805c'); gs.addColorStop(1, '#0a4433'); }
        else { gs.addColorStop(0, '#46cf93'); gs.addColorStop(0.55, '#2fae79'); gs.addColorStop(1, '#1b8459'); }
        g.fillStyle = gs; g.fillRect(m.x, m.y, m.w, m.h);
        const step = L.wide ? 52 : 38;
        g.strokeStyle = 'rgba(255,255,255,0.075)'; g.lineWidth = 1; g.beginPath();
        for (let x = m.x + step; x < m.x + m.w; x += step) { g.moveTo(x + 0.5, m.y); g.lineTo(x + 0.5, m.y + m.h); }
        for (let y = m.y + step; y < m.y + m.h; y += step) { g.moveTo(m.x, y + 0.5); g.lineTo(m.x + m.w, y + 0.5); }
        g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.13)'; g.lineWidth = 1.6;
        for (let i = 0; i < 5; i++) { g.beginPath(); for (let x = m.x - 10; x <= m.x + m.w + 10; x += 8) { const y = m.y + m.h * (0.14 + i * 0.19) + Math.sin(x * 0.011 + i * 1.7) * m.h * 0.05 + Math.sin(x * 0.029 + i) * 5; if (x === m.x - 10) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke(); }
        front(g, [[0.56, 1.04], [0.68, 0.88], [0.83, 0.8], [1.04, 0.7]], true);
        front(g, [[0.62, -0.04], [0.74, 0.1], [0.87, 0.14], [1.04, 0.25]], false);
        if (L.wide) { front(g, [[-0.04, 0.62], [0.06, 0.7], [0.12, 0.84], [0.1, 1.04]], true); }
        g.font = '700 ' + (L.wide ? 22 : 17) + 'px ' + (getComputedStyle(el).fontFamily || 'sans-serif'); g.fillStyle = 'rgba(255,255,255,0.22)'; g.textAlign = 'center';
        g.fillText('H', m.x + m.w * 0.88, m.y + m.h * 0.86); g.fillText('L', m.x + m.w * (L.wide ? 0.86 : 0.86), m.y + m.h * 0.32);
        const sheen = g.createLinearGradient(m.x, m.y, m.x + m.w * 0.6, m.y + m.h);
        sheen.addColorStop(0, 'rgba(255,255,255,0.1)'); sheen.addColorStop(0.45, 'rgba(255,255,255,0)'); g.fillStyle = sheen; g.fillRect(m.x, m.y, m.w, m.h);
        const vg = g.createRadialGradient(m.x + m.w / 2, m.y + m.h / 2, Math.min(m.w, m.h) * 0.35, m.x + m.w / 2, m.y + m.h / 2, Math.max(m.w, m.h) * 0.72);
        vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,18,12,0.38)'); g.fillStyle = vg; g.fillRect(m.x, m.y, m.w, m.h);
        g.restore();
        g.strokeStyle = 'rgba(255,255,255,0.16)'; g.lineWidth = 1; rr(g, m.x + 0.5, m.y + 0.5, m.w - 1, m.h - 1, L.r0); g.stroke();
        // studio lights (cool blue, or warm amber for the finale)
        const cr = Math.round(170 + 85 * warm), cgr = Math.round(198 - 10 * warm), cb = Math.round(255 - 140 * warm);
        g.save(); g.globalCompositeOperation = dark ? 'lighter' : 'source-over';
        L.lamps.forEach(lx => {
          const a = (dark ? 0.06 : 0.07) + warm * 0.07;
          const gr = g.createLinearGradient(lx, 28, lx, H * 0.9);
          gr.addColorStop(0, 'rgba(' + cr + ',' + cgr + ',' + cb + ',' + (a * 2.2) + ')'); gr.addColorStop(1, 'rgba(' + cr + ',' + cgr + ',' + cb + ',0)');
          g.fillStyle = gr; g.beginPath(); g.moveTo(lx - 9, 28); g.lineTo(lx + 9, 28); g.lineTo(lx + H * 0.16, H * 0.9); g.lineTo(lx - H * 0.16, H * 0.9); g.closePath(); g.fill();
          const lg = g.createRadialGradient(lx, 30, 0, lx, 30, 24 + warm * 10);
          lg.addColorStop(0, 'rgba(' + cr + ',' + cgr + ',' + cb + ',0.95)'); lg.addColorStop(1, 'rgba(' + cr + ',' + cgr + ',' + cb + ',0)');
          g.fillStyle = lg; g.fillRect(lx - 36, -6, 72, 72);
        });
        g.restore();
        if (warm > 0) { const wg = g.createLinearGradient(0, 0, 0, H); wg.addColorStop(0, 'rgba(255,170,80,' + (0.16 * warm) + ')'); wg.addColorStop(1, 'rgba(255,120,60,' + (0.05 * warm) + ')'); g.fillStyle = wg; g.fillRect(0, 0, w, H); }
        return c;
      }
      function renderBg() { if (!L || !cv.w) return; bg = paintStudio(0); if (bgWarm) bgWarm = paintStudio(1); }
      S.on('theme', () => { el.classList.toggle('wr-bright', !K.dark()); renderBg(); });

      /* ---------------- the beat: everything hypnotic follows the music's own clock ---------------- */
      const SPB0 = 60 / 78;
      function beat() {
        const m = music;
        if (A.ctx && m && m.on && m.next > 0) { const spb = 60 / m.bpm, now = A.now() - A.latency(), k = (now - m.next) / spb, fl = Math.floor(k); return { pos: m.beat + fl + (k - fl), spb }; }
        return { pos: W.t / SPB0, spb: SPB0 };
      }
      function gridTime(div) { const m = music; if (!A.ctx || !m || !(m.next > 0)) return A.ctx ? A.now() : 0; const sp = 60 / m.bpm / div, now = A.now() + 0.012; return m.next + Math.ceil((now - m.next) / sp) * sp; }
      const CH = [['F4', 'A4', 'C5', 'E5'], ['F4', 'A4', 'B4', 'D5'], ['E4', 'G4', 'B4', 'D5'], ['E4', 'G4', 'C5']];
      function chordAt(time) { const m = music; if (!m || !(m.next > 0)) return CH[0]; const bi = m.beat + Math.floor((time - m.next) / (60 / m.bpm) + 1e-4); return CH[((Math.floor(bi / 4) % 4) + 4) % 4]; }
      let pingBar = -1;
      function radarPing() {
        const m = music;
        if (!A.ctx || !m || !(m.next > 0) || stage < 1 || stage >= 5 || K.reduced()) return;
        const nb = m.beat + ((4 - (m.beat % 4)) % 4), tb = m.next + (nb - m.beat) * (60 / m.bpm);
        if (nb !== pingBar && tb - A.now() < 0.25) { pingBar = nb; A.tone({ when: tb, type: 'sine', freq: 1318.5, to: 1240, glide: 0.25, dur: 0.4, vol: 0.016, verb: 0.45 }); }
      }

      /* ---------------- weather on the planet ---------------- */
      const SLOTS = [{ x: -0.46, y: -1.16 }, { x: 0.52, y: -1.04 }, { x: 0.04, y: -1.62 }];
      function assignSlots() { let c = 0; items.forEach(it => { it.slot = CLOUDY[it.type] ? c++ : -1; }); }
      const isPlaced = (type) => items.some(i => i.type === type);
      function itemC(it) {
        const r = Pl.r, u = r * it.sd * (0.35 + 0.65 * backOut(Math.min(1, it.pop))) * (1 - 0.14 * (it.calm || 0));
        let x = Pl.x, y = Pl.y;
        if (it.slot >= 0) { const sl = SLOTS[it.slot % 3]; x += sl.x * r; y += sl.y * r; if (L) y = Math.max(y, L.map.y + 26 + u * 0.8); }
        else if (it.type === 'sun') { x -= (1.3 + 0.42 * W.sunK) * r; y -= (1.08 + 0.42 * W.sunK) * r; }
        else if (it.type === 'heat') { y -= r; }
        if (it.type !== 'sun' && L) x += W.f * L.map.w * 0.55;
        return { x, y, u };
      }
      function originOf(it) { const c = itemC(it); if (it.type === 'fog' || it.type === 'wind') return { x: Pl.x, y: Pl.y }; if (it.type === 'heat') return { x: Pl.x, y: Pl.y - Pl.r }; return { x: c.x, y: c.y }; }
      function handleAt(it) {
        const c = itemC(it), u = c.u, r = Pl.r;
        let x, y;
        if (it.slot >= 0) { const side = SLOTS[it.slot % 3].x < -0.1 ? -1 : 1; if (it.slot === 2) { x = c.x + 0.42 * u; y = c.y - 0.7 * u; } else { x = c.x + side * 0.98 * u; y = c.y + 0.08 * u; } }
        else if (it.type === 'sun') { x = c.x - 0.62 * u; y = c.y - 0.62 * u; }
        else if (it.type === 'fog') { x = Pl.x + 1.32 * u; y = Pl.y + 0.12 * r; }
        else if (it.type === 'wind') { const rho = r * (1.22 + 0.22 * it.sd); x = Pl.x + rho * 0.88; y = Pl.y - rho * 0.47; }
        else { x = Pl.x + 0.5 * u; y = Pl.y - r - 0.9 * u; }
        const m = L.map;
        return { x: clamp(x, m.x + 28, m.x + m.w - 28), y: clamp(y, m.y + 30, m.y + m.h - 40) };
      }
      const alphaOf = (it) => it.k * Math.min(1, it.pop * 2) * (it.type === 'sun' ? 1 : 1 - ss(0.3, 0.92, W.f));
      const surfY = (x) => { const dx = x - Pl.x; return Math.abs(dx) < Pl.r ? Pl.y - Math.sqrt(Pl.r * Pl.r - dx * dx) : Pl.y + Pl.r * 1.1; };
      function circ(g, x, y, r) { g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); }
      function cloudAt(g, x, y, u, a, dark) {
        if (a <= 0.01) return;
        g.globalAlpha = Math.min(1, a);
        const top = y - u * 0.8, bot = y + u * 0.32, gr = g.createLinearGradient(0, top, 0, bot);
        if (dark) { gr.addColorStop(0, '#9aa4ba'); gr.addColorStop(0.55, '#5d6780'); gr.addColorStop(1, '#353d52'); }
        else { gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.6, '#eef3fb'); gr.addColorStop(1, '#bccadf'); }
        g.fillStyle = gr; g.beginPath();
        circ(g, x - u * 0.52, y - u * 0.02, u * 0.36); circ(g, x - u * 0.08, y - u * 0.3, u * 0.5); circ(g, x + u * 0.48, y - u * 0.08, u * 0.38);
        rr(g, x - u * 0.92, y - u * 0.1, u * 1.84, u * 0.42, u * 0.21, true);
        g.fill();
        g.globalAlpha = Math.min(1, a) * 0.5; g.fillStyle = dark ? 'rgba(20,24,40,0.5)' : 'rgba(120,140,175,0.35)';
        g.beginPath(); g.ellipse(x, y + u * 0.27, u * 0.82, u * 0.06, 0, 0, TAU); g.fill();
        g.globalAlpha = 1;
      }
      function drops(g, it, c, a, t, heavy) {
        const n = Math.round((heavy ? 26 : 18) * it.sd * Math.min(1, a) * (K.reduced() ? 0.5 : 1));
        if (n <= 0) return;
        g.strokeStyle = heavy ? 'rgba(185,215,255,0.9)' : 'rgba(140,200,255,0.9)'; g.lineWidth = heavy ? 1.9 : 1.6; g.lineCap = 'round';
        g.globalAlpha = Math.min(1, a); g.beginPath();
        for (let i = 0; i < n; i++) {
          const rx = c.x + (hs(i + it.seed) - 0.5) * c.u * 1.5, y0 = c.y + c.u * 0.28, y1 = Math.max(y0 + 12, surfY(rx));
          const sp = (heavy ? 1.7 : 1.15) * (0.8 + hs(i * 3.1 + it.seed) * 0.4) * (0.5 + 0.5 * Math.min(1, a));
          const ph = (t * sp + hs(i * 7.7)) % 1, yy = y0 + ph * (y1 - y0), dl = Math.min(c.u * 0.16, 11);
          g.moveTo(rx, yy); g.lineTo(rx - dl * 0.22, yy + dl);
        }
        g.stroke(); g.globalAlpha = 1;
      }
      function flakes(g, it, c, a, t) {
        const n = Math.round(22 * it.sd * Math.min(1, a) * (K.reduced() ? 0.5 : 1));
        g.fillStyle = '#ffffff'; g.globalAlpha = Math.min(1, a);
        g.beginPath();
        for (let i = 0; i < n; i++) {
          const bx = c.x + (hs(i + it.seed) - 0.5) * c.u * 1.6, y0 = c.y + c.u * 0.25, y1 = Math.max(y0 + 12, surfY(bx));
          const ph = (t * 0.32 * (0.7 + hs(i * 5.3) * 0.6) + hs(i * 9.1)) % 1, yy = y0 + ph * (y1 - y0), xx = bx + Math.sin(t * 1.4 + i) * c.u * 0.07;
          circ(g, xx, yy, 1.4 + hs(i * 2.7) * 1.6);
        }
        g.fill(); g.globalAlpha = 1;
      }
      function bolt(g, it, c, a) {
        if (a < 0.62 || inten === 0) { it.bolt = null; return; }
        if (!it.bolt && Math.random() < 0.016 * a * (inten === 2 ? 1.5 : 1)) {
          const pts = [], x0 = c.x + (Math.random() - 0.5) * c.u * 0.6, y0 = c.y + c.u * 0.2, x1 = Pl.x + (Math.random() - 0.5) * Pl.r * 0.8, y1 = surfY(x1);
          for (let i = 0; i <= 6; i++) { const k = i / 6; pts.push({ x: x0 + (x1 - x0) * k + (i && i < 6 ? (Math.random() - 0.5) * c.u * 0.28 : 0), y: y0 + (y1 - y0) * k }); }
          it.bolt = { pts, life: 0.22 };
          if (!K.reduced()) { W.flash = Math.max(W.flash, 0.5 * a); W.nudge = Math.max(W.nudge, 0.5); }
          if (A.ctx) { A.noise({ pink: true, filter: 'lowpass', freq: 170, dur: 1.5, attack: 0.05, vol: 0.18 * a }); A.noise({ filter: 'highpass', freq: 2500, dur: 0.12, vol: 0.05 }); }
        }
        if (it.bolt) {
          it.bolt.life -= 1 / 60;
          if (it.bolt.life <= 0) { it.bolt = null; return; }
          const p = it.bolt.pts;
          [[7, 'rgba(255,240,170,0.28)'], [2.6, '#fffbe6']].forEach(([lw, col]) => { g.strokeStyle = col; g.lineWidth = lw; g.lineJoin = 'round'; g.beginPath(); p.forEach((q, i) => { if (i) g.lineTo(q.x, q.y); else g.moveTo(q.x, q.y); }); g.stroke(); });
        }
      }
      function sunAt(g, x, y, u, a, t) {
        if (a <= 0.01) return;
        const gl = g.createRadialGradient(x, y, u * 0.2, x, y, u * 1.5);
        gl.addColorStop(0, 'rgba(255,224,120,' + (0.85 * a) + ')'); gl.addColorStop(1, 'rgba(255,200,90,0)');
        g.fillStyle = gl; g.fillRect(x - u * 1.5, y - u * 1.5, u * 3, u * 3);
        g.save(); g.translate(x, y); g.rotate(t * 0.12); g.fillStyle = 'rgba(255,214,90,' + (0.6 * a) + ')';
        g.beginPath();
        for (let i = 0; i < 12; i++) { const an0 = i * TAU / 12, s = Math.sin(an0), co = Math.cos(an0); g.moveTo(-co * u * 0.08 + s * u * 0.6, -s * u * 0.08 - co * u * 0.6); g.lineTo(co * u * 0.08 + s * u * 0.6, s * u * 0.08 - co * u * 0.6); g.lineTo(s * u * 0.98, -co * u * 0.98); g.closePath(); }
        g.fill(); g.restore();
        const dg = g.createRadialGradient(x - u * 0.14, y - u * 0.16, u * 0.04, x, y, u * 0.5);
        dg.addColorStop(0, '#fff8d2'); dg.addColorStop(0.6, '#ffd54a'); dg.addColorStop(1, '#ffab1f');
        g.globalAlpha = Math.min(1, a); g.fillStyle = dg; g.beginPath(); g.arc(x, y, u * 0.5, 0, TAU); g.fill(); g.globalAlpha = 1;
      }
      function fogAt(g, it, a, t, drift) {
        const u = Pl.r * it.sd;
        for (let b = 0; b < 4; b++) {
          const y = Pl.y + (b - 1.5) * Pl.r * 0.36 + Pl.r * 0.06, x = Pl.x + Math.sin(t * 0.22 + b * 1.3) * Pl.r * 0.28 + drift, wd = u * (1.2 + 0.14 * b), ht = Pl.r * 0.22;
          const fg = g.createLinearGradient(x - wd, 0, x + wd, 0);
          fg.addColorStop(0, 'rgba(228,234,242,0)'); fg.addColorStop(0.5, 'rgba(228,234,242,' + (0.62 * a) + ')'); fg.addColorStop(1, 'rgba(228,234,242,0)');
          g.fillStyle = fg; rr(g, x - wd, y - ht / 2, wd * 2, ht, ht / 2); g.fill();
        }
      }
      function windAt(g, it, a, t) {
        const n = inten === 2 ? 5 : 4, segs = 6;
        g.strokeStyle = 'rgb(230,246,255)';
        for (let i = 0; i < n; i++) {
          const rho = Pl.r * (1.16 + i * 0.1) * (0.86 + it.sd * 0.24), sp = (0.9 + i * 0.22) * (0.3 + a * 0.9), th = t * sp + i * 1.7, len = 0.55 + 0.35 * it.sd;
          for (let s = 0; s < segs; s++) {
            const k0 = s / segs, k1 = (s + 1) / segs;
            g.globalAlpha = (1 - k0) * 0.85 * a; g.lineWidth = (1 - k0) * 3.4 + 0.4;
            g.beginPath(); g.arc(Pl.x, Pl.y, rho, th - len * k1, th - len * k0); g.stroke();
          }
        }
        g.globalAlpha = 1;
      }
      function heatAt(g, it, a, t) {
        const u = Pl.r * it.sd, gy = Pl.y - Pl.r * 0.6;
        const hg = g.createRadialGradient(Pl.x, gy, Pl.r * 0.2, Pl.x, gy, Pl.r * 1.7 * it.sd);
        hg.addColorStop(0, 'rgba(255,150,70,' + (0.4 * a) + ')'); hg.addColorStop(1, 'rgba(255,120,60,0)');
        g.fillStyle = hg; g.fillRect(Pl.x - Pl.r * 2.2, gy - Pl.r * 2.2, Pl.r * 4.4, Pl.r * 4.4);
        g.lineWidth = 2.4; g.lineCap = 'round';
        for (let i = 0; i < 5; i++) {
          const x0 = Pl.x + (i - 2) * Pl.r * 0.3, yb = surfY(x0) - 5, ht = u * (0.75 + 0.2 * Math.sin(t * 0.8 + i));
          g.strokeStyle = 'rgba(255,' + (120 + i * 18) + ',70,' + (0.7 * a) + ')'; g.beginPath();
          for (let k = 0; k <= 14; k++) { const yy = yb - (k / 14) * ht, xx = x0 + Math.sin(k * 0.9 - t * 4 * (0.4 + 0.6 * a) + i) * u * 0.07; if (!k) g.moveTo(xx, yy); else g.lineTo(xx, yy); }
          g.stroke();
        }
      }

      /* ---------------- the little planet and today's world on it ---------------- */
      function propAt(g, ang, fn) { const r = Pl.r; g.save(); g.translate(Pl.x + Math.cos(ang) * r * 0.97, Pl.y + Math.sin(ang) * r * 0.97); g.rotate(ang + Math.PI / 2); fn(r * 0.2); g.restore(); }
      function house(g, u, glow) {
        g.fillStyle = '#f6e8d2'; g.fillRect(-u * 0.6, -u * 0.95, u * 1.2, u * 1.0);
        g.fillStyle = '#d4553f'; g.beginPath(); g.moveTo(-u * 0.78, -u * 0.9); g.lineTo(0, -u * 1.55); g.lineTo(u * 0.78, -u * 0.9); g.closePath(); g.fill();
        const wg = g.createRadialGradient(u * 0.2, -u * 0.55, 0, u * 0.2, -u * 0.55, u * 0.9);
        wg.addColorStop(0, 'rgba(255,214,110,' + (0.55 * glow) + ')'); wg.addColorStop(1, 'rgba(255,214,110,0)');
        g.fillStyle = wg; g.fillRect(-u, -u * 1.5, u * 2.4, u * 2);
        g.fillStyle = '#ffd36b'; g.fillRect(u * 0.08, -u * 0.72, u * 0.32, u * 0.3);
        g.fillStyle = '#8a5a3a'; g.fillRect(-u * 0.4, -u * 0.5, u * 0.28, u * 0.55);
      }
      function tree(g, u, s) {
        s = s || 1;
        g.fillStyle = '#7a5032'; g.fillRect(-u * 0.09 * s, -u * 0.75 * s, u * 0.18 * s, u * 0.8 * s);
        g.fillStyle = '#3caf63'; g.beginPath(); g.arc(0, -u * 1.05 * s, u * 0.48 * s, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.arc(-u * 0.15 * s, -u * 1.2 * s, u * 0.2 * s, 0, TAU); g.fill();
      }
      function lighthouse(g, u, glow) {
        g.fillStyle = '#f4efe6'; g.beginPath(); g.moveTo(-u * 0.34, 0); g.lineTo(u * 0.34, 0); g.lineTo(u * 0.21, -u * 1.55); g.lineTo(-u * 0.21, -u * 1.55); g.closePath(); g.fill();
        g.fillStyle = '#d4553f'; [0.22, 0.62].forEach(k => { const y0 = -u * 1.55 * k, ww = 0.34 - 0.13 * k; g.fillRect(-u * ww, y0 - u * 0.24, u * ww * 2, u * 0.24); });
        const lg = g.createRadialGradient(0, -u * 1.76, 0, 0, -u * 1.76, u * (0.7 + glow * 0.9));
        lg.addColorStop(0, 'rgba(255,232,150,' + (0.55 + glow * 0.4) + ')'); lg.addColorStop(1, 'rgba(255,220,140,0)');
        g.fillStyle = lg; g.fillRect(-u * 1.7, -u * 3.5, u * 3.4, u * 3.4);
        g.fillStyle = '#2b2f36'; g.fillRect(-u * 0.27, -u * 1.62, u * 0.54, u * 0.08);
        g.fillStyle = '#ffe9a8'; g.fillRect(-u * 0.16, -u * 1.9, u * 0.32, u * 0.28);
        g.fillStyle = '#2b2f36'; g.beginPath(); g.moveTo(-u * 0.25, -u * 1.9); g.lineTo(0, -u * 2.15); g.lineTo(u * 0.25, -u * 1.9); g.closePath(); g.fill();
      }
      function windmill(g, u, spin) {
        g.fillStyle = '#d29a62'; g.beginPath(); g.moveTo(-u * 0.32, 0); g.lineTo(u * 0.32, 0); g.lineTo(u * 0.19, -u * 1.3); g.lineTo(-u * 0.19, -u * 1.3); g.closePath(); g.fill();
        g.fillStyle = '#8a5a3a'; g.beginPath(); g.moveTo(-u * 0.27, -u * 1.27); g.lineTo(0, -u * 1.6); g.lineTo(u * 0.27, -u * 1.27); g.closePath(); g.fill();
        g.fillStyle = '#5a3a22'; g.fillRect(-u * 0.08, -u * 0.36, u * 0.16, u * 0.36);
        g.save(); g.translate(0, -u * 1.28); g.rotate(spin);
        for (let i = 0; i < 4; i++) { g.rotate(TAU / 4); g.fillStyle = '#f6efe2'; g.fillRect(-u * 0.08, -u * 1.02, u * 0.16, u * 0.9); g.fillStyle = 'rgba(160,120,90,0.55)'; g.fillRect(-u * 0.08, -u * 1.02, u * 0.16, u * 0.14); }
        g.fillStyle = '#3d2a1c'; g.beginPath(); g.arc(0, 0, u * 0.11, 0, TAU); g.fill(); g.restore();
      }
      function tent(g, u) {
        g.fillStyle = '#ff9a4a'; g.beginPath(); g.moveTo(-u * 0.78, 0); g.lineTo(0, -u * 1.15); g.lineTo(u * 0.78, 0); g.closePath(); g.fill();
        g.fillStyle = '#c4532a'; g.beginPath(); g.moveTo(-u * 0.24, 0); g.lineTo(0, -u * 0.64); g.lineTo(u * 0.24, 0); g.closePath(); g.fill();
        g.strokeStyle = '#7a3a1a'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(0, -u * 1.15); g.lineTo(0, -u * 1.38); g.stroke();
      }
      function campfire(g, u, t, glow) {
        const fl = 0.85 + 0.12 * Math.sin(t * 13) + 0.07 * Math.sin(t * 29);
        const gl = g.createRadialGradient(0, -u * 0.3, 0, 0, -u * 0.3, u * (1.1 + glow * 0.7));
        gl.addColorStop(0, 'rgba(255,170,80,' + (0.55 * fl) + ')'); gl.addColorStop(1, 'rgba(255,140,60,0)');
        g.fillStyle = gl; g.fillRect(-u * 1.9, -u * 2.1, u * 3.8, u * 3.8);
        g.fillStyle = '#6b3d22'; g.fillRect(-u * 0.34, -u * 0.12, u * 0.68, u * 0.13);
        g.fillStyle = '#ffb347'; g.beginPath(); g.ellipse(0, -u * 0.4 * fl, u * 0.2, u * 0.34 * fl, 0, 0, TAU); g.fill();
        g.fillStyle = '#fff1a8'; g.beginPath(); g.ellipse(0, -u * 0.3, u * 0.09, u * 0.17 * fl, 0, 0, TAU); g.fill();
      }
      function dome(g, u, glow) {
        g.fillStyle = '#e8ecf4'; g.fillRect(-u * 0.56, -u * 0.56, u * 1.12, u * 0.56);
        g.beginPath(); g.arc(0, -u * 0.56, u * 0.56, Math.PI, 0); g.fill();
        g.save(); g.translate(0, -u * 0.6); g.rotate(-0.55); g.fillStyle = '#3a4466'; g.fillRect(-u * 0.09, -u * 0.62, u * 0.18, u * 0.56); g.restore();
        g.fillStyle = 'rgba(255,214,110,' + (0.55 + 0.45 * glow) + ')'; g.fillRect(-u * 0.13, -u * 0.34, u * 0.26, u * 0.22);
      }
      function flower(g, u, col) {
        g.strokeStyle = '#2f8f52'; g.lineWidth = Math.max(1, u * 0.08); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -u * 0.55); g.stroke();
        g.fillStyle = col; for (let i = 0; i < 5; i++) { const a = i * TAU / 5; g.beginPath(); g.arc(Math.cos(a) * u * 0.15, -u * 0.62 + Math.sin(a) * u * 0.15, u * 0.11, 0, TAU); g.fill(); }
        g.fillStyle = '#ffe48a'; g.beginPath(); g.arc(0, -u * 0.62, u * 0.08, 0, TAU); g.fill();
      }
      function balloon(g, x, y, u) {
        g.strokeStyle = 'rgba(80,50,30,0.8)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x - u * 0.28, y + u * 0.3); g.lineTo(x - u * 0.12, y + u * 0.72); g.moveTo(x + u * 0.28, y + u * 0.3); g.lineTo(x + u * 0.12, y + u * 0.72); g.stroke();
        g.fillStyle = '#a0683a'; g.fillRect(x - u * 0.14, y + u * 0.7, u * 0.28, u * 0.2);
        const bg2 = g.createLinearGradient(x - u * 0.5, 0, x + u * 0.5, 0); bg2.addColorStop(0, '#ff6b6b'); bg2.addColorStop(0.5, '#ffd166'); bg2.addColorStop(1, '#4db5ff');
        g.fillStyle = bg2; g.beginPath(); g.arc(x, y - u * 0.1, u * 0.5, Math.PI * 0.92, Math.PI * 2.08); g.lineTo(x + u * 0.2, y + u * 0.38); g.lineTo(x - u * 0.2, y + u * 0.38); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); g.ellipse(x - u * 0.2, y - u * 0.3, u * 0.1, u * 0.2, -0.4, 0, TAU); g.fill();
      }
      /* the planet's ocean, continents, shading and rim are cached in a sprite (re-drawn only when its radius changes) */
      let pSpr = null, pSprR = 0, pSprD = 0;
      function planetBase(r) {
        const d = cv.dpr || 1;
        if (pSpr && Math.abs(pSprR - r) < 0.25 && pSprD === d) return pSpr;
        const half = r + 3, c = pSpr || document.createElement('canvas');
        c.width = Math.ceil(half * 2 * d); c.height = c.width;
        const g = c.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0);
        const x = half, y = half;
        const og = g.createRadialGradient(x - r * 0.35, y - r * 0.42, r * 0.08, x, y, r);
        og.addColorStop(0, '#8ad9ff'); og.addColorStop(0.55, '#2f88d8'); og.addColorStop(1, '#16408f');
        g.fillStyle = og; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
        g.save(); g.beginPath(); g.arc(x, y, r, 0, TAU); g.clip();
        const lands = [[-0.36, -0.12, 0.4, 0.27, 0.4], [0.38, 0.28, 0.33, 0.22, -0.3], [0.02, 0.66, 0.46, 0.17, 0.1], [0.56, -0.46, 0.2, 0.12, 0.6], [-0.62, 0.42, 0.18, 0.12, -0.5]];
        const ell = (cx, cy, rx, ry, rot) => { g.moveTo(cx + Math.cos(rot) * rx, cy + Math.sin(rot) * rx); g.ellipse(cx, cy, rx, ry, rot, 0, TAU); };
        g.fillStyle = '#5ccf84'; g.beginPath(); lands.forEach(b => ell(x + b[0] * r, y + b[1] * r, b[2] * r, b[3] * r, b[4])); g.fill();
        g.fillStyle = 'rgba(30,110,70,0.45)'; g.beginPath(); lands.forEach(b => ell(x + b[0] * r + b[2] * r * 0.25, y + b[1] * r + b[3] * r * 0.3, b[2] * r * 0.6, b[3] * r * 0.55, b[4])); g.fill();
        const sg = g.createRadialGradient(x - r * 0.45, y - r * 0.5, r * 0.2, x - r * 0.1, y - r * 0.1, r * 1.25);
        sg.addColorStop(0, 'rgba(255,255,255,0.16)'); sg.addColorStop(0.55, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(5,10,40,0.55)');
        g.fillStyle = sg; g.fillRect(x - r, y - r, 2 * r, 2 * r);
        g.restore();
        g.strokeStyle = 'rgba(210,244,255,0.6)'; g.lineWidth = 1.6; g.beginPath(); g.arc(x, y, r - 0.8, Math.PI * 1.05, Math.PI * 1.62); g.stroke();
        pSpr = c; pSprR = r; pSprD = d;
        return c;
      }
      function drawPlanet(g, t, pulse) {
        const x = Pl.x, y = Pl.y, r = Pl.r;
        const ag = g.createRadialGradient(x, y, r * 0.9, x, y, r * 1.4);
        ag.addColorStop(0, 'rgba(150,225,255,' + (0.4 + W.warm * 0.2 + pulse * 0.12) + ')'); ag.addColorStop(1, 'rgba(150,225,255,0)');
        g.fillStyle = ag; g.beginPath(); g.arc(x, y, r * 1.4, 0, TAU); g.fill();
        const half = r + 3;
        g.drawImage(planetBase(r), x - half, y - half, half * 2, half * 2);
        // the weather tints the little world itself
        let wet = 0, hot = 0, grey = 0, snowcap = 0;
        items.forEach(it => { const a = alphaOf(it); if (it.type === 'rain' || it.type === 'storm') wet += 0.22 * a * it.sd; if (it.type === 'heat') hot += 0.3 * a * it.sd; if (it.type === 'fog' || it.type === 'cloud') grey += 0.16 * a; if (it.type === 'snow') snowcap = Math.max(snowcap, a * it.sd); });
        const tint = overlay([[10, 26, 66, Math.min(0.6, Math.min(0.45, wet) + W.night * 0.32)], [255, 110, 50, Math.min(0.4, hot)], [160, 170, 185, Math.min(0.35, grey)]]);
        if (tint) { g.fillStyle = tint; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
        if (snowcap > 0.02) { g.save(); g.beginPath(); g.arc(x, y, r, 0, TAU); g.clip(); g.fillStyle = 'rgba(250,253,255,' + Math.min(0.95, snowcap) + ')'; g.beginPath(); g.ellipse(x, y - r * 0.98, r * 0.8 * Math.min(1.2, snowcap + 0.2), r * 0.36 * Math.min(1.2, snowcap + 0.2), 0, 0, TAU); g.fill(); g.restore(); }
        // today's world on top of the planet: it changes every day
        const glow = 0.5 + 0.5 * Math.max(W.warm, W.night, ss(0.6, 1, W.f));
        if (grow >= 3) { propAt(g, -2.22, u => flower(g, u, '#ff8fb1')); propAt(g, -0.9, u => flower(g, u, '#ffd166')); }
        const wid = WORLD.id;
        if (wid === 'home') { propAt(g, -1.82, u => house(g, u, glow)); propAt(g, -1.2, u => tree(g, u)); }
        else if (wid === 'lighthouse') { propAt(g, -1.62, u => lighthouse(g, u, glow)); propAt(g, -1.12, u => tree(g, u, 0.85)); }
        else if (wid === 'windmill') { propAt(g, -1.72, u => windmill(g, u, W.spin)); propAt(g, -1.12, u => tree(g, u)); }
        else if (wid === 'camp') { propAt(g, -1.9, u => tent(g, u)); propAt(g, -1.47, u => campfire(g, u, t, glow)); propAt(g, -1.08, u => tree(g, u)); }
        else { propAt(g, -1.68, u => dome(g, u, glow)); propAt(g, -1.14, u => tree(g, u)); }
        if (grow >= 6) { const ba = -Math.PI / 2 + Math.sin(t * 0.21) * 1.05, br = r * 1.42; balloon(g, x + Math.cos(ba) * br, y + Math.sin(ba) * br + Math.sin(t * 1.1) * 3, r * 0.3); }
        if (grow >= 10) { const ma = t * 0.32, mr = r * 1.72; g.fillStyle = '#e9edf7'; g.beginPath(); g.arc(x + Math.cos(ma) * mr, y + Math.sin(ma) * mr * 0.42, r * 0.1, 0, TAU); g.fill(); }
      }
      function rainbowAt(g) {
        if (W.rainbow <= 0) return;
        const cols = ['#ff5f6d', '#ff9f43', '#ffd93d', '#6bd56b', '#4db5ff', '#6f78ff', '#b07bff'];
        const R0 = Pl.r * 1.86, bw = Math.max(4, Pl.r * 0.08), cy = Pl.y + Pl.r * 0.4, k = K.ease.inOutCubic(W.rainbow);
        g.save(); g.lineCap = 'butt';
        g.globalAlpha = 0.22; g.strokeStyle = '#ffffff'; g.lineWidth = bw * 9; g.beginPath(); g.arc(Pl.x, cy, R0 - bw * 3, Math.PI, Math.PI + Math.PI * k); g.stroke();
        g.globalAlpha = 0.92; cols.forEach((c, i) => { g.strokeStyle = c; g.lineWidth = bw + 0.6; g.beginPath(); g.arc(Pl.x, cy, R0 - i * bw, Math.PI, Math.PI + Math.PI * k); g.stroke(); });
        g.restore();
      }
      function drawItems(g, t, behind) {
        items.forEach(it => {
          const a = alphaOf(it); if (a <= 0.01) return;
          const c = itemC(it), drift = it.type !== 'sun' && L ? W.f * L.map.w * 0.55 : 0, str = a * (0.55 + 0.45 * it.sd);
          if (behind) { if (it.type === 'sun') sunAt(g, c.x, c.y, c.u, a, t); return; }
          if (it.type === 'fog') fogAt(g, it, a, t, drift);
          else if (it.type === 'heat') heatAt(g, it, a, t);
          else if (it.type === 'wind') windAt(g, it, a, t);
          else if (it.type === 'cloud') cloudAt(g, c.x, c.y, c.u, a * 0.97, false);
          else if (it.type === 'rain') { drops(g, it, c, str, t, false); cloudAt(g, c.x, c.y, c.u, a, false); }
          else if (it.type === 'snow') { flakes(g, it, c, str, t); cloudAt(g, c.x, c.y, c.u * 0.92, a * 0.9, false); }
          else if (it.type === 'storm') { drops(g, it, c, str, t, true); bolt(g, it, c, a); cloudAt(g, c.x, c.y, c.u, a, true); }
        });
      }
      /* flat overlays (the weather's tint, then dusk and night) merged into one exact "over" fill: one pass instead of three */
      function overlay(layers) {
        let r = 0, gg = 0, b = 0, a = 0;
        layers.forEach(([cr, cg, cb, la]) => { if (la <= 0.003) return; const na = la + a * (1 - la); r = (cr * la + r * a * (1 - la)) / na; gg = (cg * la + gg * a * (1 - la)) / na; b = (cb * la + b * a * (1 - la)) / na; a = na; });
        return a > 0.004 ? 'rgba(' + Math.round(r) + ',' + Math.round(gg) + ',' + Math.round(b) + ',' + a.toFixed(3) + ')' : '';
      }
      function mapTint(g) {
        const m = L.map;
        let r = 0, gg = 0, b = 0, tot = 0;
        const add = (cr, cg, cb, a) => { if (a <= 0) return; r += cr * a; gg += cg * a; b += cb * a; tot += a; };
        items.forEach(it => { const a = alphaOf(it) * it.sd; if (it.type === 'storm') add(6, 16, 32, 0.3 * a); if (it.type === 'rain') add(6, 16, 32, 0.15 * a); if (it.type === 'cloud' || it.type === 'fog') add(120, 135, 150, 0.13 * a); if (it.type === 'heat') add(255, 120, 50, 0.16 * a); if (it.type === 'snow' || it.type === 'wind') add(170, 210, 255, 0.1 * a); });
        const f = W.f, dusk = bump(f, 0.22, 0.45, 0.64), night = bump(f, 0.5, 0.7, 0.88);
        W.dusk = dusk; W.night = night;
        const fill = overlay([tot > 0.005 ? [r / tot, gg / tot, b / tot, Math.min(0.45, tot)] : [0, 0, 0, 0], [255, 118, 60, 0.22 * dusk], [8, 14, 48, 0.55 * night]]);
        if (fill) { g.fillStyle = fill; g.fillRect(m.x, m.y, m.w, m.h); }
        const sunny = Math.max(ss(0.5, 1, W.f), W.warm);
        if (sunny > 0) {
          const sg = g.createRadialGradient(Pl.x, Pl.y - Pl.r, 10, Pl.x, Pl.y, Math.max(m.w, m.h) * 0.8);
          sg.addColorStop(0, 'rgba(255,238,170,' + (0.42 * sunny) + ')'); sg.addColorStop(1, 'rgba(140,230,180,' + (0.1 * sunny) + ')');
          g.fillStyle = sg; g.fillRect(m.x, m.y, m.w, m.h);
        }
      }
      /* the forecast as a time-lapse: dusk, a starry night, then dawn */
      const STARS = Array.from({ length: 46 }, (_, i) => ({ x: hs(i * 3.7 + 1), y: hs(i * 9.1 + 2) * 0.8, s: 0.8 + hs(i * 5.3) * 1.4, p: hs(i * 1.9) * 6 }));
      function drawSky(g, t) {
        const f = W.f, m = L.map;
        const night = W.night, dawn = bump(f, 0.78, 0.94, 1.18); // dusk and night tints are folded into mapTint's single fill
        if (night > 0.01) {
          g.fillStyle = '#ffffff';
          STARS.forEach(s => { g.globalAlpha = night * (0.5 + 0.45 * Math.sin(t * 2.2 + s.p)); g.fillRect(m.x + s.x * m.w, m.y + s.y * m.h, s.s, s.s); });
          const mx = Pl.x + Pl.r * 1.72, my = Pl.y - Pl.r * 1.18, mr = Pl.r * 0.24;
          const mg = g.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 3); mg.addColorStop(0, 'rgba(230,236,255,' + (0.4 * night) + ')'); mg.addColorStop(1, 'rgba(230,236,255,0)');
          g.globalAlpha = 1; g.fillStyle = mg; g.fillRect(mx - mr * 3, my - mr * 3, mr * 6, mr * 6);
          g.globalAlpha = night; g.fillStyle = '#f2f4ff'; g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.fill();
          g.fillStyle = 'rgba(180,186,210,0.6)'; g.beginPath(); g.arc(mx - mr * 0.3, my - mr * 0.2, mr * 0.22, 0, TAU); g.arc(mx + mr * 0.25, my + mr * 0.3, mr * 0.15, 0, TAU); g.fill();
          g.globalAlpha = 1;
        }
        if (dawn > 0.01) { const gr = g.createLinearGradient(0, m.y + m.h, 0, m.y); gr.addColorStop(0, 'rgba(255,168,110,' + (0.32 * dawn) + ')'); gr.addColorStop(1, 'rgba(255,214,160,0)'); g.fillStyle = gr; g.fillRect(m.x, m.y, m.w, m.h); }
      }
      function forecastSun(g, t) {
        if (isPlaced('sun')) return;
        const k = ss(0.8, 1, W.f); if (k <= 0) return;
        const e = K.ease.outCubic(k), r = Pl.r;
        sunAt(g, Pl.x + (-0.55 + (-1.72 + 0.55) * e) * r, Pl.y + (0.25 + (-1.5 - 0.25) * e) * r, r * 0.86, k, t);
      }
      /* the studio radar: one sweep per bar of music, weather cells echo as it passes */
      function drawRadar(g, b) {
        if (stage < 1 || stage >= 5) return;
        const dark = K.dark(), a0 = dark ? 0.16 : 0.14, R = Pl.r * 3.05;
        g.strokeStyle = 'rgba(210,255,230,' + (a0 * 0.95) + ')'; g.lineWidth = 1; g.setLineDash([3, 7]);
        g.beginPath(); [1.55, 2.2, 2.9].forEach(k => circ(g, Pl.x, Pl.y, Pl.r * k)); g.stroke(); g.setLineDash([]);
        if (K.reduced()) return;
        const ang = (b.pos / 4) * TAU - Math.PI / 2, wedge = 0.85;
        if (g.createConicGradient) {
          const cg = g.createConicGradient(ang - wedge, Pl.x, Pl.y), k = wedge / TAU;
          cg.addColorStop(0, 'rgba(190,255,215,0)'); cg.addColorStop(k, 'rgba(190,255,215,' + a0 + ')'); cg.addColorStop(Math.min(1, k + 0.001), 'rgba(190,255,215,0)'); cg.addColorStop(1, 'rgba(190,255,215,0)');
          g.fillStyle = cg; g.beginPath(); g.moveTo(Pl.x, Pl.y); g.arc(Pl.x, Pl.y, R, ang - wedge, ang + 0.01); g.closePath(); g.fill();
        } else {
          for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(190,255,215,' + (a0 * (i + 1) / 6) + ')'; g.beginPath(); g.moveTo(Pl.x, Pl.y); g.arc(Pl.x, Pl.y, R, ang - wedge * (1 - i / 6), ang - wedge * (1 - (i + 1) / 6)); g.closePath(); g.fill(); }
        }
        g.strokeStyle = 'rgba(220,255,235,' + (a0 * 2.2) + ')'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(Pl.x, Pl.y); g.lineTo(Pl.x + Math.cos(ang) * R, Pl.y + Math.sin(ang) * R); g.stroke();
        items.forEach(it => {
          const c = itemC(it), ia = Math.atan2(c.y - Pl.y, c.x - Pl.x), d = (((ang - ia) % TAU) + TAU) % TAU;
          if (d < 0.14 && (it.echoAt || 0) < W.t - 0.5) { it.echo = 1; it.echoAt = W.t; }
        });
      }
      function blips(g) {
        items.forEach(it => {
          if (!it.echo || it.echo <= 0.02) return;
          const c = itemC(it), a = alphaOf(it) * it.echo;
          g.strokeStyle = 'rgba(210,255,225,' + (0.45 * a) + ')'; g.lineWidth = 2;
          g.beginPath(); g.arc(c.x, c.y, c.u * (0.55 + (1 - it.echo) * 0.6), 0, TAU); g.stroke();
        });
      }

      /* ---------------- sound ---------------- */
      let snd = null, sndT = 0;
      function ensureAudio() {
        if (snd || !A.ctx) return;
        snd = { rain: A.loop({ filter: 'bandpass', freq: 2300, q: 0.55, bus: 'amb' }), wind: A.loop({ pink: true, filter: 'bandpass', freq: 520, q: 1.1, bus: 'amb' }), room: A.loop({ pink: true, filter: 'lowpass', freq: 200, q: 0.4, bus: 'amb' }) };
        S.onDestroy(() => { Object.keys(snd).forEach(k => snd[k] && snd[k].stop()); });
      }
      S.on('audio-ready', ensureAudio);
      function soundLevels(t, dt) {
        if (A.ctx && stage >= 4 && stage < 5 && !K.reduced()) { // the time-lapse: crickets at night, birds at dawn
          if (W.night > 0.45 && Math.random() < dt * 2.2) { const b0 = 4200 + Math.random() * 500, t0 = A.now() + 0.02; for (let i = 0; i < 3; i++) A.tone({ when: t0 + i * 0.05, type: 'sine', freq: b0, dur: 0.035, vol: 0.012, pan: 0.4 }); }
          if (W.f > 0.88 && Math.random() < dt * 1.4) { const b0 = 2400 + Math.random() * 1500, t0 = A.now() + 0.02; for (let i = 0; i < 3; i++) A.tone({ when: t0 + i * 0.08, type: 'sine', freq: b0 * (1 + Math.random() * 0.2), to: b0 * 0.85, glide: 0.06, dur: 0.08, vol: 0.016, pan: -0.4 }); }
        }
        if (!snd || t - sndT < 0.12) return; sndT = t;
        let rain = 0, wind = 0;
        items.forEach(it => { const a = alphaOf(it); if (it.type === 'rain') rain += a * it.sd; if (it.type === 'storm') { rain += 1.3 * a * it.sd; wind += 0.3 * a; } if (it.type === 'snow') wind += 0.15 * a; if (it.type === 'wind') wind += a * it.sd; });
        if (snd.rain) snd.rain.level(Math.min(0.2, 0.002 + rain * 0.08), 0.5);
        if (snd.wind) { snd.wind.level(Math.min(0.17, wind * 0.11), 0.5); snd.wind.freq(380 + 240 * (0.5 + 0.5 * Math.sin(t * 0.6)), 0.4); }
        if (snd.room) snd.room.level(stage >= 5 ? 0.02 : 0.05, 1);
      }
      function placeSound(type) {
        if (!A.ctx) return;
        const n = A.now();
        if (type === 'sun') { A.chime(A.note('E5'), { vol: 0.08 }); A.chime(A.note('B5'), { when: n + 0.09, vol: 0.06 }); }
        else if (type === 'cloud') A.noise({ filter: 'lowpass', freq: 700, dur: 0.55, attack: 0.15, vol: 0.12 });
        else if (type === 'rain') { for (let i = 0; i < 9; i++) A.tone({ when: n + i * 0.045 + Math.random() * 0.03, type: 'sine', freq: 1500 + Math.random() * 1800, to: 900, glide: 0.03, dur: 0.05, vol: 0.03 }); }
        else if (type === 'storm') A.noise({ pink: true, filter: 'lowpass', freq: 170, dur: 1.5, attack: 0.08, vol: 0.24 });
        else if (type === 'fog') A.tone({ type: 'triangle', freq: 220, to: 196, dur: 1.3, attack: 0.3, vol: 0.06, lp: 600, verb: 0.5 });
        else if (type === 'wind') A.whoosh({ vol: 0.16, dur: 0.75, from: 300, to: 1400 });
        else if (type === 'heat') A.tone({ type: 'sine', freq: 300, to: 720, glide: 0.6, dur: 0.75, vol: 0.05, verb: 0.3 });
        else if (type === 'snow') { for (let i = 0; i < 4; i++) A.chime(A.note(['E6', 'B5', 'G6', 'D6'][i]), { when: n + i * 0.07, vol: 0.025, dur: 0.9 }); }
      }
      function sting() {
        if (!A.ctx) return;
        const n = A.now();
        ['C5', 'E5', 'G5', 'C6'].forEach((nt, i) => A.pluck(A.note(nt), { when: n + i * 0.09, vol: 0.2, damp: 0.995, verb: 0.3 }));
        A.chime(A.note('G6'), { when: n + 0.44, vol: 0.05, dur: 1.6 });
      }
      function clickTo(target) {
        clicker.classList.remove('press'); void clicker.offsetWidth; clicker.classList.add('press');
        S.later(() => clicker.classList.remove('press'), 160);
        if (A.ctx) { A.click({ vol: 0.12 }); A.tone({ type: 'sine', freq: 1500, to: 1100, glide: 0.06, dur: 0.08, vol: 0.025 }); }
        if (target) W.laser = { x: target.x, y: target.y, t0: W.t };
      }
      let lastQ = 0;
      function scrubTick(hr) { // every hour mark ticks now; every other one plays a chord tone on the music's 8th-note grid
        if (!A.ctx) return;
        A.wood(undefined, 0.045, 1.2 + (hr % 2) * 0.14);
        if (hr % 2) return;
        const sp = 60 / (music.bpm || 78) / 2;
        let t = gridTime(2); if (t <= lastQ + 0.01) t = lastQ + sp;
        if (t - A.now() > 0.5) return;
        lastQ = t;
        const ch = chordAt(t), k = (hr / 2) % (ch.length * 2);
        A.pluck(A.note(ch[k % ch.length]) * (k >= ch.length ? 2 : 1), { when: t, vol: 0.15, damp: 0.995, verb: 0.35 });
      }

      /* ---------------- on-air graphics ---------------- */
      function wordSpan(wd) { return h('span', { class: 'gk-user wr-word', text: cap(wd) }); }
      function setLT(main, sub, tag) {
        ltMain.textContent = ''; (Array.isArray(main) ? main : [main]).forEach(x => ltMain.append(typeof x === 'string' ? document.createTextNode(x) : x));
        ltSub.textContent = sub || '';
        if (tag) ltTagText.textContent = tag;
      }
      let tkList = [], tkI = 0, tkTimer = 0;
      function tickerSet(list) { tkList = list; tkI = 0; showTk(); }
      function showTk() {
        S.cancel(tkTimer);
        if (!tkList.length) return;
        const m = tkList[tkI % tkList.length]; tkI++;
        tkMsg.classList.add('out');
        tkTimer = S.later(() => {
          tkMsg.textContent = '';
          if (typeof m === 'string') tkMsg.textContent = m; else { tkMsg.append(m.pre); tkMsg.append(h('span', { class: 'gk-user', text: m.user })); }
          tkMsg.classList.remove('out');
          tkTimer = S.later(showTk, 4300);
        }, 320);
      }
      const TICK_A = ['Today’s planet: ' + WORLD.name, 'Weather fact: ' + FACT, 'Naming a feeling turns its volume down', EDITION + ' · all feelings welcome']
        .concat(grow ? ['Your emotion almanac holds ' + grow + (grow === 1 ? ' word' : ' words')] : []).concat(advanced ? ['New words in the studio today'] : []);
      function breaking(wd) {
        tkTag.textContent = 'Breaking';
        ticker.classList.remove('brk'); void ticker.offsetWidth; if (!K.reduced()) ticker.classList.add('brk');
        tickerSet([{ pre: 'Feeling named: ', user: cap(wd) }, 'Intensity easing across the planet', 'Precise words, smaller storms']);
        S.later(() => { tkTag.textContent = 'Latest'; ticker.classList.remove('brk'); }, 6200);
      }

      /* ---------------- the desk: one tray of controls per segment ---------------- */
      const RUN = ['Map it', 'Size it', 'Name it', 'Forecast'];
      function rundown(n) { const r = h('div', { class: 'wr-run', role: 'img', 'aria-label': 'Step ' + n + ' of 4' }); RUN.forEach((t, i) => r.append(h('span', { class: i + 1 === n ? 'on' : i + 1 < n ? 'done' : '', text: t }))); return r; }
      function setBody(n, ...nodes) {
        body.textContent = '';
        if (n) body.append(rundown(n));
        nodes.forEach(x => { if (x) body.append(x); });
        body.classList.remove('wr-swap'); void body.offsetWidth; if (!K.reduced()) body.classList.add('wr-swap');
      }

      /* ---------------- step 1: map the weather ---------------- */
      function moveGhost(x, y) { ghost.style.left = x + 'px'; ghost.style.top = y + 'px'; }
      const overPlanet = (x, y) => Math.hypot(x - Pl.x, y - Pl.y) < Pl.r * 2.1;
      function flyTo(type, x, y) {
        if (W.flying) return;
        W.flying = true;
        ghost.innerHTML = ICONS[type]; ghost.hidden = false; ghost.classList.remove('hot', 'fly');
        moveGhost(x, y); void ghost.offsetWidth;
        ghost.classList.add('fly'); moveGhost(Pl.x, Pl.y - Pl.r * 0.9);
        K.sfx.whoosh();
        S.later(() => { ghost.hidden = true; ghost.classList.remove('fly'); W.flying = false; place(type); }, K.reduced() ? 60 : 430);
      }
      function returnGhost(b) { const r = K.rectIn(b); ghost.classList.add('fly'); moveGhost(r.cx, r.cy); K.sfx.soft(); S.later(() => { ghost.hidden = true; ghost.classList.remove('fly'); }, 400); }
      ORDER.forEach(type => {
        const b = tiles[type];
        let lastPtr = 0;
        K.drag(b, {
          space: el,
          start: (p) => {
            if (stage !== 1 || W.flying) return false;
            if (isPlaced(type)) { lastPtr = performance.now(); removeItem(type); return false; }
            if (items.length >= 3) { lastPtr = performance.now(); K.sfx.no(); say(LN.full, { ms: 2400 }); return false; }
            W.drag = { type, hot: false };
            ghost.innerHTML = ICONS[type]; ghost.hidden = false; ghost.classList.remove('fly', 'hot');
            moveGhost(p.x, p.y); b.classList.add('lift'); K.sfx.tap();
            if (A.ctx) A.tone({ type: 'sine', freq: 520, to: 700, glide: 0.08, dur: 0.1, vol: 0.04 });
          },
          move: (p) => {
            if (!W.drag) return;
            moveGhost(p.x, p.y);
            const hot = overPlanet(p.x, p.y);
            if (hot !== W.drag.hot) { W.drag.hot = hot; ghost.classList.toggle('hot', hot); if (hot && A.ctx) A.tone({ type: 'sine', freq: 880, to: 1320, glide: 0.06, dur: 0.08, vol: 0.04 }); }
          },
          end: (p, d) => {
            lastPtr = performance.now(); b.classList.remove('lift');
            if (!W.drag) return;
            W.drag = null;
            if (Math.hypot(d.dx, d.dy) < 10) { ghost.hidden = true; flyTo(type, p.x, p.y); return; }
            if (overPlanet(p.x, p.y)) { ghost.hidden = true; place(type); } else returnGhost(b);
          }
        });
        b.addEventListener('click', () => { if (performance.now() - lastPtr < 600 || stage !== 1) return; if (isPlaced(type)) removeItem(type); else if (items.length < 3) { const r = K.rectIn(b); flyTo(type, r.cx, r.cy); } });
      });
      let doneBtn = null, placedRow = null, edCard = null;
      function editionCard() {
        return h('div', { class: 'wr-ed' }, h('b', { text: EDITION }), h('span', { text: 'Today’s planet: ' + WORLD.name }),
          h('small', { text: grow ? 'Your emotion almanac: ' + grow + (grow === 1 ? ' word' : ' words') + (grow >= 3 ? ' · your planet is growing' : '') : 'Map it · size it · name it · forecast it' }));
      }
      function place(type) {
        if (stage !== 1 || isPlaced(type) || items.length >= 3) return;
        const it = { type, s: s0, sd: s0, k: 1, kt: 1, pop: 0, slot: -1, seed: 1 + ORDER.indexOf(type) * 13 + items.length * 7, bolt: null, calm: 0, calmT: 0, echo: 0 };
        items.push(it); assignSlots();
        tiles[type].setAttribute('aria-pressed', 'true');
        placeSound(type); K.sfx.pop(undefined, 470 + items.length * 90);
        const c = itemC(Object.assign({}, it, { pop: 1 }));
        P.emit('spark', c.x, c.y, 16, { colors: ['#ffffff', '#cfe9ff', '#ffe08a'], speed: [60, 190] });
        if (!K.reduced()) W.nudge = type === 'storm' ? 1 : 0.45;
        keeper.face(FACE[type], 1700);
        say(items.length === 3 ? LN.full : PLACE[type], { ms: 2800 });
        ctx.track('place', { type, n: items.length });
        refreshStep1();
      }
      function removeItem(type) {
        const i = items.findIndex(x => x.type === type); if (i < 0) return;
        items.splice(i, 1); assignSlots();
        tiles[type].setAttribute('aria-pressed', 'false');
        K.sfx.soft();
        refreshStep1();
      }
      function refreshStep1() {
        ORDER.forEach(tp => tiles[tp].classList.toggle('dim', items.length >= 3 && !isPlaced(tp)));
        placedRow.textContent = '';
        items.forEach(it => {
          const b = h('button', { type: 'button', class: 'wr-pchip', 'aria-label': 'Remove ' + WX[it.type].label }, h('span', { class: 'wr-ti', html: ICONS[it.type] }), WX[it.type].label, h('b', { text: '✕' }));
          b.addEventListener('click', () => { if (stage === 1) removeItem(it.type); });
          placedRow.append(b);
        });
        doneBtn.hidden = !items.length; placedRow.hidden = !items.length;
        if (edCard) edCard.hidden = !!items.length;
        setLT(items.length ? items.map(i => WX[i.type].label).join(' + ') + ' over your planet' : 'What’s the weather like in there?', items.length ? (items.length < 3 ? 'Add up to ' + (3 - items.length) + ' more, or tap when it fits' : 'Full map. Tap when it fits') : 'Live with Sync · your inner planet');
        if (items.length) K.guide({ id: 'place-done', g: 'tap', target: doneBtn, label: 'TAP WHEN IT FITS', delay: 2600 });
        else K.guide({ id: 'place', g: 'drag', dir: 'r', target: tiles[suggest()], d: guideD(tiles[suggest()]), label: 'DRAG ONTO YOUR PLANET', delay: 900 });
      }
      function suggest() { const f = String(an.feeling || '').toLowerCase().trim(); return FEEL[f] && !isPlaced(FEEL[f]) ? FEEL[f] : (isPlaced('storm') ? 'rain' : 'storm'); }
      function guideD(tile) { const r = K.rectIn(tile); return Math.max(60, Math.round(Pl.x - r.cx - 6)); }
      function startStep1() {
        stage = 1;
        pal.classList.add('on');
        placedRow = h('div', { class: 'wr-placed', 'aria-label': 'On your map' });
        doneBtn = K.button('That’s my weather', () => { if (stage === 1 && items.length) { K.sfx.ok(); startStep2(); } }, { cls: 'wr-go' });
        doneBtn.hidden = true; placedRow.hidden = true;
        edCard = editionCard();
        setBody(1, h('p', { class: 'wr-hint', text: 'Drag the weather inside you onto your planet. One to three.' }), placedRow, doneBtn, edCard);
        keeper.face('E35', 1600);
        say(LN.step1, { ms: 4200 });
        clickTo({ x: Pl.x, y: Pl.y });
        const tgt = tiles[suggest()];
        K.guide({ id: 'place', g: 'drag', dir: 'r', target: tgt, d: guideD(tgt), label: 'DRAG ONTO YOUR PLANET', delay: 1000 });
      }

      /* ---------------- step 2: size it ---------------- */
      const handles = [], gauges = [];
      let sizeBtn = null;
      const SIZE_AT = [0.65, 0.95, 1.25, 1.58];
      const sizeIdx = (s) => (s < 0.8 ? 0 : s < 1.1 ? 1 : s < 1.4 ? 2 : 3);
      const sizeWord = (it) => WX[it.type].sizes[sizeIdx(it.s)];
      const sizeLine = () => items.map(it => WX[it.type].label + ': ' + sizeWord(it)).join(' · ');
      function paintGauge(gg) { const k = sizeIdx(gg.it.s); gg.segs.forEach((b, i) => { b.classList.toggle('on', i <= k); b.setAttribute('aria-pressed', String(i === k)); }); gg.wordEl.textContent = sizeWord(gg.it); }
      function setSize(it, ns) {
        ns = clamp(ns, 0.5, 1.75);
        const before = sizeIdx(it.s), q0 = Math.round(it.s * 14);
        it.s = ns;
        const hd = handles.find(x => x.it === it), gg = gauges.find(x => x.it === it);
        if (sizeIdx(ns) !== before) {
          if (A.ctx) A.pluck(A.note(['C4', 'E4', 'G4', 'C5'][sizeIdx(ns)]), { vol: 0.2, damp: 0.995 }); K.sfx.tap();
          if (hd) { hd.tag.textContent = sizeWord(it); hd.el.setAttribute('aria-valuenow', String(sizeIdx(ns) + 1)); hd.el.setAttribute('aria-valuetext', sizeWord(it)); }
          if (gg) paintGauge(gg);
          setLT(sizeLine(), 'Size it: how strong is it right now?');
        } else if (Math.round(ns * 14) !== q0 && A.ctx) A.wood(undefined, 0.05, 0.7 + ns * 0.4);
      }
      function sized() {
        if (stage !== 2) return;
        if (!sizedOnce) { sizedOnce = true; ctx.track('sized', { n: items.length }); }
        showSizeBtn();
      }
      function showSizeBtn() {
        if (!sizeBtn || !sizeBtn.hidden) return;
        sizeBtn.hidden = false;
        K.guide({ id: 'size-done', g: 'tap', target: sizeBtn, label: 'TAP WHEN IT’S RIGHT', delay: 1800 });
      }
      function startStep2() {
        stage = 2; K.guide(null);
        pal.classList.remove('on'); pal.classList.add('gone');
        layout();
        sizeBtn = K.button('That’s the size', () => { if (stage === 2) { K.sfx.ok(); startStep3(); } }, { cls: 'wr-go' });
        sizeBtn.hidden = true;
        const gWrap = h('div', { class: 'wr-gauges' });
        items.forEach(it => {
          const segs = [0, 1, 2, 3].map(k => { const b = h('button', { type: 'button', class: 'wr-seg', 'aria-pressed': 'false', 'aria-label': WX[it.type].label + ': ' + WX[it.type].sizes[k] }, h('i')); K.tap(b, () => { if (stage !== 2) return; setSize(it, SIZE_AT[k]); sized(); }); return b; });
          const wordEl = h('span', { class: 'wr-gw', text: sizeWord(it) });
          const gg = { it, segs, wordEl, row: h('div', { class: 'wr-gauge', title: WX[it.type].label }, h('span', { class: 'wr-ti', html: ICONS[it.type] }), h('div', { class: 'wr-segs', role: 'group', 'aria-label': WX[it.type].label + ' size' }, segs), wordEl) };
          gauges.push(gg); gWrap.append(gg.row); paintGauge(gg);
        });
        setBody(2, items.length > 1 ? null : h('p', { class: 'wr-hint', text: 'Drag the gold handle out for bigger, in for smaller.' }), gWrap, sizeBtn);
        keeper.face('think', 1800);
        say(LN.step2, { ms: 3800 });
        clickTo({ x: Pl.tx, y: Pl.ty - Pl.tr });
        setLT(sizeLine(), 'Size it: how strong is it right now?');
        items.forEach(it => {
          const b = h('button', { type: 'button', class: 'wr-handle', role: 'slider', 'aria-label': WX[it.type].label + ' size. Drag, or use the arrow keys.', 'aria-valuemin': '1', 'aria-valuemax': '4', 'aria-valuenow': String(sizeIdx(it.s) + 1), 'aria-valuetext': sizeWord(it), html: RESIZE });
          const tag = h('span', { class: 'wr-tag', text: sizeWord(it) });
          el.append(tag, b);
          let d0 = 1, sStart = 1;
          K.drag(b, {
            space: el,
            start: (p) => { if (stage !== 2) return false; const o = originOf(it); d0 = Math.max(24, Math.hypot(p.x - o.x, p.y - o.y)); sStart = it.s; b.classList.add('on'); K.sfx.tap(); if (A.ctx) A.tone({ type: 'sine', freq: 440, to: 660, glide: 0.1, dur: 0.12, vol: 0.04 }); },
            move: (p) => { const o = originOf(it); setSize(it, sStart * Math.hypot(p.x - o.x, p.y - o.y) / d0); },
            end: () => { b.classList.remove('on'); sized(); }
          });
          b.addEventListener('focus', () => { W.focusIt = it; });
          handles.push({ it, el: b, tag });
        });
        const hd = handles[0], hp = handleAt(hd.it), o = originOf(hd.it);
        K.guide({ id: 'size', g: 'drag', dir: hp.x < o.x ? 'l' : 'r', d: 56, target: hd.el, label: 'DRAG TO SIZE IT', delay: 1100 });
        S.later(() => { if (stage === 2) showSizeBtn(); }, 7000);
      }

      /* ---------------- step 3: name it exactly ---------------- */
      let groups = [], chipHost = null, chipsWrap = null, fcBtn = null, tabsEl = null;
      function wordsFor(tp, seed) {
        let ws = WX[tp].words.slice();
        if (advanced) ws = ws.slice(0, 3).concat(WX[tp].adv);
        if (seed) ws = [seed].concat(ws.filter(x => x !== seed));
        return ws.slice(0, 5);
      }
      function startStep3() {
        stage = 3; K.guide(null);
        handles.forEach(hd => { hd.el.remove(); hd.tag.remove(); }); handles.length = 0;
        const f = String(an.feeling || '').toLowerCase().trim();
        const types = items.map(i => i.type);
        const seedType = FEEL[f] && types.includes(FEEL[f]) ? FEEL[f] : '';
        groups = types.map(tp => ({ type: tp, words: wordsFor(tp, tp === seedType ? f : ''), seed: tp === seedType ? f : '' }));
        const first = seedType || items.slice().sort((a, b) => b.s - a.s)[0].type;
        tabsEl = null;
        if (groups.length > 1) {
          tabsEl = h('div', { class: 'wr-tabs', role: 'tablist', 'aria-label': 'Your weather' });
          groups.forEach(gp => { const b = h('button', { type: 'button', class: 'wr-tab', role: 'tab', 'aria-selected': String(gp.type === first), 'data-type': gp.type }, h('span', { class: 'wr-ti', html: ICONS[gp.type] }), WX[gp.type].label); b.addEventListener('click', () => { if (stage !== 3) return; K.sfx.tap(); showGroup(gp.type); }); tabsEl.append(b); });
        }
        chipHost = h('div', { class: 'wr-chiphost' });
        fcBtn = K.button('On to the forecast', () => { if (stage === 3 && word) { K.sfx.ok(); startStep4(); } }, { cls: 'wr-go' });
        fcBtn.hidden = true;
        setBody(3, tabsEl ? null : h('p', { class: 'wr-hint', text: 'Which word fits best? Be precise.' }), tabsEl, chipHost, fcBtn);
        keeper.face('idea', 1800);
        say(LN.step3, { ms: 4200 });
        clickTo({ x: Pl.x, y: Pl.y - Pl.r * 1.2 });
        setLT('Name it exactly', 'A precise name turns the volume down');
        showGroup(first);
      }
      function showGroup(tp) {
        if (tabsEl) tabsEl.querySelectorAll('.wr-tab').forEach(b => b.setAttribute('aria-selected', String(b.getAttribute('data-type') === tp)));
        if (chipsWrap) chipsWrap.remove();
        const gp = groups.find(x => x.type === tp);
        chipsWrap = K.chips(chipHost, gp.words.map(wd => ({ id: wd, label: wd, user: wd === gp.seed })), (item) => pickWord(item.id, tp), { label: WX[tp].label + ' words', cls: 'wr-chips' });
        chipsWrap.querySelectorAll('button').forEach(b => { if (b.getAttribute('data-id') === gp.seed) { b.classList.add('wr-seed'); b.title = 'From what you wrote'; } b.setAttribute('aria-pressed', String(!!word && b.getAttribute('data-id') === word)); });
        if (!word) K.guide({ id: 'name', g: 'choose', target: () => Array.from(chipsWrap.querySelectorAll('button')), label: 'NAME IT EXACTLY', delay: 900 });
      }
      function pickWord(wd, tp) {
        if (stage !== 3 || word === wd) return;
        const first = !word;
        word = wd; wordType = tp;
        const sunny = tp === 'sun'; // naming a good feeling savours it: the sun brightens instead of softening
        items.forEach(it => { if (it.type === 'sun') { it.kt = 1; it.calmT = sunny ? -0.25 : 0; } else { it.kt = it.type === tp ? 0.42 : Math.min(it.kt, 0.8); it.calmT = it.type === tp ? 1 : 0; } });
        const it = items.find(i => i.type === tp), c = itemC(it);
        P.emit('star', c.x, c.y, 18, { colors: ['#fffbe6', '#ffe58a', '#cfefff'] });
        P.emit('spark', c.x, c.y, 14, { colors: ['#ffffff', '#ffe08a'] });
        K.sfx.sparkle(); K.sfx.great();
        if (A.ctx) A.tone({ type: 'sine', freq: 660, to: 330, glide: 0.9, dur: 1.1, vol: 0.05, verb: 0.5 }); // the sigh of the weather letting go
        const fresh = VOCAB.has(wd) && !K.collection().includes(wd);
        K.pop(fresh ? 'New word!' : 'Named it', { x: clamp(c.x, 90, L.w - 90), y: clamp(c.y - c.u * 0.7, L.map.y + 30, L.map.y + L.map.h - 40), kind: 'great' });
        setLT([wordSpan(wd), ' · ' + WX[tp].fc], sunny ? 'Named. Naming a good feeling helps it last' : 'Named. A precise name turns the volume down');
        ctx.track('named', { type: tp, n: wd.length, fresh: fresh ? 1 : 0 });
        if (first) {
          keeper.face('wow', 1300); S.later(() => keeper.base(sunny ? 'happy' : 'calm'), 1300);
          say(fresh && visits > 0 ? LN.fresh : sunny ? LN.namedSun : LN.named, { ms: 3600 });
          breaking(wd);
          fcBtn.hidden = false;
          K.guide({ id: 'name-done', g: 'tap', target: fcBtn, label: 'ON TO THE FORECAST', delay: 2200 });
        } else { keeper.face('happy', 900); breaking(wd); }
      }

      /* ---------------- step 4: the forecast ---------------- */
      let fcWrap = null, cards = [], time = null, knob = null, stops = [], hourHand = null, minHand = null;
      const SC = { last: 0, lastF: 0, accT: 0, accF: 0, act: 0, v: [], fast: 0, warned: false };
      function card(head, icon, text, user) {
        const ic = h('span', { class: 'wr-ci', html: ICONS[icon] });
        const tx = h('span', { class: 'wr-ct' + (user ? ' gk-user' : ''), text });
        return { el: h('div', { class: 'wr-card' }, h('span', { class: 'wr-ch', text: head }), ic, tx), ic, tx };
      }
      function flip(cd, icon) { if (icon) cd.ic.innerHTML = ICONS[icon]; cd.ic.classList.remove('flip'); void cd.ic.offsetWidth; if (!K.reduced()) cd.ic.classList.add('flip'); }
      function fitTime() {
        if (!time) return;
        const tw0 = time.clientWidth || 300, l = (tw0 - 16) / 6;
        time.style.setProperty('--l', l + 'px');
        stops.forEach((s, i) => { s.style.left = (l + i * 0.5 * (tw0 - 2 * l)) + 'px'; });
        placeKnob();
      }
      const trackL = () => (time ? ((time.clientWidth || 300) - 16) / 6 : 58);
      const trackW = () => (time ? Math.max(40, (time.clientWidth || 300) - 2 * trackL()) : 200);
      function placeKnob() { if (!knob) return; knob.style.left = trackL() + 'px'; knob.style.setProperty('--x', (W.ft * trackW()) + 'px'); }
      function startStep4() {
        stage = 4; K.guide(null);
        cards = [card('Now', wordType, cap(word), true), card('Later today', WX[wordType].later, WX[wordType].fc), card('Tomorrow', 'sun', WX[wordType].clear)];
        cards[0].el.classList.add('here');
        time = h('div', { class: 'wr-time', role: 'slider', tabindex: '0', 'aria-label': 'Forecast. Slide slowly from now to tomorrow.', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0', 'aria-valuetext': 'Now' });
        stops = [0, 1, 2].map(() => h('span', { class: 'wr-stop' }));
        knob = h('div', { class: 'wr-knob', html: CLOCK });
        hourHand = knob.querySelector('.wr-hh'); minHand = knob.querySelector('.wr-mh');
        time.append(h('div', { class: 'wr-track' }), ...stops, knob);
        fcWrap = h('div', { class: 'wr-fc' }, h('div', { class: 'wr-cards' }, cards.map(c => c.el)), time);
        setBody(4, fcWrap, h('p', { class: 'wr-hint wr-sub', text: 'Slowly, like one long breath out.' }));
        fitTime();
        let f0 = 0, x0 = 0;
        K.drag(time, {
          start: (p) => { if (stage !== 4) return false; f0 = W.ft; x0 = p.x; SC.last = 0; knob.classList.add('on'); K.sfx.tap(); if (A.ctx) A.tone({ type: 'sine', freq: 392, to: 523, glide: 0.12, dur: 0.16, vol: 0.05 }); },
          move: (p) => { if (stage === 4) setF(clamp(f0 + (p.x - x0) / trackW(), 0, 1), true); },
          end: () => { knob.classList.remove('on'); if (stage === 4 && W.ft < 0.98) K.guide({ id: 'fc-more', g: 'drag', dir: 'r', target: knob, d: Math.max(50, Math.round((1 - W.ft) * trackW())), label: 'KEEP GOING, SLOWLY', delay: 1600 }); }
        });
        keeper.face('happy', 1500);
        say(LN.step4, { ms: 3600 });
        clickTo({ x: Pl.x + L.map.w * 0.25, y: Pl.y - Pl.r });
        setLT([wordSpan(word), ' · ' + WX[wordType].fc], 'Forecast: now, later today, tomorrow');
        const core = an.core && an.core.label ? an.core.label : '';
        tickerSet((core ? [{ pre: 'Also passing through: ', user: core }] : []).concat(['Every weather system moves on', 'Feelings are weather, not climate']));
        K.guide({ id: 'fc', g: 'drag', dir: 'r', target: knob, d: Math.round(trackW() - 6), ms: 2600, label: 'SLOWLY TO TOMORROW', delay: 1000 });
      }
      function trackScrub(f) {
        const now = performance.now() / 1000;
        if (!SC.last) { SC.last = now; SC.lastF = f; return; }
        const dt = Math.min(0.25, now - SC.last), df = f - SC.lastF;
        SC.last = now; SC.lastF = f;
        if (df <= 0) return;
        SC.act += dt; SC.accT += dt; SC.accF += df;
        if (SC.accT >= 0.08) { const v = SC.accF / SC.accT; SC.v.push(v); SC.accT = 0; SC.accF = 0; if (v > 0.8) { SC.fast++; tooFast(); } }
      }
      function tooFast() {
        knob.classList.remove('fast'); void knob.offsetWidth; if (!K.reduced()) knob.classList.add('fast');
        if (A.ctx) A.tone({ type: 'triangle', freq: 520, to: 380, glide: 0.18, dur: 0.22, vol: 0.05 });
        if (!SC.warned) { SC.warned = true; say(LN.slow, { ms: 2600 }); keeper.face('surprised', 900); }
      }
      function steadyScore() { // calm skill: an unhurried, even slide (about one long out-breath end to end)
        if (SC.v.length < 3) return clamp(SC.act / 3.4, 0, 1) * 0.6;
        const vs = SC.v, mean = vs.reduce((a, b) => a + b, 0) / vs.length;
        const sd = Math.sqrt(vs.reduce((a, b) => a + (b - mean) * (b - mean), 0) / vs.length), cv0 = sd / Math.max(1e-4, mean);
        return clamp(0.55 * clamp(SC.act / 3.4, 0, 1) + 0.45 * clamp(1 - (cv0 - 0.3) / 1.1, 0, 1) - Math.min(0.3, SC.fast * 0.05), 0, 1);
      }
      function setF(f, ptr) {
        const prev = W.ft; W.ft = f;
        if (ptr) trackScrub(f);
        placeKnob();
        if (hourHand) { hourHand.setAttribute('transform', 'rotate(' + (f * 720).toFixed(1) + ' 12 12)'); minHand.setAttribute('transform', 'rotate(' + (f * 8640).toFixed(1) + ' 12 12)'); }
        const h0 = Math.floor(prev * 24 + 1e-6), h1 = Math.floor(f * 24 + 1e-6);
        if (h1 > h0) scrubTick(h1); else if (h1 < h0 && A.ctx) A.wood(undefined, 0.03, 0.9);
        const zone = f < 0.25 ? 0 : f < 0.75 ? 1 : 2;
        if (zone !== curZone) {
          curZone = zone; cards.forEach((c, i) => c.el.classList.toggle('here', i === zone)); flip(cards[zone]);
          if (A.ctx) { A.tone({ type: 'sine', freq: [523, 659, 784][zone], dur: 0.25, vol: 0.05, verb: 0.3 }); A.noise({ filter: 'bandpass', freq: 3000, q: 0.8, dur: 0.12, vol: 0.04 }); }
        }
        time.setAttribute('aria-valuenow', String(Math.round(f * 100))); time.setAttribute('aria-valuetext', ['Now', 'Later today', 'Tomorrow'][zone]);
        [0.5, 0.98].forEach((m, i) => { if ((prev < m) !== (f < m) && f > prev) { if (A.ctx) A.wood(undefined, 0.14, 1 + i * 0.3); K.sfx.chime(i + 3); } });
        if (!laterSaid && f >= 0.5) { laterSaid = true; say(LN.later, { ms: 2600 }); keeper.face('wow', 900); clickTo({ x: Pl.x + L.map.w * 0.2, y: Pl.y - Pl.r * 1.3 }); }
        if (f >= 0.98) setLT([wordSpan(word), ' · ' + WX[wordType].fc + ' · ' + WX[wordType].clear], 'Forecast: now, later today, tomorrow');
      }
      K.onKey(['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'], (e) => {
        const up = e.key === 'ArrowRight' || e.key === 'ArrowUp';
        if (stage === 4 && time) { e.preventDefault(); setF(clamp(W.ft + (up ? 1 : -1) / 24, 0, 1), true); }
        else if (stage === 2 && items.length) { e.preventDefault(); const it = W.focusIt && items.includes(W.focusIt) ? W.focusIt : items[0]; setSize(it, it.s + (up ? 0.1 : -0.1)); sized(); }
      });

      /* ---------------- finale ---------------- */
      async function finale() {
        if (stage === 5) return;
        stage = 5; K.guide(null);
        W.ft = 1; W.finT = W.t;
        if (!bgWarm && L) bgWarm = paintStudio(1);
        items.forEach(it => { if (it.type === 'sun') it.kt = 1; });
        const score = steadyScore(), pct = Math.round(score * 100), tier = K.tier(score);
        const best = K.best('steady', pct, 'higher');
        const col = VOCAB.has(word) ? K.collect(word) : { isNew: false, count: K.collection().length, items: K.collection() };
        const words = col.items.filter(x => VOCAB.has(x));
        // the desk becomes the forecast graphic: three lit cards, the almanac and the steady-hand medal
        time.classList.add('gone'); time.setAttribute('aria-hidden', 'true');
        cards.forEach(c => { c.el.classList.remove('here'); c.el.classList.add('lit'); });
        cards[2].tx.textContent = 'Rainbow · ' + WX[wordType].clear; flip(cards[2], 'rainbow');
        const recent = words.slice(-5).reverse();
        const alm = h('div', { class: 'wr-alm' }, recent.map(x => h('span', { class: 'wr-aw' + (x === word && col.isNew ? ' new' : '') }, cap(x), x === word && col.isNew ? h('em', { text: 'New' }) : null)), words.length > recent.length ? h('span', { class: 'wr-aw more', text: '+' + (words.length - recent.length) + ' more' }) : null);
        const medal = { Gold: '#ffc84a', Silver: '#d7e0ea', Bronze: '#e3a06a' }[tier] || '#9fb3d1';
        const tierRow = h('div', { class: 'wr-tiers' }, h('span', { class: 'wr-tier' }, h('i', { class: 'wr-medal', style: { '--m': medal } }), (tier ? tier + ' · ' : '') + 'Steady forecast ' + pct + '%'), best.isNew ? h('span', { class: 'wr-tier nb', text: 'New best' }) : null);
        const board = h('div', { class: 'wr-board' }, h('div', { class: 'wr-alab', text: 'Emotion almanac · ' + words.length + (words.length === 1 ? ' word' : ' words') }), alm, tierRow);
        time.remove();
        foot.hidden = true; dalm.hidden = true;
        setBody(0, fcWrap, board);
        const fcText = WX[wordType].fc + ' · ' + WX[wordType].clear;
        setLT([wordSpan(word), ' · ' + fcText], 'Feelings are weather. They move through.', 'Your forecast');
        keeper.base('E98');
        keeper.say(ctx.line(LN.fin).replace('{w}', word).replace('{W}', cap(word)), { ms: 0 });
        tkTag.textContent = 'Latest';
        tickerSet(['That’s the weather. Back to you.', 'Feelings are weather, not climate', 'Weather fact: ' + FACT]);
        music.level(0.85);
        K.sfx.whoosh();
        if (A.ctx) ['C5', 'E5', 'G5', 'B5', 'D6', 'E6', 'G6'].forEach((nt, i) => A.chime(A.note(nt), { when: A.now() + 0.15 + i * 0.2, vol: 0.06, dur: 1.8 }));
        P.emit('star', Pl.x, Pl.y - Pl.r * 1.5, 24, { colors: ['#fffbe6', '#ffe58a', '#ffd1f0', '#cfefff'] });
        const cols = ['#ff5f6d', '#ffb347', '#ffd93d', '#6bd56b', '#4db5ff', '#b07bff'];
        // the finale's sparkle lives in this game's own canvas (no second full-screen layer): a warm chord, stars over the map
        if (A.ctx) { A.pad(['F4', 'A4', 'C5', 'E5'].map(n => A.note(n)), { dur: 6, vol: 0.16, attack: 0.6 }); A.sync('finale', performance.now()); }
        if (inten === 2) P.emit('confetti', Pl.x, Pl.y - Pl.r, 46, { angle: -Math.PI / 2, spread: 1.4, colors: cols });
        W.sparkle = 1;
        await K.wait(K.reduced() ? 2300 : 4600);
        W.sparkle = 0;
        finished = true;
        const main = items.slice().sort((a, b) => b.s - a.s)[0];
        const badges = [];
        if (tier) badges.push(tier + ' forecaster');
        if (best.isNew) badges.push('New best: ' + pct + '% steady');
        else if (best.first) badges.push('First forecast: ' + pct + '% steady');
        badges.push(col.isNew ? 'Almanac +1: ' + cap(word) + ' (' + words.length + ')' : 'Almanac: ' + words.length + (words.length === 1 ? ' word' : ' words'));
        ctx.track('forecast', { steady: pct, tier: tier || 'none', words: words.length });
        ctx.finish({
          title: cap(word) + ', passing through', mood: 'rainbow',
          lines: ['Named it: ' + word, WX[main.type].label + ' (' + sizeWord(main) + ') → ' + WX[wordType].fc, 'Forecast: ' + WX[wordType].clear + ' · steady ' + pct + '%'],
          share: 'I named my inner weather and forecast it through to a rainbow.',
          badges
        });
      }

      /* ---------------- render ---------------- */
      let liveA = -1;
      const setPos = (node, x, y) => { const lx = (Math.round(x * 2) / 2) + 'px', ly = (Math.round(y * 2) / 2) + 'px'; if (node.style.left !== lx) node.style.left = lx; if (node.style.top !== ly) node.style.top = ly; };
      K.loop((dt, t) => {
        const g = cv.g; if (!g || !L || !bg) return;
        W.t = t;
        const b = beat(), pulse = Math.exp(-(((b.pos % 1) + 1) % 1) * 5);
        const pk = Math.min(1, dt * 3.2);
        Pl.x += (Pl.tx - Pl.x) * pk; Pl.y += (Pl.ty - Pl.y) * pk; Pl.r += (Pl.tr - Pl.r) * pk;
        W.f += (W.ft - W.f) * Math.min(1, dt * 2.2);
        W.sunK += ((stage >= 2 ? 1 : 0) - W.sunK) * Math.min(1, dt * 2.5);
        if (stage === 5) { W.rainbow = Math.min(1, (t - W.finT) / 1.9); W.warm = Math.min(1, (t - W.finT) / 2.6); }
        if (W.sparkle && Math.random() < dt * 10) P.emit('star', L.map.x + Math.random() * L.map.w, L.map.y + Math.random() * L.map.h * 0.75, 1, { speed: [5, 18], colors: ['#fffbe6', '#ffe58a', '#ffd1f0'] });
        let windy = 0;
        items.forEach(it => {
          it.sd += (it.s - it.sd) * Math.min(1, dt * 9); it.k += (it.kt - it.k) * Math.min(1, dt * 1.8); it.pop = Math.min(1.2, it.pop + dt * 2.4);
          it.calm += ((it.calmT || 0) - (it.calm || 0)) * Math.min(1, dt * 2); it.echo = Math.max(0, (it.echo || 0) - dt * 1.4);
          if (it.type === 'wind' || it.type === 'storm') windy += alphaOf(it) * it.sd;
        });
        W.spin += dt * (0.5 + windy * 2.4);
        const w = cv.w, H = cv.h, m = L.map;
        g.drawImage(bg, 0, 0, w, H);
        if (W.warm > 0 && bgWarm) { g.globalAlpha = W.warm; g.drawImage(bgWarm, 0, 0, w, H); g.globalAlpha = 1; }
        g.save(); rr(g, m.x, m.y, m.w, m.h, L.r0); g.clip();
        if (W.nudge > 0.01) { W.nudge = Math.max(0, W.nudge - dt * 4); g.translate((Math.random() - 0.5) * 6 * W.nudge, (Math.random() - 0.5) * 5 * W.nudge); }
        mapTint(g);
        drawSky(g, t);
        drawRadar(g, b);
        rainbowAt(g);
        drawItems(g, t, true);
        forecastSun(g, t);
        drawPlanet(g, t, stage >= 1 && stage < 5 ? pulse : 0);
        drawItems(g, t, false);
        blips(g);
        if (W.drag || W.flying) {
          const hot = W.drag && W.drag.hot;
          g.setLineDash([6, 7]); g.lineDashOffset = -t * 30; g.lineWidth = hot ? 3 : 2;
          g.strokeStyle = 'rgba(255,225,140,' + (hot ? 0.95 : 0.4 + 0.3 * pulse) + ')';
          g.beginPath(); g.arc(Pl.x, Pl.y, Pl.r * (hot ? 1.5 : 1.42), 0, TAU); g.stroke(); g.setLineDash([]);
        }
        if (W.flash > 0) { g.fillStyle = 'rgba(225,235,255,' + (W.flash * 0.35) + ')'; g.fillRect(m.x, m.y, m.w, m.h); W.flash = Math.max(0, W.flash - dt * 4); }
        P.update(dt); P.draw(g);
        g.restore();
        if (W.laser) {
          const lt = t - W.laser.t0, a = lt < 0.15 ? lt / 0.15 : Math.max(0, 1 - (lt - 0.9) / 0.5);
          if (a <= 0) W.laser = null;
          else {
            const cr = K.rectIn(clicker), sx = cr.cx + 4, sy = cr.y + 4, lx = W.laser.x + Math.sin(t * 9) * 1.5, ly = W.laser.y + Math.cos(t * 7) * 1.5;
            g.strokeStyle = 'rgba(255,70,70,' + (0.16 * a) + ')'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(sx, sy); g.lineTo(lx, ly); g.stroke();
            const lg = g.createRadialGradient(lx, ly, 0, lx, ly, 16); lg.addColorStop(0, 'rgba(255,90,90,' + (0.85 * a) + ')'); lg.addColorStop(1, 'rgba(255,60,60,0)');
            g.fillStyle = lg; g.fillRect(lx - 16, ly - 16, 32, 32);
            g.fillStyle = 'rgba(255,235,235,' + a + ')'; g.beginPath(); g.arc(lx, ly, 2.6, 0, TAU); g.fill();
          }
        }
        // live DOM: caption under the planet, size handles and tags, the map clock, the on-air light on the beat
        setPos(caption, Pl.x, Pl.y + Pl.r + 12);
        const capO = stage >= 5 ? '0' : '0.92'; if (caption.style.opacity !== capO) caption.style.opacity = capO;
        handles.forEach(hd => { const p = handleAt(hd.it); setPos(hd.el, p.x, p.y); setPos(hd.tag, p.x, p.y + 30); });
        const clk = W.f < 0.25 ? 'Now' : W.f < 0.75 ? 'Later today' : 'Tomorrow';
        if (clockEl.textContent !== clk) clockEl.textContent = clk;
        const la = Math.round((0.3 + 0.7 * pulse) * 20) / 20;
        if (la !== liveA) { liveA = la; liveDot.style.opacity = String(la); }
        soundLevels(t, dt); radarPing();
        if (stage === 4 && W.ft >= 0.98 && W.f >= 0.95) finale();
      });

      /* ---------------- start ---------------- */
      cv.onResize(() => layout());
      setBody(0, editionCard());
      (async () => {
        await K.intro({ title: 'Weather Report', sub: 'Today’s forecast comes from inside you. Map it, size it, name it, then watch it move through.', how: 'Drag weather onto your planet, size it, name it exactly, then slide the forecast slowly to tomorrow.', char: 'sync', mood: 'E65' });
        ensureAudio(); sting();
        lower.classList.add('on'); K.sfx.whoosh();
        setLT('What’s the weather like in there?', EDITION + ' · live with Sync');
        tickerSet(TICK_A);
        keeper.base('happy');
        clickTo({ x: Pl.x, y: Pl.y });
        await say(visits > 0 ? LN.back : LN.intro, { ms: 3600 });
        await K.wait(900);
        startStep1();
      })();

      return {
        async autoplay() {
          const wait = K.wait;
          while (stage !== 1) await wait(150);
          await wait(700);
          const f = String(an.feeling || '').toLowerCase().trim();
          const picks = [FEEL[f] || 'storm']; picks.push(picks[0] === 'rain' ? 'cloud' : 'rain');
          for (const tp of picks) {
            const tile = tiles[tp], tr = K.rectIn(tile);
            await K.sim.drag(tile, { x: tr.w / 2, y: tr.h / 2 }, { x: Pl.x - tr.x, y: Pl.y - Pl.r * 0.6 - tr.y }, 950, 20);
            await wait(1300);
          }
          while (!doneBtn || doneBtn.hidden) await wait(100);
          await K.sim.tap(doneBtn);
          while (stage !== 2) await wait(100);
          await wait(1500);
          const hd = handles[0], o = originOf(hd.it), p0 = handleAt(hd.it);
          const dx = p0.x - o.x, dy = p0.y - o.y, dl = Math.max(1, Math.hypot(dx, dy));
          const a0 = { x: p0.x, y: p0.y }, a1 = { x: p0.x + dx / dl * 42, y: p0.y + dy / dl * 42 };
          let hr = K.rectIn(hd.el);
          const pr = await K.sim.press(hd.el, a0.x - hr.x, a0.y - hr.y);
          for (let i = 1; i <= 16; i++) { await wait(55); hr = K.rectIn(hd.el); pr.move(a0.x + (a1.x - a0.x) * i / 16 - hr.x, a0.y + (a1.y - a0.y) * i / 16 - hr.y); }
          hr = K.rectIn(hd.el); pr.up(a1.x - hr.x, a1.y - hr.y);
          await wait(900);
          if (gauges[1]) { await K.sim.tap(gauges[1].segs[0]); await wait(700); }
          while (!sizeBtn || sizeBtn.hidden) await wait(100);
          await K.sim.tap(sizeBtn);
          while (stage !== 3) await wait(100);
          await wait(1800);
          await K.sim.tap(chipsWrap.querySelector('button'));
          await wait(2600);
          await K.sim.tap(fcBtn);
          while (stage !== 4) await wait(100);
          await wait(1400);
          const y = time.clientHeight / 2, x0 = trackL();
          await K.sim.drag(time, { x: x0, y }, { x: x0 + trackW() * 0.52, y }, 2300, 30);
          await wait(1500);
          await K.sim.drag(time, { x: x0 + trackW() * 0.52, y }, { x: x0 + trackW() + 8, y }, 2400, 30);
          while (!finished) await wait(200);
        }
      };
    }
  });
})(window.TSG_ENV);
