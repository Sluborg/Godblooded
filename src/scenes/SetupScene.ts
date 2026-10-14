import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, MIN_TOUCH } from '../config';
import { GRAYBOX } from '../data/graybox';
import { canAfford, pantheonName } from '../ui/altarLook';
import { makeButton, type Button } from '../ui/button';
import { fitDesignCamera } from '../ui/designCamera';
import { readMeta } from '../ui/metaStore';
import { clearSave } from '../ui/saveStore';
import { chosenLean, portentLine, toggled, trialBonus, trialRows } from '../ui/setupLook';

const FONT = 'Georgia, serif';

// The run setup (docs/systems/meta-ui.md section 5): the portent the Altar chose, the Trials (after
// the first win), a shortcut to the Altar when a rank is affordable, and Start.
export class SetupScene extends Phaser.Scene {
  private trials: string[] = [];

  constructor() {
    super('Setup');
  }

  create(): void {
    fitDesignCamera(this);
    const meta = readMeta();
    this.trials = [];
    const cx = GAME_WIDTH / 2;
    this.add
      .rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0e0b08, 0.96)
      .setInteractive();
    this.add
      .rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH - 48, GAME_HEIGHT - 48, 0x1a140f, 0.95)
      .setStrokeStyle(4, COLORS.gold, 0.6);
    this.add
      .text(cx, 56, 'THE NEXT RUN', { fontFamily: FONT, fontSize: '44px', color: '#f2c14e' })
      .setOrigin(0.5);
    makeButton(this, 130, 58, 170, MIN_TOUCH, 'Back', () => this.back());

    // The portent: a tap opens the Altar to change it.
    const lean = chosenLean(GRAYBOX, meta);
    this.add
      .text(cx, 150, portentLine(lean), { fontFamily: FONT, fontSize: '46px', color: COLORS.text })
      .setOrigin(0.5);
    this.add
      .text(cx, 196, `The ${pantheonName(lean)} gods lean on this run`, {
        fontFamily: FONT,
        fontSize: '24px',
        color: COLORS.textMuted,
      })
      .setOrigin(0.5);
    makeButton(this, cx, 262, 360, MIN_TOUCH, 'Change at the Altar', () => this.altar());

    // Trials, once they are unlocked.
    const rows = trialRows(GRAYBOX, meta);
    let bonus: Phaser.GameObjects.Text | null = null;
    if (rows.length) {
      this.add
        .text(cx, 332, 'Trials: a harder run, more Essence', {
          fontFamily: FONT,
          fontSize: '26px',
          color: '#f2c14e',
        })
        .setOrigin(0.5);
      const w = 340;
      const gap = 20;
      const x0 = cx - ((Math.min(rows.length, 3) - 1) * (w + gap)) / 2;
      const buttons: Button[] = [];
      rows.forEach((t, i) => {
        const x = x0 + (i % 3) * (w + gap);
        const y = 398 + Math.floor(i / 3) * 96;
        const b = makeButton(this, x, y, w, 84, `${t.name}${t.won ? ' ★' : ''}`, () => {
          this.trials = toggled(this.trials, t.id);
          buttons.forEach((bb, k) => bb.setActive(this.trials.includes(rows[k].id)));
          bonus?.setText(
            this.trials.length
              ? `+${trialBonus(GRAYBOX, this.trials.length)} Essence if you win`
              : '',
          );
        });
        buttons.push(b);
        this.add
          .text(x, y + 56, t.text, {
            fontFamily: FONT,
            fontSize: '18px',
            color: COLORS.textMuted,
            wordWrap: { width: w },
          })
          .setOrigin(0.5, 0);
      });
      bonus = this.add
        .text(cx, 606, '', { fontFamily: FONT, fontSize: '26px', color: '#9fd49f' })
        .setOrigin(0.5);
    }

    if (canAfford(GRAYBOX, meta)) {
      this.add
        .text(150, 650, `Essence ${meta.essence}: a rank is within reach`, {
          fontFamily: FONT,
          fontSize: '22px',
          color: '#f2c14e',
        })
        .setOrigin(0, 0.5);
    }
    makeButton(this, GAME_WIDTH - 230, 650, 320, 84, 'Start', () => this.start());
  }

  private altar(): void {
    this.registry.set('altarReturn', 'Setup');
    this.scene.stop();
    this.scene.launch('Altar');
  }

  private back(): void {
    this.scene.stop();
    this.scene.start('Title');
  }

  // Starts the run: a fresh seed, the old checkpoint dropped, the chosen Trials kept for MapScene.
  private start(): void {
    clearSave();
    this.registry.set('startMode', 'new');
    this.registry.set('runTrials', [...this.trials]);
    this.scene.stop('Hud');
    this.scene.stop();
    this.scene.start('Map');
  }
}
