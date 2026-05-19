"""Update project persistence fields.

Revision ID: 20260520_0002
Revises: 20260520_0001
Create Date: 2026-05-20
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260520_0002"
down_revision: str | None = "20260520_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("projects", sa.Column("project_id", sa.String(length=36), nullable=True))
    op.add_column("projects", sa.Column("human_readable_code", sa.String(length=32), nullable=True))
    op.add_column("projects", sa.Column("title", sa.String(length=255), nullable=True))
    op.add_column("projects", sa.Column("thesis_title", sa.Text(), nullable=True))
    op.add_column("projects", sa.Column("research_type", sa.String(length=255), nullable=True))
    op.add_column("projects", sa.Column("target_output", sa.String(length=128), nullable=True))
    op.add_column("projects", sa.Column("primary_author", sa.String(length=255), nullable=True))
    op.add_column("projects", sa.Column("institution", sa.String(length=255), nullable=True))
    op.add_column("projects", sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.false()))

    op.execute("UPDATE projects SET project_id = id WHERE project_id IS NULL")
    op.execute("UPDATE projects SET human_readable_code = id WHERE human_readable_code IS NULL")
    op.execute("UPDATE projects SET title = name WHERE title IS NULL")
    op.execute("UPDATE projects SET research_type = thesis_type WHERE research_type IS NULL")

    op.alter_column("projects", "project_id", nullable=False)
    op.alter_column("projects", "human_readable_code", nullable=False)
    op.alter_column("projects", "title", nullable=False)
    op.alter_column("projects", "name", nullable=True)
    op.create_index("ix_projects_project_id", "projects", ["project_id"], unique=True)
    op.create_index("ix_projects_human_readable_code", "projects", ["human_readable_code"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_projects_human_readable_code", table_name="projects")
    op.drop_index("ix_projects_project_id", table_name="projects")
    op.alter_column("projects", "name", nullable=False)
    op.drop_column("projects", "is_deleted")
    op.drop_column("projects", "institution")
    op.drop_column("projects", "primary_author")
    op.drop_column("projects", "target_output")
    op.drop_column("projects", "research_type")
    op.drop_column("projects", "thesis_title")
    op.drop_column("projects", "title")
    op.drop_column("projects", "human_readable_code")
    op.drop_column("projects", "project_id")
