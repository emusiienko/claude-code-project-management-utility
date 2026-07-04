from fastapi import APIRouter

from app.api.routes import ApiVersion, AppPath
from app.projects.controller import router as projects_router
from app.settings.controller import router as settings_router

# Version router — all v1 routes live under /{ApiVersion.V1}.
v1_router = APIRouter(prefix=f"/{ApiVersion.V1}")
v1_router.include_router(projects_router, prefix=f"/{AppPath.PROJECTS}")
# Settings routes span /system/settings and /projects/{id}/settings — no single
# domain-level prefix applies; the router is included without an additional prefix.
v1_router.include_router(settings_router)

# App router — single entry point included by main.py.
app_router = APIRouter()
app_router.include_router(v1_router)