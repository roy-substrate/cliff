/**
 * Pip: Cliff's mascot. A little plug creature. The prongs are its ears, the cable curls like a tail,
 * and it wears a lightning-bolt badge. Original character, sticker style (thick ink outline), CSS-only motion.
 */
export type PipMood = "happy" | "search" | "think" | "celebrate" | "oops" | "sleepy";

const INK = "#1d1c21";

export function Pip({ mood = "happy", size = 120, className = "", title }: { mood?: PipMood; size?: number; className?: string; title?: string }) {
  const lookX = mood === "search" ? 3 : 0;
  const lookY = mood === "think" ? -3 : 0;
  return (
    <svg viewBox="0 0 140 150" width={size} height={(size * 150) / 140} className={className} role="img" aria-label={title ?? `Pip the plug, ${mood}`}>
      {/* ground shadow */}
      <ellipse cx="66" cy="141" rx="36" ry="5" fill={INK} opacity="0.12" />

      {/* cable tail */}
      <path d="M96 118 C 120 120, 128 100, 116 88 C 106 78, 96 90, 104 96" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <path d="M96 118 C 120 120, 128 100, 116 88 C 106 78, 96 90, 104 96" fill="none" stroke="#ffd25a" strokeWidth="2.5" strokeLinecap="round" className={mood === "search" || mood === "think" ? "cable-flow" : ""} />

      {/* prong ears */}
      <rect x="40" y="10" width="13" height="28" rx="5" fill="#dfe3ec" stroke={INK} strokeWidth="4" />
      <rect x="79" y="10" width="13" height="28" rx="5" fill="#dfe3ec" stroke={INK} strokeWidth="4" />
      <rect x="43" y="14" width="3.5" height="12" rx="1.7" fill="#fff" />
      <rect x="82" y="14" width="3.5" height="12" rx="1.7" fill="#fff" />

      {/* arms (behind body) */}
      {mood === "celebrate" ? (
        <>
          <path d="M28 82 C 14 72, 12 58, 18 50" fill="none" stroke={INK} strokeWidth="9" strokeLinecap="round" />
          <path d="M28 82 C 14 72, 12 58, 18 50" fill="none" stroke="#8fd0f5" strokeWidth="4" strokeLinecap="round" />
          <path d="M104 82 C 118 72, 120 58, 114 50" fill="none" stroke={INK} strokeWidth="9" strokeLinecap="round" />
          <path d="M104 82 C 118 72, 120 58, 114 50" fill="none" stroke="#8fd0f5" strokeWidth="4" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M28 88 C 18 94, 16 104, 22 110" fill="none" stroke={INK} strokeWidth="9" strokeLinecap="round" />
          <path d="M28 88 C 18 94, 16 104, 22 110" fill="none" stroke="#8fd0f5" strokeWidth="4" strokeLinecap="round" />
        </>
      )}

      {/* body */}
      <path d="M26 64 C 26 40, 42 32, 66 32 C 90 32, 106 40, 106 64 L 106 104 C 106 124, 92 132, 66 132 C 40 132, 26 124, 26 104 Z" fill="#8fd0f5" stroke={INK} strokeWidth="4.5" />
      {/* belly highlight */}
      <path d="M38 102 C 40 118, 52 124, 66 124 C 80 124, 92 118, 94 102" fill="none" stroke="#c9ebfd" strokeWidth="6" strokeLinecap="round" />

      {/* cheeks */}
      <ellipse cx="38" cy="82" rx="7" ry="4.5" fill="#ff8f75" opacity="0.7" />
      <ellipse cx="94" cy="82" rx="7" ry="4.5" fill="#ff8f75" opacity="0.7" />

      {/* eyes */}
      {mood === "sleepy" ? (
        <g stroke={INK} strokeWidth="4" strokeLinecap="round" fill="none">
          <path d="M42 66 q 8 6 16 0" />
          <path d="M74 66 q 8 6 16 0" />
        </g>
      ) : mood === "oops" ? (
        <g stroke={INK} strokeWidth="4" strokeLinecap="round">
          <path d="M44 60 l 12 10 M56 60 l -12 10" />
          <path d="M76 60 l 12 10 M88 60 l -12 10" />
        </g>
      ) : (
        <g className="pip-eyes">
          <circle cx="50" cy="65" r="13" fill="#fff" stroke={INK} strokeWidth="4" />
          <circle cx="82" cy="65" r="13" fill="#fff" stroke={INK} strokeWidth="4" />
          <circle cx={50 + lookX} cy={66 + lookY} r="8" fill={INK} />
          <circle cx={82 + lookX} cy={66 + lookY} r="8" fill={INK} />
          <circle cx={53 + lookX} cy={63 + lookY} r="2.8" fill="#fff" />
          <circle cx={85 + lookX} cy={63 + lookY} r="2.8" fill="#fff" />
        </g>
      )}

      {/* mouth */}
      {mood === "celebrate" ? (
        <path d="M58 84 q 8 12 16 0 z" fill="#ff6f4f" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      ) : mood === "oops" ? (
        <path d="M56 88 q 5 -5 10 0 q 5 5 10 0" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      ) : mood === "think" ? (
        <path d="M60 87 h 12" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      ) : (
        <path d="M59 84 q 7 7 14 0" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      )}

      {/* bolt badge */}
      <circle cx="66" cy="108" r="10" fill="#fff" stroke={INK} strokeWidth="3.5" />
      <path d="M68 100 l -6 9 h 5 l -2 7 l 7 -10 h -5 z" fill="#ffd25a" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />

      {/* front arm and props */}
      {mood === "search" ? (
        <g className="animate-wiggle">
          <path d="M104 92 C 114 90, 118 82, 116 74" fill="none" stroke={INK} strokeWidth="9" strokeLinecap="round" />
          <path d="M104 92 C 114 90, 118 82, 116 74" fill="none" stroke="#8fd0f5" strokeWidth="4" strokeLinecap="round" />
          <line x1="118" y1="70" x2="124" y2="60" stroke={INK} strokeWidth="5" strokeLinecap="round" />
          <circle cx="128" cy="50" r="11" fill="#eaf6fe" fillOpacity="0.85" stroke={INK} strokeWidth="4" />
          <path d="M123 45 q 3 -3 7 -2" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </g>
      ) : mood !== "celebrate" ? (
        <>
          <path d="M104 88 C 114 94, 116 104, 110 110" fill="none" stroke={INK} strokeWidth="9" strokeLinecap="round" />
          <path d="M104 88 C 114 94, 116 104, 110 110" fill="none" stroke="#8fd0f5" strokeWidth="4" strokeLinecap="round" />
        </>
      ) : null}

      {mood === "oops" && <path d="M104 44 q 6 8 0 12 q -6 -4 0 -12 z" fill="#8fd0f5" stroke={INK} strokeWidth="2.5" />}
      {mood === "think" && (
        <g fill="#fff" stroke={INK} strokeWidth="2.5">
          <circle cx="112" cy="34" r="3" />
          <circle cx="120" cy="24" r="4.5" />
          <circle cx="131" cy="12" r="6" />
        </g>
      )}
      {mood === "sleepy" && (
        <text x="104" y="30" fontFamily="var(--font-baloo)" fontWeight="800" fontSize="18" fill={INK}>
          z
          <tspan dx="2" dy="-8" fontSize="13">z</tspan>
        </text>
      )}
      {mood === "celebrate" && (
        <g fill="#ffd25a" stroke={INK} strokeWidth="2">
          <path d="M14 30 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" />
          <path d="M122 28 l2.4 5.6 5.6 2.4 -5.6 2.4 -2.4 5.6 -2.4 -5.6 -5.6 -2.4 5.6 -2.4z" />
        </g>
      )}
    </svg>
  );
}

/** Pip inside a coral sticker circle, like the reference's character badge. */
export function PipBadge({ mood = "happy", size = 96, ring = "#ff8f75" }: { mood?: PipMood; size?: number; ring?: string }) {
  return (
    <span className="relative inline-flex items-center justify-center rounded-full border-[5px] border-white shadow-float" style={{ width: size, height: size, background: ring }}>
      <span className="translate-y-1">
        <Pip mood={mood} size={size * 0.82} />
      </span>
    </span>
  );
}
