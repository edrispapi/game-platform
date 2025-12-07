"""Initial workshop tables

Revision ID: workshop_20250212_01
Revises:
Create Date: 2025-02-12 12:30:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "workshop_20250212_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "workshop_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("uuid", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("game_id", sa.String(length=64), nullable=True),
        sa.Column("title", sa.String(length=150), nullable=False),
        sa.Column("slug", sa.String(length=180), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("tags", sa.JSON(), nullable=True),
        sa.Column("version", sa.String(length=50), nullable=True),
        sa.Column("visibility", sa.Enum("public", "unlisted", "private", name="workshopitemvisibility"), nullable=False),
        sa.Column("status", sa.Enum("pending", "approved", "rejected", "archived", name="workshopitemstatus"), nullable=False),
        sa.Column("file_path", sa.String(length=500), nullable=True),
        sa.Column("file_url", sa.String(length=500), nullable=True),
        sa.Column("thumbnail_url", sa.String(length=500), nullable=True),
        sa.Column("content_checksum", sa.String(length=128), nullable=True),
        sa.Column("auto_flagged", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("auto_score", sa.Float(), nullable=True),
        sa.Column("auto_reasons", sa.JSON(), nullable=True),
        sa.Column("manual_reviewer_id", sa.String(length=64), nullable=True),
        sa.Column("moderation_notes", sa.Text(), nullable=True),
        sa.Column("downloads", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("votes_up", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("votes_down", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )
    op.create_index("ix_workshop_items_uuid", "workshop_items", ["uuid"], unique=True)
    op.create_index("ix_workshop_items_user_id", "workshop_items", ["user_id"])
    op.create_index("ix_workshop_items_game_id", "workshop_items", ["game_id"])
    op.create_index("ix_workshop_items_slug", "workshop_items", ["slug"], unique=True)

    op.create_table(
        "workshop_votes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("item_id", sa.Integer(), sa.ForeignKey("workshop_items.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("is_upvote", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.UniqueConstraint("item_id", "user_id", name="uq_workshop_vote_item_user"),
    )

    op.create_table(
        "workshop_moderation_log",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("item_id", sa.Integer(), sa.ForeignKey("workshop_items.id", ondelete="CASCADE"), nullable=False),
        sa.Column("moderator_id", sa.String(length=64), nullable=True),
        sa.Column("action", sa.String(length=30), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )
    op.create_index(
        "ix_workshop_moderation_log_item_id",
        "workshop_moderation_log",
        ["item_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_workshop_moderation_log_item_id", table_name="workshop_moderation_log")
    op.drop_table("workshop_moderation_log")
    op.drop_table("workshop_votes")
    op.drop_index("ix_workshop_items_slug", table_name="workshop_items")
    op.drop_index("ix_workshop_items_game_id", table_name="workshop_items")
    op.drop_index("ix_workshop_items_user_id", table_name="workshop_items")
    op.drop_index("ix_workshop_items_uuid", table_name="workshop_items")
    op.drop_table("workshop_items")
    op.execute("DROP TYPE IF EXISTS workshopitemstatus")
    op.execute("DROP TYPE IF EXISTS workshopitemvisibility")

