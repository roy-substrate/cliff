import { runProbes } from "../src/pipeline/probe";
const t0 = Date.now();
const r = await runProbes({
  homepage: "https://www.notion.so",
  developerPortal: "https://www.notion.so/profile/integrations",
  authorizeUrl: "https://api.notion.com/v1/oauth/authorize",
});
console.log(JSON.stringify(r, null, 2), `\n${Date.now() - t0}ms`);
