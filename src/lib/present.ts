import type { Guide } from "./schema";
import type { PipMood } from "@/components/brand/Mascot";

type Level = Guide["difficulty"]["level"];

/** One palette entry per difficulty tier, used for cards, headers and badges so the whole product reads the same way. */
export const LEVEL_META: Record<Level, { label: string; blurb: string; bg: string; chip: string; header: string; mood: PipMood; ring: string }> = {
  instant: { label: "Instant", blurb: "Self-serve, no review", bg: "bg-mint-soft", chip: "bg-green text-white", header: "from-[#d9f6e4] via-[#eefbf3]", mood: "celebrate", ring: "#7fdcab" },
  hours: { label: "Hours", blurb: "A short checklist", bg: "bg-sky-soft", chip: "bg-sky-deep text-white", header: "from-[#cdeafb] via-[#eaf6fe]", mood: "happy", ring: "#8fd0f5" },
  days: { label: "Days", blurb: "Expect a review", bg: "bg-butter-soft", chip: "bg-butter text-ink", header: "from-[#ffeeb0] via-[#fff7dc]", mood: "think", ring: "#ffd25a" },
  weeks: { label: "Weeks", blurb: "Plan around review", bg: "bg-peach-soft", chip: "bg-coral text-white", header: "from-[#ffd9c9] via-[#ffefe7]", mood: "think", ring: "#ff9f86" },
  weeks_plus_cost: { label: "Weeks + cost", blurb: "Review plus paid checks", bg: "bg-coral-soft", chip: "bg-ink text-white", header: "from-[#ffcbbd] via-[#ffe6de]", mood: "oops", ring: "#ff8f75" },
  unknown: { label: "Unknown", blurb: "Not enough verified facts", bg: "bg-lilac-soft", chip: "bg-muted text-white", header: "from-[#e6e0fb] via-[#f3f0fe]", mood: "think", ring: "#c9bdf5" },
};

/** Apps with no third-party OAuth (API keys, personal tokens) are easy, not "unknown". */
export const NO_OAUTH_META: (typeof LEVEL_META)[Level] = { label: "No OAuth app", blurb: "Uses an API key or token instead", bg: "bg-mint-soft", chip: "bg-green text-white", header: "from-[#d9f6e4] via-[#eefbf3]", mood: "celebrate", ring: "#7fdcab" };
export const metaFor = (g: Pick<Guide, "has_oauth" | "difficulty" | "status">) => (g.status !== "fallback" && !g.has_oauth ? NO_OAUTH_META : LEVEL_META[g.difficulty.level]);

export function fmtMinutes(m: number): string {
  if (!m) return "Unknown";
  if (m < 60) return `${m} min`;
  const h = Math.round((m / 60) * 10) / 10;
  return `${h} h`;
}

export function approvalText(t: Guide["time"]): string {
  if (!t.approval_required) return "No review needed";
  const lo = t.approval_wait_days_min;
  const hi = t.approval_wait_days_max;
  if (lo == null && hi == null) return "Review, length not documented";
  const f = (d: number) => (d >= 14 ? `${Math.round(d / 7)} wk` : `${d} d`);
  if (lo != null && hi != null) return lo === hi ? `Review, ~${f(hi)}` : `Review, ${f(lo)} to ${f(hi)}`;
  return `Review, up to ${f((hi ?? lo) as number)}`;
}

/** Pastel accents that rotate through the setup journey. */
export const STAGE_TONES = [
  { dot: "bg-sky-deep", soft: "bg-sky-soft", ring: "ring-sky-deep/30" },
  { dot: "bg-green", soft: "bg-mint-soft", ring: "ring-green/30" },
  { dot: "bg-[#f2b80f]", soft: "bg-butter-soft", ring: "ring-[#f2b80f]/30" },
  { dot: "bg-coral", soft: "bg-peach-soft", ring: "ring-coral/30" },
  { dot: "bg-[#8a72e8]", soft: "bg-lilac-soft", ring: "ring-[#8a72e8]/30" },
] as const;

export function hostFromUrl(u: string | null | undefined): string {
  if (!u) return "";
  try {
    return new URL(u.startsWith("http") ? u : `https://${u}`).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
