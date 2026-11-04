import { verifyEvidence } from "../src/pipeline/verify";
import type { Claim, Evidence } from "../src/lib/schema";
const ev: Evidence[] = [
  { id: "e1", url: "https://developers.notion.com/docs/authorization", quote: "Marketplace submission or review is not required", fetched_at: "", kind: "doc", quote_found: null, coverage: null, fetch_status: "not_checked" },
  { id: "e2", url: "https://developers.notion.com/docs/authorization", quote: "Notion will personally call every developer to approve each app before launch", fetched_at: "", kind: "doc", quote_found: null, coverage: null, fetch_status: "not_checked" },
];
const mk = (id: string, e: string): Claim => ({ id, text: id, evidence_ids: [e], status: "primary", confidence: 0.9, topic: "review", last_seen_date: null, stale: false });
const claims = [mk("c_real", "e1"), mk("c_fake", "e2")];
const corr = await verifyEvidence(claims, ev, (c) => console.log("VERIFY", c));
console.log(ev.map((e) => [e.id, e.fetch_status, e.quote_found]));
console.log(claims.map((c) => [c.id, c.status, c.confidence]), corr.length);
