"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchBox({ autoFocus }: { autoFocus?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim().length >= 2) router.push(`/generate?q=${encodeURIComponent(q.trim())}`);
      }}
      className="flex gap-2"
    >
      <input
        autoFocus={autoFocus}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="An app name or website, e.g. Calendly or pipedrive.com"
        className="w-full rounded-md border border-fg/30 bg-panel px-4 py-3 text-base outline-none focus:border-accent"
        maxLength={100}
      />
      <button className="rounded-md bg-fg px-5 py-3 text-sm font-medium text-bg hover:bg-accent">Investigate</button>
    </form>
  );
}
