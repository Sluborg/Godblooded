import { emptyMeta, migrateMeta, type MetaState } from '../sim/api';

// The meta save in localStorage (docs/systems/meta-ui.md): Essence, Altar ranks, unlocks, Saga, the
// chosen lean. The sim defines its shape (migrateMeta); this only keeps it. All storage access is
// guarded: a blocked or full storage means a fresh meta, never a crash.

export const META_KEY = 'godblooded.meta';

type Store = Pick<Storage, 'getItem' | 'setItem'>;

function defaultStore(): Store | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

// The saved meta, or a fresh one when there is none or it is broken.
export function readMeta(store: Store | null = defaultStore()): MetaState {
  try {
    const raw = store?.getItem(META_KEY);
    return raw ? migrateMeta(JSON.parse(raw)) : emptyMeta();
  } catch {
    return emptyMeta();
  }
}

export function writeMeta(meta: MetaState, store: Store | null = defaultStore()): boolean {
  try {
    store?.setItem(META_KEY, JSON.stringify(meta));
    return store !== null;
  } catch {
    return false;
  }
}
