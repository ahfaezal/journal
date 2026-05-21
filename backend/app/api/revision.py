from pathlib import Path
from typing import Any

from fastapi import APIRouter

from app.api.audit import read_thesis_audit
from app.api.journal import read_full_paper, read_generated_sections
from app.api.reviewer import read_reviewer_report
from app.core.constants import GENERATED_OUTPUT_ROOT
from app.services.artifact_registry_service import register_artifact
from app.services.revision_engine_service import build_markdown, build_revision_report
from app.utils.file_utils import safe_read_json, safe_write_json

router = APIRouter(prefix="/revision", tags=["revision"])


def get_revision_report_json_path(project_id: str, paper_id: str) -> Path:
    output_dir = GENERATED_OUTPUT_ROOT / project_id
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir / f"revision_report_{paper_id}.json"


def get_revision_report_markdown_path(project_id: str, paper_id: str) -> Path:
    output_dir = GENERATED_OUTPUT_ROOT / project_id
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir / f"revision_report_{paper_id}.md"


def read_revision_report(project_id: str, paper_id: str) -> dict[str, Any] | None:
    output_path = get_revision_report_json_path(project_id, paper_id)
    if not output_path.exists():
        return None

    return safe_read_json(output_path)


@router.post("/{project_id}/{paper_id}/generate")
def generate_project_revision_report(project_id: str, paper_id: str) -> dict[str, Any]:
    paper_id = paper_id.upper()
    report = build_revision_report_from_outputs(project_id, paper_id)
    json_path = get_revision_report_json_path(project_id, paper_id)
    markdown_path = get_revision_report_markdown_path(project_id, paper_id)

    report = safe_write_json(json_path, report, status="generated")
    with markdown_path.open("w", encoding="utf-8") as output_file:
        output_file.write(build_markdown(report))

    register_artifact(project_id, "revision_report", json_path, paper_id=paper_id, status="generated")
    register_artifact(project_id, "revision_report", markdown_path, paper_id=paper_id, status="generated")
    return report


@router.get("/{project_id}/{paper_id}")
def get_project_revision_report(project_id: str, paper_id: str) -> dict[str, Any]:
    paper_id = paper_id.upper()
    report = read_revision_report(project_id, paper_id)
    if report:
        return report

    return build_revision_report_from_outputs(project_id, paper_id)


def build_revision_report_from_outputs(project_id: str, paper_id: str) -> dict[str, Any]:
    return build_revision_report(
        project_id=project_id,
        paper_id=paper_id,
        reviewer_report=read_reviewer_report(project_id, paper_id),
        generated_sections=read_generated_sections(project_id, paper_id),
        full_paper=read_full_paper(project_id, paper_id),
        thesis_audit=read_thesis_audit(project_id),
    )
