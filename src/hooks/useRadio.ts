import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { engine } from "../audio/engine";
import { speak, stopSpeech } from "../audio/speech";
import { generate, replyToEmergency, replyToTx, type Exchange } from "../sim/scripts";
import { CHANNELS, type Channel, type ServiceMeta } from "../data/channels";
import { neural } from "../audio/neural";
import { degrade, strengthFor, type Link } from "../audio/degrade";

interface Prepared {
  ex: Exchange;
  audio: { sig: { strength: number; mobile: boolean }; p: Promise<{ out: Float32Array; sr: number; signal: number } | null> }[];
}

/** RF conditions: offset applied to every talker's signal strength */
export const RF_LEVELS = [
  { id: "strong", label: "STRONG", offset: 0.18 },
  { id: "fair", label: "FAIR", offset: 0 },
  { id: "poor", label: "POOR", offset: -0.32 },
  { id: "fringe", label: "FRINGE", offset: -0.5 },
] as const;

export type RadioStatus = "off" | "connecting" | "buffering" | "live" | "live-raw" | "sim" | "fallback" | "nosignal" | "error";

export interface LogEntry {
  id: number;
  t: string;
  kind: "sys" | "rx" | "tx" | "warn";
  who?: string;
  text: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let logId = 0;
const stamp = () => new Date().toLocaleTimeString([], { hour12: false });

export function useRadio(meta: ServiceMeta) {
  const storeKey = `radiosim.custom.${meta.id}`;
  const [custom, setCustom] = useState<Channel[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(storeKey) || "[]");
    } catch {
      return [];
    }
  });
  const channels = useMemo(() => [...CHANNELS[meta.id], ...custom], [meta.id, custom]);

  const [power, setPower] = useState(false);
  const [volume, setVolume] = useState(0.65);
  const [monitor, setMonitor] = useState(false);
  const [chIndex, setChIndex] = useState(0);
  const [status, setStatus] = useState<RadioStatus>("off");
  const [rx, setRx] = useState(false);
  const [tx, setTx] = useState(false);
  const [emergency, setEmergency] = useState(false);
  const [speaker, setSpeaker] = useState<string | null>(null);
  const [lastText, setLastText] = useState<string>("");
  const [level, setLevel] = useState(0);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [quindar, setQuindar] = useState(true);
  const [denied, setDenied] = useState(false);

  const channel: Channel | null = chIndex >= 0 ? channels[chIndex] ?? null : null;

  const simToken = useRef(0);
  const queue = useRef<Exchange[]>([]);
  const txRef = useRef(false);
  const txStart = useRef(0);
  const volRef = useRef(volume);
  const quindarRef = useRef(quindar);
  const statusRef = useRef(status);
  const rxRef = useRef(rx);
  rxRef.current = rx;
  const [rf, setRf] = useState(1);
  const rfRef = useRef<number>(RF_LEVELS[1].offset);
  rfRef.current = RF_LEVELS[rf].offset;
  const sigRef = useRef(1);
  volRef.current = volume;
  quindarRef.current = quindar;
  statusRef.current = status;

  const addLog = useCallback((kind: LogEntry["kind"], text: string, who?: string) => {
    setLog((l) => [...l.slice(-150), { id: ++logId, t: stamp(), kind, text, who }]);
  }, []);

  // ---------- simulated traffic loop
  const link: Link = meta.filter === "p25" ? "p25" : meta.filter === "nfm" ? "fm" : meta.filter === "space" ? "space" : "am";

  /** kick off neural rendering + RF degradation for every line of an exchange */
  const prepare = useCallback(
    (ex: Exchange): Prepared => ({
      ex,
      audio: ex.lines.map((line) => {
        const sig = strengthFor(line.speaker, rfRef.current, link);
        const base = /dispatch|tower|marshal|approach|capcom|strike/i.test(line.speaker);
        const lengthScale = base ? 0.82 + Math.random() * 0.08 : 0.88 + Math.random() * 0.12;
        const p = neural.synth(line.say ?? line.text, line.speaker, lengthScale).then((r) => {
          if (!r) return null;
          const d = degrade(r.pcm, r.sr, { link, ...sig });
          return { out: d.out, sr: r.sr, signal: d.meanSignal };
        });
        return { sig, p };
      }),
    }),
    [link]
  );

  const runSim = useCallback(
    async (ch: Channel, token: number) => {
      const alive = () => simToken.current === token;
      const dig = meta.digital;
      let next: Prepared | null = null;
      if (neural.state === "ready") next = prepare(generate(ch.sim));
      await sleep(900 + Math.random() * 1200);
      while (alive()) {
        let prepared: Prepared;
        if (queue.current.length) {
          if (next) neural.clear();
          next = null;
          prepared = prepare(queue.current.shift()!);
        } else {
          prepared = next ?? prepare(generate(ch.sim));
          next = null;
        }
        const ex = prepared.ex;
        if (ex.pre && alive()) {
          setRx(true);
          engine.squelchOpen(dig);
          if (ex.pre === "twotone") {
            const pairs: [number, number][] = [[853.2, 1047.6], [669.9, 1153.4], [741.3, 1251.4], [592.5, 1006.9]];
            const p = pairs[Math.floor(Math.random() * pairs.length)];
            setLastText("▲ ALERT TONES ▲");
            await engine.twoTonePage(p[0], p[1]);
          } else if (ex.pre === "priority") await engine.priorityAlert();
          else await engine.emergencyAlert();
          await sleep(350);
        }
        for (let li = 0; li < ex.lines.length; li++) {
          const line = ex.lines[li];
          const job = prepared.audio[li];
          if (!alive()) return;
          // wait for the neural render (runs ahead while earlier lines play)
          const rendered = await job.p;
          if (!alive()) return;
          while (txRef.current && alive()) await sleep(150);
          if (!alive()) return;
          setRx(true);
          setSpeaker(line.speaker);
          setLastText(line.text);
          sigRef.current = rendered ? rendered.signal : job.sig.strength;
          engine.squelchOpen(dig);
          if (line.quindar && quindarRef.current) await engine.quindar(true);
          addLog("rx", line.text, line.speaker);
          if (rendered) {
            await engine.playVoice(rendered.out, rendered.sr);
          } else {
            // browser TTS can't be routed through Web Audio → approximate with a fading noise overlay
            engine.carrierBed(true);
            engine.startOverlay(link, job.sig.strength);
            await sleep(90);
            await speak(line.say ?? line.text, line.speaker, volRef.current);
            engine.stopOverlay();
            engine.carrierBed(false);
          }
          if (!alive()) return;
          if (line.quindar && quindarRef.current) await engine.quindar(false);
          engine.squelchTail(dig);
          setRx(false);
          setSpeaker(null);
          await sleep(450 + Math.random() * 1100);
        }
        setRx(false);
        // render the next exchange during the quiet gap
        if (!queue.current.length && neural.state === "ready" && alive()) next = prepare(generate(ch.sim));
        const gap = 3000 + Math.random() * 7000;
        for (let w = 0; w < gap && alive() && !queue.current.length; w += 200) await sleep(200);
      }
    },
    [addLog, meta.digital, prepare, link]
  );

  const startSim = useCallback(
    (ch: Channel, fallback: boolean) => {
      const token = ++simToken.current;
      setStatus(fallback ? "fallback" : "sim");
      void runSim(ch, token);
    },
    [runSim]
  );

  // ---------- tune / power
  useEffect(() => {
    simToken.current++;
    queue.current = [];
    stopSpeech();
    engine.stopStream();
    engine.stopVoice();
    engine.stopOverlay();
    neural.clear();
    setRx(false);
    setSpeaker(null);
    setLastText("");
    if (!power) {
      setStatus("off");
      engine.setHiss(0);
      engine.setCarrier(false);
      return;
    }
    engine.ensure();
    engine.setProfile(meta.filter);
    if (!channel) {
      setStatus("nosignal");
      return;
    }
    if (channel.kind === "sim") {
      addLog("sys", `Tuned ${channel.alias} · ${channel.freq} · simulated traffic`);
      startSim(channel, false);
      return;
    }
    const myToken = simToken.current;
    addLog("sys", `Tuning ${channel.alias} · ${channel.provider} ${channel.kind === "archive" ? "recording" : "live feed"}…`);
    engine.squelchOpen(meta.digital);
    setTimeout(() => engine.squelchTail(meta.digital), 250);
    engine.playStream(channel.url!, {
      seekRandom: channel.kind === "archive",
      onState: (s) => {
        if (simToken.current !== myToken) return;
        if (s === "error") {
          addLog("warn", `No signal from ${channel.provider} (feed offline, blocked, or geo-restricted). Reverting to simulated ${channel.sim.toUpperCase()} traffic.`);
          engine.stopStream();
          startSim(channel, true);
          return;
        }
        if ((s === "live" || s === "live-raw") && statusRef.current !== "live" && statusRef.current !== "live-raw") {
          addLog("sys", s === "live" ? `Signal acquired – audio routed through radio DSP` : `Signal acquired (direct stream, provider blocks DSP processing)`);
        }
        setStatus(s);
      },
    });
    return () => {
      simToken.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [power, channel?.id, meta.filter]);

  useEffect(() => engine.setVolume(volume), [volume]);
  useEffect(() => {
    if (power) engine.setHiss(monitor ? 0.45 : 0);
  }, [monitor, power]);

  // stop everything on unmount
  useEffect(
    () => () => {
      simToken.current++;
      engine.stopAll();
    },
    []
  );

  // level meter polling
  useEffect(() => {
    if (!power) {
      setLevel(0);
      return;
    }
    const iv = setInterval(() => {
      const st = statusRef.current;
      let l = 0;
      if (st === "live") {
        l = engine.getLevel();
        setRx(l > 0.06);
      } else if (st === "live-raw") {
        l = 0.35 + Math.random() * 0.4;
        setRx(true);
      } else if (st === "sim" || st === "fallback") {
        // rendered voice → real analyser level, scaled by received signal strength
        l = txRef.current ? 0 : engine.voiceActive ? Math.max(sigRef.current * 0.35, engine.getLevel()) : -1;
      }
      if (l === -1) {
        setLevel(rxRef.current ? sigRef.current * (0.5 + Math.random() * 0.45) : monitor ? 0.12 + Math.random() * 0.05 : 0);
      } else setLevel(monitor && l < 0.1 ? 0.12 + Math.random() * 0.05 : l);
    }, 110);
    return () => clearInterval(iv);
  }, [power, monitor]);

  // ---------- controls
  const powerRef = useRef(power);
  powerRef.current = power;
  const togglePower = useCallback(() => {
    engine.ensure();
    const next = !powerRef.current;
    powerRef.current = next;
    if (next) {
      void engine.chirp();
      addLog("sys", `${meta.title} powered on`);
      if (neural.state === "off" && neural.preferred) {
        neural.start();
        addLog("sys", "Loading neural radio-voice engine (one-time ~97 MB download, cached afterwards)…");
      }
    } else addLog("sys", "Power off");
    setPower(next);
  }, [addLog, meta.title]);

  const stepChannel = useCallback(
    (d: number) => {
      setChIndex((i) => {
        const n = channels.length;
        const base = i < 0 ? 0 : i;
        return (((base + d) % n) + n) % n;
      });
      if (power) void engine.keyBeep();
    },
    [channels.length, power]
  );

  const selectChannel = useCallback(
    (i: number) => {
      setChIndex(i);
      if (power) void engine.keyBeep();
    },
    [power]
  );

  const isRxOnly = !!channel && channel.kind !== "sim" && status !== "fallback";

  const pttDown = useCallback(() => {
    if (!power || txRef.current) return;
    if (!channel || isRxOnly) {
      void engine.bonk();
      setDenied(true);
      setTimeout(() => setDenied(false), 900);
      addLog("warn", channel ? "TALK PROHIBIT – receive-only public feed" : "No channel – transmit inhibited");
      return;
    }
    txRef.current = true;
    txStart.current = performance.now();
    setTx(true);
    if (meta.digital) void engine.talkPermit();
    else engine.setCarrier(true);
  }, [power, channel, isRxOnly, addLog, meta.digital]);

  const pttUp = useCallback(() => {
    if (!txRef.current) return;
    txRef.current = false;
    setTx(false);
    engine.setCarrier(false);
    const dur = performance.now() - txStart.current;
    addLog("tx", `[keyed ${(dur / 1000).toFixed(1)}s]`, meta.myId);
    if (meta.id === "space" && quindarRef.current) void engine.quindar(false);
    if (Math.random() < 0.85) queue.current.unshift(replyToTx(channel!.sim, meta.myId, dur));
  }, [addLog, channel, meta.id, meta.myId]);

  const toggleEmergency = useCallback(() => {
    if (!power) return;
    const next = !emergency;
    if (next) {
      void engine.emergencyAlert();
      addLog("warn", `EMERGENCY ACTIVATED – ${meta.myId}`);
      if (channel && (channel.kind === "sim" || statusRef.current === "fallback")) queue.current.unshift(replyToEmergency(channel.sim, meta.myId));
    } else addLog("sys", "Emergency cleared");
    setEmergency(next);
  }, [power, emergency, addLog, meta.myId, channel]);

  const sendTones = useCallback(() => {
    if (!power) return;
    addLog("tx", "Manual alert tones (853.2 / 1047.6 Hz)", meta.myId);
    void engine.twoTonePage();
  }, [power, addLog, meta.myId]);

  const addCustom = useCallback(
    (name: string, url: string) => {
      const ch: Channel = {
        id: `custom-${Date.now()}`,
        name,
        alias: name.toUpperCase().slice(0, 9),
        freq: "CUSTOM",
        mode: "STREAM",
        kind: "live",
        url,
        sim: CHANNELS[meta.id][0].sim,
        location: "User programmed",
        provider: new URL(url).hostname,
        custom: true,
      };
      setCustom((c) => {
        const n = [...c, ch];
        localStorage.setItem(storeKey, JSON.stringify(n));
        return n;
      });
      addLog("sys", `Programmed custom channel "${name}"`);
    },
    [meta.id, storeKey, addLog]
  );

  const removeCustom = useCallback(
    (id: string) => {
      setCustom((c) => {
        const n = c.filter((x) => x.id !== id);
        localStorage.setItem(storeKey, JSON.stringify(n));
        return n;
      });
      setChIndex(0);
    },
    [storeKey]
  );

  // keyboard: space = PTT, E = emergency, arrows = channel
  useEffect(() => {
    const isField = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      return t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA");
    };
    const down = (e: KeyboardEvent) => {
      if (isField(e)) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (!e.repeat) pttDown();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (isField(e)) return;
      if (e.code === "Space") {
        e.preventDefault();
        pttUp();
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [pttDown, pttUp]);

  return {
    meta,
    channels,
    channel,
    chIndex,
    power,
    volume,
    monitor,
    status,
    rx,
    tx,
    emergency,
    speaker,
    lastText,
    level,
    log,
    quindar,
    denied,
    isRxOnly,
    rf,
    setRf,
    togglePower,
    setVolume,
    setMonitor,
    stepChannel,
    selectChannel,
    pttDown,
    pttUp,
    toggleEmergency,
    sendTones,
    setQuindar,
    addCustom,
    removeCustom,
    addLog,
  };
}

export type Radio = ReturnType<typeof useRadio>;
