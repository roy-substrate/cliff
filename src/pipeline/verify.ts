import type { Claim, Evidence, ClaimStatus } from "@/lib/schema";
import { fetchText, quoteCoverage, rootDomain } from "@/lib/util";

export interface Correction {
  claim_id: string;
  from: ClaimStatus;
  to: ClaimStatus;
  reason: string;
}

const STALE_MONTHS = 24;
const DEPRECATED = /\b(deprecated|legacy|sunset|no longer (supported|available)|end of life|discontinued)\b/i;

/** coverage >= EXACT: quote is on the page. >= NEAR: same fact, different wording. Below NEAR: not on the page. */
export const EXACT = 0.85;
export const NEAR = 0.5;

/** Pull dates like "Last updated: March 3, 2024" or "2023-11-02" from page text. */
export function extractPageDate(text: string): Date | null {
  const m = text.match(/(?:last\s+(?:updated|modified|reviewed)|updated|published)[:\s]+([A-Z][a-z]+ \d{1,2},? \d{4}|\d{4}-\d{2}-\d{2})/i) ?? null;
  if (!m) return null;
  const d = new Date(m[1]);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Re-fetch every cited page (plus any extra pages the run read) and check each quote.
 *  - exact match: quote verified.
 *  - near match: same fact, different wording (pages get edited, tools return a different copy): keep status, lower confidence.
 *  - quote missing on the cited page but found on another page we read: the model credited the wrong page; fix the citation.
 *  - quote found nowhere: downgrade to inferred.
 * Pages we cannot read (bot walls, JS shells) are never counted as misses.
 * Mutates evidence/claims in place and returns the corrections.
 */
export async function verifyEvidence(
  claims: Claim[],
  evidence: Evidence[],
  onVerify?: (c: Correction) => void,
  extraUrls: string[] = [],
): Promise<Correction[]> {
  const corrections: Correction[] = [];
  const docEvidence = evidence.filter((e) => e.kind === "doc");
  const urls = [...new Set([...docEvidence.map((e) => e.url), ...extraUrls])].slice(0, 14);
  const pages = new Map<string, { status: "ok" | "unreachable"; text: string }>();

  await Promise.all(
    urls.map(async (u) => {
      const r = await fetchText(u, 9000);
      // JS-only shells and bot walls come back "ok" but near-empty: unreachable, never a quote miss.
      const usable = r.ok && r.text.length > 800;
      pages.set(u, { status: usable ? "ok" : "unreachable", text: usable ? r.text : "" });
    }),
  );

  const note = (claim: Claim, to: ClaimStatus, reason: string) => {
    const corr = { claim_id: claim.id, from: claim.status, to, reason };
    corrections.push(corr);
    onVerify?.(corr);
    claim.status = to;
  };
  const claimOf = (e: Evidence) => claims.find((c) => c.evidence_ids.includes(e.id));

  for (const e of docEvidence) {
    const own = pages.get(e.url);
    e.fetch_status = own?.status ?? "unreachable";
    if (own?.status !== "ok") {
      e.quote_found = null;
      e.coverage = null;
      continue;
    }
    let cov = quoteCoverage(e.quote, own.text);
    if (cov < EXACT) {
      // maybe the right quote, wrong page
      let best = { url: e.url, cov };
      for (const [u, p] of pages) {
        if (u === e.url || p.status !== "ok") continue;
        const c2 = quoteCoverage(e.quote, p.text);
        if (c2 > best.cov) best = { url: u, cov: c2 };
      }
      if (best.url !== e.url && best.cov >= EXACT) {
        const claim = claimOf(e);
        if (claim) {
          // a quote that only exists on another site's page is third-party support, whatever the extractor claimed
          const crossSite = rootDomain(best.url) !== rootDomain(e.url);
          const to: ClaimStatus = crossSite && claim.status === "primary" ? "secondary" : claim.status;
          const corr = {
            claim_id: claim.id,
            from: claim.status,
            to,
            reason: `quote is not on the cited page; found on ${best.url}, citation corrected${to !== claim.status ? " (third-party page, so no longer primary)" : ""}`,
          };
          corrections.push(corr);
          onVerify?.(corr);
          claim.status = to;
        }
        e.url = best.url;
        cov = best.cov;
      }
    }
    e.coverage = Math.round(cov * 100) / 100;
    e.quote_found = cov >= EXACT;
  }

  const byId = new Map(evidence.map((e) => [e.id, e]));
  const now = Date.now();
  for (const c of claims) {
    const evs = c.evidence_ids.map((id) => byId.get(id)).filter(Boolean) as Evidence[];

    if (c.status === "primary" || c.status === "secondary") {
      if (evs.length === 0) {
        note(c, "unverified", "claim cites no evidence");
      } else {
        const checked = evs.filter((e) => e.coverage != null);
        const best = Math.max(0, ...checked.map((e) => e.coverage as number));
        if (checked.length > 0 && best < NEAR) {
          note(c, "inferred", `quoted text not found on any page we could re-read (best match ${Math.round(best * 100)}%)`);
          c.confidence = Math.min(c.confidence, 0.4);
        } else if (checked.length > 0 && best < EXACT) {
          c.confidence = Math.min(c.confidence, 0.7); // same fact, different wording
        }
      }
    }

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
