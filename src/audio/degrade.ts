// RF path simulation applied to rendered voice PCM before it hits the
// receiver audio chain (band-pass / clipping / AGC in engine.ts).

export type Link = "fm" | "p25" | "am" | "space";

export interface SignalOpts {
  link: Link;
  /** 0..1 average received signal strength */
  strength: number;
  /** vehicle / portable in motion → multipath flutter ("picket fencing") */
  mobile: boolean;
}

export interface Degraded {
  out: Float32Array;
  /** mean effective signal 0..1 (for S-meter) */
  meanSignal: number;
}

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/** Control-rate (5 ms) signal-strength envelope with fades, flutter and dropouts */
function envelope(seconds: number, o: SignalOpts) {
  const rate = 200; // Hz
  const n = Math.ceil(seconds * rate) + 2;
  const env = new Float32Array(n);
  const S = clamp(o.strength);
  const weak = 1 - S;

  // slow fading (Rayleigh-ish): two incommensurate sinusoids + random walk
  const f1 = rnd(0.15, 0.6), f2 = rnd(0.5, 1.4), p1 = rnd(0, 6.28), p2 = rnd(0, 6.28);
  const fadeDepth = weak * (o.link === "am" || o.link === "space" ? 0.5 : 0.6);
  let walk = 0;

  // picket-fence flutter windows
  const flutterHz = rnd(6, 14);
  const flutterDepth = o.mobile ? weak * 0.9 : weak * 0.25;
  const windows: [number, number][] = [];
  if (o.mobile && S < 0.85) {
    let t = rnd(0, 1.5);
    while (t < seconds) {
      const len = rnd(0.4, 1.6);
      windows.push([t, t + len]);
      t += len + rnd(0.8, 3);
    }
  }

  // hard dropouts (Poisson)
  const dropRate = weak * weak * (o.link === "p25" ? 2.2 : 1.6) + (S < 0.5 ? 0.4 : 0); // per second
  const drops: [number, number][] = [];
  let t = rnd(0.2, 0.8);
  while (dropRate > 0.01 && t < seconds) {
    t += -Math.log(1 - Math.random()) / dropRate;
    if (t < seconds) drops.push([t, t + rnd(0.04, 0.09 + weak * 0.28)]);
  }

  let sum = 0;
  for (let i = 0; i < n; i++) {
    const s = i / rate;
    walk = clamp(walk + rnd(-0.03, 0.03), -0.25, 0.25);
    const fade = fadeDepth * (0.25 + 0.3 * Math.sin(6.283 * f1 * s + p1) + 0.2 * Math.sin(6.283 * f2 * s + p2)) + walk * weak;
    let fl = 0;
    for (const [a, b] of windows) {
      if (s >= a && s <= b) {
        const ramp = Math.min(1, (s - a) * 5, (b - s) * 5);
        fl = flutterDepth * ramp * Math.pow(Math.abs(Math.sin(Math.PI * flutterHz * s)), 6);
      }
    }
    let dr = 0;
    for (const [a, b] of drops) {
      if (s >= a - 0.01 && s <= b + 0.01) dr = Math.max(dr, Math.min(1, (s - a + 0.01) * 100, (b + 0.01 - s) * 100));
    }
    const e = clamp(S + 0.15 - fade - fl) * (1 - dr * 0.95);
    env[i] = e;
    sum += e;
  }
  return { env, rate, mean: sum / n };
}

function normalize(src: Float32Array, target = 0.85) {
  let peak = 0;
  for (let i = 0; i < src.length; i++) peak = Math.max(peak, Math.abs(src[i]));
  const g = peak > 0 ? target / peak : 1;
  const out = new Float32Array(src.length);
  for (let i = 0; i < src.length; i++) out[i] = src[i] * g;
  return out;
}

export function degrade(input: Float32Array, sr: number, o: SignalOpts): Degraded {
  // pad: key-up delay before speech + short hang after
  const pre = Math.floor(sr * rnd(0.1, 0.22));
  const post = Math.floor(sr * 0.08);
  const v = normalize(input);
  const len = v.length + pre + post;
  const voice = new Float32Array(len);
  voice.set(v, pre);
  const out = new Float32Array(len);
  const { env, rate, mean } = envelope(len / sr, o);
  const envAt = (i: number) => {
    const x = (i / sr) * rate;
    const k = Math.floor(x);
    const f = x - k;
    return env[k] * (1 - f) + env[Math.min(env.length - 1, k + 1)] * f;
  };

  if (o.link === "p25") {
    // ---- Digital: IMBE-style 20 ms frames. Bit errors → repeated/garbled frames, then mute.
    const F = Math.floor(sr * 0.02);
    let lastGood = new Float32Array(F);
    let repeats = 0;
    const robotHz = rnd(60, 110);
    for (let start = 0; start < len; start += F) {
      const e = envAt(start + F / 2);
      const frame = voice.subarray(start, Math.min(len, start + F));
      let mode: "clean" | "repeat" | "mute" = "clean";
      if (e < 0.2) mode = Math.random() < 0.25 && repeats < 3 ? "repeat" : "mute";
      else if (e < 0.45) mode = Math.random() < (0.45 - e) / 0.25 ? "repeat" : "clean";
      if (mode === "repeat" && repeats > 4) mode = "mute";
      for (let j = 0; j < frame.length; j++) {
        const i = start + j;
        const fadeIn = Math.min(1, j / 24, (frame.length - j) / 24);
        let s: number;
        if (mode === "clean") s = frame[j];
        else if (mode === "repeat") s = lastGood[j] * 0.85 * (0.6 + 0.4 * Math.sin((6.283 * robotHz * i) / sr)) * (0.7 + 0.3 * fadeIn);
        else s = 0;
        out[i] = s;
      }
      if (mode === "clean") {
        lastGood = Float32Array.from(frame);
        repeats = 0;
      } else repeats++;
    }
    // vocoder graininess: light 8-bit-ish quantization + tiny noise floor
    for (let i = 0; i < len; i++) out[i] = Math.round(out[i] * 96) / 96 + (Math.random() - 0.5) * 0.004;
    return { out, meanSignal: mean };
  }

  // ---- Analog paths
  let crash = 0;
  let crashDecay = 0;
  const crashRate = o.link === "am" ? 0.7 + (1 - o.strength) * 1.5 : o.link === "space" ? 0.25 : 0.15 + (1 - o.strength) * 0.6;
  const het = (o.link === "am" && Math.random() < 0.15) || (o.link === "fm" && Math.random() < 0.04);
  const hetF0 = rnd(500, 1700);
  const hetStart = rnd(0, 0.6) * len;
  const hetEnd = hetStart + rnd(0.2, 0.5) * len;
  let hetPh = 0;
  let pink = 0;
  let clickHold = 0;

  for (let i = 0; i < len; i++) {
    const e = envAt(i);
    const white = Math.random() * 2 - 1;
    pink = pink * 0.86 + white * 0.14;
    let vg: number, ng: number;
    if (o.link === "fm") {
      // FM threshold: strong carrier quiets the receiver, weak carrier → noise floods in, voice breaks up
      vg = smooth(0.12, 0.5, e);
      ng = (1 - smooth(0.08, 0.75, e)) * 0.38 + 0.01;
      // FM "popcorn" clicks near threshold
      if (e < 0.35 && Math.random() < 0.0009 * (0.35 - e) * 40) clickHold = Math.floor(sr * 0.002);
    } else if (o.link === "am") {
      vg = 0.12 + 0.88 * e;
      ng = 0.045 + (1 - e) * 0.22;
    } else {
      vg = 0.2 + 0.8 * smooth(0.05, 0.6, e);
      ng = 0.1 + (1 - e) * 0.18;
    }
    // static crashes / atmospherics
    if (crash <= 0.001 && Math.random() < crashRate / sr) {
      crash = rnd(0.3, 0.8);
      crashDecay = Math.exp(-1 / (sr * rnd(0.004, 0.03)));
    }
    let s = voice[i] * vg + (o.link === "fm" ? white : pink * 2.2) * ng;
    if (crash > 0.001) {
      s += white * crash;
      crash *= crashDecay;
    }
    if (clickHold > 0) {
      s += (clickHold % 2 ? 0.7 : -0.7);
      clickHold--;
    }
    if (het && i > hetStart && i < hetEnd) {
      hetPh += (6.283 * (hetF0 + 30 * Math.sin(i / sr))) / sr;
      s += Math.sin(hetPh) * 0.07;
    }
    out[i] = s;
  }
  return { out, meanSignal: mean };
}

/** Received-signal strength for a talker based on who they are and RF conditions */
export function strengthFor(speaker: string, rf: number, link: Link): { strength: number; mobile: boolean } {
  const base = /dispatch|tower|marshal|approach|final|paddles|boss|strike|red crown|capcom|departure|general|mary|mercy|university|children|hospital|houston/i.test(speaker);
  const fieldBias = link === "space" ? 0.62 : 0.6;
  let s = base ? rnd(0.82, 1) : rnd(fieldBias - 0.25, 0.97);
  s += rf; // rf: +0.15 strong, 0 fair, -0.3 poor
  return { strength: clamp(s, 0.15, 1), mobile: !base && Math.random() < 0.6 };
}
