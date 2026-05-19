from collections import Counter
from pathlib import Path
from typing import Any


def build_citation_map(
    project_id: str,
    parsed_thesis: dict[str, Any],
    upload_metadata: dict[str, dict[str, str]],
) -> dict[str, Any]:
    parsed_citations = parsed_thesis.get("citations", [])
    parsed_references = parsed_thesis.get("references", [])
    parsed_headings = parsed_thesis.get("headings", [])
    mfl_available = any(item.get("file_type") == "mfl" for item in upload_metadata.values())

    citation_texts = [
        str(citation.get("citation", ""))
        for citation in parsed_citations
        if isinstance(citation, dict) and citation.get("citation")
    ]
    citation_counts = Counter(citation_texts)
    reference_blob = " ".join(
        str(reference.get("text", ""))
        for reference in parsed_references
        if isinstance(reference, dict)
    ).lower()

    citation_rows = []
    matched_citations = 0
    unmatched_citations = 0

    for citation in parsed_citations:
        if not isinstance(citation, dict):
            continue

        citation_text = str(citation.get("citation", ""))
        detected_author = str(citation.get("author", ""))
        detected_year = str(citation.get("year", ""))
        source_file = str(citation.get("source_file", "Unknown file"))
        source_position = int(citation.get("position", 0) or 0)
        source_section = detect_source_section(parsed_headings, source_file, source_position)
        duplicate_count = citation_counts.get(citation_text, 0)

        author_match = bool(detected_author) and detected_author.split()[0].lower() in reference_blob
        year_match = bool(detected_year) and detected_year[:4] in reference_blob
        is_matched = mfl_available and year_match and (author_match or "et al." in detected_author.lower())

        if is_matched:
            matched_citations += 1
        else:
            unmatched_citations += 1

        citation_rows.append(
            {
                "citation_text": citation_text,
                "detected_author": detected_author,
                "detected_year": detected_year,
                "source_file": source_file,
                "source_section": source_section,
                "mfl_status": "matched" if is_matched else "unmatched",
                "issue": build_issue(mfl_available, year_match, author_match, duplicate_count),
            }
        )

    return {
        "project_id": project_id,
        "status": "mapped",
        "mfl_available": mfl_available,
        "total_citations": len(citation_rows),
        "unique_citations": len(citation_counts),
        "matched_citations": matched_citations,
        "unmatched_citations": unmatched_citations,
        "duplicate_citations": sum(count - 1 for count in citation_counts.values() if count > 1),
        "citations": citation_rows,
    }


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


def build_issue(
    mfl_available: bool,
    year_match: bool,
    author_match: bool,
    duplicate_count: int,
) -> str:
    issues = []
    if not mfl_available:
        issues.append("MFL not uploaded")
    if not year_match:
        issues.append("year not found in parsed references")
    if not author_match:
        issues.append("author not found in parsed references")
    if duplicate_count > 1:
        issues.append("duplicate citation")

    return "; ".join(issues) if issues else "No issue detected"
