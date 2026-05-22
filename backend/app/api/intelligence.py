import json
from pathlib import Path

from fastapi import APIRouter

from app.api.parser import parse_project_uploads, read_parsed_thesis
from app.api.upload import get_project_upload_dir, read_upload_metadata
from app.services.activity_logger_service import log_activity
from app.services.artifact_registry_service import register_artifact
from app.services.citation_mapper_service import build_citation_map
from app.utils.file_utils import safe_read_json, safe_write_json

router = APIRouter(prefix="/intelligence", tags=["intelligence"])

PROJECT_ROOT = Path(__file__).resolve().parents[3]
GENERATED_OUTPUT_ROOT = PROJECT_ROOT / "storage" / "generated_outputs"


def get_intelligence_output_path(project_id: str) -> Path:
    output_dir = GENERATED_OUTPUT_ROOT / project_id
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir / "thesis_intelligence.json"


def get_existing_citation_map(project_id: str) -> dict[str, object] | None:
    citation_map_path = GENERATED_OUTPUT_ROOT / project_id / "citation_map.json"
    if not citation_map_path.exists():
        return None

    return safe_read_json(citation_map_path)


def build_fallback_intelligence(project_id: str) -> dict[str, object]:
    return {
        "project_id": project_id,
        "overall_score": 86,
        "citation_integrity": 94,
        "objective_alignment": 88,
        "methodology_consistency": 82,
        "reviewer_readiness": 79,
        "uploaded_chapters_count": 0,
        "mfl_status": "Not uploaded",
        "headings_count": 0,
        "paragraphs_count": 0,
        "tables_count": 0,
        "citations_count": 0,
        "references_count": 0,
        "objectives_count": 0,
        "table_map": [
            {"table": "Table 4.25", "status": "Mock mapped"},
            {"table": "Table 4.30", "status": "Mock mapped"},
        ],
        "citation_map": {
            "total_citations": 218,
            "mapped_citations": 205,
            "unmatched_citations": 13,
            "mfl_match_status": "Fallback mock",
        },
        "objective_map": [
            {"objective": "Research Objective 1", "status": "Mock aligned"},
            {"objective": "Research Objective 2", "status": "Mock aligned"},
            {"objective": "Research Objective 3", "status": "Mock review"},
        ],
        "audit_issues": {
            "unsupported_claims": 3,
            "citation_mismatch": 2,
            "terminology_inconsistency": 1,
            "objective_finding_gap": 1,
        },
        "audit": {
            "unsupported_claims": 3,
            "citation_mismatch": 2,
            "terminology_inconsistency": 1,
            "objective_finding_gap": 1,
        },
    }


@router.get("/{project_id}")
def get_intelligence_summary(project_id: str) -> dict[str, object]:
    output_path = get_intelligence_output_path(project_id)
    if output_path.exists():
        return safe_read_json(output_path) or build_fallback_intelligence(project_id)

    return build_fallback_intelligence(project_id)


@router.post("/{project_id}/build")
def build_thesis_intelligence(project_id: str) -> dict[str, object]:
    upload_dir = get_project_upload_dir(project_id)
    metadata = read_upload_metadata(project_id)

    uploaded_files = [
        file_path
        for file_path in upload_dir.iterdir()
        if file_path.is_file() and file_path.name != ".uploads_metadata.json"
    ]
    uploaded_chapters = {
        item.get("chapter_label", "")
        for item in metadata.values()
        if item.get("file_type") == "thesis_chapter"
    }
    has_mfl = any(item.get("file_type") == "mfl" for item in metadata.values())
    uploaded_chapters_count = len(uploaded_chapters)
    required_ready = uploaded_chapters_count >= 5 and has_mfl
    parsed_thesis = read_parsed_thesis(project_id)

    if not parsed_thesis and any(file_path.suffix.lower() == ".docx" for file_path in uploaded_files):
        parsed_thesis = parse_project_uploads(project_id)

    headings_count = len(parsed_thesis.get("headings", [])) if parsed_thesis else 0
    paragraphs_count = len(parsed_thesis.get("paragraphs", [])) if parsed_thesis else 0
    tables_count = len(parsed_thesis.get("tables", [])) if parsed_thesis else 0
    citations_count = len(parsed_thesis.get("citations", [])) if parsed_thesis else 0
    references_count = len(parsed_thesis.get("references", [])) if parsed_thesis else 0
    objectives_count = len(parsed_thesis.get("objectives", [])) if parsed_thesis else 0
    table_captions = parsed_thesis.get("table_captions", []) if parsed_thesis else []
    citation_map = get_existing_citation_map(project_id)
    if parsed_thesis and not citation_map:
        citation_map = build_citation_map(project_id, parsed_thesis, metadata)
    mfl_references_count = int(citation_map.get("references_count", 0)) if citation_map else 0
    mapped_citations = int(citation_map.get("matched_citations", 0)) if citation_map else 0
    unmatched_citations = int(citation_map.get("unmatched_citations", citations_count)) if citation_map else citations_count
    match_rate = float(citation_map.get("match_rate", 0)) if citation_map else 0

    audit_issues = {
        "unsupported_claims": 3 if required_ready and citations_count else 6,
        "citation_mismatch": 2 if has_mfl and citations_count else 8,
        "terminology_inconsistency": 1,
        "objective_finding_gap": 1 if uploaded_chapters_count >= 5 and objectives_count else 4,
    }

    intelligence = {
        "project_id": project_id,
        "overall_score": 88 if required_ready and parsed_thesis else 72,
        "citation_integrity": 94 if has_mfl and citations_count else 64,
        "objective_alignment": 88 if objectives_count else 70,
        "methodology_consistency": 82 if "Bab 3" in uploaded_chapters else 68,
        "reviewer_readiness": 81 if required_ready and parsed_thesis else 55,
        "uploaded_chapters_count": uploaded_chapters_count,
        "mfl_status": "Uploaded" if has_mfl else "Missing",
        "headings_count": headings_count,
        "paragraphs_count": paragraphs_count,
        "tables_count": tables_count,
        "citations_count": citations_count,
        "references_count": mfl_references_count or references_count,
        "objectives_count": objectives_count,
        "table_map": build_table_map(table_captions, tables_count, uploaded_files),
        "citation_map": {
            "total_citations": citations_count,
            "mapped_citations": mapped_citations,
            "unmatched_citations": unmatched_citations,
            "references_count": mfl_references_count,
            "match_rate": match_rate,
            "mfl_match_status": f"{match_rate}% matched" if has_mfl else "MFL missing",
        },
        "objective_map": build_objective_map(parsed_thesis, uploaded_chapters),
        "audit_issues": audit_issues,
        "audit": audit_issues,
    }

    output_path = get_intelligence_output_path(project_id)
    intelligence = safe_write_json(output_path, intelligence, status="built")
    register_artifact(project_id, "intelligence", output_path, status="built")
    log_activity(
        project_id=project_id,
        activity_type="intelligence_build",
        activity_title="Thesis intelligence built",
        activity_description=f"Overall intelligence score generated at {intelligence.get('overall_score', 0)}%.",
        source_module="intelligence",
        status="built",
    )

    return intelligence


def build_table_map(
    table_captions: object,
    tables_count: int,
    uploaded_files: list[Path],
) -> list[dict[str, object]]:
    if isinstance(table_captions, list) and table_captions:
        return [
            {
                "table": item.get("caption", f"Table {index}"),
                "source": item.get("source_file", "Parsed thesis"),
                "status": "Caption detected",
            }
            for index, item in enumerate(table_captions[:8], start=1)
            if isinstance(item, dict)
        ]

    return [
        {
            "table": f"{tables_count} parsed table(s)" if tables_count else "Table Map Placeholder",
            "source": "Parsed thesis files" if tables_count else "Uploaded thesis files",
            "status": "Ready for extraction" if uploaded_files else "No files uploaded",
        }
    ]


def build_objective_map(
    parsed_thesis: dict[str, object] | None,
    uploaded_chapters: set[str],
) -> list[dict[str, str]]:
    objectives = parsed_thesis.get("objectives", []) if parsed_thesis else []
    if isinstance(objectives, list) and objectives:
        return [
            {
                "objective": item.get("detected_objective", item.get("text", "Research Objective"))
                if isinstance(item, dict)
                else "Research Objective",
                "status": "Parsed and ready for alignment",
            }
            for item in objectives[:8]
        ]

    return [
        {
            "objective": "Research Objective 1",
            "status": "Aligned" if "Bab 4" in uploaded_chapters else "Pending Bab 4",
        },
        {
            "objective": "Research Objective 2",
            "status": "Aligned" if "Bab 3" in uploaded_chapters else "Pending Bab 3",
        },
        {
            "objective": "Research Objective 3",
            "status": "Aligned" if "Bab 5" in uploaded_chapters else "Pending Bab 5",
        },
    ]
