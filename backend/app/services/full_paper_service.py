from datetime import UTC, datetime
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


def build_full_paper(
    paper_id: str,
    section_structure: dict[str, Any] | None,
    drafted_sections: list[dict[str, Any]],
    locked_sections: list[dict[str, Any]],
    citation_map: dict[str, Any] | None,
    thesis_audit: dict[str, Any] | None,
) -> dict[str, Any]:
    title = (
        section_structure.get("paper_title")
        if section_structure and section_structure.get("paper_title")
        else fallback_title(paper_id)
    )
    drafted_by_name = {
        normalize_name(section.get("section_name")): section
        for section in drafted_sections
        if isinstance(section, dict)
    }
    locked_by_name = {
        normalize_name(section.get("section_name")): section
        for section in locked_sections
        if isinstance(section, dict)
    }
    integrated_parts = []
    sections_included = []
    missing_sections = []
    integration_warnings = []

    for section_name in SECTION_ORDER:
        normalized = normalize_name(section_name)
        section = locked_by_name.get(normalized) or drafted_by_name.get(normalized)
        if section:
            integrated_parts.append(f"# {section_name}\n\n{section.get('generated_text', '').strip()}")
            sections_included.append(
                {
                    "section_name": section_name,
                    "status": section.get("status", "drafted"),
                    "version": section.get("version", "v1"),
                    "word_count": int(section.get("word_count", 0) or 0),
                }
            )
        else:
            placeholder = f"[WARNING: {section_name} section has not been generated yet.]"
            integrated_parts.append(f"# {section_name}\n\n{placeholder}")
            missing_sections.append(section_name)
            integration_warnings.append(f"{section_name} is missing and was inserted as a warning placeholder.")

    continuity_notes = build_continuity_notes(thesis_audit, missing_sections)
    citation_count = citation_count_from_map(citation_map)
    integrated_text = f"# {title}\n\n" + "\n\n".join(integrated_parts) + "\n\n# References\n\n[References placeholder: build final reference list before submission.]"

    return {
        "paper_id": paper_id,
        "title": title,
        "integrated_text": integrated_text,
        "sections_included": sections_included,
        "locked_sections_count": len(locked_by_name),
        "drafted_sections_count": sum(
            1 for section in drafted_by_name.values() if section.get("status") == "drafted"
        ),
        "missing_sections": missing_sections,
        "total_word_count": len(integrated_text.split()),
        "citation_count": citation_count,
        "integration_warnings": integration_warnings,
        "continuity_notes": continuity_notes,
        "status": "integrated",
        "generated_at": datetime.now(UTC).isoformat(),
    }


def build_markdown(full_paper: dict[str, Any]) -> str:
    return str(full_paper.get("integrated_text", ""))


def build_continuity_notes(
    thesis_audit: dict[str, Any] | None,
    missing_sections: list[str],
) -> list[str]:
    notes = []
    if missing_sections:
        notes.append(f"Missing sections require drafting before reviewer simulation: {', '.join(missing_sections)}.")

    if thesis_audit:
        issues = thesis_audit.get("issues", [])
        high_issues = [
            issue
            for issue in issues
            if isinstance(issue, dict) and issue.get("severity") == "high"
        ]
        medium_issues = [
            issue
            for issue in issues
            if isinstance(issue, dict) and issue.get("severity") == "medium"
        ]
        if high_issues:
            notes.append(f"{len(high_issues)} high-severity audit issue(s) should be resolved before submission.")
        if medium_issues:
            notes.append(f"{len(medium_issues)} medium-severity audit issue(s) should be reviewed for continuity.")

    if not notes:
        notes.append("No major continuity warning detected from available audit and section data.")

    return notes


def citation_count_from_map(citation_map: dict[str, Any] | None) -> int:
    if not citation_map:
        return 0

    return int(citation_map.get("total_citations", 0) or 0)


def normalize_name(value: Any) -> str:
    return str(value).strip().lower().replace("_", " ")


def fallback_title(paper_id: str) -> str:
    titles = {
        "PAPER_1": "Need Analysis Paper",
        "PAPER_2": "Development & Validation Paper",
        "PAPER_3": "Framework / Model Paper",
    }
    return titles.get(paper_id, "Journal Paper")
