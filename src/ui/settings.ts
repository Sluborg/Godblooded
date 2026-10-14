// Player settings: parsed defensively, saved to localStorage, and read live by the views.
export type Speed = 1 | 2 | 4;
export type PaletteId = 'standard' | 'colourblind';

export interface Settings {
  speed: Speed;
  reducedMotion: boolean;
  palette: PaletteId;
  // Music volume 0..1 in steps of 0.05, and a mute toggle (docs/systems/audio.md section 5).
  musicVolume: number;
  musicMuted: boolean;
  // Sound effects volume 0..1 in steps of 0.05 (docs/systems/audio.md section 5).
  effectsVolume: number;
  // Names over heroes' heads: off by default; a tap on a hero shows its party's names.
  heroNames: boolean;
  // Hints: the first-time teaching bubbles (docs/systems/onboarding.md); on by default.
  hintsOn: boolean;
}

export const DEFAULT_MUSIC_VOLUME = 0.6;
export const DEFAULT_EFFECTS_VOLUME = 0.8;

export const DEFAULT_SETTINGS: Settings = {
  speed: 1,
  reducedMotion: false,
  palette: 'standard',
  musicVolume: DEFAULT_MUSIC_VOLUME,
  musicMuted: false,
  effectsVolume: DEFAULT_EFFECTS_VOLUME,
  heroNames: false,
  hintsOn: true,
};

export const SETTINGS_KEY = 'godblooded.settings.v1';

// Snaps to the 5% steps; anything that is not a number falls back to the default.
function parseVolume(v: unknown, fallback = DEFAULT_MUSIC_VOLUME): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
  return Math.round(Math.min(1, Math.max(0, v)) * 20) / 20;
}

export function parseSettings(raw: unknown): Settings {
  let v: unknown = raw;
  if (typeof raw === 'string') {
    try {
      v = JSON.parse(raw);
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }
  if (typeof v !== 'object' || v === null) return { ...DEFAULT_SETTINGS };
  const o = v as Record<string, unknown>;
  return {
    speed: o.speed === 2 || o.speed === 4 ? o.speed : 1,
    reducedMotion: o.reducedMotion === true,
    palette: o.palette === 'colourblind' ? 'colourblind' : 'standard',
    musicVolume: parseVolume(o.musicVolume),
    musicMuted: o.musicMuted === true,
    effectsVolume: parseVolume(o.effectsVolume, DEFAULT_EFFECTS_VOLUME),
    heroNames: o.heroNames === true,
    hintsOn: o.hintsOn !== false,
  };
}

let current: Settings | null = null;

export function getSettings(): Settings {
  if (!current) {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(SETTINGS_KEY);
    } catch {
      // storage blocked: defaults
    }
    current = parseSettings(raw);
  }
  return current;
}

export function updateSettings(patch: Partial<Settings>): Settings {
  current = parseSettings({ ...getSettings(), ...patch });
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(current));
  } catch {
    // storage blocked: setting lives for this session only
  }
  return current;
}
