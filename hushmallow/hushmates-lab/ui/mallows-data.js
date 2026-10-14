// The seven official Mallows as the hushmallow landing page presents them
// (framer/HushmallowLanding.tsx on the landing-page branch): web-sized art,
// eyelid layers, colours, breathing pace, signature move and particles.
// Lines are fixed, hand-written character flavour for choosing a Mallow,
// never presented as a person's words.

const ART = (file) => new URL(`../assets/art/${file}`, import.meta.url).href;

export const ORDER = ['noomi', 'blubi', 'pipzi', 'boppo', 'zuzu', 'loomi', 'glitzi'];

export const MALLOWS = {
  noomi: {
    id: 'noomi', name: 'Noomi', title: 'The gentle one', vibe: 'Gentle · comforting · softly peaceful',
    alt: 'Noomi, a pale sky-blue Mallow with sleepy closed eyes and a peaceful smile',
    w: 640, h: 593, breath: 5.6, sig: 'sink', part: 'z', colors: ['#8FB8FF', '#C9B8FF', '#FFD6F0'],
    body: '#CFE6FF', deep: '#3F67B8', tint: '#EAF3FF', glow: '#FFF4C8', blush: '#FF7FD8',
    cheeks: [[0.2, 0.655], [0.795, 0.655]],
    hello: 'Oh, hello. Come and get cosy. There’s room.',
  },
  blubi: {
    id: 'blubi', name: 'Blubi', title: 'The softie', vibe: 'Relaxed · happy · quietly content',
    alt: 'Blubi, a bright blue Mallow with contented closed eyes and a little smile',
    w: 640, h: 622, breath: 4.8, sig: 'wobble', part: 'drop', colors: ['#5CC3FF', '#9BE0FF', '#FF9DEB'],
    body: '#18A6F5', deep: '#0B5FB0', tint: '#E2F3FF', glow: '#9BE0FF', blush: '#FF7EF0',
    cheeks: [[0.205, 0.67], [0.83, 0.67]],
    hello: 'Hey. No rush. I’m very good at no rush.',
  },
  pipzi: {
    id: 'pipzi', name: 'Pipzi', title: 'The spark', vibe: 'Joyful · bright · wildly expressive',
    alt: 'Pipzi, a vivid pink-red Mallow with huge sparkly eyes and an open, joyful smile',
    w: 640, h: 613, breath: 3.4, sig: 'bounce', part: 'sparkle', colors: ['#FFD14A', '#FF6FA8', '#FFFFFF', '#FFB0F0'],
    body: '#F2073B', deep: '#B3002B', tint: '#FFE6EC', glow: '#FFCF4A', blush: '#FFB0F0',
    cheeks: [[0.2, 0.665], [0.82, 0.665]],
    lids: { top: 0.383, bottom: 0.641 },
    hello: 'HI! Hi. Sorry. Hi! I’m Pipzi!',
  },
  boppo: {
    id: 'boppo', name: 'Boppo', title: 'The sunshine', vibe: 'Optimistic · enthusiastic · warm',
    alt: 'Boppo, a warm orange Mallow with shining brown eyes and a big hopeful grin',
    w: 640, h: 614, breath: 3.8, sig: 'hop', part: 'heart', colors: ['#FF6FB5', '#FFC94A', '#FF8A3D'],
    body: '#FF7A0A', deep: '#B94A00', tint: '#FFF0E0', glow: '#FFD23A', blush: '#FF5ED0',
    cheeks: [[0.2, 0.69], [0.805, 0.68]],
    lids: { top: 0.389, bottom: 0.632 },
    hello: 'Hello, you! Honestly? Today just got better.',
  },
  zuzu: {
    id: 'zuzu', name: 'Zuzu', title: 'The delightful chaos', vibe: 'Chaotic · playful · full of surprises',
    alt: 'Zuzu, a purple Mallow with spinning spiral eyes and a gleeful open mouth',
    w: 640, h: 603, breath: 3.0, sig: 'spin', part: 'spiral', colors: ['#39F0FF', '#FF6AD0', '#C414E6'],
    body: '#C414E6', deep: '#7A0C9E', tint: '#F6E6FF', glow: '#39F0FF', blush: '#FF8CF0',
    cheeks: [[0.175, 0.66], [0.835, 0.66]],
    lids: { top: 0.32, bottom: 0.622 },
    hello: 'Oh! A new friend! Quick, which way is up?',
  },
  loomi: {
    id: 'loomi', name: 'Loomi', title: 'The calm one', vibe: 'Soothing · steady · grounding',
    alt: 'Loomi, a soft aqua Mallow with calm closed eyes and a gentle smile',
    w: 640, h: 599, breath: 6.2, sig: 'glow', part: 'ring', colors: ['#A8F0FF', '#7FD4FF', '#FFFFFF'],
    body: '#5EC8F5', deep: '#13789F', tint: '#E4F7FF', glow: '#A8F0FF', blush: '#FF7CF5',
    cheeks: [[0.19, 0.695], [0.82, 0.695]],
    hello: 'Hi there. Shall we take a slow breath together?',
  },
  glitzi: {
    id: 'glitzi', name: 'Glitzi', title: 'The storm cloud', vibe: 'Moody · rebellious · intense',
    alt: 'Glitzi, a midnight-blue Mallow streaked with neon glitch lines, side-eyeing with a grumpy frown',
    w: 640, h: 611, breath: 4.4, sig: 'glitch', part: 'bolt', colors: ['#3EE8FF', '#FF3DF2', '#8C7BFF'],
    body: '#2A1A6E', deep: '#1A0F4A', tint: '#ECE8FF', glow: '#3EE8FF', blush: '#FF3DF2',
    cheeks: [[0.25, 0.72], [0.75, 0.71]],
    lids: { top: 0.478, bottom: 0.638 },
    hello: 'Oh. It’s you. …Fine. Hi. Don’t make it weird.',
  },
};

export const art = (id) => ART(`${id}.webp`);
export const lidsArt = (id) => ART(`${id}-lids.webp`);
export const LOGO = ART('hushmallow-logo.webp');
export const MASCOT = ART('mascot.webp');

// particle shapes (viewBox 0 0 24 24, coloured with currentColor)
export const SHAPES = {
  heart: '<path fill="currentColor" d="M12 21s-7.5-4.6-9.6-9.2C.9 8.3 3 4.5 6.6 4.5c2.1 0 3.6 1.2 5.4 3.2 1.8-2 3.3-3.2 5.4-3.2 3.6 0 5.7 3.8 4.2 7.3C19.5 16.4 12 21 12 21z"/>',
  drop: '<path fill="currentColor" d="M12 2s-7 8.5-7 13a7 7 0 0 0 14 0c0-4.5-7-13-7-13z"/>',
  z: '<path fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="M6 6h12L6 18h12"/>',
  spiral: '<path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" d="M12 12m-1.5 0a1.5 1.5 0 1 1 3 0a3.5 3.5 0 1 1 -7 0a5.5 5.5 0 1 1 11 0a7.5 7.5 0 1 1 -15 0"/>',
  ring: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/>',
  bolt: '<path fill="currentColor" d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/>',
  sparkle: '<path fill="currentColor" d="M12 0c1 7 5 11 12 12-7 1-11 5-12 12-1-7-5-11-12-12 7-1 11-5 12-12z"/>',
};
