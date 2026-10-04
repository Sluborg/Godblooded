import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { GRAYBOX, UPGRADES } from '../data/graybox';
import type { MapScene } from './MapScene';

// What MapScene publishes when a party has an offer pending (the sim is frozen meanwhile).
export interface LevelUpOffer {
  party: number;
  level: number;
  size: number;
  upgrades: string[];
}

export const OFFER_KEY = 'offer';

const CARD_W = 340;
const CARD_H = 380;
const GAP = 40;
const FONT = 'Georgia, serif';

// Modal on top of everything: 3 upgrade cards, tap one. MapScene opens and closes it from the
// snapshot; picking sends the sim command, and the sim unfreezes when it accepts.
export class LevelUpScene extends Phaser.Scene {
  private toast!: Phaser.GameObjects.Text;

  constructor() {
    super('LevelUp');
  }

  create(): void {
    const offer = this.registry.get(OFFER_KEY) as LevelUpOffer | undefined;
    if (!offer) return;
    const cx = GAME_WIDTH / 2;
    // Full-screen dim, interactive so nothing underneath receives taps.
    this.add
      .rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7)
      .setInteractive();
    this.add
      .text(cx, 70, `Party level ${offer.level}`, {
        fontFamily: FONT,
        fontSize: '56px',
        color: '#f2c14e',
      })
      .setOrigin(0.5);
    this.add
      .text(
        cx,
        128,
        `${offer.size} ${offer.size === 1 ? 'hero' : 'heroes'} grew stronger. Choose one upgrade.`,
        {
          fontFamily: FONT,
          fontSize: '26px',
          color: COLORS.text,
        },
      )
      .setOrigin(0.5);
    const n = offer.upgrades.length;
    const total = n * CARD_W + (n - 1) * GAP;
    offer.upgrades.forEach((id, i) =>
      this.makeCard(id, cx - total / 2 + CARD_W / 2 + i * (CARD_W + GAP), 400, offer),
    );
    this.toast = this.add
      .text(cx, 650, '', {
        fontFamily: FONT,
        fontSize: '28px',
        color: COLORS.text,
        backgroundColor: '#000000aa',
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5)
      .setAlpha(0);
  }

  private makeCard(id: string, x: number, y: number, offer: LevelUpOffer): void {
    const def = (GRAYBOX.upgrades ?? UPGRADES).find((u) => u.id === id);
    const bg = this.add
      .rectangle(x, y, CARD_W, CARD_H, 0x2b1d14)
      .setStrokeStyle(4, COLORS.gold, 0.9)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(x, y - CARD_H / 2 + 60, def?.name ?? id, {
        fontFamily: FONT,
        fontSize: '36px',
        color: '#f2c14e',
        align: 'center',
        wordWrap: { width: CARD_W - 40 },
      })
      .setOrigin(0.5);
    this.add
      .text(x, y, def?.text ?? '', {
        fontFamily: FONT,
        fontSize: '26px',
        color: COLORS.text,
        align: 'center',
        wordWrap: { width: CARD_W - 50 },
      })
      .setOrigin(0.5);
    this.add
      .text(x, y + CARD_H / 2 - 40, 'Tap to choose', {
        fontFamily: FONT,
        fontSize: '22px',
        color: COLORS.textMuted,
      })
      .setOrigin(0.5);
    bg.on('pointerover', () => bg.setFillStyle(0x4a3322)).on('pointerout', () =>
      bg.setFillStyle(0x2b1d14),
    );
    bg.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (p.getDistance() > 10) return;
      const res = (this.scene.get('Map') as MapScene).tryPick(offer.party, id);
      if (!res.ok) this.showToast(res.reason);
    });
  }

  private showToast(text: string): void {
    this.toast.setText(text).setAlpha(1);
    this.tweens.add({ targets: this.toast, alpha: 0, delay: 1200, duration: 400 });
  }
}
