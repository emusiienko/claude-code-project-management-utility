from collections.abc import Callable

from sqlalchemy.orm import Session, sessionmaker

from app.attachments.repository import AttachmentRepository


class ReferencedFilePathsReader:
    def __init__(
        self, session_factory_provider: Callable[[], sessionmaker[Session]]
    ) -> None:
        self._session_factory_provider = session_factory_provider

    def __call__(self) -> set[str]:
        session = self._session_factory_provider()()
        try:
            return AttachmentRepository(session).list_file_paths()
        finally:
            session.close()
