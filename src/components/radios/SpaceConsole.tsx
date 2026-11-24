import { useEffect, useState } from "react";
import type { Radio } from "../../hooks/useRadio";
import { Knob, PttButton } from "../hw";
import { statusText, useClock } from "../common";
import { cn } from "../../utils/cn";

interface IssPos {
  latitude: number;
  longitude: number;
  altitude: number;
  velocity: number;
  visibility: string;
  footprint: number;
  timestamp: number;
}

function useISS() {
  const [pos, setPos] = useState<IssPos | null>(null);
  const [trail, setTrail] = useState<[number, number][]>([]);
  const [future, setFuture] = useState<[number, number][]>([]);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let alive = true;
    const get = async () => {
      try {
        const r = await fetch("https://api.wheretheiss.at/v1/satellites/25544");
        if (!r.ok) throw new Error();
        const d: IssPos = await r.json();
        if (!alive) return;
        setErr(false);
        setPos(d);
        setTrail((t) => [...t.slice(-180), [d.longitude, d.latitude]]);
      } catch {
        if (alive) setErr(true);
      }
    };
    const getFuture = async () => {
      try {
        const now = Math.floor(Date.now() / 1000);
        const ts = Array.from({ length: 10 }, (_, i) => now + (i + 1) * 560).join(",");
        const r = await fetch(`https://api.wheretheiss.at/v1/satellites/25544/positions?timestamps=${ts}&units=kilometers`);
        if (!r.ok) return;
        const d: IssPos[] = await r.json();
        if (alive) setFuture(d.map((p) => [p.longitude, p.latitude]));
      } catch {
        /* ignore */
      }
    };
    void get();
    void getFuture();
    const iv = setInterval(get, 5000);
    const iv2 = setInterval(getFuture, 120000);
    return () => {
      alive = false;
      clearInterval(iv);
      clearInterval(iv2);
    };
  }, []);
  return { pos, trail, future, err };
}

const px = (lon: number) => ((lon + 180) / 360) * 360;
const py = (lat: number) => ((90 - lat) / 180) * 180;
function pathFor(pts: [number, number][]) {
  let d = "";
  pts.forEach(([lon, lat], i) => {
    const jump = i > 0 && Math.abs(lon - pts[i - 1][0]) > 180;
    d += `${i === 0 || jump ? "M" : "L"}${px(lon).toFixed(1)},${py(lat).toFixed(1)} `;
  });
  return d;
}

function VU({ level }: { level: number }) {
  const a = -50 + Math.min(1, level) * 100;
  return (
    <div className="relative h-[70px] w-[120px] overflow-hidden rounded-md border-2 border-black bg-gradient-to-b from-[#f6eccd] to-[#d9cba0] shadow-[inset_0_2px_6px_rgba(0,0,0,.5)]">
      <svg viewBox="0 0 120 70" className="absolute inset-0">
        <path d="M15 58 A 50 50 0 0 1 105 58" fill="none" stroke="#333" strokeWidth="1" />
        <path d="M82 22 A 50 50 0 0 1 105 58" fill="none" stroke="#c00" strokeWidth="3" />
        {[-50, -30, -10, 10, 30, 50].map((t) => (
          <line key={t} x1={60 + Math.sin((t * Math.PI) / 180) * 46} y1={64 - Math.cos((t * Math.PI) / 180) * 46} x2={60 + Math.sin((t * Math.PI) / 180) * 52} y2={64 - Math.cos((t * Math.PI) / 180) * 52} stroke="#222" strokeWidth="1" />
        ))}
        <text x="60" y="40" textAnchor="middle" fontSize="8" fill="#333" fontFamily="monospace">VU</text>
      </svg>
      <div className="absolute bottom-[6px] left-1/2 h-[54px] w-[1.5px] origin-bottom bg-black transition-transform duration-100" style={{ transform: `translateX(-50%) rotate(${a}deg)` }} />
    </div>
  );
}

export default function SpaceConsole({ radio }: { radio: Radio }) {
  const on = radio.power;
  const now = useClock();
  const { pos, trail, future, err } = useISS();
  const ch = radio.channel;
  const gmt = now.toISOString().slice(11, 19);
  const doy = Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - Date.UTC(now.getUTCFullYear(), 0, 0)) / 86400000);
  // simulated TDRS/ZOE comm coverage: LOS when over central Indian Ocean
  const los = pos ? pos.longitude > 60 && pos.longitude < 95 && Math.abs(pos.latitude) < 40 : false;

  return (
    <div className="w-full max-w-[980px]">
      <div className="rounded-t-[14px] border-2 border-black bg-gradient-to-b from-[#4a5562] to-[#2f3742] p-3 shadow-[0_30px_60px_rgba(0,0,0,.7)]">
        <div className="mb-2 flex items-center justify-between px-1 text-[10px] font-bold tracking-[0.3em] text-white/60">
          <span>MCC-H · FLIGHT CONTROL ROOM · COMM</span>
          <span className="font-mono2 tracking-wider">GMT {doy}/{gmt}</span>
        </div>
        {/* CRT */}
        <div className="rounded-lg border-[6px] border-[#1a1f25] bg-black p-1 shadow-[inset_0_0_20px_#000]">
          <div className="crt grid grid-cols-1 gap-3 rounded p-3 md:grid-cols-[260px_1fr]">
            <div className="text-[12px] leading-[1.45]">
              <div className="text-[13px] text-white/90">ISS (ZARYA) NORAD 25544</div>
              {pos ? (
                <>
                  <div>LAT  {pos.latitude.toFixed(3).padStart(8)}°</div>
                  <div>LON  {pos.longitude.toFixed(3).padStart(8)}°</div>
                  <div>ALT  {pos.altitude.toFixed(1)} KM</div>
                  <div>VEL  {pos.velocity.toFixed(0)} KM/H</div>
                  <div>LIGHT {pos.visibility === "daylight" ? "DAY" : "ECLIPSE"}</div>
                  <div>FTPRNT {pos.footprint.toFixed(0)} KM</div>
                </>
              ) : (
                <div className="blink">{err ? "TLM DROPOUT – RETRY" : "ACQUIRING TLM…"}</div>
              )}
              <div className="mt-2 border-t border-[#57ffb0]/30 pt-2">
                <div>
                  LOOP <span className="text-white">{on ? ch?.alias : "----"}</span>
                </div>
                <div>SRC  {on ? (ch?.kind === "archive" ? "NASA ARCHIVE" : ch?.kind === "live" ? "LIVE" : "SIM S/G") : "--"}</div>
                <div>
                  STAT <span className={cn(radio.status === "connecting" && "blink")}>{statusText(radio.status)}</span> {ch?.id.startsWith("iss") && on && <span>{los ? "· ZOE LOS" : "· TDRS AOS"}</span>}
                </div>
                <div className="truncate">TALK {radio.speaker ? radio.speaker.toUpperCase() : radio.rx ? "ACTIVE" : "—"}</div>
              </div>
            </div>
            <div className="relative">
              <svg viewBox="0 0 360 180" className="h-full w-full" preserveAspectRatio="none">
                {Array.from({ length: 13 }).map((_, i) => (
                  <line key={"v" + i} x1={i * 30} y1={0} x2={i * 30} y2={180} stroke="#57ffb0" strokeOpacity={i === 6 ? 0.4 : 0.15} strokeWidth="0.5" />
                ))}
                {Array.from({ length: 7 }).map((_, i) => (
                  <line key={"h" + i} x1={0} y1={i * 30} x2={360} y2={i * 30} stroke="#57ffb0" strokeOpacity={i === 3 ? 0.4 : 0.15} strokeWidth="0.5" />
                ))}
                <rect x={px(60)} y={py(40)} width={px(95) - px(60)} height={py(-40) - py(40)} fill="#ff5050" fillOpacity="0.08" stroke="#ff5050" strokeOpacity="0.3" strokeDasharray="2 2" />
                <text x={px(62)} y={py(36)} fontSize="6" fill="#ff8080">ZOE</text>
                {future.length > 1 && pos && <path d={pathFor([[pos.longitude, pos.latitude], ...future])} fill="none" stroke="#57ffb0" strokeOpacity="0.35" strokeDasharray="3 3" strokeWidth="1" />}
                {trail.length > 1 && <path d={pathFor(trail)} fill="none" stroke="#57ffb0" strokeWidth="1.4" />}
                {pos && (
                  <g transform={`translate(${px(pos.longitude)},${py(pos.latitude)})`}>
                    <circle r={(pos.footprint / 40075) * 360 * 0.5} fill="#57ffb0" fillOpacity="0.07" stroke="#57ffb0" strokeOpacity="0.3" />
                    <circle r="3" fill="#fff" />
                    <circle r="6" fill="none" stroke="#fff" strokeOpacity="0.6" className="blink" />
                  </g>
                )}
                {/* MCC Houston */}
                <circle cx={px(-95.1)} cy={py(29.6)} r="2" fill="#ffd166" />
                <text x={px(-95.1) + 4} y={py(29.6) + 2} fontSize="6" fill="#ffd166">MCC-H</text>
                <circle cx={px(37.6)} cy={py(55.9)} r="2" fill="#ffd166" />
                <text x={px(37.6) + 4} y={py(55.9) + 2} fontSize="6" fill="#ffd166">TsUP</text>
              </svg>
              <div className="absolute right-1 bottom-0 text-[9px] text-[#57ffb0]/60">LIVE GROUND TRACK · wheretheiss.at</div>
            </div>
          </div>
        </div>

        {/* voice loop keyset */}
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {radio.channels.map((c, i) => {
            const act = i === radio.chIndex && on;
            const talking = act && radio.rx;
            return (
              <button
                key={c.id}
                onClick={() => radio.selectChannel(i)}
                className={cn(
                  "relative h-14 rounded-sm border-2 border-black px-1 text-center font-mono2 text-[11px] leading-tight font-bold shadow-[0_3px_0_#000] transition active:translate-y-[2px] active:shadow-none",
                  act ? (talking ? "bg-[#fff8d6] text-black shadow-[0_0_18px_rgba(255,240,180,.7)]" : "bg-[#3ddc84] text-black shadow-[0_0_14px_rgba(61,220,132,.5)]") : "bg-[#1a2027] text-white/60 hover:text-white"
                )}
              >
                {c.alias}
                <span className={cn("block text-[8px] font-normal tracking-wider", act ? "text-black/60" : "text-white/30")}>{c.kind === "archive" ? "A/G REC" : c.kind === "live" ? "LIVE" : "MON/TALK"}</span>
              </button>
            );
          })}
        </div>
      </div>
      {/* console desk lip */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-b-[14px] border-2 border-t-0 border-black bg-gradient-to-b from-[#252b33] to-[#151a20] px-5 py-4">
        <div className="flex items-center gap-4">
          <button onClick={radio.togglePower} className={cn("h-12 w-12 rounded-full border-2 border-black text-[9px] font-black shadow-[0_3px_0_#000]", on ? "bg-[#3ddc84] text-black" : "bg-[#3a1d1d] text-white/60")}>
            {on ? "ON" : "OFF"}
          </button>
          <Knob size={56} variant="chrome" angle={-135 + radio.volume * 270} onStep={(d) => radio.setVolume(Math.max(0, Math.min(1, radio.volume + d * 0.05)))} label="LOOP VOL" pointer="#111" grip={28} />
          <VU level={on ? radio.level : 0} />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => radio.setQuindar(!radio.quindar)} className="flex flex-col items-center gap-1">
            <div className="relative h-10 w-6 rounded-full border-2 border-black bg-[#0d1014]">
              <div className={cn("absolute left-1/2 h-5 w-3 -translate-x-1/2 rounded-sm bg-gradient-to-b from-gray-200 to-gray-500 transition-all", radio.quindar ? "top-0.5" : "bottom-0.5")} />
            </div>
            <span className="text-[8px] font-bold tracking-widest text-white/60">QUINDAR</span>
          </button>
          <button onClick={() => on && radio.setMonitor(!radio.monitor)} className={cn("h-10 rounded-sm border-2 border-black px-3 text-[10px] font-bold shadow-[0_2px_0_#000]", radio.monitor ? "bg-amber-400 text-black" : "bg-[#1a2027] text-white/60")}>
            OPEN LOOP
          </button>
          <button onClick={radio.toggleEmergency} className={cn("h-10 rounded-sm border-2 border-black px-3 text-[10px] font-bold shadow-[0_2px_0_#000]", radio.emergency ? "bg-red-600 text-white" : "bg-[#3a1d1d] text-white/60")}>
            CAUTION &amp; WARN
          </button>
          <PttButton radio={radio} className={cn("h-14 w-28 rounded-md border-2 border-black text-[11px] font-black tracking-widest shadow-[0_4px_0_#000] active:translate-y-[3px] active:shadow-none", radio.tx ? "bg-amber-400 text-black" : "bg-[#4b3a12] text-amber-200/80")}>
            TALK
            <span className="block text-[8px] font-medium">CAPCOM</span>
          </PttButton>
        </div>
      </div>
    </div>
  );
}
