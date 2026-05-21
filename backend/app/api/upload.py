import json
from pathlib import Path
from shutil import copyfileobj

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.database import SessionLocal, is_database_available
from app.database.models import Project, Upload

router = APIRouter(prefix="/upload", tags=["upload"])

PROJECT_ROOT = Path(__file__).resolve().parents[3]
UPLOAD_ROOT = PROJECT_ROOT / "storage" / "uploads"
METADATA_FILENAME = ".uploads_metadata.json"


def get_project_upload_dir(project_id: str) -> Path:
    project_upload_dir = UPLOAD_ROOT / project_id
    project_upload_dir.mkdir(parents=True, exist_ok=True)
    return project_upload_dir


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


def build_file_response(
    file_type: str,
    chapter_label: str,
    file_path: Path | None = None,
    filename: str | None = None,
    size: int | None = None,
    status: str = "uploaded",
) -> dict[str, object]:
    resolved_filename = filename or (file_path.name if file_path else "")
    resolved_size = size if size is not None else (file_path.stat().st_size if file_path else 0)
    return {
        "filename": resolved_filename,
        "file_type": file_type,
        "chapter_label": chapter_label,
        "size": resolved_size,
        "status": status,
    }


def get_metadata_path(project_id: str) -> Path:
    return get_project_upload_dir(project_id) / METADATA_FILENAME


def read_upload_metadata(project_id: str) -> dict[str, dict[str, str]]:
    metadata_path = get_metadata_path(project_id)
    if not metadata_path.exists():
        return {}

    with metadata_path.open("r", encoding="utf-8") as metadata_file:
        data = json.load(metadata_file)

    return data if isinstance(data, dict) else {}


def write_upload_metadata(project_id: str, metadata: dict[str, dict[str, str]]) -> None:
    metadata_path = get_metadata_path(project_id)
    with metadata_path.open("w", encoding="utf-8") as metadata_file:
        json.dump(metadata, metadata_file, indent=2)


def save_upload_metadata_to_db(
    project_id: str,
    original_filename: str,
    stored_filename: str,
    file_path: Path,
    file_type: str,
    chapter_label: str,
    mime_type: str | None,
    size_bytes: int,
) -> Upload:
    with open_session() as db:
        project = get_project_by_identifier(db, project_id)
        if project is None:
            raise HTTPException(status_code=404, detail="Project not found")

        upload = Upload(
            project_id=project.id,
            file_type=file_type,
            chapter_label=chapter_label,
            original_filename=original_filename,
            stored_filename=stored_filename,
            file_path=str(file_path),
            mime_type=mime_type,
            size_bytes=size_bytes,
            status="uploaded",
            metadata_json={"external_project_id": project_id},
        )
        db.add(upload)
        db.commit()
        db.refresh(upload)
        return upload


def serialize_upload(upload: Upload, status: str = "stored") -> dict[str, object]:
    return build_file_response(
        file_type=upload.file_type,
        chapter_label=upload.chapter_label or "Uploaded Document",
        filename=upload.stored_filename,
        size=upload.size_bytes,
        status=status,
    )


@router.post("/thesis")
async def upload_thesis(file: UploadFile | None = None) -> dict[str, object]:
    filename = file.filename if file else "mock-thesis-document.docx"

    return {
        "status": "uploaded",
        "message": "Mock thesis upload received.",
        "filename": filename,
        "detected_chapters": ["Bab 1", "Bab 2", "Bab 3", "Bab 4", "Bab 5"],
        "next_step": "Build Thesis Intelligence",
    }


@router.post("/thesis/{project_id}")
async def upload_thesis_file(
    project_id: str,
    file: UploadFile = File(...),
    file_type: str = Form(...),
    chapter_label: str = Form(...),
) -> dict[str, object]:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Uploaded file must include a filename.")

    safe_filename = Path(file.filename).name
    target_dir = get_project_upload_dir(project_id)
    target_path = target_dir / safe_filename

    with target_path.open("wb") as output_file:
        copyfileobj(file.file, output_file)

    size_bytes = target_path.stat().st_size

    if database_enabled():
        upload = save_upload_metadata_to_db(
            project_id=project_id,
            original_filename=safe_filename,
            stored_filename=safe_filename,
            file_path=target_path,
            file_type=file_type,
            chapter_label=chapter_label,
            mime_type=file.content_type,
            size_bytes=size_bytes,
        )
        upload_response = serialize_upload(upload, status="uploaded")
    else:
        metadata = read_upload_metadata(project_id)
        metadata[safe_filename] = {
            "file_type": file_type,
            "chapter_label": chapter_label,
            "original_filename": safe_filename,
            "stored_filename": safe_filename,
            "file_path": str(target_path),
            "mime_type": file.content_type or "",
            "size_bytes": str(size_bytes),
            "status": "uploaded",
        }
        write_upload_metadata(project_id, metadata)
        upload_response = build_file_response(
            file_path=target_path,
            file_type=file_type,
            chapter_label=chapter_label,
        )

    return {
        "project_id": project_id,
        **upload_response,
    }


@router.get("/thesis/{project_id}/files")
def get_uploaded_files(project_id: str) -> dict[str, object]:
    if database_enabled():
        with open_session() as db:
            project = get_project_by_identifier(db, project_id)
            if project is None:
                raise HTTPException(status_code=404, detail="Project not found")

            uploads = db.scalars(
                select(Upload)
                .where(Upload.project_id == project.id)
                .order_by(Upload.created_at.desc())
            ).all()
            return {
                "project_id": project_id,
                "files": [serialize_upload(upload) for upload in uploads],
            }

    target_dir = get_project_upload_dir(project_id)
    metadata = read_upload_metadata(project_id)
    files = []

    for file_path in sorted(target_dir.iterdir()):
        if file_path.is_file() and file_path.name != METADATA_FILENAME:
            file_metadata = metadata.get(file_path.name, {})
            files.append(
                build_file_response(
                    file_path=file_path,
                    file_type=file_metadata.get("file_type", "uploaded"),
                    chapter_label=file_metadata.get("chapter_label", "Uploaded Document"),
                    status="stored",
                )
            )

    return {
        "project_id": project_id,
        "files": files,
    }
