import json
from pathlib import Path
from shutil import copyfileobj

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

router = APIRouter(prefix="/upload", tags=["upload"])

PROJECT_ROOT = Path(__file__).resolve().parents[3]
UPLOAD_ROOT = PROJECT_ROOT / "storage" / "uploads"
METADATA_FILENAME = ".uploads_metadata.json"


def get_project_upload_dir(project_id: str) -> Path:
    project_upload_dir = UPLOAD_ROOT / project_id
    project_upload_dir.mkdir(parents=True, exist_ok=True)
    return project_upload_dir


def build_file_response(
    file_path: Path,
    file_type: str,
    chapter_label: str,
    status: str = "uploaded",
) -> dict[str, object]:
    return {
        "filename": file_path.name,
        "file_type": file_type,
        "chapter_label": chapter_label,
        "size": file_path.stat().st_size,
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

    metadata = read_upload_metadata(project_id)
    metadata[safe_filename] = {
        "file_type": file_type,
        "chapter_label": chapter_label,
    }
    write_upload_metadata(project_id, metadata)

    return {
        "project_id": project_id,
        **build_file_response(
            file_path=target_path,
            file_type=file_type,
            chapter_label=chapter_label,
        ),
    }


@router.get("/thesis/{project_id}/files")
def get_uploaded_files(project_id: str) -> dict[str, object]:
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
