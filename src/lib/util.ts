export function slugify(s: string): string {
  // a bare domain or URL ("notion.so", "https://api.slack.com/apps") resolves to the site's own name
  const host = s.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(host)) {
    const parts = host.split(".");
    const sld = parts.length > 2 && ["co", "com"].includes(parts[parts.length - 2]) ? parts[parts.length - 3] : parts[parts.length - 2];
    return sld;
  }
  return s
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .replace(/\.(com|io|app|co|net|org|dev|ai)$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Crude registrable domain (good enough for first-party vs third-party labelling). */
export function rootDomain(urlOrHost: string): string {
  const h = urlOrHost.includes("/") ? hostOf(urlOrHost) : urlOrHost;
  const parts = h.split(".");
  if (parts.length <= 2) return h;
  const sld = parts.slice(-2).join(".");
  if (["co.uk", "com.au", "co.in", "com.br"].includes(sld)) return parts.slice(-3).join(".");
  return sld;
}

/** The fetch tool returns markdown; re-fetched pages are plain text. Compare both with markup removed. */
export function stripMarkdown(s: string): string {
  return s
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*`#>]+/g, " ");
}

export function normalizeText(s: string): string {
  return stripMarkdown(s)
    .toLowerCase()
    .replace(/[‘’“”]/g, "'")
    .replace(/[‐-―−]/g, "-")
    .replace(/ /g, " ")
    .replace(/[^a-z0-9%$.\-' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Fraction of the quote's 6-grams that appear in the page text. */
export function quoteCoverage(quote: string, page: string): number {
  const q = normalizeText(quote).split(" ").filter(Boolean);
  const p = normalizeText(page);
  if (q.length === 0) return 0;
  if (p.includes(q.join(" "))) return 1;
  const n = Math.min(6, q.length);
  let hit = 0;
  let total = 0;
  for (let i = 0; i + n <= q.length; i++) {
    total++;
    if (p.includes(q.slice(i, i + n).join(" "))) hit++;
  }
  return total ? hit / total : 0;
}

export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ");
}

export async function fetchText(url: string, timeoutMs = 8000): Promise<{ ok: boolean; status: number; finalUrl: string; text: string; contentType: string }> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      signal: ctl.signal,
      redirect: "follow",
      headers: { "user-agent": "CliffBot/0.1 (OAuth setup research; contact via repo)", accept: "text/html,application/json;q=0.9,*/*;q=0.5" },
    });
    const ct = r.headers.get("content-type") ?? "";
    const raw = await r.text();
    return { ok: r.ok, status: r.status, finalUrl: r.url, text: ct.includes("html") ? htmlToText(raw) : raw, contentType: ct };
  } catch (e) {
    return { ok: false, status: 0, finalUrl: url, text: String(e), contentType: "" };
  } finally {
    clearTimeout(t);
  }
}
