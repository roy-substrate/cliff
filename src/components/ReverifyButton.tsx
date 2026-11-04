"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Re-fetches every cited page and publishes a new version. No model calls. */
export function ReverifyButton({ versionId }: { versionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/guides/${versionId}/reverify`, { method: "POST" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "failed");
      setMsg(j.changed ? `${j.changed} claim${j.changed > 1 ? "s" : ""} changed. Opening the new version.` : "All still checks out. Opening the new version.");
      router.push(`/guides/${j.versionId}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button onClick={run} disabled={busy} className="btn-ghost !py-1.5 !text-sm disabled:opacity-60">
        {busy ? "Pip is re-reading the sources..." : "↻ Re-verify sources"}
      </button>
      {msg && <span className="text-xs text-muted">{msg}</span>}
    </span>
  );
}
