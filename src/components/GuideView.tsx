import Link from "next/link";
import type { Claim, Guide } from "@/lib/schema";
import { ClaimChips, type ClaimBundle } from "./ClaimChips";
import { STATUS_STYLE } from "@/lib/status";
import { CliffCalculator } from "./CliffCalculator";
import { Artifacts } from "./Artifacts";
import { ReverifyButton } from "./ReverifyButton";
import { fmtDays } from "@/lib/cliff";

const LEVEL: Record<Guide["difficulty"]["level"], string> = {
  instant: "Instant",
  hours: "Hours",
  days: "Days",
  weeks: "Weeks",
  weeks_plus_cost: "Weeks + cost",
  unknown: "Unknown",
};
const ACTOR: Record<string, { label: string; cls: string }> = {
  agent: { label: "Agent can do", cls: "bg-emerald-100 text-emerald-800" },
  developer: { label: "You", cls: "bg-stone-200 text-stone-800" },
  provider_wait: { label: "Provider wait", cls: "bg-accent-soft text-accent" },
};

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {hint && <p className="mb-3 text-sm text-muted">{hint}</p>}
      <div className={hint ? "" : "mt-3"}>{children}</div>
    </section>
  );
}

export function GuideView({ guide, versionId, createdAt, latest }: { guide: Guide; versionId: string; createdAt: string; latest?: boolean }) {
  const { claims, evidence } = guide.provenance;
  const evById = new Map(evidence.map((e) => [e.id, e]));
  const bundles: Record<string, ClaimBundle> = {};
  for (const c of claims) bundles[c.id] = { claim: c, evidence: c.evidence_ids.map((i) => evById.get(i)).filter(Boolean) as ClaimBundle["evidence"] };
  const chips = (ids: string[]) => <ClaimChips bundles={ids.map((i) => bundles[i]).filter(Boolean)} />;

  const count = (s: Claim["status"]) => claims.filter((c) => c.status === s).length;
  const fallback = guide.status === "fallback";
  const needsHuman = guide.steps.filter((s) => s.actor === "developer").length;
  const agentDoable = guide.steps.filter((s) => s.actor === "agent").length;

  return (
    <article>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">OAuth app guide</p>
          <h1 className="text-3xl font-semibold tracking-tight">{guide.app.name}</h1>
          <p className="mt-2 max-w-2xl text-muted">{guide.summary}</p>
        </div>
        <div className="rounded-lg border border-line bg-panel px-4 py-3 text-right">
          <div className="text-xs text-muted">Difficulty</div>
          <div className="text-2xl font-semibold text-accent">{LEVEL[guide.difficulty.level]}</div>
          <div className="text-xs text-muted">{guide.difficulty.level === "unknown" ? "not enough verified facts to score" : `${guide.difficulty.score}/10, computed from the facts below`}</div>
        </div>
      </div>

      {fallback && (
        <div className="mt-5 rounded-lg border border-accent bg-accent-soft p-3 text-sm">
          <b>Not a verified guide.</b> We could not find enough reliable sources for this app, so the steps below are a generic OAuth 2.0 checklist and the time, approval and difficulty fields are unknown rather than zero. Nothing here should be relied on without checking the provider&apos;s own docs.
        </div>
      )}

      {/* Trust strip */}
      <div className="mt-5 rounded-lg border border-line bg-panel p-3 text-sm">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <b>{claims.length} claims</b>
          {(["tested", "primary", "secondary", "inferred", "unverified"] as const).map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <i className={`inline-block h-2.5 w-2.5 rounded-full ${STATUS_STYLE[s].dot}`} />
              {count(s)} {STATUS_STYLE[s].label.toLowerCase()}
            </span>
          ))}
          <span className="ml-auto text-xs text-muted">
            Generated {createdAt.slice(0, 10)} · {latest ? "latest version" : <Link href={`/apps/${guide.app.slug}`} className="underline">see latest</Link>} · <a className="underline" href={`/api/guides/${versionId}`}>raw JSON</a>
          </span>
          <span className="w-full text-right"><ReverifyButton versionId={versionId} /></span>
        </div>
        {guide.provenance.corrections.length > 0 && (
          <p className="mt-2 text-xs text-muted">
            The verifier changed {guide.provenance.corrections.length} claim{guide.provenance.corrections.length > 1 ? "s" : ""} after re-reading the cited pages. See &ldquo;What we corrected&rdquo; below.
          </p>
        )}
      </div>

      {/* Build or borrow */}
      <Section title="First: do you need your own OAuth app?">
        <div className="rounded-lg border border-line bg-panel p-4">
          <p className="text-base font-medium">{guide.build_or_borrow.verdict}</p>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted">Composio managed auth</dt>
              <dd>{guide.build_or_borrow.composio_managed === null ? "Not checked" : guide.build_or_borrow.composio_managed ? "Available (zero setup)" : "No: bring your own app"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Agent / automated access</dt>
              <dd>{guide.build_or_borrow.agent_access_allowed}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Other auth routes</dt>
              <dd>{guide.auth_alternatives.join(", ") || "none found"}</dd>
            </div>
          </dl>
          {guide.build_or_borrow.reasons_to_bring_own.length > 0 && (
            <>
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted">Reasons to bring your own app</p>
              <ul className="mt-1 list-disc pl-5 text-sm">
                {guide.build_or_borrow.reasons_to_bring_own.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      </Section>

      {/* Cliff */}
      <Section title="Where is your cliff?" hint="Approval difficulty depends on the scopes you request, who connects, and how you distribute. Change the inputs.">
        <CliffCalculator guide={guide} bundles={bundles} />
        {!fallback && (
        <div className="mt-4 rounded-lg border border-line bg-panel p-4 text-sm">
          <b>Before approval, you can still ship to some users.</b>
          <ul className="mt-1 list-disc pl-5">
            {guide.cliff.unapproved_mode.limits.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          <p className="mt-2">
            <b>It breaks at:</b> {guide.cliff.unapproved_mode.breaks_at}
            {chips(guide.cliff.unapproved_mode.claim_ids)}
          </p>
        </div>
        )}
      </Section>

      {/* Time */}
      <Section title="Time and effort">
        {fallback ? (
          <p className="text-sm text-muted">Not established. We would rather show nothing than a made-up estimate.</p>
        ) : (
        <>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Your hands-on time to a first token" value={guide.time.hands_on_minutes ? `${Math.round(guide.time.hands_on_minutes / 6) / 10}h` : "Unknown"} />
          <Stat
            label="Provider approval wait"
            value={guide.time.approval_required ? `${guide.time.approval_wait_days_min != null ? fmtDays(guide.time.approval_wait_days_min) : "?"} to ${guide.time.approval_wait_days_max != null ? fmtDays(guide.time.approval_wait_days_max) : "?"}` : "None required"}
            extra={chips(guide.time.claim_ids)}
          />
          <Stat label="Usable before approval" value={guide.time.unapproved_usable ? "Yes, with limits" : "No"} />
        </div>
        <p className="mt-2 text-xs text-muted">Difficulty drivers: {guide.difficulty.drivers.join("; ") || "none stated"}</p>
        </>
        )}
      </Section>

      {/* Steps */}
      <Section title="Steps" hint={`${agentDoable} an agent can do, ${needsHuman} only you can do.`}>
        <ol className="space-y-3">
          {guide.steps.map((s) => (
            <li key={s.n} className="rounded-lg border border-line bg-panel p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted">{s.n}.</span>
                <h3 className="font-medium">{s.title}</h3>
                <span className={`rounded px-1.5 py-0.5 text-[11px] ${ACTOR[s.actor].cls}`}>{ACTOR[s.actor].label}</span>
                <span className="ml-auto text-xs text-muted">~{s.est_minutes} min</span>
                {chips(s.claim_ids)}
              </div>
              <div className="prose-step mt-1 text-sm whitespace-pre-wrap">{s.detail_md}</div>
              {s.attempt_log_ids.map((id) => {
                const a = guide.provenance.attempt_log.find((x) => x.id === id);
                return a ? (
                  <div key={id} className="mt-2 rounded bg-stone-50 p-2 text-xs">
                    <span className="font-medium">What the agent saw ({a.mode}, {a.outcome}):</span> {a.observed}
                    {a.screenshot && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.screenshot} alt={a.action} className="mt-2 max-h-72 rounded border border-line" />
                    )}
                  </div>
                ) : null;
              })}
            </li>
          ))}
        </ol>
      </Section>

      <Section title="What an agent can do, and where you take over">
        <div className="grid gap-4 sm:grid-cols-2">
          <ListCard title="Agent can" items={guide.agent_vs_human.agent_can} tone="bg-emerald-50" />
          <ListCard title="You must" items={guide.agent_vs_human.human_must} tone="bg-stone-100" />
        </div>
      </Section>

      <Section title="Draft the paperwork" hint="Drafted from this guide's own sources and your inputs. Review before you submit anything.">
        <Artifacts versionId={versionId} items={guide.artifacts} scopes={guide.cliff.scope_tiers.map((t) => t.scope)} />
      </Section>

      {guide.prerequisites.length > 0 && (
        <Section title="Prerequisites">
          <ul className="space-y-1 text-sm">
            {guide.prerequisites.map((p) => (
              <li key={p.text} className="flex gap-2">
                <input type="checkbox" className="mt-1" />
                <span>
                  {p.text}
                  {chips(p.claim_ids)}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="When you hit a blocker">
        {guide.blockers.length === 0 ? (
          <p className="text-sm text-muted">No documented blockers were found in the sources.</p>
        ) : (
          <div className="space-y-2">
            {guide.blockers.map((b) => (
              <div key={b.text} className="rounded-lg border border-line bg-panel p-3 text-sm">
                <div className="font-medium">
                  <span className={`mr-2 rounded px-1.5 py-0.5 text-[11px] ${b.severity === "high" ? "bg-accent-soft text-accent" : "bg-stone-100 text-muted"}`}>{b.severity}</span>
                  {b.text}
                  {chips(b.claim_ids)}
                </div>
                <p className="mt-1 text-muted">Do this: {b.workaround}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title={`Things that are true of ${guide.app.name} specifically`}>
        {guide.app_specific_gotchas.length === 0 ? (
          <p className="text-sm text-muted">The sources did not support any app-specific surprises. We would rather say that than pad this list.</p>
        ) : (
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {guide.app_specific_gotchas.map((g) => (
              <li key={g.text}>
                {g.text}
                {chips(g.claim_ids)}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="OAuth reference">
        <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <Ref k="Flow" v={guide.oauth.flow} />
          <Ref k="PKCE" v={guide.oauth.pkce} />
          <Ref k="Authorize URL" v={guide.oauth.authorize_url ?? "not established"} mono />
          <Ref k="Token URL" v={guide.oauth.token_url ?? "not established"} mono />
          <Ref k="Refresh tokens" v={guide.oauth.refresh_tokens} />
          <Ref k="Token lifetime" v={guide.oauth.token_lifetime ?? "not established"} />
        </dl>
        {guide.oauth.redirect_uri_rules.length > 0 && (
          <ul className="mt-2 list-disc pl-5 text-sm">
            {guide.oauth.redirect_uri_rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
        {chips(guide.oauth.claim_ids)}
        {guide.composio && (
          <p className="mt-3 rounded bg-stone-50 p-3 text-sm">
            <b>Last step in Composio:</b> create an auth config for toolkit <code>{guide.composio.toolkit_slug ?? "your toolkit"}</code> and paste in{" "}
            {guide.composio.auth_config_fields.length ? guide.composio.auth_config_fields.join(", ") : "the client ID, client secret and scopes"}. Copy the redirect URI Composio shows you into the provider console exactly as displayed, because Composio&apos;s docs list more than one callback path.
          </p>
        )}
      </Section>

      <Section title="How we know" hint="What the model believed before researching, compared with what the sources said.">
        {guide.provenance.belief_diff.length === 0 ? (
          <p className="text-sm text-muted">No prior-belief comparison was recorded for this guide.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-line bg-panel">
            {guide.provenance.belief_diff.map((d, i) => (
              <div key={i} className="grid gap-2 border-b border-line p-3 text-sm last:border-b-0 sm:grid-cols-[1fr_1fr_110px]">
                <div>
                  <div className="text-xs text-muted">{d.topic}: model believed</div>
                  {d.prior_belief}
                </div>
                <div>
                  <div className="text-xs text-muted">Sources say</div>
                  {d.finding}
                  {chips(d.claim_ids)}
                </div>
                <div className={`self-start rounded px-2 py-0.5 text-center text-xs ${d.verdict === "corrected" ? "bg-accent-soft text-accent" : d.verdict === "confirmed" ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-muted"}`}>{d.verdict.replace("_", " ")}</div>
              </div>
            ))}
          </div>
        )}

        <h3 className="mt-6 font-medium">What we corrected</h3>
        {guide.provenance.corrections.length === 0 ? (
          <p className="text-sm text-muted">Re-reading the cited pages did not change any claim.</p>
        ) : (
          <ul className="mt-1 space-y-1 text-sm">
            {guide.provenance.corrections.map((c, i) => (
              <li key={i}>
                {bundles[c.claim_id]?.claim.text ?? c.claim_id} <span className="text-muted">({c.from} to {c.to}: {c.reason})</span>
              </li>
            ))}
          </ul>
        )}
        <h3 className="mt-6 font-medium">What we could not verify</h3>
        {guide.provenance.uncertain.length === 0 ? (
          <p className="text-sm text-muted">Nothing flagged.</p>
        ) : (
          <ul className="mt-1 list-disc pl-5 text-sm text-muted">
            {guide.provenance.uncertain.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        )}
        {guide.provenance.attempt_log.length > 0 && (
          <>
            <h3 className="mt-6 font-medium">What the agent tried</h3>
            <ul className="mt-1 space-y-1 font-mono text-xs">
              {guide.provenance.attempt_log.map((a) => (
                <li key={a.id}>
                  [{a.outcome}] {a.action} <span className="text-muted">{a.observed.slice(0, 160)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Section>
    </article>
  );
}

function Stat({ label, value, extra }: { label: string; value: string; extra?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-panel p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="text-lg font-medium">
        {value}
        {extra}
      </div>
    </div>
  );
}
function ListCard({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  return (
    <div className={`rounded-lg p-4 ${tone}`}>
      <h3 className="text-sm font-medium">{title}</h3>
      <ul className="mt-1 list-disc pl-5 text-sm">{items.length ? items.map((i) => <li key={i}>{i}</li>) : <li className="text-muted">Nothing established.</li>}</ul>
    </div>
  );
}
function Ref({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex gap-2">
      <dt className="w-32 shrink-0 text-muted">{k}</dt>
      <dd className={`break-all ${mono ? "font-mono text-xs" : ""}`}>{v}</dd>
    </div>
  );
}
