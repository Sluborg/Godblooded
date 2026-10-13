import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, MIN_TOUCH } from '../config';
import { GRAYBOX, UPGRADES } from '../data/graybox';
import { DEFAULT_TUNING, type BuildingState, type CommandResult } from '../sim/api';
import { buildingEffect, buildingName, nextTierEffect } from '../ui/buildingInfo';
import { formatClock } from '../ui/endReport';
import { modeLabel, partyColor } from '../ui/partyLook';
import { buildRoster, paginate } from '../ui/roster';
import { makePanel } from '../ui/panel';
import { pickToast } from '../ui/levelUpLook';
import { heroLabel } from '../ui/partyLook';
import { makeButton, type Button } from '../ui/button';
import { addIcon } from '../ui/icons';
import { PartyPanel } from '../ui/partyPanel';
import type { SimEvent, Vec2 } from '../sim/api';
import { describeEvent, EventFeed, type FeedWorld } from '../ui/eventFeed';
import type { MapScene, MapTap } from './MapScene';

const ROSTER_PER_PAGE = 5;
const ROSTER_W = 470;
const SPEEDS = [1, 2, 4];
const BOUNTY_AMOUNTS = [25, 50, 100, 200];

interface MenuOption {
  label: string;
  cost: number;
  pick: () => void;
}
const TEXT = { fontFamily: 'Georgia, serif', fontSize: '30px', color: COLORS.text };

// Screen-space overlay on top of MapScene: gold, run clock, speed buttons, build menu.
// It reads the numbers MapScene publishes in the registry and sends build commands back
// through MapScene.tryBuild; it holds no rules.
export class HudScene extends Phaser.Scene {
  private goldText!: Phaser.GameObjects.Text;
  private goldIcon: Phaser.GameObjects.Image | null = null;
  private clockText!: Phaser.GameObjects.Text;
  private toast!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  private panel!: PartyPanel;
  private ended = false;
  private speedButtons: Button[] = [];
  private watchBtn: Button | null = null;
  private rosterBtn: Button | null = null;
  // Hero roster: a list on the right (5 rows a page), rebuilt when what it shows changes.
  private rosterOpen = false;
  private rosterPage = 0;
  private rosterKey = '';
  private rosterObjects: Phaser.GameObjects.GameObject[] = [];
  private rosterRect: Phaser.Geom.Rectangle | null = null;
  private rosterNextAt = 0;
  private menu: Phaser.GameObjects.GameObject[] = [];
  private menuButtons: { button: Button; cost: number }[] = [];
  private menuRect: Phaser.Geom.Rectangle | null = null;
  // Event feed: toasts on the left, positions of lairs and buildings remembered so a destroyed
  // one can still be jumped to.
  private feed = new EventFeed();
  private feedKey = '';
  private feedObjects: Phaser.GameObjects.GameObject[] = [];
  private feedRects: Phaser.Geom.Rectangle[] = [];
  private places = new Map<number, Vec2>();

  constructor() {
    super('Hud');
  }

  create(): void {
    // Scene instances are reused on restart: drop state that pointed at the old display list.
    this.panel = new PartyPanel(this);
    this.ended = false;
    this.speedButtons = [];
    this.menu = [];
    this.menuButtons = [];
    this.menuRect = null;
    this.rosterOpen = false;
    this.rosterPage = 0;
    this.rosterKey = '';
    this.rosterObjects = [];
    this.rosterRect = null;
    this.rosterNextAt = 0;
    this.feed = new EventFeed();
    this.feedKey = '';
    this.feedObjects = [];
    this.feedRects = [];
    this.places = new Map();
    const map = this.scene.get('Map') as MapScene;
    this.add.rectangle(GAME_WIDTH / 2, 36, GAME_WIDTH, 72, 0x000000, 0.45);
    // The gold amount with the kit's gold icon in front of it (the word "Gold" when there is none).
    this.goldIcon = addIcon(this, 'ui_icon_gold', 36, 36, 44);
    this.goldText = this.add
      .text(this.goldIcon ? 66 : 20, 36, '', { ...TEXT, color: '#f2c14e' })
      .setOrigin(0, 0.5);
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
        { icon: `ui_icon_speed${s}`, iconOnly: true },
      );
      this.speedButtons.push(b);
    });
    makeButton(this, 890, 40, 110, MIN_TOUCH, 'Menu', () => this.openPause(), {
      icon: 'ui_icon_menu',
    });
    // In the gap between the gold and the run clock (the clock sits at x 640).
    this.rosterBtn = makeButton(this, 430, 40, 120, MIN_TOUCH, 'Heroes', () => {
      this.rosterOpen = !this.rosterOpen;
      this.rosterKey = '';
      this.rosterNextAt = 0;
      if (this.rosterOpen) this.closeMenu();
      else this.clearRoster();
    });
    this.watchBtn = makeButton(this, 770, 40, 110, MIN_TOUCH, 'Watch', () => {
      const m = map.registry.get('camMode');
      map.setWatch(m !== 'watch');
    });
    this.refreshSpeed();
    this.toast = this.add
      .text(GAME_WIDTH / 2, 640, '', {
        ...TEXT,
        backgroundColor: '#000000aa',
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(50);
    this.banner = this.add
      .text(GAME_WIDTH / 2, 112, '', {
        ...TEXT,
        fontSize: '34px',
        backgroundColor: '#8a1c2bdd',
        padding: { x: 20, y: 8 },
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(50);

    const onTap = (tap: MapTap) => this.onMapTap(map, tap);
    const onEvents = (events: readonly SimEvent[]) => this.onSimEvents(map, events);
    map.events.on('mapTapped', onTap);
    map.events.on('simEvents', onEvents);
    this.events.once('shutdown', () => {
      map.events.off('mapTapped', onTap);
      map.events.off('simEvents', onEvents);
    });
  }

  update(_time: number, deltaMs: number): void {
    this.watchBtn?.setActive(this.registry.get('camMode') === 'watch');
    this.rosterBtn?.setActive(this.rosterOpen);
    this.drawRoster(this.scene.get('Map') as MapScene);
    const snap = (this.scene.get('Map') as MapScene).snapshot;
    for (const l of snap.lairs) this.places.set(l.id, l.pos);
    for (const b of snap.buildings) this.places.set(b.id, b.pos);
    // Toasts wait while the pause menu is up and are not redrawn over the end screen.
    if (!this.scene.isPaused('Map')) this.feed.update(deltaMs);
    this.drawFeed(this.scene.get('Map') as MapScene);
    this.goldText.setText(`${this.goldIcon ? '' : 'Gold '}${this.registry.get('gold') ?? 0}`);
    this.clockText.setText(formatClock((this.registry.get('timeMs') as number) ?? 0));
    const status = this.registry.get('status') as string | undefined;
    if ((status === 'won' || status === 'lost') && !this.ended) this.showEnd();
    this.panel.update((this.scene.get('Map') as MapScene).snapshot);
    const gold = (this.registry.get('gold') as number) ?? 0;
    for (const { button, cost } of this.menuButtons) button.setEnabled(gold >= cost);
  }

  // True when a screen point is over HUD controls, so the map ignores the press.
  blocks(x: number, y: number): boolean {
    if (y < 72 || this.ended) return true;
    if (this.panel.isOpen && this.panel.rect.contains(x, y)) return true;
    if (this.rosterRect?.contains(x, y)) return true;
    if (this.feedRects.some((r) => r.contains(x, y))) return true;
    return this.menuRect?.contains(x, y) ?? false;
  }

  // Warnings the player must notice: raids and lost buildings get a banner; everything worth a
  // line goes to the event feed.
  private onSimEvents(map: MapScene, events: readonly SimEvent[]): void {
    const snap = map.snapshot;
    const world: FeedWorld = {
      unit: (id) => snap.units.find((u) => u.id === id),
      structure: (id) => this.places.get(id),
      leader: (partyId) => {
        const first = snap.parties.find((p) => p.id === partyId)?.members[0];
        return snap.units.find((u) => u.id === first);
      },
      townHall: snap.buildings.find((b) => b.type === 'townhall')?.pos ?? { x: 0, y: 0 },
    };
    for (const e of events) {
      if (e.kind === 'raid') {
        const lair = snap.lairs.find((l) => l.id === e.lair);
        this.showBanner(
          `RAID! ${e.size} ${lair?.type ?? 'monsters'} march on the town`,
          '#8a1c2bdd',
        );
      } else if (e.kind === 'upgradePicked') {
        const party = map.snapshot.parties.find((p) => p.id === e.party);
        const lead = map.snapshot.units.find((u) => u.id === party?.members[0]);
        const name =
          (GRAYBOX.upgrades ?? UPGRADES).find((u) => u.id === e.upgrade)?.name ?? e.upgrade;
        this.showToast(pickToast(lead ? heroLabel(lead) : `Party ${e.party}`, name));
      } else if (e.kind === 'buildingDestroyed') {
        this.showBanner(`${e.type.replace('_', ' ')} destroyed!`, '#8a1c2bdd');
      }
      const spec = describeEvent(e, world);
      if (spec) this.feed.push(spec);
    }
  }

  // Redraws the toast stack when it changed: pills on the left under the top bar, each 80 tall
  // (a touch target); tapping one dismisses it and sends the camera there.
  private drawFeed(map: MapScene): void {
    const key = this.ended ? '' : this.feed.toasts.map((t) => t.id).join(',');
    if (key === this.feedKey) return;
    this.feedKey = key;
    this.feedObjects.forEach((o) => o.destroy());
    this.feedObjects = [];
    this.feedRects = [];
    const W = 430;
    const H = MIN_TOUCH;
    (this.ended ? [] : this.feed.toasts).forEach((t, i) => {
      const x = 16;
      const y = 84 + i * (H + 8);
      const bg = this.add
        .rectangle(
          x + W / 2,
          y + H / 2,
          W,
          H,
          Phaser.Display.Color.HexStringToColor(t.color.slice(0, 7)).color,
          0.9,
        )
        .setStrokeStyle(2, COLORS.gold, 0.7)
        .setInteractive({ useHandCursor: true });
      const label = this.add
        .text(x + 14, y + H / 2, t.text, { ...TEXT, fontSize: '22px', wordWrap: { width: W - 28 } })
        .setOrigin(0, 0.5);
      bg.on('pointerup', (p: Phaser.Input.Pointer) => {
        if (p.getDistance() >= 10) return;
        if (t.pos) map.jumpTo(t.pos);
        this.feed.dismiss(t.id);
      });
      this.feedObjects.push(bg, label);
      this.feedRects.push(new Phaser.Geom.Rectangle(x, y, W, H));
    });
  }

  private showBanner(text: string, color: string): void {
    this.tweens.killTweensOf(this.banner);
    this.banner.setText(text).setBackgroundColor(color).setAlpha(1);
    this.tweens.add({ targets: this.banner, alpha: 0, delay: 3000, duration: 500 });
  }

  // The sim reports 'won' or 'lost' and has stopped: the End scene shows the report.
  private showEnd(): void {
    this.closeMenu();
    this.closeRoster();
    this.ended = true;
    this.registry.set('modal', true);
    this.scene.launch('End');
  }

  // Shut the roster (a menu is about to take its place).
  private closeRoster(): void {
    this.rosterOpen = false;
    this.rosterKey = '';
    this.clearRoster();
  }

  private clearRoster(): void {
    this.rosterObjects.forEach((o) => o.destroy());
    this.rosterObjects = [];
    this.rosterRect = null;
  }

  // The hero list: party colour stripe, label and tier, state, hp bar and gold. Tapping a row
  // follows that hero and opens its party panel.
  private drawRoster(map: MapScene): void {
    if (!this.rosterOpen || this.ended) return;
    if (this.time.now < this.rosterNextAt) return;
    const all = buildRoster(map.snapshot);
    const pg = paginate(all, this.rosterPage, ROSTER_PER_PAGE);
    this.rosterPage = pg.page;
    const selected = (this.registry.get('selectedUnit') as number) ?? 0;
    const key = `${pg.page}/${pg.pages}|${selected}|${pg.rows.map((r) => `${r.unit}:${r.label}:${r.party}:${r.partyLevel}:${r.hp}:${r.maxHp}:${r.mode}:${r.gold}:${r.tier}:${r.ko}`).join(',')}`;
    if (key === this.rosterKey) return;
    this.rosterNextAt = this.time.now + 300;
    this.rosterKey = key;
    this.clearRoster();
    // Left of the party panel (which owns the right edge), so both can be open.
    const X = GAME_WIDTH - 340 - 12 - ROSTER_W;
    const Y = 84;
    const rowH = MIN_TOUCH;
    const pitch = rowH + 4; // a gap so neighbouring outlines never overdraw
    // As tall as its rows (and the pager when there is one), so it never blocks empty map.
    const H = 40 + Math.max(pg.rows.length, 1.5) * pitch + (pg.pages > 1 ? 90 : 14);
    this.rosterRect = new Phaser.Geom.Rectangle(X, Y, ROSTER_W, H);
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.rosterObjects.push(o);
      return o;
    };
    add(makePanel(this, X + ROSTER_W / 2, Y + H / 2, ROSTER_W, H, 0.95));
    add(
      this.add
        .text(X + 18, Y + 22, `Heroes (${all.length})`, {
          ...TEXT,
          fontSize: '24px',
          color: '#f2c14e',
        })
        .setOrigin(0, 0.5),
    );
    if (pg.rows.length === 0)
      add(
        this.add
          .text(X + 18, Y + 80, 'No heroes yet.\nBuild a temple.', {
            ...TEXT,
            fontSize: '22px',
            color: COLORS.textMuted,
          })
          .setOrigin(0, 0),
      );
    pg.rows.forEach((r, i) => {
      const y = Y + 40 + i * pitch;
      const bg = add(
        this.add
          .rectangle(
            X + ROSTER_W / 2,
            y + rowH / 2,
            ROSTER_W - 20,
            rowH,
            r.unit === selected ? 0x4a3322 : 0x241a12,
            0.95,
          )
          .setStrokeStyle(2, COLORS.gold, r.unit === selected ? 0.9 : 0.3)
          .setInteractive({ useHandCursor: true }),
      );
      bg.on('pointerup', (p: Phaser.Input.Pointer) => {
        if (p.getDistance() >= 10) return;
        map.followUnit(r.unit);
        this.panel.show(r.unit);
        this.rosterKey = '';
        this.rosterNextAt = 0;
      });
      if (r.party > 0)
        add(this.add.rectangle(X + 16, y + rowH / 2, 8, rowH - 14, partyColor(r.party), 1));
      const sub = r.party > 0 ? `  ·  party ${r.party} lv ${r.partyLevel}` : '';
      add(
        this.add
          .text(X + 28, y + 16, `${r.label}  T${r.tier}${sub}`, {
            ...TEXT,
            fontSize: '20px',
            color: r.ko ? COLORS.textMuted : COLORS.text,
          })
          .setOrigin(0, 0.5),
      );
      add(
        this.add
          .text(X + ROSTER_W - 22, y + 16, modeLabel(r.mode), {
            ...TEXT,
            fontSize: '16px',
            color: COLORS.textMuted,
          })
          .setOrigin(1, 0.5),
      );
      const bw = 190;
      const f = r.maxHp > 0 ? Math.max(0, Math.min(1, r.hp / r.maxHp)) : 0;
      add(this.add.rectangle(X + 28 + bw / 2, y + 50, bw, 12, 0x000000, 0.7));
      add(
        this.add.rectangle(
          X + 28 + (bw * f) / 2,
          y + 50,
          Math.max(1, bw * f),
          12,
          r.ko ? 0x777777 : f < 0.3 ? 0xd9534f : 0x6fcf6f,
        ),
      );
      add(
        this.add
          .text(X + ROSTER_W - 22, y + 50, `${r.hp}/${r.maxHp}   ${r.gold}g`, {
            ...TEXT,
            fontSize: '18px',
            color: '#f2c14e',
          })
          .setOrigin(1, 0.5),
      );
    });
    // Paging.
    const py = Y + H - 44;
    if (pg.pages > 1) {
      const prev = makeButton(this, X + 70, py, 100, MIN_TOUCH, 'Prev', () => this.pageRoster(-1));
      const next = makeButton(this, X + ROSTER_W - 70, py, 100, MIN_TOUCH, 'Next', () =>
        this.pageRoster(1),
      );
      prev.setEnabled(pg.page > 0);
      next.setEnabled(pg.page < pg.pages - 1);
      add(prev.container);
      add(next.container);
      add(
        this.add
          .text(X + ROSTER_W / 2, py, `${pg.page + 1} / ${pg.pages}`, {
            ...TEXT,
            fontSize: '20px',
            color: COLORS.textMuted,
          })
          .setOrigin(0.5),
      );
    }
  }

  private pageRoster(delta: number): void {
    this.rosterPage += delta;
    this.rosterKey = '';
    this.rosterNextAt = 0;
  }

  // Freeze the map and open the pause menu over it.
  private openPause(): void {
    if (this.registry.get('modal') === true || this.scene.isActive('Pause')) return;
    this.scene.pause('Map');
    this.scene.launch('Pause');
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
    if (tap.building != null) {
      const b = map.snapshot.buildings.find((x) => x.id === tap.building);
      this.panel.hide();
      if (b) this.openBuildingPanel(map, b);
      return;
    }
    this.panel.hide();
    // A tap on bare ground while a menu is open dismisses it (a second tap places a bounty).
    if (this.menu.length > 0 && tap.plot === null && tap.target?.label === 'this spot') {
      this.closeMenu();
      return;
    }
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
    this.closeRoster();
    // Every menu ends in a Close button: the only other way out used to be a tap on the map,
    // which opened a bounty menu on the bare ground instead.
    options = [...options, { label: 'Close', cost: 0, pick: () => this.closeMenu() }];
    const n = options.length;
    const gap0 = 14;
    const bw = Math.min(230, Math.floor((GAME_WIDTH - 40 - (n + 1) * gap0) / n));
    const bh = 100;
    const gap = 14;
    const w = n * bw + (n + 1) * gap;
    const h = bh + 2 * gap + 40;
    const cx = GAME_WIDTH / 2;
    const cy = 720 - h / 2 - 12;
    this.menuRect = new Phaser.Geom.Rectangle(cx - w / 2, cy - h / 2, w, h);
    const panel = makePanel(this, cx, cy, w, h, 0.92);
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

  // Info panel for a tapped building: name and tier, hp, what it does, what the next tier adds, and
  // an Upgrade button with its cost (the sim refuses when it cannot, and says why).
  private openBuildingPanel(map: MapScene, b: BuildingState): void {
    this.closeMenu();
    this.closeRoster();
    const cx = GAME_WIDTH / 2;
    const w = 860;
    const h = 330;
    const cy = 720 - h / 2 - 12;
    this.menuRect = new Phaser.Geom.Rectangle(cx - w / 2, cy - h / 2, w, h);
    const maxTier = DEFAULT_TUNING.building.maxTier;
    const line = (y: number, text: string, size: number, color: string) =>
      this.add
        .text(cx, cy - h / 2 + y, text, {
          ...TEXT,
          fontSize: `${size}px`,
          color,
          align: 'center',
          wordWrap: { width: w - 60 },
        })
        .setOrigin(0.5);
    this.menu.push(
      makePanel(this, cx, cy, w, h, 0.95),
      line(34, `${buildingName(b.type)}  ·  Tier ${b.tier}/${maxTier}`, 32, '#f2c14e'),
      line(76, `HP ${Math.ceil(b.hp)} / ${b.maxHp}`, 22, COLORS.text),
      line(112, buildingEffect(b.type, b.tier), 22, COLORS.text),
      line(150, nextTierEffect(b.type, b.tier), 20, COLORS.textMuted),
    );
    const y = cy + h / 2 - 60;
    if (b.upgradeCost !== null) {
      const cost = b.upgradeCost;
      const up = makeButton(
        this,
        cx - 150,
        y,
        280,
        90,
        `Upgrade\n${cost} gold`,
        () => {
          const res = map.tryUpgrade(b.id);
          if (res.ok) {
            this.closeMenu();
            this.showToast(`${buildingName(b.type)} upgraded to tier ${b.tier + 1}`);
          } else this.showToast(res.reason);
        },
        { icon: 'ui_icon_upgrade' },
      );
      this.menu.push(up.container);
      this.menuButtons.push({ button: up, cost });
    }
    const close = makeButton(
      this,
      b.upgradeCost !== null ? cx + 150 : cx,
      y,
      240,
      90,
      'Close',
      () => this.closeMenu(),
    );
    this.menu.push(close.container);
    this.menuButtons.push({ button: close, cost: 0 });
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
