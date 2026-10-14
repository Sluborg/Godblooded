// Design resolution (landscape). Phaser Scale.FIT scales this to the screen.
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

// At FIT on a 780px-wide landscape phone the scale is ~0.6, so 80 units ≈ 48 CSS px.
export const MIN_TOUCH = 80;

export const COLORS = {
  background: 0x1a1410,
  blood: 0x8a1c2b,
  gold: 0xf2c14e,
  text: '#f4ead5',
  textMuted: '#b8a98c',
};

// Render scale: the canvas is GAME_WIDTH x GAME_HEIGHT times this many pixels, so a phone shows
// text and lines at its own pixel density instead of a stretched 1280 x 720 picture. The layout
// still works in design units: every scene's camera zooms by this (ui/designCamera.ts). Capped at
// 2 for fill rate (the cost grows with its square); `?scale=1` forces a value for testing.
export const RENDER_SCALE_MAX = 2;

// Device pixels per design pixel at FIT: the screen's long side over the design width against the
// short side over the design height, times the pixel density; rounded to quarters, 1 to the cap.
export function computeRenderScale(
  dpr: number,
  screenW: number,
  screenH: number,
  max: number = RENDER_SCALE_MAX,
): number {
  const long = Math.max(screenW, screenH);
  const short = Math.min(screenW, screenH);
  const fit = Math.min(long / GAME_WIDTH, short / GAME_HEIGHT);
  const raw = Math.max(1, dpr) * fit;
  return Math.min(max, Math.max(1, Math.round(raw * 4) / 4));
}

// The "Sharp graphics" setting read straight from storage (config must not import the settings
// module); anything unreadable counts as on.
function sharpOff(): boolean {
  try {
    const raw = window.localStorage.getItem('godblooded.settings.v1');
    return raw !== null && (JSON.parse(raw) as { sharp?: unknown }).sharp === false;
  } catch {
    return false;
  }
}

function detectRenderScale(): number {
  if (typeof window === 'undefined') return 1;
  const forced = Number(new URLSearchParams(window.location.search).get('scale'));
  if (forced >= 1 && forced <= 4) return forced;
  if (sharpOff()) return 1;
  return computeRenderScale(window.devicePixelRatio || 1, window.innerWidth, window.innerHeight);
}

export const RENDER_SCALE = detectRenderScale();
