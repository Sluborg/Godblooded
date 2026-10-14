// The raid warning arrow (docs/systems/events.md section 4): for the 15 s before a raid, a red
// arrow at the screen edge points to the lair the raid comes from and carries that lair's icon;
// tapping it pans the camera to the lair. Pure geometry, drawn by the HUD.
export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface EdgeArrow {
  // The lair is inside the area: no arrow (its own ring and trail show it).
  onScreen: boolean;
  // Where the arrow sits (inside the area), and the angle it points at (radians, 0 = right).
  x: number;
  y: number;
  angle: number;
}

// The arrow for a target in screen (design) coordinates, kept inside `area`: the point on the
// area's border towards the target, from the area's centre.
export function edgeArrow(target: { x: number; y: number }, area: Rect): EdgeArrow {
  const inside =
    target.x >= area.left &&
    target.x <= area.right &&
    target.y >= area.top &&
    target.y <= area.bottom;
  const cx = (area.left + area.right) / 2;
  const cy = (area.top + area.bottom) / 2;
  const dx = target.x - cx;
  const dy = target.y - cy;
  const angle = Math.atan2(dy, dx);
  if (inside) return { onScreen: true, x: target.x, y: target.y, angle };
  // Scale the vector from the centre until it touches the border.
  const hx = (area.right - area.left) / 2;
  const hy = (area.bottom - area.top) / 2;
  const k = Math.min(
    dx === 0 ? Infinity : hx / Math.abs(dx),
    dy === 0 ? Infinity : hy / Math.abs(dy),
  );
  return { onScreen: false, x: cx + dx * k, y: cy + dy * k, angle };
}

// A raid warning as long as the sim says: until this run time (ms).
export interface RaidWarningNote {
  raid: number;
  lair: number;
  untilMs: number;
}

export function activeWarnings(
  notes: readonly RaidWarningNote[],
  timeMs: number,
): RaidWarningNote[] {
  return notes.filter((n) => timeMs < n.untilMs);
}

// Dots of the dotted trail from a lair toward the town: every `gap` units over the first `share`
// of the way, shifted by `phase` (0 to 1 of a gap) so the dots seem to travel to the town.
export function trailDots(
  from: { x: number; y: number },
  to: { x: number; y: number },
  share = 0.6,
  gap = 46,
  phase = 0,
): { x: number; y: number }[] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return [];
  const out: { x: number; y: number }[] = [];
  for (let d = (phase % 1) * gap; d <= len * share; d += gap)
    out.push({ x: from.x + (dx / len) * d, y: from.y + (dy / len) * d });
  return out;
}
