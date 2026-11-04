import type { Claim, Evidence, Guide } from "@/lib/schema";
import { newVersionId, saveVersion, type StoredVersion } from "@/lib/store";
import { verifyEvidence } from "./verify";

const QUOTE_MISS = /^quoted text not found|^quote is not on the cited page/;

/**
 * Re-check every cited page against the guide's quotes and publish the result as a NEW version.
 * No model calls: it only re-fetches pages. Claims that were demoted purely because a quote was not found are
 * restored first, so a page that was unreadable or served a different version last time gets a fair second look.
 * Claims demoted for conflicting with another source stay demoted. The guide's prose is not rewritten.
 */
export async function reverify(prev: StoredVersion, createdBy: StoredVersion["created_by"] = "reverify"): Promise<{ version: StoredVersion; changed: number }> {
  const guide: Guide = structuredClone(prev.guide);
  const claims: Claim[] = guide.provenance.claims;
  const evidence: Evidence[] = guide.provenance.evidence;

  // restore claims whose only demotion was a missed quote (earliest `from` is the original status)
  const keep = guide.provenance.corrections.filter((c) => !QUOTE_MISS.test(c.reason));
  const restored = new Set<string>();
  for (const c of guide.provenance.corrections) {
    if (!QUOTE_MISS.test(c.reason) || restored.has(c.claim_id)) continue;
    const claim = claims.find((x) => x.id === c.claim_id);
    const stillDemotedElsewhere = keep.some((k) => k.claim_id === c.claim_id && k.to === "unverified");
    if (claim && !stillDemotedElsewhere && c.from !== c.to) {
      claim.status = c.from;
      claim.confidence = Math.max(claim.confidence, c.from === "primary" ? 0.85 : 0.6);
      restored.add(c.claim_id);
    }
  }
  for (const e of evidence) if (e.kind === "doc") e.quote_found = null, (e.coverage = null);

  const before = new Map(prev.guide.provenance.claims.map((c) => [c.id, c.status]));
  const fresh = await verifyEvidence(claims, evidence, undefined, guide.provenance.sources_searched);
  const changed = claims.filter((c) => before.get(c.id) !== c.status).length;

  guide.provenance.corrections = [...keep, ...fresh];
  guide.provenance.uncertain = claims
    .filter((c) => c.status === "unverified" || c.status === "inferred")
    .map((c) => c.text)
    .slice(0, 12);

  const versionId = newVersionId(prev.slug);
  const version: StoredVersion = { versionId, slug: prev.slug, created_at: new Date().toISOString(), created_by: createdBy, cost_usd: prev.cost_usd, guide };
  await saveVersion(version);
  return { version, changed };
}
