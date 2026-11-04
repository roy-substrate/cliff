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
    <span ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`${st.label}: ${claim.text}`}
        className="flex h-4 w-4 items-center justify-center"
      >
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${st.dot} ${claim.stale ? "ring-2 ring-amber-300" : ""}`} />
      </button>
      {open && (
        <span className="absolute left-0 top-5 z-20 block w-80 rounded-md border border-line bg-panel p-3 text-left text-xs font-normal leading-snug shadow-lg">
          <span className="mb-1 block font-medium">
            {st.label}
            <span className="ml-1 font-normal text-muted">{st.text}</span>
          </span>
          <span className="mb-2 block text-fg">{claim.text}</span>
          {claim.stale && <span className="mb-2 block text-amber-700">Source looks old or marks this as deprecated.</span>}
          {evidence.length === 0 && <span className="block text-muted">No quote was captured for this claim.</span>}
          {evidence.map((e) => (
            <span key={e.id} className="mb-2 block border-l-2 border-line pl-2">
              <span className="block text-muted">&ldquo;{e.quote.slice(0, 280)}&rdquo;</span>
              <a href={e.url} target="_blank" rel="noreferrer" className="break-all text-accent underline">
                {e.url}
              </a>
              <span className="block text-[11px] text-muted">
                fetched {e.fetched_at.slice(0, 10)}
                {e.quote_found === true && " · quote re-found on page"}
                {e.quote_found === false && (e.coverage ?? 0) >= 0.5 && ` · same fact, different wording (${Math.round((e.coverage ?? 0) * 100)}% match)`}
                {e.quote_found === false && (e.coverage ?? 0) < 0.5 && " · quote NOT found on re-fetch"}
                {e.fetch_status === "unreachable" && " · page not re-checkable"}
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
