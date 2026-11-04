import { SearchBox } from "@/components/SearchBox";
import { LibraryGrid } from "@/components/LibraryGrid";
import { listLatest } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const items = await listLatest();
  return (
    <div>
      <section className="py-8">
        <p className="text-sm font-medium text-accent">For people building agents that connect to other people&apos;s apps</p>
        <h1 className="mt-2 max-w-3xl text-4xl font-semibold leading-tight tracking-tight">
          Most OAuth guides tell you how hard a provider is. That is the wrong unit.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          One extra scope can turn a ten-minute setup into weeks of review. Cliff asks what your agent needs to do, who will connect and how you will distribute, then shows
          where the cliff is, what it costs in calendar time, and how sure we are of each claim.
        </p>
        <div className="mt-6 max-w-2xl">
          <SearchBox />
          <p className="mt-2 text-xs text-muted">Not in the library? An agent will investigate it live, cite what it finds, and tell you what it could not verify.</p>
        </div>
      </section>
      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">Library</h2>
        <LibraryGrid items={items} hero="notion" />
      </section>
    </div>
  );
}
