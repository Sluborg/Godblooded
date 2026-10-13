import { describe, expect, it } from 'vitest';
import { formatArtDiag } from './artDiag';

const base = {
  expected: 85,
  loaded: 85,
  failed: 0,
  firstError: null,
  renderer: 'WEBGL',
  maxTexture: 4096,
};

describe('formatArtDiag', () => {
  it('shows counts and the renderer', () => {
    expect(formatArtDiag(base)).toBe('art 85/85 · WEBGL 4096px');
  });
  it('names the first failure', () => {
    expect(
      formatArtDiag({
        ...base,
        loaded: 0,
        failed: 85,
        firstError: 'assets/a.png 404',
        renderer: 'CANVAS',
        maxTexture: 0,
      }),
    ).toBe('art 0/85 (err 85: assets/a.png 404) · CANVAS');
  });
});
