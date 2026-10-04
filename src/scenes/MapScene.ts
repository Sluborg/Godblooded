import Phaser from 'phaser';
import { COLORS } from '../config';
import { createWorld, snapshot, step, type Snapshot, type World } from '../sim/api';
import { attachCameraControls } from '../ui/cameraControls';
import { GRAYBOX_DATA } from './grayboxData';

const BUILDING_COLORS: Record<string, number> = {
  townHall: 0xc9a227,
  market: 0x4a7fb5,
  temple: 0xb5a4d6,
};
const BUILDING_SIZE = 96;

// Renders the sim snapshot as shapes. Holds no rules: it steps the world and draws what the
// snapshot says.
export class MapScene extends Phaser.Scene {
  private world!: World;
  private snap!: Snapshot;
  private speed = 1;
  private views = new Map<string, Phaser.GameObjects.GameObject>();

  constructor() {
    super('Map');
  }

  create(): void {
    const { width, height } = GRAYBOX_DATA.map;
    this.world = createWorld(1, GRAYBOX_DATA);
    this.cameras.main
      .setBounds(0, 0, width, height)
      .centerOn(GRAYBOX_DATA.townHall.x, GRAYBOX_DATA.townHall.y);
    this.cameras.main.setBackgroundColor(COLORS.background);
    this.add.rectangle(width / 2, height / 2, width, height, COLORS.ground);
    this.drawGrid(width, height);
    attachCameraControls(this);
    this.snap = snapshot(this.world);
    this.sync();
  }

  update(_time: number, deltaMs: number): void {
    step(this.world, deltaMs * this.speed);
    this.snap = snapshot(this.world);
    this.sync();
  }

  setSpeed(speed: number): void {
    this.speed = speed;
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
