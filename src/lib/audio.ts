/* Track playback: uploaded/remote audio or a built-in synthwave demo loop. */
export interface Player {
  play(): Promise<boolean>;
  pause(): void;
  dispose(): void;
  isPlaying(): boolean;
}

class SynthPlayer implements Player {
  private ctx?: AudioContext | undefined;
  private timer?: number | undefined;
  private step = 0;
  private master?: GainNode;
  private active = false;

  async play(): Promise<boolean> {
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return false;
        this.ctx = new AudioCtx();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.18;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === "suspended") {
        await this.ctx.resume();
      }
      this.active = true;
      if (this.timer) return true;

      const bass = [45, 45, 57, 45, 41, 41, 53, 41, 48, 48, 60, 48, 43, 43, 55, 43];
      const chords = [
        [57, 60, 64],
        [53, 57, 60],
        [60, 64, 67],
        [55, 59, 62],
      ];
      const stepDur = 60 / 104 / 2;

      this.timer = window.setInterval(() => {
        if (!this.ctx || !this.master) return;
        const ctx = this.ctx;
        const t = ctx.currentTime;
        const s = this.step++ % 16;
        const bassNote = bass[s];
        if (bassNote !== undefined) this.note(bassNote, t, stepDur * 0.9, "sawtooth", 0.5);
        if (s % 4 === 0) {
          const chord = chords[Math.floor(s / 4)];
          chord?.forEach((n) => this.note(n, t, stepDur * 4, "triangle", 0.18));
        }
        if (s % 2 === 0) this.kick(t);
      }, stepDur * 1000);

      return true;
    } catch {
      this.active = false;
      return false;
    }
  }

  private note(midi: number, t: number, d: number, type: OscillatorType, vol: number) {
    if (!this.ctx || !this.master) return;
    try {
      const ctx = this.ctx;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 1400;
      o.type = type;
      o.frequency.value = 440 * 2 ** ((midi - 69) / 12);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.connect(f).connect(g).connect(this.master);
      o.start(t);
      o.stop(t + d);
    } catch {
      // Audio note scheduling error ignored
    }
  }

  private kick(t: number) {
    if (!this.ctx || !this.master) return;
    try {
      const ctx = this.ctx;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.setValueAtTime(120, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
      g.gain.setValueAtTime(0.9, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      o.connect(g).connect(this.master);
      o.start(t);
      o.stop(t + 0.2);
    } catch {
      // Kick sound error ignored
    }
  }

  pause() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.active = false;
  }

  dispose() {
    this.pause();
    if (this.ctx && this.ctx.state !== "closed") {
      this.ctx.close().catch(() => {});
    }
    this.ctx = undefined;
  }

  isPlaying(): boolean {
    return this.active;
  }
}

class FilePlayer implements Player {
  private a: HTMLAudioElement;
  private playing = false;

  constructor(src: string, loop: boolean) {
    this.a = new Audio(src);
    this.a.loop = loop;
    this.a.preload = "auto";
  }

  async play(): Promise<boolean> {
    try {
      await this.a.play();
      this.playing = true;
      return true;
    } catch {
      this.playing = false;
      return false;
    }
  }

  pause() {
    this.a.pause();
    this.playing = false;
  }

  dispose() {
    this.pause();
    this.a.src = "";
    this.a.load();
  }

  isPlaying(): boolean {
    return this.playing && !this.a.paused;
  }
}

export function createPlayer(src: string, loop = true): Player {
  return src.startsWith("synth:") ? new SynthPlayer() : new FilePlayer(src, loop);
}
