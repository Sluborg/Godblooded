import Phaser from 'phaser';
import type { Vec2 } from '../sim/api';
import { angleTo, jagged, type ShapeBox, type SkillVisual } from './skillLook';

// The ten skill pictures (docs/systems/paths-and-skills.md section 4), a few shapes and a tint
// each, no art. A picture is a Graphics object that fades out and destroys itself, so there is
// nothing to clean up. `k` scales the size and strength with the effect level (style.ts).

const DEPTH = 900_000;

export interface PlayOpts {
  tint: number;
  // The caster's chest, and where the cast lands.
  from: Vec2;
  point: Vec2;
  // The units the cast touched, in order (chain jumps along them).
  hits: readonly Vec2[];
  shape: ShapeBox;
  // Where the caster stood before a dash.
  dashFrom?: Vec2;
  // Seeds the chain's jagged lines.
  seed: number;
}

export class SkillFx {
  constructor(private readonly scene: Phaser.Scene) {}

  play(visual: SkillVisual, o: PlayOpts, k = 1): void {
    switch (visual) {
      case 'bolt':
        return this.bolt(o, k);
      case 'burst':
        return this.burst(o.point, o.shape.radius, o.tint, k);
      case 'cone':
        return this.cone(o, k);
      case 'line':
        return this.line(o, k);
      case 'chain':
        return this.chain(o, k);
      case 'aura':
        return this.aura(o, k);
      case 'shield':
        return this.pop(o.hits[0] ?? o.from, o.tint, 46, k);
      case 'dash':
        return this.dash(o, k);
      case 'mark':
        return this.pop(o.hits[0] ?? o.point, o.tint, 30, k);
      case 'pillar':
        return this.pillar(o, k);
    }
  }

  private gfx(x = 0, y = 0): Phaser.GameObjects.Graphics {
    return this.scene.add.graphics({ x, y }).setDepth(DEPTH);
  }

  private fade(
    g: Phaser.GameObjects.Graphics,
    ms: number,
    extra: Partial<Phaser.Types.Tweens.TweenBuilderConfig> = {},
  ): void {
    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      duration: ms,
      ease: 'Quad.easeIn',
      onComplete: () => g.destroy(),
      ...extra,
    });
  }

  // A glowing ball flies from the weapon to the target.
  private bolt(o: PlayOpts, k: number): void {
    const to = o.hits[0] ?? o.point;
    const g = this.gfx(o.from.x, o.from.y);
    g.fillStyle(o.tint, 0.35).fillCircle(0, 0, 16 * k);
    g.fillStyle(o.tint, 0.95).fillCircle(0, 0, 8 * k);
    g.fillStyle(0xffffff, 0.9).fillCircle(0, 0, 3.5 * k);
    this.scene.tweens.add({
      targets: g,
      x: to.x,
      y: to.y,
      duration: 170,
      ease: 'Quad.easeIn',
      onComplete: () => {
        g.destroy();
        this.burst(to, 28, o.tint, k * 0.8);
      },
    });
  }

  // An expanding ring at a point.
  private burst(at: Vec2, radius: number, tint: number, k: number): void {
    const g = this.gfx(at.x, at.y);
    g.fillStyle(tint, 0.18).fillCircle(0, 0, radius);
    g.lineStyle(4 * k, tint, 0.95).strokeCircle(0, 0, radius);
    g.lineStyle(2, 0xffffff, 0.7).strokeCircle(0, 0, radius * 0.92);
    g.setScale(0.15);
    this.scene.tweens.add({ targets: g, scale: 1, duration: 260, ease: 'Cubic.easeOut' });
    this.fade(g, 300);
  }

  // A fan from the caster toward the point.
  private cone(o: PlayOpts, k: number): void {
    const a = angleTo(o.from, o.point);
    const half = Phaser.Math.DegToRad((o.shape.angle || 60) / 2);
    const g = this.gfx(o.from.x, o.from.y);
    g.fillStyle(o.tint, 0.28);
    g.slice(0, 0, o.shape.radius, a - half, a + half, false).fillPath();
    g.lineStyle(3 * k, o.tint, 0.9);
    g.slice(0, 0, o.shape.radius, a - half, a + half, false).strokePath();
    g.setScale(0.4);
    this.scene.tweens.add({ targets: g, scale: 1, duration: 150, ease: 'Cubic.easeOut' });
    this.fade(g, 340);
  }

  // A straight streak through the targets.
  private line(o: PlayOpts, k: number): void {
    const a = angleTo(o.from, o.point);
    const len = o.shape.length || 260;
    const w = (o.shape.width || 40) * 0.5;
    const g = this.gfx(o.from.x, o.from.y).setRotation(a);
    g.fillStyle(o.tint, 0.25).fillRect(0, -w, len, 2 * w);
    g.fillStyle(o.tint, 0.9).fillRect(0, -3 * k, len, 6 * k);
    g.fillStyle(0xffffff, 0.8).fillRect(0, -1.2, len, 2.4);
    this.fade(g, 300);
  }

  // Jagged lines jumping from the caster along the hit units.
  private chain(o: PlayOpts, k: number): void {
    const pts = jagged([o.from, ...o.hits], o.seed, 3, 14);
    const draw = (g: Phaser.GameObjects.Graphics): void => {
      g.clear();
      g.lineStyle(7 * k, o.tint, 0.3).strokePoints(pts as Vec2[]);
      g.lineStyle(3 * k, o.tint, 0.95).strokePoints(pts as Vec2[]);
      g.lineStyle(1.2, 0xffffff, 0.9).strokePoints(pts as Vec2[]);
    };
    const g = this.gfx();
    draw(g);
    // A flicker: the second strike takes another path.
    this.scene.time.delayedCall(70, () => {
      if (!g.active) return;
      pts.splice(0, pts.length, ...jagged([o.from, ...o.hits], o.seed + 1, 3, 14));
      draw(g);
    });
    this.fade(g, 300);
  }

  // A ring under the caster pulsing outward twice.
  private aura(o: PlayOpts, k: number): void {
    const r = o.shape.radius || 90;
    for (let i = 0; i < 2; i++) {
      const g = this.gfx(o.from.x, o.from.y + 30);
      g.fillStyle(o.tint, 0.14).fillEllipse(0, 0, r * 2, r);
      g.lineStyle(3 * k, o.tint, 0.85).strokeEllipse(0, 0, r * 2, r);
      g.setScale(0.2).setAlpha(0);
      this.scene.tweens.add({
        targets: g,
        scale: 1,
        alpha: 1,
        delay: i * 220,
        duration: 260,
        ease: 'Cubic.easeOut',
        onComplete: () => this.fade(g, 340),
      });
    }
  }

  // A smear along the dash: faded copies of a light streak from where it began to where it ended.
  private dash(o: PlayOpts, k: number): void {
    const from = o.dashFrom ?? o.from;
    const g = this.gfx();
    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      g.fillStyle(o.tint, 0.5 * (1 - t) + 0.08).fillEllipse(
        from.x + (o.from.x - from.x) * t,
        from.y + (o.from.y - from.y) * t,
        34 * k,
        (22 - 8 * t) * k,
      );
    }
    this.fade(g, 360);
  }

  // A short pop of rings at a unit: shield and mark casts, before the status sign takes over.
  private pop(at: Vec2, tint: number, r: number, k: number): void {
    const g = this.gfx(at.x, at.y);
    g.lineStyle(3 * k, tint, 0.9).strokeCircle(0, 0, r);
    g.fillStyle(tint, 0.18).fillCircle(0, 0, r);
    g.setScale(0.5);
    this.scene.tweens.add({ targets: g, scale: 1.15, duration: 220, ease: 'Cubic.easeOut' });
    this.fade(g, 320);
  }

  // A column of light falling on a point.
  private pillar(o: PlayOpts, k: number): void {
    const w = Math.max(30, Math.min(o.shape.radius, 90)) * 0.9;
    const g = this.gfx(o.point.x, o.point.y);
    g.fillStyle(o.tint, 0.22).fillRect(-w / 2, -300, w, 300);
    g.fillStyle(o.tint, 0.55).fillRect(-w / 4, -300, w / 2, 300);
    g.fillStyle(0xffffff, 0.85).fillRect(-w / 12, -300, w / 6, 300);
    g.fillStyle(o.tint, 0.4).fillEllipse(0, 0, w * 1.8 * k, w * 0.7 * k);
    g.setScale(1, 0.05);
    this.scene.tweens.add({ targets: g, scaleY: 1, duration: 120, ease: 'Quad.easeIn' });
    this.fade(g, 420, { delay: 120 });
  }
}
