import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { GRAYBOX } from '../data/graybox';
import {
  command,
  createWorld,
  snapshot,
  step,
  type CommandResult,
  type Snapshot,
  type Vec2,
  type World,
} from '../sim/api';
import { attachCameraControls } from '../ui/cameraControls';
import { makePlots, PLOT_RADIUS, PLOT_SIZE } from './plots';
import type { HudScene } from './HudScene';

const BUILDING_COLORS: Record<string, number> = {
  townhall: 0xc9a227,
  townHall: 0xc9a227,
  temple_aesir: 0xb5a4d6,
  market: 0x4a7fb5,
  shrine: 0x7fbf9a,
  tower: 0x9a9a9a,
};
const BUILDING_SIZE = 96;

// Renders the sim snapshot as shapes. Holds no rules: it steps the world, draws what the
// snapshot says and turns taps into commands.
export class MapScene extends Phaser.Scene {
  private world!: World;
  private snap!: Snapshot;
  private plots: Vec2[] = makePlots(GRAYBOX.townHall);
  private plotViews: Phaser.GameObjects.Rectangle[] = [];
  private views = new Map<string, Phaser.GameObjects.GameObject>();

  constructor() {
    super('Map');
  }

  create(): void {
    const { width, height } = GRAYBOX.map;
    this.world = createWorld(1, GRAYBOX);
    this.registry.set('speed', 1);
    const cam = this.cameras.main;
    const minZoom = Math.max(GAME_WIDTH / width, GAME_HEIGHT / height);
    cam.setBounds(0, 0, width, height).setZoom(Math.max(minZoom, 0.8));
    cam.centerOn(GRAYBOX.townHall.x, GRAYBOX.townHall.y);
    cam.setBackgroundColor(COLORS.background);
    this.add.rectangle(width / 2, height / 2, width, height, COLORS.ground);
    this.drawGrid(width, height);
    this.plotViews = this.plots.map((p) =>
      this.add
        .rectangle(p.x, p.y, PLOT_SIZE, PLOT_SIZE, 0xffffff, 0.08)
        .setStrokeStyle(3, 0xffffff, 0.35),
    );
    attachCameraControls(this, {
      minZoom,
      onTap: (w) => this.events.emit('plotTapped', this.plotAt(w)),
      blocked: (x, y) => this.hud()?.blocks(x, y) ?? false,
    });
    this.snap = snapshot(this.world);
    this.sync();
    this.scene.launch('Hud');
  }

  update(_time: number, deltaMs: number): void {
    const speed = (this.registry.get('speed') as number) ?? 1;
    step(this.world, deltaMs * speed);
    this.snap = snapshot(this.world);
    this.registry.set('gold', this.snap.gold);
    this.registry.set('timeMs', this.snap.timeMs);
    this.registry.set('status', this.snap.status);
    this.sync();
  }

  // Sim command entry for the HUD. The sim decides; the result carries the refusal reason.
  tryBuild(type: string, pos: Vec2): CommandResult {
    return command(this.world, { kind: 'build', type, pos });
  }

  private hud(): HudScene | null {
    return this.scene.get('Hud') as HudScene | null;
  }

  // The free plot under a world position, or null.
  private plotAt(w: Phaser.Math.Vector2): Vec2 | null {
    let best: Vec2 | null = null;
    let bestD = PLOT_RADIUS;
    for (const p of this.plots) {
      const d = Phaser.Math.Distance.Between(p.x, p.y, w.x, w.y);
      if (d < bestD && !this.occupied(p)) {
        best = p;
        bestD = d;
      }
    }
    return best;
  }

  private occupied(p: Vec2): boolean {
    return this.snap.buildings.some(
      (b) => Math.hypot(b.pos.x - p.x, b.pos.y - p.y) < PLOT_SIZE / 2,
    );
  }

  private drawGrid(width: number, height: number): void {
    const g = this.add.graphics().lineStyle(2, 0x000000, 0.12);
    for (let x = 0; x <= width; x += 200) g.lineBetween(x, 0, x, height);
    for (let y = 0; y <= height; y += 200) g.lineBetween(0, y, width, y);
  }

  // Creates, moves and removes one view per snapshot entity, keyed by kind and sim id.
  private sync(): void {
    const seen = new Set<string>();
    for (const b of this.snap.buildings) {
      const key = `b${b.id}`;
      seen.add(key);
      if (!this.views.has(key)) this.views.set(key, this.makeBuilding(b.type, b.pos.x, b.pos.y));
    }
    for (const b of this.snap.bounties) {
      const key = `f${b.id}`;
      seen.add(key);
      if (!this.views.has(key)) this.views.set(key, this.makeBounty(b.gold, b.pos.x, b.pos.y));
    }
    for (const [key, view] of this.views) {
      if (!seen.has(key)) {
        view.destroy();
        this.views.delete(key);
      }
    }
    this.plotViews.forEach((v, i) => v.setVisible(!this.occupied(this.plots[i])));
  }

  private makeBuilding(type: string, x: number, y: number): Phaser.GameObjects.Container {
    const body = this.add
      .rectangle(
        0,
        -BUILDING_SIZE / 2,
        BUILDING_SIZE,
        BUILDING_SIZE,
        BUILDING_COLORS[type] ?? 0x888888,
      )
      .setStrokeStyle(4, 0x000000, 0.5);
    const label = this.add
      .text(0, -BUILDING_SIZE / 2, type, {
        fontFamily: 'Georgia, serif',
        fontSize: '20px',
        color: '#1a1410',
      })
      .setOrigin(0.5);
    return this.add.container(x, y, [body, label]).setDepth(y);
  }

  private makeBounty(gold: number, x: number, y: number): Phaser.GameObjects.Container {
    const pole = this.add.rectangle(0, -40, 6, 80, 0x4b2e1a);
    const flag = this.add.triangle(18, -68, 0, 0, 0, 28, 36, 14, COLORS.blood);
    const label = this.add
      .text(0, 8, `${gold}`, { fontFamily: 'Georgia, serif', fontSize: '22px', color: '#f2c14e' })
      .setOrigin(0.5, 0);
    return this.add.container(x, y, [pole, flag, label]).setDepth(y);
  }
}
