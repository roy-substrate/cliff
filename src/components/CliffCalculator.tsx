"use client";

import { useMemo, useState } from "react";
import type { Distribution, Guide } from "@/lib/schema";
import { computeCliff, fmtDays, TIER_LABEL, TIER_RANK, type UserBucket } from "@/lib/cliff";
import { ClaimChips, type ClaimBundle } from "./ClaimChips";
import { Pip } from "./brand/Mascot";

const DIST_LABEL: Record<Distribution, string> = {
  internal: "Just my team or test accounts",
  unlisted_public: "Anyone, via an install link",
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
    return (
      <div className="flex items-center gap-3 rounded-[26px] bg-white p-5">
        <Pip mood="think" size={64} />
        <p className="text-[15px] text-ink/70">The sources didn&apos;t establish scope tiers or approval paths for this provider, so there&apos;s nothing honest to calculate.</p>
      </div>
    );

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <div className="space-y-5 rounded-[26px] bg-white p-5 shadow-soft">
        <fieldset>
          <legend className="font-display mb-2 text-lg font-extrabold">1. What must your agent do?</legend>
          <div className="space-y-1.5">
            {tiers.map((t) => {
              const on = scopes.includes(t.scope);
              return (
                <label key={t.scope} className={`flex cursor-pointer items-start gap-2 rounded-2xl px-3 py-2 text-sm transition ${on ? "bg-sky-soft" : "hover:bg-cream"}`}>
                  <input type="checkbox" className="mt-1 h-4 w-4 accent-[#4aa8e8]" checked={on} onChange={() => toggle(t.scope)} />
                  <span>
                    <span className="font-semibold">{t.action_label}</span>
                    <span className="ml-1 font-mono text-[11px] text-muted">{t.scope}</span>
                    <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${TIER_RANK[t.tier] >= 3 ? "bg-coral-soft text-[#c2410c]" : "bg-mint-soft text-[#13804a]"}`}>{TIER_LABEL[t.tier]}</span>
                    <ClaimChips bundles={t.claim_ids.map((id) => bundles[id]).filter(Boolean)} />
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <fieldset>
          <legend className="font-display mb-2 text-lg font-extrabold">2. Who will connect?</legend>
          <div className="space-y-1.5">
            {dists.map((d) => (
              <label key={d} className={`flex cursor-pointer items-center gap-2 rounded-2xl px-3 py-2 text-sm transition ${distribution === d ? "bg-sky-soft font-semibold" : "hover:bg-cream"}`}>
                <input type="radio" name="dist" className="accent-[#4aa8e8]" checked={distribution === d} onChange={() => setDistribution(d)} />
                {DIST_LABEL[d]}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="font-display mb-2 text-lg font-extrabold">3. Roughly how many users?</legend>
          <div className="flex gap-1.5">
            {(Object.keys(USER_LABEL) as UserBucket[]).map((u) => (
              <button key={u} onClick={() => setUsers(u)} className={`flex-1 rounded-full px-2 py-2 text-xs font-bold transition ${users === u ? "bg-ink text-white" : "bg-cream hover:bg-sky-soft"}`}>
                {USER_LABEL[u]}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="space-y-4">
        <div className={`relative overflow-hidden rounded-[26px] p-5 shadow-soft transition ${r.tripped ? "bg-coral-soft" : "bg-mint-soft"}`}>
          <span className="absolute -right-1 -top-1">
            <Pip mood={r.tripped ? "oops" : "celebrate"} size={78} />
          </span>
          <div className="font-hand text-2xl text-ink/70">{r.tripped ? "uh oh, that's over the cliff" : "no cliff here, nice"}</div>
          {(() => {
            // headline the first sentence; keep the rest readable body text
            const i = r.verdict.search(/[.!?]\s/);
            const head = i > 0 ? r.verdict.slice(0, i + 1) : r.verdict;
            const rest = i > 0 ? r.verdict.slice(i + 2) : "";
            return (
              <>
                <p className="font-display max-w-[82%] text-xl font-extrabold leading-snug">{head}</p>
                {rest && <p className="mt-1 max-w-[90%] text-[15px] text-ink/75">{rest}</p>}
              </>
            );
          })()}
          {!r.missingPath && (
            <p className="mt-2 text-[15px] text-ink/70">
              Time until strangers can connect: <b className="font-display text-lg text-ink">{fmtDays(r.totalMin)}</b> to <b className="font-display text-lg text-ink">{fmtDays(r.totalMax)}</b>
              {r.unknownWait && <b className="text-[#c2410c]"> plus a provider review with no documented length</b>}
              {r.gates.length > 0 && <> · triggered by {r.gates.join(", ")}</>}
            </p>
          )}
          {r.savings.map((s) => (
            <p key={s.scope} className="mt-3 rounded-2xl bg-white p-3 text-sm">
              <b>Cheaper path:</b> instead of <code className="tech">{s.scope}</code>, {s.alternative}
            </p>
          ))}
        </div>

        {!r.missingPath && (
          <div className="rounded-[26px] bg-white p-5 shadow-soft">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="font-display text-lg font-extrabold">Your critical path</span>
              <span className="text-xs text-muted">longest case · 0 to {fmtDays(r.totalMax)}</span>
            </div>
            <ol className="space-y-2">
              {r.schedule.map((n) => {
                const left = (n.startMax / scale) * 100;
                const width = Math.max(((n.finishMax - n.startMax) / scale) * 100, n.wait_unknown ? 14 : 2);
                const wait = n.actor === "provider_wait";
                return (
                  <li key={n.id} className="grid grid-cols-[minmax(120px,190px)_1fr] items-center gap-3 text-xs">
                    <span className={`truncate ${n.critical ? "font-bold text-ink" : "text-muted"}`} title={n.title}>
                      {n.title}
                    </span>
                    <span className="relative block h-5 rounded-full bg-cream">
                      {n.wait_unknown && <span className="font-hand absolute right-2 top-0 text-[15px] font-bold leading-5 text-[#c2410c]">? length unknown</span>}
                      <span
                        className={`absolute top-0 h-5 rounded-full ${
                          wait ? "bg-[repeating-linear-gradient(45deg,#ff6f4f,#ff6f4f_5px,#ffb4a2_5px,#ffb4a2_10px)]" : n.actor === "agent" ? "bg-green" : "bg-ink"
                        } ${n.critical ? "" : "opacity-50"}`}
                        style={{ left: `${left}%`, width: `${width}%` }}
                        title={`${n.actor}${n.wait_days_max ? `, wait ${n.wait_days_min} to ${n.wait_days_max} days` : ""}`}
                      />
                    </span>
                  </li>
                );
              })}
            </ol>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold">
              <span className="rounded-full bg-cream px-2.5 py-1">
                <i className="mr-1 inline-block h-2 w-3 rounded-full bg-ink" />
                you
              </span>
              <span className="rounded-full bg-cream px-2.5 py-1">
                <i className="mr-1 inline-block h-2 w-3 rounded-full bg-green" />
                Pip can do it
              </span>
              <span className="rounded-full bg-cream px-2.5 py-1">
                <i className="mr-1 inline-block h-2 w-3 rounded-full bg-coral" />
                provider owns the clock
              </span>
              <span className="rounded-full bg-cream px-2.5 py-1">bold = critical path</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
