import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { makeButton, type Button } from '../ui/button';
import { PARTY_COLORS, PARTY_COLORS_CB } from '../ui/partyLook';
import { getSettings, updateSettings, type PaletteId, type Speed } from '../ui/settings';

const FONT = 'Georgia, serif';
const SPEEDS: Speed[] = [1, 2, 4];
const PALETTES: { id: PaletteId; label: string }[] = [
  { id: 'standard', label: 'Standard' },
  { id: 'colourblind', label: 'Colour-blind' },
];

// Settings modal, opened from the title or the pause menu: default speed, reduced motion and
// the party colour palette. Changes apply and save at once.
export class SettingsScene extends Phaser.Scene {
  private speedButtons: Button[] = [];
  private paletteButtons: Button[] = [];
  private motion!: Button;
  private swatches!: Phaser.GameObjects.Graphics;

  constructor() {
    super('Settings');
  }

  create(): void {
    this.speedButtons = [];
    this.paletteButtons = [];
    const cx = GAME_WIDTH / 2;
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0e0b08, 1).setInteractive();
    this.add
      .text(cx, 70, 'Settings', { fontFamily: FONT, fontSize: '56px', color: '#f2c14e' })
      .setOrigin(0.5);

    this.row(170, 'Default speed');
    SPEEDS.forEach((s, i) =>
      this.speedButtons.push(
        makeButton(this, 640 + i * 150, 170, 130, 80, `${s}x`, () => {
          updateSettings({ speed: s });
          this.refresh();
        }),
      ),
    );

    this.row(290, 'Reduced motion');
    this.motion = makeButton(this, 640, 290, 280, 80, '', () => {
      updateSettings({ reducedMotion: !getSettings().reducedMotion });
      this.refresh();
    });

    this.row(410, 'Party colours');
    PALETTES.forEach((p, i) =>
      this.paletteButtons.push(
        makeButton(this, 640 + i * 230, 410, 210, 80, p.label, () => {
          updateSettings({ palette: p.id });
          this.refresh();
        }),
      ),
    );
    this.swatches = this.add.graphics();

    makeButton(this, cx, 640, 300, 90, 'Back', () => this.scene.stop());
    this.refresh();
  }

  private row(y: number, label: string): void {
    this.add
      .text(110, y, label, { fontFamily: FONT, fontSize: '32px', color: COLORS.text })
      .setOrigin(0, 0.5);
  }

  private refresh(): void {
    const s = getSettings();
    this.speedButtons.forEach((b, i) => b.setActive(SPEEDS[i] === s.speed));
    this.motion.setLabel(s.reducedMotion ? 'On' : 'Off');
    this.motion.setActive(s.reducedMotion);
    this.paletteButtons.forEach((b, i) => b.setActive(PALETTES[i].id === s.palette));
    const colors = s.palette === 'colourblind' ? PARTY_COLORS_CB : PARTY_COLORS;
    this.swatches.clear();
    colors.forEach((c, i) => {
      this.swatches.fillStyle(c, 1).fillCircle(400 + i * 68, 510, 24);
      this.swatches.lineStyle(2, 0x000000, 0.6).strokeCircle(400 + i * 68, 510, 24);
    });
  }
}
