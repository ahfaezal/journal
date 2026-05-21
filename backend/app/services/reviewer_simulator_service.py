import json
import re
from datetime import UTC, datetime
from typing import Any

from app.core.config import settings
from app.services.ai.openai_client import get_ai_logger, safe_chat_completion

REVIEW_VERSION = "reviewer_simulator_v1"


def build_reviewer_report(
    project_id: str,
    paper_id: str,
    full_paper: dict[str, Any] | None,
    thesis_audit: dict[str, Any] | None,
    citation_map: dict[str, Any] | None,
    objective_map: dict[str, Any] | None,
    section_structure: dict[str, Any] | None,
    generated_sections: list[dict[str, Any]],
) -> dict[str, Any]:
    ai_enabled = bool(settings.openai_api_key)
    logger = get_ai_logger()
    logger.info(
        "Reviewer AI config check project_id=%s paper_id=%s openai_key_configured=%s model=%s",
        project_id,
        paper_id,
        ai_enabled,
        settings.openai_model,
    )
    ai_report = None

    if ai_enabled:
        logger.info(
            "Reviewer AI mode enabled project_id=%s paper_id=%s model=%s",
            project_id,
            paper_id,
            settings.openai_model,
        )
        try:
            ai_report = generate_ai_reviewer_report(
                project_id=project_id,
                paper_id=paper_id,
                full_paper=full_paper,
                thesis_audit=thesis_audit,
                citation_map=citation_map,
                objective_map=objective_map,
                section_structure=section_structure,
                generated_sections=generated_sections,
            )
        except Exception as error:  # noqa: BLE001 - reviewer must fail closed
            logger.exception(
                "Reviewer OpenAI generation failed; using heuristic fallback project_id=%s paper_id=%s error=%s",
                project_id,
                paper_id,
                error,
            )

    report = ai_report or generate_heuristic_reviewer_report(
        project_id=project_id,
        paper_id=paper_id,
        full_paper=full_paper,
        thesis_audit=thesis_audit,
        citation_map=citation_map,
        objective_map=objective_map,
        section_structure=section_structure,
        generated_sections=generated_sections,
    )
    report["ai_enabled"] = ai_enabled and ai_report is not None
    report["ai_model"] = settings.openai_model if ai_enabled else ""
    report["review_mode"] = "ai_assisted" if ai_enabled and ai_report else "heuristic"
    report["review_version"] = REVIEW_VERSION
    report["generated_at"] = datetime.now(UTC).isoformat()
    return report


def generate_ai_reviewer_report(
    project_id: str,
    paper_id: str,
    full_paper: dict[str, Any] | None,
    thesis_audit: dict[str, Any] | None,
    citation_map: dict[str, Any] | None,
    objective_map: dict[str, Any] | None,
    section_structure: dict[str, Any] | None,
    generated_sections: list[dict[str, Any]],
) -> dict[str, Any] | None:
    context = {
        "project_id": project_id,
        "paper_id": paper_id,
        "full_paper_summary": summarize_full_paper(full_paper),
        "thesis_audit": thesis_audit or {},
        "citation_summary": summarize_citations(citation_map),
        "objective_summary": summarize_objectives(objective_map),
        "section_structure": summarize_section_structure(section_structure),
        "generated_sections": summarize_generated_sections(generated_sections),
    }
    messages = [
        {
            "role": "system",
            "content": (
                "You are Thesis2Journal AI Reviewer Simulator. "
                "Assess only the provided thesis-derived paper artifacts. "
                "Do not invent citations, references, methods, tables, findings, or outcomes. "
                "Return strict JSON only. Focus on methodological development papers, "
                "framework contribution, citation integrity, objective alignment, journal scope, "
                "and anti-overclaim discipline."
            ),
        },
        {
            "role": "user",
            "content": (
                "Generate a reviewer simulation report with exactly these keys: "
                "project_id, paper_id, overall_recommendation, acceptance_probability, "
                "major_issues, minor_issues, methodological_concerns, novelty_concerns, "
                "citation_concerns, writing_quality_concerns, revision_suggestions, "
                "reviewer_personas. reviewer_personas must contain three personas named "
                "Methodology Reviewer, Content Reviewer, and Journal Scope Reviewer, each with "
                "decision_tendency, major_comments, minor_comments, recommendation. "
                "Use short arrays of strings for issue fields and revision_suggestions as objects "
                "with priority, suggestion, target_section.\n\n"
                f"Context JSON:\n{json.dumps(context, ensure_ascii=False, default=str)}"
            ),
        },
    ]
    content = safe_chat_completion(
        messages,
        temperature=0.1,
        response_format={"type": "json_object"},
    )
    if not content:
        raise RuntimeError("Reviewer OpenAI generation returned empty content.")

    parsed = parse_json_object(content)
    if not parsed:
        get_ai_logger().error(
            "Reviewer OpenAI JSON parse failed project_id=%s paper_id=%s content_preview=%s",
            project_id,
            paper_id,
            content[:1000],
        )
        raise ValueError("Reviewer OpenAI generation did not return valid JSON.")

    return normalize_report(project_id, paper_id, parsed)


def generate_heuristic_reviewer_report(
    project_id: str,
    paper_id: str,
    full_paper: dict[str, Any] | None,
    thesis_audit: dict[str, Any] | None,
    citation_map: dict[str, Any] | None,
    objective_map: dict[str, Any] | None,
    section_structure: dict[str, Any] | None,
    generated_sections: list[dict[str, Any]],
) -> dict[str, Any]:
    audit_issues = list_items((thesis_audit or {}).get("issues", []))
    high_issues = [issue for issue in audit_issues if issue.get("severity") == "high"]
    medium_issues = [issue for issue in audit_issues if issue.get("severity") == "medium"]
    unmatched_citations = int((citation_map or {}).get("unmatched_citations", 0) or 0)
    unmapped_objectives = int((objective_map or {}).get("unmapped_objectives", 0) or 0)
    missing_sections = list_items((full_paper or {}).get("missing_sections", []))
    generated_count = len(generated_sections)
    structured_count = len(list_items((section_structure or {}).get("sections", [])))
    total_penalty = (
        len(high_issues) * 12
        + len(medium_issues) * 6
        + unmatched_citations * 3
        + unmapped_objectives * 8
        + len(missing_sections) * 7
    )
    acceptance_probability = max(35, min(92, 82 - total_penalty))
    overall_recommendation = recommendation_from_probability(acceptance_probability)

    major_issues = []
    if high_issues:
        major_issues.append(f"{len(high_issues)} high-severity thesis audit issue(s) require resolution before submission.")
    if missing_sections:
        major_issues.append(f"Missing section(s) reduce reviewer readiness: {', '.join(str(item) for item in missing_sections[:5])}.")
    if unmapped_objectives:
        major_issues.append(f"{unmapped_objectives} objective(s) require stronger finding/discussion alignment.")
    if not major_issues:
        major_issues.append("No high-risk structural issue detected from available generated artifacts.")

    minor_issues = []
    if medium_issues:
        minor_issues.append(f"{len(medium_issues)} medium-severity audit issue(s) should be addressed during revision.")
    if unmatched_citations:
        minor_issues.append(f"{unmatched_citations} unmatched citation(s) need MFL/reference verification.")
    if generated_count < structured_count:
        minor_issues.append("Some structured sections have not been generated or locked yet.")
    if not minor_issues:
        minor_issues.append("Minor issues are limited based on current artifact checks.")

    methodological_concerns = build_methodological_concerns(thesis_audit, section_structure)
    novelty_concerns = build_novelty_concerns(full_paper, section_structure)
    citation_concerns = build_citation_concerns(citation_map)
    writing_quality_concerns = build_writing_quality_concerns(full_paper, generated_sections)
    revision_suggestions = build_revision_suggestions(
        major_issues,
        minor_issues,
        methodological_concerns,
        novelty_concerns,
        citation_concerns,
        writing_quality_concerns,
    )

    return normalize_report(
        project_id,
        paper_id,
        {
            "overall_recommendation": overall_recommendation,
            "acceptance_probability": acceptance_probability,
            "major_issues": major_issues,
            "minor_issues": minor_issues,
            "methodological_concerns": methodological_concerns,
            "novelty_concerns": novelty_concerns,
            "citation_concerns": citation_concerns,
            "writing_quality_concerns": writing_quality_concerns,
            "revision_suggestions": revision_suggestions,
            "reviewer_personas": build_reviewer_personas(
                overall_recommendation,
                methodological_concerns,
                novelty_concerns,
                citation_concerns,
                writing_quality_concerns,
            ),
        },
    )


def build_markdown(report: dict[str, Any]) -> str:
    lines = [
        f"# Reviewer Simulator Report: {report.get('paper_id', '')}",
        "",
        f"Overall recommendation: {report.get('overall_recommendation', '')}",
        f"Acceptance probability: {report.get('acceptance_probability', 0)}%",
        f"Review mode: {report.get('review_mode', 'heuristic')}",
        "",
        "## Major Issues",
        *bullet_lines(report.get("major_issues", [])),
        "",
        "## Minor Issues",
        *bullet_lines(report.get("minor_issues", [])),
        "",
        "## Reviewer Personas",
    ]
    for persona in report.get("reviewer_personas", []):
        lines.extend(
            [
                "",
                f"### {persona.get('name', 'Reviewer')}",
                f"Decision tendency: {persona.get('decision_tendency', '')}",
                f"Major comments: {persona.get('major_comments', '')}",
                f"Minor comments: {persona.get('minor_comments', '')}",
                f"Recommendation: {persona.get('recommendation', '')}",
            ]
        )
    lines.extend(["", "## Revision Suggestions", *bullet_lines([
        f"{item.get('priority', 'Medium')}: {item.get('suggestion', '')} ({item.get('target_section', 'Paper')})"
        for item in report.get("revision_suggestions", [])
        if isinstance(item, dict)
    ])])
    return "\n".join(lines).strip() + "\n"


def normalize_report(project_id: str, paper_id: str, report: dict[str, Any]) -> dict[str, Any]:
    personas = report.get("reviewer_personas", [])
    normalized_personas = []
    for persona in list_items(personas):
        normalized_personas.append(
            {
                "name": str(persona.get("name") or persona.get("reviewer") or "Reviewer"),
                "decision_tendency": str(persona.get("decision_tendency", "Review required")),
                "major_comments": str(persona.get("major_comments", "Major comments require reviewer review.")),
                "minor_comments": str(persona.get("minor_comments", "Minor comments require reviewer review.")),
                "recommendation": str(persona.get("recommendation", "Revise before submission.")),
            }
        )
    if len(normalized_personas) < 3:
        normalized_personas = build_reviewer_personas(
            str(report.get("overall_recommendation", "Revise before submission")),
            list_strings(report.get("methodological_concerns", [])),
            list_strings(report.get("novelty_concerns", [])),
            list_strings(report.get("citation_concerns", [])),
            list_strings(report.get("writing_quality_concerns", [])),
        )

    return {
        "project_id": project_id,
        "paper_id": paper_id,
        "overall_recommendation": str(report.get("overall_recommendation", "Revise before submission")),
        "acceptance_probability": int(report.get("acceptance_probability", 70) or 70),
        "major_issues": list_strings(report.get("major_issues", [])),
        "minor_issues": list_strings(report.get("minor_issues", [])),
        "methodological_concerns": list_strings(report.get("methodological_concerns", [])),
        "novelty_concerns": list_strings(report.get("novelty_concerns", [])),
        "citation_concerns": list_strings(report.get("citation_concerns", [])),
        "writing_quality_concerns": list_strings(report.get("writing_quality_concerns", [])),
        "revision_suggestions": normalize_suggestions(report.get("revision_suggestions", [])),
        "reviewer_personas": normalized_personas[:3],
    }


def build_methodological_concerns(
    thesis_audit: dict[str, Any] | None,
    section_structure: dict[str, Any] | None,
) -> list[str]:
    concerns = []
    methodology_score = int((thesis_audit or {}).get("methodology_consistency_score", 82) or 82)
    if methodology_score < 80:
        concerns.append("Methodology consistency score suggests the design-to-findings chain needs clarification.")
    if not section_structure:
        concerns.append("Section structure has not been generated, limiting review of methodological flow.")
    if not concerns:
        concerns.append("Methodological flow is acceptable, but transitions between method, findings, and contribution should remain explicit.")
    return concerns


def build_novelty_concerns(
    full_paper: dict[str, Any] | None,
    section_structure: dict[str, Any] | None,
) -> list[str]:
    text = str((full_paper or {}).get("integrated_text", ""))
    if not text:
        return ["Full paper is not integrated yet, so novelty positioning cannot be fully reviewed."]
    novelty_terms = ["novelty", "contribution", "framework", "workflow", "validated"]
    matches = sum(1 for term in novelty_terms if term.lower() in text.lower())
    if matches < 3:
        return ["Novelty contribution should be stated more explicitly in abstract, introduction, and discussion."]
    if section_structure and "development" in str(section_structure.get("paper_title", "")).lower():
        return ["Novelty is visible, but reviewer-facing contribution wording should stay tied to development-validation logic."]
    return ["Novelty positioning is present; ensure it does not become repetitive across Discussion and Conclusion."]


def build_citation_concerns(citation_map: dict[str, Any] | None) -> list[str]:
    if not citation_map:
        return ["Citation map has not been generated; citation integrity cannot be fully verified."]
    unmatched = int(citation_map.get("unmatched_citations", 0) or 0)
    duplicates = int(citation_map.get("duplicate_citations", 0) or 0)
    concerns = []
    if unmatched:
        concerns.append(f"{unmatched} citation(s) remain unmatched against available source metadata.")
    if duplicates:
        concerns.append(f"{duplicates} duplicate citation instance(s) should be checked for APA consistency.")
    if not concerns:
        concerns.append("Citation integrity appears acceptable from the current citation map.")
    return concerns


def build_writing_quality_concerns(
    full_paper: dict[str, Any] | None,
    generated_sections: list[dict[str, Any]],
) -> list[str]:
    concerns = []
    word_count = int((full_paper or {}).get("total_word_count", 0) or 0)
    if word_count == 0:
        concerns.append("Full paper text is unavailable; writing quality review is based on generated section metadata only.")
    elif word_count < 2500:
        concerns.append("Integrated paper may be underdeveloped for full conference submission length.")
    locked_count = sum(1 for section in generated_sections if section.get("status") == "locked")
    if generated_sections and locked_count < len(generated_sections):
        concerns.append("Some drafted sections remain unlocked and may need author approval.")
    if not concerns:
        concerns.append("Writing quality risk is low; final proofreading and transition polishing are still recommended.")
    return concerns


def build_revision_suggestions(*groups: list[str]) -> list[dict[str, str]]:
    suggestions = []
    for concern in [item for group in groups for item in group]:
        priority = "High" if "high" in concern.lower() or "missing" in concern.lower() else "Medium"
        target = infer_target_section(concern)
        suggestions.append(
            {
                "priority": priority,
                "suggestion": concern,
                "target_section": target,
            }
        )
    return suggestions[:8]


def build_reviewer_personas(
    overall_recommendation: str,
    methodological_concerns: list[str],
    novelty_concerns: list[str],
    citation_concerns: list[str],
    writing_quality_concerns: list[str],
) -> list[dict[str, str]]:
    return [
        {
            "name": "Methodology Reviewer",
            "decision_tendency": overall_recommendation,
            "major_comments": first_or_default(methodological_concerns, "Methodological chain is generally coherent."),
            "minor_comments": first_or_default(writing_quality_concerns, "Improve transitions and section polish."),
            "recommendation": "Clarify methodological contribution and ensure development-validation flow is traceable.",
        },
        {
            "name": "Content Reviewer",
            "decision_tendency": overall_recommendation,
            "major_comments": first_or_default(novelty_concerns, "Novelty contribution is acceptable but can be sharper."),
            "minor_comments": first_or_default(citation_concerns, "Verify citation-to-reference consistency."),
            "recommendation": "Strengthen contribution wording while keeping claims evidence-bound.",
        },
        {
            "name": "Journal Scope Reviewer",
            "decision_tendency": overall_recommendation,
            "major_comments": "Paper scope should remain aligned with the selected journal or conference template.",
            "minor_comments": first_or_default(writing_quality_concerns, "Final formatting and heading consistency should be checked."),
            "recommendation": "Proceed after scope, formatting, and reference checks are complete.",
        },
    ]


def summarize_full_paper(full_paper: dict[str, Any] | None) -> dict[str, Any]:
    if not full_paper:
        return {}
    text = str(full_paper.get("integrated_text", ""))
    return {
        "title": full_paper.get("title"),
        "status": full_paper.get("status"),
        "total_word_count": full_paper.get("total_word_count"),
        "missing_sections": full_paper.get("missing_sections", []),
        "preview": text[:5000],
    }


def summarize_citations(citation_map: dict[str, Any] | None) -> dict[str, Any]:
    if not citation_map:
        return {}
    return {
        "total_citations": citation_map.get("total_citations"),
        "matched_citations": citation_map.get("matched_citations"),
        "unmatched_citations": citation_map.get("unmatched_citations"),
        "duplicate_citations": citation_map.get("duplicate_citations"),
        "sample": list_items(citation_map.get("citations", []))[:20],
    }


def summarize_objectives(objective_map: dict[str, Any] | None) -> dict[str, Any]:
    if not objective_map:
        return {}
    return {
        "total_objectives": objective_map.get("total_objectives"),
        "mapped_objectives": objective_map.get("mapped_objectives"),
        "unmapped_objectives": objective_map.get("unmapped_objectives"),
        "sample": list_items(objective_map.get("objectives", []))[:10],
    }


def summarize_section_structure(section_structure: dict[str, Any] | None) -> dict[str, Any]:
    if not section_structure:
        return {}
    return {
        "paper_title": section_structure.get("paper_title"),
        "status": section_structure.get("status"),
        "sections": [
            {
                "section_name": section.get("section_name"),
                "purpose": section.get("purpose"),
                "readiness_status": section.get("readiness_status"),
            }
            for section in list_items(section_structure.get("sections", []))[:12]
        ],
    }


def summarize_generated_sections(generated_sections: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "section_name": section.get("section_name"),
            "status": section.get("status"),
            "word_count": section.get("word_count"),
            "audit_warnings": section.get("audit_warnings", []),
            "preview": str(section.get("generated_text", ""))[:1200],
        }
        for section in generated_sections[:12]
    ]


def parse_json_object(content: str) -> dict[str, Any] | None:
    try:
        parsed = json.loads(content)
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", content, re.DOTALL)
        if not match:
            return None
        try:
            parsed = json.loads(match.group(0))
            return parsed if isinstance(parsed, dict) else None
        except json.JSONDecodeError:
            return None


def recommendation_from_probability(probability: int) -> str:
    if probability >= 80:
        return "Accept with minor revisions"
    if probability >= 65:
        return "Revise before submission"
    return "Major revision required"


def infer_target_section(concern: str) -> str:
    lowered = concern.lower()
    if "citation" in lowered or "reference" in lowered:
        return "References"
    if "method" in lowered or "design" in lowered:
        return "Methodology"
    if "objective" in lowered or "finding" in lowered:
        return "Findings"
    if "novelty" in lowered or "contribution" in lowered:
        return "Discussion"
    if "missing" in lowered:
        return "Section Writer"
    return "Full Paper"


def normalize_suggestions(value: Any) -> list[dict[str, str]]:
    suggestions = []
    for item in list_items(value):
        if isinstance(item, dict):
            suggestions.append(
                {
                    "priority": str(item.get("priority", "Medium")),
                    "suggestion": str(item.get("suggestion") or item.get("revision") or item.get("comment") or "Review required."),
                    "target_section": str(item.get("target_section") or item.get("section") or "Full Paper"),
                }
            )
        else:
            suggestions.append(
                {
                    "priority": "Medium",
                    "suggestion": str(item),
                    "target_section": infer_target_section(str(item)),
                }
            )
    return suggestions[:8]


def list_strings(value: Any) -> list[str]:
    items = value if isinstance(value, list) else [value] if value else []
    return [str(item) for item in items if str(item).strip()]


def list_items(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def bullet_lines(items: Any) -> list[str]:
    values = list_strings(items)
    return [f"- {item}" for item in values] if values else ["- No issue detected."]


def first_or_default(items: list[str], default: str) -> str:
    return items[0] if items else default
