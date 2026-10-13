// PWA install prompt: browsers fire `beforeinstallprompt` once the app qualifies; we keep the event
// and let the title screen offer an Install button (never an automatic popup).

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();

export function initInstall(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    listeners.forEach((f) => f());
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    listeners.forEach((f) => f());
  });
}

// Already running as an installed app (no point offering it again).
export function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function canInstall(): boolean {
  return deferred !== null && !isStandalone();
}

// Asks the browser to show its install dialog. Resolves true when the player accepted.
export async function promptInstall(): Promise<boolean> {
  const e = deferred;
  if (!e) return false;
  deferred = null;
  await e.prompt();
  const choice = await e.userChoice;
  listeners.forEach((f) => f());
  return choice.outcome === 'accepted';
}

// Called when canInstall may have changed; returns the unsubscribe function.
export function onInstallChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
