import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException

from app.api.intelligence import get_intelligence_output_path
from app.api.parser import read_parsed_thesis
from app.services.artifact_registry_service import register_artifact
from app.services.objective_mapper_service import build_objective_map
from app.utils.file_utils import safe_read_json, safe_write_json

router = APIRouter(prefix="/objective", tags=["objective"])

PROJECT_ROOT = Path(__file__).resolve().parents[3]
GENERATED_OUTPUT_ROOT = PROJECT_ROOT / "storage" / "generated_outputs"
OBJECTIVE_MAP_FILENAME = "objective_map.json"


def get_objective_map_output_path(project_id: str) -> Path:
    output_dir = GENERATED_OUTPUT_ROOT / project_id
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir / OBJECTIVE_MAP_FILENAME


def read_objective_map(project_id: str) -> dict[str, Any] | None:
    output_path = get_objective_map_output_path(project_id)
    if not output_path.exists():
        return None

    return safe_read_json(output_path)


def read_thesis_intelligence(project_id: str) -> dict[str, Any] | None:
    output_path = get_intelligence_output_path(project_id)
    if not output_path.exists():
        return None

    return safe_read_json(output_path)


@router.post("/{project_id}/map")
def map_project_objectives(project_id: str) -> dict[str, Any]:
    parsed_thesis = read_parsed_thesis(project_id)
    if not parsed_thesis:
        raise HTTPException(
            status_code=404,
            detail="Parsed thesis output is required before building objective map.",
        )

    objective_map = build_objective_map(
        project_id=project_id,
        parsed_thesis=parsed_thesis,
        thesis_intelligence=read_thesis_intelligence(project_id),
    )

    output_path = get_objective_map_output_path(project_id)
    objective_map = safe_write_json(output_path, objective_map, status="mapped")
    register_artifact(project_id, "objective_map", output_path, status="mapped")

    return objective_map


@router.get("/{project_id}")
def get_project_objective_map(project_id: str) -> dict[str, Any]:
    objective_map = read_objective_map(project_id)
    if not objective_map:
        raise HTTPException(
            status_code=404,
            detail="Objective map has not been generated for this project.",
        )

    return objective_map
