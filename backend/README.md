# Thesis2Journal AI Backend

FastAPI foundation for the Thesis2Journal AI system.

## Setup

```powershell
cd C:\projects\myresearch\journal\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## PostgreSQL Setup

Create a PostgreSQL database, then copy `.env.example` to `.env` and update `DATABASE_URL`.

Example `.env`:

```env
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/thesis2journal
```

Create a local PostgreSQL database:

```powershell
createdb thesis2journal
```

If `createdb` is not in PATH, create the database using pgAdmin or psql:

```sql
CREATE DATABASE thesis2journal;
```

Check database connectivity:

```powershell
uvicorn app.main:app --reload
Invoke-WebRequest -Uri http://127.0.0.1:8000/db/health -UseBasicParsing
```

## Alembic

Create a migration after model changes:

```powershell
alembic revision --autogenerate -m "create initial tables"
```

Apply migrations:

```powershell
alembic upgrade head
```

The initial migration creates:

- `projects`
- `uploads`
- `workflow_runs`
- `generated_artifacts`
- `sections`

If `DATABASE_URL` is not configured, the app still starts and JSON-based workflows continue to work. Only `/db/health` and Alembic commands require a configured PostgreSQL connection.

## Run

```powershell
uvicorn app.main:app --reload
```

The API will run at:

- `http://127.0.0.1:8000`
- API docs: `http://127.0.0.1:8000/docs`

## Mock Endpoints

- `GET /health`
- `GET /db/health`
- `GET /projects`
- `GET /projects/{project_id}`
- `POST /upload/thesis`
- `GET /intelligence/{project_id}`
- `GET /journal/{project_id}/planner`

This foundation uses mock data only. No database or OpenAI integration is enabled yet.

## Tests

```powershell
pip install -r requirements.txt
python -m pytest
```

When `DATABASE_URL` is not configured, the live `/db/health` assertion is skipped gracefully.
