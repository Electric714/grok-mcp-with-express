import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import crypto from 'crypto';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Create MCP server - NO AUTH
const server = new McpServer({
  name: 'grok-expert-custom-mcp-test4',
  version: '1.0.0',
});

// Example tool - replace or add your real tools here
server.tool(
  'get_weather',
  'Get current weather for a location',
  { 
    location: z.string().describe('City or location name') 
  },
  async ({ location }) => {
    return {
      content: [
        {
          type: 'text',
          text: `Weather report for ${location}: 72°F, sunny (example tool). Add your real logic here.`,
        },
      ],
    };
  }
);

// MCP Transport
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => crypto.randomUUID(),
});

// Connect server to transport
await server.connect(transport);

// Main MCP endpoint - OPEN (no auth)
app.all('/mcp', async (req, res) => {
  try {
    await transport.handleRequest(req as any, res as any, req.body);
  } catch (error) {
    console.error('MCP Error:', error);
    res.status(500).json({ error: 'Internal MCP server error' });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ MCP Server running on port ${PORT} - NO AUTH (open for Grok/ChatGPT)`);
  console.log(`MCP URL: http://localhost:${PORT}/mcp`);
});

export default app;
