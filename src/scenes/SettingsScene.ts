import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { makeButton, type Button } from '../ui/button';
import { stepVolume } from '../ui/musicPlan';
import { makePanel } from '../ui/panel';
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
  private names!: Button;
  private musicText!: Phaser.GameObjects.Text;
  private effectsText!: Phaser.GameObjects.Text;
  private muteButton!: Button;
  private swatches!: Phaser.GameObjects.Graphics;

  constructor() {
    super('Settings');
  }

  create(): void {
    this.speedButtons = [];
    this.paletteButtons = [];
    const cx = GAME_WIDTH / 2;
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0e0b08, 1).setInteractive();
    makePanel(this, cx, GAME_HEIGHT / 2, 1160, 660);
    this.add
      .text(cx, 56, 'Settings', { fontFamily: FONT, fontSize: '56px', color: '#f2c14e' })
      .setOrigin(0.5);

    this.row(135, 'Default speed');
    SPEEDS.forEach((s, i) =>
      this.speedButtons.push(
        makeButton(this, 640 + i * 150, 135, 130, 80, `${s}x`, () => {
          updateSettings({ speed: s });
          this.refresh();
        }),
      ),
    );

    this.row(220, 'Reduced motion');
    this.motion = makeButton(this, 480, 220, 190, 80, '', () => {
      updateSettings({ reducedMotion: !getSettings().reducedMotion });
      this.refresh();
    });

    this.add
      .text(680, 220, 'Hero names', { fontFamily: FONT, fontSize: '32px', color: COLORS.text })
      .setOrigin(0, 0.5);
    this.names = makeButton(this, 1030, 220, 190, 80, '', () => {
      updateSettings({ heroNames: !getSettings().heroNames });
      this.refresh();
    });

    this.row(305, 'Party colours');
    PALETTES.forEach((p, i) =>
      this.paletteButtons.push(
        makeButton(this, 640 + i * 230, 305, 210, 80, p.label, () => {
          updateSettings({ palette: p.id });
          this.refresh();
        }),
      ),
    );
    this.swatches = this.add.graphics();

    this.row(450, 'Music');
    makeButton(this, 560, 450, 90, 80, '-', () => this.nudgeMusic(-1));
    this.musicText = this.add
      .text(670, 450, '', { fontFamily: FONT, fontSize: '32px', color: COLORS.text })
      .setOrigin(0.5);
    makeButton(this, 780, 450, 90, 80, '+', () => this.nudgeMusic(1));
    this.muteButton = makeButton(this, 960, 450, 200, 80, '', () => {
      updateSettings({ musicMuted: !getSettings().musicMuted });
      this.refresh();
    });

    this.row(535, 'Effects');
    makeButton(this, 560, 535, 90, 80, '-', () => this.nudgeEffects(-1));
    this.effectsText = this.add
      .text(670, 535, '', { fontFamily: FONT, fontSize: '32px', color: COLORS.text })
      .setOrigin(0.5);
    makeButton(this, 780, 535, 90, 80, '+', () => this.nudgeEffects(1));

    makeButton(this, cx, 630, 300, 80, 'Back', () => this.scene.stop(), { sfx: 'sfx_ui_back' });
    this.refresh();
  }

  private row(y: number, label: string): void {
    this.add
      .text(110, y, label, { fontFamily: FONT, fontSize: '32px', color: COLORS.text })
      .setOrigin(0, 0.5);
  }

  private nudgeEffects(dir: 1 | -1): void {
    updateSettings({ effectsVolume: stepVolume(getSettings().effectsVolume, dir) });
    this.refresh();
  }

  private nudgeMusic(dir: 1 | -1): void {
    updateSettings({ musicVolume: stepVolume(getSettings().musicVolume, dir) });
    this.refresh();
  }

  private refresh(): void {
    const s = getSettings();
    this.musicText.setText(`${Math.round(s.musicVolume * 100)}%`);
    this.effectsText.setText(`${Math.round(s.effectsVolume * 100)}%`);
    this.muteButton.setLabel(s.musicMuted ? 'Muted' : 'Mute');
    this.muteButton.setActive(s.musicMuted);
    this.speedButtons.forEach((b, i) => b.setActive(SPEEDS[i] === s.speed));
    this.motion.setLabel(s.reducedMotion ? 'On' : 'Off');
    this.motion.setActive(s.reducedMotion);
    this.names.setLabel(s.heroNames ? 'Always' : 'On tap');
    this.names.setActive(s.heroNames);
    this.paletteButtons.forEach((b, i) => b.setActive(PALETTES[i].id === s.palette));
    const colors = s.palette === 'colourblind' ? PARTY_COLORS_CB : PARTY_COLORS;
    this.swatches.clear();
    colors.forEach((c, i) => {
      this.swatches.fillStyle(c, 1).fillCircle(400 + i * 68, 380, 24);
      this.swatches.lineStyle(2, 0x000000, 0.6).strokeCircle(400 + i * 68, 380, 24);
    });
  }
}
