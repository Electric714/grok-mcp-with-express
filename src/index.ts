import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "./create-server.js";

// Environment setup
dotenv.config();
const PORT = process.env.PORT || 3000;

// Initialize Express app
const app: any = express();

// Middleware setup
app.use(express.json());
app.use(
  cors({
    origin: true,
    methods: "*",
    allowedHeaders: "Authorization, Origin, Content-Type, Accept, *",
  })
);
app.options("*", cors());

// Initialize transport
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: undefined, // set to undefined for stateless servers
});

// MCP endpoint - NOW AT ROOT for Grok connector compatibility
app.post("/", async (req: any, res: any) => {
  await serverReadyPromise;

  console.log("Received MCP request at root:", req.body);
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

// Method not allowed handlers for root
const methodNotAllowed = (req: any, res: any) => {
  console.log(`Received ${req.method} MCP request at root`);
  res.status(405).json({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed.",
    },
    id: null,
  });
};

app.get("/", (req: any, res: any) => {
  res.json({
    status: "ok",
    message: "MCP server ready - Protocol mounted at root / for Grok connector",
    tools_available: true
  });
});

app.delete("/", methodNotAllowed);

// Legacy /mcp routes for backward compatibility
app.post("/mcp", async (req: any, res: any) => {
  await serverReadyPromise;
  console.log("Received legacy MCP request:", req.body);
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

app.get("/mcp", methodNotAllowed);
app.delete("/mcp", methodNotAllowed);

const { server } = createServer();

// Server setup with proper promise-based readiness for serverless
let serverReady = false;
let serverReadyPromise: any;

serverReadyPromise = new Promise(async (resolve, reject) => {
  try {
    await server.connect(transport);
    serverReady = true;
    console.log("Server connected successfully to root endpoint");
    resolve();
  } catch (error) {
    console.error("Failed to set up the server:", error);
    reject(error);
  }
});

// Start server (local dev only - Vercel uses export below)
if (!process.env.VERCEL) {
  serverReadyPromise
    .then(() => {
      app.listen(PORT, () => {
        console.log(`MCP Streamable HTTP Server listening on port ${PORT} - MCP now at /`);
      });
    })
    .catch((error) => {
      console.error("Failed to start server:", error);
      process.exit(1);
    });
}

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

// Export the Express app for Vercel serverless deployment
export default app;