// Splash assets load first so the loading screen can show them while the rest streams in: the key
// art (`art_splash`) and the logo (`ui_logo`, `ui_logo_a`, ...).
export function isSplashAsset(id: string): boolean {
  return id === 'art_splash' || id === 'ui_logo' || id.startsWith('ui_logo_');
}

// The first logo picture the manifest has, if any.
export function pickLogoId(ids: Iterable<string>): string | null {
  const logos = [...ids].filter((id) => id === 'ui_logo' || id.startsWith('ui_logo_')).sort();
  return logos[0] ?? null;
}
