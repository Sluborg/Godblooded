import Phaser from 'phaser';
import type { Snapshot } from '../sim/api';
import { NODE_STYLE, glowStrength } from './nodeLook';
import { getSettings } from './settings';

const NODE_UI_DEPTH = 700_000;

// Draws the celestial nodes: a glow disc on the ground and, once freed, a column of light.
export class NodeViews {
  private readonly ground: Phaser.GameObjects.Graphics;
  private readonly beams: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: Phaser.Scene) {
    this.ground = scene.add.graphics().setDepth(0.8).setBlendMode(Phaser.BlendModes.ADD);
    this.beams = scene.add.graphics().setDepth(NODE_UI_DEPTH).setBlendMode(Phaser.BlendModes.ADD);
  }

  destroy(): void {
    this.ground.destroy();
    this.beams.destroy();
  }

  update(snap: Snapshot): void {
    const g = this.ground;
    const b = this.beams;
    g.clear();
    b.clear();
    const t = this.scene.time.now / 1000;
    const still = getSettings().reducedMotion;
    for (const n of snap.nodes) {
      // A locked node lies under its lair: the lair's own ground shows; no glow of its own.
      if (n.state === 'locked') continue;
      const color = NODE_STYLE[n.state];
      const s = glowStrength(n.state, n.pool, n.max);
      const breathe = still ? 1 : 0.88 + 0.12 * Math.sin(t * 1.6 + n.id);
      const { x, y } = n.pos;
      g.fillStyle(color, 0.3 * s * breathe).fillEllipse(x, y - 6, 210, 88);
      g.fillStyle(color, 0.5 * s * breathe).fillEllipse(x, y - 6, 120, 50);
      g.lineStyle(4, color, 0.8 * s).strokeEllipse(x, y - 6, 150, 62);
      // The column: stacked fading bars, tallest and brightest at a full pool.
      const h = 140 + 160 * s;
      const steps = 8;
      for (let i = 0; i < steps; i++) {
        const k = i / steps;
        b.fillStyle(color, 0.6 * s * (1 - k) * breathe).fillRect(
          x - 26 + k * 12,
          y - 6 - h * (k + 1 / steps),
          52 - k * 24,
          h / steps + 1,
        );
      }
    }
  }
}
