// Look of the code-drawn button (the fallback when the UI kit pictures are not in the manifest):
// dark iron fill, bronze rim, a light bevel on top and a dark one below, and a soft shine. Pure
// data so the states can be tested and tuned in one place.
export type ButtonState = 'normal' | 'active' | 'disabled' | 'pressed';

export interface ButtonColors {
  fill: number;
  rim: number;
  bevelLight: number;
  bevelDark: number;
  // Alpha of the white shine over the top half.
  shine: number;
}

export const BUTTON_COLORS: Record<ButtonState, ButtonColors> = {
  normal: { fill: 0x2b2724, rim: 0xb08a4a, bevelLight: 0xe3bd6e, bevelDark: 0x4a3418, shine: 0.1 },
  active: { fill: 0x6b1f2a, rim: 0xf2c14e, bevelLight: 0xff9a8a, bevelDark: 0x3a0f16, shine: 0.14 },
  disabled: { fill: 0x1f1c1a, rim: 0x5a5046, bevelLight: 0x4a4238, bevelDark: 0x14120f, shine: 0 },
  pressed: {
    fill: 0x1c1a18,
    rim: 0x8a6a3a,
    bevelLight: 0x4a3418,
    bevelDark: 0xe3bd6e,
    shine: 0.03,
  },
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
