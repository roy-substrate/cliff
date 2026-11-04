import type { Distribution, Guide } from "./schema";

type ScopeTier = Guide["cliff"]["scope_tiers"][number];
type PathNode = Guide["cliff"]["paths"][number]["nodes"][number];

export const TIER_RANK: Record<ScopeTier["tier"], number> = {
  none: 0,
  basic: 1,
  unknown: 2,
  sensitive: 3,
  admin_only: 3,
  restricted: 4,
};

export const TIER_LABEL: Record<ScopeTier["tier"], string> = {
  none: "No review",
  basic: "Basic",
  unknown: "Tier not documented",
  sensitive: "Sensitive",
  admin_only: "Admin consent",
  restricted: "Restricted",
};

export type UserBucket = "few" | "hundreds" | "thousands";

export interface CalcInputs {
  distribution: Distribution;
  scopes: string[]; // selected scope names
  users: UserBucket;
}

export interface ScheduledNode extends PathNode {
  startMin: number; // days
  finishMin: number;
  startMax: number;
  finishMax: number;
  critical: boolean;
}

export interface CliffResult {
  topTier: ScopeTier["tier"];
  tripped: boolean; // a gate that is not self-serve applies to this combination
  gates: string[];
  savings: { scope: string; alternative: string }[];
  verdict: string;
  schedule: ScheduledNode[];
  totalMin: number;
  totalMax: number;
  unknownWait: boolean; // a provider-owned wait on this path has no documented duration
  missingPath: boolean;
}

const DAY = 1440;

/** Longest-path schedule over the dependency graph. Cycles and unknown deps are ignored, not fatal. */
export function schedule(nodes: PathNode[]): { nodes: ScheduledNode[]; totalMin: number; totalMax: number } {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const memo = new Map<string, { sMin: number; fMin: number; sMax: number; fMax: number }>();
  const visiting = new Set<string>();

  const calc = (id: string): { sMin: number; fMin: number; sMax: number; fMax: number } => {
    const hit = memo.get(id);
    if (hit) return hit;
    const n = byId.get(id)!;
    if (visiting.has(id)) return { sMin: 0, fMin: 0, sMax: 0, fMax: 0 };
    visiting.add(id);
    let sMin = 0;
    let sMax = 0;
    for (const d of n.depends_on) {
      if (!byId.has(d)) continue;
      const r = calc(d);
      sMin = Math.max(sMin, r.fMin);
      sMax = Math.max(sMax, r.fMax);
    }
    visiting.delete(id);
    const work = n.est_minutes / DAY;
    const res = { sMin, fMin: sMin + work + n.wait_days_min, sMax, fMax: sMax + work + n.wait_days_max };
    memo.set(id, res);
    return res;
  };

  const out = nodes.map((n) => {
    const r = calc(n.id);
    return { ...n, startMin: r.sMin, finishMin: r.fMin, startMax: r.sMax, finishMax: r.fMax, critical: false };
  });
  const totalMin = Math.max(0, ...out.map((n) => n.finishMin));
  const totalMax = Math.max(0, ...out.map((n) => n.finishMax));

  // mark the critical chain: walk back from the latest finisher through the dependency that finishes last
  let cur = out.find((n) => n.finishMax === totalMax);
  while (cur) {
    cur.critical = true;
    const deps = cur.depends_on.map((d) => out.find((x) => x.id === d)).filter(Boolean) as ScheduledNode[];
    cur = deps.sort((a, b) => b.finishMax - a.finishMax)[0];
  }
  return { nodes: out, totalMin, totalMax };
}

export function computeCliff(guide: Guide, inp: CalcInputs): CliffResult {
  const tiers = guide.cliff.scope_tiers.filter((s) => inp.scopes.includes(s.scope));
  const topTier = tiers.reduce<ScopeTier["tier"]>((a, s) => (TIER_RANK[s.tier] > TIER_RANK[a] ? s.tier : a), "none");
  const rank = TIER_RANK[topTier];

  const path = guide.cliff.paths.find((p) => p.distribution === inp.distribution);
  const allGates = [...new Set(tiers.filter((s) => TIER_RANK[s.tier] >= 3 && s.gate).map((s) => s.gate))];
  const publicAudience = inp.distribution !== "internal";
  const tripped = publicAudience && (rank >= 3 || path?.nodes.some((n) => n.actor === "provider_wait" && (n.wait_days_max > 0 || n.wait_unknown === true)) === true);

  // gates and swap suggestions only matter once the cliff is actually tripped for this audience
  const gates = tripped ? allGates : [];
  const savings = tripped
    ? tiers.filter((s) => TIER_RANK[s.tier] >= 3 && s.cheaper_alternative).map((s) => ({ scope: s.scope, alternative: s.cheaper_alternative as string }))
    : [];

  if (!path) {
    return { topTier, tripped, gates, savings, verdict: "This guide has no documented path for that distribution mode.", schedule: [], totalMin: 0, totalMax: 0, unknownWait: false, missingPath: true };
  }
  const sched = schedule(path.nodes);
  return {
    topTier,
    tripped,
    gates,
    savings,
    verdict: path.verdict,
    schedule: sched.nodes,
    totalMin: sched.totalMin,
    totalMax: sched.totalMax,
    unknownWait: path.nodes.some((n) => n.wait_unknown === true),
    missingPath: false,
  };
}

export function fmtDays(d: number): string {
  if (d < 1) return `${Math.max(1, Math.round(d * 24))}h`;
  if (d < 14) return `${Math.round(d * 10) / 10}d`;
  return `${Math.round(d / 7)}w`;
}
