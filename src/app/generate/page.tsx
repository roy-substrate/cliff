import { redirect } from "next/navigation";
import { Theater } from "@/components/Theater";
import { getLatest } from "@/lib/store";
import { slugify } from "@/lib/util";

export const dynamic = "force-dynamic";

/** Common ways people type library apps that slugify would not catch. */
const ALIASES: Record<string, string> = {
  "google-mail": "gmail",
  "gcal": "google-calendar",
  "googlecalendar": "google-calendar",
  "entra": "microsoft-entra-id",
  "entra-id": "microsoft-entra-id",
  "azure-ad": "microsoft-entra-id",
  "microsoft": "microsoft-entra-id",
  "microsoft-365": "microsoft-entra-id",
  "outlook": "microsoft-entra-id",
};

export default async function Generate({ searchParams }: PageProps<"/generate">) {
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim();
  if (!q) redirect("/");
  const force = sp.force === "1";

  // A library app opens its existing guide: instant, free, and already spot-checked.
  if (!force) {
    const s = slugify(q);
    const hit = getLatest(ALIASES[s] ?? s);
    if (hit && hit.guide.status !== "fallback") redirect(`/apps/${hit.slug}`);
  }
  return <Theater q={q.slice(0, 100)} force={force} />;
}
