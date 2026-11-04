import dotenv from "dotenv";
dotenv.config({ path: ".env.local", quiet: true });
import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic();
try {
  const r = await client.messages.create({ model: "claude-haiku-5-5", max_tokens: 64, output_config: { effort: "low" }, messages: [{ role: "user", content: "Reply with the single word: ok" }] });
  console.log("KEY WORKS. stop_reason:", r.stop_reason, "| input tokens:", r.usage.input_tokens, "| output tokens:", r.usage.output_tokens);
} catch (e) {
  if (e instanceof Anthropic.AuthenticationError) console.log("KEY REJECTED (401 authentication error): this is not a valid API key.");
  else if (e instanceof Anthropic.PermissionDeniedError) console.log("KEY LACKS PERMISSION (403):", e.message.slice(0, 200));
  else if (e instanceof Anthropic.APIError) console.log(`API ERROR ${e.status}:`, e.message.slice(0, 200));
  else console.log("ERROR:", String(e).slice(0, 200));
}
