# ChatGPT MCP with Express

A stateless **Model Context Protocol** (MCP) server using Express and the TypeScript MCP SDK, deployed as a Vercel function. Compatible with MCP Streamable HTTP clients.

> GitHub repository retains its original name `grok-mcp-with-express`. Vercel project: `chatgpt-mcp-with-express`.

## Endpoints

- `GET /` — lightweight health check (returns JSON)
- `POST /mcp` — **recommended** Streamable HTTP MCP endpoint for ChatGPT and other MCP clients
- `POST /` — legacy MCP endpoint retained for existing Grok clients
- `GET /mcp` — returns 405 because the server is stateless; this is intentional

Production MCP URL:

`https://chatgpt-mcp-with-express-kaleb-s-projects1.vercel.app/mcp`

## Tools

- `get-alerts` — US National Weather Service weather alerts by state
- `get-forecast` — US National Weather Service forecast by latitude/longitude
- `hello` — MCP connection test
- `get_current_time` — server time
- `calculate` — arithmetic
- `random_number` — random integer

The tools are defined in `src/create-server.ts`. MCP server/transport creation and Express routes are in `src/index.ts`.

## Test connection

Use MCP Inspector and select **Streamable HTTP** with the production `/mcp` URL.

```bash
npx @modelcontextprotocol/inspector
```

To test initialization manually:

```bash
curl -i -X POST 'https://chatgpt-mcp-with-express-kaleb-s-projects1.vercel.app/mcp' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  --data '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"curl-smoke-test","version":"1.0.0"}}}'
```

After initialization, send `tools/list` (and `tools/call`) to the same URL using the same `Accept` headers. Stateless transport does not require sticky sessions.

## Local development

```bash
pnpm install --frozen-lockfile
pnpm run build
pnpm run dev
```

## Deployment

Vercel detects the Express app exported from `src/index.ts` automatically. No rewrite rules are needed. Pushing to GitHub `main` triggers the connected Vercel production deployment.

This public sample exposes only demonstration tools. Add authentication/authorization before integrating any private data or modifying external systems.


## Interactive MCP App dashboard

Call the `open_dashboard` tool from an MCP Apps-capable host to render the
`ui://mcp-control-center/dashboard.html` widget in a sandboxed iframe.
The tool advertises both standard `_meta.ui.resourceUri` and OpenAI
`openai/outputTemplate` metadata. The UI resource uses
`text/html;profile=mcp-app` and is discoverable through `resources/list`
and `resources/read`.

A standalone testing preview is available at:

`https://chatgpt-mcp-with-express-kaleb-s-projects1.vercel.app/dashboard`

The dashboard includes working controls for greeting, server time, random number,
calculator, US weather alerts, and US forecast. Within an MCP Apps host it calls
tools through the host's bridge; in the standalone preview it sends JSON-RPC
requests directly to `/mcp`.

Source: `ui/dashboard.html`, `ui/dashboard-client.js`.
`scripts/build-dashboard.mjs` embeds a bundled MCP Apps client into
`src/generated-dashboard.ts` during builds; no external scripts or fonts are
required at runtime.

The dashboard is a demonstration and the MCP server has no authentication.
Do not add privileged, write-capable, or private-data tools without implementing
proper authorization and restrictive CORS.
