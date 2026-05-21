import json
import logging
from pathlib import Path
from typing import Any

from app.core.config import settings
from app.core.constants import LOG_ROOT
from app.utils.file_utils import ensure_dir

PROMPT_VERSION = "section_writer_openai_v1"
AI_LOG_PATH = LOG_ROOT / "ai_generation.log"


def get_ai_logger() -> logging.Logger:
    ensure_dir(LOG_ROOT)
    logger = logging.getLogger("thesis2journal.ai_generation")
    logger.setLevel(logging.INFO)
    if not any(
        isinstance(handler, logging.FileHandler) and Path(handler.baseFilename) == AI_LOG_PATH
        for handler in logger.handlers
    ):
        handler = logging.FileHandler(AI_LOG_PATH, encoding="utf-8")
        handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
        logger.addHandler(handler)
    return logger


def safe_chat_completion(
    messages: list[dict[str, str]],
    model: str | None = None,
    temperature: float = 0.2,
) -> str | None:
    logger = get_ai_logger()
    if not settings.openai_api_key:
        logger.info("OpenAI generation skipped: OPENAI_API_KEY is not configured.")
        return None

    try:
        from openai import OpenAI

        client = OpenAI(api_key=settings.openai_api_key, max_retries=0, timeout=15.0)
        response = client.chat.completions.create(
            model=model or settings.openai_model,
            messages=messages,
            temperature=temperature,
        )
        content = response.choices[0].message.content if response.choices else None
        if not content:
            logger.warning("OpenAI generation returned empty content.")
            return None
        logger.info("OpenAI generation completed with model=%s", model or settings.openai_model)
        return content.strip()
    except Exception as error:  # noqa: BLE001 - AI must fail closed to heuristic mode
        logger.exception("OpenAI generation failed: %s", error)
        return None


def generate_section_draft(
    paper_id: str,
    section_name: str,
    section: dict[str, Any],
    section_structure: dict[str, Any] | None,
    paper_extraction: dict[str, Any] | None,
    citation_map: dict[str, Any] | None,
    objective_map: dict[str, Any] | None,
    table_map: dict[str, Any] | None,
    thesis_audit: dict[str, Any] | None,
    citations_used: list[str],
    tables_used: list[str],
    audit_warnings: list[str],
    source_context_used: list[str],
) -> str | None:
    context_payload = {
        "paper_id": paper_id,
        "section_name": section_name,
        "section": section,
        "section_structure_summary": summarize_structure(section_structure),
        "paper_extraction": paper_extraction or {},
        "citation_map": limit_list((citation_map or {}).get("citations", []), 20),
        "objective_map": limit_list((objective_map or {}).get("objectives", []), 12),
        "table_map": limit_list((table_map or {}).get("tables", []), 12),
        "thesis_audit_issues": limit_list((thesis_audit or {}).get("issues", []), 12),
        "allowed_citations": citations_used,
        "allowed_tables": tables_used,
        "audit_warnings": audit_warnings,
        "source_context_used": source_context_used,
    }

    messages = [
        {
            "role": "system",
            "content": (
                "You are an academic writing assistant for Thesis2Journal AI. "
                "Write only from the supplied thesis-derived context. "
                "Do not invent references, citations, findings, tables, data, or claims. "
                "Use only the provided citations when citations are needed. "
                "Preserve objective alignment and methodology consistency. "
                "Avoid unsupported claims, effectiveness claims, field-test claims, "
                "implementation impact claims, and generic AI phrasing. "
                "If evidence is insufficient, write cautiously and signal review needs inside the prose."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Draft the {section_name} section for {paper_id}. "
                "Use an academic, methodological, conference-friendly tone. "
                "Return only the section prose, without markdown tables and without a reference list.\n\n"
                f"Controlled context JSON:\n{json.dumps(context_payload, ensure_ascii=False, default=str)}"
            ),
        },
    ]
    return safe_chat_completion(messages)


def summarize_structure(section_structure: dict[str, Any] | None) -> dict[str, Any]:
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
            for section in limit_list(section_structure.get("sections", []), 12)
            if isinstance(section, dict)
        ],
    }


def limit_list(value: Any, limit: int) -> list[Any]:
    return value[:limit] if isinstance(value, list) else []
