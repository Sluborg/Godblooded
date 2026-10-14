import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { heroPartsLook, partsGods } from '../data/heroParts';
import { ensureHeroSet } from '../ui/parts/bake';
import { fitDesignCamera } from '../ui/designCamera';

// A review page for the part-based heroes (`?gallery=thor`, `?gallery=all` for the gods in a
// row): every look of a god (tier 1, both paths at tiers 2 and 3) with its idle, walk, attack and
// knocked-out frames, on a grass strip. For checking the drawing and for screenshots.
export class PartsGalleryScene extends Phaser.Scene {
  constructor() {
    super('PartsGallery');
  }

  create(): void {
    fitDesignCamera(this);
    this.cameras.main.setBackgroundColor(0x3d5a2e);
    const q = new URLSearchParams(location.search).get('gallery') || 'thor';
    const all = partsGods();
    const gods = q === 'all' ? all : all.filter((g) => g.god === q);
    const looks: { god: string; path: string | null; tier: number }[] = [];
    for (const { god, paths } of gods) {
      looks.push({ god, path: null, tier: 1 });
      for (const path of paths) looks.push({ god, path, tier: 2 }, { god, path, tier: 3 });
    }
    const cell = 82;
    const rowH = Math.min(130, (GAME_HEIGHT - 20) / looks.length);
    looks.forEach((lk, r) => {
      const look = heroPartsLook(lk.god, lk.path, lk.tier);
      if (!look) return;
      const set = ensureHeroSet(this.scene.scene, look.id, look.def, lk.tier);
      const y = 14 + r * rowH + rowH * 0.78;
      this.add
        .text(8, y - rowH * 0.7, `${lk.path ?? lk.god} t${lk.tier}`, {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#f4ead5',
        })
        .setOrigin(0, 0);
      const names = [
        set.frames.idle[0],
        set.frames.idle[2],
        ...set.frames.walk,
        ...set.frames.attack,
        ...set.frames.ko.slice(1),
      ];
      const scale = (rowH * 0.9) / 66 / set.pxPerUnit;
      names.forEach((name, i) => {
        this.add
          .image(60 + i * cell, y, set.atlas, name)
          .setOrigin(set.originX, set.originY)
          .setScale(scale);
      });
    });
    void GAME_WIDTH;
  }
}
