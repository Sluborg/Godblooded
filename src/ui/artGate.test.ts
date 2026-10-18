import { describe, expect, it, vi } from 'vitest';
import { ArtGate } from './artGate';

describe('ArtGate', () => {
  it('runs at once when the art is in', () => {
    const g = new ArtGate();
    const go = vi.fn();
    const wait = vi.fn();
    g.request(true, go, wait);
    expect(go).toHaveBeenCalledTimes(1);
    expect(wait).not.toHaveBeenCalled();
  });

  it('two taps while loading start one thing, the latest', () => {
    const g = new ArtGate();
    const a = vi.fn();
    const b = vi.fn();
    const wait = vi.fn();
    g.request(false, a, wait);
    g.request(false, b, wait);
    expect(wait).toHaveBeenCalledTimes(1);
    g.release();
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
    g.release();
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('a cancel (the scene stopped) drops the pending action', () => {
    const g = new ArtGate();
    const go = vi.fn();
    g.request(false, go, () => undefined);
    g.cancel();
    g.release();
    expect(go).not.toHaveBeenCalled();
    expect(g.waiting).toBe(false);
  });
});
