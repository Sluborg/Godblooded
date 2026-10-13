// Player settings: parsed defensively, saved to localStorage, and read live by the views.
export type Speed = 1 | 2 | 4;
export type PaletteId = 'standard' | 'colourblind';

export interface Settings {
  speed: Speed;
  reducedMotion: boolean;
  palette: PaletteId;
}

export const DEFAULT_SETTINGS: Settings = { speed: 1, reducedMotion: false, palette: 'standard' };

export const SETTINGS_KEY = 'godblooded.settings.v1';

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
