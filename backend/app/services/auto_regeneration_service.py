from datetime import UTC, datetime
from pathlib import Path
from typing import Any


REGENERATION_VERSION = "auto_regeneration_v1"


def build_auto_regeneration_metadata(
    project_id: str,
    paper_id: str,
    triggered_by_revision: str,
    updated_outputs: list[dict[str, Any]],
    reviewer_report: dict[str, Any] | None,
    submission_status: dict[str, Any] | None,
) -> dict[str, Any]:
    return {
        "project_id": project_id,
        "paper_id": paper_id,
        "regenerated_at": datetime.now(UTC).isoformat(),
        "triggered_by_revision": triggered_by_revision,
        "updated_outputs": updated_outputs,
        "reviewer_readiness_metadata": {
            "overall_recommendation": (reviewer_report or {}).get("overall_recommendation", "Not refreshed"),
            "acceptance_probability": (reviewer_report or {}).get("acceptance_probability", 0),
            "ai_enabled": (reviewer_report or {}).get("ai_enabled", False),
            "review_mode": (reviewer_report or {}).get("review_mode", "not_run"),
        },
        "submission_metadata": {
            "readiness_percentage": (submission_status or {}).get("submission_readiness_percentage", 0),
            "status": (submission_status or {}).get("status", "unknown"),
        },
        "regeneration_version": REGENERATION_VERSION,
        "status": "regenerated",
    }


def output_summary(label: str, path: Path) -> dict[str, Any]:
    return {
        "label": label,
        "path": str(path),
        "exists": path.exists(),
        "size": path.stat().st_size if path.exists() else 0,
    }
