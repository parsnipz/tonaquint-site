// Finder results storage: Vercel Blob when BLOB_READ_WRITE_TOKEN is set (auto-added when a Blob store is linked to the project), else a local file.
import fs from 'node:fs';
const KEY = 'finder/referral-servers.json';
const LOCAL = new URL('../.finder-cache.json', import.meta.url);
export async function save(data) {
  const body = JSON.stringify(data);
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import('@vercel/blob');
    return put(KEY, body, { access: 'public', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 3600 });
  }
  fs.writeFileSync(LOCAL, body); return { local: LOCAL.pathname };
}
export async function load() {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { list } = await import('@vercel/blob');
    const { blobs } = await list({ prefix: KEY, limit: 1 });
    if (!blobs.length) return null;
    const r = await fetch(blobs[0].url, { cache: 'no-store' }); return r.ok ? r.json() : null;
  }
  try { return JSON.parse(fs.readFileSync(LOCAL, 'utf8')); } catch { return null; }
}
