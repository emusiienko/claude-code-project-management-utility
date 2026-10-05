import logging
from collections.abc import Callable, Generator

from sqlalchemy import Engine, event
from sqlalchemy.orm import Session, sessionmaker

logger = logging.getLogger(__name__)

_AFTER_COMMIT_ACTIONS_KEY = "after_commit_actions"


def run_after_commit(session: Session, action: Callable[[], None]) -> None:
    """Record `action` to run once, after `session` commits.

    A rollback drops every recorded action. An action runs after the commit has
    already happened, so it must not use `session`.
    """
    session.info.setdefault(_AFTER_COMMIT_ACTIONS_KEY, []).append(action)


def _run_recorded_actions(session: Session) -> None:
    actions = session.info.pop(_AFTER_COMMIT_ACTIONS_KEY, [])
    for action in actions:
        try:
            action()
        except Exception:
            # The commit has already succeeded; a failed side effect must not
            # fail the request or stop the remaining actions.
            logger.exception("After-commit action failed")


def _discard_recorded_actions(session: Session, *_args: object) -> None:
    session.info.pop(_AFTER_COMMIT_ACTIONS_KEY, None)


def build_session_factory(engine: Engine) -> sessionmaker[Session]:
    factory = sessionmaker(
        bind=engine,
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,
    )
    event.listen(factory, "after_commit", _run_recorded_actions)
    event.listen(factory, "after_rollback", _discard_recorded_actions)
    event.listen(factory, "after_soft_rollback", _discard_recorded_actions)
    return factory


def init_db_session(
    session_factory: sessionmaker[Session],
) -> Generator[Session, None, None]:
    db = session_factory()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
