"""create initial tables

Revision ID: 20260520_0001
Revises:
Create Date: 2026-05-20
"""

from alembic import op
import sqlalchemy as sa

revision = "20260520_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "projects",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("thesis_type", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=64), nullable=False),
        sa.Column("target_template", sa.String(length=64), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "uploads",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("project_id", sa.String(length=64), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("file_type", sa.String(length=64), nullable=False),
        sa.Column("chapter_label", sa.String(length=128), nullable=True),
        sa.Column("storage_path", sa.Text(), nullable=False),
        sa.Column("size", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=64), nullable=False),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_uploads_project_id"), "uploads", ["project_id"])

    op.create_table(
        "workflow_runs",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("project_id", sa.String(length=64), nullable=False),
        sa.Column("paper_id", sa.String(length=64), nullable=False),
        sa.Column("pipeline_status", sa.String(length=64), nullable=False),
        sa.Column("completed_count", sa.Integer(), nullable=False),
        sa.Column("failed_step", sa.String(length=255), nullable=True),
        sa.Column("summary_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_workflow_runs_project_id"), "workflow_runs", ["project_id"])

    op.create_table(
        "generated_artifacts",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("project_id", sa.String(length=64), nullable=False),
        sa.Column("paper_id", sa.String(length=64), nullable=True),
        sa.Column("artifact_type", sa.String(length=128), nullable=False),
        sa.Column("version", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=64), nullable=False),
        sa.Column("storage_path", sa.Text(), nullable=False),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_generated_artifacts_artifact_type"), "generated_artifacts", ["artifact_type"])
    op.create_index(op.f("ix_generated_artifacts_paper_id"), "generated_artifacts", ["paper_id"])
    op.create_index(op.f("ix_generated_artifacts_project_id"), "generated_artifacts", ["project_id"])

    op.create_table(
        "sections",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("project_id", sa.String(length=64), nullable=False),
        sa.Column("paper_id", sa.String(length=64), nullable=False),
        sa.Column("section_name", sa.String(length=128), nullable=False),
        sa.Column("version", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=64), nullable=False),
        sa.Column("word_count", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("source_context_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_sections_paper_id"), "sections", ["paper_id"])
    op.create_index(op.f("ix_sections_project_id"), "sections", ["project_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_sections_project_id"), table_name="sections")
    op.drop_index(op.f("ix_sections_paper_id"), table_name="sections")
    op.drop_table("sections")
    op.drop_index(op.f("ix_generated_artifacts_project_id"), table_name="generated_artifacts")
    op.drop_index(op.f("ix_generated_artifacts_paper_id"), table_name="generated_artifacts")
    op.drop_index(op.f("ix_generated_artifacts_artifact_type"), table_name="generated_artifacts")
    op.drop_table("generated_artifacts")
    op.drop_index(op.f("ix_workflow_runs_project_id"), table_name="workflow_runs")
    op.drop_table("workflow_runs")
    op.drop_index(op.f("ix_uploads_project_id"), table_name="uploads")
    op.drop_table("uploads")
    op.drop_table("projects")
