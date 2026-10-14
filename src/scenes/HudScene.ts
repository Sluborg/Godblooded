import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, MIN_TOUCH, TAP_SLOP } from '../config';
import { GRAYBOX, UPGRADES } from '../data/graybox';
import { DEFAULT_TUNING, type BuildingState, type CommandResult } from '../sim/api';
import { buildingEffect, buildingName, nextTierEffect } from '../ui/buildingInfo';
import { HintDirector } from '../ui/hintDirector';
import { RAISE_STEPS, flagLines, refundFor } from '../ui/flagCard';
import { buildInfo, buildTap, type BuildInfo } from '../ui/buildMenu';
import { formatClock } from '../ui/endReport';
import { modeLabel, partyColor } from '../ui/partyLook';
import { buildRoster, paginate } from '../ui/roster';
import { makePanel } from '../ui/panel';
import { autoPickToast, pickToast } from '../ui/levelUpLook';
import { heroLabel } from '../ui/partyLook';
import { makeButton, type Button } from '../ui/button';
import { addIcon } from '../ui/icons';
import { PartyPanel } from '../ui/partyPanel';
import type { SimEvent, Vec2 } from '../sim/api';
import type { OmenView } from '../sim/api';
import { describeEvent, EventFeed, type FeedWorld } from '../ui/eventFeed';
import type { MapScene, MapTap } from './MapScene';
import { collectorInfo } from '../ui/taxLook';
import { RaidArrowView } from '../ui/raidArrowView';
import { fitDesignCamera } from '../ui/designCamera';
import { gatherersAt, poolLine } from '../ui/nodeLook';
import { graveLabel, godPantheonOf, recallable, templeAmbrosiaCost } from '../ui/ambrosiaCards';
import { AMBROSIA_STYLE, drawJar } from '../ui/ambrosiaLook';
import { omenLabel, omenSky, skyAlpha, type OmenSky } from '../ui/omenLook';

const ROSTER_PER_PAGE = 5;
const ROSTER_W = 470;
const SPEEDS = [1, 2, 4];
const BOUNTY_AMOUNTS = [25, 50, 100, 200];

interface MenuOption {
  label: string;
  cost: number;
  pick: () => void;
  // Highlighted (the build menu's selected item).
  active?: boolean;
}
const TEXT = { fontFamily: 'Georgia, serif', fontSize: '30px', color: COLORS.text };

// Screen-space overlay on top of MapScene: gold, run clock, speed buttons, build menu.
// It reads the numbers MapScene publishes in the registry and sends build commands back
// through MapScene.tryBuild; it holds no rules.
export class HudScene extends Phaser.Scene {
  private goldText!: Phaser.GameObjects.Text;
  private ambIcon!: Phaser.GameObjects.Graphics;
  private ambText!: Phaser.GameObjects.Text;
  private raidArrows!: RaidArrowView;
  // Omens: a tint over the map, a countdown under the clock (with a dot in the omen's colour).
  private sky!: Phaser.GameObjects.Rectangle;
  private omenText!: Phaser.GameObjects.Text;
  private omenDot!: Phaser.GameObjects.Arc;
  private omenSkyNow: OmenSky | null = null;
  private omenLeadMs = 0;
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
  private menuButtons: { button: Button; cost: number; ambrosia?: number; blocked?: boolean }[] =
    [];
  private menuRect: Phaser.Geom.Rectangle | null = null;
  private hints: HintDirector | null = null;
  private buildMenuOpen = false;
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
    fitDesignCamera(this);
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
    // Ambrosia (M3, once the map has celestial nodes): a jar and the amount, beside the gold.
    this.ambIcon = this.add.graphics().setVisible(false);
    drawJar(this.ambIcon, 214, 36, 1.2);
    this.ambText = this.add
      .text(238, 36, '', { ...TEXT, color: AMBROSIA_STYLE.text })
      .setOrigin(0, 0.5)
      .setVisible(false);
    this.clockText = this.add.text(GAME_WIDTH / 2, 36, '0:00', TEXT).setOrigin(0.5);
    this.sky = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xffffff, 0)
      .setDepth(-1);
    this.omenText = this.add
      .text(GAME_WIDTH / 2 + 14, 62, '', { ...TEXT, fontSize: '16px', color: '#e8dcff' })
      .setOrigin(0.5)
      .setVisible(false);
    this.omenDot = this.add.circle(0, 62, 6, 0xffffff).setVisible(false);
    this.omenSkyNow = null;
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
    makeButton(this, 900, 40, 130, MIN_TOUCH, 'Menu', () => this.openPause(), {
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

    this.raidArrows?.destroy();
    this.raidArrows = new RaidArrowView(this, (pos) => map.jumpTo(pos));
    this.hints?.destroy();
    this.hints = new HintDirector(
      this,
      () => map.cameras.main,
      (id) => this.hintUiRect(id),
    );
    const onTap = (tap: MapTap) => this.onMapTap(map, tap);
    const onEvents = (events: readonly SimEvent[]) => this.onSimEvents(map, events);
    map.events.on('mapTapped', onTap);
    map.events.on('simEvents', onEvents);
    this.events.once('shutdown', () => {
      map.events.off('mapTapped', onTap);
      map.events.off('simEvents', onEvents);
      this.hints?.destroy();
    });
  }

  update(_time: number, deltaMs: number): void {
    const notice = this.registry.get('notice') as string | undefined;
    if (notice) {
      this.registry.set('notice', undefined);
      this.showToast(notice);
    }
    this.watchBtn?.setActive(this.registry.get('camMode') === 'watch');
    this.rosterBtn?.setActive(this.rosterOpen);
    this.drawRoster(this.scene.get('Map') as MapScene);
    const snap = (this.scene.get('Map') as MapScene).snapshot;
    this.raidArrows?.update(snap, (this.scene.get('Map') as MapScene).cameras.main);
    for (const l of snap.lairs) this.places.set(l.id, l.pos);
    for (const b of snap.buildings) this.places.set(b.id, b.pos);
    // Toasts wait while the pause menu is up and are not redrawn over the end screen.
    if (!this.scene.isPaused('Map')) this.feed.update(deltaMs);
    this.drawFeed(this.scene.get('Map') as MapScene);
    this.goldText.setText(`${this.goldIcon ? '' : 'Gold '}${this.registry.get('gold') ?? 0}`);
    const ambSnap = (this.scene.get('Map') as MapScene).snapshot;
    const ambOn = ambSnap.nodes.length > 0;
    this.ambIcon.setVisible(ambOn);
    this.ambText.setVisible(ambOn).setText(`${Math.floor(ambSnap.ambrosia)}`);
    this.clockText.setText(formatClock((this.registry.get('timeMs') as number) ?? 0));
    this.drawOmen(snap);
    const status = this.registry.get('status') as string | undefined;
    if ((status === 'won' || status === 'lost') && !this.ended) this.showEnd();
    this.panel.update((this.scene.get('Map') as MapScene).snapshot);
    const gold = (this.registry.get('gold') as number) ?? 0;
    const map = this.scene.get('Map') as MapScene;
    const stock = map.snapshot.ambrosia;
    for (const { button, cost, ambrosia, blocked } of this.menuButtons)
      button.setEnabled(!blocked && gold >= cost && (ambrosia === undefined || stock >= ambrosia));
    this.hints?.update(map.snapshot, gold, map.hintTuning);
  }

  // The leader's name for a party ("Thor-born"), else "A party" (players never see party numbers).
  private partyWho(map: MapScene, partyId: number): string {
    const party = map.snapshot.parties.find((p) => p.id === partyId);
    const lead = map.snapshot.units.find((u) => u.id === party?.members[0]);
    return lead ? heroLabel(lead) : 'A party';
  }

  private drawOmen(snap: Readonly<{ omen: Readonly<OmenView> | null }>): void {
    const o = snap.omen;
    if (o === null) {
      this.omenSkyNow = null;
      this.omenLeadMs = 0;
      this.sky.setFillStyle(0xffffff, 0);
      this.omenText.setVisible(false);
      this.omenDot.setVisible(false);
      return;
    }
    if (o.phase === 'announced') this.omenLeadMs = Math.max(this.omenLeadMs, o.msLeft);
    const map = this.scene.get('Map') as MapScene;
    this.omenSkyNow ??= omenSky(map.omenDef(o.id), o.id);
    this.sky.setFillStyle(this.omenSkyNow.color, skyAlpha(this.omenSkyNow, o, this.omenLeadMs));
    this.omenText.setText(omenLabel(o)).setVisible(true);
    this.omenDot
      .setFillStyle(this.omenSkyNow.color)
      .setPosition(this.omenText.x - this.omenText.width / 2 - 12, 62)
      .setVisible(true);
  }

  // The screen rectangle of a HUD hint target: a button of the build menu (`build-<type>`).
  private hintUiRect(id: string): Phaser.Geom.Rectangle | null {
    if (!this.buildMenuOpen || !id.startsWith('build-')) return null;
    const i = GRAYBOX.buildings.findIndex((d) => d.id === id.slice(6));
    return this.menuButtons[i]?.button.rect ?? null;
  }

  // Called by the Settings screen after a change to the hint settings.
  refreshHints(): void {
    this.hints?.refreshSettings();
  }

  // True when a screen point is over HUD controls, so the map ignores the press.
  blocks(x: number, y: number): boolean {
    if (y < 72 || this.ended) return true;
    if (this.panel.isOpen && this.panel.rect.contains(x, y)) return true;
    if (this.rosterRect?.contains(x, y)) return true;
    if (this.raidArrows?.blocks(x, y)) return true;
    if (this.feedRects.some((r) => r.contains(x, y))) return true;
    return this.menuRect?.contains(x, y) ?? false;
  }

  // Warnings the player must notice: raids and lost buildings get a banner; everything worth a
  // line goes to the event feed.
  private onSimEvents(map: MapScene, events: readonly SimEvent[]): void {
    const snap = map.snapshot;
    this.hints?.events(events);
    const world: FeedWorld = {
      unit: (id) => snap.units.find((u) => u.id === id),
      structure: (id) => this.places.get(id),
      leader: (partyId) => {
        const first = snap.parties.find((p) => p.id === partyId)?.members[0];
        return snap.units.find((u) => u.id === first);
      },
      townHall: snap.buildings.find((b) => b.type === 'townhall')?.pos ?? { x: 0, y: 0 },
    };
    const levels = new Map<number, number>();
    for (const e of events) {
      if (e.kind === 'levelUp') levels.set(e.party, e.level);
      if (e.kind === 'jarHome') this.pulseAmbrosia();
      // A lair will sprout on a node: an edge arrow to it for the warning.
      if (e.kind === 'lairSprouting') {
        const node = snap.nodes.find((n) => n.id === e.node);
        if (node)
          this.raidArrows.add({
            raid: -1000 - e.node,
            lair: 0,
            at: node.pos,
            untilMs: snap.timeMs + e.inMs,
          });
      }
      if (e.kind === 'raidWarning')
        this.raidArrows.add({ raid: e.raid, lair: e.lair, untilMs: snap.timeMs + e.inMs });
      if (e.kind === 'omen') {
        const o = snap.omen;
        this.showBanner(o ? `${o.name}: ${o.text}` : 'An omen is coming', '#3a2a6add');
      } else if (e.kind === 'omenStart') {
        const o = snap.omen;
        this.showBanner(o ? `${o.name} is upon us` : 'The omen begins', '#3a2a6add');
      } else if (e.kind === 'starFallen') {
        this.showBanner('A star falls near the town! Be the first to reach it', '#3a2a6add');
      } else if (e.kind === 'starFound') {
        this.showToast(`${this.partyWho(map, e.party)} found the star (+${e.xp} xp)`);
      } else if (e.kind === 'bonusCard') {
        this.showToast(`${this.partyWho(map, e.party)} wins the contest: a bonus card`);
      }
      if (e.kind === 'raid') {
        const lair = snap.lairs.find((l) => l.id === e.lair);
        this.showBanner(
          `RAID! ${e.size} ${lair?.type ?? 'monsters'} march on the town`,
          '#8a1c2bdd',
        );
      } else if (e.kind === 'nodeDefiled') {
        this.showBanner('A NODE IS DEFILED! Kill the defilers', '#8a1c2bdd');
      } else if (e.kind === 'lairSprouting') {
        this.showBanner('A LAIR IS SPROUTING ON A NODE', '#8a1c2bdd');
      } else if (e.kind === 'bossEmerged') {
        this.showBanner('THE BOSS EMERGES!', '#8a1c2bdd');
      } else if (e.kind === 'enraged') {
        this.showBanner('THE BOSS IS ENRAGED!', '#8a1c2bdd');
      } else if (e.kind === 'upgradePicked') {
        const party = map.snapshot.parties.find((p) => p.id === e.party);
        const lead = map.snapshot.units.find((u) => u.id === party?.members[0]);
        const name =
          (GRAYBOX.upgrades ?? UPGRADES).find((u) => u.id === e.upgrade)?.name ?? e.upgrade;
        const who = lead ? heroLabel(lead) : `Party ${e.party}`;
        // A party that chose itself says which level it reached; a manual pick keeps its short toast.
        this.showToast(
          e.auto && party
            ? autoPickToast(who, levels.get(e.party) ?? party.level, name)
            : pickToast(who, name),
        );
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
        if (p.getDistance() >= TAP_SLOP) return;
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
        if (p.getDistance() >= TAP_SLOP) return;
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
    if (tap.node != null) {
      this.panel.hide();
      this.openNodeCard(map, tap.node);
      return;
    }
    if (tap.collector != null) {
      this.closeMenu();
      this.panel.hide();
      const c = map.snapshot.units.find((u) => u.id === tap.collector);
      if (c) this.showToast(collectorInfo(c.gold ?? 0), 2600);
      return;
    }
    if (tap.building != null) {
      const b = map.snapshot.buildings.find((x) => x.id === tap.building);
      this.panel.hide();
      if (b) this.openBuildingPanel(map, b);
      return;
    }
    if (tap.flag != null) {
      this.panel.hide();
      this.openFlagCard(map, tap.flag);
      return;
    }
    this.panel.hide();
    // A tap on bare ground while a menu is open dismisses it (a second tap places a bounty).
    if (this.menu.length > 0 && tap.plot === null && tap.target?.label === 'this spot') {
      this.closeMenu();
      return;
    }
    if (tap.plot !== null) {
      const plot = map.snapshot.plots.find((x) => x.id === tap.plot);
      if (plot?.locked) this.showToast(`Needs town hall tier ${plot.unlockTier}`, 1800);
      else if (plot && plot.ruin !== null) this.openRuinMenu(map, plot.ruin);
      else this.openBuildMenu(map, tap.plot, null);
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

  // What a hunt flag is bound to, by its type name (a monster), or undefined.
  private targetLabel(map: MapScene, target: number | undefined): string | undefined {
    if (target === undefined) return undefined;
    // Monsters have no display name in the data: the type id with hyphens and underscores as spaces.
    return map.snapshot.units.find((u) => u.id === target)?.type.replace(/[-_]/g, ' ');
  }

  // The flag card: how much the flag holds, who is heading for it, raise it or take it down.
  private openFlagCard(map: MapScene, id: number): void {
    const flag = map.snapshot.bounties.find((b) => b.id === id);
    if (!flag) return;
    const heading = map.snapshot.units.filter((u) => u.bounty === id).length;
    const rate = DEFAULT_TUNING.bounty.cancelRefund;
    const options: MenuOption[] = [
      ...RAISE_STEPS.map((gold) => ({
        label: `Raise\n+${gold} gold`,
        cost: gold,
        pick: () => {
          const res = map.tryRaiseBounty(id, gold);
          if (res.ok) this.openFlagCard(map, id);
          else this.showToast(res.reason);
        },
      })),
      {
        label: `Cancel\n${refundFor(flag.gold, rate)} back`,
        cost: 0,
        pick: () => this.run(map.tryCancelBounty(id)),
      },
    ];
    this.openMenu('Bounty flag', options, {
      title: `Bounty flag  ·  ${flag.gold} gold`,
      affordable: true,
      lines: flagLines(flag.gold, heading, rate, this.targetLabel(map, flag.target)),
    });
  }

  // The node card (nodes.md section 2): the pool, who works it, send a gatherer or bring them home.
  private openNodeCard(map: MapScene, id: number): void {
    const snap = map.snapshot;
    const node = snap.nodes.find((n) => n.id === id);
    if (!node) return;
    const here = gatherersAt(snap.workers, id);
    const idle = snap.workers.filter((w) => w.phase === 'idle' && w.node === null).length;
    const options: MenuOption[] = [];
    if (node.state === 'freed')
      options.push({
        label: `Send\ngatherer`,
        cost: 0,
        pick: () => {
          const res = map.trySendGatherer(id);
          if (res.ok) this.openNodeCard(map, id);
          else this.showToast(res.reason);
        },
      });
    if (here > 0)
      options.push({
        label: 'Recall',
        cost: 0,
        pick: () => {
          const res = map.tryRecallGatherers(id);
          if (res.ok) this.openNodeCard(map, id);
          else this.showToast(res.reason);
        },
      });
    this.openMenu('Celestial node', options, {
      title: `Celestial node  ·  ${poolLine(node.pool, node.max)}`,
      affordable: true,
      lines:
        node.state === 'defiled'
          ? ['Defiled: kill the defilers, then stand a hero here to cleanse it']
          : [`${here} gatherer${here === 1 ? '' : 's'} here, ${idle} idle at the hall`],
    });
  }

  // Build menu: the first tap on an item shows what it does, the same item tapped again builds it,
  // another item switches the info, a tap outside cancels. Never builds on a single tap.
  // A ruin on a plot: rebuild the building at tier 1 for part of its cost, or clear the plot.
  private openRuinMenu(map: MapScene, ruinId: number): void {
    const ruin = map.snapshot.ruins.find((r) => r.id === ruinId);
    if (!ruin) return;
    const cost = map.ruinCost(ruin.type);
    this.openMenu(`Ruins of the ${buildingName(ruin.type)}`, [
      {
        label: `Rebuild\n${cost} gold`,
        cost,
        pick: () => this.run(map.tryRebuildRuin(ruinId)),
      },
      { label: 'Clear\nthe plot', cost: 0, pick: () => this.run(map.tryClearRuin(ruinId)) },
    ]);
  }

  private openBuildMenu(map: MapScene, plot: number, selected: string | null): void {
    if (selected === null) this.hints?.fire('buildMenu');
    const gold = (this.registry.get('gold') as number | undefined) ?? 0;
    const def = GRAYBOX.buildings.find((d) => d.id === selected);
    const info = def
      ? buildInfo({
          name: buildingName(def.id),
          cost: def.cost,
          gold,
          text: (def as { text?: string }).text,
          effect: buildingEffect(def.id, 1),
          next: nextTierEffect(def.id, 1),
        })
      : null;
    this.openMenu(
      'Build here',
      GRAYBOX.buildings.map((d) => ({
        label: d.id === selected ? 'Tap again\nto build' : `${buildingName(d.id)}\n${d.cost} gold`,
        // Cost 0: an item the town cannot afford stays tappable, it still shows its info.
        cost: 0,
        active: d.id === selected,
        pick: () => {
          const now = (this.registry.get('gold') as number | undefined) ?? 0;
          const r = buildTap(selected, d.id, now, d.cost);
          if (r.action === 'build') this.run(map.tryBuild(d.id, plot));
          else if (r.action === 'need') this.showToast(`Need ${r.need} more gold`);
          else this.openBuildMenu(map, plot, r.selected);
        },
      })),
      info,
    );
    this.buildMenuOpen = true;
  }

  private openMenu(title: string, options: MenuOption[], info: BuildInfo | null = null): void {
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
    // The info strip of the build menu sits above the buttons.
    if (info) this.openInfoStrip(info, cx, cy - h / 2, w);
    const panel = makePanel(this, cx, cy, w, h, 0.92);
    const heading = this.add
      .text(cx, cy - h / 2 + 24, title, { ...TEXT, fontSize: '24px', color: COLORS.textMuted })
      .setOrigin(0.5);
    this.menu.push(panel, heading);
    options.forEach((opt, i) => {
      const x = cx - w / 2 + gap + bw / 2 + i * (bw + gap);
      const button = makeButton(this, x, cy + 20, bw, bh, opt.label, opt.pick);
      this.menu.push(button.container);
      if (opt.active) button.setActive(true);
      this.menuButtons.push({ button, cost: opt.cost });
    });
  }

  private openInfoStrip(info: BuildInfo, cx: number, bottom: number, w: number): void {
    const lineH = 26;
    const h = 54 + info.lines.length * lineH;
    const cy = bottom - 8 - h / 2;
    const top = cy - h / 2;
    this.menuRect = Phaser.Geom.Rectangle.Union(
      this.menuRect ?? new Phaser.Geom.Rectangle(),
      new Phaser.Geom.Rectangle(cx - w / 2, top, w, h),
    );
    this.menu.push(makePanel(this, cx, cy, w, h, 0.92));
    this.menu.push(
      this.add
        .text(cx, top + 26, info.title, {
          ...TEXT,
          fontSize: '26px',
          color: info.affordable ? '#f2c14e' : '#e0645c',
        })
        .setOrigin(0.5),
    );
    info.lines.forEach((l, i) =>
      this.menu.push(
        this.add
          .text(cx, top + 56 + i * lineH, l, {
            ...TEXT,
            fontSize: '20px',
            color: i === 0 ? COLORS.text : COLORS.textMuted,
            align: 'center',
            wordWrap: { width: w - 40 },
          })
          .setOrigin(0.5),
      ),
    );
  }

  // Info panel for a tapped building: name and tier, hp, what it does, what the next tier adds, and
  // an Upgrade button with its cost (the sim refuses when it cannot, and says why).
  private openBuildingPanel(map: MapScene, b: BuildingState): void {
    this.closeMenu();
    this.registry.set('selectedBuilding', b.id);
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
    const snap = map.snapshot;
    const nodesOn = snap.gathererCap > 0 || snap.nodes.length > 0;
    const nodeTuning = map.nodeTuning;
    // `ambrosia`: the Ambrosia price, to grey the button while the stock is short. `blocked`: greyed
    // because something else must come first (the town hall tier).
    const specs: {
      label: string;
      cost: number;
      ambrosia?: number;
      blocked?: boolean;
      icon?: string;
      pick: () => void;
    }[] = [];
    // A temple card has up to five buttons of about 150 px: "Ambrosia" is shortened there.
    const amb = (price: number, five: boolean) => `${price} ${five ? 'Amb.' : 'Ambrosia'}`;
    const pantheon = b.type.replace(/^temple_?/, '');
    const hasMiracle = snap.favour.some((f) => f.pantheon === pantheon);
    const said = (res: CommandResult, ok: string) => {
      if (res.ok) this.showToast(ok);
      else this.showToast(res.reason);
    };
    if (b.upgradeCost !== null) {
      const cost = b.upgradeCost;
      const gate = b.upgradeGate;
      specs.push({
        label: gate === null ? `Upgrade\n${cost} gold` : `Upgrade\nneeds hall tier ${gate}`,
        cost,
        blocked: gate !== null,
        icon: 'ui_icon_upgrade',
        pick: () => {
          const res = map.tryUpgrade(b.id);
          if (res.ok) {
            this.closeMenu();
            this.showToast(`${buildingName(b.type)} upgraded to tier ${b.tier + 1}`);
          } else this.showToast(res.reason);
        },
      });
    }
    // The town hall with gatherers on (M3): Hire gatherer.
    if (b.type === 'townhall' && snap.gathererCap > 0)
      specs.push({
        label: `Hire gatherer\n${nodeTuning.gathererCost} gold  (${snap.workers.length}/${snap.gathererCap})`,
        cost: nodeTuning.gathererCost,
        pick: () => said(map.tryHireGatherer(), 'A gatherer joins the town'),
      });
    // Temples (M3): what Ambrosia buys. Offering needs a pantheon with a miracle to ask.
    if (nodesOn && b.type.startsWith('temple')) {
      const five = b.tier < maxTier && hasMiracle;
      if (b.tier < maxTier) {
        const price = templeAmbrosiaCost(nodeTuning.templeCost, b.tier);
        specs.push({
          label: `Upgrade\n${amb(price, five)}`,
          cost: 0,
          ambrosia: price,
          pick: () => {
            const res = map.tryAmbrosiaUpgrade(b.id);
            if (res.ok) this.closeMenu();
            said(res, `${buildingName(b.type)} upgraded with Ambrosia`);
          },
        });
      }
      if (hasMiracle)
        specs.push({
          label: `Offering\n${amb(nodeTuning.offeringCost, five)}`,
          cost: 0,
          ambrosia: nodeTuning.offeringCost,
          pick: () => said(map.tryOffering(b.id), 'The gods accept the offering'),
        });
      specs.push({
        label: `Recall\n${amb(nodeTuning.recallCost, five)}`,
        cost: 0,
        ambrosia: nodeTuning.recallCost,
        pick: () => this.openRecallList(map, b),
      });
    }
    // Towers (M3): lend a guard to a gatherer on the road.
    if (nodesOn && b.type === 'tower')
      specs.push({
        label: `Send guard\n${nodeTuning.guardCost} gold`,
        cost: nodeTuning.guardCost,
        pick: () => {
          // The first gatherer out that the sim accepts: one already guarded is skipped.
          const out = snap.workers.filter(
            (x) => (x.phase === 'out' || x.phase === 'gather') && !x.fleeing,
          );
          if (out.length === 0) return this.showToast('No gatherer is out to guard');
          let last: CommandResult | null = null;
          for (const g of out) {
            last = map.trySendGuard(g.unit);
            if (last.ok) return this.showToast('A guard goes with the gatherer');
          }
          if (last && !last.ok) this.showToast(last.reason);
        },
      });
    specs.push({ label: 'Close', cost: 0, pick: () => this.closeMenu() });
    const n = specs.length;
    const gap = 14;
    const bw = Math.min(280, Math.floor((w - 60 - (n - 1) * gap) / n));
    const total = n * bw + (n - 1) * gap;
    specs.forEach((sp, i) => {
      const x = cx - total / 2 + bw / 2 + i * (bw + gap);
      const btn = makeButton(
        this,
        x,
        y,
        bw,
        90,
        sp.label,
        sp.pick,
        sp.icon ? { icon: sp.icon } : {},
      );
      this.menu.push(btn.container);
      this.menuButtons.push({
        button: btn,
        cost: sp.cost,
        ambrosia: sp.ambrosia,
        blocked: sp.blocked,
      });
    });
  }

  // Recall the fallen (nodes.md): the graves of this temple's pantheon that have not been recalled.
  private openRecallList(map: MapScene, temple: BuildingState): void {
    const pantheon = temple.type.replace(/^temple_?/, '');
    const graves = recallable(map.snapshot.graves, pantheon, godPantheonOf);
    const options: MenuOption[] = graves.slice(0, 4).map((g) => ({
      label: `${graveLabel(g)}\nlevel ${g.level ?? 1}`,
      cost: 0,
      pick: () => {
        const res = map.tryRecallFallen(temple.id, g.id);
        if (res.ok) this.closeMenu();
        this.showToast(res.ok ? 'A fallen hero returns' : res.reason);
      },
    }));
    if (options.length === 0) {
      this.showToast('No fallen hero of this pantheon to recall');
      return;
    }
    this.openMenu(`Recall the fallen  ·  ${map.nodeTuning.recallCost} Ambrosia`, options);
  }

  private closeMenu(): void {
    this.registry.set('selectedBuilding', 0);
    this.buildMenuOpen = false;
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

  // The Ambrosia counter ticks when a jar comes home.
  private pulseAmbrosia(): void {
    this.tweens.killTweensOf(this.ambText);
    this.ambText.setScale(1);
    this.tweens.add({ targets: this.ambText, scale: 1.3, duration: 140, yoyo: true });
  }

  // The top bar gold ticks: a quick pop in size when the collector brings gold home.
  pulseGold(): void {
    this.tweens.killTweensOf(this.goldText);
    this.goldText.setScale(1);
    this.tweens.add({ targets: this.goldText, scale: 1.3, duration: 140, yoyo: true });
  }

  showToast(text: string, holdMs = 1200): void {
    this.toast.setText(text).setAlpha(1);
    this.tweens.killTweensOf(this.toast);
    this.tweens.add({ targets: this.toast, alpha: 0, delay: holdMs, duration: 400 });
  }
}
