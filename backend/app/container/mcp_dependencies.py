from contextlib import asynccontextmanager

from dependency_injector.wiring import Closing, Provide, inject
from sqlalchemy.orm import Session

from app.container.container import AppContainer
from app.settings.service import SettingsService


@asynccontextmanager
@inject
async def provide_settings_service(
    _db: Session = Closing[Provide[AppContainer.db_session]],
    service: SettingsService = Provide[AppContainer.settings_service],
):
    # Session lifecycle is managed by @inject + Closing[Provide[db_session]]:
    # DependencyResolver.__aenter__ initializes the ContextLocalResource (opens the session,
    # begins a transaction); DependencyResolver.__aexit__ calls shutdown() (commit + close).
    # @asynccontextmanager converts the async generator into an AbstractAsyncContextManager
    # so that fastmcp's uncalled_for engine can enter/exit it via AsyncExitStack.
    yield service
