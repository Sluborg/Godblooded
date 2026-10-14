import { describe, expect, it } from 'vitest';
import { copyReplay, replayButtonLabel } from './replayCode';

describe('replay code', () => {
  it('has a button only when the run has a code', () => {
    expect(replayButtonLabel(null, false)).toBeNull();
    expect(replayButtonLabel('', false)).toBeNull();
    expect(replayButtonLabel('abc', false)).toBe('Copy replay code');
    expect(replayButtonLabel('abc', true)).toBe('Replay code copied');
  });

  it('copies through the clipboard and reports a refusal', async () => {
    let got = '';
    expect(await copyReplay('xyz', { writeText: async (t) => void (got = t) })).toBe(true);
    expect(got).toBe('xyz');
    expect(
      await copyReplay('xyz', {
        writeText: async () => {
          throw new Error('denied');
        },
      }),
    ).toBe(false);
    expect(await copyReplay('xyz', undefined)).toBe(false);
  });
});

describe('replayButtonLabel failure', () => {
  it('says so when the clipboard refused', () => {
    expect(replayButtonLabel('abc', 'failed')).toBe('Copy failed');
  });
});
