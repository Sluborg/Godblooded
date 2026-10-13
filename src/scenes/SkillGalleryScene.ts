import Phaser from 'phaser';
import { GAME_HEIGHT } from '../config';
import type { SimEvent, UnitState } from '../sim/api';
import { SkillFx } from '../ui/skillFx';
import { SKILL_VISUALS, shapeBox, type SkillVisual } from '../ui/skillLook';
import { UnitViews } from '../ui/unitViews';
import { drawGlyph } from '../ui/itemGlyph';
import type { Glyph } from '../ui/gearLook';

const TINTS = [0xfff06a, 0xff9a4d, 0x9fe0ff, 0xb98cff, 0xfff6c2];
const CELL_W = 256;
const CELL_H = 190;

// A review page for the skill pictures and status signs (`?gallery=skills`): each of the ten
// pictures plays in a loop in its own cell, and a row of heroes wears each status. For checking
// the drawing and for screenshots; the game does not use it.
export class SkillGalleryScene extends Phaser.Scene {
  constructor() {
    super('SkillGallery');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x3d5a2e);
    const fx = new SkillFx(this);
    SKILL_VISUALS.forEach((v, i) => {
      const cx = 20 + (i % 5) * CELL_W + CELL_W / 2;
      const cy = 20 + Math.floor(i / 5) * CELL_H + CELL_H / 2;
      this.add
        .text(cx, cy - CELL_H / 2 + 4, v, {
          fontFamily: 'monospace',
          fontSize: '18px',
          color: '#f4ead5',
        })
        .setOrigin(0.5, 0);
      this.add.circle(cx - 70, cy + 24, 9, 0x8a6a3a).setStrokeStyle(2, 0x000000);
      this.add.circle(cx + 50, cy + 24, 9, 0xb04030).setStrokeStyle(2, 0x000000);
      this.add.circle(cx + 80, cy + 4, 9, 0xb04030).setStrokeStyle(2, 0x000000);
      const play = (): void => this.play(fx, v, cx, cy, i);
      play();
      this.time.addEvent({ delay: 1500, loop: true, callback: play });
    });
    this.statusRow();
    this.gearRow();
  }

  private play(fx: SkillFx, v: SkillVisual, cx: number, cy: number, i: number): void {
    const shape = shapeBox({
      shape:
        v === 'cone'
          ? { kind: 'cone', radius: 120, angle: 70 }
          : v === 'line'
            ? { kind: 'line', length: 150, width: 36 }
            : { kind: 'circle', radius: v === 'aura' ? 80 : 60 },
    } as never);
    fx.play(v, {
      tint: TINTS[i % TINTS.length],
      from: { x: cx - 70, y: cy + 12 },
      point: { x: cx + 50, y: cy + 12 },
      hits: [
        { x: cx + 50, y: cy + 12 },
        { x: cx + 80, y: cy - 8 },
      ],
      shape,
      dashFrom: { x: cx - 100, y: cy + 12 },
      seed: i + 1,
    });
  }

  // Heroes wearing each status, through the real unit views.
  private statusRow(): void {
    const views = new UnitViews(this);
    const kinds = ['shield', 'mark', 'taunt', 'bind', 'buff', 'hot'] as const;
    const units: UnitState[] = kinds.map((_k, i) => ({
      id: 100 + i,
      kind: 'hero',
      type: 'warrior',
      tier: 1,
      god: 'thor',
      path: null,
      pos: { x: 120 + i * 190, y: GAME_HEIGHT - 70 },
      facing: { x: 1, y: 0 },
      hp: 80,
      maxHp: 100,
      target: null,
      ko: false,
      mode: 'wander',
      party: 1,
      trait: null,
      gold: 0,
      bounty: null,
    }));
    const events: SimEvent[] = kinds.map((k, i) => ({
      kind: 'status',
      unit: 100 + i,
      status: k,
      until: 1_000_000,
    }));
    let t = 0;
    this.time.addEvent({
      delay: 33,
      loop: true,
      callback: () => {
        t += 33;
        views.sync(units, t === 66 ? events : [], t, 33);
      },
    });
    kinds.forEach((k, i) =>
      this.add
        .text(120 + i * 190, GAME_HEIGHT - 20, k, {
          fontFamily: 'monospace',
          fontSize: '16px',
          color: '#f4ead5',
        })
        .setOrigin(0.5),
    );
  }

  // Heroes with gear (weapon, armour, potions) and the four purchase glyphs.
  private gearRow(): void {
    const views = new UnitViews(this);
    const gear = [
      { weapon: 0, armour: 0, potions: 0 },
      { weapon: 2, armour: 1, potions: 1 },
      { weapon: 3, armour: 2, potions: 3 },
      { weapon: 3, armour: 3, potions: 5 },
    ];
    const units: UnitState[] = gear.map((items, i) => ({
      id: 200 + i,
      kind: 'hero',
      type: 'warrior',
      tier: 1,
      god: 'thor',
      path: null,
      pos: { x: 160 + i * 190, y: 440 },
      facing: { x: 1, y: 0 },
      hp: 80,
      maxHp: 100,
      items: { ...items, charm: null },
      target: null,
      ko: false,
      mode: 'wander',
      party: 1,
      trait: null,
      gold: 0,
      bounty: null,
    }));
    let t = 0;
    this.time.addEvent({
      delay: 33,
      loop: true,
      callback: () => {
        t += 33;
        views.sync(units, [], t, 33);
      },
    });
    gear.forEach((g, i) =>
      this.add
        .text(160 + i * 190, 500, `w${g.weapon} a${g.armour} p${g.potions}`, {
          fontFamily: 'monospace',
          fontSize: '16px',
          color: '#f4ead5',
        })
        .setOrigin(0.5),
    );
    (['sword', 'shield', 'flask', 'charm'] as Glyph[]).forEach((glyph, i) => {
      const g = this.add.graphics({ x: 960 + (i % 2) * 70, y: 400 + Math.floor(i / 2) * 70 });
      drawGlyph(g, glyph);
    });
  }
}
