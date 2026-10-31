import { crawl } from '../lib/finder.js';
import { save } from '../lib/store.js';
export const config = { maxDuration: 300 };
// Daily Vercel cron (Hobby allows once a day). Vercel sends "Authorization: Bearer $CRON_SECRET" when CRON_SECRET is set.
export default async function handler(req, res) {
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ error: 'unauthorized' });
  const data = await crawl();
  await save(data);
  res.status(200).json({ ok: true, count: data.count, notes: data.notes, crawled_at: data.crawled_at });
}
