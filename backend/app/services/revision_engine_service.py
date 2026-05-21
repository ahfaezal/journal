import json
import re
from datetime import UTC, datetime
from typing import Any

from app.core.config import settings
from app.services.ai.openai_client import get_ai_logger, safe_chat_completion

REVISION_VERSION = "revision_engine_v1"


def build_revision_report(
    project_id: str,
    paper_id: str,
    reviewer_report: dict[str, Any] | None,
    generated_sections: list[dict[str, Any]],
    full_paper: dict[str, Any] | None,
    thesis_audit: dict[str, Any] | None,
) -> dict[str, Any]:
    ai_configured = bool(settings.openai_api_key)
    logger = get_ai_logger()
    logger.info(
        "Revision AI config check project_id=%s paper_id=%s openai_key_configured=%s model=%s",
        project_id,
        paper_id,
        ai_configured,
        settings.openai_model,
    )
    ai_report = None

    if ai_configured:
        logger.info(
            "Revision AI mode enabled project_id=%s paper_id=%s model=%s",
            project_id,
            paper_id,
            settings.openai_model,
        )
        try:
            ai_report = generate_ai_revision_report(
                project_id=project_id,
                paper_id=paper_id,
                reviewer_report=reviewer_report,
                generated_sections=generated_sections,
                full_paper=full_paper,
                thesis_audit=thesis_audit,
            )
        except Exception as error:  # noqa: BLE001 - revision must fail closed
            logger.exception(
                "Revision OpenAI generation failed; using heuristic fallback project_id=%s paper_id=%s error=%s",
                project_id,
                paper_id,
                error,
            )

    report = ai_report or generate_heuristic_revision_report(
        project_id=project_id,
        paper_id=paper_id,
        reviewer_report=reviewer_report,
        generated_sections=generated_sections,
        full_paper=full_paper,
        thesis_audit=thesis_audit,
    )
    report["ai_enabled"] = ai_configured and ai_report is not None
    report["ai_model"] = settings.openai_model if ai_configured else ""
    report["revision_mode"] = "ai_assisted" if ai_configured and ai_report else "heuristic"
    report["revision_version"] = REVISION_VERSION
    report["generated_at"] = datetime.now(UTC).isoformat()
    return report


def generate_ai_revision_report(
    project_id: str,
    paper_id: str,
    reviewer_report: dict[str, Any] | None,
    generated_sections: list[dict[str, Any]],
    full_paper: dict[str, Any] | None,
    thesis_audit: dict[str, Any] | None,
) -> dict[str, Any] | None:
    context = {
        "project_id": project_id,
        "paper_id": paper_id,
        "reviewer_report": reviewer_report or {},
        "generated_sections": summarize_sections(generated_sections),
        "full_paper_summary": summarize_full_paper(full_paper),
        "thesis_audit": thesis_audit or {},
    }
    messages = [
        {
            "role": "system",
            "content": (
                "You are Thesis2Journal AI Revision Engine. "
                "Generate targeted academic revision suggestions only from supplied reviewer, section, full paper, and audit context. "
                "Do not invent evidence, citations, references, findings, tables, or outcomes. "
                "Return strict JSON only. Preserve anti-overclaim discipline and paper scope."
            ),
        },
        {
            "role": "user",
            "content": (
                "Generate a revision report with exactly these keys: project_id, paper_id, revisions. "
                "revisions must be an array of objects with: revision_id, linked_issue, affected_section, "
                "revision_rationale, suggested_revision, improved_paragraph, before_text, after_text, "
                "comparison_summary, priority, apply_status. Keep each improved paragraph concise and academic.\n\n"
                f"Context JSON:\n{json.dumps(context, ensure_ascii=False, default=str)}"
            ),
        },
    ]
    content = safe_chat_completion(
        messages,
        temperature=0.15,
        response_format={"type": "json_object"},
    )
    if not content:
        raise RuntimeError("Revision OpenAI generation returned empty content.")

    parsed = parse_json_object(content)
    if not parsed:
        get_ai_logger().error(
            "Revision OpenAI JSON parse failed project_id=%s paper_id=%s content_preview=%s",
            project_id,
            paper_id,
            content[:1000],
        )
        raise ValueError("Revision OpenAI generation did not return valid JSON.")

    return normalize_report(project_id, paper_id, parsed)


def generate_heuristic_revision_report(
    project_id: str,
    paper_id: str,
    reviewer_report: dict[str, Any] | None,
    generated_sections: list[dict[str, Any]],
    full_paper: dict[str, Any] | None,
    thesis_audit: dict[str, Any] | None,
) -> dict[str, Any]:
    issues = collect_revision_issues(reviewer_report, thesis_audit)
    revisions = []
    for index, issue in enumerate(issues[:8], start=1):
        affected_section = infer_target_section(issue)
        before_text = find_section_preview(affected_section, generated_sections, full_paper)
        improved = build_improved_paragraph(issue, affected_section, before_text)
        revisions.append(
            {
                "revision_id": f"REV-{index:03d}",
                "linked_issue": issue,
                "affected_section": affected_section,
                "revision_rationale": build_rationale(issue, affected_section),
                "suggested_revision": build_suggested_revision(issue, affected_section),
                "improved_paragraph": improved,
                "before_text": before_text,
                "after_text": improved,
                "comparison_summary": "The revised version makes the issue more explicit, narrows unsupported wording, and links the claim to the paper scope.",
                "priority": "High" if high_priority_issue(issue) else "Medium",
                "apply_status": "pending",
            }
        )

    if not revisions:
        revisions.append(
            {
                "revision_id": "REV-001",
                "linked_issue": "No reviewer issue detected from available artifacts.",
                "affected_section": "Full Paper",
                "revision_rationale": "The paper still benefits from final continuity polishing before submission.",
                "suggested_revision": "Review transitions between sections and ensure all claims remain tied to generated thesis evidence.",
                "improved_paragraph": "The paper should maintain a traceable argument from research problem, methodological process, findings, and contribution. Final revision should therefore focus on continuity, citation integrity, and careful limitation of claims.",
                "before_text": "No specific paragraph selected.",
                "after_text": "The paper should maintain a traceable argument from research problem, methodological process, findings, and contribution. Final revision should therefore focus on continuity, citation integrity, and careful limitation of claims.",
                "comparison_summary": "A general continuity paragraph is proposed because no specific reviewer issue was available.",
                "priority": "Low",
                "apply_status": "pending",
            }
        )

    return normalize_report(project_id, paper_id, {"revisions": revisions})


def build_markdown(report: dict[str, Any]) -> str:
    lines = [
        f"# Revision Report: {report.get('paper_id', '')}",
        "",
        f"Revision mode: {report.get('revision_mode', 'heuristic')}",
        f"AI enabled: {report.get('ai_enabled', False)}",
        "",
    ]
    for revision in report.get("revisions", []):
        lines.extend(
            [
                f"## {revision.get('revision_id', 'REV')}: {revision.get('affected_section', 'Full Paper')}",
                "",
                f"Linked issue: {revision.get('linked_issue', '')}",
                f"Rationale: {revision.get('revision_rationale', '')}",
                f"Suggested revision: {revision.get('suggested_revision', '')}",
                "",
                "Before:",
                revision.get("before_text", ""),
                "",
                "After:",
                revision.get("after_text", ""),
                "",
            ]
        )
    return "\n".join(lines).strip() + "\n"


def normalize_report(project_id: str, paper_id: str, report: dict[str, Any]) -> dict[str, Any]:
    revisions = []
    for index, revision in enumerate(list_items(report.get("revisions", [])), start=1):
        revisions.append(
            {
                "revision_id": str(revision.get("revision_id") or f"REV-{index:03d}"),
                "linked_issue": str(revision.get("linked_issue", "Reviewer issue requires revision.")),
                "affected_section": str(revision.get("affected_section", "Full Paper")),
                "revision_rationale": str(revision.get("revision_rationale", "Revision is needed to address reviewer concern.")),
                "suggested_revision": str(revision.get("suggested_revision", "Revise the affected section for clarity and evidence alignment.")),
                "improved_paragraph": str(revision.get("improved_paragraph", "")),
                "before_text": str(revision.get("before_text", "")),
                "after_text": str(revision.get("after_text") or revision.get("improved_paragraph", "")),
                "comparison_summary": str(revision.get("comparison_summary", "Before/after comparison requires author review.")),
                "priority": str(revision.get("priority", "Medium")),
                "apply_status": str(revision.get("apply_status", "pending")),
            }
        )

    return {
        "project_id": project_id,
        "paper_id": paper_id,
        "revisions": revisions,
        "total_revisions": len(revisions),
    }


def collect_revision_issues(
    reviewer_report: dict[str, Any] | None,
    thesis_audit: dict[str, Any] | None,
) -> list[str]:
    issues = []
    if reviewer_report:
        for key in [
            "major_issues",
            "methodological_concerns",
            "novelty_concerns",
            "citation_concerns",
            "writing_quality_concerns",
            "minor_issues",
        ]:
            issues.extend(str(item) for item in list_items(reviewer_report.get(key, [])) if item)
        for suggestion in list_items(reviewer_report.get("revision_suggestions", [])):
            if isinstance(suggestion, dict):
                issues.append(str(suggestion.get("suggestion", "")))

    if thesis_audit:
        for issue in list_items(thesis_audit.get("issues", [])):
            if isinstance(issue, dict):
                description = issue.get("description") or issue.get("suggested_fix")
                if description:
                    issues.append(str(description))

    return list(dict.fromkeys(issue for issue in issues if issue.strip()))


def find_section_preview(
    section_name: str,
    generated_sections: list[dict[str, Any]],
    full_paper: dict[str, Any] | None,
) -> str:
    normalized = normalize_name(section_name)
    for section in generated_sections:
        if normalize_name(section.get("section_name", "")) == normalized:
            text = str(section.get("generated_text", "")).strip()
            return text[:650] if text else "No generated paragraph available for this section."

    text = str((full_paper or {}).get("integrated_text", "")).strip()
    return text[:650] if text else "No existing paragraph available."


def build_improved_paragraph(issue: str, section_name: str, before_text: str) -> str:
    return (
        f"In the {section_name} section, the argument should address the reviewer concern by making the paper scope, evidence base, and contribution more explicit. "
        f"The revision should respond to the issue that {issue.lower()} "
        "while avoiding unsupported claims and preserving alignment with the thesis-derived evidence."
    )


def build_rationale(issue: str, section_name: str) -> str:
    return (
        f"This revision targets {section_name} because the reviewer concern affects how readers evaluate the paper's clarity, evidence alignment, or contribution. "
        f"The issue to resolve is: {issue}"
    )


def build_suggested_revision(issue: str, section_name: str) -> str:
    return (
        f"Revise the {section_name} section by naming the issue directly, linking the statement to available thesis evidence, "
        "and removing wording that implies unverified effectiveness or unsupported impact."
    )


def summarize_sections(generated_sections: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "section_name": section.get("section_name"),
            "status": section.get("status"),
            "word_count": section.get("word_count"),
            "preview": str(section.get("generated_text", ""))[:1200],
        }
        for section in generated_sections[:12]
    ]


def summarize_full_paper(full_paper: dict[str, Any] | None) -> dict[str, Any]:
    if not full_paper:
        return {}
    return {
        "title": full_paper.get("title"),
        "status": full_paper.get("status"),
        "total_word_count": full_paper.get("total_word_count"),
        "missing_sections": full_paper.get("missing_sections", []),
        "preview": str(full_paper.get("integrated_text", ""))[:5000],
    }


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


def infer_target_section(issue: str) -> str:
    lowered = issue.lower()
    if "citation" in lowered or "reference" in lowered:
        return "References"
    if "method" in lowered or "ddr" in lowered or "design" in lowered:
        return "Methodology"
    if "objective" in lowered or "finding" in lowered:
        return "Findings"
    if "novelty" in lowered or "contribution" in lowered:
        return "Discussion"
    if "abstract" in lowered:
        return "Abstract"
    if "introduction" in lowered:
        return "Introduction"
    if "conclusion" in lowered:
        return "Conclusion"
    return "Full Paper"


def high_priority_issue(issue: str) -> bool:
    lowered = issue.lower()
    return any(token in lowered for token in ["high", "missing", "unmatched", "unsupported", "objective", "methodology"])


def normalize_name(value: Any) -> str:
    return str(value).strip().lower().replace("_", " ")


def list_items(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []
