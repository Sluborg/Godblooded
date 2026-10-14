import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, MIN_TOUCH, TAP_SLOP } from '../config';
import { GRAYBOX } from '../data/graybox';
import { buyRank, pantheonsOf, refundAltar, type MetaState } from '../sim/api';
import {
  altarRows,
  BUY_HOLD_MS,
  holdFraction,
  needLine,
  pantheonGoal,
  pantheonName,
  PORTENT,
  REFUND_HOLD_MS,
  type AltarRow,
} from '../ui/altarLook';
import { makeButton, type Button } from '../ui/button';
import { sagaRows, unlockRows, type HallRow } from '../ui/hallLook';
import { fitDesignCamera } from '../ui/designCamera';
import { readMeta, writeMeta } from '../ui/metaStore';

const FONT = 'Georgia, serif';
const ROW_H = 92;
const ROWS_Y = 262;
const ROWS_H = 390;
const ROW_W = 1160;
const BTN = 84;

interface Hold {
  start: number;
  ms: number;
  ring: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  pointerY: number;
  done: () => void;
}

// The Altar (docs/systems/meta-ui.md section 3): the portent strip that picks the next run's lean,
// then a list of upgrades with rank pips and a press-and-hold cost button, and "Return to the gods".
// The sim does the buying (buyRank, refundAltar); this keeps the meta save and draws.
export class AltarScene extends Phaser.Scene {
  private meta!: MetaState;
  private rowsLayer!: Phaser.GameObjects.Container;
  private strip: Phaser.GameObjects.GameObject[] = [];
  private essenceText!: Phaser.GameObjects.Text;
  private toast!: Phaser.GameObjects.Text;
  private scroll = 0;
  private maxScroll = 0;
  private hold: Hold | null = null;
  private tab: 'altar' | 'saga' | 'unlocks' = 'altar';
  private tabButtons: Button[] = [];
  private dragFrom: { y: number; scroll: number } | null = null;

  constructor() {
    super('Altar');
  }

  create(): void {
    fitDesignCamera(this);
    this.meta = readMeta();
    this.scroll = 0;
    this.hold = null;
    this.strip = [];
    const cx = GAME_WIDTH / 2;
    this.add
      .rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0e0b08, 0.96)
      .setInteractive();
    this.add
      .rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH - 48, GAME_HEIGHT - 48, 0x1a140f, 0.95)
      .setStrokeStyle(4, COLORS.gold, 0.6);
    this.add
      .text(cx, 52, 'THE HALL', { fontFamily: FONT, fontSize: '44px', color: '#f2c14e' })
      .setOrigin(0.5);
    this.essenceText = this.add
      .text(GAME_WIDTH - 52, 52, '', { fontFamily: FONT, fontSize: '32px', color: '#f2c14e' })
      .setOrigin(1, 0.5);
    makeButton(this, 130, 58, 170, MIN_TOUCH, 'Back', () => this.back());
    this.toast = this.add
      .text(cx, 664, '', {
        fontFamily: FONT,
        fontSize: '26px',
        color: COLORS.text,
        backgroundColor: '#000000cc',
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5)
      .setDepth(10)
      .setAlpha(0);
    this.rowsLayer = this.add.container(0, 0);
    const mask = this.make
      .graphics({}, false)
      .fillStyle(0xffffff)
      .fillRect(40, ROWS_Y, GAME_WIDTH - 80, ROWS_H);
    this.rowsLayer.setMask(mask.createGeometryMask());
    // Drag the list; a press on a cost button that moves past the tap slop is a drag, not a buy.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const y = p.y / this.cameras.main.zoom + this.cameras.main.scrollY;
      if (y >= ROWS_Y && y <= ROWS_Y + ROWS_H) this.dragFrom = { y: p.y, scroll: this.scroll };
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.dragFrom || !p.isDown) return;
      this.setScroll(this.dragFrom.scroll - (p.y - this.dragFrom.y) / this.cameras.main.zoom);
    });
    this.input.on('pointerup', () => (this.dragFrom = null));
    const tabs: ['altar' | 'saga' | 'unlocks', string][] = [
      ['altar', 'Altar'],
      ['saga', 'Saga'],
      ['unlocks', 'Unlocks'],
    ];
    this.tabButtons = tabs.map(([id, label], i) =>
      makeButton(this, cx - 320 + i * 320, 140, 300, MIN_TOUCH, label, () => {
        this.tab = id;
        this.scroll = 0;
        this.renderAll();
      }),
    );
    this.renderAll();
  }

  private setScroll(v: number): void {
    this.scroll = Math.max(0, Math.min(this.maxScroll, v));
    this.rowsLayer.y = -this.scroll;
  }

  private back(): void {
    const to = (this.registry.get('altarReturn') as string | undefined) ?? 'Title';
    this.scene.stop();
    if (to === 'End' || to === 'Setup') this.scene.launch(to);
    else if (to !== 'none') this.scene.wake(to);
  }

  private say(text: string): void {
    this.tweens.killTweensOf(this.toast);
    this.toast.setText(text).setAlpha(1);
    this.tweens.add({ targets: this.toast, alpha: 0, delay: 1400, duration: 400 });
  }

  private renderAll(): void {
    this.essenceText.setText(`Essence ${this.meta.essence}`);
    const ids = ['altar', 'saga', 'unlocks'];
    this.tabButtons.forEach((b, i) => b.setActive(ids[i] === this.tab));
    this.strip.forEach((o) => o.destroy());
    this.strip = [];
    if (this.tab === 'altar') {
      this.drawStrip();
      this.drawRows();
    } else {
      this.drawHallRows(
        this.tab === 'saga' ? sagaRows(GRAYBOX, this.meta) : unlockRows(GRAYBOX, this.meta),
      );
    }
  }

  // The Saga and Unlocks tabs: plain rows, a short drag shows the rest.
  private drawHallRows(rows: HallRow[]): void {
    this.rowsLayer.removeAll(true);
    const x0 = GAME_WIDTH / 2 - ROW_W / 2;
    if (rows.length === 0) {
      this.rowsLayer.add(
        this.add
          .text(
            GAME_WIDTH / 2,
            ROWS_Y + 80,
            this.tab === 'saga' ? 'No hero has been written into the Saga yet.' : '',
            {
              fontFamily: FONT,
              fontSize: '28px',
              color: COLORS.textMuted,
            },
          )
          .setOrigin(0.5),
      );
    }
    rows.forEach((r, i) => {
      const y = ROWS_Y + i * ROW_H + ROW_H / 2;
      const L = this.rowsLayer;
      L.add(
        this.add
          .rectangle(GAME_WIDTH / 2, y, ROW_W, ROW_H - 8, r.dim ? 0x2a2420 : 0x3a2b1c, 0.95)
          .setStrokeStyle(2, COLORS.gold, r.dim ? 0.2 : 0.5),
      );
      L.add(
        this.add
          .text(x0 + 24, y - 20, r.title, {
            fontFamily: FONT,
            fontSize: '28px',
            color: r.dim ? COLORS.textMuted : '#f2c14e',
          })
          .setOrigin(0, 0.5),
      );
      L.add(
        this.add
          .text(x0 + 24, y + 18, r.sub, {
            fontFamily: FONT,
            fontSize: '22px',
            color: r.dim ? COLORS.textMuted : COLORS.text,
          })
          .setOrigin(0, 0.5),
      );
      L.add(
        this.add
          .text(x0 + ROW_W - 24, y, r.note, {
            fontFamily: FONT,
            fontSize: '26px',
            color: r.dim ? COLORS.textMuted : '#9fd49f',
          })
          .setOrigin(1, 0.5),
      );
    });
    this.maxScroll = Math.max(0, rows.length * ROW_H - ROWS_H + 10);
    this.setScroll(this.scroll);
  }

  // The portent strip: one button per pantheon, the open ones pick the next run's lean.
  private drawStrip(): void {
    this.strip.forEach((o) => o.destroy());
    this.strip = [];
    const all = [...new Set((GRAYBOX.gods ?? []).map((g) => g.pantheon))];
    const open = pantheonsOf(GRAYBOX, this.meta);
    const chosen = this.meta.lean && open.includes(this.meta.lean) ? this.meta.lean : open[0];
    const w = 340;
    const gap = 24;
    const x0 = GAME_WIDTH / 2 - ((all.length - 1) * (w + gap)) / 2;
    all.forEach((p, i) => {
      const isOpen = open.includes(p);
      const b = makeButton(
        this,
        x0 + i * (w + gap),
        216,
        w,
        MIN_TOUCH,
        isOpen ? (PORTENT[p] ?? pantheonName(p)) : `${pantheonName(p)} (locked)`,
        () => {
          if (!isOpen) return this.say(`Locked: ${pantheonGoal(GRAYBOX, p) || 'play on'}`);
          this.meta = { ...this.meta, lean: p };
          writeMeta(this.meta);
          this.drawStrip();
        },
      );
      if (!isOpen) b.container.setAlpha(0.55);
      if (isOpen && p === chosen) b.setActive(true);
      this.strip.push(b.container);
    });
  }

  private drawRows(): void {
    this.rowsLayer.removeAll(true);
    const rows = altarRows(GRAYBOX, this.meta);
    rows.forEach((r, i) => this.drawRow(r, ROWS_Y + i * ROW_H + ROW_H / 2));
    this.maxScroll = Math.max(0, rows.length * ROW_H - ROWS_H + 70);
    this.setScroll(this.scroll);
    // Return to the gods sits after the last row.
    const y = ROWS_Y + rows.length * ROW_H + 30;
    this.rowsLayer.add(
      this.holdButton(
        GAME_WIDTH / 2,
        y,
        420,
        56,
        'Return to the gods (hold)',
        REFUND_HOLD_MS,
        () => {
          this.meta = refundAltar(GRAYBOX, this.meta);
          writeMeta(this.meta);
          this.say('Every rank returned');
          this.renderAll();
        },
      ),
    );
  }

  private drawRow(r: AltarRow, y: number): void {
    const x0 = GAME_WIDTH / 2 - ROW_W / 2;
    const L = this.rowsLayer;
    const locked = r.state === 'locked';
    L.add(
      this.add
        .rectangle(GAME_WIDTH / 2, y, ROW_W, ROW_H - 8, locked ? 0x2a2420 : 0x3a2b1c, 0.95)
        .setStrokeStyle(2, COLORS.gold, locked ? 0.2 : 0.5),
    );
    L.add(
      this.add
        .text(x0 + 24, y - 20, r.name, {
          fontFamily: FONT,
          fontSize: '28px',
          color: locked ? COLORS.textMuted : '#f2c14e',
        })
        .setOrigin(0, 0.5),
    );
    L.add(
      this.add
        .text(x0 + 24, y + 18, locked ? r.goal : r.text, {
          fontFamily: FONT,
          fontSize: '22px',
          color: locked ? COLORS.textMuted : COLORS.text,
        })
        .setOrigin(0, 0.5),
    );
    if (locked) return;
    for (let i = 0; i < r.ranks; i++) {
      const pip = this.add
        .circle(x0 + 700 + i * 34, y, 11, i < r.rank ? 0xf2c14e : 0x1a140f)
        .setStrokeStyle(3, 0xf2c14e, 0.9);
      L.add(pip);
    }
    const bx = x0 + ROW_W - BTN / 2 - 16;
    if (r.state === 'full') {
      L.add(
        this.add
          .text(bx, y, 'Full', { fontFamily: FONT, fontSize: '28px', color: COLORS.textMuted })
          .setOrigin(0.5),
      );
      return;
    }
    L.add(
      this.holdButton(
        bx,
        y,
        BTN + 20,
        BTN,
        `${r.cost}`,
        BUY_HOLD_MS,
        () => this.buy(r),
        r.state === 'poor',
        () => this.say(needLine(r.need)),
      ),
    );
  }

  private buy(r: AltarRow): void {
    const res = buyRank(GRAYBOX, this.meta, r.id, r.pantheon);
    if (!res.ok) return this.say(res.reason);
    this.meta = res.meta;
    writeMeta(this.meta);
    this.renderAll();
  }

  // A button that acts after being held `ms` (a ring fills round it); a tap on a dimmed one says why.
  private holdButton(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    ms: number,
    done: () => void,
    dim = false,
    onTapDim?: () => void,
  ): Phaser.GameObjects.Container {
    const bg = this.add
      .rectangle(0, 0, w, h, dim ? 0x3a3027 : 0x8a5a2a, 1)
      .setStrokeStyle(3, COLORS.gold, dim ? 0.3 : 0.9);
    const text = this.add
      .text(0, 0, label, {
        fontFamily: FONT,
        fontSize: label.length > 6 ? '24px' : '32px',
        color: dim ? '#d9776a' : '#fff3d6',
      })
      .setOrigin(0.5);
    const ring = this.add.graphics();
    const hit = this.add.rectangle(0, 0, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
    const c = this.add.container(x, y, [bg, text, ring, hit]);
    hit.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (dim) return onTapDim?.();
      this.hold = { start: this.time.now, ms, ring, x: w, y: h, pointerY: p.y, done };
    });
    const cancel = () => {
      if (this.hold?.ring === ring) this.hold = null;
      ring.clear();
    };
    hit.on('pointerup', cancel);
    hit.on('pointerout', cancel);
    return c;
  }

  update(): void {
    const h = this.hold;
    if (!h) return;
    const p = this.input.activePointer;
    // Moving the finger past the tap slop is a scroll, not a buy.
    if (Math.abs(p.y - h.pointerY) > TAP_SLOP * 2) {
      h.ring.clear();
      this.hold = null;
      return;
    }
    const f = holdFraction(this.time.now - h.start, h.ms);
    h.ring
      .clear()
      .lineStyle(6, 0xfff3b0, 1)
      .beginPath()
      .arc(0, 0, Math.min(h.x, h.y) / 2 - 4, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2)
      .strokePath();
    if (f >= 1) {
      this.hold = null;
      h.ring.clear();
      h.done();
    }
  }
}
