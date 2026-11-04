import Link from "next/link";
import type { StoredVersion } from "@/lib/store";

const LEVEL: Record<string, { label: string; cls: string }> = {
  instant: { label: "Instant", cls: "bg-emerald-100 text-emerald-800" },
  hours: { label: "Hours", cls: "bg-lime-100 text-lime-800" },
  days: { label: "Days", cls: "bg-amber-100 text-amber-800" },
  weeks: { label: "Weeks", cls: "bg-orange-100 text-orange-800" },
  weeks_plus_cost: { label: "Weeks + cost", cls: "bg-red-100 text-red-800" },
  unknown: { label: "Unknown", cls: "bg-stone-100 text-stone-700" },
};

export function LibraryGrid({ items, hero }: { items: StoredVersion[]; hero?: string }) {
  if (!items.length) return <p className="text-sm text-muted">No guides in the library yet.</p>;
  const sorted = [...items].sort((a, b) => (a.slug === hero ? -1 : b.slug === hero ? 1 : a.guide.difficulty.score - b.guide.difficulty.score));
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map((v) => {
        const g = v.guide;
        const lv = LEVEL[g.difficulty.level];
        const c = g.provenance.claims;
        const solid = c.filter((x) => x.status === "tested" || x.status === "primary").length;
        return (
          <Link key={v.slug} href={`/apps/${v.slug}`} className="rounded-lg border border-line bg-panel p-4 hover:border-accent">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{g.app.name}</h3>
              <span className={`rounded px-1.5 py-0.5 text-[11px] ${lv.cls}`}>{lv.label}</span>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-muted">{g.summary}</p>
            <p className="mt-2 text-xs text-muted">
              {g.time.approval_required ? `Approval wait: ${g.time.approval_wait_days_min ?? "?"} to ${g.time.approval_wait_days_max ?? "?"} days` : "No approval wait"} · {solid}/{c.length} claims tested or primary
            </p>
          </Link>
        );
      })}
    </div>
  );
}
