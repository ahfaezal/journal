from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.database import SessionLocal
from app.database.models import Project

router = APIRouter(prefix="/projects", tags=["projects"])

MOCK_PROJECTS = [
    {
        "id": "PROJECT_001",
        "project_id": "PROJECT_001",
        "human_readable_code": "PROJECT_001",
        "name": "Dakwah Content Selection Module",
        "title": "Dakwah Content Selection Module",
        "thesis_title": "Pembangunan modul pemilihan kandungan dakwah bagi pensyarah IPT",
        "thesis_type": "Design and Development Research",
        "research_type": "Design and Development Research",
        "target_output": "Multiple Papers",
        "target_template": "ICC2026",
        "target_papers": 3,
        "progress": 86,
        "intelligence_score": 86,
        "status": "Active",
        "primary_author": "Dr. Zahirwan",
        "institution": "Universiti Islam Selangor",
        "last_activity": "Today, 8:30 AM",
    },
    {
        "id": "PROJECT_002",
        "project_id": "PROJECT_002",
        "human_readable_code": "PROJECT_002",
        "name": "TVET NOSS Quality Study",
        "title": "TVET NOSS Quality Study",
        "thesis_title": "TVET NOSS Quality Study",
        "thesis_type": "Mixed-methods research",
        "research_type": "Mixed-methods research",
        "target_output": "Journal Article",
        "target_template": "APA 7",
        "target_papers": 2,
        "progress": 42,
        "intelligence_score": 74,
        "status": "Draft",
        "primary_author": "Dr. Zahirwan",
        "institution": "Universiti Islam Selangor",
        "last_activity": "Yesterday, 4:10 PM",
    },
    {
        "id": "PROJECT_003",
        "project_id": "PROJECT_003",
        "human_readable_code": "PROJECT_003",
        "name": "Islamic Education Framework Paper",
        "title": "Islamic Education Framework Paper",
        "thesis_title": "Islamic Education Framework Paper",
        "thesis_type": "Framework synthesis",
        "research_type": "Framework synthesis",
        "target_output": "Conference Paper",
        "target_template": "MyCite",
        "target_papers": 1,
        "progress": 94,
        "intelligence_score": 91,
        "status": "Submission Ready",
        "primary_author": "Dr. Zahirwan",
        "institution": "Universiti Islam Selangor",
        "last_activity": "May 17, 2026",
    },
]


class ProjectCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    thesis_title: str | None = None
    research_type: str | None = None
    target_output: str | None = None
    target_template: str | None = None
    primary_author: str | None = None
    institution: str | None = None
    status: str = "Active"
    notes: str | None = None


class ProjectUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    thesis_title: str | None = None
    research_type: str | None = None
    target_output: str | None = None
    target_template: str | None = None
    primary_author: str | None = None
    institution: str | None = None
    status: str | None = None
    notes: str | None = None


def database_enabled() -> bool:
    return bool(settings.database_url and SessionLocal is not None)


def open_session() -> Session:
    if SessionLocal is None:
        raise RuntimeError("DATABASE_URL is not configured.")
    return SessionLocal()


def target_papers_for_output(target_output: str | None) -> int:
    if target_output == "Multiple Papers":
        return 3
    return 1


def serialize_project(project: Project) -> dict[str, object]:
    target_papers = target_papers_for_output(project.target_output)
    return {
        "id": project.human_readable_code,
        "project_id": project.project_id,
        "human_readable_code": project.human_readable_code,
        "name": project.title,
        "title": project.title,
        "thesis_title": project.thesis_title or "",
        "thesis_type": project.research_type or "",
        "research_type": project.research_type or "",
        "target_output": project.target_output or "",
        "target_template": project.target_template or "",
        "target_papers": target_papers,
        "progress": 0,
        "intelligence_score": 0,
        "status": project.status,
        "primary_author": project.primary_author or "",
        "institution": project.institution or "",
        "last_activity": format_activity(project.updated_at),
        "created_at": project.created_at.isoformat() if project.created_at else "",
        "updated_at": project.updated_at.isoformat() if project.updated_at else "",
    }


def format_activity(value: datetime | None) -> str:
    if value is None:
        return "Just now"
    return value.strftime("%d %b %Y, %I:%M %p")


def find_mock_project(project_id: str) -> dict[str, object] | None:
    return next(
        (
            item
            for item in MOCK_PROJECTS
            if item["id"] == project_id
            or item["project_id"] == project_id
            or item["human_readable_code"] == project_id
        ),
        None,
    )


def get_project_by_identifier(db: Session, project_id: str) -> Project | None:
    statement = select(Project).where(
        Project.is_deleted.is_(False),
        or_(
            Project.project_id == project_id,
            Project.human_readable_code == project_id,
            Project.id == project_id,
        ),
    )
    return db.scalars(statement).first()


def generate_human_readable_code(db: Session) -> str:
    year = datetime.utcnow().year
    prefix = f"THESIS-{year}-"
    count = db.scalar(select(func.count()).select_from(Project).where(Project.human_readable_code.like(f"{prefix}%"))) or 0
    return f"{prefix}{count + 1:03d}"


@router.get("")
def get_projects() -> dict[str, list[dict[str, object]]]:
    if not database_enabled():
        return {"projects": MOCK_PROJECTS}

    with open_session() as db:
        projects = db.scalars(
            select(Project)
            .where(Project.is_deleted.is_(False))
            .order_by(Project.created_at.desc())
        ).all()
        return {"projects": [serialize_project(project) for project in projects]}


@router.get("/{project_id}")
def get_project(project_id: str) -> dict[str, object]:
    if database_enabled():
        with open_session() as db:
            project = get_project_by_identifier(db, project_id)
            if project is not None:
                return {"project": serialize_project(project)}
            raise HTTPException(status_code=404, detail="Project not found")

    project = find_mock_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"project": project}


@router.post("")
def create_project(payload: ProjectCreate) -> dict[str, object]:
    if not database_enabled():
        created = {
            **MOCK_PROJECTS[0],
            "id": f"THESIS-{datetime.utcnow().year}-001",
            "project_id": str(uuid4()),
            "human_readable_code": f"THESIS-{datetime.utcnow().year}-001",
            "name": payload.title,
            "title": payload.title,
            "thesis_title": payload.thesis_title or "",
            "thesis_type": payload.research_type or "",
            "research_type": payload.research_type or "",
            "target_output": payload.target_output or "",
            "target_template": payload.target_template or "",
            "target_papers": target_papers_for_output(payload.target_output),
            "status": payload.status,
            "primary_author": payload.primary_author or "",
            "institution": payload.institution or "",
            "last_activity": "Just now",
        }
        return {"project": created}

    with open_session() as db:
        project = Project(
            project_id=str(uuid4()),
            human_readable_code=generate_human_readable_code(db),
            title=payload.title.strip(),
            thesis_title=payload.thesis_title,
            research_type=payload.research_type,
            target_output=payload.target_output,
            target_template=payload.target_template,
            primary_author=payload.primary_author,
            institution=payload.institution,
            status=payload.status,
            metadata_json={"notes": payload.notes} if payload.notes else {},
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        return {"project": serialize_project(project)}


@router.patch("/{project_id}")
def update_project(project_id: str, payload: ProjectUpdate) -> dict[str, object]:
    update_data = payload.model_dump(exclude_unset=True)

    if database_enabled():
        with open_session() as db:
            project = get_project_by_identifier(db, project_id)
            if project is None:
                raise HTTPException(status_code=404, detail="Project not found")

            notes = update_data.pop("notes", None)
            for field, value in update_data.items():
                setattr(project, field, value)
            if notes is not None:
                project.metadata_json = {**(project.metadata_json or {}), "notes": notes}
            db.commit()
            db.refresh(project)
            return {"project": serialize_project(project)}

    project = find_mock_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    updated = {
        **project,
        **{key: value for key, value in update_data.items() if value is not None},
    }
    if "title" in updated:
        updated["name"] = updated["title"]
    if "research_type" in updated:
        updated["thesis_type"] = updated["research_type"]
    return {"project": updated}


@router.delete("/{project_id}")
def delete_project(project_id: str) -> dict[str, object]:
    if database_enabled():
        with open_session() as db:
            project = get_project_by_identifier(db, project_id)
            if project is None:
                raise HTTPException(status_code=404, detail="Project not found")
            project.is_deleted = True
            project.status = "Deleted"
            db.commit()
            return {"project_id": project_id, "deleted": True}

    project = find_mock_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"project_id": project_id, "deleted": True}
