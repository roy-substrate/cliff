import { Composio } from "@composio/core";

export interface ComposioInfo {
  toolkit_slug: string | null;
  toolkit_name: string | null;
  tool_count: number | null;
  managed_auth: boolean | null;
  auth_config_fields: string[];
  redirect_uri: string | null;
  source: "api" | "directory" | "static_directory" | "none";
}

const DIRECTORY_URL = "https://docs.composio.dev/toolkits/managed-auth.md";
const DIRECTORY_TTL = 24 * 3600_000;

/** Last-resort copy of the directory (checked 2026-11-04) for when docs.composio.dev is unreachable. */
const STATIC_MANAGED =
  "gmail googlecalendar googledrive googlesheets googledocs slack hubspot salesforce github gitlab bitbucket notion linear jira confluence asana trello clickup monday zoom outlook microsoft_teams onedrive sharepoint dropbox box figma canva miro discord reddit linkedin instagram facebook stripe square quickbooks zendesk intercom mailchimp calendly typeform airtable supabase sentry pagerduty strava youtube".split(" ");
const STATIC_BYO = "shopify twitter spotify xero pipedrive klaviyo docusign netsuite workday gusto deel bamboohr lever datadog snowflake databricks vercel twilio webflow wix wordpress ebay paypal threads snapchat vimeo entra_id".split(" ");

type Entry = { slug: string; name: string; managed: boolean };
let cache: { at: number; entries: Entry[] } | null = null;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Composio publishes its managed-OAuth directory as markdown: two tables of `| [Name](/toolkits/x.md) | `SLUG` |`
 * under "Composio-managed OAuth available" and "Bring your own OAuth app". Parsed live and cached for a day.
 */
async function loadDirectory(): Promise<Entry[]> {
  if (cache && Date.now() - cache.at < DIRECTORY_TTL) return cache.entries;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 5000);
  try {
    const r = await fetch(DIRECTORY_URL, { signal: ctl.signal, headers: { "accept-language": "en-US,en;q=0.9", "user-agent": "CliffBot/0.1" } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const md = await r.text();
    const entries: Entry[] = [];
    let managed: boolean | null = null;
    for (const line of md.split("\n")) {
      if (/^##\s+Composio-managed OAuth available/i.test(line)) managed = true;
      else if (/^##\s+Bring your own OAuth app/i.test(line)) managed = false;
      else if (managed !== null) {
        const m = line.match(/^\|\s*\[([^\]]+)\]\([^)]*\)\s*\|\s*`?([A-Za-z0-9_]+)`?\s*\|/);
        if (m) entries.push({ slug: m[2].toLowerCase(), name: m[1].trim(), managed });
      }
    }
    if (entries.length < 100) throw new Error(`parsed only ${entries.length} rows`);
    cache = { at: Date.now(), entries };
    return entries;
  } finally {
    clearTimeout(t);
  }
}

function matchEntry(entries: Entry[], slug: string, name: string): Entry | null {
  const ns = norm(slug);
  const nn = norm(name);
  const candidates = new Set([ns, nn, ns.replace(/^(microsoft|google)/, "")]);
  // exact slug or name first, then prefix matches (e.g. "google-calendar" vs GOOGLECALENDAR, "gmail" vs GMAIL)
  return (
    entries.find((e) => candidates.has(norm(e.slug)) || candidates.has(norm(e.name))) ??
    entries.find((e) => norm(e.name).startsWith(nn) && nn.length >= 5) ??
    entries.find((e) => ns.startsWith(norm(e.slug)) && norm(e.slug).length >= 5) ??
    null
  );
}

export async function lookupComposio(slug: string, name = slug): Promise<ComposioInfo> {
  // 1. the API, when a key is configured: also yields the auth-config fields a developer must bring back
  const key = process.env.COMPOSIO_API_KEY;
  if (key) {
    try {
      const composio = new Composio({ apiKey: key });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tk: any = await (composio as any).toolkits.get(slug);
      if (tk) {
        const schemes: string[] = tk.composioManagedAuthSchemes ?? tk.composio_managed_auth_schemes ?? [];
        let fields: string[] = [];
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const f: any = await (composio as any).toolkits.getAuthConfigCreationFields(slug, "OAUTH2");
          fields = (Array.isArray(f) ? f : []).map((x: { name?: string }) => x.name ?? "").filter(Boolean);
        } catch {}
        return { toolkit_slug: tk.slug ?? slug, toolkit_name: tk.name ?? null, tool_count: tk.meta?.toolsCount ?? tk.meta?.tools_count ?? null, managed_auth: schemes.includes("OAUTH2"), auth_config_fields: fields, redirect_uri: null, source: "api" };
      }
    } catch {
      /* fall through */
    }
  }

  // 2. the public directory, fetched live
  try {
    const hit = matchEntry(await loadDirectory(), slug, name);
    if (hit) return { toolkit_slug: hit.slug, toolkit_name: hit.name, tool_count: null, managed_auth: hit.managed, auth_config_fields: [], redirect_uri: null, source: "directory" };
    return { toolkit_slug: null, toolkit_name: null, tool_count: null, managed_auth: null, auth_config_fields: [], redirect_uri: null, source: "directory" };
  } catch {
    /* fall through to the static copy */
  }

  // 3. static copy
  const ns = norm(slug);
  if (STATIC_MANAGED.some((s) => norm(s) === ns)) return { toolkit_slug: ns, toolkit_name: null, tool_count: null, managed_auth: true, auth_config_fields: [], redirect_uri: null, source: "static_directory" };
  if (STATIC_BYO.some((s) => norm(s) === ns)) return { toolkit_slug: ns, toolkit_name: null, tool_count: null, managed_auth: false, auth_config_fields: [], redirect_uri: null, source: "static_directory" };
  return { toolkit_slug: null, toolkit_name: null, tool_count: null, managed_auth: null, auth_config_fields: [], redirect_uri: null, source: "none" };
}
