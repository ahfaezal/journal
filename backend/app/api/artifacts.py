from fastapi import APIRouter

from app.services.artifact_registry_service import summarize_artifacts

router = APIRouter(prefix="/artifacts", tags=["artifacts"])


@router.get("/{project_id}")
def get_artifacts(project_id: str) -> dict[str, object]:
    return summarize_artifacts(project_id)
