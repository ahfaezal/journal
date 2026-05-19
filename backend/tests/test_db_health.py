import os

import pytest
from fastapi.testclient import TestClient

from app.main import app


def test_db_health_response_structure() -> None:
    client = TestClient(app)
    response = client.get("/db/health")
    payload = response.json()

    assert "success" in payload
    assert "status" in payload
    assert "data" in payload

    if not os.getenv("DATABASE_URL"):
        pytest.skip("DATABASE_URL is not configured; skipping live database health assertion.")

    assert response.status_code == 200
    assert payload["success"] is True
    assert payload["status"] == "success"
    assert payload["data"]["database"] == "connected"
