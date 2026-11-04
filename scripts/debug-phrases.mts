import { fetchText, normalizeText } from "../src/lib/util";

const r = await fetchText("https://developers.notion.com/guides/get-started/authorization", 12000);
const p = normalizeText(r.text);
for (const k of ["oauth 2.0 protocol", "use the oauth 2.0", "authorization url", "submitted for review", "populates", "oauth 2.0"]) {
  const i = p.indexOf(k);
  console.log(JSON.stringify(k), i, i > -1 ? "=> ..." + p.slice(Math.max(0, i - 70), i + 110) : "");
}
