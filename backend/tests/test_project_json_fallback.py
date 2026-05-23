from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient

from app.api import projects
from app.main import app


def unwrap(response):
    payload = response.json()
    assert payload["success"] is True
    assert payload["status"] == "success"
    assert "data" in payload
    return payload["data"]


def test_project_json_fallback_persists_created_project(
    tmp_path: Path,
    monkeypatch,
) -> None:
    generated_root = tmp_path / "storage" / "generated_outputs"
    monkeypatch.setattr(projects, "GENERATED_OUTPUT_ROOT", generated_root)
    monkeypatch.setattr(projects, "database_enabled", lambda: False)

    client = TestClient(app)
    unique_title = f"JSON Fallback Project {uuid4()}"

    initial_list = unwrap(client.get("/projects"))["projects"]
    assert [project["project_id"] for project in initial_list] == [
        "PROJECT_001",
        "PROJECT_002",
        "PROJECT_003",
    ]

    created = unwrap(
        client.post(
            "/projects",
            json={
                "title": unique_title,
                "thesis_title": "A JSON fallback persistence study",
                "research_type": "DDR",
                "target_output": "Multiple Papers",
                "target_template": "ICC2026",
                "primary_author": "Dr. Zahirwan",
                "institution": "Universiti Islam Selangor",
            },
        )
    )["project"]

    assert created["project_id"] == "PROJECT_004"
    assert created["title"] == unique_title

    second_list = unwrap(client.get("/projects"))["projects"]
    assert any(project["project_id"] == "PROJECT_004" for project in second_list)
    assert any(project["title"] == unique_title for project in second_list)

    detail = unwrap(client.get("/projects/PROJECT_004"))["project"]
    assert detail["title"] == unique_title

    stored = projects.safe_read_json(generated_root / "projects.json")
    assert stored is not None
    assert any(project["project_id"] == "PROJECT_004" for project in stored["projects"])


def test_project_json_fallback_patch_and_delete(
    tmp_path: Path,
    monkeypatch,
) -> None:
    generated_root = tmp_path / "storage" / "generated_outputs"
    monkeypatch.setattr(projects, "GENERATED_OUTPUT_ROOT", generated_root)
    monkeypatch.setattr(projects, "database_enabled", lambda: False)

    client = TestClient(app)
    created = unwrap(client.post("/projects", json={"title": "Project To Archive"}))["project"]
    project_id = created["project_id"]

    updated = unwrap(
        client.patch(
            f"/projects/{project_id}",
            json={"title": "Updated JSON Project", "status": "Draft"},
        )
    )["project"]
    assert updated["title"] == "Updated JSON Project"
    assert updated["status"] == "Draft"

    deleted = unwrap(client.delete(f"/projects/{project_id}"))
    assert deleted["deleted"] is True

    response = client.get(f"/projects/{project_id}")
    assert response.status_code == 404
