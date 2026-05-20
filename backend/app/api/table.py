import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException

from app.api.parser import read_parsed_thesis
from app.services.artifact_registry_service import register_artifact
from app.services.table_mapper_service import build_table_map
from app.utils.file_utils import safe_read_json, safe_write_json

router = APIRouter(prefix="/table", tags=["table"])

PROJECT_ROOT = Path(__file__).resolve().parents[3]
GENERATED_OUTPUT_ROOT = PROJECT_ROOT / "storage" / "generated_outputs"
TABLE_MAP_FILENAME = "table_map.json"


def get_table_map_output_path(project_id: str) -> Path:
    output_dir = GENERATED_OUTPUT_ROOT / project_id
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir / TABLE_MAP_FILENAME


def read_table_map(project_id: str) -> dict[str, Any] | None:
    output_path = get_table_map_output_path(project_id)
    if not output_path.exists():
        return None

    return safe_read_json(output_path)


@router.post("/{project_id}/map")
def map_project_tables(project_id: str) -> dict[str, Any]:
    parsed_thesis = read_parsed_thesis(project_id)
    if not parsed_thesis:
        raise HTTPException(
            status_code=404,
            detail="Parsed thesis output is required before building table map.",
        )

    table_map = build_table_map(project_id=project_id, parsed_thesis=parsed_thesis)
    output_path = get_table_map_output_path(project_id)
    table_map = safe_write_json(output_path, table_map, status="mapped")
    register_artifact(project_id, "table_map", output_path, status="mapped")

    return table_map


@router.get("/{project_id}")
def get_project_table_map(project_id: str) -> dict[str, Any]:
    table_map = read_table_map(project_id)
    if not table_map:
        raise HTTPException(
            status_code=404,
            detail="Table map has not been generated for this project.",
        )

    return table_map
