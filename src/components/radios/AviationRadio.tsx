import { useEffect, useState } from "react";
import type { Radio } from "../../hooks/useRadio";
import { engine } from "../../audio/engine";
import { Knob, PttButton, Screw, SevenSeg } from "../hw";
import { useBoot } from "../common";
import { cn } from "../../utils/cn";

const VORS: Record<string, [string, string]> = {
  "115.90": ["JFK", "Kennedy VOR"],
  "115.80": ["SFO", "San Francisco VOR"],
  "113.60": ["LAX", "Los Angeles VOR"],
  "113.90": ["ORD", "Chicago O'Hare VOR"],
  "112.70": ["BOS", "Boston VOR"],
  "116.90": ["LAS", "Las Vegas VOR"],
  "117.90": ["DEN", "Denver VOR"],
};

function bumpCom(f: string, part: "mhz" | "khz", d: number) {
  let [m, k] = f.split(".").map(Number);
  if (part === "mhz") m = m + d > 136 ? 118 : m + d < 118 ? 136 : m + d;
  else k = (k + d * 25 + 1000) % 1000;
  return `${m}.${String(k).padStart(3, "0")}`;
}
function bumpNav(f: string, part: "mhz" | "khz", d: number) {
  let [m, k] = f.split(".").map(Number);
  if (part === "mhz") m = m + d > 117 ? 108 : m + d < 108 ? 117 : m + d;
  else k = (k + d * 5 + 100) % 100;
  return `${m}.${String(k).padStart(2, "0")}`;
}

function Concentric({ onOuter, onInner, label }: { onOuter: (d: number) => void; onInner: (d: number) => void; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-[78px] w-[78px]">
        <Knob size={78} variant="black" onStep={onOuter} title="Outer: MHz" grip={22} pointer="#ddd" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <Knob size={42} variant="gray" onStep={onInner} title="Inner: kHz" grip={14} pointer="#fff" />
        </div>
      </div>
      <span className="text-[8px] font-bold tracking-widest text-white/50">{label}</span>
    </div>
  );
}

export default function AviationRadio({ radio }: { radio: Radio }) {
  const on = radio.power;
  const boot = useBoot(on, 1200);
  const [active, setActive] = useState(radio.channels[0].freq);
  const [stby, setStby] = useState("120.500");
  const [navA, setNavA] = useState("115.90");
  const [navS, setNavS] = useState("113.60");
  const [ident, setIdent] = useState<string | null>(null);

  // tuned frequency → channel
  useEffect(() => {
    const idx = radio.channels.findIndex((c) => c.freq === active);
    if (idx !== radio.chIndex) radio.selectChannel(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  // directory selection → frequency
  useEffect(() => {
    const c = radio.channel;
    if (c && c.freq !== active) setActive(c.freq);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radio.chIndex]);

  const amber = "#ffa31a";
  const off = "rgba(255,150,30,0.06)";
  const show = on && !boot;
  const test = on && boot ? "888.888" : "";

  const doIdent = async () => {
    if (!on) return;
    const v = VORS[navA];
    if (!v) {
      setIdent("NO IDENT");
      setTimeout(() => setIdent(null), 1500);
      return;
    }
    setIdent(v[0]);
    radio.addLog("sys", `NAV ${navA} ident: ${v[0]} (${v[1]}) – ${v[0].split("").join(" ")}`);
    await engine.morse(v[0], 9);
    await engine.morse(v[0], 9);
    setIdent(null);
  };

  return (
    <div className="flex w-full max-w-[900px] flex-col items-center gap-5">
      {/* radio stack tray */}
      <div className="w-full rounded-md bg-gradient-to-b from-[#2b2f35] to-[#1a1d21] p-2 shadow-[0_30px_60px_rgba(0,0,0,.7)]">
        <div className="relative rounded-[6px] border-2 border-black bg-[#121315] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,.08)]">
          <Screw className="top-1.5 left-1.5" />
          <Screw className="top-1.5 right-1.5" />
          <Screw className="bottom-1.5 left-1.5" />
          <Screw className="right-1.5 bottom-1.5" />
          <div className="mb-2 flex items-center justify-between px-6">
            <span className="font-display text-[10px] font-bold tracking-[0.35em] text-white/60">AVIONIX</span>
            <span className="text-[9px] tracking-[0.3em] text-white/30">NC-155 TSO</span>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* COM */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-2">
                <Knob size={40} variant="gray" angle={-135 + radio.volume * 270} onStep={(d) => radio.setVolume(Math.max(0, Math.min(1, radio.volume + d * 0.05)))} title="Volume" grip={14} />
                <span className="text-[8px] font-bold tracking-widest text-white/50">VOL</span>
                <button onClick={radio.togglePower} className={cn("rounded border border-black px-2 py-0.5 text-[8px] font-bold", on ? "bg-[#2a2d31] text-amber-400" : "bg-[#2a2d31] text-white/40")}>
                  PWR
                </button>
                <button onClick={() => on && radio.setMonitor(!radio.monitor)} className={cn("rounded border border-black px-1.5 py-0.5 text-[8px] font-bold", radio.monitor ? "bg-amber-500 text-black" : "bg-[#2a2d31] text-white/50")} title="Pull for squelch test (open squelch)">
                  SQ TEST
                </button>
              </div>
              <div className="flex-1 rounded border-2 border-black bg-black px-3 py-2 shadow-[inset_0_2px_8px_rgba(0,0,0,.9)]">
                <div className="flex items-center justify-between text-[9px] font-bold tracking-widest">
                  <span className="text-white/50">COM</span>
                  <span className={cn(radio.tx ? "text-amber-400" : "text-white/10")}>T</span>
                  <span className={cn(radio.rx && show ? "text-amber-400" : "text-white/10")}>RX</span>
                  <span className="text-white/50">STBY</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <SevenSeg value={show ? active : test || "   .   "} color={amber} off={off} height={38} />
                  <SevenSeg value={show ? stby : test || "   .   "} color={amber} off={off} height={26} />
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={() => {
                    if (!on) return;
                    setActive(stby);
                    setStby(active);
                    void engine.keyBeep();
                  }}
                  className="h-7 w-12 rounded border border-black bg-gradient-to-b from-[#3a3d42] to-[#1d1f22] text-[13px] text-white/80 shadow-[0_2px_0_#000] active:translate-y-[1px]"
                  title="Flip-flop active/standby"
                >
                  ⇆
                </button>
                <Concentric label="COM" onOuter={(d) => on && setStby((f) => bumpCom(f, "mhz", d))} onInner={(d) => on && setStby((f) => bumpCom(f, "khz", d))} />
              </div>
            </div>
            {/* NAV */}
            <div className="flex items-center gap-3 border-t border-white/5 pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-4">
              <div className="flex-1 rounded border-2 border-black bg-black px-3 py-2 shadow-[inset_0_2px_8px_rgba(0,0,0,.9)]">
                <div className="flex items-center justify-between text-[9px] font-bold tracking-widest">
                  <span className="text-white/50">NAV</span>
                  <span className={cn(ident ? "blink text-amber-400" : "text-white/10")}>{ident ?? "ID"}</span>
                  <span className="text-white/50">STBY</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <SevenSeg value={show ? navA : on ? "888.88" : "   .  "} color={amber} off={off} height={34} />
                  <SevenSeg value={show ? navS : on ? "888.88" : "   .  "} color={amber} off={off} height={24} />
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      if (!on) return;
                      setNavA(navS);
                      setNavS(navA);
                    }}
                    className="h-7 w-10 rounded border border-black bg-gradient-to-b from-[#3a3d42] to-[#1d1f22] text-[13px] text-white/80 shadow-[0_2px_0_#000]"
                  >
                    ⇆
                  </button>
                  <button onClick={doIdent} className="h-7 w-10 rounded border border-black bg-gradient-to-b from-[#3a3d42] to-[#1d1f22] text-[9px] font-bold text-white/80 shadow-[0_2px_0_#000]" title="Morse ident">
                    ID
                  </button>
                </div>
                <Concentric label="NAV" onOuter={(d) => on && setNavS((f) => bumpNav(f, "mhz", d))} onInner={(d) => on && setNavS((f) => bumpNav(f, "khz", d))} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* yoke PTT + info */}
      <div className="flex w-full flex-wrap items-center justify-center gap-6">
        <div className="flex items-center gap-3">
          <div className="relative h-[90px] w-[150px] rounded-b-[60px] rounded-t-[14px] border-2 border-black bg-gradient-to-b from-[#26292d] to-[#0f1012] shadow-[0_12px_24px_rgba(0,0,0,.6)]">
            <PttButton radio={radio} className={cn("absolute top-3 left-3 h-9 w-9 rounded-full border-2 border-black text-[8px] font-black shadow-[0_3px_0_#000] active:translate-y-[2px] active:shadow-none", radio.tx ? "bg-red-600 text-white" : "bg-[#b91c1c] text-white/80")}>
              PTT
            </PttButton>
            <div className="absolute right-4 bottom-5 text-[9px] font-bold tracking-widest text-white/30">YOKE</div>
          </div>
          <div className="max-w-[240px] text-[11px] leading-relaxed text-slate-400">
            Tune <b className="text-slate-200">STBY</b> with the concentric knob (outer MHz / inner 25 kHz), then press <b className="text-slate-200">⇆</b>. Off-frequency = dead air (try <b className="text-slate-200">SQ TEST</b>).
          </div>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/40 p-3 text-[11px] text-slate-400">
          <div className="mb-1 font-bold tracking-widest text-slate-300">VOR IDENTS</div>
          <div className="grid grid-cols-2 gap-x-4 font-mono">
            {Object.entries(VORS).map(([f, [id]]) => (
              <span key={f}>
                {f} <span className="text-amber-400">{id}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
