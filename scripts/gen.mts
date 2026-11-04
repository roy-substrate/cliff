import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { generateGuide } from "../src/pipeline/run";
import type { GenEvent } from "../src/lib/schema";

const input = process.argv.slice(2).filter((a) => !a.startsWith("--")).join(" ");
const force = process.argv.includes("--force");
if (!input) {
  console.error("usage: pnpm gen <app name or url> [--force]");
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is not set (put it in .env.local)");
  process.exit(1);
}
const t0 = Date.now();
const log = (e: GenEvent) => {
  const s = ((Date.now() - t0) / 1000).toFixed(1).padStart(5);
  switch (e.type) {
    case "stage":
      console.log(`${s}s [${e.stage}] ${e.status}${e.ms ? ` ${e.ms}ms` : ""}${e.note ? ` (${e.note})` : ""}`);
      break;
    case "search":
      console.log(`${s}s   search "${e.query}" -> ${e.hits.length} hits`);
      break;
    case "fetch":
      console.log(`${s}s   fetch ${e.ok ? "ok " : "ERR"} ${e.url}`);
      break;
    case "probe":
      console.log(`${s}s   probe ${e.outcome} ${e.url}`);
      break;
    case "claim":
      console.log(`${s}s   claim ${e.claim.id} [${e.claim.status}] ${e.claim.text.slice(0, 90)}`);
      break;
    case "verify":
      console.log(`${s}s   VERIFY ${e.claimId} ${e.from} -> ${e.to}: ${e.reason}`);
      break;
    case "error":
      console.log(`${s}s   ERROR [${e.stage}] ${e.message}`);
      break;
    case "done":
      console.log(`${s}s DONE ${e.versionId} cost $${e.cost_usd.toFixed(2)}`);
      break;
    default:
      break;
  }
};
const r = await generateGuide(input, log, { force, createdBy: "library" });
const c = r.guide.provenance.claims;
const count = (st: string) => c.filter((x) => x.status === st).length;
console.log(`\n${r.guide.app.name}: difficulty ${r.guide.difficulty.level} (${r.guide.difficulty.score}/10)`);
console.log(
  `claims ${c.length}: tested ${count("tested")} | primary ${count("primary")} | secondary ${count("secondary")} | inferred ${count("inferred")} | unverified ${count("unverified")}`,
);
console.log(`corrections ${r.guide.provenance.corrections.length}, belief-diff entries ${r.guide.provenance.belief_diff.length}`);
