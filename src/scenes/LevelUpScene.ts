import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { GRAYBOX, UPGRADES } from '../data/graybox';
import { godName } from '../ui/partyLook';
import { partyHeader, partySubtitle, pathHeader, readableOn } from '../ui/levelUpLook';
import type { MapScene } from './MapScene';
import { fitDesignCamera } from '../ui/designCamera';

// What MapScene publishes when a party has an offer pending (the sim is frozen meanwhile).
export interface LevelUpOffer {
  party: number;
  level: number;
  size: number;
  upgrades: string[];
  // A path offer instead of upgrades: the hero's label ("Thor-born"), its god and the free paths.
  pathHero?: string;
  pathGod?: string | null;
  paths?: { id: string; god: string; name: string; pantheon: string }[];
  // Which party: its colour, its leader's label, the members (label and picture ids) and where
  // they stand. `picking` marks the hero whose path is being chosen.
  color?: number;
  leader?: string;
  members?: { id: number; label: string; art: string[]; picking?: boolean }[];
  focus?: { x: number; y: number };
}

export const OFFER_KEY = 'offer';

const CARD_W = 340;
const CARD_H = 380;
const GAP = 40;
// Cards sit below the banner, the subtitle and the row of member portraits.
const CARD_Y = 445;
const FONT = 'Georgia, serif';

// Modal on top of everything: 3 upgrade cards, tap one. MapScene opens and closes it from the
// snapshot; picking sends the sim command, and the sim unfreezes when it accepts.
export class LevelUpScene extends Phaser.Scene {
  private toast!: Phaser.GameObjects.Text;

  constructor() {
    super('LevelUp');
  }

  create(): void {
    fitDesignCamera(this);
    const offer = this.registry.get(OFFER_KEY) as LevelUpOffer | undefined;
    if (!offer) return;
    const cx = GAME_WIDTH / 2;
    if (offer.paths) {
      this.pathCards(offer, offer.paths);
      return;
    }
    // Full-screen dim, interactive so nothing underneath receives taps.
    this.add
      .rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6)
      .setInteractive();
    this.banner(
      offer,
      partyHeader(offer.leader ?? 'the party', offer.level),
      partySubtitle(offer.party, offer.size),
    );
    const n = offer.upgrades.length;
    const total = n * CARD_W + (n - 1) * GAP;
    offer.upgrades.forEach((id, i) =>
      this.makeCard(id, cx - total / 2 + CARD_W / 2 + i * (CARD_W + GAP), CARD_Y, offer),
    );
    this.makeToast();
  }

  // The header: a banner in the party's colour with who levelled, a line under it, and small
  // portraits of the members (the hero choosing a path is lit, the others dimmed).
  private banner(offer: LevelUpOffer, title: string, sub: string): void {
    const cx = GAME_WIDTH / 2;
    const fill = offer.color ?? 0x8a1c2b;
    this.add.rectangle(cx, 52, GAME_WIDTH - 120, 76, fill, 1).setStrokeStyle(4, COLORS.gold, 0.9);
    // Pennant tabs at both ends, like the party leader's flag on the map.
    this.add.triangle(76, 52, 0, -38, 0, 38, 34, 0, fill, 1).setStrokeStyle(3, COLORS.gold, 0.9);
    this.add
      .triangle(GAME_WIDTH - 76, 52, 0, -38, 0, 38, -34, 0, fill, 1)
      .setStrokeStyle(3, COLORS.gold, 0.9);
    this.add
      .text(cx, 52, title, {
        fontFamily: FONT,
        fontSize: '40px',
        color: readableOn(fill),
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(cx, 112, sub, { fontFamily: FONT, fontSize: '24px', color: COLORS.text })
      .setOrigin(0.5);
    const members = offer.members ?? [];
    const slot = 124;
    const x0 = cx - ((members.length - 1) * slot) / 2;
    members.forEach((m, i) => {
      const x = x0 + i * slot;
      const lit = offer.paths ? m.picking === true : true;
      const frame = this.add
        .rectangle(x, 184, 64, 64, 0x1a140f, 0.85)
        .setStrokeStyle(3, fill, lit ? 1 : 0.4);
      const art = m.art.find((id) => this.textures.exists(id));
      if (art) {
        const src = this.textures.get(art).getSourceImage();
        this.add
          .image(x, 184, art)
          .setScale(Math.min(60 / src.height, 60 / src.width))
          .setAlpha(lit ? 1 : 0.45);
      } else frame.setFillStyle(fill, lit ? 0.7 : 0.25);
      this.add
        .text(x, 224, m.label, {
          fontFamily: FONT,
          fontSize: '16px',
          color: lit ? COLORS.text : COLORS.textMuted,
          align: 'center',
          wordWrap: { width: 118 },
        })
        .setOrigin(0.5);
    });
  }

  private makeToast(): void {
    this.toast = this.add
      .text(GAME_WIDTH / 2, 680, '', {
        fontFamily: FONT,
        fontSize: '28px',
        color: COLORS.text,
        backgroundColor: '#000000aa',
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5)
      .setAlpha(0);
  }

  // The path pick: one card per free path of the hero's god, with the god, both of its paths
  // and a small portrait when the art exists. The sim refuses upgrades until one is picked.
  private pathCards(offer: LevelUpOffer, paths: NonNullable<LevelUpOffer['paths']>): void {
    const cx = GAME_WIDTH / 2;
    this.add
      .rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6)
      .setInteractive();
    this.banner(
      offer,
      pathHeader(offer.pathHero ?? 'A hero'),
      `Party ${offer.party} (level ${offer.level}): ${offer.pathHero ?? 'a hero'} reaches tier 2. Choose a path.`,
    );
    const n = paths.length;
    const w = Math.min(CARD_W, (GAME_WIDTH - 80 - (n - 1) * GAP) / Math.max(1, n));
    const total = n * w + (n - 1) * GAP;
    paths.forEach((p, i) =>
      this.makePathCard(p, cx - total / 2 + w / 2 + i * (w + GAP), CARD_Y, w, offer),
    );
    this.makeToast();
  }

  private makePathCard(
    p: { id: string; god: string; name: string; pantheon: string },
    x: number,
    y: number,
    w: number,
    offer: LevelUpOffer,
  ): void {
    const bg = this.add
      .rectangle(x, y, w, CARD_H, 0x2b1d14)
      .setStrokeStyle(4, COLORS.gold, 0.9)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(x, y - CARD_H / 2 + 36, godName(p.god), {
        fontFamily: FONT,
        fontSize: '36px',
        color: '#f2c14e',
        align: 'center',
        wordWrap: { width: w - 40 },
      })
      .setOrigin(0.5);
    this.add
      .text(x, y - CARD_H / 2 + 80, p.name, {
        fontFamily: FONT,
        fontSize: '26px',
        color: COLORS.text,
        align: 'center',
        wordWrap: { width: w - 40 },
      })
      .setOrigin(0.5);
    // Portrait of the tier 2 picture when it exists (the card still works without art).
    const art = [`hero_${p.id}_t2_front`, `hero_${p.god}_t1_front`].find((id) =>
      this.textures.exists(id),
    );
    if (art) {
      const frame = this.textures.get(art).getSourceImage();
      const k = Math.min(210 / frame.height, (w - 40) / frame.width);
      this.add
        .image(x, y + 30, art)
        .setOrigin(0.5, 0.5)
        .setScale(k);
    }
    const siblings = (GRAYBOX.paths ?? [])
      .filter((q) => q.god === p.god)
      .map((q) => (q.id === p.id ? `[${q.name}]` : q.name))
      .join('  ·  ');
    this.add
      .text(x, y + CARD_H / 2 - 80, `${godName(p.god)}'s paths: ${siblings}`, {
        fontFamily: FONT,
        fontSize: '18px',
        color: COLORS.textMuted,
        align: 'center',
        wordWrap: { width: w - 24 },
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
    bg.on('pointerup', (pt: Phaser.Input.Pointer) => {
      if (pt.getDistance() > 10) return;
      const res = (this.scene.get('Map') as MapScene).tryPickPath(offer.party, p.id);
      if (!res.ok) this.showToast(res.reason);
    });
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
