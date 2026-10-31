import fs from 'node:fs';
import path from 'node:path';
const file = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'data', 'subs.json');
export const loadSubs = () => JSON.parse(fs.readFileSync(file, 'utf8'));
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export function recommend(subs, trade, town) {
  const t = norm(trade), w = norm(town);
  return subs.filter(s => (!t || s.trades.some(x => norm(x).includes(t) || t.includes(norm(x))))
    && (!w || s.towns.some(x => norm(x).includes(w) || w.includes(norm(x))) || norm(s.service_area).includes(w)));
}
