"""Update upload metadata fields.

Revision ID: 20260520_0003
Revises: 20260520_0002
Create Date: 2026-05-20
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260520_0003"
down_revision: str | None = "20260520_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("uploads", sa.Column("upload_id", sa.String(length=36), nullable=True))
    op.add_column("uploads", sa.Column("original_filename", sa.String(length=255), nullable=True))
    op.add_column("uploads", sa.Column("stored_filename", sa.String(length=255), nullable=True))
    op.add_column("uploads", sa.Column("file_path", sa.Text(), nullable=True))
    op.add_column("uploads", sa.Column("mime_type", sa.String(length=255), nullable=True))
    op.add_column("uploads", sa.Column("size_bytes", sa.Integer(), nullable=False, server_default="0"))

    op.execute("UPDATE uploads SET upload_id = id WHERE upload_id IS NULL")
    op.execute("UPDATE uploads SET original_filename = filename WHERE original_filename IS NULL")
    op.execute("UPDATE uploads SET stored_filename = filename WHERE stored_filename IS NULL")
    op.execute("UPDATE uploads SET file_path = storage_path WHERE file_path IS NULL")
    op.execute("UPDATE uploads SET size_bytes = size WHERE size_bytes = 0")

    op.alter_column("uploads", "upload_id", nullable=False)
    op.alter_column("uploads", "original_filename", nullable=False)
    op.alter_column("uploads", "stored_filename", nullable=False)
    op.alter_column("uploads", "file_path", nullable=False)
    op.alter_column("uploads", "filename", nullable=True)
    op.alter_column("uploads", "storage_path", nullable=True)
    op.create_index("ix_uploads_upload_id", "uploads", ["upload_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_uploads_upload_id", table_name="uploads")
    op.alter_column("uploads", "storage_path", nullable=False)
    op.alter_column("uploads", "filename", nullable=False)
    op.drop_column("uploads", "size_bytes")
    op.drop_column("uploads", "mime_type")
    op.drop_column("uploads", "file_path")
    op.drop_column("uploads", "stored_filename")
    op.drop_column("uploads", "original_filename")
    op.drop_column("uploads", "upload_id")
