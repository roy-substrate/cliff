import { SearchBox } from "@/components/SearchBox";
import { LibraryGrid } from "@/components/LibraryGrid";
import { Pip, PipBadge } from "@/components/brand/Mascot";
import { Annotation, Chip, HandArrow, KeyCoin, ShieldBubble, Sparkle, TimerRing } from "@/components/brand/Doodles";
import { listLatest } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const items = await listLatest();
  return (
    <div className="space-y-16">
      {/* HERO */}
      <section id="search" className="bg-sky-wash relative overflow-hidden rounded-[44px] px-5 pb-14 pt-14 sm:px-10 md:pt-20">
        {/* floating objects: wrappers own position, visibility and motion */}
        <span className="animate-float absolute right-[6%] top-10 hidden md:block">
          <TimerRing label="6 wk" sub="review" pct={0.68} />
        </span>
        <span className="animate-float-slow absolute left-[5%] top-16 hidden md:block [--r:-10deg]">
          <KeyCoin />
        </span>
        <span className="animate-float absolute left-[7%] top-[58%] hidden lg:block [--r:8deg]">
          <ShieldBubble />
        </span>
        <span className="animate-float-slow absolute right-[7%] top-[50%] hidden lg:block [--r:6deg]">
          <Chip tone="mint">✓ no review</Chip>
        </span>
        <span className="animate-float absolute left-[9%] top-[36%] hidden xl:block [--r:-5deg]">
          <Chip>
            <code className="tech !bg-transparent">client_id</code>
          </Chip>
        </span>
        <span className="absolute right-[26%] top-8 hidden md:block">
          <Sparkle />
        </span>
        <span className="absolute left-[30%] top-12 hidden md:block">
          <Sparkle size={16} color="#ff8f75" />
        </span>

        <div className="relative mx-auto max-w-3xl text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <Annotation className="-rotate-3">meet Pip, your OAuth sidekick</Annotation>
            <HandArrow variant="right" width={70} className="hidden translate-y-2 sm:block" />
            <PipBadge size={72} />
          </div>
          <h1 className="font-display text-[52px] font-extrabold leading-[0.92] tracking-[-0.03em] sm:text-[76px] md:text-[92px]">
            OAuth setup, minus the headache.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-ink/70 sm:text-xl">Find out what it takes to connect an app, get approved and go live.</p>
        </div>

        <div className="relative mx-auto mt-28 max-w-3xl sm:mt-16">
          <span className="pointer-events-none absolute -top-[96px] right-4 z-10 animate-bob sm:-top-[86px] sm:right-12">
            <Pip mood="search" size={104} />
          </span>
          <SearchBox />
        </div>

        <p className="relative mx-auto mt-8 max-w-2xl text-center text-[15px] text-ink/60">
          One extra scope can turn ten minutes into weeks of review. Cliff asks what your agent needs to do, who will connect and how you&apos;ll ship, then shows where
          the cliff is.
        </p>
      </section>

      {/* POPULAR */}
      <section>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Popular integrations</h2>
            <p className="text-muted">From instant to weeks of review. Each one checked against the provider&apos;s own docs.</p>
          </div>
          <span className="hidden items-center gap-1 md:flex">
            <Annotation className="rotate-2">pick one, or search anything above</Annotation>
            <HandArrow variant="down" width={44} />
          </span>
        </div>
        <LibraryGrid items={items} hero="notion" />
      </section>

      {/* TRUST */}
      <section className="grid gap-4 md:grid-cols-3">
        {[
          { t: "We read the real docs", d: "Agents search the provider's developer docs and copy exact quotes, not summaries.", bg: "bg-sky-soft", mood: "search" as const },
          { t: "We re-check every quote", d: "Each cited page is fetched again. A quote that isn't there gets demoted, and you see it happen.", bg: "bg-butter-soft", mood: "think" as const },
          { t: "We say what we couldn't verify", d: "Unknown waits stay unknown. Every claim carries a dot you can open to see its source.", bg: "bg-mint-soft", mood: "happy" as const },
        ].map((x) => (
          <div key={x.t} className={`relative overflow-hidden rounded-[30px] ${x.bg} p-6`}>
            <span className="absolute -right-2 -top-1 opacity-90">
              <Pip mood={x.mood} size={70} />
            </span>
            <h3 className="font-display max-w-[75%] text-2xl font-extrabold leading-tight">{x.t}</h3>
            <p className="mt-2 text-[15px] text-ink/70">{x.d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
