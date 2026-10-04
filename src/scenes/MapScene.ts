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
  type UnitState,
  type Vec2,
  type World,
} from '../sim/api';
import { partyColor } from '../ui/partyLook';
import { UnitViews } from '../ui/unitViews';
import { OFFER_KEY, type LevelUpOffer } from './LevelUpScene';
import { attachCameraControls } from '../ui/cameraControls';
import type { HudScene } from './HudScene';

const BUILDING_COLORS: Record<string, number> = {
  townhall: 0xc9a227,
  temple_aesir: 0xb5a4d6,
  market: 0x4a7fb5,
  shrine: 0x7fbf9a,
  tower: 0x9a9a9a,
};
const BUILDING_SIZE = 96;
const TARGET_RADIUS = 70;
const PLOT_SIZE = 120;
const INTEREST_MAX = 8;
const PLOT_RADIUS = 110;

export interface MapTap {
  // Sim plot id of a free plot, or null.
  plot: number | null;
  // Id of a tapped hero (opens the party panel), or null.
  hero?: number | null;
  target: { pos: Vec2; label: string } | null;
}

// Renders the sim snapshot as shapes. Holds no rules: it steps the world, draws what the
// snapshot says and turns taps into commands.
export class MapScene extends Phaser.Scene {
  private world!: World;
  private snap!: Snapshot;
  private plotViews = new Map<number, Phaser.GameObjects.Rectangle>();
  private unitViews!: UnitViews;
  // Lines from the selected hero's party to the flags it is heading for.
  private links!: Phaser.GameObjects.Graphics;
  // Party whose level-up cards are open (the sim is frozen until it is picked), or null.
  private offerParty: number | null = null;
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
    attachCameraControls(this, {
      minZoom,
      onTap: (w) => this.events.emit('mapTapped', this.resolveTap(w)),
      blocked: (x, y) => this.registry.get('modal') === true || (this.hud()?.blocks(x, y) ?? false),
    });
    this.offerParty = null;
    this.registry.set('modal', false);
    this.unitViews = new UnitViews(this);
    this.links = this.add.graphics().setDepth(1_000_000);
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
    this.events.emit('simEvents', this.snap.events);
    this.syncOffer();
    this.sync();
  }

  // Level-up cards open while any party has an offer and close when the sim accepts a pick.
  private syncOffer(): void {
    const party = this.snap.parties.find((p) => p.offer !== null);
    const id = party?.id ?? null;
    if (id === this.offerParty) return;
    if (this.offerParty !== null) this.scene.stop('LevelUp');
    this.offerParty = id;
    this.registry.set('modal', id !== null);
    if (party?.offer) {
      const offer: LevelUpOffer = {
        party: party.id,
        level: party.level,
        size: party.members.length,
        upgrades: [...party.offer],
      };
      this.registry.set(OFFER_KEY, offer);
      this.scene.launch('LevelUp');
    }
  }

  // Sim command entry for the HUD. The sim decides; the result carries the refusal reason.
  tryBuild(type: string, plot: number): CommandResult {
    return command(this.world, { kind: 'build', type, plot });
  }

  tryPick(party: number, upgrade: string): CommandResult {
    return command(this.world, { kind: 'pickUpgrade', party, upgrade });
  }

  // Bounty amounts are the HUD's choice; the sim validates and spends.
  tryBounty(pos: Vec2, gold: number): CommandResult {
    return command(this.world, { kind: 'placeBounty', pos, gold });
  }

  // What a tap means: a free plot (build), else a monster or lair (bounty on it), else the
  // bare ground (bounty at that spot).
  private resolveTap(w: Phaser.Math.Vector2): MapTap {
    const plot = this.plotAt(w);
    if (plot !== null) return { plot, target: null };
    const hero = this.snap.units
      .filter((u) => u.kind === 'hero')
      .map((u) => ({ u, d: Math.hypot(u.pos.x - w.x, u.pos.y - w.y) }))
      .filter(({ d }) => d < TARGET_RADIUS)
      .sort((a, b) => a.d - b.d)[0];
    if (hero) return { plot: null, hero: hero.u.id, target: null };
    const hit = [...this.snap.units, ...this.snap.lairs]
      .map((e) => ({ e, d: Math.hypot(e.pos.x - w.x, e.pos.y - w.y) }))
      .filter(({ d }) => d < TARGET_RADIUS)
      .sort((a, b) => a.d - b.d)[0];
    if (hit) return { plot: null, target: { pos: { ...hit.e.pos }, label: hit.e.type } };
    return {
      plot: null,
      target: { pos: { x: Math.round(w.x), y: Math.round(w.y) }, label: 'this spot' },
    };
  }

  get snapshot(): Snapshot {
    return this.snap;
  }

  private hud(): HudScene | null {
    return this.scene.get('Hud') as HudScene | null;
  }

  // The id of the free plot under a world position, or null.
  private plotAt(w: Phaser.Math.Vector2): number | null {
    let best: number | null = null;
    let bestD = PLOT_RADIUS;
    for (const p of this.snap.plots) {
      const d = Phaser.Math.Distance.Between(p.pos.x, p.pos.y, w.x, w.y);
      if (d < bestD && !p.occupied) {
        best = p.id;
        bestD = d;
      }
    }
    return best;
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
      this.updateBar(this.views.get(key), b.hp, b.maxHp, BUILDING_SIZE, -BUILDING_SIZE - 14);
    }
    for (const l of this.snap.lairs) {
      const key = `l${l.id}`;
      seen.add(key);
      if (!this.views.has(key)) this.views.set(key, this.makeMarker(l.type, l.pos, 44, 0x2b1d33));
      this.updateBar(this.views.get(key), l.hp, l.maxHp, 90, -2 * 44 - 30);
    }
    for (const b of this.snap.bounties) {
      const key = `f${b.id}`;
      seen.add(key);
      if (!this.views.has(key)) this.views.set(key, this.makeBounty(b.gold, b.pos.x, b.pos.y));
      this.updateInterest(
        this.views.get(key),
        this.snap.units.filter((u) => u.bounty === b.id),
      );
    }
    for (const [key, view] of this.views) {
      if (!seen.has(key)) {
        view.destroy();
        this.views.delete(key);
      }
    }
    this.unitViews.sync(this.snap.units, this.snap.events, this.snap.timeMs);
    this.drawLinks();
    for (const e of this.snap.events) {
      if (e.kind !== 'hit') continue;
      const view = this.views.get(`b${e.target}`) ?? this.views.get(`l${e.target}`);
      if (view && !e.dodged)
        this.tweens.add({ targets: view, alpha: 0.55, duration: 60, yoyo: true });
    }
    this.syncPlots();
  }

  // One dot per hero heading for this flag, in its party colour, under the gold amount.
  private updateInterest(
    view: Phaser.GameObjects.GameObject | undefined,
    heroes: readonly Readonly<UnitState>[],
  ): void {
    if (!(view instanceof Phaser.GameObjects.Container)) return;
    let g = view.getData('interest') as Phaser.GameObjects.Graphics | undefined;
    if (!g) {
      g = this.add.graphics();
      view.add(g);
      view.setData('interest', g);
    }
    g.clear();
    const shown = heroes.slice(0, INTEREST_MAX);
    shown.forEach((u, i) => {
      const x = (i - (shown.length - 1) / 2) * 22;
      g.fillStyle(u.party > 0 ? partyColor(u.party) : 0xffffff, 1).fillCircle(x, 50, 9);
      g.lineStyle(2, 0x000000, 0.7).strokeCircle(x, 50, 9);
    });
  }

  // While a hero is selected, its party's pick is drawn as lines to the flags they head for.
  private drawLinks(): void {
    this.links.clear();
    const selected = this.snap.units.find((u) => u.id === this.registry.get('selectedUnit'));
    if (!selected) return;
    for (const u of this.snap.units) {
      if (
        u.bounty === null ||
        (selected.party > 0 ? u.party !== selected.party : u.id !== selected.id)
      )
        continue;
      const flag = this.snap.bounties.find((b) => b.id === u.bounty);
      if (!flag) continue;
      this.links
        .lineStyle(4, u.party > 0 ? partyColor(u.party) : 0xffffff, 0.85)
        .lineBetween(u.pos.x, u.pos.y - 40, flag.pos.x, flag.pos.y - 40);
    }
  }

  // HP bar on a building or lair view, shown only while it is hurt. The bar graphics live
  // on the view's container, created on first use.
  private updateBar(
    view: Phaser.GameObjects.GameObject | undefined,
    hp: number,
    maxHp: number,
    width: number,
    y: number,
  ): void {
    if (!(view instanceof Phaser.GameObjects.Container)) return;
    let bar = view.getData('bar') as Phaser.GameObjects.Graphics | undefined;
    if (!bar) {
      bar = this.add.graphics();
      view.add(bar);
      view.setData('bar', bar);
    }
    bar.clear();
    if (hp >= maxHp || maxHp <= 0) return;
    bar.fillStyle(0x000000, 0.65).fillRect(-width / 2, y, width, 10);
    bar
      .fillStyle(hp / maxHp > 0.4 ? 0x6fcf6f : 0xcf4f4f, 1)
      .fillRect(-width / 2, y, width * Math.max(0, hp / maxHp), 10);
  }

  // Plot squares come from the snapshot; an occupied plot hides its square.
  private syncPlots(): void {
    for (const p of this.snap.plots) {
      let view = this.plotViews.get(p.id);
      if (!view) {
        view = this.add
          .rectangle(p.pos.x, p.pos.y, PLOT_SIZE, PLOT_SIZE, 0xffffff, 0.08)
          .setStrokeStyle(3, 0xffffff, 0.35);
        this.plotViews.set(p.id, view);
      }
      view.setVisible(!p.occupied);
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

  // Stand-in for lairs and monsters until the unit view (Scene 50): a dot with its type.
  private makeMarker(
    type: string,
    pos: Vec2,
    r: number,
    color: number,
  ): Phaser.GameObjects.Container {
    const dot = this.add.circle(0, -r, r, color).setStrokeStyle(3, 0x000000, 0.5);
    const label = this.add
      .text(0, -r * 2 - 4, type, {
        fontFamily: 'Georgia, serif',
        fontSize: '18px',
        color: '#f4ead5',
      })
      .setOrigin(0.5, 1);
    return this.add.container(pos.x, pos.y, [dot, label]).setDepth(pos.y);
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
