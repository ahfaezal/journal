import json
import logging

from fastapi import FastAPI
from fastapi import HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

from app.api import artifacts, audit, citation, db, health, intelligence, journal, knowledge_graph, objective, parser, projects, reviewer, revision, table, upload, workflow
from app.core.config import settings
from app.utils.file_utils import configure_file_logging
from app.utils.response_utils import api_response, is_standard_response

app = FastAPI(title=settings.app_name, version=settings.app_version)
configure_file_logging()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def standardize_json_responses(request: Request, call_next):
    response = await call_next(request)
    content_type = response.headers.get("content-type", "")
    if "application/json" not in content_type:
        return response

    body = b""
    async for chunk in response.body_iterator:
        body += chunk

    try:
        payload = json.loads(body.decode("utf-8")) if body else None
    except json.JSONDecodeError:
        return Response(
            content=body,
            status_code=response.status_code,
            headers=dict(response.headers),
            media_type=content_type,
        )

    if is_standard_response(payload):
        wrapped = payload
    else:
        wrapped = api_response(
            data=payload,
            status="success" if response.status_code < 400 else "error",
            message="OK" if response.status_code < 400 else "Request failed",
            success=response.status_code < 400,
        )

    headers = dict(response.headers)
    headers.pop("content-length", None)
    return JSONResponse(
        content=wrapped,
        status_code=response.status_code,
        headers=headers,
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException):
    logging.warning("HTTP error %s: %s", exc.status_code, exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content=api_response(
            data={"detail": exc.detail},
            status="error",
            message=str(exc.detail),
            success=False,
        ),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(_request: Request, exc: Exception):
    logging.exception("Unhandled API error")
    return JSONResponse(
        status_code=500,
        content=api_response(
            data={"detail": str(exc)},
            status="error",
            message="Internal server error",
            success=False,
        ),
    )

app.include_router(health.router)
app.include_router(db.router)
app.include_router(artifacts.router)
app.include_router(projects.router)
app.include_router(upload.router)
app.include_router(intelligence.router)
app.include_router(journal.router)
app.include_router(parser.router)
app.include_router(citation.router)
app.include_router(objective.router)
app.include_router(table.router)
app.include_router(audit.router)
app.include_router(knowledge_graph.router)
app.include_router(reviewer.router)
app.include_router(revision.router)
app.include_router(workflow.router)
