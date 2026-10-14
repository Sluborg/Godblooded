export type Wave = 'sine' | 'square' | 'saw' | 'tri' | 'noise';

// One sound layer: a wave (or noise) that sweeps from `f` to `f2` Hz over `d` seconds with a
// fast attack and an exponential fade. `at` delays its start; `lp` and `hp` filter it.
export interface SfxVoice {
  w: Wave;
  f: number;
  f2?: number;
  d: number;
  g: number;
  a?: number;
  at?: number;
  lp?: number;
  hp?: number;
}

export interface SfxPreset {
  id: string;
  voices: readonly SfxVoice[];
}

// Sound effect presets (docs/systems/audio.md section 2): small recipes for the Web Audio synth,
// one per event. Data rows: tune the numbers, add a row for a new event. First pass by Scene,
// made without hearing them; Balance and Lead tune. A voice is `v(wave, from Hz, seconds, gain,
// extras)`, with `to` for a pitch sweep, `at` for a delay, `lp` and `hp` for filters.
const v = (
  w: Wave,
  f: number,
  d: number,
  g: number,
  o: Partial<Omit<SfxVoice, 'w' | 'f' | 'd' | 'g' | 'f2'>> & { to?: number } = {},
): SfxVoice => {
  const { to, ...rest } = o;
  return { w, f, d, g, ...(to !== undefined ? { f2: to } : {}), ...rest };
};

const bell = (f: number, g: number, d = 0.9): SfxVoice[] => [
  v('sine', f, d, g),
  v('sine', f * 2.01, d * 0.7, g * 0.5),
  v('sine', f * 3.02, d * 0.4, g * 0.3),
];
const knock = (at: number): SfxVoice[] => [
  v('noise', 0, 0.05, 0.4, { lp: 1500, at }),
  v('sine', 200, 0.05, 0.4, { at, to: 120 }),
];
const coin = (at: number, g = 0.2): SfxVoice[] => [
  v('sine', 1400, 0.08, g, { to: 1800, at }),
  v('sine', 2100, 0.12, g * 0.8, { at: at + 0.06 }),
];

export const SFX: readonly SfxPreset[] = [
  { id: 'sfx_windup_light', voices: [v('noise', 0, 0.12, 0.18, { hp: 1200, lp: 5000 })] },
  {
    id: 'sfx_windup_heavy',
    voices: [v('noise', 0, 0.25, 0.25, { lp: 1800 }), v('saw', 90, 0.25, 0.1, { to: 60 })],
  },
  {
    id: 'sfx_hit_phys',
    voices: [v('noise', 0, 0.07, 0.35, { lp: 1400 }), v('sine', 160, 0.1, 0.5, { to: 60 })],
  },
  {
    id: 'sfx_hit_clang',
    voices: [
      v('square', 1200, 0.12, 0.12, { to: 900 }),
      v('noise', 0, 0.06, 0.2, { hp: 2500 }),
      v('tri', 2400, 0.15, 0.08),
    ],
  },
  {
    id: 'sfx_hit_fire',
    voices: [v('noise', 0, 0.22, 0.3, { lp: 1600 }), v('noise', 0, 0.12, 0.2, { hp: 2000 })],
  },
  {
    id: 'sfx_hit_frost',
    voices: [v('tri', 2200, 0.12, 0.2, { to: 1400 }), v('noise', 0, 0.08, 0.2, { hp: 5000 })],
  },
  {
    id: 'sfx_hit_lightning',
    voices: [v('saw', 120, 0.1, 0.25, { to: 700 }), v('noise', 0, 0.1, 0.25, { hp: 3000 })],
  },
  {
    id: 'sfx_hit_death',
    voices: [v('noise', 0, 0.3, 0.25, { lp: 600 }), v('saw', 200, 0.3, 0.1, { to: 90 })],
  },
  {
    id: 'sfx_hit_holy',
    voices: [v('sine', 1320, 0.35, 0.2), v('sine', 1980, 0.35, 0.12, { at: 0.05 })],
  },
  { id: 'sfx_hit_magic', voices: [v('sine', 700, 0.15, 0.25, { to: 1100 })] },
  {
    id: 'sfx_crit',
    voices: [v('noise', 0, 0.1, 0.3, { hp: 800 }), v('square', 90, 0.12, 0.2)],
  },
  { id: 'sfx_dodge', voices: [v('noise', 0, 0.1, 0.15, { hp: 3000, lp: 7000 })] },
  {
    id: 'sfx_heal',
    voices: [
      v('sine', 660, 0.3, 0.2, { to: 990 }),
      v('sine', 990, 0.3, 0.1, { to: 1320, at: 0.08 }),
    ],
  },
  {
    id: 'sfx_slain',
    voices: [v('sine', 90, 1.2, 0.5, { to: 45 }), v('noise', 0, 0.6, 0.2, { lp: 300 })],
  },
  {
    id: 'sfx_ko',
    voices: [v('sine', 110, 0.4, 0.55, { to: 55 }), v('saw', 90, 0.3, 0.15, { to: 70, lp: 500 })],
  },
  { id: 'sfx_die_brute', voices: [v('saw', 130, 0.5, 0.3, { to: 50, lp: 600 })] },
  {
    id: 'sfx_die_harrier',
    voices: [v('square', 1400, 0.35, 0.15, { to: 400 }), v('noise', 0, 0.2, 0.15, { hp: 3000 })],
  },
  { id: 'sfx_die_swarm', voices: [v('noise', 0, 0.4, 0.15, { lp: 5000, hp: 800 })] },
  { id: 'sfx_arrive', voices: bell(523, 0.25) },
  { id: 'sfx_revive', voices: bell(523, 0.12) },
  { id: 'sfx_build', voices: [...knock(0), ...knock(0.12), ...knock(0.24)] },
  {
    id: 'sfx_upgrade',
    voices: [
      ...knock(0),
      ...knock(0.12),
      v('tri', 523, 0.4, 0.15, { at: 0.25 }),
      v('tri', 659, 0.4, 0.15, { at: 0.32 }),
      v('tri', 784, 0.5, 0.15, { at: 0.4 }),
    ],
  },
  { id: 'sfx_coin_drop', voices: coin(0) },
  { id: 'sfx_coin', voices: [...coin(0), ...coin(0.09), ...coin(0.18)] },
  { id: 'sfx_shop', voices: coin(0, 0.1) },
  {
    id: 'sfx_levelup',
    voices: [
      v('tri', 392, 0.9, 0.12, { a: 0.15 }),
      v('tri', 494, 0.9, 0.12, { a: 0.15 }),
      v('tri', 587, 0.9, 0.12, { a: 0.15 }),
      v('sine', 784, 0.9, 0.08, { a: 0.2, at: 0.1 }),
    ],
  },
  {
    id: 'sfx_tierup',
    voices: [1000, 1400, 1800, 2400].map((f, i) =>
      v('sine', f, 1.2, 0.1, { a: 0.1, at: i * 0.08 }),
    ),
  },
  {
    id: 'sfx_horn_far',
    voices: [v('saw', 150, 1, 0.2, { to: 160, lp: 500, a: 0.2 })],
  },
  // One soft drum beat: a lair is about to grow (once per tier-up, in its last 15 s).
  {
    id: 'sfx_drum',
    voices: [v('sine', 90, 0.35, 0.45, { to: 55 }), v('noise', 400, 0.05, 0.08, { lp: 600 })],
  },
  { id: 'sfx_horn', voices: [v('saw', 180, 1.2, 0.3, { lp: 900, a: 0.15 })] },
  {
    id: 'sfx_roar',
    voices: [v('saw', 90, 1, 0.4, { to: 60, lp: 500 }), v('noise', 0, 1, 0.2, { lp: 700 })],
  },
  {
    id: 'sfx_collapse',
    voices: [v('noise', 0, 1, 0.5, { lp: 400 }), v('sine', 80, 1, 0.5, { to: 40 })],
  },
  {
    id: 'sfx_crash',
    voices: [v('noise', 0, 0.6, 0.5, { lp: 900 }), v('sine', 100, 0.5, 0.5, { to: 50 })],
  },
  {
    id: 'sfx_gong',
    voices: [v('sine', 110, 2.5, 0.4), v('sine', 165, 2, 0.2), v('sine', 247, 1.5, 0.1)],
  },
  { id: 'sfx_miracle_aesir', voices: [v('noise', 0, 1.5, 0.6, { lp: 300 })] },
  {
    id: 'sfx_miracle_greek',
    voices: [...bell(520, 0.3, 0.7), v('sine', 660, 0.7, 0.2, { at: 0.6 })],
  },
  { id: 'sfx_miracle_egyptian', voices: [v('tri', 262, 1.6, 0.2, { to: 523, a: 0.8 })] },
  { id: 'sfx_skill_bolt', voices: [v('saw', 800, 0.15, 0.2, { to: 300 })] },
  {
    id: 'sfx_skill_burst',
    voices: [v('noise', 0, 0.25, 0.3, { lp: 1200 }), v('sine', 120, 0.25, 0.4, { to: 60 })],
  },
  { id: 'sfx_skill_cone', voices: [v('noise', 0, 0.3, 0.3, { lp: 2500 })] },
  {
    id: 'sfx_skill_line',
    voices: [v('noise', 0, 0.15, 0.25, { hp: 1500 }), v('saw', 400, 0.15, 0.15, { to: 1200 })],
  },
  {
    id: 'sfx_skill_chain',
    voices: [
      v('saw', 100, 0.15, 0.25),
      v('saw', 140, 0.15, 0.25, { at: 0.05 }),
      v('saw', 120, 0.15, 0.25, { at: 0.1 }),
      v('noise', 0, 0.2, 0.2, { hp: 3000 }),
    ],
  },
  { id: 'sfx_skill_aura', voices: [v('sine', 300, 0.5, 0.25, { to: 450, a: 0.2 })] },
  { id: 'sfx_skill_shield', voices: [v('sine', 700, 0.3, 0.25), v('tri', 1050, 0.3, 0.12)] },
  { id: 'sfx_skill_dash', voices: [v('noise', 0, 0.12, 0.25, { hp: 1500, lp: 4000 })] },
  {
    id: 'sfx_skill_mark',
    voices: [v('tri', 900, 0.08, 0.2), v('tri', 1200, 0.08, 0.2, { at: 0.1 })],
  },
  {
    id: 'sfx_skill_pillar',
    voices: [
      v('saw', 60, 0.4, 0.4),
      v('noise', 0, 0.4, 0.3, { lp: 800 }),
      v('sine', 1500, 0.3, 0.15, { to: 300 }),
    ],
  },
  { id: 'sfx_ui_tap', voices: [v('sine', 880, 0.05, 0.25)] },
  { id: 'sfx_ui_back', voices: [v('sine', 660, 0.07, 0.25, { to: 440 })] },
  { id: 'sfx_ui_off', voices: [v('square', 120, 0.06, 0.12, { lp: 400 })] },
  {
    id: 'sfx_party',
    voices: [v('sine', 90, 0.12, 0.5, { to: 60 }), v('sine', 90, 0.12, 0.5, { to: 60, at: 0.18 })],
  },
  {
    id: 'sfx_argue',
    voices: [v('saw', 120, 0.15, 0.2, { lp: 400 }), v('saw', 100, 0.2, 0.2, { lp: 400, at: 0.18 })],
  },
  { id: 'sfx_revenge', voices: [v('saw', 150, 0.5, 0.25, { to: 400, a: 0.1, lp: 1500 })] },
  {
    id: 'sfx_avenged',
    voices: [
      v('noise', 0, 0.05, 0.4, { hp: 2000 }),
      v('sine', 100, 0.2, 0.5, { to: 60, at: 0.05 }),
    ],
  },
  {
    id: 'sfx_flee',
    voices: [0, 0.07, 0.14, 0.21, 0.28].map((at) =>
      v('noise', 0, 0.03, 0.12, { hp: 1500, lp: 5000, at }),
    ),
  },
];

const BY_ID = new Map(SFX.map((p) => [p.id, p]));
export const sfxPreset = (id: string): SfxPreset | undefined => BY_ID.get(id);
