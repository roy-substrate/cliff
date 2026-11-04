/** Prints passages from the real pages around the facts a guide asserts, so a human (or agent) can judge them independently of the pipeline. */
import { fetchText, normalizeText } from "../src/lib/util";

const checks: { url: string; terms: string[] }[] = JSON.parse(process.argv[2] ?? "[]");
for (const { url, terms } of checks) {
  const r = await fetchText(url, 15000);
  const p = normalizeText(r.text);
  console.log(`\n##### ${url} (status ${r.status}, ${p.length} chars)`);
  for (const t of terms) {
    const k = normalizeText(t);
    const i = p.indexOf(k);
    console.log(`\n[${t}] ${i < 0 ? "NOT FOUND ON PAGE" : "..." + p.slice(Math.max(0, i - 160), i + 260)}`);
  }
}
