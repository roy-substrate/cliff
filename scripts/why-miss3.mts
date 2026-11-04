import { getLatestLocal } from "../src/lib/store";
import { fetchText, normalizeText } from "../src/lib/util";

const g = getLatestLocal("google-calendar")!.guide;
const u = "https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification";
const e = g.provenance.evidence.find((x) => x.url === u)!;
const page = normalizeText((await fetchText(u, 15000)).text);
const q = normalizeText(e.quote).split(" ").filter(Boolean);
console.log("quote words:", JSON.stringify(q.join(" ")));
const missing: string[] = [];
for (let i = 0; i + 6 <= q.length; i++) {
  const g6 = q.slice(i, i + 6).join(" ");
  if (!page.includes(g6)) missing.push(g6);
}
console.log("6-grams missing:", missing.length, "of", q.length - 5);
const at = page.indexOf(q.slice(0, 3).join(" "));
console.log("page at start of quote:", JSON.stringify(page.slice(at, at + q.join(" ").length + 20)));
console.log("raw char codes around 'google account' in page:", [...page.slice(at, at + 90)].filter((c) => c.charCodeAt(0) > 127).map((c) => c.charCodeAt(0).toString(16)));
