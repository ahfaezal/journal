# Thesis2Journal AI Deployment Guide

This guide covers local development, frontend deployment, backend deployment, environment variables, health checks, and common Windows development recovery steps.

## Local Development

### Backend

```powershell
cd C:\projects\myresearch\journal\backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend local URL:

- API: `http://127.0.0.1:8000`
- Docs: `http://127.0.0.1:8000/docs`
- Health: `http://127.0.0.1:8000/health`

The app still works without PostgreSQL. If `DATABASE_URL` is not configured or the database is unavailable, JSON/local file workflows continue to run.

### Frontend

```powershell
cd C:\projects\myresearch\journal\frontend
npm install
copy .env.example .env.local
npm run dev
```

Frontend local URL:

- App: `http://127.0.0.1:3000`
- Dashboard: `http://127.0.0.1:3000/dashboard`
- Portfolio: `http://127.0.0.1:3000/portfolio`

The frontend dev script uses webpack explicitly:

```powershell
npm run dev
```

Build locally:

```powershell
npm run build
```

## Environment Variables

### Frontend

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

For production, set this to the deployed backend URL, for example:

```env
NEXT_PUBLIC_API_BASE_URL=https://your-backend.up.railway.app
```

### Backend

Create `backend/.env`:

```env
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/thesis2journal
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

For production, set `CORS_ORIGINS` to the deployed frontend origin:

```env
CORS_ORIGINS=https://your-frontend.vercel.app
```

If OpenAI is not configured, AI-assisted engines fall back to deterministic heuristic mode.

## Vercel Frontend Setup

Recommended settings:

- Root directory: `frontend`
- Install command: `npm install`
- Build command: `npm run build`
- Output: Next.js default

Set environment variable:

```env
NEXT_PUBLIC_API_BASE_URL=https://your-backend-url
```

After deploy, verify:

- `https://your-frontend.vercel.app/dashboard`
- `https://your-frontend.vercel.app/portfolio`

## Railway / Render Backend Setup

Recommended settings:

- Root directory: `backend`
- Install command: `pip install -r requirements.txt`
- Start command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Set environment variables:

```env
DATABASE_URL=postgresql+psycopg2://USER:PASSWORD@HOST:PORT/DBNAME
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
CORS_ORIGINS=https://your-frontend.vercel.app
```

Run database migration if PostgreSQL is enabled:

```bash
alembic upgrade head
```

If the platform does not provide persistent disk storage, generated outputs may be temporary. Use a persistent volume for `storage/` if generated files must survive redeploys.

## Storage and Logs

The backend writes local artifacts under:

- Uploads: `storage/uploads/{project_id}/`
- Generated JSON/Markdown: `storage/generated_outputs/{project_id}/`
- DOCX outputs: `storage/formatted_outputs/{project_id}/`
- Logs: `storage/logs/`

These folders are created automatically by the backend utilities when needed.

For production, prefer persistent storage or volume mounting for the `storage/` folder.

## Health Checks

Use these checks after starting or deploying:

### Frontend

- `GET /dashboard`
- `GET /portfolio`

### Backend

- `GET /health`
- `GET /db/health`
- `GET /portfolio/PROJECT_001`

PowerShell examples:

```powershell
Invoke-WebRequest -Uri http://127.0.0.1:8000/health -UseBasicParsing
Invoke-WebRequest -Uri http://127.0.0.1:8000/db/health -UseBasicParsing
Invoke-WebRequest -Uri http://127.0.0.1:8000/portfolio/PROJECT_001 -UseBasicParsing
```

Expected backend responses use the standard wrapper:

```json
{
  "success": true,
  "status": "success",
  "message": "OK",
  "data": {}
}
```

## Common Windows Development Issues

### Port 8000 is stuck or backend times out

Check the process:

```powershell
Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
Get-Process | Where-Object { $_.ProcessName -like '*python*' }
```

Stop stale backend processes if needed:

```powershell
Stop-Process -Id <PID> -Force
```

Restart backend:

```powershell
cd C:\projects\myresearch\journal\backend
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend shows empty data

Check:

- Backend is running at `http://127.0.0.1:8000`
- `frontend/.env.local` has `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000`
- Browser console does not show API timeout
- `GET http://127.0.0.1:8000/health` returns `200`

### PostgreSQL is unavailable

The app can still run with JSON fallback. For DB mode:

```powershell
createdb thesis2journal
cd C:\projects\myresearch\journal\backend
alembic upgrade head
```

Then check:

```powershell
Invoke-WebRequest -Uri http://127.0.0.1:8000/db/health -UseBasicParsing
```

## Clean Restart

Use this when local services feel stale:

```powershell
# Stop backend processes on port 8000
$connections = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
$connections | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object {
  Stop-Process -Id $_ -Force
}

# Start backend
cd C:\projects\myresearch\journal\backend
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

In another terminal:

```powershell
cd C:\projects\myresearch\journal\frontend
npm run dev
```

Then open:

- `http://127.0.0.1:3000/dashboard`
- `http://127.0.0.1:3000/portfolio`

## Verification Commands

Run before deployment:

```powershell
cd C:\projects\myresearch\journal\backend
.\venv\Scripts\python.exe -m compileall app
.\venv\Scripts\python.exe -m pytest -p no:cacheprovider

cd C:\projects\myresearch\journal\frontend
npm run lint
npm run build
```
