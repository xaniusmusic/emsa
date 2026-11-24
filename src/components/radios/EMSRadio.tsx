import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Radio } from "../../hooks/useRadio";
import { engine } from "../../audio/engine";
import { Knob, Led, PttButton, SignalBars } from "../hw";
import { statusText, useBoot } from "../common";
import { cn } from "../../utils/cn";

function Key({ onClick, children, className, sub }: { onClick: () => void; children: ReactNode; className?: string; sub?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex h-9 flex-col items-center justify-center rounded-md border border-black bg-gradient-to-b from-[#e7e9ec] to-[#a9aeb5] text-[13px] font-bold leading-none text-[#1d2430] shadow-[0_2px_0_#111,inset_0_1px_0_#fff] active:translate-y-[1px] active:shadow-none",
        className
      )}
    >
      {children}
      {sub && <span className="mt-[2px] text-[7px] font-semibold tracking-wider text-[#1d2430]/60">{sub}</span>}
    </button>
  );
}

export default function EMSRadio({ radio }: { radio: Radio }) {
  const on = radio.power;
  const boot = useBoot(on);
  const ch = radio.channel;
  const [entry, setEntry] = useState("");
  const timer = useRef<number | null>(null);

  const commit = (val: string) => {
    const n = parseInt(val, 10);
    if (n >= 1 && n <= radio.channels.length) radio.selectChannel(n - 1);
    else void engine.outOfRange();
    setEntry("");
  };

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const press = (k: string) => {
    if (!on) return;
    void engine.keyBeep();
    if (timer.current) clearTimeout(timer.current);
    if (k === "*") return setEntry("");
    if (k === "#") return commit(entry);
    const next = (entry + k).slice(-2);
    setEntry(next);
    timer.current = window.setTimeout(() => commit(next), 1600);
  };

  const jump = (id: string) => {
    if (!on) return;
    const i = radio.channels.findIndex((c) => c.id === id);
    if (i >= 0) radio.selectChannel(i);
  };

  const keys: [string, string?][] = [["1"], ["2", "ABC"], ["3", "DEF"], ["4", "GHI"], ["5", "JKL"], ["6", "MNO"], ["7", "PQRS"], ["8", "TUV"], ["9", "WXYZ"], ["*", "CLR"], ["0"], ["#", "ENT"]];

  return (
    <div className="flex w-full max-w-[900px] flex-col items-center gap-4">
      <div className="relative w-full rounded-[18px] border-2 border-black bg-gradient-to-b from-[#3b4350] to-[#1f242c] p-3 shadow-[0_30px_60px_rgba(0,0,0,.7)]">
        <div className="tex-metal absolute inset-x-0 top-0 h-3 rounded-t-[16px] opacity-60" />
        <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-[150px_1fr_190px]">
          {/* left: speaker, power, volume */}
          <div className="flex items-center gap-3 md:flex-col">
            <div className="slot-grille h-16 w-full rounded-lg bg-[#0e1116] md:h-24" />
            <div className="flex items-center gap-3">
              <button onClick={radio.togglePower} className={cn("h-9 w-9 rounded-full border-2 border-black text-sm shadow-[0_2px_0_#000]", on ? "bg-[#1e293b] text-amber-400" : "bg-[#1e293b] text-white/40")} title="Power">
                ⏻
              </button>
              <Knob size={60} variant="chrome" angle={-135 + radio.volume * 270} onStep={(d) => radio.setVolume(Math.max(0, Math.min(1, radio.volume + d * 0.05)))} label="VOL" pointer="#111" grip={30} />
            </div>
          </div>

          {/* center: display + function keys */}
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <span className="font-display text-[12px] font-bold tracking-[0.3em] text-sky-300/80">MEDCOM</span>
              <span className="text-[9px] tracking-[0.3em] text-white/30">TK-890 UHF/VHF · 50W</span>
            </div>
            <div className={cn("relative h-[130px] overflow-hidden rounded-md border-[3px] border-black px-4 py-2", on ? "lcd-amber" : "bg-[#0c0905] shadow-[inset_0_3px_10px_rgba(0,0,0,.9)]")}>
              {on && boot && <div className="flex h-full items-center justify-center text-[30px] tracking-[0.2em]">MEDCOM  READY</div>}
              {on && !boot && (
                <div className="flex h-full flex-col justify-between leading-none">
                  <div className="flex items-center gap-3 text-[17px]">
                    <SignalBars level={radio.status === "nosignal" ? 0 : 0.4 + radio.level * 0.6} color="#ffb000" />
                    <span className={cn(radio.tx ? "opacity-100" : "opacity-20")}>TX</span>
                    <span className={cn(radio.rx ? "opacity-100" : "opacity-20")}>RX</span>
                    <span className={cn(radio.monitor ? "opacity-100" : "opacity-20")}>MON</span>
                    <span className={cn(ch?.id === "sim-med-8" ? "opacity-100" : "opacity-20")}>PRI</span>
                    <span className={cn(radio.emergency ? "blink opacity-100" : "opacity-20")}>EMER</span>
                    <span className="ml-auto">{statusText(radio.status)}</span>
                  </div>
                  <div className="flex items-baseline gap-4">
                    <span className="text-[22px]">{entry ? `CH ${entry.padEnd(2, "_")}` : `CH ${String(radio.chIndex + 1).padStart(2, "0")}`}</span>
                    <span className={cn("truncate text-[50px] tracking-[0.12em]", radio.denied && "blink")}>{radio.denied ? "TX DENIED" : ch?.alias ?? "--------"}</span>
                  </div>
                  <div className="flex justify-between gap-3 truncate text-[18px]">
                    <span className="truncate">{radio.speaker ? `◄ ${radio.speaker.toUpperCase()}` : ch?.name.toUpperCase()}</span>
                    <span className="shrink-0">{ch?.freq}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[
                ["PRI", () => jump("sim-med-8")],
                ["HOSP", () => jump("sim-med-1")],
                ["MON", () => on && radio.setMonitor(!radio.monitor)],
                ["▼", () => on && radio.stepChannel(-1)],
                ["▲", () => on && radio.stepChannel(1)],
              ].map(([l, fn]) => (
                <button key={l as string} onClick={fn as () => void} className="h-8 rounded-md border border-black bg-gradient-to-b from-[#56606e] to-[#2b313a] text-[10px] font-bold tracking-wider text-white/80 shadow-[0_2px_0_#000] active:translate-y-[1px] active:shadow-none">
                  {l as string}
                </button>
              ))}
            </div>
          </div>

          {/* right: keypad */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Led on={on && (radio.tx || radio.rx)} color={radio.tx ? "#ef4444" : "#22c55e"} label={radio.tx ? "TX" : "RX"} />
              <button onClick={radio.toggleEmergency} className={cn("rounded-md border-2 border-black px-3 py-1 text-[10px] font-black text-white shadow-[0_2px_0_#000]", radio.emergency ? "bg-red-500 shadow-[0_0_16px_#ef4444]" : "bg-red-800")}>
                EMER
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {keys.map(([k, s]) => (
                <Key key={k} onClick={() => press(k)} sub={s}>
                  {k}
                </Key>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* hand mic */}
      <div className="flex items-center gap-4">
        <PttButton
          radio={radio}
          className={cn(
            "flex h-[64px] w-[260px] items-center justify-center gap-3 rounded-full border-2 border-black text-[12px] font-black tracking-[0.3em] shadow-[0_6px_0_#000] transition active:translate-y-[4px] active:shadow-none",
            radio.tx ? "bg-red-600 text-white" : "bg-gradient-to-b from-[#3a4250] to-[#161a20] text-white/70"
          )}
        >
          <span className="grille h-8 w-16 rounded-full bg-[#222]" />
          PUSH TO TALK
        </PttButton>
        <div className="text-[11px] text-slate-500">Keypad: type channel # then <b className="text-slate-300">#</b></div>
      </div>
    </div>
  );
}
