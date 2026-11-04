import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Guide } from "./schema";

/**
 * Library guides live in data/guides (committed). Live-generated guides go to data/guides locally,
 * and to the OS temp dir on Vercel (read-only FS, ephemeral). Set DATABASE_URL later to swap this for Postgres.
 */
const ROOT = process.env.CLIFF_DATA_DIR ? process.env.CLIFF_DATA_DIR : process.env.VERCEL ? path.join(os.tmpdir(), "cliff-guides") : path.join(process.cwd(), "data", "guides");
const LIBRARY = path.join(process.cwd(), "data", "guides");

export interface StoredVersion {
  versionId: string;
  slug: string;
  created_at: string;
  created_by: "library" | "live" | "reverify";
  cost_usd: number;
  guide: Guide;
}

export function newVersionId(slug: string): string {
  const d = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12);
  return `${slug}-${d}-${Math.random().toString(36).slice(2, 6)}`;
}

export function saveVersion(v: StoredVersion): void {
  const dir = path.join(ROOT, v.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${v.versionId}.json`), JSON.stringify(v, null, 2));
  fs.writeFileSync(path.join(dir, "latest.json"), JSON.stringify({ versionId: v.versionId }));
}

function readFrom(root: string, slug: string, versionId?: string): StoredVersion | null {
  try {
    const dir = path.join(root, slug);
    const id = versionId ?? JSON.parse(fs.readFileSync(path.join(dir, "latest.json"), "utf8")).versionId;
    return JSON.parse(fs.readFileSync(path.join(dir, `${id}.json`), "utf8"));
  } catch {
    return null;
  }
}

export function getLatest(slug: string): StoredVersion | null {
  return readFrom(ROOT, slug) ?? readFrom(LIBRARY, slug);
}

export function getVersion(versionId: string): StoredVersion | null {
  const slug = versionId.replace(/-\d{12}-[a-z0-9]{4}$/, "");
  return readFrom(ROOT, slug, versionId) ?? readFrom(LIBRARY, slug, versionId);
}

export function listLatest(): StoredVersion[] {
  const out = new Map<string, StoredVersion>();
  for (const root of [LIBRARY, ROOT]) {
    if (!fs.existsSync(root)) continue;
    for (const slug of fs.readdirSync(root)) {
      const v = readFrom(root, slug);
      // fallback guides (not enough sources) stay reachable by link but are not library entries
      if (v && v.guide.status !== "fallback") out.set(slug, v);
    }
  }
  return [...out.values()].sort((a, b) => a.slug.localeCompare(b.slug));
}
