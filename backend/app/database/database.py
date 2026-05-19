from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings


engine = create_engine(settings.database_url, pool_pre_ping=True) if settings.database_url else None
SessionLocal = (
    sessionmaker(autocommit=False, autoflush=False, bind=engine)
    if engine is not None
    else None
)


def get_db() -> Generator[Session, None, None]:
    if SessionLocal is None:
        raise RuntimeError("DATABASE_URL is not configured.")

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_database_connection() -> dict[str, str]:
    if engine is None:
        return {
            "status": "not_configured",
            "database": "DATABASE_URL is not configured",
        }

    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    return {
        "status": "ok",
        "database": "connected",
    }
