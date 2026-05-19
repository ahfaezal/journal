from typing import Any


SECTION_ORDER = [
    "Abstract",
    "Introduction",
    "Problem Statement",
    "Literature Review",
    "Methodology",
    "Findings",
    "Discussion",
    "Conclusion",
]

SECTION_CHAPTERS = {
    "Abstract": [],
    "Introduction": ["Bab 1"],
    "Problem Statement": ["Bab 1"],
    "Literature Review": ["Bab 2"],
    "Methodology": ["Bab 3"],
    "Findings": ["Bab 4"],
    "Discussion": ["Bab 5"],
    "Conclusion": ["Bab 5"],
}

SECTION_WORD_COUNTS = {
    "Abstract": 250,
    "Introduction": 800,
    "Problem Statement": 650,
    "Literature Review": 1200,
    "Methodology": 1000,
    "Findings": 1400,
    "Discussion": 1300,
    "Conclusion": 500,
}


def build_section_structure(
    project_id: str,
    paper_id: str,
    paper_extraction: dict[str, Any] | None,
    journal_plan: dict[str, Any] | None,
    parsed_thesis: dict[str, Any] | None,
    citation_map: dict[str, Any] | None,
    objective_map: dict[str, Any] | None,
    table_map: dict[str, Any] | None,
    thesis_audit: dict[str, Any] | None,
) -> dict[str, Any]:
    paper = find_paper(journal_plan, paper_id)
    extraction_map = paper_extraction.get("extraction_map", {}) if paper_extraction else {}
    supporting_citations = (
        paper_extraction.get("extracted_content_preview", {}).get("supporting_citations", [])
        if paper_extraction
        else extract_required_citations(citation_map)
    )
    source_tables = (
        paper_extraction.get("extracted_content_preview", {}).get("tables_used", [])
        if paper_extraction
        else extract_source_tables(table_map)
    )
    audit_issues = thesis_audit.get("issues", []) if thesis_audit else []

    sections = []
    for section_name in SECTION_ORDER:
        source_chapters = resolve_source_chapters(section_name, paper, extraction_map)
        section_tables = source_tables if section_name == "Findings" else []
        required_citations = supporting_citations[:8] if section_name in citation_heavy_sections() else []
        audit_warnings = filter_audit_warnings(section_name, audit_issues)

        sections.append(
            {
                "section_name": section_name,
                "purpose": section_purpose(section_name),
                "suggested_subheadings": suggested_subheadings(section_name, paper_id),
                "source_chapters": source_chapters,
                "source_tables": section_tables,
                "required_citations": required_citations,
                "writing_notes": writing_notes(section_name, paper, objective_map),
                "audit_warnings": audit_warnings,
                "estimated_word_count": SECTION_WORD_COUNTS[section_name],
                "readiness_status": readiness_status(source_chapters, required_citations, audit_warnings, section_name),
            }
        )

    return {
        "project_id": project_id,
        "paper_id": paper_id,
        "paper_title": paper.get("title", fallback_title(paper_id)),
        "status": "built",
        "sections": sections,
    }


def find_paper(journal_plan: dict[str, Any] | None, paper_id: str) -> dict[str, Any]:
    if journal_plan:
        for paper in journal_plan.get("suggested_papers", []):
            if isinstance(paper, dict) and paper.get("paper_id") == paper_id:
                return paper

    return {
        "paper_id": paper_id,
        "title": fallback_title(paper_id),
        "source_chapters": ["Bab 1", "Bab 2", "Bab 3", "Bab 4", "Bab 5"],
        "objectives_used": [],
        "key_tables": [],
        "thesis_scope": "Planner output not generated yet.",
    }


def resolve_source_chapters(
    section_name: str,
    paper: dict[str, Any],
    extraction_map: dict[str, Any],
) -> list[str]:
    if section_name == "Abstract":
        return paper.get("source_chapters", [])

    extraction_item = extraction_map.get(section_name, {})
    extraction_source = str(extraction_item.get("source", ""))
    if extraction_source and "Excluded" not in extraction_source:
        return [source.strip() for source in extraction_source.split("/") if source.strip()]

    fallback_chapters = SECTION_CHAPTERS[section_name]
    paper_chapters = paper.get("source_chapters", [])
    return [
        chapter
        for chapter in paper_chapters
        if any(fallback.lower() in chapter.lower() for fallback in fallback_chapters)
    ] or fallback_chapters


def extract_required_citations(citation_map: dict[str, Any] | None) -> list[str]:
    if not citation_map:
        return []

    citations = []
    for citation in citation_map.get("citations", []):
        if isinstance(citation, dict) and citation.get("mfl_status") == "matched":
            citations.append(str(citation.get("citation_text", "")))

    return list(dict.fromkeys([citation for citation in citations if citation]))[:10]


def extract_source_tables(table_map: dict[str, Any] | None) -> list[str]:
    if not table_map:
        return []

    tables = []
    for table in table_map.get("tables", []):
        if isinstance(table, dict) and table.get("suggested_paper_section") == "Findings":
            tables.append(str(table.get("table_number", table.get("table_id", ""))))

    return [table for table in tables if table][:8]


def citation_heavy_sections() -> set[str]:
    return {"Introduction", "Problem Statement", "Literature Review", "Methodology", "Discussion"}


def filter_audit_warnings(section_name: str, audit_issues: list[Any]) -> list[str]:
    warnings = []
    section_key = section_name.lower()
    for issue in audit_issues:
        if not isinstance(issue, dict):
            continue

        issue_section = str(issue.get("section", "")).lower()
        issue_type = str(issue.get("issue_type", "")).lower()
        if section_key in issue_section or section_issue_match(section_name, issue_type):
            warnings.append(str(issue.get("description", "Audit issue requires review.")))

    return warnings[:5]


def section_issue_match(section_name: str, issue_type: str) -> bool:
    if section_name == "Findings" and ("table" in issue_type or "objective" in issue_type):
        return True
    if section_name in citation_heavy_sections() and ("citation" in issue_type or "reference" in issue_type):
        return True
    return section_name in {"Discussion", "Conclusion"} and "continuity" in issue_type


def readiness_status(
    source_chapters: list[str],
    required_citations: list[str],
    audit_warnings: list[str],
    section_name: str,
) -> str:
    if audit_warnings:
        return "Review Required"
    if not source_chapters:
        return "Source Needed"
    if section_name in citation_heavy_sections() and not required_citations:
        return "Citation Review"
    return "Ready"


def section_purpose(section_name: str) -> str:
    purposes = {
        "Abstract": "Summarise aim, method, core findings, contribution, and boundary of the selected paper.",
        "Introduction": "Frame the research context, paper focus, and thesis-derived rationale.",
        "Problem Statement": "Define the development or evidence gap that justifies this paper.",
        "Literature Review": "Position the key concepts, methods, and citation anchors required for the paper.",
        "Methodology": "Explain the selected research procedure and evidence transformation logic.",
        "Findings": "Present mapped findings and table evidence from the relevant thesis chapters.",
        "Discussion": "Interpret findings as paper-level contribution without overclaiming.",
        "Conclusion": "Close the paper with concise methodological, empirical, or framework contribution.",
    }
    return purposes[section_name]


def suggested_subheadings(section_name: str, paper_id: str) -> list[str]:
    base = {
        "Abstract": ["Background", "Aim", "Method", "Findings", "Contribution"],
        "Introduction": ["Research Context", "Paper Focus", "Contribution Positioning"],
        "Problem Statement": ["Development Gap", "Evidence Boundary", "Paper Justification"],
        "Literature Review": ["Core Concepts", "Methodological Foundation", "Research Gap"],
        "Methodology": ["Research Design", "Data Source", "Analysis Procedure", "Quality Control"],
        "Findings": ["Evidence Overview", "Mapped Tables", "Key Findings"],
        "Discussion": ["Interpretation", "Contribution", "Boundary and Implications"],
        "Conclusion": ["Summary", "Contribution", "Future Work"],
    }
    if paper_id == "PAPER_2" and section_name in {"Methodology", "Findings", "Discussion"}:
        return base[section_name] + ["Development-Validation Link"]

    return base[section_name]


def writing_notes(
    section_name: str,
    paper: dict[str, Any],
    objective_map: dict[str, Any] | None,
) -> list[str]:
    notes = [
        f"Keep section aligned with paper scope: {paper.get('thesis_scope', 'selected paper scope')}.",
        "Use thesis-derived evidence only; do not introduce unsupported external claims.",
    ]
    objectives_used = paper.get("objectives_used", [])
    if objectives_used:
        notes.append(f"Maintain alignment with objective(s): {', '.join(objectives_used)}.")

    if objective_map and section_name in {"Findings", "Discussion"}:
        notes.append("Check objective-to-findings continuity before drafting.")
    if section_name == "Conclusion":
        notes.append("Avoid effectiveness, intervention impact, or field-testing claims unless explicitly supported.")

    return notes


def fallback_title(paper_id: str) -> str:
    titles = {
        "PAPER_1": "Need Analysis Paper",
        "PAPER_2": "Development & Validation Paper",
        "PAPER_3": "Framework / Model Paper",
    }
    return titles.get(paper_id, "Journal Paper")
