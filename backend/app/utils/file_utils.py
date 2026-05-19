import json
import logging
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fastapi import HTTPException

from app.core.constants import ARTIFACT_VERSION, LOG_ROOT


def utc_now_iso() -> str:
    return datetime.now(UTC).isoformat()


def ensure_dir(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def safe_slug(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9_-]+", "_", value.strip())
    return slug.strip("_") or "untitled"


def normalize_artifact(
    data: dict[str, Any],
    status: str = "generated",
    version: str = ARTIFACT_VERSION,
) -> dict[str, Any]:
    timestamp = utc_now_iso()
    normalized = dict(data)
    normalized.setdefault("success", True)
    normalized.setdefault("status", status)
    normalized.setdefault("version", version)
    normalized.setdefault("generated_at", timestamp)
    normalized["updated_at"] = timestamp
    return normalized


def safe_write_json(
    path: Path,
    data: dict[str, Any],
    status: str = "generated",
    add_metadata: bool = True,
) -> dict[str, Any]:
    ensure_dir(path.parent)
    payload = normalize_artifact(data, status=status) if add_metadata else data
    with path.open("w", encoding="utf-8") as output_file:
        json.dump(payload, output_file, indent=2, ensure_ascii=False)
    return payload


def safe_read_json(path: Path, missing_message: str | None = None) -> dict[str, Any] | None:
    if not path.exists():
        if missing_message:
            raise HTTPException(status_code=404, detail=missing_message)
        return None

    try:
        with path.open("r", encoding="utf-8") as input_file:
            data = json.load(input_file)
    except json.JSONDecodeError as error:
        raise HTTPException(
            status_code=500,
            detail=f"Malformed JSON artifact: {path.name}",
        ) from error

    return data if isinstance(data, dict) else {"items": data}


def configure_file_logging() -> None:
    ensure_dir(LOG_ROOT)
    logging.basicConfig(
        filename=LOG_ROOT / "app.log",
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
