import { loadSubs, recommend } from './subs.js';
import { load } from './store.js';
import { search } from './finder.js';
export const PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const text = obj => ({ content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }], structuredContent: Array.isArray(obj) ? { results: obj } : obj });
export const tools = {
  list_subs: {
    description: 'List every subcontractor we recommend, with trades, service area and contact info.',
    inputSchema: { type: 'object', properties: {} },
    run: async () => text(loadSubs())
  },
  recommend_sub: {
    description: 'Recommend subcontractors for a trade (e.g. "painting", "stucco") in a town (e.g. "St. George").',
    inputSchema: { type: 'object', properties: { trade: { type: 'string' }, town: { type: 'string' } }, required: ['trade'] },
    run: async ({ trade, town }) => text(recommend(loadSubs(), trade, town))
  },
  find_referral_servers: {
    description: 'Search other public MCP servers (found daily in the official MCP registry, Smithery, Glama and /.well-known discovery) that offer local recommendations, referrals or contractors.',
    inputSchema: { type: 'object', properties: { query: { type: 'string' }, region: { type: 'string' } } },
    annotations: { openWorldHint: true },
    run: async ({ query, region }) => { const d = await load(); if (!d) return { isError: true, content: [{ type: 'text', text: 'Finder has not run yet.' }] }; const r = search(d, query, region); return text({ crawled_at: d.crawled_at, count: r.length, results: r.slice(0, 50) }); }
  },
  get_sub: {
    description: 'Get one subcontractor by id.',
    inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    run: async ({ id }) => { const s = loadSubs().find(x => x.id === id); return s ? text(s) : { isError: true, content: [{ type: 'text', text: `No sub with id ${id}` }] }; }
  }
};
const ann = { readOnlyHint: true, openWorldHint: false };
export async function handleMessage(msg) {
  const { id, method, params = {} } = msg || {};
  const ok = result => ({ jsonrpc: '2.0', id, result });
  const err = (code, message) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });
  if (!msg || msg.jsonrpc !== '2.0' || typeof method !== 'string') return err(-32600, 'Invalid Request');
  if (id === undefined) return null; // notification
  switch (method) {
    case 'initialize': {
      const v = PROTOCOL_VERSIONS.includes(params.protocolVersion) ? params.protocolVersion : PROTOCOL_VERSIONS[0];
      return ok({ protocolVersion: v, capabilities: { tools: { listChanged: false } }, serverInfo: { name: 'tonaquint-referrals', version: '0.1.0' },
        instructions: 'Read-only referral directory of local contractors we recommend around St. George, Utah.' });
    }
    case 'ping': return ok({});
    case 'tools/list': return ok({ tools: Object.entries(tools).map(([name, t]) => ({ name, description: t.description, inputSchema: t.inputSchema, annotations: { ...ann, ...(t.annotations || {}) } })) });
    case 'tools/call': {
      const t = tools[params.name];
      if (!t) return err(-32602, `Unknown tool: ${params.name}`);
      try { return ok(await t.run(params.arguments || {})); } catch (e) { return ok({ isError: true, content: [{ type: 'text', text: String(e.message || e) }] }); }
    }
    default: return err(-32601, `Method not found: ${method}`);
  }
}
export async function handleBody(body) {
  if (Array.isArray(body)) { const r = (await Promise.all(body.map(handleMessage))).filter(Boolean); return r.length ? r : null; }
  return handleMessage(body);
}
