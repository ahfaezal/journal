import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException

from app.api.parser import read_parsed_thesis
from app.api.upload import read_upload_metadata
from app.services.citation_mapper_service import build_citation_map

router = APIRouter(prefix="/citation", tags=["citation"])

PROJECT_ROOT = Path(__file__).resolve().parents[3]
GENERATED_OUTPUT_ROOT = PROJECT_ROOT / "storage" / "generated_outputs"
CITATION_MAP_FILENAME = "citation_map.json"


def get_citation_map_output_path(project_id: str) -> Path:
    output_dir = GENERATED_OUTPUT_ROOT / project_id
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir / CITATION_MAP_FILENAME


def read_citation_map(project_id: str) -> dict[str, Any] | None:
    output_path = get_citation_map_output_path(project_id)
    if not output_path.exists():
        return None

    with output_path.open("r", encoding="utf-8") as output_file:
        return json.load(output_file)


@router.post("/{project_id}/map")
def map_project_citations(project_id: str) -> dict[str, Any]:
    parsed_thesis = read_parsed_thesis(project_id)
    if not parsed_thesis:
        raise HTTPException(
            status_code=404,
            detail="Parsed thesis output is required before building citation map.",
        )

    citation_map = build_citation_map(
        project_id=project_id,
        parsed_thesis=parsed_thesis,
        upload_metadata=read_upload_metadata(project_id),
    )

    output_path = get_citation_map_output_path(project_id)
    with output_path.open("w", encoding="utf-8") as output_file:
        json.dump(citation_map, output_file, indent=2, ensure_ascii=False)

    return citation_map


@router.get("/{project_id}")
def get_project_citation_map(project_id: str) -> dict[str, Any]:
    citation_map = read_citation_map(project_id)
    if not citation_map:
        raise HTTPException(
            status_code=404,
            detail="Citation map has not been generated for this project.",
        )

    return citation_map
