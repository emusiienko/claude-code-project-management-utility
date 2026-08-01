from app.status.schema import STATUS_OK, Status


class StatusService:
    def __init__(self, app_version: str) -> None:
        self._app_version = app_version

    def get_status(self) -> Status:
        return Status(status=STATUS_OK, version=self._app_version)
