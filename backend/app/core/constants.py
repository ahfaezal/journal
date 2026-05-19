from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[3]
STORAGE_ROOT = PROJECT_ROOT / "storage"
GENERATED_OUTPUT_ROOT = STORAGE_ROOT / "generated_outputs"
FORMATTED_OUTPUT_ROOT = STORAGE_ROOT / "formatted_outputs"
UPLOAD_ROOT = STORAGE_ROOT / "uploads"
LOG_ROOT = STORAGE_ROOT / "logs"

API_VERSION = "v1"
ARTIFACT_VERSION = "v1"

STANDARD_SECTIONS = [
    "Abstract",
    "Introduction",
    "Problem Statement",
    "Literature Review",
    "Methodology",
    "Findings",
    "Discussion",
    "Conclusion",
]

DEFAULT_PAPER_ID = "PAPER_1"
DEFAULT_TEMPLATE = "ICC2026"
