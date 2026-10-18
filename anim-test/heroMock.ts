// Dev only: the hero style animation mock. Draws the compact rig (src/ui/parts/painted.ts layout and
// drawKit) from keyframed poses that follow the weapon stance table (docs/game-design.md "Hero
// animation: compact rig and weapon stances"), on a plain grass patch, one canvas frame at a time.
// scripts/anim-mock-record.mjs loads this page and grabs the frames. Nothing here ships.
import { BUILDS } from '/src/data/heroKits';
import { drawKit, layout, pivot, PROTO_K } from '/src/ui/parts/painted';
import type { Draw, Kit, KitPart, RigPose } from '/src/ui/parts/painted';

type Stance = 'hammer' | 'sword' | 'dagger' | 'staff' | 'spear';
export interface MockHero {
  kit: string;
  stance: Stance;
  // Where it stands in a line (kit units) and its walk phase.
  x: number;
  y?: number;
  phase: number;
  // Which ball hand holds a one-handed weapon: the front one (default) or the back one, next to the cape.
  side?: 'front' | 'back';
  label?: string;
  // Glow colour of a cast (r, g, b); the staffs have one.
  glow?: [number, number, number];
}
interface Loaded {
  kit: Kit;
  stance: Stance;
  weapon: KitPart | undefined;
}

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((ok, bad) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => bad(new Error(`cannot load ${src}`));
    img.src = src;
  });

interface PartJson {
  file: string;
  w: number;
  h: number;
  pivots: Record<string, [number, number]>;
}

export async function loadKit(name: string): Promise<Kit> {
  const json = await (await fetch(`/anim-test/${name}/kit.json`)).json();
  const parts: Record<string, KitPart> = {};
  for (const [slot, spec] of Object.entries(json.parts) as [string, PartJson][]) {
    parts[slot] = {
      img: await loadImage(`/anim-test/${name}/${spec.file}`),
      cell: { x: 0, y: 0, w: spec.w, h: spec.h, pivots: spec.pivots },
      ppu: json.ppu,
    };
  }
  return { parts: parts as Kit['parts'], layers: {}, build: BUILDS.standard, mode: 'floating' };
}

const ease = (u: number) => u * u * (3 - 2 * u);
// The channels of a pose (prototype units, x forward, y up is negative).
interface Ch {
  hfx: number;
  hfy: number;
  wa: number;
  hbx: number;
  hby: number;
  wb: number;
  lean: number;
  dx: number;
  bob: number;
  f0x: number;
  f0y: number;
  f1x: number;
  f1y: number;
  cape: number;
  hem: number;
}
const base = (): Ch => ({
  hfx: 6.5,
  hfy: -9,
  wa: 0.4,
  hbx: -6,
  hby: -9,
  wb: 0,
  lean: 0,
  dx: 0,
  bob: 0,
  f0x: 0,
  f0y: 0,
  f1x: 0,
  f1y: 0,
  cape: 2,
  hem: 0,
});
const lerpCh = (a: Ch, b: Ch, u: number): Ch => {
  const o = {} as Ch;
  for (const k of Object.keys(a) as (keyof Ch)[]) o[k] = a[k] + (b[k] - a[k]) * u;
  return o;
};
const mk = (o: Partial<Ch>): Ch => ({ ...base(), ...o });

// The staff's second hand sits on the haft, `d` prototype units from the main hand along it.
const stick = (c: Ch, d: number): Ch => ({
  ...c,
  hbx: c.hfx + Math.sin(c.wa) * d,
  hby: c.hfy - Math.cos(c.wa) * d,
});

// Carry (walking / idle) per stance: weapon at the side; the staff on the shoulder.
const carry = (s: Stance): Ch =>
  s === 'staff'
    ? mk({ hfx: 10, hfy: -8, wa: 0.1, hbx: -5.5, hby: -10 })
    : s === 'dagger'
      ? mk({ hfx: 6, hfy: -9, wa: 0.5 })
      : s === 'sword'
        ? mk({ hfx: 6.5, hfy: -9, wa: 0.6, hbx: -5, hby: -11 })
        : s === 'spear'
          ? mk({ hfx: 5, hfy: -10, wa: -0.55, hbx: 5, hby: -11 })
          : mk({ hfx: 3, hfy: -13, wa: -1.0, hbx: -5, hby: -10 });
// Guard: hammer and sword cocked back, dagger front low, staff front; lead foot per the table.
const guard = (s: Stance): Ch => {
  if (s === 'staff')
    return stick(mk({ hfx: 8, hfy: -14, wa: 0.25, f0x: 3, f1x: -2.5, lean: 0.04 }), 8);
  if (s === 'spear')
    return mk({ hfx: -1, hfy: -10, wa: 0.85, hbx: 8, hby: -12, f0x: 3.5, f1x: -2.5, lean: 0.02 });
  if (s === 'dagger')
    return mk({ hfx: 8, hfy: -9, wa: 0.95, hbx: -5, hby: -11, f1x: 3, f0x: -2.5, lean: 0.05 });
  if (s === 'sword')
    return mk({
      hfx: 1.5,
      hfy: -17,
      wa: -1.15,
      hbx: -3,
      hby: -11,
      f0x: 3.5,
      f1x: -2.5,
      lean: -0.02,
    });
  return mk({ hfx: 2, hfy: -18, wa: -0.95, hbx: -4, hby: -11, f0x: 3.5, f1x: -2.5, lean: -0.02 });
};

// The attack: windup, strike, hit pause, follow-through. Returns the channels and the hit time.
function attack(s: Stance, t: number): { ch: Ch; dur: number; hitAt: number } {
  const g = guard(s);
  if (s === 'spear') {
    const D = 0.85;
    const pull = mk({ ...g, hfx: -4, hfy: -9, wa: 0.95, lean: -0.1, dx: -1.5, cape: -1 });
    const thrust = mk({
      ...g,
      hfx: 17,
      hfy: -12,
      wa: 1.4,
      lean: 0.18,
      dx: 4.5,
      hbx: 10,
      cape: 6,
      f0x: 5.5,
      f1x: -1.5,
    });
    const ch =
      t < 0.3
        ? lerpCh(g, pull, ease(t / 0.3))
        : t < 0.4
          ? lerpCh(pull, thrust, ease((t - 0.3) / 0.1))
          : t < 0.5
            ? thrust
            : lerpCh(thrust, g, ease(Math.min(1, (t - 0.5) / 0.35)));
    return { ch, dur: D, hitAt: 0.4 };
  }
  if (s === 'dagger') {
    const D = 0.55;
    const pull = mk({ ...g, hfx: 3.5, hfy: -10, wa: 0.75, lean: -0.05, dx: -1 });
    const stab = mk({ ...g, hfx: 14.5, hfy: -12, wa: 1.45, lean: 0.1, dx: 2.5, cape: 6 });
    const ch =
      t < 0.12
        ? lerpCh(g, pull, ease(t / 0.12))
        : t < 0.2
          ? lerpCh(pull, stab, ease((t - 0.12) / 0.08))
          : t < 0.26
            ? stab
            : lerpCh(stab, g, ease(Math.min(1, (t - 0.26) / 0.29)));
    return { ch, dur: D, hitAt: 0.2 };
  }
  if (s === 'staff') {
    const D = 1.2;
    // Raised high to cast: the staff up above the head, held, the glow at its top.
    const up = mk({ ...g, hfx: 6, hfy: -31, wa: 0.0, lean: -0.05, dx: -0.5, cape: 1 });
    const ch =
      t < 0.45
        ? lerpCh(g, up, ease(t / 0.45))
        : t < 0.95
          ? up
          : lerpCh(up, g, ease(Math.min(1, (t - 0.95) / 0.25)));
    return { ch: stick(ch, 9), dur: D, hitAt: 0.5 };
  }
  // hammer chop and sword slash: from the back.
  const D = s === 'sword' ? 0.8 : 0.9;
  const wind =
    s === 'sword'
      ? mk({ ...g, hfx: -1.5, hfy: -22, wa: -1.55, lean: -0.14, dx: -1.5, hbx: -3, cape: -1 })
      : mk({ ...g, hfx: -2, hfy: -25, wa: -1.75, lean: -0.15, dx: -1.8, cape: -1 });
  const hit =
    s === 'sword'
      ? mk({
          ...g,
          hfx: 11,
          hfy: -10,
          wa: 1.5,
          lean: 0.18,
          dx: 2.5,
          hbx: -1,
          hby: -12,
          cape: 5,
          f1x: 0.5,
        })
      : mk({ ...g, hfx: 11, hfy: -9, wa: 1.55, lean: 0.22, dx: 3.5, cape: 6, f0x: 5, f1x: -1.5 });
  const tw = 0.3;
  const th = 0.36;
  const ts = th + 0.1;
  const ch =
    t < tw
      ? lerpCh(g, wind, ease(t / tw))
      : t < th
        ? wind
        : t < ts
          ? lerpCh(wind, hit, ease((t - th) / (ts - th)))
          : t < ts + 0.09
            ? hit
            : lerpCh(hit, g, ease(Math.min(1, (t - ts - 0.09) / (D - ts - 0.09))));
  return { ch, dur: D, hitAt: ts };
}

// Idle: carry with a slow bob and cape sway; walk: feet on one line, toes lift, hands swing a little.
function walkCh(s: Stance, t: number, phase: number): Ch {
  const c = carry(s);
  const w = t * 2 * Math.PI * 1.55 + phase;
  const step = Math.sin(w);
  c.f0x = step * 5;
  c.f1x = -step * 5;
  c.f0y = -Math.max(0, Math.cos(w)) * 1.8;
  c.f1y = -Math.max(0, -Math.cos(w)) * 1.8;
  c.bob = -Math.abs(Math.sin(w)) * 0.9;
  c.lean = 0.05;
  c.cape = 5 + 2 * Math.sin(w * 2 + 0.6);
  c.hem = 2 * Math.sin(w * 2);
  c.hfy += Math.sin(w * 2) * 0.35;
  if (s === 'staff') c.wa += Math.sin(w) * 0.07;
  if (s !== 'staff') c.hby += Math.sin(w) * 0.5;
  else {
    c.hbx += step * 2.2;
  }
  return c;
}
function idleCh(s: Stance, t: number, phase: number): Ch {
  const c = carry(s);
  c.bob = Math.sin(t * 2.2 + phase) * 0.3;
  c.cape = 1.5 + 1.4 * Math.sin(t * 1.7 + phase);
  c.hem = Math.sin(t * 1.3 + phase);
  c.hfy += Math.sin(t * 2.2 + phase + 0.5) * 0.25;
  return c;
}

// The weapon in the BACK hand (next to the cape): the hand stays further back and crosses over the
// body in the strike; the free hand takes the front side.
const backHand = (c: Ch): Ch => {
  const u = Math.min(1, Math.max(0, (c.hfx + 2) / 13));
  return {
    ...c,
    hfx: c.hfx - 8 + 6 * u,
    hbx: 6.5 + u * 2.5,
    hby: -10 + c.bob * 0.3,
    wb: 0,
  };
};

const toPose = (c: Ch): RigPose => ({
  bob: c.bob,
  lean: c.lean,
  dx: c.dx,
  sy: 1,
  hf: { x: c.hfx, y: c.hfy },
  hb: { x: c.hbx, y: c.hby },
  wa: c.wa,
  wb: c.wb,
  f0: { x: c.f0x, y: c.f0y },
  f1: { x: c.f1x, y: c.f1y },
  rot: 0,
  cape: c.cape,
  hem: c.hem,
});

// ---------- scene ----------
const rngv = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// The share of the body ball still visible with everything drawn over it (head, hands, boots,
// weapon, shield): the style rule says at least 40 percent.
function ballVisible(kit: Kit, draws: Draw[], pose: RigPose): number {
  const idx = draws.findIndex((d) => d.part === kit.parts.torso);
  if (idx < 0) return 1;
  const c = document.createElement('canvas');
  c.width = 260;
  c.height = 260;
  const ctx = c.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
  const count = () => {
    const a = ctx.getImageData(0, 0, 260, 260).data;
    let n = 0;
    for (let i = 3; i < a.length; i += 4) if (a[i] > 128) n++;
    return n;
  };
  ctx.setTransform(4, 0, 0, 4, 130, 200);
  drawKit(ctx, [draws[idx]], pose);
  const a0 = count();
  ctx.globalCompositeOperation = 'destination-out';
  drawKit(ctx, draws.slice(idx + 1), pose);
  return a0 ? count() / a0 : 1;
}

export class Mock {
  heroes: Loaded[] = [];
  measure = false;
  vis: number[][] = [];
  constructor(
    readonly canvas: HTMLCanvasElement,
    readonly specs: MockHero[],
  ) {}
  visStats(): { min: number; mean: number }[] {
    return this.vis.map((v) => ({
      min: Math.min(...v),
      mean: v.reduce((a, b) => a + b, 0) / v.length,
    }));
  }
  async load(): Promise<void> {
    for (const s of this.specs) {
      const kit = await loadKit(s.kit);
      this.heroes.push({ kit, stance: s.stance, weapon: kit.parts.weapon });
    }
  }

  // `clip`: 'solo' (idle 1.2 s, walk 1.8 s, then two attacks) or 'line' (all walk).
  // `scale`: CSS pixels per kit unit (1.2 at game size, 2.4 at 2x).
  frame(clip: 'solo' | 'line', i: number, scale: number, w: number, h: number): string {
    const dpr = 2;
    const c = this.canvas;
    c.width = w * dpr;
    c.height = h * dpr;
    const ctx = c.getContext('2d') as CanvasRenderingContext2D;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const t = i / 15;
    // Grass: flat with scrolling tufts while walking.
    ctx.fillStyle = '#7f9450';
    ctx.fillRect(0, 0, w, h);
    const groundY = h * 0.72;
    const scroll =
      clip === 'line'
        ? t * 40 * scale * 0.45
        : t >= 1.2 && t < 3
          ? (t - 1.2) * 40 * scale * 0.45
          : t >= 3
            ? 1.8 * 40 * scale * 0.45
            : 0;
    ctx.strokeStyle = '#5d7434';
    ctx.lineWidth = 1.1 * Math.max(1, scale / 1.2);
    for (let n = 0; n < 90; n++) {
      const x = ((((rngv(n) * w * 1.4 - scroll) % (w * 1.4)) + w * 1.4) % (w * 1.4)) - w * 0.2;
      const y = rngv(n + 500) * h;
      const s = 3 * scale * (0.7 + rngv(n + 900) * 0.6);
      ctx.beginPath();
      ctx.moveTo(x - s * 0.6, y - s);
      ctx.lineTo(x, y);
      ctx.moveTo(x + s * 0.6, y - s);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    // The line is centred; a solo hero stands left of centre with a foe ahead.
    const n = this.heroes.length;
    const gap = 42;
    const order = this.heroes
      .map((_, i) => i)
      .sort((a, b) => (this.specs[a].y ?? 0) - (this.specs[b].y ?? 0));
    order.forEach((k) => {
      const hero = this.heroes[k];
      const spec = this.specs[k];
      let ch: Ch;
      let hitNow = false;
      let castT = -1;
      let foeX = 0;
      if (clip === 'line') ch = walkCh(hero.stance, t, spec.phase);
      else if (t < 1.2) ch = idleCh(hero.stance, t, spec.phase);
      else if (t < 3) {
        const tw = t - 1.2;
        ch = walkCh(hero.stance, tw, spec.phase);
      } else {
        // Blend into the guard, then attack twice.
        const ta = t - 3;
        const g = guard(hero.stance);
        const a0 = attack(hero.stance, 0);
        if (ta < 0.25) ch = lerpCh(walkCh(hero.stance, 1.8, spec.phase), g, ease(ta / 0.25));
        else {
          const u = ta - 0.25;
          const d = a0.dur + 0.18;
          const phaseT = u % d;
          const a = attack(hero.stance, Math.min(phaseT, a0.dur));
          ch = phaseT < a0.dur ? a.ch : g;
          hitNow = Math.abs(phaseT - a.hitAt) < 0.07;
          if (phaseT < a0.dur) castT = phaseT;
        }
        foeX = hitNow ? -2 : 0;
      }
      if (spec.side === 'back') ch = backHand(ch);
      const pose = toPose(ch);
      const kit = hero.kit;
      const laid = layout(kit, pose, false, undefined);
      // One fixed draw order for the whole clip (Stefan: a hand must not swap layers): cloak, back
      // boot, body ball, front boot, then head; a weapon cocked back or carried on the shoulder
      // goes behind the head, any other in front of it; the shield in front of the head and body;
      // the haft behind EVERY ball hand, and the hands (both) in front of everything else.
      const isP = (d: Draw, key: keyof Kit['parts']) => d.part === kit.parts[key];
      const pick = (f: (d: Draw) => boolean) => laid.filter(f);
      const behindHead = ch.wa < -0.9 || (hero.stance === 'spear' && ch.wa < -0.3);
      // The shield covers its hand ball: that hand sits BEHIND the shield (decisions 02388fb).
      const shieldHand: Draw[] =
        kit.parts.offhand?.cell.pivots?.strap && kit.parts.hand
          ? [
              {
                part: kit.parts.hand,
                pivot: 'wrist',
                x: pose.hb.x * PROTO_K,
                y: pose.hb.y * PROTO_K,
                rot: 0,
                sx: 1,
                sy: 1,
                inBody: true,
                far: false,
              },
            ]
          : [];
      const draws: Draw[] = [
        ...pick((d) => isP(d, 'cloak')),
        ...pick((d) => isP(d, 'boot') && d.far),
        ...pick((d) => isP(d, 'torso')),
        ...pick((d) => isP(d, 'boot') && !d.far),
        ...(behindHead ? pick((d) => isP(d, 'weapon')) : []),
        ...pick((d) => isP(d, 'head')),
        ...shieldHand,
        ...pick((d) => isP(d, 'offhand')),
        ...(behindHead ? [] : pick((d) => isP(d, 'weapon'))),
        ...pick((d) => isP(d, 'hand') && d.far).map((d) => ({ ...d, far: false })),
        ...pick((d) => isP(d, 'hand') && !d.far),
      ];
      const cx =
        w * (clip === 'line' ? 0.5 : 0.4) +
        (clip === 'solo' ? (spec.x ?? 0) * scale : 0) +
        (clip === 'line'
          ? (spec.x !== undefined && spec.x !== 0 ? spec.x : (k - (n - 1) / 2) * gap) * scale
          : 0);
      const cy = groundY + (clip === 'line' ? (spec.y ?? (k % 2 ? 4 : -4)) * scale * 0.5 : 0);
      ctx.save();
      ctx.translate(cx, cy);
      // Ground shadow.
      ctx.fillStyle = 'rgba(30,40,15,0.28)';
      ctx.beginPath();
      ctx.ellipse(2 * scale, 0.5 * scale, 11 * scale, 3.4 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.scale(scale, scale);
      drawKit(ctx, draws, pose);
      if (this.measure) (this.vis[k] ??= []).push(ballVisible(kit, draws, pose));
      // A glow on the staff's orb at a cast.
      if (hero.stance === 'staff' && castT >= 0) {
        const ta = castT;
        const a = attack('staff', Math.min(Math.max(ta, 0), 1));
        if (ta >= 0.4 && ta < 1.0) {
          const wp = hero.weapon as KitPart;
          const [, gy] = pivot(wp, 'grip');
          const top = gy * (wp.cell.h / wp.ppu) * 0.9;
          const hx = a.ch.hfx * PROTO_K;
          const hy = a.ch.hfy * PROTO_K;
          const ax = hx + Math.sin(a.ch.wa) * top;
          const ay = hy - Math.cos(a.ch.wa) * top;
          const pulse = Math.sin(((ta - 0.4) / 0.6) * Math.PI);
          const r = 14 * pulse + 3;
          const grd = ctx.createRadialGradient(ax, ay, 0, ax, ay, r);
          const [gr, gg, gb] = spec.glow ?? [150, 205, 255];
          grd.addColorStop(
            0,
            `rgba(${Math.min(255, gr + 60)},${Math.min(255, gg + 40)},${Math.min(255, gb + 20)},0.95)`,
          );
          grd.addColorStop(1, `rgba(${gr},${gg},${gb},0)`);
          ctx.fillStyle = grd;
          ctx.fillRect(ax - r, ay - r, r * 2, r * 2);
        }
      }
      ctx.restore();
      // A dummy foe ahead of a solo hero, flashing on hits.
      if (clip === 'solo') {
        const fx = cx + 38 * scale + foeX * scale;
        ctx.save();
        ctx.translate(fx, cy);
        ctx.fillStyle = 'rgba(30,40,15,0.28)';
        ctx.beginPath();
        ctx.ellipse(0, 0.5 * scale, 10 * scale, 3 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = hitNow ? '#f4f0e8' : '#3d4350';
        ctx.strokeStyle = '#1c1f26';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(0, -11 * scale, 8 * scale, 10 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = hitNow ? '#f4f0e8' : '#2a2e38';
        ctx.beginPath();
        ctx.ellipse(-1 * scale, -22 * scale, 5.5 * scale, 5 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      if (spec.label) {
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.strokeStyle = 'rgba(30,30,20,0.8)';
        ctx.lineWidth = 3;
        ctx.font = `bold ${Math.round(9 * scale)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.strokeText(spec.label, cx + 8 * scale, cy - 62 * scale);
        ctx.fillText(spec.label, cx + 8 * scale, cy - 62 * scale);
      }
    });
    return c.toDataURL('image/png');
  }
}
(window as unknown as { MockClass: typeof Mock }).MockClass = Mock;
