import fs from "node:fs";
import path from "node:path";
import { getLatestLocal as getLatest } from "../src/lib/store";

/** Summarises every guide in data/guides. Quote support is NOT the same as factual accuracy: it only says a quote exists on the cited page. */
const root = path.join(process.cwd(), "data", "guides");
const rows: string[] = [];
let totals = { claims: 0, tested: 0, primary: 0, secondary: 0, inferred: 0, unverified: 0, exact: 0, near: 0, miss: 0, unread: 0, cost: 0 };

for (const slug of fs.readdirSync(root).filter((d) => !d.startsWith("."))) {
  const v = getLatest(slug);
  if (!v) continue;
  const g = v.guide;
  const c = g.provenance.claims;
  const n = (s: string) => c.filter((x) => x.status === s).length;
  const docEv = g.provenance.evidence.filter((e) => e.kind === "doc");
  const exact = docEv.filter((e) => e.quote_found === true).length;
  const near = docEv.filter((e) => e.quote_found === false && (e.coverage ?? 0) >= 0.5).length;
  const miss = docEv.filter((e) => e.quote_found === false && (e.coverage ?? 0) < 0.5).length;
  const unread = docEv.filter((e) => e.quote_found === null).length;
  const flags: string[] = [];
  if (g.status === "fallback") flags.push("FALLBACK");
  if (g.cliff.paths.length === 0) flags.push("no paths");
  if (g.cliff.scope_tiers.length === 0) flags.push("no scope tiers");
  if (g.steps.length === 0) flags.push("no steps");
  if (g.app_specific_gotchas.length < 3) flags.push(`${g.app_specific_gotchas.length} gotchas`);
  if (!g.steps.some((s) => s.actor === "developer")) flags.push("no developer steps");
  rows.push(
    `${slug.padEnd(20)} ${g.difficulty.level.padEnd(15)} ${String(c.length).padStart(3)} cl | T${n("tested")} P${n("primary")} S${n("secondary")} I${n("inferred")} U${n("unverified")} | quotes exact ${exact} near ${near} miss ${miss} unread ${unread} | corr ${g.provenance.corrections.length} | $${v.cost_usd.toFixed(2)} ${flags.length ? "| " + flags.join(", ") : ""}`,
  );
  totals = {
    claims: totals.claims + c.length,
    tested: totals.tested + n("tested"),
    primary: totals.primary + n("primary"),
    secondary: totals.secondary + n("secondary"),
    inferred: totals.inferred + n("inferred"),
    unverified: totals.unverified + n("unverified"),
    exact: totals.exact + exact,
    near: totals.near + near,
    miss: totals.miss + miss,
    unread: totals.unread + unread,
    cost: totals.cost + v.cost_usd,
  };
}
console.log(rows.join("\n"));
const checked = totals.exact + totals.near + totals.miss;
console.log(`\nTOTAL ${totals.claims} claims | tested ${totals.tested} primary ${totals.primary} secondary ${totals.secondary} inferred ${totals.inferred} unverified ${totals.unverified} | cost $${totals.cost.toFixed(2)}`);
if (checked) console.log(`Doc quotes re-checked: ${checked} (exact ${totals.exact}, near ${totals.near}, not found ${totals.miss}); ${totals.unread} on pages we could not re-read. Not-found rate ${((totals.miss / checked) * 100).toFixed(0)}%`);
