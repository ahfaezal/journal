import os
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.main import app

pytestmark = pytest.mark.skipif(
    not os.getenv("DATABASE_URL"),
    reason="DATABASE_URL is not configured; skipping database-backed project CRUD tests.",
)

client = TestClient(app)


def unwrap(response):
    payload = response.json()
    assert payload["success"] is True
    assert payload["status"] == "success"
    assert "data" in payload
    return payload["data"]


def test_project_crud_lifecycle():
    unique_title = f"CRUD Project {uuid4()}"
    create_response = client.post(
        "/projects",
        json={
            "title": unique_title,
            "thesis_title": "A controlled thesis-to-journal workflow study",
            "research_type": "DDR",
            "target_output": "Multiple Papers",
            "target_template": "ICC2026",
            "primary_author": "Dr. Zahirwan",
            "institution": "Universiti Islam Selangor",
        },
    )
    assert create_response.status_code == 200
    created = unwrap(create_response)["project"]
    assert created["title"] == unique_title
    assert created["project_id"]
    assert created["human_readable_code"].startswith("THESIS-")

    project_identifier = created["project_id"]

    detail_response = client.get(f"/projects/{project_identifier}")
    assert detail_response.status_code == 200
    detail = unwrap(detail_response)["project"]
    assert detail["project_id"] == project_identifier

    update_response = client.patch(
        f"/projects/{project_identifier}",
        json={"status": "Draft", "target_template": "APA 7"},
    )
    assert update_response.status_code == 200
    updated = unwrap(update_response)["project"]
    assert updated["status"] == "Draft"
    assert updated["target_template"] == "APA 7"

    delete_response = client.delete(f"/projects/{project_identifier}")
    assert delete_response.status_code == 200
    deleted = unwrap(delete_response)
    assert deleted["deleted"] is True

    missing_response = client.get(f"/projects/{project_identifier}")
    assert missing_response.status_code == 404
