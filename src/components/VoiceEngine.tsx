import { useSyncExternalStore } from "react";
import { neural } from "../audio/neural";
import { RF_LEVELS, type Radio } from "../hooks/useRadio";
import { cn } from "../utils/cn";

export function useNeural() {
  return useSyncExternalStore(neural.subscribe, neural.getSnapshot);
}

/** Header pill: neural radio voice engine status + toggle */
export function VoiceEnginePill() {
  const s = useNeural();
  const pct = Math.round(s.progress * 100);
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] font-semibold tracking-wider">
      <span className="text-slate-500">RADIO VOICE</span>
      {s.state === "ready" && (
        <>
          <span className="flex items-center gap-1 text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" /> NEURAL + RF FX
          </span>
          <button onClick={() => neural.disable()} className="text-slate-500 hover:text-slate-300" title="Use browser speech instead">
            ✕
          </button>
        </>
      )}
      {s.state === "loading" && (
        <span className="flex items-center gap-2 text-sky-300" title={s.stage}>
          <span className="relative h-1.5 w-20 overflow-hidden rounded bg-slate-800">
            <span className="absolute inset-y-0 left-0 bg-sky-400 transition-all" style={{ width: `${pct}%` }} />
          </span>
          {pct < 99 ? `${pct}%` : "COMPILING"}
        </span>
      )}
      {(s.state === "off" || s.state === "error") && (
        <button onClick={() => neural.start()} className={cn("rounded px-1.5 py-0.5", s.state === "error" ? "bg-red-500/20 text-red-300" : "bg-sky-500/20 text-sky-300 hover:bg-sky-500/30")} title={s.error || "Download the neural voice engine (~97 MB, cached)"}>
          {s.state === "error" ? "FAILED – RETRY" : "ENABLE NEURAL"}
        </button>
      )}
      {s.state === "unsupported" && <span className="text-amber-300">BROWSER TTS</span>}
    </div>
  );
}

/** RF propagation selector + explanation, shown on every station */
export function RfConditions({ radio }: { radio: Radio }) {
  const s = useNeural();
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3">
      <div>
        <div className="text-[10px] font-bold tracking-[0.25em] text-slate-500">RF CONDITIONS</div>
        <div className="mt-1 flex overflow-hidden rounded-md border border-white/10">
          {RF_LEVELS.map((l, i) => (
            <button
              key={l.id}
              onClick={() => radio.setRf(i)}
              className={cn("px-3 py-1.5 text-[10px] font-bold tracking-widest transition", radio.rf === i ? "bg-sky-600 text-white" : "bg-black/40 text-slate-400 hover:bg-white/5")}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
      <p className="min-w-[240px] flex-1 text-[11px] leading-relaxed text-slate-400">
        {s.state === "ready" ? (
          <>
            Simulated talkers are rendered by a neural voice model and sent through a modeled RF path:{" "}
            {radio.meta.filter === "p25"
              ? "P25 digital frame errors (robotic warble), then hard muting as the signal fades."
              : radio.meta.filter === "nfm"
                ? "FM fading, mobile flutter (picket-fencing), dropouts, and hiss that floods in as the carrier weakens."
                : radio.meta.filter === "space"
                  ? "deep-space hiss, slow fades, and loss-of-signal dropouts."
                  : "AM fading, static crashes, and heterodyne whistles when transmissions overlap."}{" "}
            Field units are weaker than base stations.
          </>
        ) : s.state === "loading" ? (
          <>Downloading the neural voice engine. Until it's ready, browser speech plays with a fading-noise overlay. Full signal-loss processing starts automatically when it loads.</>
        ) : (
          <>Browser speech can't be processed directly, so you'll only hear a noise overlay. Turn on the neural voice engine (header) for true over-the-air voice degradation.</>
        )}
      </p>
    </div>
  );
}
