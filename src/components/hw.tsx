import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "../utils/cn";

type KnobVariant = "black" | "chrome" | "olive" | "rubber" | "lime" | "gray";

const KNOB_BG: Record<KnobVariant, string> = {
  black: "radial-gradient(circle at 35% 30%, #4a4a4a 0%, #1c1c1c 45%, #050505 100%)",
  chrome: "radial-gradient(circle at 35% 30%, #ffffff 0%, #c9ccd1 30%, #6b7078 75%, #3a3d42 100%)",
  olive: "radial-gradient(circle at 35% 30%, #5b5f55 0%, #2b2e28 55%, #121410 100%)",
  rubber: "radial-gradient(circle at 35% 30%, #3a3a3a 0%, #151515 60%, #000 100%)",
  lime: "radial-gradient(circle at 35% 30%, #f4ff7a 0%, #c6d600 45%, #6f7a00 100%)",
  gray: "radial-gradient(circle at 35% 30%, #9aa0a6 0%, #5f656b 50%, #2d3034 100%)",
};

/**
 * Detented rotary knob. Drag vertically / horizontally, use the mouse wheel,
 * click the left/right half, or focus + arrow keys.
 */
export function Knob({
  size = 64,
  variant = "black",
  onStep,
  angle,
  label,
  sublabel,
  grip = 18,
  pointer = "#fff",
  className,
  title,
  disabled,
}: {
  size?: number;
  variant?: KnobVariant;
  onStep: (d: number) => void;
  angle?: number;
  label?: ReactNode;
  sublabel?: ReactNode;
  grip?: number;
  pointer?: string;
  className?: string;
  title?: string;
  disabled?: boolean;
}) {
  const [rot, setRot] = useState(0);
  const drag = useRef<{ x: number; y: number; acc: number; moved: boolean } | null>(null);
  const a = angle ?? rot;

  const step = (d: number) => {
    if (disabled) return;
    setRot((r) => r + d * 18);
    onStep(d);
  };

  return (
    <div className={cn("flex flex-col items-center gap-1 select-none", className)}>
      <div
        role="slider"
        tabIndex={0}
        aria-label={typeof label === "string" ? label : title}
        title={title ?? "Drag, scroll, or click left/right"}
        className="relative cursor-grab touch-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-sky-400 active:cursor-grabbing"
        style={{ width: size, height: size }}
        onWheel={(e) => {
          e.preventDefault();
          step(e.deltaY < 0 ? 1 : -1);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp" || e.key === "ArrowRight") {
            e.preventDefault();
            step(1);
          }
          if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
            e.preventDefault();
            step(-1);
          }
        }}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY, acc: 0, moved: false };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const delta = e.clientX - d.x - (e.clientY - d.y);
          d.x = e.clientX;
          d.y = e.clientY;
          d.acc += delta;
          while (Math.abs(d.acc) >= 14) {
            d.moved = true;
            const s = d.acc > 0 ? 1 : -1;
            d.acc -= s * 14;
            step(s);
          }
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          drag.current = null;
          if (d && !d.moved) {
            const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
            step(e.clientX > r.left + r.width / 2 ? 1 : -1);
          }
        }}
      >
        {/* knurled skirt */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `repeating-conic-gradient(from 0deg, rgba(255,255,255,0.10) 0deg ${180 / grip}deg, rgba(0,0,0,0.35) ${180 / grip}deg ${360 / grip}deg), ${KNOB_BG[variant]}`,
            boxShadow: "0 6px 12px rgba(0,0,0,.6), inset 0 1px 2px rgba(255,255,255,.25), 0 0 0 2px rgba(0,0,0,.6)",
            transform: `rotate(${a}deg)`,
            transition: "transform 80ms ease-out",
          }}
        />
        {/* cap */}
        <div
          className="absolute rounded-full"
          style={{
            inset: size * 0.16,
            background: KNOB_BG[variant],
            boxShadow: "inset 0 2px 3px rgba(255,255,255,.18), inset 0 -3px 5px rgba(0,0,0,.5)",
            transform: `rotate(${a}deg)`,
            transition: "transform 80ms ease-out",
          }}
        >
          <div className="absolute left-1/2 top-[6%] h-[30%] w-[7%] -translate-x-1/2 rounded-full" style={{ background: pointer, boxShadow: `0 0 4px ${pointer}` }} />
        </div>
      </div>
      {label && <div className="text-[10px] font-bold tracking-widest text-white/70 uppercase">{label}</div>}
      {sublabel && <div className="text-[9px] tracking-wider text-white/40 uppercase">{sublabel}</div>}
    </div>
  );
}

export function Led({ on, color = "#22c55e", size = 10, blink, label }: { on: boolean; color?: string; size?: number; blink?: boolean; label?: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn("rounded-full", on && blink && "animate-[blink_0.6s_steps(2)_infinite]")}
        style={{
          width: size,
          height: size,
          background: on ? `radial-gradient(circle at 35% 35%, #fff 0%, ${color} 40%, ${color} 100%)` : "radial-gradient(circle at 35% 35%, #444, #111)",
          boxShadow: on ? `0 0 ${size}px ${color}, 0 0 ${size * 2}px ${color}66` : "inset 0 1px 2px #000",
        }}
      />
      {label && <span className="text-[8px] font-bold tracking-widest text-white/50">{label}</span>}
    </div>
  );
}

export function Screw({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      className={cn("absolute h-3 w-3 rounded-full", className)}
      style={{
        background: "radial-gradient(circle at 35% 35%, #d4d4d4, #6b6b6b 60%, #2a2a2a)",
        boxShadow: "inset 0 0 1px #000, 0 1px 1px rgba(255,255,255,.15)",
        ...style,
      }}
    >
      <div className="absolute top-1/2 left-[15%] h-[1.5px] w-[70%] -translate-y-1/2 rotate-[35deg] bg-black/70" />
    </div>
  );
}

// --- 7-segment display (SVG) ---
const SEG: Record<string, string> = {
  "0": "abcdef", "1": "bc", "2": "abged", "3": "abgcd", "4": "fgbc", "5": "afgcd", "6": "afgedc", "7": "abc", "8": "abcdefg", "9": "abcfgd",
  "-": "g", " ": "", A: "abcefg", C: "afed", E: "afged", F: "afge", H: "fbgec", L: "fed", P: "abfge", r: "eg", o: "cdeg", n: "ceg", t: "fged", d: "bcdeg", U: "bcdef",
};

function Digit({ ch, dot, color, off }: { ch: string; dot: boolean; color: string; off: string }) {
  const on = SEG[ch] ?? "";
  const s = (k: string) => (on.includes(k) ? color : off);
  return (
    <svg viewBox="0 0 60 100" className="h-full" style={{ filter: on ? `drop-shadow(0 0 3px ${color}88)` : undefined }}>
      <g transform="skewX(-6) translate(8 0)">
        <polygon points="10,4 46,4 40,12 16,12" fill={s("a")} />
        <polygon points="48,6 48,46 42,42 42,14" fill={s("b")} />
        <polygon points="48,54 48,94 42,86 42,58" fill={s("c")} />
        <polygon points="10,96 46,96 40,88 16,88" fill={s("d")} />
        <polygon points="8,54 8,94 14,86 14,58" fill={s("e")} />
        <polygon points="8,6 8,46 14,42 14,14" fill={s("f")} />
        <polygon points="10,50 16,45 40,45 46,50 40,55 16,55" fill={s("g")} />
      </g>
      <circle cx="56" cy="93" r="4.5" fill={dot ? color : off} />
    </svg>
  );
}

export function SevenSeg({ value, color = "#ff9a1f", off = "rgba(255,140,30,0.07)", height = 40, className }: { value: string; color?: string; off?: string; height?: number; className?: string }) {
  const cells: { ch: string; dot: boolean }[] = [];
  for (const c of value) {
    if (c === "." && cells.length) cells[cells.length - 1].dot = true;
    else cells.push({ ch: c, dot: false });
  }
  return (
    <div className={cn("flex", className)} style={{ height }}>
      {cells.map((c, i) => (
        <Digit key={i} ch={c.ch} dot={c.dot} color={color} off={off} />
      ))}
    </div>
  );
}

export function SignalBars({ level, bars = 5, color = "currentColor" }: { level: number; bars?: number; color?: string }) {
  return (
    <div className="flex items-end gap-[2px]">
      {Array.from({ length: bars }).map((_, i) => (
        <div key={i} style={{ width: 3, height: 4 + i * 2.5, background: level > i / bars ? color : "transparent", border: `1px solid ${color}`, opacity: level > i / bars ? 1 : 0.35 }} />
      ))}
    </div>
  );
}

export function PttButton({ radio, className, children, style }: { radio: { pttDown: () => void; pttUp: () => void; tx: boolean }; className?: string; children?: ReactNode; style?: CSSProperties }) {
  return (
    <button
      type="button"
      className={cn("select-none touch-none", className)}
      style={style}
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        radio.pttDown();
      }}
      onPointerUp={radio.pttUp}
      onPointerCancel={radio.pttUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}
