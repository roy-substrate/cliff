import type { Claim, Evidence, ClaimStatus } from "@/lib/schema";
import { fetchText, quoteCoverage } from "@/lib/util";

export interface Correction {
  claim_id: string;
  from: ClaimStatus;
  to: ClaimStatus;
  reason: string;
}

const STALE_MONTHS = 24;
const DEPRECATED = /\b(deprecated|legacy|sunset|no longer (supported|available)|end of life|discontinued)\b/i;

/** Pull dates like "Last updated: March 3, 2024" or "2023-11-02" from page text. */
export function extractPageDate(text: string): Date | null {
  const m =
    text.match(/(?:last\s+(?:updated|modified|reviewed)|updated|published)[:\s]+([A-Z][a-z]+ \d{1,2},? \d{4}|\d{4}-\d{2}-\d{2})/i) ?? null;
  if (!m) return null;
  const d = new Date(m[1]);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Re-fetch every distinct evidence URL, check each quote really appears, and downgrade.
 * Mutates evidence/claims in place and returns the list of corrections.
 */
export async function verifyEvidence(
  claims: Claim[],
  evidence: Evidence[],
  onVerify?: (c: Correction) => void,
): Promise<Correction[]> {
  const corrections: Correction[] = [];
  const docEvidence = evidence.filter((e) => e.kind === "doc");
  const urls = [...new Set(docEvidence.map((e) => e.url))];
  const pages = new Map<string, { status: "ok" | "unreachable"; text: string }>();

  await Promise.all(
    urls.map(async (u) => {
      const r = await fetchText(u, 9000);
      // JS-only shells and bot walls come back "ok" but near-empty: treat as unreachable, never as a quote miss.
      const usable = r.ok && r.text.length > 800;
      pages.set(u, { status: usable ? "ok" : "unreachable", text: usable ? r.text : "" });
    }),
  );

  for (const e of docEvidence) {
    const p = pages.get(e.url)!;
    e.fetch_status = p.status;
    e.quote_found = p.status === "ok" ? quoteCoverage(e.quote, p.text) >= 0.85 : null;
  }

  const byId = new Map(evidence.map((e) => [e.id, e]));
  const now = Date.now();
  for (const c of claims) {
    const evs = c.evidence_ids.map((id) => byId.get(id)).filter(Boolean) as Evidence[];
    const setStatus = (to: ClaimStatus, reason: string) => {
      if (c.status === to) return;
      const corr = { claim_id: c.id, from: c.status, to, reason };
      corrections.push(corr);
      onVerify?.(corr);
      c.status = to;
    };

    if (c.status === "primary" || c.status === "secondary") {
      if (evs.length === 0) {
        setStatus("unverified", "claim cites no evidence");
      } else if (evs.some((e) => e.quote_found === false) && !evs.some((e) => e.quote_found === true)) {
        setStatus("inferred", "quoted text not found on the cited page when re-fetched");
        c.confidence = Math.min(c.confidence, 0.4);
      }
    }

    // staleness from the page itself
    for (const e of evs) {
      const p = pages.get(e.url);
      if (!p || p.status !== "ok") continue;
      const d = extractPageDate(p.text);
      const old = d && (now - d.getTime()) / (30 * 864e5) > STALE_MONTHS;
      if (old || DEPRECATED.test(e.quote)) {
        c.stale = true;
        c.confidence = c.confidence * 0.6;
        c.last_seen_date = d ? d.toISOString().slice(0, 10) : c.last_seen_date;
      }
    }
  }
  return corrections;
}
