// Dev only: like src/dev/animStage.ts but with several heroes in a row, all walking together then
// attacking the foe ahead (the party-cape lineup of the hero style mock). Run by scripts/anim-record.mjs.
import type Phaser from 'phaser';
import { releaseSets } from '/src/ui/parts/bake';
import { UnitViews } from '/src/ui/unitViews';
import type { SimEvent, UnitState } from '/src/sim/api';
import { PHASES } from '/src/dev/animStage';

export interface Member {
  god: string;
  path?: string;
  tier?: number;
  type: string;
}
const FPS = 15;
const DT = 1000 / FPS;
const unit = (id: number, over: Partial<UnitState>): UnitState => ({
  id,
  kind: 'hero',
  type: 'warrior',
  tier: 1,
  god: null,
  path: null,
  pos: { x: 0, y: 0 },
  facing: { x: 1, y: 0 },
  hp: 60,
  maxHp: 60,
  target: null,
  ko: false,
  mode: 'wander',
  party: 0,
  trait: null,
  gold: 0,
  bounty: null,
  ...over,
});

export class PartyStage {
  private views!: UnitViews;
  private t = 0;
  private frame = 0;
  readonly total = Math.round(Object.values(PHASES).reduce((a, b) => a + b, 0) * FPS);
  private home = { x: 0, y: 0 };
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly game: Phaser.Game,
    private readonly spec: { members: Member[]; zoom: number; gap?: number; lookUp?: number },
  ) {}

  start(at: { x: number; y: number }): void {
    this.home = at;
    const cam = this.scene.cameras.main;
    cam.stopFollow();
    cam.setBounds(-100000, -100000, 200000, 200000);
    cam.setZoom(this.spec.zoom * (this.game.scale.gameSize.width / 1280));
    cam.centerOn(at.x + 34, at.y - (this.spec.lookUp ?? 14));
    this.scene.scene.get('Hud').scene.setVisible(false);
    this.views = new UnitViews(this.scene);
    this.game.loop.sleep();
  }

  step(): boolean {
    if (this.frame >= this.total) return false;
    const t = this.frame / FPS;
    const walkStart = PHASES.idle;
    const attackStart = walkStart + PHASES.walk;
    const inWalk = t >= walkStart;
    const walked = !inWalk ? 0 : Math.min(PHASES.walk, t - walkStart) * 40;
    const gap = this.spec.gap ?? 30;
    const n = this.spec.members.length;
    const x0 = this.home.x - 36 - ((n - 1) * gap) / 2;
    const attacking = t >= attackStart;
    const units = this.spec.members.map((m, i) =>
      unit(i + 1, {
        type: m.type,
        god: m.god,
        path: m.path ?? null,
        tier: m.tier ?? 1,
        pos: { x: x0 + i * gap + walked, y: this.home.y + (i % 2 ? 6 : -6) },
        facing: { x: 1, y: 0 },
        target: attacking ? 100 : null,
      }),
    );
    const foeX = x0 + (n - 1) * gap + PHASES.walk * 40 + 70;
    units.push(
      unit(100, {
        kind: 'monster',
        type: 'draugr',
        pos: { x: foeX, y: this.home.y },
        facing: { x: -1, y: 0 },
        hp: 200,
        maxHp: 200,
      }),
    );
    const events: SimEvent[] = [];
    const swing = (at: number, from: number) => {
      const dt = t - at;
      if (dt >= 0 && dt < DT / 1000)
        events.push({ kind: 'windup', attacker: from, target: 100, inMs: 400 });
      if (dt >= 0.4 && dt < 0.4 + DT / 1000)
        events.push({
          kind: 'hit',
          attacker: from,
          target: 100,
          damage: 6,
          dodged: false,
          type: 'physical',
        });
    };
    for (let i = 0; i < n; i++) {
      swing(attackStart + 0.1 + i * 0.12, i + 1);
      swing(attackStart + 0.95 + i * 0.12, i + 1);
    }
    this.views.sync(units, events, Math.round(t * 1000), DT);
    this.game.step(this.t, DT);
    this.t += DT;
    this.frame++;
    return true;
  }

  grab(box: { w: number; h: number }): string {
    const canvas = this.game.canvas;
    const k = canvas.width / 1280;
    const cam = this.scene.cameras.main;
    const sx = (this.home.x + 34 - cam.worldView.x) * cam.zoom;
    const sy = (this.home.y - (this.spec.lookUp ?? 14) - cam.worldView.y) * cam.zoom;
    const out = document.createElement('canvas');
    out.width = Math.round(box.w * k);
    out.height = Math.round(box.h * k);
    const ctx = out.getContext('2d') as CanvasRenderingContext2D;
    ctx.drawImage(
      canvas,
      sx - out.width / 2,
      sy - out.height / 2,
      out.width,
      out.height,
      0,
      0,
      out.width,
      out.height,
    );
    return out.toDataURL('image/png');
  }

  stop(): void {
    releaseSets(this.scene);
    this.game.loop.wake();
  }
}
