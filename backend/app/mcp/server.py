from mcp.server.fastmcp import FastMCP

from app.settings.mcp_tools import register_settings_tools

# MCP server mounted on the same port as REST under /mcp (ADR-007).
# HTTP Streamable transport is used per the architecture (mcp ^1.0).
# streamable_http_app() returns an ASGI sub-application that manages its own
# lifespan (session manager startup/shutdown), so main.py does not need to
# wire MCP lifecycle events into FastAPI's lifespan.
mcp_server = FastMCP("AI Agent Coordination Utility")

# Register domain tools — one call per domain package as they are added.
register_settings_tools(mcp_server)


def get_mcp_server() -> FastMCP:
    return mcp_server
