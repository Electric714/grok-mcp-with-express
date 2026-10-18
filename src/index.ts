import dotenv from "dotenv";
import express, { type Request, type Response } from "express";
import cors from "cors";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "./create-server.js";
import { dashboardHtml } from "./generated-dashboard.js";

dotenv.config();

// The installed @types/express 5 package does not match the Express 4 runtime.
// Keep the app untyped until the dependency types can be upgraded together.
const app: any = express();
const port = Number(process.env.PORT || 3000);

app.disable("x-powered-by");
app.use(express.json({ limit: "128kb" }));
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: [
    "Content-Type", "Accept", "Authorization",
    "MCP-Protocol-Version", "Mcp-Session-Id"
  ],
  exposedHeaders: ["Mcp-Session-Id"]
}));


app.get("/dashboard", (_req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store");
  res.type("html").send(dashboardHtml);
});

app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    message: "ChatGPT MCP server is running",
    protocol_endpoint: "/mcp",
    tools_available: true
  });
});

// A stateless MCP transport and server MUST be created for every request.
// Sharing one transport across concurrent HTTP requests breaks initialization
// and tool calls in serverless environments such as Vercel.
async function handleMcpPost(req: Request, res: Response): Promise<void> {
  const { server } = createServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined
  });

  res.setHeader("Cache-Control", "no-store");
  res.once("close", () => {
    void (async () => {
      await transport.close();
      await server.close();
    })().catch((error: unknown) => {
      console.error("Error closing MCP request:", error);
    });
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("MCP request error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null
      });
    } else if (!res.writableEnded) {
      res.end();
    }
  }
}

// ChatGPT-compatible Streamable HTTP endpoint.
app.post("/mcp", handleMcpPost);
// Keep the original root MCP endpoint for existing Grok integrations.
app.post("/", handleMcpPost);

// Stateless Streamable HTTP has no persistent SSE session to GET or DELETE.
function methodNotAllowed(_req: Request, res: Response): void {
  res.setHeader("Allow", "POST, OPTIONS");
  res.status(405).send("Method not allowed.");
}
app.get("/mcp", methodNotAllowed);
app.delete("/mcp", methodNotAllowed);
app.delete("/", methodNotAllowed);

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log("MCP server running at http://localhost:" + port + "/mcp");
  });
}

export default app;
