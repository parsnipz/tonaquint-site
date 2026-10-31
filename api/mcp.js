import { handleBody } from '../lib/mcp.js';
// Stateless streamable-HTTP MCP endpoint (JSON responses, no sessions, no auth, read-only).
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, mcp-protocol-version, mcp-session-id, accept');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).setHeader('Allow', 'POST, OPTIONS').json({ jsonrpc: '2.0', id: null, error: { code: -32000, message: 'Use POST (stateless server, no SSE stream).' } });
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { return res.status(400).json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }); } }
  const out = await handleBody(body);
  if (out === null) return res.status(202).end();
  res.status(200).json(out);
}
