import { getLatestLocal } from "../src/lib/store";
import { fetchText, quoteCoverage } from "../src/lib/util";

const g = getLatestLocal("google-calendar")!.guide;
const docs = g.provenance.evidence.filter((e) => e.kind === "doc");
const urls = [...new Set(docs.map((e) => e.url))];
for (const u of urls) {
  const evs = docs.filter((e) => e.url === u);
  // three consecutive fetches: is the page stable?
  const texts = [] as string[];
  for (let i = 0; i < 3; i++) texts.push((await fetchText(u, 15000)).text);
  console.log(`\n${u}\n  quotes ${evs.length}; fetch lengths: ${texts.map((t) => t.length).join(", ")}`);
  for (let i = 0; i < 3; i++) {
    const covs = evs.map((e) => quoteCoverage(e.quote, texts[i]));
    console.log(`  fetch ${i + 1}: now-coverage >=0.85 on ${covs.filter((c) => c >= 0.85).length}/${evs.length}; stored coverage >=0.85 on ${evs.filter((e) => (e.coverage ?? 0) >= 0.85).length}`);
  }
}
