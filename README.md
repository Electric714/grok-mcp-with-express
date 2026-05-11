# Grok MCP with Express

This is a Model Context Protocol (MCP) server built with Express.js for integration with Grok.

## Current Tools
- `get-alerts`: Get weather alerts for a US state
- `get-forecast`: Get weather forecast for coordinates

## How to add more tools
Edit `src/create-server.ts` and register new `server.tool()` calls.

Deployed at: https://grok-mcp-with-express.vercel.app

