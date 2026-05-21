import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException

from app.api.upload import get_project_upload_dir
from app.services.activity_logger_service import log_activity
from app.services.artifact_registry_service import register_artifact
from app.services.parser_service import parse_uploaded_documents
from app.utils.file_utils import safe_read_json, safe_write_json

router = APIRouter(prefix="/parser", tags=["parser"])

PROJECT_ROOT = Path(__file__).resolve().parents[3]
GENERATED_OUTPUT_ROOT = PROJECT_ROOT / "storage" / "generated_outputs"
PARSED_THESIS_FILENAME = "parsed_thesis.json"


def get_parsed_output_path(project_id: str) -> Path:
    output_dir = GENERATED_OUTPUT_ROOT / project_id
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir / PARSED_THESIS_FILENAME


def parse_project_uploads(project_id: str) -> dict[str, Any]:
    upload_dir = get_project_upload_dir(project_id)
    uploaded_files = [
        file_path
        for file_path in upload_dir.iterdir()
        if file_path.is_file() and not file_path.name.startswith(".")
    ]

    if not uploaded_files:
        raise HTTPException(
            status_code=404,
            detail="No uploaded thesis files found for this project.",
        )

    parsed_output = {
        "project_id": project_id,
        "status": "parsed",
        **parse_uploaded_documents(upload_dir),
    }

    output_path = get_parsed_output_path(project_id)
    parsed_output = safe_write_json(output_path, parsed_output, status="parsed")
    register_artifact(project_id, "parser", output_path, status="parsed")
    log_activity(
        project_id=project_id,
        activity_type="parse",
        activity_title="Thesis parsed",
        activity_description=(
            f"Parsed {len(parsed_output.get('headings', []))} heading(s), "
            f"{len(parsed_output.get('tables', []))} table(s), and "
            f"{len(parsed_output.get('citations', []))} citation(s)."
        ),
        source_module="parser",
        status="parsed",
    )

    return parsed_output


def read_parsed_thesis(project_id: str) -> dict[str, Any] | None:
    output_path = get_parsed_output_path(project_id)
    if not output_path.exists():
        return None

    return safe_read_json(output_path)


@router.post("/{project_id}/parse")
def parse_project_thesis(project_id: str) -> dict[str, Any]:
    return parse_project_uploads(project_id)


@router.get("/{project_id}")
def get_parsed_thesis(project_id: str) -> dict[str, Any]:
    parsed_output = read_parsed_thesis(project_id)
    if not parsed_output:
        raise HTTPException(
            status_code=404,
            detail="Parsed thesis output has not been generated for this project.",
        )

    return parsed_output
