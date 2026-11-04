"use client";

import { useState } from "react";
import type { Guide } from "@/lib/schema";
import { Pip } from "./brand/Mascot";

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
  const [copied, setCopied] = useState<Kind | null>(null);

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

  if (!items.length)
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-white p-4">
        <Pip mood="sleepy" size={56} />
        <p className="text-[15px] text-ink/70">This provider&apos;s process doesn&apos;t call for any documents Pip can draft.</p>
      </div>
    );
  return (
    <div className="space-y-4">
      <label className="block">
        <span className="font-display text-lg font-bold">What does your agent do?</span>
        <span className="block text-sm text-muted">One sentence makes the drafts specific to you.</span>
        <input
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="e.g. Summarises a user's meetings and drafts follow-ups"
          className="mt-2 w-full rounded-full border-2 border-white bg-white px-5 py-3 outline-none transition focus:border-[#f2b80f]"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        {items.map((a) => (
          <button key={a.kind} onClick={() => make(a.kind)} disabled={busy !== null} className="btn-ink !py-2 !text-base disabled:opacity-60">
            {busy === a.kind ? "Pip is drafting..." : `✎ ${a.label}`}
          </button>
        ))}
      </div>
      {err && (
        <div className="flex items-center gap-3 rounded-2xl bg-coral-soft p-3 text-sm">
          <Pip mood="oops" size={44} />
          {err}
        </div>
      )}
      {items.map((a) => {
        const d = drafts[a.kind];
        if (!d) return null;
        return (
          <div key={a.kind} className="animate-pop rounded-[26px] bg-white p-5 shadow-soft">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h4 className="font-display text-xl font-extrabold">{d.title}</h4>
              <button
                onClick={() => (navigator.clipboard.writeText(d.body_md), setCopied(a.kind), setTimeout(() => setCopied(null), 1500))}
                className="btn-ghost !py-1 !text-sm"
              >
                {copied === a.kind ? "Copied ✓" : "Copy"}
              </button>
            </div>
            <pre className="whitespace-pre-wrap font-sans text-[15px] leading-relaxed">{d.body_md}</pre>
            {d.placeholders.length > 0 && <p className="mt-3 rounded-xl bg-butter-soft px-3 py-2 text-sm">Fill in: {d.placeholders.join(", ")}</p>}
            <p className="mt-2 text-xs text-muted">Template drafted from this guide&apos;s sources. Not legal advice. Review before submitting.</p>
          </div>
        );
      })}
    </div>
  );
}
