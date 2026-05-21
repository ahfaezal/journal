import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fastapi import HTTPException

from app.core.config import settings
from app.services.ai.openai_client import get_ai_logger, safe_chat_completion
from app.utils.file_utils import ensure_dir, safe_slug

APPLY_REVISION_VERSION = "apply_revision_v1"


def apply_revision_to_section(
    project_id: str,
    paper_id: str,
    revision_id: str,
    revision_report: dict[str, Any] | None,
    generated_sections: list[dict[str, Any]],
    generated_section_path_builder: Any,
    revision_output_root: Path,
    applied_by: str = "system",
) -> dict[str, Any]:
    if not revision_report:
        raise HTTPException(status_code=404, detail="Revision report has not been generated.")

    revision = find_revision(revision_report, revision_id)
    section = find_target_section(revision, generated_sections)
    if not section:
        raise HTTPException(
            status_code=404,
            detail=f"No generated section found for revision target: {revision.get('affected_section', 'Full Paper')}",
        )

    timestamp = datetime.now(UTC).isoformat()
    section_name = str(section.get("section_name") or revision.get("affected_section") or "Full Paper")
    previous_version = dict(section)
    revised_section = build_revised_section(
        project_id=project_id,
        paper_id=paper_id,
        revision=revision,
        section=section,
        timestamp=timestamp,
    )

    output_dir = ensure_dir(revision_output_root / project_id / "revisions" / paper_id)
    safe_revision_id = safe_slug(revision_id)
    before_path = output_dir / f"{safe_revision_id}_{safe_slug(section_name)}_before.json"
    revised_path = output_dir / f"{safe_revision_id}_{safe_slug(section_name)}_revised.json"
    applied_path = output_dir / f"{safe_revision_id}_applied.json"
    current_section_path = generated_section_path_builder(project_id, paper_id, section_name)

    write_json(before_path, previous_version)
    write_json(revised_path, revised_section)
    write_json(current_section_path, revised_section)

    applied_record = {
        "project_id": project_id,
        "paper_id": paper_id,
        "revision_id": revision_id,
        "linked_reviewer_issue": revision.get("linked_issue", ""),
        "affected_section": section_name,
        "before_version": previous_version.get("version", "v1"),
        "revised_version": revised_section.get("version", "v2"),
        "before_path": str(before_path),
        "revised_path": str(revised_path),
        "current_section_path": str(current_section_path),
        "revision_timestamp": timestamp,
        "applied_by": applied_by,
        "ai_enabled": revised_section.get("ai_enabled", False),
        "ai_model": revised_section.get("ai_model", ""),
        "apply_mode": revised_section.get("revision_apply_mode", "heuristic"),
        "status": "applied",
        "version": APPLY_REVISION_VERSION,
    }
    write_json(applied_path, applied_record)
    mark_revision_applied(revision_report, revision_id, timestamp)
    return {
        "applied_revision": applied_record,
        "revised_section": revised_section,
    }


def build_revised_section(
    project_id: str,
    paper_id: str,
    revision: dict[str, Any],
    section: dict[str, Any],
    timestamp: str,
) -> dict[str, Any]:
    ai_configured = bool(settings.openai_api_key)
    previous_text = str(section.get("generated_text", ""))
    revised_text = ""
    mode = "heuristic"

    if ai_configured:
        get_ai_logger().info(
            "Apply Revision AI mode enabled project_id=%s paper_id=%s revision_id=%s model=%s",
            project_id,
            paper_id,
            revision.get("revision_id"),
            settings.openai_model,
        )
        try:
            revised_text = generate_ai_revised_section(paper_id, revision, section)
            mode = "ai_assisted" if revised_text else "heuristic"
        except Exception as error:  # noqa: BLE001 - apply revision must fail closed
            get_ai_logger().exception(
                "Apply Revision OpenAI generation failed; using heuristic fallback project_id=%s paper_id=%s revision_id=%s error=%s",
                project_id,
                paper_id,
                revision.get("revision_id"),
                error,
            )

    if not revised_text:
        revised_text = generate_heuristic_revised_text(previous_text, revision)

    existing_history = section.get("version_history", [])
    if not isinstance(existing_history, list):
        existing_history = []

    previous_version = str(section.get("version", "v1"))
    next_version = next_revision_version(previous_version)
    revised_section = dict(section)
    revised_section["generated_text"] = revised_text
    revised_section["word_count"] = len(revised_text.split())
    revised_section["status"] = "drafted"
    revised_section["version"] = next_version
    revised_section["generated_at"] = timestamp
    revised_section["updated_at"] = timestamp
    revised_section["revision_applied_at"] = timestamp
    revised_section["revision_id"] = revision.get("revision_id")
    revised_section["linked_reviewer_issue"] = revision.get("linked_issue", "")
    revised_section["ai_enabled"] = ai_configured and mode == "ai_assisted"
    revised_section["ai_model"] = settings.openai_model if ai_configured else section.get("ai_model", "")
    revised_section["revision_apply_mode"] = mode
    revised_section["version_history"] = [
        *existing_history,
        {
            "version": previous_version,
            "status": section.get("status", "drafted"),
            "word_count": section.get("word_count", 0),
            "archived_at": timestamp,
            "revision_id": revision.get("revision_id"),
        },
    ]
    return revised_section


def generate_ai_revised_section(
    paper_id: str,
    revision: dict[str, Any],
    section: dict[str, Any],
) -> str | None:
    messages = [
        {
            "role": "system",
            "content": (
                "You are Thesis2Journal AI Apply Revision Engine. "
                "Revise only the supplied section text using the linked reviewer issue and suggested revision. "
                "Do not invent citations, references, findings, tables, or outcomes. "
                "Preserve academic tone, anti-overclaim discipline, and paper scope. "
                "Return only the full revised section text."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Paper: {paper_id}\n"
                f"Section: {section.get('section_name')}\n"
                f"Reviewer issue: {revision.get('linked_issue')}\n"
                f"Revision rationale: {revision.get('revision_rationale')}\n"
                f"Suggested revision: {revision.get('suggested_revision')}\n"
                f"Improved paragraph: {revision.get('improved_paragraph')}\n\n"
                f"Current section text:\n{section.get('generated_text', '')}"
            ),
        },
    ]
    return safe_chat_completion(messages, temperature=0.15)


def generate_heuristic_revised_text(previous_text: str, revision: dict[str, Any]) -> str:
    improved = str(revision.get("after_text") or revision.get("improved_paragraph") or "").strip()
    if not previous_text.strip():
        return improved or "Revision applied. Author review is required."

    if improved and improved not in previous_text:
        return (
            f"{previous_text.strip()}\n\n"
            f"Revision note ({revision.get('revision_id', 'REV')}): {improved}"
        )

    return previous_text.strip()


def find_revision(revision_report: dict[str, Any], revision_id: str) -> dict[str, Any]:
    for revision in revision_report.get("revisions", []):
        if isinstance(revision, dict) and str(revision.get("revision_id")) == revision_id:
            return revision

    raise HTTPException(status_code=404, detail=f"Revision {revision_id} was not found.")


def find_target_section(
    revision: dict[str, Any],
    generated_sections: list[dict[str, Any]],
) -> dict[str, Any] | None:
    affected = normalize_name(revision.get("affected_section"))
    if affected in {"full paper", "references"} and generated_sections:
        return generated_sections[0]

    for section in generated_sections:
        if normalize_name(section.get("section_name")) == affected:
            return section

    for section in generated_sections:
        if affected in normalize_name(section.get("section_name")) or normalize_name(section.get("section_name")) in affected:
            return section

    return None


def mark_revision_applied(
    revision_report: dict[str, Any],
    revision_id: str,
    timestamp: str,
) -> None:
    for revision in revision_report.get("revisions", []):
        if isinstance(revision, dict) and str(revision.get("revision_id")) == revision_id:
            revision["apply_status"] = "applied"
            revision["applied_at"] = timestamp


def read_applied_revisions(revision_output_root: Path, project_id: str, paper_id: str) -> list[dict[str, Any]]:
    output_dir = revision_output_root / project_id / "revisions" / paper_id
    if not output_dir.exists():
        return []

    applied = []
    for path in sorted(output_dir.glob("*_applied.json")):
        try:
            with path.open("r", encoding="utf-8") as input_file:
                payload = json.load(input_file)
            if isinstance(payload, dict):
                applied.append(payload)
        except json.JSONDecodeError:
            continue
    return applied


def next_revision_version(previous_version: str) -> str:
    if previous_version.startswith("v") and previous_version[1:].isdigit():
        return f"v{int(previous_version[1:]) + 1}"
    return "v2"


def normalize_name(value: Any) -> str:
    return str(value or "").strip().lower().replace("_", " ")


def write_json(path: Path, payload: dict[str, Any]) -> None:
    ensure_dir(path.parent)
    with path.open("w", encoding="utf-8") as output_file:
        json.dump(payload, output_file, indent=2, ensure_ascii=False)
