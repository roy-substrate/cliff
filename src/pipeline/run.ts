import { CostMeter, type ToolEvent } from "@/lib/llm";
import { computeDifficulty } from "@/lib/difficulty";
import { newVersionId, saveVersion, getLatest } from "@/lib/store";
import { rootDomain, slugify } from "@/lib/util";
import type { AttemptEntry, Claim, Evidence, GenEvent, Guide, GuideDraft, Stage } from "@/lib/schema";
import { lookupComposio } from "./composio";
import { runProbes } from "./probe";
import { verifyEvidence, type Correction } from "./verify";
import * as S from "./stages";

type Emit = (e: GenEvent) => void;
export interface RunOpts {
  force?: boolean;
  signal?: AbortSignal;
  createdBy?: "library" | "live" | "reverify";
}

const DEADLINE = { resolve: 20_000, discover: 40_000, extract: 60_000, synthesize: 90_000, verify: 40_000 };

/** Run fn with its own abort deadline, chained to the parent signal. */
async function within<T>(ms: number, parent: AbortSignal | undefined, fn: (s: AbortSignal) => Promise<T>): Promise<T> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(new Error(`deadline ${ms}ms`)), ms);
  const onAbort = () => ctl.abort(parent?.reason);
  parent?.addEventListener("abort", onAbort);
  try {
    return await fn(ctl.signal);
  } finally {
    clearTimeout(t);
    parent?.removeEventListener("abort", onAbort);
  }
}

export async function generateGuide(input: string, emit: Emit, opts: RunOpts = {}): Promise<{ versionId: string; slug: string; guide: Guide; cost: number }> {
  const meter = new CostMeter();
  const runId = Math.random().toString(36).slice(2, 10);
  const t0 = Date.now();
  const timed = async <T>(stage: Stage, fn: () => Promise<T>, note?: string): Promise<T | null> => {
    const s = Date.now();
    emit({ type: "stage", stage, status: "started", note });
    try {
      const r = await fn();
      emit({ type: "stage", stage, status: "done", ms: Date.now() - s });
      return r;
    } catch (e) {
      emit({ type: "stage", stage, status: "failed", ms: Date.now() - s, note: e instanceof Error ? e.message : String(e) });
      return null;
    }
  };
  const onTool = (e: ToolEvent) => emit(e.kind === "search" ? { type: "search", query: e.query, hits: e.hits } : { type: "fetch", url: e.url, ok: e.ok });

  // ---- S0 resolve (+ composio lookup + prior beliefs, in parallel)
  const guess = slugify(input);
  emit({ type: "run_started", runId, slug: guess });
  emit({
    type: "plan",
    items: [
      "Resolve the app and check whether Composio already manages its OAuth",
      "Write down what the model believes BEFORE researching (so we can diff it later)",
      "Find the provider's official developer docs, review policy and limits",
      "Extract claims with verbatim quotes, in parallel: mechanics, approval, console",
      "Probe the provider's public endpoints without logging in",
      "Re-fetch every cited page and check each quote; drop what fails",
      "Write the guide from verified claims only",
    ],
  });

  const resolved = await timed("resolve", () => within(DEADLINE.resolve, opts.signal, (s) => S.resolve(input, meter, s)));
  const slug = resolved?.slug ?? guess;
  const cached = !opts.force && getLatest(slug);
  if (cached && Date.now() - new Date(cached.created_at).getTime() < 30 * 864e5) {
    emit({ type: "cached", guideId: cached.versionId });
    return { versionId: cached.versionId, slug, guide: cached.guide, cost: 0 };
  }
  const name = resolved?.name ?? input;
  const homepage = resolved?.homepage ?? (input.startsWith("http") ? input : `https://${guess}.com`);

  const [composio, priorRes] = await Promise.all([
    lookupComposio(slug),
    timed("resolve", () => within(DEADLINE.resolve, opts.signal, (s) => S.priorBeliefs(name, meter, s)), "prior beliefs"),
  ]);
  const priors = priorRes?.priors ?? [];
  priors.forEach((p) => emit({ type: "prior", topic: p.topic, belief: p.belief }));

  // ---- S1 discover
  const disc = await timed("discover", () => within(DEADLINE.discover, opts.signal, (s) => S.discover({ name, homepage }, meter, onTool, s)));
  const sources = disc?.sources ?? [];

  // ---- S2 extract (3 workers) + S3 probe, in parallel
  const evidence: Evidence[] = [];
  const claims: Claim[] = [];
  const attempts: AttemptEntry[] = [];
  const nowIso = () => new Date().toISOString();
  const firstPartyRoots = new Set([rootDomain(homepage), ...sources.filter((s) => s.first_party).map((s) => rootDomain(s.url))]);

  const addRaw = (raw: S.RawClaimsT) => {
    for (const c of raw.claims) {
      const hasQuote = c.quote.trim().length > 15;
      const evId = `e${evidence.length + 1}`;
      if (hasQuote) evidence.push({ id: evId, url: c.source_url, quote: c.quote.trim(), fetched_at: nowIso(), kind: "doc", quote_found: null, coverage: null, fetch_status: "not_checked" });
      const firstParty = firstPartyRoots.has(rootDomain(c.source_url));
      const claim: Claim = {
        id: `c${claims.length + 1}`,
        text: c.text,
        evidence_ids: hasQuote ? [evId] : [],
        status: !hasQuote ? "inferred" : firstParty ? "primary" : "secondary",
        confidence: !hasQuote ? 0.35 : firstParty ? 0.85 : 0.6,
        topic: c.topic,
        last_seen_date: c.date_in_source,
        stale: false,
      };
      claims.push(claim);
      emit({ type: "claim", claim });
    }
  };

  emit({ type: "stage", stage: "extract", status: "started" });
  const tExtract = Date.now();
  const roleFor = (w: keyof typeof S.WORKERS) => {
    const pref = w === "mechanics" ? ["oauth_docs", "scopes"] : w === "approval" ? ["review_policy", "limits", "changelog", "community"] : ["console", "oauth_docs"];
    const ordered = [...sources].sort((a, b) => (pref.includes(a.role) ? 0 : 1) - (pref.includes(b.role) ? 0 : 1));
    return ordered.length ? ordered : [{ url: homepage, role: "oauth_docs" }];
  };
  const [probe] = await Promise.all([
    timed("probe", () =>
      runProbes(
        { homepage, developerPortal: disc?.developer_portal ?? resolved?.developer_portal, authorizeUrl: disc?.authorize_url },
        (url, observed, outcome) => emit({ type: "probe", url, observed, outcome }),
      ),
    ),
    ...(["mechanics", "approval", "console"] as const).map(async (w) => {
      const r = await within(DEADLINE.extract, opts.signal, (s) => S.extract(w, { name }, roleFor(w), meter, onTool, s)).catch((e) => {
        emit({ type: "error", stage: "extract", message: `${w}: ${e instanceof Error ? e.message : e}`, recoverable: true });
        return null;
      });
      if (r) addRaw(r);
    }),
  ]);
  emit({ type: "stage", stage: "extract", status: "done", ms: Date.now() - tExtract });

  // probe observations become `tested` claims
  for (const a of probe?.attempts ?? []) {
    attempts.push(a);
    if (a.outcome === "error") continue;
    const evId = `e${evidence.length + 1}`;
    const url = a.action.replace(/^GET /, "").split("?")[0];
    evidence.push({ id: evId, url, quote: a.observed.slice(0, 400), fetched_at: a.at, kind: a.action.includes("well-known") ? "well_known" : "console_probe", quote_found: true, coverage: 1, fetch_status: "ok" });
    const claim: Claim = { id: `c${claims.length + 1}`, text: `Probe: ${a.action} returned ${a.observed.slice(0, 200)}`, evidence_ids: [evId], status: "tested", confidence: 0.95, topic: "endpoint", last_seen_date: a.at.slice(0, 10), stale: false };
    a.supports_claim_ids = [claim.id];
    claims.push(claim);
    emit({ type: "claim", claim });
  }

  // ---- S5 verify FIRST. Nothing that failed verification may reach the writer.
  let corrections: Correction[] = [];
  const emitFix = (c: Correction) => emit({ type: "verify", claimId: c.claim_id, from: c.from, to: c.to, reason: c.reason });
  const isTrusted = (c: Claim) => c.status === "tested" || c.status === "primary" || c.status === "secondary";
  await timed("verify", async () => {
    corrections = await verifyEvidence(claims, evidence, emitFix, sources.map((x) => x.url));
    const conflicts = await within(DEADLINE.verify, opts.signal, (sig) =>
      S.findContradictions(claims.filter(isTrusted).map((c) => ({ id: c.id, text: c.text, topic: c.topic, status: c.status })), meter, sig),
    ).catch(() => ({ conflicts: [] }));
    for (const cf of conflicts.conflicts) corrections.push(...resolveConflict(cf.claim_ids, cf.reason, claims, evidence, emitFix));
  });

  // ---- no-source fallback: never fabricate
  const trusted = claims.filter(isTrusted);
  const enough = sources.length >= 2 && trusted.filter((c) => c.status !== "tested").length >= 3;
  let draft: GuideDraft | null = null;
  if (enough) {
    draft = await timed("synthesize", () =>
      within(DEADLINE.synthesize, opts.signal, (sig) =>
        S.synthesize(
          {
            app: { name, slug, homepage },
            // only claims that survived verification are facts the writer may use
            claims: trusted.map((c) => ({ id: c.id, text: c.text, topic: c.topic, status: c.status })),
            probes: attempts.map((a) => `${a.action} -> ${a.observed}`),
            composio,
          },
          meter,
          sig,
        ),
      ),
    );
  } else {
    emit({ type: "stage", stage: "synthesize", status: "skipped", note: "not enough verified sources; emitting an honest fallback guide" });
  }
  const valid = new Set(trusted.map((c) => c.id));
  const isFallback = !draft;
  const finalDraft = draft ? scrubClaimIds(draft, valid) : fallbackDraft(name, slug, homepage, composio.managed_auth);
  if (draft) {
    // hands-on time is computed from the steps, never guessed: the developer's own non-optional work
    const mine = finalDraft.steps.filter((st) => st.actor === "developer" && !/^optional/i.test(st.title)).reduce((n, st) => n + st.est_minutes, 0);
    if (mine > 0) finalDraft.time.hands_on_minutes = mine;
  }

  const diffRes = priors.length
    ? await within(DEADLINE.verify, opts.signal, (sig) =>
        S.beliefDiff(priors, trusted.map((c) => ({ id: c.id, text: c.text, status: c.status, topic: c.topic })), meter, sig),
      ).catch(() => null)
    : null;

  // ---- assemble
  const guide: Guide = {
    ...stripDraftExtras(finalDraft),
    status: isFallback ? "fallback" : "full",
    app: { ...finalDraft.app, name, slug, homepage },
    difficulty: isFallback ? { drivers: finalDraft.difficulty_drivers, score: 0, level: "unknown" } : computeDifficulty(finalDraft),
    build_or_borrow: { ...finalDraft.build_or_borrow, composio_managed: composio.managed_auth, composio_slug: composio.toolkit_slug },
    composio: composio.source === "none" ? null : { toolkit_slug: composio.toolkit_slug, tool_count: composio.tool_count, managed_auth: composio.managed_auth, auth_config_fields: composio.auth_config_fields, redirect_uri: composio.redirect_uri },
    provenance: {
      claims,
      evidence,
      attempt_log: attempts,
      corrections: corrections.map((c) => ({ claim_id: c.claim_id, from: c.from, to: c.to, reason: c.reason })),
      belief_diff: diffRes?.entries ?? [],
      sources_searched: sources.map((s) => s.url),
      uncertain: claims.filter((c) => c.status === "unverified" || c.status === "inferred").map((c) => c.text).slice(0, 12),
    },
  };

  const versionId = newVersionId(slug);
  saveVersion({ versionId, slug, created_at: new Date().toISOString(), created_by: opts.createdBy ?? "live", cost_usd: meter.usd, guide });
  emit({ type: "stage", stage: "publish", status: "done", ms: Date.now() - t0 });
  emit({ type: "done", guideId: slug, versionId, cost_usd: meter.usd });
  return { versionId, slug, guide, cost: meter.usd };
}

function stripDraftExtras(d: GuideDraft) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { difficulty_drivers, business_verification_required, paid_plan_or_fee_required, long_wait_days, ...rest } = d;
  return rest;
}

/** Remove any claim id the model invented, anywhere in the draft. */
function scrubClaimIds<T>(v: T, valid: Set<string>): T {
  if (Array.isArray(v)) return v.map((x) => scrubClaimIds(x, valid)) as T;
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      out[k] = k === "claim_ids" && Array.isArray(val) ? (val as string[]).filter((id) => valid.has(id)) : scrubClaimIds(val, valid);
    }
    return out as T;
  }
  return v;
}

function fallbackDraft(name: string, slug: string, homepage: string, composioManaged: boolean | null): GuideDraft {
  return {
    app: { name, slug, homepage, developer_portal: null },
    summary: `We could not find enough reliable sources to write a verified guide for ${name}. Below is a generic OAuth 2.0 checklist. Every statement is unverified. Paste the provider's developer docs URL to retry.`,
    has_oauth: true,
    auth_alternatives: [],
    build_or_borrow: { composio_managed: null, composio_slug: null, reasons_to_bring_own: [], agent_access_allowed: "unknown", verdict: composioManaged === true ? "Composio lists managed auth for this toolkit, so try that before creating your own app. We could not verify anything else." : composioManaged === false ? "Composio lists this toolkit as bring-your-own-app. We could not verify the provider's process." : "Unknown. Check whether Composio already has a managed OAuth app for this toolkit before creating your own." },
    time: { hands_on_minutes: 0, approval_required: false, approval_wait_days_min: null, approval_wait_days_max: null, unapproved_usable: true, claim_ids: [] },
    cliff: { scope_tiers: [], paths: [], unapproved_mode: { limits: [], breaks_at: "Unknown", claim_ids: [] } },
    prerequisites: [],
    oauth: { flow: "unknown", authorize_url: null, token_url: null, pkce: "unknown", refresh_tokens: "unknown", token_lifetime: null, redirect_uri_rules: [], claim_ids: [] },
    steps: [
      "Find the provider's developer portal and sign in",
      "Create a new app or integration",
      "Add the redirect URI your auth config expects, exactly as shown",
      "Choose the smallest set of scopes your agent needs",
      "Check whether the provider requires review before other users can connect",
    ].map((t, i) => ({ n: i + 1, title: t, detail_md: "Generic step. Not verified for this provider.", actor: "developer" as const, claim_ids: [], attempt_log_ids: [], est_minutes: 10 })),
    blockers: [],
    app_specific_gotchas: [],
    agent_vs_human: { agent_can: [], human_must: ["Everything: we could not verify this provider's process."] },
    artifacts: [],
    difficulty_drivers: ["No reliable sources found"],
    business_verification_required: false,
    paid_plan_or_fee_required: false,
    long_wait_days: 0,
  };
}


/** How much a claim's support is worth when two claims disagree. */
function strength(c: Claim, evidence: Evidence[]): number {
  if (c.status === "tested") return 4;
  if (c.status === "secondary") return 1;
  const best = Math.max(0, ...c.evidence_ids.map((id) => evidence.find((e) => e.id === id)?.coverage ?? 0));
  return best >= 0.85 ? 3 : 2;
}

/** A conflict demotes only the weaker side. If both are equally supported it is a real dispute: demote both. */
function resolveConflict(ids: string[], reason: string, claims: Claim[], evidence: Evidence[], emit: (c: Correction) => void): Correction[] {
  const members = ids.map((id) => claims.find((c) => c.id === id)).filter((c): c is Claim => !!c && (c.status === "tested" || c.status === "primary" || c.status === "secondary"));
  if (members.length < 2) return [];
  const max = Math.max(...members.map((c) => strength(c, evidence)));
  const losers = members.filter((c) => strength(c, evidence) < max);
  const demote = losers.length ? losers : members;
  const why = losers.length ? `conflicts with a better-supported claim: ${reason}` : `sources disagree and neither is better supported: ${reason}`;
  return demote.map((c) => {
    const corr = { claim_id: c.id, from: c.status, to: "unverified" as const, reason: why };
    c.status = "unverified";
    emit(corr);
    return corr;
  });
}
