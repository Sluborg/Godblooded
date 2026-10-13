// Words and colours for the level-up screen: it must say plainly WHICH party (and which hero, for
// a path pick) just grew. Pure so the wording is tested.

// Black or white text, whichever reads better on a 0xRRGGBB fill (relative luminance).
export function readableOn(fill: number): string {
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const r = (fill >> 16) & 255;
  const g = (fill >> 8) & 255;
  const b = fill & 255;
  const lum = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return lum > 0.4 ? '#1a1410' : '#ffffff';
}

export function partyHeader(leaderLabel: string, level: number): string {
  return `Party of ${leaderLabel} reached level ${level}`;
}

export function pathHeader(heroLabel: string): string {
  return `${heroLabel} chooses a path`;
}

// The line under the header: which party and how many heroes.
export function partySubtitle(party: number, size: number): string {
  return `Party ${party} · ${size} ${size === 1 ? 'hero' : 'heroes'} grew stronger. Choose one upgrade.`;
}

// The toast after a pick: "Party of Thor-born: Iron Will".
export function pickToast(leaderLabel: string, cardName: string): string {
  return `Party of ${leaderLabel}: ${cardName}`;
}

// The toast when the party picked its card itself: "Party of Thor-born reached level 3: Iron Will".
export function autoPickToast(leaderLabel: string, level: number, cardName: string): string {
  return `${partyHeader(leaderLabel, level)}: ${cardName}`;
}

// The glow a card puts on the party: red for strength, blue for dexterity, green for stamina and
// healing, gold for anything else.
export function cardColor(effect?: {
  attr?: Partial<Record<string, number>>;
  healPct?: number;
}): number {
  const a = effect?.attr ?? {};
  if ((a.str ?? 0) > 0) return 0xff5a4a;
  if ((a.dex ?? 0) > 0) return 0x7ad7ff;
  if ((a.sta ?? 0) > 0 || (effect?.healPct ?? 0) > 0) return 0x6fcf6f;
  return 0xffd75a;
}
