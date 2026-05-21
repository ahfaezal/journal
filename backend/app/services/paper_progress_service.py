from pathlib import Path
from typing import Any

from app.core.constants import GENERATED_OUTPUT_ROOT, STANDARD_SECTIONS
from app.services.paper_workspace_service import ensure_default_papers
from app.utils.file_utils import safe_read_json


def generated_root(project_id: str) -> Path:
    return GENERATED_OUTPUT_ROOT / project_id


def exists(project_id: str, filename: str) -> bool:
    return (generated_root(project_id) / filename).exists()


def read_json(project_id: str, filename: str) -> dict[str, Any] | None:
    path = generated_root(project_id) / filename
    return safe_read_json(path) if path.exists() else None


def count_generated_sections(project_id: str, paper_id: str) -> int:
    section_dir = generated_root(project_id) / "sections" / paper_id
    if not section_dir.exists():
        return 0
    return len(list(section_dir.glob("*.json")))


def has_applied_revision(project_id: str, paper_id: str) -> bool:
    revision_dir = generated_root(project_id) / "revisions" / paper_id
    if not revision_dir.exists():
        return False
    return any(path.name.endswith("_applied.json") or "applied" in path.name for path in revision_dir.glob("*.json"))


def calculate_submission_ready(project_id: str, paper_id: str) -> bool:
    full_paper_ready = exists(project_id, f"full_paper_{paper_id}.json")
    references_ready = exists(project_id, f"reference_bank_{paper_id}.json")
    formatting_ready = exists(project_id, f"formatting_report_{paper_id}.json")
    return full_paper_ready and references_ready and formatting_ready


def build_paper_progress(project_id: str, paper: dict[str, Any]) -> dict[str, Any]:
    paper_id = str(paper.get("paper_id", "")).upper()
    sections_generated = count_generated_sections(project_id, paper_id)
    checks = {
        "structure_ready": exists(project_id, f"section_structure_{paper_id}.json"),
        "sections_generated": sections_generated >= len(STANDARD_SECTIONS),
        "reviewer_completed": exists(project_id, f"reviewer_report_{paper_id}.json"),
        "revision_applied": has_applied_revision(project_id, paper_id),
        "full_paper_ready": exists(project_id, f"full_paper_{paper_id}.json"),
        "references_ready": exists(project_id, f"reference_bank_{paper_id}.json"),
        "formatting_ready": exists(project_id, f"formatting_report_{paper_id}.json"),
        "submission_ready": calculate_submission_ready(project_id, paper_id),
    }
    completed_steps = [key for key, value in checks.items() if value]
    pending_steps = [key for key, value in checks.items() if not value]
    progress_percent = round((len(completed_steps) / len(checks)) * 100)

    if progress_percent >= 90:
        status = "submission_ready"
    elif progress_percent >= 60:
        status = "in_review"
    elif progress_percent >= 25:
        status = "in_progress"
    else:
        status = "planned"

    return {
        "paper_id": paper_id,
        "title": paper.get("title", paper_id),
        "paper_type": paper.get("paper_type", "Journal Paper"),
        "target_journal": paper.get("target_journal", "ICC2026"),
        **checks,
        "generated_sections_count": sections_generated,
        "required_sections_count": len(STANDARD_SECTIONS),
        "progress_percent": progress_percent,
        "completed_steps": completed_steps,
        "pending_steps": pending_steps,
        "status": status,
    }


def build_project_paper_progress(project_id: str) -> dict[str, Any]:
    papers = ensure_default_papers(project_id)
    progress_items = [build_paper_progress(project_id, paper) for paper in papers]
    active_papers = [item for item in progress_items if item["status"] != "planned"]
    average_progress = round(
        sum(int(item["progress_percent"]) for item in progress_items) / len(progress_items)
    ) if progress_items else 0

    return {
        "project_id": project_id,
        "papers": progress_items,
        "total_papers": len(progress_items),
        "active_papers": len(active_papers),
        "average_progress": average_progress,
        "status": "loaded",
    }
