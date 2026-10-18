import { describe, expect, it, vi } from 'vitest';
import { updateFirst, type RegistrationLike, type WorkerLike } from './updateFirst';

class FakeWorker implements WorkerLike {
  private listeners: Array<() => void> = [];
  constructor(public state: string) {}
  addEventListener(_t: 'statechange', l: () => void): void {
    this.listeners.push(l);
  }
  set(state: string): void {
    this.state = state;
    this.listeners.forEach((l) => l());
  }
}

const reg = (over: Partial<RegistrationLike> = {}): RegistrationLike => ({
  update: () => Promise.resolve(),
  addEventListener: () => undefined,
  installing: null,
  waiting: null,
  active: null,
  ...over,
});
const opts = (reload = vi.fn(), note = vi.fn()) => ({ detectMs: 30, installMs: 60, reload, note });

describe('updateFirst', () => {
  it('does nothing without a service worker (first visit, dev)', async () => {
    const o = opts();
    expect(await updateFirst(undefined, o)).toBe('none');
    expect(o.reload).not.toHaveBeenCalled();
  });

  it('starts at once when there is no update', async () => {
    const o = opts();
    expect(await updateFirst(reg(), o)).toBe('none');
    expect(o.reload).not.toHaveBeenCalled();
    expect(o.note).not.toHaveBeenCalled();
  });

  it('carries on when the check itself is slow', async () => {
    const o = opts();
    expect(await updateFirst(reg({ update: () => new Promise(() => undefined) }), o)).toBe('none');
    expect(o.reload).not.toHaveBeenCalled();
  });

  it('installs the new version and reloads once, before anything else loads', async () => {
    const w = new FakeWorker('installing');
    const o = opts();
    const p = updateFirst(reg({ installing: w }), o);
    setTimeout(() => w.set('installed'), 5);
    setTimeout(() => w.set('activated'), 15);
    expect(await p).toBe('reload');
    expect(o.note).toHaveBeenCalledWith('Updating…');
    expect(o.reload).toHaveBeenCalledTimes(1);
  });

  it('reloads at once when the new worker is already activated', async () => {
    const o = opts();
    expect(await updateFirst(reg({ waiting: new FakeWorker('activated') }), o)).toBe('reload');
    expect(o.reload).toHaveBeenCalledTimes(1);
  });

  it('reacts to updatefound without waiting for update() to resolve (it resolves after the install)', async () => {
    const w = new FakeWorker('installing');
    let found: () => void = () => undefined;
    const r = reg({
      update: () => new Promise(() => undefined),
      addEventListener: (_t, l) => {
        found = l;
      },
    });
    const o = opts();
    const p = updateFirst(r, o);
    setTimeout(() => {
      r.installing = w;
      found();
    }, 5);
    setTimeout(() => w.set('activated'), 20);
    expect(await p).toBe('reload');
    expect(o.reload).toHaveBeenCalledTimes(1);
  });

  it('reloads when update() ends with a different, already active worker (skipWaiting)', async () => {
    const o = opts();
    const r = reg({ active: new FakeWorker('activated') });
    r.update = () => {
      r.active = new FakeWorker('activated');
      return Promise.resolve();
    };
    expect(await updateFirst(r, o)).toBe('reload');
    expect(o.reload).toHaveBeenCalledTimes(1);
  });

  it('does not reload when the active worker is the same one', async () => {
    const o = opts();
    expect(await updateFirst(reg({ active: new FakeWorker('activated') }), o)).toBe('none');
    expect(o.reload).not.toHaveBeenCalled();
  });

  it('lets the old build start when the install is slow (applies next launch)', async () => {
    const o = opts();
    expect(await updateFirst(reg({ installing: new FakeWorker('installing') }), o)).toBe('late');
    expect(o.reload).not.toHaveBeenCalled();
  });

  it('does not reload when the new worker is thrown away', async () => {
    const w = new FakeWorker('installing');
    const o = opts();
    const p = updateFirst(reg({ installing: w }), o);
    setTimeout(() => w.set('redundant'), 5);
    expect(await p).toBe('none');
    expect(o.reload).not.toHaveBeenCalled();
  });
});
