"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Claim, GenEvent, Stage } from "@/lib/schema";
import { STATUS_STYLE } from "@/lib/status";

const STAGES: { id: Stage; name: string; role: string }[] = [
  { id: "resolve", name: "Scout", role: "Identify the app, check Composio, write down what the model believes" },
  { id: "discover", name: "Librarian", role: "Find the official docs, review policy and limits" },
  { id: "extract", name: "Extractors x3", role: "Pull claims with verbatim quotes: mechanics, approval, console" },
  { id: "probe", name: "Prober", role: "Hit public endpoints without logging in" },
  { id: "verify", name: "Verifier", role: "Re-fetch every cited page, check each quote, drop what fails" },
  { id: "synthesize", name: "Writer", role: "Write the guide from verified claims only" },
];

/** Provider/API errors arrive as raw JSON; show the human part. */
function friendly(msg: string): string {
  const m = msg.match(/"message":"([^"]+)"/);
  return (m ? m[1] : msg).slice(0, 200);
}

type StageState = { status: "idle" | "started" | "done" | "failed" | "skipped"; ms?: number; note?: string };
type Trace = { id: number; text: string; tone?: "ok" | "bad" | "warn" };

export function Theater({ q, force }: { q: string; force?: boolean }) {
  const router = useRouter();
  const [plan, setPlan] = useState<string[]>([]);
  const [stages, setStages] = useState<Record<string, StageState>>({});
  const [trace, setTrace] = useState<Trace[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [priors, setPriors] = useState<{ topic: string; belief: string }[]>([]);
  const [fixes, setFixes] = useState<{ claimId: string; from: string; to: string; reason: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ versionId: string; cost: number; cached: boolean } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const started = useRef(false);
  const tid = useRef(0);

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
    const add = (text: string, tone?: Trace["tone"]) => setTrace((t) => [...t.slice(-60), { id: tid.current++, text, tone }]);

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
            case "plan": setPlan(e.items); break;
            case "stage": setStages((s) => ({ ...s, [e.stage]: { status: e.status, ms: e.ms, note: e.note ? friendly(e.note) : e.note } })); break;
            case "search": add(`searched "${e.query}" (${e.hits.length} results)`); break;
            case "fetch": add(`${e.ok ? "read" : "could not read"} ${e.url}`, e.ok ? "ok" : "bad"); break;
            case "probe": add(`probe ${e.outcome}: ${e.url}`, e.outcome === "ok" ? "ok" : "warn"); break;
            case "claim": setClaims((c) => [...c, e.claim]); break;
            case "prior": setPriors((p) => [...p, { topic: e.topic, belief: e.belief }]); break;
            case "verify": setFixes((f) => [...f, { claimId: e.claimId, from: e.from, to: e.to, reason: e.reason }]); break;
            case "error": add(`${e.stage}: ${friendly(e.message)}`, "bad"); if (!e.recoverable) setError(friendly(e.message)); break;
            case "cached": setDone({ versionId: e.guideId, cost: 0, cached: true }); break;
            case "done": setDone({ versionId: e.versionId, cost: e.cost_usd, cached: false }); break;
          }
        }
      }
    })().catch((e) => setError(String(e)));
  }, [q, force]);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => router.push(`/guides/${done.versionId}`), 1800);
    return () => clearTimeout(t);
  }, [done, router]);

  const mark = (s?: StageState) => (s?.status === "done" ? "bg-emerald-600" : s?.status === "started" ? "bg-accent animate-pulse" : s?.status === "failed" ? "bg-red-500" : s?.status === "skipped" ? "bg-stone-400" : "bg-stone-200");

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Investigating &ldquo;{q}&rdquo;</h1>
        <span className="font-mono text-sm text-muted">{elapsed}s</span>
      </div>
      {error && <p className="mt-3 rounded border border-accent bg-accent-soft p-3 text-sm">{error}</p>}
      {done && (
        <p className="mt-3 rounded border border-emerald-600 bg-emerald-50 p-3 text-sm">
          {done.cached ? "Found a recent guide, opening it." : `Guide ready (cost $${done.cost.toFixed(2)}). Opening it.`}{" "}
          <button className="underline" onClick={() => router.push(`/guides/${done.versionId}`)}>Open now</button>
        </p>
      )}

      {plan.length > 0 && (
        <details className="mt-4 text-sm" open>
          <summary className="font-medium text-muted">Plan</summary>
          <ol className="mt-1 list-decimal pl-5 text-muted">{plan.map((p) => <li key={p}>{p}</li>)}</ol>
        </details>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-4">
          <ol className="space-y-2">
            {STAGES.map((s) => {
              const st = stages[s.id];
              return (
                <li key={s.id} className="flex items-start gap-3 rounded-lg border border-line bg-panel p-3">
                  <span className={`mt-1.5 h-2.5 w-2.5 rounded-full ${mark(st)}`} />
                  <div className="text-sm">
                    <div className="font-medium">{s.name}{st?.ms ? <span className="ml-2 font-normal text-muted">{(st.ms / 1000).toFixed(1)}s</span> : null}</div>
                    <div className="text-muted">{st?.note ?? s.role}</div>
                  </div>
                </li>
              );
            })}
          </ol>
          {priors.length > 0 && (
            <div className="rounded-lg border border-line bg-panel p-3 text-sm">
              <div className="mb-1 font-medium">What the model believed before researching</div>
              <ul className="list-disc pl-5 text-muted">{priors.map((p) => <li key={p.topic}>{p.belief}</li>)}</ul>
              <p className="mt-1 text-xs text-muted">These get diffed against the sources at the end.</p>
            </div>
          )}
          <div className="max-h-56 overflow-auto rounded-lg border border-line bg-panel p-3 font-mono text-[11px] leading-5">
            {trace.length === 0 && <span className="text-muted">Waiting for the first tool call...</span>}
            {trace.map((t) => (
              <div key={t.id} className={t.tone === "bad" ? "text-red-700" : t.tone === "warn" ? "text-amber-700" : t.tone === "ok" ? "text-emerald-700" : "text-muted"}>{t.text}</div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-line bg-panel p-3">
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-medium">Evidence ledger</span>
            <span className="text-muted">{claims.length} claims</span>
          </div>
          <ul className="max-h-[34rem] space-y-1.5 overflow-auto text-sm">
            {claims.map((c) => {
              const fix = fixes.find((f) => f.claimId === c.id);
              return (
                <li key={c.id} className="flex gap-2">
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_STYLE[fix ? (fix.to as Claim["status"]) : c.status].dot}`} />
                  <span>
                    {c.text}
                    {fix && <span className="block text-xs text-accent">Verifier: {fix.from} to {fix.to}, {fix.reason}</span>}
                  </span>
                </li>
              );
            })}
            {claims.length === 0 && <li className="text-muted">Claims appear here as the extractors finish, each with its quote.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
