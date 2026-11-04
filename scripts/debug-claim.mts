import { getLatest } from "../src/lib/store";
import { fetchText, normalizeText } from "../src/lib/util";

const g = getLatest("notion")!.guide;
for (const id of ["c3", "c29", "c19"]) {
  const c = g.provenance.claims.find((x) => x.id === id)!;
  const evs = c.evidence_ids.map((i) => g.provenance.evidence.find((e) => e.id === i)!);
  console.log(`\n${id} [${c.status}] ${c.text}`);
  for (const e of evs) {
    console.log(`  url: ${e.url}\n  quote: ${JSON.stringify(e.quote)}\n  coverage: ${e.coverage}`);
  }
}
// what do the real pages say near "authorization url" / "submit"?
for (const u of ["https://developers.notion.com/guides/get-started/authorization", "https://developers.notion.com/guides/get-started/public-connections", "https://developers.notion.com/guides/connections-and-tokens/public-integrations/overview"]) {
  const r = await fetchText(u, 12000);
  const p = normalizeText(r.text);
  console.log(`\nPAGE ${u}: status ${r.status}, ${p.length} chars`);
  for (const k of ["authorization url", "submit", "for review", "security review"]) {
    let from = 0;
    const hits: number[] = [];
    for (let n = 0; n < 4; n++) {
      const i = p.indexOf(k, from);
      if (i < 0) break;
      hits.push(i);
      from = i + k.length;
    }
    console.log(`  "${k}": ${hits.length} hit(s)`);
    for (const i of hits.slice(0, 2)) console.log("     ..." + p.slice(Math.max(0, i - 90), i + 130));
  }
}
