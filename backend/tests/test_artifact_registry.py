import os
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.artifact_registry_service import register_artifact

pytestmark = pytest.mark.skipif(
    not os.getenv("DATABASE_URL"),
    reason="DATABASE_URL is not configured; skipping database-backed artifact registry tests.",
)

client = TestClient(app)


def unwrap(response):
    payload = response.json()
    assert payload["success"] is True
    assert payload["status"] == "success"
    assert "data" in payload
    return payload["data"]


def test_artifact_registry_registers_and_groups_project_artifacts():
    create_response = client.post(
        "/projects",
        json={
            "title": f"Artifact Registry Project {uuid4()}",
            "research_type": "DDR",
            "target_output": "Multiple Papers",
            "target_template": "ICC2026",
        },
    )
    assert create_response.status_code == 200
    project = unwrap(create_response)["project"]
    project_id = project["project_id"]

    registered = register_artifact(
        project_id=project_id,
        artifact_type="audit",
        file_path=Path("storage/generated_outputs/test-project/thesis_audit.json"),
        status="audited",
    )
    assert registered is not None
    assert registered["artifact_type"] == "audit"
    assert registered["file_format"] == "json"

    response = client.get(f"/artifacts/{project_id}")
    assert response.status_code == 200
    artifact_summary = unwrap(response)
    assert artifact_summary["total_artifacts"] >= 1
    assert artifact_summary["counts_by_type"]["audit"] >= 1
    assert artifact_summary["latest_audit"]["artifact_type"] == "audit"

    delete_response = client.delete(f"/projects/{project_id}")
    assert delete_response.status_code == 200
