import type { Claim } from "./schema";

export const STATUS_STYLE: Record<Claim["status"], { dot: string; label: string; text: string }> = {
  tested: { dot: "bg-emerald-600", label: "Tested", text: "we observed this directly" },
  primary: { dot: "bg-sky-600", label: "Primary", text: "quote verified in the provider's own docs" },
  secondary: { dot: "bg-amber-500", label: "Secondary", text: "third-party source, dated" },
  inferred: { dot: "bg-stone-400", label: "Inferred", text: "model reasoning, no supporting quote" },
  unverified: { dot: "bg-red-500", label: "Unverified", text: "no support, or sources conflict" },
};
