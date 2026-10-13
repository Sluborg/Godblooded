import Phaser from 'phaser';
import { loadManifest } from '../ui/assets';

// Loads the asset manifest, then hands over to the title screen.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    loadManifest(this, () => this.scene.start('Title'));
  }
}
