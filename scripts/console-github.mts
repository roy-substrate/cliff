/**
 * Records the 2026-11-04 GitHub console check (signed-in browser, read-only: nothing was registered) as tested
 * evidence on the GitHub guide, and applies the one correction it produced. Writes a NEW version.
 */
import { getLatestLocal, newVersionId, saveVersion } from "../src/lib/store";
import type { AttemptEntry, Claim, Evidence } from "../src/lib/schema";

const prev = getLatestLocal("github");
if (!prev) throw new Error("no github guide");
const g = structuredClone(prev.guide);
const at = "2026-11-04T13:05:00.000Z";
const P = g.provenance;

const OAUTH_FORM =
  "Register a new OAuth app: Application name (required), Homepage URL (required), Application description (optional), Redirect URIs (\"You may add up to 10 redirect URIs\", optional \"Allow wildcard matching\"), Enable Device Flow (checkbox), Expire user access tokens (checkbox, provides a refresh_token), Register application.";
const APP_FORM =
  "Create GitHub App: name, homepage, up to 10 redirect URIs with optional wildcard matching, Expire user authorization tokens, Request user authorization (OAuth) during installation, Enable Device Flow, Setup URL, Webhook (Active by default, URL and secret), Repository / Organization / Account / Enterprise permissions, event subscriptions, and 'Where can this GitHub App be installed?': Only on this account, or Any account.";

const attempts: AttemptEntry[] = [
  { id: "a_console_1", at, mode: "playwright", action: "Opened https://github.com/settings/applications/new in a signed-in browser (read only, nothing registered)", observed: OAUTH_FORM, outcome: "ok", screenshot: null, supports_claim_ids: [] },
  { id: "a_console_2", at, mode: "playwright", action: "Opened https://github.com/settings/apps/new in a signed-in browser (read only, nothing created)", observed: APP_FORM, outcome: "ok", screenshot: null, supports_claim_ids: [] },
];
P.attempt_log.push(...attempts);

const ev = (id: string, url: string, quote: string): Evidence => ({ id, url, quote, fetched_at: at, kind: "attempt_log", quote_found: true, coverage: 1, fetch_status: "ok" });
P.evidence.push(ev("e_console_oauth", "https://github.com/settings/applications/new", OAUTH_FORM), ev("e_console_app", "https://github.com/settings/apps/new", APP_FORM));

// confirmations
const confirm = (id: string, evId: string, attempt: AttemptEntry) => {
  const c = P.claims.find((x) => x.id === id);
  if (!c) return;
  c.evidence_ids.push(evId);
  if (c.status !== "tested") P.corrections.push({ claim_id: id, from: c.status, to: "tested", reason: "confirmed in the live GitHub console on 2026-11-04" });
  c.status = "tested";
  c.confidence = 0.95;
  attempt.supports_claim_ids.push(id);
};
for (const id of ["c9", "c36", "c10"]) confirm(id, "e_console_oauth", attempts[0]);
confirm("c25", "e_console_app", attempts[1]);

// the correction: the form no longer has a single "Authorization callback URL" field
const c6 = P.claims.find((x) => x.id === "c6");
if (c6 && c6.status !== "unverified") {
  P.corrections.push({
    claim_id: "c6",
    from: c6.status,
    to: "unverified",
    reason: "contradicted in the live GitHub console on 2026-11-04: the form has 'Redirect URIs' (up to 10, optional wildcard matching), not a single 'Authorization callback URL'",
  });
  c6.status = "unverified";
  c6.confidence = 0.1;
}

const newClaims: Claim[] = [
  { id: "c_console_1", text: "The OAuth app registration form accepts up to 10 redirect URIs and has an optional 'Allow wildcard matching' setting.", evidence_ids: ["e_console_oauth"], status: "tested", confidence: 0.95, topic: "endpoint", last_seen_date: "2026-11-04", stale: false },
  { id: "c_console_2", text: "The OAuth app form needs only a name and a homepage URL plus at least one redirect URI; the description is optional.", evidence_ids: ["e_console_oauth"], status: "tested", confidence: 0.95, topic: "step", last_seen_date: "2026-11-04", stale: false },
  { id: "c_console_3", text: "A GitHub App adds a webhook (active by default), per-area permissions, event subscriptions, and an install target: only your account or any account.", evidence_ids: ["e_console_app"], status: "tested", confidence: 0.95, topic: "step", last_seen_date: "2026-11-04", stale: false },
];
P.claims.push(...newClaims);
attempts[0].supports_claim_ids.push("c_console_1", "c_console_2");
attempts[1].supports_claim_ids.push("c_console_3");

// fix the guide text that relied on the outdated claim
g.oauth.redirect_uri_rules = g.oauth.redirect_uri_rules.map((r) =>
  /callback url/i.test(r) ? "Register at least one redirect URI. You can add up to 10, and wildcard matching is optional: only enable it if you control every URL it could match." : r,
);
g.oauth.claim_ids = [...new Set([...g.oauth.claim_ids.filter((id) => id !== "c6"), "c_console_1"])];
for (const s of g.steps) {
  s.claim_ids = s.claim_ids.filter((id) => id !== "c6");
  if (/register the oauth app/i.test(s.title)) {
    s.attempt_log_ids.push("a_console_1");
    s.claim_ids.push("c_console_1", "c_console_2");
  }
  if (/token expiry and device flow/i.test(s.title)) s.attempt_log_ids.push("a_console_1");
  if (/oauth app or github app/i.test(s.title)) {
    s.attempt_log_ids.push("a_console_2");
    s.claim_ids.push("c_console_3");
  }
}
P.uncertain = P.claims.filter((c) => c.status === "unverified" || c.status === "inferred").map((c) => c.text).slice(0, 12);

const versionId = newVersionId("github");
await saveVersion({ versionId, slug: "github", created_at: new Date().toISOString(), created_by: "library", cost_usd: prev.cost_usd, guide: g });
const n = (s: string) => P.claims.filter((c) => c.status === s).length;
console.log(`saved ${versionId}: tested ${n("tested")}, primary ${n("primary")}, unverified ${n("unverified")}; corrections ${P.corrections.length}`);
