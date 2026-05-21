import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Callable

from fastapi import APIRouter, HTTPException

from app.api.audit import get_audit_output_path, run_project_audit
from app.api.citation import get_citation_map_output_path, map_project_citations
from app.api.intelligence import build_thesis_intelligence, get_intelligence_output_path
from app.api.journal import (
    build_project_journal_plan,
    build_project_paper_extraction,
    build_project_references,
    build_project_section_structure,
    generate_project_formatted_docx,
    generate_project_section,
    get_formatted_docx_path,
    get_formatting_report_path,
    get_full_paper_json_path,
    get_full_paper_markdown_path,
    get_journal_plan_output_path,
    get_paper_extraction_output_path,
    get_project_submission_status,
    get_reference_bank_json_path,
    get_section_structure_output_path,
    integrate_project_full_paper,
    lock_project_section,
)
from app.api.knowledge_graph import get_knowledge_graph_output_path, build_project_knowledge_graph
from app.api.objective import get_objective_map_output_path, map_project_objectives
from app.api.parser import get_parsed_output_path, parse_project_thesis
from app.api.reviewer import get_reviewer_report_json_path, run_project_reviewer_simulation
from app.api.table import get_table_map_output_path, map_project_tables
from app.services.artifact_registry_service import register_artifact
from app.services.auto_regeneration_service import build_auto_regeneration_metadata, output_summary
from app.utils.file_utils import safe_read_json, safe_write_json

router = APIRouter(prefix="/workflow", tags=["workflow"])

PROJECT_ROOT = Path(__file__).resolve().parents[3]
GENERATED_OUTPUT_ROOT = PROJECT_ROOT / "storage" / "generated_outputs"
WORKFLOW_RUN_FILENAME = "workflow_run.json"
PAPER_ID = "PAPER_1"
SECTION_NAMES = [
    "Abstract",
    "Introduction",
    "Problem Statement",
    "Literature Review",
    "Methodology",
    "Findings",
    "Discussion",
    "Conclusion",
]


def get_workflow_run_path(project_id: str) -> Path:
    output_dir = GENERATED_OUTPUT_ROOT / project_id
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir / WORKFLOW_RUN_FILENAME


def read_workflow_run(project_id: str) -> dict[str, Any] | None:
    output_path = get_workflow_run_path(project_id)
    if not output_path.exists():
        return None

    return safe_read_json(output_path)


def get_auto_regeneration_path(project_id: str, paper_id: str) -> Path:
    output_dir = GENERATED_OUTPUT_ROOT / project_id
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir / f"auto_regeneration_{paper_id}.json"


def read_auto_regeneration(project_id: str, paper_id: str) -> dict[str, Any] | None:
    output_path = get_auto_regeneration_path(project_id, paper_id)
    if not output_path.exists():
        return None

    return safe_read_json(output_path)


@router.post("/{project_id}/run-full-pipeline")
def run_full_pipeline(project_id: str) -> dict[str, Any]:
    completed_steps: list[dict[str, str]] = []
    failed_step: str | None = None

    steps: list[tuple[str, Callable[[], Any]]] = [
        ("parse thesis", lambda: parse_project_thesis(project_id)),
        ("build intelligence", lambda: build_thesis_intelligence(project_id)),
        ("build citation map", lambda: map_project_citations(project_id)),
        ("build objective map", lambda: map_project_objectives(project_id)),
        ("build table map", lambda: map_project_tables(project_id)),
        ("run thesis audit", lambda: run_project_audit(project_id)),
        ("build knowledge graph", lambda: build_project_knowledge_graph(project_id)),
        ("build journal planner", lambda: build_project_journal_plan(project_id)),
        ("build paper extraction for PAPER_1", lambda: build_project_paper_extraction(project_id, PAPER_ID)),
        ("build section structure for PAPER_1", lambda: build_project_section_structure(project_id, PAPER_ID)),
    ]

    try:
        for step_name, runner in steps:
            runner()
            completed_steps.append({"step": step_name, "status": "completed"})

        for section_name in SECTION_NAMES:
            generate_project_section(project_id, PAPER_ID, section_name)
            completed_steps.append({"step": f"generate {section_name}", "status": "completed"})

        for section_name in SECTION_NAMES:
            lock_project_section(project_id, PAPER_ID, section_name)
            completed_steps.append({"step": f"lock {section_name}", "status": "completed"})

        final_steps: list[tuple[str, Callable[[], Any]]] = [
            ("integrate full paper", lambda: integrate_project_full_paper(project_id, PAPER_ID)),
            ("build references", lambda: build_project_references(project_id, PAPER_ID)),
            ("generate formatted DOCX", lambda: generate_project_formatted_docx(project_id, PAPER_ID)),
            ("build submission status", lambda: get_project_submission_status(project_id, PAPER_ID)),
        ]
        for step_name, runner in final_steps:
            runner()
            completed_steps.append({"step": step_name, "status": "completed"})

        pipeline_status = "completed"
        error_message = ""
    except Exception as error:  # noqa: BLE001 - capture pipeline failure for workflow report
        pipeline_status = "failed"
        failed_step = infer_failed_step(completed_steps)
        error_message = str(error)

    summary = build_workflow_summary(
        project_id=project_id,
        pipeline_status=pipeline_status,
        completed_steps=completed_steps,
        failed_step=failed_step,
        error_message=error_message,
    )
    write_workflow_summary(project_id, summary)
    return summary


@router.get("/{project_id}/status")
def get_workflow_status(project_id: str) -> dict[str, Any]:
    workflow_run = read_workflow_run(project_id)
    if not workflow_run:
        raise HTTPException(
            status_code=404,
            detail="No workflow run summary found for this project.",
        )

    return workflow_run


@router.post("/{project_id}/{paper_id}/auto-regenerate")
def auto_regenerate_project_paper(project_id: str, paper_id: str) -> dict[str, Any]:
    paper_id = paper_id.upper()
    try:
        full_paper = integrate_project_full_paper(project_id, paper_id)
        reference_bank = build_project_references(project_id, paper_id)
        formatting_report = generate_project_formatted_docx(project_id, paper_id)
        reviewer_report = run_project_reviewer_simulation(project_id, paper_id)
        submission_status = get_project_submission_status(project_id, paper_id)

        updated_outputs = [
            output_summary("Full Paper JSON", get_full_paper_json_path(project_id, paper_id)),
            output_summary("Full Paper Markdown", get_full_paper_markdown_path(project_id, paper_id)),
            output_summary("Reference Bank", get_reference_bank_json_path(project_id, paper_id)),
            output_summary("Formatting Report", get_formatting_report_path(project_id, paper_id)),
            output_summary("Formatted DOCX", get_formatted_docx_path(project_id, paper_id)),
            output_summary("Reviewer Report", get_reviewer_report_json_path(project_id, paper_id)),
        ]
        triggered_by_revision = latest_revision_trigger(project_id, paper_id)
        metadata = build_auto_regeneration_metadata(
            project_id=project_id,
            paper_id=paper_id,
            triggered_by_revision=triggered_by_revision,
            updated_outputs=updated_outputs,
            reviewer_report=reviewer_report,
            submission_status=submission_status,
        )
        output_path = get_auto_regeneration_path(project_id, paper_id)
        metadata = safe_write_json(output_path, metadata, status="regenerated")
        register_artifact(project_id, "auto_regeneration", output_path, paper_id=paper_id, status="regenerated")
        return {
            **metadata,
            "refreshed_outputs": {
                "full_paper_status": full_paper.get("status", "integrated"),
                "reference_status": reference_bank.get("status", "built"),
                "formatting_status": formatting_report.get("status", "formatted"),
                "submission_status": submission_status.get("status", "in_progress"),
            },
        }
    except Exception as error:  # noqa: BLE001 - return pipeline failure metadata
        raise HTTPException(status_code=500, detail=f"Auto regeneration failed: {error}") from error


def infer_failed_step(completed_steps: list[dict[str, str]]) -> str:
    all_step_names = [
        "parse thesis",
        "build intelligence",
        "build citation map",
        "build objective map",
        "build table map",
        "run thesis audit",
        "build knowledge graph",
        "build journal planner",
        "build paper extraction for PAPER_1",
        "build section structure for PAPER_1",
        *[f"generate {section_name}" for section_name in SECTION_NAMES],
        *[f"lock {section_name}" for section_name in SECTION_NAMES],
        "integrate full paper",
        "build references",
        "generate formatted DOCX",
        "build submission status",
    ]
    completed_names = {step["step"] for step in completed_steps}
    return next((step_name for step_name in all_step_names if step_name not in completed_names), "unknown step")


def write_workflow_summary(project_id: str, summary: dict[str, Any]) -> None:
    output_path = get_workflow_run_path(project_id)
    safe_write_json(output_path, summary, status=summary.get("pipeline_status", "completed"))
    register_artifact(
        project_id,
        "workflow_run",
        output_path,
        paper_id=PAPER_ID,
        status=summary.get("pipeline_status", "completed"),
    )


def build_workflow_summary(
    project_id: str,
    pipeline_status: str,
    completed_steps: list[dict[str, str]],
    failed_step: str | None,
    error_message: str,
) -> dict[str, Any]:
    return {
        "project_id": project_id,
        "paper_id": PAPER_ID,
        "pipeline_status": pipeline_status,
        "steps_completed": completed_steps,
        "completed_count": len(completed_steps),
        "failed_step": failed_step,
        "error_message": error_message,
        "generated_files_summary": generated_files_summary(project_id),
        "final_download_urls": {
            "docx": f"/journal/{project_id}/formatting/{PAPER_ID}/download-docx"
            if get_formatted_docx_path(project_id, PAPER_ID).exists()
            else "",
            "markdown": f"/journal/{project_id}/full-paper/{PAPER_ID}/download-md"
            if get_full_paper_markdown_path(project_id, PAPER_ID).exists()
            else "",
        },
        "generated_at": datetime.now(UTC).isoformat(),
    }


def generated_files_summary(project_id: str) -> list[dict[str, Any]]:
    file_paths = [
        ("Parsed Thesis", get_parsed_output_path(project_id)),
        ("Thesis Intelligence", get_intelligence_output_path(project_id)),
        ("Citation Map", get_citation_map_output_path(project_id)),
        ("Objective Map", get_objective_map_output_path(project_id)),
        ("Table Map", get_table_map_output_path(project_id)),
        ("Thesis Audit", get_audit_output_path(project_id)),
        ("Knowledge Graph", get_knowledge_graph_output_path(project_id)),
        ("Journal Plan", get_journal_plan_output_path(project_id)),
        ("Paper Extraction", get_paper_extraction_output_path(project_id, PAPER_ID)),
        ("Section Structure", get_section_structure_output_path(project_id, PAPER_ID)),
        ("Full Paper JSON", get_full_paper_json_path(project_id, PAPER_ID)),
        ("Full Paper Markdown", get_full_paper_markdown_path(project_id, PAPER_ID)),
        ("Reference Bank", get_reference_bank_json_path(project_id, PAPER_ID)),
        ("Formatting Report", get_formatting_report_path(project_id, PAPER_ID)),
        ("Formatted DOCX", get_formatted_docx_path(project_id, PAPER_ID)),
    ]
    return [
        {
            "label": label,
            "path": str(path),
            "exists": path.exists(),
            "size": path.stat().st_size if path.exists() else 0,
        }
        for label, path in file_paths
    ]


def latest_revision_trigger(project_id: str, paper_id: str) -> str:
    revision_dir = GENERATED_OUTPUT_ROOT / project_id / "revisions" / paper_id
    if not revision_dir.exists():
        return "manual"

    applied_files = sorted(
        revision_dir.glob("*_applied.json"),
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )
    if not applied_files:
        return "manual"

    latest = safe_read_json(applied_files[0])
    return str((latest or {}).get("revision_id", "manual"))
