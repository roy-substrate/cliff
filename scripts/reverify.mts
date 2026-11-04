/** Re-check cited pages for guides in data/guides (no model calls, no cost). Usage: pnpm reverify [slug ...] */
import fs from "node:fs";
import path from "node:path";
import { getLatestLocal } from "../src/lib/store";
import { reverify } from "../src/pipeline/reverify";

const root = path.join(process.cwd(), "data", "guides");
const slugs = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(root).filter((d) => !d.startsWith("."));
for (const slug of slugs) {
  const prev = getLatestLocal(slug);
  if (!prev) continue;
  const count = (g: typeof prev.guide) => g.provenance.claims.reduce<Record<string, number>>((a, c) => ((a[c.status] = (a[c.status] ?? 0) + 1), a), {});
  const { version, changed } = await reverify(prev, "library");
  const miss = (g: typeof prev.guide) => g.provenance.evidence.filter((e) => e.kind === "doc" && e.quote_found === false && (e.coverage ?? 0) < 0.5).length;
  console.log(`${slug.padEnd(20)} claims changed ${String(changed).padStart(2)} | quote misses ${miss(prev.guide)} -> ${miss(version.guide)} | ${JSON.stringify(count(prev.guide))} -> ${JSON.stringify(count(version.guide))}`);
}
