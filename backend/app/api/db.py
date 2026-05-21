from fastapi import APIRouter, HTTPException
from app.database.database import check_database_connection

router = APIRouter(prefix="/db", tags=["database"])


@router.get("/health")
def get_database_health() -> dict[str, str]:
    result = check_database_connection()
    if result["status"] != "ok":
        raise HTTPException(status_code=503, detail=result["database"])
    return result
