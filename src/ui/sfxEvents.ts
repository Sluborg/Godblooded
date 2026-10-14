import type { SimEvent, Vec2 } from '../sim/api';

// Which sound a Sim event makes (docs/systems/audio.md section 2). Pure: it returns requests, the
// player decides whether they play (distance, pile-up, volume). Events not listed are silent.

export interface SfxRequest {
  id: string;
  // Where it happens on the map; a request without an `at` key is global (UI, stings, horns). A
  // request with an `at` that is undefined is a map sound whose place is unknown: it is dropped.
  at?: Vec2;
  // Stings and horns win over everything else.
  high?: boolean;
  // A strike sound: dropped every second time at 4x speed.
  hit?: boolean;
  // Minimum time between two of this sound (a shop coin at most once a second).
  minGapMs?: number;
}

export interface SfxCtx {
  unitPos(id: number): Vec2 | undefined;
  buildingPos(id: number): Vec2 | undefined;
  lairPos(id: number): Vec2 | undefined;
  // The first visual picture of a skill (`bolt`, `burst`...), if its row is known.
  skillVisual(skill: string): string | undefined;
}

const HIT_BY_TYPE: Record<string, string> = {
  physical: 'sfx_hit_phys',
  fire: 'sfx_hit_fire',
  frost: 'sfx_hit_frost',
  lightning: 'sfx_hit_lightning',
  death: 'sfx_hit_death',
  holy: 'sfx_hit_holy',
  magic: 'sfx_hit_magic',
};

// A windup longer than this is a slow, heavy weapon.
export const HEAVY_WINDUP_MS = 600;

export function sfxFor(e: SimEvent, ctx: SfxCtx): SfxRequest[] {
  switch (e.kind) {
    case 'windup':
      return [
        {
          id: e.inMs > HEAVY_WINDUP_MS ? 'sfx_windup_heavy' : 'sfx_windup_light',
          at: ctx.unitPos(e.attacker),
        },
      ];
    case 'hit': {
      if (e.tick) return [];
      const at = ctx.unitPos(e.target);
      if (e.dodged) return [{ id: 'sfx_dodge', at, hit: true }];
      const out: SfxRequest[] = [{ id: HIT_BY_TYPE[e.type] ?? 'sfx_hit_phys', at, hit: true }];
      // The crunch rides on the hit: it is not thinned on its own at 4x.
      if (e.crit) out.push({ id: 'sfx_crit', at });
      return out;
    }
    case 'heal':
      return e.source === 'miracle' ? [] : [{ id: 'sfx_heal', at: ctx.unitPos(e.target) }];
    case 'knockout':
      return [{ id: 'sfx_ko', at: ctx.unitPos(e.unit) }];
    case 'died':
      return [{ id: 'sfx_die_brute', at: ctx.unitPos(e.unit) }];
    case 'arrived':
      return [{ id: 'sfx_arrive', at: ctx.unitPos(e.unit) }];
    case 'built':
      return [{ id: 'sfx_build', at: ctx.buildingPos(e.building) }];
    case 'upgraded':
      return [{ id: 'sfx_upgrade', at: ctx.buildingPos(e.building) }];
    case 'bountyPlaced':
      return [{ id: 'sfx_coin_drop' }];
    case 'bountyRaised':
      return [{ id: 'sfx_coin_drop' }];
    case 'bountyCancelled':
      return [{ id: 'sfx_coin' }];
    case 'slain':
      return [{ id: 'sfx_slain', at: ctx.unitPos(e.unit) }];
    case 'bountyClaimed':
      return [{ id: 'sfx_coin', at: ctx.unitPos(e.unit) }];
    case 'shopped':
      return [{ id: 'sfx_shop', at: ctx.unitPos(e.unit), minGapMs: 1000 }];
    case 'levelUp':
    case 'pathOffer':
      return [{ id: 'sfx_levelup' }];
    case 'upgradePicked':
      // The card button already tapped; only an automatic pick has no button.
      return e.auto ? [{ id: 'sfx_ui_tap' }] : [];
    case 'tierUp':
      return [{ id: 'sfx_tierup', at: ctx.unitPos(e.unit) }];
    case 'workerHit':
    case 'workerFell':
    case 'guardFell':
      return [{ id: 'sfx_alarm', at: e.kind === 'workerHit' ? ctx.unitPos(e.unit) : e.pos }];
    case 'jarHome':
      return [{ id: 'sfx_chime' }];
    case 'raidWarning':
      return [{ id: 'sfx_horn_far', high: true }];
    case 'raid':
      return [{ id: 'sfx_horn', high: true }];
    case 'lairTierUp':
      return [{ id: 'sfx_roar', at: ctx.lairPos(e.lair) }];
    case 'lairDestroyed':
      return [{ id: 'sfx_collapse', at: ctx.lairPos(e.lair) }];
    case 'buildingDestroyed':
      return [{ id: 'sfx_crash', at: ctx.buildingPos(e.building) }];
    case 'bossEmerged':
      return [{ id: 'sfx_roar', at: ctx.unitPos(e.unit), high: true }];
    case 'enraged':
      return [{ id: 'sfx_roar', at: ctx.unitPos(e.unit) }];
    case 'miracle':
      return [{ id: `sfx_miracle_${e.pantheon}`, at: e.pos, high: true }];
    case 'cast': {
      const visual = ctx.skillVisual(e.skill);
      return visual ? [{ id: `sfx_skill_${visual}`, at: ctx.unitPos(e.caster) }] : [];
    }
    case 'partyFormed':
      return [{ id: 'sfx_party', at: ctx.unitPos(e.members[0]) }];
    case 'argue':
      return [{ id: 'sfx_argue', at: ctx.unitPos(e.a) }];
    case 'revenge':
      return [{ id: 'sfx_revenge', at: ctx.unitPos(e.hero) }];
    case 'avenged':
      return [{ id: 'sfx_avenged', at: ctx.unitPos(e.hero) }];
    case 'fled':
      return [{ id: 'sfx_flee', at: ctx.unitPos(e.unit) }];
    case 'revived':
      return [{ id: 'sfx_revive', at: ctx.unitPos(e.unit) }];
    default:
      return [];
  }
}
