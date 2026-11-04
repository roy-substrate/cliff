import { LibraryGrid } from "@/components/LibraryGrid";
import { SearchBox } from "@/components/SearchBox";
import { listLatest } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Apps() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
      <p className="mb-4 mt-1 text-sm text-muted">Sorted from easiest to hardest. Anything missing can be generated live.</p>
      <div className="mb-6 max-w-2xl">
        <SearchBox />
      </div>
      <LibraryGrid items={await listLatest()} />
    </div>
  );
}
