import re
from typing import Any


FINDINGS_KEYWORDS = ("findings", "dapatan", "bab 4", "chapter 4")
TABLE_NUMBER_PATTERN = re.compile(r"\b(?:Jadual|Table)\s+(\d+(?:\.\d+)*)", re.IGNORECASE)


def build_table_map(project_id: str, parsed_thesis: dict[str, Any]) -> dict[str, Any]:
    parsed_tables = parsed_thesis.get("tables", [])
    parsed_captions = parsed_thesis.get("table_captions", [])
    parsed_headings = parsed_thesis.get("headings", [])
    parsed_chapters = parsed_thesis.get("chapters", [])

    table_rows = []
    mapped_tables = 0
    findings_tables = 0

    for index, table in enumerate(parsed_tables, start=1):
        if not isinstance(table, dict):
            continue

        source_file = str(table.get("source_file", "Unknown file"))
        caption = find_caption_for_table(parsed_captions, source_file, index)
        source_section = detect_source_section(parsed_headings, source_file)
        source_chapter = detect_source_chapter(parsed_chapters, source_file)
        is_findings_table = is_findings_source(source_file, source_section, source_chapter)
        table_title = extract_table_title(caption)
        table_number = extract_table_number(caption) or f"T{index}"
        has_title = bool(table_title)
        usage_status = "mapped" if has_title else "review_required"

        if usage_status == "mapped":
            mapped_tables += 1
        if is_findings_table:
            findings_tables += 1

        table_rows.append(
            {
                "table_id": f"TABLE_{index:03d}",
                "table_number": table_number,
                "table_title": table_title or "Missing table title",
                "source_file": source_file,
                "source_section": source_section,
                "source_chapter": source_chapter,
                "detected_rows": int(table.get("row_count", 0) or 0),
                "detected_columns": int(table.get("column_count", 0) or 0),
                "suggested_paper_section": "Findings" if is_findings_table else "Review required",
                "usage_status": usage_status,
                "issue": "No issue detected" if has_title else "Missing table caption or title; review required.",
                "confidence_score": determine_confidence_score(has_title, is_findings_table),
            }
        )

    return {
        "project_id": project_id,
        "status": "mapped",
        "total_tables": len(table_rows),
        "mapped_tables": mapped_tables,
        "unmapped_tables": len(table_rows) - mapped_tables,
        "findings_tables": findings_tables,
        "tables": table_rows,
    }


def find_caption_for_table(captions: object, source_file: str, table_index: int) -> str:
    if not isinstance(captions, list):
        return ""

    same_file_captions = [
        caption
        for caption in captions
        if isinstance(caption, dict) and str(caption.get("source_file", "")) == source_file
    ]
    if table_index <= len(same_file_captions):
        return str(same_file_captions[table_index - 1].get("caption", ""))

    return ""


def detect_source_section(headings: object, source_file: str) -> str:
    if not isinstance(headings, list):
        return "Unknown section"

    same_file_headings = [
        heading
        for heading in headings
        if isinstance(heading, dict) and str(heading.get("source_file", "")) == source_file
    ]
    if not same_file_headings:
        return "Unknown section"

    findings_heading = next(
        (
            str(heading.get("text", ""))
            for heading in same_file_headings
            if any(keyword in str(heading.get("text", "")).lower() for keyword in FINDINGS_KEYWORDS)
        ),
        None,
    )
    return findings_heading or str(same_file_headings[-1].get("text", "Unknown section"))


def detect_source_chapter(chapters: object, source_file: str) -> str:
    if not isinstance(chapters, list):
        return "Unknown chapter"

    same_file_chapters = [
        chapter
        for chapter in chapters
        if isinstance(chapter, dict) and str(chapter.get("source_file", "")) == source_file
    ]
    if not same_file_chapters:
        return "Unknown chapter"

    return str(same_file_chapters[-1].get("label", same_file_chapters[-1].get("text", "Unknown chapter")))


def is_findings_source(source_file: str, source_section: str, source_chapter: str) -> bool:
    combined_text = f"{source_file} {source_section} {source_chapter}".lower()
    return any(keyword in combined_text for keyword in FINDINGS_KEYWORDS)


def extract_table_number(caption: str) -> str:
    match = TABLE_NUMBER_PATTERN.search(caption)
    return match.group(0) if match else ""


def extract_table_title(caption: str) -> str:
    if not caption:
        return ""

    return TABLE_NUMBER_PATTERN.sub("", caption, count=1).strip(" :-\t")


def determine_confidence_score(has_title: bool, is_findings_table: bool) -> int:
    score = 45
    if has_title:
        score += 30
    if is_findings_table:
        score += 20

    return min(score, 95)
