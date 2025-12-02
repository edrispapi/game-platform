"""create user_game_interactions table

Revision ID: 20250212_01
Revises:
Create Date: 2025-02-12 12:00:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20250212_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_game_interactions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("game_id", sa.String(length=64), nullable=False),
        sa.Column("score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("interactions", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_event_type", sa.String(length=50), nullable=True),
        sa.Column("last_event_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("extra_metadata", sa.JSON(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.UniqueConstraint("user_id", "game_id", name="uq_interaction_user_game"),
    )
    op.create_index(
        "ix_user_game_interactions_user_id",
        "user_game_interactions",
        ["user_id"],
    )
    op.create_index(
        "ix_user_game_interactions_game_id",
        "user_game_interactions",
        ["game_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_user_game_interactions_game_id", table_name="user_game_interactions")
    op.drop_index("ix_user_game_interactions_user_id", table_name="user_game_interactions")
    op.drop_table("user_game_interactions")

