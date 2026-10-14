import Phaser from 'phaser';
import { GRAYBOX } from '../data/graybox';
import { lookOf, type UnitLook } from '../data/looks';
import { bossState } from './bossLook';
import { bakeRings, type RingSpec } from './bake';
import { RENDER_SCALE } from '../config';
import { heroPartsLook } from '../data/heroParts';
import {
  STATUS_LOOK,
  isStatusKind,
  liveStatuses,
  newestRing,
  shapeBox,
  skillAtTier,
  skillTint,
  skillVisuals,
  type StatusKind,
} from './skillLook';
import { SkillFx } from './skillFx';
import { armourOutline, glyphOf, hasGear, potionPips, weaponGlow } from './gearLook';
import { drawGlyph } from './itemGlyph';
import { drawIntentIcon, isIntentKind, type PartyIntent } from './intentIcon';
import { ensureHeroSet, sweepSets, type BakedSet } from './parts/bake';
import { attackFrame, idleFrame, koFrame, walkFrame, type PoseName } from './parts/frames';
import { DEFAULT_TUNING, type RiderId, type SimEvent, type UnitState, type Vec2 } from '../sim/api';
import { ASSETS_KEY, type ManifestAsset } from './assets';
import {
  FALL_S,
  RISE_S,
  STEP_LENGTH,
  attackDuration,
  attackPose,
  hurtFlash,
  idlePose,
  swingStep,
  koPose,
  walkPose,
  resolveStrike,
  windupFor,
  type Pose,
  type Strike,
} from './motionPose';
import { pickVariant, rotateHue, sizeJitter, tierStyle } from './monsterLook';
import { RIDER_LOOK, riderDurationMs } from './riderLook';
import { damageLook, MAX_FLOATS, typeTint, type FloatLook, type HitInfo } from './damageLook';
import { getSettings } from './settings';
import { sackSize, drawCollector } from './taxLook';
import { drawJar } from './ambrosiaLook';
import { heroLabel, partyColor, partyRole, type PartyRole } from './partyLook';
import { SpeechLimit } from './speechLimit';
import { cardColor } from './levelUpLook';
import { summonName } from './summonLook';
import { fxScale, scaledCount } from './style';
import { BARK_META, barkRoll, isSpeechEvent, pickLine, type SpeechKind } from './speechLines';
import { buildHeal, buildStrike, FxLayer, type Vec } from './strikeFx';
import {
  ART_NOMINAL_PX,
  PLACEHOLDER,
  UNIT_HEIGHT,
  artCandidates,
  baseType,
  townLabel,
} from './unitLook';

// Speech bubbles: how long one stays, the most on screen at once, and the quiet time per unit.
// Heroes drawn from parts (src/ui/parts/) instead of a picture; `?noparts` in the URL turns it off.
const USE_PARTS =
  typeof location === 'undefined' || !new URLSearchParams(location.search).has('noparts');
// Painted stills are for portraits and UI: heroes animate with the parts rig (Stefan, 2026-10-14),
// whose pieces will be painted. Flip to let a hero's still beat the parts look.
const ART_BEATS_PARTS = false;
// A standard hero is about this tall in the parts drawing units (head to feet).
const PARTS_HERO_H = 44;
const NO_POSE: Pose = { rot: 0, dx: 0, dy: 0, sx: 1, sy: 1 };

const BUBBLE_MS = 2200;
const HIGH_BUBBLE_MS = 3000;
const HIGH_WAIT_MS = 1500;
// How far ahead of the impact the windup is allowed to start when the sim gives no warning:
// the `hit` event arrives at impact, so the windup is squeezed into this (docs/api: Scene 70).
const DEFAULT_LEAD_S = 0.09;
// The longest frame the motion will simulate, so a stalled tab does not skip whole swings.
// Where a building's shots leave from, above its feet.
const TOWER_MUZZLE_Y = 150;
const MAX_DT_S = 0.05;
// Rendered position follows the sim with this time constant (the sim steps in 50 ms ticks).
const SMOOTH_S = 0.06;

// Each distinct complaint is logged once, however many units hit it.
// Sparkle colours of a tier-up: gold and pale yellow.
const GOLD_SPARKS = [
  [255, 215, 90],
  [255, 245, 180],
] as const;

const warned = new Set<string>();
function warnOnce(message: string): void {
  if (warned.has(message)) return;
  warned.add(message);
  console.warn(`[godblooded] ${message}`);
}

interface Attack {
  strike: Strike;
  t: number;
  windup: number;
  targetId: number;
  damage: number;
  dodged: boolean;
  info?: HitInfo;
  // A heal cast: the amount (null for a strike). It lands as a beam, not a blow.
  heal: number | null;
  // Started by a sim `windup` event: waits for the matching `hit` (which carries the damage) and
  // is cancelled if none comes within the lead time plus CANCEL_GRACE_S.
  awaitingHit: boolean;
  leadS: number;
  backFirst: boolean;
  cross: boolean;
  fired: [boolean, boolean];
}

// What a view needs from the world around it each frame.
interface FrameCtx {
  dtS: number;
  // What each party is doing (its leader's intent), by party id, for the icon over its head.
  intents: ReadonlyMap<number, PartyIntent>;
  // Run time of the snapshot in ms (statuses end at a run time).
  timeMs: number;
  // Hero names show for this party (the selected hero's), or for this one hero when solo.
  namesParty: number;
  namesHero: number;
  fx: FxLayer;
  shake: () => void;
  // The collector's carry cap (the world's tuning), for its sack size.
  carryCap: number;
  // Ambrosia each gatherer carries, by unit id (the jar on its back).
  carry: ReadonlyMap<number, number>;
  // Chest of a unit, building or lair by sim id, if it is on the map.
  chestOf: (id: number) => Vec | undefined;
  // Receives the visual side of a landed strike (flash, knockback, number).
  hurt: (
    targetId: number,
    fromX: number,
    power: number,
    damage: number,
    dodged: boolean,
    info?: HitInfo,
    // The second blow of a double strike: it animates but shows no number of its own.
    silent?: boolean,
    // Effect strength of the attacker (tier, boss): see style.ts.
    fxK?: number,
  ) => void;
  // Receives the visual side of a landed heal (green tint, sparkles, number).
  healed: (targetId: number, amount: number) => void;
}

// One on-screen unit. All motion is the shared system in motionPose.ts and strikeFx.ts: a
// picture that faces right, mirrored by direction, or a placeholder body with the same motion.
// The container sits on the sim position; the `body` inside carries the pose.
export class UnitView {
  readonly container: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Container;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly capsule: Phaser.GameObjects.Ellipse;
  private readonly nose: Phaser.GameObjects.Triangle;
  private sprite: Phaser.GameObjects.Image | null = null;
  private flash: Phaser.GameObjects.Image | null = null;
  private readonly bar: Phaser.GameObjects.Graphics;
  // The ring at the feet: one baked image (bake.ts), swapped when the ring's look changes.
  private readonly ring: Phaser.GameObjects.Container;
  private readonly badge: Phaser.GameObjects.Text;
  private readonly pennant: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private ringKey = '';
  // A hero's name, party number and pennant show only when asked (heroNames or a tap).
  private showNames = true;
  // The tier last seen in the snapshot (a tier 3 monster is a boss-sized threat: its hits shake).
  tierNow = 1;
  private bubble: Phaser.GameObjects.Container | null = null;
  readonly isHero: boolean;
  // On the heroes' side: a hero or a summon (a decoy, falcon or thrall a skill called).
  readonly friendly: boolean;
  readonly look: UnitLook;
  // Monster tier hue shift in degrees (0 for heroes and tier 1) and its stable variant roll.
  private readonly hue: number;
  private readonly unitId: number;
  spoken = 0;
  barkTries = 0;

  // motion state
  private x: number;
  private y: number;
  private face: 1 | -1 = 1;
  private stepT = Math.random();
  private movingFor = 0;
  private phase = Math.random() * 9;
  private attack: Attack | null = null;
  private hit = 0;
  private kb = 0;
  private koK = 0;
  private koDir: 1 | -1 = 1;
  private dying = false;
  private fade = 1;
  // picture geometry, from the current art or the placeholder
  private w = PLACEHOLDER.w;
  private h = PLACEHOLDER.h;
  private ax = 0.5;
  private ay = 1;
  private row: ManifestAsset | undefined;
  private artId = '';
  // The baked parts look this hero is drawn with (null: a picture or the placeholder).
  private partsSet: BakedSet | null = null;
  private partsId = '';
  // Whether this hero has a painted still (checked once per tier/path/god, not every frame).
  private stillKey = '';
  private stillOk = false;
  private attackProgress = -1;
  // Green heal tint, 1 right after a heal and fading to 0.
  private healGlow = 0;
  private glowColor = 0x7dff9a;
  // A boss (from its bossEmerged event): a big hp bar with a gold frame; enraged adds a red pulse.
  boss = false;
  enraged = false;
  // A rider on this unit (burn, chill, ...): tint and head icon until `msLeft` runs out.
  private riders = new Map<RiderId, number>();
  private readonly riderIcon: Phaser.GameObjects.Graphics;
  // Shield, mark, buff, taunt, bind, heal over time: until (run time) and arrival order.
  private statuses = new Map<StatusKind, { until: number; seq: number }>();
  private statusSeq = 0;
  private readonly statusG: Phaser.GameObjects.Graphics;
  private statusDrawn = false;
  private readonly intentG: Phaser.GameObjects.Graphics;
  private sackG: Phaser.GameObjects.Graphics | null = null;
  private jarG: Phaser.GameObjects.Graphics | null = null;
  private jarDrawn = false;
  private collector = false;
  private sackDrawn = -1;
  private intentDrawn = false;
  private hiddenNow = false;
  private stoneNow = false;
  // How many heads a Hydra has now (null: not a Hydra), shown as pips over its bar.
  heads: number | null = null;
  // Carried gear: armour outline, weapon shimmer or glow, flask pips.
  private readonly gearG: Phaser.GameObjects.Graphics;
  private gearDrawn = false;

  constructor(
    private readonly scene: Phaser.Scene,
    u: UnitState,
  ) {
    const look = lookOf(baseType(u.type));
    this.unitId = u.id;
    // Monsters: tier grows the picture 10% and 20% and shifts its hue; every unit gets a tiny
    // stable size jitter so a pack never looks cloned. Heroes stay as they are.
    const tier = u.kind === 'monster' ? tierStyle(u.tier) : { scale: 1, hue: 0 };
    this.hue = tier.hue;
    this.look = {
      ...look,
      color: rotateHue(look.color, tier.hue),
      scale: look.scale * tier.scale * (u.kind === 'monster' ? sizeJitter(u.id) : 1),
    };
    this.isHero = u.kind === 'hero';
    this.friendly = u.kind !== 'monster';
    this.x = u.pos.x;
    this.y = u.pos.y;
    this.face = u.facing.x < 0 ? -1 : 1;
    const w = PLACEHOLDER.w * this.look.scale;
    const h = PLACEHOLDER.h * this.look.scale;
    this.w = w;
    this.h = h;
    // One baked black ellipse (bake.ts) scaled and faded per frame: a Graphics ellipse was
    // re-triangulated 30 times a frame.
    this.shadow = bakeRings(scene, [{ w: 100, h: 50, cx: 38, fill: [0x000000, 1] }]);
    this.capsule = scene.add
      .ellipse(0, -h / 2, w, h, this.look.color)
      .setStrokeStyle(3, 0x000000, 0.6);
    this.nose = scene.add.triangle(w * 0.3, -h * 0.62, 0, -9, 0, 9, 16, 0, 0xffffff, 0.9);
    this.label = scene.add
      .text(
        0,
        -UNIT_HEIGHT * this.look.scale - 6,
        u.kind === 'hero' ? heroLabel(u) : (townLabel(u.kind) ?? summonName(u)),
        {
          fontFamily: 'Georgia, serif',
          fontSize: '16px',
          color: '#f4ead5',
        },
      )
      .setOrigin(0.5, 1);
    this.body = scene.add.container(0, 0, [this.capsule, this.nose]);
    if (u.kind === 'collector') {
      this.collector = true;
      // A hooded figure with a sack on its back in 3 sizes by what it carries (tax-collector.md
      // section 2), instead of the capsule.
      this.capsule.setVisible(false);
      this.nose.setVisible(false);
      this.sackG = scene.add.graphics().setScale(0.78);
      this.body.add(this.sackG);
      this.label.setFontSize(20).setColor('#f2c14e').setStroke('#000000', 4);
      this.drawSackFor(u.gold ?? 0);
    }
    this.bar = scene.add.graphics();
    this.riderIcon = scene.add.graphics();
    this.statusG = scene.add.graphics();
    this.gearG = scene.add.graphics();
    this.intentG = scene.add.graphics();
    // Ring at the feet in the party colour (white and thicker when selected), badge with the
    // party number beside the name.
    this.ring = scene.add.container(0, 0);
    this.pennant = scene.add.graphics();
    this.badge = scene.add
      .text(-this.label.width / 2 - 4, this.label.y, '', {
        fontFamily: 'Georgia, serif',
        fontSize: '18px',
        color: '#1a1410',
        padding: { x: 7, y: 2 },
      })
      .setOrigin(1, 1);
    this.container = scene.add.container(this.x, this.y, [
      this.shadow,
      this.ring,
      this.statusG,
      this.body,
      this.gearG,
      this.bar,
      this.riderIcon,
      this.label,
      this.badge,
      this.pennant,
      this.intentG,
    ]);
  }

  // ---------- geometry ----------

  get height(): number {
    return this.h;
  }

  chest(): Vec {
    return { x: this.x, y: this.y - this.h * 0.55 };
  }

  private weaponWorld(fx: number, fy: number): Vec {
    return { x: this.x + (fx - this.ax) * this.w * this.face, y: this.y + (fy - this.ay) * this.h };
  }

  private strikeKind(): Strike {
    return resolveStrike(this.row?.strike, this.look.strike, warnOnce);
  }

  // ---------- art ----------

  // A hero with a parts row is drawn from baked parts frames; false when it has none.
  private applyParts(u: UnitState): boolean {
    if (!USE_PARTS || u.kind !== 'hero' || !u.god) return this.leaveParts();
    const sk = `${u.god}:${u.path}:${u.tier}`;
    if (sk !== this.stillKey) {
      this.stillKey = sk;
      this.stillOk = artCandidates(u.kind, u.type, u.tier, u.path, u.god).some((c) =>
        this.scene.textures.exists(c),
      );
    }
    if (ART_BEATS_PARTS && this.stillOk) return this.leaveParts();
    const look = heroPartsLook(u.god, u.path, u.tier);
    if (!look) return this.leaveParts();
    const id = look.id;
    if (id === this.partsId) return true;
    const set = ensureHeroSet(this.scene, id, look.def, u.tier);
    const first = set.frames.idle[0];
    this.partsSet = set;
    this.partsId = id;
    this.artId = '';
    if (!this.sprite) {
      this.sprite = this.scene.add.image(0, 0, set.atlas, first);
      this.flash = this.scene.add.image(0, 0, set.atlas, first).setVisible(false);
      this.body.addAt(this.sprite, 0);
      this.body.add(this.flash);
    }
    // World units per baked pixel: the hero's height over its drawing height, over the bake scale.
    const scale = (UNIT_HEIGHT * this.look.scale) / PARTS_HERO_H / set.pxPerUnit;
    for (const img of [this.sprite, this.flash]) {
      img
        ?.setTexture(set.atlas, first)
        .setOrigin(set.originX, set.originY)
        .setScale(scale)
        .clearTint();
    }
    this.ax = set.originX;
    this.ay = set.originY;
    this.row = undefined;
    this.w = (UNIT_HEIGHT * this.look.scale * 22) / PARTS_HERO_H;
    this.h = UNIT_HEIGHT * this.look.scale;
    this.capsule.setVisible(false);
    this.nose.setVisible(false);
    return true;
  }

  private leaveParts(): boolean {
    if (this.partsSet) {
      this.partsSet = null;
      this.partsId = '';
      // Drop the parts sprites: applyArt makes a fresh one (with its tier colour) for a picture,
      // or the placeholder shape comes back.
      this.sprite?.destroy();
      this.flash?.destroy();
      this.sprite = this.flash = null;
      this.artId = '';
      this.row = undefined;
      this.ax = 0.5;
      this.ay = 1;
      this.w = PLACEHOLDER.w * this.look.scale;
      this.h = PLACEHOLDER.h * this.look.scale;
      this.capsule.setVisible(true);
      this.nose.setVisible(true);
    }
    return false;
  }

  // The parts look this hero is drawn with ('' for a picture or the placeholder).
  get partsLookId(): string {
    return this.partsId;
  }

  // Swaps in the picture for this unit when the manifest has it; else the placeholder stays.
  private applyArt(u: UnitState): void {
    const type =
      u.kind === 'monster'
        ? pickVariant(u.type, this.unitId, (t) =>
            artCandidates(u.kind, t, u.tier).some((c) => this.scene.textures.exists(c)),
          )
        : u.kind === 'summon'
          ? (u.summon?.def ?? u.type)
          : u.type;
    const id =
      artCandidates(u.kind, type, u.tier, u.path, u.god).find((c) =>
        this.scene.textures.exists(c),
      ) ?? '';
    if (id === '') {
      if (this.artId !== '') {
        this.sprite?.destroy();
        this.flash?.destroy();
        this.sprite = this.flash = null;
        this.artId = '';
        this.row = undefined;
        this.w = PLACEHOLDER.w * this.look.scale;
        this.h = PLACEHOLDER.h * this.look.scale;
        this.ax = 0.5;
        this.ay = 1;
        this.capsule.setVisible(true);
        this.nose.setVisible(true);
      }
      return;
    }
    if (id === this.artId) return;
    this.artId = id;
    const rows = this.scene.registry.get(ASSETS_KEY) as Map<string, ManifestAsset> | undefined;
    this.row = rows?.get(id);
    this.ax = this.row?.anchorX ?? 0.5;
    this.ay = this.row?.anchorY ?? 1;
    const scale = (UNIT_HEIGHT * this.look.scale) / ART_NOMINAL_PX;
    if (!this.sprite) {
      this.sprite = this.scene.add.image(0, 0, id);
      this.flash = this.scene.add.image(0, 0, id).setVisible(false);
      // Tier colour: a hue rotation in the sprite's own pipeline (WebGL; the canvas renderer has
      // no preFX and keeps the base colours).
      if (this.hue !== 0) this.sprite.preFX?.addColorMatrix().hue(this.hue);
      // Monsters are a touch darker than heroes so the two read apart at a glance.
      if (!this.friendly) this.sprite.setTint(0xcdbfbf);
      this.body.addAt(this.sprite, 0);
      this.body.add(this.flash);
    }
    for (const img of [this.sprite, this.flash]) {
      img?.setTexture(id).setOrigin(this.ax, this.ay).setScale(scale);
    }
    const frame = this.scene.textures.get(id).getSourceImage();
    this.w = frame.width * scale;
    this.h = frame.height * scale;
    this.capsule.setVisible(false);
    this.nose.setVisible(false);
  }

  // ---------- events from the sim ----------

  // A sim `windup`: the attacker committed to a swing that lands `leadS` from now. The full
  // windup plays; the strike fires when the matching `hit` arrives.
  beginWindup(targetId: number, leadS: number): void {
    this.startAttack(targetId, 0, false, leadS, true);
  }

  // A `hit` from the sim. With a windup under way for this target it supplies the damage;
  // otherwise (older sim, no windup event) the swing is played now with the windup squeezed to
  // what fits before the impact.
  landHit(targetId: number, damage: number, dodged: boolean, info?: HitInfo): void {
    const a = this.attack;
    if (a?.awaitingHit && a.targetId === targetId) {
      a.awaitingHit = false;
      a.damage = damage;
      a.dodged = dodged;
      a.info = info;
      return;
    }
    this.startAttack(targetId, damage, dodged, null, false, info);
  }

  // A `heal` from the sim: the cast lands now. A windup under way for this target is released;
  // otherwise the cast plays with the windup squeezed in.
  landHeal(targetId: number, amount: number): void {
    const a = this.attack;
    if (a?.awaitingHit && a.targetId === targetId) {
      a.awaitingHit = false;
      a.heal = amount;
      return;
    }
    this.startAttack(targetId, 0, false, null, false);
    if (this.attack) (this.attack as Attack).heal = amount;
  }

  private startAttack(
    targetId: number,
    damage: number,
    dodged: boolean,
    leadS: number | null,
    awaitingHit: boolean,
    info?: HitInfo,
  ): void {
    if (this.koK > 0 || this.dying) return;
    const strike = this.strikeKind();
    this.attack = {
      strike,
      t: 0,
      windup: windupFor(strike, leadS ?? DEFAULT_LEAD_S),
      targetId,
      damage,
      dodged,
      info,
      heal: null,
      awaitingHit,
      leadS: leadS ?? DEFAULT_LEAD_S,
      backFirst: Math.random() < 0.5,
      cross: Math.random() < 0.4,
      fired: [false, false],
    };
  }

  // The visual side of being hit: flash, knockback, sparks. The sim already took the hp.
  receiveHit(fromX: number, power: number, dodged: boolean, fx: FxLayer, fxK = 1): void {
    // knocked away from the blow; with no known attacker, backwards
    const dir: 1 | -1 = Number.isNaN(fromX) ? (this.face === 1 ? -1 : 1) : this.x < fromX ? -1 : 1;
    this.koDir = dir;
    if (dodged) {
      this.kb = dir * this.h * 0.06;
      return;
    }
    this.hit = 1;
    this.kb = dir * this.h * 0.12 * power;
    const c = this.chest();
    fx.sparks(c.x, c.y, [255, 225, 160], scaledCount(7, fxK));
    if (fxK >= 0.8) fx.blood(c.x, c.y, dir);
  }

  // The visual side of being healed: a brief green tint and sparkles. The sim already added hp.
  receiveHeal(fx: FxLayer): void {
    this.healGlow = 1;
    this.glowColor = 0x7dff9a;
    const c = this.chest();
    fx.sparkle(c.x, c.y, 10);
  }

  // A rider took hold: tint and icon for as long as it lasts (a newer one replaces the older).
  setRider(id: RiderId): void {
    this.riders.set(id, riderDurationMs(id));
  }

  // The rider shown: the one with the most time left, so a brief arc never hides a lasting burn.
  private topRider(): { id: RiderId; msLeft: number } | null {
    let best: { id: RiderId; msLeft: number } | null = null;
    for (const [id, msLeft] of this.riders)
      if (!best || msLeft > best.msLeft) best = { id, msLeft };
    return best;
  }

  // Armour as an outline round the body, the weapon level as a shimmer or glow at the weapon
  // point, one pip per potion over the health bar. Nothing is drawn for a bare hero.
  private drawGear(u: UnitState, timeMs: number): void {
    const items = u.kind === 'hero' ? u.items : undefined;
    const g = this.gearG;
    if (!hasGear(items) || !items) {
      if (this.gearDrawn) g.clear();
      this.gearDrawn = false;
      return;
    }
    this.gearDrawn = true;
    g.clear();
    const t = timeMs / 1000;
    const outline = armourOutline(items.armour);
    if (outline !== null)
      g.lineStyle(2, outline, 0.75).strokeEllipse(0, -this.h * 0.48, this.w * 1.05, this.h * 0.95);
    const wg = weaponGlow(items.weapon, heroDamageType(u));
    if (wg.kind !== 'none') {
      const lx = ((this.row?.weaponX ?? PLACEHOLDER.weaponX) - this.ax) * this.w * this.face;
      const ly = ((this.row?.weaponY ?? PLACEHOLDER.weaponY) - this.ay) * this.h;
      const pulse = 0.65 + 0.35 * Math.sin(t * 6 + u.id);
      if (wg.kind === 'glow') {
        g.fillStyle(wg.color, 0.18 * pulse).fillCircle(lx, ly, 17);
        g.fillStyle(wg.color, 0.4 * pulse).fillCircle(lx, ly, 9);
        g.fillStyle(0xffffff, 0.7 * pulse).fillCircle(lx, ly, 3);
      } else {
        g.fillStyle(wg.color, 0.8 * pulse);
        g.fillTriangle(lx, ly - 8, lx - 2, ly, lx + 2, ly);
        g.fillTriangle(lx, ly + 8, lx - 2, ly, lx + 2, ly);
        g.fillTriangle(lx - 8, ly, lx, ly - 2, lx, ly + 2);
        g.fillTriangle(lx + 8, ly, lx, ly - 2, lx, ly + 2);
      }
    }
    const pips = potionPips(items);
    for (let i = 0; i < pips; i++) {
      const x = (i - (pips - 1) / 2) * 9;
      const y = -this.h - 34;
      g.fillStyle(0x1a1410, 0.8).fillCircle(x, y, 4.5);
      g.fillStyle(0xcf4f6f, 1).fillCircle(x, y, 3);
    }
  }

  // The gatherer's jar on its back while it carries Ambrosia.
  private drawJarFor(carrying: boolean): void {
    if (!this.jarG) {
      this.jarG = this.scene.add.graphics();
      this.body.add(this.jarG);
    }
    if (carrying === this.jarDrawn) return;
    this.jarDrawn = carrying;
    this.jarG.clear();
    if (carrying) drawJar(this.jarG, -this.w * 0.55, -this.h * 0.55, 1.2);
  }

  private drawSackFor(carried: number, cap = DEFAULT_TUNING.collector.carryCap): void {
    if (!this.sackG) return;
    const size = sackSize(carried, cap);
    if (size === this.sackDrawn) return;
    this.sackDrawn = size;
    drawCollector(this.sackG, size);
  }

  // A short sign over the head for a moment: a "?" or "!" a boss move puts on its target.
  cue(text: string, color: string, ms: number): void {
    const t = this.scene.add
      .text(0, -this.h - 58, text, {
        fontFamily: 'Georgia, serif',
        fontSize: '40px',
        color,
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    this.container.add(t);
    this.scene.tweens.add({
      targets: t,
      y: t.y - 12,
      alpha: { from: 1, to: 0.15 },
      delay: ms * 0.6,
      duration: ms * 0.4 + 200,
      onComplete: () => t.destroy(),
    });
  }

  setStatus(kind: StatusKind, until: number): void {
    this.statuses.set(kind, { until, seq: this.statusSeq++ });
  }

  // Shield bubble over the unit, mark and bind signs over its head, one ring under its feet (the
  // newest buff or heal over time). Drawn only while something runs.
  private drawStatus(timeMs: number): void {
    const live = liveStatuses(this.statuses, timeMs);
    // A swallowed hero is out of sight until it ends; stone greys the picture.
    const hidden = live.includes('swallowed');
    if (hidden !== this.hiddenNow) {
      this.hiddenNow = hidden;
      this.container.setVisible(!hidden);
    }
    const stone = live.includes('stone');
    if (stone !== this.stoneNow) {
      this.stoneNow = stone;
      for (const img of [this.sprite, this.flash]) {
        if (!img) continue;
        if (stone) img.setTint(0x9a9a9a);
        else img.clearTint();
      }
    }
    if (live.length === 0) {
      if (this.statusDrawn) this.statusG.clear();
      this.statusDrawn = false;
      return;
    }
    this.statusDrawn = true;
    const g = this.statusG;
    g.clear();
    const t = timeMs / 1000;
    const ring = newestRing(this.statuses, live);
    if (ring) {
      const c = STATUS_LOOK[ring].color;
      const pulse = 1 + Math.sin(t * 5) * 0.06;
      g.lineStyle(3, c, 0.8).strokeEllipse(0, -2, 64 * pulse, 24 * pulse);
      g.fillStyle(c, 0.12).fillEllipse(0, -2, 64 * pulse, 24 * pulse);
    }
    let signs = 0;
    for (const k of live) {
      const look = STATUS_LOOK[k];
      if (look.style === 'bubble') {
        const r = this.h * 0.62;
        g.fillStyle(look.color, 0.14).fillEllipse(0, -this.h * 0.5, r * 1.5, r * 2);
        g.lineStyle(2.5, look.color, 0.75 + Math.sin(t * 6) * 0.15).strokeEllipse(
          0,
          -this.h * 0.5,
          r * 1.5,
          r * 2,
        );
      } else if (look.style === 'sign') {
        const x =
          (signs++ - (live.filter((l) => STATUS_LOOK[l].style === 'sign').length - 1) / 2) * 24;
        const y = -this.h - 52 + Math.sin(t * 4 + signs) * 3;
        g.fillStyle(0x1a1410, 0.8).fillCircle(x, y, 11);
        g.lineStyle(2, look.color, 1).strokeCircle(x, y, 11);
        g.fillStyle(look.color, 1);
        if (k === 'mark') g.fillTriangle(x - 5, y - 4, x + 5, y - 4, x, y + 5);
        else if (k === 'taunt' || k === 'fear')
          g.fillRect(x - 1.5, y - 6, 3, 8).fillCircle(x, y + 6, 1.8);
        else if (k === 'poison') {
          // A drop.
          g.fillTriangle(x, y - 7, x - 4, y + 1, x + 4, y + 1).fillCircle(x, y + 2, 4);
        } else g.fillRect(x - 6, y - 1.5, 12, 3).fillRect(x - 1.5, y - 6, 3, 12);
      }
    }
  }

  private drawRider(dtS: number): void {
    this.riderIcon.clear();
    for (const [id, ms] of this.riders) {
      if (ms - dtS * 1000 <= 0) this.riders.delete(id);
      else this.riders.set(id, ms - dtS * 1000);
    }
    const r = this.topRider();
    if (!r) return;
    const look = RIDER_LOOK[r.id];
    // Blink in the last second so the player sees it ending.
    if (r.msLeft < 1000 && Math.floor(r.msLeft / 120) % 2 === 0) return;
    const x = 0;
    const y = -this.h - 48;
    const g = this.riderIcon;
    g.lineStyle(3, look.icon, 1).fillStyle(look.icon, 1);
    switch (look.shape) {
      case 'flame':
        g.fillTriangle(x - 8, y + 8, x + 8, y + 8, x, y - 12).fillCircle(x, y + 6, 8);
        g.fillStyle(0xffe08a, 1).fillCircle(x, y + 7, 4);
        break;
      case 'snowflake':
        for (let a = 0; a < 3; a++) {
          const t = (a * Math.PI) / 3;
          g.lineBetween(
            x - Math.cos(t) * 10,
            y - Math.sin(t) * 10,
            x + Math.cos(t) * 10,
            y + Math.sin(t) * 10,
          );
        }
        break;
      case 'spark':
        g.beginPath()
          .moveTo(x - 4, y - 12)
          .lineTo(x + 4, y - 2)
          .lineTo(x - 3, y)
          .lineTo(x + 5, y + 12)
          .strokePath();
        break;
      case 'skull':
        g.fillCircle(x, y - 2, 9).fillRect(x - 5, y + 4, 10, 7);
        g.fillStyle(0x2a1a3a, 1)
          .fillCircle(x - 3.5, y - 2, 2.4)
          .fillCircle(x + 3.5, y - 2, 2.4);
        break;
      case 'sun':
        g.fillCircle(x, y, 6);
        for (let a = 0; a < 8; a++) {
          const t = (a * Math.PI) / 4;
          g.lineBetween(
            x + Math.cos(t) * 9,
            y + Math.sin(t) * 9,
            x + Math.cos(t) * 13,
            y + Math.sin(t) * 13,
          );
        }
        break;
    }
  }

  // A tier-up (decisions 2026-10-05): a gold flash, a ring on the ground, rising gold sparks and
  // the new identity said aloud.
  evolve(fx: FxLayer, name: string): void {
    this.healGlow = 1.6;
    this.glowColor = 0xffd75a;
    const c = this.chest();
    fx.sparkle(c.x, c.y, 24, GOLD_SPARKS);
    fx.add([{ type: 'ring', x: this.x, y: this.y, r: 90, age: 0, life: 0.7 }]);
    this.say(name);
  }

  // A coloured glow over the picture for a moment (level-up and card effects).
  glow(color: number, strength: number): void {
    this.healGlow = strength;
    this.glowColor = color;
  }

  // The unit left the snapshot (died or was removed): fall over and fade out.
  die(): void {
    this.dying = true;
    this.attack = null;
  }

  get gone(): boolean {
    return this.dying && this.fade <= 0;
  }

  // ---------- per frame ----------

  update(u: UnitState, ctx: FrameCtx, role: PartyRole = 'solo'): void {
    this.tierNow = u.tier;
    if (u.kind === 'collector') this.drawSackFor(u.gold ?? 0, ctx.carryCap);
    if (u.kind === 'worker') this.drawJarFor((ctx.carry.get(u.id) ?? 0) > 0);
    if (!this.applyParts(u)) this.applyArt(u);
    if (u.kind === 'hero') {
      this.label.setText(heroLabel(u));
      // The path name can be wider than "<God>-born": keep the party badge beside the label.
      this.badge.setX(-this.label.width / 2 - 4);
    }
    if (u.ko) this.riders.clear();
    this.tick(u.pos, u.facing.x, u.ko, ctx);
    this.drawBar(u);
    this.drawRider(ctx.dtS);
    this.drawStatus(ctx.timeMs);
    this.drawGear(u, ctx.timeMs);
    this.showNames =
      u.kind !== 'hero' ||
      getSettings().heroNames ||
      u.id === ctx.namesHero ||
      (u.party > 0 && u.party === ctx.namesParty);
    this.drawParty(u, role);
    this.drawPennant(u, role);
    this.drawIntent(u, ctx, role);
  }

  // A unit that left the snapshot: it stays where it fell and keeps going down and fading.
  updateDying(ctx: FrameCtx): void {
    this.tick({ x: this.x, y: this.y }, 0, true, ctx);
    this.bar.clear();
    this.riders.clear();
    this.riderIcon.clear();
  }

  // Movement and pose for one frame. `to` is where the sim says the unit is.
  private tick(to: Vec2, facingX: number, ko: boolean, ctx: FrameCtx): void {
    const s = ctx.dtS;
    this.phase += s;
    // follow the sim position smoothly; snap on a teleport (revive, spawn)
    const far = Math.hypot(to.x - this.x, to.y - this.y) > 300;
    const k = far ? 1 : 1 - Math.exp(-s / SMOOTH_S);
    const ox = this.x;
    const oy = this.y;
    this.x += (to.x - this.x) * k;
    this.y += (to.y - this.y) * k;
    const step = far ? 0 : Math.hypot(this.x - ox, this.y - oy);
    if (step > 0.15) this.movingFor = 0.12;
    else this.movingFor = Math.max(0, this.movingFor - s);
    const moving = this.movingFor > 0;
    if (Math.abs(facingX) > 0.25) this.face = facingX < 0 ? -1 : 1;
    if (this.hit > 0) this.hit = Math.max(0, this.hit - s * 3);
    if (this.healGlow > 0) this.healGlow = Math.max(0, this.healGlow - s * 2.2);
    this.kb *= Math.pow(0.0005, s);

    // knocked-out fall and get-up
    const down = ko || this.dying;
    this.koK = down ? Math.min(1, this.koK + s / FALL_S) : Math.max(0, this.koK - s / RISE_S);
    if (this.dying && this.koK >= 1) this.fade = Math.max(0, this.fade - s / 0.6);

    let pose: Pose;
    let alpha = 1;
    let frame: { pose: PoseName; i: number } = { pose: 'idle', i: idleFrame(this.phase) };
    this.attackProgress = -1;
    if (this.koK > 0) {
      const ko = koPose(this.koK, this.koDir);
      pose = ko.pose;
      alpha = ko.alpha;
      frame = { pose: 'ko', i: koFrame(this.koK) };
      this.attack = null;
    } else if (this.attack) {
      pose = this.runAttack(ctx);
      if (this.attack) {
        const a = this.attack;
        this.attackProgress = a.t / attackDuration(a.strike, a.windup);
        frame = { pose: 'attack', i: attackFrame(this.attackProgress) };
      }
    } else if (moving) {
      const before = Math.floor(this.stepT);
      this.stepT += step / (this.h * STEP_LENGTH);
      if (Math.floor(this.stepT) !== before) this.stepDust(ctx);
      pose = walkPose(this.stepT, this.h, this.face);
      frame = { pose: 'walk', i: walkFrame(this.stepT) };
    } else {
      pose = idlePose(this.phase);
    }
    if (this.partsSet) {
      // The baked frame carries the pose (stride, swing, fall): the body stays upright.
      const name = this.partsSet.frames[frame.pose][frame.i];
      if (name && this.sprite?.frame.name !== name) {
        this.sprite?.setTexture(this.partsSet.atlas, name);
        this.flash?.setTexture(this.partsSet.atlas, name);
      }
      pose = NO_POSE;
    }
    this.applyPose(pose, alpha * this.fade);
    // The tax collector is drawn over the buildings it walks behind: it must always be findable.
    this.container.setPosition(this.x, this.y).setDepth(this.collector ? 900_000 + this.y : this.y);
  }

  // Distance from the feet anchor to either foot: it grows with the unit's footprint.
  private footOffset(): number {
    return UNIT_HEIGHT * this.look.footprint * 0.45;
  }

  // Walk dust comes from the foot that just landed: one or two small puffs, the side
  // alternating with the step (the same parity as the step tilt).
  private stepDust(ctx: FrameCtx): void {
    // Small monsters wander around their lair all day: their step puffs piled up into grey balls
    // beside it. Only heroes and tier 3 brutes raise dust.
    if (!this.isHero && this.tierNow < 3) return;
    const side = Math.floor(this.stepT) % 2 ? 1 : -1;
    const k = 0.4 * this.look.scale;
    ctx.fx.dust(this.x + side * this.footOffset(), this.y, k);
    if (Math.random() < 0.5)
      ctx.fx.dust(
        this.x + side * this.footOffset() * (0.6 + Math.random() * 0.4),
        this.y + 3,
        k * 0.7,
      );
  }

  private runAttack(ctx: FrameCtx): Pose {
    const a = this.attack as Attack;
    a.t += ctx.dtS;
    const target = ctx.chestOf(a.targetId);
    if (target && Math.abs(target.x - this.x) > 2) this.face = target.x < this.x ? -1 : 1;
    const step = swingStep(a);
    // Cancelled in the sim (target died or moved, attacker knocked out): no hit is coming, so
    // drop the swing and let the pose recover.
    if (step.cancel) {
      this.attack = null;
      return idlePose(this.phase);
    }
    for (const n of step.fire) {
      a.fired[n] = true;
      this.fire(a, n, target ?? null, ctx);
    }
    if (a.t > attackDuration(a.strike, a.windup)) {
      this.attack = null;
      return idlePose(this.phase);
    }
    return attackPose(a.strike, a.t, this.h, a.windup);
  }

  // The impact: the strike effect from the weapon, then the target's reaction.
  private fire(a: Attack, n: 0 | 1, target: Vec | null, ctx: FrameCtx): void {
    const wx = this.row?.weaponX ?? PLACEHOLDER.weaponX;
    const wy = this.row?.weaponY ?? PLACEHOLDER.weaponY;
    const weapon = this.weaponWorld(wx, wy);
    const weapon2 =
      this.row?.weapon2X !== undefined && this.row.weapon2Y !== undefined
        ? this.weaponWorld(this.row.weapon2X, this.row.weapon2Y)
        : undefined;
    if (a.heal !== null) {
      ctx.fx.add(buildHeal(weapon, target, this.face));
      ctx.healed(a.targetId, a.heal);
      return;
    }
    const r = buildStrike({
      strike: a.strike,
      x: this.x,
      y: this.y,
      face: this.face,
      h: this.h,
      weapon,
      weapon2,
      target,
      n,
      backFirst: a.backFirst,
      cross: a.cross,
      reach: UNIT_HEIGHT * (this.look.footprint + 0.25),
      foot: this.footOffset(),
      tint: typeTint(a.info?.type) ?? undefined,
    });
    ctx.fx.add(r.effects);
    if (r.smash) {
      for (let i = 0; i < 6; i++)
        ctx.fx.dust(r.smash.x + (Math.random() - 0.5) * this.h * 0.4, r.smash.y, 0.9);
      ctx.shake();
    }
    const heavy = a.strike === 'smash' || a.strike === 'stomp';
    ctx.hurt(
      a.targetId,
      this.x,
      heavy ? 2 : 1,
      n === 0 ? a.damage : 0,
      a.dodged,
      a.info,
      n !== 0,
      fxScale(this.tierNow, this.boss),
    );
  }

  private applyPose(p: Pose, alpha: number): void {
    const bx =
      p.dx * this.face + this.kb + (this.hit > 0 ? Math.sin(this.hit * 50) * 3 * this.hit : 0);
    this.body.setPosition(bx, p.dy);
    this.body.setRotation(p.rot * this.face);
    this.body.setScale(p.sx * this.face, p.sy);
    this.container.setAlpha(alpha);
    // shadow: shrinks and fades while the unit hops
    const lift = Math.max(0, -p.dy) / this.h;
    const fall = this.koK > 0 ? this.koDir * this.h * 0.3 * Math.min(1, this.koK) : 0;
    const rx = UNIT_HEIGHT * this.look.footprint * 0.85 * (1 - lift);
    this.shadow
      .setPosition(fall, 0)
      .setScale(
        (rx * 2 * 1.45) / 100 / RENDER_SCALE,
        (UNIT_HEIGHT * this.look.footprint * 0.48) / 50 / RENDER_SCALE,
      )
      .setAlpha(Math.max(0, 0.32 - lift));
    // hurt flash: white, then red, on the picture (or the placeholder body)
    const f =
      hurtFlash(this.hit) ??
      (this.healGlow > 0
        ? { color: this.glowColor, alpha: Math.min(0.7, 0.5 * this.healGlow) }
        : this.riders.size > 0
          ? { color: RIDER_LOOK[this.topRider()!.id].tint, alpha: 0.26 }
          : this.enraged
            ? { color: 0xff2a2a, alpha: 0.16 + 0.1 * Math.sin(this.phase * 6) }
            : null);
    if (this.flash) {
      this.flash.setVisible(f !== null);
      if (f) this.flash.setTintFill(f.color).setAlpha(f.alpha);
    } else {
      this.capsule.setFillStyle(f ? f.color : this.look.color, f ? Math.max(0.6, f.alpha) : 1);
    }
  }

  // ---------- overlays ----------

  // Party colour under the feet: a tinted ring for every member of a party of two or more, with
  // the party number beside the name. A solo hero has no party colour (only the white ring
  // when selected).
  private drawParty(u: UnitState, role: PartyRole): void {
    const selected = this.scene.registry.get('selectedUnit') === u.id;
    const key = `${role}:${u.party}:${selected}:${getSettings().palette}:${u.kind}:${u.tier}:${this.boss}:${u.elite === true}:${this.showNames}`;
    if (key === this.ringKey) return;
    this.ringKey = key;
    const rings: RingSpec[] = [];
    const setRing = () => {
      this.ring.removeAll(true);
      this.ring.add(bakeRings(this.scene, rings).setPosition(0, -4));
    };
    if (u.kind === 'monster') {
      // A red ring on the ground, wider for tier 2 and tier 3, widest for a boss. The name only
      // shows when the monster is selected (a boss keeps it).
      const base = Math.max(54, UNIT_HEIGHT * this.look.footprint * 1.1);
      const k = this.boss ? 1.9 : 1 + 0.18 * (u.tier - 1);
      const rw = base * k;
      const rh = rw * 0.38;
      rings.push({ w: rw, h: rh, fill: [0xc4281e, this.boss ? 0.3 : 0.2] });
      rings.push({ w: rw, h: rh, line: [this.boss ? 6 : 4, 0xe04a3a, 0.95] });
      // An elite (a stronger spawn, double reward) wears a gold edge round the red ring.
      if (u.elite === true) rings.push({ w: rw + 8, h: rh + 5, line: [3, 0xf2c14e, 1] });
      if (selected) rings.push({ w: rw + 14, h: rh + 8, line: [3, 0xffffff, 0.95] });
      this.label.setVisible(selected || this.boss);
      this.badge.setVisible(false);
      setRing();
      return;
    }
    if (u.kind === 'collector') {
      // A gold-ringed base disc, so it never reads as a hero, and its name always shown.
      rings.push({ w: 78, h: 30, fill: [0x24140a, 0.45] });
      rings.push({ w: 78, h: 30, line: [4, 0xf2c14e, 0.95] });
      if (selected) rings.push({ w: 94, h: 38, line: [3, 0xffffff, 0.95] });
      this.badge.setVisible(false);
      this.label.setVisible(true);
      setRing();
      return;
    }
    if (townLabel(u.kind)) {
      // A gatherer or a guard (M3): a small neutral ring, its name, no party badge.
      rings.push({ w: 60, h: 23, fill: [0x24140a, 0.35] });
      rings.push({ w: 60, h: 23, line: [3, 0xd9c9a8, 0.95] });
      if (selected) rings.push({ w: 74, h: 30, line: [3, 0xffffff, 0.95] });
      this.badge.setVisible(false);
      this.label.setVisible(true);
      setRing();
      return;
    }
    if (u.kind === 'summon') {
      // A summon fights for the party: a small friendly teal ring, its name, no party badge.
      rings.push({ w: 56, h: 21, fill: [0x7fe0b0, 0.2] });
      rings.push({ w: 56, h: 21, line: [3, 0x7fe0b0, 0.95] });
      if (selected) rings.push({ w: 70, h: 28, line: [3, 0xffffff, 0.95] });
      this.badge.setVisible(false);
      this.label.setVisible(true);
      setRing();
      return;
    }
    const inParty = role !== 'solo';
    this.label.setVisible(this.showNames);
    this.badge.setVisible(inParty && this.showNames);
    if (inParty) {
      const c = partyColor(u.party);
      this.badge.setText(`${u.party}`).setBackgroundColor(`#${c.toString(16).padStart(6, '0')}`);
      rings.push({ w: 74, h: 28, fill: [c, 0.22] });
      rings.push({ w: 74, h: 28, line: [5, c, 0.98] });
    } else {
      // A hero on their own: a thin pale ring, so every hero stands on one.
      rings.push({ w: 66, h: 24, line: [3, 0xcfe4ff, 0.8] });
    }
    if (selected) rings.push({ w: 86, h: 34, line: [3, 0xffffff, 0.95] });
    setRing();
  }

  // The party's intent over its leader's head (a party of one counts: its hero leads it).
  private drawIntent(u: UnitState, ctx: FrameCtx, role: PartyRole): void {
    const g = this.intentG;
    const intent =
      u.kind === 'hero' && u.party > 0 && role !== 'member' && !u.ko
        ? ctx.intents.get(u.party)
        : undefined;
    if (!intent || !isIntentKind(intent.kind)) {
      if (this.intentDrawn) g.clear();
      this.intentDrawn = false;
      return;
    }
    this.intentDrawn = true;
    g.clear();
    drawIntentIcon(g, intent.kind, 0, -this.h - 40 + Math.sin(this.phase * 3) * 1.5, this.phase);
  }

  private drawPennant(u: UnitState, role: PartyRole): void {
    this.pennant.clear();
    if (role !== 'leader' || !this.showNames) return;
    const c = partyColor(u.party);
    const x = this.label.width / 2 + 12;
    const base = this.label.y;
    const top = base - 34;
    const wave = Math.sin(this.phase * 7) * 2.5;
    this.pennant.lineStyle(3, 0x1a1410, 0.9).lineBetween(x, base, x, top);
    this.pennant.fillStyle(c, 1).fillTriangle(x, top, x + 24, top + 8 + wave, x, top + 17);
    this.pennant
      .lineStyle(2, 0x1a1410, 0.8)
      .strokeTriangle(x, top, x + 24, top + 8 + wave, x, top + 17);
  }

  private drawBar(u: UnitState): void {
    this.bar.clear();
    if (this.boss) {
      // A boss always shows a big bar with a gold frame; it turns deep red once enraged.
      const w = 150;
      const y = -this.h - 34;
      this.bar.fillStyle(0x000000, 0.7).fillRect(-w / 2 - 3, y - 3, w + 6, 18);
      this.bar
        .fillStyle(this.enraged ? 0xc41e1e : 0xcf4f4f, 1)
        .fillRect(-w / 2, y, (w * Math.max(0, u.hp)) / u.maxHp, 12);
      this.bar.lineStyle(2, 0xf2c14e, 0.9).strokeRect(-w / 2 - 3, y - 3, w + 6, 18);
      // The Hydra's heads: a pip each (the empty ones are cut and regrowing).
      if (this.heads !== null)
        for (let i = 0; i < 3; i++) {
          const px = (i - 1) * 22;
          this.bar.fillStyle(0x1a1410, 0.85).fillCircle(px, y - 16, 8);
          if (i < this.heads) this.bar.fillStyle(0x7fd45a, 1).fillCircle(px, y - 16, 5.5);
          else this.bar.lineStyle(2, 0x7a7a7a, 0.9).strokeCircle(px, y - 16, 5.5);
        }
      return;
    }
    if (u.hp >= u.maxHp && u.elite !== true) return;
    const w = 56;
    const y = -this.h - 22;
    this.bar.fillStyle(0x000000, 0.6).fillRect(-w / 2, y, w, 8);
    this.bar
      .fillStyle(u.kind !== 'monster' ? 0x6fcf6f : 0xcf4f4f, 1)
      .fillRect(-w / 2, y, (w * Math.max(0, u.hp)) / u.maxHp, 8);
    if (u.elite === true)
      this.bar.lineStyle(2, 0xf2c14e, 0.95).strokeRect(-w / 2 - 1, y - 1, w + 2, 10);
  }

  get hasBubble(): boolean {
    return this.bubble !== null;
  }

  // One bubble per unit: a new line replaces the old one. It lives on the unit's container,
  // so it follows the unit and fades with it.
  say(text: string, ms = BUBBLE_MS): void {
    this.bubble?.destroy();
    const label = this.scene.add
      .text(0, 0, text, { fontFamily: 'Georgia, serif', fontSize: '22px', color: '#1a1410' })
      .setOrigin(0.5);
    const w = label.width + 24;
    const h = label.height + 14;
    const bg = this.scene.add.graphics();
    bg.fillStyle(0xfff6dc, 0.95).fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    bg.fillTriangle(-8, h / 2 - 1, 8, h / 2 - 1, 0, h / 2 + 12);
    bg.lineStyle(2, 0x1a1410, 0.7).strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
    const bubble = this.scene.add
      .container(0, -this.h - 56, [bg, label])
      .setScale(0.6)
      .setAlpha(0);
    this.container.add(bubble);
    this.bubble = bubble;
    this.scene.tweens.add({
      targets: bubble,
      scale: 1,
      alpha: 1,
      duration: 120,
      ease: 'Back.easeOut',
    });
    this.scene.tweens.add({
      targets: bubble,
      alpha: 0,
      delay: ms,
      duration: 250,
      onComplete: () => {
        bubble.destroy();
        if (this.bubble === bubble) this.bubble = null;
      },
    });
  }

  destroy(): void {
    this.container.destroy();
  }
}

const GODS = new Map((GRAYBOX.gods ?? []).map((d) => [d.id, d]));
const PATHS = new Map((GRAYBOX.paths ?? []).map((d) => [d.id, d]));
const ITEMS = new Map((GRAYBOX.items ?? []).map((d) => [d.id, d]));
const CLASSES = new Map((GRAYBOX.classes ?? []).map((d) => [d.id, d]));
// The type a hero strikes with. Sim gives a type only to casters (its class has a spellMult):
// their path's (tier 2 and up) or else their god's; weapon heroes strike physical. Mirrors
// sim/world.ts; Scene has no snapshot field for it yet.
function heroDamageType(u: UnitState): string {
  // Sim decides by the unit's class (`type`), the template of its god or path.
  if (CLASSES.get(u.type)?.spellMult === undefined) return 'physical';
  const path = u.path ? PATHS.get(u.path) : undefined;
  return path?.damageType ?? (u.god ? GODS.get(u.god)?.damageType : undefined) ?? 'physical';
}
const SKILLS = new Map((GRAYBOX.skills ?? []).map((d) => [d.id, d]));
const skillDef = (id: string) => SKILLS.get(id);

// Keeps one UnitView per snapshot unit, plays the shared motion system for sim events and owns
// the strike-effect layer.
export class UnitViews {
  private readonly views = new Map<number, UnitView>();
  private readonly dying = new Map<number, UnitView>();
  private readonly fx: FxLayer;
  private readonly skillFx: SkillFx;
  // What each hero strikes with, for the colour of a skill with an untyped damage effect.
  private readonly strikeType = new Map<number, string>();
  // The world's tuning of the collector (MapScene sets it each frame), for the sack sizes.
  carryCap = DEFAULT_TUNING.collector.carryCap;
  // Ambrosia carried by each gatherer (MapScene sets it each frame from the snapshot).
  carry: ReadonlyMap<number, number> = new Map();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly shake: () => void = () => {},
  ) {
    this.fx = new FxLayer(scene);
    this.skillFx = new SkillFx(scene);
  }

  // `others` finds a building or lair by sim id (hits can land on those too); `dtMs` is the
  // frame time already scaled by the game speed.
  sync(
    units: readonly Readonly<UnitState>[],
    events: readonly SimEvent[],
    timeMs: number,
    dtMs: number,
    others: (id: number) => Vec2 | undefined = () => undefined,
    parties: readonly { id: number; members: readonly number[]; intent?: PartyIntent }[] = [],
    paths: readonly { id: string; name: string }[] = [],
  ): void {
    const intents = new Map<number, PartyIntent>();
    for (const p of parties) if (p.intent) intents.set(p.id, p.intent);
    const dtS = Math.min(MAX_DT_S, dtMs / 1000);
    // Names are off unless the player taps a hero: then every hero of its party shows one.
    const sel = units.find((u) => u.id === this.scene.registry.get('selectedUnit'));
    const ctx: FrameCtx = {
      dtS,
      intents,
      timeMs,
      carryCap: this.carryCap,
      carry: this.carry,
      namesParty: sel && sel.party > 0 ? sel.party : 0,
      namesHero: sel?.id ?? 0,
      fx: this.fx,
      shake: this.shake,
      chestOf: (id) => {
        const v = this.views.get(id) ?? this.dying.get(id);
        if (v) return v.chest();
        const p = others(id);
        return p ? { x: p.x, y: p.y - 40 } : undefined;
      },
      hurt: (targetId, fromX, power, damage, dodged, info, silent, fxK) => {
        const t = this.views.get(targetId) ?? this.dying.get(targetId);
        if (!t) return;
        t.receiveHit(fromX, power, dodged, this.fx, fxK ?? 1);
        // The number: type colour, crit, miss, weak or resisted (damageLook).
        const look = silent ? null : damageLook(damage, dodged, info);
        if (look) this.floatNumber(t.container.x, t.container.y - t.height - 10, look);
      },
      healed: (targetId, amount) => {
        const t = this.views.get(targetId) ?? this.dying.get(targetId);
        if (!t) return;
        t.receiveHeal(this.fx);
        if (amount > 0)
          this.floatText(t.container.x, t.container.y - t.height - 10, `+${amount}`, '#b6ffb0');
      },
    };
    // Events first: a unit that died this tick is already gone from the snapshot but still
    // has its view, so its last words can be said before the fall.
    for (const e of events) {
      if (e.kind === 'hit') this.onHit(e, ctx, others);
      else if (e.kind === 'windup') this.onWindup(e);
      else if (e.kind === 'heal') this.onHeal(e, ctx);
      else if (e.kind === 'tierUp') this.onTierUp(e, paths);
      else if (e.kind === 'levelUp') this.onLevelUp(e, parties);
      // The party weighs a flag it has not chosen: a "?" over its leader (the intent icon shows the
      // flag if it commits).
      else if (e.kind === 'considering') {
        // The leader is the first member not knocked out (Sim's leaderOf).
        const members = parties.find((p) => p.id === e.party)?.members ?? [];
        const lead = members.find((id) => !units.find((u) => u.id === id)?.ko) ?? members[0];
        this.views.get(lead ?? -1)?.cue('?', '#f4ead5', 1400);
      } else if (e.kind === 'upgradePicked' && e.auto) this.onAutoPick(e, parties);
      else if (e.kind === 'built') this.onBuilt(e, others);
      else if (e.kind === 'rider') this.views.get(e.target)?.setRider(e.rider);
      else if (e.kind === 'collectorHit') this.views.get(e.unit)?.cue('!', '#ff9a8a', 700);
      else if (e.kind === 'workerHit') this.views.get(e.unit)?.cue('!', '#ff9a8a', 700);
      else if (e.kind === 'drank') this.onDrank(e, ctx);
      else if (e.kind === 'riddle' && e.answered)
        this.views.get(e.target)?.cue('!', '#f2c14e', 1200);
      else if (e.kind === 'bossHeads') {
        const v = this.views.get(e.unit);
        if (v) v.heads = e.heads;
      } else if (e.kind === 'cast') this.onCast(e);
      else if (e.kind === 'skill') this.onSkill(e);
      else if (e.kind === 'status' && isStatusKind(e.status))
        this.views.get(e.unit)?.setStatus(e.status, e.until);
      else if (e.kind === 'bossEmerged') this.onBossEmerged(e);
      else if (e.kind === 'enraged') this.onEnraged(e);
      else if (isSpeechEvent(e)) this.onSpeech(e);
      // Shopping speaks (above) and also pops its tax in gold.
      if (e.kind === 'shopped') this.onShopped(e);
    }
    const seen = new Set<number>();
    for (const u of units) {
      seen.add(u.id);
      if (u.kind === 'hero') this.strikeType.set(u.id, heroDamageType(u));
      let view = this.views.get(u.id);
      if (!view) {
        view = new UnitView(this.scene, u);
        this.views.set(u.id, view);
      }
      // Boss and enraged come from the snapshot (they survive a reload); events add the show.
      const bs = bossState(u, GRAYBOX.monsters);
      if (bs.boss) view.boss = true;
      if (bs.enraged) view.enraged = true;
      view.update(u, ctx, partyRole(u.id, u.party, parties));
    }
    for (const [id, view] of this.views) {
      if (!seen.has(id)) {
        view.die();
        this.dying.set(id, view);
        this.fx.dropCleaves(id);
        this.views.delete(id);
      }
    }
    // Units that left the snapshot keep falling and fading until they are gone.
    for (const [id, view] of this.dying) {
      view.updateDying(ctx);
      if (view.gone) {
        view.destroy();
        this.dying.delete(id);
        this.strikeType.delete(id);
      }
    }
    this.flushQueued();
    if (this.scene.time.now > this.sweepAt) {
      this.sweepAt = this.scene.time.now + 5000;
      const inUse = new Set<string>();
      for (const v of [...this.views.values(), ...this.dying.values()])
        if (v.partsLookId) inUse.add(v.partsLookId);
      sweepSets(this.scene, inUse);
    }
    this.fx.update(dtS);
  }

  private speech = new SpeechLimit();

  // Heroes only, rationed by SpeechLimit (one bark in town per few seconds, one per hero per 30 s).
  // A high priority bark that meets the global gap waits up to HIGH_WAIT_MS for it, then drops
  // (barks.md section 2 rule 3). Mid and low barks drop at once.
  private sweepAt = 0;
  private queued: { e: Extract<SimEvent, { kind: SpeechKind }>; until: number } | null = null;

  private onSpeech(e: Extract<SimEvent, { kind: SpeechKind }>): void {
    // A high bark is waiting for the gap: it is first in line, so nothing else may cut in.
    if (this.queued) return;
    if (!this.trySpeak(e) && BARK_META[e.kind].priority === 'high' && !this.queued)
      this.queued = { e, until: this.scene.time.now + HIGH_WAIT_MS };
  }

  // Retries the queued high bark once per frame until it speaks or runs out of time.
  private flushQueued(): void {
    const q = this.queued;
    if (!q) return;
    if (this.scene.time.now > q.until || this.trySpeak(q.e, true)) this.queued = null;
  }

  // `retry`: the queued high bark trying again (its chance was rolled the first time).
  private trySpeak(e: Extract<SimEvent, { kind: SpeechKind }>, retry = false): boolean {
    const view = this.views.get(e.unit);
    if (!view || !view.isHero) return true; // nothing to wait for
    const meta = BARK_META[e.kind];
    // Only heroes on screen speak; small events speak only some of the time.
    const cam = this.scene.cameras.main.worldView;
    if (!cam.contains(view.container.x, view.container.y)) return true;
    if (!retry && meta.chance < 1 && barkRoll(e.unit, view.barkTries++) >= meta.chance) return true;
    let live = 0;
    for (const v of this.views.values())
      if (v.hasBubble && cam.contains(v.container.x, v.container.y)) live++;
    if (!this.speech.allow(e.unit, this.scene.time.now, live, meta.priority)) return false;
    view.say(
      pickLine(e.kind, e.unit, view.spoken++),
      meta.priority === 'high' ? HIGH_BUBBLE_MS : BUBBLE_MS,
    );
    return true;
  }

  private onHit(
    e: Extract<SimEvent, { kind: 'hit' }>,
    ctx: FrameCtx,
    others: (id: number) => Vec2 | undefined,
  ): void {
    const info: HitInfo = {
      type: e.type,
      crit: e.crit,
      tick: e.tick,
      weak: e.weak,
      resist: e.resist,
    };
    // A burn tick: a small number over the target, no swing and no knockback.
    if (e.tick) {
      const t = this.views.get(e.target) ?? this.dying.get(e.target);
      const look = damageLook(e.damage, false, info);
      if (t && look) this.floatNumber(t.container.x, t.container.y - t.height - 10, look);
      return;
    }
    const attacker = this.views.get(e.attacker);
    if (attacker) {
      // A big monster's blow shakes the screen a little.
      if (!attacker.friendly && attacker.tierNow >= 3 && !e.dodged && e.damage > 0) ctx.shake();
      return attacker.landHit(e.target, e.damage, e.dodged, info);
    }
    // No unit view: a tower (or other building) shooting. An arrow flies from its top to the
    // target and the hit lands at once, knocked back away from the tower.
    const from = others(e.attacker);
    if (!from) return ctx.hurt(e.target, Number.NaN, 1, e.damage, e.dodged, info);
    const top = { x: from.x, y: from.y - TOWER_MUZZLE_Y };
    const to = ctx.chestOf(e.target) ?? top;
    const dist = Math.hypot(to.x - top.x, to.y - top.y);
    this.fx.add([
      {
        type: 'arrow',
        x: top.x,
        y: top.y,
        tx: to.x,
        ty: to.y,
        age: 0,
        life: Math.max(0.1, Math.min(0.35, dist / 1200)),
      },
    ]);
    this.fx.sparks(top.x, top.y, [255, 225, 160], 4);
    ctx.hurt(e.target, from.x, 1, e.damage, e.dodged, info);
  }

  // A party levelled: a pillar of light in its colour at the group's feet, a ring spreading, a
  // burst of sparkles and a glow on every member (they cheer).
  private onLevelUp(
    e: Extract<SimEvent, { kind: 'levelUp' }>,
    parties: readonly { id: number; members: readonly number[] }[],
  ): void {
    const crew = this.crew(e.party, parties);
    if (crew.length === 0) return;
    const color = partyColor(e.party);
    const cx = crew.reduce((a, v) => a + v.container.x, 0) / crew.length;
    const cy = crew.reduce((a, v) => a + v.container.y, 0) / crew.length;
    this.fx.add([
      { type: 'pillar', x: cx, y: cy, color, age: 0, life: 1.4 },
      { type: 'ring', x: cx, y: cy, r: 150, age: 0, life: 0.9 },
    ]);
    const rgb: readonly [number, number, number] = [
      (color >> 16) & 255,
      (color >> 8) & 255,
      color & 255,
    ];
    for (const v of crew) {
      v.glow(color, 1.6);
      this.fx.sparkle(v.container.x, v.container.y - v.height * 0.5, 14, [rgb, [255, 240, 190]]);
    }
  }

  // The party picked its card itself: the members glow in the card's colour (red for strength,
  // blue for dexterity, green for stamina and healing, gold otherwise), so the pick is seen.
  private onAutoPick(
    e: Extract<SimEvent, { kind: 'upgradePicked' }>,
    parties: readonly { id: number; members: readonly number[] }[],
  ): void {
    const def = (GRAYBOX.upgrades ?? []).find((u) => u.id === e.upgrade);
    const color = cardColor(def?.effect);
    // `levelUp` and this event arrive in the same tick: the card's glow waits for the party glow
    // to be seen first.
    this.scene.time.delayedCall(700, () => {
      for (const v of this.crew(e.party, parties)) {
        v.glow(color, 1.2);
        this.fx.sparkle(v.container.x, v.container.y - v.height * 0.5, 8, GOLD_SPARKS);
      }
    });
  }

  private crew(
    party: number,
    parties: readonly { id: number; members: readonly number[] }[],
  ): UnitView[] {
    const members = parties.find((p) => p.id === party)?.members ?? [];
    return members.flatMap((id) => {
      const v = this.views.get(id);
      return v ? [v] : [];
    });
  }

  private onTierUp(
    e: Extract<SimEvent, { kind: 'tierUp' }>,
    paths: readonly { id: string; name: string }[],
  ): void {
    const name = paths.find((p) => p.id === e.path)?.name;
    this.views.get(e.unit)?.evolve(this.fx, name ?? `Tier ${e.tier}!`);
  }

  // A hero drank a potion: a green swirl and the healed number.
  private onDrank(e: Extract<SimEvent, { kind: 'drank' }>, ctx: FrameCtx): void {
    ctx.healed(e.unit, e.amount);
    const v = this.views.get(e.unit);
    if (v)
      this.fx.add([
        {
          type: 'ring',
          x: v.container.x,
          y: v.container.y,
          r: 50,
          age: 0,
          life: 0.5,
          color: 0x7fe08a,
        },
      ]);
  }

  // The item a purchase bought rises over the hero as a small icon.
  private riseGlyph(v: UnitView, item: string | undefined): void {
    const slot = item ? ITEMS.get(item)?.slot : undefined;
    const g = this.scene.add.graphics({ x: v.container.x, y: v.container.y - v.height - 44 });
    g.setDepth(1_000_000);
    drawGlyph(g, glyphOf(slot));
    this.scene.tweens.add({
      targets: g,
      y: g.y - 46,
      alpha: 0,
      duration: 1200,
      ease: 'Quad.easeOut',
      onComplete: () => g.destroy(),
    });
  }

  // A hero spent gold at the market: the town's tax pops out in gold with a few sparkles.
  private onShopped(e: Extract<SimEvent, { kind: 'shopped' }>): void {
    const v = this.views.get(e.unit);
    if (v && e.item) this.riseGlyph(v, e.item);
    if (!v || e.tax <= 0) return;
    this.floatText(
      v.container.x,
      v.container.y - v.height - 28,
      `+${Math.round(e.tax)}g`,
      '#f2c14e',
    );
    this.fx.sparkle(v.container.x, v.container.y - v.height * 0.5, 8, GOLD_SPARKS);
  }

  // A building went up: a cloud of dust and a few chips at its feet.
  private onBuilt(
    e: Extract<SimEvent, { kind: 'built' }>,
    others: (id: number) => Vec2 | undefined,
  ): void {
    const p = others(e.building);
    if (!p) return;
    for (let i = 0; i < 4; i++) this.fx.dust(p.x + (i - 1.5) * 34, p.y, 1.8);
    this.fx.sparks(p.x, p.y - 10, [190, 160, 110], 10);
  }

  private onHeal(e: Extract<SimEvent, { kind: 'heal' }>, ctx: FrameCtx): void {
    const healer = this.views.get(e.healer);
    if (healer) healer.landHeal(e.target, e.amount);
    else ctx.healed(e.target, e.amount);
  }

  // The boss steps out of its lair: marked as a boss for its big bar, a ring and a shake.
  private onBossEmerged(e: Extract<SimEvent, { kind: 'bossEmerged' }>): void {
    const v = this.views.get(e.unit);
    if (!v) return; // the flag comes from the snapshot; a brand-new boss just skips the ring
    v.boss = true;
    this.fx.add([{ type: 'ring', x: v.container.x, y: v.container.y, r: 180, age: 0, life: 0.9 }]);
    this.fx.dust(v.container.x, v.container.y, 2.4);
    this.shake();
  }

  // The boss enrages: a red pulse on it, a shout over its head and a shake.
  private onEnraged(e: Extract<SimEvent, { kind: 'enraged' }>): void {
    const v = this.views.get(e.unit);
    if (!v) return;
    v.enraged = true;
    this.fx.add([{ type: 'ring', x: v.container.x, y: v.container.y, r: 140, age: 0, life: 0.7 }]);
    this.shake();
    this.floatNumber(v.container.x, v.container.y - v.height - 50, {
      text: 'ENRAGED!',
      color: '#ff5a4a',
      fontSize: 36,
      tag: null,
    });
  }

  // The caster glows in its skill's colour for the windup, and now and then says the skill's name.
  private onCast(e: Extract<SimEvent, { kind: 'cast' }>): void {
    const view = this.views.get(e.caster);
    if (!view) return;
    const def = skillAtTier(skillDef(e.skill), view.tierNow);
    view.glow(skillTint(def, this.strikeType.get(e.caster)), 1.2);
    if (e.say && def) view.say(def.name, 1800);
  }

  // The skill's pictures, drawn when the cast lands.
  private onSkill(e: Extract<SimEvent, { kind: 'skill' }>): void {
    const caster = this.views.get(e.caster) ?? this.dying.get(e.caster);
    if (!caster) return;
    // Sim merges the tier 3 fields over the row for a tier 3 caster; so does the picture.
    const def = skillAtTier(skillDef(e.skill), caster.tierNow);
    const pos = (id: number): Vec | undefined => {
      const v = this.views.get(id) ?? this.dying.get(id);
      return v ? v.chest() : undefined;
    };
    const hits = e.hits.filter((id) => id !== e.caster).flatMap((id) => pos(id) ?? []);
    const o = {
      tint: skillTint(def, this.strikeType.get(e.caster)),
      from: caster.chest(),
      point: e.point,
      hits: hits.length ? hits : [e.point],
      shape: shapeBox(def),
      // The dash starts at the caster's old feet: lift it to chest height like the end point.
      dashFrom: e.from && {
        x: e.from.x,
        y: e.from.y + (caster.chest().y - caster.container.y),
      },
      seed: e.caster * 31 + e.hits.length,
    };
    const k = Math.max(0.8, fxScale(caster.tierNow, caster.boss));
    for (const v of skillVisuals(def)) this.skillFx.play(v, o, k);
  }

  // The tells (monsters-and-bosses.md section 3): venom drops fall on the target, a howl sends a red
  // ring out from the boss, the Sphinx puts a "?" over its target, Apep darkens the ground under it.
  private onMoveWindup(
    move: NonNullable<Extract<SimEvent, { kind: 'windup' }>['move']>,
    e: Extract<SimEvent, { kind: 'windup' }>,
  ): void {
    const boss = this.views.get(e.attacker);
    const target = this.views.get(e.target);
    const life = e.inMs / 1000;
    if (move === 'venom' && target)
      this.fx.add([
        {
          type: 'drops',
          x: target.container.x,
          y: target.container.y,
          color: 0x8ae04a,
          age: 0,
          life,
        },
      ]);
    else if (move === 'howl' && boss)
      this.fx.add([
        {
          type: 'ring',
          x: boss.container.x,
          y: boss.container.y,
          r: 200,
          age: 0,
          life,
          color: 0xe04a3a,
        },
      ]);
    else if (move === 'riddle') target?.cue('?', '#f4ead5', e.inMs);
    else if (move === 'swallow' && target)
      this.fx.add([
        {
          type: 'ring',
          x: target.container.x,
          y: target.container.y,
          r: 60,
          age: 0,
          life,
          color: 0x6a3a8a,
        },
      ]);
  }

  private onWindup(e: Extract<SimEvent, { kind: 'windup' }>): void {
    // A cleave shows its ground marker for the whole windup (the target is the centre).
    if (e.area)
      this.fx.add([
        {
          type: 'cleave',
          owner: e.attacker,
          x: e.area.x,
          y: e.area.y,
          r: e.area.r,
          age: 0,
          life: e.inMs / 1000,
        },
      ]);
    // A timed boss move announces itself on its target for the whole windup.
    if (e.move) this.onMoveWindup(e.move, e);
    // A breath shows its cone on the ground for the whole windup.
    if (e.cone)
      this.fx.add([
        {
          type: 'cone',
          owner: e.attacker,
          x: e.cone.from.x,
          y: e.cone.from.y,
          ang: Math.atan2(e.cone.dir.y, e.cone.dir.x),
          half: (e.cone.angleDeg * Math.PI) / 360,
          r: e.cone.range,
          age: 0,
          life: e.inMs / 1000,
        },
      ]);
    this.views.get(e.attacker)?.beginWindup(e.target, e.inMs / 1000);
  }

  // Floating numbers on screen, oldest first (a number and its tag count as one); past MAX_FLOATS
  // the oldest is dropped at once.
  private floats: { n: Phaser.GameObjects.Text; tag: Phaser.GameObjects.Text | null }[] = [];

  private floatNumber(x: number, y: number, look: FloatLook): void {
    const n = this.floatText(x, y, look.text, look.color, look.fontSize);
    const tag = look.tag
      ? this.floatText(x, y + look.fontSize * 0.9, look.tag, '#ffcf8a', 16)
      : null;
    this.floats = this.floats.filter((f) => f.n.active);
    this.floats.push({ n, tag });
    while (this.floats.length > MAX_FLOATS) {
      const old = this.floats.shift();
      old?.n.destroy();
      old?.tag?.destroy();
    }
  }

  private floatText(
    x: number,
    y: number,
    text: string,
    color = '#ffd9d9',
    fontSize = 26,
  ): Phaser.GameObjects.Text {
    const t = this.scene.add
      .text(x, y, text, {
        fontFamily: 'Georgia, serif',
        fontSize: `${fontSize}px`,
        color,
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(1_000_000);
    this.scene.tweens.add({
      targets: t,
      y: y - 40,
      alpha: 0,
      duration: 700,
      onComplete: () => t.destroy(),
    });
    return t;
  }
}
