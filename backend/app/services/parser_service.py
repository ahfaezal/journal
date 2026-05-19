import re
from pathlib import Path
from typing import Any

from docx import Document


CHAPTER_PATTERN = re.compile(r"\b(?:BAB|CHAPTER)\s+([1-5IVX]+)\b", re.IGNORECASE)
CITATION_PATTERN = re.compile(
    r"\(([A-Z][A-Za-zÀ-ÿ'`\-]+(?:\s+et\s+al\.)?(?:\s*&\s*[A-Z][A-Za-zÀ-ÿ'`\-]+)?),\s*(\d{4}[a-z]?)\)"
)
TABLE_CAPTION_PATTERN = re.compile(r"^\s*(?:Jadual|Table)\s+\d+(?:\.\d+)*\b.*", re.IGNORECASE)
OBJECTIVE_PATTERN = re.compile(
    r"\b(?:objektif|objective|research objective|RO)\s*(?:kajian|research)?\s*\d*[:.)-]?\s*(.+)",
    re.IGNORECASE,
)
REFERENCE_HEADING_PATTERN = re.compile(r"^\s*(?:references|rujukan|bibliografi|bibliography)\s*$", re.IGNORECASE)


def parse_uploaded_documents(upload_dir: Path) -> dict[str, Any]:
    parsed_documents: list[dict[str, Any]] = []
    aggregate = {
        "chapters": [],
        "headings": [],
        "paragraphs": [],
        "tables": [],
        "citations": [],
        "references": [],
        "objectives": [],
        "table_captions": [],
    }

    for file_path in sorted(upload_dir.iterdir()):
        if not file_path.is_file() or file_path.name.startswith("."):
            continue

        suffix = file_path.suffix.lower()
        if suffix == ".docx":
            document_result = parse_docx(file_path)
        elif suffix == ".pdf":
            document_result = parse_pdf_placeholder(file_path)
        else:
            continue

        parsed_documents.append(document_result)
        for key in aggregate:
            aggregate[key].extend(document_result.get(key, []))

    return {
        "project_files_parsed": len(parsed_documents),
        "documents": parsed_documents,
        **{key: deduplicate_items(value) for key, value in aggregate.items()},
    }


def parse_docx(file_path: Path) -> dict[str, Any]:
    document = Document(file_path)
    headings: list[dict[str, Any]] = []
    paragraphs: list[dict[str, Any]] = []
    chapters: list[dict[str, Any]] = []
    citations: list[dict[str, Any]] = []
    references: list[dict[str, Any]] = []
    objectives: list[dict[str, Any]] = []
    table_captions: list[dict[str, Any]] = []

    in_references = False

    for index, paragraph in enumerate(document.paragraphs, start=1):
        text = normalize_text(paragraph.text)
        if not text:
            continue

        style_name = paragraph.style.name if paragraph.style else ""
        is_heading = style_name.lower().startswith("heading")
        if is_heading:
            headings.append(
                {
                    "source_file": file_path.name,
                    "text": text,
                    "style": style_name,
                    "position": index,
                }
            )

        chapter_match = CHAPTER_PATTERN.search(text)
        if chapter_match:
            chapters.append(
                {
                    "source_file": file_path.name,
                    "label": chapter_match.group(0),
                    "text": text,
                    "position": index,
                }
            )

        if REFERENCE_HEADING_PATTERN.match(text):
            in_references = True
            continue

        if in_references:
            references.append(
                {
                    "source_file": file_path.name,
                    "text": text,
                    "position": index,
                }
            )
            continue

        if TABLE_CAPTION_PATTERN.match(text):
            table_captions.append(
                {
                    "source_file": file_path.name,
                    "caption": text,
                    "position": index,
                }
            )

        objective_match = OBJECTIVE_PATTERN.search(text)
        if objective_match:
            objectives.append(
                {
                    "source_file": file_path.name,
                    "text": text,
                    "detected_objective": objective_match.group(1).strip(),
                    "position": index,
                }
            )

        paragraphs.append(
            {
                "source_file": file_path.name,
                "text": text,
                "style": style_name,
                "position": index,
            }
        )
        citations.extend(extract_citations(text, file_path.name, index))

    tables = extract_docx_tables(document, file_path.name)

    return {
        "source_file": file_path.name,
        "file_type": "docx",
        "chapters": chapters,
        "headings": headings,
        "paragraphs": paragraphs,
        "tables": tables,
        "citations": deduplicate_items(citations),
        "references": references,
        "objectives": objectives,
        "table_captions": table_captions,
    }


def parse_pdf_placeholder(file_path: Path) -> dict[str, Any]:
    page_count: int | None = None
    try:
        from PyPDF2 import PdfReader

        reader = PdfReader(str(file_path))
        page_count = len(reader.pages)
    except Exception:
        page_count = None

    return {
        "source_file": file_path.name,
        "file_type": "pdf",
        "parser_status": "placeholder",
        "message": "PDF parsing is registered as a placeholder for now.",
        "page_count": page_count,
        "chapters": [],
        "headings": [],
        "paragraphs": [],
        "tables": [],
        "citations": [],
        "references": [],
        "objectives": [],
        "table_captions": [],
    }


def extract_docx_tables(document: Document, source_file: str) -> list[dict[str, Any]]:
    tables = []
    for index, table in enumerate(document.tables, start=1):
        rows = []
        for row in table.rows:
            rows.append([normalize_text(cell.text) for cell in row.cells])

        tables.append(
            {
                "source_file": source_file,
                "table_index": index,
                "row_count": len(rows),
                "column_count": max((len(row) for row in rows), default=0),
                "rows": rows,
            }
        )

    return tables


def extract_citations(text: str, source_file: str, position: int) -> list[dict[str, Any]]:
    citations = []
    for match in CITATION_PATTERN.finditer(text):
        citations.append(
            {
                "source_file": source_file,
                "citation": match.group(0),
                "author": match.group(1),
                "year": match.group(2),
                "position": position,
            }
        )

    return citations


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def deduplicate_items(items: list[Any]) -> list[Any]:
    seen = set()
    deduplicated = []
    for item in items:
        marker = repr(item)
        if marker in seen:
            continue

        seen.add(marker)
        deduplicated.append(item)

    return deduplicated
