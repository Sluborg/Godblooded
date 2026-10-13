import { describe, expect, it } from 'vitest';
import { buttonState } from './buttonStyle';
import { WOOD_BUTTON } from './uiStyle';

describe('buttonState', () => {
  it('disabled wins, then pressed, then active', () => {
    expect(buttonState({ enabled: false, active: true, pressed: true })).toBe('disabled');
    expect(buttonState({ enabled: true, active: true, pressed: true })).toBe('pressed');
    expect(buttonState({ enabled: true, active: true, pressed: false })).toBe('active');
    expect(buttonState({ enabled: true, active: false, pressed: false })).toBe('normal');
  });
  it('has colours for every state', () => {
    for (const s of ['normal', 'active', 'disabled', 'pressed'] as const)
      expect(WOOD_BUTTON[s].mid).toBeGreaterThan(0);
  });
});
