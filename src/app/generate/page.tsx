import { redirect } from "next/navigation";
import { Theater } from "@/components/Theater";

export const dynamic = "force-dynamic";

export default async function Generate({ searchParams }: PageProps<"/generate">) {
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim();
  if (!q) redirect("/");
  return <Theater q={q.slice(0, 100)} force={sp.force === "1"} />;
}
