"use client";

import { useState } from "react";

/** Copies the permanent link for this exact guide version. */
export function CopyLink({ path }: { path: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(`${window.location.origin}${path}`);
        setDone(true);
        setTimeout(() => setDone(false), 1800);
      }}
      className="btn-ghost !py-1.5 !text-sm"
    >
      {done ? "Link copied ✓" : "Share this guide"}
    </button>
  );
}
