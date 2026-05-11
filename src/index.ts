import dotenv from "dotenv";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "./create-server.js";

// Environment setup
dotenv.config();
const PORT = process.env.PORT || 3000;
const MCP_AUTH_SECRET = process.env.MCP_AUTH_SECRET;

if (!MCP_AUTH_SECRET) {
  console.warn("⚠️ MCP_AUTH_SECRET is not set. Authentication is disabled.");
}

const app = express();

// Middleware setup
app.use(express.json());
app.use(express.static(path.join(process.cwd(), "public")));
app.use(
  cors({
    origin: true,
    methods: "*",
    allowedHeaders: "Authorization, Origin, Content-Type, Accept, *",
  })
);
app.options("*", cors());

// === MCP AUTH MIDDLEWARE ===
const authenticateMcp = (req: Request, res: Response, next: NextFunction) => {
  if (!MCP_AUTH_SECRET) {
    return next(); // No auth if secret not configured
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.setHeader('WWW-Authenticate', `Bearer realm="mcp", resource_metadata="/well-known/oauth-protected-resource"`);
    return res.status(401).json({ error: "Unauthorized - Missing or invalid Bearer token" });
  }

  const token = authHeader.split(' ')[1];
  if (token !== MCP_AUTH_SECRET) {
    res.setHeader('WWW-Authenticate', `Bearer realm="mcp", resource_metadata="/well-known/oauth-protected-resource", error="invalid_token"`);
    return res.status(401).json({ error: "Unauthorized - Invalid token" });
  }

  next();
};

// Protected Resource Metadata (required for MCP OAuth discovery)
app.get('/.well-known/oauth-protected-resource', (req: Request, res: Response) => {
  const baseUrl = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || req.headers.host}`;
  
  res.json({
    resource: `${baseUrl}/mcp`,
    resource_name: "Weather MCP Server",
    authorization_servers: [baseUrl],
    bearer_methods_supported: ["header"],
    scopes_supported: ["mcp:tools", "mcp:read", "mcp:write"],
  });
});

// Initialize transport
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: undefined,
});

// MCP endpoint with auth
app.post("/mcp", authenticateMcp, async (req: Request, res: Response) => {
  console.log("Received MCP request:", req.body);
  try {
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("Error handling MCP request:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      });
    }
  }
});

// Method not allowed handlers
const methodNotAllowed = (req: Request, res: Response) => {
  console.log(`Received ${req.method} MCP request`);
  res.status(405).json({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed.",
    },
    id: null,
  });
};

app.get("/mcp", authenticateMcp, methodNotAllowed);
app.delete("/mcp", authenticateMcp, methodNotAllowed);

const { server } = createServer();

// Server setup
const setupServer = async () => {
  try {
    await server.connect(transport);
    console.log("Server connected successfully");
  } catch (error) {
    console.error("Failed to set up the server:", error);
    throw error;
  }
};

// Start server
setupServer()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ MCP Streamable HTTP Server with OAuth listening on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });

// Handle server shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down server...");
  try {
    console.log(`Closing transport`);
    await transport.close();
  } catch (error) {
    console.error(`Error closing transport:`, error);
  }

  try {
    await server.close();
    console.log("Server shutdown complete");
  } catch (error) {
    console.error("Error closing server:", error);
  }
  process.exit(0);
});
