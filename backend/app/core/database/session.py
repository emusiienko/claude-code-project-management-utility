from collections.abc import Generator

from sqlalchemy import Engine
from sqlalchemy.orm import Session, sessionmaker


def build_session_factory(engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(
        bind=engine,
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,
    )


def create_session(session_factory: sessionmaker[Session]) -> Session:
    # Called by the DI container to produce a new Session per request.
    # Use this as a Factory provider target so the container can inject
    # concrete Session instances into repositories and services.
    return session_factory()


def get_db(session_factory: sessionmaker[Session]) -> Generator[Session, None, None]:
    # FastAPI dependency: yields a DB session and ensures it is closed.
    # Transactions must be managed explicitly by the caller (service layer).
    db = session_factory()
    try:
        yield db
    finally:
        db.close()
