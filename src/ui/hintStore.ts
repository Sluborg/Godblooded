// Which hints this player has seen (`hintsSeen`, docs/systems/onboarding.md rule 4): stored on the
// device, never reset by a new run. Storage may be blocked; then hints simply show again.
export const HINTS_KEY = 'godblooded.hints.v1';

export function loadSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(HINTS_KEY);
    const v: unknown = raw ? JSON.parse(raw) : null;
    if (Array.isArray(v)) return new Set(v.filter((x): x is string => typeof x === 'string'));
  } catch {
    // blocked or broken: nothing seen
  }
  return new Set();
}

export function saveSeen(seen: ReadonlySet<string>): void {
  try {
    localStorage.setItem(HINTS_KEY, JSON.stringify([...seen]));
  } catch {
    // storage blocked: seen for this session only
  }
}

// "Show hints again": forget what was seen. The running hint director keeps its own copy, so it
// picks this up at the next run.
export function clearSeen(): void {
  saveSeen(new Set());
}
