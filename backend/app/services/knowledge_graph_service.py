from typing import Any


def build_knowledge_graph(
    project_id: str,
    parsed_thesis: dict[str, Any] | None,
    citation_map: dict[str, Any] | None,
    objective_map: dict[str, Any] | None,
    table_map: dict[str, Any] | None,
    thesis_audit: dict[str, Any] | None,
) -> dict[str, Any]:
    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []

    add_node(nodes, "thesis", "Thesis", "thesis", "active", 90)
    add_node(nodes, "methodology", "Methodology", "methodology", "active", 80)
    add_node(nodes, "findings", "Findings", "findings", "active", 80)
    add_node(nodes, "discussion", "Discussion", "discussion", "active", 80)
    add_node(nodes, "references", "References", "reference", "active", reference_score(parsed_thesis))

    add_edge(edges, "thesis", "methodology", "uses", 86)
    add_edge(edges, "thesis", "findings", "produces", 86)
    add_edge(edges, "thesis", "discussion", "interprets", 82)

    objective_nodes = add_objective_nodes(nodes, edges, objective_map)
    add_citation_nodes(nodes, edges, citation_map)
    add_table_nodes(nodes, edges, table_map)
    add_reference_nodes(nodes, edges, parsed_thesis)
    add_issue_nodes(nodes, edges, thesis_audit, objective_nodes)

    strong_links = sum(1 for edge in edges if edge["strength"] >= 75)
    weak_links = sum(1 for edge in edges if edge["strength"] < 60)
    graph_health_score = calculate_graph_health_score(nodes, edges, thesis_audit)

    return {
        "project_id": project_id,
        "status": "built",
        "nodes": nodes,
        "edges": edges,
        "summary": {
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "weak_links": weak_links,
            "strong_links": strong_links,
            "graph_health_score": graph_health_score,
        },
    }


def add_objective_nodes(
    nodes: list[dict[str, Any]],
    edges: list[dict[str, Any]],
    objective_map: dict[str, Any] | None,
) -> list[str]:
    objective_node_ids = []
    objectives = objective_map.get("objectives", []) if objective_map else []
    for objective in objectives:
        if not isinstance(objective, dict):
            continue

        objective_id = str(objective.get("objective_id", f"RO{len(objective_node_ids) + 1}"))
        node_id = f"objective:{objective_id}"
        score = int(objective.get("confidence_score", 55) or 55)
        status = str(objective.get("alignment_status", "review_required"))
        add_node(
            nodes,
            node_id,
            objective_id,
            "objective",
            status,
            score,
        )
        add_edge(edges, "thesis", node_id, "has_objective", score)
        objective_node_ids.append(node_id)

        if objective.get("linked_findings"):
            add_edge(edges, node_id, "findings", "aligned_to_findings", score)
        else:
            add_edge(edges, node_id, "findings", "missing_findings_link", 35)

        if objective.get("linked_discussion"):
            add_edge(edges, node_id, "discussion", "aligned_to_discussion", score)
        else:
            add_edge(edges, node_id, "discussion", "missing_discussion_link", 35)

    return objective_node_ids


def add_citation_nodes(
    nodes: list[dict[str, Any]],
    edges: list[dict[str, Any]],
    citation_map: dict[str, Any] | None,
) -> None:
    citations = citation_map.get("citations", []) if citation_map else []
    for index, citation in enumerate(citations[:20], start=1):
        if not isinstance(citation, dict):
            continue

        citation_text = str(citation.get("citation_text", f"Citation {index}"))
        node_id = f"citation:{index}"
        matched = citation.get("mfl_status") == "matched"
        score = 85 if matched else 45
        add_node(nodes, node_id, citation_text, "citation", str(citation.get("mfl_status", "unknown")), score)
        add_edge(edges, node_id, "references", "maps_to_reference", score)
        add_edge(edges, "thesis", node_id, "uses_citation", 70 if matched else 45)


def add_table_nodes(
    nodes: list[dict[str, Any]],
    edges: list[dict[str, Any]],
    table_map: dict[str, Any] | None,
) -> None:
    tables = table_map.get("tables", []) if table_map else []
    for table in tables[:20]:
        if not isinstance(table, dict):
            continue

        table_id = str(table.get("table_id", f"TABLE_{len(nodes)}"))
        node_id = f"table:{table_id}"
        score = int(table.get("confidence_score", 55) or 55)
        status = str(table.get("usage_status", "review_required"))
        add_node(
            nodes,
            node_id,
            str(table.get("table_number", table_id)),
            "table",
            status,
            score,
        )
        target = "findings" if table.get("suggested_paper_section") == "Findings" else "thesis"
        add_edge(edges, node_id, target, "supports", score)


def add_reference_nodes(
    nodes: list[dict[str, Any]],
    edges: list[dict[str, Any]],
    parsed_thesis: dict[str, Any] | None,
) -> None:
    references = parsed_thesis.get("references", []) if parsed_thesis else []
    for index, reference in enumerate(references[:10], start=1):
        if not isinstance(reference, dict):
            continue

        node_id = f"reference:{index}"
        add_node(nodes, node_id, f"Reference {index}", "reference", "detected", 80)
        add_edge(edges, "references", node_id, "contains", 80)


def add_issue_nodes(
    nodes: list[dict[str, Any]],
    edges: list[dict[str, Any]],
    thesis_audit: dict[str, Any] | None,
    objective_node_ids: list[str],
) -> None:
    issues = thesis_audit.get("issues", []) if thesis_audit else []
    for index, issue in enumerate(issues[:20], start=1):
        if not isinstance(issue, dict):
            continue

        issue_id = str(issue.get("issue_id", f"ISSUE_{index}"))
        node_id = f"issue:{issue_id}"
        severity = str(issue.get("severity", "medium"))
        score = {"high": 35, "medium": 55, "low": 70}.get(severity, 55)
        add_node(nodes, node_id, issue_id, "issue", severity, score)
        add_edge(edges, node_id, target_for_issue(issue, objective_node_ids), "flags", score)


def target_for_issue(issue: dict[str, Any], objective_node_ids: list[str]) -> str:
    issue_type = str(issue.get("issue_type", ""))
    if "citation" in issue_type or "reference" in issue_type:
        return "references"
    if "objective" in issue_type and objective_node_ids:
        return objective_node_ids[0]
    if "table" in issue_type:
        return "findings"
    return "thesis"


def reference_score(parsed_thesis: dict[str, Any] | None) -> int:
    if not parsed_thesis:
        return 40

    citations_count = len(parsed_thesis.get("citations", []))
    references_count = len(parsed_thesis.get("references", []))
    if citations_count and not references_count:
        return 35
    if references_count:
        return 85
    return 65


def calculate_graph_health_score(
    nodes: list[dict[str, Any]],
    edges: list[dict[str, Any]],
    thesis_audit: dict[str, Any] | None,
) -> int:
    if not nodes:
        return 0

    average_node_score = round(sum(int(node.get("score", 0) or 0) for node in nodes) / len(nodes))
    average_edge_strength = round(
        sum(int(edge.get("strength", 0) or 0) for edge in edges) / len(edges)
    ) if edges else 0
    audit_score = int(thesis_audit.get("overall_audit_score", 75) or 75) if thesis_audit else 65

    return max(0, min(100, round((average_node_score + average_edge_strength + audit_score) / 3)))


def add_node(
    nodes: list[dict[str, Any]],
    node_id: str,
    label: str,
    node_type: str,
    status: str,
    score: int,
) -> None:
    if any(node["id"] == node_id for node in nodes):
        return

    nodes.append(
        {
            "id": node_id,
            "label": label,
            "type": node_type,
            "status": status,
            "score": max(0, min(100, score)),
        }
    )


def add_edge(
    edges: list[dict[str, Any]],
    source: str,
    target: str,
    relationship: str,
    strength: int,
) -> None:
    edges.append(
        {
            "source": source,
            "target": target,
            "relationship": relationship,
            "strength": max(0, min(100, strength)),
        }
    )
