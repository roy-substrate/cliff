import { getVersion } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Raw guide JSON. Stable schema so agents can consume guides directly. */
export async function GET(_req: Request, ctx: RouteContext<"/api/guides/[id]">) {
  const { id } = await ctx.params;
  const v = await getVersion(id);
  if (!v) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(v, { headers: { "cache-control": "public, max-age=300" } });
}
