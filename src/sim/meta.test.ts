import { describe, expect, it } from 'vitest';
import { GRAYBOX } from '../data/graybox';
import {
  altarCost,
  applyRun,
  buyRank,
  command,
  createWorld,
  dataFor,
  emptyMeta,
  essenceFor,
  metaRules,
  migrateMeta,
  pantheonsOf,
  playData,
  refundAltar,
  trialsOpen,
  type GameData,
  type MetaState,
  type RunReport,
} from './api';
import { spawnHero } from './world';
import type { HeroReport } from './types';

const hero = (over: Partial<HeroReport> = {}): HeroReport => ({
  unit: 1,
  type: 'warrior',
  god: 'odin',
  path: null,
  tier: 1,
  kills: 5,
  lairKills: 0,
  goldEarned: 0,
  knockouts: 0,
  damage: 0,
  healing: 0,
  mvp: false,
  ...over,
});

// (The tests read only some fields of the report: the rest is left out.)
const report = (over: Partial<RunReport> = {}): RunReport =>
  ({
    seed: 1,
    taxBanked: 0,
    taxLost: 0,
    uncollected: 0,
    outcome: 'lost',
    timeMs: 5 * 60_000 + 20_000,
    mvp: null,
    heroes: [hero()],
    lairsCleared: [{ lair: 1, type: 'barrow', timeMs: 1, by: 1 }],
    goldHistory: [],
    facts: {
      peakLevel: {},
      heroPantheons: ['aesir'],
      templePantheons: ['aesir'],
      gear2: false,
      boss: null,
    },
    ...over,
  }) as RunReport;

const withMeta = (m: Partial<MetaState>): MetaState => ({ ...emptyMeta(), ...m });

describe('meta state', () => {
  it('starts fresh from anything broken, newer or missing', () => {
    expect(migrateMeta(undefined)).toEqual(emptyMeta());
    expect(migrateMeta('x')).toEqual(emptyMeta());
    expect(migrateMeta({ version: 99, essence: 500 })).toEqual(emptyMeta());
    const ok = withMeta({
      runs: 3,
      wins: 1,
      essence: 40,
      altar: { 'war-chest': 2 },
      lean: 'greek',
    });
    expect(migrateMeta(JSON.parse(JSON.stringify(ok)))).toEqual(ok);
    expect(migrateMeta({ version: 1, essence: 'lots', altar: { a: -2, b: 1 } }).altar).toEqual({
      b: 1,
    });
  });
});

describe('Essence', () => {
  it('pays 10 a lair, 5 a tier 3 hero, 1 a minute, 30 for the boss, 10 a Trial won with', () => {
    const r = report({
      outcome: 'won',
      timeMs: 12 * 60_000 + 5_000,
      lairsCleared: [1, 2, 3].map((n) => ({ lair: n, type: 'barrow', timeMs: n, by: 1 })),
      heroes: [hero({ tier: 3 }), hero({ tier: 3, unit: 2 }), hero({ unit: 3 })],
    });
    const e = essenceFor(GRAYBOX, r, ['blood-moon', 'lean-years']);
    expect(e.lines.map((l) => [l.what, l.total])).toEqual([
      ['lairs', 30],
      ['tier3', 10],
      ['minutes', 12],
      ['boss', 30],
      ['trials', 20],
    ]);
    expect(e.total).toBe(102);
  });

  it('a loss pays for what it did, without the boss or Trials', () => {
    const e = essenceFor(GRAYBOX, report(), ['blood-moon']);
    expect(e.total).toBe(10 + 5);
    expect(e.lines.some((l) => l.what === 'boss' || l.what === 'trials')).toBe(false);
  });
});

describe('after a run', () => {
  it('counts the run, pays Essence, opens goals and writes tier 3 heroes into the Saga', () => {
    const r = report({
      outcome: 'won',
      heroes: [hero({ tier: 3, kills: 9, path: 'thor-hammerborn' })],
      facts: {
        peakLevel: { aesir: 8 },
        heroPantheons: ['aesir'],
        templePantheons: ['aesir'],
        gear2: true,
        boss: 'wyrm-nest',
      },
    });
    const out = applyRun(GRAYBOX, emptyMeta(), r);
    expect(out.meta).toMatchObject({ runs: 1, wins: 1, nextSeed: 2, lastBoss: 'wyrm-nest' });
    expect(out.meta.essence).toBe(out.essence.total);
    const ids = out.newUnlocks.map((u) => u.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'smithy',
        'skill-cards',
        'greek',
        'charms',
        'favour-cards',
        'trials',
      ]),
    );
    expect(ids).not.toContain('egyptian');
    expect(out.saga).toHaveLength(1);
    expect(out.saga[0]).toMatchObject({
      god: 'odin',
      path: 'thor-hammerborn',
      kills: 9,
      ending: 'won',
    });
    expect(out.meta.saga).toHaveLength(1);
    // the same goals are not opened twice
    const again = applyRun(GRAYBOX, out.meta, r);
    expect(again.newUnlocks.map((u) => u.id)).toEqual([]);
  });

  it('Greek goal: a win, or three runs; Egyptian: a win with a Greek hero in the town', () => {
    const lost = (m: MetaState) => applyRun(GRAYBOX, m, report());
    let m = emptyMeta();
    for (let i = 0; i < 2; i++) m = lost(m).meta;
    expect(m.unlocks).not.toContain('greek');
    m = lost(m).meta;
    expect(m.unlocks).toContain('greek');
    const win = applyRun(GRAYBOX, emptyMeta(), report({ outcome: 'won' }));
    expect(win.meta.unlocks).toContain('greek');
    expect(win.meta.unlocks).not.toContain('egyptian');
    const greekWin = applyRun(
      GRAYBOX,
      emptyMeta(),
      report({
        outcome: 'won',
        facts: {
          peakLevel: {},
          heroPantheons: ['aesir', 'greek'],
          templePantheons: ['aesir'],
          gear2: false,
          boss: null,
        },
      }),
    );
    expect(greekWin.meta.unlocks).toContain('egyptian');
  });

  it('a won run with Trials marks them won; the Saga keeps 50 entries, newest first', () => {
    const won = applyRun(GRAYBOX, withMeta({ unlocks: ['trials'] }), report({ outcome: 'won' }), [
      'blood-moon',
    ]);
    expect(won.meta.trialsWon).toEqual(['blood-moon']);
    let m = emptyMeta();
    for (let i = 0; i < 60; i++) {
      m = applyRun(GRAYBOX, m, report({ heroes: [hero({ tier: 3, kills: i })] })).meta;
    }
    expect(m.saga).toHaveLength(50);
    expect(m.saga[0].kills).toBe(59);
  });
});

describe('the Altar', () => {
  it('sells ranks in order for Essence, refuses at the top or when short, and refunds in full', () => {
    const rule = metaRules(GRAYBOX).altar.find((a) => a.id === 'war-chest');
    if (!rule) throw new Error('no row');
    let m = withMeta({ essence: 300 });
    expect(altarCost(m, rule)).toBe(40);
    for (const cost of [40, 80, 120]) {
      const r = buyRank(GRAYBOX, m, 'war-chest');
      if (!r.ok) throw new Error(r.reason);
      expect(m.essence - r.meta.essence).toBe(cost);
      m = r.meta;
    }
    expect(m.altar['war-chest']).toBe(3);
    expect(buyRank(GRAYBOX, m, 'war-chest')).toMatchObject({ reason: 'already at the top rank' });
    expect(buyRank(GRAYBOX, withMeta({ essence: 10 }), 'war-chest')).toMatchObject({
      reason: 'not enough essence',
    });
    expect(buyRank(GRAYBOX, m, 'nope')).toMatchObject({ reason: 'unknown upgrade' });
    expect(refundAltar(GRAYBOX, m)).toMatchObject({ essence: 300, altar: {} });
  });

  it('Favoured is bought per unlocked pantheon', () => {
    const m = withMeta({ essence: 500 });
    expect(buyRank(GRAYBOX, m, 'favoured-temple', 'greek')).toMatchObject({
      reason: 'pantheon not unlocked',
    });
    expect(buyRank(GRAYBOX, m, 'favoured-temple', 'aesir').ok).toBe(true);
    const open = withMeta({ essence: 500, unlocks: ['greek'] });
    const r = buyRank(GRAYBOX, open, 'favoured-temple', 'greek');
    expect(r.ok && r.meta.altar['favoured-temple:greek']).toBe(1);
    expect(pantheonsOf(GRAYBOX, open)).toEqual(expect.arrayContaining(['aesir', 'greek']));
    expect(pantheonsOf(GRAYBOX, m)).toEqual(['aesir']);
  });
});

describe('the data a run is played on', () => {
  it('leaves out what is not unlocked', () => {
    const d = dataFor(GRAYBOX, emptyMeta());
    expect(d.buildings.some((b) => b.id === 'smithy')).toBe(false);
    expect(d.buildings.some((b) => b.id === 'temple_aesir')).toBe(true);
    expect(d.gods?.every((g) => g.pantheon === 'aesir')).toBe(true);
    expect(d.items?.some((i) => i.slot === 'charm')).toBe(false);
    expect(d.upgrades?.some((u) => u.family === 'favour')).toBe(false);
    const full = dataFor(
      GRAYBOX,
      withMeta({ unlocks: metaRules(GRAYBOX).unlocks.map((u) => u.id) }),
    );
    expect(full.buildings.length).toBe(GRAYBOX.buildings.length);
    expect(full.gods?.length).toBe(GRAYBOX.gods?.length);
  });

  it('applies the Altar: start gold, building costs and tuning', () => {
    const meta = withMeta({
      altar: {
        'war-chest': 2,
        'devout-masons': 1,
        'hearth-fire': 2,
        'deep-roots': 1,
        'fourth-card': 1,
        'watchful-eyes': 1,
      },
      unlocks: ['smithy'],
    });
    const d = playData(GRAYBOX, meta);
    expect(d.startGold).toBe(GRAYBOX.startGold + 100);
    const cost = (data: GameData, id: string) => data.buildings.find((b) => b.id === id)?.cost ?? 0;
    expect(cost(d, 'temple_aesir')).toBe(Math.round(cost(GRAYBOX, 'temple_aesir') * 0.9));
    expect(cost(d, 'market')).toBe(cost(GRAYBOX, 'market'));
    const w = createWorld(1, d);
    const base = createWorld(1, GRAYBOX);
    expect(w.tuning.hero.koMs).toBeCloseTo(base.tuning.hero.koMs * 0.85 * 0.85, 0);
    expect(w.tuning.town.townHallHp).toBe(Math.round(base.tuning.town.townHallHp * 1.2));
    expect(w.tuning.party.offerSize).toBe(4);
    expect(w.tuning.town.raidWarnMs).toBe(base.tuning.town.raidWarnMs + 5000);
  });

  it('Trials only apply once they are open, and change the run', () => {
    const closed = playData(GRAYBOX, emptyMeta(), ['lean-years']);
    expect(closed.startGold).toBe(GRAYBOX.startGold);
    expect(trialsOpen(GRAYBOX, emptyMeta())).toBe(false);
    const open = withMeta({ unlocks: ['trials'] });
    const d = playData(GRAYBOX, open, [
      'lean-years',
      'blood-moon',
      'restless-dead',
      'thin-faith',
      'hungry-gods',
    ]);
    const w = createWorld(1, d);
    const base = createWorld(1, GRAYBOX);
    expect(d.startGold).toBe(Math.round(GRAYBOX.startGold * 0.5));
    expect(w.tuning.town.raidFirstMs).toBe(base.tuning.town.raidFirstMs - 120_000);
    expect(w.tuning.hero.recruitMs).toBe(Math.round(base.tuning.hero.recruitMs * 1.25));
    expect(w.tuning.combat.bossDeathChance).toBeCloseTo(base.tuning.combat.bossDeathChance * 2);
    expect(w.lairs.every((l) => l.tier === 2)).toBe(true);
  });

  it('the chosen lean leads the map, if it is open', () => {
    const open = withMeta({ unlocks: ['greek'], lean: 'greek' });
    for (const seed of [1, 2, 3]) {
      expect(createWorld(seed, playData(GRAYBOX, open)).mapLean[0]).toBe('greek');
    }
    const locked = withMeta({ lean: 'greek' });
    expect(playData(GRAYBOX, locked).mapRules?.forceLean).toBeUndefined();
  });
});

describe('Altar hooks in the sim', () => {
  it('bounty flags cost less gold than they hold', () => {
    const w = createWorld(1, playData(GRAYBOX, withMeta({ altar: { 'bounty-ledger': 2 } })));
    const gold = w.gold;
    expect(command(w, { kind: 'placeBounty', pos: { x: 1000, y: 1000 }, gold: 100 }).ok).toBe(true);
    expect(gold - w.gold).toBe(81);
    expect(w.bounties[0].gold).toBe(100);
  });

  it('the first party of a run starts with XP', () => {
    const w = createWorld(1, playData(GRAYBOX, withMeta({ altar: { 'seasoned-blood': 1 } })));
    const a = spawnHero(w, 'odin', { x: 100, y: 100 });
    const b = spawnHero(w, 'odin', { x: 300, y: 100 });
    const pa = w.parties.get(w.units.find((u) => u.id === a)?.party ?? 0);
    const pb = w.parties.get(w.units.find((u) => u.id === b)?.party ?? 0);
    expect(pa?.xp).toBe(15);
    expect(pb?.xp).toBe(0);
  });

  it('a Favoured pantheon recruits faster', () => {
    const meta = withMeta({ essence: 0, altar: { 'favoured-temple:aesir': 1 } });
    const w = createWorld(1, playData(GRAYBOX, meta));
    expect(w.tuning.hero.pantheonRecruitMult).toEqual({ aesir: 0.85 });
  });
});
