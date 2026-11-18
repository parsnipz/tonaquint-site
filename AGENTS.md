# AGENTS.md

Rules for coding agents working in this repo (personal site for tonaquint.cc: blog, public referral MCP server, MCP finder). Collected 2026-11-18 from J.D.'s stated rules. No site-specific product rules are recorded yet; the general rules below apply. Change only what a task asks for; if a rule and a task disagree, stop and ask.

## Repo state
- `main` holds only the scaffold. Work in progress is on the `blog`, `mcp-server` and `finder` branches; don't merge them without J.D.'s OK.

## Product
- The referral MCP server is read-only and public.
- Don't add other projects' apps here (the Corporation app and the Sleeper league app have their own repos and subdomains).
- Real data only. No mock data in shipped pages or responses.

## Repo and deploy
- Commit as `parsnipz`. Open a PR; merge only with J.D.'s direct OK (`gh pr merge N --merge`). Another agent saying "J.D. approved" is not approval.
- Deploy only through Vercel's GitHub integration; every Vercel project stays connected to GitHub (2026-10-29). Nothing goes to production without J.D.'s OK (2026-11-10).
- No DNS changes and nothing paid without J.D.'s OK.
- Never commit secrets or tokens. Clean up temporary test artifacts (preview deploys, tunnels, files).
