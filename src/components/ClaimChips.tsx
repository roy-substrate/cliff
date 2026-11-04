"use client";

import { useEffect, useRef, useState } from "react";
import type { Claim, Evidence } from "@/lib/schema";
import { STATUS_STYLE } from "@/lib/status";

export interface ClaimBundle {
  claim: Claim;
  evidence: Evidence[];
}

/**
 * One evidence dot. Click to see the quote, URL and fetch date.
 * Built from spans and a button only, so it is valid inside paragraphs, list items and labels.
 */
function Chip({ claim, evidence }: ClaimBundle) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const st = STATUS_STYLE[claim.status];

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <span ref={ref} className="relative inline-block align-middle">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`${st.label}: ${claim.text}`}
        className="flex h-5 w-5 items-center justify-center rounded-full transition hover:scale-125"
      >
        <span className={`inline-block h-3 w-3 rounded-full border-2 border-white ${st.dot} shadow-sm ${claim.stale ? "ring-2 ring-[#f2b80f]" : ""}`} />
      </button>
      {open && (
        <span className="animate-pop absolute left-0 top-6 z-30 block w-[22rem] max-w-[80vw] rounded-[22px] bg-white p-4 text-left text-[13px] font-normal leading-snug text-ink shadow-float ring-1 ring-ink/5">
          <span className="mb-2 flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${st.dot}`} />
            <span className="font-display text-base font-bold">{st.label}</span>
            <span className="text-muted">{st.text}</span>
          </span>
          <span className="mb-2 block font-medium">{claim.text}</span>
          {claim.stale && <span className="mb-2 block rounded-lg bg-butter-soft px-2 py-1 text-[#8a6500]">The source looks old or marks this as deprecated.</span>}
          {evidence.length === 0 && <span className="block text-muted">No quote was captured for this claim.</span>}
          {evidence.map((e) => (
            <span key={e.id} className="mb-2 block rounded-2xl bg-cream p-3 last:mb-0">
              <span className="block italic text-ink/75">&ldquo;{e.quote.slice(0, 280)}&rdquo;</span>
              <a href={e.url} target="_blank" rel="noreferrer" className="mt-1 block break-all font-semibold text-sky-deep underline">
                {e.url}
              </a>
              <span className="mt-1 block text-[11px] text-muted">
                fetched {e.fetched_at.slice(0, 10)}
                {e.quote_found === true && " · quote re-found on the page ✓"}
                {e.quote_found === false && (e.coverage ?? 0) >= 0.5 && ` · same fact, different wording (${Math.round((e.coverage ?? 0) * 100)}% match)`}
                {e.quote_found === false && (e.coverage ?? 0) < 0.5 && " · quote NOT found when we re-checked"}
                {e.fetch_status === "unreachable" && " · page couldn't be re-checked"}
              </span>
            </span>
          ))}
        </span>
      )}
    </span>
  );
}

/** Inline dots for the claims behind a statement. */
export function ClaimChips({ bundles }: { bundles: ClaimBundle[] }) {
  if (!bundles.length) return <span className="ml-1 text-[11px] text-muted">(no cited claim)</span>;
  return (
    <span className="ml-1 inline-flex gap-0.5 align-middle">
      {bundles.map((b) => (
        <Chip key={b.claim.id} {...b} />
      ))}
    </span>
  );
}
