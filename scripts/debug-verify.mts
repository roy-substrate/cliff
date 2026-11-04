import { getLatest } from "../src/lib/store";
import { fetchText, quoteCoverage, normalizeText } from "../src/lib/util";

const v = getLatest("notion")!;
const g = v.guide;
const failed = g.provenance.corrections.slice(0, 4);
const pages = new Map<string, string>();
for (const c of failed) {
  const claim = g.provenance.claims.find((x) => x.id === c.claim_id)!;
  const ev = g.provenance.evidence.find((e) => e.id === claim.evidence_ids[0])!;
  if (!pages.has(ev.url)) {
    const r = await fetchText(ev.url, 12000);
    pages.set(ev.url, r.text);
    console.log(`\nPAGE ${ev.url}: status ${r.status}, ${r.text.length} chars, type ${r.contentType}`);
  }
  const page = pages.get(ev.url)!;
  console.log(`\n${c.claim_id} quote: ${JSON.stringify(ev.quote.slice(0, 160))}`);
  console.log(`  coverage ${quoteCoverage(ev.quote, page).toFixed(2)}`);
  const words = normalizeText(ev.quote).split(" ").slice(0, 4).join(" ");
  const idx = normalizeText(page).indexOf(words);
  console.log(`  first 4 words "${words}" found at ${idx}${idx > -1 ? `: ...${normalizeText(page).slice(idx, idx + 140)}` : ""}`);
}
