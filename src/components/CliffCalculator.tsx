"use client";

import { useMemo, useState } from "react";
import type { Distribution, Guide } from "@/lib/schema";
import { computeCliff, fmtDays, TIER_LABEL, TIER_RANK, type UserBucket } from "@/lib/cliff";
import { ClaimChips, type ClaimBundle } from "./ClaimChips";

const DIST_LABEL: Record<Distribution, string> = {
  internal: "Only my own team / test accounts",
  unlisted_public: "Any user, installed by link (unlisted)",
  marketplace: "Listed in the provider's marketplace",
};
const USER_LABEL: Record<UserBucket, string> = { few: "Under 25", hundreds: "25 to 500", thousands: "500+" };

export function CliffCalculator({ guide, bundles }: { guide: Guide; bundles: Record<string, ClaimBundle> }) {
  const tiers = guide.cliff.scope_tiers;
  const dists = guide.cliff.paths.map((p) => p.distribution);
  const [distribution, setDistribution] = useState<Distribution>(dists.includes("unlisted_public") ? "unlisted_public" : (dists[0] ?? "internal"));
  const [scopes, setScopes] = useState<string[]>(tiers.slice(0, 1).map((t) => t.scope));
  const [users, setUsers] = useState<UserBucket>("hundreds");

  const r = useMemo(() => computeCliff(guide, { distribution, scopes, users }), [guide, distribution, scopes, users]);
  const toggle = (s: string) => setScopes((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  const scale = Math.max(r.totalMax, 1);

  if (!tiers.length && !guide.cliff.paths.length)
    return <p className="text-sm text-muted">No scope tiers or approval paths could be established from the sources for this provider.</p>;

  return (
    <div className="grid gap-5 md:grid-cols-[320px_1fr]">
      <div className="space-y-4 rounded-lg border border-line bg-panel p-4">
        <fieldset>
          <legend className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">What must your agent do?</legend>
          <div className="space-y-1">
            {tiers.map((t) => (
              <label key={t.scope} className="flex cursor-pointer items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" checked={scopes.includes(t.scope)} onChange={() => toggle(t.scope)} />
                <span>
                  {t.action_label}
                  <span className="ml-1 font-mono text-[11px] text-muted">{t.scope}</span>
                  <span className={`ml-1 rounded px-1 text-[10px] ${TIER_RANK[t.tier] >= 3 ? "bg-accent-soft text-accent" : "bg-stone-100 text-muted"}`}>{TIER_LABEL[t.tier]}</span>
                  <ClaimChips bundles={t.claim_ids.map((id) => bundles[id]).filter(Boolean)} />
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Who will connect?</legend>
          {dists.map((d) => (
            <label key={d} className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="radio" name="dist" checked={distribution === d} onChange={() => setDistribution(d)} />
              {DIST_LABEL[d]}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">How many users, roughly?</legend>
          <div className="flex gap-1">
            {(Object.keys(USER_LABEL) as UserBucket[]).map((u) => (
              <button key={u} onClick={() => setUsers(u)} className={`rounded border px-2 py-1 text-xs ${users === u ? "border-fg bg-fg text-bg" : "border-line text-muted hover:text-fg"}`}>
                {USER_LABEL[u]}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="space-y-4">
        <div className={`rounded-lg border p-4 ${r.tripped ? "border-accent bg-accent-soft" : "border-line bg-panel"}`}>
          <div className="text-xs font-medium uppercase tracking-wide text-muted">{r.tripped ? "You are over the cliff" : "No cliff for this combination"}</div>
          <p className="mt-1 text-base font-medium">{r.verdict}</p>
          {!r.missingPath && (
            <p className="mt-1 text-sm text-muted">
              Time to strangers connecting: <b className="text-fg">{fmtDays(r.totalMin)}</b> to <b className="text-fg">{fmtDays(r.totalMax)}</b>
              {r.unknownWait && <b className="text-accent"> plus a provider review with no documented duration</b>}
              {r.gates.length > 0 && <> · triggered by {r.gates.join(", ")}</>}
            </p>
          )}
          {r.savings.map((s) => (
            <p key={s.scope} className="mt-2 rounded bg-panel p-2 text-sm">
              <b>Cheaper way:</b> instead of <span className="font-mono text-xs">{s.scope}</span>, {s.alternative}
            </p>
          ))}
        </div>

        {!r.missingPath && (
          <div className="rounded-lg border border-line bg-panel p-4">
            <div className="mb-2 flex justify-between text-xs text-muted">
              <span>Critical path (bars show the longest case)</span>
              <span>0 to {fmtDays(r.totalMax)}</span>
            </div>
            <ol className="space-y-1.5">
              {r.schedule.map((n) => {
                const left = (n.startMax / scale) * 100;
                const width = Math.max(((n.finishMax - n.startMax) / scale) * 100, n.wait_unknown ? 12 : 1.5);
                const wait = n.actor === "provider_wait";
                return (
                  <li key={n.id} className="grid grid-cols-[170px_1fr] items-center gap-3 text-xs">
                    <span className={`truncate ${n.critical ? "font-medium" : "text-muted"}`} title={n.title}>
                      {n.title}
                    </span>
                    <span className="relative block h-4 rounded bg-stone-100">
                      {n.wait_unknown && <span className="absolute right-1 top-0 text-[11px] font-bold leading-4 text-accent">? duration unknown</span>}
                      <span
                        className={`absolute top-0 h-4 rounded ${wait ? "bg-[repeating-linear-gradient(45deg,#c2410c,#c2410c_4px,#e2a07a_4px,#e2a07a_8px)]" : n.actor === "agent" ? "bg-emerald-600" : "bg-stone-700"} ${n.critical ? "" : "opacity-60"}`}
                        style={{ left: `${left}%`, width: `${width}%` }}
                        title={`${n.actor}${n.wait_days_max ? `, wait ${n.wait_days_min}-${n.wait_days_max}d` : ""}`}
                      />
                    </span>
                  </li>
                );
              })}
            </ol>
            <div className="mt-3 flex gap-4 text-[11px] text-muted">
              <span><i className="mr-1 inline-block h-2 w-3 rounded bg-stone-700" />you</span>
              <span><i className="mr-1 inline-block h-2 w-3 rounded bg-emerald-600" />agent can do</span>
              <span><i className="mr-1 inline-block h-2 w-3 rounded bg-accent" />provider owns the clock</span>
              <span>bold = critical path</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
