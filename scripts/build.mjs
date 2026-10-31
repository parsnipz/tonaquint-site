import fs from 'node:fs';
import path from 'node:path';
export const SITE = 'https://tonaquint.cc';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function parseFrontmatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: src };
  const data = {};
  for (const line of m[1].split('\n')) { const i = line.indexOf(':'); if (i > 0) data[line.slice(0, i).trim()] = line.slice(i + 1).trim(); }
  return { data, body: m[2] };
}
const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>')
  .replace(/`(.+?)`/g, '<code>$1</code>').replace(/\[(.+?)\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)/g, '<a href="$2">$1</a>');
export function markdown(md) {
  const out = []; let list = false;
  for (const block of md.trim().split(/\n{2,}/)) {
    const lines = block.split('\n');
    if (lines.every(l => /^[-*] /.test(l))) { out.push('<ul>' + lines.map(l => `<li>${inline(l.slice(2))}</li>`).join('') + '</ul>'); continue; }
    const h = block.match(/^(#{1,4}) (.+)$/);
    if (h) { const n = h[1].length + 1; out.push(`<h${n}>${inline(h[2])}</h${n}>`); continue; }
    out.push(`<p>${inline(lines.join(' '))}</p>`);
  }
  return out.join('\n');
}
export function page({ title, description, urlPath, body, type = 'website' }) {
  const url = SITE + urlPath;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${url}">
<meta property="og:type" content="${type}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${url}"><meta property="og:site_name" content="Tonaquint"><meta name="twitter:card" content="summary">
<link rel="alternate" type="application/rss+xml" href="/feed.xml"><style>body{font:17px/1.6 system-ui,sans-serif;max-width:680px;margin:2rem auto;padding:0 1rem;color:#222}a{color:#0b5}nav a{margin-right:1rem}time{color:#777}</style></head>
<body><nav><a href="/">Home</a><a href="/subs">Recommended pros</a></nav><main>${body}</main></body></html>`;
}
export function loadPosts(dir = path.join(root, 'posts')) {
  return fs.readdirSync(dir).filter(f => f.endsWith('.md')).map(f => {
    const { data, body } = parseFrontmatter(fs.readFileSync(path.join(dir, f), 'utf8'));
    return { slug: f.replace(/\.md$/, ''), title: data.title || f, date: data.date || '', description: data.description || '', html: markdown(body) };
  }).filter(p => p.title).sort((a, b) => b.date.localeCompare(a.date));
}
export function build(outDir = path.join(root, 'public')) {
  fs.rmSync(outDir, { recursive: true, force: true }); fs.mkdirSync(path.join(outDir, 'posts'), { recursive: true });
  const w = (p, s) => { fs.mkdirSync(path.dirname(path.join(outDir, p)), { recursive: true }); fs.writeFileSync(path.join(outDir, p), s); };
  const posts = loadPosts();
  const subs = JSON.parse(fs.readFileSync(path.join(root, 'data/subs.json'), 'utf8'));
  w('index.html', page({ title: 'Tonaquint', description: 'Posts and thoughts from a new homeowner.', urlPath: '/',
    body: '<h1>Tonaquint</h1><p>Posts and thoughts from a new homeowner.</p><ul>' + posts.map(p => `<li><a href="/posts/${p.slug}">${esc(p.title)}</a> <time datetime="${p.date}">${p.date}</time></li>`).join('') + '</ul>' }));
  for (const p of posts) w(`posts/${p.slug}.html`, page({ title: p.title, description: p.description, urlPath: `/posts/${p.slug}`, type: 'article',
    body: `<article><h1>${esc(p.title)}</h1><time datetime="${p.date}">${p.date}</time>${p.html}</article>` }));
  w('subs.html', page({ title: 'Recommended pros', description: 'Local contractors we recommend.', urlPath: '/subs',
    body: '<h1>Recommended pros</h1>' + subs.map(s => `<section><h2>${esc(s.name)}</h2><p>${esc(s.trades.join(', '))}<br>Serves the ${esc(s.service_area)}<br><a href="tel:${s.phone.replace(/\D/g, '')}">${esc(s.phone)}</a> · <a href="mailto:${esc(s.email)}">${esc(s.email)}</a></p></section>`).join('') }));
  const urls = ['/', '/subs', ...posts.map(p => `/posts/${p.slug}`)];
  w('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u => `<url><loc>${SITE}${u}</loc></url>`).join('')}</urlset>\n`);
  w('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
  w('feed.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>Tonaquint</title><link>${SITE}/</link><description>Posts and thoughts from a new homeowner.</description>${posts.map(p => `<item><title>${esc(p.title)}</title><link>${SITE}/posts/${p.slug}</link><guid>${SITE}/posts/${p.slug}</guid><pubDate>${new Date(p.date).toUTCString()}</pubDate><description>${esc(p.description)}</description></item>`).join('')}</channel></rss>\n`);
  const card = { name: 'tonaquint-referrals', title: 'Tonaquint referrals', description: 'Read-only directory of local contractors we recommend around St. George, Utah.',
    version: '0.1.0', transport: { type: 'streamable-http', url: `${SITE}/mcp` }, endpoint: `${SITE}/mcp`, authentication: { required: false },
    tools: ['list_subs', 'recommend_sub', 'get_sub', 'find_referral_servers'], related: { referral_servers_json: `${SITE}/api/referral-servers` } };
  w('.well-known/mcp.json', JSON.stringify(card, null, 2));
  w('.well-known/mcp/server-card.json', JSON.stringify(card, null, 2));
  return { posts, urls, w };
}
if (process.argv[1] === new URL(import.meta.url).pathname) { const r = build(); console.log(`built ${r.urls.length} pages`); }
