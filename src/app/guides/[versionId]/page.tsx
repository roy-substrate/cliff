import { notFound } from "next/navigation";
import { GuideView } from "@/components/GuideView";
import { getLatest, getVersion } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function GuidePage({ params }: PageProps<"/guides/[versionId]">) {
  const { versionId } = await params;
  const v = getVersion(versionId);
  if (!v) notFound();
  const latest = getLatest(v.slug)?.versionId === v.versionId;
  return <GuideView guide={v.guide} versionId={v.versionId} createdAt={v.created_at} latest={latest} />;
}
