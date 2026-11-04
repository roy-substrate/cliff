import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Production: Upstash. Local/dev: in-memory fallback so nothing needs to be provisioned to try the app.
const hasUpstash = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
const redis = hasUpstash ? Redis.fromEnv() : null;
const hourly = redis ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, "1 h"), prefix: "cliff:h" }) : null;
const daily = redis ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, "1 d"), prefix: "cliff:d" }) : null;
const global = redis ? new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(Number(process.env.DAILY_GEN_CAP ?? 80), "1 d"), prefix: "cliff:g" }) : null;

const mem = new Map<string, number[]>();
function memHit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (mem.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) {
    mem.set(key, arr);
    return false;
  }
  arr.push(now);
  mem.set(key, arr);
  return true;
}

export async function allowGeneration(ip: string): Promise<{ ok: boolean; reason?: string }> {
  if (hourly && daily && global) {
    if (!(await global.limit("all")).success) return { ok: false, reason: "The daily generation budget for this demo is used up. Browse the library instead." };
    if (!(await hourly.limit(ip)).success) return { ok: false, reason: "Limit: 3 live generations per hour per visitor." };
    if (!(await daily.limit(ip)).success) return { ok: false, reason: "Limit: 20 live generations per day per visitor." };
    return { ok: true };
  }
  if (!memHit(`h:${ip}`, 3, 3600_000)) return { ok: false, reason: "Limit: 3 live generations per hour per visitor." };
  if (!memHit(`d:${ip}`, 20, 86_400_000)) return { ok: false, reason: "Limit: 20 live generations per day per visitor." };
  return { ok: true };
}

export function allowArtifact(ip: string): boolean {
  return memHit(`a:${ip}`, 15, 3600_000);
}
