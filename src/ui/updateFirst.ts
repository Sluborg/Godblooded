// Look for a new version before the heavy load (Lead, 2026-10-18). An installed copy used to open its
// old cached build, load 8 MB, then reload into the new build when the update arrived: two starts.
// Now the start waits a moment for the service worker to say whether there is an update, and if
// there is one it finishes installing it and reloads BEFORE any art is loaded. A slow check or a slow
// install just lets the old build start; the new one then applies at the next launch (the page never
// reloads in the middle of a run).
export interface WorkerLike {
  state: string;
  addEventListener(type: 'statechange', listener: () => void): void;
}
export interface RegistrationLike {
  update(): Promise<unknown>;
  addEventListener(type: 'updatefound', listener: () => void): void;
  installing: WorkerLike | null;
  waiting: WorkerLike | null;
  active: WorkerLike | null;
}
export type UpdateResult = 'none' | 'reload' | 'late';

export interface UpdateOptions {
  // How long to wait for the service worker to report a new version (ms).
  detectMs: number;
  // How long to wait for the new version to install and take over (ms).
  installMs: number;
  reload: () => void;
  // Shown while the new version installs.
  note?: (text: string) => void;
}

const after = <T>(ms: number, value: T): Promise<T> =>
  new Promise((ok) => setTimeout(() => ok(value), ms));

// Resolves true when the worker is activated, false when it is thrown away.
function activated(w: WorkerLike): Promise<boolean> {
  return new Promise((ok) => {
    const check = () => {
      if (w.state === 'activated') ok(true);
      else if (w.state === 'redundant') ok(false);
    };
    w.addEventListener('statechange', check);
    check();
  });
}

export async function updateFirst(
  reg: RegistrationLike | undefined,
  opts: UpdateOptions,
): Promise<UpdateResult> {
  if (!reg) return 'none';
  // `updatefound` fires as soon as the browser sees a changed worker script; update() itself only
  // resolves once that worker has INSTALLED (seconds on a slow link), so it cannot be the signal.
  // With skipWaiting a new worker can also already be the active one by then, so a changed active
  // worker counts as an update too.
  const before = reg.active;
  const found = await new Promise<WorkerLike | null>((ok) => {
    const timer = setTimeout(() => ok(null), opts.detectMs);
    const settle = (w: WorkerLike | null) => {
      clearTimeout(timer);
      ok(w);
    };
    reg.addEventListener('updatefound', () => settle(reg.installing ?? reg.waiting ?? null));
    reg
      .update()
      .then(() =>
        settle(reg.installing ?? reg.waiting ?? (reg.active !== before ? reg.active : null)),
      )
      .catch(() => settle(null));
  });
  if (!found) return 'none';
  opts.note?.('Updating…');
  const done = await Promise.race([activated(found), after(opts.installMs, 'late' as const)]);
  if (done === 'late') return 'late';
  if (!done) return 'none';
  opts.reload();
  return 'reload';
}
