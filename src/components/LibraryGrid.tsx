import Link from "next/link";
import type { StoredVersion } from "@/lib/store";
import { LEVEL_META, approvalText, fmtMinutes } from "@/lib/present";
import { AppLogo } from "./AppLogo";
import { Pip } from "./brand/Mascot";

export function IntegrationCard({ v, featured = false }: { v: StoredVersion; featured?: boolean }) {
  const g = v.guide;
  const meta = LEVEL_META[g.difficulty.level];
  const c = g.provenance.claims;
  const solid = c.filter((x) => x.status === "tested" || x.status === "primary").length;
  return (
    <Link
      href={`/apps/${v.slug}`}
      className={`group relative flex flex-col overflow-hidden rounded-[30px] ${meta.bg} p-5 transition duration-300 hover:-translate-y-1 hover:shadow-float ${featured ? "sm:col-span-2" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <AppLogo name={g.app.name} homepage={g.app.homepage} size={featured ? 60 : 50} />
          <div>
            <h3 className={`font-display font-extrabold leading-none ${featured ? "text-3xl" : "text-2xl"}`}>{g.app.name}</h3>
            <span className="text-[13px] text-muted">{meta.blurb}</span>
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 font-display text-sm font-bold ${meta.chip}`}>{meta.label}</span>
      </div>
      {featured && <p className="mt-3 line-clamp-3 max-w-xl pr-16 text-[15px] text-ink/75">{g.summary}</p>}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <span className="rounded-2xl bg-white/80 px-3 py-2">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">Your effort</span>
          <span className="font-display text-lg font-bold">{fmtMinutes(g.time.hands_on_minutes)}</span>
        </span>
        <span className="rounded-2xl bg-white/80 px-3 py-2">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">Approval</span>
          <span className="font-display text-lg font-bold leading-tight">{approvalText(g.time)}</span>
        </span>
      </div>
      <span className="mt-3 flex items-center justify-between text-[13px] text-muted">
        <span>
          {solid} of {c.length} claims tested or quoted from the docs
        </span>
        <span className="font-display text-lg font-bold text-ink transition group-hover:translate-x-1">→</span>
      </span>
      {featured && (
        <span className="pointer-events-none absolute -bottom-3 right-4 hidden sm:block">
          <Pip mood="happy" size={92} />
        </span>
      )}
    </Link>
  );
}

export function LibraryGrid({ items, hero }: { items: StoredVersion[]; hero?: string }) {
  if (!items.length)
    return (
      <div className="flex flex-col items-center rounded-[30px] bg-white p-10 text-center shadow-soft">
        <Pip mood="sleepy" size={110} />
        <p className="font-display mt-3 text-2xl font-extrabold">The directory is empty for now</p>
        <p className="text-muted">Search for any app above and Pip will investigate it live.</p>
      </div>
    );
  const sorted = [...items].sort((a, b) => (a.slug === hero ? -1 : b.slug === hero ? 1 : a.guide.difficulty.score - b.guide.difficulty.score));
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map((v) => (
        <IntegrationCard key={v.slug} v={v} featured={v.slug === hero} />
      ))}
    </div>
  );
}
