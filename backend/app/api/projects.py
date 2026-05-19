from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/projects", tags=["projects"])

MOCK_PROJECTS = [
    {
        "id": "PROJECT_001",
        "name": "Dakwah Content Selection Module",
        "thesis_type": "Design and Development Research",
        "target_papers": 3,
        "progress": 86,
        "intelligence_score": 86,
        "status": "Active",
    },
    {
        "id": "PROJECT_002",
        "name": "TVET NOSS Quality Study",
        "thesis_type": "Mixed-methods research",
        "target_papers": 2,
        "progress": 42,
        "intelligence_score": 74,
        "status": "Draft",
    },
    {
        "id": "PROJECT_003",
        "name": "Islamic Education Framework Paper",
        "thesis_type": "Framework synthesis",
        "target_papers": 1,
        "progress": 94,
        "intelligence_score": 91,
        "status": "Submission Ready",
    },
]


@router.get("")
def get_projects() -> dict[str, list[dict[str, object]]]:
    return {"projects": MOCK_PROJECTS}


@router.get("/{project_id}")
def get_project(project_id: str) -> dict[str, object]:
    project = next((item for item in MOCK_PROJECTS if item["id"] == project_id), None)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    return {
        "project": {
            **project,
            "primary_author": "Dr. Zahirwan",
            "institution": "Universiti Islam Selangor",
            "target_template": "ICC2026",
            "last_activity": "Today, 8:30 AM",
        }
    }
