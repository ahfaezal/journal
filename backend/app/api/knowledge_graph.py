import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter

from app.api.audit import read_thesis_audit
from app.api.citation import read_citation_map
from app.api.objective import read_objective_map
from app.api.parser import read_parsed_thesis
from app.api.table import read_table_map
from app.services.knowledge_graph_service import build_knowledge_graph

router = APIRouter(prefix="/knowledge-graph", tags=["knowledge-graph"])

PROJECT_ROOT = Path(__file__).resolve().parents[3]
GENERATED_OUTPUT_ROOT = PROJECT_ROOT / "storage" / "generated_outputs"
KNOWLEDGE_GRAPH_FILENAME = "knowledge_graph.json"


def get_knowledge_graph_output_path(project_id: str) -> Path:
    output_dir = GENERATED_OUTPUT_ROOT / project_id
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir / KNOWLEDGE_GRAPH_FILENAME


def read_knowledge_graph(project_id: str) -> dict[str, Any] | None:
    output_path = get_knowledge_graph_output_path(project_id)
    if not output_path.exists():
        return None

    with output_path.open("r", encoding="utf-8") as output_file:
        return json.load(output_file)


@router.post("/{project_id}/build")
def build_project_knowledge_graph(project_id: str) -> dict[str, Any]:
    knowledge_graph = build_knowledge_graph(
        project_id=project_id,
        parsed_thesis=read_parsed_thesis(project_id),
        citation_map=read_citation_map(project_id),
        objective_map=read_objective_map(project_id),
        table_map=read_table_map(project_id),
        thesis_audit=read_thesis_audit(project_id),
    )

    output_path = get_knowledge_graph_output_path(project_id)
    with output_path.open("w", encoding="utf-8") as output_file:
        json.dump(knowledge_graph, output_file, indent=2, ensure_ascii=False)

    return knowledge_graph


@router.get("/{project_id}")
def get_project_knowledge_graph(project_id: str) -> dict[str, Any]:
    knowledge_graph = read_knowledge_graph(project_id)
    if knowledge_graph:
        return knowledge_graph

    return build_knowledge_graph(
        project_id=project_id,
        parsed_thesis=read_parsed_thesis(project_id),
        citation_map=read_citation_map(project_id),
        objective_map=read_objective_map(project_id),
        table_map=read_table_map(project_id),
        thesis_audit=read_thesis_audit(project_id),
    )
