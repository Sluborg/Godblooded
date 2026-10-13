// The build menu is tap for info, tap again to build (Stefan, docs/decisions.md 2026-10-14;
// docs/systems/ui-flows.md section 3). Pure rules, so they are unit-tested; HudScene draws.

export type BuildTapResult =
  // First tap, or another item: select it and show its info.
  | { action: 'select'; selected: string }
  // Second tap on the selected item with enough gold: build it.
  | { action: 'build'; selected: string }
  // Second tap without enough gold: say how much is missing, build nothing.
  | { action: 'need'; selected: string; need: number };

// What a tap on an item does, given what is selected and the town's gold. Never builds on a
// single tap.
export function buildTap(
  selected: string | null,
  tapped: string,
  gold: number,
  cost: number,
): BuildTapResult {
  if (selected !== tapped) return { action: 'select', selected: tapped };
  if (gold < cost) return { action: 'need', selected: tapped, need: Math.ceil(cost - gold) };
  return { action: 'build', selected: tapped };
}

export interface BuildInfo {
  title: string;
  affordable: boolean;
  // The role in one line (the row's `text`, else the effect line), the effect now (only when
  // `text` is there, so it is not said twice), and what the next tier unlocks.
  lines: string[];
}

export function buildInfo(opts: {
  name: string;
  cost: number;
  gold: number;
  text?: string;
  effect: string;
  next: string;
}): BuildInfo {
  const lines = [opts.text ?? opts.effect];
  if (opts.text && opts.effect) lines.push(opts.effect);
  if (opts.next) lines.push(opts.next);
  return {
    title: `${opts.name}  ·  ${opts.cost} gold`,
    affordable: opts.gold >= opts.cost,
    lines,
  };
}
