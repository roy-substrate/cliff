"use client";

import { useState } from "react";
import type { Guide } from "@/lib/schema";

type Kind = Guide["artifacts"][number]["kind"];
interface Draft {
  title: string;
  body_md: string;
  placeholders: string[];
}

export function Artifacts({ versionId, items, scopes }: { versionId: string; items: Guide["artifacts"]; scopes: string[] }) {
  const [purpose, setPurpose] = useState("");
  const [busy, setBusy] = useState<Kind | null>(null);
  const [drafts, setDrafts] = useState<Partial<Record<Kind, Draft>>>({});
  const [err, setErr] = useState<string | null>(null);

  async function make(kind: Kind) {
    setBusy(kind);
    setErr(null);
    try {
      const r = await fetch("/api/artifacts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ versionId, kind, scopes, appPurpose: purpose }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "failed");
      setDrafts((d) => ({ ...d, [kind]: j as Draft }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  if (!items.length) return <p className="text-sm text-muted">No draftable documents apply to this provider's process.</p>;
  return (
    <div className="space-y-3">
      <label className="block text-sm">
        <span className="text-muted">What does your agent do? (one sentence, makes the drafts specific)</span>
        <input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Summarises a user's meetings and drafts follow-ups" className="mt-1 w-full rounded border border-line bg-panel px-3 py-2 text-sm" />
      </label>
      <div className="flex flex-wrap gap-2">
        {items.map((a) => (
          <button key={a.kind} onClick={() => make(a.kind)} disabled={busy !== null} className="rounded border border-fg px-3 py-1.5 text-sm hover:bg-fg hover:text-bg disabled:opacity-50">
            {busy === a.kind ? "Drafting..." : a.label}
          </button>
        ))}
      </div>
      {err && <p className="text-sm text-accent">{err}</p>}
      {items.map((a) => {
        const d = drafts[a.kind];
        if (!d) return null;
        return (
          <div key={a.kind} className="rounded-lg border border-line bg-panel p-4">
            <div className="mb-1 flex items-center justify-between">
              <h4 className="font-medium">{d.title}</h4>
              <button onClick={() => navigator.clipboard.writeText(d.body_md)} className="text-xs text-accent underline">
                Copy
              </button>
            </div>
            <pre className="whitespace-pre-wrap text-sm">{d.body_md}</pre>
            {d.placeholders.length > 0 && <p className="mt-2 text-xs text-muted">Fill in: {d.placeholders.join(", ")}</p>}
            <p className="mt-2 text-[11px] text-muted">Template drafted from this guide&apos;s sources. Not legal advice. Review before submitting.</p>
          </div>
        );
      })}
    </div>
  );
}
