import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { makeButton } from '../ui/button';
import { addSeedLabel } from '../ui/seedLabel';
import { copyReplay, replayButtonLabel } from '../ui/replayCode';
import { markRunEnded } from '../ui/hintStore';
import { formatClock, sparkline, visibleHeroes } from '../ui/endReport';
import { heroLabel } from '../ui/partyLook';
import { applyRun, type HeroReport, type RunOutcome, type RunReport } from '../sim/api';
import { GRAYBOX } from '../data/graybox';
import { readMeta, writeMeta } from '../ui/metaStore';
import { rowsShown, runningTotal, tallyRows } from '../ui/essenceTally';
import type { MapScene } from './MapScene';
import { fitDesignCamera } from '../ui/designCamera';

const FONT = 'Georgia, serif';
const ROWS = 7;

// End screen v2: the outcome and run time, the MVP hero, every hero's line, the gold curve and
// the run totals. Reads the sim's report (Snapshot.report); owns no rules.
export class EndScene extends Phaser.Scene {
  // The gold curve is showing instead of the Essence frame.
  private showDetails = false;

  constructor() {
    super('End');
  }

  create(): void {
    this.showDetails = false;
    fitDesignCamera(this);
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
    // The gold curve moves behind "Run details"; the Essence tally takes its place (meta-ui.md 2).
    const before = this.children.length;
    this.goldChart(report?.goldHistory ?? []);
    const chart = this.children.list.slice(before);
    chart.forEach((o) =>
      (o as Phaser.GameObjects.Components.Visible & Phaser.GameObjects.GameObject).setVisible(
        false,
      ),
    );
    const outcome = report && !abandoned ? this.foldRun(report) : null;
    const essenceFrom = this.children.length;
    if (outcome) this.essencePanel(outcome);
    const essence = this.children.list.slice(essenceFrom);
    if (outcome) this.detailsToggle(chart, essence);
    this.totals(snap.stats);
    if (report) addSeedLabel(this, report.seed, 16, 112);

    // A button copies the replay code when the run has one (Sim: RunReport.replay).
    const replay = report?.replay ?? null;
    const hasCode = replayButtonLabel(replay, false) !== null;
    if (abandoned) {
      const left = hasCode ? cx - 330 : cx - 200;
      const right = hasCode ? cx + 330 : cx + 200;
      this.codeButton(replay, cx);
      makeButton(this, left, 668, 300, 80, 'Back to run', () => this.backToRun());
      makeButton(this, right, 668, 300, 80, 'Title', () => this.leaveRun());
      return;
    }
    // Title, Altar, (Copy code), Play again in one row.
    const labels = hasCode ? 4 : 3;
    const w = hasCode ? 290 : 300;
    const gap = hasCode ? 20 : 30;
    const x0 = cx - ((labels - 1) * (w + gap)) / 2;
    let i = 0;
    const at = () => x0 + i++ * (w + gap);
    makeButton(this, at(), 668, w, 80, 'Title', () => this.toTitle());
    makeButton(this, at(), 668, w, 80, 'Altar', () => this.openAltar());
    if (hasCode) this.codeButton(replay, at());
    makeButton(this, at(), 668, w, 80, 'Play again', () => this.playAgain());
  }

  private codeButton(replay: RunReport['replay'] | null, x: number): void {
    if (!replay || replayButtonLabel(replay, false) === null) return;
    const copy = makeButton(
      this,
      x,
      668,
      290,
      80,
      replayButtonLabel(replay, false) ?? '',
      () =>
        void copyReplay(replay).then((ok) => {
          // The browser may refuse the clipboard (no permission, an insecure page): say so.
          copy.setLabel(replayButtonLabel(replay, ok ? true : 'failed') ?? '');
        }),
    );
  }

  // Folds the finished run into the meta save once (the End screen can be built again for the same
  // run) and returns what it paid (the same again when the screen is rebuilt, e.g. back from the Altar).
  private foldRun(report: RunReport): RunOutcome | null {
    const key = `${report.seed}:${report.timeMs}`;
    if (this.registry.get('metaApplied') === key)
      return (this.registry.get('metaOutcome') as RunOutcome | undefined) ?? null;
    this.registry.set('metaApplied', key);
    const trials = (this.scene.get('Map') as MapScene).playTrials;
    const out = applyRun(GRAYBOX, readMeta(), report, trials);
    writeMeta(out.meta);
    this.registry.set('metaOutcome', out);
    return out;
  }

  // The Essence frame: a line per source counting up (a tap jumps to the end), the total, the new
  // balance and the goals this run reached.
  private essencePanel(out: RunOutcome): void {
    const X = 670;
    const Y = 320;
    const W = 570;
    this.frame(X, Y, W, 255, 'Essence');
    const rows = tallyRows(out.essence.lines);
    const shown = rows.slice(0, 5);
    const labels = shown.map((r, i) => {
      const y = Y + 84 + i * 24;
      const t = this.add
        .text(X + 16, y, r.label, { fontFamily: FONT, fontSize: '22px', color: COLORS.text })
        .setOrigin(0, 0.5);
      const d = this.add
        .text(X + 330, y, r.detail, { fontFamily: FONT, fontSize: '20px', color: COLORS.textMuted })
        .setOrigin(1, 0.5);
      const a = this.add
        .text(X + W - 16, y, `+${r.amount}`, {
          fontFamily: FONT,
          fontSize: '24px',
          color: '#f2c14e',
        })
        .setOrigin(1, 0.5);
      return [t, d, a];
    });
    const totalY = Y + 212;
    this.add.rectangle(X + W / 2, totalY - 14, W - 32, 2, COLORS.gold, 0.4);
    const total = this.add
      .text(X + 16, totalY + 4, '', { fontFamily: FONT, fontSize: '30px', color: '#f2c14e' })
      .setOrigin(0, 0.5);
    this.add
      .text(X + W - 16, totalY + 4, `Essence ${readMeta().essence}`, {
        fontFamily: FONT,
        fontSize: '22px',
        color: COLORS.textMuted,
      })
      .setOrigin(1, 0.5);
    const unlock = out.newUnlocks.length
      ? `Unlocked: ${out.newUnlocks.map((u) => u.name).join(', ')}`
      : '';
    this.add
      .text(X + 16, Y + 243, unlock, {
        fontFamily: FONT,
        fontSize: '20px',
        color: '#9fd49f',
        wordWrap: { width: W - 32 },
      })
      .setOrigin(0, 0.5);
    const total0 = this.time.now;
    let skip = false;
    const hit = this.add.rectangle(X + W / 2, Y + 100, W, 200, 0x000000, 0).setInteractive();
    hit.on('pointerup', () => (skip = true));
    const tick = () => {
      if (this.showDetails) return;
      const t = skip ? 1e9 : this.time.now - total0;
      const n = rowsShown(shown.length, t);
      labels.forEach((l, i) => l.forEach((o) => o.setVisible(i < n)));
      total.setText(`+${runningTotal(shown, t)} Essence`);
    };
    this.events.on('update', tick);
    this.events.once('shutdown', () => this.events.off('update', tick));
  }

  // "Run details" swaps the Essence frame for the gold curve, and back.
  private detailsToggle(
    chart: Phaser.GameObjects.GameObject[],
    essence: Phaser.GameObjects.GameObject[],
  ): void {
    const btn = makeButton(this, 1135, 355, 170, 52, 'Run details', () => {
      this.showDetails = !this.showDetails;
      const details = this.showDetails;
      chart.forEach((o) =>
        (o as Phaser.GameObjects.Components.Visible & Phaser.GameObjects.GameObject).setVisible(
          details,
        ),
      );
      essence.forEach((o) =>
        (o as Phaser.GameObjects.Components.Visible & Phaser.GameObjects.GameObject).setVisible(
          !details,
        ),
      );
      btn.setLabel(details ? 'Essence' : 'Run details');
    });
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

  private openAltar(): void {
    this.registry.set('altarReturn', 'End');
    this.scene.stop();
    this.scene.launch('Altar');
  }

  // Play again goes through the run setup (the portent, the Trials).
  private playAgain(): void {
    this.scene.stop('Hud');
    this.scene.stop('Map');
    this.scene.stop();
    this.scene.start('Setup');
  }

  private toTitle(): void {
    this.scene.stop('Hud');
    this.scene.stop('Map');
    this.scene.start('Title');
  }
}
