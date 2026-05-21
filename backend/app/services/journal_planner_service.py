from typing import Any


def build_journal_plan(
    project_id: str,
    parsed_thesis: dict[str, Any] | None,
    citation_map: dict[str, Any] | None,
    objective_map: dict[str, Any] | None,
    table_map: dict[str, Any] | None,
    thesis_audit: dict[str, Any] | None,
    knowledge_graph: dict[str, Any] | None,
) -> dict[str, Any]:
    chapters = extract_chapters(parsed_thesis)
    objectives = extract_objectives(objective_map)
    findings_tables = extract_findings_tables(table_map)
    citation_readiness = calculate_citation_readiness(citation_map)
    audit_risk = calculate_audit_risk(thesis_audit)
    graph_health = knowledge_graph.get("summary", {}).get("graph_health_score", 0) if knowledge_graph else 0

    suggested_papers = [
        {
            "paper_id": "PAPER_1",
            "title": "Need Analysis Paper",
            "paper_type": "Need Analysis",
            "thesis_scope": "Need analysis, problem evidence, and research justification.",
            "source_chapters": filter_chapters(chapters, ["Bab 1", "Bab 2", "Bab 3", "Bab 4"]),
            "objectives_used": objectives[:1] or ["RO1"],
            "key_tables": findings_tables[:4],
            "citation_readiness": citation_readiness,
            "audit_risk": audit_risk,
            "novelty_angle": "Evidence-based need analysis for thesis-to-journal extraction.",
            "status": "planned",
        },
        {
            "paper_id": "PAPER_2",
            "title": "Development Paper",
            "paper_type": "Development",
            "thesis_scope": "Structured development workflow, framework construction, and expert validation.",
            "source_chapters": filter_chapters(chapters, ["Bab 2", "Bab 3", "Bab 4", "Bab 5"]),
            "objectives_used": objectives[1:3] or objectives or ["RO2", "RO3"],
            "key_tables": findings_tables[:6],
            "citation_readiness": citation_readiness,
            "audit_risk": audit_risk,
            "novelty_angle": "Integrated development-validation workflow with traceable thesis evidence.",
            "status": "recommended",
        },
        {
            "paper_id": "PAPER_3",
            "title": "Validation Paper",
            "paper_type": "Validation",
            "thesis_scope": "Model synthesis, framework contribution, and conceptual consolidation.",
            "source_chapters": filter_chapters(chapters, ["Bab 4", "Bab 5"]),
            "objectives_used": objectives[-1:] or ["RO3"],
            "key_tables": findings_tables[-4:] if findings_tables else [],
            "citation_readiness": citation_readiness,
            "audit_risk": audit_risk,
            "novelty_angle": "Framework-level synthesis supported by graph-linked evidence.",
            "status": "optional",
        },
    ]

    return {
        "project_id": project_id,
        "status": "built",
        "suggested_papers": suggested_papers,
        "phase_separation": [
            {
                "phase_id": "PHASE_1",
                "phase_name": "Need Analysis",
                "related_chapters": filter_chapters(chapters, ["Bab 1", "Bab 2", "Bab 3", "Bab 4"]),
                "recommended_paper": "PAPER_1",
            },
            {
                "phase_id": "PHASE_2",
                "phase_name": "Development",
                "related_chapters": filter_chapters(chapters, ["Bab 2", "Bab 3", "Bab 4"]),
                "recommended_paper": "PAPER_2",
            },
            {
                "phase_id": "PHASE_3",
                "phase_name": "Validation / Evaluation",
                "related_chapters": filter_chapters(chapters, ["Bab 4", "Bab 5"]),
                "recommended_paper": "PAPER_2 / PAPER_3",
            },
        ],
        "overlap_warnings": build_overlap_warnings(suggested_papers, thesis_audit),
        "recommended_sequence": ["PAPER_1", "PAPER_2", "PAPER_3"],
        "planner_summary": {
            "total_suggested_papers": len(suggested_papers),
            "citation_readiness": citation_readiness,
            "audit_risk": audit_risk,
            "graph_health_score": graph_health,
            "primary_recommendation": "Prioritise PAPER_2 if development-validation contribution is the main submission target.",
        },
    }


def extract_chapters(parsed_thesis: dict[str, Any] | None) -> list[str]:
    if not parsed_thesis:
        return ["Bab 1", "Bab 2", "Bab 3", "Bab 4", "Bab 5"]

    chapters = []
    for chapter in parsed_thesis.get("chapters", []):
        if not isinstance(chapter, dict):
            continue

        label = str(chapter.get("label", ""))
        if label and label not in chapters:
            chapters.append(label)

    return chapters or ["Bab 1", "Bab 2", "Bab 3", "Bab 4", "Bab 5"]


def extract_objectives(objective_map: dict[str, Any] | None) -> list[str]:
    if not objective_map:
        return []

    objectives = []
    for objective in objective_map.get("objectives", []):
        if not isinstance(objective, dict):
            continue

        objective_id = str(objective.get("objective_id", ""))
        if objective_id:
            objectives.append(objective_id)

    return objectives


def extract_findings_tables(table_map: dict[str, Any] | None) -> list[str]:
    if not table_map:
        return []

    tables = []
    for table in table_map.get("tables", []):
        if not isinstance(table, dict):
            continue

        if table.get("suggested_paper_section") == "Findings":
            tables.append(str(table.get("table_number", table.get("table_id", "Table"))))

    return tables


def calculate_citation_readiness(citation_map: dict[str, Any] | None) -> str:
    if not citation_map:
        return "Not mapped"

    total = int(citation_map.get("total_citations", 0) or 0)
    matched = int(citation_map.get("matched_citations", 0) or 0)
    if total == 0:
        return "No citations detected"

    return f"{round((matched / total) * 100)}%"


def calculate_audit_risk(thesis_audit: dict[str, Any] | None) -> str:
    if not thesis_audit:
        return "Unknown"

    score = int(thesis_audit.get("overall_audit_score", 0) or 0)
    high_issues = sum(
        1
        for issue in thesis_audit.get("issues", [])
        if isinstance(issue, dict) and issue.get("severity") == "high"
    )
    if score >= 80 and high_issues == 0:
        return "Low"
    if score >= 60:
        return "Medium"
    return "High"


def build_overlap_warnings(
    suggested_papers: list[dict[str, Any]],
    thesis_audit: dict[str, Any] | None,
) -> list[str]:
    warnings = [
        "Keep need analysis evidence concentrated in PAPER_1 to avoid repeating survey-heavy discussion.",
        "Reserve development-validation workflow and expert validation contribution for PAPER_2.",
        "Use PAPER_3 only for synthesis/model contribution after PAPER_1 and PAPER_2 boundaries are stable.",
    ]

    if thesis_audit and thesis_audit.get("issues"):
        warnings.append("Resolve audit issues before finalising paper scope boundaries.")

    repeated_tables = find_repeated_tables(suggested_papers)
    if repeated_tables:
        warnings.append(f"Review repeated table use across papers: {', '.join(repeated_tables)}.")

    return warnings


def find_repeated_tables(suggested_papers: list[dict[str, Any]]) -> list[str]:
    table_counts: dict[str, int] = {}
    for paper in suggested_papers:
        for table in paper.get("key_tables", []):
            table_counts[str(table)] = table_counts.get(str(table), 0) + 1

    return [table for table, count in table_counts.items() if count > 1]


def filter_chapters(chapters: list[str], preferred: list[str]) -> list[str]:
    matched = [
        chapter
        for chapter in chapters
        if any(preferred_chapter.lower() in chapter.lower() for preferred_chapter in preferred)
    ]
    return matched or preferred
