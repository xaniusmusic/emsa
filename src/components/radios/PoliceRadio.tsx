import { useState, type ReactNode } from "react";
import type { Radio } from "../../hooks/useRadio";
import { Knob, Led, PttButton, SignalBars } from "../hw";
import { statusText, useBoot } from "../common";
import { cn } from "../../utils/cn";

function SoftKey({ onClick, children }: { onClick: () => void; children?: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="h-7 flex-1 rounded-[5px] border border-black bg-gradient-to-b from-[#4a4c50] to-[#26282b] text-[9px] font-bold tracking-wider text-white/60 shadow-[0_2px_0_#000,inset_0_1px_0_rgba(255,255,255,.15)] active:translate-y-[1px] active:shadow-none"
    >
      {children}
    </button>
  );
}

export default function PoliceRadio({ radio }: { radio: Radio }) {
  const [dim, setDim] = useState(false);
  const [info, setInfo] = useState(false);
  const boot = useBoot(radio.power);
  const ch = radio.channel;
  const on = radio.power;

  const zones = Array.from(new Set(radio.channels.map((c) => c.zone || "Z9 USER")));
  const nextZone = () => {
    if (!on) return;
    const cur = ch?.zone || "Z9 USER";
    const zi = zones.indexOf(cur);
    const nz = zones[(zi + 1) % zones.length];
    const idx = radio.channels.findIndex((c) => (c.zone || "Z9 USER") === nz);
    radio.selectChannel(idx);
  };
  const zoneChannels = radio.channels.filter((c) => (c.zone || "Z9 USER") === (ch?.zone || "Z9 USER"));
  const posInZone = ch ? zoneChannels.indexOf(ch) + 1 : 0;
  const ledColor = radio.tx ? "#ef4444" : radio.rx ? "#22c55e" : radio.status === "connecting" ? "#f59e0b" : "#22c55e";

  return (
    <div className="flex w-full max-w-[860px] flex-col items-center">
      {/* Control head */}
      <div className="tex-plastic relative w-full rounded-[30px] border-2 border-black p-4 shadow-[0_30px_60px_rgba(0,0,0,.7),inset_0_1px_0_rgba(255,255,255,.08)] sm:p-5">
        <div className="pointer-events-none absolute inset-2 rounded-[24px] border border-white/5" />
        <div className="grid grid-cols-[96px_1fr_96px] items-center gap-3 sm:grid-cols-[120px_1fr_120px] sm:gap-5">
          {/* LEFT */}
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={radio.toggleEmergency}
              title="Emergency"
              className={cn(
                "h-10 w-16 rounded-md border-2 border-black text-[9px] font-black tracking-wider text-black/70 shadow-[0_3px_0_#000] active:translate-y-[2px] active:shadow-none",
                radio.emergency ? "bg-orange-400 shadow-[0_0_18px_#fb923c]" : "bg-gradient-to-b from-[#ff8a1f] to-[#c45a00]"
              )}
              style={{ backgroundImage: "repeating-linear-gradient(90deg, rgba(0,0,0,.12) 0 2px, transparent 2px 5px)" }}
            >
              EMER
            </button>
            <Knob size={84} variant="black" angle={-135 + radio.volume * 270} onStep={(d) => radio.setVolume(Math.max(0, Math.min(1, radio.volume + d * 0.05)))} label="VOL" title="Volume" grip={24} />
            <button
              onClick={radio.togglePower}
              className={cn("h-7 w-7 rounded-full border-2 border-black text-[10px] font-bold shadow-[0_2px_0_#000]", on ? "bg-[#2b2d30] text-green-400" : "bg-[#2b2d30] text-white/40")}
              title="Power"
            >
              ⏻
            </button>
          </div>

          {/* CENTER: LCD + soft keys */}
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <span className="font-display text-[11px] font-bold tracking-[0.3em] text-white/70">SENTINEL</span>
              <span className="text-[9px] tracking-[0.25em] text-white/30">XTL-05 · P25</span>
            </div>
            <div className={cn("relative h-[150px] overflow-hidden rounded-md border-[3px] border-black px-3 py-2", on ? cn("lcd-mono", dim && "dim") : "bg-[#1b211d] shadow-[inset_0_3px_8px_rgba(0,0,0,.8)]")}>
              {on && boot && (
                <div className="flex h-full flex-col items-center justify-center text-center leading-none">
                  <div className="text-[34px]">SENTINEL</div>
                  <div className="text-[20px]">SELF TEST . . . OK</div>
                </div>
              )}
              {on && !boot && (
                <div className="flex h-full flex-col justify-between leading-none">
                  <div className="flex items-center gap-3 text-[18px]">
                    <SignalBars level={radio.status === "nosignal" ? 0 : radio.status === "connecting" ? 0.2 : 0.4 + radio.level * 0.6} />
                    {radio.monitor && <span className="bg-[#0d1a14] px-1 text-[#a9c8b6]">MON</span>}
                    {radio.emergency && <span className="blink bg-[#0d1a14] px-1 text-[#a9c8b6]">EMER</span>}
                    <span className="ml-auto">{radio.tx ? "▲TX" : radio.rx ? "▼RX" : ""}</span>
                    <span className={cn(radio.status === "connecting" && "blink")}>{statusText(radio.status)}</span>
                    <span>H</span>
                  </div>
                  <div className="flex justify-between text-[20px]">
                    <span>{ch?.zone ?? "Z9 USER"}</span>
                    <span>CH {String(posInZone).padStart(2, "0")}</span>
                  </div>
                  <div className={cn("truncate text-center text-[46px] tracking-wider", radio.denied && "blink")}>{radio.denied ? "TALK PROHIBIT" : ch?.alias ?? "-------"}</div>
                  <div className="truncate text-[19px]">
                    {radio.speaker ? `ID: ${radio.speaker.toUpperCase()}` : info ? `${ch?.location ?? ""}`.toUpperCase() : `${ch?.freq ?? ""}  ${ch?.mode ?? ""}  ${radio.isRxOnly ? "RX-ONLY" : "TX-OK"}`}
                  </div>
                  <div className="-mx-1 flex justify-between border-t border-[#0d1a14]/40 pt-0.5 text-[16px]">
                    <span className="w-1/5 text-center">ZONE</span>
                    <span className="w-1/5 text-center">MON</span>
                    <span className="w-1/5 text-center">INFO</span>
                    <span className="w-1/5 text-center">DIM</span>
                    <span className="w-1/5 text-center">HOME</span>
                  </div>
                </div>
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/15 to-transparent" style={{ height: "40%" }} />
            </div>
            <div className="flex gap-2">
              <SoftKey onClick={nextZone} />
              <SoftKey onClick={() => on && radio.setMonitor(!radio.monitor)} />
              <SoftKey onClick={() => setInfo((v) => !v)} />
              <SoftKey onClick={() => setDim((v) => !v)} />
              <SoftKey onClick={() => on && radio.selectChannel(0)} />
            </div>
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => on && radio.stepChannel(-1)} className="h-7 w-12 rounded-full border border-black bg-gradient-to-b from-[#3d3f43] to-[#1e1f22] text-xs text-white/60 shadow-[0_2px_0_#000] active:translate-y-[1px]">◀</button>
              <div className="h-1 w-10 rounded bg-black/60" />
              <button onClick={() => on && radio.stepChannel(1)} className="h-7 w-12 rounded-full border border-black bg-gradient-to-b from-[#3d3f43] to-[#1e1f22] text-xs text-white/60 shadow-[0_2px_0_#000] active:translate-y-[1px]">▶</button>
            </div>
          </div>

          {/* RIGHT */}
          <div className="flex flex-col items-center gap-3">
            <Led on={on && (radio.rx || radio.tx || radio.status === "connecting")} color={ledColor} size={12} blink={radio.status === "connecting"} />
            <Knob size={84} variant="black" onStep={(d) => on && radio.stepChannel(d)} label="CHAN" title="Channel selector" grip={16} />
            <div className="grid grid-cols-2 gap-1">
              <Led on={on && radio.tx} color="#ef4444" size={8} label="TX" />
              <Led on={on && radio.rx} color="#22c55e" size={8} label="RX" />
            </div>
          </div>
        </div>
      </div>

      {/* cord + palm mic */}
      <svg width="40" height="46" viewBox="0 0 40 46" className="-mt-1">
        <path d="M20 0 C 5 4, 35 8, 20 12 C 5 16, 35 20, 20 24 C 5 28, 35 32, 20 36 C 5 40, 35 44, 20 46" stroke="#111" strokeWidth="5" fill="none" />
      </svg>
      <div className="relative flex h-[118px] w-[270px] items-center gap-3 rounded-[40px] border-2 border-black bg-gradient-to-b from-[#2c2e31] to-[#111214] px-4 shadow-[0_18px_30px_rgba(0,0,0,.6)]">
        <div className="grille h-[78px] flex-1 rounded-[28px] bg-[#222]" />
        <PttButton
          radio={radio}
          className={cn(
            "flex h-[86px] w-[86px] flex-col items-center justify-center rounded-[22px] border-2 border-black text-[11px] font-black tracking-widest shadow-[0_4px_0_#000,inset_0_1px_0_rgba(255,255,255,.15)] transition active:translate-y-[3px] active:shadow-none",
            radio.tx ? "bg-red-600 text-white" : "bg-gradient-to-b from-[#3a3c40] to-[#1a1b1d] text-white/60"
          )}
        >
          PTT
          <span className="mt-1 text-[8px] font-medium tracking-wider text-white/40">HOLD / SPACE</span>
        </PttButton>
      </div>
    </div>
  );
}
