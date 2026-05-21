import pytest

from app.core.config import settings


@pytest.fixture(autouse=True)
def disable_openai_for_tests(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(settings, "openai_api_key", "")
