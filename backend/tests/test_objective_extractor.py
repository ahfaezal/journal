from app.services.parser_service import extract_research_objectives_result


def build_document(lines: list[str], source_file: str = "Bab 1.pdf") -> dict:
    paragraphs = [
        {
            "source_file": source_file,
            "text": text,
            "position": index,
            "page": 1,
        }
        for index, text in enumerate(lines, start=1)
    ]
    headings = [
        {
            "source_file": source_file,
            "text": text,
            "position": index,
            "page": 1,
        }
        for index, text in enumerate(lines, start=1)
        if text in {
            "Objektif Kajian",
            "Research Objectives",
            "Objectives of the Study",
            "Objektif Umum dan Objektif Khusus",
            "Persoalan Kajian",
            "Research Questions",
        }
    ]
    return {
        "source_file": source_file,
        "paragraphs": paragraphs,
        "headings": headings,
        "chapters": [{"label": "BAB 1"}],
    }


def test_malay_ddr_specific_phase_objectives() -> None:
    result = extract_research_objectives_result(
        [
            build_document(
                [
                    "Objektif Umum dan Objektif Khusus",
                    "Objektif Umum",
                    "Membangunkan modul dakwah pensyarah IPT secara menyeluruh berdasarkan keperluan kajian.",
                    "Objektif Khusus",
                    "Fasa 1: Mengenal pasti keperluan pembangunan modul dakwah pensyarah IPT.",
                    "Fasa 2: Membangunkan modul dakwah pensyarah IPT berdasarkan dapatan kajian.",
                    "Fasa 3: Menilai kesesuaian modul dakwah pensyarah IPT melalui pengesahan pakar.",
                    "Persoalan Kajian",
                ]
            )
        ],
        [],
    )

    assert result["objective_extraction_status"] == "extracted"
    assert len(result["objectives"]) == 3
    assert result["general_objective"]["objective_text"].startswith("Membangunkan modul")
    assert result["objective_extraction_metadata"]["extraction_strategy"] == "phase_objectives"
    assert result["objectives"][0]["confidence_score"] == 90


def test_english_roman_objectives() -> None:
    result = extract_research_objectives_result(
        [
            build_document(
                [
                    "Research Objectives",
                    "i. To identify the factors influencing doctoral writing productivity among postgraduate students.",
                    "ii. To examine the relationship between supervision support and thesis completion progress.",
                    "iii. To evaluate the predictive contribution of research self-efficacy to publication readiness.",
                    "Research Questions",
                ],
                source_file="Chapter 1.pdf",
            )
        ],
        [],
    )

    assert len(result["objectives"]) == 3
    assert result["objective_extraction_metadata"]["numbering_style_detected"] == "numbered"
    assert result["objectives"][0]["confidence_score"] == 95


def test_numbered_and_bullet_formats() -> None:
    numbered = extract_research_objectives_result(
        [
            build_document(
                [
                    "Objectives of the Study",
                    "1. To determine the level of digital readiness among university lecturers.",
                    "2. To compare digital readiness across academic disciplines and teaching experience.",
                    "3. To validate a digital readiness framework for higher education practice.",
                ],
                source_file="Chapter 1.pdf",
            )
        ],
        [],
    )
    bullet = extract_research_objectives_result(
        [
            build_document(
                    [
                        "Objektif Kajian",
                        "- Mengenal pasti tahap kesediaan digital dalam kalangan pensyarah universiti.",
                        "- Menganalisis perbezaan kesediaan digital berdasarkan bidang akademik dan pengalaman pengajaran.",
                        "- Mengesahkan kerangka kesediaan digital melalui semakan pakar dalam konteks pendidikan tinggi.",
                    ]
                )
            ],
        [],
    )

    assert len(numbered["objectives"]) == 3
    assert numbered["objectives"][0]["confidence_score"] == 95
    assert len(bullet["objectives"]) == 3
    assert bullet["objectives"][0]["confidence_score"] == 80


def test_false_positive_learning_and_module_objectives_are_rejected() -> None:
    result = extract_research_objectives_result(
        [
            build_document(
                [
                    "Research Objectives",
                    "Learning objectives describe how students should complete the weekly lesson.",
                    "Module objectives are listed for each instructional unit.",
                    "1. To identify the research design features required for doctoral thesis conversion.",
                    "Research Questions",
                ],
                source_file="Chapter 1.pdf",
            )
        ],
        [
            {"source_file": "Chapter 2.pdf", "text": "learning objectives", "position": 12},
        ],
    )

    assert len(result["objectives"]) == 1
    assert "learning" not in result["objectives"][0]["objective_text"].lower()


def test_objective_heading_ranking_prefers_bab_1_and_rejects_discussion_heading() -> None:
    result = extract_research_objectives_result(
        [
            build_document(
                [
                    "Keselarasan antara dapatan, objektif kajian dan teori sokongan yang digunakan",
                    "Perbincangan ini menghuraikan hubungan objektif kajian dengan dapatan.",
                ],
                source_file="Bab 5.pdf",
            ),
            build_document(
                [
                    "Objektif Kajian",
                    "1. Mengenal pasti keperluan pembangunan modul dakwah pensyarah IPT.",
                    "2. Membangunkan kerangka modul dakwah pensyarah IPT berdasarkan dapatan kajian.",
                    "3. Mengesahkan kerangka modul dakwah pensyarah IPT melalui semakan pakar akademik.",
                    "Persoalan Kajian",
                ],
                source_file="Bab 1.pdf",
            ),
        ],
        [],
    )

    metadata = result["objective_extraction_metadata"]
    candidates = metadata["candidate_headings_found"]

    assert result["objective_extraction_status"] == "extracted"
    assert metadata["selected_heading"] == "Objektif Kajian"
    assert len(result["objectives"]) == 3
    assert any(
        item["heading"].startswith("Keselarasan antara dapatan")
        and item["chapter"] == "Bab 5"
        and item["score"] == 10
        and item["rejected"] is True
        for item in candidates
    )
    assert candidates[0]["heading"] == "Objektif Kajian"
    assert candidates[0]["chapter"] == "Bab 1"
