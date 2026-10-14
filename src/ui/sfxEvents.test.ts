import { describe, expect, it } from 'vitest';
import { SFX } from '../data/sfx';
import type { SimEvent } from '../sim/api';
import { HEAVY_WINDUP_MS, sfxFor, type SfxCtx } from './sfxEvents';

const P = { x: 5, y: 6 };
const ctx: SfxCtx = {
  unitPos: () => P,
  buildingPos: () => P,
  lairPos: () => P,
  skillVisual: (s) => (s === 'known' ? 'bolt' : undefined),
};
const ids = new Set(SFX.map((p) => p.id));
const hit = (o: Partial<Extract<SimEvent, { kind: 'hit' }>>): SimEvent => ({
  kind: 'hit',
  attacker: 1,
  target: 2,
  damage: 5,
  dodged: false,
  type: 'physical',
  ...o,
});

describe('sfxFor', () => {
  it('picks a hit sound by damage type, adds a crit crunch and keeps burn ticks silent', () => {
    expect(sfxFor(hit({ type: 'fire' }), ctx).map((r) => r.id)).toEqual(['sfx_hit_fire']);
    expect(sfxFor(hit({ crit: true }), ctx).map((r) => r.id)).toEqual(['sfx_hit_phys', 'sfx_crit']);
    expect(sfxFor(hit({ crit: true }), ctx)[1].hit).toBeUndefined();
    expect(sfxFor(hit({ dodged: true }), ctx)[0].id).toBe('sfx_dodge');
    expect(sfxFor(hit({ tick: true }), ctx)).toEqual([]);
    expect(sfxFor(hit({ type: 'unheard-of' }), ctx)[0].id).toBe('sfx_hit_phys');
  });
  it('windups are light or heavy by length; hits sit at the target', () => {
    const w = (inMs: number): SimEvent => ({ kind: 'windup', attacker: 1, target: 2, inMs });
    expect(sfxFor(w(300), ctx)[0].id).toBe('sfx_windup_light');
    expect(sfxFor(w(HEAVY_WINDUP_MS + 1), ctx)[0].id).toBe('sfx_windup_heavy');
    expect(sfxFor(hit({}), ctx)[0].at).toEqual(P);
  });
  it('UI and horn sounds are global; the horn is high priority; the shop coin is rate limited', () => {
    expect(sfxFor({ kind: 'bountyPlaced', bounty: 1, gold: 5 }, ctx)[0].at).toBeUndefined();
    expect(sfxFor({ kind: 'raid', lair: 1, size: 3 }, ctx)[0]).toMatchObject({ high: true });
    expect(sfxFor({ kind: 'shopped', unit: 1, spent: 5, tax: 1 }, ctx)[0].minGapMs).toBe(1000);
  });
  it('a skill cast sounds like its first picture, silent when unknown', () => {
    const cast = (skill: string): SimEvent => ({
      kind: 'cast',
      skill,
      caster: 1,
      target: null,
      point: P,
      inMs: 500,
    });
    expect(sfxFor(cast('known'), ctx)[0].id).toBe('sfx_skill_bolt');
    expect(sfxFor(cast('other'), ctx)).toEqual([]);
  });
  it('a card pick taps once (the button), an automatic pick taps itself', () => {
    expect(sfxFor({ kind: 'upgradePicked', party: 1, upgrade: 'x' }, ctx)).toEqual([]);
    expect(sfxFor({ kind: 'upgradePicked', party: 1, upgrade: 'x', auto: true }, ctx)).toHaveLength(
      1,
    );
  });
  it('silent events make no request', () => {
    expect(sfxFor({ kind: 'autosave' }, ctx)).toEqual([]);
    expect(sfxFor({ kind: 'won' }, ctx)).toEqual([]);
  });
  it('every preset id a mapped event uses exists in the preset table', () => {
    const events: SimEvent[] = [
      hit({ type: 'fire', crit: true }),
      hit({ type: 'frost' }),
      hit({ type: 'lightning' }),
      hit({ type: 'death' }),
      hit({ type: 'holy' }),
      hit({ type: 'magic' }),
      hit({ dodged: true }),
      { kind: 'windup', attacker: 1, target: 2, inMs: 100 },
      { kind: 'windup', attacker: 1, target: 2, inMs: 1000 },
      { kind: 'heal', healer: 1, target: 2, amount: 3 },
      { kind: 'knockout', unit: 1, by: 2 },
      { kind: 'died', unit: 1, type: 'x', by: 2, bounty: 1, xp: 1 },
      { kind: 'arrived', unit: 1, type: 'x', god: null },
      { kind: 'built', building: 1, type: 'x' },
      { kind: 'upgraded', building: 1, type: 'x', tier: 2 },
      { kind: 'bountyPlaced', bounty: 1, gold: 1 },
      { kind: 'bountyClaimed', bounty: 1, unit: 1, gold: 1 },
      { kind: 'shopped', unit: 1, spent: 1, tax: 1 },
      { kind: 'levelUp', party: 1, level: 2, offer: [] },
      { kind: 'pathOffer', party: 1, hero: 1, options: [] },
      { kind: 'upgradePicked', party: 1, upgrade: 'x' },
      { kind: 'tierUp', unit: 1, tier: 2, path: null },
      { kind: 'raid', lair: 1, size: 1 },
      { kind: 'lairTierUp', lair: 1, tier: 2 },
      { kind: 'lairDestroyed', lair: 1, type: 'x', by: 1, bounty: 1 },
      { kind: 'buildingDestroyed', building: 1, type: 'x' },
      { kind: 'bossEmerged', unit: 1, lair: 1 },
      { kind: 'enraged', unit: 1 },
      { kind: 'miracle', id: 'x', pantheon: 'aesir', pos: P, tellMs: 1 },
      { kind: 'miracle', id: 'x', pantheon: 'greek', pos: P, tellMs: 1 },
      { kind: 'miracle', id: 'x', pantheon: 'egyptian', pos: P, tellMs: 1 },
      { kind: 'partyFormed', party: 1, members: [1] },
      { kind: 'argue', a: 1, b: 2 },
      { kind: 'revenge', hero: 1, target: 2, victim: 3 },
      { kind: 'avenged', hero: 1, target: 2 },
      { kind: 'fled', unit: 1 },
      { kind: 'slain', unit: 1, by: 2, type: 'x', god: null, pos: P },
      { kind: 'bountyRaised', bounty: 1, gold: 1, total: 2 },
      { kind: 'bountyCancelled', bounty: 1, gold: 1, refund: 1 },
      { kind: 'upgradePicked', party: 1, upgrade: 'x', auto: true },
      { kind: 'revived', unit: 1 },
    ];
    for (const e of events)
      for (const r of sfxFor(e, ctx)) expect(ids.has(r.id), `${e.kind} -> ${r.id}`).toBe(true);
    for (const v of [
      'bolt',
      'burst',
      'cone',
      'line',
      'chain',
      'aura',
      'shield',
      'dash',
      'mark',
      'pillar',
    ])
      expect(ids.has(`sfx_skill_${v}`), v).toBe(true);
    for (const id of ['sfx_ui_tap', 'sfx_ui_back', 'sfx_ui_off'])
      expect(ids.has(id), id).toBe(true);
  });
});
