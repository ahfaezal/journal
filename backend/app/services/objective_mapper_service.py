from typing import Any


FINDINGS_KEYWORDS = ("findings", "dapatan", "bab 4", "chapter 4")
DISCUSSION_KEYWORDS = ("discussion", "perbincangan", "kesimpulan", "bab 5", "chapter 5")


def build_objective_map(
    project_id: str,
    parsed_thesis: dict[str, Any],
    thesis_intelligence: dict[str, Any] | None = None,
) -> dict[str, Any]:
    parsed_objectives = parsed_thesis.get("objectives", [])
    parsed_headings = parsed_thesis.get("headings", [])
    findings_headings = find_headings(parsed_headings, FINDINGS_KEYWORDS)
    discussion_headings = find_headings(parsed_headings, DISCUSSION_KEYWORDS)
    intelligence_objectives = []

    if thesis_intelligence:
        intelligence_objectives = thesis_intelligence.get("objective_map", [])

    objective_rows = []
    mapped_objectives = 0

    for index, objective in enumerate(parsed_objectives, start=1):
        if not isinstance(objective, dict):
            continue

        linked_findings = build_links(findings_headings)
        linked_discussion = build_links(discussion_headings)
        alignment_status = determine_alignment_status(linked_findings, linked_discussion)
        confidence_score = determine_confidence_score(
            linked_findings=linked_findings,
            linked_discussion=linked_discussion,
            intelligence_objectives=intelligence_objectives,
        )

        if alignment_status != "review_required":
            mapped_objectives += 1

        objective_rows.append(
            {
                "objective_id": str(objective.get("objective_id") or f"RO{index}"),
                "objective_text": str(
                    objective.get("objective_text")
                    or objective.get("detected_objective")
                    or objective.get("text")
                    or f"Research Objective {index}"
                ),
                "source_file": str(objective.get("source_file", "Unknown file")),
                "source_chapter": str(objective.get("source_chapter", "Bab 1")),
                "source_heading": str(objective.get("source_heading", "Research Objectives")),
                "extraction_status": str(objective.get("extraction_status", "extracted")),
                "source_section": detect_source_section(
                    parsed_headings,
                    str(objective.get("source_file", "")),
                    int(objective.get("position", 0) or 0),
                ),
                "linked_findings": linked_findings,
                "linked_discussion": linked_discussion,
                "alignment_status": alignment_status,
                "issue": build_issue(linked_findings, linked_discussion),
                "confidence_score": max(confidence_score, int(objective.get("confidence_score", 0) or 0)),
            }
        )

    return {
        "project_id": project_id,
        "status": "mapped",
        "extraction_status": parsed_thesis.get("objective_extraction_status", "unknown"),
        "total_objectives": len(objective_rows),
        "mapped_objectives": mapped_objectives,
        "unmapped_objectives": len(objective_rows) - mapped_objectives,
        "objectives": objective_rows,
    }


def find_headings(headings: object, keywords: tuple[str, ...]) -> list[dict[str, Any]]:
    if not isinstance(headings, list):
        return []

    matched_headings = []
    for heading in headings:
        if not isinstance(heading, dict):
            continue

        text = str(heading.get("text", ""))
        lowered_text = text.lower()
        if any(keyword in lowered_text for keyword in keywords):
            matched_headings.append(heading)

    return matched_headings


def build_links(headings: list[dict[str, Any]]) -> list[dict[str, str]]:
    return [
        {
            "source_file": str(heading.get("source_file", "Unknown file")),
            "section": str(heading.get("text", "Unknown section")),
        }
        for heading in headings[:5]
    ]


def determine_alignment_status(
    linked_findings: list[dict[str, str]],
    linked_discussion: list[dict[str, str]],
) -> str:
    if linked_findings and linked_discussion:
        return "partially_mapped"

    return "review_required"


def determine_confidence_score(
    linked_findings: list[dict[str, str]],
    linked_discussion: list[dict[str, str]],
    intelligence_objectives: object,
) -> int:
    score = 35
    if linked_findings:
        score += 25
    if linked_discussion:
        score += 25
    if isinstance(intelligence_objectives, list) and intelligence_objectives:
        score += 10

    return min(score, 95)


def build_issue(
    linked_findings: list[dict[str, str]],
    linked_discussion: list[dict[str, str]],
) -> str:
    if linked_findings and linked_discussion:
        return "Objective has heuristic links to findings and discussion headings."
    if not linked_findings and not linked_discussion:
        return "No findings or discussion heading detected; review required."
    if not linked_findings:
        return "Findings heading not detected; review required."

    return "Discussion heading not detected; review required."


def detect_source_section(
    headings: object,
    source_file: str,
    source_position: int,
) -> str:
    if not isinstance(headings, list):
        return "Unknown section"

    matched_heading = None
    for heading in headings:
        if not isinstance(heading, dict):
            continue

        heading_file = str(heading.get("source_file", ""))
        heading_position = int(heading.get("position", 0) or 0)
        if heading_file == source_file and heading_position <= source_position:
            matched_heading = str(heading.get("text", "Unknown section"))

    return matched_heading or "Unknown section"
