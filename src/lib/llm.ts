import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

export const MODELS = {
  opus: "claude-opus-5-5",
  sonnet: "claude-sonnet-5-5",
  haiku: "claude-haiku-5-5",
} as const;
export type ModelKey = keyof typeof MODELS;

// $ per million tokens (input, output, cache read). Checked against the claude-api skill 2026-11-04.
const PRICE: Record<ModelKey, { in: number; out: number; cacheRead: number }> = {
  opus: { in: 4, out: 20, cacheRead: 0.2 },
  sonnet: { in: 2, out: 10, cacheRead: 0.2 },
  haiku: { in: 0.1, out: 0.5, cacheRead: 0.01 },
};
const SEARCH_COST = 10 / 1000;

let _client: Anthropic | null = null;
export const getClient = () => (_client ??= new Anthropic());

export class CostMeter {
  usd = 0;
  add(model: ModelKey, u: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null; server_tool_use?: { web_search_requests?: number } | null }) {
    const p = PRICE[model];
    const cacheRead = u.cache_read_input_tokens ?? 0;
    const cacheWrite = u.cache_creation_input_tokens ?? 0;
    this.usd +=
      (u.input_tokens * p.in + cacheWrite * p.in * 1.25 + cacheRead * p.cacheRead + u.output_tokens * p.out) / 1e6 +
      (u.server_tool_use?.web_search_requests ?? 0) * SEARCH_COST;
  }
}

export type ToolEvent =
  | { kind: "search"; query: string; hits: { url: string; title: string }[] }
  | { kind: "fetch"; url: string; ok: boolean };

export type ServerTools = { search?: { maxUses: number }; fetch?: { maxUses: number; maxContentTokens?: number } };

export interface CallOpts<T> {
  model: ModelKey;
  system: string;
  /** Extra instructions placed AFTER the cached system block, so calls that share `system` share the cache. */
  instructions?: string;
  user: string;
  schema: z.ZodType<T>;
  tools?: ServerTools;
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
  maxTokens?: number;
  signal?: AbortSignal;
  meter?: CostMeter;
  onToolEvent?: (e: ToolEvent) => void;
}

/** One structured-output call, looping on pause_turn when server tools run long. */
export async function callModel<T>(o: CallOpts<T>): Promise<T> {
  const tools: Anthropic.Beta.BetaToolUnion[] = [];
  // Deliberately the BASIC tool variants. The *_20260209 "dynamic filtering" variants run model-written code in a hidden
  // sandbox; in testing that code printed nothing back, the model never saw the results, returned an empty source list
  // and filled gaps from memory. The basic variants put results straight into context.
  if (o.tools?.search) tools.push({ type: "web_search_20250305", name: "web_search", max_uses: o.tools.search.maxUses });
  if (o.tools?.fetch)
    tools.push({
      type: "web_fetch_20250910",
      name: "web_fetch",
      max_uses: o.tools.fetch.maxUses,
      max_content_tokens: o.tools.fetch.maxContentTokens ?? 12000,
    });

  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: o.user }];
  // Constrained decoding is preferred. If the schema is too large for the API's grammar compiler, fall back to
  // asking for plain JSON and validating it with zod (one repair attempt).
  let constrained = true;
  let repaired = false;
  const jsonInstruction = () =>
    `\n\nRespond with ONLY one JSON object, no prose and no code fences, that matches this JSON Schema:\n${JSON.stringify(z.toJSONSchema(o.schema))}`;

  for (let turn = 0; turn < 6; turn++) {
    let msg: Awaited<ReturnType<ReturnType<ReturnType<typeof getClient>["beta"]["messages"]["stream"]>["finalMessage"]>>;
    try {
      const stream = getClient().beta.messages.stream(
        {
          model: MODELS[o.model],
          max_tokens: o.maxTokens ?? 16000,
          system: [
            { type: "text", text: o.system, cache_control: { type: "ephemeral" } },
            ...(o.instructions || !constrained ? [{ type: "text", text: (o.instructions ?? "") + (constrained ? "" : jsonInstruction()) }] : []),
          ],
          messages,
          tools: tools.length ? tools : undefined,
          output_config: constrained ? { effort: o.effort ?? "medium", format: zodOutputFormat(o.schema) } : { effort: o.effort ?? "medium" },
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
        } as unknown as Anthropic.Beta.Messages.MessageCreateParams,
        { signal: o.signal },
      );
      msg = await stream.finalMessage();
    } catch (e) {
      if (constrained && e instanceof Anthropic.BadRequestError && /grammar is too large/i.test(e.message)) {
        constrained = false;
        continue;
      }
      throw e;
    }
    o.meter?.add(o.model, msg.usage as never);
    emitToolEvents(msg.content, o.onToolEvent);

    if (msg.stop_reason === "refusal") throw new Error(`model refused: ${JSON.stringify(msg.stop_details ?? {})}`);
    if (msg.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: msg.content });
      continue;
    }
    if (msg.stop_reason === "max_tokens") throw new Error("max_tokens reached before structured output completed");

    let text: string | undefined;
    for (const b of [...msg.content].reverse()) {
      if (b.type === "text") {
        text = (b as { text: string }).text;
        break;
      }
    }
    if (!text) throw new Error("no text block in response");
    const json = constrained ? text : text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    try {
      return o.schema.parse(JSON.parse(json));
    } catch (err) {
      if (constrained || repaired) throw err;
      repaired = true;
      messages.push({ role: "assistant", content: text }, { role: "user", content: `That did not validate: ${String(err).slice(0, 1500)}. Return the corrected JSON object only.` });
      continue;
    }
  }
  throw new Error("too many pause_turn continuations");
}

function emitToolEvents(content: Anthropic.Beta.BetaContentBlock[], on?: (e: ToolEvent) => void) {
  if (!on) return;
  for (const b of content) {
    if (b.type === "server_tool_use" && b.name === "web_search") {
      // hits are attached when the matching result block arrives below
      continue;
    }
    if (b.type === "web_search_tool_result") {
      const hits = Array.isArray(b.content)
        ? b.content.map((r) => ({ url: r.url, title: r.title ?? r.url }))
        : [];
      const q = findQuery(content, b.tool_use_id);
      on({ kind: "search", query: q, hits });
    }
    if (b.type === "web_fetch_tool_result") {
      const ok = !("error_code" in (b.content as object));
      const url = findFetchUrl(content, b.tool_use_id);
      on({ kind: "fetch", url, ok });
    }
  }
}
function findQuery(content: Anthropic.Beta.BetaContentBlock[], id: string): string {
  const u = content.find((c) => c.type === "server_tool_use" && c.id === id);
  return u && u.type === "server_tool_use" ? String((u.input as { query?: string }).query ?? "") : "";
}
function findFetchUrl(content: Anthropic.Beta.BetaContentBlock[], id: string): string {
  const u = content.find((c) => c.type === "server_tool_use" && c.id === id);
  return u && u.type === "server_tool_use" ? String((u.input as { url?: string }).url ?? "") : "";
}
