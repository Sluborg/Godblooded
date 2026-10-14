import Phaser from 'phaser';
import { DEFAULT_TUNING, type LairState, type Snapshot } from '../sim/api';
import { getSfx } from './sfxPlayer';
import {
  PIPS_HOLD_MS,
  pipRow,
  plateColor,
  groundScale,
  ringCountdown,
  ringFill,
  ringStage,
} from './lairRingLook';

export { groundScale, plateColor };

interface Memory {
  tier: number;
  alive: number;
  nearUntilMs: number;
  spawnSpan: number;
  killFlashMs: number;
  openGlowMs: number;
  tierFlashMs: number;
  redFlashMs: number;
  drummed: boolean;
}

// The ground ellipse of a lair (lairDecal): width 300, boss 440, height 0.42 of it, centre -6.
const ELLIPSE_W = 300;
const ELLIPSE_BOSS_W = 440;

export class LairIndicators {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly texts = new Map<number, Phaser.GameObjects.Text>();
  private readonly mem = new Map<number, Memory>();

  constructor(private readonly scene: Phaser.Scene) {
    this.g = scene.add.graphics().setDepth(0.7);
  }

  destroy(): void {
    this.g.destroy();
    this.texts.forEach((t) => t.destroy());
  }

  // A raid warning names its source lair: the ring flashes red once.
  flashRed(lairId: number): void {
    const m = this.mem.get(lairId);
    if (m) m.redFlashMs = 700;
  }

  update(snap: Snapshot, dtMs: number): void {
    const g = this.g;
    g.clear();
    const seen = new Set<number>();
    const aggro = DEFAULT_TUNING.monster.lairAggro;
    const heroes = snap.units.filter((u) => u.kind === 'hero' && !u.ko);
    for (const l of snap.lairs) {
      seen.add(l.id);
      let m = this.mem.get(l.id);
      if (!m) {
        m = {
          tier: l.tier,
          alive: l.alive ?? 0,
          nearUntilMs: -Infinity,
          spawnSpan: 0,
          killFlashMs: 0,
          openGlowMs: 0,
          tierFlashMs: 0,
          redFlashMs: 0,
          drummed: false,
        };
        this.mem.set(l.id, m);
      }
      const sealed = snap.map.boss === l.id && snap.map.sealed;
      this.ring(l, m, sealed, dtMs);
      const near = heroes.some((h) => Math.hypot(h.pos.x - l.pos.x, h.pos.y - l.pos.y) <= aggro);
      if (near) m.nearUntilMs = snap.timeMs + PIPS_HOLD_MS;
      this.pips(l, m, sealed, snap.timeMs <= m.nearUntilMs, dtMs);
      m.tier = l.tier;
    }
    for (const id of [...this.mem.keys()])
      if (!seen.has(id)) {
        this.mem.delete(id);
        this.texts.get(id)?.destroy();
        this.texts.delete(id);
      }
  }

  private ring(l: LairState, m: Memory, sealed: boolean, dtMs: number): void {
    const g = this.g;
    const text = this.text(l.id);
    if (l.tier > m.tier) m.tierFlashMs = 700;
    m.tierFlashMs = Math.max(0, m.tierFlashMs - dtMs);
    m.redFlashMs = Math.max(0, m.redFlashMs - dtMs);
    const w = (l.boss ? ELLIPSE_BOSS_W : ELLIPSE_W) * groundScale(l.tier);
    const rx = w / 2 + 10;
    const ry = w * 0.21 + 6;
    const cx = l.pos.x;
    const cy = l.pos.y - 6;
    const fill = sealed ? null : ringFill(l.nextTierMs, l.tierSpanMs);
    const next = l.nextTierMs ?? null;
    text.setVisible(false);
    if (m.redFlashMs > 0)
      g.lineStyle(7, 0xff3b30, m.redFlashMs / 700).strokeEllipse(cx, cy, rx * 2, ry * 2);
    if (m.tierFlashMs > 0)
      g.lineStyle(
        8,
        Phaser.Display.Color.HexStringToColor(plateColor(l.tier)).color,
        m.tierFlashMs / 700,
      ).strokeEllipse(cx, cy, rx * 2 + 6, ry * 2 + 4);
    if (fill === null || next === null) return;
    const stage = ringStage(next);
    const t = this.scene.time.now / 1000;
    const beat = stage === 'pulse' ? 0.5 + 0.5 * Math.sin(t * Math.PI * 2) : 0;
    const color = stage === 'dim' ? 0x9a9a9a : 0xf2a62e;
    g.lineStyle(3, 0x9a9a9a, 0.18).strokeEllipse(cx, cy, rx * 2, ry * 2);
    g.lineStyle(
      stage === 'dim' ? 3 : 4 + beat * 3,
      color,
      stage === 'dim' ? 0.55 : 0.8 + beat * 0.2,
    );
    g.beginPath();
    const steps = Math.max(2, Math.round(fill * 72));
    for (let i = 0; i <= steps; i++) {
      const a = -Math.PI / 2 + (i / steps) * fill * Math.PI * 2;
      const x = cx + Math.cos(a) * rx;
      const y = cy + Math.sin(a) * ry;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.strokePath();
    const secs = ringCountdown(next);
    if (secs !== null) {
      text
        .setText(`${secs}`)
        .setPosition(cx + 126, l.pos.y + 46)
        .setVisible(true);
    }
    // One soft drum beat per tier-up, when the last 15 s begin.
    if (stage === 'pulse' && !m.drummed) {
      m.drummed = true;
      getSfx(this.scene).play({ id: 'sfx_drum' });
    }
    if (stage !== 'pulse') m.drummed = false;
  }

  private pips(l: LairState, m: Memory, sealed: boolean, shown: boolean, dtMs: number): void {
    const max = l.maxAlive ?? 0;
    const alive = l.alive ?? 0;
    m.killFlashMs = Math.max(0, m.killFlashMs - dtMs);
    m.openGlowMs = Math.max(0, m.openGlowMs - dtMs);
    if (alive < m.alive) {
      m.killFlashMs = 600;
      if (alive === 0 && max > 0) m.openGlowMs = 900;
    }
    m.alive = alive;
    // The wait is the longest nextSpawnMs seen since the last spawn.
    const nextSpawn = l.nextSpawnMs ?? null;
    if (nextSpawn === null) m.spawnSpan = 0;
    else m.spawnSpan = Math.max(m.spawnSpan, nextSpawn);
    if (sealed || max <= 0 || !shown) return;
    const g = this.g;
    const share = nextSpawn !== null && m.spawnSpan > 0 ? 1 - nextSpawn / m.spawnSpan : 0;
    const row = pipRow(alive, max, share);
    const gap = 17;
    const x0 = l.pos.x - ((row.length - 1) * gap) / 2;
    const y = l.pos.y + 76;
    if (m.openGlowMs > 0)
      g.fillStyle(0xfff0b0, 0.35 * (m.openGlowMs / 900)).fillEllipse(
        l.pos.x,
        l.pos.y + 46,
        190,
        40,
      );
    row.forEach((p, i) => {
      const x = x0 + i * gap;
      g.fillStyle(0x1a1410, 0.85).fillCircle(x, y, 8);
      if (p.kind === 'alive') g.fillStyle(0xf4ead5, 1).fillCircle(x, y, 6);
      else if (p.kind === 'filling' && p.fill > 0)
        g.fillStyle(0xf4ead5, 0.55).fillCircle(x, y, 6 * p.fill);
      g.lineStyle(2, 0xd9c9a8, 0.9).strokeCircle(x, y, 8);
      // The newest empty slot flashes red when a guard dies.
      if (p.kind !== 'alive' && i === alive && m.killFlashMs > 0)
        g.fillStyle(0xff3b30, m.killFlashMs / 600).fillCircle(x, y, 8);
    });
  }

  private text(id: number): Phaser.GameObjects.Text {
    let t = this.texts.get(id);
    if (!t) {
      t = this.scene.add
        .text(0, 0, '', {
          fontFamily: 'Georgia, serif',
          fontSize: '26px',
          color: '#f4ead5',
          backgroundColor: '#1a1410dd',
          padding: { x: 8, y: 2 },
        })
        .setOrigin(0, 0.5)
        .setDepth(900_000);
      this.texts.set(id, t);
    }
    return t;
  }
}
