from fastapi import APIRouter

from app.services.activity_logger_service import get_activities

router = APIRouter(prefix="/activity", tags=["activity"])


@router.get("/{project_id}")
def get_project_activity(project_id: str) -> dict[str, object]:
    activities = get_activities(project_id)
    return {
        "project_id": project_id,
        "activities": activities,
        "total": len(activities),
    }


@router.get("/{project_id}/{paper_id}")
def get_project_paper_activity(project_id: str, paper_id: str) -> dict[str, object]:
    activities = get_activities(project_id, paper_id.upper())
    return {
        "project_id": project_id,
        "paper_id": paper_id.upper(),
        "activities": activities,
        "total": len(activities),
    }
