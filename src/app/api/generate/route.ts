import { generateGuide } from "@/pipeline/run";
import { allowGeneration } from "@/lib/rate-limit";
import type { GenEvent } from "@/lib/schema";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const inflight = new Map<string, Promise<unknown>>();

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { q?: string; force?: boolean };
  const q = (body.q ?? "").trim().slice(0, 100);
  if (q.length < 2) return Response.json({ error: "Enter an app name or website." }, { status: 400 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "Server is missing ANTHROPIC_API_KEY." }, { status: 503 });

  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  const gate = await allowGeneration(ip);
  if (!gate.ok) return Response.json({ error: gate.reason }, { status: 429 });

  const key = q.toLowerCase();
  if (inflight.has(key)) return Response.json({ error: "That app is already being generated. Try again in a minute." }, { status: 409 });

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: GenEvent) => controller.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`));
      const beat = setInterval(() => controller.enqueue(enc.encode(": ping\n\n")), 10_000);
      const run = generateGuide(q, send, { force: body.force, signal: req.signal, createdBy: "live" });
      inflight.set(key, run);
      try {
        await run;
      } catch (e) {
        send({ type: "error", stage: "synthesize", message: e instanceof Error ? e.message : String(e), recoverable: false });
      } finally {
        inflight.delete(key);
        clearInterval(beat);
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-store, no-transform", "x-accel-buffering": "no" },
  });
}
