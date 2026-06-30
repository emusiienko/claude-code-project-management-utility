from fastapi import FastAPI

from app.api.factory import create_app
from app.container import container
from app.mcp.server import get_mcp_server

# Wire the shared DI container to all packages that use @inject.
# Domain packages (app.api, app.mcp) are wired once at startup as they are
# added in TASK-004/005+. The packages list is expanded there — never inside
# the domain packages themselves.
container.wire(packages=["app.api", "app.mcp"])

# Named `application` to avoid shadowing the `app` package in Pyright analysis.
# Uvicorn convention: `app = application` alias at module level so callers can
# reference `main:app` without changing the uvicorn start command.
application: FastAPI = create_app()

# Mount the MCP server on the same FastAPI application at /mcp.
# Both REST and MCP share one port (ADR-007).
mcp_server = get_mcp_server()
application.mount("/mcp", mcp_server.streamable_http_app())

app = application
