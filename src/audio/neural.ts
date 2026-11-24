// Neural (Piper VITS) text-to-speech rendered to raw PCM inside a Web Worker,
// so simulated voices can be processed by the radio DSP chain like real audio.
// Model: en_US-libritts_r-medium (904 speakers) – each radio talker gets a unique voice.

const WORKER_SRC = String.raw`
const ORT = "https://cdnjs.cloudflare.com/ajax/libs/onnxruntime-web/1.18.0/";
const PH = "https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/";
const MODEL = "https://huggingface.co/diffusionstudio/piper-voices/resolve/main/en/en_US/libritts_r/medium/en_US-libritts_r-medium.onnx";
importScripts(ORT + "ort.min.js", PH + "piper_phonemize.js");
ort.env.wasm.wasmPaths = ORT;
ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;

let session = null, cfg = null, phWasm = null, phData = null;
const queue = [];
let busy = false;

async function getBuf(url, label) {
  let cache = null;
  try {
    cache = await caches.open("radiosim-voice-v1");
    const hit = await cache.match(url);
    if (hit) {
      const b = await hit.arrayBuffer();
      postMessage({ type: "progress", label, loaded: b.byteLength, total: b.byteLength });
      return b;
    }
  } catch (e) { cache = null; }
  const res = await fetch(url);
  if (!res.ok) throw new Error("HTTP " + res.status + " (" + label + ")");
  const total = +(res.headers.get("content-length") || 0);
  const reader = res.body.getReader();
  const chunks = [];
  let got = 0, lastPost = 0;
  for (;;) {
    const r = await reader.read();
    if (r.done) break;
    chunks.push(r.value);
    got += r.value.length;
    if (got - lastPost > 262144) { lastPost = got; postMessage({ type: "progress", label, loaded: got, total: total || got }); }
  }
  const buf = new Uint8Array(got);
  let o = 0;
  for (const c of chunks) { buf.set(c, o); o += c.length; }
  postMessage({ type: "progress", label, loaded: got, total: got });
  try { if (cache) await cache.put(url, new Response(buf.slice())); } catch (e) {}
  return buf.buffer;
}

function phonemize(text) {
  return new Promise((resolve, reject) => {
    let done = false;
    const t = setTimeout(() => { if (!done) { done = true; reject(new Error("phonemizer timeout")); } }, 8000);
    createPiperPhonemize({
      wasmBinary: phWasm,
      getPreloadedPackage: () => phData.slice(0),
      locateFile: (f) => PH + f,
      print: (line) => {
        if (done) return;
        try { const ids = JSON.parse(line).phoneme_ids; done = true; clearTimeout(t); resolve(ids); } catch (e) {}
      },
      printErr: () => {},
    }).then((m) => {
      try { m.callMain(["-l", cfg.espeak.voice, "--input", JSON.stringify([{ text }]), "--espeak_data", "/espeak-ng-data"]); } catch (e) {}
    }, (e) => { if (!done) { done = true; clearTimeout(t); reject(e); } });
  });
}

async function init() {
  const [model, json, w, d] = await Promise.all([
    getBuf(MODEL, "model"),
    getBuf(MODEL + ".json", "config"),
    getBuf(PH + "piper_phonemize.wasm", "phonemizer"),
    getBuf(PH + "piper_phonemize.data", "dictionary"),
  ]);
  cfg = JSON.parse(new TextDecoder().decode(json));
  phWasm = w;
  phData = d;
  postMessage({ type: "progress", label: "compile", loaded: 0, total: 1 });
  session = await ort.InferenceSession.create(model, { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
  // warm-up so the first real line is fast
  try { await synth({ text: "Radio check.", sid: 0, length: 1 }); } catch (e) {}
  postMessage({ type: "ready", sr: cfg.audio.sample_rate, speakers: cfg.num_speakers });
}

async function synth(job) {
  const ids = await phonemize(job.text);
  const feeds = {
    input: new ort.Tensor("int64", BigInt64Array.from(ids.map((x) => BigInt(x))), [1, ids.length]),
    input_lengths: new ort.Tensor("int64", BigInt64Array.from([BigInt(ids.length)]), [1]),
    scales: new ort.Tensor("float32", Float32Array.from([0.55, job.length, 0.7]), [3]),
  };
  if (cfg.num_speakers > 1) feeds.sid = new ort.Tensor("int64", BigInt64Array.from([BigInt(job.sid % cfg.num_speakers)]), [1]);
  const out = await session.run(feeds);
  return new Float32Array(out.output.data);
}

async function pump() {
  if (busy) return;
  busy = true;
  while (queue.length) {
    const job = queue.shift();
    try {
      const pcm = await synth(job);
      postMessage({ type: "audio", id: job.id, pcm, sr: cfg.audio.sample_rate }, [pcm.buffer]);
    } catch (e) {
      postMessage({ type: "audio", id: job.id, pcm: null, error: String(e && e.message || e) });
    }
  }
  busy = false;
}

onmessage = async (e) => {
  const m = e.data;
  if (m.type === "init") {
    try { await init(); } catch (err) { postMessage({ type: "error", error: String(err && err.message || err) }); }
  } else if (m.type === "synth") {
    queue.push(m);
    pump();
  } else if (m.type === "clear") {
    while (queue.length) postMessage({ type: "audio", id: queue.shift().id, pcm: null });
  }
};
`;

export type NeuralState = "off" | "loading" | "ready" | "error" | "unsupported";
export interface Rendered {
  pcm: Float32Array;
  sr: number;
}

const PREF_KEY = "radiosim.neuralVoice";
const SIZES: Record<string, number> = { model: 78_580_914, config: 20_123, phonemizer: 635_212, dictionary: 18_077_249 };

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

class NeuralVoice {
  state: NeuralState = "off";
  progress = 0;
  stage = "";
  error = "";
  private worker: Worker | null = null;
  private pending = new Map<number, (r: Rendered | null) => void>();
  private seq = 0;
  private loaded: Record<string, number> = {};
  private listeners = new Set<() => void>();
  private snapshot = { state: this.state, progress: 0, stage: "", error: "" };

  get supported() {
    return typeof Worker !== "undefined" && typeof WebAssembly !== "undefined" && typeof BigInt64Array !== "undefined";
  }

  /** user preference – default on unless the browser asks to save data */
  get preferred() {
    const v = localStorage.getItem(PREF_KEY);
    if (v !== null) return v === "1";
    const c = (navigator as unknown as { connection?: { saveData?: boolean } }).connection;
    return !c?.saveData;
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getSnapshot = () => this.snapshot;
  private emit() {
    this.snapshot = { state: this.state, progress: this.progress, stage: this.stage, error: this.error };
    this.listeners.forEach((f) => f());
  }

  start() {
    localStorage.setItem(PREF_KEY, "1");
    if (this.worker || this.state === "ready") return;
    if (!this.supported) {
      this.state = "unsupported";
      this.emit();
      return;
    }
    const url = URL.createObjectURL(new Blob([WORKER_SRC], { type: "text/javascript" }));
    const w = new Worker(url);
    this.worker = w;
    this.state = "loading";
    this.progress = 0;
    this.stage = "Downloading voice model";
    this.error = "";
    this.loaded = {};
    this.emit();
    w.onmessage = (e: MessageEvent) => {
      const m = e.data;
      if (m.type === "progress") {
        if (m.label === "compile") {
          this.stage = "Compiling neural network";
          this.progress = 0.99;
        } else {
          this.loaded[m.label] = m.loaded;
          const total = Object.values(SIZES).reduce((a, b) => a + b, 0);
          const got = Object.entries(this.loaded).reduce((a, [k, v]) => a + Math.min(v, SIZES[k] ?? v), 0);
          this.progress = Math.min(0.98, got / total);
        }
        this.emit();
      } else if (m.type === "ready") {
        this.state = "ready";
        this.progress = 1;
        this.stage = "";
        this.emit();
      } else if (m.type === "error") {
        this.fail(m.error);
      } else if (m.type === "audio") {
        const cb = this.pending.get(m.id);
        this.pending.delete(m.id);
        cb?.(m.pcm ? { pcm: m.pcm, sr: m.sr } : null);
      }
    };
    w.onerror = (e) => {
      e.preventDefault?.();
      this.fail(e.message || "Worker failed to start");
    };
    w.postMessage({ type: "init" });
  }

  private fail(msg: string) {
    this.error = msg;
    this.state = "error";
    this.worker?.terminate();
    this.worker = null;
    this.pending.forEach((cb) => cb(null));
    this.pending.clear();
    this.emit();
  }

  disable() {
    localStorage.setItem(PREF_KEY, "0");
    this.worker?.terminate();
    this.worker = null;
    this.pending.forEach((cb) => cb(null));
    this.pending.clear();
    this.state = "off";
    this.progress = 0;
    this.emit();
  }

  /** Render text for a given talker. Resolves null if the engine isn't ready. */
  synth(text: string, speaker: string, lengthScale: number): Promise<Rendered | null> {
    if (this.state !== "ready" || !this.worker) return Promise.resolve(null);
    const id = ++this.seq;
    const sid = hash(speaker) % 904;
    return new Promise((resolve) => {
      this.pending.set(id, resolve);
      this.worker!.postMessage({ type: "synth", id, text, sid, length: lengthScale });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          resolve(null);
        }
      }, 30000);
    });
  }

  clear() {
    this.worker?.postMessage({ type: "clear" });
  }
}

export const neural = new NeuralVoice();
