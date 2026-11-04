import { Composio } from "@composio/core";

export interface ComposioInfo {
  toolkit_slug: string | null;
  tool_count: number | null;
  managed_auth: boolean | null;
  auth_config_fields: string[];
  redirect_uri: string | null;
  source: "api" | "static_directory" | "none";
}

// Fallback when no COMPOSIO_API_KEY: slugs from https://docs.composio.dev/toolkits/managed-auth (checked 2026-11-04).
const MANAGED = new Set(
  "gmail googlecalendar googledrive googlesheets googledocs slack hubspot salesforce github gitlab bitbucket notion linear jira confluence asana trello clickup monday zoom outlook microsoft-teams onedrive sharepoint dropbox box figma canva miro discord reddit linkedin instagram facebook stripe square quickbooks zendesk intercom mailchimp calendly typeform airtable supabase sentry pagerduty strava youtube".split(" "),
);
const BYO = new Set(
  "shopify twitter x spotify xero pipedrive klaviyo docusign netsuite workday gusto deel bamboohr lever datadog snowflake databricks vercel twilio webflow wix wordpress ebay paypal threads snapchat vimeo entra-id microsoft-entra-id".split(" "),
);

export async function lookupComposio(slug: string): Promise<ComposioInfo> {
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
        return {
          toolkit_slug: tk.slug ?? slug,
          tool_count: tk.meta?.toolsCount ?? tk.meta?.tools_count ?? null,
          managed_auth: schemes.includes("OAUTH2"),
          auth_config_fields: fields,
          redirect_uri: null,
          source: "api",
        };
      }
    } catch {
      /* fall through to static directory */
    }
  }
  if (MANAGED.has(slug)) return { toolkit_slug: slug, tool_count: null, managed_auth: true, auth_config_fields: [], redirect_uri: null, source: "static_directory" };
  if (BYO.has(slug)) return { toolkit_slug: slug, tool_count: null, managed_auth: false, auth_config_fields: [], redirect_uri: null, source: "static_directory" };
  return { toolkit_slug: null, tool_count: null, managed_auth: null, auth_config_fields: [], redirect_uri: null, source: "none" };
}
