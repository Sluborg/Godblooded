import Phaser from 'phaser';
import { COLORS, GAME_WIDTH } from '../config';
import { GRAYBOX, UPGRADES } from '../data/graybox';
import type { PartyState, Snapshot, UnitState } from '../sim/api';
import { makeButton } from './button';
import { classLabel, modeLabel, partyColor, partyColorCss, traitLabel } from './partyLook';

const W = 330;
const X = GAME_WIDTH - W - 10;
const Y = 84;
const H = 480;
const FONT = 'Georgia, serif';
const ROW_H = 78;

// Side panel for the tapped hero's party: level, XP bar, upgrades and one row per member
// (class, trait, state, hp, gold). Reads the snapshot every frame; owns no rules.
export class PartyPanel {
  readonly rect = new Phaser.Geom.Rectangle(X, Y, W, H);
  private objects: Phaser.GameObjects.GameObject[] = [];
  private heroId: number | null = null;
  private builtFor = '';
  private dynamic: Phaser.GameObjects.GameObject[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  get isOpen(): boolean {
    return this.heroId !== null;
  }

  show(heroId: number): void {
    this.heroId = heroId;
    this.scene.registry.set('selectedUnit', heroId);
    this.builtFor = '';
  }

  hide(): void {
    this.destroyAll();
    this.heroId = null;
    this.builtFor = '';
    this.scene.registry.set('selectedUnit', 0);
  }

  update(snap: Snapshot): void {
    if (this.heroId === null) return;
    const hero = snap.units.find((u) => u.id === this.heroId);
    if (!hero) return this.hide();
    const party = hero.party ? snap.parties.find((p) => p.id === hero.party) : undefined;
    const members = party
      ? party.members
          .map((id) => snap.units.find((u) => u.id === id))
          .filter((u): u is UnitState => !!u)
      : [hero];
    const key = `${party?.id ?? 0}:${members.map((m) => m.id).join(',')}`;
    if (key !== this.builtFor) {
      this.build(party);
      this.builtFor = key;
    }
    this.fill(party, members, hero.id);
  }

  private destroyAll(): void {
    this.objects.forEach((o) => o.destroy());
    this.objects = [];
    this.dynamic = [];
  }

  private rowTop(i: number): number {
    return Y + 190 + i * ROW_H;
  }

  // Static frame: background, header, close button. Rows are redrawn in fill().
  private build(party: PartyState | undefined): void {
    this.destroyAll();
    const color = party ? partyColor(party.id) : 0x999999;
    const bg = this.scene.add
      .rectangle(X + W / 2, Y + H / 2, W, H, 0x120d09, 0.92)
      .setStrokeStyle(3, color, 0.95)
      .setInteractive();
    const title = this.scene.add
      .text(X + 16, Y + 40, party ? `Party ${party.id}` : 'Lone hero', {
        fontFamily: FONT,
        fontSize: '34px',
        color: party ? partyColorCss(party.id) : COLORS.text,
      })
      .setOrigin(0, 0.5);
    const close = makeButton(this.scene, X + W - 46, Y + 44, 80, 80, 'X', () => this.hide());
    this.objects.push(bg, title, close.container);
  }

  // Everything that changes while the panel is open is rebuilt each frame from the snapshot.
  private fill(party: PartyState | undefined, members: UnitState[], selected: number): void {
    this.dynamic.forEach((o) => o.destroy());
    this.dynamic = [];
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.dynamic.push(o);
      this.objects.push(o);
      return o;
    };
    const text = (x: number, y: number, s: string, size: number, color: string, ox = 0) =>
      add(
        this.scene.add
          .text(x, y, s, { fontFamily: FONT, fontSize: `${size}px`, color })
          .setOrigin(ox, 0.5),
      );
    if (party) {
      text(X + 16, Y + 100, `Level ${party.level}`, 28, COLORS.text);
      const bx = X + 140;
      const bw = W - 160;
      add(this.scene.add.rectangle(bx + bw / 2, Y + 100, bw, 18, 0x000000, 0.7));
      const frac = party.xpNext > 0 ? Math.min(1, party.xp / party.xpNext) : 0;
      add(
        this.scene.add.rectangle(
          bx + (bw * frac) / 2,
          Y + 100,
          Math.max(1, bw * frac),
          18,
          0x6aa9ff,
        ),
      );
      text(bx + bw / 2, Y + 100, `${Math.floor(party.xp)}/${party.xpNext}`, 15, '#ffffff', 0.5);
      const names = party.upgrades
        .map((id) => (GRAYBOX.upgrades ?? UPGRADES).find((u) => u.id === id)?.name ?? id)
        .join(', ');
      text(X + 16, Y + 150, names ? `Upgrades: ${names}` : 'No upgrades yet', 18, COLORS.textMuted);
    }
    members.forEach((m, i) => {
      const y = this.rowTop(i);
      if (m.id === selected)
        add(
          this.scene.add.rectangle(X + W / 2, y + ROW_H / 2 - 4, W - 12, ROW_H - 6, 0xffffff, 0.12),
        );
      text(X + 16, y + 14, `${classLabel(m.type)} · ${traitLabel(m.trait)}`, 22, COLORS.text);
      text(X + W - 16, y + 14, modeLabel(m.mode), 18, COLORS.textMuted, 1);
      const bw = 170;
      add(this.scene.add.rectangle(X + 16 + bw / 2, y + 48, bw, 14, 0x000000, 0.7));
      const f = m.maxHp > 0 ? Math.max(0, Math.min(1, m.hp / m.maxHp)) : 0;
      add(
        this.scene.add.rectangle(
          X + 16 + (bw * f) / 2,
          y + 48,
          Math.max(1, bw * f),
          14,
          m.ko ? 0x777777 : 0x6fcf6f,
        ),
      );
      text(X + W - 16, y + 48, `${Math.floor(m.gold)} gold`, 20, '#f2c14e', 1);
    });
  }
}
