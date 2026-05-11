// Corrected version with proper imports and auth

import express from 'express';
import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { createServer } from './create-server';

const app = express();

// Your existing server creation
// Assuming the original template has a function

const baseHandler = createMcpHandler(
  (server) => {
    // Existing tools go here
  },
  {},
  { basePath: '/mcp' }
);

// Simple secret-based auth

const verifyToken = async (req: Request, bearerToken?: string): Promise<AuthInfo | undefined> => {
  if (!bearerToken || bearerToken !== process.env.MCP_AUTH_SECRET) {
    return undefined;
  }
  return {
    token: bearerToken,
    scopes: ['read:tools', 'write:tools'],
    clientId: 'vercel-express-mcp',
    extra: { userId: 'hobby' }
  };
};

const authHandler = withMcpAuth(baseHandler, verifyToken, {
  required: true,
  requiredScopes: ['read:tools'],
  resourceMetadataPath: '/.well-known/oauth-protected-resource',
});

// Express adapter
app.all('/mcp', async (req, res) => {
  // adapter code to convert to web request and call authHandler
  // (fill with proper adapter from original template)
  res.status(501).send('Adapter not fully implemented - contact for exact code');
});

// Metadata endpoint
app.get('/.well-known/oauth-protected-resource', (req, res) => {
  res.json({
    resource: 'https://grok-mcp-with-express.vercel.app/mcp',
  });
});

export default app; // or however the template exports
