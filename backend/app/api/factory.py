from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.errors import CODE_VALIDATION_ERROR, DomainError, domain_error_handler
from app.projects.controller import router as projects_router
from app.settings.controller import router as settings_router


async def _request_validation_error_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    # Pydantic validation errors (including unknown dictionary keys rejected by
    # UpdateSettingsBody.reject_unknown_keys) are translated to 400 VALIDATION_ERROR
    # to match the API contract.  FastAPI's default would return 422.
    first_error = exc.errors()[0] if exc.errors() else {}
    message = str(first_error.get("msg", "Validation error."))
    # Strip the "Value error, " prefix that Pydantic v2 prepends to ValueError messages.
    if message.startswith("Value error, "):
        message = message[len("Value error, "):]
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"error": message, "code": CODE_VALIDATION_ERROR},
    )


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_title,
        version=settings.app_version,
        docs_url="/v1/docs",
        redoc_url="/v1/redoc",
        openapi_url="/v1/openapi.json",
    )

    # CORS — configured once here; origins driven by CORS_ALLOWED_ORIGINS env var.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allowed_origins,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Centralized domain-error handler — maps all DomainError subclasses to the
    # standard error envelope without leaking internals.
    app.add_exception_handler(DomainError, domain_error_handler)  # type: ignore[arg-type]

    # Pydantic/FastAPI validation errors → 400 VALIDATION_ERROR per the API contract.
    # This covers unknown dictionary keys rejected by UpdateSettingsBody and any
    # other request-body validation failures.
    app.add_exception_handler(  # type: ignore[arg-type]
        RequestValidationError,
        _request_validation_error_handler,
    )

    # Domain routers are registered here as they are implemented.
    # Each router is mounted under the /v1 prefix.
    _register_routers(app)

    return app


def _register_routers(app: FastAPI) -> None:
    app.include_router(projects_router, prefix="/v1")
    app.include_router(settings_router, prefix="/v1")
