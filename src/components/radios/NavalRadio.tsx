import { useEffect, useRef, useState } from "react";
import type { Radio } from "../../hooks/useRadio";
import { engine } from "../../audio/engine";
import { Knob, PttButton, Screw } from "../hw";
import { cn } from "../../utils/cn";

function Selector({ options, value, onChange, label, size = 70 }: { options: string[]; value: number; onChange: (i: number) => void; label: string; size?: number }) {
  const span = 240;
  const start = -120;
  const step = options.length > 1 ? span / (options.length - 1) : 0;
  const R = size / 2 + 18;
  const box = size + 70;
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: box, height: box - 10 }}>
        {options.map((o, i) => {
          const a = ((start + i * step - 90) * Math.PI) / 180;
          return (
            <button
              key={o}
              onClick={() => onChange(i)}
              className={cn("absolute -translate-x-1/2 -translate-y-1/2 font-mono2 text-[9px] font-bold whitespace-nowrap", i === value ? "text-white" : "text-white/45 hover:text-white/80")}
              style={{ left: box / 2 + Math.cos(a) * R, top: box / 2 + Math.sin(a) * R }}
            >
              {o}
            </button>
          );
        })}
        <div className="absolute" style={{ left: (box - size) / 2, top: (box - size) / 2 }}>
          <Knob size={size} variant="olive" angle={start + value * step} onStep={(d) => onChange(Math.max(0, Math.min(options.length - 1, value + d)))} grip={12} pointer="#f5f5f5" title={label} />
        </div>
      </div>
      <span className="-mt-2 text-[9px] font-bold tracking-[0.25em] text-white/70">{label}</span>
    </div>
  );
}

const MODES = ["OFF", "TR", "TR+G", "TEST"];
const FMODES = ["PRST", "MAN", "243"];

export default function NavalRadio({ radio }: { radio: Radio }) {
  const [mode, setMode] = useState(0);
  const [fmode, setFmode] = useState(0);
  const [bright, setBright] = useState(true);
  const [bit, setBit] = useState(false);
  const lastPreset = useRef(0);
  const on = radio.power;
  const ch = radio.channel;
  const guardIdx = radio.channels.findIndex((c) => c.id === "guard");

  // sync power with MODE knob
  useEffect(() => {
    const want = mode !== 0;
    if (want !== radio.power) radio.togglePower();
    if (mode === 3) {
      setBit(true);
      void engine.tones([{ f: 1000, d: 0.15, g: 0.1 }, { f: 1500, d: 0.15 }], 0.1);
      const t = setTimeout(() => setBit(false), 2200);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // keep knob in sync if power toggled elsewhere
  useEffect(() => {
    if (!radio.power && mode !== 0) setMode(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radio.power]);

  const changeF = (i: number) => {
    setFmode(i);
    if (FMODES[i] === "243" && guardIdx >= 0) {
      if (radio.chIndex !== guardIdx) lastPreset.current = radio.chIndex;
      radio.selectChannel(guardIdx);
    } else if (FMODES[fmode] === "243") radio.selectChannel(lastPreset.current);
  };

  const preset = String(radio.chIndex + 1).padStart(2, "0");

  return (
    <div className="flex w-full max-w-[900px] flex-col items-center gap-5 lg:flex-row lg:items-start lg:justify-center">
      {/* control head */}
      <div className="tex-mil relative w-full max-w-[560px] rounded-[6px] border-2 border-black px-6 pt-6 pb-4 shadow-[0_30px_60px_rgba(0,0,0,.7),inset_0_1px_0_rgba(255,255,255,.08)]">
        {[
          "top-2 left-2",
          "top-2 right-2",
          "bottom-2 left-2",
          "bottom-2 right-2",
        ].map((p) => (
          <Screw key={p} className={cn(p, "h-4 w-4")} />
        ))}
        <div className="mb-3 flex items-center justify-between text-[9px] font-bold tracking-[0.25em] text-white/60">
          <span>RT-1851 / C-12561 · UHF-VHF</span>
          <span>XMT {radio.tx ? <span className="text-red-400">●</span> : "○"}</span>
        </div>
        {/* NVIS display */}
        <div className={cn("relative rounded-sm border-[3px] border-black px-3 py-2", on ? "nvis" : "bg-[#030503] shadow-[inset_0_3px_10px_rgba(0,0,0,.9)]")} style={{ opacity: on ? (bright ? 1 : 0.55) : 1 }}>
          {on ? (
            bit ? (
              <div className="py-3 text-center text-[28px] leading-none">BIT TEST · · · GO</div>
            ) : (
              <div className="leading-none">
                <div className="flex justify-between text-[26px]">
                  <span>{FMODES[fmode] === "243" ? "G" : "P"}{preset}</span>
                  <span>{ch?.freq ?? "---.---"}</span>
                  <span>AM</span>
                </div>
                <div className={cn("text-center text-[34px] tracking-[0.15em]", radio.denied && "blink")}>{radio.denied ? "XMT INHIBIT" : ch?.alias ?? "--------"}</div>
                <div className="flex justify-between text-[18px]">
                  <span>{MODES[mode]}</span>
                  <span>{radio.monitor ? "SQL OFF" : "SQL ON"}</span>
                  <span className={cn(radio.status === "connecting" && "blink")}>{radio.status === "live" || radio.status === "live-raw" ? "LIVE RX" : radio.status === "fallback" ? "SIM*" : radio.status === "sim" ? "TRNG" : radio.status.toUpperCase()}</span>
                  <span>{radio.tx ? "XMIT" : radio.rx ? "RCV" : "    "}</span>
                </div>
                <div className="mt-1 truncate text-[16px] opacity-80">{radio.speaker ? `> ${radio.speaker.toUpperCase()}` : ch?.location.toUpperCase()}</div>
              </div>
            )
          ) : (
            <div className="h-[104px]" />
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-1">
          <Selector options={MODES} value={mode} onChange={setMode} label="MODE" />
          <div className="flex flex-col items-center pt-6">
            <Knob size={74} variant="olive" onStep={(d) => on && FMODES[fmode] !== "243" && radio.stepChannel(d)} grip={14} title="Preset channel" />
            <span className="mt-2 text-[9px] font-bold tracking-[0.25em] text-white/70">PRESET</span>
          </div>
          <Selector options={FMODES} value={fmode} onChange={changeF} label="FREQ/MODE" />
        </div>

        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="flex flex-col items-center">
            <Knob size={40} variant="olive" angle={-135 + radio.volume * 270} onStep={(d) => radio.setVolume(Math.max(0, Math.min(1, radio.volume + d * 0.05)))} grip={10} />
            <span className="text-[8px] font-bold tracking-widest text-white/60">VOL</span>
          </div>
          {[
            ["SQL", () => on && radio.setMonitor(!radio.monitor), !radio.monitor],
            ["BRT", () => setBright((b) => !b), bright],
            ["EMER", radio.toggleEmergency, radio.emergency],
          ].map(([l, fn, lit]) => (
            <button key={l as string} onClick={fn as () => void} className={cn("h-9 w-14 rounded-sm border-2 border-black text-[10px] font-bold tracking-wider shadow-[0_2px_0_#000] active:translate-y-[1px]", lit && on ? (l === "EMER" ? "bg-red-700 text-white" : "bg-[#1d2a1d] text-[#6dff7a]") : "bg-[#2a2e29] text-white/60")}>
              {l as string}
            </button>
          ))}
          <PttButton radio={radio} className={cn("h-12 w-24 rounded-sm border-2 border-black text-[10px] font-black tracking-widest shadow-[0_3px_0_#000] active:translate-y-[2px] active:shadow-none", radio.tx ? "bg-red-600 text-white" : "bg-[#1f231e] text-white/70")}>
            MIC / PTT
          </PttButton>
        </div>
      </div>

      {/* kneeboard */}
      <div className="w-full max-w-[300px] rotate-[1deg] rounded-sm bg-[#e9e4d4] p-4 text-[#1b1b1b] shadow-[0_20px_40px_rgba(0,0,0,.6)]" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent 0 21px, rgba(0,0,80,.12) 21px 22px)" }}>
        <div className="mb-2 border-b-2 border-black pb-1 text-center font-mono2 text-[13px] font-bold">CVN-7X COMM CARD</div>
        <table className="w-full font-mono2 text-[12px]">
          <tbody>
            {radio.channels.map((c, i) => (
              <tr key={c.id} className={cn("cursor-pointer", i === radio.chIndex && "bg-yellow-300/70")} onClick={() => radio.selectChannel(i)}>
                <td className="pr-2">{String(i + 1).padStart(2, "0")}</td>
                <td className="pr-2 font-bold">{c.alias}</td>
                <td className="text-right">{c.freq}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 font-mono2 text-[10px] leading-snug">
          CASE III: MARSHAL → APPROACH → PADDLES @ ¾ NM
          <br />
          BALL CALL: SIDE NR, TYPE, FUEL STATE
          <br />
          GUARD 243.0 · BINGO 3.0 · MOTHER BRC 045
        </div>
      </div>
    </div>
  );
}
