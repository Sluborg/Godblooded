import Phaser from 'phaser';
import type { Snapshot, Vec2 } from '../sim/api';
import { GAME_HEIGHT, TAP_SLOP } from '../config';
import { viewWidth } from './view';
import { worldToHud } from './camMath';
import { activeWarnings, edgeArrow, type RaidWarningNote } from './raidArrow';

// Under the top bar and clear of the screen border: where the arrow may sit.
const area = () => ({ left: 60, top: 110, right: viewWidth() - 60, bottom: GAME_HEIGHT - 60 });
const MAX_ARROWS = 3;

// The HUD side of the raid warning (events.md section 4): a red arrow at the edge pointing at the
// lair a raid comes from, with a skull icon, for as long as the warning lasts. A tap pans the
// camera to the lair. Nothing is drawn while the lair is on screen (its ring and trail show it).
export class RaidArrowView {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly zones: Phaser.GameObjects.Zone[] = [];
  private notes: RaidWarningNote[] = [];
  private screenPos: (Vec2 | null)[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly jumpTo: (pos: Vec2) => void,
  ) {
    this.g = scene.add.graphics().setDepth(45);
    for (let i = 0; i < MAX_ARROWS; i++) {
      const z = scene.add.zone(0, 0, 100, 100).setDepth(46).setInteractive();
      z.on('pointerup', (p: Phaser.Input.Pointer) => {
        if (p.getDistance() >= TAP_SLOP) return;
        const pos = this.target(i);
        if (pos) this.jumpTo(pos);
      });
      z.setVisible(false).disableInteractive();
      this.zones.push(z);
    }
  }

  private lairPos: (Vec2 | undefined)[] = [];

  private target(i: number): Vec2 | undefined {
    return this.lairPos[i];
  }

  add(note: RaidWarningNote): void {
    this.notes = this.notes.filter((n) => n.raid !== note.raid).concat(note);
  }

  // True when a press at this HUD position is on an arrow (the map must ignore it).
  blocks(x: number, y: number): boolean {
    return this.screenPos.some((p) => p !== null && Math.hypot(p.x - x, p.y - y) < 56);
  }

  update(snap: Snapshot, cam: Phaser.Cameras.Scene2D.Camera): void {
    this.notes = activeWarnings(this.notes, snap.timeMs);
    const g = this.g;
    g.clear();
    this.screenPos = [];
    this.lairPos = [];
    this.zones.forEach((z) => z.setVisible(false).disableInteractive());
    const pulse = 0.8 + 0.2 * Math.sin(this.scene.time.now / 160);
    this.notes.slice(0, MAX_ARROWS).forEach((note, i) => {
      const target = note.at ?? snap.lairs.find((l) => l.id === note.lair)?.pos;
      if (!target) return;
      const a = edgeArrow(worldToHud(cam, target), area());
      this.lairPos[i] = target;
      if (a.onScreen) return;
      this.screenPos[i] = { x: a.x, y: a.y };
      // The arrow head points outwards, at the lair; the icon disc sits just inside it.
      const ix = a.x - Math.cos(a.angle) * 30;
      const iy = a.y - Math.sin(a.angle) * 30;
      g.fillStyle(0xe03a2a, pulse);
      const tip = { x: a.x + Math.cos(a.angle) * 24, y: a.y + Math.sin(a.angle) * 24 };
      const px = -Math.sin(a.angle);
      const py = Math.cos(a.angle);
      g.fillTriangle(tip.x, tip.y, a.x + px * 22, a.y + py * 22, a.x - px * 22, a.y - py * 22);
      g.fillStyle(0x1a0f14, 0.95).fillCircle(ix, iy, 26);
      g.lineStyle(4, 0xe03a2a, 1).strokeCircle(ix, iy, 26);
      // The skull of the lair plates.
      g.fillStyle(0xf4ead5, 1)
        .fillCircle(ix, iy - 3, 10)
        .fillRect(ix - 5, iy + 3, 10, 8);
      g.fillStyle(0x1a0f14, 1)
        .fillCircle(ix - 3.5, iy - 3, 2.8)
        .fillCircle(ix + 3.5, iy - 3, 2.8)
        .fillRect(ix - 1, iy + 4, 2, 5);
      const z = this.zones[i];
      z.setPosition(ix, iy).setSize(112, 112).setVisible(true).setInteractive();
    });
  }

  destroy(): void {
    this.g.destroy();
    this.zones.forEach((z) => z.destroy());
  }
}
