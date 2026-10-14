import Phaser from 'phaser';
import type { Snapshot } from '../sim/api';
import { NODE_STYLE, cleanseDone, glowStrength, sproutProgress, threatLeft } from './nodeLook';
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

  // An arc round the node, `share` of the way clockwise from the top (the ground layer).
  private ring(
    g: Phaser.GameObjects.Graphics,
    pos: { x: number; y: number },
    share: number,
    color: number,
    width: number,
  ): void {
    const rx = 96;
    const ry = 40;
    g.lineStyle(width + 4, 0x1a1410, 0.5).strokeEllipse(pos.x, pos.y - 6, rx * 2, ry * 2);
    if (share <= 0) return;
    g.lineStyle(width, color, 0.95).beginPath();
    const steps = Math.max(2, Math.round(share * 72));
    for (let i = 0; i <= steps; i++) {
      const a = -Math.PI / 2 + (i / steps) * share * Math.PI * 2;
      const x = pos.x + Math.cos(a) * rx;
      const y = pos.y - 6 + Math.sin(a) * ry;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.strokePath();
  }

  // Red cracks that spread out of the node while a lair sprouts on it (30 s warning).
  private sprout(
    g: Phaser.GameObjects.Graphics,
    pos: { x: number; y: number },
    progress: number | null,
    t: number,
  ): void {
    if (progress === null) return;
    const rays = 9;
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2 + 0.3;
      const len = 40 + progress * 150 * (0.7 + 0.3 * Math.sin(i * 2.1));
      let x = pos.x;
      let y = pos.y - 6;
      g.lineStyle(3 + progress * 3, 0xff3b30, 0.5 + 0.4 * progress);
      g.beginPath().moveTo(x, y);
      const segs = 5;
      for (let k = 1; k <= segs; k++) {
        const jag = Math.sin(i * 7 + k * 3.1) * 0.35;
        x += Math.cos(a + jag) * (len / segs);
        y += Math.sin(a + jag) * (len / segs) * 0.45;
        g.lineTo(x, y);
      }
      g.strokePath();
    }
    g.fillStyle(0xff3b30, 0.12 + 0.1 * Math.sin(t * 5) * progress).fillEllipse(
      pos.x,
      pos.y - 6,
      120 + progress * 120,
      50 + progress * 50,
    );
  }

  destroy(): void {
    this.ground.destroy();
    this.beams.destroy();
  }

  // `timing`: the world's tuning.nodes defileCountdownMs, cleanseMs and sproutWarnMs.
  update(
    snap: Snapshot,
    timing: { defileMs: number; cleanseMs: number; sproutWarnMs: number } = {
      defileMs: 10_000,
      cleanseMs: 10_000,
      sproutWarnMs: 30_000,
    },
  ): void {
    const g = this.ground;
    const b = this.beams;
    g.clear();
    b.clear();
    const t = this.scene.time.now / 1000;
    const still = getSettings().reducedMotion;
    for (const n of snap.nodes) {
      this.sprout(g, n.pos, sproutProgress(n.sproutAtMs, snap.timeMs, timing.sproutWarnMs), t);
      // A locked node lies under its lair: the lair's own ground shows; no glow of its own.
      if (n.state === 'locked') continue;
      // Raiders at a freed node: its light flickers red and a ring runs down 10 s to the defile.
      const left =
        n.state === 'freed' ? threatLeft(n.threatSinceMs, snap.timeMs, timing.defileMs) : null;
      const flicker = left !== null && !still && Math.sin(t * 12.5) > 0;
      const color = left !== null && flicker ? NODE_STYLE.defiled : NODE_STYLE[n.state];
      const s = glowStrength(n.state, n.pool, n.max);
      if (left !== null) this.ring(g, n.pos, left, 0xff3b30, 7);
      // Cleansing a defiled node: a gold ring fills as a hero or guard stands there.
      const done = n.state === 'defiled' ? cleanseDone(n.cleanseMs, timing.cleanseMs) : null;
      if (done !== null) this.ring(g, n.pos, done, NODE_STYLE.freed, 7);
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
