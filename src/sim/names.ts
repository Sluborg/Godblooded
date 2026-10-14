import type { World } from './world';
import type { GodDef } from './types';

// Hero names (docs/systems/meta.md, Saga). Drawn from the run's seed and the hero's id with a hash,
// not the run's random stream, so naming heroes never changes how a run plays out.

function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  // A final mix so close inputs spread.
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d) >>> 0;
  h ^= h >>> 12;
  return h >>> 0;
}

// A name for a new hero of this god, or undefined when the data has none for its pantheon.
export function nameHero(world: World, id: number, god: GodDef | undefined): string | undefined {
  const set = god && world.data.names?.[god.pantheon];
  if (!god || !set) return undefined;
  const pick = <T>(list: readonly T[], salt: string): T | undefined =>
    list.length > 0 ? list[hash(`${world.seed}:${id}:${salt}`) % list.length] : undefined;
  const female = hash(`${world.seed}:${id}:g`) % 2 === 1;
  const given = pick(female ? set.female : set.male, 'n');
  if (!given) return undefined;
  const tail = hash(`${world.seed}:${id}:t`) % 2 === 0;
  if (tail) {
    const epithet = pick(set.epithets, 'e');
    if (epithet) return `${given} ${epithet}`;
  }
  // 'Thorsson' reads right for a father; a god whose name ends in a (Freyja) takes the long form.
  if (set.patronym === 'suffix' && !god.name.endsWith('a'))
    return `${given} ${god.name}s${female ? 'dottir' : 'son'}`;
  return `${given} ${female ? 'daughter' : 'son'} of ${god.name}`;
}
