import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, MIN_TOUCH } from '../config';
import { GRAYBOX } from '../data/graybox';
import type { Vec2 } from '../sim/api';
import { makeButton, type Button } from '../ui/button';
import type { MapScene } from './MapScene';

const SPEEDS = [1, 2, 4];
const TEXT = { fontFamily: 'Georgia, serif', fontSize: '30px', color: COLORS.text };

function formatClock(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Screen-space overlay on top of MapScene: gold, run clock, speed buttons, build menu.
// It reads the numbers MapScene publishes in the registry and sends build commands back
// through MapScene.tryBuild; it holds no rules.
export class HudScene extends Phaser.Scene {
  private goldText!: Phaser.GameObjects.Text;
  private clockText!: Phaser.GameObjects.Text;
  private toast!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private speedButtons: Button[] = [];
  private menu: Phaser.GameObjects.GameObject[] = [];
  private menuButtons: { button: Button; cost: number }[] = [];
  private menuRect: Phaser.Geom.Rectangle | null = null;
  private menuPlot: Vec2 | null = null;

  constructor() {
    super('Hud');
  }

  create(): void {
    const map = this.scene.get('Map') as MapScene;
    this.add.rectangle(GAME_WIDTH / 2, 36, GAME_WIDTH, 72, 0x000000, 0.45);
    this.goldText = this.add.text(20, 36, '', { ...TEXT, color: '#f2c14e' }).setOrigin(0, 0.5);
    this.clockText = this.add.text(GAME_WIDTH / 2, 36, '0:00', TEXT).setOrigin(0.5);
    SPEEDS.forEach((s, i) => {
      const b = makeButton(
        this,
        GAME_WIDTH - 60 - (SPEEDS.length - 1 - i) * 100,
        40,
        90,
        MIN_TOUCH,
        `${s}x`,
        () => {
          this.registry.set('speed', s);
          this.refreshSpeed();
        },
      );
      this.speedButtons.push(b);
    });
    this.refreshSpeed();
    this.toast = this.add
      .text(GAME_WIDTH / 2, 640, '', {
        ...TEXT,
        backgroundColor: '#000000aa',
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.statusText = this.add
      .text(GAME_WIDTH / 2, 300, '', { ...TEXT, fontSize: '72px', color: '#f2c14e' })
      .setOrigin(0.5);

    map.events.on('plotTapped', (plot: Vec2 | null) =>
      plot ? this.openMenu(plot) : this.closeMenu(),
    );
    this.events.once('shutdown', () => map.events.off('plotTapped'));
  }

  update(): void {
    this.goldText.setText(`Gold ${this.registry.get('gold') ?? 0}`);
    this.clockText.setText(formatClock((this.registry.get('timeMs') as number) ?? 0));
    const status = this.registry.get('status') as string | undefined;
    this.statusText.setText(status === 'won' ? 'VICTORY' : status === 'lost' ? 'TOWN LOST' : '');
    const gold = (this.registry.get('gold') as number) ?? 0;
    for (const { button, cost } of this.menuButtons) button.setEnabled(gold >= cost);
  }

  // True when a screen point is over HUD controls, so the map ignores the press.
  blocks(x: number, y: number): boolean {
    if (y < 72) return true;
    return this.menuRect?.contains(x, y) ?? false;
  }

  private refreshSpeed(): void {
    const cur = this.registry.get('speed') as number;
    this.speedButtons.forEach((b, i) => b.setActive(SPEEDS[i] === cur));
  }

  private openMenu(plot: Vec2): void {
    this.closeMenu();
    this.menuPlot = plot;
    const n = GRAYBOX.buildings.length;
    const bw = 230;
    const bh = 100;
    const gap = 14;
    const w = n * bw + (n + 1) * gap;
    const h = bh + 2 * gap + 40;
    const cx = GAME_WIDTH / 2;
    const cy = 720 - h / 2 - 12;
    this.menuRect = new Phaser.Geom.Rectangle(cx - w / 2, cy - h / 2, w, h);
    const panel = this.add
      .rectangle(cx, cy, w, h, 0x120d09, 0.92)
      .setStrokeStyle(3, COLORS.gold, 0.8);
    const title = this.add
      .text(cx, cy - h / 2 + 24, 'Build here', {
        ...TEXT,
        fontSize: '24px',
        color: COLORS.textMuted,
      })
      .setOrigin(0.5);
    this.menu.push(panel, title);
    GRAYBOX.buildings.forEach((def, i) => {
      const x = cx - w / 2 + gap + bw / 2 + i * (bw + gap);
      const y = cy + 20;
      const button = makeButton(
        this,
        x,
        y,
        bw,
        bh,
        `${def.id.replace('_', ' ')}\n${def.cost} gold`,
        () => this.build(def.id),
      );
      this.menu.push(button.container);
      this.menuButtons.push({ button, cost: def.cost });
    });
  }

  private closeMenu(): void {
    this.menu.forEach((o) => o.destroy());
    this.menu = [];
    this.menuButtons = [];
    this.menuRect = null;
    this.menuPlot = null;
  }

  private build(type: string): void {
    if (!this.menuPlot) return;
    const map = this.scene.get('Map') as MapScene;
    const res = map.tryBuild(type, this.menuPlot);
    if (res.ok) this.closeMenu();
    else this.showToast(res.reason);
  }

  private showToast(text: string): void {
    this.toast.setText(text).setAlpha(1);
    this.tweens.add({ targets: this.toast, alpha: 0, delay: 1200, duration: 400 });
  }
}
