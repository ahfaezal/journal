import re
import logging
from pathlib import Path
from typing import Any

from docx import Document


logger = logging.getLogger(__name__)

CHAPTER_PATTERN = re.compile(r"\b(?:BAB|CHAPTER)\s+([1-5IVX]+)\b", re.IGNORECASE)
CITATION_PATTERN = re.compile(
    r"\(([A-Z][A-Za-zÀ-ÿ'`\-]+(?:\s+et\s+al\.)?(?:\s*&\s*[A-Z][A-Za-zÀ-ÿ'`\-]+)?),\s*(\d{4}[a-z]?)\)"
)
NARRATIVE_CITATION_PATTERN = re.compile(
    r"\b([A-Z][A-Za-zÀ-ÿ'`\-]+(?:\s+et\s+al\.)?(?:\s+and\s+[A-Z][A-Za-zÀ-ÿ'`\-]+)?)\s*\((\d{4}[a-z]?)\)"
)
BRACKET_CITATION_PATTERN = re.compile(r"\(([^()]*\b(?:19|20)\d{2}[a-z]?[^()]*)\)")
TABLE_CAPTION_PATTERN = re.compile(r"^\s*(?:Jadual|Table)\s+\d+(?:\.\d+)*\b.*", re.IGNORECASE)
OBJECTIVE_PATTERN = re.compile(
    r"\b(?:objektif|objective|research objective|RO)\s*(?:kajian|research)?\s*\d*[:.)-]?\s*(.+)",
    re.IGNORECASE,
)
OBJECTIVE_SECTION_PATTERN = re.compile(
    r"\b(?:objektif\s+kajian|objektif\s+penyelidikan|research\s+objectives?|tujuan\s+kajian|persoalan\s+kajian|the\s+objectives\s+of\s+this\s+study\s+are|kajian\s+ini\s+bertujuan\s+untuk|objektif\s+kajian\s+ini\s+adalah)\b",
    re.IGNORECASE,
)
FALSE_OBJECTIVE_PATTERN = re.compile(
    r"\b(?:learning\s+objectives?|module\s+objectives?|training\s+objectives?|assessment\s+objectives?|objektif\s+pembelajaran|objektif\s+modul|objektif\s+latihan|objektif\s+penilaian)\b",
    re.IGNORECASE,
)
ITEM_PREFIX_PATTERN = re.compile(r"^\s*(?:\d+[.)]|[ivxlcdm]+[.)]|[a-z][.)]|[-•])\s+(.+)", re.IGNORECASE)
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
        "objective_candidates": [],
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

    normalized = {key: deduplicate_items(value) for key, value in aggregate.items()}
    objectives, extraction_status = extract_research_objectives(parsed_documents, normalized["objective_candidates"])
    normalized["objectives"] = objectives

    return {
        "project_files_parsed": len(parsed_documents),
        "documents": parsed_documents,
        "objective_extraction_status": extraction_status,
        **normalized,
    }


def parse_docx(file_path: Path) -> dict[str, Any]:
    document = Document(file_path)
    headings: list[dict[str, Any]] = []
    paragraphs: list[dict[str, Any]] = []
    chapters: list[dict[str, Any]] = []
    citations: list[dict[str, Any]] = []
    references: list[dict[str, Any]] = []
    objective_candidates: list[dict[str, Any]] = []
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
            objective_candidates.append(
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
        "objectives": [],
        "objective_candidates": objective_candidates,
        "table_captions": table_captions,
    }


def parse_pdf(file_path: Path) -> dict[str, Any]:
    page_texts: list[dict[str, Any]] = []
    try:
        from PyPDF2 import PdfReader

        reader = PdfReader(str(file_path))
        for page_number, page in enumerate(reader.pages, start=1):
            text = page.extract_text() or ""
            if text.strip():
                page_texts.append({"page": page_number, "text": text})
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
    objective_candidates: list[dict[str, Any]] = []
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
                objective_candidates.append(
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
        "objectives": [],
        "objective_candidates": deduplicate_items(objective_candidates),
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
        "objective_candidates": [],
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


def extract_research_objectives(
    documents: list[dict[str, Any]],
    objective_candidates: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], str]:
    chapter_one_documents = [document for document in documents if is_chapter_one_document(document)]
    search_documents = chapter_one_documents or documents
    extracted: list[dict[str, Any]] = []

    for document in search_documents:
        source_file = str(document.get("source_file", "Unknown file"))
        paragraphs = [item for item in document.get("paragraphs", []) if isinstance(item, dict)]
        headings = [item for item in document.get("headings", []) if isinstance(item, dict)]
        objective_heading = find_objective_heading(headings, paragraphs)
        if not objective_heading:
            continue

        logger.info(
            "objective section found: source_file=%s heading=%s",
            source_file,
            objective_heading.get("text", ""),
        )
        extracted.extend(extract_objective_items_below_heading(source_file, objective_heading, paragraphs, headings))

    filtered = deduplicate_items([objective for objective in extracted if is_valid_research_objective(objective.get("objective_text", ""))])
    if filtered:
        logger.info("objective items extracted: count=%s", len(filtered[:10]))
        return assign_objective_ids(filtered[:10], extraction_status="extracted"), "extracted"

    fallback = build_fallback_objectives(search_documents, objective_candidates)
    logger.info("objective extraction fallback used: count=%s", len(fallback))
    return fallback, "fallback"


def is_chapter_one_document(document: dict[str, Any]) -> bool:
    source_file = str(document.get("source_file", "")).lower().replace("_", " ")
    if re.search(r"\b(?:bab|chapter)\s*1\b", source_file):
        return True

    chapters = document.get("chapters", [])
    if isinstance(chapters, list):
        for chapter in chapters:
            if isinstance(chapter, dict) and re.search(r"\b(?:bab|chapter)\s*1\b", str(chapter.get("label", "")).lower()):
                return True

    return False


def find_objective_heading(
    headings: list[dict[str, Any]],
    paragraphs: list[dict[str, Any]],
) -> dict[str, Any] | None:
    for heading in headings:
        text = str(heading.get("text", ""))
        if is_objective_section_text(text):
            return heading

    for paragraph in paragraphs:
        text = str(paragraph.get("text", ""))
        if is_objective_section_text(text) and len(text) <= 180:
            return paragraph

    return None


def is_objective_section_text(text: str) -> bool:
    return bool(OBJECTIVE_SECTION_PATTERN.search(text)) and not FALSE_OBJECTIVE_PATTERN.search(text)


def extract_objective_items_below_heading(
    source_file: str,
    objective_heading: dict[str, Any],
    paragraphs: list[dict[str, Any]],
    headings: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    heading_position = int(objective_heading.get("position", 0) or 0)
    next_heading_position = find_next_major_heading_position(source_file, heading_position, headings)
    source_heading = str(objective_heading.get("text", "Research Objectives"))
    items: list[dict[str, Any]] = []

    for paragraph in paragraphs:
        if str(paragraph.get("source_file", source_file)) != source_file:
            continue
        position = int(paragraph.get("position", 0) or 0)
        if position <= heading_position:
            continue
        if next_heading_position and position >= next_heading_position:
            break

        text = str(paragraph.get("text", ""))
        if not text or FALSE_OBJECTIVE_PATTERN.search(text) or looks_like_citation_fragment(text):
            continue
        if is_objective_section_text(text) and position != heading_position:
            continue

        item_text = clean_objective_item(text)
        if item_text:
            items.append(
                {
                    "objective_text": item_text,
                    "source_file": source_file,
                    "source_chapter": "Bab 1",
                    "source_heading": source_heading,
                    "position": position,
                    "confidence_score": 90 if ITEM_PREFIX_PATTERN.match(text) else 78,
                    "extraction_status": "extracted",
                }
            )

    if not items:
        inline_text = extract_inline_objective(source_heading)
        if inline_text:
            items.append(
                {
                    "objective_text": inline_text,
                    "source_file": source_file,
                    "source_chapter": "Bab 1",
                    "source_heading": source_heading,
                    "position": heading_position,
                    "confidence_score": 72,
                    "extraction_status": "extracted",
                }
            )

    return items


def find_next_major_heading_position(
    source_file: str,
    heading_position: int,
    headings: list[dict[str, Any]],
) -> int | None:
    later_headings = []
    for heading in headings:
        if str(heading.get("source_file", source_file)) != source_file:
            continue
        position = int(heading.get("position", 0) or 0)
        if position > heading_position:
            later_headings.append(position)

    return min(later_headings) if later_headings else None


def clean_objective_item(text: str) -> str:
    stripped = normalize_text(text)
    match = ITEM_PREFIX_PATTERN.match(stripped)
    if match:
        stripped = match.group(1).strip()
    stripped = re.sub(r"^(?:untuk|to)\s+", "", stripped, flags=re.IGNORECASE)
    if len(stripped) < 18 or len(stripped) > 320:
        return ""
    if not re.search(r"\b(?:mengenal pasti|menentukan|menganalisis|membangunkan|menilai|mengkaji|to identify|to determine|to analyse|to analyze|to develop|to evaluate|identify|determine|analyse|analyze|develop|evaluate)\b", stripped, re.IGNORECASE):
        return ""
    return stripped


def extract_inline_objective(text: str) -> str:
    match = re.search(r"(?:adalah|are|untuk|to)\s+(.+)$", text, re.IGNORECASE)
    if not match:
        return ""
    return clean_objective_item(match.group(1))


def looks_like_citation_fragment(text: str) -> bool:
    if len(text) < 80 and YEAR_PATTERN_COUNT(text) >= 1:
        return True
    return text.count("(") > 2 or text.count(")") > 2


def YEAR_PATTERN_COUNT(text: str) -> int:
    return len(re.findall(r"\b(?:19|20)\d{2}[a-z]?\b", text))


def is_valid_research_objective(text: str) -> bool:
    if not text or FALSE_OBJECTIVE_PATTERN.search(text) or looks_like_citation_fragment(text):
        return False
    return bool(clean_objective_item(text))


def build_fallback_objectives(
    documents: list[dict[str, Any]],
    objective_candidates: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    thesis_title = infer_thesis_title(documents)
    fallback_actions = [
        "Mengenal pasti keperluan kajian berdasarkan skop tesis",
        "Menganalisis elemen utama kajian berdasarkan dokumen tesis",
        "Membangunkan asas pemetaan objektif kepada dapatan kajian",
    ]
    if thesis_title:
        fallback_actions = [
            f"Mengenal pasti keperluan kajian berkaitan {thesis_title}",
            f"Menganalisis elemen utama kajian berkaitan {thesis_title}",
            f"Membangunkan asas pemetaan objektif bagi {thesis_title}",
        ]

    source_file = str(documents[0].get("source_file", "Unknown file")) if documents else "Unknown file"
    if objective_candidates:
        source_file = str(objective_candidates[0].get("source_file", source_file))

    return [
        {
            "objective_id": f"RO{index}",
            "objective_text": text,
            "source_file": source_file,
            "source_chapter": "Bab 1",
            "source_heading": "Fallback objective extraction",
            "confidence_score": 40,
            "extraction_status": "fallback",
        }
        for index, text in enumerate(fallback_actions, start=1)
    ]


def infer_thesis_title(documents: list[dict[str, Any]]) -> str:
    for document in documents:
        headings = document.get("headings", [])
        if isinstance(headings, list):
            for heading in headings:
                text = str(heading.get("text", "") if isinstance(heading, dict) else "")
                if 20 <= len(text) <= 180 and not CHAPTER_PATTERN.search(text):
                    return text
        paragraphs = document.get("paragraphs", [])
        if isinstance(paragraphs, list):
            for paragraph in paragraphs[:5]:
                text = str(paragraph.get("text", "") if isinstance(paragraph, dict) else "")
                if 20 <= len(text) <= 180 and not CHAPTER_PATTERN.search(text):
                    return text
    return ""


def assign_objective_ids(objectives: list[dict[str, Any]], extraction_status: str) -> list[dict[str, Any]]:
    assigned = []
    for index, objective in enumerate(objectives, start=1):
        assigned.append(
            {
                "objective_id": f"RO{index}",
                "objective_text": str(objective.get("objective_text", "")),
                "source_file": str(objective.get("source_file", "Unknown file")),
                "source_chapter": str(objective.get("source_chapter", "Bab 1")),
                "source_heading": str(objective.get("source_heading", "Research Objectives")),
                "confidence_score": int(objective.get("confidence_score", 80) or 80),
                "extraction_status": extraction_status,
            }
        )
    return assigned


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
    captured = set()
    for match in CITATION_PATTERN.finditer(text):
        citation = match.group(0)
        captured.add(citation)
        citations.append(build_citation_row(source_file, citation, match.group(1), match.group(2), position))

    for bracket_match in BRACKET_CITATION_PATTERN.finditer(text):
        bracket_text = bracket_match.group(0)
        if bracket_text in captured:
            continue
        inner_text = bracket_match.group(1)
        for part in inner_text.split(";"):
            parsed = parse_bracket_citation_part(part)
            if parsed:
                author, year = parsed
                citation = f"({part.strip()})"
                captured.add(citation)
                citations.append(build_citation_row(source_file, citation, author, year, position))

    for match in NARRATIVE_CITATION_PATTERN.finditer(text):
        citation = match.group(0)
        if citation not in captured:
            citations.append(build_citation_row(source_file, citation, match.group(1), match.group(2), position))

    return citations


def parse_bracket_citation_part(text: str) -> tuple[str, str] | None:
    match = re.search(r"\b((?:19|20)\d{2}[a-z]?)\b", text)
    if not match:
        return None
    author = text[: match.start()].strip(" ,")
    if not author:
        return None
    return author, match.group(1)


def build_citation_row(
    source_file: str,
    citation: str,
    author: str,
    year: str,
    position: int,
) -> dict[str, Any]:
    return {
        "source_file": source_file,
        "citation": citation,
        "author": author,
        "year": year,
        "position": position,
    }


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
