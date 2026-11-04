/** For a guide, group failed quotes by cited URL and show how each page reads when re-fetched. */
import { getLatestLocal } from "../src/lib/store";
import { fetchText, normalizeText } from "../src/lib/util";

const slug = process.argv[2] ?? "google-calendar";
const g = getLatestLocal(slug)!.guide;
const bad = g.provenance.evidence.filter((e) => e.kind === "doc" && e.quote_found === false && (e.coverage ?? 0) < 0.5);
const byUrl = new Map<string, typeof bad>();
for (const e of bad) byUrl.set(e.url, [...(byUrl.get(e.url) ?? []), e]);
console.log(`${slug}: ${bad.length} failed quotes across ${byUrl.size} pages`);
for (const [url, evs] of byUrl) {
  const r = await fetchText(url, 15000);
  const p = normalizeText(r.text);
  console.log(`\n${url}\n  failed ${evs.length}; re-fetch status ${r.status}, ${p.length} chars`);
  for (const e of evs.slice(0, 3)) {
    const words = normalizeText(e.quote).split(" ");
    const probe = words.slice(0, 4).join(" ");
    const i = p.indexOf(probe);
    console.log(`  quote: ${JSON.stringify(e.quote.slice(0, 120))} cov=${e.coverage}`);
    console.log(`    first 4 words ${i < 0 ? "NOT on page" : "found: ..." + p.slice(i, i + 150)}`);
  }
}
