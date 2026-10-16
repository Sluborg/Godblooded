// Dev only (not imported by the game): stages a unit on the real map with scripted idle, walk,
// attack and hurt phases, steps the game one fixed frame at a time and grabs the canvas, so a
// clip can be recorded at exactly 1x game speed (scripts/anim-record.mjs). Nothing here ships.
import type Phaser from 'phaser';
import { BUILDS } from '../data/heroKits';
import { RUNTIME_KITS } from '../ui/parts/paintedLoad';
import type { Kit, KitPart } from '../ui/parts/painted';
import { releaseSets } from '../ui/parts/bake';
import { UnitViews } from '../ui/unitViews';
import type { SimEvent, UnitState } from '../sim/api';

interface PartSpec {
  file: string;
  w: number;
  h: number;
  pivots: Record<string, [number, number]>;
}
interface KitJson {
  // The look id the kit is registered under (odin_t1, mon_minotaur).
  look: string;
  ppu: number;
  mode: 'floating';
  parts: Partial<Record<string, PartSpec>>;
}

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((ok, bad) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => bad(new Error(`cannot load ${src}`));
    img.src = src;
  });

// Loads anim-test/<name>/kit.json and registers the kit under its look id.
export async function registerAnimKit(name: string): Promise<KitJson> {
  const res = await fetch(`/anim-test/${name}/kit.json`);
  const json = (await res.json()) as KitJson;
  const parts: Record<string, KitPart> = {};
  for (const [slot, spec] of Object.entries(json.parts)) {
    if (!spec) continue;
    const img = await loadImage(`/anim-test/${name}/${spec.file}`);
    parts[slot] = {
      img,
      cell: { x: 0, y: 0, w: spec.w, h: spec.h, pivots: spec.pivots },
      ppu: json.ppu,
    };
  }
  // The torso here holds the head too: the head slot is an empty picture the torso's neck feeds.
  if (!parts.head) {
    const c = document.createElement('canvas');
    c.width = c.height = 2;
    parts.head = {
      img: c,
      cell: { x: 0, y: 0, w: 2, h: 2, pivots: { neck: [0.5, 0.5], brow: [0.5, 0.5] } },
      ppu: json.ppu,
    };
  }
  const kit: Kit = {
    parts: parts as Kit['parts'],
    layers: {},
    build: BUILDS.standard,
    mode: 'floating',
  };
  RUNTIME_KITS.set(json.look, kit);
  return json;
}

export interface StageSpec {
  // Hero (a god id) or monster (its type) on the stage.
  kind: 'hero' | 'monster';
  god?: string;
  path?: string;
  tier?: number;
  type: string;
  zoom: number;
}

const FPS = 15;
const DT = 1000 / FPS;
// Seconds per phase.
export const PHASES = { idle: 1.2, walk: 1.8, attack: 1.8, hurt: 1.2 } as const;

const unit = (id: number, over: Partial<UnitState>): UnitState => ({
  id,
  kind: 'hero',
  type: 'warrior',
  tier: 1,
  god: null,
  path: null,
  pos: { x: 0, y: 0 },
  facing: { x: 1, y: 0 },
  hp: 60,
  maxHp: 60,
  target: null,
  ko: false,
  mode: 'wander',
  party: 0,
  trait: null,
  gold: 0,
  bounty: null,
  ...over,
});

export class AnimStage {
  private views!: UnitViews;
  private t = 0;
  private frame = 0;
  readonly total = Math.round(Object.values(PHASES).reduce((a, b) => a + b, 0) * FPS);
  private home = { x: 0, y: 0 };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly game: Phaser.Game,
    private readonly spec: StageSpec,
  ) {}

  // Puts the camera on an empty patch of ground and creates the views.
  start(at: { x: number; y: number }): void {
    this.home = at;
    const cam = this.scene.cameras.main;
    cam.stopFollow();
    cam.setBounds(-100000, -100000, 200000, 200000);
    cam.setZoom(this.spec.zoom * (this.game.scale.gameSize.width / 1280));
    cam.centerOn(at.x + 34, at.y - 14);
    this.scene.scene.get('Hud').scene.setVisible(false);
    this.views = new UnitViews(this.scene);
    this.game.loop.sleep();
    this.t = 0;
    this.frame = 0;
  }

  // The scripted phase at time t seconds.
  private phase(t: number): keyof typeof PHASES {
    let a = 0;
    for (const k of Object.keys(PHASES) as (keyof typeof PHASES)[]) {
      a += PHASES[k];
      if (t < a) return k;
    }
    return 'hurt';
  }

  // Advances one frame (1/15 s of game time at 1x) and renders it.
  step(): boolean {
    if (this.frame >= this.total) return false;
    const t = this.frame / FPS;
    const ph = this.phase(t);
    const events: SimEvent[] = [];
    const sp = this.spec;
    const walkStart = PHASES.idle;
    const attackStart = walkStart + PHASES.walk;
    const hurtStart = attackStart + PHASES.attack;
    const speed = 40;
    // The subject walks 72 units, then stands and fights a draugr 34 units ahead of where it ends.
    const x0 = this.home.x - 36;
    const walked = ph === 'idle' ? 0 : Math.min(PHASES.walk, t - walkStart) * speed;
    const sx = x0 + walked;
    const foeX = x0 + PHASES.walk * speed + 64;
    const subject = unit(1, {
      kind: sp.kind,
      type: sp.type,
      god: sp.god ?? null,
      path: sp.path ?? null,
      tier: sp.tier ?? 1,
      pos: { x: sx, y: this.home.y },
      facing: { x: 1, y: 0 },
      target: ph === 'attack' ? 2 : null,
    });
    const foe = unit(2, {
      kind: 'monster',
      type: 'draugr',
      pos: { x: foeX, y: this.home.y },
      facing: { x: -1, y: 0 },
      target: ph === 'hurt' ? 1 : null,
      hp: 200,
      maxHp: 200,
    });
    // Two swings in the attack phase, two blows back in the hurt phase.
    const swing = (at: number, from: number, to: number) => {
      const dt = t - at;
      if (dt >= 0 && dt < DT / 1000)
        events.push({ kind: 'windup', attacker: from, target: to, inMs: 400 });
      if (dt >= 0.4 && dt < 0.4 + DT / 1000)
        events.push({
          kind: 'hit',
          attacker: from,
          target: to,
          damage: 6,
          dodged: false,
          type: 'physical',
        });
    };
    swing(attackStart + 0.1, 1, 2);
    swing(attackStart + 0.95, 1, 2);
    swing(hurtStart + 0.1, 2, 1);
    swing(hurtStart + 0.7, 2, 1);
    const units = [subject, foe];
    this.views.sync(units, events, Math.round(t * 1000), DT);
    this.game.step(this.t, DT);
    this.t += DT;
    this.frame++;
    return true;
  }

  // The canvas around the subject as a PNG data URL (the canvas keeps its buffer: ?record).
  grab(box: { w: number; h: number }): string {
    const canvas = this.game.canvas;
    const k = canvas.width / 1280;
    const cam = this.scene.cameras.main;
    const sx = (this.home.x + 34 - cam.worldView.x) * cam.zoom;
    const sy = (this.home.y - 14 - cam.worldView.y) * cam.zoom;
    const out = document.createElement('canvas');
    out.width = Math.round(box.w * k);
    out.height = Math.round(box.h * k);
    const ctx = out.getContext('2d') as CanvasRenderingContext2D;
    ctx.drawImage(
      canvas,
      sx - out.width / 2,
      sy - out.height / 2,
      out.width,
      out.height,
      0,
      0,
      out.width,
      out.height,
    );
    return out.toDataURL('image/png');
  }

  stop(): void {
    releaseSets(this.scene);
    this.game.loop.wake();
  }
}
