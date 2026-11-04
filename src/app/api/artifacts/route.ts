import { z } from "zod";
import { callModel, CostMeter } from "@/lib/llm";
import { getVersion } from "@/lib/store";
import { ArtifactKind } from "@/lib/schema";
import { allowArtifact } from "@/lib/rate-limit";

export const maxDuration = 60;

const Out = z.object({ title: z.string(), body_md: z.string(), placeholders: z.array(z.string()) });

const BRIEF: Record<z.infer<typeof ArtifactKind>, string> = {
  scope_justification:
    "Write the per-scope justification a reviewer expects: for each requested scope, one paragraph on the user-facing feature that needs it, why a narrower scope would not work, and what data is stored and for how long.",
  consent_screen_copy:
    "Write the app name guidance, short description, and the text for the consent screen / app listing so a reviewer and an end user both understand what the agent does and why access is needed. Plain language.",
  privacy_clause:
    "Write a privacy-policy section about data obtained through this provider's OAuth: what is accessed, how it is used, that it is not sold, retention and deletion, and any provider-specific limited-use disclosure the sources mention. Plain language.",
  demo_video_shotlist:
    "Write a shot list for the demo video the provider's review asks for: numbered shots with what is on screen, what to say, and what the reviewer must be able to see (for example the consent screen and the client ID). Use only requirements the claims support.",
  redirect_uri_list:
    "List the redirect URIs to register (production, staging, local development) following the provider's redirect URI rules, and the exact mistakes to avoid. If Composio's auth config redirect URI is given, include it.",
};

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { versionId?: string; kind?: string; scopes?: string[]; distribution?: string; appPurpose?: string };
  const kind = ArtifactKind.safeParse(b.kind);
  if (!b.versionId || !kind.success) return Response.json({ error: "bad request" }, { status: 400 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "Server is missing ANTHROPIC_API_KEY." }, { status: 503 });
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  if (!allowArtifact(ip)) return Response.json({ error: "Limit: 15 drafts per hour." }, { status: 429 });

  const v = await getVersion(b.versionId);
  if (!v) return Response.json({ error: "guide not found" }, { status: 404 });
  const g = v.guide;
  const facts = g.provenance.claims
    .filter((c) => c.status === "tested" || c.status === "primary" || c.status === "secondary")
    .map((c) => `[${c.status}] ${c.text}`)
    .slice(0, 40);

  const out = await callModel({
    model: "sonnet",
    effort: "low",
    schema: Out,
    meter: new CostMeter(),
    maxTokens: 4000,
    system: `You draft documents that help a developer get an OAuth app approved. ${BRIEF[kind.data]} Use only the supplied facts for provider requirements; where you need details only the developer knows (company name, support email, domain), insert [PLACEHOLDER] markers and list them. No em-dashes. Keep it under 350 words.`,
    user: JSON.stringify({
      provider: g.app.name,
      agent_purpose: (b.appPurpose ?? "an AI agent that acts on the user's behalf").slice(0, 300),
      selected_scopes: (b.scopes ?? []).slice(0, 20),
      distribution: b.distribution ?? "unlisted_public",
      composio_redirect_uri: g.composio?.redirect_uri ?? null,
      redirect_uri_rules: g.oauth.redirect_uri_rules,
      facts,
    }),
  }).catch((e: unknown) => ({ error: e instanceof Error ? e.message : String(e) }));

  if ("error" in out) return Response.json({ error: out.error }, { status: 502 });
  return Response.json(out);
}
