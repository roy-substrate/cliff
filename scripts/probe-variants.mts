import { getLatestLocal } from "../src/lib/store";
import { normalizeText, quoteCoverage } from "../src/lib/util";

const g = getLatestLocal("gmail")!.guide;
const bad = g.provenance.evidence.filter((e) => e.kind === "doc" && (e.coverage ?? 1) < 0.5);
const url = bad[0]?.url;
const quotes = g.provenance.evidence.filter((e) => e.url === url).map((e) => e.quote);
console.log("failing url:", url, "| quotes on it:", quotes.length);

async function once(label: string, u: string, headers: Record<string, string>) {
  const r = await fetch(u, { redirect: "follow", headers: { "user-agent": "CliffBot/0.1 (OAuth setup research)", accept: "text/html", ...headers } });
  const raw = await r.text();
  const text = raw.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const hits = quotes.filter((q) => quoteCoverage(q, text) >= 0.85).length;
  console.log(`${label.padEnd(34)} status ${r.status} len ${String(text.length).padStart(6)} lang=${(raw.match(/<html[^>]*lang="([^"]+)"/i) ?? [])[1] ?? "?"} quotes matched ${hits}/${quotes.length} final=${r.url.slice(0, 80)}`);
}
for (let i = 1; i <= 5; i++) await once(`plain #${i}`, url!, {});
for (let i = 1; i <= 3; i++) await once(`Accept-Language en-US #${i}`, url!, { "accept-language": "en-US,en;q=0.9" });
for (let i = 1; i <= 3; i++) await once(`?hl=en #${i}`, url! + (url!.includes("?") ? "&" : "?") + "hl=en", { "accept-language": "en-US,en;q=0.9" });
for (let i = 1; i <= 3; i++) await once(`browser UA #${i}`, url!, { "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15", "accept-language": "en-US,en;q=0.9" });
void normalizeText;
