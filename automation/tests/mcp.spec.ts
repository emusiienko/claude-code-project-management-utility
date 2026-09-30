import { test, expect } from "@playwright/test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const MCP_BASE_URL = `${process.env.API_BASE_URL ?? "http://localhost:8100"}/mcp/v1`;

async function connectClient() {
  const client = new Client({ name: "qa-automation-smoke", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(MCP_BASE_URL));
  await client.connect(transport);
  return { client, transport };
}

test.describe("MCP server over HTTP (STORY-011 smoke)", () => {
  test("a real MCP client completes initialize against /mcp/v1", async () => {
    const { client, transport } = await connectClient();
    try {
      // client.connect() only resolves once the initialize handshake completes and the server hands
      // back a session id — reaching this line at all is proof the ASGI lifespan started the
      // sub-app's session manager (pre-fix defect #2: every request failed with "Session terminated").
      expect(transport.sessionId).toBeTruthy();
    } finally {
      await client.close();
    }
  });

  test("lists tools and calls one end-to-end, matching the REST envelope", async ({ request }) => {
    const { client, transport } = await connectClient();
    try {
      const tools = await client.listTools();
      expect(tools.tools.length).toBeGreaterThan(0);
      expect(tools.tools.some((t) => t.name === "get_status")).toBe(true);

      const mcpResult = await client.callTool({ name: "get_status", arguments: {} });
      expect(mcpResult.isError).toBeFalsy();
      const mcpData = (mcpResult.structuredContent as { data?: { status?: string; version?: string } })
        ?.data;
      expect(mcpData?.status).toBe("ok");
      expect(typeof mcpData?.version).toBe("string");

      // Contract § Status: MCP tools mirror REST 1:1 — cross-check the live REST response.
      const restRes = await request.get("/v1/status");
      const restBody = await restRes.json();
      expect(mcpData?.version).toBe(restBody.data.version);
    } finally {
      await client.close();
    }
  });

  test("the pre-fix double-mounted path no longer serves the protocol", async ({ request }) => {
    // Regression guard for defect #1: http_app() without path="/" made the server only answer at
    // /mcp/v1/mcp, not the documented /mcp/v1. After the fix, that stacked path must not resolve.
    const res = await request.post("/mcp/v1/mcp", {
      headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
      data: { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
    });
    expect(res.status()).toBe(404);
  });
});
