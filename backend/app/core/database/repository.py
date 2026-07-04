import uuid
from typing import Generic, TypeVar

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database.base import Base

ModelT = TypeVar("ModelT", bound=Base)


class BaseRepository(Generic[ModelT]):
    model_class: type[ModelT]

    def __init__(self, session: Session) -> None:
        self._session = session

    def get_all(self) -> list[ModelT]:
        stmt = select(self.model_class)
        return list(self._session.scalars(stmt).all())

    def get_by_id(self, entity_id: uuid.UUID) -> ModelT | None:
        stmt = select(self.model_class).where(
            self.model_class.id == entity_id  # type: ignore[attr-defined]
        )
        return self._session.scalars(stmt).first()

    def exists(self, entity_id: uuid.UUID) -> bool:
        stmt = select(
            select(self.model_class)
            .where(self.model_class.id == entity_id)  # type: ignore[attr-defined]
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
