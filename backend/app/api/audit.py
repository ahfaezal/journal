import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter

from app.api.citation import read_citation_map
from app.api.intelligence import get_intelligence_output_path
from app.api.objective import read_objective_map
from app.api.parser import read_parsed_thesis
from app.api.table import read_table_map
from app.services.artifact_registry_service import register_artifact
from app.services.audit_engine_service import build_thesis_audit
from app.utils.file_utils import safe_read_json, safe_write_json

router = APIRouter(prefix="/audit", tags=["audit"])

PROJECT_ROOT = Path(__file__).resolve().parents[3]
GENERATED_OUTPUT_ROOT = PROJECT_ROOT / "storage" / "generated_outputs"
THESIS_AUDIT_FILENAME = "thesis_audit.json"


def get_audit_output_path(project_id: str) -> Path:
    output_dir = GENERATED_OUTPUT_ROOT / project_id
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir / THESIS_AUDIT_FILENAME


def read_thesis_audit(project_id: str) -> dict[str, Any] | None:
    output_path = get_audit_output_path(project_id)
    if not output_path.exists():
        return None

    return safe_read_json(output_path)


def read_thesis_intelligence(project_id: str) -> dict[str, Any] | None:
    output_path = get_intelligence_output_path(project_id)
    if not output_path.exists():
        return None

    return safe_read_json(output_path)


@router.post("/{project_id}/run")
def run_project_audit(project_id: str) -> dict[str, Any]:
    audit_report = build_thesis_audit(
        project_id=project_id,
        parsed_thesis=read_parsed_thesis(project_id),
        citation_map=read_citation_map(project_id),
        objective_map=read_objective_map(project_id),
        table_map=read_table_map(project_id),
        thesis_intelligence=read_thesis_intelligence(project_id),
    )

    output_path = get_audit_output_path(project_id)
    audit_report = safe_write_json(output_path, audit_report, status="audited")
    register_artifact(project_id, "audit", output_path, status="audited")

    return audit_report


@router.get("/{project_id}")
def get_project_audit(project_id: str) -> dict[str, Any]:
    audit_report = read_thesis_audit(project_id)
    if audit_report:
        return audit_report

    return build_thesis_audit(
        project_id=project_id,
        parsed_thesis=read_parsed_thesis(project_id),
        citation_map=read_citation_map(project_id),
        objective_map=read_objective_map(project_id),
        table_map=read_table_map(project_id),
        thesis_intelligence=read_thesis_intelligence(project_id),
    )
