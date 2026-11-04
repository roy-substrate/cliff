"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Claim, GenEvent, Stage } from "@/lib/schema";
import { STATUS_STYLE } from "@/lib/status";
import { Pip, type PipMood } from "./brand/Mascot";
import { Annotation, Sparkle } from "./brand/Doodles";

/** Stages in the order they really run. Labels are what the user sees; nothing here is simulated. */
const STAGES: { id: Stage; name: string; doing: string }[] = [
  { id: "resolve", name: "Identify", doing: "Figuring out exactly which app this is..." },
  { id: "discover", name: "Find docs", doing: "Looking for developer documentation..." },
  { id: "extract", name: "Read & quote", doing: "Reading the docs and copying exact quotes..." },
  { id: "probe", name: "Probe", doing: "Knocking on the public OAuth endpoints..." },
  { id: "verify", name: "Double-check", doing: "Re-reading every source to check each quote..." },
  { id: "synthesize", name: "Write guide", doing: "Putting your guide together..." },
];

/** First time a claim on one of these topics arrives, Pip celebrates it. Triggered only by real claims. */
const MILESTONES: Partial<Record<Claim["topic"], string>> = {
  review: "Found the approval requirements!",
  endpoint: "Found the OAuth endpoints!",
  scope: "Found the permission scopes!",
  limit: "Found the limits for unapproved apps!",
  cost: "Found what it costs!",
};

type StageState = { status: "idle" | "started" | "done" | "failed" | "skipped"; ms?: number; note?: string };
type Activity = { id: number; text: string; tone: "info" | "good" | "warn" | "bad" | "star"; url?: string };

function friendly(msg: string): string {
  const m = msg.match(/"message":"([^"]+)"/);
  return (m ? m[1] : msg).slice(0, 200);
}
function shortUrl(u: string): string {
  try {
    const x = new URL(u);
    return (x.hostname.replace(/^www\./, "") + x.pathname).replace(/\/$/, "").slice(0, 70);
  } catch {
    return u.slice(0, 70);
  }
}

export function Theater({ q, force }: { q: string; force?: boolean }) {
  const router = useRouter();
  const [stages, setStages] = useState<Record<string, StageState>>({});
  const [activity, setActivity] = useState<Activity[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [priors, setPriors] = useState<{ topic: string; belief: string }[]>([]);
  const [fixes, setFixes] = useState<Record<string, { to: string; reason: string }>>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ versionId: string; cost: number; cached: boolean } | null>(null);
  const [fallback, setFallback] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const started = useRef(false);
  const aid = useRef(0);
  const seenTopics = useRef(new Set<string>());

  const finished = done !== null || error !== null;
  useEffect(() => {
    if (finished) return;
    const t0 = Date.now();
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 500);
    return () => clearInterval(timer);
  }, [finished]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const add = (text: string, tone: Activity["tone"] = "info", url?: string) => setActivity((a) => [{ id: aid.current++, text, tone, url }, ...a].slice(0, 80));

    (async () => {
      const res = await fetch("/api/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ q, force }) });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? `Request failed (${res.status})`);
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done: fin } = await reader.read();
        if (fin) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const p of parts) {
          if (!p.startsWith("data: ")) continue;
          const e = JSON.parse(p.slice(6)) as GenEvent;
          switch (e.type) {
            case "stage":
              setStages((s) => ({ ...s, [e.stage]: { status: e.status, ms: e.ms, note: e.note ? friendly(e.note) : e.note } }));
              if (e.stage === "synthesize" && e.status === "skipped") setFallback(true);
              if (e.status === "failed") add(`${e.stage} hit a snag: ${friendly(e.note ?? "")}`, "warn");
              break;
            case "search":
              add(`Searched “${e.query}” and got ${e.hits.length} results`, "info");
              break;
            case "fetch":
              add(e.ok ? `Read ${shortUrl(e.url)}` : `Couldn't open ${shortUrl(e.url)}`, e.ok ? "good" : "warn", e.url);
              break;
            case "probe":
              add(`Probed ${shortUrl(e.url)}: ${e.outcome === "ok" ? "answered" : e.outcome.replace("_", " ")}`, e.outcome === "ok" ? "good" : "warn", e.url);
              break;
            case "claim":
              setClaims((c) => [...c, e.claim]);
              if (MILESTONES[e.claim.topic] && !seenTopics.current.has(e.claim.topic)) {
                seenTopics.current.add(e.claim.topic);
                add(MILESTONES[e.claim.topic] as string, "star");
              }
              break;
            case "prior":
              setPriors((p) => [...p, { topic: e.topic, belief: e.belief }]);
              break;
            case "verify":
              setFixes((f) => ({ ...f, [e.claimId]: { to: e.to, reason: e.reason } }));
              add(`Caught one: a claim was downgraded to ${e.to} (${e.reason.slice(0, 90)})`, "bad");
              break;
            case "error":
              add(`${e.stage}: ${friendly(e.message)}`, "bad");
              if (!e.recoverable) setError(friendly(e.message));
              break;
            case "cached":
              setDone({ versionId: e.guideId, cost: 0, cached: true });
              break;
            case "done":
              setDone({ versionId: e.versionId, cost: e.cost_usd, cached: false });
              break;
          }
        }
      }
    })().catch((e) => setError(String(e)));
  }, [q, force]);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => router.push(`/guides/${done.versionId}`), 2600);
    return () => clearTimeout(t);
  }, [done, router]);

  const current = STAGES.find((s) => stages[s.id]?.status === "started");
  const mood: PipMood = error ? "oops" : done ? "celebrate" : current?.id === "verify" || current?.id === "synthesize" ? "think" : "search";
  const headline = error
    ? "Pip hit a wall"
    : done
      ? fallback
        ? "Pip couldn't find enough to go on"
        : "Your guide is ready!"
      : current
        ? current.doing
        : "Warming up...";
  const counts = (["tested", "primary", "secondary", "inferred", "unverified"] as const).map((s) => [s, claims.filter((c) => (fixes[c.id]?.to ?? c.status) === s).length] as const);

  return (
    <div className="space-y-6">
      {/* SCENE */}
      <section className="bg-night relative overflow-hidden rounded-[44px] px-6 pb-8 pt-10 text-white sm:px-10">
        {[...Array(14)].map((_, i) => (
          <span key={i} className="absolute rounded-full bg-white/25" style={{ width: 4 + (i % 3) * 3, height: 4 + (i % 3) * 3, left: `${(i * 37) % 97}%`, top: `${(i * 53) % 60}%` }} />
        ))}
        <div className="relative flex flex-col items-center gap-6 md:flex-row md:items-end">
          <div className="relative shrink-0">
            <span className="absolute -inset-4 rounded-full bg-sky-deep/25 blur-xl" />
            <span className={finished ? "" : "animate-bob"}>
              <Pip mood={mood} size={170} />
            </span>
            {done && !fallback && (
              <>
                <span className="absolute -left-4 top-2">
                  <Sparkle size={26} />
                </span>
                <span className="absolute -right-2 top-10">
                  <Sparkle size={18} color="#ff8f75" />
                </span>
              </>
            )}
          </div>
          <div className="flex-1 text-center md:text-left">
            <p className="font-hand text-2xl text-butter">Pip is investigating</p>
            <h1 className="font-display text-5xl font-extrabold leading-none tracking-tight sm:text-6xl">{q}</h1>
            <p key={headline} className="animate-pop font-display mt-3 text-2xl font-bold text-sky">
              {headline}
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm md:justify-start">
              <span className="rounded-full bg-white/10 px-3 py-1 font-mono">{elapsed}s</span>
              <span className="rounded-full bg-white/10 px-3 py-1">{claims.length} facts found</span>
              {done && !done.cached && <span className="rounded-full bg-white/10 px-3 py-1">cost ${done.cost.toFixed(2)}</span>}
              {done?.cached && <span className="rounded-full bg-white/10 px-3 py-1">already in the directory, opening it</span>}
            </div>
          </div>
        </div>

        {/* progress path */}
        <ol className="relative mt-8 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {STAGES.map((s, i) => {
            const st = stages[s.id]?.status ?? "idle";
            const cls =
              st === "done" ? "bg-green text-white" : st === "started" ? "bg-coral text-white animate-pulse-dot" : st === "failed" ? "bg-coral/40 text-white" : st === "skipped" ? "bg-white/20 text-white/60" : "bg-white/10 text-white/50";
            return (
              <li key={s.id} className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold transition ${cls}`}>
                <span className="font-display flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs">{st === "done" ? "✓" : st === "failed" ? "!" : i + 1}</span>
                <span className="truncate">{s.name}</span>
                {stages[s.id]?.ms ? <span className="ml-auto hidden text-[11px] font-normal opacity-80 lg:inline">{(stages[s.id]!.ms! / 1000).toFixed(0)}s</span> : null}
              </li>
            );
          })}
        </ol>
      </section>

      {/* outcome banners */}
      {error && (
        <div className="flex flex-col items-center gap-4 rounded-[30px] bg-coral-soft p-6 sm:flex-row">
          <Pip mood="oops" size={90} />
          <div className="flex-1">
            <p className="font-display text-2xl font-extrabold">Something went wrong</p>
            <p className="text-[15px] text-ink/75">{error}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.location.reload()} className="btn-ink !text-base">
              Try again
            </button>
            <Link href="/apps" className="btn-ghost">
              Browse the directory
            </Link>
          </div>
        </div>
      )}
      {done && (
        <div className={`flex flex-col items-center gap-4 rounded-[30px] p-6 sm:flex-row ${fallback ? "bg-butter-soft" : "bg-mint-soft"}`}>
          <Pip mood={fallback ? "think" : "celebrate"} size={90} />
          <div className="flex-1">
            <p className="font-display text-2xl font-extrabold">{fallback ? "Not enough reliable sources" : "Done! Opening your guide..."}</p>
            <p className="text-[15px] text-ink/75">
              {fallback
                ? "Pip won't make things up, so you'll get an honest checklist with everything marked unverified."
                : "Every fact in it links back to the page it came from."}
            </p>
          </div>
          <button onClick={() => router.push(`/guides/${done.versionId}`)} className="btn-ink !text-base">
            Open it now →
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-6">
          {/* what Pip assumed */}
          {priors.length > 0 && (
            <div className="relative -rotate-[0.6deg] rounded-[26px] bg-butter-soft p-5 shadow-soft">
              <Annotation>what Pip assumed before looking</Annotation>
              <ul className="mt-2 space-y-1.5 text-[14px] text-ink/80">
                {priors.map((p) => (
                  <li key={p.topic}>• {p.belief}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted">Compared with the real sources at the end, so you can see what memory got wrong.</p>
            </div>
          )}

          {/* activity stream */}
          <div className="rounded-[30px] bg-white p-5 shadow-soft">
            <h2 className="font-display text-2xl font-extrabold">What Pip is doing</h2>
            <ol className="mt-3 max-h-[26rem] space-y-2 overflow-auto pr-1">
              {activity.length === 0 && (
                <li className="flex items-center gap-3 text-sm text-muted">
                  <Pip mood="search" size={40} /> Waiting for the first move...
                </li>
              )}
              {activity.map((a) => (
                <li key={a.id} className="animate-pop flex items-start gap-3 text-[14px]">
                  <span
                    className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${
                      a.tone === "good" ? "bg-green" : a.tone === "warn" ? "bg-[#f2b80f]" : a.tone === "bad" ? "bg-coral" : a.tone === "star" ? "bg-[#8a72e8]" : "bg-sky-deep"
                    }`}
                  />
                  <span className={a.tone === "star" ? "font-display text-lg font-extrabold text-[#5b44c2]" : "text-ink/80"}>
                    {a.text}
                    {a.url && (
                      <a href={a.url} target="_blank" rel="noreferrer" className="ml-1 text-sky-deep underline">
                        open
                      </a>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* evidence ledger */}
        <div className="rounded-[30px] bg-white p-5 shadow-soft">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-2xl font-extrabold">Facts found</h2>
            <span className="flex flex-wrap gap-1.5 text-xs">
              {counts.map(([s, n]) => (
                <span key={s} className="inline-flex items-center gap-1 rounded-full bg-cream px-2 py-0.5">
                  <i className={`h-2 w-2 rounded-full ${STATUS_STYLE[s].dot}`} />
                  {n} {STATUS_STYLE[s].label.toLowerCase()}
                </span>
              ))}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">Each fact comes with a quote from its source. Facts that fail the double-check are downgraded right here.</p>
          <ul className="mt-3 max-h-[34rem] space-y-2 overflow-auto pr-1">
            {claims.length === 0 && (
              <li className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted">
                <Pip mood="sleepy" size={70} />
                Facts appear here as Pip reads the docs.
              </li>
            )}
            {claims.map((c) => {
              const fix = fixes[c.id];
              const st = (fix?.to ?? c.status) as Claim["status"];
              return (
                <li key={c.id} className={`animate-pop flex gap-3 rounded-2xl px-3 py-2 text-[14px] ${fix ? "bg-coral-soft" : "bg-cream"}`}>
                  <span className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${STATUS_STYLE[st].dot}`} title={STATUS_STYLE[st].label} />
                  <span>
                    {c.text}
                    {fix && <span className="mt-0.5 block text-xs font-semibold text-[#c2410c]">Double-check: now {fix.to}. {fix.reason.slice(0, 120)}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
