import { getLatestLocal as getLatest } from "../src/lib/store";

const slug = process.argv[2] ?? "notion";
const v = getLatest(slug);
if (!v) throw new Error("no guide " + slug);
const g = v.guide;
const claim = (id: string) => g.provenance.claims.find((c) => c.id === id);
console.log(`# ${g.app.name} | ${v.versionId} | status ${g.status} | difficulty ${g.difficulty.level} ${g.difficulty.score}/10 | cost $${v.cost_usd.toFixed(2)}`);
console.log("SUMMARY:", g.summary);
console.log("DRIVERS:", g.difficulty.drivers.join(" | "));
console.log("BUILD/BORROW:", g.build_or_borrow.verdict, "| managed:", g.build_or_borrow.composio_managed);
console.log("TIME:", JSON.stringify({ ...g.time, claim_ids: undefined }));
console.log("\nSCOPE TIERS:");
for (const t of g.cliff.scope_tiers) console.log(` - ${t.scope} [${t.tier}] ${t.action_label} | gate: ${t.gate} | cheaper: ${t.cheaper_alternative}`);
console.log("\nPATHS:");
for (const p of g.cliff.paths) {
  console.log(` * ${p.distribution}: ${p.verdict} (${p.total_days_min}-${p.total_days_max}d)`);
  for (const n of p.nodes) console.log(`     ${n.id} [${n.actor}] ${n.title} ${n.est_minutes}min wait ${n.wait_days_min}-${n.wait_days_max}d deps:${n.depends_on.join(",")}`);
}
console.log("\nUNAPPROVED:", g.cliff.unapproved_mode.limits.join(" | "), "| breaks:", g.cliff.unapproved_mode.breaks_at);
console.log("\nSTEPS:");
for (const s of g.steps) console.log(` ${s.n}. [${s.actor}] ${s.title} (~${s.est_minutes}m) claims:${s.claim_ids.join(",")}`);
console.log("\nGOTCHAS:");
for (const x of g.app_specific_gotchas) console.log(" -", x.text, `[${x.claim_ids.join(",")}]`);
console.log("\nBLOCKERS:");
for (const b of g.blockers) console.log(` - (${b.severity}) ${b.text} -> ${b.workaround}`);
console.log("\nBELIEF DIFF:");
for (const d of g.provenance.belief_diff) console.log(` [${d.verdict}] ${d.topic}\n    believed: ${d.prior_belief}\n    sources : ${d.finding}`);
console.log("\nCORRECTIONS:");
for (const c of g.provenance.corrections) console.log(` ${c.claim_id} ${c.from}->${c.to}: ${claim(c.claim_id)?.text.slice(0, 110)} | ${c.reason.slice(0, 140)}`);
