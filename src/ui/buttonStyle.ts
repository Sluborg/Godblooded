// The states of a button. The wood palettes per state are in uiStyle.ts.
export type ButtonState = 'normal' | 'active' | 'disabled' | 'pressed';

export function buttonState(opts: {
  enabled: boolean;
  active: boolean;
  pressed: boolean;
}): ButtonState {
  if (!opts.enabled) return 'disabled';
  if (opts.pressed) return 'pressed';
  return opts.active ? 'active' : 'normal';
}
