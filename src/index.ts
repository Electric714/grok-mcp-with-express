import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Simple manual OAuth / Bearer auth middleware
app.use((req, res, next) => {
  if (req.path === '/.well-known/oauth-protected-resource' || req.path === '/.well-known/oauth-protected-resource') {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized - missing Bearer token' });
    return;
  }

  const token = authHeader.substring(7);
  if (token !== process.env.MCP_AUTH_SECRET) {
    res.status(401).json({ error: 'Unauthorized - invalid token' });
    return;
  }

  // Attach auth info for MCP if needed
  (req as any).mcpAuthInfo = {
    clientId: 'grok-expert-custom-mcp-test4',
    scopes: ['read:tools', 'write:tools'],
  };

  next();
});

// Create MCP server
const server = new McpServer({
  name: 'grok-expert-custom-mcp-test4',
  version: '1.0.0',
});

// Add example tool (add your weather tools here the same way)
server.tool(
  'get_weather',
  'Get current weather for a location',
  { location: z.string().describe('City or location') },
  async ({ location }) => {
    return {
      content: [
        {
          type: 'text',
          text: `Weather for ${location}: Sunny, 72°F (example tool - replace with real API)`,
        },
      ],
    };
  }
);

// Streamable HTTP transport for MCP (standard for Express)
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => crypto.randomUUID(),
});

// Connect transport to MCP server
server.connect(transport);

// MCP endpoint
app.all('/mcp', async (req, res) => {
  try {
    await transport.handleRequest(req as any, res as any);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal MCP error' });
  }
});

// Required OAuth metadata endpoint
app.get('/.well-known/oauth-protected-resource', (req, res) => {
  res.json({
    resource: `${req.protocol}://${req.get('host')}/mcp`,
    resource_name: 'grok-expert-custom-mcp-test4',
    auth_server_urls: [`${req.protocol}://${req.get('host')}`],
  });
});

app.options('/.well-known/oauth-protected-resource', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.status(204).end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`MCP server running on port ${PORT} with OAuth`);
});

export default app;
