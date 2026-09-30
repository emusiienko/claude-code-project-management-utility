from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import app_router
from app.api.routes import ApiVersion
from app.config import settings
from app.container import container
from app.core.errors import DomainError
from app.exc_handlers import domain_error_handler
from app.mcp.server import mcp_server_v1

# `path="/"` — the mount prefix below (`/mcp/v1`) already carries the version
# segment; without this, FastMCP's own default internal path (`/mcp`) stacks on
# top and the server only answers at `/mcp/v1/mcp`.
mcp_app_v1 = mcp_server_v1.http_app(path="/", transport="streamable-http")

# Wire the shared DI container to all packages that use @inject.
# Wiring also imports every module in each package, which triggers the
# @mcp_server_v1.tool() decorators in domain mcp_tools.py files — no
# explicit register_*() calls needed.
container.wire(
    packages=[
        "app.api",
        "app.attachments",
        "app.comments",
        "app.mcp",
        "app.milestones",
        "app.projects",
        "app.sessions",
        "app.settings",
        "app.status",
        "app.stories",
        "app.story_links",
        "app.task_links",
        "app.tasks",
        "app.container",
    ]
)

# Named `application` to avoid shadowing the `app` package in Pyright analysis.
# Uvicorn convention: `app = application` alias at module level so callers can
# reference `app.main:app` without changing the uvicorn start command.
application = FastAPI(
    title=settings.app_title,
    version=settings.app_version,
    docs_url=f"/{ApiVersion.V1}/docs",
    redoc_url=f"/{ApiVersion.V1}/redoc",
    openapi_url=f"/{ApiVersion.V1}/openapi.json",
    # Required so the MCP sub-app's session manager task group actually starts —
    # without it, FastAPI never runs mcp_app_v1's own ASGI lifespan and every MCP
    # request over HTTP fails with "Session terminated".
    lifespan=mcp_app_v1.lifespan,
)

# CORS — configured once here; origins driven by CORS_ALLOWED_ORIGINS env var.
# Methods are listed explicitly instead of ["*"] to avoid edge-case behaviour
# where Starlette's wildcard expansion interacts with non-wildcard allow_origins
# (preflight for non-simple methods such as DELETE can return 400 when origins
# are listed individually rather than "*").
application.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Centralized domain-error handler — maps all DomainError subclasses to the
# standard error envelope without leaking internals.
application.add_exception_handler(DomainError, domain_error_handler)  # type: ignore[arg-type]

application.include_router(app_router)

# Mount the MCP v1 server on the same FastAPI application at /mcp/v1.
# Both REST and MCP share one port (ADR-007).
application.mount("/mcp/v1", mcp_app_v1)

app = application
