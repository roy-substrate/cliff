import dotenv from "dotenv";
dotenv.config({ path: ".env.local", quiet: true });
import { getClient } from "../src/lib/llm";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { Discovered } from "../src/pipeline/stages";

const stream = getClient().beta.messages.stream({
  model: "claude-sonnet-5-5",
  max_tokens: 4000,
  system: "You are a research librarian. Use web_search (max 4 queries) to find official OAuth developer docs. Return 5-10 URLs you actually saw in results, with role, first_party, why.",
  messages: [{ role: "user", content: "Provider: Notion (https://www.notion.so)" }],
  tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 4 }],
  output_config: { effort: "low", format: zodOutputFormat(Discovered) },
} as never);
const msg = await stream.finalMessage();
console.log("stop_reason:", msg.stop_reason, "| usage:", JSON.stringify(msg.usage));
for (const b of msg.content) {
  const x = b as { type: string; text?: string; name?: string; input?: unknown; content?: unknown };
  const body = x.type === "text" ? x.text?.slice(0, 600) : x.type === "server_tool_use" ? JSON.stringify(x.input) : x.type === "web_search_tool_result" ? `(${Array.isArray(x.content) ? x.content.length : "err"} results)` : "";
  console.log("-", x.type, x.name ?? "", body);
}
