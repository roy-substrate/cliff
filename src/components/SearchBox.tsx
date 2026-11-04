"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const SUGGESTIONS = ["Notion", "Slack", "Gmail", "Shopify", "pipedrive.com"];

export function SearchBox({ variant = "hero" }: { variant?: "hero" | "compact" }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const go = (v: string) => {
    if (v.trim().length >= 2) router.push(`/generate?q=${encodeURIComponent(v.trim())}`);
  };

  if (variant === "compact") {
    return (
      <form onSubmit={(e) => (e.preventDefault(), go(q))} className="flex gap-2 rounded-full bg-white p-1.5 shadow-soft">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Any app name or website" maxLength={100} className="min-w-0 flex-1 rounded-full bg-transparent px-4 text-base outline-none" aria-label="App name or website" />
        <button className="btn-ink !py-2 !text-base">Check it →</button>
      </form>
    );
  }

  return (
    <div>
      <form onSubmit={(e) => (e.preventDefault(), go(q))} className="rounded-[34px] bg-white p-3 shadow-float sm:p-4">
        <label htmlFor="app-q" className="font-display block px-3 pt-1 text-xl font-extrabold text-ink sm:text-2xl">
          Which app are you trying to connect?
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            id="app-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type a name or paste a website, like calendly.com"
            maxLength={100}
            className="min-w-0 flex-1 rounded-full border-2 border-line bg-cream px-5 py-3.5 text-lg outline-none transition focus:border-sky-deep focus:bg-white"
          />
          <button className="btn-ink !px-7 !py-3.5">Let&apos;s figure it out →</button>
        </div>
      </form>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
        <span className="font-hand text-xl text-ink/60">try one:</span>
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" onClick={() => go(s)} className="rounded-full bg-white/80 px-3.5 py-1.5 font-semibold text-ink/80 shadow-soft transition hover:-translate-y-0.5 hover:bg-white">
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
