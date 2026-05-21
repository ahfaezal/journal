from datetime import UTC, datetime
from typing import Any

from app.core.config import settings
from app.services.ai.openai_client import PROMPT_VERSION, generate_section_draft as generate_ai_section_draft


def generate_section_draft(
    paper_id: str,
    section_name: str,
    section_structure: dict[str, Any] | None,
    paper_extraction: dict[str, Any] | None,
    citation_map: dict[str, Any] | None,
    table_map: dict[str, Any] | None,
    objective_map: dict[str, Any] | None,
    thesis_audit: dict[str, Any] | None,
) -> dict[str, Any]:
    section = find_section(section_structure, section_name)
    citations_used = select_citations(section, citation_map)
    tables_used = select_tables(section, table_map)
    audit_warnings = select_audit_warnings(section, thesis_audit)
    source_context_used = build_source_context(section, paper_extraction, objective_map)
    ai_enabled = bool(settings.openai_api_key)
    generated_text = None
    generation_mode = "heuristic"

    if ai_enabled:
        generated_text = generate_ai_section_draft(
            paper_id=paper_id,
            section_name=section_name,
            section=section,
            section_structure=section_structure,
            paper_extraction=paper_extraction,
            citation_map=citation_map,
            objective_map=objective_map,
            table_map=table_map,
            thesis_audit=thesis_audit,
            citations_used=citations_used,
            tables_used=tables_used,
            audit_warnings=audit_warnings,
            source_context_used=source_context_used,
        )
        generation_mode = "ai_assisted" if generated_text else "heuristic_fallback"

    if not generated_text:
        generated_text = generate_heuristic_text(
        paper_id=paper_id,
        section_name=section_name,
        section=section,
        source_context_used=source_context_used,
        citations_used=citations_used,
        tables_used=tables_used,
        audit_warnings=audit_warnings,
        )

    return {
        "paper_id": paper_id,
        "section_name": section_name,
        "title": section_name,
        "generated_text": generated_text,
        "source_context_used": source_context_used,
        "citations_used": citations_used,
        "tables_used": tables_used,
        "audit_warnings": audit_warnings,
        "word_count": len(generated_text.split()),
        "status": "drafted",
        "version": "v1",
        "generated_at": datetime.now(UTC).isoformat(),
        "ai_model": settings.openai_model if ai_enabled else "",
        "ai_enabled": ai_enabled and generation_mode == "ai_assisted",
        "prompt_version": PROMPT_VERSION,
        "generation_mode": generation_mode,
    }


def find_section(section_structure: dict[str, Any] | None, section_name: str) -> dict[str, Any]:
    if section_structure:
        for section in section_structure.get("sections", []):
            if isinstance(section, dict) and normalize_name(section.get("section_name", "")) == normalize_name(section_name):
                return section

    return {
        "section_name": section_name,
        "purpose": f"Draft the {section_name} section using available thesis context.",
        "suggested_subheadings": [],
        "source_chapters": [],
        "source_tables": [],
        "required_citations": [],
        "writing_notes": [],
        "audit_warnings": [],
        "estimated_word_count": 500,
        "readiness_status": "Review",
    }


def select_citations(section: dict[str, Any], citation_map: dict[str, Any] | None) -> list[str]:
    required = [str(citation) for citation in section.get("required_citations", []) if citation]
    if required:
        return required[:8]

    if not citation_map:
        return []

    citations = []
    for citation in citation_map.get("citations", []):
        if isinstance(citation, dict) and citation.get("mfl_status") == "matched":
            citations.append(str(citation.get("citation_text", "")))

    return list(dict.fromkeys([citation for citation in citations if citation]))[:6]


def select_tables(section: dict[str, Any], table_map: dict[str, Any] | None) -> list[str]:
    section_tables = [str(table) for table in section.get("source_tables", []) if table]
    if section_tables:
        return section_tables[:8]

    if normalize_name(section.get("section_name", "")) != "findings" or not table_map:
        return []

    tables = []
    for table in table_map.get("tables", []):
        if isinstance(table, dict) and table.get("suggested_paper_section") == "Findings":
            tables.append(str(table.get("table_number", table.get("table_id", ""))))

    return [table for table in tables if table][:8]


def select_audit_warnings(section: dict[str, Any], thesis_audit: dict[str, Any] | None) -> list[str]:
    warnings = [str(warning) for warning in section.get("audit_warnings", []) if warning]
    if warnings:
        return warnings[:6]

    if not thesis_audit:
        return []

    section_name = normalize_name(section.get("section_name", ""))
    selected = []
    for issue in thesis_audit.get("issues", []):
        if not isinstance(issue, dict):
            continue

        issue_type = normalize_name(issue.get("issue_type", ""))
        issue_section = normalize_name(issue.get("section", ""))
        if section_name in issue_section or section_issue_match(section_name, issue_type):
            selected.append(str(issue.get("description", "Audit issue requires review.")))

    return selected[:6]


def build_source_context(
    section: dict[str, Any],
    paper_extraction: dict[str, Any] | None,
    objective_map: dict[str, Any] | None,
) -> list[str]:
    context = [str(chapter) for chapter in section.get("source_chapters", []) if chapter]
    section_name = str(section.get("section_name", ""))

    if paper_extraction:
        extraction_item = paper_extraction.get("extraction_map", {}).get(section_name, {})
        if isinstance(extraction_item, dict):
            source = extraction_item.get("source")
            note = extraction_item.get("note")
            if source:
                context.append(f"Extraction source: {source}")
            if note:
                context.append(f"Extraction note: {note}")

    if objective_map and normalize_name(section_name) in {"findings", "discussion", "conclusion", "introduction"}:
        objectives = [
            str(objective.get("objective_id", "RO"))
            for objective in objective_map.get("objectives", [])
            if isinstance(objective, dict)
        ]
        if objectives:
            context.append(f"Objective alignment: {', '.join(objectives[:5])}")

    return list(dict.fromkeys(context))


def generate_heuristic_text(
    paper_id: str,
    section_name: str,
    section: dict[str, Any],
    source_context_used: list[str],
    citations_used: list[str],
    tables_used: list[str],
    audit_warnings: list[str],
) -> str:
    normalized = normalize_name(section_name)
    title = section.get("section_name", section_name)
    purpose = section.get("purpose", "")
    notes = section.get("writing_notes", [])
    subheadings = section.get("suggested_subheadings", [])

    if normalized == "abstract":
        return compose_paragraphs(
            [
                f"This section provides a structured abstract placeholder for {paper_id}. It summarises the paper focus, methodological basis, evidence source, and intended contribution using the available section structure.",
                f"The draft should cover the research background, aim, method, findings, and contribution. The current structure identifies {len(source_context_used)} source context item(s), {len(citations_used)} citation anchor(s), and {len(tables_used)} table evidence item(s).",
                "No effectiveness or field-testing claim is introduced at this stage. The abstract remains a controlled draft pending full section writing and reviewer audit.",
            ]
        )

    if normalized == "introduction":
        return compose_paragraphs(
            [
                f"The introduction establishes the context and rationale for {paper_id}. It is grounded in {join_or_default(source_context_used, 'the mapped thesis source chapters')} and frames the paper around the purpose: {purpose}",
                f"The opening argument should move from research context to paper focus, then to contribution positioning. Citation anchors such as {join_or_default(citations_used, 'verified thesis citations')} should be used only where they support thesis-derived claims.",
                notes_sentence(notes),
            ]
        )

    if normalized == "problem statement":
        return compose_paragraphs(
            [
                f"The problem statement defines the gap addressed by {paper_id}. It should convert the thesis problem evidence into a focused paper-level development or evidence gap.",
                f"The section should avoid broad thesis repetition and instead clarify why the selected scope requires scholarly attention. Audit warnings to consider include: {join_or_default(audit_warnings, 'no active section-level warning')}.",
                notes_sentence(notes),
            ]
        )

    if normalized == "literature review":
        return compose_paragraphs(
            [
                "The literature review should position the paper through selected concepts, methodological anchors, and citation-controlled evidence rather than broad textbook explanation.",
                f"Required citation anchors include {join_or_default(citations_used, 'the verified citation map once available')}. The review should support the argument path represented by the suggested subheadings: {join_or_default(subheadings, 'core concepts, methodological foundation, and research gap')}.",
                notes_sentence(notes),
            ]
        )

    if normalized == "methodology":
        return compose_paragraphs(
            [
                f"The methodology section explains how the paper uses thesis evidence from {join_or_default(source_context_used, 'the mapped methodology sources')}. It should describe design, data source, analysis procedure, and quality control without procedural dumping.",
                "The section must make the transformation from thesis material to journal article scope explicit. Methodological claims should remain tied to the selected paper boundary.",
                notes_sentence(notes),
            ]
        )

    if normalized == "findings":
        return compose_paragraphs(
            [
                f"The findings section presents evidence selected for {paper_id}. It should organise findings around the mapped thesis sources and use table evidence such as {join_or_default(tables_used, 'the mapped findings tables')}.",
                "The findings narrative should interpret table evidence enough to support the paper argument, while avoiding table dumping or repetition of the full thesis chapter.",
                notes_sentence(notes),
            ]
        )

    if normalized == "discussion":
        return compose_paragraphs(
            [
                "The discussion section interprets the selected findings as a paper-level contribution. It should connect objectives, findings, and scholarly positioning without introducing unsupported implementation outcomes.",
                f"Continuity should be checked against {join_or_default(source_context_used, 'the objective and discussion mapping')}. Audit warnings to consider include: {join_or_default(audit_warnings, 'no active warning')}.",
                notes_sentence(notes),
            ]
        )

    if normalized == "conclusion":
        return compose_paragraphs(
            [
                f"The conclusion closes {paper_id} by restating the paper focus, summarising the controlled evidence base, and naming the contribution without overclaiming.",
                "The final paragraph should point to future work or later validation only when supported by the thesis evidence. It should not claim proven effectiveness, implementation success, or measured impact unless such evidence is present.",
                notes_sentence(notes),
            ]
        )

    return compose_paragraphs(
        [
            f"{title} should be drafted using the section purpose: {purpose}",
            notes_sentence(notes),
        ]
    )


def lock_section(section: dict[str, Any]) -> dict[str, Any]:
    locked_section = dict(section)
    locked_section["status"] = "locked"
    locked_section["locked_at"] = datetime.now(UTC).isoformat()
    return locked_section


def section_issue_match(section_name: str, issue_type: str) -> bool:
    if section_name == "findings" and ("table" in issue_type or "objective" in issue_type):
        return True
    if section_name in {"introduction", "problem statement", "literature review", "methodology", "discussion"} and (
        "citation" in issue_type or "reference" in issue_type
    ):
        return True
    return section_name in {"discussion", "conclusion"} and "continuity" in issue_type


def notes_sentence(notes: list[Any]) -> str:
    valid_notes = [str(note) for note in notes if note]
    if not valid_notes:
        return "The draft remains a controlled placeholder and should be reviewed against the thesis evidence before locking."

    return "Writing control notes: " + " ".join(valid_notes[:4])


def compose_paragraphs(paragraphs: list[str]) -> str:
    return "\n\n".join(paragraph.strip() for paragraph in paragraphs if paragraph.strip())


def join_or_default(items: list[str], default: str) -> str:
    valid_items = [item for item in items if item]
    return ", ".join(valid_items[:8]) if valid_items else default


def normalize_name(value: Any) -> str:
    return str(value).strip().lower().replace("_", " ")
