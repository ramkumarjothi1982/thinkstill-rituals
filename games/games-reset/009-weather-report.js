/* 009 Weather Report — Reset · FEEL · Emotion
 * Mechanism: affect labelling and emotional granularity. Putting a feeling into a precise word dampens its intensity
 * (Lieberman et al. 2007; Kashdan, Barrett & McKnight 2015), and forecasting it forward is a reminder that feelings are
 * weather, not climate: they move through. The player maps, sizes and names their inner weather, then scrubs the forecast.
 * Verb: forecast (drag weather onto your inner planet, size it, name it exactly, slide the forecast to tomorrow).
 * Finale: a rainbow arcs over the little planet, the studio lights warm up and the lower third reads the forecast.
 */
(function (env) {
  'use strict';
  const WX = {
    sun: { label: 'Sun', words: ['hopeful', 'relieved', 'proud'], fc: 'sunny spells', clear: 'bright all day', sizes: ['soft', 'warm', 'bright', 'blazing'] },
    cloud: { label: 'Cloud', words: ['low', 'gloomy', 'heavy', 'meh', 'deflated'], fc: 'clouds breaking', clear: 'brighter later', sizes: ['wispy', 'grey', 'heavy', 'overcast'] },
    rain: { label: 'Rain', words: ['sad', 'disappointed', 'lonely', 'hurt', 'homesick'], fc: 'showers easing', clear: 'clearing later', sizes: ['drizzle', 'showers', 'heavy', 'downpour'] },
    storm: { label: 'Storm', words: ['angry', 'furious', 'frustrated', 'resentful', 'irritated'], fc: 'passing showers', clear: 'clearing later', sizes: ['rumbling', 'stormy', 'severe', 'raging'] },
    fog: { label: 'Fog', words: ['numb', 'confused', 'flat', 'foggy', 'unsure'], fc: 'fog lifting', clear: 'clearer later', sizes: ['patchy', 'misty', 'thick', 'dense'] },
    wind: { label: 'Wind', words: ['restless', 'anxious', 'on edge', 'rushed', 'wired'], fc: 'gusts easing', clear: 'calmer later', sizes: ['breezy', 'gusty', 'strong', 'gale'] },
    heat: { label: 'Heat haze', words: ['embarrassed', 'ashamed', 'jealous', 'guilty', 'flustered'], fc: 'cooling off', clear: 'fresher later', sizes: ['warm', 'hot', 'sweltering', 'scorching'] },
    snow: { label: 'Snow', words: ['tired', 'drained', 'frozen', 'stuck'], fc: 'slow thaw', clear: 'milder tomorrow', sizes: ['flurries', 'steady', 'heavy', 'blizzard'] }
  };
  const ORDER = ['sun', 'cloud', 'rain', 'storm', 'fog', 'wind', 'heat', 'snow'];
  const CLOUDY = { cloud: 1, rain: 1, storm: 1, snow: 1 };
  /* the reader's one-word feeling → the weather family it belongs to (used to seed the word chips) */
  const FEEL = {
    angry: 'storm', furious: 'storm', frustrated: 'storm', irritated: 'storm', annoyed: 'storm', resentful: 'storm', grumpy: 'storm', mad: 'storm', overwhelmed: 'storm',
    sad: 'rain', disappointed: 'rain', lonely: 'rain', hurt: 'rain', homesick: 'rain', upset: 'rain', tearful: 'rain', heartbroken: 'rain',
    numb: 'fog', confused: 'fog', flat: 'fog', foggy: 'fog', unsure: 'fog', bored: 'fog', lost: 'fog',
    restless: 'wind', anxious: 'wind', rushed: 'wind', wired: 'wind', stressed: 'wind', nervous: 'wind', scared: 'wind', worried: 'wind', alarmed: 'wind', panicky: 'wind', 'on edge': 'wind',
    embarrassed: 'heat', ashamed: 'heat', jealous: 'heat', guilty: 'heat', flustered: 'heat',
    tired: 'snow', drained: 'snow', frozen: 'snow', stuck: 'snow', exhausted: 'snow',
    hopeful: 'sun', relieved: 'sun', proud: 'sun', excited: 'sun', happy: 'sun', buzzing: 'sun', grateful: 'sun',
    low: 'cloud', gloomy: 'cloud', heavy: 'cloud', meh: 'cloud', deflated: 'cloud', down: 'cloud'
  };
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
    snow: SVG('<g stroke="#eaf6ff" stroke-width="3" stroke-linecap="round" fill="none"><line x1="24" y1="8" x2="24" y2="40"/><line x1="10.1" y1="16" x2="37.9" y2="32"/><line x1="10.1" y1="32" x2="37.9" y2="16"/><path d="M19 11L24 15L29 11M19 37L24 33L29 37"/></g>')
  };
  const RESIZE = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const CLOCK = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M12 7.2V12l3.2 2.2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
  const MINI = '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><circle cx="30" cy="17" r="8" fill="#ffd84d"/><path d="' + CLOUD_D + '" transform="translate(-4 4) scale(.92)" fill="#fff"/></svg>';

  (env.games = env.games || []).push({
    id: 'weather-report', mode: 'reset', name: 'Weather Report', verb: 'forecast', family: 'FEEL', minutes: 2,
    parents: ['Emotion', 'Identity / Self'],
    cast: ['sync'], poster: { char: 'sync', mood: 'E65' },
    tagline: 'Present the weather inside you, name it exactly, watch it pass.',
    why: 'For a big or murky feeling: naming it precisely turns the volume down.',
    css: `
.g-weather-report { --wr-hot: #ff7a3d; --wr-gold: #ffd166; }
.g-weather-report .wr-probe { position: absolute; left: 0; top: 0; width: 0; height: 0; visibility: hidden; pointer-events: none; padding: env(safe-area-inset-top, 0px) 0 env(safe-area-inset-bottom, 0px); }
.g-weather-report .wr-bug { position: absolute; z-index: 8; display: flex; gap: 6px; align-items: center; pointer-events: none; }
.g-weather-report .wr-live { display: inline-flex; align-items: center; gap: 6px; font: 700 12px/1 var(--font-ui); letter-spacing: 0.12em; color: #fff; background: #e23b3b; padding: 6px 9px 5px; border-radius: 6px; box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3); }
.g-weather-report .wr-live i { width: 7px; height: 7px; border-radius: 50%; background: #fff; animation: wr-blink 1.4s ease-in-out infinite; }
@keyframes wr-blink { 50% { opacity: 0.25; } }
.g-weather-report .wr-clock { font: 700 12px/1 var(--font-ui); letter-spacing: 0.1em; color: #0c1834; background: rgba(255, 255, 255, 0.94); padding: 6px 9px 5px; border-radius: 6px; text-transform: uppercase; box-shadow: 0 3px 10px rgba(0, 0, 0, 0.22); white-space: nowrap; }
.g-weather-report .wr-caption { position: absolute; z-index: 7; left: 0; top: 0; transform: translateX(-50%); font: 700 12px/1 var(--font-ui); letter-spacing: 0.16em; text-transform: uppercase; color: #fff; text-shadow: 0 1px 6px rgba(0, 30, 20, 0.8); white-space: nowrap; pointer-events: none; transition: opacity 0.4s ease; }
.g-weather-report .wr-pal { position: absolute; z-index: 12; display: grid; gap: 6px; opacity: 0; transform: translateX(-24px); transition: opacity 0.45s ease, transform 0.55s cubic-bezier(.2, .9, .3, 1); pointer-events: none; }
.g-weather-report .wr-pal.on { opacity: 1; transform: none; pointer-events: auto; }
.g-weather-report .wr-pal.gone { opacity: 0; transform: translateX(-30px); pointer-events: none; }
.g-weather-report .wr-tile { appearance: none; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; padding: 3px 2px 4px; margin: 0; border-radius: 14px; cursor: grab; touch-action: none; color: #fff;
  background: linear-gradient(180deg, rgba(10, 44, 40, 0.62), rgba(4, 26, 24, 0.7)); border: 1px solid rgba(255, 255, 255, 0.24); box-shadow: 0 6px 14px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.14);
  -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); transition: transform 0.15s ease, opacity 0.25s ease, background 0.2s, border-color 0.2s; font-family: var(--font-ui); }
.g-weather-report .wr-tile svg { width: 60%; max-width: 40px; aspect-ratio: 1; height: auto; pointer-events: none; filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.35)); }
.g-weather-report .wr-tile .wr-tl { font: 600 12px/1.05 var(--font-ui); letter-spacing: 0.02em; text-align: center; pointer-events: none; white-space: nowrap; }
.g-weather-report .wr-tile[aria-pressed="true"] { background: linear-gradient(180deg, rgba(255, 209, 102, 0.42), rgba(255, 170, 60, 0.3)); border-color: var(--wr-gold); box-shadow: 0 0 0 2px rgba(255, 209, 102, 0.35), 0 6px 14px rgba(0, 0, 0, 0.28); }
.g-weather-report .wr-tile[aria-pressed="true"]::after { content: ""; position: absolute; top: 5px; right: 5px; width: 9px; height: 9px; border-radius: 50%; background: var(--wr-gold); box-shadow: 0 0 6px var(--wr-gold); }
.g-weather-report .wr-tile.lift { transform: scale(0.94); opacity: 0.75; }
.g-weather-report .wr-tile.dim { opacity: 0.42; }
.g-weather-report .wr-tile:focus-visible { outline: 3px solid var(--wr-gold); outline-offset: 2px; }
.g-weather-report .wr-ghost { position: absolute; z-index: 40; left: 0; top: 0; width: 76px; height: 76px; margin: -38px 0 0 -38px; pointer-events: none; filter: drop-shadow(0 12px 16px rgba(0, 0, 0, 0.45)); transition: transform 0.14s ease; }
.g-weather-report .wr-ghost svg { width: 100%; height: 100%; display: block; }
.g-weather-report .wr-ghost.hot { transform: scale(1.22); }
.g-weather-report .wr-ghost.fly { transition: left 0.42s cubic-bezier(.3, .8, .3, 1), top 0.42s cubic-bezier(.3, .8, .3, 1), transform 0.42s ease, opacity 0.42s ease; transform: scale(0.8); }
.g-weather-report .wr-handle { position: absolute; z-index: 16; left: 0; top: 0; width: 48px; height: 48px; margin: -24px 0 0 -24px; padding: 0; border-radius: 50%; border: 3px solid #fff; cursor: grab; touch-action: none;
  background: radial-gradient(circle at 40% 35%, #fff2c4, #ffc23d 62%, #e58a12); color: #4a2a00; display: grid; place-items: center; box-shadow: 0 0 0 5px rgba(255, 200, 80, 0.3), 0 8px 16px rgba(0, 0, 0, 0.38); animation: wr-breath 1.8s ease-in-out infinite; }
.g-weather-report .wr-handle svg { width: 22px; height: 22px; }
.g-weather-report .wr-handle.on { animation: none; transform: scale(1.12); }
.g-weather-report .wr-handle:focus-visible { outline: 3px solid #fff; outline-offset: 4px; }
@keyframes wr-breath { 50% { box-shadow: 0 0 0 10px rgba(255, 200, 80, 0.12), 0 8px 16px rgba(0, 0, 0, 0.38); } }
.g-weather-report .wr-tag { position: absolute; z-index: 15; left: 0; top: 0; transform: translateX(-50%); font: 700 12px/1 var(--font-ui); letter-spacing: 0.12em; text-transform: uppercase; color: #fff; background: rgba(8, 20, 40, 0.8);
  padding: 6px 9px 5px; border-radius: 7px; white-space: nowrap; pointer-events: none; box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3); }
.g-weather-report .wr-lower { position: absolute; z-index: 20; display: flex; flex-direction: column; align-items: flex-start; pointer-events: none; opacity: 0; transform: translateX(-18px);
  transition: opacity 0.45s ease, transform 0.6s cubic-bezier(.2, .9, .3, 1); filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.35)); }
.g-weather-report .wr-lower.on { opacity: 1; transform: none; }
.g-weather-report .wr-lt-tag { display: inline-flex; align-items: center; gap: 6px; font: 700 12px/1 var(--font-ui); letter-spacing: 0.14em; text-transform: uppercase; color: #2b1200; background: linear-gradient(90deg, #ffc35c, #ff8a3d); padding: 5px 11px 5px 7px; border-radius: 9px 9px 0 0; }
.g-weather-report .wr-lt-tag svg { width: 18px; height: 18px; }
.g-weather-report .wr-lt-bar { display: flex; flex-direction: column; gap: 3px; width: 100%; background: linear-gradient(90deg, rgba(10, 22, 50, 0.97), rgba(20, 40, 82, 0.93)); border-left: 5px solid var(--wr-hot); border-radius: 0 12px 12px 12px; padding: 9px 14px 10px; color: #fff; overflow: hidden; position: relative; }
.g-weather-report .wr-lt-bar::after { content: ""; position: absolute; inset: 0; background: linear-gradient(105deg, transparent 30%, rgba(255, 255, 255, 0.1) 45%, transparent 60%); transform: translateX(-100%); animation: wr-sheen 5s ease-in-out infinite; }
@keyframes wr-sheen { 0%, 60% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
.g-weather-report .wr-lt-main { font: 700 17px/1.22 var(--font-ui); letter-spacing: 0.005em; text-wrap: balance; }
.g-weather-report .wr-lt-sub { font: 500 13px/1.25 var(--font-ui); color: rgba(220, 232, 255, 0.86); }
.g-weather-report .wr-word { color: var(--wr-gold); font-size: max(17px, 1em); }
.g-weather-report.wr-bright .wr-lt-bar { background: linear-gradient(90deg, rgba(255, 255, 255, 0.99), rgba(242, 247, 255, 0.97)); color: #0f1d36; }
.g-weather-report.wr-bright .wr-lt-sub { color: #46557a; }
.g-weather-report.wr-bright .wr-word { color: #b4530a; }
.g-weather-report .wr-tray { position: absolute; z-index: 22; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; gap: 10px; transition: opacity 0.4s ease; }
.g-weather-report .wr-tray.gone { opacity: 0; pointer-events: none; }
.g-weather-report .wr-hint { font: 600 15px/1.32 var(--font-ui); text-align: center; color: var(--ui-fg); max-width: 36ch; text-wrap: balance; }
.g-weather-report .wr-placed { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; min-height: 44px; }
.g-weather-report .wr-pchip { appearance: none; display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 4px 12px 4px 5px; border-radius: 999px; border: 1px solid var(--ui-line); background: color-mix(in srgb, var(--ui-surface) 86%, transparent);
  color: var(--ui-fg); font: 600 14px/1 var(--font-ui); cursor: pointer; animation: wr-in 0.35s cubic-bezier(.2, 1.3, .4, 1) both; }
.g-weather-report .wr-pchip b { font-weight: 600; opacity: 0.6; font-size: 14px; }
.g-weather-report .wr-ti { width: 32px; height: 32px; border-radius: 50%; background: #17324f; display: grid; place-items: center; flex: none; }
.g-weather-report .wr-ti svg { width: 26px; height: 26px; }
.g-weather-report .wr-go { min-width: 210px; box-shadow: 0 10px 24px rgba(0, 0, 0, 0.28); animation: wr-in 0.4s cubic-bezier(.2, 1.3, .4, 1) both; }
@keyframes wr-in { from { opacity: 0; transform: translateY(10px) scale(0.96); } to { opacity: 1; transform: none; } }
.g-weather-report .wr-tabs { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; }
.g-weather-report .wr-tab { appearance: none; display: inline-flex; align-items: center; gap: 7px; min-height: 44px; padding: 5px 13px 5px 6px; border-radius: 999px; border: 1px solid var(--ui-line);
  background: color-mix(in srgb, var(--ui-surface) 82%, transparent); color: var(--ui-fg); font: 600 14px/1 var(--font-ui); cursor: pointer; }
.g-weather-report .wr-tab[aria-selected="true"] { border-color: var(--ui-accent); background: color-mix(in srgb, var(--ui-accent) 24%, var(--ui-surface)); box-shadow: 0 0 0 2px color-mix(in srgb, var(--ui-accent) 30%, transparent); }
.g-weather-report .wr-chips .ts-chip { min-height: 44px; font-size: 15px; padding: 10px 15px; font-weight: 600; }
.g-weather-report .wr-chips .wr-seed { border-color: var(--wr-gold); }
.g-weather-report .wr-chips .wr-seed::after { content: " ✦"; color: var(--wr-gold); }
.g-weather-report.wr-bright .wr-chips .wr-seed::after { color: #c26a00; }
.g-weather-report .wr-chiphost { display: flex; flex-direction: column; align-items: center; width: 100%; }
.g-weather-report .wr-time { position: relative; width: min(100%, 540px); height: 100px; touch-action: none; cursor: pointer; flex: none; }
.g-weather-report .wr-time:focus-visible { outline: 2px solid var(--ui-accent); outline-offset: 4px; border-radius: 14px; }
.g-weather-report .wr-track { position: absolute; left: 28px; right: 28px; top: 34px; height: 14px; border-radius: 7px; background: linear-gradient(90deg, #4b5b80, #5e93c8 50%, #ffcf5c); box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.4), 0 1px 0 rgba(255, 255, 255, 0.15); }
.g-weather-report .wr-stop { position: absolute; top: 33px; width: 16px; height: 16px; margin-left: -8px; border-radius: 50%; background: #fff; border: 3px solid #1d3557; pointer-events: none; }
.g-weather-report .wr-stoplab { position: absolute; top: 72px; transform: translateX(-50%); font: 700 12px/1.1 var(--font-ui); letter-spacing: 0.1em; text-transform: uppercase; color: var(--ui-fg); white-space: nowrap; pointer-events: none; transition: color 0.3s; }
.g-weather-report .wr-stoplab.first { transform: none; left: 8px !important; }
.g-weather-report .wr-stoplab.last { transform: none; left: auto !important; right: 8px; }
.g-weather-report .wr-stoplab.here { color: var(--ui-accent); }
.g-weather-report .wr-knob { position: absolute; top: 41px; left: 28px; width: 58px; height: 58px; margin: -29px 0 0 -29px; border-radius: 50%; border: 3px solid #fff; color: #5a3300; display: grid; place-items: center; pointer-events: none;
  background: radial-gradient(circle at 40% 35%, #fff6d0, #ffc84a 62%, #e8901c); box-shadow: 0 0 0 6px rgba(255, 200, 80, 0.3), 0 8px 18px rgba(0, 0, 0, 0.38); transform: translateX(var(--x, 0px)); }
.g-weather-report .wr-knob svg { width: 26px; height: 26px; }
.g-weather-report .wr-ticker { position: absolute; z-index: 20; display: flex; align-items: stretch; border-radius: 9px; overflow: hidden; background: rgba(8, 16, 36, 0.95); box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.1); pointer-events: none; }
.g-weather-report .wr-tk-tag { flex: none; display: flex; align-items: center; padding: 0 10px; font: 800 12px/1 var(--font-ui); letter-spacing: 0.12em; text-transform: uppercase; color: #fff; background: #e23b3b; }
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
      let stage = 0, finished = false;
      if (ctx.analysisReady && ctx.analysisReady.then) ctx.analysisReady.then(a => { if (a && stage < 3) an = a; }, () => {});
      const items = [];
      let word = '', wordType = '', sizedOnce = false, laterSaid = false;
      const W = { f: 0, ft: 0, warm: 0, rainbow: 0, flash: 0, drag: null, laser: null, t: 0, finT: 0, flying: false, stops: 0 };
      const Pl = { x: 0, y: 0, r: 0, tx: 0, ty: 0, tr: 0, init: false };
      const s0 = clamp(0.82 + ((an.intensity || 6) - 1) / 9 * 0.45, 0.8, 1.28);
      let L = null;
      const ss = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
      const hs = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
      const backOut = (k) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
      const cap = (s) => s ? s[0].toUpperCase() + s.slice(1) : s;

      /* ---------------- lines (every one in all three vibes) ---------------- */
      const LN = {
        intro: { Jolly: 'Good evening! Tonight’s forecast comes from somewhere special: inside you.', Cheeky: 'Evening! I’m Sync. Tonight the weather is… you. No pressure.', Unfiltered: 'We’re live. Tonight’s map is your insides. Let’s read it.' },
        step1: { Jolly: 'Drag the weather that matches how it feels in there. One to three.', Cheeky: 'Pick your weather, up to three. It’s live TV, so be honest.', Unfiltered: 'Drag on the weather that fits. One to three.' },
        full: { Jolly: 'Three systems. A full map! Tap when it looks right.', Cheeky: 'Busy skies. Tap when the map’s accurate.', Unfiltered: 'Map’s full. Tap when it’s right.' },
        step2: { Jolly: 'How big is it right now? Drag the gold handle to size it.', Cheeky: 'Now size it. Light drizzle or full monsoon?', Unfiltered: 'Size it. Small or huge. Be accurate.' },
        step3: { Jolly: 'Now name it exactly. The precise word turns the volume down.', Cheeky: 'Name it like a pro. “Bad” isn’t a weather.', Unfiltered: 'Pick the exact word. Precise names shrink feelings.' },
        named: { Jolly: 'Named it. See that? It’s already a little softer.', Cheeky: 'Look at that. Named, and a bit less loud.', Unfiltered: 'Named. Softer already. That’s the science.' },
        step4: { Jolly: 'Now the forecast. Slide from now to tomorrow.', Cheeky: 'Let’s fast-forward. Weather never sticks around.', Unfiltered: 'Slide it forward. Watch it move on.' },
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

      /* ---------------- world ---------------- */
      el.classList.toggle('wr-bright', !K.dark());
      const probe = h('div', { class: 'wr-probe', 'aria-hidden': 'true' });
      el.append(probe);
      const cv = K.canvas(el);
      const bg = h('canvas');
      const P = K.particles();
      const clockEl = h('span', { class: 'wr-clock', text: 'Now' });
      const bug = h('div', { class: 'wr-bug', 'aria-hidden': 'true' }, h('span', { class: 'wr-live' }, h('i'), 'Live'), clockEl);
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
      const tkMsg = h('span', { class: 'wr-tk-msg' });
      const ticker = h('div', { class: 'wr-ticker', 'aria-hidden': 'true' }, h('span', { class: 'wr-tk-tag', text: 'Latest' }), tkMsg);
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
          l.tray = { x: 12, y: ty, w: w - 24, h: Math.max(160, l.ticker.y - 8 - ty) };
          const tw = 62, th = clamp(Math.floor((l.map.h - 20 - 22 - 18) / 4), 48, 64);
          l.pal = { x: l.map.x + 10, y: l.map.y + 10, tw, th };
          const px = l.pal.x + 2 * tw + 6;
          l.p1 = { x: px + (l.map.x + l.map.w - px) / 2, y: l.map.y + l.map.h * 0.56, r: Math.min(56, l.map.h * 0.18) };
          l.p2 = { x: l.map.x + l.map.w / 2, y: l.map.y + l.map.h * 0.56, r: Math.min(70, l.map.h * 0.2) };
        } else {
          l.ticker = { x: 24, y: bottom - 34, w: w - 48, h: 34 };
          const mapH = clamp(Math.round((l.ticker.y - top) * 0.72), 300, 640);
          l.map = { x: 24, y: top, w: w - 48, h: mapH };
          l.ltH = 84; l.lt = { x: 24, y: l.map.y + l.map.h - 22, w: Math.min(640, (w - 48) * 0.5) };
          l.sz = 112; l.pres = { x: 44, y: l.map.y + l.map.h - l.sz - 44 };
          const tx = l.lt.x + l.lt.w + 20, ty = l.map.y + l.map.h + 10;
          l.tray = { x: tx, y: ty, w: w - 24 - tx, h: Math.max(150, l.ticker.y - 10 - ty) };
          const tw = 100, th = clamp(Math.floor((l.pres.y - 12 - (l.map.y + 22) - 18) / 4), 56, 82);
          l.pal = { x: l.map.x + 22, y: l.map.y + 22, tw, th };
          const px = l.pal.x + 2 * tw + 6;
          l.p1 = { x: px + (l.map.x + l.map.w - px) / 2, y: l.map.y + l.map.h * 0.55, r: Math.min(100, l.map.h * 0.18) };
          l.p2 = { x: l.map.x + l.map.w / 2, y: l.map.y + l.map.h * 0.56, r: Math.min(118, l.map.h * 0.2) };
        }
        l.lamps = []; const n = wide ? 7 : 4; for (let i = 0; i < n; i++) l.lamps.push(w * (i + 0.5) / n);
        L = l;
        const pos = (node, r) => { node.style.left = r.x + 'px'; node.style.top = r.y + 'px'; if (r.w != null) node.style.width = r.w + 'px'; if (r.h != null) node.style.height = r.h + 'px'; };
        pos(tray, l.tray); pos(ticker, l.ticker); pos(lower, { x: l.lt.x, y: l.lt.y, w: l.lt.w });
        bug.style.right = (w - l.map.x - l.map.w + 10) + 'px'; bug.style.top = (l.map.y + 10) + 'px';
        pal.style.left = l.pal.x + 'px'; pal.style.top = l.pal.y + 'px';
        pal.style.gridTemplateColumns = 'repeat(2, ' + l.pal.tw + 'px)'; pal.style.gridAutoRows = l.pal.th + 'px';
        keeper.el.style.setProperty('--sz', l.sz + 'px');
        keeper.place(l.pres.x, l.pres.y);
        const tp = stage <= 1 ? l.p1 : l.p2;
        Pl.tx = tp.x; Pl.ty = tp.y; Pl.tr = tp.r;
        if (!Pl.init) { Pl.x = tp.x; Pl.y = tp.y; Pl.r = tp.r; Pl.init = true; }
        drawStatic();
      }

      /* the studio and the green-screen map, cached: they only change on resize or theme */
      function rr(g, x, y, w, hh, r, keep) { r = Math.max(0, Math.min(r, w / 2, hh / 2)); if (!keep) g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
      function drawStatic() {
        if (!L || !cv.w) return;
        const w = cv.w, H = cv.h, d = cv.dpr, dark = K.dark(), m = L.map;
        bg.width = Math.round(w * d); bg.height = Math.round(H * d);
        const g = bg.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0);
        const wall = g.createLinearGradient(0, 0, 0, H);
        if (dark) { wall.addColorStop(0, '#0b1433'); wall.addColorStop(0.5, '#131f47'); wall.addColorStop(1, '#070b1d'); }
        else { wall.addColorStop(0, '#d9e3f3'); wall.addColorStop(0.5, '#e8eef8'); wall.addColorStop(1, '#c9d4e6'); }
        g.fillStyle = wall; g.fillRect(0, 0, w, H);
        g.strokeStyle = dark ? 'rgba(160,180,255,0.07)' : 'rgba(40,60,100,0.08)'; g.lineWidth = 1;
        for (let x = 28; x < w; x += 58) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, H); g.stroke(); }
        // studio floor with a soft reflection
        const fy = m.y + m.h * 0.82;
        const fl = g.createLinearGradient(0, fy, 0, H);
        fl.addColorStop(0, dark ? 'rgba(10,16,40,0)' : 'rgba(190,202,222,0)'); fl.addColorStop(0.18, dark ? '#0c1534' : '#cbd5e6'); fl.addColorStop(1, dark ? '#04060f' : '#b3c0d6');
        g.fillStyle = fl; g.fillRect(0, fy, w, H - fy);
        const refl = g.createRadialGradient(m.x + m.w / 2, m.y + m.h + 30, 10, m.x + m.w / 2, m.y + m.h + 30, m.w * 0.55);
        refl.addColorStop(0, dark ? 'rgba(60,200,150,0.16)' : 'rgba(40,160,110,0.12)'); refl.addColorStop(1, 'rgba(60,200,150,0)');
        g.fillStyle = refl; g.fillRect(0, m.y + m.h - 40, w, H - m.y - m.h + 40);
        // lighting truss
        g.fillStyle = dark ? '#1a2342' : '#9aa7bf'; g.fillRect(0, 6, w, 10);
        g.strokeStyle = dark ? 'rgba(140,160,220,0.25)' : 'rgba(60,72,100,0.35)'; g.lineWidth = 1.2;
        g.beginPath(); for (let x = 0; x < w; x += 14) { g.moveTo(x, 6); g.lineTo(x + 7, 16); g.lineTo(x + 14, 6); } g.stroke();
        L.lamps.forEach(lx => { g.fillStyle = dark ? '#252f52' : '#6f7d99'; g.beginPath(); g.moveTo(lx - 10, 14); g.lineTo(lx + 10, 14); g.lineTo(lx + 13, 30); g.lineTo(lx - 13, 30); g.closePath(); g.fill(); });
        // screen glow behind the map
        const halo = g.createRadialGradient(m.x + m.w / 2, m.y + m.h / 2, 10, m.x + m.w / 2, m.y + m.h / 2, Math.max(m.w, m.h) * 0.8);
        halo.addColorStop(0, dark ? 'rgba(50,210,150,0.22)' : 'rgba(40,170,120,0.16)'); halo.addColorStop(1, 'rgba(50,210,150,0)');
        g.fillStyle = halo; g.fillRect(0, 0, w, H);
        // the map: bezel, green screen, weather-map grid, isobars, vignette
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
        g.font = '700 ' + (L.wide ? 22 : 17) + 'px ' + (getComputedStyle(el).fontFamily || 'sans-serif'); g.fillStyle = 'rgba(255,255,255,0.2)'; g.textAlign = 'center';
        g.fillText('H', m.x + m.w * 0.88, m.y + m.h * 0.82); g.fillText('L', m.x + m.w * (L.wide ? 0.3 : 0.86), m.y + m.h * 0.3);
        const sheen = g.createLinearGradient(m.x, m.y, m.x + m.w * 0.6, m.y + m.h);
        sheen.addColorStop(0, 'rgba(255,255,255,0.1)'); sheen.addColorStop(0.45, 'rgba(255,255,255,0)'); g.fillStyle = sheen; g.fillRect(m.x, m.y, m.w, m.h);
        const vg = g.createRadialGradient(m.x + m.w / 2, m.y + m.h / 2, Math.min(m.w, m.h) * 0.35, m.x + m.w / 2, m.y + m.h / 2, Math.max(m.w, m.h) * 0.72);
        vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,18,12,0.38)'); g.fillStyle = vg; g.fillRect(m.x, m.y, m.w, m.h);
        g.restore();
        g.strokeStyle = 'rgba(255,255,255,0.16)'; g.lineWidth = 1; rr(g, m.x + 0.5, m.y + 0.5, m.w - 1, m.h - 1, L.r0); g.stroke();
      }
      cv.onResize(() => layout());
      S.on('theme', () => { el.classList.toggle('wr-bright', !K.dark()); drawStatic(); });

      /* ---------------- weather on the planet ---------------- */
      const SLOTS = [{ x: -0.46, y: -1.16 }, { x: 0.52, y: -1.04 }, { x: 0.04, y: -1.62 }];
      function assignSlots() { let c = 0; items.forEach(it => { it.slot = CLOUDY[it.type] ? c++ : -1; }); }
      const isPlaced = (type) => items.some(i => i.type === type);
      function itemC(it) {
        const r = Pl.r, u = r * it.sd * (0.35 + 0.65 * backOut(Math.min(1, it.pop)));
        let x = Pl.x, y = Pl.y;
        if (it.slot >= 0) { const sl = SLOTS[it.slot % 3]; x += sl.x * r; y += sl.y * r; if (L) y = Math.max(y, L.map.y + 26 + u * 0.8); }
        else if (it.type === 'sun') { x += 0.92 * r; y -= 0.92 * r; }
        else if (it.type === 'heat') { y -= r; }
        if (it.type !== 'sun' && L) x += W.f * L.map.w * 0.55;
        return { x, y, u };
      }
      function originOf(it) { const c = itemC(it); if (it.type === 'fog' || it.type === 'wind') return { x: Pl.x, y: Pl.y }; if (it.type === 'heat') return { x: Pl.x, y: Pl.y - Pl.r }; return { x: c.x, y: c.y }; }
      function handleAt(it) {
        const c = itemC(it), u = c.u, r = Pl.r;
        let x, y;
        if (it.slot >= 0) { const side = SLOTS[it.slot % 3].x < -0.1 ? -1 : 1; if (it.slot === 2) { x = c.x + 0.42 * u; y = c.y - 0.7 * u; } else { x = c.x + side * 0.98 * u; y = c.y + 0.08 * u; } }
        else if (it.type === 'sun') { x = c.x + 0.62 * u; y = c.y - 0.62 * u; }
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
        for (let i = 0; i < n; i++) {
          const bx = c.x + (hs(i + it.seed) - 0.5) * c.u * 1.6, y0 = c.y + c.u * 0.25, y1 = Math.max(y0 + 12, surfY(bx));
          const ph = (t * 0.32 * (0.7 + hs(i * 5.3) * 0.6) + hs(i * 9.1)) % 1, yy = y0 + ph * (y1 - y0), xx = bx + Math.sin(t * 1.4 + i) * c.u * 0.07;
          g.beginPath(); g.arc(xx, yy, 1.4 + hs(i * 2.7) * 1.6, 0, TAU); g.fill();
        }
        g.globalAlpha = 1;
      }
      function bolt(g, it, c, a, t) {
        if (a < 0.62 || inten === 0) { it.bolt = null; return; }
        if (!it.bolt && Math.random() < 0.016 * a * (inten === 2 ? 1.5 : 1)) {
          const pts = [], x0 = c.x + (Math.random() - 0.5) * c.u * 0.6, y0 = c.y + c.u * 0.2, x1 = Pl.x + (Math.random() - 0.5) * Pl.r * 0.8, y1 = surfY(x1);
          for (let i = 0; i <= 6; i++) { const k = i / 6; pts.push({ x: x0 + (x1 - x0) * k + (i && i < 6 ? (Math.random() - 0.5) * c.u * 0.28 : 0), y: y0 + (y1 - y0) * k }); }
          it.bolt = { pts, life: 0.22 };
          if (!K.reduced()) W.flash = Math.max(W.flash, 0.5 * a);
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
        for (let i = 0; i < 12; i++) { g.rotate(TAU / 12); g.beginPath(); g.moveTo(-u * 0.08, -u * 0.6); g.lineTo(u * 0.08, -u * 0.6); g.lineTo(0, -u * 0.98); g.closePath(); g.fill(); }
        g.restore();
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
        const n = inten === 2 ? 5 : 4, segs = 9;
        for (let i = 0; i < n; i++) {
          const rho = Pl.r * (1.16 + i * 0.1) * (0.86 + it.sd * 0.24), sp = (0.9 + i * 0.22) * (0.3 + a * 0.9), th = t * sp + i * 1.7, len = 0.55 + 0.35 * it.sd;
          for (let s = 0; s < segs; s++) {
            const k0 = s / segs, k1 = (s + 1) / segs;
            g.strokeStyle = 'rgba(230,246,255,' + ((1 - k0) * 0.85 * a) + ')'; g.lineWidth = (1 - k0) * 3.4 + 0.4;
            g.beginPath(); g.arc(Pl.x, Pl.y, rho, th - len * k1, th - len * k0); g.stroke();
          }
        }
      }
      function heatAt(g, it, a, t) {
        const u = Pl.r * it.sd, gy = Pl.y - Pl.r * 0.6;
        const hg = g.createRadialGradient(Pl.x, gy, Pl.r * 0.2, Pl.x, gy, Pl.r * 1.7 * it.sd);
        hg.addColorStop(0, 'rgba(255,150,70,' + (0.4 * a) + ')'); hg.addColorStop(1, 'rgba(255,120,60,0)');
        g.fillStyle = hg; g.fillRect(Pl.x - Pl.r * 2.2, gy - Pl.r * 2.2, Pl.r * 4.4, Pl.r * 4.4);
        g.lineWidth = 2.4; g.lineCap = 'round';
        for (let i = 0; i < 5; i++) {
          const x0 = Pl.x + (i - 2) * Pl.r * 0.3, yb = surfY(x0) - 5, ht = u * (0.75 + 0.2 * Math.sin(t * 0.8 + i));
          const lg = g.createLinearGradient(0, yb, 0, yb - ht);
          lg.addColorStop(0, 'rgba(255,' + (120 + i * 18) + ',70,' + (0.85 * a) + ')'); lg.addColorStop(1, 'rgba(255,170,90,0)');
          g.strokeStyle = lg; g.beginPath();
          for (let k = 0; k <= 16; k++) { const yy = yb - (k / 16) * ht, xx = x0 + Math.sin(k * 0.9 - t * 4 * (0.4 + 0.6 * a) + i) * u * 0.07; if (!k) g.moveTo(xx, yy); else g.lineTo(xx, yy); }
          g.stroke();
        }
      }
      function drawPlanet(g, t) {
        const x = Pl.x, y = Pl.y, r = Pl.r;
        const ag = g.createRadialGradient(x, y, r * 0.9, x, y, r * 1.38);
        ag.addColorStop(0, 'rgba(150,225,255,' + (0.42 + W.warm * 0.2) + ')'); ag.addColorStop(1, 'rgba(150,225,255,0)');
        g.fillStyle = ag; g.beginPath(); g.arc(x, y, r * 1.38, 0, TAU); g.fill();
        const og = g.createRadialGradient(x - r * 0.35, y - r * 0.42, r * 0.08, x, y, r);
        og.addColorStop(0, '#8ad9ff'); og.addColorStop(0.55, '#2f88d8'); og.addColorStop(1, '#16408f');
        g.fillStyle = og; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
        g.save(); g.beginPath(); g.arc(x, y, r, 0, TAU); g.clip();
        const lands = [[-0.36, -0.12, 0.4, 0.27, 0.4], [0.38, 0.28, 0.33, 0.22, -0.3], [0.02, 0.66, 0.46, 0.17, 0.1], [0.56, -0.46, 0.2, 0.12, 0.6], [-0.62, 0.42, 0.18, 0.12, -0.5]];
        g.fillStyle = '#5ccf84'; lands.forEach(b => { g.beginPath(); g.ellipse(x + b[0] * r, y + b[1] * r, b[2] * r, b[3] * r, b[4], 0, TAU); g.fill(); });
        g.fillStyle = 'rgba(30,110,70,0.45)'; lands.forEach(b => { g.beginPath(); g.ellipse(x + b[0] * r + b[2] * r * 0.25, y + b[1] * r + b[3] * r * 0.3, b[2] * r * 0.6, b[3] * r * 0.55, b[4], 0, TAU); g.fill(); });
        // the weather tints the little world itself
        let wet = 0, hot = 0, grey = 0, snowcap = 0;
        items.forEach(it => { const a = alphaOf(it); if (it.type === 'rain' || it.type === 'storm') wet += 0.22 * a * it.sd; if (it.type === 'heat') hot += 0.3 * a * it.sd; if (it.type === 'fog' || it.type === 'cloud') grey += 0.16 * a; if (it.type === 'snow') snowcap = Math.max(snowcap, a * it.sd); });
        if (wet) { g.fillStyle = 'rgba(10,30,70,' + Math.min(0.45, wet) + ')'; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
        if (hot) { g.fillStyle = 'rgba(255,110,50,' + Math.min(0.4, hot) + ')'; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
        if (grey) { g.fillStyle = 'rgba(160,170,185,' + Math.min(0.35, grey) + ')'; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
        if (snowcap > 0.02) { g.fillStyle = 'rgba(250,253,255,' + Math.min(0.95, snowcap) + ')'; g.beginPath(); g.ellipse(x, y - r * 0.98, r * 0.8 * Math.min(1.2, snowcap + 0.2), r * 0.36 * Math.min(1.2, snowcap + 0.2), 0, 0, TAU); g.fill(); }
        const sg = g.createRadialGradient(x - r * 0.45, y - r * 0.5, r * 0.2, x - r * 0.1, y - r * 0.1, r * 1.25);
        sg.addColorStop(0, 'rgba(255,255,255,0.16)'); sg.addColorStop(0.55, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(5,10,40,0.55)');
        g.fillStyle = sg; g.fillRect(x - r, y - r, 2 * r, 2 * r);
        g.restore();
        g.strokeStyle = 'rgba(210,244,255,0.6)'; g.lineWidth = 1.6; g.beginPath(); g.arc(x, y, r - 0.8, Math.PI * 1.05, Math.PI * 1.62); g.stroke();
        // a tiny home and tree on top: this is your world
        const glow = 0.55 + 0.45 * Math.max(W.warm, ss(0.6, 1, W.f));
        [[-1.82, 'house'], [-1.2, 'tree']].forEach(([ang, kind]) => {
          g.save(); g.translate(x + Math.cos(ang) * r, y + Math.sin(ang) * r); g.rotate(ang + Math.PI / 2);
          const u = r * 0.2;
          if (kind === 'house') {
            g.fillStyle = '#f6e8d2'; g.fillRect(-u * 0.6, -u * 0.95, u * 1.2, u * 1.0);
            g.fillStyle = '#d4553f'; g.beginPath(); g.moveTo(-u * 0.78, -u * 0.9); g.lineTo(0, -u * 1.55); g.lineTo(u * 0.78, -u * 0.9); g.closePath(); g.fill();
            const wg = g.createRadialGradient(u * 0.2, -u * 0.55, 0, u * 0.2, -u * 0.55, u * 0.9);
            wg.addColorStop(0, 'rgba(255,214,110,' + (0.55 * glow) + ')'); wg.addColorStop(1, 'rgba(255,214,110,0)');
            g.fillStyle = wg; g.fillRect(-u, -u * 1.5, u * 2.4, u * 2);
            g.fillStyle = '#ffd36b'; g.fillRect(u * 0.08, -u * 0.72, u * 0.32, u * 0.3);
            g.fillStyle = '#8a5a3a'; g.fillRect(-u * 0.4, -u * 0.5, u * 0.28, u * 0.55);
          } else {
            g.fillStyle = '#7a5032'; g.fillRect(-u * 0.09, -u * 0.75, u * 0.18, u * 0.8);
            g.fillStyle = '#3caf63'; g.beginPath(); g.arc(0, -u * 1.05, u * 0.48, 0, TAU); g.fill();
            g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.arc(-u * 0.15, -u * 1.2, u * 0.2, 0, TAU); g.fill();
          }
          g.restore();
        });
      }
      function rainbowAt(g) {
        if (W.rainbow <= 0) return;
        const cols = ['#ff5f6d', '#ff9f43', '#ffd93d', '#6bd56b', '#4db5ff', '#6f78ff', '#b07bff'];
        const R0 = Pl.r * 1.86, bw = Math.max(4, Pl.r * 0.08), cy = Pl.y + Pl.r * 0.4, k = K.ease.inOutCubic(W.rainbow);
        g.save(); g.lineCap = 'butt';
        g.globalAlpha = 0.22; g.strokeStyle = '#ffffff'; g.lineWidth = bw * 9; g.beginPath(); g.arc(Pl.x, cy, R0 - bw * 3, Math.PI, Math.PI + Math.PI * k); g.stroke();
        g.globalAlpha = 0.9; cols.forEach((c, i) => { g.strokeStyle = c; g.lineWidth = bw + 0.6; g.beginPath(); g.arc(Pl.x, cy, R0 - i * bw, Math.PI, Math.PI + Math.PI * k); g.stroke(); });
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
          else if (it.type === 'storm') { drops(g, it, c, str, t, true); bolt(g, it, c, a, t); cloudAt(g, c.x, c.y, c.u, a, true); }
        });
      }
      function drawLights(g) {
        const dark = K.dark(), warm = W.warm, H = cv.h;
        const cr = Math.round(170 + 85 * warm), cg = Math.round(198 - 10 * warm), cb = Math.round(255 - 140 * warm);
        g.save(); g.globalCompositeOperation = dark ? 'lighter' : 'source-over';
        L.lamps.forEach(lx => {
          const a = (dark ? 0.06 : 0.07) + warm * 0.07;
          const gr = g.createLinearGradient(lx, 28, lx, H * 0.9);
          gr.addColorStop(0, 'rgba(' + cr + ',' + cg + ',' + cb + ',' + (a * 2.2) + ')'); gr.addColorStop(1, 'rgba(' + cr + ',' + cg + ',' + cb + ',0)');
          g.fillStyle = gr; g.beginPath(); g.moveTo(lx - 9, 28); g.lineTo(lx + 9, 28); g.lineTo(lx + H * 0.16, H * 0.9); g.lineTo(lx - H * 0.16, H * 0.9); g.closePath(); g.fill();
          const lg = g.createRadialGradient(lx, 30, 0, lx, 30, 24 + warm * 10);
          lg.addColorStop(0, 'rgba(' + cr + ',' + cg + ',' + cb + ',0.95)'); lg.addColorStop(1, 'rgba(' + cr + ',' + cg + ',' + cb + ',0)');
          g.fillStyle = lg; g.fillRect(lx - 36, -6, 72, 72);
        });
        g.restore();
        if (warm > 0) { const wg = g.createLinearGradient(0, 0, 0, H); wg.addColorStop(0, 'rgba(255,170,80,' + (0.16 * warm) + ')'); wg.addColorStop(1, 'rgba(255,120,60,' + (0.05 * warm) + ')'); g.fillStyle = wg; g.fillRect(0, 0, cv.w, H); }
      }
      function mapTint(g) {
        const m = L.map;
        let dk = 0, grey = 0, warmT = 0, cold = 0;
        items.forEach(it => { const a = alphaOf(it); if (it.type === 'storm') dk += 0.3 * a * it.sd; if (it.type === 'rain') dk += 0.15 * a * it.sd; if (it.type === 'cloud' || it.type === 'fog') grey += 0.13 * a * it.sd; if (it.type === 'heat') warmT += 0.16 * a * it.sd; if (it.type === 'snow' || it.type === 'wind') cold += 0.1 * a * it.sd; });
        if (dk) { g.fillStyle = 'rgba(6,16,32,' + Math.min(0.42, dk) + ')'; g.fillRect(m.x, m.y, m.w, m.h); }
        if (grey) { g.fillStyle = 'rgba(120,135,150,' + Math.min(0.3, grey) + ')'; g.fillRect(m.x, m.y, m.w, m.h); }
        if (warmT) { g.fillStyle = 'rgba(255,120,50,' + Math.min(0.24, warmT) + ')'; g.fillRect(m.x, m.y, m.w, m.h); }
        if (cold) { g.fillStyle = 'rgba(170,210,255,' + Math.min(0.2, cold) + ')'; g.fillRect(m.x, m.y, m.w, m.h); }
        const sunny = Math.max(ss(0.5, 1, W.f), W.warm);
        if (sunny > 0) {
          const sg = g.createRadialGradient(Pl.x, Pl.y - Pl.r, 10, Pl.x, Pl.y, Math.max(m.w, m.h) * 0.8);
          sg.addColorStop(0, 'rgba(255,238,170,' + (0.42 * sunny) + ')'); sg.addColorStop(1, 'rgba(140,230,180,' + (0.1 * sunny) + ')');
          g.fillStyle = sg; g.fillRect(m.x, m.y, m.w, m.h);
        }
      }

      /* ---------------- sound ---------------- */
      let snd = null, sndT = 0;
      function ensureAudio() {
        if (snd || !A.ctx) return;
        snd = { rain: A.loop({ filter: 'bandpass', freq: 2300, q: 0.55, bus: 'amb' }), wind: A.loop({ pink: true, filter: 'bandpass', freq: 520, q: 1.1, bus: 'amb' }), room: A.loop({ pink: true, filter: 'lowpass', freq: 200, q: 0.4, bus: 'amb' }) };
        S.onDestroy(() => { Object.keys(snd).forEach(k => snd[k] && snd[k].stop()); });
      }
      S.on('audio-ready', ensureAudio);
      function soundLevels(t) {
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
      const TICK_A = ['Inner weather service: all feelings welcome', 'Naming a feeling turns its volume down', 'Feelings are weather, not climate', 'Outlook: changeable, as always'];
      const TICK_B = ['Update: feeling named, intensity easing', 'Precise words, smaller storms', 'Feelings are weather, not climate'];

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
            if (items.length >= 3) { lastPtr = performance.now(); K.sfx.no(); keeper.say(ctx.line(LN.full), { ms: 2400 }); return false; }
            W.drag = { type, hot: false };
            ghost.innerHTML = ICONS[type]; ghost.hidden = false; ghost.classList.remove('fly', 'hot');
            moveGhost(p.x, p.y); b.classList.add('lift'); K.sfx.tap();
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
      let doneBtn = null, placedRow = null;
      function place(type) {
        if (stage !== 1 || isPlaced(type) || items.length >= 3) return;
        const it = { type, s: s0, sd: s0, k: 1, kt: 1, pop: 0, slot: -1, seed: 1 + ORDER.indexOf(type) * 13 + items.length * 7, bolt: null };
        items.push(it); assignSlots();
        tiles[type].setAttribute('aria-pressed', 'true');
        placeSound(type); K.sfx.pop(undefined, 470 + items.length * 90);
        const c = itemC(Object.assign({}, it, { pop: 1 }));
        P.emit('spark', c.x, c.y, 16, { colors: ['#ffffff', '#cfe9ff', '#ffe08a'], speed: [60, 190] });
        keeper.face(FACE[type], 1700);
        keeper.say(ctx.line(items.length === 3 ? LN.full : PLACE[type]), { ms: 2800 });
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
        doneBtn.hidden = !items.length;
        setLT(items.length ? items.map(i => WX[i.type].label).join(' + ') + ' over your planet' : 'What’s the weather like in there?', items.length ? (items.length < 3 ? 'Add up to ' + (3 - items.length) + ' more, or tap when it fits' : 'Full map. Tap when it fits') : 'Live with Sync · your inner planet');
        if (items.length) K.guide({ id: 'place-done', g: 'tap', target: doneBtn, label: 'TAP WHEN IT FITS', delay: 2600 });
        else K.guide({ id: 'place', g: 'drag', dir: 'r', target: tiles[suggest()], d: guideD(tiles[suggest()]), label: 'DRAG ONTO YOUR PLANET', delay: 900 });
      }
      function suggest() { const f = String(an.feeling || '').toLowerCase().trim(); return FEEL[f] && !isPlaced(FEEL[f]) ? FEEL[f] : (isPlaced('storm') ? 'rain' : 'storm'); }
      function guideD(tile) { const r = K.rectIn(tile); return Math.max(60, Math.round(Pl.x - r.cx - 6)); }
      function startStep1() {
        stage = 1;
        pal.classList.add('on');
        tray.textContent = '';
        placedRow = h('div', { class: 'wr-placed', 'aria-label': 'On your map' });
        doneBtn = K.button('That’s my weather', () => { if (stage === 1 && items.length) startStep2(); }, { parent: null, cls: 'wr-go' });
        doneBtn.hidden = true;
        tray.append(h('p', { class: 'wr-hint', text: 'Drag the weather inside you onto your planet. One to three.' }), placedRow, doneBtn);
        keeper.face('E35', 1600);
        keeper.say(ctx.line(LN.step1), { ms: 4200 });
        clickTo({ x: Pl.x, y: Pl.y });
        const tgt = tiles[suggest()];
        K.guide({ id: 'place', g: 'drag', dir: 'r', target: tgt, d: guideD(tgt), label: 'DRAG ONTO YOUR PLANET', delay: 1000 });
      }

      /* ---------------- step 2: size it ---------------- */
      const handles = [];
      let sizeBtn = null;
      const sizeIdx = (s) => (s < 0.8 ? 0 : s < 1.1 ? 1 : s < 1.4 ? 2 : 3);
      const sizeWord = (it) => WX[it.type].sizes[sizeIdx(it.s)];
      const sizeLine = () => items.map(it => WX[it.type].label + ' · ' + sizeWord(it)).join('   ');
      function setSize(it, ns) {
        ns = clamp(ns, 0.5, 1.75);
        const before = sizeIdx(it.s), q0 = Math.round(it.s * 14);
        it.s = ns;
        const hd = handles.find(x => x.it === it);
        if (sizeIdx(ns) !== before) { if (A.ctx) A.pluck(A.note(['C4', 'E4', 'G4', 'C5'][sizeIdx(ns)]), { vol: 0.2, damp: 0.995 }); K.sfx.tap(); if (hd) { hd.tag.textContent = sizeWord(it); hd.el.setAttribute('aria-valuenow', String(sizeIdx(ns) + 1)); hd.el.setAttribute('aria-valuetext', sizeWord(it)); } setLT(sizeLine(), 'Size it: how strong is it right now?'); }
        else if (Math.round(ns * 14) !== q0 && A.ctx) A.wood(undefined, 0.05, 0.7 + ns * 0.4);
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
        tray.textContent = '';
        sizeBtn = K.button('That’s the size', () => { if (stage === 2) startStep3(); }, { cls: 'wr-go' });
        sizeBtn.hidden = true;
        tray.append(h('p', { class: 'wr-hint', text: items.length > 1 ? 'Drag the gold handles: out for bigger, in for smaller.' : 'Drag the gold handle: out for bigger, in for smaller.' }), sizeBtn);
        keeper.face('think', 1800);
        keeper.say(ctx.line(LN.step2), { ms: 3800 });
        clickTo({ x: Pl.tx, y: Pl.ty - Pl.tr });
        setLT(sizeLine(), 'Size it: how strong is it right now?');
        items.forEach(it => {
          const b = h('button', { type: 'button', class: 'wr-handle', role: 'slider', 'aria-label': WX[it.type].label + ' size. Drag, or use the arrow keys.', 'aria-valuemin': '1', 'aria-valuemax': '4', 'aria-valuenow': String(sizeIdx(it.s) + 1), 'aria-valuetext': sizeWord(it), html: RESIZE });
          const tag = h('span', { class: 'wr-tag', text: sizeWord(it) });
          el.append(tag, b);
          let d0 = 1, sStart = 1;
          K.drag(b, {
            space: el,
            start: (p) => { if (stage !== 2) return false; const o = originOf(it); d0 = Math.max(24, Math.hypot(p.x - o.x, p.y - o.y)); sStart = it.s; b.classList.add('on'); K.sfx.tap(); },
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
      function startStep3() {
        stage = 3; K.guide(null);
        handles.forEach(hd => { hd.el.remove(); hd.tag.remove(); }); handles.length = 0;
        const f = String(an.feeling || '').toLowerCase().trim();
        const types = items.map(i => i.type);
        const seedType = FEEL[f] && types.includes(FEEL[f]) ? FEEL[f] : '';
        groups = types.map(tp => { let ws = WX[tp].words.slice(); if (tp === seedType) ws = [f].concat(ws.filter(x => x !== f)); return { type: tp, words: ws.slice(0, 6), seed: tp === seedType ? f : '' }; });
        const first = seedType || items.slice().sort((a, b) => b.s - a.s)[0].type;
        tray.textContent = '';
        tray.append(h('p', { class: 'wr-hint', text: 'Which word fits best? Be precise.' }));
        if (groups.length > 1) {
          tabsEl = h('div', { class: 'wr-tabs', role: 'tablist', 'aria-label': 'Your weather' });
          groups.forEach(gp => { const b = h('button', { type: 'button', class: 'wr-tab', role: 'tab', 'aria-selected': String(gp.type === first), 'data-type': gp.type }, h('span', { class: 'wr-ti', html: ICONS[gp.type] }), WX[gp.type].label); b.addEventListener('click', () => { if (stage !== 3) return; K.sfx.tap(); showGroup(gp.type); }); tabsEl.append(b); });
          tray.append(tabsEl);
        }
        chipHost = h('div', { class: 'wr-chiphost' });
        fcBtn = K.button('On to the forecast', () => { if (stage === 3 && word) startStep4(); }, { cls: 'wr-go' });
        fcBtn.hidden = true;
        tray.append(chipHost, fcBtn);
        keeper.face('idea', 1800);
        keeper.say(ctx.line(LN.step3), { ms: 4200 });
        clickTo({ x: Pl.x, y: Pl.y - Pl.r * 1.2 });
        setLT('Name it exactly', 'A precise name turns the volume down');
        showGroup(first);
      }
      function showGroup(tp) {
        if (tabsEl) tabsEl.querySelectorAll('.wr-tab').forEach(b => b.setAttribute('aria-selected', String(b.getAttribute('data-type') === tp)));
        if (chipsWrap) chipsWrap.remove();
        const gp = groups.find(x => x.type === tp);
        chipsWrap = K.chips(chipHost, gp.words.map(wd => ({ id: wd, label: wd, user: wd === gp.seed })), (item) => pickWord(item.id, tp), { label: WX[tp].label + ' words', cls: 'wr-chips' });
        chipsWrap.querySelectorAll('button').forEach(b => { if (b.getAttribute('data-id') === gp.seed) { b.classList.add('wr-seed'); b.title = 'From what you wrote'; } if (word && b.getAttribute('data-id') === word) b.setAttribute('aria-pressed', 'true'); });
        if (!word) K.guide({ id: 'name', g: 'choose', target: () => Array.from(chipsWrap.querySelectorAll('button')), label: 'NAME IT EXACTLY', delay: 900 });
      }
      function pickWord(wd, tp) {
        if (stage !== 3) return;
        const first = !word;
        if (word === wd) return;
        word = wd; wordType = tp;
        if (tabsEl) groups.forEach(gp => { if (gp.type !== tp) { /* single choice across groups */ } });
        items.forEach(it => { it.kt = it.type === tp ? 0.42 : Math.min(it.kt, 0.8); });
        const it = items.find(i => i.type === tp), c = itemC(it);
        P.emit('star', c.x, c.y, 18, { colors: ['#fffbe6', '#ffe58a', '#cfefff'] });
        P.emit('spark', c.x, c.y, 14, { colors: ['#ffffff', '#ffe08a'] });
        K.sfx.sparkle(); K.sfx.great();
        K.pop('Named it', { x: clamp(c.x, 90, L.w - 90), y: clamp(c.y - c.u * 0.7, L.map.y + 30, L.map.y + L.map.h - 40), kind: 'great' });
        setLT([wordSpan(wd), ' · ' + WX[tp].fc], 'Named. A precise name turns the volume down');
        ctx.track('named', { type: tp, n: wd.length });
        if (first) {
          keeper.face('wow', 1300); S.later(() => keeper.base('calm'), 1300);
          keeper.say(ctx.line(LN.named), { ms: 3600 });
          tickerSet(TICK_B);
          fcBtn.hidden = false;
          K.guide({ id: 'name-done', g: 'tap', target: fcBtn, label: 'ON TO THE FORECAST', delay: 2200 });
        } else keeper.face('happy', 900);
      }

      /* ---------------- step 4: the forecast ---------------- */
      let time = null, knob = null, fill = null, labs = [];
      function startStep4() {
        stage = 4; K.guide(null);
        tray.textContent = '';
        time = h('div', { class: 'wr-time', role: 'slider', tabindex: '0', 'aria-label': 'Forecast. Slide from now to tomorrow.', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0', 'aria-valuetext': 'Now' });
        const track = h('div', { class: 'wr-track' });
        time.append(track);
        labs = [['Now', 0], ['Later today', 0.5], ['Tomorrow', 1]].map(([t, f], i) => {
          const dot = h('span', { class: 'wr-stop' }), lab = h('span', { class: 'wr-stoplab' + (i === 0 ? ' first here' : i === 2 ? ' last' : ''), text: t });
          time.append(dot, lab);
          return { dot, lab, f };
        });
        knob = h('div', { class: 'wr-knob', html: CLOCK });
        time.append(knob);
        tray.append(h('p', { class: 'wr-hint', text: 'Slide the forecast forward and watch it move through.' }), time);
        placeStops();
        K.drag(time, {
          start: (p) => { if (stage !== 4) return false; setF(xToF(p.x)); K.sfx.tap(); },
          move: (p) => { if (stage === 4) setF(xToF(p.x)); },
          end: () => { if (stage === 4 && W.ft < 0.97) K.guide({ id: 'fc-more', g: 'drag', dir: 'r', target: knob, d: Math.max(50, Math.round((1 - W.ft) * trackW())), label: 'ALL THE WAY TO TOMORROW', delay: 1600 }); }
        });
        keeper.face('happy', 1500);
        keeper.say(ctx.line(LN.step4), { ms: 3600 });
        clickTo({ x: Pl.x + L.map.w * 0.25, y: Pl.y - Pl.r });
        setLT([wordSpan(word), ' · ' + WX[wordType].fc], 'Forecast: now, later today, tomorrow');
        const core = an.core && an.core.label ? an.core.label : '';
        tickerSet(core ? [{ pre: 'Also passing through: ', user: core }, 'Every weather system moves on', 'Feelings are weather, not climate'] : ['Every weather system moves on', 'Feelings are weather, not climate']);
        K.guide({ id: 'fc', g: 'drag', dir: 'r', target: knob, d: Math.round(trackW() - 10), label: 'SLIDE TO TOMORROW', delay: 1000 });
      }
      const trackW = () => (time ? time.clientWidth - 56 : 200);
      const xToF = (x) => clamp((x - 28) / Math.max(40, trackW()), 0, 1);
      function placeStops() { const tw = trackW(); labs.forEach(s => { s.dot.style.left = (28 + s.f * tw) + 'px'; if (!s.lab.classList.contains('first') && !s.lab.classList.contains('last')) s.lab.style.left = (28 + s.f * tw) + 'px'; }); }
      function setF(f) {
        const prev = W.ft; W.ft = f;
        knob.style.setProperty('--x', (f * trackW()) + 'px');
        const zone = f < 0.3 ? 0 : f < 0.8 ? 1 : 2;
        labs.forEach((s, i) => s.lab.classList.toggle('here', i === zone));
        time.setAttribute('aria-valuenow', String(Math.round(f * 100))); time.setAttribute('aria-valuetext', labs[zone].lab.textContent);
        [0.5, 0.98].forEach((m, i) => { if ((prev < m) !== (f < m)) { if (A.ctx) A.wood(undefined, 0.14, 1 + i * 0.3); K.sfx.chime(i + 3); } });
        if (!laterSaid && f >= 0.5) { laterSaid = true; keeper.say(ctx.line(LN.later), { ms: 2600 }); keeper.face('wow', 900); clickTo({ x: Pl.x + L.map.w * 0.2, y: Pl.y - Pl.r * 1.3 }); }
        if (f >= 0.98) setLT([wordSpan(word), ' · ' + WX[wordType].fc + ' · ' + WX[wordType].clear], 'Forecast: now, later today, tomorrow');
      }
      K.onKey(['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'], (e) => {
        const up = e.key === 'ArrowRight' || e.key === 'ArrowUp';
        if (stage === 4 && time) { e.preventDefault(); setF(clamp(W.ft + (up ? 0.1 : -0.1), 0, 1)); }
        else if (stage === 2 && items.length) { e.preventDefault(); const it = W.focusIt && items.includes(W.focusIt) ? W.focusIt : items[0]; setSize(it, it.s + (up ? 0.1 : -0.1)); sized(); }
      });

      /* ---------------- finale ---------------- */
      async function finale() {
        if (stage === 5) return;
        stage = 5; K.guide(null);
        W.ft = 1; W.finT = W.t;
        tray.classList.add('gone');
        items.forEach(it => { if (it.type === 'sun') it.kt = 1; });
        const fcText = WX[wordType].fc + ' · ' + WX[wordType].clear;
        setLT([wordSpan(word), ' · ' + fcText], 'Feelings are weather. They move through.', 'Your forecast');
        keeper.base('E98');
        keeper.say(ctx.line(LN.fin).replace('{w}', word).replace('{W}', cap(word)), { ms: 0 });
        tickerSet(['That’s the weather. Back to you.', 'Feelings are weather, not climate']);
        music.level(0.85);
        K.sfx.whoosh();
        if (A.ctx) ['C5', 'E5', 'G5', 'B5', 'D6', 'E6', 'G6'].forEach((nt, i) => A.chime(A.note(nt), { when: A.now() + 0.15 + i * 0.2, vol: 0.06, dur: 1.8 }));
        P.emit('star', Pl.x, Pl.y - Pl.r * 1.5, 24, { colors: ['#fffbe6', '#ffe58a', '#ffd1f0', '#cfefff'] });
        const cols = ['#ff5f6d', '#ffb347', '#ffd93d', '#6bd56b', '#4db5ff', '#b07bff'];
        if (inten === 2) K.finale('confetti', { from: [{ x: Pl.x, y: Pl.y - Pl.r }], colors: cols, sound: false, ms: 3200 });
        await K.finale('stars', { colors: cols, chord: ['F4', 'A4', 'C5', 'E5'], ms: 4600 });
        finished = true;
        const main = items.slice().sort((a, b) => b.s - a.s)[0];
        ctx.finish({
          title: cap(word) + ', passing through', mood: 'E98',
          lines: ['Named it: ' + word, WX[main.type].label + ' (' + sizeWord(main) + ') → ' + WX[wordType].fc, 'Forecast: ' + WX[wordType].clear],
          share: 'Mapped my inner weather, named it, and forecast it through.'
        });
      }

      /* ---------------- render ---------------- */
      K.loop((dt, t) => {
        const g = cv.g; if (!g || !L) return;
        W.t = t;
        const pk = Math.min(1, dt * 3.2);
        Pl.x += (Pl.tx - Pl.x) * pk; Pl.y += (Pl.ty - Pl.y) * pk; Pl.r += (Pl.tr - Pl.r) * pk;
        W.f += (W.ft - W.f) * Math.min(1, dt * 2.4);
        if (stage === 5) { W.rainbow = Math.min(1, (t - W.finT) / 1.9); W.warm = Math.min(1, (t - W.finT) / 2.6); }
        items.forEach(it => { it.sd += (it.s - it.sd) * Math.min(1, dt * 9); it.k += (it.kt - it.k) * Math.min(1, dt * 1.8); it.pop = Math.min(1.2, it.pop + dt * 2.4); });
        const w = cv.w, H = cv.h, m = L.map;
        g.drawImage(bg, 0, 0, w, H);
        drawLights(g);
        g.save(); rr(g, m.x, m.y, m.w, m.h, L.r0); g.clip();
        mapTint(g);
        rainbowAt(g);
        drawItems(g, t, true);
        if (!items.some(i => i.type === 'sun')) { const a = ss(0.5, 0.95, W.f); if (a > 0) sunAt(g, Pl.x - 0.98 * Pl.r, Pl.y - 0.95 * Pl.r + (1 - a) * Pl.r * 0.7, Pl.r * 0.95, a, t); }
        drawPlanet(g, t);
        drawItems(g, t, false);
        if (W.drag || W.flying) {
          const hot = W.drag && W.drag.hot, pulse = 0.5 + 0.5 * Math.sin(t * 6);
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
        // live DOM: caption under the planet, size handles and tags, the map clock
        caption.style.left = Pl.x + 'px'; caption.style.top = (Pl.y + Pl.r + 12) + 'px';
        caption.style.opacity = stage >= 5 ? '0' : '0.92';
        handles.forEach(hd => { const p = handleAt(hd.it); hd.el.style.left = p.x + 'px'; hd.el.style.top = p.y + 'px'; hd.tag.style.left = p.x + 'px'; hd.tag.style.top = (p.y + 30) + 'px'; });
        const clk = W.f < 0.3 ? 'Now' : W.f < 0.8 ? 'Later today' : 'Tomorrow';
        if (clockEl.textContent !== clk) clockEl.textContent = clk;
        soundLevels(t);
        if (stage === 4 && W.ft >= 0.98 && W.f >= 0.95) finale();
      });

      /* ---------------- start ---------------- */
      (async () => {
        await K.intro({ title: 'Weather Report', sub: 'Tonight’s forecast comes from inside you. Map it, size it, name it, then watch it move through.', how: 'Drag weather onto your planet, size it, name it exactly, then slide the forecast to tomorrow.', char: 'sync', mood: 'E65' });
        ensureAudio(); sting();
        lower.classList.add('on'); K.sfx.whoosh();
        setLT('What’s the weather like in there?', 'Live with Sync · your inner planet');
        tickerSet(TICK_A);
        keeper.base('happy');
        clickTo({ x: Pl.x, y: Pl.y });
        await keeper.say(ctx.line(LN.intro), { ms: 3600 });
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
          await wait(1200);
          while (!sizeBtn || sizeBtn.hidden) await wait(100);
          await K.sim.tap(sizeBtn);
          while (stage !== 3) await wait(100);
          await wait(1800);
          await K.sim.tap(chipsWrap.querySelector('button'));
          await wait(2600);
          await K.sim.tap(fcBtn);
          while (stage !== 4) await wait(100);
          await wait(1400);
          const tw = trackW(), th = time.clientHeight / 2 + 0;
          await K.sim.drag(time, { x: 28, y: 41 }, { x: 28 + tw * 0.52, y: 41 }, 1700, 24);
          await wait(1800);
          await K.sim.drag(time, { x: 28 + tw * 0.52, y: 41 }, { x: 28 + tw + 4, y: 41 }, 1700, 24);
          void th;
          while (!finished) await wait(200);
        }
      };
    }
  });
})(window.TSG_ENV);
