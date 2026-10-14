import Phaser from 'phaser';
import { HINTS } from '../data/hints';
import { GRAYBOX } from '../data/graybox';
import type { SimEvent, Snapshot, Vec2 } from '../sim/api';
import { GAME_WIDTH } from '../config';
import { worldToHud } from './camMath';
import { HintEngine, hintLines, hintsFromEvent, type ShownHint } from './hints';
import { loadSeen, saveSeen } from './hintStore';
import { hintTargetPos, monsterSeenBy, upgradeAffordable } from './hintTarget';
import { getSettings } from './settings';
import { makePanel } from './panel';

const ITEM_SLOT = new Map((GRAYBOX.items ?? []).map((i) => [i.id, i.slot]));
const CHECK_MS = 500;

// Feeds Sim events and Scene conditions to the hint engine, and draws the bubble (top centre,
// 26 px, two lines at most) and the pulse ring on the target. A tap anywhere dismisses a hint.
export class HintDirector {
  private readonly seen = loadSeen();
  private readonly engine = new HintEngine(HINTS, this.seen, getSettings().hintsOn);
  private bubble: Phaser.GameObjects.GameObject[] = [];
  private shown: ShownHint | null = null;
  private readonly pulse: Phaser.GameObjects.Graphics;
  private nextCheck = 0;
  private started = false;
  private savedSize = this.seen.size;

  constructor(
    private readonly scene: Phaser.Scene,
    // Camera of the map, to turn a world point into a screen point.
    private readonly camera: () => Phaser.Cameras.Scene2D.Camera,
    // The screen rectangle of a HUD target (a build menu button), if it is up.
    private readonly uiRect: (id: string) => Phaser.Geom.Rectangle | null,
  ) {
    this.pulse = scene.add.graphics().setDepth(60);
    scene.input.on('pointerdown', this.onTap, this);
  }

  destroy(): void {
    this.scene.input.off('pointerdown', this.onTap, this);
    this.clearBubble();
    this.pulse.destroy();
  }

  private onTap(): void {
    if (this.engine.dismiss(this.scene.time.now)) this.persist();
  }

  // A Scene condition happened (`buildMenu`).
  fire(trigger: string, unit: number | null = null): void {
    this.engine.fire(trigger, unit);
  }

  // Hints on or off (the Settings toggle); "show again" clears what was seen.
  refreshSettings(): void {
    this.engine.setOn(getSettings().hintsOn);
    // "Show hints again" clears the stored list: take it over.
    const stored = loadSeen();
    this.seen.clear();
    for (const id of stored) this.seen.add(id);
    this.savedSize = this.seen.size;
  }

  events(events: readonly SimEvent[]): void {
    for (const e of events) {
      const r = hintsFromEvent(e as unknown as { kind: string }, (id) => ITEM_SLOT.get(id));
      this.engine.skip(...r.skip);
      for (const f of r.fire) this.engine.fire(f.trigger, f.unit, f.at ?? null);
    }
  }

  update(snap: Snapshot, gold: number): void {
    const now = this.scene.time.now;
    if (!this.started) {
      this.started = true;
      this.engine.fire('start');
    }
    if (now >= this.nextCheck) {
      this.nextCheck = now + CHECK_MS;
      const m = monsterSeenBy(snap.units);
      if (m !== null) this.engine.fire('monsterSeen', m);
      const up = upgradeAffordable(snap.buildings, gold);
      if (up !== null) this.engine.fire('upgrade', up);
    }
    const s = this.engine.update(now);
    if (s?.def.id !== this.shown?.def.id) {
      this.shown = s;
      this.drawBubble(s);
      this.persist();
    }
    this.drawPulse(snap, now);
  }

  private persist(): void {
    if (this.seen.size !== this.savedSize) {
      this.savedSize = this.seen.size;
      saveSeen(this.seen);
    }
  }

  private clearBubble(): void {
    this.bubble.forEach((o) => o.destroy());
    this.bubble = [];
  }

  private drawBubble(s: ShownHint | null): void {
    this.clearBubble();
    if (!s) return;
    const lines = hintLines(s.def);
    const text = this.scene.add
      .text(GAME_WIDTH / 2, 0, lines.join('\n'), {
        fontFamily: 'Georgia, serif',
        fontSize: '26px',
        color: '#f4ead5',
        align: 'center',
        lineSpacing: 4,
      })
      .setOrigin(0.5)
      .setDepth(62);
    const w = Math.max(360, text.width + 64);
    const h = text.height + 36;
    const y = 80 + 14 + h / 2;
    text.setY(y);
    const panel = makePanel(this.scene, GAME_WIDTH / 2, y, w, h, 0.96);
    (panel as unknown as Phaser.GameObjects.Components.Depth).setDepth(61);
    this.bubble = [panel, text];
  }

  // A ring on the target: in the world for a unit or building, round the button for a HUD target.
  private drawPulse(snap: Snapshot, now: number): void {
    const g = this.pulse;
    g.clear();
    const s = this.shown;
    if (!s) return;
    const t = (now % 1000) / 1000;
    if (s.def.target.kind === 'ui') {
      const r = this.uiRect(s.def.target.id);
      if (!r) return;
      g.lineStyle(4, 0xffffff, 1 - t).strokeRoundedRect(
        r.x - 4 - t * 10,
        r.y - 4 - t * 10,
        r.width + 8 + t * 20,
        r.height + 8 + t * 20,
        14,
      );
      return;
    }
    const p = hintTargetPos(s.def.target, snap, s.unit, s.at);
    if (!p) return;
    const c = this.toScreen(p);
    if (c.y < 72) return; // under the HUD bar
    // A plot or flag is marked at its spot; a unit or building a little above its feet.
    const up = s.def.target.kind === 'plot' || s.def.target.kind === 'flag' ? 0 : 30;
    g.lineStyle(5, 0xffffff, 1 - t).strokeCircle(c.x, c.y - up, 34 + t * 40);
    g.lineStyle(2, 0xf2c14e, 0.9).strokeCircle(c.x, c.y - up, 28);
  }

  private toScreen(p: Vec2): Vec2 {
    return worldToHud(this.camera(), p);
  }
}
