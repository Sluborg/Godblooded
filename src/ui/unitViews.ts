import Phaser from 'phaser';
import type { SimEvent, UnitState, Vec2 } from '../sim/api';
import { ANCHORS_KEY } from './assets';
import { isSpeechEvent, pickLine, type SpeechKind } from './speechLines';

// Height of a unit on the map in world units. Art ships about 256 px tall at nominal size.
const UNIT_HEIGHT = 120;
const ART_NOMINAL_PX = 256;
// Speech bubbles: how long one stays, the most on screen at once, and the quiet time per unit.
const BUBBLE_MS = 2200;
const MAX_BUBBLES = 4;
const UNIT_COOLDOWN_MS = 2500;
const HERO_COLORS: Record<string, number> = { warrior: 0x3a6ea5, ranger: 0x4f9d69 };
const MONSTER_COLORS: Record<string, number> = { draugr: 0x7a8c8f, troll: 0x6b4a2f };

function manifestId(u: UnitState, view: 'front' | 'back'): string {
  const kind = u.kind === 'hero' ? 'hero' : 'mon';
  return `${kind}_${u.type}_t${u.tier}_${view}`;
}

// One on-screen unit: a manifest sprite, or a placeholder shape when the id has no art.
// Tweens only touch the inner `body`, never the container the sim positions.
class UnitView {
  readonly container: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Container;
  private sprite: Phaser.GameObjects.Image | null = null;
  private readonly dot: Phaser.GameObjects.Arc;
  private readonly nose: Phaser.GameObjects.Triangle;
  private readonly bar: Phaser.GameObjects.Graphics;
  private last: Vec2;
  private moving = false;
  private bubble: Phaser.GameObjects.Container | null = null;
  readonly isHero: boolean;
  spoken = 0;
  lastSpokeAt = -Infinity;
  private flashing = false;
  private readonly baseColor: number;

  constructor(
    private readonly scene: Phaser.Scene,
    u: UnitState,
  ) {
    const color = (u.kind === 'hero' ? HERO_COLORS : MONSTER_COLORS)[u.type] ?? 0x999999;
    this.baseColor = color;
    this.isHero = u.kind === 'hero';
    const r = UNIT_HEIGHT / 4;
    this.dot = scene.add.circle(0, -r, r, color).setStrokeStyle(3, 0x000000, 0.6);
    this.nose = scene.add.triangle(0, -r, 0, -8, 0, 8, 14, 0, 0xffffff, 0.9);
    const label = scene.add
      .text(0, -r * 2 - 18, u.type, {
        fontFamily: 'Georgia, serif',
        fontSize: '16px',
        color: '#f4ead5',
      })
      .setOrigin(0.5, 1);
    this.body = scene.add.container(0, 0, [this.dot, this.nose]);
    this.bar = scene.add.graphics();
    this.container = scene.add.container(u.pos.x, u.pos.y, [this.body, this.bar, label]);
    this.last = { ...u.pos };
  }

  update(u: UnitState, timeMs: number): void {
    this.moving = Math.hypot(u.pos.x - this.last.x, u.pos.y - this.last.y) > 0.2;
    this.last = { ...u.pos };
    this.container.setPosition(u.pos.x, u.pos.y).setDepth(u.pos.y);
    const view = u.facing.y < 0 ? 'back' : 'front';
    const mirror = u.facing.x < 0;
    this.applyArt(manifestId(u, view), mirror);
    this.nose.setPosition(
      this.dot.x + u.facing.x * UNIT_HEIGHT * 0.25,
      this.dot.y + u.facing.y * UNIT_HEIGHT * 0.25,
    );
    // Walk bob: a small hop while moving, level when standing.
    this.body.y = this.moving && !u.ko ? -Math.abs(Math.sin(timeMs * 0.015)) * 7 : 0;
    this.body.setAngle(u.ko ? 90 : 0).setAlpha(u.ko ? 0.5 : 1);
    this.drawBar(u);
  }

  // Swaps in the sprite for this view when the manifest has it; else the placeholder stays.
  private applyArt(id: string, mirror: boolean): void {
    if (!this.scene.textures.exists(id)) {
      this.sprite?.destroy();
      this.sprite = null;
      this.dot.setVisible(true);
      this.nose.setVisible(true);
      return;
    }
    if (!this.sprite) {
      this.sprite = this.scene.add.image(0, 0, id);
      this.body.addAt(this.sprite, 0);
    }
    const anchors = this.scene.registry.get(ANCHORS_KEY) as Map<string, Vec2> | undefined;
    const a = anchors?.get(id) ?? { x: 0.5, y: 1 };
    this.sprite
      .setTexture(id)
      .setOrigin(a.x, a.y)
      .setFlipX(mirror)
      .setScale(UNIT_HEIGHT / ART_NOMINAL_PX);
    this.dot.setVisible(false);
    this.nose.setVisible(false);
  }

  private drawBar(u: UnitState): void {
    this.bar.clear();
    if (u.hp >= u.maxHp) return;
    const w = 56;
    const y = -UNIT_HEIGHT - 10;
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
      .container(0, -UNIT_HEIGHT - 44, [bg, label])
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

  lunge(toward: Vec2): void {
    const dx = toward.x - this.container.x;
    const dy = toward.y - this.container.y;
    const d = Math.hypot(dx, dy) || 1;
    this.scene.tweens.add({
      targets: this.body,
      x: (dx / d) * 18,
      y: (dy / d) * 18,
      duration: 70,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  hitFlash(): void {
    if (this.flashing) return;
    this.flashing = true;
    this.sprite?.setTintFill(0xffffff);
    this.dot.setFillStyle(0xffffff);
    this.scene.tweens.add({
      targets: this.body,
      scaleY: 0.82,
      scaleX: 1.12,
      duration: 70,
      yoyo: true,
    });
    this.scene.time.delayedCall(90, () => {
      this.flashing = false;
      this.sprite?.clearTint();
      this.dot.setFillStyle(this.baseColor);
    });
  }

  // The unit left the snapshot (died or was removed): fade out, then free the view.
  die(): void {
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      scale: 0.6,
      duration: 300,
      onComplete: () => this.container.destroy(),
    });
  }
}

// Keeps one UnitView per snapshot unit and plays the juice for sim events (hit, lunge).
export class UnitViews {
  private readonly views = new Map<number, UnitView>();

  constructor(private readonly scene: Phaser.Scene) {}

  sync(units: readonly Readonly<UnitState>[], events: readonly SimEvent[], timeMs: number): void {
    const seen = new Set<number>();
    for (const u of units) {
      seen.add(u.id);
      let view = this.views.get(u.id);
      if (!view) {
        view = new UnitView(this.scene, u);
        this.views.set(u.id, view);
      }
      view.update(u, timeMs);
    }
    // Events first: a unit that died this tick is already gone from the snapshot but still
    // has its view, so its last words can be said before the fade.
    for (const e of events) {
      if (e.kind === 'hit') this.onHit(e);
      else if (isSpeechEvent(e)) this.onSpeech(e, timeMs);
    }
    for (const [id, view] of this.views) {
      if (!seen.has(id)) {
        view.die();
        this.views.delete(id);
      }
    }
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

  private onHit(e: Extract<SimEvent, { kind: 'hit' }>): void {
    const attacker = this.views.get(e.attacker);
    const target = this.views.get(e.target);
    if (!target) return;
    attacker?.lunge({ x: target.container.x, y: target.container.y });
    if (e.dodged) return;
    target.hitFlash();
    this.floatText(target.container.x, target.container.y - UNIT_HEIGHT, `${e.damage}`);
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
