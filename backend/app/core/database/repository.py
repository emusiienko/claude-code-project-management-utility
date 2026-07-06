import uuid
from typing import Generic, TypeVar

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database.base import Base
from app.core.errors import NotFoundError

ModelT = TypeVar("ModelT", bound=Base)


class BaseRepository(Generic[ModelT]):
    model_class: type[ModelT]

    def __init__(self, session: Session) -> None:
        self._session = session

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _coerce_uuid(value: str | uuid.UUID, label: str) -> uuid.UUID:
        # A malformed string ID means the resource cannot exist — surface as NOT_FOUND
        # rather than a validation error so callers never need to pre-convert.
        if isinstance(value, uuid.UUID):
            return value
        try:
            return uuid.UUID(value)
        except ValueError:
            raise NotFoundError(f"{label} '{value}' not found.")

    # ------------------------------------------------------------------
    # Query methods
    # ------------------------------------------------------------------

    def get_all(self) -> list[ModelT]:
        stmt = select(self.model_class)
        return list(self._session.scalars(stmt).all())

    def get_by_id(self, entity_id: str | uuid.UUID) -> ModelT | None:
        uid = self._coerce_uuid(entity_id, self.model_class.__name__)
        stmt = select(self.model_class).where(
            self.model_class.id == uid  # type: ignore[attr-defined]
        )
        return self._session.scalars(stmt).first()

    def exists(self, entity_id: str | uuid.UUID) -> bool:
        uid = self._coerce_uuid(entity_id, self.model_class.__name__)
        stmt = select(
            select(self.model_class)
            .where(self.model_class.id == uid)  # type: ignore[attr-defined]
            .exists()
        )
        return bool(self._session.execute(stmt).scalar())

    def count(self) -> int:
        stmt = select(func.count()).select_from(self.model_class)
        return self._session.execute(stmt).scalar_one()

    def save(self, entity: ModelT) -> ModelT:
        self._session.add(entity)
        self._session.flush()
        return entity

    def delete(self, entity: ModelT) -> None:
        self._session.delete(entity)
        self._session.flush()
