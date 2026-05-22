# Grok MCP with Express

Model Context Protocol (MCP) server using Express + @modelcontextprotocol/sdk (Streamable HTTP). Ready for Grok (xAI).

## Available Tools
- get-forecast (lat, lon)
- get-alerts (state code)
- hello (name optional)
- get_current_time
- calculate (operation, a, b)
- random_number (min, max)

## Endpoint
POST https://grok-mcp-with-express.vercel.app/   (primary MCP endpoint)

## Connect to Grok
1. Go to https://grok.com/connectors
2. New Custom Connector
3. Name: Weather MCP
4. Server URL: https://grok-mcp-with-express.vercel.app/
5. Grok will auto-discover all tools after handshake.

Test: Ask Grok for forecast in your city or use the other tools.

## Local
pnpm install && pnpm run dev

## Deploy
Vercel auto-builds on push. Live URL above.

Add tools in src/create-server.ts

Fixed: Vercel build/routing + serverless support + docs for full Grok compatibility.