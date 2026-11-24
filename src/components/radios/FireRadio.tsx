import type { ReactNode } from "react";
import type { Radio } from "../../hooks/useRadio";
import { Knob, Led, PttButton, SignalBars } from "../hw";
import { statusText, useBoot, useClock } from "../common";
import { cn } from "../../utils/cn";

function Btn({ onClick, children, className }: { onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-lg border-2 border-black bg-gradient-to-b from-[#3a3a3a] to-[#161616] px-2 py-1.5 text-[10px] font-black tracking-wider text-white/70 shadow-[0_3px_0_#000] active:translate-y-[2px] active:shadow-none",
        className
      )}
    >
      {children}
    </button>
  );
}

export default function FireRadio({ radio }: { radio: Radio }) {
  const on = radio.power;
  const boot = useBoot(on);
  const now = useClock();
  const ch = radio.channel;
  const lime = "linear-gradient(160deg, #e6f23a 0%, #c3d100 40%, #95a000 100%)";

  return (
    <div className="flex items-start justify-center gap-6">
      <div className="relative mt-4 select-none" style={{ width: 300 }}>
        {/* antenna */}
        <div className="absolute -top-[150px] left-[34px] h-[170px] w-[30px] rounded-t-[14px] bg-gradient-to-r from-[#1b1b1b] via-[#333] to-[#111] shadow-[0_0_0_2px_#000]">
          <div className="absolute inset-x-1 bottom-4 top-6 rounded" style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,.06) 0 2px, transparent 2px 8px)" }} />
        </div>

        {/* top deck: knobs + emergency */}
        <div className="relative z-10 mx-auto -mb-3 flex h-[96px] w-[270px] items-end justify-end gap-3 rounded-t-[26px] px-4 pb-4" style={{ background: lime, boxShadow: "inset 0 2px 0 rgba(255,255,255,.5), 0 0 0 2px #000" }}>
          <button
            onClick={radio.toggleEmergency}
            className={cn("mb-1 h-11 w-11 rounded-xl border-2 border-black text-[8px] font-black text-black/70 shadow-[0_3px_0_#000] active:translate-y-[2px] active:shadow-none", radio.emergency ? "bg-orange-400 shadow-[0_0_20px_#fb923c]" : "bg-gradient-to-b from-[#ff8a1f] to-[#c45a00]")}
            title="Emergency (orange button)"
          >
            EMER
          </button>
          <Knob size={54} variant="rubber" angle={-135 + radio.volume * 270} onStep={(d) => radio.setVolume(Math.max(0, Math.min(1, radio.volume + d * 0.05)))} title="Volume / Power" grip={20} />
          <Knob size={72} variant="lime" onStep={(d) => on && radio.stepChannel(d)} title="16-position channel knob" grip={10} pointer="#111" />
        </div>

        {/* body */}
        <div className="relative rounded-[34px] p-[14px]" style={{ background: lime, boxShadow: "0 30px 60px rgba(0,0,0,.7), 0 0 0 2px #000, inset 0 2px 0 rgba(255,255,255,.4)" }}>
          {/* side PTT */}
          <PttButton
            radio={radio}
            className={cn(
              "absolute top-[120px] -left-[26px] flex h-[150px] w-[28px] items-center justify-center rounded-l-xl border-2 border-black text-[10px] font-black tracking-widest shadow-[-3px_3px_0_#000] [writing-mode:vertical-rl]",
              radio.tx ? "bg-red-600 text-white" : "bg-gradient-to-r from-[#2a2a2a] to-[#111] text-white/60"
            )}
            style={{ backgroundImage: radio.tx ? undefined : "repeating-linear-gradient(0deg, rgba(255,255,255,.07) 0 2px, transparent 2px 6px)" }}
          >
            PTT
          </PttButton>
          <button onClick={() => on && radio.setMonitor(!radio.monitor)} className="absolute top-[284px] -left-[22px] h-[46px] w-[22px] rounded-l-lg border-2 border-black bg-[#1a1a1a] text-[7px] font-bold text-white/50 [writing-mode:vertical-rl]">
            MON
          </button>
          <button onClick={radio.togglePower} className="absolute top-[340px] -left-[22px] h-[40px] w-[22px] rounded-l-lg border-2 border-black bg-[#1a1a1a] text-[9px] font-bold text-white/50" title="Power">
            ⏻
          </button>

          <div className="rounded-[24px] border-2 border-black bg-gradient-to-b from-[#202020] to-[#0b0b0b] p-4 shadow-[inset_0_2px_6px_rgba(0,0,0,.8)]">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-display text-[11px] font-black tracking-[0.25em] text-[#d4e000]">FIRECOM</span>
              <Led on={on && (radio.rx || radio.tx)} color={radio.tx ? "#ef4444" : "#22c55e"} size={9} />
            </div>
            {/* TFT display */}
            <div className="relative h-[170px] overflow-hidden rounded-lg border-2 border-black" style={{ background: on ? "linear-gradient(180deg,#0d1b2e,#07101c)" : "#050608", boxShadow: "inset 0 2px 8px rgba(0,0,0,.9)" }}>
              {on && boot && <div className="flex h-full items-center justify-center font-display text-sm font-bold tracking-widest text-[#d4e000]">FIRECOM XE</div>}
              {on && !boot && (
                <div className="flex h-full flex-col font-mono2 text-white">
                  <div className="flex items-center gap-2 bg-[#1f3a5f] px-2 py-1 text-[11px]">
                    <SignalBars level={radio.status === "nosignal" ? 0 : 0.4 + radio.level * 0.6} color="#fff" />
                    <span className={cn("rounded px-1 text-[10px] font-bold", radio.status === "fallback" ? "bg-amber-500 text-black" : radio.status.startsWith("live") ? "bg-red-600" : "bg-slate-600")}>{statusText(radio.status)}</span>
                    {radio.monitor && <span className="text-[10px] text-sky-300">MON</span>}
                    <span className="ml-auto">{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}</span>
                    <span className="inline-block h-2.5 w-5 rounded-sm border border-white p-[1px]">
                      <span className="block h-full w-4/5 bg-green-400" />
                    </span>
                  </div>
                  {radio.emergency && <div className="blink bg-orange-500 py-0.5 text-center text-[12px] font-bold text-black">EMERGENCY</div>}
                  <div className="px-2 pt-1 text-[11px] text-sky-300">ZONE {ch?.zone ?? "U"} · CH {radio.chIndex + 1}</div>
                  <div className={cn("truncate px-2 font-display text-[26px] font-bold tracking-wide text-[#e9ff4a]", radio.denied && "blink")}>{radio.denied ? "TX INHIBIT" : ch?.alias ?? "—"}</div>
                  <div className="truncate px-2 text-[11px] text-slate-300">{ch?.name}</div>
                  <div className="mt-auto truncate border-t border-white/10 px-2 py-1 text-[11px]">
                    {radio.tx ? <span className="text-red-400">● TRANSMIT</span> : radio.speaker ? <span className="text-green-400">◀ {radio.speaker}</span> : <span className="text-slate-400">{ch?.freq} {ch?.mode}</span>}
                  </div>
                  <div className="grid grid-cols-3 bg-[#132238] text-center text-[10px] text-slate-300">
                    <span>TONES</span>
                    <span>ZONE</span>
                    <span>HOME</span>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Btn onClick={radio.sendTones}>TONES</Btn>
              <Btn
                onClick={() => {
                  if (!on) return;
                  const zones = Array.from(new Set(radio.channels.map((c) => c.zone || "U")));
                  const nz = zones[(zones.indexOf(ch?.zone || "U") + 1) % zones.length];
                  radio.selectChannel(radio.channels.findIndex((c) => (c.zone || "U") === nz));
                }}
              >
                ZONE
              </Btn>
              <Btn onClick={() => on && radio.selectChannel(0)}>HOME</Btn>
            </div>
            <div className="mt-2 flex items-center justify-center gap-2">
              <Btn onClick={() => on && radio.stepChannel(-1)} className="w-14">◀</Btn>
              <Btn onClick={() => on && radio.stepChannel(1)} className="w-14">▶</Btn>
            </div>
            <div className="grille mt-4 h-[120px] rounded-2xl bg-[#2a2a2a]" />
          </div>
        </div>
      </div>
    </div>
  );
}
