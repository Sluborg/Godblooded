import { describe, expect, it } from 'vitest';
import { seedText } from './seedText';

describe('seedText', () => {
  it('names the seed', () => {
    expect(seedText(123456)).toBe('Seed 123456');
  });
});
