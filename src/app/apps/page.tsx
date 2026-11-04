import { Directory } from "@/components/Directory";
import { SearchBox } from "@/components/SearchBox";
import { Pip } from "@/components/brand/Mascot";
import { Annotation, HandArrow } from "@/components/brand/Doodles";
import { listLatest } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Apps() {
  const items = await listLatest();
  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[40px] bg-butter-soft px-6 py-10 sm:px-10">
        <span className="absolute -bottom-4 right-6 hidden md:block">
          <Pip mood="happy" size={130} />
        </span>
        <h1 className="font-display text-5xl font-extrabold tracking-tight sm:text-6xl">The directory</h1>
        <p className="mt-2 max-w-xl text-lg text-ink/70">Every guide here was researched by agents and re-checked against its sources. Sorted from easiest to hardest.</p>
        <div className="mt-6 max-w-xl">
          <SearchBox variant="compact" />
        </div>
        <span className="mt-3 hidden items-center gap-1 md:flex">
          <HandArrow variant="right" width={60} className="-scale-y-100" />
          <Annotation>not listed? Pip will look it up live</Annotation>
        </span>
      </section>
      <Directory items={items} />
    </div>
  );
}
