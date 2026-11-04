import type { AttemptEntry } from "@/lib/schema";
import { fetchText, hostOf } from "@/lib/util";

const LOGIN_HINTS = /(sign[ -]?in|log[ -]?in|accounts?\.|\/login|\/signin|\/auth)/i;

export interface ProbeResult {
  attempts: AttemptEntry[];
  wellKnown: { issuer?: string; authorize_url?: string; token_url?: string; scopes_supported?: string[]; pkce_methods?: string[] } | null;
}

/** Unauthenticated, read-only probes. Safe to run live for any app. */
export async function runProbes(
  args: { homepage: string; developerPortal?: string | null; authorizeUrl?: string | null },
  emit?: (url: string, observed: string, outcome: AttemptEntry["outcome"]) => void,
): Promise<ProbeResult> {
  const attempts: AttemptEntry[] = [];
  let n = 0;
  const add = (action: string, observed: string, outcome: AttemptEntry["outcome"], url: string) => {
    attempts.push({ id: `a_probe_${++n}`, at: new Date().toISOString(), mode: "probe", action, observed, outcome, screenshot: null, supports_claim_ids: [] });
    emit?.(url, observed, outcome);
  };

  // 1. developer portal: reachable? login wall?
  if (args.developerPortal) {
    const r = await fetchText(args.developerPortal);
    const wall = LOGIN_HINTS.test(r.finalUrl) || /type=["']password["']/i.test(r.text.slice(0, 20000));
    add(
      `GET ${args.developerPortal}`,
      r.status === 0
        ? `unreachable (${r.text.slice(0, 80)})`
        : `HTTP ${r.status} -> ${r.finalUrl}${wall ? " (login wall: needs an account to see the app registration form)" : ""}`,
      r.status === 0 ? "error" : wall ? "blocked_login" : "ok",
      args.developerPortal,
    );
  }

  // 2. well-known discovery documents on the homepage origin
  let wellKnown: ProbeResult["wellKnown"] = null;
  let origin = "";
  try {
    origin = new URL(args.homepage).origin;
  } catch {}
  if (origin) {
    for (const path of ["/.well-known/openid-configuration", "/.well-known/oauth-authorization-server"]) {
      const url = origin + path;
      const r = await fetchText(url);
      let parsed: Record<string, unknown> | null = null;
      if (r.ok && r.contentType.includes("json")) {
        try {
          parsed = JSON.parse(r.text);
        } catch {}
      }
      if (parsed && typeof parsed.authorization_endpoint === "string") {
        wellKnown = {
          issuer: parsed.issuer as string | undefined,
          authorize_url: parsed.authorization_endpoint as string,
          token_url: parsed.token_endpoint as string | undefined,
          scopes_supported: parsed.scopes_supported as string[] | undefined,
          pkce_methods: parsed.code_challenge_methods_supported as string[] | undefined,
        };
        add(`GET ${url}`, `HTTP 200, discovery document: authorize=${wellKnown.authorize_url}, PKCE methods=${(wellKnown.pkce_methods ?? ["not advertised"]).join(",")}`, "ok", url);
        break;
      }
      add(`GET ${url}`, `HTTP ${r.status || "error"}: no discovery document on ${hostOf(url)}`, r.status === 0 ? "error" : "ok", url);
    }
  }

  // 3. authorize endpoint with a dummy client_id: capture the real error text
  const authorize = args.authorizeUrl ?? wellKnown?.authorize_url;
  if (authorize) {
    const u = new URL(authorize);
    u.searchParams.set("client_id", "cliff-probe-nonexistent");
    u.searchParams.set("response_type", "code");
    u.searchParams.set("redirect_uri", "https://example.invalid/callback");
    u.searchParams.set("state", "cliff");
    const r = await fetchText(u.toString());
    const body = r.text.replace(/\s+/g, " ").slice(0, 240);
    add(
      `GET ${authorize}?client_id=cliff-probe-nonexistent&redirect_uri=https://example.invalid/callback`,
      `HTTP ${r.status} -> ${r.finalUrl.slice(0, 120)} | ${body}`,
      r.status === 0 ? "error" : "ok",
      authorize,
    );
  }
  return { attempts, wellKnown };
}
