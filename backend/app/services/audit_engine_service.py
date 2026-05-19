from datetime import UTC, datetime
from typing import Any


def build_thesis_audit(
    project_id: str,
    parsed_thesis: dict[str, Any] | None,
    citation_map: dict[str, Any] | None,
    objective_map: dict[str, Any] | None,
    table_map: dict[str, Any] | None,
    thesis_intelligence: dict[str, Any] | None,
) -> dict[str, Any]:
    issues: list[dict[str, Any]] = []
    issues.extend(build_citation_issues(citation_map))
    issues.extend(build_objective_issues(objective_map))
    issues.extend(build_table_issues(table_map))
    issues.extend(build_reference_issues(parsed_thesis))

    citation_score = calculate_citation_score(citation_map)
    objective_alignment_score = calculate_objective_score(objective_map)
    table_mapping_score = calculate_table_score(table_map)
    methodology_consistency_score = int(
        thesis_intelligence.get("methodology_consistency", 75)
        if thesis_intelligence
        else 75
    )
    reviewer_readiness_score = round(
        (
            citation_score
            + objective_alignment_score
            + table_mapping_score
            + methodology_consistency_score
        )
        / 4
    )
    overall_audit_score = max(
        0,
        round(
            (
                citation_score
                + objective_alignment_score
                + table_mapping_score
                + methodology_consistency_score
                + reviewer_readiness_score
            )
            / 5
            - severity_penalty(issues)
        ),
    )

    return {
        "project_id": project_id,
        "status": "audited",
        "audit_timestamp": datetime.now(UTC).isoformat(),
        "overall_audit_score": overall_audit_score,
        "citation_score": citation_score,
        "objective_alignment_score": objective_alignment_score,
        "table_mapping_score": table_mapping_score,
        "methodology_consistency_score": methodology_consistency_score,
        "reviewer_readiness_score": reviewer_readiness_score,
        "issues": issues,
    }


def build_citation_issues(citation_map: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not citation_map:
        return [
            make_issue(
                issue_id="CIT-001",
                issue_type="citation_map_missing",
                severity="high",
                section="Citation Map",
                description="Citation map has not been generated.",
                suggested_fix="Build the citation map before running the final audit.",
                related_source="citation_map.json",
            )
        ]

    issues = []
    for index, citation in enumerate(citation_map.get("citations", []), start=1):
        if not isinstance(citation, dict):
            continue

        if citation.get("mfl_status") != "matched":
            issues.append(
                make_issue(
                    issue_id=f"CIT-{index:03d}",
                    issue_type="citation_mismatch",
                    severity="high",
                    section=str(citation.get("source_section", "Citation Map")),
                    description=f"Unmatched citation detected: {citation.get('citation_text', 'Unknown citation')}.",
                    suggested_fix="Verify this citation against the MFL and reference list.",
                    related_source=str(citation.get("source_file", "citation_map.json")),
                )
            )
        elif "duplicate citation" in str(citation.get("issue", "")).lower():
            issues.append(
                make_issue(
                    issue_id=f"CIT-DUP-{index:03d}",
                    issue_type="duplicate_citation",
                    severity="low",
                    section=str(citation.get("source_section", "Citation Map")),
                    description=f"Repeated citation detected: {citation.get('citation_text', 'Unknown citation')}.",
                    suggested_fix="Check whether repeated citation use is necessary in this section.",
                    related_source=str(citation.get("source_file", "citation_map.json")),
                )
            )

    return issues


def build_objective_issues(objective_map: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not objective_map:
        return [
            make_issue(
                issue_id="OBJ-001",
                issue_type="objective_map_missing",
                severity="high",
                section="Objective Map",
                description="Objective map has not been generated.",
                suggested_fix="Build the objective map before checking objective-finding continuity.",
                related_source="objective_map.json",
            )
        ]

    issues = []
    for index, objective in enumerate(objective_map.get("objectives", []), start=1):
        if not isinstance(objective, dict):
            continue

        confidence_score = int(objective.get("confidence_score", 0) or 0)
        if objective.get("alignment_status") == "review_required":
            issues.append(
                make_issue(
                    issue_id=f"OBJ-{index:03d}",
                    issue_type="objective_finding_gap",
                    severity="high",
                    section=str(objective.get("source_section", "Objective Map")),
                    description=f"Objective requires alignment review: {objective.get('objective_id', 'RO')}.",
                    suggested_fix="Link this objective to relevant findings and discussion evidence.",
                    related_source=str(objective.get("source_file", "objective_map.json")),
                )
            )
        elif confidence_score < 70:
            issues.append(
                make_issue(
                    issue_id=f"OBJ-CON-{index:03d}",
                    issue_type="continuity_issue",
                    severity="medium",
                    section=str(objective.get("source_section", "Objective Map")),
                    description=f"Low confidence objective mapping detected for {objective.get('objective_id', 'RO')}.",
                    suggested_fix="Review objective continuity across findings and discussion.",
                    related_source=str(objective.get("source_file", "objective_map.json")),
                )
            )

    return issues


def build_table_issues(table_map: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not table_map:
        return [
            make_issue(
                issue_id="TAB-001",
                issue_type="table_map_missing",
                severity="medium",
                section="Table Map",
                description="Table map has not been generated.",
                suggested_fix="Build the table map to verify table metadata and findings evidence.",
                related_source="table_map.json",
            )
        ]

    issues = []
    for index, table in enumerate(table_map.get("tables", []), start=1):
        if not isinstance(table, dict):
            continue

        if table.get("usage_status") == "review_required":
            issues.append(
                make_issue(
                    issue_id=f"TAB-{index:03d}",
                    issue_type="table_metadata_issue",
                    severity="medium",
                    section=str(table.get("source_section", "Table Map")),
                    description=f"Table metadata needs review: {table.get('table_number', 'Unknown table')}.",
                    suggested_fix="Add or verify table caption, title, and intended paper section.",
                    related_source=str(table.get("source_file", "table_map.json")),
                )
            )

    return issues


def build_reference_issues(parsed_thesis: dict[str, Any] | None) -> list[dict[str, Any]]:
    references_count = len(parsed_thesis.get("references", [])) if parsed_thesis else 0
    citations_count = len(parsed_thesis.get("citations", [])) if parsed_thesis else 0
    if citations_count and references_count == 0:
        return [
            make_issue(
                issue_id="REF-001",
                issue_type="reference_risk",
                severity="high",
                section="References",
                description="Parsed citations exist, but no references were detected.",
                suggested_fix="Verify the references section and rebuild the parser output.",
                related_source="parsed_thesis.json",
            )
        ]

    return []


def calculate_citation_score(citation_map: dict[str, Any] | None) -> int:
    if not citation_map:
        return 40

    total = int(citation_map.get("total_citations", 0) or 0)
    unmatched = int(citation_map.get("unmatched_citations", 0) or 0)
    duplicates = int(citation_map.get("duplicate_citations", 0) or 0)
    if total == 0:
        return 70

    score = 100 - round((unmatched / total) * 45) - min(duplicates * 2, 10)
    return clamp_score(score)


def calculate_objective_score(objective_map: dict[str, Any] | None) -> int:
    if not objective_map:
        return 40

    total = int(objective_map.get("total_objectives", 0) or 0)
    unmapped = int(objective_map.get("unmapped_objectives", 0) or 0)
    objectives = objective_map.get("objectives", [])
    if total == 0:
        return 55

    confidence_scores = [
        int(objective.get("confidence_score", 0) or 0)
        for objective in objectives
        if isinstance(objective, dict)
    ]
    average_confidence = (
        round(sum(confidence_scores) / len(confidence_scores))
        if confidence_scores
        else 60
    )
    score = average_confidence - round((unmapped / total) * 35)
    return clamp_score(score)


def calculate_table_score(table_map: dict[str, Any] | None) -> int:
    if not table_map:
        return 50

    total = int(table_map.get("total_tables", 0) or 0)
    unmapped = int(table_map.get("unmapped_tables", 0) or 0)
    if total == 0:
        return 70

    score = 100 - round((unmapped / total) * 40)
    return clamp_score(score)


def severity_penalty(issues: list[dict[str, Any]]) -> int:
    weights = {"high": 3, "medium": 2, "low": 1}
    return min(sum(weights.get(str(issue.get("severity")), 1) for issue in issues), 18)


def clamp_score(score: int) -> int:
    return max(0, min(100, score))


def make_issue(
    issue_id: str,
    issue_type: str,
    severity: str,
    section: str,
    description: str,
    suggested_fix: str,
    related_source: str,
) -> dict[str, str]:
    return {
        "issue_id": issue_id,
        "issue_type": issue_type,
        "severity": severity,
        "section": section,
        "description": description,
        "suggested_fix": suggested_fix,
        "related_source": related_source,
    }
