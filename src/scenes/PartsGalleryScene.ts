import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { heroPartsLook, partsGods } from '../data/heroParts';
import { monsterPartsLook } from '../data/monsterParts';
import { ensureHeroSet, ensureWyrmSet } from '../ui/parts/bake';

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
    if (q.startsWith('wyrm')) return this.wyrmGallery();
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

  // Fafnir (`?gallery=wyrm`, `wyrm2`, `wyrm3` for the tier): a row per pose, every frame.
  private wyrmGallery(): void {
    const q = new URLSearchParams(location.search).get('gallery') ?? 'wyrm';
    const tier = Number(q.slice(4)) || 1;
    const look = monsterPartsLook('wyrm', tier);
    if (!look) return;
    const set = ensureWyrmSet(this.scene.scene, look.id, look.look);
    const poses = ['idle', 'walk', 'attack', 'breath', 'ko'] as const;
    const cw = 205;
    const ch = 140;
    const scale = 0.62 / set.pxPerUnit;
    this.add.text(8, 4, `Fafnir tier ${tier}`, {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#f4ead5',
    });
    poses.forEach((pose, r) => {
      this.add.text(8, 22 + r * ch, pose, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#f4ead5',
      });
      set.frames[pose].forEach((name, i) => {
        this.add
          .image(95 + i * cw, 22 + r * ch + 118, set.atlas, name)
          .setOrigin(set.originX, set.originY)
          .setScale(scale);
      });
    });
  }
}
