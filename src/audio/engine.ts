// Radio audio engine: Web Audio DSP chain, squelch noise, signalling tones,
// stream playback with CORS-aware fallback.

export type FilterProfile = "p25" | "nfm" | "am" | "uhf" | "space";

export type StreamState =
  | "connecting"
  | "buffering"
  | "live"
  | "live-raw"
  | "error";

interface ToneStep {
  f: number | [number, number];
  d: number; // seconds
  g?: number; // gap after (s)
  type?: OscillatorType;
}

const PROFILES: Record<FilterProfile, { hp: number; lp: number; drive: number; noiseF: number }> = {
  p25: { hp: 320, lp: 3400, drive: 1.6, noiseF: 2400 },
  nfm: { hp: 300, lp: 3000, drive: 2.4, noiseF: 1900 },
  am: { hp: 260, lp: 2800, drive: 2.8, noiseF: 1500 },
  uhf: { hp: 280, lp: 2900, drive: 3.2, noiseF: 1700 },
  space: { hp: 380, lp: 2600, drive: 3.8, noiseF: 1300 },
};

function makeCurve(amount: number) {
  const n = 1024;
  const curve = new Float32Array(n);
  const k = amount * 8;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  return curve;
}

class RadioEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private busIn!: GainNode;
  private hp!: BiquadFilterNode;
  private lp!: BiquadFilterNode;
  private shaper!: WaveShaperNode;
  private comp!: DynamicsCompressorNode;
  private analyser!: AnalyserNode;
  private noiseGain!: GainNode;
  private noiseFilter!: BiquadFilterNode;
  private humGain!: GainNode;
  private fxEl: HTMLAudioElement | null = null;
  private rawEl: HTMLAudioElement | null = null;
  private streamAbort: AbortController | null = null;
  private streamTimer: number | null = null;
  private volume = 0.7;
  private hissLevel = 0;
  private profile: FilterProfile = "nfm";
  private buf = new Uint8Array(1024);
  mode: "fx" | "raw" | null = null;

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(ctx.destination);

      this.busIn = ctx.createGain();
      this.hp = ctx.createBiquadFilter();
      this.hp.type = "highpass";
      this.lp = ctx.createBiquadFilter();
      this.lp.type = "lowpass";
      this.shaper = ctx.createWaveShaper();
      this.comp = ctx.createDynamicsCompressor();
      this.comp.threshold.value = -24;
      this.comp.ratio.value = 6;
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 1024;
      this.busIn.connect(this.hp).connect(this.lp).connect(this.shaper).connect(this.comp).connect(this.analyser).connect(this.master);

      // white noise loop
      const len = ctx.sampleRate * 2;
      const nb = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = nb.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = nb;
      src.loop = true;
      this.noiseFilter = ctx.createBiquadFilter();
      this.noiseFilter.type = "bandpass";
      this.noiseFilter.Q.value = 0.6;
      this.noiseGain = ctx.createGain();
      this.noiseGain.gain.value = 0;
      src.connect(this.noiseFilter).connect(this.noiseGain).connect(this.master);
      src.start();

      // faint 60Hz-ish hum for carrier presence
      const hum = ctx.createOscillator();
      hum.frequency.value = 120;
      this.humGain = ctx.createGain();
      this.humGain.gain.value = 0;
      hum.connect(this.humGain).connect(this.master);
      hum.start();

      this.setProfile(this.profile);

      this.fxEl = new Audio();
      this.fxEl.crossOrigin = "anonymous";
      this.fxEl.preload = "none";
      const mes = ctx.createMediaElementSource(this.fxEl);
      mes.connect(this.busIn);

      this.rawEl = new Audio();
      this.rawEl.preload = "none";
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  get ready() {
    return !!this.ctx;
  }

  setProfile(p: FilterProfile) {
    this.profile = p;
    if (!this.ctx) return;
    const pr = PROFILES[p];
    this.hp.frequency.value = pr.hp;
    this.lp.frequency.value = pr.lp;
    this.shaper.curve = makeCurve(pr.drive);
    this.noiseFilter.frequency.value = pr.noiseF;
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.ctx) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.03);
    if (this.rawEl) this.rawEl.volume = Math.min(1, Math.max(0, v));
  }
  getVolume() {
    return this.volume;
  }

  /** Continuous hiss (open squelch / AM background) 0..1 */
  setHiss(level: number) {
    this.hissLevel = level;
    if (!this.ctx) return;
    this.noiseGain.gain.setTargetAtTime(level * 0.28, this.ctx.currentTime, 0.04);
  }

  setCarrier(on: boolean) {
    if (!this.ctx) return;
    this.humGain.gain.setTargetAtTime(on ? 0.006 : 0, this.ctx.currentTime, 0.05);
  }

  /** Squelch opening "kssh" when a carrier arrives. */
  squelchOpen(digital = false) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const g = this.noiseGain.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(this.hissLevel * 0.28, t);
    if (digital) {
      g.linearRampToValueAtTime(0.05, t + 0.01);
      g.linearRampToValueAtTime(this.hissLevel * 0.28, t + 0.04);
    } else {
      g.linearRampToValueAtTime(0.22, t + 0.015);
      g.linearRampToValueAtTime(0.04 + this.hissLevel * 0.28, t + 0.09);
    }
    this.setCarrier(true);
  }

  /** Squelch tail burst at end of transmission */
  squelchTail(digital = false) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const g = this.noiseGain.gain;
    g.cancelScheduledValues(t);
    if (digital) {
      g.setValueAtTime(this.hissLevel * 0.28, t);
    } else {
      g.setValueAtTime(0.3, t);
      g.exponentialRampToValueAtTime(0.12, t + 0.12);
      g.linearRampToValueAtTime(this.hissLevel * 0.28 + 0.0001, t + 0.22);
    }
    this.setCarrier(false);
  }

  /** Low carrier noise bed while a simulated voice speaks */
  carrierBed(on: boolean) {
    if (!this.ctx) return;
    this.noiseGain.gain.setTargetAtTime(on ? 0.035 + this.hissLevel * 0.28 : this.hissLevel * 0.28, this.ctx.currentTime, 0.05);
  }

  /** Play a tone sequence. dest 'bus' routes through the radio filter */
  tones(seq: ToneStep[], gain = 0.18, dest: "bus" | "master" = "master"): Promise<void> {
    const ctx = this.ensure();
    let t = ctx.currentTime + 0.02;
    const out = dest === "bus" ? this.busIn : this.master;
    for (const s of seq) {
      const freqs = Array.isArray(s.f) ? s.f : [s.f];
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(gain / freqs.length, t + 0.005);
      g.gain.setValueAtTime(gain / freqs.length, t + s.d - 0.006);
      g.gain.linearRampToValueAtTime(0, t + s.d);
      g.connect(out);
      for (const f of freqs) {
        if (f <= 0) continue;
        const o = ctx.createOscillator();
        o.type = s.type ?? "sine";
        o.frequency.value = f;
        o.connect(g);
        o.start(t);
        o.stop(t + s.d + 0.01);
      }
      t += s.d + (s.g ?? 0);
    }
    const total = (t - ctx.currentTime) * 1000;
    return new Promise((r) => setTimeout(r, total));
  }

  // ---- Classic radio signalling ----
  talkPermit() {
    return this.tones([{ f: 1200, d: 0.05, g: 0.03 }, { f: 1200, d: 0.05, g: 0.03 }, { f: 1200, d: 0.05 }], 0.14);
  }
  bonk() {
    return this.tones([{ f: 320, d: 0.45, type: "square" }], 0.07);
  }
  keyBeep() {
    return this.tones([{ f: 1800, d: 0.035 }], 0.08);
  }
  chirp() {
    return this.tones([{ f: 1400, d: 0.03, g: 0.01 }, { f: 2000, d: 0.03 }], 0.08);
  }
  rogerBeep() {
    return this.tones([{ f: 1500, d: 0.12 }], 0.09, "bus");
  }
  emergencyAlert() {
    const seq: ToneStep[] = [];
    for (let i = 0; i < 6; i++) seq.push({ f: 1050, d: 0.12 }, { f: 700, d: 0.12 });
    return this.tones(seq, 0.12, "bus");
  }
  priorityAlert() {
    // pulsed 1kHz "alert tone" used before priority broadcasts
    const seq: ToneStep[] = [];
    for (let i = 0; i < 5; i++) seq.push({ f: 1000, d: 0.18, g: 0.08 });
    return this.tones(seq, 0.12, "bus");
  }
  twoTonePage(a = 853.2, b = 1047.6) {
    // Motorola Quick Call II style sequential tones
    return this.tones([{ f: a, d: 1.0 }, { f: b, d: 3.0 }], 0.16, "bus");
  }
  quindar(start: boolean) {
    return this.tones([{ f: start ? 2525 : 2475, d: 0.25 }], 0.11, "bus");
  }
  outOfRange() {
    return this.tones([{ f: 440, d: 0.1, g: 0.08 }, { f: 440, d: 0.1 }], 0.08);
  }
  async morse(text: string, wpm = 10, f = 1020) {
    const MAP: Record<string, string> = {
      A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....", I: "..", J: ".---", K: "-.-", L: ".-..", M: "--",
      N: "-.", O: "---", P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-", Y: "-.--", Z: "--..",
    };
    const u = 1.2 / wpm;
    const seq: ToneStep[] = [];
    for (const ch of text.toUpperCase()) {
      const code = MAP[ch];
      if (!code) continue;
      [...code].forEach((s, i) => seq.push({ f, d: s === "." ? u : u * 3, g: i === code.length - 1 ? u * 3 : u }));
    }
    return this.tones(seq, 0.1, "bus");
  }

  // ---- Streams ----
  playStream(url: string, opts: { seekRandom?: boolean; onState: (s: StreamState) => void }) {
    this.ensure();
    this.stopStream();
    const ac = new AbortController();
    this.streamAbort = ac;
    const { onState } = opts;
    let playing = false;

    const attempt = (el: HTMLAudioElement, mode: "fx" | "raw") => {
      this.mode = mode;
      const sig = { signal: ac.signal } as AddEventListenerOptions;
      el.addEventListener(
        "loadedmetadata",
        () => {
          if (opts.seekRandom && isFinite(el.duration) && el.duration > 60) {
            el.currentTime = Math.random() * el.duration * 0.85;
          }
        },
        sig
      );
      el.addEventListener(
        "playing",
        () => {
          playing = true;
          onState(mode === "fx" ? "live" : "live-raw");
        },
        sig
      );
      el.addEventListener("waiting", () => onState("buffering"), sig);
      el.addEventListener(
        "ended",
        () => {
          if (opts.seekRandom) {
            el.currentTime = 0;
            void el.play();
          }
        },
        sig
      );
      el.addEventListener(
        "error",
        () => {
          if (ac.signal.aborted || this.mode !== mode) return;
          if (mode === "fx") {
            // probably no CORS headers: retry as a direct (unprocessed) stream
            el.removeAttribute("src");
            el.load();
            attempt(this.rawEl!, "raw");
          } else {
            onState("error");
          }
        },
        sig
      );
      el.src = url;
      if (mode === "raw") el.volume = this.volume;
      el.play().catch(() => {
        /* error event handles it */
      });
    };

    onState("connecting");
    attempt(this.fxEl!, "fx");
    this.streamTimer = window.setTimeout(() => {
      if (!playing && !ac.signal.aborted) {
        onState("error");
        this.stopStream();
      }
    }, 20000);
  }

  stopStream() {
    if (this.streamTimer) clearTimeout(this.streamTimer);
    this.streamTimer = null;
    this.streamAbort?.abort();
    this.streamAbort = null;
    for (const el of [this.fxEl, this.rawEl]) {
      if (!el) continue;
      el.pause();
      el.removeAttribute("src");
      el.load();
    }
    this.mode = null;
  }

  // ---- Rendered (neural) voice playback through the receiver chain ----
  private voiceSrc: AudioBufferSourceNode | null = null;
  private voiceDone: (() => void) | null = null;
  voiceActive = false;

  playVoice(pcm: Float32Array, sr: number): Promise<void> {
    const ctx = this.ensure();
    this.stopVoice();
    const buf = ctx.createBuffer(1, pcm.length, sr);
    buf.copyToChannel(pcm as Float32Array<ArrayBuffer>, 0);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.busIn);
    this.voiceSrc = src;
    this.voiceActive = true;
    return new Promise((resolve) => {
      const done = () => {
        if (this.voiceSrc === src) {
          this.voiceSrc = null;
          this.voiceActive = false;
        }
        this.voiceDone = null;
        resolve();
      };
      this.voiceDone = done;
      src.onended = done;
      src.start();
    });
  }

  stopVoice() {
    const s = this.voiceSrc;
    const d = this.voiceDone;
    this.voiceSrc = null;
    this.voiceActive = false;
    if (s) {
      s.onended = null;
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
      s.disconnect();
    }
    d?.();
  }

  // ---- Fallback overlay: fading noise + crackle while browser TTS speaks ----
  private overlayTimer: number | null = null;
  startOverlay(link: "fm" | "p25" | "am" | "space", strength: number) {
    if (!this.ctx) return;
    this.stopOverlay();
    if (link === "p25") return;
    const weak = 1 - strength;
    let phase = Math.random() * 6;
    this.overlayTimer = window.setInterval(() => {
      if (!this.ctx) return;
      phase += 0.08 + Math.random() * 0.1;
      const fade = 0.5 + 0.5 * Math.sin(phase);
      let level = (link === "fm" ? 0.02 : 0.06) + weak * fade * 0.35;
      if (Math.random() < weak * 0.08) level = 0.32; // dropout burst
      if (link !== "fm" && Math.random() < 0.05) level += 0.2; // static crash
      this.noiseGain.gain.setTargetAtTime(level + this.hissLevel * 0.28, this.ctx.currentTime, 0.02);
    }, 60);
  }
  stopOverlay() {
    if (this.overlayTimer) clearInterval(this.overlayTimer);
    this.overlayTimer = null;
    if (this.ctx) this.noiseGain.gain.setTargetAtTime(this.hissLevel * 0.28, this.ctx.currentTime, 0.04);
  }

  /** RMS level of the processed radio bus, 0..1 */
  getLevel() {
    if (!this.ctx) return 0;
    this.analyser.getByteTimeDomainData(this.buf);
    let s = 0;
    for (let i = 0; i < this.buf.length; i++) {
      const v = (this.buf[i] - 128) / 128;
      s += v * v;
    }
    return Math.min(1, Math.sqrt(s / this.buf.length) * 4);
  }

  stopAll() {
    this.stopStream();
    this.stopVoice();
    this.stopOverlay();
    this.setHiss(0);
    this.setCarrier(false);
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  }
}

export const engine = new RadioEngine();
