import Phaser from 'phaser';
import { RENDER_SCALE } from '../config';
import { emberDot } from './groundDecal';
import { emberPose } from './emberPose';

// Embers rising from a lair: a few baked dots per lair moved by a clock, no particle system. Cheap on
// a phone (about 7 images a lair, one texture), still when "reduced motion" is on.
const COUNT = 7;

interface Ember {
  img: Phaser.GameObjects.Image;
  phase: number;
  dx: number;
  speed: number;
}

export class LairFx {
  private readonly groups = new Map<
    Phaser.GameObjects.GameObject,
    { embers: Ember[]; x: number; y: number; reach: number }
  >();
  private readonly key: string;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly still: () => boolean,
  ) {
    this.key = emberDot(scene);
  }

  // Embers for a lair at (x, y) `w` wide; they go with `owner` (the lair's view).
  add(owner: Phaser.GameObjects.GameObject, x: number, y: number, w: number): void {
    const embers: Ember[] = [];
    for (let i = 0; i < COUNT; i++) {
      const img = this.scene.add
        .image(x, y, this.key)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(y + 1)
        .setScale(1 / RENDER_SCALE);
      embers.push({
        img,
        phase: i / COUNT,
        dx: ((i % 4) - 1.5) * (w * 0.14),
        speed: 0.18 + (i % 3) * 0.05,
      });
    }
    this.groups.set(owner, { embers, x, y, reach: w * 0.55 });
    owner.once(Phaser.GameObjects.Events.DESTROY, () => this.remove(owner));
  }

  remove(owner: Phaser.GameObjects.GameObject): void {
    const g = this.groups.get(owner);
    if (!g) return;
    g.embers.forEach((e) => e.img.destroy());
    this.groups.delete(owner);
  }

  update(timeMs: number): void {
    const t = this.still() ? 0 : timeMs;
    for (const g of this.groups.values()) {
      for (const e of g.embers) {
        const p = emberPose(e.phase, e.speed, e.dx, t, g.reach);
        e.img.setPosition(g.x + p.x, g.y + p.y).setAlpha(this.still() ? 0.5 : p.alpha);
      }
    }
  }
}
