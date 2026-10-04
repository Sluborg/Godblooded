import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, MIN_TOUCH } from '../config';
import { GRAYBOX } from '../data/graybox';
import type { CommandResult } from '../sim/api';
import { makeButton, type Button } from '../ui/button';
import { PartyPanel } from '../ui/partyPanel';
import type { SimEvent } from '../sim/api';
import type { MapScene, MapTap } from './MapScene';

const SPEEDS = [1, 2, 4];
const BOUNTY_AMOUNTS = [25, 50, 100, 200];

interface MenuOption {
  label: string;
  cost: number;
  pick: () => void;
}
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
  private banner!: Phaser.GameObjects.Text;
  private panel!: PartyPanel;
  private endObjects: Phaser.GameObjects.GameObject[] = [];
  private speedButtons: Button[] = [];
  private menu: Phaser.GameObjects.GameObject[] = [];
  private menuButtons: { button: Button; cost: number }[] = [];
  private menuRect: Phaser.Geom.Rectangle | null = null;

  constructor() {
    super('Hud');
  }

  create(): void {
    // Scene instances are reused on restart: drop state that pointed at the old display list.
    this.panel = new PartyPanel(this);
    this.endObjects = [];
    this.speedButtons = [];
    this.menu = [];
    this.menuButtons = [];
    this.menuRect = null;
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
    this.banner = this.add
      .text(GAME_WIDTH / 2, 112, '', {
        ...TEXT,
        fontSize: '34px',
        backgroundColor: '#8a1c2bdd',
        padding: { x: 20, y: 8 },
      })
      .setOrigin(0.5)
      .setAlpha(0);

    const onTap = (tap: MapTap) => this.onMapTap(map, tap);
    const onEvents = (events: readonly SimEvent[]) => this.onSimEvents(map, events);
    map.events.on('mapTapped', onTap);
    map.events.on('simEvents', onEvents);
    this.events.once('shutdown', () => {
      map.events.off('mapTapped', onTap);
      map.events.off('simEvents', onEvents);
    });
  }

  update(): void {
    this.goldText.setText(`Gold ${this.registry.get('gold') ?? 0}`);
    this.clockText.setText(formatClock((this.registry.get('timeMs') as number) ?? 0));
    const status = this.registry.get('status') as string | undefined;
    if ((status === 'won' || status === 'lost') && this.endObjects.length === 0)
      this.showEnd(status);
    this.panel.update((this.scene.get('Map') as MapScene).snapshot);
    const gold = (this.registry.get('gold') as number) ?? 0;
    for (const { button, cost } of this.menuButtons) button.setEnabled(gold >= cost);
  }

  // True when a screen point is over HUD controls, so the map ignores the press.
  blocks(x: number, y: number): boolean {
    if (y < 72 || this.endObjects.length > 0) return true;
    if (this.panel.isOpen && this.panel.rect.contains(x, y)) return true;
    return this.menuRect?.contains(x, y) ?? false;
  }

  // Warnings the player must notice: raids, lost buildings, fallen lairs.
  private onSimEvents(map: MapScene, events: readonly SimEvent[]): void {
    for (const e of events) {
      if (e.kind === 'raid') {
        const lair = map.snapshot.lairs.find((l) => l.id === e.lair);
        this.showBanner(
          `RAID! ${e.size} ${lair?.type ?? 'monsters'} march on the town`,
          '#8a1c2bdd',
        );
      } else if (e.kind === 'buildingDestroyed') {
        this.showBanner(`${e.type.replace('_', ' ')} destroyed!`, '#8a1c2bdd');
      } else if (e.kind === 'lairDestroyed') {
        this.showBanner(`${e.type} lair destroyed!`, '#2f6b3aee');
      }
    }
  }

  private showBanner(text: string, color: string): void {
    this.tweens.killTweensOf(this.banner);
    this.banner.setText(text).setBackgroundColor(color).setAlpha(1);
    this.tweens.add({ targets: this.banner, alpha: 0, delay: 3000, duration: 500 });
  }

  // End screen: the sim reports 'won' or 'lost' and has stopped; show the summary and a way
  // to start over.
  private showEnd(status: 'won' | 'lost'): void {
    this.closeMenu();
    const cx = GAME_WIDTH / 2;
    const dim = this.add.rectangle(cx, 360, GAME_WIDTH, 720, 0x000000, 0.6).setInteractive();
    const title = this.add
      .text(cx, 200, status === 'won' ? 'VICTORY' : 'TOWN LOST', {
        ...TEXT,
        fontSize: '84px',
        color: status === 'won' ? '#f2c14e' : '#d9534f',
      })
      .setOrigin(0.5);
    const time = formatClock((this.registry.get('timeMs') as number) ?? 0);
    const summary = this.add
      .text(cx, 300, `Run time ${time}   Gold ${this.registry.get('gold') ?? 0}`, TEXT)
      .setOrigin(0.5);
    const st = (this.scene.get('Map') as MapScene).snapshot.stats;
    const stats: [string, number][] = [
      ['Monsters slain', st.monstersKilled],
      ['Lairs destroyed', st.lairsDestroyed],
      ['Heroes arrived', st.heroesArrived],
      ['Knockouts', st.knockouts],
      ['Buildings lost', st.buildingsLost],
      ['Tax collected', Math.floor(st.taxCollected)],
    ];
    const statObjects = stats.map(([label, value], i) =>
      this.add
        .text(cx - 360 + (i % 3) * 360, 400 + Math.floor(i / 3) * 44, `${label} ${value}`, {
          ...TEXT,
          fontSize: '26px',
          color: COLORS.textMuted,
        })
        .setOrigin(0, 0.5),
    );
    const again = makeButton(this, cx, 560, 300, 100, 'Play again', () => this.playAgain());
    this.endObjects = [dim, title, summary, ...statObjects, again.container];
  }

  // A new run: stop the HUD and restart the map, which launches a fresh HUD.
  private playAgain(): void {
    this.scene.stop();
    this.scene.get('Map').scene.restart();
  }

  private refreshSpeed(): void {
    const cur = this.registry.get('speed') as number;
    this.speedButtons.forEach((b, i) => b.setActive(SPEEDS[i] === cur));
  }

  private onMapTap(map: MapScene, tap: MapTap): void {
    if (tap.hero) {
      this.closeMenu();
      this.panel.show(tap.hero);
      return;
    }
    this.panel.hide();
    if (tap.plot !== null) {
      const plot = tap.plot;
      this.openMenu(
        'Build here',
        GRAYBOX.buildings.map((def) => ({
          label: `${def.id.replace('_', ' ')}\n${def.cost} gold`,
          cost: def.cost,
          pick: () => this.run(map.tryBuild(def.id, plot)),
        })),
      );
    } else if (tap.target) {
      const { pos, label } = tap.target;
      this.openMenu(
        `Bounty on ${label}`,
        BOUNTY_AMOUNTS.map((gold) => ({
          label: `${gold}\ngold`,
          cost: gold,
          pick: () => this.run(map.tryBounty(pos, gold)),
        })),
      );
    } else this.closeMenu();
  }

  private openMenu(title: string, options: MenuOption[]): void {
    this.closeMenu();
    const n = options.length;
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
    const heading = this.add
      .text(cx, cy - h / 2 + 24, title, { ...TEXT, fontSize: '24px', color: COLORS.textMuted })
      .setOrigin(0.5);
    this.menu.push(panel, heading);
    options.forEach((opt, i) => {
      const x = cx - w / 2 + gap + bw / 2 + i * (bw + gap);
      const button = makeButton(this, x, cy + 20, bw, bh, opt.label, opt.pick);
      this.menu.push(button.container);
      this.menuButtons.push({ button, cost: opt.cost });
    });
  }

  private closeMenu(): void {
    this.menu.forEach((o) => o.destroy());
    this.menu = [];
    this.menuButtons = [];
    this.menuRect = null;
  }

  // The sim already decided; close on success, show its reason otherwise.
  private run(res: CommandResult): void {
    if (res.ok) this.closeMenu();
    else this.showToast(res.reason);
  }

  private showToast(text: string): void {
    this.toast.setText(text).setAlpha(1);
    this.tweens.add({ targets: this.toast, alpha: 0, delay: 1200, duration: 400 });
  }
}
