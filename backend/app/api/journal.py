import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.api.audit import read_thesis_audit
from app.api.citation import read_citation_map
from app.api.knowledge_graph import read_knowledge_graph
from app.api.objective import read_objective_map
from app.api.parser import read_parsed_thesis
from app.api.table import read_table_map
from app.api.upload import read_upload_metadata
from app.services.formatting_engine_service import generate_formatted_docx
from app.services.full_paper_service import build_full_paper, build_markdown
from app.services.journal_planner_service import build_journal_plan
from app.services.paper_extraction_service import build_paper_extraction
from app.services.reference_builder_service import build_reference_bank, build_reference_markdown
from app.services.section_structure_service import build_section_structure
from app.services.section_writer_service import generate_section_draft, lock_section
from app.utils.file_utils import safe_read_json, safe_write_json

router = APIRouter(prefix="/journal", tags=["journal"])

PROJECT_ROOT = Path(__file__).resolve().parents[3]
GENERATED_OUTPUT_ROOT = PROJECT_ROOT / "storage" / "generated_outputs"
FORMATTED_OUTPUT_ROOT = PROJECT_ROOT / "storage" / "formatted_outputs"
JOURNAL_PLAN_FILENAME = "journal_plan.json"


def get_journal_plan_output_path(project_id: str) -> Path:
    output_dir = GENERATED_OUTPUT_ROOT / project_id
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir / JOURNAL_PLAN_FILENAME


def read_journal_plan(project_id: str) -> dict[str, Any] | None:
    output_path = get_journal_plan_output_path(project_id)
    if not output_path.exists():
        return None

    return safe_read_json(output_path)


def get_paper_extraction_output_path(project_id: str, paper_id: str) -> Path:
    output_dir = GENERATED_OUTPUT_ROOT / project_id
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir / f"paper_extraction_{paper_id}.json"


def read_paper_extraction(project_id: str, paper_id: str) -> dict[str, Any] | None:
    output_path = get_paper_extraction_output_path(project_id, paper_id)
    if not output_path.exists():
        return None

    return safe_read_json(output_path)


def get_section_structure_output_path(project_id: str, paper_id: str) -> Path:
    output_dir = GENERATED_OUTPUT_ROOT / project_id
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir / f"section_structure_{paper_id}.json"


def read_section_structure(project_id: str, paper_id: str) -> dict[str, Any] | None:
    output_path = get_section_structure_output_path(project_id, paper_id)
    if not output_path.exists():
        return None

    return safe_read_json(output_path)


def section_filename(section_name: str) -> str:
    safe_name = "_".join(section_name.strip().split())
    return f"{safe_name}.json"


def get_generated_section_path(project_id: str, paper_id: str, section_name: str) -> Path:
    section_dir = GENERATED_OUTPUT_ROOT / project_id / "sections" / paper_id
    section_dir.mkdir(parents=True, exist_ok=True)
    return section_dir / section_filename(section_name)


def get_locked_section_path(project_id: str, paper_id: str, section_name: str) -> Path:
    locked_dir = GENERATED_OUTPUT_ROOT / project_id / "locked" / paper_id
    locked_dir.mkdir(parents=True, exist_ok=True)
    safe_name = "_".join(section_name.strip().split())
    return locked_dir / f"{safe_name}_v1_LOCKED.json"


def read_generated_section(project_id: str, paper_id: str, section_name: str) -> dict[str, Any] | None:
    output_path = get_generated_section_path(project_id, paper_id, section_name)
    if not output_path.exists():
        return None

    return safe_read_json(output_path)


def read_generated_sections(project_id: str, paper_id: str) -> list[dict[str, Any]]:
    section_dir = GENERATED_OUTPUT_ROOT / project_id / "sections" / paper_id
    if not section_dir.exists():
        return []

    sections = []
    for output_path in sorted(section_dir.glob("*.json")):
        section = safe_read_json(output_path)
        if section:
            sections.append(section)

    return sections


def read_locked_sections(project_id: str, paper_id: str) -> list[dict[str, Any]]:
    locked_dir = GENERATED_OUTPUT_ROOT / project_id / "locked" / paper_id
    if not locked_dir.exists():
        return []

    sections = []
    for output_path in sorted(locked_dir.glob("*_LOCKED.json")):
        section = safe_read_json(output_path)
        if section:
            sections.append(section)

    return sections


def get_full_paper_json_path(project_id: str, paper_id: str) -> Path:
    output_dir = GENERATED_OUTPUT_ROOT / project_id
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir / f"full_paper_{paper_id}.json"


def get_full_paper_markdown_path(project_id: str, paper_id: str) -> Path:
    output_dir = GENERATED_OUTPUT_ROOT / project_id
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir / f"full_paper_{paper_id}.md"


def read_full_paper(project_id: str, paper_id: str) -> dict[str, Any] | None:
    output_path = get_full_paper_json_path(project_id, paper_id)
    if not output_path.exists():
        return None

    return safe_read_json(output_path)


def get_reference_bank_json_path(project_id: str, paper_id: str) -> Path:
    output_dir = GENERATED_OUTPUT_ROOT / project_id
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir / f"reference_bank_{paper_id}.json"


def get_reference_bank_markdown_path(project_id: str, paper_id: str) -> Path:
    output_dir = GENERATED_OUTPUT_ROOT / project_id
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir / f"reference_bank_{paper_id}.md"


def read_reference_bank(project_id: str, paper_id: str) -> dict[str, Any] | None:
    output_path = get_reference_bank_json_path(project_id, paper_id)
    if not output_path.exists():
        return None

    return safe_read_json(output_path)


def get_formatting_report_path(project_id: str, paper_id: str) -> Path:
    output_dir = GENERATED_OUTPUT_ROOT / project_id
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir / f"formatting_report_{paper_id}.json"


def get_formatted_docx_path(project_id: str, paper_id: str) -> Path:
    output_dir = FORMATTED_OUTPUT_ROOT / project_id
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir / f"{paper_id}_FORMATTED.docx"


def read_formatting_report(project_id: str, paper_id: str) -> dict[str, Any] | None:
    output_path = get_formatting_report_path(project_id, paper_id)
    if not output_path.exists():
        return None

    return safe_read_json(output_path)


@router.get("/{project_id}/planner")
def get_journal_plan(project_id: str) -> dict[str, Any]:
    journal_plan = read_journal_plan(project_id)
    if journal_plan:
        return journal_plan

    return build_journal_plan_from_outputs(project_id)


@router.post("/{project_id}/planner/build")
def build_project_journal_plan(project_id: str) -> dict[str, Any]:
    journal_plan = build_journal_plan_from_outputs(project_id)
    output_path = get_journal_plan_output_path(project_id)
    journal_plan = safe_write_json(output_path, journal_plan, status="planned")

    return journal_plan


@router.post("/{project_id}/paper-extraction/{paper_id}/build")
def build_project_paper_extraction(project_id: str, paper_id: str) -> dict[str, Any]:
    paper_id = paper_id.upper()
    paper_extraction = build_paper_extraction_from_outputs(project_id, paper_id)
    output_path = get_paper_extraction_output_path(project_id, paper_id)
    paper_extraction = safe_write_json(output_path, paper_extraction, status="extracted")

    return paper_extraction


@router.get("/{project_id}/paper-extraction/{paper_id}")
def get_project_paper_extraction(project_id: str, paper_id: str) -> dict[str, Any]:
    paper_id = paper_id.upper()
    paper_extraction = read_paper_extraction(project_id, paper_id)
    if paper_extraction:
        return paper_extraction

    return build_paper_extraction_from_outputs(project_id, paper_id)


@router.post("/{project_id}/section-structure/{paper_id}/build")
def build_project_section_structure(project_id: str, paper_id: str) -> dict[str, Any]:
    paper_id = paper_id.upper()
    section_structure = build_section_structure_from_outputs(project_id, paper_id)
    output_path = get_section_structure_output_path(project_id, paper_id)
    section_structure = safe_write_json(output_path, section_structure, status="structured")

    return section_structure


@router.get("/{project_id}/section-structure/{paper_id}")
def get_project_section_structure(project_id: str, paper_id: str) -> dict[str, Any]:
    paper_id = paper_id.upper()
    section_structure = read_section_structure(project_id, paper_id)
    if section_structure:
        return section_structure

    return build_section_structure_from_outputs(project_id, paper_id)


@router.post("/{project_id}/section-writer/{paper_id}/{section_name}/generate")
def generate_project_section(project_id: str, paper_id: str, section_name: str) -> dict[str, Any]:
    paper_id = paper_id.upper()
    section = generate_section_draft(
        paper_id=paper_id,
        section_name=section_name,
        section_structure=read_section_structure(project_id, paper_id),
        paper_extraction=read_paper_extraction(project_id, paper_id),
        citation_map=read_citation_map(project_id),
        table_map=read_table_map(project_id),
        objective_map=read_objective_map(project_id),
        thesis_audit=read_thesis_audit(project_id),
    )
    output_path = get_generated_section_path(project_id, paper_id, section_name)
    section = safe_write_json(output_path, section, status="drafted")

    return section


@router.get("/{project_id}/section-writer/{paper_id}")
def get_project_generated_sections(project_id: str, paper_id: str) -> dict[str, Any]:
    paper_id = paper_id.upper()
    return {
        "project_id": project_id,
        "paper_id": paper_id,
        "sections": read_generated_sections(project_id, paper_id),
    }


@router.get("/{project_id}/section-writer/{paper_id}/{section_name}")
def get_project_generated_section(project_id: str, paper_id: str, section_name: str) -> dict[str, Any]:
    paper_id = paper_id.upper()
    section = read_generated_section(project_id, paper_id, section_name)
    if section:
        return section

    return generate_section_draft(
        paper_id=paper_id,
        section_name=section_name,
        section_structure=read_section_structure(project_id, paper_id),
        paper_extraction=read_paper_extraction(project_id, paper_id),
        citation_map=read_citation_map(project_id),
        table_map=read_table_map(project_id),
        objective_map=read_objective_map(project_id),
        thesis_audit=read_thesis_audit(project_id),
    )


@router.post("/{project_id}/section-writer/{paper_id}/{section_name}/lock")
def lock_project_section(project_id: str, paper_id: str, section_name: str) -> dict[str, Any]:
    paper_id = paper_id.upper()
    section = read_generated_section(project_id, paper_id, section_name)
    if not section:
        section = generate_section_draft(
            paper_id=paper_id,
            section_name=section_name,
            section_structure=read_section_structure(project_id, paper_id),
            paper_extraction=read_paper_extraction(project_id, paper_id),
            citation_map=read_citation_map(project_id),
            table_map=read_table_map(project_id),
            objective_map=read_objective_map(project_id),
            thesis_audit=read_thesis_audit(project_id),
        )

    locked = lock_section(section)
    generated_path = get_generated_section_path(project_id, paper_id, section_name)
    locked_path = get_locked_section_path(project_id, paper_id, section_name)
    locked = safe_write_json(generated_path, locked, status="locked")
    safe_write_json(locked_path, locked, status="locked")

    return locked


@router.post("/{project_id}/full-paper/{paper_id}/integrate")
def integrate_project_full_paper(project_id: str, paper_id: str) -> dict[str, Any]:
    paper_id = paper_id.upper()
    full_paper = build_full_paper_from_outputs(project_id, paper_id)
    json_path = get_full_paper_json_path(project_id, paper_id)
    markdown_path = get_full_paper_markdown_path(project_id, paper_id)

    full_paper = safe_write_json(json_path, full_paper, status="integrated")
    with markdown_path.open("w", encoding="utf-8") as output_file:
        output_file.write(build_markdown(full_paper))

    return full_paper


@router.get("/{project_id}/full-paper/{paper_id}")
def get_project_full_paper(project_id: str, paper_id: str) -> dict[str, Any]:
    paper_id = paper_id.upper()
    full_paper = read_full_paper(project_id, paper_id)
    if full_paper:
        return full_paper

    return build_full_paper_from_outputs(project_id, paper_id)


@router.get("/{project_id}/full-paper/{paper_id}/download-md")
def download_project_full_paper_markdown(project_id: str, paper_id: str) -> FileResponse:
    paper_id = paper_id.upper()
    markdown_path = get_full_paper_markdown_path(project_id, paper_id)
    if not markdown_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Full paper Markdown has not been generated for this project and paper.",
        )

    return FileResponse(
        path=markdown_path,
        media_type="text/markdown",
        filename=markdown_path.name,
    )


@router.post("/{project_id}/references/{paper_id}/build")
def build_project_references(project_id: str, paper_id: str) -> dict[str, Any]:
    paper_id = paper_id.upper()
    reference_bank = build_reference_bank_from_outputs(project_id, paper_id)
    json_path = get_reference_bank_json_path(project_id, paper_id)
    markdown_path = get_reference_bank_markdown_path(project_id, paper_id)

    reference_bank = safe_write_json(json_path, reference_bank, status="built")
    with markdown_path.open("w", encoding="utf-8") as output_file:
        output_file.write(build_reference_markdown(reference_bank))

    return reference_bank


@router.get("/{project_id}/references/{paper_id}")
def get_project_references(project_id: str, paper_id: str) -> dict[str, Any]:
    paper_id = paper_id.upper()
    reference_bank = read_reference_bank(project_id, paper_id)
    if reference_bank:
        return reference_bank

    return build_reference_bank_from_outputs(project_id, paper_id)


@router.post("/{project_id}/formatting/{paper_id}/generate-docx")
def generate_project_formatted_docx(project_id: str, paper_id: str) -> dict[str, Any]:
    paper_id = paper_id.upper()
    report = generate_formatted_docx(
        paper_id=paper_id,
        full_paper=read_full_paper(project_id, paper_id),
        reference_bank=read_reference_bank(project_id, paper_id),
        section_structure=read_section_structure(project_id, paper_id),
        output_path=get_formatted_docx_path(project_id, paper_id),
        template_used="ICC2026",
    )
    report_path = get_formatting_report_path(project_id, paper_id)
    report = safe_write_json(report_path, report, status="formatted")

    return report


@router.get("/{project_id}/formatting/{paper_id}")
def get_project_formatting_report(project_id: str, paper_id: str) -> dict[str, Any]:
    paper_id = paper_id.upper()
    report = read_formatting_report(project_id, paper_id)
    if report:
        return report

    return {
        "paper_id": paper_id,
        "template_used": "ICC2026",
        "docx_path": str(get_formatted_docx_path(project_id, paper_id)),
        "sections_formatted": [],
        "reference_list_included": False,
        "total_word_count": 0,
        "formatting_audit": {
            "heading_consistency": "Not generated",
            "citation_style": "Not generated",
            "reference_list": "Not generated",
            "table_numbering": "Not generated",
            "figure_numbering": "Not generated",
            "margin_font_compliance": "Not generated",
        },
        "status": "not_generated",
        "generated_at": "",
    }


@router.get("/{project_id}/formatting/{paper_id}/download-docx")
def download_project_formatted_docx(project_id: str, paper_id: str) -> FileResponse:
    paper_id = paper_id.upper()
    docx_path = get_formatted_docx_path(project_id, paper_id)
    if not docx_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Formatted DOCX has not been generated for this project and paper.",
        )

    return FileResponse(
        path=docx_path,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=docx_path.name,
    )


@router.get("/{project_id}/submission/{paper_id}")
def get_project_submission_status(project_id: str, paper_id: str) -> dict[str, Any]:
    paper_id = paper_id.upper()
    full_paper = read_full_paper(project_id, paper_id)
    reference_bank = read_reference_bank(project_id, paper_id)
    formatting_report = read_formatting_report(project_id, paper_id)
    thesis_audit = read_thesis_audit(project_id)
    docx_path = get_formatted_docx_path(project_id, paper_id)
    markdown_path = get_full_paper_markdown_path(project_id, paper_id)

    has_full_paper = full_paper is not None
    has_markdown = markdown_path.exists()
    has_reference_bank = reference_bank is not None
    has_formatting_report = formatting_report is not None
    has_docx = docx_path.exists()
    has_audit = thesis_audit is not None
    audit_issues = thesis_audit.get("issues", []) if thesis_audit else []
    high_audit_issues = [
        issue for issue in audit_issues if isinstance(issue, dict) and issue.get("severity") == "high"
    ]
    reference_issues = int(reference_bank.get("unmatched_references", 0) or 0) if reference_bank else 0
    formatting_audit = formatting_report.get("formatting_audit", {}) if formatting_report else {}
    formatting_passed = has_docx and has_formatting_report and all(
        value in ["OK", "No figures detected", "Review required"]
        for value in formatting_audit.values()
    )

    checklist = [
        {"label": "Title verified", "status": has_full_paper},
        {"label": "Author information completed", "status": False},
        {"label": "Abstract word count checked", "status": has_full_paper},
        {"label": "References verified", "status": has_reference_bank and reference_issues == 0},
        {"label": "Tables numbered", "status": formatting_audit.get("table_numbering") in ["OK", "Review required"]},
        {"label": "Figures numbered", "status": formatting_audit.get("figure_numbering") in ["OK", "No figures detected"]},
        {"label": "Template compliance checked", "status": formatting_passed},
        {"label": "Plagiarism declaration placeholder", "status": False},
    ]
    completed = sum(1 for item in checklist if item["status"])
    submission_readiness_percentage = round((completed / len(checklist)) * 100)

    missing_items = [item["label"] for item in checklist if not item["status"]]
    warnings = []
    if not has_full_paper:
        warnings.append("Full paper has not been integrated.")
    if not has_reference_bank:
        warnings.append("Reference bank has not been built.")
    if reference_issues:
        warnings.append(f"{reference_issues} reference item(s) require review.")
    if high_audit_issues:
        warnings.append(f"{len(high_audit_issues)} high-severity thesis audit issue(s) remain.")
    if not has_docx:
        warnings.append("Formatted DOCX has not been generated.")

    return {
        "paper_id": paper_id,
        "submission_readiness_percentage": submission_readiness_percentage,
        "readiness_cards": [
            {"label": "Paper Completeness", "value": f"{submission_readiness_percentage}%", "status": "ready" if has_full_paper else "missing"},
            {"label": "Citation Audit", "value": "Passed" if has_audit and not high_audit_issues else "Review", "status": "ready" if has_audit and not high_audit_issues else "review"},
            {"label": "Formatting Compliance", "value": "Passed" if formatting_passed else "Review", "status": "ready" if formatting_passed else "review"},
            {"label": "Reviewer Risk", "value": "Low" if not high_audit_issues else "Medium", "status": "ready" if not high_audit_issues else "review"},
            {"label": "Submission Package", "value": "Ready" if has_docx and has_markdown else "Almost Ready", "status": "ready" if has_docx and has_markdown else "review"},
        ],
        "final_files": [
            {"name": "Final DOCX", "status": "Generated" if has_docx else "Missing", "path": str(docx_path), "action": "Download" if has_docx else "Generate"},
            {"name": "Full Paper Markdown", "status": "Generated" if has_markdown else "Missing", "path": str(markdown_path), "action": "Download" if has_markdown else "Integrate"},
            {"name": "Cover Letter", "status": "Mock Preview", "path": "", "action": "Edit"},
            {"name": "Submission Metadata", "status": "Pending", "path": "", "action": "Complete"},
            {"name": "Reference List", "status": "Verified" if has_reference_bank and reference_issues == 0 else "Review", "path": str(get_reference_bank_json_path(project_id, paper_id)), "action": "Open"},
        ],
        "checklist": checklist,
        "export_urls": {
            "docx": f"/journal/{project_id}/formatting/{paper_id}/download-docx" if has_docx else "",
            "markdown": f"/journal/{project_id}/full-paper/{paper_id}/download-md" if has_markdown else "",
        },
        "missing_items": missing_items,
        "warnings": warnings,
        "status": "ready" if submission_readiness_percentage >= 80 and has_docx else "in_progress",
    }


def build_journal_plan_from_outputs(project_id: str) -> dict[str, Any]:
    return build_journal_plan(
        project_id=project_id,
        parsed_thesis=read_parsed_thesis(project_id),
        citation_map=read_citation_map(project_id),
        objective_map=read_objective_map(project_id),
        table_map=read_table_map(project_id),
        thesis_audit=read_thesis_audit(project_id),
        knowledge_graph=read_knowledge_graph(project_id),
    )


def build_paper_extraction_from_outputs(project_id: str, paper_id: str) -> dict[str, Any]:
    return build_paper_extraction(
        project_id=project_id,
        paper_id=paper_id,
        journal_plan=read_journal_plan(project_id),
        parsed_thesis=read_parsed_thesis(project_id),
        citation_map=read_citation_map(project_id),
        objective_map=read_objective_map(project_id),
        table_map=read_table_map(project_id),
        thesis_audit=read_thesis_audit(project_id),
    )


def build_section_structure_from_outputs(project_id: str, paper_id: str) -> dict[str, Any]:
    return build_section_structure(
        project_id=project_id,
        paper_id=paper_id,
        paper_extraction=read_paper_extraction(project_id, paper_id),
        journal_plan=read_journal_plan(project_id),
        parsed_thesis=read_parsed_thesis(project_id),
        citation_map=read_citation_map(project_id),
        objective_map=read_objective_map(project_id),
        table_map=read_table_map(project_id),
        thesis_audit=read_thesis_audit(project_id),
    )


def build_full_paper_from_outputs(project_id: str, paper_id: str) -> dict[str, Any]:
    return build_full_paper(
        paper_id=paper_id,
        section_structure=read_section_structure(project_id, paper_id),
        drafted_sections=read_generated_sections(project_id, paper_id),
        locked_sections=read_locked_sections(project_id, paper_id),
        citation_map=read_citation_map(project_id),
        thesis_audit=read_thesis_audit(project_id),
    )


def build_reference_bank_from_outputs(project_id: str, paper_id: str) -> dict[str, Any]:
    return build_reference_bank(
        paper_id=paper_id,
        full_paper=read_full_paper(project_id, paper_id),
        citation_map=read_citation_map(project_id),
        upload_metadata=read_upload_metadata(project_id),
        thesis_audit=read_thesis_audit(project_id),
    )
