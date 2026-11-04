/** Hand-drawn annotations and floating objects. One outline style everywhere so nothing looks like a stock icon set. */

const INK = "#1d1c21";

export function HandArrow({ variant = "right", className = "", width = 90 }: { variant?: "right" | "down" | "left" | "down-left"; className?: string; width?: number }) {
  const paths: Record<string, { d: string; head: string; vb: string }> = {
    right: { d: "M6 34 C 26 6, 62 4, 84 22", head: "M72 14 L 85 23 L 70 28", vb: "0 0 92 44" },
    left: { d: "M86 34 C 66 6, 30 4, 8 22", head: "M20 14 L 7 23 L 22 28", vb: "0 0 92 44" },
    down: { d: "M14 6 C 40 10, 50 30, 38 52", head: "M30 42 L 37 54 L 47 45", vb: "0 0 60 60" },
    "down-left": { d: "M54 6 C 30 8, 14 26, 18 50", head: "M10 40 L 18 52 L 28 42", vb: "0 0 60 60" },
  };
  const p = paths[variant];
  return (
    <svg viewBox={p.vb} width={width} className={className} aria-hidden fill="none" stroke={INK} strokeOpacity="0.7" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d={p.d} />
      <path d={p.head} />
    </svg>
  );
}

export function Annotation({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`font-hand text-[26px] leading-tight text-ink/70 ${className}`}>{children}</span>;
}

/** A progress ring, like the reference's fasting timer, used for "approval wait". */
export function TimerRing({ label, sub, pct = 0.7, size = 92, className = "" }: { label: string; sub?: string; pct?: number; size?: number; className?: string }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  return (
    <span className={`relative inline-flex items-center justify-center rounded-full bg-white shadow-float ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="absolute inset-0" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e8f6ee" strokeWidth="9" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="#2fbf71" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 50 50)" />
      </svg>
      <span className="relative text-center leading-none">
        <span className="font-display block text-xl font-extrabold text-ink/80">{label}</span>
        {sub && <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted">{sub}</span>}
      </span>
    </span>
  );
}

export function KeyCoin({ size = 70, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-full shadow-float ${className}`} style={{ width: size, height: size, background: "linear-gradient(160deg,#ffe48a,#ffc94a)" }}>
      <svg viewBox="0 0 40 40" width={size * 0.55} aria-hidden fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="13" cy="20" r="7" fill="#fff6d6" />
        <path d="M20 20 H 34 M29 20 v 6 M34 20 v 4" />
      </svg>
    </span>
  );
}

export function ShieldBubble({ size = 64, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-full shadow-float ${className}`} style={{ width: size, height: size, background: "linear-gradient(160deg,#7fdcab,#2fbf71)" }}>
      <svg viewBox="0 0 40 40" width={size * 0.55} aria-hidden fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 5 L 33 10 V 19 C 33 27, 27 32, 20 35 C 13 32, 7 27, 7 19 V 10 Z" />
        <path d="M14 20 l 4 4 l 8 -9" />
      </svg>
    </span>
  );
}

export function Sparkle({ size = 22, color = "#ffd25a", className = "" }: { size?: number; color?: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} className={className} aria-hidden>
      <path d="M12 1 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z" fill={color} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

/** Organic blob used behind section headings. */
export function Blob({ color = "#ffe48a", className = "" }: { color?: string; className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden>
      <path d="M44 -6 C 88 -24, 160 -6, 186 40 C 212 86, 196 150, 152 178 C 108 206, 40 196, 12 152 C -16 108, 0 12, 44 -6 Z" fill={color} />
    </svg>
  );
}

/** A floating code chip, like the "310 kcal" tag in the reference. */
export function Chip({ children, className = "", tone = "white" }: { children: React.ReactNode; className?: string; tone?: "white" | "mint" | "butter" | "coral" }) {
  const bg = { white: "bg-white", mint: "bg-mint-soft", butter: "bg-butter-soft", coral: "bg-coral-soft" }[tone];
  return <span className={`inline-flex items-center gap-1.5 rounded-full ${bg} px-3.5 py-1.5 font-display text-[15px] font-bold text-ink/80 shadow-float ${className}`}>{children}</span>;
}
