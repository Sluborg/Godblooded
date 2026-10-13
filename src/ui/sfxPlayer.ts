import Phaser from 'phaser';
import { sfxPreset, type SfxPreset } from '../data/sfx';
import type { SimEvent, Vec2 } from '../sim/api';
import { sfxFor, type SfxCtx, type SfxRequest } from './sfxEvents';
import { SfxLimiter, hitRateOk, positionGain, presetLength, wobble, type ViewBox } from './sfxPlan';
import { getSettings } from './settings';

const REGISTRY_KEY = 'sfxPlayer';

// The effect synth: a preset is a few oscillator and noise layers with a quick envelope, played
// through the game's own AudioContext (so Phaser's first-tap unlock and its pause when the page
// is hidden cover it). Before the unlock, or without Web Audio, nothing plays and nothing errors.
export class SfxPlayer {
  private readonly limiter = new SfxLimiter();
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private n = 0;
  private hits = 0;
  // The camera view (world units) and the game speed, set by the map every frame.
  view: ViewBox | null = null;
  speed = 1;

  constructor(private readonly game: Phaser.Game) {}

  private context(): AudioContext | null {
    const sm = this.game.sound as unknown as { context?: AudioContext };
    const c = sm.context;
    return c && c.state === 'running' ? c : null;
  }

  // Plays a request now, if it passes the distance, rate and pile-up rules.
  play(req: SfxRequest): void {
    const ctx = this.context();
    const preset = sfxPreset(req.id);
    if (!ctx || !preset) return;
    // The game's own mute and volume (and an effects volume of 0) silence it too.
    const sound = this.game.sound;
    const level = getSettings().effectsVolume * (sound.mute ? 0 : sound.volume);
    if (level <= 0) return;
    let gain = 1;
    if ('at' in req) {
      if (!req.at || !this.view) return;
      gain = positionGain(req.at, this.view);
      if (gain <= 0) return;
    }
    if (req.hit && !hitRateOk(this.speed, this.hits++)) return;
    const now = performance.now();
    const len = presetLength(preset) * 1000;
    if (!this.limiter.admit(req.id, now, len, gain, req.high, req.minGapMs)) return;
    const w = wobble(this.n++);
    this.voice(ctx, preset, gain * w.vol * level, w.pitch);
  }

  // Sound for a batch of Sim events.
  handle(events: readonly SimEvent[], ctx: SfxCtx): void {
    for (const e of events) for (const r of sfxFor(e, ctx)) this.play(r);
  }

  private out(ctx: AudioContext): GainNode {
    if (!this.master) {
      this.master = ctx.createGain();
      this.master.gain.value = 1;
      this.master.connect(ctx.destination);
    }
    return this.master;
  }

  private noiseBuffer(ctx: AudioContext): AudioBuffer {
    if (!this.noise) {
      const len = ctx.sampleRate;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      let s = 12345;
      for (let i = 0; i < len; i++) {
        s = (Math.imul(s, 1664525) + 1013904223) | 0;
        d[i] = ((s >>> 0) / 4294967296) * 2 - 1;
      }
      this.noise = buf;
    }
    return this.noise;
  }

  private voice(ctx: AudioContext, p: SfxPreset, vol: number, pitch: number): void {
    const t0 = ctx.currentTime;
    const out = this.out(ctx);
    for (const v of p.voices) {
      const start = t0 + (v.at ?? 0);
      const end = start + v.d;
      let src: AudioScheduledSourceNode;
      if (v.w === 'noise') {
        const b = ctx.createBufferSource();
        b.buffer = this.noiseBuffer(ctx);
        b.loop = true;
        b.playbackRate.value = pitch;
        src = b;
      } else {
        const o = ctx.createOscillator();
        o.type = v.w === 'saw' ? 'sawtooth' : v.w === 'tri' ? 'triangle' : v.w;
        o.frequency.setValueAtTime(v.f * pitch, start);
        if (v.f2) o.frequency.exponentialRampToValueAtTime(Math.max(1, v.f2 * pitch), end);
        src = o;
      }
      const env = ctx.createGain();
      const peak = Math.max(0.0002, v.g * vol);
      env.gain.setValueAtTime(0.0001, start);
      env.gain.linearRampToValueAtTime(peak, start + (v.a ?? 0.005));
      env.gain.exponentialRampToValueAtTime(0.0001, end);
      let node: AudioNode = src;
      if (v.hp) {
        const f = ctx.createBiquadFilter();
        f.type = 'highpass';
        f.frequency.value = v.hp;
        node.connect(f);
        node = f;
      }
      if (v.lp) {
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = v.lp;
        node.connect(f);
        node = f;
      }
      node.connect(env);
      env.connect(out);
      src.start(start);
      src.stop(end + 0.03);
      src.onended = () => {
        src.disconnect();
        env.disconnect();
      };
    }
  }
}

// One player per game, kept in the registry.
export function getSfx(scene: Phaser.Scene): SfxPlayer {
  let p = scene.game.registry.get(REGISTRY_KEY) as SfxPlayer | undefined;
  if (!p) {
    p = new SfxPlayer(scene.game);
    scene.game.registry.set(REGISTRY_KEY, p);
  }
  return p;
}

// Remembers where units were last seen (a unit that died is gone from the next snapshot) and
// answers the mapper's questions from the current snapshot.
export class SfxFeed {
  // Positions in this snapshot and in the one before it (a unit that died is gone from the new
  // one but its last place is still in the old one). A new run starts with `reset`.
  private cur = new Map<number, Vec2>();
  private prev = new Map<number, Vec2>();

  reset(): void {
    this.cur = new Map();
    this.prev = new Map();
  }

  ctx(
    units: readonly { id: number; pos: Vec2 }[],
    buildings: readonly { id: number; pos: Vec2 }[],
    lairs: readonly { id: number; pos: Vec2 }[],
    skillVisual: (skill: string) => string | undefined,
  ): SfxCtx {
    this.prev = this.cur;
    this.cur = new Map(units.map((u) => [u.id, u.pos]));
    const find = (list: readonly { id: number; pos: Vec2 }[], id: number): Vec2 | undefined =>
      list.find((x) => x.id === id)?.pos;
    return {
      // Hits can land on buildings and lairs too: ids are shared across all of them.
      unitPos: (id) =>
        this.cur.get(id) ?? this.prev.get(id) ?? find(buildings, id) ?? find(lairs, id),
      buildingPos: (id) => find(buildings, id),
      lairPos: (id) => find(lairs, id),
      skillVisual,
    };
  }
}
