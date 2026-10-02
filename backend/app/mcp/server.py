from fastmcp import FastMCP

# MCP v1 server mounted on the same port as REST under /mcp/v1.
# HTTP Streamable transport is used per the architecture.
# http_app() returns an ASGI sub-application that manages its own
# lifespan (session manager startup/shutdown), so main.py does not need to
# wire MCP lifecycle events into FastAPI's lifespan.
#
# Tools are registered by domain packages via @mcp_server_v1.tool() at module
# level. Registration is triggered when container.wire() imports those modules
# during startup — no explicit register_*() calls needed here.
mcp_server_v1 = FastMCP("AI Agent Coordination Utility")
