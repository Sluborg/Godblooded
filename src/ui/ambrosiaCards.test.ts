import { describe, expect, it } from 'vitest';
import { recallable, templeAmbrosiaCost } from './ambrosiaCards';

const g = (id: number, god: string, recalled = false) =>
  ({ id, god, type: 'x', recalled }) as never;

describe('Ambrosia cards', () => {
  it('prices the temple upgrade by tier, the last price holding above', () => {
    expect(templeAmbrosiaCost([60, 100], 1)).toBe(60);
    expect(templeAmbrosiaCost([60, 100], 2)).toBe(100);
    expect(templeAmbrosiaCost([60, 100], 3)).toBe(100);
  });

  it('lists graves of the temple pantheon that were not recalled', () => {
    const pantheon = (god: string | null) => (god === 'thor' ? 'aesir' : 'greek');
    const graves = [g(1, 'thor'), g(2, 'zeus'), g(3, 'thor', true)];
    expect(recallable(graves, 'aesir', pantheon).map((x) => x.id)).toEqual([1]);
  });
});
