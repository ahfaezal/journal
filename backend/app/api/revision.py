from pathlib import Path
from typing import Any

from fastapi import APIRouter

from app.api.audit import read_thesis_audit
from app.api.journal import get_generated_section_path, read_full_paper, read_generated_sections
from app.api.reviewer import read_reviewer_report
from app.core.constants import GENERATED_OUTPUT_ROOT
from app.services.artifact_registry_service import register_artifact
from app.services.apply_revision_service import apply_revision_to_section, read_applied_revisions
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


@router.post("/{project_id}/{paper_id}/apply/{revision_id}")
def apply_project_revision(project_id: str, paper_id: str, revision_id: str) -> dict[str, Any]:
    paper_id = paper_id.upper()
    revision_report = read_revision_report(project_id, paper_id)
    result = apply_revision_to_section(
        project_id=project_id,
        paper_id=paper_id,
        revision_id=revision_id,
        revision_report=revision_report,
        generated_sections=read_generated_sections(project_id, paper_id),
        generated_section_path_builder=get_generated_section_path,
        revision_output_root=GENERATED_OUTPUT_ROOT,
        applied_by="Dr. Zahirwan",
    )
    if revision_report:
        safe_write_json(get_revision_report_json_path(project_id, paper_id), revision_report, status="generated")
    revised_section = result["revised_section"]
    applied_revision = result["applied_revision"]
    register_artifact(
        project_id,
        "applied_revision",
        Path(applied_revision["revised_path"]),
        paper_id=paper_id,
        section_name=revised_section.get("section_name", ""),
        status="applied",
    )
    register_artifact(
        project_id,
        "section_writer",
        Path(applied_revision["current_section_path"]),
        paper_id=paper_id,
        section_name=revised_section.get("section_name", ""),
        status="drafted",
    )
    return result


@router.get("/{project_id}/{paper_id}/applied")
def get_project_applied_revisions(project_id: str, paper_id: str) -> dict[str, Any]:
    paper_id = paper_id.upper()
    applied = read_applied_revisions(GENERATED_OUTPUT_ROOT, project_id, paper_id)
    return {
        "project_id": project_id,
        "paper_id": paper_id,
        "applied_revisions": applied,
        "total_applied": len(applied),
        "status": "loaded",
    }


def build_revision_report_from_outputs(project_id: str, paper_id: str) -> dict[str, Any]:
    return build_revision_report(
        project_id=project_id,
        paper_id=paper_id,
        reviewer_report=read_reviewer_report(project_id, paper_id),
        generated_sections=read_generated_sections(project_id, paper_id),
        full_paper=read_full_paper(project_id, paper_id),
        thesis_audit=read_thesis_audit(project_id),
    )
