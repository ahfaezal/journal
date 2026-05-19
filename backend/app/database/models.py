from datetime import datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


def new_uuid() -> str:
    return str(uuid4())


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


class Project(Base, TimestampMixin):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    thesis_type: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(64), default="active", nullable=False)
    target_template: Mapped[str | None] = mapped_column(String(64))
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    uploads: Mapped[list["Upload"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    workflow_runs: Mapped[list["WorkflowRun"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    artifacts: Mapped[list["GeneratedArtifact"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    sections: Mapped[list["Section"]] = relationship(back_populates="project", cascade="all, delete-orphan")


class Upload(Base, TimestampMixin):
    __tablename__ = "uploads"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), nullable=False, index=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(64), nullable=False)
    chapter_label: Mapped[str | None] = mapped_column(String(128))
    storage_path: Mapped[str] = mapped_column(Text, nullable=False)
    size: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(64), default="uploaded", nullable=False)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    project: Mapped["Project"] = relationship(back_populates="uploads")


class WorkflowRun(Base, TimestampMixin):
    __tablename__ = "workflow_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), nullable=False, index=True)
    paper_id: Mapped[str] = mapped_column(String(64), nullable=False)
    pipeline_status: Mapped[str] = mapped_column(String(64), nullable=False)
    completed_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failed_step: Mapped[str | None] = mapped_column(String(255))
    summary_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    project: Mapped["Project"] = relationship(back_populates="workflow_runs")


class GeneratedArtifact(Base, TimestampMixin):
    __tablename__ = "generated_artifacts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), nullable=False, index=True)
    paper_id: Mapped[str | None] = mapped_column(String(64), index=True)
    artifact_type: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    version: Mapped[str] = mapped_column(String(32), default="v1", nullable=False)
    status: Mapped[str] = mapped_column(String(64), default="generated", nullable=False)
    storage_path: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    project: Mapped["Project"] = relationship(back_populates="artifacts")


class Section(Base, TimestampMixin):
    __tablename__ = "sections"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), nullable=False, index=True)
    paper_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    section_name: Mapped[str] = mapped_column(String(128), nullable=False)
    version: Mapped[str] = mapped_column(String(32), default="v1", nullable=False)
    status: Mapped[str] = mapped_column(String(64), default="drafted", nullable=False)
    word_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    content: Mapped[str] = mapped_column(Text, default="", nullable=False)
    source_context_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    project: Mapped["Project"] = relationship(back_populates="sections")
