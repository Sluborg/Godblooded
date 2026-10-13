import Phaser from 'phaser';
import { ASSETS_KEY, type ManifestAsset } from './assets';
import { musicLevel, nextVoiceAtMs, voiceGain, type LoopPoints } from './musicPlan';
import { getSettings } from './settings';

type Seekable = Phaser.Sound.BaseSound & { seek: number };

interface Voice {
  sound: Seekable;
  loop: LoopPoints;
  fadesIn: boolean;
  spawnedNext: boolean;
  // Set when the voice is being faded out for good (stop or a new track).
  outAt: number;
  outMs: number;
}

const REGISTRY_KEY = 'musicPlayer';
const DEFAULT_FADE_MS = 2000;

// Looping music with a crossfade from the loop end back to the loop start (docs/systems/audio.md).
// Audio starts on the first tap (Phaser unlocks the sound manager then); until then nothing
// plays and nothing errors. A missing file or row means silence. Volume and mute are read live
// from the settings every frame.
export class MusicPlayer {
  private wanted: string | null = null;
  private voices: Voice[] = [];
  private loop: LoopPoints = { startMs: 0, endMs: 0, fadeMs: DEFAULT_FADE_MS };
  private loading = new Set<string>();

  constructor(private readonly game: Phaser.Game) {
    game.events.on(Phaser.Core.Events.POST_STEP, this.update, this);
    game.events.once(Phaser.Core.Events.DESTROY, () => this.destroy());
  }

  // Asks for a track; the same track again is a no-op. Needs a scene for its loader.
  play(scene: Phaser.Scene, id: string): void {
    if (this.wanted === id) return;
    this.fadeOutAll(600);
    this.wanted = id;
    const row = (scene.registry.get(ASSETS_KEY) as Map<string, ManifestAsset> | undefined)?.get(id);
    if (!row || row.kind !== 'mus') return;
    const sm = this.game.sound;
    if ('locked' in sm && sm.locked) {
      sm.once(Phaser.Sound.Events.UNLOCKED, () => this.begin(scene, row));
      return;
    }
    this.begin(scene, row);
  }

  // Fades the music out and forgets the request.
  stop(fadeMs = 800): void {
    this.wanted = null;
    this.fadeOutAll(fadeMs);
  }

  private begin(scene: Phaser.Scene, row: ManifestAsset): void {
    if (this.wanted !== row.id) return;
    this.loop = {
      startMs: row.loopStartMs ?? 0,
      endMs: row.loopEndMs ?? 0,
      fadeMs: row.loopCrossfadeMs ?? DEFAULT_FADE_MS,
    };
    if (this.game.cache.audio.exists(row.id)) return this.spawn(row.id, false);
    if (this.loading.has(row.id)) return;
    this.loading.add(row.id);
    const base = `${import.meta.env.BASE_URL}assets/${row.file}`;
    const loader = scene.load;
    const done = (): void => {
      this.loading.delete(row.id);
      if (this.wanted === row.id && this.game.cache.audio.exists(row.id)) this.spawn(row.id, false);
    };
    loader.audio(row.id, [`${base}.ogg`, `${base}.m4a`]);
    loader.once(Phaser.Loader.Events.COMPLETE, done);
    if (!loader.isLoading()) loader.start();
  }

  private spawn(id: string, fadesIn: boolean): void {
    const sound = this.game.sound.add(id) as Seekable;
    const voice: Voice = {
      sound,
      loop: this.loop,
      fadesIn,
      spawnedNext: false,
      outAt: 0,
      outMs: 0,
    };
    this.voices.push(voice);
    sound.once('complete', () => this.drop(voice));
    sound.play({ volume: 0, seek: this.loop.startMs / 1000 });
  }

  private drop(voice: Voice): void {
    this.voices = this.voices.filter((v) => v !== voice);
    voice.sound.destroy();
  }

  private fadeOutAll(fadeMs: number): void {
    const now = this.game.getTime();
    for (const v of this.voices) {
      if (v.outMs === 0) {
        v.outAt = now;
        v.outMs = Math.max(1, fadeMs);
      }
    }
  }

  private update(): void {
    if (this.voices.length === 0) return;
    const s = getSettings();
    const level = musicLevel(s.musicVolume, s.musicMuted);
    const now = this.game.getTime();
    for (const v of [...this.voices]) {
      let mul = 1;
      if (v.outMs > 0) {
        mul = 1 - (now - v.outAt) / v.outMs;
        if (mul <= 0) {
          this.drop(v);
          continue;
        }
      }
      const posMs = v.sound.seek * 1000;
      if (v.loop.endMs > 0 && posMs >= v.loop.endMs) {
        this.drop(v);
        continue;
      }
      const gain = v.loop.endMs > 0 ? voiceGain(posMs, v.loop, v.fadesIn) : 1;
      (v.sound as unknown as { setVolume(n: number): void }).setVolume(level * mul * gain);
      if (
        !v.spawnedNext &&
        v.outMs === 0 &&
        this.wanted &&
        v.loop.endMs > 0 &&
        posMs >= nextVoiceAtMs(v.loop)
      ) {
        v.spawnedNext = true;
        this.spawn(this.wanted, true);
      }
    }
  }

  private destroy(): void {
    this.game.events.off(Phaser.Core.Events.POST_STEP, this.update, this);
    for (const v of [...this.voices]) this.drop(v);
  }
}

// One player per game, kept in the registry.
export function getMusic(scene: Phaser.Scene): MusicPlayer {
  let p = scene.game.registry.get(REGISTRY_KEY) as MusicPlayer | undefined;
  if (!p) {
    p = new MusicPlayer(scene.game);
    scene.game.registry.set(REGISTRY_KEY, p);
  }
  return p;
}
