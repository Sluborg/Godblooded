import { describe, expect, it } from 'vitest';
import { UI_STYLE } from './uiStyle';
import { panelBorder } from './woodFrame';

describe('panelBorder', () => {
  it('is wider on big panels but stays within the limits', () => {
    expect(panelBorder(200, 100)).toBe(UI_STYLE.border);
    expect(panelBorder(1160, 660)).toBeGreaterThan(UI_STYLE.border);
    expect(panelBorder(5000, 5000)).toBe(UI_STYLE.borderMax);
  });
});
