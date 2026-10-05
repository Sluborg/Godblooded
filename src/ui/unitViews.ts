import Phaser from 'phaser';
import type { SimEvent, UnitState, Vec2 } from '../sim/api';
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
  windupFor,
  type Pose,
  type Strike,
} from './motionPose';
import { partyColor } from './partyLook';
import { isSpeechEvent, pickLine, type SpeechKind } from './speechLines';
import { buildStrike, FxLayer, type Vec } from './strikeFx';
import { ART_NOMINAL_PX, PLACEHOLDER, UNIT_HEIGHT, lookOf, type UnitLook } from './unitLook';

// Speech bubbles: how long one stays, the most on screen at once, and the quiet time per unit.
const BUBBLE_MS = 2200;
const MAX_BUBBLES = 4;
const UNIT_COOLDOWN_MS = 2500;
// How far ahead of the impact the windup is allowed to start when the sim gives no warning:
// the `hit` event arrives at impact, so the windup is squeezed into this (docs/api: Scene 70).
const DEFAULT_LEAD_S = 0.09;
// The longest frame the motion will simulate, so a stalled tab does not skip whole swings.
const MAX_DT_S = 0.05;
// Rendered position follows the sim with this time constant (the sim steps in 50 ms ticks).
const SMOOTH_S = 0.06;

function manifestId(u: UnitState, view: 'front' | 'back'): string {
  const kind = u.kind === 'hero' ? 'hero' : 'mon';
  return `${kind}_${u.type}_t${u.tier}_${view}`;
}

interface Attack {
  strike: Strike;
  t: number;
  windup: number;
  targetId: number;
  damage: number;
  dodged: boolean;
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
  fx: FxLayer;
  shake: () => void;
  // Chest of a unit, building or lair by sim id, if it is on the map.
  chestOf: (id: number) => Vec | undefined;
  // Receives the visual side of a landed strike (flash, knockback, number).
  hurt: (targetId: number, fromX: number, power: number, damage: number, dodged: boolean) => void;
}

// One on-screen unit. All motion is the shared system in motionPose.ts and strikeFx.ts: a
// picture that faces right, mirrored by direction, or a placeholder body with the same motion.
// The container sits on the sim position; the `body` inside carries the pose.
export class UnitView {
  readonly container: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Container;
  private readonly shadow: Phaser.GameObjects.Graphics;
  private readonly capsule: Phaser.GameObjects.Ellipse;
  private readonly nose: Phaser.GameObjects.Triangle;
  private sprite: Phaser.GameObjects.Image | null = null;
  private flash: Phaser.GameObjects.Image | null = null;
  private readonly bar: Phaser.GameObjects.Graphics;
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly badge: Phaser.GameObjects.Text;
  private readonly label: Phaser.GameObjects.Text;
  private ringKey = '';
  private bubble: Phaser.GameObjects.Container | null = null;
  readonly isHero: boolean;
  readonly look: UnitLook;
  spoken = 0;
  lastSpokeAt = -Infinity;

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

  constructor(
    private readonly scene: Phaser.Scene,
    u: UnitState,
  ) {
    this.look = lookOf(u.type);
    this.isHero = u.kind === 'hero';
    this.x = u.pos.x;
    this.y = u.pos.y;
    this.face = u.facing.x < 0 ? -1 : 1;
    const w = PLACEHOLDER.w * this.look.scale;
    const h = PLACEHOLDER.h * this.look.scale;
    this.w = w;
    this.h = h;
    this.shadow = scene.add.graphics();
    this.capsule = scene.add
      .ellipse(0, -h / 2, w, h, this.look.color)
      .setStrokeStyle(3, 0x000000, 0.6);
    this.nose = scene.add.triangle(w * 0.3, -h * 0.62, 0, -9, 0, 9, 16, 0, 0xffffff, 0.9);
    this.label = scene.add
      .text(0, -UNIT_HEIGHT * this.look.scale - 6, u.type, {
        fontFamily: 'Georgia, serif',
        fontSize: '16px',
        color: '#f4ead5',
      })
      .setOrigin(0.5, 1);
    this.body = scene.add.container(0, 0, [this.capsule, this.nose]);
    this.bar = scene.add.graphics();
    // Ring at the feet in the party colour (white and thicker when selected), badge with the
    // party number beside the name.
    this.ring = scene.add.graphics();
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
      this.body,
      this.bar,
      this.label,
      this.badge,
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
    return this.row?.strike ?? this.look.strike;
  }

  // ---------- art ----------

  // Swaps in the picture for this unit when the manifest has it; else the placeholder stays.
  private applyArt(u: UnitState): void {
    let id = manifestId(u, u.facing.y < 0 ? 'back' : 'front');
    if (!this.scene.textures.exists(id)) id = manifestId(u, u.facing.y < 0 ? 'front' : 'back');
    if (!this.scene.textures.exists(id)) {
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
  landHit(targetId: number, damage: number, dodged: boolean): void {
    const a = this.attack;
    if (a?.awaitingHit && a.targetId === targetId) {
      a.awaitingHit = false;
      a.damage = damage;
      a.dodged = dodged;
      return;
    }
    this.startAttack(targetId, damage, dodged, null, false);
  }

  private startAttack(
    targetId: number,
    damage: number,
    dodged: boolean,
    leadS: number | null,
    awaitingHit: boolean,
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
      awaitingHit,
      leadS: leadS ?? DEFAULT_LEAD_S,
      backFirst: Math.random() < 0.5,
      cross: Math.random() < 0.4,
      fired: [false, false],
    };
  }

  // The visual side of being hit: flash, knockback, sparks. The sim already took the hp.
  receiveHit(fromX: number, power: number, dodged: boolean, fx: FxLayer): void {
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
    fx.sparks(c.x, c.y, [255, 225, 160], 7);
    fx.blood(c.x, c.y, dir);
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

  update(u: UnitState, ctx: FrameCtx): void {
    this.applyArt(u);
    this.tick(u.pos, u.facing.x, u.ko, ctx);
    this.drawBar(u);
    this.drawParty(u);
  }

  // A unit that left the snapshot: it stays where it fell and keeps going down and fading.
  updateDying(ctx: FrameCtx): void {
    this.tick({ x: this.x, y: this.y }, 0, true, ctx);
    this.bar.clear();
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
    this.kb *= Math.pow(0.0005, s);

    // knocked-out fall and get-up
    const down = ko || this.dying;
    this.koK = down ? Math.min(1, this.koK + s / FALL_S) : Math.max(0, this.koK - s / RISE_S);
    if (this.dying && this.koK >= 1) this.fade = Math.max(0, this.fade - s / 0.6);

    let pose: Pose;
    let alpha = 1;
    if (this.koK > 0) {
      const ko = koPose(this.koK, this.koDir);
      pose = ko.pose;
      alpha = ko.alpha;
      this.attack = null;
    } else if (this.attack) {
      pose = this.runAttack(ctx);
    } else if (moving) {
      const before = Math.floor(this.stepT);
      this.stepT += step / (this.h * STEP_LENGTH);
      if (Math.floor(this.stepT) !== before)
        ctx.fx.dust(this.x - this.face * this.h * 0.08, this.y, 0.5 * this.look.scale);
      pose = walkPose(this.stepT, this.h, this.face);
    } else {
      pose = idlePose(this.phase);
    }
    this.applyPose(pose, alpha * this.fade);
    this.container.setPosition(this.x, this.y).setDepth(this.y);
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
    });
    ctx.fx.add(r.effects);
    if (r.smash) {
      for (let i = 0; i < 6; i++)
        ctx.fx.dust(r.smash.x + (Math.random() - 0.5) * this.h * 0.4, r.smash.y, 0.9);
      ctx.shake();
    }
    ctx.hurt(a.targetId, this.x, a.strike === 'smash' ? 2 : 1, n === 0 ? a.damage : 0, a.dodged);
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
      .clear()
      .fillStyle(0x000000, 0.32 - lift)
      .fillEllipse(fall, 0, rx * 2, UNIT_HEIGHT * this.look.footprint * 0.48);
    // hurt flash: white, then red, on the picture (or the placeholder body)
    const f = hurtFlash(this.hit);
    if (this.flash) {
      this.flash.setVisible(f !== null);
      if (f) this.flash.setTintFill(f.color).setAlpha(f.alpha);
    } else {
      this.capsule.setFillStyle(f ? f.color : this.look.color, f ? Math.max(0.6, f.alpha) : 1);
    }
  }

  // ---------- overlays ----------

  private drawParty(u: UnitState): void {
    const selected = this.scene.registry.get('selectedUnit') === u.id;
    const key = `${u.party}:${selected}`;
    if (key === this.ringKey) return;
    this.ringKey = key;
    this.ring.clear();
    this.badge.setVisible(u.party > 0);
    if (u.party > 0) {
      const c = partyColor(u.party);
      this.badge.setText(`${u.party}`).setBackgroundColor(`#${c.toString(16).padStart(6, '0')}`);
      this.ring
        .lineStyle(selected ? 6 : 4, selected ? 0xffffff : c, 0.95)
        .strokeEllipse(0, -4, 64, 24);
    } else if (selected) {
      this.ring.lineStyle(6, 0xffffff, 0.95).strokeEllipse(0, -4, 64, 24);
    }
  }

  private drawBar(u: UnitState): void {
    this.bar.clear();
    if (u.hp >= u.maxHp) return;
    const w = 56;
    const y = -this.h - 22;
    this.bar.fillStyle(0x000000, 0.6).fillRect(-w / 2, y, w, 8);
    this.bar
      .fillStyle(u.kind === 'hero' ? 0x6fcf6f : 0xcf4f4f, 1)
      .fillRect(-w / 2, y, (w * Math.max(0, u.hp)) / u.maxHp, 8);
  }

  get hasBubble(): boolean {
    return this.bubble !== null;
  }

  // One bubble per unit: a new line replaces the old one. It lives on the unit's container,
  // so it follows the unit and fades with it.
  say(text: string): void {
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
      delay: BUBBLE_MS,
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

// Keeps one UnitView per snapshot unit, plays the shared motion system for sim events and owns
// the strike-effect layer.
export class UnitViews {
  private readonly views = new Map<number, UnitView>();
  private readonly dying = new Map<number, UnitView>();
  private readonly fx: FxLayer;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly shake: () => void = () => {},
  ) {
    this.fx = new FxLayer(scene);
  }

  // `others` finds a building or lair by sim id (hits can land on those too); `dtMs` is the
  // frame time already scaled by the game speed.
  sync(
    units: readonly Readonly<UnitState>[],
    events: readonly SimEvent[],
    timeMs: number,
    dtMs: number,
    others: (id: number) => Vec2 | undefined = () => undefined,
  ): void {
    const dtS = Math.min(MAX_DT_S, dtMs / 1000);
    const ctx: FrameCtx = {
      dtS,
      fx: this.fx,
      shake: this.shake,
      chestOf: (id) => {
        const v = this.views.get(id) ?? this.dying.get(id);
        if (v) return v.chest();
        const p = others(id);
        return p ? { x: p.x, y: p.y - 40 } : undefined;
      },
      hurt: (targetId, fromX, power, damage, dodged) => {
        const t = this.views.get(targetId) ?? this.dying.get(targetId);
        if (!t) return;
        t.receiveHit(fromX, power, dodged, this.fx);
        if (!dodged && damage > 0)
          this.floatText(t.container.x, t.container.y - t.height - 10, `${damage}`);
      },
    };
    // Events first: a unit that died this tick is already gone from the snapshot but still
    // has its view, so its last words can be said before the fall.
    for (const e of events) {
      if (e.kind === 'hit') this.onHit(e, ctx);
      else if (e.kind === 'windup') this.onWindup(e);
      else if (isSpeechEvent(e)) this.onSpeech(e, timeMs);
    }
    const seen = new Set<number>();
    for (const u of units) {
      seen.add(u.id);
      let view = this.views.get(u.id);
      if (!view) {
        view = new UnitView(this.scene, u);
        this.views.set(u.id, view);
      }
      view.update(u, ctx);
    }
    for (const [id, view] of this.views) {
      if (!seen.has(id)) {
        view.die();
        this.dying.set(id, view);
        this.views.delete(id);
      }
    }
    // Units that left the snapshot keep falling and fading until they are gone.
    for (const [id, view] of this.dying) {
      view.updateDying(ctx);
      if (view.gone) {
        view.destroy();
        this.dying.delete(id);
      }
    }
    this.fx.update(dtS);
  }

  // Heroes only, rate limited: at most MAX_BUBBLES at once, one per unit every few seconds.
  private onSpeech(e: Extract<SimEvent, { kind: SpeechKind }>, timeMs: number): void {
    const view = this.views.get(e.unit);
    if (!view || !view.isHero) return;
    if (timeMs - view.lastSpokeAt < UNIT_COOLDOWN_MS) return;
    let live = 0;
    for (const v of this.views.values()) if (v.hasBubble) live++;
    if (live >= MAX_BUBBLES && !view.hasBubble) return;
    view.lastSpokeAt = timeMs;
    view.say(pickLine(e.kind, e.unit, view.spoken++));
  }

  private onHit(e: Extract<SimEvent, { kind: 'hit' }>, ctx: FrameCtx): void {
    const attacker = this.views.get(e.attacker);
    if (attacker) attacker.landHit(e.target, e.damage, e.dodged);
    else ctx.hurt(e.target, Number.NaN, 1, e.damage, e.dodged);
  }

  private onWindup(e: Extract<SimEvent, { kind: 'windup' }>): void {
    this.views.get(e.attacker)?.beginWindup(e.target, e.inMs / 1000);
  }

  private floatText(x: number, y: number, text: string): void {
    const t = this.scene.add
      .text(x, y, text, {
        fontFamily: 'Georgia, serif',
        fontSize: '26px',
        color: '#ffd9d9',
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
  }
}
