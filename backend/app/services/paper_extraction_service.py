from typing import Any


SECTION_SOURCES = {
    "Introduction": "Bab 1",
    "Literature Review": "Bab 2",
    "Methodology": "Bab 3",
    "Findings": "Bab 4",
    "Discussion": "Bab 5",
    "Conclusion": "Bab 5",
}


def build_paper_extraction(
    project_id: str,
    paper_id: str,
    journal_plan: dict[str, Any] | None,
    parsed_thesis: dict[str, Any] | None,
    citation_map: dict[str, Any] | None,
    objective_map: dict[str, Any] | None,
    table_map: dict[str, Any] | None,
    thesis_audit: dict[str, Any] | None,
) -> dict[str, Any]:
    paper = find_paper(journal_plan, paper_id)
    source_chapters = paper.get("source_chapters", default_source_chapters(paper_id))
    key_tables = paper.get("key_tables", [])
    objectives_used = paper.get("objectives_used", [])
    supporting_citations = extract_supporting_citations(citation_map)
    tables_used = extract_tables_used(table_map, key_tables)
    audit_risk = paper.get("audit_risk") or calculate_audit_risk(thesis_audit)

    return {
        "project_id": project_id,
        "paper_id": paper_id,
        "paper_title": paper.get("title", fallback_title(paper_id)),
        "target_template": "ICC2026",
        "source_chapters": source_chapters,
        "extraction_map": build_extraction_map(source_chapters, tables_used),
        "extracted_content_preview": {
            "key_claims": build_key_claims(paper, objectives_used),
            "supporting_citations": supporting_citations,
            "tables_used": tables_used,
            "excluded_content": build_excluded_content(paper_id),
        },
        "quality_checks": {
            "scope_overlap": {
                "status": "Medium" if audit_risk == "High" else "Low",
                "detail": "Scope boundaries derived from journal planner phase separation.",
            },
            "citation_availability": {
                "status": "Ready" if supporting_citations else "Review",
                "detail": f"{len(supporting_citations)} mapped citation(s) available for extraction.",
            },
            "objective_alignment": {
                "status": "Aligned" if objectives_used else "Review",
                "detail": ", ".join(objectives_used) if objectives_used else "No objective linked in journal plan.",
            },
            "redundancy_risk": {
                "status": "Moderate" if paper_id == "PAPER_3" else "Low",
                "detail": "Check overlap with earlier suggested papers before section writing.",
            },
            "methodology_fit": {
                "status": "Ready" if "Bab 3" in source_chapters else "Review",
                "detail": "Methodology source chapter detected." if "Bab 3" in source_chapters else "Methodology chapter not in paper scope.",
            },
        },
        "extraction_status": "built",
    }


def find_paper(journal_plan: dict[str, Any] | None, paper_id: str) -> dict[str, Any]:
    if journal_plan:
        for paper in journal_plan.get("suggested_papers", []):
            if isinstance(paper, dict) and paper.get("paper_id") == paper_id:
                return paper

    return {
        "paper_id": paper_id,
        "title": fallback_title(paper_id),
        "source_chapters": default_source_chapters(paper_id),
        "objectives_used": ["RO1"] if paper_id == "PAPER_1" else ["RO2", "RO3"],
        "key_tables": [],
        "audit_risk": "Unknown",
        "thesis_scope": "Planner output not generated yet.",
    }


def build_extraction_map(source_chapters: list[str], tables_used: list[str]) -> dict[str, dict[str, str]]:
    extraction_map = {}
    for section, chapter in SECTION_SOURCES.items():
        in_scope = any(chapter.lower() in source_chapter.lower() for source_chapter in source_chapters)
        source = chapter if in_scope else "Excluded by paper scope"
        if section == "Findings" and tables_used:
            source = f"{chapter} / {', '.join(tables_used[:6])}"

        extraction_map[section] = {
            "source": source,
            "note": build_section_note(section, in_scope),
        }

    return extraction_map


def build_section_note(section: str, in_scope: bool) -> str:
    if not in_scope:
        return "Excluded or used only as light context for this paper."

    notes = {
        "Introduction": "Problem context and paper-level framing.",
        "Literature Review": "Conceptual, empirical, and methodological anchors.",
        "Methodology": "Research design, procedures, and extraction logic.",
        "Findings": "Evidence anchors, tables, objective-linked results.",
        "Discussion": "Interpretation, contribution framing, and scope control.",
        "Conclusion": "Paper-level closure and contribution statement.",
    }
    return notes[section]


def extract_supporting_citations(citation_map: dict[str, Any] | None) -> list[str]:
    if not citation_map:
        return []

    citations = []
    for citation in citation_map.get("citations", []):
        if not isinstance(citation, dict):
            continue

        if citation.get("mfl_status") == "matched":
            citations.append(str(citation.get("citation_text", "")))

    return list(dict.fromkeys([citation for citation in citations if citation]))[:12]


def extract_tables_used(table_map: dict[str, Any] | None, key_tables: list[str]) -> list[str]:
    if key_tables:
        return key_tables
    if not table_map:
        return []

    tables = []
    for table in table_map.get("tables", []):
        if not isinstance(table, dict):
            continue

        if table.get("suggested_paper_section") == "Findings":
            tables.append(str(table.get("table_number", table.get("table_id", ""))))

    return [table for table in tables if table][:8]


def build_key_claims(paper: dict[str, Any], objectives_used: list[str]) -> list[str]:
    claims = [
        paper.get("thesis_scope", "Paper scope derived from journal planner."),
        paper.get("novelty_angle", "Novelty angle pending planner refinement."),
    ]
    if objectives_used:
        claims.append(f"Paper scope is linked to objective(s): {', '.join(objectives_used)}.")

    return [str(claim) for claim in claims if claim]


def build_excluded_content(paper_id: str) -> list[str]:
    if paper_id == "PAPER_1":
        return [
            "Development-heavy DACUM evidence",
            "Expert validation discussion",
            "Framework synthesis claims",
            "Effectiveness or field-testing language",
        ]
    if paper_id == "PAPER_2":
        return [
            "Survey-heavy need analysis repetition",
            "Full model synthesis reserved for later paper",
            "Effectiveness or intervention outcome claims",
        ]

    return [
        "Detailed need analysis repetition",
        "Procedural methodology dumping",
        "Field-testing or effectiveness claims",
    ]


def calculate_audit_risk(thesis_audit: dict[str, Any] | None) -> str:
    if not thesis_audit:
        return "Unknown"

    score = int(thesis_audit.get("overall_audit_score", 0) or 0)
    if score >= 80:
        return "Low"
    if score >= 60:
        return "Medium"
    return "High"


def default_source_chapters(paper_id: str) -> list[str]:
    if paper_id == "PAPER_1":
        return ["Bab 1", "Bab 2", "Bab 3", "Bab 4"]
    if paper_id == "PAPER_2":
        return ["Bab 2", "Bab 3", "Bab 4", "Bab 5"]
    return ["Bab 4", "Bab 5"]


def fallback_title(paper_id: str) -> str:
    titles = {
        "PAPER_1": "Need Analysis Paper",
        "PAPER_2": "Development & Validation Paper",
        "PAPER_3": "Framework / Model Paper",
    }
    return titles.get(paper_id, "Journal Paper")
