// Art pipeline core (Art owns scripts/art/). Pure functions on RGBA images
// ({ width, height, data: Buffer }) plus PNG IO. Rules: docs/asset-spec.md.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { PNG } from 'pngjs';

export function readPng(path) {
  const png = PNG.sync.read(readFileSync(path));
  return { width: png.width, height: png.height, data: png.data, colorType: png.colorType };
}

export function writePng(path, { width, height, data }) {
  const png = new PNG({ width, height });
  png.data = Buffer.from(data);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, PNG.sync.write(png));
}

export function blank(width, height) {
  return { width, height, data: Buffer.alloc(width * height * 4) };
}

// Kinds by id prefix. scale: canvas height (units) or width (buildings) the nominal object
// takes, so scaling by the canvas keeps relative sizes (a tier-3 silhouette stays bigger).
// anchor: where the game places the sprite (Phaser origin), measured on the object.
export const KINDS = {
  hero: {
    re: /^hero_[a-z]+(-[a-z]+)*_t[1-3]_(front|back|side)(_(body|arm))?$/,
    dir: 'units',
    nominal: { axis: 'height', share: 0.75, px: 256 },
    anchor: 'feet',
  },
  mon: {
    re: /^mon_[a-z]+(-[a-z]+)*_t[1-3]_(front|back|side)(_(body|arm))?$/,
    dir: 'units',
    nominal: { axis: 'height', share: 0.75, px: 256 },
    anchor: 'feet',
  },
  bld: {
    re: /^bld_[a-z]+(-[a-z]+)*(_[a-z]+(-[a-z]+)*)?_t[1-3]$/,
    dir: 'buildings',
    nominal: { axis: 'width', share: 0.85, px: 512 },
    anchor: 'feet',
  },
  ter: {
    re: /^ter_[a-z0-9]+(_[a-z0-9]+)*$/,
    dir: 'terrain',
    nominal: { axis: 'width', share: 1, px: 256 },
    anchor: 'centre',
  },
  ui: {
    re: /^ui_[a-z0-9]+(_[a-z0-9]+)*$/,
    dir: 'ui',
    nominal: { axis: 'width', share: 1, px: 256 },
    anchor: 'centre',
  },
};

export function kindOf(id) {
  const kind = id.split('_')[0];
  const k = KINDS[kind];
  return k && k.re.test(id) ? { kind, ...k } : null;
}

// Tier, view and rig part from the id (null when the id has none).
export function parseId(id) {
  const tier = /_t([1-3])(?:_|$)/.exec(id);
  const view = /_(front|back|side)(?:_(body|arm))?$/.exec(id);
  return {
    tier: tier ? Number(tier[1]) : null,
    view: view ? view[1] : null,
    part: view?.[2] ?? null,
  };
}

// Key colour from the canvas border: 'green', 'magenta' or null (not a flat key).
export function detectKey(img, minShare = 0.9) {
  const { width: W, height: H, data } = img;
  let green = 0;
  let magenta = 0;
  let total = 0;
  const look = (x, y) => {
    const p = (y * W + x) * 4;
    const [r, g, b] = [data[p], data[p + 1], data[p + 2]];
    if (g > 180 && r < 100 && b < 100) green++;
    else if (r > 180 && b > 180 && g < 100) magenta++;
    total++;
  };
  for (let x = 0; x < W; x++) {
    look(x, 0);
    look(x, H - 1);
  }
  for (let y = 1; y < H - 1; y++) {
    look(0, y);
    look(W - 1, y);
  }
  if (green / total >= minShare) return { key: 'green', share: green / total };
  if (magenta / total >= minShare) return { key: 'magenta', share: magenta / total };
  return { key: null, share: Math.max(green, magenta) / total };
}

// Removes the key colour: soft alpha on the edge band, colour unmixed from the key, spill
// suppressed (the key channel never exceeds the others on kept pixels).
export function keyOut(img, key) {
  const { width: W, height: H, data } = img;
  const n = W * H;
  // Mean key colour from clearly keyed pixels.
  const isKey =
    key === 'magenta'
      ? (r, g, b) => Math.min(r, b) - g > 150
      : (r, g, b) => g - Math.max(r, b) > 150;
  const excessOf =
    key === 'magenta' ? (r, g, b) => Math.min(r, b) - g : (r, g, b) => g - Math.max(r, b);
  let bg = [0, 0, 0];
  let count = 0;
  for (let i = 0; i < n; i++) {
    const p = i * 4;
    if (isKey(data[p], data[p + 1], data[p + 2])) {
      bg[0] += data[p];
      bg[1] += data[p + 1];
      bg[2] += data[p + 2];
      count++;
    }
  }
  bg = count ? bg.map((v) => v / count) : key === 'magenta' ? [255, 0, 255] : [0, 255, 0];
  const FG = 12;
  const BG = Math.max(FG + 20, excessOf(...bg) - 40);
  const out = Buffer.alloc(n * 4);
  const cl = (v) => Math.max(0, Math.min(255, Math.round(v)));
  for (let i = 0; i < n; i++) {
    const p = i * 4;
    let r = data[p];
    let g = data[p + 1];
    let b = data[p + 2];
    const srcA = data[p + 3];
    const e = excessOf(r, g, b);
    const a = e <= FG ? 1 : e >= BG ? 0 : 1 - (e - FG) / (BG - FG);
    if (a > 0 && a < 1) {
      r = (r - (1 - a) * bg[0]) / a;
      g = (g - (1 - a) * bg[1]) / a;
      b = (b - (1 - a) * bg[2]) / a;
    }
    const spill = excessOf(r, g, b);
    if (a > 0 && spill > 0) {
      // Pull the key channel(s) down to the others: green g <= max(r, b), magenta min(r, b) <= g.
      if (key === 'magenta') {
        r -= spill;
        b -= spill;
      } else g = Math.max(r, b);
    }
    let alpha = Math.round(a * srcA);
    if (alpha < 10) alpha = 0;
    if (alpha > 245) alpha = 255;
    if (!alpha) continue;
    out[p] = cl(r);
    out[p + 1] = cl(g);
    out[p + 2] = cl(b);
    out[p + 3] = alpha;
  }
  return { width: W, height: H, data: out };
}

export function visibleMask(img, min = 1) {
  const m = new Uint8Array(img.width * img.height);
  for (let i = 0; i < m.length; i++) m[i] = img.data[i * 4 + 3] >= min ? 1 : 0;
  return m;
}

// Label 8-connected components of a 0/1 mask. Returns { labels, sizes } (sizes[0] unused).
export function components(mask, width, height) {
  const labels = new Int32Array(mask.length);
  const sizes = [0];
  const stack = [];
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i] || labels[i]) continue;
    const label = sizes.length;
    let size = 0;
    labels[i] = label;
    stack.push(i);
    while (stack.length) {
      const p = stack.pop();
      size++;
      const x = p % width;
      const y = (p - x) / width;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const q = ny * width + nx;
          if (mask[q] && !labels[q]) {
            labels[q] = label;
            stack.push(q);
          }
        }
    }
    sizes.push(size);
  }
  return { labels, sizes };
}

// Drops islands smaller than max(minPx, share of the biggest part). Returns the count dropped.
export function dropSpecks(img, { minPx = 200, share = 0.002 } = {}) {
  const { labels, sizes } = components(visibleMask(img), img.width, img.height);
  const biggest = Math.max(0, ...sizes.slice(1));
  const limit = Math.max(minPx, biggest * share);
  let dropped = 0;
  for (let i = 0; i < labels.length; i++) {
    if (labels[i] && sizes[labels[i]] < limit) {
      img.data.fill(0, i * 4, i * 4 + 4);
      dropped++;
    }
  }
  return dropped;
}

export function bbox(mask, width, height) {
  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      if (!mask[y * width + x]) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

// Box-filter resample of a source rectangle (may reach outside the image) to ow x oh,
// with premultiplied alpha so edges keep their colour.
export function resample(img, rect, ow, oh) {
  const { width: W, height: H, data } = img;
  const res = blank(ow, oh);
  const { x: cx, y: cy, w: cw, h: ch } = rect;
  for (let oy = 0; oy < oh; oy++) {
    const y0 = cy + (oy * ch) / oh;
    const y1 = cy + ((oy + 1) * ch) / oh;
    for (let ox = 0; ox < ow; ox++) {
      const x0 = cx + (ox * cw) / ow;
      const x1 = cx + ((ox + 1) * cw) / ow;
      let sr = 0;
      let sg = 0;
      let sb = 0;
      let sa = 0;
      let sw = 0;
      for (let y = Math.floor(y0); y < Math.ceil(y1); y++) {
        const wy = Math.min(y + 1, y1) - Math.max(y, y0);
        for (let x = Math.floor(x0); x < Math.ceil(x1); x++) {
          const w = wy * (Math.min(x + 1, x1) - Math.max(x, x0));
          sw += w;
          if (x < 0 || y < 0 || x >= W || y >= H) continue;
          const p = (y * W + x) * 4;
          const a = (data[p + 3] / 255) * w;
          sr += data[p] * a;
          sg += data[p + 1] * a;
          sb += data[p + 2] * a;
          sa += a;
        }
      }
      const A = sw ? sa / sw : 0;
      if (A * 255 < 3) continue;
      const q = (oy * ow + ox) * 4;
      res.data[q] = Math.round(sr / sa);
      res.data[q + 1] = Math.round(sg / sa);
      res.data[q + 2] = Math.round(sb / sa);
      res.data[q + 3] = Math.round(A * 255);
    }
  }
  return res;
}

// Anchor point on the source canvas. feet: horizontal centre of the lowest 6% of the object
// (feet or the building's base), at its bottom edge. centre: middle of the bounding box.
export function anchorPoint(img, mode) {
  const mask = visibleMask(img, 128);
  const b = bbox(mask, img.width, img.height);
  if (!b) return null;
  if (mode === 'centre') return { x: b.x + b.w / 2, y: b.y + b.h / 2, box: b };
  const band = Math.max(1, Math.round(b.h * 0.06));
  let x0 = img.width;
  let x1 = -1;
  for (let y = b.y + b.h - band; y < b.y + b.h; y++)
    for (let x = b.x; x < b.x + b.w; x++) {
      if (!mask[y * img.width + x]) continue;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
    }
  return { x: (x0 + x1 + 1) / 2, y: b.y + b.h, box: b };
}

// Raw ChatGPT canvas -> keyed full-size canvas. Throws on bad input.
export function keyRaw(raw, id) {
  const k = kindOf(id);
  if (!k) throw new Error(`${id}: id does not match docs/asset-spec.md`);
  const { key } = detectKey(raw);
  if (!key) throw new Error(`${id}: border is not a flat green or magenta key`);
  const keyed = keyOut(raw, key);
  const specks = dropSpecks(keyed);
  const canvasSide = k.nominal.axis === 'height' ? raw.height : raw.width;
  const scale = k.nominal.px / (canvasSide * k.nominal.share);
  return { k, key, keyed, specks, scale };
}

// The visible box plus a 2 px (output) margin, in source pixels.
function trimRect(box, scale) {
  const m = 2 / scale;
  return { x: box.x - m, y: box.y - m, w: box.w + 2 * m, h: box.h + 2 * m };
}

const round3 = (v) => Math.round(v * 1000) / 1000;

function crop({ keyed, scale }, rect, anchor) {
  const ow = Math.max(1, Math.round(rect.w * scale));
  const oh = Math.max(1, Math.round(rect.h * scale));
  return {
    image: resample(keyed, rect, ow, oh),
    anchorX: round3((anchor.x - rect.x) / rect.w),
    anchorY: round3((anchor.y - rect.y) / rect.h),
  };
}

// Raw ChatGPT canvas -> game sprite plus anchor (0..1, Phaser origin). Throws on bad input.
export function processImage(raw, id) {
  const r = keyRaw(raw, id);
  const anchor = anchorPoint(r.keyed, r.k.anchor);
  if (!anchor) throw new Error(`${id}: nothing left after key-out`);
  const out = crop(r, trimRect(anchor.box, r.scale), anchor);
  return { ...out, kind: r.k.kind, dir: r.k.dir, key: r.key, specks: r.specks };
}

// Shoulder pivot of a rig arm on its body (source pixels): the top of the band where arm
// pixels touch the body (within 4 px). Null when the pieces do not touch.
export function shoulderPivot(body, arm) {
  const { width: W, height: H } = body;
  const b = visibleMask(body, 128);
  const a = visibleMask(arm, 128);
  const R = 4;
  // Body mask dilated by R (square), separable max.
  const rows = new Uint8Array(b.length);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let v = 0;
      for (let d = -R; d <= R && !v; d++) {
        const xx = x + d;
        if (xx >= 0 && xx < W && b[y * W + xx]) v = 1;
      }
      rows[y * W + x] = v;
    }
  let top = H;
  let bottom = -1;
  const contact = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!a[y * W + x]) continue;
      let v = 0;
      for (let d = -R; d <= R && !v; d++) {
        const yy = y + d;
        if (yy >= 0 && yy < H && rows[yy * W + x]) v = 1;
      }
      if (!v) continue;
      contact.push([x, y]);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  if (!contact.length) return null;
  // Contact pixels in the top 12% of the arm's height (at least 8 px) below the first contact.
  const armBox = bbox(a, W, H);
  const band = Math.max(8, armBox.h * 0.12);
  const top_ = contact.filter(([, y]) => y <= top + band);
  const x = top_.reduce((s, p) => s + p[0], 0) / top_.length;
  const y = top_.reduce((s, p) => s + p[1], 0) / top_.length;
  return { x, y, contactTop: top, contactBottom: bottom };
}

// Rig pair (`<base>_body`, `<base>_arm`) -> two sprites with one shared crop and scale, so they
// stack exactly; anchor at the body's feet; pivot = shoulder, 0..1 of the shared image.
export function processPair(rawBody, rawArm, base) {
  const body = keyRaw(rawBody, `${base}_body`);
  const arm = keyRaw(rawArm, `${base}_arm`);
  if (rawBody.width !== rawArm.width || rawBody.height !== rawArm.height)
    throw new Error(`${base}: body and arm canvases differ in size`);
  const feet = anchorPoint(body.keyed, 'feet');
  const armBox = bbox(visibleMask(arm.keyed, 128), rawArm.width, rawArm.height);
  if (!feet || !armBox) throw new Error(`${base}: a piece is empty after key-out`);
  const x0 = Math.min(feet.box.x, armBox.x);
  const y0 = Math.min(feet.box.y, armBox.y);
  const x1 = Math.max(feet.box.x + feet.box.w, armBox.x + armBox.w);
  const y1 = Math.max(feet.box.y + feet.box.h, armBox.y + armBox.h);
  const rect = trimRect({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, body.scale);
  const pivot = shoulderPivot(body.keyed, arm.keyed);
  const shared = { kind: body.k.kind, dir: body.k.dir };
  const pv = pivot && {
    pivotX: round3((pivot.x - rect.x) / rect.w),
    pivotY: round3((pivot.y - rect.y) / rect.h),
  };
  return {
    body: { ...crop(body, rect, feet), ...shared, key: body.key, specks: body.specks },
    arm: { ...crop(arm, rect, feet), ...shared, key: arm.key, specks: arm.specks, ...pv },
    pivot,
  };
}

// Alpha quality of a shipped sprite.
export function alphaReport(img) {
  const a = visibleMask(img);
  let visible = 0;
  let semi = 0;
  for (let i = 0; i < a.length; i++) {
    if (!a[i]) continue;
    visible++;
    if (img.data[i * 4 + 3] < 255) semi++;
  }
  let border = 0;
  const { width: W, height: H } = img;
  for (let x = 0; x < W; x++) border += a[x] + a[(H - 1) * W + x];
  for (let y = 0; y < H; y++) border += a[y * W] + a[y * W + W - 1];
  const { sizes } = components(a, W, H);
  // Key colour left on kept pixels (strongly green or magenta).
  let keyLeft = 0;
  for (let i = 0; i < a.length; i++) {
    if (!a[i]) continue;
    const [r, g, b] = [img.data[i * 4], img.data[i * 4 + 1], img.data[i * 4 + 2]];
    if (g - Math.max(r, b) > 120 || Math.min(r, b) - g > 120) keyLeft++;
  }
  return { visible, semi, border, components: sizes.length - 1, keyLeft };
}

// Uploads in a folder: `<batch>--<id>.png` (Drive), `<id>.png` (art-inbox branch), or base64
// text `<id>.png.b64` / `.b64.001`, `.002`, ... (decoded in place). `test--` prefixed files are
// trial images. Returns [{ id, batch, test, path }].
export function collectUploads(dir) {
  const parts = {};
  for (const f of readdirSync(dir)) {
    const m = /^(.+\.png)\.b64(?:\.(\d+))?$/.exec(f);
    if (m) (parts[m[1]] ??= []).push([Number(m[2] ?? 0), f]);
  }
  for (const [png, list] of Object.entries(parts)) {
    const b64 = list
      .sort((a, b) => a[0] - b[0])
      .map(([, f]) => readFileSync(join(dir, f), 'utf-8').replace(/\s+/g, ''))
      .join('');
    writeFileSync(join(dir, png), Buffer.from(b64, 'base64'));
  }
  return readdirSync(dir)
    .filter((f) => f.endsWith('.png'))
    .sort()
    .map((f) => {
      const test = f.startsWith('test--');
      const name = f.replace(/\.png$/, '').replace(/^test--/, '');
      const m = /^([A-Z]\d+)--(.+)$/.exec(name);
      return { id: m ? m[2] : name, batch: m ? m[1] : null, test, path: join(dir, f) };
    });
}

// Gate for a raw upload before shipping: canvas, key and framing per docs/asset-spec.md.
// Returns a list of problems (empty = ok).
export function checkRaw(raw, id) {
  const problems = [];
  const k = kindOf(id);
  if (!k) return [`id "${id}" does not match docs/asset-spec.md`];
  if (raw.width !== raw.height) problems.push(`canvas ${raw.width}x${raw.height} is not square`);
  if (raw.width < 1000) problems.push(`canvas ${raw.width} px wide, expected at least 1000`);
  const { key, share } = detectKey(raw, 0.98);
  if (!key) {
    problems.push(`border only ${Math.round(share * 100)}% flat key colour`);
    return problems;
  }
  const keyed = keyOut(raw, key);
  dropSpecks(keyed);
  const a = anchorPoint(keyed, k.anchor);
  if (!a) return [...problems, 'nothing left after key-out'];
  const pct = (v) => `${Math.round(v * 100)}%`;
  if (parseId(id).part === 'arm') return problems; // a lone arm has no figure framing
  if (k.nominal.axis === 'height') {
    const h = a.box.h / raw.height;
    const feet = a.y / raw.height;
    const cx = a.x / raw.width;
    // Tier 3 may be bigger (docs/asset-spec.md, tiers).
    const maxH = parseId(id).tier === 3 ? 0.9 : 0.85;
    if (h < 0.6 || h > maxH) problems.push(`figure ${pct(h)} of canvas height, expected ~75%`);
    if (feet < 0.82 || feet > 0.94) problems.push(`feet at ${pct(feet)} height, expected ~88%`);
    if (Math.abs(cx - 0.5) > 0.08) problems.push(`feet at ${pct(cx)} across, expected centred`);
  } else if (k.kind === 'bld') {
    const w = a.box.w / raw.width;
    if (w < 0.7 || w > 0.95) problems.push(`building ${pct(w)} of canvas width, expected ~85%`);
  }
  return problems;
}
