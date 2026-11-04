import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { get, list, put } from "@vercel/blob";
import type { Guide } from "./schema";

/**
 * Two stores:
 *  - Library guides: committed JSON in data/guides, read from disk (shipped with the deployment).
 *  - Live guides: Vercel Blob when BLOB_READ_WRITE_TOKEN is set (production). Serverless disks are per-instance
 *    and temporary, so a guide written there 404s on the next request. Locally, without a token, live guides
 *    are written to data/guides like the library.
 */
const LIBRARY = path.join(process.cwd(), "data", "guides");
const LOCAL = process.env.CLIFF_DATA_DIR ? process.env.CLIFF_DATA_DIR : process.env.VERCEL ? path.join(os.tmpdir(), "cliff-guides") : LIBRARY;
const useBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;
const BLOB_PREFIX = "guides/";

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
const slugOfVersion = (versionId: string) => versionId.replace(/-\d{12}-[a-z0-9]{4}$/, "");

// ---------------- disk (library + local dev) ----------------

function readFrom(root: string, slug: string, versionId?: string): StoredVersion | null {
  try {
    const dir = path.join(root, slug);
    const id = versionId ?? JSON.parse(fs.readFileSync(/*turbopackIgnore: true*/ path.join(dir, "latest.json"), "utf8")).versionId;
    return JSON.parse(fs.readFileSync(/*turbopackIgnore: true*/ path.join(dir, `${id}.json`), "utf8"));
  } catch {
    return null;
  }
}

function saveLocal(v: StoredVersion): void {
  const dir = path.join(LOCAL, v.slug);
  fs.mkdirSync(/*turbopackIgnore: true*/ dir, { recursive: true });
  fs.writeFileSync(/*turbopackIgnore: true*/ path.join(dir, `${v.versionId}.json`), JSON.stringify(v, null, 2));
  fs.writeFileSync(/*turbopackIgnore: true*/ path.join(dir, "latest.json"), JSON.stringify({ versionId: v.versionId }));
}

/** Sync, disk-only reads. For CLI scripts. */
export function getLatestLocal(slug: string): StoredVersion | null {
  return readFrom(LOCAL, slug) ?? readFrom(LIBRARY, slug);
}
export function getVersionLocal(versionId: string): StoredVersion | null {
  const slug = slugOfVersion(versionId);
  return readFrom(LOCAL, slug, versionId) ?? readFrom(LIBRARY, slug, versionId);
}
export function listLatestLocal(): StoredVersion[] {
  const out = new Map<string, StoredVersion>();
  for (const root of [LIBRARY, LOCAL]) {
    if (!fs.existsSync(/*turbopackIgnore: true*/ root)) continue;
    for (const slug of fs.readdirSync(/*turbopackIgnore: true*/ root)) {
      if (slug.startsWith(".")) continue;
      const v = readFrom(root, slug);
      if (v && v.guide.status !== "fallback") out.set(slug, v); // fallbacks stay reachable by link only
    }
  }
  return [...out.values()];
}

// ---------------- blob (live guides in production) ----------------

async function blobRead(pathname: string): Promise<StoredVersion | null> {
  try {
    const r = await get(pathname, { access: "private", useCache: false });
    if (!r || r.statusCode !== 200) return null;
    return JSON.parse(await new Response(r.stream).text());
  } catch {
    return null;
  }
}

/** Version ids embed a UTC timestamp, so the lexically greatest pathname per slug is the newest. */
async function blobLatestPaths(prefix: string): Promise<Map<string, string>> {
  const latest = new Map<string, string>();
  let cursor: string | undefined;
  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    for (const b of page.blobs) {
      const slug = b.pathname.slice(BLOB_PREFIX.length).split("/")[0];
      const cur = latest.get(slug);
      if (!cur || b.pathname > cur) latest.set(slug, b.pathname);
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return latest;
}

// ---------------- public API (async; used by the app and the pipeline) ----------------

export async function saveVersion(v: StoredVersion): Promise<void> {
  if (useBlob()) {
    await put(`${BLOB_PREFIX}${v.slug}/${v.versionId}.json`, JSON.stringify(v), {
      access: "private",
      addRandomSuffix: false,
      contentType: "application/json",
    });
    return;
  }
  saveLocal(v);
}

export async function getVersion(versionId: string): Promise<StoredVersion | null> {
  const local = getVersionLocal(versionId);
  if (local || !useBlob()) return local;
  return blobRead(`${BLOB_PREFIX}${slugOfVersion(versionId)}/${versionId}.json`);
}

export async function getLatest(slug: string): Promise<StoredVersion | null> {
  const local = getLatestLocal(slug);
  if (!useBlob()) return local;
  const p = (await blobLatestPaths(`${BLOB_PREFIX}${slug}/`).catch(() => new Map<string, string>())).get(slug);
  const live = p ? await blobRead(p) : null;
  if (!live) return local;
  if (!local) return live;
  return new Date(live.created_at) > new Date(local.created_at) ? live : local;
}

export async function listLatest(): Promise<StoredVersion[]> {
  const out = new Map(listLatestLocal().map((v) => [v.slug, v]));
  if (useBlob()) {
    const paths = await blobLatestPaths(BLOB_PREFIX).catch(() => new Map<string, string>());
    const live = await Promise.all([...paths.entries()].filter(([slug]) => !out.has(slug)).map(([, p]) => blobRead(p)));
    for (const v of live) if (v && v.guide.status !== "fallback") out.set(v.slug, v);
  }
  return [...out.values()].sort((a, b) => a.slug.localeCompare(b.slug));
}
