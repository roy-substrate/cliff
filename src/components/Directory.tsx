"use client";

import { useMemo, useState } from "react";
import type { StoredVersion } from "@/lib/store";
import { LEVEL_META } from "@/lib/present";
import { IntegrationCard } from "./LibraryGrid";
import { Pip } from "./brand/Mascot";

type Level = keyof typeof LEVEL_META;
const ORDER: Level[] = ["instant", "hours", "days", "weeks", "weeks_plus_cost", "unknown"];

/** Directory with friendly filters: by how hard approval is, and by name. */
export function Directory({ items }: { items: StoredVersion[] }) {
  const [level, setLevel] = useState<Level | "all">("all");
  const [q, setQ] = useState("");
  const present = ORDER.filter((l) => items.some((v) => v.guide.difficulty.level === l));
  const shown = useMemo(
    () =>
      items
        .filter((v) => (level === "all" ? true : v.guide.difficulty.level === level))
        .filter((v) => v.guide.app.name.toLowerCase().includes(q.trim().toLowerCase()))
        .sort((a, b) => a.guide.difficulty.score - b.guide.difficulty.score || a.slug.localeCompare(b.slug)),
    [items, level, q],
  );

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setLevel("all")} className={`rounded-full px-4 py-2 font-display font-bold transition ${level === "all" ? "bg-ink text-white" : "bg-white shadow-soft hover:-translate-y-0.5"}`}>
            All {items.length}
          </button>
          {present.map((l) => (
            <button key={l} onClick={() => setLevel(l)} className={`rounded-full px-4 py-2 font-display font-bold transition ${level === l ? LEVEL_META[l].chip : `${LEVEL_META[l].bg} hover:-translate-y-0.5`}`}>
              {LEVEL_META[l].label}
            </button>
          ))}
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by name" className="rounded-full border-2 border-line bg-white px-5 py-2.5 outline-none focus:border-sky-deep" aria-label="Filter apps by name" />
      </div>
      {shown.length ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((v) => (
            <IntegrationCard key={v.slug} v={v} />
          ))}
        </div>
      ) : (
        <div className="mt-8 flex flex-col items-center rounded-[30px] bg-white p-10 text-center shadow-soft">
          <Pip mood="think" size={100} />
          <p className="font-display mt-3 text-2xl font-extrabold">Nothing here matches &ldquo;{q}&rdquo;</p>
          <p className="text-muted">Check it from the home page and Pip will investigate it live.</p>
        </div>
      )}
    </div>
  );
}
