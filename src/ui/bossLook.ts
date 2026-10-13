import { DEFAULT_TUNING } from '../sim/api';
import type { MonsterDef, UnitState } from '../sim/api';

// Boss state read from the snapshot alone, so it survives a save reload (events are not
// replayed): a boss is a unit of a monster type with a `boss` row, and it is enraged at or below
// `enrageAt` of its hp (the row overrides the default tuning).
export function bossState(
  u: Pick<UnitState, 'kind' | 'type' | 'hp' | 'maxHp'>,
  monsters: readonly MonsterDef[] | undefined,
): { boss: boolean; enraged: boolean } {
  if (u.kind !== 'monster') return { boss: false, enraged: false };
  const mon = monsters?.find((m) => m.id === u.type);
  if (!mon?.boss) return { boss: false, enraged: false };
  const at = mon.boss.enrageAt ?? DEFAULT_TUNING.boss.enrageAt;
  return { boss: true, enraged: u.hp <= u.maxHp * at };
}
