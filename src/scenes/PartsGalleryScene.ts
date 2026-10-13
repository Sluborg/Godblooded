import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { GOD_PARTS, PATH_PARTS, heroPartsId, heroPartsRow } from '../data/heroParts';
import { GRAYBOX } from '../data/graybox';
import { ensureHeroSet } from '../ui/parts/bake';

// A review page for the part-based heroes (`?gallery=thor`, `?gallery=all` for the gods in a
// row): every look of a god (tier 1, both paths at tiers 2 and 3) with its idle, walk, attack and
// knocked-out frames, on a grass strip. For checking the drawing and for screenshots.
export class PartsGalleryScene extends Phaser.Scene {
  constructor() {
    super('PartsGallery');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x3d5a2e);
    const q = new URLSearchParams(location.search).get('gallery') || 'thor';
    const gods = q === 'all' ? Object.keys(GOD_PARTS) : [q];
    const looks: { god: string; path: string | null; tier: number }[] = [];
    for (const god of gods) {
      looks.push({ god, path: null, tier: 1 });
      for (const p of GRAYBOX.paths ?? []) {
        if (p.god !== god || !PATH_PARTS[p.id]) continue;
        looks.push({ god, path: p.id, tier: 2 }, { god, path: p.id, tier: 3 });
      }
    }
    const cell = 82;
    const rowH = Math.min(130, (GAME_HEIGHT - 20) / looks.length);
    looks.forEach((lk, r) => {
      const row = heroPartsRow(lk.god, lk.path, lk.tier);
      if (!row) return;
      const id = heroPartsId(lk.god, lk.path, lk.tier);
      const set = ensureHeroSet(this.scene.scene, id, row);
      const y = 14 + r * rowH + rowH * 0.78;
      this.add
        .text(8, y - rowH * 0.7, `${lk.path ?? lk.god} t${lk.tier}`, {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#f4ead5',
        })
        .setOrigin(0, 0);
      const keys = [
        set.keys.idle[0],
        set.keys.idle[2],
        ...set.keys.walk,
        ...set.keys.attack,
        ...set.keys.ko.slice(1),
      ];
      const scale = (rowH * 0.9) / 66 / set.pxPerUnit;
      keys.forEach((k, i) => {
        this.add
          .image(60 + i * cell, y, k)
          .setOrigin(set.originX, set.originY)
          .setScale(scale);
      });
    });
    void GAME_WIDTH;
  }
}
