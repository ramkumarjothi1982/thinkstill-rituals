/* 019 Night Shift — Reframe · REFRAME · Sleep / Winding Down
 * Mechanism: night-time thinking is more catastrophic: tiredness and darkness amplify threat (the "3 a.m." effect; Harvey
 * 2002, a cognitive model of insomnia). Seeing the same thought by daylight, naming the hour's bias, then postponing the
 * worry to a set daylight time (worry postponement and stimulus control, Borkovec et al. 1983; McGowan & Behar 2013)
 * reduces night rumination. The shadow is real geometry: a small object on the desk lit by the phone's glow from a few
 * centimetres away throws a monster on the wall; as the light moves out to the morning sun, the same shape shrinks to size.
 * Verb: scrub (drag the sun up the window from 3 a.m. to 10 a.m., then back); fold a note; hold to seal it with wax; set it
 * where the 10 a.m. sun will land.
 * Finale: night again but calm: tonight's real moon in the window, a tiny true-size shadow in the moonlight, stars, and the
 * sealed note waiting in its sunny spot: "The worry has an appointment tomorrow. You can sleep."
 */
(function (env) {
  'use strict';

  /* ---------------- the Shadow Museum: small objects that throw big shadows ----------------
   * Units: centimetres. Origin: the middle of the object's footprint on the desk; x right, y up, z towards the light.
   * parts: the object (drawn in the room and cast as a shadow). beast: what the night calls it.
   * extra: shadow-only shapes the tired brain adds at night. eyes: where the shadow seems to look from. mouth: a slit of light that shows through the shadow at night. */
  const OBJECTS = [
    { id: 'sock', name: 'a sock on a bottle', beast: 'The Sock Beast', h: 22,
      parts: [
        { t: 'rr', x: -3.2, y: 0, w: 6.4, h: 15, r: 1.6, z: 0, col: '#9ccfd4' },
        { t: 'poly', pts: [[-3.2, 14.9], [3.2, 14.9], [1.4, 17.6], [-1.4, 17.6]], z: 0, col: '#9ccfd4' },
        { t: 'rr', x: -1.4, y: 17.4, w: 2.8, h: 2.6, r: 0.5, z: 0, col: '#9ccfd4' },
        { t: 'rr', x: -1.7, y: 19.8, w: 3.4, h: 1.8, r: 0.6, z: 0, col: '#3a6fc4' },
        { t: 'poly', pts: [[-2.0, 19.6], [2.0, 19.6], [2.7, 16.4], [3.5, 11.5], [4.3, 8.6], [6.7, 7.4], [9.7, 7.2], [11.1, 6.0], [10.9, 4.3], [9.4, 3.5], [5.6, 3.7], [3.0, 5.6], [1.8, 9.6], [0.6, 14.4], [-2.2, 16.6]], z: 1.6, col: '#e2604c' },
        { t: 'poly', pts: [[-2.1, 18.5], [2.2, 18.5], [2.45, 17.2], [-2.25, 17.0]], z: 1.6, col: '#fff3e6' },
        { t: 'ell', x: 4.5, y: 6.6, rx: 1.7, ry: 1.3, z: 1.9, col: '#ffd166' },
        { t: 'ell', x: 9.8, y: 5.3, rx: 2.0, ry: 1.6, z: 2.7, col: '#ffd166' }
      ],
      extra: [
        { t: 'poly', pts: [[5.3, 4.1], [6.1, 1.6], [6.9, 3.9], [7.6, 1.4], [8.3, 3.8], [9.0, 1.7], [9.7, 3.9]], z: 2.3 },
        { t: 'poly', pts: [[-2.0, 19.5], [-1.5, 22.6], [-0.8, 19.7], [0.0, 23.4], [0.8, 19.7], [1.5, 22.4], [2.0, 19.5]], z: 1.6 },
        { t: 'poly', pts: [[10.8, 6.1], [13.6, 7.7], [11.4, 5.1]], z: 2.7 }
      ],
      eyes: [[4.0, 9.0], [5.7, 8.7]], ez: 2.0, er: 0.5, mouth: [[5.8, 4.6], [9.2, 4.4], [9.0, 5.1], [6.0, 5.3]], mz: 2.3 },
    { id: 'lamp', name: 'a desk lamp', beast: 'The Long-Necked Thing', h: 33,
      parts: [
        { t: 'ell', x: 0, y: 0.9, rx: 6, ry: 1.5, z: 0, col: '#3b3f4c' },
        { t: 'line', pts: [[0, 1.5], [-5.5, 17]], w: 1.3, z: 0.6, col: '#4a4f5e' },
        { t: 'line', pts: [[-5.5, 17], [5.5, 28]], w: 1.3, z: 2.0, col: '#4a4f5e' },
        { t: 'ell', x: -5.5, y: 17, rx: 1.3, ry: 1.3, z: 1.2, col: '#2b2f3a' },
        { t: 'poly', pts: [[3.2, 29.6], [10.8, 32.4], [14.2, 25.6], [7.6, 23.6]], z: 3.0, col: '#e2b13c' },
        { t: 'ell', x: 11.0, y: 24.6, rx: 3.6, ry: 1.2, rot: 0.3, z: 3.0, col: '#fff1c4' }
      ],
      extra: [
        { t: 'poly', pts: [[7.6, 23.7], [8.4, 21.0], [9.3, 23.9], [10.2, 21.0], [11.1, 24.3], [12.0, 21.6], [12.9, 24.8], [13.6, 22.4], [14.2, 25.6]], z: 3.0 },
        { t: 'poly', pts: [[-3.2, 9.0], [-5.6, 9.6], [-3.7, 10.6]], z: 0.6 }, { t: 'poly', pts: [[-4.2, 13.0], [-6.8, 13.8], [-4.7, 14.6]], z: 0.6 },
        { t: 'poly', pts: [[-2.6, 20.0], [-4.0, 22.6], [-1.8, 21.2]], z: 2 }, { t: 'poly', pts: [[0.2, 22.8], [-0.8, 25.4], [1.1, 23.8]], z: 2 }
      ],
      eyes: [[7.2, 28.2], [9.6, 28.9]], ez: 3.2, er: 0.55, mouth: [[8.2, 24.6], [13.2, 26.0], [13.0, 26.6], [8.0, 25.3]], mz: 3.1 },
    { id: 'cactus', name: 'a cactus', beast: 'The Spiky Giant', h: 24,
      parts: [
        { t: 'poly', pts: [[-4.4, 0], [4.4, 0], [5.4, 7], [-5.4, 7]], z: 0, col: '#c96b3c' },
        { t: 'rr', x: -5.9, y: 6.6, w: 11.8, h: 1.8, r: 0.6, z: 0.2, col: '#d9814f' },
        { t: 'ell', x: 0, y: 15, rx: 3.6, ry: 7.8, z: 0.8, col: '#5f9e57' },
        { t: 'ell', x: -4.8, y: 14.2, rx: 1.4, ry: 3.3, z: 1.6, col: '#5f9e57' },
        { t: 'rr', x: -4.8, y: 11.2, w: 3.6, h: 1.6, r: 0.8, z: 1.2, col: '#5f9e57' },
        { t: 'ell', x: 4.8, y: 16.6, rx: 1.4, ry: 3.6, z: 1.6, col: '#5f9e57' },
        { t: 'rr', x: 1.2, y: 13.0, w: 3.8, h: 1.6, r: 0.8, z: 1.2, col: '#5f9e57' },
        { t: 'ell', x: 0, y: 23.0, rx: 1.1, ry: 0.8, z: 0.8, col: '#ff8fb1' }
      ],
      extra: [
        { t: 'poly', pts: [[-3.4, 18.0], [-6.8, 20.4], [-3.2, 19.4]], z: 0.9 }, { t: 'poly', pts: [[3.4, 19.0], [6.4, 22.2], [3.0, 20.2]], z: 0.9 },
        { t: 'poly', pts: [[-1.2, 22.2], [-2.0, 26.6], [-0.2, 22.6]], z: 0.9 }, { t: 'poly', pts: [[1.0, 22.2], [2.4, 26.2], [0.2, 22.6]], z: 0.9 },
        { t: 'poly', pts: [[-5.8, 16.6], [-8.6, 19.0], [-5.2, 17.4]], z: 1.7 }, { t: 'poly', pts: [[5.8, 19.4], [8.6, 22.4], [5.2, 20.0]], z: 1.7 },
        { t: 'poly', pts: [[-3.5, 11.0], [-7.0, 9.6], [-3.6, 12.0]], z: 0.9 }, { t: 'poly', pts: [[3.5, 10.0], [7.2, 8.4], [3.6, 11.0]], z: 0.9 }
      ],
      eyes: [[-1.4, 17.4], [1.4, 17.6]], ez: 1.0, er: 0.5, mouth: [[-2.0, 13.4], [2.0, 13.6], [1.6, 14.2], [-1.7, 14.1]], mz: 0.9 },
    { id: 'teddy', name: 'a teddy bear', beast: 'The Midnight Bear', h: 23,
      parts: [
        { t: 'ell', x: 0, y: 7, rx: 6, ry: 7, z: 0, col: '#b07a4a' },
        { t: 'ell', x: -3.6, y: 20.4, rx: 1.9, ry: 1.9, z: 0.4, col: '#b07a4a' }, { t: 'ell', x: 3.6, y: 20.4, rx: 1.9, ry: 1.9, z: 0.4, col: '#b07a4a' },
        { t: 'ell', x: 0, y: 16.4, rx: 5, ry: 4.8, z: 0.8, col: '#b07a4a' },
        { t: 'ell', x: -5.8, y: 8.4, rx: 1.8, ry: 3.4, rot: 0.4, z: 1.4, col: '#a06a3c' }, { t: 'ell', x: 5.8, y: 8.4, rx: 1.8, ry: 3.4, rot: -0.4, z: 1.4, col: '#a06a3c' },
        { t: 'ell', x: -3.4, y: 1.6, rx: 2.6, ry: 1.9, z: 2.4, col: '#a06a3c' }, { t: 'ell', x: 3.4, y: 1.6, rx: 2.6, ry: 1.9, z: 2.4, col: '#a06a3c' },
        { t: 'ell', x: 0, y: 15.0, rx: 2.1, ry: 1.6, z: 1.6, col: '#e8c9a0' }, { t: 'ell', x: 0, y: 15.8, rx: 0.8, ry: 0.55, z: 1.7, col: '#3a2418' }
      ],
      extra: [
        { t: 'poly', pts: [[-7.0, 5.6], [-8.8, 4.0], [-7.2, 6.6], [-9.0, 6.0], [-7.4, 7.6]], z: 1.5 }, { t: 'poly', pts: [[7.0, 5.6], [8.8, 4.0], [7.2, 6.6], [9.0, 6.0], [7.4, 7.6]], z: 1.5 },
        { t: 'poly', pts: [[-1.6, 13.8], [-1.2, 12.2], [-0.6, 13.6], [0, 11.8], [0.6, 13.6], [1.2, 12.2], [1.6, 13.8]], z: 1.7 },
        { t: 'poly', pts: [[-5.0, 22.0], [-6.0, 24.6], [-3.4, 22.4]], z: 0.5 }, { t: 'poly', pts: [[5.0, 22.0], [6.0, 24.6], [3.4, 22.4]], z: 0.5 }
      ],
      eyes: [[-1.9, 17.6], [1.9, 17.6]], ez: 1.2, er: 0.55, mouth: [[-1.5, 13.4], [1.5, 13.4], [1.2, 14.0], [-1.2, 14.0]], mz: 1.8 },
    { id: 'headphones', name: 'a pair of headphones', beast: 'The Antlered Elk', h: 27,
      parts: [
        { t: 'ell', x: 0, y: 0.7, rx: 4.2, ry: 1.2, z: 0, col: '#2b2f3a' },
        { t: 'rr', x: -0.7, y: 0.5, w: 1.4, h: 19.5, r: 0.5, z: 0, col: '#3a3f4c' },
        { t: 'arc', x: 0, y: 19.0, rad: 6.2, a0: 3.4, a1: 6.03, w: 1.5, z: 0.5, col: '#2b2f3a' },
        { t: 'ell', x: -6.0, y: 15.0, rx: 2.2, ry: 3.2, z: 1.8, col: '#2b2f3a' }, { t: 'ell', x: 6.0, y: 15.0, rx: 2.2, ry: 3.2, z: -0.6, col: '#2b2f3a' },
        { t: 'ell', x: -6.0, y: 15.0, rx: 1.2, ry: 2.0, z: 1.9, col: '#e5484d' }
      ],
      extra: [
        { t: 'line', pts: [[-3.4, 24.0], [-6.0, 28.6], [-9.2, 30.0]], w: 0.9, z: 0.8 }, { t: 'line', pts: [[-6.0, 28.6], [-5.6, 32.4]], w: 0.8, z: 0.8 },
        { t: 'line', pts: [[3.4, 24.0], [6.0, 28.6], [9.2, 30.0]], w: 0.9, z: 0.8 }, { t: 'line', pts: [[6.0, 28.6], [5.6, 32.4]], w: 0.8, z: 0.8 },
        { t: 'line', pts: [[-1.2, 25.0], [-1.8, 28.6]], w: 0.7, z: 0.8 }, { t: 'line', pts: [[1.2, 25.0], [1.8, 28.6]], w: 0.7, z: 0.8 }
      ],
      eyes: [[-1.6, 19.6], [1.6, 19.6]], ez: 0.8, er: 0.5, mouth: [[-1.4, 16.6], [1.4, 16.6], [1.0, 17.1], [-1.0, 17.1]], mz: 0.8 },
    { id: 'plant', name: 'a houseplant', beast: 'The Many-Handed', h: 33,
      parts: [
        { t: 'rr', x: -5, y: 0, w: 10, h: 9, r: 1.6, z: 0, col: '#e9e2d6' },
        { t: 'line', pts: [[0, 8.5], [-5.5, 21]], w: 0.7, z: 1, col: '#4c7a3e' }, { t: 'line', pts: [[0, 8.5], [5.5, 25]], w: 0.7, z: 1.6, col: '#4c7a3e' },
        { t: 'line', pts: [[0, 8.5], [0, 29]], w: 0.7, z: 0.6, col: '#4c7a3e' }, { t: 'line', pts: [[0, 8.5], [-3, 14.5]], w: 0.7, z: 2.2, col: '#4c7a3e' },
        { t: 'ell', x: -6.2, y: 22, rx: 6, ry: 3.9, rot: -0.5, z: 1.0, col: '#3f8a4f' }, { t: 'ell', x: 6.4, y: 26, rx: 6.4, ry: 4.1, rot: 0.45, z: 1.6, col: '#3f8a4f' },
        { t: 'ell', x: 0, y: 30.6, rx: 4.8, ry: 3.4, z: 0.6, col: '#48975a' }, { t: 'ell', x: -3.6, y: 15.2, rx: 4.4, ry: 2.8, rot: -0.9, z: 2.2, col: '#48975a' }
      ],
      extra: [
        { t: 'poly', pts: [[-11.4, 24.6], [-14.6, 26.8], [-11.6, 25.8], [-14.2, 28.8], [-11.0, 26.8], [-12.4, 30.0], [-10.2, 27.0]], z: 1.0 },
        { t: 'poly', pts: [[11.8, 29.0], [15.2, 30.8], [12.2, 30.2], [14.8, 33.0], [11.6, 31.0], [12.6, 34.0], [10.8, 31.2]], z: 1.6 },
        { t: 'poly', pts: [[-1.6, 33.6], [-2.6, 37.0], [-0.6, 34.2], [0.6, 37.6], [0.6, 34.2], [2.6, 36.8], [1.6, 33.6]], z: 0.6 }
      ],
      eyes: [[-1.4, 27.0], [1.4, 27.2]], ez: 1.2, er: 0.55, mouth: [[-1.6, 24.2], [1.6, 24.4], [1.3, 25.0], [-1.3, 24.9]], mz: 1.2 },
    { id: 'duck', name: 'a rubber duck', beast: 'The Bathtub Dragon', h: 13,
      parts: [
        { t: 'ell', x: 0, y: 4.2, rx: 6.2, ry: 4.2, z: 0, col: '#ffd23f' },
        { t: 'poly', pts: [[-5.6, 5.4], [-8.2, 8.4], [-5.0, 7.6]], z: 0, col: '#ffd23f' },
        { t: 'ell', x: 2.6, y: 9.6, rx: 3.3, ry: 3.3, z: 1.2, col: '#ffd23f' },
        { t: 'poly', pts: [[5.2, 9.8], [8.8, 9.2], [5.4, 8.0]], z: 2.6, col: '#ff8a3d' },
        { t: 'ell', x: 3.4, y: 10.4, rx: 0.55, ry: 0.55, z: 1.4, col: '#1d1a24' },
        { t: 'ell', x: -0.6, y: 4.6, rx: 3.4, ry: 2.2, rot: -0.2, z: 0.6, col: '#f5c21e' }
      ],
      extra: [
        { t: 'poly', pts: [[5.4, 8.1], [6.1, 6.6], [6.8, 8.0], [7.5, 6.5], [8.2, 7.8], [8.8, 9.2]], z: 2.6 },
        { t: 'poly', pts: [[-0.4, 12.0], [0.0, 15.2], [1.0, 12.6], [2.0, 15.8], [2.8, 12.8], [4.0, 15.2], [4.2, 12.2]], z: 1.2 },
        { t: 'poly', pts: [[-3.0, 7.6], [-4.4, 11.0], [-1.6, 8.4]], z: 0.4 }
      ],
      eyes: [[2.6, 10.6], [4.2, 10.9]], ez: 1.6, er: 0.45, mouth: [[5.6, 8.9], [8.2, 9.0], [8.0, 9.5], [5.6, 9.5]], mz: 2.6 },
    { id: 'books', name: 'a pile of books', beast: 'The Fortress', h: 20,
      parts: [
        { t: 'rr', x: -7.2, y: 0, w: 14.4, h: 3.0, r: 0.4, z: 0, col: '#3f6fb5' },
        { t: 'rr', x: -6.4, y: 3.0, w: 12.6, h: 2.6, r: 0.4, z: 0.4, col: '#c8553d' },
        { t: 'rr', x: -7.0, y: 5.6, w: 13.6, h: 3.0, r: 0.4, z: 0.2, col: '#e6b33e' },
        { t: 'rr', x: -2.2, y: 8.6, w: 4.4, h: 6.0, r: 0.6, z: 1.2, col: '#6c5ba7' },
        { t: 'line', pts: [[-1.0, 14.4], [-2.2, 19.6]], w: 0.5, z: 2.0, col: '#2b2f3a' }, { t: 'line', pts: [[0.6, 14.4], [1.4, 20.4]], w: 0.5, z: 1.6, col: '#e5484d' },
        { t: 'line', pts: [[0.0, 14.4], [0.0, 18.6]], w: 0.5, z: 1.8, col: '#2f9e6b' }
      ],
      extra: [
        { t: 'poly', pts: [[-7.0, 8.4], [-7.0, 10.6], [-5.6, 10.6], [-5.6, 9.2], [-4.2, 9.2], [-4.2, 10.6], [-2.8, 10.6], [-2.8, 8.4]], z: 0.2 },
        { t: 'poly', pts: [[2.8, 8.4], [2.8, 10.6], [4.2, 10.6], [4.2, 9.2], [5.6, 9.2], [5.6, 10.6], [6.6, 10.6], [6.6, 8.4]], z: 0.2 },
        { t: 'poly', pts: [[-2.6, 19.2], [-2.4, 21.6], [-1.8, 19.4]], z: 2.0 }, { t: 'poly', pts: [[1.0, 20.0], [1.6, 22.6], [1.9, 20.2]], z: 1.6 }
      ],
      eyes: [[-1.0, 12.4], [1.0, 12.4]], ez: 1.3, er: 0.45, mouth: [[-1.4, 10.0], [1.4, 10.0], [1.2, 10.5], [-1.2, 10.5]], mz: 1.3 }
  ];
  const MOON_NAMES = ['new moon', 'waxing crescent', 'first quarter', 'waxing gibbous', 'full moon', 'waning gibbous', 'last quarter', 'waning crescent'];
  const MORNINGS = [
    { id: 'clear', sky: ['#7fbcf2', '#cfe8ff'], dawn: ['#3a3f7a', '#f29d7a', '#ffd7a0'], clouds: 0 },
    { id: 'wisps', sky: ['#8bb8e8', '#e3efff'], dawn: ['#45407a', '#f0a090', '#ffe0b8'], clouds: 3 },
    { id: 'peach', sky: ['#93c4f0', '#fde9d4'], dawn: ['#3f3a72', '#ff9f8a', '#ffd9a8'], clouds: 2 },
    { id: 'misty', sky: ['#a7c3dc', '#eef3f7'], dawn: ['#4a4e7c', '#e8a8a8', '#f6e2cf'], clouds: 5 }
  ];

  let softMemo = null;
  function softwareGfx() {
    if (softMemo != null) return softMemo;
    try {
      const c = document.createElement('canvas'), gl = c.getContext('webgl');
      if (!gl) return (softMemo = true);
      const ext = gl.getExtension('WEBGL_debug_renderer_info'), r = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
      const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
      return (softMemo = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(r));
    } catch (e) { return (softMemo = false); }
  }
  const hex3 = (c) => { const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(c || ''); return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0]; };
  const mixHex = (a, b, k) => { const x = hex3(a), y = hex3(b), f = (i) => Math.round(x[i] + (y[i] - x[i]) * k).toString(16).padStart(2, '0'); return '#' + f(0) + f(1) + f(2); };
  const rgba = (c, a) => { const x = hex3(c); return 'rgba(' + x[0] + ',' + x[1] + ',' + x[2] + ',' + a + ')'; };
  const ZF = 0.5; // how much each part's depth counts in the shadow
  const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  (env.games = env.games || []).push({
    id: 'night-shift', mode: 'reframe', name: 'Night Shift', verb: 'scrub', family: 'REFRAME', minutes: 2,
    parents: ['Sleep / Winding Down', 'Uncertainty / Future Worry / Reassurance', 'Overthinking / Thought Fusion'],
    cast: ['still', 'loopie', 'drop'], poster: { char: 'still', mood: 'sleepy' },
    fonts: ['Fraunces:ital,wght@0,400;0,600;1,600', 'Caveat:wght@600'],
    tagline: 'At 3 a.m. it’s a monster on the wall. Drag the sun up and look again.',
    why: 'For a 3 a.m. worry: see it in daylight, then give it an appointment and sleep.',
    css: `
.g-night-shift { --ns-serif: "Fraunces", "Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif; --ns-hand: "Caveat", "Segoe Print", "Bradley Hand", "Chalkboard SE", var(--font-ui); }
.g-night-shift .ns-pill { position: absolute; z-index: 30; left: 50%; top: calc(env(safe-area-inset-top, 0px) + 62px); transform: translateX(-50%); padding: 7px 14px 8px; border-radius: 999px; pointer-events: none;
  font: 600 13px/1 var(--font-ui); letter-spacing: .06em; color: #dfe3ff; background: rgba(12, 14, 34, .72); border: 1px solid rgba(190, 200, 255, .22); white-space: nowrap; transition: background .8s ease, color .8s ease; }
.g-night-shift .ns-pill b { font-weight: 700; color: #fff; margin-right: 6px; font-variant-numeric: tabular-nums; }
.g-night-shift .ns-pill.day { background: rgba(255, 250, 240, .86); color: #6a4a2a; border-color: rgba(120, 80, 40, .2); }
.g-night-shift .ns-pill.day b { color: #3a2410; }
.g-night-shift .ns-thought { position: absolute; z-index: 22; pointer-events: none; text-align: center; }
.g-night-shift .ns-thought > div { position: absolute; left: 0; right: 0; top: 0; transition: none; }
.g-night-shift .ns-thought small { display: block; font: 700 12px/1 var(--font-ui); letter-spacing: .16em; text-transform: uppercase; margin-bottom: 7px; }
.g-night-shift .ns-night small { color: #b6a8ff; }
.g-night-shift .ns-day small { color: #66400f; }
.g-night-shift .ns-night p { margin: 0; font: italic 600 22px/1.16 var(--ns-serif); color: #efe9ff; text-shadow: 0 0 18px rgba(120, 90, 255, .55), 0 2px 6px rgba(0, 0, 0, .7); text-wrap: balance; animation: night-shift-breathe 4.8s ease-in-out infinite; }
.g-night-shift .ns-day p { margin: 0; font: 400 19px/1.3 var(--ns-serif); color: #3b2816; text-shadow: 0 1px 0 rgba(255, 255, 255, .6); text-wrap: balance; }
.g-night-shift .ns-thought .gk-user { font-weight: inherit; font-size: inherit; }
@keyframes night-shift-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.025); } }
.g-night-shift .ns-facts { position: absolute; z-index: 23; display: flex; flex-direction: column; gap: 10px; pointer-events: none; }
.g-night-shift .ns-fact { position: relative; padding: 9px 11px 10px; border-radius: 3px; color: #3a2a18; background: linear-gradient(180deg, #fff8e2, #fbedc4); box-shadow: 0 6px 14px rgba(60, 30, 0, .28), inset 0 -2px 0 rgba(160, 110, 40, .15);
  transform: rotate(var(--rot, -1deg)) translateY(8px) scale(.94); opacity: 0; transition: opacity .7s ease, transform .9s cubic-bezier(.2, 1.2, .4, 1), filter .8s ease; }
.g-night-shift .ns-fact::before { content: ""; position: absolute; left: 50%; top: -6px; width: 12px; height: 12px; margin-left: -6px; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #ff9d8a, #c8402a); box-shadow: 0 2px 3px rgba(0, 0, 0, .35); }
.g-night-shift .ns-fact.on { opacity: 1; transform: rotate(var(--rot, -1deg)); }
.g-night-shift .ns-fact.dim { opacity: .5; filter: saturate(.4) brightness(.62); }
.g-night-shift .ns-fact small { display: block; font: 700 12px/1.1 var(--font-ui); letter-spacing: .1em; text-transform: uppercase; color: #9a5a12; margin-bottom: 4px; }
.g-night-shift .ns-fact span { display: block; font: 500 15px/1.3 var(--font-ui); }
.g-night-shift .ns-sun { position: absolute; z-index: 21; touch-action: none; cursor: ns-resize; border-radius: 18px; outline: none; }
.g-night-shift .ns-sun:focus-visible { box-shadow: 0 0 0 3px rgba(255, 214, 140, .9); }
.g-night-shift .ns-caption { position: absolute; z-index: 26; left: 50%; transform: translateX(-50%); width: min(560px, calc(100% - 24px)); text-align: center; pointer-events: none; animation: night-shift-rise 1s cubic-bezier(.2, 1.2, .4, 1) both; }
.g-night-shift .ns-caption b { display: block; font: italic 600 clamp(26px, 7.6cqw, 44px)/1.05 var(--ns-serif); color: #f3eeff; text-shadow: 0 0 24px rgba(140, 110, 255, .7), 0 2px 8px rgba(0, 0, 0, .7); text-wrap: balance; }
.g-night-shift .ns-caption span { display: block; margin-top: 8px; font: 600 15px/1.35 var(--font-ui); color: #d8d2ff; text-shadow: 0 1px 6px rgba(0, 0, 0, .8); }
@keyframes night-shift-rise { from { opacity: 0; transform: translate(-50%, 14px); } to { opacity: 1; transform: translateX(-50%); } }
.g-night-shift .ns-letter { position: absolute; z-index: 34; perspective: 1100px; transform-style: preserve-3d; touch-action: none; cursor: grab; animation: night-shift-in .7s cubic-bezier(.2, 1.2, .4, 1) both; }
@keyframes night-shift-in { from { opacity: 0; transform: translateY(26px) scale(.94); } to { opacity: 1; transform: none; } }
.g-night-shift .ns-half { position: absolute; left: 0; width: 100%; overflow: hidden; }
.g-night-shift .ns-top { top: 0; height: 50%; border-radius: 4px 4px 0 0; }
.g-night-shift .ns-bot { top: 50%; height: 50%; transform-origin: 50% 0; transform: rotateX(calc(var(--f1, 0) * 180deg)); transform-style: preserve-3d; overflow: visible; }
.g-night-shift .ns-face { position: absolute; inset: 0; overflow: hidden; -webkit-backface-visibility: hidden; backface-visibility: hidden; }
.g-night-shift .ns-front { border-radius: 0 0 4px 4px; }
.g-night-shift .ns-back { transform: rotateX(180deg); border-radius: 4px 4px 0 0; }
.g-night-shift .ns-paper { background: linear-gradient(180deg, #fffaf0, #f6ead2); box-shadow: inset 0 0 30px rgba(170, 120, 60, .12); }
.g-night-shift .ns-paperback { background: linear-gradient(180deg, #f1e3c6, #e9d8b6); box-shadow: inset 0 0 22px rgba(120, 80, 30, .16); }
.g-night-shift .ns-shade { position: absolute; inset: 0; pointer-events: none; background: linear-gradient(180deg, rgba(60, 30, 0, 0), rgba(60, 30, 0, .3)); opacity: calc(var(--f1, 0) * (1 - var(--f1, 0)) * 3); }
.g-night-shift .ns-ink { position: absolute; left: 0; width: 100%; padding: 16px 18px; color: #2c2116; }
.g-night-shift .ns-ink h4 { margin: 0 0 6px; font: 600 25px/1.05 var(--ns-hand); color: #3a2a6a; }
.g-night-shift .ns-ink p { margin: 0 0 7px; font: 500 15px/1.32 var(--font-ui); }
.g-night-shift .ns-ink q { quotes: "“" "”"; font-style: italic; color: #4a2a7a; }
.g-night-shift .ns-ink .ns-step { font-weight: 600; color: #2c4a2a; }
.g-night-shift .ns-ink .ns-sign { font: 600 23px/1 var(--ns-hand); color: #3a2a6a; text-align: right; margin: 2px 0 0; }
.g-night-shift .ns-crease { position: absolute; left: 8px; right: 8px; top: 50%; height: 1px; background: rgba(120, 80, 30, .22); }
.g-night-shift .ns-fold2 { position: absolute; z-index: 34; perspective: 900px; transform-style: preserve-3d; touch-action: none; cursor: grab; }
.g-night-shift .ns-l, .g-night-shift .ns-r { position: absolute; top: 0; width: 50%; height: 100%; }
.g-night-shift .ns-l { left: 0; border-radius: 4px 0 0 4px; }
.g-night-shift .ns-r { left: 50%; transform-origin: 0 50%; transform: rotateY(calc(var(--f2, 0) * -180deg)); transform-style: preserve-3d; }
.g-night-shift .ns-r .ns-face { border-radius: 0 4px 4px 0; }
.g-night-shift .ns-r .ns-back { transform: rotateY(180deg); border-radius: 4px 0 0 4px; }
.g-night-shift .ns-vcrease { position: absolute; top: 6px; bottom: 6px; left: 50%; width: 1px; background: rgba(120, 80, 30, .25); }
.g-night-shift .ns-note { position: absolute; z-index: 34; touch-action: none; cursor: grab; border-radius: 4px; background: linear-gradient(160deg, #f4e6c8, #e6d2ac); box-shadow: 0 10px 24px rgba(0, 0, 0, .45), inset 0 0 0 1px rgba(255, 255, 255, .3);
  transition: box-shadow .3s ease; }
.g-night-shift .ns-note::before, .g-night-shift .ns-note::after { content: ""; position: absolute; background: rgba(120, 80, 30, .2); }
.g-night-shift .ns-note::before { left: 50%; top: 4px; bottom: 4px; width: 1px; }
.g-night-shift .ns-note::after { top: 50%; left: 4px; right: 4px; height: 1px; }
.g-night-shift .ns-note.lift { box-shadow: 0 22px 40px rgba(0, 0, 0, .55); }
.g-night-shift .ns-note.placed { transition: left .7s cubic-bezier(.2, 1, .3, 1), top .7s cubic-bezier(.2, 1, .3, 1), width .7s ease, height .7s ease, box-shadow .7s ease; box-shadow: 0 4px 10px rgba(0, 0, 0, .4), 0 0 26px rgba(255, 210, 140, .35); cursor: default; }
.g-night-shift .ns-wax { position: absolute; left: 50%; top: 50%; width: 64px; height: 64px; margin: -32px 0 0 -32px; border-radius: 50%; transform: scale(var(--w, 0)); z-index: 2;
  background: radial-gradient(circle at 38% 34%, #e0566a 0%, #b4223a 46%, #7e1124 100%); box-shadow: 0 3px 6px rgba(60, 0, 10, .45), inset 0 -3px 6px rgba(60, 0, 10, .35); }
.g-night-shift .ns-wax svg { position: absolute; inset: 10px; width: 44px; height: 44px; opacity: var(--st, 0); transform: scale(calc(1.3 - var(--st, 0) * .3)); }
.g-night-shift .ns-sealhit { position: absolute; left: 50%; top: 50%; width: 92px; height: 92px; margin: -46px 0 0 -46px; border-radius: 50%; z-index: 3; touch-action: none; cursor: pointer; }
.g-night-shift .ns-sealring { position: absolute; inset: 6px; border-radius: 50%; border: 2px dashed rgba(180, 34, 58, .55); opacity: calc(1 - var(--w, 0)); }
.g-night-shift .ns-tag { position: absolute; z-index: 35; transform: translate(-50%, -100%); padding: 5px 10px 6px; border-radius: 999px; white-space: nowrap; pointer-events: none;
  font: 700 12px/1 var(--font-ui); letter-spacing: .08em; text-transform: uppercase; color: #3a2410; background: #ffe2a8; box-shadow: 0 4px 12px rgba(0, 0, 0, .4); animation: night-shift-tag .6s cubic-bezier(.2, 1.4, .4, 1) both; }
.g-night-shift .ns-spot { position: absolute; z-index: 20; transform: translate(-50%, -100%); pointer-events: none; white-space: nowrap; font: 700 12px/1 var(--font-ui); letter-spacing: .08em; text-transform: uppercase;
  color: #ffe2a8; text-shadow: 0 1px 4px rgba(0, 0, 0, .9); animation: night-shift-tag .6s ease both; }
@keyframes night-shift-tag { from { opacity: 0; transform: translate(-50%, -70%) scale(.92); } to { opacity: 1; transform: translate(-50%, -100%); } }
.g-night-shift .ns-addr { position: absolute; left: 10px; top: 5px; font: 600 20px/1 var(--ns-hand); color: #3a2a6a; transform: rotate(-3deg); white-space: nowrap; pointer-events: none; transition: opacity .4s ease; }
.g-night-shift .ns-note.placed .ns-addr { opacity: 0; }
.g-night-shift .ns-note.glide { transition: left .45s cubic-bezier(.2, 1, .3, 1), box-shadow .3s ease; }
.g-night-shift .ns-ghost { position: absolute; left: 16px; right: 16px; top: 16px; bottom: 12px; opacity: .09; background: repeating-linear-gradient(180deg, transparent 0 12px, #4a3a7a 12px 14px, transparent 14px 21px); }
.g-night-shift .ns-end { position: absolute; z-index: 26; left: 50%; transform: translateX(-50%); width: min(560px, calc(100% - 28px)); text-align: center; pointer-events: none; }
.g-night-shift .ns-end b { display: block; font: italic 600 clamp(25px, 7cqw, 40px)/1.1 var(--ns-serif); color: #eef0ff; text-shadow: 0 0 26px rgba(120, 140, 255, .55), 0 2px 10px rgba(0, 0, 0, .8); text-wrap: balance; animation: night-shift-up 2.2s ease both; }
.g-night-shift .ns-end span { display: block; margin-top: 10px; font: 600 15px/1.35 var(--font-ui); color: #c9ceff; text-shadow: 0 1px 6px rgba(0, 0, 0, .8); animation: night-shift-up 2.2s 1s ease both; }
@keyframes night-shift-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
.g-night-shift .ns-out { opacity: 0 !important; transition: opacity .5s ease; pointer-events: none; }
.g-night-shift .ns-size { position: absolute; left: 0; top: 0; width: 0; height: 0; z-index: 21; pointer-events: none; opacity: 0; transition: opacity .7s ease; }
.g-night-shift .ns-size.on { opacity: 1; }
.g-night-shift .ns-size span { position: absolute; white-space: nowrap; font: 600 21px/1 var(--ns-hand); color: #5a3510; text-shadow: 0 1px 0 rgba(255, 250, 235, .6); }
.g-night-shift .ns-size svg { position: absolute; overflow: visible; }
.g-night-shift .gk-bubble { max-width: min(250px, calc(100cqw - var(--sz, 96px) - 44px)); }
.g-night-shift .ns-still .gk-bubble { max-width: min(300px, calc(100cqw - var(--sz, 74px) - var(--osz, 64px) - 62px)); }
.g-night-shift .ns-loopie .gk-bubble { max-width: min(300px, calc(100cqw - var(--sz, 64px) - var(--osz, 74px) - 62px)); }
/* the two night-shift workers sit low on the duvet, so their bubbles grow upwards and never run off the bottom */
.g-night-shift .gk-char.ns-still .gk-bubble, .g-night-shift .gk-char.ns-loopie .gk-bubble { top: auto; bottom: 6px; }
.g-night-shift .gk-char.ns-still .gk-bubble::before, .g-night-shift .gk-char.ns-loopie .gk-bubble::before { top: auto; bottom: 20px; }
@container (min-width: 700px) {
  .g-night-shift .ns-night p { font-size: 30px; }
  .g-night-shift .ns-day p { font-size: 24px; }
  .g-night-shift .ns-fact span { font-size: 16px; }
}
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el;
      let an = ctx.analysis || {};
      const TAU = Math.PI * 2, clamp = K.clamp, lerp = K.lerp, now = () => performance.now();
      const inten = ctx.intensity, visits = K.visits(), noWords = !String(ctx.text || '').trim();
      const L = (o, sub) => { let s = ctx.line(o) || ''; if (sub) Object.keys(sub).forEach(k => { s = s.split('{' + k + '}').join(sub[k]); }); return s; };
      const isBright = () => S.scene() === 'bright';
      const reduced = () => K.reduced();
      const care = () => an.safety === 'care';
      const support = () => (an.fear_support === 'strong' ? 'strong' : an.fear_support === 'some' ? 'some' : 'weak');

      /* ---------------- words ---------------- */
      const clip = (s, n) => {
        s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
        if (s.length > n) { const c = s.slice(0, n - 1), sp = c.lastIndexOf(' '); s = (sp > n * 0.6 ? c.slice(0, sp) : c).replace(/[\s,;:–-]+$/, '') + '…'; }
        if ((s.match(/"/g) || []).length % 2) s += '"';
        if ((s.match(/“/g) || []).length > (s.match(/”/g) || []).length) s += '”';
        return s;
      };
      const tidy = (s, n) => { s = clip(String(s || '').replace(/;\s+/g, '. '), n || 150); if (!s) return ''; s = s[0].toUpperCase() + s.slice(1); return /[.!?…"”’)]$/.test(s) ? s : s + '.'; };
      const leadOf = (kind) => { const ls = (Array.isArray(an.leads) ? an.leads : []).filter(l => l && l.text); const l = ls.find(x => x.kind === kind) || ls[0]; return l ? tidy(l.text, 110) : ''; };
      const nightText = () => (noWords ? 'Everything is going wrong.' : tidy(an.conclusion || an.thought, 90) || 'This means something bad.');
      const dayText = () => {
        if (noWords) return 'Same thought. In daylight it’s the size it really is.';
        let b = tidy(an.balanced, 150) || 'It fits more than one story, and the facts don’t settle it yet.';
        return b;
      };
      function factsList() {
        const out = [], sit = noWords ? '' : tidy(an.situation, 110);
        out.push(sit ? { tag: 'What actually happened', text: tidy(an.situation, K.phone() ? 84 : 110), user: true } : { tag: 'What’s true at 10 a.m.', text: 'The facts are exactly what they were at 3 a.m.' });
        if (care()) out.push({ tag: 'What you can do at 10 a.m.', text: 'Ask someone qualified exactly where you stand.' });
        else { const ld = leadOf(support() === 'weak' ? 'ask' : 'prepare'); out.push({ tag: 'What you can do at 10 a.m.', text: (!noWords && ld) || 'Ask, check or plan. People and places are open.' }); }
        const unk = (Array.isArray(an.unknowns) ? an.unknowns : []).find(u => u && u.text);
        out.push(unk && !noWords ? { tag: 'Still unknown (and findable)', text: tidy(unk.text, 90) } : { tag: 'Also true at 10 a.m.', text: 'You’ll meet it with more sleep and more light.' });
        return out.slice(0, inten === 0 || K.phone() ? 2 : 3);
      }

      /* ---------------- tonight ---------------- */
      const coll = K.collection();
      const seenObj = OBJECTS.filter(o => coll.includes('o:' + o.id));
      const unseen = OBJECTS.filter(o => !coll.includes('o:' + o.id));
      const OBJ = visits === 0 && !seenObj.length ? OBJECTS[0] : unseen.length ? unseen[(K.daily() + visits) % unseen.length] : K.dailyPick(OBJECTS, 3);
      const MORN = K.dailyPick(MORNINGS, 4);
      const SOUTH = true; // the product is Australian: draw the moon as the southern hemisphere sees it
      const moonP = (() => { const syn = 29.530588853, ref = Date.UTC(2000, 0, 6, 18, 14), d = (Date.now() - ref) / 86400000; return (((d % syn) + syn) % syn) / syn; })();
      // the name follows what the window shows: the lit fraction decides new, crescent, quarter, gibbous or full
      const MOONLIT = (1 - Math.cos(moonP * TAU)) / 2, waxing = moonP < 0.5;
      const moonName = MOONLIT < 0.02 ? MOON_NAMES[0] : MOONLIT > 0.98 ? MOON_NAMES[4] : MOONLIT < 0.35 ? MOON_NAMES[waxing ? 1 : 7] : MOONLIT <= 0.65 ? MOON_NAMES[waxing ? 2 : 6] : MOON_NAMES[waxing ? 3 : 5];
      const R = K.rng((K.daily() * 37 + visits * 101 + 3) >>> 0);
      const STARS = Array.from({ length: 70 }, () => ({ x: R(), y: R(), s: 0.5 + R() * 1.3, p: R() * TAU, v: 0.4 + R() * 1.2 }));
      const ROOFS = Array.from({ length: 9 }, (_, i) => ({ w: 0.08 + R() * 0.12, h: 0.04 + R() * 0.1, lit: R() < 0.35, i }));

      /* ---------------- state ---------------- */
      const G = { phase: 'intro', t: 0, tT: 0, sunV: 0, drag: false, maxT: 0, factsOn: 0, moving: 0, calm: 0, last: null, finale: 0, dim: 0, phone: 1, letterOn: 0, done: false, hourSeen: 3, facts: [], twistDone: false };
      const M = { W: 0, H: 0, phone: true };
      const RM = {};   // room projection
      const FX = K.particles({ max: 160 });

      /* ---------------- DOM ---------------- */
      const SOFT = softwareGfx();
      const cv = K.canvas(el, { opaque: true, maxDpr: SOFT ? 1 : 1.5 });
      const pill = h('div', { class: 'ns-pill' }, h('b', { text: '3:07 a.m.' }), h('span', { text: 'Night shift' }));
      const nightP = h('p'), dayP = h('p');
      const nightBox = h('div', { class: 'ns-night' }, h('small', { text: '3 a.m. version' }), nightP);
      const dayBox = h('div', { class: 'ns-day' }, h('small', { text: '10 a.m. version' }), dayP);
      const thought = h('div', { class: 'ns-thought' }, nightBox, dayBox);
      const factsEl = h('div', { class: 'ns-facts', 'aria-live': 'polite' });
      const sunHit = h('div', { class: 'ns-sun', role: 'slider', tabindex: '0', 'aria-label': 'The sun. Drag it up to move time from 3 a.m. to 10 a.m.', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0', 'aria-valuetext': '3:07 a.m.' });
      // a museum label for the morning: the shadow at its actual size
      const sizeLab = h('span', { text: 'actual size' }), sizeSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const sizeEl = h('div', { class: 'ns-size', 'aria-hidden': 'true' }, sizeLab, sizeSvg);
      el.append(thought, factsEl, sizeEl, sunHit, pill);
      const fillTexts = () => {
        const nt = nightText(), dt = dayText();
        nightP.replaceChildren(noWords ? document.createTextNode(nt) : h('span', { class: 'gk-user', text: nt }));
        dayP.replaceChildren(noWords ? document.createTextNode(dt) : h('span', { class: 'gk-user', text: dt }));
        if (M.W) placeDom();
      };
      fillTexts();
      const still = K.character('still', { side: 'right', mood: 'sleepy', size: K.phone() ? 74 : 96 });
      const csz = K.phone() ? 74 : 96, lsz = K.phone() ? 64 : 84;
      const loopie = K.character('loopie', { side: 'left', mood: 'worried', size: lsz, x: 0, y: 0 });
      const drop = K.character('drop', { side: 'right', mood: 'happy', size: K.phone() ? 46 : 60, x: -200, y: 0 });
      drop.show(false);
      still.el.classList.add('ns-still'); still.el.style.setProperty('--osz', lsz + 'px');
      loopie.el.classList.add('ns-loopie'); loopie.el.style.setProperty('--osz', csz + 'px');
      const sayStill = (o, mood, ms, sub) => { loopie.hush(); return still.say(L(o, sub), { mood, ms: ms == null ? 3600 : ms }); };
      const sayLoopie = (o, mood, ms, sub) => { still.hush(); return loopie.say(L(o, sub), { mood, ms: ms == null ? 3400 : ms }); };

      /* ---------------- sound: quiet, night-soft ---------------- */
      const nightBed = K.music('space'), dayBed = K.music('calm');
      nightBed.level(0.32); dayBed.level(0);
      const roomAmb = K.ambience('room'), dawnAmb = K.ambience('dawn');
      roomAmb.level(0.35, 1.5); dawnAmb.level(0.0001, 0.5);
      let air = null;
      const beds = () => { if (A.ctx && !air) air = A.loop({ pink: true, filter: 'lowpass', freq: 500, q: 0.4, bus: 'sfx' }); };
      beds(); S.on('audio-ready', beds);
      S.onDestroy(() => { if (air) air.stop(); });
      S.every(() => { if (!A.ctx || G.phase === 'done') return; const night = 1 - sstep(0.3, 0.6, G.t); if (night > 0.05 && G.finale < 0.5) A.wood(undefined, 0.012 * night, 1.6); }, 1000);
      const HOURS = ['A3', 'C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5'];

      /* ---------------- room geometry (one-point perspective; units cm) ---------------- */
      function proj(x, y, z) { const sx = RM.x0 + x * RM.k, sy = RM.floor - y * RM.k, f = RM.D / (RM.D - (z || 0)); return [RM.vx + (sx - RM.vx) * f, RM.vy + (sy - RM.vy) * f]; }
      function layout() {
        const W = cv.w, H = cv.h; if (!W || !H) return;
        M.W = W; M.H = H; M.phone = W < 700;
        if (M.phone) {
          Object.assign(RM, { x0: 82, top: 64, floor: Math.round(H * 0.72), wallW: (W - 82) / 1 });
          RM.k = (RM.floor - RM.top) / 250; RM.D = 260; RM.vx = RM.x0 + 0.62 * (W - RM.x0); RM.vy = RM.top + 0.48 * (RM.floor - RM.top);
          RM.wallCm = (W + 40 - RM.x0) / RM.k;
          RM.win = { z0: 12, z1: 68, y0: 96, y1: 204 };
          RM.desk = { x0: 18, x1: RM.wallCm + 20, y: 74, d: 52 };
          RM.obj = { x: Math.min(RM.wallCm - 62, 92), z: 8 };
          RM.bed = Math.round(H * 0.735);
        } else {
          const x0 = Math.round(W * 0.235), x1 = Math.round(W * 0.8);
          Object.assign(RM, { x0, x1, top: 58, floor: Math.round(H * 0.75) });
          RM.k = (RM.floor - RM.top) / 250; RM.D = 300; RM.vx = (x0 + x1) / 2; RM.vy = RM.top + 0.5 * (RM.floor - RM.top);
          RM.wallCm = (x1 - x0) / RM.k;
          RM.win = { z0: 26, z1: 112, y0: 92, y1: 196 };
          RM.desk = { x0: 26, x1: RM.wallCm - 26, y: 74, d: 58 };
          RM.obj = { x: RM.wallCm * 0.6, z: 8 };
          RM.bed = Math.round(H * 0.8);
        }
        const o = RM.obj;
        RM.phoneL = { x: o.x + 6.5, y: RM.desk.y + 1.2, z: o.z + 3.3 };
        RM.clock = { x: M.phone ? o.x - 52 : o.x - 74, z: 16 };
        RM.spot = { x: o.x - (M.phone ? 34 : 40), z: 30, w: 15, d: 12 };
        RM.deskTop = proj(0, RM.desk.y, 0)[1];
        // the window on the left wall (x = 0)
        const w = RM.win; RM.winPoly = [proj(0, w.y0, w.z0), proj(0, w.y1, w.z0), proj(0, w.y1, w.z1), proj(0, w.y0, w.z1)];
        const xs = RM.winPoly.map(p => p[0]), ys = RM.winPoly.map(p => p[1]);
        RM.winBox = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
        RM.sill = (RM.winPoly[0][1] + RM.winPoly[3][1]) / 2; RM.winTop = (RM.winPoly[1][1] + RM.winPoly[2][1]) / 2;
        RM.sunX = RM.winBox.x + RM.winBox.w * 0.52;
        placeDom();
        roomKey = ''; objKey = '';
      }
      function sunY(t) { return lerp(RM.sill + 18, RM.winTop + 24, sstep(0, 1, t)); }
      function placeDom() {
        const W = M.W, H = M.H;
        // the sun slider covers the window (at least 88px wide, so a thumb can find it)
        const bx = RM.winBox, sw = Math.max(88, bx.w + 26), sx = clamp(bx.x + bx.w / 2 - sw / 2, 0, W - sw);
        Object.assign(sunHit.style, { left: sx + 'px', top: (bx.y - 6) + 'px', width: sw + 'px', height: (bx.h + 40) + 'px' });
        RM.sunHit = { x: sx, y: bx.y - 6, w: sw, h: bx.h + 40 };
        // the thought, on the wall above the desk
        const tx = M.phone ? RM.x0 + 12 : RM.x0 + 30, tw = (M.phone ? W - 12 : RM.x1 - 30) - tx;
        Object.assign(thought.style, { left: tx + 'px', width: tw + 'px', top: (M.phone ? 104 : 104) + 'px', height: '120px' });
        // tomorrow's facts: pinned to the wall away from the object, always below the 10 a.m. version however long it runs
        const fTop = Math.max(M.phone ? 228 : 214, 104 + (dayBox.offsetHeight || 0) + 16);
        if (M.phone) Object.assign(factsEl.style, { left: (RM.x0 + 10) + 'px', top: fTop + 'px', width: Math.min(168, W - RM.x0 - 124) + 'px' });
        else Object.assign(factsEl.style, { left: (RM.x0 + 28) + 'px', top: fTop + 'px', width: '300px' });
        // the characters sit on the duvet
        loopie.place(W - 12 - lsz, H - 14 - lsz);
        drop.place(RM.winBox.x + RM.winBox.w * 0.5 - (M.phone ? 23 : 30), RM.sill - (M.phone ? 52 : 66));
        placeSizeLabel();
        if (G.letterEl) placeLetter();
        if (G.noteEl && !G.placed) placeNoteHome();
      }

      // "actual size": a museum label above the 10 a.m. shadow, clear of the pinned notes, with a hand-drawn arrow down to it
      function placeSizeLabel() {
        const sb = shadowBox(lightAt(1, 0), OBJ.parts, 1), sx = sb.x + sb.w * 0.5, sy = sb.y + 4;
        const lw = sizeLab.offsetWidth || 96, lh = 22;
        const fr = (parseFloat(factsEl.style.left) || 0) + (parseFloat(factsEl.style.width) || 0) + 10;
        const cx = clamp(sx, Math.min(fr + lw / 2, M.W - lw / 2 - 8), M.W - lw / 2 - 8), ly = Math.round(sy - lh - (M.phone ? 64 : 58));
        Object.assign(sizeLab.style, { left: Math.round(cx - lw / 2) + 'px', top: ly + 'px' });
        const x0 = Math.min(cx, sx) - 24, y0 = ly + lh + 4, w = Math.abs(sx - cx) + 48, hh = Math.max(16, sy - y0);
        const a = [cx - x0, 2], b = [sx - x0, hh - 2], c1 = [a[0] + (b[0] - a[0]) * 0.1 - 10, hh * 0.55], c2 = [b[0] - 14, b[1] - hh * 0.3];
        const ang = Math.atan2(b[1] - c2[1], b[0] - c2[0]), head = (d) => [b[0] - 8 * Math.cos(ang + d), b[1] - 8 * Math.sin(ang + d)];
        const h1 = head(0.5), h2 = head(-0.5), f = (p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1);
        Object.assign(sizeSvg.style, { left: Math.round(x0) + 'px', top: Math.round(y0) + 'px', width: Math.round(w) + 'px', height: Math.round(hh) + 'px' });
        sizeSvg.setAttribute('viewBox', '0 0 ' + Math.round(w) + ' ' + Math.round(hh));
        sizeSvg.innerHTML = '<path d="M' + f(a) + ' C ' + f(c1) + ', ' + f(c2) + ', ' + f(b) + ' M ' + f(h1) + ' L ' + f(b) + ' L ' + f(h2) + '" fill="none" stroke="#5a3510" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>';
      }

      /* ---------------- light: from the phone to the sun (a point light walking out to infinity) ---------------- */
      const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
      // light travelling into the room through the side window: (right, up, towards the back wall)
      const sunV = (t) => { const k = sstep(0.45, 1, t); return norm([lerp(0.92, 0.85, k), lerp(-0.08, -0.42, k), lerp(0.5, 0.38, k)]); };
      const MOONV = norm([0.85, -0.45, 0.48]);
      function lightAt(t, fin) {
        const o = RM.obj, O = [o.x, RM.desk.y + OBJ.h * 0.45, o.z];
        if (fin) { const d = norm([-MOONV[0], -MOONV[1], MOONV[2]]); const dist = 6000; return { L: [O[0] + d[0] * dist, O[1] + d[1] * dist, O[2] + d[2] * dist], soft: 0.4 }; }
        const P = RM.phoneL, dP = norm([P.x - O[0], P.y - O[1], P.z - O[2]]);
        const sv = sunV(t), dS0 = norm([-sv[0], -sv[1], sv[2]]);
        const dS = dS0;
        const e = sstep(0.0, 0.95, t), dir = norm([lerp(dP[0], dS[0], e), lerp(dP[1], dS[1], e), lerp(dP[2], dS[2], e)]);
        // choose the distance so the object's plane is magnified by a scale that falls smoothly to 1
        const s0 = Math.hypot(P.x - O[0], P.y - O[1], P.z - O[2]);
        const big = (P.z) / (P.z - o.z); // magnification at 3 a.m.
        const sc = 1 + (big - 1) * Math.pow(1 - sstep(0, 1, t), 1.25);
        let dist = sc > 1.0005 ? o.z / ((sc - 1) * Math.max(0.12, dir[2])) : 6000;
        dist = clamp(t < 0.002 ? s0 : dist, s0, 6000);
        return { L: [O[0] + dir[0] * dist, O[1] + dir[1] * dist, O[2] + dir[2] * dist], soft: lerp(1, 0.25, e) };
      }
      // shadow of a point of the object on the wall plane (z = 0), in screen space
      function shadowPt(Lt, x, y, z, breath) {
        const o = RM.obj, X = o.x + x, Y = RM.desk.y + y, Z = o.z + z * ZF, Lp = Lt.L;
        const s = Lp[2] / Math.max(0.05, Lp[2] - Z);
        let sx = Lp[0] + (X - Lp[0]) * s, sy = Lp[1] + (Y - Lp[1]) * s;
        if (breath && breath !== 1) {
          // the night makes the shadow breathe: it swells about its own foot, however far away the light is
          if (!Lt.foot) { const s0 = Lp[2] / Math.max(0.05, Lp[2] - o.z); Lt.foot = [Lp[0] + (o.x - Lp[0]) * s0, Lp[1] + (RM.desk.y - Lp[1]) * s0]; }
          sx = Lt.foot[0] + (sx - Lt.foot[0]) * breath; sy = Lt.foot[1] + (sy - Lt.foot[1]) * breath;
        }
        return [RM.x0 + sx * RM.k, RM.floor - sy * RM.k, s * (breath || 1)];
      }
      function shadowPath(g, Lt, parts, breath, grow) {
        parts.forEach(pr => {
          const z = pr.z || 0;
          g.beginPath();
          if (pr.t === 'ell') {
            const c = shadowPt(Lt, pr.x, pr.y, z, breath), sc = c[2] * RM.k;
            g.ellipse(c[0], c[1], Math.max(0.5, pr.rx * sc), Math.max(0.5, pr.ry * sc), -(pr.rot || 0), 0, TAU);
            g.fill();
          } else if (pr.t === 'rr' || pr.t === 'poly') {
            const pts = pr.t === 'rr' ? [[pr.x, pr.y], [pr.x + pr.w, pr.y], [pr.x + pr.w, pr.y + pr.h], [pr.x, pr.y + pr.h]] : pr.pts;
            const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
            pts.forEach((p, i) => { const q = grow != null ? [cx + (p[0] - cx) * grow, cy + (p[1] - cy) * grow] : p; const s = shadowPt(Lt, q[0], q[1], z, breath); if (i) g.lineTo(s[0], s[1]); else g.moveTo(s[0], s[1]); });
            g.closePath(); g.fill();
          } else if (pr.t === 'line' || pr.t === 'arc') {
            const pts = pr.t === 'arc' ? Array.from({ length: 9 }, (_, i) => { const a = pr.a0 + (pr.a1 - pr.a0) * i / 8; return [pr.x + Math.cos(a) * pr.rad, pr.y - Math.sin(a) * pr.rad]; }) : pr.pts;
            let sc = 1; pts.forEach((p, i) => { const s = shadowPt(Lt, p[0], p[1], z, breath); sc = s[2]; if (i) g.lineTo(s[0], s[1]); else g.moveTo(s[0], s[1]); });
            g.lineWidth = Math.max(1, pr.w * sc * RM.k * (grow || 1)); g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke();
          }
        });
      }

      /* ---------------- pre-rendered room (night, day, finale tint) ---------------- */
      const roomN = document.createElement('canvas'), roomD = document.createElement('canvas');
      let roomKey = '', objKey = '';
      const PAL = {
        n: { wall: ['#1d2547', '#151b38'], ceil: '#0f1430', side: '#121933', floor: ['#191a33', '#100f22'], desk: ['#2b2440', '#1f1a31'], deskEdge: '#3a3154', duvet: ['#24305c', '#1a2348'], quilt: '#2f3c6e', pillow: '#36437a', frame: '#3a4062', curtain: 'rgba(150,160,230,0.18)' },
        b: { wall: ['#4a5385', '#3f4776'], ceil: '#3a4170', side: '#3a4170', floor: ['#3d3e66', '#30304f'], desk: ['#4e4670', '#433c62'], deskEdge: '#5c5482', duvet: ['#4c5894', '#404b82'], quilt: '#5866a4', pillow: '#6370ad', frame: '#666ca0', curtain: 'rgba(200,210,255,0.22)' },
        d: { wall: ['#dcc7a8', '#ccb491'], ceil: '#f8eee0', side: '#e3cfb3', floor: ['#c69c74', '#b28660'], desk: ['#b9875a', '#a3734a'], deskEdge: '#d39f6c', duvet: ['#f6eadb', '#ead9c4'], quilt: '#e8d3bc', pillow: '#fff7ec', frame: '#f7f1e6', curtain: 'rgba(255,255,255,0.55)' }
      };
      function drawRoom(g, pal) {
        const W = M.W, H = M.H, w = RM.win, P0 = proj(0, 0, 0), P1 = proj(0, 250, 0);
        const xR = M.phone ? W + 4 : RM.x1;
        // back wall
        let gr = g.createLinearGradient(0, RM.top, 0, RM.floor); gr.addColorStop(0, pal.wall[0]); gr.addColorStop(1, pal.wall[1]);
        g.fillStyle = gr; g.fillRect(RM.x0, RM.top, xR - RM.x0, RM.floor - RM.top);
        // a soft stripe paper
        g.save(); g.globalAlpha = 0.05; g.fillStyle = '#ffffff'; for (let x = RM.x0 + 6; x < xR; x += RM.k * 9) g.fillRect(x, RM.top, RM.k * 1.4, RM.floor - RM.top); g.restore();
        // ceiling
        const zN = RM.D * 0.9, cN = proj(0, 250, zN);
        g.fillStyle = pal.ceil; g.beginPath(); g.moveTo(P1[0], P1[1]); g.lineTo(xR, P1[1]); g.lineTo(xR + 600, -400); g.lineTo(cN[0], -400); g.closePath(); g.fill();
        // left wall
        const fN = proj(0, 0, zN);
        g.fillStyle = pal.side; g.beginPath(); g.moveTo(P0[0], P0[1]); g.lineTo(P1[0], P1[1]); g.lineTo(cN[0], cN[1]); g.lineTo(fN[0], fN[1]); g.closePath(); g.fill();
        g.save(); g.globalAlpha = 0.18; g.fillStyle = '#000'; g.beginPath(); g.moveTo(P0[0], P0[1]); g.lineTo(P1[0], P1[1]); g.lineTo(P1[0] - 18, P1[1]); g.lineTo(P0[0] - 18, P0[1]); g.closePath(); g.fill(); g.restore();
        // right wall (desktop)
        if (!M.phone) {
          const Q0 = [RM.x1, RM.floor], Q1 = [RM.x1, RM.top], k0 = proj(RM.wallCm, 0, zN), k1 = proj(RM.wallCm, 250, zN);
          g.fillStyle = pal.side; g.beginPath(); g.moveTo(Q0[0], Q0[1]); g.lineTo(Q1[0], Q1[1]); g.lineTo(k1[0], k1[1]); g.lineTo(k0[0], k0[1]); g.closePath(); g.fill();
          // a wardrobe door
          const a = proj(RM.wallCm, 0, 30), b = proj(RM.wallCm, 200, 30), c = proj(RM.wallCm, 200, 110), d = proj(RM.wallCm, 0, 110);
          g.fillStyle = pal.frame; g.globalAlpha = 0.5; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath(); g.fill(); g.globalAlpha = 1;
          g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2; g.stroke();
          const kn = proj(RM.wallCm, 100, 98); g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.arc(kn[0], kn[1], 4, 0, TAU); g.fill();
        }
        // floor
        gr = g.createLinearGradient(0, RM.floor, 0, H); gr.addColorStop(0, pal.floor[0]); gr.addColorStop(1, pal.floor[1]);
        const fR = proj(RM.wallCm, 0, zN); // the floor meets the right wall along its own perspective line
        g.fillStyle = gr; g.beginPath(); g.moveTo(P0[0], P0[1]); g.lineTo(xR, RM.floor); g.lineTo(fR[0], fR[1]); g.lineTo(fN[0], fN[1]); g.closePath(); g.fill();
        g.save(); g.strokeStyle = 'rgba(0,0,0,0.16)'; g.lineWidth = 1;
        for (let i = 0; i < 18; i++) { const a = proj(i * 25, 0, 0), b = proj(i * 25, 0, RM.D * 0.9); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
        g.restore();
        // the window: frame, sill and a sheer curtain (the glass is cut out so the sky shows through)
        const wp = RM.winPoly, fr = (yy, zz) => proj(0, yy, zz);
        g.fillStyle = pal.frame;
        const pad = 4, outer = [fr(w.y0 - pad, w.z0 - pad), fr(w.y1 + pad, w.z0 - pad), fr(w.y1 + pad, w.z1 + pad), fr(w.y0 - pad, w.z1 + pad)];
        g.beginPath(); outer.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill();
        g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); wp.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill(); g.restore();
        // mullions
        g.strokeStyle = pal.frame; g.lineWidth = Math.max(2, RM.k * 1.4);
        const mid = (w.z0 + w.z1) / 2, a1 = fr(w.y0, mid), b1 = fr(w.y1, mid), a2 = fr((w.y0 + w.y1) / 2, w.z0), b2 = fr((w.y0 + w.y1) / 2, w.z1);
        g.beginPath(); g.moveTo(a1[0], a1[1]); g.lineTo(b1[0], b1[1]); g.moveTo(a2[0], a2[1]); g.lineTo(b2[0], b2[1]); g.stroke();
        // sill
        const s0 = fr(w.y0 - pad, w.z0 - 8), s1 = fr(w.y0 - pad, w.z1 + 10), s2 = proj(9, w.y0 - pad, w.z1 + 10), s3 = proj(9, w.y0 - pad, w.z0 - 8);
        g.fillStyle = pal.frame; g.beginPath(); g.moveTo(s0[0], s0[1]); g.lineTo(s1[0], s1[1]); g.lineTo(s2[0], s2[1]); g.lineTo(s3[0], s3[1]); g.closePath(); g.fill();
        // curtain, gathered on the far side
        const c0 = fr(w.y1 + 10, w.z0 - 10), c1 = fr(w.y0 - 18, w.z0 - 10), c2 = fr(w.y0 - 18, w.z0 + 8), c3 = fr(w.y1 + 10, w.z0 + 12);
        g.fillStyle = pal.curtain; g.beginPath(); g.moveTo(c0[0], c0[1]); g.lineTo(c3[0], c3[1]); g.quadraticCurveTo(c2[0] + 6, (c2[1] + c3[1]) / 2, c2[0], c2[1]); g.lineTo(c1[0], c1[1]); g.closePath(); g.fill();
        // a light switch and a socket (small honest details)
        const sw = proj(12, 112, 0); g.fillStyle = pal.frame; g.globalAlpha = 0.8; g.fillRect(sw[0] - 4, sw[1] - 6, 8, 12); g.globalAlpha = 1;
        // desk on four legs: top, a slim apron, a little drawer, and the dark under it
        const dk = RM.desk, t0 = proj(dk.x0, dk.y, 0), t1 = proj(dk.x1, dk.y, 0), t2 = proj(dk.x1, dk.y, dk.d), t3 = proj(dk.x0, dk.y, dk.d), ap2 = proj(dk.x1, dk.y - 7, dk.d), ap3 = proj(dk.x0, dk.y - 7, dk.d);
        const quad = (pts, fill) => { g.fillStyle = fill; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill(); };
        quad([proj(dk.x0, dk.y, 0), proj(dk.x1, dk.y, 0), proj(dk.x1, 0, 0), proj(dk.x0, 0, 0)], 'rgba(0,0,0,0.16)');
        const leg = (x, z) => { const a = proj(x - 1.6, dk.y - 7, z), b = proj(x + 1.6, 0, z); g.fillStyle = pal.desk[1]; g.fillRect(a[0], a[1], Math.max(3, b[0] - a[0]), b[1] - a[1]); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(a[0] + (b[0] - a[0]) * 0.6, a[1], Math.max(1, (b[0] - a[0]) * 0.4), b[1] - a[1]); };
        leg(dk.x0 + 4, 6); if (!M.phone) leg(dk.x1 - 4, 6);
        gr = g.createLinearGradient(0, t0[1], 0, t3[1]); gr.addColorStop(0, pal.desk[0]); gr.addColorStop(1, pal.deskEdge);
        quad([t0, t1, t2, t3], gr);
        quad([t3, t2, ap2, ap3], pal.desk[1]);
        g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(t3[0], t3[1] - 1, t2[0] - t3[0], 2);
        const dr0 = proj(dk.x0 + 12, dk.y - 7, dk.d), dr1 = proj(dk.x0 + 52, dk.y - 19, dk.d);
        g.fillStyle = pal.desk[1]; g.fillRect(dr0[0], dr0[1], dr1[0] - dr0[0], dr1[1] - dr0[1]);
        g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1.2; g.strokeRect(dr0[0], dr0[1], dr1[0] - dr0[0], dr1[1] - dr0[1]);
        g.fillStyle = pal.deskEdge; g.beginPath(); g.arc((dr0[0] + dr1[0]) / 2, (dr0[1] + dr1[1]) / 2, 2.6, 0, TAU); g.fill();
        leg(dk.x0 + 4, dk.d - 4); leg(Math.min(dk.x1 - 4, RM.wallCm + 10), dk.d - 4);
        // the bed in the foreground: a duvet with a quilted pattern and a pillow
        const by = RM.bed;
        gr = g.createLinearGradient(0, by, 0, H); gr.addColorStop(0, pal.duvet[0]); gr.addColorStop(1, pal.duvet[1]);
        g.fillStyle = gr; g.beginPath(); g.moveTo(-10, by + 34); g.bezierCurveTo(W * 0.18, by - 22, W * 0.42, by - 10, W * 0.58, by + 14); g.bezierCurveTo(W * 0.74, by + 36, W * 0.9, by + 6, W + 10, by + 10); g.lineTo(W + 10, H + 10); g.lineTo(-10, H + 10); g.closePath(); g.fill();
        g.save(); g.globalAlpha = 0.18; g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.beginPath(); g.moveTo(-10, by + 34); g.bezierCurveTo(W * 0.18, by - 22, W * 0.42, by - 10, W * 0.58, by + 14); g.bezierCurveTo(W * 0.74, by + 36, W * 0.9, by + 6, W + 10, by + 10); g.stroke(); g.restore();
        g.save(); g.clip(); g.strokeStyle = pal.quilt; g.lineWidth = 2; g.globalAlpha = 0.7;
        for (let x = -H; x < W + H; x += 46) { g.beginPath(); g.moveTo(x, by); g.lineTo(x + (H - by) * 0.9, H); g.stroke(); g.beginPath(); g.moveTo(x, H); g.lineTo(x + (H - by) * 0.9, by); g.stroke(); }
        g.restore();
        g.fillStyle = pal.pillow; g.beginPath(); g.ellipse(W * (M.phone ? 0.18 : 0.12), by + 6, W * (M.phone ? 0.26 : 0.16), 26, -0.05, Math.PI, 0); g.fill();
      }
      function renderRoom() {
        const dpr = cv.dpr || 1, W = M.W, H = M.H;
        [[roomN, isBright() ? PAL.b : PAL.n], [roomD, PAL.d]].forEach(([c, pal]) => {
          c.width = Math.max(2, Math.round(W * dpr)); c.height = Math.max(2, Math.round(H * dpr));
          const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H); drawRoom(g, pal);
        });
        roomKey = W + 'x' + H + ':' + dpr + ':' + (isBright() ? 'b' : 'd');
      }
      /* the object itself (night silhouette lit by the phone, day colours) */
      const objN = document.createElement('canvas'), objD = document.createElement('canvas'), objSh = document.createElement('canvas');
      let objBox = null;
      function objPath(g, pr, k) {
        g.beginPath();
        if (pr.t === 'ell') { g.ellipse(pr.x * k, -pr.y * k, pr.rx * k, pr.ry * k, -(pr.rot || 0), 0, TAU); g.fill(); }
        else if (pr.t === 'rr') { const r = Math.min(pr.r || 0, pr.w / 2, pr.h / 2) * k, x = pr.x * k, y = -(pr.y + pr.h) * k, w = pr.w * k, hh = pr.h * k; g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); g.fill(); }
        else if (pr.t === 'poly') { pr.pts.forEach((p, i) => (i ? g.lineTo(p[0] * k, -p[1] * k) : g.moveTo(p[0] * k, -p[1] * k))); g.closePath(); g.fill(); }
        else { const pts = pr.t === 'arc' ? Array.from({ length: 13 }, (_, i) => { const a = pr.a0 + (pr.a1 - pr.a0) * i / 12; return [pr.x + Math.cos(a) * pr.rad, pr.y - Math.sin(a) * pr.rad]; }) : pr.pts; pts.forEach((p, i) => (i ? g.lineTo(p[0] * k, -p[1] * k) : g.moveTo(p[0] * k, -p[1] * k))); g.lineWidth = pr.w * k; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = g.fillStyle; g.stroke(); }
      }
      function renderObject() {
        const dpr = cv.dpr || 1, o = RM.obj, base = proj(o.x, RM.desk.y, o.z), k = RM.k * RM.D / (RM.D - o.z);
        const wcm = 34, hcm = OBJ.h + 8, w = wcm * k, hh = hcm * k;
        objBox = { x: base[0] - w / 2, y: base[1] - hh + 2 * k, w, h: hh, bx: base[0], by: base[1], k };
        [[objN, 'n'], [objD, 'd'], [objSh, 's']].forEach(([c, mode]) => {
          c.width = Math.max(2, Math.ceil(w * dpr)); c.height = Math.max(2, Math.ceil(hh * dpr));
          const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.translate(w / 2, hh - 2 * k);
          if (mode === 's') { g.fillStyle = 'rgba(20,10,30,1)'; g.beginPath(); g.ellipse(1.5 * k, 0, 9 * k, 1.6 * k, 0, 0, TAU); g.fill(); return; }
          OBJ.parts.forEach(pr => { g.fillStyle = mode === 'd' ? pr.col : mixHex(pr.col, isBright() ? '#3a4370' : '#1a2042', 0.62); objPath(g, pr, k); });
          if (mode === 'n') {
            // lit from the front and below by the phone: cold, bright at the bottom
            g.save(); g.globalCompositeOperation = 'source-atop';
            const gr = g.createLinearGradient(6 * k, 0, -2 * k, -OBJ.h * k); gr.addColorStop(0, 'rgba(170,225,255,0.75)'); gr.addColorStop(0.45, 'rgba(130,190,255,0.28)'); gr.addColorStop(1, 'rgba(110,150,255,0.05)');
            g.fillStyle = gr; g.fillRect(-w / 2, -hh, w, hh * 1.2); g.restore();
          } else {
            g.save(); g.globalCompositeOperation = 'source-atop';
            const gr = g.createLinearGradient(-12 * k, -OBJ.h * k, 8 * k, 0); gr.addColorStop(0, 'rgba(255,240,210,0.35)'); gr.addColorStop(0.6, 'rgba(255,240,210,0)'); gr.addColorStop(1, 'rgba(60,30,0,0.18)');
            g.fillStyle = gr; g.fillRect(-w / 2, -hh, w, hh * 1.2); g.restore();
          }
        });
        objKey = roomKey;
      }

      /* the window, projected along a far light (sun, moon) onto the back wall, in screen space */
      function patchPoly(d) {
        const w = RM.win;
        return [[w.y0, w.z0], [w.y1, w.z0], [w.y1, w.z1], [w.y0, w.z1]].map(([yy, zz]) => { const tt = zz / Math.max(0.05, d[2]); return [RM.x0 + d[0] * tt * RM.k, RM.floor - (yy + d[1] * tt) * RM.k]; });
      }
      function polyPath(g, pts) { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); }
      // the screen box a shadow covers (so the crisp pass only touches those pixels)
      function shadowBox(Lt, parts, breath) {
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        const add = (s, r) => { x0 = Math.min(x0, s[0] - r); x1 = Math.max(x1, s[0] + r); y0 = Math.min(y0, s[1] - r); y1 = Math.max(y1, s[1] + r); };
        parts.forEach(pr => {
          const z = pr.z || 0;
          if (pr.t === 'ell') { const c = shadowPt(Lt, pr.x, pr.y, z, breath); add(c, Math.max(pr.rx, pr.ry) * c[2] * RM.k + 1); return; }
          const pts = pr.t === 'rr' ? [[pr.x, pr.y], [pr.x + pr.w, pr.y], [pr.x + pr.w, pr.y + pr.h], [pr.x, pr.y + pr.h]] : pr.t === 'arc' ? [[pr.x - pr.rad, pr.y - pr.rad], [pr.x + pr.rad, pr.y - pr.rad], [pr.x + pr.rad, pr.y + pr.rad], [pr.x - pr.rad, pr.y + pr.rad]] : pr.pts;
          const pad = pr.t === 'line' || pr.t === 'arc' ? pr.w : 0;
          pts.forEach(p => { const s = shadowPt(Lt, p[0], p[1], z, breath); add(s, pad * s[2] * RM.k + 1); });
        });
        return { x: x0 - 3, y: y0 - 3, w: x1 - x0 + 6, h: y1 - y0 + 6 };
      }
      // far light throws a sharp shadow: a crisp, true-size core inside the sun (or moon) patch, on top of the soft one
      const shC = document.createElement('canvas'); let shG = null;
      function drawCrisp(g, light, dir, a, fin) {
        const dpr = cv.dpr || 1, xR = M.phone ? M.W : RM.x1, top = RM.top, bot = RM.deskTop;
        const cw = Math.max(2, Math.ceil(M.W * dpr)), ch = Math.max(2, Math.ceil(bot * dpr));
        if (shC.width !== cw || shC.height !== ch) { shC.width = cw; shC.height = ch; shG = shC.getContext('2d'); }
        const b = shadowBox(light.Lt, OBJ.parts, light.breath);
        const bx = Math.max(RM.x0, b.x), by = Math.max(top, b.y), bw = Math.min(xR, b.x + b.w) - bx, bh = Math.min(bot, b.y + b.h) - by;
        if (bw < 2 || bh < 2) return;
        const sg = shG; sg.setTransform(1, 0, 0, 1, 0, 0); sg.clearRect(Math.floor(bx * dpr) - 1, Math.floor(by * dpr) - 1, Math.ceil(bw * dpr) + 3, Math.ceil(bh * dpr) + 3);
        sg.setTransform(dpr, 0, 0, dpr, 0, 0); sg.fillStyle = sg.strokeStyle = fin ? '#3a4470' : '#9a7656';
        shadowPath(sg, light.Lt, OBJ.parts, light.breath);
        g.save();
        g.beginPath(); g.rect(RM.x0, top, xR - RM.x0, bot - top); g.clip();
        polyPath(g, patchPoly(dir)); g.clip();
        g.globalCompositeOperation = 'multiply'; g.globalAlpha = Math.min(1, a);
        g.drawImage(shC, bx * dpr, by * dpr, bw * dpr, bh * dpr, bx, by, bw, bh);
        g.restore();
      }

      /* ---------------- the light buffer (low resolution, so every edge is soft) ---------------- */
      const lb = document.createElement('canvas'); let lg = null, lbScale = 1 / 3;
      function drawLightBuffer(t, fin) {
        const W = M.W, H = M.H, sc = lbScale, bw = Math.max(2, Math.round(W * sc)), bh = Math.max(2, Math.round(RM.deskTop * sc));
        if (lb.width !== bw || lb.height !== bh) { lb.width = bw; lb.height = bh; lg = lb.getContext('2d'); }
        const g = lg; g.setTransform(sc, 0, 0, sc, 0, 0); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, RM.deskTop);
        const night = 1 - sstep(0.15, 0.6, t), phone = G.phone * (1 - sstep(0.32, 0.6, t)), sun = sstep(0.42, 0.78, t), wash = sstep(0.3, 0.85, t);
        const xR = M.phone ? W : RM.x1;
        g.save(); g.beginPath(); g.rect(RM.x0, RM.top, xR - RM.x0, RM.deskTop - RM.top); g.clip();
        if (!fin && phone > 0.01) {
          const p = proj(RM.phoneL.x, RM.desk.y + 26, 0), r = 150 * RM.k;
          const gr = g.createRadialGradient(p[0], p[1], 0, p[0], p[1], r); gr.addColorStop(0, rgba('#b4dcff', 0.9 * phone)); gr.addColorStop(0.35, rgba('#8fb8ff', 0.42 * phone)); gr.addColorStop(1, 'rgba(120,150,255,0)');
          g.fillStyle = gr; g.fillRect(RM.x0, RM.top, xR - RM.x0, RM.deskTop - RM.top);
        }
        if (!fin && wash > 0.01) { g.fillStyle = rgba('#fff0d8', 0.1 * wash); g.fillRect(RM.x0, RM.top, xR - RM.x0, RM.deskTop - RM.top); }
        const patch = (col, a, d) => { g.fillStyle = rgba(col, a); polyPath(g, patchPoly(d)); g.fill(); };
        const dawnK = fin ? 0 : Math.max(0, 1 - Math.abs(t - 0.5) / 0.22);
        if (dawnK > 0.01) {
          const gr = g.createLinearGradient(RM.x0, 0, xR, 0); gr.addColorStop(0, rgba(MORN.dawn[1], 0.26 * dawnK)); gr.addColorStop(1, rgba(MORN.dawn[1], 0.04 * dawnK));
          g.fillStyle = gr; g.fillRect(RM.x0, RM.top, xR - RM.x0, RM.deskTop - RM.top);
        }
        if (!fin && sun > 0.01) patch(mixHex('#ffa46a', '#ffdcae', sstep(0.45, 0.92, t)), 0.5 * sun, sunV(t));
        if (fin) { patch('#b4c4ff', 0.42 * fin * (0.6 + 0.4 * MOONLIT), MOONV); g.fillStyle = rgba('#9fb2ff', 0.08 * fin); g.fillRect(RM.x0, RM.top, xR - RM.x0, RM.deskTop - RM.top); }
        // the shadow: no light gets through the object (and at night, the tired brain adds teeth)
        const Lt = lightAt(t, fin), breath = 1 + (reduced() || fin ? 0 : 0.03 * night * Math.sin(now() / 1000 * 1.1));
        g.globalCompositeOperation = 'destination-out';
        g.fillStyle = 'rgba(0,0,0,' + (fin ? 0.9 : lerp(0.96, 0.82, wash)).toFixed(3) + ')'; g.strokeStyle = g.fillStyle;
        shadowPath(g, Lt, OBJ.parts, breath);
        if (night > 0.02 && !fin) { g.globalAlpha = night; shadowPath(g, Lt, OBJ.extra, breath, 0.4 + 0.6 * night); g.globalAlpha = 1; }
        // a slit of light for a mouth
        if (night > 0.05 && !fin) {
          g.globalCompositeOperation = 'source-over'; g.fillStyle = rgba('#ffcf8a', 0.55 * night * phone);
          g.beginPath(); OBJ.mouth.forEach((p, i) => { const s = shadowPt(Lt, p[0], p[1], OBJ.mz, breath); if (i) g.lineTo(s[0], s[1]); else g.moveTo(s[0], s[1]); }); g.closePath(); g.fill();
        }
        g.restore();
        return { Lt, breath, night, phone, sun, wash };
      }

      /* ---------------- sky in the window ---------------- */
      function drawSky(g, t, fin, tt) {
        const bx = RM.winBox, wp = RM.winPoly;
        g.save(); g.beginPath(); wp.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.clip();
        const day = sstep(0.42, 0.85, t), dawn = Math.max(0, 1 - Math.abs(t - 0.5) / 0.22) * (fin ? 0 : 1), br = isBright();
        const top = mixHex(mixHex(br ? '#2c3570' : '#0a0e2a', MORN.dawn[0], dawn * 0.8), MORN.sky[0], day), bot = mixHex(mixHex(br ? '#46508a' : '#1a1f4a', MORN.dawn[1], dawn), MORN.sky[1], day);
        const gr = g.createLinearGradient(0, bx.y, 0, bx.y + bx.h); gr.addColorStop(0, top); gr.addColorStop(0.75, bot); gr.addColorStop(1, mixHex(bot, MORN.dawn[2], dawn * 0.8));
        g.fillStyle = gr; g.fillRect(bx.x - 2, bx.y - 2, bx.w + 4, bx.h + 4);
        // stars and tonight's moon
        const night = 1 - sstep(0.3, 0.55, t);
        if (night > 0.02) {
          g.fillStyle = '#ffffff';
          STARS.forEach(s => { const a = night * (0.35 + 0.45 * Math.sin(tt * s.v + s.p)) * (reduced() ? 0.8 : 1); if (a <= 0.02) return; g.globalAlpha = a; g.fillRect(bx.x + s.x * bx.w, bx.y + s.y * bx.h * 0.8, s.s, s.s); });
          g.globalAlpha = 1;
          const mx = bx.x + bx.w * 0.62, my = lerp(bx.y + bx.h * 0.2, bx.y + bx.h * 0.95, sstep(0.05, 0.55, fin ? 0 : t)), mr = Math.max(7, bx.w * 0.16);
          drawMoon(g, mx, my, mr, night);
        }
        // the horizon: roofs, a few windows still lit at night
        const hy = RM.sill - (M.phone ? 22 : 30);
        g.fillStyle = mixHex(br ? '#2a3058' : '#070a1c', '#7a8aa6', day * 0.8);
        let x = bx.x - 4;
        ROOFS.forEach(rf => { const w = rf.w * bx.w * 3, hh = rf.h * bx.h * 1.4; g.fillRect(x, hy - hh, w, bx.y + bx.h - hy + hh + 4); if (rf.lit && night > 0.05) { g.fillStyle = rgba('#ffd27a', 0.8 * night); g.fillRect(x + w * 0.4, hy - hh * 0.6, 3, 4); g.fillStyle = mixHex(br ? '#2a3058' : '#070a1c', '#7a8aa6', day * 0.8); } x += w + 2; });
        g.fillRect(bx.x - 4, hy, bx.w + 8, bx.h);
        // the sun, rising from behind the roofs
        if (!fin) {
          const sy = sunY(t), sx = RM.sunX, r = Math.max(9, bx.w * 0.17);
          const glowA = 0.3 + 0.7 * sstep(0.35, 0.7, t);
          g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = glowA; const gs = r * 5; g.drawImage(K.glowSprite('#ffb066'), sx - gs, sy - gs, gs * 2, gs * 2); g.restore();
          const sg = g.createRadialGradient(sx - r * 0.3, sy - r * 0.3, 0, sx, sy, r); sg.addColorStop(0, '#fffbe8'); sg.addColorStop(0.6, mixHex('#ffb45a', '#fff1c4', day)); sg.addColorStop(1, mixHex('#ff8a3d', '#ffe39a', day));
          g.fillStyle = sg; g.beginPath(); g.arc(sx, sy, r, 0, TAU); g.fill();
          // the roofs in front of the low sun
          if (sy > hy - r) { g.fillStyle = mixHex(br ? '#2a3058' : '#070a1c', '#7a8aa6', day * 0.8); g.fillRect(bx.x - 4, hy, bx.w + 8, bx.h); }
        }
        // a few clouds by day
        if (day > 0.05 && MORN.clouds) { g.fillStyle = rgba('#ffffff', 0.55 * day); for (let i = 0; i < MORN.clouds; i++) { const cx = bx.x + ((i * 0.37 + tt * 0.004) % 1) * bx.w, cy = bx.y + bx.h * (0.12 + i * 0.09); g.beginPath(); g.ellipse(cx, cy, bx.w * 0.3, bx.h * 0.025, 0, 0, TAU); g.fill(); } }
        g.restore();
      }
      function drawMoon(g, x, y, r, a) {
        const p = moonP, lit = (1 - Math.cos(p * TAU)) / 2;
        g.save(); g.globalAlpha = a * (0.08 + 0.92 * lit);
        g.globalCompositeOperation = 'lighter'; g.drawImage(K.glowSprite('#c8d4ff'), x - r * 4, y - r * 4, r * 8, r * 8); g.globalCompositeOperation = 'source-over'; g.globalAlpha = a;
        g.fillStyle = 'rgba(70,80,120,' + (0.3 + 0.25 * lit).toFixed(3) + ')'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
        if (lit > 0.02) {
          const waxing = p < 0.5, rightLit = SOUTH ? !waxing : waxing, k = Math.cos(p * TAU); // 1 new, -1 full
          g.fillStyle = '#f4f1e2'; g.beginPath();
          g.arc(x, y, r, -Math.PI / 2, Math.PI / 2, !rightLit);
          g.ellipse(x, y, Math.abs(k) * r, r, 0, Math.PI / 2, -Math.PI / 2, (k > 0) === rightLit);
          g.closePath(); g.fill();
        }
        g.restore();
      }
      /* the phone (face up, its screen light fading as the morning comes), the clock, the 10 a.m. spot */
      function drawDesk(g, t, tt, fin, light) {
        const o = RM.obj, P = RM.phoneL, k = RM.k, night = light.night;
        // contact shadow under the object
        if (objBox) { g.save(); g.globalAlpha = 0.35 + 0.35 * sstep(0.4, 1, t); g.drawImage(objSh, objBox.x + (1 - sstep(0.4, 1, t)) * -6, objBox.y, objBox.w, objBox.h); g.restore(); }
        // the sun's patch on the desk by day
        if (light.sun > 0.01 && !fin) {
          const s = RM.spot, a = proj(s.x - s.w * 1.4, RM.desk.y, s.z - s.d * 1.2), b = proj(s.x + s.w * 1.6, RM.desk.y, s.z - s.d * 1.2), c = proj(s.x + s.w * 1.2, RM.desk.y, s.z + s.d * 1.4), d = proj(s.x - s.w * 1.8, RM.desk.y, s.z + s.d * 1.4);
          g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = rgba('#ffd9a0', 0.35 * light.sun); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath(); g.fill(); g.restore();
        }
        if (G.showSpot && !G.placed) {
          const s = RM.spot, a = proj(s.x - s.w / 2, RM.desk.y, s.z - s.d / 2), b = proj(s.x + s.w / 2, RM.desk.y, s.z - s.d / 2), c = proj(s.x + s.w / 2, RM.desk.y, s.z + s.d / 2), d = proj(s.x - s.w / 2, RM.desk.y, s.z + s.d / 2);
          g.save(); g.setLineDash([5, 5]); g.lineDashOffset = -tt * 12; g.strokeStyle = rgba('#ffd9a0', 0.75 + 0.25 * Math.sin(tt * 3)); g.lineWidth = 2;
          g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath(); g.stroke(); g.restore();
          g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.25 + 0.1 * Math.sin(tt * 2); const cx = (a[0] + c[0]) / 2, cy = (a[1] + c[1]) / 2; g.drawImage(K.glowSprite('#ffcf8a'), cx - 40, cy - 30, 80, 60); g.restore();
        }
        // phone
        const p0 = proj(P.x - 3.6, RM.desk.y, P.z - 7.5), p1 = proj(P.x + 3.6, RM.desk.y, P.z - 7.5), p2 = proj(P.x + 3.8, RM.desk.y, P.z + 7.5), p3 = proj(P.x - 3.8, RM.desk.y, P.z + 7.5);
        g.fillStyle = '#0b0c14'; g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]); g.lineTo(p3[0], p3[1]); g.closePath(); g.fill();
        const scr = G.phone * (1 - sstep(0.3, 0.55, t)) * (fin ? 0 : 1);
        if (scr > 0.01) {
          const inset = (pa, pb, f) => [lerp(pa[0], pb[0], f), lerp(pa[1], pb[1], f)];
          const q0 = inset(p0, p2, 0.08), q2 = inset(p2, p0, 0.08), q1 = inset(p1, p3, 0.08), q3 = inset(p3, p1, 0.08);
          g.fillStyle = rgba('#9fdcff', 0.85 * scr); g.beginPath(); g.moveTo(q0[0], q0[1]); g.lineTo(q1[0], q1[1]); g.lineTo(q2[0], q2[1]); g.lineTo(q3[0], q3[1]); g.closePath(); g.fill();
          g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.55 * scr; const c = [(p0[0] + p2[0]) / 2, (p0[1] + p2[1]) / 2]; g.drawImage(K.glowSprite('#8fd0ff'), c[0] - 40 * k / 2, c[1] - 26 * k / 2, 40 * k, 26 * k); g.restore();
        }
        // the alarm clock, seven-segment digits
        const ck = RM.clock, cb0 = proj(ck.x - 7, RM.desk.y + 7.5, ck.z), cb1 = proj(ck.x + 7, RM.desk.y, ck.z);
        const cw = cb1[0] - cb0[0], ch = cb1[1] - cb0[1];
        g.fillStyle = isBright() && night > 0.5 ? '#2c2a44' : night > 0.5 ? '#141220' : '#3b3346'; rrPath(g, cb0[0], cb0[1], cw, ch, 4); g.fill();
        g.fillStyle = '#05050a'; rrPath(g, cb0[0] + cw * 0.08, cb0[1] + ch * 0.14, cw * 0.84, ch * 0.66, 2); g.fill();
        const mins = clockMinutes(t, fin), hh = Math.floor(mins / 60) % 12 || 12, mm = Math.floor(mins % 60);
        drawDigits(g, cb0[0] + cw * 0.14, cb0[1] + ch * 0.22, cw * 0.72, ch * 0.5, (hh < 10 ? ' ' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm, night > 0.4 ? '#ff9e4a' : '#e0703a', night);
        void o; void tt;
      }
      function rrPath(g, x, y, w, hh, r) { r = Math.min(r, w / 2, hh / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
      const SEG = { '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcfgd', ' ': '' };
      function drawDigits(g, x, y, w, hh, str, col, glow) {
        const n = str.replace(':', '').length, dw = w / (n + 0.45), sw = Math.max(1.2, dw * 0.16);
        let cx = x;
        if (glow > 0.3) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35 * glow; g.drawImage(K.glowSprite(col), x - 6, y - 6, w + 12, hh + 12); g.restore(); }
        g.fillStyle = col;
        for (const ch of str) {
          if (ch === ':') { g.fillRect(cx + dw * 0.05, y + hh * 0.28, sw, sw); g.fillRect(cx + dw * 0.05, y + hh * 0.66, sw, sw); cx += dw * 0.45; continue; }
          const segs = SEG[ch] || '', a = dw * 0.12, b = dw * 0.72, hm = hh / 2;
          const R2 = { a: [a, 0, b, sw], g: [a, hm - sw / 2, b, sw], d: [a, hh - sw, b, sw], f: [a - sw * 0.2, sw * 0.6, sw, hm - sw], b: [a + b - sw * 0.8, sw * 0.6, sw, hm - sw], e: [a - sw * 0.2, hm + sw * 0.4, sw, hm - sw], c: [a + b - sw * 0.8, hm + sw * 0.4, sw, hm - sw] };
          for (const sg of segs) { const r2 = R2[sg]; g.fillRect(cx + r2[0], y + r2[1], r2[2], r2[3]); }
          cx += dw;
        }
      }
      function clockMinutes(t, fin) { return fin ? 187 + 16 + G.finale * 6 : 187 + 413 * t; }
      function timeLabel(t) { const m = Math.round(clockMinutes(t, 0)), hh = Math.floor(m / 60) % 12 || 12, mm = m % 60; return hh + ':' + (mm < 10 ? '0' : '') + mm + ' a.m.'; }

      /* ---------------- the frame ---------------- */
      let pace = 0;
      K.loop((dt, tt) => {
        const g = cv.g; if (!g || !M.W) return;
        if (SOFT) { pace++; if (pace % 2 && G.phase !== 'scrub' && G.phase !== 'twist') return; }
        const key = M.W + 'x' + M.H + ':' + (cv.dpr || 1) + ':' + (isBright() ? 'b' : 'd');
        if (roomKey !== key) renderRoom();
        if (objKey !== roomKey) renderObject();
        const tn = now(), rdt = Math.min(0.4, Math.max(0, (tn - (G.lastNow || tn)) / 1000)); G.lastNow = tn;
        // the sun follows the finger on a soft spring: a slow, heavy sunrise
        const kS = 26, cS = 2 * Math.sqrt(kS) * 0.95;
        for (let rem = rdt; rem > 1e-4; rem -= 0.025) { const st = Math.min(0.025, rem); G.sunV += (kS * (G.tT - G.t) - cS * G.sunV) * st; G.t += G.sunV * st; }
        G.t = clamp(G.t, 0, 1);
        const t = G.t, W = M.W, H = M.H, fin = G.finale;
        onTime(t);
        // draw
        g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0);
        g.fillStyle = '#05060f'; g.fillRect(0, 0, W, H);
        drawSky(g, t, fin, tt);
        const day = fin ? 0 : sstep(0.3, 0.85, t);
        g.drawImage(roomN, 0, 0, W, H);
        if (day > 0.01) { g.globalAlpha = day; g.drawImage(roomD, 0, 0, W, H); g.globalAlpha = 1; }
        const light = drawLightBuffer(t, fin);
        g.save(); g.globalCompositeOperation = 'lighter'; g.imageSmoothingEnabled = true; g.drawImage(lb, 0, 0, lb.width, lb.height, 0, 0, W, lb.height / lbScale); g.restore();
        const farA = fin ? 0.55 * fin : 0.62 * light.sun;
        if (farA > 0.02) drawCrisp(g, light, fin ? MOONV : sunV(t), farA, fin);
        // the object on the desk
        if (objBox) {
          g.drawImage(objN, objBox.x, objBox.y, objBox.w, objBox.h);
          if (day > 0.01) { g.globalAlpha = day; g.drawImage(objD, objBox.x, objBox.y, objBox.w, objBox.h); g.globalAlpha = 1; }
        }
        drawDesk(g, t, tt, fin, light);
        // the shadow's eyes: two warm glints that blink, only while the night is doing the drawing
        if (light.night > 0.03 && !fin) {
          if (tt > (G.nextBlink || 0)) { G.blinkUntil = tt + 0.16; G.nextBlink = tt + 2.5 + Math.random() * 4; }
          const open = tt < (G.blinkUntil || 0) ? 0.08 : 1;
          OBJ.eyes.forEach(e => { const s = shadowPt(light.Lt, e[0], e[1], OBJ.ez, light.breath), r = Math.max(2.2, OBJ.er * s[2] * RM.k); if (s[1] > RM.deskTop - 4) return;
            g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = light.night * light.phone; g.drawImage(K.glowSprite('#ffb347'), s[0] - r * 3.2, s[1] - r * 3.2, r * 6.4, r * 6.4); g.restore();
            g.fillStyle = rgba('#ffe2a8', light.night * light.phone); g.beginPath(); g.ellipse(s[0], s[1], r, r * open, 0, 0, TAU); g.fill(); });
        }
        // dust drifting in the morning beam
        if (light.sun > 0.2 && !reduced() && Math.random() < 0.25 * light.sun) FX.emit('mote', RM.x0 + Math.random() * (W - RM.x0) * 0.6, RM.top + Math.random() * (RM.deskTop - RM.top), 1, { colors: ['#fff3d6', '#ffe9b8'], speed: [3, 10] });
        if (light.sun < 0.35 && FX.count()) FX.list.forEach(q => { q.age += dt * 4 * (1 - light.sun / 0.35); });
        FX.update(dt); FX.draw(g);
        // a soft vignette, and lights-out at the very end
        if (fin > 0.01) { const dim = G.dim; if (dim > 0.01) { g.fillStyle = 'rgba(3,4,12,' + (dim * 0.62).toFixed(3) + ')'; g.fillRect(0, 0, W, H); } }
        updateDom(t, light);
      });
      function updateDom(t, light) {
        const dayK = sstep(0.38, 0.86, t);
        const sOn = (G.phase === 'scrub' || G.phase === 'twist') && t > 0.965;
        if (sOn !== !!G.sizeOn) { G.sizeOn = sOn; sizeEl.classList.toggle('on', sOn); }
        if (Math.abs((G.lastDomT == null ? -1 : G.lastDomT) - t) > 0.003 || G.forceDom) {
          G.lastDomT = t; G.forceDom = false;
          const nOp = 1 - sstep(0.36, 0.5, t), dOp = sstep(0.55, 0.74, t);
          nightBox.style.opacity = (G.textOff ? 0 : nOp).toFixed(3); dayBox.style.opacity = (G.textOff ? 0 : dOp).toFixed(3);
          pill.classList.toggle('day', dayK > 0.5 && !G.finale);
          // pinned notes are paper in a dark room too: they dim as the night comes back
          if (G.phase === 'twist' && G.facts.length) factsEl.style.filter = 'brightness(' + (0.42 + 0.58 * dayK).toFixed(3) + ')';
        }
        void light;
      }
      function onTime(t) {
        if (G.finale) return;
        // the clock label, hour chimes, the soundscape following the sun
        const lbl = timeLabel(t);
        if (lbl !== G.lbl) {
          G.lbl = lbl; pill.firstChild.textContent = lbl;
          pill.lastChild.textContent = t < 0.35 ? 'Night shift' : t < 0.56 ? 'First light' : t < 0.98 ? 'Morning' : 'Daylight';
          sunHit.setAttribute('aria-valuenow', String(Math.round(t * 100))); sunHit.setAttribute('aria-valuetext', lbl);
        }
        const hr = Math.floor(clockMinutes(t, 0) / 60);
        if (hr !== G.hourSeen) { const up = hr > G.hourSeen; G.hourSeen = hr; if (A.ctx && (G.phase === 'scrub' || G.phase === 'twist')) A.chime(A.note(HOURS[clamp(hr - 3, 0, HOURS.length - 1)]), { vol: up ? 0.05 : 0.035, dur: 1.8 }); }
        const day = sstep(0.35, 0.9, t);
        nightBed.level(0.32 * (1 - day)); dayBed.level(0.4 * day);
        dawnAmb.level(Math.max(0.0001, 0.6 * sstep(0.45, 0.85, t)), 0.6);
        if (air) { air.level(Math.min(0.05, Math.abs(G.sunV) * 0.12), 0.08); air.freq(300 + 900 * t, 0.1); }
        G.maxT = Math.max(G.maxT, t);
        // tomorrow's facts pin themselves up as the morning arrives
        if (G.phase === 'scrub') {
          const th = G.facts.length === 2 ? [0.78, 0.985] : [0.7, 0.85, 0.985];
          G.facts.forEach((f, i) => { if (!f.on && t >= th[i]) showFact(i); });
        }
      }

      /* ---------------- facts on the wall ---------------- */
      function buildFacts() {
        factsEl.replaceChildren();
        G.facts = factsList().map((f, i) => {
          const e = h('div', { class: 'ns-fact', style: { '--rot': ['-1.6deg', '1.2deg', '-0.8deg'][i] } }, h('small', { text: f.tag }), f.user ? h('span', { class: 'gk-user', text: f.text }) : h('span', { text: f.text }));
          factsEl.append(e); return { el: e, on: false };
        });
      }
      function showFact(i) {
        const f = G.facts[i]; if (!f || f.on) return; f.on = true; G.factsOn++;
        f.el.classList.add('on');
        if (A.ctx) { A.paper({ vol: 0.06 }); A.chime(A.note(['E5', 'G5', 'C6'][i % 3]), { when: A.now() + 0.08, vol: 0.05, dur: 1.6 }); }
        ctx.track('fact', { i });
      }

      /* ---------------- input: the sun ---------------- */
      K.drag(sunHit, {
        start: (p, e) => {
          if (G.phase !== 'scrub' && G.phase !== 'twist') return false;
          G.drag = true; G.last = { y: p.y, t: now() };
          K.sfx.tap(); if (A.ctx) A.tone({ type: 'sine', freq: 330 + G.t * 300, dur: 0.18, vol: 0.04, attack: 0.02 });
          aimSun(p.y); void e;
        },
        move: (p) => {
          if (!G.drag) return;
          const t0 = now(), dts = Math.max(1, t0 - G.last.t) / 1000, sp = Math.abs(p.y - G.last.y) / dts; G.last = { y: p.y, t: t0 };
          if (sp > 3) { G.moving += dts; if (sp < M.H * 0.55) G.calm += dts; }
          aimSun(p.y);
          if (t0 - (G.gd || 0) > 400) { G.gd = t0; K.guideDone(); }
        },
        end: () => { G.drag = false; stepGuide(); }
      });
      function aimSun(localY) {
        const y = RM.sunHit.y + localY, t = clamp((RM.sill + 18 - y) / Math.max(40, (RM.sill + 18) - (RM.winTop + 24)), 0, 1);
        G.tT = t;
      }
      S.listen(sunHit, 'keydown', (e) => {
        if (G.phase !== 'scrub' && G.phase !== 'twist') return;
        const d = e.key === 'ArrowUp' || e.key === 'ArrowRight' ? 0.05 : e.key === 'ArrowDown' || e.key === 'ArrowLeft' ? -0.05 : 0;
        if (d) { e.preventDefault(); G.tT = clamp(G.tT + d, 0, 1); }
      });
      function stepGuide() {
        if (G.phase === 'scrub' && G.t < 0.985) K.guide({ id: 'sun', g: 'drag', target: () => ({ x: RM.sunX, y: sunY(G.t) }), dx: 0, dy: -Math.max(60, (sunY(G.t) - sunY(1)) * 0.85), label: G.t > 0.1 ? 'KEEP IT RISING' : 'DRAG THE SUN UP', place: 'below', delay: 900 });
        else if (G.phase === 'twist' && G.t > 0.03) K.guide({ id: 'back', g: 'drag', target: () => ({ x: RM.sunX, y: sunY(G.t) }), dx: 0, dy: Math.max(60, (sunY(0) - sunY(G.t)) * 0.85), label: 'BACK TO 3 A.M.', place: 'below', delay: 900 });
      }

      /* ---------------- the letter: fold, fold, seal, place ---------------- */
      function letterSize() { const b = M.phone ? { w: Math.min(310, M.W - 40), h: 236 } : { w: 380, h: 260 }; if (G.letterH) b.h = Math.max(b.h, G.letterH); return b; }
      function placeLetter() {
        const s = letterSize(), x = Math.round(M.W / 2 - s.w / 2), y = Math.round(M.phone ? 196 : 170);
        const e = G.letterEl; if (!e) return;
        if (G.lstage === 'fold1') Object.assign(e.style, { left: x + 'px', top: y + 'px', width: s.w + 'px', height: s.h + 'px' });
        if (G.lstage === 'fold2') Object.assign(e.style, { left: x + 'px', top: y + 'px', width: s.w + 'px', height: (s.h / 2) + 'px' });
        G.lbox = { x, y, w: s.w, h: s.h };
      }
      function letterInk() {
        const nt = nightText().replace(/[.!]$/, ''), sup = support();
        const start = care() ? 'Ask someone qualified exactly where you stand.' : (noWords ? 'Breakfast first. Then one small step.' : (leadOf(sup === 'weak' ? 'ask' : 'prepare') || 'One small, doable step.'));
        const ink = h('div', { class: 'ns-ink' },
          h('h4', { text: 'Dear 10 a.m. me,' }),
          h('p', null, document.createTextNode('At 3 a.m. this felt like: '), noWords ? h('q', { text: 'everything is going wrong' }) : h('q', null, h('span', { class: 'gk-user', text: nt }))),
          h('p', null, document.createTextNode('Please look again in daylight, then:'), h('br'), h('b', { class: 'ns-step', text: start })),
          h('p', { class: 'ns-sign', text: '3 a.m. me' }));
        return ink;
      }
      function showLetter() {
        const s = letterSize();
        const topInk = letterInk(), botInk = letterInk();
        topInk.style.top = '0px'; topInk.style.height = s.h + 'px'; botInk.style.top = -(s.h / 2) + 'px'; botInk.style.height = s.h + 'px';
        const e = h('div', { class: 'ns-letter', role: 'img', 'aria-label': 'A note to 10 a.m. you. Drag the bottom up to fold it.' },
          h('div', { class: 'ns-half ns-top ns-paper' }, topInk),
          h('div', { class: 'ns-half ns-bot' }, h('div', { class: 'ns-face ns-front ns-paper' }, botInk, h('div', { class: 'ns-shade' })), h('div', { class: 'ns-face ns-back ns-paperback' }, h('div', { class: 'ns-ghost' }))),
          h('div', { class: 'ns-crease' }));
        G.letterEl = e; G.lstage = 'fold1'; el.append(e); placeLetter();
        // long words get a taller sheet: measure the ink once, before anything moves
        topInk.style.height = 'auto';
        const need = Math.ceil(topInk.offsetHeight) + 4;
        if (need > s.h) {
          G.letterH = Math.min(need, M.phone ? 360 : 380); const s2 = letterSize();
          topInk.style.height = s2.h + 'px'; botInk.style.height = s2.h + 'px'; botInk.style.top = -(s2.h / 2) + 'px'; placeLetter();
        } else topInk.style.height = s.h + 'px';
        let f = 0;
        K.drag(e, {
          start: () => { if (G.lstage !== 'fold1' || G.phase !== 'fold1') return false; K.sfx.paper(); },
          move: (p, d) => { if (G.lstage !== 'fold1') return; f = clamp(-d.dy / (s.h * 0.55), 0, 1); e.style.setProperty('--f1', f.toFixed(3)); if (Math.random() < 0.2 && A.ctx) A.paper({ vol: 0.03 }); },
          end: () => { if (G.lstage !== 'fold1') return; if (f > 0.42) finishFold1(); else { K.anim(260, (k) => e.style.setProperty('--f1', (f * (1 - k)).toFixed(3))); f = 0; K.sfx.soft(); } }
        });
      }
      function finishFold1() {
        const e = G.letterEl; G.lstage = 'fold1done'; K.guide(null);
        const f0 = parseFloat(e.style.getPropertyValue('--f1')) || 0.5;
        K.anim(320, (k) => e.style.setProperty('--f1', (f0 + (1 - f0) * k).toFixed(3)), K.ease.outCubic).then(() => {
          if (A.ctx) { A.paper({ vol: 0.1 }); A.click({ vol: 0.08 }); }
          // the folded half becomes a new piece of paper for the second fold
          const s = letterSize(), f2 = h('div', { class: 'ns-fold2', role: 'img', 'aria-label': 'Folded note. Drag the right side over to fold it again.' },
            h('div', { class: 'ns-l ns-paperback' }, h('div', { class: 'ns-ghost', style: { right: '0px' } })), h('div', { class: 'ns-r' }, h('div', { class: 'ns-face ns-front ns-paperback' }, h('div', { class: 'ns-ghost', style: { left: '0px' } })), h('div', { class: 'ns-face ns-back ns-paperback' }, h('div', { class: 'ns-addr', text: 'For 10 a.m. me' }))), h('div', { class: 'ns-vcrease' }));
          e.remove(); G.letterEl = f2; G.lstage = 'fold2'; el.append(f2); placeLetter();
          G.phase = 'fold2';
          sayStill({ Jolly: 'And once more. Neat corners not required.', Cheeky: 'Fold it again. Origami standards are relaxed at 3 a.m.', Unfiltered: 'Fold it again.' }, 'calm', 3000);
          K.guide({ id: 'fold2', g: 'drag', target: f2, ox: 0.82, dir: 'l', d: Math.round(s.w * 0.36), label: 'FOLD IT AGAIN', place: 'below', delay: 500 });
          let f = 0;
          K.drag(f2, {
            start: () => { if (G.lstage !== 'fold2') return false; K.sfx.paper(); },
            move: (p, d) => { if (G.lstage !== 'fold2') return; f = clamp(-d.dx / (s.w * 0.5), 0, 1); f2.style.setProperty('--f2', f.toFixed(3)); },
            end: () => { if (G.lstage !== 'fold2') return; if (f > 0.42) finishFold2(f); else { K.anim(260, (k) => f2.style.setProperty('--f2', (f * (1 - k)).toFixed(3))); f = 0; K.sfx.soft(); } }
          });
        });
      }
      function finishFold2(f0) {
        const e = G.letterEl; G.lstage = 'fold2done'; K.guide(null);
        K.anim(300, (k) => e.style.setProperty('--f2', (f0 + (1 - f0) * k).toFixed(3)), K.ease.outCubic).then(() => {
          if (A.ctx) { A.paper({ vol: 0.1 }); A.click({ vol: 0.08 }); }
          const s = letterSize(), w = Math.round(s.w / 2), hh = Math.round(s.h / 2);
          const wax = h('div', { class: 'ns-wax', html: '<svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="17" fill="none" stroke="rgba(255,210,200,.55)" stroke-width="1.5"/><path d="M25 11a11 11 0 1 0 0 22a9 9 0 1 1 0-22z" fill="rgba(255,220,210,.75)"/><circle cx="29" cy="15" r="2.4" fill="rgba(255,230,190,.85)"/></svg>' }, h('div', { class: 'ns-sealring' }));
          const hit = h('div', { class: 'ns-sealhit', role: 'button', 'aria-label': 'Press and hold to seal the note with wax' });
          // the note starts exactly where the fold left it (the left half), then glides to the middle
          const note = h('div', { class: 'ns-note', style: { left: G.lbox.x + 'px', top: G.lbox.y + 'px', width: w + 'px', height: hh + 'px' } }, h('div', { class: 'ns-addr', text: 'For 10 a.m. me' }), wax, hit);
          e.remove(); G.letterEl = null; G.noteEl = note; G.noteSize = { w, h: hh }; el.append(note);
          S.later(() => { note.classList.add('glide'); placeNoteHome(); S.later(() => note.classList.remove('glide'), 520); }, 60);
          G.phase = 'seal';
          sayLoopie({ Jolly: 'Seal it! My shift ends when that wax sets.', Cheeky: 'Seal it. I’d like to clock off, please.', Unfiltered: 'Seal it. Shift over.' }, 'sleepy', 3200);
          K.guide({ id: 'seal', g: 'hold', target: hit, label: 'HOLD TO SEAL', ms: 1600, place: 'below', delay: 600 });
          let crack = 0;
          K.hold(hit, {
            ms: [900, 1300, 1500][inten] || 1300, decay: 0.8,
            start: () => { K.sfx.tap(); if (A.ctx) A.tone({ type: 'sine', freq: 110, to: 90, dur: 0.4, vol: 0.05, attack: 0.05 }); },
            progress: (k, active) => {
              wax.style.setProperty('--w', Math.min(1, k * 1.15).toFixed(3));
              if (active && A.ctx && now() - crack > 90) { crack = now(); A.noise({ filter: 'bandpass', freq: 1800 + Math.random() * 2400, q: 2, dur: 0.02, vol: 0.02 + Math.random() * 0.02 }); }
            },
            done: () => {
              wax.style.setProperty('--w', '1'); K.anim(380, (k) => wax.style.setProperty('--st', k.toFixed(3)));
              if (A.ctx) { A.thud({ vol: 0.12 }); A.chime(A.note('G4'), { when: A.now() + 0.12, vol: 0.05, dur: 2 }); }
              S.buzz([12, 40, 20]);
              ctx.track('seal', {});
              S.later(postStep, 700);
            }
          });
        });
      }
      function placeNoteHome() { const n = G.noteEl; if (!n || !G.lbox) return; n.style.left = (G.lbox.x + G.noteSize.w / 2) + 'px'; n.style.top = G.lbox.y + 'px'; }
      function spotScreen() { const s = RM.spot, c = proj(s.x, RM.desk.y, s.z); return { x: c[0], y: c[1] }; }
      function postStep() {
        G.phase = 'post'; G.showSpot = true;
        const n = G.noteEl, sp = spotScreen();
        const lab = h('div', { class: 'ns-spot', text: '10 a.m. sun lands here', style: { left: sp.x + 'px', top: (sp.y - 26) + 'px' } });
        el.append(lab); G.spotLab = lab;
        sayStill({ Jolly: 'Leave it where the 10 a.m. sun will land. It has an appointment.', Cheeky: 'Pop it in the morning sunshine spot. The worry has a booking.', Unfiltered: 'Put it in the 10 a.m. spot.' }, 'calm', 3600);
        const r0 = K.rectIn(n);
        K.guide({ id: 'post', g: 'drag', target: n, dx: sp.x - (r0.x + r0.w / 2), dy: sp.y - 12 - (r0.y + r0.h / 2), label: 'LEAVE IT FOR 10 A.M.', delay: 700 });
        let st = null;
        K.drag(n, {
          space: el,
          start: (p) => { if (G.phase !== 'post' || G.placed) return false; const r = K.rectIn(n); st = { ox: p.x - r.x, oy: p.y - r.y }; n.classList.add('lift'); K.sfx.paper(); },
          move: (p) => { if (!st) return; n.style.left = (p.x - st.ox) + 'px'; n.style.top = (p.y - st.oy) + 'px'; const t0 = now(); if (t0 - (G.gd || 0) > 400) { G.gd = t0; K.guideDone(); } },
          end: () => {
            if (!st) return; st = null; n.classList.remove('lift');
            const r = K.rectIn(n), s2 = spotScreen(), d = Math.hypot(r.x + r.w / 2 - s2.x, r.y + r.h / 2 - (s2.y - 10));
            if (d < Math.max(70, r.w * 0.9)) placeNote(); else { K.sfx.soft(); K.guide({ id: 'post2', g: 'drag', target: n, dx: s2.x - (r.x + r.w / 2), dy: s2.y - 12 - (r.y + r.h / 2), label: 'LEAVE IT FOR 10 A.M.', delay: 900 }); }
          }
        });
      }
      function placeNote() {
        if (G.placed) return; G.placed = true; G.showSpot = false; K.guide(null);
        const n = G.noteEl, sp = spotScreen(), w = Math.round(G.noteSize.w * 0.5), hh = Math.round(G.noteSize.h * 0.42);
        n.classList.add('placed'); Object.assign(n.style, { left: (sp.x - w / 2) + 'px', top: (sp.y - hh * 0.75) + 'px', width: w + 'px', height: hh + 'px' });
        n.querySelector('.ns-wax').style.transform = 'scale(.5)';
        if (G.spotLab) { G.spotLab.classList.add('ns-out'); const l = G.spotLab; S.later(() => l.remove(), 500); }
        if (A.ctx) { A.paper({ vol: 0.08 }); ['C5', 'E5', 'G5'].forEach((nn, i) => A.chime(A.note(nn), { when: A.now() + 0.2 + i * 0.12, vol: 0.045, dur: 2.2 })); }
        S.later(() => { const tag = h('div', { class: 'ns-tag', text: 'Open at 10 a.m.', style: { left: sp.x + 'px', top: (sp.y - hh - 6) + 'px' } }); el.append(tag); G.tagEl = tag; }, 650);
        ctx.track('post', {});
        S.later(finale, 1500);
      }

      /* ---------------- lines (every one in three vibes) ---------------- */
      const LN = {
        start: visits ? { Jolly: 'Back on the night shift? 3:07 again. Let’s bring the morning in.', Cheeky: '3 a.m., my old friend. Let’s fast-forward.', Unfiltered: '3 a.m. again. Bring the sun up.' }
          : { Jolly: '3:07 a.m. Your worry’s up on the wall again. Let’s bring the morning in.', Cheeky: 'Ah, 3 a.m. Prime time for monsters. Let’s fast-forward.', Unfiltered: '3 a.m. The wall’s doing that thing. Bring the sun up.' },
        loopie: { Jolly: 'Night shift, reporting! Running your worry on repeat, as usual.', Cheeky: 'Hi! I work nights. I replay worries. It’s a living.', Unfiltered: 'Night shift. Worry on loop.' },
        half: { Jolly: 'Look at it shrink. Same object, more light.', Cheeky: 'It’s shrinking! Turns out the monster was mostly lighting.', Unfiltered: 'Shrinking. Same object.' },
        day: { Jolly: '10 a.m. It’s {obj}. It always was.', Cheeky: 'Ta-da: {obj}. Terrifying, clearly.', Unfiltered: 'It’s {obj}.' },
        dayReal: { Jolly: '10 a.m. It’s {obj}. The worry is real, and in daylight it fits next to a plan.', Cheeky: '{obj}, by daylight. The worry’s real, but it’s worry-sized now.', Unfiltered: 'It’s {obj}. Real worry, daylight size.' },
        dayCare: { Jolly: '10 a.m.: {obj}. The concern is real, and now help is open.', Cheeky: '{obj}, by daylight. Real concern, and the right people are open now.', Unfiltered: 'It’s {obj}. Real concern. Help is open now.' },
        halfCare: { Jolly: 'Same object, more light. Easier to see it properly.', Cheeky: 'More light, same object. Much easier to look at.', Unfiltered: 'More light. Same object.' },
        twistAsk: { Jolly: 'Psst. Drag the sun back to 3 a.m. Watch what happens.', Cheeky: 'Want to see my best trick? Back to 3 a.m.', Unfiltered: 'Drag it back to 3 a.m.' },
        twist: { Jolly: 'Same thought. Different hour. The night does the special effects.', Cheeky: 'Same object, same facts. The hour is doing all the drama.', Unfiltered: 'Same thought. Different hour.' },
        postpone: { Jolly: 'So the worry gets a proper appointment, in daylight. Fold up a note to morning-you.', Cheeky: 'Worries get appointments, not night shifts. Fold this note to morning-you.', Unfiltered: 'Book the worry for 10 a.m. Fold the note.' },
        end: { Jolly: 'Phone face down. The note’s on duty now.', Cheeky: 'Phone down. The note has the night shift now.', Unfiltered: 'Phone down. The note’s on duty.' },
        endLoopie: { Jolly: 'Shift’s over. Night night.', Cheeky: 'Clocking off. Wake me at ten.', Unfiltered: 'Off duty.' }
      };

      /* ---------------- flow ---------------- */
      function waitFor(fn) { return new Promise(res => { const tick = () => { if (fn()) res(); else S.later(tick, 80); }; tick(); }); }
      async function scrubStep() {
        G.phase = 'scrub'; buildFacts();
        sayStill(LN.start, 'sleepy', 4200);
        S.later(() => { if (G.phase === 'scrub' && G.t < 0.12) sayLoopie(LN.loopie, 'worried', 3600); }, 4400);
        K.guide({ id: 'sun', g: 'drag', target: () => ({ x: RM.sunX, y: sunY(G.t) }), dx: 0, dy: -Math.max(60, (sunY(0) - sunY(1)) * 0.85), label: 'DRAG THE SUN UP', place: 'below', delay: 1400 });
        let halfSaid = false;
        await waitFor(() => { if (!halfSaid && G.t > 0.48) { halfSaid = true; sayStill(care() ? LN.halfCare : LN.half, care() ? 'calm' : 'happy', 3000); loopie.base('confused'); } return G.t >= 0.985 && G.factsOn >= G.facts.length; });
        K.guide(null); G.tT = 1;
        still.base('happy'); loopie.base('sleepy');
        sayStill(care() ? LN.dayCare : support() === 'weak' ? LN.day : LN.dayReal, care() ? 'calm' : 'happy', 4200, { obj: OBJ.name });
        drop.show(true); drop.base('happy'); drop.react('bounce');
        ctx.track('morning', { secs: Math.round((now() - G.t0) / 1000) });
        await K.wait(reduced() ? 2200 : 3600);
      }
      async function twistStep() {
        G.phase = 'twist';
        sayLoopie(LN.twistAsk, 'wink', 3800);
        K.guide({ id: 'back', g: 'drag', target: () => ({ x: RM.sunX, y: sunY(G.t) }), dx: 0, dy: Math.max(60, (sunY(0) - sunY(G.t)) * 0.85), label: 'BACK TO 3 A.M.', place: 'below', delay: 1200 });
        await waitFor(() => G.t <= 0.03);
        K.guide(null); G.tT = 0; G.phase = 'twistDone';
        // the notes step out of the way: the caption gets the wall to itself
        factsEl.style.transition = 'opacity .6s ease'; factsEl.style.opacity = '0';
        drop.show(false);
        if (A.ctx) { A.tone({ type: 'sine', freq: 98, to: 82, dur: 2.4, vol: 0.06, attack: 0.6 }); A.chime(A.note('A3'), { when: A.now() + 0.3, vol: 0.04, dur: 2.4 }); }
        const cap = h('div', { class: 'ns-caption', style: { top: (M.phone ? 132 : 140) + 'px' } }, h('b', { text: 'Same thought. Different hour.' }), h('span', { text: 'Darkness and tiredness make worries look bigger. It’s the hour, not new facts.' }));
        G.textOff = true; G.forceDom = true;
        el.append(cap);
        still.base('calm'); sayStill(LN.twist, 'think', 4200);
        ctx.track('twist', {});
        await K.wait(reduced() ? 2600 : 4600);
        cap.classList.add('ns-out'); S.later(() => cap.remove(), 600);
      }
      async function postponeStep() {
        G.phase = 'fold1';
        factsEl.classList.add('ns-out');
        sayStill(LN.postpone, 'calm', 4200);
        showLetter();
        const s = letterSize();
        K.guide({ id: 'fold1', g: 'drag', target: G.letterEl, oy: 0.88, dir: 'u', d: Math.round(s.h * 0.42), label: 'FOLD IT UP', place: 'below', delay: 900 });
        await waitFor(() => G.placed);
      }
      async function finale() {
        if (G.phase === 'finale' || G.phase === 'done') return;
        G.phase = 'finale'; K.guide(null);
        // night again, but calm: the phone is face down, the moon does the lighting, the shadow is its true size
        G.phone = 0; G.tT = 0; G.t = 0; G.textOff = true; G.forceDom = true;
        K.anim(reduced() ? 300 : 2400, (k) => { G.finale = Math.max(0.001, k); });
        pill.firstChild.textContent = timeLabel(0.04); pill.lastChild.textContent = (M.phone ? 'Moon: ' : 'Tonight’s moon: ') + moonName;
        nightBed.level(0.2); dayBed.level(0); dawnAmb.level(0.0001, 1); roomAmb.level(0.22, 2);
        if (A.ctx) {
          const t0 = A.now();
          A.pad(['D3', 'A3', 'D4', 'F#4'].map(n => A.note(n)), { dur: 7, vol: 0.09, attack: 1.6 });
          ['A4', 'F#4', 'D4', 'A3'].forEach((n, i) => A.chime(A.note(n), { when: t0 + 1.2 + i * 0.9, vol: 0.035, dur: 2.6 }));
          A.sync('finale', now());
        }
        still.base('sleepy'); loopie.base('sleepy');
        const sup = support();
        const endEl = h('div', { class: 'ns-end', style: { top: (M.phone ? 132 : 150) + 'px' } }, h('b', { text: care() ? 'The worry has an appointment tomorrow, with someone who knows. You can rest.' : sup === 'weak' ? 'The worry has an appointment tomorrow. You can sleep.' : 'The worry has an appointment tomorrow, with a plan. You can sleep.' }),
          h('span', { text: care() ? 'At 3 a.m. it filled the wall. By daylight it’s its real size, with a next step.' : 'At 3 a.m. it was a monster. At 10 a.m. it was ' + OBJ.name + '.' }));
        el.append(endEl);
        S.later(() => sayStill(LN.end, 'sleepy', 4200), 900);
        S.later(() => sayLoopie(LN.endLoopie, 'sleepy', 3000), 5400);
        // the lights go down slowly, like a long breath out
        K.anim(reduced() ? 400 : 6500, (k) => { G.dim = k * 0.75; }, K.ease.inOutSine);
        await K.wait(reduced() ? 4200 : 8200);
        finish();
      }
      function finish() {
        if (G.done) return; G.done = true; G.phase = 'done';
        const calm = G.moving > 0.3 ? clamp(G.calm / G.moving, 0, 1) : 0.85, pct = Math.round(calm * 100);
        const best = K.best('sunrise', pct, 'higher'), tier = K.tier(calm, [0.5, 0.72, 0.88]);
        const got = K.collect('o:' + OBJ.id), owned = K.collection().filter(x => x.indexOf('o:') === 0).length;
        const badges = [best.isNew ? 'New best: ' + pct + '% gentle sunrise' : 'Gentle sunrise: ' + pct + '%'];
        if (tier) badges.push(tier + ' dawn');
        badges.push((got.isNew ? 'Collected: ' : 'Shadow museum: ') + OBJ.beast + ' (' + Math.min(owned, OBJECTS.length) + '/' + OBJECTS.length + ')');
        badges.push('Tonight’s moon: ' + moonName);
        const sup = support();
        ctx.finish({
          title: 'Booked for 10 a.m.', mood: 'sleepy',
          lines: ['At 3 a.m. it was ' + OBJ.beast + '. At 10 a.m., ' + OBJ.name + '.', 'Same thought, different hour', care() ? 'Tomorrow: ask someone qualified exactly where you stand' : sup === 'weak' ? 'The worry has an appointment in daylight' : 'The worry has a daylight appointment, with a plan'],
          share: 'At 3 a.m. it was a monster. At 10 a.m. it was ' + OBJ.name + '.',
          badges: badges.slice(0, 4)
        });
      }

      /* ---------------- start ---------------- */
      cv.onResize(() => layout());
      S.on('theme', () => { roomKey = ''; });
      if (ctx.analysisReady && typeof ctx.analysisReady.then === 'function') ctx.analysisReady.then((a) => { if (a && typeof a === 'object' && (G.phase === 'intro' || (G.phase === 'scrub' && G.t < 0.1))) { an = a; fillTexts(); } }, () => {});
      (async () => {
        await K.intro({ title: 'Night Shift', sub: 'At 3 a.m. a small worry throws a very big shadow. Let’s see it in daylight.', how: 'Drag the sun up the window. Then give the worry an appointment.', char: 'still', mood: 'sleepy' });
        G.t0 = now();
        await scrubStep();
        await twistStep();
        await postponeStep();
      })();

      return {
        async autoplay() {
          const wait = async (fn, ms) => { const t0 = now(); while (!fn() && now() - t0 < (ms || 30000)) await K.wait(90); };
          const sunLocal = (t) => ({ x: RM.sunHit.w / 2, y: sunY(t) - RM.sunHit.y });
          await wait(() => G.phase === 'scrub');
          await K.wait(1600);
          { // a slow, steady sunrise
            const a = sunLocal(0), s = await K.sim.press(sunHit, a.x, a.y);
            for (let i = 1; i <= 24; i++) { const p = sunLocal(i / 24); s.move(p.x, p.y - 4); await K.wait(180); }
            await wait(() => G.t >= 0.985 && G.factsOn >= G.facts.length, 12000);
            const e = sunLocal(1); s.up(e.x, e.y - 4);
          }
          await wait(() => G.phase === 'twist', 20000);
          await K.wait(1400);
          {
            const a = sunLocal(G.t), s = await K.sim.press(sunHit, a.x, a.y);
            for (let i = 1; i <= 12; i++) { const p = sunLocal(1 - i / 12); s.move(p.x, p.y + 6); await K.wait(160); }
            await wait(() => G.t <= 0.03, 8000);
            const e = sunLocal(0); s.up(e.x, e.y + 6);
          }
          await wait(() => G.phase === 'fold1' && G.letterEl, 20000);
          await K.wait(1300);
          { const e = G.letterEl, r = e.getBoundingClientRect(), sc = K.scaleOf(el), w = r.width / sc, hh = r.height / sc; await K.sim.drag(e, { x: w / 2, y: hh * 0.9 }, { x: w / 2, y: hh * 0.2 }, 700, 14); }
          await wait(() => G.phase === 'fold2' && G.lstage === 'fold2', 8000);
          await K.wait(900);
          { const e = G.letterEl, r = e.getBoundingClientRect(), sc = K.scaleOf(el), w = r.width / sc, hh = r.height / sc; await K.sim.drag(e, { x: w * 0.9, y: hh / 2 }, { x: w * 0.25, y: hh / 2 }, 700, 14); }
          await wait(() => G.phase === 'seal' && G.noteEl, 8000);
          await K.wait(900);
          { const hit = G.noteEl.querySelector('.ns-sealhit'), s = await K.sim.press(hit); await wait(() => G.phase === 'post', 12000); s.up(); }
          await K.wait(900);
          {
            const n = G.noteEl, r = K.rectIn(n), sp = spotScreen();
            await K.sim.drag(n, { x: r.w / 2, y: r.h / 2 }, { x: r.w / 2 + (sp.x - (r.x + r.w / 2)), y: r.h / 2 + (sp.y - 12 - (r.y + r.h / 2)) }, 1100, 18);
          }
          await wait(() => G.done, 30000);
        }
      };
    }
  });
})(window.TSG_ENV);
