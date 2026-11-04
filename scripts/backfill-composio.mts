/** Refresh each library guide's Composio directory result from the live managed-OAuth directory. No model calls. */
import fs from "node:fs";
import path from "node:path";
import { getLatestLocal, newVersionId, saveVersion } from "../src/lib/store";
import { lookupComposio } from "../src/pipeline/composio";

const root = path.join(process.cwd(), "data", "guides");
for (const slug of fs.readdirSync(root).filter((d) => !d.startsWith("."))) {
  const prev = getLatestLocal(slug);
  if (!prev) continue;
  const g = structuredClone(prev.guide);
  const c = await lookupComposio(slug, g.app.name);
  const before = `${g.build_or_borrow.composio_managed}/${g.composio ? "obj" : "null"}`;
  g.build_or_borrow.composio_managed = c.managed_auth;
  g.build_or_borrow.composio_slug = c.toolkit_slug;
  g.composio = c.source === "none" ? null : { toolkit_slug: c.toolkit_slug, tool_count: c.tool_count, managed_auth: c.managed_auth, auth_config_fields: c.auth_config_fields, redirect_uri: c.redirect_uri };
  const after = `${g.build_or_borrow.composio_managed}/${g.composio ? "obj" : "null"}`;
  if (before === after) { console.log(`${slug.padEnd(20)} unchanged (${after})`); continue; }
  const versionId = newVersionId(slug);
  await saveVersion({ versionId, slug, created_at: new Date().toISOString(), created_by: "library", cost_usd: prev.cost_usd, guide: g });
  console.log(`${slug.padEnd(20)} ${before} -> ${after}  (${c.source}, ${c.toolkit_name ?? "-"})`);
}
