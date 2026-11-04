import { getVersion } from "@/lib/store";
import { reverify } from "@/pipeline/reverify";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

// One re-check per guide every 5 minutes per server instance. Re-verifying only fetches pages (no model calls),
// so the cost is bandwidth, but there is no reason to let anyone hammer a provider's docs through this.
const recent = new Map<string, number>();

export async function POST(_req: Request, ctx: RouteContext<"/api/guides/[id]/reverify">) {
  const { id } = await ctx.params;
  const v = await getVersion(id);
  if (!v) return Response.json({ error: "not found" }, { status: 404 });

  const last = recent.get(v.slug) ?? 0;
  if (Date.now() - last < 5 * 60_000) return Response.json({ error: "This guide was re-checked a moment ago. Try again in a few minutes." }, { status: 429 });
  recent.set(v.slug, Date.now());

  try {
    const { version, changed } = await reverify(v, "reverify");
    return Response.json({ versionId: version.versionId, changed });
  } catch (e) {
    recent.delete(v.slug);
    return Response.json({ error: e instanceof Error ? e.message : "re-check failed" }, { status: 500 });
  }
}
