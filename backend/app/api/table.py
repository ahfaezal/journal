import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException

from app.api.parser import read_parsed_thesis
from app.services.table_mapper_service import build_table_map

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

    with output_path.open("r", encoding="utf-8") as output_file:
        return json.load(output_file)


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
    with output_path.open("w", encoding="utf-8") as output_file:
        json.dump(table_map, output_file, indent=2, ensure_ascii=False)

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
