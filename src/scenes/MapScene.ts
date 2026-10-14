import { SfxFeed, getSfx } from '../ui/sfxPlayer';
import { makeGround, releaseGround } from '../ui/ground';
import { flagAt } from '../ui/flagCard';
import { getMusic } from '../ui/musicPlayer';
import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, RENDER_SCALE } from '../config';
import { GRAYBOX } from '../data/graybox';
import {
  command,
  createWorld,
  runReport,
  loadWorld,
  playData,
  saveWorld,
  SaveError,
  snapshot,
  step,
  type CommandResult,
  type RunReport,
  type SimEvent,
  type Snapshot,
  type UnitState,
  type Vec2,
  type World,
  OmenDef,
} from '../sim/api';
import { TAX_STYLE, drawCoin, drawPile, popText, tillShown } from '../ui/taxLook';
import { clearSave, isNewerSave, newSeed, readSave, writeSave } from '../ui/saveStore';
import { getSettings, updateSettings } from '../ui/settings';
import { FpsGuard } from '../ui/fpsGuard';
import { heroLabel, partyColor } from '../ui/partyLook';
import { readMeta } from '../ui/metaStore';
import { chosenLean } from '../ui/setupLook';
import { UnitViews } from '../ui/unitViews';
import { iconScale } from '../ui/icons';
import { releaseSets } from '../ui/parts/bake';
import { effectiveSpeed } from '../ui/pathSpeed';
import { STYLE } from '../ui/style';
import { LAIR_UI_DEPTH, LairIndicators, groundScale, plateColor } from '../ui/lairRings';
import { LairFx } from '../ui/lairFx';
import { portraitIds } from '../ui/portraits';
import { bakeRings } from '../ui/bake';
import {
  footprintRing,
  groundShadow,
  lairDecal,
  lairPlate,
  skullPike,
  ruinMark,
  townPatch,
} from '../ui/groundDecal';
import { HALL_STYLE, drawBanners, isTownHall, plazaDecal } from '../ui/townHallLook';
import {
  buildingArtCandidates,
  buildingScale,
  footOrigin,
  footprintDepth,
  lairArtCandidates,
} from '../ui/unitLook';
import { OFFER_KEY, type LevelUpOffer } from './LevelUpScene';
import { attachCameraControls } from '../ui/cameraControls';
import { easeToward, WatchDirector } from '../ui/watchCam';
import type { HudScene } from './HudScene';
import { trailDots } from '../ui/raidArrow';
import { NodeViews } from '../ui/nodeViews';
import { AMBROSIA_STYLE, ambrosiaPop, drawJarOnGround } from '../ui/ambrosiaLook';
import { isFirstRun } from '../ui/hintStore';

// The first picture of a skill's row; its sound follows it (sfx_skill_<picture>).
const skillVisual = (id: string): string | undefined =>
  GRAYBOX.skills?.find((s) => s.id === id)?.visual[0];

const BUILDING_COLORS: Record<string, number> = {
  townhall: 0xc9a227,
  temple_aesir: 0xb5a4d6,
  market: 0x4a7fb5,
  shrine: 0x7fbf9a,
  tower: 0x9a9a9a,
};
const BUILDING_SIZE = 96;
// The ground decals' centre is 6 above the point; pictures stand their footprint centre there.
const FOOT_Y = -6;
// How long the camera takes to show the levelled party before its cards come up.
const FOCUS_MS = 700;
const TARGET_RADIUS = 70;
const PLOT_SIZE = 120;
const INTEREST_MAX = 8;
const PLOT_RADIUS = 110;

// The camera's start zoom: 0.7 shows 1830 x 1030 world units on a 1280 x 720 screen, enough for the
// plot ring (about 1040 x 760) with the buildings on it.
// The camera starts close so the art reads on a phone (Stefan, 2026-10-14); a pinch out reaches the
// whole map (minZoom below).
const DEFAULT_ZOOM = 1.0;

export interface MapTap {
  // Sim plot id of a free plot, or null.
  plot: number | null;
  // Id of a tapped hero (opens the party panel), or null.
  hero?: number | null;
  // Id of a tapped celestial node (opens its card), or null.
  node?: number | null;
  // Id of the tapped tax collector (shows its info strip), or null.
  collector?: number | null;
  // Id of a tapped building (opens the building panel), or null.
  building?: number | null;
  // Id of a tapped bounty flag (opens the flag card), or null.
  flag?: number | null;
  target: { pos: Vec2; label: string } | null;
}

// Renders the sim snapshot as shapes. Holds no rules: it steps the world, draws what the
// snapshot says and turns taps into commands.
export class MapScene extends Phaser.Scene {
  private world!: World;
  private snap!: Snapshot;
  private plotViews = new Map<number, Phaser.GameObjects.Rectangle>();
  private plotLocks = new Map<number, Phaser.GameObjects.Container>();
  private unitViews!: UnitViews;
  // Lines from the selected hero's party to the flags it is heading for.
  private links!: Phaser.GameObjects.Graphics;
  private lairInd!: LairIndicators;
  // Lairs with a raid on the way: the run time the warning ends (a dotted trail to the town).
  private raidTrails = new Map<number, number>();
  private lairFx!: LairFx;
  private selectRing: Phaser.GameObjects.Image | null = null;
  private ruinMarks = new Map<number, Phaser.GameObjects.Image>();
  private selectRingFor = 0;
  private nodeViews!: NodeViews;
  // The fallen star's marker (omens): one at a time, gone when found or when the omen ends.
  private starMarker: Phaser.GameObjects.Container | null = null;
  // Party whose level-up cards are open (the sim is frozen until it is picked), or null.
  private offerKey: string | null = null;
  // The ring on the ground around the party that levelled, while its cards are up.
  private offerRing: Phaser.GameObjects.Ellipse | null = null;
  private resumeWatch = false;
  // Camera mode: by hand, watching the best fight, or following one hero (until it is gone).
  private cam: 'off' | 'watch' | 'unit' = 'off';
  private fpsGuard: FpsGuard | null = null;
  private followId = 0;
  private director = new WatchDirector();
  private readonly sfxFeed = new SfxFeed();
  private views = new Map<string, Phaser.GameObjects.GameObject>();

  constructor() {
    super('Map');
  }

  // A new run (fresh seed) or, when Continue asked for it, the saved one. A save that cannot be
  // loaded (damaged, from a newer game) is dropped and a new run starts.
  private startWorld(): World {
    const wantSave = this.registry.get('startMode') === 'continue';
    this.registry.set('startMode', 'new');
    if (wantSave) {
      try {
        return loadWorld(readSave(), GRAYBOX);
      } catch (e) {
        if (!(e instanceof SaveError)) throw e;
        if (isNewerSave(e)) {
          // A newer game wrote it: play a fresh run here. The storage layer never clears or
          // overwrites that save (storedIsNewer), so the newer client can still continue it.
          this.registry.set('notice', 'This save is from a newer version. Reload to update.');
          return this.freshWorld();
        }
        clearSave();
      }
    }
    // Every fresh run (Play, Play again, Restart) drops the old checkpoint at once, so a reload
    // before the first autosave cannot bring the abandoned run back.
    clearSave();
    return this.freshWorld();
  }

  // A fresh run: the player's unlocked data, a gentle first run, and never the boss of the last run.
  private freshWorld(): World {
    return createWorld(newSeed(), this.playData(), {
      firstRun: isFirstRun(),
      avoidBoss: readMeta().lastBoss,
    });
  }

  // The data a fresh run is played on: the content the player has unlocked, the Altar's ranks, the
  // chosen Trials and the lean (sim/meta.ts playData), from the meta save.
  private playData() {
    const trials = (this.registry.get('runTrials') as string[] | undefined) ?? [];
    const meta = readMeta();
    // The run leans on the pantheon the setup screen showed (the chosen one, else the first open),
    // not on a random pick: playData only forces a lean that is set in the meta.
    return playData(GRAYBOX, { ...meta, lean: chosenLean(GRAYBOX, meta) }, trials);
  }

  // The Trials this run was started with (an End screen needs them for the Essence).
  get playTrials(): readonly string[] {
    return this.world.data.play?.trials ?? [];
  }

  // Writes the run to storage (autosave, and when the player quits to the title).
  saveNow(): void {
    if (this.snap.status === 'running') writeSave(saveWorld(this.world));
  }

  create(): void {
    const { width, height } = GRAYBOX.map;
    // The title theme plays on Boot, Title and the hall only; there is no run music yet.
    getMusic(this).stop(800);
    this.sfxFeed.reset();
    this.registry.set('selectedBuilding', 0);
    this.selectRing = null;
    this.selectRingFor = 0;
    this.starMarker = null;
    this.fpsGuard = new FpsGuard();
    this.world = this.startWorld();
    this.registry.set('speed', getSettings().speed);
    const cam = this.cameras.main;
    const minZoom = Math.min(GAME_WIDTH / width, GAME_HEIGHT / height);
    cam.setBounds(0, 0, width, height).setZoom(Math.max(minZoom, DEFAULT_ZOOM) * RENDER_SCALE);
    cam.centerOn(GRAYBOX.townHall.x, GRAYBOX.townHall.y);
    cam.setBackgroundColor(COLORS.background);
    makeGround(this, width, height);
    attachCameraControls(this, {
      minZoom,
      scale: RENDER_SCALE,
      onTap: (w) => this.events.emit('mapTapped', this.resolveTap(w)),
      onManual: () => this.setWatch(false),
      blocked: (x, y) => this.registry.get('modal') === true || (this.hud()?.blocks(x, y) ?? false),
    });
    this.offerKey = null;
    this.offerRing = null;
    this.resumeWatch = false;
    this.cam = 'off';
    this.followId = 0;
    this.director.reset();
    this.registry.set('camMode', 'off');
    this.registry.set('modal', false);
    // A finished or restarted run gives its baked looks back.
    // The app can be reloaded for an update when it comes back to the foreground: save the run
    // the moment it goes to the background (and when the page is closed), not only on the autosave.
    const onHide = () => {
      if (document.visibilityState === 'hidden') this.saveNow();
    };
    // pagehide can fire while the page still reads 'visible' (iOS Safari): save without asking.
    const onPageHide = () => this.saveNow();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onPageHide);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
      releaseSets(this);
      releaseGround(this);
    });
    this.unitViews = new UnitViews(this, () => {
      if (STYLE.screenShake && !getSettings().reducedMotion) this.cameras.main.shake(130, 0.004);
    });
    this.links = this.add.graphics().setDepth(1_000_000);
    this.nodeViews = new NodeViews(this);
    this.lairInd = new LairIndicators(this);
    this.lairFx = new LairFx(this, () => getSettings().reducedMotion);
    this.snap = snapshot(this.world);
    this.sync();
    this.scene.launch('Hud');
  }

  update(time: number, deltaMs: number): void {
    this.watchFrameRate(time);
    const button = (this.registry.get('speed') as number) ?? 1;
    // A path offer open (as of the last snapshot) slows the run to 0.3x, absolute.
    const speed = effectiveSpeed(
      button,
      this.snap.parties.some((p) => p.pathOffer !== null),
    );
    step(this.world, deltaMs * speed);
    this.snap = snapshot(this.world);
    if (this.snap.events.some((e) => e.kind === 'autosave')) this.saveNow();
    if (this.snap.status !== 'running') clearSave();
    this.registry.set('gold', this.snap.gold);
    this.registry.set('timeMs', this.snap.timeMs);
    this.registry.set('status', this.snap.status);
    this.events.emit('simEvents', this.snap.events);
    this.playSounds(speed);
    this.syncOffer();
    // Motion runs at the game speed, but not past 2x: a 4x swing would be a blur.
    this.sync(deltaMs * Math.min(speed, 2));
    this.waveBanners(time);
    this.updateCamera(deltaMs);
  }

  // Sound effects for this tick's events: positional ones by the camera view, hits thinned at 4x.
  private playSounds(speed: number): void {
    const sfx = getSfx(this);
    const v = this.cameras.main.worldView;
    sfx.view = { x: v.x, y: v.y, w: v.width, h: v.height };
    sfx.speed = speed;
    sfx.handle(
      this.snap.events,
      this.sfxFeed.ctx(this.snap.units, this.snap.buildings, this.snap.lairs, skillVisual),
    );
  }

  // Watch on: the camera drifts to the most interesting fight. Off: back to by hand.
  setWatch(on: boolean): void {
    this.cam = on ? 'watch' : 'off';
    this.followId = 0;
    this.director.reset();
    this.registry.set('camMode', this.cam);
  }

  // Follow one hero until it leaves the map or the player drags.
  followUnit(id: number): void {
    this.cam = 'unit';
    this.followId = id;
    this.registry.set('camMode', 'unit');
  }

  private updateCamera(dtMs: number): void {
    if (this.cam === 'off') return;
    let target: Vec2 | null;
    if (this.cam === 'unit') {
      const u = this.snap.units.find((x) => x.id === this.followId);
      if (!u) return this.setWatch(false);
      target = u.pos;
    } else {
      target =
        this.director.update(this.snap.units, dtMs, [
          ...this.snap.lairs.map((l) => l.id),
          ...this.snap.buildings.map((b) => b.id),
        ])?.center ?? null;
    }
    if (!target) return;
    const cam = this.cameras.main;
    const next = easeToward({ x: cam.midPoint.x, y: cam.midPoint.y }, target, dtMs);
    cam.centerOn(next.x, next.y);
  }

  // Level-up cards open while any party has an offer and close when the sim accepts a pick. A
  // path offer comes first (the sim refuses the upgrade until the path is picked); a new offer
  // for the same party (the next card, or a redealt path after 'path taken') reopens the cards.
  private syncOffer(): void {
    const pathParty = this.snap.parties.find((p) => p.pathOffer !== null);
    const party = pathParty ?? this.snap.parties.find((p) => p.offer !== null);
    const key = !party
      ? null
      : pathParty?.pathOffer
        ? `path:${party.id}:${pathParty.pathOffer.hero}:${pathParty.pathOffer.options.join(',')}`
        : `up:${party.id}:${party.level}`;
    if (key === this.offerKey) return;
    if (this.offerKey !== null) this.scene.stop('LevelUp');
    this.clearOfferRing();
    if (key === null && this.resumeWatch) {
      this.resumeWatch = false;
      this.setWatch(true);
    }
    this.offerKey = key;
    this.registry.set('modal', key !== null);
    if (!party) return;
    const po = pathParty?.pathOffer;
    const who = this.partyWho(party, po?.hero ?? null);
    let offer: LevelUpOffer;
    if (po) {
      const hero = this.snap.units.find((u) => u.id === po.hero);
      offer = {
        party: party.id,
        level: party.level,
        size: party.members.length,
        upgrades: [],
        pathHero: hero ? heroLabel(hero) : 'A hero',
        pathGod: hero?.god ?? null,
        paths: po.options.flatMap((id) => {
          const p = this.snap.paths.find((x) => x.id === id);
          return p ? [{ id: p.id, god: p.god, name: p.name, pantheon: p.pantheon }] : [];
        }),
        ...who,
      };
    } else if (party.offer) {
      offer = {
        party: party.id,
        level: party.level,
        size: party.members.length,
        upgrades: [...party.offer],
        ...who,
      };
    } else return;
    // Show WHERE first: the camera glides to the party and a ring marks it, and only then do the
    // cards come up (the sim is frozen meanwhile).
    this.registry.set(OFFER_KEY, offer);
    this.focusParty(who.focus, who.color, who.members.length > 0);
    this.time.delayedCall(getSettings().reducedMotion ? 0 : FOCUS_MS, () => {
      if (this.offerKey === key) this.scene.launch('LevelUp');
    });
  }

  // Who is in the party that levelled: colour, leader, members with their pictures, and where.
  private partyWho(
    party: { id: number; members: readonly number[] },
    picking: number | null,
  ): Required<Pick<LevelUpOffer, 'color' | 'leader' | 'members' | 'focus'>> {
    const units = party.members.flatMap((id) => {
      const u = this.snap.units.find((x) => x.id === id);
      return u ? [u] : [];
    });
    const leader = units[0];
    const cx = units.length ? units.reduce((s, u) => s + u.pos.x, 0) / units.length : 0;
    const cy = units.length ? units.reduce((s, u) => s + u.pos.y, 0) / units.length : 0;
    return {
      color: partyColor(party.id),
      leader: leader ? heroLabel(leader) : 'the party',
      members: units.map((u) => ({
        id: u.id,
        label: heroLabel(u),
        art: portraitIds(this, u),
        picking: picking === u.id,
      })),
      focus: { x: cx, y: cy },
    };
  }

  private clearOfferRing(): void {
    if (this.offerRing) this.tweens.killTweensOf(this.offerRing);
    this.offerRing?.destroy();
    this.offerRing = null;
  }

  // Glide the camera to the party and ring it in its colour for as long as the cards are up.
  private focusParty(at: Vec2, color: number, hasUnits: boolean): void {
    // Watch is paused while the cards are up and comes back when they close.
    if (this.registry.get('camMode') === 'watch') this.resumeWatch = true;
    this.setWatch(false);
    this.clearOfferRing();
    if (!hasUnits) return;
    this.cameras.main.pan(
      at.x,
      at.y,
      getSettings().reducedMotion ? 1 : FOCUS_MS - 100,
      'Sine.easeInOut',
    );
    const ring = this.add
      .ellipse(at.x, at.y, 260, 120, color, 0.18)
      .setStrokeStyle(8, color, 0.95)
      .setDepth(999_900);
    this.offerRing = ring;
    if (!getSettings().reducedMotion)
      this.tweens.add({
        targets: ring,
        scale: 1.25,
        alpha: 0.6,
        duration: 700,
        yoyo: true,
        repeat: -1,
      });
  }

  // Sim command entry for the HUD. The sim decides; the result carries the refusal reason.
  tryBuild(type: string, plot: number): CommandResult {
    return command(this.world, { kind: 'build', type, plot });
  }

  // Ruins (tuning.town.ruins): rebuild at tier 1 for part of the cost, or clear the plot.
  tryRebuildRuin(ruin: number): CommandResult {
    return command(this.world, { kind: 'rebuildRuin', ruin });
  }

  tryClearRuin(ruin: number): CommandResult {
    return command(this.world, { kind: 'clearRuin', ruin });
  }

  // What rebuilding a ruin of this building type costs now.
  ruinCost(type: string): number {
    const def = this.world.data.buildings.find((d) => d.id === type);
    return Math.round((def?.cost ?? 0) * this.world.tuning.town.rebuildCostMult);
  }

  tryPickPath(party: number, path: string): CommandResult {
    return command(this.world, { kind: 'pickPath', party, path });
  }

  tryPick(party: number, upgrade: string): CommandResult {
    return command(this.world, { kind: 'pickUpgrade', party, upgrade });
  }

  // Upgrade a building to its next tier (the sim checks gold and the tier cap).
  tryUpgrade(building: number): CommandResult {
    return command(this.world, { kind: 'upgrade', building });
  }

  // The row of an omen in this run's deck (for its look).
  omenDef(id: string): OmenDef | undefined {
    return this.world.data.omens?.find((o) => o.id === id);
  }

  // The fallen star's marker: shown while the snapshot says a star lies unfound (so it also
  // survives a reload), gone when it is found or the omen ends.
  private syncStar(): void {
    const at = this.snap.omen?.star;
    if (!at) {
      if (this.starMarker) {
        this.starMarker.destroy();
        this.starMarker = null;
      }
      return;
    }
    if (this.starMarker) return;
    const c = this.add.container(at.x, at.y).setDepth(800000);
    const glow = bakeRings(this, [
      { w: 120, h: 46, fill: [0x9fb7ff, 0.25] },
      { w: 84, h: 32, line: [3, 0xf2c14e, 0.9] },
    ]);
    const star = this.add.star(0, -34, 5, 9, 20, 0xfff3b0).setStrokeStyle(2, 0xf2c14e, 1);
    c.add([glow, star]);
    this.tweens.add({ targets: star, y: -8, duration: 900, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: glow, alpha: 0.5, duration: 700, yoyo: true, repeat: -1 });
    this.starMarker = c;
  }

  // The seed of this run (createWorld(seed, GRAYBOX) replays its map).
  get seed(): number {
    return this.world.seed;
  }

  // The end-screen numbers for the run as it stands (Quit from Pause shows them as abandoned).
  get hintTuning(): { minTill: number; maxTier: number } {
    const t = this.world.tuning;
    return { minTill: t.collector.minTill, maxTier: t.lair.maxTier };
  }

  abandonReport(): RunReport {
    return runReport(this.world);
  }

  // Take a bounty flag down (half the gold comes back) or add gold to one that stands.
  tryCancelBounty(bounty: number): CommandResult {
    return command(this.world, { kind: 'cancelBounty', bounty });
  }

  tryAmbrosiaUpgrade(building: number): CommandResult {
    return command(this.world, { kind: 'upgradeWithAmbrosia', building });
  }

  tryOffering(building: number): CommandResult {
    return command(this.world, { kind: 'offering', building });
  }

  tryRecallFallen(building: number, grave: number): CommandResult {
    return command(this.world, { kind: 'recallFallen', building, grave });
  }

  trySendGuard(unit: number): CommandResult {
    return command(this.world, { kind: 'sendGuard', unit });
  }

  // The world's node timings for the rings (defile countdown, cleanse, sprout warning).
  get nodeTiming() {
    const t = this.world.tuning.nodes;
    return { defileMs: t.defileCountdownMs, cleanseMs: t.cleanseMs, sproutWarnMs: t.sproutWarnMs };
  }

  // The world's node tuning (costs of the Ambrosia cards, the gatherer and the guard).
  get nodeTuning() {
    const t = this.world.tuning.nodes;
    return {
      gathererCost: t.gathererCost,
      guardCost: t.guardCost,
      templeCost: t.templeCost,
      offeringCost: t.offeringCost,
      recallCost: t.recallCost,
    };
  }

  tryHireGatherer(): CommandResult {
    return command(this.world, { kind: 'hireGatherer' });
  }

  trySendGatherer(node: number): CommandResult {
    return command(this.world, { kind: 'sendGatherer', node });
  }

  tryRecallGatherers(node?: number): CommandResult {
    return command(this.world, {
      kind: 'recallGatherers',
      ...(node === undefined ? {} : { node }),
    });
  }

  // The world's gatherer cost (tuning), for the hall card.
  get gathererCost(): number {
    return this.world.tuning.nodes.gathererCost;
  }

  tryRaiseBounty(bounty: number, gold: number): CommandResult {
    return command(this.world, { kind: 'raiseBounty', bounty, gold });
  }

  // Pan the camera to a place (an event feed tap).
  jumpTo(pos: Vec2): void {
    this.setWatch(false);
    this.cameras.main.pan(pos.x, pos.y, 450, 'Sine.easeInOut');
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
    // A freed or defiled node (the column of light): its card sends gatherers.
    const node = this.snap.nodes
      .filter((n) => n.state !== 'locked')
      .map((n) => ({ n, d: Math.hypot(n.pos.x - w.x, n.pos.y - 40 - w.y) }))
      .filter(({ d }) => d < TARGET_RADIUS + 30)
      .sort((a, b) => a.d - b.d)[0];
    if (
      node &&
      !this.snap.units.some(
        (u) => u.kind === 'hero' && Math.hypot(u.pos.x - w.x, u.pos.y - w.y) < TARGET_RADIUS,
      )
    )
      return { plot: null, node: node.n.id, target: null };
    // The tax collector: its own tap (an info strip), found before heroes so a crowd does not hide it.
    const collector = this.snap.units
      .filter((u) => u.kind === 'collector')
      .map((u) => ({ u, d: Math.hypot(u.pos.x - w.x, u.pos.y - 40 - w.y) }))
      .filter(({ d }) => d < TARGET_RADIUS + 20)
      .sort((a, b) => a.d - b.d)[0];
    if (collector) return { plot: null, collector: collector.u.id, target: null };
    const hero = this.snap.units
      .filter((u) => u.kind === 'hero')
      .map((u) => ({ u, d: Math.hypot(u.pos.x - w.x, u.pos.y - w.y) }))
      .filter(({ d }) => d < TARGET_RADIUS)
      .sort((a, b) => a.d - b.d)[0];
    if (hero) {
      this.followUnit(hero.u.id);
      return { plot: null, hero: hero.u.id, target: null };
    }
    const building = this.buildingAt(w);
    if (building !== null) return { plot: null, building, target: null };
    const hit = [...this.snap.units, ...this.snap.lairs]
      .map((e) => ({ e, d: Math.hypot(e.pos.x - w.x, e.pos.y - w.y) }))
      .filter(({ d }) => d < TARGET_RADIUS)
      .sort((a, b) => a.d - b.d)[0];
    // A flag stands on the monster or lair it was placed on: the nearer wins a tap, and a tie (a flag sits exactly on its target) goes to the flag.
    const flag = flagAt(this.snap.bounties, w);
    const flagPos = this.snap.bounties.find((b) => b.id === flag)?.pos;
    if (flag !== null && flagPos && (!hit || Math.hypot(flagPos.x - w.x, flagPos.y - w.y) <= hit.d))
      return { plot: null, flag, target: null };
    if (hit) return { plot: null, target: { pos: { ...hit.e.pos }, label: hit.e.type } };
    return {
      plot: null,
      target: { pos: { x: Math.round(w.x), y: Math.round(w.y) }, label: 'this spot' },
    };
  }

  get snapshot(): Snapshot {
    return this.snap;
  }

  // Sharp rendering that runs too slow in the first minute is switched off for the next start.
  private watchFrameRate(time: number): void {
    if (RENDER_SCALE <= 1 || this.fpsGuard === null) return;
    if (!this.fpsGuard.frame(time, !document.hidden)) return;
    this.fpsGuard = null;
    updateSettings({ sharp: false });
    this.hud()?.showToast('Sharp mode off for speed; Settings to change', 4500);
  }

  private hud(): HudScene | null {
    return this.scene.get('Hud') as HudScene | null;
  }

  // The building whose picture covers a world position (the frontmost one), or null.
  private buildingAt(w: Phaser.Math.Vector2): number | null {
    let best: { id: number; y: number } | null = null;
    for (const b of this.snap.buildings) {
      const top =
        (this.views.get(`b${b.id}t${b.tier}`)?.getData('top') as number | undefined) ?? 96;
      const inside = Math.abs(w.x - b.pos.x) < 95 && w.y > b.pos.y - top && w.y < b.pos.y + 20;
      if (inside && (!best || b.pos.y > best.y)) best = { id: b.id, y: b.pos.y };
    }
    return best?.id ?? null;
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

  // Creates, moves and removes one view per snapshot entity, keyed by kind and sim id.
  private sync(dtMs = 0): void {
    const seen = new Set<string>();
    for (const b of this.snap.buildings) {
      // The tier is part of the key: a tier-up replaces the view with the next picture.
      const key = `b${b.id}t${b.tier}`;
      seen.add(key);
      if (!this.views.has(key)) this.views.set(key, this.makeBuilding(b.type, b.tier, b.pos));
      const top = (this.views.get(key)?.getData('top') as number | undefined) ?? BUILDING_SIZE;
      const hall = isTownHall(b.type);
      this.updateBar(
        this.views.get(key),
        b.hp,
        b.maxHp,
        hall ? HALL_STYLE.barWidth : BUILDING_SIZE,
        -top - 14,
        hall,
      );
      this.updateTill(this.views.get(key), b.till, -top - 52);
    }
    for (const l of this.snap.lairs) {
      const key = `l${l.id}`;
      seen.add(key);
      if (!this.views.has(key)) this.views.set(key, this.makeLair(l));
      else this.refreshLair(this.views.get(key), l.type, l.tier, l.boss);
      const top = (this.views.get(key)?.getData('top') as number | undefined) ?? 2 * 44;
      this.updateBar(this.views.get(key), l.hp, l.maxHp, 90, -top - 30);
    }
    for (const b of this.snap.bounties) {
      const key = `f${b.id}`;
      seen.add(key);
      const flagView = this.views.get(key);
      if (!flagView) this.views.set(key, this.makeBounty(b.gold, b.pos.x, b.pos.y));
      else if (flagView instanceof Phaser.GameObjects.Container) {
        // A hunt flag follows its monster; a flag whose monster died stays where it fell.
        const k = 1 - Math.pow(0.6, Math.max(dtMs, 16) / 16.7);
        flagView.x += (b.pos.x - flagView.x) * k;
        flagView.y += (b.pos.y - flagView.y) * k;
        flagView.setDepth(flagView.y);
      }
      this.markHunt(this.views.get(key), b.target !== undefined);
      this.markEscort(this.views.get(key), b.escort !== undefined, b.escortBy !== undefined);
      this.updateInterest(
        this.views.get(key),
        this.snap.units.filter((u) => u.bounty === b.id),
      );
    }
    for (const j of this.snap.jars) {
      const key = `a${j.id}`;
      seen.add(key);
      if (!this.views.has(key)) this.views.set(key, this.makeJar(j.amount, j.pos));
    }
    for (const p of this.snap.piles) {
      const key = `g${p.id}`;
      seen.add(key);
      if (!this.views.has(key)) this.views.set(key, this.makePile(p.gold, p.pos));
      else this.refreshPile(this.views.get(key), p.gold);
    }
    for (const [key, view] of this.views) {
      if (!seen.has(key)) {
        view.destroy();
        this.views.delete(key);
      }
    }
    this.unitViews.carryCap = this.world.tuning.collector.carryCap;
    this.unitViews.carry = new Map(this.snap.workers.map((w) => [w.unit, w.carry]));
    this.unitViews.sync(
      this.snap.units,
      this.snap.events,
      this.snap.timeMs,
      dtMs,
      (id) => {
        const e =
          this.snap.lairs.find((l) => l.id === id) ?? this.snap.buildings.find((b) => b.id === id);
        return e?.pos;
      },
      this.snap.parties,
      this.snap.paths,
    );
    this.drawLinks();
    this.nodeViews.update(this.snap, this.nodeTiming);
    this.lairInd.update(this.snap, dtMs, this.world.tuning.monster.lairAggro);
    this.lairFx.update(this.time.now);
    // The plate pulses with its ring in the last 15 s before a tier-up.
    for (const l of this.snap.lairs)
      (
        this.views.get(`l${l.id}`)?.getData('plate') as Phaser.GameObjects.Container | undefined
      )?.setScale(1 + 0.1 * this.lairInd.beatOf(l.id));
    for (const e of this.snap.events) {
      if (e.kind === 'lairTierUp') this.lairGrows(e.lair, e.tier);
      if (e.kind === 'considering') this.flagGlint(e.bounty);
      if (e.kind === 'raidWarning') this.lairInd.flashRed(e.lair);
      if (e.kind === 'raidWarning') this.raidTrails.set(e.lair, this.snap.timeMs + e.inMs);
      this.taxEvent(e);
      this.nodeEvent(e);
      if (e.kind !== 'hit') continue;
      const view = this.views.get(`b${e.target}`) ?? this.views.get(`l${e.target}`);
      if (view && !e.dodged)
        this.tweens.add({ targets: view, alpha: 0.55, duration: 60, yoyo: true });
    }
    this.syncPlots();
    this.syncSelectRing();
    this.syncStar();
  }

  // The thin footprint ring under the building whose panel is open (the HUD sets selectedBuilding).
  private syncSelectRing(): void {
    const id = (this.registry.get('selectedBuilding') as number | undefined) ?? 0;
    if (id === this.selectRingFor) return;
    this.selectRing?.destroy();
    this.selectRing = null;
    this.selectRingFor = id;
    const b = id ? this.snap.buildings.find((x) => x.id === id) : undefined;
    const view = b ? this.views.get(`b${b.id}t${b.tier}`) : undefined;
    if (!(view instanceof Phaser.GameObjects.Container)) return;
    const w = (view.getData('w') as number | undefined) ?? 250;
    this.selectRing = footprintRing(this, w * 0.9)
      .setPosition(view.x, view.y)
      .setDepth(0.7);
  }

  // A hunt flag carries a ring on the ground at its foot.
  private markHunt(view: Phaser.GameObjects.GameObject | undefined, hunt: boolean): void {
    if (!(view instanceof Phaser.GameObjects.Container)) return;
    let ring = view.getData('hunt') as Phaser.GameObjects.Graphics | undefined;
    if (!ring && hunt) {
      ring = this.add.graphics();
      ring.lineStyle(4, 0xf2c14e, 0.9).strokeEllipse(0, 0, 90, 40);
      ring.lineStyle(2, 0x000000, 0.5).strokeEllipse(0, 0, 100, 48);
      view.addAt(ring, 0);
      view.setData('hunt', ring);
    }
    ring?.setVisible(hunt);
  }

  // An escort flag (it walks with a gatherer): a teal ring and a small figure mark; the ring fills
  // once a hero has taken it.
  private markEscort(
    view: Phaser.GameObjects.GameObject | undefined,
    escort: boolean,
    taken: boolean,
  ): void {
    if (!(view instanceof Phaser.GameObjects.Container)) return;
    let g = view.getData('escort') as Phaser.GameObjects.Graphics | undefined;
    if (!g && escort) {
      g = this.add.graphics();
      view.addAt(g, 0);
      view.setData('escort', g);
    }
    if (!g) return;
    g.setVisible(escort);
    if (!escort || view.getData('taken') === taken) return;
    view.setData('taken', taken);
    g.clear();
    g.lineStyle(5, 0x6fd0c8, 0.95).strokeEllipse(0, 0, 100, 42);
    if (taken) g.fillStyle(0x6fd0c8, 0.3).fillEllipse(0, 0, 100, 42);
    g.fillStyle(0x6fd0c8, 1).fillCircle(0, -22, 6).fillRect(-4, -16, 8, 12);
  }

  // A party weighs this flag: a quick glint.
  private flagGlint(bounty: number): void {
    const view = this.views.get(`f${bounty}`);
    if (!view) return;
    // Two parties weighing one flag: restart, so it never stays enlarged.
    this.tweens.killTweensOf(view);
    (view as Phaser.GameObjects.Container).setScale(1);
    this.tweens.add({ targets: view, scale: 1.25, duration: 160, yoyo: true });
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
      g.fillStyle(u.party > 0 ? partyColor(u.party) : 0xffffff, 1).fillCircle(x, 66, 10);
      g.lineStyle(2, 0x000000, 0.7).strokeCircle(x, 66, 10);
    });
  }

  // While a hero is selected, its party's pick is drawn as lines to the flags they head for.
  // A lair reaching a new tier: it swells, a red ring spreads and a label rises.
  private lairGrows(id: number, tier: number): void {
    const lair = this.snap.lairs.find((l) => l.id === id);
    if (!lair) return;
    const view = this.views.get(`l${id}`);
    if (view && !getSettings().reducedMotion)
      this.tweens.add({
        targets: view,
        scale: 1.25,
        duration: 220,
        yoyo: true,
        ease: 'Sine.easeOut',
      });
    const { x, y } = lair.pos;
    const ring = this.add
      .circle(x, y, 30, 0x000000, 0)
      .setStrokeStyle(6, 0xd9534f, 0.9)
      .setDepth(1_000_000);
    this.tweens.add({
      targets: ring,
      scale: getSettings().reducedMotion ? 3 : 7,
      alpha: 0,
      duration: 700,
      onComplete: () => ring.destroy(),
    });
    const label = this.add
      .text(x, y - 90, `${lair.type} lair grows (tier ${tier})`, {
        fontFamily: 'Georgia, serif',
        fontSize: '28px',
        color: '#ff9a8a',
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(1_000_000);
    this.tweens.add({
      targets: label,
      y: label.y - 50,
      alpha: 0,
      delay: 600,
      duration: 900,
      onComplete: () => label.destroy(),
    });
  }

  // For the 15 s of a raid warning, a dotted trail runs from the source lair toward the town.
  private drawRaidTrails(): void {
    const hall = this.snap.buildings.find((b) => b.type === 'townhall')?.pos;
    for (const [lairId, untilMs] of this.raidTrails) {
      const lair = this.snap.lairs.find((l) => l.id === lairId);
      if (!lair || this.snap.timeMs >= untilMs) {
        this.raidTrails.delete(lairId);
        continue;
      }
      if (!hall) continue;
      const phase = (this.snap.timeMs / 900) % 1;
      for (const d of trailDots(lair.pos, hall, 0.6, 46, phase))
        this.links.fillStyle(0xe03a2a, 0.9).fillCircle(d.x, d.y, 8);
    }
  }

  private drawLinks(): void {
    this.links.clear();
    this.drawRaidTrails();
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

  // The coin and number over a building whose till holds at least minTill (hidden below).
  private updateTill(
    view: Phaser.GameObjects.GameObject | undefined,
    till: number | undefined,
    y: number,
  ): void {
    if (!(view instanceof Phaser.GameObjects.Container)) return;
    const show = tillShown(till, this.world.tuning.collector.minTill);
    let tag = view.getData('till') as Phaser.GameObjects.Container | undefined;
    if (!tag) {
      if (!show) return;
      const label = this.add
        .text(14, 0, '', {
          fontFamily: 'Georgia, serif',
          fontSize: '24px',
          color: TAX_STYLE.text,
          stroke: '#000000',
          strokeThickness: 4,
        })
        .setOrigin(0, 0.5);
      const coin = this.add.graphics();
      drawCoin(coin, -12, 0, 11);
      tag = this.add.container(0, y, [coin, label]);
      tag.setData('label', label);
      view.add(tag);
      view.setData('till', tag);
    }
    tag.setVisible(show);
    if (!show) return;
    const label = tag.getData('label') as Phaser.GameObjects.Text;
    const text = `${till}`;
    if (label.text !== text) label.setText(text);
    // Centre the coin and the number as one.
    tag.setX(-label.width / 2 + 2);
  }

  // A jar of Ambrosia on the ground (a gatherer fell or dropped it): it pulses once as it lands.
  private makeJar(amount: number, pos: Vec2): Phaser.GameObjects.Container {
    const g = this.add.graphics();
    drawJarOnGround(g, amount);
    const label = this.add
      .text(0, 6, `${Math.round(amount)}`, {
        fontFamily: 'Georgia, serif',
        fontSize: '24px',
        color: AMBROSIA_STYLE.text,
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(0.5, 0);
    const c = this.add.container(pos.x, pos.y, [g, label]).setDepth(pos.y);
    this.tweens.add({
      targets: c,
      scale: { from: 1.5, to: 1 },
      duration: 350,
      ease: 'Back.easeOut',
    });
    return c;
  }

  private makePile(gold: number, pos: Vec2): Phaser.GameObjects.Container {
    const g = this.add.graphics();
    drawPile(g, gold);
    const label = this.add
      .text(0, 8, `${gold}`, {
        fontFamily: 'Georgia, serif',
        fontSize: '26px',
        color: '#f2c14e',
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(0.5, 0);
    const c = this.add.container(pos.x, pos.y, [g, label]).setDepth(pos.y);
    c.setData('g', g).setData('label', label).setData('gold', gold);
    // It pulses once when it lands.
    this.tweens.add({
      targets: c,
      scale: { from: 1.5, to: 1 },
      duration: 350,
      ease: 'Back.easeOut',
    });
    return c;
  }

  private refreshPile(view: Phaser.GameObjects.GameObject | undefined, gold: number): void {
    if (!(view instanceof Phaser.GameObjects.Container) || view.getData('gold') === gold) return;
    view.setData('gold', gold);
    drawPile(view.getData('g') as Phaser.GameObjects.Graphics, gold);
    (view.getData('label') as Phaser.GameObjects.Text).setText(`${gold}`);
  }

  // The two "+N" pops of the tax collector, one style each: a till pop (tax or tithe lands in a
  // building, small, light gold) and a delivery pop (the collector banks gold at the hall, large,
  // bright gold, with a coin).
  private coinPop(pos: Vec2, gold: number, kind: 'till' | 'deliver'): void {
    const big = kind === 'deliver';
    const t = this.add
      .text(pos.x + (big ? 12 : 0), pos.y - (big ? 150 : 100), popText(gold), {
        fontFamily: 'Georgia, serif',
        fontSize: big ? '40px' : '26px',
        color: big ? '#ffd35e' : '#ffe9a0',
        stroke: '#000000',
        strokeThickness: big ? 6 : 4,
      })
      .setOrigin(0.5)
      .setDepth(1_000_000);
    const parts: Phaser.GameObjects.GameObject[] = [t];
    if (big) {
      const coin = this.add.graphics().setDepth(1_000_000);
      drawCoin(coin, 0, 0, 14);
      coin.setPosition(t.x - t.width / 2 - 16, t.y);
      parts.push(coin);
    }
    this.tweens.add({
      targets: parts,
      y: `-=${big ? 60 : 44}`,
      alpha: 0,
      duration: big ? 1400 : 1000,
      ease: 'Cubic.easeOut',
      onComplete: () => parts.forEach((o) => o.destroy()),
    });
  }

  // A coin that flies from a spot to a unit (the collector's sack) and vanishes.
  private flyCoin(from: Vec2, unitId: number): void {
    const to = this.snap.units.find((u) => u.id === unitId)?.pos;
    if (!to) return;
    const g = this.add.graphics().setDepth(1_000_000);
    drawCoin(g, 0, 0, 11);
    g.setPosition(from.x, from.y - 90);
    this.tweens.add({
      targets: g,
      x: to.x,
      y: to.y - 50,
      scale: 0.6,
      duration: 450,
      ease: 'Sine.easeIn',
      onComplete: () => g.destroy(),
    });
  }

  // The gatherers' events as pictures (nodes.md): the jar comes home with a "+N Ambrosia" at the hall.
  private nodeEvent(e: Readonly<SimEvent>): void {
    const hall = this.snap.buildings.find((b) => b.type === 'townhall')?.pos;
    if (e.kind === 'jarHome') {
      if (hall) this.textPop(hall, ambrosiaPop(e.amount), AMBROSIA_STYLE.text, 34);
    } else if (e.kind === 'jarTaken') {
      const u = this.snap.units.find((x) => x.id === e.unit)?.pos;
      if (u) this.textPop(u, ambrosiaPop(e.amount), AMBROSIA_STYLE.text, 24);
    } else if (e.kind === 'workerFell') {
      this.textPop(e.pos, 'Gatherer lost', '#ff9a8a', 24);
    } else if (e.kind === 'guardFell') {
      this.textPop(e.pos, 'Guard fell', '#ff9a8a', 24);
    }
  }

  // A short line that rises over a spot and fades.
  private textPop(pos: Vec2, text: string, color: string, size: number): void {
    const t = this.add
      .text(pos.x, pos.y - 100, text, {
        fontFamily: 'Georgia, serif',
        fontSize: `${size}px`,
        color,
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(1_000_000);
    this.tweens.add({
      targets: t,
      y: t.y - 55,
      alpha: 0,
      duration: 1300,
      ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  // The tax collector's events as pictures (tax-collector.md section 2).
  private taxEvent(e: Readonly<SimEvent>): void {
    const hall = this.snap.buildings.find((b) => b.type === 'townhall')?.pos;
    const at = (id: number): Vec2 | undefined =>
      this.snap.buildings.find((b) => b.id === id)?.pos ?? undefined;
    if (e.kind === 'till') {
      const p = at(e.building);
      if (p) this.coinPop(p, e.gold, 'till');
    } else if (e.kind === 'tithe') {
      // A tithe into a temple's till also fires `till` (that pops); only the hall case, banked at
      // once (building 0 or the hall itself), pops here.
      const b = this.snap.buildings.find((x) => x.id === e.building);
      if ((e.building === 0 || b?.type === 'townhall') && hall) this.coinPop(hall, e.gold, 'till');
    } else if (e.kind === 'tillEmptied') {
      const from = e.source === 'till' ? at(e.id) : this.snap.piles.find((q) => q.id === e.id)?.pos;
      if (from) this.flyCoin(from, e.unit);
    } else if (e.kind === 'collected') {
      if (hall) this.coinPop(hall, e.gold, 'deliver');
      this.hud()?.pulseGold();
    }
  }

  // The hall's banners wave (still with reduced motion).
  private waveBanners(time: number): void {
    const still = getSettings().reducedMotion;
    for (const v of this.views.values()) {
      const g = v.getData?.('banners') as Phaser.GameObjects.Graphics | undefined;
      if (g) drawBanners(g, time, still);
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
    always = false,
  ): void {
    if (!(view instanceof Phaser.GameObjects.Container)) return;
    let bar = view.getData('bar') as Phaser.GameObjects.Graphics | undefined;
    if (!bar) {
      bar = this.add.graphics();
      view.add(bar);
      view.setData('bar', bar);
    }
    bar.clear();
    if ((hp >= maxHp && !always) || maxHp <= 0) return;
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
      view.setVisible(!p.occupied && p.ruin === null);
      // A ruin stands on its plot until it is rebuilt or cleared.
      const mark = this.ruinMarks.get(p.id);
      if (p.ruin !== null && !mark)
        this.ruinMarks.set(p.id, ruinMark(this).setPosition(p.pos.x, p.pos.y).setDepth(p.pos.y));
      else if (p.ruin === null && mark) {
        mark.destroy();
        this.ruinMarks.delete(p.id);
      }
      // A plot closed until the town hall reaches a tier: faint, with a padlock and the tier.
      view
        .setFillStyle(0xffffff, p.locked ? 0.02 : 0.08)
        .setStrokeStyle(3, 0xffffff, p.locked ? 0.15 : 0.35);
      let lock = this.plotLocks.get(p.id);
      if (!lock && p.locked) {
        lock = this.add.container(p.pos.x, p.pos.y, [
          this.add
            .graphics()
            .fillStyle(0xd9c9a8, 0.75)
            .fillRoundedRect(-14, -4, 28, 22, 4)
            .lineStyle(5, 0xd9c9a8, 0.75)
            .strokeCircle(0, -8, 9),
          this.add
            .text(0, 30, `Hall tier ${p.unlockTier}`, {
              fontFamily: 'Georgia, serif',
              fontSize: '20px',
              color: '#d9c9a8',
              stroke: '#000000',
              strokeThickness: 4,
            })
            .setOrigin(0.5),
        ]);
        lock.setDepth(p.pos.y);
        this.plotLocks.set(p.id, lock);
      }
      lock?.setVisible(p.locked && !p.occupied);
    }
  }

  // The building's picture (its tier, else tier 1) standing on its base, scaled to the plot; the
  // coloured square with the type name when the manifest has none.
  private makeBuilding(type: string, tier: number, pos: Vec2): Phaser.GameObjects.Container {
    const view = this.makeBuildingView(type, tier, pos);
    if (isTownHall(type)) {
      this.groundUnder(view, plazaDecal(this), pos);
      const banners = this.add.graphics();
      view.add(banners);
      view.setData('banners', banners);
    } else
      this.groundUnder(
        view,
        townPatch(this, ((view.getData('w') as number | undefined) ?? 250) * 0.9),
        pos,
      );
    const w = view.getData('w') as number | undefined;
    const h = view.getData('h') as number | undefined;
    if (w) this.groundUnder(view, groundShadow(this, w, h), pos, 0.6);
    return view;
  }

  // A decal on the ground layer (below every unit and building), positioned at `pos` and destroyed
  // with its view: inside the depth-sorted view it would draw over units standing behind it.
  private groundUnder(
    view: Phaser.GameObjects.Container,
    decal: Phaser.GameObjects.Image,
    pos: Vec2,
    depth = 0.5,
  ): void {
    decal.setPosition(pos.x, pos.y).setDepth(depth);
    view.once(Phaser.GameObjects.Events.DESTROY, () => decal.destroy());
  }

  private makeBuildingView(type: string, tier: number, pos: Vec2): Phaser.GameObjects.Container {
    const art = buildingArtCandidates(type, tier).find((id) => this.textures.exists(id));
    if (art) {
      const img = this.add.image(0, FOOT_Y, art);
      const o = footOrigin(img.width, img.height);
      img.setOrigin(o.x, o.y);
      const k = buildingScale(img.width, img.height) * (isTownHall(type) ? HALL_STYLE.scale : 1);
      img.setScale(k);
      return this.add
        .container(pos.x, pos.y, [img])
        .setData('top', o.y * img.height * k - FOOT_Y)
        .setData('w', img.width * k)
        .setData('h', img.height * k)
        .setDepth(footprintDepth(pos.y, img.width * k));
    }
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
    return this.add.container(pos.x, pos.y, [body, label]).setDepth(pos.y);
  }

  // A lair: its picture (`bld_lair_<id>_t<tier>`, tier 1 as the fallback) standing on its base, a
  // boss lair larger; the dark dot with its name when Art has none.
  private makeLair(l: { type: string; tier: number; pos: Vec2; boss: boolean }) {
    const c = this.makeMarker(l.type, l.pos, 44, 0x2b1d33);
    const decal = lairDecal(this, l.boss);
    this.groundUnder(c, decal, l.pos);
    c.setData('decal', decal);
    // The plate is UI: it sits above the guards that stand around the lair, not in its picture.
    const plate = lairPlate(this, l.type).setVisible(false);
    plate.setPosition(l.pos.x, l.pos.y + 46).setDepth(LAIR_UI_DEPTH);
    c.once(Phaser.GameObjects.Events.DESTROY, () => plate.destroy());
    c.setData('plate', plate);
    // A skull on a pike beside the lair and embers rising from it.
    const k = l.boss ? 1.4 : 1;
    const pike = skullPike(this)
      .setPosition(l.pos.x + 78 * k, l.pos.y + 24)
      .setDepth(l.pos.y + 24);
    c.once(Phaser.GameObjects.Events.DESTROY, () => pike.destroy());
    this.lairFx.add(c, l.pos.x, l.pos.y - 8, 150 * k);
    this.refreshLair(c, l.type, l.tier, l.boss);
    return c;
  }

  // The lair tier in code (monsters-and-bosses.md section 4): the corrupted ground grows, the plate
  // takes the tier colour, and a tier 3 plate pulses slowly (heroes can die here).
  private styleLairTier(view: Phaser.GameObjects.Container, tier: number): void {
    (view.getData('decal') as Phaser.GameObjects.Image | undefined)?.setScale(
      groundScale(tier) / RENDER_SCALE,
    );
    const plate = view.getData('plate') as Phaser.GameObjects.Container | undefined;
    if (!plate) return;
    const label = plate.list[0] as Phaser.GameObjects.Text;
    label.setBackgroundColor(`${plateColor(tier)}ee`);
    this.tweens.killTweensOf(plate);
    plate.setAlpha(1);
    if (tier >= 3 && !getSettings().reducedMotion)
      this.tweens.add({ targets: plate, alpha: 0.65, duration: 900, yoyo: true, repeat: -1 });
  }

  // Swaps in the picture for the lair's current tier when there is one (a tier-up changes it).
  private refreshLair(
    view: Phaser.GameObjects.GameObject | undefined,
    type: string,
    tier: number,
    boss: boolean,
  ): void {
    if (!(view instanceof Phaser.GameObjects.Container) || view.getData('tier') === tier) return;
    view.setData('tier', tier);
    this.styleLairTier(view, tier);
    const art = lairArtCandidates(type, tier).find((id) => this.textures.exists(id));
    if (!art) return;
    let img = view.getData('img') as Phaser.GameObjects.Image | undefined;
    if (!img) {
      // The first picture replaces the placeholder dot and its name.
      for (const o of [...view.list])
        if (o !== view.getData('bar') && o !== view.getData('plate')) o.destroy();
      img = this.add.image(0, FOOT_Y, art);
      view.add(img);
      view.setData('img', img);
      // With the picture in, the red plate names the lair (the placeholder had its own label).
      (view.getData('plate') as Phaser.GameObjects.Container | undefined)?.setVisible(true);
    } else img.setTexture(art);
    const o = footOrigin(img.width, img.height);
    img.setOrigin(o.x, o.y);
    const k = buildingScale(img.width, img.height) * (boss ? 1.35 : 1);
    img.setScale(k);
    view.setData('top', o.y * img.height * k - FOOT_Y);
    view.setDepth(footprintDepth(view.y, img.width * k));
    // The shadow follows the picture's size (a tier-up or a boss lair is larger).
    const old = view.getData('shadow') as Phaser.GameObjects.Image | undefined;
    old?.destroy();
    const shadow = groundShadow(this, img.width * k, img.height * k);
    shadow.setPosition(view.x, view.y).setDepth(0.6);
    view.once(Phaser.GameObjects.Events.DESTROY, () => shadow.destroy());
    view.setData('shadow', shadow);
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
    // The kit's bounty flag when it is in the manifest (standing on its point), else drawn shapes.
    if (this.textures.exists('ui_icon_bounty')) {
      const flag = this.add.image(0, 0, 'ui_icon_bounty').setOrigin(0.5, 1);
      flag.setScale(iconScale(flag.width, flag.height, 180));
      // A gentle wave about the foot of the pole (not with reduced motion).
      if (!getSettings().reducedMotion) {
        flag.setAngle(-3);
        const wave = this.tweens.add({
          targets: flag,
          angle: 3,
          duration: 1300 + (x % 7) * 40,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        flag.once('destroy', () => wave.stop());
      }
      const label = this.add
        .text(0, 8, `${gold}`, {
          fontFamily: 'Georgia, serif',
          fontSize: '34px',
          color: '#f2c14e',
          stroke: '#000000',
          strokeThickness: 5,
        })
        .setOrigin(0.5, 0);
      return this.add.container(x, y, [flag, label]).setDepth(y);
    }
    const pole = this.add.rectangle(0, -80, 10, 160, 0x4b2e1a);
    const flag = this.add.triangle(34, -136, 0, 0, 0, 56, 72, 28, COLORS.blood);
    const label = this.add
      .text(0, 8, `${gold}`, {
        fontFamily: 'Georgia, serif',
        fontSize: '34px',
        color: '#f2c14e',
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(0.5, 0);
    return this.add.container(x, y, [pole, flag, label]).setDepth(y);
  }
}
