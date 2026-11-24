import type { ComponentType } from "react";
import { useRadio, type Radio } from "../hooks/useRadio";
import type { ServiceMeta } from "../data/channels";
import { CommsLog, Directory, KindBadge, statusText } from "./common";
import { speechAvailable } from "../audio/speech";
import PoliceRadio from "./radios/PoliceRadio";
import FireRadio from "./radios/FireRadio";
import EMSRadio from "./radios/EMSRadio";
import AviationRadio from "./radios/AviationRadio";
import NavalRadio from "./radios/NavalRadio";
import SpaceConsole from "./radios/SpaceConsole";
import { cn } from "../utils/cn";
import { RfConditions } from "./VoiceEngine";

const RADIOS: Record<string, ComponentType<{ radio: Radio }>> = {
  police: PoliceRadio,
  fire: FireRadio,
  ems: EMSRadio,
  aviation: AviationRadio,
  naval: NavalRadio,
  space: SpaceConsole,
};

const HOW: Record<string, string> = {
  police: "Press ⏻, then turn CHAN (drag / scroll / click). Soft keys: ZONE · MON · INFO · DIM · HOME.",
  fire: "Press the side ⏻ key. Turn the lime channel knob. TONES sends a two-tone page; orange button = emergency.",
  ems: "Press ⏻. Type a channel number on the keypad then #. HOSP = MED-1 hospital patch, PRI = MED-8 dispatch.",
  aviation: "Press PWR. Tune STBY with the concentric knob, then ⇆ to swap. Use ID on NAV to hear a Morse ident.",
  naval: "Turn MODE to TR to power up. PRESET selects channels; FREQ/MODE → 243 jumps to Guard.",
  space: "Press ON and select a voice loop key. Skylab/Apollo loops play real NASA recordings at a random point.",
};

export default function Station({ meta }: { meta: ServiceMeta }) {
  const radio = useRadio(meta);
  const Comp = RADIOS[meta.id];
  const ch = radio.channel;

  return (
    <section className="mx-auto w-full max-w-[1500px] px-3 pb-10 sm:px-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold tracking-[0.35em]" style={{ color: meta.accent }}>
            {meta.tab}
          </div>
          <h2 className="font-display text-xl font-bold tracking-wide text-white sm:text-2xl">{meta.title}</h2>
          <p className="text-sm text-slate-400">{meta.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
          <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono">SPACE</kbd> push-to-talk
          <span className="mx-1 text-slate-700">|</span>
          <span>{HOW[meta.id]}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_400px]">
        <div className="flex flex-col gap-4">
          <div className="desk-bg relative flex min-h-[520px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 px-3 py-10 sm:px-8" style={{ paddingTop: meta.id === "fire" ? 170 : undefined }}>
            {!radio.power && (
              <div className="pointer-events-none absolute top-3 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/10 bg-black/70 px-4 py-1.5 text-[11px] tracking-wider text-slate-300">
                ▶ Radio is OFF — {meta.id === "naval" ? "turn MODE to TR" : "press the power control"} to start
              </div>
            )}
            <Comp radio={radio} />
          </div>

          {/* tuned channel card */}
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-white/10 bg-slate-950/70 p-4 md:grid-cols-[1fr_auto]">
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold tracking-[0.25em] text-slate-500">NOW TUNED</span>
                {ch && <KindBadge kind={ch.kind} fallback={radio.status === "fallback"} />}
                <span className={cn("rounded px-1.5 py-[1px] font-mono text-[10px]", radio.power ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-700/40 text-slate-400")}>{statusText(radio.status)}</span>
                {radio.status === "live-raw" && <span className="text-[10px] text-slate-500">(direct playback – provider blocks DSP)</span>}
              </div>
              <div className="truncate text-lg font-semibold text-white">{ch ? ch.name : "No station on this frequency"}</div>
              <div className="text-sm text-slate-400">
                {ch ? (
                  <>
                    {ch.location} · <span className="font-mono">{ch.freq}</span> · {ch.mode} · Source: {ch.provider}
                    {ch.info && <span className="text-slate-500"> · {ch.info}</span>}
                  </>
                ) : (
                  "Dead air. Open the squelch to hear the noise floor."
                )}
              </div>
              {radio.status === "fallback" && (
                <div className="mt-2 rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-200">
                  Couldn't reach the live feed (it may be offline, blocked by your network, or geo-restricted). The radio is now playing simulated {ch?.sim.toUpperCase()} traffic. Try a different channel to reconnect.
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 text-[11px] text-slate-400">
              <div>
                <div className="text-[10px] tracking-widest text-slate-500">VOLUME</div>
                <input type="range" min={0} max={1} step={0.01} value={radio.volume} onChange={(e) => radio.setVolume(parseFloat(e.target.value))} className="w-32 accent-sky-500" />
              </div>
              <div className="flex h-10 w-24 items-end gap-[2px]">
                {Array.from({ length: 16 }).map((_, i) => (
                  <div key={i} className="flex-1 rounded-sm" style={{ height: `${20 + i * 5}%`, background: radio.level > i / 16 ? (i > 12 ? "#ef4444" : i > 9 ? "#f59e0b" : "#22c55e") : "#1e293b" }} />
                ))}
              </div>
            </div>
          </div>
          <RfConditions radio={radio} />
          {!speechAvailable && <div className="text-[12px] text-amber-400">Your browser lacks speech synthesis — simulated channels will show transcripts only.</div>}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Directory radio={radio} />
          <CommsLog radio={radio} />
        </div>
      </div>
    </section>
  );
}
