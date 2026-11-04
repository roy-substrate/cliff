import { z } from "zod";

/** How we know a claim. Ordered strongest to weakest. */
export const ClaimStatus = z.enum([
  "tested", // we observed it: probe response or console attempt
  "primary", // verbatim quote found in a provider doc
  "secondary", // blog/forum/3P, dated
  "inferred", // model reasoning from general OAuth knowledge
  "unverified", // asserted, no support
]);
export type ClaimStatus = z.infer<typeof ClaimStatus>;

export const Topic = z.enum([
  "endpoint",
  "scope",
  "review",
  "limit",
  "prereq",
  "step",
  "blocker",
  "time",
  "cost",
  "policy",
]);

export const Evidence = z.object({
  id: z.string(),
  url: z.string(),
  quote: z.string(),
  fetched_at: z.string(),
  kind: z.enum(["doc", "console_probe", "well_known", "screenshot", "attempt_log"]),
  quote_found: z.boolean().nullable(), // set by verifier; null = not checked
  fetch_status: z.enum(["ok", "unreachable", "not_checked"]),
});
export type Evidence = z.infer<typeof Evidence>;

export const Claim = z.object({
  id: z.string(),
  text: z.string(),
  evidence_ids: z.array(z.string()),
  status: ClaimStatus,
  confidence: z.number(),
  topic: Topic,
  last_seen_date: z.string().nullable(), // date stated in source, for staleness
  stale: z.boolean(),
});
export type Claim = z.infer<typeof Claim>;

export const Actor = z.enum(["agent", "developer", "provider_wait"]);

export const AttemptEntry = z.object({
  id: z.string(),
  at: z.string(),
  mode: z.enum(["probe", "playwright"]),
  action: z.string(),
  observed: z.string(),
  outcome: z.enum(["ok", "blocked_login", "blocked_captcha", "blocked_verification", "error", "needs_human"]),
  screenshot: z.string().nullable(),
  supports_claim_ids: z.array(z.string()),
});
export type AttemptEntry = z.infer<typeof AttemptEntry>;

export const Step = z.object({
  n: z.number(),
  title: z.string(),
  detail_md: z.string(),
  actor: Actor,
  claim_ids: z.array(z.string()),
  attempt_log_ids: z.array(z.string()),
  est_minutes: z.number(),
});

/** One node in the critical-path DAG. wait_days > 0 means the provider owns the clock. */
export const PathNode = z.object({
  id: z.string(),
  title: z.string(),
  actor: Actor,
  est_minutes: z.number(),
  wait_days_min: z.number(),
  wait_days_max: z.number(),
  depends_on: z.array(z.string()),
  claim_ids: z.array(z.string()),
});

export const Distribution = z.enum(["internal", "unlisted_public", "marketplace"]);
export type Distribution = z.infer<typeof Distribution>;

export const ScopeTier = z.object({
  scope: z.string(),
  purpose: z.string(),
  action_label: z.string(), // human label the calculator shows: "Read calendar events"
  tier: z.enum(["none", "basic", "sensitive", "restricted", "admin_only", "unknown"]),
  gate: z.string(), // what this scope trips: "brand verification", "CASA assessment"
  cheaper_alternative: z.string().nullable(),
  claim_ids: z.array(z.string()),
});

export const Blocker = z.object({
  text: z.string(),
  workaround: z.string(),
  severity: z.enum(["low", "med", "high"]),
  claim_ids: z.array(z.string()),
});

export const BeliefDiffEntry = z.object({
  topic: z.string(),
  prior_belief: z.string(), // what the model asserted before research
  finding: z.string(), // what the sources say
  verdict: z.enum(["confirmed", "corrected", "refined", "could_not_verify"]),
  claim_ids: z.array(z.string()),
});

export const ArtifactKind = z.enum([
  "scope_justification",
  "consent_screen_copy",
  "privacy_clause",
  "demo_video_shotlist",
  "redirect_uri_list",
]);

/** The whole guide. Rendered by the UI; markdown is just an export. */
export const Guide = z.object({
  // "fallback" = not enough sources; time/difficulty fields are placeholders, not findings
  status: z.enum(["full", "fallback"]),
  app: z.object({
    name: z.string(),
    slug: z.string(),
    homepage: z.string(),
    developer_portal: z.string().nullable(),
  }),
  summary: z.string(),
  has_oauth: z.boolean(), // false => api-key-only path
  auth_alternatives: z.array(z.string()), // e.g. "API key", "service account", "GitHub App"

  build_or_borrow: z.object({
    composio_managed: z.boolean().nullable(),
    composio_slug: z.string().nullable(),
    reasons_to_bring_own: z.array(z.string()),
    agent_access_allowed: z.enum(["yes", "restricted", "no", "unknown"]),
    verdict: z.string(), // one opinionated sentence
  }),

  difficulty: z.object({
    drivers: z.array(z.string()),
    // score + level are computed in code (difficulty.ts), never by the model
    score: z.number(),
    level: z.enum(["instant", "hours", "days", "weeks", "weeks_plus_cost", "unknown"]),
  }),

  time: z.object({
    hands_on_minutes: z.number(),
    approval_required: z.boolean(),
    approval_wait_days_min: z.number().nullable(),
    approval_wait_days_max: z.number().nullable(),
    unapproved_usable: z.boolean(),
    claim_ids: z.array(z.string()),
  }),

  cliff: z.object({
    scope_tiers: z.array(ScopeTier),
    // one path per distribution mode; the calculator picks one
    paths: z.array(
      z.object({
        distribution: Distribution,
        verdict: z.string(),
        total_days_min: z.number(),
        total_days_max: z.number(),
        nodes: z.array(PathNode),
      }),
    ),
    unapproved_mode: z.object({
      limits: z.array(z.string()),
      breaks_at: z.string(), // "at user 101 Google blocks new consents"
      claim_ids: z.array(z.string()),
    }),
  }),

  prerequisites: z.array(z.object({ text: z.string(), claim_ids: z.array(z.string()) })),

  oauth: z.object({
    flow: z.enum(["authorization_code", "authorization_code_pkce", "client_credentials", "device", "custom", "unknown"]),
    authorize_url: z.string().nullable(),
    token_url: z.string().nullable(),
    pkce: z.enum(["required", "supported", "unsupported", "unknown"]),
    refresh_tokens: z.enum(["yes", "no", "unknown"]),
    token_lifetime: z.string().nullable(),
    redirect_uri_rules: z.array(z.string()),
    claim_ids: z.array(z.string()),
  }),

  steps: z.array(Step),
  blockers: z.array(Blocker),
  app_specific_gotchas: z.array(z.object({ text: z.string(), claim_ids: z.array(z.string()) })),

  agent_vs_human: z.object({
    agent_can: z.array(z.string()),
    human_must: z.array(z.string()),
  }),

  artifacts: z.array(z.object({ kind: ArtifactKind, label: z.string() })),

  composio: z
    .object({
      toolkit_slug: z.string().nullable(),
      tool_count: z.number().nullable(),
      managed_auth: z.boolean().nullable(),
      auth_config_fields: z.array(z.string()),
      redirect_uri: z.string().nullable(),
    })
    .nullable(),

  provenance: z.object({
    claims: z.array(Claim),
    evidence: z.array(Evidence),
    attempt_log: z.array(AttemptEntry),
    corrections: z.array(
      z.object({ claim_id: z.string(), from: ClaimStatus, to: ClaimStatus, reason: z.string() }),
    ),
    belief_diff: z.array(BeliefDiffEntry),
    sources_searched: z.array(z.string()),
    uncertain: z.array(z.string()),
  }),
});
export type Guide = z.infer<typeof Guide>;

/** What the synthesizer (Opus) returns. Provenance is assembled by code, not the model. */
export const GuideDraft = Guide.omit({ provenance: true, difficulty: true, composio: true, status: true }).extend({
  difficulty_drivers: z.array(z.string()),
  business_verification_required: z.boolean(),
  paid_plan_or_fee_required: z.boolean(),
  long_wait_days: z.number(), // longest single provider wait, days
});
export type GuideDraft = z.infer<typeof GuideDraft>;

/** Stream events. The UI renders these; they are also persisted for replay. */
export type Stage = "resolve" | "discover" | "extract" | "probe" | "synthesize" | "verify" | "publish";
export type GenEvent =
  | { type: "run_started"; runId: string; slug: string }
  | { type: "plan"; items: string[] }
  | { type: "stage"; stage: Stage; status: "started" | "done" | "failed" | "skipped"; ms?: number; note?: string }
  | { type: "search"; query: string; hits: { url: string; title: string }[] }
  | { type: "fetch"; url: string; ok: boolean }
  | { type: "probe"; url: string; observed: string; outcome: AttemptEntry["outcome"] }
  | { type: "claim"; claim: Claim }
  | { type: "prior"; topic: string; belief: string }
  | { type: "verify"; claimId: string; from: ClaimStatus; to: ClaimStatus; reason: string }
  | { type: "done"; guideId: string; versionId: string; cost_usd: number }
  | { type: "cached"; guideId: string }
  | { type: "error"; stage: Stage; message: string; recoverable: boolean };
