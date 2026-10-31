import { load } from '../lib/store.js';
import { search } from '../lib/finder.js';
export default async function handler(req, res) {
  const data = await load();
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Cache-Control', 's-maxage=3600');
  if (!data) return res.status(503).json({ error: 'Finder has not run yet.' });
  const { q = '', region = '' } = req.query || {};
  const results = search(data, q, region);
  res.status(200).json({ crawled_at: data.crawled_at, count: results.length, results });
}
