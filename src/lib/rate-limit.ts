import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Live generation costs real money (about $0.35 to $0.75 a run), so three caps apply:
 * per visitor per hour, per visitor per day, and a global daily budget. Upstash makes them shared across
 * instances; without it an in-memory limiter runs per instance, which is approximate but still bounds spend.
 */
const PER_HOUR = 5;
const PER_DAY = 15;
const GLOBAL_PER_DAY = Number(process.env.DAILY_GEN_CAP ?? 20);

const hasUpstash = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
const redis = hasUpstash ? Redis.fromEnv() : null;
const hourly = redis ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(PER_HOUR, "1 h"), prefix: "cliff:h" }) : null;
const daily = redis ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(PER_DAY, "1 d"), prefix: "cliff:d" }) : null;
const global = redis ? new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(GLOBAL_PER_DAY, "1 d"), prefix: "cliff:g" }) : null;

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

const MSG = {
  global: "Today's budget for live investigations is used up. The directory still has every guide, and it's free to browse.",
  hour: `That's ${PER_HOUR} live investigations in an hour from your network. Give Pip a short break, or open a guide from the directory.`,
  day: `That's ${PER_DAY} live investigations today from your network. The directory is still open.`,
};

export async function allowGeneration(ip: string): Promise<{ ok: boolean; reason?: string }> {
  if (hourly && daily && global) {
    if (!(await global.limit("all")).success) return { ok: false, reason: MSG.global };
    if (!(await hourly.limit(ip)).success) return { ok: false, reason: MSG.hour };
    if (!(await daily.limit(ip)).success) return { ok: false, reason: MSG.day };
    return { ok: true };
  }
  if (!memHit("g:all", GLOBAL_PER_DAY, 86_400_000)) return { ok: false, reason: MSG.global };
  if (!memHit(`h:${ip}`, PER_HOUR, 3600_000)) return { ok: false, reason: MSG.hour };
  if (!memHit(`d:${ip}`, PER_DAY, 86_400_000)) return { ok: false, reason: MSG.day };
  return { ok: true };
}

export function allowArtifact(ip: string): boolean {
  return memHit(`a:${ip}`, 15, 3600_000);
}
