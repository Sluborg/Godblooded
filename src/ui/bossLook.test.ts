import { describe, expect, it } from 'vitest';
import { bossState } from './bossLook';
import type { MonsterDef } from '../sim/api';

const monsters = [
  { id: 'wyrm', boss: {} },
  { id: 'rat' },
  { id: 'drake', boss: { enrageAt: 0.8 } },
];
const defs = monsters as unknown as MonsterDef[];
const unit = (type: string, hp: number) => ({ kind: 'monster' as const, type, hp, maxHp: 100 });

describe('bossState', () => {
  it('flags a boss from its monster row', () => {
    expect(bossState(unit('wyrm', 100), defs)).toEqual({ boss: true, enraged: false });
    expect(bossState(unit('rat', 10), defs)).toEqual({ boss: false, enraged: false });
  });
  it('enrages at the default share and at a row override', () => {
    expect(bossState(unit('wyrm', 50), defs).enraged).toBe(true);
    expect(bossState(unit('wyrm', 51), defs).enraged).toBe(false);
    expect(bossState(unit('drake', 80), defs).enraged).toBe(true);
  });
  it('never flags a hero', () => {
    expect(bossState({ kind: 'hero', type: 'wyrm', hp: 1, maxHp: 100 }, defs).boss).toBe(false);
  });
});
