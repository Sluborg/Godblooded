// Dev only (not imported by the game): loads the Hero Builder pictures from anim-test/builder/ and
// registers the one Thorblood man for every Thor look behind `?heroes=thorbloods`, so the rig draws
// him from his saved layout (data/heroLayout.ts). Nothing here ships.
import { BEST_I_CAN_DO } from '../data/heroLayout';
import { THORBLOOD_HEADS } from '../data/heroKits';
import { BUILDS } from '../data/heroKits';
import { NATURAL, type BuilderKit } from '../ui/parts/builderLayout';
import { ballCanvas, RUNTIME_KITS } from '../ui/parts/paintedLoad';
import type { Kit, KitPart } from '../ui/parts/painted';

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((ok, bad) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => bad(new Error(`cannot load ${src}`));
    img.src = src;
  });

// A picture as a kit part whose natural width in units is `nat.w` (pixels per unit from that).
const part = (
  img: CanvasImageSource,
  w: number,
  h: number,
  nat: { w: number; pivot: [number, number] },
  pivot: string,
): KitPart => ({
  img,
  cell: { x: 0, y: 0, w, h, pivots: { [pivot]: nat.pivot } },
  ppu: w / nat.w,
});

// Multiplies a picture by a colour (the neutral cape takes the party colour).
function tinted(img: HTMLImageElement, color: string): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(img, 0, 0);
  return c;
}

export async function registerBuilderKits(): Promise<void> {
  const L = BEST_I_CAN_DO;
  const dir = '/anim-test/builder';
  const [head, body, collar, cape] = await Promise.all([
    loadImage(`${dir}/${L.head.id}.png`),
    loadImage(`${dir}/body_thorblood_ruff.png`),
    loadImage(`${dir}/collar_o28.png`),
    loadImage(`${dir}/cape_neutral.png`),
  ]);
  const hammers = await Promise.all([1, 2, 3].map((t) => loadImage(`${dir}/hammer_t${t}.png`)));
  const hand = ballCanvas('#eab48c', 96, 96);
  const foot = ballCanvas('#6b4a2c', 112, 61);
  const ball = (cv: HTMLCanvasElement, w: number): KitPart => ({
    img: cv,
    cell: { x: 0, y: 0, w: cv.width, h: cv.height, pivots: { c: [0.5, 0.5] } },
    ppu: cv.width / w,
  });
  const looks = ['thor_t1'];
  for (const path of ['thor-hammerborn', 'thor-stormcaller'])
    for (const t of [1, 2, 3]) looks.push(`${path}_t${t}`);
  for (const look of looks) {
    const tier = Number(look.match(/_t(\d)$/)?.[1] ?? 1);
    const hm = hammers[tier - 1];
    const parts: BuilderKit['parts'] = {
      head: part(head, head.width, head.height, NATURAL.head, 'neck'),
      body: part(body, body.width, body.height, NATURAL.body, 'c'),
      collar: part(collar, collar.width, collar.height, NATURAL.collar, 'c'),
      cape: part(tinted(cape, L.cape.tint), cape.width, cape.height, NATURAL.cape, 'clasp'),
      // The hammer is 28 units tall: its pixels per unit come from the height.
      weapon: {
        img: hm,
        cell: { x: 0, y: 0, w: hm.width, h: hm.height, pivots: { grip: NATURAL.weapon.pivot } },
        ppu: hm.height / NATURAL.weapon.h,
      },
      handF: ball(hand, L.handF.w ?? 6),
      handB: ball(hand, L.handB.w ?? 6),
      foot: ball(foot, L.footF.w ?? 7),
    };
    // The ball parts are separate pictures per hand/foot size; the feet share one.
    const kit: Kit = {
      parts: {},
      layers: {},
      build: BUILDS.standard,
      mode: 'floating',
      builder: { layout: L, parts },
    };
    for (const h of [...THORBLOOD_HEADS, '']) RUNTIME_KITS.set(h ? `${look}~${h}` : look, kit);
  }
}
