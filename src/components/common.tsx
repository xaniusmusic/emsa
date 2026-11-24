import { useEffect, useRef, useState } from "react";
import type { Radio, RadioStatus } from "../hooks/useRadio";
import { cn } from "../utils/cn";

export function statusText(s: RadioStatus) {
  switch (s) {
    case "off": return "OFF";
    case "connecting": return "LINKING";
    case "buffering": return "BUFFER";
    case "live": return "LIVE";
    case "live-raw": return "LIVE";
    case "sim": return "SIM";
    case "fallback": return "SIM*";
    case "nosignal": return "NO SIG";
    case "error": return "FAIL";
  }
}

/** true for ~1.4s after power-on (self test screen) */
export function useBoot(power: boolean, ms = 1400) {
  const [boot, setBoot] = useState(false);
  useEffect(() => {
    if (!power) return;
    setBoot(true);
    const t = setTimeout(() => setBoot(false), ms);
    return () => clearTimeout(t);
  }, [power, ms]);
  return power && boot;
}

export function useClock() {
  const [d, setD] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setD(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return d;
}

export function KindBadge({ kind, fallback }: { kind: "live" | "archive" | "sim"; fallback?: boolean }) {
  const map = {
    live: ["LIVE", "bg-red-600/20 text-red-300 border-red-500/40"],
    archive: ["ARCHIVE", "bg-violet-600/20 text-violet-300 border-violet-500/40"],
    sim: ["SIM", "bg-slate-600/30 text-slate-300 border-slate-500/40"],
  } as const;
  const [t, c] = map[kind];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded border px-1.5 py-[1px] text-[9px] font-bold tracking-widest", c)}>
      {kind === "live" && <span className="h-1.5 w-1.5 rounded-full bg-red-500 blink" />}
      {t}
      {fallback && <span className="text-amber-300">→SIM</span>}
    </span>
  );
}

export function Directory({ radio }: { radio: Radio }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [err, setErr] = useState("");
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [radio.chIndex]);

  const submit = () => {
    try {
      const u = new URL(url);
      if (u.protocol !== "https:") throw new Error("HTTPS stream URL required");
      if (!name.trim()) throw new Error("Name required");
      radio.addCustom(name.trim(), url.trim());
      setName("");
      setUrl("");
      setAdding(false);
      setErr("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Invalid URL");
    }
  };

  return (
    <div className="flex min-h-0 flex-col rounded-xl border border-white/10 bg-slate-950/70">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <div className="text-[11px] font-bold tracking-[0.2em] text-slate-300">CHANNEL PLAN</div>
        <button onClick={() => setAdding((a) => !a)} className="rounded border border-white/15 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-slate-300 hover:bg-white/10">
          {adding ? "CANCEL" : "+ PROGRAM"}
        </button>
      </div>
      {adding && (
        <div className="space-y-2 border-b border-white/10 bg-slate-900/60 p-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Channel name (e.g. My County Fire)" className="w-full rounded border border-white/10 bg-black/50 px-2 py-1.5 text-xs outline-none focus:border-sky-500" />
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://broadcastify.cdnstream1.com/12345" className="w-full rounded border border-white/10 bg-black/50 px-2 py-1.5 font-mono text-xs outline-none focus:border-sky-500" />
          {err && <div className="text-[11px] text-red-400">{err}</div>}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500">Any public MP3/AAC stream (Broadcastify, LiveATC, Icecast)</span>
            <button onClick={submit} className="rounded bg-sky-600 px-3 py-1 text-[11px] font-bold hover:bg-sky-500">SAVE</button>
          </div>
        </div>
      )}
      <div className="scroll-thin max-h-[360px] min-h-0 overflow-y-auto">
        {radio.channels.map((c, i) => {
          const active = i === radio.chIndex;
          return (
            <button
              key={c.id}
              ref={active ? activeRef : undefined}
              onClick={() => radio.selectChannel(i)}
              className={cn("group flex w-full items-center gap-3 border-b border-white/5 px-3 py-2 text-left transition", active ? "bg-sky-500/15" : "hover:bg-white/5")}
            >
              <span className={cn("w-6 font-mono text-[11px]", active ? "text-sky-300" : "text-slate-500")}>{String(i + 1).padStart(2, "0")}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className={cn("truncate text-[13px] font-semibold", active ? "text-white" : "text-slate-200")}>{c.name}</span>
                </span>
                <span className="block truncate text-[11px] text-slate-500">
                  {c.location} · <span className="font-mono">{c.freq}</span> {c.mode}
                </span>
              </span>
              <span className="flex flex-col items-end gap-1">
                <KindBadge kind={c.kind} fallback={active && radio.status === "fallback"} />
                {c.custom && (
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      radio.removeCustom(c.id);
                    }}
                    className="text-[9px] text-slate-500 hover:text-red-400"
                  >
                    DELETE
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CommsLog({ radio }: { radio: Radio }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [radio.log.length]);
  return (
    <div className="flex min-h-0 flex-col rounded-xl border border-white/10 bg-black/80">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <div className="text-[11px] font-bold tracking-[0.2em] text-slate-300">COMMS LOG / TRANSCRIPT</div>
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <span className={cn("h-2 w-2 rounded-full", radio.rx ? "bg-green-400 shadow-[0_0_8px_#4ade80]" : "bg-slate-700")} /> RX
          <span className={cn("h-2 w-2 rounded-full", radio.tx ? "bg-red-500 shadow-[0_0_8px_#ef4444]" : "bg-slate-700")} /> TX
        </div>
      </div>
      <div ref={ref} className="scroll-thin h-[260px] overflow-y-auto p-3 font-mono2 text-[12px] leading-relaxed">
        {radio.log.length === 0 && <div className="text-slate-600">Power on the radio to begin monitoring…</div>}
        {radio.log.map((l) => (
          <div key={l.id} className="mb-1">
            <span className="text-slate-600">{l.t} </span>
            {l.kind === "sys" && <span className="text-sky-400/80">» {l.text}</span>}
            {l.kind === "warn" && <span className="text-amber-400">⚠ {l.text}</span>}
            {l.kind === "rx" && (
              <span>
                <span className="text-green-400">[{l.who}]</span> <span className="text-slate-200">{l.text}</span>
              </span>
            )}
            {l.kind === "tx" && (
              <span>
                <span className="text-red-400">[TX {l.who}]</span> <span className="text-slate-400">{l.text}</span>
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
