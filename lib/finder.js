// Finder: crawls public MCP registries for local recommendation / referral / contractor servers.
const UA = 'TonaquintFinder/0.1 (+https://tonaquint.cc/mcp)';
export const QUERIES = ['referral', 'contractor', 'home services', 'handyman', 'local business', 'recommendation', 'plumber', 'roofing', 'painting', 'home improvement', 'real estate', 'yelp'];
const KEYWORDS = /referr|contractor|home ?service|handyman|local (business|service|pro)|recommend|plumb|roof|paint|electric|hvac|landscap|remodel|home improvement|tradesp|service provider|yelp|angi|thumbtack|nextdoor|real estate|realtor/i;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const robotsCache = new Map();
export function robotsAllows(txt, pathname, agent = 'tonaquintfinder') {
  // Minimal robots.txt: groups for our agent, else '*'; longest matching Allow/Disallow prefix wins.
  const groups = []; let cur = null, lastWasUA = false;
  for (const raw of txt.split('\n')) {
    const line = raw.replace(/#.*/, '').trim(); const i = line.indexOf(':'); if (i < 0) continue;
    const k = line.slice(0, i).trim().toLowerCase(), v = line.slice(i + 1).trim();
    if (k === 'user-agent') { if (!lastWasUA) groups.push(cur = { agents: [], rules: [] }); cur.agents.push(v.toLowerCase()); lastWasUA = true; continue; }
    lastWasUA = false; if (cur && (k === 'allow' || k === 'disallow')) cur.rules.push({ allow: k === 'allow', path: v });
  }
  const g = groups.filter(x => x.agents.some(a => agent.includes(a) && a !== '*'));
  const rules = (g.length ? g : groups.filter(x => x.agents.includes('*'))).flatMap(x => x.rules).filter(r => r.path && pathname.startsWith(r.path));
  if (!rules.length) return true;
  rules.sort((a, b) => b.path.length - a.path.length || (b.allow - a.allow)); return rules[0].allow;
}
async function allowed(url) {
  const u = new URL(url);
  if (!robotsCache.has(u.origin)) {
    let txt = '';
    try { const r = await fetch(u.origin + '/robots.txt', { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(5000) }); if (r.ok && !/json/.test(r.headers.get('content-type') || '')) txt = await r.text(); } catch {}
    robotsCache.set(u.origin, txt);
  }
  return robotsAllows(robotsCache.get(u.origin), u.pathname);
}
async function getJson(url, headers = {}) {
  if (!(await allowed(url))) throw new Error(`robots.txt disallows ${url}`);
  const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json', ...headers }, signal: AbortSignal.timeout(10000) });
  if (r.status === 429) { await sleep(5000); throw new Error(`rate limited ${url}`); }
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}
export async function fromOfficial(q) {
  const j = await getJson(`https://registry.modelcontextprotocol.io/v0/servers?search=${encodeURIComponent(q)}&limit=100`);
  return (j.servers || []).map(({ server: s }) => ({ source: 'official', name: s.name, title: s.title || s.name, description: s.description || '',
    url: s.remotes?.[0]?.url || s.websiteUrl || s.repository?.url || null, remote: !!s.remotes?.length, repository: s.repository?.url || null }));
}
export async function fromSmithery(q) {
  const headers = process.env.SMITHERY_API_KEY ? { authorization: `Bearer ${process.env.SMITHERY_API_KEY}` } : {};
  const j = await getJson(`https://registry.smithery.ai/servers?q=${encodeURIComponent(q)}&pageSize=50`, headers);
  return (j.servers || []).map(s => ({ source: 'smithery', name: s.qualifiedName, title: s.displayName || s.qualifiedName, description: s.description || '',
    url: s.homepage || `https://smithery.ai/server/${s.qualifiedName}`, remote: !!s.remote, repository: null }));
}
export async function fromGlama(q) {
  if (!process.env.GLAMA_API_KEY) return null; // Glama's API requires a key (and attribution); skipped without one.
  const j = await getJson(`https://glama.ai/api/mcp/v1/servers?query=${encodeURIComponent(q)}&first=50`, { authorization: `Bearer ${process.env.GLAMA_API_KEY}` });
  return (j.servers || []).map(s => ({ source: 'glama', name: s.slug || s.name, title: s.name, description: s.description || '', url: s.url || null, remote: !!s.url, repository: s.repository?.url || null }));
}
export const relevant = s => KEYWORDS.test(`${s.name} ${s.title} ${s.description}`);
export async function wellKnown(origin) {
  for (const p of ['/.well-known/mcp.json', '/.well-known/mcp/server-card.json', '/.well-known/mcp']) {
    try { const j = await getJson(origin + p); if (j && typeof j === 'object') return { path: p, endpoint: j.endpoint || j.transport?.url || j.url || null, name: j.name || null }; } catch {}
  }
  return null;
}
export async function crawl({ queries = QUERIES, delayMs = 400, wellKnownLimit = 25, log = () => {} } = {}) {
  const found = new Map(), notes = [];
  const sources = { official: fromOfficial, smithery: fromSmithery, glama: fromGlama };
  for (const [name, fn] of Object.entries(sources)) {
    for (const q of queries) {
      try {
        const rows = await fn(q);
        if (rows === null) { notes.push(`${name}: skipped (needs ${name.toUpperCase()}_API_KEY)`); break; }
        for (const r of rows.filter(relevant)) { const key = `${r.source}:${r.name}`; const prev = found.get(key); found.set(key, { ...r, matched: [...new Set([...(prev?.matched || []), q])] }); }
      } catch (e) { notes.push(`${name} "${q}": ${e.message}`); }
      await sleep(delayMs);
    }
    log(`${name}: ${[...found.values()].filter(x => x.source === name).length}`);
  }
  // Dedupe across registries by remote URL.
  const byUrl = new Map();
  for (const r of found.values()) { const k = (r.remote && r.url) || `${r.source}:${r.name}`; const p = byUrl.get(k); byUrl.set(k, p ? { ...p, sources: [...new Set([...p.sources, r.source])] } : { ...r, sources: [r.source] }); }
  const results = [...byUrl.values()];
  const origins = [...new Set(results.filter(r => r.remote && r.url).map(r => { try { return new URL(r.url).origin; } catch { return null; } }).filter(Boolean))].slice(0, wellKnownLimit);
  for (const o of origins) { const wk = await wellKnown(o); if (wk) for (const r of results) if (r.url?.startsWith(o)) r.well_known = wk; await sleep(delayMs); }
  return { crawled_at: new Date().toISOString(), count: results.length, notes, results };
}
const REGIONS = /\b(utah|st\.? george|washington county|nevada|arizona|las vegas|usa|us|united states|uk|canada|australia|global|nationwide)\b/i;
export function search(data, query = '', region = '') {
  const q = String(query).toLowerCase().split(/\s+/).filter(Boolean), r = String(region).toLowerCase();
  return (data?.results || []).filter(s => { const t = `${s.name} ${s.title} ${s.description}`.toLowerCase(); return q.every(w => t.includes(w)) && (!r || t.includes(r) || !REGIONS.test(t)); });
}
