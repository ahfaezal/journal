"""Update generated artifact registry fields.

Revision ID: 20260520_0004
Revises: 20260520_0003
Create Date: 2026-05-20
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260520_0004"
down_revision: str | None = "20260520_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("generated_artifacts", sa.Column("artifact_id", sa.String(length=36), nullable=True))
    op.add_column("generated_artifacts", sa.Column("section_name", sa.String(length=128), nullable=True))
    op.add_column("generated_artifacts", sa.Column("file_path", sa.Text(), nullable=True))
    op.add_column("generated_artifacts", sa.Column("file_format", sa.String(length=32), nullable=True))

    op.execute("UPDATE generated_artifacts SET artifact_id = id WHERE artifact_id IS NULL")
    op.execute("UPDATE generated_artifacts SET file_path = storage_path WHERE file_path IS NULL")
    op.execute(
        "UPDATE generated_artifacts SET file_format = "
        "CASE "
        "WHEN lower(file_path) LIKE '%.docx' THEN 'docx' "
        "WHEN lower(file_path) LIKE '%.md' THEN 'md' "
        "ELSE 'json' "
        "END "
        "WHERE file_format IS NULL"
    )

    op.alter_column("generated_artifacts", "artifact_id", nullable=False)
    op.alter_column("generated_artifacts", "file_path", nullable=False)
    op.alter_column("generated_artifacts", "file_format", nullable=False)
    op.alter_column("generated_artifacts", "storage_path", nullable=True)
    op.create_index("ix_generated_artifacts_artifact_id", "generated_artifacts", ["artifact_id"], unique=True)
    op.create_index("ix_generated_artifacts_section_name", "generated_artifacts", ["section_name"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_generated_artifacts_section_name", table_name="generated_artifacts")
    op.drop_index("ix_generated_artifacts_artifact_id", table_name="generated_artifacts")
    op.alter_column("generated_artifacts", "storage_path", nullable=False)
    op.drop_column("generated_artifacts", "file_format")
    op.drop_column("generated_artifacts", "file_path")
    op.drop_column("generated_artifacts", "section_name")
    op.drop_column("generated_artifacts", "artifact_id")
