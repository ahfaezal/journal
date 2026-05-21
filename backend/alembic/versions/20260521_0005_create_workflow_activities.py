"""create workflow activities

Revision ID: 20260521_0005
Revises: 20260520_0004
Create Date: 2026-05-21
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260521_0005"
down_revision: str | None = "20260520_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "workflow_activities",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("activity_id", sa.String(length=36), nullable=False),
        sa.Column("project_id", sa.String(length=36), nullable=False),
        sa.Column("paper_id", sa.String(length=64), nullable=True),
        sa.Column("activity_type", sa.String(length=128), nullable=False),
        sa.Column("activity_title", sa.String(length=255), nullable=False),
        sa.Column("activity_description", sa.Text(), nullable=True),
        sa.Column("source_module", sa.String(length=128), nullable=False),
        sa.Column("status", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_workflow_activities_activity_id"), "workflow_activities", ["activity_id"], unique=True)
    op.create_index(op.f("ix_workflow_activities_activity_type"), "workflow_activities", ["activity_type"], unique=False)
    op.create_index(op.f("ix_workflow_activities_created_at"), "workflow_activities", ["created_at"], unique=False)
    op.create_index(op.f("ix_workflow_activities_paper_id"), "workflow_activities", ["paper_id"], unique=False)
    op.create_index(op.f("ix_workflow_activities_project_id"), "workflow_activities", ["project_id"], unique=False)
    op.create_index(op.f("ix_workflow_activities_source_module"), "workflow_activities", ["source_module"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_workflow_activities_source_module"), table_name="workflow_activities")
    op.drop_index(op.f("ix_workflow_activities_project_id"), table_name="workflow_activities")
    op.drop_index(op.f("ix_workflow_activities_paper_id"), table_name="workflow_activities")
    op.drop_index(op.f("ix_workflow_activities_created_at"), table_name="workflow_activities")
    op.drop_index(op.f("ix_workflow_activities_activity_type"), table_name="workflow_activities")
    op.drop_index(op.f("ix_workflow_activities_activity_id"), table_name="workflow_activities")
    op.drop_table("workflow_activities")
