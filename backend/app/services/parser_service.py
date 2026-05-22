import re
from pathlib import Path
from typing import Any

from docx import Document


CHAPTER_PATTERN = re.compile(r"\b(?:BAB|CHAPTER)\s+([1-5IVX]+)\b", re.IGNORECASE)
CITATION_PATTERN = re.compile(
    r"\(([A-Z][A-Za-zÀ-ÿ'`\-]+(?:\s+et\s+al\.)?(?:\s*&\s*[A-Z][A-Za-zÀ-ÿ'`\-]+)?),\s*(\d{4}[a-z]?)\)"
)
NARRATIVE_CITATION_PATTERN = re.compile(
    r"\b([A-Z][A-Za-zÀ-ÿ'`\-]+(?:\s+et\s+al\.)?(?:\s+and\s+[A-Z][A-Za-zÀ-ÿ'`\-]+)?)\s*\((\d{4}[a-z]?)\)"
)
TABLE_CAPTION_PATTERN = re.compile(r"^\s*(?:Jadual|Table)\s+\d+(?:\.\d+)*\b.*", re.IGNORECASE)
OBJECTIVE_PATTERN = re.compile(
    r"\b(?:objektif|objective|research objective|RO)\s*(?:kajian|research)?\s*\d*[:.)-]?\s*(.+)",
    re.IGNORECASE,
)
REFERENCE_HEADING_PATTERN = re.compile(r"^\s*(?:references|rujukan|bibliografi|bibliography)\s*$", re.IGNORECASE)
HEADING_PATTERNS = [
    re.compile(r"^\s*(?:BAB|CHAPTER)\s+[1-5IVX]+\b.*", re.IGNORECASE),
    re.compile(r"^\s*\d+(?:\.\d+){0,4}\s+[A-Z0-9].{2,120}$"),
    re.compile(
        r"^\s*(?:PENGENALAN|INTRODUCTION|LITERATURE REVIEW|SOROTAN LITERATUR|METHODOLOGY|METODOLOGI|DAPATAN|FINDINGS|PERBINCANGAN|DISCUSSION|KESIMPULAN|CONCLUSION)\s*$",
        re.IGNORECASE,
    ),
]


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
            document_result = parse_pdf(file_path)
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


def parse_pdf(file_path: Path) -> dict[str, Any]:
    page_texts: list[dict[str, Any]] = []
    try:
        from PyPDF2 import PdfReader

        reader = PdfReader(str(file_path))
        for page_number, page in enumerate(reader.pages, start=1):
            text = page.extract_text() or ""
            normalized_text = normalize_text(text)
            if normalized_text:
                page_texts.append({"page": page_number, "text": normalized_text})
    except Exception as error:
        return empty_pdf_result(file_path, parser_status="failed", message=str(error))

    if not page_texts:
        return empty_pdf_result(
            file_path,
            parser_status="no_text_detected",
            message="PDF was read, but no extractable text was detected.",
        )

    chapters: list[dict[str, Any]] = detect_chapters(file_path.name, page_texts)
    headings: list[dict[str, Any]] = []
    paragraphs: list[dict[str, Any]] = []
    citations: list[dict[str, Any]] = []
    references: list[dict[str, Any]] = []
    objectives: list[dict[str, Any]] = []
    table_captions: list[dict[str, Any]] = []

    in_references = False
    position = 0

    for page_text in page_texts:
        page_number = int(page_text["page"])
        for line in split_pdf_lines(str(page_text["text"])):
            text = normalize_text(line)
            if not text:
                continue

            position += 1

            if is_likely_heading(text):
                headings.append(
                    {
                        "source_file": file_path.name,
                        "text": text,
                        "style": "pdf_detected_heading",
                        "page": page_number,
                        "position": position,
                    }
                )

            chapter_match = CHAPTER_PATTERN.search(text)
            if chapter_match:
                chapters.append(
                    {
                        "source_file": file_path.name,
                        "label": chapter_match.group(0),
                        "text": text,
                        "page": page_number,
                        "position": position,
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
                        "page": page_number,
                        "position": position,
                    }
                )
                continue

            if TABLE_CAPTION_PATTERN.match(text):
                table_captions.append(
                    {
                        "source_file": file_path.name,
                        "caption": text,
                        "page": page_number,
                        "position": position,
                    }
                )

            objective_match = OBJECTIVE_PATTERN.search(text)
            if objective_match:
                objectives.append(
                    {
                        "source_file": file_path.name,
                        "text": text,
                        "detected_objective": objective_match.group(1).strip(),
                        "page": page_number,
                        "position": position,
                    }
                )

            paragraphs.append(
                {
                    "source_file": file_path.name,
                    "text": text,
                    "style": "pdf_text",
                    "page": page_number,
                    "position": position,
                }
            )
            citations.extend(extract_citations(text, file_path.name, position))

    return {
        "source_file": file_path.name,
        "file_type": "pdf",
        "parser_status": "parsed",
        "message": "PDF text extracted using PyPDF2.",
        "page_count": len(page_texts),
        "chapters": deduplicate_items(chapters),
        "headings": deduplicate_items(headings),
        "paragraphs": paragraphs,
        "tables": [],
        "citations": deduplicate_items(citations),
        "references": references,
        "objectives": deduplicate_items(objectives),
        "table_captions": table_captions,
    }


def empty_pdf_result(file_path: Path, parser_status: str, message: str) -> dict[str, Any]:
    return {
        "source_file": file_path.name,
        "file_type": "pdf",
        "parser_status": parser_status,
        "message": message,
        "page_count": 0,
        "chapters": detect_chapters(file_path.name, []),
        "headings": [],
        "paragraphs": [],
        "tables": [],
        "citations": [],
        "references": [],
        "objectives": [],
        "table_captions": [],
    }


def detect_chapters(source_file: str, page_texts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    chapters: list[dict[str, Any]] = []
    filename_text = source_file.replace("_", " ").replace("-", " ")
    filename_match = CHAPTER_PATTERN.search(filename_text)
    if filename_match:
        chapters.append(
            {
                "source_file": source_file,
                "label": filename_match.group(0),
                "text": filename_text,
                "position": 0,
            }
        )

    for page_text in page_texts:
        match = CHAPTER_PATTERN.search(str(page_text.get("text", ""))[:1000])
        if match:
            chapters.append(
                {
                    "source_file": source_file,
                    "label": match.group(0),
                    "text": match.group(0),
                    "page": page_text.get("page", 0),
                    "position": 0,
                }
            )

    return deduplicate_items(chapters)


def split_pdf_lines(text: str) -> list[str]:
    rough_lines = re.split(r"(?<=[.!?])\s+(?=[A-Z0-9(])|\n+", text)
    return [line.strip() for line in rough_lines if line.strip()]


def is_likely_heading(text: str) -> bool:
    if len(text) > 140:
        return False

    if any(pattern.match(text) for pattern in HEADING_PATTERNS):
        return True

    words = text.split()
    if 2 <= len(words) <= 12 and text.isupper():
        return True

    return False


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

    for match in NARRATIVE_CITATION_PATTERN.finditer(text):
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
