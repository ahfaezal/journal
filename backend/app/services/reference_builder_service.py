from typing import Any


def build_reference_bank(
    paper_id: str,
    full_paper: dict[str, Any] | None,
    citation_map: dict[str, Any] | None,
    upload_metadata: dict[str, dict[str, str]],
    thesis_audit: dict[str, Any] | None,
) -> dict[str, Any]:
    citations = citation_map.get("citations", []) if citation_map else []
    mfl_available = has_mfl(upload_metadata)
    seen_author_year: dict[str, int] = {}
    references = []

    for citation in citations:
        citation_text = str(citation.get("citation_text", "Unknown citation"))
        author = str(citation.get("detected_author", "Unknown")).strip() or "Unknown"
        year = str(citation.get("detected_year", "n.d.")).strip() or "n.d."
        author_year_key = f"{author.lower()}-{year}"
        seen_author_year[author_year_key] = seen_author_year.get(author_year_key, 0) + 1

        mfl_status = str(citation.get("mfl_status", "review_required"))
        issue = str(citation.get("issue", ""))
        if not mfl_available:
            mfl_status = "review_required"
            issue = "MFL not available; reference requires manual verification."
        elif mfl_status != "matched":
            issue = issue or "Citation not matched with MFL."

        references.append(
            {
                "citation_text": citation_text,
                "apa_reference": build_mock_apa_reference(author, year, mfl_status),
                "mfl_status": mfl_status,
                "issue": issue or "None",
                "source_section": citation.get("source_section", "Unknown section"),
            }
        )

    for reference in references:
        author, year = citation_signature(reference["citation_text"])
        duplicate_key = f"{author.lower()}-{year}"
        if seen_author_year.get(duplicate_key, 0) > 1 and reference["issue"] == "None":
            reference["issue"] = "Duplicate author-year citation detected."

    matched_references = [
        reference
        for reference in references
        if reference["mfl_status"] == "matched"
    ]
    unmatched_references = [
        reference
        for reference in references
        if reference["mfl_status"] != "matched"
    ]
    duplicate_references = sum(1 for count in seen_author_year.values() if count > 1)
    apa_issues = sum(
        1
        for reference in references
        if reference["issue"] != "None" or reference["mfl_status"] != "matched"
    )

    return {
        "paper_id": paper_id,
        "title": full_paper.get("title", fallback_title(paper_id)) if full_paper else fallback_title(paper_id),
        "total_in_text_citations": len(citations),
        "matched_references": len(matched_references),
        "unmatched_references": len(unmatched_references),
        "duplicate_references": duplicate_references,
        "apa_issues": apa_issues,
        "references": references,
        "citation_guard": build_citation_guard(
            mfl_available=mfl_available,
            thesis_audit=thesis_audit,
            unmatched_count=len(unmatched_references),
        ),
    }


def build_reference_markdown(reference_bank: dict[str, Any]) -> str:
    lines = [
        f"# Reference Bank - {reference_bank.get('paper_id', 'PAPER')}",
        "",
        "## Summary",
        "",
        f"- Total in-text citations: {reference_bank.get('total_in_text_citations', 0)}",
        f"- Matched references: {reference_bank.get('matched_references', 0)}",
        f"- Unmatched references: {reference_bank.get('unmatched_references', 0)}",
        f"- Duplicate references: {reference_bank.get('duplicate_references', 0)}",
        f"- APA issues: {reference_bank.get('apa_issues', 0)}",
        "",
        "## References",
        "",
    ]

    references = reference_bank.get("references", [])
    if references:
        for reference in references:
            lines.append(f"- {reference.get('apa_reference', '')}")
    else:
        lines.append("- [No citation detected yet.]")

    lines.extend(
        [
            "",
            "## Citation Guard",
            "",
            f"- Fake citation risk: {reference_bank.get('citation_guard', {}).get('fake_citation_risk', 'Unknown')}",
            f"- Unsupported claim risk: {reference_bank.get('citation_guard', {}).get('unsupported_claim_risk', 'Unknown')}",
            f"- MFL dependency: {reference_bank.get('citation_guard', {}).get('mfl_dependency', 'Unknown')}",
        ]
    )

    return "\n".join(lines)


def has_mfl(upload_metadata: dict[str, dict[str, str]]) -> bool:
    return any(
        isinstance(item, dict) and item.get("file_type") == "mfl"
        for item in upload_metadata.values()
    )


def build_mock_apa_reference(author: str, year: str, mfl_status: str) -> str:
    if mfl_status != "matched":
        return "[Review required: citation not verified against MFL.]"

    safe_author = author if author and author != "Unknown" else "Unknown Author"
    safe_year = year if year and year != "n.d." else "n.d."
    return f"{safe_author}. ({safe_year}). Verified thesis reference entry. Master File List."


def build_citation_guard(
    mfl_available: bool,
    thesis_audit: dict[str, Any] | None,
    unmatched_count: int,
) -> dict[str, Any]:
    issues = thesis_audit.get("issues", []) if thesis_audit else []
    unsupported_issues = [
        issue
        for issue in issues
        if isinstance(issue, dict) and "unsupported" in str(issue.get("issue_type", "")).lower()
    ]
    fake_citation_risk = "Low" if mfl_available and unmatched_count == 0 else "Medium"
    if not mfl_available:
        fake_citation_risk = "High"

    unsupported_claim_risk = "Low"
    if unsupported_issues:
        unsupported_claim_risk = "Medium"
    if any(issue.get("severity") == "high" for issue in unsupported_issues):
        unsupported_claim_risk = "High"

    notes = [
        "Reference bank generated from citation map and uploaded MFL metadata.",
    ]
    if not mfl_available:
        notes.append("MFL is not available; all references require manual verification.")
    if unmatched_count:
        notes.append(f"{unmatched_count} citation(s) require matching or APA review.")

    return {
        "fake_citation_risk": fake_citation_risk,
        "unsupported_claim_risk": unsupported_claim_risk,
        "mfl_dependency": "Enabled" if mfl_available else "Review required",
        "notes": notes,
    }


def citation_signature(citation_text: str) -> tuple[str, str]:
    cleaned = citation_text.replace("(", " ").replace(")", " ").replace(",", " ")
    parts = [part for part in cleaned.split() if part]
    author = parts[0] if parts else "Unknown"
    year = next((part for part in parts if part.isdigit() and len(part) == 4), "n.d.")
    return author, year


def fallback_title(paper_id: str) -> str:
    titles = {
        "PAPER_1": "Need Analysis Paper",
        "PAPER_2": "Development & Validation Paper",
        "PAPER_3": "Framework / Model Paper",
    }
    return titles.get(paper_id, "Journal Paper")
