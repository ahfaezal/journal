import os
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database.database import is_database_available

pytestmark = pytest.mark.skipif(
    not os.getenv("DATABASE_URL") or not is_database_available(),
    reason="DATABASE_URL is not configured or database is unavailable; skipping database-backed upload metadata tests.",
)

client = TestClient(app)


def unwrap(response):
    payload = response.json()
    assert payload["success"] is True
    assert payload["status"] == "success"
    assert "data" in payload
    return payload["data"]


def test_upload_metadata_is_saved_and_listed_from_database():
    create_response = client.post(
        "/projects",
        json={
            "title": f"Upload Metadata Project {uuid4()}",
            "research_type": "DDR",
            "target_output": "Multiple Papers",
            "target_template": "ICC2026",
        },
    )
    assert create_response.status_code == 200
    project = unwrap(create_response)["project"]
    project_id = project["project_id"]

    upload_response = client.post(
        f"/upload/thesis/{project_id}",
        data={"file_type": "thesis_chapter", "chapter_label": "Bab 1"},
        files={
            "file": (
                "bab-1-test.docx",
                b"mock docx bytes for upload metadata test",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
    )
    assert upload_response.status_code == 200
    uploaded = unwrap(upload_response)
    assert uploaded["project_id"] == project_id
    assert uploaded["filename"] == "bab-1-test.docx"
    assert uploaded["file_type"] == "thesis_chapter"
    assert uploaded["chapter_label"] == "Bab 1"
    assert uploaded["size"] > 0

    files_response = client.get(f"/upload/thesis/{project_id}/files")
    assert files_response.status_code == 200
    listed = unwrap(files_response)
    files = listed["files"]
    assert any(item["filename"] == "bab-1-test.docx" for item in files)

    delete_response = client.delete(f"/projects/{project_id}")
    assert delete_response.status_code == 200
