import type { Claim } from "./schema";

export const STATUS_STYLE: Record<Claim["status"], { dot: string; label: string; text: string }> = {
  tested: { dot: "bg-green", label: "Tested", text: "we observed this directly" },
  primary: { dot: "bg-sky-deep", label: "From the docs", text: "quote re-checked in the provider's own docs" },
  secondary: { dot: "bg-[#f2b80f]", label: "Third-party", text: "third-party source, dated" },
  inferred: { dot: "bg-[#b8b3c4]", label: "Inferred", text: "model reasoning, no supporting quote" },
  unverified: { dot: "bg-coral", label: "Unverified", text: "no support, or sources conflict" },
};
