import { test, expect } from "@playwright/test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

// STORY-011 (fix/mcp-http-mount). Real, over-the-wire MCP smoke coverage — the one scenario
// backend/tests/ structurally cannot cover: every MCP test there talks to `mcp_server_v1` in-process
// via `fastmcp.Client(mcp_server_v1)`, bypassing `application.mount(...)` and the ASGI lifespan
// protocol entirely (see STORY-011 description.md). This is the first coverage in either suite of a
// real `StreamableHTTPClientTransport` handshake against the running app.
//
// Mount path used here (`/mcp/v1`) is what's actually mounted on the running backend today
// (backend/app/main.py, confirmed with the user in SESSION-011). Whether `/mcp/v1` or bare `/mcp`
// (per the original, Accepted ADR-007) is the long-term canonical answer is an open architect
// decision — see `.fast-sdlc/escalations/escalation-mcp-contract-url-coder-architect.md`. This spec
// verifies the mount as currently shipped, not the API Contract's still-stated `/mcp` URL (a known,
// separately-tracked divergence).
//
// Uses the official `@modelcontextprotocol/sdk` client, not the `request` fixture: streamable-HTTP is
// a stateful protocol (session id, SSE-capable responses) that the plain `request` fixture cannot
// negotiate. Added as a devDependency for this file only; every other spec keeps using `request`.

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
