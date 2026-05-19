from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import audit, citation, health, intelligence, journal, knowledge_graph, objective, parser, projects, table, upload, workflow
from app.core.config import settings

app = FastAPI(title=settings.app_name, version=settings.app_version)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
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
app.include_router(workflow.router)
