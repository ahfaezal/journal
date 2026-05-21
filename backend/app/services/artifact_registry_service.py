from collections import defaultdict
from pathlib import Path
from typing import Any

from sqlalchemy import desc, or_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.constants import ARTIFACT_VERSION
from app.database.database import SessionLocal, is_database_available
from app.database.models import GeneratedArtifact, Project


def database_enabled() -> bool:
    return bool(settings.database_url and SessionLocal is not None and is_database_available())


def open_session() -> Session:
    if SessionLocal is None:
        raise RuntimeError("DATABASE_URL is not configured.")
    return SessionLocal()


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


def infer_file_format(file_path: str | Path, explicit_format: str | None = None) -> str:
    if explicit_format:
        return explicit_format.lower().lstrip(".")
    suffix = Path(file_path).suffix.lower().lstrip(".")
    return suffix or "json"


def serialize_artifact(artifact: GeneratedArtifact) -> dict[str, Any]:
    return {
        "id": artifact.id,
        "artifact_id": artifact.artifact_id,
        "artifact_type": artifact.artifact_type,
        "paper_id": artifact.paper_id or "",
        "section_name": artifact.section_name or "",
        "file_path": artifact.file_path,
        "file_format": artifact.file_format,
        "version": artifact.version,
        "status": artifact.status,
        "metadata_json": artifact.metadata_json or {},
        "created_at": artifact.created_at.isoformat() if artifact.created_at else "",
        "updated_at": artifact.updated_at.isoformat() if artifact.updated_at else "",
    }


def register_artifact(
    project_id: str,
    artifact_type: str,
    file_path: str | Path,
    paper_id: str | None = None,
    section_name: str | None = None,
    file_format: str | None = None,
    version: str = ARTIFACT_VERSION,
    status: str = "generated",
    metadata_json: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    if not database_enabled():
        return None

    with open_session() as db:
        project = get_project_by_identifier(db, project_id)
        if project is None:
            return None

        artifact = GeneratedArtifact(
            project_id=project.id,
            artifact_type=artifact_type,
            paper_id=paper_id,
            section_name=section_name,
            file_path=str(file_path),
            file_format=infer_file_format(file_path, file_format),
            version=version,
            status=status,
            metadata_json=metadata_json or {},
        )
        db.add(artifact)
        db.commit()
        db.refresh(artifact)
        return serialize_artifact(artifact)


def get_project_artifacts(project_id: str) -> list[dict[str, Any]]:
    if not database_enabled():
        return []

    with open_session() as db:
        project = get_project_by_identifier(db, project_id)
        if project is None:
            return []

        artifacts = db.scalars(
            select(GeneratedArtifact)
            .where(GeneratedArtifact.project_id == project.id)
            .order_by(desc(GeneratedArtifact.created_at))
        ).all()
        return [serialize_artifact(artifact) for artifact in artifacts]


def get_latest_artifact(
    project_id: str,
    artifact_type: str | None = None,
    file_format: str | None = None,
) -> dict[str, Any] | None:
    if not database_enabled():
        return None

    with open_session() as db:
        project = get_project_by_identifier(db, project_id)
        if project is None:
            return None

        statement = select(GeneratedArtifact).where(GeneratedArtifact.project_id == project.id)
        if artifact_type:
            statement = statement.where(GeneratedArtifact.artifact_type == artifact_type)
        if file_format:
            statement = statement.where(GeneratedArtifact.file_format == file_format)

        artifact = db.scalars(statement.order_by(desc(GeneratedArtifact.created_at))).first()
        return serialize_artifact(artifact) if artifact else None


def summarize_artifacts(project_id: str) -> dict[str, Any]:
    artifacts = get_project_artifacts(project_id)
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    counts_by_type: dict[str, int] = defaultdict(int)
    latest_artifacts: dict[str, dict[str, Any]] = {}

    for artifact in artifacts:
        artifact_type = str(artifact["artifact_type"])
        grouped[artifact_type].append(artifact)
        counts_by_type[artifact_type] += 1
        latest_artifacts.setdefault(artifact_type, artifact)

    latest_docx = next((artifact for artifact in artifacts if artifact["file_format"] == "docx"), None)
    latest_markdown = next((artifact for artifact in artifacts if artifact["file_format"] == "md"), None)
    latest_audit = latest_artifacts.get("audit")

    return {
        "project_id": project_id,
        "total_artifacts": len(artifacts),
        "grouped_artifacts": dict(grouped),
        "latest_artifacts": latest_artifacts,
        "counts_by_type": dict(counts_by_type),
        "latest_docx": latest_docx,
        "latest_markdown": latest_markdown,
        "latest_audit": latest_audit,
    }
