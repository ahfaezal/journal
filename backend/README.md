# Thesis2Journal AI Backend

FastAPI foundation for the Thesis2Journal AI system.

## Setup

```powershell
cd C:\projects\myresearch\Thesis-to-Journal\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Run

```powershell
uvicorn app.main:app --reload
```

The API will run at:

- `http://127.0.0.1:8000`
- API docs: `http://127.0.0.1:8000/docs`

## Mock Endpoints

- `GET /health`
- `GET /projects`
- `GET /projects/{project_id}`
- `POST /upload/thesis`
- `GET /intelligence/{project_id}`
- `GET /journal/{project_id}/planner`

This foundation uses mock data only. No database or OpenAI integration is enabled yet.
