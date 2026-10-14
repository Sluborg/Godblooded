import Phaser from 'phaser';
import type { Snapshot } from '../sim/api';

// The sim's intent kinds, read off the snapshot type (api.ts does not export them by name).
export type PartyIntent = Snapshot['parties'][number]['intent'];
export type IntentKind = PartyIntent['kind'];

// The icon over a party's head for what it is doing (docs/systems/hero-ai.md section 2): coin
// over a flag, crossed swords, a red skull, a compass, a broken shield, a coin bag, a bed, a tower.
// Drawn in code until Art's 8 intent icons (UI kit style) ship. Pure data plus one drawing function.

export interface IntentLook {
  // The ring round the icon.
  color: number;
  // Small and dim: the party is resting, not doing anything to watch.
  dim: boolean;
  // A line of text for tests and the party card.
  label: string;
}

export const INTENT_LOOK: Record<IntentKind, IntentLook> = {
  flag: { color: 0xf2c14e, dim: false, label: 'Heading for a flag' },
  lair: { color: 0xd9534f, dim: false, label: 'Attacking a lair' },
  revenge: { color: 0xc4281e, dim: false, label: 'Sworn to avenge' },
  explore: { color: 0x7fb6e0, dim: false, label: 'Exploring' },
  retreat: { color: 0xb8b8c0, dim: false, label: 'Falling back' },
  shop: { color: 0xf2c14e, dim: false, label: 'Going shopping' },
  rest: { color: 0x9a9aa8, dim: true, label: 'Resting' },
  defend: { color: 0x9fc9a0, dim: false, label: 'Defending the town' },
};

export function isIntentKind(k: string): k is IntentKind {
  return k in INTENT_LOOK;
}

// Draws the icon centred on (x, y), about 30 px across.
export function drawIntentIcon(
  g: Phaser.GameObjects.Graphics,
  kind: IntentKind,
  x: number,
  y: number,
  t: number,
): void {
  const look = INTENT_LOOK[kind];
  const a = look.dim ? 0.55 : 1;
  const r = look.dim ? 12 : 15;
  g.fillStyle(0x1a1410, 0.82 * a).fillCircle(x, y, r);
  g.lineStyle(2, look.color, a).strokeCircle(x, y, r);
  g.fillStyle(look.color, a);
  g.lineStyle(2.4, look.color, a);
  switch (kind) {
    case 'flag':
      g.lineBetween(x - 4, y + 8, x - 4, y - 8);
      g.fillTriangle(x - 4, y - 8, x + 8, y - 4, x - 4, y);
      g.fillStyle(0xfff0b0, a).fillCircle(x + 5, y + 6, 3);
      break;
    case 'lair':
      g.lineBetween(x - 8, y + 8, x + 8, y - 8);
      g.lineBetween(x + 8, y + 8, x - 8, y - 8);
      g.lineBetween(x - 10, y + 4, x - 4, y + 10);
      g.lineBetween(x + 10, y + 4, x + 4, y + 10);
      break;
    case 'revenge':
      g.fillStyle(0xf4ead5, a).fillCircle(x, y - 2, 8);
      g.fillRect(x - 5, y + 3, 10, 6);
      g.fillStyle(0x1a1410, a)
        .fillCircle(x - 3, y - 3, 2.2)
        .fillCircle(x + 3, y - 3, 2.2);
      break;
    case 'explore': {
      // A compass needle that wobbles a little.
      const w = Math.sin(t * 2.5) * 0.35;
      g.lineStyle(1.5, look.color, a).strokeCircle(x, y, 9);
      const nx = Math.sin(w) * 9;
      const ny = -Math.cos(w) * 9;
      g.fillStyle(0xd9534f, a).fillTriangle(
        x + nx,
        y + ny,
        x - ny * 0.3,
        y + nx * 0.3,
        x + ny * 0.3,
        y - nx * 0.3,
      );
      g.fillStyle(0xf4ead5, a).fillTriangle(
        x - nx,
        y - ny,
        x - ny * 0.3,
        y + nx * 0.3,
        x + ny * 0.3,
        y - nx * 0.3,
      );
      break;
    }
    case 'retreat':
      g.fillTriangle(x - 9, y - 8, x + 9, y - 8, x, y + 10);
      g.lineStyle(2.5, 0x1a1410, a)
        .lineBetween(x - 2, y - 9, x + 3, y + 1)
        .lineBetween(x + 3, y + 1, x - 1, y + 9);
      break;
    case 'shop':
      g.fillCircle(x, y + 3, 8);
      g.fillRect(x - 3, y - 8, 6, 5);
      g.fillStyle(0x1a1410, a).fillCircle(x, y + 3, 3);
      break;
    case 'rest':
      g.fillRect(x - 10, y, 20, 5);
      g.fillRect(x - 10, y - 6, 4, 11);
      g.fillStyle(0xf4ead5, a).fillRect(x - 5, y - 5, 9, 5);
      break;
    case 'defend':
      g.fillRect(x - 6, y - 3, 12, 12);
      g.fillRect(x - 8, y - 9, 4, 6)
        .fillRect(x - 2, y - 9, 4, 6)
        .fillRect(x + 4, y - 9, 4, 6);
      g.fillStyle(0x1a1410, a).fillRect(x - 2, y + 3, 4, 6);
      break;
  }
}
