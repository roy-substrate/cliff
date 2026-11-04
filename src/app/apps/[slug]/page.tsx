import { notFound } from "next/navigation";
import { GuideView } from "@/components/GuideView";
import { getLatest } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AppPage({ params }: PageProps<"/apps/[slug]">) {
  const { slug } = await params;
  const v = getLatest(slug);
  if (!v) notFound();
  return <GuideView guide={v.guide} versionId={v.versionId} createdAt={v.created_at} latest />;
}
