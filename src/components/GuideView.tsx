import Link from "next/link";
import type { Claim, Guide } from "@/lib/schema";
import { STATUS_STYLE } from "@/lib/status";
import { metaFor, approvalText, fmtMinutes } from "@/lib/present";
import { ClaimChips, type ClaimBundle } from "./ClaimChips";
import { CliffCalculator } from "./CliffCalculator";
import { Artifacts } from "./Artifacts";
import { ReverifyButton } from "./ReverifyButton";
import { Journey } from "./Journey";
import { CopyLink } from "./CopyLink";
import { AppLogo } from "./AppLogo";
import { Pip, PipBadge } from "./brand/Mascot";
import { Annotation, HandArrow, Sparkle } from "./brand/Doodles";

function Panel({ id, tone = "bg-white", title, kicker, children, aside }: { id?: string; tone?: string; title: string; kicker?: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section id={id} className={`relative scroll-mt-24 rounded-[36px] ${tone} p-6 sm:p-8`}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{title}</h2>
          {kicker && <p className="mt-1 max-w-2xl text-[15px] text-ink/65">{kicker}</p>}
        </div>
        {aside}
      </div>
      {children}
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
  const meta = metaFor(guide);
  const mine = guide.steps.filter((s) => s.actor === "developer").length;
  const pips = guide.steps.filter((s) => s.actor === "agent").length;
  const bob = guide.build_or_borrow;

  return (
    <article className="space-y-8">
      {/* HEADER */}
      <header className={`relative overflow-hidden rounded-[44px] bg-gradient-to-b ${meta.header} to-cream px-6 pb-8 pt-10 sm:px-10`}>
        <span className="absolute right-6 top-6 hidden md:block">
          <PipBadge mood={fallback ? "oops" : meta.mood} size={104} ring={meta.ring} />
        </span>
        <span className="absolute right-[150px] top-10 hidden items-center gap-1 lg:flex">
          <Annotation className="-rotate-3">{fallback ? "hmm, not much to go on" : meta.mood === "celebrate" ? "this one's easy!" : meta.mood === "oops" ? "brace yourself" : "doable, with a plan"}</Annotation>
          <HandArrow variant="right" width={56} />
        </span>
        <span className="absolute left-[46%] top-6 hidden md:block">
          <Sparkle />
        </span>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <AppLogo name={guide.app.name} homepage={guide.app.homepage} size={88} />
          <div className="md:pr-56">
            <p className="font-hand text-2xl text-ink/60">OAuth setup guide for</p>
            <h1 className="font-display text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-7xl">{guide.app.name}</h1>
          </div>
        </div>
        <p className="mt-4 max-w-3xl text-[16px] text-ink/75">{guide.summary}</p>

        {/* the three numbers people came for */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[26px] bg-white p-4 shadow-soft">
            <div className="text-xs font-bold uppercase tracking-wide text-muted">Setup difficulty</div>
            <div className="mt-1 flex items-center gap-2">
              <span className={`rounded-full px-3 py-1 font-display text-lg font-bold ${meta.chip}`}>{meta.label}</span>
              {!fallback && guide.has_oauth && guide.difficulty.level !== "unknown" && <span className="font-display text-lg font-bold text-ink/50">{guide.difficulty.score}/10</span>}
            </div>
            <div className="mt-1 text-xs text-muted">{fallback ? "Not enough verified facts to score" : !guide.has_oauth ? "No provider review to pass: there is no OAuth app to register" : "Computed from the facts below, not guessed"}</div>
          </div>
          <div className="rounded-[26px] bg-white p-4 shadow-soft">
            <div className="text-xs font-bold uppercase tracking-wide text-muted">Your hands-on effort</div>
            <div className="font-display mt-1 text-3xl font-extrabold">{fallback ? "Unknown" : fmtMinutes(guide.time.hands_on_minutes)}</div>
            <div className="text-xs text-muted">Your own steps only. Pip&apos;s steps are extra.</div>
          </div>
          <div className="rounded-[26px] bg-white p-4 shadow-soft">
            <div className="text-xs font-bold uppercase tracking-wide text-muted">Approval wait</div>
            <div className="font-display mt-1 text-2xl font-extrabold leading-tight">{fallback ? "Unknown" : !guide.has_oauth ? "None" : approvalText(guide.time)}</div>
            <div className="text-xs text-muted">{!guide.has_oauth && !fallback ? "No OAuth app, so nothing to approve" : guide.time.unapproved_usable ? "You can start before approval, with limits" : "Not usable before approval"}</div>
            {!fallback && guide.time.claim_ids.length > 0 && <div className="mt-1 text-xs text-muted">sources {chips(guide.time.claim_ids)}</div>}
          </div>
        </div>

        {/* trust strip */}
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-[22px] bg-white/70 p-3 text-sm">
          <span className="font-display mr-1 text-base font-bold">{claims.length} claims</span>
          {(["tested", "primary", "secondary", "inferred", "unverified"] as const).map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[13px]" title={STATUS_STYLE[s].text}>
              <i className={`inline-block h-2.5 w-2.5 rounded-full ${STATUS_STYLE[s].dot}`} />
              {count(s)} {STATUS_STYLE[s].label.toLowerCase()}
            </span>
          ))}
          <span className="ml-auto flex flex-wrap items-center gap-2">
            <ReverifyButton versionId={versionId} />
            <CopyLink path={`/guides/${versionId}`} />
            <Link href={`/generate?q=${encodeURIComponent(guide.app.slug)}&force=1`} className="btn-ghost !py-1.5 !text-sm" title="Runs the full live investigation again (about $0.50)">
              ▶ Watch Pip investigate it live
            </Link>
          </span>
          <span className="w-full text-xs text-muted">
            Version from {createdAt.slice(0, 10)} ·{" "}
            {latest ? (
              "latest"
            ) : (
              <Link href={`/apps/${guide.app.slug}`} className="underline">
                see latest
              </Link>
            )}{" "}
            · <a className="underline" href={`/api/guides/${versionId}`}>raw JSON for agents</a>
            {guide.provenance.corrections.length > 0 && <> · the verifier changed {guide.provenance.corrections.length} claim(s) after re-reading sources</>}
          </span>
        </div>
        <span className="mt-2 hidden items-center gap-1 pl-3 md:flex">
          <HandArrow variant="right" width={46} className="-scale-y-100" />
          <Annotation className="text-[22px]">every dot is clickable: it opens the exact quote and where we found it</Annotation>
        </span>
      </header>

      {fallback && (
        <div className="flex items-center gap-4 rounded-[30px] bg-coral-soft p-5">
          <Pip mood="oops" size={80} />
          <p className="text-[15px]">
            <b className="font-display text-lg">Not a verified guide.</b> Pip couldn&apos;t find enough reliable sources for this app, so the steps below are a generic OAuth 2.0 checklist and the
            time, approval and difficulty are unknown rather than zero. Check the provider&apos;s own docs before relying on anything here.
          </p>
        </div>
      )}

      {/* quick jump */}
      <nav className="flex flex-wrap gap-2 text-sm font-semibold">
        {[
          ["#borrow", "Do you need your own app?"],
          ["#cliff", "Where's the cliff?"],
          ["#journey", "Setup journey"],
          ["#who", "Who does what"],
          ["#paperwork", "Paperwork"],
          ["#stuck", "If you get stuck"],
          ...(guide.has_oauth ? [["#reference", "Technical reference"]] : []),
          ["#evidence", "How we know"],
        ].map(([h, t]) => (
          <a key={h} href={h} className="rounded-full bg-white px-3.5 py-1.5 shadow-soft transition hover:-translate-y-0.5">
            {t}
          </a>
        ))}
      </nav>

      <Panel id="borrow" tone="bg-mint-soft" title="First: do you even need your own app?" kicker="Composio already runs OAuth apps for many toolkits. If yours is one of them, you may not need any of the steps below yet.">
        <div className="rounded-[26px] bg-white p-5 shadow-soft">
          <p className="font-display text-xl font-bold leading-snug sm:text-2xl">{bob.verdict}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <span className={`rounded-full px-3 py-1.5 font-semibold ${bob.composio_managed ? "bg-green text-white" : bob.composio_managed === false ? "bg-butter-soft" : "bg-cream"}`}>
              Composio managed auth: {bob.composio_managed === null ? (guide.composio ? "not in Composio's managed-OAuth directory" : "not checked") : bob.composio_managed ? "available, zero setup" : "no, bring your own app"}
            </span>
            <span className="rounded-full bg-cream px-3 py-1.5 font-semibold">Agent access allowed: {bob.agent_access_allowed}</span>
          </div>
          {guide.auth_alternatives.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-bold uppercase tracking-wide text-muted">Other ways to authenticate</div>
              <ul className="mt-1 space-y-1 text-[15px]">
                {guide.auth_alternatives.map((a) => (
                  <li key={a}>• {a}</li>
                ))}
              </ul>
            </div>
          )}
          {bob.reasons_to_bring_own.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-bold uppercase tracking-wide text-muted">Reasons to bring your own app</div>
              <ul className="mt-1 space-y-1 text-[15px]">
                {bob.reasons_to_bring_own.map((r) => (
                  <li key={r}>• {r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Panel>

      <Panel id="cliff" tone="bg-sky-soft" title="Where's your cliff?" kicker="Approval difficulty depends on what your agent does, who connects and how you ship. Change the answers and watch the timeline move.">
        <CliffCalculator guide={guide} bundles={bundles} />
        {!fallback && (
          <div className="mt-4 rounded-[26px] bg-butter-soft p-5 text-[15px]">
            <p className="font-display text-xl font-extrabold">Before approval, you can still ship to some users</p>
            <ul className="mt-2 space-y-1">
              {guide.cliff.unapproved_mode.limits.map((l) => (
                <li key={l}>• {l}</li>
              ))}
            </ul>
            <p className="mt-2">
              <b>It breaks at:</b> {guide.cliff.unapproved_mode.breaks_at}
              {chips(guide.cliff.unapproved_mode.claim_ids)}
            </p>
          </div>
        )}
        {guide.difficulty.drivers.length > 0 && <p className="mt-3 text-sm text-ink/60">What makes it hard: {guide.difficulty.drivers.join(" · ")}</p>}
      </Panel>

      <Panel id="journey" title="Your setup journey" kicker={`${guide.steps.length} stops. ${pips} Pip can handle, ${mine} only you can do. Open any stop for the details and sources.`}>
        <Journey steps={guide.steps} bundles={bundles} attempts={guide.provenance.attempt_log} />
      </Panel>

      <section id="who" className="grid scroll-mt-24 gap-4 md:grid-cols-2">
        <div className="relative overflow-hidden rounded-[36px] bg-mint-soft p-6 sm:p-8">
          <span className="absolute -right-2 -top-2">
            <Pip mood="happy" size={86} />
          </span>
          <h2 className="font-display max-w-[70%] text-3xl font-extrabold">What an agent can do for you</h2>
          <ul className="mt-3 space-y-2 text-[15px]">
            {(guide.agent_vs_human.agent_can.length ? guide.agent_vs_human.agent_can : ["Nothing established for this provider."]).map((x) => (
              <li key={x} className="rounded-2xl bg-white/80 px-3 py-2">
                {x}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative overflow-hidden rounded-[36px] bg-peach-soft p-6 sm:p-8">
          <span className="font-display absolute right-5 top-5 flex h-16 w-16 items-center justify-center rounded-full bg-white text-xl font-extrabold shadow-soft">you</span>
          <h2 className="font-display max-w-[70%] text-3xl font-extrabold">Where you take over</h2>
          <ul className="mt-3 space-y-2 text-[15px]">
            {(guide.agent_vs_human.human_must.length ? guide.agent_vs_human.human_must : ["Nothing established for this provider."]).map((x) => (
              <li key={x} className="rounded-2xl bg-white/80 px-3 py-2">
                {x}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Panel id="paperwork" tone="bg-butter-soft" title="Paperwork, drafted for you" kicker="Reviewers want specific documents. Pip drafts them from this guide's own sources. Review before you submit anything.">
        <Artifacts versionId={versionId} items={guide.artifacts} scopes={guide.cliff.scope_tiers.map((t) => t.scope)} />
      </Panel>

      {guide.prerequisites.length > 0 && (
        <Panel title="Before you start" kicker="Have these ready and the console takes minutes instead of an afternoon.">
          <ul className="grid gap-2 sm:grid-cols-2">
            {guide.prerequisites.map((p) => (
              <li key={p.text} className="flex gap-3 rounded-2xl bg-cream p-3 text-[15px]">
                <input type="checkbox" className="mt-1 h-4 w-4 accent-[#2fbf71]" aria-label={p.text} />
                <span>
                  {p.text}
                  {chips(p.claim_ids)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel id="stuck" tone="bg-coral-soft" title="If you get stuck" kicker="The usual blockers, and what to do about each.">
        {guide.blockers.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl bg-white p-4">
            <Pip mood="sleepy" size={56} />
            <p className="text-[15px] text-ink/70">The sources didn&apos;t document any blockers. We&apos;d rather say that than invent some.</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {guide.blockers.map((b) => (
              <div key={b.text} className="rounded-[24px] bg-white p-4 shadow-soft">
                <div className="flex items-start gap-2">
                  <span className={`mt-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${b.severity === "high" ? "bg-coral text-white" : b.severity === "med" ? "bg-butter" : "bg-cream"}`}>{b.severity}</span>
                  <p className="font-semibold">
                    {b.text}
                    {chips(b.claim_ids)}
                  </p>
                </div>
                <p className="mt-2 rounded-xl bg-mint-soft px-3 py-2 text-[15px]">
                  <b>Do this:</b> {b.workaround}
                </p>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel tone="bg-lilac-soft" title={`Heads up: true of ${guide.app.name} specifically`}>
        {guide.app_specific_gotchas.length === 0 ? (
          <p className="text-[15px] text-ink/70">The sources didn&apos;t support any app-specific surprises. We&apos;d rather say that than pad this list.</p>
        ) : (
          <ul className="space-y-2">
            {guide.app_specific_gotchas.map((g) => (
              <li key={g.text} className="flex gap-3 rounded-2xl bg-white px-4 py-3 text-[15px]">
                <span className="font-display text-xl font-extrabold text-[#8a72e8]">!</span>
                <span>
                  {g.text}
                  {chips(g.claim_ids)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {guide.has_oauth && (
      <Panel id="reference" title="Technical reference" kicker="The exact values, for when you're in the console.">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          {[
            ["Flow", guide.oauth.flow],
            ["PKCE", guide.oauth.pkce],
            ["Authorize URL", guide.oauth.authorize_url ?? "not established"],
            ["Token URL", guide.oauth.token_url ?? "not established"],
            ["Refresh tokens", guide.oauth.refresh_tokens],
            ["Token lifetime", guide.oauth.token_lifetime ?? "not established"],
          ].map(([k, v]) => (
            <div key={k} className="flex gap-3 rounded-2xl bg-cream px-4 py-3">
              <dt className="w-32 shrink-0 font-semibold text-muted">{k}</dt>
              <dd className="break-all font-mono text-[13px]">{v}</dd>
            </div>
          ))}
        </dl>
        {guide.oauth.redirect_uri_rules.length > 0 && (
          <div className="mt-3 rounded-2xl bg-cream px-4 py-3 text-[15px]">
            <div className="text-xs font-bold uppercase tracking-wide text-muted">Redirect URI rules</div>
            <ul className="mt-1 space-y-1">
              {guide.oauth.redirect_uri_rules.map((r) => (
                <li key={r}>• {r}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-2 text-xs text-muted">Sources: {chips(guide.oauth.claim_ids)}</div>
        {guide.composio && (
          <div className="mt-4 flex gap-3 rounded-[24px] bg-navy p-5 text-[15px] text-white">
            <span className="shrink-0">
              <Pip mood="happy" size={56} />
            </span>
            <p>
              <b className="font-display text-lg">Last step, in Composio:</b> create an auth config for toolkit{" "}
              <code className="rounded bg-white/15 px-1.5 font-mono text-[13px]">{guide.composio.toolkit_slug ?? "your toolkit"}</code> and paste in{" "}
              {guide.composio.auth_config_fields.length ? guide.composio.auth_config_fields.join(", ") : "the client ID, client secret and scopes"}. Copy the redirect URI Composio shows you into the
              provider console exactly as displayed. Composio&apos;s docs list more than one callback path, so don&apos;t type it from memory.
            </p>
          </div>
        )}
      </Panel>
      )}

      <Panel id="evidence" tone="bg-white" title="How we know" kicker="What the model believed before researching, what the sources actually said, and everything we corrected or couldn't confirm.">
        {guide.provenance.belief_diff.length === 0 ? (
          <p className="text-[15px] text-muted">No before-and-after comparison was recorded for this guide.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {guide.provenance.belief_diff.map((d, i) => (
              <div key={i} className={`rounded-[24px] p-4 ${d.verdict === "corrected" ? "bg-coral-soft" : d.verdict === "confirmed" ? "bg-mint-soft" : d.verdict === "refined" ? "bg-butter-soft" : "bg-cream"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-muted">{d.topic}</span>
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold">{d.verdict.replace("_", " ")}</span>
                </div>
                <p className="mt-2 text-[14px]">
                  <span className="font-hand text-xl text-ink/60">model guessed:</span> <span className="text-ink/70">{d.prior_belief}</span>
                </p>
                <p className="mt-1 text-[14px]">
                  <span className="font-hand text-xl text-ink/60">sources say:</span> {d.finding}
                  {chips(d.claim_ids)}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-[24px] bg-cream p-4">
            <h3 className="font-display text-xl font-extrabold">What we corrected</h3>
            {guide.provenance.corrections.length === 0 ? (
              <p className="text-sm text-muted">Re-reading the cited pages changed nothing.</p>
            ) : (
              <ul className="mt-1 space-y-1.5 text-sm">
                {guide.provenance.corrections.map((c, i) => (
                  <li key={i}>
                    {bundles[c.claim_id]?.claim.text ?? c.claim_id}{" "}
                    <span className="text-muted">
                      ({c.from} to {c.to}: {c.reason})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-[24px] bg-cream p-4">
            <h3 className="font-display text-xl font-extrabold">What we couldn&apos;t verify</h3>
            {guide.provenance.uncertain.length === 0 ? (
              <p className="text-sm text-muted">Nothing flagged.</p>
            ) : (
              <ul className="mt-1 space-y-1.5 text-sm text-ink/75">
                {guide.provenance.uncertain.map((u) => (
                  <li key={u}>• {u}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {guide.provenance.attempt_log.length > 0 && (
          <div className="mt-4 rounded-[24px] bg-navy p-4 text-white">
            <h3 className="font-display flex items-center gap-2 text-xl font-extrabold">
              <Pip mood="search" size={40} /> What Pip tried
            </h3>
            <ul className="mt-2 space-y-1 font-mono text-[12px] text-white/85">
              {guide.provenance.attempt_log.map((a) => (
                <li key={a.id}>
                  <span className="rounded bg-white/15 px-1.5">{a.outcome}</span> {a.action} <span className="text-white/55">{a.observed.slice(0, 160)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>
    </article>
  );
}
