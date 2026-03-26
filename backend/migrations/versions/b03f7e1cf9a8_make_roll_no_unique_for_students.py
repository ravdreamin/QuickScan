"""Make roll_no unique for students

Revision ID: b03f7e1cf9a8
Revises: 92c3fac6449a
Create Date: 2026-03-27 10:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b03f7e1cf9a8"
down_revision: Union[str, Sequence[str], None] = "92c3fac6449a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("UPDATE users SET roll_no = UPPER(TRIM(roll_no)) WHERE roll_no IS NOT NULL")
    op.drop_index(op.f("ix_users_roll_no"), table_name="users")
    op.create_index(
        "uq_users_roll_no_non_null",
        "users",
        ["roll_no"],
        unique=True,
        postgresql_where=sa.text("roll_no IS NOT NULL"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("uq_users_roll_no_non_null", table_name="users")
    op.create_index(op.f("ix_users_roll_no"), "users", ["roll_no"], unique=False)
