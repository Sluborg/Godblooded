import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { makeButton } from '../ui/button';
import { markRunEnded } from '../ui/hintStore';
import { formatClock, sparkline, visibleHeroes } from '../ui/endReport';
import { heroLabel } from '../ui/partyLook';
import type { HeroReport, RunReport } from '../sim/api';
import type { MapScene } from './MapScene';

const FONT = 'Georgia, serif';
const ROWS = 7;

// End screen v2: the outcome and run time, the MVP hero, every hero's line, the gold curve and
// the run totals. Reads the sim's report (Snapshot.report); owns no rules.
export class EndScene extends Phaser.Scene {
  constructor() {
    super('End');
  }

  create(): void {
    const snap = (this.scene.get('Map') as MapScene).snapshot;
    // Quit from Pause: the report of the unfinished run, marked as abandoned.
    const abandoned = (this.registry.get('abandonReport') as RunReport | undefined) ?? null;
    this.registry.remove('abandonReport');
    const report = abandoned ?? snap.report;
    const won = (report?.outcome ?? snap.status) === 'won';
    const cx = GAME_WIDTH / 2;
    this.add
      .rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0e0b08, 0.94)
      .setInteractive();
    this.add
      .text(cx, 50, abandoned ? 'RUN ABANDONED' : won ? 'VICTORY' : 'TOWN LOST', {
        fontFamily: FONT,
        fontSize: '62px',
        color: abandoned ? '#c9b48a' : won ? '#f2c14e' : '#d9534f',
      })
      .setOrigin(0.5);
    this.add
      .text(cx, 100, `Run time ${formatClock(report?.timeMs ?? snap.timeMs)}`, {
        fontFamily: FONT,
        fontSize: '24px',
        color: COLORS.textMuted,
      })
      .setOrigin(0.5);
    // Fixed lines (docs/systems/hint-texts.md): the outcome, and on the first finished run a promise.
    if (!abandoned) {
      const first = markRunEnded();
      const line = [won ? 'The boss is slain.' : 'The town hall has fallen.']
        .concat(first ? ['The next run will be harder.'] : [])
        .join('  ');
      this.text(cx, 124, line, 20, '#c9b48a', 0.5);
    }

    this.heroTable(report?.heroes ?? []);
    this.mvpCard(report?.heroes.find((h) => h.mvp) ?? null);
    this.goldChart(report?.goldHistory ?? []);
    this.totals(snap.stats);

    if (abandoned) {
      makeButton(this, cx - 200, 668, 300, 80, 'Back to run', () => this.backToRun());
      makeButton(this, cx + 200, 668, 300, 80, 'Title', () => this.leaveRun());
      return;
    }
    makeButton(this, cx - 200, 668, 300, 80, 'Play again', () => this.playAgain());
    makeButton(this, cx + 200, 668, 300, 80, 'Title', () => this.toTitle());
  }

  private text(x: number, y: number, s: string, size: number, color: string, ox = 0): void {
    this.add.text(x, y, s, { fontFamily: FONT, fontSize: `${size}px`, color }).setOrigin(ox, 0.5);
  }

  private frame(x: number, y: number, w: number, h: number, title: string): void {
    this.add
      .rectangle(x + w / 2, y + h / 2, w, h, 0x1a140f, 0.9)
      .setStrokeStyle(2, COLORS.gold, 0.5);
    this.text(x + 16, y + 20, title, 22, '#f2c14e');
  }

  private heroTable(heroes: readonly HeroReport[]): void {
    const X = 40;
    const Y = 135;
    this.frame(X, Y, 600, 440, 'Heroes');
    const cols = [
      { label: 'Kills', x: 310 },
      { label: 'Lairs', x: 375 },
      { label: 'Gold', x: 445 },
      { label: 'KO', x: 515 },
      { label: 'Dmg', x: 580 },
    ];
    cols.forEach((c) => this.text(X + c.x, Y + 52, c.label, 16, COLORS.textMuted, 1));
    const { shown, hidden } = visibleHeroes(heroes, ROWS);
    shown.forEach((h, i) => {
      const y = Y + 88 + i * 46;
      const color = h.mvp ? '#f2c14e' : COLORS.text;
      this.text(X + 16, y, `${h.mvp ? '★ ' : ''}${heroLabel(h)}  T${h.tier}`, 22, color);
      const vals = [h.kills, h.lairKills, h.goldEarned, h.knockouts, Math.round(h.damage)];
      vals.forEach((v, k) => this.text(X + cols[k].x, y, `${v}`, 20, color, 1));
    });
    if (shown.length === 0) this.text(X + 16, Y + 100, 'No heroes came.', 22, COLORS.textMuted);
    if (hidden > 0) this.text(X + 16, Y + 88 + ROWS * 46, `+${hidden} more`, 18, COLORS.textMuted);
  }

  private mvpCard(h: HeroReport | null): void {
    const X = 670;
    const Y = 135;
    this.frame(X, Y, 570, 170, 'Most valuable hero');
    if (!h) return this.text(X + 16, Y + 90, 'None', 24, COLORS.textMuted);
    this.text(X + 16, Y + 70, `★ ${heroLabel(h)}  (tier ${h.tier})`, 30, '#f2c14e');
    const lines = [
      `${h.kills} kills, ${h.lairKills} lairs`,
      `${h.goldEarned} gold earned`,
      `${Math.round(h.damage)} damage${h.healing > 0 ? `, ${Math.round(h.healing)} healed` : ''}`,
      `${h.knockouts} knockouts`,
    ];
    lines.forEach((l, i) =>
      this.text(X + 16 + (i % 2) * 280, Y + 112 + Math.floor(i / 2) * 30, l, 20, COLORS.text),
    );
  }

  private goldChart(history: readonly { timeMs: number; gold: number }[]): void {
    const X = 670;
    const Y = 320;
    const W = 570;
    this.frame(X, Y, W, 255, 'Town gold');
    const bx = X + 56;
    const by = Y + 56;
    const bw = W - 80;
    const bh = 150;
    const { points, maxGold } = sparkline(history, bw, bh);
    const g = this.add.graphics();
    g.lineStyle(1, 0xffffff, 0.15).strokeRect(bx, by, bw, bh);
    g.lineStyle(3, COLORS.gold, 1).beginPath();
    points.forEach((p, i) =>
      i === 0 ? g.moveTo(bx + p.x, by + p.y) : g.lineTo(bx + p.x, by + p.y),
    );
    g.strokePath();
    this.text(bx - 8, by, `${maxGold}`, 14, COLORS.textMuted, 1);
    this.text(bx - 8, by + bh, '0', 14, COLORS.textMuted, 1);
  }

  private totals(st: {
    monstersKilled: number;
    lairsDestroyed: number;
    heroesArrived: number;
    knockouts: number;
    buildingsLost: number;
    taxCollected: number;
  }): void {
    const parts = [
      `Slain ${st.monstersKilled}`,
      `Lairs ${st.lairsDestroyed}`,
      `Heroes ${st.heroesArrived}`,
      `Knockouts ${st.knockouts}`,
      `Buildings lost ${st.buildingsLost}`,
      `Tax ${Math.floor(st.taxCollected)}`,
    ];
    this.add
      .text(GAME_WIDTH / 2, 600, parts.join('   ·   '), {
        fontFamily: FONT,
        fontSize: '20px',
        color: COLORS.textMuted,
      })
      .setOrigin(0.5);
  }

  // An abandoned run: back to the paused map, or out to the title with the run kept for Continue.
  private backToRun(): void {
    this.scene.stop();
    this.scene.launch('Pause');
  }

  private leaveRun(): void {
    (this.scene.get('Map') as MapScene).saveNow();
    this.scene.resume('Map');
    this.scene.sleep('Map');
    this.scene.sleep('Hud');
    this.scene.stop();
    this.scene.launch('Title');
  }

  private playAgain(): void {
    this.scene.stop('Hud');
    this.scene.stop();
    this.scene.start('Map');
  }

  private toTitle(): void {
    this.scene.stop('Hud');
    this.scene.stop('Map');
    this.scene.start('Title');
  }
}
