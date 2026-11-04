/**
 * DEV ONLY. Writes a synthetic guide ("Example Provider") to CLIFF_DATA_DIR so the UI can be exercised
 * without a model run. Nothing here is real research and it is never written to data/guides.
 */
import fs from "node:fs";
import path from "node:path";
import { Guide } from "../src/lib/schema";

const dir = process.env.CLIFF_DATA_DIR;
if (!dir) throw new Error("set CLIFF_DATA_DIR (a throwaway dir)");

const now = "2026-11-04T10:00:00.000Z";
const guide = Guide.parse({
  status: "full",
  app: { name: "Example Provider (fixture)", slug: "example", homepage: "https://example.com", developer_portal: "https://example.com/dev" },
  summary: "Synthetic fixture for UI testing. Not real research.",
  has_oauth: true,
  auth_alternatives: ["API key"],
  build_or_borrow: { composio_managed: true, composio_slug: "example", reasons_to_bring_own: ["Branding on the consent screen"], agent_access_allowed: "yes", verdict: "Use Composio managed auth first; bring your own app only for branding or quota." },
  difficulty: { drivers: ["Sensitive scope needs review"], score: 7, level: "weeks" },
  time: { hands_on_minutes: 90, approval_required: true, approval_wait_days_min: 7, approval_wait_days_max: 42, unapproved_usable: true, claim_ids: ["c1"] },
  cliff: {
    scope_tiers: [
      { scope: "profile.read", purpose: "Read profile", action_label: "Read the user's profile", tier: "basic", gate: "", cheaper_alternative: null, claim_ids: ["c2"] },
      { scope: "mail.read", purpose: "Read mail", action_label: "Read the user's mail", tier: "restricted", gate: "Security assessment", cheaper_alternative: "request mail.send only if you never need to read", claim_ids: ["c1"] },
    ],
    paths: [
      { distribution: "internal", verdict: "No review needed for your own team.", total_days_min: 0, total_days_max: 1, nodes: [
        { id: "register", title: "Register the app", actor: "developer", est_minutes: 30, wait_days_min: 0, wait_days_max: 0, wait_unknown: false, depends_on: [], claim_ids: [] },
      ] },
      { distribution: "unlisted_public", verdict: "Public use needs review for the mail scope.", total_days_min: 8, total_days_max: 43, nodes: [
        { id: "register", title: "Register the app", actor: "developer", est_minutes: 30, wait_days_min: 0, wait_days_max: 0, wait_unknown: false, depends_on: [], claim_ids: [] },
        { id: "policy", title: "Publish a privacy policy", actor: "agent", est_minutes: 120, wait_days_min: 0, wait_days_max: 0, wait_unknown: false, depends_on: ["register"], claim_ids: [] },
        { id: "video", title: "Record the demo video", actor: "developer", est_minutes: 240, wait_days_min: 0, wait_days_max: 0, wait_unknown: false, depends_on: ["register"], claim_ids: [] },
        { id: "review", title: "Provider review", actor: "provider_wait", est_minutes: 0, wait_days_min: 7, wait_days_max: 42, wait_unknown: false, depends_on: ["policy", "video"], claim_ids: ["c1"] },
      ] },
    ],
    unapproved_mode: { limits: ["100 test users"], breaks_at: "at user 101 new consents are blocked", claim_ids: ["c1"] },
  },
  prerequisites: [{ text: "Verified domain", claim_ids: ["c1"] }],
  oauth: { flow: "authorization_code_pkce", authorize_url: "https://example.com/oauth/authorize", token_url: null, pkce: "supported", refresh_tokens: "yes", token_lifetime: "1 hour", redirect_uri_rules: ["Must be https"], claim_ids: ["c2"] },
  steps: [{ n: 1, title: "Register an app", detail_md: "Open the console and create an app.", actor: "developer", claim_ids: ["c2"], attempt_log_ids: ["a1"], est_minutes: 20 }],
  blockers: [{ text: "Missing privacy policy", workaround: "Publish one on your verified domain.", severity: "high", claim_ids: ["c1"] }],
  app_specific_gotchas: [{ text: "Fixture gotcha", claim_ids: [] }],
  agent_vs_human: { agent_can: ["Draft consent copy"], human_must: ["Log in", "Submit for review"] },
  artifacts: [{ kind: "scope_justification", label: "Scope justification" }],
  composio: { toolkit_slug: "example", tool_count: null, managed_auth: true, auth_config_fields: ["client_id", "client_secret"], redirect_uri: null },
  provenance: {
    claims: [
      { id: "c1", text: "Restricted scopes require a security assessment.", evidence_ids: ["e1"], status: "primary", confidence: 0.85, topic: "review", last_seen_date: null, stale: false },
      { id: "c2", text: "PKCE is supported.", evidence_ids: ["e2"], status: "tested", confidence: 0.95, topic: "endpoint", last_seen_date: null, stale: true },
    ],
    evidence: [
      { id: "e1", url: "https://example.com/docs/review", quote: "Restricted scopes require an annual security assessment.", fetched_at: now, kind: "doc", quote_found: true, coverage: 1, fetch_status: "ok" },
      { id: "e2", url: "https://example.com/.well-known/openid-configuration", quote: "code_challenge_methods_supported: S256", fetched_at: now, kind: "well_known", quote_found: true, coverage: 1, fetch_status: "ok" },
    ],
    attempt_log: [{ id: "a1", at: now, mode: "probe", action: "GET https://example.com/dev", observed: "HTTP 302 -> /login (login wall)", outcome: "blocked_login", screenshot: null, supports_claim_ids: ["c2"] }],
    corrections: [{ claim_id: "c1", from: "primary", to: "primary", reason: "fixture" }],
    belief_diff: [{ topic: "Review required", prior_belief: "No review needed.", finding: "Review is required for restricted scopes.", verdict: "corrected", claim_ids: ["c1"] }],
    sources_searched: ["https://example.com/docs/review"],
    uncertain: ["Exact wait time"],
  },
});

const v = { versionId: "example-202611041000-abcd", slug: "example", created_at: now, created_by: "library", cost_usd: 0, guide };
fs.mkdirSync(path.join(dir, "example"), { recursive: true });
fs.writeFileSync(path.join(dir, "example", `${v.versionId}.json`), JSON.stringify(v));
fs.writeFileSync(path.join(dir, "example", "latest.json"), JSON.stringify({ versionId: v.versionId }));
console.log("fixture written to", dir);
