export const createServer = () => {
  // Create server instance
  const server = new McpServer({
    name: "weather",
    version: "1.0.0",
  });

  // 🔥 THIS IS THE FIX — disable OAuth advertisement so Grok stops asking for credentials
  server.capabilities = {
    tools: {},
    prompts: {},
    resources: {},
    logging: {}
  };

  // Register weather tools (rest of your code stays exactly the same)
  server.tool(
    "get-alerts",
    "Get weather alerts for a state",
    {
      state: z
        .string()
        .length(2)
        .describe("Two-letter state code (e.g. CA, NY)"),
    },
    async ({ state }) => {
      // ... (all your existing get-alerts code stays unchanged)
    }
  );

  server.tool(
    "get-forecast",
    "Get weather forecast for a location",
    {
      latitude: z
        .number()
        .min(-90)
        .max(90)
        .describe("Latitude of the location"),
      longitude: z
        .number()
        .min(-180)
        .max(180)
        .describe("Longitude of the location"),
    },
    async ({ latitude, longitude }) => {
      // ... (all your existing get-forecast code stays unchanged)
    }
  );

  return { server };
};