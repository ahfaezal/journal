from pathlib import Path
from uuid import uuid4

from sqlalchemy import and_, or_, select

from app.core.constants import GENERATED_OUTPUT_ROOT
from app.database.database import SessionLocal, is_database_available
from app.database.models import Paper, Project
from app.utils.file_utils import ensure_dir, safe_read_json, safe_write_json, utc_now_iso

PAPERS_FILENAME = "papers.json"

DEFAULT_PAPERS = [
    {
        "paper_id": "PAPER_1",
        "title": "Need Analysis Paper",
        "paper_type": "Need Analysis",
        "target_journal": "ICC2026",
        "status": "planned",
        "version": "v1",
    },
    {
        "paper_id": "PAPER_2",
        "title": "Development Paper",
        "paper_type": "Development",
        "target_journal": "ICC2026",
        "status": "planned",
        "version": "v1",
    },
    {
        "paper_id": "PAPER_3",
        "title": "Validation Paper",
        "paper_type": "Validation",
        "target_journal": "ICC2026",
        "status": "planned",
        "version": "v1",
    },
]


def database_enabled() -> bool:
    return bool(SessionLocal is not None and is_database_available())


def get_papers_path(project_id: str) -> Path:
    return ensure_dir(GENERATED_OUTPUT_ROOT / project_id) / PAPERS_FILENAME


def normalize_paper(project_id: str, paper: dict[str, object]) -> dict[str, object]:
    timestamp = utc_now_iso()
    return {
        "paper_id": str(paper.get("paper_id") or f"PAPER_{uuid4().hex[:6].upper()}").upper(),
        "project_id": project_id,
        "title": str(paper.get("title") or "Untitled Paper"),
        "paper_type": str(paper.get("paper_type") or "Journal Paper"),
        "target_journal": str(paper.get("target_journal") or "ICC2026"),
        "status": str(paper.get("status") or "planned"),
        "version": str(paper.get("version") or "v1"),
        "created_at": str(paper.get("created_at") or timestamp),
        "updated_at": timestamp,
    }


def read_json_papers(project_id: str) -> list[dict[str, object]]:
    path = get_papers_path(project_id)
    data = safe_read_json(path)
    if not data:
        papers = [normalize_paper(project_id, paper) for paper in DEFAULT_PAPERS]
        safe_write_json(path, {"project_id": project_id, "papers": papers}, status="planned")
        return papers

    papers = data.get("papers", [])
    return papers if isinstance(papers, list) else []


def write_json_papers(project_id: str, papers: list[dict[str, object]]) -> list[dict[str, object]]:
    safe_write_json(get_papers_path(project_id), {"project_id": project_id, "papers": papers}, status="updated")
    return papers


def get_project_by_identifier(db, project_id: str) -> Project | None:
    return db.scalars(
        select(Project).where(
            Project.is_deleted.is_(False),
            or_(
                Project.project_id == project_id,
                Project.human_readable_code == project_id,
                Project.id == project_id,
            ),
        )
    ).first()


def serialize_paper(project_identifier: str, paper: Paper) -> dict[str, object]:
    return {
        "paper_id": paper.paper_id,
        "project_id": project_identifier,
        "title": paper.title,
        "paper_type": paper.paper_type,
        "target_journal": paper.target_journal or "",
        "status": paper.status,
        "version": paper.version,
        "created_at": paper.created_at.isoformat() if paper.created_at else "",
        "updated_at": paper.updated_at.isoformat() if paper.updated_at else "",
    }


def ensure_default_papers(project_id: str) -> list[dict[str, object]]:
    if not database_enabled():
        existing = read_json_papers(project_id)
        by_id = {str(paper.get("paper_id")): paper for paper in existing}
        for paper in DEFAULT_PAPERS:
            paper_id = str(paper["paper_id"])
            by_id[paper_id] = normalize_paper(project_id, {**by_id.get(paper_id, {}), **paper})
        return write_json_papers(project_id, list(by_id.values()))

    assert SessionLocal is not None
    with SessionLocal() as db:
        project = get_project_by_identifier(db, project_id)
        if project is None:
            return read_json_papers(project_id)

        for paper in DEFAULT_PAPERS:
            existing = db.scalars(
                select(Paper).where(
                    and_(Paper.project_id == project.id, Paper.paper_id == paper["paper_id"])
                )
            ).first()
            if existing is None:
                db.add(
                    Paper(
                        project_id=project.id,
                        paper_id=str(paper["paper_id"]),
                        title=str(paper["title"]),
                        paper_type=str(paper["paper_type"]),
                        target_journal=str(paper["target_journal"]),
                        status=str(paper["status"]),
                        version=str(paper["version"]),
                    )
                )
            else:
                existing.title = str(paper["title"])
                existing.paper_type = str(paper["paper_type"])
                existing.target_journal = str(paper["target_journal"])
        db.commit()
        papers = db.scalars(select(Paper).where(Paper.project_id == project.id).order_by(Paper.paper_id)).all()
        return [serialize_paper(project_id, paper) for paper in papers]


def upsert_papers_from_plan(project_id: str, suggested_papers: list[dict[str, object]]) -> list[dict[str, object]]:
    if not suggested_papers:
        return ensure_default_papers(project_id)

    if not database_enabled():
        existing = read_json_papers(project_id)
        by_id = {str(paper.get("paper_id")): paper for paper in existing}
        for paper in suggested_papers:
            paper_id = str(paper.get("paper_id", "")).upper()
            by_id[paper_id] = normalize_paper(
                project_id,
                {
                    **by_id.get(paper_id, {}),
                    "paper_id": paper_id,
                    "title": paper.get("title", paper_id),
                    "paper_type": paper.get("paper_type", "Journal Paper"),
                    "target_journal": "ICC2026",
                    "status": paper.get("status", "planned"),
                },
            )
        return write_json_papers(project_id, list(by_id.values()))

    assert SessionLocal is not None
    with SessionLocal() as db:
        project = get_project_by_identifier(db, project_id)
        if project is None:
            return read_json_papers(project_id)
        for paper in suggested_papers:
            paper_id = str(paper.get("paper_id", "")).upper()
            existing = db.scalars(
                select(Paper).where(and_(Paper.project_id == project.id, Paper.paper_id == paper_id))
            ).first()
            if existing is None:
                db.add(
                    Paper(
                        project_id=project.id,
                        paper_id=paper_id,
                        title=str(paper.get("title", paper_id)),
                        paper_type=str(paper.get("paper_type", "Journal Paper")),
                        target_journal="ICC2026",
                        status=str(paper.get("status", "planned")),
                        version="v1",
                    )
                )
            else:
                existing.title = str(paper.get("title", existing.title))
                existing.paper_type = str(paper.get("paper_type", existing.paper_type))
                existing.status = str(paper.get("status", existing.status))
        db.commit()
        papers = db.scalars(select(Paper).where(Paper.project_id == project.id).order_by(Paper.paper_id)).all()
        return [serialize_paper(project_id, paper) for paper in papers]
