"""create papers

Revision ID: 20260521_0006
Revises: 20260521_0005
Create Date: 2026-05-21
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260521_0006"
down_revision: str | None = "20260521_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "papers",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("paper_id", sa.String(length=64), nullable=False),
        sa.Column("project_id", sa.String(length=36), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("paper_type", sa.String(length=128), nullable=False),
        sa.Column("target_journal", sa.String(length=128), nullable=True),
        sa.Column("status", sa.String(length=64), nullable=False),
        sa.Column("version", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("project_id", "paper_id", name="uq_papers_project_paper"),
    )
    op.create_index(op.f("ix_papers_paper_id"), "papers", ["paper_id"], unique=False)
    op.create_index(op.f("ix_papers_project_id"), "papers", ["project_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_papers_project_id"), table_name="papers")
    op.drop_index(op.f("ix_papers_paper_id"), table_name="papers")
    op.drop_table("papers")
