import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const NWS_API_BASE = "https://api.weather.gov";
const USER_AGENT = "weather-app/1.0";

// Helper function for making NWS API requests
async function makeNWSRequest<T>(url: string): Promise<T | null> {
  const headers = {
    "User-Agent": USER_AGENT,
    Accept: "application/geo+json",
  };

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error("Error making NWS request:", error);
    return null;
  }
}

interface AlertFeature {
  properties: {
    event?: string;
    areaDesc?: string;
    severity?: string;
    status?: string;
    headline?: string;
  };
}

// Format alert data
function formatAlert(feature: AlertFeature): string {
  const props = feature.properties;
  return [
    `Event: ${props.event || "Unknown"}`,
    `Area: ${props.areaDesc || "Unknown"}`,
    `Severity: ${props.severity || "Unknown"}`,
    `Status: ${props.status || "Unknown"}`,
    `Headline: ${props.headline || "No headline"}`,
    "---",
  ].join("\n");
}

interface ForecastPeriod {
  name?: string;
  temperature?: number;
  temperatureUnit?: string;
  windSpeed?: string;
  windDirection?: string;
  shortForecast?: string;
}

interface AlertsResponse {
  features: AlertFeature[];
}

interface PointsResponse {
  properties: {
    forecast?: string;
  };
}

interface ForecastResponse {
  properties: {
    periods: ForecastPeriod[];
  };
}

export const createServer = () => {
  // Create server instance
  const server = new McpServer({
    name: "weather",
    version: "1.0.0",
  });

  // Register weather tools
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
      const stateCode = state.toUpperCase();
      const alertsUrl = `${NWS_API_BASE}/alerts?area=${stateCode}`;
      const alertsData = await makeNWSRequest<AlertsResponse>(alertsUrl);

      if (!alertsData) {
        return {
          content: [
            {
              type: "text",
              text: "Failed to retrieve alerts data",
            },
          ],
        };
      }

      const features = alertsData.features || [];
      if (features.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No active alerts for ${stateCode}`,
            },
          ],
        };
      }

      const formattedAlerts = features.map(formatAlert);
      const alertsText = `Active alerts for ${stateCode}:\n\n${formattedAlerts.join(
        "\n"
      )}`;

      return {
        content: [
          {
            type: "text",
            text: alertsText,
          },
        ],
      };
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
      // Get grid point data
      const pointsUrl = `${NWS_API_BASE}/points/${latitude.toFixed(
        4
      )},${longitude.toFixed(4)}`;
      const pointsData = await makeNWSRequest<PointsResponse>(pointsUrl);

      if (!pointsData) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to retrieve grid point data for coordinates: ${latitude}, ${longitude}. This location may not be supported by the NWS API (only US locations are supported).`,
            },
          ],
        };
      }

      const forecastUrl = pointsData.properties?.forecast;
      if (!forecastUrl) {
        return {
          content: [
            {
              type: "text",
              text: "Failed to get forecast URL from grid point data",
            },
          ],
        };
      }

      // Get forecast data
      const forecastData = await makeNWSRequest<ForecastResponse>(forecastUrl);
      if (!forecastData) {
        return {
          content: [
            {
              type: "text",
              text: "Failed to retrieve forecast data",
            },
          ],
        };
      }

      const periods = forecastData.properties?.periods || [];
      if (periods.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No forecast periods available",
            },
          ],
        };
      }

      // Format forecast periods
      const formattedForecast = periods.map((period: ForecastPeriod) =>
        [
          `${period.name || "Unknown"}:`,
          `Temperature: ${period.temperature || "Unknown"}°${
            period.temperatureUnit || "F"
          }`,
          `Wind: ${period.windSpeed || "Unknown"} ${
            period.windDirection || ""
          }`,
          `${period.shortForecast || "No forecast available"}`,
          "---",
        ].join("\n")
      );

      const forecastText = `Forecast for ${latitude}, ${longitude}:\n\n${formattedForecast.join(
        "\n"
      )}`;

      return {
        content: [
          {
            type: "text",
            text: forecastText,
          },
        ],
      };
    }
  );

  // === NEW SIMPLE TOOLS ===
  // 1. Hello / test tool
  server.tool(
    "hello",
    "Simple greeting tool to test MCP connection",
    {
      name: z.string().optional().describe("Name to greet (optional)"),
    },
    async ({ name }) => {
      const greeting = name 
        ? `Hello, ${name}! Nice to meet you.` 
        : "Hello! MCP server is working correctly.";
      return {
        content: [{ type: "text", text: greeting }],
      };
    }
  );

  // 2. Current time
  server.tool(
    "get_current_time",
    "Get the current server date and time",
    {},
    async () => {
      const now = new Date();
      const timeString = now.toISOString();
      const localTime = now.toLocaleString();
      return {
        content: [{
          type: "text",
          text: `Current UTC time: ${timeString}\nLocal time: ${localTime}`
        }],
      };
    }
  );

  // 3. Calculator
  server.tool(
    "calculate",
    "Perform basic arithmetic calculations",
    {
      operation: z.enum(["add", "subtract", "multiply", "divide"]).describe("Operation to perform"),
      a: z.number().describe("First number"),
      b: z.number().describe("Second number"),
    },
    async ({ operation, a, b }) => {
      let result: number;
      switch (operation) {
        case "add":
          result = a + b;
          break;
        case "subtract":
          result = a - b;
          break;
        case "multiply":
          result = a * b;
          break;
        case "divide":
          if (b === 0) return { content: [{ type: "text", text: "Error: Division by zero" }] };
          result = a / b;
          break;
        default:
          result = 0;
      }
      return {
        content: [{ 
          type: "text", 
          text: `Result of ${a} ${operation} ${b} = ${result}` 
        }],
      };
    }
  );

  // 4. Random number generator
  server.tool(
    "random_number",
    "Generate a random number between min and max",
    {
      min: z.number().default(1).describe("Minimum value (default: 1)"),
      max: z.number().default(100).describe("Maximum value (default: 100)"),
    },
    async ({ min, max }) => {
      const random = Math.floor(Math.random() * (max - min + 1)) + min;
      return {
        content: [{ 
          type: "text", 
          text: `Random number between ${min} and ${max}: ${random}` 
        }],
      };
    }
  );

  return { server };
};
