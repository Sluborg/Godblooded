// A hero drawn from PAINTED part pictures instead of code shapes (Stefan, 2026-10-14: animated with
// the parts rig, but painted). The rig is the same: `pose` (proto.gen.ts) gives the joints for the
// moment, this file places the painted parts on them, and bake.ts bakes the frames as before.
// Effects (glow, aura, weapon trail, ravens) stay in code and are not drawn on a painted look yet.
//
// One painted look = one image and a manifest row `hero_<look>_parts` (look: `odin_t1`,
// `thor-hammerborn_t2`) with `pxPerUnit` (picture pixels per drawing unit; a standard hero is 44
// units head to feet) and `parts`: a rectangle per part inside the image and its pivots as fractions
// (0..1, x right, y down) of that rectangle. Missing parts are skipped (a hero with no cape or
// shield); a look with no row at all keeps the code shapes. docs/asset-spec.md, Parts sheets.

export type PartName =
  | 'body'
  | 'head'
  | 'headgear'
  | 'cape'
  | 'weapon'
  | 'foot_front'
  | 'foot_back'
  | 'hand_front'
  | 'hand_back'
  | 'shield';

export interface PartRow {
  x: number;
  y: number;
  w: number;
  h: number;
  // Pivot name -> [fx, fy]. See PIVOT_OF for the name each part uses.
  pivots?: Readonly<Record<string, readonly [number, number]>>;
}

export interface PaintedRow {
  pxPerUnit: number;
  parts: Partial<Record<PartName, PartRow>>;
}

// The pivot each part is placed by, and where it falls back to (fractions) when the row has none.
export const PIVOT_OF: Readonly<Record<PartName, { name: string; fallback: [number, number] }>> = {
  body: { name: 'neck', fallback: [0.5, 0.05] },
  head: { name: 'neck', fallback: [0.5, 0.95] },
  headgear: { name: 'brow', fallback: [0.5, 0.75] },
  cape: { name: 'shoulder', fallback: [0.7, 0.05] },
  weapon: { name: 'grip', fallback: [0.5, 0.8] },
  foot_front: { name: 'ground', fallback: [0.5, 0.95] },
  foot_back: { name: 'ground', fallback: [0.5, 0.95] },
  hand_front: { name: 'wrist', fallback: [0.5, 0.5] },
  hand_back: { name: 'wrist', fallback: [0.5, 0.5] },
  shield: { name: 'strap', fallback: [0.5, 0.5] },
};

// Where the parts meet, in drawing units with the feet at (0, 0), the same frame as `pose`.
export const RIG = {
  neck: { x: 0, y: -18.5 },
  // The head sits on the neck; its brow pivot (headgear) is this fraction down from the head top.
  browFromTop: 0.35,
  capeShoulder: { x: -1.5, y: -17 },
} as const;

// What `pose` gives (the fields the placement reads).
export interface RigPose {
  bob: number;
  lean: number;
  dx: number;
  sy: number;
  hf: { x: number; y: number };
  hb: { x: number; y: number };
  wa: number;
  f0: { x: number; y: number };
  f1: { x: number; y: number };
  rot: number;
  cape: number;
  hem: number;
}

export interface Placement {
  part: PartName;
  // World position of the part's pivot (drawing units, inside the lean/bob transform for the
  // upper parts, outside it for the feet) and the rotation in radians.
  x: number;
  y: number;
  rot: number;
  // The part is drawn inside the body transform (translate dx/bob, rotate lean, scale sy).
  inBody: boolean;
}

// Draw order for a pose: feet, then (inside the body transform) cape, back hand, body, head,
// headgear, shield, weapon and front hand. A weapon cocked behind the head is drawn first.
export function placements(
  p: RigPose,
  has: (part: PartName) => boolean,
  raised = false,
): Placement[] {
  const out: Placement[] = [];
  const add = (part: PartName, x: number, y: number, rot: number, inBody: boolean) => {
    if (has(part)) out.push({ part, x, y, rot, inBody });
  };
  add('foot_back', p.f0.x, p.f0.y, 0, false);
  add('foot_front', p.f1.x, p.f1.y, 0, false);
  add('cape', RIG.capeShoulder.x, RIG.capeShoulder.y, p.cape * 0.03 + p.hem * 0.02, true);
  add('hand_back', p.hb.x, p.hb.y, 0, true);
  add('body', RIG.neck.x, RIG.neck.y, 0, true);
  const front = () => {
    add('weapon', p.hf.x, p.hf.y, p.wa, true);
    add('hand_front', p.hf.x, p.hf.y, 0, true);
  };
  if (raised) front();
  add('head', RIG.neck.x, RIG.neck.y, 0, true);
  // The headgear and the shield follow in drawPainted (they need the head's size).
  add('headgear', RIG.neck.x, RIG.neck.y, 0, true);
  add('shield', p.hb.x - 1, p.hb.y + 0.5, 0, true);
  if (!raised) front();
  return out;
}

export const pivotOf = (row: PartRow, part: PartName): [number, number] => {
  const spec = PIVOT_OF[part];
  const v = row.pivots?.[spec.name];
  return v ? [v[0], v[1]] : [...spec.fallback];
};

type Ctx = CanvasRenderingContext2D;

// Draws a part's picture so its pivot lands on (x, y) after the given rotation.
function drawPart(
  ctx: Ctx,
  img: CanvasImageSource,
  row: PartRow,
  part: PartName,
  ppu: number,
  x: number,
  y: number,
  rot: number,
): void {
  const [fx, fy] = pivotOf(row, part);
  const dw = row.w / ppu;
  const dh = row.h / ppu;
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  ctx.drawImage(img, row.x, row.y, row.w, row.h, -fx * dw, -fy * dh, dw, dh);
  ctx.restore();
}

// Paints one frame of a painted hero. The caller has translated to the feet and set the scale to
// the bake scale; this does the rig's own body transform for the upper parts.
export function drawPainted(
  ctx: Ctx,
  img: CanvasImageSource,
  sheet: PaintedRow,
  p: RigPose,
  raised = false,
): void {
  const ppu = sheet.pxPerUnit;
  ctx.save();
  if (p.rot) ctx.rotate(p.rot);
  const has = (part: PartName) => sheet.parts[part] !== undefined;
  for (const pl of placements(p, has, raised)) {
    const row = sheet.parts[pl.part] as PartRow;
    if (pl.inBody) {
      ctx.save();
      ctx.translate(p.dx, p.bob + 0.6);
      ctx.rotate(p.lean);
      ctx.scale(1, p.sy);
    }
    const { x } = pl;
    let { y } = pl;
    if (pl.part === 'headgear') {
      // On the head's brow: a fixed fraction down from the top of the head picture.
      const head = sheet.parts.head;
      if (head) {
        const [, hfy] = pivotOf(head, 'head');
        const hh = head.h / ppu;
        y = RIG.neck.y - hfy * hh + hh * RIG.browFromTop;
      }
    }
    drawPart(ctx, img, row, pl.part, ppu, x, y, pl.rot);
    if (pl.inBody) ctx.restore();
  }
  ctx.restore();
}
