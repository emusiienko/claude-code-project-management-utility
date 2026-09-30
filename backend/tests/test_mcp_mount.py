"""Integration test for the MCP server's actual HTTP mount.

Every other MCP test in this suite (see `_mcp_call` in `test_sessions.py`) talks to
`mcp_server_v1` in-process via `fastmcp.Client(mcp_server_v1)` — that path never
goes through `application.mount(...)` in `main.py`, never runs the ASGI lifespan
protocol, and therefore cannot catch a broken HTTP mount or an uninitialized
session manager. This module runs a real Uvicorn server bound to a loopback port
and connects with a real streamable-HTTP MCP client, exercising the exact path an
external MCP client hits in production.
"""

import asyncio
import contextlib
from collections.abc import AsyncGenerator

import uvicorn
from fastmcp import Client

from app.main import application

MCP_MOUNT_PATH = "/mcp/v1"


@contextlib.asynccontextmanager
async def _running_app() -> AsyncGenerator[int, None]:
    """Serve `application` on an OS-assigned loopback port; yield that port."""
    config = uvicorn.Config(application, host="127.0.0.1", port=0, log_level="warning")
    server = uvicorn.Server(config)
    serve_task = asyncio.create_task(server.serve())
    try:
        while not server.started:
            await asyncio.sleep(0.01)
        port = server.servers[0].sockets[0].getsockname()[1]
        yield port
    finally:
        server.should_exit = True
        await serve_task


class TestMcpHttpMount:
    async def test_mcp_endpoint_reachable_at_documented_mount_path(self) -> None:
        async with _running_app() as port:
            async with Client(f"http://127.0.0.1:{port}{MCP_MOUNT_PATH}") as mcp_client:
                result = await mcp_client.call_tool("get_status", {})

        assert result.data is not None, (
            f"get_status via {MCP_MOUNT_PATH} returned no data — the MCP HTTP "
            "mount is not reachable at its documented path"
        )
