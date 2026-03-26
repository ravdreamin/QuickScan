import re

from fastapi import HTTPException, status


ROLL_NO_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9/\-]{0,49}$")


def normalize_roll_no(value: str | None, *, required: bool = False) -> str | None:
    """
    Normalize and validate roll numbers.
    Allows formats like: 4036/23, 21CS-01, 22IT001.
    """
    if value is None:
        if required:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Roll number is required for student accounts.",
            )
        return None

    cleaned = value.strip().upper()
    if not cleaned:
        if required:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Roll number is required for student accounts.",
            )
        return None

    if not ROLL_NO_PATTERN.fullmatch(cleaned):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid roll number format. Use letters, numbers, '/' or '-'.",
        )

    return cleaned
