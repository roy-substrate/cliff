/**
 * Attach a real console observation to a guide as `tested` evidence.
 *
 *   pnpm attach <slug> --action "Opened Create new integration" --observed "Form asks for: name, logo, type (internal/public)..." \
 *        --outcome ok --screenshot ./shot.png --claims c4,c7 --step 2
 *
 * Writes a NEW immutable version (history is never edited in place) and copies the screenshot into public/evidence.
 */
import fs from "node:fs";
import path from "node:path";
import { getLatestLocal, newVersionId, saveVersion } from "../src/lib/store";
import { AttemptEntry } from "../src/lib/schema";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}
const slug = process.argv[2];
const action = arg("action");
const observed = arg("observed");
const outcome = AttemptEntry.shape.outcome.safeParse(arg("outcome") ?? "ok");
if (!slug || !action || !observed || !outcome.success) {
  console.error('usage: pnpm attach <slug> --action "..." --observed "..." [--outcome ok|blocked_login|blocked_captcha|blocked_verification|needs_human|error] [--screenshot file] [--claims c1,c2] [--step N]');
  process.exit(1);
}

const cur = getLatestLocal(slug);
if (!cur) {
  console.error(`no guide for "${slug}"`);
  process.exit(1);
}
const guide = structuredClone(cur.guide);
const now = new Date().toISOString();
const n = guide.provenance.attempt_log.filter((a) => a.mode === "playwright").length + 1;
const attemptId = `a_console_${n}`;

let shotUrl: string | null = null;
const shot = arg("screenshot");
if (shot) {
  const pubRoot = process.env.CLIFF_PUBLIC_DIR ?? path.join(process.cwd(), "public");
  const dest = path.join(pubRoot, "evidence", slug, `${now.slice(0, 10)}-${n}${path.extname(shot) || ".png"}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(shot, dest);
  shotUrl = `/evidence/${slug}/${path.basename(dest)}`;
}

const claimIds = (arg("claims") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
guide.provenance.attempt_log.push({ id: attemptId, at: now, mode: "playwright", action, observed, outcome: outcome.data, screenshot: shotUrl, supports_claim_ids: claimIds });

for (const id of claimIds) {
  const claim = guide.provenance.claims.find((c) => c.id === id);
  if (!claim) {
    console.error(`claim ${id} not found`);
    process.exit(1);
  }
  const evId = `e_console_${n}_${id}`;
  guide.provenance.evidence.push({ id: evId, url: shotUrl ?? action, quote: observed.slice(0, 400), fetched_at: now, kind: shotUrl ? "screenshot" : "attempt_log", quote_found: true, coverage: 1, fetch_status: "ok" });
  claim.evidence_ids.push(evId);
  if (claim.status !== "tested") {
    guide.provenance.corrections.push({ claim_id: id, from: claim.status, to: "tested", reason: `observed directly in the provider console (${now.slice(0, 10)})` });
    claim.status = "tested";
  }
  claim.confidence = 0.95;
  claim.stale = false;
}

const step = arg("step");
if (step) {
  const st = guide.steps.find((s) => s.n === Number(step));
  if (!st) {
    console.error(`step ${step} not found`);
    process.exit(1);
  }
  st.attempt_log_ids.push(attemptId);
}

const versionId = newVersionId(slug);
await saveVersion({ versionId, slug, created_at: now, created_by: "library", cost_usd: cur.cost_usd, guide });
console.log(`attached ${attemptId} to ${slug}: new version ${versionId}${shotUrl ? `, screenshot ${shotUrl}` : ""}`);
