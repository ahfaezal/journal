from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import and_, select

from app.database.database import SessionLocal
from app.database.models import Paper
from app.services.paper_workspace_service import (
    database_enabled,
    ensure_default_papers,
    get_project_by_identifier,
    normalize_paper,
    read_json_papers,
    serialize_paper,
    write_json_papers,
)

router = APIRouter(prefix="/papers", tags=["papers"])


class PaperCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    paper_type: str = "Journal Paper"
    target_journal: str = "ICC2026"
    status: str = "planned"


class PaperUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    paper_type: str | None = None
    target_journal: str | None = None
    status: str | None = None
    version: str | None = None


@router.get("/{project_id}")
def get_project_papers(project_id: str) -> dict[str, object]:
    papers = ensure_default_papers(project_id)
    return {"project_id": project_id, "papers": papers, "total": len(papers)}


@router.post("/{project_id}")
def create_project_paper(project_id: str, payload: PaperCreate) -> dict[str, object]:
    if not database_enabled():
        papers = read_json_papers(project_id)
        paper_id = f"PAPER_{len(papers) + 1}"
        paper = normalize_paper(
            project_id,
            {
                "paper_id": paper_id,
                "title": payload.title,
                "paper_type": payload.paper_type,
                "target_journal": payload.target_journal,
                "status": payload.status,
                "version": "v1",
            },
        )
        papers.append(paper)
        write_json_papers(project_id, papers)
        return {"paper": paper}

    assert SessionLocal is not None
    with SessionLocal() as db:
        project = get_project_by_identifier(db, project_id)
        if project is None:
            raise HTTPException(status_code=404, detail="Project not found")

        existing_count = len(db.scalars(select(Paper).where(Paper.project_id == project.id)).all())
        paper_id = f"PAPER_{existing_count + 1}"
        paper = Paper(
            id=str(uuid4()),
            paper_id=paper_id,
            project_id=project.id,
            title=payload.title,
            paper_type=payload.paper_type,
            target_journal=payload.target_journal,
            status=payload.status,
            version="v1",
        )
        db.add(paper)
        db.commit()
        db.refresh(paper)
        return {"paper": serialize_paper(project_id, paper)}


@router.get("/{project_id}/{paper_id}")
def get_project_paper(project_id: str, paper_id: str) -> dict[str, object]:
    paper_id = paper_id.upper()
    if not database_enabled():
        paper = next((item for item in read_json_papers(project_id) if item.get("paper_id") == paper_id), None)
        if paper is None:
            raise HTTPException(status_code=404, detail="Paper not found")
        return {"paper": paper}

    assert SessionLocal is not None
    with SessionLocal() as db:
        project = get_project_by_identifier(db, project_id)
        if project is None:
            raise HTTPException(status_code=404, detail="Project not found")
        paper = db.scalars(
            select(Paper).where(and_(Paper.project_id == project.id, Paper.paper_id == paper_id))
        ).first()
        if paper is None:
            raise HTTPException(status_code=404, detail="Paper not found")
        return {"paper": serialize_paper(project_id, paper)}


@router.patch("/{project_id}/{paper_id}")
def update_project_paper(project_id: str, paper_id: str, payload: PaperUpdate) -> dict[str, object]:
    paper_id = paper_id.upper()
    update_data = payload.model_dump(exclude_unset=True)

    if not database_enabled():
        papers = read_json_papers(project_id)
        for index, paper in enumerate(papers):
            if paper.get("paper_id") == paper_id:
                updated = normalize_paper(project_id, {**paper, **update_data, "paper_id": paper_id})
                papers[index] = updated
                write_json_papers(project_id, papers)
                return {"paper": updated}
        raise HTTPException(status_code=404, detail="Paper not found")

    assert SessionLocal is not None
    with SessionLocal() as db:
        project = get_project_by_identifier(db, project_id)
        if project is None:
            raise HTTPException(status_code=404, detail="Project not found")
        paper = db.scalars(
            select(Paper).where(and_(Paper.project_id == project.id, Paper.paper_id == paper_id))
        ).first()
        if paper is None:
            raise HTTPException(status_code=404, detail="Paper not found")
        for field, value in update_data.items():
            setattr(paper, field, value)
        db.commit()
        db.refresh(paper)
        return {"paper": serialize_paper(project_id, paper)}


@router.delete("/{project_id}/{paper_id}")
def delete_project_paper(project_id: str, paper_id: str) -> dict[str, object]:
    paper_id = paper_id.upper()
    if not database_enabled():
        papers = [paper for paper in read_json_papers(project_id) if paper.get("paper_id") != paper_id]
        write_json_papers(project_id, papers)
        return {"project_id": project_id, "paper_id": paper_id, "deleted": True}

    assert SessionLocal is not None
    with SessionLocal() as db:
        project = get_project_by_identifier(db, project_id)
        if project is None:
            raise HTTPException(status_code=404, detail="Project not found")
        paper = db.scalars(
            select(Paper).where(and_(Paper.project_id == project.id, Paper.paper_id == paper_id))
        ).first()
        if paper is None:
            raise HTTPException(status_code=404, detail="Paper not found")
        db.delete(paper)
        db.commit()
        return {"project_id": project_id, "paper_id": paper_id, "deleted": True}
