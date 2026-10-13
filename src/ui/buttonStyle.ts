// Look of the code-drawn button (the fallback when the UI kit pictures are not in the manifest):
// dark iron fill, bronze rim and a soft 2 px inner outline (no flat bands). Pure
// data so the states can be tested and tuned in one place.
export type ButtonState = 'normal' | 'active' | 'disabled' | 'pressed';

export interface ButtonColors {
  fill: number;
  rim: number;
  // Colour and alpha of the soft inner outline (light when raised, dark when pressed).
  bevelLight: number;
  inner: number;
}

export const BUTTON_COLORS: Record<ButtonState, ButtonColors> = {
  normal: { fill: 0x2b2724, rim: 0xb08a4a, bevelLight: 0xe3bd6e, inner: 0.3 },
  active: { fill: 0x6b1f2a, rim: 0xf2c14e, bevelLight: 0xff9a8a, inner: 0.35 },
  disabled: { fill: 0x1f1c1a, rim: 0x5a5046, bevelLight: 0x4a4238, inner: 0.2 },
  pressed: { fill: 0x1c1a18, rim: 0x8a6a3a, bevelLight: 0x000000, inner: 0.5 },
};

export function buttonState(opts: {
  enabled: boolean;
  active: boolean;
  pressed: boolean;
}): ButtonState {
  if (!opts.enabled) return 'disabled';
  if (opts.pressed) return 'pressed';
  return opts.active ? 'active' : 'normal';
}
