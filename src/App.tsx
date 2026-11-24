import { useState } from "react";
import Station from "./components/Station";
import { SERVICES, CHANNELS, type ServiceId } from "./data/channels";
import { cn } from "./utils/cn";
import { VoiceEnginePill } from "./components/VoiceEngine";

const ICONS: Record<ServiceId, string> = {
  police: "M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3z",
  fire: "M12 2c1 4 5 5.5 5 10a5 5 0 01-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3-1-3 0-6 1-8.5z",
  ems: "M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z",
  aviation: "M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z",
  naval: "M2 17h20l-2 4H4l-2-4zm3-2l2-6h10l2 6H5zm5-8V3h4v4h-4z",
  space: "M12 2a10 10 0 100 20 10 10 0 000-20zm0 3l1.5 4.5H18l-3.6 2.7 1.4 4.6L12 14l-3.8 2.8 1.4-4.6L6 9.5h4.5z",
};

export default function App() {
  const [tab, setTab] = useState<ServiceId>("police");
  const live = Object.values(CHANNELS).flat().filter((c) => c.kind !== "sim").length;

  return (
    <div className="min-h-screen bg-[#07090c]">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07090c]/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-4 px-3 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 40 40" className="h-9 w-9">
              <rect x="13" y="14" width="14" height="22" rx="3" fill="#1f2937" stroke="#64748b" />
              <rect x="16" y="18" width="8" height="5" rx="1" fill="#22d3ee" />
              <line x1="17" y1="14" x2="17" y2="4" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M24 7a6 6 0 016 6M24 3a10 10 0 0110 10" stroke="#ef4444" strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>
            <div>
              <div className="font-display text-lg leading-none font-black tracking-[0.2em] text-white">RADIO·SIM</div>
              <div className="text-[10px] tracking-[0.25em] text-slate-500">MULTI-SERVICE COMMUNICATIONS SIMULATOR</div>
            </div>
          </div>
          <VoiceEnginePill />
          <nav className="flex flex-1 flex-wrap justify-end gap-1.5">
            {SERVICES.map((s) => (
              <button
                key={s.id}
                onClick={() => setTab(s.id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] font-bold tracking-[0.18em] transition",
                  tab === s.id ? "border-white/20 bg-white/10 text-white" : "border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200"
                )}
                style={tab === s.id ? { boxShadow: `inset 0 -2px 0 ${s.accent}` } : undefined}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill={tab === s.id ? s.accent : "currentColor"}>
                  <path d={ICONS[s.id]} />
                </svg>
                {s.tab}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-3 pt-5 pb-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl border border-white/10 bg-gradient-to-r from-slate-900/80 to-slate-950/80 px-4 py-2.5 text-[12px] text-slate-400">
          <span>
            <b className="text-slate-200">{live}</b> real public audio sources (Broadcastify · LiveATC · NASA archives)
          </span>
          <span>Audio goes through a real-time radio DSP chain (band-pass, clipping, squelch)</span>
          <span>If a feed is down, the radio automatically switches to procedurally generated traffic</span>
        </div>
      </div>

      <main className="pt-2">
        <Station key={tab} meta={SERVICES.find((s) => s.id === tab)!} />
      </main>

      <footer className="border-t border-white/10 px-6 py-6 text-[11px] leading-relaxed text-slate-500">
        <div className="mx-auto max-w-[1500px]">
          Live scanner audio is streamed directly from public{" "}
          <a className="text-slate-300 underline" href="https://www.broadcastify.com" target="_blank" rel="noreferrer">
            Broadcastify
          </a>{" "}
          feeds and{" "}
          <a className="text-slate-300 underline" href="https://www.liveatc.net" target="_blank" rel="noreferrer">
            LiveATC.net
          </a>{" "}
          receivers run by volunteers. Space air-to-ground audio comes from NASA JSC recordings on the{" "}
          <a className="text-slate-300 underline" href="https://archive.org/details/NasaAudioHighlightReels" target="_blank" rel="noreferrer">
            Internet Archive
          </a>
          . ISS position comes from wheretheiss.at. Carrier, ISS, and training channels are simulations based on published procedures. Device designs are generic and not tied to any manufacturer. This site is for education and entertainment only. Never use it for emergency information.
        </div>
      </footer>
    </div>
  );
}
