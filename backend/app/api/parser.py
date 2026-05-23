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
OBJECTIVE_DEBUG_FILENAME = "objective_debug.txt"


def get_parsed_output_path(project_id: str) -> Path:
    output_dir = GENERATED_OUTPUT_ROOT / project_id
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir / PARSED_THESIS_FILENAME


def get_objective_debug_path(project_id: str) -> Path:
    output_dir = GENERATED_OUTPUT_ROOT / project_id / "parsed_thesis"
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir / OBJECTIVE_DEBUG_FILENAME


def format_objective_debug(parsed_output: dict[str, Any]) -> str:
    debug = parsed_output.get("objective_debug", {})
    metadata = parsed_output.get("objective_extraction_metadata", {})
    if not isinstance(debug, dict):
        debug = {}
    if not isinstance(metadata, dict):
        metadata = {}

    objectives = debug.get("detected_objectives", parsed_output.get("objectives", []))
    objective_lines = []
    if isinstance(objectives, list):
        for index, objective in enumerate(objectives, start=1):
            if isinstance(objective, dict):
                objective_lines.append(f"{index}. {objective.get('objective_text', objective)}")
            else:
                objective_lines.append(f"{index}. {objective}")

    return "\n".join(
        [
            "OBJECTIVE DEBUG",
            f"selected_heading: {debug.get('selected_heading') or metadata.get('selected_heading', '')}",
            f"selected_subheading: {debug.get('selected_subheading') or metadata.get('selected_subheading', '')}",
            f"objective_extraction_status: {debug.get('objective_extraction_status') or parsed_output.get('objective_extraction_status', '')}",
            f"reason_for_fallback: {debug.get('reason_for_fallback', '')}",
            "",
            "Detected heading:",
            str(debug.get("selected_heading") or metadata.get("selected_heading", "")),
            "",
            "Detected subheading:",
            str(debug.get("selected_subheading") or metadata.get("selected_subheading", "")),
            "",
            "Detected objectives:",
            "\n".join(objective_lines) if objective_lines else "None",
            "",
            "Fallback reason:",
            str(debug.get("fallback_reason") or debug.get("reason_for_fallback", "")),
            "",
            "Raw objective section:",
            str(debug.get("raw_objective_section", "")),
        ]
    )


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
    get_objective_debug_path(project_id).write_text(
        format_objective_debug(parsed_output),
        encoding="utf-8",
    )
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


@router.get("/{project_id}/objective-debug")
def get_objective_debug(project_id: str) -> dict[str, str]:
    debug_path = get_objective_debug_path(project_id)
    if not debug_path.exists():
        parsed_output = read_parsed_thesis(project_id)
        if not parsed_output:
            raise HTTPException(
                status_code=404,
                detail="Objective debug output has not been generated for this project.",
            )
        debug_path.write_text(format_objective_debug(parsed_output), encoding="utf-8")

    return {
        "project_id": project_id,
        "objective_debug": debug_path.read_text(encoding="utf-8"),
    }
