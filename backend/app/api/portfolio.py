from fastapi import APIRouter

from app.services.portfolio_dashboard_service import build_project_portfolio

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


@router.get("/{project_id}")
def get_project_portfolio(project_id: str) -> dict[str, object]:
    return build_project_portfolio(project_id)
