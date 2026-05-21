from fastapi import APIRouter

from app.services.paper_progress_service import build_project_paper_progress

router = APIRouter(prefix="/paper-progress", tags=["paper-progress"])


@router.get("/{project_id}")
def get_project_paper_progress(project_id: str) -> dict[str, object]:
    return build_project_paper_progress(project_id)
