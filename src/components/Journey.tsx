"use client";

import { useState } from "react";
import type { Guide } from "@/lib/schema";
import { STAGE_TONES } from "@/lib/present";
import { ClaimChips, type ClaimBundle } from "./ClaimChips";
import { Pip } from "./brand/Mascot";
import { Md } from "./Md";

type Step = Guide["steps"][number];
type Attempt = Guide["provenance"]["attempt_log"][number];

const ACTOR = {
  agent: { label: "Pip can do this", cls: "bg-mint-soft text-[#13804a]" },
  developer: { label: "You", cls: "bg-white text-ink ring-1 ring-ink/10" },
  provider_wait: { label: "Waiting on the provider", cls: "bg-coral-soft text-[#c2410c]" },
} as const;

/** The setup steps as an illustrated path: numbered stops, pastel accents, each one expands into the details. */
export function Journey({ steps, bundles, attempts }: { steps: Step[]; bundles: Record<string, ClaimBundle>; attempts: Attempt[] }) {
  const [open, setOpen] = useState<number | null>(steps[0]?.n ?? null);
  const [all, setAll] = useState(false);
  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button onClick={() => (setAll((a) => !a), setOpen(null))} className="btn-ghost !py-1.5 !text-sm">
          {all ? "Collapse all" : "Expand all"}
        </button>
      </div>
      <ol className="relative">
        {/* the path */}
        <span aria-hidden className="absolute bottom-6 left-[27px] top-6 w-0 border-l-[3px] border-dashed border-ink/15" />
        {steps.map((s, i) => {
          const tone = STAGE_TONES[i % STAGE_TONES.length];
          const isOpen = all || open === s.n;
          const actor = ACTOR[s.actor];
          const seen = s.attempt_log_ids.map((id) => attempts.find((a) => a.id === id)).filter(Boolean) as Attempt[];
          return (
            <li key={s.n} className="relative mb-3 pl-[72px] last:mb-0">
              <span className={`absolute left-0 top-2 flex h-[56px] w-[56px] items-center justify-center rounded-full ${tone.dot} font-display text-xl font-extrabold text-white shadow-soft ring-4 ring-cream`}>
                {String(s.n).padStart(2, "0")}
              </span>
              <div className={`rounded-[26px] ${isOpen ? tone.soft : "bg-white"} shadow-soft transition`}>
                <button
                  onClick={() => (setAll(false), setOpen(isOpen ? null : s.n))}
                  aria-expanded={isOpen}
                  className="flex w-full flex-wrap items-center gap-2 rounded-[26px] px-5 py-4 text-left"
                >
                  <span className="font-display mr-auto text-xl font-extrabold leading-snug">{s.title}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${actor.cls}`}>{actor.label}</span>
                  <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-muted">~{s.est_minutes} min</span>
                  <span className={`font-display text-xl transition ${isOpen ? "rotate-45" : ""}`}>+</span>
                </button>
                {isOpen && (
                  <div className="animate-pop border-t border-ink/5 px-5 pb-5 pt-3">
                    <Md text={s.detail_md} className="text-[15px] text-ink/85" />
                    <div className="mt-2 text-xs text-muted">
                      Sources for this step:
                      <ClaimChips bundles={s.claim_ids.map((id) => bundles[id]).filter(Boolean)} />
                    </div>
                    {seen.map((a) => (
                      <div key={a.id} className="mt-3 flex gap-3 rounded-2xl bg-white p-3 text-sm">
                        <Pip mood="search" size={40} />
                        <div>
                          <div className="font-semibold">What Pip saw ({a.mode === "playwright" ? "in the real console" : "probing the public endpoint"}, {a.outcome.replace("_", " ")})</div>
                          <div className="text-ink/75">{a.observed}</div>
                          {a.screenshot && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={a.screenshot} alt={a.action} className="mt-2 max-h-72 rounded-xl border border-line" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
