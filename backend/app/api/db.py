from fastapi import APIRouter, HTTPException
from sqlalchemy.exc import SQLAlchemyError

from app.database.database import check_database_connection

router = APIRouter(prefix="/db", tags=["database"])


@router.get("/health")
def get_database_health() -> dict[str, str]:
    try:
        result = check_database_connection()
        if result["status"] == "not_configured":
            raise HTTPException(status_code=503, detail=result["database"])
        return result
    except SQLAlchemyError as error:
        raise HTTPException(
            status_code=503,
            detail=f"Database connection failed: {error}",
        ) from error
